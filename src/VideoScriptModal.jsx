import { useEffect, useMemo, useRef, useState } from 'react';
import { X, FileCode2, Copy, Download, Upload, RefreshCw, Save, Eye, Code2, Check } from 'lucide-react';
import { api } from './api';
import { buildStatPreview } from './statPreview';
import localScript from './assets/tt-stat/app.js?raw';
const MAX_BYTES = 256 * 1024;
export default function VideoScriptModal({ video, onClose }) {
  const [code, setCode] = useState(localScript);
  const [original, setOriginal] = useState(localScript);
  const [metadata, setMetadata] = useState({source: 'bundled', revision: 0});
  const [serverReady, setServerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('code');
  const [copied, setCopied] = useState(false);
  const input = useRef(null);
  const dirty = code !== original;
  const preview = useMemo(() => tab === 'preview' ? buildStatPreview(code) : '', [code, tab]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await api.videoScript(video._id);
        if(active){setCode(result.code);setOriginal(result.code);setMetadata(result);setServerReady(true);}
      } catch(e) {
        if(active){setServerReady(false);setError(e.status===404?'API JS или видео не найдено. Обновите сервер MyElement.':e.message);setNotice('Открыта локальная копия JS.');}
      }
      if (video.initialFile && active) {
        try {
          const file=video.initialFile;
          if(!/\.js$/i.test(file.name))throw Error('Выберите файл .js');
          if(file.size>MAX_BYTES)throw Error('Размер файла не должен превышать 256 КБ');
          const text=await file.text();
          if(!text.trim())throw Error('Файл пуст');
          if(active){setCode(text);setNotice('Файл «'+file.name+'» загружен. Нажмите «Сохранить для видео».');}
        } catch(e){if(active)setError(e.message);}
      }
      if(active)setLoading(false);
    })();
    return () => { active = false; };
  }, [video._id]);
  function close() {
    if (saving || loading) return;
    if (dirty && !window.confirm('Закрыть без сохранения изменений JS?')) return;
    onClose();
  }
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [dirty, saving, loading]);
  async function load(source) {
    if (dirty && !window.confirm('Заменить несохранённый JS выбранной версией?')) return;
    if (source === 'bundled') {
      setCode(localScript); setOriginal(localScript); setMetadata(m => ({source: 'bundled', revision: m?.revision || 0})); setTab('code'); setCopied(false); setNotice('Открыта локальная копия из tt-stat-cc.'); return;
    }
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await api.videoScript(video._id, source);
      setCode(result.code); setOriginal(result.code); setMetadata(result); setServerReady(true); setCopied(false); setTab('code');
      if (source !== 'saved') setNotice('Версия загружена. Нажмите «Сохранить для видео», чтобы закрепить её за этим видео.');
    } catch (e) { setError(e.status === 404 ? 'API JS не найдено. Перезапустите обновлённый сервер или обновите его в Render.' : e.message); }
    finally { setLoading(false); }
  }
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!/\.js$/i.test(file.name)) { setError('Выберите файл с расширением .js'); return; }
    if (file.size > MAX_BYTES) { setError('Размер файла не должен превышать 256 КБ'); return; }
    if (dirty && !window.confirm('Заменить несохранённый JS содержимым файла?')) return;
    try {
      const text = await file.text();
      if (!text.trim()) throw Error('Файл пуст');
      setCode(text); setTab('code'); setError(''); setCopied(false);
      setNotice('Файл «' + file.name + '» загружен. Сохраните его для выбранного видео.');
    } catch (e) { setError(e.message); }
  }
  async function save() {
    if (!serverReady) { setError('Сначала подключите обновлённый сервер кнопкой «Подключить сохранение».'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await api.saveVideoScript(video._id, { code, revision: metadata?.revision || 0 });
      setMetadata(result); setOriginal(result.code); setNotice('JS сохранён для этого видео.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setError('Не удалось скопировать автоматически. Выделите текст в редакторе.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([code], {type: 'text/javascript;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'app-' + video._id + '.js'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const disabled = loading || saving;
  const action = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-foreground hover:bg-elevated disabled:opacity-30';
  const sourceName = {saved: 'Сохранён в MongoDB', live: 'Получен с tt-stat.vercel.app', bundled: 'Локальная копия из tt-stat-cc'}[metadata?.source];
  return <div className="modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4" onClick={close}>
    <section role="dialog" aria-modal="true" aria-labelledby="script-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface text-foreground shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="border-b border-line p-6"><div className="flex items-center justify-between gap-4"><h2 id="script-title" className="flex items-center gap-2 text-lg font-semibold"><FileCode2 size={19} />Извлечь JS</h2><button aria-label="Закрыть" disabled={disabled} onClick={close} className="text-subtle hover:text-foreground disabled:opacity-30"><X size={20} /></button></div><p className="mt-2 truncate text-xs text-subtle">{video.title || video.url}</p><p className="mt-1 text-[10px] text-subtle">Отдельная версия для этого видео · Редактирование JS и предпросмотр</p></header>
      <div className="min-h-0 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-2"><button className={action} disabled={disabled} onClick={() => load('bundled')}><FileCode2 size={13} />Локальный шаблон</button><button className={action} disabled={disabled} onClick={() => load('live')}><RefreshCw size={13} />Актуальный JS с сайта</button><button className={action} disabled={disabled} onClick={() => load('saved')}>{serverReady ? 'Сохранённая версия' : 'Подключить сохранение'}</button><button className={action} disabled={disabled} onClick={() => input.current.click()}><Upload size={13} />Загрузить новый JS</button><input ref={input} type="file" accept=".js,text/javascript,application/javascript" onChange={upload} className="hidden" /></div>
        {error && <div role="alert" className="mt-3 rounded-lg border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-300"><p>{error}</p>{!metadata && !loading && <button className="mt-2 underline" onClick={() => load('bundled')}>Открыть локальную копию из tt-stat-cc</button>}</div>}
        {notice && <p role="status" className="mt-3 text-xs text-muted">{notice}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-lg bg-inset p-1">{[['code','JS',Code2],['preview','Предпросмотр',Eye]].map(([id,label,Icon]) => <button key={id} disabled={loading || !code} onClick={() => setTab(id)} className={'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs disabled:opacity-30 ' + (tab === id ? 'bg-primary text-primary-foreground' : 'text-subtle')}><Icon size={12} />{label}</button>)}</div><span className="text-[10px] text-subtle">{sourceName}{metadata?.revision ? ' · v' + metadata.revision : ''}{dirty ? ' · Есть изменения' : ''}</span></div>
        {loading ? <div className="grid h-72 place-items-center text-sm text-subtle">Получаем JS…</div> : tab === 'preview' ? <div className="mt-3 rounded-xl border border-line bg-background p-3"><iframe title="Предпросмотр tt-stat для выбранного видео" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={preview} className="mx-auto h-[55vh] w-full max-w-[440px] rounded-lg border-0 bg-primary" /><p className="mt-2 text-center text-[10px] text-subtle">Макет HTML/CSS из tt-stat-cc · JS из редактора</p></div> : <textarea aria-label="Исходный код JS" spellCheck={false} value={code} onChange={e => {setCode(e.target.value);setCopied(false);}} className="mt-3 h-[45vh] min-h-48 w-full resize-y rounded-xl border border-line bg-background p-4 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-foreground/30" />}
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] text-subtle"><span>{(new Blob([code]).size / 1024).toFixed(1)} КБ / 256 КБ</span><span>{metadata?.updatedAt ? 'Сохранено: ' + new Date(metadata.updatedAt).toLocaleString('ru-RU') : metadata?.checkedAt ? 'Проверено: ' + new Date(metadata.checkedAt).toLocaleString('ru-RU') : ''}</span></div>
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line p-6"><div className="flex gap-2"><button className={action} disabled={disabled || !code} onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Скопировано' : 'Копировать JS'}</button><button className={action} disabled={disabled || !code} onClick={download}><Download size={13} />Скачать .js</button></div><button disabled={disabled || !serverReady || !code.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-30"><Save size={13} />{saving ? 'Сохраняем…' : 'Сохранить для видео'}</button></footer>
    </section>
  </div>;
}
