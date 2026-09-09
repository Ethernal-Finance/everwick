import {randomInt} from 'node:crypto';
import {FISH} from '../client/fishing.js';
import {biome,FRONTIER_SITES} from '../client/world-map.js';

const WILLOW={id:'willowbank',name:'Willowbank waters',x:9,y:37,capacity:80,replenishMs:30000,abundance:1};
const BLUE=FRONTIER_SITES.find(s=>s.id==='bluewater');
function nearestWaterPoint(x,y,radius=3){let best=null;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const tx=Math.floor(x+dx),ty=Math.floor(y+dy);if(biome(tx,ty)!=='water')continue;const d=Math.hypot((tx+.5)-x,(ty+.5)-y);if(d<=radius+.5&&(!best||d<best.d))best={x:tx+.5,y:ty+.5,d};}return best;}
function nearWater(x,y,radius=2){return !!nearestWaterPoint(x,y,radius);}
export function fishingAreaAt(x,y){
 if(Math.hypot(x-WILLOW.x,y-WILLOW.y)<55)return WILLOW;
 if(BLUE&&Math.hypot(x-BLUE.x,y-BLUE.y)<130)return {id:'bluewater',name:'Silverfin Shoals',x:BLUE.x,y:BLUE.y,capacity:120,replenishMs:18000,abundance:1.5};
 return {id:`wild-${Math.floor(x/128)}-${Math.floor(y/128)}`,name:'Wild waters',x,y,capacity:60,replenishMs:36000,abundance:1};
}
function waterState(w,area,now){w.fishery??={stock:80,lastAt:now,waters:{}};w.fishery.waters??={};const lake=w.fishery.waters[area.id]??={id:area.id,name:area.name,stock:area.capacity,capacity:area.capacity,lastAt:now,abundance:area.abundance||1};lake.capacity=area.capacity;lake.abundance=area.abundance||1;const ticks=Math.max(0,Math.floor((now-lake.lastAt)/area.replenishMs));if(ticks){lake.stock=Math.min(lake.capacity,lake.stock+ticks);lake.lastAt+=ticks*area.replenishMs;}w.fishery.waters[area.id]=lake;return lake;}
export function replenishFish(w,now=Date.now()){const willow=waterState(w,WILLOW,now);if(BLUE)waterState(w,{id:'bluewater',name:'Silverfin Shoals',capacity:120,replenishMs:18000,abundance:1.5},now);w.fishery.stock=willow.stock;w.fishery.lastAt=willow.lastAt;return w.fishery;}
export function fishingCommand(w,p,data,transfer,now=Date.now()){
 if(p.insideHouse||!nearWater(p.x,p.y))throw Error('Stand beside any fishable shoreline before casting');const area=fishingAreaAt(p.x,p.y),lake=waterState(w,area,now);p.fishing??={basket:{},catches:0};const f=p.fishing;
 if(data.kind==='cast'){if(f.cast&&now<f.cast.endsAt)throw Error('You already have a line in the water');if(!lake.stock)throw Error('These waters need time to replenish before casting');const target=nearestWaterPoint(p.x,p.y,3);if(!target)throw Error('Stand beside any fishable shoreline before casting');const fast=Math.round(3500/Math.max(1,area.abundance||1)),slow=Math.round(7500/Math.max(1,area.abundance||1));const biteAt=now+randomInt(fast,slow+1);f.cast={biteAt,endsAt:biteAt+3500,waterId:area.id,waterName:area.name,castX:target.x,castY:target.y};return f;}
 if(data.kind==='reel'){if(!f.cast)throw Error('Cast your line first');const c=f.cast;f.cast=null;if(c.waterId!==area.id||!Number.isFinite(c.castX)||!Number.isFinite(c.castY)||Math.hypot(p.x-c.castX,p.y-c.castY)>4){f.lastResult='You moved away from the water where you cast.';return f;}if(now<c.biteAt||now>c.endsAt){f.lastResult=now<c.biteAt?'Too soon. The fish slipped away.':'Too late. Try another cast.';return f;}if(!lake.stock){f.lastResult='Another angler caught the last fish. Let these waters recover.';return f;}const roll=randomInt(100),kind=area.id==='bluewater'?(roll<35?'carp':roll<72?'bass':'trout'):(roll<55?'carp':roll<85?'bass':'trout');lake.stock--;if(area.id==='willowbank')w.fishery.stock=lake.stock;f.basket[kind]=(f.basket[kind]||0)+1;f.catches++;f.lastResult=`Caught a ${FISH[kind].name} at ${area.name}!`;f.lastWater=area.name;return f;}
 const kind=String(data.fish);if(!Object.hasOwn(FISH,kind)||!(f.basket[kind]>0))throw Error('That fish is not in your basket');if(data.kind==='sell'){if(!transfer(w,'treasury',p.id,FISH[kind].price,'fish-sale:'+kind))throw Error('The fish market needs more funds; your catch is safe');}else if(data.kind==='prepare'){p.inventory.food=(p.inventory.food||0)+1;w.produced.food=(w.produced.food||0)+1;}else throw Error('Unknown fishing action');f.basket[kind]--;return f;
}
