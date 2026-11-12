const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function describeEnemyImpact(enemy,at,source,damage,time=0){
 if(!(damage>0))return null;
 const dx=enemy.x-source.x,dz=enemy.z-source.z,n=Math.hypot(dx,dz)||1,c=Math.cos(enemy.yaw||0),s=Math.sin(enemy.yaw||0);
 const side=(dx*c-dz*s)/n,back=(dx*s+dz*c)/n,lever=((at?.x??enemy.x)-enemy.x)*c-((at?.z??enemy.z)-enemy.z)*s;
 const power=clamp(damage/Math.max(100,enemy.maxHp||enemy.hp||100),.04,.5)*(enemy.form==='brute'||enemy.form==='bulwark'?.55:1);
 return {time,id:(enemy.hitImpulse?.id||0)+1,pitch:back*power*.5,yaw:clamp(lever,-.7,.7)*power*.5,roll:-side*power*.42,side:Math.sign(lever||side)||1};
}
// Exact critically damped recovery: successive hits carry momentum rather than
// restarting a canned wobble. The reaction never changes simulation or aim rays.
export function createImpactMotion(){
 const state={pitch:0,yaw:0,roll:0},velocity={pitch:0,yaw:0,roll:0};let id=null,lastTime=null;
 function reset(){id=null;lastTime=null;for(const k of Object.keys(state))state[k]=velocity[k]=0;}
 return {state,reset,update(dt,time,impact){if(lastTime!==null&&(time<lastTime||time-lastTime>1))reset();lastTime=time;
  if(impact&&impact.id!==id&&(impact.time===undefined||time>=impact.time&&time-impact.time<.4)){id=impact.id;for(const k of Object.keys(state))velocity[k]=clamp(velocity[k]+(impact[k]||0)*32,-7,7);}
  const t=clamp(dt,0,.1),w=19,decay=Math.exp(-w*t);
  for(const k of Object.keys(state)){const x=state[k],v=velocity[k],j=v+w*x;state[k]=clamp((x+j*t)*decay,-.22,.22);velocity[k]=(v-w*j*t)*decay;}
  return state;
 }};
}
export function createFootPlant(){
 let active=false,anchorX=0,anchorZ=0,lastX=null,lastZ=null,lastYaw=0;
 const result={x:0,z:0,planted:false};
 return {reset(){active=false;lastX=lastZ=null;},update(x,z,{frame,lift=0,moving=false,grounded=true,reach=.55}={}){
  result.x=x;result.z=z;result.planted=false;if(!frame)return result;
  const scale=frame.scale||1,c=Math.cos(frame.yaw||0),s=Math.sin(frame.yaw||0),wx=frame.x+(x*c+z*s)*scale,wz=frame.z+(-x*s+z*c)*scale;
  const turn=Math.atan2(Math.sin((frame.yaw||0)-lastYaw),Math.cos((frame.yaw||0)-lastYaw));
  if(lastX===null||Math.hypot(frame.x-lastX,frame.z-lastZ)>.8||Math.abs(turn)>.4)active=false;
  lastX=frame.x;lastZ=frame.z;lastYaw=frame.yaw||0;
  if(!moving||!grounded||lift>.05){active=false;return result;}
  if(!active){anchorX=wx;anchorZ=wz;active=true;}
  const ax=(anchorX-frame.x)/scale,az=(anchorZ-frame.z)/scale,lx=ax*c-az*s,lz=ax*s+az*c;
  if(Math.hypot(lx-x,lz-z)>reach){active=false;return result;}
  const blend=clamp((.05-lift)/.025,0,1);result.x=x+(lx-x)*blend;result.z=z+(lz-z)*blend;result.planted=blend>.8;return result;
 }};
}
