// Authored content shared by the interface and the authoritative simulation.
import {CIVIC,entrance} from './world-map.js';
export const TALES={
 hearth:{title:'A light in the clinic',tag:'Care & belonging',patron:'clinic',reward:320,badge:'Good Neighbour',intro:'The clinic has kept a light in its window all week. Someone is working late, and the cupboards are almost empty.',ending:{paid:'The clinic has a stocked pantry and you have earned an honest wage. Your name goes into its book of reliable couriers.',community:'You leave the fee for the next neighbour who cannot afford care. The clinic staff remember who kept their light on.'},steps:[
  {place:'clinic',title:'The last lamp burning',text:'The night attendant folds a blanket over an empty chair. “People need somewhere to go before things become desperate.” Ask what the clinic needs.',button:'Listen to the night attendant'},
  {place:'clinic',title:'Stock the night pantry',text:'Bring four food from your harvest, a shop or the player market. These supplies go directly into the clinic pantry.',goods:{food:4},button:'Deliver four food'},
  {place:'restaurant',title:'A meal between shifts',text:'The Copper Spoon is preparing supper for the next shift. Bring two meals to add to the kitchen stock.',goods:{meal:2},button:'Share two prepared meals'},
  {place:'clinic',title:'Who keeps the light on?',text:'The attendant offers your fee. Take it to fund your next project, or leave it with the town and earn stronger relationships with the clinic staff.',final:true}
 ]},
 iron:{title:'The sound of the anvil',tag:'Industry & ambition',patron:'forge',reward:430,badge:'Friend of the Forge',intro:'A cracked tool has stopped work before breakfast. The forge can repair the high street, but somebody has to connect the chain.',ending:{paid:'Ore is moving and the workshop has a spare tool. The smith adds your name to the dependable suppliers list.',community:'You waive the fee. The smith tells the apprentices that a good neighbour can be worth more than another order.'},steps:[
  {place:'mine',title:'The ridge falls quiet',text:'The miners lay a broken tool on a crate. “An empty forge means an empty pay envelope.” Hear their plan to get work moving.',button:'Hear the miners out'},
  {place:'forge',title:'Something worth shaping',text:'Carry four ore to Ember & Anvil. Buy it at Copperhill or trade with another resident.',goods:{ore:4},button:'Deliver four ore'},
  {place:'workshop',title:'One tool, many hands',text:'Deliver one finished tool to Reedwood Workshop. Craft it at the forge or buy a spare; either way, the workshop keeps the item.',goods:{tools:1},button:'Deliver a finished tool'},
  {place:'forge',title:'A name stamped in iron',text:'With work moving again, the smith asks what sort of neighbour you intend to be.',final:true}
 ]},
 roots:{title:'The garden between us',tag:'Farming & friendship',patron:'garden',reward:360,badge:'Keeper of the Garden',intro:'Two gardeners disagree about a neglected patch. One wants a tidy harvest; the other wants a place where everyone belongs.',ending:{paid:'The garden has supplies for its next growing cycle. You take the fee and keep your own patch thriving.',community:'You leave the fee for the neighbourhood. The gardeners stop arguing long enough to put your name on their thank-you list.'},steps:[
  {place:'garden',title:'Across the garden fence',text:'Listen to both gardeners. Their plans differ, but both need someone who is willing to get their hands dirty.',button:'Listen at the garden gate'},
  {place:'sunfield',title:'Earn your muddy boots',text:'Complete two harvests on your leased plots, then return to Sunfield. Existing farming experience counts.',require:{farmingXp:20},button:'Show your growing experience'},
  {place:'garden',title:'Enough to share',text:'Bring six food to the community garden. The garden stores these goods for town trade.',goods:{food:6},button:'Deliver six food'},
  {place:'garden',title:'Leave the gate open',text:'Both gardeners have signed your payment slip. Decide whether to take the fee or make this a gift to their shared project.',final:true}
 ]},
 lantern:{title:'A room for tomorrow',tag:'Hospitality & hope',patron:'inn',requires:['hearth'],reward:450,badge:'Lantern Keeper',intro:'After your work at the clinic, the innkeeper asks for help. A guest room is ready, but the larder and linen cupboard tell another story.',ending:{paid:'The inn has fresh supplies and your work is paid. Its staff know who to call when the next room needs care.',community:'You leave your fee for the town. The inn staff remember the neighbour who helped make a room feel welcoming.'},steps:[
  {place:'inn',title:'An unmade room',text:'The innkeeper holds a stack of old letters. “Everyone passing through is going somewhere. I want this stop to be kind.” Hear the request.',button:'Speak with the innkeeper'},
  {place:'restaurant',title:'Supper for the weary',text:'Add three prepared meals to the restaurant shelves, helping it serve the evening crowd.',goods:{meal:3},button:'Deliver three meals'},
  {place:'inn',title:'The small comforts',text:'Bring two household goods for the inn stockroom. Craft them at the market or buy them from a shop.',goods:{goods:2},button:'Deliver household goods'},
  {place:'inn',title:'A key left on the counter',text:'The innkeeper offers your fee with a handwritten thank-you. Decide what to take home from this work.',final:true}
 ]},
 river:{title:'What the river carries',tag:'Fishing & community',patron:'tavern',requires:['hearth'],reward:380,badge:'Willowbank Regular',intro:'The anglers have a tradition: the first good catch should lead to a meal with somebody else. The tavern wants to bring that tradition back.',ending:{paid:'You have earned your fee and supplied the evening trade. The anglers count you among the Willowbank regulars.',community:'You leave the fee for the town. The tavern staff remember your part in bringing neighbours together.'},steps:[
  {place:'dock',title:'Three patient mornings',text:'Catch three fish at Willowbank. Your earlier catches count. Meet the anglers at the dock when you have learned their patience.',require:{catches:3},button:'Compare your fishing stories'},
  {place:'clinic',title:'A share for the absent',text:'Some neighbours cannot make it to the river. Bring three food to the clinic; preparing your fish is one way to supply it.',goods:{food:3},button:'Deliver three food'},
  {place:'tavern',title:'Room at the long table',text:'Bring two ale for the tavern shelves. Buy them from the tavern or brew your own using its production bench.',goods:{ale:2},button:'Supply the long table'},
  {place:'dock',title:'The river remembers',text:'At the dock, an angler passes along the town payment slip. Keep the fee or leave it for the neighbourhood.',final:true}
 ]},
 commons:{title:'The common good',tag:'Town building & legacy',patron:'market',requires:['iron','roots'],reward:650,badge:'Steward of Everwick',intro:'The town clerk has heard about the forge and the garden. Now the high street needs somebody who can see how all the pieces fit.',ending:{paid:'The stores are supplied and your civic work is paid. The clerk records you as a Steward of Everwick.',community:'You leave the fee in public hands. The market staff remember your choice, and the clerk names you a Steward of Everwick.'},steps:[
  {place:'hall',title:'A map of small needs',text:'The clerk spreads a map across the desk. Every pin is a household or workshop depending on another. Ask where help would travel furthest.',button:'Study the town plan'},
  {place:'warehouse',title:'Keep the wheels turning',text:'Deliver two tools to Eastgate Provisions. They replace equipment that wears out while keeping food moving.',goods:{tools:2},button:'Deliver two tools'},
  {place:'market',title:'Shelves for a growing town',text:'Bring three household goods to the market. These are real supplies for its customers, not a ceremonial donation.',goods:{goods:3},button:'Deliver three goods'},
  {place:'hall',title:'Your place on the map',text:'The clerk reads out your work and offers the final fee. The town will record both your contribution and your choice.',final:true}
 ]}
};
export const FESTIVALS=[
 {name:'The Seed & Supper Fair',season:'Spring',text:'Stock the garden, equip the growers and help the clinic prepare for a busy spring.',goals:{food:{qty:30,target:'clinic'},ore:{qty:12,target:'forge'},tools:{qty:4,target:'garden'}}},
 {name:'Lanterns on the Water',season:'Summer',text:'Bring supper, drinks and small comforts to the businesses hosting the summer evenings.',goals:{meal:{qty:12,target:'restaurant'},ale:{qty:12,target:'tavern'},goods:{qty:6,target:'inn'}}},
 {name:'The Harvest Table',season:'Autumn',text:'A harvest belongs to the town when it reaches the shelves. Help fill them before the weather turns.',goals:{food:{qty:40,target:'warehouse'},meal:{qty:10,target:'restaurant'},tools:{qty:3,target:'sunfield'}}},
 {name:'The Longnight Vigil',season:'Winter',text:'Keep the clinic supplied and the inn welcoming through the coldest evenings.',goals:{food:{qty:24,target:'clinic'},care:{qty:8,target:'clinic'},goods:{qty:8,target:'inn'}}}
];
export const FESTIVAL_HOURS=168;
export function journalRank(xp=0){return xp>=500?'Town Legend':xp>=300?'Pillar of the Community':xp>=150?'Trusted Neighbour':xp>=60?'Familiar Face':'A New Face';}
export function storyPlace(w,id){if(id==='square')return {name:'Town Square',x:24,y:22};if(id==='hall'){const hall=CIVIC.find(b=>b.id==='hall'),spot=entrance(hall);return {name:'Town Hall',x:spot.x,y:spot.y};}if(id==='dock')return {name:'Willowbank Dock',x:9,y:37};const b=w.businesses.find(b=>b.id===id);return b?{name:b.name,x:b.x+2,y:b.y+1}:null;}
export function storyLock(p,tale){const missing=(tale.requires||[]).filter(id=>!p.journal?.stories?.[id]?.complete);return missing.length?'Finish '+missing.map(id=>TALES[id].title).join(' and '):'';}
