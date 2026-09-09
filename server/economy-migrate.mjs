import {HOMES,FRONTIER_SITES,WAYPOINTS} from '../client/world-map.js';
import {sexFromId,ensureCitizenSex,ensureBreedingFlags,bindCitizens,personalityFor} from './citizenship.mjs';
import {ensurePopulation} from './population.mjs';
import {ensureCivilization,ensureGenASpreadCamps,civilizationCash,assignRemoteJobAt} from './civilization.mjs';

function worldCash(w){
 return (w.construction?.projects||[]).reduce((s,p)=>s+(p.cash||0),0)
  +(w.treasury?.cash||0)
  +civilizationCash(w)
  +(w.npcs||[]).reduce((s,n)=>s+(n.cash||0),0)
  +(w.businesses||[]).reduce((s,b)=>s+(b.cash||0),0)
  +Object.values(w.players||{}).reduce((s,p)=>s+(p.citizenId?0:(p.cash||0)),0);
}

export const GEN_A_TARGET=250;
export const EVERWICK_GEN_A=40;
export const SATELLITE_GEN_A=60;
export const TRAVELING_GEN_A=80;
export const FRONTIER_GEN_A=70;
export const EVERWICK_SOFT_CEILING=48;
export const BUSINESS_TARGET=48;
export const HOME_TARGET=48;
export const TREASURY_FLOOR=2_000_000;
/** Town food demand (~40 Everwick Gen A), not full 250. */
export const FOOD_DEMAND_PER_DAY=150;
export const FOOD_BUFFER_DAYS=7;
export const FOOD_BUFFER=FOOD_DEMAND_PER_DAY*FOOD_BUFFER_DAYS;
export const HIRE_CAP=12;
export const OPERATING_SEATS=12;
export const OPERATING_DAYS=20;
export const FOUNDING_GRANT=350;
export const TRAVEL_DRIP_PER_DAY=12;

export const SATELLITE_SITES=[
 {id:'satellite-fernwood',name:'Fernwood Crossing',x:153,y:151},
 {id:'satellite-ridge',name:'Highland Road',x:409,y:279},
 {id:'satellite-forest-camp',name:'Fernwood Wilds Camp',x:220,y:180},
 {id:'satellite-downs',name:'Open Downs Camp',x:310,y:210},
 {id:'satellite-basin',name:'Bluewater Approach',x:280,y:360}
];

/** Alias — server-only; never overwrite an already-valid sex. */
export function ensureSex(n){return ensureCitizenSex(n);}

export function genACitizens(w){
 return (w.npcs||[]).filter(n=>!n.starter&&(n.generation||0)===0&&(n.age??18)>=18);
}

function claimedCitizen(w,n){
 return !!n.ownerId||!!n.controllerId||Object.values(w.players||{}).some(p=>(p.ownedCitizenIds||[]).includes(n.id));
}

function coreBusinesses(w){return (w.businesses||[]).filter(b=>!b.serviceKind);}
function localCoreBusinesses(w){
 const ids=new Set(CORE_SPECS.map(s=>s[0]));
 return coreBusinesses(w).filter(b=>ids.has(b.id));
}

const CORE_SPECS=[
 ['sunfield','Sunfield Farm','Farm','food',{},7,12,38,3,3],
 ['orchard','Bramble Orchard','Farm','food',{},6,13,40,9,3],
 ['mine','Copperhill Mine','Mine','ore',{},5,24,42,22,3],
 ['forge','Ember & Anvil','Blacksmith','tools',{ore:2},1,180,46,22,9],
 ['tavern','Green Dragon Tavern','Tavern','ale',{food:1},1,36,40,4,10],
 ['restaurant','The Copper Spoon','Restaurant','meal',{food:1},1,40,42,10,10],
 ['market','Market on the Square','Store','goods',{food:1},1,42,40,15,10],
 ['workshop','Reedwood Workshop','Workshop','tools',{ore:2},1,182,44,22,16],
 ['inn','The Lantern Inn','Inn','lodging',{food:1},1,45,40,4,17],
 ['clinic','Willow Clinic','Clinic','care',{food:1},1,40,44,10,17],
 ['warehouse','Eastgate Provisions','Warehouse','food',{},5,14,38,16,17],
 ['garden','Town Kitchen Garden','Farm','food',{},5,12,38,16,3]
];

const NAMES=['Mara','Theo','Iris','Rowan','Ada','Felix','Jun','Nora','Otis','Cleo','Marcus','Elin','Tamsin','Hugo','Lena','Silas','Poppy','Arthur','Wren','Bea','Clara','Quinn','Eden','Blake','Sage'];
const SURNAMES=['Hale','Moss','Reed','Vale','Finch','Brook','Ash','Cole','Dart','Glen'];

function makeBusiness(spec,index,suffix){
 const [baseId,baseName,type,output,recipe,rate,price,wage,x,y]=spec;
 const id=suffix===0?baseId:`${baseId}-${suffix}`;
 const name=suffix===0?baseName:`${baseName} ${suffix+1}`;
 const ox=x+(suffix%4)*2,oy=y+Math.floor(suffix/2)*2;
 return {id,name,type,output,recipe:{...recipe},rate,price,wage,x:ox,y:oy,cash:0,inventory:{food:20,ore:4,tools:1,[output]:output==='tools'?6:output==='ore'?15:40},owner:'treasury',employees:[],forSale:index>=4,valuation:index===4&&suffix===0?1200:2400+index*90+suffix*40,starterListing:index===4&&suffix===0,revenue:0,expenses:0,lastProfit:0,arrears:0,status:'open',hours:12,advertising:0,upgrade:0,settlementId:'everwick'};
}

function makeNpc(i){
 const h=HOMES[i%HOMES.length];
 const id=`npc-${i}`;
 const rent=35+i%4*5;
 return {
  id,name:`${NAMES[i%NAMES.length]} ${SURNAMES[Math.floor(i/NAMES.length)%SURNAMES.length]}`,
  age:20+i%49,personality:['kind','ambitious','thrifty','sociable','stubborn'][i%5],
  skills:{trade:1+i%5,craft:1+i%7},occupation:'Seeking work',cash:0,inventory:{food:3,goods:1},
  housing:`home-${i}`,rent,needs:{hunger:12,energy:90,social:70},
  goal:i%3===0?'Save enough to open a business':'Build a comfortable life in Everwick',
  ambition:i%3===0?'entrepreneur':'security',preferences:{maxFoodPrice:18+i%6,favorite:'food'},
  employer:null,relationships:{},memories:[],summary:'A founding resident of Everwick.',reputation:50,
  x:h.x+(i%3),y:h.y+2,routine:'Settling into town',arrears:0,
  generation:0,generationLabel:'A',starter:false,canBreed:true,transferable:true,birthsAsParent:0,
  parents:[],childrenIds:[],residency:'resident',settlementId:'everwick',birthplace:'Everwick',health:90,ownerId:null,
  sex:sexFromId(id),persona:personalityFor(id),
  genes:Object.fromEntries(['craft','sociability','vigor','appearance'].map((k,j)=>[k,[1+(i*3+j*7)%(k==='appearance'?40:5),1+(i*7+j*3)%(k==='appearance'?40:5)]])),
  avatar:1+(i%40)
 };
}

function makeHome(i,tenantId){
 const h=HOMES[i%HOMES.length];
 return {id:`home-${i}`,name:`${i+1} Willow Lane`,tenant:tenantId,owner:'treasury',rent:35+i%4*5,forSale:i%10===0,valuation:i%10===0?900:1600+(i%200)*10,starterListing:i%10===0,x:h.x+1+(i%5),y:h.y+1+Math.floor(i/5)%3,mapBuilding:h.id,householdCapacity:4,interior:{version:0,nextId:1,furniture:[],floor:'oak',wall:'cream'},settlementId:'everwick'};
}

function foodStock(w){
 return coreBusinesses(w).filter(b=>b.output==='food'&&(b.settlementId||'everwick')==='everwick').reduce((s,b)=>s+(b.inventory?.food||0),0);
}

export function foodDaysOfBuffer(w){return foodStock(w)/FOOD_DEMAND_PER_DAY;}

function balanceGenASex(w){
 const gens=genACitizens(w);
 for(const n of gens)ensureSex(n);
 let male=gens.filter(n=>n.sex==='male').length,female=gens.filter(n=>n.sex==='female').length;
 const flexible=gens.filter(n=>n.sex===sexFromId(n.id)).sort((a,b)=>a.id.localeCompare(b.id));
 for(const n of flexible){
  if(Math.abs(male-female)<=1)break;
  if(male>female+1&&n.sex==='male'){n.sex='female';male--;female++;}
  else if(female>male+1&&n.sex==='female'){n.sex='male';female--;male++;}
 }
 return {male,female};
}

function expandBusinesses(w){
 const existing=new Set(coreBusinesses(w).map(b=>b.id));
 for(let copy=0;copy<4;copy++)for(let i=0;i<CORE_SPECS.length;i++){
  const spec=makeBusiness(CORE_SPECS[i],i,copy);
  if(existing.has(spec.id))continue;
  w.businesses.push(spec);existing.add(spec.id);
 }
 const tavern=w.businesses.find(b=>b.id==='tavern');
 if(tavern){tavern.starterListing=true;if(tavern.forSale)tavern.valuation=1200;}
}

function expandGenA(w){
 const have=new Set(w.npcs.map(n=>n.id));
 const maxId=Math.max(0,...[...have].map(id=>Number(String(id).replace(/\D/g,''))||0));
 w.population??={nextId:maxId+1,nextChild:1,history:[]};
 for(let i=0;i<GEN_A_TARGET;i++){
  const id=`npc-${i}`;
  if(have.has(id)){
   const n=w.npcs.find(x=>x.id===id);
   n.starter=false;n.generation??=0;if(n.canBreed!==false)n.canBreed=true;ensureSex(n);ensureBreedingFlags(n);
   continue;
  }
  const n=makeNpc(i);
  w.npcs.push(n);have.add(id);
 }
 w.population.nextId=Math.max(w.population.nextId||0,GEN_A_TARGET);
 for(const n of genACitizens(w)){if(n.canBreed!==false)n.canBreed=true;n.starter=false;ensureSex(n);ensureBreedingFlags(n);}
}

function releaseEverwickJob(w,n){
 if(n.employer){
  const b=w.businesses.find(x=>x.id===n.employer);
  if(b)b.employees=(b.employees||[]).filter(id=>id!==n.id);
 }
 n.employer=null;
}

function vacateHome(w,n){
 const h=w.properties.find(p=>p.id===n.housing);
 if(h&&h.tenant===n.id)h.tenant=null;
 n.housing=null;
}

function regionalPos(n,x,y){
 const index=Number(String(n.id).replace(/\D/g,''))||0;
 return {x:x+2+(index%5)*1.2,y:y+2+Math.floor(index%15/5)*1.2};
}

function frontierCampId(siteId){return `frontier-${siteId}`;}

function cohortOf(n){
 if(n.residency==='traveling')return 'traveling';
 if(n.residency==='resident'&&(n.settlementId||'everwick')==='everwick')return 'everwick';
 if(String(n.settlementId||'').startsWith('satellite-'))return 'satellite';
 if(String(n.settlementId||'').startsWith('frontier-'))return 'frontier';
 if(n.residency==='away')return 'frontier';
 return 'everwick';
}

function travelPathTo(destId){
 const dest=SATELLITE_SITES.find(s=>s.id===destId)
  ||FRONTIER_SITES.find(s=>frontierCampId(s.id)===destId)
  ||FRONTIER_SITES.find(s=>s.id===destId);
 if(!dest)return WAYPOINTS.map(w=>({id:w.id,name:w.name,x:w.x,y:w.y}));
 const pts=WAYPOINTS.map(w=>({id:w.id,name:w.name,x:w.x,y:w.y}));
 // Prefer path that ends at nearest waypoint to dest, starting from everwick.
 const start=pts.find(p=>p.id==='everwick')||pts[0];
 const end=pts.slice().sort((a,b)=>Math.hypot(a.x-dest.x,a.y-dest.y)-Math.hypot(b.x-dest.x,b.y-dest.y))[0];
 const startIdx=pts.indexOf(start),endIdx=pts.indexOf(end);
 let path;
 if(startIdx<=endIdx)path=pts.slice(startIdx,endIdx+1);
 else path=pts.slice(endIdx,startIdx+1).reverse();
 if(path[path.length-1].x!==dest.x||path[path.length-1].y!==dest.y)path=path.concat([{id:dest.id||destId,name:dest.name,x:dest.x,y:dest.y}]);
 return path;
}

function placeAsEverwick(w,n,homeIndex){
 releaseEverwickJob(w,n);n.remoteEmployment=null;
 delete n.travelPath;delete n.travelIndex;delete n.travelDestination;delete n.locationLabel;
 n.residency='resident';n.settlementId='everwick';n.birthplace||='Everwick';
 delete n.regionalPosition;
 let home=w.properties.find(p=>p.id===n.housing&&(p.settlementId||'everwick')==='everwick');
 if(!home||(home.tenant&&home.tenant!==n.id)){
  home=w.properties.find(p=>(p.settlementId||'everwick')==='everwick'&&(!p.tenant||p.tenant===n.id));
 }
 if(!home){
  home=makeHome(homeIndex,n.id);
  w.properties.push(home);
 }
 home.tenant=n.id;home.householdCapacity??=4;home.settlementId='everwick';
 n.housing=home.id;n.rent=home.rent;n.x=home.x;n.y=home.y;
 n.occupation=n.occupation&&n.employer?n.occupation:'Seeking work';
 n.routine='Settling into town';
 n.locationLabel='Everwick';
}

function placeAsSatellite(w,n,site){
 releaseEverwickJob(w,n);vacateHome(w,n);
 delete n.travelPath;delete n.travelIndex;delete n.travelDestination;
 n.residency='away';n.settlementId=site.id;n.remoteRent=28;
 const pos=regionalPos(n,site.x,site.y);n.regionalPosition=pos;n.x=pos.x;n.y=pos.y;
 n.locationLabel=site.name;
 n.inventory??={};n.inventory.food=Math.max(n.inventory.food||0,4);
 assignRemoteJobAt(w,n,site.id);
 n.routine=`Camp life at ${site.name}`;
}

function placeAsFrontier(w,n,site){
 releaseEverwickJob(w,n);vacateHome(w,n);
 delete n.travelPath;delete n.travelIndex;delete n.travelDestination;
 const sid=frontierCampId(site.id);
 n.residency='away';n.settlementId=sid;n.remoteRent=26;
 const pos=regionalPos(n,site.x,site.y);n.regionalPosition=pos;n.x=pos.x;n.y=pos.y;
 n.locationLabel=site.name;
 n.inventory??={};n.inventory.food=Math.max(n.inventory.food||0,5);
 assignRemoteJobAt(w,n,sid);
 n.routine=`Frontier camp at ${site.name}`;
}

function placeAsTraveling(w,n,destId,spreadIndex=0){
 releaseEverwickJob(w,n);vacateHome(w,n);
 n.remoteEmployment=null;n.occupation='Caravan traveler';
 n.residency='traveling';n.settlementId=destId;n.travelDestination=destId;
 const path=travelPathTo(destId);
 n.travelPath=path;
 // Stagger along the path so 80 travelers do not share one waypoint tile.
 const idx=path.length?spreadIndex%path.length:0;
 n.travelIndex=idx;
 const wp=path[idx]||path[0]||{x:25,y:23,name:'Everwick'};
 const jx=((spreadIndex%7)-3)*.85,jy=((Math.floor(spreadIndex/3)%5)-2)*.85;
 n.x=wp.x+jx;n.y=wp.y+jy;n.regionalPosition={x:n.x,y:n.y};
 n.locationLabel=`En route to ${path[path.length-1]?.name||destId}`;
 n.inventory??={};n.inventory.food=Math.max(n.inventory.food||0,6);
 n.routine='Traveling the roads';
}

function distributeCounts(total,buckets){
 const base=Math.floor(total/buckets),rem=total%buckets;
 return Array.from({length:buckets},(_,i)=>base+(i<rem?1:0));
}

/**
 * Place Gen A into locked cohorts: 40 Everwick / 60 satellite / 80 traveling / 70 frontier.
 * Never relocates owned/claimed citizens.
 */
export function placeGenACohorts(w){
 ensureCivilization(w);
 ensureGenASpreadCamps(w);
 const gens=genACitizens(w).sort((a,b)=>a.id.localeCompare(b.id));
 const locked=gens.filter(n=>claimedCitizen(w,n));
 const free=gens.filter(n=>!claimedCitizen(w,n));

 const need={everwick:EVERWICK_GEN_A,satellite:SATELLITE_GEN_A,traveling:TRAVELING_GEN_A,frontier:FRONTIER_GEN_A};
 for(const n of locked){
  const c=cohortOf(n);
  if(need[c]>0)need[c]--;
 }

 const take=(k)=>{
  const out=[];
  while(out.length<need[k]&&free.length)out.push(free.shift());
  return out;
 };
 const everwick=take('everwick');
 const satellite=take('satellite');
 const traveling=take('traveling');
 const frontier=take('frontier');
 // Any remainder (should be none) goes frontier then satellite.
 while(free.length)frontier.push(free.shift());

 everwick.forEach((n,i)=>placeAsEverwick(w,n,i));

 const perSat=distributeCounts(satellite.length,SATELLITE_SITES.length);
 let si=0;
 for(let s=0;s<SATELLITE_SITES.length;s++){
  for(let k=0;k<perSat[s];k++)placeAsSatellite(w,satellite[si++],SATELLITE_SITES[s]);
 }

 const frontierSites=FRONTIER_SITES;
 const perFront=distributeCounts(frontier.length,frontierSites.length);
 let fi=0;
 const destCycle=[...frontierSites.map(s=>frontierCampId(s.id)),...SATELLITE_SITES.map(s=>s.id)];
 // Travelers: assign destination frontier or satellite (prefer frontier for visibility).
 traveling.forEach((n,i)=>{
  const dest=destCycle[i%destCycle.length];
  placeAsTraveling(w,n,dest,i);
 });

 fi=0;
 for(let s=0;s<frontierSites.length;s++){
  for(let k=0;k<perFront[s];k++)placeAsFrontier(w,frontier[fi++],frontierSites[s]);
 }

 // Soft ceiling: never leave more than 48 Everwick Gen A residents among unlocked.
 const everwickRes=genACitizens(w).filter(n=>cohortOf(n)==='everwick');
 if(everwickRes.length>EVERWICK_SOFT_CEILING){
  const overflow=everwickRes.filter(n=>!claimedCitizen(w,n)).slice(EVERWICK_GEN_A);
  overflow.forEach((n,i)=>placeAsFrontier(w,n,frontierSites[i%frontierSites.length]));
 }

 w.population??={};w.population.satellites=SATELLITE_SITES.map(s=>({id:s.id,name:s.name,x:s.x,y:s.y}));
 w.civilization.satellites=w.population.satellites;
}

function ensureEverwickHomes(w){
 const residents=genACitizens(w).filter(n=>cohortOf(n)==='everwick');
 residents.forEach((n,i)=>{
  let home=w.properties.find(p=>p.id===n.housing);
  if(!home){home=makeHome(i,n.id);n.housing=home.id;w.properties.push(home);}
  home.tenant=n.id;home.householdCapacity??=4;home.settlementId='everwick';
 });
 const named=w.properties.filter(p=>/^home-\d+$/.test(p.id)&&((p.settlementId||'everwick')==='everwick'));
 for(let i=named.length;i<HOME_TARGET;i++){
  if(w.properties.some(p=>p.id===`home-${i}`))continue;
  const home=makeHome(i,null);home.tenant=null;home.forSale=true;w.properties.push(home);
 }
}

function employEverwick(w){
 const biz=localCoreBusinesses(w).filter(b=>b.status!=='closed');
 for(const b of biz){
  b.status='open';
  b.employees=(b.employees||[]).filter(id=>{
   const n=w.npcs.find(n=>n.id===id);
   return n&&n.employer===b.id&&cohortOf(n)==='everwick';
  });
 }
 // Clear stray Gen A off local payrolls.
 for(const b of coreBusinesses(w)){
  b.employees=(b.employees||[]).filter(id=>{
   const n=w.npcs.find(x=>x.id===id);
   if(!n)return false;
   if(cohortOf(n)!=='everwick'){if(n.employer===b.id)n.employer=null;return false;}
   return n.employer===b.id;
  });
 }
 for(const n of genACitizens(w).filter(n=>cohortOf(n)==='everwick')){
  if(n.employer&&biz.some(b=>b.id===n.employer)){
   const b=biz.find(x=>x.id===n.employer);
   if(!b.employees.includes(n.id))b.employees.push(n.id);
   continue;
  }
  const open=biz.filter(b=>(b.employees||[]).length<HIRE_CAP).sort((a,b)=>(a.employees.length-b.employees.length)||a.id.localeCompare(b.id));
  const b=open[0]||biz[0];
  if(!b)continue;
  if(n.employer){const old=w.businesses.find(x=>x.id===n.employer);if(old)old.employees=(old.employees||[]).filter(id=>id!==n.id);}
  n.employer=b.id;n.remoteEmployment=null;
  n.occupation=b.type==='Farm'?'Grower':b.type==='Mine'?'Miner':`${b.type} worker`;
  if(!b.employees.includes(n.id))b.employees.push(n.id);
 }
}

function capitalizeBusinesses(w,mintLog){
 for(const b of coreBusinesses(w)){
  const float=Math.max(1,b.wage||40)*OPERATING_SEATS*OPERATING_DAYS;
  if((b.cash||0)>=float)continue;
  const need=float-(b.cash||0);
  if((w.treasury.cash||0)>=need){
   w.treasury.cash-=need;b.cash=(b.cash||0)+need;
   w.ledger.push({tick:w.tick||0,from:'treasury',to:b.id,amount:need,reason:'seed-biz-capitalize'});
  }else{
   mintLog.bizDirect=(mintLog.bizDirect||0)+need;
   b.cash=(b.cash||0)+need;
   w.ledger.push({tick:w.tick||0,from:'seed-capitalize',to:b.id,amount:need,reason:'seed-biz-capitalize-direct'});
  }
 }
}

function fundCampTreasuries(w){
 ensureGenASpreadCamps(w);
 const camps=(w.civilization?.settlements||[]).filter(t=>t.id!=='everwick'&&(String(t.id).startsWith('satellite-')||String(t.id).startsWith('frontier-')));
 for(const town of camps){
  const target=Math.max(8000,(town.housingCapacity||12)*35*20);
  const acct=town.treasury||(town.treasury={id:town.treasuryId,cash:0});
  const have=acct.cash||0;
  if(have>=target)continue;
  const need=target-have;
  if((w.treasury.cash||0)>=need){
   w.treasury.cash-=need;acct.cash=have+need;
   w.ledger.push({tick:w.tick||0,from:'treasury',to:town.treasuryId,amount:need,reason:'seed-camp-wage-float'});
  }
 }
}

function ensureFoodBuffer(w){
 const farms=coreBusinesses(w).filter(b=>b.output==='food'&&(b.settlementId||'everwick')==='everwick');
 if(!farms.length)return;
 const stock=foodStock(w);
 if(stock>=FOOD_BUFFER)return;
 const each=Math.ceil((FOOD_BUFFER-stock)/farms.length);
 for(const b of farms){b.inventory??={};b.inventory.food=(b.inventory.food||0)+each;}
}

function foundingGrants(w,mintLog){
 for(const n of genACitizens(w)){
  if((n.cash||0)>=FOUNDING_GRANT)continue;
  const need=FOUNDING_GRANT-(n.cash||0);
  if((w.treasury.cash||0)>=need){
   w.treasury.cash-=need;n.cash=(n.cash||0)+need;
   w.ledger.push({tick:w.tick||0,from:'treasury',to:n.id,amount:need,reason:'seed-founding-grant'});
  }else{
   mintLog.grantDirect=(mintLog.grantDirect||0)+need;
   n.cash=(n.cash||0)+need;
   w.ledger.push({tick:w.tick||0,from:'seed-capitalize',to:n.id,amount:need,reason:'seed-founding-grant-direct'});
  }
 }
}

function cohortCounts(w){
 const gens=genACitizens(w);
 const everwick=gens.filter(n=>cohortOf(n)==='everwick');
 const satellite=gens.filter(n=>cohortOf(n)==='satellite');
 const traveling=gens.filter(n=>n.residency==='traveling');
 const frontier=gens.filter(n=>cohortOf(n)==='frontier');
 return {genA:gens.length,everwickGenA:everwick.length,satellite:satellite.length,traveling:traveling.length,frontier:frontier.length};
}

/**
 * Idempotent Gen A scale-up to 250 with settlement spread 40/60/80/70.
 * Treasury floor uses an explicit seed-capitalize mint (not Stripe/Checkout).
 */
export function migrateGenA250(w){
 w.treasury??={id:'treasury',cash:0};w.ledger??=[];w.npcs??=[];w.businesses??=[];w.properties??=[];w.players??={};
 ensureCivilization(w);
 const cashBefore=worldCash(w);
 const mintLog={bizDirect:0,grantDirect:0};

 expandBusinesses(w);
 expandGenA(w);
 balanceGenASex(w);
 placeGenACohorts(w);
 ensureEverwickHomes(w);
 employEverwick(w);
 // Re-assign remote jobs after camps exist.
 for(const n of genACitizens(w)){
  if(cohortOf(n)==='satellite'||cohortOf(n)==='frontier')assignRemoteJobAt(w,n,n.settlementId);
 }
 foundingGrants(w,mintLog);
 capitalizeBusinesses(w,mintLog);
 ensureFoodBuffer(w);

 let capitalized=0;
 const topUp=()=>{
  const beforeTreasury=w.treasury.cash||0;
  if(beforeTreasury<TREASURY_FLOOR){
   const add=TREASURY_FLOOR-beforeTreasury;
   capitalized+=add;
   w.treasury.cash=TREASURY_FLOOR;
   w.ledger.push({tick:w.tick||0,from:'seed-capitalize',to:'treasury',amount:add,reason:'seed-treasury-capitalize'});
  }
 };
 topUp();
 fundCampTreasuries(w);
 topUp(); // camps funded from treasury; restore floor (no-op on remigrate when camps already full)
 capitalized+=mintLog.bizDirect+mintLog.grantDirect;

 ensurePopulation(w);
 bindCitizens(w);
 const cohorts=cohortCounts(w);
 w.genAMigration={version:2,at:Date.now(),target:GEN_A_TARGET,businesses:BUSINESS_TARGET,treasuryFloor:TREASURY_FLOOR,capitalized,mintLog,cohorts,spread:'40/60/80/70'};
 const gates=assertGenAMigrateGates(w);
 const cashAfter=worldCash(w);
 return {gates,capitalized,cashBefore,cashAfter,mintLog,cohorts};
}

export function assertGenAMigrateGates(w){
 const gens=genACitizens(w);
 for(const n of gens)ensureSex(n);
 const male=gens.filter(n=>n.sex==='male').length;
 const female=gens.filter(n=>n.sex==='female').length;
 const cohorts=cohortCounts(w);
 const everwick=gens.filter(n=>cohortOf(n)==='everwick');
 const housed=everwick.filter(n=>n.housing&&w.properties.some(p=>p.id===n.housing&&p.tenant===n.id)).length;
 const employed=everwick.filter(n=>n.employer&&w.businesses.some(b=>b.id===n.employer&&(b.employees||[]).includes(n.id))).length;
 const remotePool=gens.filter(n=>cohortOf(n)==='satellite'||cohortOf(n)==='frontier');
 const remoteEmployed=remotePool.filter(n=>!!n.remoteEmployment).length;
 const remotePct=remotePool.length?remoteEmployed/remotePool.length:1;
 const treasury=w.treasury?.cash||0;
 const days=foodDaysOfBuffer(w);
 const errors=[];
 if(gens.length!==GEN_A_TARGET)errors.push(`genA ${gens.length}!==${GEN_A_TARGET}`);
 if(cohorts.everwickGenA!==EVERWICK_GEN_A)errors.push(`everwickGenA ${cohorts.everwickGenA}!==${EVERWICK_GEN_A}`);
 if(cohorts.satellite!==SATELLITE_GEN_A)errors.push(`satellite ${cohorts.satellite}!==${SATELLITE_GEN_A}`);
 if(cohorts.traveling!==TRAVELING_GEN_A)errors.push(`traveling ${cohorts.traveling}!==${TRAVELING_GEN_A}`);
 if(cohorts.frontier!==FRONTIER_GEN_A)errors.push(`frontier ${cohorts.frontier}!==${FRONTIER_GEN_A}`);
 if(cohorts.everwickGenA>EVERWICK_SOFT_CEILING)errors.push(`everwickGenA ${cohorts.everwickGenA}>softCeiling ${EVERWICK_SOFT_CEILING}`);
 if(Math.abs(male-female)>1)errors.push(`sex imbalance male=${male} female=${female}`);
 if(housed!==EVERWICK_GEN_A)errors.push(`everwick housed ${housed}!==${EVERWICK_GEN_A}`);
 if(employed!==EVERWICK_GEN_A)errors.push(`everwick employed ${employed}!==${EVERWICK_GEN_A}`);
 if(remotePct<0.9)errors.push(`remote employed ${Math.round(remotePct*100)}%<90%`);
 if(treasury<TREASURY_FLOOR)errors.push(`treasury ${treasury}<${TREASURY_FLOOR}`);
 if(days<FOOD_BUFFER_DAYS)errors.push(`foodDays ${days}<${FOOD_BUFFER_DAYS}`);
 return {
  ok:errors.length===0,
  genA:gens.length,
  everwickGenA:cohorts.everwickGenA,
  satellite:cohorts.satellite,
  traveling:cohorts.traveling,
  frontier:cohorts.frontier,
  male,female,
  housed,employed,
  remoteEmployed,remotePct:Math.round(remotePct*1000)/10,
  treasury,
  foodDays:Math.round(days*100)/100,
  errors,
  coreBusinesses:coreBusinesses(w).length
 };
}

export {cohortOf,frontierCampId,travelPathTo,SATELLITE_SITES as GEN_A_SATELLITES};
