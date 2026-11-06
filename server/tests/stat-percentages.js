import assert from 'node:assert/strict';
import {defaultProjectConfig,validateProjectConfig} from '../services/statProjectData.js';
import {distributePercentages,updatePercentage,normalizePercentages,percentageSum,repairProjectPercentages} from '../services/statPercentages.js';
for(let i=0;i<1000;i++){
 const [first,second]=distributePercentages([[95,99],[1,5]]);
 assert.ok(first>=95&&first<=99);assert.ok(second>=1&&second<=5);assert.equal(Math.round((first+second)*100),10000);
 const values=distributePercentages([[40,70],[10,30],[5,25],[0,20]]);
 assert.equal(Math.round(values.reduce((a,b)=>a+b,0)*100),10000);
 values.forEach((v,j)=>assert.ok(v>=[40,10,5,0][j]&&v<=[70,30,25,20][j]));
}
assert.deepEqual(distributePercentages([[95,95],[5,5]]),[95,5]);
assert.throws(()=>distributePercentages([[70,80],[40,50]]),/минимум/);
assert.throws(()=>distributePercentages([[0,30],[0,40]]),/максимум/);
assert.throws(()=>distributePercentages([[99,95],[1,5]]),/минимум/);
const edited=updatePercentage([['A',60],['B',30],['C',10]],0,99);
assert.equal(edited[0][1],99);assert.equal(percentageSum(edited),100);
assert.equal(percentageSum(normalizePercentages([['A',0],['B',0]])),100);
const raw=defaultProjectConfig();raw.ages=[['18–24',53],['25–34',27],['35–44',18],['45+',8]];assert.equal(percentageSum(repairProjectPercentages(raw).ages),100);
assert.throws(()=>validateProjectConfig(raw),/100%/);
const valid=defaultProjectConfig();valid.viewerTypes[0].right[1]=30;assert.throws(()=>validateProjectConfig(valid),/100%/);
const bounded=defaultProjectConfig();bounded.bounds.viewerTypes[0]=[95,99];bounded.viewerTypes[0]={left:['Новые',95],right:['Вернувшиеся',5]};assert.equal(validateProjectConfig(bounded).bounds.viewerTypes[0][1],99);
console.log('PASS: 1000 bounded generations, 95/5 example, exact sum, invalid ranges, manual rebalance, legacy repair, server invariants and bounds persistence');
