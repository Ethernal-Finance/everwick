import {assertProductionWorld} from './release-safety.mjs';
import {festivalView} from './content.mjs';
import {economicReport} from './economy.mjs';
import {newCitizenAccount,claimResident,grantDemoFounderCompanion,grantStarterCitizen,citizenshipState,playerControls,refreshCitizenshipAccess,revokePurchaseClaims,ensureCitizenSex} from './citizenship.mjs';
import {ensureFarms} from './farming.mjs';
import {civicEconomy} from './industry.mjs';
import {civilizationReport} from './civilization.mjs';
import {socialFeed} from './social.mjs';
import {replenishFish} from './fishing.mjs';
import {visiblePlayers,publicHouses} from './presence.mjs';
import {movePlayer,takeControl} from './player-movement.mjs';
import {refreshLife} from './life.mjs';
import {appearanceCatalog} from './appearance.mjs';
import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {database,readWorld,mutate,atomic,audit,catchUp} from './db.mjs';
import {randomId,hashPassword,checkPassword,currentUser,session,cookie,requireUser,requireAdmin,tokenHash} from './auth.mjs';
import {addPlayer,command,totalCash,transfer} from './simulation.mjs';
import {checkout,verifyWebhook,settle,funding,TIERS,spendClaimSlot} from './payments.mjs';
import {beginMfaSetup,confirmMfaSetup,elevateAdmin,elevationCookie,requireAdminStepUp,mfaStatus,salesEnabled,setSalesEnabled,exportUserData,deleteUserAccount,withdrawWaitlistConsent} from './security.mjs';
import {productReport} from './analytics.mjs';
import {converse,recoverTasks,aiStatus} from './ai.mjs';
export function createApp(db=database()){
 assertProductionWorld(readWorld(db));
 const root=resolve(fileURLToPath(new URL('../client/',import.meta.url)));const limits=new Map();const activeDialogue=new Set();const interval=Math.max(1000,Number(process.env.TICK_MS||15000));let lastTickMs=0,lastError=null;
 recoverTasks(db);
 function progress(){try{const start=performance.now();catchUp(db,Date.now(),interval,96);lastTickMs=performance.now()-start;}catch(e){lastError=e.message;console.error('Simulation error:',e.message);}}
 progress();const worker=setInterval(progress,200);worker.unref();
 const metric=(event,user=null,source='',meta={})=>db.prepare('INSERT INTO analytics(event,user_id,source,created_at,metadata) VALUES(?,?,?,?,?)').run(event,user,source,Date.now(),JSON.stringify(meta));
 async function handler(req,res){
  const origin=process.env.APP_ORIGIN||`http://localhost:${process.env.PORT||3100}`;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://raw.githubusercontent.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
  const send=(status,obj,extra={})=>{res.writeHead(status,{...headers,...extra});res.end(typeof obj==='string'?obj:JSON.stringify(obj));};
  try{
   const url=new URL(req.url,origin),path=url.pathname,method=req.method,user=currentUser(db,req);
   const clientIp=process.env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
   const key=`${user?.id||clientIp}:${path.startsWith('/api/auth')?'auth':path}`;const now=Date.now(),lim=limits.get(key)||{n:0,until:now+60000};if(now>lim.until){lim.n=0;lim.until=now+60000;}lim.n++;limits.set(key,lim);if(limits.size>10000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);
   if(lim.n>(path.startsWith('/api/auth')?12:path==='/api/motion'?600:150))return send(429,{error:'Too many requests. Try again shortly.'},{'Retry-After':'60'});
   if(method==='POST'&&path!=='/api/stripe/webhook'&&req.headers.origin!==origin)return send(403,{error:'Request origin rejected'});
   let raw=Buffer.alloc(0),body={};if(method==='POST'){for await(const chunk of req){raw=Buffer.concat([raw,chunk]);if(raw.length>65536)return send(413,{error:'Request too large'});}if(path!=='/api/stripe/webhook'){try{body=JSON.parse(raw.toString()||'{}');}catch{return send(400,{error:'Invalid JSON'});}if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid request');}}
   if(path==='/api/health')return send(200,{ok:!lastError,simulationMs:lastTickMs,tick:readWorld(db).tick});
   if(path==='/api/auth/register'&&method==='POST'){
    const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),password=String(body.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length<2||name.length>32||password.length<12||password.length>128)throw Error('Use a valid email, a 2–32 character name, and a password of 12–128 characters.');
    if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw Error('Unable to create this account. Try signing in.');const id=randomId();const hashed=hashPassword(password);
    atomic(db,()=>{db.prepare('INSERT INTO users(id,email,name,password,created_at) VALUES(?,?,?,?,?)').run(id,email,name,hashed,Date.now());const w=readWorld(db);const p=newCitizenAccount(w,id,name);grantStarterCitizen(w,p,{transfer});db.prepare('UPDATE worlds SET state=? WHERE id=1').run(JSON.stringify(w));});
    metric('game_registration',id);return send(201,{id,name,email,role:'player'},{'Set-Cookie':cookie(session(db,id))});
   }
   if(path==='/api/auth/login'&&method==='POST'){
    const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||'').trim().toLowerCase());const password=String(body.password||'');if(password.length>128||!checkPassword(password,u?.password||'dummy:00'))return send(401,{error:'Email or password is incorrect'});metric('login',u.id);return send(200,{id:u.id,name:u.name,email:u.email,role:u.role},{'Set-Cookie':cookie(session(db,u.id))});
   }
   if(path==='/api/auth/logout'&&method==='POST'){const rawToken=req.headers.cookie?.match(/everwick=([a-f0-9]+)/)?.[1];if(rawToken)db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(rawToken));return send(200,{ok:true},{'Set-Cookie':cookie('',true)});}
   if(path==='/api/characters'){requireUser(user);const w=readWorld(db);return send(200,citizenshipState(db,w,user.id));}
   if(path==='/api/me')return send(200,{user,purchases:user?db.prepare('SELECT id,tier,status,amount,refunded,mode,created_at FROM purchases WHERE user_id=? ORDER BY created_at DESC').all(user.id):[],entitlements:user?db.prepare('SELECT tier,active,slots_total,slots_remaining,need_male,need_female FROM entitlements WHERE user_id=?').all(user.id):[]});
   if(path==='/api/public')return send(200,{funding:funding(db),tiers:TIERS,news:readWorld(db).news.slice(0,3),contact:process.env.PUBLIC_CONTACT_EMAIL||null});
   if(path==='/api/town-preview'){const w=readWorld(db);return send(200,{tick:w.tick,businesses:w.businesses.map(b=>({id:b.id,name:b.name,type:b.type,x:b.x,y:b.y,status:b.status})),npcs:w.npcs.map(n=>({id:n.id,x:n.x,y:n.y})),properties:w.properties.map(p=>({x:p.x,y:p.y}))});}
   if(path==='/api/motion'){const w=readWorld(db);return send(200,{tick:w.tick,players:user?visiblePlayers(w):[],npcs:w.npcs.filter(n=>n.residency!=='away').map(n=>({id:n.id,x:n.x,y:n.y,avatar:n.avatar,appearance:n.appearance,controllerId:n.controllerId,controlled:playerControls(w,n),direction:n.direction,walking:n.walking,routine:n.routine,activity:n.activity,indoors:n.indoors}))});}
   if(path==='/api/world'){
    requireUser(user);const w=readWorld(db),p=w.players[user.id];if(!p)throw Error('Player missing');refreshLife(w,p);replenishFish(w);const owned=w.businesses.filter(b=>b.owner===user.id).map(b=>b.id);return send(200,{tick:w.tick,day:Math.floor(w.tick/24)+1,hour:w.tick%24,npcs:w.npcs.map(({path,target,conversations,...n})=>({...n,controlled:playerControls(w,n)})),businesses:w.businesses,properties:publicHouses(w),players:visiblePlayers(w),player:{...p,autonomous:p.citizenId?!playerControls(w,w.npcs.find(n=>n.id===p.citizenId)):false},citizenship:citizenshipState(db,w,user.id),construction:w.construction,farmPlots:ensureFarms(w),exchange:w.exchange,civicEconomy:civicEconomy(w),children:w.children,population:w.population,appearanceCatalog:appearanceCatalog(),socialFeed:socialFeed(w,p),fishery:w.fishery,city:w.city,civilization:civilizationReport(w,user.id),economyHistory:w.economyHistory||[],produced:w.produced,prices:w.prices,news:w.news,events:w.events.slice(-40).reverse(),trades:w.ledger.filter(l=>(l.from===user.id||l.to===user.id)&&l.reason.startsWith('purchase:')).slice(-20).reverse(),briefing:w.events.filter(e=>e.tick>p.lastSeen&&(e.subjects.includes(user.id)||e.type==='market'||e.type==='ownership'||e.type==='closure')).slice(-20).reverse(),awayHours:Math.max(0,w.tick-p.lastSeen),owned,festival:festivalView(w,p),economy:economicReport(w,user.id),totalCash:totalCash(w),catchingUp:Date.now()-w.lastTickAt>interval*2});
   }
   if(path==='/api/control'&&method==='POST'){requireUser(user);return send(200,mutate(db,w=>{refreshCitizenshipAccess(db,w);return takeControl(w,w.players[user.id],Date.now(),String(body.clientId||'').slice(0,80));}));}
   if(path==='/api/position'&&method==='POST'){requireUser(user);return send(200,mutate(db,w=>{const p=w.players[user.id];refreshCitizenshipAccess(db,w);if(p.accessRevoked)throw Error('Citizenship access is inactive. Your resident continues autonomously.');if(p.citizenshipAccount&&!p.citizenId)return {x:p.x,y:p.y};if(p.dungeonRun?.active){p.presenceAt=p.controlAt=p.positionAt=Date.now();if(body.clientId)p.controlClient=String(body.clientId).slice(0,80);return {x:p.x,y:p.y,dungeon:true,autonomous:false};}if(body.active===false){if(!p.controlClient||p.controlClient===body.clientId)p.controlAt=0;p.presenceAt=Date.now();return {x:p.x,y:p.y,autonomous:true};}if(p.citizenId&&!playerControls(w,w.npcs.find(n=>n.id===p.citizenId)))return takeControl(w,p,Date.now(),String(body.clientId||'').slice(0,80));const r=movePlayer(p,body,Date.now(),w);p.controlAt=Date.now();if(body.clientId)p.controlClient=String(body.clientId).slice(0,80);return {...r,autonomous:false};}));}
   if(path==='/api/seen'&&method==='POST'){requireUser(user);mutate(db,w=>w.players[user.id].lastSeen=w.tick);metric('game_session',user.id);return send(200,{ok:true});}
   if(path==='/api/command'&&method==='POST'){
    requireUser(user);const requestKey=req.headers['idempotency-key'];if(typeof requestKey!=='string'||!/^[a-zA-Z0-9-]{12,80}$/.test(requestKey))throw Error('A command idempotency key is required');
    const result=atomic(db,()=>{const old=db.prepare('SELECT result FROM command_keys WHERE user_id=? AND key=?').get(user.id,requestKey);if(old)return JSON.parse(old.result);const w=readWorld(db),p=w.players[user.id];let result;if(['create-character','select-character','claim-citizen'].includes(body.action)){const state=citizenshipState(db,w,user.id);if(!state.canClaim)throw Error(state.paid&&state.slotsRemaining<=0?'No Gen A claim slots remaining.':'Citizenship purchase is required.');let founderPurchaseId=null;const targetId=body.data?.citizen;if(state.paid&&state.slotsRemaining>0){const n=w.npcs.find(x=>x.id===targetId);if(!n)throw Error('Only unowned Generation A founders can be claimed through founder citizenship. Generation B and later citizens trade for in game coins.');ensureCitizenSex(n);const spent=spendClaimSlot(db,user.id,{sex:n.sex});founderPurchaseId=spent.purchaseId;}claimResident(w,p,targetId,{founderPurchaseId});p.demoCitizenship=state.demo&&!state.paid;if(p.demoCitizenship)grantDemoFounderCompanion(w,p,p.citizenId);result=citizenshipState(db,w,user.id);}else{refreshCitizenshipAccess(db,w);if(p.accessRevoked)throw Error('Citizenship access is inactive.');if(p.citizenshipAccount&&!p.citizenId)throw Error('Choose an existing citizen first.');if(body.action!=='dungeon-enter')p.controlAt=Date.now();result=command(w,user.id,String(body.action),body.data||{});}db.prepare('UPDATE worlds SET state=? WHERE id=1').run(JSON.stringify(w));db.prepare('INSERT INTO command_keys VALUES(?,?,?)').run(user.id,requestKey,JSON.stringify(result));audit(db,user.id,String(body.action),body.data||{});if(body.action==='buy')metric('business_purchased',user.id);return result;});return send(200,result);
   }
   if(path==='/api/ai-status'&&method==='GET'){requireUser(user);return send(200,await aiStatus());}
   if(path==='/api/dialogue'&&method==='POST'){
    requireUser(user);const message=String(body.message||'').trim();if(!message||message.length>500)throw Error('Message must contain 1–500 characters');const w=readWorld(db),n=w.npcs.find(n=>n.id===body.id);if(!n)throw Error('Citizen not found');if(playerControls(w,n))throw Error('This citizen is under player control. Use nearby player chat.');if(activeDialogue.has(user.id))return send(429,{error:'Please wait for the current conversation'});activeDialogue.add(user.id);try{const result=await converse(db,w,n,user.id,message);metric('npc_conversation',user.id);return send(200,result);}finally{activeDialogue.delete(user.id);}
   }
   if(path==='/api/waitlist'&&method==='POST'){
    const email=String(body.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||body.consent!==true)throw Error('Enter a valid email and agree to receive development emails.');
    // Do not disclose existing referral codes by email lookup.
    if(db.prepare('SELECT id FROM waitlist WHERE email=?').get(email))return send(200,{message:'This email is already registered. Thank you for joining.'});
    const code=randomId().slice(0,12);const ref=db.prepare('SELECT code FROM waitlist WHERE code=?').get(String(body.ref||''));db.prepare('INSERT INTO waitlist VALUES(?,?,?,?,?,?,?)').run(randomId(),email,code,ref?.code||null,String(body.source||'direct').slice(0,100),1,Date.now());metric('waitlist_join',null,String(body.source||'direct'));return send(201,{code,url:`${origin}/?ref=${code}`,message:'You are on the list. Save your personal referral link.'});
   }
   if(path==='/api/referrals')return send(200,db.prepare('SELECT substr(p.code,1,6) handle,COUNT(c.id) referrals FROM waitlist p JOIN waitlist c ON c.referred_by=p.code GROUP BY p.code ORDER BY referrals DESC LIMIT 10').all());
   if(path==='/api/checkout'&&method==='POST'){requireUser(user);return send(200,await checkout(db,user,body.tier));}
   if(path==='/api/stripe/webhook'&&method==='POST'){let e;try{e=verifyWebhook(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);}catch(err){return send(400,{error:err.message});}try{const result=settle(db,e);mutate(db,w=>{if(result.refundedPurchaseId)revokePurchaseClaims(db,w,result.refundedPurchaseId);refreshCitizenshipAccess(db,w);});return send(200,result);}catch(err){console.error('Webhook settlement:',err.message);return send(500,{error:'Webhook not settled; delivery should retry'});}}
   if(path==='/api/analytics'&&method==='POST'){const allowed=['page_view','session_end','founder_click','share_news'];if(!allowed.includes(body.event))throw Error('Unknown metric');metric(body.event,user?.id||null,String(body.source||'direct').slice(0,100),{duration:Math.max(0,Math.min(86400,Number(body.duration)||0))});return send(200,{ok:true});}
   if(path==='/api/privacy/export'&&method==='GET'){requireUser(user);return send(200,exportUserData(db,user));}
   if(path==='/api/privacy/delete'&&method==='POST'){requireUser(user);const result=deleteUserAccount(db,user,{confirmEmail:body.confirmEmail});return send(200,result,{'Set-Cookie':cookie('',true)});}
   if(path==='/api/privacy/consent-withdraw'&&method==='POST'){return send(200,withdrawWaitlistConsent(db,{email:body.email,code:body.code}));}
   if(path==='/api/admin/mfa/setup'&&method==='POST'){requireAdmin(user);return send(200,beginMfaSetup(db,user));}
   if(path==='/api/admin/mfa/confirm'&&method==='POST'){requireAdmin(user);return send(200,confirmMfaSetup(db,user,body.code));}
   if(path==='/api/admin/mfa/elevate'&&method==='POST'){requireAdmin(user);const token=elevateAdmin(db,user,body.code);return send(200,{ok:true,expires_in:900},{'Set-Cookie':elevationCookie(token)});}
   if(path==='/api/admin/sales'&&method==='POST'){requireAdminStepUp(db,user,req);if(typeof body.enabled!=='boolean')throw Error('enabled must be true or false');return send(200,setSalesEnabled(db,user.id,body.enabled));}
   if(path==='/api/admin'){
    requireAdminStepUp(db,user,req);const w=readWorld(db);const scalar=sql=>db.prepare(sql).get();return send(200,{product:productReport(db),users:db.prepare('SELECT id,email,name,role,created_at FROM users').all(),purchases:db.prepare('SELECT * FROM purchases ORDER BY created_at DESC LIMIT 100').all(),waitlist:db.prepare('SELECT w.*,EXISTS(SELECT 1 FROM users u JOIN entitlements e ON e.user_id=u.id WHERE u.email=w.email AND e.active=1) founder FROM waitlist w ORDER BY joined_at DESC LIMIT 100').all(),funding:funding(db),mfa:mfaStatus(db,user.id),sales_enabled:salesEnabled(db),ai:scalar('SELECT COUNT(*) calls,COALESCE(SUM(cost),0) cost,COALESCE(SUM(input_tokens+output_tokens),0) tokens FROM ai_usage'),tasks:db.prepare('SELECT id,kind,status,attempts,created_at FROM ai_tasks ORDER BY created_at DESC LIMIT 20').all(),analytics:db.prepare('SELECT event,COUNT(*) count FROM analytics GROUP BY event').all(),dau:db.prepare("SELECT COUNT(DISTINCT user_id) count FROM analytics WHERE event='game_session' AND created_at>?").get(Date.now()-86400000).count,wau:db.prepare("SELECT COUNT(DISTINCT user_id) count FROM analytics WHERE event='game_session' AND created_at>?").get(Date.now()-7*86400000).count,ledger:w.ledger.slice(-100).reverse(),audit:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 30').all(),economy:{cash:totalCash(w),treasury:w.treasury.cash,prices:w.prices,businesses:w.businesses,npcs:w.npcs.length,properties:w.properties.length},server:{uptime:process.uptime(),simulationMs:lastTickMs,lastError,tick:w.tick,interval,lagTicks:Math.max(0,Math.floor((Date.now()-w.lastTickAt)/interval))}});
   }
   if(path==='/api/admin/economy'&&method==='POST'){requireAdminStepUp(db,user,req);if(!['pause-business','reopen-business'].includes(body.action))throw Error('Unknown admin action');mutate(db,w=>{const b=w.businesses.find(b=>b.id===body.id);if(!b)throw Error('Business not found');b.status=body.action==='pause-business'?'paused':'open';});audit(db,user.id,body.action,{id:body.id});return send(200,{ok:true});}
   if(path.startsWith('/api/'))return send(404,{error:'Endpoint not found'});
   if(method!=='GET'&&method!=='HEAD')return send(405,{error:'Method not allowed'});
   const relative=path==='/'?'index.html':path==='/play'?'play.html':path==='/admin'?'admin.html':path==='/credits'?'credits.html':path.slice(1);const file=resolve(root,relative);if(!file.startsWith(root+ '\\')&&!file.startsWith(root+'/'))return send(404,{error:'Not found'});if(!existsSync(file))return send(404,{error:'Not found'});
   const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.md':'text/markdown'};res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(method==='HEAD'?undefined:readFileSync(file));
  }catch(e){const status=e.status||400;if(status>=500)console.error(e.message);send(status,{error:status>=500&&!e.expose?'The service is temporarily unavailable. Please retry.':e.message});}
 }
 const server=http.createServer(handler);server.requestTimeout=30000;server.headersTimeout=15000;server.on('close',()=>clearInterval(worker));return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createApp();server.listen(Number(process.env.PORT||3100),process.env.HOST||'127.0.0.1',()=>console.log(`Everwick is open: ${process.env.APP_ORIGIN||'http://localhost:3100'}`));
 process.on('SIGINT',()=>server.close(()=>process.exit(0)));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}


