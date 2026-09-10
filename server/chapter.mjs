import {CHAPTER} from '../client/chapter.js';
import {entrance} from '../client/world-map.js';
const near=(p,x,y)=>{if(p.insideHouse||Math.hypot(p.x-x,p.y-y)>2.5)throw Error('Walk to the marked destination first');};
function collect(w,p,transfer){const farm=w.businesses.find(b=>b.id==='sunfield'),spot=entrance(farm);near(p,spot.x,spot.y);if(farm.inventory.food<5)throw Error('The farm needs to grow more food. Try again after production.');if(!transfer(w,'treasury',farm.id,5*farm.price,'town-supply-contract'))throw Error('The town cannot fund a shipment yet');farm.inventory.food-=5;farm.revenue+=5*farm.price;farm.soldToday=(farm.soldToday||0)+5;p.contract={food:5};}
function deliver(w,p,reward,transfer){const clinic=w.businesses.find(b=>b.id==='clinic'),spot=entrance(clinic);near(p,spot.x,spot.y);if(!p.contract)throw Error('Collect a shipment first');if(!transfer(w,'treasury',p.id,reward,'delivery-reward'))throw Error('Town payroll is short. Your shipment is safe; retry later.');clinic.inventory.food=(clinic.inventory.food||0)+p.contract.food;p.contract=null;p.lastDelivery=w.tick;}
export function chapterCommand(w,p,action,transfer){p.chapter??={step:0,log:[]};const q=p.chapter;
 if(action==='contract'){if(q.step<3)throw Error('Finish the first delivery in your chapter first');if(p.contract)deliver(w,p,120,transfer);else{if(w.tick-(p.lastDelivery??-6)<6)throw Error('The next delivery opens six town hours after your last one');collect(w,p,transfer);}return p;}
 if(q.step>=CHAPTER.length)throw Error('This chapter is complete');const s=CHAPTER[q.step];
 if(q.step===0)near(p,s.x,s.y);
 if(q.step===1){if(p.contract)throw Error('You already hold a shipment');collect(w,p,transfer);}
 if(q.step===2)deliver(w,p,1000,transfer);
 const homes=w.properties.filter(h=>h.owner===p.id);
 if(q.step===3){if(!homes.length)throw Error('Buy a home first');if(!transfer(w,'treasury',p.id,500,'chapter-home'))throw Error('Town payroll is short; retry later');}
 if(q.step===4){if(!homes.some(h=>h.interior.furniture.some(i=>i.x!==null)))throw Error('Place furniture in your home first');if(!transfer(w,'treasury',p.id,400,'chapter-decoration'))throw Error('Town payroll is short; retry later');}
 if(q.step===5){if(!w.businesses.some(b=>b.owner===p.id))throw Error('Buy a business first');if(!transfer(w,'treasury',p.id,600,'chapter-business'))throw Error('Town payroll is short; retry later');}
 q.log.unshift(s.title+' — complete');q.step++;return p;
}
