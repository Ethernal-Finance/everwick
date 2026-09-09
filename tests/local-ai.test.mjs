import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {database,readWorld,mutate} from '../server/db.mjs';
import {addPlayer} from '../server/simulation.mjs';
import {converse,aiStatus,CompatibleProvider} from '../server/ai.mjs';

test('local dialogue sends citizen context, records usage and memory, and honestly falls back on failure',async()=>{
 const before={...process.env};let failure=false,received;
 const server=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/v1/models')return res.end(JSON.stringify({data:[{id:'test-local'}]}));let raw='';for await(const c of req)raw+=c;received=JSON.parse(raw);if(failure){res.statusCode=503;return res.end('{}');}res.end(JSON.stringify({choices:[{message:{content:'I remember your blue fishing boat.'}}],usage:{prompt_tokens:20,completion_tokens:9}}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=database(':memory:');
 try{
  Object.assign(process.env,{AI_PROVIDER:'local',AI_MODEL:'test-local',AI_BASE_URL:`http://127.0.0.1:${server.address().port}/v1`,AI_DAILY_CALL_LIMIT:'100'});
  mutate(db,w=>addPlayer(w,'p','Player'));let w=readWorld(db);
  assert.equal((await aiStatus()).ready,true);
  const result=await converse(db,w,w.npcs[0],'p','My boat is blue');assert.equal(result.provider,'local');assert.equal(result.model,'test-local');assert.equal(result.fallback,false);
  const context=JSON.parse(received.messages[1].content);assert.equal(context.citizen.name,w.npcs[0].name);assert.equal(context.playerMessage,'My boat is blue');assert.equal(received.model,'test-local');
  assert.equal(db.prepare('SELECT output_tokens FROM ai_usage').get().output_tokens,9);w=readWorld(db);assert.ok(w.npcs[0].memories.some(m=>m.text.includes('My boat is blue')));
  failure=true;const fallback=await converse(db,w,w.npcs[0],'p','Hello');assert.equal(JSON.parse(received.messages[1].content).recentConversation[0].reply,'I remember your blue fishing boat.');assert.equal(fallback.provider,'deterministic');assert.equal(fallback.fallback,true);assert.match(fallback.notice,/unavailable/);
  process.env.AI_MODEL='not-installed';assert.equal((await aiStatus()).ready,false);
  process.env.AI_MAX_CONCURRENT='0';await assert.rejects(()=>new CompatibleProvider().execute('dialogue',context),e=>e.status===429);
 }finally{db.close();await new Promise(r=>server.close(r));for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
});
