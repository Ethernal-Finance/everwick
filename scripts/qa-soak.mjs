import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {seedWorld,tick,totalCash} from '../server/simulation.mjs';
const w=seedWorld();
// Synthetic maximum-population fixture, not evidence of organic growth or 500 clients.
while(w.npcs.length<500){const n=structuredClone(w.npcs[w.npcs.length%25]);n.id=`stress-${w.npcs.length}`;n.partnerId=null;n.relationships={};n.employer=null;n.housing=null;n.cash=500;n.memories=[];w.npcs.push(n);}
const cash=totalCash(w),start=performance.now(),memory=process.memoryUsage().heapUsed;let worst=0;
for(let i=0;i<720;i++){const at=performance.now();tick(w);worst=Math.max(worst,performance.now()-at);}
assert.equal(totalCash(w),cash);assert.ok(w.npcs.every(n=>n.cash>=0&&Object.values(n.inventory).every(v=>v>=0)));
console.log(JSON.stringify({scenario:'synthetic 500 citizens, 30 simulation days',ticks:720,elapsedMs:Math.round(performance.now()-start),worstTickMs:Math.round(worst),heapDeltaMB:Math.round((process.memoryUsage().heapUsed-memory)/1048576),cashConserved:true,nonnegativeCitizenAssets:true,realTimeSoak:false}));
