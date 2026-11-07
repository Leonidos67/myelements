import { commentCooldown } from './commentTiming.js';

// Cooldown and assignment change together in one MongoDB document update.
const recentCount = { $add: [1, { $size: { $filter: { input: '$claims', as: 'claim', cond: { $gt: ['$$claim.issuedAt', { $subtract: ['$$NOW', 600000] }] } } } }] };
const cooldownSeconds = { $cond: [
  { $and: [{ $gt: [{ $size: '$claims' }, 0] }, { $lte: [{ $arrayElemAt: ['$claims.issuedAt', -1] }, { $subtract: ['$$NOW', 1200000] }] }] },
  commentCooldown.idle,
  { $switch: { branches: [{ case: { $gte: [recentCount, 4] }, then: commentCooldown.peak }, { case: { $gte: [recentCount, 2] }, then: commentCooldown.busy }], default: commentCooldown.normal } },
] };
export async function claimComment(Model, id, visitor, session = null) {
  const page = await Model.findOneAndUpdate(
    { _id: id, 'remaining.0': { $exists: true }, 'claims.visitor': { $ne: visitor }, $expr: { $lte: [{ $ifNull: ['$nextAvailableAt', new Date(0)] }, '$$NOW'] } },
    [{ $set: {
      nextAvailableAt: { $add: ['$$NOW', { $multiply: [cooldownSeconds, 1000] }] },
      claims: { $concatArrays: ['$claims', [{ visitor: { $literal: visitor }, comment: { $arrayElemAt: ['$remaining', 0] }, issuedAt: '$$NOW' }]] },
      remaining: { $slice: ['$remaining', 1, { $size: '$remaining' }] },
    } }], { new: true, session },
  ).lean();
  const current = page || await Model.findById(id).session(session).lean();
  if (!current) return { status: 404, error: 'Страница не найдена' };
  const claim = current.claims.find(c => c.visitor === visitor);
  if (claim?.revertedAt) return { status: 410, error: 'Выдача этого комментария отменена' };
  if (claim) return { status: 200, comment: claim.comment, remaining: current.remaining.length };
  if (!current.remaining.length) return { status: 410, error: 'Все комментарии уже выданы' };
  return { status: 429, error: 'До следующей выдачи нужно немного подождать', retryAt: current.nextAvailableAt, serverTime: new Date() };
}
