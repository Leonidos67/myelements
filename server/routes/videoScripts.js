import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import auth from '../middleware/auth.js';
import Video from '../models/Video.js';
import VideoScript from '../models/VideoScript.js';
import { fetchLiveScript, validateScript, LIVE_SCRIPT_URL } from '../services/videoScripts.js';
const router = express.Router();
router.use(auth);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.param('videoId', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Некорректное видео' });
  next();
});
router.get('/:videoId', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!await Video.exists({ _id: req.params.videoId })) return res.status(404).json({ error: 'Видео не найдено' });
  const saved = await VideoScript.findOne({ video: req.params.videoId }).lean();
  const source = req.query.source || 'saved';
  if (!['saved', 'live', 'bundled'].includes(source)) return res.status(400).json({ error: 'Неизвестный источник JS' });
  if (source === 'saved' && saved) return res.json({ code: saved.code, filename: saved.filename, hash: saved.hash, revision: saved.revision, source: 'saved', updatedAt: saved.updatedAt });
  const revision = saved?.revision || 0;
  if (source === 'bundled' || source === 'saved') {
    const code = readFileSync(new URL('../data/tt-stat/app.js', import.meta.url), 'utf8');
    return res.json({ code, filename: 'app.js', hash: validateScript(code), revision, source: 'bundled' });
  }
  try { res.json({ ...await fetchLiveScript(), filename: 'app.js', revision, source: 'live', sourceUrl: LIVE_SCRIPT_URL, checkedAt: new Date() }); }
  catch (e) { res.status(502).json({ error: 'Не удалось получить актуальный JS с tt-stat.vercel.app: ' + e.message }); }
}));
router.put('/:videoId', wrap(async (req, res) => {
  if (!await Video.exists({ _id: req.params.videoId })) return res.status(404).json({ error: 'Видео не найдено' });
  const { code, revision } = req.body || {};
  if (!Number.isInteger(revision) || revision < 0) return res.status(400).json({ error: 'Некорректная версия JS' });
  let hash;
  try { hash = validateScript(code); } catch (e) { return res.status(400).json({ error: e.message }); }
  // A unique index + revision check prevents overwriting another editor's save.
  await VideoScript.init();
  const update = { code, hash, filename: 'app.js', revision: revision + 1, updatedBy: req.admin.id };
  let saved;
  try {
    saved = revision === 0
      ? await VideoScript.create({ ...update, video: req.params.videoId })
      : await VideoScript.findOneAndUpdate({ video: req.params.videoId, revision }, { $set: update }, { new: true });
  } catch (e) { if (e.code !== 11000) throw e; }
  if (!saved) return res.status(409).json({ error: 'JS уже изменён в другом окне. Загрузите сохранённую версию перед повторным сохранением.' });
  res.json({ code: saved.code, hash: saved.hash, revision: saved.revision, filename: saved.filename, source: 'saved', updatedAt: saved.updatedAt });
}));
export default router;
