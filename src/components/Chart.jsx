export default function Chart({ data }) {
  const byDay = {};
  data.forEach(r => byDay[r.date] = (byDay[r.date] || 0) + r.spend);
  const days = Object.keys(byDay).sort();

  const cardHead = (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold m-0 text-ink">Траты по дням</h2>
      <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-dim border border-line">7 дней</span>
    </div>
  );

  if (!days.length) {
    return (
      <div className="bg-side-active border border-line-strong rounded-2xl p-4">
        {cardHead}
        <div className="text-center py-7 text-ink-faint">нет данных</div>
      </div>
    );
  }

  const max = Math.max(...Object.values(byDay), 1);
  const W = 800, H = 220, padX = 30, padY = 20;
  const step = (W - padX * 2) / Math.max(days.length - 1, 1);
  const pts = days.map((d, i) => [padX + i * step, H - padY - (byDay[d] / max) * (H - padY * 2)]);
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]} ${H - padY} L ${pts[0][0]} ${H - padY} Z`;

  return (
    <div className="bg-side-active border border-line-strong rounded-2xl p-4">
      {cardHead}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px] block" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4623a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f4623a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(t => (
          <line
            key={t}
            x1={padX} x2={W - padX}
            y1={padY + t * (H - padY * 2)}
            y2={padY + t * (H - padY * 2)}
            stroke="#1f1f1f"
            strokeDasharray="3 3"
          />
        ))}
        <path d={areaPath} fill="url(#area-grad)" />
        <path d={linePath} fill="none" stroke="#f4623a" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#141414" stroke="#f4623a" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5 font-mono text-[11px] text-ink-faint">
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}