import mongoose from 'mongoose';
const comment = new mongoose.Schema({ text: String, tags: [String] }, { _id: false });
const claim = new mongoose.Schema({ visitor: String, comment, issuedAt: Date, revision: { type: Number, default: 0 }, replacedAt: Date }, { _id: false });
const schema = new mongoose.Schema({
  _id: { type: String },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  videoTitle: String,
  theme: String,
  themeLabel: String,
  total: Number,
  nextAvailableAt: Date,
  remaining: [comment],
  claims: [claim],
  discarded: [comment],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'comment_pages' });
schema.index({ video: 1, createdAt: -1 });
export default mongoose.model('CommentPage', schema);
