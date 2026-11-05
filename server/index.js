import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRouter from './routes/auth.js';
import accountsRouter from './routes/accounts.js';
import videosRouter from './routes/videos.js';
import statsRouter from './routes/stats.js';
import goalsRouter from './routes/goals.js';
import aiRouter from './routes/ai.js';
import ideasRouter from './routes/ideas.js';
import savingsRouter from './routes/savings.js';
import adjustmentsRouter from './routes/adjustments.js';

import commentPagesRouter from './routes/commentPages.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use('/api/comment-pages', commentPagesRouter);
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/stats', statsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/adjustments', adjustmentsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

// Глобальный обработчик ошибок (чтобы видеть их в консоли)
app.use((err, req, res, next) => {
  console.error('🔥 SERVER ERROR:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'internal server error' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('mongo connected:', process.env.MONGO_URI);
    app.listen(PORT, () => console.log(`api on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('mongo error:', err.message);
    process.exit(1);
  });