// Metres. Shared by rendering, collision, audio and locomotion.
export const DISTRICTS = Object.freeze([
  {id:'concourse',name:'Parvis des survivants',x:0,z:22},
  {id:'garden',name:'Archives végétales',x:-48,z:39},
  {id:'relay',name:'Relais des machines',x:60,z:-31}
]);
export const PLATFORMS = Object.freeze([
  {id:'garden',x:-48,z:39,hx:8,hz:7,height:4.8},
  {id:'relay',x:60,z:-31,hx:10,hz:7,height:7.2}
]);
export const STAIRS = Object.freeze([
  {id:'garden-stairs',platform:'garden',x:-48,halfWidth:2.2,bottomZ:62,topZ:46,height:4.8},
  {id:'relay-stairs',platform:'relay',x:60,halfWidth:2.4,bottomZ:-4,topZ:-24,height:7.2}
]);
export const LIFTS = Object.freeze([
  {id:'garden-lift',platform:'garden',x:-59,z:39,hx:3,hz:3,height:4.8,offset:0},
  {id:'relay-lift',platform:'relay',x:73,z:-31,hx:3,hz:3,height:7.2,offset:0}
]);
export const ACTIVE_INSTALLATIONS = Object.freeze([
  {x:-26,z:-51},{x:-26,z:-61},{x:40,z:55},{x:55,z:55},{x:-75,z:64},...LIFTS
]);
export function insideSurface(x,z,s,inset=0) {
  return Math.abs(x-s.x)<=s.hx-inset && Math.abs(z-s.z)<=s.hz-inset;
}
// Automatic lifts: four seconds at each landing, six seconds travelling.
// Smooth endpoints avoid a jolt in the headset. Simulation time stops on pause.
export function liftHeightAt(lift,time) {
  const phase=((time+(lift.offset||0))%20+20)%20;
  const smooth=t=>t*t*(3-2*t);
  if(phase<4)return 0;
  if(phase<10)return lift.height*smooth((phase-4)/6);
  if(phase<14)return lift.height;
  return lift.height*(1-smooth((phase-14)/6));
}
export function traversalSurfaces(x,z,time=0) {
  const found=[];
  for(const p of PLATFORMS)if(insideSurface(x,z,p))found.push({height:p.height,id:p.id});
  for(const s of STAIRS)if(Math.abs(x-s.x)<=s.halfWidth && z>=s.topZ && z<=s.bottomZ)
    found.push({height:s.height*(s.bottomZ-z)/(s.bottomZ-s.topZ),id:s.id});
  for(const l of LIFTS)if(insideSurface(x,z,l))found.push({height:liftHeightAt(l,time),id:l.id,lift:l});
  return found;
}
export function createTraversalObstacles() {
  const result=[];
  for(const p of PLATFORMS)result.push({...p,y:p.height-.22,height:.22,walkableSurface:true,surface:'metal',traversal:true});
  // Individual treads also stop projectiles. Locomotion follows their smooth ramp.
  for(const s of STAIRS){
    const steps=Math.ceil(s.height/.2),depth=(s.bottomZ-s.topZ)/steps;
    for(let i=0;i<steps;i++)result.push({x:s.x,z:s.bottomZ-depth*(i+.5),hx:s.halfWidth,hz:depth/2,
      y:s.height*(i+1)/steps-.18,height:.18,walkableSurface:true,surface:'metal',traversal:true});
  }
  for(const l of LIFTS)result.push({...l,y:-.2,height:.2,walkableSurface:true,surface:'metal',traversal:true,liftId:l.id});
  return result;
}
