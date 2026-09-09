import {contentCommand} from './content.mjs';
import {bindCitizens,citizenCommand,sexFromId} from './citizenship.mjs';
import {ensureStarterEconomy} from './economy.mjs';
import {appearanceCommand,ensureAppearanceShops} from './appearance.mjs';
import {constructionCommand} from './construction.mjs';
import {farmingCommand} from './farming.mjs';
import {industryCommand,feedFromMarket,votePolicy,settlePolicy} from './industry.mjs';
import {populationDay} from './population.mjs';
import {socialCommand,neighbourhoodEvening} from './social.mjs';
import {fishingCommand} from './fishing.mjs';
import {missionCommand} from './missions.mjs';
import {chapterCommand} from './chapter.mjs';
import {lifeCommand,refreshLife} from './life.mjs';
import {ensureHousing,houseCommand} from './housing.mjs';
import {dungeonCommand,expireDungeonRuns} from './dungeon.mjs';
import {WAYPOINTS} from '../client/world-map.js';
import {advanceMovement,migrateMap} from './movement.mjs';
import {ensureCivilization,civilizationAccount,civilizationDay,civilizationCommand,civilizationCash} from './civilization.mjs';
export const GOODS = {food:12,ore:24,tools:180,meal:40,ale:36,goods:42,care:40,lodging:45};
const names=['Mara','Theo','Iris','Rowan','Ada','Felix','Jun','Nora','Otis','Cleo','Marcus','Elin','Tamsin','Hugo','Lena','Silas','Poppy','Arthur','Wren','Bea'];
const surnames=['Hale','Moss','Reed','Vale','Finch'];
const specs=[
 ['sunfield','Sunfield Farm','Farm','food',{},7,12,38,3,3],
 ['orchard','Bramble Orchard','Farm','food',{},6,13,40,9,3],
 ['mine','Copperhill Mine','Mine','ore',{},5,24,42,22,3],
 ['forge','Ember & Anvil','Blacksmith','tools',{ore:2},1,180,46,22,9],
 ['tavern','Green Dragon Tavern','Tavern','ale',{food:1},1,36,40,4,10],
 ['restaurant','The Copper Spoon','Restaurant','meal',{food:1},1,40,42,10,10],
 ['market','Market on the Square','Store','goods',{food:1},1,42,40,15,10],
 ['workshop','Reedwood Workshop','Workshop','tools',{ore:2},1,182,44,22,16],
 ['inn','The Lantern Inn','Inn','lodging',{food:1},1,45,40,4,17],
 ['clinic','Willow Clinic','Clinic','care',{food:1},1,40,44,10,17],
 ['warehouse','Eastgate Provisions','Warehouse','food',{},5,14,38,16,17],
 ['garden','Town Kitchen Garden','Farm','food',{},5,12,38,16,3]
];
export function seedWorld(now=Date.now()) {
 const w={version:1,tick:0,lastTickAt:now,npcs:[],businesses:[],properties:[],players:{},treasury:{id:'treasury',cash:500000},ledger:[],events:[],nextEvent:1,prices:{...GOODS},news:[],produced:{},consumed:{}};
 w.businesses=specs.map((s,i)=>({id:s[0],name:s[1],type:s[2],output:s[3],recipe:s[4],rate:s[5],price:s[6],wage:s[7],x:s[8],y:s[9],cash:5000,inventory:{food:20,ore:4,tools:1,[s[3]]:s[3]==='tools'?6:s[3]==='ore'?15:40},owner:`npc-${i}`,employees:[],forSale:i>=4,valuation:i===4?1200:2400+i*90,starterListing:i===4,revenue:0,expenses:0,lastProfit:0,arrears:0,status:'open',hours:12,advertising:0,upgrade:0}));
 for(let i=0;i<25;i++){
  const employer=w.businesses[i%12];
  const n={id:`npc-${i}`,name:`${names[i%20]} ${surnames[Math.floor(i/20)]}`,age:20+i%49,personality:['kind','ambitious','thrifty','sociable','stubborn'][i%5],skills:{trade:1+i%5,craft:1+i%7},occupation:employer.type==='Farm'?'Grower':employer.type==='Mine'?'Miner':`${employer.type} worker`,cash:350+i*9,inventory:{food:3,goods:1},housing:`home-${i}`,rent:35+i%4*5,needs:{hunger:12,energy:90,social:70},goal:i%3===0?'Save enough to open a business':'Build a comfortable life in Everwick',ambition:i%3===0?'entrepreneur':'security',preferences:{maxFoodPrice:18+i%6,favorite:employer.output},employer:employer.id,relationships:{},memories:[],summary:'A founding resident of Everwick.',reputation:50,x:employer.x+(i%3),y:employer.y+2,routine:'Settling into town',arrears:0,generation:0,starter:false,canBreed:true,sex:sexFromId(`npc-${i}`)};
  w.npcs.push(n);employer.employees.push(n.id);
  w.properties.push({id:n.housing,name:`${i+1} Willow Lane`,tenant:n.id,owner:`npc-${(i+23)%25}`,rent:n.rent,forSale:i%10===0,valuation:i%10===0?900:1600+i*10,starterListing:i%10===0,x:2+(i%12)*2,y:23+Math.floor(i/12)%4});
 }
 ensureAppearanceShops(w);
 event(w,'town','Everwick opens its doors','Twenty-five founding residents begin their first day. Sixteen businesses are open across trade, services, and production.');
 migrateMap(w);ensureHousing(w);ensureCivilization(w);ensureStarterEconomy(w);bindCitizens(w);return w;
}
export function event(w,type,title,body,subjects=[]){const e={id:w.nextEvent++,tick:w.tick,type,title,body,subjects};w.events.push(e);if(w.events.length>2000)w.events.shift();return e;}
export function account(w,id){if(id==='treasury')return w.treasury;if(String(id).startsWith('treasury:')){const civic=civilizationAccount(w,id);if(civic)return civic;}const project=w.construction?.projects.find(p=>p.id===id&&p.status==='building');if(project)return project;return w.npcs.find(n=>n.id===id)||w.businesses.find(b=>b.id===id)||w.players[id];}
export function transfer(w,fromId,toId,amount,reason){
 if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid amount');
 const a=account(w,fromId),b=account(w,toId);if(!a||!b)throw Error('Unknown account');if(a.cash<amount)return false;if(a===b)return true;
 a.cash-=amount;b.cash+=amount;w.ledger.push({tick:w.tick,from:fromId,to:toId,amount,reason});if(w.ledger.length>12000)w.ledger.shift();return true;
}
export function trade(w,buyer,seller,item,qty,price){
 if(!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(price)||price<=0)throw Error('Invalid trade');
 if((seller.inventory[item]||0)<qty||buyer.cash<qty*price)return false;
 if(!transfer(w,buyer.id,seller.id,qty*price,`purchase:${item}:${qty}`))return false;
 seller.inventory[item]-=qty;buyer.inventory[item]=(buyer.inventory[item]||0)+qty;if('revenue'in seller){seller.revenue+=qty*price;seller.soldToday=(seller.soldToday||0)+qty;}
 if('expenses'in buyer)buyer.expenses+=qty*price;return true;
}
export function remember(w,n,text,importance=0.6,subject='town',sentiment=0){
 const existing=n.memories.find(m=>m.text===text&&m.subject===subject);
 if(existing){existing.tick=w.tick;existing.importance=Math.min(1,existing.importance+0.1);}else n.memories.push({text,importance,subject,sentiment,tick:w.tick});
 n.relationships[subject]=Math.max(-100,Math.min(100,(n.relationships[subject]||0)+sentiment));
 if(n.memories.length>32){let lowest=0;for(let i=1;i<n.memories.length;i++)if(n.memories[i].importance*Math.exp(-(w.tick-n.memories[i].tick)/240)<n.memories[lowest].importance*Math.exp(-(w.tick-n.memories[lowest].tick)/240))lowest=i;const [old]=n.memories.splice(lowest,1);n.summary=`${n.name} values ${n.personality==='ambitious'?'advancement':'stability'}. Earlier: ${old.text}`;}
}
export function retrieve(w,n,query='',subject='town'){
 const words=query.toLowerCase().split(/\W+/).filter(s=>s.length>3);
 return n.memories.map(m=>({...m,score:m.importance*Math.exp(-(w.tick-m.tick)/240)+(m.subject===subject?.5:0)+words.filter(s=>m.text.toLowerCase().includes(s)).length*.2})).sort((a,b)=>b.score-a.score).slice(0,5);
}
function suppliers(w,item,except,buyer){const score=b=>b.price+(buyer?Math.hypot(b.x-buyer.x,b.y-buyer.y)*.25-(b.advertising||0)/100-(buyer.relationships?.[b.owner]||0)/50:0);return w.businesses.filter(b=>b.id!==except&&b.output===item&&b.status==='open'&&(b.inventory[item]||0)>0).sort((a,b)=>score(a)-score(b));}
function consume(w,n,item,qty=1){if((n.inventory[item]||0)<qty)return false;n.inventory[item]-=qty;w.consumed[item]=(w.consumed[item]||0)+qty;return true;}
function move(n,x,y){if(n.x!==x)n.x+=Math.sign(x-n.x);else if(n.y!==y)n.y+=Math.sign(y-n.y);}
export function tick(w,{advanceSeconds=15}={}){
 expireDungeonRuns(w,Date.now());
 advanceMovement(w,advanceSeconds);
 w.tick++;const hour=w.tick%24;
 for(const b of w.businesses){
  if(b.status!=='open'||b.serviceKind)continue;
  if(hour>=7&&hour<Math.min(23,7+b.hours)){
   const workers=b.employees.filter(id=>{const n=account(w,id);return n&&n.routine.startsWith('Working')&&Math.hypot(n.x-(b.x+2),n.y-(b.y+1))<5;}).length; if(!workers)continue;
   // Maintain two days of measured sales; stop spending on unsold output.
   const target=Math.max(b.output==='food'?90:b.output==='ore'?35:b.output==='tools'?12:30,(b.lastSold||0)*2);
   if((b.inventory[b.output]||0)>=target)continue;
   const batches=Math.max(1,Math.floor(workers/3))+b.upgrade;
   for(const [item,qty]of Object.entries(b.recipe))for(const s of suppliers(w,item,b.id)){
    const need=Math.max(0,qty*batches*2-(b.inventory[item]||0));if(!need)break;
    const count=Math.min(need,s.inventory[item],Math.floor(b.cash/s.price));if(count)trade(w,b,s,item,count,s.price);
   }
   let runs=batches;for(const [item,qty]of Object.entries(b.recipe))runs=Math.min(runs,Math.floor((b.inventory[item]||0)/qty));
   // Tools wear out in extractive work, creating downstream demand.
   if(['Farm','Mine','Warehouse'].includes(b.type)&&(b.toolWear||0)>=40){
    if(!(b.inventory.tools>0)){const s=suppliers(w,'tools',b.id)[0];if(s)trade(w,b,s,'tools',1,s.price);}
    if(b.inventory.tools>0){b.inventory.tools--;b.toolWear-=40;w.consumed.tools=(w.consumed.tools||0)+1;}else runs=Math.floor(runs/2);
   }
   for(const [item,qty]of Object.entries(b.recipe)){b.inventory[item]-=runs*qty;w.consumed[item]=(w.consumed[item]||0)+runs*qty;}
   const output=runs*(b.rate+(w.city?.level||0));const contributors=b.employees.map(id=>account(w,id)).filter(n=>n&&n.routine.startsWith('Working')&&Math.hypot(n.x-(b.x+2),n.y-(b.y+1))<5);for(let i=0;i<output;i++){const n=contributors[i%contributors.length];if(n){n.contribution??={workSeconds:0,civicSeconds:0,produced:0};n.contribution.produced++;}}b.toolWear=(b.toolWear||0)+output;b.inventory[b.output]=(b.inventory[b.output]||0)+output;w.produced[b.output]=(w.produced[b.output]||0)+output;
  }
 }
 for(const n of w.npcs){
  if(n.residency==='away')continue;
  n.needs.hunger=Math.min(100,n.needs.hunger+4);n.needs.social=Math.max(0,n.needs.social-1);
  const b=w.businesses.find(b=>b.id===n.employer),home=w.properties.find(p=>p.id===n.housing);
  if(hour<7||hour>=22)n.needs.energy=Math.min(100,n.needs.energy+12);
  else if(hour>=8&&hour<18&&b&&b.status==='open')n.needs.energy=Math.max(0,n.needs.energy-3);
  if(n.needs.hunger>35){
   let ate=consume(w,n,'food');if(!ate&&feedFromMarket(w,n,transfer))ate=consume(w,n,'food');
   if(!ate){const s=suppliers(w,'food',null,n).find(s=>s.price<=n.preferences.maxFoodPrice&&n.cash>=s.price&&Math.hypot(n.x-(s.x+2),n.y-(s.y+1))<5);if(s&&trade(w,n,s,'food',Math.min(3,s.inventory.food,Math.floor(n.cash/s.price)),s.price))ate=consume(w,n,'food');}
   if(ate)n.needs.hunger=Math.max(0,n.needs.hunger-35);
  }
  if(hour===19){
   const types=['meal','ale','goods','care','lodging'];const item=types[(Number(n.id.slice(4))+Math.floor(w.tick/24))%5];
   const s=suppliers(w,item,null,n).find(s=>s.price<=GOODS[item]*1.4&&n.cash>s.price+30&&Math.hypot(n.x-(s.x+2),n.y-(s.y+1))<5);
   if(s&&trade(w,n,s,item,1,s.price)){consume(w,n,item);n.needs.social=Math.min(100,n.needs.social+20);remember(w,n,`Visited ${s.name}.`,.3,s.owner,1);}

  }
 }
 if(hour===19)neighbourhoodEvening(w,{remember,event});
 if(hour===0)closeDay(w);
 return w;
}
function closeDay(w){
 const oldPrices={...w.prices};
 for(const b of w.businesses){
  if(b.status!=='open')continue;
  b.wageDebt??={};
  for(const id of b.employees)b.wageDebt[id]=(b.wageDebt[id]||0)+b.wage;
  for(const [id,due]of Object.entries(b.wageDebt)){const n=account(w,id);if(transfer(w,b.id,n.id,due,'wage')){b.expenses+=due;delete b.wageDebt[id];remember(w,n,`Earned ${due} coins working at ${b.name}.`,.3,b.id,1);}else remember(w,n,`${b.name} missed my wages.`,.9,b.owner,-15);}
  b.arrears=Object.keys(b.wageDebt).length?b.arrears+1:0;
  if(b.advertising&&transfer(w,b.id,'treasury',b.advertising,'advertising'))b.expenses+=b.advertising;
  b.lastProfit=b.revenue-b.expenses;
  b.lossDays=b.lastProfit<0?(b.lossDays||0)+1:0;
  if(!w.players[b.owner]&&b.lossDays>=3&&b.employees.length>2){
   const id=b.employees.pop(),n=account(w,id);n.employer=null;remember(w,n,`${b.name} cut my job after sustained losses.`,.9,b.owner,-12);event(w,'job',`${b.name} reduces its workforce`,`${n.name} is looking for work after three loss-making days.`,[n.id,b.id]);
  }
  if(w.players[b.owner])event(w,'business',`${b.name}: ${b.lastProfit>=0?'+':''}${b.lastProfit} coins today`,`${b.revenue} in sales, ${b.expenses} in expenses; ${b.employees.length} employees.`,[b.owner,b.id]);
  b.lastSold=b.soldToday||0;b.soldToday=0;
  // Locally owned shops share surplus with workers, then pay an owner dividend.
  // These are transfers of earned cash, not newly created currency.
  if(!w.players[b.owner]&&b.lastProfit>0&&b.cash>5000){
   const surplus=Math.min(b.lastProfit,b.cash-5000),bonus=Math.floor(surplus*.7/Math.max(1,b.employees.length));
   for(const id of b.employees)if(bonus)transfer(w,b.id,id,bonus,'profit-share');
   const dividend=Math.floor(surplus*.3);if(dividend)transfer(w,b.id,b.owner,dividend,'owner-dividend');
  }
  b.revenue=0;b.expenses=0;
  if(b.arrears>=3){b.status='closed';for(const id of b.employees)account(w,id).employer=null;b.employees=[];event(w,'closure',`${b.name} closes its doors`,'Three days of unpaid wages forced the business to close.',[b.id,b.owner]);}
  if(!b.serviceKind&&!w.players[b.owner]){const stock=b.inventory[b.output]||0;const target=Math.max(15,b.lastSold*2);b.price=Math.max(Math.ceil(GOODS[b.output]*.8),Math.min(GOODS[b.output]*2,Math.round(b.price*(stock<target*.4?1.1:stock>target*2?.95:1))));}
 }
 for(const n of w.npcs){
  if(n.residency==='away')continue;
  const p=w.properties.find(p=>p.id===n.housing);
  // Remotes / travelers may lack housing after Gen A spread — skip rent rather than crash closeDay.
  if(p){if(!transfer(w,n.id,p.owner,p.rent,'rent')){n.arrears++;remember(w,n,'Could not afford rent today.',.8,p.owner,-4);}else n.arrears=0;}
  const current=w.businesses.find(b=>b.id===n.employer);
  const better=w.businesses.filter(b=>b.status==='open'&&(b.lossDays||0)<3&&b.employees.length<12&&b.cash>b.wage*12&&(n.relationships[b.owner]||0)>-40).sort((a,b)=>(b.wage+(n.relationships[b.owner]||0)/10)-(a.wage+(n.relationships[a.owner]||0)/10))[0];
  if(better&&(!current||current.arrears||better.wage>current.wage*1.2)){
   if(current)current.employees=current.employees.filter(id=>id!==n.id);better.employees.push(n.id);n.employer=better.id;n.occupation=`${better.type} worker`;remember(w,n,`Accepted a job at ${better.name}.`,.9,better.owner,6);event(w,'job',`${n.name} joins ${better.name}`,`A daily wage of ${better.wage} coins brought a new opportunity.`,[n.id,better.owner]);
  }
  if(n.ambition==='entrepreneur'&&n.cash>9000&&!w.businesses.some(b=>b.owner===n.id)){
   const day=Math.floor(w.tick/24);
   const offer=w.businesses.find(b=>{
    if(!b.forSale||w.players[b.owner])return false;
    if(b.starterListing&&day<14)return false;
    const reserve=(b.starterListing||b.valuation<=2000)?6000:4000;
    return n.cash>b.valuation+reserve;
   });
   if(offer){transfer(w,n.id,offer.owner,offer.valuation,'npc-business-purchase');offer.owner=n.id;offer.forSale=false;event(w,'ownership',`${n.name} buys ${offer.name}`,'Years of ambition become a new chapter on the high street.',[n.id,offer.id]);}
  }
 }
 for(const item of Object.keys(GOODS)){const list=w.businesses.filter(b=>b.output===item&&b.status==='open');if(list.length)w.prices[item]=Math.round(list.reduce((s,b)=>s+b.price,0)/list.length);const change=oldPrices[item]>0?Math.round((w.prices[item]/oldPrices[item]-1)*100):0;if(Math.abs(change)>=5)event(w,'market',`${item[0].toUpperCase()+item.slice(1)} prices ${change>0?'rise':'fall'} ${Math.abs(change)}%`,`Available stock and purchasing demand moved the average price to ${w.prices[item]} coins.`,[]);}
 w.economyHistory??=[];w.economyHistory.push({day:Math.floor(w.tick/24),employed:w.npcs.filter(n=>n.employer).length,open:w.businesses.filter(b=>b.status==='open').length,prices:{...w.prices},treasury:w.treasury.cash,hungry:w.npcs.filter(n=>n.needs.hunger>70).length});w.economyHistory=w.economyHistory.slice(-30);
 settlePolicy(w,transfer,event);
 populationDay(w,{transfer,event});
 civilizationDay(w,{transfer,event});
 const stories=w.events.filter(e=>e.tick>w.tick-24).slice(-10);
 w.news.unshift({day:Math.floor(w.tick/24),tick:w.tick,headline:stories.at(-1)?.title||'A steady day on the high street',stories});w.news=w.news.slice(0,30);
}
export function addPlayer(w,id,name){if(w.players[id])return w.players[id];const p={id,name,cash:0,inventory:{},x:14,y:14,lastSeen:w.tick,created:w.tick};w.players[id]=p;if(!transfer(w,'treasury',id,4500,'starter-grant'))throw Error('Town starter fund is exhausted');return p;}
export function command(w,userId,action,data={}){
 const p=w.players[userId];if(!p)throw Error('Player not found');ensureHousing(w);
 if(p.dungeonRun?.active&&!String(action).startsWith('dungeon-'))throw Error('Finish or abandon the active dungeon run before doing anything else.');
 if(String(action).startsWith('dungeon-'))return dungeonCommand(w,p,action,data,{transfer,event});
 if(['story-start','story-step','festival-donate','festival-claim'].includes(action))return contentCommand(w,p,action,data,{transfer,remember,event});
 if(['visit-house','enter-house','exit-house','buy-furniture','place-furniture','store-furniture','house-style'].includes(action))return houseCommand(w,p,action,data,transfer);
 if(['start-job','collect-job','fund-project'].includes(action))return lifeCommand(w,p,action,data,transfer);
 if(['chapter','contract'].includes(action)){const before=p.chapter?.step||0,carrying=!!p.contract;const result=chapterCommand(w,p,action,transfer);if((action==='chapter'&&before===2)||(action==='contract'&&carrying)){const n=w.npcs.find(n=>n.employer==='clinic');if(n)remember(w,n,`${p.name} brought food supplies to our clinic.`,.9,p.id,8);event(w,'community',`${p.name} delivers clinic supplies`,'Five food supplies arrived from Sunfield Farm. The clinic can serve its neighbours.',[p.id,'clinic']);}return result;}
 if(['mission-take','mission-finish'].includes(action))return missionCommand(w,p,action,data,{transfer,remember,event});
 if(action==='social')return socialCommand(w,p,data,{transfer,remember});
 if(action==='fishing')return fishingCommand(w,p,data,transfer);
 if(['switch-citizen','buy-citizen','list-citizen','cancel-citizen-listing'].includes(action))return citizenCommand(w,p,action,data,{transfer});
 if(['customize-newborn','style-citizen','barber-service','buy-wardrobe','equip-wardrobe'].includes(action))return appearanceCommand(w,p,action,data,{transfer});
 if(['list-goods','buy-listing','cancel-listing','craft','collect-craft'].includes(action))return industryCommand(w,p,action,data,transfer);
 if(action==='vote-policy')return votePolicy(w,p,data.policy);
 if(['start-town-hall','work-town-hall','found-township','fund-town-treasury','declare-candidacy','build-town-development','set-town-policy','fund-town-service','expand-town-sector'].includes(action))return civilizationCommand(w,p,action,data,{transfer,event});
 if(action==='farm')return farmingCommand(w,p,data,transfer);
 if(['plan-building','deliver-building','work-building','stop-building'].includes(action))return constructionCommand(w,p,action,data,transfer);
 if(action==='travel'){const point=WAYPOINTS.find(x=>x.id===data.destination);if(!point)throw Error('Unknown travel destination');if(p.insideHouse)throw Error('Leave the house before travelling');if(!transfer(w,userId,'treasury',25,'caravan-travel'))throw Error('Travel costs 25 coins');p.x=point.x;p.y=point.y;p.positionAt=Date.now();return p;}

 if(action==='buy-property'){const property=w.properties.find(x=>x.id===data.id);if(!property||!property.forSale||property.owner===userId)throw Error('Property unavailable');if(!transfer(w,userId,property.owner,property.valuation,'property-purchase'))throw Error('Not enough coins');property.owner=userId;property.forSale=false;if(property.tenant)remember(w,account(w,property.tenant),`${p.name} became my landlord.`,.9,userId,2);event(w,'ownership',`${p.name} purchases ${property.name}`,property.tenant?'The tenant has a new landlord. Rent now goes to the new owner.':'The new owner can enter and decorate their cottage.',[userId,property.id]);return property;}
 if(action==='set-rent'){const property=w.properties.find(x=>x.id===data.id&&x.owner===userId);if(!property)throw Error('You do not own this property');if(!Number.isSafeInteger(data.rent)||data.rent<10||data.rent>100)throw Error('Rent must be 10–100 coins');if(!property.tenant)throw Error('This is a personal residence, not a rental');const old=property.rent;property.rent=data.rent;const n=account(w,property.tenant);n.rent=data.rent;remember(w,n,`${p.name} changed my rent from ${old} to ${data.rent} coins.`,.8,userId,data.rent>old?-8:5);return property;}
 if(action==='buy-item'){const seller=w.businesses.find(b=>b.id===data.id&&b.status==='open'&&b.output);if(!seller||!Number.isSafeInteger(data.qty)||data.qty<1||data.qty>10)throw Error('Invalid purchase');if(!trade(w,p,seller,seller.output,data.qty,seller.price))throw Error('Insufficient coins or stock');return p.inventory;}
 if(action==='sell-item'){const buyer=w.businesses.find(b=>b.id===data.id&&b.status==='open');const item=String(data.item);if(!buyer||!(item in GOODS)||!Number.isSafeInteger(data.qty)||data.qty<1||data.qty>10)throw Error('Invalid sale');if(!(item in buyer.recipe)&&!(item==='tools'&&['Farm','Mine','Warehouse'].includes(buyer.type)))throw Error('This business does not buy that item');const bid=Math.max(1,Math.floor(w.prices[item]*.8));if(!trade(w,buyer,p,item,data.qty,bid))throw Error('Not enough items or buyer cannot afford the sale');return {inventory:p.inventory,received:bid*data.qty};}
 if(action==='buy'){const b=w.businesses.find(b=>b.id===data.id);if(!b||!b.forSale||b.owner===userId)throw Error('Business is not available');if(!transfer(w,userId,b.owner,b.valuation,'business-purchase'))throw Error('Not enough coins');b.owner=userId;b.forSale=false;event(w,'ownership',`${p.name} buys ${b.name}`,'A new proprietor takes the keys. The employees are watching with interest.',[userId,b.id]);return b;}
 if(action==='tip'){const n=w.npcs.find(n=>n.id===data.id);if(!n||n.id===p.citizenId)throw Error('Choose another citizen');if(!transfer(w,userId,n.id,25,'tip'))throw Error('Not enough coins');remember(w,n,`${p.name} gave me a generous 25 coin tip.`,1,userId,12);return n;}
 const b=w.businesses.find(b=>b.id===data.id);if(!b||b.owner!==userId)throw Error('You do not own this business');
 if(action==='reopen'){if(b.status==='open')throw Error('This business is already open');const debt=Object.values(b.wageDebt||{}).reduce((a,v)=>a+v,0);if(b.cash<debt+b.wage*3+100)throw Error(`Deposit enough operating cash: ${debt+b.wage*3+100} coins are required including unpaid wages`);for(const [id,amount]of Object.entries(b.wageDebt||{}))transfer(w,b.id,id,amount,'wage');transfer(w,b.id,'treasury',100,'business-reopening');b.wageDebt={};b.arrears=0;b.lossDays=0;b.status='open';event(w,'business',`${b.name} reopens`,`${p.name} settled outstanding wages and reopened the doors. Staff can now be hired.`,[p.id,b.id]);return b;}
 if(action==='settings'){
  for(const [key,min,max]of [['price',1,200],['wage',20,150],['hours',4,16],['advertising',0,100]])if(data[key]!==undefined){if(!Number.isSafeInteger(data[key])||data[key]<min||data[key]>max)throw Error(`Invalid ${key}`);}
  for(const key of ['price','wage','hours','advertising'])if(data[key]!==undefined)b[key]=data[key];
 }else if(action==='hire'){const n=w.npcs.find(n=>n.id===data.npc);if(!n||n.employer||b.employees.length>=12)throw Error('Worker unavailable');n.employer=b.id;b.employees.push(n.id);remember(w,n,`${p.name} hired me at ${b.name}.`,1,userId,10);
 }else if(action==='fire'){const n=w.npcs.find(n=>n.id===data.npc&&n.employer===b.id);if(!n)throw Error('Employee not found');b.employees=b.employees.filter(id=>id!==n.id);n.employer=null;remember(w,n,`${p.name} fired me from ${b.name}.`,1,userId,-25);event(w,'job',`${n.name} leaves ${b.name}`,'The proprietor ended their employment.',[userId,n.id]);
 }else if(action==='deposit'){if(!transfer(w,userId,b.id,250,'business-deposit'))throw Error('Not enough coins');
 }else if(action==='withdraw'){if(!transfer(w,b.id,userId,250,'business-withdrawal'))throw Error('Business has insufficient cash');
 }else if(action==='upgrade'){if(b.upgrade>=3)throw Error('Maximum upgrade');if(!transfer(w,b.id,'treasury',1000,'upgrade'))throw Error('Business needs 1,000 coins');b.upgrade++;
 }else if(action==='restock'){const item=Object.keys(b.recipe||{})[0]||'food',s=suppliers(w,item,b.id)[0];if(!s||!trade(w,b,s,item,10,s.price))throw Error(`Cannot afford restock or supplier has insufficient ${item}`);
 }else throw Error('Unknown command');
 return b;
}
export function totalCash(w){return (w.construction?.projects.reduce((s,p)=>s+p.cash,0)||0)+w.treasury.cash+civilizationCash(w)+w.npcs.reduce((s,n)=>s+n.cash,0)+w.businesses.reduce((s,b)=>s+b.cash,0)+Object.values(w.players).reduce((s,p)=>s+(p.citizenId?0:p.cash),0);}

