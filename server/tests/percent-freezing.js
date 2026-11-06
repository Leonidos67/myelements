import assert from 'node:assert/strict';
import {distributePercentages,effectivePercentageBounds,manualPercentage,normalizePercentages,percentageSum,updatePercentage,repairProjectPercentages} from '../services/statPercentages.js';
import {defaultProjectConfig,validateProjectConfig} from '../services/statProjectData.js';
import {parseProjectAdvice} from '../services/projectAssistant.js';
const rows=[['Для вас',80],['Другое',15],['Поиск',5]],bounds=rows.map(()=>[0,100]),frozen=[true,false,false];
const effective=effectivePercentageBounds(rows,bounds,frozen);
for(let i=0;i<250;i++){const result=distributePercentages(effective);assert.equal(result[0],80);assert.equal(Math.round(result.reduce((a,b)=>a+b,0)*100),10000);}
const edited=updatePercentage(rows,1,18,effective);assert.equal(edited[0][1],80);assert.equal(edited[1][1],18);assert.equal(edited[2][1],2);
const manual=manualPercentage(rows,1,10,bounds,frozen);assert.deepEqual(manual,[['Для вас',80],['Другое',10],['Поиск',5]]);assert.equal(percentageSum(manual),95);
const capped=manualPercentage(manual,1,100,bounds,frozen);assert.equal(capped[0][1],80);assert.equal(capped[2][1],5);assert.equal(percentageSum(capped),100);
assert.throws(()=>manualPercentage(rows,0,10,bounds,frozen),/заморожена/);
const resumed=normalizePercentages(manual,effectivePercentageBounds(manual,bounds,frozen));assert.equal(resumed[0][1],80);assert.equal(percentageSum(resumed),100);
assert.throws(()=>normalizePercentages(manual,effectivePercentageBounds(manual,bounds,[true,true,true])));
const config=defaultProjectConfig();config.sources=rows;config.bounds.sources=bounds;config.calculation.sources={auto:false,frozen};
assert.deepEqual(validateProjectConfig(config).calculation.sources,{auto:false,frozen});
assert.deepEqual(repairProjectPercentages(config).calculation.sources,{auto:false,frozen});
assert.throws(()=>parseProjectAdvice(JSON.stringify({message:'x',changes:{sources:[['Для вас',70],['Другое',25],['Поиск',5]]}}),config),/замороженную/);
const accepted=parseProjectAdvice(JSON.stringify({message:'x',changes:{sources:[['Для вас',80],['Другое',19],['Поиск',1]]}}),config);assert.equal(accepted.config.sources[0][1],80);
console.log('PASS: frozen generation, frozen auto editing, manual independence, cap at 100%, resume, all-frozen error, settings persistence, AI freeze protection');
