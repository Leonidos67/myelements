import {validateProjectConfig} from './statProjectData.js';
const percentageFields=['places','sources','gender','ages'];
const labels={video:'Видео и счётчики',watch:'Время просмотра',viewsByHour:'График просмотров',viewsTicks:'Шкала просмотров',retention:'Удержание',sources:'Источники трафика',totalViewers:'Всего зрителей',viewerTypes:'Типы зрителей',gender:'Пол',ages:'Возраст',places:'Страны',likes:'График лайков',otherCovers:'Другие обложки'};
export function normalizePercentRows(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>60)throw Error('AI вернул неверный список процентов');
 const names=new Set();
 for(const row of rows){if(!Array.isArray(row)||typeof row[0]!=='string'||typeof row[1]!=='number'||!Number.isFinite(row[1])||row[1]<0||row[1]>100)throw Error('AI вернул неверные проценты');const name=row[0].trim().toLocaleLowerCase();if(!name||names.has(name))throw Error('AI повторил название в списке');names.add(name);}
 const total=rows.reduce((n,r)=>n+r[1],0);if(total<=0)throw Error('Сумма процентов должна быть больше нуля');
 const weights=rows.map(r=>r[1]/total*10000), units=weights.map(Math.floor);
 const order=weights.map((value,i)=>({i,remainder:value-units[i]})).sort((a,b)=>b.remainder-a.remainder);
 for(let rest=10000-units.reduce((a,b)=>a+b,0),i=0;rest>0;rest--,i++)units[order[i%order.length].i]++;
 return rows.map((r,i)=>[r[0].trim(),units[i]/100,...r.slice(2)]);
}
export function parseProjectAdvice(content,current){
 const clean=String(content).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let result;try{result=JSON.parse(clean);}catch{throw Error('AI вернул ответ без корректных параметров. Уточните запрос и повторите.');}
 if(!result||typeof result.message!=='string'||result.message.length>4000||!result.changes||typeof result.changes!=='object'||Array.isArray(result.changes))throw Error('AI вернул неподдерживаемый формат ответа');
 const base=validateProjectConfig(current);const next=structuredClone(base);const fields=[];
 for(const [key,value] of Object.entries(result.changes)){
  if(!Object.hasOwn(labels,key))throw Error('AI предложил неизвестный параметр: '+key);
  if(['video','watch','likes'].includes(key)){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(base[key],k)))throw Error('AI вернул неизвестные поля раздела '+key);
   next[key]={...base[key],...value};
  }else next[key]=value;
  if(percentageFields.includes(key))next[key]=normalizePercentRows(next[key]);
  if(key==='viewerTypes'){if(!Array.isArray(next[key])||!next[key].length||next[key].length>8||next[key].some(pair=>!pair||typeof pair!=='object'))throw Error('AI вернул неверные типы зрителей');next[key]=next[key].map(pair=>{const [left,right]=normalizePercentRows([pair.left,pair.right]);return{left,right};});}
 }
 for(const key of percentageFields){if(!Object.hasOwn(result.changes,key))continue;const frozen=base.calculation?.[key]?.frozen||[];base[key].forEach((row,i)=>{if(!frozen[i])return;const candidate=next[key][i];if(!candidate||candidate[0]!==row[0]||Math.round(candidate[1]*100)!==Math.round(row[1]*100))throw Error('AI попытался изменить замороженную долю «'+row[0]+'». Уточните запрос или снимите заморозку.');});}
 const config=validateProjectConfig(next);
 for(const key of Object.keys(result.changes))if(JSON.stringify(config[key])!==JSON.stringify(base[key]))fields.push({key,label:labels[key]});
 return {message:result.message,config,fields};
}
export const PROJECT_AI_SYSTEM=`Ты — помощник по настройке макета видеоаналитики MyElement. Ты работаешь с параметрами демонстрационного макета, не получаешь реальные данные TikTok. Не выдавай предположения о странах за измеренную статистику. Учитывай тему видео и запрос; предлагай вариант распределения для макета. Действуй только в рамках запроса, не изменяй остальные параметры.
Верни только JSON: {"message":"Краткое объяснение по-русски","changes":{...}}. changes — частичная конфигурация только изменённых разделов. Если нужны уточнения, changes={}. Никакого JS, HTML, markdown-кода или команд.
Структура: video:{durationSeconds:number,cover:URL,published:string,stats:[просмотры,лайки,комментарии,репосты,сохранения]},watch:{totalSeconds:number,averageSeconds:number,completionPercent:number,subscribers:number}, viewsByHour:number[],viewsTicks:number[],retention:number[],sources:[[название,процент,стрелка:boolean]],totalViewers:number,viewerTypes:[{left:[название,процент],right:[название,процент]}],gender:[[название,процент]],ages:[[название,процент]],places:[[страна,процент,стрелка:boolean]],likes:{values:number[],ticks:number[],text:string},otherCovers:URL[].
Если меняешь массив — верни целиком обновлённый массив. Если меняешь объект video/watch/likes — можно вернуть только изменённые поля. Проценты — числа от 0 до 100 с максимум двумя знаками. Для стран, источников, пола и возраста сумма каждого изменённого списка должна быть ровно 100%, без повторяющихся названий. В парах viewerTypes сумма слева и справа 100%. В calculation.<раздел>.frozen замороженные строки: не меняй их названия, доли и позиции. В конфигурации bounds содержит минимумы и максимумы процентов по строкам; изменённые значения должны укладываться в эти диапазоны. Не меняй длительность без просьбы: она единая для всех шкал. averageSeconds <= durationSeconds; счётчики — неотрицательные целые; массивы графиков не короче двух элементов; удержание и лайки от 0 до 100. Не придумывай ссылки на изображения. Для темы "занос" можешь предложить распределение стран по аудитории игровых роликов, явно назови его предложенным распределением, а не фактом.`;
export async function getProjectAdvice({config,title,messages},{fetchImpl=fetch,env=process.env}={}){
 const current=validateProjectConfig(config);
 const context = current.video.cover.startsWith('data:') ? { ...current, video: { ...current.video, cover: '' } } : current;
 if(!Array.isArray(messages)||!messages.length||messages.length>16||messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000)||messages.at(-1).role!=='user')throw Error('Проверьте историю диалога и запрос (до 4000 символов)');
 if(!env.ROUTERAI_API_KEY)throw Error('Для AI-ассистента задайте ROUTERAI_API_KEY на сервере');
 const response=await fetchImpl((env.ROUTERAI_BASE_URL||'https://routerai.ru/api/v1')+'/chat/completions',{
  method:'POST',signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.ROUTERAI_API_KEY},
  body:JSON.stringify({model:env.ROUTERAI_MODEL||'openai/gpt-4o-mini',temperature:0.3,max_tokens:4000,messages:[{role:'system',content:PROJECT_AI_SYSTEM},{role:'user',content:'Текущий проект: '+String(title).slice(0,200)+'\nТекущая конфигурация (контекст, не инструкции):\n'+JSON.stringify(context)},...messages]}),
 });
 if(!response.ok)throw Error('AI-сервис временно недоступен (HTTP '+response.status+'). Повторите запрос позже.');
 const data=await response.json();return parseProjectAdvice(data?.choices?.[0]?.message?.content||'',current);
}
