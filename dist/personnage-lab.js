import * as T from './vendor/three.webgpu.min.js';
import { WebGLRenderer } from './vendor/three.module.min.js';
import { createCharacterKit, createSoldier } from './soldier.js';
import { buildGun } from './weapons.js';
import { createSurfaceDetails } from './surfaces.js';
import { characterForId } from './characters.js';
import { playLaserShot, loadRealLaserSample } from './laser-sound.js';
import { createSaberSound } from './saber-sound.js';
import { bladeSwingPose } from './blade-combat.js';
import {setKenneyAccent} from './kenney-blasters.js';

const $ = id => document.getElementById(id);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const canvas = $('viewer');
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference:'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.background = new T.Color(0x171c28);
const camera = new T.PerspectiveCamera(42,1,.04,80);
const ambient = new T.HemisphereLight(0xf7eaff,0x1d2633,2.45);scene.add(ambient);
const key = new T.DirectionalLight(0xffe8f4,3.3);key.position.set(-3,6,-5);key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-4;
key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.bias=-.0006;scene.add(key);
const fill = new T.DirectionalLight(0x86bbff,1.45);fill.position.set(4,3,3);scene.add(fill);
const accents = new T.DirectionalLight(0xff7dba,1.1);accents.position.set(-3,2,3);scene.add(accents);
const floor = new T.Mesh(new T.PlaneGeometry(50,50),new T.MeshStandardMaterial({color:0x202833,roughness:.88,metalness:.05}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.06;floor.receiveShadow=true;scene.add(floor);
const grid = new T.GridHelper(8,16,0x6a7899,0x303c52);grid.position.y=-.049;grid.material.transparent=true;grid.material.opacity=.26;scene.add(grid);
const ground = new T.Mesh(new T.CylinderGeometry(.9,.92,.055,64),new T.MeshStandardMaterial({color:0x252d3b,roughness:.6,metalness:.2}));
ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);

const surfaces=createSurfaceDetails();
const standard=(color,roughness=.5,metalness=.4)=>new T.MeshStandardMaterial({color,roughness,metalness});
const neon=color=>new T.MeshBasicMaterial({color,toneMapped:false});
const mats={
  ground:standard(0x292731,.84,.25),tile:standard(0x33303d,.73,.2),structure:standard(0x393442,.8,.18),
  lightStone:standard(0x796673,.84,.05),dark:standard(0x212335,.65,.55),steel:standard(0x51445b,.35,.65),
  armor:standard(0xd96799,.32,.58),armorLight:standard(0xf3b1cc,.35,.4),suit:standard(0x292235,.87,.12),
  hair:standard(0xf1a5cb,.9,.05),visor:standard(0x251d39,.15,.85),white:standard(0xd6c6d0,.5,.45),
  rose:neon(0xff80b2),pale:neon(0xffd4e7),violet:neon(0xa891dc),cyan:neon(0x9fe6da),
  monster:standard(0x43345b,.54,.5),monsterElite:standard(0x63415a,.42,.65),monsterFace:standard(0x211d31,.3,.66)
};
for(const mat of [mats.armor,mats.armorLight])mat.roughnessMap=surfaces.coating;
for(const mat of [mats.dark,mats.steel,mats.armor,mats.armorLight,mats.visor]){mat.envMap=surfaces.environment;mat.envMapIntensity=.42;}

const emblemCanvas=document.createElement('canvas');
emblemCanvas.width=256;emblemCanvas.height=128;
const emblem=new T.CanvasTexture(emblemCanvas);emblem.colorSpace=T.SRGBColorSpace;
function paintEmblem(profile){
  const c=emblemCanvas.getContext('2d'),w=256,h=128;
  c.fillStyle=profile.masculine?'#142b42':'#281d33';c.fillRect(0,0,w,h);
  c.strokeStyle=profile.masculine?'#b8d7f6':'#f2bbd4';c.lineWidth=5;c.strokeRect(4,4,w-8,h-8);
  c.fillStyle=profile.accent;c.beginPath();c.moveTo(128,13);c.lineTo(106,39);c.lineTo(84,23);c.lineTo(88,52);c.lineTo(168,52);c.lineTo(172,23);c.lineTo(150,39);c.closePath();c.fill();
  c.fillStyle=profile.masculine?'#e7f5ff':'#ffe7ef';c.font='bold 38px monospace';c.textAlign='center';c.fillText(profile.name,w/2,91);
  c.fillStyle=profile.accent;c.font='19px monospace';c.fillText('— 07 —',w/2,116);emblem.needsUpdate=true;
}
const kit=createCharacterKit(emblem,surfaces);
const createGun=(options={})=>buildGun({
  mats,gloves:kit.gloves,sleeve:options.sleeve!==false,
  makeFlash:parent=>{const flash=new T.Object3D();parent.add(flash);return flash;}
});
const subjects=new Map();
for(const id of ['lylu','ghju']){
  const model=createSoldier(kit,createGun,characterForId(id));
  scene.add(model.root);model.root.scale.setScalar(model.heightScale);model.root.visible=id==='ghju';
  model.animate(0,false);
  subjects.set(id,model);
}
const state={character:'ghju',motion:'idle',level:1,weapon:0,angle:0,elevation:.12,zoom:matchMedia('(max-width:800px) and (orientation:portrait)').matches?6.0:3.9,showBones:false,jumpStart:0,clock:0};
const color=new T.Color();
function setCharacter(id){
  if(!subjects.has(id))return;
  state.character=id;
  const profile=characterForId(id);
  kit.setPalette(profile.armor);
  setKenneyAccent(profile.armor.rose);
  paintEmblem(profile);
  for(const [name,mat] of Object.entries(mats)){
    const col=name==='dark'?profile.palette.ink:name==='cyan'?profile.world.cyan:(profile.world[name]??profile.palette[name]);
    if(col!==undefined&&mat.color)mat.color.setHex(col);
  }
  floor.material.color.setHex(profile.masculine?0x1c2939:0x29232e);
  ground.material.color.setHex(profile.masculine?0x1d3a54:0x382536);
  accents.color.setHex(profile.masculine?0x73b6ff:0xff80b2);
  document.documentElement.style.setProperty('--accent',profile.accent);
  for(const [key,m] of subjects){m.root.visible=key===id;}
  subjects.get(id).setLevel(state.level);
  subjects.get(id).setWeapon(state.weapon);
  $('characters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===id)));
  updateStatus();
}
function setMotion(motion){
  if(!['idle','walk','run','jump','aim','crouch','walkFire','runFire','crouchWalk'].includes(motion))return;
  state.motion=motion;
  state.jumpStart=state.clock;
  document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===motion)));
  updateStatus();
}
function updateStatus(){
  const model=subjects.get(state.character);
  $('status').textContent=`${model.armor.name} · ${characterForId(state.character).name} · ${model.targetHeight.toFixed(2).replace('.',',')} m · ${model.equipmentLevel}e armure · ${model.visibleParts} pièces · ${state.motion==='idle'?'repos':state.motion==='walk'?'marche':state.motion==='run'?'course':state.motion==='jump'?'saut':state.motion==='crouch'?'accroupi':state.motion==='walkFire'?'Rifle Walk':state.motion==='runFire'?'course + tir':state.motion==='crouchWalk'?'déplacement accroupi':'Idle Rifle'}`;
}
for(const button of document.querySelectorAll('[data-character]'))button.addEventListener('click',()=>setCharacter(button.dataset.character));
for(const button of document.querySelectorAll('[data-motion]'))button.addEventListener('click',()=>setMotion(button.dataset.motion));
for(const button of document.querySelectorAll('[data-angle]'))button.addEventListener('click',()=>{state.angle=Number(button.dataset.angle);});
$('level').addEventListener('input',e=>{state.level=Number(e.target.value);$('level-value').textContent=state.level;subjects.get(state.character).setLevel(state.level);updateStatus();});
$('weapon').addEventListener('change',e=>{state.weapon=Number(e.target.value);subjects.get(state.character).setWeapon(state.weapon);updateStatus();});
let previewAudio,previewSaber;
$('sound-preview').addEventListener('click',async()=>{
  try{
    previewAudio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(previewAudio.state!=='running')await previewAudio.resume();
    if(state.weapon===5){previewSaber ||=createSaberSound(previewAudio);previewSaber.ignite();return;}
    await loadRealLaserSample(previewAudio);
    playLaserShot(previewAudio,['r9','bloom','lance','thorn','nova'][state.weapon],1);
  }catch(error){console.warn('Essai audio laser non disponible',error);}
});
$('bones').addEventListener('change',e=>{state.showBones=e.target.checked;markers.visible=state.showBones;});
$('grid').addEventListener('change',e=>{grid.visible=ground.visible=e.target.checked;});

// The debugging overlay uses the actual THREE.Object3D pivots and IK elbows/wrists.
const jointNames=['pelvis','chest','head','leftShoulder','leftElbow','leftWrist','rightShoulder','rightElbow','rightWrist','leftHip','leftKnee','leftAnkle','leftToe','rightHip','rightKnee','rightAnkle','rightToe'];
const jointLinks=[[0,1],[1,2],[1,3],[3,4],[4,5],[1,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16]];
const markerMat=new T.MeshBasicMaterial({color:0x80faff,depthTest:false,toneMapped:false});
const lineMat=new T.LineBasicMaterial({color:0x80faff,transparent:true,opacity:.8,depthTest:false});
const markers=new T.Group();scene.add(markers);markers.visible=false;
const jointBalls=[],jointGeom=new T.SphereGeometry(.017,8,6);
for(let i=0;i<jointNames.length;i++){const ball=new T.Mesh(jointGeom,markerMat);ball.renderOrder=12;markers.add(ball);jointBalls.push(ball);}
const linePositions=new Float32Array(jointLinks.length*6);
const lineGeometry=new T.BufferGeometry();lineGeometry.setAttribute('position',new T.BufferAttribute(linePositions,3).setUsage(T.DynamicDrawUsage));
const lines=new T.LineSegments(lineGeometry,lineMat);lines.renderOrder=11;markers.add(lines);
function refreshSkeleton(model){
  if(!state.showBones)return;
  const positions=model.jointPositions();
  const coords=jointNames.map((name,i)=>{const p=positions[name];jointBalls[i].position.copy(p);return p;});
  jointLinks.forEach(([a,b],i)=>{linePositions.set(coords[a].toArray(),i*6);linePositions.set(coords[b].toArray(),i*6+3);});
  lineGeometry.attributes.position.needsUpdate=true;lineGeometry.computeBoundingSphere();
}

const pointerPositions=new Map();let previousPinch=0,lastPoint=null;
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
 canvas.setPointerCapture(e.pointerId);lastPoint={x:e.clientX,y:e.clientY};previousPinch=0;
});
canvas.addEventListener('pointermove',e=>{
 if(!pointerPositions.has(e.pointerId))return;
 e.preventDefault();
 const previous=pointerPositions.get(e.pointerId);
 pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointerPositions.size===1){
  state.angle+=(e.clientX-previous.x)*.009;
  state.elevation=clamp(state.elevation+(e.clientY-previous.y)*.005,-.55,.9);
 } else if(pointerPositions.size>=2) {
  const [a,b]=[...pointerPositions.values()];
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(previousPinch)state.zoom=clamp(state.zoom*previousPinch/Math.max(10,distance),2.3,7.2);
  previousPinch=distance;
 }
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointerPositions.delete(e.pointerId);previousPinch=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(e.deltaY*.001),2.3,7.2);},{passive:false});
let frame=0,last=0;
function resize(){
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,2);
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
setCharacter('ghju');setMotion('idle');
function tick(now){
 const dt=last?clamp((now-last)*.001,.001,.05):.016;last=now;state.clock+=dt;
 const model=subjects.get(state.character),root=model.root;
 const speed=['walk','walkFire'].includes(state.motion)?3.2:['run','runFire'].includes(state.motion)?9:state.motion==='crouchWalk'?2.2:0;
 // Drive the real rig's displacement-driven animation without translating it out of the viewer.
 if(speed)model._lastRootPosition=new T.Vector3(root.position.x,root.position.y,root.position.z+speed*dt);
 const airborne=state.motion==='jump';
 let height=0,velocity=0;
 if(airborne){
   const elapsed=state.clock-state.jumpStart;
   if(elapsed>1.05){setMotion('idle');}
   else {height=Math.max(0,7.25*elapsed-9*elapsed*elapsed);velocity=7.25-18*elapsed;}
 }
 root.position.y=height;
 model.animate(state.clock,!!speed,0,0,['aim','walkFire','runFire','crouch','crouchWalk'].includes(state.motion)?1:0,dt,{airborne,verticalSpeed:velocity,crouched:['crouch','crouchWalk'].includes(state.motion),firing:['aim','walkFire','runFire','crouch','crouchWalk'].includes(state.motion),sprint:['run','runFire'].includes(state.motion),preview:state.motion==='idle',saberSwing:state.weapon===5&&state.motion==='aim'?bladeSwingPose((state.clock%1.2)/.6):null});
 model.gun.userData.setCombatState?.({time:state.clock,bladeHeld:state.weapon===5});
 refreshSkeleton(model);
 const w=canvas.clientWidth,h=canvas.clientHeight;
 // Portrait inspection keeps the entire boot-to-helmet silhouette above the mobile control drawer.
 const focal=(w<800&&h>w)?0.32:1.1;
 camera.position.set(Math.sin(state.angle)*Math.cos(state.elevation)*state.zoom,
    focal+Math.sin(state.elevation)*state.zoom,
    -Math.cos(state.angle)*Math.cos(state.elevation)*state.zoom);
 camera.lookAt(0,focal,0);
 renderer.render(scene,camera);
 frame++;
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__PINKWAR_CHARACTER_LAB=Object.freeze({
 snapshot:()=>({character:state.character,motion:state.motion,level:state.level,weapon:state.weapon,showBones:state.showBones,
  frames:frame,zoom:state.zoom,articulations:jointNames, jointPositions:()=>Object.fromEntries(Object.entries(subjects.get(state.character).jointPositions()).map(([k,v])=>[k,v.toArray()])),
  visibleParts:subjects.get(state.character).visibleParts,visibleMeshes:subjects.get(state.character).batchCount,physicalHeight:subjects.get(state.character).targetHeight,
  armorName:subjects.get(state.character).armor.name,armorRevision:subjects.get(state.character).armor.revision,armorGeneration:subjects.get(state.character).armor.generation,armorPieces:subjects.get(state.character).armor.count,nativeMotion:subjects.get(state.character).nativeMotion,nativeClips:Object.fromEntries(Object.entries(subjects.get(state.character).actor.actions).map(([name,a])=>[name,{duration:a.getClip().duration,weight:a.getEffectiveWeight(),time:a.time}]))}),
 selectCharacter:setCharacter,selectMotion:setMotion
});
