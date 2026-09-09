import {TALES,FESTIVALS,FESTIVAL_HOURS,storyPlace,storyLock} from '../client/content.js';
const journal=p=>p.journal??={xp:0,stories:{},badges:[],log:[]};
const near=(p,place)=>{if(!place||p.insideHouse||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-place.x,p.y-place.y)>2.5)throw Error('Walk to the marked destination first');};
const note=(j,tick,text)=>{j.log.unshift({tick,text});j.log=j.log.slice(0,48);};
export function festivalView(w,p){
 const cycle=Math.floor(w.tick/FESTIVAL_HOURS),spec=FESTIVALS[cycle%4],state=w.festivals?.find(f=>f.cycle===cycle);
 return {cycle,...spec,remaining:FESTIVAL_HOURS-w.tick%FESTIVAL_HOURS,delivered:state?.delivered||{},complete:!!state?.complete,
  contributors:Object.keys(state?.contributions||{}).length,contribution:state?.contributions?.[p.id]||0,claimed:!!state?.claims?.[p.id]};
}
export function contentCommand(w,p,action,data,{transfer,remember,event}){
 if(action==='festival-donate'||action==='festival-claim'){
  const view=festivalView(w,p);if(data.cycle!==view.cycle)throw Error('A new season has started. Refresh the festival board.');
  near(p,{x:24,y:22});
  if(action==='festival-donate'){
   if(!Object.hasOwn(view.goals,data.item)||!Number.isSafeInteger(data.qty)||data.qty<1||data.qty>10)throw Error('Choose 1–10 of a requested item');
   const goal=view.goals[data.item],remaining=goal.qty-(view.delivered[data.item]||0);
   if(view.complete||data.qty>remaining)throw Error('The festival does not need that many. Check the remaining goal.');
   if((p.inventory[data.item]||0)<data.qty)throw Error('Bring the requested goods in your inventory first');
   const target=w.businesses.find(b=>b.id===goal.target);if(!target)throw Error('The destination is unavailable');
   w.festivals??=[];let f=w.festivals.find(f=>f.cycle===view.cycle);if(!f){f={cycle:view.cycle,delivered:{},contributions:{},claims:{},complete:false};w.festivals.push(f);w.festivals=w.festivals.slice(-5);}
   p.inventory[data.item]-=data.qty;target.inventory[data.item]=(target.inventory[data.item]||0)+data.qty;
   f.delivered[data.item]=(f.delivered[data.item]||0)+data.qty;f.contributions[p.id]=(f.contributions[p.id]||0)+data.qty;
   if(Object.entries(view.goals).every(([item,g])=>(f.delivered[item]||0)>=g.qty)){
    f.complete=true;event(w,'festival',`${view.name} is ready`,`${Object.keys(f.contributions).length} neighbours supplied local businesses for ${view.season.toLowerCase()}. Thank-you rewards are available at the square until the season ends.`,Object.keys(f.contributions));
   }
   return festivalView(w,p);
  }
  const f=w.festivals?.find(f=>f.cycle===view.cycle);
  if(!f?.complete||(f.contributions[p.id]||0)<3)throw Error('Complete all goals and contribute at least three items to earn a thank-you');
  if(f.claims[p.id])throw Error('You have already collected this season\'s thank-you');
  if(!transfer(w,'treasury',p.id,120,'festival-thanks'))throw Error('The treasury is short. Your reward remains available until the season ends.');
  f.claims[p.id]=true;const j=journal(p);j.xp+=40;const badge=`${view.season} Festival Friend`;if(!j.badges.includes(badge))j.badges.push(badge);note(j,w.tick,`${view.name}: supplied the town and earned 120 coins.`);return festivalView(w,p);
 }
 if(!Object.hasOwn(TALES,data.story))throw Error('Unknown town story');
 const tale=TALES[data.story],existing=p.journal?.stories?.[data.story];
 if(action==='story-start'){
  if(existing)throw Error('This story is already in your journal');const lock=storyLock(p,tale);if(lock)throw Error(lock);
  const j=journal(p);j.stories[data.story]={step:0,complete:false};note(j,w.tick,`Started ${tale.title}.`);return j;
 }
 if(action!=='story-step')throw Error('Unknown content action');
 if(!existing||existing.complete)throw Error('Start this story, or choose another unfinished story');
 if(data.step!==existing.step)throw Error('This objective has already changed. Refresh your journal.');
 const step=tale.steps[existing.step];near(p,storyPlace(w,step.place));
 if(step.require?.farmingXp&&(p.farmingXp||0)<step.require.farmingXp)throw Error('Complete two harvests on your leased plots first');
 if(step.require?.catches&&(p.fishing?.catches||0)<step.require.catches)throw Error('Catch three fish at Willowbank first');
 if(step.goods){
  for(const [item,qty]of Object.entries(step.goods))if((p.inventory[item]||0)<qty)throw Error(`Bring ${qty} ${item} in your inventory first`);
  const target=w.businesses.find(b=>b.id===step.place);if(!target)throw Error('The receiving business is unavailable');
  for(const [item,qty]of Object.entries(step.goods)){p.inventory[item]-=qty;target.inventory[item]=(target.inventory[item]||0)+qty;}
 }
 const j=journal(p);
 if(step.final){
  if(!['paid','community'].includes(data.choice))throw Error('Choose a fee or a community favour');
  if(data.choice==='paid'&&!transfer(w,'treasury',p.id,tale.reward,'town-story:'+data.story))throw Error('The treasury cannot pay yet. Your story remains ready to finish.');
  const bond=data.choice==='community'?12:4;
  for(const n of w.npcs.filter(n=>n.employer===tale.patron&&n.id!==p.citizenId))remember(w,n,`${p.name} helped with ${tale.title}${data.choice==='community'?' and waived the fee':''}.`,.9,p.id,bond);
  existing.complete=true;existing.choice=data.choice;existing.completedAt=w.tick;j.xp+=60;if(!j.badges.includes(tale.badge))j.badges.push(tale.badge);
  note(j,w.tick,tale.ending[data.choice]);event(w,'story',`${p.name}: ${tale.title}`,tale.ending[data.choice],[p.id,tale.patron]);
 }else{j.xp+=10;note(j,w.tick,`${tale.title}: ${step.title} complete.`);}
 existing.step++;return j;
}
