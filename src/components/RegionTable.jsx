import { fmtInt, fmtMoney } from '../data.js';

export default function RegionTable({ data, keyField, title, onEdit, onDelete }) {
  const groups = {};
  data.forEach(r => {
    const k = r[keyField];
    groups[k] = groups[k] || { spend: 0, revenue: 0, leads: 0, clicks: 0, count: 0 };
    groups[k].spend += r.spend;
    groups[k].revenue += r.revenue;
    groups[k].leads += r.leads;
    groups[k].clicks += r.clicks;
    groups[k].count += 1;
  });
  const list = Object.entries(groups).sort((a, b) => b[1].spend - a[1].spend);

  const th = 'text-right font-medium text-[10px] uppercase tracking-[0.06em] text-ink-dim px-2.5 py-2 border-b border-line';
  const thLeft = 'text-left font-medium text-[10px] uppercase tracking-[0.06em] text-ink-dim px-2.5 py-2 border-b border-line';

  return (
    <div className="bg-side-active border border-line-strong rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold m-0 text-ink">{title}</h2>
        <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-dim border border-line">{list.length}</span>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thLeft}>{keyField === 'geo' ? 'Гео' : 'Оффер'}</th>
            <th className={th}>Записей</th>
            <th className={th}>Клики</th>
            <th className={th}>Лиды</th>
            <th className={th}>Траты</th>
            <th className={th}>Доход</th>
            <th className={th}>ROI</th>
            {onEdit && <th className="border-b border-line" />}
          </tr>
        </thead>
        <tbody>
          {list.map(([k, v]) => {
            const roi = v.spend ? ((v.revenue - v.spend) / v.spend * 100) : 0;
            return (
              <tr key={k} className="hover:bg-surface-2 transition-colors">
                <td className="px-2.5 py-2.5 border-b border-line text-ink"><strong>{k}</strong></td>
                <td className="px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums text-ink">{v.count}</td>
                <td className="px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums text-ink">{fmtInt(v.clicks)}</td>
                <td className="px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums text-ink">{fmtInt(v.leads)}</td>
                <td className="px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums text-ink">{fmtMoney(v.spend)}</td>
                <td className="px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums text-ink">{fmtMoney(v.revenue)}</td>
                <td className={`px-2.5 py-2.5 border-b border-line text-right font-mono tabular-nums ${roi >= 0 ? 'text-brand' : 'text-danger'}`}>
                  {roi.toFixed(1)}%
                </td>
                {onEdit && (
                  <td className="px-2.5 py-2.5 border-b border-line text-right whitespace-nowrap">
                    <button className="text-ink-faint px-1.5 py-0.5 rounded hover:bg-surface hover:text-ink" onClick={() => onEdit(v.id)}>✎</button>
                    <button className="text-ink-faint px-1.5 py-0.5 rounded hover:bg-surface hover:text-danger" onClick={() => onDelete(v.id)}>✕</button>
                  </td>
                )}
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr><td colSpan={8} className="text-center py-8 text-ink-faint">нет данных</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}