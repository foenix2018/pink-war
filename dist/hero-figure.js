// GHJU's figure: a feminine silhouette made by reshaping the SKINNED BODY MESH itself, never the skeleton. A waist is
// drawn in between the ribcage and the pelvis, the front of the chest swells slightly forward (one soft contour, not
// separate shapes), and the arms are slimmed around their axis. Every bone keeps its exact
// position, rotation and length, so the animations, the weapon IK (grips exact to the millimetre), the feet's floor
// contact, the hit zones and the plates and cloak hung from the bones are untouched.
//
// The body meshes are shared by both heroes, so GHJU gets her own copy of each geometry (the shared one is never edited).
// Vertices are moved in bind pose (before skinning), weighted by how much of the vertex belongs to the bones concerned:
// the arms hanging along the body at waist height are not dragged in, only the torso is.
// The hips read wider through the flared guards and the belt (hero-gear.js) and the narrower waist around them.
import * as T from './vendor/three.webgpu.min.js';

export const FEMININE_FIGURE = Object.freeze({
  waist:  Object.freeze({ y0: 1.00, y1: 1.34, peak: .46, across: .80, depth: .90, centerZ: .01 }), // waist band (bind y) and its narrowing
  chest:  Object.freeze({ y0: 1.27, y1: 1.47, forward: .013, halfWidth: .17, centerZ: .01 }),           // the chest swells slightly forward, as one contour
  arms:   .92,                                                                                          // radial scale of the arms around their axis
});
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Waist profile: 0 at the pelvis and the chest, 1 at the narrowest point; eased on both sides.
export function waistProfile(y, { y0, y1, peak } = FEMININE_FIGURE.waist) {
  const u = (y - y0) / (y1 - y0); if (u <= 0 || u >= 1) return 0;
  return smooth(0, peak, u) * (1 - smooth(peak, 1, u));
}

// Forward swell of the chest: 1 at the middle of the front of the ribcage, easing to 0 above, below, towards the flanks and
// at the back (the part of the body behind the spine axis does not move).
export function chestSwell(x, y, z, { y0, y1, halfWidth, centerZ } = FEMININE_FIGURE.chest) {
  if (y <= y0 || y >= y1 || Math.abs(x) >= halfWidth || z >= centerZ) return 0;
  const u = (y - y0) / (y1 - y0), across = 1 - smooth(.35, 1, Math.abs(x) / halfWidth), front = smooth(0, .08, centerZ - z);
  return Math.sin(Math.PI * u) ** 1.2 * across * front;
}

export function shapeHeroFigure(model, profile, figure = FEMININE_FIGURE) {
  if (profile?.masculine || model.figure) return model.figure || null;
  model.root.updateMatrixWorld(true);
  const cache = new Map(), restored = [], owned = [];
  const inv = model.root.matrixWorld.clone().invert(), tmp = new T.Vector3();
  const joint = n => { const b = model.actor.bones.find(x => x.name === 'mixamorig' + n); return b ? tmp.setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv).clone() : null; };
  // Arm axes in bind pose: shoulder → elbow → wrist, per side.
  const axes = { Left: [joint('LeftArm'), joint('LeftForeArm'), joint('LeftHand')], Right: [joint('RightArm'), joint('RightForeArm'), joint('RightHand')] };
  const onSegment = (p, a, b) => { const ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return a.clone().addScaledVector(ab, t); };
  const w = figure.waist, p = new T.Vector3(), c = new T.Vector3();
  let moved = 0;
  model.root.traverse(mesh => {
    if (!mesh.isSkinnedMesh || mesh.userData.heroAuthoring || /^Shadow/.test(mesh.name) || !mesh.geometry.attributes.skinIndex) return;
    const bones = mesh.skeleton.bones, group = new Map(); // bone index → 'torso' | 'Left' | 'Right'
    bones.forEach((b, i) => {
      const n = b.name.replace('mixamorig', '');
      if (['Hips', 'Spine', 'Spine1', 'Spine2'].includes(n)) group.set(i, 'torso');
      else if (/^(Left|Right)(Arm|ForeArm)$/.test(n)) group.set(i, n.startsWith('Left') ? 'Left' : 'Right');
    });
    if (!cache.has(mesh.geometry)) {
      const source = mesh.geometry, g = source.clone(), pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
      for (let i = 0; i < pos.count; i++) {
        let torso = 0, left = 0, right = 0;
        for (let k = 0; k < 4; k++) { const grp = group.get(si.getComponent(i, k)), wt = sw.getComponent(i, k); if (grp === 'torso') torso += wt; else if (grp === 'Left') left += wt; else if (grp === 'Right') right += wt; }
        p.fromBufferAttribute(pos, i);
        const x0 = p.x, y0 = p.y, z0 = p.z; let sx = 1, sz = 1;
        const f = waistProfile(p.y, w) * Math.min(1, torso);
        if (f > 0) { sx = 1 - (1 - w.across) * f; sz = 1 - (1 - w.depth) * f; p.x = x0 * sx; p.z = w.centerZ + (z0 - w.centerZ) * sz; }
        const c0 = figure.chest, fc = chestSwell(p.x, p.y, p.z, c0) * Math.min(1, torso);
        if (fc > 0) p.z -= c0.forward * fc;
        const arm = left > right ? left : right, side = left > right ? 'Left' : 'Right';
        if (arm > .5 && axes[side][0]) { // the arm: shrink around the nearest point of its axis
          const a = axes[side]; c.copy(onSegment(p, a[0], a[1])); const c2 = onSegment(p, a[1], a[2]); if (c2.distanceToSquared(p) < c.distanceToSquared(p)) c.copy(c2);
          const k = 1 - (1 - figure.arms) * Math.min(1, (arm - .5) * 2); p.sub(c).multiplyScalar(k).add(c);
        }
        if (p.x !== x0 || p.y !== y0 || p.z !== z0) { pos.setXYZ(i, p.x, p.y, p.z); moved++;
          if (nor && (sx !== 1 || sz !== 1)) { tmp.fromBufferAttribute(nor, i); tmp.set(tmp.x / sx, tmp.y, tmp.z / sz).normalize(); nor.setXYZ(i, tmp.x, tmp.y, tmp.z); } }
      }
      pos.needsUpdate = true; nor && (nor.needsUpdate = true); g.userData.heroFigure = true; cache.set(source, g); owned.push(g);
    }
    restored.push([mesh, mesh.geometry]); mesh.geometry = cache.get(mesh.geometry);
  });
  const api = { figure, moved, meshes: restored.length,
    reset() { for (const [mesh, geometry] of restored) mesh.geometry = geometry; model.figure = null; },
    dispose() { for (const [mesh, geometry] of restored) mesh.geometry = geometry; for (const g of owned) g.dispose(); model.figure = null; } };
  model.figure = api;
  return api;
}
