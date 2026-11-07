import { Fragment, useEffect, useState } from 'react';
import { GitBranch, MessageSquare, Search, User, Video } from 'lucide-react';

const viewFormat = new Intl.NumberFormat('ru-RU');

function matchesVideo(item, query) {
  if (!query) return true;
  const searchable = [item.shortId && '#' + item.shortId, item._id, item.title, item.url, item.account?.name];
  if (searchable.some(value => String(value ?? '').toLowerCase().includes(query))) return true;
  const groupedNumber = /^\d{1,3}(?:[\s,.]\d{3})+$/;
  const digits = groupedNumber.test(query) ? query.replace(/\D/g, '') : query;
  return /^\d+$/.test(digits) && String(item.views ?? 0).includes(digits);
}

import { api } from './api';

export default function CommentFlow({ page, group, videos, themes, onCreateBranch }) {
  const [activeNode, setActiveNode] = useState('user');
  const [editing, setEditing] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [themeId, setThemeId] = useState(themes[0]?.id || '');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [availableSets, setAvailableSets] = useState([]);
  const [existingPageId, setExistingPageId] = useState('');
  const [loadedVideoId, setLoadedVideoId] = useState('');
  const [setsError, setSetsError] = useState('');
  const linked = group.length > 1;
  const usedVideos = new Set(group.map(item => item.video));
  const options = videos.filter(item => !usedVideos.has(item._id));

  useEffect(() => {
    if (!editing || !videoId) return;
    let active = true;
    setSetsError('');
    api.commentPages(videoId, true).then(pages => {
      if (!active) return;
      const rootsWithBranches = new Set(pages.map(item => item.parentId).filter(Boolean));
      const sets = pages.filter(item => item.video === videoId && !item.parentId && !rootsWithBranches.has(item._id));
      setAvailableSets(sets);
      setExistingPageId(sets[0]?._id || '');
      setLoadedVideoId(videoId);
    }).catch(error => { if (active) setSetsError(error.message); });
    return () => { active = false; };
  }, [editing, videoId]);
  const chosenVideo = options.find(item => item._id === videoId);
  const matchingVideos = editing ? options.filter(item => matchesVideo(item, videoSearch.trim().toLowerCase())) : [];
  const theme = themes.find(item => item.id === themeId) || themes[0];
  const nodes = [
    { id: 'user', icon: User, label: 'Пользователь', detail: 'Открывает ссылку и нажимает кнопку выдачи.' },
    ...(group.length ? group : [{ _id: 'empty' }]).map((item, index) => ({
      id: item._id, icon: MessageSquare, label: linked ? 'Комментарий ' + (index + 1) : 'Комментарий',
      detail: videos.find(video => video._id === item.video)?.title || item.videoTitle || 'Один текст из набора для этого видео.',
    })),
    { id: 'video', icon: Video, label: linked ? 'Видео ×' + group.length : 'Видео', detail: linked ? 'У каждого текста своя ссылка на видео.' : 'Открывает видео по ссылке на странице выдачи.' },
  ];
  const selected = nodes.find(node => node.id === activeNode) || nodes[0];
  const input = 'mt-1 block w-full rounded-lg border border-line bg-inset px-3 py-2 text-sm';

  async function submit(event) {
    event.preventDefault();
    if (!chosenVideo || busy || loadedVideoId !== videoId || setsError) return;
    setBusy(true);
    setError('');
    try {
      const data = existingPageId ? { videoId, existingPageId } : { videoId, theme: theme.id, count: Number(count) };
      const branch = await onCreateBranch(page._id, data);
      setEditing(false);
      setActiveNode(branch.branchId);
      setVideoId('');
      setLoadedVideoId('');
      setVideoSearch('');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="mb-5 rounded-xl border border-line bg-surface p-4 sm:p-5" aria-label="Схема выдачи">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">Схема выдачи</h3>
      <button type="button" disabled={!page || !options.length || !themes.length || busy}
        title={!page ? 'Сначала создайте первый набор' : !options.length ? 'Добавьте второе видео' : undefined}
        aria-expanded={editing} onClick={() => {
          if (!editing) setCount(Math.max(1, Math.min(page.remaining, theme.available)));
          setEditing(value => !value);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs hover:bg-elevated disabled:opacity-40">
        <GitBranch size={14} />{editing ? 'Отмена' : 'Создать ветку'}
      </button>
      {linked && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">Одна ссылка · видео: {group.length}</span>}
    </div>
    <div className="overflow-x-auto"><div className="comment-flow-diagram" style={{ minWidth: nodes.length > 4 ? nodes.length * 70 : undefined }} aria-label="Шаги выдачи">
      {nodes.map(({ id, icon: Icon, label }, index) => <Fragment key={id}>
        {index > 0 && <span className="comment-flow-beam" aria-hidden="true" />}
        <button type="button" className="comment-flow-node" aria-pressed={selected.id === id} onClick={() => setActiveNode(id)}>
          <span className="comment-flow-icon"><Icon size={18} aria-hidden="true" /></span>
          {label}
        </button>
      </Fragment>)}
    </div>
    </div>
    <p className="text-center text-xs text-muted" aria-live="polite">{selected.detail}</p>
    {editing && <form onSubmit={submit} className="mt-4 border-t border-line pt-4">
      <fieldset className="mb-4 min-w-0" disabled={busy}>
        <legend className="text-xs text-muted">Видео для ветки</legend>
        <label className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-inset px-3">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <input type="search" aria-label="Найти видео для ветки" placeholder="Просмотры, #ID, название, ссылка или аккаунт"
            value={videoSearch} onChange={event => setVideoSearch(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        </label>
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-line">
          {matchingVideos.length === 0 ? <p className="px-3 py-4 text-xs text-muted">Видео не найдены.</p> :
            matchingVideos.map(item => <label key={item._id} className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 hover:bg-elevated has-checked:bg-inset">
              <input type="radio" name="branch-video" checked={item._id === videoId} onChange={() => { setLoadedVideoId(''); setVideoId(item._id); }} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" title={item.title || item.url}>{item.title || item.url}</span>
                <span className="block truncate text-xs text-muted">
                  {[item.shortId && '#' + item.shortId, viewFormat.format(item.views ?? 0) + ' просм.', item.account?.name].filter(Boolean).join(' · ')}
                </span>
              </span>
            </label>)}
        </div>
        {chosenVideo && <p className="mt-2 truncate text-xs text-muted" title={chosenVideo.title || chosenVideo.url}>
          Выбрано {chosenVideo.shortId && '#' + chosenVideo.shortId + ' · '}{chosenVideo.title || chosenVideo.url}
        </p>}
      </fieldset>
      {videoId && loadedVideoId !== videoId && !setsError && <p className="text-xs text-muted">Загружаем наборы…</p>}
      {setsError && <p role="alert" className="text-xs text-red-400">{setsError}</p>}
      {videoId && loadedVideoId === videoId && availableSets.length > 0 && <label className="mb-3 block text-xs text-muted">Набор комментариев
        <select value={existingPageId} onChange={event => setExistingPageId(event.target.value)} disabled={busy} className={input}>
          {availableSets.map((item, index) => <option key={item._id} value={item._id}>
            {item.themeLabel} · набор {index + 1} · в очереди {item.remaining}
          </option>)}
          <option value="">Создать новый набор</option>
        </select>
      </label>}
      {videoId && loadedVideoId === videoId && !existingPageId && <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="min-w-0 text-xs text-muted">Тематика
          <select required disabled={busy} value={theme?.id || ''} onChange={event => {
            const next = themes.find(item => item.id === event.target.value);
            setThemeId(next.id);
            setCount(value => Math.min(Number(value) || 1, next.available));
          }} className={input}>
            {themes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Количество
          <input required disabled={busy} type="number" min="1" max={theme?.available} value={count} onChange={event => setCount(event.target.value)} className={input} />
        </label>
      </div>}
      {existingPageId && loadedVideoId === videoId && <p className="mt-3 text-xs text-muted">Подключим существующий набор с его очередью и историей.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      <button disabled={busy || !chosenVideo || loadedVideoId !== videoId || Boolean(setsError)} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
        {busy ? 'Создаём…' : 'Создать ветку'}
      </button>
    </form>}
  </section>;
}
