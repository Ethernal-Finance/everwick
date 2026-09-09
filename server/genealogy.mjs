export const GEN_Z=25; // numeric generation Z — terminal / sterile
export const MAX_BREEDABLE_GENERATION=GEN_Z-1; // Y

export function generationLabel(value=0){
 let n=Math.max(0,Number(value)||0),out='';
 do{out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26)-1;}while(n>=0);
 return out;
}
export function isGenZ(n){return (Number(n?.generation)||0)>=GEN_Z;}
export function ancestorIds(w,citizen,depth=Infinity){
 const found=new Set(),queue=(citizen?.parents||[]).map(id=>({id,depth:1}));
 while(queue.length){const item=queue.shift();if(!item?.id||item.depth>depth||found.has(item.id))continue;found.add(item.id);const parent=w.npcs.find(n=>n.id===item.id);if(parent)for(const id of parent.parents||[])queue.push({id,depth:item.depth+1});}
 return found;
}
export function closeKin(w,a,b,depth=Infinity){
 if(!a||!b||a.id===b.id)return true;
 if((a.parents||[]).includes(b.id)||(b.parents||[]).includes(a.id))return true;
 const aa=ancestorIds(w,a,depth),bb=ancestorIds(w,b,depth);
 if(aa.has(b.id)||bb.has(a.id))return true;
 for(const id of aa)if(bb.has(id))return true;
 return false;
}
export function childIds(w,id){return w.npcs.filter(n=>(n.parents||[]).includes(id)).map(n=>n.id).concat((w.children||[]).filter(c=>!c.grown&&(c.parents||[]).includes(id)).map(c=>c.id));}
