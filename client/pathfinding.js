import {MAP,blocked} from './world-map.js';
// Bounded A*: memory follows explored nodes, not the million-tile world area.
export function findPath(sx,sy,tx,ty,limit=20000){
 sx=Math.round(sx);sy=Math.round(sy);tx=Math.round(tx);ty=Math.round(ty);if(blocked(tx,ty))return [];
 const key=(x,y)=>y*MAP.width+x,heuristic=(x,y)=>Math.abs(tx-x)+Math.abs(ty-y),start=key(sx,sy),goal=key(tx,ty),cost=new Map([[start,0]]),prev=new Map(),heap=[];
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};push({k:start,g:0,f:heuristic(sx,sy)});let visited=0;
 while(heap.length&&visited++<limit){const node=pop();if(node.g!==cost.get(node.k))continue;if(node.k===goal){const path=[];let k=goal;while(k!==start){path.push([k%MAP.width,Math.floor(k/MAP.width)]);k=prev.get(k);}return path.reverse();}const x=node.k%MAP.width,y=Math.floor(node.k/MAP.width);
  for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny),g=node.g+1;if(blocked(nx,ny)||g>=(cost.get(k)??Infinity))continue;cost.set(k,g);prev.set(k,node.k);push({k,g,f:g+heuristic(nx,ny)*1.001});}
 }return [];
}
