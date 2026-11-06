import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
export const MAX_SCRIPT_BYTES = 256 * 1024;
export const LIVE_SCRIPT_URL = 'https://tt-stat.vercel.app/app.js';
export function validateScript(code) {
  if (typeof code !== 'string' || !code.trim()) throw Error('JS-файл пуст');
  if (Buffer.byteLength(code, 'utf8') > MAX_SCRIPT_BYTES) throw Error('Размер JS не должен превышать 256 КБ');
  // Parse only. Uploaded JavaScript is never evaluated on the API server.
  try { new Script(code, { filename: 'app.js' }); }
  catch (e) { throw Error('Ошибка синтаксиса JavaScript: ' + e.message); }
  return createHash('sha256').update(code).digest('hex');
}
export async function fetchLiveScript() {
  const response = await fetch(LIVE_SCRIPT_URL, { signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store' });
  if (!response.ok) throw Error('Сайт вернул HTTP ' + response.status);
  if (!/javascript|ecmascript|text\/plain/i.test(response.headers.get('content-type') || '')) throw Error('Сайт вернул не JavaScript');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SCRIPT_BYTES) { await reader.cancel(); throw Error('JS на сайте превышает 256 КБ'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const code = Buffer.concat(chunks).toString('utf8');
  return { code, hash: validateScript(code) };
}
