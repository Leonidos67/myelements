import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, RefreshCw, Plus, MessageSquare, ShieldCheck, Trash2, ChartNoAxesCombined, CheckCheck } from 'lucide-react';
import { api } from './api';

export default function CommentPageModal({ video, onClose, onChange }) {
  const [tab, setTab] = useState('progress');
  const [themes, setThemes] = useState([]);
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(250);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState('');
  const [replacing, setReplacing] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const activePage = pages.find(p => p._id === selectedPageId) || pages[0];
  useEffect(() => {
    let active = true;
    Promise.all([api.commentThemes(), api.commentPages(video._id)]).then(([t, p]) => {
      if (!active) return;
      setThemes(t); setTheme(t[0]?.id || ''); setPages(p); setShowForm(p.length === 0);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    const escape = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escape);
    return () => { active = false; document.removeEventListener('keydown', escape); };
  }, [video._id]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) api.commentPages(video._id).then(setPages).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [video._id]);
  const selected = themes.find(t => t.id === theme);
  const url = id => `${window.location.origin}/get-comment/${id}`;
  const total = pages.reduce((sum, p) => sum + p.total, 0);
  const issued = pages.reduce((sum, p) => sum + p.issued, 0);
  const percent = total ? Math.round(issued / total * 100) : 0;
  async function refresh() {
    setRefreshing(true); setError('');
    try {
      const [t, p] = await Promise.all([api.commentThemes(), api.commentPages(video._id)]);
      setThemes(t); setTheme(current => current || t[0]?.id || ''); setPages(p);
      if (!p.length) setShowForm(true);
      onChange?.();
    } catch (e) { setError(e.message); }
    finally { setRefreshing(false); }
  }
  async function deleteTask() {
    if (!window.confirm('Удалить задачу по комментариям для этого видео? Все наборы, ссылки и история выдачи будут удалены.')) return;
    setDeleting(true); setError('');
    try {
      await api.deleteCommentTask(video._id);
      await onChange?.();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  }
  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const page = await api.createCommentPage({ videoId: video._id, theme, count: Number(count) });
      setPages(p => [page, ...p]); setSelectedPageId(page._id); setShowForm(false); onChange?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function replace(pageId, comment) {
    const key = pageId + ':' + JSON.stringify(comment);
    setReplacing(key); setError('');
    try {
      await api.replaceComment(pageId, comment);
      setPages(await api.commentPages(video._id));
    } catch (e) {
      setError(e.message);
      try { setPages(await api.commentPages(video._id)); } catch {}
    } finally { setReplacing(''); }
  }
  async function copy(id) {
    try { await navigator.clipboard.writeText(url(id)); setCopied(id); }
    catch { setError('Не удалось скопировать ссылку автоматически. Скопируйте её из поля.'); }
  }
  const action = 'inline-flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-2 text-xs text-gray-300 hover:bg-[#292929] disabled:opacity-50';
  const tabs = [
    { id: 'progress', label: 'Прогресс', icon: ChartNoAxesCombined },
    { id: 'pending', label: 'Ещё не получили', icon: MessageSquare, count: total - issued },
    { id: 'completed', label: 'Выполненные', icon: CheckCheck, count: issued },
  ];
  return <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="comment-modal-title" className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-[#333] bg-[#141414] text-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="shrink-0 px-5 pt-5 sm:px-6 border-b border-white/5">
        <div className="flex justify-between items-center gap-4"><h2 id="comment-modal-title" className="text-lg font-semibold">Комментарии для видео</h2><button aria-label="Закрыть" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:text-white hover:bg-white/5"><X size={20} /></button></div>
        <p className="text-xs text-gray-500 mt-2 truncate" title={video.title || video.url}>{video.title || video.url}</p>
        <div role="tablist" aria-label="Разделы задачи" className="mt-5 flex gap-1 overflow-x-auto">{tabs.map(({ id, label, icon: Icon, count: badge }) => <button key={id} role="tab" id={'comment-tab-' + id} aria-selected={tab === id} aria-controls={'comment-panel-' + id} onClick={() => setTab(id)} className={'inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-2.5 sm:px-4 py-3 text-[11px] sm:text-xs border-b-2 transition-colors ' + (tab === id ? 'border-[#f4623a] text-white' : 'border-transparent text-gray-500 hover:text-gray-300')}><Icon size={14} />{label}{badge !== undefined && <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-mono ' + (tab === id ? 'bg-[#f4623a]/15 text-[#ff986f]' : 'bg-white/5 text-gray-500')}>{badge}</span>}</button>)}</div>
      </header>
      <div className="comment-pending-scroll min-h-0 overflow-y-auto p-5 sm:p-6">
        {tab === 'progress' ? <div role="tabpanel" id="comment-panel-progress" aria-labelledby="comment-tab-progress">
      {loading ? <p className="mt-6 text-gray-500">Загрузка…</p> : <>
        {pages.length > 0 && <div className="mt-5 rounded-xl border border-[#333] p-4">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Общий прогресс</span><span className="font-mono text-[#f4623a]">{percent}%</span></div>
          <p className="mt-2 text-xl font-semibold">{issued} <span className="text-sm text-gray-500 font-normal">из {total} выдано</span></p>
          <div role="progressbar" aria-label="Выдано комментариев" aria-valuemin={0} aria-valuemax={total} aria-valuenow={issued} className="mt-3 h-2 rounded-full bg-[#292929] overflow-hidden"><div className="h-full rounded-full bg-[#f4623a] transition-all" style={{ width: `${percent}%` }} /></div>
          <p className="mt-3 text-xs text-gray-500">Осталось {total - issued}. Прогресс учитывает получение комментария на странице; публикация под видео не проверяется.</p>
        </div>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className={action} onClick={refresh} disabled={refreshing || deleting}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Обновляем…' : 'Обновить прогресс'}</button>
          {pages.length > 0 && <button className={action} disabled={deleting || busy || !!replacing} onClick={() => setShowForm(s => !s)}><Plus size={13} />{showForm ? 'Скрыть форму' : 'Создать ещё набор'}</button>}
        </div>
        {pages.length > 0 && <button onClick={deleteTask} disabled={deleting || busy || !!replacing || refreshing} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"><Trash2 size={13} />{deleting ? 'Удаляем…' : 'Удалить задачу'}</button>}
        {pages.length > 0 && <div className="mt-5 space-y-4">{pages.map(p => {
          const progress = p.total ? Math.round(p.issued / p.total * 100) : 0;
          return <div key={p._id} className="p-4 border border-[#333] rounded-xl">
            <div className="flex justify-between items-start gap-3"><p className="text-sm">{p.themeLabel}</p><span className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${p.issued === p.total ? 'bg-green-500/10 text-green-400' : 'bg-[#f4623a]/10 text-[#f4623a]'}`}>{p.issued === p.total ? 'Завершено' : 'В процессе'}</span></div>
            <p className="text-xs text-gray-400 mt-2">Выдано {p.issued} из {p.total} · Осталось {p.remaining} · {progress}%</p>
            <div className="h-1.5 mt-2 mb-4 rounded-full bg-[#292929] overflow-hidden"><div className="h-full bg-[#f4623a] rounded-full" style={{ width: `${progress}%` }} /></div>
            <input aria-label="Ссылка на страницу комментариев" readOnly value={url(p._id)} onFocus={e => e.target.select()} className="w-full bg-[#0a0a0a] p-2.5 rounded-lg text-xs border border-[#292929]" />
            <div className="flex flex-wrap gap-2 mt-3"><button onClick={() => copy(p._id)} className={action}><Copy size={13} />{copied === p._id ? 'Скопировано' : 'Копировать ссылку'}</button><a href={url(p._id)} target="_blank" rel="noreferrer" className={action}><ExternalLink size={13} />Открыть страницу</a></div>
          </div>;
        })}</div>}
        {showForm && <form onSubmit={create} className="mt-5 space-y-4 border-t border-[#333] pt-5">
          <h3 className="text-sm font-medium">Новый набор комментариев</h3>
          <label className="block text-sm">Тематика<select required value={theme} onChange={e => { const next = themes.find(t => t.id === e.target.value); setTheme(e.target.value); setCount(current => Math.min(Number(current) || 1, next?.available || 1)); }} className="block w-full mt-2 bg-[#222] border border-[#333] rounded-lg p-3">{themes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          <label className="block text-sm">Количество комментариев<input required type="number" min="1" max={selected?.available || 1} step="1" value={count} onChange={e => setCount(e.target.value)} className="block w-full mt-2 bg-[#222] border border-[#333] rounded-lg p-3" /></label>
          <p className="text-xs text-gray-500">Доступно вариантов: {selected?.available ?? '…'}. Для каждой ссылки создаётся отдельный случайный набор. Внутри ссылки варианты не повторяются.</p>
          <button disabled={busy || deleting || !theme} className="w-full bg-[#f4623a] text-black font-medium rounded-lg p-3 disabled:opacity-50">{busy ? 'Создаём…' : 'Создать страницу'}</button>
        </form>}
      </>}
        </div> : <div role="tabpanel" id={'comment-panel-' + tab} aria-labelledby={'comment-tab-' + tab}>
          <div className="flex justify-between items-center gap-3"><div><h3 className="text-sm font-semibold">{tab === 'pending' ? 'Комментарии в ожидании выдачи' : 'Выданные комментарии'}</h3><p className="mt-1 text-[11px] text-gray-500">{tab === 'pending' ? 'Замените неподходящие варианты до того, как их заберут.' : 'Выполнено — комментарий получен. Публикация под видео не проверяется.'}</p></div><button onClick={refresh} disabled={refreshing || deleting} title="Обновить список" aria-label="Обновить список" className="shrink-0 rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white disabled:opacity-40"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /></button></div>
          {pages.length > 1 && <select aria-label="Набор комментариев" value={activePage?._id || ''} onChange={e => setSelectedPageId(e.target.value)} className="mt-4 w-full rounded-lg border border-[#333] bg-[#222] p-2.5 text-xs">{pages.map((p, i) => <option key={p._id} value={p._id}>Набор {pages.length - i} · {p.themeLabel}</option>)}</select>}
          <div className="comment-pending-scroll mt-4 max-h-[45vh] overflow-y-auto pr-1">
          {loading ? <p className="text-xs text-gray-500 py-8 text-center">Загрузка…</p> : !activePage ? <p className="text-xs text-gray-500 py-8 text-center">Сначала создайте набор во вкладке «Прогресс».</p> : tab === 'pending' ? <>
            {!activePage.pending?.length ? <p className="text-xs text-gray-500 py-8 text-center">Все комментарии этого набора уже получили.</p> : <ol className="space-y-2.5">{activePage.pending.map((comment, index) => {
              const key = activePage._id + ':' + JSON.stringify(comment);
              return <li key={key} className="rounded-xl bg-[#1a1a1a] border border-white/[0.06] p-3.5 hover:border-[#f4623a]/25 transition-colors"><div className="flex justify-between items-start gap-3"><p className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0"><span className="text-gray-600 text-[10px] font-mono mr-2">{index + 1}.</span>{comment.text}</p><button disabled={!!replacing || deleting} onClick={() => replace(activePage._id, comment)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[#f4623a]/15 bg-[#f4623a]/5 px-2 py-1.5 text-[10px] text-[#ff986f] hover:bg-[#f4623a]/15 disabled:opacity-50"><RefreshCw size={12} className={replacing === key ? 'animate-spin' : ''} />{replacing === key ? 'Меняем…' : 'Заменить'}</button></div>{comment.tags?.length > 0 && <p className="mt-2 text-[11px] text-gray-400 break-words">{comment.tags.join(' · ')}</p>}</li>;
            })}</ol>}
          </> : <>
            {!activePage.completed?.length ? <p className="text-xs text-gray-500 py-8 text-center">Пока никто не получил комментарий.</p> : <ol className="space-y-2.5">{[...activePage.completed].reverse().map((claim, index) => <li key={index} className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-3.5"><div className="flex items-center justify-between gap-2 mb-2"><span className="inline-flex items-center gap-1.5 text-[10px] text-green-400"><CheckCheck size={12} />Получен</span><time dateTime={claim.issuedAt} className="text-[10px] text-gray-500">{new Date(claim.issuedAt).toLocaleString('ru-RU')}</time></div><p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{claim.comment.text}</p>{claim.comment.tags?.length > 0 && <p className="mt-2 text-[11px] text-gray-400 break-words">{claim.comment.tags.join(' · ')}</p>}</li>)}</ol>}
          </>}
          </div>
        </div>}
        {error && <p role="alert" className="text-red-400 mt-3 text-sm">{error}</p>}
      </div>
    </section>
  </div>;
}
