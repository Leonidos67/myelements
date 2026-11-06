import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, unique: true },
  code: { type: String, required: true },
  filename: { type: String, default: 'app.js' },
  hash: String,
  revision: { type: Number, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { collection: 'video_scripts', timestamps: true });
export default mongoose.model('VideoScript', schema);
