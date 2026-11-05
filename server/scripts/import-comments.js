import { readFileSync, writeFileSync } from 'node:fs';
// Extract data only. Never execute the prose/JavaScript in seed_comments.txt.
const source = readFileSync(new URL('../../seed_comments.txt', import.meta.url), 'utf8');
const comments = [...source.matchAll(/\{\s*text:\s*("(?:[^"\\]|\\.)*")\s*,\s*tags:\s*(\[[^\]]*\])\s*\}/g)]
  .map(m => ({ text: JSON.parse(m[1]), tags: JSON.parse(m[2]) }));
if (!comments.length) throw Error('В seed_comments.txt не найдены комментарии');
const unique = [...new Map(comments.map(c => [JSON.stringify(c), c])).values()];
writeFileSync(new URL('../data/comment-themes.json', import.meta.url), JSON.stringify([
  { id: 'rubupDropComments', label: 'Занос с маленьким процентом — скин', comments: unique },
], null, 2) + '\n');
console.log(`Импортировано ${unique.length} вариантов, удалено дублей: ${comments.length - unique.length}`);
