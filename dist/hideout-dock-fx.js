// Hideout only: separate the existing baked companion triangles, keeping the
// original materials, model scale and geometry. No extra skinned models.
export const DOCK_RINGS=Object.freeze([[.40,.73,.025],[.43,.49,.015],[.82,.50,.008],[1.05,.35,.008]]);
function inside(p,i,b,eps=.002){return p.getX(i)>=b.min[0]-eps&&p.getX(i)<=b.max[0]+eps&&p.getY(i)>=b.min[1]-eps&&p.getY(i)<=b.max[1]+eps&&p.getZ(i)>=b.min[2]-eps&&p.getZ(i)<=b.max[2]+eps;}
function filterIndex(T,g,ids){g.setIndex(new T.BufferAttribute(new (g.attributes.position.count>65535?Uint32Array:Uint16Array)(ids),1));}
export function removeDockRings(T,primitives,slots){
 let removed=0;
 for(const part of primitives){
  const docks=slots.filter(s=>part.material===(s.hero==='ghju'?'Néon rose':'Néon bleu'));
  if(!docks.length)continue;
  const g=part.geometry,p=g.attributes.position,index=g.index,keep=[];
  const ring=(i,s,r)=>Math.abs(p.getY(i)-r[0])<=r[2]+.004&&Math.abs(Math.hypot(p.getX(i)-s.x,p.getZ(i)-s.z)-r[1])<=r[2]+.006;
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
   if(docks.some(s=>DOCK_RINGS.some(r=>ring(a,s,r)&&ring(b,s,r)&&ring(c,s,r))))removed++;else keep.push(a,b,c);
  }
  filterIndex(T,g,keep);part.triangles=keep.length/3;
 }
 return removed;
}
function compact(T,source,indices,center){
 const g=new T.BufferGeometry(),remap=new Map(),old=[],ids=[];
 for(const i of indices){if(!remap.has(i)){remap.set(i,old.length);old.push(i);}ids.push(remap.get(i));}
 for(const [name,a] of Object.entries(source.attributes)){
  const dst=new a.array.constructor(old.length*a.itemSize);
  for(let i=0;i<old.length;i++)for(let k=0;k<a.itemSize;k++)dst[i*a.itemSize+k]=a.array[old[i]*a.itemSize+k];
  if(name==='position')for(let i=0;i<old.length;i++){dst[i*3]-=center[0];dst[i*3+1]-=center[1];dst[i*3+2]-=center[2];}
  g.setAttribute(name,new T.BufferAttribute(dst,a.itemSize,a.normalized));
 }
 filterIndex(T,g,ids);g.computeBoundingSphere();return g;
}
export function extractDockCompanions(T,root,entries){
 const groups=entries.map(e=>{const center=e.bounds.min.map((v,i)=>(v+e.bounds.max[i])/2),group=new T.Group();group.name=e.id+' · lévitation';group.position.fromArray(center);root.add(group);return{entry:e,group,center,triangles:0};});
 for(const mesh of [...root.children]){
  if(!mesh.isMesh)continue;
  const g=mesh.geometry,p=g.attributes.position,index=g.index,buckets=groups.map(()=>[]),keep=[];
  for(let i=0;i<index.count;i+=3){
   const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),k=groups.findIndex(e=>inside(p,a,e.entry.bounds)&&inside(p,b,e.entry.bounds)&&inside(p,c,e.entry.bounds));
   (k<0?keep:buckets[k]).push(a,b,c);
  }
  for(let k=0;k<groups.length;k++){if(!buckets[k].length)continue;const e=groups[k],m=new T.Mesh(compact(T,g,buckets[k],e.center),mesh.material);m.castShadow=mesh.castShadow;m.receiveShadow=mesh.receiveShadow;e.group.add(m);e.triangles+=buckets[k].length/3;}
  if(keep.length!==index.count)filterIndex(T,g,keep);
 }
 for(const e of groups)if(e.triangles!==e.entry.triangles)throw Error('Incomplete baked dock '+e.entry.id+': '+e.triangles+'/'+e.entry.triangles);
 return groups;
}
function spiral(T,color,phase){
 const pos=[],colors=[],indices=[],N=72;
 for(let i=0;i<=N;i++){
  const u=i/N,a=phase+u*Math.PI*2*1.25,r=.53-.35*u,w=.019*Math.sin(Math.PI*u)**.65,y=.44+.89*u;
  const fade=Math.sin(Math.PI*u)**.7;
  for(const sign of [-1,1]){pos.push(Math.cos(a)*(r+sign*w),y,Math.sin(a)*(r+sign*w));colors.push(fade,fade,fade);}
  if(i){const j=2*i;indices.push(j-2,j-1,j,j,j-1,j+1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);
 const mat=new T.MeshBasicMaterial({color,vertexColors:true,transparent:true,opacity:.40,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 return new T.Mesh(g,mat);
}
export function createDockVortices(T,root,slots){
 const docks=slots.map(s=>{const group=new T.Group();group.name=s.id+' · vortex de recharge';group.position.set(s.x,0,s.z);root.add(group);
  const color=s.hero==='ghju'?0xff65b1:0x57baff;
  for(let i=0;i<3;i++)group.add(spiral(T,color,i*Math.PI*2/3));
  return{group,id:s.id};});
 return{update(time){for(let i=0;i<docks.length;i++){const g=docks[i].group;g.rotation.y=time*.65+i*.7;g.scale.setScalar(1+.018*Math.sin(time*1.3+i));for(let j=0;j<g.children.length;j++)g.children[j].material.opacity=.30+.07*Math.sin(time*1.8+j+i);}},snapshot(){return docks.map(d=>({id:d.id,angle:d.group.rotation.y,strands:d.group.children.length}));},dispose(){for(const d of docks){d.group.removeFromParent();for(const m of d.group.children){m.geometry.dispose();m.material.dispose();}}}};
}
export function floatDockCompanions(groups,time){for(let i=0;i<groups.length;i++){const e=groups[i],phase=i*2.1;e.group.position.y=e.center[1]+.065*Math.sin(time*1.55+phase);e.group.rotation.y=.12*Math.sin(time*.8+phase);e.group.rotation.z=.035*Math.sin(time*1.25+phase);}}
