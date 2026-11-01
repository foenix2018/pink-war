import {setScreenMusic,screenMusicSnapshot} from './menu-music.js';
import {walkingSurface} from './surface-steps.js';
import {assistedAim,firingView} from './aim-assist.js';
import {sightPoint} from './sight-line.js';
import {createBreachFrame,createBreachTexture} from './vesper-props.js';
// M01's book reference map, production combat, and locked Shadow Unit rigs.
// The V7 page supplies controls; it no longer substitutes its visit map for M01.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {WEAPONS,segmentBox,traceEnemyHit} from './game-logic.js';
import {CampaignLevel1,LEVEL1} from './campaign-level1.js';
import {createCampaignArt} from './campaign-art.js';
import {LEVEL1_MAP} from './level1-layout.js';
import {createM01Salvage} from './m01-salvage.js';
import {missionJournal,showMissionJournal} from './m01-narrative.js';
import {readM01Checkpoint,writeM01Checkpoint,restoreM01Checkpoint} from './m01-checkpoint.js';
import {createEnemyFactory} from './enemies.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createWeaponFeel,recoilPose} from './weapon-feel.js';
import {OPTICS,buildGun,createWeaponModels} from './weapons.js';
import {magnifiedFov,flatSightPose} from './optics.js';
import {loadRealLaserSample,loadCombatSamples,playLaserShot,playEnemyShot,playLaserImpact,playWeaponAction,setLaserAudioEnabled} from './laser-sound.js';
import {createSaberSound} from './saber-sound.js';
import {createAmbience} from './ambience.js';
import {createCampaignCombatEffects} from './campaign-combat-effects.js';
import {PHOTO_SURFACES} from './photographic-surfaces.js';
import {attachCampaignStory} from './story-chapters.js';
import {DesktopGamepadInput} from './desktop-input.js';
import {createFireBuffer} from './fire-input.js';
import {createVesperAtmosphere,replacementTriangles} from './vesper-art.js';
import {createCompanionSkills} from './companion-skills.js';
import {createCompanionMenu} from './companion-menu.js';
import {createAICompanion} from './ai-companions.js';
import {readPreferredView,savePreferredView,normalizeView} from './view-options.js';
import {thirdPersonPosition} from './third-person-camera.js';
import {createMissionXR,immersiveRendererPreferred} from './mission-xr.js';
import {createGlove} from './hands.js';
import {playFieldCue} from './m01-field-audio.js';
import {mountCombatHud} from './combat-hud.js';
import {createArmorFeedback,meleeKick,MELEE_POSE} from './armor-feedback.js';
import {installM01Extension,readExtensionCheckpoint,clearExtensionCheckpoint} from './m01-extension.js';
import {createM01ExtensionArt} from './m01-extension-art.js';
import {linesFor as extensionLines,ENDING as M01_ENDING} from './m01-extension-story.js';
import {INTERACTIONS as EXTENSION_INTERACTIONS} from './m01-extension-layout.js';
import {createSubtitles} from './story-subtitles.js';

export function buildVesperGeometry(source,{art=false}={}){
  const skip=replacementTriangles(source,art);
  const data=source.data(),count=data.vertices.length/12,uv=new Float32Array(count*2),groups=new Map();
  const geometry=new T.BufferGeometry(),colors=new Float32Array(count*3),positions=new Float32Array(count*3),normals=new Float32Array(count*3);
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  for(let i=0;i<count;i++){
    const k=i*12,m=Math.round(data.vertices[k+11]),x=data.vertices[k],y=data.vertices[k+1],z=data.vertices[k+2];
    for(let j=0;j<3;j++){positions[i*3+j]=data.vertices[k+j];normals[i*3+j]=data.vertices[k+3+j];}
    const photographed=[0,1,2,9,10,13].includes(m),mean=(data.vertices[k+6]+data.vertices[k+7]+data.vertices[k+8])/3;
    for(let j=0;j<3;j++){
      const raw=data.vertices[k+6+j],muted=art&&[5,6,7,12,15].includes(m);
      colors[i*3+j]=photographed?.68+(raw-mean)*.3:Math.pow(muted?mean*.75+raw*.25:raw,1.8);
    }
    if(m===30){uv[i*2]=data.vertices[k+9];uv[i*2+1]=1-data.vertices[k+10];}
    else{
      const scale=m===2?PHOTO_SURFACES.asphalt.scale:m===1?PHOTO_SURFACES.metal.scale:PHOTO_SURFACES.concrete.scale;
      const nx=Math.abs(data.vertices[k+3]),ny=Math.abs(data.vertices[k+4]),nz=Math.abs(data.vertices[k+5]);
      uv[i*2]=(ny>.65||nz>nx?x:z)*scale;uv[i*2+1]=(ny>.65?z:y)*scale;
    }
  }
  for(let i=0;i<data.indices.length;i+=3){
    const k=data.indices[i]*12;let m=Math.round(data.vertices[k+11]);
    if(skip(i,m))continue;
    if(m===1&&data.vertices[k+6]>data.vertices[k+8]*1.25&&data.vertices[k+7]<.32)m=17;
    if(!groups.has(m))groups.set(m,[]);groups.get(m).push(data.indices[i],data.indices[i+1],data.indices[i+2]);
  }
  const index=new Uint32Array([...groups.values()].reduce((n,g)=>n+g.length,0)),ids=[];let offset=0;
  for(const [id,values] of groups){index.set(values,offset);geometry.addGroup(offset,values.length,ids.length);offset+=values.length;ids.push(id);}
  geometry.setIndex(new T.BufferAttribute(index,1));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  if(art){
    // Removed skins must not keep hundreds of thousands of unused vertices in
    // mobile GPU buffers. Reindex retained vertices without changing positions.
    const remap=new Int32Array(count).fill(-1),used=[];
    for(let i=0;i<index.length;i++){const old=index[i];if(remap[old]===-1){remap[old]=used.length;used.push(old);}index[i]=remap[old];}
    for(const name of ['position','normal','color','uv']){
      const original=geometry.getAttribute(name),values=new Float32Array(used.length*original.itemSize);
      for(let i=0;i<used.length;i++)for(let k=0;k<original.itemSize;k++)values[i*original.itemSize+k]=original.array[used[i]*original.itemSize+k];
      geometry.setAttribute(name,new T.BufferAttribute(values,original.itemSize));
    }
  }
  geometry.computeBoundingSphere();
  return {geometry,ids,triangles:index.length/3};
}

export async function createVesperCombat({canvas,staticMesh,portalMesh,signAtlas,collide,stairs,decks,interactions,getState,setPlayer,notify,onCanvas,onFailure,onMenuChange=()=>{},onProgress=()=>{},onPauseRequest=()=>{},onResumeRequest=()=>{},onHeading=()=>{},onControl=()=>{}}){
  const params=new URLSearchParams(location.search),characterId=params.get('character')==='lylu'?'lylu':'ghju';
  document.documentElement.dataset.universe=characterId==='lylu'?'blue':'pink';
  const requestedQuality=getState().quality==='performance'?'low':getState().quality==='ultra'?'high':'auto';
  const profile=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},requestedQuality,params.get('renderer')==='webgl'||await immersiveRendererPreferred());
  onProgress(.22,'Initialisation du rendu');
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  if(prepared.initialFailure)console.warn('Vesper / initialisation WebGPU :',prepared.initialFailure);
  canvas=prepared.canvas;onCanvas(canvas);const renderer=prepared.renderer;
  renderer.onDeviceLost=info=>onFailure(new Error('Périphérique graphique perdu : '+(info?.message||info?.reason||'WebGPU')));
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onFailure(new Error('Contexte WebGL perdu'));});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.84;
  renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(64,innerWidth/innerHeight,.065,650);scene.add(camera);
  const torchTarget=new T.Object3D();torchTarget.position.set(0,0,-5);camera.add(torchTarget);
  const torch=new T.SpotLight(0xffefd4,22,22,.38,.72,2);torch.target=torchTarget;camera.add(torch);
  const atmosphere=createVesperAtmosphere(T,scene,renderer,profile,{extraLights:[torch]});
  onProgress(.36,'Construction de Vesper');
  const missionArt=createCampaignArt(T,scene,null,{quality:profile.phone||requestedQuality==='low'?'low':requestedQuality,photographic:true});
  missionArt.setVisible(true);
  const dressing=missionArt.dressing;
  const salvage=await createM01Salvage(T,missionArt.root,{performance:profile.phone||requestedQuality==='low'});
  onProgress(.58,'Objets et surfaces du secteur');
  const obstacles=missionArt.obstacles;obstacles.push(...salvage.colliders);
  const game=new CampaignLevel1(obstacles,Math.random,characterId);
  let combatHud=null;game.enableArmorShield();
  const checkpoint=readM01Checkpoint(characterId),resuming=params.get('resume')==='1';
  const coreRestored=resuming&&!!checkpoint&&restoreM01Checkpoint(game,checkpoint);
  // Extended chapter (3.69): Caserne 07 prologue and Archives végétales epilogue around the original quarter.
  const extArt=createM01ExtensionArt(T,scene,{quality:profile.phone||requestedQuality==='low'?'low':'normal',camera});
  const subtitles=createSubtitles({T,camera});
  const extension=installM01Extension(game,{setDoor:(id,state)=>extArt.setDoor(id,state),say:id=>subtitles.say(extensionLines(id,characterId)),cue:kind=>extensionCue(kind),notice:text=>notify(text,3800)});
  const extensionSave=resuming?readExtensionCheckpoint(characterId):null;
  if(extensionSave&&(!coreRestored||(extensionSave.savedAt||0)>(checkpoint.savedAt||0)))extension.restoreCheckpoint(extensionSave);
  else if(coreRestored)extension.resumeCore();
  else extension.start();
  extArt.build(game.obstacles);
  // One simulation owns stairs, lifts, navigation, collisions and ballistics.
  collide.splice(0,collide.length,...obstacles.map(o=>({x1:o.x-o.hx,x2:o.x+o.hx,y1:o.y||0,y2:(o.y||0)+o.height,z1:o.z-o.hz,z2:o.z+o.hz,label:o.surface})));
  stairs.splice(0,stairs.length,...LEVEL1_MAP.stairs.map(s=>({x1:s.x-s.halfWidth,x2:s.x+s.halfWidth,zStart:s.bottomZ,zEnd:s.topZ,height:s.height})));
  decks.splice(0,decks.length,...LEVEL1_MAP.decks.map(d=>({x1:d.x-d.hx,x2:d.x+d.hx,z1:d.z-d.hz,z2:d.z+d.hz,h:d.height})));
  interactions.length=0;
  const terrain={triangles:missionArt.stats().triangles};
  const art=missionArt,pbr={stats:missionArt.stats().pbr};
  const gate={mesh:new T.Group()};
  setPlayer?.(game.player);
  await missionArt.ready;
  onProgress(.76,'Surfaces et équipements chargés');
  const standard=(color,roughness=.6,metalness=.45)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const materials={wall:standard(0x697886),black:standard(0x101820),dark:standard(0x202936),iron:standard(0x7b8991,.3,.85),
    cyan:new T.MeshBasicMaterial({color:0x75dfff}),rose:new T.MeshBasicMaterial({color:0xff70b9}),blue:new T.MeshBasicMaterial({color:0x65aaff}),white:standard(0xb4c6cb)};
  const heroGlow=characterId==='lylu'?materials.blue:materials.rose;
  const starterMaterials={...materials,armor:standard(characterId==='lylu'?0x356fa6:0xb64472,.38,.72),armorLight:standard(0xb8c1ca,.35,.68),steel:materials.iron,rose:heroGlow,pale:materials.white,violet:materials.blue};
  const starterGloves={fabric:standard(0x222736,.9,.08),plate:starterMaterials.armor,trim:starterMaterials.armorLight,glow:heroGlow,accent:materials.cyan,metal:materials.iron};
  const enemyFactory=createEnemyFactory({monster:materials.wall,monsterFace:materials.black,cyan:materials.cyan,rose:materials.rose,violet:materials.blue,pale:materials.white});
  const enemyModels=new Map(),feel=createWeaponFeel(),effects=createCampaignCombatEffects(T,scene,characterId);
  // Armour layer (3.63): queued strikes and throws from the page controls, played on the next simulation step.
  let meleeQueued=false,chargeQueued=false;
  const armorTouch=(kind,value)=>{if(kind==='melee')api.melee();else if(kind==='charge')api.throwCharge();else if(kind==='reload')api.reload();else if(kind==='next')combatHud?.toggleArsenal();else if(kind==='weapon')api.select(Number(value));else if(kind==='companion')api.toggleSkills();else if(kind==='interact')api.interact();else onControl(kind,value);};
  const armorFx=createArmorFeedback({T,scene,camera,accent:characterId==='lylu'?0x80baff:0xef91b4,listener:()=>game.player,
    audio:()=>sound&&audio?.state==='running'?audio:null,haptic:kind=>xr?.active&&xr.haptic(kind)});
  const gamepadInput=new DesktopGamepadInput();
  const fireInput=createFireBuffer();
  let rig=null,gun=null,ready=false,pending=false,lastTime=0,held=false,ads=0,completed=false,lastStage=game.stage,journalOpen=false,checkpointPending=false;
  let xr=null;
  let view=readPreferredView(),rigPromise=null;
  const effectiveView=()=>xr?.active||!rig?'fps':view;
  const skills=createCompanionSkills({characterId,mission:1,mode:'campaign'});
  const companion=createAICompanion(T,scene,characterId);
  const skillMenu=createCompanionMenu({getStatus:()=>skills.snapshot(game),
    onUse:id=>{const used=skills.use(id,{game,...aim(),emitter:companion.root.position});if(used)companion.react({type:'companion-assist',name:skills.name});return used;},onChange(open){held=false;fireInput.reset();onMenuChange(open);if(open)document.exitPointerLock?.();}});
  const offerModels=new Map();
  // Actual RLH hands and production weapon geometry are already present while
  // the full canonical soldier rig decodes; there is no CSS weapon substitute.
  gun=buildGun({mats:starterMaterials,gloves:starterGloves,makeFlash:parent=>{
    const flash=new T.Mesh(new T.SphereGeometry(.06,8,6),heroGlow);flash.visible=false;parent.add(flash);return flash;
  }});camera.add(gun);
  let audio=null,ambience=null,saber=null;
  let sound=true;try{const settings=JSON.parse(localStorage.getItem('rosee-settings')||'{}');sound=settings.sound!==false;}catch{}
  let ambientEnabled=sound;
  function audioReady(){
    if(!sound)return;
    try{
      if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio=window.__PINKWAR_BOOT_AUDIO||new C();setLaserAudioEnabled(audio,sound);void loadRealLaserSample(audio);void loadCombatSamples(audio);ambience=createAmbience(audio);saber=createSaberSound(audio);}
      if(audio.state!=='running')void audio.resume().catch(()=>{});
    }catch(error){console.warn('Vesper audio',error);}
  }
  document.addEventListener('pointerdown',audioReady,{once:true,capture:true,passive:true});
  document.addEventListener('keydown',audioReady,{once:true,capture:true});
  const gateLight=new T.PointLight(0xff3e9e,0,24,2);scene.add(gateLight);
  const tacticalGate=new T.Group();tacticalGate.name='ORDRE / industrial reinforcement portal';tacticalGate.visible=false;scene.add(tacticalGate);
  const rim=new T.Mesh(new T.TorusGeometry(1.4,.16,8,36),materials.iron);tacticalGate.add(rim);
  createBreachFrame(T,tacticalGate,{radius:1.4,steel:materials.iron,dark:materials.black,energy:materials.cyan,low:profile.phone||requestedQuality==='low'});
  const membrane=new T.Mesh(new T.CircleGeometry(1.3,36),new T.MeshBasicMaterial({map:createBreachTexture(T),color:0xff478f,transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false,toneMapped:false}));tacticalGate.add(membrane);
  const portalMarker=document.createElement('div');portalMarker.className='pw-portal-marker';portalMarker.setAttribute('aria-label','Direction du portail ORDRE');portalMarker.hidden=true;
  portalMarker.style.cssText='position:fixed;top:max(58px,env(safe-area-inset-top));width:7px;height:7px;border-radius:50%;background:#ff72b4;box-shadow:0 0 10px #ff3388;pointer-events:none;z-index:4';document.body.append(portalMarker);
  const objectiveMarker=document.createElement('div');objectiveMarker.className='pw-objective-marker';objectiveMarker.setAttribute('aria-label','Direction de l’objectif');
  objectiveMarker.style.cssText='position:fixed;top:max(42px,env(safe-area-inset-top));width:5px;height:5px;border-radius:50%;background:#d8c6a0;opacity:.75;pointer-events:none;z-index:4';document.body.append(objectiveMarker);
  function objective(){
    const guide=game.guidance();
    return {...(guide||game.player),valid:!!guide,text:game.campaign.subtitle};
  }
  function contextAction(){
    const terminal=game.getInteraction();
    if(terminal)return {action:terminal.id,title:terminal.label};
    const offer=game.nearbyWeapon();
    return offer?{action:'weapon',title:'RÉCUPÉRER '+WEAPONS[offer.index].name}:null;
  }
  function syncOffers(){
    for(const offer of game.weaponOffers){
      if(!offerModels.has(offer.index)){
        const pedestal=new T.Group();pedestal.name='M01 / récupération '+WEAPONS[offer.index].name;
        const base=new T.Mesh(new T.CylinderGeometry(.50,.56,.14,16),materials.iron);pedestal.add(base);
        const model=createWeaponModels(starterMaterials)[offer.index];
        model.scale.setScalar(.66);model.position.y=.85;pedestal.add(model);scene.add(pedestal);offerModels.set(offer.index,pedestal);
      }
      const model=offerModels.get(offer.index);model.position.set(offer.x,offer.elevation+.08,offer.z);model.children[1].rotation.y=game.time*.32;
    }
    for(const [index,model] of offerModels)if(!game.weaponOffers.some(o=>o.index===index)){model.removeFromParent();offerModels.delete(index);}
  }
  const v=new T.Vector3(),forward=new T.Vector3(),origin=new T.Vector3(),end=new T.Vector3();
  function aim(){
    if(xr?.active)return xr.aim();
    camera.updateMatrixWorld(true);camera.getWorldDirection(forward);
    const target=sightPoint(T,camera.position,forward,{obstacles:game.obstacles,enemies:game.enemies});
    const heldGun=effectiveView()==='third'?rig?.model.gun:gun;
    const muzzle=heldGun?.userData.flashFor?.(game.nextDualHand)||heldGun?.userData.flash;if(muzzle){muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(origin);}else origin.copy(camera.position).addScaledVector(forward,.28);
    for(const o of obstacles){const hit=segmentBox(camera.position,origin,o);if(hit!==null){origin.lerpVectors(camera.position,origin,Math.max(0,hit-.02));break;}}
    const direction=target.sub(origin).normalize();
    return {origin,direction:ads>.3?direction:new T.Vector3().copy(assistedAim({camera:camera.position,forward,origin,direction,enemies:game.enemies,obstacles:game.obstacles,touch:!!navigator.maxTouchPoints}))};
  }
  function syncCamera(s,dt){
    if(xr?.active){xr.syncPose();return;}
    ads+=(Number(s.aiming)-ads)*(1-Math.exp(-dt*14));
    game.precisionAiming=ads>.55;
    camera.fov=magnifiedFov(64,1+((OPTICS[game.weapon.id]?.magnification||1)-1)*ads);if(!xr?.active)camera.fov=firingView(camera.fov,game.weapon.melee?0:Math.min(1,feel.state.flash*4),ads).fov;camera.updateProjectionMatrix();
    if(effectiveView()==='third'){
      const p=thirdPersonPosition(game.player,-s.yaw,s.pitch,obstacles,characterId==='lylu'?1.71:1.61);camera.position.set(p.x,p.y,p.z);
    }else camera.position.set(s.position.x,s.position.y-(s.crouching?.42:0),s.position.z);
    const kickPose=recoilPose(game.weapon.id,feel.state,{aiming:ads,dual:!!game.weapon.dual,magnification:OPTICS[game.weapon.id]?.magnification||1});
    camera.rotation.set(s.pitch+kickPose.cameraPitch,-s.yaw+kickPose.cameraYaw,0,'YXZ');
    if(gun){
      const pose=flatSightPose(OPTICS[game.weapon.id],ads);
      gun.position.set(pose.x+kickPose.x,pose.y+kickPose.y,pose.z+kickPose.z);gun.rotation.set(kickPose.pitch,kickPose.yaw+pose.yaw,kickPose.roll+pose.roll);
      const strike=game.weapon.melee?0:meleeKick(game);if(strike){gun.position.x+=MELEE_POSE.x*strike;gun.position.y+=MELEE_POSE.y*strike;gun.position.z+=MELEE_POSE.z*strike;gun.rotation.x+=MELEE_POSE.pitch*strike;}
      gun.visible=!s.free&&effectiveView()==='fps';gun.userData.setSight?.(ads>.55,camera);
      gun.userData.setCombatState?.({time:game.time,dualState:game.dual,ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,reloading:game.reloadRemaining>0,
        reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,charge:game.charge,kick:feel.state.kick,heat:feel.state.heat,bladeHeld:game.weapon.melee&&held});
      if(gun.userData.index!==game.weaponIndex)gun.userData.setVariant(game.weaponIndex);
      gun.userData.animateHands?.(Number(held),.5,game.reloadRemaining>0?.8:0,dt);
    }
    if(rig)rig.model.root.visible=!s.free&&effectiveView()==='third';
    camera.updateMatrixWorld(true);
  }
  function syncSoldier(dt,s){
    if(!rig||xr?.active)return;const model=rig.model,p=game.player;
    model.root.position.set(p.x,p.elevation||0,p.z);model.root.rotation.y=p.yaw;
    if(model.weapon!==game.weaponIndex)model.setWeapon(game.weaponIndex);
    model.gun.userData.setCombatState?.({time:game.time,dualState:game.dual,ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,reloading:game.reloadRemaining>0,charge:game.charge});
    const reload=game.reloadRemaining>0?Math.sin((1-game.reloadRemaining/game.weapon.reload)*Math.PI):0;
    model.animate(game.time,Math.hypot(game.playerVelocity.x,game.playerVelocity.z)>.1,feel.state.pitch,reload,Number(held),dt,{
      velocity:game.playerVelocity,ground:(x,z,y)=>game.footGroundHeight(x,z,y),airborne:!p.grounded,verticalSpeed:p.verticalSpeed,
      crouched:p.crouched,sprint:!!s.sprint,aim:!!s.aiming,firing:held
    });
  }
  function update(dt,s){
    setScreenMusic(ready&&!completed&&!journalOpen&&!skillMenu.isOpen&&game.state==='playing'?'gameplay':'paused',1);
    if(!ready||completed||journalOpen||skillMenu.isOpen||combatHud?.isArsenalOpen)return;
    syncCamera(s,dt);
    const p=game.player;
    if(!s.free){
      if(!xr?.active)p.crouched=s.crouching;
      game.step(dt,{...(s.input||{}),yaw:-s.yaw,moveYaw:xr?.active?xr.controls?.moveYaw:undefined});
      setPlayer?.(p);
      syncCamera(getState(),dt);
      if(meleeQueued||s.input?.melee){camera.getWorldDirection(v);game.melee({x:v.x,z:v.z});}
      if(chargeQueued||s.input?.charge){const view=xr?.active?renderer.xr.getCamera():camera;view.getWorldPosition(origin);view.getWorldDirection(v);
        game.throwCharge({x:origin.x+v.x*.45,y:origin.y-.18,z:origin.z+v.z*.45},v);}
    }
    meleeQueued=chargeQueued=false;
    const moving=Math.hypot(game.playerVelocity?.x||0,game.playerVelocity?.z||0)>.25;
    feel.update(dt);syncSoldier(dt,s);
    if(xr?.active)xr.update(dt,feel.state,feel.state.flash);
    const a=aim();
    const ammoBefore=game.ammo[game.weaponIndex],bladeBefore=game.bladeSlashAt;
    if(xr?.active&&game.weapon.dual){for(const hand of ['right','left']){const aim=xr.aim(hand);game.triggerHand(hand,hand==='right'?xr.controls?.fire:xr.controls?.leftFire,dt,aim.origin,aim.direction);}}
    else game.trigger(xr?.active?!!xr.controls?.fire:fireInput.requested(held,game.weapon,game.time)&&!s.free,dt,a.origin,a.direction);
    if(game.ammo[game.weaponIndex]<ammoBefore||game.bladeSlashAt!==bladeBefore)fireInput.consume();
    if(game.weapon.melee)game.updateBlade((xr?.active?xr.gun():gun)?.userData.getBladeSegment?.(),dt,s.aiming,camera.getWorldPosition(new T.Vector3()));
    const portal=game.activePortals[0];
    tacticalGate.visible=!!portal;portalMarker.hidden=!portal;
    if(portal){
      tacticalGate.position.set(portal.x,1.6,portal.z);tacticalGate.rotation.y=portal.yaw||0;gateLight.position.set(portal.x,2,portal.z);
      gateLight.intensity=game.time<game.nextSpawnAt?24+6*Math.sin(game.time*5):12;
      membrane.rotation.z=game.time*.35;
      const bearing=Math.atan2(portal.x-p.x,-(portal.z-p.z))-s.yaw;
      const angle=Math.atan2(Math.sin(bearing),Math.cos(bearing));portalMarker.style.left=(50+Math.max(-42,Math.min(42,angle*30)))+'%';
    }else gateLight.intensity=0;
    missionArt.update(game,game.time);syncOffers();
    if(lastStage!==game.stage){
      lastStage=game.stage;notify(game.campaign.title+' — '+game.campaign.subtitle,4200);
      checkpointPending=true;
    }
    if(checkpointPending&&(extension.extension?extension.writeCheckpoint():writeM01Checkpoint(game)))checkpointPending=false;
    if(!journalOpen){const later=extension.takeJournal();if(later)openJournal(later.entry,later.then);}
    subtitles.update(dt,{xr:!!xr?.active,hidden:journalOpen});
    extArt.setPower(extension.done.includes('groupe')||extension.prologueDone);extArt.syncPickups(game.pickups,game.time,characterId==='lylu'?0x6fb8ff:0xff6fb4);
    extArt.setAvailable(EXTENSION_INTERACTIONS.filter(i=>!i.log&&!i.core&&extension.available(i.id)).map(i=>i.id));
    const hold=extension.hold;holdBar.hidden=!hold;
    if(hold){holdBar.querySelector('.pw-hold-label').textContent=(hold.name==='groupe'?'MONTÉE EN CHARGE DU GROUPE':'COPIE DU REGISTRE')+' · '+Math.ceil(hold.remaining)+' s';holdBar.querySelector('.pw-hold-fill').style.width=(100*(1-hold.remaining/hold.total)).toFixed(1)+'%';}
    for(const e of game.enemies){
      if(!enemyModels.has(e.id)){const model=enemyFactory.create(e.elite,e.ranged,e.form);model.traverse(o=>{if(o.isMesh){o.castShadow=profile.shadows;o.receiveShadow=true;}});enemyModels.set(e.id,model);scene.add(model);}
      const model=enemyModels.get(e.id);model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;model.userData.animate?.(game.time,e.phase,true,e,game.time);
    }
    for(const [id,model] of enemyModels)if(!game.enemies.some(e=>e.id===id)){scene.remove(model);enemyModels.delete(id);}
    for(const event of game.drainEvents()){
      effects.event(event);armorFx.handle(event);
      if(event.type==='weapon')feel.reset();
      if(event.type==='squad-call')subtitles.say('ORDRE · UN SIGNAL DE RENFORT A ÉTÉ TRANSMIS');
      if(event.type==='companion-shot'&&sound&&audio)playLaserShot(audio,'r9',.35);
      if(sound&&audio&&['circuit-isolated','workshop-power'].includes(event.type))playFieldCue(audio,'isolate',{source:event,listener:p,yaw:-s.yaw});
      if(sound&&audio&&event.type==='portals'&&event.count>0)for(const site of event.sites)playFieldCue(audio,'breach',{source:site,listener:p,yaw:-s.yaw});
      if(event.type==='enemy-shot'&&sound&&audio)playEnemyShot(audio,{form:event.form,source:event,listener:p,yaw:-s.yaw,occluded:game.blocked(event,{x:p.x,y:p.elevation+1.5,z:p.z})});
      if(event.type==='shot'){feel.fire(event.weapon,event.power,(xr?.active?!!xr.controls?.aim:ads>.5)||p.crouched);xr?.haptic('shot',event.weapon,event.hand);if(sound&&audio)playLaserShot(audio,event.weapon,event.power);}
      if(event.type==='impact'&&sound&&audio)playLaserImpact(audio,{surface:event.surface,distance:Math.hypot(event.x-p.x,event.z-p.z),power:event.power});
      if(event.type==='reload'&&sound&&audio)playWeaponAction(audio,game.weapon.id,'reload-out');
      if(event.type==='reloaded'&&sound&&audio)playWeaponAction(audio,game.weapon.id,'reload-ready');
      if(event.type==='over'){
        held=false;fireInput.reset();ambience?.pause();document.exitPointerLock?.();
        if(xr?.active)onPauseRequest();const dialog=document.createElement('dialog');const saved=readExtensionCheckpoint(characterId)||readM01Checkpoint(characterId);
        dialog.innerHTML='<h2>SIGNAL PERDU</h2><p>ORDRE a repris le secteur.</p>'+(saved?'<button data-resume>REPRENDRE AU POINT DE CONTRÔLE</button> ':'')+'<button data-restart>REJOUER LA MISSION</button> <a href="./index.html">RETOUR AU MENU</a>';
        const go=resume=>{const url=new URL(location.href);if(resume)url.searchParams.set('resume','1');else url.searchParams.delete('resume');location.assign(url.href);};
        dialog.querySelector('[data-resume]')?.addEventListener('click',()=>go(true));dialog.querySelector('[data-restart]').onclick=()=>go(false);document.body.append(dialog);dialog.showModal();
      }
      if(event.type==='win')finishMission();
      if(event.type==='unlock')notify('ÉQUIPEMENT RÉCUPÉRÉ · '+event.name,3000);
      if(event.type==='pickup')notify(event.kind==='heal'?'TROUSSE AEGIS · SOINS':'CELLULE AEGIS · ARME RECHARGÉE · CHARGE +1',2200);
    }
    const target=objective(),bearing=Math.atan2(target.x-p.x,-(target.z-p.z))-s.yaw;
    const objectiveAngle=Math.atan2(Math.sin(bearing),Math.cos(bearing));
    objectiveMarker.style.left=(50+Math.max(-42,Math.min(42,objectiveAngle*30)))+'%';objectiveMarker.hidden=completed||s.free||!target.valid;
    const behind=Math.abs(objectiveAngle)>Math.PI/2,altitude=(target.y||0)-p.elevation;
    objectiveMarker.textContent=behind?(objectiveAngle<0?'‹':'›'):Math.abs(altitude)>.6?(altitude>0?'↑':'↓'):'';
    objectiveMarker.style.background=objectiveMarker.textContent?'transparent':'#d8c6a0';
    objectiveMarker.style.font='18px/7px system-ui';
    companion.update(dt,{game,camera:xr?.active?renderer.xr.getCamera(camera):camera,active:!s.free&&game.player.hp>0,tracked:!!xr?.active});
    effects.update(game,dt,camera);armorFx.update(game,dt);
    skills.update(dt,{game});skillMenu.refresh();
    gun?.userData.setFlash?.(game.state==='playing'&&!journalOpen&&(game.weapon.dual||feel.state.flash>0)&&!game.weapon.melee,game.time);
    const active=game.state==='playing';
    ambience?.update(dt,{active:active&&sound&&ambientEnabled,position:p,moving,grounded:s.grounded,elevation:p.elevation,crouched:s.crouching,yaw:-s.yaw,probes:game.enemies,surface:walkingSurface(game)});
    saber?.update({active,equipped:game.weapon.melee,extended:held,sound,speed:game.bladeSpeed,swing:game.bladePhase<.08});
    // Shared combat HUD (same panels as M02, the Arena and the Range); the legacy readouts stay hidden below.
    (combatHud ||= mountCombatHud({characterId,onAction:armorTouch})).update(game);
    combatHud.setObjective({label:'MISSION 01',detail:objective().text});combatHud.setContext(contextAction()?.title);
    const hp=document.getElementById('pwHealth'),ammo=document.getElementById('pwAmmo'),name=document.getElementById('pwWeapon');
    if(hp)hp.textContent=String(Math.ceil(p.hp));if(ammo)ammo.textContent=game.weapon.melee?'LAME':game.ammo[game.weaponIndex]+' / '+game.weapon.capacity;
    if(name)name.textContent=game.weapon.name+(game.reloadRemaining>0?' · RECHARGE':'');
  }
  function loadRig(){
    return rigPromise||=(async()=>{
      try{rig=await installPinkWarsSoldier(T,scene,characterId,materials);const previous=gun;gun=rig.createGun();camera.add(gun);gun.userData.setVariant(game.weaponIndex);previous?.removeFromParent();syncSoldier(.016,getState());syncCamera(getState(),0);}
      catch(error){console.error('Vesper / canonical rig',error);notify('ÉQUIPEMENT EN COURS DE CHARGEMENT · TIR DISPONIBLE',2500);}
    })();
  }
  function finishMission(){
    if(completed)return;completed=true;held=false;ambience?.pause();document.exitPointerLock?.();
    const dialog=document.createElement('dialog');dialog.id='end-dialog';
    const p=document.createElement('p');p.textContent=M01_ENDING.text[characterId];clearExtensionCheckpoint(characterId);
    dialog.innerHTML='<h2>LE DERNIER SIGNAL</h2><button id="retry-button">RETOUR AU MENU</button>';dialog.insertBefore(p,dialog.querySelector('#retry-button'));
    document.body.append(dialog);attachCampaignStory(dialog,{level:1,characterId});
    dialog.querySelector('#retry-button').onclick=()=>location.assign('./index.html');dialog.showModal();
  }
  function openJournal(entry,then){
    if(!entry)return;
    combatHud?.reset();journalOpen=true;held=false;fireInput.reset();game.state='paused';document.exitPointerLock?.();
    showMissionJournal(entry,{sound,onClose(){journalOpen=false;game.state='playing';if(then)subtitles.say(extensionLines(then,characterId));}});
    if(xr?.active)xr.showJournal(entry,()=>document.getElementById('m01-journal')?.close());
  }
  // Short synthesised cues for the extension beats (doors, valves, engine, holds, portals).
  function extensionCue(kind){
    if(!sound||!audio||audio.state!=='running')return;
    try{
      const now=audio.currentTime,out=audio.createGain();out.gain.value=.12;out.connect(audio.destination);
      const tone=(type,from,to,length,delay=0,gain=.9)=>{const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(from,now+delay);o.frequency.exponentialRampToValueAtTime(to,now+delay+length);
        g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(gain,now+delay+.02);g.gain.exponentialRampToValueAtTime(.0001,now+delay+length);o.connect(g);g.connect(out);o.start(now+delay);o.stop(now+delay+length+.05);};
      if(kind==='door'){tone('sawtooth',70,55,1.4,0,.5);tone('square',140,120,.2,0,.3);}
      else if(kind==='valve'){for(let k=0;k<5;k++)tone('square',220+k*20,200+k*20,.08,k*.16,.35);}
      else if(kind==='engine'){tone('sawtooth',30,62,2.6,0,.8);tone('square',45,90,2.4,.3,.35);}
      else if(kind==='hold'){tone('sine',110,220,1.8,0,.6);tone('sine',55,110,2.2,.1,.6);}
      else if(kind==='portal'){tone('sawtooth',90,420,2.6);tone('sine',180,840,2.8,.2);}
      else if(kind==='read'){tone('triangle',1200,900,.06,0,.25);tone('triangle',900,700,.08,.07,.2);}
      else if(kind==='stage'){tone('triangle',440,660,.25);tone('triangle',660,880,.3,.22);}
    }catch{}
  }
  const holdBar=document.createElement('div');holdBar.className='pw-hold';holdBar.hidden=true;
  holdBar.style.cssText='position:fixed;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(380px,calc(100vw - 120px));padding:7px 10px;background:rgba(9,14,22,.82);border:1px solid #d8c6a099;border-radius:9px;z-index:6;pointer-events:none;font:900 11px system-ui;letter-spacing:.12em;color:#eef1f6;text-align:center';
  holdBar.innerHTML='<div class="pw-hold-label"></div><div style="height:5px;margin-top:5px;background:#ffffff1f;border-radius:3px;overflow:hidden"><div class="pw-hold-fill" style="height:100%;background:#d8c6a0"></div></div>';document.body.append(holdBar);
  function onInteract(){
    if(completed||game.state!=='playing'||getState().free||journalOpen)return false;
    const terminal=game.getInteraction(),offer=game.nearbyWeapon();
    if(!terminal&&!offer)return false;
    const action=terminal?.id||'weapon';
    if(!game.collectWeapon())return false;
    if(terminal?.extension)extArt.markDone(action);
    const pendingJournal=extension.takeJournal();
    openJournal(pendingJournal?.entry||missionJournal(action,characterId),pendingJournal?.then);
    if(game.completed)finishMission();
    return true;
  }
  xr=createMissionXR({getWorld:()=>({T,scene,camera,renderer,game,weapon:gun,soldier:rig?.model.root,obstacles,accent:characterId==='lylu'?'#80baff':'#ef91b4',
    createGun:()=>rig?.createGun({sleeve:false})||buildGun({mats:starterMaterials,gloves:starterGloves,sleeve:false,makeFlash:parent=>{const f=new T.Mesh(new T.SphereGeometry(.06,8,6),heroGlow);parent.add(f);return f;}}),createHand:()=>createGlove(rig?.kit.gloves||starterGloves,{sleeve:false})}),
    getYaw:()=>-getState().yaw,setYaw:onHeading,isPaused:()=>!!getState().menuPaused||journalOpen||game.state!=='playing',
    onPause:onPauseRequest,onResume:onResumeRequest,onHome:()=>location.assign('./index.html'),onExit:()=>{},skillsInput:args=>skillMenu.xrInput(args),
    onFrame:(ms,frame)=>{const dt=Math.min(.045,Math.max(0,(ms-lastTime*1000)/1000||.016));const c=xr.input(frame,dt);const s=getState();if(c.interact)onInteract();if(!s.menuPaused&&!journalOpen&&!skillMenu.isOpen)update(dt,{...s,free:false,yaw:-xr.yaw,aiming:c.aim,input:c});else xr.update(dt,feel.state,feel.state.flash);xr.renderScope();lastTime=ms/1000;atmosphere.update(lastTime,camera,{day:s.day,shadows:s.shadows!==false,focus:game.player,entities:[...game.enemies,game.player],heightAt:e=>game.surfaceHeight(e.x,e.z,game.time,(e.elevation||0)+.3)});const eye=renderer.xr.getCamera().getWorldPosition(new T.Vector3());extArt.update(lastTime,dt,{position:eye,quaternion:camera.quaternion},game.player);extArt.adapt(atmosphere,eye,dt);try{renderer.render(scene,camera);}catch(error){onFailure(error);}}});
  // Validate a real terrain frame while the loading card is still displayed.
  // A published GPU API or a running simulation alone cannot prove rendering.
  syncCamera(getState(),0);atmosphere.update(0,camera,{day:getState().day,shadows:profile.shadows});extArt.update(0,0,camera,game.player);extArt.adapt(atmosphere,camera.position,1);
  renderer.setSize(innerWidth,innerHeight,false);
  onProgress(.90,'Préparation du premier rendu');
  try{
    if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
    if(renderer.waitForGPU){
      let timer;
      try{await Promise.race([renderer.waitForGPU(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Validation graphique interrompue')),8000);})]);}
      finally{clearTimeout(timer);}
    }
  }catch(error){onFailure(error);throw error;}
  onProgress(.98,'Rendu du secteur validé');
  const api={
    get view(){return effectiveView();},get viewReady(){return !!rig&&!xr?.active;},
    setView(next){if(xr?.active||!rig)return false;view=normalizeView(next);savePreferredView(view);syncCamera(getState(),0);return true;},
    get xrActive(){return xr.active;},enterVR(){return xr.enter();},exitVR(){return xr.exit();},
    kind:renderer.isWebGLRenderer?'WebGL 2 · M01':'WebGPU · M01',managedResolution:true,canonical:true,
    get paused(){return journalOpen||skillMenu.isOpen;},
    get interaction(){return contextAction();},
    get layout(){return LEVEL1_MAP;},
    restart(){location.assign(location.pathname+'?prologue=done&character='+characterId+'&v=3.74.0');},
    get checkpoint(){return checkpoint;},
    get objective(){return objective().text;},
    get playing(){return game.state==='playing'&&!completed;},
    get ambienceEnabled(){return ambientEnabled&&sound;},
    toggleAmbience(){ambientEnabled=!ambientEnabled;if(ambientEnabled)audioReady();return ambientEnabled&&sound;},
    start(){ready=true;skillMenu.setVisible(true);audioReady();void loadRig();},
    toggleSkills(){if(ready&&!journalOpen)skillMenu.setOpen(!skillMenu.isOpen);},
    fire(down){if(down&&!held){audioReady();fireInput.press(game.time);if(game.weapon.semiAuto)game.triggerHeld=false;}held=!!down;},
    reload(){audioReady();game.reload();},
    melee(){if(journalOpen||skillMenu.isOpen||game.state!=='playing')return;audioReady();meleeQueued=true;},
    throwCharge(){if(journalOpen||skillMenu.isOpen||game.state!=='playing')return;audioReady();chargeQueued=true;},
    cycle(delta=1){game.cycleWeapon(delta);},
    get arsenalOpen(){return !!combatHud?.isArsenalOpen;},
    toggleArsenal(){if(ready&&!journalOpen&&game.state==='playing')combatHud?.toggleArsenal();},
    pollArsenalGamepad(){return !!combatHud?.pollGamepad();},
    select(index){game.selectWeapon(index);},
    interact:onInteract,
    pause(){setScreenMusic('paused');combatHud?.reset();held=false;fireInput.reset();gamepadInput.reset();skillMenu.setOpen(false);ambience?.pause();saber?.update({active:false});},
    resume(){held=false;fireInput.reset();if(game.state==='playing'){audioReady();}},
    gamepad(devices){return gamepadInput.select(devices,{focused:!document.hidden});},
    resize(width,height){
      if(xr.active)return;
      const requested=getState().quality,quality=requested==='performance'?'low':requested==='ultra'?'high':'auto';
      const current=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},quality,renderer.isWebGLRenderer);
      camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(renderPixelRatio(current,devicePixelRatio,width,height));renderer.setSize(width,height,false);
    },
    update(dt){update(dt,getState());},
    draw(t){
      if(xr.active)return;
      if(pending)return;const s=getState(),frameDt=Math.min(.05,t-lastTime||.016);syncCamera(s,frameDt);lastTime=t;gate.mesh.rotation.z=t*.052;
      skillMenu.setVisible(ready&&!completed&&!journalOpen&&game.player.hp>0);
      torch.visible=s.flashlight!==false;
      const shadows=s.shadows!==false;
      atmosphere.update(t,camera,{shadows,day:s.day,focus:game.player,entities:[...game.enemies,game.player],heightAt:e=>game.surfaceHeight(e.x,e.z,game.time,(e.elevation||0)+.3)});
      extArt.update(t,frameDt,camera,game.player);extArt.adapt(atmosphere,camera.position,frameDt);
      try{const result=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);if(result?.then){pending=true;result.then(()=>pending=false).catch(error=>{pending=false;onFailure(error);});}}
      catch(error){onFailure(error);}
    },
    // QA hooks (?debug=1): move the player, clear machines, advance the mission clock.
    debug:params.has('debug')?{game,teleport(x,z){Object.assign(game.player,{x,z,elevation:game.surfaceHeight(x,z,game.time),grounded:true,verticalSpeed:0});if(game.state==='playing')game.step(1/60,{});setPlayer?.(game.player);},
      clear(){game.enemies.length=0;game.toSpawn=0;},skip(seconds){game.time+=seconds;},god(){game.invulnerable=1e9;},
      use(id){const it=EXTENSION_INTERACTIONS.find(i=>i.id===id);if(it){Object.assign(game.player,{x:it.x,z:it.z,elevation:0,grounded:true});if(game.state==='playing')game.step(1/60,{});setPlayer?.(game.player);}const done=onInteract();return done;},
      // Synchronous close for scripted QA (the dialog's close event can lag behind a slow software renderer).
      closeJournal(){const d=document.getElementById('m01-journal');if(d){d.close();d.remove();}if(journalOpen){journalOpen=false;game.state='playing';}}}:null,
    snapshot(){return {view:effectiveView(),playerVisible:rig?.model.root.visible||false,music:screenMusicSnapshot(),revision:'3.74.0',characterId,phase:game.stage,workshopRead:game.investigationRead,reinforcements:game.toSpawn,objective:objective().text,ready,time:game.time,held,pendingShot:fireInput.pending(game.time),state:game.state,cooldown:game.cooldown,health:game.player.hp,weaponIndex:game.weaponIndex,weapon:game.weapon.id,ammo:game.ammo[game.weaponIndex],
      capacity:game.weapon.capacity,ownedWeapons:[...game.ownedWeapons],offers:game.weaponOffers.map(o=>({...o})),campaign:game.campaign,journalOpen,
      enemies:game.enemies.length,hostileProjectiles:game.bullets.filter(b=>b.hostile).length,shots:game.bullets.filter(b=>!b.hostile).length,
      kills:game.kills,rig:!!rig,gun:!!gun,backend:renderer.isWebGLRenderer?'webgl':'webgpu',triangles:terrain.triangles,
      art:missionArt.stats(),dressing:dressing.stats,salvage:salvage.stats,shadowing:atmosphere.shadows.stats(),lighting:{exposure:renderer.toneMappingExposure,ambient:atmosphere.ambient.intensity,sun:atmosphere.sun.intensity},pbr:missionArt.stats().pbr,effects:effects.stats(),companion:companion.snapshot(),position:{...getState().position},
      skills:skills.snapshot(game),skillsMenuOpen:skillMenu.isOpen,
      extension:{stage:game.stage,active:extension.extension,prologueDone:extension.prologueDone,hold:extension.hold,opened:extension.opened,done:extension.done,reads:extension.reads,groups:extension.groups(),art:extArt.stats()},
      subtitle:subtitles.current,queued:subtitles.queued,
      armor:{shield:game.player.shield,shieldCapacity:game.shieldCapacity,shieldCharging:game.shieldCharging,charges:game.charges,thrown:game.thrownCharges.length,meleeAt:game.meleeAt},
      hostiles:game.enemies.map(e=>({id:e.id,x:e.x,y:e.elevation+e.aimHeight,z:e.z,hp:e.hp,awareness:e.awareness,tactic:e.combatPose,crouch:e.coverCrouch||0})),render:renderer.info.render};}

  };
  return api;
}
