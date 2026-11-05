// One document update removes a comment and records its recipient atomically.
// The visitor condition also makes concurrent/retried requests idempotent.
export async function claimComment(Model, id, visitor) {
  const page = await Model.findOneAndUpdate(
    { _id: id, 'remaining.0': { $exists: true }, 'claims.visitor': { $ne: visitor } },
    [{ $set: {
      claims: { $concatArrays: ['$claims', [{ visitor: { $literal: visitor }, comment: { $arrayElemAt: ['$remaining', 0] }, issuedAt: '$$NOW' }]] },
      remaining: { $slice: ['$remaining', 1, { $size: '$remaining' }] },
    } }],
    { new: true },
  ).lean();
  const current = page || await Model.findById(id).lean();
  if (!current) return { status: 404, error: 'Страница не найдена' };
  const claim = current.claims.find(c => c.visitor === visitor);
  if (!claim) return { status: 410, error: 'Все комментарии уже выданы' };
  return { status: 200, comment: claim.comment, remaining: current.remaining.length };
}
