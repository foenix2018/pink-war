import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {createCharacterKit} from './soldier.js';
import {buildGun} from './weapons.js';
import {createSurfaceDetails} from './surfaces.js';
import {characterForId} from './characters.js';
import {setKenneyAccent} from './kenney-blasters.js';
const $=id=>document.getElementById(id),canvas=$('viewer'),renderer=new WebGLRenderer({canvas,antialias:true});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene();scene.background=new T.Color(0x121923);const camera=new T.PerspectiveCamera(35,1,.015,20);
scene.add(new T.HemisphereLight(0xd1e6ff,0x34333b,2.4));
for(const [color,intensity,pos] of [[0xffeedc,3.5,[2,3,1]],[0x78b6ff,3,[-2,1,-2]],[0xffffff,2,[0,3,-3]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
const surfaces=createSurfaceDetails(),kit=createCharacterKit(new T.Texture(),surfaces),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial({color:0x6c8299,envMap:surfaces.environment})]));
const gun=buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}});scene.add(gun);
let weapon=2,angle=1.35,elevation=.25,zoom=1.7,frames=0;const target=new T.Vector3(0,0,-.30);
function selectWeapon(i){weapon=i;gun.userData.setVariant(i);target.z=-(i===0?.06:i===2?.3:.23);zoom=i===0?.8:1.7;$('weapon').value=String(i);}
function palette(id){const hero=characterForId(id);kit.setPalette(hero.armor);setKenneyAccent(hero.armor.rose);for(const [key,m] of Object.entries(mats))m.color.setHex(hero.palette[key]||hero.armor.steel);}
$('weapon').onchange=e=>selectWeapon(+e.target.value);$('character').onchange=e=>palette(e.target.value);$('side').onclick=()=>{angle=Math.PI/2;elevation=.08;};
const pointers=new Map();canvas.onpointerdown=e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const old=[...pointers.values()];pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){angle+=(e.clientX-p[0])*.008;elevation=Math.max(-1,Math.min(1,elevation+(e.clientY-p[1])*.006));}else{const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),before=Math.hypot(old[0][0]-old[1][0],old[0][1]-old[1][1]);zoom=Math.max(.35,Math.min(3,zoom*before/Math.max(1,d)));}};
canvas.onpointerup=canvas.onpointercancel=e=>pointers.delete(e.pointerId);canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.35,Math.min(3,zoom*Math.exp(e.deltaY*.001)));};
selectWeapon(2);palette('lylu');
function frame(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  gun.userData.hand.visible=$('hands').checked;gun.userData.support.visible=$('hands').checked&&weapon!==0;gun.userData.animateHands(0,.2,0,.016);
  const distance=zoom*Math.max(1,1.25/camera.aspect);
  camera.position.set(Math.sin(angle)*distance*Math.cos(elevation),target.y+Math.sin(elevation)*distance,target.z+Math.cos(angle)*distance*Math.cos(elevation));camera.lookAt(target);if(w>700)camera.setViewOffset(w,h,120,0,w,h);else camera.setViewOffset(w,h,0,100,w,h);
  renderer.render(scene,camera);frames++;$('status').textContent=`${gun.userData.kenneyAssets.loaded}/5 armes · Métal, céramique, polymère · Inspection libre`;requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.__PINKWAR_ARMORY=Object.freeze({selectWeapon,selectCharacter:palette,snapshot:()=>({version:'3.42',frames,weapon,loaded:gun.userData.kenneyAssets.loaded,muzzle:gun.userData.flash.position.toArray()})});
