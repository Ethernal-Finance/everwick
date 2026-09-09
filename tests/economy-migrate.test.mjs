import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,totalCash,transfer,event} from '../server/simulation.mjs';
import {bindCitizens,ensureCitizenSex,sexFromId,ensureSex} from '../server/citizenship.mjs';
import {ensurePopulation,canPartner,populationDay,DAYS_PER_YEAR} from '../server/population.mjs';
import {EVERWICK_GEN_A,EVERWICK_SOFT_CEILING,FRONTIER_GEN_A,GEN_A_TARGET,SATELLITE_GEN_A,TRAVELING_GEN_A,TREASURY_FLOOR,assertGenAMigrateGates,cohortOf,genACitizens,migrateGenA250} from '../server/economy-migrate.mjs';
import {database,mutate,readWorld} from '../server/db.mjs';
import {civilizationDay,ensureGenASpreadCamps} from '../server/civilization.mjs';
import {advanceMovement} from '../server/movement.mjs';

test('migrateGenA250 hits cohort gates on seeded world',()=>{
 const w=seedWorld();
 const report=migrateGenA250(w);
 const gates=assertGenAMigrateGates(w);
 assert.equal(gates.ok,true,gates.errors.join('; '));
 assert.equal(gates.genA,GEN_A_TARGET);
 assert.equal(gates.everwickGenA,EVERWICK_GEN_A);
 assert.equal(gates.satellite,SATELLITE_GEN_A);
 assert.equal(gates.traveling,TRAVELING_GEN_A);
 assert.equal(gates.frontier,FRONTIER_GEN_A);
 assert.ok(gates.everwickGenA<=EVERWICK_SOFT_CEILING);
 assert.ok(Math.abs(gates.male-gates.female)<=1);
 assert.equal(gates.housed,EVERWICK_GEN_A);
 assert.equal(gates.employed,EVERWICK_GEN_A);
 assert.ok(gates.treasury>=TREASURY_FLOOR);
 assert.ok(gates.foodDays>=7);
 assert.equal(gates.coreBusinesses,48);
 assert.equal(report.gates.ok,true);
 assert.equal(report.cohorts.everwickGenA,40);
 assert.equal(report.cohorts.satellite,60);
 assert.equal(report.cohorts.traveling,80);
 assert.equal(report.cohorts.frontier,70);
});

test('same-sex cannot partner',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const [a,b]=w.npcs;
 a.partnerId=b.partnerId=null;a.age=b.age=30;a.health=b.health=90;
 a.sex=b.sex='male';
 assert.equal(canPartner(w,a,b),false);
 a.sex='female';b.sex='female';
 assert.equal(canPartner(w,a,b),false);
 a.sex='male';b.sex='female';
 assert.equal(canPartner(w,a,b),true);
});

test('ensureSex does not overwrite once set',()=>{
 const w=seedWorld();const n=w.npcs[0];
 n.sex='female';
 ensureSex(n);ensureCitizenSex(n);
 assert.equal(n.sex,'female');
 delete n.sex;
 ensureSex(n);
 assert.equal(n.sex,sexFromId(n.id));
 const again=n.sex;
 ensureSex(n);
 assert.equal(n.sex,again);
});

test('second migrate is idempotent and preserves gates',()=>{
 const w=seedWorld();
 const first=migrateGenA250(w);
 const cash=totalCash(w);
 const ids=w.npcs.filter(n=>!n.starter&&(n.generation||0)===0).map(n=>n.id).sort();
 const sexes=Object.fromEntries(w.npcs.map(n=>[n.id,n.sex]));
 const second=migrateGenA250(w);
 assert.equal(second.gates.ok,true,second.gates.errors.join('; '));
 assert.equal(second.capitalized,0,'idempotent migrate should not re-mint treasury');
 assert.equal(totalCash(w),cash);
 assert.deepEqual(w.npcs.filter(n=>!n.starter&&(n.generation||0)===0).map(n=>n.id).sort(),ids);
 for(const n of w.npcs)assert.equal(n.sex,sexes[n.id]);
 assert.equal(first.gates.genA,second.gates.genA);
 assert.equal(second.gates.everwickGenA,40);
 assert.ok(second.gates.everwickGenA<=48);
});

test('totalCash rises only by explicit capitalize mints',()=>{
 const w=seedWorld();
 const before=totalCash(w);
 const {capitalized,cashBefore,cashAfter,mintLog}=migrateGenA250(w);
 assert.equal(cashBefore,before);
 assert.equal(totalCash(w),cashAfter);
 assert.equal(cashAfter-cashBefore,capitalized,`delta ${cashAfter-cashBefore} !== capitalized ${capitalized} mintLog=${JSON.stringify(mintLog)}`);
 for(const p of Object.values(w.players))assert.equal(p.citizenId?0:p.cash,p.citizenId?0:(p.cash||0));
 assert.ok(w.ledger.some(l=>l.reason==='seed-treasury-capitalize'));
});

test('script-shaped db migrate on :memory: passes gates',()=>{
 const db=database(':memory:');
 try{
  const report=mutate(db,w=>migrateGenA250(w));
  const w=readWorld(db);
  const gates=assertGenAMigrateGates(w);
  assert.equal(gates.ok,true,gates.errors.join('; '));
  assert.equal(report.gates.ok,true);
  assert.ok(w.genAMigration?.version>=1);
  assert.equal(gates.everwickGenA,40);
  assert.equal(gates.satellite,60);
  assert.equal(gates.traveling,80);
  assert.equal(gates.frontier,70);
 }finally{db.close();}
});

test('formPartnership skips same-sex candidates',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 for(const n of w.npcs){n.partnerId=null;n.sex='male';n.health=90;n.needs.social=90;n.age=28;}
 w.tick=DAYS_PER_YEAR*24;populationDay(w,{transfer,event});
 assert.ok(w.npcs.every(n=>!n.partnerId),'no same-sex households');
 w.npcs[0].sex='female';w.npcs[1].sex='male';
 for(const n of w.npcs.slice(2))n.partnerId='occupied';
 w.tick=DAYS_PER_YEAR*2*24;populationDay(w,{transfer,event});
 assert.equal(w.npcs[0].partnerId,w.npcs[1].id);
});

test('travel drip settles travelers into camps over days',()=>{
 const w=seedWorld();
 migrateGenA250(w);
 ensureGenASpreadCamps(w);
 const before=w.npcs.filter(n=>n.residency==='traveling').length;
 assert.equal(before,80);
 w.civilization.lastDay=undefined;
 w.tick=24;
 civilizationDay(w,{transfer,event});
 const after=w.npcs.filter(n=>n.residency==='traveling').length;
 assert.ok(after<before,`expected drip, traveling ${before}->${after}`);
 assert.ok(before-after<=12,`drip should be <=12/day, got ${before-after}`);
 assert.ok(assertGenAMigrateGates(w).everwickGenA<=48);
});

test('mid-ring satellites sit outside Everwick near-band',()=>{
 const w=seedWorld();
 migrateGenA250(w);
 const origin={x:25,y:23};
 const sats=genACitizens(w).filter(n=>cohortOf(n)==='satellite');
 assert.equal(sats.length,60);
 for(const n of sats){
  const d=Math.hypot((n.x||0)-origin.x,(n.y||0)-origin.y);
  assert.ok(d>=100,`${n.id} too near Everwick d=${d}`);
 }
});

test('travelers stagger across waypoints',()=>{
 const w=seedWorld();
 migrateGenA250(w);
 const travelers=w.npcs.filter(n=>n.residency==='traveling');
 assert.equal(travelers.length,80);
 const stacks={};
 for(const n of travelers){
  const key=`${Math.round(n.x)},${Math.round(n.y)}`;
  stacks[key]=(stacks[key]||0)+1;
 }
 const maxStack=Math.max(0,...Object.values(stacks));
 assert.ok(maxStack<=12,`max rounded-tile stack ${maxStack} > 12`);
});

test('travelers walk along travelPath between day ticks',()=>{
 const w=seedWorld();
 migrateGenA250(w);
 const movers=w.npcs.filter(n=>n.residency==='traveling'&&(n.travelPath||[]).length>1);
 assert.ok(movers.length>10);
 const sample=movers.slice(0,20).map(n=>({id:n.id,x:n.x,y:n.y,idx:n.travelIndex||0}));
 for(let i=0;i<40;i++)advanceMovement(w,.5);
 let walked=0;
 for(const s of sample){
  const n=w.npcs.find(x=>x.id===s.id);
  if(Math.hypot(n.x-s.x,n.y-s.y)>0.05||(n.travelIndex||0)>s.idx)walked++;
  assert.equal(n.residency,'traveling');
 }
 assert.ok(walked>=5,`expected travelers to walk along path, walked=${walked}`);
});
