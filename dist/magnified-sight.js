import * as T from './vendor/three.webgpu.min.js';
import { lensFov } from './optics.js';

// One reusable optical render; WebXR head and weapon poses stay authoritative.
export function createMagnifiedSight(size = 384) {
  size = Math.max(128, Math.min(512, size));
  const target = new T.WebGLRenderTarget(size, size, { depthBuffer: true, stencilBuffer: false });
  target.texture.colorSpace = T.SRGBColorSpace; target.texture.generateMipmaps = false;
  const material = new T.MeshBasicMaterial({ map: target.texture, toneMapped: false, side: T.DoubleSide });
  const camera = new T.PerspectiveCamera(4, 1, .025, 650);
  const eye = new T.Vector3(), aim = new T.Vector3();
  const viewport = new T.Vector4(), scissor = new T.Vector4();
  let bound = null, lastAt = -Infinity, disposed = false;
  const state = { active: false, magnification: 1, frames: 0, fov: 0, size };
  function release() {
    if (bound) bound.glass.material = bound.glassMaterial;
    bound = null; state.active = false; state.magnification = 1; lastAt = -Infinity;
  }
  function render({ renderer, scene, gun, eyeCamera, hide = [], active = false, now = performance.now(), beforeRender }) {
    if (disposed) return;
    const optic = gun?.userData.optics?.[gun.userData.index];
    if (!active || !renderer?.isWebGLRenderer || !optic?.reticle.visible || !gun.userData.aiming) { release(); return; }
    if (bound !== optic) { release(); bound = optic; }
    const mirror = gun.matrixWorld.determinant() < 0;
    target.texture.repeat.x = mirror ? -1 : 1; target.texture.offset.x = mirror ? 1 : 0;
    optic.glass.material = material; state.active = true; state.magnification = optic.cfg.magnification;
    // At most 30 optical frames per second, independent of headset cadence.
    if (now - lastAt < 1000 / 30) return;
    eyeCamera.getWorldPosition(eye); camera.position.copy(eye);
    const muzzle = gun.userData.flash.position;
    gun.localToWorld(aim.set(muzzle.x, muzzle.y, muzzle.z - 100));
    camera.up.set(0, 1, 0).transformDirection(gun.matrixWorld); camera.lookAt(aim);
    camera.fov = lensFov(optic.cfg.radius, optic.eyeDistance, optic.cfg.magnification);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); state.fov = camera.fov;
    const previousTarget = renderer.getRenderTarget(), xr = renderer.xr.enabled;
    const scissorTest = renderer.getScissorTest(), autoClear = renderer.autoClear;
    const shadowAuto = renderer.shadowMap.autoUpdate, shadowNeeds = renderer.shadowMap.needsUpdate;
    renderer.getViewport(viewport); renderer.getScissor(scissor);
    const visibility = hide.filter(Boolean).map(object => [object, object.visible]);
    try {
      for (const [object] of visibility) object.visible = false;
      renderer.xr.enabled = false; renderer.autoClear = true;
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
      renderer.setRenderTarget(target); renderer.setViewport(0, 0, size, size); renderer.setScissorTest(false);
      beforeRender?.(camera); renderer.render(scene, camera); lastAt = now; state.frames++;
    } finally {
      for (const [object, visible] of visibility) object.visible = visible;
      renderer.setRenderTarget(previousTarget); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
      renderer.autoClear = autoClear; renderer.shadowMap.autoUpdate = shadowAuto; renderer.shadowMap.needsUpdate = shadowNeeds;
      renderer.xr.enabled = xr;
    }
  }
  return { render, release, stats: () => ({ ...state }), dispose() { if (disposed) return; release(); disposed = true; material.dispose(); target.dispose(); } };
}
