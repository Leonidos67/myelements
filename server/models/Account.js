import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  login: { type: String, default: '', trim: true },
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'accounts' });

export default mongoose.model('Account', accountSchema);