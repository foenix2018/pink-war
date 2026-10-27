import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { magnifiedFov, lensFov, aimSensitivity } from '../dist/optics.js';
import { createMagnifiedSight } from '../dist/magnified-sight.js';
import { OPTICS } from '../dist/weapons.js';
import { VRController, VR_DEFAULTS } from '../dist/vr.js';

test('flat optics give exact 2× and 4× projected target enlargement in FPS and third person', () => {
  for (const base of [72, 64]) for (const [id, zoom] of [['bloom', 2], ['lance', 4]]) {
    const fov = magnifiedFov(base, OPTICS[id].magnification);
    const ratio = Math.tan(base * Math.PI / 360) / Math.tan(fov * Math.PI / 360);
    assert.ok(Math.abs(ratio - zoom) < 1e-10);
    assert.ok(aimSensitivity(zoom) < 1 && aimSensitivity(zoom) > 0);
  }
  assert.equal(magnifiedFov(72), 72); assert.equal(aimSensitivity(4, 0), 1);
});
test('physical lens projection preserves magnification at different eye relief distances', () => {
  for (const distance of [.06, .2, .7]) for (const cfg of Object.values(OPTICS)) {
    const fov = lensFov(cfg.radius, distance, cfg.magnification);
    assert.ok(Math.abs((cfg.radius / distance) / Math.tan(fov * Math.PI / 360) - cfg.magnification) < 1e-10);
  }
});

test('a native XR eye keeps its explicit world matrix when the scope samples the dominant eye', () => {
  const right=new T.PerspectiveCamera(),left=new T.PerspectiveCamera();
  right.position.set(.032,1.65,0);right.updateMatrixWorld(true);right.matrixWorld.makeTranslation(.032,1.65,22);
  left.position.set(-.032,1.65,0);left.updateMatrixWorld(true);left.matrixWorld.makeTranslation(-.032,1.65,22);
  const before=right.matrixWorld.clone(),state=Object.assign(Object.create(VRController.prototype),{settings:VR_DEFAULTS,hooks:{world:()=>({T,renderer:{xr:{getCamera:()=>({cameras:[left,right]})}}})}});
  const eye=state.sightEye();assert.deepEqual(eye.getWorldPosition(new T.Vector3()).toArray(),[.032,1.65,22]);assert.deepEqual(right.matrixWorld.elements,before.elements);
  state.settings={...VR_DEFAULTS,hand:'left'};assert.deepEqual(state.sightEye().getWorldPosition(new T.Vector3()).toArray(),[-.032,1.65,22]);
});
function fixture() {
  const glassMaterial = new T.MeshBasicMaterial(), glass = new T.Mesh(new T.CircleGeometry(.018), glassMaterial);
  const optic = { cfg: OPTICS.bloom, reticle: { visible: true }, eyeDistance: .2, glass, glassMaterial };
  const gun = new T.Group(); gun.userData = { optics: [optic], index: 0, aiming: true, flash: { position: new T.Vector3(0, .082, -.6) } };
  const eyeCamera = new T.PerspectiveCamera(90); eyeCamera.position.set(0, .178, .168);eyeCamera.updateMatrixWorld();
  const scene = new T.Scene(), hidden = new T.Group();scene.add(gun, hidden);gun.updateMatrixWorld(true);
  let current = { original: true }, viewport = new T.Vector4(8, 9, 1024, 512), scissor = new T.Vector4(4, 5, 1024, 512), scissorTest = true;
  const renderer = { isWebGLRenderer: true, xr: { enabled: true }, autoClear: false, shadowMap: { autoUpdate: true, needsUpdate: true },
    getRenderTarget: () => current, setRenderTarget: value => { current = value; },
    getViewport: v => v.copy(viewport), setViewport: (...args) => { viewport = args[0].isVector4 ? args[0].clone() : new T.Vector4(...args); },
    getScissor: v => v.copy(scissor), setScissor: v => { scissor = v.clone(); },
    getScissorTest: () => scissorTest, setScissorTest: v => { scissorTest = v; }, render() {} };
  const state = () => ({ current, viewport: viewport.toArray(), scissor: scissor.toArray(), scissorTest, xr: renderer.xr.enabled,
    autoClear: renderer.autoClear, shadows: { ...renderer.shadowMap }, hidden: hidden.visible, head: eyeCamera.position.toArray(), headFov: eyeCamera.fov });
  return { renderer, scene, gun, eyeCamera, hide: [hidden], active: true, optic, state };
}
test('scope uses one bounded target at 30 Hz, restores the XR framebuffer and never changes head pose', () => {
  const f = fixture(), scope = createMagnifiedSight(999), initial = f.state(), targets = new Set();
  let renders = 0;
  f.renderer.render = (scene, camera) => { renders++; assert.equal(f.renderer.xr.enabled, false); assert.equal(f.hide[0].visible, false); targets.add(f.renderer.getRenderTarget()); assert.ok(Math.abs(camera.fov-lensFov(f.optic.cfg.radius,f.optic.eyeDistance,f.optic.cfg.magnification))<.01); };
  for (const now of [0, 10, 20, 34, 40]) scope.render({ ...f, now });
  assert.equal(renders, 2); assert.equal(targets.size, 1); assert.equal(scope.stats().size, 512);
  assert.deepEqual(f.state(), initial); assert.notEqual(f.optic.glass.material, f.optic.glassMaterial);
  scope.render({ ...f, active: false, now: 80 });assert.equal(f.optic.glass.material, f.optic.glassMaterial);assert.equal(scope.stats().active, false);
  let disposed = 0;const target = [...targets][0];target.addEventListener('dispose', () => disposed++);scope.dispose();scope.dispose();assert.equal(disposed, 1);
});
test('failed optical render restores every XR state and an off-axis eye cannot keep a magnified picture', () => {
  const f = fixture(), scope = createMagnifiedSight(), initial = f.state();
  f.renderer.render = () => { throw new Error('GPU fixture failure'); };
  assert.throws(() => scope.render({ ...f, now: 0 }), /GPU fixture failure/); assert.deepEqual(f.state(), initial);
  f.optic.reticle.visible = false;scope.render({ ...f, now: 50 });assert.equal(scope.stats().active, false);assert.equal(f.optic.glass.material, f.optic.glassMaterial);scope.dispose();
});

test('a mirrored left-handed gun keeps the optical image readable in its natural orientation', () => {
  const f = fixture(), scope = createMagnifiedSight();f.gun.scale.x = -1;f.gun.updateMatrixWorld(true);
  scope.render({ ...f, now: 0 });assert.equal(f.optic.glass.material.map.repeat.x, -1);assert.equal(f.optic.glass.material.map.offset.x, 1);
  f.gun.scale.x = 1;f.gun.updateMatrixWorld(true);scope.render({ ...f, now: 40 });assert.equal(f.optic.glass.material.map.repeat.x, 1);assert.equal(f.optic.glass.material.map.offset.x, 0);scope.dispose();
});
