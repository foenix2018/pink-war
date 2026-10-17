import * as T from './vendor/three.webgpu.min.js';

// A closed, convex shell with real interior rings. Unlike bending only an
// extruded outline, its centre and chamfer catch a continuous moving highlight.
// -Z is the outward/front surface, in the same frame as the existing armour.
export function profiledPanel(points,{depth=.018,bulge=.018,round=.12,detail=3}={}){
  let outline=points.map(p=>[...p]);
  const area=outline.reduce((a,p,i)=>{const q=outline[(i+1)%outline.length];return a+p[0]*q[1]-q[0]*p[1];},0);
  if(area<0)outline.reverse();
  if(round>0){const source=outline;outline=[];for(let i=0;i<source.length;i++){const a=source[(i+source.length-1)%source.length],b=source[i],c=source[(i+1)%source.length];outline.push([b[0]+(a[0]-b[0])*round,b[1]+(a[1]-b[1])*round],[b[0]+(c[0]-b[0])*round,b[1]+(c[1]-b[1])*round]);}}
  const n=outline.length,cx=outline.reduce((s,p)=>s+p[0],0)/n,cy=outline.reduce((s,p)=>s+p[1],0)/n;
  const rx=Math.max(...outline.map(p=>Math.abs(p[0]-cx))),ry=Math.max(...outline.map(p=>Math.abs(p[1]-cy)));
  const position=[],uv=[],index=[],rings=detail>=4?[1,.94,.69,.30]:[1,.86,.42];
  const vertex=(x,y,z)=>{position.push(x,y,z);uv.push(.5+(x-cx)/(rx*2),.5+(y-cy)/(ry*2));};
  for(let r=0;r<rings.length;r++){
    const scale=rings[r],z=-depth/2-bulge*(1-scale*scale)+(r===0?Math.min(.002,depth*.16):0);
    for(const p of outline)vertex(cx+(p[0]-cx)*scale,cy+(p[1]-cy)*scale,z);
    if(r)for(let j=0;j<n;j++){const a=(r-1)*n+j,b=(r-1)*n+(j+1)%n,c=r*n+j,d=r*n+(j+1)%n;index.push(a,c,b,b,c,d);}
  }
  const front=position.length/3;vertex(cx,cy,-depth/2-bulge);
  for(let j=0;j<n;j++)index.push((rings.length-1)*n+j,front,(rings.length-1)*n+(j+1)%n);
  const back=position.length/3;for(const p of outline)vertex(p[0],p[1],depth/2);
  const center=position.length/3;vertex(cx,cy,depth/2);
  for(let j=0;j<n;j++){const k=(j+1)%n;index.push(back+j,back+k,center,j,k,back+j,k,back+k,back+j);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();g.computeBoundingBox();g.userData.profiled=true;return g;
}
