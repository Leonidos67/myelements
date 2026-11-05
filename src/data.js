export const OFFERS = ['UBT-Crypto','UBT-Finance','UBT-Dating','UBT-Nutra','UBT-Gambling'];
export const GEOS = ['US','DE','GB','BR','IN','FR','CA'];

export function seedRows() {
  const rows = [];
  const today = new Date();
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    const iso = dt.toISOString().slice(0, 10);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const offer = OFFERS[Math.floor(Math.random() * OFFERS.length)];
      const geo = GEOS[Math.floor(Math.random() * GEOS.length)];
      const clicks = 200 + Math.floor(Math.random() * 1800);
      const leads = Math.floor(clicks * (0.02 + Math.random() * 0.08));
      const spend = +(leads * (2 + Math.random() * 8)).toFixed(2);
      const revenue = +(spend * (0.6 + Math.random() * 1.2)).toFixed(2);
      rows.push({ id: crypto.randomUUID(), date: iso, offer, geo, source: 'push', clicks, leads, spend, revenue });
    }
  }
  return rows;
}

export const fmtMoney = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtInt = n => n.toLocaleString('en-US');
export const sum = (arr, k) => arr.reduce((a, r) => a + r[k], 0);