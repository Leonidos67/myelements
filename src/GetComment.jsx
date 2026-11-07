import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, LoaderCircle, MessageSquare } from 'lucide-react';
import { api } from './api';
import tiktokLogo from './assets/tiktok-logo.jpg';

const primaryButton = 'flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-panel hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:opacity-40';

function VideoLink({ target, label = 'Перейти к видео' }) {
  if (!/^https?:\/\//i.test(target?.videoUrl || '')) return null;
  return <a href={target.videoUrl} target="_blank" rel="noopener noreferrer" title={target.title}
    className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
    <img src={tiktokLogo} alt="TikTok" width="20" height="20" className="h-5 w-5 shrink-0 rounded object-contain" />
    {label}<ArrowUpRight size={15} />
  </a>;
}

function CommentCard({ item, number, onError }) {
  const [copied, setCopied] = useState(false);
  const tags = item.comment.tags || [];
  const mentions = tags.filter(tag => tag.trim().startsWith('@'));
  const instructions = tags.filter(tag => !tag.trim().startsWith('@'));
  const text = [item.comment.text, ...mentions].join(' ');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onError('');
    } catch {
      onError('Не удалось скопировать. Выделите текст и скопируйте вручную.');
    }
  }

  return <section className="min-w-0 rounded-2xl border border-line bg-inset p-5">
    {number && <h2 className="mb-2 text-sm font-semibold">Комментарий {number}</h2>}
    <VideoLink target={item} label={number ? 'Перейти к видео ' + number : undefined} />
    {number && item.title && <p className="mt-2 break-words text-xs text-muted">{item.title}</p>}
    <button type="button" onClick={copy} title="Нажмите, чтобы скопировать комментарий"
      aria-label={'Скопировать текст комментария' + (number ? ' ' + number : '')}
      className="mt-4 block w-full cursor-copy rounded-lg text-left text-lg leading-relaxed whitespace-pre-wrap break-words focus-visible:outline-2 focus-visible:outline-offset-4">
      {text}
    </button>
    {instructions.length > 0 && <div className="mt-4 border-t border-line pt-3">
      <p className="mb-1.5 text-xs text-subtle">Стикеры и дополнения</p>
      {instructions.map((tag, index) => <p key={index} className="break-words text-sm text-muted">{tag}</p>)}
    </div>}
    <button onClick={copy} className={primaryButton + ' mt-4'}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Скопировано' : 'Скопировать комментарий'}
    </button>
  </section>;
}

function visitorKey(id) {
  return 'comment-visitor:' + id;
}

function storedVisitor(page, id) {
  const ids = [id, page.publicId, ...(page.targets || []).map(target => target.pageId)];
  for (const candidate of new Set(ids.filter(Boolean))) {
    const visitor = localStorage.getItem(visitorKey(candidate));
    if (visitor) return visitor;
  }
  return null;
}

export default function GetComment({ id }) {
  const [page, setPage] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [hasVisitor, setHasVisitor] = useState(false);
  const updateWait = (date, serverTime) => {
    setWaitUntil(Date.now() + Math.max(0, new Date(date || 0).getTime() - new Date(serverTime || Date.now()).getTime()));
    setNow(Date.now());
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const received = items.length > 0;
  const waiting = secondsLeft > 0;
  useEffect(() => {
    if (received || !waiting) return;
    const timer = setInterval(() => {
      if (!document.hidden) api.commentPage(id).then(p => { setPage(p); updateWait(p.nextAvailableAt, p.serverTime); }).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [id, received, waiting]);
  useEffect(() => {
    api.commentPage(id).then(p => {
      setPage(p);
      updateWait(p.nextAvailableAt, p.serverTime);
      try { setHasVisitor(Boolean(storedVisitor(p, id))); } catch {}
    }).catch(e => setError(e.message));
  }, [id]);

  const targets = page?.targets || (page ? [page] : []);
  const paired = received ? items.length > 1 : targets.length > 1;
  const countdown = Math.floor(secondsLeft / 60) + ':' + String(secondsLeft % 60).padStart(2, '0');

  async function receive() {
    setBusy(true);
    setError('');
    try {
      const publicId = page.publicId || id;
      const key = visitorKey(publicId);
      let visitor = storedVisitor(page, id);
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem(key, visitor);
      }
      const result = await api.claimComment(publicId, visitor);
      setHasVisitor(true);
      setItems(result.items || [{ ...page, comment: result.comment }]);
    } catch (e) {
      if (e.status === 429) {
        updateWait(e.retryAt, e.serverTime);
        setHasVisitor(false);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <main lang="ru" translate="no" className="notranslate relative isolate min-h-screen overflow-hidden bg-background text-foreground flex items-center justify-center px-4 py-12 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.055),transparent_65%)]" />
    <div className={'relative w-full ' + (paired ? 'max-w-3xl' : 'max-w-lg')}>
      <div className="mb-7 text-center text-sm font-semibold">RubUP <span className="mx-2 font-normal text-subtle">/</span><span className="font-normal text-subtle">Комментарии</span></div>
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-modal sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {received ? (paired ? 'Ваши комментарии' : 'Ваш комментарий') : (paired ? 'Получить комментарии' : 'Получить комментарий')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-subtle">
          {received ? (paired ? 'Скопируйте каждый текст и оставьте его под указанным видео.' : 'Скопируйте текст и оставьте его под видео.') : 'Нажмите кнопку, чтобы получить текст.'}
        </p>
        {received ? <div className={'mt-6 grid gap-3 ' + (paired ? 'sm:grid-cols-2' : '')}>
          {items.map((item, index) => <CommentCard key={index} item={item} number={paired ? index + 1 : null} onError={setError} />)}
        </div> : <>
          {targets.length > 0 && <div className="mt-3 flex flex-wrap gap-3">
            {targets.map((target, index) => <VideoLink key={index} target={target} label={paired ? 'Видео ' + (index + 1) : undefined} />)}
          </div>}
          <button disabled={busy || !page || (waiting && !hasVisitor)} onClick={receive} className={primaryButton + ' mt-6'}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquare size={16} />}
            {busy ? 'Подбираем…' : waiting && !hasVisitor ? 'Получить через ' + countdown : paired ? 'Получить комментарии' : 'Получить комментарий'}
          </button>
        </>}
        {!page && !error && <p className="mt-4 flex justify-center items-center gap-2 text-xs text-subtle"><LoaderCircle size={13} className="animate-spin" />Загружаем набор…</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-relaxed text-red-300">{error}</p>}
      </section>
    </div>
  </main>;
}
