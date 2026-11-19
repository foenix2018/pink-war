import * as T from './vendor/three.webgpu.min.js';
import {parsePWM} from './blender-models.js';

// GHJU / LYLU Shadow Unit gear made in Blender (tools/blender/heroes_assets.py), after the concept art:
//  · torn cloak (frayed hem, holes, a rose or blue band) on the existing animated cape, and a torn front tabard;
//  · a cowl/scarf draped by a real cloth simulation on the shoulders, pinned at the neck (follows the chest);
//  · a tactical belt with six flapped pouches (follows the hips) and a rifle slung across the back;
//  · the graphite armour re-surfaced as small riveted plates (texture baked from a detailed model).
// Pieces are rigid children of the native bones, authored in the rig's bind frame, like the cape anchor.
// Everything loads after the soldier is shown; a missing file leaves the previous look in place.
const BASE = new URL('./assets/heroes/', import.meta.url).href;
const files = new Map(), textures = new Map(), loader = new T.TextureLoader();
const file = name => { if (!files.has(name)) files.set(name, fetch(BASE + name + '.pwm').then(r => { if (!r.ok) throw Error(name + ' ' + r.status); return r.arrayBuffer(); })); return files.get(name); };
function texture(name, { srgb = true, repeat = true, channel = 0, flipY = true } = {}) {
  const key = name + channel;
  if (!textures.has(key)) textures.set(key, new Promise((resolve, reject) => loader.load(BASE + name, t => {
    t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; t.channel = channel; t.flipY = flipY; t.anisotropy = 8; t.needsUpdate = true; resolve(t);
  }, undefined, reject)));
  return textures.get(key);
}
export const HERO_GEAR_FILES = Object.freeze(['mantle', 'belt', 'rifle']);
// Flared hip guards: GHJU's figure (hero-figure.js reshapes the body, the chest plates swell forward by themselves).
export const HERO_FIGURE_FILES = Object.freeze(['hips']);
export const PLATE_TILE = .24;
// The rifle is slung across the shoulder blades, high on the back, stock to the lower left and muzzle over the right shoulder;
// the mini-jetpack (jetpack-fx.js) sits below it, low on the back, so the two never cross. Rig frame, metres; roll in radians about z.
// The rifle is 1.02 m long (x from -0.46 to +0.60 in its own frame).
export const RIFLE_MOUNT = Object.freeze({ position: [0.02, 1.56, 0.215], roll: 0.85 });

// Metric box projection of the armour batches (rig frame), so the riveted plates keep their real size everywhere.
export function plateUV(geometry, tile = PLATE_TILE) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ax >= ay && ax >= az ? [p.getZ(i), p.getY(i)] : ay >= az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
}

export function attachHeroGear(model, profile, { cape = null, tabard = null, armour = null } = {}) {
  const blue = !!profile.masculine, accent = blue ? 0x51b5ff : 0xff148b, owned = [], anchors = [], geometries = [];
  let disposed = false;
  const mat = (o, Kind = T.MeshStandardMaterial) => { const m = new Kind(o); owned.push(m); return m; };
  const M = {
    fabric: mat({ color: 0x7a7a80, roughness: .92, metalness: 0, side: T.DoubleSide, alphaTest: .5 }),
    strap: mat({ color: 0x1b1c20, roughness: .86, metalness: .05 }), pouch: mat({ color: blue ? 0x22262c : 0x272128, roughness: .82, metalness: .05 }),
    gunDark: mat({ color: 0x1c2027, roughness: .42, metalness: .6 }), gunSteel: mat({ color: 0x4b525c, roughness: .34, metalness: .82 }),
    black: mat({ color: 0x0b0c0f, roughness: .6, metalness: .3 }), rubber: mat({ color: 0x121214, roughness: .9, metalness: 0 }),
    label: mat({ color: 0xc9ccd2, roughness: .6, metalness: 0 }), glow: mat({ color: accent, toneMapped: false }, T.MeshBasicMaterial),
    lens: mat({ color: accent, emissive: accent, emissiveIntensity: .6, roughness: .08, metalness: .4 })
  };
  const bind = bone => { const i = model.actor.bones.indexOf(bone); return new T.Matrix4().fromArray(model.actor.data.bones[i].inverse); };
  // An anchor under a bone that maps rig-frame (bind pose) coordinates onto that bone.
  function anchor(bone, name, extra = null) {
    const g = new T.Group(); g.name = 'Shadow / ' + name; const m = bind(bone); if (extra) m.multiply(extra);
    m.decompose(g.position, g.quaternion, g.scale); bone.add(g); anchors.push(g); return g;
  }
  function place(parent, model3d, ao) {
    for (const p of model3d.primitives) {
      const base = M[p.material] || M.gunDark, m = base.clone(); owned.push(m);
      if (ao && !m.isMeshBasicMaterial) { m.aoMap = ao; m.aoMapIntensity = 1; }
      if (!p.geometry.attributes.uv) plateUV(p.geometry, 1);
      geometries.push(p.geometry); const mesh = new T.Mesh(p.geometry, m); mesh.castShadow = !m.isMeshBasicMaterial; mesh.receiveShadow = true; mesh.name = parent.name + ' / ' + p.material; parent.add(mesh);
    }
  }
  const hips = model.actor.bone('Hips'), chest = model.body;
  const ready = (async () => {
    const cloak = await texture('cloak_' + (blue ? 'lylu' : 'ghju') + '.png'), fabric = await texture('fabric.png'), fabricNor = await texture('fabric_nor.jpg', { srgb: false });
    if (disposed) return;
    M.fabric.map = fabric; M.fabric.normalMap = fabricNor; M.fabric.normalScale.set(.6, .6); M.fabric.needsUpdate = true;
    // Cape and tabard: same animated cloth, now torn fabric with alpha cut-outs instead of neon piping.
    for (const [cloth, map] of [[cape, cloak], [tabard, fabric]]) {
      const mesh = cloth?.anchor?.children.find(o => o.isMesh); if (!mesh) continue;
      const m = mesh.material; m.map = map; m.bumpMap = null; m.normalMap = fabricNor; m.normalScale?.set(.6, .6); m.alphaTest = .5; m.side = T.DoubleSide; m.color?.setHex(0x7a7a80); if ('sheen' in m) m.sheen = Math.min(m.sheen ?? 0, .25); m.needsUpdate = true;
      for (const child of mesh.children) child.visible = false; // the 3D piping of the old cape
      mesh.userData.tornFabric = true;
    }
    // Armour: riveted segmented plates on the graphite finishes (the glowing lines and the visor keep theirs).
    const [diff, nor, rough] = await Promise.all([texture('plates_diff.jpg'), texture('plates_nor.jpg', { srgb: false }), texture('plates_rough.jpg', { srgb: false })]);
    if (disposed) return;
    for (const batch of armour?.batches || []) {
      const m = batch.material; if (m.isMeshBasicMaterial || m.transparent || m.isMeshPhysicalMaterial || !m.map?.isDataTexture) continue;
      plateUV(batch.geometry); m.map = diff; m.bumpMap = null; m.normalMap = nor; m.normalScale.set(.85, .85); m.roughnessMap = rough; m.needsUpdate = true;
      if (!blue) m.color.lerp(new T.Color(0x3a2134), .35); // GHJU: the plum-tinted plates of her concept
      batch.userData.rivetedPlates = true;
    }
    const [mantle, belt, rifle] = await Promise.all(HERO_GEAR_FILES.map(n => file(n).then(b => parsePWM(T, b))));
    const [aoMantle, aoBelt, aoRifle] = await Promise.all(HERO_GEAR_FILES.map(n => texture(n + '_ao.jpg', { srgb: false, repeat: false, channel: 1, flipY: false })));
    if (disposed) return;
    place(anchor(chest, 'capuche drapée'), mantle, aoMantle);
    place(anchor(hips, 'ceinture tactique'), belt, aoBelt);
    // Slung across the back, muzzle over the right shoulder, over the cloak.
    if (!blue) { // GHJU's figure
      const hipsGuard = await file('hips').then(b => parsePWM(T, b)), aoHips = await texture('hips_ao.jpg', { srgb: false, repeat: false, channel: 1, flipY: false });
      if (disposed) return;
      place(anchor(hips, 'protections de hanche'), hipsGuard, aoHips);
    }
    place(anchor(chest, 'fusil porté dans le dos', new T.Matrix4().compose(new T.Vector3(...RIFLE_MOUNT.position), new T.Quaternion().setFromEuler(new T.Euler(0, 0, RIFLE_MOUNT.roll)), new T.Vector3(1, 1, 1))), rifle, aoRifle);
    return true;
  })().catch(error => { console.warn('Shadow Unit / équipement Blender indisponible', error); return false; });
  return {
    ready, anchors,
    dispose() { disposed = true; for (const g of anchors) g.removeFromParent(); for (const m of owned) m.dispose(); for (const g of geometries) g.dispose(); }
  };
}
