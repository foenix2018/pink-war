// Range-only skyline and sky: hiding the range also hides this entire exterior.
export function createRangeExterior(T,parent,{low=false,surfaces=null}={}){
 const root=new T.Group();root.name='Stand / extérieur Vesper';parent.add(root);
 const geometries=[],materials=[],textures=[],batches=new Map(),dummy=new T.Object3D();
 const ownGeo=g=>(geometries.push(g),g),ownMat=m=>(materials.push(m),m);
 let facadeMap=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#a1aab7';c.fillRect(0,0,256,512);let seed=71;
  for(let i=0;i<18000;i++){seed=(seed*16807)%2147483647;const x=seed%256;seed=(seed*16807)%2147483647;const y=seed%512;c.fillStyle=i%2?'#8993a333':'#15283a22';c.fillRect(x,y,1+i%3,1+i%7);}
  c.strokeStyle='#35475b';c.lineWidth=2;for(let x=0;x<256;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,512);c.stroke();}
  for(let y=0;y<512;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
  facadeMap=new T.CanvasTexture(canvas);facadeMap.colorSpace=T.SRGBColorSpace;textures.push(facadeMap);
 }
 const cube=ownGeo(new T.BoxGeometry(1,1,1));
 const facade=ownMat(new T.MeshStandardMaterial({color:0x66788c,map:facadeMap,bumpMap:facadeMap,bumpScale:.06,roughness:.91,metalness:.12}));
 const ribs=ownMat(new T.MeshStandardMaterial({color:0x657184,roughness:.69,metalness:.32}));
 surfaces?.bind(facade,'concrete',[2,3]);surfaces?.bind(ribs,'steel');
 const rose=ownMat(new T.MeshBasicMaterial({color:0xd53d8e})),cyan=ownMat(new T.MeshBasicMaterial({color:0x659fbd}));
 function box(m,x,y,z,w,h,d){if(!batches.has(m))batches.set(m,[]);dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,0,0);dummy.updateMatrix();batches.get(m).push(dummy.matrix.clone());}
 let skyMap=null;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,512);
  for(const [at,color] of [[0,'#111d39'],[.28,'#354967'],[.43,'#bd5c9e'],[.52,'#de8ca5'],[.61,'#513e65'],[1,'#161c32']])g.addColorStop(at,color);
  c.fillStyle=g;c.fillRect(0,0,1024,512);
  // Broad cloud banks; seamless at the equirectangular join.
  for(let i=0;i<60;i++){
   const x=i*173%1024,y=105+i*61%160,r=45+i%7*13;
   const cloud=c.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,'rgba(11,24,48,.24)');cloud.addColorStop(1,'rgba(11,24,48,0)');
   c.fillStyle=cloud;c.save();c.translate(0,y);c.scale(1,.28);c.translate(0,-y);c.fillRect(x-r,y-r,r*2,r*2);c.restore();
  }
  const skyPixels=c.getImageData(0,0,1024,512);let skySeed=97;for(let i=0;i<skyPixels.data.length;i+=4){skySeed=(skySeed*16807)%2147483647;const grain=(skySeed%5)-2;for(let channel=0;channel<3;channel++)skyPixels.data[i+channel]+=grain;}c.putImageData(skyPixels,0,0);
  skyMap=new T.CanvasTexture(canvas);skyMap.colorSpace=T.SRGBColorSpace;skyMap.mapping=T.EquirectangularReflectionMapping;textures.push(skyMap);
 }
 const sky=new T.Mesh(ownGeo(new T.SphereGeometry(210,32,16)),ownMat(new T.MeshBasicMaterial({map:skyMap,color:skyMap?0xffffff:0x745683,side:T.BackSide,fog:false,depthWrite:false})));
 sky.position.set(0,0,-13);sky.name='Ciel extérieur / crépuscule';sky.renderOrder=-10;sky.userData.noWorldShadow=true;root.add(sky);
 // Buildings are outside the physical enclosure; no obstacles intrude into the
 // five shooting lanes. Stepped roofs and facade ribs break up the silhouette.
 for(const side of [-1,1])for(let i=0;i<9;i++){
  const x=side*(23+(i%3)*7),z=33-i*13,height=9+(i*7%19),width=7+i%3;
  box(facade,x,height/2,z,width,height,9);
  box(ribs,x,height-.6,z,width+.4,.55,9.4);
  box(facade,x+side*.8,height+1.3,z,4,2.6,4.5);
  box(ribs,x,height+3.9,z,.12,5,.12);
  box(rose,x,height+6.4,z,.18,.18,.18);
  for(let y=3;y<height-1;y+=3.1){
   box(ribs,x-side*(width/2+.04),y,z,.12,.13,9.1);
   for(let j=0;j<4;j++)if((i+j+Math.floor(y))%3!==0)box((i+j)%3?cyan:rose,x-side*(width/2+.12),y+.9,z-3+j*1.8,.06,.65,.72);
  }
  for(const dz of [-3.8,3.8])box(ribs,x-side*(width/2+.10),height/2,z+dz,.18,height,.18);
  if(i%3===0)box(rose,x-side*(width/2+.16),height*.7,z,.08,3.8,.45);
 }
 // A broken rear skyline is visible through the longitudinal roof opening.
 for(let i=0;i<8;i++){
  const height=12+(i*11%17),x=-36+i*10;
  box(facade,x,height/2,-88,7,height,8);box(ribs,x,height,-88,7.5,.4,8.5);
  for(let y=4;y<height;y+=3)box(i%2?rose:cyan,x,y,-83.95,3.4,.18,.04);
 }
 for(const [m,matrices] of batches){const mesh=new T.InstancedMesh(cube,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();mesh.name='Vesper / façades extérieures';root.add(mesh);}
 // Thin light shafts are visual haze, with no additional real-time spotlights.
 const shaftMat=ownMat(new T.MeshBasicMaterial({color:0x6bcaff,transparent:true,opacity:.012,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
 const shaftGeo=ownGeo(new T.ConeGeometry(1,1,12,1,true));
 for(const z of [13,-13,-39])for(const side of [-1,1]){
  const a=new T.Vector3(side*8.8,4.36,z),b=new T.Vector3(side*5,.2,z-3),delta=a.clone().sub(b);
  const mesh=new T.Mesh(shaftGeo,shaftMat);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1.45,delta.length(),1.45);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.userData.noWorldShadow=true;root.add(mesh);
 }
 const count=low?160:360,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){positions[i*3]=((i*83)%997)/997*14-7;positions[i*3+1]=.4+(i*47%89)/89*4.3;positions[i*3+2]=((i*127)%991)/991*88-60;}
 const particles=ownGeo(new T.BufferGeometry());particles.setAttribute('position',new T.BufferAttribute(positions,3));
 const dust=new T.Points(particles,ownMat(new T.PointsMaterial({color:0xa5bfd2,size:.025,transparent:true,opacity:.24,depthWrite:false})));dust.name='Poussière dans la lumière extérieure';root.add(dust);
 let disposed=false;
 return {root,environment:skyMap,update(time){dust.position.y=Math.sin(time*.15)*.12;},stats:()=>({buildings:26,roofOpening:true,particles:count,extraLights:0}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.traverse(n=>{if(n.isInstancedMesh)n.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
