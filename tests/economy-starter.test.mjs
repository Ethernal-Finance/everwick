import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,command,totalCash,tick} from '../server/simulation.mjs';
import {newCitizenAccount,claimResident} from '../server/citizenship.mjs';
import {ensureStarterEconomy} from '../server/economy.mjs';

test('citizenship first chapter clears starter home and Green Dragon without minting',()=>{
 const w=seedWorld();
 const n=w.npcs[0];
 assert.equal(n.cash,350);
 const p=newCitizenAccount(w,'citizen','Citizen');
 claimResident(w,p,n.id);
 assert.equal(p.cash,350);
 const before=totalCash(w);
 const home=w.properties.find(h=>h.id==='home-0');
 const tavern=w.businesses.find(b=>b.id==='tavern');
 assert.equal(home.valuation,900);
 assert.equal(home.starterListing,true);
 assert.equal(home.forSale,true);
 assert.equal(tavern.valuation,1200);
 assert.equal(tavern.starterListing,true);

 p.x=34;p.y=14;command(w,'citizen','chapter');
 p.x=9;p.y=28;command(w,'citizen','chapter');
 p.x=29;p.y=29;command(w,'citizen','chapter');
 assert.equal(p.cash,1350);

 command(w,'citizen','buy-property',{id:'home-0'});
 assert.equal(home.owner,'citizen');
 assert.equal(p.cash,450);
 command(w,'citizen','chapter');
 assert.equal(p.cash,950);

 command(w,'citizen','enter-house',{id:'home-0'});
 command(w,'citizen','buy-furniture',{id:'home-0',kind:'plant',version:0});
 const item=home.interior.furniture.find(f=>f.kind==='plant');
 assert.ok(item);
 command(w,'citizen','place-furniture',{id:'home-0',item:item.id,x:2,y:2,rotation:0,version:home.interior.version});
 command(w,'citizen','chapter');
 command(w,'citizen','exit-house');
 assert.ok(p.cash>=1200,`expected >=1200 after decoration, got ${p.cash}`);

 command(w,'citizen','buy',{id:'tavern'});
 assert.equal(tavern.owner,'citizen');
 assert.ok(p.cash>=100,`expected ~120 after GD, got ${p.cash}`);
 command(w,'citizen','chapter');
 assert.equal(p.chapter.step,6);
 assert.equal(totalCash(w),before);
});

test('NPC entrepreneurs cannot snipe starter listings before day 14 even with cash',()=>{
 const w=seedWorld();
 const tavern=w.businesses.find(b=>b.id==='tavern');
 const buyer=w.npcs.find(n=>n.id!==tavern.owner&&!w.businesses.some(b=>b.owner===n.id));
 assert.ok(buyer);
 for(const n of w.npcs)n.ambition='security';
 buyer.ambition='entrepreneur';
 buyer.cash=50000;
 for(const b of w.businesses)if(b.id!=='tavern')b.forSale=false;
 // closeDay runs when tick becomes a multiple of 24 (hour===0)
 w.tick=24*13-1;
 tick(w);
 assert.equal(Math.floor(w.tick/24),13);
 assert.equal(tavern.forSale,true);
 assert.equal(tavern.owner,'npc-4');
 w.tick=24*14-1;
 tick(w);
 assert.equal(Math.floor(w.tick/24),14);
 assert.equal(tavern.forSale,false);
 assert.equal(tavern.owner,buyer.id);
});

test('ensureStarterEconomy re-applies floors on existing worlds without minting',()=>{
 const w=seedWorld();
 const tavern=w.businesses.find(b=>b.id==='tavern');
 const home=w.properties.find(h=>h.id==='home-0');
 tavern.valuation=2760;home.valuation=1600;
 const before=totalCash(w);
 ensureStarterEconomy(w);
 assert.equal(tavern.valuation,1200);
 assert.equal(home.valuation,900);
 assert.equal(totalCash(w),before);
 tavern.forSale=false;tavern.valuation=9999;
 ensureStarterEconomy(w);
 assert.equal(tavern.valuation,9999,'sold listings keep their valuation');
});
