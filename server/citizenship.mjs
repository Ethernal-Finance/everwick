import {generationLabel,closeKin,GEN_Z,isGenZ} from './genealogy.mjs';
import {ensureAppearance,appearanceSummary} from './appearance.mjs';
import {HOMES} from '../client/world-map.js';

// Accounts own control rights to citizens. Only one owned citizen can be actively controlled at a time.
export const AFK_MS=90000;
export const MAX_BIRTHS_AS_PARENT=50;
const shared=['cash','inventory','x','y','avatar','appearance','needs','health','personality','skills','housing','employer','occupation','goal','insideHouse','indoor','fishing'];

export function personalityFor(id){
 let seed=2166136261;for(const ch of id)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return 15+seed%71;};
 const traits={ambition:next(),sociability:next(),diligence:next(),curiosity:next(),generosity:next(),caution:next()};
 return {version:1,traits,values:['family','craft','community','independence','security'][seed%5],description:`Values ${['family','craft','community','independence','security'][seed%5]}; ${traits.diligence>55?'takes responsibilities seriously':'prefers a flexible routine'}; ${traits.sociability>55?'seeks company':'enjoys quiet time'}.`};
}

/** Deterministic ~50/50 sex from citizen id. Server-only; never accept client PATCH for sex. */
export function sexFromId(id){
 let seed=2166136261;for(const ch of String(id))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 return (seed&1)===0?'female':'male';
}
export function ensureCitizenSex(n){
 if(!n)return n;
 if(n.sex!=='male'&&n.sex!=='female')n.sex=sexFromId(n.id);
 return n;
}
export const ensureSex=ensureCitizenSex;
export function complementarySexes(a,b){
 return !!a&&!!b&&((a.sex==='male'&&b.sex==='female')||(a.sex==='female'&&b.sex==='male'));
}

/** Bloodline breeding gate. Starters and Gen Z never breed. Gen A defaults breedable; offspring inherit if either parent can. */
export function citizenCanBreed(n){
 if(!n||n.starter||n.gm)return false;
 if(isGenZ(n))return false;
 if(n.canBreed===false)return false;
 if(n.canBreed===true)return true;
 // Founding Gen A stock (non-starter) is the breedable bloodline by default.
 return (n.generation||0)===0;
}

export function ensureBreedingFlags(n){
 if(!n)return n;
 ensureCitizenSex(n);
 n.starter=!!n.starter;
 n.birthsAsParent=Math.max(0,Number(n.birthsAsParent)||0);
 n.transferable=(n.starter||n.gm)?false:n.transferable!==false;
 if(n.gm){n.canBreed=false;n.generationLabel='GM';n.transferable=false;n.starter=false;}
 else if(n.starter){n.canBreed=false;n.generationLabel='S';}
 else{
  n.generation??=0;
  n.generationLabel=generationLabel(n.generation);
  if(n.canBreed===undefined)n.canBreed=(n.generation||0)===0;
  if(isGenZ(n))n.canBreed=false;
 }
 return n;
}

export function playerControls(w,n,now=Date.now()){const p=w.players[n?.controllerId];return !!p&&!p.accessRevoked&&p.citizenId===n?.id&&now-(p.controlAt||0)<AFK_MS&&now-(p.presenceAt||0)<15000;}
export function citizenPrice(n){const skills=Object.values(n.skills||{}).reduce((a,v)=>a+(Number(v)||0),0),health=Number(n.health||80),age=Number(n.age||18),prime=Math.max(0,30-Math.abs(age-30));return Math.max(650,Math.round((900+(n.cash||0)*.35+skills*45+health*4+prime*8+(n.generation||0)*20)/25)*25);}
export function founderResaleEligible(n){return (n?.generation||0)===0&&!!n?.founderPrimaryPurchaseId&&!n?.demoFounder&&!n?.demoData&&!n?.starter;}
export function ensureCitizenMarket(w){
 w.citizenMarket??={version:3,nextListing:1,listings:[],history:[]};
 const market=w.citizenMarket;market.version=3;market.listings??=[];market.history??=[];
 for(const n of w.npcs){
  ensureBreedingFlags(n);n.ownerId??=null;
  for(const l of market.listings.filter(l=>l.citizenId===n.id&&l.status==='active')){
   if(n.starter||n.transferable===false)l.status='cancelled';
  }
  for(const l of market.listings.filter(l=>l.citizenId===n.id&&l.status==='founder-locked'))if(founderResaleEligible(n)&&l.sellerId!=='treasury'&&n.ownerId===l.sellerId)l.status='active';
  const active=market.listings.find(l=>l.citizenId===n.id&&l.status==='active');
  if((n.generation||0)===0&&!n.starter&&active&&(!founderResaleEligible(n)||active.sellerId==='treasury'||n.ownerId!==active.sellerId))active.status='founder-locked';
  if(n.age>=18&&(n.generation||0)>0&&!n.starter&&!n.ownerId&&!active)market.listings.push({id:`citizen-listing-${market.nextListing++}`,citizenId:n.id,sellerId:'treasury',price:citizenPrice(n),status:'active',listedTick:w.tick,source:'town'});
  if(n.ownerId&&active&&active.sellerId==='treasury')active.status='cancelled';
 }
 market.listings=market.listings.slice(-1000);return market;
}
export function bindCitizens(w){
 for(const n of w.npcs){n.persona??=personalityFor(n.id);ensureBreedingFlags(n);n.ownerId??=null;ensureAppearance(n);if(n.gm){n.canBreed=false;n.transferable=false;n.generationLabel='GM';}}
 for(const c of w.children||[]){c.persona??=personalityFor(c.id);if(c.starter){c.canBreed=false;c.generationLabel='S';}else{c.generationLabel=generationLabel(c.generation||0);if(c.canBreed===undefined)c.canBreed=true;}ensureCitizenSex(c);ensureAppearance(c);}
 for(const p of Object.values(w.players)){
  p.ownedCitizenIds??=[];
  if(p.citizenId&&!p.ownedCitizenIds.includes(p.citizenId))p.ownedCitizenIds.push(p.citizenId);
  for(const id of p.ownedCitizenIds){const n=w.npcs.find(n=>n.id===id);if(n)n.ownerId=p.id;}
  if(!p.citizenId)continue;const n=w.npcs.find(n=>n.id===p.citizenId);if(!n)throw Error('Linked resident missing');
  n.controllerId=p.id;p.name=n.name;p.characterId=n.id;
  for(const key of shared)Object.defineProperty(p,key,{enumerable:true,configurable:true,get:()=>n[key],set:v=>{n[key]=v;}});
  p.characters=p.ownedCitizenIds.map(id=>{const x=w.npcs.find(n=>n.id===id);return x?{id:x.id,name:x.name,avatar:x.avatar||1,appearance:appearanceSummary(x),sex:x.sex,generation:x.gm?-1:(x.generation||0),generationLabel:x.gm?'GM':(x.starter?'S':x.generationLabel),starter:!!x.starter,gm:!!x.gm,canBreed:citizenCanBreed(x),active:x.id===p.citizenId}:null;}).filter(Boolean);
 }
 ensureCitizenMarket(w);return w;
}
export function newCitizenAccount(w,id,name){const p={id,name,accountName:name,cash:0,inventory:{},x:25,y:23,lastSeen:w.tick,created:w.tick,citizenshipAccount:true,onboarded:false,ownedCitizenIds:[]};w.players[id]=p;return p;}

/** Free starter life on registration: sterile, non-transferable, auto-controlled. Uses treasury transfer — never mints, never 4500. */
export function grantStarterCitizen(w,p,{transfer}={}){
 if(!p)throw Error('Account required');
 p.ownedCitizenIds??=[];
 const existing=p.ownedCitizenIds.map(id=>w.npcs.find(n=>n.id===id)).find(n=>n?.starter);
 if(existing){if(!p.citizenId){p.citizenId=existing.id;p.onboarded=true;}bindCitizens(w);return existing;}
 if(p.starterGranted){const n=w.npcs.find(n=>n.id===p.citizenId);if(n)return n;}
 w.population??={nextId:1,nextChild:1,history:[]};
 // Only numeric NPC suffixes are sequence IDs; account hashes are not numbers.
 const ids=w.npcs.map(n=>/^npc-(\d+)$/.exec(String(n.id))).filter(Boolean).map(m=>Number(m[1])).filter(Number.isSafeInteger);
 let idNum=Math.max(w.npcs.length+1,...ids.map(n=>n+1));
 while(w.properties.some(h=>h.id===`home-starter-${idNum}`))idNum++;
 w.population.nextId=idNum+1;
 const cid=`starter-${p.id.slice(0,8)}-${idNum}`;
 const h=HOMES[idNum%HOMES.length];
 const home={id:`home-starter-${idNum}`,name:`${idNum} Newcomer Lane`,tenant:cid,owner:'treasury',rent:30,forSale:false,valuation:900,x:h.x+1,y:h.y+1,mapBuilding:h.id,householdCapacity:4,interior:{version:0,nextId:1,furniture:[],floor:'oak',wall:'cream'}};
 const job=w.businesses.find(b=>b.status!=='paused'&&(b.employees||[]).length<12)||w.businesses[0];
 const n={id:cid,name:p.accountName||p.name||'Newcomer',age:22,cash:0,inventory:{food:2},housing:home.id,rent:30,employer:job?.id||null,occupation:job?(job.type==='Farm'?'Grower':job.type==='Mine'?'Miner':`${job.type} worker`):'Newcomer',relationships:{},memories:[],summary:'A free starter citizen beginning life in Everwick.',arrears:0,x:home.x,y:home.y,path:[],target:null,brain:null,contribution:{workSeconds:0,civicSeconds:0,produced:0},genes:Object.fromEntries(['craft','sociability','vigor','appearance'].map((k,i)=>[k,[1+(idNum*3+i)%5,1+(idNum*7+i*3)%5]])),parents:[],childrenIds:[],generation:0,generationLabel:'S',starter:true,canBreed:false,transferable:false,birthsAsParent:0,residency:'resident',settlementId:'everwick',birthplace:'Everwick',health:90,ownerId:p.id,controllerId:p.id,needs:{hunger:15,energy:90,social:65},personality:'kind',skills:{craft:2,trade:2},avatar:1+(idNum%40),persona:personalityFor(cid),goal:'Build a comfortable life in Everwick',ambition:'security',preferences:{maxFoodPrice:18,favorite:'food'},reputation:50,routine:'Settling into town',sex:sexFromId(cid)};
 ensureAppearance(n);ensureBreedingFlags(n);
 w.npcs.push(n);w.properties.push(home);if(job&&Array.isArray(job.employees)&&!job.employees.includes(n.id))job.employees.push(n.id);
 // Modest treasury transfer matching founding resident floors — not the legacy 4500 mint path.
 if(typeof transfer==='function')transfer(w,'treasury',n.id,350,'starter-citizen-grant');
 else{const take=Math.min(350,w.treasury?.cash||0);if(w.treasury)w.treasury.cash-=take;n.cash+=take;}
 p.citizenId=n.id;p.characterId=n.id;p.onboarded=true;p.citizenshipAccount=true;p.starterGranted=true;p.controlAt=0;p.presenceAt=0;
 if(!p.ownedCitizenIds.includes(n.id))p.ownedCitizenIds.push(n.id);
 bindCitizens(w);return n;
}


/** One GM overseer per admin account. Superior, non-breeding, non-transferable. Treasury transfer only. */
export function grantGmCitizen(w,p,{transfer,name}={}){
 if(!p)throw Error('Account required');
 p.ownedCitizenIds??=[];
 const existing=p.ownedCitizenIds.map(id=>w.npcs.find(n=>n.id===id)).find(n=>n?.gm);
 if(existing){
  if(!p.citizenId){p.citizenId=existing.id;p.onboarded=true;}
  bindCitizens(w);return existing;
 }
 // At most one GM citizen in the world per account; also block if another GM already owned by this player id.
 if(w.npcs.some(n=>n.gm&&n.ownerId===p.id)){
  const n=w.npcs.find(n=>n.gm&&n.ownerId===p.id);
  if(!p.ownedCitizenIds.includes(n.id))p.ownedCitizenIds.push(n.id);
  p.citizenId=n.id;bindCitizens(w);return n;
 }
 w.population??={nextId:1,nextChild:1,history:[]};
 const maxId=Math.max(0,...w.npcs.map(n=>Number(String(n.id).replace(/\D/g,''))||0),w.population.nextId||0);
 const idNum=Math.max(maxId+1,w.population.nextId||1);w.population.nextId=idNum+1;
 const cid=`gm-${p.id.slice(0,8)}-${idNum}`;
 const h=HOMES[idNum%HOMES.length];
 const home={id:`home-gm-${idNum}`,name:`GM Lodge ${idNum}`,tenant:cid,owner:p.id,rent:0,forSale:false,valuation:5000,x:h.x+2,y:h.y+2,mapBuilding:h.id,householdCapacity:8,interior:{version:0,nextId:1,furniture:[],floor:'oak',wall:'cream'}};
 const display=name||p.accountName||p.name||'GM Overseer';
 const n={id:cid,name:display,age:40,cash:0,inventory:{food:20},housing:home.id,rent:0,employer:null,occupation:'GM Overseer',relationships:{},memories:[],summary:'Admin GM citizen with authority above all other citizens.',arrears:0,x:home.x,y:home.y,path:[],target:null,brain:null,contribution:{workSeconds:0,civicSeconds:0,produced:0},genes:{craft:[5,5],sociability:[5,5],vigor:[5,5],appearance:[5,5]},parents:[],childrenIds:[],generation:-1,generationLabel:'GM',starter:false,gm:true,canBreed:false,transferable:false,authority:100,birthsAsParent:0,residency:'resident',settlementId:'everwick',birthplace:'Everwick',health:100,ownerId:p.id,controllerId:p.id,needs:{hunger:0,energy:100,social:100},personality:'decisive',skills:{craft:10,trade:10,authority:10},avatar:1,persona:personalityFor(cid),goal:'Oversee Everwick',ambition:'legacy',preferences:{maxFoodPrice:50,favorite:'food'},reputation:100,routine:'Administering Everwick',sex:sexFromId(cid)};
 ensureAppearance(n);ensureBreedingFlags(n);
 w.npcs.push(n);w.properties.push(home);
 const grant=5000;
 if(typeof transfer==='function')transfer(w,'treasury',n.id,grant,'gm-citizen-grant');
 else{const take=Math.min(grant,w.treasury?.cash||0);if(w.treasury)w.treasury.cash-=take;n.cash+=take;}
 p.citizenId=n.id;p.characterId=n.id;p.onboarded=true;p.citizenshipAccount=true;p.gmGranted=true;p.controlAt=0;p.presenceAt=0;
 if(!p.ownedCitizenIds.includes(n.id))p.ownedCitizenIds.push(n.id);
 bindCitizens(w);return n;
}

export function grantDemoFounderCompanion(w,p,primaryId){
 const primary=w.npcs.find(n=>n.id===primaryId&&n.age>=18&&(n.generation||0)===0&&!n.starter&&n.ownerId===p.id);if(!primary)throw Error('Demo founder is unavailable.');
 w.economyMode='demo';p.ownedCitizenIds??=[];if(p.ownedCitizenIds.filter(id=>{const n=w.npcs.find(x=>x.id===id);return n&&(n.generation||0)===0&&!n.starter;}).length>=2)return p.ownedCitizenIds.map(id=>w.npcs.find(n=>n.id===id)).filter(n=>n&&!n.starter);
 ensureCitizenSex(primary);
 let companion=primary.partnerId?w.npcs.find(n=>n.id===primary.partnerId&&n.age>=18&&(n.generation||0)===0&&!n.starter&&!n.ownerId&&n.residency!=='away'&&!closeKin(w,primary,n)&&complementarySexes(ensureCitizenSex(n),primary)):null;
 if(!companion)companion=w.npcs.find(n=>n.id!==primary.id&&n.age>=18&&(n.generation||0)===0&&!n.starter&&!n.ownerId&&n.residency!=='away'&&!n.controllerId&&!n.partnerId&&(n.settlementId||'everwick')===(primary.settlementId||'everwick')&&!closeKin(w,primary,n)&&complementarySexes(ensureCitizenSex(n),primary));
 if(!companion)throw Error('A second unrelated Generation A demo founder is not currently available.');
 companion.ownerId=p.id;companion.demoFounder=true;companion.canBreed=true;primary.demoFounder=true;primary.canBreed=true;if(!p.ownedCitizenIds.includes(companion.id))p.ownedCitizenIds.push(companion.id);
 if(!primary.partnerId&&!companion.partnerId){
  if(!complementarySexes(primary,companion))throw Error('Demo founder companions must be complementary sexes.');
  primary.partnerId=companion.id;companion.partnerId=primary.id;primary.partnershipSinceDay=companion.partnershipSinceDay=Math.floor(w.tick/24)-3;
  const householdId=[primary.id,companion.id].sort().join(':');primary.householdId=companion.householdId=householdId;primary.relationships??={};companion.relationships??={};primary.relationships[companion.id]=Math.max(primary.relationships[companion.id]||0,85);companion.relationships[primary.id]=Math.max(companion.relationships[primary.id]||0,85);
  for(const n of [primary,companion]){n.health=Math.max(88,n.health||0);n.needs??={};n.needs.hunger=Math.min(25,n.needs.hunger??25);n.needs.energy=Math.max(85,n.needs.energy??85);n.needs.social=Math.max(80,n.needs.social??80);}
 }
 bindCitizens(w);return [primary,companion];
}
export function claimResident(w,p,id,{legacy=false,founderPurchaseId=null}={}){
 const n=w.npcs.find(n=>n.id===id&&n.age>=18&&(n.generation||0)===0&&!n.starter&&!n.ownerId&&n.residency!=='away'&&!n.controllerId);if(!n)throw Error('Only unowned Generation A founders can be claimed through founder citizenship. Generation B and later citizens trade for in game coins.');
 const starterActive=p.citizenId&&w.npcs.find(x=>x.id===p.citizenId)?.starter;
 // Pack slots may claim multiple Gen A; starter-controlled accounts may claim into ownedCitizenIds.
 if(p.citizenId&&!starterActive&&!founderPurchaseId)throw Error('Your first citizenship already belongs to a resident.');
 if(legacy){p.legacyCitizenship=true;if(p.insideHouse){n.insideHouse=p.insideHouse;n.indoor=p.indoor;}n.cash+=p.cash||0;for(const[k,v]of Object.entries(p.inventory||{}))n.inventory[k]=(n.inventory[k]||0)+v;}
 p.accountName??=p.name;
 const prev=p.citizenId?w.npcs.find(x=>x.id===p.citizenId):null;
 if(prev&&prev.controllerId===p.id&&prev.id!==n.id)delete prev.controllerId;
 p.citizenId=n.id;p.onboarded=true;p.citizenshipAccount=true;p.controlAt=0;p.presenceAt=0;p.ownedCitizenIds??=[];if(!p.ownedCitizenIds.includes(n.id))p.ownedCitizenIds.push(n.id);
 p.characterId=n.id;n.controllerId=p.id;n.ownerId=p.id;n.canBreed=true;
 if(founderPurchaseId){n.founderPrimaryPurchaseId=String(founderPurchaseId);n.founderPrimaryBuyerId??=p.id;}
 for(const asset of [...w.properties,...w.businesses])if(asset.owner===n.id)asset.owner=p.id;
 bindCitizens(w);return n;
}
export function switchCitizen(w,p,id){
 if(p.dungeonRun?.active)throw Error('Finish or abandon the active dungeon run before switching citizens.');
 if(p.accessRevoked)throw Error('Citizenship access is inactive.');ensureCitizenMarket(w);const n=w.npcs.find(n=>n.id===id&&n.age>=18);if(!n||n.ownerId!==p.id)throw Error('You do not own this citizen.');if(w.citizenMarket.listings.some(l=>l.citizenId===id&&l.status==='active'))throw Error('Cancel this citizen marketplace listing before taking control.');
 const old=w.npcs.find(x=>x.id===p.citizenId);if(old&&old.id!==n.id&&old.controllerId===p.id)delete old.controllerId;
 p.citizenId=n.id;p.characterId=n.id;p.controlAt=0;p.presenceAt=0;n.controllerId=p.id;n.ownerId=p.id;bindCitizens(w);return n;
}
export function citizenCommand(w,p,action,data,{transfer}){ensureCitizenMarket(w);const market=w.citizenMarket;
 if(action==='switch-citizen')return switchCitizen(w,p,String(data.citizen||''));
 if(action==='buy-citizen'){
  const l=market.listings.find(x=>x.id===String(data.listing||'')&&x.status==='active');if(!l)throw Error('This citizen listing is no longer available');if(l.sellerId===p.id)throw Error('You already own this citizen');const n=w.npcs.find(n=>n.id===l.citizenId&&n.age>=18);if(!n||n.controllerId)throw Error('Citizen is unavailable');if(n.starter||n.transferable===false)throw Error('Starter citizens are not transferable.');if((n.generation||0)===0&&(!founderResaleEligible(n)||l.sellerId==='treasury'||l.source!=='player'))throw Error('An unowned Generation A founder requires a primary Stripe citizenship purchase before any coin resale.');if(n.ownerId&&n.ownerId!==l.sellerId)throw Error('Citizen ownership changed');if(!transfer(w,p.id,l.sellerId,l.price,'citizen-market-purchase'))throw Error(`You need ${l.price} coins to buy this citizen`);
  const seller=w.players[l.sellerId];if(seller){seller.ownedCitizenIds=(seller.ownedCitizenIds||[]).filter(id=>id!==n.id);seller.characters=(seller.characters||[]).filter(c=>c.id!==n.id);}
  const priorSex=n.sex;n.ownerId=p.id;delete n.controllerId;if(n.canBreed!==false&&!n.starter)n.canBreed=true;if(priorSex==='male'||priorSex==='female')n.sex=priorSex;else ensureCitizenSex(n);p.ownedCitizenIds??=[];if(!p.ownedCitizenIds.includes(n.id))p.ownedCitizenIds.push(n.id);l.status='sold';l.buyerId=p.id;l.soldTick=w.tick;market.history.unshift({tick:w.tick,citizenId:n.id,price:l.price,sellerId:l.sellerId,buyerId:p.id});market.history=market.history.slice(0,100);bindCitizens(w);return {citizen:n,listing:l};
 }
 if(action==='list-citizen'){
  const id=String(data.citizen||''),n=w.npcs.find(n=>n.id===id&&n.age>=18);if(!n||n.ownerId!==p.id)throw Error('You do not own this adult citizen');if(n.starter||n.transferable===false)throw Error('Starter citizens cannot be listed on the citizen marketplace.');if((n.generation||0)===0&&!founderResaleEligible(n))throw Error('This Generation A founder has not completed a primary Stripe citizenship purchase and cannot be resold for in game currency.');if(p.citizenId===n.id)throw Error('Switch to another owned citizen before listing this one');if(market.listings.some(l=>l.citizenId===id&&l.status==='active'))throw Error('This citizen is already listed');const price=Number(data.price);if(!Number.isSafeInteger(price)||price<100||price>100000)throw Error('Marketplace price must be 100 to 100,000 coins');const l={id:`citizen-listing-${market.nextListing++}`,citizenId:id,sellerId:p.id,price,status:'active',listedTick:w.tick,source:'player'};market.listings.push(l);return l;
 }
 if(action==='cancel-citizen-listing'){
  const l=market.listings.find(x=>x.id===String(data.listing||'')&&x.status==='active');if(!l||l.sellerId!==p.id)throw Error('You do not own this listing');l.status='cancelled';return l;
 }
 throw Error('Unknown citizen command');
}
export function demoCitizenshipEnabled(){
 const origin=String(process.env.APP_ORIGIN||'http://localhost:3100');
 const local=/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
 return process.env.NODE_ENV!=='production'&&(process.env.ALLOW_DEMO_CITIZENSHIP==='1'||(process.env.ALLOW_DEMO_CITIZENSHIP!=='0'&&local));
}
function ownsClaimedFounder(w,p){
 return (p.ownedCitizenIds||[]).some(id=>{const n=w.npcs.find(x=>x.id===id);return n&&!n.starter&&(n.generation||0)===0;});
}
export function citizenshipState(db,w,userId){bindCitizens(w);const p=w.players[userId],ents=db.prepare('SELECT purchase_id,slots_remaining,need_male,need_female FROM entitlements WHERE user_id=? AND active=1').all(userId),paid=ents.length>0,slotsRemaining=ents.reduce((a,e)=>a+(e.slots_remaining||0),0),demo=demoCitizenshipEnabled(),market=w.citizenMarket;
 const chars=(p.ownedCitizenIds||[]).map(id=>w.npcs.find(n=>n.id===id)).filter(Boolean).map(n=>({id:n.id,name:n.name,age:n.age,avatar:n.avatar,appearance:appearanceSummary(n),sex:n.sex,generation:n.generation||0,generationLabel:n.starter?'S':n.generationLabel,starter:!!n.starter,canBreed:citizenCanBreed(n),occupation:n.occupation,settlementId:n.settlementId||'everwick',active:n.id===p.citizenId,listed:market.listings.some(l=>l.citizenId===n.id&&l.status==='active'),founderResaleEligible:founderResaleEligible(n)}));
 const marketplace=market.listings.filter(l=>l.status==='active').map(l=>{const n=w.npcs.find(n=>n.id===l.citizenId);if(!n||n.starter)return null;const eligible=n&&((n.generation||0)>0||founderResaleEligible(n)&&l.sellerId!=='treasury'&&l.source==='player');return eligible?{...l,citizen:{id:n.id,name:n.name,age:n.age,avatar:n.avatar,occupation:n.occupation,generation:n.generation||0,generationLabel:n.generationLabel,sex:n.sex,health:n.health||80,skills:n.skills||{},appearance:appearanceSummary(n),settlementId:n.settlementId||'everwick',canBreed:citizenCanBreed(n),founderResaleEligible:founderResaleEligible(n)},mine:l.sellerId===p.id}:null;}).filter(Boolean);
 const zReached=w.npcs.some(isGenZ)||(w.children||[]).some(isGenZ);
 const population=w.npcs.length+(w.children||[]).filter(c=>!c.grown).length;
 return {citizenship:true,selected:p.citizenId||null,canClaim:slotsRemaining>0||(demo&&!ownsClaimedFounder(w,p)),paid,demo,slotsRemaining,needMale:ents.reduce((a,e)=>a+(e.need_male||0),0),needFemale:ents.reduce((a,e)=>a+(e.need_female||0),0),characters:chars,marketplace,marketHistory:market.history.slice(0,20),residents:w.npcs.filter(n=>n.age>=18&&(n.generation||0)===0&&!n.starter&&!n.ownerId&&n.residency!=='away').map(n=>({id:n.id,name:n.name,age:n.age,avatar:n.avatar,occupation:n.occupation,personality:n.personality,persona:n.persona,goal:n.goal,cash:n.cash,parents:n.parents||[],generation:n.generation||0,generationLabel:n.generationLabel,sex:n.sex,canBreed:citizenCanBreed(n),appearance:appearanceSummary(n)})),population,capacity:zReached?50000:null,zReached,genZ:GEN_Z};
}
export function refreshCitizenshipAccess(db,w){
 const rows=db.prepare('SELECT user_id,purchase_id FROM entitlements WHERE active=1').all(),paid=new Set(rows.map(e=>e.user_id)),purchaseByUser=new Map(rows.map(e=>[e.user_id,e.purchase_id]));
 for(const p of Object.values(w.players)){
  const active=p.citizenId?w.npcs.find(n=>n.id===p.citizenId):null;
  const starterPlay=!!active?.starter;
  if(p.citizenId)p.accessRevoked=!(p.legacyCitizenship||p.demoCitizenship&&process.env.NODE_ENV!=='production'||paid.has(p.id)||starterPlay);
  const purchaseId=purchaseByUser.get(p.id);if(purchaseId)for(const id of p.ownedCitizenIds||[]){const n=w.npcs.find(n=>n.id===id);if(n&&!n.starter&&!n.demoFounder&&!n.demoData&&!p.demoCitizenship&&(n.generation||0)===0&&!n.founderPrimaryPurchaseId){n.founderPrimaryPurchaseId=purchaseId;n.founderPrimaryBuyerId??=p.id;n.canBreed=true;}}
 }
 ensureCitizenMarket(w);
}

/** Full refund helper: clear owner/controller on Gen A bound to this purchase. Does not unwind B+ births/partners/children. */
export function revokePurchaseClaims(db,w,purchaseId){
 if(!purchaseId||!w)return [];
 const id=String(purchaseId);const cleared=[];
 for(const n of w.npcs||[]){
  if(n.founderPrimaryPurchaseId!==id||(n.generation||0)!==0||n.starter)continue;
  const owner=n.ownerId?w.players[n.ownerId]:null;
  if(owner){owner.ownedCitizenIds=(owner.ownedCitizenIds||[]).filter(x=>x!==n.id);if(owner.citizenId===n.id){owner.citizenId=null;owner.characterId=null;}}
  if(n.controllerId){const c=w.players[n.controllerId];if(c&&c.citizenId===n.id){c.citizenId=null;c.characterId=null;}delete n.controllerId;}
  n.ownerId=null;cleared.push(n.id);
 }
 ensureCitizenMarket(w);bindCitizens(w);return cleared;
}
