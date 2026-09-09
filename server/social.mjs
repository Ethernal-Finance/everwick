const position=p=>p.insideHouse?(p.indoor||{x:5.5,y:8}):p;
// One encounter per resident per evening. Encounters require a real nearby
// neighbour, and any shared food comes from the giver's existing inventory.
export function neighbourhoodEvening(w,{remember,event}){
 const met=new Set();
 for(const n of w.npcs){
  if(met.has(n.id)||n.residency==='away'||n.indoors||n.insideHouse)continue;
  const peer=w.npcs.filter(p=>p.id!==n.id&&!met.has(p.id)&&p.residency!=='away'&&!p.indoors&&!p.insideHouse&&Math.hypot(p.x-n.x,p.y-n.y)<=3)
   .sort((a,b)=>(n.relationships[b.id]||0)-(n.relationships[a.id]||0))[0];
  if(!peer)continue;met.add(n.id);met.add(peer.id);
  const generous=(n.persona?.traits?.generosity||50)>=55;
  if(generous&&(n.inventory.food||0)>=2&&peer.needs.hunger>70){
   n.inventory.food--;peer.inventory.food=(peer.inventory.food||0)+1;
   remember(w,peer,`${n.name} shared food when I was hungry.`,.85,n.id,8);
   remember(w,n,`Shared my food with ${peer.name}.`,.65,peer.id,4);
   event(w,'community',`${n.name} lends a neighbour a hand`,`${peer.name} received food from ${n.name}'s own supplies.`,[n.id,peer.id]);
  }else{
   const tension=(n.relationships[peer.id]||0)<-20;
   remember(w,n,`${tension?'Had an awkward encounter':'Shared the day\'s news'} with ${peer.name}.`,.35,peer.id,tension?-1:2);
   remember(w,peer,`${tension?'Had an awkward encounter':'Shared the day\'s news'} with ${n.name}.`,.35,n.id,tension?-1:2);
  }
  n.needs.social=Math.min(100,n.needs.social+8);peer.needs.social=Math.min(100,peer.needs.social+8);
 }
}
export function socialCommand(w,p,data,{transfer,remember},now=Date.now()){
 const target=w.players[data.target]||w.npcs.find(n=>n.id===data.target&&n.residency!=='away');if(!target||(target.id===p.id||target.id===p.citizenId))throw Error('Choose another citizen');if(target.indoors)throw Error('This citizen is resting at home');const player=!!w.players[target.id];if(player&&now-(target.presenceAt||0)>15000)throw Error('This player is offline');const a=position(p),b=position(target);if((p.insideHouse||null)!==(target.insideHouse||null)||Math.hypot(a.x-b.x,a.y-b.y)>5)throw Error('Move within five tiles of this citizen');
 if(now-(p.socialAt||0)<2000)throw Error('Give them a moment before another interaction');if(!['wave','chat','gift-coins','gift-food'].includes(data.kind))throw Error('Unknown interaction');let text='waves hello',bond=2;
 if(data.kind==='chat'){text=String(data.message||'').trim();if(!text||text.length>200)throw Error('Messages must contain 1–200 characters');}
 if(data.kind==='gift-coins'){if(!transfer(w,p.id,target.id,25,'social-gift'))throw Error('You need 25 coins');text='gave 25 coins';bond=6;}
 if(data.kind==='gift-food'){if(!(p.inventory.food>0))throw Error('You need one food item');p.inventory.food--;target.inventory.food=(target.inventory.food||0)+1;text='shared a meal';bond=8;}
 if(!player)remember(w,target,`${p.name} ${text}.`,.7,p.id,bond);else{target.friendships??={};target.friendships[p.id]=Math.min(100,(target.friendships[p.id]||0)+bond);}
 w.socialEvents??=[];w.socialEvents.push({id:`${p.id}-${now}`,from:p.id,to:target.id,fromName:p.name,toName:target.name,text,kind:data.kind,at:now});w.socialEvents=w.socialEvents.slice(-80);p.socialAt=now;return {ok:true};
}
export function socialFeed(w,p,now=Date.now()){return (w.socialEvents||[]).filter(e=>now-e.at<300000&&(e.from===p.id||e.to===p.id)).slice(-20);}
