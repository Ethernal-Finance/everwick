import {footprint} from './furniture.js';
export function roomCell(clientX,clientY,rect,width,height){const scale=Math.min(width/224,height/208),ox=(width-192*scale)/2,oy=(height-160*scale)/2;return {x:Math.floor(((clientX-rect.left)*width/rect.width-ox)/scale/16),y:Math.floor(((clientY-rect.top)*height/rect.height-oy)/scale/16)};}
export function pickFurniture(items,x,y){return [...items].filter(i=>i.x!==null).reverse().find(i=>{const s=footprint(i);return x>=i.x&&x<i.x+s.w&&y>=i.y&&y<i.y+s.h;});}
export function attachHouseEditor(renderer){const canvas=renderer.canvas;const owned=()=>{const w=renderer.world;return w?.properties.find(h=>h.id===w.player?.insideHouse&&h.owner===w.player.id);};const cell=e=>roomCell(e.clientX,e.clientY,canvas.getBoundingClientRect(),canvas.width,canvas.height);
 const begin=(id,e)=>{const house=owned(),item=house?.interior.furniture.find(i=>i.id===id);if(!item)return;renderer.dragging={...item,...cell(e),version:house.interior.version,house:house.id};};
 const drop=()=>{const d=renderer.dragging;renderer.dragging=null;renderer.pendingPlacement=null;if(d)renderer.onFurnitureMove?.({id:d.house,item:d.id,x:d.x,y:d.y,rotation:d.rotation,version:d.version});};
 canvas.addEventListener('pointerdown',e=>{const h=owned();if(!h)return;const p=cell(e),item=renderer.pendingPlacement||pickFurniture(h.interior.furniture,p.x,p.y)?.id;if(!item)return;e.preventDefault();canvas.focus();begin(item,e);canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(renderer.dragging)Object.assign(renderer.dragging,cell(e));});
 canvas.addEventListener('pointerup',e=>{if(renderer.dragging){Object.assign(renderer.dragging,cell(e));drop();}});
 canvas.addEventListener('pointercancel',()=>renderer.dragging=null);
 canvas.addEventListener('dragover',e=>{if(!owned())return;e.preventDefault();if(renderer.pendingPlacement&&!renderer.dragging)begin(renderer.pendingPlacement,e);if(renderer.dragging)Object.assign(renderer.dragging,cell(e));});
 canvas.addEventListener('drop',e=>{if(!owned())return;e.preventDefault();if(!renderer.dragging)begin(e.dataTransfer.getData('text/plain'),e);if(renderer.dragging)Object.assign(renderer.dragging,cell(e));drop();});
 canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){renderer.dragging=null;renderer.pendingPlacement=null;}if(e.key.toLowerCase()==='r'&&renderer.dragging){e.preventDefault();renderer.dragging.rotation=(renderer.dragging.rotation+1)%4;}});
}
