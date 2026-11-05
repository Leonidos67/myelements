import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  loginCount: { type: Number, default: 0 },
}, { collection: 'admins' });

export default mongoose.model('Admin', adminSchema);