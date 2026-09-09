import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolveModel} from '../server/ai.mjs';
test('LM Studio follows loaded chat models and excludes embeddings and unloaded models',async()=>{
 let chosen='first';const server=http.createServer((req,res)=>{assert.equal(req.url,'/api/v0/models');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'embedding',type:'embeddings',state:'loaded'},{id:'downloaded',type:'llm',state:'not-loaded'},...(chosen?[{id:chosen,type:'vlm',state:'loaded'}]:[])]}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const c={runtime:'lmstudio',model:'auto',base:`http://127.0.0.1:${server.address().port}/v1`};assert.equal(await resolveModel(c),'first');chosen='replacement';assert.equal(await resolveModel(c),'replacement');chosen=null;await assert.rejects(()=>resolveModel(c),/Load a chat model/);}finally{await new Promise(r=>server.close(r));}
});
