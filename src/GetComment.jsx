import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, LoaderCircle, MessageSquare } from 'lucide-react';
import { api } from './api';
import tiktokLogo from './assets/tiktok-logo.jpg';

export default function GetComment({ id }) {
  const [page, setPage] = useState(null);
  const [comment, setComment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [hasVisitor, setHasVisitor] = useState(() => { try { return !!localStorage.getItem('comment-visitor:' + id); } catch { return false; } });
  const updateWait = (date, serverTime) => {
    setWaitUntil(Date.now() + Math.max(0, new Date(date || 0).getTime() - new Date(serverTime || Date.now()).getTime()));
    setNow(Date.now());
  };
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  useEffect(() => {
    if (comment || secondsLeft <= 0) return;
    const timer = setInterval(() => { if (!document.hidden) api.commentPage(id).then(p => { setPage(p); updateWait(p.nextAvailableAt, p.serverTime); }).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [id, !!comment, secondsLeft > 0]);
  const countdown = Math.floor(secondsLeft / 60) + ':' + String(secondsLeft % 60).padStart(2, '0');
  useEffect(() => { api.commentPage(id).then(p => { setPage(p); updateWait(p.nextAvailableAt, p.serverTime); }).catch(e => setError(e.message)); }, [id]);
  const mentions = (comment?.tags || []).filter(tag => tag.trim().startsWith('@'));
  const instructions = (comment?.tags || []).filter(tag => !tag.trim().startsWith('@'));
  const videoUrl = /^https?:\/\//i.test(page?.videoUrl || '') ? page.videoUrl : '';
  const fullText = comment ? [comment.text, ...mentions].join(' ') : '';
  async function receive() {
    setBusy(true); setError('');
    try {
      const key = `comment-visitor:${id}`;
      let visitor = localStorage.getItem(key);
      if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem(key, visitor); }
      const result = await api.claimComment(id, visitor);
      setHasVisitor(true);
      setComment(result.comment);
      setPage(p => ({ ...p, remaining: result.remaining }));
    } catch (e) {
      if (e.status === 429) { updateWait(e.retryAt, e.serverTime); setHasVisitor(false); }
      else setError(e.message);
    } 
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(fullText); setCopied(true); setError(''); }
    catch { setError('Не удалось скопировать. Выделите текст и скопируйте вручную.'); }
  }
  const button = 'flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-panel transition-all hover:bg-primary/90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:opacity-40 disabled:cursor-not-allowed';
  return <main lang="ru" translate="no" className="notranslate relative isolate min-h-screen overflow-hidden bg-background text-foreground flex items-center justify-center px-4 py-12 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.055),transparent_65%)]" />
    <div className="relative w-full max-w-lg">
      <div className="mb-7 flex items-center justify-center gap-2.5"><span className="text-sm font-semibold tracking-tight">RubUP <span className="mx-2 font-normal text-subtle">/</span><span className="font-normal text-subtle">Комментарии</span></span></div>
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-modal sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{comment ? 'Ваш комментарий' : 'Получить комментарий'}</h1>
          {/* {page && <span title="Осталось комментариев из общего количества" aria-label={'Осталось ' + page.remaining + ' из ' + page.total} className="shrink-0 rounded-lg border border-line bg-elevated px-3 py-1.5 text-xs font-mono tabular-nums text-muted">{page.remaining}<span className="mx-1.5 text-subtle">/</span>{page.total}</span>} */}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-subtle">{comment ? 'Скопируйте текст и оставьте его под видео.' : 'Нажмите кнопку, чтобы получить текст.'}</p>
        {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-foreground underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-foreground hover:decoration-white" title={page?.title}><img src={tiktokLogo} alt="TikTok" width="20" height="20" className="h-5 w-5 shrink-0 rounded object-contain" />Перейти к видео<ArrowUpRight size={15} /></a>}
        {comment ? <div className="mt-6">
          <div className="rounded-2xl border border-line bg-inset p-6 sm:p-6">
            <button type="button" onClick={copy} title="Нажмите, чтобы скопировать комментарий" aria-label="Скопировать текст комментария" className="block w-full cursor-copy rounded-lg text-left text-lg sm:text-xl leading-relaxed whitespace-pre-wrap break-words transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">{fullText}</button>
            {instructions.length > 0 && <div className="mt-4 border-t border-line pt-3"><p className="text-[10px] text-subtle mb-1.5">Стикеры и дополнения</p>{instructions.map((tag, i) => <p key={i} className="text-xs leading-relaxed text-muted break-words">{tag}</p>)}</div>}
          </div>
          <button onClick={copy} className={button + ' mt-4'}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Комментарий скопирован' : 'Скопировать комментарий'}</button>
        </div> : <button disabled={busy || !page || (secondsLeft > 0 && !hasVisitor)} onClick={receive} className={button + ' mt-6'}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquare size={16} />}{busy ? 'Подбираем комментарий…' : secondsLeft > 0 && !hasVisitor ? 'Получить через ' + countdown : 'Получить комментарий'}</button>}
        {!page && !error && <p className="mt-4 flex justify-center items-center gap-2 text-xs text-subtle"><LoaderCircle size={13} className="animate-spin" />Загружаем набор…</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-relaxed text-red-300">{error}</p>}
      </section>
    </div>
  </main>;
}
