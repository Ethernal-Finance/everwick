import {SKIN_TONES,EYE_COLORS,NATURAL_HAIR_COLORS,HAIR_COLORS,BODY_FRAMES,HAIR_STYLES,TORSO_STYLES,LEG_STYLES,SHOE_STYLES,JEWELRY_STYLES,CLOTHING_COLORS,BARBER_PRICES,WARDROBE_PRICES,STYLE_PRICES,APPEARANCE_SHOP_IDS} from '../client/lpc-catalog.js';
import {PLACES} from '../client/world-map.js';

const pick=(list,seed,offset=0)=>list[Math.abs((seed+offset*2654435761)>>>0)%list.length];
function hash(value){let h=2166136261;for(const ch of String(value))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h;}
const unique=a=>[...new Set(a.filter(Boolean))];
const styleIds=list=>list.map(x=>x.id);
const itemKey=(style,color)=>style==='none'?'none':`${style}:${color}`;

export const APPEARANCE_SHOPS=[
 {id:'barber',name:'Shear & Comb',type:'Barber',serviceKind:'barber',x:PLACES.barber.x,y:PLACES.barber.y,price:80,wage:42,ownerNpc:'npc-21'},
 {id:'tailor',name:'Needle & Thread',type:'Tailor',serviceKind:'tailor',x:PLACES.tailor.x,y:PLACES.tailor.y,price:120,wage:44,ownerNpc:'npc-22'},
 {id:'cobbler',name:'Last & Sole',type:'Cobbler',serviceKind:'cobbler',x:PLACES.cobbler.x,y:PLACES.cobbler.y,price:75,wage:41,ownerNpc:'npc-23'},
 {id:'jeweler',name:'Gilded Finch',type:'Jeweler',serviceKind:'jeweler',x:PLACES.jeweler.x,y:PLACES.jeweler.y,price:160,wage:46,ownerNpc:'npc-24'}
];

export function ensureAppearanceShops(w){
 w.businesses??=[];
 for(const spec of APPEARANCE_SHOPS){
  let shop=w.businesses.find(b=>b.id===spec.id),created=false;
  const founder=w.npcs?.find(n=>n.id===spec.ownerNpc);
  const owner=founder?.ownerId||spec.ownerNpc;
  if(!shop){
   created=true;shop={id:spec.id,name:spec.name,type:spec.type,serviceKind:spec.serviceKind,output:null,recipe:{goods:1},rate:0,price:spec.price,wage:spec.wage,x:spec.x,y:spec.y,cash:5000,inventory:{goods:24},owner,employees:[],forSale:!w.players?.[owner],valuation:3000+spec.price*4,revenue:0,expenses:0,lastProfit:0,arrears:0,status:'open',hours:12,advertising:0,upgrade:0};w.businesses.push(shop);
  }
  shop.serviceKind??=spec.serviceKind;shop.output=null;shop.recipe??={goods:1};shop.inventory??={};shop.inventory.goods??=24;shop.x??=spec.x;shop.y??=spec.y;shop.wage??=spec.wage;shop.price??=spec.price;
  if(founder?.ownerId&&shop.owner===spec.ownerNpc){shop.owner=founder.ownerId;shop.forSale=false;}
  if(created&&founder&&!founder.ownerId&&!founder.controllerId){
   const old=w.businesses.find(b=>b.id===founder.employer);if(old)old.employees=(old.employees||[]).filter(id=>id!==founder.id);
   founder.employer=shop.id;founder.occupation=`${shop.type} worker`;if(!shop.employees.includes(founder.id))shop.employees.push(founder.id);
  }
 }
 return w.businesses.filter(b=>b.serviceKind);
}

function starterWardrobe(c){return {tops:[itemKey(c.torsoStyle,c.torsoColor)],legs:[itemKey(c.legStyle,c.legColor)],shoes:[itemKey(c.shoeStyle||'basic',c.shoeColor||'umber')],jewelry:['none']};}
export function defaultAppearance(id,legacyGenes=null){
 const seed=hash(id)+(legacyGenes?.appearance?.reduce?.((a,v)=>a+Number(v||0),0)||0);
 const naturalHairColor=pick(NATURAL_HAIR_COLORS,seed,2),bodyFrame=pick(BODY_FRAMES,seed,3);
 const cosmetics={hairStyle:pick(styleIds(HAIR_STYLES),seed,5),hairColor:naturalHairColor,torsoStyle:pick(styleIds(TORSO_STYLES),seed,6),torsoColor:pick(CLOTHING_COLORS,seed,7),legStyle:pick(styleIds(LEG_STYLES),seed,8),legColor:pick(CLOTHING_COLORS,seed,9),shoeStyle:'basic',shoeColor:pick(CLOTHING_COLORS,seed,10),jewelryStyle:'none',jewelryColor:'gold'};
 return {system:'lpc',version:2,genetics:{skinTone:pick(SKIN_TONES,seed,1),naturalHairColor,eyeColor:pick(EYE_COLORS,seed,4),bodyFrame},cosmetics,wardrobe:starterWardrobe(cosmetics),createdFrom:'legacy-migration'};
}
function ensureWardrobe(a){
 const c=a.cosmetics;a.wardrobe??={};a.wardrobe.tops??=[];a.wardrobe.legs??=[];a.wardrobe.shoes??=[];a.wardrobe.jewelry??=[];
 for(const [bucket,key] of [['tops',itemKey(c.torsoStyle,c.torsoColor)],['legs',itemKey(c.legStyle,c.legColor)],['shoes',itemKey(c.shoeStyle||'basic',c.shoeColor||'umber')],['jewelry',itemKey(c.jewelryStyle||'none',c.jewelryColor||'gold')]])if(!a.wardrobe[bucket].includes(key))a.wardrobe[bucket].push(key);
 if(!a.wardrobe.jewelry.includes('none'))a.wardrobe.jewelry.unshift('none');return a.wardrobe;
}
export function ensureAppearance(person){
 const base=defaultAppearance(person.id,person.genes);person.appearance??=base;person.appearance.system='lpc';person.appearance.version=2;person.appearance.genetics??=base.genetics;person.appearance.cosmetics??=base.cosmetics;
 for(const [k,v] of Object.entries(base.cosmetics))if(person.appearance.cosmetics[k]===undefined)person.appearance.cosmetics[k]=v;
 ensureWardrobe(person.appearance);return person.appearance;
}

function skinRange(a,b){const ai=Math.max(0,SKIN_TONES.indexOf(a)),bi=Math.max(0,SKIN_TONES.indexOf(b)),lo=Math.min(ai,bi),hi=Math.max(ai,bi);return SKIN_TONES.slice(Math.max(0,lo-1),Math.min(SKIN_TONES.length,hi+2));}
export function inheritedAppearance(a,b,id){const aa=ensureAppearance(a),bb=ensureAppearance(b),seed=hash(id),ga=aa.genetics,gb=bb.genetics;
 const genetics={skinTone:pick(unique([ga.skinTone,gb.skinTone]),seed,1),naturalHairColor:pick(unique([ga.naturalHairColor,gb.naturalHairColor]),seed,2),eyeColor:pick(unique([ga.eyeColor,gb.eyeColor]),seed,3),bodyFrame:pick(unique([ga.bodyFrame,gb.bodyFrame]),seed,4)};
 const cosmetics={hairStyle:pick(unique([aa.cosmetics.hairStyle,bb.cosmetics.hairStyle,...styleIds(HAIR_STYLES)]),seed,5),hairColor:genetics.naturalHairColor,torsoStyle:pick(styleIds(TORSO_STYLES),seed,6),torsoColor:pick(CLOTHING_COLORS,seed,8),legStyle:pick(styleIds(LEG_STYLES),seed,7),legColor:pick(CLOTHING_COLORS,seed,9),shoeStyle:'basic',shoeColor:pick(CLOTHING_COLORS,seed,10),jewelryStyle:'none',jewelryColor:'gold'};
 return {system:'lpc',version:2,genetics,geneticOptions:{skinTone:skinRange(ga.skinTone,gb.skinTone),naturalHairColor:unique([ga.naturalHairColor,gb.naturalHairColor]),eyeColor:unique([ga.eyeColor,gb.eyeColor]),bodyFrame:BODY_FRAMES.slice()},cosmetics,wardrobe:starterWardrobe(cosmetics),createdFrom:'inherited'};
}

export function newbornCustomizationOwners(a,b){return unique([a.ownerId,b.ownerId]);}
export function newbornCustomizationWindow(day){return day+3;}
function validateGenetic(appearance,key,value){const options=appearance.geneticOptions?.[key]||[];if(!options.includes(value))throw Error(`${key} must stay within this child's inherited appearance range`);return value;}
function validateCosmetic(key,value){const lists={hairStyle:styleIds(HAIR_STYLES),hairColor:HAIR_COLORS,torsoStyle:styleIds(TORSO_STYLES),torsoColor:CLOTHING_COLORS,legStyle:styleIds(LEG_STYLES),legColor:CLOTHING_COLORS,shoeStyle:styleIds(SHOE_STYLES),shoeColor:CLOTHING_COLORS,jewelryStyle:styleIds(JEWELRY_STYLES),jewelryColor:CLOTHING_COLORS};if(!lists[key]?.includes(value))throw Error(`Unknown ${key} option`);return value;}
function activeCitizen(w,p,id){const citizen=w.npcs.find(n=>n.id===String(id||'')&&n.age>=18);if(!citizen||citizen.ownerId!==p.id)throw Error('You can only shop for an adult citizen you own');if(citizen.id!==p.citizenId)throw Error('Take control of this citizen before changing their appearance');if(w.citizenMarket?.listings?.some(l=>l.status==='active'&&l.citizenId===citizen.id))throw Error('Cancel the marketplace listing before changing this citizen');ensureAppearance(citizen);return citizen;}
function shopFor(w,id,p){ensureAppearanceShops(w);const shop=w.businesses.find(b=>b.id===id&&b.status==='open');if(!shop)throw Error('That appearance shop is currently closed');if(p.insideHouse||Math.hypot(p.x-(shop.x+2),p.y-(shop.y+1))>5)throw Error(`Visit ${shop.name} in person for this change`);return shop;}
function chargeShop(w,p,shop,cost,reason,{transfer}){if(cost<=0)return;if((shop.inventory.goods||0)<1)throw Error(`${shop.name} is out of shop supplies. Sell or restock goods there first.`);if(!transfer(w,p.id,shop.id,cost,reason))throw Error(`You need ${cost} coins for this purchase`);shop.inventory.goods--;w.consumed.goods=(w.consumed.goods||0)+1;shop.revenue=(shop.revenue||0)+cost;shop.soldToday=(shop.soldToday||0)+1;}
function wardrobeBucket(category){return {top:'tops',legs:'legs',shoes:'shoes',jewelry:'jewelry'}[category];}
function wardrobeSelection(category,style,color){if(category==='top')return {torsoStyle:style,torsoColor:color};if(category==='legs')return {legStyle:style,legColor:color};if(category==='shoes')return {shoeStyle:style,shoeColor:color};if(category==='jewelry')return {jewelryStyle:style,jewelryColor:color};throw Error('Unknown wardrobe category');}
function validateWardrobeItem(category,style,color){if(category==='top')return [validateCosmetic('torsoStyle',style),validateCosmetic('torsoColor',color)];if(category==='legs')return [validateCosmetic('legStyle',style),validateCosmetic('legColor',color)];if(category==='shoes')return [validateCosmetic('shoeStyle',style),validateCosmetic('shoeColor',color)];if(category==='jewelry'){validateCosmetic('jewelryStyle',style);if(style==='none')return ['none','gold'];return [style,validateCosmetic('jewelryColor',color)];}throw Error('Unknown wardrobe category');}

export function appearanceCommand(w,p,action,data,{transfer}){
 if(action==='customize-newborn'){
  const child=(w.children||[]).find(c=>c.id===String(data.child||'')&&!c.grown);if(!child)throw Error('This dependent child is unavailable');ensureAppearance(child);const day=Math.floor(w.tick/24),owners=child.appearanceCustomizationOwners||[];if(!owners.includes(p.id))throw Error('Only a player who owned a parent when this child was born may customize the inherited appearance');if(day>Number(child.appearanceCustomizeUntilDay??-1))throw Error('The newborn customization window has closed');
  const genetic=data.genetics&&typeof data.genetics==='object'?data.genetics:{},cosmetic=data.cosmetics&&typeof data.cosmetics==='object'?data.cosmetics:{};
  for(const key of ['skinTone','naturalHairColor','eyeColor','bodyFrame'])if(genetic[key]!==undefined)child.appearance.genetics[key]=validateGenetic(child.appearance,key,String(genetic[key]));
  for(const key of ['hairStyle','hairColor','torsoStyle','torsoColor','legStyle','legColor','shoeStyle','shoeColor'])if(cosmetic[key]!==undefined)child.appearance.cosmetics[key]=validateCosmetic(key,String(cosmetic[key]));
  if(!HAIR_COLORS.includes(child.appearance.cosmetics.hairColor))child.appearance.cosmetics.hairColor=child.appearance.genetics.naturalHairColor;child.appearance.cosmetics.jewelryStyle='none';child.appearance.cosmetics.jewelryColor='gold';child.appearance.wardrobe=starterWardrobe(child.appearance.cosmetics);
  child.appearanceCustomizedBy=p.id;child.appearanceCustomizedAtDay=day;return {child:child.id,appearance:child.appearance,customizeUntilDay:child.appearanceCustomizeUntilDay};
 }
 if(action==='barber-service'){
  const citizen=activeCitizen(w,p,data.citizen),shop=shopFor(w,APPEARANCE_SHOP_IDS.barber,p),next=data.cosmetics&&typeof data.cosmetics==='object'?data.cosmetics:{},sanitized={};let cost=0;
  for(const key of ['hairStyle','hairColor'])if(next[key]!==undefined){sanitized[key]=validateCosmetic(key,String(next[key]));if(sanitized[key]!==citizen.appearance.cosmetics[key])cost+=BARBER_PRICES[key];}
  chargeShop(w,p,shop,cost,'appearance:barber',{transfer});Object.assign(citizen.appearance.cosmetics,sanitized);citizen.appearance.lastStyledTick=w.tick;citizen.appearance.lastStyleCost=cost;citizen.appearance.lastStyleShop=shop.id;return {citizen:citizen.id,cost,shop:shop.id,appearance:citizen.appearance};
 }
 if(action==='buy-wardrobe'){
  const citizen=activeCitizen(w,p,data.citizen),category=String(data.category||''),bucket=wardrobeBucket(category);if(!bucket)throw Error('Unknown wardrobe category');let [style,color]=validateWardrobeItem(category,String(data.style||''),String(data.color||'gold'));if(category==='jewelry'&&style==='none')throw Error('Removing jewelry is free. Use your wardrobe instead.');
  const key=itemKey(style,color),wardrobe=ensureWardrobe(citizen.appearance);if(wardrobe[bucket].includes(key))throw Error('This citizen already owns that item');const shop=shopFor(w,APPEARANCE_SHOP_IDS[category],p),cost=WARDROBE_PRICES[category];chargeShop(w,p,shop,cost,`appearance:${category}`,{transfer});wardrobe[bucket].push(key);Object.assign(citizen.appearance.cosmetics,wardrobeSelection(category,style,color));citizen.appearance.lastStyledTick=w.tick;citizen.appearance.lastStyleCost=cost;citizen.appearance.lastStyleShop=shop.id;return {citizen:citizen.id,cost,shop:shop.id,item:key,appearance:citizen.appearance};
 }
 if(action==='equip-wardrobe'){
  const citizen=activeCitizen(w,p,data.citizen),category=String(data.category||''),bucket=wardrobeBucket(category);if(!bucket)throw Error('Unknown wardrobe category');const key=String(data.item||''),wardrobe=ensureWardrobe(citizen.appearance);if(!wardrobe[bucket].includes(key))throw Error('This citizen does not own that wardrobe item');let style='none',color='gold';if(key!=='none'){const i=key.indexOf(':');if(i<1)throw Error('Invalid wardrobe item');style=key.slice(0,i);color=key.slice(i+1);}validateWardrobeItem(category,style,color);Object.assign(citizen.appearance.cosmetics,wardrobeSelection(category,style,color));citizen.appearance.lastStyledTick=w.tick;citizen.appearance.lastStyleCost=0;return {citizen:citizen.id,cost:0,item:key,appearance:citizen.appearance};
 }
 if(action==='style-citizen')throw Error('Cosmetics are now handled by physical appearance shops. Visit the barber, tailor, cobbler, or jeweler.');
 throw Error('Unknown appearance command');
}

export function appearanceSummary(person){const a=ensureAppearance(person);return {system:a.system,version:a.version,genetics:{...a.genetics},cosmetics:{...a.cosmetics},wardrobe:{tops:[...a.wardrobe.tops],legs:[...a.wardrobe.legs],shoes:[...a.wardrobe.shoes],jewelry:[...a.wardrobe.jewelry]}};}
export function appearanceCatalog(){return {skinTones:SKIN_TONES,eyeColors:EYE_COLORS,naturalHairColors:NATURAL_HAIR_COLORS,hairColors:HAIR_COLORS,bodyFrames:BODY_FRAMES,hairStyles:HAIR_STYLES,torsoStyles:TORSO_STYLES,legStyles:LEG_STYLES,shoeStyles:SHOE_STYLES,jewelryStyles:JEWELRY_STYLES,clothingColors:CLOTHING_COLORS,barberPrices:BARBER_PRICES,wardrobePrices:WARDROBE_PRICES,stylePrices:STYLE_PRICES,shops:APPEARANCE_SHOPS.map(({id,name,type,serviceKind,x,y})=>({id,name,type,serviceKind,x,y}))};}
