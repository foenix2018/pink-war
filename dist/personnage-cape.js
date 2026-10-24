import {createStudioBloom} from './studio-bloom.js';
import {createGlove} from './hands.js';
import {poseUnarmedForInspection} from './rlh-firefighter.js';
import { addCapeToOriginalSoldier } from './personnage-cape-addon.js?v=3.55';
import { attachShadowConcept } from './personnage-shadow-concept.js?v=3.55';
import * as T from './vendor/three.webgpu.min.js';
import { WebGLRenderer } from './vendor/three.module.min.js';
import { createCharacterKit, createSoldier } from './soldier.js';
import { buildGun } from './weapons.js';
import { createSurfaceDetails } from './surfaces.js';
import { characterForId } from './characters.js';
import { playLaserShot, loadRealLaserSample } from './laser-sound.js';
import { createSaberSound } from './saber-sound.js';
import { bladeSwingPose } from './blade-combat.js';
import {equipmentForCharacter} from './equipment.js';
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
const studioBloom=createStudioBloom(renderer);
const scene = new T.Scene();
scene.background = new T.Color(0x171c28);
const camera = new T.PerspectiveCamera(42,1,.04,80);
const helmetCamera=new T.OrthographicCamera(-.20,.20,.20,-.20,.02,20);
const cameraTarget=new T.Vector3();
const ambient = new T.HemisphereLight(0xf7eaff,0x1d2633,2.45);scene.add(ambient);
const key = new T.DirectionalLight(0xffe8f4,3.3);key.position.set(-3,6,-5);key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-4;
key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.bias=-.0006;scene.add(key);
const fill = new T.DirectionalLight(0x86bbff,1.45);fill.position.set(4,3,3);scene.add(fill);
const accents = new T.DirectionalLight(0xff7dba,1.1);accents.position.set(-3,2,3);scene.add(accents);
const floor = new T.Mesh(new T.PlaneGeometry(50,50),new T.MeshStandardMaterial({color:0x202833,roughness:.88,metalness:.05}));
floor.rotation.x=-Math.PI/2;floor.position.y=.015;floor.receiveShadow=true;scene.add(floor);
const grid = new T.GridHelper(8,16,0x6a7899,0x303c52);grid.position.y=-.049;grid.material.transparent=true;grid.material.opacity=.08;scene.add(grid);
const ground = new T.Mesh(new T.CylinderGeometry(.9,.92,.055,64),new T.MeshStandardMaterial({color:0x252d3b,roughness:.6,metalness:.2}));
ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);

// Softbox environment gives the graphite armour broad, controlled reflections.
// This is generated locally; it does not depend on a studio HDR download.
const studioWidth=256,studioHeight=128,studioPixels=new Float32Array(studioWidth*studioHeight*4);
for(let y=0;y<studioHeight;y++)for(let x=0;x<studioWidth;x++){
 const u=x/studioWidth,v=y/studioHeight;
 const softbox=(cx,cy,w,h)=>Math.exp(-Math.pow((u-cx)/w,8)-Math.pow((v-cy)/h,8));
 const energy=.14+3.3*softbox(.17,.39,.075,.23)+2.2*softbox(.74,.38,.055,.22)+1.3*softbox(.5,.16,.22,.045);
 const i=(y*studioWidth+x)*4;
 studioPixels.set([energy,energy*.96,energy*1.02,1],i);
}
const studioEnvironment=new T.DataTexture(studioPixels,studioWidth,studioHeight,T.RGBAFormat,T.FloatType);
studioEnvironment.mapping=T.EquirectangularReflectionMapping;studioEnvironment.needsUpdate=true;
scene.environment=studioEnvironment;
scene.fog=new T.FogExp2(0x171c28,.085);
grid.visible=false;ground.visible=false;
const surfaces=createSurfaceDetails();
surfaces.environment=studioEnvironment;
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
const capeParts=new Map();
const shadowParts=new Map();
const subjects=new Map();
const inspectionHands=new Map();
for(const id of ['lylu','ghju']){
  const model=createSoldier(kit,createGun,characterForId(id));
  scene.add(model.root);model.root.scale.setScalar(model.heightScale);model.root.visible=id==='ghju';
  model.animate(0,false);
  // Masquer l'ancien casque et monter les plaques/visière Shadow avant la cape.
  shadowParts.set(id,attachShadowConcept(model,characterForId(id)));
  capeParts.set(id,addCapeToOriginalSoldier(model,characterForId(id)));
  model.root.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial){o.material.envMap=surfaces.environment;o.material.envMapIntensity=o.material.userData.studioReflection??(o.material.name==='Shadow dark visor'?.18:.65);}});
  const gloves=[createGlove(kit.gloves,{mirror:true,sleeve:false}),createGlove(kit.gloves,{sleeve:false})];
  for(const glove of gloves){glove.visible=false;model.root.add(glove);}
  inspectionHands.set(id,gloves);
  subjects.set(id,model);
}
const state={character:'ghju',motion:'idle',level:7,weapon:-1,angle:0,elevation:.015,focus:'body',headSpan:.19,zoom:matchMedia('(max-width:800px) and (orientation:portrait)').matches?6.0:3.05,showBones:false,capeEnabled:true,capeWind:.60,jumpStart:0,clock:0};
const color=new T.Color();
function setCharacter(id){
  if(!subjects.has(id))return;
  state.character=id;
  const profile=characterForId(id);
  // Palette Shadow Unit dans la visionneuse uniquement, non propagée au jeu.
  kit.setPalette({...profile.armor,
    rose:0x242730,pearl:0x6a6f77,dark:0x17191f,steel:0x444951,
    suit:0x101117,visor:0x070911,lens:profile.masculine?0x113458:0x370b29
  });
  // Les matériaux perlés de l'AÉGIS sont aussi partagés entre deux armures.
  // Appliquer l'assombrissement APRES setPalette évite le retour au rose pastel.
  for(const [name,value] of [['rose',0x22252c],['pearl',0x646872],
    ['dark',0x12151a],['steel',0x444954]]){
    if(kit.armorMaterials[name]?.color)kit.armorMaterials[name].color.setHex(value);
    if(kit.materials[name]?.color)kit.materials[name].color.setHex(value);
  }
  setKenneyAccent(profile.armor.rose);
  paintEmblem(profile);
  for(const [name,mat] of Object.entries(mats)){
    const col=name==='dark'?profile.palette.ink:name==='cyan'?profile.world.cyan:(profile.world[name]??profile.palette[name]);
    if(col!==undefined&&mat.color)mat.color.setHex(col);
  }
  floor.material.color.setHex(0x171920);
  ground.material.color.setHex(0x1c1e26);
  accents.color.setHex(profile.masculine?0x73b6ff:0xff80b2);
  document.documentElement.style.setProperty('--accent',profile.accent);
  for(const [key,m] of subjects){m.root.visible=key===id;}
  subjects.get(id).setLevel(state.level);
  subjects.get(id).setWeapon(Math.max(0,state.weapon));
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
  $('sound-preview').disabled=state.weapon<0;
  const stage=equipmentForCharacter(state.level,state.character);$('stage-name').textContent=stage.name+' · NIVEAU '+stage.level;$('stage-description').textContent=stage.description;
  $('status').textContent=`${model.armor.name} · ${characterForId(state.character).name} · ${model.targetHeight.toFixed(2).replace('.',',')} m · ${model.equipmentLevel}e armure · ${model.visibleParts} pièces · ${state.motion==='idle'?'repos':state.motion==='walk'?'marche':state.motion==='run'?'course':state.motion==='jump'?'saut':state.motion==='crouch'?'accroupi':state.motion==='walkFire'?'Rifle Walk':state.motion==='runFire'?'course + tir':state.motion==='crouchWalk'?'déplacement accroupi':'Idle Rifle'}`;
}
for(const button of document.querySelectorAll('[data-character]'))button.addEventListener('click',()=>setCharacter(button.dataset.character));
for(const button of document.querySelectorAll('[data-motion]'))button.addEventListener('click',()=>setMotion(button.dataset.motion));
for(const button of document.querySelectorAll('[data-angle]'))button.addEventListener('click',()=>{state.angle=Number(button.dataset.angle);});
function setFocus(focus){
  if(!['body','helmet'].includes(focus))return;
  state.focus=focus;state.elevation=focus==='helmet'?0:.015;
  document.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===focus)));
  updateHelmetProjection();
}
for(const button of document.querySelectorAll('[data-focus]'))button.addEventListener('click',()=>setFocus(button.dataset.focus));
$('level').addEventListener('input',e=>{state.level=Number(e.target.value);$('level-value').textContent=state.level;subjects.get(state.character).setLevel(state.level);updateStatus();});
$('weapon').addEventListener('change',e=>{state.weapon=Number(e.target.value);subjects.get(state.character).setWeapon(Math.max(0,state.weapon));updateStatus();});
let previewAudio,previewSaber;
$('sound-preview').addEventListener('click',async()=>{
  if(state.weapon<0)return;
  try{
    previewAudio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(previewAudio.state!=='running')await previewAudio.resume();
    if(state.weapon===5){previewSaber ||=createSaberSound(previewAudio);previewSaber.ignite();return;}
    await loadRealLaserSample(previewAudio);
    playLaserShot(previewAudio,['r9','bloom','lance','thorn','nova'][state.weapon],1);
  }catch(error){console.warn('Essai audio laser non disponible',error);}
});
$('cape-toggle').addEventListener('change',e=>{state.capeEnabled=e.target.checked;for(const v of capeParts.values())v.anchor.visible=state.capeEnabled;});
$('cape-wind').addEventListener('input',e=>{state.capeWind=Number(e.target.value)/100;$('cape-wind-value').textContent=e.target.value;});
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
  if(previousPinch)zoomView(previousPinch/Math.max(10,distance));
  previousPinch=distance;
 }
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointerPositions.delete(e.pointerId);previousPinch=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomView(Math.exp(e.deltaY*.001));},{passive:false});
let frame=0,last=0;
function updateHelmetProjection(){
 // Fit the helmet into the area beside/above the controls. A symmetric
 // orthographic view remains useful even on a narrow portrait screen.
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 const panel=document.querySelector('.control')?.getBoundingClientRect();
 const visible=panel?.width>0&&panel?.height>0,drawer=visible&&panel.width>w*.7;
 const left=visible?16:0,top=visible?64:0;
 const right=visible&&!drawer?Math.max(left+1,panel.left-16):w-left;
 const bottom=drawer?Math.max(top+1,panel.top-16):h-left;
 const scale=state.headSpan*2/Math.max(1,Math.min(right-left,bottom-top));
 const cx=(w/2-(left+right)/2)*scale,cy=((top+bottom)/2-h/2)*scale;
 helmetCamera.left=cx-w*scale/2;helmetCamera.right=cx+w*scale/2;
 helmetCamera.top=cy+h*scale/2;helmetCamera.bottom=cy-h*scale/2;helmetCamera.updateProjectionMatrix();
}
function zoomView(factor){
 if(state.focus==='helmet'){state.headSpan=clamp(state.headSpan*factor,.12,.36);updateHelmetProjection();}
 else state.zoom=clamp(state.zoom*factor,2.3,7.2);
}
function resize(){
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,2);
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);studioBloom.resize(Math.round(w*dpr),Math.round(h*dpr));camera.aspect=w/h;camera.updateProjectionMatrix();
 updateHelmetProjection();
}
window.addEventListener('resize',resize);resize();
const inspectionQuery=new URLSearchParams(location.search);
if(inspectionQuery.has('level')){
 state.level=clamp(Math.round(Number(inspectionQuery.get('level')))||1,1,10);
 $('level').value=state.level;$('level-value').textContent=state.level;
}
if(inspectionQuery.get('view')==='profile')state.angle=Math.PI/2;
setCharacter(inspectionQuery.get('character')==='lylu'?'lylu':'ghju');setMotion('idle');
function tick(now){
 const dt=last?clamp((now-last)*.001,.001,.05):.016;last=now;state.clock+=dt;
 const model=subjects.get(state.character),root=model.root;
 shadowParts.get(state.character).restoreAttachments();
 model.gun.visible=true;
 for(const glove of inspectionHands.get(state.character))glove.visible=false;
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
 if(state.weapon<0){
   if(state.motion==='idle'){
     poseUnarmedForInspection(model,inspectionHands.get(state.character),dt);
     shadowParts.get(state.character).syncInspectionSymmetry();
   }
   else for(const child of model.gun.children)if(child!==model.gun.userData.hand)child.visible=false;
 }
 const symmetric=state.weapon<0&&state.motion==='idle';
 capeParts.get(state.character).update(state.clock,state.motion,state.capeWind,{symmetric});
 refreshSkeleton(model);
 const w=canvas.clientWidth,h=canvas.clientHeight;
 // Portrait inspection keeps the entire boot-to-helmet silhouette above the mobile control drawer.
 const focal=(w<800&&h>w)?0.32:.82;
 const activeCamera=state.focus==='helmet'?helmetCamera:camera;
 if(state.focus==='helmet')shadowParts.get(state.character).helmet.getWorldPosition(cameraTarget);
 else cameraTarget.set(0,focal,0);
 const distance=state.focus==='helmet'?1:state.zoom;
 activeCamera.position.set(cameraTarget.x+Math.sin(state.angle)*Math.cos(state.elevation)*distance,
   cameraTarget.y+Math.sin(state.elevation)*distance,
   cameraTarget.z-Math.cos(state.angle)*Math.cos(state.elevation)*distance);
 activeCamera.lookAt(cameraTarget);
 studioBloom.render(scene,activeCamera);
 frame++;
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__PINKWAR_CHARACTER_LAB=Object.freeze({
 snapshot:()=>({character:state.character,motion:state.motion,level:state.level,weapon:state.weapon,focus:state.focus,angle:state.angle,showBones:state.showBones,
  frames:frame,zoom:state.zoom,headSpan:state.headSpan,articulations:jointNames, jointPositions:()=>Object.fromEntries(Object.entries(subjects.get(state.character).jointPositions()).map(([k,v])=>[k,v.toArray()])),
  visibleParts:subjects.get(state.character).visibleParts,visibleMeshes:subjects.get(state.character).batchCount,physicalHeight:subjects.get(state.character).targetHeight,
  armorModules:[...subjects.get(state.character).armor.modules],armorTriangles:subjects.get(state.character).armor.parts.reduce((n,p)=>n+p.geometry.attributes.position.count/3,0),armorName:subjects.get(state.character).armor.name,armorRevision:subjects.get(state.character).armor.revision,armorGeneration:subjects.get(state.character).armor.generation,armorPieces:subjects.get(state.character).armor.count,nativeMotion:subjects.get(state.character).nativeMotion,nativeClips:Object.fromEntries(Object.entries(subjects.get(state.character).actor.actions).map(([name,a])=>[name,{duration:a.getClip().duration,weight:a.getEffectiveWeight(),time:a.time}]))}),
 selectCharacter:setCharacter,selectMotion:setMotion,selectFocus:setFocus
});
