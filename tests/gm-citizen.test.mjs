import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,totalCash,transfer} from '../server/simulation.mjs';
import {newCitizenAccount,grantGmCitizen,bindCitizens,citizenCommand,citizenCanBreed} from '../server/citizenship.mjs';
import {ensurePopulation} from '../server/population.mjs';


test("grantGmCitizen sets gm flags and high authority",()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,"gm-user","Overseer");
 const before=totalCash(w);
 const n=grantGmCitizen(w,p,{transfer,name:"Overseer"});
 assert.equal(n.gm,true);
 assert.equal(n.generationLabel,"GM");
 assert.equal(n.generation,-1);
 assert.equal(n.canBreed,false);
 assert.equal(citizenCanBreed(n),false);
 assert.equal(n.transferable,false);
 assert.equal(n.starter,false);
 assert.ok((n.authority||0)>=100);
 assert.ok((n.skills?.authority||0)>=10);
 assert.equal(p.citizenId,n.id);
 assert.ok(p.ownedCitizenIds.includes(n.id));
 assert.equal(totalCash(w),before,"treasury transfer not mint");
 assert.ok((n.cash||0)>0);
});

test("second grantGmCitizen is idempotent",()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,"gm-user","Overseer");
 const a=grantGmCitizen(w,p,{transfer});
 const count=w.npcs.filter(n=>n.gm).length;
 const b=grantGmCitizen(w,p,{transfer});
 assert.equal(a.id,b.id);
 assert.equal(w.npcs.filter(n=>n.gm).length,count);
 assert.equal(p.ownedCitizenIds.filter(id=>w.npcs.find(n=>n.id===id)?.gm).length,1);
});

test("GM listing and market transfer blocked",()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,"gm-user","Overseer");
 const n=grantGmCitizen(w,p,{transfer});
 const other=w.npcs.find(x=>!x.starter&&!x.gm&&(x.generation||0)===0);
 other.ownerId=p.id;p.ownedCitizenIds.push(other.id);bindCitizens(w);
 citizenCommand(w,p,"switch-citizen",{citizen:other.id},{transfer});
 assert.throws(()=>citizenCommand(w,p,"list-citizen",{citizen:n.id,price:500},{transfer}),/not transferable|cannot be listed|Starter citizens/i);
 assert.equal(n.transferable,false);
});

test("totalCash conserved on GM grant",()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);
 const p=newCitizenAccount(w,"gm-user","Overseer");
 const before=totalCash(w);
 const treasuryBefore=w.treasury.cash;
 const n=grantGmCitizen(w,p,{transfer});
 assert.equal(totalCash(w),before);
 assert.equal(w.treasury.cash,treasuryBefore-n.cash);
 assert.ok(w.ledger.some(l=>l.reason==="gm-citizen-grant"));
});
