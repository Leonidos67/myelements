export const commentCooldown = { idle: 10, normal: 30, busy: 60, peak: 1200 };

export function getCooldownSeconds(dates, now = Date.now()) {
  const times = dates.map(d => new Date(d).getTime()).filter(Number.isFinite);
  if (times.length && Math.max(...times) <= now - 1200000) return commentCooldown.idle;
  const count = 1 + times.filter(t => t > now - 600000).length;
  return count >= 4 ? commentCooldown.peak : count >= 2 ? commentCooldown.busy : commentCooldown.normal;
}
export function forecastQueue(dates, nextAt, now = Date.now()) {
  const history = [...dates]; let at = Math.max(now, new Date(nextAt || 0).getTime());
  return Array.from({length:3}, () => { const pause=getCooldownSeconds(history,at); const item={at,pause}; history.push(new Date(at)); at+=pause*1000; return item; });
}
