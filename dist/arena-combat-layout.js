// Three readable combat spaces joined by open circulation. Data is shared by
// the model and physics; the central spawn, stair approaches and lift routes stay free.
const cover=(id,x,z,hx,hz,height,role)=>Object.freeze({id,x,z,hx,hz,y:0,height,role,cover:true,kind:'arena-combat-cover',surface:'metal'});
export const ARENA_COMBAT_LAYOUT=Object.freeze([
 cover('pompe-ouest-1',-28,-22,.9,.9,5.4,'pylon'),cover('pompe-ouest-2',-28,22,.9,.9,5.4,'pylon'),
 cover('pompe-est-1',28,-22,.9,.9,5.4,'pylon'),cover('pompe-est-2',28,22,.9,.9,5.4,'pylon'),
 cover('pompage-bas',-18,-20,2.2,.75,1.12,'pump'),cover('pompage-haut',-18,20,2.2,.75,1.12,'pump'),
 cover('pompage-moteur',-30,0,1.15,2,2.15,'cabinet'),
 cover('maintenance-bas',18,-25,2.2,.75,1.12,'pump'),cover('maintenance-haut',34,16,2.2,.75,1.12,'pump'),
 cover('maintenance-moteur',35,-6,1.15,2,2.15,'cabinet')
]);
export const ARENA_COMBAT_ZONES=Object.freeze([
 {id:'pompage',x:-27,z:0,label:'01 · POMPAGE',color:0x65d9ef},
 {id:'atrium',x:0,z:-12,label:'02 · ATRIUM',color:0xe4dfcd},
 {id:'maintenance',x:32,z:1,label:'03 · MAINTENANCE',color:0xff69af}
].map(Object.freeze));
