import {api} from './common.js';
export function registerGameTools(refresh){
 if(!document.modelContext?.registerTool)return;const lifecycle=new AbortController();
 const tools=[
 {name:'read_everwick_town',title:'Read town state',description:'Read citizens, prices, businesses and recent news for the signed-in player.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>api('/api/world')},
 {name:'set_owned_business_terms',title:'Set business prices and wages',description:'Save a price and daily wage for a business owned by the signed-in player.',inputSchema:{type:'object',properties:{id:{type:'string'},price:{type:'integer',minimum:1,maximum:200},wage:{type:'integer',minimum:20,maximum:150}},required:['id','price','wage'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(!input||typeof input.id!=='string'||!Number.isInteger(input.price)||!Number.isInteger(input.wage))throw Error('Invalid business terms');const b=await api('/api/command',{action:'settings',data:input});await refresh();return {id:b.id,price:b.price,wage:b.wage};}}
 ];
 for(const tool of tools)try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
