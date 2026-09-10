import {PARCELS} from './construction.js';
export const MAP={width:1000,height:1000,tile:16,spawn:{x:25,y:23},version:6};
export const DISTRICTS=[{name:'Everwick Centre',x:28,y:23},{name:'Bramblewood',x:10,y:15},{name:'Sunfield Downs',x:12,y:30},{name:'Copperhill Ridge',x:46,y:10},{name:'Willowbank',x:23,y:38}];
export const PLACES={sunfield:{x:7,y:27},orchard:{x:10,y:12},mine:{x:42,y:12},forge:{x:42,y:19},tavern:{x:20,y:19},restaurant:{x:27,y:19},market:{x:34,y:28},workshop:{x:43,y:28},inn:{x:21,y:28},clinic:{x:27,y:28},warehouse:{x:35,y:37},garden:{x:12,y:37},barber:{x:13,y:19},tailor:{x:13,y:28},cobbler:{x:20,y:37},jeweler:{x:27,y:37}};
export const CIVIC=[{id:'hall',name:'Town Hall',x:33,y:12},{id:'bank',name:'Everwick Bank',x:35,y:19},{id:'watch',name:'Town Watch',x:20,y:12}];
export const DUNGEON_ENTRANCE={id:'catacombs',name:'Copperhill Catacombs',x:50,y:14};
export const HOMES=Array.from({length:15},(_,i)=>({id:`row-${i}`,x:17+(i%5)*7,y:48+Math.floor(i/5)*9}));
export function isPath(x,y){if(x>=94&&x<=133&&y>=10&&y<=45)return [19,20,31,32,43,44].includes(y)||x===95||x===96||x===105||x===115||x===125;if(y===37&&x>=7&&x<=11)return true;if(x>=16&&x<=51&&y>=42&&y<=69)return [49,50,58,59,67,68].includes(y)||x===16||x===23||x===30||x===37||x===44||x===51;if(x>=56||y>=46)return x%128===25||y%128===23||(y===20&&x<95);return (y===20||y===21||y===29||y===30||y===39||y===40||x===18||x===19||x===25||x===32||x===39||x===40||(x===47&&y<30)||(y===13&&x>=9&&x<=47)||(y===28&&x>=6&&x<=20)||(y===38&&x>=10&&x<=40));}
export function biome(x,y){
 if(x>=56||y>=46){
  const a=Math.sin(x*.009)+Math.cos(y*.011)+Math.sin((x+y)*.006)*.65;
  if(x<96&&y<80)return 'town';
  if(a<-1.45)return 'water';
  if(y>720&&a>.1)return 'snow';
  if(x>650&&y<620&&a>-.4)return 'desert';
  if(a>1.25)return 'mountains';
  return Math.sin(x*.023)*Math.cos(y*.019)>.08?'forest':'farm';
 }
if((x-4)**2/36+(y-37)**2/49<1||(x>=2&&x<=3&&y>7&&y<34))return 'water';if(x>=40&&y<17)return 'mountains';if(x<17&&y<24)return 'forest';if(x<17&&y>=24)return 'farm';return 'town';}
export const COTTAGES=Array.from({length:12},(_,i)=>({id:`cottage-${i+1}`,name:`${i+1} Bramble Close`,x:58+(i%4)*8,y:18+Math.floor(i/4)*9,tenant:null,owner:'treasury',rent:0,forSale:true,valuation:i===0?900:2100+i*60,starterListing:i===0,kind:'residence'}));
export const FRONTIER_SITES=[
 {id:'bluewater',name:'Bluewater Reach',x:530,y:420,biome:'Lakeshore',focus:'trade',landmark:{name:'Silverfin Shoals',description:'Cold currents gather enormous schools of fish along the shallows.',item:'food',label:'Fish and food',bonus:1.5},starterSector:{id:'fishery',name:'Fishery',wage:34}},
 {id:'fernwood',name:'Fernwood Vale',x:400,y:600,biome:'Forest',focus:'trade',landmark:{name:'Elderwood Grove',description:'Ancient timber grows quickly in the sheltered valley.',item:'goods',label:'Timber goods',bonus:1.35},starterSector:{id:'forestry',name:'Forestry',wage:32}},
 {id:'ironcap',name:'Ironcap Basin',x:200,y:560,biome:'Mountains',focus:'industry',landmark:{name:'Ironcap Quarry',description:'Dense exposed veins make ore easier to extract and process.',item:'ore',label:'Ore',bonus:1.5},starterSector:{id:'mining',name:'Mining',wage:38}},
 {id:'saffron',name:'Saffron Expanse',x:820,y:400,biome:'Desert',focus:'trade',landmark:{name:'Sunspice Flats',description:'Rare desert crops and mineral salts support valuable trade goods.',item:'goods',label:'Trade goods',bonus:1.4},starterSector:{id:'commerce',name:'Commerce',wage:35}},
 {id:'frostmere',name:'Frostmere Shelf',x:880,y:740,biome:'Snowfield',focus:'balanced',landmark:{name:'Glacier Springs',description:'Mineral rich meltwater supports medicine, preservation, and care work.',item:'care',label:'Care goods',bonus:1.3},starterSector:{id:'services',name:'Services',wage:33}},
 {id:'sunmeadow',name:'Sunmeadow Prairie',x:720,y:680,biome:'Grassland',focus:'agriculture',landmark:{name:'Golden Loam',description:'Deep fertile soil produces exceptional harvests with less labor.',item:'food',label:'Crops and food',bonus:1.45},starterSector:{id:'agriculture',name:'Agriculture',wage:31}}
];
export const WAYPOINTS=[{id:'everwick',name:'Everwick',x:25,y:23},{id:'bramble',name:'Bramble Close',x:65,y:23},{id:'forest',name:'Fernwood Crossing',x:153,y:151},{id:'ridge',name:'Highland Road',x:409,y:279},{id:'desert',name:'Saffron Waystation',x:793,y:407},{id:'snow',name:'Frostmere Road',x:281,y:791},...FRONTIER_SITES.map(s=>({id:s.id,name:s.name,x:s.x,y:s.y}))];
export function footprint(b){if(b.id==='mine')return {x:b.x,y:b.y-3,w:5,h:3};if(b.id==='sunfield'||b.id==='garden')return {x:b.x,y:b.y-3,w:4,h:3};return {x:b.x,y:b.y-2,w:4,h:2};}
export function entrance(b){return {x:b.x+2,y:b.y+1};}
export function mapStructures(){return [...Object.entries(PLACES).map(([id,p])=>({id,kind:'business',...p})),...CIVIC.map(b=>({...b,kind:'civic'})),...HOMES.map(b=>({...b,kind:'home'})),...COTTAGES.map(b=>({...b,kind:'cottage'})),...PARCELS.map(b=>({...b,kind:'parcel'}))];}
export function buildingVisible(b,{minX,maxX,minY,maxY},padY=8){const w=b.id==='mine'?6:4;return b.x+w>=minX-2&&b.x<=maxX+2&&b.y>=minY-2&&b.y-padY<=maxY+2;}
export const TREE_CLEAR=new Set();
for(const b of mapStructures()){const f=footprint(b);for(let y=f.y-4;y<f.y+f.h+2;y++)for(let x=f.x-2;x<f.x+f.w+2;x++)TREE_CLEAR.add(`${x},${y}`);}
const solid=new Set();for(const b of mapStructures()){const f=footprint(b);for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)solid.add(`${x},${y}`);}
export function blocked(x,y){x=Math.floor(x);y=Math.floor(y);if(x<1||y<2||x>=MAP.width-1||y>=MAP.height-1)return true;if(biome(x,y)==='water'&&!isPath(x,y))return true;return solid.has(`${x},${y}`);}
export function district(x,y){const frontier=FRONTIER_SITES.find(s=>Math.hypot(s.x-x,s.y-y)<42);if(frontier)return frontier.name;if(x>=56||y>=46)return x<96&&y<80?"Bramble Close":({forest:"Fernwood Wilds",farm:"Open Downs",water:"Bluewater Basin",mountains:"Highland Ridges",desert:"Saffron Expanse",snow:"Frostmere"}[biome(x,y)]||"The Wilds");return DISTRICTS.reduce((a,b)=>Math.hypot(b.x-x,b.y-y)<Math.hypot(a.x-x,a.y-y)?b:a).name;}
