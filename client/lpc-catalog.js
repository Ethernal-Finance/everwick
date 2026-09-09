export const LPC_REPO='https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/d44ea7d6904891aab8627b80ff4de1560d63bdff/';
export const SKIN_TONES=['light','tan','medium','brown','deep'];
export const EYE_COLORS=['brown','hazel','green','blue','gray'];
export const NATURAL_HAIR_COLORS=['black','brown','auburn','blonde','gray'];
export const HAIR_COLORS=[...NATURAL_HAIR_COLORS,'blue','violet','rose'];
export const BODY_FRAMES=['male','female'];
export const HAIR_STYLES=[
 {id:'bob',name:'Bob'},
 {id:'afro',name:'Afro'},
 {id:'bedhead',name:'Bedhead'},
 {id:'braid',name:'Braid'},
 {id:'braid2',name:'Braid II'},
 {id:'bangs',name:'Bangs'},
 {id:'bangsshort',name:'Short bangs'}
];
export const TORSO_STYLES=[
 {id:'longsleeve',name:'Long sleeve'},
 {id:'shortsleeve',name:'Short sleeve'}
];
export const LEG_STYLES=[
 {id:'pants',name:'Pants'},
 {id:'leggings',name:'Leggings'}
];
export const SHOE_STYLES=[{id:'basic',name:'Basic shoes'}];
export const JEWELRY_STYLES=[
 {id:'none',name:'No jewelry'},
 {id:'stud',name:'Stud earrings'},
 {id:'simple',name:'Simple earrings'}
];
export const CLOTHING_COLORS=['cream','umber','forest','navy','wine','charcoal','gold','teal'];
export const BARBER_PRICES={hairStyle:80,hairColor:60};
export const WARDROBE_PRICES={top:120,legs:90,shoes:75,jewelry:160};
export const STYLE_PRICES={...BARBER_PRICES,torsoStyle:WARDROBE_PRICES.top,torsoColor:0,legStyle:WARDROBE_PRICES.legs,legColor:0,shoeStyle:WARDROBE_PRICES.shoes,shoeColor:0,jewelryStyle:WARDROBE_PRICES.jewelry,jewelryColor:0};
export const APPEARANCE_SHOP_IDS={barber:'barber',top:'tailor',legs:'tailor',shoes:'cobbler',jewelry:'jeweler'};
export const LPC_SOURCE_PATHS={
 body:{male:'spritesheets/body/bodies/male/walk.png',female:'spritesheets/body/bodies/female/walk.png'},
 head:{male:'spritesheets/head/heads/human/male/walk.png',female:'spritesheets/head/heads/human/female/walk.png'},
 eyes:{default:'spritesheets/eyes/human/adult/default/walk.png'},
 brows:{thin:'spritesheets/eyes/eyebrows/thin/adult/walk.png'},
 hair:Object.fromEntries(HAIR_STYLES.map(x=>[x.id,`spritesheets/hair/${x.id}/adult/walk.png`])),
 torso:{
  longsleeve:{male:'spritesheets/torso/clothes/longsleeve/longsleeve/male/walk.png',female:'spritesheets/torso/clothes/longsleeve/longsleeve/female/walk.png'},
  shortsleeve:{male:'spritesheets/torso/clothes/shortsleeve/shortsleeve/male/walk.png',female:'spritesheets/torso/clothes/shortsleeve/shortsleeve/female/walk.png'}
 },
 legs:{
  pants:{male:'spritesheets/legs/pants/male/walk.png',female:'spritesheets/legs/pants/thin/walk.png'},
  leggings:{male:'spritesheets/legs/leggings/male/walk.png',female:'spritesheets/legs/leggings/thin/walk.png'}
 },
 shoes:{basic:{male:'spritesheets/feet/shoes/basic/male/walk.png',female:'spritesheets/feet/shoes/basic/thin/walk.png'}},
 jewelry:{
  stud:{male:'spritesheets/facial/earrings/stud/male/walk.png',female:'spritesheets/facial/earrings/stud/female/walk.png'},
  simple:{male:'spritesheets/facial/earrings/simple/male/walk.png',female:'spritesheets/facial/earrings/simple/female/walk.png'}
 }
};
export const lpcUrl=path=>LPC_REPO+path;
export function lpcLayers(appearance){
 if(!appearance||appearance.system!=='lpc')return [];
 const g=appearance.genetics||{},c=appearance.cosmetics||{},frame=BODY_FRAMES.includes(g.bodyFrame)?g.bodyFrame:'male';
 const hair=HAIR_STYLES.some(x=>x.id===c.hairStyle)?c.hairStyle:'bob',torso=TORSO_STYLES.some(x=>x.id===c.torsoStyle)?c.torsoStyle:'longsleeve',legs=LEG_STYLES.some(x=>x.id===c.legStyle)?c.legStyle:'pants',shoes=SHOE_STYLES.some(x=>x.id===c.shoeStyle)?c.shoeStyle:'basic',jewelry=JEWELRY_STYLES.some(x=>x.id===c.jewelryStyle)?c.jewelryStyle:'none';
 const layers=[
  {kind:'body',url:lpcUrl(LPC_SOURCE_PATHS.body[frame]),tone:g.skinTone||'light'},
  {kind:'legs',url:lpcUrl(LPC_SOURCE_PATHS.legs[legs][frame]),tone:c.legColor||'umber'},
  {kind:'shoes',url:lpcUrl(LPC_SOURCE_PATHS.shoes[shoes][frame]),tone:c.shoeColor||'umber'},
  {kind:'torso',url:lpcUrl(LPC_SOURCE_PATHS.torso[torso][frame]),tone:c.torsoColor||'forest'},
  {kind:'head',url:lpcUrl(LPC_SOURCE_PATHS.head[frame]),tone:g.skinTone||'light'},
  {kind:'eyes',url:lpcUrl(LPC_SOURCE_PATHS.eyes.default),tone:g.eyeColor||'brown'},
  {kind:'brows',url:lpcUrl(LPC_SOURCE_PATHS.brows.thin),tone:c.hairColor||g.naturalHairColor||'brown'}
 ];
 if(jewelry!=='none')layers.push({kind:'jewelry',url:lpcUrl(LPC_SOURCE_PATHS.jewelry[jewelry][frame]),tone:c.jewelryColor||'gold'});
 layers.push({kind:'hair',url:lpcUrl(LPC_SOURCE_PATHS.hair[hair]),tone:c.hairColor||g.naturalHairColor||'brown'});
 return layers;
}
