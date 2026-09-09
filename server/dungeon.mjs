import {playerControls} from './citizenship.mjs';
import {DUNGEON_ENTRANCE} from '../client/world-map.js';

const DIRS={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]};
const LOOT=['food','ore','goods'];

function hashSeed(value){let h=2166136261>>>0;for(const ch of String(value)){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}return h||1;}
function randomFactory(seed){let x=hashSeed(seed);return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function shuffle(list,rng){for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
const key=(x,y)=>`${x},${y}`;
const neighbors=(grid,x,y)=>[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(p=>grid[p.y]?.[p.x]==='.');

function distances(grid,start){const out=new Map([[key(start.x,start.y),0]]),queue=[start];for(let i=0;i<queue.length;i++){const p=queue[i],d=out.get(key(p.x,p.y));for(const n of neighbors(grid,p.x,p.y)){const k=key(n.x,n.y);if(out.has(k))continue;out.set(k,d+1);queue.push(n);}}return out;}
function reveal(run,x,y,radius=2){run.discovered??=[];const seen=new Set(run.discovered);for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)if(xx>=0&&yy>=0&&xx<run.width&&yy<run.height&&Math.hypot(xx-x,yy-y)<=radius+.35)seen.add(key(xx,yy));run.discovered=[...seen];}
function log(run,text){run.log??=[];run.log.unshift(text);run.log=run.log.slice(0,12);}
function runRandom(run,salt=''){run.randomCounter=(run.randomCounter||0)+1;return randomFactory(`${run.seed}:${salt}:${run.randomCounter}`)();}

export function generateDungeon(seed,{tier=1,size=31}={}){
 size=Math.max(21,Math.min(41,size|1));if(size%2===0)size++;
 const rng=randomFactory(seed),grid=Array.from({length:size},()=>Array(size).fill('#')),stack=[{x:1,y:1}];grid[1][1]='.';
 while(stack.length){const cur=stack.at(-1),choices=shuffle([[0,-2],[2,0],[0,2],[-2,0]],rng).filter(([dx,dy])=>{const x=cur.x+dx,y=cur.y+dy;return x>0&&y>0&&x<size-1&&y<size-1&&grid[y][x]==='#';});if(!choices.length){stack.pop();continue;}const [dx,dy]=choices[0],nx=cur.x+dx,ny=cur.y+dy;grid[cur.y+dy/2][cur.x+dx/2]='.';grid[ny][nx]='.';stack.push({x:nx,y:ny});}
 const start={x:1,y:1},dist=distances(grid,start),floors=[];for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(grid[y][x]==='.')floors.push({x,y,d:dist.get(key(x,y))||0});
 const dead=floors.filter(p=>neighbors(grid,p.x,p.y).length===1).sort((a,b)=>b.d-a.d),exit={x:dead[0]?.x||size-2,y:dead[0]?.y||size-2};
 const reserved=new Set([key(start.x,start.y),key(exit.x,exit.y)]),seals=[];for(const p of dead.slice(1)){if(seals.length>=3)break;if(seals.some(s=>Math.hypot(s.x-p.x,s.y-p.y)<6))continue;seals.push({x:p.x,y:p.y,taken:false});reserved.add(key(p.x,p.y));}
 while(seals.length<3){const p=floors[Math.floor(rng()*floors.length)];if(!reserved.has(key(p.x,p.y))&&p.d>8){seals.push({x:p.x,y:p.y,taken:false});reserved.add(key(p.x,p.y));}}
 const candidates=shuffle(floors.filter(p=>p.d>5&&!reserved.has(key(p.x,p.y))),rng),enemies=[],traps=[],caches=[];let cursor=0;
 for(let i=0;i<4+tier;i++){const p=candidates[cursor++];if(!p)break;enemies.push({id:`warden-${i+1}`,name:['Ash Warden','Stone Shade','Vault Sentinel','Hollow Guard'][i%4],x:p.x,y:p.y,hp:18+tier*6,maxHp:18+tier*6,attack:5+tier*2,alive:true});reserved.add(key(p.x,p.y));}
 for(let i=0;i<6+tier*2;i++){let p=candidates[cursor++];while(p&&reserved.has(key(p.x,p.y)))p=candidates[cursor++];if(!p)break;traps.push({x:p.x,y:p.y,damage:8+Math.floor(rng()*(8+tier*2)),triggered:false});reserved.add(key(p.x,p.y));}
 for(let i=0;i<3;i++){let p=candidates[cursor++];while(p&&reserved.has(key(p.x,p.y)))p=candidates[cursor++];if(!p)break;caches.push({x:p.x,y:p.y,opened:false,item:LOOT[Math.floor(rng()*LOOT.length)],qty:1+Math.floor(rng()*(2+tier))});reserved.add(key(p.x,p.y));}
 const run={active:true,id:`dungeon-${hashSeed(seed).toString(16)}`,seed:String(seed),tier,width:size,height:size,map:grid.map(r=>r.join('')),position:{...start},start,exit,seals,enemies,traps,caches,health:100,maxHealth:100,steps:0,kills:0,randomCounter:0,discovered:[],log:[],startedAt:Date.now()};reveal(run,start.x,start.y,3);log(run,'The stone door closes behind you. Find the three rune seals, then reach the exit gate.');return run;
}

function activeCitizen(w,p){return w.npcs.find(n=>n.id===p.citizenId);}
function requireDirectControl(w,p){const n=activeCitizen(w,p);if(!n||!playerControls(w,n))throw Error('Take direct control of your citizen before entering the dungeon. NPC routines cannot run dungeons.');return n;}
function nearEntrance(p){return !p.insideHouse&&Math.hypot(p.x-DUNGEON_ENTRANCE.x,p.y-DUNGEON_ENTRANCE.y)<=4.5;}
function finishRun(w,p,status,{transfer,event}={}){
 const run=p.dungeonRun;if(!run)return null;p.dungeonStats??={runs:0,completions:0,deaths:0,abandons:0,bestSteps:null};const stats=p.dungeonStats;
 if(status==='success'){
  stats.completions++;stats.bestSteps=stats.bestSteps==null?run.steps:Math.min(stats.bestSteps,run.steps);const bounty=150+run.tier*75,coinReward=Math.min(bounty,w.treasury.cash),paid=coinReward>0&&(transfer?.(w,'treasury',p.id,coinReward,'dungeon-bounty')||false);const reward={coins:paid?coinReward:0,ore:2+run.tier,goods:1+Math.floor(run.tier/2)};p.inventory.ore=(p.inventory.ore||0)+reward.ore;p.inventory.goods=(p.inventory.goods||0)+reward.goods;w.produced.ore=(w.produced.ore||0)+reward.ore;w.produced.goods=(w.produced.goods||0)+reward.goods;p.skills??={};p.skills.adventure=(p.skills.adventure||0)+1;p.lastDungeonResult={status:'success',tick:w.tick,steps:run.steps,tier:run.tier,reward};event?.(w,'dungeon',`${p.name} clears the Copperhill Catacombs`,`Three rune seals opened the final gate. The expedition returned with ${reward.ore} ore, ${reward.goods} goods${reward.coins?` and ${reward.coins} coins`:''}.`,[p.id]);
 }else if(status==='death'){
  stats.deaths++;const coinLoss=Math.min(500,Math.floor((p.cash||0)*.12));if(coinLoss>0)transfer?.(w,p.id,'treasury',coinLoss,'dungeon-recovery');const items=Object.keys(p.inventory||{}).filter(k=>(p.inventory[k]||0)>0);let lostItem=null;if(items.length){lostItem=items[hashSeed(`${run.seed}:${run.steps}`)%items.length];p.inventory[lostItem]--;w.consumed[lostItem]=(w.consumed[lostItem]||0)+1;}p.health=Math.max(35,(p.health||80)-12);p.needs??={};p.needs.energy=Math.min(p.needs.energy??50,20);p.lastDungeonResult={status:'death',tick:w.tick,steps:run.steps,tier:run.tier,lostCoins:coinLoss,lostItem};event?.(w,'dungeon',`${p.name} is carried out of the catacombs`,`The expedition failed after ${run.steps} steps. Recovery cost ${coinLoss} coins${lostItem?` and one ${lostItem}`:''}.`,[p.id]);
 }else{stats.abandons++;p.lastDungeonResult={status:'abandoned',tick:w.tick,steps:run.steps,tier:run.tier};}
 p.dungeonRun=null;p.x=DUNGEON_ENTRANCE.x;p.y=DUNGEON_ENTRANCE.y+2;p.positionAt=Date.now();const n=activeCitizen(w,p);if(n){n.activity=status==='death'?'recovering from the catacombs':'outside the catacombs';n.walking=false;}return p.lastDungeonResult;
}

function enter(w,p,helpers){if(p.dungeonRun?.active)throw Error('You are already inside a dungeon.');if(p.insideHouse)throw Error('Leave the house first.');if(!nearEntrance(p))throw Error('Travel to the Copperhill Catacombs entrance before entering.');requireDirectControl(w,p);p.dungeonStats??={runs:0,completions:0,deaths:0,abandons:0,bestSteps:null};const tier=Math.min(5,1+Math.floor((p.dungeonStats.completions||0)/3)),seed=`${p.id}:${Date.now()}:${p.dungeonStats.runs}:${w.tick}`;p.dungeonStats.runs++;p.dungeonRun=generateDungeon(seed,{tier,size:31+tier*2});p.controlAt=p.presenceAt=Date.now();const n=activeCitizen(w,p);if(n){n.activity='exploring the Copperhill Catacombs';n.walking=false;n.path=[];n.target=null;}helpers.event?.(w,'dungeon',`${p.name} enters the Copperhill Catacombs`,'The door seals behind a player controlled expedition. No autonomous citizen can complete the run.',[p.id]);return p.dungeonRun;}

function applyTile(w,p,run,helpers){
 const {x,y}=run.position,seal=run.seals.find(s=>!s.taken&&s.x===x&&s.y===y);if(seal){seal.taken=true;log(run,`Rune seal ${run.seals.filter(s=>s.taken).length} of 3 recovered.`);}
 const trap=run.traps.find(t=>!t.triggered&&t.x===x&&t.y===y);if(trap){trap.triggered=true;run.health=Math.max(0,run.health-trap.damage);log(run,`A hidden trap hits for ${trap.damage} health.`);if(run.health<=0)return finishRun(w,p,'death',helpers);}
 const cache=run.caches.find(c=>!c.opened&&c.x===x&&c.y===y);if(cache){cache.opened=true;p.inventory[cache.item]=(p.inventory[cache.item]||0)+cache.qty;w.produced[cache.item]=(w.produced[cache.item]||0)+cache.qty;log(run,`Supply cache found: ${cache.qty} ${cache.item}.`);}
 if(x===run.exit.x&&y===run.exit.y){if(run.seals.every(s=>s.taken))return finishRun(w,p,'success',helpers);log(run,`The exit gate is locked. ${run.seals.filter(s=>!s.taken).length} rune seal${run.seals.filter(s=>!s.taken).length===1?'':'s'} remain.`);}
 return run;
}
function move(w,p,data,helpers){const run=p.dungeonRun;if(!run?.active)throw Error('Enter a dungeon first.');requireDirectControl(w,p);if(run.encounter)throw Error('Deal with the dungeon guardian before moving.');const delta=DIRS[String(data.dir||'')];if(!delta)throw Error('Choose a valid dungeon direction.');const x=run.position.x+delta[0],y=run.position.y+delta[1];if(run.map[y]?.[x]!=='#'&&run.map[y]?.[x]){const enemy=run.enemies.find(e=>e.alive&&e.x===x&&e.y===y);if(enemy){run.encounter={enemyId:enemy.id,name:enemy.name,hp:enemy.hp,maxHp:enemy.maxHp,attack:enemy.attack,x,y};log(run,`${enemy.name} blocks the passage.`);return run;}run.position={x,y};run.steps++;reveal(run,x,y,2);return applyTile(w,p,run,helpers);}log(run,'Cold stone blocks that route.');return run;}
function fight(w,p,data,helpers){const run=p.dungeonRun;if(!run?.active||!run.encounter)throw Error('There is no dungeon encounter to resolve.');requireDirectControl(w,p);const e=run.enemies.find(e=>e.id===run.encounter.enemyId&&e.alive);if(!e){run.encounter=null;return run;}const action=String(data.kind||'strike');let guarded=false;
 if(action==='ration'){if((p.inventory.food||0)<1)throw Error('You have no food ration to use.');p.inventory.food--;w.consumed.food=(w.consumed.food||0)+1;run.health=Math.min(run.maxHealth,run.health+28);guarded=true;log(run,'You use one food ration and recover 28 health.');}
 else if(action==='guard'){guarded=true;log(run,'You brace for the guardian attack.');}
 else if(action==='flee'){if(runRandom(run,'flee')<.58){run.encounter=null;log(run,'You break away from the guardian.');return run;}log(run,'The escape route closes before you can get away.');}
 else if(action==='strike'){const damage=7+Math.floor(runRandom(run,'strike')*(8+run.tier*2));e.hp=Math.max(0,e.hp-damage);run.encounter.hp=e.hp;log(run,`You strike ${e.name} for ${damage}.`);if(e.hp<=0){e.alive=false;run.kills++;run.encounter=null;run.position={x:e.x,y:e.y};run.steps++;reveal(run,e.x,e.y,2);if(runRandom(run,'enemy-loot')<.35){p.inventory.goods=(p.inventory.goods||0)+1;w.produced.goods=(w.produced.goods||0)+1;log(run,'The guardian leaves behind one salvageable good.');}log(run,`${e.name} is defeated.`);return applyTile(w,p,run,helpers);}}
 else throw Error('Unknown dungeon combat action.');
 const hit=Math.max(1,e.attack+Math.floor(runRandom(run,'enemy')*7)-(guarded?Math.ceil(e.attack/2):0));run.health=Math.max(0,run.health-hit);log(run,`${e.name} hits you for ${hit}.`);if(run.health<=0)return finishRun(w,p,'death',helpers);run.encounter.hp=e.hp;return run;}

export function dungeonCommand(w,p,action,data={},helpers={}){
 if(action==='dungeon-enter')return enter(w,p,helpers);
 p.controlAt=p.presenceAt=Date.now();
 if(action==='dungeon-move')return move(w,p,data,helpers);
 if(action==='dungeon-fight')return fight(w,p,data,helpers);
 if(action==='dungeon-abandon'){if(!p.dungeonRun?.active)throw Error('There is no active dungeon run.');requireDirectControl(w,p);return finishRun(w,p,'abandoned',helpers);}
 throw Error('Unknown dungeon command.');
}

export function expireDungeonRuns(w,now=Date.now()){
 for(const p of Object.values(w.players||{})){if(!p.dungeonRun?.active)continue;if(now-(p.presenceAt||0)<=20000)continue;finishRun(w,p,'abandoned',{});}
}
