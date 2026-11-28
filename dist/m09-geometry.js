// Keep each material's decoded attributes shared. Per-sector index buffers
// give the renderer tight frustum bounds without duplicating the vertex data.
export function gardenGeometrySectors(T, geometry, cell = 105) {
  const index = geometry.index.array;
  // Smaller batches are cheaper to render together than to submit by sector.
  if (index.length < 102000) return [geometry];
  const position = geometry.attributes.position.array;
  const keys = new Int32Array(index.length / 3), sectors = new Map();
  for (let i = 0, face = 0; i < index.length; i += 3, face++) {
    const a = index[i] * 3, b = index[i + 1] * 3, c = index[i + 2] * 3;
    const x = Math.floor((position[a] + position[b] + position[c]) / (3 * cell) + .5);
    const z = Math.floor((position[a + 2] + position[b + 2] + position[c + 2]) / (3 * cell) + .5);
    const key = x * 2048 + z;
    keys[face] = key;
    let sector = sectors.get(key);
    if (!sector) {
      sector = {count: 0, cursor: 0, box: new T.Box3()};
      sectors.set(key, sector);
    }
    sector.count += 3;
  }
  if (sectors.size === 1) return [geometry];
  for (const sector of sectors.values()) sector.index = new index.constructor(sector.count);
  const point = new T.Vector3();
  for (let i = 0, face = 0; i < index.length; i += 3, face++) {
    const s = sectors.get(keys[face]);
    for (let j = 0; j < 3; j++) {
      const vertex = index[i + j];
      s.index[s.cursor++] = vertex;
      s.box.expandByPoint(point.fromArray(position, vertex * 3));
    }
  }
  const result = [];
  for (const {index: indices, box} of sectors.values()) {
    const g = new T.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) g.setAttribute(name, attribute);
    g.setIndex(new T.BufferAttribute(indices, 1));
    // This covers the displacement of the WebGPU leaf shader too.
    g.boundingBox = box.expandByScalar(.16);
    g.boundingSphere = box.getBoundingSphere(new T.Sphere());
    g.userData.webgpuShape = geometry.userData.webgpuShape;
    result.push(g);
  }
  geometry.setIndex(null);
  return result;
}
