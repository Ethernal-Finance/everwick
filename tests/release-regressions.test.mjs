import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {seedWorld,transfer,event} from '../server/simulation.mjs';
import {ensurePopulation,populationDay,DAYS_PER_YEAR} from '../server/population.mjs';
import {newCitizenAccount,claimResident,grantDemoFounderCompanion,switchCitizen} from '../server/citizenship.mjs';
import {verifyWebhook} from '../server/payments.mjs';
import {assertProductionWorld} from '../server/release-safety.mjs';
import {closeKin,generationLabel} from '../server/genealogy.mjs';

function household(){const w=seedWorld();ensurePopulation(w);const p=newCitizenAccount(w,'qa','QA');claimResident(w,p,'npc-20');const [a,b]=grantDemoFounderCompanion(w,p,p.citizenId);return {w,p,a,b};}
test('switching preserves both citizens interiors and rejects stale ownership lists',()=>{
 const {w,p,a,b}=household();a.insideHouse='house-a';a.indoor={x:2,y:3};b.insideHouse='house-b';b.indoor={x:4,y:5};
 switchCitizen(w,p,b.id);assert.equal(a.insideHouse,'house-a');assert.equal(p.insideHouse,'house-b');
 switchCitizen(w,p,a.id);assert.equal(b.insideHouse,'house-b');b.ownerId='someone-else';assert.throws(()=>switchCitizen(w,p,b.id),/own/);
});
for(const kind of ['underage','related','different-town','unhoused','zero-health'])test(`existing ${kind} partnership cannot give birth`,()=>{
 const {w,a,b}=household();
 if(kind==='underage')a.age=17;
 if(kind==='related')b.parents=[a.id];
 if(kind==='different-town')b.settlementId='bluewater';
 if(kind==='unhoused')a.housing=b.housing=null;
 if(kind==='zero-health')a.health=0;
 w.tick=24;populationDay(w,{transfer,event});assert.equal(w.children.length,0);
});
test('adulthood retains permanent identity and never copies founder purchase or demo provenance from a template',()=>{
 const {w}=household();w.tick=24;populationDay(w,{transfer,event});const c=w.children[0];assert.ok(c);
 w.npcs[0].founderPrimaryPurchaseId='unrelated-purchase';w.tick=c.bornTick+18*DAYS_PER_YEAR*24;populationDay(w,{transfer,event});
 const adult=w.npcs.find(n=>n.id===c.adultId);assert.equal(adult.id,c.id);assert.equal(adult.founderPrimaryPurchaseId,undefined);
 populationDay(w,{transfer,event});assert.equal(w.npcs.filter(n=>n.id===c.id).length,1);
});
test('webhook rejects nonnumeric timestamps even with a matching HMAC',()=>{
 const raw=Buffer.from('{}'),secret='whsec_unit_test',t='NaN',sig=createHmac('sha256',secret).update(`${t}.`).update(raw).digest('hex');
 assert.throws(()=>verifyWebhook(raw,`t=${t},v1=${sig}`,secret));
});
test('production rejects demo worlds, including when demo accounts have been removed',()=>{
 const {w}=household();assert.throws(()=>assertProductionWorld(w,'production'),/Demo data/);
 w.players={};assert.throws(()=>assertProductionWorld(w,'production'),/Demo data/);
 assert.doesNotThrow(()=>assertProductionWorld(seedWorld(),'production'));
});
test('kinship includes distant ancestors and traversal terminates on corrupted cycles',()=>{
 const w={npcs:Array.from({length:10},(_,i)=>({id:`n${i}`,parents:i?[`n${i-1}`]:[]}))};
 assert.equal(closeKin(w,w.npcs[0],w.npcs[9]),true);
 w.npcs[0].parents=['n9'];assert.equal(closeKin(w,w.npcs[2],w.npcs[8]),true);
});
test('all A-Y grade pairings produce the next grade; Gen Z cannot breed',()=>{
 for(let a=0;a<25;a++)for(let b=0;b<25;b++){
  const {w,a:pa,b:pb}=household();pa.generation=a;pb.generation=b;pa.canBreed=true;pb.canBreed=true;w.tick=24;populationDay(w,{transfer,event});
  assert.equal(w.children[0].generation,Math.max(a,b)+1);assert.equal(w.children[0].generationLabel,generationLabel(Math.max(a,b)+1));
 }
 for(const zSide of ['a','b','both']){
  const {w,a:pa,b:pb}=household();pa.generation=zSide==='b'?0:25;pb.generation=zSide==='a'?0:25;pa.canBreed=pa.generation<25;pb.canBreed=pb.generation<25;w.tick=24;populationDay(w,{transfer,event});
  assert.equal(w.children.length,0,`expected no birth when Gen Z is parent (${zSide})`);
 }
});
