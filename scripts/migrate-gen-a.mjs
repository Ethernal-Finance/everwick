import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {database,mutate,readWorld} from '../server/db.mjs';
import {migrateGenA250,assertGenAMigrateGates} from '../server/economy-migrate.mjs';
import {totalCash} from '../server/simulation.mjs';

const path=process.env.DATABASE_PATH||'./data/everwick.sqlite';
const db=database(path);
try{
 const before=readWorld(db);
 const cash0=totalCash(before);
 if(path!==':memory:'){
  const dir=resolve('data/backups');mkdirSync(dir,{recursive:true});
  const backup=resolve(dir,`before-gen-a-${Date.now()}.sqlite`);
  try{db.exec(`VACUUM INTO '${backup.replaceAll("'","''")}'`);}catch{/* :memory: or vacuum unsupported */}
 }
 const report=mutate(db,w=>{
  const result=migrateGenA250(w);
  const gates=assertGenAMigrateGates(w);
  return {...result,gates,cashBefore:cash0,cashAfter:totalCash(w),delta:totalCash(w)-cash0,note:'treasury seed-capitalize is the intentional mint; biz/grant fills prefer treasury transfers'};
 });
 console.log(JSON.stringify({database:path,ok:report.gates.ok,...report.gates,capitalized:report.capitalized,cashBefore:report.cashBefore,cashAfter:report.cashAfter,delta:report.delta,mintLog:report.mintLog},null,2));
 if(!report.gates.ok)process.exitCode=1;
}finally{db.close();}
