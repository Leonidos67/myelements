import {useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {distributePercentages} from '../server/services/statPercentages';
const field='h-9 w-full min-w-0 rounded-lg border border-line bg-inset px-2 text-xs text-foreground outline-none focus:border-foreground/40';
export function ViewerTypeRanges({pairs,bounds,onChange,onBoundsChange}){
 const [error,setError]=useState('');const ranges=pairs.map((_,i)=>bounds?.[i]||[0,100]);
 function updatePair(i,left){const value=Math.round(Math.max(ranges[i][0],Math.min(ranges[i][1],Number(left)||0))*100)/100;onChange(pairs.map((p,j)=>j===i?{left:[p.left[0],value],right:[p.right[0],Math.round((100-value)*100)/100]}:p));setError('');}
 function generate(index){try{const values=distributePercentages([ranges[index],[100-ranges[index][1],100-ranges[index][0]]]);updatePair(index,values[0]);}catch(e){setError(e.message);}}
 function changeBound(i,side,v){onBoundsChange(ranges.map((r,j)=>j===i?r.map((n,k)=>k===side?Number(v):n):r));setError('');}
 return <section className="space-y-3"><h3 className="text-sm font-medium">Типы зрителей</h3>{pairs.map((pair,i)=><div key={i} className="rounded-xl border border-line p-4 space-y-3">
  <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">Сумма: {Math.round((pair.left[1] + pair.right[1]) * 100) / 100}%</span><button type="button" onClick={()=>generate(i)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-[10px] text-primary-foreground"><RefreshCw size={12}/>Обновить данные</button></div>
  <div className="grid grid-cols-2 gap-3">{['left','right'].map(side=><label key={side} className="block text-[10px] text-muted">{side==='left'?'Основная группа':'Остаток до 100%'}<input aria-label={'Тип зрителей — название '+side+' '+(i+1)} value={pair[side][0]} maxLength={200} onChange={e=>onChange(pairs.map((p,j)=>j===i?{...p,[side]:[e.target.value,p[side][1]]}:p))} className={field+' mt-2'}/><input aria-label={'Тип зрителей — процент '+side+' '+(i+1)} type="number" min={0} max={100} step="0.01" readOnly={side==='right'} value={pair[side][1]} onChange={e=>updatePair(i,e.target.value)} className={field+' mt-2 '+(side==='right'?'text-subtle':'')}/></label>)}</div>
  <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-muted">Минимум основной группы, %<input aria-label={'Тип зрителей — минимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][0]} onChange={e=>changeBound(i,0,e.target.value)} className={field+' mt-2'}/></label><label className="text-[10px] text-muted">Максимум основной группы, %<input aria-label={'Тип зрителей — максимум '+(i+1)} type="number" min={0} max={100} step="0.01" value={ranges[i][1]} onChange={e=>changeBound(i,1,e.target.value)} className={field+' mt-2'}/></label></div>
  <p className="text-[10px] leading-relaxed text-subtle">Второе значение = 100 − первое. При 95% новых зрителей вернувшихся будет 5%.</p>
 </div>)}{error&&<p role="alert" className="text-xs text-red-400">{error}</p>}</section>;
}
