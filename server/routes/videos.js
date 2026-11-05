import express from 'express';
import Video from '../models/Video.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const q = {};
  if (req.query.account) q.account = req.query.account;
  const list = await Video.find(q)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('account', 'name')
    .populate('createdBy', 'username');
  res.json(list);
});

router.post('/', async (req, res) => {
  const { account, url, title, views, category, likes } = req.body || {};
  if (!account || !url) return res.status(400).json({ error: 'account and url required' });
  
  const v = await Video.create({
    account, url, title,
    category: category || 'rubup',
    views: Number(views) || 0,
    likes: Number(likes) || 0, // <-- ДОБАВЛЕНО
    createdBy: req.admin.id,
  });
  
  await v.populate('account', 'name');
  await v.populate('createdBy', 'username');
  res.status(201).json(v);
});

router.patch('/:id', async (req, res) => {
  const patch = { updatedAt: new Date() };
  for (const field of ['isFavorite', 'isPinned']) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] !== 'boolean') return res.status(400).json({ error: field + ' must be boolean' });
      patch[field] = req.body[field];
    }
  }
  
  if (req.body.views !== undefined) {
    patch.views = Number(req.body.views) || 0;
  }
  
  // ДОБАВЛЕНО: Обновление лайков
  if (req.body.likes !== undefined) {
    patch.likes = Number(req.body.likes) || 0;
  }
  
  if (req.body.status !== undefined) {
    patch.status = req.body.status;
  }
  if (req.body.expenses !== undefined) {
    patch.expenses = {
      p1: Number(req.body.expenses.p1) || 0,
      p2: Number(req.body.expenses.p2) || 0,
      p3: Number(req.body.expenses.p3) || 0,
      p4: Number(req.body.expenses.p4) || 0,
      p5: Number(req.body.expenses.p5) || 0,
    };
  }
  
  const v = await Video.findByIdAndUpdate(req.params.id, patch, { new: true })
    .populate('account', 'name')
    .populate('createdBy', 'username');
    
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
});

router.delete('/:id', async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;