import test from 'node:test';
import assert from 'node:assert/strict';
import {seedWorld,totalCash,transfer,event} from '../server/simulation.mjs';
import {bindCitizens,newCitizenAccount,claimResident,grantDemoFounderCompanion} from '../server/citizenship.mjs';
import {ensurePopulation,populationDay,DAYS_PER_YEAR} from '../server/population.mjs';
import {ensureAppearance,appearanceCommand} from '../server/appearance.mjs';
import {lpcLayers} from '../client/lpc-catalog.js';

test('existing citizens migrate deterministically to layered LPC appearances',()=>{
 const w=seedWorld();bindCitizens(w);const a=structuredClone(w.npcs[0].appearance);assert.equal(a.system,'lpc');assert.ok(a.genetics.skinTone);assert.ok(a.cosmetics.hairStyle);delete w.npcs[0].appearance;ensureAppearance(w.npcs[0]);assert.deepEqual(w.npcs[0].appearance,a);
});

test('player household births receive inherited LPC choices and a short breeder customization window',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);const p=newCitizenAccount(w,'parent-owner','Parent');claimResident(w,p,'npc-20',{legacy:true});p.demoCitizenship=true;const pair=grantDemoFounderCompanion(w,p,'npc-20');w.tick=24;populationDay(w,{transfer,event});const child=w.children.find(c=>c.parents.includes(pair[0].id)&&c.parents.includes(pair[1].id));assert.ok(child);assert.equal(child.appearance.system,'lpc');assert.deepEqual(child.appearanceCustomizationOwners,[p.id]);assert.ok(child.appearanceCustomizeUntilDay>=1);
 const before=totalCash(w),opts=child.appearance.geneticOptions;const style=child.appearance.cosmetics.hairStyle==='afro'?'bob':'afro';appearanceCommand(w,p,'customize-newborn',{child:child.id,genetics:{skinTone:opts.skinTone[0],naturalHairColor:opts.naturalHairColor[0],eyeColor:opts.eyeColor[0],bodyFrame:opts.bodyFrame[0]},cosmetics:{hairStyle:style}},{transfer});assert.equal(child.appearance.cosmetics.hairStyle,style);assert.equal(totalCash(w),before);assert.throws(()=>appearanceCommand(w,p,'customize-newborn',{child:child.id,genetics:{eyeColor:'neon'}},{transfer}),/inherited appearance range/);
});

test('NPC only births are automatically styled but do not create player customization rights',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);for(let day=1;day<=DAYS_PER_YEAR*2;day++){w.tick=day*24;populationDay(w,{transfer,event});}const child=w.children[0];assert.ok(child);assert.equal(child.appearance.system,'lpc');assert.deepEqual(child.appearanceCustomizationOwners,[]);assert.equal(child.appearanceCustomizeUntilDay,null);
});

test('barber services require the physical shop, pay the business and preserve genetic identity',()=>{
 const w=seedWorld();bindCitizens(w);const p=newCitizenAccount(w,'stylist','Stylist');claimResident(w,p,'npc-20',{legacy:true});const n=w.npcs.find(n=>n.id==='npc-20'),genes=structuredClone(n.appearance.genetics),before=totalCash(w),barber=w.businesses.find(b=>b.id==='barber'),cash=barber.cash,supplies=barber.inventory.goods,start=n.appearance.cosmetics.hairStyle,next=start==='bob'?'afro':'bob';
 assert.throws(()=>appearanceCommand(w,p,'barber-service',{citizen:n.id,cosmetics:{hairStyle:next}},{transfer}),/Visit Shear & Comb/);p.x=barber.x+2;p.y=barber.y+1;const r=appearanceCommand(w,p,'barber-service',{citizen:n.id,cosmetics:{hairStyle:next}},{transfer});assert.equal(r.cost,80);assert.equal(n.appearance.cosmetics.hairStyle,next);assert.deepEqual(n.appearance.genetics,genes);assert.equal(barber.cash,cash+80);assert.equal(barber.inventory.goods,supplies-1);assert.equal(totalCash(w),before);
});

test('tailor purchases create owned wardrobe items and owned clothes can be re-equipped for free',()=>{
 const w=seedWorld();bindCitizens(w);const p=newCitizenAccount(w,'shopper','Shopper');claimResident(w,p,'npc-20',{legacy:true});const n=w.npcs.find(n=>n.id==='npc-20'),tailor=w.businesses.find(b=>b.id==='tailor'),before=totalCash(w),starter=`${n.appearance.cosmetics.torsoStyle}:${n.appearance.cosmetics.torsoColor}`,style=n.appearance.cosmetics.torsoStyle==='longsleeve'?'shortsleeve':'longsleeve',color=n.appearance.cosmetics.torsoColor,key=`${style}:${color}`;p.x=tailor.x+2;p.y=tailor.y+1;const bought=appearanceCommand(w,p,'buy-wardrobe',{citizen:n.id,category:'top',style,color},{transfer});assert.equal(bought.cost,120);assert.ok(n.appearance.wardrobe.tops.includes(key));assert.equal(`${n.appearance.cosmetics.torsoStyle}:${n.appearance.cosmetics.torsoColor}`,key);const cash=n.cash;const equipped=appearanceCommand(w,p,'equip-wardrobe',{citizen:n.id,category:'top',item:starter},{transfer});assert.equal(equipped.cost,0);assert.equal(n.cash,cash);assert.equal(`${n.appearance.cosmetics.torsoStyle}:${n.appearance.cosmetics.torsoColor}`,starter);assert.equal(totalCash(w),before);
});

test('cobbler and jeweler are distinct physical wardrobe shops',()=>{
 const w=seedWorld();bindCitizens(w);const p=newCitizenAccount(w,'fashion','Fashion');claimResident(w,p,'npc-20',{legacy:true});const n=w.npcs.find(n=>n.id==='npc-20'),cobbler=w.businesses.find(b=>b.id==='cobbler'),jeweler=w.businesses.find(b=>b.id==='jeweler');p.x=cobbler.x+2;p.y=cobbler.y+1;appearanceCommand(w,p,'buy-wardrobe',{citizen:n.id,category:'shoes',style:'basic',color:n.appearance.cosmetics.shoeColor==='gold'?'teal':'gold'},{transfer});assert.throws(()=>appearanceCommand(w,p,'buy-wardrobe',{citizen:n.id,category:'jewelry',style:'stud',color:'gold'},{transfer}),/Visit Gilded Finch/);p.x=jeweler.x+2;p.y=jeweler.y+1;appearanceCommand(w,p,'buy-wardrobe',{citizen:n.id,category:'jewelry',style:'stud',color:'gold'},{transfer});assert.equal(n.appearance.cosmetics.jewelryStyle,'stud');
});

test('a customized child keeps the same layered appearance when becoming an adult citizen',()=>{
 const w=seedWorld();bindCitizens(w);ensurePopulation(w);for(let day=1;day<=DAYS_PER_YEAR*2;day++){w.tick=day*24;populationDay(w,{transfer,event});}const child=w.children[0];assert.ok(child);child.appearance.cosmetics.hairStyle='afro';child.appearance.cosmetics.torsoColor='teal';w.tick=child.bornTick+18*DAYS_PER_YEAR*24;populationDay(w,{transfer,event});const adult=w.npcs.find(n=>n.id===child.adultId);assert.ok(adult);assert.equal(adult.appearance.cosmetics.hairStyle,'afro');assert.equal(adult.appearance.cosmetics.torsoColor,'teal');assert.equal(adult.appearance.genetics.eyeColor,child.appearance.genetics.eyeColor);
});


test('LPC render stack keeps shoes, face and optional jewelry aligned while hair remains last',()=>{
 const w=seedWorld();bindCitizens(w);const a=w.npcs[0].appearance,layers=lpcLayers(a);
 assert.deepEqual(layers.map(x=>x.kind),['body','legs','shoes','torso','head','eyes','brows','hair']);
 assert.match(layers.find(x=>x.kind==='head').url,/head\/heads\/human\/(male|female)\/walk\.png$/);
 assert.match(layers.find(x=>x.kind==='shoes').url,/feet\/shoes\/basic\/(male|thin)\/walk\.png$/);
 assert.match(layers.find(x=>x.kind==='eyes').url,/eyes\/human\/adult\/default\/walk\.png$/);
 assert.match(layers.find(x=>x.kind==='brows').url,/eyes\/eyebrows\/thin\/adult\/walk\.png$/);
 a.cosmetics.jewelryStyle='stud';a.cosmetics.jewelryColor='gold';const dressed=lpcLayers(a);assert.equal(dressed.at(-2).kind,'jewelry');assert.equal(dressed.at(-1).kind,'hair');
});

test('Style is a closet while physical shop counters contain purchases and services',async()=>{
 const w=seedWorld();bindCitizens(w);const p=newCitizenAccount(w,'ui-shopper','UI Shopper');claimResident(w,p,'npc-20',{legacy:true});const n=w.npcs.find(n=>n.id==='npc-20');
 const ui={businesses:w.businesses,npcs:w.npcs,children:[],day:1,player:{id:p.id,citizenId:n.id,x:0,y:0,insideHouse:false},citizenship:{characters:[{...n,active:true}]}};
 const {appearancePanel,appearanceShopCounter}=await import('../client/appearance.js');
 const closet=appearancePanel(ui);assert.ok(closet.includes('data-equip-wardrobe'));assert.ok(!closet.includes('data-buy-wardrobe'));assert.ok(!closet.includes('data-barber-service'));
 const tailor=ui.businesses.find(b=>b.id==='tailor');const remote=appearanceShopCounter(ui,tailor);assert.ok(!remote.includes('data-buy-wardrobe'));assert.match(remote,/physically standing at this shop/);
 ui.player.x=tailor.x+2;ui.player.y=tailor.y+1;const counter=appearanceShopCounter(ui,tailor);assert.ok(counter.includes('data-buy-wardrobe'));assert.match(counter,/Tailor counter/);
 const barber=ui.businesses.find(b=>b.id==='barber');ui.player.x=barber.x+2;ui.player.y=barber.y+1;assert.ok(appearanceShopCounter(ui,barber).includes('data-barber-service'));
});
