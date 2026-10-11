import { ArenaGame, PORTAL, MAX_LEVEL, WEAPONS, clamp, segmentSphere, segmentBox, traceEnemyHit } from './game-logic.js';
import { createScene } from './scene.js';
import { VRController } from './vr.js';
import { EQUIPMENT, equipmentForCharacter } from './equipment.js';
import { characterForId } from './characters.js';
import { playLaserShot,loadRealLaserSample,playLaserImpact,setLaserAudioEnabled,disposeLaserAudio } from './laser-sound.js';
import { createAmbience } from './ambience.js';
import { ACTIVE_INSTALLATIONS } from './world-layout.js';
import { createMusicBed } from './music.js';

const $ = id => document.getElementById(id);
const settings = { sound: true, music: true, sensitivity: 1, quality: 'auto' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('rosee-settings') || '{}')); } catch {}
settings.sensitivity = clamp(Number(settings.sensitivity) || 1, .4, 2);
if (!['auto', 'low', 'high'].includes(settings.quality)) settings.quality = 'auto';
let phase = 'lobby', view = 'third', yaw = 0, pitch = -.075, game, world, vr;
let character=characterForId('ghju');
try{character=characterForId(localStorage.getItem('pink-war-character'));}catch{}
let clock = 0, lastTime = 0, hudTimer = 0, flashTimer = 0, recoil = 0, reloadLift = 0, announcementUntil = 0, damageUntil = 0;
let outfitReturn = 'lobby', previewLevel = 1, equipmentUntil = 0;
let canvasPointer = null, lastDrag = null, audioContext = null, ambience = null;
const musicBed=createMusicBed();
const move = { x: 0, y: 0, id: null }, look = { x: 0, y: 0, id: null };
const keys = new Set(), firingPointers = new Set();
let jumpQueued = false, pickupQueued = false,crouchQueued=false;
let crouchCameraBlend=0, currentSprinting=false;
const persist = () => { try { localStorage.setItem('rosee-settings', JSON.stringify(settings)); } catch {} };
const timeString = time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

function audioReady() {
  musicBed.setEnabled(settings.music!==false);
  ambience?.setEnabled(settings.sound);
  if(audioContext)setLaserAudioEnabled(audioContext,settings.sound);
  if(settings.sound&&audioContext?.state==='running')loadRealLaserSample(audioContext).catch(()=>{});
  if(phase==='playing')musicBed.start();
  if (!settings.sound) return;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    ambience ||= createAmbience(audioContext,{installations:ACTIVE_INSTALLATIONS});
    ambience.setEnabled(settings.sound);setLaserAudioEnabled(audioContext,settings.sound);
    loadRealLaserSample(audioContext).catch(()=>{}); } catch {}
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
syncSound(); $('sensitivity').value = settings.sensitivity; $('quality').value = settings.quality;
$('sound-button').onclick = () => { settings.sound = !settings.sound; syncSound(); audioReady(); persist(); };
$('sound-setting').onchange = e => { settings.sound = e.target.checked; syncSound(); audioReady(); persist(); };
$('music-setting').onchange=e=>{settings.music=e.target.checked;musicBed.setEnabled(settings.music);if(settings.music&&phase==='playing')musicBed.start();persist();};
$('sensitivity').oninput = e => { settings.sensitivity = Number(e.target.value); persist(); };
$('quality').onchange = e => { settings.quality = e.target.value; world?.resize(settings.quality); persist(); };

function selectCharacter(id,save=true){
  if(phase!=='lobby')return;
  const next=characterForId(id),changed=next.id!==character.id;character=next;
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
  $('pause-title').innerHTML=`Une petite<br>pause ${character.masculine?'azurée':'rosée'}.`;
  $('outfit-character').textContent=`ATELIER / ${character.name}`;
  $('outfit-button').ariaLabel=`Voir les armures et accessoires de ${character.name}`;
  $('outfit-rotation').ariaLabel=`Faire tourner ${character.name}`;
  $('arsenal-title').innerHTML=`La puissance<br>en ${character.colorWord}.`;
  world?.setCharacter(character.id);
  if(changed&&game){game.reset();world.resetDynamic();world.setWeapon(0);world.setEquipment(1);resetInput();updateHud();}
  if(save)try{localStorage.setItem('pink-war-character',character.id);}catch{}
}
for(const button of document.querySelectorAll('[data-character]'))button.onclick=()=>selectCharacter(button.dataset.character);
selectCharacter(character.id,false);

function resetInput() {
  keys.clear(); firingPointers.clear(); jumpQueued = false; pickupQueued = false;crouchQueued=false; canvasPointer = null; lastDrag = null;
  for (const s of [move, look]) { s.x = 0; s.y = 0; s.id = null; }
  for (const id of ['move-stick', 'look-stick']) $(id).querySelector('.joystick-knob').style.transform = '';
  $('fire-button').classList.remove('firing');
  if (game) { game.charge = 0; game.triggerHeld = false; }
}
function attachJoystick(id, state) {
  const area = $(id), ring = area.querySelector('.joystick-ring'), knob = area.querySelector('.joystick-knob');
  function update(e) {
    const r = ring.getBoundingClientRect(), radius = r.width * .32;
    let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; const distance = Math.hypot(x, y);
    if (distance > radius) { x *= radius / distance; y *= radius / distance; }
    state.x = Math.abs(x / radius) < .08 ? 0 : x / radius; state.y = Math.abs(y / radius) < .08 ? 0 : y / radius;
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }
  area.addEventListener('pointerdown', e => { if (phase !== 'playing' || state.id !== null) return; e.preventDefault(); state.id = e.pointerId; try { area.setPointerCapture(e.pointerId); } catch {} update(e); });
  area.addEventListener('pointermove', e => { if (e.pointerId !== state.id) return; e.preventDefault(); update(e); });
  const release = e => { if (e.pointerId !== state.id) return; state.x = 0; state.y = 0; state.id = null; knob.style.transform = ''; };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) area.addEventListener(event, release);
}
attachJoystick('move-stick', move); attachJoystick('look-stick', look);
$('fire-button').addEventListener('pointerdown', e => { if (phase !== 'playing') return; e.preventDefault(); audioReady(); firingPointers.add(e.pointerId); try { e.target.closest('button').setPointerCapture(e.pointerId); } catch {} $('fire-button').classList.add('firing'); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('fire-button').addEventListener(type, e => { firingPointers.delete(e.pointerId); if (!firingPointers.size) $('fire-button').classList.remove('firing'); });
$('crouch-button').addEventListener('click',()=>{if(phase==='playing')crouchQueued=true;});
$('pickup-button').addEventListener('click', () => { if(phase === 'playing')pickupQueued = true; });
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

function pause() { if (phase !== 'playing') return; musicBed.pause();ambience?.pause(); phase = 'paused'; resetInput(); if (vr?.mode !== 'xr') $('pause-dialog').showModal(); }
function resume() { if (phase !== 'paused') return; for (const d of document.querySelectorAll('dialog[open]')) d.close(); phase = 'playing'; resetInput(); audioReady(); }
function openPanel(id) { if (phase === 'playing') { phase = 'paused'; resetInput(); } for (const d of document.querySelectorAll('dialog[open]')) d.close(); $(id).showModal(); }
function closePanel(dialog) { if(dialog.id==='outfit-dialog'){closeOutfit();return;} dialog.close(); if (phase === 'paused') $('pause-dialog').showModal(); }
$('pause-button').onclick = pause; $('resume-button').onclick = resume;
$('how-button').onclick = () => openPanel('help-dialog'); $('settings-button').onclick = () => openPanel('settings-dialog'); $('pause-help').onclick = () => openPanel('help-dialog');
$('lore-button').onclick=()=>openPanel('lore-dialog');
$('pause-lore').onclick=()=>openPanel('lore-dialog');
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
  document.body.classList.remove('playing'); $('game-hud').hidden = true; musicBed.pause();ambience?.pause();world.resetDynamic();
  $('damage-flash').style.setProperty('--injury', '0'); $('damage-flash').classList.remove('active'); $('wave-announcement').classList.remove('show');
}
$('quit-button').onclick = home; $('end-home').onclick = home;
function start() {
  if (!world) return;
  for (const d of document.querySelectorAll('dialog[open]')) d.close(); game.reset(); world.resetDynamic(); phase = 'playing'; yaw = 0; pitch = -.075;
  flashTimer = 0; recoil = 0; damageUntil = 0; announcementUntil = 0;equipmentUntil=0;crouchCameraBlend=0;currentSprinting=false; resetInput(); audioReady();
  world.setWeapon(0);world.setEquipment(1);
  document.body.classList.add('playing'); $('game-hud').hidden = false; $('game-tip').style.opacity = '1'; updateHud();
}
$('play-button').onclick = start; $('retry-button').onclick = start;
$('reload-button').onclick = () => { if(phase==='playing') game.reload(); };
$('weapon-button').onclick = () => { if(phase==='playing') game.cycleWeapon(); };
$('arsenal-button').onclick = () => {
  $('weapon-list').replaceChildren();
  WEAPONS.forEach((w,index) => {
    const button = document.createElement('button'), available = game.ownedWeapons.has(index);
    button.className = 'weapon-card' + (game.weaponIndex===index ? ' selected' : ''); button.disabled = !available;
    button.innerHTML = `<span><strong>${w.name}</strong><small>${w.label} · ${w.capacity} charges${w.chargeTime?' · tir chargé':''}</small></span><b>${available?(game.weaponIndex===index?'ÉQUIPÉE':'ÉQUIPER'):`NIVEAU ${w.level}`}</b>`;
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
  keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { resetInput(); if (phase === 'playing' && vr?.mode !== 'xr') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (phase === 'playing' && vr?.mode !== 'xr') pause(); } });
window.addEventListener('pagehide',event=>{ambience?.pause();if(!event.persisted){ambience?.dispose();if(audioContext)disposeLaserAudio(audioContext);}});
window.addEventListener('resize', () => { world?.resize(settings.quality); resetInput(); });

function updateCamera() {
  world.camera.clearViewOffset();
  if (vr?.mode === 'xr') { vr.positionRig(); return; }
  const { T, camera, soldier, weapon } = world, p = game.player;
  const cameraYaw = yaw + (vr?.mode==='stereo' && vr.sensor ? vr.phoneYaw : 0), cameraPitch = clamp(pitch + (vr?.mode==='stereo' && vr.sensor ? vr.phonePitch : 0) - recoil * .16, -1.2, 1.2);
  camera.fov = view === 'fps' ? 72 : 64;
  camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
  const elevation = p.elevation || 0;
  // Camera follows the same crouch transition as the real soldier pelvis, not a sudden teleport.
  const cameraEye=(character.masculine?1.71:1.61)-.55*crouchCameraBlend;
  const cameraShoulder=(character.masculine?1.49:1.41)-.45*crouchCameraBlend;
  if (view === 'fps') { camera.position.set(p.x, cameraEye + elevation, p.z); soldier.root.visible = false; weapon.visible = true; }
  else {
    soldier.root.visible = true; weapon.visible = false;
    const distance = 5.1, start = { x: p.x, y: cameraShoulder + elevation, z: p.z };
    const end = { x: p.x + Math.sin(yaw) * distance * Math.cos(pitch) + Math.cos(yaw) * .65,
      y: cameraShoulder - Math.sin(pitch) * distance, z: p.z + Math.cos(yaw) * distance * Math.cos(pitch) - Math.sin(yaw) * .65 };
    let nearest = 1;
    for (const box of world.obstacles) { const hit = segmentBox(start, end, { ...box, hx: box.hx + .2, hz: box.hz + .2 }); if (hit !== null) nearest = Math.min(nearest, Math.max(.09, hit - .05)); }
    camera.position.set(start.x + (end.x - start.x) * nearest, Math.max(.35, start.y + (end.y - start.y) * nearest), start.z + (end.z - start.z) * nearest);
  }
  const bob = Math.hypot(move.x, move.y) > .1 || keys.has('KeyW') || keys.has('KeyZ') || keys.has('KeyS');
  weapon.position.set(.19, -.24 + (bob ? Math.sin(clock * 11) * .012 : 0) - recoil * .14 + reloadLift * .045, -.56 + recoil * .5 - reloadLift * .028);
  weapon.rotation.set(recoil * .9 + reloadLift * Math.PI / 2, 0, Math.sin(clock * 1.8) * .004);
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
    reloadProgress, reloading, time: clock };
  world.fpsGun.userData.setCombatState?.(state); world.soldier.gun.userData.setCombatState?.(state);
  const trigger = firing && !reloading && game.state === 'playing' ? 1 : 0;
  // The actual shared LYLU/GHJU rig now receives locomotion on EVERY desktop/mobile view.
  // In FPS it is invisible, but its cycle remains synchronized when the player switches to 3P.
  // WebXR deliberately keeps the player mesh hidden: tracked controllers own the visible hands.
  if (vr?.mode !== 'xr') {
    world.soldier.animate(clock, moving, recoil, reloadLift, trigger, dt, {
      airborne: !game.player.grounded, verticalSpeed: game.player.verticalSpeed,
      crouched: game.player.crouched, firing: trigger>0,
      sprint: currentSprinting, aim: !!(firing||game.charge>0)
    });
    if (view === 'fps') world.fpsGun.userData.animateHands?.(trigger, trigger ? .34 : .18, reloadLift, dt);
  }
}
function aim() {
  if (vr?.mode==='xr') return vr.aim();
  const { T, camera } = world, forward = new T.Vector3(); camera.getWorldDirection(forward);
  // Shots leave the muzzle of the weapon the hand is holding.
  const origin = new T.Vector3(), gun = view === 'fps' ? world.fpsGun : world.soldier.gun;
  if (view !== 'fps') world.soldier.root.updateMatrixWorld(true);
  gun.userData.flash.updateWorldMatrix(true, false); gun.userData.flash.getWorldPosition(origin);
  const far = camera.position.clone().addScaledVector(forward, 160); let target = far, nearest = 1;
  for (const box of world.obstacles) { const hit = segmentBox(camera.position, far, box); if (hit !== null && hit < nearest) { nearest = hit; target = camera.position.clone().lerp(far, hit); } }
  for (const enemy of game.enemies) {
    const center = { x: enemy.x, y: (enemy.elevation || 0) + (enemy.aimHeight ?? (enemy.elite ? 1.35 : 1.15)), z: enemy.z };
    const hit = traceEnemyHit(camera.position,far,enemy);
    if (hit && hit.t < nearest) { nearest = hit.t; target = camera.position.clone().lerp(far,hit.t); }
  }
  const direction = target.clone().sub(origin).normalize(); return { origin, direction };
}

function announce(title, subtitle) {
  $('wave-announcement').innerHTML = `<small>${subtitle}</small><strong>${title}</strong>`;
  $('wave-announcement').classList.add('show'); announcementUntil = clock + 2.6;
}
function handleEvents() {
  for (const event of game.drainEvents()) {
    if (event.type === 'shot') {
      const kick = { r9: .12, bloom: .06, petal: .12, thorn: .16, nova: .19 }[event.weapon] ?? .09;
      recoil = Math.min(.2, recoil + kick * (event.power ?? 1));
      flashTimer = .07; vr.haptic('shot', event.weapon); weaponShotSound(event.weapon, event.power);
    }
    if (event.type === 'weapon-offer') { tone(360, 820, .45, .03, 'sine'); }
    if (event.type === 'wave') { const offered=WEAPONS.find(w=>w.level===event.wave); announce(`NIVEAU ${String(event.wave).padStart(2, '0')} / ${MAX_LEVEL}`, offered && event.wave>1 ? `${offered.name} DISPONIBLE AU FAISCEAU · APPROCHEZ-VOUS` : `${event.count} CRÉATURES · LA BRÈCHE S’OUVRE`); tone(210, 420, .25, .065); tone(420, 630, .25, .06, 'triangle', .2); }
    if (event.type === 'equipment') { const equipment=equipmentForCharacter(event.level,character.id);world.setEquipment(event.level);$('equipment-unlock-title').textContent=`${equipment.name} · NIV. ${event.level}`;$('equipment-unlock-detail').textContent=equipment.addition;equipmentUntil=clock+4;$('equipment-unlock').hidden=false; }
    if (event.type === 'clear') { announce('NIVEAU TERMINÉ', '+ BONUS · LA BRÈCHE SE RECHARGE'); tone(420, 700, .25, .07); }
    if (event.type === 'weapon') { world.setWeapon(game.weaponIndex); vr.haptic('weapon'); tone(510, 760, .1, .03); }
    if (event.type === 'jump') tone(165, 110, .075, .012);
    if (event.type === 'land') tone(105, 55, .075, .013);
    if (event.type === 'reload') { vr.startReloadGesture(); vr.haptic('reload'); tone(220, 450, .16, .04); }
    if (event.type === 'reloaded') { vr.haptic('reloaded'); tone(520, 820, .1, .035); }
    if (event.type === 'spawn') world.burst(event.x, 1, event.z, world.palette.violet, 7);
    if (event.type === 'impact') {
      world.impact?.(event);
      if(settings.sound){
        const dx=event.x-game.player.x,dz=event.z-game.player.z;
        const distance=Math.hypot(dx,dz,event.y-game.player.elevation-1.3);
        const pan=(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance);
        playLaserImpact(audioContext,{surface:event.surface,distance,pan,splash:event.splash,power:event.power});
      }
    }
    if (event.type === 'hit') { vr.haptic('hit'); if(event.zone==='head')tone(1300,680,.075,.032); const marker = $('hit-marker'); marker.classList.remove('hit'); void marker.offsetWidth; marker.classList.add('hit'); tone(300, 190, .06, .035); }
    if (event.type === 'kill') { vr.haptic('kill'); world.burst(event.x, event.y, event.z, world.palette.violet, 12); tone(130, 50, .15, .06, 'square'); }
    if (event.type === 'damage') { damageUntil = clock + .25; vr.haptic('damage'); tone(80, 35, .18, .08, 'triangle'); }
    if (event.type === 'over') gameOver(false);
    if (event.type === 'win') gameOver(true);
  }
}
function gameOver(won = false) {
  musicBed.pause();ambience?.pause(); phase = 'over'; resetInput(); let best = game.score;
  try { best = Math.max(game.score, Number(localStorage.getItem('rosee-best')) || 0); localStorage.setItem('rosee-best', String(best)); } catch {}
  $('end-eyebrow').textContent = won ? 'MISSION ACCOMPLIE / NIVEAU 10' : 'TRANSMISSION INTERROMPUE';
  $('end-title').innerHTML = won ? `La brèche est fermée.<br>Le ${character.colorWord} a gagné.` : 'Chaque aube<br>est un nouveau départ.';
  $('end-message').textContent = won ? `Vous avez survécu aux dix niveaux. ${character.name} rentre ${character.masculine?'victorieux':'victorieuse'}.` : 'La brèche a gagné cette bataille. La prochaine est à vous.';
  $('retry-button').textContent = won ? 'REJOUER LA CAMPAGNE →' : 'UNE NOUVELLE AUBE →';
  $('end-score').textContent = game.score; $('end-wave').textContent = game.wave; $('end-time').textContent = timeString(game.time); $('best-label').textContent = best;
  if (vr?.mode !== 'xr') $('end-dialog').showModal();
}
function updateHud() {
  const equipment=equipmentForCharacter(game.wave,character.id);
  $('gear-label').textContent=`TENUE ${String(equipment.level).padStart(2,'0')} · ${equipment.name.toUpperCase()}`;
  $('health-label').textContent = Math.ceil(game.player.hp); $('health-bar').style.width = `${game.player.hp}%`;
  $('health-status').textContent = 'SANTÉ';
  document.querySelector('.vitals').classList.toggle('regenerating', game.regenerating);
  document.querySelector('.vitals').classList.toggle('critical', game.player.hp<30);
  $('wave-label').textContent = `NIVEAU ${String(Math.max(1, game.wave)).padStart(2, '0')} / ${MAX_LEVEL}`;
  $('weapon-button').innerHTML = `${game.weapon.name} <span>⌄</span>`;
  $('weapon-button').disabled = game.unlockedWeapons.length < 2;
  $('crouch-button').setAttribute('aria-pressed',String(!!game.player.crouched));
  $('crouch-button').classList.toggle('active',!!game.player.crouched);
  const nearby=game.nearbyWeapon();const pickup=$('pickup-button');
  pickup.hidden=!nearby;pickup.textContent=nearby?`RÉCUPÉRER ${WEAPONS[nearby.index].name} · F / X`:'';
  $('ammo-label').textContent = game.ammo[game.weaponIndex];
  const reloading = game.reloadRemaining>0;
  document.querySelector('.fire-area').classList.toggle('reloading', reloading);
  $('reload-button').disabled = reloading || game.ammo[game.weaponIndex]===game.weapon.capacity;
  $('fire-caption').innerHTML = reloading ? `RECHARGE ${game.reloadRemaining.toFixed(1)} S` : game.weapon.chargeTime ? 'TIR CHARGÉ <small>MAINTENIR · RELÂCHER</small>' : 'TIR LASER <small>MAINTENIR · ESPACE</small>';
  $('charge-bar').style.width = `${(reloading ? 1-game.reloadRemaining/game.weapon.reload : game.charge)*100}%`;
  const pending=game.weaponOffers[0];
  const distanceToWeapon=pending?Math.round(Math.hypot(pending.x-game.player.x,pending.z-game.player.z)):0;
  $('enemy-label').textContent=pending
    ? `ARME ${WEAPONS[pending.index].name} · FAISCEAU À ${distanceToWeapon} M`
    : game.nextWave > 0 && game.wave > 0 ? `NIVEAU SUIVANT DANS ${Math.ceil(game.nextWave)} S`
    : `${game.enemies.length + game.toSpawn} CRÉATURES À REPOUSSER`;
  $('score-label').textContent = String(game.score).padStart(5, '0'); $('time-label').textContent = timeString(game.time);
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
  c.fillStyle = radarTheme.wall; for (const b of world.obstacles) c.fillRect(cx + (b.x - b.hx) * scale, cy + (b.z - b.hz) * scale, b.hx * 2 * scale, b.hz * 2 * scale);
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
let frames = 0, recovering = false;
function bindCanvas() {
  // Rebind drag input after a graphics recovery replaces the canvas context.
  const canvas = $('world');
  if (canvas.dataset.controlsBound) return;
  canvas.dataset.controlsBound = 'true';
  canvas.addEventListener('pointerdown', e => { if (phase !== 'playing' || canvasPointer !== null) return; e.preventDefault(); canvasPointer = e.pointerId; lastDrag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch {} });
  canvas.addEventListener('pointermove', e => { if (phase !== 'playing' || e.pointerId !== canvasPointer || !lastDrag) return; yaw -= (e.clientX - lastDrag.x) * .004 * settings.sensitivity; pitch = clamp(pitch - (e.clientY - lastDrag.y) * .004 * settings.sensitivity, -.85, .7); lastDrag = { x: e.clientX, y: e.clientY }; });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, e => { if (e.pointerId === canvasPointer) { canvasPointer = null; lastDrag = null; } });
}
window.addEventListener('rosee-renderer-recovered', () => { $('world').removeAttribute('data-controls-bound'); bindCanvas(); $('renderer-label').textContent = `${world.backend.toUpperCase()} · CONÇU POUR LE TACTILE`; });
function frame(timestamp, xrFrame) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : .016; lastTime = timestamp; clock += dt;
  // The standard Bluetooth/USB gamepad is available outside VR as well.
  const vrInput = vr.input(xrFrame);
  world.animatePortal(clock);
  if (phase === 'lobby') world.lobby(clock,Math.max(1,game.wave));
  if (phase === 'outfit') world.outfit(clock,previewLevel,Number($('outfit-rotation').value)*Math.PI/180);
  if (phase === 'playing' && !recovering) {
    const sensitivity = settings.sensitivity;
    yaw -= (look.x * 1.8 + vrInput.turn * 1.6 + (keys.has('ArrowRight') ? 1.4 : 0) - (keys.has('ArrowLeft') ? 1.4 : 0)) * sensitivity * dt;
    yaw -= vrInput.snap;
    pitch = clamp(pitch + (-look.y * 1.35 - vrInput.tilt * 1.35 + (keys.has('ArrowUp') ? 1.15 : 0) - (keys.has('ArrowDown') ? 1.15 : 0)) * sensitivity * dt, -.85, .7);
    yaw %= Math.PI * 2;
    const x = move.x + vrInput.x + (keys.has('KeyD') ? 1 : 0) - ((keys.has('KeyA') || keys.has('KeyQ')) ? 1 : 0);
    const z = move.y + vrInput.z + (keys.has('KeyS') ? 1 : 0) - ((keys.has('KeyW') || keys.has('KeyZ')) ? 1 : 0);
    const facing = yaw + (vr.mode==='stereo' && vr.sensor ? vr.phoneYaw : 0);
    let moveYaw = facing;
    if(vr.mode==='xr')moveYaw=vr.movementYaw(facing);
    const jump = jumpQueued || vrInput.jump || keys.has('KeyJ'); jumpQueued = false;
    const crouchToggle=crouchQueued||vrInput.crouchToggle;crouchQueued=false;
    currentSprinting=vrInput.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight');
    game.step(dt, { x, z, yaw: facing, moveYaw, sprint: currentSprinting, jump,crouchToggle });
    crouchCameraBlend+=(Number(game.player.crouched)-crouchCameraBlend)*Math.min(1,dt*8);
    if(pickupQueued||vrInput.pickup){game.collectWeapon();pickupQueued=false;}
    const moving = Math.hypot(x, z) > .1;
    world.sync(game, clock, dt);
    const firing = vr.mode==='xr' ? vrInput.fire : !!(firingPointers.size || keys.has('Space') || vrInput.fire);
    // Pose the authentic IK skeleton BEFORE raycasting. In 3P the projectile now leaves the
    // current crouched/armed muzzle instead of the preceding frame's hand positions.
    updateWeaponVisuals(dt, firing, moving); updateCamera();
    if (game.state==='playing' && (firing || game.charge>0)) { const target=aim(); game.trigger(firing,dt,target.origin,target.direction); }
    else game.triggerHeld=false;
    handleEvents(); updateCamera();
    hudTimer -= dt; if (hudTimer <= 0) { if (vr.mode !== 'xr') updateHud(); hudTimer = .1; }
  }
  ambience?.update(dt,{active:phase==='playing'&&!recovering&&!document.hidden,position:game.player,
    moving:phase==='playing',elevation:game.player.elevation,onLift:!!game.player.onLift,
    grounded:game.player.grounded,crouched:game.player.crouched});
  flashTimer = Math.max(0, flashTimer - dt); recoil = Math.max(0, recoil - dt * 2.4);
  world.soldier.gun.userData.flash.visible = phase === 'playing' && flashTimer > 0; world.fpsGun.userData.flash.visible = phase === 'playing' && flashTimer > 0;
  $('crosshair').classList.toggle('shooting', flashTimer > 0); $('damage-flash').classList.toggle('active', phase!=='lobby' && damageUntil > clock);
  $('damage-flash').style.setProperty('--injury',phase==='lobby'?0:Math.max(0,(100-game.player.hp)/100*.65));
  vr.update(dt,flashTimer,recoil);
  if(clock>equipmentUntil)$('equipment-unlock').hidden=true;
  if (clock > announcementUntil) $('wave-announcement').classList.remove('show');
  if (world.lost && !recovering) {
    recovering = true; resetInput();
    world.recover().then(next => { world = next;game.replaceObstacles(world.obstacles); window.dispatchEvent(new CustomEvent('rosee-renderer-recovered')); if(vr.mode==='stereo'){vr.removeHUD();vr.makeHUD();} recovering = false; lastTime=0;world.renderer.setAnimationLoop(frame); }).catch(error => { console.error('Rétablissement 3D', error); phase = 'error'; $('loading-error').hidden = false; });
  }
  if (!recovering) try { if(vr.mode==='stereo')world.renderStereo();else world.render(); frames++; } catch (error) { console.error('Rendu interrompu', error); phase = 'error'; $('loading-error').hidden = false; }
}

vr = new VRController({
  world:()=>world, game:()=>game, phase:()=>phase, openPanel, pause,
  togglePause:()=>{ if(phase==='playing')pause();else if(phase==='paused')resume(); },
  begin:()=>{ if(phase==='lobby'||phase==='over')start();else resume();selectView('fps');resetInput(); },
  webGL:async()=>{ if(!world.renderer.isWebGLRenderer){recovering=true;world.renderer.setAnimationLoop(null);try{world=await world.recover();game?.replaceObstacles(world.obstacles);window.dispatchEvent(new CustomEvent('rosee-renderer-recovered'));}finally{recovering=false;lastTime=0;world.renderer.setAnimationLoop(frame);}} },
  afterExit:()=>{ resetInput();lastTime=0;updateHud();updateCamera();if(phase==='paused')$('pause-dialog').showModal();else if(phase==='over')$('end-dialog').showModal(); }
});
try {
  world = await createScene($('world'), settings.quality,false,character.id);world.setCharacter(character.id);game = new ArenaGame(world.obstacles);
  $('renderer-label').textContent = `${world.backend.toUpperCase()} · CONÇU POUR LE TACTILE`;
  world.lobby(0); await world.renderer.compileAsync(world.scene, world.camera); world.render();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (world.lost) { world = await world.recover();game?.replaceObstacles(world.obstacles); window.dispatchEvent(new CustomEvent('rosee-renderer-recovered')); }
  $('play-label').textContent = 'ENTRER DANS L’ARÈNE'; $('play-button').disabled = false;$('outfit-button').disabled=false;
  window.__PINKWAR = window.__ROSEE = Object.freeze({ snapshot: () => ({ phase, view, frames, vr:vr.mode, vrHand:vr.settings.hand,vrFrameRate:vr.frameRate,vrFoveation:vr.perf?.foveation||0,vrTurn:vr.settings.turn,vrPrecision:vr.precision,vrTrackingLost:vr.trackingLost,vrSightVisible:vr.sight?.group.visible||false,vrHelpVisible:vr.hud?.help?.plane.visible||false, sensor:vr.sensor,characterId:character.id,characterName:character.name,universe:world.character.universe,modelCharacter:world.soldier.root.name,environmentAccent:world.palette.rose,modelEquipmentLevel:world.soldier.equipmentLevel,modelVisibleParts:world.soldier.visibleParts,modelBatches:world.soldier.batchCount,modelCrouchBlend:world.soldier._low??0,modelGaitWeight:world.soldier._gaitWeight??0,modelHipHeight:world.soldier.hips.position.y,cameraCrouchBlend:crouchCameraBlend,musicEnabled:musicBed.enabled,musicPlaying:musicBed.playing,musicFailed:musicBed.failed,previewLevel,coverCount:world.obstacles.filter(b=>b.cover).length, backend: world.backend, camera: world.camera.position.toArray(), yaw, pitch,
    inputs: { move: { ...move }, look: { ...look }, firing: firingPointers.size > 0 || keys.has('Space') }, drawCalls: world.renderer.info.render.calls, ...game.snapshot(),equipment:equipmentForCharacter(game.wave,character.id) }) });
  bindCanvas();world.renderer.setAnimationLoop(frame);
} catch (error) {
  console.error('Initialisation 3D', error); $('play-label').textContent = 'RENDU 3D INDISPONIBLE'; $('renderer-label').textContent = 'VÉRIFIEZ VOTRE NAVIGATEUR'; $('loading-error').hidden = false;
}
