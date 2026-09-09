import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {database,mutate,readWorld} from '../server/db.mjs';
import {claimResident} from '../server/citizenship.mjs';
import {totalCash} from '../server/simulation.mjs';
// Run with the game server stopped. Preserve the existing population and all progression.
const db=database();
try{
 const pending=Object.values(readWorld(db).players).filter(p=>!p.citizenshipAccount&&!p.citizenId);
 if(!pending.length){console.log('Citizenship migration already applied.');}
 else{
  const dir=resolve('data/backups');mkdirSync(dir,{recursive:true});const backup=resolve(dir,`before-citizenship-${Date.now()}.sqlite`);db.exec(`VACUUM INTO '${backup.replaceAll("'","''")}'`);
  const report=mutate(db,w=>{const before=totalCash(w),count=w.npcs.length,converted=[];for(const p of Object.values(w.players)){if(p.citizenshipAccount||p.citizenId)continue;const n=w.npcs.find(n=>!n.controllerId&&n.age>=18&&n.residency!=='away'&&!w.businesses.some(b=>b.owner===n.id));if(!n)throw Error('No available resident for existing account');claimResident(w,p,n.id,{legacy:true});converted.push({account:p.accountName,citizen:n.name});}if(totalCash(w)!==before||w.npcs.length!==count)throw Error('Migration conservation check failed');w.citizenshipVersion=1;return {converted,residents:count,cashConserved:true};});console.log(JSON.stringify({backup,...report}));
 }
}finally{db.close();}
