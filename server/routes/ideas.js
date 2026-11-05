import express from 'express';
import Idea from '../models/Idea.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const list = await Idea.find().sort({ date: 1 });
  res.json(list);
});

router.post('/', async (req, res) => {
  const { title, date, category, notes } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: 'title and date required' });
  const idea = await Idea.create({ title, date, category, notes, createdBy: req.admin.id });
  res.status(201).json(idea);
});

router.delete('/:id', async (req, res) => {
  await Idea.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;