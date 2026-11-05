import express from 'express';
import Saving from '../models/Saving.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const list = await Saving.find().sort({ createdAt: -1 }).populate('createdBy', 'username');
  res.json(list);
});

router.post('/', async (req, res) => {
  const { title, url, type, category, notes } = req.body || {};
  if (!title || !url) return res.status(400).json({ error: 'title and url required' });
  const s = await Saving.create({ title, url, type, category, notes, createdBy: req.admin.id });
  res.status(201).json(s);
});

router.delete('/:id', async (req, res) => {
  await Saving.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;