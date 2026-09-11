import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,readWorld} from '../server/db.mjs';
import {checkout,packCatalog,TIERS,canonicalPack,settle,unclaimedClaimSlots} from '../server/payments.mjs';

const mkUser=(db,id,email)=>db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,email,'User','hash','player',Date.now());
const seedSlots=(db,n)=>{db.prepare('DELETE FROM entitlements').run();db.prepare('DELETE FROM purchases').run();for(let i=0;i<n;i++){const id='cs_'+i;db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run(id,'seller','founder','paid',2500,'test',Date.now());db.prepare('INSERT INTO entitlements(purchase_id,user_id,tier,active,slots_total,slots_remaining,need_male,need_female) VALUES(?,?,?,1,?,?,?,?)').run(id,'seller','founder',1,1,0,0);}};

test('breeder pack is retired from sale but still settles legacy purchases',async()=>{
 const db=database(':memory:');readWorld(db);
 assert.equal('breeder' in TIERS,false);
 assert.deepEqual(packCatalog().map(p=>p.key),['founder','town','city','patron']);
 assert.equal(canonicalPack('breeder'),'breeder');
 mkUser(db,'u','a@example.com');
 await assert.rejects(checkout(db,{id:'u',email:'a@example.com'},'breeder'),m=>m.message.includes('no longer sold')&&m.status===410);
 db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run('cs_b','u','breeder','pending',4900,'test',Date.now());
 const evt={id:'evt_b',livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_b',payment_status:'paid',client_reference_id:'u',metadata:{tier:'breeder',user_id:'u'},currency:'usd',amount_total:4900,payment_intent:'pi_x'}}};
 const r=settle(db,evt,'test');
 assert.equal(r.received,true);
 const ent=db.prepare('SELECT * FROM entitlements WHERE purchase_id=?').get('cs_b');
 assert.equal(ent.slots_total,2);
 assert.equal(ent.slots_remaining,2);
 assert.equal(ent.need_male,1);
 assert.equal(ent.need_female,1);
});

test('checkout refuses packages the live claim supply cannot cover',async()=>{
 const db=database(':memory:');readWorld(db);
 mkUser(db,'seller','s@example.com');mkUser(db,'u','cap@example.com');
 seedSlots(db,25);
 assert.equal(unclaimedClaimSlots(db),25);
 await assert.rejects(checkout(db,{id:'u',email:'cap@example.com'},'town'),m=>m.message.includes('sold out'));
 seedSlots(db,24);
 assert.equal(unclaimedClaimSlots(db),24);
 await assert.rejects(checkout(db,{id:'u',email:'cap@example.com'},'town'),m=>m.message.includes('sold out'));
 await assert.rejects(checkout(db,{id:'u',email:'cap@example.com'},'founder'),m=>m.message.includes('Stripe is not configured'));
});

test('settlement marks an over-cap purchase oversold instead of granting entitlements',()=>{
 const db=database(':memory:');readWorld(db);
 mkUser(db,'seller','s@example.com');mkUser(db,'u','a@example.com');
 seedSlots(db,25);
 db.prepare('INSERT INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run('cs_u','u','founder','pending',2500,'test',Date.now());
 const evt={id:'evt_u',livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_u',payment_status:'paid',client_reference_id:'u',metadata:{tier:'founder',user_id:'u'},currency:'usd',amount_total:2500,payment_intent:'pi_u'}}};
 const r=settle(db,evt,'test');
 assert.equal(r.oversold,true);
 assert.equal(db.prepare('SELECT status FROM purchases WHERE id=?').get('cs_u').status,'oversold');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE purchase_id=?').get('cs_u').n,0);
});
