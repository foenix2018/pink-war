import { clamp, segmentBox, segmentSphere } from './game-logic.js';

const $ = id => document.getElementById(id);
const deadzone = v => Math.abs(v || 0) > .16 ? v : 0;
const pressed = button => !!button?.pressed || (button?.value || 0) > .15;
// A grip used as a sprint key must be squeezed on purpose, not just held.
const squeezed = button => (button?.value ?? (button?.pressed ? 1 : 0)) > .6;
const otherHand = hand => hand === 'left' ? 'right' : 'left';

// Touch Plus uses xr-standard: trigger 0, squeeze 1, stick 3, A/X 4, B/Y 5.
export const VR_DEFAULTS = Object.freeze({ hand: 'right', turn: 'snap30', move: 'head', laser: 'always', haptics: true });
const CHOICES = Object.freeze({ hand: ['right', 'left'], turn: ['snap30', 'snap45', 'smooth'], move: ['head', 'hand'], laser: ['always', 'grip'] });
const SETTINGS_KEY = 'pink-war-vr';
const TURN_ANGLE = Object.freeze({ snap30: Math.PI / 6, snap45: Math.PI / 4 });
export function sanitizeVRSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}, result = { ...VR_DEFAULTS };
  for (const [key, options] of Object.entries(CHOICES)) if (options.includes(source[key])) result[key] = source[key];
  result.haptics = source.haptics !== false;
  return result;
}
const loadSettings = () => { try { return sanitizeVRSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { return { ...VR_DEFAULTS }; } };
const settingsOf = controller => controller.settings || VR_DEFAULTS;
const controllerOf = (controller, hand) => (controller.controllers || []).find(c => c.ray.userData.source?.handedness === hand);
const padOf = (controller, hand) => controllerOf(controller, hand)?.ray.userData.source.gamepad;

// Buttons are assigned by role: the shooting hand owns reload / next weapon, the other hand moves,
// reloads, switches back and pauses. A left-handed layout simply mirrors the controllers.
export const buttonNames = hand => hand === 'left' ? { reload: 'X', next: 'Y', previous: 'A', pause: 'B' } : { reload: 'A', next: 'B', previous: 'X', pause: 'Y' };
export function questControls(hand = 'right') {
  const left = hand === 'left', b = buttonNames(hand);
  const mainF = left ? 'gauche' : 'droite', sideF = left ? 'droite' : 'gauche', mainM = left ? 'gauche' : 'droit', sideM = left ? 'droit' : 'gauche';
  return [
    [`Manette ${mainF}`, 'Pistolet : le canon est la visée'],
    [`Gâchette ${mainF}`, 'Tirer · maintenir pour charger'],
    [`Poignée ${mainF}`, 'Renforcer le laser de visée'],
    [b.reload, 'Recharger la batterie'],
    [b.next, 'Arme suivante'],
    [`Joystick ${mainM}`, 'Rotation (crans ou fluide)'],
    [`Clic joystick ${mainM}`, 'Afficher / masquer l’aide'],
    [`Joystick ${sideM}`, 'Se déplacer'],
    [`Clic / poignée ${sideF}`, 'Courir (maintenu)'],
    [`Gâchette ${sideF}`, 'Recharger, main libre'],
    [b.previous, 'Arme précédente'],
    [b.pause, 'Pause / reprise']
  ];
}
export const QUEST_CONTROLS = Object.freeze(questControls('right'));

// [strength, milliseconds] for each hand; heavier weapons kick harder.
const SHOT_HAPTIC = Object.freeze({ r9: [.3, 22], bloom: [.22, 16], petal: [.55, 40], thorn: [.8, 65], nova: [1, 110] });
export function hapticPlan(type, arg) {
  switch (type) {
    case 'shot': return { main: SHOT_HAPTIC[arg] || SHOT_HAPTIC.r9 };
    case 'charge': return { main: [.08 + .4 * clamp(arg || 0, 0, 1), 40] };
    case 'hit': return { main: [.12, 18] };
    case 'kill': return { main: [.4, 40] };
    case 'weapon': return { main: [.2, 35] };
    case 'reload': return { main: [.18, 30], side: [.18, 30] };
    case 'reloaded': return { main: [.35, 45], side: [.35, 45] };
    case 'damage': return { main: [.6, 90], side: [.6, 90] };
    default: return {};
  }
}
function buzz(pad, [strength, duration]) {
  try {
    const actuator = pad?.hapticActuators?.[0];
    if (actuator?.pulse) actuator.pulse(strength, duration)?.catch?.(() => {});
    else pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration, strongMagnitude: strength, weakMagnitude: strength })?.catch?.(() => {});
  } catch {}
}

// Quest runs best at a steady 90 Hz; lower the cost first, then the refresh rate, never below 72 Hz.
export const pickFrameRate = rates => rates.filter(rate => rate <= 90).sort((a, b) => b - a)[0] || null;
export function perfStep(state, meanFrame) {
  if (meanFrame <= 1.3 / state.rate) return null;
  if (state.foveation < 1) return { foveation: 1 };
  const lower = state.rates.filter(rate => rate < state.rate && rate >= 72).sort((a, b) => b - a)[0];
  return lower ? { rate: lower } : null;
}

export function traceVRAim(origin, direction, enemies = [], obstacles = [], range = 160) {
  const end = { x: origin.x + direction.x * range, y: origin.y + direction.y * range, z: origin.z + direction.z * range };
  let nearest = 1, enemy = null;
  for (const e of enemies) {
    const hit = segmentSphere(origin, end, { x: e.x, y: e.elite ? 1.35 : 1.15, z: e.z }, e.elite ? 1.3 : 1.05);
    if (hit !== null && hit < nearest) { nearest = hit; enemy = e; }
  }
  for (const wall of obstacles) {
    const hit = segmentBox(origin, end, wall);
    if (hit !== null && hit <= nearest) { nearest = hit; enemy = null; }
  }
  const distance = Math.max(.05, nearest * range - .02);
  return { point: { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance, z: origin.z + direction.z * distance }, distance, enemy };
}

// The hand sits where the controller grip is, a little below and behind the target ray.
const GRIP_MOUNT = Object.freeze({ x: 0, y: .11, z: -.045 });

// Immersive WebXR uses the headset's poses; phones use two real eye cameras.
export class VRController {
  constructor(hooks) {
    this.hooks = hooks; this.mode = 'off'; this.session = null; this.rig = null; this.settings = loadSettings();
    this.controllers = []; this.previous = new Map(); this.phoneYaw = null; this.phonePitch = 0;
    this.headingOrigin = null; this.sensor = false; this.hud = null; this.hudTime = 0; this.busy = false;
    this.snapArmed = true; this.triggerBlocked = true; this.precision = false; this.trackingLost = false;
    this.showControls = false; this.helpTime = 0; this.sight = null; this.lastMoveYaw = null;
    this.perf = null; this.shadowTick = 0; this.chargeBuzz = 0; this.scratch = null;
    this.renderControls(); this.bindSettings();
    $('vr-button').onclick = $('hud-vr-button').onclick = () => this.open();
    $('enter-xr').onclick = () => this.enterXR();
    $('enter-stereo').onclick = () => this.enterStereo();
    $('vr-exit').onclick = () => this.exit();
  }
  get active() { return this.mode !== 'off'; }
  get frameRate() { return this.session?.frameRate || this.perf?.rate || 0; }
  renderControls() {
    const controls = $('quest-controls'); if (!controls) return;
    controls.replaceChildren();
    for (const [control, action] of questControls(settingsOf(this).hand)) {
      const row = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = control; detail.textContent = action; row.append(term, detail); controls.append(row);
    }
    this.drawControls();
  }
  bindSettings() {
    for (const [key, id] of [['hand', 'vr-hand'], ['turn', 'vr-turn'], ['move', 'vr-move'], ['laser', 'vr-laser']]) {
      const field = $(id); if (!field) continue;
      field.value = this.settings[key];
      field.onchange = () => this.change({ [key]: field.value });
    }
    const haptics = $('vr-haptics');
    if (haptics) { haptics.checked = this.settings.haptics; haptics.onchange = () => this.change({ haptics: haptics.checked }); }
  }
  change(patch) {
    const hand = this.settings.hand;
    this.settings = sanitizeVRSettings({ ...this.settings, ...patch });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch {}
    if (this.settings.hand !== hand) { this.renderControls(); this.applyRoles(); this.cancelTrigger(); }
  }
  async open() {
    if (this.active) { await this.exit(); return; }
    this.hooks.openPanel('vr-dialog'); $('enter-xr').disabled = true;
    $('vr-status').textContent = 'Recherche d’un casque compatible…';
    try {
      const supported = !!(window.isSecureContext && navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'));
      $('enter-xr').disabled = !supported;
      $('vr-status').textContent = supported ? 'Casque WebXR disponible. Sur Meta Quest 3, ouvrez le jeu dans Meta Quest Browser et utilisez les deux manettes Touch Plus. La VR passe en vue FPS.' : 'Le navigateur ne propose pas de casque WebXR. Sur Quest 3, ouvrez ce lien HTTPS dans Meta Quest Browser. Sur iPhone, la vue stéréoscopique affiche une image pour chaque œil.';
    } catch { $('vr-status').textContent = 'Le casque est inaccessible dans ce navigateur. La vue stéréoscopique reste disponible.'; }
  }
  makeHUD() {
    const { T, camera } = this.hooks.world(), canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 192;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const plane = new T.Mesh(new T.PlaneGeometry(.58, .174), material);
    plane.position.set(0, .25, -.95); plane.renderOrder = 100; plane.frustumCulled = false; camera.add(plane);
    this.hud = { canvas, texture, plane }; this.hudTime = 0;
    if (this.mode === 'xr') {
      const help = document.createElement('canvas'); help.width = 960; help.height = 620;
      const helpTexture = new T.CanvasTexture(help); helpTexture.colorSpace = T.SRGBColorSpace;
      const helpMaterial = new T.MeshBasicMaterial({ map: helpTexture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
      const helpPlane = new T.Mesh(new T.PlaneGeometry(.72, .465), helpMaterial);
      helpPlane.position.set(0, -.13, -1.05); helpPlane.renderOrder = 101; helpPlane.frustumCulled = false; camera.add(helpPlane);
      this.hud.help = { canvas: help, texture: helpTexture, plane: helpPlane };
      this.drawControls();
    }
  }
  drawControls() {
    if (!this.hud?.help) return;
    const { canvas, texture } = this.hud.help, c = canvas.getContext('2d'), hand = settingsOf(this).hand, b = buttonNames(hand);
    c.clearRect(0, 0, canvas.width, canvas.height); c.fillStyle = 'rgba(18,12,26,.93)'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = this.hooks.world().character?.accent || '#ff9ac3'; c.font = 'bold 29px monospace'; c.fillText('PINK WAR · META QUEST 3', 26, 46);
    c.font = '20px monospace';
    questControls(hand).forEach(([control, action], index) => { const y = 90 + index * 33; c.fillStyle = '#fff0f7'; c.fillText(control, 26, y); c.fillStyle = '#dfc5dc'; c.fillText(action, 340, y); });
    c.font = '19px monospace'; c.fillStyle = '#a8e2db';
    c.fillText(`En pause : ${b.reload} reprend · ${b.next} quitte la VR`, 26, 536);
    c.fillText(`Fin de partie : ${b.reload} rejoue · ${b.next} quitte la VR`, 26, 570);
    texture.needsUpdate = true;
  }
  removeHUD() {
    if (!this.hud) return;
    if (this.hud.help) {
      const help = this.hud.help; help.plane.removeFromParent(); help.plane.geometry.dispose(); help.plane.material.dispose(); help.texture.dispose();
    }
    this.hud.plane.removeFromParent(); this.hud.plane.geometry.dispose(); this.hud.plane.material.dispose(); this.hud.texture.dispose(); this.hud = null;
  }
  makeSight() {
    const { T, scene, palette } = this.hooks.world();
    const group = new T.Group(), geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    const beam = new T.Line(geometry, new T.LineBasicMaterial({ color: palette.rose, transparent: true, opacity: .2, toneMapped: false }));
    const marker = new T.Mesh(new T.RingGeometry(.65, 1, 24), new T.MeshBasicMaterial({ color: palette.rose, transparent: true, opacity: .9, side: T.DoubleSide, toneMapped: false }));
    beam.frustumCulled = marker.frustumCulled = false; group.add(beam, marker); group.visible = false; scene.add(group);
    this.sight = { group, beam, marker };
  }
  removeSight() {
    if (!this.sight) return;
    this.sight.group.removeFromParent();
    for (const mesh of [this.sight.beam, this.sight.marker]) { mesh.geometry.dispose(); mesh.material.dispose(); }
    this.sight = null;
  }
  // A small slide display keeps the battery readable without looking away from the target.
  makeAmmo(gun) {
    const { T } = this.hooks.world(), canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const plane = new T.Mesh(new T.PlaneGeometry(.08, .04), new T.MeshBasicMaterial({ map: texture, toneMapped: false }));
    plane.position.set(0, .112, 0); plane.rotation.x = -1.05; plane.frustumCulled = false; gun.add(plane);
    gun.userData.ammo = { canvas, texture, plane, key: '' };
  }
  drawAmmo(gun, game) {
    const display = gun.userData.ammo; if (!display) return;
    const reloading = game.reloadRemaining > 0, capacity = game.weapon.capacity, ammo = game.ammo[game.weaponIndex];
    const progress = reloading ? 1 - game.reloadRemaining / game.weapon.reload : game.charge, step = Math.round(clamp(progress, 0, 1) * 10);
    const key = `${ammo}|${capacity}|${reloading}|${step}`; if (key === display.key) return; display.key = key;
    const c = display.canvas.getContext('2d'), accent = this.hooks.world().character?.accent || '#ff9ac3';
    c.fillStyle = 'rgba(18,12,26,.95)'; c.fillRect(0, 0, 128, 64);
    c.fillStyle = reloading ? '#a8e2db' : ammo <= capacity / 4 ? '#ff6b8a' : accent; c.textAlign = 'center';
    c.font = 'bold 38px monospace'; c.fillText(reloading ? '↻' : String(ammo), 64, 40);
    c.font = '13px monospace'; c.fillStyle = '#dfc5dc'; c.fillText(reloading ? 'RECHARGE' : `/ ${capacity}`, 64, 56);
    c.fillStyle = '#574158'; c.fillRect(8, 3, 112, 4); c.fillStyle = accent; c.fillRect(8, 3, 112 * step / 10, 4);
    display.texture.needsUpdate = true;
  }
  cancelTrigger() {
    const game = this.hooks.game(); game.charge = 0; game.triggerHeld = false; this.triggerBlocked = true;
  }
  // Show the pistol in the shooting hand and a bare gauntlet in the other one.
  applyRoles() {
    const main = settingsOf(this).hand;
    for (const c of this.controllers) {
      const hand = c.ray.userData.source?.handedness, known = hand === 'left' || hand === 'right';
      c.gun.visible = hand === main; c.bare.visible = known && hand !== main;
      // The bare glove copies the gun's scale and mirrors for the left hand.
      const size = (c.bare.userData.size ??= c.bare.scale.x) * 1.05;
      c.bare.scale.set(hand === 'left' ? -size : size, size, size);
    }
  }
  async enterXR() {
    if (this.busy || this.active || !navigator.xr || !this.hooks.world()) return;
    // Request immediately in the click handler: WebXR requires user activation.
    let pending;
    try { pending = navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'], optionalFeatures: ['bounded-floor'] }); }
    catch (error) { this.fail(error); return; }
    this.busy = true; $('enter-xr').disabled = true;
    let session;
    try {
      session = await pending;
      await this.hooks.webGL();
      const world = this.hooks.world(), { T, scene, camera, renderer } = world;
      this.session = session; this.mode = 'xr'; this.rig = new T.Group(); scene.add(this.rig); this.rig.add(camera);
      this.previous.clear(); this.snapArmed = true; this.precision = false; this.trackingLost = false;
      this.showControls = false; this.helpTime = 8; this.lastMoveYaw = null; this.cancelTrigger();
      camera.clearViewOffset();
      camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); world.weapon.visible = false; world.soldier.root.visible = false;
      renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
      renderer.xr.setFramebufferScaleFactor?.(.9); renderer.xr.setFoveation?.(.5);
      // Shadows are refreshed every other frame in the headset; the sun is fixed, so it is barely visible.
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; this.shadowTick = 0;
      session.updateRenderState({ depthNear: .08, depthFar: 650 });
      const rates = Array.from(session.supportedFrameRates || []), rate = pickFrameRate(rates);
      this.perf = { rates, rate: rate || session.frameRate || 72, foveation: .5, frames: 0, total: 0, warmup: 3 };
      if (rate) this.setFrameRate(rate);
      this.controllers = [0, 1].map(index => {
        const ray = renderer.xr.getController(index); this.rig.add(ray);
        const mount = new T.Group(), gun = world.createGun(), hand = world.createHand(), bare = world.createHand();
        mount.position.set(GRIP_MOUNT.x, GRIP_MOUNT.y, GRIP_MOUNT.z); ray.add(mount);
        gun.add(hand); gun.userData.hand = hand; gun.scale.setScalar(1.05); gun.visible = bare.visible = false; mount.add(gun, bare);
        this.makeAmmo(gun);
        // Models held a few centimetres from the eyes gain nothing from the sun's shadow pass.
        mount.traverse(object => { if (object.isMesh) object.castShadow = false; });
        const connected = e => { ray.userData.source = e.data; this.applyRoles(); this.triggerBlocked = true; };
        const disconnected = () => { const wasMain = ray.userData.source?.handedness === settingsOf(this).hand; ray.userData.source = null; this.applyRoles(); if (wasMain) { this.cancelTrigger(); this.hooks.pause(); } };
        ray.addEventListener('connected', connected); ray.addEventListener('disconnected', disconnected);
        return { ray, mount, gun, bare, level: 0, connected, disconnected };
      });
      this.hooks.begin(); this.makeHUD(); this.makeSight(); document.body.classList.add('xr-mode');
      this.positionRig();
      session.addEventListener('end', () => this.finishXR(), { once: true });
      session.addEventListener('visibilitychange', () => { if (session.visibilityState !== 'visible') { this.cancelTrigger(); this.hooks.pause(); } });
      await renderer.xr.setSession(session);
    } catch (error) {
      if (session) await session.end().catch(() => {});
      if (this.mode === 'xr') this.finishXR();
      this.fail(error);
    } finally { this.busy = false; }
  }
  setFrameRate(rate) {
    try { Promise.resolve(this.session?.updateTargetFrameRate?.(rate)).catch(() => {}); } catch {}
  }
  fail(error) {
    this.hooks.openPanel('vr-dialog');
    $('vr-status').textContent = error?.name === 'NotAllowedError' ? 'L’accès VR a été refusé. Autorisez le casque, puis réessayez.' : 'Le casque n’a pas pu démarrer. Vérifiez sa connexion et ouvrez le jeu depuis son navigateur.';
    $('enter-xr').disabled = false;
  }
  finishXR() {
    if (this.mode !== 'xr') return;
    const world = this.hooks.world(); this.removeHUD(); this.removeSight(); this.cancelTrigger();
    world.scene.add(world.camera);
    this.rig?.removeFromParent();
    for (const { ray, gun, connected, disconnected } of this.controllers) {
      ray.removeEventListener('connected', connected); ray.removeEventListener('disconnected', disconnected);
      const { ammo, flash } = gun.userData;
      gun.removeFromParent(); flash.material.dispose();
      if (ammo) { ammo.plane.geometry.dispose(); ammo.plane.material.dispose(); ammo.texture.dispose(); }
      ray.removeFromParent();
    }
    this.controllers = []; this.rig = null; this.session = null; this.mode = 'off'; this.previous.clear(); this.perf = null;
    world.renderer.shadowMap.autoUpdate = true; world.renderer.xr.enabled = false; document.body.classList.remove('xr-mode'); this.hooks.afterExit();
  }
  async enterStereo() {
    if (this.busy || this.active || !this.hooks.world()) return;
    // iOS also requires this permission request directly inside the gesture.
    let permission = Promise.resolve('unavailable');
    if (typeof DeviceOrientationEvent !== 'undefined') {
      try { permission = typeof DeviceOrientationEvent.requestPermission === 'function' ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted'); }
      catch { permission = Promise.resolve('denied'); }
    }
    this.busy = true;
    try {
      const granted = await permission.catch(() => 'denied');
      this.mode = 'stereo'; this.headingOrigin = null; this.phoneYaw = null; this.sensor = false;
      this.hooks.begin(); this.makeHUD(); document.body.classList.add('stereo-mode');
      $('vr-exit').hidden = false; $('stereo-reticle').hidden = false; $('vr-phone-note').hidden = false;
      $('vr-phone-note').textContent = innerHeight > innerWidth ? 'Tournez le téléphone en paysage pour votre support VR.' : 'Deux yeux · Joysticks ou manette · Capteurs si autorisés';
      const world = this.hooks.world();
      this.orientationHandler = event => {
        if (event.alpha === null || event.beta === null || event.gamma === null) return;
        const { T } = world, q = new T.Quaternion();
        q.setFromEuler(new T.Euler(event.beta * Math.PI / 180, event.alpha * Math.PI / 180, -event.gamma * Math.PI / 180, 'YXZ'));
        q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2));
        const angle = screen.orientation?.angle ?? window.orientation ?? 0;
        q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), -angle * Math.PI / 180));
        const pose = new T.Euler().setFromQuaternion(q, 'YXZ');
        this.headingOrigin ??= pose.y; this.phoneYaw = pose.y - this.headingOrigin;
        this.phonePitch = clamp(pose.x, -1.2, 1.2); this.sensor = true;
      };
      if (granted === 'granted') window.addEventListener('deviceorientation', this.orientationHandler);
      else $('vr-phone-note').textContent = 'Capteurs indisponibles · Regardez avec le joystick droit ou une manette.';
      world.resize();
      // Fullscreen is optional; Safari still displays the stereo scene without it.
      document.documentElement.requestFullscreen?.().catch(() => {});
    } finally { this.busy = false; }
  }
  async exit() {
    if (this.mode === 'xr') { await this.session?.end(); return; }
    if (this.mode !== 'stereo') return;
    window.removeEventListener('deviceorientation', this.orientationHandler); this.removeHUD();
    this.mode = 'off'; this.phoneYaw = null; this.previous.clear(); document.body.classList.remove('stereo-mode');
    $('vr-exit').hidden = true; $('stereo-reticle').hidden = true; $('vr-phone-note').hidden = true;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    this.hooks.world().resize(); this.hooks.afterExit();
  }
  positionRig(heading = this.hooks.game().player.yaw) {
    if (!this.rig) return;
    const game = this.hooks.game(); this.rig.position.set(game.player.x, 0, game.player.z); this.rig.rotation.y = heading; this.rig.updateMatrixWorld(true);
    this.hooks.world().renderer.xr.updateCamera(this.hooks.world().camera);
  }
  // Movement follows the head, or the pointing direction of the free hand when chosen.
  movementYaw(heading) {
    this.positionRig(heading);
    const world = this.hooks.world(), scratch = this.scratch ||= {};
    const side = settingsOf(this).move === 'hand' ? controllerOf(this, otherHand(settingsOf(this).hand)) : null;
    // Cameras and controllers both look down their local -Z axis.
    const forward = (scratch.forward ||= new world.T.Vector3()).set(0, 0, -1).applyQuaternion((side?.ray || world.camera).getWorldQuaternion(scratch.facing ||= new world.T.Quaternion()));
    if (Math.hypot(forward.x, forward.z) > .15) this.lastMoveYaw = Math.atan2(-forward.x, -forward.z);
    return this.lastMoveYaw ?? heading;
  }
  input(frame) {
    const result = { x: 0, z: 0, turn: 0, tilt: 0, snap: 0, fire: false, sprint: false, precision: false };
    const xr = this.mode === 'xr', cfg = settingsOf(this), mainHand = cfg.hand, sideHand = otherHand(mainHand);
    const sources = xr ? [...(this.session?.inputSources || [])] : [...(navigator.getGamepads?.() || [])].filter(Boolean).map(gamepad => ({ gamepad, handedness: 'both' }));
    const phase = this.hooks.phase?.() || 'playing', actions = new Set();
    const visible = !xr || !this.session?.visibilityState || this.session.visibilityState === 'visible';
    let rawFire = false, mainTracked = !xr;
    const activeHands = new Set(sources.map(source => source.handedness));
    for (const key of this.previous.keys()) if (!activeHands.has(key.split(':')[0])) this.previous.delete(key);
    for (const source of sources) {
      const pad = source.gamepad; if (!pad) continue;
      const axes = pad.axes || [], main = !xr || source.handedness === mainHand, side = !xr || source.handedness === sideHand;
      const tracked = visible && (!xr || !frame || !!frame.getPose(source.targetRaySpace, this.hooks.world().renderer.xr.getReferenceSpace()));
      const stick = xr && axes.length >= 4 ? 2 : 0;
      if (side && tracked) {
        result.x += deadzone(axes[stick]); result.z += deadzone(axes[stick + 1]);
        result.sprint ||= pressed(pad.buttons[xr ? 3 : 10]) || (xr && squeezed(pad.buttons[1]));
      }
      if (main) {
        mainTracked ||= tracked; rawFire ||= pressed(pad.buttons[xr ? 0 : 7]);
        result.precision ||= tracked && pressed(pad.buttons[xr ? 1 : 6]);
        if (xr) {
          const turn = axes[stick] || 0;
          if (cfg.turn === 'smooth') { if (tracked) result.turn += deadzone(turn); }
          else {
            if (Math.abs(turn) < .25) this.snapArmed = true;
            if (Math.abs(turn) > .7 && this.snapArmed !== false) { if (tracked) result.snap = Math.sign(turn) * TURN_ANGLE[cfg.turn]; this.snapArmed = false; }
          }
        } else { result.turn += deadzone(axes[2]); result.tilt += deadzone(axes[3]); }
      }
      const edge = (key, index) => { const id = `${source.handedness}:${key}`, down = pressed(pad.buttons[index]); if (down && !this.previous.get(id) && tracked) actions.add(key); this.previous.set(id, down); };
      if (main) { edge('reload', xr ? 4 : 0); edge('next', xr ? 5 : 1); if (xr) edge('help', 3); }
      if (xr && side) { edge('previous', 4); edge('pause', 5); edge('quickReload', 0); }
      if (!xr) edge('pause', 9);
    }
    if (actions.has('help')) this.showControls = !(this.showControls || this.helpTime > 0);
    if (actions.has('help')) { this.helpTime = 0; this.hudTime = 0; }
    if (actions.has('pause')) { this.hooks.togglePause(); if (xr) this.cancelTrigger(); }
    else if ((phase === 'paused' || phase === 'over') && actions.has('reload') && xr) { this.hooks.begin(); this.cancelTrigger(); }
    else if ((phase === 'paused' || phase === 'over') && actions.has('next') && xr) { this.cancelTrigger(); this.exit().catch(error => this.fail(error)); }
    else if (phase === 'playing') {
      const game = this.hooks.game();
      if (actions.has('next') || actions.has('previous')) { if (game.cycleWeapon(actions.has('next') ? 1 : -1) && xr) this.cancelTrigger(); }
      else if (actions.has('reload') || actions.has('quickReload')) { if (game.reload() && xr) this.cancelTrigger(); }
    }
    this.trackingLost = xr && !mainTracked;
    if (xr && (!visible || !mainTracked)) { this.cancelTrigger(); this.hooks.pause?.(); }
    const playing = (this.hooks.phase?.() || phase) === 'playing';
    if (!playing) { result.x = result.z = result.turn = result.tilt = result.snap = 0; result.sprint = result.precision = false; if (xr) this.cancelTrigger(); }
    if (!rawFire) this.triggerBlocked = false;
    result.fire = playing && mainTracked && rawFire && (!xr || !this.triggerBlocked);
    this.precision = result.precision && playing;
    return result;
  }
  // The returned vectors are reused: read them before calling aim() again.
  aim() {
    if (this.mode !== 'xr') return null;
    const world = this.hooks.world(), { T } = world, tmp = this.scratch ||= {};
    tmp.origin ||= new T.Vector3(); tmp.direction ||= new T.Vector3(); tmp.quaternion ||= new T.Quaternion(); tmp.head ||= new T.Vector3(); tmp.muzzle ||= new T.Vector3();
    const main = controllerOf(this, settingsOf(this).hand);
    const source = main?.ray || world.camera; source.updateWorldMatrix(true, false);
    const { origin, direction } = tmp;
    source.getWorldPosition(origin); source.getWorldQuaternion(tmp.quaternion); direction.set(0, 0, -1).applyQuaternion(tmp.quaternion);
    if (main?.gun) {
      if (main.gun.userData.index !== this.hooks.game().weaponIndex) main.gun.userData.setVariant?.(this.hooks.game().weaponIndex);
      main.gun.updateWorldMatrix(true, false);
      origin.copy(main.gun.localToWorld(tmp.muzzle.copy(main.gun.userData.flash.position)));
      // A tracked hand can physically cross a wall; the muzzle cannot shoot past it.
      const head = world.camera.getWorldPosition(tmp.head), length = head.distanceTo(origin);
      let nearest = 1;
      for (const wall of world.obstacles || []) { const hit = segmentBox(head, origin, wall); if (hit !== null) nearest = Math.min(nearest, hit); }
      if (nearest < 1) origin.lerpVectors(head, origin, Math.max(0, nearest - .025 / Math.max(length, .001)));
    } else if (main) origin.addScaledVector(direction, .34);
    return { origin, direction };
  }
  updateSight() {
    if (!this.sight) return;
    const world = this.hooks.world(), game = this.hooks.game();
    this.sight.group.visible = (settingsOf(this).laser === 'always' || this.precision) && !this.trackingLost && this.hooks.phase() === 'playing';
    if (!this.sight.group.visible) return;
    const aim = this.aim(), hit = traceVRAim(aim.origin, aim.direction, game.enemies, world.obstacles);
    const points = this.sight.beam.geometry.attributes.position;
    points.setXYZ(0, aim.origin.x, aim.origin.y, aim.origin.z); points.setXYZ(1, hit.point.x, hit.point.y, hit.point.z); points.needsUpdate = true;
    this.sight.marker.position.set(hit.point.x, hit.point.y, hit.point.z);
    this.sight.marker.quaternion.copy(world.camera.getWorldQuaternion(this.scratch.quaternion));
    this.sight.marker.scale.setScalar(clamp(hit.distance * .0025, .008, .25));
    const color = hit.enemy ? 0xa8e2db : world.palette.rose;
    this.sight.beam.material.color.setHex(color); this.sight.marker.material.color.setHex(color);
    this.sight.beam.material.opacity = this.precision ? .6 : .2;
  }
  haptic(type, arg) {
    if (this.mode !== 'xr' || settingsOf(this).haptics === false) return;
    const plan = hapticPlan(type, arg), main = settingsOf(this).hand;
    if (plan.main) buzz(padOf(this, main), plan.main);
    if (plan.side) buzz(padOf(this, otherHand(main)), plan.side);
  }
  trackPerformance(dt) {
    const perf = this.perf; if (!perf || this.hooks.phase() !== 'playing') return;
    if ((perf.warmup -= dt) > 0) return;
    perf.frames++; perf.total += dt;
    if (perf.frames < 120) return;
    const step = perfStep(perf, perf.total / perf.frames); perf.frames = 0; perf.total = 0;
    if (!step) return;
    perf.warmup = 2;
    if (step.foveation) { perf.foveation = step.foveation; this.hooks.world().renderer.xr.setFoveation?.(step.foveation); }
    if (step.rate) { perf.rate = step.rate; this.setFrameRate(step.rate); }
  }
  update(dt, flash, recoil = 0) {
    if (!this.active) return;
    const game = this.hooks.game();
    if (this.mode === 'xr') {
      const main = settingsOf(this).hand, level = Math.max(1, game.wave), kick = clamp(recoil / .09, 0, 1);
      // updateCamera() already placed the rig this frame while playing.
      if (this.hooks.phase() !== 'playing') this.positionRig();
      for (const c of this.controllers) {
        const isMain = c.ray.userData.source?.handedness === main;
        if (c.gun.userData.index !== game.weaponIndex) c.gun.userData.setVariant(game.weaponIndex);
        if (c.level !== level) { c.gun.userData.hand?.userData.setLevel(level); c.bare.userData.setLevel(level); c.level = level; }
        c.gun.userData.flash.visible = flash > 0 && isMain;
        c.gun.position.z = isMain ? kick * .05 : 0; c.gun.rotation.x = isMain ? kick * .16 : 0;
      }
      const gun = controllerOf(this, main)?.gun; if (gun) this.drawAmmo(gun, game);
      this.updateSight(); this.helpTime = Math.max(0, this.helpTime - dt);
      if (this.hud?.help) this.hud.help.plane.visible = this.showControls || this.helpTime > 0 || ['paused', 'over'].includes(this.hooks.phase());
      // Heavy weapons rumble harder as the charge builds.
      this.chargeBuzz -= dt;
      if (game.charge > 0 && this.chargeBuzz <= 0) { this.haptic('charge', game.charge); this.chargeBuzz = .06; }
      this.trackPerformance(dt);
      if ((this.shadowTick ^= 1) === 0) this.hooks.world().renderer.shadowMap.needsUpdate = true;
    }
    this.hudTime -= dt;
    if (this.hud && this.hudTime <= 0) {
      this.hudTime = .12; const { canvas, texture } = this.hud, c = canvas.getContext('2d'), phase = this.hooks.phase();
      const hand = settingsOf(this).hand, b = buttonNames(hand), mainName = hand === 'left' ? 'gauche' : 'droite';
      c.clearRect(0, 0, 640, 192); c.fillStyle = 'rgba(18,12,26,.84)'; c.fillRect(0, 0, 640, 192);
      const character=this.hooks.world().character;
      c.fillStyle = character?.accent||'#ff9ac3'; c.font = 'bold 28px monospace'; c.fillText(`${character?.name||'GHJU'} · PINK WAR   ${String(Math.max(1,game.wave)).padStart(2,'0')} / 10`, 22, 38);
      c.fillStyle = '#fff0f7'; c.font = '23px monospace'; c.fillText(`SANTÉ ${Math.ceil(game.player.hp)}   ${game.weapon.name} ${game.ammo[game.weaponIndex]}/${game.weapon.capacity}`, 22, 75);
      c.fillStyle = game.regenerating ? '#a8e2db' : character?.accent||'#ff7daa'; c.fillRect(22, 91, game.player.hp / 100 * 590, 5);
      c.fillStyle = '#dfc5dc'; c.font = '18px monospace';
      c.fillText(this.trackingLost ? `SUIVI DE LA MANETTE ${mainName.toUpperCase()} INDISPONIBLE` : phase === 'paused' ? `PAUSE · ${b.reload} reprend · ${b.next} quitte la VR` : game.state === 'won' ? 'VICTOIRE · La brèche est fermée' : game.state === 'over' ? `MISSION TERMINÉE · ${b.reload} rejoue / ${b.next} quitte` : game.reloadRemaining > 0 ? `RECHARGE ${game.reloadRemaining.toFixed(1)} S · TIR BLOQUÉ` : game.weapon.chargeTime ? `CHARGE ${Math.round(game.charge*100)}% · Maintenir / relâcher` : `${game.enemies.length+game.toSpawn} ENNEMIS · ${b.reload} recharge / ${b.next} arme`, 22, 127);
      const progress = game.reloadRemaining > 0 ? 1 - game.reloadRemaining / game.weapon.reload : game.charge;
      c.fillStyle = '#574158'; c.fillRect(22, 139, 590, 5); c.fillStyle = character?.accent || '#ff7daa'; c.fillRect(22, 139, clamp(progress, 0, 1) * 590, 5);
      c.fillStyle = '#dfc5dc'; c.font = '17px monospace';
      c.fillText(this.mode === 'xr' ? this.trackingLost ? `Retrouver le suivi · ${b.reload} / ${b.pause} pour reprendre` : phase === 'over' ? `${b.reload} : nouvelle campagne · ${b.next} : quitter la VR` : this.precision ? `LASER RENFORCÉ · Gâchette tire · ${b.pause} pause` : `Gâchette : tir · ${b.pause} : pause · Clic joystick ${hand === 'left' ? 'gauche' : 'droit'} : aide` : 'RT : tir · A : recharge · B : arme · Menu : pause', 22, 172);
      texture.needsUpdate = true;
    }
    if (this.mode === 'stereo' && innerHeight > innerWidth) $('vr-phone-note').textContent = 'Tournez le téléphone en paysage pour votre support VR.';
  }
}
