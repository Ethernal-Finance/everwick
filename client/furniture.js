export const ROOM={width:12,height:10,door:{x:5,y:9}};
export const FURNITURE=Object.freeze({
 bed:{name:'Willow bed',price:180,w:1,h:2,sprite:[0,192,16,32]},
 table:{name:'Oak dining table',price:100,w:2,h:1,sprite:[32,192,32,16]},
 chair:{name:'Wooden chair',price:35,w:1,h:1,sprite:[32,208,16,16]},
 bookshelf:{name:'Bookcase',price:120,w:1,h:2,sprite:[128,160,16,32]},
 plant:{name:'Potted fern',price:30,w:1,h:1,sprite:[48,128,16,32]},
 sofa:{name:'Copper sofa',price:140,w:2,h:1,sprite:[160,384,32,16]},
 chest:{name:'Keepsake chest',price:75,w:1,h:1,sprite:[80,432,16,16]},
 rug:{name:'Rose woven rug',price:90,w:3,h:3,sprite:[256,272,48,48],floor:true}
});
export function footprint(item){const f=FURNITURE[item.kind];return item.rotation%2?{w:f.h,h:f.w}:{w:f.w,h:f.h};}
