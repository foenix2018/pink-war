// Pink Wars: actual RECO1, Brute V3 and Rempart combat models.
 // Interactive calibration page; never imported by the public game.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {graphicsProfile,renderPixelRatio,createCompatibleRenderer} from './renderer-policy.js';
import {createEnemyFactory} from './enemies.js';
import {createEnemyDestructionFX,robotFailureCategory} from './enemy-destruction-fx.js';
import {createRobotShutdownAudio} from './enemy-shutdown-audio.js';

const $=id=>document.getElementById(id);
const canvas=$('view'),status=$('stats'),select=$('robot'),health=$('health'),slider=$('damage');
let renderer,engine,fx,robot=null,entity=null,dead=false,last=0,time=0,yaw=.48,pitch=.12,drag=null,labAudioCtx=null,labMuted=false;
function unlockLabAudio(){
 if(labMuted)return;
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  labAudioCtx ||=new Context();
  labAudioCtx.resume?.().catch?.(()=>{});
 }catch(error){console.warn('Audio indisponible sur cet appareil',error);}
}
const shutdownAudio=createRobotShutdownAudio({getContext:()=>!labMuted&&labAudioCtx?.state==='running'?labAudioCtx:null,getListener:()=>({x:0,z:4,elevation:0}),getYaw:()=>0});
function setLabMute(muted){
 labMuted=!!muted;if(labMuted)shutdownAudio.stop();
 $('sound').textContent=labMuted?'SON DÉSACTIVÉ':'SON ACTIVÉ';
 $('sound').setAttribute('aria-pressed',String(!labMuted));
}
$('sound').onclick=()=>{setLabMute(!labMuted);if(!labMuted)unlockLabAudio();};
const scene=new T.Scene();scene.background=new T.Color(0x141b2a);scene.fog=new T.FogExp2(0x1d2635,.025);
const camera=new T.PerspectiveCamera(53,1,.08,110);
const mk=(color,metalness=.45,roughness=.63)=>new T.MeshStandardMaterial({color,metalness,roughness});
const mats={monster:mk(0x394655),cyan:new T.MeshBasicMaterial({color:0x60d7fa,toneMapped:false}),pale:mk(0xc2d1e0),rose:new T.MeshBasicMaterial({color:0xfa83bf,toneMapped:false}),violet:new T.MeshBasicMaterial({color:0x9e85f4,toneMapped:false})};
const light=new T.HemisphereLight(0xc4d8f4,0x131424,2.0);scene.add(light);
const spot=new T.DirectionalLight(0xe6afae,2.9);spot.position.set(-4,9,5);scene.add(spot);
const rim=new T.PointLight(0xfc4ea8,20,12);rim.position.set(2,3,-3);scene.add(rim);
const floor=new T.Mesh(new T.CylinderGeometry(3,3,.25,44),mk(0x3e414f,.66,.45));floor.position.y=-.21;scene.add(floor);
const ringMat=new T.MeshBasicMaterial({color:0xff7cb5,toneMapped:false});
const ring=new T.Mesh(new T.TorusGeometry(2.62,.025,8,64),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-.074;scene.add(ring);
const grid=new T.GridHelper(22,22,0x516078,0x343f50);grid.position.y=-.085;scene.add(grid);
function pointCamera(){const target=robot?.userData?.form==='brute'?1.30:1.08;
 camera.position.set(5*Math.sin(yaw)*Math.cos(pitch),target+2.2*Math.sin(pitch)+1.7,5*Math.cos(yaw)*Math.cos(pitch));
 camera.lookAt(0,target,0);
}
function makeRobot(){
 if(robot){scene.remove(robot);robot=null;}
 fx?.reset();shutdownAudio.stop();
 const form=select.value,quality=/iPhone|OculusBrowser|Quest|Android/i.test(navigator.userAgent)?'low':'high';
 robot=engine.create(false,true,form);
 robot.position.set(0,0,0);robot.rotation.y=Math.PI*.20;
 scene.add(robot);
 entity={id:17,form,x:0,z:0,elevation:0,yaw:robot.rotation.y,hp:100,maxHp:100,elite:false,
  aimPitch:0,aimYaw:0,awareness:'engaged',combatPose:'attack',motionX:0,motionZ:0,limpUntil:0};
 dead=false;time=0;applyDamage();
}
function applyDamage(){if(!entity||dead)return;entity.hp=100-Number(slider.value);health.textContent=entity.hp+' PV';}
select.onchange=makeRobot;slider.oninput=applyDamage;
$('restart').onclick=()=>{unlockLabAudio();slider.value='78';makeRobot()};
$('destroy').onclick=()=>{
 unlockLabAudio();if(!robot||!entity||dead)return;
 dead=true;health.textContent='0 PV';
 fx.kill(robot,{id:entity.id,form:entity.form,x:0,z:0,groundY:0});
 entity=null;robot=null; // destruction FX owns rig until its final explosion.
};
function resize(){
 if(!renderer)return;
 const width=innerWidth,height=innerHeight,profile=graphicsProfile({userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints,platform:navigator.platform},'balanced');
 renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio||1,width,height));
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
canvas.addEventListener('pointerdown',e=>{unlockLabAudio();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;
 yaw+=Math.max(-.12,Math.min(.12,(e.clientX-drag.x)*.006));pitch=Math.max(-.4,Math.min(.5,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
addEventListener('resize',resize);
slider.addEventListener('pointerdown',unlockLabAudio);
function frame(now){
 const dt=Math.min(.05,(now-(last||now))*.001);last=now;time+=dt;
 pointCamera();
 if(entity&&robot){
  robot.userData.animate?.(time,0,false,entity,time);
  fx.mark(entity,robot,dt);
 }
 fx.update(dt);
 if(Math.floor(time*4)!==Math.floor((time-dt)*4)){
  const stats=fx.stats();
  status.textContent=(renderer.isWebGLRenderer?'WEBGL':'WEBGPU')+' · '+(robotFailureCategory(entity?.form||select.value))+
   '\nPV '+(entity?.hp??0)+' / 100\nÉTINCELLES '+stats.electricArcs+
   '\nPARTICULES '+stats.damagedParticles+'\nCHUTES '+stats.falling+
   '\nEXPLOSIONS '+stats.explosions;
 }
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
async function start(){
 const env={userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints,platform:navigator.platform,gpu:navigator.gpu};
 const profile=graphicsProfile(env,'balanced');
 const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
 renderer=prepared.renderer;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 engine=createEnemyFactory(mats,{detail:profile.phone||profile.headset?'low':'high'});
 fx=createEnemyDestructionFX(T,scene,{camera,low:profile.phone||profile.headset,maxDeaths:3,maxParticles:profile.phone||profile.headset?75:140,onSound:(kind,source)=>shutdownAudio.play(kind,source)});
 makeRobot();resize();requestAnimationFrame(frame);
}
start().catch(error=>{console.error(error);status.textContent='Échec du laboratoire : '+String(error.message||error)});
