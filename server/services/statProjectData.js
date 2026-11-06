import defaults from '../data/stat-project-defaults.js';
export const defaultProjectConfig = () => JSON.parse(JSON.stringify(defaults));
export function validateProjectConfig(raw) {
  const fail = message => { throw Error(message); };
  const obj = (v,label) => v && typeof v === 'object' && !Array.isArray(v) ? v : fail('Проверьте раздел «'+label+'»');
  const text = (v,label,max=500) => typeof v === 'string' && v.length <= max ? v : fail(label+': недопустимый текст');
  const number = (v,label,min=0,max=1e12,integer=false) => typeof v==='number' && Number.isFinite(v) && v>=min && v<=max && (!integer || Number.isSafeInteger(v)) ? v : fail(label+': число от '+min+' до '+max);
  const url = (v,label) => { text(v,label,2000); if(!v)return ''; try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol))fail(label+': нужна HTTP(S)-ссылка');return u.href;}catch{fail(label+': нужна корректная HTTP(S)-ссылка');} };
  const list = (v,label,min=1,max=500) => Array.isArray(v)&&v.length>=min&&v.length<=max ? v : fail(label+': допустимо от '+min+' до '+max+' значений');
  const series = (v,label,max=1e12,minLength=2) => list(v,label,minLength).map(n=>number(n,label,0,max));
  const rows = (v,label) => list(v,label,1,60).map(row=>{list(row,label,2,3);const r=[text(row[0],label,200),number(row[1],label,0,100)];if(row[2]!==undefined){if(typeof row[2]!=='boolean')fail(label+': неверная отметка');r.push(row[2]);}return r;});
  obj(raw,'Данные'); const v=obj(raw.video,'Видео'), w=obj(raw.watch,'Просмотр'), l=obj(raw.likes,'Лайки');
  const duration=number(v.durationSeconds,'Длительность',0.01,86400);
  const stats=list(v.stats,'Основные показатели',5,5).map(n=>number(n,'Основные показатели',0,1e12,true));
  return {
    video:{durationSeconds:duration,cover:url(v.cover,'Обложка'),published:text(v.published,'Дата публикации'),stats},
    watch:{totalSeconds:number(w.totalSeconds,'Общее время',0,1e12,true),averageSeconds:number(w.averageSeconds,'Среднее время',0,duration),completionPercent:number(w.completionPercent,'Полные просмотры',0,100),subscribers:number(w.subscribers,'Подписчики',0,1e12,true)},
    viewsByHour:series(raw.viewsByHour,'Просмотры по часам'),viewsTicks:series(raw.viewsTicks,'Метки просмотров',1e12,1),retention:series(raw.retention,'Удержание',100),
    sources:rows(raw.sources,'Источники'),totalViewers:number(raw.totalViewers,'Всего зрителей',0,1e12,true),
    viewerTypes:list(raw.viewerTypes,'Типы зрителей',1,8).map(t=>{obj(t,'Типы зрителей');return {left:rows([t.left],'Типы зрителей')[0],right:rows([t.right],'Типы зрителей')[0]};}),
    gender:rows(raw.gender,'Пол'),ages:rows(raw.ages,'Возраст'),places:rows(raw.places,'Места'),
    likes:{values:series(l.values,'График лайков',100),ticks:series(l.ticks,'Метки лайков',100,1),text:text(l.text,'Описание лайков',2000)},
    otherCovers:list(raw.otherCovers,'Другие обложки',0,12).map(u=>url(u,'Другая обложка')),
  };
}
export function projectData(raw) {
  const c=validateProjectConfig(raw), w=c.watch, duration=c.video.durationSeconds;
  const total=w.totalSeconds;
  return {
    ...c,video:{...c.video,duration:duration+' с.'},
    metrics:{views:{label:'Просмотры видео',value:c.video.stats[0]},total:{label:'Общее время просмотра',value:Math.floor(total/3600)+' ч.:'+Math.floor(total%3600/60)+' мин.:'+total%60+' с.'},avg:{label:'Среднее время просмотра',value:w.averageSeconds+' с.'},full:{label:'Просмотрели видео полностью',value:w.completionPercent+'%'},subs:{label:'Новые подписчики',value:w.subscribers}},
    avgWatchedPercent:Math.round(w.averageSeconds/duration*1000)/10,
  };
}
export function projectDataSource(config) {
  return 'const DATA = '+JSON.stringify(projectData(config)).replace(/</g,'\\u003c')+';\n';
}
