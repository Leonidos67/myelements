import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Video, Send, FileText, Bookmark, Filter } from 'lucide-react';
import { api } from './api';

const TYPE_ICONS = {
  youtube: { Icon: Video, label: 'YouTube', color: 'text-red-500', bg: 'bg-red-500/10' },
  telegram: { Icon: Send, label: 'Telegram', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  article: { Icon: FileText, label: 'Статья', color: 'text-foreground', bg: 'bg-gray-500/10' },
  other: { Icon: Bookmark, label: 'Другое', color: 'text-foreground', bg: 'bg-primary/10' },
};

export default function SavingsView({ savings, reload }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? savings : savings.filter(s => s.type === filterType);

  return (
    <div className="space-y-4">
      {/* Верхняя панель: фильтры + кнопка */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-subtle" />
          {[
            { k: 'all', label: 'Все' },
            { k: 'youtube', label: 'YouTube' },
            { k: 'telegram', label: 'Telegram' },
            { k: 'article', label: 'Статьи' },
            { k: 'other', label: 'Другое' },
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilterType(f.k)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filterType === f.k ? 'bg-elevated text-foreground' : 'text-muted hover:text-foreground hover:bg-elevated'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="h-8 px-4 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:opacity-90 flex items-center gap-1.5"
        >
          <Plus size={14} /> Сохранить
        </button>
      </div>

      {/* Сетка карточек */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center">
          <Bookmark size={48} className="mx-auto mb-3 text-subtle opacity-50" />
          <p className="text-subtle text-sm">Нет сохранений. Добавьте первый референс.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => {
            const t = TYPE_ICONS[s.type] || TYPE_ICONS.other;
            const Icon = t.Icon;
            return (
              <div key={s._id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col group hover:border-foreground/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center`}>
                    <Icon size={16} className={t.color} />
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Удалить сохранение?')) {
                        await api.deleteSaving(s._id);
                        reload();
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 transition-opacity p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{s.title}</h3>
                {s.category && (
                  <span className="text-[10px] uppercase text-subtle font-mono mb-2">{s.category}</span>
                )}
                {s.notes && (
                  <p className="text-[11px] text-muted line-clamp-2 mb-3">{s.notes}</p>
                )}

                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto flex items-center gap-1.5 text-xs text-foreground hover:underline pt-3 border-t border-line"
                >
                  <ExternalLink size={12} /> Открыть
                </a>
              </div>
            );
          })}
        </div>
      )}

      {isAddOpen && (
        <AddSavingModal onClose={() => setIsAddOpen(false)} onAdd={() => { setIsAddOpen(false); reload(); }} />
      )}
    </div>
  );
}

function AddSavingModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('youtube');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await api.addSaving({ title, url, type, category, notes });
      onAdd();
    } finally { setBusy(false); }
  };

  const inputCls = 'bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground w-full mb-3';

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6">
      <form onSubmit={submit} className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h2 className="text-sm font-semibold">Новое сохранение</h2>
          <button type="button" onClick={onClose} className="text-subtle hover:text-foreground">✕</button>
        </div>
        <div className="p-6">
          <label className="text-[10px] text-muted uppercase mb-1 block">Название</label>
          <input className={inputCls} placeholder="Например: Канал про Dota 2" value={title} onChange={e => setTitle(e.target.value)} required />

          <label className="text-[10px] text-muted uppercase mb-1 block">Ссылка</label>
          <input className={inputCls} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required />

          <label className="text-[10px] text-muted uppercase mb-1 block">Тип</label>
          <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="telegram">Telegram</option>
            <option value="article">Статья</option>
            <option value="other">Другое</option>
          </select>

          <label className="text-[10px] text-muted uppercase mb-1 block">Категория (опционально)</label>
          <input className={inputCls} placeholder="Dota 2 / CS2 / Крипта..." value={category} onChange={e => setCategory(e.target.value)} />

          <label className="text-[10px] text-muted uppercase mb-1 block">Заметка</label>
          <textarea className={inputCls} rows={3} placeholder="Почему сохранил? Чем полезно?" value={notes} onChange={e => setNotes(e.target.value)} />

          <button disabled={busy} className="w-full h-9 mt-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
            {busy ? '...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}