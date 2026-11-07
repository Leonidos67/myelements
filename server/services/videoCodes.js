import { randomInt } from 'node:crypto';
import Video from '../models/Video.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function withVideoCode(write) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const shortId = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
    try { return await write(shortId); }
    catch (error) {
      if (error.code !== 11000 || error.keyPattern?.shortId !== 1) throw error;
    }
  }
  throw new Error('Не удалось подобрать уникальный ID видео. Попробуйте ещё раз.');
}

export function createVideoWithCode(data) {
  return withVideoCode(shortId => Video.create({ ...data, shortId }));
}

export async function backfillVideoCodes() {
  await Video.createIndexes();
  const missing = { $exists: false };
  for await (const { _id } of Video.find({ shortId: missing }).select('_id').lean().cursor()) {
    // Only assign a code if another instance has not already assigned one.
    await withVideoCode(shortId => Video.collection.updateOne({ _id, shortId: missing }, { $set: { shortId } }));
  }
}
