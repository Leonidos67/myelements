import { useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Upload, X } from 'lucide-react';
import { PROJECT_COVER_MAX_LENGTH } from '../server/services/statProjectData';

async function prepareCover(file) {
  if (file.size > 20 * 1024 * 1024) throw Error('Выберите изображение размером до 20 МБ.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try { await image.decode(); }
    catch { throw Error('Не удалось открыть изображение. Попробуйте JPEG, PNG или WebP.'); }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context || !image.naturalWidth || !image.naturalHeight) throw Error('Не удалось подготовить изображение.');
    for (const maxEdge of [960, 720, 480, 320]) {
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.7]) {
        const cover = canvas.toDataURL('image/jpeg', quality);
        if (cover.startsWith('data:image/jpeg;base64,') && cover.length <= PROJECT_COVER_MAX_LENGTH) return cover;
      }
    }
    throw Error('Изображение не удалось сжать. Попробуйте файл меньшего размера.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const button = 'inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs hover:bg-elevated disabled:opacity-50';

export default function ProjectCoverField({ value, onChange, disabled }) {
  const input = useRef(null);
  const pasteTarget = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const embedded = value.startsWith('data:image/jpeg;base64,');
  const hasPreview = embedded || /^https?:\/\//i.test(value);
  const busy = disabled || processing;

  async function setImage(file) {
    if (!file || busy) return;
    setProcessing(true);
    setError('');
    try { onChange(await prepareCover(file)); }
    catch (error) { setError(error.message); }
    finally { setProcessing(false); }
  }

  async function pasteImage() {
    pasteTarget.current?.focus();
    try {
      const clipboard = await navigator.clipboard.read();
      const item = clipboard.find(entry => entry.types.some(type => type.startsWith('image/')));
      if (!item) { setError('В буфере обмена нет изображения.'); return; }
      const type = item.types.find(type => type.startsWith('image/'));
      await setImage(await item.getType(type));
    } catch {
      setError('Нажмите Ctrl+V или ⌘V в этой области, чтобы вставить изображение.');
    }
  }

  return <section aria-labelledby="project-cover-label" className="rounded-xl border border-line p-4"
    onPaste={event => {
      const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      setImage(file);
    }}>
    <h2 id="project-cover-label" className="text-sm font-medium">Обложка видео</h2>
    <div className="mt-3 flex flex-wrap items-start gap-4">
      {hasPreview ? <img src={value} alt="Обложка проекта" referrerPolicy="no-referrer" className="h-36 w-24 rounded-xl border border-line object-cover" />
        : <div className="grid h-36 w-24 place-items-center rounded-xl border border-dashed border-line bg-inset text-muted"><ImagePlus size={22} aria-hidden="true" /></div>}
      <div ref={pasteTarget} tabIndex={-1} className="min-w-[180px] flex-1">
        <label className="block text-xs text-muted">Ссылка на обложку
          <input type="url" disabled={busy} maxLength={2000} value={embedded ? '' : value} placeholder="https://…"
            onChange={event => { onChange(event.target.value); setError(''); }}
            className="mt-1.5 w-full rounded-lg border border-line bg-inset px-3 py-2 text-sm text-foreground" />
        </label>
        <input ref={input} type="file" accept="image/*" hidden onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          setImage(file);
        }} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy} onClick={() => input.current?.click()}><Upload size={14} />Загрузить файл</button>
          <button type="button" className={button} disabled={busy} onClick={pasteImage}><ClipboardPaste size={14} />Вставить изображение</button>
          {value && <button type="button" className={button} disabled={busy} onClick={() => { onChange(''); setError(''); }}><X size={14} />Убрать</button>}
        </div>
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {processing ? 'Подготавливаем изображение…' : embedded ? 'Изображение сохранится вместе с проектом.' : 'Можно вставить изображение через Ctrl+V или ⌘V.'}
        </p>
        {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  </section>;
}
