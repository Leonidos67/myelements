import { fmtInt } from '../data.js';

export default function GeoMap({ data }) {
  const byGeo = {};
  data.forEach(r => {
    byGeo[r.geo] = byGeo[r.geo] || { clicks: 0, spend: 0 };
    byGeo[r.geo].clicks += r.clicks;
    byGeo[r.geo].spend += r.spend;
  });
  const top = Object.entries(byGeo).sort((a, b) => b[1].spend - a[1].spend).slice(0, 4);
  const totalClicks = top.reduce((a, [, v]) => a + v.clicks, 0) || 1;
  const pinPos = [
    { top: '35%', left: '30%' },
    { top: '55%', left: '55%' },
    { top: '45%', left: '75%' },
    { top: '70%', left: '40%' },
  ];

  return (
    <div className="bg-side-active border border-line-strong rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold m-0 text-ink">Global Traction</h2>
        <button className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-dim border border-line">Expand</button>
      </div>
      <div
        className="relative h-[220px] rounded-[10px] overflow-hidden bg-surface-2"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 40%, rgba(244,98,58,0.10) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(244,98,58,0.08) 0%, transparent 55%)',
        }}
      >
        {top.map(([g, v], i) => (
          <div key={g} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1" style={pinPos[i]}>
            <span className="w-3 h-3 rounded-full bg-brand shadow-[0_0_0_4px_rgba(244,98,58,0.25)]" />
            <span className="font-mono text-[10px] text-ink bg-black/70 border border-line-strong px-1.5 py-0.5 rounded">
              {g} · {Math.round(v.clicks / totalClicks * 100)}%
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
        {top.map(([g, v]) => (
          <div key={g} className="flex justify-between text-[11px] px-2 py-1 bg-surface-2 rounded-md border border-line">
            <span className="font-mono text-ink-dim">{g}</span>
            <span className="font-mono font-semibold text-ink">{fmtInt(v.clicks)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}