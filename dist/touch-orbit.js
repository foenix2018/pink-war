// Continuous mobile camera orbit, independent of pointermove event frequency.
// Hold a finger to either side of its initial right-half contact point to turn.
export const TOUCH_ORBIT_DEADZONE=12;
export const TOUCH_ORBIT_REACH=112;
export const TOUCH_ORBIT_MAX_SPEED=2.8; // radians per second
export function createTouchOrbit({deadzone=TOUCH_ORBIT_DEADZONE,reach=TOUCH_ORBIT_REACH,maxSpeed=TOUCH_ORBIT_MAX_SPEED}={}){
 let pointer=null,startX=0,lastX=0,lastY=0,offset=0;
 function start(id,x,y){
  if(pointer!==null||!Number.isFinite(x)||!Number.isFinite(y))return false;
  pointer=id;startX=lastX=x;lastY=y;offset=0;return true;
 }
 function move(id,x,y){
  if(pointer===null||id!==pointer||!Number.isFinite(x)||!Number.isFinite(y))return {fineX:0,deltaY:0};
  const old=offset,dx=Math.max(-90,Math.min(90,x-lastX)),dy=Math.max(-90,Math.min(90,y-lastY));
  lastX=x;lastY=y;offset=x-startX;
  // Fine flick corrections at center; outside, finger position controls rate.
  return {fineX:Math.abs(old)<=deadzone&&Math.abs(offset)<=deadzone?dx:0,deltaY:dy};
 }
 function speed(){
  if(pointer===null)return 0;
  const x=Math.min(1,Math.max(0,(Math.abs(offset)-deadzone)/Math.max(1,reach-deadzone)));
  return Math.sign(offset)*maxSpeed*Math.pow(x,1.2);
 }
 function step(dt){return Number.isFinite(dt)&&dt>0?speed()*Math.min(dt,.05):0;}
 function reset(){pointer=null;startX=lastX=lastY=offset=0;}
 function end(id){if(pointer===null||id!==pointer)return false;reset();return true;}
 return {start,move,step,end,reset,get active(){return pointer!==null;},get speed(){return speed();}};
}
