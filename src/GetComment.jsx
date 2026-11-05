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
  useEffect(() => { api.commentPage(id).then(setPage).catch(e => setError(e.message)); }, [id]);
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
      setComment(result.comment);
      setPage(p => ({ ...p, remaining: result.remaining }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(fullText); setCopied(true); setError(''); }
    catch { setError('Не удалось скопировать. Выделите текст и скопируйте вручную.'); }
  }
  const button = 'flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black shadow-[0_4px_20px_rgba(255,255,255,0.06)] transition-all hover:bg-neutral-200 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-40 disabled:cursor-not-allowed';
  return <main className="relative isolate min-h-screen overflow-hidden bg-[#080808] text-white flex items-center justify-center px-4 py-12 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.055),transparent_65%)]" />
    <div className="relative w-full max-w-lg">
      <div className="mb-7 flex items-center justify-center gap-2.5"><span className="text-sm font-semibold tracking-tight">RubUP <span className="mx-2 font-normal text-neutral-700">/</span><span className="font-normal text-neutral-500">Комментарии</span></span></div>
      <section className="rounded-3xl border border-white/10 bg-[#111] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.6)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{comment ? 'Ваш комментарий' : 'Получить комментарий'}</h1>
          {/* {page && <span title="Осталось комментариев из общего количества" aria-label={'Осталось ' + page.remaining + ' из ' + page.total} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-mono tabular-nums text-neutral-400">{page.remaining}<span className="mx-1.5 text-neutral-700">/</span>{page.total}</span>} */}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">{comment ? 'Скопируйте текст и оставьте его под видео.' : 'Нажмите кнопку, чтобы получить текст.'}</p>
        {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-300 underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-white hover:decoration-white" title={page?.title}><img src={tiktokLogo} alt="TikTok" width="20" height="20" className="h-5 w-5 shrink-0 rounded object-contain" />Перейти к видео<ArrowUpRight size={15} /></a>}
        {comment ? <div className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-[#090909] p-5 sm:p-6">
            <button type="button" onClick={copy} title="Нажмите, чтобы скопировать комментарий" aria-label="Скопировать текст комментария" className="block w-full cursor-copy rounded-lg text-left text-lg sm:text-xl leading-relaxed whitespace-pre-wrap break-words transition-colors hover:text-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{fullText}</button>
            {instructions.length > 0 && <div className="mt-4 border-t border-white/[0.07] pt-3"><p className="text-[10px] text-neutral-600 mb-1.5">Стикеры и дополнения</p>{instructions.map((tag, i) => <p key={i} className="text-xs leading-relaxed text-neutral-400 break-words">{tag}</p>)}</div>}
          </div>
          <button onClick={copy} className={button + ' mt-4'}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Комментарий скопирован' : 'Скопировать комментарий'}</button>
        </div> : <button disabled={busy || !page} onClick={receive} className={button + ' mt-6'}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquare size={16} />}{busy ? 'Подбираем комментарий…' : 'Получить комментарий'}</button>}
        {!page && !error && <p className="mt-4 flex justify-center items-center gap-2 text-xs text-neutral-500"><LoaderCircle size={13} className="animate-spin" />Загружаем набор…</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-relaxed text-red-300">{error}</p>}
      </section>
    </div>
  </main>;
}
