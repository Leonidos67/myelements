import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Save,Trash2,Download,Check,RefreshCw} from 'lucide-react';
import {api} from './api';
import Login from './Login';
import ProjectAssistant from './ProjectAssistant';
import ProjectCoverField from './ProjectCoverField';
import ProjectBlock, { ProjectGraph, ProjectGenderGraph } from './ProjectBlock';
import { applyProjectBlock } from './projectBlockJs';
import WorkspaceShell from './WorkspaceShell';
import Rows,{ViewerTypeRanges} from './PercentRows';
import {repairProjectPercentages} from '../server/services/statPercentages';
import {validateProjectConfig,projectDataSource,publicationCalendarDate,viewsDateLabels,parseDurationInput,defaultSearchQueries} from '../server/services/statProjectData';
import engine from '../server/data/tt-stat/engine.js?raw';
const input='mt-2 w-full rounded-xl border border-line bg-inset px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40';
const button='inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-foreground hover:bg-elevated disabled:opacity-40';
function Field({label,value,onChange,type='text',min,max,step='any',help}){return <label className="block text-xs text-muted">{label}<input required={type==='number'} type={type} value={value??''} min={min} max={max} step={step} onChange={e=>onChange(type==='number'?Number(e.target.value):e.target.value)} className={input}/>{help&&<span className="mt-1.5 block text-[10px] leading-relaxed text-subtle">{help}</span>}</label>;}
function Series({label,values,onChange,max=1e12,help}){
 const [draft,setDraft]=useState(values.join(', '));
 const bad=values.some(n=>!Number.isFinite(n)||n<0||n>max);
 return <label className="block text-xs text-muted">{label}<textarea rows={3} className={input+' font-mono text-xs'} value={draft} onChange={e=>{setDraft(e.target.value);onChange(e.target.value.trim().split(/[\s,;]+/).filter(Boolean).map(Number));}}/>{bad&&<span className="block mt-1 text-xs text-red-400">Введите числа от 0 до {max}.</span>}<span className="block mt-1 text-[10px] text-subtle">{help||'Числа через запятую. Дробная часть — через точку.'}</span></label>;
}
export default function StatProjectPage({id}){
 const [formEpoch,setFormEpoch]=useState(0);
 const [project,setProject]=useState(null),[config,setConfig]=useState(null),[title,setTitle]=useState('');
 const [loading,setLoading]=useState(true),[login,setLogin]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false),[tab,setTab]=useState('overview'),[dirty,setDirty]=useState(false);
 async function load(){setLoading(true);setLogin(false);setError('');try{const p=await api.statProject(id);setProject(p);setConfig(repairProjectPercentages(p.config));setTitle(p.title);const adjusted=p.percentagesAdjusted||JSON.stringify(repairProjectPercentages(p.config))!==JSON.stringify(p.config);setDirty(!!adjusted);if(adjusted)setNotice('Настройки процентов приведены к актуальному формату. Сохраните проект, чтобы применить исправление.');}catch(e){if(e.status===401)setLogin(true);else setError(e.status===404?'Проект не найден или удалён. Если он создан только что, проверьте обновление API сервера.':e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[id]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function change(path,value){setConfig(c=>{const next=structuredClone(c);const parts=path.split('.');let obj=next;for(const part of parts.slice(0,-1))obj=obj[part];obj[parts.at(-1)]=value;return next;});setDirty(true);setNotice('');}
 async function save(e){e?.preventDefault();setBusy(true);setError('');try{const valid=validateProjectConfig(config);const p=await api.saveStatProject(id,{title,config:valid,revision:project.revision});setProject(previous => ({ ...previous, ...p }));setConfig(repairProjectPercentages(p.config));setDirty(false);setNotice('Все значения сохранены. Макет и JS обновлены.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(){if(!window.confirm('Удалить проект '+id+' и все его параметры? Ссылка на макет перестанет работать. Само видео останется в кабинете.'))return;setBusy(true);try{await api.deleteStatProject(id);window.location.assign('/');}catch(e){setError(e.message);setBusy(false);}}
 function download(){try{const code=projectDataSource(config, project.otherPublications)+engine;const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const a=document.createElement('a');a.href=url;a.download='project-'+id+'.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}}
 if(login)return <Login onLogin={load}/>;
 if(loading)return <main className="grid min-h-screen place-items-center bg-background text-subtle">Загрузка проекта…</main>;
 if(!project)return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><div><p role="alert">{error}</p><a href="/" className={button+' mt-4'}>В кабинет</a><button onClick={load} className={button+' ml-2'}>Повторить</button></div></main>;
 const hasCover = /^(?:https?:\/\/|data:image\/jpeg;base64,)/i.test(config.video.cover);
 const inferredViewsDate = publicationCalendarDate(config.video.published);
 const dateLabels = config.viewsTimeUnit === 'day' ? viewsDateLabels(config) : null;
 const tabs=[['overview','Обзор'],['viewers','Зрители'],['engagement','Вовлеченность']];
 const field=(label,path,options={})=>{let value=config;for(const key of path.split('.'))value=value[key];return <Field label={label} value={value} onChange={v=>change(path,v)} {...options}/>;};
 function importBlock(source, paths) {
   const next = validateProjectConfig(applyProjectBlock(source, config, paths));
   setConfig(next);
   setDirty(true);
   setNotice('');
   setFormEpoch(value => value + 1);
 }
 const block = (title, paths, children) => <ProjectBlock key={title} title={title} paths={paths} config={config} onImport={importBlock}>{children}</ProjectBlock>;
 const distributionFields = (label, key, rows = config[key]) => <>
   {key === "gender" && <ProjectGenderGraph rows={config.gender} />}
   <div className="space-y-2">
     {rows.map(([name, value], index) => <div key={index}>
       <div className="mb-1 flex justify-between gap-2 text-xs"><span>{name}</span><span>{value}%</span></div>
       {key !== "gender" && <div className="project-editor-track"><i style={{ width: value + '%' }} /></div>}
     </div>)}
   </div>
   <Rows label={label} rows={rows} bounds={config.bounds?.[key]} calculation={config.calculation?.[key]}
     onCalculationChange={value => change('calculation.' + key, value)}
     onBoundsChange={value => change('bounds.' + key, value)} onChange={value => change(key, value)} />
 </>;
 const distribution = (label, key) => block(label, [key, 'bounds.' + key, 'calculation.' + key], distributionFields(label, key));
 const series=(label,path,max,help)=>{let values=config;for(const key of path.split('.'))values=values[key];return <Series key={path + formEpoch} label={label} values={values} onChange={v=>change(path,v)} max={max} help={help}/>;};
 return <WorkspaceShell breadcrumb={title||'Проект макета'} onAgent={()=>document.querySelector('textarea[aria-label="Запрос к AI-ассистенту"]')?.focus()}><main className="project-page text-foreground"><div className="mx-auto max-w-[1440px]">
  <a href="/" className="inline-flex items-center gap-2 text-xs text-subtle hover:text-foreground"><ArrowLeft size={13}/>Ваши видео</a>
  <header className="mt-6 flex flex-wrap justify-between items-start gap-5"><div><p className="text-[10px] uppercase tracking-widest text-subtle">MyElement / Макеты</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Проект видео</h1><p className="mt-2 font-mono text-[10px] text-subtle">ID: {id} · v{project.revision}</p></div><div className="flex flex-wrap gap-2"><a href={'/projects/'+id+'/preview'} target="_blank" rel="noreferrer" className={button} title={dirty?'Откроется последняя сохранённая версия':'Открыть сохранённый макет'}>Перейти к макету<ArrowUpRight size={14}/></a><button onClick={download} className={button}><Download size={13}/>Скачать JS</button><button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"><Save size={13}/>{busy?'Сохраняем…':'Сохранить'}</button></div></header>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-300">{error} <button onClick={()=>{if(!dirty||window.confirm('Перезагрузить данные? Несохранённые изменения будут потеряны.'))load();}} className="ml-2 underline">Перезагрузить данные</button></p>}
  {notice&&<p role="status" className="mt-5 flex items-center gap-2 text-xs text-green-400"><Check size={13}/>{notice}</p>}
  <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="ui-panel min-w-0 overflow-hidden">
   <nav aria-label="Параметры проекта" className="flex gap-1 overflow-x-auto border-b border-line p-3">{tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={'whitespace-nowrap rounded-lg px-3 py-2 text-xs '+(tab===key?'bg-primary text-primary-foreground':'text-subtle hover:text-foreground hover:bg-elevated')}>{label}</button>)}</nav>
   <form onSubmit={save} className="project-editor-form space-y-3">
    {tab==='overview'&&<>
      {block('Видео и счётчики', ['video'], <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Название проекта" value={title} onChange={v=>{setTitle(v);setDirty(true);}} />
        <label className="block text-xs text-muted">Длительность ролика, секунды
          <input type="text" inputMode="decimal" required maxLength={64} className={input}
            value={config.video.durationText ?? String(config.video.durationSeconds)}
            onChange={event => {
              const durationText = event.target.value;
              change('video', { ...config.video, durationText, durationSeconds: parseDurationInput(durationText) });
            }} />
          <span className="mt-1.5 block text-[10px] leading-relaxed text-subtle">Например, 40,50. Точность ввода сохраняется в подписи.</span>
        </label>
      </div>
      <div><h2 className="text-sm font-medium mb-4">Пять основных показателей</h2><div className="project-editor-metrics grid grid-cols-2 sm:grid-cols-5 gap-2">{['Просмотры','Лайки','Комментарии','Репосты','Сохранения'].map((label,i)=><Field key={i} label={label} type="number" min={0} step="1" value={config.video.stats[i]} onChange={v=>change('video.stats',config.video.stats.map((n,j)=>j===i?v:n))}/>)}</div><p className="mt-2 text-[10px] text-subtle">Просмотры автоматически используются в верхних счётчиках и карточке метрик.</p></div>
      <ProjectCoverField value={config.video.cover || ''} onChange={value => change('video.cover', value)} disabled={busy} />
      {field('Подпись даты публикации','video.published',{help:'Например: Опубликовано 31 окт 2026, 04:10'})}
      </>)}
      <section className="project-editor-card">
        <h2 className="text-base font-semibold">Другие публикации</h2>
        <p className="mt-2 text-sm text-muted">
          {[project.otherPublications?.accountName, project.otherPublications?.handle].filter(Boolean).join(' · ') || 'Аккаунт не указан'}
        </p>
        <p className="mt-1 text-xs text-muted">Последние публикации этого аккаунта с обложками в MyElement</p>
        {project.otherPublications?.items.length ? <div className="mt-3 flex flex-wrap gap-2">
          {project.otherPublications.items.map(item => <img key={item.id} src={item.cover} alt={item.title} title={item.title}
            referrerPolicy="no-referrer" className="h-20 w-14 rounded-md border border-line object-cover" />)}
        </div> : <p className="mt-3 text-xs text-muted">У других публикаций пока нет сохранённых обложек.</p>}
      </section>

      {block('Основные метрики', ['watch'], <><div className="project-editor-metrics grid gap-2 sm:grid-cols-2">{field('Общее время просмотра, секунды','watch.totalSeconds',{type:'number',min:0,step:'1',help:'Суммарное время всех просмотров. Это не длительность самого ролика.'})}{field('Среднее время просмотра, секунды','watch.averageSeconds',{type:'number',min:0,max:config.video.durationSeconds > 0 ? config.video.durationSeconds : undefined})}{field('Просмотрели полностью, %','watch.completionPercent',{type:'number',min:0,max:100})}{field('Новые подписчики','watch.subscribers',{type:'number',min:0,step:'1'})}</div><div className="rounded-xl border border-line bg-elevated p-4 text-xs leading-relaxed text-subtle">Общее время автоматически форматируется в часы, минуты и секунды. Средний просмотр: <span className="text-foreground">{config.video.durationSeconds > 0 ? Math.round(config.watch.averageSeconds/config.video.durationSeconds*1000)/10 + '%' : '—'}</span> длительности ролика — процент для подписи удержания вычисляется автоматически.</div></>)}
      {block('График просмотров', ['viewsByHour', 'viewsTicks', 'viewsTimeUnit', 'viewsStartDate', 'viewsShowDots'], <>
      <ProjectGraph values={config.viewsByHour} max={Math.max(0, ...config.viewsTicks)} dots={config.viewsShowDots}
        labels={dateLabels || (config.viewsTimeUnit === 'day' ? ['0 д.', (config.viewsByHour.length - 1) + ' д.'] : ['0h', (config.viewsByHour.length - 1) + 'h'])} />
      <label className="block text-xs text-muted">Шкала времени графика просмотров
        <select className={input} value={config.viewsTimeUnit ?? 'hour'} onChange={event => change('viewsTimeUnit', event.target.value)}>
          <option value="hour">По часам</option>
          <option value="day">По дням</option>
        </select>
      </label>
      {config.viewsTimeUnit === 'day' && <div className="grid items-end gap-3 sm:grid-cols-2">
        {field('Дата первой точки','viewsStartDate',{
          type:'date',
          help: inferredViewsDate ? 'По умолчанию берётся дата публикации (' + inferredViewsDate + '). Здесь можно выбрать другую.' : 'Укажите дату публикации или другую дату начала графика.',
        })}
        {dateLabels && <div className="rounded-lg border border-line bg-inset px-3 py-2.5 text-xs text-muted">
          Подписи на графике <strong className="ml-1 text-foreground">{dateLabels.join(' — ')}</strong>
        </div>}
      </div>}
      {series('Точки графика просмотров','viewsByHour',1e12,config.viewsTimeUnit === 'day'
        ? 'Введите от двух чисел через запятую. Первое соответствует начальной дате. Каждое следующее добавляет один день.'
        : 'Введите от двух чисел через запятую. Первое — час 0, следующее — час 1 и так далее.')}
      <button type="button" role="switch" aria-checked={config.viewsShowDots === true}
        onClick={() => change('viewsShowDots', !config.viewsShowDots)}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-inset px-3 py-2.5 text-left text-sm text-foreground hover:bg-elevated">
        Показывать точки на графике
        <span aria-hidden="true" className={'relative h-5 w-9 shrink-0 rounded-full border border-line transition-colors ' + (config.viewsShowDots ? 'bg-primary' : 'bg-elevated')}>
          <span className={'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full transition-transform ' + (config.viewsShowDots ? 'translate-x-4 bg-primary-foreground' : 'bg-muted')} />
        </span>
      </button>
      {series('Метки оси Y просмотров','viewsTicks',1e12)}
      </>)}
      {block('Коэффициент удержания', ['retention'], <>
        {hasCover && <img src={config.video.cover} alt="Обложка видео" referrerPolicy="no-referrer" className="mx-auto h-40 w-26 rounded-lg object-cover" />}
        <ProjectGraph values={config.retention} max={100} />
        {series('Удержание, %','retention',100,'От двух точек от начала до конца ролика. Временная шкала использует длительность из раздела «Обзор».')}
      </>)}
      {distribution('Источники трафика', 'sources')}
      {block('Поисковые запросы', ['searchQueriesMode', 'searchQueries', 'bounds.searchQueries', 'calculation.searchQueries'], <>
        <label className="block text-xs text-muted">Режим блока
          <select className={input} value={config.searchQueriesMode ?? 'empty'} onChange={event => change('searchQueriesMode', event.target.value)}>
            <option value="empty">Без запросов</option>
            <option value="results">С запросами</option>
          </select>
        </label>
        {config.searchQueriesMode === 'results'
          ? distributionFields('Поисковые запросы', 'searchQueries', config.searchQueries ?? defaultSearchQueries)
          : <p className="text-sm text-muted">Сейчас у всех поисковых запросов низкий трафик. Данные появятся, когда хотя бы у 1 запроса будет достаточно трафика.</p>}
      </>)}
    </>}
    {tab === 'viewers' && <>
      {block('Всего зрителей', ['totalViewers'], <div className="project-editor-metrics">{field('Всего зрителей','totalViewers',{type:'number',min:0,step:'1'})}</div>)}
      {block('Типы зрителей', ['viewerTypes', 'bounds.viewerTypes'], <>
        {config.viewerTypes.map(({left, right}, index) => <div key={index} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs"><span>{left[0]} · {left[1]}%</span><span>{right[0]} · {right[1]}%</span></div>
          <div className="project-editor-track"><i style={{ width: left[1] + '%' }} /><i style={{ width: right[1] + '%', background: '#7fb8ec' }} /></div>
        </div>)}
        <ViewerTypeRanges pairs={config.viewerTypes} bounds={config.bounds?.viewerTypes} onBoundsChange={v=>change('bounds.viewerTypes',v)} onChange={v=>change('viewerTypes',v)}/>
      </>)}
      {distribution('Пол', 'gender')}
      {distribution('Возраст', 'ages')}
      {distribution('Места', 'places')}
    </>}
    {tab === 'engagement' && <>
      {block('Самые частые слова в комментариях', ['commentWordsText'], <label className="block text-xs text-muted">Текст блока
        <textarea rows={3} maxLength={2000} className={input} value={config.commentWordsText ?? ''}
          onChange={event => change('commentWordsText', event.target.value)} placeholder="Стандартная подсказка макета" />
      </label>)}
      {block('Лайки', ['likes'], <>
      {hasCover && <img src={config.video.cover} alt="Обложка видео" referrerPolicy="no-referrer" className="mx-auto h-40 w-26 rounded-lg object-cover" />}
      <ProjectGraph values={config.likes.values} max={Math.max(0, ...config.likes.ticks)} />
      {series('Лайки по ходу видео, %','likes.values',100)}
      {series('Метки оси Y лайков, %','likes.ticks',100)}
      {field('Текст под графиком лайков','likes.text')}
      </>)}
    </>}
    <div className="flex items-center justify-between gap-3 border-t border-line pt-5"><span className="text-[10px] text-subtle">{dirty?'Есть несохранённые изменения':'Все изменения сохранены'}</span><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">Сохранить значения</button></div>
   </form>
  </div>
  <ProjectAssistant projectId={id} title={title} config={config} onApply={next=>{setConfig(validateProjectConfig(next));setDirty(true);setNotice('Предложение AI применено к полям. Сохраните проект, чтобы обновить макет.');setFormEpoch(v=>v+1);}} />
  </div>
  <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[10px] text-subtle"><p>Сохранено: {new Date(project.updatedAt).toLocaleString('ru-RU')} · Данные этого проекта не меняют статистику видео в кабинете.</p><button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-400 hover:bg-red-400/5 disabled:opacity-40"><Trash2 size={12}/>Удалить проект</button></footer>
 </div></main></WorkspaceShell>;
}
