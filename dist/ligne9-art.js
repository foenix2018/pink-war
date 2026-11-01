// LIGNE 9 — dressing of « La Ligne Noyée » (ligne9-layout.js holds the playable geometry).
// A flooded 2189 metro station under the Halles-Basses: white metro tiles over a dirty lower band, worn floor
// tiles, concrete, rusted steel (Poly Haven CC0 textures, assets/ligne9). Underground lighting is a pool of a
// few point lights moved to the fixtures nearest to the camera, so that hundreds of tubes, cages and battery
// lamps light the scene with a fixed budget. Power states (off / emergency) drive tubes, ambient and fog.
// Magenta stays reserved to the phase signature of the JANUS-9 anchor (Tome II §22).
import { ROOMS, DOORS, WATER, STAIRS, LANDING, HEIGHTS, INTERACTIONS, roomAt } from './ligne9-layout.js';

import {createFunctionalProp} from './functional-props.js';
const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
const ceilingOf = r => !r ? 0 : r.id === 'rue' ? Infinity : r.ceiling;

function canvasTexture(T, w, h, paint, { repeat = false, color = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (color) t.colorSpace = T.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4; return t;
}

// Ambient (hemisphere) level per room look, with station power on (emergency regime) and off.
const AMBIENT = { street: [.55, .55], stairwell: [.3, .12], hall: [.36, .05], technical: [.24, .04], corridor: [.22, .04], aid: [.26, .04], market: [.36, .05],
  shelter: [.26, .07], platform: [.34, .05], service: [.16, .015], pumps: [.32, .04], lock: [.24, .04], lowtrack: [.18, .03], anchor: [.3, .3], control: [.22, .04], lift: [.2, .04] };

export function createLigne9Art(T, scene, { quality = 'normal', camera, assets = 'assets/ligne9/' } = {}) {
  const low = quality === 'low', rng = seeded(905);
  const root = new T.Group(); root.name = 'LIGNE 9'; scene.add(root);
  const animated = [], stats = { meshes: 0, instances: 0, textures: 0, fixtures: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Materials (textures stream in; colours stand in meanwhile) ----------
  const loader = new T.TextureLoader(), cache = new Map();
  const loadMap = (name, channel, srgb) => {
    const key = name + channel; if (cache.has(key)) return cache.get(key);
    const p = new Promise(resolve => loader.load(assets + 'l9-' + name + '_' + channel + '_512.jpg', tex => {
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = low ? 2 : 8; if (srgb) tex.colorSpace = T.SRGBColorSpace; stats.textures++; resolve(tex);
    }, undefined, () => resolve(null)));
    cache.set(key, p); return p;
  };
  const pbr = (name, { tile = 2, color = 0xffffff, roughness = 1, metalness = 0, normal = 1, label } = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness, name: label || name });
    m.userData.tile = tile;
    Promise.all([loadMap(name, 'diff', true), loadMap(name, 'nor', false), loadMap(name, 'rough', false)]).then(([d, n, r]) => {
      if (d) m.map = d; if (n) { m.normalMap = n; m.normalScale = new T.Vector2(normal, normal); } if (r) m.roughnessMap = r; m.needsUpdate = true;
    });
    return m;
  };
  const flat = (color, roughness = .6, metalness = .2, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const glow = (color, extra = {}) => new T.MeshBasicMaterial({ color, toneMapped: false, ...extra });
  const additive = (color, opacity = .6, map = null) => new T.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const M = {
    whiteTile: pbr('long_white_tiles', { tile: 1.6, color: 0xe4e0d6, label: 'carrelage métro' }),
    dirtyTile: pbr('dirty_tiles', { tile: 1.4, color: 0xb9b2a4, label: 'carrelage sale' }),
    floorTile: pbr('worn_tile_floor', { tile: 2.4, color: 0xb0aba2, roughness: .9, label: 'dallage usé' }),
    skid: pbr('anti_skid_tiles', { tile: 1.2, color: 0xd8c27a, label: 'bande d’éveil' }),
    plate: pbr('metal_plate', { tile: 2, color: 0x9aa0a4, metalness: .55, roughness: .8, label: 'tôle' }),
    grid: pbr('rusty_metal_grid', { tile: 1.5, color: 0x9d8f80, metalness: .5, label: 'caillebotis' }),
    shutter: pbr('rusted_shutter', { tile: 3, color: 0xb8aea0, metalness: .4, label: 'rideau rouillé' }),
    rust: pbr('green_metal_rust', { tile: 2.5, color: 0x9fb0a0, metalness: .45, label: 'acier vert rouillé' }),
    concrete: pbr('concrete_wall_006', { tile: 3, color: 0xa7a59f, label: 'béton' }),
    ceiling: pbr('concrete_wall_006', { tile: 4, color: 0x7d7b77, label: 'voûte' }),
    asphalt: pbr('concrete_wall_006', { tile: 2.5, color: 0x35383d, roughness: .55, metalness: .1, label: 'chaussée mouillée' }),
    trackbed: pbr('concrete_wall_006', { tile: 2, color: 0x3a3631, label: 'ballast' }),
    dark: flat(0x1c2126, .5, .6), steel: flat(0x6f777e, .35, .85), black: flat(0x0b0d10, .7, .3), rail: flat(0x8d8a86, .3, .95),
    wood: flat(0x5d4532, .85, 0), fabric: flat(0x4e5640, .95, 0), canvasRed: flat(0x7a3530, .95, 0, { side: T.DoubleSide }), canvasBlue: flat(0x2f4a63, .95, 0, { side: T.DoubleSide }),
    orange: flat(0xc05a26, .8, 0), yellow: flat(0xc9a227, .6, .1), glass: flat(0x7f98a8, .05, .6, { transparent: true, opacity: .22, depthWrite: false }),
    paper: flat(0xd9d2bf, .95, 0, { side: T.DoubleSide }), screenOff: flat(0x0c1216, .2, .3),
    helix: glow(0xff3a4c), cyan: glow(0x7fe7ff), amber: glow(0xffb35c), green: glow(0x3dff8a), red: glow(0xff3328), white: glow(0xf1f4f6), sodium: glow(0xffa64a), phase: glow(0xff46b9)
  };

  // ---------- Merged world geometry (one mesh per material, UVs in metres / material tile) ----------
  const geos = new Map();
  const bucket = m => { if (!geos.has(m)) geos.set(m, { p: [], n: [], u: [], i: [] }); return geos.get(m); };
  // Quad from corner o along edges U and V (normal U × V); UVs are the world position along U and V.
  function quad(m, o, U, V) {
    const g = bucket(m), tile = m.userData.tile || 2, lu = Math.hypot(...U), lv = Math.hypot(...V); if (lu < 1e-4 || lv < 1e-4) return;
    const uh = U.map(c => c / lu), vh = V.map(c => c / lv);
    const n = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]], ln = Math.hypot(...n);
    const base = g.p.length / 3;
    for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const p = [o[0] + U[0] * a + V[0] * b, o[1] + U[1] * a + V[1] * b, o[2] + U[2] * a + V[2] * b];
      g.p.push(...p); g.n.push(n[0] / ln, n[1] / ln, n[2] / ln);
      g.u.push((p[0] * uh[0] + p[1] * uh[1] + p[2] * uh[2]) / tile, (p[0] * vh[0] + p[1] * vh[1] + p[2] * vh[2]) / tile);
    }
    g.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Axis-aligned box; `skip` lists faces left out ('top', 'bottom', '+x', ...); `top` overrides the top material.
  function box(m, x1, x2, y1, y2, z1, z2, { skip = ['bottom'], top = m } = {}) {
    const a = x2 - x1, b = y2 - y1, c = z2 - z1, s = new Set(skip);
    if (!s.has('+x')) quad(m, [x2, y1, z2], [0, 0, -c], [0, b, 0]);
    if (!s.has('-x')) quad(m, [x1, y1, z1], [0, 0, c], [0, b, 0]);
    if (!s.has('+z')) quad(m, [x1, y1, z2], [a, 0, 0], [0, b, 0]);
    if (!s.has('-z')) quad(m, [x2, y1, z1], [-a, 0, 0], [0, b, 0]);
    if (!s.has('top')) quad(top, [x1, y2, z2], [a, 0, 0], [0, 0, -c]);
    if (!s.has('bottom')) quad(m, [x1, y1, z1], [a, 0, 0], [0, 0, c]);
  }
  const floorRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z2], [x2 - x1, 0, 0], [0, 0, -(z2 - z1)]);
  const ceilRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z1], [x2 - x1, 0, 0], [0, 0, z2 - z1]);
  function flushGeometry() {
    for (const [m, g] of geos) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(g.n, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(g.u, 2)); geo.setIndex(g.p.length / 3 > 65535 ? new T.Uint32BufferAttribute(g.i, 1) : new T.Uint16BufferAttribute(g.i, 1));
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, m); mesh.name = 'Ligne 9 / ' + (m.name || 'surface'); mesh.receiveShadow = true; add(mesh);
    }
    geos.clear();
  }

  // Instanced unit boxes for small repeated dressing: [x, y(bottom), z, sx, sy, sz, rotY].
  const cube = new T.BoxGeometry(1, 1, 1), boxes = new Map();
  const piece = (m, x, y, z, sx, sy, sz, ry = 0) => { if (!boxes.has(m)) boxes.set(m, []); boxes.get(m).push([x, y, z, sx, sy, sz, ry]); };
  function flushPieces() {
    const mat = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [m, list] of boxes) {
      const mesh = new T.InstancedMesh(cube, m, list.length); mesh.name = 'Ligne 9 / ' + (m.name || 'pièces');
      list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, mat.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; add(mesh); stats.instances += list.length;
    }
    boxes.clear();
  }
  const cylinder = (m, x, y, z, r, h, { axis = 'y', segments = 18, r2 = r } = {}) => {
    const c = new T.Mesh(new T.CylinderGeometry(r2, r, h, segments), m);
    c.position.set(x, y, z); if (axis === 'x') c.rotation.z = Math.PI / 2; if (axis === 'z') c.rotation.x = Math.PI / 2; return add(c);
  };

  // ---------- Canvas textures: signs, posters, papers, screens ----------
  const SIGN_FONT = 'system-ui,"Segoe UI",Arial,sans-serif';
  const signTex = (lines, { bg = '#0d3b5e', fg = '#f2f4f2', w = 512, h = 128, border = null, align = 'center', size = .42 } = {}) => canvasTexture(T, w, h, (c, W, H) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); } else c.clearRect(0, 0, W, H);
    if (border) { c.strokeStyle = border; c.lineWidth = Math.max(4, H * .05); c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth); }
    const rows = Array.isArray(lines) ? lines : [lines]; c.fillStyle = fg; c.textAlign = align; c.textBaseline = 'middle';
    rows.forEach((row, k) => {
      const px = Math.round(H * (k ? size * .5 : size) / Math.max(1, rows.length * .7)); c.font = `${k ? 700 : 900} ${px}px ${SIGN_FONT}`;
      c.fillText(row, align === 'left' ? W * .05 : W / 2, H * (rows.length === 1 ? .52 : (k + .8) / (rows.length + .6)), W * .92);
    });
  });
  const signs = [];
  // Signs are opaque unless see-through (graffiti): transparent planes would draw over the XR reading panel.
  function sign(tex, x, y, z, yaw, w, h, { lit = false, material = null, see = false } = {}) {
    const mat = material || (lit ? new T.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: see, alphaTest: see ? .05 : 0 })
      : new T.MeshStandardMaterial({ map: tex, roughness: .7, metalness: .05, transparent: see, alphaTest: see ? .05 : 0 }));
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat); mesh.position.set(x, y, z); mesh.rotation.y = yaw; add(mesh); signs.push(mesh); return mesh;
  }
  const paperTex = (title, seed) => canvasTexture(T, 128, 180, (c, w, h) => {
    const r = seeded(seed); c.fillStyle = '#e8e1cf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2b2b2b'; c.font = `800 11px ${SIGN_FONT}`; c.fillText(title, 8, 16, w - 16);
    c.fillStyle = 'rgba(40,40,40,.65)'; for (let y = 28; y < h - 10; y += 8) c.fillRect(8, y, (w - 16) * (.55 + r() * .45), 2);
    c.fillStyle = 'rgba(110,80,40,.25)'; c.beginPath(); c.arc(w * .75, h * .8, 18, 0, TAU); c.fill();
  });
  const lineMap = canvasTexture(T, 1024, 256, (c, w, h) => {
    c.fillStyle = '#efeae0'; c.fillRect(0, 0, w, h); c.fillStyle = '#123'; c.font = `900 34px ${SIGN_FONT}`; c.fillText('VESPER TRANSIT · LIGNE 9', 28, 46);
    c.strokeStyle = '#2a9bd6'; c.lineWidth = 14; c.beginPath(); c.moveTo(60, 150); c.lineTo(w - 60, 150); c.stroke();
    const stops = ['COURONNE', 'VESPER-CENTRE', 'TANNEURS', 'HALLES-BASSES', 'ORME', 'BAS-NIVEAUX'];
    stops.forEach((s, i) => {
      const x = 60 + i * (w - 120) / (stops.length - 1); c.fillStyle = s === 'HALLES-BASSES' ? '#d23' : '#fff'; c.strokeStyle = '#2a9bd6'; c.lineWidth = 6;
      c.beginPath(); c.arc(x, 150, 15, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#123'; c.font = `800 ${s === 'HALLES-BASSES' ? 22 : 18}px ${SIGN_FONT}`; c.textAlign = 'center'; c.fillText(s, x, 200); c.textAlign = 'left';
    });
    c.fillStyle = '#d23'; c.font = `800 18px ${SIGN_FONT}`; c.fillText('VOUS ÊTES ICI', 60 + 3 * (w - 120) / 5 - 62, 112);
    c.fillStyle = 'rgba(30,30,30,.55)'; c.font = `700 16px ${SIGN_FONT}`; c.fillText('Fermée par arrêté ORDRE du 17/11/2189', 28, 240);
  });
  const posterTex = (title, sub, bg, fg, mark) => canvasTexture(T, 256, 384, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.globalAlpha = .18; for (let i = 0; i < 9; i++) c.fillRect(0, i * 46, w, 22); c.globalAlpha = 1;
    if (mark) { c.strokeStyle = fg; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h * .38, 62, 0, TAU); c.stroke(); c.fillStyle = mark; c.fillRect(w / 2 - 40, h * .38 - 6, 80, 12); }
    c.fillStyle = fg; c.textAlign = 'center'; c.font = `900 38px ${SIGN_FONT}`; c.fillText(title, w / 2, h * .72, w - 20);
    c.font = `700 17px ${SIGN_FONT}`; c.fillText(sub, w / 2, h * .82, w - 20);
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 26; i++) c.fillRect(rng() * w, rng() * h, 2 + rng() * 30, 1 + rng() * 3);
  });
  const graffitiTex = (text, color) => canvasTexture(T, 512, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = color; c.font = `900 66px "Marker Felt","Comic Sans MS",${SIGN_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(w / 2, h / 2); c.rotate(-.05); c.fillText(text, 0, 0, w - 30); c.restore();
    c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${rng() * .6})`; c.fillRect(rng() * w, rng() * h, 2, 2); }
  });
  const hazardTex = canvasTexture(T, 128, 128, (c, w, h) => {
    c.fillStyle = '#d6a11c'; c.fillRect(0, 0, w, h); c.fillStyle = '#16181a';
    for (let k = -4; k < 8; k++) { c.beginPath(); c.moveTo(k * 32, 0); c.lineTo(k * 32 + 16, 0); c.lineTo(k * 32 + 16 + h, h); c.lineTo(k * 32 + h, h); c.fill(); }
  }, { repeat: true });
  const hazard = new T.MeshStandardMaterial({ map: hazardTex, roughness: .7, metalness: .2, name: 'hachures' });
  const windowTex = canvasTexture(T, 128, 256, (c, w, h) => {
    c.fillStyle = '#07090c'; c.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) if (rng() < .3) { c.fillStyle = rng() < .7 ? '#ffc780' : '#9fd8ff'; c.globalAlpha = .4 + rng() * .5; c.fillRect(k * 32 + 6, r * 32 + 7, 20, 18); }
    c.globalAlpha = 1;
  }, { repeat: true });
  const waterNormal = canvasTexture(T, 256, 256, (c, w, h) => {
    const height = new Float32Array(w * h), r = seeded(77);
    for (let k = 0; k < 60; k++) { const cx = r() * w, cy = r() * h, rad = 6 + r() * 34, amp = r() - .5;
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y) / rad; if (d > 1) continue; const px = (Math.floor(cx + x) + w) % w, py = (Math.floor(cy + y) + h) % h; height[py * w + px] += amp * (1 + Math.cos(d * Math.PI)) * .5; } }
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const hx = height[y * w + (x + 1) % w] - height[y * w + (x - 1 + w) % w], hy = height[((y + 1) % h) * w + x] - height[((y - 1 + h) % h) * w + x];
      const nx = -hx * 2, ny = -hy * 2, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * w + x) * 4;
      img.data[i] = (nx / l * .5 + .5) * 255; img.data[i + 1] = (ny / l * .5 + .5) * 255; img.data[i + 2] = (nz / l * .5 + .5) * 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { repeat: true, color: false });
  const glowDisc = canvasTexture(T, 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  // ---------- Fixtures and the light pool ----------
  // zone: 'station' (emergency regime after the switchboard), 'tunnel' (cut by ORDRE), 'battery' (always on,
  // weak), 'street', 'helix' (the anchor chamber has its own supply), 'spark' (live water), 'alarm' (escape).
  const fixtures = [], power = { station: 'off', tunnel: 'secours' };
  let liveWater = true, flooding = false, floodStart = 0;
  const fixture = (kind, x, y, z, { zone = 'station', color = 0xfff1d8, intensity = 9, range = 15, len = 1.2, axis = 'x', flicker = 0, room = roomAt(x, z) } = {}) => {
    const f = { kind, x, y, z, zone, color: new T.Color(color), intensity, range, len, axis, flicker, room, level: 0, phase: rng() * 100 }; fixtures.push(f); return f;
  };
  const tubeLine = (room, axis, fixed, from, to, step, y, opts = {}) => { for (let v = from; v <= to + 1e-6; v += step) fixture('tube', axis === 'x' ? v : fixed, y, axis === 'x' ? fixed : v, { axis, ...opts, room }); };
  function placeFixtures() {
    // Street: sodium lamps and the metro totem.
    for (const [x, z] of [[-6.6, -94], [6.6, -89]]) fixture('sodium', x, 10.5, z, { zone: 'street', color: 0xffa64a, intensity: 46, range: 24, room: 'rue' });
    fixture('neon', 0, 9.6, -86.6, { zone: 'street', color: 0x9fd8ff, intensity: 10, range: 10, room: 'rue' });
    // Stairwell and ticket hall.
    tubeLine('escalier', 'z', 0, -82, -73, 3, 8.9, { axis: 'z', flicker: .15, intensity: 40, range: 20 });
    for (const x of [-10, 0, 10]) tubeLine('hall', 'z', x, -69, -51, 4.5, 5.92, { axis: 'z', flicker: x === 10 ? .5 : .06, intensity: 28, range: 20 });
    fixture('tube', 21, 3.52, -61, { room: 'local', axis: 'x' });
    tubeLine('couloir1', 'z', 0, -45, -21, 4, 3.33, { axis: 'z', flicker: .08 });
    fixture('tube', 8, 3.12, -36, { room: 'secours', axis: 'x', color: 0xf2fff6 }); fixture('tube', 8, 3.12, -32, { room: 'secours', axis: 'x', color: 0xf2fff6 });
    tubeLine('couloir2', 'x', -20, 6, 38, 4, 3.33, { flicker: .1 });
    for (const z of [-38, -26, -14, -2]) for (const x of [48, 60, 72, 84]) fixture('hanging', x, 6.4, z, { room: 'halles', intensity: 46, range: 26, color: 0xffe2b8, flicker: (x + z) % 24 === 0 ? .45 : .04 });
    tubeLine('couloirE', 'z', 84, 5, 24, 4, 3.33, { axis: 'z', flicker: .3 });
    fixture('bulb', 91, 2.8, 15, { room: 'abri', zone: 'battery', color: 0xffc27a, intensity: 11, range: 11 });
    tubeLine('quai', 'x', 36, 34, 92, 6, 7.9, { intensity: 42, range: 24 }); tubeLine('quai', 'x', 58, 36, 90, 9, 7.9, { intensity: 34, range: 22, flicker: .2 });
    for (let x = 26; x >= -58; x -= 7) fixture('cage', x, 2.7, 34.35, { zone: 'tunnel', room: 'tunnel', color: 0xffd9a0, intensity: 14, range: 12, flicker: x < -30 ? .25 : .05 });
    fixture('tube', -18, 3.92, 42, { room: 'ventilation', axis: 'x', flicker: .4 });
    for (const x of [-86, -72]) for (const z of [26, 36, 46]) fixture('highbay', x, 13.2, z, { room: 'pompes', intensity: 90, range: 32, color: 0xfff0d6 });
    tubeLine('couloirEcluse', 'z', -76, 54, 62, 4, 3.33, { axis: 'z' });
    for (const z of [67, 75]) fixture('flood', -89.6, 7.5, z, { room: 'sas', intensity: 40, range: 24, color: 0xffe6c0 });
    for (const x of [-58, -50, -42]) fixture('cage', x, 4.8, 68.4, { room: 'voie', color: 0xffd9a0, intensity: 16, range: 13 });
    for (const [x, z] of [[-30, 66], [-30, 90], [10, 66], [10, 90]]) fixture('helixStrip', x, 11.6, z, { zone: 'helix', room: 'chambre', color: 0x9fefff, intensity: 70, range: 32 });
    fixture('tube', 30, 3.52, 82, { room: 'orme', axis: 'x', flicker: .25 }); fixture('tube', 34, 3.52, 90, { room: 'orme', axis: 'x' });
    fixture('tube', 47, 2.95, 86, { room: 'cabine', axis: 'z', color: 0xe8f2ff });
    // Battery emergency lamps (red) and live-water sparks.
    for (const [x, y, z] of [[0, 5.6, -71.6], [-15.6, 5.6, -60], [15.6, 5.6, -52], [0, 3.1, -30], [20, 3.1, -21.6], [40.4, 8, -20], [91.6, 8, -20], [84, 3.1, 4], [84, 7.4, 26.4],
      [31, 7.4, 30], [-59.6, 13, 36], [-93.6, 13, 30], [-76, 3.1, 58], [-61.6, 8.5, 66], [-41, 5.5, 72], [19.6, 10, 66], [32, 3.3, 77]])
      fixture('emergency', x, y, z, { zone: 'battery', color: 0xff3322, intensity: 3.2, range: 9 });
    for (const x of [-34, -24, -12, -4]) fixture('spark', x, 1.45, 36, { zone: 'spark', room: 'tunnel', color: 0x9fd8ff, intensity: 12, range: 9, flicker: 1 });
    for (const [x, z] of [[-60, 72], [-20, 62], [0, 94], [18, 74], [-78, 66]]) fixture('beacon', x, x === -78 ? 9 : z === 72 ? 5.6 : 11.3, z, { zone: 'alarm', color: 0xff2a1a, intensity: 18, range: 18 });
    stats.fixtures = fixtures.length;
  }
  // Is a fixture lit, and how strongly (before flicker)?
  function fixtureLevel(f, t) {
    if (f.zone === 'street' || f.zone === 'helix') return 1;
    if (f.zone === 'battery') return f.kind === 'emergency' ? (power.station === 'off' || f.room === 'tunnel' || flooding ? 1 : .35) : 1;
    if (f.zone === 'spark') return liveWater ? (Math.sin(t * 37 + f.phase) > .82 || Math.sin(t * 5.3 + f.phase * 3) > .97 ? 1 : 0) : 0;
    if (f.zone === 'alarm') return flooding ? .5 + .5 * Math.sin(t * 6 + f.phase) : 0;
    const state = f.zone === 'tunnel' ? power.tunnel : power.station;
    if (state !== 'secours') return 0;
    if (flooding && (f.room === 'chambre' || f.room === 'voie' || f.room === 'sas')) return .4;
    return f.zone === 'tunnel' ? .9 : .78;
  }
  const flickerOf = (f, t) => {
    if (!f.flicker) return 1;
    const n = Math.sin(t * 13.1 + f.phase) + Math.sin(t * 29.7 + f.phase * 1.7) * .6 + Math.sin(t * 2.1 + f.phase * .3) * 1.4;
    return n > 2.2 - f.flicker * 1.4 ? .08 : 1;
  };
  // Emissive bodies of the fixtures, instanced by shape.
  const fixtureMeshes = [];
  function buildFixtureMeshes() {
    const shapes = { tube: [1, .05, .12], hanging: [.7, .14, .7], cage: [.22, .22, .22], bulb: [.18, .18, .18], highbay: [.9, .2, .9], flood: [.25, .6, .9], helixStrip: [12, .08, .3],
      sodium: [.7, .14, .35], neon: [.1, .1, .1], emergency: [.3, .12, .12], spark: [.05, .05, .05], beacon: [.32, .26, .32] };
    const byKind = new Map();
    for (const f of fixtures) { if (!byKind.has(f.kind)) byKind.set(f.kind, []); byKind.get(f.kind).push(f); }
    const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3();
    for (const [kind, list] of byKind) {
      if (kind === 'spark' || kind === 'neon') continue;
      const mesh = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), list.length); mesh.name = 'Ligne 9 / luminaires ' + kind;
      list.forEach((f, i) => {
        const [sx, sy, sz] = shapes[kind] || [.3, .1, .3], len = kind === 'tube' ? f.len : sx;
        mesh.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q, f.axis === 'z' && kind !== 'helixStrip' ? s.set(sz, sy, len) : s.set(len, sy, sz)));
        mesh.setColorAt(i, new T.Color(0x111111));
        // Housing above each tube / lamp.
        if (kind === 'tube') piece(M.dark, f.x, f.y + .025, f.z, f.axis === 'z' ? .2 : f.len + .1, .06, f.axis === 'z' ? f.len + .1 : .2);
        if (kind === 'tube') {
          const alongZ = f.axis === 'z';
          for (const side of [-1, 1]) piece(M.steel, f.x + (alongZ ? 0 : side * (f.len / 2 - .03)), f.y - .045, f.z + (alongZ ? side * (f.len / 2 - .03) : 0), alongZ ? .18 : .07, .1, alongZ ? .07 : .18);
        }
        if (kind === 'hanging') { piece(M.dark, f.x, f.y + .1, f.z, .9, .18, .9); piece(M.dark, f.x, f.y + .26, f.z, .03, ROOM.halles.ceiling - f.y - .26, .03); }
        if (kind === 'cage') piece(M.dark, f.x, f.y - .14, f.z, .3, .05, .3);
        if (kind === 'highbay') piece(M.dark, f.x, f.y + .18, f.z, .5, ROOM.pompes.ceiling - f.y - .18, .5);
        if (kind === 'sodium') { piece(M.dark, f.x + (f.x < 0 ? -.6 : .6), f.y, f.z, 1.3, .12, .14); }
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += list.length;
      fixtureMeshes.push({ mesh, list });
    }
    // Street lamp posts.
    for (const f of fixtures.filter(f => f.kind === 'sodium')) piece(M.dark, f.x + (f.x < 0 ? -1.2 : 1.2), HEIGHTS.rue, f.z, .16, f.y - HEIGHTS.rue + .1, .16);
  }
  const POOL = low ? 4 : 7;
  const pool = Array.from({ length: POOL }, () => { const l = new T.PointLight(0xffffff, 0, 14, 1.6); l.castShadow = false; add(l, scene); return { light: l, fixture: null, level: 0 }; });
  const tmpColor = new T.Color();
  function updateLights(t, dt, eye) {
    for (const f of fixtures) f.level = fixtureLevel(f, t) * flickerOf(f, t);
    for (const { mesh, list } of fixtureMeshes) {
      list.forEach((f, i) => { const off = f.kind === 'emergency' ? .18 : .05; tmpColor.copy(f.color).multiplyScalar(Math.max(off * (f.kind === 'emergency' ? 1 : 0) + .04, f.level)); mesh.setColorAt(i, tmpColor); });
      mesh.instanceColor.needsUpdate = true;
    }
    // Choose the lit fixtures nearest to the eye (behind walls count less: same room first).
    const here = roomAt(eye.x, eye.z);
    const scored = fixtures.filter(f => f.level > .02).map(f => ({ f, d: Math.hypot(f.x - eye.x, f.y - eye.y, f.z - eye.z) * (f.room === here ? 1 : 1.8) / Math.sqrt(f.intensity / 9) }))
      .filter(s => s.d < 40).sort((a, b) => a.d - b.d).slice(0, POOL).map(s => s.f);
    const wanted = new Set(scored);
    for (const slot of pool) {
      if (slot.fixture && !wanted.has(slot.fixture)) slot.level = Math.max(0, slot.level - dt * 10);
      else if (slot.fixture) slot.level = Math.min(1, slot.level + dt * 8);
      if (slot.level <= 0) { slot.fixture = null; }
    }
    for (const f of scored) if (!pool.some(s => s.fixture === f)) { const free = pool.find(s => !s.fixture); if (free) { free.fixture = f; free.level = 0; } }
    for (const slot of pool) {
      const f = slot.fixture, l = slot.light;
      if (!f) { l.intensity = 0; continue; }
      l.position.set(f.x, f.y - .25, f.z); l.color.copy(f.color); l.distance = f.range; l.intensity = f.intensity * f.level * slot.level;
    }
  }

  // ---------- Ambient, fog ----------
  const hemi = new T.HemisphereLight(0x9fb2c4, 0x2a2622, .2); add(hemi, scene);
  scene.background = new T.Color(0x040507);
  scene.fog = new T.Fog(0x07090b, 4, 60);
  let ambient = .2, fogFar = 60;
  function updateAmbient(dt, eye) {
    const r = ROOM[roomAt(eye.x, eye.z)] || ROOM.hall, look = r.look, state = r.id === 'tunnel' ? power.tunnel : r.id === 'chambre' || r.id === 'rue' ? 'secours' : power.station;
    const [on, off] = AMBIENT[look] || [.15, .03];
    const target = (state === 'secours' ? on : off) * (flooding && ['chambre', 'voie', 'sas'].includes(r.id) ? .7 : 1);
    ambient += (target - ambient) * Math.min(1, dt * 2.2); hemi.intensity = ambient;
    const red = flooding && ['chambre', 'voie', 'sas', 'orme'].includes(r.id);
    hemi.color.lerp(tmpColor.set(red ? 0xff8a7a : r.id === 'rue' ? 0x8ea4c8 : r.id === 'chambre' ? 0xc8a8d8 : 0x9fb2c4), Math.min(1, dt * 2));
    const far = r.id === 'rue' ? 80 : state === 'secours' ? 62 : 34; fogFar += (far - fogFar) * Math.min(1, dt * 1.5); scene.fog.far = fogFar;
    scene.fog.color.lerp(tmpColor.set(r.id === 'rue' ? 0x0b1018 : red ? 0x140606 : 0x07090b), Math.min(1, dt * 2));
  }

  // ---------- Rooms: floors, ceilings ----------
  const pits = WATER.filter(w => !w.drainable);
  function subtractRect(area, hole) {
    if (hole.x2 <= area.x1 || hole.x1 >= area.x2 || hole.z2 <= area.z1 || hole.z1 >= area.z2) return [area];
    const h = { x1: Math.max(area.x1, hole.x1), x2: Math.min(area.x2, hole.x2), z1: Math.max(area.z1, hole.z1), z2: Math.min(area.z2, hole.z2) }, out = [];
    if (h.z1 > area.z1) out.push({ ...area, z2: h.z1 });
    if (h.z2 < area.z2) out.push({ ...area, z1: h.z2 });
    if (h.x1 > area.x1) out.push({ x1: area.x1, x2: h.x1, z1: h.z1, z2: h.z2 });
    if (h.x2 < area.x2) out.push({ x1: h.x2, x2: area.x2, z1: h.z1, z2: h.z2 });
    return out;
  }
  const FLOOR = { street: M.asphalt, stairwell: M.floorTile, hall: M.floorTile, technical: M.plate, corridor: M.floorTile, aid: M.floorTile, market: M.floorTile, shelter: M.concrete,
    platform: M.floorTile, service: M.concrete, pumps: M.concrete, lock: M.plate, lowtrack: M.trackbed, anchor: M.plate, control: M.floorTile, lift: M.grid };
  const CEIL = { hall: M.ceiling, corridor: M.whiteTile, platform: M.whiteTile, lift: M.plate };
  function buildRooms() {
    for (const r of ROOMS) {
      if (r.id === 'rue') continue;
      let parts = [{ x1: r.x1, x2: r.x2, z1: r.z1, z2: r.z2 }];
      if (r.id === 'escalier') parts = [{ x1: r.x1, x2: r.x2, z1: STAIRS[0].bottomZ, z2: r.z2 }];
      for (const w of pits) parts = parts.flatMap(p => subtractRect(p, w));
      for (const p of parts) floorRect(FLOOR[r.look] || M.concrete, p.x1, p.x2, p.z1, p.z2, 0);
      ceilRect(CEIL[r.look] || M.ceiling, r.x1, r.x2, r.z1, r.z2, r.ceiling);
    }
    // Platform edge: tactile strip and the white edge line along the flooded tracks.
    floorRect(M.skid, 30, 94, 43.1, 44, .004); piece(M.white, 62, 0, 43.05, 64, .006, .08);
    floorRect(M.skid, 30, 94, 52, 52.9, .004);
    // Street: wet asphalt on the slab, kerbs, the slab's front face behind the stair shaft.
    const s = STAIRS[0];
    for (const p of subtractRect({ x1: -8, x2: 8, z1: -97, z2: -84 }, { x1: s.x - s.halfWidth - .3, x2: s.x + s.halfWidth + .3, z1: s.topZ - LANDING, z2: s.topZ })) floorRect(M.asphalt, p.x1, p.x2, p.z1, p.z2, HEIGHTS.rue);
    for (const side of [-1, 1]) box(M.concrete, side < 0 ? -8 : 6.6, side < 0 ? -6.6 : 8, HEIGHTS.rue, HEIGHTS.rue + .16, -97, -84, { skip: ['bottom'] });
    floorRect(M.floorTile, s.x - s.halfWidth, s.x + s.halfWidth, s.topZ - LANDING, s.topZ, HEIGHTS.rue);
  }

  // ---------- Walls from the colliders, lintels over the doorways ----------
  const SURFACE = { tile: null, concrete: M.concrete, metal: M.plate };
  function wallBox(o, y1 = o.y || 0, y2 = (o.y || 0) + o.height) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
    if (o.look === 'facade') { box(M.concrete, x1, x2, y1, y2, z1, z2); return; }
    const m = SURFACE[o.surface];
    if (m) { box(m, x1, x2, y1, y2, z1, z2); return; }
    // Metro tiles: dirty lower band, white tiles above, a dark trim line between.
    const band = 1.25;
    if (y1 < band) box(M.dirtyTile, x1, x2, y1, Math.min(band, y2), z1, z2, { skip: ['bottom', 'top'] });
    if (y2 > band) box(M.whiteTile, x1, x2, Math.max(band, y1), y2, z1, z2, { skip: ['bottom'] });
    if (y1 < band && y2 > band) box(M.dark, x1 - .012, x2 + .012, band - .04, band + .04, z1 - .012, z2 + .012, { skip: ['bottom', 'top'] });
  }
  function buildWalls(collisions) {
    const lines = new Map();
    for (const o of collisions) {
      if (o.kind !== 'wall') continue; wallBox(o);
      const axis = o.hx > o.hz ? 'x' : 'z', fixed = axis === 'x' ? o.z : o.x, key = axis + ':' + fixed.toFixed(2);
      if (!lines.has(key)) lines.set(key, []); lines.get(key).push({ o, a: axis === 'x' ? o.x - o.hx : o.z - o.hz, b: axis === 'x' ? o.x + o.hx : o.z + o.hz });
    }
    for (const [key, spans] of lines) {
      const [axis, fixedText] = key.split(':'), fixed = +fixedText; spans.sort((p, q) => p.a - q.a);
      for (let k = 0; k + 1 < spans.length; k++) {
        const left = spans[k], right = spans[k + 1]; if (right.a - left.b < .2) continue;
        const centre = (left.b + right.a) / 2, height = Math.max(left.o.height, right.o.height);
        const d = DOORS.find(d => d.axis === axis && Math.abs(d.fixed - fixed) < .3 && Math.abs(d.centre - centre) < .5);
        const probe = s => axis === 'x' ? ROOM[roomAt(centre, fixed + s)] : ROOM[roomAt(fixed + s, centre)];
        const opening = d ? d.height : Math.min(ceilingOf(probe(.6)) || Infinity, ceilingOf(probe(-.6)) || Infinity);
        if (opening < height - .05) {
          const lintel = { ...left.o, ...(axis === 'x' ? { x: centre, hx: (right.a - left.b) / 2 } : { z: centre, hz: (right.a - left.b) / 2 }) };
          wallBox(lintel, opening, height);
        }
        // Door frame: steel jambs and head.
        if (d) {
          for (const at of [left.b, right.a]) axis === 'x' ? piece(M.dark, at, 0, fixed, .12, d.height, .36) : piece(M.dark, fixed, 0, at, .36, d.height, .12);
          axis === 'x' ? piece(M.dark, centre, d.height - .02, fixed, right.a - left.b + .24, .12, .36) : piece(M.dark, fixed, d.height - .02, centre, .36, .12, right.a - left.b + .24);
        }
      }
    }
    // Shaft cap above the hall ceiling, and the facade behind the street parapet.
    box(M.whiteTile, -3.3, 3.3, 6, 9, -72.15, -71.85);
    box(M.concrete, -8, -3.3, HEIGHTS.rue, 22, -83.8, -83.5); box(M.concrete, 3.3, 8, HEIGHTS.rue, 22, -83.8, -83.5); box(M.concrete, -3.3, 3.3, 9, 22, -83.8, -83.5);
    box(M.concrete, -3.45, 3.45, 9, 9.35, -86.2, -72); box(M.concrete, -3.3, 3.3, 7.2, 9, -86.2, -85.9);
    // Upper storeys of the street (beyond the colliders) with lit windows.
    const win = new T.MeshStandardMaterial({ color: 0x1a1d22, roughness: .5, metalness: .3, emissiveMap: windowTex, emissive: new T.Color(1, 1, 1), emissiveIntensity: .9 });
    const facade = (x1, z1, x2, z2, y1, y2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), g = new T.PlaneGeometry(len, y2 - y1), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 8, uv.getY(i) * (y2 - y1) / 16);
      windowTex.wrapS = windowTex.wrapT = T.RepeatWrapping;
      const mesh = new T.Mesh(g, win); mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); mesh.rotation.y = Math.atan2(-(z2 - z1), x2 - x1); add(mesh);
    };
    facade(-7.84, -84, -7.84, -97, 8, 34); facade(7.84, -97, 7.84, -84, 8, 34); facade(-8, -96.84, 8, -96.84, 8, 34); facade(8, -83.84, -8, -83.84, 11, 34);
  }

  // ---------- Stairs ----------
  function buildStairs() {
    const s = STAIRS[0], length = s.bottomZ - s.topZ, count = Math.round(length / .3), run = length / count;
    for (let i = 0; i < count; i++) {
      const z = s.bottomZ - (i + .5) * run, top = s.base + (s.height - s.base) * (i + 1) / count;
      box(M.floorTile, s.x - s.halfWidth, s.x + s.halfWidth, 0, top, z - run / 2, z + run / 2, { skip: ['bottom', '-x', '+x'] });
      piece(M.yellow, s.x, top - .015, z + run / 2 - .04, s.halfWidth * 2 - .1, .02, .06);
    }
    box(M.floorTile, s.x - s.halfWidth, s.x + s.halfWidth, 0, HEIGHTS.rue, s.topZ - LANDING, s.topZ, { skip: ['bottom', 'top', '-x', '+x'] });
    // Handrails along both cheek walls.
    for (const side of [-1, 1]) {
      const rail = new T.Mesh(new T.CylinderGeometry(.035, .035, Math.hypot(length, s.height) + .6, 8), M.steel);
      rail.position.set(s.x + side * (s.halfWidth - .12), s.height / 2 + .95, (s.bottomZ + s.topZ) / 2); rail.rotation.x = Math.PI / 2 + Math.atan2(s.height, length); add(rail);
    }
  }

  // ---------- Props from the colliders ----------
  const fans = [], pumpRotors = [], racks = [];
  function dress(o) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, y = o.y || 0, h = o.height, along = w >= d;
    // Functional silhouettes replace previous heavy box-based station props.
    // Machines with animation (pump motor, dynamic rack LEDs) remain specialized.
    const replacement={'ticket-machine':'ticket-machine',stretcher:'stretcher',cot:'cot',
      cabinet:'cabinet',table:'desk',desk:'desk',bench:'bench',kiosk:'kiosk',
      vending:'vending',winch:'winch'};
    if(replacement[o.kind]){
      const model=createFunctionalProp(T,replacement[o.kind],{w,d,h,low,M});
      model.position.set(o.x,y,o.z);add(model);
      if(o.kind==='vending')sign(signTex(['NOVA-KAÏ','PROTÉINES · 2 CR'],
        {bg:'#2a1408',fg:'#ffb35c',w:256,h:384}),o.x,y+H*.79,z2+.035,0,
        Math.min(1.25,w*.7),Math.min(.42,H*.21),{lit:true});
      return;
    }
    switch (o.kind) {
      case 'bollard': cylinder(M.dark, o.x, y + h / 2, o.z, .14, h); piece(M.yellow, o.x, y + h - .2, o.z, .3, .06, .3); break;
      case 'parapet': for (let x = x1; x <= x2 + 1e-6; x += 1.2) piece(M.steel, x, y, o.z, .06, h, .06); piece(M.steel, o.x, y + h - .05, o.z, w, .06, .08); piece(M.steel, o.x, y + .5, o.z, w, .04, .04); break;
      case 'booth': {
        box(M.dark, x1, x2, 0, 1.1, z1, z2, { skip: ['bottom'] }); box(M.dark, x1, x2, h - .2, h, z1, z2);
        piece(M.glass, o.x, 1.1, z2 - .02, w, h - 1.3, .03); piece(M.glass, o.x, 1.1, z1 + .02, w, h - 1.3, .03); piece(M.glass, x2 - .02, 1.1, o.z, .03, h - 1.3, d); piece(M.glass, x1 + .02, 1.1, o.z, .03, h - 1.3, d);
        for (const [px, pz] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) piece(M.steel, px, 1.1, pz, .08, h - 1.3, .08);
        sign(signTex('GUICHET', { bg: '#0d3b5e' }), x2 + .02, h - .45, o.z, Math.PI / 2, 2.6, .5); piece(M.wood, o.x - .6, 0, o.z + 1, .5, .55, .5);
        break;
      }
      case 'turnstiles':
        for (let x = x1 + .25; x < x2 - .1; x += 1) { piece(M.steel, x, y, o.z, .3, h, .9); piece(M.red, x, y + h, o.z + .3, .08, .02, .08); if (x + .5 < x2) piece(M.glass, x + .5, y + .35, o.z, .6, .55, .04); }
        break;
      case 'ticket-machine':
        box(M.steel, x1, x2, 0, h, z1, z2);
        piece(M.dark, x2 + .006, .92, o.z, .035, .72, .82);
        piece(M.screenOff, x2 + .025, 1.08, o.z, .018, .42, .6);
        piece(M.yellow, x2 + .01, 1.65, o.z, .03, .12, .8);
        piece(M.black, x2 + .015, .52, o.z, .025, .09, .38);
        for (const side of [-1, 1]) piece(M.dark, x2 + .015, .12, o.z + side * d * .4, .025, .22, .08);
        break;
      case 'stretcher':
        piece(M.steel, o.x, h * .35, o.z, w, .08, d);
        piece(M.orange, o.x, h - .12, o.z, w - .1, .1, d - .05);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          piece(M.steel, o.x + sx * (o.hx - .12), .06, o.z + sz * (o.hz - .12), .07, h - .18, .07);
          piece(M.dark, o.x + sx * (o.hx - .12), 0, o.z + sz * (o.hz - .12), .14, .12, .14);
        }
        break;
      case 'crates': if (o.surface === 'wood') { piece(M.wood, o.x, 0, o.z, w, h * .55, d); piece(M.wood, o.x + .1, h * .55, o.z - .05, w * .8, h * .45, d * .8, .3); }
        else {
          piece(M.rust, o.x, 0, o.z, w, h, d);
          piece(M.yellow, o.x, h * .6, o.z, w + .02, .06, d + .02);
          for (const side of [-1, 1]) {
            piece(M.dark, o.x + side * w * .42, .05, z2 + .015, w * .1, h - .1, .03);
            piece(M.steel, o.x + side * w * .25, h * .22, z2 + .03, .04, h * .25, .025);
          }
          piece(M.dark, o.x, h - .1, o.z, w + .02, .1, d + .02);
        } break;
      case 'cabinet': box(M.plate, x1, x2, 0, h, z1, z2); for (let k = -1; k <= 1; k++) piece(k ? M.amber : M.red, along ? o.x + k * .5 : x1 - .01, h * .8, along ? z2 + .01 : o.z + k * .5, .05, .05, .05); break;
      case 'cot': piece(M.steel, o.x, 0, o.z, w, h - .15, d); piece(M.fabric, o.x, h - .15, o.z, w - .05, .1, d - .05); piece(M.canvasBlue, o.x + .3, h - .05, o.z, w * .55, .06, d - .02); break;
      case 'table': piece(M.steel, o.x, h - .05, o.z, w, .05, d); for (const sx of [-1, 1]) for (const sz of [-1, 1]) piece(M.steel, o.x + sx * (o.hx - .06), 0, o.z + sz * (o.hz - .06), .05, h - .05, .05);
        piece(M.dark, o.x - .4, h, o.z, .6, .3, .35); piece(M.amber, o.x - .2, h + .2, o.z + .18, .05, .03, .01); break;
      case 'stall': {
        piece(M.wood, o.x, 0, o.z, w, h, d); piece(M.wood, o.x, h, o.z, w + .1, .05, d + .1);
        const awning = rng() < .5 ? M.canvasRed : M.canvasBlue;
        for (const sx of [-1, 1]) piece(M.steel, o.x + sx * (o.hx - .05), h, o.z + o.hz - .05, .05, 1.4, .05);
        piece(awning, o.x, h + 1.4, o.z + .25, w + .5, .04, d + 1); for (let k = 0; k < 4; k++) piece(rng() < .5 ? M.orange : M.wood, o.x - o.hx + .4 + k * .6, h + .05, o.z, .4, .2 + rng() * .25, .35, rng());
        break;
      }
      case 'kiosk': box(M.dark, x1, x2, 0, h, z1, z2); box(M.shutter, x1 - .02, x2 + .02, .1, h - .5, z1 - .02, z1, { skip: ['bottom', 'top'] }); piece(M.dark, o.x, h, o.z, w + .4, .12, d + .4); break;
      case 'pillar':
        if (o.surface === 'tile') { box(M.whiteTile, x1, x2, 0, h, z1, z2, { skip: ['bottom', 'top'] }); sign(signTex('HALLES-BASSES', { bg: '#0d3b5e' }), o.x, 2.4, z2 + .01, 0, 2.2, .45); sign(signTex('HALLES-BASSES', { bg: '#0d3b5e' }), o.x, 2.4, z1 - .01, Math.PI, 2.2, .45); }
        else box(M.concrete, x1, x2, 0, h, z1, z2, { skip: ['bottom', 'top'] });
        break;
      case 'bench': piece(M.steel, o.x, h - .08, o.z, w, .06, d); for (const sx of [-1, 1]) piece(M.dark, o.x + sx * (o.hx - .15), 0, o.z, .08, h - .08, d - .1); piece(M.steel, o.x, h, o.z - o.hz + .03, w, .45, .05); break;
      case 'vending': box(M.dark, x1, x2, 0, h, z1, z2); sign(signTex(['NOVA-KAÏ', 'PROTÉINES · 2 CR'], { bg: '#2a1408', fg: '#ffb35c', w: 256, h: 384 }), o.x, 1.15, z2 + .01, 0, 1.3, 1.6, { lit: true }); break;
      case 'barrier': box(hazard, x1, x2, 0, h, z1, z2); break;
      case 'cable-drum': { const c = cylinder(M.wood, o.x, .7, o.z, .75, .9, { axis: 'z' }); c.rotation.set(Math.PI / 2, 0, 0); cylinder(M.dark, o.x, .7, o.z, .45, .92, { axis: 'z' }); break; }
      case 'fan': {
        box(M.rust, x1, x2, 0, h, z1, z2); const ring = new T.Mesh(new T.TorusGeometry(Math.min(o.hx, h / 2) * .8, .06, 6, 28), M.dark); ring.position.set(o.x, h / 2, z1 - .05); add(ring);
        const blades = new T.Group(); blades.position.set(o.x, h / 2, z1 - .08);
        for (let k = 0; k < 5; k++) { const b = new T.Mesh(new T.BoxGeometry(.18, Math.min(o.hx, h / 2) * .75, .02), M.steel); b.position.y = Math.min(o.hx, h / 2) * .38; const arm = new T.Group(); arm.rotation.z = k / 5 * TAU; arm.add(b); blades.add(arm); }
        add(blades); fans.push(blades); break;
      }
      case 'pump': {
        box(M.concrete, x1, x2, 0, .4, z1, z2); cylinder(M.rust, o.x, 1.7, o.z, 1.95, 2.6, { segments: 28 }); cylinder(M.rust, o.x, 3.2, o.z, 1.2, .5, { segments: 24 });
        const motor=cylinder(M.dark,o.x,3.9,o.z,.9,1.1,{segments:low?12:24});
        cylinder(M.steel,o.x+2,1.3,o.z,.55,1.3,{axis:'x'});
        // Pumping housing now includes ribbed stator, visible flanges, valve
        // bonnet and a real outlet. Rotor reference is kept for game animation.
        for(let j=0;j<7;j++)cylinder(M.steel,o.x,3.55+j*.105,o.z,.93,.025,{segments:low?12:24});
        for(const side of [-1,1]){
          cylinder(M.dark,o.x+side*1.93,1.3,o.z,.66,.095,{axis:'x'});
          cylinder(M.steel,o.x+side*1.99,1.3,o.z,.46,.16,{axis:'x'});
          piece(M.steel,o.x+side*1.65,1.06,o.z,.13,.80,.13);
        }
        cylinder(M.steel,o.x,4.48,o.z,.15,.14,{segments:low?8:16});
        cylinder(M.rust,o.x,4.57,o.z,.09,.24,{segments:low?8:16});
        for(const side of [-1,1])piece(M.dark,o.x+side*.82,3.63,o.z,.12,.22,.16);
        const fanCap = new T.Group(); fanCap.position.set(o.x, 4.5, o.z); for (let k = 0; k < 6; k++) { const b = new T.Mesh(new T.BoxGeometry(1.4, .04, .16), M.steel); b.rotation.y = k / 6 * Math.PI; fanCap.add(b); } add(fanCap);
        pumpRotors.push({ cap: fanCap, motor, speed: 0 }); sign(signTex('POMPE ' + (pumpRotors.length), { bg: '#1d2a22', fg: '#e5dfb4', w: 256, h: 96 }), o.x + 1.97, 2.2, o.z, Math.PI / 2, 1.4, .5);
        break;
      }
      case 'desk': box(M.steel, x1, x2, 0, h - .1, z1, z2); piece(M.dark, o.x, h - .1, o.z, w, .1, d); break;
      case 'header-pipe': cylinder(M.rust, o.x, 1.2, o.z, .62, w, { axis: 'x', segments: 20 }); for (let x = x1 + .5; x <= x2; x += 2.6) { cylinder(M.steel, x, 1.2, o.z, .72, .12, { axis: 'x', segments: 20 }); piece(M.dark, x, 0, o.z, .3, .6, 1); } break;
      case 'winch': box(M.rust, x1, x2, 0, h * .6, z1, z2); cylinder(M.dark, o.x, h * .6 + .4, o.z, .4, w - .2, { axis: 'x' }); piece(M.yellow, o.x, h * .6, o.z, w + .02, .05, d + .02); break;
      case 'rack': {
        box(M.black, x1, x2, 0, h, z1, z2);
        const leds = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), 24), m = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(.05, .03, .01);
        for (let i = 0; i < 24; i++) { const face = i % 2 ? z2 + .01 : z1 - .01; m.compose(p.set(o.x - o.hx + .2 + (i % 12) * (w - .4) / 11, .4 + Math.floor(i / 2) % 6 * .32, face), q, s); leds.setMatrixAt(i, m); leds.setColorAt(i, new T.Color(i % 5 ? 0x7fe7ff : 0xff3a4c)); }
        leds.instanceMatrix.needsUpdate = true; leds.instanceColor.needsUpdate = true; add(leds); racks.push(leds);
        piece(M.helix, o.x, h - .25, z2 + .01, w * .4, .05, .01); break;
      }
      case 'scaffold': for (const sz of [-1, 1]) for (const sx of [-1, 1]) piece(M.yellow, o.x + sx * o.hx, 0, o.z + sz * o.hz, .06, 6, .06);
        for (const yy of [h, 3.2, 6]) piece(M.plate, o.x, yy - .05, o.z, w + .1, .05, d + .1); break;
      case 'anchor': buildAnchor(o); break;
      default: break;
    }
  }

  // ---------- The JANUS-9 anchor (revealed when the lock opens) ----------
  let anchorPower = .15, anchorTarget = .15, anchorParts = null;
  const anchorLight = new T.PointLight(0xff46b9, 0, 34, 1.4); anchorLight.position.set(-10, 6, 80); add(anchorLight, scene);
  function buildAnchor(o) {
    const g = new T.Group(); g.position.set(o.x, 0, o.z); root.add(g);
    const base = new T.Mesh(new T.CylinderGeometry(o.hx * 1.25, o.hx * 1.35, .8, 8), M.dark); base.position.y = .4; g.add(base);
    const seamTex = canvasTexture(T, 32, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { const gr = c.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, 'rgba(255,70,185,0)'); gr.addColorStop(.8, 'rgba(255,110,210,1)'); gr.addColorStop(1, 'rgba(255,70,185,0)'); c.fillStyle = gr; c.fillRect(w / 2 - 3, y, 6, 32); } }, { repeat: true });
    seamTex.repeat.set(8, 3);
    const core = new T.Mesh(new T.CylinderGeometry(o.hx * .62, o.hx * .9, o.height - .8, 8, 1, true), new T.MeshStandardMaterial({ color: 0x1b1f26, roughness: .35, metalness: .75, emissiveMap: seamTex, emissive: new T.Color(1, .28, .72), emissiveIntensity: .4, side: T.DoubleSide }));
    core.position.y = .8 + (o.height - .8) / 2; g.add(core);
    for (let k = 0; k < 4; k++) { const fin = new T.Mesh(new T.BoxGeometry(.25, o.height - 1.6, 1.4), M.steel); const a = k / 4 * TAU + Math.PI / 4; fin.position.set(Math.cos(a) * o.hx * .95, o.height / 2 + .2, Math.sin(a) * o.hx * .95); fin.rotation.y = -a; g.add(fin); }
    const heart = new T.Mesh(new T.CapsuleGeometry(.8, 3.2, 6, 14), M.phase); heart.position.y = 6; g.add(heart);
    const halo = new T.Mesh(new T.PlaneGeometry(9, 9), additive(0xff4fbf, .4, glowDisc)); halo.position.y = 6; g.add(halo);
    const rings = [2.2, 5.2, 8.6].map((yy, k) => { const r = new T.Mesh(new T.TorusGeometry(o.hx * 1.25, .1, 6, 40), M.phase); r.position.y = yy; r.rotation.x = Math.PI / 2; r.userData.speed = .4 + k * .3; g.add(r); return r; });
    // Cooling pipes from the anchor to the walls: the water ORDRE kept in the line was its coolant.
    for (const [ex, ez] of [[-40, 80], [20, 80], [-10, 96]]) {
      const len = Math.hypot(ex - o.x, ez - o.z), pipe = new T.Mesh(new T.CylinderGeometry(.28, .28, len, 10), M.rust);
      pipe.position.set((ex + o.x) / 2, 9.4, (ez + o.z) / 2); pipe.rotation.z = Math.PI / 2; pipe.rotation.y = -Math.atan2(ez - o.z, ex - o.x); add(pipe);
    }
    sign(signTex(['JANUS-9', 'HELIX · NŒUD JANUS-9 · MAINTENU'], { bg: '#e8ebee', fg: '#1a1d22', border: '#ff3a4c', w: 512, h: 160 }), o.x, 1.6, o.z + o.hz * 1.36, 0, 2.4, .75);
    g.traverse(m => { if (m.isMesh) stats.meshes++; });
    anchorParts = { core, heart, halo, rings, seamTex };
  }
  animated.push((t, dt, eye) => {
    if (!anchorParts) return;
    anchorPower += (anchorTarget - anchorPower) * Math.min(1, dt * .8);
    const { core, heart, halo, rings, seamTex } = anchorParts;
    seamTex.offset.y = -t * .3 * (.3 + anchorPower);
    core.material.emissiveIntensity = .15 + 1.6 * anchorPower * (.9 + .1 * Math.sin(t * 2.3));
    heart.scale.setScalar(.6 + .4 * anchorPower); halo.material.opacity = .45 * anchorPower * (.8 + .2 * Math.sin(t * 3)); halo.quaternion.copy(eye.quaternion);
    for (const r of rings) r.rotation.z += r.userData.speed * dt * (.2 + anchorPower);
    anchorLight.intensity = 40 * anchorPower * (.85 + .15 * Math.sin(t * 2.3));
  });

  // ---------- Doors ----------
  const doors = new Map();
  const SPEED = { fire: 1.3, glass: 1.8, shutter: .45, grille: .7, lock: 1 / 45, lift: 1 };
  function buildDoors() {
    for (const d of DOORS) {
      const g = new T.Group(); root.add(g);
      const across = d.axis === 'x', panels = [], w = d.width, h = d.height;
      const leaf = (m, width, height, thick, offset) => { const mesh = new T.Mesh(new T.BoxGeometry(across ? width : thick, height, across ? thick : width), m); mesh.position.set(across ? d.centre + offset : d.fixed, height / 2, across ? d.fixed : d.centre + offset); g.add(mesh); stats.meshes++; return mesh; };
      if (d.style === 'fire') {
        const p = leaf(M.plate, w, h, .08, 0); p.userData = { slide: w, dir: 1, base: d.centre }; panels.push(p);
        const bar = leaf(M.steel, w * .7, .06, .14, 0); bar.position.y = 1.05; bar.userData = { slide: w, dir: 1, base: d.centre }; panels.push(bar);
      } else if (d.style === 'glass' || d.style === 'lift') {
        for (const dir of [-1, 1]) { const p = leaf(d.style === 'glass' ? M.glass : M.plate, w / 2, h, .06, dir * w / 4); p.userData = { slide: w / 2, dir, base: d.centre + dir * w / 4 }; panels.push(p); }
      } else if (d.style === 'shutter' || d.style === 'grille') {
        const p = leaf(d.style === 'shutter' ? M.shutter : M.grid, w, h, .06, 0); p.userData = { lift: h - .25 }; panels.push(p);
      } else if (d.style === 'lock') {
        for (const dir of [-1, 1]) {
          const p = leaf(M.rust, w / 2, h, .7, dir * w / 4); p.userData = { slide: w / 2 - .3, dir, base: d.centre + dir * w / 4 }; panels.push(p);
          const stripe = leaf(hazard, .3, h, .74, dir * .15); stripe.userData = { slide: w / 2 - .3, dir, base: d.centre + dir * .15 }; panels.push(stripe);
        }
      }
      // Status lamp beside gated doors.
      let lamp = null;
      if (!d.open) {
        lamp = new T.Mesh(new T.BoxGeometry(.12, .12, .12), new T.MeshBasicMaterial({ color: 0xff3328, toneMapped: false }));
        lamp.position.set(across ? d.centre + w / 2 + .35 : d.fixed + (d.fixed > 0 ? -.22 : .22), 1.5, across ? d.fixed + .22 : d.centre + w / 2 + .35); g.add(lamp);
      }
      doors.set(d.id, { d, panels, lamp, state: d.open ? 'auto' : 'closed', open: 0 });
    }
  }
  function updateDoors(dt, player) {
    for (const door of doors.values()) {
      const { d } = door;
      let target = 0;
      if (door.state === 'open') target = 1;
      else if (door.state === 'opening') target = 1;
      else if (door.state === 'auto') { const dx = d.axis === 'x' ? player.x - d.centre : player.x - d.fixed, dz = d.axis === 'x' ? player.z - d.fixed : player.z - d.centre; target = Math.hypot(dx, dz) < 4.2 ? 1 : 0; }
      const speed = door.state === 'opening' ? SPEED.lock : (SPEED[d.style] || 1) * (d.style === 'lock' ? 12 : 1);
      door.open += Math.sign(target - door.open) * Math.min(Math.abs(target - door.open), dt * speed);
      for (const p of door.panels) {
        const u = p.userData;
        if (u.lift) p.position.y = d.height / 2 + u.lift * door.open;
        else if (d.axis === 'x') p.position.x = u.base + u.dir * u.slide * door.open; else p.position.z = u.base + u.dir * u.slide * door.open;
      }
      if (door.lamp) door.lamp.material.color.set(door.state === 'closed' ? 0xff3328 : door.state === 'opening' ? 0xffb35c : 0x3dff8a);
    }
  }

  // ---------- Water ----------
  const waters = new Map();
  function buildWater() {
    waterNormal.repeat.set(1, 1);
    for (const w of WATER) {
      const mat = new T.MeshStandardMaterial({ color: w.live ? 0x0c1a20 : 0x0a1316, roughness: .06, metalness: .1, transparent: true, opacity: .9, normalMap: waterNormal, normalScale: new T.Vector2(.35, .35), depthWrite: true });
      const geo = new T.PlaneGeometry(w.x2 - w.x1, w.z2 - w.z1), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w.x2 - w.x1) / 6, uv.getY(i) * (w.z2 - w.z1) / 6);
      const mesh = new T.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set((w.x1 + w.x2) / 2, w.level, (w.z1 + w.z2) / 2); add(mesh);
      waters.set(w.id, { w, mesh, level: w.level, target: w.level, hideBelow: w.drainable ? -.05 : -Infinity });
      if (!w.drainable) {
        // A pit: walls down to the bed, debris or rails on the bed.
        const bed = w.id === 'voies' ? -1.45 : -w.depth;
        for (const [ax1, ax2, az1, az2] of [[w.x1, w.x2, w.z1 - .02, w.z1], [w.x1, w.x2, w.z2, w.z2 + .02], [w.x1 - .02, w.x1, w.z1, w.z2], [w.x2, w.x2 + .02, w.z1, w.z2]]) box(M.concrete, ax1, ax2, bed, 0, az1, az2, { skip: ['top', 'bottom'] });
        floorRect(M.trackbed, w.x1, w.x2, w.z1, w.z2, bed);
        if (w.id === 'voies') {
          for (const z of [46.3, 47.8, 48.6, 50.1]) piece(M.rail, (w.x1 + w.x2) / 2, bed + .14, z, w.x2 - w.x1, .14, .08);
          for (let x = w.x1 + .4; x < w.x2; x += .65) { piece(M.wood, x, bed, 47.05, .22, .14, 2.4); piece(M.wood, x, bed, 49.35, .22, .14, 2.4); }
          piece(M.dark, (w.x1 + w.x2) / 2, bed, 44.7, w.x2 - w.x1, .5, .5);
        } else {
          for (let k = 0; k < 18; k++) piece(k % 3 ? M.concrete : M.floorTile, w.x1 + 1 + rng() * (w.x2 - w.x1 - 2), bed, w.z1 + 1 + rng() * (w.z2 - w.z1 - 2), .8 + rng() * 2.6, .3 + rng() * 1.6, .8 + rng() * 2.2, rng() * 3);
          // Broken slab edges leaning into the collapse and hazard tape posts around it.
          for (let k = 0; k < 6; k++) { const s = new T.Mesh(new T.BoxGeometry(2.4, .25, 1.6), M.floorTile); s.position.set(w.x1 + 2 + k * 3.2, -.5, k % 2 ? w.z1 + .9 : w.z2 - .9); s.rotation.set((k % 2 ? 1 : -1) * .5, rng(), 0); add(s); }
          for (let x = w.x1; x <= w.x2; x += 2.5) for (const z of [w.z1 - .6, w.z2 + .6]) piece(M.yellow, x, 0, z, .06, 1, .06);
          for (const z of [w.z1 - .6, w.z2 + .6]) piece(hazard, (w.x1 + w.x2) / 2, .9, z, w.x2 - w.x1, .08, .01);
          for (let z = w.z1; z <= w.z2; z += 2.5) for (const x of [w.x1 - .6, w.x2 + .6]) piece(M.yellow, x, 0, z, .06, 1, .06);
          for (const x of [w.x1 - .6, w.x2 + .6]) piece(hazard, x, .9, (w.z1 + w.z2) / 2, .01, .08, w.z2 - w.z1);
          // The pink glow under the slabs the market woman saw: a phase leak from the anchor's conduit.
          const leak = new T.Mesh(new T.PlaneGeometry(9, 9), additive(0xff46b9, .14, glowDisc)); leak.rotation.x = -Math.PI / 2; leak.position.set(66, w.level - .35, -22); add(leak);
          animated.push(t => { leak.material.opacity = .08 + .07 * (.5 + .5 * Math.sin(t * .9)); });
        }
      }
    }
  }
  function updateWater(t, dt) {
    waterNormal.offset.set(t * .012, t * .007);
    for (const v of waters.values()) {
      // Drainable bodies empty in about five seconds; the flooded tracks drop slowly while the P9 pumps run.
      const speed = v.w.drainable ? .36 : .12; v.level += Math.sign(v.target - v.level) * Math.min(Math.abs(v.target - v.level), dt * speed);
      v.mesh.position.y = v.level; v.mesh.visible = v.level > v.hideBelow;
    }
  }

  // ---------- Escape flood: water rising over the chamber, the low track and the lock ----------
  const floodPlanes = [];
  function buildFlood() {
    for (const id of ['chambre', 'voie', 'sas']) {
      const r = ROOM[id], mat = new T.MeshStandardMaterial({ color: 0x0b1518, roughness: .05, metalness: .1, transparent: true, opacity: .82, normalMap: waterNormal, normalScale: new T.Vector2(.5, .5) });
      const mesh = new T.Mesh(new T.PlaneGeometry(r.x2 - r.x1, r.z2 - r.z1), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set((r.x1 + r.x2) / 2, -.05, (r.z1 + r.z2) / 2); mesh.visible = false; add(mesh);
      floodPlanes.push(mesh);
    }
  }
  animated.push(t => {
    const rise = flooding ? Math.min(.55, .02 + (t - floodStart) * .0035) : 0;
    for (const p of floodPlanes) { p.visible = flooding; p.position.y = rise; }
  });

  // ---------- Interaction devices and documents ----------
  const devices = new Map();
  function nearestWall(collisions, x, z) {
    let best = null;
    for (const o of collisions) {
      if (!['wall', 'desk', 'table', 'booth', 'stall'].includes(o.kind)) continue;
      const dx = Math.max(Math.abs(x - o.x) - o.hx, 0), dz = Math.max(Math.abs(z - o.z) - o.hz, 0), dist = Math.hypot(dx, dz);
      if (dist < 3.2 && (!best || dist < best.dist)) best = { o, dist, dx, dz };
    }
    if (!best) return null;
    const { o } = best, ex = x - o.x, ez = z - o.z;
    // Face of the box the point looks at, and the yaw that faces out of it.
    if (Math.abs(ex) - o.hx > Math.abs(ez) - o.hz) { const sx = Math.sign(ex); return { o, x: o.x + sx * (o.hx + .01), z: Math.max(o.z - o.hz + .3, Math.min(o.z + o.hz - .3, z)), yaw: sx > 0 ? Math.PI / 2 : -Math.PI / 2, top: o.y + o.height }; }
    const sz = Math.sign(ez); return { o, x: Math.max(o.x - o.hx + .3, Math.min(o.x + o.hx - .3, x)), z: o.z + sz * (o.hz + .01), yaw: sz > 0 ? 0 : Math.PI, top: o.y + o.height };
  }
  function buildDevices(collisions) {
    let seed = 1;
    for (const it of INTERACTIONS) {
      const at = nearestWall(collisions, it.x, it.z) || { x: it.x, z: it.z, yaw: 0, top: 1 }, g = new T.Group();
      g.position.set(at.x, 0, at.z); g.rotation.y = at.yaw; root.add(g);
      const part = (m, sx, sy, sz, px, py, pz) => { const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m); mesh.position.set(px, py, pz); g.add(mesh); stats.meshes++; return mesh; };
      const lamp = new T.Mesh(new T.BoxGeometry(.07, .07, .04), new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false })); g.add(lamp);
      let moving = null;
      const onTable = at.o && ['desk', 'table', 'stall'].includes(at.o.kind);
      if (it.log) {
        const paper = new T.Mesh(new T.PlaneGeometry(.34, .46), new T.MeshStandardMaterial({ map: paperTex(it.label.replace(/^LIRE (L’|LE |LA )?/, ''), seed++), roughness: .9, side: T.DoubleSide }));
        if (onTable) { paper.rotation.x = -Math.PI / 2; paper.rotation.z = rng() - .5; paper.position.set(0, at.top + .005, -.25); }
        else { paper.position.set(0, 1.45, .012); paper.rotation.z = (rng() - .5) * .12; part(M.red, .03, .03, .02, 0, 1.66, .02); }
        g.add(paper); lamp.position.set(.22, onTable ? at.top + .03 : 1.62, onTable ? -.25 : .02); lamp.scale.setScalar(.5);
      } else if (it.id.startsWith('vanne')) {
        cylinderIn(g, M.rust, 0, 1.8, .35, .22, 3.6); const wheel = new T.Mesh(new T.TorusGeometry(.32, .035, 6, 20), M.red); wheel.position.set(0, 1.25, .6); g.add(wheel);
        for (let k = 0; k < 3; k++) { const spoke = new T.Mesh(new T.BoxGeometry(.6, .03, .03), M.red); spoke.rotation.z = k / 3 * Math.PI; wheel.add(spoke); }
        part(M.steel, .1, .1, .3, 0, 1.25, .42); moving = wheel; lamp.position.set(.3, 1.7, .25);
        const plate = new T.Mesh(new T.PlaneGeometry(.5, .18), new T.MeshStandardMaterial({ map: signTex(it.id.replace('vanne-', 'VANNE '), { bg: '#c9a227', fg: '#16181a', w: 256, h: 96 }) })); plate.position.set(0, 2.1, .02); g.add(plate);
      } else if (it.id.startsWith('preuve')) {
        part(M.black, .9, 1.2, .25, 0, .6, .13); const screen = new T.Mesh(new T.PlaneGeometry(.75, .45), new T.MeshBasicMaterial({ map: signTex(['HELIX · JOURNAL', it.id === 'preuve-1' ? 'NŒUD 9-B · ARCHIVES' : 'ORDRE · ORDRES DE MAINTIEN'], { bg: '#04161c', fg: '#7fe7ff', w: 512, h: 300 }), toneMapped: false }));
        screen.position.set(0, 1.45, .26); screen.rotation.x = -.15; g.add(screen); lamp.position.set(.36, 1.15, .27);
      } else if (it.id === 'relais-orme') {
        if (!onTable) { at.top = 1; part(M.steel, 1, .05, .55, 0, .975, -.28); part(M.steel, .05, .95, .05, -.45, .475, -.5); part(M.steel, .05, .95, .05, .45, .475, -.5); }
        part(M.dark, .7, .45, .4, 0, at.top + .225, -.3); part(M.amber, .3, .08, .01, -.1, at.top + .3, -.09); const ant = new T.Mesh(new T.CylinderGeometry(.01, .01, 1.2, 4), M.steel); ant.position.set(.25, at.top + 1.05, -.35); g.add(ant);
        lamp.position.set(.25, at.top + .35, -.09);
      } else if (it.id === 'pupitre-p9') {
        const gauges = new T.Mesh(new T.PlaneGeometry(2.6, .5), new T.MeshStandardMaterial({ map: signTex(['P9 · DÉBIT  PRESSION  NIVEAU', '▮▮▯▯   ▮▯▯▯   ▮▮▮▮'], { bg: '#20262a', fg: '#e5dfb4', w: 512, h: 120 }), emissive: new T.Color(.2, .18, .1) }));
        gauges.rotation.x = -.9; gauges.position.set(0, at.top + .14, -.25); g.add(gauges); part(M.red, .14, .1, .14, .9, at.top + .05, .2); lamp.position.set(-1.1, at.top + .05, .3);
      } else {
        // Wall boxes: switchboard, relays, pump A panel, lock control.
        const big = it.id === 'tableau' || it.id === 'ecluse';
        part(M.plate, big ? 1.1 : .6, big ? 1.5 : .8, .22, 0, 1.4, .11);
        const lever = part(M.red, .06, .4, .06, big ? .35 : .18, 1.4, .26); moving = lever;
        part(M.dark, big ? .6 : .3, .25, .01, -.1, 1.75, .23); lamp.position.set(big ? -.35 : -.18, 1.05, .23);
        if (it.id.startsWith('relais')) { piece(M.dark, at.x, 0, at.z, .08, 1.0, .08); }
        if (it.id === 'pompe-a') {
          cylinderIn(g, M.rust, -.9, 1.5, .25, .3, 3);
          const plate = new T.Mesh(new T.PlaneGeometry(.6, .22), new T.MeshStandardMaterial({ map: signTex('POMPE A', { bg: '#c9a227', fg: '#16181a', w: 256, h: 96 }) })); plate.position.set(0, 2.05, .23); g.add(plate);
        }
      }
      devices.set(it.id, { it, g, lamp, moving, done: false, available: false, turn: 0 });
    }
  }
  function cylinderIn(g, m, x, y, z, r, h) { const c = new T.Mesh(new T.CylinderGeometry(r, r, h, 14), m); c.position.set(x, y, z); g.add(c); stats.meshes++; return c; }
  function updateDevices(t, dt) {
    for (const v of devices.values()) {
      const blink = .5 + .5 * Math.sin(t * 5);
      v.lamp.material.color.set(v.done ? 0x3dff8a : v.it.log ? 0xfff2c8 : v.available ? (blink > .5 ? 0xffb35c : 0x5a3a14) : 0x2a1a10);
      if (v.it.log && !v.done) v.lamp.material.color.set(blink > .3 ? 0xfff2c8 : 0x6a6250);
      if (v.done && v.moving && v.turn < 1) { v.turn = Math.min(1, v.turn + dt * .8); if (v.it.id.startsWith('vanne')) v.moving.rotation.z = -v.turn * TAU * 2; else v.moving.rotation.x = -v.turn * 1.1; }
    }
  }

  // ---------- Signage, posters, graffiti, scattered belongings ----------
  function buildSigns() {
    const blue = (lines, w = 1024, h = 160) => signTex(lines, { bg: '#0d3b5e', fg: '#f2f4f2', w, h });
    const exit = signTex(['⇠ SORTIE'], { bg: '#0f7a3e', fg: '#f4fff6', w: 256, h: 96 });
    // Street entrance: metro frieze and totem, ORDRE closure barrier.
    sign(signTex(['MÉTRO · LIGNE 9', 'HALLES-BASSES'], { bg: '#0d3b5e', w: 1024, h: 256 }), 0, 8.1, -86.25, Math.PI, 6.4, 1.6, { lit: true });
    sign(signTex('ZONE FERMÉE · ARRÊTÉ ORDRE 17/11/2189', { bg: '#c9a227', fg: '#16181a', w: 1024, h: 96 }), 0, 7.05, -86.22, Math.PI, 5.4, .3);
    // The ORDRE closure barrier, pushed aside against the facade.
    piece(hazard, -6.2, HEIGHTS.rue + .8, -88.5, 2.6, .14, .06, .5); for (const x of [-7.3, -5.1]) piece(M.dark, x, HEIGHTS.rue, -88.5 + (x + 6.2) * -.5, .1, 1, .1);
    sign(signTex(['PHARMACIE', 'ÉPARS · OUVERT LA NUIT'], { bg: '#0a1f14', fg: '#3dff8a', w: 512, h: 192 }), -7.83, HEIGHTS.rue + 3.8, -92, Math.PI / 2, 3, 1.1, { lit: true });
    sign(signTex(['SOMNIA', 'DORMEZ CERTIFIÉ'], { bg: '#120c24', fg: '#9f8cff', w: 512, h: 192 }), 7.83, HEIGHTS.rue + 5.2, -94, -Math.PI / 2, 3.4, 1.3, { lit: true });
    sign(graffitiTex('ILS ONT NOYÉ LA 9', '#e8e2d0'), 7.82, HEIGHTS.rue + 1.7, -89, -Math.PI / 2, 3.2, 1, { see: true });
    // Ticket hall.
    sign(blue(['HALLES-BASSES']), 0, 5, -48.17, Math.PI, 8, 1.25); sign(blue(['HALLES-BASSES']), -15.82, 4.2, -60, Math.PI / 2, 8, 1.25);
    sign(blue(['↓ CORRESPONDANCE · QUAI 9 · DIRECTION ORME'], 1024, 96), 0, 4, -48.18, Math.PI, 5, .48, { lit: true });
    sign(lineMap, 15.82, 2.1, -52, -Math.PI / 2, 4, 1);
    sign(signTex(['↑ SORTIE', 'RUE DES TANNEURS'], { bg: '#0f7a3e', fg: '#f4fff6', w: 512, h: 160 }), 0, 5.4, -71.8, 0, 3, .9, { lit: true });
    sign(posterTex('HELIX', 'JANUS VOUS RELIE', '#e8ebee', '#1a1d22', '#ff3a4c'), -15.82, 1.8, -67, Math.PI / 2, 1.2, 1.8);
    sign(posterTex('ORDRE', 'LA SÉCURITÉ EST UN DEVOIR', '#1a1d22', '#e7c45a', null), 15.82, 1.8, -68, -Math.PI / 2, 1.2, 1.8);
    sign(signTex(['LOCAL TECHNIQUE', 'ACCÈS RÉSERVÉ'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), 15.82, 3.1, -62, -Math.PI / 2, 1.6, .5);
    sign(signTex(['PORTE DE SERVICE', 'OUVERTURE ÉLECTRIQUE'], { bg: '#7a1d1d', fg: '#f4f2ee', w: 512, h: 160 }), 0, 3.4, -48.19, Math.PI, 1.6, .5);
    // Corridors and the aid post.
    sign(blue(['→ HALLES-BASSES · QUAI 9'], 1024, 96), -1.82, 2.5, -30, Math.PI / 2, 4, .38, { lit: true });
    sign(signTex(['POSTE DE SECOURS AEGIS', 'ÉVACUATION 17/11/2189'], { bg: '#f4f2ee', fg: '#9b1c1c', w: 512, h: 160, border: '#9b1c1c' }), 1.82, 3, -36, -Math.PI / 2, 1.8, .55);
    sign(graffitiTex('LES ANCIENS RELAIS →', '#8fd0ff'), 20, 1.6, -21.82, 0, 3, .95, { see: true });
    sign(blue(['MARCHÉ DES HALLES-BASSES'], 1024, 128), 40.18, 4.4, -20, Math.PI / 2, 6, .75, { lit: true });
    // Market and its collapse.
    sign(signTex(['DANGER', 'EFFONDREMENT · NE PAS FRANCHIR'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), 66, 1.2, -11.38, 0, 1.6, .5);
    sign(signTex(['QUAI 9 ↑', 'RIDEAU · COMMANDE PAR RELAIS'], { bg: '#0d3b5e', fg: '#f2f4f2', w: 512, h: 160 }), 84, 4.2, 1.82, Math.PI, 2.4, .75, { lit: true });
    sign(graffitiTex('ABRI ÉPARS →', '#ffd27a'), 85.82, 1.8, 10, -Math.PI / 2, 2.4, .75, { see: true });
    // Platform.
    sign(blue(['HALLES-BASSES']), 62, 4.8, 63.82, Math.PI, 12, 1.9); sign(blue(['DIRECTION ORME · BAS-NIVEAUX'], 1024, 96), 62, 3.4, 63.82, Math.PI, 7, .6);
    for (const x of [44, 80]) sign(signTex(['DANGER', 'EAU SOUS TENSION'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), x, 1.4, 26.18, 0, 1.4, .45);
    sign(posterTex('SOMNIA', 'DORMEZ CERTIFIÉ', '#120c24', '#9f8cff', null), 56, 2.2, 26.18, 0, 1.4, 2.1); sign(posterTex('AEGIS', 'RECRUTE · VESPER 2189', '#0d2233', '#e8f6ff', '#7fe7ff'), 70, 2.2, 26.18, 0, 1.4, 2.1);
    sign(signTex(['TUNNEL TECHNIQUE', 'P9 · PERSONNEL SEUL'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), 30.18, 3.6, 36, Math.PI / 2, 2.2, .7);
    // Pump hall, lock and chamber.
    sign(signTex(['SALLE DES POMPES P9', 'RÉGIE DES EAUX DE VESPER · 2121'], { bg: '#1d2a22', fg: '#e5dfb4', w: 1024, h: 192 }), -60.18, 6, 36, -Math.PI / 2, 6, 1.1);
    sign(signTex(['GALERIE DE L’ÉCLUSE', '↑'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), -76, 4.2, 51.82, Math.PI, 2.2, .7);
    sign(signTex(['ÉCLUSE P9', 'DANGER · PORTE LOURDE'], { bg: '#c9a227', fg: '#16181a', w: 512, h: 160 }), -62.18, 7, 72, -Math.PI / 2, 3, 1);
    sign(signTex(['ORDRE · ZONE DE MAINTENANCE', 'ACCÈS INTERDIT · TIR AUTORISÉ'], { bg: '#1a1d22', fg: '#e7c45a', w: 1024, h: 192 }), -39.82, 8, 72, Math.PI / 2, 6, 1.1);
    sign(signTex(['POSTE ORME', 'SIGNALISATION · 2098'], { bg: '#0d3b5e', fg: '#f2f4f2', w: 512, h: 160 }), 19.82, 4, 88, -Math.PI / 2, 2, .62, { lit: true });
    sign(lineMap, 32, 2.5, 95.82, Math.PI, 5, 1.25);
    sign(signTex(['MONTE-CHARGE', 'BAS-NIVEAUX ↑'], { bg: '#0f7a3e', fg: '#f4fff6', w: 512, h: 160 }), 43.82, 3.1, 86, -Math.PI / 2, 1.6, .5, { lit: true });
    // Exit signs over doorways.
    for (const [x, y, z, yaw] of [[0, 3.3, -47.8, 0], [15.8, 2.9, -62, -Math.PI / 2], [2.2, 2.8, -36, Math.PI / 2], [40.2, 3.5, -20, Math.PI / 2], [84, 3.6, 2.2, 0], [84, 3.5, 25.8, Math.PI],
      [29.8, 3.2, 36, -Math.PI / 2], [-59.8, 3.7, 36, Math.PI / 2], [-76, 3.5, 52.2, 0], [20.2, 3.2, 88, Math.PI / 2], [43.8, 2.8, 86, -Math.PI / 2]]) sign(exit, x, y, z, yaw, .6, .22, { lit: true });
    // Scattered evacuation leaflets and belongings, flat on the floor.
    const leaflet = new T.MeshStandardMaterial({ map: paperTex('ÉVACUATION', 999), roughness: .95, side: T.DoubleSide });
    const leaves = new T.InstancedMesh(new T.PlaneGeometry(.21, .29), leaflet, low ? 60 : 140), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(1, 1, 1);
    let n = 0;
    const scatter = (x1, x2, z1, z2, count) => { for (let k = 0; k < count && n < leaves.count; k++) leaves.setMatrixAt(n++, m.compose(p.set(x1 + rng() * (x2 - x1), .006 + rng() * .004, z1 + rng() * (z2 - z1)), q.setFromEuler(e.set(-Math.PI / 2, 0, rng() * TAU)), s)); };
    scatter(-14, 14, -70, -50, 50); scatter(-1.6, 1.6, -46, -20, 20); scatter(4, 38, -21.6, -18.4, 25); scatter(42, 90, -44, 0, 45);
    leaves.count = n; leaves.instanceMatrix.needsUpdate = true; leaves.computeBoundingSphere(); add(leaves);
    for (const [x, z, c] of [[-14.6, -58, M.canvasBlue], [-14.2, -57.2, M.orange], [14.6, -70.6, M.canvasRed], [1.4, -27, M.canvasBlue], [38.6, -18.6, M.wood], [91, 19.3, M.canvasBlue], [95.3, 11, M.canvasRed]])
      piece(c, x, 0, z, .55, .35, .3, rng() * 3);
    // The Épars shelter: mattresses, a stove, chalk tally on the wall.
    for (const [x, z] of [[88.4, 11.2], [88.4, 18.8], [94.6, 18.8]]) { piece(M.fabric, x, 0, z, 1.9, .16, .85); piece(M.canvasBlue, x + .3, .16, z, 1, .06, .8); }
    piece(M.dark, 95.2, 0, 13, .4, .5, .4); piece(M.amber, 95.2, .5, 13, .18, .04, .18);
    sign(graffitiTex('IIII IIII II · NIRA', '#e8e2d0'), 91, 1.9, 19.82, Math.PI, 2, .62, { see: true });
    // Puddles on the floors near the water.
    const puddle = new T.MeshStandardMaterial({ color: 0x0b1114, roughness: .03, metalness: .2, transparent: true, opacity: .72, depthWrite: false });
    for (const [x, z, sx, sz] of [[0, -26, 2.6, 4], [24, -20, 5, 2.4], [54, -14, 4, 3], [80, -26, 3, 5], [84, 20, 2.4, 3.2], [60, 40, 6, 2], [-8, 36, 6, 2.6], [-66, 42, 4, 4], [-76, 60, 2.4, 3], [-50, 72, 6, 4]]) {
      const pd = new T.Mesh(new T.CircleGeometry(.5, 20), puddle); pd.scale.set(sx, sz, 1); pd.rotation.x = -Math.PI / 2; pd.position.set(x, .008, z); add(pd);
    }
    // Cable trays and pipes along the service tunnel, cables hanging under the market vault.
    for (const z of [34.25, 37.75]) { piece(M.dark, -15, 2.5, z, 90, .08, .3); piece(M.rust, -15, 2.95, z, 90, .16, .16); }
    for (let k = 0; k < 9; k++) { const x = 44 + k * 5.5, sag = new T.Mesh(new T.TorusGeometry(3, .025, 4, 24, Math.PI), M.black); sag.position.set(x, 8.6, -22 + (k % 3 - 1) * 10); sag.rotation.set(0, Math.PI / 2, Math.PI); add(sag); }
    // Pump hall: wall pipes, gantry crane rail, valve pipes are in the devices.
    for (const z of [20.3, 51.7]) piece(M.rust, -77, 9, z, 34, .5, .5);
    piece(M.yellow, -77, 12.2, 36, 34, .6, .5); piece(M.dark, -77, 12.8, 21, 34, .3, .3); piece(M.dark, -77, 12.8, 51, 34, .3, .3);
    // Low track: rails on the floor, towards the glow of the chamber.
    for (const z of [71.2, 72.8]) piece(M.rail, -51, 0, z, 22, .12, .07); for (let x = -61.5; x < -40; x += .7) piece(M.wood, x, 0, 72, .22, .06, 2.4);
  }

  // ---------- Particles: drips, ripples, rain, splashes ----------
  const DRIPS = low ? 14 : 30;
  const drips = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ color: 0x9fb8c4, transparent: true, opacity: .7, toneMapped: false }), DRIPS);
  drips.frustumCulled = false; add(drips);
  const dripState = Array.from({ length: DRIPS }, () => ({ x: 0, y: -10, z: 0, v: 0, floor: 0 }));
  const ripples = Array.from({ length: low ? 6 : 12 }, () => { const r = new T.Mesh(new T.RingGeometry(.05, .09, 20), additive(0xbfd8e4, 0)); r.rotation.x = -Math.PI / 2; r.visible = false; add(r); return { mesh: r, age: 9 }; });
  const ripple = (x, y, z, size = 1) => { const r = ripples.find(r => r.age > 1.2) || ripples[0]; r.age = 0; r.size = size; r.mesh.position.set(x, y + .01, z); r.mesh.visible = true; };
  const levelAt = (x, z) => { for (const v of waters.values()) if (v.mesh.visible && x >= v.w.x1 && x <= v.w.x2 && z >= v.w.z1 && z <= v.w.z2) return v.level; return 0; };
  const RAIN = low ? 220 : 520, rain = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ color: 0x9fb2c8, transparent: true, opacity: .35, toneMapped: false, depthWrite: false }), RAIN);
  rain.frustumCulled = false; add(rain);
  const rainDrops = Array.from({ length: RAIN }, () => ({ x: -8 + rng() * 16, y: HEIGHTS.rue + rng() * 18, z: -97 + rng() * 11, v: 9 + rng() * 4 }));
  const splashes = [];
  function emerge(x, z) {
    const y = levelAt(x, z + 1.6) || levelAt(x, z) || 0, g = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ color: 0xcfe3ec, transparent: true, opacity: .8, toneMapped: false }), 16);
    g.frustumCulled = false; add(g); splashes.push({ g, age: 0, x, y, z, parts: Array.from({ length: 16 }, () => ({ vx: (rng() - .5) * 3, vy: 2 + rng() * 3, vz: (rng() - .5) * 3 })) });
    ripple(x, y, z + 1, 3); ripple(x + .6, y, z + .5, 2);
  }
  const mm = new T.Matrix4(), pp = new T.Vector3(), qq = new T.Quaternion(), ss = new T.Vector3();
  function updateParticles(t, dt, eye) {
    const here = ROOM[roomAt(eye.x, eye.z)];
    dripState.forEach((d, i) => {
      if (d.y < d.floor) {
        if (d.y > -9) ripple(d.x, d.floor, d.z, .6);
        if (here && here.id !== 'rue' && rng() < dt * 3) { d.x = eye.x + (rng() - .5) * 14; d.z = eye.z + (rng() - .5) * 14; const r = ROOM[roomAt(d.x, d.z)]; if (r && r.id !== 'rue') { d.y = r.ceiling - .05; d.v = 0; d.floor = levelAt(d.x, d.z); } else d.y = -10; }
        else d.y = -10;
      } else { d.v += 9.8 * dt; d.y -= d.v * dt; }
      drips.setMatrixAt(i, mm.compose(pp.set(d.x, d.y, d.z), qq, ss.set(.015, .07 + d.v * .01, .015)));
    });
    drips.instanceMatrix.needsUpdate = true;
    for (const r of ripples) { r.age += dt; const k = r.age / 1.2; r.mesh.visible = k < 1; if (k < 1) { r.mesh.scale.setScalar(1 + k * 8 * (r.size || 1)); r.mesh.material.opacity = .5 * (1 - k); } }
    const showRain = eye.z < -80;
    rain.visible = showRain;
    if (showRain) rainDrops.forEach((d, i) => {
      d.y -= d.v * dt; if (d.y < HEIGHTS.rue) { d.y = HEIGHTS.rue + 18; d.x = -8 + rng() * 16; d.z = -97 + rng() * 11; }
      rain.setMatrixAt(i, mm.compose(pp.set(d.x, d.y, d.z), qq, ss.set(.012, .45, .012)));
    });
    if (showRain) rain.instanceMatrix.needsUpdate = true;
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.age += dt;
      s.parts.forEach((p, k) => { const a = s.age; s.g.setMatrixAt(k, mm.compose(pp.set(s.x + p.vx * a, s.y + p.vy * a - 4.9 * a * a, s.z + 1 + p.vz * a), qq, ss.set(.05, .05, .05))); });
      s.g.instanceMatrix.needsUpdate = true; s.g.material.opacity = Math.max(0, .8 - s.age * .7);
      if (s.age > 1.2) { root.remove(s.g); splashes.splice(i, 1); }
    }
  }

  // ---------- ORDRE tactical portals ----------
  const portals = [];
  function openPortal(x, y, z, { charge = 3.2, hold = 2.2 } = {}) {
    const g = new T.Group(); g.position.set(x, y, z);
    const ring = new T.Mesh(new T.RingGeometry(1.5, 1.85, 40), additive(0xff3b4e, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const membrane = new T.Mesh(new T.CircleGeometry(1.6, 40), additive(0xff2d55, 0)); membrane.position.y = 1.7; membrane.scale.y = 1.05; g.add(membrane);
    const frame = new T.Mesh(new T.TorusGeometry(1.7, .12, 8, 40), M.dark); frame.position.y = 1.7; frame.scale.y = 1.05; g.add(frame);
    add(g); const p = { group: g, ring, membrane, frame, age: 0, charge, hold }; portals.push(p); return p;
  }
  function updatePortals(t, dt, eye) {
    for (let i = portals.length - 1; i >= 0; i--) {
      const p = portals[i]; p.age += dt; const c = Math.min(1, p.age / p.charge), end = p.charge + p.hold;
      p.ring.material.opacity = .9 * (.5 + .5 * Math.sin(t * 12)) * (p.age < end ? 1 : 0); p.ring.scale.setScalar(.6 + .5 * c);
      p.membrane.material.opacity = p.age > p.charge * .7 ? Math.min(.75, (p.age - p.charge * .7) * 1.2) * Math.max(0, 1 - (p.age - end) * 1.5) : 0;
      p.frame.rotation.z = t * 2; p.group.lookAt(eye.x, p.group.position.y, eye.z);
      if (p.age > end + .8) { root.remove(p.group); portals.splice(i, 1); }
    }
  }

  // ---------- Machines: fans, pumps ----------
  let pumpsTarget = 0, pumpsSpeed = 0;
  function updateMachines(t, dt) {
    const fanSpeed = power.tunnel === 'secours' || power.station === 'secours' ? 6 : .6;
    for (const f of fans) f.rotation.z += fanSpeed * dt;
    pumpsSpeed += (pumpsTarget - pumpsSpeed) * Math.min(1, dt * .25);
    for (const p of pumpRotors) { p.cap.rotation.y += pumpsSpeed * 14 * dt; p.motor.position.x = p.motor.userData.x ??= p.motor.position.x; p.motor.position.x = p.motor.userData.x + Math.sin(t * 80) * .006 * pumpsSpeed; }
    if (racks.length && Math.floor(t * 4) % 3 === 0) for (const r of racks) { r.setColorAt(Math.floor(rng() * r.count), new T.Color(rng() < .8 ? 0x7fe7ff : 0xff3a4c)); r.instanceColor.needsUpdate = true; }
  }

  return {
    root, M,
    build(collisions) {
      placeFixtures(); buildRooms(); buildWalls(collisions); buildStairs();
      for (const o of collisions) dress(o);
      buildFixtureMeshes(); buildDoors(); buildWater(); buildFlood(); buildDevices(collisions); buildSigns();
      flushGeometry(); flushPieces();
    },
    update(t, dt, eye = camera, player = eye.position) {
      updateLights(t, dt, eye.position); updateAmbient(dt, eye.position); updateDoors(dt, player); updateWater(t, dt); updateDevices(t, dt);
      updateParticles(t, dt, eye.position); updatePortals(t, dt, eye.position); updateMachines(t, dt);
      for (const f of animated) f(t, dt, eye);
    },
    openPortal, emerge,
    setDoor(id, state) { const d = doors.get(id); if (!d) return; d.state = state === 'opening' ? 'opening' : state ? (d.d.open ? 'auto' : 'open') : 'closed'; if (!state) d.open = 0; },
    setWater(id, state) {
      const v = waters.get(id); if (!v) return;
      v.target = state === 'drained' ? v.w.drainTo ?? -.25 : state === 'low' ? v.w.drainTo ?? v.w.level : v.w.level;
      if (state === 'flooded') v.level = v.w.level;
      if (id === 'tunnel') liveWater = state !== 'drained';
    },
    setPower(zone, state) { power[zone] = state; },
    setPumps(state) { pumpsTarget = state === 'running' ? 1 : state === 'starting' ? .45 : 0; },
    reveal(on) { anchorTarget = on ? 1 : .15; },
    flood(on, t = 0) { if (on && !flooding) floodStart = t; flooding = !!on; },
    markDone(id, done = true) { const d = devices.get(id); if (d) { d.done = done; if (!done) { d.turn = 0; if (d.moving) d.moving.rotation.set(0, 0, 0); } } },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    // Is the place dark enough to want the head lamp?
    dark(x, z) { const r = ROOM[roomAt(x, z)]; if (!r) return true; if (r.id === 'rue' || r.id === 'chambre') return false; return (r.id === 'tunnel' ? power.tunnel : power.station) !== 'secours'; },
    stats() { return { ...stats, power: { ...power }, lights: pool.filter(s => s.fixture).length, portals: portals.length, anchor: +anchorPower.toFixed(2), flooding, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])), water: Object.fromEntries([...waters].map(([k, v]) => [k, +v.level.toFixed(2)])) }; }
  };
}
