import * as T from './vendor/three.webgpu.min.js';

// The heroes' undersuit ("collant"): a honeycomb of small hexagonal cells — bevelled grooves, a thin lit edge, a different
// shade for every cell, worn scuffs — instead of a plain black (tools/blender/hex_suit_textures.py): plum for GHJU, blue for
// LYLU. The suit is the visible "AÉGIS IV suit" skinned mesh; the rest of the body is covered by the plates.
//
// The mesh's own UVs are not made for a pattern, so every triangle is projected along its dominant axis in BIND pose, in
// metres, on a non-indexed copy of the geometry (a seam is then a clean pattern shift along a triangle edge, never a smear);
// the pattern is attached to the skin and follows every animation. The shared geometry and material are never edited.
const BASE = new URL('./assets/heroes/', import.meta.url).href;
export const SUIT_TILE = .30;      // metres covered by one texture tile (10 × 17 hexagon periods → hexagons about 2 cm across)
const loader = new T.TextureLoader(), cache = new Map();
function texture(name, { srgb = true } = {}) {
  if (!cache.has(name)) cache.set(name, new Promise((resolve, reject) => loader.load(BASE + name, t => {
    t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; resolve(t);
  }, undefined, reject)));
  return cache.get(name);
}

// Planar projection per triangle along the dominant axis of its face normal, on an unindexed geometry.
export function projectHexUV(geometry, tile = SUIT_TILE) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(), p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), axis = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      const [u, v] = axis === 0 ? [z, y] : axis === 1 ? [x, z] : [x, y];
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return g;
}

export function applyHexSuit(model, profile) {
  const meshes = []; model.root.traverse(o => { if (o.isSkinnedMesh && o.name === 'AÉGIS IV suit' && o.geometry.attributes.skinIndex) meshes.push(o); });
  const blue = !!profile.masculine, restored = [], owned = [];
  let disposed = false;
  for (const mesh of meshes) {
    const geometry = projectHexUV(mesh.geometry), material = mesh.material.clone();
    material.name = 'Collant hexagonal ' + (blue ? 'bleu' : 'prune'); material.metalness = .22; material.roughness = .62;
    restored.push([mesh, mesh.geometry, mesh.material]); owned.push(geometry, material);
    mesh.geometry = geometry; mesh.material = material;
  }
  const ready = !meshes.length ? Promise.resolve(false) : Promise.all([
    texture(blue ? 'suit_hex_lylu.jpg' : 'suit_hex_ghju.jpg'), texture('suit_hex_nor.jpg', { srgb: false }), texture('suit_hex_rough.jpg', { srgb: false })
  ]).then(([map, normalMap, roughnessMap]) => {
    if (disposed) return false;
    for (const [mesh] of restored) {
      const m = mesh.material; m.color.setHex(0xffffff); m.map = map; m.normalMap = normalMap; m.normalScale.set(.5, .5); m.roughnessMap = roughnessMap; m.needsUpdate = true;
    }
    return true;
  }).catch(error => { console.warn('Collant hexagonal indisponible', error); return false; });
  return {
    ready, meshes: restored.length,
    dispose() { disposed = true; for (const [mesh, geometry, material] of restored) { mesh.geometry = geometry; mesh.material = material; } for (const o of owned) o.dispose(); }
  };
}
