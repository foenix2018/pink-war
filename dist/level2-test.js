import {createWorldShadows,createGroundOcclusion} from './world-shadows.js';
// PINK WARS / M02 "SOUS LES NÉONS" — isolated vertical-slice test.
// Simulation, collisions, jump, stamina/health, weapons and hostiles are
// imported unchanged from the production game. The cyberpunk world is new.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame,WEAPONS,clamp,segmentBox,traceEnemyHit} from './game-logic.js';
import {createPinkWarsInput,createPinkWarsTouch} from './level2-input.js';
import {createWeaponFeel,recoilPose} from './weapon-feel.js';
import {loadRealLaserSample,loadCombatSamples,playLaserShot,playEnemyShot,playWeaponAction,playLaserImpact,setLaserAudioEnabled} from './laser-sound.js';
import {aimSensitivity,magnifiedFov,flatSightPose} from './optics.js';
import {OPTICS} from './weapons.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createEnemyFactory} from './enemies.js';
import {buildGun} from './weapons.js';
import {createDistrictArchitecture} from './level2-architecture.js';
import {installLeanPBR} from './level2-materials.js';
import {createStreetAtmosphere} from './level2-atmosphere.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {showChapter2Finale} from './story-chapters.js';
import {createCampaignCombatEffects} from './campaign-combat-effects.js';
import {createAICompanion} from './ai-companions.js';
import {createAmbience} from './ambience.js';
import {createFireBuffer} from './fire-input.js';
import {createCompanionSkills} from './companion-skills.js';
import {createCompanionMenu} from './companion-menu.js';
import {createMissionLoading} from './mission-loading.js';
import {createPauseMenu} from './fracture-menu.js';
import {createMissionXR,immersiveRendererPreferred} from './mission-xr.js';
import {createGlove} from './hands.js';
import {mountCombatHud} from './combat-hud.js';
import {createArmorFeedback,meleeKick,MELEE_POSE} from './armor-feedback.js';
import {createDistrictSignage} from './level2-signage.js';
import {createWarZone} from './level2-war-zone.js';
import {createBattleAudio} from './level2-battle-audio.js';
import {bevelBox} from './geo.js';
import {createArchiveTerminalFactory} from './archive-terminals.js';

const $=id=>document.getElementById(id);
const characterId=new URLSearchParams(location.search).get('character')==='lylu'?'lylu':'ghju';
document.documentElement.dataset.universe=characterId==='lylu'?'blue':'pink';
const main=$('game'),shade=$('shade'),startButton=$('start'),status=$('status');
const autoMission=new URLSearchParams(location.search).get('manual')!=='1';
const missionLoading=autoMission?(window.__PINKWAR_MISSION_LOADING||createMissionLoading({mission:2,characterId})):null;
const quality=$('quality'),hud=$('hud');
if(new URLSearchParams(location.search).get('quality')==='low')quality.value='low';
const low=()=>quality.value==='low';
const rng=(()=>{let s=220102;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
let canvas=main,renderer,scene,camera,game,weapon,clock=0,running=false,started=false,last=0,fpsTime=0,frames=0,framePending=false,recovering=false,bootStep='modules';
let yaw=0,pitch=0,stage=0,reported=-1;
let noticeUntil=0,signal=0,rain,enemyFactory,root,architecture,pbrController,atmosphere;
let worldShadows=null,groundOcclusion=null;
let view='fps',aimBlend=0,mouseAim=false,playerRig=null,touchControls=null,paused=false;
let jumpQueued=false,crouchQueued=false,firePressQueued=false,weaponReady=false,audioCtx=null;
const weaponFeel=createWeaponFeel(),pinkControls=createPinkWarsInput();
const fireInput=createFireBuffer();

let enableAudio=true;try{enableAudio=JSON.parse(localStorage.getItem('rosee-settings')||'{}').sound!==false;}catch{}
let xr=null,fallbackGun=null,fallbackHand=null;
// Armour layer (3.63): strikes and throws queued by the keyboard, the mouse and the touch buttons.
let armorFx=null,meleeQueued=false,chargeQueued=false,touchSprinting=false;
const armorTouch=(kind,value)=>{if(kind==='sprint'){touchSprinting=!!value;return;}if(!running||paused)return;audioReady();if(kind==='melee')meleeQueued=true;else if(kind==='charge')chargeQueued=true;else if(kind==='reload')game.reload();else if(kind==='next')game.cycleWeapon();else if(kind==='interact')interact();else if(kind==='crouch')crouchQueued=true;};
const pauseMenu=createPauseMenu({title:'HISTOIRE / SOUS LES NÉONS',canOpen:()=>started,settingsSelectors:['#quality'],
 onPause:()=>pauseMission(),onResume:()=>unpauseMission(),onVR:()=>xr?.enter(),onHome:async()=>{await xr?.exit();location.assign('./index.html');}});pauseMenu.setVisible(false);
let combatEffects=null,companion=null,environmentAudio=null,warZone=null,battleAudio=null;
let companionSkills=null,skillMenu=null;
function audioReady(){
 if(!enableAudio)return;
 if(audioCtx){void audioCtx.resume?.().catch?.(()=>{});return;}
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;audioCtx=window.__PINKWAR_BOOT_AUDIO||new Context();
  audioCtx.resume?.().catch?.(()=>{});
  setLaserAudioEnabled(audioCtx,enableAudio);void loadRealLaserSample(audioCtx);void loadCombatSamples(audioCtx);
  environmentAudio=createAmbience(audioCtx);
  battleAudio=createBattleAudio(audioCtx);
 }catch(error){console.warn('M02 audio fallback',error);}
}
document.addEventListener('pointerdown',audioReady,{once:true,capture:true,passive:true});
document.addEventListener('keydown',audioReady,{once:true,capture:true});

const keys=new Set(),enemyMeshes=new Map(),shotMeshes=new Map();
const collisions=[],floors=[],beacons=[],lightSources=[],decals=[];
const field={minX:-42,maxX:42,minZ:-81,maxZ:79};
const objectives=[
 {x:0,z:53,y:0,label:'LOCALISER LES CIVILS',description:'Rejoins le poste de soins clandestin à l’entrée de la ruelle.'},
 {x:-8,z:14,y:0,label:'LIBÉRER LA GALERIE',description:'Repousse la patrouille, puis consulte le terminal HELIX.'},
 {x:0,z:-18,y:12,label:'REJOINDRE LES PASSERELLES',description:'Monte par le véritable escalier à droite jusqu’à +12 m.'},
 {x:-5,z:-57,y:0,label:'OUVRIR LA TOUR DE TRANSIT',description:'Descends à gauche et déverrouille l’évacuation.'}
];
function mat(hex,rough=.8,metal=.1){return new T.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});}
function glow(hex){return new T.MeshBasicMaterial({color:hex,toneMapped:false});}
const materials={
 asphalt:mat(0x667781,.40,.08),road:mat(0x35424c,.67,.40),concrete:mat(0x68767c,.83,.035),
 dark:mat(0x121a25,.58,.62),iron:mat(0x3b4752,.45,.76),wall:mat(0x344350,.78,.21),
 plaster:mat(0x63727b,.88,.08),rust:mat(0x514138,.84,.58),glass:mat(0x213e4a,.16,.56),
 black:mat(0x071019,.69,.32),warning:mat(0x94754d,.66,.32),
 cyan:glow(0x3acddd),amber:glow(0xf6aa58),red:glow(0xe34e5b),
 rose:glow(0xff4fa1),blue:glow(0x4ba8ff),white:glow(0xc2e5eb)
};
let districtSigns=null;
const cube=new T.BoxGeometry(1,1,1), plane=new T.PlaneGeometry(1,1);
const projectileCore=new T.SphereGeometry(.07,6,4);
function solid(x,y,z,w,h,d,m,collide=true,shadow=true){
 const o=new T.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.receiveShadow=shadow;o.castShadow=shadow&&!low();root.add(o);
 o.userData.isCollider=collide;o.userData.staticBox=true;
 if(collide)collisions.push({x,z,hx:w/2,hz:d/2,y:y-h/2,height:h,surface:m===materials.iron?'metal':'concrete'});
 return o;
}
const beamGeometryCache=new Map();
function beam(a,b,r=.04,m=materials.iron,radial=6){
 const p=new T.Vector3(...a),q=new T.Vector3(...b),d=new T.Vector3().subVectors(q,p);
 const key=r+':'+radial;
 if(!beamGeometryCache.has(key))beamGeometryCache.set(key,new T.CylinderGeometry(r,r,1,radial));
 const o=new T.Mesh(beamGeometryCache.get(key),m);
 const length=d.length();o.position.copy(p).add(q).multiplyScalar(.5);
 o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());o.scale.y=length;
 o.userData.staticBeam=true;root.add(o);return o;
}
function plate(x,y,z,w,h,m,rotate=0){const o=new T.Mesh(plane,m);o.position.set(x,y,z);o.scale.set(w,h,1);o.rotation.y=rotate;root.add(o);return o;}
function walkway(x,z,w,d,height,id='deck'){
 floors.push({x,z,hx:w/2,hz:d/2,height,id});
 collisions.push({x,z,hx:w/2,hz:d/2,y:height-.13,height:.13,walkableSurface:true,surface:'metal'});
}
const traversal={
 routes:[],lifts:[],
 surfaces(x,z){return floors.filter(s=>Math.abs(x-s.x)<=s.hx&&Math.abs(z-s.z)<=s.hz).map(s=>({id:s.id,height:s.height}));},
 height(x,z,time=0,max=Infinity){let h=0;for(const s of floors)if(s.height<=max+.01&&Math.abs(x-s.x)<=s.hx&&Math.abs(z-s.z)<=s.hz)h=Math.max(h,s.height);return h;},
 routeForSurface(){return null;}
};
function canvasTexture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');paint(ctx,w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
function sign(text,x,y,z,width,color,side=1){
 const group=districtSigns.create(text,{width,height:width*.31});group.position.set(x,y,z);group.rotation.y=-side*Math.PI/2;root.add(group);return group;
}

function mark(x,y,z,hex=0x66dbe8){
 const group=new T.Group();group.position.set(x,y,z);
 group.add(new T.Mesh(new T.CylinderGeometry(.58,.7,.12,24),materials.iron));
 const halo=new T.Mesh(new T.TorusGeometry(.7,.027,6,32),glow(hex));halo.rotation.x=-Math.PI/2;halo.position.y=.18;group.add(halo);
 const rod=new T.Mesh(new T.CylinderGeometry(.05,.05,1.4,8),materials.black);rod.position.y=.75;group.add(rod);
 const dot=new T.Mesh(new T.IcosahedronGeometry(.19,1),glow(hex));dot.position.y=1.6;group.add(dot);root.add(group);
 beacons.push({group,halo,dot});
}
function pipesAlongFacade(x,z,len,height){
 for(let j=0;j<2;j++){const xx=x+(x>0?-.11:.11),zz=z-len/2+.9+j*1.15;
  beam([xx,1,zz],[xx,height-1,zz],.09,j?materials.rust:materials.iron,7);
  for(let y=5;y<height-2;y+=6)beam([xx,y,zz],[xx-(x>0?1:-1),y,zz],.07,materials.iron);
 }
 for(let j=0;j<2;j++)beam([x,2.2+j*3.4,z-len/2+.4],[x,2.2+j*3.4,z+len/2-.4],.07,materials.iron);
}
function shopInterior(side,z){
 // A genuinely enterable market bay: three walls, not a solid fake façade.
 const ix=side*21,w=13,d=16,inside=side*13.2;
 solid(ix,6.3,z-side*.3,w,12.6,d,materials.dark,false);
 solid(side*28.2,4.1,z,1.1,8.2,d,materials.wall,true);
 solid(ix,4.4,z-d/2,.8,8.8,w,materials.iron,false);
 solid(ix,4.4,z+d/2,.8,8.8,w,materials.iron,false);
 for(const depth of [-6.2,6.2])solid(ix,4.1,z+depth,w,8.2,.46,materials.wall,true);
 solid(inside,4,z-5,.45,8,4.6,materials.wall,true);
 solid(inside,4,z+5,.45,8,4.6,materials.wall,true);
 solid(inside,7.25,z,.35,1.5,5.4,materials.wall,true);
 for(let a=0;a<4;a++){
  const bx=side*(18+a%2*4),bz=z-4+Math.floor(a/2)*8;
  solid(bx,.9,bz,2.1,1.8,.9,materials.iron,true);
  for(let k=0;k<3;k++)solid(bx,1.1+k*.19,bz,1.75,.08,.75,materials.warning,false);
 }
 solid(side*23,1.15,z+3,2.8,2.3,1,materials.wall,true);
 plate(side*22.4,2.25,z+3,1.4,.8,materials.cyan,side*Math.PI/2);
 sign(side<0?'HELIX DATA':'MARKET',side*12.7,5.6,z-6,3.6,side<0?'#42f0f6':'#ffb875',side);
}
function tower(side,z,idx){
 const xx=side*(23+(idx%2)*3),height=24+(idx*7%28),w=18+(idx%3)*3,d=17;
 // Façade with slight setbacks, recessed bays and three-dimensional mullions.
 solid(xx,height/2,z,w,height,d,idx%3===0?materials.plaster:materials.wall,true);
 solid(xx,height*.72,z,w+.3,.45,d+.4,materials.iron,false);
 const front=xx-side*w/2,night=idx%3===0;
 for(let y=4;y<height-2;y+=3.15){
  solid(front-side*.15,y,z,w*.02,.10,d-.8,materials.dark,false);
  for(let j=-3;j<=3;j++){
   const zz=z+j*2.1;if(Math.abs(zz-z)>d/2-.8)continue;
   const lit=rng()>(night?.56:.72);
   solid(front-side*.18,y+.6,zz,.08,1.2,1.28,lit?(rng()>.65?materials.cyan:materials.amber):materials.glass,false,false);
   solid(front-side*.25,y+.6,zz+.72,.12,1.7,.09,materials.iron,false);
  }
 }
 for(let j=0;j<3;j++)solid(front-side*.4,2.4,z-d*.33+j*d*.33,.8,3.5,1.3,materials.iron,false);
 for(let y=9;y<height-3;y+=9){
  solid(front-side*1, y, z,2.4,.23,d-1,materials.iron,false);
  for(let i=0;i<5;i++)beam([front-side*2.1,y+.1,z-d/2+.8+i*(d-1.6)/4],
     [front-side*2.1,y+1.25,z-d/2+.8+i*(d-1.6)/4],.06,materials.iron);
 }
 pipesAlongFacade(front-side*.45,z,d,height);
 for(let i=0;i<3;i++)solid(xx+(i-1)*3,height+.7,z+(i%2)*2,2.4,1.4,3.2,materials.iron,false);
}
function street(){
 // The old road ended before several facade setbacks, exposing the clear
 // colour under the pavements. The entire district now has a real ground.
 const groundGeometry=new T.PlaneGeometry(88,164),uv=groundGeometry.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*11,uv.getY(i)*10.25);
 const ground=new T.Mesh(groundGeometry,materials.concrete);ground.name='M02 / continuous district ground';ground.rotation.x=-Math.PI/2;ground.position.set(0,-.02,-1);ground.receiveShadow=true;root.add(ground);
 solid(0,-.16,0,22,.3,158,materials.asphalt,false);
 // Continuous tileable asphalt skin fixes the stretched UVs of the 158 m road.
 // The underlying collision plane is unchanged, and the atlas is shared.
 const asphaltSkin=new T.Mesh(new T.PlaneGeometry(19.8,157.6),materials.asphalt);
 asphaltSkin.name='M02 / wet asphalt continuous UV surface';
 asphaltSkin.rotation.x=-Math.PI/2;asphaltSkin.position.set(0,.007,0);
 asphaltSkin.receiveShadow=true;root.add(asphaltSkin);
 // Inset pavement, drainage and regularly spaced utility grates.
 for(const side of [-1,1]){
  solid(side*10,0,0,2.7,.12,158,materials.concrete,false);
  solid(side*8.55,.11,0,.2,.24,158,materials.iron,false);
  for(let z=-73;z<=71;z+=9){
   solid(side*8.9,.14,z,.72,.045,1.4,materials.black,false);
   for(let k=0;k<4;k++)solid(side*8.9,.18,z-.48+k*.32,.65,.025,.05,materials.iron,false);
  }
 }
 for(let z=-70;z<70;z+=6){
  solid(0,.013,z,.10,.014,2.5,materials.warning,false,false);
  if(z%18===-16||z%18===2)solid(0,.013,z,17,.015,.07,materials.iron,false,false);
 }
 // Rain ripples and stretched neon ground reflections use instanced batches.
}
function blockBuildings(){
 for(let i=0;i<7;i++)for(const side of [-1,1]){
  const z=65-i*22;
  if((i===2&&side===-1)||(i===3&&side===1)){architecture.occupiedMarket(side,z);continue;}
  architecture.residentialTower(side,z,i+(side>0?4:0));
 }
 // Distant volumetric skyline for dense city silhouette.
 for(let i=0;i<80;i++){
  const x=(rng()-.5)*145,z=(rng()-.5)*185;
  if(Math.abs(x)<35&&z>-80&&z<80)continue;
  const h=22+rng()*65,w=5+rng()*9;
  solid(x,h/2-.3,z,w,h,w,materials.black,false,false);
  if(rng()>.48)solid(x,h-.4,z,w*.6,.2,w*.6,materials.dark,false,false);
 }
 // Telephone booths, wiring, carts, ducts, vending, awnings, scattered props.
 for(let z=60;z>-68;z-=17){
  const side=z%2?1:-1,x=side*8.8;
  solid(x,1.1,z,1.15,2.2,.9,materials.iron,true);
  solid(x-side*.1,1.6,z,.1,.55,.7,z%3?materials.cyan:materials.amber,false);
  solid(x,2.25,z,1.4,.15,1.15,materials.black,false);
  solid(-x,1.2,z+4,2.2,2.4,.75,materials.rust,true);
  for(let j=0;j<5;j++)solid(-x,.5+j*.26,z+4,1.6,.11,.4,materials.iron,false);
  const poleX=side*8.2;
  beam([poleX,0,z+7],[poleX,7.7,z+7],.1,materials.iron);
  beam([poleX,7.6,z+7],[poleX-side*2.7,7.6,z+7],.09,materials.iron);
  const fixture=new T.Mesh(new T.SphereGeometry(.22,8,6),z%3?materials.amber:materials.cyan);
  fixture.position.set(poleX-side*2.7,7.6,z+7);root.add(fixture);
 }
 for(let i=0;i<18;i++){
  const z=70-i*8.1,y=9+(i%4)*2,x0=-14,x1=14;
  beam([x0,y,z],[x1,y-1,z+2],.035,materials.black,5);
  if(i%3===0)beam([x0,y+1.2,z+.4],[x1,y+1,z+2],.05,materials.iron,5);
 }

 // Environmental storytelling.
 for(let i=0;i<14;i++){
  const x=(i%2?1:-1)*(6.5+rng()*1.8),z=70-i*10;
  solid(x,.3,z,1.1,.6,.9,materials.rust,true);
  solid(x+.24,.72,z-.2,.65,.23,.6,materials.black,false);
 }
}
function stairsAndSkybridges(){
 const eastX=10.6,westX=-10.6,upN=72,step=.335,rise=12/upN;
 for(let i=0;i<upN;i++){
  const z=16.1-(i+.5)*step,h=(i+1)*rise;
  solid(eastX,h/2,z,2.55,h,step+.012,materials.iron,false);
  solid(eastX,h+.012,z,2.55,.028,step,materials.warning,false);
  walkway(eastX,z,2.55,step+.06,h,'east-stair-'+i);
  if(i%6===0)for(const side of [-1,1])beam([eastX+side*1.23,h+.02,z],[eastX+side*1.23,h+1.10,z],.045,materials.iron);
 }
 solid(eastX,11.87,-12.5,2.9,.26,12,materials.road,false);
 walkway(eastX,-12.5,2.9,12,12,'upper-east');
 solid(0,11.85,-18,22,.3,3.05,materials.road,false);
 walkway(0,-18,22,3.05,12,'crossbridge');
 for(let side of [-1,1]){
  const x=side*1.38;
  for(let i=-5;i<=5;i++){beam([i*2,12.1,-18+x],[i*2,13.3,-18+x],.06,materials.iron);}
  beam([-10.4,13.2,-18+x],[10.4,13.2,-18+x],.07,materials.iron);
  collisions.push({x:0,z:-18+x,hx:11,hz:.1,y:12,height:1.25,surface:'metal'});
 }
 for(let i=0;i<upN;i++){
  const z=-19.7-(i+.5)*step,h=12-(i+1)*rise;
  if(h<=0)continue;
  solid(westX,h/2,z,2.55,h,step+.012,materials.iron,false);
  solid(westX,h+.012,z,2.55,.03,step,materials.warning,false);
  walkway(westX,z,2.55,step+.07,h,'west-stair-'+i);
 }
 // Optional level +25 m to make the planned three vertical layers tangible.
 const roofX=-6.7,roofRise=13/72;
 for(let i=0;i<72;i++){
  const z=-19.8-(i+.5)*.36,h=12+(i+1)*roofRise;
  solid(roofX,(12+h)/2,z,2.4,h-12,.37,materials.iron,false);
  solid(roofX,h+.01,z,2.4,.03,.36,materials.iron,false);
  walkway(roofX,z,2.4,.40,h,'roof-stair-'+i);
 }
 solid(-9,24.85,-51,15,.30,13.5,materials.road,false);
 walkway(-9,-51,15,13.5,25,'roof');
 for(let z=-57;z<-44;z+=2){
  beam([-16.25,25,z],[-16.25,26.2,z],.06,materials.iron);
 }
 beam([-16.25,26.2,-57],[-16.25,26.2,-44],.08,materials.iron);
 // Architectural braces and hanging lighting beneath the crossbridge.
 for(const side of [-1,1])beam([side*8,2,-18],[side*8,11.6,-18],.21,materials.iron,8);
 for(let i=-4;i<=4;i++)beam([i*2.2,11.5,-18],[i*2.2,12,-18],.06,materials.black);
}
function props(){
 const terminals=createArchiveTerminalFactory(T,{performance:low()});
 function archive(x,z,title,id){
  const computer=terminals.create(root,{x,z,id});
  const map=canvasTexture(512,256,(c,w,h)=>{c.fillStyle='#15221f';c.fillRect(0,0,w,h);c.fillStyle='#95b3a4';c.font='17px monospace';c.fillText('VESPER / ARCHIVE LOCALE / 2196',20,36);c.fillRect(20,52,w-40,2);c.font='bold 29px monospace';c.fillText(title,20,100,w-40);c.font='16px monospace';c.fillText('CONNEXION EXTÉRIEURE : COUPÉE',20,139,w-40);c.fillText('F / CONSULTER LE TERMINAL',20,210,w-40);});
  const screen=new T.Mesh(new T.PlaneGeometry(computer.width,computer.height),new T.MeshBasicMaterial({map,toneMapped:false}));screen.position.set(0,.018,computer.z);computer.display.add(screen);
 }
 // First enclave: believable aid station, shutters, mattresses, radio, kit.
 archive(-3,55,'POSTE DE SOINS','soins');collisions.push({x:-3,z:55,hx:1.1,hz:.38,y:0,height:1.9,surface:'metal'});
 for(let i=0;i<3;i++){
  solid(-5+i*1.3,.22,58,1.1,.44,2.0,materials.plaster,false);
  solid(-5+i*1.3,.42,58,.8,.05,1.7,materials.warning,false);
 }
 const aid=sign('SECOURS',-3,3.15,54.9,2.5,'#a4b7ac',-1);aid.rotation.y=0;
 for(const x of [-4.35,-1.65])beam([x,0,54.8],[x,3.65,54.8],.035,materials.iron);
 // Market checkout + HELIX terminal.
 archive(-8,14,'GALERIE / HELIX','galerie');collisions.push({x:-8,z:14,hx:1.1,hz:.38,y:0,height:1.9,surface:'metal'});
 const crateGeometry=bevelBox(1.2,1,1.15,.055,1),lidGeometry=bevelBox(1.25,.10,1.2,.035,1),cratePaint=mat(0x4c5650,.83,.28);
 for(let i=0;i<9;i++){const z=29-i*2.2,x=(i%2?1:-1)*7;
  const crate=new T.Mesh(crateGeometry,cratePaint);crate.position.set(x,.5,z);crate.userData.staticBox=true;crate.castShadow=!low();crate.receiveShadow=true;root.add(crate);
  const lid=new T.Mesh(lidGeometry,materials.iron);lid.position.set(x,1.02,z);lid.userData.staticBox=true;root.add(lid);
  for(const dx of [-.39,.39])solid(x+dx,.51,z,.045,1.02,1.17,materials.dark,false);
  solid(x,.55,z+.59,.20,.15,.025,materials.warning,false);
  collisions.push({x,z,hx:.63,hz:.6,y:0,height:1.08,surface:'metal'});
 }
 // Transit hall/end: large functional portal and automatic barrier.
 for(const side of [-1,1]){
  solid(side*4.1,4.2,-63,1.25,8.4,.8,materials.iron,true);
  beam([side*4.15,3.9,-62.5],[side*4.15,7.7,-62.5],.12,materials.cyan);
 }
 solid(0,8,-63,9,.65,1.3,materials.iron,false);
 const transit=sign('TRANSIT',0,7.7,-62.55,3.6,'#a4b7ac',-1);transit.rotation.y=0;
 const door=solid(0,3.7,-63,.38,7.2,8,materials.black,false);door.visible=false;
 archive(-5,-57,'TRANSIT / SORTIE','transit');collisions.push({x:-5,z:-57,hx:1.1,hz:.38,y:0,height:1.9,surface:'metal'});
 for(const o of objectives)mark(o.x,o.y+.28,o.z,o.y>0?0xffc16c:0x6addf1);
}
function weather(){
 const count=low()?300:950,arr=new Float32Array(count*6);
 for(let i=0;i<count;i++){
  const x=(rng()-.5)*78,y=rng()*28,z=(rng()-.5)*165;
  arr.set([x,y,z,x-.08,y-.48,z-.07],i*6);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arr,3));
 rain=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x7cbdd6,transparent:true,opacity:low()?.19:.27,depthWrite:false}));
 root.add(rain);
}
function optimizeStaticBoxes(){
 const groups=new Map();
 for(const mesh of [...root.children]){
  if(!(mesh.userData.staticBox||mesh.userData.staticBeam)||mesh.userData.isCollider||!mesh.visible)continue;
  const key=mesh.geometry.uuid+':'+mesh.material.uuid+':'+String(mesh.castShadow);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(mesh);
 }
 for(const items of groups.values()){
  if(items.length<5)continue;
  const inst=new T.InstancedMesh(items[0].geometry,items[0].material,items.length);
  inst.name='M02 / optimized structural instances';
  inst.castShadow=items[0].castShadow;
  inst.receiveShadow=true;
  for(let i=0;i<items.length;i++){
   const it=items[i];it.updateMatrix();
   inst.setMatrixAt(i,it.matrix);
   root.remove(it);
  }
  inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();
  root.add(inst);
 }
}
function createEnvironment(){
 scene.background=new T.Color(0x1c252d);scene.fog=new T.FogExp2(0x263139,low()?.008:.009);
 root=new T.Group();root.name='M02 / W02 LES BAS-NIVEAUX';scene.add(root);
 districtSigns=createDistrictSignage(T,{performance:low()});
 architecture=createDistrictArchitecture({T,root,materials,solid,beam,sign,collisions,low:low(),rng});
 // Metals need reflected sky radiance, not brighter emissive colour. A tiny
 // original district reflection map keeps the graphite weapons readable.
 const reflection=canvasTexture(256,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);for(const [at,color]of [[0,'#566574'],[.40,'#83909a'],[.51,'#35424b'],[.7,'#20272a'],[1,'#131a1c']])g.addColorStop(at,color);c.fillStyle=g;c.fillRect(0,0,w,h);});
 reflection.mapping=T.EquirectangularReflectionMapping;scene.environment=reflection;scene.environmentIntensity=.55;
 const ambient=new T.HemisphereLight(0xadb8be,0x34322c,1.4);scene.add(ambient);
 const moon=new T.DirectionalLight(0xb1c1ce,2.15);moon.position.set(-18,44,21);scene.add(moon);
 moon.castShadow=true;moon.shadow.mapSize.set(low()?512:1024,low()?512:1024);
 moon.shadow.bias=-.00015;moon.shadow.normalBias=.025;moon.shadow.radius=2;
 Object.assign(moon.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:.1,far:125});
 for(let z=53;z>-57;z+=low()?-38:-19){
  const x=(Math.round(z)%2===0?1:-1)*8.4;
  const lamp=new T.PointLight(z%3===0?0xe69b5a:0x5bd6ec,low()?1.1:1.8,18,2);
  lamp.position.set(x,6.5,z);scene.add(lamp);lightSources.push(lamp);
 }
 street();blockBuildings();stairsAndSkybridges();props();architecture.decorate();warZone=createWarZone(T,root,materials,collisions,{performance:low()});weather();optimizeStaticBoxes();
 worldShadows=createWorldShadows(T,{scene,renderer,light:moon,profile:{artQuality:low()?'low':'auto'},direction:{x:-28,y:56,z:28}});
 groundOcclusion=createGroundOcclusion(T,root,collisions,{compact:low()});
 try{atmosphere=createStreetAtmosphere(T,root,{performance:low()});}
 catch(error){console.warn('M02 atmosphere disabled for compatibility:',error);}
}
function enemyMaterials(){
 return {monster:materials.wall,monsterFace:materials.black,cyan:materials.cyan,rose:materials.rose,violet:materials.blue,pale:materials.white};
}
function setupPlayer(){
 game=new ArenaGame(collisions,Math.random,traversal);game.reset(characterId);game.enableArmorShield();
 Object.assign(game.player,{x:0,z:72,elevation:0,yaw:0,hp:100,grounded:true});
 game.wave=2;game.nextWave=Infinity;game.toSpawn=0;game.spawnTimer=Infinity;
 game.ownedWeapons=new Set([game.weaponIndex,0,1,2]);game.ammo=WEAPONS.map(w=>w.capacity);
 const lylu=characterId==='lylu';
 const heroGlow=lylu?glow(0x4da8ff):glow(0xff4fa1);
 const pm={...materials,armor:mat(lylu?0x356fa6:0xb64472,.38,.72),armorLight:mat(lylu?0xb6d9e8:0xdec3cf,.35,.68),steel:materials.iron,rose:heroGlow,pale:materials.white,violet:materials.blue};
 const gloves={fabric:mat(0x222736,.9,.08),plate:pm.armor,trim:pm.armorLight,glow:heroGlow,accent:materials.cyan,metal:materials.iron};
 fallbackGun=()=>buildGun({mats:pm,gloves,sleeve:false,makeFlash:parent=>{const f=new T.Mesh(new T.SphereGeometry(.06,8,6),heroGlow);parent.add(f);return f;}});fallbackHand=()=>createGlove(gloves,{sleeve:false});
 // The high-detail weapon is optional: a shader/GLB issue must not stop the mission.
 try {
  weapon=buildGun({mats:pm,gloves,makeFlash:()=>{const o=new T.Mesh(new T.SphereGeometry(.07,8,6),heroGlow);o.visible=false;return o;}});
  weapon.userData.setVariant(game.weaponIndex);
 } catch(error){
  console.warn('M02 / weapon detail degraded, game remains playable:',error);
  weapon=new T.Group();
  const fallback=new T.Mesh(new T.BoxGeometry(.115,.17,.48),pm.armor);
  fallback.position.set(0,-.015,-.12);weapon.add(fallback);
  const muzzle=new T.Mesh(new T.CylinderGeometry(.038,.035,.34,10),pm.steel);
  muzzle.rotation.x=Math.PI/2;muzzle.position.set(0,.025,-.34);weapon.add(muzzle);
  Object.assign(weapon.userData,{index:0,setVariant(index){this.index=index;},setCombatState(){}});
 }
 camera.add(weapon);weapon.position.set(.23,-.30,-.59);weapon.rotation.set(-.07,-.045,-.09);
 combatEffects=createCampaignCombatEffects(T,scene,characterId);
 companion=createAICompanion(T,scene,characterId);
 companionSkills=createCompanionSkills({characterId,mission:2,mode:'campaign'});
 skillMenu=createCompanionMenu({getStatus:()=>companionSkills.snapshot(game),onUse:()=>false,
  onChange(open){heldFire=false;keys.clear();fireInput.reset();touchControls?.reset();if(open)document.exitPointerLock?.();}});
 try {enemyFactory=createEnemyFactory(enemyMaterials());}
 catch(error){console.warn('M02 / enemy visuals degraded:',error);enemyFactory=null;}

}
function createEnemies(){
 game.toSpawn=5;game.spawned=0;
 const sites=[{x:-1,z:22},{x:1,z:7},{x:0,z:-3},{x:2,z:-25},{x:-1,z:-34}];
 for(let i=0;i<5;i++){
  const p=sites[i];game.activePortals=[{id:100+i,x:p.x,z:p.z,yaw:0,openedAt:game.time}];
  game.spawnEnemy();const enemy=game.enemies.at(-1);
  if(enemy){
   if(enemy.form==='stalker')enemy.ranged=true;
   enemy.awareness='search';enemy.alertedUntil=game.time+9;
   enemy.lastKnownX=game.player.x;enemy.lastKnownZ=game.player.z;
  }
 }
 game.activePortals=[];game.toSpawn=0;game.spawnTimer=Infinity;
 signal=5;notice('PATROUILLE HOSTILE DÉTECTÉE');
}
function notice(message){
 $('notice').textContent=message;$('notice').style.display='block';noticeUntil=clock+3.6;
}
function interact(){
 if(!running||game.state!=='playing')return;
 const o=objectives[stage];if(!o)return;
 const range=Math.hypot(game.player.x-o.x,game.player.z-o.z);
 if(range>3.3||Math.abs(game.player.elevation-o.y)>1.8)return;
 if(stage===0){stage=1;createEnemies();notice('ENCLAVE REPÉRÉE — NEUTRALISER LA PATROUILLE');}
 else if(stage===1){
  if(game.enemies.length>0){notice('TERMINAL VERROUILLÉ : MENACES ACTIVES');return;}
  stage=2;game.grantCharges(1);notice('ARCHIVES HELIX SAISIES — REJOINDRE LE PONT +12 M');
 }
 else if(stage===2){stage=3;game.grantCharges(1);notice('ACCÈS TRANSIT DÉVERROUILLÉ — DESCENDRE');}
 else if(stage===3){running=false;document.exitPointerLock?.();showChapter2Finale({characterId,onReplay:resume});}
}
function snapCamera(){
 if(xr?.active){xr.syncPose();return;}
 const p=game.player,eye=characterId==='lylu'?1.71:1.61,optic=OPTICS[game.weapon.id],normal=view==='fps'?72:64;
 camera.fov=normal+(optic?(magnifiedFov(normal,optic.magnification)-normal)*aimBlend:0);
 const kickPose=recoilPose(game.weapon.id,weaponFeel.state,{aiming:aimBlend,dual:!!game.weapon.dual,magnification:optic?.magnification||1});
 camera.rotation.set(pitch+kickPose.cameraPitch,yaw+kickPose.cameraYaw,0,'YXZ');
 if(view==='fps')camera.position.set(p.x,p.elevation+eye-(p.crouched?.55:0),p.z);
 else{
  const start={x:p.x,y:p.elevation+eye-.2-(p.crouched?.45:0),z:p.z},dist=5.1;
  const end={x:p.x+Math.sin(yaw)*dist*Math.cos(pitch)+Math.cos(yaw)*.65,y:start.y-Math.sin(pitch)*dist,
    z:p.z+Math.cos(yaw)*dist*Math.cos(pitch)-Math.sin(yaw)*.65};
  let nearest=1;
  for(const box of collisions){
   if(box.walkableSurface)continue;
   const t=segmentBox(start,end,{...box,hx:box.hx+.2,hz:box.hz+.2});
   if(t!==null)nearest=Math.min(nearest,Math.max(.09,t-.05));
  }
  camera.position.set(start.x+(end.x-start.x)*nearest,Math.max(.35,start.y+(end.y-start.y)*nearest),start.z+(end.z-start.z)*nearest);
 }
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 weapon.visible=view==='fps';
 if(playerRig?.model)playerRig.model.root.visible=view==='third';
}
function changeView(){
 view=view==='fps'?'third':'fps';
 if(!playerRig&&view==='third'){view='fps';notice('PERSONNAGE SHADOW UNIT EN COURS DE CHARGEMENT');}
 snapCamera();
}
function updateOriginalSoldier(dt,moving,sprint,firing){
 const model=playerRig?.model;if(!model)return;
 try{
  model.root.position.set(game.player.x,game.player.elevation,game.player.z);
  model.root.rotation.y=yaw;
  if(model.weapon!==game.weaponIndex)model.setWeapon(game.weaponIndex);
  model.gun.userData.setCombatState?.({ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,time:game.time,dualState:game.dual,
    reloading:game.reloadRemaining>0,reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,charge:game.charge});
  model.animate(game.time,moving,weaponFeel.state.pitch,0,Number(firing),dt,{
    airborne:!game.player.grounded,verticalSpeed:game.player.verticalSpeed,crouched:game.player.crouched,
    firing:!!firing,sprint,aim:aimBlend>.2
  });
 }catch(error){console.warn('M02 authentic animation fallback',error);scene.remove(model.root);playerRig=null;}
}
function pauseMission(){
 if(!running||paused)return;
 combatHud?.reset();touchSprinting=false;paused=true;running=false;battleAudio?.pause();environmentAudio?.pause();heldFire=false;mouseAim=false;firePressQueued=false;fireInput.reset();
 touchControls?.reset();pinkControls.reset();document.exitPointerLock?.();
 pauseMenu.show();$('start').textContent='REPRENDRE LA MISSION →';
 $('status').textContent='PAUSE · PINK WARS / NIVEAU 2';
}
function unpauseMission(){
 if(!paused)return;paused=false;running=true;shade.style.display='none';
 pauseMenu.hide(false);if(!touchControls?.root&&!xr?.active)canvas.requestPointerLock?.().catch?.(()=>{});
}
async function loadAuthenticSoldier(){
 if(weaponReady)return;weaponReady=true;
 try{
  const model=await installPinkWarsSoldier(T,scene,characterId,materials);
  playerRig=model;model.model.root.visible=view==='third';model.model.setWeapon(game.weaponIndex);
  // Reuse the same original gloved weapon and optics as level 1 in FPS.
  const canonicalGun=model.createGun();
  canonicalGun.userData.setVariant(game.weaponIndex);
  weapon.removeFromParent();
  weapon=canonicalGun;camera.add(weapon);
  weapon.position.set(.19,-.24,-.56);
  snapCamera();
  console.info('M02 original Shadow Unit and FPS weapon loaded:',characterId);
 }catch(error){console.warn('M02 authentic rig optional fallback',error);}
}
function updateEnemies(dt){
 const live=new Set();
 for(const e of game.enemies){
  live.add(e.id);let model=enemyMeshes.get(e.id);
  if(!model){
   try{model=enemyFactory?.create(e.elite,e.ranged,e.form);}catch(err){console.warn('M02 enemy model fallback:',err);}
   if(!model){
    model=new T.Group();
    const chassis=new T.Mesh(new T.CapsuleGeometry(.39,1.05,5,8),materials.dark);
    chassis.position.y=1.04;model.add(chassis);
    const eye=new T.Mesh(new T.BoxGeometry(.48,.13,.12),materials.red);
    eye.position.set(0,1.5,-.38);model.add(eye);
   }
   enemyMeshes.set(e.id,model);scene.add(model);
  }
  model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;
  model.userData.animate?.(clock,e.phase,true,e,game.time);
 }
 for(const [id,o] of enemyMeshes)if(!live.has(id)){scene.remove(o);enemyMeshes.delete(id);}
 const active=new Set();
 for(const b of game.bullets){
  active.add(b.id);let mesh=shotMeshes.get(b.id);
  if(!mesh){mesh=new T.Mesh(projectileCore,b.hostile?materials.red:materials.cyan);shotMeshes.set(b.id,mesh);scene.add(mesh);}
  mesh.position.set(b.x,b.y,b.z);
 }
 for(const [id,o] of shotMeshes)if(!active.has(id)){scene.remove(o);shotMeshes.delete(id);}
}
let heldFire=false;
function gameTick(dt){
 const xc=xr?.active?xr.controls:null;
 const controls=xc?{moveX:xc.x,moveZ:xc.z,lookX:0,lookY:0,jump:xc.jump,interact:xc.interact,aim:xc.aim,fire:xc.fire,sprint:xc.sprint,melee:xc.melee,charge:xc.charge}:pinkControls.read(dt,keys,navigator.getGamepads?.()||[],{focused:!document.hidden});
 if(controls.companion)skillMenu?.setOpen(!skillMenu.isOpen);
 if(skillMenu?.isOpen)return;
 const touch=touchControls?.state||{x:0,z:0,lookX:0,lookY:0,fire:false,aim:false};
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=(controls.lookX*1.8+touch.lookX*1.8)*sensitivity*dt;
 pitch=clamp(pitch-(controls.lookY+touch.lookY)*1.35*sensitivity*dt,-.85,.7);
 // Right-half mobile swipe is delta-based (same semantics as the mouse).
 yaw-=(touch.lookDX||0)*.004*sensitivity;
 pitch=clamp(pitch-(touch.lookDY||0)*.004*sensitivity,-.85,.7);
 touch.lookDX=touch.lookDY=0;
 const x=controls.moveX+touch.x,z=controls.moveZ+touch.z;
 const aiming=!!OPTICS[game.weapon.id]&&game.reloadRemaining<=0&&(mouseAim||touch.aim||controls.aim);
 aimBlend+=(Number(aiming)-aimBlend)*(1-Math.exp(-dt*14));
 document.body.classList.toggle('aiming',aiming);
 const sprint=!aiming&&(controls.sprint||touchSprinting);
 if(controls.pause){pauseMission();return;}
 if(controls.next)game.cycleWeapon();
 if(controls.reload)game.reload();
 if(controls.interact)interact();
 const crouchToggle=controls.crouchToggle||crouchQueued;crouchQueued=false;
 if(jumpQueued)game.player.jumpHeld=false;
 const jump=controls.jump||jumpQueued;jumpQueued=false;
 game.nextWave=Infinity;game.toSpawn=0;
 game.step(dt,{x,z,yaw,moveYaw:xc?.moveYaw??yaw,sprint,jump,crouchToggle});
 weaponFeel.update(dt);
 snapCamera();
 if(meleeQueued||controls.melee){const view=new T.Vector3();camera.getWorldDirection(view);game.melee({x:view.x,z:view.z});}
 if(chargeQueued||controls.charge){const eye=xr?.active?renderer.xr.getCamera():camera,from=new T.Vector3(),view=new T.Vector3();eye.getWorldPosition(from);eye.getWorldDirection(view);
  game.throwCharge({x:from.x+view.x*.45,y:from.y-.18,z:from.z+view.z*.45},view);}
 meleeQueued=chargeQueued=false;
 if(firePressQueued)fireInput.press(game.time);
 const firing=fireInput.requested(heldFire||touch.fire||controls.fire,game.weapon,game.time);
 // Same two-stage raycast as Pink Wars' game.js: center reticle selects a
 // visible target; projectile origin is the ACTUAL held weapon muzzle.
 updateOriginalSoldier(dt,Math.hypot(x,z)>.1,sprint,firing);
 const forward=new T.Vector3();camera.getWorldDirection(forward);
 const far=camera.position.clone().addScaledVector(forward,160);
 let near=1,target=far;
 for(const box of collisions){
   const hit=segmentBox(camera.position,far,box);
   if(hit!==null&&hit<near){near=hit;target=camera.position.clone().lerp(far,hit);}
 }
 for(const e of game.enemies){
   const hit=traceEnemyHit(camera.position,far,e);
   if(hit&&hit.t<near){near=hit.t;target=camera.position.clone().lerp(far,hit.t);}
 }
 const gun=view==='third'?playerRig?.model?.gun:weapon;
 const muzzle=gun?.userData?.flashFor?.(game.nextDualHand)||gun?.userData?.flash;
 const origin=new T.Vector3();
 if(muzzle){
  try{muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(origin);}
  catch{origin.copy(camera.position).addScaledVector(forward,.23);}
 }else origin.copy(camera.position).addScaledVector(forward,.23);
 const shotDirection=target.clone().sub(origin).normalize();
 const aim=xr?.active?xr.aim():{origin,direction:shotDirection};
 if(game.weapon.semiAuto&&firePressQueued)game.triggerHeld=false;
 firePressQueued=false;
 const ammoBefore=game.ammo[game.weaponIndex],bladeBefore=game.bladeSlashAt;
 if(xr?.active&&game.weapon.dual){for(const hand of ['right','left']){const a=xr.aim(hand);game.triggerHand(hand,hand==='right'?xc.fire:xc.leftFire,dt,a.origin,a.direction);}}
 else if(firing||game.charge>0)game.trigger(firing,dt,aim.origin,aim.direction);
 else if(game.weapon.melee)game.trigger(false,dt,aim.origin,aim.direction);
 else{game.triggerHeld=false;game.semiPending=false;}
 if(game.ammo[game.weaponIndex]<ammoBefore||game.bladeSlashAt!==bladeBefore)fireInput.consume();
 updateEnemies(dt);
 const events=game.drainEvents();
 armorFx ||= createArmorFeedback({T,scene,camera,accent:characterId==='lylu'?0x80baff:0xef91b4,listener:()=>game.player,
  audio:()=>enableAudio&&audioCtx?.state==='running'?audioCtx:null,haptic:kind=>xr?.active&&xr.haptic(kind)});
 for(const e of events){
  combatEffects?.event(e);armorFx.handle(e);
  if(e.type==='enemy-shot'&&enableAudio&&audioCtx)playEnemyShot(audioCtx,{form:e.form,source:e,listener:game.player,yaw,occluded:game.blocked(e,{x:game.player.x,y:game.player.elevation+1.5,z:game.player.z})});
  if(e.type==='shot'){
    xr?.haptic('shot',e.weapon,e.hand);
    weaponFeel.fire(e.weapon||game.weapon.id,e.power||1,(xr?.active?!!xr.controls?.aim:aimBlend>.5)||game.player.crouched);
    if(enableAudio&&audioCtx)try{playLaserShot(audioCtx,e.weapon||game.weapon.id,e.power||1);}catch{}
   }
  if(e.type==='damage'){$('damage').style.boxShadow='inset 0 0 105px #c52c5e77';}
  if(e.type==='weapon')weaponFeel.reset();
  if(e.type==='reload'&&enableAudio&&audioCtx)try{playWeaponAction(audioCtx,game.weapon.id,'reload-out');}catch{}
  if(e.type==='reloaded'&&enableAudio&&audioCtx)try{playWeaponAction(audioCtx,game.weapon.id,'reload-ready');}catch{}
  if(e.type==='impact'&&enableAudio&&audioCtx)try{playLaserImpact(audioCtx,{surface:e.surface,distance:Math.hypot(e.x-game.player.x,e.z-game.player.z),power:e.power});}catch{}
  if(e.type==='kill'){notice('CIBLE NEUTRALISÉE');}
  if(e.type==='over'){running=false;shade.style.display='grid';$('start').textContent='RECOMMENCER LE TEST →';$('status').textContent='Intervention interrompue — santé épuisée';document.exitPointerLock?.();}
 }
 combatEffects?.update(game,dt,camera);armorFx.update(game,dt);
 companion?.update(dt,{game,camera,active:false});
 companionSkills?.update(dt,{game});skillMenu?.refresh();
 environmentAudio?.update(dt,{active:running&&enableAudio,position:game.player,moving:Math.hypot(x,z)>.1,grounded:game.player.grounded,elevation:game.player.elevation,yaw,probes:game.enemies});
 if(game.player.hp>0)$('damage').style.boxShadow='inset 0 0 '+(100-game.player.hp)*1.2+'px #c52c5e44';
 const ads=flatSightPose(OPTICS[game.weapon.id],aimBlend);
 const kickPose=recoilPose(game.weapon.id,weaponFeel.state,{aiming:aimBlend,dual:!!game.weapon.dual});
 weapon.position.set(ads.x+kickPose.x,ads.y+kickPose.y,ads.z+kickPose.z);
 weapon.rotation.set(kickPose.pitch,kickPose.yaw+ads.yaw,kickPose.roll+ads.roll);
 const strike=game.weapon.melee?0:meleeKick(game);if(strike){weapon.position.x+=MELEE_POSE.x*strike;weapon.position.y+=MELEE_POSE.y*strike;weapon.position.z+=MELEE_POSE.z*strike;weapon.rotation.x+=MELEE_POSE.pitch*strike;}
 weapon.userData.setSight?.(aimBlend>.55,camera);
 weapon.userData.setCombatState?.({ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,time:game.time,dualState:game.dual,
  charge:game.charge,reloading:game.reloadRemaining>0,reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,
  heat:weaponFeel.state.heat,kick:weaponFeel.state.kick,impulse:weaponFeel.state.impulse});
 const shotFlash=running&&!game.weapon.melee&&(game.weapon.dual||weaponFeel.state.flash>0);
 weapon.userData.setFlash?.(shotFlash,game.time);playerRig?.model.gun.userData.setFlash?.(shotFlash,game.time);
 weapon.userData.animateHands?.(Number(firing),firing ? .34 : .18,game.reloadRemaining > 0 ? .8 : 0,dt);
 if(weapon.userData.index!==game.weaponIndex)weapon.userData.setVariant(game.weaponIndex);
 if(rain)rain.position.y=-(game.time*9%18);
 for(const b of beacons){b.halo.rotation.z+=dt*.4;b.dot.position.y=1.6+Math.sin(game.time*2)*.13;}
 updateHUD();
}
let lastMinimalHudStage=-1;let combatHud=null;
function updateHUD(){
 if(stage!==lastMinimalHudStage){
   lastMinimalHudStage=stage;
   document.body.classList.add('pw-objective-open');
   document.body.classList.remove('pw-graphics-open');
   clearTimeout(window.__pwM02ObjectiveTimeout);
   window.__pwM02ObjectiveTimeout=setTimeout(()=>document.body.classList.remove('pw-objective-open'),3600);
 }
 const o=objectives[stage]||objectives[3];
 $('objective').textContent=(stage+1)+'/4 · '+o.label;
 $('hint').textContent=o.description;
 // Shared combat HUD (same panels as M01, the Arena and the Range); #hp / #ammo stay hidden below.
 (combatHud ||= mountCombatHud({characterId,onAction:armorTouch})).update(game);
 $('hp').textContent=Math.ceil(game.player.hp);
 $('weapon').firstChild.nodeValue=game.weapon.name+' ';
 $('ammo').textContent=game.weapon.melee?'LAME':game.ammo[game.weaponIndex]+' / '+game.weapon.capacity;
 $('position').textContent='X '+game.player.x.toFixed(1)+' / Z '+game.player.z.toFixed(1)+' / ALT '+game.player.elevation.toFixed(1)+' m';
 const near=Math.hypot(game.player.x-o.x,game.player.z-o.z)<3.3&&Math.abs(game.player.elevation-o.y)<1.8;
 combatHud.setObjective({label:'MISSION 02 · '+String(stage+1).padStart(2,'0')+'/04',detail:o.label+'. '+o.description});combatHud.setContext(near?o.label:null);
 $('prompt').style.display=near?'block':'none';$('prompt').textContent='F / R3 : '+o.label;
 if(clock>noticeUntil)$('notice').style.display='none';
}
function animation(t,frame){
 if(xr?.active&&!frame)return;
 if(!xr?.active)requestAnimationFrame(animation);
 const dt=Math.min(.040,Math.max(0,(t-last)/1000));last=t;
 if(!renderer||!scene)return;
 if(xr?.active)xr.input(frame,dt);
 skillMenu?.setVisible(started&&running);
 clock+=dt;
 // Subtle transformer instability, without extra lights or shadow maps.
 for(let i=0;i<lightSources.length;i++){
   const flicker=1+.025*Math.sin(clock*.73+i*3.12);
   lightSources[i].intensity=(low()?1.04:1.66)*flicker;
 }
 if(atmosphere)try{atmosphere.update(clock);}catch(error){
   console.warn('M02 optional atmosphere frame disabled:',error);atmosphere=null;
 }
 if(running)try{gameTick(dt);}catch(error){
  console.error('M02 simulation failure:',error);
  running=false;shade.style.display='grid';status.textContent='Erreur de mission : '+(error?.message||String(error));
  startButton.disabled=false;startButton.textContent='RECOMMENCER LE NIVEAU 2 →';
 }
 warZone?.update(game?.time||0,{active:running});for(const event of warZone?.drainEvents()||[])if(enableAudio&&battleAudio)battleAudio.event(event,game.player,yaw);
 if(xr?.active){xr.update(dt,weaponFeel.state,weaponFeel.state.flash);xr.renderScope();}
 worldShadows?.update(clock,game?.player||camera.position,{entities:game?[...game.enemies,game.player]:[],heightAt:e=>game.surfaceHeight(e.x,e.z,game.time,(e.elevation||0)+.3)});
 if(scene&&camera&&!framePending&&!recovering){
   try{
     const result=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);
     if(result&&typeof result.then==='function'){
       framePending=true;
       result.then(()=>{framePending=false;}).catch(err=>{
         framePending=false;onRenderFailure(err);
       });
     }
   }catch(err){onRenderFailure(err);}
 }
 frames++;fpsTime+=dt;if(fpsTime>.5){$('fps').textContent=Math.round(frames/fpsTime);frames=0;fpsTime=0;}
}
function onRenderFailure(error){
 if(recovering)return;
 console.error('M02 render failed',error);
 recovering=true;running=false;shade.style.display='grid';
 missionLoading?.fail('Le rendu a été interrompu. Rechargez le secteur.');
 $('status').textContent='Échec du rendu : '+(error?.message||String(error))+' · Essaye le mode compatibilité.';
 const url=new URL(location.href);
 if(url.searchParams.get('renderer')!=='webgl'){
  $('status').textContent='Le moteur WebGPU a échoué. Relancement automatique en compatibilité WebGL…';
  url.searchParams.set('renderer','webgl');
  location.replace(url.href);
  return;
 }
 $('start').textContent='RELANCER LE NIVEAU 2 →';
 $('start').disabled=false;
 $('start').onclick=()=>location.reload();
}
function resize(){
 if(!renderer)return;const width=innerWidth,height=innerHeight;
 camera.aspect=width/height;camera.updateProjectionMatrix();
 const profile=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},low()?'low':'auto');
 renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,width,height));renderer.setSize(width,height,false);
}
async function boot(){
 missionLoading?.set(.10,'Initialisation du secteur');
 bootStep='initialisation graphique';status.textContent='Préparation du secteur et du moteur existant…';startButton.disabled=true;
 try{
  const environment={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu};
  const profile=graphicsProfile(environment,low()?'low':'auto',new URLSearchParams(location.search).get('renderer')==='webgl'||low()||await immersiveRendererPreferred());
  if(profile.phone&&!new URLSearchParams(location.search).has('quality'))quality.value='low';
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  missionLoading?.set(.28,'Construction des Bas-Niveaux');
  bootStep='création de la scène';status.textContent='Création du quartier cyberpunk…';
  canvas=prepared.canvas;renderer=prepared.renderer;
  renderer.onDeviceLost=info=>onRenderFailure(new Error('Périphérique graphique perdu : '+(info?.message||info?.reason||'WebGPU')));
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onRenderFailure(new Error('Contexte WebGL perdu'));});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  scene=new T.Scene();camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,.08,320);
  scene.add(camera);createEnvironment();
  missionLoading?.set(.52,'Quartier et voies de transit prêts');
  bootStep='jouabilité';status.textContent='Installation des commandes et des armes…';
  setupPlayer();resize();
  xr=createMissionXR({getWorld:()=>({T,scene,camera,renderer,game,weapon,soldier:playerRig?.model.root,obstacles:collisions,accent:characterId==='lylu'?'#80baff':'#ef91b4',createGun:()=>playerRig?.createGun({sleeve:false})||fallbackGun(),createHand:()=>playerRig?createGlove(playerRig.kit.gloves,{sleeve:false}):fallbackHand()}),getYaw:()=>yaw,setYaw:value=>{yaw=value;},onFrame:animation,isPaused:()=>paused||game.state!=='playing',onPause:pauseMission,onResume:()=>{unpauseMission();pauseMenu.hide(false);},onHome:()=>location.assign('./index.html'),onExit:()=>{snapCamera();resize();requestAnimationFrame(animation);},skillsInput:args=>skillMenu?.xrInput(args)});
  missionLoading?.set(.66,'Commandes et équipements');
  const useWebGL=!!renderer.isWebGLRenderer;
  bootStep='matériaux';
  try{pbrController=installLeanPBR(T,materials,architecture,{performance:low()||profile.phone,onProgress:state=>{
    const renderMode=useWebGL?'WebGL':'WebGPU';
    $('renderer').textContent=renderMode+' · PBR '+state.ready+'/'+state.requested+(state.fallback?' · '+state.fallback+' hors-ligne':'');
  }});}catch(error){console.warn('M02/PBR optional fallback:',error);}
  $('renderer').textContent=(renderer.isWebGLRenderer?'WebGL / repli':'WebGPU')+' · PBR';
  if(prepared.initialFailure)console.warn('M02: WebGPU unavailable:',prepared.initialFailure);
  bootStep='préparation du premier rendu';status.textContent='Préparation des lumières et du premier rendu…';
  missionLoading?.set(.90,'Préparation du premier rendu');
  snapCamera();
  if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
  bootStep='prêt';hud.hidden=false;started=true;requestAnimationFrame(animation);
  touchControls=createPinkWarsTouch(canvas,{
   onFire:down=>{if(down)audioReady();heldFire=down;if(down)firePressQueued=true;},
   onJump:()=>{jumpQueued=true;},
   onInteract:()=>interact(),
   onNext:()=>game.cycleWeapon(),
   onReload:()=>game.reload(),
   onCrouch:()=>{crouchQueued=true;},
   onView:()=>changeView(),
   onPause:()=>pauseMission(),
   onAim:down=>{if(down)audioReady();mouseAim=down;}
  });
  resume();
  pauseMenu.setVisible(true);
  if(missionLoading){await missionLoading.finish();document.documentElement.classList.remove('pw-auto-story');}
  if(new URLSearchParams(location.search).get('vr')==='1'){pauseMenu.show();pauseMenu.status('Le secteur est prêt. Choisissez « Passer en VR » pour autoriser le casque.');}
  // Authentic production character is loaded after the first playable frame.
  // If decoding a dense rig fails, the mission keeps functioning.
  void loadAuthenticSoldier();
 }catch(error){
  missionLoading?.fail('Les Bas-Niveaux n’ont pas pu charger. Réessayez.');
  console.error('[M02] boot failed at '+bootStep,error);
  status.textContent='Impossible de lancer ('+bootStep+') : '+(error?.message||error);
  startButton.textContent='RECOMMENCER LE CHARGEMENT →';startButton.disabled=false;
  if(new URLSearchParams(location.search).get('renderer')!=='webgl'){
    const retry=new URL(location.href);retry.searchParams.set('renderer','webgl');
    status.textContent+=' · Ouverture automatique du mode compatible…';
    location.replace(retry.href);
  }
 }
}
function resume(){
 if(paused){unpauseMission();return;}
 running=true;shade.style.display='none';startButton.disabled=false;
 if(game){game.reset(characterId);game.wave=2;game.ownedWeapons=new Set([game.weaponIndex,0,1,2]);game.ammo=WEAPONS.map(w=>w.capacity);}
 if(game){game.player.x=0;game.player.z=72;game.player.elevation=0;game.player.hp=100;game.state='playing';
  game.enemies=[];game.bullets=[];game.time=0;game.kills=0;game.nextWave=Infinity;game.toSpawn=0;}
 for(const o of enemyMeshes.values())scene.remove(o);enemyMeshes.clear();
 for(const o of shotMeshes.values())scene.remove(o);shotMeshes.clear();
 combatEffects?.reset();companion?.reset();
 fireInput.reset();
 yaw=0;pitch=0;stage=0;lastMinimalHudStage=-1;combatHud?.reset();touchSprinting=false;meleeQueued=chargeQueued=false;heldFire=false;mouseAim=false;aimBlend=0;jumpQueued=false;crouchQueued=false;firePressQueued=false;keys.clear();pinkControls.reset();touchControls?.reset();weaponFeel.reset();
 $('name').textContent='PINK WARS · '+characterId.toUpperCase()+' · M02';
 if(!touchControls?.root)canvas.requestPointerLock?.().catch?.(()=>{});
}
startButton.addEventListener('click',()=>{audioReady();if(started)resume();else{startButton.disabled=true;boot();}});
quality.addEventListener('change',()=>{
 // Rebuild once on setting change so PBR resolution, sprite counts, weather
 // and shadow budget are all updated consistently, not only pixel ratio.
 if(!started)return;
 const url=new URL(location.href);url.searchParams.set('quality',quality.value);
 location.assign(url.href);
});
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(e.code==='Escape'){e.preventDefault();if(paused)unpauseMission();else pauseMission();return;}
 if(!running)return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(e.repeat)return;
 if(e.code==='KeyJ'){jumpQueued=true;}
 if(e.code==='KeyF')interact();
 if(e.code==='KeyE')game.cycleWeapon();
 if(e.code==='KeyR')game.reload();
 if(e.code==='KeyX')meleeQueued=true;
 if(e.code==='KeyB')chargeQueued=true;
 if(e.code==='KeyC')crouchQueued=true;
 if(e.code==='KeyV')changeView();
 if(e.code==='Space')firePressQueued=true;
 if(/^Digit[1237]$/.test(e.code))game.selectWeapon(Number(e.code.slice(-1))-1);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();heldFire=false;mouseAim=false;firePressQueued=false;fireInput.reset();pinkControls.reset();touchControls?.reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();heldFire=false;mouseAim=false;firePressQueued=false;fireInput.reset();pinkControls.reset();touchControls?.reset();}});
window.addEventListener('contextmenu',e=>{if(e.target===canvas)e.preventDefault();});
window.addEventListener('mousemove',e=>{
 if(!running||document.pointerLockElement!==canvas)return;
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=e.movementX*.004*sensitivity;
 pitch=clamp(pitch-e.movementY*.004*sensitivity,-.85,.7);
});
let dragPointer=null,dragX=0,dragY=0;
window.addEventListener('pointerdown',e=>{
 if(!running||e.target!==canvas)return;
 if(e.button===2){mouseAim=true;e.preventDefault();return;}
 if(e.button===1&&e.pointerType==='mouse'){meleeQueued=true;e.preventDefault();return;}
 if(e.button!==0||e.pointerType!=='mouse')return;
 // On phones, the canvas is a camera surface, not a fire trigger.
 heldFire=true;firePressQueued=true;
 dragPointer=e.pointerId;dragX=e.clientX;dragY=e.clientY;
 if(e.pointerType==='mouse'&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch?.(()=>{});
});
window.addEventListener('pointermove',e=>{
 if(!running||e.pointerId!==dragPointer||document.pointerLockElement===canvas)return;
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=(e.clientX-dragX)*.004*sensitivity;pitch=clamp(pitch-(e.clientY-dragY)*.004*sensitivity,-.85,.7);
 dragX=e.clientX;dragY=e.clientY;
});
for(const name of ['pointerup','pointercancel']){
 window.addEventListener(name,e=>{if(e.button===0||e.pointerId===dragPointer){heldFire=false;dragPointer=null;}if(e.button===2)mouseAim=false;});
}
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)heldFire=false;});
window.__PINK_M02=Object.freeze({snapshot:()=>({music:{playing:false,source:null},revision:'3.64.0',running,paused,time:game?.time,vr:xr?.active||false,menuOpen:pauseMenu.isOpen,stage,characterId,health:game?.player.hp,
 weapon:game?.weapon.id,ammo:game?.ammo[game.weaponIndex],capacity:game?.weapon.capacity,enemies:game?.enemies.length,
 shadowing:worldShadows?.stats(),backend:renderer?.isWebGLRenderer?'webgl':'webgpu',rig:!!playerRig,skills:companionSkills?.snapshot(game),skillsMenuOpen:skillMenu?.isOpen||false,companion:companion?.snapshot(),pbr:pbrController?.stats,architecture:architecture?.stats,signage:districtSigns?.stats(),war:warZone?.stats,
 effects:combatEffects?.stats(),armor:game&&{shield:game.player.shield,shieldCapacity:game.shieldCapacity,shieldCharging:game.shieldCharging,charges:game.charges,thrown:game.thrownCharges.length,meleeAt:game.meleeAt}})});
if(autoMission){startButton.disabled=true;void boot();}
