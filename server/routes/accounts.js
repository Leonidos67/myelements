import express from 'express';
import Account from '../models/Account.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const list = await Account.find().sort({ createdAt: -1 }).populate('createdBy', 'username');
  res.json(list);
});

router.post('/', async (req, res) => {
  const { name, login, note } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const acc = await Account.create({ name, login, note, createdBy: req.admin.id });
  res.status(201).json(acc);
});

router.delete('/:id', async (req, res) => {
  await Account.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;