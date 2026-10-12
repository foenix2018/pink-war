import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {createCharacterKit} from './soldier.js';
import {createRLHGlove,RLH_POSES} from './rlh-gloves.js';
import {characterForId} from './characters.js';

const $=id=>document.getElementById(id),canvas=$('hands-world');
const kit=createCharacterKit(new T.Texture());
const scene=new T.Scene();scene.background=new T.Color(0x171e29);
const camera=new T.PerspectiveCamera(35,1,.005,10);
const renderer=navigator.gpu?new T.WebGPURenderer({canvas,antialias:true}):new WebGLRenderer({canvas,antialias:true});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
scene.add(new T.HemisphereLight(0xf2f6ff,0x333c49,2.5));
const key=new T.DirectionalLight(0xffffff,4);key.position.set(-.35,.65,.70);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-.4;key.shadow.camera.right=.4;key.shadow.camera.top=.4;key.shadow.camera.bottom=-.4;key.shadow.camera.near=.1;key.shadow.camera.far=2;key.shadow.normalBias=.001;scene.add(key);
const rim=new T.DirectionalLight(0xb6c9df,1.4);rim.position.set(.5,.2,-.6);scene.add(rim);
const left=createRLHGlove(kit.gloves,{mirror:true}),right=createRLHGlove(kit.gloves);left.position.x=-.075;right.position.x=.075;scene.add(left,right);
left.userData.setLevel(1);right.userData.setLevel(1);
const floor=new T.Mesh(new T.CircleGeometry(.7,64),new T.MeshStandardMaterial({color:0x242e3b,roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.y=-.171;floor.receiveShadow=true;scene.add(floor);
let yaw=.20,pitch=.10,distance=innerWidth<=760&&innerHeight>510?1.30:.77,selection='GD',pose='rest',character='ghju',demo=false,last=0,time=0,frames=0;
const target=new T.Vector3(0,.027,0),pointers=new Map();let pinch=0;
function updateCamera(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);camera.updateProjectionMatrix();}
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,innerWidth>760?innerWidth*.12:0,innerWidth<=760&&innerHeight>510?innerHeight*.18:0,innerWidth,innerHeight);updateCamera();}window.addEventListener('resize',resize);
function selectCharacter(id){character=id;const info=characterForId(id);kit.setPalette(info.armor);document.documentElement.style.setProperty('--accent',info.accent);for(const b of document.querySelectorAll('[data-character]'))b.setAttribute('aria-pressed',String(b.dataset.character===id));caption();}
function caption(){$('hand-caption').textContent=`${character.toUpperCase()} · ${selection==='GD'?'GANTS GAUCHE & DROIT':selection==='G'?'GANT GAUCHE':'GANT DROIT'}`;}
function setPose(name,instant=false){pose=name;demo=false;$('demo-button').setAttribute('aria-pressed','false');for(const hand of [left,right])hand.userData.rig.pose(name,instant);for(const b of document.querySelectorAll('[data-pose]'))b.setAttribute('aria-pressed',String(b.dataset.pose===name));const p=RLH_POSES[name];if(p){$('index-flex').value=p.index*100;$('grip-flex').value=(p.middle+p.ring+p.pinky)/3*100;$('thumb-flex').value=p.thumbCurl*100;$('wrist-flex').value=p.wristFlex;}}
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>selectCharacter(b.dataset.character);
for(const b of document.querySelectorAll('[data-side]'))b.onclick=()=>{selection=b.dataset.side;left.visible=selection!=='D';right.visible=selection!=='G';for(const btn of document.querySelectorAll('[data-side]'))btn.setAttribute('aria-pressed',String(btn===b));target.x=selection==='D'?.075:selection==='G'?-.075:0;caption();updateCamera();};
for(const b of document.querySelectorAll('[data-pose]'))b.onclick=()=>setPose(b.dataset.pose);
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>{yaw=b.dataset.camera==='palm'?Math.PI:b.dataset.camera==='side'?Math.PI/2:.20;pitch=.10;updateCamera();};
function manual(values){demo=false;$('demo-button').setAttribute('aria-pressed','false');for(const b of document.querySelectorAll('[data-pose]'))b.setAttribute('aria-pressed','false');for(const h of [left,right])h.userData.rig.pose(values);}
$('index-flex').oninput=e=>manual({index:Number(e.target.value)/100});$('grip-flex').oninput=e=>{const n=Number(e.target.value)/100;manual({middle:n,ring:n,pinky:n});};$('thumb-flex').oninput=e=>manual({thumbCurl:Number(e.target.value)/100});$('wrist-flex').oninput=e=>manual({wristFlex:Number(e.target.value)});
$('demo-button').onclick=()=>{demo=!demo;$('demo-button').setAttribute('aria-pressed',String(demo));};
$('menu-toggle').onclick=()=>{$('hand-panel').hidden=!$('hand-panel').hidden;$('menu-toggle').setAttribute('aria-expanded',String(!$('hand-panel').hidden));};
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===2){const a=[...pointers.values()],n=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch>0)distance=Math.max(.32,Math.min(1.5,distance*pinch/Math.max(1,n)));pinch=n;}else{yaw-=dx*.008;pitch=Math.max(-.65,Math.min(.85,pitch+dy*.008));}updateCamera();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(.32,Math.min(1.5,distance*Math.exp(e.deltaY*.001)));updateCamera();},{passive:false});
let initial='ghju';try{initial=characterForId(localStorage.getItem('pink-war-character')).id;}catch{}selectCharacter(initial);setPose('rest',true);resize();
try{if(renderer.init)await renderer.init();await renderer.compileAsync(scene,camera);renderer.setAnimationLoop(timestamp=>{const dt=last?Math.min(.05,(timestamp-last)/1000):.016;last=timestamp;time+=dt;if(demo){const c=(Math.sin(time*1.4)+1)*.5;for(const h of [left,right])h.userData.rig.pose({index:.13+.66*c,middle:.17+.69*c,ring:.21+.67*c,pinky:.28+.61*c,thumbCurl:.15+.4*c,thumbOpp:.25+.5*c});}for(const h of [left,right])h.userData.rig.maj(dt);renderer.render(scene,camera);frames++;});window.__PINKWAR_HANDS={snapshot:()=>({source:'RLH V40',character,selection,pose,frames,backend:renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL',left:{...left.userData.rig.etat},right:{...right.userData.rig.etat},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};}catch(error){console.error(error);$('hands-error').hidden=false;}
