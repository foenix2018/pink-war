// Softened detail pieces for the level dressings. The art modules dress their levels with hundreds of instanced unit
// cubes (crates, blocks, cabinets, consoles, slabs…); sharp 90° edges catch no light and read as placeholders. This
// unit cube has rounded edges and corners with smooth normals, so the same instances show a highlight along every
// edge. It is only used where the scaled radius stays believable: thin or very elongated pieces (rails, bands, LEDs,
// beams) keep the plain cube.
const geometries = new WeakMap();

// Unit cube centred on the origin, rounded with radius r (in unit space): a 3-segment box whose inner vertices are
// moved to ±(0.5 − r), then every vertex is pushed out from the inner box along its own normal.
export function softCube(T, r = .085) {
  let byRadius = geometries.get(T); if (!byRadius) geometries.set(T, byRadius = new Map());
  if (byRadius.has(r)) return byRadius.get(r);
  const g = new T.BoxGeometry(1, 1, 1, 3, 3, 3), p = g.attributes.position, n = g.attributes.normal, inner = .5 - r;
  const v = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3();
  const remap = c => Math.abs(Math.abs(c) - 1 / 6) < 1e-4 ? Math.sign(c) * inner : c;
  for (let i = 0; i < p.count; i++) {
    v.set(remap(p.getX(i)), remap(p.getY(i)), remap(p.getZ(i)));
    b.set(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
    d.subVectors(v, b); if (d.lengthSq() < 1e-12) d.set(n.getX(i), n.getY(i), n.getZ(i)); d.normalize();
    p.setXYZ(i, b.x + d.x * r, b.y + d.y * r, b.z + d.z * r); n.setXYZ(i, d.x, d.y, d.z);
  }
  p.needsUpdate = n.needsUpdate = true; g.computeBoundingSphere(); g.name = 'pièce aux arêtes adoucies';
  byRadius.set(r, g); return g;
}

// A piece gets soft edges when it is thick enough and not a long thin strip (the rounding scales with the piece).
export const softEnough = (sx, sy, sz) => { const lo = Math.min(sx, sy, sz), hi = Math.max(sx, sy, sz); return lo >= .16 && hi / lo <= 6; };

// Split a list of [x, y, z, sx, sy, sz, …] pieces into the soft and the plain ones.
export function splitPieces(list) {
  const soft = [], plain = [];
  for (const item of list) (softEnough(item[3], item[4], item[5]) ? soft : plain).push(item);
  return { soft, plain };
}
