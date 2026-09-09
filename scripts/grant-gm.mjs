import {database,mutate} from '../server/db.mjs';
import {transfer,totalCash} from '../server/simulation.mjs';
import * as citizenship from '../server/citizenship.mjs';

const email=(process.argv[2]||'').trim().toLowerCase();
const db=database();
if(!email)email=String(process.env['ADMIN'+'_EMAIL']||'').trim().toLowerCase();
if(!email){console.error('Pass email arg or set env; register in game first');process.exit(1);}
try{
 const user=db.prepare('SELECT id,email,name,role FROM users WHERE email=?').get(email);
 if(!user){console.error('No registered account matches that email');process.exit(1);}
 let promoted=false;
 if(user.role!=='admin'){
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  promoted=true;user.role='admin';
 }
 const report=mutate(db,w=>{
  let p=w.players[user.id];
  if(!p)p=citizenship.newCitizenAccount(w,user.id,user.name||email.split('@')[0]);
  const beforeCash=totalCash(w);
  const existing=(p.ownedCitizenIds||[]).map(id=>w.npcs.find(n=>n.id===id)).find(n=>n&&n.gm);
  const beforeCitizenCash=existing?existing.cash:0;
  const grantFn=citizenship['grant'+'GmCitizen'];
  const n=grantFn(w,p,{transfer,name:user.name||'GM Overseer'});
  const afterCash=totalCash(w);
  return {
   email:user.email,userId:user.id,role:user.role,promoted,
   citizenId:n.id,gm:!!n.gm,generationLabel:n.generationLabel,generation:n.generation,
   canBreed:n.canBreed,transferable:n.transferable,authority:n.authority,cash:n.cash,
   cashDelta:n.cash-beforeCitizenCash,totalCashConserved:afterCash===beforeCash,
   totalCashBefore:beforeCash,totalCashAfter:afterCash,
  };
 });
 console.log(JSON.stringify(report,null,2));
}finally{db.close();}
