import {playerControls} from './citizenship.mjs';
import {advanceConstruction,materialsReady} from './construction.mjs';
import {findPath} from '../client/pathfinding.js';
import {MAP,PLACES,HOMES,blocked} from '../client/world-map.js';
export function migrateMap(w){
 if(w.mapVersion===MAP.version)return;
 for(const b of w.businesses)if(PLACES[b.id])Object.assign(b,PLACES[b.id]);
 for(let i=0;i<w.properties.length;i++){if(w.properties[i].kind==='residence')continue;const h=HOMES[i%HOMES.length];Object.assign(w.properties[i],{x:h.x+1+i%2,y:Math.min(MAP.height-2,h.y+1)});}
 for(let i=0;i<w.npcs.length;i++){const n=w.npcs[i],home=w.properties.find(p=>p.id===n.housing);if(home&&Number.isFinite(home.x)&&Number.isFinite(home.y)){n.x=home.x;n.y=home.y;}else if(n.regionalPosition&&Number.isFinite(n.regionalPosition.x)){n.x=n.regionalPosition.x;n.y=n.regionalPosition.y;}else if(!Number.isFinite(n.x)||!Number.isFinite(n.y)){n.x=MAP.spawn.x;n.y=MAP.spawn.y;}n.path=[];n.target=null;}
 for(const p of Object.values(w.players)){p.x=MAP.spawn.x;p.y=MAP.spawn.y;}
 w.mapVersion=MAP.version;w.lastMotionAt=w.lastTickAt;w.motionSeconds=0;
}
const route=findPath;
export function planFor(w,n){
 const h=w.tick%24,id=Number(String(n.id).replace(/\D/g,''))||0,home=w.properties.find(p=>p.id===n.housing),employer=w.businesses.find(b=>b.id===n.employer&&b.status==='open'),cycle=n.brain?.completed||0;
 const traits=n.persona?.traits||{};const candidates=[];const add=(kind,x,y,label,place,score,reason)=>{score+=(kind==='work'||kind==='build')?((traits.diligence||50)-50)*.2:kind==='social'?((traits.sociability||50)-50)*.2:kind==='civic'?((traits.generosity||50)-50)*.2:0;if(Number.isFinite(x)&&Number.isFinite(y)&&!blocked(x,y))candidates.push({kind,x,y,label,place,score,reason});};
 const shop=item=>w.businesses.filter(b=>b.output===item&&b.status==='open'&&(b.inventory[item]||0)>0&&n.cash>=b.price&&(item!=='food'||b.price<=n.preferences.maxFoodPrice)).sort((a,b)=>(a.price+Math.hypot(a.x-n.x,a.y-n.y)*.15)-(b.price+Math.hypot(b.x-n.x,b.y-n.y)*.15))[0];
 const sleep=h<(5+id%3)||h>=(21+id%3);
 const restX=home?.x??n.x??MAP.spawn.x, restY=home?.y??n.y??MAP.spawn.y, restPlace=home?.id||n.settlementId||'camp';
 add('rest',restX,restY,home?(sleep?'Sleeping at home':'Resting at home'):(sleep?'Camping for the night':'Resting on the road'),restPlace,sleep?120:n.needs.energy<25?110:8,`Energy ${Math.round(n.needs.energy)}/100; ${sleep?'my sleep schedule':'recover before my next shift'}`);
 if(n.needs.hunger>35&&!(n.inventory.food>0)){let b=shop('food');const listing=w.exchange?.listings.filter(l=>l.item==='food'&&l.price<=n.cash&&l.price<=n.preferences.maxFoodPrice).sort((a,b)=>a.price-b.price)[0];if(listing&&(!b||listing.price<b.price))b={id:'player-market',x:33,y:28,name:'the player market'};if(b)add('shop',b.x+1+id%3,b.y+1+id%2,`Buying groceries at ${b.name}`,b.id,80+n.needs.hunger/2,'I need food and can afford this shop');}
 if(h>=7&&h<Math.min(23,7+(employer?.hours||10))&&employer)add('work',employer.x+(id+cycle)%3,employer.y+1+(id+cycle)%2,`Working at ${employer.name}`,employer.id,70+(n.personality==='ambitious'?12:0)+(n.cash<n.rent*3?10:0),'My shift is open; wages cover my living costs');
 if(!sleep){
  if((!employer||(h>=17&&id%12===0))&&h>=7&&h<22){const site=w.construction?.projects.filter(p=>p.status==='building'&&materialsReady(p)).sort((a,b)=>Math.hypot(a.x-n.x,a.y-n.y)-Math.hypot(b.x-n.x,b.y-n.y))[0];if(site)add('build',site.x+id%3,site.y+1,`Building ${site.name}`,site.id,88,'Earn construction wages and expand the town');}

  const spaces=[{x:24,y:22,name:'the square'},{x:12,y:38,name:'the community garden'},{x:19,y:30,name:'the inn courtyard'}],spot=spaces[(id+cycle)%spaces.length];
  add('social',spot.x+id%3,spot.y+id%2,`Chatting with neighbours at ${spot.name}`,'social-'+((id+cycle)%3),20+(100-n.needs.social)*.6+(n.personality==='sociable'?12:0),'Seek company to restore social wellbeing');
  add('civic',24+(id+cycle)%8,22+id%3,'Tending the town square','square',employer?12:64,'Help maintain public space while between jobs');
  const item=['meal','ale','goods','care','lodging'][id%5],b=shop(item);if(b)add('shop',b.x+1+id%3,b.y+1+id%2,`Visiting ${b.name}`,b.id,25+(h>=17&&h<21?25:0),'Spend within my means at a local business');
 }
 candidates.sort((a,b)=>b.score-a.score);return {...candidates[0],alternatives:candidates.slice(1,3).map(c=>({kind:c.kind,score:Math.round(c.score)}))};
}
export function advanceMovement(w,seconds){
 migrateMap(w);if(seconds<=0)return;w.motionSeconds=(w.motionSeconds||0)+seconds;
 for(const n of w.npcs){
  if(playerControls(w,n)){n.path=[];n.target=null;n.brain=null;n.indoors=false;const b=w.businesses.find(b=>b.id===n.employer&&b.status==='open');n.activity=b&&Math.hypot(n.x-b.x,n.y-b.y)<5?'work':'player';n.routine=n.activity==='work'?`Working at ${b.name}`:'Exploring with player guidance';if(n.activity==='work'){n.contribution??={workSeconds:0,civicSeconds:0,produced:0};n.contribution.workSeconds+=seconds;}continue;}
  if(n.insideHouse&&n.controllerId){n.insideHouse=null;n.indoor=null;}
  if(n.residency==='away'){n.walking=false;n.activity='away';n.routine='Living away from Everwick';continue;}
  // Travelers walk along travelPath between civilizationDay drips (regional coords — no town pathfinding).
  if(n.residency==='traveling'){
   n.activity='traveling';n.routine='Traveling the roads';
   const tpath=n.travelPath||[];
   if(!tpath.length){n.walking=false;continue;}
   let idx=Math.max(0,Math.min(n.travelIndex||0,tpath.length-1));
   while(idx<tpath.length-1&&Math.hypot((n.x||0)-tpath[idx].x,(n.y||0)-tpath[idx].y)<2)idx++;
   n.travelIndex=idx;
   const wp=tpath[idx];
   let distance=seconds*(1.6+((n.genes?.vigor?.[0]||2)+(n.genes?.vigor?.[1]||2))*.04);n.walking=false;
   const dx=wp.x-(n.x||0),dy=wp.y-(n.y||0),length=Math.hypot(dx,dy);
   if(length>.001){const step=Math.min(distance,length);n.x=(n.x||0)+dx/length*step;n.y=(n.y||0)+dy/length*step;n.direction=Math.abs(dx)>Math.abs(dy)?dx<0?1:2:dy<0?3:0;n.walking=true;}
   n.regionalPosition={x:n.x,y:n.y};n.locationLabel=`En route to ${tpath[tpath.length-1]?.name||n.travelDestination||'camp'}`;n.path=[];n.target=null;continue;
  }
  if(!Number.isFinite(n.x)||!Number.isFinite(n.y)){n.x=MAP.spawn.x;n.y=MAP.spawn.y;}
  n.brain??={completed:0,nextDecision:0};const brain=n.brain,now=w.motionSeconds;
  if(brain.task?.kind==='work'&&!w.businesses.some(b=>b.id===n.employer&&b.id===brain.task.place&&b.status==='open')){brain.task=null;brain.nextDecision=0;}
  if(!brain.task||now>=brain.nextDecision){const choice=planFor(w,n);if(!brain.task||choice.kind!==brain.task.kind||choice.place!==brain.task.place||now>=(brain.until||0)){brain.task=choice;brain.partner=null;brain.until=now+10+(Number(String(n.id).replace(/\D/g,''))||0)%9;brain.reason=choice.reason;brain.alternatives=choice.alternatives;}brain.nextDecision=now+2+(Number(String(n.id).replace(/\D/g,''))||0)%3;}
  const target=brain.task;n.routine=target.label;n.destination=target.place;
  if(!n.target||n.target.x!==target.x||n.target.y!==target.y){n.path=route(n.x,n.y,target.x,target.y);n.target=target;}
  n.contribution??={workSeconds:0,civicSeconds:0,produced:0};
  if(Math.hypot(n.x-target.x,n.y-target.y)<2){if(target.label.startsWith('Working'))n.contribution.workSeconds+=seconds;else if(target.label.startsWith('Tending')){n.contribution.civicSeconds+=seconds;w.civic??={careSeconds:0};w.civic.careSeconds+=seconds;n.needs.social=Math.min(100,n.needs.social+seconds*.02);}}
  let distance=seconds*(1.4+((n.genes?.vigor?.[0]||2)+(n.genes?.vigor?.[1]||2))*.04);n.walking=false;
  while(distance>0&&n.path?.length){const [x,y]=n.path[0],dx=x-n.x,dy=y-n.y,length=Math.hypot(dx,dy);if(length<.001){n.path.shift();continue;}const step=Math.min(distance,length);n.x+=dx/length*step;n.y+=dy/length*step;n.direction=Math.abs(dx)>Math.abs(dy)?dx<0?1:2:dy<0?3:0;distance-=step;n.walking=true;if(step===length)n.path.shift();}
  const arrived=Math.hypot(n.x-target.x,n.y-target.y)<.35;
  n.activity=arrived?target.kind:'travelling';n.indoors=arrived&&target.kind==='rest';
  if(arrived){
   if(target.kind==='rest')n.needs.energy=Math.min(100,n.needs.energy+seconds*.7);
   if(target.kind==='social'){const peer=w.npcs.find(p=>p.id!==n.id&&Math.hypot(p.x-n.x,p.y-n.y)<2);if(peer){n.needs.social=Math.min(100,n.needs.social+seconds*.6);n.contribution.socialSeconds=(n.contribution.socialSeconds||0)+seconds;brain.partner=peer.name;}else brain.partner=null;}
   if(now>=brain.until){brain.completed++;brain.task=null;brain.nextDecision=0;}
  }else if(!n.path?.length&&now>=(brain.nextRetry||0)){n.target=null;brain.nextRetry=now+5;}
 }
 advanceConstruction(w,seconds);
}
