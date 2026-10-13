import { insideRoomPolygon } from './room-layout.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export function boundaryStatus(point,polygon,radius=0,proximity=.8){
 if(!polygon||polygon.length<3)return null;
 let distance=Infinity,edge=0,closest=null;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1));
  const q={x:a.x+dx*t,y:a.y+(b.y-a.y)*t,z:a.z+dz*t},d=Math.hypot(point.x-q.x,point.z-q.z);
  if(d<distance){distance=d;edge=i;closest=q;}
 }
 const inside=distance<1e-6||insideRoomPolygon(point,polygon),remaining=inside?distance-radius:-distance-radius;
 return {inside,distance,remaining,edge,closest,strength:clamp(1-remaining/proximity),collision:remaining<=.025};
}

// Low rails preserve the skyline. The red section is local to the nearest
// collision edge; neither this mesh nor the warning moves the tracked camera.
export function createBoundaryFence(T,parent,{height=1.05,material=null}={}){
 const root=new T.Group();root.name='Waist-high boundary fence';parent.add(root);
 const steel=material||new T.MeshStandardMaterial({color:0x78858e,metalness:.72,roughness:.38});
 const geo=new T.CylinderGeometry(1,1,1,8),rails=new T.InstancedMesh(geo,steel,1800);rails.count=0;rails.frustumCulled=false;root.add(rails);
 const redMat=new T.MeshBasicMaterial({color:0xff273d,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const warning=new T.InstancedMesh(geo,redMat,4);warning.count=0;warning.frustumCulled=false;warning.renderOrder=20;root.add(warning);
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3(),up=new T.Vector3(0,1,0);
 let polygon=[],stamp='',status=null,warningKey='';
 function rod(target,index,a,b,r){const delta=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);rotation.setFromUnitVectors(up,delta.clone().normalize());scale.set(r,delta.length(),r);matrix.compose(position,rotation,scale);target.setMatrixAt(index,matrix);}
 function setPolygon(points){
  const next=(points||[]).slice(0,128).map(p=>({x:p.x,y:p.y||0,z:p.z})),key=next.map(p=>[p.x,p.y,p.z].map(v=>v.toFixed(2)).join(',')).join('|');
  if(key===stamp)return;stamp=key;polygon=next;warningKey='';warning.count=0;let n=0;
  if(polygon.length>=3)for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],length=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.max(1,Math.ceil(length/2));
   for(const y of [.18,.58,height])if(n<1800)rod(rails,n++,{...a,y:a.y+y},{...b,y:b.y+y},y===height?.026:.012);
   for(let j=0;j<steps&&n<1800;j++){const t=j/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};rod(rails,n++,p,{...p,y:p.y+height},.027);}
  }
  rails.count=n;rails.instanceMatrix.needsUpdate=true;root.visible=polygon.length>=3;
 }
 function update(point,radius=0,proximity=.8){
  status=boundaryStatus(point,polygon,radius,proximity);warning.count=status?.strength>0?4:0;if(!warning.count)return status;
  redMat.opacity=.35+.6*status.strength;const key=status.edge+'|'+status.closest.x.toFixed(2)+'|'+status.closest.z.toFixed(2)+'|'+(Number.isFinite(point.y)?point.y.toFixed(2):'');if(key===warningKey)return status;warningKey=key;
  const a=polygon[status.edge],b=polygon[(status.edge+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,half=Math.min(2,length/2);
  const along=((status.closest.x-a.x)*dx+(status.closest.z-a.z)*dz)/length,mid=Math.max(half,Math.min(length-half,along)),center={x:a.x+dx/length*mid,y:a.y,z:a.z+dz/length*mid};
  const l={x:center.x-dx/length*half,y:center.y,z:center.z-dz/length*half},r={x:center.x+dx/length*half,y:center.y,z:center.z+dz/length*half};
  const signalHeight=Math.max(height,Number.isFinite(point.y)?point.y-center.y-.15:height);
  rod(warning,0,{...l,y:l.y+.025},{...r,y:r.y+.025},.021);rod(warning,1,{...l,y:l.y+signalHeight+.01},{...r,y:r.y+signalHeight+.01},.031);
  rod(warning,2,l,{...l,y:l.y+signalHeight},.033);rod(warning,3,r,{...r,y:r.y+signalHeight},.033);warning.instanceMatrix.needsUpdate=true;return status;
 }
 root.visible=false;
 return {root,setPolygon,update,stats:()=>({height,segments:polygon.length,instances:rails.count,warning:warning.count>0,status}),dispose(){root.removeFromParent();rails.dispose();warning.dispose();geo.dispose();redMat.dispose();if(!material)steel.dispose();}};
}
