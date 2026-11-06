import { useState } from 'react';
import { OFFERS, GEOS } from '../data.js';

const fieldLabel = 'text-[10px] uppercase tracking-[0.06em] text-ink-dim font-medium';
const inputCls = 'h-8 px-2.5 text-xs bg-surface-2 text-ink border border-line-strong rounded-lg outline-none focus:border-brand';

export default function EditModal({ row, onSave, onClose }) {
  const [r, setR] = useState(row);
  const upd = (k, v) => setR(prev => ({ ...prev, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-line-strong rounded-2xl w-full max-w-[480px] shadow-modal overflow-hidden">
        <div className="px-6 py-3.5 border-b border-line font-semibold text-[13px] text-ink">Редактировать запись</div>
        <div className="p-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Дата</label>
            <input type="date" className={inputCls} value={r.date} onChange={e => upd('date', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Оффер</label>
            <select className={inputCls} value={r.offer} onChange={e => upd('offer', e.target.value)}>
              {OFFERS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Гео</label>
            <select className={inputCls} value={r.geo} onChange={e => upd('geo', e.target.value)}>
              {GEOS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Источник</label>
            <input className={inputCls} value={r.source} onChange={e => upd('source', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Клики</label>
            <input type="number" className={inputCls} value={r.clicks} onChange={e => upd('clicks', +e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Лиды</label>
            <input type="number" className={inputCls} value={r.leads} onChange={e => upd('leads', +e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Траты $</label>
            <input type="number" step="0.01" className={inputCls} value={r.spend} onChange={e => upd('spend', +e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={fieldLabel}>Доход $</label>
            <input type="number" step="0.01" className={inputCls} value={r.revenue} onChange={e => upd('revenue', +e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-line flex justify-end gap-2">
          <button
            className="h-8 px-3.5 text-xs border border-line-strong rounded-lg bg-surface-2 text-ink hover:bg-side-active transition-colors"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="h-8 px-3.5 text-xs bg-brand text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => onSave(r)}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}