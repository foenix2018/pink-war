import {createHologramComms} from './hologram-comms.js';
import {setScreenMusic,screenMusicSnapshot} from './menu-music.js';
import {walkingSurface} from './surface-steps.js';
// PINK WARS — « LIGNE 9 · LA LIGNE NOYÉE », campaign chapter 05 (Tome II M05, Acte II « Sous la ville »).
// Same production simulation as the missions (ArenaGame + armour layer), weapons, gloves, Shadow Unit rig,
// controls, HUD and WebXR as M02 and the Couronne HELIX; new world (ligne9-layout.js / ligne9-art.js), a full
// mission flow (ligne9-mission.js) and a subtitled script with readable documents (ligne9-story.js).
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame,clamp,segmentBox,traceEnemyHit} from './game-logic.js';
import {createPinkWarsInput,createPinkWarsTouch} from './level2-input.js';
import {createWeaponFeel} from './weapon-feel.js';
import {loadRealLaserSample,loadCombatSamples,playLaserShot,playWeaponAction,playLaserImpact,setLaserAudioEnabled} from './laser-sound.js';
import {aimSensitivity,magnifiedFov,flatSightPose} from './optics.js';
import {OPTICS,buildGun} from './weapons.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createEnemyFactory} from './enemies.js';
import {createEnemyDestructionFX} from './enemy-destruction-fx.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {createCampaignCombatEffects} from './campaign-combat-effects.js';
import {createAICompanion} from './ai-companions.js';
import {createAmbience} from './ambience.js';
import {createFireBuffer} from './fire-input.js';
import {createCompanionSkills} from './companion-skills.js';
import {createCompanionMenu} from './companion-menu.js';
import {createPauseMenu} from './fracture-menu.js';
import {createMissionXR,immersiveRendererPreferred} from './mission-xr.js';
import {createGlove} from './hands.js';
import {mountCombatHud} from './combat-hud.js';
import {createArmorFeedback,meleeKick,MELEE_POSE} from './armor-feedback.js';
import * as L from './ligne9-layout.js';
import {createLigne9Art} from './ligne9-art.js';
import {createLigne9Mission,ESCAPE_SECONDS} from './ligne9-mission.js';
import {linesFor,lineSeconds,LOGS,ENDING,SPEAKERS} from './ligne9-story.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const characterId=params.get('character')==='ghju'?'ghju':'lylu';
document.documentElement.dataset.universe=characterId==='lylu'?'blue':'pink';
const shade=$('shade'),startButton=$('start'),status=$('status'),quality=$('quality'),hud=$('hud');
if(params.get('quality')==='low')quality.value='low';
const low=()=>quality.value==='low';
let canvas=$('game'),renderer,scene,camera,game,weapon,art,clock=0,running=false,started=false,last=0,framePending=false,recovering=false,bootStep='modules';
let yaw=0,pitch=0,noticeUntil=0,hitUntil=0,paused=false,view='fps',aimBlend=0,mouseAim=false,playerRig=null,touchControls=null;
let jumpQueued=false,crouchQueued=false,firePressQueued=false,heldFire=false,weaponReady=false,audioCtx=null;
let combatEffects=null,companion=null,ambience=null,companionSkills=null,skillMenu=null,enemyFactory=null,armorFx=null,combatHud=null;
let meleeQueued=false,chargeQueued=false,touchSprinting=false,xr=null,fallbackGun=null,fallbackHand=null;
let enemyDestructionFX=null;
let reading=null,lamp=null,lampMode='auto',lampOn=false,underground=null,subtitlePlane=null;
const weaponFeel=createWeaponFeel(),pinkControls=createPinkWarsInput(),fireInput=createFireBuffer();
let enableAudio=true;try{enableAudio=JSON.parse(localStorage.getItem('rosee-settings')||'{}').sound!==false;}catch{}
const keys=new Set(),enemyMeshes=new Map(),shotMeshes=new Map(),pickupMeshes=new Map();
const traversal=L.createTraversal();
let collisions=L.buildCollisions(),mission=null,missionTime=0,shotsFired=0,hits=0;
const completed=()=>!!mission?.completed;
const heroName=characterId==='lylu'?'LYLU':'GHJU';

const pauseMenu=createPauseMenu({title:'05 — LA LIGNE NOYÉE / LIGNE 9',canOpen:()=>started&&!completed()&&!reading,
 onPause:()=>pauseMission(),onResume:()=>unpauseMission(),onVR:()=>xr?.enter(),onHome:async()=>{await xr?.exit();location.assign('./index.html');}});
pauseMenu.setVisible(false);

// ---------- Sound ----------
function audioReady(){
 if(!enableAudio)return;
 if(audioCtx){void audioCtx.resume?.().catch?.(()=>{});return;}
 try{
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
  audioCtx=window.__PINKWAR_BOOT_AUDIO||new Context();audioCtx.resume?.().catch?.(()=>{});
  setLaserAudioEnabled(audioCtx,true);void loadRealLaserSample(audioCtx);void loadCombatSamples(audioCtx);ambience=createAmbience(audioCtx);
  underground=createUnderground(audioCtx);
 }catch(error){console.warn('Ligne 9 audio',error);}
}
document.addEventListener('pointerdown',audioReady,{once:true,capture:true,passive:true});
document.addEventListener('keydown',audioReady,{once:true,capture:true});
// Underground bed: water rumble (filtered noise), mains hum of the emergency supply, pump drone, dripping.
function createUnderground(ctx){
 const out=ctx.createGain();out.gain.value=0;out.connect(ctx.destination);
 const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let b=0;
 for(let i=0;i<data.length;i++){b=(b+.02*(Math.random()*2-1))/1.02;data[i]=b*3.2;}
 const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
 const water=ctx.createBiquadFilter();water.type='lowpass';water.frequency.value=380;const waterGain=ctx.createGain();waterGain.gain.value=.5;
 noise.connect(water);water.connect(waterGain);waterGain.connect(out);
 const hum=ctx.createOscillator();hum.type='sawtooth';hum.frequency.value=50;const humFilter=ctx.createBiquadFilter();humFilter.type='lowpass';humFilter.frequency.value=160;
 const humGain=ctx.createGain();humGain.gain.value=0;hum.connect(humFilter);humFilter.connect(humGain);humGain.connect(out);
 const pump=ctx.createOscillator();pump.type='triangle';pump.frequency.value=38;const pumpGain=ctx.createGain();pumpGain.gain.value=0;pump.connect(pumpGain);pumpGain.connect(out);
 noise.start();hum.start();pump.start();
 let nextDrip=1;
 return{update(dt,{active,room,power,pumps,flooding}){
  const t=ctx.currentTime;out.gain.setTargetAtTime(active?.16:0,t,.4);
  waterGain.gain.setTargetAtTime(room==='rue'?.12:flooding?1.4:['quai','tunnel','sas','voie','halles'].includes(room)?.85:.45,t,.6);
  water.frequency.setTargetAtTime(flooding?900:380,t,.8);
  humGain.gain.setTargetAtTime(power?.05:0,t,.5);
  pumpGain.gain.setTargetAtTime(pumps*(room==='pompes'?.9:.25),t,1.2);pump.frequency.setTargetAtTime(30+pumps*16,t,1.5);
  nextDrip-=dt;
  if(active&&room!=='rue'&&nextDrip<=0){nextDrip=.6+Math.random()*2.6;
   const o=ctx.createOscillator(),g=ctx.createGain(),f=1400+Math.random()*1600;o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.45,t+.09);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05+Math.random()*.06,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(out);o.start(t);o.stop(t+.16);}
 }};
}
// Short synthesised cues for the mission beats.
function cue(kind){
 if(!audioCtx||audioCtx.state!=='running')return;
 try{
  const now=audioCtx.currentTime,out=audioCtx.createGain();out.gain.value=.12;out.connect(audioCtx.destination);
  const tone=(type,from,to,length,delay=0,gain=.9)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(from,now+delay);o.frequency.exponentialRampToValueAtTime(to,now+delay+length);
   g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(gain,now+delay+.02);g.gain.exponentialRampToValueAtTime(.0001,now+delay+length);o.connect(g);g.connect(out);o.start(now+delay);o.stop(now+delay+length+.05);};
  if(kind==='portal'){tone('sawtooth',90,420,2.6);tone('sine',180,840,2.8,.2);}
  else if(kind==='console'){tone('sine',660,990,.12);tone('sine',990,1320,.14,.13);}
  else if(kind==='stage'){tone('triangle',440,660,.25);tone('triangle',660,880,.3,.22);}
  else if(kind==='door'){tone('sawtooth',70,55,1.4,0,.5);tone('square',140,120,.2,0,.3);}
  else if(kind==='valve'){for(let k=0;k<5;k++)tone('square',220+k*20,200+k*20,.08,k*.16,.35);}
  else if(kind==='read'){tone('triangle',1200,900,.06,0,.25);tone('triangle',900,700,.08,.07,.2);}
  else if(kind==='hold'){tone('sine',110,220,1.8,0,.6);tone('sine',55,110,2.2,.1,.6);}
  else if(kind==='emerge'){tone('sine',180,60,.8,0,.7);tone('sawtooth',300,90,.6,.15,.3);}
  else if(kind==='blackout'){tone('sawtooth',120,30,1.6,0,.8);tone('square',60,40,.4,.05,.5);}
  else if(kind==='alarm'){for(let k=0;k<6;k++)tone('square',k%2?660:520,k%2?660:520,.32,k*.36,.35);}
 }catch{}
}

// ---------- Text: notices, objective, subtitles ----------
function notice(message,seconds=3.6){$('notice').textContent=message;$('notice').style.display='block';noticeUntil=clock+seconds;}
function showStage(index,s){
 const total=L.STAGES.length-1;
 $('objective').textContent=Math.min(index+1,total)+'/'+total+' · '+s.label;$('hint').textContent=s.hint;
 document.body.classList.add('pw-objective-open');clearTimeout(window.__pwLigneObjective);
 window.__pwLigneObjective=setTimeout(()=>document.body.classList.remove('pw-objective-open'),6500);
 if(index>0)cue('stage');
}
const subtitles=[];let subtitle=null;
const comms=createHologramComms();
function say(id){for(const line of linesFor(id,characterId))subtitles.push(line);}
function updateSubtitles(dt){
 if(subtitle&&!reading){subtitle.left-=dt;if(subtitle.left<=0)subtitle=null;}
 if(!subtitle&&subtitles.length){const line=subtitles.shift();subtitle={...line,left:lineSeconds(line.text)};drawSubtitle(subtitle);}
 const box=$('subtitle');box.style.display='none';
 comms.update(dt,{xr:!!xr?.active,hidden:!!reading});
 if(subtitlePlane)subtitlePlane.visible=!!(subtitle&&xr?.active&&!reading);
}
function drawSubtitle(line){
 comms.push(line);
 const box=$('subtitle');box.innerHTML='';const who=document.createElement('b');who.textContent=line.speaker?.name||line.who.toUpperCase();who.style.color=line.speaker?.color||'#fff';
 box.append(who,document.createTextNode(' '+line.text));
 if(!subtitlePlane)return;
 const c=subtitlePlane.userData.canvas.getContext('2d');c.clearRect(0,0,1024,200);c.fillStyle='rgba(6,10,18,.82)';c.beginPath();c.roundRect(0,0,1024,200,26);c.fill();
 c.font='800 30px system-ui,sans-serif';c.fillStyle=line.speaker?.color||'#fff';c.fillText(line.speaker?.name||'',34,50);
 c.font='500 30px system-ui,sans-serif';c.fillStyle='#eef1f6';let y=98,row='';
 for(const word of line.text.split(/\s+/)){if(c.measureText(row+word).width>950){c.fillText(row,34,y);y+=38;row='';}row+=word+' ';}c.fillText(row,34,y);
 subtitlePlane.material.map.needsUpdate=true;
}

// ---------- Documents ----------
function openDocument(id){
 const log=LOGS[id];if(!log)return;
 reading=id;heldFire=false;mouseAim=false;fireInput.reset();keys.clear();touchControls?.reset();document.exitPointerLock?.();
 if(xr?.active){xr.showJournal({stamp:'LIGNE 9 · DOCUMENT TROUVÉ',title:log.title,lines:log.body,footer:'Gâchette sur le bouton pour reprendre.'},()=>closeDocument());return;}
 $('doc-title').textContent=log.title;const body=$('doc-body');body.innerHTML='';
 for(const paragraph of log.body){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}
 $('doc').hidden=false;
}
function closeDocument(){
 if(!reading)return;reading=null;$('doc').hidden=true;
 if(!touchControls?.root&&!xr?.active&&running)canvas.requestPointerLock?.().catch?.(()=>{});
}

// ---------- World ----------
function createWorld(){
 art=createLigne9Art(T,scene,{quality:low()?'low':'normal',camera});
 art.build(collisions);
 // Head lamp of the AEGIS helmet: on automatically in the dark, L to force it.
 lamp=new T.SpotLight(0xf4f1e6,0,36,.46,.6,1.15);lamp.position.set(.12,.05,0);lamp.target.position.set(0,-.4,-6);camera.add(lamp);camera.add(lamp.target);
 const sc=document.createElement('canvas');sc.width=1024;sc.height=200;const tex=new T.CanvasTexture(sc);tex.colorSpace=T.SRGBColorSpace;
 subtitlePlane=new T.Mesh(new T.PlaneGeometry(.62,.121),new T.MeshBasicMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
 subtitlePlane.userData.canvas=sc;subtitlePlane.position.set(0,-.16,-1.05);subtitlePlane.renderOrder=101;subtitlePlane.visible=false;subtitlePlane.frustumCulled=false;camera.add(subtitlePlane);
}
function enemyMaterials(){
 const m=(c,r=.6,me=.4)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:me}),g=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
 return {monster:m(0x3d4955,.62,.48),monsterFace:m(0x0b1119,.5,.4),cyan:g(0x3acddd),rose:g(0xff4fa1),violet:g(0x4ba8ff),pale:g(0xc2e5eb)};
}
function setupPlayer(){
 game=new ArenaGame(collisions,Math.random,traversal,characterId);game.reset(characterId);game.enableArmorShield();
 mission=createLigne9Mission({game,characterId,hooks:{
  setObstacles:list=>{collisions=list;},openPortal:(x,y,z,o)=>art.openPortal(x,y,z,o),
  setDoor:(id,state)=>art.setDoor(id,state),setWater:(id,state)=>art.setWater(id,state),setPower:(zone,state)=>art.setPower(zone,state),
  reveal:on=>art.reveal(on),flood:on=>art.flood(on,clock),emerge:(x,z)=>art.emerge(x,z),
  cue,notice:text=>notice(text,4),say,stage:showStage,finish:finishMission,clear:clearVisuals}});
 const lylu=characterId==='lylu',mat=(c,r=.5,m=.5)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m}),glow=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
 const heroGlow=glow(lylu?0x4da8ff:0xff4fa1);
 const pm={dark:mat(0x121a25,.58,.62),iron:mat(0x3b4752,.45,.76),black:mat(0x071019,.69,.32),cyan:glow(0x3acddd),white:glow(0xc2e5eb),
  armor:mat(lylu?0x356fa6:0xb64472,.38,.72),armorLight:mat(lylu?0xb6d9e8:0xdec3cf,.35,.68),steel:mat(0x3b4752,.45,.76),rose:heroGlow,pale:glow(0xc2e5eb),violet:glow(0x4ba8ff)};
 const gloves={fabric:mat(0x222736,.9,.08),plate:pm.armor,trim:pm.armorLight,glow:heroGlow,accent:pm.cyan,metal:pm.iron};
 fallbackGun=()=>buildGun({mats:pm,gloves,sleeve:false,makeFlash:parent=>{const f=new T.Mesh(new T.SphereGeometry(.06,8,6),heroGlow);parent.add(f);return f;}});
 fallbackHand=()=>createGlove(gloves,{sleeve:false});
 try{weapon=buildGun({mats:pm,gloves,makeFlash:()=>{const o=new T.Mesh(new T.SphereGeometry(.07,8,6),heroGlow);o.visible=false;return o;}});weapon.userData.setVariant(game.weaponIndex);}
 catch(error){console.warn('Ligne 9 / arme simplifiée',error);weapon=new T.Group();Object.assign(weapon.userData,{index:0,setVariant(index){this.index=index;},setCombatState(){}});}
 camera.add(weapon);weapon.position.set(.19,-.24,-.56);
 combatEffects=createCampaignCombatEffects(T,scene,characterId);
 companion=createAICompanion(T,scene,characterId);
 companionSkills=createCompanionSkills({characterId,mission:5,mode:'campaign'});
 skillMenu=createCompanionMenu({getStatus:()=>companionSkills.snapshot(game),onUse:id=>companionSkills.use(id,{game,...aimRay()}),
  onChange(open){heldFire=false;keys.clear();fireInput.reset();touchControls?.reset();if(open)document.exitPointerLock?.();}});
 armorFx=createArmorFeedback({T,scene,accent:lylu?0x80baff:0xef91b4,listener:()=>game.player,
  audio:()=>enableAudio&&audioCtx?.state==='running'?audioCtx:null,haptic:kind=>xr?.active&&xr.haptic(kind)});
 try{enemyFactory=createEnemyFactory(enemyMaterials());}catch(error){console.warn('Ligne 9 / ennemis simplifiés',error);}
}
function lookFrom(cp){yaw=cp.yaw||0;pitch=-.04;}

// ---------- Mission presentation (rules in ligne9-mission.js) ----------
function startMission(){
 subtitles.length=0;subtitle=null;comms.clear();for(const it of L.INTERACTIONS)art.markDone(it.id,false);
 mission.start();lookFrom(L.START);missionTime=0;shotsFired=0;hits=0;
}
function clearVisuals(){
 for(const o of enemyMeshes.values())scene.remove(o);enemyMeshes.clear();enemyDestructionFX?.reset();
 for(const o of shotMeshes.values())scene.remove(o);shotMeshes.clear();
 for(const o of pickupMeshes.values())scene.remove(o);pickupMeshes.clear();
 combatEffects?.reset();companion?.reset?.();
}
function interact(){
 if(!running)return;if(reading){closeDocument();return;}
 const it=mission.interact();if(!it)return;audioReady();art.markDone(it.id);
 // Documents, and the two proofs and the relay log, open as readable pages.
 const log=it.log||(LOGS[it.id]?it.id:null);if(log)openDocument(log);
}
function syncDevices(){
 // Devices already used (checkpoint restarts reset partial progress) and those usable now.
 const done=new Set([...mission.done,...mission.reads]);
 for(const it of L.INTERACTIONS){const isDone=it.log?mission.reads.includes(it.log):done.has(it.id)||(it.id==='tableau'&&mission.stage>L.STAGE_INDEX.courant)||(it.id==='pompe-a'&&mission.done.includes('pompeA'))||(it.id==='pupitre-p9'&&mission.done.includes('pompes'))||(it.id==='ecluse'&&mission.done.includes('ecluse'));art.markDone(it.id,isDone);}
}
function finishMission(){
 running=false;ambience?.pause?.();document.exitPointerLock?.();closeDocument();
 const minutes=Math.floor(missionTime/60),seconds=String(Math.floor(missionTime%60)).padStart(2,'0');
 $('panel-title').innerHTML='La Ligne <em>noyée</em>';
 $('panel-text').textContent=ENDING.text[characterId];
 const docs=Object.keys(LOGS).filter(id=>mission.reads.includes(id)).length;
 $('panel-small').textContent=`Temps ${minutes}:${seconds} · Machines neutralisées ${game.kills} · Précision ${shotsFired?Math.round(hits/shotsFired*100):0} % · Documents ${docs}/${Object.keys(LOGS).length} · ${ENDING.next}`;
 startButton.textContent='REJOUER LA LIGNE 9 →';startButton.disabled=false;status.textContent='';shade.style.display='grid';shade.classList.add('ended');document.body.classList.add('pw-shaded');
}
function missionLost(){
 running=false;document.exitPointerLock?.();closeDocument();
 const drowned=mission.stage===L.STAGE_INDEX.fuite&&mission.escape===0;
 $('panel-title').innerHTML=drowned?'Ligne <em>réimmergée</em>':'Signal <em>perdu</em>';
 $('panel-text').textContent=drowned?'L’eau a repris la chambre JANUS-9 avant que tu atteignes le poste Orme. Reprends au dernier point de contrôle.':'ORDRE tient encore la Ligne 9. Reprends au dernier point de contrôle.';
 $('panel-small').textContent=L.STAGES[Math.min(mission.stage,L.STAGES.length-2)].label;
 startButton.textContent='REPRENDRE AU POINT DE CONTRÔLE →';startButton.disabled=false;status.textContent='';shade.style.display='grid';shade.classList.add('lost');document.body.classList.add('pw-shaded');
}

// ---------- Camera, weapon and rig ----------
function snapCamera(){
 if(xr?.active){xr.syncPose();return;}
 const p=game.player,eye=characterId==='lylu'?1.71:1.61,optic=OPTICS[game.weapon.id],normal=view==='fps'?72:64;
 camera.fov=normal+(optic?(magnifiedFov(normal,optic.magnification)-normal)*aimBlend:0);
 camera.rotation.set(pitch+weaponFeel.state.pitch*.18,yaw+weaponFeel.state.yaw*.07,0,'YXZ');
 if(view==='fps')camera.position.set(p.x,p.elevation+eye-(p.crouched?.55:0),p.z);
 else{
  const start={x:p.x,y:p.elevation+eye-.2-(p.crouched?.45:0),z:p.z},dist=4.2;
  const end={x:p.x+Math.sin(yaw)*dist*Math.cos(pitch)+Math.cos(yaw)*.65,y:start.y-Math.sin(pitch)*dist,z:p.z+Math.cos(yaw)*dist*Math.cos(pitch)-Math.sin(yaw)*.65};
  let nearest=1;
  for(const box of collisions){const t=segmentBox(start,end,{...box,hx:box.hx+.2,hz:box.hz+.2});if(t!==null)nearest=Math.min(nearest,Math.max(.09,t-.05));}
  const room=L.ROOMS.find(r=>r.id===L.roomAt(p.x,p.z)),ceiling=room&&room.id!=='rue'?room.ceiling-.3:Infinity;
  camera.position.set(start.x+(end.x-start.x)*nearest,Math.min(ceiling,Math.max(p.elevation+.35,start.y+(end.y-start.y)*nearest)),start.z+(end.z-start.z)*nearest);
 }
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 weapon.visible=view==='fps';if(playerRig?.model)playerRig.model.root.visible=view==='third';
}
function changeView(){view=view==='fps'?'third':'fps';if(!playerRig&&view==='third'){view='fps';notice('PERSONNAGE SHADOW UNIT EN COURS DE CHARGEMENT');}snapCamera();}
function toggleLamp(){lampMode=lampMode==='auto'?(lampOn?'off':'on'):lampMode==='on'?'off':'on';notice(lampMode==='on'?'LAMPE FRONTALE ALLUMÉE':'LAMPE FRONTALE ÉTEINTE',1.6);}
function updateLamp(dt){
 const want=lampMode==='on'||(lampMode==='auto'&&art.dark(game.player.x,game.player.z));
 if(want!==lampOn&&lampMode==='auto'&&want)notice('LAMPE FRONTALE · L POUR L’ÉTEINDRE',2.2);
 lampOn=want;lamp.intensity+=((lampOn?70:0)-lamp.intensity)*Math.min(1,dt*8);
 // In the headset, the lamp follows the head.
 const eye=xr?.active?renderer.xr.getCamera():null;
 if(eye&&lamp.parent!==scene){scene.add(lamp);scene.add(lamp.target);}
 if(!eye&&lamp.parent!==camera){camera.add(lamp);camera.add(lamp.target);lamp.position.set(.12,.05,0);lamp.target.position.set(0,-.4,-6);}
 if(eye){const f=new T.Vector3();eye.getWorldPosition(lamp.position);eye.getWorldDirection(f);lamp.target.position.copy(lamp.position).addScaledVector(f,6);lamp.target.updateMatrixWorld();}
}
async function loadAuthenticSoldier(){
 if(weaponReady)return;weaponReady=true;
 try{
  const model=await installPinkWarsSoldier(T,scene,characterId,enemyMaterials());
  playerRig=model;model.model.root.visible=view==='third';model.model.setWeapon(game.weaponIndex);
  const canonicalGun=model.createGun();canonicalGun.userData.setVariant(game.weaponIndex);
  weapon.removeFromParent();weapon=canonicalGun;camera.add(weapon);weapon.position.set(.19,-.24,-.56);snapCamera();
 }catch(error){console.warn('Ligne 9 / personnage Shadow Unit optionnel',error);}
}
function updateSoldier(dt,moving,sprint,firing){
 const model=playerRig?.model;if(!model)return;
 try{
  model.root.position.set(game.player.x,game.player.elevation,game.player.z);model.root.rotation.y=yaw;
  if(model.weapon!==game.weaponIndex)model.setWeapon(game.weaponIndex);
  model.gun.userData.setCombatState?.({ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,time:game.time,dualState:game.dual,reloading:game.reloadRemaining>0,
   reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,charge:game.charge});
  model.animate(game.time,moving,weaponFeel.state.pitch,0,Number(firing),dt,{airborne:!game.player.grounded,verticalSpeed:game.player.verticalSpeed,crouched:game.player.crouched,firing:!!firing,sprint,aim:aimBlend>.2});
 }catch(error){console.warn('Ligne 9 / animation',error);scene.remove(model.root);playerRig=null;}
}
function aimRay(){
 if(xr?.active)return xr.aim();
 const forward=new T.Vector3();camera.getWorldDirection(forward);
 const far=camera.position.clone().addScaledVector(forward,220);let near=1,target=far;
 for(const box of collisions){const hit=segmentBox(camera.position,far,box);if(hit!==null&&hit<near){near=hit;target=camera.position.clone().lerp(far,hit);}}
 for(const e of game.enemies){const hit=traceEnemyHit(camera.position,far,e);if(hit&&hit.t<near){near=hit.t;target=camera.position.clone().lerp(far,hit.t);}}
 const gun=view==='third'?playerRig?.model?.gun:weapon,muzzle=gun?.userData?.flashFor?.(game.nextDualHand)||gun?.userData?.flash,origin=new T.Vector3();
 if(muzzle){try{muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(origin);}catch{origin.copy(camera.position).addScaledVector(forward,.23);}}
 else origin.copy(camera.position).addScaledVector(forward,.23);
 return {origin,direction:target.clone().sub(origin).normalize()};
}

// ---------- Rendering of the simulation ----------
const projectileCore=new T.SphereGeometry(.07,6,4);
const shotMaterial={hostile:new T.MeshBasicMaterial({color:0xff4659,toneMapped:false}),friendly:new T.MeshBasicMaterial({color:characterId==='lylu'?0x8fd0ff:0xff8ac4,toneMapped:false})};
const pickupGeometry=new T.OctahedronGeometry(.28,0);
const pickupMaterial={heal:new T.MeshBasicMaterial({color:characterId==='lylu'?0x6fb8ff:0xff6fb4,toneMapped:false}),cell:new T.MeshBasicMaterial({color:0xe8f6ff,toneMapped:false})};
function updateActors(dt){
 const live=new Set();
 for(const e of game.enemies){
  live.add(e.id);let model=enemyMeshes.get(e.id);
  if(!model){
   try{model=enemyFactory?.create(e.elite,e.ranged,e.form);}catch(err){console.warn('Ligne 9 / modèle ennemi',err);}
   if(!model){model=new T.Group();const body=new T.Mesh(new T.CapsuleGeometry(.39,1.05,5,8),shotMaterial.hostile);body.position.y=1.04;model.add(body);}
   if(e.boss)model.scale.setScalar(1.25);
   model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});enemyMeshes.set(e.id,model);scene.add(model);
  }
  model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;model.userData.animate?.(clock,e.phase,true,e,game.time);enemyDestructionFX?.mark(e,model,dt);
 }
 for(const [id,o] of enemyMeshes)if(!live.has(id)){
    const dead=game.events?.some(event=>event.type==='kill'&&event.id===id);
    if(dead&&enemyDestructionFX)enemyDestructionFX.kill(o,{id,form:o.userData.form,x:o.position.x,z:o.position.z,groundY:o.position.y-(o.userData.form==='probe'?2:0)});
    else scene.remove(o);
    enemyMeshes.delete(id);
  }
  enemyDestructionFX?.update(dt);
 const active=new Set();
 for(const b of game.bullets){
  active.add(b.id);let mesh=shotMeshes.get(b.id);
  if(!mesh){mesh=new T.Mesh(projectileCore,b.hostile?shotMaterial.hostile:shotMaterial.friendly);shotMeshes.set(b.id,mesh);scene.add(mesh);}
  mesh.position.set(b.x,b.y,b.z);
 }
 for(const [id,o] of shotMeshes)if(!active.has(id)){scene.remove(o);shotMeshes.delete(id);}
 const items=new Set();
 for(const p of game.pickups){
  const id=p.id??(p.x+':'+p.z);items.add(id);let mesh=pickupMeshes.get(id);
  if(!mesh){mesh=new T.Mesh(pickupGeometry,pickupMaterial[p.kind]||pickupMaterial.cell);pickupMeshes.set(id,mesh);scene.add(mesh);}
  mesh.position.set(p.x,(p.y??0)+.7+Math.sin(clock*2.4)*.1,p.z);mesh.rotation.y=clock*1.8;
 }
 for(const [id,o] of pickupMeshes)if(!items.has(id)){scene.remove(o);pickupMeshes.delete(id);}
}

// ---------- Simulation tick ----------
function gameTick(dt){
 const xc=xr?.active?xr.controls:null;
 const controls=xc?{moveX:xc.x,moveZ:xc.z,lookX:0,lookY:0,jump:xc.jump,interact:xc.interact,aim:xc.aim,fire:xc.fire,sprint:xc.sprint,melee:xc.melee,charge:xc.charge}
  :pinkControls.read(dt,keys,navigator.getGamepads?.()||[],{focused:!document.hidden});
 // Reading a document pauses the world; any action button closes it.
 if(reading){if(controls.interact||controls.pause||controls.fire||controls.jump)closeDocument();updateHUD();return;}
 if(controls.companion)skillMenu?.setOpen(!skillMenu.isOpen);
 if(skillMenu?.isOpen)return;
 const touch=touchControls?.state||{x:0,z:0,lookX:0,lookY:0,fire:false,aim:false};
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=(controls.lookX*1.8+touch.lookX*1.8)*sensitivity*dt;
 pitch=clamp(pitch-(controls.lookY+touch.lookY)*1.35*sensitivity*dt,-.85,.7);
 yaw-=(touch.lookDX||0)*.004*sensitivity;pitch=clamp(pitch-(touch.lookDY||0)*.004*sensitivity,-.85,.7);touch.lookDX=touch.lookDY=0;
 const x=controls.moveX+touch.x,z=controls.moveZ+touch.z;
 const aiming=!!OPTICS[game.weapon.id]&&game.reloadRemaining<=0&&(mouseAim||touch.aim||controls.aim);
 aimBlend+=(Number(aiming)-aimBlend)*(1-Math.exp(-dt*14));document.body.classList.toggle('aiming',aiming);
 const sprint=!aiming&&(controls.sprint||touchSprinting||touch.sprint);
 if(controls.pause){pauseMission();return;}
 if(controls.next)game.cycleWeapon();
 if(controls.reload)game.reload();
 if(controls.interact)interact();
 if(reading)return;
 const crouchToggle=controls.crouchToggle||crouchQueued;crouchQueued=false;
 if(jumpQueued)game.player.jumpHeld=false;
 const jump=controls.jump||jumpQueued;jumpQueued=false;
 game.nextWave=Infinity;game.toSpawn=0;
 game.step(dt,{x,z,yaw,moveYaw:xc?.moveYaw??yaw,sprint,jump,crouchToggle});
 missionTime+=dt;weaponFeel.update(dt);snapCamera();
 if(meleeQueued||controls.melee){const view=new T.Vector3();camera.getWorldDirection(view);game.melee({x:view.x,z:view.z});}
 if(chargeQueued||controls.charge){const eye=xr?.active?renderer.xr.getCamera():camera,from=new T.Vector3(),dir=new T.Vector3();eye.getWorldPosition(from);eye.getWorldDirection(dir);
  if(view!=='fps'&&!xr?.active)from.set(game.player.x,game.player.elevation+1.5,game.player.z);
  game.throwCharge({x:from.x+dir.x*.45,y:from.y-.18,z:from.z+dir.z*.45},dir);}
 meleeQueued=chargeQueued=false;
 if(firePressQueued)fireInput.press(game.time);
 const firing=fireInput.requested(heldFire||touch.fire||controls.fire,game.weapon,game.time);
 updateSoldier(dt,Math.hypot(x,z)>.1,sprint,firing);
 const aim=aimRay();
 if(game.weapon.semiAuto&&firePressQueued)game.triggerHeld=false;firePressQueued=false;
 const ammoBefore=game.ammo[game.weaponIndex];
 if(xr?.active&&game.weapon.dual){for(const hand of ['right','left']){const a=xr.aim(hand);game.triggerHand(hand,hand==='right'?xc.fire:xc.leftFire,dt,a.origin,a.direction);}}
 else if(firing||game.charge>0)game.trigger(firing,dt,aim.origin,aim.direction);
 else{game.triggerHeld=false;game.semiPending=false;}
 if(game.ammo[game.weaponIndex]<ammoBefore)fireInput.consume();
 updateActors(dt);
 for(const e of game.drainEvents()){
  combatEffects?.event(e);armorFx.handle(e);
  if(e.type==='shot'){shotsFired++;xr?.haptic('shot',e.weapon,e.hand);weaponFeel.fire(e.weapon||game.weapon.id,e.power||1,aimBlend>.5);if(enableAudio&&audioCtx)try{playLaserShot(audioCtx,e.weapon||game.weapon.id,e.power||1);}catch{}}
  if(e.type==='hit'){hits++;hitUntil=clock+.12;}
  if(e.type==='damage')$('damage').style.boxShadow='inset 0 0 105px #c52c5e77';
  if(e.type==='weapon')weaponFeel.reset();
  if(e.type==='reload'&&audioCtx)try{playWeaponAction(audioCtx,game.weapon.id,'reload-out');}catch{}
  if(e.type==='reloaded'&&audioCtx)try{playWeaponAction(audioCtx,game.weapon.id,'reload-ready');}catch{}
  if(e.type==='impact'&&audioCtx)try{playLaserImpact(audioCtx,{surface:e.surface,distance:Math.hypot(e.x-game.player.x,e.z-game.player.z),power:e.power});}catch{}
  if(e.type==='over')missionLost();
 }
 if(running)mission.update();
 combatEffects?.update(game,dt,camera);armorFx.update(game,dt);
 companion?.update(dt,{game,camera,active:false});companionSkills?.update(dt,{game});skillMenu?.refresh();
 ambience?.update(dt,{active:running,position:game.player,moving:Math.hypot(x,z)>.1,grounded:game.player.grounded,elevation:game.player.elevation,yaw,probes:game.enemies,surface:walkingSurface(game)});
 if(game.player.hp>0)$('damage').style.boxShadow='inset 0 0 '+(100-game.player.hp)*1.2+'px #c52c5e44';
 const ads=flatSightPose(OPTICS[game.weapon.id],aimBlend),held=game.weapon.dual?{yaw:0,kick:0,pitch:0}:weaponFeel.state;
 weapon.position.set(ads.x+held.yaw*.15,ads.y-held.kick*.18,ads.z+held.kick);
 weapon.rotation.set(held.pitch,held.yaw+ads.yaw,-held.yaw*.35+ads.roll);
 const strike=meleeKick(game);if(strike){weapon.position.x+=MELEE_POSE.x*strike;weapon.position.y+=MELEE_POSE.y*strike;weapon.position.z+=MELEE_POSE.z*strike;weapon.rotation.x+=MELEE_POSE.pitch*strike;}
 weapon.userData.setSight?.(aimBlend>.55,camera);
 weapon.userData.setCombatState?.({ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,time:game.time,dualState:game.dual,charge:game.charge,reloading:game.reloadRemaining>0,
  reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,heat:weaponFeel.state.heat,kick:weaponFeel.state.kick,impulse:weaponFeel.state.impulse});
 weapon.userData.setFlash?.(running,game.time);playerRig?.model.gun.userData.setFlash?.(running,game.time);
 weapon.userData.animateHands?.(Number(firing),firing?.34:.18,game.reloadRemaining>0?.8:0,dt);
 if(weapon.userData.index!==game.weaponIndex)weapon.userData.setVariant(game.weaponIndex);
 updateHUD();
}
const armorTouch=(kind,value)=>{if(kind==='sprint'){touchSprinting=!!value;return;}if(!running||paused)return;audioReady();if(kind==='melee')meleeQueued=true;else if(kind==='charge')chargeQueued=true;else if(kind==='reload')game.reload();else if(kind==='next')game.cycleWeapon();else if(kind==='interact')interact();else if(kind==='crouch')crouchQueued=true;};
let lastDevices='';
function updateHUD(){
 (combatHud ||= mountCombatHud({characterId,onAction:armorTouch})).update(game);
 const it=reading?null:mission.nearInteraction(),stageInfo=L.STAGES[mission.stage];combatHud.setContext(it?.label);
 combatHud.setObjective({label:'LIGNE 9 · '+(L.ROOMS.find(r=>r.id===L.roomAt(game.player.x,game.player.z))?.label||'La Ligne Noyée'),detail:stageInfo?.label||''});
 $('prompt').style.display=it?'block':'none';if(it)$('prompt').textContent='F / R3 · '+it.label;
 if(clock>noticeUntil)$('notice').style.display='none';
 $('crosshair').style.filter=clock<hitUntil?'drop-shadow(0 0 7px #ffffff) brightness(3)':'';
 // Hold and escape countdowns.
 const hold=mission.hold,escape=mission.escape,timer=$('timer');
 if(hold||escape!==null){
  const left=hold?hold.remaining:escape,total=hold?hold.total:ESCAPE_SECONDS,label=hold?{pompeA:'AMORÇAGE POMPE A',pompes:'DÉMARRAGE POMPES P9',ecluse:'OUVERTURE DE L’ÉCLUSE'}[hold.name]:'L’EAU REMONTE · POSTE ORME';
  timer.hidden=false;timer.classList.toggle('danger',!hold);$('timer-label').textContent=label+' · '+Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0');$('timer-bar').style.width=(100*left/total).toFixed(1)+'%';
 }else timer.hidden=true;
 const available=L.INTERACTIONS.filter(i=>!i.log&&mission.available(i.id)).map(i=>i.id),key=available.join(',')+'|'+mission.done.length+'|'+mission.reads.length+'|'+mission.stage;
 if(key!==lastDevices){lastDevices=key;art.setAvailable(available);syncDevices();
  art.setPumps(mission.done.includes('pompes')?'running':hold?.name==='pompes'?'starting':'off');}
}

// ---------- Loop, pause, boot ----------
function animation(t,frame){
 if(started)setScreenMusic(running&&!paused&&!reading&&!skillMenu?.isOpen&&game?.state==='playing'?'gameplay':'paused',5);
 if(xr?.active&&!frame)return;
 if(!xr?.active)requestAnimationFrame(animation);
 const dt=Math.min(.04,Math.max(0,(t-last)/1000));last=t;
 if(!renderer||!scene)return;
 if(xr?.active)xr.input(frame,dt);
 skillMenu?.setVisible(started&&running&&!reading);clock+=dt;
 if(running)try{gameTick(dt);}catch(error){
  console.error('Ligne 9 / simulation',error);running=false;shade.style.display='grid';status.textContent='Erreur : '+(error?.message||String(error));
  startButton.disabled=false;startButton.textContent='RECOMMENCER →';
 }
 if(started){updateSubtitles(running?dt:0);updateLamp(dt);
  const room=L.roomAt(game.player.x,game.player.z),stats=art.stats();
  underground?.update(dt,{active:running,room,power:stats.power.station==='secours',pumps:mission.done.includes('pompes')?1:mission.hold?.name==='pompes'?.5:0,flooding:stats.flooding});}
 const eye=xr?.active?renderer.xr.getCamera():camera;
 try{art.update(clock,dt,eye,game?.player);}catch(error){console.warn('Ligne 9 / décor animé désactivé',error);art.update=()=>{};}
 if(xr?.active){xr.update(dt,weaponFeel.state,weaponFeel.state.kick>.025?.075:0);xr.renderScope();}
 if(!framePending&&!recovering){
  try{const result=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);
   if(result&&typeof result.then==='function'){framePending=true;result.then(()=>{framePending=false;}).catch(err=>{framePending=false;onRenderFailure(err);});}}
  catch(err){onRenderFailure(err);}
 }
}
function onRenderFailure(error){
 if(recovering)return;console.error('Ligne 9 / rendu',error);recovering=true;running=false;shade.style.display='grid';
 const url=new URL(location.href);
 if(url.searchParams.get('renderer')!=='webgl'){status.textContent='Le rendu WebGPU a échoué. Relance en mode compatible WebGL…';url.searchParams.set('renderer','webgl');location.replace(url.href);return;}
 status.textContent='Échec du rendu : '+(error?.message||String(error));startButton.textContent='RECHARGER →';startButton.disabled=false;startButton.onclick=()=>location.reload();
}
function resize(){
 if(!renderer)return;const width=innerWidth,height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();
 const profile=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},low()?'low':'auto');
 renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,width,height));renderer.setSize(width,height,false);
}
function pauseMission(){
 combatHud?.reset();touchSprinting=false;
 if(!running||paused)return;paused=true;running=false;ambience?.pause?.();heldFire=false;mouseAim=false;firePressQueued=false;fireInput.reset();
 touchControls?.reset();pinkControls.reset();document.exitPointerLock?.();pauseMenu.show();
}
function unpauseMission(){
 if(!paused)return;paused=false;running=true;shade.style.display='none';pauseMenu.hide(false);
 audioReady();
 if(!touchControls?.root&&!xr?.active)canvas.requestPointerLock?.().catch?.(()=>{});
}
async function boot(){
 bootStep='rendu';status.textContent='Préparation du moteur…';startButton.disabled=true;
 try{
  const environment={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu};
  const profile=graphicsProfile(environment,low()?'low':'auto',params.get('renderer')==='webgl'||low()||await immersiveRendererPreferred());
  if(profile.phone&&!params.has('quality'))quality.value='low';
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  canvas=prepared.canvas;renderer=prepared.renderer;
  renderer.onDeviceLost=info=>onRenderFailure(new Error('Périphérique graphique perdu : '+(info?.message||info?.reason||'WebGPU')));
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onRenderFailure(new Error('Contexte WebGL perdu'));});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=false;
  bootStep='décor';status.textContent='Construction de la station Halles-Basses…';
  scene=new T.Scene();camera=new T.PerspectiveCamera(70,innerWidth/innerHeight,.06,400);scene.add(camera);enemyDestructionFX=createEnemyDestructionFX(T,scene,{camera,low:low()||profile.phone||profile.headset,maxDeaths:7});
  createWorld();
  bootStep='jouabilité';status.textContent='Armes, commandes et machines…';
  setupPlayer();resize();
  xr=createMissionXR({getWorld:()=>({T,scene,camera,renderer,game,weapon,soldier:playerRig?.model.root,obstacles:collisions,accent:characterId==='lylu'?'#80baff':'#ef91b4',
   createGun:()=>playerRig?.createGun({sleeve:false})||fallbackGun(),createHand:()=>playerRig?createGlove(playerRig.kit.gloves,{sleeve:false}):fallbackHand()}),
   getYaw:()=>yaw,setYaw:value=>{yaw=value;},onFrame:animation,isPaused:()=>paused||game.state!=='playing',onPause:pauseMission,
   onResume:()=>{unpauseMission();pauseMenu.hide(false);},onHome:()=>location.assign('./index.html'),onExit:()=>{snapCamera();resize();requestAnimationFrame(animation);},skillsInput:args=>skillMenu?.xrInput(args)});
  $('renderer').textContent=renderer.isWebGLRenderer?'WebGL':'WebGPU';
  bootStep='premier rendu';status.textContent='Premier rendu…';
  startMission();snapCamera();art.update(0,0,camera,game.player);
  if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
  bootStep='prêt';hud.hidden=false;started=true;requestAnimationFrame(animation);
  touchControls=createPinkWarsTouch(canvas,{onFire:down=>{if(down)audioReady();heldFire=down;if(down)firePressQueued=true;},onJump:()=>{jumpQueued=true;},onInteract:()=>interact(),
   onNext:()=>game.cycleWeapon(),onReload:()=>game.reload(),onCrouch:()=>{crouchQueued=true;},onView:()=>changeView(),onPause:()=>pauseMission(),onAim:down=>{if(down)audioReady();mouseAim=down;}});
  begin();pauseMenu.setVisible(true);void loadAuthenticSoldier();
 }catch(error){
  console.error('[Ligne 9] démarrage impossible ('+bootStep+')',error);
  status.textContent='Impossible de lancer ('+bootStep+') : '+(error?.message||error);startButton.textContent='RÉESSAYER →';startButton.disabled=false;
  if(params.get('renderer')!=='webgl'){const retry=new URL(location.href);retry.searchParams.set('renderer','webgl');status.textContent+=' · Mode compatible…';location.replace(retry.href);}
 }
}
function begin(){
 running=true;paused=false;shade.style.display='none';shade.classList.remove('ended','lost');document.body.classList.remove('pw-shaded');startButton.disabled=false;
 fireInput.reset();heldFire=mouseAim=jumpQueued=crouchQueued=firePressQueued=meleeQueued=chargeQueued=false;aimBlend=0;keys.clear();pinkControls.reset();touchControls?.reset();weaponFeel.reset();
 audioReady();
 if(!touchControls?.root)canvas.requestPointerLock?.().catch?.(()=>{});
}
startButton.addEventListener('click',()=>{
 audioReady();
 if(!started){startButton.disabled=true;boot();return;}
 if(shade.classList.contains('lost')){shade.classList.remove('lost');subtitles.length=0;subtitle=null;comms.clear();mission.restoreCheckpoint();lookFrom(L.STAGES[mission.stage].checkpoint);lastDevices='';begin();return;}
 if(completed()){startMission();}
 begin();
});
$('doc-close').addEventListener('click',()=>closeDocument());
quality.addEventListener('change',()=>{if(!started)return;const url=new URL(location.href);url.searchParams.set('quality',quality.value);location.assign(url.href);});
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(reading&&['Escape','KeyF','Space','Enter'].includes(e.code)){e.preventDefault();closeDocument();return;}
 if(e.code==='Escape'){e.preventDefault();if(paused)unpauseMission();else pauseMission();return;}
 if(!running)return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat)return;
 if(e.code==='KeyJ')jumpQueued=true;
 if(e.code==='KeyF')interact();
 if(e.code==='KeyE')game.cycleWeapon();
 if(e.code==='KeyR')game.reload();
 if(e.code==='KeyX')meleeQueued=true;
 if(e.code==='KeyB')chargeQueued=true;
 if(e.code==='KeyC')crouchQueued=true;
 if(e.code==='KeyV')changeView();
 if(e.code==='KeyL')toggleLamp();
 if(e.code==='Space')firePressQueued=true;
 if(/^Digit[1-8]$/.test(e.code))game.selectWeapon(Number(e.code.slice(-1))-1);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
const releaseAll=()=>{keys.clear();heldFire=false;mouseAim=false;firePressQueued=false;fireInput.reset();pinkControls.reset();touchControls?.reset();};
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
window.addEventListener('contextmenu',e=>{if(e.target===canvas)e.preventDefault();});
window.addEventListener('mousemove',e=>{
 if(!running||reading||document.pointerLockElement!==canvas)return;
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=e.movementX*.004*sensitivity;pitch=clamp(pitch-e.movementY*.004*sensitivity,-.85,.7);
});
let dragPointer=null,dragX=0,dragY=0;
window.addEventListener('pointerdown',e=>{
 if(!running||e.target!==canvas)return;
 if(reading){closeDocument();return;}
 if(e.button===2){mouseAim=true;e.preventDefault();return;}
 if(e.button===1&&e.pointerType==='mouse'){meleeQueued=true;e.preventDefault();return;}
 if(e.button!==0||e.pointerType!=='mouse')return;
 heldFire=true;firePressQueued=true;dragPointer=e.pointerId;dragX=e.clientX;dragY=e.clientY;
 if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch?.(()=>{});
});
window.addEventListener('pointermove',e=>{
 if(!running||e.pointerId!==dragPointer||document.pointerLockElement===canvas)return;
 const sensitivity=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);
 yaw-=(e.clientX-dragX)*.004*sensitivity;pitch=clamp(pitch-(e.clientY-dragY)*.004*sensitivity,-.85,.7);dragX=e.clientX;dragY=e.clientY;
});
for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{if(e.button===0||e.pointerId===dragPointer){heldFire=false;dragPointer=null;}if(e.button===2)mouseAim=false;});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)heldFire=false;});

window.__PINK_LIGNE9=Object.freeze({
 snapshot:()=>({level:L.LEVEL_ID,running,paused,completed:completed(),stage:mission?.stage,stageId:L.STAGES[mission?.stage??0]?.id,objective:L.STAGES[mission?.stage??0]?.label,characterId,time:game?.time,missionTime,
  room:game&&L.roomAt(game.player.x,game.player.z),health:game?.player.hp,shield:game?.player.shield,charges:game?.charges,
  position:game&&{x:+game.player.x.toFixed(2),z:+game.player.z.toFixed(2),elevation:+game.player.elevation.toFixed(2)},
  weapon:game?.weapon.id,ammo:game?.ammo[game.weaponIndex],enemies:game?.enemies.length,kills:game?.kills,opened:mission?.opened,drained:mission?.drained,done:mission?.done,reads:mission?.reads,
  hold:mission?.hold,escape:mission?.escape,pending:mission?.pending,groups:mission?.groups(),reading,vr:!!xr?.active,subtitlePlane:!!subtitlePlane?.visible,lamp:lampOn,subtitle:subtitle&&{who:subtitle.who,text:subtitle.text},queued:subtitles.length,
  backend:renderer?renderer.isWebGLRenderer?'webgl':'webgpu':null,rig:!!playerRig,art:art?.stats(),render:renderer?.info?.render}),
 // QA hooks: move the player, look, clear an encounter, fast-forward the mission clock.
 debug:params.has('debug')?{teleport:(x,z)=>{Object.assign(game.player,{x,z,elevation:traversal.height(x,z),grounded:true,verticalSpeed:0});snapCamera();},look:(y,p)=>{yaw=y;pitch=p;snapCamera();},clear:()=>{game.enemies.length=0;},
  interact:()=>{interact();return reading;},close:()=>closeDocument(),skip:seconds=>{game.time+=seconds;mission.update();},god:()=>{game.invulnerable=1e9;},
  portal:(x,z)=>art.openPortal(x,0,z,{charge:30}),emerge:(x,z)=>art.emerge(x,z),view:()=>changeView(),lamp:()=>toggleLamp(),vr:()=>xr.enter()}:null
});
if(params.get('autostart')==='1'){startButton.disabled=true;void boot();}
