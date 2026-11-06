import {useState} from 'react';
import {Plus,X,RefreshCw,SlidersHorizontal} from 'lucide-react';
import {defaultBounds,distributePercentages,normalizePercentages,percentageSum,updatePercentage} from '../server/services/statPercentages';
const field='h-9 w-full min-w-0 rounded-lg border border-line bg-inset px-2 text-xs text-foreground outline-none focus:border-foreground/40';
const action='inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[10px] text-muted hover:bg-elevated hover:text-foreground';
export default function PercentRows({label,rows,bounds,onChange,onBoundsChange}){
 const [expanded,setExpanded]=useState(true),[error,setError]=useState('');
 const ranges=rows.map((_,i)=>bounds?.[i]||[0,100]);
 const total=percentageSum(rows);
 function setBound(i,side,value){onBoundsChange(ranges.map((r,j)=>i===j?r.map((n,k)=>k===side?Number(value):n):r));setError('');}
 function regenerate(){try{const values=distributePercentages(ranges);onChange(rows.map((r,i)=>[r[0],values[i],...r.slice(2)]));setError('');}catch(e){setError(e.message);}}
 function edit(i,value){try{onChange(updatePercentage(rows,i,Number(value),ranges));setError('');}catch(e){setError(e.message);}}
 function add(){onChange([...rows,['Новая строка',0,false]]);onBoundsChange([...ranges,[0,100]]);setError('');}
 function remove(index){try{const nextBounds=ranges.filter((_,i)=>i!==index);const next=normalizePercentages(rows.filter((_,i)=>i!==index),nextBounds);onChange(next);onBoundsChange(nextBounds);setError('');}catch(e){setError('После удаления не получится распределить 100%. Сначала увеличьте максимумы остальных строк.');}}
 return <section className="rounded-xl border border-line p-4 space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h3 className="text-sm font-medium">{label}</h3><span className={'rounded-full px-2 py-0.5 text-[10px] font-mono '+(total===100?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400')}>{total}% / 100%</span></div><div className="flex gap-1.5"><button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className={action} title="Показать минимумы и максимумы"><SlidersHorizontal size={12}/>{expanded?'Скрыть диапазоны':'Диапазоны'}</button><button type="button" onClick={regenerate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-[10px] font-medium text-primary-foreground"><RefreshCw size={12}/>Обновить данные</button></div></div>
  <div className="overflow-x-auto"><div className={expanded?'min-w-[400px]':'min-w-[290px]'}>
   <div className={'grid items-center gap-2 pb-2 text-[9px] text-subtle '+(expanded?'grid-cols-[minmax(110px,1fr)_58px_58px_72px_28px_24px]':'grid-cols-[minmax(110px,1fr)_72px_28px_24px]')}><span>Название</span>{expanded&&<><span>Мин, %</span><span>Макс, %</span></>}<span>Доля, %</span><span/><span/></div>
   <div className="space-y-2">{rows.map((row,i)=><div key={i} className={'grid items-center gap-2 '+(expanded?'grid-cols-[minmax(110px,1fr)_58px_58px_72px_28px_24px]':'grid-cols-[minmax(110px,1fr)_72px_28px_24px]')}>
    <input aria-label={label+' — название '+(i+1)} value={row[0]} maxLength={200} onChange={e=>onChange(rows.map((r,j)=>j===i?[e.target.value,...r.slice(1)]:r))} className={field}/>
    {expanded&&<><input aria-label={label+' — минимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][0]} onChange={e=>setBound(i,0,e.target.value)} className={field}/><input aria-label={label+' — максимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][1]} onChange={e=>setBound(i,1,e.target.value)} className={field}/></>}
    <input aria-label={label+' — процент '+(i+1)} type="number" min={0} max={100} step="0.01" value={row[1]} onChange={e=>edit(i,e.target.value)} className={field}/>
    <label title="Показывать стрелку" className="flex justify-center"><input aria-label={label+' — стрелка '+(i+1)} type="checkbox" checked={!!row[2]} onChange={e=>onChange(rows.map((r,j)=>j===i?[r[0],r[1],e.target.checked]:r))}/></label><button type="button" disabled={rows.length<=1} title="Удалить строку" onClick={()=>remove(i)} className="p-1 text-subtle hover:text-red-400 disabled:opacity-20"><X size={13}/></button>
   </div>)}</div>
  </div></div>
  {error&&<p role="alert" className="text-[11px] text-red-400">{error}</p>}
  <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={add} disabled={rows.length>=60} className={action}><Plus size={12}/>Добавить строку</button><p className="text-[9px] text-subtle">Остаток распределяется автоматически. Сумма всегда 100%.</p></div>
 </section>;
}
export function ViewerTypeRanges({pairs,bounds,onChange,onBoundsChange}){
 const [error,setError]=useState('');const ranges=pairs.map((_,i)=>bounds?.[i]||[0,100]);
 function updatePair(i,left){const value=Math.round(Math.max(ranges[i][0],Math.min(ranges[i][1],Number(left)||0))*100)/100;onChange(pairs.map((p,j)=>j===i?{left:[p.left[0],value],right:[p.right[0],Math.round((100-value)*100)/100]}:p));setError('');}
 function generate(index){try{const values=distributePercentages([ranges[index],[100-ranges[index][1],100-ranges[index][0]]]);updatePair(index,values[0]);}catch(e){setError(e.message);}}
 function changeBound(i,side,v){onBoundsChange(ranges.map((r,j)=>j===i?r.map((n,k)=>k===side?Number(v):n):r));setError('');}
 return <section className="space-y-3"><h3 className="text-sm font-medium">Типы зрителей</h3>{pairs.map((pair,i)=><div key={i} className="rounded-xl border border-line p-4 space-y-3">
  <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">Сумма: 100%</span><button type="button" onClick={()=>generate(i)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-[10px] text-primary-foreground"><RefreshCw size={12}/>Обновить данные</button></div>
  <div className="grid grid-cols-2 gap-3">{['left','right'].map(side=><label key={side} className="block text-[10px] text-muted">{side==='left'?'Основная группа':'Остаток до 100%'}<input aria-label={'Тип зрителей — название '+side+' '+(i+1)} value={pair[side][0]} maxLength={200} onChange={e=>onChange(pairs.map((p,j)=>j===i?{...p,[side]:[e.target.value,p[side][1]]}:p))} className={field+' mt-2'}/><input aria-label={'Тип зрителей — процент '+side+' '+(i+1)} type="number" min={0} max={100} step="0.01" readOnly={side==='right'} value={pair[side][1]} onChange={e=>updatePair(i,e.target.value)} className={field+' mt-2 '+(side==='right'?'text-subtle':'')}/></label>)}</div>
  <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-muted">Минимум основной группы, %<input aria-label={'Тип зрителей — минимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][0]} onChange={e=>changeBound(i,0,e.target.value)} className={field+' mt-2'}/></label><label className="text-[10px] text-muted">Максимум основной группы, %<input aria-label={'Тип зрителей — максимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][1]} onChange={e=>changeBound(i,1,e.target.value)} className={field+' mt-2'}/></label></div>
  <p className="text-[10px] leading-relaxed text-subtle">Второе значение = 100 − первое. При 95% новых зрителей вернувшихся будет 5%.</p>
 </div>)}{error&&<p role="alert" className="text-xs text-red-400">{error}</p>}</section>;
}
