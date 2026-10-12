import * as T from './vendor/three.module.min.js';
import { createEnemyFactory } from './enemies.js';
import { createSurfaceDetails } from './surfaces.js';
import { WEAPONS } from './game-logic.js';
import { loadRealLaserSample, playLaserShot } from './laser-sound.js';
const $=id=>document.getElementById(id),canvas=$('enemy-canvas');
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color(0x111a29);scene.fog=new T.Fog(0x111a29,8,30);
const camera=new T.PerspectiveCamera(38,1,.05,80);camera.position.set(0,1.65,4.8);camera.lookAt(0,1.08,0);
scene.add(new T.HemisphereLight(0xc8dcff,0x1a1825,2.2));
for(const [color,power,position] of [[0xe8f0ff,3.7,[-4,5,4]],[0xff85b6,2.1,[3,2,-2]]]){const light=new T.DirectionalLight(color,power);light.position.set(...position);scene.add(light);}
const surfaces=createSurfaceDetails(),metal=(color,roughness)=>new T.MeshStandardMaterial({color,roughness,metalness:.55,roughnessMap:surfaces.coating,map:surfaces.machine,bumpMap:surfaces.machine,bumpScale:.004,envMap:surfaces.environment,envMapIntensity:.35});
const factory=createEnemyFactory({monster:metal(0x546170,.57),monsterElite:metal(0x665265,.43),monsterFace:metal(0x121b23,.36),rose:new T.MeshBasicMaterial({color:0xff84b7}),cyan:new T.MeshBasicMaterial({color:0x9bd9e8}),violet:new T.MeshBasicMaterial({color:0xac84ec}),pale:new T.MeshBasicMaterial({color:0xe7f3fc})});
const floor=new T.Mesh(new T.CylinderGeometry(1.45,1.5,.06,48),metal(0x253345,.8));floor.position.y=-.04;scene.add(floor);
const forms={stalker:['Poursuivant','Ancien châssis de sécurité : il patrouille, contourne les obstacles et poursuit les cibles visibles.'],scuttler:['Rampant','Six pattes articulées et une silhouette basse. Cette machine de maintenance passe sous les lignes de tir et avance plus vite.'],seer:['Sentinelle','Capteurs allongés, silhouette fine et arme de surveillance. Ses tirs restent bloqués par les murs.'],brute:['Brute','Châssis de siège, grands vérins et blindage lourd. Les élites renforcent les dernières vagues.'],probe:['Sonde S-03','Quatre turbines et un œil sur cardan. Elle prend de la hauteur et annonce son tir avant de l’envoyer vers votre ancienne position.'],listener:['Traqueur E-06','À partir du niveau 6 : antennes et pavillons acoustiques. Il entend plus loin, enquête sur le bruit et transmet une alerte aux unités proches.'],bulwark:['Rempart B-11','À partir du niveau 11 : avant-bras protégés et torse blindé, déplacement plus lent. Visez le capteur de tête pour contourner sa protection.']};
let actor=null,angle=Math.PI+.2,time=0,previous=0,drag=null,audio=null;
function select(form){actor?.removeFromParent();actor=factory.create(false,['seer','probe','listener','bulwark'].includes(form),form);scene.add(actor);$('name').textContent=forms[form][0];$('description').textContent=forms[form][1];for(const b of $('forms').children)b.setAttribute('aria-pressed',String(b.dataset.form===form));}
for(const [form,[name]] of Object.entries(forms)){const b=document.createElement('button');b.textContent=name;b.dataset.form=form;b.onclick=()=>select(form);$('forms').append(b);}
for(const w of WEAPONS){const b=document.createElement('button');b.textContent=w.name;b.onclick=async()=>{try{audio||=new AudioContext();await audio.resume();$('sound-status').textContent='Chargement des sons…';await loadRealLaserSample(audio);playLaserShot(audio,w.id,1);$('sound-status').textContent=w.name+' · '+w.label;}catch{$('sound-status').textContent='Le son est indisponible dans ce navigateur.';}};$('sounds').append(b);}
canvas.addEventListener('pointerdown',e=>{drag=e.clientX;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag!==null){angle+=(e.clientX-drag)*.008;drag=e.clientX;}});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);canvas.style.touchAction='none';
function resize(){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();select('listener');
renderer.setAnimationLoop(ms=>{const dt=Math.min(.05,(ms-previous)/1000||0);previous=ms;time+=dt;if(actor){actor.rotation.y=angle;actor.userData.animate?.(time,0,false,{},time);}renderer.render(scene,camera);});
window.__PINKWAR_ENEMIES={select,get actor(){return actor;},renderer,scene,camera};
