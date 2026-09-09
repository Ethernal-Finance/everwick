import {MISSIONS} from '../client/missions.js';
const at=(p,b)=>{if(p.insideHouse||Math.hypot(p.x-(b.x+2),p.y-(b.y+1))>2.5)throw Error('Walk to this business first');};
export function missionCommand(w,p,action,data,{transfer,remember,event}){
 if(action==='mission-take'){
  if(p.mission)throw Error('Complete your active delivery first');if(!Object.hasOwn(MISSIONS,data.kind))throw Error('Unknown contract');const s=MISSIONS[data.kind],source=w.businesses.find(b=>b.id===s.source),target=w.businesses.find(b=>b.id===s.target);at(p,source);
  if(w.tick-(p.missionCooldowns?.[data.kind]??-8)<8)throw Error('This customer needs eight town hours before another contract');
  if(source.status!=='open'||target.status!=='open')throw Error('Both businesses must be open');if((source.inventory[s.item]||0)<s.qty)throw Error('The supplier is short of stock');const cost=source.price*s.qty;if(target.cash<cost+s.reward)throw Error('The customer cannot fund this contract yet');
  if(!transfer(w,target.id,source.id,cost,'contract-supplies:'+s.item))throw Error('The customer cannot fund these supplies');source.inventory[s.item]-=s.qty;source.revenue+=cost;source.soldToday=(source.soldToday||0)+s.qty;target.expenses+=cost;p.mission={kind:data.kind,target:s.target,item:s.item,qty:s.qty,reward:s.reward};return p.mission;
 }
 const m=p.mission;if(!m)throw Error('No active delivery');if(!['paid','favour'].includes(data.choice))throw Error('Choose payment or a favour');const target=w.businesses.find(b=>b.id===m.target);at(p,target);
 if(data.choice==='paid'){if(!transfer(w,target.id,p.id,m.reward,'contract-fee'))throw Error('The customer is short of cash. Wait or choose to waive your fee');target.expenses+=m.reward;}
 target.inventory[m.item]=(target.inventory[m.item]||0)+m.qty;const goodwill=data.choice==='favour'?12:4;p.goodwill??={};p.goodwill[target.id]=Math.min(100,(p.goodwill[target.id]||0)+goodwill);
 for(const n of w.npcs.filter(n=>n.employer===target.id))remember(w,n,`${p.name} delivered ${m.item}${data.choice==='favour'?' and waived the delivery fee':''}.`,.8,p.id,goodwill);
 const title=MISSIONS[m.kind].title;p.missionLog??=[];p.missionLog.unshift(`${title}: ${data.choice==='paid'?m.reward+' coins earned':'fee waived for the neighbourhood'}`);p.missionLog=p.missionLog.slice(0,12);p.missionCooldowns??={};p.missionCooldowns[m.kind]=w.tick;p.mission=null;event(w,'community',`${p.name} supplies ${target.name}`,`${m.qty} ${m.item} reached the business${data.choice==='favour'?' without a delivery fee':''}.`,[p.id,target.id]);return p;
}
