// Physical presentation is independent of aim rays, damage, tracked headset pose
// and controller anchors. All values are metres/radians in the held gun frame.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function reloadPose(progress,{pistol=false,heavy=false}={}){
 const t=clamp(progress||0,0,1),show=smooth(0,.13,t)*(1-smooth(.84,1,t));
 const out=smooth(.12,.28,t)*(1-smooth(.48,.64,t)),seat=smooth(.62,.68,t)*(1-smooth(.68,.76,t));
 const rack=smooth(.76,.81,t)*(1-smooth(.82,.92,t));
 return{x:-.035*show,y:-.045*show+seat*.012,z:.035*rack,pitch:(heavy?.21:.14)*show,yaw:(pistol?-.22:.12)*show,roll:(pistol?.31:.42)*show,
  magazineY:-out*(pistol?.12:.24),magazineZ:out*.045,magazinePitch:out*.18,hand:out,seat,rack};
}
export function createFPSMotion(){
 let phase=0,bob=0,sprint=0,turn=0,tilt=0,landing=0,lastYaw=null,lastPitch=null,lastGround=true,lastVertical=0,lastTime=null;
 const state={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,cameraY:0,cameraRoll:0,sprint:0};
 function reset(){phase=bob=sprint=turn=tilt=landing=0;lastYaw=lastPitch=lastTime=null;lastGround=true;lastVertical=0;for(const k of Object.keys(state))state[k]=0;}
 function update({time=0,dt=.016,velocity={},yaw=0,pitch=0,grounded=true,verticalSpeed=0,crouched=false,aiming=0,sprinting=false,tracked=false}={}){
  dt=clamp(dt,0,.05);if(lastTime!==null&&(time<lastTime||time-lastTime>1))reset();lastTime=time;
  const speed=Math.hypot(velocity.x||0,velocity.z||0),ads=clamp(Number(aiming)||0,0,1);
  const localSide=(velocity.x||0)*Math.cos(yaw)-(velocity.z||0)*Math.sin(yaw);
  if(lastGround===false&&grounded)landing=Math.min(.11,Math.max(0,-lastVertical)*.009);
  landing*=Math.exp(-dt*13);lastGround=grounded;lastVertical=verticalSpeed;
  phase+=speed*dt*(crouched?2.1:2.55);bob+=(Math.min(1,speed/6)*Number(grounded)-bob)*(1-Math.exp(-dt*12));
  sprint+=(Number(sprinting&&speed>6&&ads<.2)-sprint)*(1-Math.exp(-dt*10));
  const dy=lastYaw===null?0:Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw));const dp=lastPitch===null?0:pitch-lastPitch;lastYaw=yaw;lastPitch=pitch;
  turn+=(clamp(dy/Math.max(.001,dt)*.006,-.045,.045)-turn)*(1-Math.exp(-dt*16));
  tilt+=(clamp(dp/Math.max(.001,dt)*.006,-.035,.035)-tilt)*(1-Math.exp(-dt*16));
  const scale=tracked?0:1,walk=(1-ads*.9)*bob;
  Object.assign(state,{x:scale*(Math.sin(phase)*.008*walk-turn*.38+sprint*.025),
   y:scale*(-Math.abs(Math.cos(phase))*.009*walk-landing*.25-sprint*.045+tilt*.25),
   z:scale*(Math.min(0,verticalSpeed)*.0015*(1-ads)+sprint*.015),
   pitch:scale*(-tilt*.6-sprint*.14),yaw:scale*(-turn*.9+sprint*.28),roll:scale*(-turn*.8-localSide*.002*(1-ads)+sprint*.12),
   cameraY:scale*(Math.sin(phase*2)*.009*bob*(1-ads*.8)-landing),cameraRoll:scale*clamp(-localSide*.0015,-.008,.008)*(1-ads),sprint});
  return state;
 }
 return{state,update,reset};
}

// Call after assigning the normal camera pose. Never change a tracked XR camera.
export function applyFPSCameraMotion(camera,game,{tracked=false,active=true}={}){
 if(tracked||!active||!game?.player)return;
 const data=camera.userData.fpsMotion||(camera.userData.fpsMotion={driver:createFPSMotion(),time:game.time});
 const dt=Math.max(0,Math.min(.05,game.time-data.time));data.time=game.time;
 const p=game.player,state=data.driver.update({time:game.time,dt,velocity:game.playerVelocity,yaw:p.yaw,pitch:camera.rotation.x,grounded:p.grounded,verticalSpeed:p.verticalSpeed,crouched:p.crouched,aiming:Number(game.aimingPrecision||game.precisionAiming),sprinting:!!game.movement?.sprint});
 camera.position.y+=state.cameraY;camera.rotation.z+=state.cameraRoll;
}
