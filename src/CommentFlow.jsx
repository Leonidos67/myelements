import { Fragment, useState } from 'react';
import { GitBranch, MessageSquare, User, Video } from 'lucide-react';

export default function CommentFlow({ page, video, videos, themes, onCreateBranch }) {
  const [activeNode, setActiveNode] = useState('user');
  const [editing, setEditing] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [themeId, setThemeId] = useState(themes[0]?.id || '');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linked = Boolean(page?.branchId || page?.parentId);
  const options = videos.filter(item => item._id !== video._id);
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
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
        <label className="min-w-0 text-xs text-muted">Второе видео
          <select required disabled={busy} value={videoId} onChange={event => setVideoId(event.target.value)} className={input}>
            <option value="">Выберите видео</option>
            {options.map(item => <option key={item._id} value={item._id}>{item.shortId ? '#' + item.shortId + ' · ' : ''}{item.title || item.url}</option>)}
          </select>
        </label>
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
      <button disabled={busy || !videoId} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">
        {busy ? 'Создаём…' : 'Создать ветку'}
      </button>
    </form>}
  </section>;
}
