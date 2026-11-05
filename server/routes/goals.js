import express from 'express';
import Goal from '../models/Goal.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const goal = await Goal.findOne().sort({ createdAt: -1 });
  res.json(goal);
});

router.post('/', async (req, res) => {
  const { title, imageUrl, targetAmount, deadlineDate } = req.body;
  await Goal.deleteMany({});
  const goal = await Goal.create({
    title, imageUrl, targetAmount, deadlineDate, createdBy: req.admin.id
  });
  res.status(201).json(goal);
});

export default router;