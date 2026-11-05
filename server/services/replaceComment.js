import { randomInt } from 'node:crypto';

// Match the pending variant itself, so a simultaneous public claim wins safely.
export async function replaceComment(Model, id, target, comments) {
  const shuffled = [...comments];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const hasCandidate = { $gt: [{ $size: '$_replacementCandidates' }, 0] };
  const page = await Model.findOneAndUpdate({
    _id: id, remaining: { $elemMatch: { text: target.text, tags: target.tags } },
  }, [
    { $set: { _replacementCandidates: { $filter: {
      input: { $literal: shuffled }, as: 'candidate',
      cond: { $not: [{ $in: ['$$candidate', { $concatArrays: [
        '$remaining', { $map: { input: '$claims', as: 'claim', in: '$$claim.comment' } }, { $ifNull: ['$discarded', []] },
      ] }] }] },
    } } } },
    { $set: {
      discarded: { $cond: [hasCandidate, { $concatArrays: [{ $ifNull: ['$discarded', []] }, { $literal: [target] }] }, { $ifNull: ['$discarded', []] }] },
      remaining: { $map: { input: '$remaining', as: 'comment', in: { $cond: [
        { $and: [hasCandidate, { $eq: ['$$comment', { $literal: target }] }] },
        { $arrayElemAt: ['$_replacementCandidates', 0] }, '$$comment',
      ] } } },
    } },
    { $unset: '_replacementCandidates' },
  ], { new: true }).lean();
  if (!page) return { status: 409, error: 'Этот комментарий уже получили или заменили. Обновите список.' };
  if (page.remaining.some(c => c.text === target.text && JSON.stringify(c.tags) === JSON.stringify(target.tags))) {
    return { status: 409, error: 'Свободных вариантов для замены больше нет' };
  }
  return { status: 200 };
}
