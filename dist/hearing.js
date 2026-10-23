// Gameplay acoustics are independent of the player's audio volume.
export const NOISE_RADIUS=Object.freeze({step:12,sprint:28,crouch:2,reload:8,land:26});
export const SHOT_RADIUS=Object.freeze({r9:46,duor9:46,bloom:55,lance:90,thorn:110,nova:130,m12:82});
export function soundWaypoint(enemy,target,obstacles,segmentBox) {
  const radius=(enemy.radius||.8)+.35;
  const start={x:enemy.x,y:(enemy.elevation||0)+1,z:enemy.z},end={x:target.x,y:start.y,z:target.z};
  const boxes=obstacles.filter(b=>!b.walkableSurface&&start.y>=(b.y||0)&&start.y<(b.y||0)+b.height)
    .map(b=>({...b,hx:b.hx+radius,hz:b.hz+radius}));
  const blocking=boxes.find(b=>segmentBox(start,end,b)!==null);
  if(!blocking)return target;
  const points=[];
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const p={x:blocking.x+sx*(blocking.hx+.25),y:start.y,z:blocking.z+sz*(blocking.hz+.25)};
    if(boxes.every(b=>segmentBox(start,p,b)===null))points.push(p);
  }
  points.sort((a,b)=>(Math.hypot(a.x-start.x,a.z-start.z)+Math.hypot(a.x-end.x,a.z-end.z))
    -(Math.hypot(b.x-start.x,b.z-start.z)+Math.hypot(b.x-end.x,b.z-end.z)));
  return points[0]||null;
}
export function propagateNoise(enemies,noise,obstacles,segmentBox,time) {
  const heard=[];
  for(const e of enemies){
    const eye={x:e.x,y:(e.elevation||0)+(e.aimHeight||1.15),z:e.z};
    const distance=Math.hypot(eye.x-noise.x,eye.y-noise.y,eye.z-noise.z);
    let reach=noise.radius*(e.form==='listener'?1.65:e.form==='probe'?1.2:1);
    for(const wall of obstacles)if(segmentBox(noise,eye,wall)!==null){
      reach*=wall.walkableSurface?.78:wall.surface==='metal'?.56:.43;
      if(reach<distance)break;
    }
    if(distance>reach)continue;
    e.lastHeardAt=time;e.heardKind=noise.kind;e.lastKnownX=noise.x;e.lastKnownZ=noise.z;
    e.lastKnownHeight=noise.elevation??Math.max(0,noise.y-1);
    e.alertedUntil=Math.max(e.alertedUntil||0,time+(e.form==='listener'?9:6));
    if(e.awareness!=='engaged')e.awareness='search';
    heard.push(e.id);
  }
  return heard;
}
