import {createHmac,timingSafeEqual} from 'node:crypto';
import {atomic} from './db.mjs';
import {salesEnabled} from './security.mjs';

const founderBenefits=['Citizenship: claim one Generation A resident (any sex)','Founder badge','Founding registry'];
const pack=(name,amount,slots,benefits,need={need_male:0,need_female:0})=>({name,amount,slots,...need,benefits});

/** Locked pack catalog. `citizen` aliases `founder` for checkout/settle backward compat. */
export const PACKS={
 founder:pack('Founding Citizen',2500,1,founderBenefits),
 citizen:pack('Founding Citizen',2500,1,founderBenefits),
 breeder:pack('Breeder Pack',4900,2,['Claim slots: one male + one female Gen A','Founder badge','Breedable bloodline on claimed Gen A'],{need_male:1,need_female:1}),
 town:pack('Town Founder',7500,2,['Two Gen A claim slots (any sex)','Early alpha access','Property decoration','Founder title']),
 city:pack('City Founder',19900,3,['Three Gen A claim slots (any sex)','Cosmetic bundle','Business name reservation','Early business access']),
 patron:pack('Everwick Patron',49900,5,['Five Gen A claim slots (any sex)','Patron credit','Quarterly group developer Q&A','Patron decoration set']),
};
export const TIERS=PACKS;

const CANON={citizen:'founder',founder:'founder',breeder:'breeder',town:'town',city:'city',patron:'patron'};
export function canonicalPack(tier){const k=String(tier||'').toLowerCase();return CANON[k]||null;}
export function packCatalog(){return ['founder','breeder','town','city','patron'].map(k=>({key:k,...PACKS[k]}));}
function packOrThrow(tier){const c=canonicalPack(tier);if(!c)throw Error('Unknown founder package');return {canonical:c,pkg:PACKS[c]};}
function priceEnv(canonical,requested){
 const upper=String(requested||canonical).toUpperCase();
 return process.env[`STRIPE_PRICE_${upper}`]||(canonical==='founder'?process.env.STRIPE_PRICE_FOUNDER||process.env.STRIPE_PRICE_CITIZEN:process.env[`STRIPE_PRICE_${canonical.toUpperCase()}`]);
}

export function stripeMode(){return process.env.STRIPE_MODE==='live'?'live':'test';}
export function stripeReady(){const k=process.env.STRIPE_SECRET_KEY||'';return k.startsWith(stripeMode()==='live'?'sk_live_':'sk_test_')&&!!process.env.STRIPE_WEBHOOK_SECRET;}
async function stripe(path,form){if(!stripeReady())throw Object.assign(Error('Stripe is not configured. Local development can use the free citizenship preview. No payment was taken.'),{status:503,expose:true});const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:form?'POST':'GET',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams(form):undefined,signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error('Stripe request failed; check server configuration');return data;}

export async function checkout(db,user,packKey){
 if(!salesEnabled(db))throw Object.assign(Error('Founder sales are temporarily paused. No payment was taken.'),{status:503,expose:true});
 const {canonical,pkg}=packOrThrow(packKey);const origin=process.env.APP_ORIGIN||'http://localhost:3100';
 const price=priceEnv(canonical,packKey);const pricing=price?{'line_items[0][price]':price}:{'line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(pkg.amount),'line_items[0][price_data][product_data][name]':pkg.name};
 const s=await stripe('checkout/sessions',{'mode':'payment','customer_creation':'always','customer_email':user.email,'client_reference_id':user.id,'metadata[user_id]':user.id,'metadata[tier]':canonical,'metadata[pack]':canonical,'metadata[slots]':String(pkg.slots),'payment_intent_data[metadata][user_id]':user.id,'payment_intent_data[metadata][tier]':canonical,'payment_intent_data[metadata][pack]':canonical,'payment_intent_data[receipt_email]':user.email,...pricing,'line_items[0][quantity]':'1','success_url':`${origin}/play?checkout=success`,'cancel_url':`${origin}/?checkout=cancelled`});
 db.prepare('INSERT OR IGNORE INTO purchases(id,user_id,tier,status,amount,mode,created_at) VALUES(?,?,?,?,?,?,?)').run(s.id,user.id,canonical,'pending',pkg.amount,stripeMode(),Date.now());return {url:s.url};
}

export function verifyWebhook(raw,header,secret,now=Date.now()){
 if(!secret||!header)throw Error('Missing webhook signature');const pieces=header.split(',').map(s=>s.split('='));const t=pieces.find(p=>p[0]==='t')?.[1];if(!t||!/^\d+$/.test(t)||!Number.isSafeInteger(Number(t))||Math.abs(now/1000-Number(t))>300)throw Error('Expired webhook');
 const expected=createHmac('sha256',secret).update(`${t}.`).update(raw).digest();
 if(!pieces.filter(p=>p[0]==='v1').some(([,v])=>{try{const b=Buffer.from(v,'hex');return b.length===expected.length&&timingSafeEqual(b,expected);}catch{return false;}}))throw Error('Invalid webhook signature');
 return JSON.parse(raw.toString('utf8'));
}

function catalogAmount(tier){const c=canonicalPack(tier);if(!c)throw Error('Unknown pack');return PACKS[c].amount;}
function metaTierOk(purchaseTier,metaTier){const a=canonicalPack(purchaseTier),b=canonicalPack(metaTier);return !!a&&a===b;}

export function settle(db,e,mode=stripeMode()){
 if(e.livemode!==(mode==='live'))throw Error('Webhook mode mismatch');
 return atomic(db,()=>{
  if(db.prepare('SELECT id FROM webhook_events WHERE id=?').get(e.id))return {duplicate:true};
  const o=e.data.object;let refundedPurchaseId=null;
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(e.type)&&o.payment_status==='paid'){
   const p=db.prepare('SELECT * FROM purchases WHERE id=?').get(o.id);if(!p)throw Error('Unknown checkout session; retry after checkout registration');
   const canon=canonicalPack(p.tier);if(!canon||!metaTierOk(p.tier,o.metadata?.tier)||p.user_id!==o.client_reference_id||o.metadata?.user_id!==p.user_id||o.currency!=='usd'||o.amount_total!==catalogAmount(p.tier)||p.mode!==mode)throw Error('Checkout identity or amount mismatch');
   const pkg=PACKS[canon];
   if(o.customer)db.prepare('INSERT OR IGNORE INTO customers VALUES(?,?,?,?)').run(typeof o.customer==='string'?o.customer:o.customer.id,p.user_id,mode,Date.now());
   if(p.status!=='refunded'&&p.status!=='partially_refunded'){
    db.prepare("UPDATE purchases SET status='paid',amount=?,payment_intent=?,tier=? WHERE id=?").run(o.amount_total,typeof o.payment_intent==='string'?o.payment_intent:o.payment_intent?.id,canon,o.id);
    db.prepare('INSERT OR IGNORE INTO entitlements(purchase_id,user_id,tier,active,slots_total,slots_remaining,need_male,need_female) VALUES(?,?,?,1,?,?,?,?)')
     .run(p.id,p.user_id,canon,pkg.slots,pkg.slots,pkg.need_male||0,pkg.need_female||0);
   }
  }else if(['checkout.session.async_payment_failed','checkout.session.expired'].includes(e.type)){
   db.prepare("UPDATE purchases SET status='failed' WHERE id=? AND status='pending'").run(o.id);
  }else if(e.type==='charge.refunded'){
   const p=db.prepare('SELECT * FROM purchases WHERE payment_intent=?').get(o.payment_intent);
   if(!p)throw Error('Payment settlement not recorded yet; retry refund webhook');
   const refunded=Math.max(p.refunded,o.amount_refunded);const full=refunded>=p.amount;
   db.prepare('UPDATE purchases SET refunded=?,status=? WHERE id=?').run(refunded,full?'refunded':'partially_refunded',p.id);
   if(full){db.prepare('UPDATE entitlements SET active=0,slots_remaining=0,need_male=0,need_female=0 WHERE purchase_id=?').run(p.id);refundedPurchaseId=p.id;}
  }
  db.prepare('INSERT INTO webhook_events VALUES(?,?)').run(e.id,Date.now());return {received:true,refundedPurchaseId};
 });
}

export function funding(db){const mode=stripeMode();const row=db.prepare("SELECT COALESCE(SUM(amount-refunded),0) raised,COUNT(DISTINCT user_id) founders FROM purchases WHERE status IN ('paid','partially_refunded') AND mode=?").get(mode);return {...row,goal:2500000,mode,configured:stripeReady(),sales_enabled:salesEnabled(db)};}

export function entitlementSlots(db,userId){
 const rows=db.prepare('SELECT purchase_id,tier,active,slots_total,slots_remaining,need_male,need_female FROM entitlements WHERE user_id=? AND active=1').all(userId);
 const slots_remaining=rows.reduce((a,r)=>a+(r.slots_remaining||0),0);
 const need_male=rows.reduce((a,r)=>a+(r.need_male||0),0);
 const need_female=rows.reduce((a,r)=>a+(r.need_female||0),0);
 return {slots_remaining,need_male,need_female,entitlements:rows};
}

/** Decrement one claim slot. Prefer purchaseId when given. Breeder enforces sex needs without consuming the other sex. Caller should be inside a DB transaction for atomicity with world writes. */
export function spendClaimSlot(db,userId,{sex,purchaseId}={}){
 if(sex!=='male'&&sex!=='female')throw Object.assign(Error('Citizen sex is required to spend a claim slot'),{status:400});
 const rows=purchaseId
  ?db.prepare('SELECT * FROM entitlements WHERE user_id=? AND purchase_id=? AND active=1').all(userId,purchaseId)
  :db.prepare('SELECT * FROM entitlements WHERE user_id=? AND active=1 AND slots_remaining>0 ORDER BY purchase_id').all(userId);
 for(const e of rows){
  if((e.slots_remaining||0)<=0)continue;
  const needM=e.need_male||0,needF=e.need_female||0;
  if(needM>0||needF>0){
   if(sex==='male'&&needM<=0)continue;
   if(sex==='female'&&needF<=0)continue;
   const nextM=sex==='male'?needM-1:needM,nextF=sex==='female'?needF-1:needF;
   db.prepare('UPDATE entitlements SET slots_remaining=slots_remaining-1,need_male=?,need_female=? WHERE purchase_id=? AND slots_remaining>? AND active=1')
    .run(nextM,nextF,e.purchase_id,0);
   const after=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements WHERE purchase_id=?').get(e.purchase_id);
   if(after&&after.slots_remaining===e.slots_remaining-1)return {purchaseId:e.purchase_id,tier:e.tier,...after};
   throw Object.assign(Error('Claim slot could not be reserved'),{status:409});
  }
  const r=db.prepare('UPDATE entitlements SET slots_remaining=slots_remaining-1 WHERE purchase_id=? AND slots_remaining>0 AND active=1').run(e.purchase_id);
  if(r.changes===1){const after=db.prepare('SELECT slots_remaining,need_male,need_female FROM entitlements WHERE purchase_id=?').get(e.purchase_id);return {purchaseId:e.purchase_id,tier:e.tier,...after};}
 }
 if(rows.some(e=>(e.need_male||0)>0||(e.need_female||0)>0))
  throw Object.assign(Error(sex==='male'?'Breeder pack needs a female Gen A claim remaining (or no slots).':'Breeder pack needs a male Gen A claim remaining (or no slots).'),{status:400});
 throw Object.assign(Error('No Gen A claim slots remaining on your entitlements'),{status:400});
}
