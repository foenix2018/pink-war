import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame} from './game-logic.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createCompanionSkills} from './companion-skills.js';
import {createCompanionMenu} from './companion-menu.js';
import {createCompanionSkillFX} from './companion-skill-fx.js';
import {createAICompanion} from './ai-companions.js';
import {createEnemyFactory} from './enemies.js';
import {createCampaignCombatEffects} from './campaign-combat-effects.js';
import {playLaserImpact,playLaserShot} from './laser-sound.js';

const $=id=>document.getElementById(id),status=$('status');
const params=new URLSearchParams(location.search),profile=graphicsProfile(navigator,'auto',params.get('renderer')==='webgl');
let renderer,canvas=$('lab'),camera,scene,game,skills,menu,fx,orb,effects,audio;
let sound=true;try{sound=JSON.parse(localStorage.getItem('rosee-settings')||'{}').sound!==false;}catch{}
let yaw=0,pitch=-.035,last=0,pending=false,frames=0;const keys=new Set(),models=new Map();
const obstacles=[{x:0,y:0,z:-9,hx:2.7,hz:.35,height:1.8},{x:-6,y:0,z:-19,hx:.35,hz:4,height:3},{x:7,y:0,z:-26,hx:3,hz:.35,height:2.7}];
const mats={};
function audioReady(){if(!sound)return;try{const C=window.AudioContext||window.webkitAudioContext;audio ||=new C();void audio.resume();}catch{}}
function aim(){camera.updateMatrixWorld(true);return {origin:camera.getWorldPosition(new T.Vector3()),direction:camera.getWorldDirection(new T.Vector3()),emitter:orb.root.position};}
function reset(){
 menu?.dispose();fx?.dispose();orb?.dispose();effects?.dispose();skills?.reset();
 const discarded=new Set();for(const model of models.values()){model.traverse(o=>{if(o.geometry)discarded.add(o.geometry);});model.removeFromParent();}for(const geometry of discarded)geometry.dispose();models.clear();
 const hero=$('hero').value;
 game=new ArenaGame(obstacles,()=>.5);game.mode='lab';game.wave=0;game.nextWave=-1;game.toSpawn=0;game.invulnerable=1e9;game.enemies=[];
 Object.assign(game.player,{x:0,z:9,elevation:0});
 skills=createCompanionSkills({characterId:hero,mode:'lab'});orb=createAICompanion(T,scene,hero);fx=createCompanionSkillFX(T,scene,skills);effects=createCampaignCombatEffects(T,scene,hero);
 const factory=createEnemyFactory(mats);
 for(const [i,form,x,z]of [[0,'synth',-3,-16],[1,'seer',4,-20],[2,'listener',0,-28]]){
  const e={id:i+1,form,x,z,elevation:0,aimHeight:1.35,hitRadius:.9,hp:450,ranged:true,elite:false,tier:2,speed:2.2,radius:.65,phase:i,attackTimer:1+i,awareness:'engaged',lastKnownX:0,lastKnownZ:9,lastKnownHeight:0,alertedUntil:10,homeX:x,homeZ:z,patrolTimer:2,yaw:0,grounded:true,verticalSpeed:0};
  game.enemies.push(e);const model=factory.create(false,true,form);models.set(e.id,model);scene.add(model);
 }
 yaw=0;pitch=-.035;keys.clear();
 menu=createCompanionMenu({getStatus:()=>skills.snapshot(game),onUse:id=>{audioReady();const used=skills.use(id,{game,...aim()});if(used)orb.react({type:'companion-assist',name:skills.name});return used;},onChange(open){keys.clear();if(open)document.exitPointerLock?.();}});menu.setVisible(true);
 camera.position.set(0,1.65,9);camera.rotation.set(pitch,0,0,'YXZ');
}
function resize(){if(!renderer)return;renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function tick(t){
 requestAnimationFrame(tick);const dt=Math.max(0,Math.min(.04,(t-last)/1000||.016));last=t;
 if(!menu.isOpen){
  game.step(dt,{x:Number(keys.has('KeyD'))-Number(keys.has('KeyA')||keys.has('KeyQ')),z:Number(keys.has('KeyS'))-Number(keys.has('KeyW')||keys.has('KeyZ')),yaw});
  camera.position.set(game.player.x,game.player.elevation+1.65,game.player.z);camera.rotation.set(pitch,yaw,0,'YXZ');
  skills.update(dt,{game});orb.update(dt,{game,camera,active:true,assistance:false});
 }
 for(const e of game.enemies){const model=models.get(e.id);model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;model.userData.animate?.(game.time,e.phase,true,e,game.time);}
 for(const [id,model]of models)if(!game.enemies.some(e=>e.id===id)){model.removeFromParent();models.delete(id);}
 for(const event of game.drainEvents())effects.event(event);
 for(const event of skills.drainEvents())if(audio){if(event.type==='companion-phase')playLaserShot(audio,'nova',.55);if(event.type==='companion-explosion')playLaserImpact(audio,{...event,surface:'metal'});}
 fx.update();effects.update(game,dt,camera);menu.refresh();
 $('readout').textContent='G : '+skills.name.toUpperCase()+' · '+game.enemies.length+' robots · Boule d’énergie : '+Math.ceil(skills.snapshot(game).skills[0].remaining)+' s · Viser avec la souris ou un glissement. ZQSD / WASD : bouger. Simulation hors campagne.';
 if(!pending){try{const draw=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);if(draw?.then){pending=true;draw.then(()=>pending=false).catch(fail);}frames++;}catch(error){fail(error);}}
}
function fail(error){status.hidden=false;status.textContent='Atelier indisponible : '+error.message;console.error(error);}
async function boot(){
 const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});renderer=prepared.renderer;canvas=prepared.canvas;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;canvas.tabIndex=0;
 scene=new T.Scene();scene.background=new T.Color(0x182a35);scene.fog=new T.Fog(0x182a35,45,95);camera=new T.PerspectiveCamera(65,1,.05,140);
 scene.add(new T.HemisphereLight(0xadbcc5,0x272d2b,1.6));const sun=new T.DirectionalLight(0xffe7c3,2.2);sun.position.set(-5,10,6);scene.add(sun);
 const iron=new T.MeshStandardMaterial({color:0x454c4c,roughness:.7,metalness:.45}),floorMat=new T.MeshStandardMaterial({color:0x4a5559,roughness:.93,metalness:.05});
 const floor=new T.Mesh(new T.PlaneGeometry(60,90),floorMat);floor.rotation.x=-Math.PI/2;floor.position.z=-20;scene.add(floor);
 const grid=new T.GridHelper(60,30,0x53605b,0x414d4b);grid.position.set(0,.005,-15);scene.add(grid);
 for(const b of obstacles){const mesh=new T.Mesh(new T.BoxGeometry(b.hx*2,b.height,b.hz*2),iron);mesh.position.set(b.x,b.height/2,b.z);scene.add(mesh);}
 Object.assign(mats,{monster:iron,monsterFace:iron,cyan:new T.MeshBasicMaterial({color:0x5ab6d0}),rose:new T.MeshBasicMaterial({color:0xe84d9e}),violet:iron,pale:floorMat});
 $('hero').value=params.get('character')==='lylu'?'lylu':'ghju';$('hero').onchange=reset;$('reset').onclick=reset;
 reset();resize();window.addEventListener('resize',resize);
 document.addEventListener('keydown',e=>{if(e.target.closest?.('select,input'))return;keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
 let pointer=null,lx=0,ly=0;
 canvas.addEventListener('pointerdown',e=>{if(menu.isOpen)return;canvas.focus({preventScroll:true});pointer=e.pointerId;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||menu.isOpen)return;yaw-=(e.clientX-lx)*.004;pitch=Math.max(-1.3,Math.min(1.3,pitch-(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY;});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>pointer=null);
 status.hidden=true;requestAnimationFrame(tick);
 window.__PINKWAR_COMPANIONS={snapshot:()=>({hero:$('hero').value,frames,backend:renderer.isWebGLRenderer?'webgl':'webgpu',menu:menu.isOpen,skills:skills.snapshot(game),enemies:game.enemies.map(e=>({id:e.id,hp:e.hp,state:e.combatPose,crouch:e.coverCrouch||0})),projectiles:skills.projectiles.map(p=>({x:p.x,y:p.y,z:p.z}))}),reset};
}
boot().catch(fail);
