// Development-only layout checks. Not imported by the running game.
import {ASSETS} from './assets.js';
import {LANDMARK_ROOFS} from './scenery.js';
import {MAP,PLACES,CIVIC,HOMES,COTTAGES,FRONTIER_SITES,blocked,isPath,footprint,entrance,mapStructures,buildingVisible} from './world-map.js';
import {PARCELS} from './construction.js';
import {findPath} from './pathfinding.js';

export const SHEETS={village:{w:512,h:672},mountains:{w:512,h:592},forest:{w:512,h:640},city:{w:768,h:768},doors:{w:256,h:128},desert:{w:512,h:432}};
export const ALLOWED_OVERLAPS=[
 // Homes are one map building shared by several property records; footprints are unique per row/cottage/parcel.
];
export const SPRITE_RECTS=[
 ...Object.entries(LANDMARK_ROOFS).map(([id,rect])=>({id,sheet:'village',rect})),
 ...ASSETS.buildings.map((rect,i)=>({id:`building-${i}`,sheet:'village',rect})),
 {id:'mine-cave',sheet:'mountains',rect:[256,128,96,80]},
 {id:'mine-cart',sheet:'mountains',rect:[360,208,32,32]},
 {id:'door',sheet:'doors',rect:[16,16,16,16]},
 {id:'scaffold',sheet:'village',rect:[0,480,16,32]},
 {id:'planter',sheet:'village',rect:[192,192,16,16]},
 {id:'tavern-sign',sheet:'village',rect:[0,192,32,32]},
 {id:'warehouse-crate',sheet:'village',rect:[0,96,32,32]}
];

export function rectInSheet(sheet,rect){const s=SHEETS[sheet];if(!s||!rect||rect.length<4)return false;const [x,y,w,h]=rect;return Number.isFinite(x)&&Number.isFinite(y)&&w>0&&h>0&&x>=0&&y>=0&&x+w<=s.w&&y+h<=s.h;}
function boxesOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function allowed(a,b){return ALLOWED_OVERLAPS.some(item=>item.a===a&&item.b===b||item.a===b&&item.b===a);}
const LAWN_LOTS=new Set(['home','cottage','parcel']); // Bramble Close, Willow Lane and builder lots sit on walkable lawn that already reaches a road.
function hasAdjacentPath(b){const e=entrance(b);return [[e.x,e.y],[e.x+1,e.y],[e.x-1,e.y],[e.x,e.y+1],[e.x,e.y-1],[b.x,b.y+1],[b.x+1,b.y+1],[b.x+2,b.y+1],[b.x+3,b.y+1]].some(([x,y])=>isPath(x,y));}

export function countStaticDrawables(view,culled=true){
 const buildings=mapStructures();
 const frontiers=FRONTIER_SITES.map(s=>({id:s.id,x:s.x-8,y:s.y+12,frontier:true}));
 const list=[...buildings,...frontiers];
 return culled?list.filter(b=>buildingVisible(b,view,b.frontier?24:8)).length:list.length;
}

export function validateMapLayout(world){
 const issues=[],buildings=mapStructures();
 const ids=new Map();
 for(const b of buildings){if(ids.has(b.id))issues.push(`duplicate building id ${b.id}`);else ids.set(b.id,b);}
 const coords=new Map();
 for(const b of buildings){const key=`${b.x},${b.y}`;if(coords.has(key))issues.push(`duplicate coordinates ${key} (${coords.get(key)} and ${b.id})`);else coords.set(key,b.id);}
 for(let i=0;i<buildings.length;i++)for(let j=i+1;j<buildings.length;j++){
  const a=buildings[i],b=buildings[j];if(allowed(a.id,b.id))continue;
  if(boxesOverlap(footprint(a),footprint(b)))issues.push(`intersecting footprints ${a.id} and ${b.id}`);
 }
 for(const b of buildings){
  const e=entrance(b);
  if(blocked(e.x,e.y))issues.push(`blocked entrance ${b.id} at ${e.x},${e.y}`);
  if(!hasAdjacentPath(b)&&!LAWN_LOTS.has(b.kind))issues.push(`no adjacent path for ${b.id}`);
  if(!findPath(MAP.spawn.x,MAP.spawn.y,e.x,e.y).length)issues.push(`unreachable entrance ${b.id} at ${e.x},${e.y}`);
 }
 for(const sprite of SPRITE_RECTS)if(!rectInSheet(sprite.sheet,sprite.rect))issues.push(`invalid sprite ${sprite.id} ${sprite.rect} on ${sprite.sheet}`);
 const known=[...Object.keys(PLACES),...CIVIC.map(b=>b.id),...HOMES.map(b=>b.id),...COTTAGES.map(b=>b.id),...PARCELS.map(b=>b.id)];
 if(world?.properties)for(const p of world.properties)if(p.mapBuilding&&!known.includes(p.mapBuilding))issues.push(`property ${p.id} references missing map building ${p.mapBuilding}`);
 return {ok:issues.length===0,issues,buildingCount:buildings.length};
}
