import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  targetAmount: { type: Number, required: true },
  deadlineDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'goals' });

export default mongoose.model('Goal', goalSchema);