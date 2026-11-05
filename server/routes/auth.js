import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ error: 'bad credentials' });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'bad credentials' });

  admin.lastLoginAt = new Date();
  admin.lastLoginIp = req.ip;
  admin.loginCount += 1;
  await admin.save();

  const token = jwt.sign(
    { id: admin._id.toString(), username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({
    id: admin._id,
    username: admin.username,
    lastLoginAt: admin.lastLoginAt,
    loginCount: admin.loginCount,
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('-passwordHash');
  if (!admin) return res.status(401).json({ error: 'gone' });
  res.json(admin);
});

router.get('/admins', auth, async (req, res) => {
  const list = await Admin.find().select('-passwordHash').sort({ username: 1 });
  res.json(list);
});

export default router;