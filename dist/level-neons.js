import {createNeonFixtures} from './neon-fixtures.js';

// Only explicitly selected luminaire materials are eligible. Screens, paint,
// energy fields and textured signs must never be inferred from their brightness.
export function isNeonStrip(size) {
 const [thin,width,length]=[...size].map(Math.abs).sort((a,b)=>a-b);
 return size.every(Number.isFinite)&&thin>0&&width<=.6&&length>=.25&&length>=width*3;
}

export function createLevelNeons(T,root,{materials=[],low=false,metal=null,back=null,floorHeights=[0]}={}) {
 const selected=new Set(materials),kits=new Map();let converted=0;
 const kitFor=parent=>{
  if(!kits.has(parent))kits.set(parent,createNeonFixtures(T,parent,{low,metal,back,distantThreshold:Infinity}));
  return kits.get(parent);
 };
 function box(material,size,position,rotation=[0,0,0],parent=root,frame,normalSign=null){
  if(!selected.has(material)||!isNeonStrip(size))return false;
  // Elevated walkways need upward-facing ground lights too.
  if(normalSign===null&&size[1]===Math.min(...size)&&floorHeights.some(y=>Math.abs(position[1]-size[1]/2-y)<.12))normalSign=1;
  kitFor(parent).bar(size,position,rotation,material.color.getHex(),frame,normalSign);converted++;return true;
 }
 // Run before static geometry is merged. Keeping the original parent means
 // fittings on lifts, doors and vehicles follow those objects correctly.
 function meshes(parent=root,{exclude=new Set()}={}){
  const candidates=[];parent.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!exclude.has(o)&&selected.has(o.material)&&o.geometry.type==='BoxGeometry')candidates.push(o);});
  for(const o of candidates){
   const g=o.geometry.parameters,size=[g.width*o.scale.x,g.height*o.scale.y,g.depth*o.scale.z].map(Math.abs);
   if(!isNeonStrip(size))continue;
   // Rotation remains in the original parent's coordinates. No world-origin LOD:
   // distant coordinates can still be inside a playable mission.
   if(box(o.material,size,o.position.toArray(),[o.rotation.x,o.rotation.y,o.rotation.z],o.parent))o.removeFromParent();
  }
 }
 function build(){for(const k of kits.values())k.build();}
 function stats(){const s={converted,fixtures:0,batches:0,triangles:0,lights:0};for(const k of kits.values()){const a=k.stats();for(const key of ['fixtures','batches','triangles'])s[key]+=a[key];}return s;}
 return {box,meshes,build,stats,dispose(){for(const k of kits.values())k.dispose();kits.clear();}};
}

// Powered fluorescent fixtures keep their existing instance colours and indices.
// Sharing the colour buffer also makes the halo follow blackouts and flickering.
export function roundPoweredTubes(T,mesh,{low=false}={}) {
 const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),turn=new T.Quaternion();
 for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);matrix.decompose(p,q,s);
  const alongZ=s.z>s.x,length=Math.max(s.x,s.z),radius=Math.max(.012,Math.min(.046,Math.max(s.y,Math.min(s.x,s.z))*.24));
  turn.setFromAxisAngle(new T.Vector3(0,1,0),alongZ?Math.PI/2:0);q.multiply(turn);
  mesh.setMatrixAt(i,matrix.compose(p,q,s.set(length,radius*2,radius*2)));
 }
 mesh.geometry=new T.CylinderGeometry(.5,.5,1,low?6:10).rotateZ(Math.PI/2);
 mesh.userData.physicalNeon=true;mesh.userData.noWorldShadow=true;
 const pixels=new Uint8Array(16*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<16;x++){
  const i=(y*16+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;
  pixels[i+3]=Math.round(100*Math.exp(-(((x+.5)/8-1)**2)*7)*Math.max(0,1-Math.abs((y+.5)/32-1)**8));
 }
 const map=new T.DataTexture(pixels,16,64);map.minFilter=map.magFilter=T.LinearFilter;map.needsUpdate=true;
 const material=new T.MeshBasicMaterial({map,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false});
 const geometry=new T.PlaneGeometry(1,10).rotateX(Math.PI/2).translate(0,-.6,0);
 // Texture's long axis must run along the tube (local X).
 const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const u=uv.getX(i);uv.setXY(i,uv.getY(i),u);}
 const halo=new T.InstancedMesh(geometry,material,mesh.count);halo.name='Néon / halo alimenté';
 halo.instanceMatrix=mesh.instanceMatrix;halo.instanceColor=mesh.instanceColor;
 halo.userData.noWorldShadow=true;halo.renderOrder=2;halo.computeBoundingSphere();mesh.add(halo);
 mesh.computeBoundingSphere();mesh.instanceMatrix.needsUpdate=true;
 return {dispose(){halo.removeFromParent();halo.dispose();geometry.dispose();material.dispose();map.dispose();mesh.geometry.dispose();}};
}
