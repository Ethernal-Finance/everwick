import test from 'node:test';import assert from 'node:assert/strict';
import {database,readWorld,mutate} from '../server/db.mjs';
import {seedWorld,totalCash,transfer,event} from '../server/simulation.mjs';
import {newCitizenAccount,claimResident,grantDemoFounderCompanion,bindCitizens,playerControls,personalityFor,citizenshipState,refreshCitizenshipAccess,demoCitizenshipEnabled,citizenCommand} from '../server/citizenship.mjs';
import {advanceMovement} from '../server/movement.mjs';
import {populationDay,ensurePopulation,DAYS_PER_YEAR,SOFT_LIFE_CAP} from '../server/population.mjs';
test('citizenship inherits one existing life, shares assets after persistence and cannot claim twice',()=>{
 const db=database(':memory:');try{let cash;
 mutate(db,w=>{cash=totalCash(w);const n=w.npcs[20],count=w.npcs.length,p=newCitizenAccount(w,'p','Account'),q=newCitizenAccount(w,'q','Other');const oldDemo=process.env.ALLOW_DEMO_CITIZENSHIP;process.env.ALLOW_DEMO_CITIZENSHIP='0';assert.equal(citizenshipState(db,w,'p').canClaim,false);if(oldDemo===undefined)delete process.env.ALLOW_DEMO_CITIZENSHIP;else process.env.ALLOW_DEMO_CITIZENSHIP=oldDemo;claimResident(w,p,n.id,{legacy:true});assert.equal(w.npcs.length,count);assert.equal(p.name,n.name);assert.equal(p.inventory,n.inventory);assert.equal(totalCash(w),cash);assert.throws(()=>claimResident(w,q,n.id));assert.throws(()=>claimResident(w,p,w.npcs[21].id));transfer(w,'treasury','p',123,'test');assert.equal(p.cash,n.cash);assert.equal(totalCash(w),cash);p.inventory.tools=2;});
 const w=readWorld(db),p=w.players.p,n=w.npcs.find(n=>n.id===p.citizenId);assert.equal(p.cash,n.cash);assert.equal(p.inventory,n.inventory);assert.equal(p.inventory.tools,2);assert.equal(totalCash(w),cash);p.cash-=1;assert.equal(n.cash,p.cash);
 }finally{db.close();}
});

test('localhost enables development citizenship preview without enabling production access',()=>{
 const old={origin:process.env.APP_ORIGIN,node:process.env.NODE_ENV,demo:process.env.ALLOW_DEMO_CITIZENSHIP};
 try{
  process.env.APP_ORIGIN='http://localhost:3100';process.env.NODE_ENV='development';delete process.env.ALLOW_DEMO_CITIZENSHIP;assert.equal(demoCitizenshipEnabled(),true);
  process.env.ALLOW_DEMO_CITIZENSHIP='0';assert.equal(demoCitizenshipEnabled(),false);
  process.env.ALLOW_DEMO_CITIZENSHIP='1';process.env.NODE_ENV='production';assert.equal(demoCitizenshipEnabled(),false);
 }finally{
  for(const [key,val] of Object.entries({APP_ORIGIN:old.origin,NODE_ENV:old.node,ALLOW_DEMO_CITIZENSHIP:old.demo}))if(val===undefined)delete process.env[key];else process.env[key]=val;
 }
});

test('demo citizenship grants two unrelated Generation A founders and can produce a B child without creating resale rights',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);const before=totalCash(w),p=newCitizenAccount(w,'demo','Demo');claimResident(w,p,'npc-20');p.demoCitizenship=true;const pair=grantDemoFounderCompanion(w,p,'npc-20');
 assert.equal(pair.length,2);assert.equal(p.ownedCitizenIds.length,2);assert.ok(pair.every(n=>(n.generation||0)===0&&n.ownerId===p.id&&n.demoFounder));assert.equal(pair[0].partnerId,pair[1].id);assert.equal(pair[1].partnerId,pair[0].id);assert.equal(totalCash(w),before);
 assert.throws(()=>citizenCommand(w,p,'list-citizen',{citizen:pair[1].id,price:1200},{transfer}),/primary Stripe/);
 w.tick=24;populationDay(w,{transfer,event});const child=w.children.find(c=>(c.parents||[]).includes(pair[0].id)&&(c.parents||[]).includes(pair[1].id));assert.ok(child);assert.equal(child.generationLabel,'B');assert.equal(totalCash(w),before);
});

test('autonomous Generation A founders can intermingle when unrelated but close kin are blocked',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);const [a,b]=w.npcs.slice(0,2);for(const n of w.npcs.slice(2))n.partnerId='occupied';a.partnerId=null;b.partnerId=null;a.health=b.health=90;a.needs.social=b.needs.social=90;b.parents=[a.id];w.tick=DAYS_PER_YEAR*24;populationDay(w,{transfer,event});assert.equal(a.partnerId,null);assert.equal(b.partnerId,null);
 b.parents=[];w.tick=DAYS_PER_YEAR*2*24;populationDay(w,{transfer,event});assert.equal(a.partnerId,b.id);assert.equal(b.partnerId,a.id);assert.equal(a.ownerId,null);assert.equal(b.ownerId,null);
});

test('human input suspends NPC movement; AFK and disconnect resume the same resident',()=>{
 const w=seedWorld();bindCitizens(w);const n=w.npcs[20],p=newCitizenAccount(w,'p','Player');claimResident(w,p,n.id,{legacy:true});w.tick=8;p.controlAt=p.presenceAt=Date.now();assert.ok(playerControls(w,n));const start={x:n.x,y:n.y};advanceMovement(w,.2);assert.deepEqual({x:n.x,y:n.y},start);p.controlAt=Date.now()-91000;assert.equal(playerControls(w,n),false);advanceMovement(w,.2);assert.ok(n.brain?.task);assert.equal(p.x,n.x);p.controlAt=Date.now();p.presenceAt=Date.now()-16000;assert.equal(playerControls(w,n),false);
});
test('personalities persist and no immigrants spawn; children retain personality when reaching adulthood',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);const first=structuredClone(w.npcs[0].persona);bindCitizens(w);assert.deepEqual(w.npcs[0].persona,first);assert.notDeepEqual(personalityFor('npc-0'),personalityFor('npc-1'));
 for(let day=1;day<=DAYS_PER_YEAR*2;day++){w.tick=day*24;populationDay(w,{transfer,event});}assert.equal(w.npcs.length,25);const c=w.children[0];assert.ok(c);w.tick=c.bornTick+18*DAYS_PER_YEAR*24;populationDay(w,{transfer,event});const adult=w.npcs.find(n=>n.name===c.name);assert.deepEqual(adult.persona,c.persona);assert.equal(adult.controllerId,undefined);assert.equal(adult.generationLabel,'B');
});

test('Generation A requires a paid primary claim, then can be resold for coins while B citizens use the town market',()=>{
 const w=seedWorld();bindCitizens(w);assert.equal(w.citizenMarket.listings.filter(l=>l.status==='active').length,0);
 const unpaid=newCitizenAccount(w,'unpaid','Preview');claimResident(w,unpaid,'npc-18',{legacy:true});const unpaidB=w.npcs[17];unpaidB.generation=1;unpaidB.generationLabel='B';unpaidB.ownerId=unpaid.id;unpaid.ownedCitizenIds.push(unpaidB.id);bindCitizens(w);citizenCommand(w,unpaid,'switch-citizen',{citizen:unpaidB.id},{transfer});assert.throws(()=>citizenCommand(w,unpaid,'list-citizen',{citizen:'npc-18',price:1500},{transfer}),/primary Stripe/);
 const seller=newCitizenAccount(w,'seller','Seller');claimResident(w,seller,'npc-20',{founderPurchaseId:'stripe-founder-1'});const descendant=w.npcs[21];descendant.generation=1;descendant.generationLabel='B';seller.cash=10000;bindCitizens(w);const descendantListing=w.citizenMarket.listings.find(l=>l.status==='active'&&l.citizenId===descendant.id);assert.ok(descendantListing);citizenCommand(w,seller,'buy-citizen',{listing:descendantListing.id},{transfer});citizenCommand(w,seller,'switch-citizen',{citizen:descendant.id},{transfer});
 const founder=w.npcs.find(n=>n.id==='npc-20');assert.equal(founder.founderPrimaryPurchaseId,'stripe-founder-1');const founderListing=citizenCommand(w,seller,'list-citizen',{citizen:founder.id,price:2400},{transfer});assert.equal(founderListing.source,'player');
 const buyer=newCitizenAccount(w,'buyer','Buyer');claimResident(w,buyer,'npc-19',{founderPurchaseId:'stripe-founder-2'});buyer.cash=10000;const before=totalCash(w);const bought=citizenCommand(w,buyer,'buy-citizen',{listing:founderListing.id},{transfer}).citizen;assert.equal(bought.generation,0);assert.equal(bought.founderPrimaryPurchaseId,'stripe-founder-1');assert.equal(totalCash(w),before);assert.equal(bought.ownerId,buyer.id);assert.ok(buyer.ownedCitizenIds.includes(bought.id));
 citizenCommand(w,buyer,'switch-citizen',{citizen:bought.id},{transfer});citizenCommand(w,buyer,'switch-citizen',{citizen:'npc-19'},{transfer});const resale=citizenCommand(w,buyer,'list-citizen',{citizen:bought.id,price:3000},{transfer});assert.equal(resale.status,'active');assert.equal(w.npcs.length,25);
});

test('founder citizenship can only claim an unowned Generation A citizen',()=>{
 const w=seedWorld();bindCitizens(w);w.npcs[22].generation=1;w.npcs[22].generationLabel='B';const p=newCitizenAccount(w,'p','Player');assert.throws(()=>claimResident(w,p,'npc-22'),/Generation A founders/);claimResident(w,p,'npc-20',{legacy:true});assert.equal(w.npcs.find(n=>n.id==='npc-20').generation,0);
});
test('after Gen Z soft life cap blocks growth; unpaid Gen A control is revoked without entitlement',()=>{
 const db=database(':memory:');try{const w=readWorld(db);w.population.softLifeCap=40;w.children=Array.from({length:40},(_,i)=>({id:`child-${i}`,age:0,bornTick:7*24,parents:[],genes:w.npcs[0].genes,generation:1,canBreed:true,grown:false}));w.children.push({id:'child-z',age:0,bornTick:7*24,parents:[],genes:w.npcs[0].genes,generation:25,generationLabel:'Z',canBreed:false,grown:false});w.population.zReached=true;w.tick=7*24;const before=w.children.length;populationDay(w,{transfer,event});assert.equal(w.children.length,before);const p=newCitizenAccount(w,'p','Test');claimResident(w,p,'npc-20');p.controlAt=p.presenceAt=Date.now();refreshCitizenshipAccess(db,w);assert.equal(playerControls(w,w.npcs.find(n=>n.id==='npc-20')),false);assert.equal(p.accessRevoked,true);}finally{db.close();}
});
