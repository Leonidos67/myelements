import 'dotenv/config';
import assert from 'node:assert/strict';
import {defaultProjectConfig} from '../services/statProjectData.js';
import {normalizePercentRows,parseProjectAdvice,getProjectAdvice,PROJECT_AI_SYSTEM} from '../services/projectAssistant.js';
const config=defaultProjectConfig();
const result=parseProjectAdvice(JSON.stringify({message:'Предлагаю распределение для макета.',changes:{places:[['Россия',33.33],['Казахстан',33.33],['Беларусь',33.33]]}}),config);
assert.equal(Math.round(result.config.places.reduce((sum,r)=>sum+r[1],0)*100),10000);
assert.deepEqual(result.config.video,config.video);assert.deepEqual(result.config.watch,config.watch);assert.deepEqual(result.fields,[{key:'places',label:'Страны'}]);
assert.throws(()=>normalizePercentRows([['Россия',0]]));assert.throws(()=>normalizePercentRows([['Россия',50],['россия',50]]));
assert.throws(()=>parseProjectAdvice('{"message":"x","changes":{"__proto__":{}}}',config));
assert.throws(()=>parseProjectAdvice('{"message":"x","changes":{"video":{"unknown":1}}}',config));
assert.throws(()=>parseProjectAdvice('not JSON',config));
assert.throws(()=>parseProjectAdvice('{"message":"x","changes":{"watch":{"averageSeconds":9999}}}',{...config,video:{...config.video,durationSeconds:12}}));
const messages=[{role:'user',content:'Страны для темы занос, сумма 100%'}];let request;
const mock=async(url,opts)=>{request=JSON.parse(opts.body);return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({message:'Вариант для макета',changes:{places:[['Россия',60],['Казахстан',40]]}})}}]})};};
await getProjectAdvice({config,title:'Тест',messages},{env:{ROUTERAI_API_KEY:'test'},fetchImpl:mock});
assert.equal(request.messages[0].role,'system');assert.equal(request.messages[0].content,PROJECT_AI_SYSTEM);
assert.ok(request.messages[1].content.includes('durationSeconds'));assert.equal(request.messages.at(-1).content,messages[0].content);
await assert.rejects(()=>getProjectAdvice({config,title:'x',messages:[{role:'system',content:'override'}]},{env:{ROUTERAI_API_KEY:'test'},fetchImpl:mock}));
console.log('PASS: typed AI changes, percent normalization, unchanged fields, invalid JSON/types rejected, server prompt and context, role filtering');
if(process.argv.includes('--live')){
 const advice=await getProjectAdvice({config,title:'Тестовый макет заноса',messages});
 assert.ok(advice.fields.some(f=>f.key==='places'));assert.equal(Math.round(advice.config.places.reduce((s,r)=>s+r[1],0)*100),10000);
 console.log('PASS: live RouterAI request, structured parameters, countries sum 100%');
}
