// Physical tube luminaires, shared buffers and one batch per material.
// Soft, depth-tested halos supplement the scene's existing lights; no light per tube.
export function createNeonFixtures(T,parent,{low=false,metal=null,back=null,distantThreshold=125}={}){
 const root=new T.Group();root.name='Luminaires / tubes néon';parent.add(root);
 const owned=[],geometries=[],batches=new Map(),colours=new Map(),fixtures=[];
 const geo=g=>(geometries.push(g),g),mat=m=>(owned.push(m),m);
 metal ||=mat(new T.MeshStandardMaterial({color:0x66727e,metalness:.65,roughness:.42}));
 back ||=mat(new T.MeshStandardMaterial({color:0x161e29,metalness:.4,roughness:.6}));
 const cylinder=geo(new T.CylinderGeometry(1,1,1,low?6:8)),sphere=geo(new T.SphereGeometry(1,low?6:8,4));
 const cube=geo(new T.BoxGeometry(1,1,1)),plane=geo(new T.PlaneGeometry(1,1));
 const pixels=new Uint8Array(32*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<32;x++){
  const nx=(x+.5)/16-1,ny=(y+.5)/64-1,a=Math.exp(-nx*nx*7)*Math.max(0,1-Math.abs(ny)**8);
  const i=(y*32+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(a*150);
 }
 const haloMap=new T.DataTexture(pixels,32,128);haloMap.minFilter=haloMap.magFilter=T.LinearFilter;haloMap.needsUpdate=true;
 const dummy=new T.Object3D(),identity=new T.Matrix4();let built=false,disposed=false;
 function palette(colour){
  if(!colours.has(colour)){
   const tint=new T.Color(colour),pale=tint.clone().lerp(new T.Color(0xffffff),.72);
   colours.set(colour,{
    core:mat(new T.MeshBasicMaterial({color:pale,toneMapped:false})),
    glass:mat(new T.MeshStandardMaterial({color:tint,emissive:tint,emissiveIntensity:.8,roughness:.22,metalness:.12,transparent:true,opacity:.34,depthWrite:false})),
    halo:mat(new T.MeshBasicMaterial({color:tint,map:haloMap,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false}))
   });
  }return colours.get(colour);
 }
 function add(g,m,position,scale,q,frame,role){
  dummy.position.copy(position);dummy.scale.set(...scale);dummy.quaternion.copy(q);dummy.updateMatrix();
  const key=g.uuid+m.uuid;if(!batches.has(key))batches.set(key,{g,m,role,transforms:[]});batches.get(key).transforms.push(frame.clone().multiply(dummy.matrix));
 }
 function bar(size,position,rotation=[0,0,0],colour=0xff278d,frame=identity,normalSign=null){
  if(built||disposed)throw new Error('Neon geometry is already finalized');
  const order=[0,1,2].sort((a,b)=>size[a]-size[b]),long=order[2],thin=order[0];
  const length=size[long];if(!Number.isFinite(length)||length<=0)return;
  const local=new T.Quaternion().setFromEuler(new T.Euler(...rotation));
  const axis=new T.Vector3().setComponent(long,1).applyQuaternion(local);
  const normal=new T.Vector3().setComponent(thin,normalSign??(thin===0?(position[0]>0?-1:1):thin===1&&position[1]>2?-1:1)).applyQuaternion(local);
  const across=new T.Vector3().crossVectors(axis,normal).normalize();
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,axis,normal));
  const centre=new T.Vector3(...position),radius=Math.min(.046,Math.max(.012,size[order[1]]*.24));
  const count=Math.ceil(length/2.8),pitch=length/count,p=palette(colour);
  for(let i=0;i<count;i++){
   const at=centre.clone().addScaledVector(axis,(i-(count-1)/2)*pitch),len=Math.max(.025,pitch-(count>1?.10:radius*1.4));
   const world=at.clone().applyMatrix4(frame),distant=Math.max(Math.abs(world.x),Math.abs(world.z))>distantThreshold;
   fixtures.push({centre:world.toArray(),length:len,radius,colour,distant});
   if(distant){
    add(cylinder,p.core,at,[radius*.7,len,radius*.7],q,frame,'tubes lointains');
    add(plane,p.halo,at.clone().addScaledVector(normal,radius),[radius*10,len,1],q,frame,'halo');
    continue;
   }
   add(cube,back,at.clone().addScaledVector(normal,-radius*1.45),[radius*4.6,len+radius*5,radius*1.7],q,frame,'supports');
   add(cylinder,p.glass,at,[radius,len,radius],q,frame,'verre');
   add(cylinder,p.core,at,[radius*.60,len,radius*.60],q,frame,'tubes');
   for(const side of [-1,1]){
    const end=at.clone().addScaledVector(axis,side*len/2);
    add(sphere,p.glass,end,[radius,radius,radius],q,frame,'verre');
    add(sphere,p.core,end,[radius*.60,radius*.60,radius*.60],q,frame,'tubes');
    add(cylinder,metal,at.clone().addScaledVector(axis,side*(len/2+radius*.7)),[radius*1.4,radius*1.9,radius*1.4],q,frame,'douilles');
    add(cube,metal,at.clone().addScaledVector(axis,side*len*.33).addScaledVector(normal,-radius*.65),[radius*3.2,radius*.7,radius*2.7],q,frame,'colliers');
   }
   add(plane,p.halo,at.clone().addScaledVector(normal,radius*1.1),[radius*14,len+radius*7,1],q,frame,'halo');
  }
 }
 function panel(size,position,rotation,colour,frame=identity,normalSign=null){
  const order=[0,1,2].sort((a,b)=>size[a]-size[b]),mid=order[1];
  if(size[mid]<.3)return bar(size,position,rotation,colour,frame,normalSign);
  const rows=Math.max(2,Math.min(5,Math.round(size[mid]/.22))),q=new T.Quaternion().setFromEuler(new T.Euler(...rotation));
  for(let i=0;i<rows;i++){
   const p=new T.Vector3(...position).add(new T.Vector3().setComponent(mid,(i-(rows-1)/2)*size[mid]/rows).applyQuaternion(q)),s=[...size];s[mid]=.1;
   bar(s,p.toArray(),rotation,colour,frame,normalSign);
  }
 }
 function build(){
  if(built||disposed)return;built=true;
  for(const {g,m,role,transforms} of batches.values()){
   const mesh=new T.InstancedMesh(g,m,transforms.length);mesh.name='Néon / '+role;
   transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();
   mesh.castShadow=false;mesh.receiveShadow=m===metal||m===back;mesh.userData.noWorldShadow=true;
   if(role==='halo')mesh.renderOrder=2;root.add(mesh);
  }
 }
 function stats(){let triangles=0;root.traverse(n=>{if(n.isMesh)triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3*n.count;});return {fixtures:fixtures.length,batches:root.children.length,triangles,lights:0};}
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.traverse(n=>{if(n.isInstancedMesh)n.dispose();});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());haloMap.dispose();}
 return {root,bar,panel,build,stats,dispose,fixtures};
}
