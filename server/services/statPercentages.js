const TOTAL=10000;
const units=n=>Math.round(Number(n)*100);
export function percentageSum(rows){return rows.reduce((sum,row)=>sum+units(row[1]),0)/100;}
export function defaultBounds(rows){return rows.map(()=>[0,100]);}
function checkedBounds(bounds){return bounds.map((row,i)=>{if(!Array.isArray(row)||row.length!==2||row.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)||row[0]>row[1])throw Error('Строка '+(i+1)+': минимум и максимум должны быть от 0 до 100, минимум не больше максимума');return row.map(units);});}
export function distributePercentages(bounds,random=Math.random){
 const limits=checkedBounds(bounds);if(!limits.length)throw Error('Добавьте хотя бы одну строку');
 const sumMin=limits.reduce((s,r)=>s+r[0],0),sumMax=limits.reduce((s,r)=>s+r[1],0);
 if(sumMin>TOTAL)throw Error('Сумма минимумов больше 100%. Уменьшите минимумы.');
 if(sumMax<TOTAL)throw Error('Сумма максимумов меньше 100%. Увеличьте максимумы.');
 const order=limits.map((_,i)=>i);
 const rand=(lo,hi)=>lo+Math.min(hi-lo,Math.floor(Math.max(0,Math.min(0.999999999,random()))*(hi-lo+1)));
 for(let i=order.length-1;i>0;i--){const j=rand(0,i);[order[i],order[j]]=[order[j],order[i]];}
 const result=Array(limits.length).fill(0);let rest=TOTAL;
 for(let k=0;k<order.length;k++){const i=order[k],tail=order.slice(k+1);const lo=Math.max(limits[i][0],rest-tail.reduce((s,j)=>s+limits[j][1],0)),hi=Math.min(limits[i][1],rest-tail.reduce((s,j)=>s+limits[j][0],0));const value=rand(lo,hi);result[i]=value;rest-=value;}
 return result.map(n=>n/100);
}
function weightedAllocation(bounds,weights,target=TOTAL){
 const limits=checkedBounds(bounds),result=limits.map(r=>r[0]);let rest=target-result.reduce((a,b)=>a+b,0);
 if(rest<0||limits.reduce((s,r)=>s+r[1],0)<target)throw Error('Эти диапазоны не позволяют получить сумму 100%');
 while(rest>0){const active=limits.map((r,i)=>i).filter(i=>result[i]<limits[i][1]);if(!active.length)throw Error('Недостаточно свободных процентов');const weightSum=active.reduce((s,i)=>s+Math.max(0,weights[i]||0),0);const before=rest;
  const shares=active.map(i=>({i,share:before*(weightSum?Math.max(0,weights[i]||0)/weightSum:1/active.length)}));
  for(const {i,share}of shares){const add=Math.min(rest,limits[i][1]-result[i],Math.floor(share));result[i]+=add;rest-=add;}
  if(rest===before){shares.sort((a,b)=>b.share-a.share);for(const {i}of shares){if(!rest)break;result[i]++;rest--;}}
 }
 return result;
}
export function normalizePercentages(rows,bounds=defaultBounds(rows)){
 if(!rows.length)return rows;
 return weightedAllocation(bounds,rows.map(r=>Number(r[1])||0)).map((n,i)=>[rows[i][0],n/100,...rows[i].slice(2)]);
}
export function updatePercentage(rows,index,value,bounds=defaultBounds(rows)){
 const limits=checkedBounds(bounds),others=rows.map((_,i)=>i).filter(i=>i!==index);
 const lo=Math.max(limits[index][0],TOTAL-others.reduce((s,i)=>s+limits[i][1],0)),hi=Math.min(limits[index][1],TOTAL-others.reduce((s,i)=>s+limits[i][0],0));
 if(lo>hi)throw Error('Эти диапазоны не позволяют получить сумму 100%');
 const fixed=Math.max(lo,Math.min(hi,units(Number.isFinite(value)?value:0)));
 const allocated=weightedAllocation(others.map(i=>bounds[i]),others.map(i=>rows[i][1]),TOTAL-fixed);
 const result=rows.map(r=>[...r]);result[index][1]=fixed/100;others.forEach((i,j)=>{result[i][1]=allocated[j]/100;});return result;
}
export function effectivePercentageBounds(rows,bounds=defaultBounds(rows),frozen=[]){
 return rows.map((row,i)=>frozen[i]?[row[1],row[1]]:(bounds[i]||[0,100]));
}
export function manualPercentage(rows,index,value,bounds=defaultBounds(rows),frozen=[]){
 if(frozen[index])throw Error('Эта доля заморожена. Сначала снимите заморозку.');
 const limits=checkedBounds(bounds);const used=rows.reduce((sum,row,i)=>sum+(i===index?0:units(row[1])),0);
 const max=Math.min(limits[index][1],TOTAL-used);if(max<limits[index][0])throw Error('Для этой доли не хватает свободных процентов. Сначала уменьшите другие значения.');
 const result=rows.map(row=>[...row]);result[index][1]=Math.max(limits[index][0],Math.min(max,units(Number.isFinite(value)?value:0)))/100;
 return result;
}
export function repairProjectPercentages(raw){
 const c=structuredClone(raw);c.calculation=c.calculation&&typeof c.calculation==='object'&&!Array.isArray(c.calculation)?c.calculation:{};c.bounds=c.bounds&&typeof c.bounds==='object'&&!Array.isArray(c.bounds)?c.bounds:{};
 for(const field of ['sources','gender','ages','places']){
  if(Array.isArray(c[field])&&c[field].length){if(Math.round(percentageSum(c[field])*100)!==TOTAL)c[field]=normalizePercentages(c[field]);c.bounds[field]=c[field].map((_,i)=>c.bounds[field]?.[i]||[0,100]);c.calculation[field]={auto:c.calculation[field]?.auto!==false,frozen:c[field].map((_,i)=>!!c.calculation[field]?.frozen?.[i])};}
 }
 if(Array.isArray(c.viewerTypes)){c.viewerTypes=c.viewerTypes.map(pair=>{const [left,right]=normalizePercentages([pair.left,pair.right]);return{left,right};});c.bounds.viewerTypes=c.viewerTypes.map((_,i)=>c.bounds.viewerTypes?.[i]||[0,100]);}
 return c;
}
