import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {createCompatibleRenderer,graphicsProfile,rendererLabel,rendererBackend} from './renderer-policy.js';
import {createM10Art} from './m10-art.js';
import {PLAN,INTERACTIONS,buildCollisions} from './m10-layout.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),canvas=$('scene'),viewport=$('viewport');
const hero=params.get('character')==='lylu'?'lylu':'ghju';$('play').href='./niveau10.html?autostart=1&character='+hero+(params.get('renderer')==='webgl'?'&renderer=webgl':'');
let renderer,scene,art,ready=false,selected=null,theta=.38,phi=.96,span=230,target=new T.Vector3(4,12,-2),goal=target.clone(),goalSpan=230,last=0,time=0,pending=false,paused=false;
let lastWidth=0,lastHeight=0;
const camera=new T.PerspectiveCamera(36,1,.1,2500),markers=[];
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(w!==lastWidth||h!==lastHeight){renderer.setSize(w,h,false);lastWidth=w;lastHeight=h;}const aspect=w/h;camera.aspect=aspect;camera.updateProjectionMatrix();}
function aim(){const distance=span*.5/Math.tan(camera.fov*Math.PI/360)/camera.aspect;camera.position.set(target.x+Math.sin(theta)*Math.sin(phi)*distance,target.y+Math.cos(phi)*distance,target.z+Math.cos(theta)*Math.sin(phi)*distance);camera.lookAt(target);camera.updateMatrixWorld();}
function focus(id){
 selected=id;const it=INTERACTIONS.find(p=>p.id===id);
 goal=it?new T.Vector3(it.x,it.y+5,it.z):new T.Vector3(4,12,-2);goalSpan=it?(['archives','laboratoires'].includes(id)?42:65):230;
 if(!it){theta=.38;phi=.96;}$('selection').textContent=it?String(it.number).padStart(2,'0')+' · '+it.label:'VUE D’ENSEMBLE';
 for(const p of markers){p.button.setAttribute('aria-pressed',String(p.it.id===id));p.marker.classList.toggle('selected',p.it.id===id);}
}
for(const it of INTERACTIONS){
 const b=document.createElement('button');b.type='button';b.innerHTML='<b>'+String(it.number).padStart(2,'0')+'</b><span>'+it.label+'</span>';b.setAttribute('aria-pressed','false');b.onclick=()=>focus(it.id);$('objectives').append(b);
 const marker=document.createElement('button');marker.className='marker';marker.textContent=String(it.number).padStart(2,'0');marker.type='button';marker.tabIndex=-1;marker.title=it.label;marker.onclick=()=>focus(it.id);$('markers').append(marker);markers.push({it,button:b,marker,point:new T.Vector3(it.x,it.y+3,it.z)});
}
function labels(){const w=viewport.clientWidth,h=viewport.clientHeight;for(const p of markers){const v=p.point.clone().project(camera);p.marker.hidden=v.z< -1||v.z>1||v.x< -1||v.x>1||v.y< -1||v.y>1;p.marker.style.left=(v.x*.5+.5)*w+'px';p.marker.style.top=(-v.y*.5+.5)*h+'px';}}
async function frame(stamp){
 requestAnimationFrame(frame);if(!ready||pending||paused)return;const dt=Math.min(.08,last?(stamp-last)/1000:1/60);last=stamp;time+=dt;
 target.lerp(goal,1-Math.exp(-dt*5));span+=(goalSpan-span)*(1-Math.exp(-dt*5));resize();aim();art.update(time,dt,camera);labels();
 try{if(renderer.renderAsync){pending=true;await renderer.renderAsync(scene,camera);}else renderer.render(scene,camera);}catch(e){ready=false;$('loading').hidden=false;$('loading').querySelector('b').textContent='Rendu interrompu : '+e.message;}finally{pending=false;}
}
try{
 const env={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},profile=graphicsProfile(env,params.get('quality')==='low'?'low':'auto',params.get('renderer')==='webgl');
 const low=profile.phone||profile.economy||params.get('quality')==='low';const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile:{...profile,antialias:profile.antialias&&!low}});renderer=prepared.renderer;
 renderer.shadowMap.enabled=!low;renderer.shadowMap.autoUpdate=false;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene=new T.Scene();art=createM10Art(T,scene,{quality:low?'low':'normal',webgpu:rendererBackend(renderer)==='webgpu'});art.build(buildCollisions());await art.ready;
 if(!low){art.sun.castShadow=true;art.sun.shadow.mapSize.set(1536,1536);Object.assign(art.sun.shadow.camera,{left:-185,right:185,top:185,bottom:-185,near:1,far:650});art.sun.shadow.bias=-.0004;art.sun.shadow.normalBias=.13;renderer.shadowMap.needsUpdate=true;}
 resize();aim();art.update(3,0,camera);if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
 $('renderer').textContent=rendererLabel(renderer)+' · COURONNE HELIX';$('loading').hidden=true;ready=true;requestAnimationFrame(frame);
}catch(error){$('loading').querySelector('b').textContent='Chargement interrompu : '+error.message;console.error('Jardins',error);}
const pointers=new Map();let pinchDistance=null;
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);if(pointers.size===1){theta-=(e.clientX-old.x)*.004;phi=T.MathUtils.clamp(phi+(e.clientY-old.y)*.003,.25,1.35);}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)goalSpan=T.MathUtils.clamp(goalSpan*pinchDistance/d,30,480);pinchDistance=d;}});
for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);pinchDistance=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();goalSpan=T.MathUtils.clamp(goalSpan*Math.exp(e.deltaY*.001),30,480);},{passive:false});
$('reset').onclick=()=>focus(null);$('zoom-in').onclick=()=>{goalSpan=Math.max(30,goalSpan*.8);};$('zoom-out').onclick=()=>{goalSpan=Math.min(480,goalSpan*1.25);};window.addEventListener('resize',resize);
window.__PINK_M10_VIEW=Object.freeze({snapshot:()=>({ready,selected,backend:renderer&&rendererBackend(renderer),...art?.stats()}),focus,debug:params.has('debug')?{pause(value=true){paused=value;},get renderer(){return renderer;},get scene(){return scene;},get camera(){return camera;},get art(){return art;},setTime(t){time=t;},setView({position,lookAt,width=span}){camera.position.set(...position);camera.lookAt(...lookAt);span=goalSpan=width;target.set(...lookAt);goal.copy(target);camera.updateMatrixWorld();}}:null});
