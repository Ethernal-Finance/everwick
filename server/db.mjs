import {bindCitizens} from './citizenship.mjs';
import {ensurePopulation} from './population.mjs';
import {ensureHousing} from './housing.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {seedWorld,tick} from './simulation.mjs';
import {ensureStarterEconomy} from './economy.mjs';
import {advanceMovement,migrateMap} from './movement.mjs';
import {ensureCivilization} from './civilization.mjs';
import {ensureAppearanceShops} from './appearance.mjs';
export function database(path=process.env.DATABASE_PATH||'./data/everwick.sqlite'){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY,applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS worlds(id INTEGER PRIMARY KEY CHECK(id=1),state TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'player',created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),tier TEXT NOT NULL,status TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 0,refunded INTEGER NOT NULL DEFAULT 0,mode TEXT NOT NULL,payment_intent TEXT,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS entitlements(purchase_id TEXT PRIMARY KEY REFERENCES purchases(id),user_id TEXT NOT NULL,tier TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY,processed_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS customers(stripe_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),mode TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS waitlist(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,code TEXT UNIQUE NOT NULL,referred_by TEXT,source TEXT,consent INTEGER NOT NULL,joined_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS analytics(id INTEGER PRIMARY KEY,event TEXT NOT NULL,user_id TEXT,source TEXT,created_at INTEGER NOT NULL,metadata TEXT);
 CREATE TABLE IF NOT EXISTS ai_tasks(id TEXT PRIMARY KEY,kind TEXT NOT NULL,status TEXT NOT NULL,request TEXT NOT NULL,result TEXT,attempts INTEGER DEFAULT 0,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS ai_usage(id INTEGER PRIMARY KEY,task_id TEXT,provider TEXT,input_tokens INTEGER,output_tokens INTEGER,cost REAL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,user_id TEXT,action TEXT,detail TEXT,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS command_keys(user_id TEXT NOT NULL,key TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,key));
 INSERT OR IGNORE INTO migrations(version) VALUES(1);
 DROP TABLE IF EXISTS wallet_nonces;
 DROP TABLE IF EXISTS wallets;
 INSERT OR IGNORE INTO migrations(version) VALUES(2);
 CREATE TABLE IF NOT EXISTS ops(key TEXT PRIMARY KEY, value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS user_mfa(user_id TEXT PRIMARY KEY REFERENCES users(id), secret TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, confirmed_at INTEGER);
 CREATE TABLE IF NOT EXISTS admin_elevations(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
 INSERT OR IGNORE INTO ops(key,value) VALUES('sales_enabled','1');
 INSERT OR IGNORE INTO migrations(version) VALUES(3);`);
 migratePackEntitlements(db);
 if(!db.prepare('SELECT id FROM worlds WHERE id=1').get())db.prepare('INSERT INTO worlds VALUES(1,?)').run(JSON.stringify(seedWorld()));
 return db;
}
function migratePackEntitlements(db){
 if(db.prepare('SELECT version FROM migrations WHERE version=4').get())return;
 const cols=new Set(db.prepare('PRAGMA table_info(entitlements)').all().map(c=>c.name));
 const add=(name,ddl)=>{if(!cols.has(name))db.exec(`ALTER TABLE entitlements ADD COLUMN ${ddl}`);};
 add('slots_total','slots_total INTEGER');
 add('slots_remaining','slots_remaining INTEGER');
 add('need_male','need_male INTEGER NOT NULL DEFAULT 0');
 add('need_female','need_female INTEGER NOT NULL DEFAULT 0');
 const slotMap={citizen:1,founder:1,breeder:2,town:2,city:3,patron:5};
 const bound=new Set();
 try{
  const row=db.prepare('SELECT state FROM worlds WHERE id=1').get();
  if(row?.state){const w=JSON.parse(row.state);for(const n of w.npcs||[]){if(n?.founderPrimaryPurchaseId&&(n.generation||0)===0&&!n.starter)bound.add(String(n.founderPrimaryPurchaseId));}}
 }catch{}
 for(const e of db.prepare('SELECT purchase_id,tier,slots_total,slots_remaining FROM entitlements').all()){
  if(e.slots_total!=null&&e.slots_remaining!=null){
   if(e.tier==='citizen')db.prepare("UPDATE entitlements SET tier='founder' WHERE purchase_id=?").run(e.purchase_id);
   continue;
  }
  const total=slotMap[e.tier]??1;
  const remaining=bound.has(String(e.purchase_id))?0:total;
  const needM=e.tier==='breeder'?1:0,needF=e.tier==='breeder'?1:0;
  const canon=e.tier==='citizen'?'founder':e.tier;
  db.prepare('UPDATE entitlements SET tier=?,slots_total=?,slots_remaining=?,need_male=?,need_female=? WHERE purchase_id=?')
   .run(canon,total,remaining,needM,needF,e.purchase_id);
 }
 db.prepare("UPDATE entitlements SET slots_total=COALESCE(slots_total,1),slots_remaining=COALESCE(slots_remaining,1),need_male=COALESCE(need_male,0),need_female=COALESCE(need_female,0),tier=CASE WHEN tier='citizen' THEN 'founder' ELSE tier END").run();
 db.prepare('INSERT OR IGNORE INTO migrations(version) VALUES(4)').run();
}
export function atomic(db,fn){db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
export function readWorld(db){const w=JSON.parse(db.prepare('SELECT state FROM worlds WHERE id=1').get().state);for(const [i,p]of w.properties.entries()){p.forSale??=i%10===0;p.valuation??=i%10===0?900:1600+i*10;}ensureAppearanceShops(w);migrateMap(w);ensureHousing(w);ensurePopulation(w);ensureCivilization(w);ensureStarterEconomy(w);bindCitizens(w);return w;}
export function saveWorld(db,w){db.prepare('UPDATE worlds SET state=? WHERE id=1').run(JSON.stringify(w));}
export function mutate(db,fn){return atomic(db,()=>{const w=readWorld(db);const result=fn(w);saveWorld(db,w);return result;});}
export function catchUp(db,now=Date.now(),interval=15000,max=96){return mutate(db,w=>{w.lastMotionAt??=w.lastTickAt;const count=Math.max(0,Math.min(max,Math.floor((now-w.lastTickAt)/interval)));for(let i=0;i<count;i++){const due=w.lastTickAt+interval;advanceMovement(w,Math.max(0,(due-w.lastMotionAt)/1000));tick(w,{advanceSeconds:0});w.lastTickAt=due;w.lastMotionAt=due;}if(now-w.lastTickAt<interval){advanceMovement(w,Math.max(0,(now-w.lastMotionAt)/1000));w.lastMotionAt=now;}return count;});}
export function audit(db,user,action,detail){db.prepare('INSERT INTO audit(user_id,action,detail,created_at) VALUES(?,?,?,?)').run(user,action,JSON.stringify(detail),Date.now());}
