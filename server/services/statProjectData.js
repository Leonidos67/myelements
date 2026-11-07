import defaults from '../data/stat-project-defaults.js';
import {percentageSum,repairProjectPercentages} from './statPercentages.js';
export const defaultProjectConfig = () => repairProjectPercentages(JSON.parse(JSON.stringify(defaults)));
const monthLabels = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
const monthPrefixes = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function publicationCalendarDate(text) {
  const iso = text?.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (calendarDate(iso)) return iso;
  const match = text?.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\.?\s+(\d{4})/u);
  if (!match) return '';
  const [, day, month, year] = match;
  const monthIndex = monthPrefixes.findIndex(prefix => month.startsWith(prefix));
  if (monthIndex === -1) return '';
  const date = [year, String(monthIndex + 1).padStart(2, '0'), day.padStart(2, '0')].join('-');
  return calendarDate(date) ? date : '';
}

export function viewsDateLabels(config) {
  const start = calendarDate(config.viewsStartDate || publicationCalendarDate(config.video.published));
  if (!start || !config.viewsByHour.length) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + config.viewsByHour.length - 1);
  const label = date => date.getUTCDate() + ' ' + monthLabels[date.getUTCMonth()];
  return [label(start), label(end)];
}

export function validateProjectConfig(raw) {
  const fail = message => { throw Error(message); };
  const obj = (v,label) => v && typeof v === 'object' && !Array.isArray(v) ? v : fail('Проверьте раздел «'+label+'»');
  const text = (v,label,max=500) => typeof v === 'string' && v.length <= max ? v : fail(label+': недопустимый текст');
  const number = (v,label,min=0,max=1e12,integer=false) => typeof v==='number' && Number.isFinite(v) && v>=min && v<=max && (!integer || Number.isSafeInteger(v)) ? v : fail(label+': число от '+min+' до '+max);
  const url = (v,label) => { text(v,label,2000); if(!v)return ''; try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol))fail(label+': нужна HTTP(S)-ссылка');return u.href;}catch{fail(label+': нужна корректная HTTP(S)-ссылка');} };
  const list = (v,label,min=1,max=500) => Array.isArray(v)&&v.length>=min&&v.length<=max ? v : fail(label+': допустимо от '+min+' до '+max+' значений');
  const series = (v,label,max=1e12,minLength=2) => list(v,label,minLength).map(n=>number(n,label,0,max));
  const rows = (v,label) => list(v,label,1,60).map(row=>{list(row,label,2,3);const r=[text(row[0],label,200),number(row[1],label,0,100)];if(row[2]!==undefined){if(typeof row[2]!=='boolean')fail(label+': неверная отметка');r.push(row[2]);}return r;});
  const percentRows=(v,label)=>{const result=rows(v,label);if(Math.round(percentageSum(result)*100)!==10000)fail(label+': сумма должна быть ровно 100%');return result;};
  obj(raw,'Данные'); const v=obj(raw.video,'Видео'), w=obj(raw.watch,'Просмотр'), l=obj(raw.likes,'Лайки');
  const duration=number(v.durationSeconds,'Длительность',0.01,86400);
  const stats=list(v.stats,'Основные показатели',5,5).map(n=>number(n,'Основные показатели',0,1e12,true));
  const viewsTimeUnit = raw.viewsTimeUnit === undefined ? 'hour' : raw.viewsTimeUnit;
  if (viewsTimeUnit !== 'hour' && viewsTimeUnit !== 'day') fail('Выберите часы или дни для графика просмотров');
  const viewsStartDate = raw.viewsStartDate ?? '';
  if (viewsStartDate !== '' && !calendarDate(viewsStartDate)) fail('Проверьте начальную дату графика');
  const result={
    video:{durationSeconds:duration,cover:url(v.cover,'Обложка'),published:text(v.published,'Дата публикации'),stats},
    watch:{totalSeconds:number(w.totalSeconds,'Общее время',0,1e12,true),averageSeconds:number(w.averageSeconds,'Среднее время',0,duration),completionPercent:number(w.completionPercent,'Полные просмотры',0,100),subscribers:number(w.subscribers,'Подписчики',0,1e12,true)},
    viewsTimeUnit, viewsStartDate,
    viewsByHour:series(raw.viewsByHour,'Точки графика просмотров'),viewsTicks:series(raw.viewsTicks,'Метки просмотров',1e12,1),retention:series(raw.retention,'Удержание',100),
    sources:percentRows(raw.sources,'Источники'),totalViewers:number(raw.totalViewers,'Всего зрителей',0,1e12,true),
    viewerTypes:list(raw.viewerTypes,'Типы зрителей',1,8).map(t=>{obj(t,'Типы зрителей');const pair={left:rows([t.left],'Типы зрителей')[0],right:rows([t.right],'Типы зрителей')[0]};if(Math.round((pair.left[1]+pair.right[1])*100)!==10000)fail('Типы зрителей: сумма каждой пары должна быть 100%');return pair;}),
    gender:percentRows(raw.gender,'Пол'),ages:percentRows(raw.ages,'Возраст'),places:percentRows(raw.places,'Места'),
    likes:{values:series(l.values,'График лайков',100),ticks:series(l.ticks,'Метки лайков',100,1),text:text(l.text,'Описание лайков',2000)},
    calculation:Object.fromEntries(['sources','gender','ages','places'].map(field=>{const settings=raw.calculation?.[field];if(settings?.auto!==undefined&&typeof settings.auto!=='boolean')fail('Неверный режим подсчёта');if(settings?.frozen!==undefined&&(!Array.isArray(settings.frozen)||settings.frozen.some(v=>typeof v!=='boolean')))fail('Неверные флаги заморозки');return[field,{auto:settings?.auto!==false,frozen:raw[field].map((_,i)=>settings?.frozen?.[i]||false)}];})),
    bounds:Object.fromEntries(['sources','gender','ages','places','viewerTypes'].map(field=>[field,list(raw[field],'Диапазоны '+field,1,field==='viewerTypes'?8:60).map((_,i)=>{const bound=raw.bounds?.[field]?.[i]||[0,100];list(bound,'Диапазон',2,2);const min=number(bound[0],'Минимум',0,100),max=number(bound[1],'Максимум',0,100);if(min>max)fail('Минимум не должен быть больше максимума');return[min,max];})])),
    otherCovers:list(raw.otherCovers,'Другие обложки',0,12).map(u=>url(u,'Другая обложка')),
  };
  for(const field of ['sources','gender','ages','places']){
    const bounds=result.bounds[field];
    if(bounds.reduce((s,r)=>s+Math.round(r[0]*100),0)>10000||bounds.reduce((s,r)=>s+Math.round(r[1]*100),0)<10000)fail(field+': диапазоны должны позволять распределить ровно 100%');
    result[field].forEach((row,i)=>{if(Math.round(row[1]*100)<Math.round(bounds[i][0]*100)||Math.round(row[1]*100)>Math.round(bounds[i][1]*100))fail(field+': значение выходит за диапазон. Нажмите «Обновить данные».');});
  }
  result.viewerTypes.forEach((pair,i)=>{const [min,max]=result.bounds.viewerTypes[i];if(pair.left[1]<min||pair.left[1]>max)fail('Типы зрителей: значение выходит за диапазон. Нажмите «Обновить данные».');});
  return result;
}
export function projectData(raw) {
  const c=validateProjectConfig(repairProjectPercentages(raw)), w=c.watch, duration=c.video.durationSeconds;
  const total=w.totalSeconds;
  return {
    ...c,video:{...c.video,duration:duration+' с.'},
    metrics:{views:{label:'Просмотры видео',value:c.video.stats[0]},total:{label:'Общее время просмотра',value:Math.floor(total/3600)+' ч.:'+Math.floor(total%3600/60)+' мин.:'+total%60+' с.'},avg:{label:'Среднее время просмотра',value:w.averageSeconds+' с.'},full:{label:'Просмотрели видео полностью',value:w.completionPercent+'%'},subs:{label:'Новые подписчики',value:w.subscribers}},
    viewsDateLabels: c.viewsTimeUnit === 'day' ? viewsDateLabels(c) : null,
    avgWatchedPercent:Math.round(w.averageSeconds/duration*1000)/10,
  };
}
export function projectDataSource(config) {
  return 'const DATA = '+JSON.stringify(projectData(config)).replace(/</g,'\\u003c')+';\n';
}
