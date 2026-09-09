import {ROOM,FURNITURE,footprint} from '../client/furniture.js';
import {COTTAGES} from '../client/world-map.js';
export function ensureHousing(w){for(const c of COTTAGES)if(!w.properties.some(p=>p.id===c.id))w.properties.push(structuredClone(c));for(const [i,p] of w.properties.entries()){p.mapBuilding??=p.kind==='residence'?p.id:`row-${i%15}`;p.interior??={version:0,nextId:1,furniture:[],floor:'oak',wall:'cream'};}}
function overlaps(a,b){const x=footprint(a),y=footprint(b);return a.x<b.x+y.w&&a.x+x.w>b.x&&a.y<b.y+y.h&&a.y+x.h>b.y;}
export function validateLayout(items){
 const placed=items.filter(i=>i.x!==null);const solids=new Set();
 for(const i of placed){const f=FURNITURE[i.kind],size=footprint(i);if(!Number.isInteger(i.x)||!Number.isInteger(i.y)||i.x<1||i.y<1||i.x+size.w>ROOM.width-1||i.y+size.h>ROOM.height-1)throw Error('Furniture must stay inside the room walls');
  if(placed.some(j=>j.id!==i.id&&!!FURNITURE[j.kind].floor===!!f.floor&&overlaps(i,j)))throw Error('Furniture overlaps another item');
  if(!f.floor)for(let y=i.y;y<i.y+size.h;y++)for(let x=i.x;x<i.x+size.w;x++)solids.add(`${x},${y}`);
 }
 // Keep a usable doorway and a route into the centre of the room.
 if(solids.has('5,8')||solids.has('6,8'))throw Error('Leave the doorway clear');
 const q=[[5,8]],seen=new Set(['5,8']);for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(nx>=1&&ny>=1&&nx<11&&ny<9&&!solids.has(key)&&!seen.has(key)){seen.add(key);q.push([nx,ny]);}}}
 if(!seen.has('5,4'))throw Error('Keep a path from the door into the room');return true;
}
export function houseCommand(w,p,action,data,transfer){
 if(action==='exit-house'){p.insideHouse=null;return {ok:true};}
 const house=w.properties.find(h=>h.id===data.id);if(action==='visit-house'){if(!house||!w.players[house.owner])throw Error('This house is not open for visits');p.insideHouse=house.id;p.indoor={x:5.5,y:8};p.positionAt=Date.now();return house;}if(!house||house.owner!==p.id)throw Error('You do not own this house');
 if(action==='enter-house'){p.insideHouse=house.id;p.indoor={x:5.5,y:8};p.positionAt=Date.now();return house;}
 if(p.insideHouse!==house.id)throw Error('Enter your house before decorating');const room=house.interior;
 if(data.version!==room.version)throw Object.assign(Error('The room changed in another session. Refresh and try again.'),{status:409});
 if(action==='buy-furniture'){
  const kind=String(data.kind);if(!Object.hasOwn(FURNITURE,kind))throw Error('Unknown furniture');if(room.furniture.length>=80)throw Error('House storage is full');const spec=FURNITURE[kind];if(!transfer(w,p.id,'treasury',spec.price,'furniture-purchase:'+kind))throw Error('Not enough coins');room.furniture.push({id:`f-${room.nextId++}`,kind,x:null,y:null,rotation:0});
 }else if(action==='place-furniture'){
  const item=room.furniture.find(i=>i.id===data.item);if(!item)throw Error('Furniture not in your house inventory');if(!Number.isInteger(data.rotation)||data.rotation<0||data.rotation>3)throw Error('Invalid rotation');
  const proposed=room.furniture.map(i=>i.id===item.id?{...i,x:data.x,y:data.y,rotation:data.rotation}:i);validateLayout(proposed);room.furniture=proposed;
 }else if(action==='store-furniture'){const item=room.furniture.find(i=>i.id===data.item);if(!item)throw Error('Furniture not found');item.x=null;item.y=null;
 }else if(action==='house-style'){
  if(!['oak','stone','blue'].includes(data.floor)||!['cream','rose','sage'].includes(data.wall))throw Error('Unknown house style');if(!transfer(w,p.id,'treasury',50,'house-renovation'))throw Error('Not enough coins');room.floor=data.floor;room.wall=data.wall;
 }else throw Error('Unknown house command');room.version++;return house;
}
