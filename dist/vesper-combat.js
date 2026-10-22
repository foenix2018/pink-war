// Vesper V7's approved geometry + the production Pink Wars simulation and rigs.
// The map builder still owns every wall, door, stair and prop coordinate.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame,WEAPONS,segmentBox,traceEnemyHit} from './game-logic.js';
import {enemyDurability} from './enemy-combat.js';
import {createEnemyFactory} from './enemies.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';
import {createWeaponFeel} from './weapon-feel.js';
import {OPTICS,buildGun} from './weapons.js';
import {magnifiedFov,flatSightPose} from './optics.js';
import {playLaserShot,playLaserImpact,playWeaponAction,setLaserAudioEnabled} from './laser-sound.js';
import {createSaberSound} from './saber-sound.js';
import {createAmbience} from './ambience.js';
import {createMusicBed} from './music.js';
import {createCampaignCombatEffects} from './campaign-combat-effects.js';
import {createAICompanion} from './ai-companions.js';
import {installPhotographicSurfaces,PHOTO_SURFACES} from './photographic-surfaces.js';
import {attachCampaignStory} from './story-chapters.js';
import {DesktopGamepadInput} from './desktop-input.js';
import {createFireBuffer} from './fire-input.js';

export function buildVesperGeometry(source){
  const data=source.data(),count=data.vertices.length/12,uv=new Float32Array(count*2),groups=new Map();
  const geometry=new T.BufferGeometry(),colors=new Float32Array(count*3),positions=new Float32Array(count*3),normals=new Float32Array(count*3);
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  for(let i=0;i<count;i++){
    const k=i*12,m=Math.round(data.vertices[k+11]),x=data.vertices[k],y=data.vertices[k+1],z=data.vertices[k+2];
    for(let j=0;j<3;j++){positions[i*3+j]=data.vertices[k+j];normals[i*3+j]=data.vertices[k+3+j];}
    const photographed=[0,1,2,9,10,13].includes(m),mean=(data.vertices[k+6]+data.vertices[k+7]+data.vertices[k+8])/3;
    for(let j=0;j<3;j++)colors[i*3+j]=photographed?.82+(data.vertices[k+6+j]-mean)*.65:data.vertices[k+6+j];
    if(m===30){uv[i*2]=data.vertices[k+9];uv[i*2+1]=1-data.vertices[k+10];}
    else{
      const scale=m===2?PHOTO_SURFACES.asphalt.scale:m===1?PHOTO_SURFACES.metal.scale:PHOTO_SURFACES.concrete.scale;
      const nx=Math.abs(data.vertices[k+3]),ny=Math.abs(data.vertices[k+4]),nz=Math.abs(data.vertices[k+5]);
      uv[i*2]=(ny>.65||nz>nx?x:z)*scale;uv[i*2+1]=(ny>.65?z:y)*scale;
    }
  }
  for(let i=0;i<data.indices.length;i+=3){
    const k=data.indices[i]*12;let m=Math.round(data.vertices[k+11]);
    if(m===1&&data.vertices[k+6]>data.vertices[k+8]*1.25&&data.vertices[k+7]<.32)m=13;
    if(!groups.has(m))groups.set(m,[]);groups.get(m).push(data.indices[i],data.indices[i+1],data.indices[i+2]);
  }
  const index=new Uint32Array(data.indices.length),ids=[];let offset=0;
  for(const [id,values] of groups){index.set(values,offset);geometry.addGroup(offset,values.length,ids.length);offset+=values.length;ids.push(id);}
  geometry.setIndex(new T.BufferAttribute(index,1));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingSphere();
  return {geometry,ids,triangles:index.length/3};
}

export async function createVesperCombat({canvas,staticMesh,portalMesh,signAtlas,collide,stairs,decks,interactions,getState,notify,onCanvas,onFailure}){
  const params=new URLSearchParams(location.search),characterId=params.get('character')==='lylu'?'lylu':'ghju';
  const requestedQuality=getState().quality==='performance'?'low':getState().quality==='ultra'?'high':'auto';
  const profile=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},requestedQuality,params.get('renderer')==='webgl');
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  if(prepared.initialFailure)console.warn('Vesper / initialisation WebGPU :',prepared.initialFailure);
  canvas=prepared.canvas;onCanvas(canvas);const renderer=prepared.renderer;
  renderer.onDeviceLost=info=>onFailure(new Error('Périphérique graphique perdu : '+(info?.message||info?.reason||'WebGPU')));
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onFailure(new Error('Contexte WebGL perdu'));});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
  renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const scene=new T.Scene();scene.background=new T.Color(0x152237);scene.fog=new T.FogExp2(0x152237,.0036);
  const camera=new T.PerspectiveCamera(64,innerWidth/innerHeight,.065,650);scene.add(camera);
  const torchTarget=new T.Object3D();torchTarget.position.set(0,0,-5);camera.add(torchTarget);
  const torch=new T.SpotLight(0xc8e8ff,65,27,.42,.6,1.7);torch.target=torchTarget;camera.add(torch);
  const hemi=new T.HemisphereLight(0xabbddc,0x22272b,2.4);scene.add(hemi);
  const sun=new T.DirectionalLight(0xd2def3,2.25);sun.position.set(65,125,75);scene.add(sun);
  sun.castShadow=profile.shadows;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.06;
  Object.assign(sun.shadow.camera,{left:-78,right:78,top:105,bottom:-105,near:1,far:290});sun.shadow.bias=-.0003;
  // A small local reflection environment makes brushed metal and the real gun
  // materials respond to the sky without screen-space reflections or a CDN.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
  const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,256);
  skyGradient.addColorStop(0,'#18283f');skyGradient.addColorStop(.48,'#aac3db');skyGradient.addColorStop(.56,'#5c6978');skyGradient.addColorStop(1,'#1d232c');
  skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256);skyContext.fillStyle='#f3e1ca';skyContext.fillRect(62,95,70,5);
  const environment=new T.CanvasTexture(skyCanvas);environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;scene.environment=requestedQuality==='low'?null:environment;scene.environmentIntensity=.8;
  const signTexture=new T.CanvasTexture(signAtlas);signTexture.colorSpace=T.SRGBColorSpace;
  const photoTargets={concrete:[],asphalt:[],metal:[],rust:[]};
  function meshFor(source,name){
    const {geometry,ids,triangles}=buildVesperGeometry(source);
    const mats=ids.map(id=>{
      if(id===30)return new T.MeshBasicMaterial({map:signTexture,color:0xffffff,side:T.DoubleSide,toneMapped:false});
      const luminous=[5,6,7,11,12].includes(id);
      const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,
        roughness:id===1?.4:id===9?.24:.83,metalness:id===1?.7:id===9?.15:.02,
        emissive:id===5||id===11?0xff3598:id===6?0x48bfff:id===7?0xffad52:id===12?0xff3a2d:0x000000,emissiveIntensity:luminous?1.25:0});
      material.shadowSide=T.FrontSide;
      if(!luminous&&![3,4,8].includes(id))photoTargets[id===2||id===9?'asphalt':id===1?'metal':id===13?'rust':'concrete'].push(material);
      return material;
    });
    const mesh=new T.Mesh(geometry,mats);mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=!profile.phone;scene.add(mesh);
    return {mesh,triangles};
  }
  const terrain=meshFor(staticMesh,'M01 / Vesper V7 reference geometry');
  const gate=meshFor(portalMesh,'M01 / industrial Fracture');gate.mesh.position.set(0,11,-111);
  const pbr=installPhotographicSurfaces(T,photoTargets,{performance:profile.phone||requestedQuality==='low'});
  for(const [x,y,z,color,power,range] of [[-19,4,12,0x66d5ff,95,16],[23,5,16,0xffaa5e,100,20],[-20,8,-28,0x64baff,110,24],[0,10,-104,0xff399a,220,38]]){
    const light=new T.PointLight(color,power,range,2);light.position.set(x,y,z);scene.add(light);
  }
  const obstacles=collide.map(c=>({x:(c.x1+c.x2)/2,z:(c.z1+c.z2)/2,y:Math.max(0,c.y1),hx:(c.x2-c.x1)/2,hz:(c.z2-c.z1)/2,
    height:c.y2-Math.max(0,c.y1),surface:/métal|metal|atelier|pont/.test(c.label||'')?'metal':'concrete'})).filter(c=>c.height>.05);
  const traversal={routes:[],lifts:[],surfaces(x,z){
    const list=[];
    for(const d of decks)if(x>=d.x1&&x<=d.x2&&z>=d.z1&&z<=d.z2)list.push({id:'v7-deck',height:d.h});
    for(const s of stairs)if(x>=s.x1&&x<=s.x2&&z<=s.zStart&&z>=s.zEnd)list.push({id:'v7-stair',height:s.height*Math.max(0,Math.min(1,(s.zStart-z)/(s.zStart-s.zEnd)))});
    return list;
  },height(x,z,t,max=Infinity){return Math.max(0,...this.surfaces(x,z).filter(s=>s.height<=max+.01).map(s=>s.height));},routeForSurface(){return null;}};
  const game=new ArenaGame(obstacles,Math.random,traversal);game.reset();game.wave=2;game.nextWave=Infinity;game.toSpawn=0;game.spawnTimer=Infinity;
  game.ownedWeapons=new Set([0,1,2,3,4,5]);game.ammo=WEAPONS.map(w=>w.capacity);
  const standard=(color,roughness=.6,metalness=.45)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const materials={wall:standard(0x697886),black:standard(0x101820),dark:standard(0x202936),iron:standard(0x7b8991,.3,.85),
    cyan:new T.MeshBasicMaterial({color:0x75dfff}),rose:new T.MeshBasicMaterial({color:0xff70b9}),blue:new T.MeshBasicMaterial({color:0x65aaff}),white:standard(0xb4c6cb)};
  const heroGlow=characterId==='lylu'?materials.blue:materials.rose;
  const starterMaterials={...materials,armor:standard(characterId==='lylu'?0x356fa6:0xb64472,.38,.72),armorLight:standard(0xb8c1ca,.35,.68),steel:materials.iron,rose:heroGlow,pale:materials.white,violet:materials.blue};
  const starterGloves={fabric:standard(0x222736,.9,.08),plate:starterMaterials.armor,trim:starterMaterials.armorLight,glow:heroGlow,accent:materials.cyan,metal:materials.iron};
  const enemyFactory=createEnemyFactory({monster:materials.wall,monsterFace:materials.black,cyan:materials.cyan,rose:materials.rose,violet:materials.blue,pale:materials.white});
  const enemyModels=new Map(),feel=createWeaponFeel(),effects=createCampaignCombatEffects(T,scene,characterId);
  const gamepadInput=new DesktopGamepadInput();
  const fireInput=createFireBuffer();
  const companion=createAICompanion(T,scene,characterId);companion.root.visible=false;
  let rig=null,gun=null,ready=false,pending=false,lastTime=0,lastPosition=null,held=false,ads=0,phase=0,portalTimer=-1,spawnQueue=[],lastSpawn=0,completed=false,portalSite={x:0,z:32};
  // Actual RLH hands and production weapon geometry are already present while
  // the full canonical soldier rig decodes; there is no CSS weapon substitute.
  gun=buildGun({mats:starterMaterials,gloves:starterGloves,makeFlash:parent=>{
    const flash=new T.Mesh(new T.SphereGeometry(.06,8,6),heroGlow);flash.visible=false;parent.add(flash);return flash;
  }});camera.add(gun);
  let audio=null,ambience=null,saber=null;const music=createMusicBed();
  let sound=true,musicEnabled=true;try{const settings=JSON.parse(localStorage.getItem('rosee-settings')||'{}');sound=settings.sound!==false;musicEnabled=settings.music!==false;}catch{}
  let ambientEnabled=sound;
  music.setEnabled(musicEnabled);
  function audioReady(){
    if(!sound&&!musicEnabled)return;
    try{
      if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio=new C();setLaserAudioEnabled(audio,true);ambience=createAmbience(audio);saber=createSaberSound(audio);music.setContext(audio);}
      if(audio.state!=='running')void audio.resume().catch(()=>{});
    }catch(error){console.warn('Vesper audio',error);}
  }
  function spawn(x,z,form='synth',elite=false){
    const clear=(a,b)=>!obstacles.some(o=>!o.walkableSurface&&o.y<2&&o.y+o.height>.3&&Math.abs(a-o.x)<o.hx+.85&&Math.abs(b-o.z)<o.hz+.85);
    if(!clear(x,z))return false;
    game.activePortals=[{id:800,x,z,yaw:0}];game.toSpawn=1;game.spawnEnemy();game.toSpawn=0;game.activePortals=[];
    const e=game.enemies.at(-1);if(!e)return false;
    Object.assign(e,{x,z,homeX:x,homeZ:z,form,ranged:true,elite,hp:enemyDurability(2,form,elite),radius:form==='probe'?.44:.8,
      aimHeight:form==='probe'?.3:1.4,hitRadius:form==='probe'?.44:1.05,elevation:form==='probe'?2.1:0,awareness:'patrol',lastKnownX:x,lastKnownZ:z});
    return true;
  }
  function patrol(){for(const p of [[-1,39,'synth'],[6,27,'stalker'],[-3,2,'scuttler'],[4,-13,'probe'],[3,-42,'seer'],[-4,-59,'bulwark']])spawn(...p);}
  const gateLight=new T.PointLight(0xff3e9e,0,24,2);scene.add(gateLight);
  const tacticalGate=new T.Group();tacticalGate.name='ORDRE / industrial reinforcement portal';tacticalGate.visible=false;scene.add(tacticalGate);
  const rim=new T.Mesh(new T.TorusGeometry(1.4,.16,8,36),materials.iron);tacticalGate.add(rim);
  const membrane=new T.Mesh(new T.CircleGeometry(1.3,36),new T.MeshBasicMaterial({color:0xff478f,transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false,toneMapped:false}));tacticalGate.add(membrane);
  const portalMarker=document.createElement('div');portalMarker.setAttribute('aria-label','Direction du portail ORDRE');portalMarker.hidden=true;
  portalMarker.style.cssText='position:fixed;top:max(58px,env(safe-area-inset-top));width:7px;height:7px;border-radius:50%;background:#ff72b4;box-shadow:0 0 10px #ff3388;pointer-events:none;z-index:4';document.body.append(portalMarker);
  function reinforcements(){
    portalTimer=game.time+3.5;lastSpawn=portalTimer;spawnQueue=['probe','synth','stalker','scuttler','seer','brute'];
    portalSite=phase>=3?{x:0,z:-72}:{x:0,z:32};tacticalGate.position.set(portalSite.x,1.6,portalSite.z);tacticalGate.visible=true;
    gateLight.position.set(portalSite.x,3,portalSite.z);gateLight.intensity=130;
    notify('PORTE ORDRE À DISTANCE — RENFORTS EN APPROCHE',2600);
  }
  const v=new T.Vector3(),forward=new T.Vector3(),origin=new T.Vector3(),end=new T.Vector3();
  function aim(){
    camera.updateMatrixWorld(true);camera.getWorldDirection(forward);end.copy(camera.position).addScaledVector(forward,160);
    let nearest=1;
    for(const o of obstacles){const hit=segmentBox(camera.position,end,o);if(hit!==null&&hit<nearest)nearest=hit;}
    for(const e of game.enemies){const hit=traceEnemyHit(camera.position,end,e);if(hit&&hit.t<nearest)nearest=hit.t;}
    const target=end.clone().lerp(camera.position,1-nearest);
    const muzzle=gun?.userData.flash;if(muzzle){muzzle.updateWorldMatrix(true,false);muzzle.getWorldPosition(origin);}else origin.copy(camera.position).addScaledVector(forward,.28);
    for(const o of obstacles){const hit=segmentBox(camera.position,origin,o);if(hit!==null){origin.lerpVectors(camera.position,origin,Math.max(0,hit-.02));break;}}
    return {origin,direction:target.sub(origin).normalize()};
  }
  function syncCamera(s,dt){
    ads+=(Number(s.aiming)-ads)*(1-Math.exp(-dt*14));
    camera.fov=magnifiedFov(64,1+((OPTICS[game.weapon.id]?.magnification||1)-1)*ads);camera.updateProjectionMatrix();
    camera.position.set(s.position.x,s.position.y-(s.crouching?.42:0),s.position.z);
    camera.rotation.set(s.pitch+feel.state.pitch*.18,-s.yaw+feel.state.yaw*.07,0,'YXZ');
    if(gun){
      const pose=flatSightPose(OPTICS[game.weapon.id],ads);
      gun.position.set(pose.x,pose.y-feel.state.kick*.18,pose.z+feel.state.kick);gun.rotation.set(feel.state.pitch,feel.state.yaw,0);
      gun.visible=!s.free;gun.userData.setSight?.(ads>.55,camera);
      gun.userData.setCombatState?.({time:game.time,ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,reloading:game.reloadRemaining>0,
        reloadProgress:game.weapon.reload?1-game.reloadRemaining/game.weapon.reload:0,charge:game.charge,kick:feel.state.kick,heat:feel.state.heat,bladeHeld:game.weapon.melee&&held});
      if(gun.userData.index!==game.weaponIndex)gun.userData.setVariant(game.weaponIndex);
      gun.userData.animateHands?.(Number(held),.5,game.reloadRemaining>0?.8:0,dt);
    }
    camera.updateMatrixWorld(true);
  }
  function update(dt,s){
    if(!ready||completed)return;
    syncCamera(s,dt);
    const p=game.player,foot={x:s.position.x,z:s.position.z,elevation:s.position.y-1.73};
    Object.assign(p,foot,{yaw:-s.yaw,crouched:s.crouching,grounded:s.grounded});
    game.nextWave=Infinity;game.toSpawn=0;game.step(dt,{yaw:-s.yaw});Object.assign(p,foot);
    const moving=!!lastPosition&&Math.hypot(p.x-lastPosition.x,p.z-lastPosition.z)>.025;
    if(moving&&game.time-(lastPosition.noiseAt||0)>.45){game.emitNoise(s.sprint?'sprint':s.crouching?'crouch':'step',s.sprint?28:s.crouching?2:12);lastPosition.noiseAt=game.time;}
    lastPosition={...foot,noiseAt:lastPosition?.noiseAt||0};
    feel.update(dt);const a=aim();
    const ammoBefore=game.ammo[game.weaponIndex],bladeBefore=game.bladeSlashAt;
    game.trigger(fireInput.requested(held,game.weapon,game.time)&&!s.free,dt,a.origin,a.direction);
    if(game.ammo[game.weaponIndex]<ammoBefore||game.bladeSlashAt!==bladeBefore)fireInput.consume();
    if(game.weapon.melee)game.updateBlade(gun?.userData.getBladeSegment?.(),dt,s.aiming,camera.position);
    if(spawnQueue.length&&game.time>=lastSpawn&&game.enemies.length<8){
      const form=spawnQueue[0];
      for(const [dx,dz] of [[0,0],[-1.8,-1],[1.8,1],[0,-3]])if(spawn(portalSite.x+dx,portalSite.z+dz,form)){
        const foe=game.enemies.at(-1);foe.awareness='search';foe.alertedUntil=game.time+12;
        foe.lastKnownX=game.player.x;foe.lastKnownZ=game.player.z;spawnQueue.shift();break;
      }
      lastSpawn=game.time+.9;
    }
    gateLight.intensity=portalTimer>game.time?110+35*Math.sin(game.time*5):spawnQueue.length?45:0;
    tacticalGate.visible=gateLight.intensity>0;membrane.rotation.z=game.time*.35;portalMarker.hidden=!tacticalGate.visible;
    if(tacticalGate.visible){
      const bearing=Math.atan2(portalSite.x-p.x,-(portalSite.z-p.z))-s.yaw;
      const angle=Math.atan2(Math.sin(bearing),Math.cos(bearing));portalMarker.style.left=(50+Math.max(-42,Math.min(42,angle*30)))+'%';
    }
    for(const e of game.enemies){
      if(!enemyModels.has(e.id)){const model=enemyFactory.create(e.elite,e.ranged,e.form);enemyModels.set(e.id,model);scene.add(model);}
      const model=enemyModels.get(e.id);model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw||0;model.userData.animate?.(game.time,e.phase,true,e,game.time);
    }
    for(const [id,model] of enemyModels)if(!game.enemies.some(e=>e.id===id)){scene.remove(model);enemyModels.delete(id);}
    companion.update(dt,{game,camera,active:phase>=2&&!s.free});
    for(const event of game.drainEvents()){
      effects.event(event);
      if(event.type==='shot'){feel.fire(event.weapon,event.power,ads>.5);if(sound&&audio)playLaserShot(audio,event.weapon,event.power);}
      if(event.type==='impact'&&sound&&audio)playLaserImpact(audio,{surface:event.surface,distance:Math.hypot(event.x-p.x,event.z-p.z),power:event.power});
      if(event.type==='reload'&&sound&&audio)playWeaponAction(audio,game.weapon.id,'reload-out');
      if(event.type==='reloaded'&&sound&&audio)playWeaponAction(audio,game.weapon.id,'reload-ready');
      if(event.type==='over'){
        held=false;fireInput.reset();music.pause();ambience?.pause();document.exitPointerLock?.();
        const dialog=document.createElement('dialog');dialog.innerHTML='<h2>SIGNAL PERDU</h2><p>ORDRE a repris le secteur.</p><button>REJOUER LA MISSION</button> <a href="./index.html">RETOUR AU MENU</a>';
        dialog.querySelector('button').onclick=()=>location.reload();document.body.append(dialog);dialog.showModal();
      }
      if(event.type==='companion-assist')notify(companion.name+' · '+(event.kind==='heal'?'SOIN LOCAL':event.kind==='shield'?'INTERCEPTION':'APPUI TACTIQUE'),1000);
    }
    effects.update(game,dt,camera);
    if(gun?.userData.flash)gun.userData.flash.visible=feel.state.kick>.025&&!game.weapon.melee;
    const active=game.state==='playing';
    ambience?.update(dt,{active:active&&sound&&ambientEnabled,position:p,moving,grounded:s.grounded,elevation:p.elevation,crouched:s.crouching,yaw:-s.yaw,probes:game.enemies});
    music.update(dt,{active,threat:game.enemies.some(e=>e.awareness==='engaged')?.7:.05});
    saber?.update({active,equipped:game.weapon.melee,extended:held,sound,speed:game.bladeSpeed,swing:game.bladePhase<.08});
    const hp=document.getElementById('pwHealth'),ammo=document.getElementById('pwAmmo'),name=document.getElementById('pwWeapon');
    if(hp)hp.textContent=String(Math.ceil(p.hp));if(ammo)ammo.textContent=game.weapon.melee?'LAME':game.ammo[game.weaponIndex]+' / '+game.weapon.capacity;
    if(name)name.textContent=game.weapon.name+(game.reloadRemaining>0?' · RECHARGE':'');
  }
  async function loadRig(){
    try{rig=await installPinkWarsSoldier(T,scene,characterId,materials);const previous=gun;gun=rig.createGun();camera.add(gun);gun.userData.setVariant(game.weaponIndex);previous?.removeFromParent();}
    catch(error){console.error('Vesper / canonical rig',error);notify('ÉQUIPEMENT EN COURS DE CHARGEMENT · TIR DISPONIBLE',2500);}
  }
  function onInteract(action){
    if(completed||game.state!=='playing')return false;
    if(action==='power'&&phase===0){phase=1;reinforcements();return true;}
    if(action==='archive'){
      if(phase<1){notify('RÉTABLIR LE COURANT DE L’ANNEXE');return false;}
      game.invulnerable=Math.max(game.invulnerable,5);
      for(const e of game.enemies)if(Math.hypot(e.x-game.player.x,e.z-game.player.z)<25)e.stunnedUntil=game.time+5;
      phase=Math.max(phase,2);notify(companion.name.toUpperCase()+' · LIAISON LOCALE INDÉPENDANTE D’ORDRE',2600);return true;
    }
    if(action==='beacon'){
      if(phase<2){notify('CONSULTER D’ABORD L’ARCHIVE HUMAINE');return false;}
      phase=3;reinforcements();return true;
    }
    if(action==='archives'){
      if(phase<3){notify('NEUTRALISER LA BALISE ORDRE AVANT D’UTILISER LE RELAIS');return false;}
      if(game.enemies.some(e=>e.awareness==='engaged'&&Math.hypot(e.x-game.player.x,e.z-game.player.z)<16)){notify('SÉCURISER LES ABORDS DU RELAIS');return false;}
      phase=4;completed=true;held=false;music.pause();ambience?.pause();document.exitPointerLock?.();
      const dialog=document.createElement('dialog');dialog.id='end-dialog';dialog.innerHTML='<h2>LE DERNIER SIGNAL</h2><p>Une trace humaine. Une nouvelle destination.</p><button id="retry-button">RETOUR AU MENU</button>';
      document.body.append(dialog);attachCampaignStory(dialog,{level:1,characterId});dialog.querySelector('#retry-button').onclick=()=>location.assign('./index.html');dialog.showModal();
    }
    return true;
  }
  // Validate a real terrain frame while the loading card is still displayed.
  // A published GPU API or a running simulation alone cannot prove rendering.
  syncCamera(getState(),0);
  renderer.setSize(innerWidth,innerHeight,false);
  try{
    if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
    if(renderer.waitForGPU){
      let timer;
      try{await Promise.race([renderer.waitForGPU(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Validation graphique interrompue')),8000);})]);}
      finally{clearTimeout(timer);}
    }
  }catch(error){onFailure(error);throw error;}
  return {
    kind:renderer.isWebGLRenderer?'WebGL 2 · COMBAT V8':'WebGPU · COMBAT V8',managedResolution:true,
    get playing(){return game.state==='playing'&&!completed;},
    get ambienceEnabled(){return ambientEnabled&&sound;},
    toggleAmbience(){ambientEnabled=!ambientEnabled;if(ambientEnabled)audioReady();return ambientEnabled&&sound;},
    start(){ready=true;audioReady();music.start(audio);patrol();void loadRig();},
    fire(down){if(down&&!held){audioReady();fireInput.press(game.time);if(game.weapon.semiAuto)game.triggerHeld=false;}held=!!down;},
    reload(){audioReady();game.reload();},
    cycle(delta=1){const n=WEAPONS.length;game.selectWeapon((game.weaponIndex+delta+n)%n);},
    select(index){game.selectWeapon(index);},
    interact:onInteract,
    pause(){held=false;fireInput.reset();gamepadInput.reset();music.pause();ambience?.pause();saber?.update({active:false});},
    gamepad(devices){return gamepadInput.select(devices,{focused:!document.hidden});},
    resize(width,height){
      const requested=getState().quality,quality=requested==='performance'?'low':requested==='ultra'?'high':'auto';
      const current=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu},quality,renderer.isWebGLRenderer);
      camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(renderPixelRatio(current,devicePixelRatio,width,height));renderer.setSize(width,height,false);
    },
    update(dt){update(dt,getState());},
    draw(t){
      if(pending)return;const s=getState();syncCamera(s,Math.min(.05,t-lastTime||.016));lastTime=t;gate.mesh.rotation.z=t*.052;
      sun.intensity=1.4+s.day*2.4;hemi.intensity=1.8+s.day*1.5;
      torch.visible=s.flashlight!==false;
      const shadows=profile.shadows&&s.shadows!==false&&s.quality!=='performance';
      if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=true;}
      try{const result=renderer.renderAsync?renderer.renderAsync(scene,camera):renderer.render(scene,camera);if(result?.then){pending=true;result.then(()=>pending=false).catch(error=>{pending=false;onFailure(error);});}}
      catch(error){onFailure(error);}
    },
    snapshot(){return {revision:'3.48',characterId,phase,ready,time:game.time,held,pendingShot:fireInput.pending(game.time),state:game.state,cooldown:game.cooldown,health:game.player.hp,weaponIndex:game.weaponIndex,weapon:game.weapon.id,ammo:game.ammo[game.weaponIndex],
      capacity:game.weapon.capacity,enemies:game.enemies.length,hostileProjectiles:game.bullets.filter(b=>b.hostile).length,shots:game.bullets.filter(b=>!b.hostile).length,
      kills:game.kills,rig:!!rig,gun:!!gun,backend:renderer.isWebGLRenderer?'webgl':'webgpu',triangles:terrain.triangles,
      pbr:{...pbr.stats},effects:effects.stats(),companion:companion.snapshot(),position:{...getState().position},
      hostiles:game.enemies.map(e=>({id:e.id,x:e.x,y:e.elevation+e.aimHeight,z:e.z,hp:e.hp,awareness:e.awareness})),render:renderer.info.render};}
  };
}
