import {PLAYER_SPEEDS} from './locomotion.js';
// Living first-person camera, shared by the story levels (after the reference « SUBLEVEL 07 »): head bob driven by
// the real ground speed, a lean into strafes, a dip on landings, a wider field of view while sprinting, and a trauma
// shake (explosions, kills at close range, hits taken) that decays quadratically. Pure state + one apply() after the
// level has posed its camera; never used in the headset, scaled down for « reduced motion ».
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const noise = t => Math.sin(t * 12.9898) * Math.sin(t * 4.1414 + 1.7) * Math.cos(t * 7.233 + .4);
export function createCameraFeel({ reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false } = {}) {
  const s = { bobT: 0, bob: 0, lean: 0, dip: 0, shake: 0, sprint: 0, t: 0, wasGrounded: true, fall: 0 }, k = reduced ? .3 : 1;
  return {
    state: s,
    shake(amount = .3) { s.shake = Math.min(1, s.shake + amount * k); },
    // speed in m/s on the ground plane; strafe −1…1 (left/right input); verticalSpeed in m/s.
    update(dt, { speed = 0, grounded = true, verticalSpeed = 0, strafe = 0, sprint = false, aim = 0 } = {}) {
      dt = Math.min(.05, Math.max(0, dt)); s.t += dt;
      if (grounded && speed > .8) s.bobT += dt * speed * 1.55;
      s.bob = damp(s.bob, grounded ? Math.min(1, speed / 4.5) * (1 - aim * .7) : 0, 8, dt);
      s.lean = damp(s.lean, -strafe * .012 * Math.min(1, speed / 4), 8, dt);
      s.sprint = damp(s.sprint, sprint && speed > PLAYER_SPEEDS.sprint*.7 ? 1 : 0, 9, dt);
      if (!grounded) s.fall = Math.min(s.fall, verticalSpeed);
      if (grounded && !s.wasGrounded && s.fall < -3) s.dip = Math.min(.16, -s.fall * .018) * k;
      if (grounded) s.fall = 0;
      s.wasGrounded = grounded; s.dip = damp(s.dip, 0, 9, dt); s.shake = Math.max(0, s.shake - dt * 2.2);
    },
    // Offsets for this frame (also usable by a weapon view-model for a matching sway).
    pose() {
      const sh = s.shake * s.shake;
      return { y: Math.sin(s.bobT * 2) * .028 * s.bob * k - s.dip, x: Math.cos(s.bobT) * .02 * s.bob * k,
        roll: s.lean * k + noise(s.t * 23) * .05 * sh, pitch: noise(s.t * 19 + 7) * .03 * sh, yaw: noise(s.t * 21 + 3) * .03 * sh, fov: s.sprint * 5 * k };
    },
    // motion:false keeps only the trauma shake (levels whose walk bob and landing come from fps-motion.js).
    apply(camera, { motion = true } = {}) {
      const p = this.pose(), yaw = camera.rotation.y;
      if (motion) { camera.position.y += p.y; camera.position.x += Math.cos(yaw) * p.x; camera.position.z -= Math.sin(yaw) * p.x; if (p.fov > .01 && camera.isPerspectiveCamera) camera.fov += p.fov; }
      camera.rotation.z += motion ? p.roll : p.roll - s.lean; camera.rotation.x += p.pitch; camera.rotation.y += p.yaw;
      return p;
    },
    reset() { Object.assign(s, { bob: 0, lean: 0, dip: 0, shake: 0, sprint: 0, wasGrounded: true, fall: 0 }); }
  };
}
