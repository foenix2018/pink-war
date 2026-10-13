// Metres in the headset's local-floor reference space; never infer a floor from a table.
export function classifyRoomSurface(polygon, label='') {
  if(!polygon?.length)return 'object';
  const ys=polygon.map(p=>p.y),horizontal=Math.max(...ys)-Math.min(...ys)<.12;
  const y=ys.reduce((a,b)=>a+b,0)/ys.length;
  if(horizontal && (label==='floor'||(!label&&Math.abs(y)<.22)))return 'floor';
  if(horizontal&&y>1.95)return 'ceiling';
  return horizontal?'object':'wall';
}
export function insideRoomPolygon(point, polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
export function roomFloorAt(point, floors) {
  const ys=floors.filter(f=>insideRoomPolygon(point,f.polygon)).map(f=>f.polygon.reduce((sum,p)=>sum+p.y,0)/f.polygon.length);
  const supported=Number.isFinite(point.y)?ys.filter(y=>y<=point.y+.15):ys;
  if(!supported.length)return null;return Number.isFinite(point.y)?supported.sort((a,b)=>Math.abs(a-point.y)-Math.abs(b-point.y))[0]:Math.min(...supported);
}
export function roomBounds(floors) {
  const points=floors.flatMap(f=>f.polygon);if(!points.length)return null;
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),
    minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z)),floorY:Math.min(...points.map(p=>p.y))};
}
// A bounded occupancy grid is rebuilt after a scan change, not for every frame.
export function createRoomNavigation(bounds, canStand, cell=.4) {
  if(!bounds)return null;
  const width=Math.min(100,Math.ceil((bounds.maxX-bounds.minX)/cell)+1),depth=Math.min(100,Math.ceil((bounds.maxZ-bounds.minZ)/cell)+1);
  const actualCell=Math.max(cell,(bounds.maxX-bounds.minX)/(width-1||1),(bounds.maxZ-bounds.minZ)/(depth-1||1));
  const point=i=>({x:bounds.minX+(i%width)*actualCell,y:bounds.floorY,z:bounds.minZ+Math.floor(i/width)*actualCell});
  const open=new Uint8Array(width*depth),dist=new Int16Array(open.length),queue=new Int32Array(open.length);
  for(let i=0;i<open.length;i++)open[i]=+canStand(point(i),.30);
  const neighbours=i=>[i%width>0?i-1:-1,i%width<width-1?i+1:-1,i>=width?i-width:-1,i<width*(depth-1)?i+width:-1].filter(n=>n>=0&&open[n]);
  const nearest=p=>{let best=-1,score=Infinity;for(let i=0;i<open.length;i++)if(open[i]){const q=point(i),d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<score){score=d;best=i;}}return best;};
  let lastTarget=-1;
  function update(target){const id=nearest(target);if(id===lastTarget)return;lastTarget=id;dist.fill(-1);if(id<0)return;let read=0,end=1;queue[0]=id;dist[id]=0;while(read<end){const i=queue[read++];for(const n of neighbours(i))if(dist[n]<0){dist[n]=dist[i]+1;queue[end++]=n;}}}
  return {cell:actualCell,open,point,nearest,update,
    waypoint(from,target){update(target);let i=nearest(from);if(i<0||dist[i]<0)return null;for(let step=0;step<3;step++){const next=neighbours(i).filter(n=>dist[n]>=0&&dist[n]<dist[i]);if(!next.length)break;i=next[0];}return point(i);},
    reachable(from,target){update(target);const i=nearest(from);return i>=0&&dist[i]>=0;},
    freeArea(){return open.reduce((sum,v)=>sum+v,0)*actualCell*actualCell;}
  };
}
