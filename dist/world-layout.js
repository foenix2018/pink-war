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

/**
 * Raised pedestrian links. Coordinates are world metres.
 * Each end joins either a terrace or a fully supported landing;
 * the damaged bridge deliberately has no surface over its missing span.
 */
export const BRIDGE_LANDINGS = Object.freeze([
  Object.freeze({id:'garden-deck',x:-24,z:39,hx:2.6,hz:2.5,height:4.8,access:'garden-stairs'}),
  Object.freeze({id:'relay-deck',x:34,z:-31,hx:2.6,hz:2.5,height:7.2,access:'relay-stairs'}),
  Object.freeze({id:'ruin-deck',x:-8,z:39,hx:2.6,hz:2.5,height:4.8,access:'ruin-approach'})
]);
export const BRIDGES = Object.freeze([
  Object.freeze({id:'garden-link',name:'Passerelle Jardin',x1:-40,x2:-24,z:39,height:4.8,halfWidth:1.65,access:'garden-stairs',damage:0}),
  Object.freeze({id:'relay-link',name:'Passerelle Relais',x1:50,x2:34,z:-31,height:7.2,halfWidth:1.48,access:'relay-stairs',damage:0}),
  Object.freeze({id:'ruin-link',name:'Passerelle brisée',x1:-24,x2:-8,z:39,height:4.8,halfWidth:1.34,access:'ruin-approach',damage:1,gapFrom:.52,gapTo:.70})
]);
export const BRIDGE_APPROACHES = Object.freeze([
  Object.freeze({id:'ruin-approach',platform:'ruin-deck',x:-8,halfWidth:1.75,bottomZ:55.5,topZ:41.5,height:4.8})
]);
export const bridgeSegments = bridge => bridge.damage ?
  [[0,bridge.gapFrom],[bridge.gapTo,1]] : [[0,1]];
export function bridgeContains(bridge,x,z,inset=0) {
  if(Math.abs(z-bridge.z)>bridge.halfWidth-inset)return false;
  const dx=bridge.x2-bridge.x1;
  if(Math.abs(dx)<.001)return false;
  const t=(x-bridge.x1)/dx;
  return bridgeSegments(bridge).some(([start,end])=>t>=start&&t<=end);
}

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
  for(const deck of BRIDGE_LANDINGS)if(insideSurface(x,z,deck))found.push({height:deck.height,id:deck.id});
  for(const bridge of BRIDGES)if(bridgeContains(bridge,x,z))found.push({height:bridge.height,id:bridge.id});
  for(const ramp of BRIDGE_APPROACHES)
    if(Math.abs(x-ramp.x)<=ramp.halfWidth&&z>=ramp.topZ&&z<=ramp.bottomZ)
      found.push({height:ramp.height*(ramp.bottomZ-z)/(ramp.bottomZ-ramp.topZ),id:ramp.id});
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
  for(const deck of BRIDGE_LANDINGS)
    result.push({...deck,y:deck.height-.2,height:.2,walkableSurface:true,surface:'metal',traversal:true});
  for(const bridge of BRIDGES){
    const length=bridge.x2-bridge.x1;
    for(const [start,end] of bridgeSegments(bridge)){
      const a=bridge.x1+length*start,b=bridge.x1+length*end;
      result.push({x:(a+b)/2,z:bridge.z,hx:Math.abs(b-a)/2,hz:bridge.halfWidth,
        y:bridge.height-.18,height:.18,walkableSurface:true,surface:'metal',traversal:true,bridgeId:bridge.id});
      // Metal rails block walking and shots at their actual elevated height; the
      // space underneath remains clear.
      for(const side of [-1,1])result.push({
        x:(a+b)/2,z:bridge.z+side*(bridge.halfWidth+.08),
        hx:Math.abs(b-a)/2,hz:.075,y:bridge.height+.07,height:1.03,
        surface:'metal',traversal:true,bridgeRail:true
      });
    }
  }
  for(const ramp of BRIDGE_APPROACHES){
    const segments=Math.ceil((ramp.bottomZ-ramp.topZ)/.5),depth=(ramp.bottomZ-ramp.topZ)/segments;
    for(let i=0;i<segments;i++){
      const t=(i+.5)/segments,z=ramp.bottomZ-t*(ramp.bottomZ-ramp.topZ);
      result.push({x:ramp.x,z,hx:ramp.halfWidth,hz:depth/2,
        y:ramp.height*t-.16,height:.16,walkableSurface:true,surface:'metal',traversal:true});
      for(const side of [-1,1])result.push({x:ramp.x+side*(ramp.halfWidth+.08),z,
        hx:.075,hz:depth/2,y:ramp.height*t+.08,height:1.04,surface:'metal',traversal:true,bridgeRail:true});
    }
  }
  return result;
}
