import mongoose from 'mongoose';

export const CATEGORIES = {
  gifts:   { label: '🎁 Подарки Telegram', rate1k: 1.5, minViews: 3000 },
  cs2:     { label: '🎮 Игры (CS2)',       rate1k: 1.0, minViews: 6000 },
  dota:    { label: '🎮 Dota 2',           rate1k: 0.6, minViews: 6000 },
  creative:{ label: '👩‍🎨 Креатив',         rate1k: 0.15, minViews: 6000 },
  rubup:   { label: '💫 Геймплей в RubUP', rate1k: 3.5, minViews: 3000 },
};

const videoSchema = new mongoose.Schema({
  shortId: { type: String, match: /^[A-Z0-9]{5}$/, immutable: true, unique: true, sparse: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  url: { type: String, required: true, trim: true },
  title: { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  category: { type: String, enum: Object.keys(CATEGORIES), default: 'rubup' },
  views: { type: Number, default: 0, min: 0 },
  
  // ДОБАВЛЕНО: Поле для хранения реального количества лайков
  likes: { type: Number, default: 0, min: 0 },
  
  status: {
    type: String,
    enum: ['moderation', 'published', 'rejected', 'paid'],
    default: 'published',
  },
  expenses: {
    p1: { type: Number, default: 0 },
    p2: { type: Number, default: 0 },
    p3: { type: Number, default: 0 },
    p4: { type: Number, default: 0 },
    p5: { type: Number, default: 0 },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'videos' });

// Виртуальные поля для расчётов
videoSchema.virtual('categoryData').get(function () {
  return CATEGORIES[this.category] || CATEGORIES.rubup;
});

videoSchema.virtual('grossRevenue').get(function () {
  const cat = CATEGORIES[this.category] || CATEGORIES.rubup;
  return +(Math.floor((this.views || 0) / 1000) * cat.rate1k).toFixed(2);
});

videoSchema.virtual('totalExpenses').get(function () {
  const e = this.expenses || {};
  return +((e.p1||0) + (e.p2||0) + (e.p3||0) + (e.p4||0) + (e.p5||0)).toFixed(2);
});

videoSchema.virtual('revenue').get(function () {
  return +(this.grossRevenue - this.totalExpenses).toFixed(2);
});

videoSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Video', videoSchema);