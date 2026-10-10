import * as T from './vendor/three.webgpu.min.js';

// Procedural modelling helpers. Every geometry carries position, normal and uv so that any mix can be merged.
const up = new T.Vector3(0, 1, 0), tmpA = new T.Vector3(), tmpB = new T.Vector3();

// A box whose edges are rounded by `radius` metres, whatever its proportions (a unit rounded box scaled
// afterwards would turn its corners into ellipses). `segments` counts the facets of each rounded edge.
export function bevelBox(width = 1, height = 1, depth = 1, radius = .01, segments = 2) {
  const n = segments * 2 + 1, r = Math.min(width / 2, height / 2, depth / 2, radius), half = .5 / n;
  const geometry = new T.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed(), p = geometry.attributes.position.array, normal = geometry.attributes.normal.array;
  const box = [width / 2 - r, height / 2 - r, depth / 2 - r];
  for (let i = 0; i < p.length; i += 3) {
    const sign = [Math.sign(p[i]), Math.sign(p[i + 1]), Math.sign(p[i + 2])];
    const d = [p[i] - sign[0] * half, p[i + 1] - sign[1] * half, p[i + 2] - sign[2] * half], length = Math.hypot(...d) || 1;
    for (let k = 0; k < 3; k++) { normal[i + k] = d[k] / length; p[i + k] = box[k] * sign[k] + normal[i + k] * r; }
  }
  return geometry;
}

// A tapered rounded limb between two points: radius `r1` at `a`, `r2` at `b`.
export function limb(a, b, r1, r2 = r1, radial = 10) {
  const start = tmpA.set(...a), end = tmpB.set(...b), delta = end.clone().sub(start), length = delta.length() || 1e-6;
  const geometry = new T.CylinderGeometry(r2, r1, length, radial, 1);
  geometry.applyMatrix4(new T.Matrix4().compose(start.clone().add(end).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(up, delta.normalize()), new T.Vector3(1, 1, 1)));
  return geometry;
}

// A solid ellipsoid at `center` with the three radii `r`.
export function ball(center, r, detail = [12, 8]) {
  const g = new T.SphereGeometry(1, detail[0], detail[1]);
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...center), new T.Quaternion(), new T.Vector3(...r)));
  return g;
}

// Closed anatomical volume. Each ring is [height, half-width, half-depth, depth-offset].
// Unlike a stretched sphere, the cross-section follows the chest, waist or helmet independently.
export function loft(rings, radial = 20) {
  const vertices = [], uv = [], indices = [];
  for (let row = 0; row < rings.length; row++) {
    const [y, rx, rz, z = 0] = rings[row];
    for (let i = 0; i <= radial; i++) {
      const a = i / radial * Math.PI * 2;
      vertices.push(Math.sin(a) * rx, y, z - Math.cos(a) * rz);
      uv.push(i / radial, row / (rings.length - 1));
      if (row && i < radial) {
        const b = row * (radial + 1) + i, a0 = b - radial - 1;
        indices.push(a0, b, a0 + 1, a0 + 1, b, b + 1);
      }
    }
  }
  // Seal the two ends even when the last section has a non-zero radius.
  for (const [row, reverse] of [[0, false], [rings.length - 1, true]]) {
    const center = vertices.length / 3, [y, , , z = 0] = rings[row];
    vertices.push(0, y, z); uv.push(.5, .5);
    for (let i = 0; i < radial; i++) {
      const a = row * (radial + 1) + i;
      indices.push(center, reverse ? a + 1 : a, reverse ? a : a + 1);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals();
  // Copy the seam normals so the joined sides of each ring shade continuously.
  const n = g.attributes.normal;
  for (let row = 0; row < rings.length; row++) {
    const a = row * (radial + 1), b = a + radial;
    const average = new T.Vector3().fromBufferAttribute(n, a).add(new T.Vector3().fromBufferAttribute(n, b)).normalize();
    n.setXYZ(a, average.x, average.y, average.z); n.setXYZ(b, average.x, average.y, average.z);
  }
  return g;
}

// Side profile (z forward negative, y up) extruded across the width and softly bevelled: the quickest way to a
// believable weapon silhouette. Points are [z, y] pairs, in order around the outline.
export function profile(points, width, bevel = .004) {
  const shape = new T.Shape(); points.forEach(([z, y], i) => i ? shape.lineTo(z, y) : shape.moveTo(z, y)); shape.closePath();
  const depth = Math.max(.001, width - bevel * 2);
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  return g;
}

// Convex hard-surface armour panel, drawn in the frontal (x/y) plane rather than as a breast-shaped sphere.
export function armorPanel(points, depth = .028, bulge = .015) {
  const shape = new T.Shape();
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const g = new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:2,curveSegments:4});
  g.translate(0,0,-depth/2);
  const p=g.attributes.position,n=g.attributes.normal,rx=Math.max(...points.map(p=>Math.abs(p[0]))),ry=Math.max(...points.map(p=>Math.abs(p[1])));
  for(let i=0;i<p.count;i++) {
    const convex=Math.max(0,1-(p.getX(i)/rx)**2)*Math.max(0,1-(p.getY(i)/ry)**2);
    p.setZ(i,p.getZ(i)-bulge*convex);
    if(Math.abs(n.getZ(i))>.9) {
      const direction=Math.sign(n.getZ(i)),x=p.getX(i),y=p.getY(i);
      const dx=2*bulge*x/(rx*rx)*Math.max(0,1-(y/ry)**2),dy=2*bulge*y/(ry*ry)*Math.max(0,1-(x/rx)**2);
      const normal=new T.Vector3(-direction*dx,-direction*dy,direction).normalize();
      n.setXYZ(i,normal.x,normal.y,normal.z);
    }
  }
  return g;
}

// Round profile revolved around the z axis (barrels, emitters, rings): points are [radius, z].
export function turned(points, radial = 16) {
  const g = new T.LatheGeometry(points.map(([r, z]) => new T.Vector2(r, z)), radial);
  g.rotateX(Math.PI / 2);
  return g;
}

export const matrix = (position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) =>
  new T.Matrix4().compose(new T.Vector3(...position), new T.Quaternion().setFromEuler(new T.Euler(...rotation)), new T.Vector3(...scale));

// Frame at `position` whose +z axis follows `direction` (for long pieces laid between two points).
export function along(position, direction, upHint = [0, 1, 0], scale = [1, 1, 1]) {
  const z = new T.Vector3(...direction).normalize(), hint = new T.Vector3(...upHint);
  if (Math.abs(z.dot(hint.clone().normalize())) > .98) hint.set(1, 0, 0);
  const x = hint.cross(z).normalize(), y = z.clone().cross(x), m = new T.Matrix4().makeBasis(x, y, z);
  m.setPosition(...position); return m.multiply(new T.Matrix4().makeScale(...scale));
}

export function bake(geometry, m) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (m) g.applyMatrix4(m);
  return g;
}

// Joins many baked geometries into one. Missing uv sets are filled with zeros.
export function merge(list) {
  const parts = list.map(g => g.index ? g.toNonIndexed() : g);
  let count = 0; for (const g of parts) count += g.attributes.position.count;
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let at = 0;
  for (const g of parts) {
    position.set(g.attributes.position.array, at * 3); normal.set(g.attributes.normal.array, at * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2);
    at += g.attributes.position.count;
  }
  const merged = new T.BufferGeometry();
  merged.setAttribute('position', new T.BufferAttribute(position, 3)); merged.setAttribute('normal', new T.BufferAttribute(normal, 3)); merged.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return merged;
}

const unitSphere = new T.SphereGeometry(1, 18, 12), unitDome = new T.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);

// Collects pieces and emits one mesh per material (and shadow flag): detailed models at the draw-call cost of a few
// meshes. Pieces may belong to an armour level; `setLevel` re-merges only what that level shows.
export class Assembly {
  constructor() { this.items = []; this.meshes = []; this.parent = null; this.level = 0; this.extra = {}; }
  add(geometry, material, m = null, shadow = true, level = 1, maxLevel = 10) {
    this.items.push({ geometry: bake(geometry, m), material, shadow, level, maxLevel }); return this;
  }
  box(material, size, position = [0, 0, 0], rotation = [0, 0, 0], radius = .006, shadow = true, level = 1, maxLevel = 10) {
    return this.add(bevelBox(size[0], size[1], size[2], radius, radius >= .03 ? 3 : radius >= .006 ? 2 : 1), material, matrix(position, rotation), shadow, level, maxLevel);
  }
  limb(material, a, b, r1, r2 = r1, shadow = true, level = 1, maxLevel = 10) { return this.add(limb(a, b, r1, r2), material, null, shadow, level, maxLevel); }
  ball(material, center, r, shadow = true, level = 1, maxLevel = 10) { return this.add(ball(center, r), material, null, shadow, level, maxLevel); }
  // Smooth armour shells: a scaled and turned sphere, or its upper half.
  ellipsoid(material, center, radii, rotation = [0, 0, 0], shadow = true, level = 1, maxLevel = 10) {
    return this.add(unitSphere, material, matrix(center, rotation, radii), shadow, level, maxLevel);
  }
  dome(material, center, radii, rotation = [0, 0, 0], shadow = true, level = 1, maxLevel = 10) {
    return this.add(unitDome, material, matrix(center, rotation, radii), shadow, level, maxLevel);
  }
  get count() { return this.items.filter(i => i.level <= this.level && i.maxLevel >= this.level).length; }
  mount(parent, extra = {}) { this.parent = parent; this.extra = extra; this.setLevel(10, true); return this; }
  setLevel(level, force = false) {
    level = Math.max(1, Math.min(10, Math.floor(Number(level) || 1)));
    if (!force && level === this.level) return this;
    this.level = level;
    for (const mesh of this.meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    this.meshes = [];
    const groups = new Map();
    for (const item of this.items) {
      if (item.level > level || item.maxLevel < level) continue;
      const key = `${item.material.uuid}|${item.shadow}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item);
    }
    for (const items of groups.values()) {
      const mesh = new T.Mesh(merge(items.map(i => i.geometry)), items[0].material);
      mesh.castShadow = items[0].shadow && !items[0].material.isMeshBasicMaterial; mesh.receiveShadow = items[0].shadow; Object.assign(mesh, this.extra);
      this.parent.add(mesh); this.meshes.push(mesh);
    }
    return this;
  }
  // Single-use build for models that never change level.
  build(parent, extra = {}) { this.mount(parent, extra); return this.meshes; }
}
