import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Copy, Link2, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { api } from './api';

const toolsUrl = '/?view=tools';
const serviceUrl = id => toolsUrl + '&service=' + encodeURIComponent(id);
const panel = 'rounded-xl border border-line bg-surface p-5';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium hover:bg-elevated disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50';
const input = 'mt-1.5 w-full rounded-lg border border-line bg-inset px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40';

function ServiceForm({ service, busy, onSave, onCancel }) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  return <form className={panel + ' space-y-4'} onSubmit={event => { event.preventDefault(); onSave({ name, description }); }}>
    <h2 className="text-sm font-semibold">{service ? 'Настройки сервиса' : 'Новый сервис'}</h2>
    <label className="block text-xs text-muted">Название
      <input required maxLength={120} className={input} value={name} onChange={event => setName(event.target.value)} />
    </label>
    <label className="block text-xs text-muted">Описание
      <textarea rows={3} maxLength={2000} className={input} value={description} onChange={event => setDescription(event.target.value)} />
    </label>
    <div className="flex gap-2">
      <button className={primary} disabled={busy || !name.trim()}>{service ? 'Сохранить' : 'Создать сервис'}</button>
      <button type="button" className={button} onClick={onCancel} disabled={busy}>Отмена</button>
    </div>
  </form>;
}

function MaterialForm({ material, busy, onSave, onCancel }) {
  const [title, setTitle] = useState(material?.title || '');
  const [url, setUrl] = useState(material?.url || '');
  const [text, setText] = useState(material?.text || '');
  return <form className={panel + ' space-y-4'} onSubmit={event => { event.preventDefault(); onSave({ title, url, text }); }}>
    <h2 className="text-sm font-semibold">{material ? 'Редактировать материал' : 'Новый материал'}</h2>
    <label className="block text-xs text-muted">Название
      <input required maxLength={160} className={input} value={title} onChange={event => setTitle(event.target.value)} />
    </label>
    <label className="block text-xs text-muted">Ссылка
      <input type="url" maxLength={2000} placeholder="https://…" className={input} value={url} onChange={event => setUrl(event.target.value)} />
    </label>
    <label className="block text-xs text-muted">Текст
      <textarea rows={5} maxLength={10000} placeholder="Заметка, инструкция или фрагмент кода" className={input}
        value={text} onChange={event => setText(event.target.value)} />
    </label>
    <div className="flex gap-2">
      <button className={primary} disabled={busy || !title.trim() || (!url.trim() && !text.trim())}>Сохранить материал</button>
      <button type="button" className={button} onClick={onCancel} disabled={busy}>Отмена</button>
    </div>
  </form>;
}

export default function ToolsView() {
  const id = new URLSearchParams(window.location.search).get('service');
  const [data, setData] = useState(null);
  const [editor, setEditor] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    (id ? api.toolService(id) : api.toolServices()).then(result => {
      if (active) setData(result);
    }).catch(error => {
      if (active) setError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, reload]);

  async function run(action) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  async function copyText(material) {
    setError('');
    try {
      await navigator.clipboard.writeText(material.text);
      setCopied(material._id);
    } catch { setError('Не удалось скопировать текст'); }
  }

  async function saveService(fields) {
    if (id) {
      setData(await api.updateToolService(id, fields));
      setEditor(null);
    } else {
      const service = await api.createToolService(fields);
      window.location.assign(serviceUrl(service._id));
    }
  }

  const search = query.trim().toLowerCase();
  const entries = (id ? data?.materials : data) || [];
  const visible = entries.filter(entry => [entry.name, entry.description, entry.title, entry.url, entry.text]
    .some(value => value?.toLowerCase().includes(search)));

  return <section className="mx-auto max-w-5xl space-y-5" aria-label={id ? 'Страница сервиса' : 'Инструменты'}>
    {id && <a href={toolsUrl} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"><ArrowLeft size={14} />Все сервисы</a>}
    {error && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-400">
      {error}{!data && <button type="button" className="ml-2 underline" onClick={() => setReload(value => value + 1)}>Повторить</button>}
    </div>}
    {loading ? <p className="text-sm text-muted">Загрузка…</p> : data && <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {id && <h2 className="break-words text-xl font-semibold">{data.name}</h2>}
          {id && data.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{data.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={primary} onClick={() => setEditor({ kind: id ? 'material' : 'service' })}>
            <Plus size={15} />{id ? 'Добавить материал' : 'Добавить сервис'}
          </button>
          {id && <>
            <button type="button" disabled={busy} className={button} onClick={() => setEditor({ kind: 'service' })}><Pencil size={14} />Настройки</button>
            <button type="button" disabled={busy} className={button + ' text-red-400'} onClick={() => {
              if (window.confirm('Удалить сервис «' + data.name + '» и все его материалы?')) run(async () => {
                await api.deleteToolService(id);
                window.location.assign(toolsUrl);
              });
            }}><Trash2 size={14} />Удалить сервис</button>
          </>}
        </div>
      </div>
      {editor?.kind === 'service' && <ServiceForm service={id ? data : null} busy={busy} onCancel={() => setEditor(null)} onSave={fields => run(() => saveService(fields))} />}
      {editor?.kind === 'material' && <MaterialForm key={editor.material?._id || 'new'} material={editor.material} busy={busy} onCancel={() => setEditor(null)}
        onSave={fields => run(async () => {
          setData(await api.saveToolMaterial(id, editor.material?._id, fields));
          setEditor(null);
        })} />}
      {entries.length > 0 && <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-foreground/40">
        <Search size={15} aria-hidden="true" className="text-muted" />
        <input type="search" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          aria-label={id ? 'Поиск материалов' : 'Поиск сервисов'} placeholder={id ? 'Найти материал…' : 'Найти сервис…'}
          value={query} onChange={event => setQuery(event.target.value)} />
      </label>}
      {!visible.length ? <p className={panel + ' text-sm text-muted'}>
        {search ? 'Ничего не найдено.' : id ? 'Пока нет материалов. Добавьте ссылку или заметку.' : 'Пока нет сервисов. Добавьте первый, чтобы сохранять материалы.'}
      </p> : id ? <div className="space-y-3">
        {visible.map(material => <article key={material._id} className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold">{material.title}</h3>
            <div className="flex flex-wrap gap-2">
              {material.text && <button type="button" className={button} onClick={() => copyText(material)}>
                <Copy size={13} />{copied === material._id ? 'Скопировано' : 'Копировать текст'}
              </button>}
              <button type="button" disabled={busy} className={button} onClick={() => setEditor({ kind: 'material', material })}><Pencil size={13} />Изменить</button>
              <button type="button" disabled={busy} className={button + ' text-red-400'} onClick={() => {
                if (window.confirm('Удалить материал «' + material.title + '»?')) run(async () => {
                  setData(await api.deleteToolMaterial(id, material._id));
                  setEditor(current => current?.material?._id === material._id ? null : current);
                });
              }}><Trash2 size={13} />Удалить</button>
            </div>
          </div>
          {material.url && <a href={material.url} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-blue-600 underline dark:text-blue-300">
            <Link2 size={14} className="shrink-0" /><span className="break-all">{material.url}</span>
          </a>}
          {material.text && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-inset p-3 text-sm leading-relaxed">{material.text}</p>}
        </article>)}
      </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(service => <a key={service._id} href={serviceUrl(service._id)} className={panel + ' block min-w-0 hover:border-foreground/40'}>
          <span className="mb-3 flex items-center justify-between text-muted"><Wrench size={17} /><ArrowUpRight size={15} /></span>
          <h2 className="break-words text-sm font-semibold">{service.name}</h2>
          {service.description && <p className="mt-2 line-clamp-3 break-words text-sm text-muted">{service.description}</p>}
          <p className="mt-3 text-xs text-subtle">Материалов: {service.materialCount}</p>
        </a>)}
      </div>}
    </>}
  </section>;
}
