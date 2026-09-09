import {claimResident} from '../server/citizenship.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {database,mutate} from '../server/db.mjs';import {createApp} from '../server/index.mjs';
test('HTTP registration, sessions, admin protection, CSRF, command replay, waitlist',async t=>{
 const db=database(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.close();db.close();});const base=`http://127.0.0.1:${server.address().port}`;let cookie='';
 const req=async(path,body,extra={})=>{const res=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3100',Cookie:cookie,...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});return {res,data:await res.json()};};
 assert.equal((await req('/api/world')).res.status,401);assert.equal((await req('/api/auth/register',{name:'Tester',email:'test@example.com',password:'password for testing'},{Origin:'https://evil.example'})).res.status,403);
 const reg=await req('/api/auth/register',{name:'Tester',email:'test@example.com',password:'password for testing'});assert.equal(reg.res.status,201);cookie=reg.res.headers.get('set-cookie').split(';')[0];assert.match(reg.res.headers.get('set-cookie'),/HttpOnly/);
 mutate(db,w=>{const p=w.players[reg.data.id];claimResident(w,p,'npc-20',{legacy:true});w.treasury.cash-=4500-p.cash;p.cash=4500;});
 assert.equal((await req('/api/admin')).res.status,403);const world=(await req('/api/world')).data;assert.equal(world.npcs.filter(n=>!n.starter).length,25);assert.ok(world.npcs.some(n=>n.starter));assert.equal(world.economy.employment,100);assert.ok(Array.isArray(world.economy.goods));assert.ok(Number.isFinite(world.economy.household.net));
 const body={action:'buy',data:{id:'tavern'}},head={'Idempotency-Key':'test-command-123456'};assert.equal((await req('/api/command',body,head)).res.status,200);assert.equal((await req('/api/command',body,head)).res.status,200);assert.equal(db.prepare('SELECT COUNT(*) n FROM command_keys').get().n,1);
 const w=(await req('/api/world')).data;assert.equal(w.player.cash,4500-w.businesses.find(b=>b.id==='tavern').valuation);assert.equal((await req('/api/checkout',{tier:'citizen'})).res.status,503);
 const wait=await req('/api/waitlist',{email:'one@example.com',consent:true});assert.equal(wait.res.status,201);const duplicate=await req('/api/waitlist',{email:'one@example.com',consent:true});assert.equal(duplicate.data.code,undefined);
 assert.equal((await req('/api/waitlist',{email:'two@example.com',consent:false})).res.status,400);
 assert.equal((await fetch(base+'/server/index.mjs')).status,404);await req('/api/auth/logout',{});assert.equal((await req('/api/world')).res.status,401);
});

