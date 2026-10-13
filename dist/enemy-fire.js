const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function hostileShotProfile(wave=1,form='stalker'){
  const level=Math.max(1,wave),probe=form==='probe';
  return {speed:Math.min(66,(probe?29:36)+level*.8),interval:Math.max(probe?.95:.88,(probe?2.15:2.1)-level*.055),lead:form==='seer'?.28:form==='listener'?.24:probe?.18:.20};
}
// An intercept chosen once, using visible motion. Bullets never follow the target.
export function predictShot(origin,target,velocity,speed,maxLead=.2){
  const distance=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
  const t=Math.min(maxLead,distance/Math.max(1,speed));
  return {x:target.x+clamp(velocity?.x||0,-12,12)*t,
    y:target.y+clamp(velocity?.y||0,-12,12)*t,z:target.z+clamp(velocity?.z||0,-12,12)*t};
}
