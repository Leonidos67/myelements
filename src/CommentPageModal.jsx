import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, RefreshCw, Plus, MessageSquare, ShieldCheck, Trash2, ChartNoAxesCombined, CheckCheck, ClipboardCheck, RotateCcw } from 'lucide-react';
import { api } from './api';
import CommentQueueTimer from './CommentQueueTimer';
import CommentFlow from './CommentFlow';

export default function CommentPageModal({ video, videos, onClose, onChange }) {
  const [tab, setTab] = useState('progress');
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [customError, setCustomError] = useState('');
  async function addCustom(event) {
    event.preventDefault();
    if (adding) return;
    const tags = customTags.split(/\r?\n/).map(tag => tag.trim()).filter(Boolean);
    setCustomError('');
    setAdding(true);
    try {
      const comment = { text: customText.trim(), tags };
      if (activePage) {
        await api.addCustomComment(activePage._id, comment);
        await refresh();
      } else {
        const page = await api.createCommentPage({ videoId: video._id, comment });
        setPages(rows => [page, ...rows.filter(row => row._id !== page._id)]);
        setSelectedPageId(page._id);
        setShowForm(false);
        setTab('progress');
        onChange?.();
      }
      setCustomText('');
      setCustomTags('');
      setShowCustom(false);
    } catch (error) {
      setCustomError(error.message);
    } finally {
      setAdding(false);
    }
  }
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
  const [removing, setRemoving] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState(() => new Set());
  const [selectedPageId, setSelectedPageId] = useState('');
  const activePage = pages.find(p => p._id === selectedPageId) || pages[0];
  useEffect(() => { setSelectedReviews(new Set()); }, [activePage?._id]);
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
  const confirmed = pages.reduce((sum, page) => sum + (page.confirmed || 0), 0);
  const waiting = total - issued;
  const percent = total ? Math.round(confirmed / total * 100) : 0;
  const reviewedRows = (activePage?.reviews || []).filter(claim => Boolean(claim.confirmedAt) === (tab === 'completed')).reverse();
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
    if (!window.confirm('Удалить задачу по комментариям для этого видео? Наборы этого видео и их ветки будут удалены. Если это второе видео в ветке, общая ссылка продолжит выдавать комментарии для первого.')) return;
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
  async function createBranch(id, data) {
    const branch = await api.createCommentBranch(id, data);
    setPages(rows => rows.map(page => page._id === id ? { ...page, branchId: branch.branchId } : page));
    await refresh();
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
  async function removePending(pageId, comment) {
    if (!window.confirm('Удалить этот комментарий из очереди выдачи?')) return;
    setRemoving(pageId + ':' + JSON.stringify(comment)); setError('');
    try { await api.deletePendingComment(pageId, comment); setPages(await api.commentPages(video._id)); onChange?.(); }
    catch (e) { setError(e.message); try { setPages(await api.commentPages(video._id)); onChange?.(); } catch {} }
    finally { setRemoving(''); }
  }
  async function review(index, decision) {
    setReviewing(true);
    setError('');
    try {
      await api.reviewComment(activePage._id, index, decision);
      await refresh();
    } catch (error) {
      try { setPages(await api.commentPages(video._id)); onChange?.(); } catch {}
      setError(error.message);
    } finally {
      setReviewing(false);
    }
  }
  const reviewIndexes = tab === 'review' ? reviewedRows.map(claim => claim.index) : [];
  const selectedIndexes = reviewIndexes.filter(index => selectedReviews.has(index));
  const allSelected = reviewIndexes.length > 0 && selectedIndexes.length === reviewIndexes.length;

  function toggleReview(index) {
    setSelectedReviews(previous => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function confirmReviews(indexes) {
    setReviewing(true);
    setError('');
    try {
      await api.confirmComments(activePage._id, indexes);
      setSelectedReviews(new Set());
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setReviewing(false);
    }
  }

  async function copy(id) {
    try { await navigator.clipboard.writeText(url(id)); setCopied(id); }
    catch { setError('Не удалось скопировать ссылку автоматически. Скопируйте её из поля.'); }
  }
  const action = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-foreground hover:bg-elevated disabled:opacity-50';
  const tabs = [
    { id: 'progress', label: 'Прогресс', icon: ChartNoAxesCombined },
    { id: 'pending', label: 'Ещё не получили', icon: MessageSquare, count: waiting },
    { id: 'review', label: 'На проверке', icon: ClipboardCheck, count: issued - confirmed },
    { id: 'completed', label: 'Выполненные', icon: CheckCheck, count: confirmed },
  ];
  return <div className="comments-backdrop modal-backdrop fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="comment-modal-title" className="comments-dialog w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-foreground shadow-2xl" onClick={e => e.stopPropagation()}>
      <aside className="comments-sidebar">
        <div className="comments-sidebar-title">Комментарии</div>
        <div role="tablist" aria-orientation="vertical" aria-label="Разделы задачи" className="comments-tabs my-5 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-inset p-1.5">{tabs.map(({ id, label, icon: Icon, count: badge }) => <button key={id} role="tab" id={'comment-tab-' + id} aria-selected={tab === id} aria-controls={'comment-panel-' + id} onClick={() => setTab(id)} className={'flex flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] sm:text-xs font-medium transition-all ' + (tab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-subtle hover:bg-elevated hover:text-foreground')}><Icon size={14} />{label}{badge !== undefined && <span className={'rounded-md px-1.5 py-0.5 text-[9px] font-mono ' + (tab === id ? 'bg-black/10 text-primary-foreground' : 'bg-elevated text-subtle')}>{badge}</span>}</button>)}</div>
        <div className="comments-sidebar-summary"><span>Всего в наборах</span><strong>{total}</strong><span className="mt-2">Обновляется автоматически</span></div>
      </aside>
      <main className="comments-main">
      <header className="comments-content-header">
        <div className="min-w-0"><h2 id="comment-modal-title">Комментарии для видео</h2><p className="truncate" title={video.title || video.url}>{video.title || video.url}</p></div>
        <button onClick={onClose} aria-label="Закрыть" className="comments-close"><X size={20}/></button>
      </header>
      <div className="comments-body comment-pending-scroll min-h-0 overflow-y-auto p-6 sm:p-6">
        {activePage && <>{pages.length > 1 && <select aria-label="Выбранный набор" value={activePage._id} onChange={e => setSelectedPageId(e.target.value)} className="mb-3 w-full rounded-lg border border-line bg-elevated p-2.5 text-xs">{pages.map((p, i) => <option key={p._id} value={p._id}>Набор {pages.length - i} · {p.themeLabel}</option>)}</select>}{tab === 'progress' && <CommentQueueTimer page={activePage} onReset={refresh} />}</>}
        {!loading && (tab === 'pending' || tab === 'progress') && <div className="mb-5">
          <button type="button" disabled={adding} aria-expanded={showCustom}
            onClick={() => { setShowCustom(open => !open); setCustomError(''); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
            <Plus size={13} />{showCustom ? 'Скрыть форму' : 'Добавить свой комментарий'}
          </button>
          {showCustom && <form onSubmit={addCustom} className="mt-3 space-y-3 rounded-xl border border-line p-4">
            <label className="block text-xs text-muted">Комментарий
              <textarea required maxLength={5000} value={customText} onChange={event => setCustomText(event.target.value)}
                rows={3} className="mt-2 block w-full rounded-lg border border-line bg-inset p-3 text-sm text-foreground" />
            </label>
            <label className="block text-xs text-muted">Упоминания или стикеры, по одному на строку
              <textarea maxLength={10000} value={customTags} onChange={event => setCustomTags(event.target.value)}
                rows={2} placeholder="@gamers_ru" className="mt-2 block w-full rounded-lg border border-line bg-inset p-3 text-sm text-foreground" />
            </label>
            {customError && <p role="alert" className="text-sm text-red-400">{customError}</p>}
            <button disabled={adding || !customText.trim() || deleting || busy}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
              {adding ? 'Добавляем…' : activePage ? 'Добавить в набор' : 'Создать ссылку'}
            </button>
          </form>}
        </div>}
        {tab === 'progress' ? <div role="tabpanel" id="comment-panel-progress" aria-labelledby="comment-tab-progress">
      {loading ? <p className="mt-6 text-subtle">Загрузка…</p> : <>
        <CommentFlow key={activePage?._id || 'empty'} page={activePage} video={video} videos={videos} themes={themes} onCreateBranch={createBranch} />
        {pages.length > 0 && <div className="mt-5 rounded-xl border border-line p-4">
          <div className="flex justify-between items-center"><span className="text-sm text-muted">Общий прогресс</span><span className="font-mono text-foreground">{percent}%</span></div>
          <p className="mt-2 text-xl font-semibold">{confirmed} <span className="text-sm text-subtle font-normal">из {total} подтверждено</span></p>
          <div role="progressbar" aria-label="Подтверждено комментариев" aria-valuemin={0} aria-valuemax={total} aria-valuenow={confirmed} className="mt-3 h-2 rounded-full bg-elevated overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
          <p className="mt-3 text-xs text-subtle">Ещё не получили: {waiting} · На проверке: {issued - confirmed}</p>
        </div>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button className={action} onClick={refresh} disabled={refreshing || deleting}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Обновляем…' : 'Обновить'}</button>
          {pages.length > 0 && <button className={action} disabled={deleting || busy || !!replacing} onClick={() => setShowForm(s => !s)}><Plus size={13} />{showForm ? 'Скрыть форму' : 'Создать ещё набор'}</button>}
        </div>
        {pages.length > 0 && <button onClick={deleteTask} disabled={deleting || busy || !!replacing || refreshing} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"><Trash2 size={13} />{deleting ? 'Удаляем…' : 'Удалить задачу'}</button>}
        {pages.length > 0 && <div className="mt-5 space-y-4">{pages.map(p => {
          const done = p.confirmed || 0;
          const progress = p.total ? Math.round(done / p.total * 100) : 0;
          return <div key={p._id} className="p-4 border border-line rounded-xl">
            <div className="flex justify-between items-start gap-3"><p className="text-sm">{p.themeLabel}{(p.branchId || p.parentId) && <span className="ml-2 text-xs text-muted">· Общая ссылка</span>}</p><span className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${done === p.total ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-foreground'}`}>{done === p.total ? 'Завершено' : 'В процессе'}</span></div>
            <p className="text-xs text-muted mt-2">Подтверждено {done} из {p.total} · На проверке {p.issued - done} · В очереди {p.remaining}</p>
            <div className="h-1.5 mt-2 mb-4 rounded-full bg-elevated overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
            <input aria-label="Ссылка на страницу комментариев" readOnly value={url(p.parentId || p._id)} onFocus={e => e.target.select()} className="w-full bg-inset p-2.5 rounded-lg text-xs border border-line" />
            <div className="flex flex-wrap gap-2 mt-3"><button onClick={() => copy(p.parentId || p._id)} className={action}><Copy size={13} />{copied === (p.parentId || p._id) ? 'Скопировано' : 'Копировать ссылку'}</button><a href={url(p._id)} target="_blank" rel="noreferrer" className={action}><ExternalLink size={13} />Открыть страницу</a></div>
          </div>;
        })}</div>}
        {showForm && <form onSubmit={create} className="mt-5 space-y-4 border-t border-line pt-5">
          <h3 className="text-sm font-medium">Новый набор комментариев</h3>
          <label className="block text-sm">Тематика<select required value={theme} onChange={e => { const next = themes.find(t => t.id === e.target.value); setTheme(e.target.value); setCount(current => Math.min(Number(current) || 1, next?.available || 1)); }} className="block w-full mt-2 bg-elevated border border-line rounded-lg p-3">{themes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          <label className="block text-sm">Количество комментариев<input required type="number" min="1" max={selected?.available || 1} step="1" value={count} onChange={e => setCount(e.target.value)} className="block w-full mt-2 bg-elevated border border-line rounded-lg p-3" /></label>
          <p className="text-xs text-subtle">Доступно: {selected?.available ?? '…'}. Выдача без повторов внутри набора.</p>
          <button disabled={busy || deleting || !theme} className="w-full bg-primary text-primary-foreground font-medium rounded-lg p-3 disabled:opacity-50">{busy ? 'Создаём…' : 'Создать страницу'}</button>
        </form>}
      </>}
        </div> : <div role="tabpanel" id={'comment-panel-' + tab} aria-labelledby={'comment-tab-' + tab}>
          <div className="flex justify-between items-center gap-3"><div><h3 className="text-sm font-semibold">{tab === 'pending' ? 'В ожидании выдачи' : tab === 'review' ? 'На проверке' : 'Выполненные'}</h3><p className="mt-1 text-[11px] text-subtle">{tab === 'pending' ? 'Замените или удалите неподходящие варианты до выдачи.' : tab === 'review' ? 'Подтвердите опубликованный комментарий или верните его в очередь.' : 'Комментарии, которые вы подтвердили.'}</p></div><button onClick={refresh} disabled={refreshing || deleting} title="Обновить список" aria-label="Обновить список" className="shrink-0 rounded-lg border border-line p-2 text-muted hover:text-foreground disabled:opacity-40"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /></button></div>
          {reviewIndexes.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="mr-auto inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={allSelected} disabled={reviewing || deleting}
                ref={input => { if (input) input.indeterminate = !allSelected && selectedIndexes.length > 0; }}
                onChange={() => setSelectedReviews(new Set(allSelected ? [] : reviewIndexes))} />
              Выбрать все ({reviewIndexes.length})
            </label>
            <button type="button" className={action} disabled={!selectedIndexes.length || reviewing || deleting}
              onClick={() => confirmReviews(selectedIndexes)}>
              Подтвердить выбранные{selectedIndexes.length > 0 ? ' (' + selectedIndexes.length + ')' : ''}
            </button>
            <button type="button" className={action} disabled={reviewing || deleting}
              onClick={() => confirmReviews(reviewIndexes)}>
              <CheckCheck size={14} />Подтвердить все
            </button>
          </div>}
          <div className="comments-list mt-4 pr-1">
          {loading ? <p className="text-xs text-subtle py-8 text-center">Загрузка…</p> : !activePage ? <p className="text-xs text-subtle py-8 text-center">Добавьте свой комментарий или создайте набор во вкладке «Прогресс».</p> : tab === 'pending' ? <>
            {!activePage.pending?.length ? <p className="text-xs text-subtle py-8 text-center">В этом наборе нет комментариев в ожидании выдачи.</p> : <ol className="space-y-2.5">{activePage.pending.map((comment, index) => {
              const key = activePage._id + ':' + JSON.stringify(comment);
              return <li key={key} className="rounded-xl bg-elevated border border-line p-3.5 hover:border-foreground/25 transition-colors"><div className="flex justify-between items-start gap-3"><p className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0"><span className="text-subtle text-[10px] font-mono mr-2">{index + 1}.</span>{comment.text}</p><div className="shrink-0 flex flex-wrap justify-end gap-1.5">{activePage.theme !== 'custom' && <button disabled={!!replacing || !!removing || deleting} onClick={() => replace(activePage._id, comment)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 bg-primary/5 px-2 py-1.5 text-[10px] text-foreground hover:bg-primary/15 disabled:opacity-50"><RefreshCw size={12} className={replacing === key ? 'animate-spin' : ''} />{replacing === key ? 'Меняем…' : 'Заменить'}</button>}<button disabled={!!replacing || !!removing || deleting} onClick={() => removePending(activePage._id, comment)} title="Удалить комментарий" aria-label="Удалить комментарий из очереди" className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-400/10 disabled:opacity-50"><Trash2 size={12}/>{removing === key ? 'Удаляем…' : 'Удалить'}</button></div></div>{comment.tags?.length > 0 && <p className="mt-2 text-[11px] text-muted break-words">{comment.tags.join(' · ')}</p>}</li>;
            })}</ol>}
          </> : <>
            {!reviewedRows.length ? <p className="px-2 py-8 text-center text-xs text-subtle">
              {tab === 'review' ? 'Нет комментариев на проверке.' : 'Пока нет подтверждённых комментариев.'}
            </p> : <ol className="space-y-2.5">
              {reviewedRows.map(claim => <li key={claim.index} className="rounded-xl border border-line bg-elevated p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  {!claim.confirmedAt && <input type="checkbox" checked={selectedReviews.has(claim.index)}
                    disabled={reviewing || deleting} onChange={() => toggleReview(claim.index)}
                    aria-label={'Выбрать комментарий ' + (claim.index + 1)} />}
                  <span className={'text-xs ' + (claim.confirmedAt ? 'text-green-400' : 'text-muted')}>
                    {claim.confirmedAt ? 'Подтверждён' : 'Ожидает проверки'}
                  </span>
                  <time dateTime={claim.issuedAt} className="text-xs text-subtle">{new Date(claim.issuedAt).toLocaleString('ru-RU')}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{claim.comment.text}</p>
                {claim.comment.tags?.length > 0 && <p className="mt-2 break-words text-xs text-muted">{claim.comment.tags.join(' · ')}</p>}
                {!claim.confirmedAt && <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={reviewing || deleting} onClick={() => review(claim.index, 'confirm')} className={action}>
                    <CheckCheck size={14} />Подтвердить
                  </button>
                  <button type="button" disabled={reviewing || deleting} onClick={() => review(claim.index, 'rollback')} className={action}>
                    <RotateCcw size={14} />Откатить
                  </button>
                </div>}
              </li>)}
            </ol>}
          </>}
          </div>
        </div>}
        {error && <p role="alert" className="text-red-400 mt-3 text-sm">{error}</p>}
      </div>
      </main>
    </section>
  </div>;
}
