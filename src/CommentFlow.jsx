import { Fragment, useState } from 'react';
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

export default function CommentFlow({ page, video, videos, themes, onCreateBranch }) {
  const [activeNode, setActiveNode] = useState('user');
  const [editing, setEditing] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [themeId, setThemeId] = useState(themes[0]?.id || '');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linked = Boolean(page?.branchId || page?.parentId);
  const options = videos.filter(item => item._id !== video._id);
  const chosenVideo = options.find(item => item._id === videoId);
  const matchingVideos = editing ? options.filter(item => matchesVideo(item, videoSearch.trim().toLowerCase())) : [];
  const theme = themes.find(item => item.id === themeId) || themes[0];
  const nodes = [
    { id: 'user', icon: User, label: 'Пользователь', detail: 'Открывает ссылку и нажимает кнопку выдачи.' },
    { id: 'comment', icon: MessageSquare, label: linked ? 'Комментарий 1' : 'Комментарий', detail: linked ? 'Текст для первого видео.' : 'Получает один текст из набора.' },
    ...(linked ? [{ id: 'branch', icon: GitBranch, label: 'Комментарий 2', detail: 'Второй текст выдаётся одновременно с первым.' }] : []),
    { id: 'video', icon: Video, label: linked ? 'Видео ×2' : 'Видео', detail: linked ? 'У каждого текста своя ссылка на видео.' : 'Открывает видео по ссылке на странице выдачи.' },
  ];
  const selected = nodes.find(node => node.id === activeNode) || nodes[0];
  const input = 'mt-1 block w-full rounded-lg border border-line bg-inset px-3 py-2 text-sm';

  async function submit(event) {
    event.preventDefault();
    if (!chosenVideo || busy) return;
    setBusy(true);
    setError('');
    try {
      await onCreateBranch(page._id, { videoId, theme: theme.id, count: Number(count) });
      setEditing(false);
      setActiveNode('branch');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="mb-5 rounded-xl border border-line bg-surface p-4 sm:p-5" aria-label="Схема выдачи">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">Схема выдачи</h3>
      {!linked && <button type="button" disabled={!page || !options.length || !themes.length || busy}
        title={!page ? 'Сначала создайте первый набор' : !options.length ? 'Добавьте второе видео' : undefined}
        aria-expanded={editing} onClick={() => {
          if (!editing) setCount(Math.max(1, Math.min(page.remaining, theme.available)));
          setEditing(value => !value);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs hover:bg-elevated disabled:opacity-40">
        <GitBranch size={14} />{editing ? 'Отмена' : 'Создать ветку'}
      </button>}
      {linked && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">Одна ссылка · два видео</span>}
    </div>
    <div className="comment-flow-diagram" aria-label="Шаги выдачи">
      {nodes.map(({ id, icon: Icon, label }, index) => <Fragment key={id}>
        {index > 0 && <span className="comment-flow-beam" aria-hidden="true" />}
        <button type="button" className="comment-flow-node" aria-pressed={selected.id === id} onClick={() => setActiveNode(id)}>
          <span className="comment-flow-icon"><Icon size={18} aria-hidden="true" /></span>
          {label}
        </button>
      </Fragment>)}
    </div>
    <p className="text-center text-xs text-muted" aria-live="polite">{selected.detail}</p>
    {editing && !linked && <form onSubmit={submit} className="mt-4 border-t border-line pt-4">
      <fieldset className="mb-4 min-w-0" disabled={busy}>
        <legend className="text-xs text-muted">Второе видео</legend>
        <label className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-inset px-3">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <input type="search" aria-label="Найти второе видео" placeholder="Просмотры, #ID, название, ссылка или аккаунт"
            value={videoSearch} onChange={event => setVideoSearch(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        </label>
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-line">
          {matchingVideos.length === 0 ? <p className="px-3 py-4 text-xs text-muted">Видео не найдены.</p> :
            matchingVideos.map(item => <label key={item._id} className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 hover:bg-elevated has-checked:bg-inset">
              <input type="radio" name="branch-video" checked={item._id === videoId} onChange={() => setVideoId(item._id)} className="shrink-0" />
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
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
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
      </div>
      <p className="mt-3 text-xs text-muted">Текущая ссылка станет общей. Доступно пар: {Math.min(page.remaining, Number(count) || 0)}.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      <button disabled={busy || !chosenVideo} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
        {busy ? 'Создаём…' : 'Создать ветку'}
      </button>
    </form>}
  </section>;
}
