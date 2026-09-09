import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export const randomId=()=>randomBytes(18).toString('hex');
export function hashPassword(password){const salt=randomId();return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function checkPassword(password,stored){try{const [salt,key]=stored.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex'));}catch{return false;}}
export const tokenHash=t=>createHash('sha256').update(t).digest('hex');
export function session(db,userId){const token=randomId()+randomId();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token),userId,Date.now()+7*86400000);return token;}
export function currentUser(db,req){const raw=req.headers.cookie?.match(/(?:^|;\s*)everwick=([a-f0-9]+)/)?.[1];if(!raw)return null;return db.prepare('SELECT u.id,u.email,u.name,u.role FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(tokenHash(raw),Date.now())||null;}
export function cookie(token,clear=false){return `everwick=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:604800}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export function requireUser(user){if(!user)throw Object.assign(Error('Please sign in'),{status:401});return user;}
export function requireAdmin(user){requireUser(user);if(user.role!=='admin')throw Object.assign(Error('Administrator access required'),{status:403});return user;}
