import mongoose from 'mongoose';

const ideaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  category: { type: String, default: 'rubup' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'ideas' });

export default mongoose.model('Idea', ideaSchema);