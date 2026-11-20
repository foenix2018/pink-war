export const PLAYER_SPEEDS=Object.freeze({walk:2.2,sprint:4.8,crouch:1.1,side:.75,strafeMax:2.2,back:.75});
export const GAMEPAD_SPEED_MULTIPLIER=1.25;
export const TOUCH_SPEED_MULTIPLIER=1.25;
export const touchAnalogSprint=(x,z)=>Math.hypot(Number(x)||0,Number(z)||0)>=.88;
export const JUMP_RULES=Object.freeze({ground:7.25,air:6.65,wall:7.0,wallPush:6.2,wallReach:.82,coyote:.10});
// The second airborne press arms the compact thrusters for a short, finite hold.
// Hold the second press to hover for up to two seconds; releasing stops the thrusters at once and they do not recharge in the air.
export const JETPACK_RULES=Object.freeze({maxDuration:2,boostWindow:.16,brake:14,settleSpeed:.08,lowFuel:.2});
// Fuel left, from 1 (full) to 0 (empty): drives the gauge on the pack and the sputter of the thrusters.
export const jetpackFuel=player=>player?.jetpackArmed?Math.max(0,Math.min(1,1-(player.jetpackElapsed||0)/JETPACK_RULES.maxDuration)):0;
export function updateJetpack(player,dt,held){
  if(player.grounded||!held||!player.jetpackArmed){player.jetpackArmed=false;player.jetpackActive=false;return false;}
  player.jetpackElapsed=(player.jetpackElapsed||0)+Math.max(0,dt);
  if(player.jetpackElapsed>=JETPACK_RULES.maxDuration){player.jetpackArmed=false;player.jetpackActive=false;return false;}
  player.jetpackActive=true;
  if(player.jetpackElapsed>JETPACK_RULES.boostWindow){
    const alpha=1-Math.exp(-JETPACK_RULES.brake*dt);
    player.verticalSpeed+=(JETPACK_RULES.settleSpeed-player.verticalSpeed)*alpha;
  }
  return true;
}

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
  if(ground){player.grounded=false;player.verticalSpeed=JUMP_RULES.ground;player.airJumps=0;player.lastGroundedAt=-99;player.jetpackArmed=false;player.jetpackActive=false;player.jetpackElapsed=0;return 'ground';}
  if((player.airJumps||0)>=1)return null;
  const wall=nearbyJumpWall(player,obstacles);
  player.airJumps=1;player.verticalSpeed=wall?JUMP_RULES.wall:JUMP_RULES.air;
  player.jetpackArmed=!wall;player.jetpackActive=!wall;player.jetpackElapsed=0;
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

// Slide: pressing crouch while sprinting throws the player low along the run direction, feet first. The speed is a burst
// that eases out over the slide, the body stays crouched (low hitbox and camera), and a cooldown stops it being chained.
export const SLIDE_RULES=Object.freeze({duration:.8,boost:1.45,minSpeed:3.2,maxSpeed:8.2,cooldown:1.3,jumpCancelAfter:.18});
export function canSlide(player,velocity,sprinting){
  if(!player||!player.grounded||player.crouched||(player.slideTime||0)>0||(player.slideCooldown||0)>0)return false;
  const speed=Math.hypot(velocity?.x||0,velocity?.z||0);
  return !!sprinting&&speed>=SLIDE_RULES.minSpeed;
}
export function startSlide(player,velocity){
  const speed=Math.hypot(velocity.x,velocity.z);
  player.sliding=true;player.slideTime=SLIDE_RULES.duration;player.crouched=true;
  player.slideSpeed=Math.min(SLIDE_RULES.maxSpeed,speed*SLIDE_RULES.boost);
  player.slideDirX=velocity.x/speed;player.slideDirZ=velocity.z/speed;
  return player.slideSpeed;
}
export function endSlide(player){
  if(!player.sliding)return;
  player.sliding=false;player.slideTime=0;player.slideSpeed=0;player.crouched=false;player.slideCooldown=SLIDE_RULES.cooldown;
}
// Advance the slide by dt: returns the planar velocity to apply, or null when it is over (the player stands up).
export function slideVelocity(player,dt){
  if(!player.sliding)return null;
  player.slideTime=Math.max(0,player.slideTime-dt);
  if(player.slideTime<=0||!player.grounded){endSlide(player);return null;}
  const k=player.slideTime/SLIDE_RULES.duration,speed=player.slideSpeed*(.25+.75*k*k);
  return{x:player.slideDirX*speed,z:player.slideDirZ*speed};
}
export function tickSlideCooldown(player,dt){if((player.slideCooldown||0)>0)player.slideCooldown=Math.max(0,player.slideCooldown-dt);}
