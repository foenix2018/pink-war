import { ArenaGame, PORTAL, MAX_LEVEL, WEAPONS, clamp, segmentSphere, segmentBox, traceEnemyHit, COMBO_WINDOW, PICKUP_HEAL, comboMultiplier } from './game-logic.js';
import { createScene } from './scene.js?v=3.48';
import { VRController } from './vr.js';
import { EQUIPMENT, equipmentForCharacter } from './equipment.js';
import { characterForId } from './characters.js';
import { playLaserShot,playEnemyShot,loadRealLaserSample,loadCombatSamples,playLaserImpact,setLaserAudioEnabled,disposeLaserAudio,playWeaponAction,setWeaponCharge } from './laser-sound.js';
import { createAmbience } from './ambience.js';
import { ACTIVE_INSTALLATIONS, BRIDGES, BRIDGE_LANDINGS, BRIDGE_APPROACHES, bridgeSegments } from './world-layout.js';
import {setScreenMusic,screenMusicSnapshot} from './menu-music.js';
import { portalIndicators } from './portal-indicator.js';
import { objectiveIndicator } from './objective-guidance.js';
import { OPTICS } from './weapons.js';
import { createWeaponFeel } from './weapon-feel.js';
import { bladeSwingPose } from './blade-combat.js';
import { createSaberSound } from './saber-sound.js';
import { magnifiedFov, aimSensitivity, flatSightPose } from './optics.js';
import { CampaignLevel1 } from './campaign-level1.js';
import {attachCampaignStory} from './story-chapters.js';
import { ShootingRangeGame,traceTrainingTarget } from './shooting-range.js';
import {GAME_VERSION,showLaunchError} from './launch-ui.js';
import {syncMenuArtwork} from './menu-art.js';
import {createAICompanion} from './ai-companions.js';
import {createCompanionSkills} from './companion-skills.js';
import {createCompanionMenu} from './companion-menu.js';
import {createCompanionSkillFX} from './companion-skill-fx.js';
import {playFieldCue} from './m01-field-audio.js';
import {rangeHoldOffset} from './range-handling.js';
import {createRangeArmoryMenu} from './range-armory-menu.js';
import {writeM01Checkpoint} from './m01-checkpoint.js';
import {mountCombatHud} from './combat-hud.js';
import {createHudContrastControl} from './hud-appearance.js';
import {createArmorFeedback,meleeKick,MELEE_POSE} from './armor-feedback.js';

const $ = id => document.getElementById(id);
const settings = { sound: true, music: true, sensitivity: 1, quality: 'auto' };
let narrativeCompanion=null,companionScene=null,companionHero=null;
let companionSkills=null,skillMenu=null,skillFX=null,skillGame=null;
try { Object.assign(settings, JSON.parse(localStorage.getItem('rosee-settings') || '{}')); } catch {}
const boot=window.__PINKWAR_BOOT_OPTIONS;
if(boot?.settings)Object.assign(settings,boot.settings);
settings.sensitivity = clamp(Number(settings.sensitivity) || 1, .4, 2);
if (!['auto', 'low', 'high'].includes(settings.quality)) settings.quality = 'auto';
let phase = 'lobby', view = boot?.view==='third'?'third':'fps', yaw = 0, pitch = -.075, game, world, vr;
let character=characterForId('ghju');
let m01CheckpointGame=null,m01CheckpointStage=null,m01CheckpointPending=false;
let combatHud=null,armorFx=null,armorFxScene=null,meleeQueued=false,chargeQueued=false,touchSprinting=false;
let rangeArmoryMenu=null;
function syncRangeArmory(){
  if(game?.mode==='training'&&!rangeArmoryMenu)rangeArmoryMenu=createRangeArmoryMenu({getGame:()=>game,
    onChoose(index){if(!game.selectFromArmory(index))return false;trainingWeaponIndex=index;try{localStorage.setItem('pink-war-training-weapon',String(index));}catch{}world.setWeapon(index);updateHud();return true;},
    onChange(open){resetInput();if(open){document.dispatchEvent(new CustomEvent('pw-hud-overlay'));if(vr.mode!=='xr')document.exitPointerLock?.();}}
  });
  rangeArmoryMenu?.sync({active:phase==='playing'&&!recovering,xrMode:vr?.mode==='xr'});
}
// Every session wears the armour layer of 3.63 (shield, strike, impulse charges).
const armed=session=>{session.enableArmorShield();return session;};
const heroAccent=()=>character.id==='lylu'?0x80baff:0xef91b4;
function armorFeedback(){
  // The scene changes when the renderer is recovered: rebuild the effects on the live one.
  if(armorFxScene!==world.scene){armorFx?.dispose();armorFxScene=world.scene;
    armorFx=createArmorFeedback({T:world.T,scene:world.scene,accent:heroAccent(),haptic:kind=>vr?.haptic(kind),listener:()=>game?.player,
      audio:()=>settings.sound&&audioContext?.state==='running'?audioContext:null});}
  return armorFx;
}
function armorView(){
  const camera=vr?.mode==='xr'?world.renderer.xr.getCamera():world.camera,origin=new world.T.Vector3(),direction=new world.T.Vector3();
  camera.getWorldPosition(origin);camera.getWorldDirection(direction);
  // In third person the camera trails behind: throw from the soldier's chest instead.
  if(vr?.mode!=='xr'&&view!=='fps')origin.set(game.player.x,(game.player.elevation||0)+1.5,game.player.z);
  return {origin,direction};
}
const armorTouch=(kind,value)=>{if(kind==='sprint'){touchSprinting=!!value;return;}if(phase!=='playing')return;audioReady();if(kind==='melee')meleeQueued=true;else if(kind==='charge')chargeQueued=true;else if(kind==='reload')game.reload();else if(kind==='next')game.cycleWeapon();else if(kind==='interact')pickupQueued=true;else if(kind==='crouch')crouchQueued=true;};
function armorActions(input){
  if(meleeQueued||input.melee){const {direction}=armorView();game.melee({x:direction.x,z:direction.z});}
  if(chargeQueued||input.charge){const {origin,direction}=armorView();game.throwCharge({x:origin.x+direction.x*.45,y:origin.y-.18,z:origin.z+direction.z*.45},direction);}
  meleeQueued=chargeQueued=false;
}
let selectedMode=['arena','training','campaign','campaign2'].includes(boot?.mode)?boot.mode:'campaign',launchBusy=false;
let trainingWeaponIndex=Number.isInteger(boot?.trainingWeaponIndex)&&boot.trainingWeaponIndex>=0&&boot.trainingWeaponIndex<7&&boot.trainingWeaponIndex!==5?boot.trainingWeaponIndex:0;
function selectMode(mode){
  if(phase!=='lobby'||launchBusy)return;
  selectedMode=['campaign','campaign2','arena','training'].includes(mode)?mode:'campaign';
  syncMenuArtwork(character.id,selectedMode);
  for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===selectedMode));
  $('mission-title').textContent=selectedMode==='campaign2'?'02 — Sous les Néons':selectedMode==='campaign'?'01 — Le dernier signal':selectedMode==='arena'?'Survie — Les brèches':'Centre de tir — Qualification';
  $('mission-description').textContent=selectedMode==='campaign2'?'Bas-Niveaux de Vesper : marchés, ruelles pluvieuses, enclave de secours et archives HELIX.':selectedMode==='campaign'?'Ancien poste de secours, évacuation interrompue, journal clandestin et relais ORDRE à saboter. Retrouver une trace de votre famille.':selectedMode==='arena'?'Vingt vagues de machines, six armes et des équipements à récupérer.':'Cibles fixes, proches et lointaines ; trajectoires latérales et avant-arrière ; accélération continue. Mesurez votre précision.';
  if(world)$('play-label').textContent=selectedMode==='campaign2'?'JOUER LE NIVEAU 2':selectedMode==='campaign'?'JOUER LE NIVEAU 1':selectedMode==='arena'?'LANCER LA SURVIE':'ENTRER AU STAND DE TIR';
}
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>selectMode(button.dataset.mode);
// The range armory only exists in-game: a touch/click station for the five weapons.
for(const button of document.querySelectorAll('[data-range-weapon]'))button.onclick=()=>{
  if(phase!=='playing'||game?.mode!=='training')return;
  const index=Number(button.dataset.rangeWeapon);
  if(!Number.isInteger(index)||!game.ownedWeapons.has(index))return;
  if(game.selectWeapon(index)){
    trainingWeaponIndex=index;
    try{localStorage.setItem('pink-war-training-weapon',String(index));}catch{}
    world.setWeapon(game.weaponIndex);
    updateHud();
  }
};
try{character=characterForId(localStorage.getItem('pink-war-character'));}catch{}
if(boot?.characterId)character=characterForId(boot.characterId);
let clock = 0, lastTime = 0, hudTimer = 0, flashTimer = 0, recoil = 0, reloadLift = 0, announcementUntil = 0, damageUntil = 0, pickupNotice = null;
let outfitReturn = 'lobby', previewLevel = 1, equipmentUntil = 0;
let canvasPointer = null, lastDrag = null, audioContext = window.__PINKWAR_BOOT_AUDIO||null, ambience = null;
let saberAudio=null,saberSwingSound=false;
let lastWeaponSlot=0,holsterRemaining=0;
let bladeHead=null;
const weaponFeel=createWeaponFeel();
let portalForward=null;
let reloadInserted=false,lastShotAt=-99;
const move = { x: 0, y: 0, id: null }, look = { x: 0, y: 0, id: null };
const keys = new Set(), firingPointers = new Set();
let jumpQueued = false, pickupQueued = false,crouchQueued=false,firePressQueued=false;
let crouchCameraBlend=0, currentSprinting=false, aimBlend=0, aiming=false, mouseAim=false;
const aimPointers=new Set();
const persist = () => { try { localStorage.setItem('rosee-settings', JSON.stringify(settings)); } catch {} };
const timeString = time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

function audioReady() {
  setScreenMusic(['lobby','outfit'].includes(phase)?'menu':phase==='loading'?'loading':'gameplay',selectedMode==='campaign2'?2:1,settings.music!==false);
  ambience?.setEnabled(settings.sound);
  if(audioContext)setLaserAudioEnabled(audioContext,settings.sound);
  if (!settings.sound && settings.music===false) return;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    ambience ||= createAmbience(audioContext,{installations:ACTIVE_INSTALLATIONS});
    saberAudio ||= createSaberSound(audioContext);
    ambience.setEnabled(settings.sound);setLaserAudioEnabled(audioContext,settings.sound);
    if(settings.sound){void loadRealLaserSample(audioContext);void loadCombatSamples(audioContext);}
  } catch {}
}
function tone(frequency, end, duration = .1, volume = .055, type = 'triangle', delay = 0) {
  if (!settings.sound || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), t = audioContext.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(Math.max(end, 20), t + duration);
  gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration); oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(t); oscillator.stop(t + duration + .02); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function weaponShotSound(weapon,power=1){if(settings.sound)playLaserShot(audioContext,weapon,power);}
function syncSound() {
  $('sound-setting').checked = !!settings.sound;
  $('music-setting').checked=settings.music!==false;
  $('sound-button').ariaLabel = settings.sound ? 'Désactiver le son' : 'Activer le son';
  $('sound-button').title = $('sound-button').ariaLabel;
  $('sound-button').innerHTML = settings.sound ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
}
$('settings-dialog').insertBefore(createHudContrastControl(),$('settings-dialog').querySelector('.close-dialog:last-child'));
syncSound(); $('sensitivity').value = settings.sensitivity; $('quality').value = settings.quality;
$('sound-button').onclick = () => { settings.sound = !settings.sound; syncSound(); audioReady(); persist(); };
$('sound-setting').onchange = e => { settings.sound = e.target.checked; syncSound(); audioReady(); persist(); };
$('music-setting').onchange=e=>{settings.music=e.target.checked;audioReady();persist();};
$('sensitivity').oninput = e => { settings.sensitivity = Number(e.target.value); persist(); };
$('quality').onchange = e => { settings.quality = e.target.value; world?.resize(settings.quality); persist(); };

function selectCharacter(id,save=true){
  if(phase!=='lobby')return;
  const next=characterForId(id),changed=next.id!==character.id;character=next;
  syncMenuArtwork(character.id,selectedMode);
  document.documentElement.dataset.universe=character.universe;
  for(const button of document.querySelectorAll('[data-character]')){
    const selected=button.dataset.character===character.id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
  }
  $('character-choice-status').textContent=`${character.name} · ${character.universeName}`;
  $('lobby-character-name').textContent=$('hud-character-name').textContent=character.name;
  $('character-ready').textContent=character.masculine?'PRÊT AU COMBAT':'PRÊTE AU COMBAT';
  $('character-description').innerHTML=character.masculine?'LYLU. Séparé de sa sœur GHJU pendant la chute.<br class="desktop-break">Dans les ruines, les machines veillent encore.':'GHJU. Séparée de son frère LYLU pendant la chute.<br class="desktop-break">Dans les ruines, les machines veillent encore.';
  $('help-character').textContent=`BRIEFING / ${character.name}`;$('help-color').textContent=`Du ${character.colorWord}.`;
  $('pause-character').textContent=`${character.name} / EN ATTENTE`;
  $('pause-title').textContent='En pause.';
  $('outfit-character').textContent=`ATELIER / ${character.name}`;
  $('outfit-button').ariaLabel=`Voir les armures et accessoires de ${character.name}`;
  $('outfit-rotation').ariaLabel=`Faire tourner ${character.name}`;
  $('arsenal-title').innerHTML=`La puissance<br>en ${character.colorWord}.`;
  world?.setCharacter(character.id);combatHud?.setCharacter(character.id);armorFx?.setAccent(heroAccent());
  if(changed&&game){game.reset(character.id);world.resetDynamic();world.setWeapon(game.weaponIndex);world.setEquipment(1);resetInput();updateHud();}
  if(save)try{localStorage.setItem('pink-war-character',character.id);}catch{}
}
for(const button of document.querySelectorAll('[data-character]'))button.onclick=()=>selectCharacter(button.dataset.character);
selectCharacter(character.id,false);

function resetInput() {
  combatHud?.reset();touchSprinting=false;
  vr?.desktopGamepads?.reset();
  if(vr&&vr.mode!=='xr'){vr.previous?.clear();vr.desktopPadKey=null;}
  meleeQueued=chargeQueued=false;keys.clear(); firingPointers.clear(); aimPointers.clear(); firePressQueued=false; mouseAim=false; aiming=false; aimBlend=0; document.body.classList.remove('scoped','aiming'); $('aim-button')?.setAttribute('aria-pressed','false'); jumpQueued = false; pickupQueued = false;crouchQueued=false; canvasPointer = null; lastDrag = null;
  for (const s of [move, look]) { s.x = 0; s.y = 0; s.id = null; }
  for (const id of ['move-stick', 'look-stick']) $(id).querySelector('.joystick-knob').style.transform = '';
  $('fire-button').classList.remove('firing');
  if (game) { game.charge = 0; game.triggerHeld = false;game.semiPending=false; }
}
function attachJoystick(id, state) {
  const area = $(id), ring = area.querySelector('.joystick-ring'), knob = area.querySelector('.joystick-knob');
  const release = e => { if (e.pointerId !== state.id) return; state.x = 0; state.y = 0; state.id = null; knob.style.transform = ''; };
  function update(e) {
    const r = ring.getBoundingClientRect(), radius = r.width * .32;
    let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; const distance = Math.hypot(x, y);
    if (distance > radius) { x *= radius / distance; y *= radius / distance; }
    state.x = Math.abs(x / radius) < .08 ? 0 : x / radius; state.y = Math.abs(y / radius) < .08 ? 0 : y / radius;
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }
  area.addEventListener('pointerdown', e => { if (phase !== 'playing' || state.id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); state.id = e.pointerId; try { area.setPointerCapture(e.pointerId); } catch {} update(e); });
  area.addEventListener('pointermove', e => { if (e.pointerId !== state.id) return; if (e.pointerType === 'mouse' && e.buttons === 0) { release(e); return; } e.preventDefault(); update(e); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) area.addEventListener(event, release);
  for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, release);
}
attachJoystick('move-stick', move); attachJoystick('look-stick', look);
$('fire-button').addEventListener('pointerdown', e => { if (phase !== 'playing') return; e.preventDefault(); audioReady(); firePressQueued=true; firingPointers.add(e.pointerId); try { e.target.closest('button').setPointerCapture(e.pointerId); } catch {} $('fire-button').classList.add('firing'); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('fire-button').addEventListener(type, e => { firingPointers.delete(e.pointerId); if (!firingPointers.size) $('fire-button').classList.remove('firing'); });
$('crouch-button').addEventListener('click',()=>{if(phase==='playing')crouchQueued=true;});
$('pickup-button').addEventListener('click', () => { if(phase === 'playing')pickupQueued = true; });
$('aim-button').addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();aimPointers.add(e.pointerId);try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('aim-button').addEventListener(type,e=>aimPointers.delete(e.pointerId));
$('jump-button').addEventListener('pointerdown', e => { if (phase !== 'playing') return; e.preventDefault(); jumpQueued = true; });
$('jump-button').addEventListener('click', e => { if (e.detail === 0 && phase === 'playing') jumpQueued = true; });

function selectView(next) {
  view = vr?.active ? 'fps' : next;
  for (const button of document.querySelectorAll('[data-view]')) { const selected = button.dataset.view === view; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); }
  $('game-view-label').textContent = view === 'fps' ? 'VUE FPS' : 'VUE 3e PERSONNE';
  $('view-button').title = view === 'fps' ? 'Passer en troisième personne (V)' : 'Passer en vue FPS (V)';
}
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => selectView(button.dataset.view);
selectView(view); $('view-button').onclick = () => selectView(view === 'fps' ? 'third' : 'fps');

function pause() { if (phase !== 'playing') return; setScreenMusic('gameplay');ambience?.pause(); phase = 'paused'; resetInput(); if (vr?.mode !== 'xr') $('pause-dialog').showModal(); }
function resume() { if (phase !== 'paused') return; for (const d of document.querySelectorAll('dialog[open]')) d.close(); phase = 'playing'; resetInput(); audioReady(); }
function openPanel(id) { if (phase === 'playing') { phase = 'paused'; resetInput();setScreenMusic('gameplay');ambience?.pause(); } for (const d of document.querySelectorAll('dialog[open]')) d.close(); $(id).showModal(); }
function closePanel(dialog) { if(dialog.id==='outfit-dialog'){closeOutfit();return;} dialog.close(); if (phase === 'paused') $('pause-dialog').showModal(); }
$('pause-button').onclick = pause; $('resume-button').onclick = resume;
$('how-button').onclick = () => openPanel('help-dialog'); $('settings-button').onclick = () => openPanel('settings-dialog'); $('pause-help').onclick = () => openPanel('help-dialog');
$('lore-button').onclick=()=>openPanel('lore-dialog');
$('pause-lore').onclick=()=>openPanel('lore-dialog');
$('pause-settings').onclick=()=>openPanel('settings-dialog');
for (const button of document.querySelectorAll('.close-dialog')) button.onclick = () => closePanel(button.closest('dialog'));
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', e => { e.preventDefault(); if (dialog.id === 'outfit-dialog') closeOutfit(); else if (dialog.id === 'pause-dialog') resume(); else if (dialog.id !== 'end-dialog') closePanel(dialog); });
  dialog.addEventListener('click', e => { if (e.target !== dialog || ['pause-dialog', 'end-dialog'].includes(dialog.id)) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePanel(dialog); });
}
function showOutfitLevel(level) {
  previewLevel=level;const equipment=equipmentForCharacter(level,character.id),current=Math.max(1,game.wave);
  $('outfit-title').textContent=equipment.name+'.';$('outfit-description').textContent=equipment.description;
  $('outfit-count').textContent=`${String(level).padStart(2,'0')} / 10`;
  $('outfit-status').textContent=level===current?'TENUE ACTUELLE':level>current?`APERÇU · AU NIVEAU ${level}`:'ÉTAPE PRÉCÉDENTE';
  for(const button of $('outfit-levels').children){const selected=Number(button.dataset.level)===level;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
}
function openOutfit() {
  if(!world||vr?.active)return;outfitReturn=phase;phase='outfit';resetInput();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  document.body.classList.add('outfit-mode');world.setInspection(true);$('outfit-rotation').value=165;
  $('outfit-levels').replaceChildren();
  for(const stage of EQUIPMENT){
    const equipment=equipmentForCharacter(stage.level,character.id);
    const button=document.createElement('button');button.dataset.level=equipment.level;
    button.className='outfit-level';button.title=equipment.addition;
    button.innerHTML=`<small>${String(equipment.level).padStart(2,'0')}</small><span>${equipment.name}</span>${equipment.level>Math.max(1,game.wave)?'<b>◇</b>':'<b>✓</b>'}`;
    button.onclick=()=>showOutfitLevel(equipment.level);$('outfit-levels').append(button);
  }
  showOutfitLevel(Math.max(1,game.wave));$('outfit-dialog').showModal();
}
function closeOutfit() {
  $('outfit-dialog').close();document.body.classList.remove('outfit-mode');world.setInspection(false);phase=outfitReturn;
  world.camera.clearViewOffset();world.setEquipment(Math.max(1,game.wave));resetInput();lastTime=0;
  if(phase==='lobby')world.lobby(clock,Math.max(1,game.wave));
  else{world.sync(game,clock,0);updateCamera();if(phase==='paused')$('pause-dialog').showModal();else if(phase==='over')$('end-dialog').showModal();}
}
$('outfit-button').onclick=$('hud-outfit-button').onclick=$('pause-outfit').onclick=openOutfit;
$('outfit-front').onclick=()=>{$('outfit-rotation').value=180;};$('outfit-back').onclick=()=>{$('outfit-rotation').value=0;};

async function home() {
  if (vr?.active) await vr.exit();
  for (const d of document.querySelectorAll('dialog[open]')) d.close(); phase = 'lobby'; resetInput();
  document.body.classList.remove('playing'); $('game-hud').hidden = true; setScreenMusic('gameplay');ambience?.pause();world.resetDynamic();
  saberAudio?.update({active:false,equipped:false});
  world.setRangeActive(false);world.setCampaignActive(false);selectMode(selectedMode);
  $('damage-flash').style.setProperty('--injury', '0'); $('damage-flash').classList.remove('active'); $('wave-announcement').classList.remove('show');
}
$('quit-button').onclick = home; $('end-home').onclick = home;
async function start() {
  if(selectedMode==='campaign2'){
    location.assign('./level2-test.html?character='+encodeURIComponent(character.id)+'&source=campaign');return;
  }
  if (!world||launchBusy) return;
  launchBusy=true;
  selectView('fps');
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  world.setCampaignActive(selectedMode==='campaign');
  world.setRangeActive(selectedMode==='training');
  game=armed(selectedMode==='campaign'?new CampaignLevel1(world.obstacles,Math.random,character.id):
    selectedMode==='training'?new ShootingRangeGame(world.obstacles,Math.random,trainingWeaponIndex,character.id):new ArenaGame(world.obstacles,Math.random,null,character.id));
  world.resetDynamic(); phase = 'loading'; yaw = 0; pitch = -.075;
  weaponFeel.reset();reloadInserted=false;lastShotAt=-99;flashTimer = 0; recoil = 0; damageUntil = 0; announcementUntil = 0;pickupNotice=null;equipmentUntil=0;crouchCameraBlend=0;currentSprinting=false; resetInput(); audioReady();
  world.setWeapon(game.weaponIndex);world.setEquipment(1);
  lastWeaponSlot=0;holsterRemaining=0;
  try{
    if(!vr?.active){
      $('loading-title').textContent=selectedMode==='campaign'?'Le dernier signal':selectedMode==='training'?'Stand de tir':'Les brèches';
      $('loading-status').textContent='Préparation du secteur…';$('loading-screen').hidden=false;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      world.campaignArt.update(game,clock);world.sync(game,clock,0);updateCamera();
      await world.warm();
    }
    phase='playing';lastTime=0;audioReady();
    document.body.classList.add('playing'); $('game-hud').hidden = false; $('game-tip').style.opacity = '1'; updateHud();
  }catch(error){console.error('Chargement du niveau',error);await recoverGraphics(error,'préparation du niveau');}
  finally{launchBusy=false;$('loading-screen').hidden=true;}
}
$('play-button').onclick = start; $('retry-button').onclick = start;
function continueSurvival(){
  if(!game.startEndless())return;
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  phase='playing';resetInput();lastTime=0;audioReady();updateHud();
}
$('survival-button').onclick=continueSurvival;
$('reload-button').onclick = () => { if(phase==='playing') game.reload(); };
$('weapon-button').onclick = () => { if(phase==='playing') game.cycleWeapon(); };
$('arsenal-button').onclick = () => {
  $('weapon-list').replaceChildren();
  WEAPONS.forEach((w,index) => {
    const button = document.createElement('button'), available = game.ownedWeapons.has(index);
    button.className = 'weapon-card' + (game.weaponIndex===index ? ' selected' : ''); button.disabled = !available;
    const kenney=world.fpsGun.userData.kenneyAssets,kenneyReady=!w.melee&&(!!kenney?.loadedByIndex?.[index]||!!world.fpsGun.userData.weaponModels[index]?.userData.authored);
    button.innerHTML = `<span><strong>${w.name}</strong><small>${w.label} · ${w.melee?'énergie continue · parade':`${w.capacity} charges`}${w.chargeTime?' · tir chargé':''}<br>${w.melee?'Sabre AURORA':kenneyReady?'CHÂSSIS MK IV · MÉTAL ET CÉRAMIQUE':'CHARGEMENT DE L’ARME'}</small></span><b>${available?(game.weaponIndex===index?'ÉQUIPÉE':'ÉQUIPER'):`NIVEAU ${w.level}`}</b>`;
    button.onclick = () => { game.selectWeapon(index); world.setWeapon(game.weaponIndex); updateHud(); resume(); };
    $('weapon-list').append(button);
  });
  openPanel('arsenal-dialog');
};
window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Escape') { if (phase === 'playing') { e.preventDefault(); pause(); } return; }
  if (phase !== 'playing') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyV' && !e.repeat) selectView(view === 'fps' ? 'third' : 'fps');
  if (e.code === 'KeyR' && !e.repeat) game.reload();
  if (e.code === 'KeyE' && !e.repeat) game.cycleWeapon();
  if (e.code === 'KeyF' && !e.repeat) pickupQueued = true;
  if (e.code === 'KeyC' && !e.repeat) crouchQueued=true;
  if (e.code === 'KeyX' && !e.repeat) meleeQueued=true;
  if (e.code === 'KeyB' && !e.repeat) chargeQueued=true;
  keys.add(e.code);if(e.code==='Space'&&!e.repeat)firePressQueued=true;if(e.code==='KeyJ'&&!e.repeat)jumpQueued=true;
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('pointerup',e=>{firingPointers.delete(e.pointerId);if(e.button===2)mouseAim=false;});
window.addEventListener('pointercancel',e=>{firingPointers.delete(e.pointerId);mouseAim=false;aimPointers.clear();});
window.addEventListener('blur', () => { resetInput(); if (phase === 'playing' && vr?.mode !== 'xr') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (phase === 'playing' && vr?.mode !== 'xr') pause(); } });
window.addEventListener('pagehide',event=>{ambience?.pause();setScreenMusic('gameplay');saberAudio?.update({active:false,equipped:!!game?.weapon.melee});if(!event.persisted){ambience?.dispose();saberAudio?.dispose();if(audioContext)disposeLaserAudio(audioContext);}});
window.addEventListener('resize', () => { world?.resize(settings.quality); resetInput(); });

function updateCamera() {
  world.camera.clearViewOffset();
  if (vr?.mode === 'xr') { vr.positionRig(); return; }
  const { T, camera, soldier, weapon } = world, p = game.player;
  const feel=weaponFeel.state,flatScreen=vr?.mode!=='stereo';
  const hold=game.mode==='training'&&flatScreen?rangeHoldOffset(game.time,{moving:Math.hypot(game.playerVelocity?.x||0,game.playerVelocity?.z||0)>.25,aiming,crouched:p.crouched,heat:feel.heat}):{pitch:0,yaw:0,recoilScale:.2};
  const cameraYaw = yaw + hold.yaw + (vr?.mode==='stereo' && vr.sensor ? vr.phoneYaw : 0)+(flatScreen?feel.yaw*.06:0), cameraPitch = clamp(pitch + hold.pitch + (vr?.mode==='stereo' && vr.sensor ? vr.phonePitch : 0) + (flatScreen?feel.pitch*hold.recoilScale:0), -1.2, 1.2);
  const optic=world.fpsGun.userData.optics?.[game.weaponIndex]?.cfg||OPTICS[game.weapon.id],normalFov=view==='fps'?72:64;
  camera.fov=normalFov+(optic?(magnifiedFov(normalFov,optic.magnification)-normalFov)*aimBlend:0);
  camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
  const elevation = p.elevation || 0;
  // Camera follows the same crouch transition as the real soldier pelvis, not a sudden teleport.
  const cameraEye=(character.masculine?1.71:1.61)-.55*crouchCameraBlend;
  const cameraShoulder=(character.masculine?1.49:1.41)-.45*crouchCameraBlend;
  if (view === 'fps') { camera.position.set(p.x, cameraEye + elevation, p.z); world.setPlayerVisible(false); weapon.visible = true; }
  else {
    world.setPlayerVisible(true); weapon.visible = false;
    const distance = 5.1, start = { x: p.x, y: cameraShoulder + elevation, z: p.z };
    const end = { x: p.x + Math.sin(yaw) * distance * Math.cos(pitch) + Math.cos(yaw) * .65,
      y: cameraShoulder + elevation - Math.sin(pitch) * distance, z: p.z + Math.cos(yaw) * distance * Math.cos(pitch) - Math.sin(yaw) * .65 };
    let nearest = 1;
    for (const box of world.obstacles) { const hit = segmentBox(start, end, { ...box, hx: box.hx + .2, hz: box.hz + .2 }); if (hit !== null) nearest = Math.min(nearest, Math.max(.09, hit - .05)); }
    camera.position.set(start.x + (end.x - start.x) * nearest, Math.max(.35, start.y + (end.y - start.y) * nearest), start.z + (end.z - start.z) * nearest);
  }
  const bob = Math.hypot(move.x, move.y) > .1 || keys.has('KeyW') || keys.has('KeyZ') || keys.has('KeyS');
  const ads=flatSightPose(optic,aimBlend);
  const heldFeel=game.weapon.dual?{yaw:0,kick:0,pitch:0}:feel;
  weapon.position.set(ads.x+heldFeel.yaw*.15, ads.y + (bob ? Math.sin(clock * 11) * .009*(1-aimBlend) : 0) - heldFeel.kick*.18 + reloadLift * .045, ads.z + heldFeel.kick - reloadLift * .028);
  weapon.rotation.set(heldFeel.pitch + reloadLift * Math.PI / 2,heldFeel.yaw+ads.yaw,Math.sin(clock * 1.8) * .003-heldFeel.yaw*.35+ads.roll);
  if(game.weapon.melee){const slash=bladeSwingPose(game.bladePhase,game.bladeSlashSide);weapon.rotation.x=slash.x-.12;weapon.rotation.y=slash.y;weapon.rotation.z=slash.z;}
  else{const strike=meleeKick(game);if(strike){weapon.position.x+=MELEE_POSE.x*strike;weapon.position.y+=MELEE_POSE.y*strike;weapon.position.z+=MELEE_POSE.z*strike;weapon.rotation.x+=MELEE_POSE.pitch*strike;}}
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
function reloadPose() {
  if (!game?.weapon || game.reloadRemaining <= 0) return 0;
  const progress = clamp(1 - game.reloadRemaining / game.weapon.reload, 0, 1), ease = t => t * t * (3 - 2 * t);
  return progress < .2 ? ease(progress / .2) : progress < .58 ? 1 : 1 - ease((progress - .58) / .42);
}
function updateWeaponVisuals(dt, firing, moving) {
  const reloading = game.reloadRemaining > 0, reloadProgress = reloading ? clamp(1 - game.reloadRemaining / game.weapon.reload, 0, 1) : 0;
  reloadLift = reloadPose();
  const state = { ammo: game.ammo[game.weaponIndex], capacity: game.weapon.capacity, charge: game.weapon.chargeTime ? game.charge : 0,
    reloadProgress, reloading, time: game.time,heat:weaponFeel.state.heat,kick:weaponFeel.state.kick,impulse:weaponFeel.state.impulse,
    bladeHeld:!!game.weapon.melee&&!!firing,dualState:game.dual };
  world.fpsGun.userData.setCombatState?.(state); world.soldier.gun.userData.setCombatState?.(state);
  const trigger = firing && !reloading && game.state === 'playing' ? 1 : 0;
  // The actual shared LYLU/GHJU rig now receives locomotion on EVERY desktop/mobile view.
  // In FPS it is invisible, but its cycle remains synchronized when the player switches to 3P.
  // WebXR deliberately keeps the player mesh hidden: tracked controllers own the visible hands.
  if (vr?.mode !== 'xr') {
    world.soldier.animate(clock, moving, recoil, reloadLift, trigger, dt, {
      airborne: !game.player.grounded, verticalSpeed: game.player.verticalSpeed,
      crouched: game.player.crouched, firing: trigger>0,
      sprint: currentSprinting, aim: !!(aiming||firing||game.charge>0),saberSwing:game.weapon.melee?bladeSwingPose(game.bladePhase,game.bladeSlashSide):null
    });
    if (view === 'fps') world.fpsGun.userData.animateHands?.(trigger, trigger ? .34 : .18, reloadLift, dt);
  }
}
function aim(hand=game.weapon.dual?game.nextDualHand:'right') {
  if (vr?.mode==='xr') return vr.aim(hand);
  const { T, camera } = world, forward = new T.Vector3(); camera.getWorldDirection(forward);
  // Shots leave the muzzle of the weapon the hand is holding.
  const origin = new T.Vector3(), gun = view === 'fps' ? world.fpsGun : world.soldier.gun;
  if (view !== 'fps') world.soldier.root.updateMatrixWorld(true);
  const muzzle=gun.userData.flashFor?.(hand)||gun.userData.flash;
  muzzle.updateWorldMatrix(true, false); muzzle.getWorldPosition(origin);
  const far = camera.position.clone().addScaledVector(forward, 160); let target = far, nearest = 1;
  for (const box of world.obstacles) { const hit = segmentBox(camera.position, far, box); if (hit !== null && hit < nearest) { nearest = hit; target = camera.position.clone().lerp(far, hit); } }
  for (const enemy of game.enemies) {
    const center = { x: enemy.x, y: (enemy.elevation || 0) + (enemy.aimHeight ?? (enemy.elite ? 1.35 : 1.15)), z: enemy.z };
    const hit = traceEnemyHit(camera.position,far,enemy);
    if (hit && hit.t < nearest) { nearest = hit.t; target = camera.position.clone().lerp(far,hit.t); }
  }
  // Converge the muzzle on the surface actually under the reticle, just as
  // walls already do. A silhouette outside that eye ray never attracts a shot.
  if(game.mode==='training')for(const plate of game.targets){
    const hit=traceTrainingTarget(camera.position,forward,plate,game.time);
    if(hit){const fraction=camera.position.distanceTo(new T.Vector3(hit.point.x,hit.point.y,hit.point.z))/160;
      if(fraction<nearest){nearest=fraction;target=new T.Vector3(hit.point.x,hit.point.y,hit.point.z);}}
  }
  const direction = target.clone().sub(origin).normalize(); return { origin, direction };
}

function announce(title, subtitle) {
  $('wave-announcement').innerHTML = `<small>${subtitle}</small><strong>${title}</strong>`;
  $('wave-announcement').classList.add('show'); announcementUntil = clock + 2.6;
}
function handleEvents() {
  for (const event of game.drainEvents()) {
    if(game.mode==='campaign'&&settings.sound&&audioContext){if(['circuit-isolated','workshop-power'].includes(event.type))playFieldCue(audioContext,'isolate',{source:event,listener:game.player,yaw:listenerHeading()});if(event.type==='portals'&&event.count>0)for(const site of event.sites)playFieldCue(audioContext,'breach',{source:site,listener:game.player,yaw:listenerHeading()});}
    armorFeedback().handle(event);
    if(event.type==='campaign'){
      if(vr.mode!=='xr')announce(event.title,event.subtitle);
      tone(410,680,.16,.025,'sine');
    }
    if (event.type === 'shot') {
      world.laserShot?.(event);
      const feel=weaponFeel.fire(event.weapon,event.power,game.player.crouched||aiming);
      lastShotAt=clock;recoil=feel.pitch;flashTimer=feel.flash;vr.haptic('shot', event.weapon,event.hand); weaponShotSound(event.weapon, event.power);
    }
    if(event.type==='training-hit'){
      // Permanent marks belong to the articulated plate, not the empty world
      // coordinates it leaves behind when folding into its carrier.
      world.impact?.({...event,noDecal:true});
      world.burst(event.x,event.y,event.z,0xffce83,event.weapon==='m12'?18:9);
      if(settings.sound&&audioContext){
        const distance=Math.hypot(event.x-game.player.x,event.z-game.player.z);
        const heading=listenerHeading(),pan=((event.x-game.player.x)*Math.cos(heading)-(event.z-game.player.z)*Math.sin(heading))/Math.max(1,distance);
        playLaserImpact(audioContext,{surface:'metal',distance,pan,power:event.power});
      }
      const marker=$('hit-marker');marker.classList.remove('hit');void marker.offsetWidth;marker.classList.add('hit');
      vr.haptic('hit');
    }
    if(event.type==='training-control'){if(settings.sound&&audioContext)playWeaponAction(audioContext,game.weapon.id,'reload-in');}
    if(event.type==='training-stage'){if(vr.mode!=='xr')announce(event.label,'NOUVEL EXERCICE · VITESSE CROISSANTE');tone(460,820,.24,.03,'sine');}
    if(event.type==='training-escaped'){tone(240,130,.09,.01,'triangle');}
    if(event.type==='blade-swing'){saberSwingSound=true;vr.haptic('shot','aurora');}
    if(event.type==='blade-hit'||event.type==='blade-parry'){world.impact({...event,enemy:event.type==='blade-hit'});if(settings.sound)saberAudio?.impact();vr.haptic(event.type==='blade-parry'?'parry':'hit');}
    if (event.type === 'weapon-offer') { tone(360, 820, .45, .03, 'sine'); }
    if (event.type === 'wave') { const offered=WEAPONS.find((w,i)=>w.level===event.wave&&!game.ownedWeapons.has(i)); if(game.mode!=='campaign')announce(game.endless?`SURVIE / VAGUE ${event.wave}`:`NIVEAU ${String(event.wave).padStart(2, '0')} / ${MAX_LEVEL}`, offered && event.wave>1 ? `${offered.name} DISPONIBLE AU FAISCEAU · APPROCHEZ-VOUS` : `${event.count} CRÉATURES · LA BRÈCHE S’OUVRE`); tone(210, 420, .25, .065); tone(420, 630, .25, .06, 'triangle', .2); }
    if (event.type === 'equipment') { const equipment=equipmentForCharacter(event.level,character.id);world.setEquipment(event.level);$('equipment-unlock-title').textContent=`${equipment.name} · NIV. ${event.level}`;$('equipment-unlock-detail').textContent=equipment.addition;equipmentUntil=clock+4;$('equipment-unlock').hidden=false; }
    if (event.type === 'clear'&&game.mode!=='campaign') { announce('NIVEAU TERMINÉ', '+ BONUS · LA BRÈCHE SE RECHARGE'); tone(420, 700, .25, .07); }
    if (event.type === 'weapon') { weaponFeel.reset();recoil=0;flashTimer=0;world.setWeapon(game.weaponIndex); vr.haptic('weapon'); tone(510, 760, .1, .03); }
    if (event.type === 'jump') {tone(event.kind==='wall'?240:165,110,.075,.012);vr.haptic('jump');}
    if (event.type === 'land') tone(105, 55, .075, .013);
    if (event.type === 'reload') { reloadInserted=false;vr.startReloadGesture(); vr.haptic('reload');if(settings.sound){if(game.ammo[game.weaponIndex]===0)playWeaponAction(audioContext,game.weapon.id,'empty');playWeaponAction(audioContext,game.weapon.id,'reload-out');} }
    if (event.type === 'reloaded') { vr.haptic('reloaded');if(settings.sound)playWeaponAction(audioContext,game.weapon.id,'reload-ready'); }
    if (event.type === 'spawn') world.burst(event.x, event.y??1, event.z, world.palette.violet, 7);
    if (event.type === 'probe-charge') { const d=Math.hypot(event.x-game.player.x,event.z-game.player.z);tone(760,1300,.35,.022/(1+d*.065),'sine'); }
    if(event.type==='enemy-shot'&&settings.sound&&audioContext)playEnemyShot(audioContext,{form:event.form,source:event,listener:game.player,yaw:listenerHeading(),occluded:game.blocked(event,{x:game.player.x,y:game.player.elevation+1.5,z:game.player.z})});
    if (event.type === 'impact') {
      world.impact?.(event);
      if(settings.sound){
        const dx=event.x-game.player.x,dz=event.z-game.player.z;
        const distance=Math.hypot(dx,dz,event.y-game.player.elevation-1.3);
        const heading=listenerHeading(),pan=(dx*Math.cos(heading)-dz*Math.sin(heading))/Math.max(1,distance);
        playLaserImpact(audioContext,{surface:event.surface,distance,pan,splash:event.splash,power:event.power});
      }
    }
    if (event.type === 'hit') { vr.haptic('hit'); if(event.zone==='head')tone(1300,680,.075,.032); const marker = $('hit-marker'); marker.classList.remove('hit'); void marker.offsetWidth; marker.classList.add('hit'); tone(300, 190, .06, .035); }
    if (event.type === 'kill') { vr.haptic('kill'); world.burst(event.x, event.y, event.z, world.palette.violet, 12); tone(130, 50, .15, .06, 'square'); }
    if (event.type === 'combo') {
      vr.haptic('combo',event.count);tone(380+event.count*80,760+event.count*110,.13,.03,'triangle');
    }
    if (event.type === 'pickup-drop') { world.burst(event.x, event.y + .6, event.z, event.kind==='heal'?world.palette.rose:world.palette.pale, 10); tone(620, 980, .14, .018, 'sine'); }
    if (event.type === 'pickup') {
      world.burst(event.x, event.y, event.z, event.kind==='heal'?world.palette.rose:world.palette.pale, 18); vr.haptic('pickup');
      tone(event.kind==='heal'?520:700, event.kind==='heal'?1040:1400, .2, .035, 'sine');
      pickupNotice={text:event.kind==='heal'?`SOIN +${PICKUP_HEAL}`:'CELLULE · ARME RECHARGÉE',until:clock+1.6};
    }
    if (event.type === 'damage') { damageUntil = clock + .25; vr.haptic('damage'); tone(80, 35, .18, .08, 'triangle'); }
    if (event.type === 'over') gameOver(false);
    if (event.type === 'win') gameOver(true);
  }
}
function gameOver(won = false) {
  $('end-dialog')?.querySelector('.pw-story-card')?.remove();
  $('end-dialog')?.querySelector('.pw-story-next')?.remove();
  setScreenMusic('gameplay');ambience?.pause(); phase = 'over'; resetInput(); let best = game.score;
  try { best = Math.max(game.score, Number(localStorage.getItem('rosee-best')) || 0); localStorage.setItem('rosee-best', String(best)); } catch {}
  $('end-eyebrow').textContent = won ? `MISSION ACCOMPLIE / NIVEAU ${MAX_LEVEL}` : 'TRANSMISSION INTERROMPUE';
  $('end-title').innerHTML = won ? `La brèche est fermée.<br>Le ${character.colorWord} a gagné.` : 'Chaque aube<br>est un nouveau départ.';
  $('end-message').textContent = won ? `Vous avez survécu aux ${MAX_LEVEL} niveaux. Continuez en survie ou rejouez la campagne.` : 'La brèche a gagné cette bataille. La prochaine est à vous.';
  $('survival-button').hidden=!won;
  $('retry-button').textContent = won ? 'REJOUER LA CAMPAGNE →' : 'UNE NOUVELLE AUBE →';
  if(game.mode==='campaign'){
    $('end-eyebrow').textContent=won?'NIVEAU 1 TERMINÉ / ARCHIVE SAUVEGARDÉE':'LE DERNIER SIGNAL / ESSAI INTERROMPU';
    $('end-title').innerHTML=won?'Une trace.<br>Un espoir.':'Le signal<br>vous attend.';
    $('end-message').textContent=won?`Une intervention récente porte l’indicatif ${character.id==='ghju'?'LYLU':'GHJU'}. Destination suivante : les Bas-Niveaux de Vesper. Le niveau 2 est désormais accessible.`:'Reprenez depuis l’entrée du laboratoire. Activez le courant, consultez l’archive, puis rejoignez le relais en hauteur.';
    $('survival-button').hidden=true;$('retry-button').textContent='REJOUER LE NIVEAU 1 →';
    if(won)attachCampaignStory($('end-dialog'),{level:1,characterId:character.id});
  }
  $('end-score').textContent = game.score; $('end-wave').textContent = game.wave; $('end-time').textContent = timeString(game.time); $('best-label').textContent = best;
  if (vr?.mode !== 'xr') $('end-dialog').showModal();
}
function updateHud() {
  if(game?.mode==='campaign'){if(m01CheckpointGame!==game||m01CheckpointStage!==game.stage){m01CheckpointGame=game;m01CheckpointStage=game.stage;m01CheckpointPending=true;}if(m01CheckpointPending&&writeM01Checkpoint(game))m01CheckpointPending=false;}
  const train=game?.mode==='training';
  $('training-hud').hidden=!train;
  for(const button of document.querySelectorAll('[data-range-weapon]')){
    const selected=train&&Number(button.dataset.rangeWeapon)===game.weaponIndex;
    button.setAttribute('aria-pressed',String(selected));
    button.classList.toggle('selected',selected);
  }
  if(train){
    const stage=game.trainingLevel;
    $('training-stage').textContent=game.trainingActive?`EXERCICE ${stage.number}/5 · ${stage.label}`:'STAND EN ATTENTE · COMMANDE DANS VOTRE BOX';
    $('training-score').textContent=String(game.score).padStart(5,'0');
    $('training-accuracy').textContent=game.trainingAccuracy+' %';
    $('training-hits').textContent=`${game.trainingHits} / ${game.trainingShots}`;
    $('training-arsenal').textContent=game.trainingActive?'CIBLES ACTIVES · INTERRUPTEUR POUR ARRÊTER':'INTERRUPTEUR AMBRÉ · F / ACTION POUR DÉCLENCHER';
    $('training-combo').textContent=`×${game.trainingCombo}`;
    $('training-speed').textContent=!game.trainingActive?'Chronomètre arrêté':game.trainingLevel.number===5?`×${game.trainingMotionSpeed.toFixed(1)}`:`${Math.ceil(stage.remaining)} s avant la suite`;
  }
  updatePortalHUD();
  const equipment=equipmentForCharacter(game.wave,character.id);
  $('gear-label').textContent=`TENUE ${String(equipment.level).padStart(2,'0')} · ${equipment.name.toUpperCase()}`;
  // Shared combat HUD (same panels as M01 and M02); the legacy readouts below stay for their own logic.
  (combatHud ||= mountCombatHud({characterId:character.id,lobbyPage:true,onAction:armorTouch})).update(game);
  $('health-label').textContent = Math.ceil(game.player.hp); $('health-bar').style.width = `${game.player.hp}%`;
  $('health-status').textContent = game.regenerating?'RÉGÉNÉRATION':'SANTÉ';
  document.querySelector('.vitals').classList.toggle('regenerating', game.regenerating);
  document.querySelector('.vitals').classList.toggle('critical', game.player.hp<30);
  $('wave-label').textContent = game.endless?`SURVIE / VAGUE ${game.wave}`:`NIVEAU ${String(Math.max(1, game.wave)).padStart(2, '0')} / ${MAX_LEVEL}`;
  $('weapon-button').innerHTML = `${game.weapon.name} <span>⌄</span>`;
  $('weapon-button').disabled = game.unlockedWeapons.length < 2;
  $('crouch-button').setAttribute('aria-pressed',String(!!game.player.crouched));
  $('crouch-button').classList.toggle('active',!!game.player.crouched);
  const nearby=game.nearbyWeapon();const pickup=$('pickup-button');
  pickup.hidden=!nearby;pickup.textContent=nearby?`RÉCUPÉRER ${WEAPONS[nearby.index].name} · F / X`:'';
  const interaction=game.getInteraction?.();
  combatHud.setContext(interaction?.label||(nearby?'Récupérer '+WEAPONS[nearby.index].name:null));
  combatHud.setObjective({label:game.mode==='training'?(game.trainingActive?'STAND · '+game.trainingLevel.number+'/05':'STAND · EN ATTENTE'):game.mode==='campaign'?'MISSION 01':'VAGUE '+String(Math.max(1,game.wave)).padStart(2,'0')+'/20',detail:game.mode==='training'?(game.trainingActive?game.trainingLevel.label+' · Score '+game.score+' · Précision '+game.trainingAccuracy+' %':'Activez le bouton ambré dans votre box · F / ACTION'):game.mode==='campaign'?(game.campaign?.subtitle||'Rejoindre le relais des archives.'):'Repousser les machines et récupérer les armes des brèches.'});
  if(interaction){pickup.hidden=false;pickup.textContent=`${interaction.label} · F`;pickup.ariaLabel=interaction.label;}
  $('ammo-label').textContent = game.weapon.melee?'∞':game.ammo[game.weaponIndex];
  $('ammo-capacity').textContent = game.weapon.melee?'':`/ ${game.weapon.capacity}`;
  $('ammo-state').textContent = game.weapon.melee?(game.triggerHeld?'LAME ACTIVE':'LAME RÉTRACTÉE'):game.reloadRemaining>0?'RECHARGE':'CELLULES';
  document.body.classList.toggle('blade-equipped',!!game.weapon.melee);document.body.classList.toggle('blade-guard',!!game.bladeGuard);
  document.querySelector('.weapon-tag').classList.toggle('ammo-low',!game.weapon.melee&&game.ammo[game.weaponIndex]<=game.weapon.capacity*.25);
  $('aim-button').ariaLabel=game.weapon.melee?'Parer avec la lame':'Viser avec l’optique';$('aim-button').title=game.weapon.melee?'Parade : clic droit / gâchette gauche':'Visée : clic droit / gâchette gauche';
  const reloading = game.reloadRemaining>0;
  document.querySelector('.fire-area').classList.toggle('reloading', reloading);
  $('reload-button').disabled = reloading || game.ammo[game.weaponIndex]===game.weapon.capacity;
  $('fire-caption').innerHTML = game.weapon.melee?'MAINTENIR LA LAME <small>ESPACE / GÂCHETTE DROITE</small>':reloading ? `RECHARGE ${game.reloadRemaining.toFixed(1)} S` : game.weapon.chargeTime ? 'TIR CHARGÉ <small>MAINTENIR · RELÂCHER</small>' : 'TIR LASER <small>MAINTENIR · ESPACE</small>';
  $('charge-bar').style.width = `${(reloading ? 1-game.reloadRemaining/game.weapon.reload : game.charge)*100}%`;
  const pending=game.weaponOffers[0];
  const distanceToWeapon=pending?Math.round(Math.hypot(pending.x-game.player.x,pending.z-game.player.z)):0;
  $('enemy-label').textContent=pending
    ? `ARME ${WEAPONS[pending.index].name} · FAISCEAU À ${distanceToWeapon} M`
    : game.nextWave > 0 && game.wave > 0 ? `NIVEAU SUIVANT DANS ${Math.ceil(game.nextWave)} S`
    : `${game.enemies.length + game.toSpawn} CRÉATURES À REPOUSSER`;
  $('score-label').textContent = String(game.score).padStart(5, '0');
  // Streak badge: a just-collected pickup takes it over for a moment, then the kill streak and its fading window.
  const streak=game.time<=game.comboUntil?game.combo:0,badge=$('combo-label'),notice=pickupNotice&&clock<pickupNotice.until;
  badge.hidden=!notice&&streak<2;badge.classList.toggle('pickup',!!notice);
  if(notice)badge.textContent=pickupNotice.text;
  else if(streak>=2){badge.textContent=`SÉRIE ×${streak} · POINTS ×${comboMultiplier(streak).toLocaleString('fr-FR')}`;badge.style.setProperty('--left',String(Math.max(0,game.comboUntil-game.time)/COMBO_WINDOW));} $('time-label').textContent = timeString(train?game.trainingElapsed:game.time);
  const radar = $('radar'), c = radar.getContext('2d'), size = radar.width, scale = .7, cx = size / 2, cy = size / 2;
  const radarTheme=character.radar;
  c.clearRect(0, 0, size, size); c.fillStyle = radarTheme.background; c.fillRect(0, 0, size, size);
  c.strokeStyle = radarTheme.frame; c.lineWidth = 1; c.strokeRect(20, 20, 140, 140);
  c.strokeStyle = radarTheme.grid; for (let n = 20; n <= 160; n += 35) { c.beginPath(); c.moveTo(n, 20); c.lineTo(n, 160); c.moveTo(20, n); c.lineTo(160, n); c.stroke(); }
  // Tactical map: 25 m sectors, industrial area names and a short-range sweep.
  c.save();c.lineWidth=.7;c.strokeStyle=radarTheme.frame;c.setLineDash([3,4]);
  for(const [wx,wz,ww,dd] of [[-55,7,31,40],[61,10,39,37],[45,54,36,20],[-30,-55,23,30]]){
    c.strokeRect(cx+(wx-ww/2)*scale,cy+(wz-dd/2)*scale,ww*scale,dd*scale);
  }
  c.setLineDash([]);c.strokeStyle=radarTheme.grid;
  c.beginPath();c.arc(cx+game.player.x*scale,cy+game.player.z*scale,24,0,Math.PI*2);c.stroke();
  c.font='bold 9px monospace';c.textAlign='center';c.fillStyle=radarTheme.player;
  c.fillText('N',cx,14);c.fillText('S',cx,175);
  c.fillText('FRET',cx-55*scale,cy+7*scale-12);
  c.fillText('INDUS',cx+61*scale,cy+10*scale-12);
  c.fillText('TECH',cx+45*scale,cy+54*scale-12);
  c.restore();
  // Distinguish solid ground cover from elevated, walkable steel: raised
  // bridges must not look like impassable walls on the tactical radar.
  c.fillStyle=radarTheme.wall;
  for(const b of world.obstacles){
    if(b.walkableSurface||b.bridgeRail||(b.y||0)>2.2)continue;
    c.fillRect(cx+(b.x-b.hx)*scale,cy+(b.z-b.hz)*scale,b.hx*2*scale,b.hz*2*scale);
  }
  c.save();c.fillStyle=character.accent;c.globalAlpha=.47;
  for(const deck of BRIDGE_LANDINGS)
    c.fillRect(cx+(deck.x-deck.hx)*scale,cy+(deck.z-deck.hz)*scale,deck.hx*2*scale,deck.hz*2*scale);
  for(const ramp of BRIDGE_APPROACHES)
    c.fillRect(cx+(ramp.x-ramp.halfWidth)*scale,cy+ramp.topZ*scale,ramp.halfWidth*2*scale,(ramp.bottomZ-ramp.topZ)*scale);
  for(const bridge of BRIDGES)for(const [a,b] of bridgeSegments(bridge)){
    const x1=bridge.x1+(bridge.x2-bridge.x1)*a,x2=bridge.x1+(bridge.x2-bridge.x1)*b;
    c.fillRect(cx+Math.min(x1,x2)*scale,cy+(bridge.z-bridge.halfWidth)*scale,Math.abs(x2-x1)*scale,bridge.halfWidth*2*scale);
  }
  c.restore();
  // Every opened breach gets its own tactical marker, including emerging ones.
  for(const gate of game.activePortals){
    const px=cx+gate.x*scale,pz=cy+gate.z*scale,active=game.time>=gate.openedAt;
    c.save();c.strokeStyle=active?'#fa8fd5':'#85758e';c.lineWidth=active?2:1;
    c.beginPath();c.arc(px,pz,active?5:3,0,Math.PI*2);c.stroke();
    if(active){c.fillStyle='#ffd1f0';c.font='bold 8px monospace';c.fillText('BRÈCHE',px,pz-9);}
    c.restore();
  }
  // Weapon beacons are marked on the tactical radar until deliberately collected.
  for(const offer of game.weaponOffers){
    const x=cx+offer.x*scale,z=cy+offer.z*scale,pulse=4+2*Math.sin(clock*6);
    c.save();c.strokeStyle='#ffe8a9';c.fillStyle='#fff7c2';c.lineWidth=2;
    c.beginPath();c.arc(x,z,pulse,0,Math.PI*2);c.stroke();
    c.fillRect(x-2,z-2,4,4);c.font='bold 9px monospace';c.fillText('ARME',x,z-10);
    c.restore();
  }
  for (const e of game.enemies) { c.fillStyle = e.elite ? radarTheme.elite : radarTheme.enemy; c.beginPath(); c.arc(cx + e.x * scale, cy + e.z * scale, 2.6, 0, Math.PI * 2); c.fill(); }
  c.save(); c.translate(cx + game.player.x * scale, cy + game.player.z * scale); c.rotate(-yaw); c.fillStyle = radarTheme.player; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(0, 2); c.lineTo(-4, 4); c.closePath(); c.fill(); c.restore();
  if (game.time > 9) $('game-tip').style.opacity = '0';
}
function updatePortalHUD(){
  if(!world||!game)return;
  const heading=listenerHeading();
  const hint=phase==='playing'?objectiveIndicator(game.guidance?.(),game.player,heading,game.state):null;
  const guide=$('objective-guide');guide.hidden=!hint||vr.mode==='xr';
  if(hint){
    guide.style.setProperty('--direction',String(hint.offset));
    guide.classList.toggle('behind',hint.behind);guide.classList.toggle('arrived',hint.arrived);
    guide.querySelector('b').textContent=hint.behind?(hint.turn<0?'‹':'›'):hint.elevation>0?'↑':hint.elevation<0?'↓':'';
    guide.setAttribute('aria-label',`${hint.label} · ${Math.round(hint.distance)} mètres${hint.behind?' · derrière vous':''}`);
    guide.title=guide.getAttribute('aria-label');
  }
  const dots=portalIndicators(game.activePortals,game.player,heading,game.time,game.state),strip=$('portal-indicator');
  strip.hidden=!!hint||!dots.length;
  while(strip.children.length<dots.length){const dot=document.createElement('i');dot.className='portal-dot';strip.append(dot);}
  [...strip.children].forEach((dot,i)=>{
    const marker=dots[i];dot.hidden=!marker;if(!marker)return;
    dot.style.left=`${50+marker.offset*46}%`;dot.style.opacity=String(marker.opacity);
    dot.style.marginTop=`${i*2}px`;dot.classList.toggle('behind',marker.behind);dot.classList.toggle('pending',marker.pending);
    dot.title=`${marker.pending?'Brèche en formation':'Brèche active'}${marker.behind?' · derrière':''}`;
  });
}
function listenerHeading(){
  portalForward ||= new world.T.Vector3();world.camera.getWorldDirection(portalForward);
  return Math.atan2(-portalForward.x,-portalForward.z);
}
let frames = 0, recovering = false,recoveryPromise=null,recoveryAttempts=0;
async function recoverGraphics(error,stage='rendu'){
  if(recoveryPromise)return recoveryPromise;
  if(!world||!game||recoveryAttempts>=2){
    recovering=false;phase='error';resetInput();setScreenMusic('gameplay');ambience?.pause();
    showLaunchError(error,stage,world?.backend);return false;
  }
  recoveryAttempts++;recovering=true;
  const returnPhase=phase==='loading'?'playing':phase;
  resetInput();saberAudio?.update({active:false,equipped:false});
  $('loading-status').textContent='Rétablissement automatique du rendu…';
  if(!vr.active)$('loading-screen').hidden=false;
  recoveryPromise=(async()=>{
    try{
      if(vr.mode==='xr')await vr.exit();
      const next=await world.recover({quality:'low'});world=next;
      world.setCampaignActive(selectedMode==='campaign');
      world.setRangeActive(selectedMode==='training');
      game.replaceObstacles(world.obstacles);
      window.dispatchEvent(new CustomEvent('rosee-renderer-recovered'));
      if(vr.mode==='stereo'){vr.removeHUD();vr.makeHUD();}
      world.campaignArt.update(game,clock);
      if(returnPhase==='playing'||returnPhase==='paused'||returnPhase==='over'){world.sync(game,clock,0);updateCamera();}
      else if(returnPhase==='outfit')world.outfit(clock,previewLevel,Number($('outfit-rotation').value)*Math.PI/180);
      else world.lobby(clock,Math.max(1,game.wave));
      await world.warm();world.render();
      phase=returnPhase;lastTime=0;recovering=false;$('loading-error').hidden=true;
      if(phase==='playing'){document.body.classList.add('playing');$('game-hud').hidden=false;audioReady();}
      updateHud();world.renderer.setAnimationLoop(frame);return true;
    }catch(failure){
      console.error('Rétablissement 3D',failure);recovering=false;phase='error';setScreenMusic('gameplay');ambience?.pause();
      showLaunchError(failure,'rétablissement',world?.backend);return false;
    }finally{$('loading-screen').hidden=true;recoveryPromise=null;}
  })();
  return recoveryPromise;
}
window.addEventListener('pink-war-context-lost',()=>{if(world&&!recovering)void recoverGraphics(new Error('Le contexte graphique a été perdu.'));});
function bindCanvas() {
  // Rebind drag input after a graphics recovery replaces the canvas context.
  const canvas = $('world');
  if (canvas.dataset.controlsBound) return;
  canvas.dataset.controlsBound = 'true';
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&phase==='playing'){firingPointers.add(e.pointerId);firePressQueued=true;audioReady();}});
  canvas.addEventListener('pointerdown',e=>{if(e.button===2&&phase==='playing'){e.preventDefault();mouseAim=true;}});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===1&&phase==='playing'){e.preventDefault();meleeQueued=true;}});
  canvas.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
  canvas.addEventListener('pointerdown', e => { if ((e.pointerType==='mouse'&&e.button!==0)||phase !== 'playing' || canvasPointer !== null || (e.pointerType!=='mouse' && e.clientX < window.innerWidth*.5)) return; e.preventDefault(); canvasPointer = e.pointerId; lastDrag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch {} });
  canvas.addEventListener('pointermove', e => { if (phase !== 'playing' || e.pointerId !== canvasPointer || !lastDrag) return; const fine=aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend);yaw -= (e.clientX - lastDrag.x) * .004 * settings.sensitivity*fine; pitch = clamp(pitch - (e.clientY - lastDrag.y) * .004 * settings.sensitivity*fine, -.85, .7); lastDrag = { x: e.clientX, y: e.clientY }; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, e => { if (e.pointerId === canvasPointer) { canvasPointer = null; lastDrag = null; } });
}
window.addEventListener('rosee-renderer-recovered', () => { $('world').removeAttribute('data-controls-bound'); bindCanvas(); $('renderer-label').textContent = `${world.backend.toUpperCase()} · CONÇU POUR LE TACTILE`; });
function frame(timestamp, xrFrame) {
  try{stepFrame(timestamp,xrFrame);}catch(error){console.error('Rendu interrompu',error);void recoverGraphics(error);}
}
function stepFrame(timestamp, xrFrame) {
  if(recovering||phase==='error'){rangeArmoryMenu?.sync({active:false,xrMode:vr?.mode==='xr'});return;}
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : .016; lastTime = timestamp; clock += dt;
  const feel=weaponFeel.update(dt);recoil=feel.pitch;flashTimer=feel.flash;
  // The standard Bluetooth/USB gamepad is available outside VR as well.
  syncRangeArmory();const vrInput = vr.input(xrFrame);
  skillMenu?.setVisible(phase==='playing');
  if(vr.mode!=='xr')skillMenu?.xrInput({enabled:false});
  // Illustrated menus do not need a full city render behind their opaque image.
  // Keep polling the controllers so the same entry actions remain responsive.
  if((phase==='lobby'||phase==='loading')&&!vr.active)return;
  world.animatePortal(clock);
  if (phase === 'lobby') world.lobby(clock,Math.max(1,game.wave));
  if (phase === 'outfit') world.outfit(clock,previewLevel,Number($('outfit-rotation').value)*Math.PI/180);
  if (phase === 'playing' && !recovering && !skillMenu?.isOpen && !rangeArmoryMenu?.isOpen) {
    const sensitivity = settings.sensitivity*(vr.mode==='xr'?1:aimSensitivity(OPTICS[game.weapon.id]?.magnification,aimBlend));
    yaw -= (look.x * 1.8 + vrInput.turn * 1.6 + (keys.has('ArrowRight') ? 1.4 : 0) - (keys.has('ArrowLeft') ? 1.4 : 0)) * sensitivity * dt;
    yaw -= vrInput.snap;
    pitch = clamp(pitch + (-look.y * 1.35 - vrInput.tilt * 1.35 + (keys.has('ArrowUp') ? 1.15 : 0) - (keys.has('ArrowDown') ? 1.15 : 0)) * sensitivity * dt, -.85, .7);
    yaw %= Math.PI * 2;
    const x = move.x + vrInput.x + (keys.has('KeyD') ? 1 : 0) - ((keys.has('KeyA') || keys.has('KeyQ')) ? 1 : 0);
    const z = move.y + vrInput.z + (keys.has('KeyS') ? 1 : 0) - ((keys.has('KeyW') || keys.has('KeyZ')) ? 1 : 0);
    const facing = yaw + (vr.mode==='stereo' && vr.sensor ? vr.phoneYaw : 0);
    let moveYaw = facing;
    if(vr.mode==='xr')moveYaw=vr.movementYaw(facing);
    if(jumpQueued)game.player.jumpHeld=false;
    const jump = jumpQueued || vrInput.jump || keys.has('KeyJ'); jumpQueued = false;
    const crouchToggle=crouchQueued||vrInput.crouchToggle;crouchQueued=false;
    aiming=!!OPTICS[game.weapon.id]&&!game.reloadRemaining&&(vr.mode==='xr'?vrInput.aim:mouseAim||aimPointers.size>0||vrInput.precision);
    aimBlend+=(Number(aiming)-aimBlend)*(1-Math.exp(-dt*14));
    document.body.classList.toggle('aiming',aiming);document.body.classList.toggle('scoped',aiming&&game.weapon.id==='lance'&&vr.mode==='off');
    $('aim-button').setAttribute('aria-pressed',String(aiming));
    currentSprinting=!aiming&&(touchSprinting||vrInput.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'));
    game.step(dt, { x, z, yaw: facing, moveYaw, sprint: currentSprinting, jump,crouchToggle });
    crouchCameraBlend+=(Number(game.player.crouched)-crouchCameraBlend)*Math.min(1,dt*8);
    if(pickupQueued||vrInput.pickup){game.collectWeapon();pickupQueued=false;syncRangeArmory();}
    armorActions(vrInput);
    const moving = Math.hypot(x, z) > .1;
    world.sync(game, clock, dt);
    world.campaignArt.update(game,clock);armorFeedback().update(game,dt);
    // Track the outgoing saber separately from the new firearm. The player sees
    // AURORA descend to the bottom-left before the new weapon appears.
    if(game.weaponIndex!==lastWeaponSlot){
      if(lastWeaponSlot===5&&game.weaponIndex!==5&&world.holsterGun){
        holsterRemaining=.48;
        const blade=world.holsterGun.userData.blade;
        blade?.deployInstant(game.time);
      }
      lastWeaponSlot=game.weaponIndex;
    }
    if(world.holsterGun){
      holsterRemaining=Math.max(0,holsterRemaining-dt);
      const t=1-holsterRemaining/.48,active=holsterRemaining>0&&(vr.mode==='xr'||view==='fps');
      world.holsterGun.visible=active;
      if(active){
        world.holsterGun.position.set(-.25-.27*t,-.24-.56*t,-.56+.09*t);
        world.holsterGun.rotation.set(.12+.28*t,0,-.22-1.3*t);
        world.holsterGun.userData.setCombatState({time:game.time,bladeHeld:false});
      }
    }
    const firing = vr.mode==='xr' ? vrInput.fire : !!(firingPointers.size || keys.has('Space') || vrInput.fire || game.weapon.semiAuto&&firePressQueued);
    // Pose the authentic IK skeleton BEFORE raycasting. In 3P the projectile now leaves the
    // current crouched/armed muzzle instead of the preceding frame's hand positions.
    updateWeaponVisuals(dt, firing, moving); updateCamera();
    // Firearms appear once the outgoing hilt has passed the belt line.
    if(vr.mode!=='xr'&&view==='fps')world.fpsGun.visible=holsterRemaining<=.21;
    if(game.weapon.semiAuto&&firePressQueued)game.triggerHeld=false;firePressQueued=false;
    // Release is a real state transition for AURORA: never leave a sword active
    // after the trigger, headset tracking or scene focus is released.
    if(game.state==='playing'&&vr.mode==='xr'&&game.weapon.dual){
      for(const hand of ['right','left']){const target=aim(hand);game.triggerHand(hand,vrInput.fireHands[hand],dt,target.origin,target.direction);}
    }
    else if (game.state==='playing' && (firing || game.charge>0)) { const target=aim(); game.trigger(firing,dt,target.origin,target.direction); }
    else if(game.weapon.melee){game.trigger(false,dt,null,null);}
    else {game.triggerHeld=false;game.semiPending=false;}
    handleEvents(); updateCamera();
    if(game.weapon.melee){
      const gun=vr.mode==='xr'?vr.heldGun():view==='fps'?world.fpsGun:world.soldier.gun;
      if(vr.mode==='xr')gun?.userData.setCombatState?.({time:game.time,bladeHeld:!!game.triggerHeld});
      bladeHead ||=new world.T.Vector3();world.camera.getWorldPosition(bladeHead);
      game.updateBlade(gun?.userData.getBladeSegment?.(),dt,vr.mode==='xr'?vrInput.aim:mouseAim||aimPointers.size>0||vrInput.precision,bladeHead);
      handleEvents();
    }
    world.fpsGun.userData.setSight?.(aiming,world.camera);
    hudTimer -= dt; if (hudTimer <= 0) { if (vr.mode !== 'xr') updateHud(); hudTimer = .1; }
  }
  if(phase!=='playing'&&world?.holsterGun){world.holsterGun.visible=false;holsterRemaining=0;lastWeaponSlot=game.weaponIndex;}
  const audioActive=phase==='playing'&&!recovering&&!document.hidden&&!rangeArmoryMenu?.isOpen;
  saberAudio?.update({active:audioActive,equipped:!!game.weapon.melee,extended:!!game.weapon.melee&&!!game.triggerHeld,
    sound:settings.sound,speed:game.bladeSpeed,swing:saberSwingSound});saberSwingSound=false;
  const heading=listenerHeading();
  ambience?.update(dt,{active:audioActive,position:game.player,yaw:heading,
    moving:phase==='playing',elevation:game.player.elevation,onLift:!!game.player.onLift,
    grounded:game.player.grounded,crouched:game.player.crouched,probes:game.enemies});
  setScreenMusic(['lobby','outfit'].includes(phase)?'menu':phase==='loading'?'loading':'gameplay',selectedMode==='campaign2'?2:1,settings.music!==false);
  if(audioContext)setWeaponCharge(audioContext,game.weapon.id,game.charge,audioActive&&settings.sound&&game.charge>.015);
  if(audioActive&&game.reloadRemaining>0&&!reloadInserted&&1-game.reloadRemaining/game.weapon.reload>=.58){reloadInserted=true;if(settings.sound)playWeaponAction(audioContext,game.weapon.id,'reload-in');}
  for(const gun of [world.soldier.gun,world.fpsGun])gun.userData.setFlash(phase === 'playing' && flashTimer > 0,game.time);
  $('crosshair').classList.toggle('shooting', flashTimer > 0); $('damage-flash').classList.toggle('active', phase!=='lobby' && damageUntil > clock);
  $('damage-flash').style.setProperty('--injury',phase==='lobby'?0:Math.max(0,(100-game.player.hp)/100*.65));
  vr.update(dt,flashTimer,recoil,weaponFeel.state);
  if(clock>equipmentUntil)$('equipment-unlock').hidden=true;
  if (clock > announcementUntil) $('wave-announcement').classList.remove('show');
  if (world.lost && !recovering) {
    void recoverGraphics(new Error('Le périphérique graphique a été perdu.'));return;
  }
  if(!recovering){
    if(companionScene!==world.scene||companionHero!==character.id||skillGame!==game){
      narrativeCompanion?.dispose();narrativeCompanion=createAICompanion(world.T,world.scene,character.id);
      skillMenu?.dispose();skillFX?.dispose();
      if(skillGame!==game||companionHero!==character.id){
        companionSkills=createCompanionSkills({characterId:character.id,mission:game.campaign?.level||1,mode:game.mode==='campaign'?'campaign':'arena'});
      }
      skillGame=game;
      skillMenu=createCompanionMenu({getStatus:()=>companionSkills.snapshot(game),
        onUse:id=>companionSkills.use(id,{game,...aim('right'),emitter:narrativeCompanion.root.position}),
        onChange(open){resetInput();if(open&&vr.mode!=='xr')document.exitPointerLock?.();}});
      skillFX=companionSkills.unlocked?createCompanionSkillFX(world.T,world.scene,companionSkills):null;
      companionScene=world.scene;companionHero=character.id;
    }
    // M01 retains the audio signatures; physical companions debut in M07.
    const active=phase==='playing'&&companionSkills.unlocked;
    const companionCamera=vr.mode==='xr'?world.renderer.xr.getCamera(world.camera):world.camera;
    narrativeCompanion.update(dt,{game,camera:companionCamera,active,assistance:false});
    skillMenu.setVisible(phase==='playing');skillMenu.refresh();
    if(active&&!skillMenu.isOpen)companionSkills.update(dt,{game});
    skillFX?.update();
    for(const event of companionSkills.drainEvents())if(settings.sound&&audioContext){
      if(event.type==='companion-phase')playLaserShot(audioContext,'nova',.55);
      if(event.type==='companion-explosion')playLaserImpact(audioContext,{...event,surface:'metal'});
    }
    vr.renderScope();if(vr.mode==='stereo')world.renderStereo();else world.render();frames++;
  }
}

vr = new VRController({
  home,
  rangeArmoryInput:input=>rangeArmoryMenu?.input(input),
  toggleSkills:()=>skillMenu?.setOpen(!skillMenu.isOpen),
  skillsInput:controller=>skillMenu?.xrInput({T:world.T,scene:world.scene,camera:world.renderer.xr.getCamera(world.camera),
    left:controller.controllers.find(c=>c.tracked&&c.ray.userData.source?.handedness==='left')?.anchor,
    right:controller.controllers.find(c=>c.tracked&&c.ray.userData.source?.handedness==='right')?.ray,
    trigger:!controller.triggerBlocked&&controller.controllers.some(c=>c.ray.userData.source?.handedness==='right'&&(c.ray.userData.source.gamepad?.buttons[0]?.pressed||(c.ray.userData.source.gamepad?.buttons[0]?.value||0)>.15)),
    enabled:phase==='playing'}),
  world:()=>world, game:()=>game, phase:()=>phase, openPanel, pause, resume,
  quality:()=>settings.quality,
  togglePause:()=>{ if(phase==='playing')pause();else if(phase==='paused')resume(); },
  begin:()=>{ if(phase==='over'&&game.state==='won'&&game.mode!=='campaign')continueSurvival();else if(phase==='lobby'||phase==='over')start();else resume();selectView('fps');resetInput(); },
  webGL:async()=>{ if(!world.renderer.isWebGLRenderer){recovering=true;world.renderer.setAnimationLoop(null);try{world=await world.recover();game?.replaceObstacles(world.obstacles);window.dispatchEvent(new CustomEvent('rosee-renderer-recovered'));}finally{recovering=false;lastTime=0;world.renderer.setAnimationLoop(frame);}} },
  afterExit:()=>{ resetInput();lastTime=0;updateHud();updateCamera();if(phase==='paused')$('pause-dialog').showModal();else if(phase==='over')$('end-dialog').showModal(); }
});
$('pause-vr').onclick=()=>vr.open();
try {
  world = await createScene($('world'), settings.quality,false,character.id);world.setCharacter(character.id);game = armed(new ArenaGame(world.obstacles,Math.random,null,character.id));
  $('renderer-label').textContent = `${world.backend.toUpperCase()} · CONÇU POUR LE TACTILE`;
  $('loading-status').textContent='Préparation du laboratoire et des équipements…';
  if(boot?.intent!=='play'){
    world.lobby(0);
    try{await world.warm();world.render();}catch(error){world=await world.recover({quality:'low'});game.replaceObstacles(world.obstacles);world.lobby(0);await world.warm();world.render();}
  }
  selectMode(selectedMode);$('loading-screen').hidden=true;$('play-button').disabled = false;$('outfit-button').disabled=false;
  window.__PINKWAR = window.__ROSEE = Object.freeze({ snapshot: () => ({ version:GAME_VERSION,skills:companionSkills?.snapshot(game),skillsMenuOpen:skillMenu?.isOpen||false,phase, view, frames,recovering,recoveryAttempts,graphics:world.graphics, vr:vr.mode, vrHand:vr.settings.hand,vrFrameRate:vr.frameRate,vrFoveation:vr.perf?.foveation||0,vrTurn:vr.settings.turn,vrPrecision:vr.precision,aiming,aimBlend,cameraFov:world.camera.fov,laserEffects:world.laserStats?.(),city:world.cityStats?.(),vrTrackingLost:vr.trackingLost,vrSightVisible:vr.sight?.group.visible||false,vrHelpVisible:vr.hud?.help?.plane.visible||false, sensor:vr.sensor,characterId:character.id,characterName:character.name,universe:world.character.universe,modelCharacter:world.soldier.root.name,environmentAccent:world.palette.rose,modelEquipmentLevel:world.soldier.equipmentLevel,modelVisibleParts:world.soldier.visibleParts,modelBatches:world.soldier.batchCount,modelSource:world.soldier.actor?.data.source,modelNativeMotion:world.soldier.nativeMotion,modelNativeBones:world.soldier.nativeSkeleton?.bones.length,modelShadowUnit:world.soldier.shadowUnit?{profile:world.soldier.shadowUnit.profile,helmet:world.soldier.shadowUnit.armour.helmet.name,cape:world.soldier.shadowUnit.cape.anchor.visible,tabard:false}:null,modelCrouchBlend:world.soldier._low??0,modelGaitWeight:world.soldier._gaitWeight??0,modelHipHeight:world.soldier.hips.position.y,cameraCrouchBlend:crouchCameraBlend,musicEnabled:settings.music!==false,musicPlaying:screenMusicSnapshot().playing,musicSection:screenMusicSnapshot().surface,musicVoices:screenMusicSnapshot().voices||0,audioState:audioContext?.state||'idle',weaponFeedback:{...weaponFeel.state},previewLevel,coverCount:world.obstacles.filter(b=>b.cover).length, backend: world.backend, camera: world.camera.position.toArray(), yaw, pitch,
    selectedMode,guidance:game.guidance?.()||null,weaponModels:{...world.fpsGun.userData.kenneyAssets},training:game.mode==='training'?game.snapshot().training:null,rangeTargets:world.rangeArt.targetCount,campaignArt:world.campaignArt.stats(),inputs: { move: { ...move }, look: { ...look }, firing: firingPointers.size > 0 || keys.has('Space') }, drawCalls: world.renderer.info.render.calls, ...game.snapshot(),equipment:equipmentForCharacter(game.wave,character.id) }) });
  bindCanvas();world.renderer.setAnimationLoop(frame);
  $('launch-status').textContent=`V. ${GAME_VERSION} · prêt à lancer`;
  if(boot?.intent==='play')await start();
  else if(boot?.intent==='vr')await vr.open();
  else if(boot?.intent==='outfit')openOutfit();
} catch (error) {
  console.error('Initialisation 3D', error);showLaunchError(error,'initialisation',world?.backend);
}
