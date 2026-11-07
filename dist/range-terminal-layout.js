// Shared by the rendered screens and mouse/touch/WebXR hit testing.
export const RANGE_TERMINALS=Object.freeze([-2,-1,0,1,2].map((lane,id)=>Object.freeze({
 id,x:lane*4.6+1.45,y:1.43,z:20.7,width:.9,height:.66,tilt:-.48
})));
export function traceRangeTerminal(origin,direction,maxDistance=4){
 if(!origin||!direction||![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z].every(Number.isFinite))return null;
 const length=Math.hypot(direction.x,direction.y,direction.z);if(length<1e-6)return null;
 let best=null;
 for(const terminal of RANGE_TERMINALS){
  const sine=Math.sin(terminal.tilt),cosine=Math.cos(terminal.tilt),ny=-sine,nz=cosine;
  const facing=direction.y*ny+direction.z*nz;if(facing>=-1e-6)continue;
  const t=((terminal.y-origin.y)*ny+(terminal.z-origin.z)*nz)/facing,distance=t*length;
  if(t<=0||distance>maxDistance||(best&&distance>=best.distance))continue;
  const point={x:origin.x+direction.x*t,y:origin.y+direction.y*t,z:origin.z+direction.z*t};
  const localX=point.x-terminal.x,localY=(point.y-terminal.y)*cosine+(point.z-terminal.z)*sine;
  if(Math.abs(localX)>terminal.width/2||Math.abs(localY)>terminal.height/2)continue;
  best={terminal,point,distance};
 }
 return best;
}
