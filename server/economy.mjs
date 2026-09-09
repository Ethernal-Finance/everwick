// Read-only economic accounts. Never manufacture currency or count a controlled
// resident's wallet twice. All flows below are measured from settled transfers.
export function economicReport(w, playerId) {
 const residents=w.npcs.filter(n=>n.residency!=='away'&&n.age>=18);
 const open=w.businesses.filter(b=>b.status==='open');
 const employed=residents.filter(n=>open.some(b=>b.id===n.employer));
 const flows=w.ledger.filter(l=>l.tick>w.tick-24);
 const sum=rows=>rows.reduce((s,l)=>s+l.amount,0);
 const wages=sum(flows.filter(l=>l.reason==='wage'||l.reason==='profit-share'));
 const rent=sum(flows.filter(l=>l.reason==='rent'));
 const sales=flows.filter(l=>l.reason.startsWith('purchase:'));
 const households=new Set([...w.npcs.map(n=>n.id),...Object.keys(w.players)]);
 const spending=sum(sales.filter(l=>households.has(l.from)));
 const basket=(prices)=>3*(prices.food||12)+(prices.meal||40)+(prices.goods||42);
 const history=w.economyHistory||[];
 const last=history.at(-1)?.day===Math.floor(w.tick/24)?history.at(-2):history.at(-1);
 const inflation=last?Math.round((basket(w.prices)/basket(last.prices)-1)*1000)/10:0;
 const goods=Object.entries(w.prices).map(([item,price])=>{
  const trades=sales.filter(l=>l.reason.split(':')[1]===item);
  const units=trades.reduce((s,l)=>s+Number(l.reason.split(':')[2]||0),0);
  const stock=open.reduce((s,b)=>s+(b.inventory[item]||0),0);
  return {item,price,stock,units,turnover:sum(trades),cover:units?Math.round(stock/units*10)/10:null,scarce:stock===0||(units>0&&stock<units)};
 });
 const p=w.players[playerId], ids=new Set([playerId,p?.citizenId].filter(Boolean));
 const personal=flows.filter(l=>ids.has(l.from)!==ids.has(l.to));
 const income=sum(personal.filter(l=>ids.has(l.to))),expenses=sum(personal.filter(l=>ids.has(l.from)));
 const employer=open.find(b=>b.id===p?.employer),home=w.properties.find(h=>h.id===p?.housing);
 const dailyRent=home&&!ids.has(home.owner)?home.rent:0;
 const dailyFood=3*(w.prices.food||12);
 return {workers:residents.length,employed:employed.length,employment:residents.length?Math.round(employed.length/residents.length*100):0,
  wages,rent,spending,turnover:sum(sales),inflation,goods,treasury:w.treasury.cash,
  unpaidWages:w.businesses.reduce((s,b)=>s+Object.values(b.wageDebt||{}).reduce((a,v)=>a+v,0),0),
  household:{income,expenses,net:income-expenses,wage:employer?.wage||0,rent:dailyRent,food:dailyFood,forecast:(employer?.wage||0)-dailyRent-dailyFood},
  recent:personal.slice(-8).reverse().map(l=>({tick:l.tick,amount:l.amount,incoming:ids.has(l.to),reason:l.reason})),
  warnings:[...(goods.find(g=>g.item==='food')?.scarce?['Food stocks are below one day of measured demand. Farm, trade food, or supply local shops.']:[]),
   ...(open.some(b=>b.arrears>0)?['Some employers owe wages. Check operating cash before increasing pay or withdrawing profits.']:[]),
   ...(residents.some(n=>n.needs.hunger>70)?['Some neighbours are going hungry. Food relief and stocked markets can help.']:[])]};
}

// First-session starter floors. Transfers only — never mints. Re-applied on read
// so existing worlds pick up the ladder without a wipe.
export function ensureStarterEconomy(w){
 const tavern=w.businesses?.find(b=>b.id==='tavern');
 if(tavern){tavern.starterListing=true;if(tavern.forSale)tavern.valuation=1200;}
 for(const prop of w.properties||[]){
  if(prop.id==='cottage-1'){prop.starterListing=true;if(prop.forSale)prop.valuation=900;}
  const m=/^home-(\d+)$/.exec(prop.id);
  if(m&&Number(m[1])%10===0){prop.starterListing=true;if(prop.forSale)prop.valuation=900;}
 }
 return w;
}
