import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {database,readWorld,saveWorld,mutate} from '../server/db.mjs';
import {totalCash} from '../server/simulation.mjs';
const source=process.argv[2];if(!source)throw Error('Pass the path to a backup SQLite database');
const original=new DatabaseSync(source,{readOnly:true});
const raw=original.prepare('SELECT state FROM worlds WHERE id=1').get().state;original.close();
const before=JSON.parse(raw),db=database(':memory:');
db.prepare('UPDATE worlds SET state=? WHERE id=1').run(raw);
let w=readWorld(db);assert.equal(totalCash(w),totalCash(before));
for(const n of before.npcs){const after=w.npcs.find(a=>a.id===n.id);assert.ok(after);assert.equal(after.cash,n.cash);assert.deepEqual(after.parents,n.parents||[]);}
for(let i=0;i<10;i++){saveWorld(db,w);w=readWorld(db);}
assert.equal(totalCash(w),totalCash(before));assert.equal(w.npcs.length,before.npcs.length);
db.prepare('UPDATE worlds SET state=? WHERE id=1').run('{corrupt');
assert.throws(()=>mutate(db,()=>{}));assert.equal(db.prepare('SELECT state FROM worlds').get().state,'{corrupt');
console.log(JSON.stringify({saveLoad:'pass',cycles:10,citizens:w.npcs.length,cashPreserved:true,corruptionNotOverwritten:true}));db.close();
