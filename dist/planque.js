import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {ArenaGame,WEAPONS,clamp} from './game-logic.js';
import {graphicsProfile,createCompatibleRenderer,renderPixelRatio,rendererBackend} from './renderer-policy.js';
import {frameDelta} from './frame-timing.js';
import {loadHideoutArt} from './hideout-art.js';
import {createHideoutNavigation} from './hideout-navigation.js';
import {readHideoutProfile,saveHideoutProfile,nextHideoutChapter,chapterURL,prepareHideoutDeparture,historyForHero,HIDEOUT_HISTORY,CHAPTER_ROUTES} from './hideout-state.js';
import {createNanoForgePanel} from './nano-forge-ui.js';
import {createNanoForgeFX} from './nano-forge-fx.js';
import {ARMOR_STAGES} from './armor-progression.js';
import {createHideoutNanoChambers,NANO_ARMOR_TIERS} from './hideout-nano-chambers.js';
import {createPinkWarsInput} from './level2-input.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {setScreenMusic} from './menu-music.js';
import {GAME_VERSION} from './launch-ui.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let savedHero='ghju';try{savedHero=localStorage.getItem('pink-war-character')||'ghju';}catch{}
const characterId=(params.get('character')||savedHero)==='lylu'?'lylu':'ghju',lylu=characterId==='lylu';
try{localStorage.setItem('pink-war-character',characterId);}catch{}
document.body.classList.add('hideout-page');document.documentElement.style.setProperty('--accent',lylu?'#65bfff':'#ff6cae');
for(const b of document.querySelectorAll('[data-hero]')){b.setAttribute('aria-pressed',String(b.dataset.hero===characterId));b.onclick=()=>{saveCurrent();const u=new URL(location.href);u.searchParams.set('character',b.dataset.hero);location.assign(u.href);};}
let savedQuality='auto';try{const q=JSON.parse(localStorage.getItem('rosee-settings')||'{}').quality;if(['auto','low','balanced','high','performance'].includes(q))savedQuality=q;}catch{}
let profile=readHideoutProfile(characterId),renderer,canvas=$('world'),scene,camera,overview,visit,art,game,navigation,rig,nanoFx,nanoPanel,nanoChambers,nanoUI=null,ready=false,view='overview',cameraYaw=0,cameraPitch=-.13,armorLevel=profile.armorLevel;
let path=[],destination=null,near=null,opened=null,healing=null,clock=0,previous=0,pending=false,messageUntil=0,lastStatus='',moving=false;
const keys=new Set(),touch={x:0,z:0},pads=createPinkWarsInput(),ray=new T.Raycaster(),mouse=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),floorPoint=new T.Vector3();
function message(text,seconds=4){$('notice').textContent=text;$('notice').hidden=false;messageUntil=performance.now()+seconds*1000;}
function progress(value,text){$('loading').querySelector('progress').value=value;$('loading').querySelector('p').textContent=text;}
function saveCurrent(){
 if(!game)return;const fresh=readHideoutProfile(characterId);Object.assign(fresh,{owned:[...game.ownedWeapons],selectedWeapon:game.weaponIndex,armorLevel,health:game.player.hp,shield:game.player.shield||0,charges:game.charges});profile=fresh;saveHideoutProfile(characterId,profile);
}
function environment(){
 scene.background=new T.Color(0x10121d);
 const env=document.createElement('canvas');env.width=512;env.height=256;const e=env.getContext('2d');e.fillStyle='#243245';e.fillRect(0,0,512,256);e.fillStyle='#c2b6c7';e.fillRect(0,15,512,40);e.fillStyle='#b85589';e.fillRect(70,75,90,40);e.fillStyle='#58a8ce';e.fillRect(335,75,75,40);const tex=new T.CanvasTexture(env);tex.colorSpace=T.SRGBColorSpace;tex.mapping=T.EquirectangularReflectionMapping;scene.environment=tex;scene.environmentIntensity=.65;
}
async function boot(){
 try{
  const quality=params.get('quality')||savedQuality,graphics=graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu,rendererHint:params.get('renderer')},quality);
  graphics.orthographicBudget=true;
  const compatible=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile:graphics});renderer=compatible.renderer;canvas=compatible.canvas;
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(renderPixelRatio(graphics,devicePixelRatio,innerWidth,innerHeight));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=!graphics.phone&&graphics.shadows&&!['low','performance'].includes(graphics.artQuality);renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();scene.fog=new T.FogExp2(0x733d61,.006);environment();
  scene.add(new T.HemisphereLight(0xb5c6f2,0x302637,.95));const sun=new T.DirectionalLight(0xe3def2,2.5);sun.position.set(0,13,7);sun.castShadow=renderer.shadowMap.enabled;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:42});sun.shadow.bias=-.0006;scene.add(sun);
  for(const [color,x,z,intensity]of [[0xff80ae,-7,-7,48],[0x72caff,7,-2,38]]){const light=new T.PointLight(color,intensity,18,2);light.position.set(x,3,z);scene.add(light);}
  overview=new T.OrthographicCamera(-15,15,15,-15,.05,230);overview.position.set(0,26,29);overview.lookAt(0,.2,-1);visit=new T.PerspectiveCamera(64,innerWidth/innerHeight,.05,180);camera=overview;
  art=await loadHideoutArt(T,{onProgress:progress,low:graphics.phone||graphics.economy||graphics.artQuality==='low'});scene.add(art.root);navigation=createHideoutNavigation(art.layout);
   nanoChambers=createHideoutNanoChambers(T,{scene,locations:art.layout.showcase.outfits,low:graphics.phone||graphics.economy,onStatus:()=>nanoUI?.refresh()});
  const flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]},level=nextHideoutChapter(profile)||profile.lastChapter;
  game=new ArenaGame([...art.layout.colliders,...art.doorColliders],Math.random,flat,characterId);game.configureWeaponAccess({mode:'campaign',level});game.inHideout=true;game.grappleEnabled=false;game.enableArmorShield();game.nextWave=Infinity;game.toSpawn=0;game.invulnerable=Infinity;game.nano.placed=true;game.nano.plans=[];game.wave=1;
  for(const i of profile.owned)if(game.isWeaponAvailable(i)&&game.nanoWeaponAllowed(i))game.ownedWeapons.add(i);
  if(profile.selectedWeapon!==null&&game.ownedWeapons.has(profile.selectedWeapon)&&game.isWeaponAvailable(profile.selectedWeapon)&&game.nanoWeaponAllowed(profile.selectedWeapon))game.weaponIndex=profile.selectedWeapon;
  Object.assign(game.player,{x:0,z:4.6,elevation:0,hp:profile.health,shield:Math.min(game.shieldCapacity,profile.shield)});game.charges=profile.charges;
  nanoFx=createNanoForgeFX(T,{scene,camera:overview,getWeapon:()=>rig?.model.gun});
  progress(.9,'Ouverture du refuge');resize(graphics);bindWorld();renderer.setAnimationLoop(frame);
  ready=true;$('loading').hidden=true;setScreenMusic('menu',1);message('Bienvenue dans la planque. Choisis une pièce ou promène-toi.',6);
  void loadHero();
 }catch(error){console.error('La Planque',error);$('loading').hidden=false;progress(0,error?.message||'Le refuge n’a pas pu s’ouvrir.');$('retry').hidden=false;}
}
async function loadHero(){
 try{const mat=(c)=>new T.MeshStandardMaterial({color:c,roughness:.65,metalness:.4}),glow=c=>new T.MeshBasicMaterial({color:c});rig=await installPinkWarsSoldier(T,scene,characterId,{monster:mat(0x394653),monsterFace:mat(0x09121d),cyan:glow(0x6dcfff),rose:glow(0xff639f),violet:glow(0x9d72ff),pale:glow(0xd8efff)});rig.model.root.visible=true;rig.model.setWeapon(game.weaponIndex);rig.model.setLevel(armorLevel);}catch(error){console.warn('Planque / personnage',error);message('Le refuge est prêt. Le personnage est encore indisponible : les pièces restent accessibles.');}
}
function resize(graphics){if(!renderer)return;const aspect=innerWidth/innerHeight,span=Math.max(26,24/aspect);overview.left=-span*aspect/2;overview.right=span*aspect/2;overview.top=span/2;overview.bottom=-span/2;overview.updateProjectionMatrix();visit.aspect=aspect;visit.updateProjectionMatrix();renderer.setPixelRatio(renderPixelRatio(graphics,devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight);}
function navigate(point,station=null){
 if(!ready||opened)return;const route=navigation.path(game.player,point);if(!route){message('Le passage est occupé. Approche par l’allée centrale.');return;}
 path=route;destination=station;if(station)message('En route vers '+station.name+'.',5);for(const b of document.querySelectorAll('[data-station]'))b.setAttribute('aria-current',String(b.dataset.station===station?.id));
 if(station&&navigation.inRoom(game.player,station.room)&&Math.hypot(game.player.x-station.x,game.player.z-station.z)<station.radius){path=[];destination=null;openStation(station.id);}
}
function chooseStation(id){const station=art?.layout.stations.find(s=>s.id===id);if(station)navigate(station,station);}
function element(tag,text,cls=''){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function primary(text,action){const b=element('button',text,'hub-primary');b.type='button';b.onclick=action;return b;}
function closePanel(){if(healing)return;nanoUI=null;opened=null;keys.clear();touch.x=touch.z=0;$('panel').close();document.body.classList.remove('panel-open');nanoPanel?.dispose();nanoPanel=null;}
function openStation(id){
 if(!ready)return;const s=art.layout.stations.find(s=>s.id===id);if(!s)return;if(!navigation.inRoom(game.player,s.room)){navigate(s,s);return;}path=[];destination=null;opened=id;keys.clear();touch.x=touch.z=0;
 nanoPanel?.dispose();nanoPanel=null;nanoUI=null;$('panel-content').replaceChildren();$('panel-title').textContent=s.name;$('panel-kicker').textContent='LA PLANQUE · '+characterId.toUpperCase();document.body.classList.add('panel-open');if(!$('panel').open)$('panel').showModal();
 const content=$('panel-content');
 if(id==='weapons'){
  content.append(element('p','Prépare une arme de ton inventaire pour la prochaine mission. Les nouveaux modèles s’assemblent à l’atelier nano.'));
  const list=element('div','','hub-list');for(const [i,w]of WEAPONS.entries()){
   const owned=game.ownedWeapons.has(i)&&game.isWeaponAvailable(i)&&game.nanoWeaponAllowed(i);if(!game.nanoWeaponAllowed(i))continue;
   const b=element('button');b.dataset.hubWeapon=String(i);b.disabled=!owned;b.setAttribute('aria-pressed',String(i===game.weaponIndex));b.append(element('strong',w.name),element('small',owned?(i===game.weaponIndex?'ARME PRÉPARÉE':'Préparer cette arme'):i===9&&game.missionLevel<10?'À partir du chapitre 10':'Plan et fabrication requis'));
   b.onclick=()=>{if(i!==game.weaponIndex)game.selectWeapon(i);saveCurrent();rig?.model.setWeapon(i);openStation('weapons');message(w.name+' préparé pour '+characterId.toUpperCase());};list.append(b);
  }content.append(list);
 }else if(id==='workshop'){
  content.append(element('p',(lylu?'Cara · CAR-14':'Gaby · GAB-1')+' réassemble ton équipement avec les nanoparticules récupérées en mission.'));
  nanoPanel=createNanoForgePanel({parent:content,getGame:()=>game,onRefresh:()=>{saveCurrent();rig?.model.setWeapon(game.weaponIndex);}});
  nanoPanel.refresh();
 }else if(id==='archive'){
  const past=historyForHero(profile);content.append(element('p','Le livre conserve les événements déjà vécus. Aucune révélation des chapitres à venir.'));
  if(!past.length)content.append(element('p','Aucun chapitre terminé pour le moment. Le premier récit sera archivé à ton retour de mission.'));
  for(const event of past){const card=element('article','','hub-archive');card.dataset.historyLevel=String(event.level);card.append(element('h3',String(event.level).padStart(2,'0')+' · '+event.title),element('p',event.text));content.append(card);}
 }else if(id==='outfits'){
  const maximum=Math.min(10,Math.max(profile.lastChapter,...profile.completed.map(n=>n+1),1));
  content.append(element('p','Les deux anciennes tenues sont remplacées par des centrifugeuses GHJU et LYLU. Injecte les nanites depuis le réservoir au sol : le vortex assemble l’armure réelle, puis la cape se tisse en dernier.'));
  const controls=element('section','','hub-nano-controls');
  const heroes=element('div','','hub-nano-heroes'),tiers=element('div','','hub-nano-tiers'),heroButtons={},tierButtons={};
  let forgeHero=characterId,forgeTier=NANO_ARMOR_TIERS.filter(t=>t.gameLevel<=armorLevel).at(-1)?.tier||1;
  for(const id of ['ghju','lylu']){
   const b=element('button',id.toUpperCase());b.type='button';b.dataset.forgeHero=id;
   b.onclick=()=>{forgeHero=id;nanoUI?.refresh();};heroes.append(b);heroButtons[id]=b;
  }
  for(const t of NANO_ARMOR_TIERS){
   const b=element('button');b.type='button';b.dataset.forgeTier=String(t.tier);
   b.append(element('strong',String(t.tier).padStart(2,'0')),element('small',t.name));
   b.onclick=()=>{forgeTier=t.tier;nanoUI?.refresh();};tiers.append(b);tierButtons[t.tier]=b;
  }
  const material=element('p','','hub-nano-material'),status=element('p','','hub-nano-state');
  const meter=element('progress','','hub-progress');meter.max=1;meter.value=0;
  const inject=primary('INJECTER & FABRIQUER',async()=>{
   inject.disabled=true;status.textContent='Initialisation des modèles officiels…';
   const hero=forgeHero,tier=forgeTier;
   if(!await nanoChambers.inject(hero,tier))message('Modèle Shadow Unit indisponible. Réessaie.',6);
   nanoUI?.refresh();
  });
  const recover=primary('OUVRIR LE SAS & ÉQUIPER',()=>{
   const actual=nanoChambers.phase(forgeHero);if(!actual||!nanoChambers.recover(forgeHero))return;
   const level=NANO_ARMOR_TIERS[actual.tier-1].gameLevel;
   if(forgeHero!==characterId)message('Sas ouvert. Sélectionne '+forgeHero.toUpperCase()+' dans l’en-tête pour équiper cette tenue.',7);
   else if(level>maximum)message('Sas ouvert pour inspection. Niveau '+level+' requis pour équiper cette tenue en mission.',7);
   else{armorLevel=level;game.hideoutArmorLevel=level;rig?.model.setLevel(level);saveCurrent();message('Tenue '+actual.tier+' équipée et sauvegardée pour '+characterId.toUpperCase()+'.',6);}
   nanoUI?.refresh();
  });
  controls.append(heroes,tiers,material,meter,status,inject,recover);content.append(controls);
  nanoUI={refresh(){
   const state=nanoChambers?.phase(forgeHero),selected=NANO_ARMOR_TIERS[forgeTier-1],phase=state?.phase||'idle';
   for(const [id,b]of Object.entries(heroButtons))b.setAttribute('aria-pressed',String(id===forgeHero));
   for(const [id,b]of Object.entries(tierButtons))b.setAttribute('aria-pressed',String(Number(id)===forgeTier));
   material.textContent=selected.material+(selected.gameLevel>maximum?' · prévisualisation, niveau '+selected.gameLevel+' requis':' · équipement débloqué');
   meter.value=state?.progress||0;
   status.textContent=phase==='injecting'?'CENTRIFUGATION · '+Math.round((state?.progress||0)*100)+' %':
     phase==='loading'?'CHARGEMENT DES MODÈLES SHADOW UNIT…':
     phase==='ready'?'ARMURE TERMINÉE · SAS DISPONIBLE':
     phase==='open'?'SAS OUVERT · ACCÈS À LA TENUE':
     phase==='error'?'CHARGEMENT IMPOSSIBLE · RELANCER':
     'RÉSERVOIR PRÊT · CHAMBRE VIDE';
   inject.disabled=phase==='injecting'||phase==='loading';
   recover.disabled=!['ready','open'].includes(phase)||state?.tier!==forgeTier;
   recover.textContent=state?.doorOpen?'SAS OUVERT · ÉQUIPER':'OUVRIR LE SAS & ÉQUIPER';
  }};nanoUI.refresh();
  const details=element('details','','hub-nano-details');
  details.append(element('summary','Progression détaillée originale · 10 modules'));
  const list=element('div','','hub-list');
  for(const stage of ARMOR_STAGES){
   const b=element('button');b.dataset.hubArmor=String(stage.level);b.disabled=stage.level>maximum;
   b.setAttribute('aria-pressed',String(stage.level===armorLevel));
   b.append(element('strong',stage.name),element('small',stage.addition+(b.disabled?' · progression requise':'')));
   b.onclick=()=>{armorLevel=stage.level;game.hideoutArmorLevel=armorLevel;rig?.model.setLevel(armorLevel);saveCurrent();openStation('outfits');};list.append(b);
  }
  details.append(list);content.append(details);
 }else if(id==='mission'){
  const next=nextHideoutChapter(profile);content.append(element('p',next?'Prépare ton équipement, puis rejoins le chapitre suivant. Tu peux aussi repartir librement dans un chapitre disponible.':'Les chapitres disponibles sont archivés. Tu peux retourner dans Vesper en attendant la suite.'));
  if(next)content.append(primary('PARTIR · '+HIDEOUT_HISTORY.find(c=>c.level===next).title,()=>depart(next)));
  const list=element('div','','hub-list');for(const c of HIDEOUT_HISTORY){const b=element('button');b.dataset.hubMission=String(c.level);b.append(element('strong',String(c.level).padStart(2,'0')+' · '+c.title),element('small',profile.completed.includes(c.level)?'REJOUER CE CHAPITRE':'REJOINDRE CE CHAPITRE'));b.onclick=()=>depart(c.level);list.append(b);}content.append(list);
 }else{
  const rest=id==='rest'||id==='bath';content.append(element('p',rest?'Une pause à l’abri d’ORDRE régénère la santé et le bouclier. Les nanoparticules restent réservées à la fabrication.':'La station recharge le bouclier, les cellules des armes et les charges à impulsion.'));
  content.append(element('p','Santé '+Math.ceil(game.player.hp)+' / 100 · Bouclier '+Math.ceil(game.player.shield)+' / '+game.shieldCapacity));
  const progress=element('progress','','hub-progress');progress.max=1;progress.value=0;progress.hidden=true;content.append(progress);
  const b=primary(rest?'SE REPOSER ET RÉGÉNÉRER':'RECHARGER L’ÉQUIPEMENT',()=>{b.disabled=true;progress.hidden=false;healing={rest,age:0,life:rest?2.6:1.8,startHP:game.player.hp,startShield:game.player.shield,progress,button:b};$('close').disabled=true;});b.dataset.hubRecover=rest?'rest':'charge';content.append(b);
 }
}
function depart(level){
 saveCurrent();if(!prepareHideoutDeparture(game,{level,armorLevel})){message('La préparation n’a pas pu être sauvegardée. Réessaie avant de quitter la planque.',7);return;}
 const url=chapterURL(level,{characterId,renderer:params.get('renderer'),resume:!profile.completed.includes(level)&&level===profile.lastChapter});if(url)location.assign(url);
}
function bindWorld(){
 for(const b of document.querySelectorAll('[data-station]'))b.onclick=()=>chooseStation(b.dataset.station);
 $('close').onclick=closePanel;$('panel').addEventListener('cancel',e=>{e.preventDefault();closePanel();});$('retry').onclick=()=>location.reload();
 $('view').onclick=()=>{view=view==='overview'?'visit':'overview';camera=view==='overview'?overview:visit;document.body.dataset.view=view;art.setInterior(view==='visit');if(rig)rig.model.root.visible=view==='overview';$('view').textContent=view==='overview'?'VISITER':'VUE D’ENSEMBLE';$('view').setAttribute('aria-pressed',String(view==='visit'));};
 const pointers=new Map();let pinch=0;
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(opened||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
 canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>7)p.moved=true;
  if(pointers.size===2&&view==='overview'){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch>0){overview.zoom=clamp(overview.zoom*d/pinch,.7,2.5);overview.updateProjectionMatrix();}pinch=d;for(const q of pointers.values())q.moved=true;}
  else if(view==='visit'){cameraYaw-=dx*.004;cameraPitch=clamp(cameraPitch-dy*.003,-.65,.3);}
 });
 canvas.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(!p||p.moved||opened)return;mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(art.root,true)[0];if(hit){const s=art.layout.stations.map(s=>({s,d:Math.hypot(s.x-hit.point.x,s.z-hit.point.z)})).sort((a,b)=>a.d-b.d)[0];if(s?.d<3){chooseStation(s.s.id);return;}}if(ray.ray.intersectPlane(floor,floorPoint))navigate(floorPoint);});
 for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>pointers.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{if(view!=='overview'||opened)return;e.preventDefault();overview.zoom=clamp(overview.zoom*Math.exp(-e.deltaY*.001),.7,2.5);overview.updateProjectionMatrix();},{passive:false});
 window.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName))return;if(e.code==='Escape'){if(opened)closePanel();return;}if(opened)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyF'&&!e.repeat&&near)openStation(near.id);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.x=touch.z=0;});
 const stick=$('stick'),knob=stick.querySelector('i');let stickPointer=null;
 const steer=e=>{const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,max=r.width*.34,n=Math.max(1,Math.hypot(dx,dz)/max);touch.x=dx/(n*max);touch.z=dz/(n*max);knob.style.transform='translate('+touch.x*max+'px,'+touch.z*max+'px)';};
 stick.onpointerdown=e=>{if(opened)return;stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);steer(e);};stick.onpointermove=e=>{if(e.pointerId===stickPointer)steer(e);};for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.z=0;knob.style.transform='';}});
 $('action').onclick=()=>near&&openStation(near.id);
 window.addEventListener('resize',()=>resize(graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu,rendererHint:params.get('renderer')},params.get('quality')||savedQuality)));
}
function update(dt){
 const control=pads.read(dt,keys,navigator.getGamepads?.()||[],{focused:!document.hidden});
 if(!opened&&view==='visit'){cameraYaw-=control.lookX*dt;cameraPitch=clamp(cameraPitch-control.lookY*dt,-.65,.3);}
 if(!opened&&control.interact&&near)openStation(near.id);else if(opened&&control.pause)closePanel();
 if(healing){const h=healing;h.age+=dt;const u=Math.min(1,h.age/h.life);h.progress.value=u;if(h.rest)game.player.hp=h.startHP+(100-h.startHP)*u;game.player.shield=h.startShield+(game.shieldCapacity-h.startShield)*u;
  if(u>=1){if(h.rest)profile.rested=true;else{profile.recharged=true;game.ammo=WEAPONS.map(w=>w.capacity);game.dual.ammo={left:12,right:12};game.charges=4;}game.player.shield=game.shieldCapacity;saveCurrent();profile.rested=profile.rested||h.rest;profile.recharged=profile.recharged||!h.rest;saveHideoutProfile(characterId,profile);h.button.textContent=h.rest?'RÉGÉNÉRATION TERMINÉE':'ÉQUIPEMENT RECHARGÉ';$('close').disabled=false;healing=null;}
 }
 let x=control.moveX+touch.x,z=control.moveZ+touch.z,yaw=view==='visit'?cameraYaw:0;
 if(opened){x=z=0;}
 else if(Math.hypot(x,z)>.12){path=[];destination=null;}
 else if(path.length){const goal=path[0],dx=goal.x-game.player.x,dz=goal.z-game.player.z,d=Math.hypot(dx,dz);if(d<.18){path.shift();if(!path.length&&destination){const target=destination;destination=null;if(Math.hypot(game.player.x-target.x,game.player.z-target.z)<target.radius)openStation(target.id);}}else{yaw=-Math.atan2(dx,-dz);x=0;z=-Math.min(1,d/.4);}}
 art.updateDoors(dt,game.player,{moving:!opened&&Math.hypot(x,z)>.03});
 if(!opened)game.step(dt,{x,z,yaw,moveYaw:yaw,sprint:control.sprint,gamepadMoving:control.gamepadMoving,touchMoving:!!(touch.x||touch.z)});
 moving=Math.hypot(game.playerVelocity?.x||0,game.playerVelocity?.z||0)>.15;
 if(rig){const m=rig.model;m.root.position.set(game.player.x,0,game.player.z);m.root.rotation.y=game.player.yaw;m.root.visible=view==='overview';if(m.weapon!==game.weaponIndex)m.setWeapon(game.weaponIndex);m.animate(game.time,moving,0,0,0,opened?0:dt,{velocity:game.playerVelocity,ground:()=>0,airborne:false,verticalSpeed:0,crouched:false,sprint:!!control.sprint,aim:false,firing:false});}
 if(view==='visit'){
  const p=game.player;visit.position.set(p.x,1.65,p.z);visit.rotation.set(cameraPitch,cameraYaw,0,'YXZ');
 }
 near=art.layout.stations.map(s=>({s,d:Math.hypot(game.player.x-s.x,game.player.z-s.z)})).filter(o=>o.d<o.s.radius&&navigation.inRoom(game.player,o.s.room)).sort((a,b)=>a.d-b.d)[0]?.s||null;$('action').hidden=!near||!!opened;if(near)$('action').textContent='F · '+near.action;
 const status=[Math.ceil(game.player.hp),Math.ceil(game.player.shield),game.nano.profile.balance].join(':');if(status!==lastStatus){lastStatus=status;$('vitals').textContent='SANTÉ '+Math.ceil(game.player.hp)+' · BOUCLIER '+Math.ceil(game.player.shield);$('nanites').textContent=game.nano.profile.balance+' NP';}
 for(const e of game.drainEvents()){nanoFx.handle(e);if(e.type==='nano-crafted')message(e.name+' · assemblage terminé');if(e.type==='nano-error')message(e.message,7);}
 nanoFx.update(game,dt);nanoChambers?.update(dt,clock);
 if(opened==='outfits')nanoUI?.refresh();
 if(performance.now()>messageUntil)$('notice').hidden=true;
}
function frame(now){
 if(pending||!game)return;const dt=frameDelta(previous?(now-previous)/1000:.016);previous=now;clock+=dt;update(dt);
 try{if(renderer.renderAsync){pending=true;(async()=>{await art.renderExterior(renderer,camera,clock);await renderer.renderAsync(scene,camera);})().then(()=>pending=false).catch(error=>{pending=false;console.error(error);message('Le rendu a été interrompu. Recharge la planque.',8);});}else{art.renderExterior(renderer,camera,clock);renderer.render(scene,camera);}}catch(error){console.error(error);renderer.setAnimationLoop(null);message('Le rendu a été interrompu. Recharge la planque.',8);}
}
window.__PINK_HIDEOUT={snapshot:()=>({ready,version:GAME_VERSION,characterId,view,station:opened,pathLength:path.length,routeTarget:destination?.id,nextPoint:path[0]&&{x:path[0].x,z:path[0].z},simulationTime:game?.time,position:game&&{x:game.player.x,z:game.player.z},health:game?.player.hp,shield:game?.player.shield,weapon:game?.weapon.id,weaponIndex:game?.weaponIndex,owned:game&&[...game.ownedWeapons],armorLevel,nano:game?.nano.profile.balance,history:historyForHero(profile),completed:[...profile.completed],next:nextHideoutChapter(profile),source:art?.source,triangles:art?.triangles,batches:art?.batches,downloadBytes:art?.downloadBytes,surfaces:art?.surfaces,showcase:art?.showcase(),nanoChambers:nanoChambers?.snapshot(),doors:art?.doors(),city:art?.city(),backend:rendererBackend(renderer),renderBudget:renderer?.frameBudget?.stats(),heroReady:!!rig,healing:!!healing}),debug:params.has('debug')?{get game(){return game;},get scene(){return scene;},get camera(){return camera;},get renderer(){return renderer;},get art(){return art;},get nanoChambers(){return nanoChambers;},get time(){return clock;},openDoor:id=>art.openDoor(id),go:chooseStation,open:openStation,close:closePanel,teleport(x,z){if(navigation.free(x,z)){path=[];Object.assign(game.player,{x,z});}},navigation:()=>navigation,complete(level){profile.completed.push(level);profile.lastChapter=level;saveHideoutProfile(characterId,profile);}}:null};
void boot();
