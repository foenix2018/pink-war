// Sparse grime at drainage points and water with a small, non-flat normal field.
// All masks are deterministic and local; no additional lights or colliders.
export function createArenaWeathering(T,root,{low=false,wetMaterial}={}){
 const maps=[],materials=[],meshes=[],size=128,mask=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
 let seed=491;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const runs=Array.from({length:18},()=>({x:rnd(),width:.006+rnd()*.018,length:.25+rnd()*.7}));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,i=(y*size+x)*4;let stain=0;
  for(const r of runs)stain+=Math.exp(-(((u-r.x)/r.width)**2))*Math.max(0,1-(1-v)/r.length);
  const fade=Math.sin(Math.PI*u)**.6*Math.sin(Math.PI*v)**.3;
  mask[i]=mask[i+1]=mask[i+2]=255;mask[i+3]=Math.round(Math.min(.72,stain*.25)*fade*(.55+rnd()*.45)*255);
  normal[i]=128+Math.round(Math.sin(x*.34+y*.11)*13+Math.cos(y*.17)*5);normal[i+1]=128+Math.round(Math.cos(y*.31-x*.14)*13);normal[i+2]=253;normal[i+3]=255;
 }
 function texture(data){const t=new T.DataTexture(data,size,size);t.needsUpdate=true;maps.push(t);return t;}
 const grime=texture(mask),water=texture(normal);water.wrapS=water.wrapT=T.RepeatWrapping;water.repeat.set(3,3);
 if(wetMaterial&&!low){wetMaterial.normalMap=water;wetMaterial.normalScale.set(.18,.18);wetMaterial.needsUpdate=true;}
 const mat=new T.MeshStandardMaterial({map:grime,color:0x302820,roughness:.97,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});materials.push(mat);
 const placements=[];
 for(const [x,z,yaw] of [[0,-100.5,0],[100.5,0,-Math.PI/2],[0,100.5,Math.PI],[-100.5,0,Math.PI/2]]){
  const frame=new T.Matrix4().makeRotationY(yaw);frame.setPosition(x,0,z);
  for(let u=-90;u<96;u+=12){if(Math.abs(u)<14)continue;const obj=new T.Object3D();obj.position.set(u,3+rnd(),1.425);obj.scale.set(5+rnd()*4,5+rnd()*2,1);obj.updateMatrix();placements.push(frame.clone().multiply(obj.matrix));}
 }
 const streaks=new T.InstancedMesh(new T.PlaneGeometry(1,1),mat,placements.length);placements.forEach((m,i)=>streaks.setMatrixAt(i,m));streaks.name='Arène / coulures sous les joints';streaks.userData.noWorldShadow=true;root.add(streaks);meshes.push(streaks);
 // Worn tar repairs break the repeated asphalt without luminous paint.
 const tarMat=new T.MeshStandardMaterial({color:0x25252b,roughness:.64,metalness:.03});materials.push(tarMat);
 const patches=new T.InstancedMesh(new T.CircleGeometry(1,low?8:12),tarMat,24),pose=new T.Object3D();
 for(let i=0;i<24;i++){pose.position.set((rnd()-.5)*178,.006,(rnd()-.5)*178);pose.rotation.set(-Math.PI/2,0,rnd()*Math.PI);pose.scale.set(.35+rnd()*1.1,.6+rnd()*2,1);pose.updateMatrix();patches.setMatrixAt(i,pose.matrix);}
 patches.name='Arène / reprises de bitume';patches.receiveShadow=true;patches.userData.noWorldShadow=true;root.add(patches);meshes.push(patches);
 let disposed=false;return {dispose(){if(disposed)return;disposed=true;meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();m.dispose();});materials.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());}};
}
