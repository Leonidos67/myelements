import { OFFERS, GEOS } from '../data.js';

const TITLES = {
  dashboard: 'Дашборд',
  analytics: 'Аналитика',
  offers: 'Офферы',
  geo: 'Гео',
  import: 'Импорт',
  settings: 'Настройки',
};

const inputCls = 'h-[30px] px-2.5 text-xs bg-surface-2 text-ink border border-line-strong rounded-lg outline-none focus:border-brand';
const btnGhost = 'h-[30px] px-3 text-xs border border-line-strong rounded-lg text-ink-dim hover:bg-surface-2 hover:text-ink transition-colors';
const btnPrimary = 'h-[30px] px-3.5 text-xs font-medium bg-brand text-primary-foreground rounded-lg hover:opacity-90 transition-opacity';

export default function Topbar({ view, filters, onFilters, onAdd, onExport }) {
  const upd = (k, v) => onFilters({ ...filters, [k]: v });
  return (
    <header className="sticky top-0 z-10 bg-surface flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-line">
      <h1 className="text-lg font-semibold tracking-tight m-0 text-ink">{TITLES[view] || 'Дашборд'}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <select className={inputCls} value={filters.offer} onChange={e => upd('offer', e.target.value)}>
          <option value="">все офферы</option>
          {OFFERS.map(o => <option key={o}>{o}</option>)}
        </select>
        <select className={inputCls} value={filters.geo} onChange={e => upd('geo', e.target.value)}>
          <option value="">все гео</option>
          {GEOS.map(g => <option key={g}>{g}</option>)}
        </select>
        <input type="date" className={`${inputCls} font-mono text-[11px]`} value={filters.from} onChange={e => upd('from', e.target.value)} />
        <input type="date" className={`${inputCls} font-mono text-[11px]`} value={filters.to} onChange={e => upd('to', e.target.value)} />
        <button className={btnGhost} onClick={onExport}>Экспорт</button>
        <button className={btnPrimary} onClick={onAdd}>+ Custom Widget</button>
      </div>
    </header>
  );
}