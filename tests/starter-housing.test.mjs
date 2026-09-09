import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,totalCash,transfer} from '../server/simulation.mjs';
import {newCitizenAccount,grantStarterCitizen,bindCitizens} from '../server/citizenship.mjs';
import {chapterCommand} from '../server/chapter.mjs';
test('new starters rent treasury accommodation, cannot skip buying a home, and keep money conserved',()=>{
 const w=seedWorld(),before=totalCash(w),p=newCitizenAccount(w,'housing-regression','Newcomer');
 const n=grantStarterCitizen(w,p,{transfer}),h=w.properties.find(h=>h.id===n.housing);
 assert.equal(h.owner,'treasury');assert.equal(h.tenant,n.id);assert.equal(h.rent,30);
 assert.equal(w.properties.filter(h=>h.owner===p.id).length,0);assert.equal(p.cash,350);assert.equal(totalCash(w),before);
 p.chapter={step:3,log:[]};assert.throws(()=>chapterCommand(w,p,'chapter',transfer),/Buy a home first/);
 const count=w.properties.length;grantStarterCitizen(w,p,{transfer});bindCitizens(w);assert.equal(w.properties.length,count);assert.equal(h.owner,'treasury');
});
test('starter addresses stay finite and unique even with legacy hash-derived population counters',()=>{
 const w=seedWorld();w.population={nextId:9.706483818730622e23,nextChild:1,history:[]};
 for(let i=0;i<8;i++){const p=newCitizenAccount(w,'a123456789abcdef'+i,'Newcomer');const n=grantStarterCitizen(w,p,{transfer});const h=w.properties.find(h=>h.id===n.housing);assert.match(h.name,/^\d{1,6} Newcomer Lane$/);assert.ok(Number.isSafeInteger(w.population.nextId));assert.equal(w.properties.filter(x=>x.id===h.id).length,1);}
});

