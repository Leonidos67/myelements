import Account from '../models/Account.js';
import Video from '../models/Video.js';
import StatProject from '../models/StatProject.js';
import { publicationCalendarDate } from './statProjectData.js';

function videoHandle(link) {
  try {
    const url = new URL(link);
    if (url.hostname !== 'tiktok.com' && !url.hostname.endsWith('.tiktok.com')) return '';
    return url.pathname.match(/^\/@[\w.]+(?=\/|$)/)?.[0].slice(1) || '';
  } catch { return ''; }
}

function publicationTime(item) {
  const label = typeof item.published === 'string' ? item.published : '';
  const day = publicationCalendarDate(label);
  if (!day) return +item.createdAt || 0;
  const time = label.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/)?.[0] || '00:00';
  return Date.parse(day + 'T' + time.padStart(5, '0') + ':00+03:00');
}

function publicationKey(link) {
  try {
    const url = new URL(link);
    const tiktokId = videoHandle(link) && url.pathname.match(/\/video\/(\d+)/)?.[1];
    return tiktokId ? 'tiktok:' + tiktokId : url.origin + url.pathname.replace(/\/$/, '');
  } catch { return link; }
}

export async function getOtherPublications(videoId) {
  const video = await Video.findById(videoId).select('account url').lean();
  if (!video) return { accountName: '', handle: '', items: [] };

  const [account, candidates] = await Promise.all([
    Account.findById(video.account).select('name').lean(),
    Video.aggregate([
      { $match: { account: video.account, _id: { $ne: video._id } } },
      { $lookup: {
        from: StatProject.collection.name, localField: '_id', foreignField: 'video', as: 'project',
        pipeline: [
          { $match: { 'config.video.cover': { $type: 'string', $ne: '' } } },
          { $project: { published: '$config.video.published' } },
        ],
      } },
      { $unwind: '$project' },
      { $project: { title: 1, url: 1, createdAt: 1, published: '$project.published', projectId: '$project._id' } },
    ]),
  ]);
  candidates.sort((a, b) => publicationTime(b) - publicationTime(a) || +b.createdAt - +a.createdAt);
  const seen = new Set([publicationKey(video.url)]);
  const latest = [];
  for (const candidate of candidates) {
    const key = publicationKey(candidate.url);
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(candidate);
    if (latest.length === 3) break;
  }
  const covers = await StatProject.find({ _id: { $in: latest.map(item => item.projectId) } }).select('config.video.cover').lean();
  const coverById = new Map(covers.map(item => [String(item._id), item.config.video.cover]));
  const items = latest.flatMap(item => {
    const cover = coverById.get(String(item.projectId));
    return cover ? [{ id: String(item._id), title: item.title || 'Публикация', cover }] : [];
  });
  return { accountName: account?.name || '', handle: videoHandle(video.url), items };
}
