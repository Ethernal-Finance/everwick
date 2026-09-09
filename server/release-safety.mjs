// Demo worlds are indivisible sandboxes: their trades can affect every balance.
// Refuse promotion instead of attempting to remove individual demo citizens.
export function assertProductionWorld(w,mode=process.env.NODE_ENV){
 if(mode!=='production')return;
 if(w.economyMode==='demo'||Object.values(w.players||{}).some(p=>p.demoCitizenship)||[...(w.npcs||[]),...(w.children||[])].some(n=>n.demoFounder||n.demoData))
  throw Error('Demo data cannot run in production. Keep this database as a sandbox and configure a separate production DATABASE_PATH.');
}
