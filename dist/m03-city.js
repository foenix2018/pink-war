// MISSION 03 — the city around and above the sector. The baked sector is an open avenue between six low buildings
// with a far skyline; this module turns it into a cyberpunk canyon without touching a single collision box:
//  · megatowers rising from the roofs of the existing buildings (setbacks, floor ledges, pilasters with light lines,
//    crowns with masts and warning lights), skybridges over the avenue with lit undersides;
//  · a ring of towers just outside the playable bounds and a second, taller ring in the haze;
//  · detailed window bays (frames, mullions, blinds, lit interiors) instead of flat blocks;
//  · vertical neon blades, giant holographic adverts, a hologram ring, searchlights;
//  · flying traffic on four lanes, a maglev line with a passing train;
//  · street level: light pools and neon reflections on the wet road, lantern garlands over the avenue, steam.
// Everything static is merged into a handful of batches; what moves is instanced.
const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const BAY = 3.2, FLOOR = 3.4, CELLS = 4;
const FOG = [0x0b / 255, 0x14 / 255, 0x24 / 255];

function canvasTexture(T, w, h, paint, { srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

// 4 × 4 window bays: wall panel, spandrel, recessed window with frame and mullions; the emissive sheet lights about
// half of them with different interiors (warm, cold, pink, teal), blinds, furniture shadows, a few shop strips.
export function cityWindowAtlas(T, size = 1024) {
  const r = seeded(90317), cell = size / CELLS;
  const lit = [], kinds = ['#ffd7a0', '#ffe9c8', '#bfe6ff', '#ff86bd', '#63f2d6', '#c9a2ff', '#fff3d6'];
  for (let i = 0; i < CELLS * CELLS; i++) lit.push(r() < .56 ? { c: kinds[Math.floor(r() * kinds.length)], level: .45 + r() * .55, blinds: r() < .4, split: r() < .5, shadow: r() < .6, strip: r() < .16 } : null);
  const win = (x, y) => ({ x: x * cell + cell * .13, y: y * cell + cell * .17, w: cell * .74, h: cell * .62 });
  const color = canvasTexture(T, size, size, (c) => {
    c.fillStyle = '#141a22'; c.fillRect(0, 0, size, size);
    for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
      const w = win(x, y), ox = x * cell, oy = y * cell;
      c.fillStyle = (x + y) % 2 ? '#161d26' : '#12181f'; c.fillRect(ox, oy, cell, cell);
      c.fillStyle = '#0d1117'; c.fillRect(ox, oy + cell * .86, cell, cell * .14);                     // spandrel
      c.fillStyle = '#232c37'; c.fillRect(ox, oy + cell * .855, cell, cell * .012); c.fillRect(ox, oy, cell * .014, cell); // joints
      c.fillStyle = '#2b3542'; c.fillRect(w.x - cell * .025, w.y - cell * .025, w.w + cell * .05, w.h + cell * .05);       // frame
      c.fillStyle = '#06080b'; c.fillRect(w.x, w.y, w.w, w.h);                                                        // glass
      c.fillStyle = '#1b2530'; c.fillRect(w.x, w.y + w.h, w.w, cell * .03);                                             // sill
      c.fillStyle = '#2b3542'; c.fillRect(w.x + w.w * .5 - cell * .008, w.y, cell * .016, w.h); c.fillRect(w.x, w.y + w.h * .3, w.w, cell * .012);
      if (r() < .3) { c.fillStyle = '#1d242d'; c.fillRect(ox + cell * .62, oy + cell * .89, cell * .26, cell * .08); c.fillStyle = '#0a0d11'; for (let k = 0; k < 5; k++) c.fillRect(ox + cell * .635, oy + cell * (.9 + k * .014), cell * .23, cell * .006); } // unit
      const g = c.createLinearGradient(0, oy, 0, oy + cell); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = g; c.fillRect(ox, oy, cell, cell); // grime
    }
  });
  const emissive = canvasTexture(T, size, size, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, size, size);
    for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
      const l = lit[y * CELLS + x]; if (!l) continue; const w = win(x, y);
      c.globalAlpha = l.level; const g = c.createLinearGradient(0, w.y, 0, w.y + w.h); g.addColorStop(0, l.c); g.addColorStop(1, '#3a2a1c'); c.fillStyle = g;
      c.fillRect(w.x, w.y, l.split ? w.w * .5 : w.w, w.h); c.globalAlpha = 1;
      c.fillStyle = '#000';
      if (l.shadow) { c.globalAlpha = .7; c.fillRect(w.x + w.w * .1, w.y + w.h * .55, w.w * .22, w.h * .45); c.fillRect(w.x + w.w * .6, w.y + w.h * .7, w.w * .3, w.h * .3); c.globalAlpha = 1; }
      if (l.blinds) for (let k = 0; k < 9; k++) c.fillRect(w.x, w.y + k * w.h * .075, w.w, w.h * .03);
      c.fillRect(w.x + w.w * .5 - cell * .008, w.y, cell * .016, w.h); c.fillRect(w.x, w.y + w.h * .3, w.w, cell * .012);
      if (l.strip) { c.fillStyle = l.c; c.fillRect(x * cell + cell * .1, y * cell + cell * .9, cell * .8, cell * .022); }
    }
  });
  return { color, emissive };
}

// Merged static geometry: quads and boxes with a colour per vertex and facade UVs in metres.
function batch(T) {
  const P = [], N = [], U = [], C = [], I = []; let n = 0;
  const quad = (a, b, c, d, nx, ny, nz, col, u0 = 0, v0 = 0, u1 = 1, v1 = 1) => {
    P.push(...a, ...b, ...c, ...d); for (let k = 0; k < 4; k++) { N.push(nx, ny, nz); C.push(col[0], col[1], col[2]); }
    U.push(u0, v0, u1, v0, u1, v1, u0, v1); I.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
  };
  // Box from (x1,y1,z1) to (x2,y2,z2). `facade` maps window bays on the four sides; `top`/`bottom` add those faces.
  const box = (x1, y1, z1, x2, y2, z2, col, { facade = false, top = true, bottom = false, seed = 0 } = {}) => {
    const uv = (len, off) => facade ? [off, y1 / (FLOOR * CELLS), off + len / (BAY * CELLS), y2 / (FLOOR * CELLS)] : [0, 0, 1, 1];
    const w = x2 - x1, d = z2 - z1, o = seed * .25;
    let q = uv(w, o); quad([x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2], 0, 0, 1, col, q[0], q[1], q[2], q[3]);
    q = uv(w, o + .25); quad([x2, y1, z1], [x1, y1, z1], [x1, y2, z1], [x2, y2, z1], 0, 0, -1, col, q[0], q[1], q[2], q[3]);
    q = uv(d, o + .5); quad([x2, y1, z2], [x2, y1, z1], [x2, y2, z1], [x2, y2, z2], 1, 0, 0, col, q[0], q[1], q[2], q[3]);
    q = uv(d, o + .75); quad([x1, y1, z1], [x1, y1, z2], [x1, y2, z2], [x1, y2, z1], -1, 0, 0, col, q[0], q[1], q[2], q[3]);
    if (top) quad([x1, y2, z2], [x2, y2, z2], [x2, y2, z1], [x1, y2, z1], 0, 1, 0, col, 0, 0, .001, .001);
    if (bottom) quad([x1, y1, z1], [x2, y1, z1], [x2, y1, z2], [x1, y1, z2], 0, -1, 0, col, 0, 0, .001, .001);
  };
  const mesh = (material, name) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(N), 3));
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array(U), 2)); g.setAttribute('color', new T.BufferAttribute(new Float32Array(C), 3));
    g.setIndex(new T.BufferAttribute(n > 65535 ? new Uint32Array(I) : new Uint16Array(I), 1)); g.computeBoundingSphere();
    const m = new T.Mesh(g, material); m.name = name; m.matrixAutoUpdate = false; m.updateMatrix(); m.frustumCulled = false; m.userData.webgpuShape = 'city'; g.userData.webgpuShape = 'city';
    return m;
  };
  return { quad, box, mesh, get quads() { return n / 4; } };
}

const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const NEON = [0xff4fa1, 0x5fe0f0, 0xffb35c, 0xc06bff, 0x58ffb4, 0xff3b4e];

// Towers standing on the existing buildings ([x1, x2, z1, z2, roof, height, tiers]) and the bridges between them.
export const PODIUM_TOWERS = Object.freeze([
  [-58, -32, -20, -3, 13, 84, 3], [25, 52, -29, -1, 12, 96, 3], [-56, -25, -87, -64, 19, 118, 3], [24, 57, -89, -68, 17, 104, 3],
  [-44, -16, 14, 50, 8.6, 66, 2], [20, 41, 17, 41, 7.3, 58, 2]
]);
export const SKYBRIDGES = Object.freeze([
  { z: -12, x1: -32, x2: 25, y: 26, glow: 0x5fe0f0 }, { z: -78, x1: -25, x2: 24, y: 33, glow: 0xff4fa1 }, { z: 30, x1: -16, x2: 20, y: 19, glow: 0xffb35c }
]);

export function createCyberCity(T, root, { low = false, rich = false, advert = null, bounds = { minX: -77, maxX: 77, minZ: -123, maxZ: 71 } } = {}) {
  const rng = seeded(20261112), group = new T.Group(); group.name = 'M03 / ville : tours, passerelles, trafic'; root.add(group);
  const atlas = cityWindowAtlas(T, low ? 512 : 1024), animated = [], stats = { towers: 0, farTowers: 0, quads: 0, vehicles: 0, signs: 0, bridges: 0 };
  const Standard = rich ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
  const facadeMat = new Standard({ map: atlas.color, emissiveMap: atlas.emissive, emissive: 0xffffff, emissiveIntensity: 1.7, vertexColors: true, roughness: .34, metalness: .55, ...(rich ? { clearcoat: .6, clearcoatRoughness: .12 } : {}) });
  const trimMat = new Standard({ vertexColors: true, roughness: .5, metalness: .7, ...(rich ? { clearcoat: .3, clearcoatRoughness: .35 } : {}) });
  // Far towers: unlit, no fog (the haze is baked in their colour), so their windows still read through the night.
  const farMat = new T.MeshBasicMaterial({ map: canvasTexture(T, low ? 256 : 512, low ? 256 : 512, (c, w, h) => {
    c.fillStyle = '#0a0f17'; c.fillRect(0, 0, w, h); const r = seeded(771), n = 16, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = r(); if (v < .58) continue; c.globalAlpha = .35 + r() * .65; c.fillStyle = v > .95 ? '#ff6fb4' : v > .9 ? '#7fe7ff' : v > .8 ? '#ffc890' : '#f4e6c8'; c.fillRect(x * s + s * .2, y * s + s * .25, s * .6, s * .5); }
    c.globalAlpha = 1;
  }), vertexColors: true, fog: false });
  const glowMat = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const glowFar = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const facade = batch(T), trim = batch(T), far = batch(T), glow = batch(T), glowDistant = batch(T);
  const DARK = hex(0x1a212b), STEEL = hex(0x2c3642), WHITE = [1, 1, 1];
  const beacons = [];

  // ---------- A detailed tower: tiers with setbacks, ledges, pilasters, light lines, crown ----------
  function tower(x1, x2, z1, z2, base, top, tiers = 3, { accent = NEON[Math.floor(rng() * NEON.length)], detail = true } = {}) {
    stats.towers++;
    const tint = mix([.78, .82, .9], [1, .94, .86], rng()), a = hex(accent);
    let y = base, ax1 = x1, ax2 = x2, az1 = z1, az2 = z2;
    for (let t = 0; t < tiers; t++) {
      const frac = (tiers >= 3 ? [.5, .3, .2] : tiers === 2 ? [.62, .38] : [1])[t] || .2, y2 = t === tiers - 1 ? top : y + (top - base) * frac;
      facade.box(ax1, y, az1, ax2, y2, az2, tint, { facade: true, seed: stats.towers + t });
      if (detail) {
        // Corner pilasters with a light line, floor ledges every two floors, a brighter belt at the tier foot.
        for (const [cx, cz] of [[ax1, az1], [ax2, az1], [ax1, az2], [ax2, az2]]) {
          trim.box(cx - .45, y, cz - .45, cx + .45, y2 + .6, cz + .45, STEEL);
          const sx = cx === ax1 ? -1 : 1, sz = cz === az1 ? -1 : 1; glow.box(cx + sx * .46, y + 1, cz + sz * .46, cx + sx * .54, y2, cz + sz * .54, a, { top: false });
        }
        const step = FLOOR * (low ? 4 : 2);
        for (let ly = y + step; ly < y2 - 1; ly += step) {
          trim.box(ax1 - .28, ly - .16, az2, ax2 + .28, ly + .16, az2 + .28, DARK); trim.box(ax1 - .28, ly - .16, az1 - .28, ax2 + .28, ly + .16, az1, DARK);
          trim.box(ax2, ly - .16, az1, ax2 + .28, ly + .16, az2, DARK); trim.box(ax1 - .28, ly - .16, az1, ax1, ly + .16, az2, DARK);
        }
        trim.box(ax1 - .6, y - .5, az1 - .6, ax2 + .6, y + .5, az2 + .6, STEEL);
        glow.box(ax1 - .62, y + .5, az1 - .62, ax2 + .62, y + .62, az2 + .62, mix(a, WHITE, .2), { top: false });
        // Service modules hung on the faces: units, ducts, balconies.
        if (!low) for (let k = 0; k < 10; k++) {
          const onX = rng() < .5, side = rng() < .5, hy = y + 3 + rng() * (y2 - y - 6), w = .9 + rng() * 1.6;
          if (onX) { const px = ax1 + 1 + rng() * (ax2 - ax1 - 3), pz = side ? az2 : az1 - .7; trim.box(px, hy, pz, px + w, hy + .8 + rng(), pz + .7, rng() < .5 ? DARK : STEEL); }
          else { const pz = az1 + 1 + rng() * (az2 - az1 - 3), px = side ? ax2 : ax1 - .7; trim.box(px, hy, pz, px + .7, hy + .8 + rng(), pz + w, rng() < .5 ? DARK : STEEL); }
        }
      }
      y = y2; const inset = 1.5 + rng() * 2.5; ax1 += inset; ax2 -= inset; az1 += inset; az2 -= inset;
      if (ax2 - ax1 < 6 || az2 - az1 < 6) break;
    }
    // Crown: parapet light, plant boxes, a mast with a warning light.
    const cx = (ax1 + ax2) / 2, cz = (az1 + az2) / 2;
    if (detail) {
      trim.box(cx - 3, y, cz - 2, cx + 1, y + 2.2, cz + 2, DARK); trim.box(cx + 1.6, y, cz - 1.2, cx + 3.4, y + 3.4, cz + .8, STEEL);
      trim.box(cx - .18, y, cz - .18, cx + .18, y + 16, cz + .18, STEEL); trim.box(cx - 1.6, y + 9, cz - .06, cx + 1.6, y + 9.12, cz + .06, STEEL);
    }
    beacons.push([cx, y + (detail ? 16.4 : 1), cz]);
    return { x1, x2, z1, z2, base, top: y, accent };
  }

  // ---------- Far towers: one box, hazed by distance ----------
  function farTower(x1, x2, z1, z2, h, haze) {
    stats.farTowers++;
    const body = mix([.62, .68, .8], FOG, haze), w = x2 - x1, d = z2 - z1;
    const face = (a, b, c, e, nx, nz, len) => { const u = Math.floor(rng() * 16) / 16; far.quad(a, b, c, e, nx, 0, nz, body, u, 0, u + len / 56, h / 56); };
    face([x1, 0, z2], [x2, 0, z2], [x2, h, z2], [x1, h, z2], 0, 1, w); face([x2, 0, z1], [x1, 0, z1], [x1, h, z1], [x2, h, z1], 0, -1, w);
    face([x2, 0, z2], [x2, 0, z1], [x2, h, z1], [x2, h, z2], 1, 0, d); face([x1, 0, z1], [x1, 0, z2], [x1, h, z2], [x1, h, z1], -1, 0, d);
    far.quad([x1, h, z2], [x2, h, z2], [x2, h, z1], [x1, h, z1], 0, 1, 0, mix([.03, .04, .06], FOG, haze), 0, 0, .001, .001);
    // A light line up one edge and a crown strip.
    const c = mix(hex(NEON[Math.floor(rng() * NEON.length)]), FOG, haze * .6);
    glowDistant.box(x1 - .3, h * .15, z2 - .3, x1 + .5, h, z2 + .5, c, { top: false }); glowDistant.box(x1, h - .8, z1, x2, h, z2, c, { top: false });
    if (rng() < .6) beacons.push([(x1 + x2) / 2, h + 2, (z1 + z2) / 2]);
  }
  function row(axis, fixed, from, to, depth, hMin, hMax, haze, outward) {
    for (let p = from; p < to;) {
      const len = 14 + rng() * 16, d = depth * (.7 + rng() * .5), h = hMin + rng() * (hMax - hMin), a = fixed, b = fixed + outward * d;
      if (axis === 'z') farTower(Math.min(a, b), Math.max(a, b), p, Math.min(to, p + len), h, haze); else farTower(p, Math.min(to, p + len), Math.min(a, b), Math.max(a, b), h, haze);
      p += len + 2 + rng() * 6;
    }
  }

  // ---------- Vertical neon blades and big adverts ----------
  const bladeWords = ['VESPER', 'NOVA', 'ORBITAL', 'SYNTH', 'HÔTEL', 'ARCADE', 'LUX', 'RAMEN', 'KOI', 'JANUS'];
  function blade(word, color, x, y, z, yaw, w, h) {
    const css = '#' + color.toString(16).padStart(6, '0');
    const tex = canvasTexture(T, 128, 512, (c, W, H) => {
      c.fillStyle = '#05070b'; c.fillRect(0, 0, W, H); c.strokeStyle = css; c.lineWidth = 6; c.strokeRect(6, 6, W - 12, H - 12);
      c.fillStyle = css; c.textAlign = 'center'; c.textBaseline = 'middle'; const n = word.length, step = (H - 40) / n; c.font = `900 ${Math.round(Math.min(92, step * .9))}px "Bahnschrift","Arial Narrow",system-ui,sans-serif`;
      c.shadowColor = css; c.shadowBlur = 18; for (let i = 0; i < n; i++) c.fillText(word[i], W / 2, 20 + step * (i + .5));
    });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false }), geo = new T.PlaneGeometry(w, h), holder = new T.Group();
    holder.position.set(x, y, z); holder.rotation.y = yaw; group.add(holder); stats.signs++;
    for (const side of [1, -1]) { const m = new T.Mesh(geo, mat); m.position.z = side * .16; m.rotation.y = side > 0 ? 0 : Math.PI; m.userData.webgpuShape = 'sign'; holder.add(m); }
    const frame = new T.Mesh(new T.BoxGeometry(w + .3, h + .3, .28), trimMat); frame.userData.webgpuShape = 'sign'; holder.add(frame);
    const arm = new T.Mesh(new T.BoxGeometry(1.2, .18, .18), trimMat); arm.position.set(x < 0 ? -(w / 2 + .5) : w / 2 + .5, h * .3, 0); holder.add(arm); const arm2 = arm.clone(); arm2.position.y = -h * .3; holder.add(arm2);
    if (!low && rng() < .5) animated.push(t => { mat.color.setScalar(Math.sin(t * 31 + x) > .96 ? .35 : 1); });
    reflections.push({ x, z, color, size: Math.min(9, h * .5) });
  }

  // ---------- Street level: reflections and light pools on the wet road ----------
  const reflections = [];
  const soft = canvasTexture(T, 64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  soft.wrapS = soft.wrapT = T.ClampToEdgeWrapping;
  function buildReflections() {
    const list = reflections.slice(0, low ? 24 : 80), mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: soft, transparent: true, opacity: low ? .2 : .3, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), list.length);
    const m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0)), p = new T.Vector3(), s = new T.Vector3(), c = new T.Color();
    list.forEach((r, i) => { mesh.setMatrixAt(i, m.compose(p.set(r.x, .035 + i * .0004, r.z), q, s.set(r.size * (r.long || 1), r.size, 1))); mesh.setColorAt(i, c.set(r.color)); });
    mesh.renderOrder = 3; mesh.frustumCulled = false; mesh.userData.webgpuShape = 'fx'; group.add(mesh); stats.reflections = list.length;
  }

  // ---------- Build ----------
  const built = PODIUM_TOWERS.map(([x1, x2, z1, z2, roof, top, tiers]) => tower(x1, x2, z1, z2, roof, top, tiers));
  // Skybridges: glazed box, trusses, a light strip underneath that paints the road.
  for (const b of SKYBRIDGES) {
    stats.bridges++; const a = hex(b.glow);
    facade.box(b.x1, b.y, b.z - 2.2, b.x2, b.y + FLOOR, b.z + 2.2, [.9, .95, 1], { facade: true, bottom: true, seed: stats.bridges });
    trim.box(b.x1, b.y - .5, b.z - 2.5, b.x2, b.y, b.z + 2.5, STEEL, { bottom: true }); trim.box(b.x1, b.y + FLOOR, b.z - 2.5, b.x2, b.y + FLOOR + .4, b.z + 2.5, DARK);
    for (let x = b.x1 + 3; x < b.x2 - 2; x += 6) { trim.box(x - .15, b.y - .5, b.z - 2.6, x + .15, b.y + FLOOR + .4, b.z - 2.3, STEEL); trim.box(x - .15, b.y - .5, b.z + 2.3, x + .15, b.y + FLOOR + .4, b.z + 2.6, STEEL); }
    glow.box(b.x1 + 1, b.y - .58, b.z - .25, b.x2 - 1, b.y - .5, b.z + .25, a, { top: false, bottom: true });
    for (let x = Math.max(b.x1, -12); x <= Math.min(b.x2, 12); x += 6) reflections.push({ x, z: b.z, color: b.glow, size: 9, long: 1.5 });
  }
  // Rings of towers outside the playable bounds (near ring detailed enough to read, far ring in the haze).
  const B = bounds;
  row('z', B.minX - 5, -124, 78, 24, 46, 120, .18, -1); row('z', B.maxX + 6, -24, 78, 22, 40, 110, .18, 1); row('z', 103, -128, -30, 26, 60, 130, .25, 1);
  row('x', B.maxZ + 6, -110, 110, 22, 44, 120, .18, 1);
  if (!low) { row('z', B.minX - 40, -160, 110, 34, 110, 230, .55, -1); row('z', 138, -160, 110, 34, 110, 240, .55, 1); row('x', B.maxZ + 40, -150, 150, 30, 100, 220, .55, 1); row('x', -236, -170, 170, 36, 150, 290, .62, -1); }

  // Neon blades on the faces that look at the avenue, adverts high on the towers.
  const blades = [[-30.4, 30, -8], [23.4, 34, -20], [-23.4, 40, -70], [22.4, 36, -84], [-14.4, 24, 22], [18.4, 22, 28], [-14.4, 31, 44], [23.4, 47, -6], [-23.4, 57, -84], [22.4, 53, -72]];
  blades.slice(0, low ? 5 : blades.length).forEach(([x, y, z], i) => blade(bladeWords[i % bladeWords.length], NEON[i % NEON.length], x, y, z, 0, 2.6, 13));
  if (advert) {
    const ads = [['janus', 22, 9, -31.7, 52, -12, Math.PI / 2], ['kitsune', 20, 8, 24.7, 58, -16, -Math.PI / 2], ['vesperTransit', 24, 9, -24.7, 70, -76, Math.PI / 2], ['koi', 18, 8, 23.7, 64, -78, -Math.PI / 2],
      ['nova', 16, 7, -15.7, 40, 32, Math.PI / 2], ['helix', 18, 6, 19.7, 36, 29, -Math.PI / 2], ['aegis', 14, 6, 0, 30.5, -9.6, 0], ['ordre', 16, 6, 0, 37.5, -75.6, 0]];
    for (const [name, w, h, x, y, z, yaw] of ads.slice(0, low ? 4 : ads.length)) { try { advert(name, { w, h, x, y, z, yaw }); stats.signs++; reflections.push({ x: Math.max(-11, Math.min(11, x)), z, color: 0xc7a8ff, size: 10 }); } catch { /* signage optional */ } }
  }
  // Light pools under the street lamps of the avenue (the sector's lamps, alternately warm and cold).
  for (let z = 58; z > -96; z -= 16) for (const s of [-1, 1]) reflections.push({ x: s * 9.2, z, color: s > 0 ? 0xffb070 : 0x9fdcff, size: 8 });

  // Lantern garlands across the avenue.
  for (const [z, y] of [[52, 7.4], [20, 7.8], [-54, 8.2], [-66, 7.6], [4, 8]].slice(0, low ? 2 : 5)) {
    const n = 14; for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 1) / n, x0 = -12.5 + u0 * 25, x1 = -12.5 + u1 * 25, sag = u => y - Math.sin(u * Math.PI) * 1.3;
      trim.box(x0, Math.min(sag(u0), sag(u1)) - .02, z - .02, x1, Math.max(sag(u0), sag(u1)) + .02, z + .02, DARK);
      if (k % 2) { const c = hex(NEON[(k >> 1) % 3]); glow.box(x0 - .11, sag(u0) - .36, z - .11, x0 + .11, sag(u0) - .06, z + .11, c, { bottom: true }); }
    }
    reflections.push({ x: 0, z, color: 0xff9a60, size: 7, long: 2.6 });
  }
  // Maglev beam hung on the western towers.
  const railX = B.minX - 4.2, railY = 17; trim.box(railX - .5, railY - .7, -128, railX + .5, railY, 78, STEEL, { bottom: true });
  for (let z = -120; z < 78; z += 14) trim.box(railX - .35, railY - 3, z - .35, railX - .05, railY - .7, z + .35, DARK);
  glow.box(railX + .5, railY - .5, -128, railX + .56, railY - .38, 78, hex(0x5fe0f0), { top: false });

  facadeMat.userData.webgpuPhysical = trimMat.userData.webgpuPhysical = rich;
  group.add(facade.mesh(facadeMat, 'façades vitrées'), trim.mesh(trimMat, 'corniches, pilastres, modules'), far.mesh(farMat, 'tours lointaines'), glow.mesh(glowMat, 'lignes lumineuses'), glowDistant.mesh(glowFar, 'lignes lumineuses lointaines'));
  stats.quads = facade.quads + trim.quads + far.quads + glow.quads + glowDistant.quads;
  buildReflections();

  // ---------- What moves ----------
  // Warning lights on the crowns: one instanced mesh, blinking in two groups.
  const beaconGeo = new T.SphereGeometry(.5, 8, 6), blink = [new T.MeshBasicMaterial({ color: 0xff2030, toneMapped: false, fog: false }), new T.MeshBasicMaterial({ color: 0xff2030, toneMapped: false, fog: false })];
  const dummy = new T.Object3D();
  blink.forEach((mat, g) => { const mine = beacons.filter((_, i) => i % 2 === g), mesh = new T.InstancedMesh(beaconGeo, mat, mine.length); mine.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.scale.setScalar(p[1] > 100 ? 1.6 : 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.frustumCulled = false; mesh.userData.webgpuShape = 'fx'; group.add(mesh); });
  animated.push(t => { blink[0].color.setRGB((t % 1.6) < .22 ? 1 : .12, .02, .03); blink[1].color.setRGB(((t + .8) % 1.6) < .22 ? 1 : .12, .02, .03); });

  // Flying traffic: lanes of lights between the towers (white one way, red the other).
  const LANES = [{ axis: 'z', at: -66, y: 46, from: -150, to: 100, dir: 1 }, { axis: 'z', at: 66, y: 62, from: -150, to: 100, dir: -1 }, { axis: 'x', at: -108, y: 40, from: -140, to: 140, dir: 1 }, { axis: 'x', at: 60, y: 54, from: -140, to: 140, dir: -1 },
    { axis: 'z', at: 0, y: 78, from: -170, to: 110, dir: 1 }, { axis: 'x', at: -44, y: 92, from: -150, to: 150, dir: -1 }];
  const perLane = low ? 7 : 18, lanes = low ? 3 : LANES.length, vehicles = [];
  for (let l = 0; l < lanes; l++) for (let i = 0; i < perLane; i++) vehicles.push({ lane: LANES[l], u: rng(), speed: (14 + rng() * 16), off: (rng() - .5) * 5, high: (rng() - .5) * 4 });
  const craft = new T.InstancedMesh(new T.BoxGeometry(.5, .32, 2.4), new T.MeshBasicMaterial({ toneMapped: false, fog: false }), vehicles.length); craft.frustumCulled = false; craft.userData.webgpuShape = 'fx'; group.add(craft);
  const col = new T.Color(); vehicles.forEach((v, i) => craft.setColorAt(i, col.set(v.lane.dir > 0 ? 0xfff0d0 : 0xff3040))); stats.vehicles = vehicles.length;
  animated.push((t, dt) => {
    vehicles.forEach((v, i) => { const L = v.lane, len = L.to - L.from; v.u = (v.u + v.speed * dt / len) % 1; const p = L.dir > 0 ? L.from + v.u * len : L.to - v.u * len;
      if (L.axis === 'z') { dummy.position.set(L.at + v.off, L.y + v.high, p); dummy.rotation.set(0, 0, 0); } else { dummy.position.set(p, L.y + v.high, L.at + v.off); dummy.rotation.set(0, Math.PI / 2, 0); }
      dummy.scale.setScalar(1); dummy.updateMatrix(); craft.setMatrixAt(i, dummy.matrix); });
    craft.instanceMatrix.needsUpdate = true;
  });

  // Maglev train: six lit cars passing along the western beam.
  const cars = new T.InstancedMesh(new T.BoxGeometry(2.2, 2.4, 9), new T.MeshBasicMaterial({ map: farMat.map, color: 0xbfd8ff, toneMapped: false }), 6); cars.frustumCulled = false; cars.userData.webgpuShape = 'fx'; group.add(cars);
  animated.push(t => { const cycle = (t * .055) % 1, head = 140 - cycle * 420; for (let i = 0; i < 6; i++) { dummy.position.set(railX + 1.7, railY + .6, head + i * 9.4); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix); } cars.instanceMatrix.needsUpdate = true; });

  // Searchlights from three crowns and the hologram ring above the tallest tower.
  if (!low) {
    const beamMat = new T.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: .055, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false });
    [[built[1], 0], [built[2], 2.1], [built[3], 4.2]].forEach(([b, phase]) => {
      const pivot = new T.Group(); pivot.position.set((b.x1 + b.x2) / 2, b.top + 2, (b.z1 + b.z2) / 2); group.add(pivot);
      const beam = new T.Mesh(new T.CylinderGeometry(9, .6, 150, 20, 1, true), beamMat); beam.position.y = 75; beam.userData.webgpuShape = 'fx'; pivot.add(beam);
      animated.push(t => { pivot.rotation.set(.55 + Math.sin(t * .13 + phase) * .25, t * .11 + phase, 0); });
    });
    const tall = built[2], ringMat = new T.MeshBasicMaterial({ color: 0xff4fa1, transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const halo = new T.Group(); halo.position.set((tall.x1 + tall.x2) / 2, tall.top + 24, (tall.z1 + tall.z2) / 2); group.add(halo);
    for (const [r, tube, tilt] of [[13, .22, 0], [10, .16, .9], [7, .12, -.7]]) { const ring = new T.Mesh(new T.TorusGeometry(r, tube, 8, 72), ringMat); ring.rotation.x = Math.PI / 2 + tilt; ring.userData.webgpuShape = 'fx'; halo.add(ring); }
    animated.push(t => { halo.rotation.y = t * .25; halo.children[1].rotation.z = t * .4; halo.children[2].rotation.z = -t * .55; ringMat.opacity = .6 + .15 * Math.sin(t * 2.3); });
  }

  // Steam from the gutters of the avenue.
  const steam = Array.from({ length: low ? 3 : 8 }, (_, i) => { const s = new T.Sprite(new T.SpriteMaterial({ map: soft, color: 0x9fb6c8, transparent: true, opacity: 0, depthWrite: false })); s.userData.at = [(i % 2 ? 11.2 : -11.2), 58 - i * 19]; s.userData.webgpuShape = 'fx'; group.add(s); return s; });
  animated.push(t => steam.forEach((s, i) => { const k = (t * .22 + i * .37) % 1; s.position.set(s.userData.at[0] + Math.sin(t * .7 + i) * .3, .3 + k * 4.2, s.userData.at[1]); s.scale.setScalar(1 + k * 3.4); s.material.opacity = .16 * Math.sin(k * Math.PI); }));

  return { group, stats: () => ({ ...stats }), update(t, dt) { for (const f of animated) f(t, dt); } };
}
