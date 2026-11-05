import { readFileSync, writeFileSync } from 'node:fs';
// Extract each named array separately; never execute source file contents.
const source = readFileSync(new URL('../../seed_comments.txt', import.meta.url), 'utf8');
const labels = {
  rubupDropComments: 'Занос с маленьким процентом — скин',
  cs2HighlightsComments: 'Нарезки CS2',
};
const arrays = [...source.matchAll(/^\s*const\s+(\w+)\s*=\s*\[([\s\S]*?)^\s*\];/gm)];
const themes = arrays.filter(([, id]) => Object.hasOwn(labels, id)).map(([, id, body]) => {
  const comments = [...body.matchAll(/\{\s*text:\s*("(?:[^"\\]|\\.)*")\s*,\s*tags:\s*(\[[^\]]*\])\s*\}/g)]
    .map(m => ({ text: JSON.parse(m[1]), tags: JSON.parse(m[2]) }));
  if (!comments.length) throw Error(`В массиве ${id} не найдены комментарии`);
  const unique = [...new Map(comments.map(c => [JSON.stringify(c), c])).values()];
  console.log(`${id}: ${unique.length} вариантов, удалено дублей: ${comments.length - unique.length}`);
  return { id, label: labels[id], comments: unique };
});
for (const id of Object.keys(labels)) {
  if (themes.filter(t => t.id === id).length !== 1) throw Error(`Ожидается ровно один массив ${id}`);
}
writeFileSync(new URL('../data/comment-themes.json', import.meta.url), JSON.stringify(themes, null, 2) + '\n');
