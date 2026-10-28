import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {createCharacterKit} from './soldier.js';
import {buildGun} from './weapons.js';
import {createSurfaceDetails} from './surfaces.js';
import {characterForId} from './characters.js';
import {setKenneyAccent} from './kenney-blasters.js';
import {playLaserShot,playWeaponAction} from './laser-sound.js';
const $=id=>document.getElementById(id),canvas=$('viewer'),renderer=new WebGLRenderer({canvas,antialias:true});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene();scene.background=new T.Color(0x121923);const camera=new T.PerspectiveCamera(35,1,.015,20);
scene.add(new T.HemisphereLight(0xd1e6ff,0x34333b,2.4));
for(const [color,intensity,pos] of [[0xffeedc,3.5,[2,3,1]],[0x78b6ff,3,[-2,1,-2]],[0xffffff,2,[0,3,-3]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
const surfaces=createSurfaceDetails(),kit=createCharacterKit(new T.Texture(),surfaces),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial({color:0x6c8299,envMap:surfaces.environment})]));
const gun=buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}});scene.add(gun);
let weapon=6,angle=1.35,elevation=.25,zoom=1.7,frames=0,shotAt=-99,reloadAt=-99,audio=null,nextHand='right';const dualState={shotAt:{left:-Infinity,right:-Infinity}};const target=new T.Vector3(0,0,-.30);
function selectWeapon(i){weapon=i;gun.userData.setVariant(i);target.x=i===7?-.22:0;target.z=-(i===0||i===7?.06:i===2?.3:i===6?.17:.23);zoom=i===0?.8:i===7?1.2:1.7;$('weapon').value=String(i);}
function palette(id){const hero=characterForId(id);$('character').value=hero.id;kit.setPalette(hero.armor);setKenneyAccent(hero.armor.rose);for(const [key,m] of Object.entries(mats))m.color.setHex(hero.palette[key]||hero.armor.steel);}
$('weapon').onchange=e=>selectWeapon(+e.target.value);$('character').onchange=e=>palette(e.target.value);$('side').onclick=()=>{angle=Math.PI/2;elevation=.08;};
$('test-shot').onclick=()=>{const now=performance.now()/1000;if(now-shotAt<(weapon===7?.1:.88)||now-reloadAt<2.8)return;shotAt=now;dualState.shotAt[nextHand]=now;nextHand=nextHand==='right'?'left':'right';
 try{audio ||=new AudioContext();audio.resume().then(()=>playLaserShot(audio,weapon===6?'m12':['r9','bloom','lance','thorn','nova'][weapon]));}catch{}};
$('test-reload').onclick=()=>{reloadAt=performance.now()/1000;try{audio ||=new AudioContext();audio.resume().then(()=>playWeaponAction(audio,weapon===6?'m12':'r9','reload-out'));}catch{}};
const pointers=new Map();canvas.onpointerdown=e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const old=[...pointers.values()];pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){angle+=(e.clientX-p[0])*.008;elevation=Math.max(-1,Math.min(1,elevation+(e.clientY-p[1])*.006));}else{const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),before=Math.hypot(old[0][0]-old[1][0],old[0][1]-old[1][1]);zoom=Math.max(.35,Math.min(3,zoom*before/Math.max(1,d)));}};
canvas.onpointerup=canvas.onpointercancel=e=>pointers.delete(e.pointerId);canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.35,Math.min(3,zoom*Math.exp(e.deltaY*.001)));};
const query=new URLSearchParams(location.search);selectWeapon(query.has('weapon')?Number(query.get('weapon')):6);palette(query.get('character')||'lylu');
function frame(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const now=performance.now()/1000,elapsed=now-shotAt,reload=Math.max(0,(now-reloadAt)/2.8),reloading=reload<1;
  gun.userData.setCombatState({time:now,dualState,ammo:elapsed<10?7:8,capacity:8,impulse:Math.max(0,1-elapsed*18),kick:Math.max(0,.09*Math.exp(-elapsed*15)),reloading,reloadProgress:reload});
  gun.userData.setFlash(elapsed<.045,now);
  gun.position.z=weapon!==7&&elapsed<.25?.05*Math.sin(Math.min(1,elapsed/.25)*Math.PI):0;
  gun.userData.hand.visible=$('hands').checked;gun.userData.support.visible=$('hands').checked&&weapon!==0;gun.userData.animateHands(0,.2,0,.016);
  const distance=zoom*Math.max(1,1.25/camera.aspect);
  camera.position.set(Math.sin(angle)*distance*Math.cos(elevation),target.y+Math.sin(elevation)*distance,target.z+Math.cos(angle)*distance*Math.cos(elevation));camera.lookAt(target);if(w>700)camera.setViewOffset(w,h,120,0,w,h);else camera.setViewOffset(w,h,0,100,w,h);
  renderer.render(scene,camera);frames++;$('status').textContent=weapon===1?'NEXUS V9 · Mitraillette numérique · viseur transparent cyan':weapon===2?'ARES X9 · Châssis futuriste / optique numérique ×4 / bipied intégré':weapon===6?'M–12 · Modèle original Blender · Pompe mobile · Finition gris foncé/violet':weapon===0?'VX-9 Orbital · Viseur transparent et réticule cyan · Modèle V5':weapon===7?'GHJU · VX-9 DUO · Deux pistolets VX-9 · 12 + 12 cellules':weapon===8?'VORTEX AR-7 V5 · Métal satiné · viseur reflex transparent · 36 cellules roses':`${gun.userData.kenneyAssets.loaded}/5 blasters · Métal, céramique, polymère · Inspection libre`;requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.__PINKWAR_ARMORY=Object.freeze({selectWeapon,selectCharacter:palette,snapshot:()=>({version:'3.54',frames,weapon,loaded:gun.userData.kenneyAssets.loaded,muzzle:gun.userData.flash.position.toArray()})});
