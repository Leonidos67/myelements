import express from 'express';
import Adjustment from '../models/Adjustment.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const list = await Adjustment.find().sort({ createdAt: -1 }).populate('createdBy', 'username');
  res.json(list);
});

router.post('/', async (req, res) => {
  const { amountUsd, note } = req.body || {};
  if (typeof amountUsd !== 'number' || isNaN(amountUsd)) {
    return res.status(400).json({ error: 'amountUsd must be a number' });
  }
  const a = await Adjustment.create({ amountUsd, note, createdBy: req.admin.id });
  res.status(201).json(a);
});

router.delete('/:id', async (req, res) => {
  await Adjustment.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;