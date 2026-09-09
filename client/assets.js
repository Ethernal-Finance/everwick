export const ASSETS={
 name:'Fantasy Dreamland',creator:'ElvGames',nativeTileSize:16,characterFrame:24,
 source:'/assets/dreamland/',
 buildings:[[256,128,64,96],[320,144,64,80],[448,128,64,64],[256,384,64,96],[320,400,64,80],[448,384,64,64],[384,256,64,64],[448,256,64,64]],
 trees:[[128,64,32,32],[160,64,32,32],[192,64,32,64],[224,64,64,64]],
 files:{fishing:'../fishing/icons.png',desert:'FD_Desert.png',caves:'FD_Caves.png',dungeon:'FD_Dungeon.png',dungeonDoors:'FD_Dungeon_Doors.png',interior:'spr_fd_interior.png',village:'FD_Village.png',forest:'FD_Forest.png',mountains:'FD_Mountains.png',grasslands:'FD_Grasslands.png',city:'FD_City.png',water:'FD_Animated_Water.png',doors:'FD_Village_Doors.png'}
};
let promise;
export function loadAssets(){return promise??=Promise.all(Object.entries({...ASSETS.files,...Object.fromEntries(Array.from({length:40},(_,i)=>[`character${i+1}`,`Character_${String(i+1).padStart(3,'0')}.png`]))}).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([key,img]);img.onerror=()=>reject(Error(`Missing asset: ${file}`));img.src=ASSETS.source+file;}))).then(Object.fromEntries);}
