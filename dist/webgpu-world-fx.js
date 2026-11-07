// Reflection cameras contain lens/pose data only; cloning a player's camera also
// clones its held weapons and their large/circular model metadata.
export function bareReflectionCamera(T,source,cache){
 let camera=cache.get(source);if(!camera){camera=source.isOrthographicCamera?new T.OrthographicCamera():new T.PerspectiveCamera();cache.set(source,camera);}
 camera.layers.mask=source.layers.mask;camera.near=source.near;camera.far=source.far;camera.coordinateSystem=source.coordinateSystem;
 camera.projectionMatrix.copy(source.projectionMatrix);camera.projectionMatrixInverse.copy(source.projectionMatrixInverse);return camera;
}
// A bounded reflection scene reuses the real geometry and current transforms.
// It omits shader-heavy volumes, screens and the player's camera attachments.
export function createReflectionScene(T,{objectLimit=96,triangleLimit=100000}={}){
 const scene=new T.Scene(),records=new WeakMap(),materials=new WeakMap(),owned=new Set(),candidates=[],point=new T.Vector3(),centre=new T.Vector3(),defaultColor=new T.Color(0x7b8794);
 let count=0;
 function materialFor(source){let m=materials.get(source);if(!m){m=new T.MeshBasicMaterial({side:source.side,vertexColors:source.vertexColors,toneMapped:true});materials.set(source,m);owned.add(m);}m.color.copy(source.color||defaultColor);m.transparent=source.transparent;m.opacity=source.opacity;m.depthWrite=source.depthWrite;m.blending=source.blending;if(m.map!==source.map){m.map=source.map;m.needsUpdate=true;}return m;}
 const nearFirst=(a,b)=>a.distance-b.distance;
 return{scene,update(sourceScene,camera){
  scene.background=sourceScene.background;sourceScene.updateMatrixWorld();camera.getWorldPosition(point);candidates.length=0;
  sourceScene.traverseVisible(source=>{
   if(!source.isMesh||source.isSkinnedMesh||(source.material?.transparent&&!['hologram','scanner'].includes(source.material.userData?.worldEffect))||Array.isArray(source.material)||source.userData?.noWorldShadow)return;
   if(!source.geometry.boundingSphere)source.geometry.computeBoundingSphere();
   if(source.isInstancedMesh&&!source.boundingSphere)source.computeBoundingSphere();
   const bounds=source.isInstancedMesh?source.boundingSphere:source.geometry.boundingSphere;
   centre.copy(bounds.center).applyMatrix4(source.matrixWorld);const distance=Math.max(0,centre.distanceTo(point)-bounds.radius*source.matrixWorld.getMaxScaleOnAxis());if(distance>48)return;
   let record=records.get(source);if(!record){const proxy=source.isInstancedMesh?new T.InstancedMesh(source.geometry,materialFor(source.material),source.count):new T.Mesh(source.geometry,materialFor(source.material));proxy.matrixAutoUpdate=false;record={source,proxy,distance:0,triangles:0};records.set(source,record);}
   record.distance=distance;record.triangles=(source.geometry.index?.count||source.geometry.attributes.position.count)/3*(source.isInstancedMesh?source.count:1);candidates.push(record);
  });
  candidates.sort(nearFirst);scene.clear();let triangles=0;count=0;
  for(const record of candidates){if(count>=objectLimit)break;if(triangles+record.triangles>triangleLimit)continue;const {source,proxy}=record;proxy.matrix.copy(source.matrixWorld);proxy.material=materialFor(source.material);proxy.layers.mask=source.layers.mask;if(source.isInstancedMesh){proxy.instanceMatrix=source.instanceMatrix;proxy.instanceColor=source.instanceColor;proxy.count=source.count;proxy.boundingSphere=source.boundingSphere;}scene.add(proxy);triangles+=record.triangles;count++;}
 },stats:()=>({objects:count,objectLimit,triangleLimit}),dispose(){scene.clear();for(const m of owned)m.dispose();owned.clear();}};
}
// Shared WebGPU world shaders. Standard materials remain the WebGL fallback.
// No simulation, navigation or collision authority lives in this module.
export function createWorldEffects(T,{webgpu=false,low=false,reflections=false}={}){
 const native=!!(webgpu&&T.TSL&&T.MeshBasicNodeMaterial),S=T.TSL;
 const clock=native?S.uniform(0):{value:0},materials=new Set(),geometry=new Set(),volumes=[],volumeMaterials=new Map();
 let mirror=null,mirrorHeight=null,disposed=false,depthSample=null,reflectionScene=null;
 if(native&&reflections&&!low){mirrorHeight=S.uniform(.034);mirror=S.reflector({resolutionScale:.25,bounces:false,generateMipmaps:false});mirror.target.position.y=.034;mirror.target.rotation.x=-Math.PI/2;
  const base=mirror.reflector,renderReflection=base.updateBefore;reflectionScene=createReflectionScene(T);
  base.getVirtualCamera=source=>bareReflectionCamera(T,source,base.virtualCameras);
  base.updateBefore=function(frame){const source=frame.camera,visible=source.visible;source.visible=false;try{reflectionScene.update(frame.scene,source);return renderReflection.call(this,{...frame,scene:reflectionScene.scene});}finally{source.visible=visible;}};
 }
 const own=m=>{materials.add(m);return m;};
 function hologram({color=0x67e7ff,map=null,opacity=.35,scanner=false}={}){
  if(!native)return own(new T.MeshBasicMaterial({color,map,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));
  const {uv,sin,vec2,color:rgb,smoothstep,materialOpacity}=S,u=uv();
  const band=sin(u.y.mul(scanner?130:240).sub(clock.mul(6))).mul(.18).add(.82);
  const sweep=smoothstep(.93,1,sin(u.y.mul(6.283).sub(clock.mul(scanner?3:1.3))));
  const jitter=sin(u.y.mul(90).add(clock.mul(5))).mul(.0018);
  const sample=map?S.texture(map,u.add(vec2(jitter,0))):null;
  const edge=smoothstep(0,.045,u.x).mul(smoothstep(0,.045,S.float(1).sub(u.x))).mul(smoothstep(0,.04,u.y)).mul(smoothstep(0,.04,S.float(1).sub(u.y)));
  const m=own(new T.MeshBasicNodeMaterial({color,map,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));
  m.colorNode=(sample?sample.rgb:S.vec3(1)).mul(rgb(color)).mul(band.add(sweep.mul(.7)));
  m.opacityNode=materialOpacity.mul(edge).mul(sample?sample.a:1).mul(band).mul(sweep.mul(.65).add(.65));
  m.positionNode=S.positionLocal.add(S.normalLocal.mul(sin(S.positionLocal.y.mul(15).sub(clock.mul(2))).mul(.004)));
  m.userData.worldEffect=scanner?'scanner':'hologram';return m;
 }
 function water({color=0x102a34,opacity=.88,refraction=true,puddle=false,normalMap=null}={}){
  if(!native)return own(new T.MeshStandardMaterial({color,roughness:.09,metalness:.12,transparent:true,opacity,normalMap,normalScale:new T.Vector2(.35,.35),side:T.DoubleSide}));
  const {positionWorld:p,positionLocal,normalLocal,vec2,vec3,sin,cos,materialOpacity}=S;
  const a=p.x.mul(.93).add(p.z.mul(.41)).add(clock.mul(.8)),b=p.z.mul(1.43).sub(p.x.mul(.57)).sub(clock.mul(.61));
  const ripple=sin(a).mul(.009).add(sin(b).mul(.006));
  const dx=cos(a).mul(.055).sub(cos(b).mul(.038)),dz=cos(a).mul(.025).add(cos(b).mul(.094));
  const m=own(new T.MeshStandardNodeMaterial({color,roughness:puddle?.16:.10,metalness:.16,transparent:true,opacity,side:T.DoubleSide,depthWrite:!puddle}));
  m.positionNode=positionLocal.add(normalLocal.mul(puddle?0:ripple));
  m.normalNode=S.normalMap(vec3(dx.mul(.5).add(.5),dz.mul(.5).add(.5),1));
  let surface=S.color(color);
  if(refraction&&!puddle&&!low){const behind=S.viewportSharedTexture(S.screenUV.add(vec2(dx,dz).mul(.012)));surface=surface.mix(behind.rgb,.24);}
  if(mirror){const mask=S.float(1).sub(S.smoothstep(.04,.12,S.abs(p.y.sub(mirrorHeight))));const fresnel=S.float(1).sub(S.normalView.dot(S.positionViewDirection).abs()).pow(3).mul(.5).add(.12);surface=surface.mix(mirror.rgb,fresnel.mul(mask).min(.65));}
  m.colorNode=surface;
  if(puddle){const u=S.uv().sub(.5).mul(2),edge=S.float(1).sub(S.smoothstep(.5,1,u.length()));m.opacityNode=materialOpacity.mul(edge);}
  m.userData.worldEffect=puddle?'reflective-puddle':'water';return m;
 }
 // Analytic ray/ellipsoid intersections and bounded density integration. The copied
 // opaque depth clamps the exit point, so steam does not show through solid walls.
 function volume({color=0xa6c3d0,opacity=.18,beam=false}={}){
  if(!native)return null;
  const key=[color,opacity,beam].join(':');if(volumeMaterials.has(key))return volumeMaterials.get(key);
  const {Fn,Loop,If,vec3,vec4,float,positionLocal,cameraPosition,modelWorldMatrixInverse,normalize,dot,sqrt,max,min,length,exp,sin,materialOpacity}=S;
  const steps=low?6:10;depthSample??=S.viewportDepthTexture(S.screenUV);
  const density=Fn(()=>{
   const eye=modelWorldMatrixInverse.mul(vec4(cameraPosition,1)).xyz;
   const ray=normalize(positionLocal.sub(eye)),b=dot(eye,ray),c=dot(eye,eye).sub(1),h=sqrt(max(b.mul(b).sub(c),0));
   const start=max(b.negate().sub(h),0);
   const depth=depthSample;
   const view=S.getViewPosition(S.screenUV,depth,S.cameraProjectionMatrixInverse);
   const blocker=modelWorldMatrixInverse.mul(S.cameraWorldMatrix.mul(vec4(view,1))).xyz;
   const end=min(b.negate().add(h),length(blocker.sub(eye)));
   const span=max(end.sub(start),0),sum=float(0).toVar();
   If(span.greaterThan(.001),()=>{Loop(steps,({i})=>{
    const p=eye.add(ray.mul(start.add(float(i).add(.5).div(steps).mul(span))));
    const falloff=max(float(1).sub(dot(p,p)),0).pow(2);
    const noise=sin(p.x.mul(11).add(p.z.mul(9)).add(sin(p.y.mul(7).sub(clock.mul(.4))))).mul(.23).add(.68);
    const taper=beam?max(float(1).sub(p.y),0).mul(.5).add(.25):float(1);
    sum.addAssign(falloff.mul(noise).mul(taper));
   });});
   return float(1).sub(exp(sum.div(steps).mul(span).mul(beam?-2.2:-3.2)));
  })();
  const m=own(new T.MeshBasicNodeMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,side:T.BackSide,toneMapped:false}));
  m.colorNode=S.color(color);m.opacityNode=density.mul(materialOpacity);m.userData.worldEffect=beam?'light-volume':'steam-volume';volumeMaterials.set(key,m);return m;
 }
 let sphere;
 function fog(parent,{x=0,y=1,z=0,width=3,height=2,depth=3,color,opacity=.18,beam=false}={}){
  if(!native)return null;
  if(!sphere){sphere=new T.SphereGeometry(1,low?10:16,low?8:12);geometry.add(sphere);}
  const mesh=new T.Mesh(sphere,volume({color,opacity,beam}));mesh.position.set(x,y,z);mesh.scale.set(width/2,height/2,depth/2);mesh.userData.noWorldShadow=true;mesh.name=beam?'WebGPU / diffusion lumineuse en volume':'WebGPU / vapeur en volume';parent.add(mesh);volumes.push({mesh,x,y,z});return mesh;
 }
 const worldPosition=native?new T.Vector3():null;
 function update(t,eye=null){
  clock.value=t;
  if(eye)for(const v of volumes){v.mesh.getWorldPosition(worldPosition);const dx=eye.x-worldPosition.x,dz=eye.z-worldPosition.z;v.mesh.visible=dx*dx+dz*dz<(low?30:55)**2;}
 }
 return{native,clock,hologram,water,volume,fog,update,reflectionTarget:mirror?.target,
  setReflectionHeight(y){if(mirrorHeight){mirrorHeight.value=y;mirror.target.position.y=y;}},
  stats:()=>({native,volumes:volumes.length,reflectionPasses:mirror?1:0,reflectionResolutionScale:mirror?.25:0,volumeSteps:native?(low?6:10):0,reflectionObjects:reflectionScene?.stats().objects||0,reflectionObjectLimit:reflectionScene?.stats().objectLimit||0}),
  dispose(){if(disposed)return;disposed=true;for(const v of volumes)v.mesh.removeFromParent();for(const m of materials)m.dispose();for(const g of geometry)g.dispose();mirror?.target.removeFromParent();mirror?.dispose();reflectionScene?.dispose();}
 };
}
