import {personalityFor,ensureCitizenMarket,citizenCanBreed,ensureBreedingFlags,MAX_BIRTHS_AS_PARENT,sexFromId,ensureCitizenSex,complementarySexes} from './citizenship.mjs';
import {generationLabel,closeKin,childIds,GEN_Z,isGenZ} from './genealogy.mjs';
import {HOMES} from '../client/world-map.js';
import {ensureAppearance,inheritedAppearance,newbornCustomizationOwners,newbornCustomizationWindow} from './appearance.mjs';

export const TRAITS=['craft','sociability','vigor','appearance'];
export const DAYS_PER_YEAR=Number(process.env.AGING_DAYS_PER_YEAR||3);
if(!Number.isSafeInteger(DAYS_PER_YEAR)||DAYS_PER_YEAR<1||DAYS_PER_YEAR>365)throw Error('AGING_DAYS_PER_YEAR must be an integer from 1 to 365');
export const ADULT_AGE=18;
/** Existing household birth spacing (A×A baseline). Scaled by (max parent generation + 1). */
export const BASE_BIRTH_COOLDOWN_DAYS=DAYS_PER_YEAR*3;
export const SOFT_LIFE_CAP=50000;
export {MAX_BIRTHS_AS_PARENT,GEN_Z};

export function inheritGenes(a,b,seed){return Object.fromEntries(TRAITS.map((k,i)=>[k,[a[k][(seed+i)%2],b[k][(seed+i*3+1)%2]]]));}
export function birthCooldownDays(a,b){const g=Math.max(a?.generation||0,b?.generation||0);return BASE_BIRTH_COOLDOWN_DAYS*(g+1);}
export function zReached(w){return !!(w.population?.zReached||w.npcs.some(isGenZ)||(w.children||[]).some(isGenZ));}
export function livingPopulation(w){return w.npcs.length+(w.children||[]).filter(c=>!c.grown).length;}
export function lifeCapBlocks(w){return zReached(w)&&livingPopulation(w)>=(w.population?.softLifeCap??SOFT_LIFE_CAP);}

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const settlementId=n=>n.settlementId||'everwick';
function townName(w,id){return w.civilization?.settlements?.find(t=>t.id===id)?.name||(id==='everwick'?'Everwick':id);}
function propertyFor(w,n){return w.properties.find(h=>h.id===n.housing);}
function dependentChildren(w,a,b){const ids=new Set([a.id,b.id]);return (w.children||[]).filter(c=>!c.grown&&(c.parents||[]).length>=2&&(c.parents||[]).every(id=>ids.has(id)));}
function householdKey(a,b){return [a.id,b.id].sort().join(':');}
function householdReadiness(w,a,b){
 const children=dependentChildren(w,a,b),home=propertyFor(w,a)||propertyFor(w,b),capacity=home?.householdCapacity||4,health=Math.round(((a.health??80)+(b.health??80))/2),relationship=Math.round(((a.relationships?.[b.id]||0)+(b.relationships?.[a.id]||0))/2);
 const individual=n=>{const hunger=100-(n.needs?.hunger||50),energy=n.needs?.energy||50,social=n.needs?.social||50,finance=clamp(((n.cash||0)/Math.max(1,(n.rent||35)*4))*25,0,100);return hunger*.3+energy*.2+social*.2+finance*.3;};
 const happiness=Math.round((individual(a)+individual(b))/2),space=Math.max(0,capacity-2-children.length),foodSecure=(a.needs?.hunger??100)<=45&&(b.needs?.hunger??100)<=45,financiallyStable=(a.cash||0)>=(a.rent||35)*2&&(b.cash||0)>=(b.rent||35)*2;
 const score=Math.round(health*.28+happiness*.27+relationship*.25+(space>0?100:0)*.12+(foodSecure&&financiallyStable?100:0)*.08);
 return {id:householdKey(a,b),partners:[a.id,b.id],health,happiness,relationship,space,children:children.length,capacity,foodSecure,financiallyStable,score,ready:!!home&&health>=70&&happiness>=70&&relationship>=70&&space>0&&foodSecure&&financiallyStable};
}
function updateHealth(n){n.health??=85;if((n.needs?.hunger||0)>75)n.health=clamp(n.health-4,0,100);else if((n.needs?.hunger||0)<45&&(n.needs?.energy||0)>35)n.health=clamp(n.health+1,0,100);if((n.needs?.energy||100)<15)n.health=clamp(n.health-2,0,100);}

function inheritedPersona(a,b,id){
 let seed=2166136261;for(const ch of String(id))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;const keys=['ambition','sociability','diligence','curiosity','generosity','caution'],traits={};
 for(const k of keys){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const av=a.persona?.traits?.[k]??50,bv=b.persona?.traits?.[k]??50,variation=(seed%15)-7;traits[k]=clamp(Math.round((av+bv)/2+variation),10,90);}
 const values=[a.persona?.values,b.persona?.values].filter(Boolean),value=values[seed%Math.max(1,values.length)]||'family';return {version:1,traits,values:value,description:`Values ${value}; inherited a blend of family temperament and individual variation.`};
}
export function canPartner(w,a,b){ensureCitizenSex(a);ensureCitizenSex(b);return a&&b&&a.id!==b.id&&!a.partnerId&&!b.partnerId&&a.age>=18&&b.age>=18&&a.age<=55&&b.age<=55&&a.health>=65&&b.health>=65&&settlementId(a)===settlementId(b)&&citizenCanBreed(a)&&citizenCanBreed(b)&&complementarySexes(a,b)&&!closeKin(w,a,b);}
function formPartnership(w,day,record){
 if(day%DAYS_PER_YEAR!==0)return;const candidates=w.npcs.filter(n=>n.age>=18&&n.age<=55&&!n.partnerId&&(n.health||0)>=65&&citizenCanBreed(n)).sort((a,b)=>a.id.localeCompare(b.id));
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){const a=candidates[i],b=candidates[j];if(!canPartner(w,a,b))continue;const socialA=a.needs?.social||0,socialB=b.needs?.social||0;if(socialA<45||socialB<45)continue;a.partnerId=b.id;b.partnerId=a.id;a.partnershipSinceDay=b.partnershipSinceDay=day;a.householdId=b.householdId=householdKey(a,b);a.relationships[b.id]=Math.max(a.relationships[b.id]||0,75);b.relationships[a.id]=Math.max(b.relationships[a.id]||0,75);record(`${a.name} and ${b.name} form a household`,'A close relationship became a shared household. Children are only considered while the home remains healthy, happy, stable, and adequately housed.');return;}
}
export function ensurePopulation(w){
 const maxId=Math.max(0,...w.npcs.map(n=>Number(String(n.id).replace(/\D/g,''))||0));w.population??={nextId:maxId+1,nextChild:1,history:[]};w.population.nextId??=maxId+1;w.population.nextChild=Math.max(w.population.nextChild||1,1+Math.max(0,...(w.children||[]).map(c=>Number(String(c.id).match(/^child-(\d+)$/)?.[1])||0)));w.population.schemaVersion=3;w.population.history??=[];w.population.aging??={daysPerYear:DAYS_PER_YEAR,adultAge:ADULT_AGE};w.population.aging.daysPerYear=DAYS_PER_YEAR;w.population.aging.adultAge=ADULT_AGE;w.population.breeding??={};w.population.breeding.baseCooldownDays=BASE_BIRTH_COOLDOWN_DAYS;w.population.breeding.maxBirthsAsParent=MAX_BIRTHS_AS_PARENT;w.population.breeding.genZ=GEN_Z;w.children??=[];
 for(const p of w.properties)p.householdCapacity??=4;
 for(const n of w.npcs){const id=Number(String(n.id).replace(/\D/g,''))||0;n.genes??=Object.fromEntries(TRAITS.map((k,i)=>[k,[1+(id*3+i*7)%(k==='appearance'?40:5),1+(id*7+i*3)%(k==='appearance'?40:5)]]));n.generation??=0;n.parents??=[];n.childrenIds??=[];n.residency??='resident';n.settlementId??='everwick';n.avatar??=Math.round((n.genes.appearance[0]+n.genes.appearance[1])/2);n.health??=85;n.birthplace??='Everwick';n.ownerId??=null;ensureBreedingFlags(n);ensureCitizenSex(n);ensureAppearance(n);}
 for(const c of w.children){c.generation??=1;if(c.canBreed===undefined)c.canBreed=true;if(isGenZ(c))c.canBreed=false;c.generationLabel=c.starter?'S':generationLabel(c.generation);c.health??=95;c.settlementId??='everwick';c.birthplace??=townName(w,c.settlementId);ensureCitizenSex(c);ensureAppearance(c);}
 for(const n of w.npcs)n.childrenIds=childIds(w,n.id);
 if(zReached(w))w.population.zReached=true;
 ensureCitizenMarket(w);
}
export function populationDay(w,{transfer,event}){ensurePopulation(w);const day=Math.floor(w.tick/24),pop=w.population;if(pop.lastDay===day)return;pop.lastDay=day;const record=(title,body)=>{pop.history.unshift({day,title,body});pop.history=pop.history.slice(0,80);event(w,'population',title,body);};
 const arrive=(child)=>{if((zReached(w)&&w.npcs.length>=SOFT_LIFE_CAP)||w.treasury.cash<600)return false;const id=pop.nextId++,template=w.npcs[0],h=HOMES[id%HOMES.length],home={id:`home-new-${id}`,name:`${id+1} Willow Lane`,tenant:child.id,owner:'treasury',rent:30,forSale:false,valuation:2200,x:h.x+1,y:h.y+1,mapBuilding:h.id,householdCapacity:4,interior:{version:0,nextId:1,furniture:[],floor:'oak',wall:'cream'}};
  const n={...structuredClone(template),id:child.id,name:child.name,age:18,cash:0,inventory:{},housing:home.id,rent:30,employer:null,occupation:'Seeking work',relationships:{},memories:[],summary:`Born in ${child.birthplace}. Beginning an independent life.`,arrears:0,x:home.x,y:home.y,path:[],target:null,brain:null,contribution:{workSeconds:0,civicSeconds:0,produced:0},genes:child.genes,parents:[...child.parents],childrenIds:[],generation:child.generation,generationLabel:generationLabel(child.generation),starter:false,canBreed:!!child.canBreed&&!isGenZ(child),transferable:true,birthsAsParent:0,residency:'resident',settlementId:child.settlementId||'everwick',birthplace:child.birthplace,health:child.health||90,ownerId:null,sex:child.sex==='male'||child.sex==='female'?child.sex:sexFromId(child.id),needs:{hunger:15,energy:90,social:65},personality:(child.genes.sociability[0]+child.genes.sociability[1])>=7?'sociable':'kind',skills:{craft:Math.round((child.genes.craft[0]+child.genes.craft[1])/2),trade:2},avatar:Math.round((child.genes.appearance[0]+child.genes.appearance[1])/2),appearance:structuredClone(ensureAppearance(child))};delete n.founderPrimaryPurchaseId;delete n.founderPrimaryBuyerId;delete n.demoFounder;n.demoData=!!child.demoData;n.bornTick=child.bornTick;delete n.controllerId;delete n.conversations;delete n.insideHouse;delete n.indoor;delete n.partnerId;delete n.partnershipSinceDay;delete n.householdId;n.persona=child.persona||personalityFor(n.id);delete n.awaySince;delete n.unemployedDays;ensureBreedingFlags(n);const sid=child.settlementId||'everwick',remoteTown=w.civilization?.settlements?.find(t=>t.id===sid);if(sid!=='everwick'&&remoteTown){n.housing=null;n.rent=remoteTown.rentIndex||30;n.remoteRent=n.rent;n.residency='away';n.x=remoteTown.coordinates.x+2+(id%5);n.y=remoteTown.coordinates.y+2+Math.floor(id%15/5);n.regionalPosition={x:n.x,y:n.y};}w.npcs.push(n);if(sid==='everwick'||!remoteTown)w.properties.push(home);transfer(w,'treasury',n.id,600,'settlement-grant');for(const pid of child.parents){const parent=w.npcs.find(x=>x.id===pid);if(parent&&!parent.childrenIds.includes(n.id))parent.childrenIds.push(n.id);}if(isGenZ(n))pop.zReached=true;return n;};
 for(const n of w.npcs){updateHealth(n);if(day>0&&day%DAYS_PER_YEAR===0)n.age++;n.unemployedDays=n.employer?0:(n.unemployedDays||0)+1;
  if(n.residency==='away'&&n.settlementId==='everwick'&&day-(n.awaySince||day)>=14&&w.businesses.some(b=>b.status==='open'&&b.employees.length<12&&b.cash>b.wage*12)){n.residency='resident';n.needs.hunger=25;n.needs.energy=90;const h=w.properties.find(h=>h.id===n.housing);if(h)h.tenant=n.id;n.x=h?.x??n.x;n.y=h?.y??n.y;n.brain=null;n.path=[];n.target=null;record(`${n.name} returns`,'New employment prospects brought a former resident home.');}
 }
 if(day>0&&day%7===0){const n=w.npcs.find(n=>n.residency==='resident'&&!n.employer&&n.unemployedDays>=7&&n.needs.hunger>70&&n.cash<n.rent);if(n&&w.npcs.filter(n=>n.residency==='resident').length>20&&!n.partnerId){n.residency='away';n.awaySince=day;n.walking=false;n.path=[];const h=w.properties.find(h=>h.id===n.housing);if(h&&h.tenant===n.id)h.tenant=null;record(`${n.name} moves away`,'Lack of work and unaffordable living costs pushed this resident to seek opportunities elsewhere. Their history and accounts are preserved.');}}
 for(const c of w.children){c.age=Math.max(0,Math.floor((w.tick-c.bornTick)/(24*DAYS_PER_YEAR)));c.generationLabel=c.starter?'S':generationLabel(c.generation||0);if(c.grown)c.age=w.npcs.find(n=>n.id===c.adultId)?.age??c.age;if(Math.floor((w.tick-c.bornTick)/(24*DAYS_PER_YEAR))>=ADULT_AGE&&!c.grown){const adult=arrive(c);if(adult){c.grown=true;c.age=18;c.adultId=adult.id;record(`${c.name} comes of age`,`${c.name}, Generation ${c.generationLabel}, is now an adult citizen. Their control rights can enter the citizen marketplace.`);}}}
 formPartnership(w,day,record);
 const households=[];for(const a of w.npcs){if(!a.partnerId||a.id>a.partnerId)continue;const b=w.npcs.find(n=>n.id===a.partnerId);if(!b)continue;const state=householdReadiness(w,a,b);households.push(state);a.householdReadiness=b.householdReadiness=state.score;
  const since=Math.min(a.partnershipSinceDay??day,b.partnershipSinceDay??day),last=Math.max(a.lastBirthDay??-999,b.lastBirthDay??-999);
  const cooldown=birthCooldownDays(a,b);
  a.birthsAsParent??=0;b.birthsAsParent??=0;
  if(a.age<ADULT_AGE||b.age<ADULT_AGE||a.age>55||b.age>55||a.health<70||b.health<70||b.partnerId!==a.id||settlementId(a)!==settlementId(b)||closeKin(w,a,b)||!state.ready||day-since<DAYS_PER_YEAR||day-last<cooldown||lifeCapBlocks(w))continue;
  if(!citizenCanBreed(a)||!citizenCanBreed(b))continue;
  if(a.birthsAsParent>=MAX_BIRTHS_AS_PARENT||b.birthsAsParent>=MAX_BIRTHS_AS_PARENT)continue;
  ensureCitizenSex(a);ensureCitizenSex(b);if(!complementarySexes(a,b))continue;
  const id=pop.nextChild++,childId=`child-${id}`,genes=inheritGenes(a.genes,b.genes,id),name=`${['Ash','Robin','Sage','Ellis','River','Wren','Lena','Milo','Ivy','Nora'][id%10]} ${a.name.split(' ').at(-1)}`,generation=Math.max(a.generation||0,b.generation||0)+1,birthplace=townName(w,settlementId(a)),appearance=inheritedAppearance(a,b,childId),appearanceCustomizationOwners=newbornCustomizationOwners(a,b),sex=sexFromId(childId);
  const canBreed=(!isGenZ({generation}))&&!!(a.canBreed||b.canBreed||citizenCanBreed(a)||citizenCanBreed(b));
  const c={id:childId,name,parents:[a.id,b.id],genes,generation,generationLabel:generationLabel(generation),bornTick:w.tick,age:0,demoData:!!(a.demoFounder||b.demoFounder||a.demoData||b.demoData),household:state.id,settlementId:settlementId(a),birthplace,health:95,persona:inheritedPersona(a,b,childId),appearance,appearanceCustomizationOwners,appearanceCustomizeUntilDay:appearanceCustomizationOwners.length?newbornCustomizationWindow(day):null,grown:false,starter:false,canBreed,birthsAsParent:0,sex};w.children.push(c);a.lastBirthDay=b.lastBirthDay=day;a.birthsAsParent++;b.birthsAsParent++;a.childrenIds.push(c.id);b.childrenIds.push(c.id);if(isGenZ(c))pop.zReached=true;record(`${name} joins Generation ${c.generationLabel}`,`${a.name} and ${b.name} welcome a child in ${birthplace}. Household readiness was ${state.score}/100. Birth cooldown was ${cooldown} days (gen scale). The child remains dependent until age 18.`);break;
 }
 pop.households=households;if(zReached(w))pop.zReached=true;ensureCitizenMarket(w);
}
