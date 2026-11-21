// A compact, precomputed navigation grid for the furnished refuge. World units = metres.
export function createHideoutNavigation(layout,{radius=.55,step=.25}={}){
 const bounds=layout.bounds,w=Math.ceil((bounds.x2-bounds.x1)/step)+1,h=Math.ceil((bounds.z2-bounds.z1)/step)+1;
 const solid=new Uint8Array(w*h),boxes=layout.colliders.filter(b=>!b.noCollision&&(b.y||0)<1.8&&(b.y||0)+b.height>.05);
 const point=i=>({x:bounds.x1+(i%w)*step,z:bounds.z1+Math.floor(i/w)*step});
 const index=(x,z)=>Math.max(0,Math.min(h-1,Math.round((z-bounds.z1)/step)))*w+Math.max(0,Math.min(w-1,Math.round((x-bounds.x1)/step)));
 for(const b of boxes){const x1=Math.max(0,Math.ceil((b.x-b.hx-radius-bounds.x1)/step)),x2=Math.min(w-1,Math.floor((b.x+b.hx+radius-bounds.x1)/step)),z1=Math.max(0,Math.ceil((b.z-b.hz-radius-bounds.z1)/step)),z2=Math.min(h-1,Math.floor((b.z+b.hz+radius-bounds.z1)/step));for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)solid[z*w+x]=1;}
 const free=(x,z)=>x>=bounds.x1&&x<=bounds.x2&&z>=bounds.z1&&z<=bounds.z2&&!boxes.some(b=>Math.abs(x-b.x)<b.hx+radius&&Math.abs(z-b.z)<b.hz+radius);
 function nearest(p){const base=index(p.x,p.z);if(!solid[base])return base;let best=-1,distance=Infinity;const bx=base%w,bz=Math.floor(base/w);for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){const x=bx+dx,z=bz+dz;if(x<0||x>=w||z<0||z>=h)continue;const i=z*w+x;if(solid[i])continue;const q=point(i),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<distance){distance=d;best=i;}}return best;}
 function clear(a,b){
  if(!free(a.x,a.z)||!free(b.x,b.z))return false;
  for(const box of boxes){let lo=0,hi=1;for(const [key,half]of [['x','hx'],['z','hz']]){const min=box[key]-box[half]-radius,max=box[key]+box[half]+radius,d=b[key]-a[key];if(Math.abs(d)<1e-9){if(a[key]<min||a[key]>max){lo=2;break;}}else{const p=(min-a[key])/d,q=(max-a[key])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)break;}}if(lo<=hi&&lo<=1&&hi>=0)return false;}
  return true;
 }
 function path(from,to){
  const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return null;
  const previous=new Int32Array(w*h);previous.fill(-1);previous[start]=start;const queue=new Int32Array(w*h);queue[0]=start;let read=0,end=1;
  while(read<end&&previous[goal]===-1){const i=queue[read++],x=i%w,z=Math.floor(i/w);for(const next of [x>0?i-1:-1,x<w-1?i+1:-1,z>0?i-w:-1,z<h-1?i+w:-1])if(next>=0&&!solid[next]&&previous[next]===-1){previous[next]=i;queue[end++]=next;}}
  if(previous[goal]===-1)return null;const points=[];for(let i=goal;i!==start;i=previous[i])points.push(point(i));points.push(point(start));points.reverse();
  const compact=[];let at=from,i=0;while(i<points.length){let j=i;while(j+1<points.length&&clear(at,points[j+1]))j++;compact.push(points[j]);at=points[j];i=j+1;}if(free(to.x,to.z)&&clear(at,to))compact.push({...to});return compact;
 }
 return{path,free,clear,point,index,solid,width:w,height:h,step};
}
