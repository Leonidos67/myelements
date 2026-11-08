import { useId, useRef, useState } from 'react';
import { ClipboardPaste, Copy, FileCode2 } from 'lucide-react';
import { projectBlockSource } from './projectBlockJs';

const action = 'inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50';

export default function ProjectBlock({ title, paths, config, onImport, children }) {
  const id = useId();
  const fileInput = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function copy() {
    const js = projectBlockSource(config, paths);
    setMessage('');
    setError('');
    try {
      await navigator.clipboard.writeText(js);
      setMessage('JS скопирован');
    } catch {
      setDraft(js);
      setOpen(true);
      setMessage('Скопируйте JS из поля.');
    }
  }

  async function loadFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw Error('Файл должен быть не больше 1 МБ.');
      setDraft(await file.text());
      setError('');
    } catch (error) { setError(error.message); }
  }

  function apply() {
    setError('');
    setMessage('');
    try {
      onImport(draft, paths);
      setOpen(false);
      setDraft('');
      setMessage('Данные применены. Сохраните проект.');
    } catch (error) { setError(error.message); }
  }

  return <section className="project-editor-card" aria-labelledby={id}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={action} onClick={copy}><Copy size={13} />Скопировать JS</button>
        <button type="button" className={action} aria-expanded={open} onClick={() => setOpen(value => !value)}><ClipboardPaste size={13} />Вставить JS</button>
      </div>
    </div>
    {open && <div className="mt-3 space-y-2 rounded-lg border border-line bg-inset p-3">
      <textarea aria-label={'JS: ' + title} rows={5} value={draft} onChange={event => setDraft(event.target.value)}
        placeholder="const DATA = { … }" className="w-full rounded-md border border-line bg-surface p-2 font-mono text-xs" />
      <input type="file" accept=".js,.json,.txt" hidden ref={fileInput} onChange={loadFile} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={action} onClick={() => fileInput.current?.click()}><FileCode2 size={13} />Выбрать файл</button>
        <button type="button" className={action} disabled={!draft.trim()} onClick={apply}>Применить данные</button>
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>}
    {message && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>;
}

export function ProjectGraph({ values, labels, max, dots = false }) {
  const id = useId();
  const points = values.map(value => Number.isFinite(value) ? Math.max(0, value) : 0);
  const scale = Math.max(1, max || 0, ...points);
  const coords = points.map((value, index) => [10 + 380 * index / Math.max(1, points.length - 1), 114 - 100 * value / scale]);
  const line = coords.map(pair => pair.join(',')).join(' ');
  return <div className="project-editor-chart" aria-hidden="true">
    <svg viewBox="0 0 400 126" className="block w-full" preserveAspectRatio="none">
      <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="#0a74da" stopOpacity=".25" /><stop offset="1" stopColor="#0a74da" stopOpacity="0" /></linearGradient></defs>
      {[14, 64, 114].map(y => <line key={y} x1="10" x2="390" y1={y} y2={y} stroke="var(--ui-line-strong)" strokeDasharray="3 4" />)}
      {coords.length > 1 && <><polygon points={'10,114 ' + line + ' 390,114'} fill={'url(#' + id + ')'} />
        <polyline points={line} fill="none" stroke="#0a74da" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {dots && coords.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="2" fill="var(--ui-surface)" stroke="#0a74da" />)}
      </>}
    </svg>
    {labels && <div className="flex justify-between px-2 text-xs text-muted"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
  </div>;
}

export function ProjectGenderGraph({ rows }) {
  const colors = ['#0a74da', '#7fb8ec', '#cce2f8'];
  const arc = 'M 18 90 A 72 72 0 0 1 162 90';
  let offset = 0;
  return <svg viewBox="0 0 180 102" className="mx-auto block w-44" aria-hidden="true">
    <path d={arc} fill="none" stroke="var(--ui-line)" strokeWidth="18" />
    {rows.map(([, value], index) => {
      const start = offset;
      offset += value;
      if (!value) return null;
      return <path key={index} d={arc} pathLength="100" fill="none" stroke={colors[index % colors.length]}
        strokeWidth="18" strokeDasharray={value + ' 100'} strokeDashoffset={-start} />;
    })}
  </svg>;
}
