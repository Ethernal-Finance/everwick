import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAPTER} from '../client/chapter.js';
import {MAP,PLACES,CIVIC,entrance,buildingVisible,mapStructures} from '../client/world-map.js';
import {SHEETS,validateMapLayout,countStaticDrawables,SPRITE_RECTS,rectInSheet} from '../client/map-validation.js';
import {seedWorld} from '../server/simulation.mjs';
import {findPath} from '../client/pathfinding.js';

const pngSize=file=>{const b=readFileSync(file);return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};};
const spawnView={minX:10,maxX:42,minY:12,maxY:36};
const overviewView={minX:0,maxX:104,minY:0,maxY:82};
const wildView={minX:500,maxX:540,minY:400,maxY:440};

test('Everwick Centre layout, sprites, reachability and property links',()=>{
 const village=pngSize('client/assets/dreamland/FD_Village.png');
 const mountains=pngSize('client/assets/dreamland/FD_Mountains.png');
 assert.deepEqual(village,SHEETS.village);
 assert.deepEqual(mountains,SHEETS.mountains);
 for(const sprite of SPRITE_RECTS)assert.ok(rectInSheet(sprite.sheet,sprite.rect),sprite.id);
 const w=seedWorld();
 const result=validateMapLayout(w);
 assert.equal(result.ok,true,result.issues.join('\n'));
 assert.equal(w.businesses.filter(b=>PLACES[b.id]).length,Object.keys(PLACES).length);
 for(const b of w.businesses)if(PLACES[b.id]){assert.equal(b.x,PLACES[b.id].x);assert.equal(b.y,PLACES[b.id].y);}
 const hall=entrance(CIVIC.find(b=>b.id==='hall'));
 assert.equal(CHAPTER[0].x,hall.x);assert.equal(CHAPTER[0].y,hall.y);
 assert.ok(findPath(MAP.spawn.x,MAP.spawn.y,hall.x,hall.y).length);
});

test('viewport culling drops off-screen buildings without dropping edge-visible roofs',()=>{
 const all=countStaticDrawables(spawnView,false),centre=countStaticDrawables(spawnView,true),overview=countStaticDrawables(overviewView,true),wild=countStaticDrawables(wildView,true);
 assert.ok(centre<all,`spawn ${centre} should be below unculled ${all}`);
 assert.ok(overview<all,'town overview still excludes distant frontiers');
 assert.ok(wild<centre||wild<20,'frontier view does not pull in Everwick Centre');
 const hall=CIVIC.find(b=>b.id==='hall');
 const roofView={minX:hall.x,maxX:hall.x+4,minY:hall.y-7,maxY:hall.y-4};
 assert.equal(buildingVisible(hall,roofView),true,'roof padding keeps tall buildings on the list');
 const farView={minX:hall.x,maxX:hall.x+4,minY:hall.y-20,maxY:hall.y-12};
 assert.equal(buildingVisible(hall,farView),false);
 assert.ok(mapStructures().every(b=>b.id));
 console.log(JSON.stringify({unculled:all,spawnCulled:centre,townOverview:overview,frontierView:wild}));
});
