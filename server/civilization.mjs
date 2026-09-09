import {FRONTIER_SITES,WAYPOINTS} from '../client/world-map.js';

const FOCUSES={
 balanced:{label:'Balanced',resources:{fertileSoil:55,timber:55,ore:45,fish:45,beauty:55},sectors:[['agriculture','Agriculture',26,2],['trades','Skilled trades',30,2],['commerce','Commerce',28,2],['services','Services',27,2]]},
 agriculture:{label:'Agriculture',resources:{fertileSoil:88,timber:58,ore:24,fish:52,beauty:68},sectors:[['agriculture','Agriculture',29,4],['food','Food processing',28,2],['commerce','Commerce',25,1]]},
 industry:{label:'Industry',resources:{fertileSoil:30,timber:54,ore:90,fish:25,beauty:28},sectors:[['mining','Mining',36,4],['manufacturing','Manufacturing',34,3],['services','Services',27,1]]},
 trade:{label:'Trade',resources:{fertileSoil:40,timber:42,ore:35,fish:58,beauty:76},sectors:[['commerce','Commerce',33,4],['logistics','Logistics',31,3],['services','Services',29,2]]}
};
const SERVICES=['roads','schools','safety','health'];
const DEVELOPMENT={
 housing:{label:'Housing row',cost:700,housing:6,jobs:0},
 store:{label:'General store',cost:900,housing:0,jobs:4},
 workshop:{label:'Workshop',cost:1200,housing:0,jobs:4}
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const townById=(w,id)=>w.civilization?.settlements.find(t=>t.id===id);
const frontierById=(w,id)=>w.civilization?.frontiers?.find(s=>s.id===id);
const frontierSpec=id=>FRONTIER_SITES.find(s=>s.id===id);
const npcTown=n=>n.settlementId||'everwick';
const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-').slice(0,28);
function officialName(w,id){if(!id)return 'Vacant';return w.npcs.find(n=>n.id===id)?.name||w.players[id]?.name||id;}
function treasuryAccount(w,town){if(town.treasuryId==='treasury')return w.treasury;return town.treasury;}
function actorCanGovern(w,p,town){if(!p)return false;const ids=new Set([p.id,p.citizenId].filter(Boolean));return ids.has(town.government?.mayor?.holder);}
function localPopulation(w,id){return w.npcs.filter(n=>npcTown(n)===id&&n.age>=18);}
function claimed(w,n){return !!n.ownerId||!!n.controllerId||Object.values(w.players).some(p=>(p.ownedCitizenIds||[]).includes(n.id));}
function townHousingUsed(w,id){return localPopulation(w,id).length;}
function sectorEmployment(w,town,sectorId){return w.npcs.filter(n=>npcTown(n)===town.id&&n.remoteEmployment?.sectorId===sectorId).length;}
function openRemoteJobs(w,town){const jobs=[];for(const s of town.sectors){const used=sectorEmployment(w,town,s.id);for(let i=used;i<s.slots;i++)jobs.push({kind:'remote',townId:town.id,sectorId:s.id,name:s.name,wage:s.wage});}return jobs;}
function openEverwickJobs(w){return w.businesses.filter(b=>(b.settlementId||'everwick')==='everwick'&&b.status==='open'&&b.employees.length<12&&b.cash>b.wage*8).map(b=>({kind:'business',townId:'everwick',businessId:b.id,name:b.name,wage:b.wage}));}
function bestJob(w,town,n){const jobs=town.id==='everwick'?openEverwickJobs(w):openRemoteJobs(w,town);return jobs.sort((a,b)=>jobFit(n,b)-jobFit(n,a))[0]||null;}
function jobFit(n,j){let fit=j.wage;const craft=n.skills?.craft||1,trade=n.skills?.trade||1;if(/manufact|trades|mining|forestry|fishery/i.test(j.name))fit+=craft*1.2;if(/commerce|services|food|logistics/i.test(j.name))fit+=trade;return fit;}
function currentWage(w,n){if(n.remoteEmployment)return n.remoteEmployment.wage||0;return w.businesses.find(b=>b.id===n.employer)?.wage||0;}
function rentFor(w,town,n){if(town.id==='everwick')return w.properties.find(p=>p.id===n.housing)?.rent||n.rent||35;return town.rentIndex;}
function socialScore(w,n,townId){let score=0;for(const [id,value] of Object.entries(n.relationships||{})){const peer=w.npcs.find(x=>x.id===id);if(peer&&npcTown(peer)===townId)score+=Math.max(-10,Math.min(10,value/10));}for(const id of n.parents||[]){const parent=w.npcs.find(x=>x.id===id);if(parent&&npcTown(parent)===townId)score+=8;}return clamp(score,-20,28);}
function opportunityScore(w,n,town){
 const job=bestJob(w,town,n),wage=job?.wage||0,rent=rentFor(w,town,n),services=Object.values(town.services).reduce((a,v)=>a+v,0)/4,tax=town.taxes.incomeTax;
 const vacancy=Math.max(0,town.housingCapacity-townHousingUsed(w,town.id));
 let score=wage*2-rent-tax*.7+services*.32+socialScore(w,n,town.id)+Math.min(12,vacancy*1.5)+(town.development?.stores||0)*2;
 const traits=n.persona?.traits||{};
 if((traits.ambition||50)>60)score+=wage*.45;
 if((traits.caution||50)>65)score+=town.services.safety*.12;
 if((traits.sociability||50)>65)score+=Math.min(12,localPopulation(w,town.id).length*.25);
 if(n.personality==='thrifty')score-=rent*.25;
 if(town.policies.immigration==='restricted')score-=25;
 if(town.policies.immigration==='managed')score-=6;
 return {score,job,wage,rent};
}
function releaseLocalJob(w,n){if(n.employer){const b=w.businesses.find(b=>b.id===n.employer);if(b)b.employees=b.employees.filter(id=>id!==n.id);}n.employer=null;n.remoteEmployment=null;}
function assignJob(w,n,town,job){if(!job){n.occupation='Seeking work';return;}if(job.kind==='business'){const b=w.businesses.find(b=>b.id===job.businessId);if(b&&!b.employees.includes(n.id))b.employees.push(n.id);n.employer=b?.id||null;n.remoteEmployment=null;n.occupation=b?`${b.type} worker`:'Seeking work';}else{n.employer=null;n.remoteEmployment={settlementId:town.id,sectorId:job.sectorId,name:job.name,wage:job.wage};n.occupation=`${job.name} worker`;}}
function vacateHouse(w,n){const h=w.properties.find(p=>p.id===n.housing);if(h&&h.tenant===n.id)h.tenant=null;}
function houseInEverwick(w,n){let h=w.properties.find(p=>p.id===n.housing);if(h&&!h.tenant){h.tenant=n.id;return h;}h=w.properties.find(p=>(p.settlementId||'everwick')==='everwick'&&!p.tenant);if(h){h.tenant=n.id;n.housing=h.id;n.rent=h.rent;return h;}return null;}
function regionalPosition(n,town){const index=Number(String(n.id).replace(/\D/g,''))||0;return {x:town.coordinates.x+2+(index%5)*1.2,y:town.coordinates.y+2+Math.floor(index%15/5)*1.2};}
function moveCitizen(w,n,to,job,event){
 const from=townById(w,npcTown(n));if(!from||from.id===to.id)return false;if(townHousingUsed(w,to.id)>=to.housingCapacity)return false;
 releaseLocalJob(w,n);if(from.id==='everwick')vacateHouse(w,n);n.settlementId=to.id;n.movedDay=Math.floor(w.tick/24);n.path=[];n.target=null;n.brain=null;n.walking=false;
 if(to.id==='everwick'){const h=houseInEverwick(w,n);if(!h)return false;n.residency='resident';delete n.regionalPosition;n.x=h.x;n.y=h.y;n.needs.hunger=Math.min(n.needs.hunger,35);}else{n.residency='away';n.remoteRent=to.rentIndex;n.regionalPosition=regionalPosition(n,to);}
 assignJob(w,n,to,job);to.migration.in++;from.migration.out++;
 const text=`${n.name} moved from ${from.name} to ${to.name}${job?` for ${job.wage} coins per day in ${job.name}`:''}.`;
 w.civilization.migrationLog.unshift({day:Math.floor(w.tick/24),citizen:n.id,from:from.id,to:to.id,wage:job?.wage||0,text});w.civilization.migrationLog=w.civilization.migrationLog.slice(0,80);
 event(w,'migration',`${n.name} moves to ${to.name}`,text,[n.id,to.id]);return true;
}
function frontierState(spec){return {id:spec.id,name:spec.name,x:spec.x,y:spec.y,biome:spec.biome,focus:spec.focus,landmark:structuredClone(spec.landmark),starterSector:structuredClone(spec.starterSector),stage:'wild',hall:{status:'unbuilt',work:0,required:4,founder:null},settlementId:null};}
function resourceForSite(spec,focus){const base={...(FOCUSES[focus]||FOCUSES.balanced).resources};if(!spec)return base;if(spec.landmark.item==='ore')base.ore=100;if(spec.landmark.item==='food'){base.fertileSoil=Math.max(base.fertileSoil,78);base.fish=Math.max(base.fish,85);}if(spec.id==='fernwood')base.timber=100;if(spec.id==='saffron')base.beauty=Math.max(base.beauty,72);return base;}
function makeTown(id,name,day,founder,focus='balanced',treasuryId=null,site=null){
 const spec=FOCUSES[focus]||FOCUSES.balanced,frontier=site&&frontierSpec(site.id),starter=frontier?.starterSector;
 const sectors=id==='everwick'?spec.sectors.map(([sid,sname,wage,slots])=>({id:sid,name:sname,wage,slots})):[starter?{id:starter.id,name:starter.name,wage:starter.wage,slots:2}:{id:spec.sectors[0][0],name:spec.sectors[0][1],wage:spec.sectors[0][2],slots:2}];
 return {id,name,foundedDay:day,founder,focus,siteId:site?.id||null,identity:spec.label+' settlement',treasuryId:treasuryId||`treasury:${id}`,treasury:treasuryId?undefined:{id:`treasury:${id}`,cash:0},coordinates:site?{x:site.x,y:site.y}:{x:id==='everwick'?25:20+day%7*9,y:id==='everwick'?23:12+day%5*11},government:{mayor:{title:'Mayor',holder:founder,termEnds:day+14},council:[],treasurer:null,sheriff:null,publicWorks:null,candidates:[]},taxes:{incomeTax:5,businessTax:5,salesTax:2,propertyTax:2},policies:{minimumWage:20,migrationIncentive:0,zoning:'balanced',immigration:'open'},services:{roads:id==='everwick'?45:30,schools:id==='everwick'?42:20,safety:id==='everwick'?50:32,health:id==='everwick'?44:20},resources:resourceForSite(frontier,focus),landmark:frontier?structuredClone(frontier.landmark):id==='everwick'?{name:'Copperhill Mine',description:'The copper and iron ridge anchors Everwick industry.',item:'ore',label:'Ore',bonus:1.25}:null,sectors,housingCapacity:id==='everwick'?Math.max(40,25):1,rentIndex:id==='everwick'?40:28,landValue:id==='everwick'?100:48,development:id==='everwick'?{townHall:1,housing:25,stores:8,workshops:4}:{townHall:1,housing:0,stores:0,workshops:0},stock:{},productionToday:{},migration:{in:0,out:0},stats:{population:0,employment:0,unemployment:0,averageWage:0,jobs:0,openings:0,qualityOfLife:50},history:[]};
}
export function ensureCivilization(w){
 w.civilization??={version:2,nextSettlement:2,migrationLog:[],nation:{id:'everreach',name:'Commonwealth of Everreach',treasury:{id:'treasury:nation',cash:0},government:{chancellor:{title:'Chancellor',holder:'npc-12'},assembly:['npc-13','npc-14','npc-15']}},region:{id:'greenvale',name:'Greenvale Region',treasury:{id:'treasury:region',cash:0},government:{governor:{title:'Governor',holder:'npc-10'},council:['npc-8','npc-9','npc-11']}},settlements:[],frontiers:[]};
 w.civilization.version=2;w.civilization.migrationLog??=[];w.civilization.nextSettlement??=2;w.civilization.frontiers??=[];
 for(const spec of FRONTIER_SITES){let f=w.civilization.frontiers.find(x=>x.id===spec.id);if(!f)w.civilization.frontiers.push(frontierState(spec));else{f.name=spec.name;f.x=spec.x;f.y=spec.y;f.biome=spec.biome;f.focus??=spec.focus;f.landmark??=structuredClone(spec.landmark);f.starterSector??=structuredClone(spec.starterSector);f.hall??={status:'unbuilt',work:0,required:4,founder:null};}}
 if(!w.civilization.settlements?.length)w.civilization.settlements=[makeTown('everwick','Everwick',0,'npc-0','balanced','treasury')];
 const everwick=townById(w,'everwick');everwick.government??=makeTown('everwick','Everwick',0,'npc-0','balanced','treasury').government;everwick.treasuryId='treasury';delete everwick.treasury;
 everwick.coordinates??={x:25,y:23};everwick.landmark??={name:'Copperhill Mine',description:'The copper and iron ridge anchors Everwick industry.',item:'ore',label:'Ore',bonus:1.25};everwick.development??={townHall:1,housing:25,stores:8,workshops:4};everwick.stock??={};everwick.productionToday??={};
 everwick.government.council??=['npc-1','npc-2','npc-3'];everwick.government.treasurer??='npc-4';everwick.government.sheriff??='npc-6';everwick.government.publicWorks??='npc-8';everwick.policies??={minimumWage:20,migrationIncentive:0,zoning:'balanced',immigration:'open'};everwick.taxes??={incomeTax:5,businessTax:5,salesTax:2,propertyTax:2};everwick.services??={roads:45,schools:42,safety:50,health:44};everwick.resources??={...FOCUSES.balanced.resources};everwick.sectors??=[];everwick.migration??={in:0,out:0};everwick.history??=[];
 const mine=w.businesses.find(b=>b.id==='mine');if(mine){mine.baseRate??=mine.rate;mine.rate=Math.max(mine.rate,Math.round(mine.baseRate*everwick.landmark.bonus));mine.landmark=everwick.landmark.name;}
 for(const town of w.civilization.settlements){town.development??={townHall:1,housing:Math.max(0,Math.ceil((town.housingCapacity||1)/6)),stores:0,workshops:0};town.stock??={};town.productionToday??={};if(town.siteId){const f=frontierById(w,town.siteId);if(f){f.stage='chartered';f.settlementId=town.id;f.hall.status='complete';f.hall.founder??=town.founder;town.coordinates={x:f.x,y:f.y};town.landmark??=structuredClone(f.landmark);}}}
 for(const n of w.npcs)n.settlementId??='everwick';for(const b of w.businesses)b.settlementId??='everwick';for(const p of w.properties)p.settlementId??='everwick';
 // Gen A camps are ensured by migrate / travel ticks (avoid recurse via ensureGenASpreadCamps calling ensureCivilization)
 updateStats(w);return w.civilization;
}
export function civilizationAccount(w,id){ensureCivilization(w);if(id==='treasury:region')return w.civilization.region.treasury;if(id==='treasury:nation')return w.civilization.nation.treasury;const town=w.civilization.settlements.find(t=>t.treasuryId===id);return town?.treasury||null;}
function updateStats(w){if(!w.civilization)return;for(const town of w.civilization.settlements){const pop=localPopulation(w,town.id),employed=pop.filter(n=>town.id==='everwick'?!!n.employer:!!n.remoteEmployment),wages=employed.map(n=>currentWage(w,n));const openings=town.id==='everwick'?openEverwickJobs(w).length:openRemoteJobs(w,town).length;const service=Object.values(town.services).reduce((a,v)=>a+v,0)/4;town.stats={population:pop.length,employment:employed.length,unemployment:pop.length?Math.round((1-employed.length/pop.length)*100):0,averageWage:wages.length?Math.round(wages.reduce((a,v)=>a+v,0)/wages.length):0,jobs:employed.length+openings,openings,qualityOfLife:Math.round(clamp(service+(100-town.rentIndex)*.18+(town.landValue<120?8:0)+(town.development?.stores||0)*1.5,0,100))};const pressure=pop.length/Math.max(1,town.housingCapacity);town.rentIndex=clamp(Math.round(town.rentIndex*(pressure>.85?1.04:pressure<.5?.98:1)),18,140);town.landValue=clamp(Math.round(50+town.stats.qualityOfLife*.6+pop.length*1.8+town.services.roads*.2+(town.development?.stores||0)*2),40,300);const top=[...town.sectors].sort((a,b)=>sectorEmployment(w,town,b.id)-sectorEmployment(w,town,a.id))[0];town.identity=top&&sectorEmployment(w,town,top.id)>=Math.max(3,pop.length*.3)?`${top.name} town`:town.landmark&&pop.length<4?`${town.landmark.name} frontier`:town.resources.beauty>70?'Scenic settlement':town.stats.openings>town.stats.population*.35?'Opportunity town':'Mixed community';}}
function produceLandmarkGoods(w,town){town.productionToday={};if(town.id==='everwick')return;const sector=town.sectors.find(s=>s.id===frontierSpec(town.siteId)?.starterSector?.id)||town.sectors[0];if(!sector||!town.landmark)return;const workers=sectorEmployment(w,town,sector.id);if(!workers)return;const qty=Math.max(1,Math.floor(workers*Number(town.landmark.bonus||1)));town.stock[town.landmark.item]=(town.stock[town.landmark.item]||0)+qty;town.productionToday[town.landmark.item]=qty;w.produced[town.landmark.item]=(w.produced[town.landmark.item]||0)+qty;}
function remoteEconomy(w,town,transfer,event){if(town.id==='everwick')return;const residents=localPopulation(w,town.id);for(const n of residents){let job=n.remoteEmployment&&town.sectors.find(s=>s.id===n.remoteEmployment.sectorId);if(!job){const found=bestJob(w,town,n);assignJob(w,n,town,found);job=found&&town.sectors.find(s=>s.id===found.sectorId);}if(job){n.remoteEmployment.wage=Math.max(town.policies.minimumWage,job.wage);const wage=n.remoteEmployment.wage;if(!transfer(w,town.treasuryId,n.id,wage,'remote-wage')){n.remoteEmployment=null;n.occupation='Seeking work';event(w,'job',`${town.name} misses a payroll`,`${n.name} lost work after the local employment fund ran short.`,[n.id,town.id]);}}const rent=n.remoteRent||town.rentIndex;if(n.cash>=rent)transfer(w,n.id,town.treasuryId,rent,'remote-rent');else n.arrears=(n.arrears||0)+1;}
 for(const s of town.sectors){const used=sectorEmployment(w,town,s.id),vacancy=s.slots?1-used/s.slots:0;if(vacancy>.35)s.wage=clamp(s.wage+1,town.policies.minimumWage,150);else if(vacancy<.05&&s.wage>town.policies.minimumWage)s.wage--;}
 produceLandmarkGoods(w,town);
}
function collectIncomeTax(w,town,transfer){const rate=town.taxes.incomeTax||0;if(!rate)return 0;let collected=0;const rows=w.ledger.filter(l=>l.tick===w.tick&&(l.reason==='wage'||l.reason==='profit-share'||l.reason==='remote-wage')&&localPopulation(w,town.id).some(n=>n.id===l.to));for(const l of rows){const amount=Math.floor(l.amount*rate/100);if(amount&&transfer(w,l.to,town.treasuryId,amount,'income-tax'))collected+=amount;}return collected;}
function publicServicePayroll(w,town,transfer){const residents=localPopulation(w,town.id);if(!residents.length)return 0;const acct=treasuryAccount(w,town),target=SERVICES.reduce((s,k)=>s+Math.max(0,55-town.services[k]),0);if(!target||acct.cash<20)return 0;const worker=residents[Math.floor(w.tick/24)%residents.length],pay=Math.min(25,acct.cash);if(!transfer(w,town.treasuryId,worker.id,pay,'civic-wage'))return 0;const key=SERVICES[Math.floor(w.tick/24)%SERVICES.length];town.services[key]=clamp(town.services[key]+1,0,100);return pay;}
function runElection(w,town,event){const day=Math.floor(w.tick/24);if(day<Number(town.government.mayor.termEnds||14))return;const residents=localPopulation(w,town.id);const candidates=[...new Set([town.government.mayor.holder,...(town.government.candidates||[]),...residents.filter(n=>(n.persona?.traits?.ambition||0)>55).slice(0,4).map(n=>n.id)].filter(Boolean))];if(!candidates.length){town.government.mayor.termEnds=day+14;return;}const votes=Object.fromEntries(candidates.map(c=>[c,0]));for(const voter of residents){let best=candidates[0],bestScore=-Infinity;for(const c of candidates){const candidate=w.npcs.find(n=>n.id===c);let score=(voter.relationships?.[c]||0)+(candidate?.reputation||50)*.3;if(c===town.government.mayor.holder)score+=(town.stats.qualityOfLife-50)*.7;score+=((Number(voter.id.replace(/\D/g,''))+String(c).length*7)%17);if(score>bestScore){bestScore=score;best=c;}}votes[best]++;}const winner=Object.entries(votes).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])))[0]?.[0]||candidates[0],old=town.government.mayor.holder;town.government.mayor={title:'Mayor',holder:winner,termEnds:day+14};town.government.candidates=[];town.history.unshift({day,title:'Mayoral election',body:`${officialName(w,winner)} won ${votes[winner]||0} votes.`});town.history=town.history.slice(0,40);if(old!==winner)event(w,'government',`${town.name} elects ${officialName(w,winner)}`,`${officialName(w,winner)} begins a fourteen day mayoral term.`,[town.id,winner]);}
function migrateUnclaimed(w,event){const towns=w.civilization.settlements;if(towns.length<2)return;let moved=0;for(const n of w.npcs){if(moved>=2||n.age<18||claimed(w,n))continue;const current=townById(w,npcTown(n));if(!current)continue;if(n.movedDay&&Math.floor(w.tick/24)-n.movedDay<3)continue;const here=opportunityScore(w,n,current);let best=null;for(const t of towns){if(t.id===current.id||townHousingUsed(w,t.id)>=t.housingCapacity)continue;const option=opportunityScore(w,n,t);if(!option.job)continue;const incentive=t.policies.migrationIncentive||0,threshold=n.employer||n.remoteEmployment?16:7;option.score+=Math.min(20,incentive/10);if(option.score>here.score+threshold&&(!best||option.score>best.score))best={town:t,...option};}if(best&&moveCitizen(w,n,best.town,best.job,event))moved++;}}
export function civilizationDay(w,{transfer,event}){ensureCivilization(w);ensureGenASpreadCamps(w);const day=Math.floor(w.tick/24);if(w.civilization.lastDay===day)return;w.civilization.lastDay=day;advanceTravelingCitizens(w,event);for(const town of w.civilization.settlements){town.migration={in:0,out:0};if(town.id==='everwick'){for(const b of w.businesses.filter(b=>(b.settlementId||'everwick')==='everwick'))b.wage=Math.max(b.wage,town.policies.minimumWage);}remoteEconomy(w,town,transfer,event);const tax=collectIncomeTax(w,town,transfer),civic=publicServicePayroll(w,town,transfer);town.lastBudget={day,tax,civic,treasury:treasuryAccount(w,town).cash};runElection(w,town,event);}updateStats(w);migrateUnclaimed(w,event);updateStats(w);for(const town of w.civilization.settlements){town.history.unshift({day,title:`${town.name} daily report`,body:`Population ${town.stats.population}. ${town.stats.openings} open jobs. Average wage ${town.stats.averageWage}. Treasury ${treasuryAccount(w,town).cash}.`});town.history=town.history.slice(0,40);}}
function requireNear(p,site,range=9){if(p.insideHouse||Math.hypot(Number(p.x)-site.x,Number(p.y)-site.y)>range)throw Error(`Travel to ${site.name} and stand near the settlement site first`);}
function addSectorJobs(town,id,name,wage,slots){let s=town.sectors.find(x=>x.id===id);if(!s){s={id,name,wage:Math.max(wage,town.policies.minimumWage),slots:0};town.sectors.push(s);}s.slots+=slots;return s;}
export function civilizationCommand(w,p,action,data,{transfer,event}){ensureCivilization(w);const day=Math.floor(w.tick/24);
 if(action==='start-town-hall'){const site=frontierById(w,String(data.site||''));if(!site)throw Error('Frontier site not found');requireNear(p,site);if(site.settlementId||site.hall.status==='complete')throw Error('This frontier already has a Town Hall');if(site.hall.status==='building')return site;const cost=600;if(p.cash<cost)throw Error('Starting a Town Hall requires 600 coins');if(!transfer(w,p.id,'treasury:region',cost,'frontier-town-hall'))throw Error('Town Hall funding failed');site.hall={status:'building',work:0,required:4,founder:p.id};site.stage='hall-building';event(w,'construction',`${p.name} breaks ground at ${site.name}`,`A Town Hall foundation marks the first permanent civic building beside ${site.landmark.name}.`,[p.id,site.id]);return site;}
 if(action==='work-town-hall'){const site=frontierById(w,String(data.site||''));if(!site)throw Error('Frontier site not found');requireNear(p,site);if(site.hall.status!=='building')throw Error('Start the Town Hall before working on it');if(site.hall.founder!==p.id)throw Error('The founding builder must finish this Town Hall');site.hall.work=Math.min(site.hall.required,site.hall.work+1);if(site.hall.work>=site.hall.required){site.hall.status='complete';site.stage='hall-ready';event(w,'construction',`${site.name} Town Hall is complete`,`The frontier can now be chartered as a township. ${site.landmark.name} will shape its economy.`,[p.id,site.id]);}return site;}
 if(action==='found-township'){
  const site=frontierById(w,String(data.site||''));if(!site)throw Error('Choose a frontier site for the township');requireNear(p,site);if(site.settlementId)throw Error('This frontier has already been chartered');if(site.hall.status!=='complete'||site.hall.founder!==p.id)throw Error('Build and finish the Town Hall here before chartering the township');
  const name=String(data.name||'').trim().replace(/\s+/g,' ');if(name.length<3||name.length>28||!/^[A-Za-z0-9 ']+$/.test(name))throw Error('Town name must be 3 to 28 letters, numbers, spaces or apostrophes');const focus=String(data.focus||site.focus||'balanced');if(!FOCUSES[focus])throw Error('Unknown township focus');if(w.civilization.settlements.length>=12)throw Error('The region currently supports twelve settlements');const base=slug(name);if(!base||w.civilization.settlements.some(t=>t.name.toLowerCase()===name.toLowerCase()))throw Error('That township name is already in use');const cost=2200;if(p.cash<cost)throw Error('Chartering requires 2,200 coins of township capital');const id=`town-${w.civilization.nextSettlement++}-${base}`,town=makeTown(id,name,day,p.id,focus,null,site);w.civilization.settlements.push(town);if(!transfer(w,p.id,town.treasuryId,cost,'township-charter-capital')){w.civilization.settlements.pop();throw Error('Township funding failed');}town.policies.migrationIncentive=35;town.government.mayor={title:'Mayor',holder:p.id,termEnds:day+14};site.settlementId=id;site.stage='chartered';event(w,'government',`${name} receives its charter`,`${p.name} chartered ${site.name} around ${site.landmark.name}. Housing and shops can now be built to draw residents.`,[p.id,id,site.id]);updateStats(w);return town;
 }
 if(action==='fund-town-treasury'){const town=townById(w,String(data.town||''));if(!town)throw Error('Township not found');const amount=Number(data.amount);if(!Number.isSafeInteger(amount)||amount<100||amount>5000)throw Error('Contribution must be 100 to 5,000 coins');if(!transfer(w,p.id,town.treasuryId,amount,'town-capital-contribution'))throw Error('You do not have enough coins');return town;}
 const town=townById(w,String(data.town||data.id||''));if(!town)throw Error('Township not found');
 if(action==='declare-candidacy'){const actor=p.citizenId||p.id;if(npcTown(w.npcs.find(n=>n.id===p.citizenId)||{})!==town.id&&town.founder!==p.id)throw Error('You must live in or have founded this township');town.government.candidates??=[];if(!town.government.candidates.includes(actor))town.government.candidates.push(actor);return town.government;}
 if(!actorCanGovern(w,p,town))throw Error('Only the current mayor can change township policy');
 if(action==='build-town-development'){if(!town.siteId)throw Error('Use Everwick local construction for buildings inside Everwick');const site=frontierById(w,town.siteId);requireNear(p,site);const kind=String(data.kind),spec=DEVELOPMENT[kind];if(!spec)throw Error('Unknown township building');if(treasuryAccount(w,town).cash<spec.cost)throw Error(`The township treasury needs ${spec.cost} coins`);if(!transfer(w,town.treasuryId,'treasury:region',spec.cost,'town-development'))throw Error('Development funding failed');if(kind==='housing'){town.development.housing++;town.housingCapacity+=spec.housing;town.rentIndex=Math.max(18,town.rentIndex-2);}if(kind==='store'){town.development.stores++;addSectorJobs(town,'commerce','Commerce',Math.max(28,town.policies.minimumWage),4);town.services.roads=clamp(town.services.roads+1,0,100);}if(kind==='workshop'){town.development.workshops++;const fs=FOCUSES[town.focus]||FOCUSES.balanced,[sid,sname,wage]=fs.sectors[0];addSectorJobs(town,sid,sname,wage,4);}event(w,'construction',`${town.name} builds a ${spec.label}`,`${spec.cost} coins of local capital created new ${kind==='housing'?'homes':'jobs'} beside ${town.landmark?.name||'the town centre'}.`,[town.id]);updateStats(w);return town;}
 if(action==='set-town-policy'){const key=String(data.key),value=data.value;if(['incomeTax','businessTax','salesTax','propertyTax'].includes(key)){const n=Number(value);if(!Number.isInteger(n)||n<0||n>25)throw Error('Tax rates must be whole percentages from 0 to 25');town.taxes[key]=n;}else if(key==='minimumWage'){const n=Number(value);if(!Number.isInteger(n)||n<10||n>150)throw Error('Minimum wage must be 10 to 150 coins');town.policies.minimumWage=n;for(const s of town.sectors)s.wage=Math.max(s.wage,n);}else if(key==='migrationIncentive'){const n=Number(value);if(!Number.isInteger(n)||n<0||n>250)throw Error('Migration incentive must be 0 to 250 coins');town.policies.migrationIncentive=n;}else if(key==='zoning'){if(!['balanced','residential','commercial','industrial','agricultural'].includes(value))throw Error('Unknown zoning policy');town.policies.zoning=value;}else if(key==='immigration'){if(!['open','managed','restricted'].includes(value))throw Error('Unknown migration policy');town.policies.immigration=value;}else throw Error('Unknown policy');event(w,'government',`${town.name} changes policy`,`${officialName(w,town.government.mayor.holder)} changed ${key} to ${value}.`,[town.id]);return town;}
 if(action==='fund-town-service'){const service=String(data.service),amount=Number(data.amount);if(!SERVICES.includes(service)||!Number.isInteger(amount)||amount<100||amount>5000)throw Error('Choose a valid service and funding amount from 100 to 5,000');if(treasuryAccount(w,town).cash<amount)throw Error('The township treasury cannot afford this project');if(!transfer(w,town.treasuryId,'treasury:region',amount,'regional-service-procurement'))throw Error('Service funding failed');town.services[service]=clamp(town.services[service]+Math.max(1,Math.floor(amount/250)),0,100);event(w,'government',`${town.name} funds ${service}`,`${amount} coins were committed to ${service}.`,[town.id]);return town;}
 if(action==='expand-town-sector'){const sector=town.sectors.find(s=>s.id===String(data.sector));if(!sector)throw Error('Sector not found');const amount=1200;if(treasuryAccount(w,town).cash<amount)throw Error('The township treasury needs 1,200 coins');if(!transfer(w,town.treasuryId,'treasury:region',amount,'economic-development'))throw Error('Development funding failed');sector.slots+=4;event(w,'government',`${town.name} expands ${sector.name}`,`Regional investment created four additional job slots. Housing must be developed separately to support more residents.`,[town.id]);return town;}
 throw Error('Unknown civilization command');
}
export function civilizationReport(w,playerId){ensureCivilization(w);const p=w.players[playerId];const frontiers=w.civilization.frontiers.map(f=>({...f,nearby:!!p&&!p.insideHouse&&Math.hypot(Number(p.x)-f.x,Number(p.y)-f.y)<=9,town:f.settlementId?townById(w,f.settlementId)?.name:null}));return {nation:{...w.civilization.nation,government:{...w.civilization.nation.government,chancellor:{...w.civilization.nation.government.chancellor,name:officialName(w,w.civilization.nation.government.chancellor.holder)}}},region:{...w.civilization.region,government:{...w.civilization.region.government,governor:{...w.civilization.region.government.governor,name:officialName(w,w.civilization.region.government.governor.holder)}}},frontiers,settlements:w.civilization.settlements.map(t=>({...t,treasuryCash:treasuryAccount(w,t).cash,mayorName:officialName(w,t.government?.mayor?.holder),canGovern:actorCanGovern(w,p,t),nearby:!!p&&Math.hypot(Number(p.x)-t.coordinates.x,Number(p.y)-t.coordinates.y)<=9,population:t.stats.population,residents:localPopulation(w,t.id).slice(0,20).map(n=>({id:n.id,name:n.name,occupation:n.occupation,wage:currentWage(w,n),claimed:claimed(w,n)})),sectors:t.sectors.map(s=>({...s,employed:sectorEmployment(w,t,s.id),openings:Math.max(0,s.slots-sectorEmployment(w,t,s.id))}))})),migrationLog:w.civilization.migrationLog.slice(0,30)};}

const SATELLITE_CAMP_SPECS=[
 {id:'satellite-fernwood',name:'Fernwood Crossing',x:153,y:151,sector:['camp','Camp work',28,16]},
 {id:'satellite-ridge',name:'Highland Road',x:409,y:279,sector:['camp','Camp work',28,16]},
 {id:'satellite-forest-camp',name:'Fernwood Wilds Camp',x:220,y:180,sector:['camp','Camp work',28,16]},
 {id:'satellite-downs',name:'Open Downs Camp',x:310,y:210,sector:['camp','Camp work',28,16]},
 {id:'satellite-basin',name:'Bluewater Approach',x:280,y:360,sector:['camp','Camp work',28,16]}
];
function makeCampTown(id,name,x,y,sector,siteId=null){
 const [sid,sname,wage,slots]=sector;
 return {id,name,foundedDay:0,founder:null,focus:'balanced',siteId,identity:`${name} camp`,treasuryId:`treasury:${id}`,treasury:{id:`treasury:${id}`,cash:0},coordinates:{x,y},government:{mayor:{title:'Camp lead',holder:null,termEnds:14},council:[],treasurer:null,sheriff:null,publicWorks:null,candidates:[]},taxes:{incomeTax:0,businessTax:0,salesTax:0,propertyTax:0},policies:{minimumWage:20,migrationIncentive:0,zoning:'balanced',immigration:'open'},services:{roads:25,schools:10,safety:28,health:18},resources:{fertileSoil:50,timber:50,ore:40,fish:40,beauty:50},landmark:null,sectors:[{id:sid,name:sname,wage,slots}],housingCapacity:Math.max(16,slots),rentIndex:28,landValue:48,development:{townHall:0,housing:2,stores:0,workshops:0},stock:{},productionToday:{},migration:{in:0,out:0},stats:{population:0,employment:0,unemployment:0,averageWage:0,jobs:0,openings:0,qualityOfLife:40},history:[],camp:true};
}
export function ensureGenASpreadCamps(w){
 ensureCivilization(w);
 w.civilization.satellites??=[];
 for(const spec of SATELLITE_CAMP_SPECS){
  let t=townById(w,spec.id);
  if(!t){t=makeCampTown(spec.id,spec.name,spec.x,spec.y,spec.sector);w.civilization.settlements.push(t);}
  else{
   t.coordinates={x:spec.x,y:spec.y};t.camp=true;t.housingCapacity=Math.max(t.housingCapacity||0,16);
   const [sid,sname,wage,slots]=spec.sector;let s=t.sectors.find(x=>x.id===sid);if(!s){s={id:sid,name:sname,wage,slots};t.sectors.push(s);}else s.slots=Math.max(s.slots||0,slots);
   t.treasury??={id:t.treasuryId,cash:0};
  }
  if(!w.civilization.satellites.some(s=>s.id===spec.id))w.civilization.satellites.push({id:spec.id,name:spec.name,x:spec.x,y:spec.y});
 }
 for(const site of FRONTIER_SITES){
  const id=`frontier-${site.id}`;
  let t=townById(w,id);
  const starter=site.starterSector||{id:'camp',name:'Camp work',wage:30};
  const sector=[starter.id,starter.name,starter.wage||30,16];
  if(!t){t=makeCampTown(id,`${site.name} camp`,site.x,site.y,sector,site.id);t.landmark=structuredClone(site.landmark);t.rentIndex=26;w.civilization.settlements.push(t);}
  else{
   t.coordinates={x:site.x,y:site.y};t.camp=true;t.siteId=site.id;t.housingCapacity=Math.max(t.housingCapacity||0,16);
   let s=t.sectors.find(x=>x.id===sector[0]);if(!s){s={id:sector[0],name:sector[1],wage:sector[2],slots:sector[3]};t.sectors.push(s);}else s.slots=Math.max(s.slots||0,16);
   t.treasury??={id:t.treasuryId,cash:0};t.landmark??=structuredClone(site.landmark);
  }
 }
 return w.civilization;
}
export function assignRemoteJobAt(w,n,settlementId){
 ensureGenASpreadCamps(w);
 const town=townById(w,settlementId);if(!town||town.id==='everwick'){n.remoteEmployment=null;return null;}
 const job=bestJob(w,town,n)||(town.sectors[0]?{kind:'remote',townId:town.id,sectorId:town.sectors[0].id,name:town.sectors[0].name,wage:town.sectors[0].wage}:null);
 assignJob(w,n,town,job);return job;
}
function settleTraveler(w,n,destId,event){
 ensureGenASpreadCamps(w);
 const town=townById(w,destId);if(!town)return false;
 n.residency='away';n.settlementId=town.id;n.remoteRent=town.rentIndex||28;
 const pos=regionalPosition(n,town);n.regionalPosition=pos;n.x=pos.x;n.y=pos.y;
 delete n.travelPath;delete n.travelIndex;n.travelDestination=destId;
 n.locationLabel=town.name;n.routine=`Settled at ${town.name}`;
 assignRemoteJobAt(w,n,town.id);
 if(event)event(w,'migration',`${n.name} arrives at ${town.name}`,`${n.name} left the traveling caravan and joined the camp at ${town.name}.`,[n.id,town.id]);
 return true;
}
function leastFullCamp(w,preferFrontier=false){
 ensureGenASpreadCamps(w);
 const sats=w.civilization.settlements.filter(t=>String(t.id).startsWith('satellite-'));
 const fronts=w.civilization.settlements.filter(t=>String(t.id).startsWith('frontier-'));
 const satFull=sats.every(t=>localPopulation(w,t.id).length>=12);
 const pool=(preferFrontier||satFull)?[...fronts,...sats]:[...sats,...fronts];
 return pool.sort((a,b)=>localPopulation(w,a.id).length-localPopulation(w,b.id).length||a.id.localeCompare(b.id))[0]||null;
}
export function advanceTravelingCitizens(w,event){
 ensureGenASpreadCamps(w);
 // One-shot restagger if travelers still share a tile (live worlds seeded pre-spread).
 {
  const caravan=w.npcs.filter(n=>n.residency==='traveling').sort((a,b)=>a.id.localeCompare(b.id));
  const key=n=>`${Math.round(n.x*2)/2},${Math.round(n.y*2)/2}`;
  const counts={};for(const n of caravan)counts[key(n)]=(counts[key(n)]||0)+1;
  if(caravan.length>8&&Math.max(0,...Object.values(counts))>12){
   caravan.forEach((n,i)=>{
    const path=n.travelPath||[];
    if(!path.length)return;
    const idx=i%path.length;n.travelIndex=idx;const wp=path[idx];
    const jx=((i%7)-3)*.85,jy=((Math.floor(i/3)%5)-2)*.85;
    n.x=wp.x+jx;n.y=wp.y+jy;n.regionalPosition={x:n.x,y:n.y};
   });
  }
 }
 const drip=12;
 let settled=0;
 const still=()=>w.npcs.filter(n=>n.residency==='traveling').sort((a,b)=>a.id.localeCompare(b.id));
 // Advance + jitter so caravans do not lockstep onto one tile.
 for(const [i,n] of still().entries()){
  const path=n.travelPath||[];
  let idx=n.travelIndex||0;
  if(idx<path.length-1){
   idx+=1;n.travelIndex=idx;const wp=path[idx];
   if(wp){
    const jx=((i%7)-3)*.85,jy=((Math.floor(i/3)%5)-2)*.85;
    n.x=wp.x+jx;n.y=wp.y+jy;n.regionalPosition={x:n.x,y:n.y};
    n.locationLabel=`En route to ${path[path.length-1]?.name||n.travelDestination}`;
   }
  }
 }
 for(const n of still()){
  if(settled>=drip)break;
  const path=n.travelPath||[];
  if(path.length&&(n.travelIndex||0)>=path.length-1){
   const dest=n.travelDestination||n.settlementId;
   if(dest&&settleTraveler(w,n,dest,event))settled++;
  }
 }
 for(const n of still()){
  if(settled>=drip)break;
  const dest=leastFullCamp(w,true);if(!dest)break;
  if(settleTraveler(w,n,dest.id,event))settled++;
 }
 return settled;
}

export function civilizationCash(w){if(!w.civilization)return 0;let total=(w.civilization.region?.treasury?.cash||0)+(w.civilization.nation?.treasury?.cash||0);for(const town of w.civilization.settlements||[])if(town.treasuryId!=='treasury')total+=town.treasury?.cash||0;return total;}
