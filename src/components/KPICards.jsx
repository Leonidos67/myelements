import { sum, fmtMoney, fmtInt } from '../data.js';

function Sparkline({ points, color = '#f4623a' }) {
  if (!points.length) return null;
  const max = Math.max(...points, 1);
  const w = 80, h = 28;
  const step = w / Math.max(points.length - 1, 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * h}`).join(' ');
  return (
    <svg width={w} height={h}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function KPICards({ data }) {
  const spend = sum(data, 'spend');
  const revenue = sum(data, 'revenue');
  const leads = sum(data, 'leads');
  const clicks = sum(data, 'clicks');
  const roi = spend ? ((revenue - spend) / spend * 100) : 0;

  const byDay = {};
  data.forEach(r => byDay[r.date] = (byDay[r.date] || 0) + r.spend);
  const days = Object.keys(byDay).sort();
  const spendSeries = days.map(d => byDay[d]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="bg-brand/20 border border-brand/90 rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-[11px] text-ink-dim uppercase tracking-[0.06em]">Траты (Total)</div>
        <div className="text-2xl font-semibold tracking-tight font-mono text-ink">{fmtMoney(spend)}</div>
        <div className="flex items-center justify-between text-[11px] text-ink-faint">
          <span>{data.length} записей</span>
          <Sparkline points={spendSeries} color="#f4623a" />
        </div>
      </div>
      <div className="bg-side-active border border-line-strong rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-[11px] text-ink-dim uppercase tracking-[0.06em]">ROI</div>
        <div className={`text-2xl font-semibold tracking-tight font-mono ${roi >= 0 ? 'text-brand' : 'text-danger'}`}>
          {roi.toFixed(1)}%
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-faint">
          <span>net / spend</span>
          <Sparkline points={spendSeries} />
        </div>
      </div>
      <div className="bg-side-active border border-line-strong rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-[11px] text-ink-dim uppercase tracking-[0.06em]">Доход</div>
        <div className="text-2xl font-semibold tracking-tight font-mono text-ink">{fmtMoney(revenue)}</div>
        <div className="flex items-center justify-between text-[11px] text-ink-faint">
          <span>{fmtInt(leads)} лидов</span>
          <Sparkline points={spendSeries.map(v => v * (1 + roi / 100))} />
        </div>
      </div>
    </div>
  );
}