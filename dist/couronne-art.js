// COURONNE HELIX — dressing of the standalone level (couronne-layout.js holds the playable geometry).
// Dusk on the heights of Vesper (Tome II §34): a white ceramic HELIX crown (§22 materials: clean ceramic and
// polymer, grey glass, HELIX red used only on its marks) above a rain-washed neon city, with the phase anchor
// (magenta, reserved to phase fields) as the long-range landmark. Original design; no other franchise's
// environments are reproduced (§36). Budget: instancing for every repeated element, three dynamic lights.
import { FLOORS, STAIRS, HEIGHTS, LANDING, SIDE_STEPS, stairHeight } from './couronne-layout.js';

const TAU = Math.PI * 2;

function canvasTexture(T, w, h, paint, { repeat = false, color = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (color) t.colorSpace = T.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4; return t;
}
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

// Plane with UVs in metres / tile, so one texture tiles evenly over any size.
function tiledPlane(T, w, h, tile) {
  const g = new T.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  return g;
}

export function createCouronneArt(T, scene, { quality = 'normal', camera } = {}) {
  const low = quality === 'low', rng = seeded(9091);
  const root = new T.Group(); root.name = 'COURONNE HELIX'; scene.add(root);
  const animated = [], stats = { instances: 0, meshes: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Textures ----------
  const tile = canvasTexture(T, 512, 512, (c, w, h) => {
    c.fillStyle = '#b9bfc7'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${150 + rng() * 60},${155 + rng() * 60},${165 + rng() * 60},.06)`; c.fillRect(rng() * w, rng() * h, 2 + rng() * 18, 2 + rng() * 18); }
    c.strokeStyle = '#9aa1aa'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.stroke(); c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(w, i * h / 4); c.stroke(); }
  }, { repeat: true });
  const tileGlow = canvasTexture(T, 512, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#9fe9ff'; c.fillRect(0, h / 2 - 2, w, 4); c.fillStyle = '#ffd7a8'; c.fillRect(w / 2 - 1, 0, 2, h);
  }, { repeat: true });
  const panel = canvasTexture(T, 512, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e6e9ed'); g.addColorStop(1, '#b9bfc7'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8d949d'; c.lineWidth = 4; for (let x = 0; x <= w; x += w / 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.beginPath(); c.moveTo(0, h * .72); c.lineTo(w, h * .72); c.stroke();
    c.fillStyle = '#2b3138'; for (let x = w / 8; x < w; x += w / 4) c.fillRect(x - 3, h * .1, 6, h * .55);
  }, { repeat: true });
  const panelGlow = canvasTexture(T, 512, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let x = w / 8, k = 0; x < w; x += w / 4, k++) { c.fillStyle = k % 2 ? '#ffb46a' : '#7fe7ff'; c.fillRect(x - 2, h * .1, 4, h * .55); }
  }, { repeat: true });
  const windowTex = density => canvasTexture(T, 128, 256, (c, w, h) => {
    c.fillStyle = '#05070b'; c.fillRect(0, 0, w, h);
    const cols = 4, rows = 8, palette = ['#ffcf8a', '#ffb05a', '#8ff0ff', '#d8ecff', '#b9a6ff'];
    for (let r = 0; r < rows; r++) {
      if (rng() < .12) continue;
      for (let k = 0; k < cols; k++) if (rng() < density) {
        c.fillStyle = palette[Math.floor(rng() * (rng() < .7 ? 2 : palette.length))]; c.globalAlpha = .55 + rng() * .45;
        c.fillRect(k * w / cols + 5, r * h / rows + 6, w / cols - 10, h / rows - 12);
      }
    }
    c.globalAlpha = 1;
  }, { repeat: true });
  const sky = canvasTexture(T, 4, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of [[0, '#0b1030'], [.28, '#232860'], [.4, '#5a4580'], [.46, '#c46c7c'], [.49, '#f39a5c'], [.505, '#f6c37c'], [.53, '#7a5a72'], [.62, '#3a2f45'], [1, '#120f1a']]) g.addColorStop(at, color);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const cloud = canvasTexture(T, 1024, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rng() * w, y = h * (.3 + rng() * .5), rx = 60 + rng() * 220, ry = 8 + rng() * 22;
      const g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, 'rgba(255,214,190,.42)'); g.addColorStop(1, 'rgba(255,214,190,0)');
      c.save(); c.scale(1, ry / rx); c.fillStyle = g; c.beginPath(); c.arc(x, y * rx / ry, rx, 0, TAU); c.fill(); c.restore();
    }
  }, { repeat: true });
  const glowDisc = canvasTexture(T, 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const sign = (text, sub, color, w = 512, h = 192) => canvasTexture(T, w, h, (c, W, H) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, W, H);
    c.strokeStyle = color; c.lineWidth = 6; c.globalAlpha = .9; c.strokeRect(8, 8, W - 16, H - 16);
    c.fillStyle = color; c.font = `900 ${Math.round(H * .34)}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, W / 2, H * (sub ? .4 : .5)); if (sub) { c.font = `700 ${Math.round(H * .14)}px system-ui,sans-serif`; c.globalAlpha = .75; c.fillText(sub, W / 2, H * .76); }
  });
  const phaseSeam = canvasTexture(T, 64, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { const g = c.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, 'rgba(255,63,180,0)'); g.addColorStop(.8, 'rgba(255,90,200,1)'); g.addColorStop(1, 'rgba(255,63,180,0)'); c.fillStyle = g; c.fillRect(w / 2 - 3, y, 6, 32); }
  }, { repeat: true });

  // ---------- Materials ----------
  const std = (o) => new T.MeshStandardMaterial(o);
  const M = {
    floor: std({ map: tile, color: 0x9ba1aa, emissiveMap: tileGlow, emissive: new T.Color(.55, .65, .75), emissiveIntensity: .3, roughness: .2, metalness: .18 }),
    ceramic: std({ map: panel, emissiveMap: panelGlow, emissive: new T.Color(1, 1, 1), emissiveIntensity: .9, roughness: .33, metalness: .08 }),
    white: std({ color: 0xdfe3e8, roughness: .3, metalness: .06 }),
    dark: std({ color: 0x232932, roughness: .38, metalness: .55 }),
    metal: std({ color: 0x59636e, roughness: .3, metalness: .85 }),
    glass: std({ color: 0x8aa3ba, roughness: .04, metalness: .9, transparent: true, opacity: .26, depthWrite: false, name: 'verre' }),
    water: std({ color: 0x0b1822, roughness: .04, metalness: .7 }),
    hedge: std({ color: 0x2f4c3d, roughness: .92, metalness: 0 }),
    soil: std({ color: 0x1b1a18, roughness: 1, metalness: 0 }),
    helix: new T.MeshBasicMaterial({ color: 0xff3a4c, toneMapped: false }),
    ice: new T.MeshBasicMaterial({ color: 0xc8f2ff, toneMapped: false }),
    amber: new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false }),
    teal: new T.MeshBasicMaterial({ color: 0x3fe6d4, toneMapped: false }),
    warm: new T.MeshBasicMaterial({ color: 0xc9b49a, toneMapped: false }),
    phase: new T.MeshBasicMaterial({ color: 0xff46b9, toneMapped: false }),
    additive: (color, opacity = .6, map = null) => new T.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide })
  };
  const cube = new T.BoxGeometry(1, 1, 1);

  // Instanced boxes per material: [x, y(bottom), z, sx, sy, sz, rotY].
  const boxes = new Map();
  const queue = (material, x, y, z, sx, sy, sz, ry = 0) => { if (!boxes.has(material)) boxes.set(material, []); boxes.get(material).push([x, y, z, sx, sy, sz, ry]); };
  const flushBoxes = () => {
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [material, list] of boxes) {
      const mesh = new T.InstancedMesh(cube, material, list.length); mesh.name = 'Couronne / ' + (material.name || 'boxes');
      list.forEach(([x, y, z, sx, sy, sz, ry], i) => { mesh.setMatrixAt(i, m.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))); });
      mesh.castShadow = !low && !material.transparent; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      add(mesh); stats.instances += list.length;
    }
    boxes.clear();
  };
  // A vertical wall panel between two ground points with tiled UVs.
  const wall = (x1, z1, x2, z2, y0, y1, material, tileSize = 4) => {
    const len = Math.hypot(x2 - x1, z2 - z1), g = tiledPlane(T, len, y1 - y0, tileSize);
    const mesh = new T.Mesh(g, material); mesh.position.set((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2);
    mesh.rotation.y = Math.atan2(-(z2 - z1), x2 - x1); mesh.receiveShadow = true; return add(mesh);
  };
  const floorPlane = (x1, x2, z1, z2, y, material = M.floor, tileSize = 8) => {
    const mesh = new T.Mesh(tiledPlane(T, x2 - x1, z2 - z1, tileSize), material); mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x1 + x2) / 2, y + .002, (z1 + z2) / 2); mesh.receiveShadow = true; return add(mesh);
  };

  // ---------- Sky, sun, clouds, fog and light ----------
  const skyDome = new T.Mesh(new T.SphereGeometry(950, 32, 16), new T.MeshBasicMaterial({ map: sky, side: T.BackSide, fog: false, depthWrite: false }));
  skyDome.renderOrder = -10; add(skyDome, scene);
  const sunDir = new T.Vector3(-.78, .055, -.62).normalize();
  const sun = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: glowDisc, color: 0xffc58a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  sun.scale.setScalar(260); add(sun, scene);
  const clouds = [];
  for (let i = 0; i < (low ? 2 : 4); i++) {
    const tex = cloud.clone(); tex.needsUpdate = true; tex.repeat.set(1.5, 1); tex.offset.x = rng();
    const layer = new T.Mesh(new T.PlaneGeometry(2600, 520), new T.MeshBasicMaterial({ map: tex, color: i % 2 ? 0xe39a8f : 0x9b7fb8, transparent: true, opacity: .55 - i * .08, depthWrite: false, fog: false }));
    layer.rotation.x = -Math.PI / 2 + .08; layer.position.set(0, 210 + i * 45, -260 - i * 90); layer.userData.speed = .0015 + i * .0008; clouds.push(layer); add(layer, scene);
  }
  scene.fog = new T.Fog(0x5d4a6a, 140, 820);
  scene.background = new T.Color(0x2a2440);
  const envTex = canvasTexture(T, 256, 128, (c, w, h) => { c.drawImage(sky.image, 0, 0, w, h); });
  envTex.mapping = T.EquirectangularReflectionMapping; scene.environment = envTex; scene.environmentIntensity = .8;
  const hemi = new T.HemisphereLight(0xa9b1e6, 0x3b2a36, 1.0); add(hemi, scene);
  const sunLight = new T.DirectionalLight(0xffc293, 2.6); sunLight.position.copy(sunDir).multiplyScalar(160); sunLight.target.position.set(0, 0, -10);
  sunLight.castShadow = !low; sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.bias = -.0002; sunLight.shadow.normalBias = .03;
  Object.assign(sunLight.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 20, far: 380 });
  add(sunLight, scene); add(sunLight.target, scene);
  const anchorLight = new T.PointLight(0xff4fbf, 60, 70, 1.6); anchorLight.position.set(0, 24, -64); add(anchorLight, scene);
  const lobbyLight = new T.PointLight(0xffd2a0, 18, 28, 1.8); lobbyLight.position.set(0, 12.5, -25); add(lobbyLight, scene);

  // ---------- The Crown: slab, podiums, stairs ----------
  // Ground slab (plaza + heliport) and its thick edge seen from the terraces.
  floorPlane(-40, 40, 4, 60, 0); floorPlane(-16, 16, 60, 84, 0);
  for (const [x1, z1, x2, z2] of [[-40, 4, -40, 60], [40, 60, 40, 4], [40, 4, 36, 4], [-36, 4, -40, 4], [-40, 60, -16, 60], [16, 60, 40, 60], [-16, 60, -16, 84], [16, 84, 16, 60], [-16, 84, 16, 84]])
    wall(x1, z1, x2, z2, -7, 0, M.ceramic, 6);
  // The keel under the Crown, fading into the haze: a ceramic mast and struts down to the city.
  const keel = new T.Mesh(new T.CylinderGeometry(26, 9, 330, 8, 1, true), M.dark); keel.position.set(0, -172, -10); add(keel);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, strut = new T.Mesh(new T.CylinderGeometry(1.2, 2.2, 150, 6), M.dark);
    strut.position.set(Math.cos(a) * 34, -70, -10 + Math.sin(a) * 48); strut.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); add(strut);
  }
  // Podiums: ceramic sides with lit slits, tiled tops.
  for (const f of FLOORS) {
    floorPlane(f.x1, f.x2, f.z1, f.z2, f.height);
    // The east terrace stands on the slab; the parvis and the anchor terrace are blocks of their own.
    const bottom = f.id === 'terrasse-est' ? 0 : -7;
    for (const [x1, z1, x2, z2] of [[f.x1, f.z2, f.x2, f.z2], [f.x2, f.z2, f.x2, f.z1], [f.x2, f.z1, f.x1, f.z1], [f.x1, f.z1, f.x1, f.z2]]) wall(x1, z1, x2, z2, bottom, f.height, M.ceramic, 6);
  }
  // Stairs: treads with a light nosing, landings, stepped cheek walls.
  for (const s of STAIRS) {
    const length = s.bottomZ - s.topZ, count = Math.round(length / .32), run = length / count;
    for (let i = 0; i < count; i++) {
      const z = s.bottomZ - (i + .5) * run, top = s.base + (s.height - s.base) * (i + 1) / count;
      queue(M.white, s.x, s.base, z, s.halfWidth * 2, top - s.base, run + .01);
      if (!low || i % 2 === 0) queue(M.ice, s.x, top - .02, z + run / 2 - .03, s.halfWidth * 2 - .2, .03, .05);
    }
    queue(M.white, s.x, s.base, s.topZ - LANDING / 2, s.halfWidth * 2, s.height - s.base, LANDING);
    for (const side of [-1, 1]) for (let k = 0; k < SIDE_STEPS; k++) {
      const z2 = s.bottomZ - k * length / SIDE_STEPS, z1 = s.bottomZ - (k + 1) * length / SIDE_STEPS, top = stairHeight(s, z1) + 1.05;
      queue(M.white, s.x + side * (s.halfWidth + .15), 0, (z1 + z2) / 2, .3, top, z2 - z1);
      queue(M.teal, s.x + side * (s.halfWidth + .02), top - .12, (z1 + z2) / 2, .04, .05, z2 - z1 - .1);
    }
  }

  // ---------- Elements built from the colliders ----------
  const posts = [];
  function dress(o) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, y = o.y;
    switch (o.kind) {
      case 'screen': case 'rail': {
        queue(M.glass, o.x, y, o.z, w, o.height - .08, d * .4);
        queue(M.metal, o.x, y + o.height - .08, o.z, w + .04, .08, d * .9);
        const long = w > d ? w : d;
        for (let t = 0; t <= long; t += 3) posts.push([w > d ? x1 + t : o.x, y, w > d ? o.z : z1 + t, o.height]);
        break;
      }
      case 'filter-wall': queue(M.white, o.x, y, o.z, w, o.height, d); queue(M.helix, o.x, y + o.height - .5, o.z + .17, w * .9, .06, .02); break;
      case 'hedge': queue(M.white, o.x, y, o.z, w, .45, d + .3); queue(M.hedge, o.x, y + .45, o.z, w, o.height - .45, d + .1); break;
      case 'planter': queue(M.white, o.x, y, o.z, w, o.height - .15, d); queue(M.soil, o.x, y + o.height - .15, o.z, w - .2, .08, d - .2);
        for (let k = 0; k < Math.round(Math.max(w, d) / .9); k++) queue(M.hedge, o.x + (w > d ? -o.hx + .45 + k * .9 : 0), y + o.height - .12, o.z + (w > d ? 0 : -o.hz + .45 + k * .9), .7, .55 + rng() * .3, .7, rng());
        break;
      case 'monolith': queue(M.dark, o.x, y, o.z, w, o.height, d); queue(rng() < .5 ? M.amber : M.teal, o.x, y + .4, o.z + o.hz + .01, .08, o.height - .9, .02); queue(M.helix, o.x, y + o.height - .55, o.z + o.hz + .012, .3, .08, .02); break;
      case 'column': { const c = new T.Mesh(new T.CylinderGeometry(o.hx, o.hx * 1.1, o.height, 14), M.white); c.position.set(o.x, y + o.height / 2, o.z); c.castShadow = !low; add(c); break; }
      case 'bench': queue(M.white, o.x, y, o.z, w, o.height, d); break;
      case 'kiosk': queue(M.dark, o.x, y, o.z, w, o.height, d); queue(M.ice, o.x, y + 1.1, o.z + o.hz + .01, w * .8, 1.1, .02); break;
      case 'crate': queue(M.metal, o.x, y, o.z, w, o.height, d); queue(M.amber, o.x, y + o.height * .45, o.z + o.hz + .01, w * .7, .05, .01); break;
      case 'scanner': queue(M.white, o.x, y, o.z, w, o.height, d); queue(M.ice, o.x, y + .3, o.z, w + .02, o.height - .6, .06); break;
      case 'fountain': queue(M.white, o.x, y, o.z, w, o.height, d); queue(M.water, o.x, y + o.height - .05, o.z, w - .5, .02, d - .5); break;
      case 'sculpture': { queue(M.white, o.x, y, o.z, w, .5, d); const k = new T.Mesh(new T.TorusKnotGeometry(.75, .2, 90, 10, 2, 3), M.metal); k.position.set(o.x, y + 2.1, o.z); k.castShadow = !low; animated.push(t => { k.rotation.y = t * .15; }); add(k); break; }
      case 'barrier': queue(M.metal, o.x, y, o.z, w, o.height, d); queue(M.helix, o.x, y + o.height - .12, o.z, w + .02, .05, d + .02); break;
      case 'desk': queue(M.white, o.x, y, o.z, w, o.height, d); queue(M.ice, o.x, y + o.height, o.z, w * .6, .02, d * .6); break;
      case 'pillar': queue(M.white, o.x, y, o.z, w, o.height, d); break;
      case 'console': queue(M.dark, o.x, y, o.z, w, o.height, d); break;
      case 'stabilizer': queue(M.dark, o.x, y, o.z, w, o.height, d); queue(M.metal, o.x, y + o.height, o.z, w * .7, .5, d * .7);
        for (const k of [-1, 0, 1]) for (const side of [-1, 1]) queue(M.phase, o.x + k * w * .25, y + .8, o.z + side * (o.hz + .01), .1, o.height - 1.6, .02);
        break;
      case 'shuttle': buildShuttle(o); break;
      case 'lobby-wall': queue(M.white, o.x, y, o.z, w, o.height, d); break;
      case 'glass-wall': queue(M.glass, o.x, y, o.z, w, o.height, d); for (let t = 0; t <= w; t += 2.5) queue(M.metal, x1 + t, y, o.z, .12, o.height, d + .05); break;
      case 'anchor-base': case 'gate': case 'podium': case 'stair-side': break;
    }
  }

  function buildShuttle(o) {
    const g = new T.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = .12;
    const hull = new T.Mesh(new T.CapsuleGeometry(1.45, 7.2, 6, 12), M.white); hull.rotation.x = Math.PI / 2; hull.position.y = 1.75; g.add(hull);
    const canopy = new T.Mesh(new T.SphereGeometry(1.2, 16, 10, 0, TAU, 0, Math.PI / 2), M.glass); canopy.position.set(0, 2.5, -2.9); canopy.scale.set(1, .65, 1.6); g.add(canopy);
    for (const [x, z] of [[-2.4, -2.6], [2.4, -2.6], [-2.4, 2.8], [2.4, 2.8]]) {
      const nacelle = new T.Mesh(new T.CylinderGeometry(.75, .75, 1.6, 14), M.dark); nacelle.position.set(x, 1.6, z); g.add(nacelle);
      const ringLight = new T.Mesh(new T.TorusGeometry(.62, .06, 6, 20), M.ice); ringLight.rotation.x = Math.PI / 2; ringLight.position.set(x, .78, z); g.add(ringLight);
      const arm = new T.Mesh(new T.BoxGeometry(Math.abs(x) - .9, .25, .45), M.white); arm.position.set(x / 2, 1.9, z); g.add(arm);
    }
    const stripe = new T.Mesh(new T.BoxGeometry(.04, .14, 6.4), M.helix); stripe.position.set(1.47, 1.85, .2); g.add(stripe);
    g.traverse(m => { if (m.isMesh) { m.castShadow = !low; m.receiveShadow = true; stats.meshes++; } }); root.add(g);
  }

  function flushPosts() {
    if (!posts.length) return;
    const mesh = new T.InstancedMesh(cube, M.metal, posts.length), m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3();
    posts.forEach(([x, y, z, h], i) => mesh.setMatrixAt(i, m.compose(p.set(x, y + h / 2, z), q, s.set(.09, h, .09))));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += posts.length;
  }

  // ---------- Signature pieces ----------
  // Plaza hologram over the square basin: the HELIX double ribbon, slowly turning.
  {
    const curve = phase => new T.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => { const t = i / 39, a = t * TAU * 1.6 + phase; return new T.Vector3(Math.cos(a) * 1.6, 1.4 + t * 6.2, Math.sin(a) * 1.6); }));
    const holo = new T.Group(); holo.position.set(0, .75, 33);
    for (const [phase, color] of [[0, 0x9fefff], [Math.PI, 0xffd6a8]]) holo.add(new T.Mesh(new T.TubeGeometry(curve(phase), 120, .07, 6), M.additive(color, .85)));
    for (let k = 0; k < 9; k++) { const rung = new T.Mesh(new T.BoxGeometry(3.2, .03, .03), M.additive(0xc8f2ff, .45)); rung.position.y = 1.6 + k * .7; rung.rotation.y = k * .7; holo.add(rung); }
    const halo = new T.Mesh(new T.PlaneGeometry(9, 9), M.additive(0x7fdcff, .22, glowDisc)); halo.rotation.x = -Math.PI / 2; halo.position.y = .05; holo.add(halo);
    animated.push(t => { holo.rotation.y = t * .35; }); add(holo);
  }
  // Heliport marking: ring and HELIX glyph painted on the pad.
  {
    const pad = canvasTexture(T, 512, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(235,240,245,.85)'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, h / 2, w * .43, 0, TAU); c.stroke();
      c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2, w * .36, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(235,240,245,.55)'; c.font = '800 54px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HELIX', w / 2, h / 2);
      c.fillStyle = 'rgba(255,58,76,.85)'; c.fillRect(w / 2 - 70, h / 2 + 36, 140, 7);
    });
    const mark = new T.Mesh(new T.PlaneGeometry(18, 18), new T.MeshStandardMaterial({ map: pad, transparent: true, roughness: .4, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(2, .012, 72); add(mark);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; queue(M.ice, 2 + Math.cos(a) * 8.6, 0, 72 + Math.sin(a) * 8.6, .25, .06, .25); }
  }
  // West colonnade roof with downlights.
  queue(M.white, -35.5, 5.6, 34, 9.4, .45, 40); for (const z of [16, 22, 28, 34, 40, 46, 52]) queue(M.ice, -35.5, 5.55, z, 1.4, .05, 1.4);
  // HELIX lobby: roof, canopy, warm interior, its sign.
  queue(M.white, 0, 15, -25, 40.4, .6, 18.4); queue(M.white, 0, 13.6, -13.6, 14, .4, 5); queue(M.warm, 0, 13.55, -13.6, 12, .05, 4.2);
  floorPlane(-19.6, 19.6, -33.6, -16.2, HEIGHTS.parvis + .01, std({ color: 0x3a3f47, roughness: .08, metalness: .4 }));
  {
    const helixSign = new T.Mesh(new T.PlaneGeometry(10, 2.4), new T.MeshBasicMaterial({ map: sign('HELIX', 'L’ANCRAGE VOUS RELIE', '#f4f7fb', 512, 128), transparent: true, depthWrite: false, toneMapped: false }));
    helixSign.position.set(0, 12.2, -15.9); add(helixSign);
    const dot = new T.Mesh(new T.CircleGeometry(.35, 20), M.helix); dot.position.set(4.6, 12.7, -15.88); add(dot);
  }
  // Security fields across the ascents (state driven by the engine).
  const gateFields = STAIRS.filter(s => s.to === 'ancrage').map(s => {
    const field = new T.Mesh(new T.PlaneGeometry(s.halfWidth * 2 + .6, 3.2), M.additive(0xff4659, .32)); field.position.set(s.x, s.base + 1.6, s.bottomZ + .4); add(field);
    const bar = new T.Mesh(new T.BoxGeometry(s.halfWidth * 2 + .8, .12, .12), M.helix); bar.position.set(s.x, s.base + 3.25, s.bottomZ + .4); add(bar);
    return { field, bar };
  });
  let gatesOpen = false, gateFade = 1;
  animated.push((t, dt) => { gateFade = Math.max(0, Math.min(1, gateFade + (gatesOpen ? -dt : dt) * 1.5)); for (const g of gateFields) { g.field.material.opacity = (.22 + .1 * Math.sin(t * 7)) * gateFade; g.field.visible = gateFade > .01; g.bar.visible = gateFade > .5; } });
  // Consoles (lobby security, two phase stabilizers): screens whose colour reports their state.
  const consoles = new Map();
  for (const [id, x, z, y, text] of [['securite', 0, -29.4, HEIGHTS.parvis, 'SÉCURITÉ'], ['ancrage-ouest', -11, -45.9, HEIGHTS.ancrage, 'STAB. OUEST'], ['ancrage-est', 11, -45.9, HEIGHTS.ancrage, 'STAB. EST']]) {
    const live = sign(text, 'VERROUILLÉ', '#ff5ac8', 512, 192), done = sign(text, 'DÉSACTIVÉ', '#9fefff', 512, 192);
    const screen = new T.Mesh(new T.PlaneGeometry(1.7, .64), new T.MeshBasicMaterial({ map: live, transparent: true, toneMapped: false }));
    screen.position.set(x, y + 1.62, z + .5); screen.rotation.x = -.35; add(screen);
    consoles.set(id, { screen, live, done });
  }

  // ---------- The phase anchor ----------
  const anchor = new T.Group(); anchor.position.set(0, HEIGHTS.ancrage, -64); root.add(anchor);
  {
    const plinth = new T.Mesh(new T.CylinderGeometry(7.58, 7.58, 4, 8), M.dark); plinth.rotation.y = Math.PI / 8; plinth.position.y = 2; plinth.receiveShadow = true; anchor.add(plinth);
    const lip = new T.Mesh(new T.TorusGeometry(7.2, .08, 6, 48), M.phase); lip.rotation.x = Math.PI / 2; lip.position.y = 4.02; anchor.add(lip);
    const seam = phaseSeam.clone(); seam.needsUpdate = true; seam.repeat.set(8, 6);
    const core = new T.Mesh(new T.CylinderGeometry(2.4, 4.4, 170, 8, 1, true), std({ color: 0x1d2129, roughness: .35, metalness: .7, emissiveMap: seam, emissive: new T.Color(1, .3, .75), emissiveIntensity: 1.4 }));
    core.position.y = 4 + 85; core.castShadow = !low; anchor.add(core);
    // Four tapered fins and light collars along the core.
    const finGeometry = new T.BoxGeometry(.5, 120, 4.4, 1, 12, 1), fp = finGeometry.attributes.position;
    for (let i = 0; i < fp.count; i++) { const t = (fp.getY(i) + 60) / 120; fp.setZ(i, fp.getZ(i) * (1 - .64 * t) - 1.7 * t); }
    finGeometry.computeVertexNormals();
    for (let i = 0; i < 4; i++) { const fin = new T.Mesh(finGeometry, M.white); const a = i / 4 * TAU + Math.PI / 4; fin.position.set(Math.cos(a) * 5.4, 4 + 60, Math.sin(a) * 5.4); fin.rotation.y = -a + Math.PI / 2; fin.castShadow = !low; anchor.add(fin); }
    for (const h of [18, 34, 70, 104, 140]) { const r = 4.4 - 2 * h / 170 + .35; const collar = new T.Mesh(new T.CylinderGeometry(r, r, .5, 8), M.white); collar.position.y = 4 + h; collar.rotation.y = Math.PI / 8; anchor.add(collar);
      const glowBand = new T.Mesh(new T.CylinderGeometry(r + .02, r + .02, .08, 8, 1, true), M.ice); glowBand.position.y = 4 + h - .3; glowBand.rotation.y = Math.PI / 8; anchor.add(glowBand); }
    const heart = new T.Mesh(new T.CapsuleGeometry(2.2, 9, 6, 16), M.phase); heart.position.y = 52; anchor.add(heart);
    const heartHalo = new T.Mesh(new T.PlaneGeometry(26, 26), M.additive(0xff4fbf, .55, glowDisc)); heartHalo.position.y = 52; anchor.add(heartHalo);
    const rings = [[13.5, 46, .4], [10.5, 88, -.6], [7.8, 126, .85]].map(([r, y, speed]) => {
      const g = new T.Group(); g.position.y = y; g.rotation.x = .12;
      const hoop = new T.Mesh(new T.TorusGeometry(r, .55, 8, 64), M.white); hoop.rotation.x = Math.PI / 2; g.add(hoop);
      const band = new T.Mesh(new T.TorusGeometry(r - .62, .12, 6, 64), M.phase); band.rotation.x = Math.PI / 2; g.add(band);
      for (let k = 0; k < 6; k++) { const pod = new T.Mesh(new T.BoxGeometry(1.4, 1.1, 1.8), M.dark); const a = k / 6 * TAU; pod.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); pod.rotation.y = -a; g.add(pod); }
      g.userData.speed = speed; anchor.add(g); return g;
    });
    const beamTex = canvasTexture(T, 8, 256, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,120,210,1)'); g.addColorStop(.6, 'rgba(255,90,200,.45)'); g.addColorStop(1, 'rgba(255,90,200,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const beam = new T.Mesh(new T.CylinderGeometry(1.4, 2.6, 700, 12, 1, true), M.additive(0xffffff, .8, beamTex)); beam.position.y = 174 + 350; beam.material.fog = false; anchor.add(beam);
    anchor.userData = { core, heart, heartHalo, rings, beam, seam };
  }
  let anchorPower = 1, anchorTarget = 1;
  animated.push((t, dt) => {
    anchorPower += (anchorTarget - anchorPower) * Math.min(1, dt * 1.4);
    const { core, heart, heartHalo, rings, beam, seam } = anchor.userData;
    seam.offset.y = -t * .35 * anchorPower;
    for (const r of rings) r.rotation.y += r.userData.speed * dt * (.15 + anchorPower);
    core.material.emissiveIntensity = .2 + 1.3 * anchorPower; heart.visible = anchorPower > .05; heart.scale.setScalar(.6 + .4 * anchorPower);
    heartHalo.material.opacity = .55 * anchorPower * (.85 + .15 * Math.sin(t * 3)); beam.material.opacity = .8 * anchorPower * anchorPower;
    anchorLight.intensity = 6 + 54 * anchorPower;
    if (camera) heartHalo.quaternion.copy(camera.quaternion);
  });

  // ---------- The city below and the skyline ----------
  const towers = [], cityBase = -280;
  // Window tile: 4 × 8 windows over 12 × 26 m. Classes by footprint and height keep the windows at scale.
  const towerTextures = [windowTex(.42), windowTex(.3), windowTex(.22)];
  const classes = [];
  for (const [k, w, d] of [[0, 22, 22], [1, 32, 28], [2, 44, 36]]) for (const h of [200, 330]) {
    const geometry = new T.BoxGeometry(1, 1, 1), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 12, uv.getY(i) * h / 26);
    classes.push({ k, w, d, h, geometry, list: [] });
  }
  const towerCount = low ? 120 : 280;
  for (let i = 0; i < towerCount; i++) {
    const a = rng() * TAU, r = 150 + Math.pow(rng(), .7) * 500, x = Math.cos(a) * r, z = Math.sin(a) * r * 1.15 - 10;
    // Near the Crown the city stays below its terraces, apart from a few landmark towers framing the view.
    const landmark = rng() < (r < 280 ? .1 : .16), top = landmark ? 40 + rng() * 120 : -190 + rng() * (r < 280 ? 200 : 170);
    const height = top - cityBase, k = Math.floor(rng() * 3), cls = classes.find(c => c.k === k && c.h === (height > 265 ? 330 : 200));
    cls.list.push([x, cityBase, z, cls.w * (.8 + rng() * .4), height, cls.d * (.8 + rng() * .4), rng() * Math.PI]);
    towers.push({ x, z, top });
  }
  const towerMaterials = towerTextures.map(tex => std({ color: 0x141a24, roughness: .55, metalness: .5, emissiveMap: tex, emissive: new T.Color(1, 1, 1), emissiveIntensity: low ? 1 : 1.25 }));
  for (const cls of classes) {
    if (!cls.list.length) continue;
    const mesh = new T.InstancedMesh(cls.geometry, towerMaterials[cls.k], cls.list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    cls.list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, m.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += cls.list.length;
  }
  // Neon strips and rooftop beacons in one coloured instanced mesh.
  {
    const neonColors = [0xffb35c, 0x3fe6d4, 0x9f8cff, 0xe8f6ff, 0xff7a3c, 0x55a8ff].map(c => new T.Color(c));
    const items = [];
    for (const tw of towers) {
      if (rng() < .6) items.push([tw.x + (rng() - .5) * 18, tw.top - 12 - rng() * 60, tw.z + (rng() - .5) * 18, .8, 8 + rng() * 26, .8, neonColors[Math.floor(rng() * neonColors.length)]]);
      if (rng() < .5) items.push([tw.x, tw.top + .5, tw.z, 1.4, 1, 1.4, neonColors[3]]);
    }
    const mesh = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), items.length), m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3();
    items.forEach(([x, y, z, sx, sy, sz, color], i) => { mesh.setMatrixAt(i, m.compose(p.set(x, y, z), q, s.set(sx, sy, sz))); mesh.setColorAt(i, color); });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += items.length;
  }
  // Holographic billboards facing the Crown (fictional brands of Vesper).
  const billboards = [];
  for (const [text, sub, color, a, r, y] of [
    ['HELIX', 'L’ANCRAGE VOUS RELIE', '#f4f7fb', -.6, 170, 26], ['SOMNIA', 'DORMEZ CERTIFIÉ', '#9f8cff', .35, 190, 8], ['VESPER TRANSIT', 'LIGNE 9 · COURONNE', '#3fe6d4', 2.4, 160, 14],
    ['NOVA-KAÏ', 'PROTÉINES DE SYNTHÈSE', '#ffb35c', -2.2, 200, 20], ['AEGIS NE VOUS', 'PROTÈGE PAS · HELIX VEILLE', '#e8f6ff', 1.2, 175, -4], ['ZONE COURONNE', 'ACCÈS RÉSERVÉ', '#ffb35c', -1.3, 150, 34]
  ].slice(0, low ? 4 : 6)) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 1.1 - 10;
    const bb = new T.Mesh(new T.PlaneGeometry(46, 17), new T.MeshBasicMaterial({ map: sign(text, sub, color), transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
    bb.position.set(x, y, z); bb.lookAt(0, y * .4, -10); bb.userData.phase = rng() * 10; billboards.push(bb); add(bb);
    queue(M.dark, x - Math.cos(a) * 3, y - 60, z - Math.sin(a) * 3, 3, 52, 3);
  }
  animated.push(t => { for (const bb of billboards) bb.material.opacity = .78 + .22 * Math.sin(t * 1.3 + bb.userData.phase) * (Math.sin(t * 17 + bb.userData.phase) > .97 ? .2 : 1); });
  // City glow and haze layers between the Crown and the streets.
  for (const [y, color, opacity] of [[-60, 0xffa86a, .2], [-140, 0x58d6ff, .16], [-220, 0xffc18a, .22]]) {
    const haze = new T.Mesh(new T.PlaneGeometry(1800, 1800), M.additive(color, opacity, glowDisc)); haze.rotation.x = -Math.PI / 2; haze.position.set(0, y, -40); haze.material.fog = false; add(haze);
  }
  // Air traffic lanes: light streaks gliding between the towers.
  const lanes = [], laneCount = low ? 6 : 12, carsPerLane = low ? 10 : 18;
  // Each lane is a chord well away from the Crown, mostly below its terraces: traffic is seen, never overhead.
  for (let i = 0; i < laneCount; i++) {
    const phi = rng() * TAU, d = 170 + rng() * 220, y = -130 + rng() * 135, cx = Math.cos(phi) * d, cz = Math.sin(phi) * d - 10, dx = -Math.sin(phi), dz = Math.cos(phi);
    lanes.push({ from: new T.Vector3(cx - dx * 520, y, cz - dz * 520), to: new T.Vector3(cx + dx * 520, y + (rng() - .5) * 20, cz + dz * 520), speed: .01 + rng() * .016 });
  }
  const traffic = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), laneCount * carsPerLane);
  {
    const head = new T.Color(0xf2f7ff), tail = new T.Color(0xffa04a);
    for (let i = 0; i < traffic.count; i++) traffic.setColorAt(i, i % 2 ? head : tail);
    traffic.instanceColor.needsUpdate = true; traffic.frustumCulled = false; add(traffic); stats.instances += traffic.count;
  }
  const tm = new T.Matrix4(), tq = new T.Quaternion(), tp = new T.Vector3(), ts = new T.Vector3(1.2, .5, 6), up = new T.Vector3(0, 1, 0);
  animated.push(t => {
    let n = 0;
    for (const lane of lanes) {
      tq.setFromRotationMatrix(tm.lookAt(lane.from, lane.to, up));
      for (let k = 0; k < carsPerLane; k++) {
        const u = ((t * lane.speed + k / carsPerLane) % 1 + (k % 2 ? .003 : 0));
        tp.lerpVectors(lane.from, lane.to, u % 1); traffic.setMatrixAt(n++, tm.compose(tp, tq, ts));
      }
    }
    traffic.instanceMatrix.needsUpdate = true;
  });
  // HELIX announcement drones circling the plaza.
  const drones = [];
  for (let i = 0; i < (low ? 1 : 3); i++) {
    const d = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(.45, 14, 10), M.white); d.add(body);
    const screen = new T.Mesh(new T.PlaneGeometry(1.6, .6), new T.MeshBasicMaterial({ map: sign('ZONE HELIX', 'CIRCULATION SURVEILLÉE', '#e8f6ff', 512, 192), transparent: true, toneMapped: false, side: T.DoubleSide })); screen.position.y = -.75; d.add(screen);
    const eye = new T.Mesh(new T.CircleGeometry(.12, 12), M.ice); eye.position.z = .46; d.add(eye);
    d.userData = { radius: 14 + i * 7, height: 11 + i * 3, speed: .12 + i * .04, phase: i * 2 }; drones.push(d); add(d);
  }
  animated.push(t => { for (const d of drones) { const u = d.userData, a = t * u.speed + u.phase; d.position.set(Math.cos(a) * u.radius, u.height + Math.sin(t * .9 + u.phase) * .4, 34 + Math.sin(a) * u.radius * .9); d.rotation.y = -a; } });

  // ---------- ORDRE tactical portals (Tome II PT02: announced, then units step out) ----------
  const portals = [];
  function openPortal(x, y, z, { charge = 3.2, hold = 2.2 } = {}) {
    const g = new T.Group(); g.position.set(x, y, z);
    const ring = new T.Mesh(new T.RingGeometry(1.7, 2.1, 40), M.additive(0xff3b4e, .0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const membrane = new T.Mesh(new T.CircleGeometry(1.9, 40), M.additive(0xff2d55, 0)); membrane.position.y = 2.2; membrane.scale.y = 1.15; g.add(membrane);
    const frame = new T.Mesh(new T.TorusGeometry(2, .14, 8, 40), M.dark); frame.position.y = 2.2; frame.scale.y = 1.15; g.add(frame);
    const emitters = [0, 1, 2].map(k => { const e = new T.Mesh(new T.BoxGeometry(.25, 1.6, .25), M.metal); const a = k / 3 * TAU; e.position.set(Math.cos(a) * 2.6, .8, Math.sin(a) * 2.6); e.rotation.z = Math.cos(a) * 1.2; e.rotation.x = -Math.sin(a) * 1.2; g.add(e); return e; });
    add(g); const p = { group: g, ring, membrane, frame, emitters, age: 0, charge, hold }; portals.push(p); return p;
  }
  animated.push((t, dt) => {
    for (let i = portals.length - 1; i >= 0; i--) {
      const p = portals[i]; p.age += dt; const c = Math.min(1, p.age / p.charge), end = p.charge + p.hold;
      p.ring.material.opacity = .9 * (.5 + .5 * Math.sin(t * 12)) * (p.age < end ? 1 : 0); p.ring.scale.setScalar(.6 + .5 * c);
      for (const e of p.emitters) { e.rotation.z *= .95; e.rotation.x *= .95; }
      p.membrane.material.opacity = p.age > p.charge * .7 ? Math.min(.75, (p.age - p.charge * .7) * 1.2) * Math.max(0, 1 - (p.age - end) * 1.5) : 0;
      p.frame.rotation.z = t * 2; p.group.visible = p.age < end + .8;
      if (p.age > end + .8) { root.remove(p.group); portals.splice(i, 1); }
    }
  });

  // Build everything queued.
  return {
    root, M,
    build(collisions) { for (const o of collisions) dress(o); flushPosts(); flushBoxes(); },
    update(t, dt, cam = camera) {
      if (cam) { skyDome.position.copy(cam.position); sun.position.copy(cam.position).addScaledVector(sunDir, 800); sun.lookAt(cam.position); }
      for (const c of clouds) c.material.map.offset.x += c.userData.speed * dt;
      for (const f of animated) f(t, dt);
    },
    openPortal,
    setGatesOpen(open) { gatesOpen = open; },
    setConsole(id, done) { const c = consoles.get(id); if (c) c.screen.material.map = done ? c.done : c.live; },
    setAnchorPower(value) { anchorTarget = value; },
    stats() { return { ...stats, portals: portals.length, anchorPower: +anchorPower.toFixed(2), gatesOpen }; }
  };
}
