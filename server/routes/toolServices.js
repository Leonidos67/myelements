import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import ToolService from '../models/ToolService.js';

const router = express.Router();
const wrap = handler => (req, res, next) => handler(req, res).catch(next);
const limit = 200;
router.use(auth);
for (const param of ['id', 'materialId']) {
  router.param(param, (req, res, next, value) => {
    if (!mongoose.isObjectIdOrHexString(value)) return res.status(400).json({ error: 'Некорректный ID' });
    next();
  });
}

function serviceInput(body) {
  if (typeof body?.name !== 'string' || !body.name.trim() || body.name.length > 120) return null;
  const description = body.description ?? '';
  if (typeof description !== 'string' || description.length > 2000) return null;
  return { name: body.name.trim(), description: description.trim() };
}

function materialInput(body) {
  if (typeof body?.title !== 'string' || !body.title.trim() || body.title.length > 160) return null;
  const url = body.url ?? '';
  const text = body.text ?? '';
  if (typeof url !== 'string' || url.length > 2000 || typeof text !== 'string' || text.length > 10000) return null;
  if (!url.trim() && !text.trim()) return null;
  if (url.trim()) {
    try {
      if (!['http:', 'https:'].includes(new URL(url.trim()).protocol)) return null;
    } catch { return null; }
  }
  return { title: body.title.trim(), url: url.trim(), text };
}

const serviceFilter = req => ({ _id: req.params.id, owner: req.admin.id });
const missing = res => res.status(404).json({ error: 'Сервис или материал не найден' });
const invalidMaterial = res => res.status(400).json({ error: 'Укажите название и текст или корректную ссылку HTTP(S)' });

router.get('/', wrap(async (req, res) => {
  const rows = await ToolService.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.admin.id) } },
    { $sort: { updatedAt: -1 } },
    { $project: { name: 1, description: 1, updatedAt: 1, materialCount: { $size: '$materials' } } },
  ]);
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const data = serviceInput(req.body);
  if (!data) return res.status(400).json({ error: 'Укажите название до 120 символов и описание до 2 000 символов' });
  res.status(201).json(await ToolService.create({ ...data, owner: req.admin.id }));
}));

router.get('/:id', wrap(async (req, res) => {
  const service = await ToolService.findOne(serviceFilter(req)).lean();
  if (!service) return missing(res);
  res.json(service);
}));

router.patch('/:id', wrap(async (req, res) => {
  const data = serviceInput(req.body);
  if (!data) return res.status(400).json({ error: 'Проверьте название и описание сервиса' });
  const service = await ToolService.findOneAndUpdate(serviceFilter(req), { $set: data }, { new: true });
  if (!service) return missing(res);
  res.json(service);
}));

router.delete('/:id', wrap(async (req, res) => {
  const result = await ToolService.deleteOne(serviceFilter(req));
  if (!result.deletedCount) return missing(res);
  res.json({ ok: true });
}));

router.post('/:id/materials', wrap(async (req, res) => {
  const data = materialInput(req.body);
  if (!data) return invalidMaterial(res);
  const service = await ToolService.findOneAndUpdate(
    { ...serviceFilter(req), ['materials.' + (limit - 1)]: { $exists: false } },
    { $push: { materials: { $each: [data], $position: 0 } } },
    { new: true },
  );
  if (!service) {
    if (!await ToolService.exists(serviceFilter(req))) return missing(res);
    return res.status(409).json({ error: 'В одном сервисе можно сохранить до ' + limit + ' материалов' });
  }
  res.status(201).json(service);
}));

router.patch('/:id/materials/:materialId', wrap(async (req, res) => {
  const data = materialInput(req.body);
  if (!data) return invalidMaterial(res);
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => ['materials.$.' + key, value]));
  const service = await ToolService.findOneAndUpdate(
    { ...serviceFilter(req), 'materials._id': req.params.materialId },
    { $set: { ...fields, 'materials.$.updatedAt': new Date() } },
    { new: true },
  );
  if (!service) return missing(res);
  res.json(service);
}));

router.delete('/:id/materials/:materialId', wrap(async (req, res) => {
  const service = await ToolService.findOneAndUpdate(
    { ...serviceFilter(req), 'materials._id': req.params.materialId },
    { $pull: { materials: { _id: req.params.materialId } } },
    { new: true },
  );
  if (!service) return missing(res);
  res.json(service);
}));

export default router;
