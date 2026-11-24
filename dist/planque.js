import {readNanoProfile,equipNanoSuit,nanoRecipes} from './nano-forge.js';
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer,WebGLRenderTarget} from './vendor/three.module.min.js';
import {ArenaGame,WEAPONS,clamp,segmentBox} from './game-logic.js';
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
import {setScreenMusic,setMusicEnabled} from './menu-music.js';
import {GAME_VERSION} from './launch-ui.js';
import {createLyluCivil} from './lylu-civil-hideout.js?v=20261124fitness1';
import {bindViewButton,mountViewControl,savePreferredView} from './view-options.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let savedHero='ghju';try{savedHero=localStorage.getItem('pink-war-character')||'ghju';}catch{}
const characterId=(params.get('character')||savedHero)==='lylu'?'lylu':'ghju',lylu=characterId==='lylu';
try{localStorage.setItem('pink-war-character',characterId);}catch{}
document.body.classList.add('hideout-page');document.documentElement.style.setProperty('--accent',lylu?'#65bfff':'#ff6cae');
for(const b of document.querySelectorAll('[data-hero]')){b.setAttribute('aria-pressed',String(b.dataset.hero===characterId));b.onclick=()=>{saveCurrent();const u=new URL(location.href);u.searchParams.set('character',b.dataset.hero);location.assign(u.href);};}
let savedQuality='auto';try{const q=JSON.parse(localStorage.getItem('rosee-settings')||'{}').quality;if(['auto','low','balanced','high','performance'].includes(q))savedQuality=q;}catch{}
let profile=readHideoutProfile(characterId),renderer,canvas=$('world'),scene,camera,overview,visit,art,game,navigation,rig,nanoFx,nanoPanel,nanoChambers,nanoUI=null,ready=false,view='overview',cameraYaw=0,cameraPitch=-.13,armorLevel=readNanoProfile(characterId).equippedSuit;
let outfitPreview=null,outfitTarget=null,outfitCamera=null;
let civil=null,civilMode=lylu,civilLoading=false,portrait=null,third=null,paused=false,pauseViewControl=null,optionsViewControl=null,lastPlayView='third',returningArmor=false;
function visibleHero(){if(rig)rig.model.root.visible=(view==='overview'||view==='third')&&(!lylu||!civilMode);if(civil)civil.root.visible=civilMode&&view!=='visit';}
function setCivilMode(on){civilMode=!!(lylu&&on);const b=$('civil-outfit');if(b){b.textContent=civilMode?'RÉCUPÉRER ARMURE':'REPOSER ARMURE';b.setAttribute('aria-pressed',String(!civilMode));}if(!civilMode&&view==='portrait')setView(lastPlayView);visibleHero();}
function setView(next){view=next;if(next==='visit'||next==='third')lastPlayView=next;camera=next==='overview'?overview:next==='portrait'?portrait:next==='third'?third:visit;document.body.dataset.view=next==='portrait'?'overview':next;art.setInterior(next==='visit'||next==='third');visibleHero();$('view').textContent=next==='visit'?'3P':'FPS';$('view').setAttribute('aria-pressed',String(next==='visit'));$('overview-view').setAttribute('aria-pressed',String(next==='overview'));$('civil-portrait').setAttribute('aria-pressed',String(next==='portrait'));pauseViewControl?.refresh();optionsViewControl?.refresh();}
function selectPlayView(value){const next=value==='fps'?'visit':'third';savePreferredView(value);setView(next);}
function clearMotion(){keys.clear();touch.x=touch.z=0;path=[];destination=null;const knob=$('stick')?.querySelector('i');if(knob)knob.style.transform='';}
function pauseHideout(){if(!ready||paused||opened)return;$('pause-character').textContent=characterId.toUpperCase()+' / LA PLANQUE';paused=true;clearMotion();document.exitPointerLock?.();setScreenMusic('paused');$('pause-dialog').showModal();pauseViewControl?.refresh();}
function resumeHideout(){if(!paused)return;for(const id of ['pause-dialog','hideout-settings'])if($(id).open)$(id).close();paused=false;clearMotion();setScreenMusic('menu',1,undefined,{mode:'planque'});}
function pauseStation(id){resumeHideout();chooseStation(id);}
async function returnArmor(){if(!lylu||civilMode||returningArmor||!civil||!rig)return false;returningArmor=true;try{if(!await nanoChambers.store(characterId,armorLevel)){message('La capsule est indisponible. Réessaie.',6);return false;}setCivilMode(true);civil?.triggerAction('armor-return');message('Armure reposée dans la capsule de LYLU.',5);return true;}finally{returningArmor=false;nanoUI?.refresh();}}
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
  overview=new T.OrthographicCamera(-15,15,15,-15,.05,230);overview.position.set(0,26,29);overview.lookAt(0,.2,-1);visit=new T.PerspectiveCamera(64,innerWidth/innerHeight,.05,180);portrait=new T.PerspectiveCamera(40,innerWidth/innerHeight,.025,180);third=new T.PerspectiveCamera(64,innerWidth/innerHeight,.05,180);camera=overview;
  art=await loadHideoutArt(T,{displayOutfits:false,onProgress:progress,low:graphics.phone||graphics.economy||graphics.artQuality==='low'});scene.add(art.root);navigation=createHideoutNavigation(art.layout);
  if(art.layout.gymRevision){const gymLight=new T.PointLight(0xc4dfff,32,10,2);gymLight.position.set(7.65,3.1,7.65);scene.add(gymLight);}
   nanoChambers=createHideoutNanoChambers(T,{scene,locations:art.layout.showcase.outfits,low:graphics.phone||graphics.economy,onStatus:()=>nanoUI?.refresh()});
  const flat={height:()=>0,surfaces:()=>[],routes:[],lifts:[]},level=nextHideoutChapter(profile)||profile.lastChapter;
  game=new ArenaGame([...art.layout.colliders,...art.doorColliders],Math.random,flat,characterId);game.configureWeaponAccess({mode:'campaign',level});game.inHideout=true;game.grappleEnabled=false;game.enableArmorShield();game.nextWave=Infinity;game.toSpawn=0;game.invulnerable=Infinity;game.nano.placed=true;game.nano.plans=[];game.wave=1;
  for(const i of profile.owned)if(game.isWeaponAvailable(i)&&game.nanoWeaponAllowed(i))game.ownedWeapons.add(i);
  if(profile.selectedWeapon!==null&&game.ownedWeapons.has(profile.selectedWeapon)&&game.isWeaponAvailable(profile.selectedWeapon)&&game.nanoWeaponAllowed(profile.selectedWeapon))game.weaponIndex=profile.selectedWeapon;
  const spawn=art.layout.openPlanRevision?art.layout.spawn:{x:0,z:4.6,yaw:0};cameraYaw=spawn.yaw||0;Object.assign(game.player,{x:spawn.x,z:spawn.z,yaw:cameraYaw,elevation:0,hp:profile.health,shield:Math.min(game.shieldCapacity,profile.shield)});game.charges=profile.charges;
  nanoFx=createNanoForgeFX(T,{scene,camera:overview,getWeapon:()=>rig?.model.gun});
  progress(.9,'Chargement de '+characterId.toUpperCase());resize(graphics);bindWorld();
  await loadHero();setView(lylu?'third':'overview');renderer.setAnimationLoop(frame);
  ready=true;$('loading').hidden=true;setScreenMusic('menu',1,undefined,{mode:'planque'});message('Bienvenue dans la planque. Choisis une pièce ou promène-toi.',6);
  if(lylu)void nanoChambers.store(characterId,armorLevel).catch(error=>console.warn('Capsule LYLU',error));
 }catch(error){console.error('La Planque',error);$('loading').hidden=false;progress(0,error?.message||'Le refuge n’a pas pu s’ouvrir.');$('retry').hidden=false;}
}
async function loadHero(){
 if(lylu){civilLoading=true;try{civil=await createLyluCivil(scene);setCivilMode(true);}catch(error){throw new Error('Tenue civile de LYLU indisponible : '+(error?.message||error));}finally{civilLoading=false;}}
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.65,metalness:.4}),glow=c=>new T.MeshBasicMaterial({color:c});
 try{rig=await installPinkWarsSoldier(T,scene,characterId,{monster:mat(0x394653),monsterFace:mat(0x09121d),cyan:glow(0x6dcfff),rose:glow(0xff639f),violet:glow(0x9d72ff),pale:glow(0xd8efff)});rig.model.setWeapon(game.weaponIndex);rig.model.setLevel(armorLevel);visibleHero();}catch(error){if(!lylu)throw error;console.warn('Armure LYLU indisponible',error);}
 if(lylu){$('civil-outfit').disabled=!rig;$('civil-portrait').disabled=false;}
}
function resize(graphics){if(!renderer)return;const aspect=innerWidth/innerHeight,span=Math.max(26,24/aspect);overview.left=-span*aspect/2;overview.right=span*aspect/2;overview.top=span/2;overview.bottom=-span/2;overview.updateProjectionMatrix();visit.aspect=aspect;visit.updateProjectionMatrix();portrait.aspect=aspect;portrait.updateProjectionMatrix();third.aspect=aspect;third.updateProjectionMatrix();renderer.setPixelRatio(renderPixelRatio(graphics,devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight);}
function navigate(point,station=null){
 if(!ready||opened||paused)return;const route=navigation.path(game.player,point);if(!route){message('Le passage est occupé. Approche par l’allée centrale.');return;}
 path=route;destination=station;if(station)message('En route vers '+station.name+'.',5);for(const b of document.querySelectorAll('[data-station]'))b.setAttribute('aria-current',String(b.dataset.station===station?.id));
 if(station&&navigation.inRoom(game.player,station.room)&&Math.hypot(game.player.x-station.x,game.player.z-station.z)<station.radius){path=[];destination=null;openStation(station.id);}
}
function chooseStation(id){const station=art?.layout.stations.find(s=>s.id===id);if(station)navigate(station,station);}
function element(tag,text,cls=''){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function primary(text,action){const b=element('button',text,'hub-primary');b.type='button';b.onclick=action;return b;}
function closePanel(){if(healing)return;civil?.playFitness(null);outfitPreview=null;nanoUI=null;opened=null;keys.clear();touch.x=touch.z=0;$('panel').close();document.body.classList.remove('panel-open');nanoPanel?.dispose();nanoPanel=null;}
function openStation(id){
 if(!ready||paused)return;const s=art.layout.stations.find(s=>s.id===id)||fitnessStations().find(s=>s.id===id);if(!s)return;if(!navigation.inRoom(game.player,s.room)){navigate(s,s);return;}path=[];destination=null;if(civilMode)civil?.triggerAction(id);opened=id;keys.clear();touch.x=touch.z=0;
 nanoPanel?.dispose();nanoPanel=null;nanoUI=null;outfitPreview=null;$('panel-content').replaceChildren();$('panel-title').textContent=s.name;$('panel-kicker').textContent='LA PLANQUE · '+characterId.toUpperCase();document.body.classList.add('panel-open');if(!$('panel').open)$('panel').showModal();
 const content=$('panel-content');
 if(id.startsWith('fitness-')){const equipment=id.slice(8);content.append(element('p','Aperçu du mouvement sur le squelette civil. Les accessoires et les gains de statistiques seront synchronisés lors de la prochaine étape.'));content.append(primary('Jouer le mouvement',()=>{closePanel();civil?.playFitness(equipment);message('Animation sportive · F pour arrêter',5);}));return;
 }
 if(id==='weapons'){
  content.append(element('p','Prépare une arme de ton inventaire pour la prochaine mission. Les nouveaux modèles s’assemblent à l’atelier nano.'));
  const list=element('div','','hub-list');for(const [i,w]of WEAPONS.entries()){
   const owned=game.ownedWeapons.has(i)&&game.isWeaponAvailable(i)&&game.nanoWeaponAllowed(i);if(!game.nanoWeaponAllowed(i))continue;
   const b=element('button');b.dataset.hubWeapon=String(i);b.disabled=!owned;b.setAttribute('aria-pressed',String(i===game.weaponIndex));b.append(element('strong',w.name),element('small',owned?(i===game.weaponIndex?'ARME PRÉPARÉE':'Préparer cette arme'):i===9&&game.missionLevel<10?'À partir du chapitre 10':'Plan et fabrication requis'));
   b.onclick=()=>{if(i!==game.weaponIndex)game.selectWeapon(i);saveCurrent();rig?.model.setWeapon(i);openStation('weapons');message(w.name+' préparé pour '+characterId.toUpperCase());};list.append(b);
  }content.append(list);
 }else if(id==='workshop'){
  content.append(element('p',(lylu?'Cara · CAR-14':'Gaby · GAB-1')+' réassemble ton équipement avec les nanoparticules récupérées en mission.'));
  nanoPanel=createNanoForgePanel({parent:content,getGame:()=>game,onRefresh:()=>{const changed=armorLevel!==game.nano.profile.equippedSuit;armorLevel=game.nano.profile.equippedSuit;rig?.model.setLevel(armorLevel);saveCurrent();rig?.model.setWeapon(game.weaponIndex);if(changed)void nanoChambers.inject(characterId,armorLevel);}});
  nanoPanel.refresh();
 }else if(id==='archive'){
  const past=historyForHero(profile);content.append(element('p','Le livre conserve les événements déjà vécus. Aucune révélation des chapitres à venir.'));
  if(!past.length)content.append(element('p','Aucun chapitre terminé pour le moment. Le premier récit sera archivé à ton retour de mission.'));
  for(const event of past){const card=element('article','','hub-archive');card.dataset.historyLevel=String(event.level);card.append(element('h3',String(event.level).padStart(2,'0')+' · '+event.title),element('p',event.text));content.append(card);}
 }else if(id==='outfits'){
  content.append(element('p','Choisis un stade pour voir sa tenue et ses capacités. Les nouveaux stades se fabriquent avec leurs plans et les nanoparticules.'));
  const controls=element('section','','hub-nano-controls');
  const heroes=element('div','','hub-nano-heroes'),tiers=element('div','','hub-nano-tiers'),heroButtons={},tierButtons={};
  let forgeHero=characterId,forgeTier=armorLevel;const otherHero=characterId==='ghju'?'lylu':'ghju',otherProfile=readNanoProfile(otherHero);
  const forgeProfile=()=>forgeHero===characterId?game.nano.profile:otherProfile;
  const wearing=hero=>lylu&&hero===characterId&&!civilMode;
  const busy=hero=>returningArmor||['loading','injecting','retrieving','storing'].includes(nanoChambers.phase(hero)?.phase);
  const previewSelection=()=>{if(!busy(forgeHero)&&!wearing(forgeHero))void nanoChambers.preview(forgeHero,forgeTier).catch(error=>message('Aperçu indisponible : '+error.message,6));};
  for(const id of ['ghju','lylu']){
   const b=element('button',id.toUpperCase());b.type='button';b.dataset.forgeHero=id;
   b.onclick=()=>{forgeHero=id;forgeTier=busy(id)?nanoChambers.phase(id).tier:forgeProfile().equippedSuit;previewSelection();nanoUI?.refresh();};heroes.append(b);heroButtons[id]=b;
  }
  for(const t of NANO_ARMOR_TIERS){
   const b=element('button');b.type='button';b.dataset.forgeTier=String(t.tier);
   b.append(element('strong',String(t.tier).padStart(2,'0')),element('small',t.name));const badge=element('small','','hub-forge-badge');badge.dataset.forgeBadge='';b.append(badge);b.title=ARMOR_STAGES[t.tier-1].addition;
   b.onclick=()=>{forgeTier=t.tier;previewSelection();nanoUI?.refresh();};tiers.append(b);tierButtons[t.tier]=b;
  }
  const material=element('p','','hub-nano-material'),capabilities=element('p','','hub-nano-capabilities'),status=element('p','','hub-nano-state');status.setAttribute('role','status');capabilities.dataset.forgeCapabilities='';
  const modelView=element('div','','hub-nano-preview'),modelCanvas=element('canvas'),modelHint=element('small','Glisse pour tourner la tenue');modelCanvas.width=384;modelCanvas.height=288;modelCanvas.dataset.forgeModel='';modelCanvas.setAttribute('aria-label','Aperçu 3D de la tenue sélectionnée · glisser pour tourner');modelView.append(modelCanvas,modelHint);outfitPreview={canvas:modelCanvas,hero:forgeHero,tier:forgeTier,angle:0,painted:''};
  let orbitPointer=null;modelCanvas.addEventListener('pointerdown',e=>{e.preventDefault();orbitPointer={id:e.pointerId,x:e.clientX};modelCanvas.setPointerCapture(e.pointerId);});modelCanvas.addEventListener('pointermove',e=>{if(orbitPointer?.id!==e.pointerId||outfitPreview?.canvas!==modelCanvas)return;outfitPreview.angle-=(e.clientX-orbitPointer.x)*.012;orbitPointer.x=e.clientX;});for(const ev of['pointerup','pointercancel','lostpointercapture'])modelCanvas.addEventListener(ev,()=>orbitPointer=null);
  const meter=element('progress','','hub-progress');meter.max=1;meter.value=0;
  const inject=primary('INJECTER & FABRIQUER',async()=>{
   inject.disabled=true;status.textContent='Initialisation des modèles officiels…';
   const hero=forgeHero,tier=forgeTier;
   if(hero===characterId&&tier>game.nano.profile.suitStage){if(!game.fabricateNano('suit:'+tier)){message(nanoRecipes(game).find(r=>r.id==='suit:'+tier)?.reason||'Plan et nanoparticules requis.',6);nanoUI?.refresh();return;}armorLevel=game.nano.profile.equippedSuit;rig?.model.setLevel(armorLevel);saveCurrent();}
   if(!await nanoChambers.inject(hero,tier))message('Modèle Shadow Unit indisponible. Réessaie.',6);
   nanoUI?.refresh();
  });
  const recover=primary('OUVRIR LE SAS & ÉQUIPER',()=>{
   if(wearing(forgeHero)){void returnArmor();return;}
   const actual=nanoChambers.phase(forgeHero);if(!actual||lylu&&(!civil||!rig))return;
   const level=NANO_ARMOR_TIERS[actual.tier-1].gameLevel;
   if(forgeHero!==characterId||level>game.nano.profile.suitStage)return;
   if(!nanoChambers.recover(forgeHero,{allowPreview:true}))return;
   if(level!==game.nano.profile.equippedSuit&&!equipNanoSuit(game,level))return;armorLevel=game.nano.profile.equippedSuit;rig?.model.setLevel(level);if(lylu)setCivilMode(false);saveCurrent();nanoChambers.equip(forgeHero);message('Tenue '+actual.tier+' équipée et sauvegardée pour '+characterId.toUpperCase()+'.',6);
   nanoUI?.refresh();
  });
  inject.dataset.nanoChamberInject='';recover.dataset.nanoChamberRecover='';controls.append(heroes,tiers,modelView,material,capabilities,meter,status,inject,recover);content.append(controls);
  nanoUI={refresh(){
   const state=nanoChambers?.phase(forgeHero),selected=NANO_ARMOR_TIERS[forgeTier-1],phase=state?.phase||'idle';
   if(outfitPreview?.canvas===modelCanvas){if(outfitPreview.hero!==forgeHero||outfitPreview.tier!==forgeTier){modelCanvas.getContext('2d').clearRect(0,0,384,288);delete modelCanvas.dataset.modelStage;delete modelCanvas.dataset.modelHero;}outfitPreview.hero=forgeHero;outfitPreview.tier=forgeTier;}modelCanvas.setAttribute('aria-busy',String(phase==='loading'));modelHint.textContent=phase==='loading'?'Chargement de la tenue…':phase==='equipped'?'Tenue équipée · sélectionne un stade pour le voir':phase==='injecting'?'Assemblage · '+Math.round((state?.progress||0)*100)+' %':phase==='retrieving'?'Transfert de la tenue…':'Glisse pour tourner la tenue';
   for(const [id,b]of Object.entries(heroButtons))b.setAttribute('aria-pressed',String(id===forgeHero));
   const selectedProfile=forgeProfile();for(const [id,b]of Object.entries(tierButtons)){const stage=Number(id),spec=ARMOR_STAGES[stage-1];b.setAttribute('aria-pressed',String(stage===forgeTier));b.disabled=busy(forgeHero);b.querySelector('[data-forge-badge]').textContent=stage===selectedProfile.equippedSuit?(lylu&&id===characterId&&civilMode?'EN CAPSULE':'ÉQUIPÉE'):stage<=selectedProfile.suitStage?'FABRIQUÉE':'PLAN NIVEAU '+spec.chapter;}
   const recipe=nanoRecipes(game).find(r=>r.id==='suit:'+forgeTier),owned=forgeTier<=selectedProfile.suitStage;
   material.textContent=selected.material+(owned?' · tenue fabriquée':' · plan niveau '+selected.planLevel+' · '+selected.cost+' NP');
   capabilities.textContent=ARMOR_STAGES[forgeTier-1].description;
   meter.hidden=phase!=='injecting';meter.value=state?.progress||0;
   status.textContent=phase==='preview'?(owned?'APERÇU · TENUE FABRIQUÉE':'APERÇU · '+(forgeHero===characterId?(recipe?.reason||'Plan et fabrication requis'):'Sélectionne '+forgeHero.toUpperCase()+' pour fabriquer cette tenue')):phase==='injecting'?'CENTRIFUGATION · '+Math.round((state?.progress||0)*100)+' %':
     phase==='loading'?'CHARGEMENT DES MODÈLES SHADOW UNIT…':
     phase==='ready'?'ARMURE TERMINÉE · SAS DISPONIBLE':
     phase==='open'?'SAS OUVERT · ACCÈS À LA TENUE':
     phase==='retrieving'?'TRANSFERT DE LA TENUE · SAS OUVERT':
     phase==='storing'?'RESTITUTION DE L’ARMURE':phase==='equipped'?'TENUE ÉQUIPÉE · CHAMBRE VIDE':
     phase==='error'?'CHARGEMENT IMPOSSIBLE · RELANCER':
     'RÉSERVOIR PRÊT · CHAMBRE VIDE';
   inject.disabled=busy(forgeHero)||wearing(forgeHero)||forgeHero===characterId&&!owned&&!recipe?.enabled;
   inject.textContent=forgeHero!==characterId?'APERÇU · SANS FABRICATION':owned?'RECOMPOSER LA TENUE':'FABRIQUER · '+selected.cost+' NP';
   recover.disabled=forgeHero!==characterId||busy(forgeHero)||(wearing(forgeHero)?!civil:!owned||!['ready','open','preview'].includes(phase)||state?.tier!==forgeTier||lylu&&!rig);
   recover.textContent=wearing(forgeHero)?'REPOSER L’ARMURE DANS SA CAPSULE':phase==='equipped'?'TENUE TRANSFÉRÉE':phase==='preview'&&owned?'ÉQUIPER CETTE TENUE':state?.doorOpen?'SAS OUVERT · ÉQUIPER':'OUVRIR LE SAS & ÉQUIPER';
  }};nanoUI.refresh();
  for(const hero of [characterId,otherHero]){const stage=hero===characterId?armorLevel:otherProfile.equippedSuit,state=nanoChambers.phase(hero);if(!wearing(hero)&&(state?.phase==='idle'||state?.phase==='preview'&&state.tier!==stage))void nanoChambers.preview(hero,stage).catch(error=>message('Aperçu indisponible : '+error.message,6));}
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
 $('view').onclick=()=>selectPlayView(view==='visit'?'third':'fps');
 $('overview-view').onclick=()=>setView(view==='overview'?lastPlayView:'overview');
 $('pause-button').onclick=pauseHideout;$('resume-button').onclick=resumeHideout;$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeHideout();});
 $('quit-button').onclick=()=>{saveCurrent();location.assign('./index.html');};
 $('pause-outfit').onclick=()=>pauseStation('outfits');$('pause-lore').onclick=()=>pauseStation('archive');
 $('pause-settings').onclick=()=>{$('pause-dialog').close();$('hideout-settings').showModal();};
 const backSettings=()=>{$('hideout-settings').close();$('pause-dialog').showModal();};
 $('settings-back').onclick=backSettings;$('hideout-settings').addEventListener('cancel',e=>{e.preventDefault();backSettings();});
 const viewOptions={getView:()=>lastPlayView==='visit'?'fps':'third',onSelect:selectPlayView};
 pauseViewControl=bindViewButton($('pause-view'),viewOptions);optionsViewControl=mountViewControl($('hideout-view-setting'),viewOptions);
 $('pause-help').onclick=()=>{$('pause-commands').open=true;$('pause-commands').scrollIntoView({block:'nearest'});};
 let settings={};try{settings=JSON.parse(localStorage.getItem('rosee-settings')||'{}');}catch{}
 $('hideout-music').checked=settings.music!==false;$('hideout-music').onchange=()=>{settings.music=$('hideout-music').checked;try{localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}setMusicEnabled(settings.music);};
 $('hideout-quality').value=savedQuality;$('hideout-quality').onchange=()=>{savedQuality=$('hideout-quality').value;settings.quality=savedQuality;try{localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}resize(graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu,rendererHint:params.get('renderer')},savedQuality));};
 if(lylu){$('civil-outfit').hidden=false;$('civil-portrait').hidden=false;setCivilMode(true);$('civil-outfit').onclick=()=>chooseStation('outfits');$('civil-portrait').onclick=()=>{if(!civil||!civilMode)return;setView(view==='portrait'?lastPlayView:'portrait');};}
 const pointers=new Map();let pinch=0;
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(opened||paused||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
 canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>7)p.moved=true;
  if(pointers.size===2&&view==='overview'){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch>0){overview.zoom=clamp(overview.zoom*d/pinch,.7,2.5);overview.updateProjectionMatrix();}pinch=d;for(const q of pointers.values())q.moved=true;}
  else if(view==='visit'||view==='third'){cameraYaw-=dx*.004;cameraPitch=clamp(cameraPitch-dy*.003,-.65,.3);}
 });
 canvas.addEventListener('pointerup',e=>{const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(!p||p.moved||opened||paused||view==='portrait')return;mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(art.root,true)[0];if(hit){const s=art.layout.stations.map(s=>({s,d:Math.hypot(s.x-hit.point.x,s.z-hit.point.z)})).sort((a,b)=>a.d-b.d)[0];if(s?.d<3){chooseStation(s.s.id);return;}}if(ray.ray.intersectPlane(floor,floorPoint))navigate(floorPoint);});
 for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>pointers.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{if(view!=='overview'||opened||paused)return;e.preventDefault();overview.zoom=clamp(overview.zoom*Math.exp(-e.deltaY*.001),.7,2.5);overview.updateProjectionMatrix();},{passive:false});
 window.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName))return;if(e.code==='Escape'){e.preventDefault();if(opened)closePanel();else if(paused)resumeHideout();else pauseHideout();return;}if(opened||paused)return;if(e.code==='KeyV'&&!e.repeat){selectPlayView(lastPlayView==='visit'?'third':'fps');return;}if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyF'&&!e.repeat&&near){if(civil?.snapshot().clip?.startsWith('fitness'))civil.playFitness(null);else openStation(near.id);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touch.x=touch.z=0;});
 const stick=$('stick'),knob=stick.querySelector('i');let stickPointer=null;
 const steer=e=>{const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,max=r.width*.34,n=Math.max(1,Math.hypot(dx,dz)/max);touch.x=dx/(n*max);touch.z=dz/(n*max);knob.style.transform='translate('+touch.x*max+'px,'+touch.z*max+'px)';};
 stick.onpointerdown=e=>{if(opened||paused)return;stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);steer(e);};stick.onpointermove=e=>{if(!paused&&!opened&&e.pointerId===stickPointer)steer(e);};for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.z=0;knob.style.transform='';}});
 $('action').onclick=()=>near&&openStation(near.id);
 window.addEventListener('resize',()=>resize(graphicsProfile({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu,rendererHint:params.get('renderer')},params.get('quality')||savedQuality)));
}
function updatePlayerCamera(){
 if(view==='third'){
  const p=game.player,sy=Math.sin(cameraYaw),cy=Math.cos(cameraYaw),distance=2.55;
  const start={x:p.x,y:1.40,z:p.z},end={x:p.x+sy*distance+cy*.32,y:1.85-Math.sin(cameraPitch)*distance,z:p.z+cy*distance-sy*.32};let fraction=1;
  for(const box of [...art.layout.colliders,...art.doorColliders]){if(box.noCollision)continue;const hit=segmentBox(start,end,{...box,hx:box.hx+.10,hz:box.hz+.10});if(hit!==null)fraction=Math.min(fraction,Math.max(.10,hit-.04));}
  third.position.set(start.x+(end.x-start.x)*fraction,start.y+(end.y-start.y)*fraction,start.z+(end.z-start.z)*fraction);third.lookAt(p.x-sy*.75,1.40+Math.sin(cameraPitch)*.8,p.z-cy*.75);
 }
 if(view==='visit'){
  const p=game.player;visit.position.set(p.x,1.65,p.z);visit.rotation.set(cameraPitch,cameraYaw,0,'YXZ');
 }
}
function fitnessStations(){return civilMode?(art?.layout.fitnessEquipment||[]).map(e=>({...e,id:'fitness-'+e.id,room:'gym',radius:1.0,action:'Tester '+e.name})):[];}
function update(dt){
 const control=pads.read(dt,keys,navigator.getGamepads?.()||[],{focused:!document.hidden});
 if(paused){updatePlayerCamera();if(control.pause)resumeHideout();return;}
 if(control.pause){if(opened)closePanel();else pauseHideout();return;}
 if(!opened&&(view==='visit'||view==='third')){cameraYaw-=control.lookX*dt;cameraPitch=clamp(cameraPitch-control.lookY*dt,-.65,.3);}
 if(!opened&&control.interact&&near){if(civil?.snapshot().clip?.startsWith('fitness'))civil.playFitness(null);else openStation(near.id);}
 if(healing){const h=healing;h.age+=dt;const u=Math.min(1,h.age/h.life);h.progress.value=u;if(h.rest)game.player.hp=h.startHP+(100-h.startHP)*u;game.player.shield=h.startShield+(game.shieldCapacity-h.startShield)*u;
  if(u>=1){if(h.rest)profile.rested=true;else{profile.recharged=true;game.ammo=WEAPONS.map(w=>w.capacity);game.dual.ammo={left:12,right:12};game.charges=4;}game.player.shield=game.shieldCapacity;saveCurrent();profile.rested=profile.rested||h.rest;profile.recharged=profile.recharged||!h.rest;saveHideoutProfile(characterId,profile);h.button.textContent=h.rest?'RÉGÉNÉRATION TERMINÉE':'ÉQUIPEMENT RECHARGÉ';$('close').disabled=false;healing=null;}
 }
 let x=control.moveX+touch.x,z=control.moveZ+touch.z,yaw=(view==='visit'||view==='third')?cameraYaw:0;
 if(opened||view==='portrait'){x=z=0;}
 else if(Math.hypot(x,z)>.12){civil?.playFitness(null);path=[];destination=null;}
 else if(path.length){const goal=path[0],dx=goal.x-game.player.x,dz=goal.z-game.player.z,d=Math.hypot(dx,dz);if(d<.18){path.shift();if(!path.length&&destination){const target=destination;destination=null;if(Math.hypot(game.player.x-target.x,game.player.z-target.z)<target.radius)openStation(target.id);}}else{yaw=-Math.atan2(dx,-dz);x=0;z=-Math.min(1,d/.4);}}
 art.updateDoors(dt,game.player,{moving:!opened&&Math.hypot(x,z)>.03});
 if(!opened&&view!=='portrait')game.step(dt,{x,z,yaw,moveYaw:yaw,sprint:control.sprint,gamepadMoving:control.gamepadMoving,touchMoving:!!(touch.x||touch.z)});
 moving=view!=='portrait'&&Math.hypot(game.playerVelocity?.x||0,game.playerVelocity?.z||0)>.15;
 if(rig){const m=rig.model;m.root.position.set(game.player.x,0,game.player.z);m.root.rotation.y=game.player.yaw;m.root.visible=(view==='overview'||view==='third')&&(!lylu||!civilMode);if(m.weapon!==game.weaponIndex)m.setWeapon(game.weaponIndex);if(!lylu||!civilMode)m.animate(game.time,moving,0,0,0,opened?0:dt,{velocity:game.playerVelocity,ground:()=>0,airborne:false,verticalSpeed:0,crouched:false,sprint:!!control.sprint,aim:false,firing:false});}
 if(civil)civil.update(clock,dt,{position:game.player,yaw:game.player.yaw,speed:Math.hypot(game.playerVelocity?.x||0,game.playerVelocity?.z||0),moving:!opened&&moving,sprint:!!control.sprint,velocity:game.playerVelocity,station:opened,visible:civilMode&&view!=='visit'});
 if(view==='portrait'){
  const p=game.player,angle=p.yaw;portrait.position.set(p.x-Math.sin(angle)*.83,1.64,p.z-Math.cos(angle)*.83);portrait.lookAt(p.x,1.65,p.z);
 }
 updatePlayerCamera();
 near=[...art.layout.stations,...fitnessStations()].map(s=>({s,d:Math.hypot(game.player.x-s.x,game.player.z-s.z)})).filter(o=>o.d<o.s.radius&&navigation.inRoom(game.player,o.s.room)).sort((a,b)=>a.d-b.d)[0]?.s||null;$('action').hidden=!near||!!opened;if(near)$('action').textContent='F · '+near.action;
 const status=[Math.ceil(game.player.hp),Math.ceil(game.player.shield),game.nano.profile.balance].join(':');if(status!==lastStatus){lastStatus=status;$('vitals').textContent='SANTÉ '+Math.ceil(game.player.hp)+' · BOUCLIER '+Math.ceil(game.player.shield);$('nanites').textContent=game.nano.profile.balance+' NP';}
 for(const e of game.drainEvents()){nanoFx.handle(e);if(e.type==='nano-crafted')message(e.name+' · assemblage terminé');if(e.type==='nano-error')message(e.message,7);}
 nanoFx.update(game,dt);nanoChambers?.update(dt,clock);art.updateEnhancements?.(clock);
 if(opened==='outfits')nanoUI?.refresh();
 if(performance.now()>messageUntil)$('notice').hidden=true;
}
async function paintOutfitPreview(){
 const p=outfitPreview;if(!p||opened!=='outfits')return;const state=nanoChambers.phase(p.hero);if(!state?.loaded||state.tier!==p.tier||state.phase==='loading')return;
 const angle=p.angle,key=[p.hero,p.tier,angle.toFixed(3),state.phase,Math.floor(state.progress*20)].join(':');if(p.painted===key)return;
 outfitTarget??=renderer.isWebGLRenderer?new WebGLRenderTarget(384,288):new T.RenderTarget(384,288);outfitTarget.texture.colorSpace=T.SRGBColorSpace;outfitCamera??=new T.PerspectiveCamera(34,4/3,.05,80);if(!nanoChambers.framePreview(p.hero,outfitCamera,angle))return;
 const previousTarget=renderer.getRenderTarget?.()||null;let bytes;
 try{renderer.setRenderTarget(outfitTarget);if(renderer.renderAsync)await renderer.renderAsync(scene,outfitCamera);else renderer.render(scene,outfitCamera);if(renderer.isWebGLRenderer){bytes=new Uint8Array(384*288*4);renderer.readRenderTargetPixels(outfitTarget,0,0,384,288,bytes);}else bytes=await renderer.readRenderTargetPixelsAsync(outfitTarget,0,0,384,288);}
 finally{renderer.setRenderTarget(previousTarget);}
 if(outfitPreview!==p||p.hero!==state.hero||p.tier!==state.tier)return;const pixels=new Uint8ClampedArray(384*288*4),stride=bytes.length/(288);for(let row=0;row<288;row++){const y=renderer.isWebGLRenderer?287-row:row;pixels.set(bytes.subarray(y*stride,y*stride+1536),row*1536);}p.canvas.getContext('2d').putImageData(new ImageData(pixels,384,288),0,0);p.canvas.dataset.modelStage=String(state.tier);p.canvas.dataset.modelHero=state.hero;p.canvas.dataset.modelAngle=String(angle);p.painted=key;
}
function frame(now){
 if(pending||!game)return;const dt=frameDelta(previous?(now-previous)/1000:.016);previous=now;if(!paused)clock+=dt;update(dt);pending=true;
 (async()=>{await art.renderExterior(renderer,camera,clock);if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);await paintOutfitPreview();})().then(()=>pending=false).catch(error=>{pending=false;console.error(error);message('Le rendu a été interrompu. Recharge la planque.',8);});
}

window.__PINK_HIDEOUT={snapshot:()=>({ready,version:GAME_VERSION,characterId,view,station:opened,pathLength:path.length,routeTarget:destination?.id,nextPoint:path[0]&&{x:path[0].x,z:path[0].z},simulationTime:game?.time,position:game&&{x:game.player.x,z:game.player.z},health:game?.player.hp,shield:game?.player.shield,weapon:game?.weapon.id,weaponIndex:game?.weaponIndex,owned:game&&[...game.ownedWeapons],armorLevel,nano:game?.nano.profile.balance,history:historyForHero(profile),completed:[...profile.completed],next:nextHideoutChapter(profile),source:art?.source,triangles:art?.triangles,batches:art?.batches,downloadBytes:art?.downloadBytes,surfaces:art?.surfaces,showcase:art?.showcase(),enhancements:art?.enhancements?.(),nanoChambers:nanoChambers?.snapshot(),doors:art?.doors(),city:art?.city(),backend:rendererBackend(renderer),renderBudget:renderer?.frameBudget?.stats(),heroReady:lylu?!!civil:!!rig,paused,civilMode,civilLoading,civil:civil?.snapshot()||null,healing:!!healing}),debug:params.has('debug')?{get game(){return game;},get scene(){return scene;},get camera(){return camera;},get renderer(){return renderer;},get art(){return art;},get nanoChambers(){return nanoChambers;},get civil(){return civil;},get time(){return clock;},openDoor:id=>art.openDoor(id),go:chooseStation,open:openStation,close:closePanel,teleport(x,z){if(navigation.free(x,z)){path=[];Object.assign(game.player,{x,z});}},look(yaw,pitch=-.12){cameraYaw=yaw;cameraPitch=pitch;game.player.yaw=yaw;},async captureFrame(){renderer.setAnimationLoop(null);const deadline=performance.now()+90000;while(pending){if(performance.now()>deadline)throw Error('Pending frame did not finish');await new Promise(r=>setTimeout(r,25));}update(.016);await art.renderExterior(renderer,camera,clock);if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);},navigation:()=>navigation,complete(level){profile.completed.push(level);profile.lastChapter=level;saveHideoutProfile(characterId,profile);}}:null};
void boot();
