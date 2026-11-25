// Approved V3 heavy chassis, independently animated from the historical SE-03.
import * as T from './vendor/three.webgpu.min.js';
export const SE04_ASSET=new URL('./assets/enemies/se04-sentinel-v3.glb',import.meta.url).href;
export const SE04_CLIPS=Object.freeze(['Idle','Move_Tracked','Walk_Heavy','Fire_Cannons','Fire_Missiles','Hit','Shutdown']);
let source;
function load(){
 if(!source)source=import('./vendor/s19-gltf-loader.js').then(({GLTFLoader,cloneS19})=>new Promise((resolve,reject)=>{
  new GLTFLoader().load(SE04_ASSET,gltf=>resolve({gltf,cloneS19}),undefined,reject);
 }));
 return source;
}
export function createSE04({fallback=null,environment=null,detail='high'}={}){
 const root=new T.Group();root.name='SE-04 / Sentinel lourd';root.userData.form='se04';
 let visual,mixer,actions={},active='',previousTime=null,failed=false,lastFallback=null,previewStart=null;
 let instanced=[],dummy=new T.Matrix4(),inverse=new T.Matrix4();
 function instanceTracks(){
  // The 56 repeated track links share geometry and material. Reduce repeated draw calls on mobile.
  if(detail!=='low')return;
  const buckets=new Map();
  visual.traverse(o=>{if(!o.isMesh)return;let p=o;while(p&&p!==visual&&!p.name.startsWith('Tread_'))p=p.parent;
   if(!p||p===visual)return;const k=o.geometry.uuid+'|'+o.material.uuid;
   if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);
  });
  for(const parts of buckets.values()){if(parts.length<2)continue;const first=parts[0],mesh=new T.InstancedMesh(first.geometry,first.material,parts.length);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);for(const p of parts)p.visible=false;instanced.push({parts,mesh});}
 }
 function syncTracks(){if(!instanced.length)return;root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();for(const {parts,mesh} of instanced){parts.forEach((p,i)=>mesh.setMatrixAt(i,dummy.multiplyMatrices(inverse,p.matrixWorld)));mesh.instanceMatrix.needsUpdate=true;}}
 root.userData.ready=load().then(({gltf,cloneS19})=>{
  visual=cloneS19(gltf.scene);visual.rotation.y=Math.PI;root.add(visual);
  visual.traverse(o=>{if(o.isMesh){o.castShadow=detail!=='low';o.receiveShadow=true;if(environment&&o.material&&!Array.isArray(o.material)){o.material=o.material.clone();if('envMap' in o.material)o.material.envMap=environment;}}});
  mixer=new T.AnimationMixer(visual);
  for(const clip of gltf.animations){const a=mixer.clipAction(clip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;actions[clip.name]=a;}
  if(SE04_CLIPS.some(n=>!actions[n]))throw Error('SE-04 missing native clips');
  instanceTracks();pose('Idle',0);return root;
 }).catch(error=>{failed=true;console.warn('SE-04 asset loading failed',error);if(fallback){lastFallback=fallback();lastFallback.scale.multiplyScalar(2.1);root.add(lastFallback);}else throw error;return root;});
 function pose(name,elapsed){if(!mixer||!actions[name])return;const a=actions[name];
  if(active!==name){mixer.stopAllAction();a.reset().play();active=name;}
  a.paused=false;a.enabled=true;
  const loop=name==='Idle'||name==='Move_Tracked'||name==='Walk_Heavy';
  a.time=loop?Math.max(0,elapsed)%a.getClip().duration:Math.max(0,Math.min(a.getClip().duration-.001,elapsed));
  mixer.update(0);syncTracks();
 }
 root.userData.animate=(clock,phase,moving,e={},simTime=clock)=>{
  if(failed){lastFallback?.userData.animate?.(clock,phase,moving,e,simTime);return;}
  if(!mixer)return;
  const t=Number.isFinite(simTime)?simTime:clock;
  if(e.iemUntil>t)return;
  const fire=t-(e.se04AttackAt??-999),hit=t-(e.hitAt??-999);
  const missile=e.se04Attack==='missile';
  if(e.hp<=0)pose('Shutdown',Math.max(0,t-(e.deathAt??t)));
  else if(fire>=0&&fire<(missile?1.8:1.25))pose(missile?'Fire_Missiles':'Fire_Cannons',fire);
  else if(hit>=0&&hit<.7)pose('Hit',hit);
  else {let speed=0;if(previousTime!==null&&t>previousTime)speed=Math.hypot(root.position.x-(root.userData.prevX??root.position.x),root.position.z-(root.userData.prevZ??root.position.z))/(t-previousTime);
   pose(speed>.12?'Move_Tracked':'Idle',t+(phase||0));}
  root.userData.prevX=root.position.x;root.userData.prevZ=root.position.z;previousTime=t;
 };
 root.userData.preview=(t)=>{previewStart??=t;const p=(t-previewStart)%12;if(p<2)pose('Idle',p);else if(p<5)pose('Move_Tracked',p-2);else if(p<7)pose('Fire_Cannons',Math.min(p-5,1.249));else if(p<9)pose('Fire_Missiles',Math.min(p-7,1.799));else if(p<10)pose('Hit',Math.min(p-9,.699));else pose('Shutdown',p-10);};
 root.userData.dispose=()=>{mixer?.stopAllAction();if(visual)mixer?.uncacheRoot(visual);root.removeFromParent();for(const {mesh} of instanced)mesh.dispose?.();instanced=[];};
 return root;
}
