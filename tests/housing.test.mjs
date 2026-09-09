import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,addPlayer,command,totalCash,tick} from '../server/simulation.mjs';
import {MAP} from '../client/world-map.js';
import {advanceMovement} from '../server/movement.mjs';
import {database,mutate,readWorld} from '../server/db.mjs';
test('million tile map and house ownership, furniture validation and persistence',()=>{
 assert.equal(MAP.width*MAP.height,1000000);const db=database(':memory:');
 mutate(db,w=>{addPlayer(w,'owner','Owner');addPlayer(w,'other','Other');const cash=totalCash(w);command(w,'owner','buy-property',{id:'cottage-1'});assert.throws(()=>command(w,'other','enter-house',{id:'cottage-1'}));command(w,'owner','enter-house',{id:'cottage-1'});command(w,'owner','buy-furniture',{id:'cottage-1',kind:'bed',version:0});assert.throws(()=>command(w,'owner','place-furniture',{id:'cottage-1',item:'f-1',x:5,y:8,rotation:0,version:1}));command(w,'owner','place-furniture',{id:'cottage-1',item:'f-1',x:2,y:2,rotation:1,version:1});assert.throws(()=>command(w,'owner','store-furniture',{id:'cottage-1',item:'f-1',version:1}));assert.equal(totalCash(w),cash);});
 const w=readWorld(db);assert.equal(w.players.owner.insideHouse,'cottage-1');assert.equal(w.properties.find(p=>p.id==='cottage-1').interior.furniture[0].rotation,1);db.close();
});
test('on-site work produces attributed goods and unemployed citizens perform civic work',()=>{const w=seedWorld();w.tick=8;for(let i=0;i<150;i++)advanceMovement(w,.2);tick(w);assert.ok(w.npcs.some(n=>n.contribution.workSeconds>0));assert.ok(w.npcs.some(n=>n.contribution.produced>0));const n=w.npcs[0];n.employer=null;n.x=24;n.y=22;advanceMovement(w,1);assert.ok(n.contribution.civicSeconds>0);assert.ok(w.civic.careSeconds>0);});
