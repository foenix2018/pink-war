import {sampleCurtainPoint} from './fabric-motion.js';

// Real woven highlights rather than metallic shine. Physical materials render
// in both engines; only the hanging-curtain deformation uses native TSL nodes.
export function createFabricFinish(T,{color=0x708f8c,map=null,normalMap=null,roughness=.83,sheenColor=0xc0d0cf,native=false,physical=true}={}){
 const Material=native?(physical?T.MeshPhysicalNodeMaterial:T.MeshStandardNodeMaterial):(physical?T.MeshPhysicalMaterial:T.MeshStandardMaterial);
 const material=new Material({color,map,normalMap,normalScale:new T.Vector2(.08,.08),roughness,metalness:0,
  ...(physical?{sheen:.72,sheenRoughness:.68,sheenColor}:{}),side:T.DoubleSide});
 material.forceSinglePass=true;
 material.name='Tissu tissé / reflet doux des fibres';
 return material;
}

function wovenMaps(T){
 const w=128,h=256,color=new Uint8Array(w*h*4),normal=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,thread=(x%4<2?3:-3)+(y%4<2?2:-2),hem=y<11||y>h-8||x<3||x>w-4;
  const stitch=hem&&(x+y)%7<2?22:0,c=(hem?190:229)+thread+stitch;
  color.set([c,c,c,255],i);
  normal.set([128+Math.round(25*Math.sin(x*Math.PI/2)),128+Math.round(22*Math.sin(y*Math.PI/2)),250,255],i);
 }
 const map=new T.DataTexture(color,w,h),normalMap=new T.DataTexture(normal,w,h);
 for(const t of [map,normalMap]){t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;}
 map.colorSpace=T.SRGBColorSpace;
 normalMap.wrapS=normalMap.wrapT=T.RepeatWrapping;normalMap.repeat.set(24,32);
 return {map,normalMap};
}

// One shader/material per ward, shared by every curtain. Size, phase and wind
// are vertex attributes so a row of patient bays does not compile a shader per panel.
export function createCurtainFabric(T,{webgpu=false,low=false,color=0x708f8c}={}){
 const native=!!(webgpu&&T.TSL&&T.MeshPhysicalNodeMaterial),maps=wovenMaps(T);
 const material=createFabricFinish(T,{...maps,color,native,physical:webgpu&&!low}),clock=native?T.TSL.uniform(0):{value:0},panels=[],world=new T.Vector3();
 if(native){
  const S=T.TSL,size=S.attribute('fabricSize','vec4');
  const point=S.Fn(([u,inputV])=>{
   const v=S.clamp(inputV,0,1),t=clock.add(size.z),wind=size.w,slack=v.pow(1.5);
   const gust=S.sin(t.mul(.49).add(u.mul(4))).mul(.20).add(.80);
   const sway=S.sin(t.mul(.90).add(u.mul(3.5))).mul(.13).add(S.sin(t.mul(1.32).add(v.mul(3))).mul(.050));
   const x=u.sub(.5).mul(size.x).add(wind.mul(slack).mul(sway)).add(wind.mul(.027).mul(v.pow(2.1)));
   const y=v.mul(size.y).negate().add(wind.mul(.012).mul(v.pow(2)).mul(S.sin(t.mul(2.10).sub(u.mul(12)))));
   const ripple=S.sin(t.mul(1.68).sub(u.mul(10)).add(v.mul(5.4))).mul(.185)
    .add(S.sin(t.mul(2.25).add(u.mul(23)).sub(v.mul(7.6))).mul(.068))
    .add(S.sin(t.mul(.62).add(u.mul(4.5)).add(v.mul(13))).mul(.030));
   const z=S.cos(u.mul(Math.PI*12)).mul(.075).add(wind.mul(gust).mul(slack).mul(ripple));
   return S.vec3(x,y,z);
  });
  const u=S.uv().x,v=S.float(1).sub(S.uv().y);
  material.positionNode=point(u,v);
  material.castShadowPositionNode=material.positionNode;
  // Normals of the animated surface, including the broad pleats. A normal map
  // alone would leave the moving fabric lit as a rigid flat rectangle.
  const du=point(u.add(.001),v).sub(point(u.sub(.001),v));
  const dv=point(u,v.add(.001)).sub(point(u,v.sub(.001)));
  const n=S.normalize(S.cross(dv,du)).toVarying('vFabricNormal'),weave=S.texture(maps.normalMap).rg.sub(.5).mul(.04);
  material.normalNode=S.transformNormalToView(S.normalize(S.vec3(n.x.add(weave.x),n.y.add(weave.y),n.z))).mul(S.faceDirection);
  material.userData.fabricMotion='WebGPU / rideau à plis et ondulations';
 }
 let disposed=false;
 function panel({width=2.6,height=1.95,phase=0,wind=.24}={}){
  const columns=low?24:48,rows=low?18:32,g=new T.PlaneGeometry(width,height,columns,rows),uv=g.attributes.uv;
  const sizes=new Float32Array(uv.count*4);
  for(let i=0;i<uv.count;i++)sizes.set([width,height,phase,wind],i*4);
  g.setAttribute('fabricSize',new T.BufferAttribute(sizes,4));
  if(!native)g.attributes.position.setUsage(T.DynamicDrawUsage);
  // The analytical bounds include the full wind envelope, so frustum culling
  // remains correct without reading animated vertices back from the GPU.
  g.boundingBox=new T.Box3(new T.Vector3(-width/2-.30,-height-.04,-.40),new T.Vector3(width/2+.30,.04,.40));
  g.boundingSphere=g.boundingBox.getBoundingSphere(new T.Sphere());
  const mesh=new T.Mesh(g,material);mesh.name='Rideau de soins / tissu plissé animé';mesh.castShadow=!low;mesh.receiveShadow=true;
  const record={mesh,options:{width,height,phase,wind},lastTime:null};panels.push(record);
  // A rest-pose mesh also gives shadow normal bias the real pleat normals;
  // using a flat plane here produces dark seams on the native folded surface.
  deform(record,clock.value);
  return mesh;
 }
 const sample={};
 function deform(record,time){
  if(record.lastTime===time)return;record.lastTime=time;
  const g=record.mesh.geometry,p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){sampleCurtainPoint(uv.getX(i),1-uv.getY(i),time,record.options,sample);p.setXYZ(i,sample.x,sample.y,sample.z);}
  p.needsUpdate=true;g.computeVertexNormals();
 }
 return {material,native,panel,update(time,eye=null){
  clock.value=time;
  for(const record of panels){
   if(eye){record.mesh.getWorldPosition(world);record.mesh.visible=world.distanceToSquared(eye)<(low?35:60)**2;}
   if(!native&&record.mesh.visible)deform(record,time);
  }
 },stats:()=>({panels:panels.length,native,verticesPerPanel:(low?25:49)*(low?19:33)}),
 dispose(){if(disposed)return;disposed=true;for(const {mesh} of panels){mesh.removeFromParent();mesh.geometry.dispose();}material.dispose();maps.map.dispose();maps.normalMap.dispose();}};
}
