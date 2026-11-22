// CHAPITRE 07 — the forest of the Sources drawn for the combat engine: the world of foret.js (terrain, river and
// waterfall, ruins, medical centre, cave and relay, remnants, vegetation with levels of detail, hills, sky), plus what a
// combat page needs: interaction markers, ORDRE portals, the ring on the spot the SY-05 has learnt. Same API as m06-art.js.
import { buildForestWorld, SUN_DIR } from './foret.js';
import { createElectricPortal, PORTAL_CLOSE_SECONDS } from './electric-portal.js';
import { INTERACTIONS } from './m07-layout.js';

export function createM07Art(T, scene, { quality = 'normal', webgpu = false, onPortalClose = () => {} } = {}) {
  const low = quality === 'low', root = new T.Group(); root.name = 'M07 / forêt des Sources'; scene.add(root);
  const world = buildForestWorld(scene, { quality: low ? 'low' : 'balanced', webgpu, shadows: false });
  const glow = color => new T.MeshBasicMaterial({ color, toneMapped: false });
  const additive = (color, opacity = .6) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });

  // ---------- Interaction markers (documents are always readable; actions light up when available) ----------
  const devices = new Map();
  for (const it of INTERACTIONS) {
    const g = new T.Group(); g.position.set(it.x, it.y || 0, it.z); root.add(g);
    const gem = new T.Mesh(new T.OctahedronGeometry(.13, 0), glow(0xffb35c)); gem.position.y = 1.9; g.add(gem);
    const ring = new T.Mesh(new T.RingGeometry(.5, .58, 28), additive(0xffb35c, .35)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    if (it.log) { const paper = new T.Mesh(new T.PlaneGeometry(.3, .4), new T.MeshStandardMaterial({ color: 0xe8e1cf, roughness: .9, side: T.DoubleSide })); paper.position.set(0, 1.15, 0); paper.rotation.x = -.3; g.add(paper); }
    devices.set(it.id, { it, g, gem, ring, done: false, available: false });
  }
  // ---------- Portals of ORDRE ----------
  const portals = [];
  function openPortal(x, y, z, { charge = 3.2, hold = 2.2 } = {}) {
    const effect = createElectricPortal(T, { height: 3.6, low, webgpu }), group = effect.group; group.position.set(x, y, z); root.add(group);
    const p = { effect, group, age: 0, charge, hold, closing: false }; portals.push(p); return p;
  }
  // ---------- The spot the SY-05 has learnt ----------
  const learnt = { ring: new T.Mesh(new T.RingGeometry(6.4, 7, 64), additive(0xff3b4e, 0)), level: 0 };
  learnt.ring.rotation.x = -Math.PI / 2; learnt.ring.visible = false; root.add(learnt.ring);

  const aspect = () => (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
  return {
    root, sun: world.sun, world, openPortal, get ready() { return Promise.resolve(); },
    build() {},
    update(t, dt, eye, player) {
      const cam = eye?.isCamera ? eye : null;
      if (cam && player) world.update({ time: t, dt, camera: cam, player, aspect: aspect() });
      const blink = .5 + .5 * Math.sin(t * 5);
      for (const d of devices.values()) {
        const doc = !!d.it.log, color = d.done ? 0x3dff8a : doc ? 0xe8f6ff : d.available ? 0xffb35c : 0x3a2a1a;
        d.gem.material.color.set(color); d.ring.material.color.set(color); d.gem.visible = d.available || doc || d.done; d.ring.visible = d.gem.visible && !d.done;
        d.gem.position.y = 1.9 + Math.sin(t * 2 + d.it.x) * .08; d.gem.rotation.y = t * 1.6; d.ring.material.opacity = d.available ? .25 + .35 * blink : .2;
      }
      for (let i = portals.length - 1; i >= 0; i--) {
        const p = portals[i]; p.age += dt; const end = p.charge + p.hold, closingAge = p.age >= end ? p.age - end : null;
        if (closingAge !== null && !p.closing) { p.closing = true; onPortalClose(p.group.position); }
        if (eye?.position) p.group.lookAt(eye.position.x, p.group.position.y, eye.position.z);
        p.effect.update(t, { age: p.age, closingAge });
        if (closingAge !== null && closingAge >= PORTAL_CLOSE_SECONDS) { p.effect.dispose(); portals.splice(i, 1); }
      }
      learnt.level = Math.max(0, learnt.level - dt * .12); learnt.ring.material.opacity = .15 + .6 * learnt.level * (.6 + .4 * Math.sin(t * 8)); learnt.ring.visible = learnt.level > .01;
    },
    setDoor() {}, setLine() {},
    adapt(spot) { learnt.ring.position.set(spot.x, (spot.y ?? 0) + .08, spot.z); learnt.level = 1; },
    markDone(id, isDone = true) { const d = devices.get(id); if (d) d.done = isDone; },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { portals: portals.length, kinds: Object.fromEntries(world.kinds.map(k => [k.kind, k.visible])), sun: SUN_DIR.toArray() }; }
  };
}
