import CommentPage from '../models/CommentPage.js';
import Video from '../models/Video.js';
import { claimComment } from './claimComment.js';

export async function getCommentFlow(id, session = null) {
  const selected = await CommentPage.findById(id).session(session).lean();
  if (!selected) return [];
  const root = selected.parentId
    ? await CommentPage.findById(selected.parentId).session(session).lean()
    : selected;
  if (!root) return [];
  const branches = await CommentPage.find({ parentId: root._id }).sort({ _id: 1 }).session(session).lean();
  return [root, ...branches];
}

export async function getFlowTargets(pages) {
  const videos = await Video.find({ _id: { $in: pages.map(page => page.video) } }).select('url title').lean();
  const byId = new Map(videos.map(video => [String(video._id), video]));
  return pages.map(page => {
    const video = byId.get(String(page.video));
    return { pageId: page._id, title: video?.title || page.videoTitle, videoUrl: video?.url || '' };
  });
}

class ClaimRejected extends Error {
  constructor(result) {
    super(result.error);
    this.result = result;
  }
}

export async function claimCommentFlow(id, visitor) {
  let result;
  try {
    await CommentPage.db.transaction(async session => {
      const pages = await getCommentFlow(id, session);
      if (!pages.length) throw new ClaimRejected({ status: 404, error: 'Страница не найдена' });
      const previous = pages.map(page => page.claims.find(claim => claim.visitor === visitor));
      const activePages = pages.filter((_, index) => previous[index] && !previous[index].revertedAt);
      const activeComments = previous.filter(claim => claim && !claim.revertedAt).map(claim => claim.comment);
      const existingResult = activeComments.length ? {
        status: 200, comment: activeComments[0], comments: activeComments, pages: activePages, partial: true,
        remaining: Math.min(...pages.map(page => page.remaining.length)),
      } : null;
      if (previous.some(claim => claim?.revertedAt)) {
        if (!existingResult) throw new ClaimRejected({ status: 410, error: 'Выдача этого комментария отменена' });
        result = existingResult;
        return;
      }
      const claims = [];
      for (const page of pages) {
        const claim = await claimComment(CommentPage, page._id, visitor, session);
        if (claim.status !== 200) throw new ClaimRejected(existingResult || claim);
        claims.push(claim);
      }
      result = {
        status: 200,
        comment: claims[0].comment,
        remaining: Math.min(...claims.map(claim => claim.remaining)),
        comments: claims.map(claim => claim.comment),
        pages,
      };
    });
  } catch (error) {
    if (!(error instanceof ClaimRejected)) throw error;
    if (error.result.status !== 200) return error.result;
    result = error.result;
  }
  const { pages, comments, partial, ...body } = result;
  if (pages.length === 1 && !partial) return body;
  const targets = await getFlowTargets(pages);
  return { ...body, items: targets.map((target, index) => ({ ...target, comment: comments[index] })) };
}

export async function deleteVideoCommentPages(video, session) {
  const pages = await CommentPage.find({ video }).select('parentId').session(session).lean();
  const ids = pages.map(page => page._id);
  const roots = pages.filter(page => !page.parentId).map(page => page._id);
  const parents = [...new Set(pages.map(page => page.parentId).filter(Boolean))];
  if (parents.length) {
    await CommentPage.updateMany({ _id: { $in: parents } }, { $inc: { flowRevision: 1 } }, { session });
    await CommentPage.updateMany({ _id: { $in: parents }, branchId: { $in: ids } }, { $unset: { branchId: 1 } }, { session });
  }
  if (roots.length) {
    await CommentPage.updateMany({ parentId: { $in: roots }, linkedExisting: true }, {
      $unset: { parentId: 1, linkedExisting: 1 }, $inc: { flowRevision: 1 },
    }, { session });
  }
  return CommentPage.deleteMany({ $or: [
    { _id: { $in: ids } },
    { parentId: { $in: roots }, linkedExisting: { $ne: true } },
  ] }, { session });
}
