import {useEffect,useRef,useState} from 'react';
import {Bot,Send,Plus,Check,MessageSquare,LoaderCircle,RotateCcw,Sparkles} from 'lucide-react';
import {api} from './api';
const templates=[
 {label:'Страны · 100%',text:'Обнови список стран и процентное соотношение каждой, чтобы сумма была ровно 100%. Тема ролика — занос. Предложи распределение для макета, остальные параметры не меняй.'},
 {label:'Источники трафика',text:'Предложи источники трафика для игрового ролика на тему заноса. Сумма должна быть 100%. Измени только sources.'},
 {label:'Пол и возраст',text:'Предложи распределение пола и возраста для макета игрового ролика. В каждом списке сумма 100%. Меняй только gender и ages.'},
 {label:'График удержания',text:'Предложи плавный график удержания для текущей длительности ролика. Измени только retention; все значения от 0 до 100.'},
];
function history(id){try{const data=JSON.parse(sessionStorage.getItem('project-chat:'+id)||'[]');return Array.isArray(data)?data.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-20):[];}catch{return[];}}
export default function ProjectAssistant({projectId,config,title,onApply}){
 const [messages,setMessages]=useState(()=>history(projectId)),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const textarea=useRef(null),end=useRef(null);
 useEffect(()=>{try{sessionStorage.setItem('project-chat:'+projectId,JSON.stringify(messages.slice(-20).map(({id,role,content})=>({id,role,content}))));}catch{}end.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,projectId]);
 async function send(e){e.preventDefault();if(busy||!input.trim())return;const text=input.trim();const base=JSON.stringify(config);const current=[...messages,{id:crypto.randomUUID(),role:'user',content:text}];setMessages(current);setInput('');setBusy(true);setError('');
  try{const result=await api.projectAssistant(projectId,{config,title,messages:current.slice(-12).map(({role,content,proposal})=>({role,content:(content+(proposal?'\nПредложенные параметры: '+JSON.stringify(Object.fromEntries(proposal.fields.map(f=>[f.key,proposal.config[f.key]]))):'')).slice(0,4000)}))});setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',content:result.message,proposal:result,base}]);}
  catch(e){setMessages(m=>m.filter(item=>item.id!==current.at(-1).id));setError(e.message);setInput(text);}finally{setBusy(false);}
 }
 function apply(message){if(JSON.stringify(config)!==message.base){setError('Параметры изменились после ответа AI. Отправьте запрос ещё раз, чтобы сохранить ваши последние изменения.');return;}onApply(message.proposal.config);setMessages(m=>m.map(item=>item.id===message.id?{...item,applied:true}:item));setError('');}
 return <aside className="ui-panel project-assistant flex h-[680px] min-h-0 flex-col overflow-hidden xl:sticky xl:top-6 xl:max-h-[calc(100dvh-48px)]">
  <header className="flex items-center justify-between gap-3 border-b border-line p-6"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-elevated"><Sparkles size={16}/></span><div><h2 className="text-sm font-semibold">Ассистент проекта</h2><p className="mt-0.5 text-[10px] text-muted">Параметры, проценты и графики</p></div></div><button title="Новый диалог" aria-label="Новый диалог" disabled={busy} onClick={()=>{setMessages([]);setError('');}} className="rounded-lg p-2 text-muted hover:bg-elevated disabled:opacity-30"><RotateCcw size={14}/></button></header>
  <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5" aria-live="polite" aria-busy={busy}>
   {!messages.length&&<div className="py-6"><MessageSquare size={25} className="mb-4 text-muted"/><h3 className="text-base font-medium tracking-tight">Что изменить в макете?</h3><p className="mt-2 text-xs leading-relaxed text-muted">Я вижу текущие поля проекта и предложу новые значения. Вы сможете проверить и применить их перед сохранением.</p></div>}
   {messages.map(m=><article key={m.id} className={m.role==='user'?'ml-6 rounded-2xl border border-line bg-elevated p-3.5':'space-y-3'}>
    {m.role==='assistant'&&<div className="flex items-center gap-1.5 text-[10px] font-medium text-muted"><Bot size={12}/>AI-ассистент</div>}
    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</p>
    {!!m.proposal?.fields.length&&<div className="rounded-xl border border-line p-3"><p className="text-[10px] text-muted mb-2">Предложенные изменения</p><div className="flex flex-wrap gap-1.5">{m.proposal.fields.map(f=><span key={f.key} className="rounded-md bg-elevated px-2 py-1 text-[10px]">{f.label}</span>)}</div>
     {m.proposal.fields.some(f=>f.key==='places')&&<div className="mt-3 border-t border-line pt-2"><div className="max-h-36 overflow-y-auto">{m.proposal.config.places.map(([country,percent])=><div key={country} className="flex justify-between gap-3 py-1 text-[11px]"><span>{country}</span><span className="font-mono tabular-nums">{percent}%</span></div>)}</div><p className="mt-2 text-[10px] text-muted">Итого: 100%</p></div>}
     <details className="mt-3 text-[10px] text-muted"><summary className="cursor-pointer">Все предложенные значения</summary><pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-inset p-2 text-[10px]">{JSON.stringify(Object.fromEntries(m.proposal.fields.map(f=>[f.key,m.proposal.config[f.key]])),null,2)}</pre></details>
     <button disabled={m.applied||busy} onClick={()=>apply(m)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground disabled:opacity-40">{m.applied?<Check size={12}/>:<Plus size={12}/>} {m.applied?'Применено в поля':'Применить в поля'}</button>
    </div>}
   </article>)}
   {busy&&<p className="flex items-center gap-2 text-xs text-muted"><LoaderCircle size={13} className="animate-spin"/>Подбираю параметры…</p>}
   <div ref={end}/>
  </div>
  <div className="shrink-0 border-t border-line p-4 space-y-3"><div className="grid grid-cols-2 gap-2">{templates.map(t=><button key={t.label} disabled={busy} onClick={()=>{setInput(t.text);textarea.current?.focus();}} className="rounded-lg border border-line px-2.5 py-2 text-left text-[10px] text-muted hover:bg-elevated hover:text-foreground disabled:opacity-30">{t.label}</button>)}</div>
   {error&&<p role="alert" className="text-[11px] leading-relaxed text-red-400">{error}</p>}
   <form onSubmit={send} className="rounded-xl border border-line bg-inset p-2"><textarea ref={textarea} aria-label="Запрос к AI-ассистенту" placeholder="Например: страны для ролика про занос…" maxLength={4000} rows={3} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form.requestSubmit();}}} className="w-full resize-none bg-transparent p-1.5 text-xs leading-relaxed outline-none placeholder:text-muted"/><div className="flex justify-between items-center gap-2"><span className="pl-1.5 text-[9px] text-muted">Enter — отправить</span><button disabled={busy||!input.trim()} aria-label="Отправить запрос" className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30"><Send size={13}/></button></div></form>
   <p className="text-[9px] leading-relaxed text-muted">AI предлагает параметры макета. После применения нажмите «Сохранить» на странице проекта.</p>
  </div>
 </aside>;
}
