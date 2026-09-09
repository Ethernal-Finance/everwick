import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,totalCash,transfer,event} from '../server/simulation.mjs';
import {newCitizenAccount,claimResident,grantStarterCitizen,grantDemoFounderCompanion,bindCitizens,citizenCommand,citizenCanBreed,MAX_BIRTHS_AS_PARENT,sexFromId,complementarySexes} from '../server/citizenship.mjs';
import {ensurePopulation,populationDay,DAYS_PER_YEAR,BASE_BIRTH_COOLDOWN_DAYS,birthCooldownDays,zReached,lifeCapBlocks,SOFT_LIFE_CAP} from '../server/population.mjs';
import {GEN_Z,generationLabel} from '../server/genealogy.mjs';
import {database,readWorld,mutate} from '../server/db.mjs';

function readyPair(w,a,b,{generation=0}={}){
 for(const n of w.npcs)if(n!==a&&n!==b)n.partnerId=n.partnerId||'occupied';
 a.partnerId=b.id;b.partnerId=a.id;a.partnershipSinceDay=b.partnershipSinceDay=-999;
 a.householdId=b.householdId=[a.id,b.id].sort().join(':');
 for(const n of [a,b]){
  n.generation=generation;n.generationLabel=generationLabel(generation);
  n.starter=false;n.canBreed=generation<GEN_Z;n.birthsAsParent=0;n.lastBirthDay=-9999;
  n.age=25;n.health=95;n.needs={hunger:10,energy:90,social:90};n.cash=Math.max(n.cash||0,500);
  n.relationships??={};n.parents=[];
 }
 a.sex='male';b.sex='female';
 a.relationships[b.id]=90;b.relationships[a.id]=90;
 const home=w.properties.find(h=>h.id===a.housing)||w.properties[0];
 a.housing=b.housing=home.id;home.tenant=a.id;home.householdCapacity=6;
}

test('BASE_BIRTH_COOLDOWN_DAYS is the legacy A×A spacing (DAYS_PER_YEAR*3)',()=>{
 assert.equal(BASE_BIRTH_COOLDOWN_DAYS,DAYS_PER_YEAR*3);
 assert.equal(birthCooldownDays({generation:0},{generation:0}),BASE_BIRTH_COOLDOWN_DAYS);
 assert.equal(birthCooldownDays({generation:1},{generation:0}),BASE_BIRTH_COOLDOWN_DAYS*2);
 assert.equal(birthCooldownDays({generation:24},{generation:24}),BASE_BIRTH_COOLDOWN_DAYS*25);
});

test('registration-style starter is sterile, non-listable, and never breeds',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);const before=totalCash(w);
 const p=newCitizenAccount(w,'starter-user','Starter');
 const s=grantStarterCitizen(w,p,{transfer});
 assert.equal(s.starter,true);assert.equal(s.canBreed,false);assert.equal(citizenCanBreed(s),false);
 assert.equal(s.generationLabel,'S');assert.equal(s.transferable,false);
 assert.equal(p.citizenId,s.id);assert.ok(p.ownedCitizenIds.includes(s.id));
 assert.equal(totalCash(w),before,'starter grant is treasury transfer, not mint');
 assert.throws(()=>citizenCommand(w,p,'list-citizen',{citizen:s.id,price:500},{transfer}),/Starter citizens cannot be listed/);
 // Even if forcibly partnered with a breedable Gen A, no birth.
 const a=w.npcs.find(n=>!n.starter&&(n.generation||0)===0);
 readyPair(w,s,a,{generation:0});s.starter=true;s.canBreed=false;s.generationLabel='S';
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>(c.parents||[]).includes(s.id)).length,0);
});

test('Gen Z is sterile; A–Y pairings still produce the next letter',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const [a,b]=w.npcs;readyPair(w,a,b,{generation:24});
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*25*24;populationDay(w,{transfer,event});
 const child=w.children.find(c=>c.parents.includes(a.id)&&c.parents.includes(b.id));
 assert.ok(child);assert.equal(child.generation,GEN_Z);assert.equal(child.generationLabel,'Z');assert.equal(child.canBreed,false);
 // Z adults cannot breed
 a.partnerId=b.partnerId=null;
 const z1={...a,id:'z-1',generation:GEN_Z,generationLabel:'Z',canBreed:false,starter:false,partnerId:null,birthsAsParent:0,lastBirthDay:-9999};
 const z2={...b,id:'z-2',generation:GEN_Z,generationLabel:'Z',canBreed:false,starter:false,partnerId:null,birthsAsParent:0,lastBirthDay:-9999};
 w.npcs.push(z1,z2);readyPair(w,z1,z2,{generation:GEN_Z});z1.canBreed=false;z2.canBreed=false;
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*26*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>(c.parents||[]).includes('z-1')||(c.parents||[]).includes('z-2')).length,0);
 assert.equal(citizenCanBreed(z1),false);
});

test('per-citizen max 50 births as parent increments both parents',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const [a,b]=w.npcs;readyPair(w,a,b,{generation:0});
 a.birthsAsParent=MAX_BIRTHS_AS_PARENT;b.birthsAsParent=0;
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>c.parents.includes(a.id)).length,0);
 a.birthsAsParent=MAX_BIRTHS_AS_PARENT-1;b.birthsAsParent=MAX_BIRTHS_AS_PARENT-1;
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 const kids=w.children.filter(c=>c.parents.includes(a.id)&&c.parents.includes(b.id));
 assert.equal(kids.length,1);assert.equal(a.birthsAsParent,MAX_BIRTHS_AS_PARENT);assert.equal(b.birthsAsParent,MAX_BIRTHS_AS_PARENT);
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>c.parents.includes(a.id)&&c.parents.includes(b.id)).length,1);
});

test('no hard global life cap until at least one Gen Z exists',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 assert.equal(zReached(w),false);assert.equal(lifeCapBlocks(w),false);
 // Pad living population above a test softLifeCap without allocating SOFT_LIFE_CAP entities
 w.population.softLifeCap=40;
 w.children=Array.from({length:40},(_,i)=>({id:`child-pad-${i}`,age:0,bornTick:0,parents:['pad-parent-a','pad-parent-b'],genes:w.npcs[0].genes,generation:1,generationLabel:'B',grown:false,canBreed:true}));
 assert.equal(lifeCapBlocks(w),false);
 const [a,b]=w.npcs;readyPair(w,a,b,{generation:0});
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.ok(w.children.some(c=>c.parents?.includes(a.id)&&c.parents?.includes(b.id)),'births still allowed before Z despite >softLifeCap lives');
 // Mark Z reached → soft cap engages
 w.children.push({id:'child-z',age:0,bornTick:w.tick,parents:[a.id,b.id],genes:a.genes,generation:GEN_Z,generationLabel:'Z',grown:false,canBreed:false});
 w.population.zReached=true;
 assert.equal(zReached(w),true);assert.equal(lifeCapBlocks(w),true);
 const before=w.children.length;
 a.lastBirthDay=b.lastBirthDay=-9999;a.birthsAsParent=0;b.birthsAsParent=0;
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.length,before,'soft cap blocks births after Z');
});

test('birth cooldown scales with max parent generation',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const [a,b]=w.npcs;readyPair(w,a,b,{generation:1}); // B×B ⇒ 2× base
 const need=birthCooldownDays(a,b);
 assert.equal(need,BASE_BIRTH_COOLDOWN_DAYS*2);
 a.lastBirthDay=b.lastBirthDay=0;
 // Too soon for scaled cooldown
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*24; // only 1× base days elapsed from day 0
 populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>c.parents.includes(a.id)).length,0);
 // After full 2× base cooldown from lastBirthDay 0
 w.tick=need*24;populationDay(w,{transfer,event});
 assert.ok(w.children.some(c=>c.parents.includes(a.id)&&c.parents.includes(b.id)));
});

test('offspring inherit canBreed if either parent canBreed; Gen A primary sets canBreed',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,'breeder','Breeder');
 claimResident(w,p,'npc-20',{founderPurchaseId:'stripe-1'});
 const founder=w.npcs.find(n=>n.id==='npc-20');
 assert.equal(founder.canBreed,true);assert.equal(citizenCanBreed(founder),true);
 const pair=grantDemoFounderCompanion(w,p,'npc-20');
 w.tick=24;populationDay(w,{transfer,event});
 const child=w.children.find(c=>c.parents.includes(pair[0].id)&&c.parents.includes(pair[1].id));
 assert.ok(child);assert.equal(child.canBreed,true);assert.equal(child.generationLabel,'B');
});

test('HTTP registration grants starter without 4500 mint',()=>{
 const db=database(':memory:');
 try{
  mutate(db,w=>{const p=newCitizenAccount(w,'http-p','HTTP');grantStarterCitizen(w,p,{transfer});});
  const w=readWorld(db),p=w.players['http-p'],s=w.npcs.find(n=>n.id===p.citizenId);
  assert.ok(s?.starter);assert.equal(s.canBreed,false);assert.ok(s.cash<=350);assert.ok(s.cash>0||w.treasury.cash<500000);
 }finally{db.close();}
});

test('SOFT_LIFE_CAP is 50000 after Z soft-cap raise',()=>{
 assert.equal(SOFT_LIFE_CAP,50000);
});

test('same-sex partnership cannot birth',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const [a,b]=w.npcs;readyPair(w,a,b,{generation:0});
 a.sex=b.sex='male';
 assert.equal(complementarySexes(a,b),false);
 w.tick=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>c.parents.includes(a.id)&&c.parents.includes(b.id)).length,0);
 a.sex='female';b.sex='female';
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.equal(w.children.filter(c=>c.parents.includes(a.id)&&c.parents.includes(b.id)).length,0);
 a.sex='male';b.sex='female';
 w.tick+=BASE_BIRTH_COOLDOWN_DAYS*24;populationDay(w,{transfer,event});
 assert.ok(w.children.some(c=>c.parents.includes(a.id)&&c.parents.includes(b.id)));
 assert.ok(['male','female'].includes(w.children.find(c=>c.parents.includes(a.id)).sex));
});

test('starter grant assigns deterministic sex from id hash',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,'sex-starter','SexStarter');
 const s=grantStarterCitizen(w,p,{transfer});
 assert.ok(s.sex==='male'||s.sex==='female');
 assert.equal(s.sex,sexFromId(s.id));
 // Existing NPCs migrate stably
 for(const n of w.npcs.filter(n=>!n.starter))assert.equal(n.sex,sexFromId(n.id));
});

test('market buy does not overwrite citizen sex',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const seller=newCitizenAccount(w,'sex-seller','SexSeller');
 claimResident(w,seller,'npc-20',{founderPurchaseId:'stripe-sex-1'});
 const listed=w.npcs.find(n=>n.id==='npc-21');
 listed.generation=1;listed.generationLabel='B';listed.sex='female';listed.ownerId=null;
 bindCitizens(w);
 const listing=w.citizenMarket.listings.find(l=>l.status==='active'&&l.citizenId===listed.id);
 assert.ok(listing);
 seller.cash=10000;
 const beforeSex=listed.sex;
 citizenCommand(w,seller,'buy-citizen',{listing:listing.id,sex:'male'},{transfer});
 assert.equal(listed.sex,beforeSex);
 assert.equal(listed.sex,'female');
});
