import { clamp, segmentBox, segmentSphere, traceEnemyHit } from './game-logic.js';
import { portalIndicators } from './portal-indicator.js';
import { createObjectiveGuide, objectiveIndicator } from './objective-guidance.js';
import { DesktopGamepadInput, desktopAxis, DESKTOP_BUTTONS } from './desktop-input.js';
import { syncTrackedHands } from './xr-hands.js';
import { WEAPON_FRAME } from './weapons.js';
import { createMagnifiedSight } from './magnified-sight.js';
import { hapticPlan, buzz } from './haptics.js';
export { hapticPlan } from './haptics.js';

const $ = id => document.getElementById(id);
const deadzone = v => Math.abs(v || 0) > .16 ? v : 0;
const pressed = button => !!button?.pressed || (button?.value || 0) > .15;
const amount = button => clamp(Math.max(button?.pressed ? 1 : 0, Number(button?.value) || 0), 0, 1);
// A grip used as a sprint key must be squeezed on purpose, not just held.
const squeezed = button => (button?.value ?? (button?.pressed ? 1 : 0)) > .6;
const otherHand = hand => hand === 'left' ? 'right' : 'left';

// Touch Plus uses xr-standard: trigger 0, squeeze 1, stick 3, A/X 4, B/Y 5.
export const VR_DEFAULTS = Object.freeze({ hand: 'right', turn: 'smooth', move: 'head', laser: 'always', haptics: true });
const CHOICES = Object.freeze({ hand: ['right', 'left'], turn: ['smooth'], move: ['head', 'hand'], laser: ['always', 'grip'] });
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

// Physical Touch Plus buttons are fixed: A jump, B reload, Y weapon, X pause.
// Aim and fire belong to the right controller: middle-finger squeeze and index trigger.
export const buttonNames = () => ({ reload:'B', next:'Y', jump:'A', pause:'X' });
export function questControls(hand = 'right') {
  const left = hand === 'left', b = buttonNames(hand);
  const mainF = left ? 'gauche' : 'droite', sideF = left ? 'droite' : 'gauche', mainM = left ? 'gauche' : 'droit', sideM = left ? 'droit' : 'gauche';
  return [
    ['Manette droite', 'Pistolet : le canon est la visée'],
    ['Gâchette INDEX droite', 'Tirer · AURORA : maintenir pour déployer la lame'],
    ['Gâchette MAJEUR droite', 'Viser · BLOOM ×2 / LANCE ×4 · parade AURORA'],
    [b.reload, 'Recharger la batterie'],
    [b.next, 'Arme suivante'],
    [`Joystick ${mainM}`, 'Rotation fluide'],
    [`Joystick ${sideM}`, 'Se déplacer'],
    [`Poignée ${sideF}`, 'Courir (maintenu)'],
    [`Clic joystick ${sideF}`, 'Terminal / arme proche : interagir · sinon : s’accroupir'],
    [b.jump, 'Saut · second appui : double saut / rebond mural'],
    ['Gâchette INDEX gauche', 'Main libre / interaction'],
    [b.pause, 'Pause / reprise']
  ];
}
export const QUEST_CONTROLS = Object.freeze(questControls('right'));

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
    const hit = traceEnemyHit(origin,end,e);
    if (hit && hit.t < nearest) { nearest = hit.t; enemy = e; }
  }
  for (const wall of obstacles) {
    const hit = segmentBox(origin, end, wall);
    if (hit !== null && hit <= nearest) { nearest = hit; enemy = null; }
  }
  const distance = Math.max(.05, nearest * range - .02);
  return { point: { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance, z: origin.z + direction.z * distance }, distance, enemy };
}

// The palm of the glove (the centre of the pistol grip) sits where the controller grip is: a little below and
// behind the target ray.
const GRIP_MOUNT = Object.freeze({ x: 0, y: -.012, z: .018 });
// Where the shooting glove sits on the mount, whatever the weapon: each blaster slides so that its own grip is in
// that palm (weapons.js KENNEY_HOLD), and recoil or a reload turns the weapon about the hand.
const TRACKED_PALM = Object.freeze({ x: .015, y: -.014, z: .024 });

// Immersive WebXR uses the headset's poses; phones use two real eye cameras.
export class VRController {
  constructor(hooks) {
    this.hooks = hooks; this.mode = 'off'; this.session = null; this.rig = null; this.settings = loadSettings();
    this.controllers = []; this.previous = new Map(); this.phoneYaw = null; this.phonePitch = 0;
    this.headingOrigin = null; this.sensor = false; this.hud = null; this.hudTime = 0; this.busy = false;
    this.snapArmed = true; this.triggerBlocked = true; this.precision = false; this.trackingLost = false;
    this.handPose = { mainTrigger: 0, sideTrigger: 0, mainGrip: 0, sideGrip: 0 }; this.reloadGesture = 0;
    this.sight = null; this.pauseBoard=null; this.lastMoveYaw = null;
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
  }
  bindSettings() {
    for (const [key, id] of [['hand', 'vr-hand'], ['turn', 'vr-turn'], ['move', 'vr-move']]) {
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
    canvas.width = 512; canvas.height = 112;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const plane = new T.Mesh(new T.PlaneGeometry(.42, .091875), material);
    plane.position.set(0, -.27, -1.05); plane.renderOrder = 100; plane.frustumCulled = false; camera.add(plane);
    this.hud = { canvas, texture, plane }; this.hudTime = 0;
    const portalCanvas=document.createElement('canvas');portalCanvas.width=512;portalCanvas.height=32;
    const portalTexture=new T.CanvasTexture(portalCanvas);portalTexture.colorSpace=T.SRGBColorSpace;
    const portalPlane=new T.Mesh(new T.PlaneGeometry(.50,.03125),new T.MeshBasicMaterial({map:portalTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
    portalPlane.position.set(0,.25,-1.05);portalPlane.renderOrder=100;portalPlane.frustumCulled=false;camera.add(portalPlane);
    this.hud.portal={canvas:portalCanvas,texture:portalTexture,plane:portalPlane};
    this.hud.objective=createObjectiveGuide(T,camera);
  }
  removeHUD() {
    if (!this.hud) return;
    this.hud.objective?.dispose();
    if(this.hud.portal){const {plane,texture}=this.hud.portal;plane.removeFromParent();plane.geometry.dispose();plane.material.dispose();texture.dispose();}
    this.hud.plane.removeFromParent(); this.hud.plane.geometry.dispose(); this.hud.plane.material.dispose(); this.hud.texture.dispose(); this.hud = null;
  }
  // HTML dialogs cannot render inside an immersive XR framebuffer.
  // A static canvas guide is attached to the tracked head and shown only during pause.
  makePauseBoard(){
    if(this.pauseBoard||this.mode!=='xr')return;
    const {T,camera}=this.hooks.world(),canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=768;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#121a29';ctx.fillRect(0,0,1024,768);
    ctx.strokeStyle='#f58cbb';ctx.lineWidth=5;ctx.strokeRect(15,15,994,738);
    ctx.fillStyle='#ff9eca';ctx.font='bold 46px sans-serif';
    ctx.fillText('PINK WAR  /  PAUSE',57,77);
    ctx.fillStyle='#e7edf8';ctx.font='24px sans-serif';
    ctx.fillText('Commandes des manettes Touch Plus',58,119);
    const rows=questControls(settingsOf(this).hand).slice(1);
    rows.forEach(([key,value],i)=>{
      const y=163+i*44;
      ctx.fillStyle='#a9d9fd';ctx.font='bold 22px sans-serif';ctx.fillText(key,58,y,340);
      ctx.fillStyle='#e8deef';ctx.font='21px sans-serif';ctx.fillText(value,390,y,565);
    });
    ctx.fillStyle='#ffb3d5';ctx.font='bold 23px sans-serif';
    ctx.fillText('X : PAUSE / REPRENDRE  •  A : SAUT  •  B : RECHARGER  •  Y : ARME',58,716,935);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const material=new T.MeshBasicMaterial({map:texture,transparent:false,depthTest:false,depthWrite:false,toneMapped:false});
    const panel=new T.Mesh(new T.PlaneGeometry(1.3,.975),material);
    panel.position.set(0,-.02,-1.65);panel.renderOrder=160;panel.frustumCulled=false;panel.visible=false;
    camera.add(panel);this.pauseBoard={panel,texture,canvas,guide:ctx.getImageData(0,0,1024,768),over:false};
  }
  removePauseBoard(){
    if(!this.pauseBoard)return;
    const {panel,texture}=this.pauseBoard;panel.removeFromParent();panel.geometry.dispose();panel.material.dispose();texture.dispose();
    this.pauseBoard=null;
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
  // Weapon animations remain active without a numeric display on the gun.
  updateWeaponState(gun, game, feel=null) {
    const capacity = game.weapon.capacity, ammo = game.ammo[game.weaponIndex], reloading = game.reloadRemaining > 0;
    const reloadProgress = reloading ? clamp(1 - game.reloadRemaining / game.weapon.reload, 0, 1) : 0;
    const charge = game.weapon.chargeTime ? game.charge : 0;
    gun.userData.setCombatState?.({ ammo, capacity, charge, reloadProgress, reloading, time: game.time,heat:feel?.heat||0,kick:feel?.kick||0,impulse:feel?.impulse||0,bladeHeld:!!game.weapon.melee&&!!game.triggerHeld });
  }
  cancelTrigger() {
    const game = this.hooks.game(); game.charge = 0; game.triggerHeld = false;game.semiPending=false; this.triggerBlocked = true;
  }
  startReloadGesture() { if (this.mode === 'xr') this.reloadGesture = .82; }
  // Show the pistol in the shooting hand and a bare gauntlet in the other one.
  applyRoles() {
    const main = settingsOf(this).hand;
    for (const c of this.controllers) {
      const hand = c.ray.userData.source?.handedness, known = hand === 'left' || hand === 'right';
      c.gun.visible = hand === main; c.bare.visible = known && hand !== main;
      // Gloves are built for the right hand and mirrored for the left; a mirrored gun keeps its readout upright.
      const size = c.bare.userData.size ??= c.bare.scale.x;
      c.bare.scale.set(hand === 'left' ? -size : size, size, size);
      c.gun.scale.x = hand === 'left' ? -1 : 1;
      if (c.gun.userData.ammo) c.gun.userData.ammo.plane.scale.x = c.gun.scale.x;
      if(c.jumpPanel){c.jumpPanel.plane.visible=false;const label=buttonNames(main).jump;if(c.jumpPanel.label!==label){c.jumpPanel.label=label;const x=c.jumpPanel.canvas.getContext('2d');x.clearRect(0,0,192,128);x.fillStyle='#142032';x.fillRect(2,2,188,124);x.strokeStyle=this.hooks.world().character?.accent||'#ff98bf';x.lineWidth=5;x.strokeRect(3,3,186,122);x.fillStyle='#f5f9ff';x.textAlign='center';x.font='bold 44px sans-serif';x.fillText(label+' ↑',96,56);x.font='bold 22px sans-serif';x.fillText('SAUT',96,99);c.jumpPanel.texture.needsUpdate=true;}}
    }
  }
  heldGun(){return controllerOf(this,settingsOf(this).hand)?.gun||null;}
  sightEye(){
    const world=this.hooks.world(),cameras=world.renderer.xr.getCamera?.(world.camera)?.cameras;
    const source=cameras?.[settingsOf(this).hand==='left'?0:1]||cameras?.[0];
    if(!source)return world.camera;
    // XR eye cameras have no Object3D parent: WebXRManager writes their world
    // matrices explicitly. getWorldPosition() would replace that world pose
    // with the local reference-space pose. Sample a private camera instead.
    const eye=this.opticalEye ||=new world.T.PerspectiveCamera();eye.matrixAutoUpdate=false;
    eye.matrix.copy(source.matrixWorld);eye.matrixWorld.copy(source.matrixWorld);
    eye.matrixWorldInverse.copy(source.matrixWorld).invert();
    eye.projectionMatrix.copy(source.projectionMatrix);eye.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    eye.near=source.near;eye.far=source.far;eye.fov=source.fov;return eye;
  }
  renderScope(){
    const gun=this.mode==='xr'?this.heldGun():null;
    const active=!!gun&&this.aiming&&!this.trackingLost&&!this.hooks.game().reloadRemaining&&this.hooks.phase()==='playing';
    if(!active||!gun?.userData.optics?.[gun.userData.index]){this.scope?.release();return;}
    const quality=this.hooks.quality?.();
    this.scope ||=createMagnifiedSight(quality==='low'?256:quality==='high'?512:384);
    const world=this.hooks.world();
    this.scope.render({renderer:world.renderer,scene:world.scene,gun,eyeCamera:this.sightEye(),active,
      hide:[this.rig,world.weapon,world.soldier.root,this.sight?.group],beforeRender:camera=>world.moon?.update(camera)});
  }
  jumpButtonHit(){
    const main=controllerOf(this,settingsOf(this).hand),side=controllerOf(this,otherHand(settingsOf(this).hand));
    if(!main||!side?.jumpPanel?.plane.visible)return false;
    const world=this.hooks.world(),T=world.T,ray=this.jumpRay ||= new T.Raycaster();
    this.jumpPoint ||= new T.Vector3();this.jumpDirection ||= new T.Vector3();this.jumpQuaternion ||= new T.Quaternion();
    main.ray.updateWorldMatrix(true,false);side.jumpPanel.plane.updateWorldMatrix(true,false);
    main.ray.getWorldPosition(this.jumpPoint);main.ray.getWorldQuaternion(this.jumpQuaternion);this.jumpDirection.set(0,0,-1).applyQuaternion(this.jumpQuaternion);
    ray.set(this.jumpPoint,this.jumpDirection);ray.near=.02;ray.far=2;return ray.intersectObject(side.jumpPanel.plane,false).length>0;
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
      this.lastMoveYaw = null; this.cancelTrigger();
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
        const anchor = new T.Group(), mount = new T.Group(),
          gun = world.createGun({sleeve:false}), bare = world.createHand({sleeve:false});
        // Quest Touch Plus already tracks the wrist. Only the short glove cuff
        // is rendered: the extra capsule forearm intersected the controller
        // and appeared as a floating or broken arm.
        anchor.name = 'Tracked controller grip'; anchor.matrixAutoUpdate = false; anchor.visible = false;
        this.rig.add(anchor); anchor.add(mount);
        // The other controller is the free hand: no second glove on the weapon in a headset.
        gun.userData.showSupport = false; gun.userData.support.visible = false;
        mount.position.set(GRIP_MOUNT.x, GRIP_MOUNT.y, GRIP_MOUNT.z);
        gun.visible = bare.visible = false; mount.add(gun, bare);
        // The old wrist-button was a selectable trigger target and no longer
        // jumps. The physical right-hand A key is now the sole jump control.
        const jumpCanvas=document.createElement('canvas');jumpCanvas.width=192;jumpCanvas.height=128;
        const jumpTexture=new T.CanvasTexture(jumpCanvas);jumpTexture.colorSpace=T.SRGBColorSpace;
        const jumpPlane=new T.Mesh(new T.PlaneGeometry(.082,.055),new T.MeshBasicMaterial({map:jumpTexture,side:T.DoubleSide,toneMapped:false}));
        jumpPlane.position.set(-.035,.105,.075);jumpPlane.rotation.x=-.9;mount.add(jumpPlane);
        const jumpPanel={canvas:jumpCanvas,texture:jumpTexture,plane:jumpPlane,label:''};
        // Models held a few centimetres from the eyes gain nothing from the sun's shadow pass.
        mount.traverse(object => { if (object.isMesh) object.castShadow = false; });
        const connected = e => { ray.userData.source = e.data; this.applyRoles(); this.triggerBlocked = true; };
        const disconnected = () => { const wasMain = ray.userData.source?.handedness === settingsOf(this).hand; ray.userData.source = null; this.applyRoles(); if (wasMain) { this.cancelTrigger(); this.hooks.pause(); } };
        ray.addEventListener('connected', connected); ray.addEventListener('disconnected', disconnected);
        return { ray, anchor, mount, gun, bare, jumpPanel,source:null, level: 0, connected, disconnected };
      });
      // No artificial laser pointer or floating target marker in immersive VR.
      this.hooks.begin(); this.makeHUD(); this.removeSight(); this.makePauseBoard();document.body.classList.add('xr-mode');
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
    this.scope?.dispose();this.scope=null;this.opticalEye=null;
    const world = this.hooks.world(); this.removeHUD(); this.removeSight();this.removePauseBoard();this.cancelTrigger();
    world.scene.add(world.camera);
    this.rig?.removeFromParent();
    for (const { ray, gun, bare, jumpPanel,connected, disconnected } of this.controllers) {
      ray.removeEventListener('connected', connected); ray.removeEventListener('disconnected', disconnected);
      const { ammo, flash } = gun.userData;
      gun.removeFromParent();gun.userData.disposeDynamic?.();bare?.userData.dispose?.();flash.material.dispose();
      if (ammo) { ammo.plane.geometry.dispose(); ammo.plane.material.dispose(); ammo.texture.dispose(); }
      if(jumpPanel){jumpPanel.plane.geometry.dispose();jumpPanel.plane.material.dispose();jumpPanel.texture.dispose();}
      ray.removeFromParent();
    }
    this.controllers = []; this.rig = null; this.session = null; this.mode = 'off'; this.previous.clear(); this.perf = null;
    this.reloadGesture = 0; this.handPose = { mainTrigger:0, sideTrigger:0, mainGrip:0, sideGrip:0 };
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
      $('vr-exit').hidden = false; $('stereo-reticle').hidden = false;
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
    const game = this.hooks.game(); this.rig.position.set(game.player.x, game.player.elevation || 0, game.player.z); this.rig.rotation.y = heading; this.rig.updateMatrixWorld(true);
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
    if(this.mode==='xr')frame ||= this.hooks.world().renderer.xr.getFrame?.();
    if (this.mode === 'xr' && frame && this.controllers?.length) {
      syncTrackedHands(this.controllers,this.session,frame,this.hooks.world().renderer.xr.getReferenceSpace());
      this.applyRoles();
    }
    const result = { x: 0, z: 0, turn: 0, tilt: 0, snap: 0, fire: false, sprint: false, precision: false, aim:false, jump: false, pickup: false, crouchToggle: false };
    const xr = this.mode === 'xr', cfg = settingsOf(this), mainHand = cfg.hand, sideHand = otherHand(mainHand);
    const focused=typeof document==='undefined'||(!document.hidden&&(!document.hasFocus||document.hasFocus()));
    const desktop = xr ? null : (this.desktopGamepads ||= new DesktopGamepadInput()).select(navigator.getGamepads?.() || [],{focused});
    if (!xr && this.desktopPadKey !== this.desktopGamepads.activeKey) { this.previous.clear(); this.desktopPadKey = this.desktopGamepads.activeKey; }
    const sources = xr ? [...(this.session?.inputSources || [])] : desktop ? [{ gamepad: desktop, handedness: 'both' }] : [];
    const phase = this.hooks.phase?.() || 'playing', actions = new Set();
    const visible = !xr || !this.session?.visibilityState || this.session.visibilityState === 'visible';
    this.handPose = { mainTrigger: 0, sideTrigger: 0, mainGrip: 0, sideGrip: 0 };
    let rawFire = false, mainTracked = !xr;
    const activeHands = new Set(sources.map(source => source.handedness));
    for (const key of this.previous.keys()) if (!activeHands.has(key.split(':')[0])) this.previous.delete(key);
    for (const source of sources) {
      const pad = source.gamepad; if (!pad) continue;
      const axes = pad.axes || [], main = !xr || source.handedness === mainHand, side = !xr || source.handedness === sideHand;
      const tracked = visible && (!xr || !frame || !!frame.getPose(source.targetRaySpace, this.hooks.world().renderer.xr.getReferenceSpace()));
      const stick = xr && axes.length >= 4 ? 2 : 0;
      const axis = xr ? deadzone : desktopAxis;
      if (side && tracked) {
        result.x += axis(axes[stick]); result.z += axis(axes[stick + 1]);
        result.sprint ||= (xr ? squeezed(pad.buttons[1]) : pressed(pad.buttons[DESKTOP_BUTTONS.sprint]));
      }
      if (main) {
        mainTracked ||= tracked; rawFire ||= pressed(pad.buttons[xr ? 0 : DESKTOP_BUTTONS.fire]);
        this.handPose.mainTrigger = Math.max(this.handPose.mainTrigger, amount(pad.buttons[xr ? 0 : DESKTOP_BUTTONS.fire]));
        this.handPose.mainGrip = Math.max(this.handPose.mainGrip, amount(pad.buttons[xr ? 1 : DESKTOP_BUTTONS.aim]));
        result.precision ||= tracked && pressed(pad.buttons[xr ? 1 : DESKTOP_BUTTONS.aim]);
        if(xr)result.aim ||= tracked && pressed(pad.buttons[1]);
        if (xr) {
          const turn = axes[stick] || 0;
          if (tracked) result.turn += deadzone(turn); // continuous angular velocity, never snap-turns
        } else { result.turn += axis(axes[2]); result.tilt += axis(axes[3]); }
      }
      if (xr && side) {
        this.handPose.sideTrigger = Math.max(this.handPose.sideTrigger, amount(pad.buttons[0]));
        this.handPose.sideGrip = Math.max(this.handPose.sideGrip, amount(pad.buttons[1]));
        // Left index trigger does not aim: right middle-finger grip owns aiming.
      }
      const edge = (key, index, action = key) => { const id = `${source.handedness}:${key}`, down = pressed(pad.buttons[index]); if (down && !this.previous.get(id) && tracked) actions.add(action); this.previous.set(id, down); };
      if(xr&&source.handedness==='right'){edge('jump',4);edge('reload',5);}
      if(xr&&source.handedness==='left'){edge('pause',4);edge('next',5);}
      if(!xr&&main){edge('reload',DESKTOP_BUTTONS.reload);edge('next',DESKTOP_BUTTONS.next);}
      if (xr && side) {
        const game = this.hooks.game(), interaction = game?.getInteraction?.() || game?.nearbyWeapon?.();
        // Track the physical click, not its contextual action. Consuming a terminal
        // or pickup while the stick stays held must never cause a second crouch.
        edge('stick', 3, interaction ? 'pickup' : 'crouch');
      }
      if (!xr) { edge('pause', DESKTOP_BUTTONS.pause); edge('jump', DESKTOP_BUTTONS.jump); edge('pickup', DESKTOP_BUTTONS.interact); edge('crouch', DESKTOP_BUTTONS.crouch); }
    }
    if (actions.has('pause')) { this.hooks.togglePause(); if (xr) this.cancelTrigger(); }
    else if (phase === 'over' && actions.has('reload') && xr) { this.hooks.begin(); this.cancelTrigger(); }
    else if (phase === 'over' && actions.has('next') && xr) { this.cancelTrigger(); this.exit().catch(error => this.fail(error)); }
    else if (phase === 'playing') {
      const game = this.hooks.game();
      if (actions.has('next')) { if (game.cycleWeapon(1) && xr) this.cancelTrigger(); }
      else if (actions.has('reload')) { if (game.reload() && xr) this.cancelTrigger(); }
    }
    this.trackingLost = xr && !mainTracked;
    if (xr && (!visible || !mainTracked)) { this.cancelTrigger(); this.hooks.pause?.(); }
    const playing = (this.hooks.phase?.() || phase) === 'playing';
    if (!playing) { result.x = result.z = result.turn = result.tilt = result.snap = 0; result.sprint = result.precision = result.aim = false; result.jump = false;result.pickup = false; if (xr) this.cancelTrigger(); }
    if (!rawFire) this.triggerBlocked = false;
    result.jump = playing && actions.has('jump');result.pickup = playing && actions.has('pickup');result.crouchToggle=playing && actions.has('crouch');
    result.fire = playing && mainTracked && rawFire && (!xr || !this.triggerBlocked);
    this.precision = result.precision && playing;
    this.aiming = xr ? result.aim && playing : result.precision && playing;
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
  // No auxiliary targeting beam in XR: aim follows the real weapon in hand.
  updateSight() { if(this.sight)this.sight.group.visible=false; }
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
  update(dt, flash, recoil = 0, feel = null) {
    if (!this.active) return;
    if(this.pauseBoard)this.pauseBoard.panel.visible=this.mode==='xr'&&['paused','over'].includes(this.hooks.phase());
    const game = this.hooks.game();
    if(this.pauseBoard&&this.pauseBoard.over!==(this.hooks.phase()==='over')){
      const board=this.pauseBoard,c=board.canvas.getContext('2d');board.over=this.hooks.phase()==='over';
      if(!board.over)c.putImageData(board.guide,0,0);
      else{
        const won=game.state==='won',campaign=game.mode==='campaign',b=buttonNames(settingsOf(this).hand);
        c.fillStyle='#121a29';c.fillRect(0,0,1024,768);c.textAlign='center';
        c.fillStyle='#ffb3d5';c.font='bold 58px sans-serif';c.fillText(won?(campaign?'NIVEAU 1 TERMINÉ':'CAMPAGNE TERMINÉE'):'TRANSMISSION PERDUE',512,250,940);
        c.fillStyle='#eef3fc';c.font='34px sans-serif';c.fillText(won?(campaign?'Le dernier signal · À suivre…':'20 niveaux · Les machines reviennent.'):'Une nouvelle aube vous attend.',512,330,940);
        c.font='bold 38px sans-serif';c.fillText(`${b.reload} : ${campaign?'REJOUER LE NIVEAU 1':won?'CONTINUER EN SURVIE':'REJOUER'}`,512,450,940);
        c.font='30px sans-serif';c.fillText(`${b.next} : QUITTER LE CASQUE`,512,520);c.textAlign='left';
      }
      board.texture.needsUpdate=true;
    }
    if (this.mode === 'xr') {
      const main = settingsOf(this).hand, level = Math.max(1, game.wave), kick = clamp(recoil / .11, 0, 1);
      this.reloadGesture = Math.max(0, this.reloadGesture - dt);
      const phase = game.reloadRemaining>0?clamp(1-game.reloadRemaining/game.weapon.reload,0,1):1, smooth = t => t*t*(3-2*t);
      const reload = phase < .2 ? smooth(phase/.2) : phase < .58 ? 1 : 1-smooth((phase-.58)/.42);
      // updateCamera() already placed the rig this frame while playing.
      if (this.hooks.phase() !== 'playing') this.positionRig();
      for (const c of this.controllers) {
        const isMain = c.ray.userData.source?.handedness === main;
        if (c.gun.userData.index !== game.weaponIndex) c.gun.userData.setVariant(game.weaponIndex);
        if (c.level !== level) { c.gun.userData.setLevel(level); c.bare.userData.setLevel(level); c.level = level; }
        c.gun.userData.flash.visible = flash > 0 && isMain && this.hooks.phase()==='playing';
        const handSign=main==='left'?-1:1;
        // AURORA: tracked palm closes around the central grip, below the emitter guard.
        // Keep the sword above the fist and slightly angled into the player's view.
        const sword=isMain&&game.weapon.melee;
        c.gun.position.set(isMain?(feel?.yaw||0)*.10*handSign:0,
          isMain?reload*.035-(feel?.kick||0)*.13+(sword?.028:0):0,
          isMain?(feel?.kick??kick*.075)-reload*.045-(sword?.036:0):0);
        c.gun.rotation.set(isMain?(feel?.pitch??kick*.22)+reload*Math.PI/2-(sword?.55:0):0,
          isMain?(feel?.yaw||0)*handSign:0,
          isMain?reload*.12+(sword?-.06*handSign:0):0);
        const palm=c.gun.userData.palm,held=palm&&((this.scratch||={}).palm||=palm.clone());
        if(palm)c.gun.position.sub(held.copy(palm).applyEuler(c.gun.rotation)).add(TRACKED_PALM);
        // Re-evaluate visibility every frame; a previous saber swap must
        // never hide the following weapon permanently.
        const holster=this.hooks.world().holsterGun;
        c.gun.visible=isMain&&(!holster?.visible||holster.position.y<-.56);
        const fingerPose = isMain
          ? { trigger:this.handPose.mainTrigger, grip:Math.max(.92,this.handPose.mainGrip), reload:0 }
          : { trigger:this.handPose.sideTrigger, grip:this.handPose.sideGrip, reload,relax:(1-this.handPose.sideGrip)*(1-this.handPose.sideTrigger)*(1-reload)*.65 };
        c.gun.userData.hand?.userData.animate?.(fingerPose,dt,c.gun.scale.x<0?-1:1);
        c.bare.userData.animate?.(fingerPose,dt,c.bare.scale.x<0?-1:1);
      }
      // A tracked off-hand reaches a real two-handed foregrip and can lock to
      // the exact grip mesh when the user squeezes. Away from it, the glove
      // remains independently tracked instead of snapping unrealistically.
      const primary=controllerOf(this,main),secondary=controllerOf(this,otherHand(main));
      if(primary?.gun&&secondary?.bare){
        const fore=primary.gun.userData.supportPoint||WEAPON_FRAME[game.weaponIndex]?.support,hand=primary.gun.userData.support;
        let linked=false;
        if(fore&&primary.gun.visible&&this.handPose.sideGrip>.55&&secondary.anchor.visible){
          const world=this.hooks.world(),target=new world.T.Vector3(...fore);
          primary.gun.updateWorldMatrix(true,true);primary.gun.localToWorld(target);
          const wrist=new world.T.Vector3();secondary.anchor.getWorldPosition(wrist);
          linked=target.distanceTo(wrist)<.24;
        }
        primary.gun.userData.showSupport=linked;
        if(hand){hand.visible=linked; if(linked){hand.userData.setBasePosition?.(fore);hand.userData.animate?.({grip:.98,trigger:0,reload:0,wrap:true},dt);}}
        secondary.bare.visible=!linked&&secondary.anchor.visible;
      }
      const gun = controllerOf(this, main)?.gun; if (gun) this.updateWeaponState(gun, game,feel);
      gun?.userData.setSight?.(this.aiming && !game.reloadRemaining,this.sightEye());
      this.updateSight();
      // Heavy weapons rumble harder as the charge builds.
      this.chargeBuzz -= dt;
      if (game.charge > 0 && this.chargeBuzz <= 0) { this.haptic('charge', game.charge); this.chargeBuzz = .06; }
      this.trackPerformance(dt);
      if ((this.shadowTick ^= 1) === 0) this.hooks.world().renderer.shadowMap.needsUpdate = true;
    }
    if(this.hud?.objective){
      const world=this.hooks.world(),scratch=this.scratch||={},forward=scratch.objectiveForward ||=new world.T.Vector3();
      const head=scratch.objectiveHead ||=new world.T.Vector3();
      world.camera.getWorldDirection(forward);world.camera.getWorldPosition(head);
      // Head translation matters in room-scale VR; height remains the player's
      // floor level so looking/crouching cannot invent a different storey.
      const hint=this.hooks.phase()==='playing'?objectiveIndicator(game.guidance?.(),
        {x:head.x,elevation:game.player.elevation,z:head.z},Math.atan2(-forward.x,-forward.z),game.state):null;
      this.hud.objective.update(hint);
      this.hud.objectiveHint=hint;
    }
    this.hudTime -= dt;
    if (this.hud && this.hudTime <= 0) {
      this.hudTime = .12; const { canvas, texture } = this.hud, c = canvas.getContext('2d');
      const hp = clamp(game.player.hp, 0, 100), ammo = game.ammo[game.weaponIndex];
      const accent = this.hooks.world().character?.accent || '#ff9ac3';
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = 'rgba(14,22,33,.82)';
      for(const x of [0,264]){c.beginPath();c.roundRect(x,0,248,112,10);c.fill();c.strokeStyle='rgba(220,232,249,.18)';c.lineWidth=1;c.stroke();}
      c.textAlign = 'left'; c.fillStyle = '#bdcadd'; c.font = '600 16px sans-serif';
      c.fillText('SANTÉ', 20, 28); c.fillText(game.weapon.melee?'ÉNERGIE':'BALLES', 284, 28);
      c.font = 'bold 46px sans-serif'; c.fillStyle = hp <= 25 ? '#ff6b8a' : '#f4f7fc';
      c.fillText(String(Math.ceil(hp)), 20, 80);
      c.fillStyle = ammo === 0 && !game.weapon.melee ? '#ff6b8a' : '#f4f7fc'; c.fillText(game.weapon.melee?'∞':String(ammo), 284, 80);
      if(!game.weapon.melee){c.fillStyle='#9cabc1';c.font='20px sans-serif';c.fillText('/ '+game.weapon.capacity,370,80);}
      c.fillStyle = '#334256'; c.fillRect(20, 94, 208, 4);
      c.fillStyle = hp <= 25 ? '#ff6b8a' : game.regenerating ? '#a8e2db' : accent; c.fillRect(20, 94, hp / 100 * 208, 4);
      if(game.mode==='training'){
        c.fillStyle='rgba(13,28,39,.96)';c.fillRect(0,0,512,112);
        c.fillStyle='#88e9ee';c.font='bold 19px sans-serif';
        c.fillText('STAND · EXERCICE '+game.trainingLevel.number+'/5',18,26);
        c.fillStyle='#f5f8fa';c.font='bold 31px sans-serif';
        c.fillText(String(game.score).padStart(5,'0')+' PTS',18,73);
        c.font='bold 21px sans-serif';
        c.fillText(game.trainingAccuracy+' %',312,52);
        c.fillStyle='#b9d7e3';c.font='16px sans-serif';
        c.fillText('PRÉCISION',312,75);
        c.fillText('TOUCHES '+game.trainingHits+'/'+game.trainingShots+' · SÉRIE '+game.trainingCombo,18,99);
      }
      texture.needsUpdate = true;
      if(this.hud.portal){
        const world=this.hooks.world(),portal=this.hud.portal,p=portal.canvas.getContext('2d');
        this.scratch ||= {};const forward=this.scratch.portalForward ||= new world.T.Vector3();world.camera.getWorldDirection(forward);
        const dots=portalIndicators(game.activePortals,game.player,Math.atan2(-forward.x,-forward.z),game.time,game.state);
        p.clearRect(0,0,512,32);portal.plane.visible=this.hooks.phase()==='playing'&&!this.hud.objectiveHint&&dots.length>0;
        for(const [index,dot] of dots.entries()){
          const x=256+dot.offset*235,y=12+index*2;p.globalAlpha=dot.opacity;p.beginPath();p.arc(x,y,3.7,0,Math.PI*2);
          p.fillStyle=dot.pending||dot.behind?'#18222e':accent;p.fill();p.strokeStyle='#f4f5fa';p.lineWidth=1;p.stroke();
          if(dot.behind){p.beginPath();p.moveTo(x-2,y+6);p.lineTo(x,y+8);p.lineTo(x+2,y+6);p.stroke();}
        }
        p.globalAlpha=1;portal.texture.needsUpdate=true;
      }
    }
  }
}
