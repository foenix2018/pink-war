import * as T from './vendor/three.webgpu.min.js';
import {parsePWM} from './blender-models.js';
import {bevelBox,merge,matrix} from './geo.js';

// The window is a view into a separate 3D scene. An off-axis camera uses the
// actual eye/window geometry, so near buildings move against distant towers
// when the player moves. It is not a scrolling photograph.
export function windowFrustum(eye,{left=-10.8,right=10.8,bottom=1.2,top=4.65,z=-11.57,near=.1,far=220}={}){
 const distance=Math.max(.22,eye.z-z);
 return{left:(left-eye.x)*near/distance,right:(right-eye.x)*near/distance,bottom:(bottom-eye.y)*near/distance,top:(top-eye.y)*near/distance,near,far};
}

export async function createHideoutCity(materials,{low=false}={}){
 const response=await fetch(new URL('./assets/hideout/city.pwm.gz',import.meta.url));if(!response.ok)throw Error('Vue de Vesper indisponible');
 const packed=await response.arrayBuffer();let bytes;
 if(String.fromCharCode(...new Uint8Array(packed,0,4))==='PWM1')bytes=packed;
 else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 else{const {gunzipSync}=await import('./vendor/fflate.module.js');const b=gunzipSync(new Uint8Array(packed));bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
 const parsed=parsePWM(T,bytes),scene=new T.Scene();scene.name='Vesper · avenue et profondeur';scene.background=new T.Color(0x20162b);scene.fog=new T.FogExp2(0x3b233d,.008);
 for(const p of parsed.primitives){const mesh=new T.Mesh(p.geometry,materials.get(p.material));mesh.name='Vesper / '+p.material;scene.add(mesh);}
 scene.add(new T.HemisphereLight(0x8b9fbf,0x281426,1.2));const moon=new T.DirectionalLight(0x91a4c8,1.8);moon.position.set(-25,40,0);scene.add(moon);
 for(const [color,x,z]of [[0xff4b93,-14,-22],[0x55bdff,14,-27]]){const light=new T.PointLight(color,100,35,2);light.position.set(x,3,z);scene.add(light);}
 const camera=new T.PerspectiveCamera();camera.name='Vue décentrée de la baie';
 const target=new T.RenderTarget(low?640:1280,low?160:256,{depthBuffer:true});target.texture.colorSpace=T.SRGBColorSpace;target.texture.generateMipmaps=false;target.texture.minFilter=T.LinearFilter;
 const ownMaterials=[],ownGeometry=[],ownTextures=[];
 const sky=document.createElement('canvas');sky.width=512;sky.height=256;const skyContext=sky.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#0c1224');skyGradient.addColorStop(.53,'#52607c');skyGradient.addColorStop(.68,'#483249');skyGradient.addColorStop(1,'#131420');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256);
 for(const [x,color]of [[105,'rgba(189,55,116,.42)'],[372,'rgba(55,142,184,.38)']]){const glow=skyContext.createRadialGradient(x,146,4,x,146,80);glow.addColorStop(0,color);glow.addColorStop(1,'rgba(0,0,0,0)');skyContext.fillStyle=glow;skyContext.fillRect(x-80,66,160,160);}
 const reflection=new T.CanvasTexture(sky);reflection.colorSpace=T.SRGBColorSpace;reflection.mapping=T.EquirectangularReflectionMapping;scene.environment=reflection;scene.environmentIntensity=.65;ownTextures.push(reflection);
 const material=(parameters,Kind=T.MeshStandardMaterial)=>{const m=new Kind(parameters);ownMaterials.push(m);return m;};
 const geometry=g=>{ownGeometry.push(g);return g;};
 const bodyMaterial=material({color:0x303e4b,metalness:.75,roughness:.3}),glassMaterial=material({color:0x12374a,metalness:.65,roughness:.14});
 const glowMaterial=material({color:0xff74b3,toneMapped:false},T.MeshBasicMaterial);
 const bodyGeometry=geometry(merge([
  bevelBox(2.5,.48,1.05,.12,2),bevelBox(1.35,.34,.86,.12,2).applyMatrix4(matrix([-.15,.33,0])),
  ...[-1,1].flatMap(x=>[-1,1].map(z=>new T.CylinderGeometry(.22,.19,.16,12).applyMatrix4(matrix([x*.85,-.29,z*.42]))))
 ]));
 const cabinGeometry=geometry(bevelBox(1.15,.21,.81,.08,2).applyMatrix4(matrix([-.17,.43,0])));
 const lampGeometry=geometry(merge([-1,1].map(side=>new T.CylinderGeometry(.025,.025,1.1,8).applyMatrix4(matrix([.20,.10,side*.54],[0,0,Math.PI/2])))));
 const trafficCount=low?6:12,traffic=[bodyGeometry,cabinGeometry,lampGeometry].map((g,i)=>{const mesh=new T.InstancedMesh(g,[bodyMaterial,glassMaterial,glowMaterial][i],trafficCount);mesh.frustumCulled=false;scene.add(mesh);return mesh;});
 function softTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,3,64,64,63);g.addColorStop(0,'rgba(230,218,239,.55)');g.addColorStop(.5,'rgba(201,190,220,.18)');g.addColorStop(1,'rgba(180,170,200,0)');x.fillStyle=g;x.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;ownTextures.push(t);return t;}
 const mistTexture=softTexture(),mistMaterial=material({map:mistTexture,transparent:true,opacity:.30,depthWrite:false,color:0xbda7c0,fog:true},T.MeshBasicMaterial);
 const mistGeometry=geometry(new T.PlaneGeometry(1,1)),mistCount=low?9:16,mist=new T.InstancedMesh(mistGeometry,mistMaterial,mistCount);mist.frustumCulled=false;scene.add(mist);
 const rainCount=low?70:150,rainGeometry=geometry(new T.PlaneGeometry(.012,.55)),rainMaterial=material({color:0xb5bdd3,transparent:true,opacity:.20,depthWrite:false,fog:true},T.MeshBasicMaterial),rain=new T.InstancedMesh(rainGeometry,rainMaterial,rainCount);rain.frustumCulled=false;scene.add(rain);
 const o=new T.Object3D(),vehiclePositions=[],eye=new T.Vector3(),lastEye=new T.Vector3(Infinity,Infinity,Infinity);let lastTime=-Infinity,frames=0,now=0,viewMode='cutaway';
 function update(time){
  now=time;vehiclePositions.length=0;
  for(let i=0;i<trafficCount;i++){
   const phase=(time*(.014+(i%3)*.002)+i*.173)%1,reverse=i%2?-1:1;
   if(i===0)o.position.set(3.5+Math.sin(time*.45)*2,3.3+Math.sin(time*.7)*.2,-20);
   else if(i<trafficCount-2)o.position.set(reverse*(phase*130-65),2.0+(i%3)*1.4,[-20,-44,-72][i%3]);
   else o.position.set(i%2?-3.8:3.8,-15.40,-105+phase*80);
   o.rotation.set(0,i===0?Math.sin(time*.2)*.2:i<trafficCount-2?(reverse<0?Math.PI:0):Math.PI/2,0);o.scale.setScalar(i===0?.38:i<trafficCount-2?.85:1);o.updateMatrix();for(const mesh of traffic)mesh.setMatrixAt(i,o.matrix);vehiclePositions.push(o.position.toArray());
  }
  for(const mesh of traffic)mesh.instanceMatrix.needsUpdate=true;
  for(let i=0;i<mistCount;i++){
   if(i<6){const phase=(time*.16+i*.167)%1,side=i%2?1:-1;o.position.set(side*9+Math.sin(phase*3+i)*.25,.45+phase*3.6,-14.0-phase*.75);o.scale.set(1.0+phase*1.8,1.5+phase*2.7,1);}
   else{o.position.set(-65+(i-6)*15+Math.sin(time*.025+i)*4,13+(i%3)*5,-115-(i%4)*8);o.scale.set(35,10+(i%3)*3,1);}
   o.rotation.set(0,0,.1*Math.sin(time*.09+i));o.updateMatrix();mist.setMatrixAt(i,o.matrix);
  }mist.instanceMatrix.needsUpdate=true;
  for(let i=0;i<rainCount;i++){o.position.set(-45+((i*17.719)%90),26-((time*18+i*2.187)%38),-17-((i*11.713)%95));o.rotation.set(0,0,-.09);o.scale.set(1,1+(i%3)*.3,1);o.updateMatrix();rain.setMatrixAt(i,o.matrix);}rain.instanceMatrix.needsUpdate=true;
 }
 function prepare(view,time,force,coordinateSystem){
  // The diorama has its own illustrative eye. First-person uses the true eye.
  if(view.isOrthographicCamera){eye.set(view.position.x*.08,2.35,-3);viewMode='cutaway';}
  else{view.getWorldPosition(eye);viewMode='first-person';}
  if(!force&&time-lastTime<(low?1/15:1/24)&&eye.distanceToSquared(lastEye)<.0001)return false;
  update(time);camera.position.copy(eye);camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);
  const f=windowFrustum(eye);camera.near=f.near;camera.far=f.far;camera.coordinateSystem=coordinateSystem;camera.projectionMatrix.makePerspective(f.left,f.right,f.top,f.bottom,f.near,f.far,camera.coordinateSystem);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  lastEye.copy(eye);lastTime=time;return true;
 }
 function render(renderer,view,time=now,force=false){
  if(!prepare(view,time,force,renderer.coordinateSystem||T.WebGLCoordinateSystem))return;
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);
  const restore=()=>{renderer.setRenderTarget(previous);frames++;};
  try{const result=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);if(result?.then)return Promise.resolve(result).finally(restore);restore();}
  catch(error){restore();throw error;}
 }
 update(0);
 return{target,texture:target.texture,render,update,snapshot:()=>({real3D:true,parallax:true,mode:viewMode,frames,time:now,triangles:parsed.triangles,batches:parsed.primitives.length,traffic:trafficCount,rain:rainCount,mist:mistCount,eye:lastEye.toArray(),vehicles:vehiclePositions.map(p=>[...p])}),dispose(){target.dispose();for(const p of parsed.primitives)p.geometry.dispose();for(const g of ownGeometry)g.dispose();for(const m of ownMaterials)m.dispose();for(const t of ownTextures)t.dispose();}};
}
