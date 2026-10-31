// One restrained sun shadow per world, plus the existing M01 flashlight.
// Budgets depend on the device, independently from the material-detail setting.
export function shadowBudget(profile={}){
 const compact=!!(profile.phone||profile.compatible||profile.headset||profile.artQuality==='low');
 return {size:compact?1024:2048,span:compact?56:88,hz:compact?6:10,torchSize:compact?256:512};
}
export function applyWorldShadows(root){
 root.traverse(o=>{
  if(!o.isMesh)return;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  const lit=materials.some(m=>m&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial||m.isMeshPhongMaterial||m.isMeshLambertMaterial));
  const opaque=materials.some(m=>m&&(!m.transparent||m.alphaTest>0));
  let fps=false;for(let p=o.parent;p;p=p.parent)if(p.isCamera||p.userData?.noWorldShadow){fps=true;break;}
  o.castShadow=lit&&opaque&&!fps&&!o.userData?.noWorldShadow;o.receiveShadow=lit;
 });
}
export function createWorldShadows(T,{scene,renderer,light,profile={},direction={x:-58,y:94,z:34},extraLights=[]}){
 const budget=shadowBudget(profile);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 light.castShadow=true;light.shadow.mapSize.set(budget.size,budget.size);
 Object.assign(light.shadow.camera,{left:-budget.span/2,right:budget.span/2,top:budget.span/2,bottom:-budget.span/2,near:.5,far:260});light.shadow.camera.updateProjectionMatrix();
 light.shadow.bias=-.00015;light.shadow.normalBias=.021;light.shadow.radius=1.65;light.shadow.autoUpdate=false;
 if(!light.target.parent)scene.add(light.target);
 for(const source of extraLights){source.castShadow=true;source.shadow.mapSize.set(budget.torchSize,budget.torchSize);source.shadow.camera.near=.12;source.shadow.camera.far=28;source.shadow.bias=-.00012;source.shadow.normalBias=.015;source.shadow.autoUpdate=false;}
 // A single instanced soft footprint supplements contact under moving bodies.
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;data[i+3]=Math.round(Math.max(0,1-d)**2*220);}
 const texture=new T.DataTexture(data,size,size);texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.27,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 const contacts=new T.InstancedMesh(geometry,material,64);contacts.name='Ombres de contact mobiles';contacts.frustumCulled=false;contacts.count=0;contacts.renderOrder=1;scene.add(contacts);
 const matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),position=new T.Vector3(),scale=new T.Vector3();
 let lastMap=-Infinity,lastFlags=-Infinity,lastEnabled=null,lastFocus={x:Infinity,y:Infinity,z:Infinity},updates=0;
 function update(time,focus,{enabled=true,entities=[],heightAt=()=>0,force=false}={}){
  if(!focus)return;enabled=!!enabled;
  if(force||time<lastFlags||time-lastFlags>.75){applyWorldShadows(scene);lastFlags=time;}
  renderer.shadowMap.enabled=enabled;light.castShadow=enabled;contacts.visible=enabled;
  for(const source of extraLights)source.castShadow=enabled;
  const y=Number(focus.elevation)||0,texel=budget.span/budget.size,x=Math.round(focus.x/texel)*texel,z=Math.round(focus.z/texel)*texel;
  light.target.position.set(x,y,z);light.position.set(x+direction.x,y+direction.y,z+direction.z);
  const moved=Math.hypot(x-lastFocus.x,z-lastFocus.z,y-lastFocus.y)>.3;
  if(enabled&&(force||lastEnabled!==enabled||time<lastMap||time-lastMap>=1/budget.hz||moved)){
   renderer.shadowMap.needsUpdate=true;light.shadow.needsUpdate=true;
   for(const source of extraLights)if(source.visible)source.shadow.needsUpdate=true;
   lastMap=time;lastFocus={x,y,z};updates++;
  }
  lastEnabled=enabled;let count=0;
  if(enabled)for(const e of entities){
   if(count>=64||!Number.isFinite(e.x)||!Number.isFinite(e.z))continue;
   const floor=heightAt(e);if(!Number.isFinite(floor)||(e.elevation||0)-floor>=1.8)continue;const height=Math.max(0,(e.elevation||0)-floor),radius=Math.max(.3,Math.min(1.3,e.radius||.45))*(2.1+Math.min(2,height)*.35);
   position.set(e.x,floor+.022,e.z);scale.set(radius,radius*.82,1);matrix.compose(position,rotation,scale);contacts.setMatrixAt(count++,matrix);
  }
  contacts.count=count;contacts.instanceMatrix.needsUpdate=true;
 }
 return {update,light,contacts,budget,stats:()=>({...budget,enabled:!!lastEnabled,updates,contacts:contacts.count}),dispose(){contacts.removeFromParent();geometry.dispose();material.dispose();texture.dispose();}};
}

// Baked contact darkening from ground-level collision geometry. No extra light,
// no full-screen post-process, and no tint painted over an entire hollow room.
export function createGroundOcclusion(T,parent,boxes,{compact=false,floor=0}={}){
 const solids=boxes.filter(b=>!b.walkableSurface&&!b.fence&&(b.y||0)<=floor+.12&&(b.y||0)+b.height>floor+.3&&b.hx*b.hz<200);
 const root=new T.Group();root.name='Occlusion de contact / décor';parent.add(root);
 if(!solids.length)return {root,stats:()=>({boxes:0,draws:0}),dispose:()=>root.removeFromParent()};
 const bounds=solids.reduce((b,o)=>({minX:Math.min(b.minX,o.x-o.hx-1),maxX:Math.max(b.maxX,o.x+o.hx+1),minZ:Math.min(b.minZ,o.z-o.hz-1),maxZ:Math.max(b.maxZ,o.z+o.hz+1)}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
 const size=compact?512:1024,w=bounds.maxX-bounds.minX,d=bounds.maxZ-bounds.minZ,data=new Uint8Array(size*size*4),alpha=new Float32Array(size*size),feather=.65;
 for(const b of solids){
  const x0=Math.max(0,Math.floor((b.x-b.hx-feather-bounds.minX)/w*size)),x1=Math.min(size-1,Math.ceil((b.x+b.hx+feather-bounds.minX)/w*size));
  const z0=Math.max(0,Math.floor((b.z-b.hz-feather-bounds.minZ)/d*size)),z1=Math.min(size-1,Math.ceil((b.z+b.hz+feather-bounds.minZ)/d*size));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const wx=bounds.minX+(x+.5)/size*w,wz=bounds.minZ+(z+.5)/size*d;
   const outside=Math.hypot(Math.max(0,Math.abs(wx-b.x)-b.hx),Math.max(0,Math.abs(wz-b.z)-b.hz));
   const a=.25*Math.exp(-outside*outside/.075),index=(size-1-z)*size+x;
   alpha[index]=Math.min(.42,1-(1-alpha[index])*(1-a));
  }
 }
 for(let i=0;i<alpha.length;i++)data[i*4+3]=Math.round(alpha[i]*255);
 const texture=new T.DataTexture(data,size,size);texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 const geometry=new T.PlaneGeometry(w,d),mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set((bounds.minX+bounds.maxX)/2,floor+.018,(bounds.minZ+bounds.maxZ)/2);mesh.renderOrder=1;root.add(mesh);
 return {root,stats:()=>({boxes:solids.length,draws:1,resolution:size}),dispose(){root.removeFromParent();geometry.dispose();material.dispose();texture.dispose();}};
}
