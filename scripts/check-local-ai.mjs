import {database,readWorld,mutate} from '../server/db.mjs';
import {addPlayer} from '../server/simulation.mjs';
import {converse,aiStatus} from '../server/ai.mjs';
const status=await aiStatus();console.log(status);
if(status.provider!=='local'||!status.ready)throw Error('Configure a running local model before testing.');
const db=database(':memory:');
try{mutate(db,w=>addPlayer(w,'local-check','Test neighbor'));const w=readWorld(db),start=performance.now();const result=await converse(db,w,w.npcs[0],'local-check','Hello! What work are you doing in town today?');console.log({...result,seconds:Math.round((performance.now()-start)/100)/10});if(result.provider!=='local'||result.fallback)throw Error('Local generation failed.');if(!readWorld(db).npcs[0].memories.some(m=>m.text.includes('What work')))throw Error('Conversation was not remembered.');}finally{db.close();}
