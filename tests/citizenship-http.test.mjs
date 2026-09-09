import test from 'node:test';import assert from 'node:assert/strict';
import {database,readWorld} from '../server/db.mjs';import {createApp} from '../server/index.mjs';
test('registration grants free starter; paid entitlement claims one adult and duplicate commands cannot clone a resident',async()=>{
 const oldDemo=process.env.ALLOW_DEMO_CITIZENSHIP;process.env.ALLOW_DEMO_CITIZENSHIP='0';
 const db=database(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));let cookie='';
 const req=async(path,body,key=crypto.randomUUID())=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3100',Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':key},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{const a=await req('/api/auth/register',{name:'Account',email:'citizen@test.invalid',password:'long test password'});cookie=a.cookie.split(';')[0];const afterReg=readWorld(db);assert.equal(afterReg.npcs.length,26);const starter=afterReg.npcs.find(n=>n.starter&&n.ownerId===a.data.id);assert.ok(starter);assert.equal(starter.canBreed,false);assert.equal(afterReg.players[a.data.id].citizenId,starter.id);
  const command={action:'claim-citizen',data:{citizen:'npc-20'}};assert.equal((await req('/api/command',command)).status,400);
  db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run('paid-test',a.data.id,'founder','paid',2500,'test',Date.now());db.prepare('INSERT INTO entitlements(purchase_id,user_id,tier,active,slots_total,slots_remaining,need_male,need_female) VALUES(?,?,?,1,1,1,0,0)').run('paid-test',a.data.id,'founder');
  const first=await req('/api/command',command,'claim-replay-test');assert.equal(first.status,200);assert.equal(first.data.selected,'npc-20');assert.equal(readWorld(db).npcs.find(n=>n.id==='npc-20').founderPrimaryPurchaseId,'paid-test');assert.deepEqual((await req('/api/command',command,'claim-replay-test')).data,first.data);assert.equal((await req('/api/command',{action:'create-character',data:{citizen:'npc-21',name:'Clone',avatar:1}})).status,400);assert.equal(readWorld(db).npcs.filter(n=>!n.starter).length,25);
  const w=(await req('/api/world')).data;assert.equal(w.player.name,'Mara Moss');assert.equal(w.player.cash,w.npcs.find(n=>n.id==="npc-20").cash);assert.ok(w.npcs.every(n=>!('conversations'in n)));assert.equal((await req('/api/position',{active:false})).data.autonomous,true);
  const rebased=await req('/api/position',{active:true,x:900,y:900,points:[{x:900,y:900}],clientId:'test-tab'});assert.equal(rebased.status,200);assert.equal(rebased.data.rebased,true);assert.ok(rebased.data.x<100);assert.equal((await req('/api/world')).data.player.autonomous,false);
  await req('/api/position',{active:false,clientId:'hidden-other-tab'});assert.equal((await req('/api/world')).data.player.autonomous,false);
  await req('/api/position',{active:false,clientId:'test-tab'});assert.equal((await req('/api/world')).data.player.autonomous,true);
  const control=await req('/api/control',{clientId:'test-tab'});assert.equal(control.status,200);assert.equal(control.data.autonomous,false);const held=await req('/api/position',{x:control.data.x,y:control.data.y,clientId:'test-tab'});assert.equal(held.status,200);

 }finally{await new Promise(r=>server.close(r));db.close();if(oldDemo===undefined)delete process.env.ALLOW_DEMO_CITIZENSHIP;else process.env.ALLOW_DEMO_CITIZENSHIP=oldDemo;}
});

test('local demo claim grants two Generation A founders on the same account',async()=>{
 const old={demo:process.env.ALLOW_DEMO_CITIZENSHIP,node:process.env.NODE_ENV,origin:process.env.APP_ORIGIN};process.env.ALLOW_DEMO_CITIZENSHIP='1';process.env.NODE_ENV='development';process.env.APP_ORIGIN='http://localhost:3100';
 const db=database(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));let cookie='';
 const req=async(path,body,key=crypto.randomUUID())=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3100',Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':key},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{const a=await req('/api/auth/register',{name:'Demo Account',email:'demo-pair@test.invalid',password:'long demo password'});cookie=a.cookie.split(';')[0];const claim=await req('/api/command',{action:'claim-citizen',data:{citizen:'npc-20'}});assert.equal(claim.status,200);assert.equal(claim.data.demo,true);assert.ok(claim.data.characters.length>=2);const founders=claim.data.characters.filter(c=>c.generationLabel==='A'&&!c.starter);assert.equal(founders.length,2);const w=readWorld(db),p=w.players[a.data.id],owned=p.ownedCitizenIds.map(id=>w.npcs.find(n=>n.id===id));const demoOwned=owned.filter(n=>n&&!n.starter);assert.equal(demoOwned.length,2);assert.ok(demoOwned.every(n=>n.demoFounder&&!n.founderPrimaryPurchaseId));assert.equal(demoOwned[0].partnerId,demoOwned[1].id);assert.equal(demoOwned[1].partnerId,demoOwned[0].id);
 }finally{await new Promise(r=>server.close(r));db.close();for(const [k,v]of Object.entries({ALLOW_DEMO_CITIZENSHIP:old.demo,NODE_ENV:old.node,APP_ORIGIN:old.origin}))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});


test('claim-citizen consumes a pack slot and sets founderPrimaryPurchaseId',async()=>{
 const oldDemo=process.env.ALLOW_DEMO_CITIZENSHIP;process.env.ALLOW_DEMO_CITIZENSHIP='0';
 const db=database(':memory:'),server=createApp(db);await new Promise(r=>server.listen(0,'127.0.0.1',r));let cookie='';
 const req=async(path,body,key=crypto.randomUUID())=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body?'POST':'GET',headers:{Origin:'http://localhost:3100',Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':key},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{
  const a=await req('/api/auth/register',{name:'Pack Claim',email:'pack-claim@test.invalid',password:'long test password'});cookie=a.cookie.split(';')[0];
  db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run('pack-town',a.data.id,'town','paid',7500,'test',Date.now());
  db.prepare('INSERT INTO entitlements(purchase_id,user_id,tier,active,slots_total,slots_remaining,need_male,need_female) VALUES(?,?,?,1,2,2,0,0)').run('pack-town',a.data.id,'town');
  const first=await req('/api/command',{action:'claim-citizen',data:{citizen:'npc-20'}});
  assert.equal(first.status,200);assert.equal(first.data.slotsRemaining,1);
  const n=readWorld(db).npcs.find(n=>n.id==='npc-20');assert.equal(n.founderPrimaryPurchaseId,'pack-town');assert.equal(n.canBreed,true);
  const ent=db.prepare('SELECT slots_remaining FROM entitlements WHERE purchase_id=?').get('pack-town');assert.equal(ent.slots_remaining,1);
  const second=await req('/api/command',{action:'claim-citizen',data:{citizen:'npc-21'}});
  assert.equal(second.status,200);assert.equal(second.data.slotsRemaining,0);
  assert.equal(readWorld(db).npcs.find(n=>n.id==='npc-21').founderPrimaryPurchaseId,'pack-town');
  assert.equal((await req('/api/command',{action:'claim-citizen',data:{citizen:'npc-22'}})).status,400);
 }finally{await new Promise(r=>server.close(r));db.close();if(oldDemo===undefined)delete process.env.ALLOW_DEMO_CITIZENSHIP;else process.env.ALLOW_DEMO_CITIZENSHIP=oldDemo;}
});
