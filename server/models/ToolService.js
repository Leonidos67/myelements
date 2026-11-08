import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, default: '' },
  text: { type: String, default: '' },
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  materials: { type: [materialSchema], default: [] },
}, { timestamps: true, collection: 'tool_services' });

serviceSchema.index({ owner: 1, updatedAt: -1 });
export default mongoose.model('ToolService', serviceSchema);
