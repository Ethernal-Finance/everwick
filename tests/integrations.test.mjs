import test from 'node:test';import assert from 'node:assert/strict';import {createHmac,createECDH} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {database} from '../server/db.mjs';import {hashPassword,checkPassword,requireAdmin} from '../server/auth.mjs';
import {verifyWebhook,settle,funding,canonicalPack,spendClaimSlot,entitlementSlots,PACKS} from '../server/payments.mjs';
import {DeterministicProvider,recoverTasks} from '../server/ai.mjs';

const setup=(tier='citizen',amount=2500)=>{const db=database(':memory:');db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('u','a@example.com','Alice','hash','player',Date.now());db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run('cs_test','u',tier,'pending',amount,'test',Date.now());return db;};
const paidFor=(tier='citizen',amount=2500,id='cs_test',evt='evt_paid')=>({id:evt,livemode:false,type:'checkout.session.completed',data:{object:{id,payment_status:'paid',client_reference_id:'u',metadata:{tier,user_id:'u'},currency:'usd',amount_total:amount,payment_intent:'pi_'+id}}});
const paid=paidFor();

test('passwords are salted and authorization rejects ordinary players',()=>{const a=hashPassword('a good password'),b=hashPassword('a good password');assert.notEqual(a,b);assert.ok(checkPassword('a good password',a));assert.ok(!checkPassword('wrong',a));assert.throws(()=>requireAdmin({role:'player'}));assert.throws(()=>requireAdmin(null));});
test('webhooks verify raw bytes, reject forged and stale signatures',()=>{const raw=Buffer.from(JSON.stringify(paid)),secret='whsec_test',now=Date.now(),t=Math.floor(now/1000);const sig=createHmac('sha256',secret).update(`${t}.`).update(raw).digest('hex');assert.equal(verifyWebhook(raw,`t=${t},v1=${sig}`,secret,now).id,'evt_paid');assert.throws(()=>verifyWebhook(Buffer.from('{}'),`t=${t},v1=${sig}`,secret,now));assert.throws(()=>verifyWebhook(raw,`t=${t},v1=${sig}`,secret,now+600000));});
test('duplicate payment events grant one entitlement and one purchase',()=>{const db=setup();settle(db,paid,'test');assert.ok(settle(db,paid,'test').duplicate);settle(db,{...paid,id:'evt_paid_again'},'test');assert.equal(db.prepare('SELECT COUNT(*) n FROM entitlements').get().n,1);assert.equal(funding(db).raised,2500);assert.equal(funding(db).founders,1);assert.equal(canonicalPack('citizen'),'founder');db.close();});
test('wrong amount or user never grants benefits',()=>{for(const changes of [{amount_total:1},{client_reference_id:'attacker'}]){const db=setup();const e=structuredClone(paid);Object.assign(e.data.object,changes);assert.throws(()=>settle(db,e,'test'));assert.equal(db.prepare('SELECT COUNT(*) n FROM entitlements').get().n,0);db.close();}});
test('partial/full refunds reduce funding and revoke full-refund entitlements',()=>{const db=setup();settle(db,paid,'test');settle(db,{id:'r1',livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_cs_test',amount_refunded:1000}}},'test');assert.equal(funding(db).raised,1500);settle(db,{id:'r2',livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_cs_test',amount_refunded:2500}}},'test');assert.equal(funding(db).raised,0);assert.equal(db.prepare('SELECT active FROM entitlements').get().active,0);settle(db,{...paid,id:'late_paid'},'test');assert.equal(funding(db).raised,0);db.close();});
test('live events rejected by test installation and failure cannot undo paid',()=>{const db=setup();assert.throws(()=>settle(db,{...paid,livemode:true},'test'));settle(db,paid,'test');settle(db,{id:'failed',livemode:false,type:'checkout.session.async_payment_failed',data:{object:{id:'cs_test'}}},'test');assert.equal(funding(db).raised,2500);db.close();});
test('local AI needs no key and interrupted tasks are recoverable failures',async()=>{const p=new DeterministicProvider();const r=await p.execute('dialogue',{citizen:{name:'Mara',routine:'Working',occupation:'Farmer',goal:'Own a farm'},relationship:12,memories:['You tipped me.'],playerMessage:'What is your goal?'});assert.match(r.text,/Own a farm/);assert.equal(r.cost,0);const db=setup();db.prepare('INSERT INTO ai_tasks(id,kind,status,request,created_at) VALUES(?,?,?,?,?)').run('t','dialogue','running','{}',0);recoverTasks(db);assert.equal(db.prepare('SELECT status FROM ai_tasks').get().status,'failed');db.close();});

test('founder settle grants one claim slot and zero sex needs',()=>{const db=setup('founder',2500);settle(db,paidFor('founder',2500),'test');const e=db.prepare('SELECT * FROM entitlements WHERE purchase_id=?').get('cs_test');assert.equal(e.tier,'founder');assert.equal(e.slots_total,1);assert.equal(e.slots_remaining,1);assert.equal(e.need_male,0);assert.equal(e.need_female,0);db.close();});

test('citizen alias settles as founder pack amounts',()=>{const db=setup('citizen',2500);settle(db,paidFor('citizen',2500),'test');const e=db.prepare('SELECT tier,slots_remaining FROM entitlements').get();assert.equal(e.tier,'founder');assert.equal(e.slots_remaining,1);assert.equal(PACKS.citizen.amount,PACKS.founder.amount);db.close();});

test('breeder settle grants two slots with one male and one female need',()=>{const db=setup('breeder',4900);settle(db,paidFor('breeder',4900),'test');const e=db.prepare('SELECT * FROM entitlements').get();assert.equal(e.tier,'breeder');assert.equal(e.slots_total,2);assert.equal(e.slots_remaining,2);assert.equal(e.need_male,1);assert.equal(e.need_female,1);db.close();});

test('spendClaimSlot male then female empties breeder; third claim fails',()=>{const db=setup('breeder',4900);settle(db,paidFor('breeder',4900),'test');spendClaimSlot(db,'u',{sex:'male'});let e=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements').get();assert.equal(e.slots_remaining,1);assert.equal(e.need_male,0);assert.equal(e.need_female,1);spendClaimSlot(db,'u',{sex:'female'});e=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements').get();assert.equal(e.slots_remaining,0);assert.equal(e.need_male,0);assert.equal(e.need_female,0);assert.throws(()=>spendClaimSlot(db,'u',{sex:'male'}));assert.equal(entitlementSlots(db,'u').slots_remaining,0);db.close();});

test('wrong-sex spend on breeder throws and leaves counters unchanged',()=>{const db=setup('breeder',4900);settle(db,paidFor('breeder',4900),'test');spendClaimSlot(db,'u',{sex:'male'});const before=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements').get();assert.throws(()=>spendClaimSlot(db,'u',{sex:'male'}));const after=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements').get();assert.equal(after.slots_remaining,before.slots_remaining);assert.equal(after.need_male,before.need_male);assert.equal(after.need_female,before.need_female);db.close();});

test('full refund zeroes slots and active',()=>{const db=setup('breeder',4900);settle(db,paidFor('breeder',4900),'test');const r=settle(db,{id:'rf',livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_cs_test',amount_refunded:4900}}},'test');assert.equal(r.refundedPurchaseId,'cs_test');const e=db.prepare('SELECT active,slots_remaining,need_male,need_female FROM entitlements').get();assert.equal(e.active,0);assert.equal(e.slots_remaining,0);assert.equal(e.need_male,0);assert.equal(e.need_female,0);db.close();});

test('grandfather: old citizen entitlement row migrates to founder 1 slot',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ew-mig-'));const path=join(dir,'t.sqlite');
 const raw=new DatabaseSync(path);
 raw.exec(`PRAGMA foreign_keys=OFF;
  CREATE TABLE migrations(version INTEGER PRIMARY KEY,applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,name TEXT,password TEXT,role TEXT,created_at INTEGER);
  CREATE TABLE purchases(id TEXT PRIMARY KEY,user_id TEXT,tier TEXT,status TEXT,amount INTEGER,refunded INTEGER DEFAULT 0,mode TEXT,payment_intent TEXT,created_at INTEGER);
  CREATE TABLE entitlements(purchase_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,tier TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE worlds(id INTEGER PRIMARY KEY,state TEXT NOT NULL);
  INSERT INTO migrations(version) VALUES(1),(2),(3);
  INSERT INTO users VALUES('u','a@example.com','A','h','player',0);
  INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES('legacy','u','citizen','paid',2500,'test',0);
  INSERT INTO entitlements(purchase_id,user_id,tier,active) VALUES('legacy','u','citizen',1);
  INSERT INTO worlds VALUES(1,'{"npcs":[],"players":{},"properties":[],"businesses":[],"tick":0,"lastTickAt":0}');`);
 raw.close();
 const db=database(path);
 const e=db.prepare('SELECT tier,slots_total,slots_remaining,need_male,need_female,active FROM entitlements WHERE purchase_id=?').get('legacy');
 assert.equal(e.tier,'founder');assert.equal(e.slots_total,1);assert.equal(e.slots_remaining,1);assert.equal(e.need_male,0);assert.equal(e.need_female,0);assert.equal(e.active,1);
 assert.ok(db.prepare('SELECT version FROM migrations WHERE version=4').get());
 db.close();rmSync(dir,{recursive:true,force:true});
});
