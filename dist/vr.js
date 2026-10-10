import { clamp } from './game-logic.js';

const $ = id => document.getElementById(id);
const deadzone = v => Math.abs(v || 0) > .16 ? v : 0;

// Immersive WebXR uses the headset's poses; phones use two real eye cameras.
export class VRController {
  constructor(hooks) {
    this.hooks = hooks; this.mode = 'off'; this.session = null; this.rig = null;
    this.controllers = []; this.previous = new Map(); this.phoneYaw = null; this.phonePitch = 0;
    this.headingOrigin = null; this.sensor = false; this.hud = null; this.hudTime = 0; this.busy = false;
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
      $('vr-status').textContent = supported ? 'Casque WebXR disponible. Le jeu passe en vue FPS avec vos deux contrôleurs.' : 'Le navigateur ne propose pas de casque WebXR. Sur iPhone, la vue stéréoscopique affiche une image pour chaque œil.';
    } catch { $('vr-status').textContent = 'Le casque est inaccessible dans ce navigateur. La vue stéréoscopique reste disponible.'; }
  }
  makeHUD() {
    const { T, camera } = this.hooks.world(), canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 152;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const plane = new T.Mesh(new T.PlaneGeometry(.58, .138), material);
    plane.position.set(0, .25, -.95); plane.renderOrder = 100; plane.frustumCulled = false; camera.add(plane);
    this.hud = { canvas, texture, plane }; this.hudTime = 0;
  }
  removeHUD() {
    if (!this.hud) return;
    this.hud.plane.removeFromParent(); this.hud.plane.geometry.dispose(); this.hud.plane.material.dispose(); this.hud.texture.dispose(); this.hud = null;
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
      camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); world.weapon.visible = false; world.soldier.root.visible = false;
      renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
      this.controllers = [0, 1].map(index => {
        const ray = renderer.xr.getController(index); this.rig.add(ray);
        const gun = world.createGun(); const hand=world.createHand();gun.add(hand);gun.userData.hand=hand;ray.add(gun); gun.scale.setScalar(1.05);
        const connected = e => { ray.userData.source = e.data; gun.visible = e.data.handedness === 'right'; };
        const disconnected = () => { ray.userData.source = null; gun.visible = false; };
        ray.addEventListener('connected', connected); ray.addEventListener('disconnected', disconnected);
        return { ray, gun, connected, disconnected };
      });
      this.hooks.begin(); this.makeHUD(); document.body.classList.add('xr-mode');
      this.positionRig();
      session.addEventListener('end', () => this.finishXR(), { once: true });
      session.addEventListener('visibilitychange', () => { if (session.visibilityState !== 'visible') this.hooks.pause(); });
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
    const world = this.hooks.world(); this.removeHUD();
    world.scene.add(world.camera);
    this.rig?.removeFromParent();
    for (const { ray, gun, connected, disconnected } of this.controllers) {
      ray.removeEventListener('connected', connected); ray.removeEventListener('disconnected', disconnected);
      gun.removeFromParent(); gun.userData.flash.material.dispose();
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
  positionRig() {
    if (!this.rig) return;
    const game = this.hooks.game(); this.rig.position.set(game.player.x, 0, game.player.z); this.rig.rotation.y = game.player.yaw; this.rig.updateMatrixWorld(true);
    this.hooks.world().renderer.xr.updateCamera(this.hooks.world().camera);
  }
  input() {
    const result = { x: 0, z: 0, turn: 0, tilt: 0, fire: false };
    const sources = this.mode === 'xr' ? [...(this.session?.inputSources || [])] : [...(navigator.getGamepads?.() || [])].filter(Boolean).map(gamepad => ({ gamepad, handedness: 'both' }));
    for (const source of sources) {
      const pad = source.gamepad; if (!pad) continue;
      const axes = pad.axes, xr = this.mode === 'xr', left = source.handedness === 'left' || !xr, right = source.handedness === 'right' || !xr;
      if (left) { result.x += deadzone(axes[xr && axes.length >= 4 ? 2 : 0]); result.z += deadzone(axes[xr && axes.length >= 4 ? 3 : 1]); }
      if (right) {
        result.turn += deadzone(axes[2]); if (!xr) result.tilt += deadzone(axes[3]);
        result.fire ||= !!pad.buttons[xr ? 0 : 7]?.pressed;
      }
      const edge = (key, index, action) => { const id = `${source.handedness}:${key}`, pressed = !!pad.buttons[index]?.pressed; if (pressed && !this.previous.get(id)) action(); this.previous.set(id, pressed); };
      const playing = !this.hooks.phase || this.hooks.phase() === 'playing';
      if (right) { edge('reload', xr ? 4 : 0, () => {if(playing)this.hooks.game().reload();}); edge('weapon', xr ? 5 : 1, () => {if(playing)this.hooks.game().cycleWeapon();}); }
      edge('pause', xr ? 3 : 9, () => this.hooks.togglePause());
    }
    return result;
  }
  aim() {
    if (this.mode !== 'xr') return null;
    const world = this.hooks.world(), { T } = world;
    const right = this.controllers.find(c => c.ray.userData.source?.handedness === 'right');
    const source = right?.ray || world.camera; source.updateWorldMatrix(true, false);
    const origin = source.getWorldPosition(new T.Vector3()), quaternion = source.getWorldQuaternion(new T.Quaternion());
    const direction = new T.Vector3(0, 0, -1).applyQuaternion(quaternion);
    if (right) origin.addScaledVector(direction, .34);
    return { origin, direction };
  }
  update(dt, flash) {
    if (!this.active) return;
    const game = this.hooks.game();
    if (this.mode === 'xr') {
      this.positionRig();
      for (const c of this.controllers) { c.gun.userData.setVariant(game.weaponIndex); c.gun.userData.hand?.userData.setLevel(Math.max(1,game.wave)); c.gun.userData.flash.visible = flash > 0 && c.ray.userData.source?.handedness === 'right'; }
    }
    this.hudTime -= dt;
    if (this.hud && this.hudTime <= 0) {
      this.hudTime = .12; const { canvas, texture } = this.hud, c = canvas.getContext('2d'), phase = this.hooks.phase();
      c.clearRect(0, 0, 640, 152); c.fillStyle = 'rgba(18,12,26,.84)'; c.fillRect(0, 0, 640, 152);
      const character=this.hooks.world().character;
      c.fillStyle = character?.accent||'#ff9ac3'; c.font = 'bold 28px monospace'; c.fillText(`${character?.name||'GHJU'} · PINK WAR   ${String(Math.max(1,game.wave)).padStart(2,'0')} / 10`, 22, 38);
      c.fillStyle = '#fff0f7'; c.font = '23px monospace'; c.fillText(`SANTÉ ${Math.ceil(game.player.hp)}   ${game.weapon.name} ${game.ammo[game.weaponIndex]}/${game.weapon.capacity}`, 22, 75);
      c.fillStyle = game.regenerating ? '#a8e2db' : character?.accent||'#ff7daa'; c.fillRect(22, 91, game.player.hp / 100 * 590, 5);
      c.fillStyle = '#dfc5dc'; c.font = '18px monospace';
      c.fillText(phase === 'paused' ? 'PAUSE · Cliquez le joystick pour reprendre' : game.state === 'won' ? 'VICTOIRE · La brèche est fermée' : game.state === 'over' ? 'MISSION TERMINÉE · Quittez la VR pour rejouer' : game.reloadRemaining > 0 ? 'BATTERIE EN RECHARGE…' : game.weapon.chargeTime ? `CHARGE ${Math.round(game.charge*100)}% · Maintenez la gâchette` : `${game.enemies.length+game.toSpawn} ENNEMIS · A recharge / B arme`, 22, 131);
      texture.needsUpdate = true;
    }
    if (this.mode === 'stereo' && innerHeight > innerWidth) $('vr-phone-note').textContent = 'Tournez le téléphone en paysage pour votre support VR.';
  }
}
