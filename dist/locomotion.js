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
