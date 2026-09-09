// Decorative scenery only: no collision, economy, or destination changes.
import {isPath,biome,blocked,CIVIC,HOMES,COTTAGES} from './world-map.js';
const T=16;
export const LANDMARK_ROOFS={tavern:[448,64,64,64],clinic:[448,256,64,64],hall:[448,192,64,64],bank:[448,384,64,64],sunfield:[320,400,64,80],orchard:[448,320,64,64],forge:[448,128,64,64],market:[448,512,64,64]};
export function groundDetail(r,x,y,path,b){
 const c=r.ctx,px=x*T,py=y*T,h=((x*73856093)^(y*19349663))>>>0;
 // Break up the tiled lawn without adding objects the player might mistake for walls.
 if(!path&&b!=='water'&&b!=='snow'&&b!=='desert'){
  c.fillStyle=h%3===0?'#d7e6a60b':'#143e2410';c.fillRect(px,py,16,16);
  if(h%43===0&&!blocked(x,y))r.sprite('forest',[h%2?16:32,304,16,16],px,py);
 }
 if(path&&b!=='water'){
  c.fillStyle='#d3bc83';
  if(!isPath(x,y-1))c.fillRect(px,py,16,1);
  if(!isPath(x,y+1))c.fillRect(px,py+15,16,1);
  if(!isPath(x-1,y))c.fillRect(px,py,1,16);
  if(!isPath(x+1,y))c.fillRect(px+15,py,1,16);
  c.fillStyle='#c9b78966';if(h%4===0){c.fillRect(px+3,py+5,3,1);c.fillRect(px+10,py+12,2,1);}
 }
 // Water banks stay on the existing water boundary.
 if(b==='water'&&!path){c.fillStyle='#b9c78a';if(biome(x+1,y)!=='water')c.fillRect(px+14,py,2,16);if(biome(x-1,y)!=='water')c.fillRect(px,py,2,16);if(biome(x,y-1)!=='water')c.fillRect(px,py,16,2);if(biome(x,y+1)!=='water')c.fillRect(px,py+14,16,2);}
}
export function townScenery(r,drawables,buildings,bounds){
 const {minX,maxX,minY,maxY}=bounds;
 const add=(key,rect,x,y)=>{if(x<minX-4||x>maxX+4||y<minY-5||y>maxY+5)return;drawables.push({y,draw:()=>r.sprite(key,rect,x*T,y*T-rect[3])});};
 // Planters and barrels sit against solid building fronts, clear of the entrance.
 for(const b of [...buildings,...CIVIC,...HOMES,...COTTAGES]){
  if(b.x>94||b.y>80)continue;
  add('village',[192,192,32,16],b.x,b.y-1.8);
  if(b.id==='tavern'||b.id==='warehouse')add('village',[0,192,16,16],b.x+3,b.y-.2);
 }
 // Low flowers soften the square and residential verges. Keep roads and work plots clear.
 for(let y=Math.max(3,minY);y<Math.min(78,maxY);y++)for(let x=Math.max(5,minX);x<Math.min(94,maxX);x++){
  if(isPath(x,y)||blocked(x,y)||biome(x,y)==='water'||(x<17&&y>24&&y<43))continue;
  if((isPath(x-1,y)||isPath(x+1,y))&&(x*7+y*11)%17===0)add('forest',[32,304,16,16],x,y+1);
 }
 // Existing square becomes a small planted gathering place.
 for(const [x,y] of [[23,22],[30,22],[23,25],[30,25]])add('city',[128,16,16,32],x,y);
 for(const [x,y] of [[24,22],[28,25]])add('village',[64,192,32,16],x,y);
 for(const [x,y] of [[5,29],[6,32],[9,40],[5,43]])add('forest',[0,272,16,16],x,y);
}
