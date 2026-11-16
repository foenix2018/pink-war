// MISSION 04 — the station's centrepieces modelled in Blender (tools/blender/m04_assets.py): the reactor, the oil
// transformers and the drone racks. Each model comes as a compact « PWM1 » file (int16 positions, int8 normals,
// lightmap UV, indices) and a baked ambient-occlusion map. Surfaces are the scanned materials of m04-station.js,
// named the same in Blender; the texture UV is the same metric box projection Blender used, rebuilt here from
// position and normal. Several copies of a model share their geometry as instances (one draw per material).
const ALIAS = { glowMagenta: 'ledMagenta' };
export const M04_MODEL_FILES = Object.freeze({ reactor: 'reactor', transformer: 'transformer', rack: 'drone_rack' });

export function parsePWM(T, buffer) {
  const view = new DataView(buffer), magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'PWM1') throw Error('PWM1 attendu');
  const n = view.getUint32(4, true), meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, n))), base = 8 + n;
  const lo = meta.min, span = meta.max.map((v, i) => Math.max(v - lo[i], 1e-6));
  const primitives = meta.primitives.map(p => {
    const count = p.vertices, q = new Int16Array(buffer, base + p.position, count * 3), nq = new Int8Array(buffer, base + p.normal, count * 4), uq = new Uint16Array(buffer, base + p.uv1, count * 2);
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv1 = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) pos[i * 3 + k] = lo[k] + (q[i * 3 + k] + 32767) / 65534 * span[k];
      const x = nq[i * 4] / 127, y = nq[i * 4 + 1] / 127, z = nq[i * 4 + 2] / 127, l = Math.hypot(x, y, z) || 1; nor[i * 3] = x / l; nor[i * 3 + 1] = y / l; nor[i * 3 + 2] = z / l;
      uv1[i * 2] = uq[i * 2] / 65535; uv1[i * 2 + 1] = uq[i * 2 + 1] / 65535;
    }
    const index = p.index32 ? new Uint32Array(buffer, base + p.index, p.indices) : new Uint16Array(buffer, base + p.index, p.indices);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv1', new T.BufferAttribute(uv1, 2));
    g.setIndex(new T.BufferAttribute(p.index32 ? new Uint32Array(index) : new Uint16Array(index), 1)); g.computeBoundingSphere(); g.userData.webgpuShape = 'blender';
    return { material: p.material, geometry: g, triangles: p.indices / 3 };
  });
  return { primitives, min: meta.min, max: meta.max, triangles: primitives.reduce((s, p) => s + p.triangles, 0) };
}

// Metric box projection (the one baked in Blender), scaled by the surface's tile size.
export function boxUV(T, geometry, tile = 2) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
}

/**
 * loadStationModels(T, { M, base }) → Promise<{ place(name, placements, parent), stats }>
 * placements: [{ x, z, yaw }] — the model's origin is on the floor at the centre of its collision box.
 */
export async function loadStationModels(T, { M, base = './assets/m04/models/', low = false, fetchImpl = globalThis.fetch } = {}) {
  const loader = new T.TextureLoader(), models = new Map(), stats = { models: 0, triangles: 0, instances: 0, draws: 0 };
  const aoTexture = name => new Promise((resolve, reject) => loader.load(base + name + '_ao.jpg', t => { t.channel = 1; t.flipY = false; t.colorSpace = T.NoColorSpace; t.anisotropy = low ? 2 : 4; resolve(t); }, undefined, reject));
  await Promise.all(Object.entries(M04_MODEL_FILES).map(async ([key, file]) => {
    const res = await fetchImpl(base + file + '.pwm'); if (!res.ok) throw Error(file + ' ' + res.status);
    const model = parsePWM(T, await res.arrayBuffer()), ao = await aoTexture(file);
    for (const p of model.primitives) {
      const src = M[ALIAS[p.material] || p.material] || M.steel; boxUV(T, p.geometry, src.userData?.tile || 2);
      p.mat = src.clone(); p.mat.name = 'M04 / Blender / ' + file + ' / ' + p.material;
      if (!p.mat.isMeshBasicMaterial) { p.mat.aoMap = ao; p.mat.aoMapIntensity = 1; }
    }
    models.set(key, model); stats.models++;
  }));
  return {
    stats,
    has: key => models.has(key),
    place(key, placements, parent) {
      const model = models.get(key); if (!model || !placements.length) return null;
      const group = new T.Group(); group.name = 'M04 / Blender / ' + key; parent.add(group);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1), at = new T.Vector3();
      for (const p of model.primitives) {
        const mesh = new T.InstancedMesh(p.geometry, p.mat, placements.length);
        placements.forEach((o, i) => mesh.setMatrixAt(i, m4.compose(at.set(o.x, o.y || 0, o.z), q.setFromAxisAngle(up, o.yaw || 0), one)));
        mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = p.mat.name; group.add(mesh);
        stats.draws++;
      }
      stats.instances += placements.length; stats.triangles += model.triangles * placements.length;
      return group;
    }
  };
}
