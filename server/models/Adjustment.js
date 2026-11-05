import mongoose from 'mongoose';

const adjustmentSchema = new mongoose.Schema({
  amountUsd: { type: Number, required: true }, // со знаком: + пополнение, - списание
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'adjustments' });

export default mongoose.model('Adjustment', adjustmentSchema);