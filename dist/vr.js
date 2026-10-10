import { clamp, segmentBox, segmentSphere } from './game-logic.js';

const $ = id => document.getElementById(id);
const deadzone = v => Math.abs(v || 0) > .16 ? v : 0;
const pressed = button => !!button?.pressed || (button?.value || 0) > .15;
const SNAP_ANGLE = Math.PI / 6;

// Touch Plus uses xr-standard: trigger 0, squeeze 1, stick 3, A/X 4, B/Y 5.
export const QUEST_CONTROLS = Object.freeze([
  ['Joystick gauche', 'Déplacement selon le regard'],
  ['Clic gauche maintenu', 'Courir (hors visée précise)'],
  ['Manette droite', 'Orienter le canon et viser'],
  ['Poignée droite maintenue', 'Afficher le laser de visée'],
  ['Gâchette droite', 'Tirer / maintenir pour charger'],
  ['Joystick droit', 'Rotation par crans de 30°'],
  ['A / B', 'Recharger / arme suivante'],
  ['X / Y', 'Arme précédente / pause'],
  ['Clic joystick droit', 'Afficher ou masquer cette aide']
]);

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

// Immersive WebXR uses the headset's poses; phones use two real eye cameras.
export class VRController {
  constructor(hooks) {
    this.hooks = hooks; this.mode = 'off'; this.session = null; this.rig = null;
    this.controllers = []; this.previous = new Map(); this.phoneYaw = null; this.phonePitch = 0;
    this.headingOrigin = null; this.sensor = false; this.hud = null; this.hudTime = 0; this.busy = false;
    this.snapArmed = true; this.triggerBlocked = true; this.precision = false; this.trackingLost = false;
    this.showControls = false; this.helpTime = 0; this.sight = null; this.lastMoveYaw = null;
    const controls = $('quest-controls');
    if (controls) for (const [control, action] of QUEST_CONTROLS) {
      const row = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = control; detail.textContent = action; row.append(term, detail); controls.append(row);
    }
    $('vr-button').onclick = $('hud-vr-button').onclick = () => this.open();
    $('enter-xr').onclick = () => this.enterXR();
    $('enter-stereo').onclick = () => this.enterStereo();
    $('vr-exit').onclick = () => this.exit();
  }
  get active() { return this.mode !== 'off'; }
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
      const help = document.createElement('canvas'); help.width = 880; help.height = 520;
      const helpTexture = new T.CanvasTexture(help); helpTexture.colorSpace = T.SRGBColorSpace;
      const helpMaterial = new T.MeshBasicMaterial({ map: helpTexture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
      const helpPlane = new T.Mesh(new T.PlaneGeometry(.68, .402), helpMaterial);
      helpPlane.position.set(0, -.13, -1.05); helpPlane.renderOrder = 101; helpPlane.frustumCulled = false; camera.add(helpPlane);
      this.hud.help = { canvas: help, texture: helpTexture, plane: helpPlane };
      this.drawControls();
    }
  }
  drawControls() {
    if (!this.hud?.help) return;
    const { canvas, texture } = this.hud.help, c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height); c.fillStyle = 'rgba(18,12,26,.93)'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = this.hooks.world().character?.accent || '#ff9ac3'; c.font = 'bold 31px monospace'; c.fillText('PINK WAR · META QUEST 3', 28, 48);
    c.font = '23px monospace';
    QUEST_CONTROLS.forEach(([control, action], index) => { const y = 92 + index * 37; c.fillStyle = '#fff0f7'; c.fillText(control, 28, y); c.fillStyle = '#dfc5dc'; c.fillText(action, 412, y); });
    c.font = '21px monospace'; c.fillStyle = '#a8e2db';
    c.fillText('En pause : A ou Y reprend · B quitte la VR', 28, 454);
    c.fillText('Fin de partie : A rejoue · B quitte la VR', 28, 490);
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
    const beam = new T.Line(geometry, new T.LineBasicMaterial({ color: palette.rose, transparent: true, opacity: .4, toneMapped: false }));
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
  cancelTrigger() {
    const game = this.hooks.game(); game.charge = 0; game.triggerHeld = false; this.triggerBlocked = true;
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
      session.updateRenderState({ depthNear: .08, depthFar: 650 });
      this.controllers = [0, 1].map(index => {
        const ray = renderer.xr.getController(index); this.rig.add(ray);
        const gun = world.createGun(); const hand=world.createHand();gun.add(hand);gun.userData.hand=hand;ray.add(gun); gun.scale.setScalar(1.05);
        const connected = e => { ray.userData.source = e.data; gun.visible = e.data.handedness === 'right'; this.triggerBlocked = true; };
        const disconnected = () => { const wasRight = ray.userData.source?.handedness === 'right'; ray.userData.source = null; gun.visible = false; if (wasRight) { this.cancelTrigger(); this.hooks.pause(); } };
        ray.addEventListener('connected', connected); ray.addEventListener('disconnected', disconnected);
        return { ray, gun, connected, disconnected };
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
      gun.removeFromParent(); gun.userData.flash.material.dispose();
      ray.removeFromParent();
    }
    this.controllers = []; this.rig = null; this.session = null; this.mode = 'off'; this.previous.clear();
    world.renderer.xr.enabled = false; document.body.classList.remove('xr-mode'); this.hooks.afterExit();
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
  movementYaw(heading) {
    this.positionRig(heading);
    const world = this.hooks.world(), forward = world.camera.getWorldDirection(new world.T.Vector3());
    if (Math.hypot(forward.x, forward.z) > .15) this.lastMoveYaw = Math.atan2(-forward.x, -forward.z);
    return this.lastMoveYaw ?? heading;
  }
  input(frame) {
    const result = { x: 0, z: 0, turn: 0, tilt: 0, snap: 0, fire: false, sprint: false, precision: false };
    const sources = this.mode === 'xr' ? [...(this.session?.inputSources || [])] : [...(navigator.getGamepads?.() || [])].filter(Boolean).map(gamepad => ({ gamepad, handedness: 'both' }));
    const xr = this.mode === 'xr', phase = this.hooks.phase?.() || 'playing', actions = new Set();
    const visible = !xr || !this.session?.visibilityState || this.session.visibilityState === 'visible';
    let rawFire = false, rightTracked = !xr;
    const activeHands = new Set(sources.map(source => source.handedness));
    for (const key of this.previous.keys()) if (!activeHands.has(key.split(':')[0])) this.previous.delete(key);
    for (const source of sources) {
      const pad = source.gamepad; if (!pad) continue;
      const axes = pad.axes || [], left = source.handedness === 'left' || !xr, right = source.handedness === 'right' || !xr;
      const tracked = visible && (!xr || !frame || !!frame.getPose(source.targetRaySpace, this.hooks.world().renderer.xr.getReferenceSpace()));
      const stick = xr && axes.length >= 4 ? 2 : 0;
      if (left && tracked) { result.x += deadzone(axes[stick]); result.z += deadzone(axes[stick + 1]); result.sprint ||= pressed(pad.buttons[xr ? 3 : 10]); }
      if (right) {
        rightTracked ||= tracked; rawFire ||= pressed(pad.buttons[xr ? 0 : 7]);
        result.precision ||= tracked && pressed(pad.buttons[xr ? 1 : 6]);
        if (xr) {
          const turn = axes[stick] || 0;
          if (Math.abs(turn) < .25) this.snapArmed = true;
          if (Math.abs(turn) > .7 && this.snapArmed !== false) { if (tracked) result.snap = Math.sign(turn) * SNAP_ANGLE; this.snapArmed = false; }
        } else { result.turn += deadzone(axes[2]); result.tilt += deadzone(axes[3]); }
      }
      const edge = (key, index) => { const id = `${source.handedness}:${key}`, down = pressed(pad.buttons[index]); if (down && !this.previous.get(id) && tracked) actions.add(key); this.previous.set(id, down); };
      if (right) { edge('reload', xr ? 4 : 0); edge('next', xr ? 5 : 1); if (xr) edge('help', 3); }
      if (xr && left) { edge('previous', 4); edge('pause', 5); }
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
      else if (actions.has('reload') && game.reload() && xr) this.cancelTrigger();
    }
    this.trackingLost = xr && !rightTracked;
    if (xr && (!visible || !rightTracked)) { this.cancelTrigger(); this.hooks.pause?.(); }
    const playing = (this.hooks.phase?.() || phase) === 'playing';
    if (!playing) { result.x = result.z = result.turn = result.tilt = result.snap = 0; result.sprint = result.precision = false; if (xr) this.cancelTrigger(); }
    if (!rawFire) this.triggerBlocked = false;
    result.fire = playing && rightTracked && rawFire && (!xr || !this.triggerBlocked);
    result.sprint &&= !result.precision; this.precision = result.precision && playing;
    return result;
  }
  aim() {
    if (this.mode !== 'xr') return null;
    const world = this.hooks.world(), { T } = world;
    const right = this.controllers.find(c => c.ray.userData.source?.handedness === 'right');
    const source = right?.ray || world.camera; source.updateWorldMatrix(true, false);
    const origin = source.getWorldPosition(new T.Vector3()), quaternion = source.getWorldQuaternion(new T.Quaternion());
    const direction = new T.Vector3(0, 0, -1).applyQuaternion(quaternion);
    if (right?.gun) {
      right.gun.userData.setVariant?.(this.hooks.game().weaponIndex);
      right.gun.updateWorldMatrix(true, false);
      origin.copy(right.gun.localToWorld(right.gun.userData.flash.position.clone()));
      // A tracked hand can physically cross a wall; the muzzle cannot shoot past it.
      const head = world.camera.getWorldPosition(new T.Vector3()), length = head.distanceTo(origin);
      let nearest = 1;
      for (const wall of world.obstacles || []) { const hit = segmentBox(head, origin, wall); if (hit !== null) nearest = Math.min(nearest, hit); }
      if (nearest < 1) origin.lerpVectors(head, origin, Math.max(0, nearest - .025 / Math.max(length, .001)));
    } else if (right) origin.addScaledVector(direction, .34);
    return { origin, direction };
  }
  updateSight() {
    if (!this.sight) return;
    const world = this.hooks.world(), game = this.hooks.game();
    this.sight.group.visible = this.precision && !this.trackingLost && this.hooks.phase() === 'playing';
    if (!this.sight.group.visible) return;
    const aim = this.aim(), hit = traceVRAim(aim.origin, aim.direction, game.enemies, world.obstacles);
    const points = this.sight.beam.geometry.attributes.position;
    points.setXYZ(0, aim.origin.x, aim.origin.y, aim.origin.z); points.setXYZ(1, hit.point.x, hit.point.y, hit.point.z); points.needsUpdate = true;
    this.sight.marker.position.set(hit.point.x, hit.point.y, hit.point.z);
    this.sight.marker.quaternion.copy(world.camera.getWorldQuaternion(new world.T.Quaternion()));
    this.sight.marker.scale.setScalar(clamp(hit.distance * .0025, .008, .25));
    const color = hit.enemy ? 0xa8e2db : world.palette.rose;
    this.sight.beam.material.color.setHex(color); this.sight.marker.material.color.setHex(color);
  }
  haptic(type) {
    if (this.mode !== 'xr') return;
    const pad = this.controllers.find(c => c.ray.userData.source?.handedness === 'right')?.ray.userData.source.gamepad;
    try { pad?.hapticActuators?.[0]?.pulse?.(type === 'damage' ? .5 : type === 'shot' ? .18 : .1, type === 'damage' ? 80 : 30)?.catch?.(() => {}); } catch {}
  }
  update(dt, flash) {
    if (!this.active) return;
    const game = this.hooks.game();
    if (this.mode === 'xr') {
      this.positionRig();
      for (const c of this.controllers) { c.gun.userData.setVariant(game.weaponIndex); c.gun.userData.hand?.userData.setLevel(Math.max(1,game.wave)); c.gun.userData.flash.visible = flash > 0 && c.ray.userData.source?.handedness === 'right'; }
      this.updateSight(); this.helpTime = Math.max(0, this.helpTime - dt);
      if (this.hud?.help) this.hud.help.plane.visible = this.showControls || this.helpTime > 0 || ['paused', 'over'].includes(this.hooks.phase());
    }
    this.hudTime -= dt;
    if (this.hud && this.hudTime <= 0) {
      this.hudTime = .12; const { canvas, texture } = this.hud, c = canvas.getContext('2d'), phase = this.hooks.phase();
      c.clearRect(0, 0, 640, 192); c.fillStyle = 'rgba(18,12,26,.84)'; c.fillRect(0, 0, 640, 192);
      const character=this.hooks.world().character;
      c.fillStyle = character?.accent||'#ff9ac3'; c.font = 'bold 28px monospace'; c.fillText(`${character?.name||'GHJU'} · PINK WAR   ${String(Math.max(1,game.wave)).padStart(2,'0')} / 10`, 22, 38);
      c.fillStyle = '#fff0f7'; c.font = '23px monospace'; c.fillText(`SANTÉ ${Math.ceil(game.player.hp)}   ${game.weapon.name} ${game.ammo[game.weaponIndex]}/${game.weapon.capacity}`, 22, 75);
      c.fillStyle = game.regenerating ? '#a8e2db' : character?.accent||'#ff7daa'; c.fillRect(22, 91, game.player.hp / 100 * 590, 5);
      c.fillStyle = '#dfc5dc'; c.font = '18px monospace';
      c.fillText(this.trackingLost ? 'SUIVI DE LA MANETTE DROITE INDISPONIBLE' : phase === 'paused' ? 'PAUSE · A / Y reprend · B quitte la VR' : game.state === 'won' ? 'VICTOIRE · La brèche est fermée' : game.state === 'over' ? 'MISSION TERMINÉE · A rejoue / B quitte' : game.reloadRemaining > 0 ? `RECHARGE ${game.reloadRemaining.toFixed(1)} S · TIR BLOQUÉ` : game.weapon.chargeTime ? `CHARGE ${Math.round(game.charge*100)}% · Maintenir / relâcher` : `${game.enemies.length+game.toSpawn} ENNEMIS · A recharge / B arme`, 22, 127);
      const progress = game.reloadRemaining > 0 ? 1 - game.reloadRemaining / game.weapon.reload : game.charge;
      c.fillStyle = '#574158'; c.fillRect(22, 139, 590, 5); c.fillStyle = character?.accent || '#ff7daa'; c.fillRect(22, 139, clamp(progress, 0, 1) * 590, 5);
      c.fillStyle = '#dfc5dc'; c.font = '17px monospace';
      c.fillText(this.mode === 'xr' ? this.trackingLost ? 'Retrouver le suivi · A / Y pour reprendre' : phase === 'over' ? 'A : nouvelle campagne · B : quitter la VR' : this.precision ? 'VISÉE LASER · Gâchette tire · Y pause' : 'Poignée : visée · Y : pause · Clic droit : aide' : 'RT : tir · A : recharge · B : arme · Menu : pause', 22, 172);
      texture.needsUpdate = true;
    }
    if (this.mode === 'stereo' && innerHeight > innerWidth) $('vr-phone-note').textContent = 'Tournez le téléphone en paysage pour votre support VR.';
  }
}
