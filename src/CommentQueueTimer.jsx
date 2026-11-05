import { useEffect, useState } from 'react';
import { Clock3, RotateCcw } from 'lucide-react';
import { forecastQueue } from '../server/services/commentTiming';
import { api } from './api';
const time = date => new Date(date).toLocaleTimeString('ru-RU');
export default function CommentQueueTimer({page,onReset}) {
  const [now,setNow]=useState(Date.now());
  const [offset,setOffset]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setOffset(page.serverTime ? new Date(page.serverTime)-Date.now() : 0);},[page.serverTime]);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const current=now+offset;
  const left=Math.max(0,Math.ceil((new Date(page.nextAvailableAt||0)-current)/1000));
  const forecast=forecastQueue((page.completed||[]).map(c=>c.issuedAt),page.nextAvailableAt,current);
  async function reset(){setBusy(true);setError('');try{await api.resetCommentTimer(page._id);await onReset();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-gray-400"><Clock3 size={14}/>Таймер выдачи</span><span className={'rounded-full px-2 py-1 text-[10px] '+(!page.remaining?'text-gray-500 bg-white/5':left?'text-amber-300 bg-amber-300/10':'text-green-400 bg-green-400/10')}>{!page.remaining?'Набор завершён':left?'Пауза':'Выдача открыта'}</span></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-3xl tabular-nums">{!page.remaining?'—':String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0')}</p><p className="mt-1 text-[10px] text-gray-500">{!page.remaining?'Все комментарии получили':left?'Следующая выдача после '+time(page.nextAvailableAt):'Комментарий можно получить сейчас'}</p></div><button onClick={reset} disabled={busy||!left||!page.remaining} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-medium text-black hover:bg-gray-200 disabled:opacity-30"><RotateCcw size={12} className={busy?'animate-spin':''}/>{busy?'Сбрасываем…':'Сбросить таймер'}</button></div>
    {!!page.remaining&&<div className="mt-4 border-t border-white/5 pt-3"><p className="text-[10px] text-gray-500 mb-2">Дальше, если комментарии забирают сразу</p><div className="grid grid-cols-3 gap-2">{forecast.slice(0,Math.min(3,page.remaining)).map((step,i)=><div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2"><p className="text-[9px] text-gray-500">Выдача {i+1} · {time(step.at)}</p><p className="mt-1 text-[11px] text-gray-300">Пауза {step.pause<60?step.pause+' сек':step.pause/60+' мин'}</p></div>)}</div><p className="mt-2 text-[9px] text-gray-600">Прогноз зависит от активности. Сброс снимает текущую паузу; после выдачи включится следующая.</p></div>}
    {error&&<p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
  </section>;
}
