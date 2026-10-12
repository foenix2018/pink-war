const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// Heading follows Three's camera: zero looks down -Z, positive yaw looks left.
// The same bearing feeds the flat HUD and the head-tracked WebXR strip.
export function portalIndicators(portals,player,heading,time,state='playing') {
  if(state!=='playing')return [];
  return (portals||[]).slice(0,3).map(portal=>{
    const dx=portal.x-player.x,dz=portal.z-player.z;
    const angle=Math.atan2(Math.sin(Math.atan2(-dx,-dz)-heading),Math.cos(Math.atan2(-dx,-dz)-heading));
    const pending=time<(portal.openedAt||0),age=time-(portal.openedAt||0);
    return {id:portal.id,offset:clamp(-angle/(Math.PI*.5),-1,1),behind:Math.abs(angle)>Math.PI*.5,
      pending,opacity:pending?.42:age<2?.68+.32*Math.abs(Math.sin(age*7)):1};
  });
}
