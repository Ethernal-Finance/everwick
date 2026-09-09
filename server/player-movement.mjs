import {FURNITURE,footprint} from '../client/furniture.js';
import {MAP,blocked} from '../client/world-map.js';
export function movePlayer(p,data,now=Date.now(),w){
 if(p.insideHouse){const room=w?.properties.find(h=>h.id===p.insideHouse)?.interior;if(!room)throw Error('House unavailable');const old=p.indoor||{x:5.5,y:8},x=data.x,y=data.y,dist=Math.hypot(x-old.x,y-old.y),elapsed=Math.max(0,Math.min(2,(now-(p.positionAt??now-500))/1000));if(!Number.isFinite(x)||!Number.isFinite(y)||dist>elapsed*3.5+.65)throw Error('Invalid room movement');const steps=Math.max(1,Math.ceil(dist/.1));for(let k=1;k<=steps;k++){const tx=old.x+(x-old.x)*k/steps,ty=old.y+(y-old.y)*k/steps;if(tx<1||tx>=10.5||ty<1||ty>=8.7||room.furniture.some(i=>{const f=FURNITURE[i.kind],s=footprint(i);return i.x!==null&&!f.floor&&tx+.4>i.x&&tx<i.x+s.w&&ty>i.y&&ty-.3<i.y+s.h;}))throw Error('Room route is blocked');}p.indoor={x,y};p.positionAt=now;p.presenceAt=now;if(dist>.01){p.movedAt=now;p.direction=Math.abs(x-old.x)>Math.abs(y-old.y)?x<old.x?1:2:y<old.y?3:0;}return {x,y};}
 const {x,y}=data;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid position');
 const points=data.points??[{x,y}];if(!Array.isArray(points)||!points.length||points.length>120||points.at(-1).x!==x||points.at(-1).y!==y)throw Error('Invalid route');
 let total=0,px=p.x,py=p.y;
 for(const point of points){if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('Invalid route');const d=Math.hypot(point.x-px,point.y-py);total+=d;if(total>8)throw Error('Movement is too fast');const steps=Math.max(1,Math.ceil(d/.15));for(let i=1;i<=steps;i++){const tx=px+(point.x-px)*i/steps,ty=py+(point.y-py)*i/steps;if(blocked(tx,ty)||blocked(tx+.4,ty))throw Error('The route is blocked');}px=point.x;py=point.y;}
 const elapsed=Math.max(0,Math.min(2,(now-(p.positionAt??now-500))/1000));if(total>elapsed*3.5+.65)throw Error('Movement is too fast');
 if(total>.01){p.movedAt=now;p.direction=Math.abs(x-p.x)>Math.abs(y-p.y)?x<p.x?1:2:y<p.y?3:0;}p.presenceAt=now; p.x=x;p.y=y;p.positionAt=now;return {x,y};
}

// Reacquire at the server's current location before accepting client movement.
export function takeControl(w,p,now=Date.now(),clientId){
 const n=w.npcs.find(n=>n.id===p.citizenId);if(!n||p.accessRevoked)throw Error('Active citizenship is required.');
 if(!p.insideHouse&&(blocked(p.x,p.y)||blocked(p.x+.4,p.y))){let spot;for(let r=1;r<=8&&!spot;r++)for(let y=-r;y<=r&&!spot;y++)for(let x=-r;x<=r;x++){const tx=Math.round(p.x)+x,ty=Math.round(p.y)+y;if(!blocked(tx,ty)&&!blocked(tx+.4,ty)){spot={x:tx,y:ty};break;}}if(!spot)throw Error('No walkable exit near this citizen.');p.x=spot.x;p.y=spot.y;}
 n.path=[];n.target=null;n.brain=null;n.indoors=false;n.walking=false;n.activity='player';
 p.controlAt=p.presenceAt=p.positionAt=now;if(clientId)p.controlClient=clientId;
 return {x:p.x,y:p.y,indoor:p.indoor,insideHouse:p.insideHouse||null,autonomous:false,rebased:true};
}
