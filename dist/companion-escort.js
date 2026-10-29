import {segmentBox} from './game-logic.js';

export const companionAvailable=({mission=1,mode='campaign'}={})=>
 ['arena','training','lab'].includes(mode)||mode==='campaign'&&mission>=1;
export const COMPANION_SUPPORT_THRESHOLD=50;
export const COMPANION_SHOT=Object.freeze({
 Gaby:Object.freeze({damage:12,cost:12,interval:1.25,speed:38}),
 Cara:Object.freeze({damage:16,cost:14,interval:.9,speed:38})
});
export const companionNeedsProtection=game=>game?.state==='playing'&&game.player.hp>0&&game.player.hp<COMPANION_SUPPORT_THRESHOLD;
export const companionClear=(a,b,obstacles=[])=>!obstacles.some(box=>segmentBox(a,b,box)!==null);

// The body, not the camera, owns the orbit in FPS, third person and the range.
export function companionHover(player,time=0,defensive=true){
 const yaw=player.yaw||0,side=defensive?-1:1,phase=time*1.45+(defensive?0:Math.PI);
 const head=(player.elevation||0)+(defensive?1.61:1.71)-(player.crouched?.55:0);
 const lateral=side*(.40+.055*Math.sin(phase*.73)),back=.58+.035*Math.cos(phase*.87);
 return {head:{x:player.x,y:head,z:player.z},
  point:{x:player.x+Math.cos(yaw)*lateral+Math.sin(yaw)*back,
   y:head+.44+Math.sin(phase)*.055,
   z:player.z-Math.sin(yaw)*lateral+Math.cos(yaw)*back}};
}

export function safeCompanionHover(head,wanted,obstacles=[],yaw=0){
 const inflated=obstacles.map(b=>({...b,hx:b.hx+.18,hz:b.hz+.18,y:(b.y||0)-.18,height:b.height+.36}));
 const safe=p=>companionClear(head,p,inflated);
 if(safe(wanted))return wanted;
 const dx=wanted.x-head.x,dz=wanted.z-head.z,lateral=dx*Math.cos(yaw)-dz*Math.sin(yaw),back=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 for(const p of [
  {x:head.x-lateral*Math.cos(yaw)+back*Math.sin(yaw),y:wanted.y,z:head.z+lateral*Math.sin(yaw)+back*Math.cos(yaw)},
  {x:head.x+Math.sin(yaw)*.20,y:head.y+.36,z:head.z+Math.cos(yaw)*.20},
  {x:head.x,y:head.y+.36,z:head.z},
  {x:head.x,y:head.y+.19,z:head.z}
 ])if(safe(p))return p;
 let t=1;for(const box of inflated){const hit=segmentBox(head,wanted,box);if(hit!==null)t=Math.min(t,Math.max(0,hit-.03));}
 return {x:head.x+(wanted.x-head.x)*t,y:head.y+(wanted.y-head.y)*t,z:head.z+(wanted.z-head.z)*t};
}

export function companionThreat(game,origin){
 return game.enemies.filter(e=>e.hp>0&&e.awareness==='engaged'&&Math.hypot(e.x-game.player.x,e.z-game.player.z)<22)
  .sort((a,b)=>Math.hypot(a.x-game.player.x,a.z-game.player.z)-Math.hypot(b.x-game.player.x,b.z-game.player.z))
  .find(e=>companionClear(origin,{x:e.x,y:(e.elevation||0)+(e.aimHeight||1.25),z:e.z},game.obstacles));
}

export function fireCompanionShot(game,name,origin,target,color){
 const cfg=COMPANION_SHOT[name],end={x:target.x,y:(target.elevation||0)+(target.aimHeight||1.25),z:target.z};
 if(!companionNeedsProtection(game)||!cfg||!game.enemies.includes(target)||!companionClear(origin,end,game.obstacles))return false;
 const n=Math.hypot(end.x-origin.x,end.y-origin.y,end.z-origin.z);if(n<.05)return false;
 const bullet={id:game.nextId++,...origin,vx:(end.x-origin.x)/n*cfg.speed,vy:(end.y-origin.y)/n*cfg.speed,vz:(end.z-origin.z)/n*cfg.speed,
  life:1.4,damage:cfg.damage,hostile:false,weapon:'companion',power:.5,splash:0,companion:true,companionName:name,color,
  originX:origin.x,originY:origin.y,originZ:origin.z,originElevation:origin.y};
 game.bullets.push(bullet);
 game.event('companion-shot',{name,origin:{...origin},bulletId:bullet.id,weapon:'companion',power:.5,color});
 return true;
}
