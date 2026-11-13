// MISSION 04 — the JANUS energy station modelled after real plant equipment, on the collision boxes of m04-layout.js.
//  · Photo-scanned CC0 surfaces (Poly Haven, assets/m04): worn concrete slab, precast panels, factory cladding,
//    diamond tread plate, painted plate, ISO container skin, roller shutter, weathered paint — colour, normal and
//    roughness maps with metric UVs (a 2 m panel reads as 2 m on every piece).
//  · Equipment: oil-filled power transformers (radiator banks, conservator, porcelain bushings), coolant vessels
//    (domed shell, stiffener rings, caged ladder, flanged nozzles), ISO 20' containers (corner castings, locking
//    bars), steel pipe racks (H columns, flanged pipes, cable tray), dry coolers with turning fans, 42U server rows
//    on a raised floor, pallet racks loaded with quadcopter drones, equipment cases on pallets, a prefab guard cabin,
//    the reactor (concrete shield, ribbed blue vessel, bolted flange, radial coolant loops, ring platform).
//  · Architecture: precast wall pilasters and coping, hangar portal frames and roof trusses, cable trays, and the
//    plant outside the walls (cooling tower, high-voltage pylons and lines) as silhouettes in the fog.
// Static geometry is merged per material (a handful of draw calls); only the fans and server activity LEDs move.
// No lights are added: the level's pool lights the fixtures it already knows.
const TAU = Math.PI * 2;

export function createStationKit(T, root, { low = false } = {}) {
  const group = new T.Group(); group.name = 'M04 / équipements de la station'; root.add(group);
  const loader = new T.TextureLoader(), stats = { pieces: 0, meshes: 0, drones: 0, racks: 0, fans: 0 };
  const tex = (file, srgb) => { const t = loader.load('./assets/m04/' + file, undefined, undefined, () => {}); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = low ? 2 : 8; return t; };
  const pbr = (name, { color = 0xffffff, metalness = 0, roughness = 1, tile = 2, normal = 1, diff = name } = {}) => {
    const m = new T.MeshStandardMaterial({ map: tex(diff + '_diff_1024.jpg', true), color, metalness, roughness, ...(low ? {} : { normalMap: tex(name + '_nor_1024.jpg', false), roughnessMap: tex(name + '_rough_512.jpg', false) }) });
    if (m.normalMap) m.normalScale.set(normal, normal); m.userData.tile = tile; m.name = 'M04 / ' + name; return m;
  };
  const plain = (color, roughness, metalness = 0, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const glow = color => new T.MeshBasicMaterial({ color, toneMapped: false });
  const canvasTex = (w, h, paint, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = low ? 2 : 8; return t; };
  // Server-room raised floor: 60 cm tiles, one perforated tile in four, steel trim.
  const raised = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#8d9297'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = i * w / 2, y = j * h / 2; c.fillStyle = (i + j) % 2 ? '#959a9f' : '#878c91'; c.fillRect(x + 3, y + 3, w / 2 - 6, h / 2 - 6); if (i === 1 && j === 0) { c.fillStyle = '#3a3e42'; for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) c.fillRect(x + 18 + a * 14, y + 18 + b * 14, 7, 7); } } c.strokeStyle = '#5d6166'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke(); });
  // Perforated rack door: hex holes over black powder coat.
  const perf = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#16181b'; c.fillRect(0, 0, w, h); c.fillStyle = '#050506'; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { c.beginPath(); c.arc(x * 8 + (y % 2) * 4 + 2, y * 8 + 4, 2.6, 0, TAU); c.fill(); } });
  const M = {
    slab: pbr('concrete_floor_worn_001', { color: 0xb8bcc0, roughness: .95, tile: 4 }),
    precast: pbr('concrete_wall_008', { color: 0xc4c6c8, roughness: 1, tile: 3.2 }),
    cladding: pbr('factory_wall', { color: 0x9fb0bf, roughness: .8, metalness: .45, tile: 3 }),
    tread: pbr('metal_grate_rusty', { color: 0x9da2a8, roughness: .8, metalness: .6, tile: 1.2 }),
    plate: pbr('metal_plate_02', { color: 0xc4c8cc, roughness: .9, metalness: .5, tile: 2 }),
    blue: pbr('blue_metal_plate', { color: 0xffffff, roughness: .85, metalness: .35, tile: 2.5 }),
    shutter: pbr('painted_metal_shutter', { color: 0xc8ced4, roughness: .8, metalness: .4, tile: 2 }),
    antiSlip: pbr('anti_slip_concrete', { color: 0xa9adb0, roughness: 1, tile: 2 }),
    paintGrey: pbr('rusty_metal_02', { diff: 'painted_steel', color: 0x7d8c84, roughness: .8, metalness: .35, tile: 3, normal: .6 }),
    paintWhite: pbr('rusty_metal_02', { diff: 'painted_steel', color: 0xd6dade, roughness: .75, metalness: .25, tile: 3, normal: .5 }),
    paintYellow: pbr('rusty_metal_02', { diff: 'painted_steel', color: 0xe3ae1f, roughness: .7, metalness: .25, tile: 2, normal: .5 }),
    paintOrange: pbr('rusty_metal_02', { diff: 'painted_steel', color: 0xd9671c, roughness: .7, metalness: .3, tile: 2, normal: .5 }),
    paintBlue: pbr('rusty_metal_02', { diff: 'painted_steel', color: 0x3b6a9e, roughness: .7, metalness: .3, tile: 2, normal: .5 }),
    containerBlue: pbr('container_side', { color: 0x4f7fae, roughness: .75, metalness: .3, tile: 2.6 }),
    containerRed: pbr('container_side', { color: 0xa9493a, roughness: .75, metalness: .3, tile: 2.6 }),
    raised: plain(0xffffff, .55, .15, { map: raised }),
    perf: plain(0xffffff, .5, .6, { map: perf }),
    galv: plain(0xa3a9ae, .45, .85), steel: plain(0x5c636b, .4, .8), dark: plain(0x1c2026, .55, .5), black: plain(0x0d0f12, .6, .3),
    alu: plain(0xc9ced3, .3, .9), copper: plain(0xb9703c, .32, 1), porcelain: plain(0x5a3a2c, .18, 0), rubber: plain(0x141414, .9, 0),
    wood: plain(0x9d7a4e, .85, 0), concreteDark: plain(0x6f7377, .95, 0), glass: plain(0x6c8aa6, .05, .5, { transparent: true, opacity: .35 }),
    caseGrey: plain(0x2d3136, .45, .1), label: plain(0xe9e6dc, .7, 0), warn: plain(0xf0c020, .5, 0), pipeGreen: plain(0x3e6b4c, .55, .3), pipeYellow: plain(0xc9a227, .5, .3), pipeRed: plain(0x9b2a24, .5, .3),
    ledGreen: glow(0x3dff7a), ledAmber: glow(0xffb02e), ledBlue: glow(0x4aa8ff), ledRed: glow(0xff3328), ledMagenta: glow(0xff3fb4), lamp: glow(0xfff1d8)
  };

  // ---------- Merged geometry with metric UVs ----------
  const buckets = new Map(), mtx = new T.Matrix4(), q = new T.Quaternion(), eul = new T.Euler(), pos = new T.Vector3(), scl = new T.Vector3(1, 1, 1);
  const SEG = low ? 10 : 18;
  function put(mat, geo, local, frame) {
    let g = geo.index ? geo.toNonIndexed() : geo; if (g === geo) g = geo.clone();
    g.applyMatrix4(local); if (frame) g.applyMatrix4(frame);
    if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(g); stats.pieces++; geo.dispose();
  }
  const local = (x, y, z, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(pos.set(x, y, z), q.setFromEuler(eul.set(rx, ry, rz)), scl.set(1, 1, 1));
  function boxGeo(sx, sy, sz, tile) {
    const g = new T.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
    return g;
  }
  function cylGeo(r, h, { r2 = r, seg = SEG, open = false, arc = TAU } = {}, tile) {
    const g = new T.CylinderGeometry(r2, r, h, seg, 1, open, 0, arc), uv = g.attributes.uv, c = arc * Math.max(r, r2);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c / tile, uv.getY(i) * h / tile);
    return g;
  }
  // A frame places a piece of equipment: origin, heading. Pieces are given in its local metres (y up).
  function frame(x, y, z, ry = 0) {
    const F = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1));
    const tileOf = m => m.userData.tile || 2;
    return {
      matrix: F,
      box(m, cx, cy, cz, sx, sy, sz, { rx = 0, ry = 0, rz = 0 } = {}) { put(m, boxGeo(sx, sy, sz, tileOf(m)), local(cx, cy, cz, rx, ry, rz), F); },
      // Vertical by default; axis 'x' or 'z' lays it down. (cx,cy,cz) is the centre.
      cyl(m, cx, cy, cz, r, h, { axis = 'y', r2 = r, seg = SEG, open = false, arc = TAU, ry = 0 } = {}) { put(m, cylGeo(r, h, { r2, seg, open, arc }, tileOf(m)), local(cx, cy, cz, axis === 'z' ? Math.PI / 2 : 0, ry, axis === 'x' ? Math.PI / 2 : 0), F); },
      torus(m, cx, cy, cz, r, tube, { rx = Math.PI / 2, ry = 0, rz = 0, arc = TAU, seg = SEG * 2 } = {}) { put(m, new T.TorusGeometry(r, tube, 6, seg, arc), local(cx, cy, cz, rx, ry, rz), F); },
      sphere(m, cx, cy, cz, r, { sy = 1, half = false } = {}) { const g = new T.SphereGeometry(r, SEG, Math.max(6, SEG >> 1), 0, TAU, 0, half ? Math.PI / 2 : Math.PI); g.scale(1, sy, 1); put(m, g, local(cx, cy, cz), F); },
      // A straight member between two local points (round bar or square tube).
      bar(m, a, b, r, square = false) { const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-4) return; const g = square ? boxGeo(r * 2, len, r * 2, tileOf(m)) : cylGeo(r, len, { seg: 8 }, tileOf(m)); const L = new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), new T.Vector3(1, 1, 1)); put(m, g, L, F); }
    };
  }
  const W = frame(0, 0, 0); // world frame
  // Structural H section standing on the floor (flanges along local x).
  const hColumn = (F, m, x, z, h, s = .3, ry = 0) => { const c = Math.cos(ry), sn = Math.sin(ry), off = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
    for (const k of [-1, 1]) { const [px, pz] = off(0, k * s / 2); F.box(m, px, h / 2, pz, s, h, .025, { ry }); } F.box(m, x, h / 2, z, .02, h, s, { ry }); };
  function flush() {
    for (const [mat, list] of buckets) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      for (const g of list) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2)); geo.computeBoundingSphere();
      geo.userData.webgpuShape = 'merged';
      const mesh = new T.Mesh(geo, mat); mesh.receiveShadow = true; mesh.name = 'M04 / ' + (mat.name || 'pièces'); group.add(mesh); stats.meshes++;
    }
    buckets.clear();
  }
  const animated = [];

  // ---------- Equipment ----------
  // Oil-filled power transformer on its skid: tank, radiator banks on both long sides, conservator, bushings.
  function transformer(o) {
    const F = frame(o.x, 0, o.z), w = o.hx * 2, d = o.hz * 2, tw = w * .62, td = d * .42, th = 2.25, y0 = .26;
    for (const z of [-td * .35, td * .35]) { F.box(M.steel, 0, .07, z, w - .5, .14, .2); F.box(M.steel, 0, .2, z, w - .5, .12, .08); }
    F.box(M.paintGrey, 0, y0 + th / 2, 0, tw, th, td); F.box(M.paintGrey, 0, y0 + th + .05, 0, tw + .12, .1, td + .12);
    for (const s of [-1, 1]) { // radiator banks
      const z0 = s * (td / 2 + .06), out = d / 2 - td / 2 - .2;
      for (const y of [y0 + .35, y0 + th - .3]) F.cyl(M.paintGrey, 0, y, z0 + s * .1, .07, tw * .9, { axis: 'x', seg: 10 });
      for (let k = 0; k < 13; k++) { const x = -tw * .43 + k * tw * .86 / 12; F.box(M.paintGrey, x, y0 + th / 2, z0 + s * (out / 2 + .12), .045, th - .45, out); F.box(M.paintGrey, x, y0 + .3, z0 + s * .1, .08, .1, .2); F.box(M.paintGrey, x, y0 + th - .3, z0 + s * .1, .08, .1, .2); }
    }
    // Conservator on its brackets, Buchholz pipe.
    const cy = y0 + th + .75; F.cyl(M.paintGrey, -tw * .18, cy, td * .25, .34, 2.3, { axis: 'x' }); for (const x of [-tw * .18 - .8, -tw * .18 + .8]) F.box(M.steel, x, y0 + th + .3, td * .25, .1, .5, .1);
    F.sphere(M.paintGrey, -tw * .18 - 1.15, cy, td * .25, .34, { sy: .5 }); F.sphere(M.paintGrey, -tw * .18 + 1.15, cy, td * .25, .34, { sy: .5 });
    F.bar(M.steel, [-tw * .18 + .4, cy - .3, td * .25], [.1, y0 + th + .1, td * .1], .045);
    // HV porcelain bushings (sheds) and LV bushings.
    for (const x of [-tw * .3, 0, tw * .3]) { const bz = -td * .22, b0 = y0 + th + .1; F.cyl(M.steel, x, b0 + .08, bz, .17, .16); for (let k = 0; k < 8; k++) { F.cyl(M.porcelain, x, b0 + .26 + k * .12, bz, .17, .045, { seg: 12 }); F.cyl(M.porcelain, x, b0 + .3 + k * .12, bz, .1, .08, { seg: 10 }); } F.cyl(M.copper, x, b0 + 1.27, bz, .05, .12, { seg: 8 }); F.cyl(M.alu, x, b0 + 1.36, bz, .09, .06, { seg: 10 }); }
    for (const x of [-tw * .3, -tw * .1, tw * .1, tw * .3]) { const b0 = y0 + th + .1; for (let k = 0; k < 3; k++) F.cyl(M.porcelain, x, b0 + .1 + k * .1, td * .3 - .25, .09, .05, { seg: 10 }); F.cyl(M.copper, x, b0 + .42, td * .3 - .25, .03, .1, { seg: 8 }); }
    // Cable box and conduit at the LV end, valve, rating plate, warning sign, earthing strap.
    F.box(M.paintGrey, tw / 2 + .25, y0 + th * .55, 0, .5, 1.1, td * .7); F.cyl(M.dark, tw / 2 + .3, y0 + th * .25 - .3, 0, .09, th * .5, { seg: 10 });
    F.torus(M.pipeRed, -tw / 2 - .08, y0 + .45, 0, .14, .02, { rx: 0, ry: Math.PI / 2, seg: 16 }); F.cyl(M.steel, -tw / 2 - .04, y0 + .45, 0, .04, .1, { axis: 'x', seg: 8 });
    F.box(M.label, -tw * .1, y0 + th * .6, -td / 2 - .006, .45, .3, .01); F.box(M.warn, tw * .25, y0 + th * .6, -td / 2 - .006, .34, .3, .01);
    F.bar(M.copper, [-tw / 2 + .1, y0 + .2, -td / 2 + .1], [-tw / 2 - .2, 0.02, -td / 2 - .4], .012);
  }
  // Vertical coolant vessel on a plinth.
  function vessel(o) {
    const F = frame(o.x, 0, o.z), r = o.hx - .1, h = o.height, top = h - r * .32;
    F.cyl(M.concreteDark, 0, .12, 0, r + .25, .24, { seg: SEG + 6 });
    F.cyl(M.paintWhite, 0, .24 + (top - .24) / 2, 0, r, top - .24, { seg: SEG + 10 }); F.sphere(M.paintWhite, 0, top, 0, r, { sy: .32, half: true });
    for (const y of [1.2, 2.4, 3.6].filter(y => y < top - .3)) F.cyl(M.galv, 0, y, 0, r + .035, .08, { seg: SEG + 10 });
    F.cyl(M.paintBlue, 0, top * .62, 0, r + .012, .55, { seg: SEG + 10 });
    // Caged ladder on the +x side, rail ring on the dome.
    const lx = r + .28; for (const z of [-.22, .22]) F.box(M.galv, lx, (top + 1) / 2, z, .05, top + 1, .05);
    for (let y = .5; y < top + .8; y += .3) F.box(M.galv, lx, y, 0, .03, .03, .44);
    for (let y = 2.2; y < top + .9; y += .7) F.torus(M.galv, lx + .05, y, 0, .38, .018, { rx: Math.PI / 2, rz: Math.PI / 2, arc: Math.PI, seg: 14 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; F.box(M.galv, Math.cos(a) * r * .62, top + r * .2 + .5, Math.sin(a) * r * .62, .04, 1, .04); } F.torus(M.galv, 0, top + r * .2 + 1, 0, r * .62, .025);
    // Manhole and two flanged nozzles bending into the floor.
    F.cyl(M.paintWhite, 0, 1.3, -r - .08, .3, .16, { axis: 'z' }); F.cyl(M.galv, 0, 1.3, -r - .17, .36, .05, { axis: 'z' });
    for (const a of [Math.PI * .75, Math.PI * 1.25]) { const cx = Math.cos(a), cz = Math.sin(a); F.cyl(M.galv, cx * (r + .06), .7, cz * (r + .06), .2, .06, { axis: 'x', ry: -a }); F.bar(M.pipeGreen, [cx * r, .7, cz * r], [cx * (r + .7), .7, cz * (r + .7)], .14); F.sphere(M.pipeGreen, cx * (r + .7), .7, cz * (r + .7), .14); F.bar(M.pipeGreen, [cx * (r + .7), .7, cz * (r + .7)], [cx * (r + .7), 0, cz * (r + .7)], .14); }
  }
  // ISO 20' container: corrugated skin, corner posts and castings, door end with locking bars.
  let containers = 0;
  function container(o) {
    const along = o.hz > o.hx, F = frame(o.x, 0, o.z, along ? 0 : Math.PI / 2), w = (along ? o.hx : o.hz) * 2, L = (along ? o.hz : o.hx) * 2, h = o.height, skin = containers++ % 2 ? M.containerRed : M.containerBlue;
    F.box(skin, 0, h / 2, 0, w - .12, h - .2, L - .14);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { F.box(M.dark, sx * (w / 2 - .08), h / 2, sz * (L / 2 - .08), .16, h, .16); for (const y of [.09, h - .09]) F.box(M.steel, sx * (w / 2 - .09), y, sz * (L / 2 - .09), .18, .18, .18); }
    for (const y of [.08, h - .08]) for (const sx of [-1, 1]) F.box(M.dark, sx * (w / 2 - .07), y, 0, .1, .14, L - .3);
    // Doors at +z: two leaves, four locking bars with cams and handles, hinges.
    F.box(skin, -w / 4 + .02, h / 2, L / 2 - .05, w / 2 - .1, h - .3, .04); F.box(skin, w / 4 - .02, h / 2, L / 2 - .05, w / 2 - .1, h - .3, .04);
    for (const x of [-w * .37, -w * .13, w * .13, w * .37]) { F.cyl(M.galv, x, h / 2, L / 2 - .01, .022, h - .3, { seg: 8 }); F.box(M.galv, x + .12, h * .4, L / 2 + .02, .26, .04, .03); for (const y of [.25, h - .25]) F.box(M.galv, x, y, L / 2 - .01, .1, .08, .06); }
    F.box(M.label, w * .3, h * .82, L / 2 - .02, .5, .28, .01);
  }
  // Steel pipe rack: H columns, two tiers, flanged pipes and a cable tray.
  function piperack(o) {
    const along = o.hx > o.hz, F = frame(o.x, 0, o.z, along ? 0 : Math.PI / 2), L = (along ? o.hx : o.hz) * 2, h = o.height;
    for (const x of [-L / 2 + .4, 0, L / 2 - .4]) { for (const z of [-.5, .5]) hColumn(F, M.paintYellow, x, z, h - .1, .22); for (const y of [1.85, h - .15]) F.box(M.paintYellow, x, y, 0, .2, .2, 1.2); F.bar(M.steel, [x, .3, -.5], [x, 1.75, .5], .025); }
    for (const z of [-.5, .5]) for (const y of [1.85, h - .15]) F.box(M.steel, 0, y + .14, z, L, .08, .14);
    const pipes = [[-.38, .09, M.pipeGreen], [-.14, .16, M.alu], [.12, .11, M.pipeYellow], [.36, .07, M.pipeRed]];
    for (const [z, r, m] of pipes) { F.cyl(m, 0, h + r - .06, z, r, L + 2, { axis: 'x', seg: 14 }); for (const x of [-L / 2 + 1, L / 2 - 1]) F.cyl(M.galv, x, h + r - .06, z, r + .035, .07, { axis: 'x', seg: 14 }); }
    F.box(M.galv, 0, 1.98 + .01, 0, L - .2, .02, .5); for (const z of [-.25, .25]) F.box(M.galv, 0, 2.04, z, L - .2, .1, .02);
    for (let k = 0; k < 5; k++) F.cyl(M.rubber, 0, 2.03, -.18 + k * .09, .028, L - .3, { axis: 'x', seg: 8 });
  }
  // Dry cooler: galvanised frame, louvred sides, four fans turning in their shrouds.
  function cooler(o) {
    const F = frame(o.x, 0, o.z), w = o.hx * 2, d = o.hz * 2, h = o.height;
    F.box(M.concreteDark, 0, .1, 0, w + .3, .2, d + .3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(M.galv, sx * (w / 2 - .1), h / 2, sz * (d / 2 - .1), .16, h - .2, .16);
    for (const y of [.35, h - .45]) { F.box(M.galv, 0, y, -d / 2 + .1, w, .14, .14); F.box(M.galv, 0, y, d / 2 - .1, w, .14, .14); F.box(M.galv, -w / 2 + .1, y, 0, .14, .14, d); F.box(M.galv, w / 2 - .1, y, 0, .14, .14, d); }
    F.box(M.shutter, 0, h / 2 - .05, -d / 2 + .12, w - .3, h - .9, .04); F.box(M.shutter, 0, h / 2 - .05, d / 2 - .12, w - .3, h - .9, .04); F.box(M.shutter, -w / 2 + .12, h / 2 - .05, 0, .04, h - .9, d - .3); F.box(M.shutter, w / 2 - .12, h / 2 - .05, 0, .04, h - .9, d - .3);
    F.box(M.galv, 0, h - .35, 0, w - .2, .06, d - .2);
    const fr = Math.min(w, d) / 4 - .12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const fx = sx * w / 4, fz = sz * d / 4; F.cyl(M.dark, fx, h - .1, fz, fr + .04, .5, { open: true, seg: SEG + 6 }); F.cyl(M.dark, fx, h - .22, fz, .16, .2, { seg: 12 });
      for (const rr of [fr * .35, fr * .7, fr]) F.torus(M.galv, fx, h + .16, fz, rr, .012, { seg: 28 }); for (let k = 0; k < 4; k++) F.box(M.galv, fx, h + .16, fz, fr * 2, .015, .015, { ry: k * Math.PI / 4 });
      const blades = new T.Group(); blades.position.set(o.x + fx, h - .05, o.z + fz); group.add(blades);
      for (let k = 0; k < 5; k++) { const b = new T.Mesh(new T.BoxGeometry(fr * .9, .02, .22), M.steel); b.position.x = fr * .48; b.rotation.x = .35; const arm = new T.Group(); arm.rotation.y = k / 5 * TAU; arm.add(b); blades.add(arm); }
      const speed = 5 + (sx + sz) * .7; animated.push((t, dt) => { blades.rotation.y += dt * speed; }); stats.fans++;
    }
    for (const z of [-d / 2 + .5, d / 2 - .5]) { F.cyl(M.pipeGreen, w / 2 + .25, .9, z, .12, 1.4, { seg: 12 }); F.bar(M.pipeGreen, [w / 2 - .1, 1.6, z], [w / 2 + .25, 1.6, z], .12); F.cyl(M.pipeGreen, w / 2 + .25, .1, z, .12, .2, { seg: 12 }); }
  }
  // Row of 42U racks; fronts face ±x (hot/cold aisles), cable tray overhead, activity LEDs.
  const ledGroups = [[], [], [], []];
  function serverRow(o) {
    const F = frame(o.x, 0, o.z), d = o.hz * 2, h = Math.min(2.2, o.height), n = Math.round(d / .6), rw = d / n, depth = o.hx * 2 - .04;
    F.box(M.black, 0, h / 2 + .05, 0, depth - .06, h, d - .04); F.box(M.black, 0, .025, 0, depth, .05, d);
    for (let i = 0; i < n; i++) {
      const z = -d / 2 + rw * (i + .5);
      for (const s of [-1, 1]) {
        F.box(M.perf, s * depth / 2, h / 2 + .05, z, .025, h - .1, rw - .05); F.box(M.dark, s * (depth / 2 + .025), h * .55, z + rw * .38, .03, .3, .03);
        F.box(M.label, s * (depth / 2 + .016), h - .04, z, .005, .05, rw * .5);
        for (let u = 0; u < 9; u++) { const y = .3 + u * .2; if ((i * 7 + u * 3 + (s > 0 ? 1 : 0)) % 5 === 0) continue; ledGroups[(i + u) % 4].push([o.x + s * (depth / 2 + .02), y, o.z + z - rw * .3, s]); ledGroups[(i * 3 + u) % 4].push([o.x + s * (depth / 2 + .02), y, o.z + z - rw * .22, s]); }
      }
      F.box(M.dark, 0, h / 2 + .05, -d / 2 + rw * i, depth + .02, h, .025);
    }
    F.box(M.dark, 0, h + .12, 0, depth, .04, d); F.box(M.paintYellow, -depth * .2, h + .45, 0, .3, .02, d); for (const s of [-1, 1]) F.box(M.paintYellow, -depth * .2 + s * .15, h + .5, 0, .015, .1, d);
    F.box(M.galv, depth * .2, h + .45, 0, .4, .02, d); for (let k = 0; k < 4; k++) F.cyl(M.rubber, depth * .2 - .14 + k * .09, h + .48, 0, .025, d, { axis: 'z', seg: 8 });
    for (const z of [-d / 2 + .3, d / 2 - .3]) for (const x of [-depth * .2, depth * .2]) F.box(M.galv, x, h + .3 + .14, z, .02, 1.3, .02);
  }
  function flushLeds() {
    const mats = [M.ledGreen, M.ledGreen.clone(), M.ledBlue, M.ledAmber], geo = new T.BoxGeometry(.012, .012, .012), m4 = new T.Matrix4();
    ledGroups.forEach((list, k) => { if (!list.length) return; const mesh = new T.InstancedMesh(geo, mats[k], list.length); list.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m4.makeTranslation(x, y, z))); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); group.add(mesh); const base = mats[k].color.clone();
      if (k !== 0) animated.push(t => { const on = Math.sin(t * (7 + k * 3.1) + k) > -.2 + .25 * Math.sin(t * 1.7 + k); mats[k].color.copy(base).multiplyScalar(on ? 1 : .15); }); });
  }
  // Pallet rack (orange beams, blue uprights, wire decks) with quadcopter drones parked on every level.
  function droneRack(o) {
    const along = o.hx > o.hz, F = frame(o.x, 0, o.z, along ? 0 : Math.PI / 2), L = (along ? o.hx : o.hz) * 2, d = (along ? o.hz : o.hx) * 2 - .1, h = o.height, bays = Math.max(2, Math.round(L / 2.8)), bw = L / bays;
    for (let b = 0; b <= bays; b++) { const x = -L / 2 + b * bw; for (const z of [-d / 2, d / 2]) F.box(M.paintBlue, x, h / 2, z, .09, h, .07); for (let y = .3; y < h; y += .6) F.bar(M.paintBlue, [x, y, -d / 2], [x, y + .5, d / 2], .018); F.box(M.steel, x, .01, -d / 2, .16, .02, .14); F.box(M.steel, x, .01, d / 2, .16, .02, .14); }
    const levels = [.12, 1.35, 2.55];
    for (const y of levels) { for (const z of [-d / 2, d / 2]) F.box(M.paintOrange, 0, y, z, L, .12, .05); F.box(M.galv, 0, y + .07, 0, L - .05, .015, d - .02); }
    stats.racks++;
    for (let b = 0; b < bays; b++) for (const [li, y] of levels.entries()) {
      const cx = -L / 2 + (b + .5) * bw;
      if (li === 0) { for (const k of [-.55, .55]) { F.box(M.caseGrey, cx + k, y + .3, 0, .9, .45, d * .8); F.box(M.paintYellow, cx + k, y + .45, d * .4 + .002, .25, .05, .005); } continue; }
      drone(F, cx, y + .08, 0, (b + li) % 3 === 0);
    }
  }
  // Quadcopter: carbon arms, ducted rotors, battery, gimbal camera, landing skids.
  function drone(F, x, y, z, open) {
    stats.drones++; const s = .62;
    for (const sx of [-1, 1]) F.box(M.dark, x, y + .05, z + sx * .2 * s, .9 * s, .025, .03);
    for (const k of [-1, 1]) for (const sx of [-1, 1]) F.box(M.dark, x + k * .3 * s, y + .02, z + sx * .2 * s, .03, .08, .03);
    F.box(M.caseGrey, x, y + .17, z, .38 * s, .12, .26 * s); F.box(M.black, x, y + .25, z, .3 * s, .05, .2 * s); F.box(M.paintWhite, x - .02, y + .29, z, .2 * s, .04, .14 * s);
    for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
      const ax = x + Math.cos(a) * .52 * s, az = z + Math.sin(a) * .52 * s; F.bar(M.black, [x, y + .19, z], [ax, y + .21, az], .022);
      F.cyl(M.dark, ax, y + .22, az, .2 * s, .06, { open: true, seg: 14 }); F.cyl(M.black, ax, y + .2, az, .03, .06, { seg: 8 });
      F.box(open ? M.dark : M.black, ax, y + .24, az, .34 * s, .006, .03, { ry: a + (open ? .6 : 0) });
    }
    F.sphere(M.black, x + .14 * s, y + .08, z, .06); F.box(M.ledRed, x + .2 * s, y + .17, z, .01, .015, .04);
  }
  // Equipment cases strapped on a wooden pallet.
  function cases(o) {
    const F = frame(o.x, 0, o.z), w = o.hx * 2, d = o.hz * 2, h = o.height;
    for (let k = 0; k < 3; k++) F.box(M.wood, 0, .03, -d / 2 + .1 + k * (d - .2) / 2, w, .06, .14); for (let k = 0; k < 5; k++) F.box(M.wood, -w / 2 + .1 + k * (w - .2) / 4, .11, 0, .1, .1, d); F.box(M.wood, 0, .165, 0, w, .025, d);
    const ch = (h - .2) / 2;
    for (let lvl = 0; lvl < 2; lvl++) for (const sx of [-1, 1]) {
      const cx = sx * w / 4, cy = .18 + lvl * ch + ch / 2, cw = w / 2 - .06, cd = d - .1;
      F.box(lvl ? M.caseGrey : M.paintBlue, cx, cy, 0, cw, ch - .04, cd); F.box(M.dark, cx, cy + ch * .12, 0, cw + .015, .03, cd + .015);
      for (const lz of [-cd * .3, cd * .3]) F.box(M.black, cx + sx * (cw / 2 + .01), cy + ch * .12, lz, .03, .08, .1); F.box(M.warn, cx, cy - ch * .1, cd / 2 + .004, cw * .4, ch * .25, .005);
    }
    for (const x of [-w * .3, w * .3]) F.box(M.black, x, h / 2, 0, .03, h - .1, d + .02);
  }
  // Prefab guard cabin: clad walls, ribbon window, door, roof overhang, AC unit, beacon.
  function cabin(o) {
    const F = frame(o.x, 0, o.z), w = o.hx * 2, d = o.hz * 2, h = o.height;
    F.box(M.concreteDark, 0, .08, 0, w + .2, .16, d + .2);
    F.box(M.paintWhite, 0, .16 + .5, 0, w, 1, d); F.box(M.paintWhite, 0, h - .3, 0, w, .5, d);
    for (const x of [-w / 2 + .05, w / 2 - .05]) F.box(M.paintWhite, x, h / 2, 0, .1, h - .2, d);
    F.box(M.glass, 0, 1.66, 0, w - .2, 1.15, d - .2); for (let k = 0; k <= 4; k++) F.box(M.dark, -w / 2 + .1 + k * (w - .2) / 4, 1.66, -d / 2 + .02, .05, 1.15, .05);
    F.box(M.paintGrey, w / 2 - .6, 1.05, d / 2 + .01, .9, 2, .04); F.box(M.galv, w / 2 - .25, 1.05, d / 2 + .05, .12, .03, .05);
    F.box(M.dark, 0, h + .05, 0, w + .4, .12, d + .4); F.box(M.paintWhite, -w * .3, h + .3, 0, .8, .4, .6); for (let k = 0; k < 6; k++) F.box(M.dark, -w * .3, h + .3, -.31, .7, .02, .01, { rz: 0 });
    F.cyl(M.ledAmber, w * .3, h + .22, 0, .1, .2, { seg: 12 }); F.box(M.label, 0, h - .3, -d / 2 - .005, 1.2, .25, .01);
  }
  // The reactor: concrete biological shield, ribbed JANUS-blue vessel, bolted flange, radial coolant loops,
  // ring platform with handrail and ladder; the opening at the head lets the breach column out.
  function reactor(o) {
    const F = frame(o.x, 0, o.z), R = o.hx;
    F.cyl(M.precast, 0, 1.4, 0, R, 2.8, { seg: SEG * 3 }); F.cyl(M.concreteDark, 0, 2.85, 0, R + .05, .1, { seg: SEG * 3 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; F.box(M.concreteDark, Math.cos(a) * (R + .005), 1.4, Math.sin(a) * (R + .005), .05, 2.8, .05, { ry: -a }); }
    const rv = R - 1.4; F.cyl(M.blue, 0, 2.9 + 1.8, 0, rv, 3.6, { seg: SEG * 3 });
    for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; F.box(M.steel, Math.cos(a) * (rv + .08), 4.7, Math.sin(a) * (rv + .08), .16, 3.6, .1, { ry: -a }); }
    F.cyl(M.galv, 0, 6.6, 0, rv + .3, .28, { seg: SEG * 3 }); for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; F.cyl(M.steel, Math.cos(a) * (rv + .18), 6.78, Math.sin(a) * (rv + .18), .045, .1, { seg: 6 }); }
    F.cyl(M.steel, 0, 7.6, 0, rv, 1.7, { r2: 2.1, seg: SEG * 3 }); F.cyl(M.galv, 0, 8.5, 0, 2.35, .3, { seg: SEG * 2 }); F.torus(M.ledMagenta, 0, 8.68, 0, 1.75, .06, { seg: 48 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; F.cyl(M.galv, Math.cos(a) * 3, 7.7, Math.sin(a) * 3, .22, .5, { seg: 12 }); F.cyl(M.steel, Math.cos(a) * 3, 8.0, Math.sin(a) * 3, .28, .08, { seg: 12 }); }
    // Coolant loops: out of the vessel at 4 m, over the shield, down to the floor.
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.PI / 8, c = Math.cos(a), s = Math.sin(a), m = k % 2 ? M.pipeGreen : M.alu;
      F.bar(m, [c * rv, 4.1, s * rv], [c * (R + .3), 4.1, s * (R + .3)], .22); F.sphere(m, c * (R + .3), 4.1, s * (R + .3), .22); F.bar(m, [c * (R + .3), 4.1, s * (R + .3)], [c * (R + .3), .3, s * (R + .3)], .22);
      F.cyl(M.galv, c * (R + .3), .15, s * (R + .3), .36, .3, { seg: 14 }); for (const y of [2, 3.4]) F.cyl(M.galv, c * (R + .3), y, s * (R + .3), .27, .08, { seg: 14 }); F.cyl(M.galv, c * (rv + .2), 4.1, s * (rv + .2), .33, .08, { axis: 'x', ry: -a, seg: 14 }); }
    // Ring platform on brackets at the shield's top, handrail, ladder.
    for (let k = 0; k < 36; k++) { const a = (k + .5) / 36 * TAU; F.box(M.tread, Math.cos(a) * (R - .7), 2.93, Math.sin(a) * (R - .7), 1.3, .05, TAU * (R - .7) / 36 + .02, { ry: -a }); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; F.box(M.paintYellow, Math.cos(a) * (R - .28), 3.45, Math.sin(a) * (R - .28), .05, 1.05, .05); } F.torus(M.paintYellow, 0, 3.98, 0, R - .28, .03, { seg: 64 }); F.torus(M.paintYellow, 0, 3.5, 0, R - .28, .02, { seg: 64 });
    for (const z of [-.25, .25]) F.box(M.galv, R + .25, 1.6, z + R * 0, .05, 3.2, .05); for (let y = .3; y < 3; y += .3) F.box(M.galv, R + .25, y, 0, .03, .03, .5);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; F.cyl(M.paintYellow, Math.cos(a) * (R + .2), .55, Math.sin(a) * (R + .2), .14, 1.1, { seg: 12 }); for (const y of [.35, .75]) F.cyl(M.black, Math.cos(a) * (R + .2), y, Math.sin(a) * (R + .2), .145, .1, { seg: 12 }); }
    F.box(M.label, 0, 2, R + .01, 2.4, .5, .02); F.box(M.warn, 1.8, 2, R + .015, .5, .45, .02);
  }
  // Extra detail on the stabiliser cages (the level keeps the glowing core and ring that it animates).
  function stabilizer(g, r, h) {
    const add = (geo, m, x, y, z, rx = 0) => { const mesh = new T.Mesh(geo, m); mesh.position.set(x, y, z); mesh.rotation.x = rx; g.add(mesh); };
    add(new T.CylinderGeometry(r + .35, r + .45, .25, 24), M.concreteDark, 0, .12, 0);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4; add(new T.BoxGeometry(.18, h - .2, .18), M.paintYellow, Math.cos(a) * (r + .1), h / 2, Math.sin(a) * (r + .1)); }
    for (const y of [h * .3, h * .55, h * .8]) add(new T.TorusGeometry(r * .62, .11, 10, 36), M.copper, 0, y, 0, Math.PI / 2);
    for (const y of [h * .3, h * .8]) add(new T.TorusGeometry(r * .62, .135, 6, 36), M.dark, 0, y + .02, 0, Math.PI / 2);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, cable = new T.Mesh(new T.CylinderGeometry(.05, .05, h * .8, 8), M.rubber); cable.position.set(Math.cos(a) * (r * .62 + .14), h * .4, Math.sin(a) * (r * .62 + .14)); g.add(cable); }
    const plate = new T.Mesh(new T.BoxGeometry(.5, .4, .02), M.warn); plate.position.set(0, 1.2, r + .2); g.add(plate);
  }

  // ---------- Architecture ----------
  // Precast pilasters, coping and a cable tray along the tall concrete walls; one wall lamp head every other bay.
  function walls(obstacles) {
    for (const o of obstacles) {
      if (o.kind !== 'wall' || o.look !== 'janus' || o.height < 6) continue;
      const along = o.hx > o.hz, len = (along ? o.hx : o.hz) * 2, n = Math.floor(len / 6);
      // The façades that carry the station's signs (platform, ring hall) keep a bare face.
      const signed = (along && (Math.abs(o.z - 74) < .5 || Math.abs(o.z + 42) < .5)) || (!along && Math.abs(Math.abs(o.x) - 60) < .5);
      W.box(M.concreteDark, o.x, o.height + .12, o.z, o.hx * 2 + .3, .24, o.hz * 2 + .3);
      for (let k = 0; k <= n; k++) { const t = -len / 2 + (n ? k * len / n : len / 2); const px = along ? o.x + t : o.x, pz = along ? o.z : o.z + t;
        W.box(M.precast, px, o.height / 2, pz, along ? .6 : o.hx * 2 + .16, o.height, along ? o.hz * 2 + .16 : .6);
        if (k % 2 && o.height >= 8 && !signed) for (const s of [-1, 1]) { const lx = along ? px : px + s * (o.hx + .35), lz = along ? pz + s * (o.hz + .35) : pz; W.box(M.dark, lx, 6.2, lz, .45, .14, .45); W.box(M.lamp, lx, 6.12, lz, .38, .02, .38); } }
      if (!signed) for (const s of [-1, 1]) { const tx = along ? o.x : o.x + s * (o.hx + .35), tz = along ? o.z + s * (o.hz + .35) : o.z; W.box(M.galv, tx, 5, tz, along ? len : .5, .02, along ? .5 : len); W.box(M.galv, along ? tx : tx + s * .24, 5.05, along ? tz + s * .24 : tz, along ? len : .02, .1, along ? .02 : len); }
    }
  }
  // Hangar: portal frames on both long walls, trusses under the roof, purlins.
  function hangar(a) {
    const x1 = a.x1 + .6, x2 = a.x2 - .6, top = a.roof - .15;
    for (let z = a.z1 + 4; z < a.z2 - 1; z += 8) {
      for (const x of [x1, x2]) hColumn(W, M.paintBlue, x, z, top, .4, Math.PI / 2);
      for (const y of [top - .1, top - 1.6]) W.box(M.paintBlue, (x1 + x2) / 2, y, z, x2 - x1, .14, .2);
      const n = 12; for (let k = 0; k < n; k++) { const xa = x1 + k * (x2 - x1) / n, xb = x1 + (k + 1) * (x2 - x1) / n; W.bar(M.paintBlue, [xa, k % 2 ? top - .1 : top - 1.6, z], [xb, k % 2 ? top - 1.6 : top - .1, z], .045, true); }
    }
    for (let x = x1 + 3; x < x2; x += 5) W.box(M.steel, x, top + .05, (a.z1 + a.z2) / 2, .12, .16, a.z2 - a.z1 - 1);
    // Floor: yellow parking boxes in front of the racks.
    for (const z of [16, 28, 40]) for (const x of [-76, -56]) for (const s of [-1, 1]) W.box(M.paintYellow, x + s * 5, .012, z, .12, .01, 3.2);
  }
  // Outside the walls: a natural-draught cooling tower and a high-voltage line, silhouettes in the fog.
  function plantBeyond() {
    const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16, y = t * 62, r = 27 * Math.sqrt(1 + ((y - 44) / 34) ** 2) * .72; pts.push(new T.Vector2(r, y)); }
    const tower = new T.Mesh(new T.LatheGeometry(pts, low ? 24 : 48), M.precast); tower.position.set(-150, 0, -150); group.add(tower);
    const steam = new T.Mesh(new T.SphereGeometry(20, 16, 10), new T.MeshBasicMaterial({ color: 0x3d3550, transparent: true, opacity: .35, depthWrite: false })); steam.scale.set(1.1, .55, 1.1); steam.position.set(-150, 68, -150); group.add(steam);
    animated.push(t => { steam.scale.y = .55 + .05 * Math.sin(t * .3); steam.rotation.y = t * .02; });
    const pylon = (x, z) => { const F = frame(x, 0, z), h = 34;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) W.bar(M.galv, [x + sx * 3.2, 0, z + sz * 3.2], [x + sx * .9, h, z + sz * .9], .14, true);
      for (let y = 4; y < h - 2; y += 4) { const k = 3.2 - (3.2 - .9) * y / h, k2 = 3.2 - (3.2 - .9) * (y + 4) / h; for (const s of [-1, 1]) { W.bar(M.galv, [x - k, y, z + s * k], [x + k2, y + 4, z + s * k2], .06, true); W.bar(M.galv, [x + s * k, y, z - k], [x + s * k2, y + 4, z + k2], .06, true); } }
      for (const y of [h - 8, h - 2]) { F.box(M.galv, 0, y, 0, 18 - (y - h + 8) * .8, .4, .4); for (const s of (y === h - 2 ? [-1, 1] : [-1, -.5, .5, 1])) F.cyl(M.porcelain, s * (y === h - 2 ? 8 : 7.2), y - 1.2, 0, .18, 2, { seg: 8 }); } };
    const line = [[150, -150], [150, -40], [150, 70]]; for (const [x, z] of line) pylon(x, z);
    for (let k = 0; k + 1 < line.length; k++) for (const [y, offs] of [[34 - 8 - 2.2, [-7.2, -3.6, 3.6, 7.2]], [34 - 2 - 2.2, [-8, 8]]]) for (const s of offs) {
      const [ax, az] = line[k], [bx, bz] = line[k + 1], segs = 8; let prev = null;
      for (let i = 0; i <= segs; i++) { const t = i / segs, p = [ax + s + (bx - ax) * t, y - 4.5 * Math.sin(Math.PI * t), az + (bz - az) * t]; if (prev) W.bar(M.dark, prev, p, .035); prev = p; } }
  }

  return {
    M, group, stats, animated,
    has: kind => ['transformer', 'tank', 'container', 'piperack', 'coolant', 'servers', 'rack', 'crates', 'guard-post', 'reactor'].includes(kind),
    dress(o) {
      switch (o.kind) {
        case 'transformer': transformer(o); break; case 'tank': vessel(o); break; case 'container': container(o); break;
        case 'piperack': piperack(o); break; case 'coolant': cooler(o); break; case 'servers': serverRow(o); break; case 'rack': droneRack(o); break;
        case 'crates': cases(o); break; case 'guard-post': cabin(o); break; case 'reactor': reactor(o); break; default: return false;
      }
      return true;
    },
    stabilizer, walls, hangar, plantBeyond,
    finish() { flush(); flushLeds(); },
    update(t, dt) { for (const f of animated) f(t, dt); }
  };
}
