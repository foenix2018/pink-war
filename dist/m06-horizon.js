// CHAPITRE 06 — what lies beyond the foundry fence: relief, ridges, forest, a working industrial skyline and a late-afternoon
// sky. The play area is flat inside ±112 m (the asphalt plane of m06-art.js); beyond it the ground rises into a quarry rim,
// slag heaps and wooded hills, with three layers of ridges lost in haze, cooling towers and chimneys breathing smoke, a
// refinery with a flare, a pylon line, a freight train on its embankment, and a low sun with clouds. All of it is static
// geometry or a few instanced meshes animated on the CPU (smoke, flare, train, aviation lights): the cost is a handful of
// draw calls, none of it casts shadows, and `low` thins the forest, the smoke and the terrain grid.
const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Value noise on an integer lattice (deterministic), summed over octaves.
function makeNoise(seed) {
  const r = seeded(seed), table = Float32Array.from({ length: 1024 }, () => r());
  const at = (i, j) => table[((i * 73856093) ^ (j * 19349663)) & 1023];
  const n = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return at(i, j) * (1 - u) * (1 - v) + at(i + 1, j) * u * (1 - v) + at(i, j + 1) * (1 - u) * v + at(i + 1, j + 1) * u * v; };
  return (x, z, oct = 4) => { let s = 0, a = .5, f = 1; for (let k = 0; k < oct; k++) { s += a * n(x * f, z * f); a *= .5; f *= 2.03; } return s; };
}
export const PLAY_HALF = 112;                       // flat ground, metres from the centre
const HEAPS = Object.freeze([[-175, 95, 34, 20], [190, -120, 40, 24], [-150, -200, 30, 18], [210, 150, 26, 16], [20, -230, 36, 20]]); // x, z, radius, height

export function createFoundryHorizon(T, { scene, low = false, fogColor = 0x8a5d45, sun = [-70, 45, 40], textureUrl = './assets/cc0/gravel_embedded_concrete_diff_512.jpg' } = {}) {
  const group = new T.Group(); group.name = 'M06 / horizon'; scene.add(group);
  const noise = makeNoise(606), rng = seeded(61), disposables = [], animated = [];
  const own = o => { disposables.push(o); return o; };
  const fog = new T.Color(fogColor);

  // ---------- Terrain: flat play area, quarry rim, slag heaps, wooded hills ----------
  function height(x, z) {
    const d = Math.max(Math.abs(x), Math.abs(z)), k = smooth(PLAY_HALF, PLAY_HALF + 70, d);
    if (k <= 0) return -.2;
    const far = smooth(150, 700, Math.hypot(x, z)), n = noise(x * .006 + 11, z * .006 + 7, 5), m = noise(x * .02, z * .02, 3);
    // Rim of the quarry the foundry sits in (a rough berm at 125-145 m), then rolling hills that grow with distance.
    const rim = Math.exp(-(((d - 136) / 16) ** 2)) * (4 + 5 * m);
    let h = -.2 + rim + k * (3 + 20 * n) + far * (95 * n * n + 30 * m) * (.35 + .65 * noise(x * .002, z * .002, 2) * 1.6);
    // The south edge (rail spur) stays low, with a gentle embankment; a river-like cut would go here later.
    if (z > 0) h *= 1 - .55 * smooth(0, 160, z) * smooth(260, 120, Math.abs(x));
    for (const [hx, hz, r, hh] of HEAPS) { const dd = Math.hypot(x - hx, z - hz) / r; if (dd < 1.8) h += hh * Math.exp(-dd * dd * 1.9) * (1 - .35 * Math.exp(-(((dd - .35) / .25) ** 2))); }
    return h;
  }
  const SEG = low ? 120 : 220, SIZE = 1500, tg = own(new T.PlaneGeometry(SIZE, SIZE, SEG, SEG)); tg.rotateX(-Math.PI / 2);
  {
    const p = tg.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color(), soil = new T.Color(0x3b2d26), rust = new T.Color(0x6f4128), grass = new T.Color(0x39402a), rock = new T.Color(0x6a5f58), soot = new T.Color(0x24201e);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = height(x, z); p.setY(i, h);
      const n = noise(x * .03, z * .03, 3), m = noise(x * .004 + 40, z * .004, 3), d = Math.max(Math.abs(x), Math.abs(z));
      c.copy(soil).lerp(rust, smooth(.4, .8, n) * .5).lerp(grass, smooth(.42, .62, m) * smooth(140, 260, d) * (1 - smooth(55, 95, h)));
      c.lerp(rock, smooth(40, 90, h) * .8).lerp(soot, (1 - smooth(112, 190, d)) * .75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    tg.setAttribute('color', new T.BufferAttribute(col, 3)); tg.computeVertexNormals();
    const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 14; uv[i * 2 + 1] = p.getZ(i) / 14; } tg.setAttribute('uv', new T.BufferAttribute(uv, 2));
  }
  const map = new T.TextureLoader().load(textureUrl); map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = low ? 2 : 6; own(map);
  const terrain = new T.Mesh(tg, own(new T.MeshStandardMaterial({ map, vertexColors: true, roughness: .96, metalness: 0 }))); terrain.name = 'terrain'; terrain.receiveShadow = false; group.add(terrain);

  // ---------- Three layers of ridges lost in the haze (not fogged: they carry their own haze) ----------
  function ridge(radius, top, haze, seed, base = -40) {
    const N = 360, pos = [], col = [], idx = [], r = makeNoise(seed), ct = new T.Color(), cb = new T.Color(fogColor);
    ct.set(haze);
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, h = top * (.25 + .75 * Math.pow(r(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2 + 5, 4), 1.4) * 1.8);
      for (const [y, t] of [[base, 0], [h, 1]]) { pos.push(Math.cos(a) * radius, y, Math.sin(a) * radius); const cc = cb.clone().lerp(ct, t); col.push(cc.r, cc.g, cc.b); }
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = own(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const m = new T.Mesh(g, own(new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, fog: false, depthWrite: true }))); m.renderOrder = -4; group.add(m);
  }
  ridge(1050, 150, 0x5a3e44, 3); ridge(1500, 230, 0x6d4a4c, 8); ridge(2000, 300, 0x7c5852, 13);

  // ---------- Industrial skyline ----------
  const std = (color, roughness = .7, metalness = .3, extra = {}) => own(new T.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  const basic = (color, extra = {}) => own(new T.MeshBasicMaterial({ color, toneMapped: false, ...extra }));
  const concrete = std(0x8b8178, .92, .05), dark = std(0x2b2724, .8, .4), steel = std(0x6b6e72, .5, .7), brick = std(0x6e3f30, .9, .05), white = std(0xcfc8bc, .8, .05), red = std(0xb23a2e, .7, .1);
  const put = (mesh, x, z, y = null) => { mesh.position.set(x, y ?? height(x, z), z); group.add(mesh); return mesh; };
  const plumeSources = [];
  // Natural-draught cooling towers: hyperbolic shell, rim, steam.
  const towerShape = (R, H) => { const pts = []; for (let k = 0; k <= 18; k++) { const t = k / 18, y = t * H, r = R * Math.sqrt(1 + ((y - H * .7) / (H * .55)) ** 2) * .74; pts.push(new T.Vector2(r, y)); } return own(new T.LatheGeometry(pts, low ? 28 : 56)); };
  for (const [x, z, R, H] of [[-300, -330, 34, 92], [-360, -250, 30, 84], [330, -360, 36, 96], [400, -270, 30, 82]]) {
    put(new T.Mesh(towerShape(R, H), concrete), x, z); plumeSources.push([x, height(x, z) + H, z, R * .7, 1]);
  }
  // Chimneys with red/white bands and aviation lights.
  const lights = [];
  for (const [x, z, r, H] of [[-420, 120, 5, 118], [-390, 215, 4, 96], [260, 300, 5.5, 126], [-110, -420, 4.5, 110], [120, -440, 4, 92], [430, 40, 5, 108], [-250, 330, 3.6, 84]]) {
    const g = new T.Group(); const bands = 8;
    for (let b = 0; b < bands; b++) { const m = new T.Mesh(own(new T.CylinderGeometry(r * (1 - (b + 1) / bands * .34), r * (1 - b / bands * .34), H / bands + .05, 18)), b % 2 ? red : white); m.position.y = (b + .5) * H / bands; g.add(m); }
    const lamp = new T.Mesh(own(new T.SphereGeometry(1.1, 8, 6)), basic(0xff2a20)); lamp.position.y = H + 1.2; g.add(lamp); lights.push(lamp);
    put(g, x, z); plumeSources.push([x, height(x, z) + H, z, r * .8, 2]);
  }
  // Refinery cluster: tanks, pipe racks, columns, a flare with a flame.
  function refinery(cx, cz, ang) {
    const g = new T.Group(); g.position.set(cx, height(cx, cz), cz); g.rotation.y = ang; group.add(g);
    const r = seeded(Math.abs(cx * 7 + cz) | 0);
    for (let i = 0; i < 9; i++) { const R = 9 + r() * 9, H = 9 + r() * 10, t = new T.Mesh(own(new T.CylinderGeometry(R, R, H, 24)), i % 3 ? concrete : steel); t.position.set((i % 3) * 44 - 44, H / 2, Math.floor(i / 3) * 44); g.add(t);
      const roof = new T.Mesh(own(new T.CylinderGeometry(R * 1.02, R, 1.2, 24)), dark); roof.position.set(t.position.x, H + .6, t.position.z); g.add(roof); }
    for (let i = 0; i < 6; i++) { const H = 24 + r() * 26, c = new T.Mesh(own(new T.CylinderGeometry(3.4, 3.4, H, 14)), steel); c.position.set(-80 + i * 14, H / 2, -50); g.add(c); const cap = new T.Mesh(own(new T.SphereGeometry(3.4, 14, 8, 0, TAU, 0, Math.PI / 2)), steel); cap.position.set(c.position.x, H, -50); g.add(cap); }
    const rack = new T.Mesh(own(new T.BoxGeometry(150, 3, 4)), dark); rack.position.set(10, 12, -30); g.add(rack);
    for (let i = 0; i < 12; i++) { const s = new T.Mesh(own(new T.BoxGeometry(1.2, 12, 1.2)), dark); s.position.set(-60 + i * 14, 6, -30); g.add(s); }
    // Flare stack.
    const stack = new T.Mesh(own(new T.CylinderGeometry(1.1, 1.8, 70, 10)), steel); stack.position.set(90, 35, 10); g.add(stack);
    const flame = new T.Mesh(own(new T.ConeGeometry(3, 12, 10)), basic(0xffa23a, { transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false })); flame.position.set(90, 76, 10); g.add(flame);
    const halo = new T.Sprite(own(new T.SpriteMaterial({ map: glowTexture(), color: 0xffa040, blending: T.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: .8 }))); halo.scale.set(70, 70, 1); halo.position.copy(flame.position); g.add(halo);
    animated.push(t => { const f = .85 + .15 * Math.sin(t * 13 + cx) + .1 * Math.sin(t * 29); flame.scale.set(1, f * 1.1, 1); halo.material.opacity = .55 + .25 * f; });
    // Lit windows on the process buildings: a few instanced emissive strips.
    const win = new T.InstancedMesh(own(new T.BoxGeometry(5, 1.1, .3)), basic(0xffc46a), 90); const m4 = new T.Matrix4();
    for (let i = 0; i < 90; i++) { m4.makeTranslation(-70 + (i % 18) * 8, 5 + Math.floor(i / 18) * 4, 18.2 + (r() < .15 ? -40 : 0)); win.setMatrixAt(i, m4); } g.add(win);
    const hall = new T.Mesh(own(new T.BoxGeometry(160, 22, 36)), brick); hall.position.set(-10, 11, 0); g.add(hall); hall.position.z = 0; win.position.z = 0;
    plumeSources.push([cx + Math.cos(ang) * 40, g.position.y + 30, cz - Math.sin(ang) * 40, 6, 3]);
  }
  const glowCache = {}; function glowTexture() { if (glowCache.t) return glowCache.t; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); own(t); glowCache.t = t; return t; }
  refinery(-380, -60, .35); refinery(380, 170, -.5);

  // ---------- Pylon line with sagging wires ----------
  {
    const pts = [], seg = [], line = [[-480, 80], [-300, 180], [-110, 250], [90, 300], [300, 260], [480, 170]];
    const pylon = (x, z) => { const y0 = height(x, z), h = 46, w = 4.2;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) seg.push(x + sx * w, y0, z + sz * w, x + sx * 1.1, y0 + h, z + sz * 1.1);
      for (let y = 6; y < h; y += 7) { const k = w - (w - 1.1) * y / h; for (const s of [-1, 1]) seg.push(x - k, y0 + y, z + s * k, x + k, y0 + y, z + s * k, x + s * k, y0 + y, z - k, x + s * k, y0 + y, z + k); }
      for (const y of [h - 10, h - 3]) seg.push(x - 12, y0 + y, z, x + 12, y0 + y, z); };
    for (const [x, z] of line) pylon(x, z);
    for (let k = 0; k + 1 < line.length; k++) for (const [y, offs] of [[36, [-12, -6, 6, 12]], [43, [-12, 12]]]) for (const s of offs) {
      const [ax, az] = line[k], [bx, bz] = line[k + 1]; let prev = null;
      for (let i = 0; i <= 10; i++) { const t = i / 10, p = [ax + s + (bx - ax) * t, height(ax + (bx - ax) * t, az + (bz - az) * t) + y - 7 * Math.sin(Math.PI * t), az + (bz - az) * t]; if (prev) seg.push(...prev, ...p); prev = p; } }
    const g = own(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(seg, 3)); void pts;
    group.add(new T.LineSegments(g, own(new T.LineBasicMaterial({ color: 0x1d1a1c, fog: true }))));
  }

  // ---------- Freight train on its embankment (south, beyond the rail spur) ----------
  const train = new T.Group(); group.add(train);
  {
    const Z = 150, len = 1000, bank = new T.Mesh(own(new T.BoxGeometry(len, 4, 14)), std(0x4a423c, .95, 0)); bank.position.set(0, height(0, Z) + 1.6, Z); group.add(bank);
    for (const dz of [-1.5, 1.5]) { const rail = new T.Mesh(own(new T.BoxGeometry(len, .3, .3)), steel); rail.position.set(0, height(0, Z) + 3.8, Z + dz); group.add(rail); }
    const wag = low ? 14 : 24, locoMat = std(0x7a2a24, .6, .3), cols = [0x5c4a3c, 0x3d4a52, 0x6f5236, 0x4a3a34], box = own(new T.BoxGeometry(13, 4, 3));
    const loco = new T.Mesh(own(new T.BoxGeometry(18, 4.6, 3.2)), locoMat); loco.position.set(0, 6.4, 0); train.add(loco);
    const cab = new T.Mesh(own(new T.BoxGeometry(5, 1.6, 3)), dark); cab.position.set(6, 9.5, 0); train.add(cab);
    const head = new T.Mesh(own(new T.SphereGeometry(.5, 8, 6)), basic(0xfff1c8)); head.position.set(9.3, 6.8, 0); train.add(head);
    const cars = new T.InstancedMesh(box, own(new T.MeshStandardMaterial({ roughness: .85, metalness: .2 })), wag), m4 = new T.Matrix4(), c = new T.Color();
    for (let i = 0; i < wag; i++) { m4.makeTranslation(-(i + 1) * 14.5 - 2, 6.2, 0); cars.setMatrixAt(i, m4); cars.setColorAt(i, c.set(cols[i % 4])); } train.add(cars);
    train.position.set(-len / 2, height(0, Z), Z);
    animated.push(t => { train.position.x = ((t * 11 + 300) % (len + 420)) - len / 2 - 210; });
  }

  // ---------- Forest belt (instanced conifers) ----------
  {
    const count = low ? 380 : 1100, trunk = own(new T.CylinderGeometry(.35, .5, 2.4, 5)), cone = own(new T.ConeGeometry(2.8, 8, 7)), cone2 = own(new T.ConeGeometry(2.1, 6, 7));
    const mat = own(new T.MeshStandardMaterial({ roughness: .95, metalness: 0 })), a = new T.InstancedMesh(cone, mat, count), b = new T.InstancedMesh(cone2, mat, count), t = new T.InstancedMesh(trunk, std(0x2a1d16, 1, 0), count);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color(); let n = 0, guard = 0;
    while (n < count && guard++ < count * 40) {
      const ang = rng() * TAU, rad = 170 + rng() * 460, x = Math.cos(ang) * rad, z = Math.sin(ang) * rad, h = height(x, z);
      if (h > 62 || noise(x * .008 + 90, z * .008, 3) < .46 || (z > 120 && Math.abs(z - 150) < 14)) continue;
      const k = .8 + rng() * 1.1; s.set(k, k * (.9 + rng() * .4), k);
      t.setMatrixAt(n, m4.compose(p.set(x, h + 1.2 * k, z), q.identity(), s)); a.setMatrixAt(n, m4.compose(p.set(x, h + 5.4 * k, z), q.identity(), s)); b.setMatrixAt(n, m4.compose(p.set(x, h + 9.2 * k, z), q.identity(), s));
      c.setHSL(.2 + rng() * .08, .16 + rng() * .1, .05 + rng() * .035); a.setColorAt(n, c); b.setColorAt(n, c); n++;
    }
    for (const mesh of [a, b, t]) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; group.add(mesh); }
    t.setColorAt?.(0, c);
  }

  // ---------- Slag heaps glowing in their vents ----------
  {
    const vents = new T.InstancedMesh(own(new T.SphereGeometry(1, 6, 4)), basic(0xff7a24), HEAPS.length * 7), m4 = new T.Matrix4(); let i = 0;
    for (const [x, z, r, h] of HEAPS) for (let k = 0; k < 7; k++) { const a = rng() * TAU, d = rng() * r * .55, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; m4.compose(new T.Vector3(px, height(px, pz) + .4, pz), new T.Quaternion(), new T.Vector3(1.4 + rng() * 2, .5, 1.4 + rng() * 2)); vents.setMatrixAt(i++, m4); void h; }
    group.add(vents);
  }

  // ---------- Smoke plumes: drifting translucent puffs rising from the stacks and towers ----------
  {
    const per = low ? 12 : 24, total = plumeSources.length * per, puff = new T.InstancedMesh(own(new T.IcosahedronGeometry(1, 1)), own(new T.MeshBasicMaterial({ color: 0x4b3a3a, transparent: true, opacity: .3, depthWrite: false, fog: true })), total);
    puff.frustumCulled = false; group.add(puff);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), wind = new T.Vector3(.6, 0, -.25);
    animated.push(t => { let i = 0; for (const [x, y, z, r, kind] of plumeSources) for (let k = 0; k < per; k++) {
      const u = ((t * (kind === 1 ? .018 : .024) + k / per + x * .001) % 1), rise = u * (kind === 1 ? 140 : 110), sz = r * (1.1 + u * (kind === 1 ? 4.6 : 5));
      p.set(x + wind.x * rise * 1.1 + Math.sin(k * 3.1 + x) * r * .3, y + rise, z + wind.z * rise * 1.1); s.set(sz, sz * .8, sz); puff.setMatrixAt(i++, m4.compose(p, q, s)); }
      puff.instanceMatrix.needsUpdate = true; });
  }

  // ---------- Sun, glow and cloud bands ----------
  {
    const dir = new T.Vector3(...sun).normalize(), at = dir.clone().multiplyScalar(1800);
    const glow = new T.Sprite(own(new T.SpriteMaterial({ map: glowTexture(), color: 0xffa860, blending: T.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: .9 }))); glow.scale.set(1500, 1500, 1); glow.position.copy(at); glow.renderOrder = -6; group.add(glow);
    const disc = new T.Mesh(own(new T.CircleGeometry(70, 32)), basic(0xfff0cf, { fog: false })); disc.position.copy(at.clone().multiplyScalar(.99)); disc.lookAt(0, 0, 0); disc.renderOrder = -5; group.add(disc);
    // Clouds: fbm noise shaped into flat-bottomed cumulus banks, lit warm on top (low sun), shadowed underneath.
    const cloudTex = v => { const W = 512, H = 160, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), nz = makeNoise(900 + v * 37);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, w = y / H, edge = Math.sin(Math.PI * u) ** .6, base = smooth(.92, .62, w), top = smooth(.02, .4, w + (nz(u * 5, 3.1, 3) - .5) * .5);
        const n = nz(u * 9 + v * 3, w * 3.2, 5), dens = smooth(.42, .62, n * edge * base * top * 1.35);
        const lit = smooth(.85, .15, w) * .7 + (n - .4) * .6, i = (y * W + x) * 4;
        img.data[i] = 120 + 135 * lit; img.data[i + 1] = 82 + 120 * lit; img.data[i + 2] = 92 + 90 * lit; img.data[i + 3] = 255 * dens * .92;
      }
      g.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; own(t); return t; };
    const clouds = [0, 1, 2].map(cloudTex);
    const cloud = clouds[0];
    const tints = [0xffd2b0, 0xffc0a0, 0xe8b0b0, 0xd8b8c0];
    for (let i = 0; i < (low ? 9 : 16); i++) {
      const a = rng() * TAU, el = .05 + rng() * .22, rad = 1700, m = new T.Sprite(own(new T.SpriteMaterial({ map: clouds[i % 3], color: tints[i % 4], depthWrite: false, fog: false, transparent: true, opacity: .55 + rng() * .3 })));
      m.position.set(Math.cos(a) * rad * Math.cos(el), rad * Math.sin(el), Math.sin(a) * rad * Math.cos(el)); m.scale.set(1000 + rng() * 900, 260 + rng() * 160, 1); m.renderOrder = -7; group.add(m);
    }
  }

  return {
    group, height, terrain,
    update(t) { for (const f of animated) f(t); const on = Math.sin(t * 2.2) > .2; for (const l of lights) l.visible = on; },
    dispose() { scene.remove(group); for (const o of disposables) o.dispose?.(); }
  };
}
