import express from 'express';
import mongoose from 'mongoose';
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import auth from '../middleware/auth.js';
import Video from '../models/Video.js';
import CommentPage from '../models/CommentPage.js';
import { claimComment } from '../services/claimComment.js';
import { replaceComment } from '../services/replaceComment.js';
const themes = JSON.parse(readFileSync(new URL('../data/comment-themes.json', import.meta.url), 'utf8'));
const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.get('/themes', auth, (req, res) => res.json(themes.map(({ comments, ...t }) => ({ ...t, available: comments.length }))));
router.get('/summary', auth, wrap(async (req, res) => {
  res.json(await CommentPage.aggregate([
    { $group: { _id: '$video', total: { $sum: '$total' }, issued: { $sum: { $size: '$claims' } }, pages: { $sum: 1 } } },
  ]));
}));
router.get('/', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.query.video)) return res.status(400).json({ error: 'Некорректное видео' });
  res.json(await CommentPage.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(req.query.video) } },
    { $sort: { createdAt: -1 } },
    { $project: { themeLabel: 1, total: 1, createdAt: 1, nextAvailableAt: 1, serverTime: '$$NOW', pending: '$remaining', completed: { $map: { input: '$claims', as: 'claim', in: { comment: '$$claim.comment', issuedAt: '$$claim.issuedAt' } } }, issued: { $size: '$claims' }, remaining: { $size: '$remaining' } } },
  ]));
}));
router.delete('/', auth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.query.video)) return res.status(400).json({ error: 'Некорректное видео' });
  const result = await CommentPage.deleteMany({ video: new mongoose.Types.ObjectId(req.query.video) });
  res.json({ ok: true, deleted: result.deletedCount });
}));
router.post('/', auth, wrap(async (req, res) => {
  const { videoId, theme: themeId, count } = req.body || {};
  const theme = themes.find(t => t.id === themeId);
  if (!theme || !Number.isInteger(count) || count < 1 || count > theme.comments.length || !mongoose.isValidObjectId(videoId)) {
    return res.status(400).json({ error: 'Проверьте тематику, видео и количество комментариев' });
  }
  const video = await Video.findById(videoId);
  if (!video) return res.status(404).json({ error: 'Видео не найдено' });
  const pool = [...theme.comments];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const page = await CommentPage.create({ _id: randomBytes(18).toString('hex'), video: video._id, videoTitle: video.title || 'Комментарий к видео', theme: theme.id, themeLabel: theme.label, total: count, remaining: pool.slice(0, count), claims: [], createdBy: req.admin.id });
  res.status(201).json({ _id: page._id, total: page.total, themeLabel: page.themeLabel, issued: 0, remaining: page.total, createdAt: page.createdAt, pending: page.remaining });
}));
router.post('/:id/reset-timer', auth, wrap(async (req, res) => {
  const page = await CommentPage.findByIdAndUpdate(req.params.id, { $set: { nextAvailableAt: new Date(0) } }, { new: true }).select('_id').lean();
  if (!page) return res.status(404).json({ error: 'Страница не найдена' });
  res.json({ ok: true });
}));
router.post('/:id/comments', auth, wrap(async (req, res) => {
  const raw = req.body || {};
  if (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 5000 || !Array.isArray(raw.tags) || raw.tags.length > 20 || raw.tags.some(t => typeof t !== 'string' || t.length > 500)) return res.status(400).json({ error: 'Введите комментарий до 5000 символов и не более 20 дополнений' });
  const comment = { text: raw.text.trim(), tags: raw.tags.map(t => t.trim()).filter(Boolean) };
  const duplicate = { text: comment.text, tags: comment.tags };
  const page = await CommentPage.findOneAndUpdate({ _id: req.params.id, remaining: { $not: { $elemMatch: duplicate } }, discarded: { $not: { $elemMatch: duplicate } }, claims: { $not: { $elemMatch: { 'comment.text': comment.text, 'comment.tags': comment.tags } } } }, { $push: { remaining: comment }, $inc: { total: 1 } }, { new: true }).select('_id').lean();
  if (!page) {
    if (!await CommentPage.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Страница не найдена' });
    return res.status(409).json({ error: 'Этот комментарий уже есть в наборе или был использован' });
  }
  res.status(201).json({ ok: true });
}));
router.delete('/:id/comments', auth, wrap(async (req, res) => {
  const raw = req.body?.comment;
  if (!raw || typeof raw.text !== 'string' || raw.text.length > 5000 || !Array.isArray(raw.tags) || raw.tags.length > 20 || raw.tags.some(t => typeof t !== 'string' || t.length > 500)) return res.status(400).json({ error: 'Некорректный комментарий' });
  const target = { text: raw.text, tags: raw.tags };
  const page = await CommentPage.findOneAndUpdate({ _id: req.params.id, remaining: { $elemMatch: target } }, {
    $pull: { remaining: target }, $push: { discarded: target }, $inc: { total: -1 },
  }, { new: true }).select('_id').lean();
  if (!page) {
    if (!await CommentPage.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Страница не найдена' });
    return res.status(409).json({ error: 'Комментарий уже получили, заменили или удалили. Обновите список.' });
  }
  res.json({ ok: true });
}));
router.post('/:id/replace', auth, wrap(async (req, res) => {
  const raw = req.body?.comment;
  if (!raw || typeof raw.text !== 'string' || raw.text.length > 5000 || !Array.isArray(raw.tags) || raw.tags.length > 20 || raw.tags.some(t => typeof t !== 'string' || t.length > 500)) return res.status(400).json({ error: 'Некорректный комментарий' });
  const target = { text: raw.text, tags: raw.tags };
  const page = await CommentPage.findById(req.params.id).select('theme').lean();
  if (!page) return res.status(404).json({ error: 'Страница не найдена' });
  const theme = themes.find(t => t.id === page.theme);
  if (!theme) return res.status(400).json({ error: 'Тематика больше недоступна' });
  const { status, ...body } = await replaceComment(CommentPage, req.params.id, target, theme.comments);
  res.status(status).json(body);
}));
router.get('/:id', wrap(async (req, res) => {
  const page = await CommentPage.findById(req.params.id).select('video videoTitle themeLabel total remaining nextAvailableAt').lean();
  if (!page) return res.status(404).json({ error: 'Страница не найдена' });
  const video = await Video.findById(page.video).select('url').lean();
  res.json({ title: page.videoTitle, videoUrl: video?.url || '', nextAvailableAt: page.nextAvailableAt, serverTime: new Date(), themeLabel: page.themeLabel, total: page.total, remaining: page.remaining.length });
}));
router.post('/:id/claim', wrap(async (req, res) => {
  const visitor = req.body?.visitor;
  if (typeof visitor !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(visitor)) return res.status(400).json({ error: 'Некорректный идентификатор посетителя' });
  const { status, ...body } = await claimComment(CommentPage, req.params.id, visitor);
  if (status === 429) res.set('Retry-After', String(Math.max(1, Math.ceil((new Date(body.retryAt) - new Date(body.serverTime)) / 1000))));
  res.status(status).json(body);
}));
export default router;
