import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Save,Trash2,Plus,X,Download,Check,RefreshCw} from 'lucide-react';
import {api} from './api';
import Login from './Login';
import ProjectAssistant from './ProjectAssistant';
import WorkspaceShell from './WorkspaceShell';
import Rows,{ViewerTypeRanges} from './PercentRows';
import {repairProjectPercentages} from '../server/services/statPercentages';
import {validateProjectConfig,projectDataSource} from '../server/services/statProjectData';
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
 async function save(e){e?.preventDefault();setBusy(true);setError('');try{const valid=validateProjectConfig(config);const p=await api.saveStatProject(id,{title,config:valid,revision:project.revision});setProject(p);setConfig(repairProjectPercentages(p.config));setDirty(false);setNotice('Все значения сохранены. Макет и JS обновлены.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(){if(!window.confirm('Удалить проект '+id+' и все его параметры? Ссылка на макет перестанет работать. Само видео останется в кабинете.'))return;setBusy(true);try{await api.deleteStatProject(id);window.location.assign('/');}catch(e){setError(e.message);setBusy(false);}}
 function download(){try{const code=projectDataSource(config)+engine;const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const a=document.createElement('a');a.href=url;a.download='project-'+id+'.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}}
 if(login)return <Login onLogin={load}/>;
 if(loading)return <main className="grid min-h-screen place-items-center bg-background text-subtle">Загрузка проекта…</main>;
 if(!project)return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><div><p role="alert">{error}</p><a href="/" className={button+' mt-4'}>В кабинет</a><button onClick={load} className={button+' ml-2'}>Повторить</button></div></main>;
 const tabs=[['overview','Обзор'],['viewers','Зрители'],['engagement','Вовлеченность']];
 const field=(label,path,options={})=>{let value=config;for(const key of path.split('.'))value=value[key];return <Field label={label} value={value} onChange={v=>change(path,v)} {...options}/>;};
 const series=(label,path,max,help)=>{let values=config;for(const key of path.split('.'))values=values[key];return <Series key={path} label={label} values={values} onChange={v=>change(path,v)} max={max} help={help}/>;};
 return <WorkspaceShell breadcrumb={title||'Проект макета'} onAgent={()=>document.querySelector('textarea[aria-label="Запрос к AI-ассистенту"]')?.focus()}><main className="project-page text-foreground"><div className="mx-auto max-w-[1440px]">
  <a href="/" className="inline-flex items-center gap-2 text-xs text-subtle hover:text-foreground"><ArrowLeft size={13}/>Ваши видео</a>
  <header className="mt-6 flex flex-wrap justify-between items-start gap-5"><div><p className="text-[10px] uppercase tracking-widest text-subtle">MyElement / Макеты</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Проект видео</h1><p className="mt-2 font-mono text-[10px] text-subtle">ID: {id} · v{project.revision}</p></div><div className="flex flex-wrap gap-2"><a href={'/projects/'+id+'/preview'} target="_blank" rel="noreferrer" className={button} title={dirty?'Откроется последняя сохранённая версия':'Открыть сохранённый макет'}>Перейти к макету<ArrowUpRight size={14}/></a><button onClick={download} className={button}><Download size={13}/>Скачать JS</button><button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"><Save size={13}/>{busy?'Сохраняем…':'Сохранить'}</button></div></header>
  {error&&<p role="alert" className="mt-5 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-300">{error} <button onClick={()=>{if(!dirty||window.confirm('Перезагрузить данные? Несохранённые изменения будут потеряны.'))load();}} className="ml-2 underline">Перезагрузить данные</button></p>}
  {notice&&<p role="status" className="mt-5 flex items-center gap-2 text-xs text-green-400"><Check size={13}/>{notice}</p>}
  <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="ui-panel min-w-0 overflow-hidden">
   <nav aria-label="Параметры проекта" className="flex gap-1 overflow-x-auto border-b border-line p-3">{tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={'whitespace-nowrap rounded-lg px-3 py-2 text-xs '+(tab===key?'bg-primary text-primary-foreground':'text-subtle hover:text-foreground hover:bg-elevated')}>{label}</button>)}</nav>
   <form key={formEpoch} onSubmit={save} className="ui-content space-y-6">
    {tab==='overview'&&<>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Название проекта" value={title} onChange={v=>{setTitle(v);setDirty(true);}}/>{field('Длительность ролика, секунды','video.durationSeconds',{type:'number',min:0.01,max:86400,help:'Одно значение для подписи и временных шкал удержания и лайков.'})}</div>
      <div><h2 className="text-sm font-medium mb-4">Пять основных показателей</h2><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{['Просмотры','Лайки','Комментарии','Репосты','Сохранения'].map((label,i)=><Field key={i} label={label} type="number" min={0} step="1" value={config.video.stats[i]} onChange={v=>change('video.stats',config.video.stats.map((n,j)=>j===i?v:n))}/>)}</div><p className="mt-2 text-[10px] text-subtle">Просмотры автоматически используются в верхних счётчиках и карточке метрик.</p></div>
      {field('Ссылка на обложку','video.cover',{type:'url'})}
      {config.video.cover&&/^https?:\/\//i.test(config.video.cover)&&<img src={config.video.cover} alt="Обложка проекта" referrerPolicy="no-referrer" className="h-36 w-24 rounded-xl object-cover border border-line"/>}
      {field('Подпись даты публикации','video.published',{help:'Например: Опубликовано 31 окт 2026, 04:10'})}
      <div><h3 className="text-sm mb-3">Обложки других публикаций</h3><div className="space-y-2">{config.otherCovers.map((url,i)=><div key={i} className="flex items-center gap-2"><input aria-label={'Обложка '+(i+1)} type="url" value={url} onChange={e=>change('otherCovers',config.otherCovers.map((v,j)=>j===i?e.target.value:v))} className={input+' !mt-0'}/><button type="button" onClick={()=>change('otherCovers',config.otherCovers.filter((_,j)=>j!==i))} className="p-2 text-subtle"><X size={14}/></button></div>)}</div><button type="button" onClick={()=>change('otherCovers',[...config.otherCovers,''])} disabled={config.otherCovers.length>=12} className={button+' mt-3'}><Plus size={12}/>Добавить обложку</button></div>

      <div className="border-t border-line pt-6"><h2 className="text-sm font-medium mb-5">Показатели просмотра</h2><div className="grid gap-5 sm:grid-cols-2">{field('Общее время просмотра, секунды','watch.totalSeconds',{type:'number',min:0,step:'1',help:'Суммарное время всех просмотров. Это не длительность самого ролика.'})}{field('Среднее время просмотра, секунды','watch.averageSeconds',{type:'number',min:0,max:config.video.durationSeconds})}{field('Просмотрели полностью, %','watch.completionPercent',{type:'number',min:0,max:100})}{field('Новые подписчики','watch.subscribers',{type:'number',min:0,step:'1'})}</div><div className="rounded-xl border border-line bg-elevated p-4 text-xs leading-relaxed text-subtle">Общее время автоматически форматируется в часы, минуты и секунды. Средний просмотр: <span className="text-foreground">{Math.round(config.watch.averageSeconds/config.video.durationSeconds*1000)/10}%</span> длительности ролика — процент для подписи удержания вычисляется автоматически.</div></div>
      <div className="border-t border-line pt-6"><h2 className="text-sm font-medium mb-5">Графики просмотров и удержания</h2><div className="space-y-6">
      {series('Просмотры по часам','viewsByHour',1e12,'От двух точек. Один элемент — один час; последняя отметка времени и масштаб графика определяются автоматически.')}
      {series('Метки оси Y просмотров','viewsTicks',1e12)}
      {series('Удержание, %','retention',100,'От двух точек от начала до конца ролика. Временная шкала использует длительность из раздела «Обзор».')}
</div></div>
      <Rows label="Источники трафика" rows={config.sources} bounds={config.bounds?.sources} onBoundsChange={v=>change('bounds.sources',v)} onChange={v=>change('sources',v)}/>
    </>}
    {tab==='viewers'&&<>
      {field('Всего зрителей','totalViewers',{type:'number',min:0,step:'1'})}

      <ViewerTypeRanges pairs={config.viewerTypes} bounds={config.bounds?.viewerTypes} onChange={v=>change('viewerTypes',v)} onBoundsChange={v=>change('bounds.viewerTypes',v)}/>
      <Rows label="Пол" rows={config.gender} bounds={config.bounds?.gender} onBoundsChange={v=>change('bounds.gender',v)} onChange={v=>change('gender',v)}/><Rows label="Возраст" rows={config.ages} bounds={config.bounds?.ages} onBoundsChange={v=>change('bounds.ages',v)} onChange={v=>change('ages',v)}/><Rows label="Места" rows={config.places} bounds={config.bounds?.places} onBoundsChange={v=>change('bounds.places',v)} onChange={v=>change('places',v)}/>
        </>}
    {tab==='engagement'&&<>      {series('Лайки по ходу видео, %','likes.values',100)}
      {series('Метки оси Y лайков, %','likes.ticks',100)}
      {field('Текст под графиком лайков','likes.text')}
        </>}
    <div className="flex items-center justify-between gap-3 border-t border-line pt-5"><span className="text-[10px] text-subtle">{dirty?'Есть несохранённые изменения':'Все изменения сохранены'}</span><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">Сохранить значения</button></div>
   </form>
  </div>
  <ProjectAssistant projectId={id} title={title} config={config} onApply={next=>{setConfig(validateProjectConfig(next));setDirty(true);setNotice('Предложение AI применено к полям. Сохраните проект, чтобы обновить макет.');setFormEpoch(v=>v+1);}} />
  </div>
  <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[10px] text-subtle"><p>Сохранено: {new Date(project.updatedAt).toLocaleString('ru-RU')} · Данные этого проекта не меняют статистику видео в кабинете.</p><button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 px-3 py-2 text-xs text-red-400 hover:bg-red-400/5 disabled:opacity-40"><Trash2 size={12}/>Удалить проект</button></footer>
 </div></main></WorkspaceShell>;
}
