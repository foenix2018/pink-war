import {segmentBox} from './game-logic.js';

// Camera shoulder and walls use the same world-space metres as the hero.
export function thirdPersonPosition(player,yaw,pitch,obstacles=[],eye=1.61){
 const start={x:player.x,y:(player.elevation||0)+eye-.2-(player.crouched?.45:0),z:player.z},distance=5.1;
 const end={x:start.x+Math.sin(yaw)*distance*Math.cos(pitch)+Math.cos(yaw)*.65,
  y:start.y-Math.sin(pitch)*distance,z:start.z+Math.cos(yaw)*distance*Math.cos(pitch)-Math.sin(yaw)*.65};
 let nearest=1;
 for(const box of obstacles){const hit=segmentBox(start,end,{...box,hx:box.hx+.2,hz:box.hz+.2});if(hit!==null)nearest=Math.min(nearest,Math.max(.09,hit-.05));}
 return {x:start.x+(end.x-start.x)*nearest,y:Math.max(.35,start.y+(end.y-start.y)*nearest),z:start.z+(end.z-start.z)*nearest};
}
