import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import CommentPage from '../models/CommentPage.js';
import { claimComment } from '../services/claimComment.js';
import { replaceComment } from '../services/replaceComment.js';

// Run explicitly: node tests/comment-claims.js. Only this temporary collection is changed.
const collection = `comment_claim_test_${randomUUID().replaceAll('-', '')}`;
const Model = mongoose.model('CommentClaimTest', CommentPage.schema.clone(), collection);
let created = false;
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 10000, socketTimeoutMS: 15000, maxPoolSize: 5 });
  const comments = Array.from({ length: 25 }, (_, i) => ({ text: `Comment ${i}`, tags: i % 2 ? ['+ sticker'] : [] }));
  await Model.create({ _id: 'concurrent', video: new mongoose.Types.ObjectId(), total: comments.length, remaining: comments, claims: [] });
  created = true;
  const visitors = Array.from({ length: 50 }, () => randomUUID());
  const results = await Promise.all(visitors.map(v => claimComment(Model, 'concurrent', v)));
  const successes = results.filter(r => r.status === 200);
  assert.equal(successes.length, 25);
  assert.equal(new Set(successes.map(r => r.comment.text)).size, 25);
  assert.equal(results.filter(r => r.status === 410).length, 25);
  const winner = results.findIndex(r => r.status === 200);
  const repeat = await claimComment(Model, 'concurrent', visitors[winner]);
  assert.deepEqual(repeat.comment, results[winner].comment);
  const exhausted = await Model.findById('concurrent').lean();
  assert.equal(exhausted.remaining.length, 0);
  assert.equal(exhausted.claims.length, 25);
  await Model.create({ _id: 'retry', video: new mongoose.Types.ObjectId(), total: 25, remaining: comments, claims: [] });
  const visitor = randomUUID();
  const retries = await Promise.all(Array.from({ length: 20 }, () => claimComment(Model, 'retry', visitor)));
  assert.ok(retries.every(r => r.status === 200));
  assert.equal(new Set(retries.map(r => r.comment.text)).size, 1);
  const afterRetry = await Model.findById('retry').lean();
  assert.equal(afterRetry.remaining.length, 24);
  assert.equal(afterRetry.claims.length, 1);
  assert.deepEqual(afterRetry.remaining[0].tags, ['+ sticker']);
  assert.equal((await claimComment(Model, 'missing', randomUUID())).status, 404);
  const reserve = [...comments, ...Array.from({ length: 5 }, (_, i) => ({ text: 'Reserve ' + i, tags: [] }))];
  const firstTarget = afterRetry.remaining[0];
  const replacement = await replaceComment(Model, 'retry', firstTarget, reserve);
  assert.equal(replacement.status, 200);
  const secondTarget = afterRetry.remaining[1];
  const concurrent = await Promise.all(Array.from({ length: 10 }, () => replaceComment(Model, 'retry', secondTarget, reserve)));
  assert.equal(concurrent.filter(r => r.status === 200).length, 1);
  const afterReplacement = await Model.findById('retry').lean();
  assert.equal(afterReplacement.remaining.length, 24);
  assert.equal(afterReplacement.total, 25);
  assert.deepEqual(afterReplacement.claims, afterRetry.claims);
  assert.equal(afterReplacement.discarded.length, 2);
  assert.equal(new Set([...afterReplacement.remaining, ...afterReplacement.discarded, ...afterReplacement.claims.map(c => c.comment)].map(c => c.text)).size, 27);
  assert.equal((await replaceComment(Model, 'retry', afterRetry.claims[0].comment, reserve)).status, 409);
  assert.equal((await replaceComment(Model, 'retry', firstTarget, reserve)).status, 409);
  const noReserve = await replaceComment(Model, 'retry', afterReplacement.remaining[0], [...afterReplacement.remaining, ...afterReplacement.discarded, ...afterReplacement.claims.map(c => c.comment)]);
  assert.equal(noReserve.status, 409);
  await Model.create({ _id: 'race', video: new mongoose.Types.ObjectId(), total: 2, remaining: comments.slice(0, 2), claims: [] });
  const [raceReplace, raceClaim] = await Promise.all([
    replaceComment(Model, 'race', comments[0], reserve), claimComment(Model, 'race', randomUUID()),
  ]);
  assert.equal(raceClaim.status, 200);
  assert.ok([200, 409].includes(raceReplace.status));
  const race = await Model.findById('race').lean();
  assert.equal(race.remaining.length, 1);
  assert.equal(race.claims.length, 1);
  assert.ok(!race.discarded.some(c => c.text === race.claims[0].comment.text));
  console.log('PASS: pending replacements, simultaneous replacements and claims, issued unchanged, unchanged quota, no repeats, exhausted reserve');
  console.log('PASS: concurrent unique claims, exhaustion, retry after exhaustion, simultaneous duplicate requests, tags, missing page');
} finally {
  if (created) await Model.collection.drop();
  await mongoose.disconnect();
}
