import mongoose from 'mongoose';

const savingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['youtube', 'telegram', 'article', 'other'], default: 'other' },
  category: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'savings' });

export default mongoose.model('Saving', savingSchema);