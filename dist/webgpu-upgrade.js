// WebGPU finish for whole levels (chapters 02 and 03), applied once after the world is built, before the first frame.
//  · Shapes: plain boxes get rounded edges at their real size (a highlight runs along every edge), round parts
//    (cylinders, cones, spheres, tori, discs) get enough facets to read as round. Shared geometries stay shared;
//    instanced parts count every instance against a triangle budget.
//  · Surfaces: every standard material becomes a physical one in place (same object, so code that animates a
//    lamp's colour or opacity keeps working), with a clear coat chosen from what the surface is: lacquered metal,
//    gloss paint, polished or wet surfaces. Rough stone and cloth keep their look.
// Never touches skinned or morphing meshes, the first-person weapon/hands (camera children), HUD planes drawn on top,
// collision data or anything outside `root`. WebGL and the Performance budget never call it.
const ROUND = { CylinderGeometry: 40, ConeGeometry: 40, SphereGeometry: 40, TorusGeometry: 40, CircleGeometry: 48, RingGeometry: 48, LatheGeometry: 40 };

// Box of size w×h×d with edges rounded by r (real units), built from a 3-segment box like soft-pieces.js but with
// per-axis inner extents, so the rounding keeps the same radius on long and short pieces.
export function roundedBox(T, w, h, d, r) {
  const g = new T.BoxGeometry(w, h, d, 3, 3, 3), p = g.attributes.position, n = g.attributes.normal;
  const half = [w / 2, h / 2, d / 2], inner = half.map(v => Math.max(0, v - r)), third = half.map(v => v / 3);
  const v = [0, 0, 0], b = [0, 0, 0], dir = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    v[0] = p.getX(i); v[1] = p.getY(i); v[2] = p.getZ(i);
    for (let a = 0; a < 3; a++) { if (Math.abs(Math.abs(v[a]) - third[a]) < 1e-5 * Math.max(1, half[a])) v[a] = Math.sign(v[a]) * inner[a]; b[a] = Math.max(-inner[a], Math.min(inner[a], v[a])); dir[a] = v[a] - b[a]; }
    let len = Math.hypot(dir[0], dir[1], dir[2]); if (len < 1e-9) { dir[0] = n.getX(i); dir[1] = n.getY(i); dir[2] = n.getZ(i); len = 1; }
    for (let a = 0; a < 3; a++) dir[a] /= len;
    p.setXYZ(i, b[0] + dir[0] * r, b[1] + dir[1] * r, b[2] + dir[2] * r); n.setXYZ(i, dir[0], dir[1], dir[2]);
  }
  p.needsUpdate = n.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.webgpuShape = 'rounded';
  return g;
}

// Facets follow the real size: one facet per ~7 cm of circumference, at most `ROUND[type]` — a 5 cm bulb is already
// round, a 60 cm drum or a 1 m tank is not.
const facets = (radius, current, max) => Math.min(max, Math.max(current, Math.ceil(2 * Math.PI * Math.abs(radius) / .07)));
function rebuiltRound(T, geometry, size = 1) {
  const k = geometry.type, q = geometry.parameters, max = ROUND[k]; if (!max || !q) return null;
  if (k === 'CylinderGeometry') { const n = facets(Math.max(q.radiusTop, q.radiusBottom) * size, q.radialSegments, max); return n > q.radialSegments ? new T.CylinderGeometry(q.radiusTop, q.radiusBottom, q.height, n, q.heightSegments, q.openEnded, q.thetaStart, q.thetaLength) : null; }
  if (k === 'ConeGeometry') { const n = facets(q.radius * size, q.radialSegments, max); return n > q.radialSegments ? new T.ConeGeometry(q.radius, q.height, n, q.heightSegments, q.openEnded, q.thetaStart, q.thetaLength) : null; }
  if (k === 'SphereGeometry') { const n = facets(q.radius * size, q.widthSegments, max); return n > q.widthSegments ? new T.SphereGeometry(q.radius, n, Math.max(q.heightSegments, Math.round(n * .6)), q.phiStart, q.phiLength, q.thetaStart, q.thetaLength) : null; }
  if (k === 'TorusGeometry') { const n = facets((q.radius + q.tube) * size, q.tubularSegments, max * 1.5); return n > q.tubularSegments ? new T.TorusGeometry(q.radius, q.tube, Math.max(q.radialSegments, facets(q.tube * size, q.radialSegments, 16)), n, q.arc) : null; }
  if (k === 'CircleGeometry') { const n = facets(q.radius * size, q.segments, max); return n > q.segments ? new T.CircleGeometry(q.radius, n, q.thetaStart, q.thetaLength) : null; }
  if (k === 'RingGeometry') { const n = facets(q.outerRadius * size, q.thetaSegments, max); return n > q.thetaSegments ? new T.RingGeometry(q.innerRadius, q.outerRadius, n, q.phiSegments, q.thetaStart, q.thetaLength) : null; }
  if (k === 'LatheGeometry') { const r = Math.max(...q.points.map(p => Math.abs(p.x))); const n = facets(r * size, q.segments, max); return n > q.segments ? new T.LatheGeometry(q.points, n, q.phiStart, q.phiLength) : null; }
  return null;
}
// Typical size of the instances of an instanced part (median of their largest scale), so a unit sphere drawn as
// 3 cm neon glass is treated as 3 cm.
const instanceScale = []; function instanceSize(mesh, radial = false) {
  const a = mesh.instanceMatrix?.array, n = Math.min(mesh.count, 64); if (!a || !n) return 1; instanceScale.length = 0;
  const step = Math.max(1, Math.floor(mesh.count / n));
  for (let i = 0; i < mesh.count; i += step) { const o = i * 16; const sx = Math.hypot(a[o], a[o + 1], a[o + 2]), sy = Math.hypot(a[o + 4], a[o + 5], a[o + 6]), sz = Math.hypot(a[o + 8], a[o + 9], a[o + 10]); instanceScale.push(radial ? Math.max(sx, sz) : Math.max(sx, sy, sz)); }
  instanceScale.sort((x, y) => x - y); return instanceScale[instanceScale.length >> 1] || 1;
}
const triangles = g => (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;

// Clear coat for a surface, from its own parameters. null = leave it as it is (rough stone, plaster, cloth, skin).
export function coatFor(m) {
  const r = m.roughness ?? 1, metal = m.metalness ?? 0;
  if (m.transparent && (m.opacity ?? 1) < .6) return { clearcoat: .7, clearcoatRoughness: .06 }; // glass, visors
  if (r <= .2) return { clearcoat: .9, clearcoatRoughness: .05 };                                 // polished, wet
  if (metal >= .5) return { clearcoat: .28, clearcoatRoughness: Math.min(.45, .2 + r * .3) };      // lacquered metal
  if (r <= .6) return { clearcoat: .45, clearcoatRoughness: .2 + r * .25 };                       // gloss / satin paint
  if (r <= .8 && metal >= .15) return { clearcoat: .2, clearcoatRoughness: .45 };                 // worn painted steel
  return null;
}

// Turns a MeshStandardMaterial into a MeshPhysicalMaterial in place: references held by the level (flicker,
// fades, colour swaps) still point at the material that is drawn.
export function physicalInPlace(T, m) {
  if (!m?.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isNodeMaterial) return false;
  const coat = coatFor(m); if (!coat) return false;
  const template = new T.MeshPhysicalMaterial();
  for (const key of Object.keys(template)) if (!(key in m)) { const v = template[key]; m[key] = v && typeof v.clone === 'function' ? v.clone() : v; }
  Object.setPrototypeOf(m, T.MeshPhysicalMaterial.prototype);
  m.type = 'MeshPhysicalMaterial'; m.isMeshPhysicalMaterial = true; m.defines = { ...(m.defines || {}), STANDARD: '', PHYSICAL: '' };
  Object.assign(m, coat); m.userData.webgpuPhysical = true; m.needsUpdate = true; template.dispose();
  return true;
}

export function upgradeForWebGPU(T, root, { camera = null, budget = 350_000, skip = () => false } = {}) {
  const stats = { rounded: 0, smoothed: 0, materials: 0, addedTriangles: 0, skippedBudget: 0 };
  if (!root) return stats;
  const firstPerson = new Set(); camera?.traverse?.(o => firstPerson.add(o));
  const roundCache = new Map(), boxCache = new Map(), seenMaterials = new Set();
  const scale = new T.Vector3(); root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !firstPerson.has(o) && !skip(o)) meshes.push(o); });
  for (const mesh of meshes) {
    const materials = [].concat(mesh.material || []);
    if (materials.some(m => m && m.depthTest === false)) continue; // HUD and overlays drawn on top
    for (const m of materials) if (m && !seenMaterials.has(m)) { seenMaterials.add(m); if (physicalInPlace(T, m)) stats.materials++; }
    const g = mesh.geometry; if (!g || g.morphAttributes?.position || g.userData?.webgpuShape) continue;
    const copies = mesh.isInstancedMesh ? mesh.count : 1;
    let next = null;
    if (ROUND[g.type]) {
      if ([].concat(mesh.material).some(m => m?.side === T.BackSide)) continue; // sky domes stay as they are
      // Cylinders, cones and lathes: only the radius axes count (a long thin tube is thin).
      const radial = g.type === 'CylinderGeometry' || g.type === 'ConeGeometry' || g.type === 'LatheGeometry';
      mesh.getWorldScale(scale); let size = (radial ? Math.max(Math.abs(scale.x), Math.abs(scale.z)) : Math.max(Math.abs(scale.x), Math.abs(scale.z), Math.abs(scale.y))) || 1;
      if (mesh.isInstancedMesh) size *= instanceSize(mesh, radial);
      const key = g.uuid + ':' + size.toFixed(3);
      if (!roundCache.has(key)) roundCache.set(key, rebuiltRound(T, g, size)); next = roundCache.get(key);
      if (next) next.userData.webgpuShape = 'round';
    } else if (g.type === 'BoxGeometry' && !mesh.isInstancedMesh) {
      const q = g.parameters; if (!q || q.widthSegments !== 1 || q.heightSegments !== 1 || q.depthSegments !== 1) continue;
      mesh.getWorldScale(scale); const sx = Math.abs(scale.x) || 1, sy = Math.abs(scale.y) || 1, sz = Math.abs(scale.z) || 1;
      const w = q.width * sx, h = q.height * sy, d = q.depth * sz, lo = Math.min(w, h, d), hi = Math.max(w, h, d);
      if (lo < .06 || hi / lo > 40 || hi > 60) continue; // wires, skins, sheets and whole walls keep their edges
      const r = Math.min(.05, Math.max(.008, lo * .09));
      if (Math.abs(sx - sy) > 1e-3 || Math.abs(sx - sz) > 1e-3) continue; // a radius would stretch on a squashed box
      const key = g.uuid + ':' + r.toFixed(4) + ':' + sx.toFixed(4);
      if (!boxCache.has(key)) boxCache.set(key, roundedBox(T, q.width, q.height, q.depth, r / sx)); next = boxCache.get(key);
    }
    if (!next) continue;
    const added = (triangles(next) - triangles(g)) * copies;
    if (stats.addedTriangles + added > budget) { stats.skippedBudget++; continue; }
    stats.addedTriangles += added; mesh.geometry = next;
    if (next.userData.webgpuShape === 'rounded') stats.rounded++; else stats.smoothed++;
  }
  return stats;
}
