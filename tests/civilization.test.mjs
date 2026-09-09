import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,addPlayer,command,totalCash,transfer,event} from '../server/simulation.mjs';
import {ensureCivilization,civilizationDay,civilizationReport} from '../server/civilization.mjs';
import {FRONTIER_SITES} from '../client/world-map.js';

function buildAndCharter(w,userId,siteId,name,focus){
 const p=w.players[userId],site=FRONTIER_SITES.find(s=>s.id===siteId);p.x=site.x;p.y=site.y;
 command(w,userId,'start-town-hall',{site:siteId});
 for(let i=0;i<4;i++)command(w,userId,'work-town-hall',{site:siteId});
 return command(w,userId,'found-township',{site:siteId,name,focus});
}

test('civilization seeds government, frontier biomes and landmark specialties without creating money',()=>{
 const w=seedWorld(),cash=totalCash(w),c=ensureCivilization(w),r=civilizationReport(w,'missing');
 assert.equal(c.settlements.length,1);assert.equal(c.settlements[0].name,'Everwick');
 assert.equal(c.settlements[0].landmark.name,'Copperhill Mine');assert.ok(c.settlements[0].landmark.bonus>1);
 assert.equal(c.frontiers.length,FRONTIER_SITES.length);assert.ok(c.frontiers.every(f=>f.landmark?.bonus>1&&f.hall.status==='unbuilt'));
 assert.equal(r.region.name,'Greenvale Region');assert.equal(r.nation.name,'Commonwealth of Everreach');
 assert.equal(totalCash(w),cash);assert.ok(w.npcs.every(n=>n.settlementId==='everwick'));
});

test('township founding requires physical Town Hall construction before a charter can be signed',()=>{
 const w=seedWorld();addPlayer(w,'founder','Founder');const before=totalCash(w),p=w.players.founder,site=FRONTIER_SITES.find(s=>s.id==='ironcap');
 assert.throws(()=>command(w,'founder','start-town-hall',{site:'ironcap'}),/travel/i);
 p.x=site.x;p.y=site.y;command(w,'founder','start-town-hall',{site:'ironcap'});
 assert.equal(w.civilization.frontiers.find(f=>f.id==='ironcap').hall.status,'building');
 assert.throws(()=>command(w,'founder','found-township',{site:'ironcap',name:'Ironhaven',focus:'industry'}),/finish|build/i);
 for(let i=0;i<4;i++)command(w,'founder','work-town-hall',{site:'ironcap'});
 const town=command(w,'founder','found-township',{site:'ironcap',name:'Ironhaven',focus:'industry'});
 assert.equal(p.cash,1700);assert.equal(town.treasury.cash,2200);assert.equal(town.siteId,'ironcap');assert.equal(town.landmark.name,'Ironcap Quarry');assert.equal(totalCash(w),before);
 command(w,'founder','set-town-policy',{town:town.id,key:'minimumWage',value:80});
 assert.ok(town.sectors.every(s=>s.wage>=80));
 assert.throws(()=>{addPlayer(w,'outsider','Outsider');command(w,'outsider','set-town-policy',{town:town.id,key:'incomeTax',value:1});},/mayor/i);
});

test('housing and stores create migration capacity and jobs while landmark workers produce boosted local goods',()=>{
 const w=seedWorld();addPlayer(w,'founder','Founder');const before=totalCash(w),town=buildAndCharter(w,'founder','bluewater','Lakehaven','trade');
 const initialCapacity=town.housingCapacity,initialJobs=town.sectors.reduce((n,s)=>n+s.slots,0);
 command(w,'founder','build-town-development',{town:town.id,kind:'housing'});
 command(w,'founder','build-town-development',{town:town.id,kind:'store'});
 assert.equal(town.housingCapacity,initialCapacity+6);assert.ok(town.sectors.reduce((n,s)=>n+s.slots,0)>=initialJobs+4);assert.equal(town.development.housing,1);assert.equal(town.development.stores,1);
 command(w,'founder','set-town-policy',{town:town.id,key:'minimumWage',value:100});
 command(w,'founder','set-town-policy',{town:town.id,key:'migrationIncentive',value:200});
 w.tick=24;civilizationDay(w,{transfer,event});
 const moved=w.npcs.filter(n=>n.settlementId===town.id);assert.ok(moved.length>0);assert.ok(moved.every(n=>n.residency==='away'&&n.remoteEmployment&&n.regionalPosition));
 assert.ok(w.civilization.migrationLog.some(m=>m.to===town.id));assert.equal(totalCash(w),before);
 const resident=moved[0],cash=resident.cash;w.tick=48;civilizationDay(w,{transfer,event});
 assert.notEqual(resident.cash,cash);assert.ok(w.ledger.some(l=>l.to===resident.id&&l.reason==='remote-wage'));
 assert.ok((town.stock.food||0)>0);assert.ok((town.productionToday.food||0)>0);assert.equal(totalCash(w),before);
});
