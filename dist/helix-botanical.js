// Recessed ceramic beds, cylindrical rolled rims and alpha-cut botanical
// silhouettes replace the old solid green hedge blocks in the official HQ.
export function createHelixPlanting(T,root,{queue,M,low=false,webgpu=false,random=Math.random}){
 const leaves=[],rims=[],clock=T.TSL.uniform(0),kind=webgpu?T.MeshStandardNodeMaterial:T.MeshStandardMaterial;
 const material=new kind({color:0x78955e,roughness:.85,side:T.DoubleSide,alphaTest:.42,forceSinglePass:true});
 if(webgpu){const{positionLocal,vec3,sin,uv}=T.TSL;material.positionNode=positionLocal.add(vec3(sin(positionLocal.y.mul(4).add(clock)).mul(uv().y).mul(.035),0,0));}
 const ready=new T.TextureLoader().loadAsync(new URL('./assets/m09/foliage.png',import.meta.url).href).then(map=>{map.colorSpace=T.SRGBColorSpace;map.anisotropy=low?2:4;material.map=map;material.needsUpdate=true;});
 function add(o){const w=o.hx*2,d=o.hz*2,y=o.y,h=o.kind==='hedge'?.62:.86;
  queue(M.dark,o.x,y,o.z,w*.98,.12,d*.98);
  for(const side of [-1,1]){queue(M.white,o.x,y+.10,o.z+side*(o.hz-.08),w,h-.12,.16);queue(M.white,o.x+side*(o.hx-.08),y+.10,o.z,.16,h-.12,d-.28);}
  queue(M.soil,o.x,y+h-.21,o.z,Math.max(.06,w-.26),.05,Math.max(.06,d-.26));
  const corners=[[-o.hx+.05,-o.hz+.05],[o.hx-.05,-o.hz+.05],[o.hx-.05,o.hz-.05],[-o.hx+.05,o.hz-.05]];
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];rims.push({a:new T.Vector3(o.x+a[0],y+h,o.z+a[1]),b:new T.Vector3(o.x+b[0],y+h,o.z+b[1])});}
  for(let i=0;i<Math.ceil(w*d*(low?11:18));i++)leaves.push({x:o.x+(random()-.5)*Math.max(.08,w-.35),y:y+h-.08+random()*.32,z:o.z+(random()-.5)*Math.max(.08,d-.35),angle:random()*Math.PI*2,s:.55+random()*.35});
 }
 function build(){const tmp=new T.Object3D(),leaf=new T.InstancedMesh(new T.PlaneGeometry(.9,.8),material,leaves.length);leaf.name='HELIX / feuillage découpé';root.add(leaf);
  leaves.forEach((p,i)=>{tmp.position.set(p.x,p.y+.3,p.z);tmp.rotation.set((i%5-2)*.16,p.angle,(i%3-1)*.15);tmp.scale.setScalar(p.s);tmp.updateMatrix();leaf.setMatrixAt(i,tmp.matrix);});leaf.instanceMatrix.needsUpdate=true;leaf.computeBoundingSphere();
  const rim=new T.InstancedMesh(new T.CylinderGeometry(.035,.035,1,8),M.trim,rims.length),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);rim.name='HELIX / rebords roulés';root.add(rim);
  rims.forEach(({a,b},i)=>{const delta=b.clone().sub(a),length=delta.length();q.setFromUnitVectors(up,delta.normalize());matrix.compose(a.clone().add(b).multiplyScalar(.5),q,new T.Vector3(1,length,1));rim.setMatrixAt(i,matrix);});rim.instanceMatrix.needsUpdate=true;rim.computeBoundingSphere();
 }
 return{add,build,ready,update:t=>{clock.value=t;},stats:()=>({cards:leaves.length,rims:rims.length,batches:2,wind:webgpu})};
}
