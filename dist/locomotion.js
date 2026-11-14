export const PLAYER_SPEEDS=Object.freeze({walk:2.2,sprint:4.8,crouch:1.1,side:.9,back:.75});
export const JUMP_RULES=Object.freeze({ground:7.25,air:6.65,wall:7.0,wallPush:6.2,wallReach:.82,coyote:.10});
export function nearbyJumpWall(player,obstacles){
  let closest=null;
  for(const wall of obstacles){
    if(wall.walkableSurface||wall.height<1.1||player.elevation>=(wall.y||0)+wall.height-.2
      ||player.elevation+1.7<(wall.y||0)+.2)continue;
    const x=Math.max(wall.x-wall.hx,Math.min(wall.x+wall.hx,player.x));
    const z=Math.max(wall.z-wall.hz,Math.min(wall.z+wall.hz,player.z));
    const dx=player.x-x,dz=player.z-z,distance=Math.hypot(dx,dz);
    if(distance>JUMP_RULES.wallReach||distance<.001||closest&&distance>=closest.distance)continue;
    closest={x:dx/distance,z:dz/distance,distance,wall};
  }
  return closest;
}
export function tryJump(player,obstacles,time){
  if(player.crouched)return null;
  const ground=player.grounded||(time-(player.lastGroundedAt??-99)<JUMP_RULES.coyote&&!player.airJumps);
  if(ground){player.grounded=false;player.verticalSpeed=JUMP_RULES.ground;player.airJumps=0;player.lastGroundedAt=-99;return 'ground';}
  if((player.airJumps||0)>=1)return null;
  const wall=nearbyJumpWall(player,obstacles);
  player.airJumps=1;player.verticalSpeed=wall?JUMP_RULES.wall:JUMP_RULES.air;
  if(wall){player.jumpImpulseX=wall.x*JUMP_RULES.wallPush;player.jumpImpulseZ=wall.z*JUMP_RULES.wallPush;}
  return wall?'wall':'double';
}

// Exact integration of a damped horizontal velocity: acceleration and braking
// have the same travelled distance at 30, 60, 90 and 120 Hz.
export function inertialMove(state,targetX,targetZ,dt,{grounded=true,crouched=false}={}){
 if(!(dt>0))return{x:0,z:0};
 state.x=Number.isFinite(state.x)?state.x:0;state.z=Number.isFinite(state.z)?state.z:0;
 const stopping=Math.hypot(targetX,targetZ)<.01,rate=grounded?(stopping?12:crouched?14:8):7;
 const decay=Math.exp(-rate*dt),integral=(1-decay)/rate;
 const x=targetX*dt+(state.x-targetX)*integral,z=targetZ*dt+(state.z-targetZ)*integral;
 state.x=targetX+(state.x-targetX)*decay;state.z=targetZ+(state.z-targetZ)*decay;
 if(stopping&&Math.hypot(state.x,state.z)<.008)state.x=state.z=0;
 return{x,z};
}
