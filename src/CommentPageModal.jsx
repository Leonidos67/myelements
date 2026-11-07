import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, RefreshCw, Plus, MessageSquare, ShieldCheck, Trash2, ChartNoAxesCombined, CheckCheck, ClipboardCheck, RotateCcw, Search } from 'lucide-react';
import { api } from './api';
import CommentQueueTimer from './CommentQueueTimer';
import CommentFlow from './CommentFlow';

export default function CommentPageModal({ video, videos, onClose, onChange }) {
  const [tab, setTab] = useState('progress');
  const [searchByTab, setSearchByTab] = useState({});
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [customError, setCustomError] = useState('');
  const [customPageId, setCustomPageId] = useState('');
  async function addCustom(event) {
    event.preventDefault();
    if (adding) return;
    const tags = customTags.split(/\r?\n/).map(tag => tag.trim()).filter(Boolean);
    setCustomError('');
    setAdding(true);
    try {
      const comment = { text: customText.trim(), tags };
      if (activePage) {
        await api.addCustomComment(customTarget._id, comment);
        await refresh();
      } else {
        const page = await api.createCommentPage({ videoId: video._id, comment });
        setPages(rows => [{ ...page, video: video._id }, ...rows.filter(row => row._id !== page._id)]);
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
  const ownPages = pages.filter(page => !page.video || page.video === video._id);
  const activePage = ownPages.find(page => page._id === selectedPageId) || ownPages[0];
  const groupId = activePage?.parentId || activePage?._id;
  const group = groupId ? pages.filter(page => (page.parentId || page._id) === groupId)
    .sort((a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId))) : [];
  const customTarget = group.find(page => page._id === customPageId) || activePage;
  const videoById = new Map(videos.map(item => [item._id, item]));
  const labelFor = page => {
    const item = videoById.get(page.video);
    return [item?.shortId && '#' + item.shortId, item?.title || item?.url || page.videoTitle || page.themeLabel].filter(Boolean).join(' · ');
  };
  useEffect(() => { setSelectedReviews(new Set()); }, [activePage?._id]);
  useEffect(() => {
    let active = true;
    Promise.all([api.commentThemes(), api.commentPages(video._id, true)]).then(([t, p]) => {
      if (!active) return;
      setThemes(t); setTheme(t[0]?.id || ''); setPages(p); setShowForm(p.length === 0);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    const escape = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escape);
    return () => { active = false; document.removeEventListener('keydown', escape); };
  }, [video._id]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) api.commentPages(video._id, true).then(setPages).catch(() => {});
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
  const pendingRows = group.flatMap(page => (page.pending || []).map((comment, index) => ({ page, comment, index })));
  const reviewedRows = group.flatMap(page => (page.reviews || [])
    .filter(claim => Boolean(claim.confirmedAt) === (tab === 'completed'))
    .map(claim => ({ ...claim, page, key: page._id + ':' + claim.index })))
    .sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
  async function refresh() {
    setRefreshing(true); setError('');
    try {
      const [t, p] = await Promise.all([api.commentThemes(), api.commentPages(video._id, true)]);
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
      setPages(p => [{ ...page, video: video._id }, ...p]); setSelectedPageId(page._id); setShowForm(false); onChange?.();
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
      setPages(await api.commentPages(video._id, true));
    } catch (e) {
      setError(e.message);
      try { setPages(await api.commentPages(video._id, true)); } catch {}
    } finally { setReplacing(''); }
  }
  async function removePending(pageId, comment) {
    if (!window.confirm('Удалить этот комментарий из очереди выдачи?')) return;
    setRemoving(pageId + ':' + JSON.stringify(comment)); setError('');
    try { await api.deletePendingComment(pageId, comment); setPages(await api.commentPages(video._id, true)); onChange?.(); }
    catch (e) { setError(e.message); try { setPages(await api.commentPages(video._id, true)); onChange?.(); } catch {} }
    finally { setRemoving(''); }
  }
  async function review(claim, decision) {
    if (decision === 'requeue' && !window.confirm('Вернуть комментарий в очередь? Его сможет получить другой посетитель.')) return;
    if (decision === 'delete' && !window.confirm('Удалить комментарий из выполненных и из набора?')) return;
    setReviewing(true);
    setError('');
    try {
      await api.reviewComment(claim.page._id, claim.index, decision);
      setSelectedReviews(previous => new Set([...previous].filter(key => key !== claim.key)));
      await refresh();
    } catch (error) {
      try { setPages(await api.commentPages(video._id, true)); onChange?.(); } catch {}
      setError(error.message);
    } finally {
      setReviewing(false);
    }
  }
  const search = searchByTab[tab] || '';
  const query = search.trim().toLowerCase();
  const matchesSearch = ({ page, comment }) => {
    if (!query) return true;
    const item = videoById.get(page.video);
    return [comment.text, ...(comment.tags || []), labelFor(page), item?.url]
      .some(value => value?.toLowerCase().includes(query));
  };
  const visiblePending = tab === 'pending' ? pendingRows.filter(matchesSearch) : [];
  const visibleReviewed = reviewedRows.filter(matchesSearch);
  const reviewRows = tab === 'review' ? visibleReviewed : [];
  const resultCount = tab === 'pending' ? visiblePending.length : visibleReviewed.length;
  const selectedRows = reviewRows.filter(claim => selectedReviews.has(claim.key));
  const allSelected = reviewRows.length > 0 && selectedRows.length === reviewRows.length;

  function toggleReview(key) {
    setSelectedReviews(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function confirmReviews(rows) {
    const byPage = new Map();
    for (const claim of rows) {
      if (!byPage.has(claim.page._id)) byPage.set(claim.page._id, []);
      byPage.get(claim.page._id).push(claim.index);
    }
    setReviewing(true);
    setError('');
    try {
      const results = await Promise.allSettled([...byPage].map(([id, indexes]) => api.confirmComments(id, indexes)));
      setSelectedReviews(new Set());
      await refresh();
      const failed = results.find(result => result.status === 'rejected');
      if (failed) setError(failed.reason.message);
    } finally {
      setReviewing(false);
    }
  }

  async function copy(id) {
    try { await navigator.clipboard.writeText(url(id)); setCopied(id); }
    catch { setError('Не удалось скопировать ссылку автоматически. Скопируйте её из поля.'); }
  }
  const action = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-foreground hover:bg-elevated disabled:opacity-50';
  const groupConfirmed = group.reduce((sum, page) => sum + (page.confirmed || 0), 0);
  const groupReviewCount = group.reduce((sum, page) => sum + page.issued - (page.confirmed || 0), 0);
  const tabs = [
    { id: 'progress', label: 'Прогресс', icon: ChartNoAxesCombined },
    { id: 'pending', label: 'Ещё не получили', icon: MessageSquare, count: pendingRows.length },
    { id: 'review', label: 'На проверке', icon: ClipboardCheck, count: groupReviewCount },
    { id: 'completed', label: 'Выполненные', icon: CheckCheck, count: groupConfirmed },
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
        {activePage && <>{ownPages.length > 1 && <select aria-label="Выбранный набор" value={activePage._id} onChange={e => setSelectedPageId(e.target.value)} className="mb-3 w-full rounded-lg border border-line bg-elevated p-2.5 text-xs">{ownPages.map((p, i) => <option key={p._id} value={p._id}>Набор {ownPages.length - i} · {p.themeLabel}</option>)}</select>}{tab === 'progress' && <CommentQueueTimer page={activePage} onReset={refresh} />}</>}
        {!loading && (tab === 'pending' || tab === 'progress') && <div className="mb-5">
          <button type="button" disabled={adding} aria-expanded={showCustom}
            onClick={() => { setShowCustom(open => !open); setCustomError(''); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
            <Plus size={13} />{showCustom ? 'Скрыть форму' : 'Добавить свой комментарий'}
          </button>
          {showCustom && <form onSubmit={addCustom} className="mt-3 space-y-3 rounded-xl border border-line p-4">
            {group.length > 1 && <label className="block text-xs text-muted">Для какого видео
              <select value={customTarget._id} onChange={event => setCustomPageId(event.target.value)} disabled={adding}
                className="mt-2 block w-full rounded-lg border border-line bg-inset p-3 text-sm text-foreground">
                {group.map(page => <option key={page._id} value={page._id}>{labelFor(page)}</option>)}
              </select>
            </label>}
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
            {(p.branchId || p.parentId) && <p className="mb-2 truncate text-xs text-muted" title={labelFor(p)}>{labelFor(p)}</p>}
            <div className="flex justify-between items-start gap-3"><p className="text-sm">{p.themeLabel}{(p.branchId || p.parentId) && <span className="ml-2 text-xs text-muted">· Общая ссылка</span>}</p><span className={`text-[10px] px-2 py-1 rounded whitespace-nowrap ${done === p.total ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-foreground'}`}>{done === p.total ? 'Завершено' : 'В процессе'}</span></div>
            <p className="text-xs text-muted mt-2">Подтверждено {done} из {p.total} · На проверке {p.issued - done} · В очереди {p.remaining}</p>
            <div className="h-1.5 mt-2 mb-4 rounded-full bg-elevated overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div>
            <input aria-label="Ссылка на страницу комментариев" readOnly value={url(p.parentId || p._id)} onFocus={e => e.target.select()} className="w-full bg-inset p-2.5 rounded-lg text-xs border border-line" />
            <div className="flex flex-wrap gap-2 mt-3"><button onClick={() => copy(p.parentId || p._id)} className={action}><Copy size={13} />{copied === (p.parentId || p._id) ? 'Скопировано' : 'Копировать ссылку'}</button><a href={url(p.parentId || p._id)} target="_blank" rel="noreferrer" className={action}><ExternalLink size={13} />Открыть страницу</a></div>
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
          {!loading && activePage && <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-inset px-3 focus-within:border-foreground/40">
              <Search size={15} aria-hidden="true" className="shrink-0 text-muted" />
              <input type="search" aria-label="Поиск комментариев" value={search}
                onChange={event => {
                  const value = event.target.value;
                  setSearchByTab(previous => ({ ...previous, [tab]: value }));
                }}
                placeholder="Текст, дополнения или видео"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
            </label>
            {query && <span role="status" className="shrink-0 text-xs text-muted">
              Найдено {resultCount} из {tab === 'pending' ? pendingRows.length : reviewedRows.length}
            </span>}
          </div>}
          {reviewRows.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-auto text-xs text-muted">Выбрано {selectedRows.length} из {reviewRows.length}</span>
            <button type="button" className={action} disabled={!selectedRows.length || reviewing || deleting}
              onClick={() => confirmReviews(selectedRows)}>
              Подтвердить выбранные{selectedRows.length > 0 ? ' (' + selectedRows.length + ')' : ''}
            </button>
            <button type="button" className={action} disabled={reviewing || deleting}
              onClick={() => confirmReviews(reviewRows)}>
              <CheckCheck size={14} />{query ? 'Подтвердить все найденные' : 'Подтвердить все'}
            </button>
          </div>}
          <div className="comments-list mt-4 pr-1">
          {loading ? <p className="text-xs text-subtle py-8 text-center">Загрузка…</p> : !activePage ? <p className="text-xs text-subtle py-8 text-center">Добавьте свой комментарий или создайте набор во вкладке «Прогресс».</p> : query && resultCount === 0 ? <p className="py-8 text-center text-xs text-subtle">По этому запросу ничего не найдено.</p> : tab === 'pending' ? <>
            {!visiblePending.length ? <p className="text-xs text-subtle py-8 text-center">В этом наборе нет комментариев в ожидании выдачи.</p> : <ol className="space-y-2.5">{visiblePending.map(({ page, comment, index }) => {
              const key = page._id + ':' + JSON.stringify(comment);
              return <li key={key} className="rounded-xl bg-elevated border border-line p-3.5 hover:border-foreground/25 transition-colors"><div className="flex justify-between items-start gap-3"><p className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0"><span className="text-subtle text-[10px] font-mono mr-2">{index + 1}.</span>{comment.text}{group.length > 1 && <span className="mt-1 block break-all text-xs text-muted">{labelFor(page)}</span>}</p><div className="shrink-0 flex flex-wrap justify-end gap-1.5">{page.theme !== 'custom' && <button disabled={!!replacing || !!removing || deleting} onClick={() => replace(page._id, comment)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 bg-primary/5 px-2 py-1.5 text-[10px] text-foreground hover:bg-primary/15 disabled:opacity-50"><RefreshCw size={12} className={replacing === key ? 'animate-spin' : ''} />{replacing === key ? 'Меняем…' : 'Заменить'}</button>}<button disabled={!!replacing || !!removing || deleting} onClick={() => removePending(page._id, comment)} title="Удалить комментарий" aria-label="Удалить комментарий из очереди" className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-400/10 disabled:opacity-50"><Trash2 size={12}/>{removing === key ? 'Удаляем…' : 'Удалить'}</button></div></div>{comment.tags?.length > 0 && <p className="mt-2 text-[11px] text-muted break-words">{comment.tags.join(' · ')}</p>}</li>;
            })}</ol>}
          </> : <>
            {!visibleReviewed.length ? <p className="px-2 py-8 text-center text-xs text-subtle">
              {tab === 'review' ? 'Нет комментариев на проверке.' : 'Пока нет подтверждённых комментариев.'}
            </p> : tab === 'review' ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] table-fixed text-left text-sm" aria-label="Комментарии на проверке">
                  <thead className="border-b border-line bg-elevated text-xs text-muted">
                    <tr>
                      <th scope="col" className="w-12 px-4 py-3">
                        <input type="checkbox" aria-label={query ? 'Выбрать все найденные комментарии' : 'Выбрать все комментарии'} checked={allSelected}
                          disabled={reviewing || deleting}
                          ref={input => { if (input) input.indeterminate = !allSelected && selectedRows.length > 0; }}
                          onChange={() => setSelectedReviews(new Set(allSelected ? [] : reviewRows.map(claim => claim.key)))} />
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">Комментарий</th>
                      <th scope="col" className="w-32 px-3 py-3 font-medium">Получен</th>
                      <th scope="col" className="w-44 px-3 py-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visibleReviewed.map(claim => {
                      const checked = selectedReviews.has(claim.key);
                      return <tr key={claim.key} className={checked ? 'bg-inset' : 'hover:bg-elevated'}>
                        <td className="px-4 py-3 align-top">
                          <input type="checkbox" checked={checked} disabled={reviewing || deleting}
                            onChange={() => toggleReview(claim.key)} aria-label={'Выбрать комментарий ' + (claim.index + 1)} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          {group.length > 1 && <p className="mb-1 truncate text-xs text-muted" title={labelFor(claim.page)}>{labelFor(claim.page)}</p>}
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed">{claim.comment.text}</p>
                          {claim.comment.tags?.length > 0 && <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">{claim.comment.tags.join(' · ')}</p>}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-subtle">
                          <time dateTime={claim.issuedAt}>{new Date(claim.issuedAt).toLocaleString('ru-RU')}</time>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button" disabled={reviewing || deleting} onClick={() => review(claim, 'confirm')} className={action}>
                              <CheckCheck size={14} />Подтвердить
                            </button>
                            <button type="button" disabled={reviewing || deleting} onClick={() => review(claim, 'rollback')} className={action}>
                              <RotateCcw size={14} />Откатить
                            </button>
                          </div>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : <ol className="space-y-2.5">
              {visibleReviewed.map(claim => <li key={claim.key} className="rounded-xl border border-line bg-elevated p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-green-400">Подтверждён</span>
                  <time dateTime={claim.confirmedAt} className="text-xs text-subtle">{new Date(claim.confirmedAt).toLocaleString('ru-RU')}</time>
                </div>
                {group.length > 1 && <p className="mb-1 truncate text-xs text-muted" title={labelFor(claim.page)}>{labelFor(claim.page)}</p>}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{claim.comment.text}</p>
                {claim.comment.tags?.length > 0 && <p className="mt-2 break-words text-xs text-muted">{claim.comment.tags.join(' · ')}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={reviewing || deleting} onClick={() => review(claim, 'reopen')} className={action}>
                    <ClipboardCheck size={14} />На проверку
                  </button>
                  <button type="button" disabled={reviewing || deleting} onClick={() => review(claim, 'requeue')} className={action}>
                    <RotateCcw size={14} />В очередь выдачи
                  </button>
                  <button type="button" disabled={reviewing || deleting} onClick={() => review(claim, 'delete')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50">
                    <Trash2 size={14} />Удалить
                  </button>
                </div>
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
