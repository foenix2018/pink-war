// MISSION 03 dressing: the baked night Vesper sector (m03-sector.js) lit for three.js — sky, fog, rain around the
// eye, light halos on the neon, a small pool of point lights moved to the nearest neon clusters and street lamps —
// plus what the mission adds: the ambulance of Inès, the ORDRE barrier of the avenue, the tracking beacon at the
// fracture, the blocked interchange (ramps leaving the route haute, wrecks, the jack-knifed trailer and its winch)
// and the freight station of the Anneau logistique line (medical train, gantry, containers, regulation booth).
// W03 palette (Tome II): galvanised metal, dusty haze, white/red marking; Vesper neon on the avenue.
import { INTERACTIONS, MOVABLE, VAN, areaAt } from './m03-layout.js';
import { createSectorMeshes, neonSpots } from './m03-sector.js';
import { createSignage, BLADES } from './signage.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function canvasTexture(T, w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createM03Art(T, scene, { quality = 'normal', sector, accent = 0xff6fb4 } = {}) {
  const low = quality === 'low', rng = seeded(303);
  const root = new T.Group(); root.name = 'M03 / Le Convoi des Oubliés'; scene.add(root);
  const animated = [], stats = { meshes: 0, halos: 0, lights: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Night: sky, fog, moon and sky light ----------
  scene.background = new T.Color(0x070c16);
  scene.fog = new T.FogExp2(0x0b1424, low ? .011 : .0095);
  const sky = new T.HemisphereLight(0x6680b0, 0x2a2024, 1.6); scene.add(sky);
  const moon = new T.DirectionalLight(0x9db6dc, 1.15); moon.position.set(-40, 70, 30); scene.add(moon);
  // A starless, polluted sky dome with the glow of the city on the horizon.
  const skyTex = canvasTexture(T, 16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); for (const [a, col] of [[0, '#02040a'], [.55, '#0a1426'], [.78, '#2a1838'], [.9, '#4a2042'], [1, '#160d18']]) g.addColorStop(a, col); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const dome = new T.Mesh(new T.SphereGeometry(380, 24, 12), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -1; add(dome);

  // ---------- The baked sector ----------
  const sectorMeshes = createSectorMeshes(T, sector, { quality }); root.add(sectorMeshes.group);
  const spots = neonSpots(sector, { max: low ? 90 : 200 });

  // ---------- Materials for what the mission adds ----------
  const loader = new T.TextureLoader();
  const tex = (url, srgb = true, repeat = 1) => { const t = loader.load(url); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 6; return t; };
  const std = (color, roughness = .6, metalness = .2, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const glow = color => new T.MeshBasicMaterial({ color, toneMapped: false });
  const additive = (color, opacity = .6, map = null) => new T.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const M = {
    asphalt: std(0x7c8186, .55, .1, { map: tex('./assets/cc0/vesper-asphalt_diff_512.jpg', true, 10) }),
    concrete: std(0x9a9a96, .9, .02, { map: tex('./assets/cc0/vesper-concrete_diff_512.jpg', true, 2) }),
    galva: std(0xaeb8bf, .38, .75, { map: tex('./assets/cc0/vesper-steel_diff_512.jpg', true, 2) }),
    paint: std(0xd9d9d2, .55, .2, { map: tex('./assets/cc0/vesper-paint_diff_512.jpg', true, 2) }),
    dark: std(0x1a2028, .5, .6), black: std(0x0b0d10, .6, .3), rubber: std(0x111214, .9, 0), glass: std(0x6f8f9c, .05, .6, { transparent: true, opacity: .35 }),
    white: std(0xe8ebee, .35, .25), red: std(0xb5161e, .4, .3), yellow: std(0xd9b021, .5, .2), rust: std(0x7a4a32, .8, .4), container: [std(0x23566e, .6, .45), std(0x8a2a22, .6, .45), std(0x3d6b3a, .6, .45)],
    neonCyan: glow(0x5fe0f0), neonPink: glow(0xff4fa1), neonAmber: glow(0xffb35c), neonRed: glow(0xff2f45), neonWhite: glow(0xe8f6ff)
  };
  const box = (m, x, y, z, w, h, d, parent = root, ry = 0) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.rotation.y = ry; o.castShadow = false; o.receiveShadow = true; return add(o, parent); };
  const FONT = 'system-ui,"Segoe UI",Arial,sans-serif';
  const signTex = (lines, { bg = '#0b0d10', fg = '#f2f4f2', w = 512, h = 128, border = null } = {}) => canvasTexture(T, w, h, (c, W, H) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    if (border) { c.strokeStyle = border; c.lineWidth = Math.max(4, H * .05); c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth); }
    const rows = Array.isArray(lines) ? lines : [lines]; c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    rows.forEach((row, k) => { c.font = `${k ? 700 : 900} ${Math.round(H * (k ? .2 : .42) / Math.max(1, rows.length * .7))}px ${FONT}`; c.fillText(row, W / 2, H * (rows.length === 1 ? .52 : (k + .8) / (rows.length + .6)), W * .92); });
  });
  const sign = (lines, x, y, z, yaw, w, h, opts = {}, lit = true) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), lit ? new T.MeshBasicMaterial({ map: signTex(lines, opts), toneMapped: false }) : new T.MeshStandardMaterial({ map: signTex(lines, opts), roughness: .6 })); m.position.set(x, y, z); m.rotation.y = yaw; return add(m); };

  const signs = createSignage(T, { root, low });
  // The avenue and the city around it: shop blades, brand holograms, wayfinding towards the annex, the workshop and the freight station.
  function buildCity() {
    const blades = [[-12.6, 5.6, 17, '救急', '#ff4fa1', 'SOINS'], [-12.6, 5.2, 46, '薬局', '#5fe0f0', 'PHARMA'], [17.4, 5.4, 22, '修理', '#ffb35c', 'ATELIER'], [17.4, 5.8, 38, '電脳', '#c06bff', 'IMPLANTS'],
      [12.6, 5.6, -8, '夜市', '#ff4fa1', 'MARCHÉ'], [12.6, 5.2, -24, '酒場', '#ffb35c', 'BAR'], [-12.6, 5.6, -46, '倉庫', '#5fe0f0', 'DÉPÔT'], [12.6, 5.6, -70, '屋台', '#ff4fa1', 'NOUILLES'],
      [-12.6, 5.6, -82, '危険', '#ff3b4e', 'ZONE ROUGE'], [-12.6, 5.4, 62, '市場', '#ffb35c', 'MARCHÉ'], [12.6, 5.6, 50, '東', '#5fe0f0', 'EST']];
    for (const [x, y, z, word, color, sub] of blades.slice(0, low ? 6 : blades.length)) signs.blade(word, { color, sub, x, y, z, yaw: 0 });
    signs.advert('vesperTransit', { w: 10, h: 4, x: 20.6, y: 8.5, z: -16, yaw: -Math.PI / 2 });
    signs.advert('kitsune', { w: 8, h: 3.4, x: -22.6, y: 9, z: -76, yaw: Math.PI / 2 });
    signs.advert('janus', { w: 16, h: 5, x: 0, y: 19, z: -103, yaw: 0 });
    signs.advert('nova', { w: 5, h: 2.2, x: 17.6, y: 7.2, z: 30, yaw: -Math.PI / 2, holo: false });
    signs.advert('ordre', { w: 6, h: 2.4, x: -12.4, y: 7.5, z: -40, yaw: Math.PI / 2 });
    signs.advert('helix', { w: 9, h: 1.7, x: 30, y: 7.1, z: -52.1, yaw: 0, holo: false });
    signs.advert('koi', { w: 5, h: 2.4, x: -12.4, y: 7.6, z: 4, yaw: Math.PI / 2 });
    signs.advert('aegis', { w: 4, h: 1.8, x: -12.4, y: 6.8, z: 34, yaw: Math.PI / 2, holo: false });
    signs.wayfinding('ANNEXE MÉDICALE', { sub: 'DISPENSAIRE DU SECTEUR 03', jp: '医療棟', picto: 'medic', arrow: Math.PI / 2, color: '#ff6fb4', w: 3, h: .8, x: 11.6, y: 3.2, z: 47, yaw: 0 });
    signs.wayfinding('ATELIER TECHNIQUE', { sub: 'PIÈCES · VÉRINS · POMPES', jp: '整備工場', picto: 'bolt', arrow: -Math.PI / 2, color: '#ffb35c', w: 3, h: .8, x: -11.6, y: 3.2, z: 32, yaw: 0 });
    signs.wayfinding('ARCHIVES A3', { sub: 'TERRASSE · ESCALIER', jp: '記録 · 中継', picto: 'lift', arrow: 0, color: '#5fe0f0', w: 3, h: .8, x: -6.4, y: 3.2, z: -5, yaw: 0 });
    signs.wayfinding('GARE DE FRET 03', { sub: 'VOIE DE SERVICE SOUS LA ROUTE HAUTE', jp: '貨物駅', picto: 'train', arrow: -Math.PI / 2, color: '#ffc890', w: 3.4, h: .8, x: 11.6, y: 3.2, z: -42, yaw: 0 });
    signs.wayfinding('PÉRIMÈTRE PINK', { sub: 'ACCÈS INTERDIT · ORDRE', jp: '立入禁止', picto: 'warn', arrow: null, color: '#ff3b4e', bg: '#160307', w: 3.4, h: .8, x: -8, y: 3, z: -78, yaw: 0 });
  }

  // ---------- East zone: ground, interchange, freight station ----------
  function buildEast() {
    const ground = new T.Mesh(new T.PlaneGeometry(40, 70), M.asphalt); ground.rotation.x = -Math.PI / 2; ground.position.set(80, .006, -64); ground.receiveShadow = true; add(ground);
    // Lane markings: white/red (W03), the van lane x 78…82 kept clear.
    for (let z = -96; z < -32; z += 4) box(M.white, 78, .012, z, .14, .005, 2);
    for (let x = 64; x < 96; x += 3) box(M.red, x, .012, -72, 1.4, .005, .3);
    // Noise walls with an LED strip, the south wall of the interchange.
    box(M.concrete, 97, 0, -64, 1, 5, 68); box(M.concrete, 79.5, 0, -30.1, 35, 5, 1);
    const strip = box(M.neonCyan, 96.45, 3.8, -64, .05, .08, 66); strip.material = M.neonCyan;
    // Elevated ramps leaving the route haute (viaduct deck at y 8.5, east end x 62.5): two decks curving down.
    const ramp = (pts, width) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x1, y1, z1] = pts[i], [x2, y2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1), mid = new T.Vector3((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
        const deck = new T.Mesh(new T.BoxGeometry(width, .55, len + .2), M.concrete); deck.position.copy(mid); deck.rotation.order = 'YXZ'; deck.rotation.y = Math.atan2(x2 - x1, z2 - z1); deck.rotation.x = -Math.atan2(y2 - y1, len); add(deck);
        for (const s of [-1, 1]) { const rail = new T.Mesh(new T.BoxGeometry(.12, .9, len + .2), M.galva); rail.position.copy(mid); rail.rotation.copy(deck.rotation); rail.translateX(s * width / 2); rail.translateY(.7); add(rail);
          const led = new T.Mesh(new T.BoxGeometry(.05, .05, len), s > 0 ? M.neonRed : M.neonWhite); led.position.copy(rail.position); led.rotation.copy(deck.rotation); led.translateY(.48); add(led); }
      }
    };
    ramp([[62, 8.2, -56], [70, 8, -60], [78, 7.2, -62], [86, 6.1, -59], [92, 4.6, -52], [94, 3, -44], [94, 1.6, -38]], 7);
    ramp([[62, 8.4, -54], [70, 9.4, -46], [76, 10, -38], [84, 10.4, -34], [96, 10.6, -34]], 6.5);
    for (const [x, z, h] of [[68, -60, 8], [76, -62, 7.2], [86, -60, 6.1], [92, -52, 4.6], [70, -34.6, 9.6], [88, -34.6, 10.2]]) { const p = new T.Mesh(new T.CylinderGeometry(.7, .8, h, 12), M.concrete); p.position.set(x, h / 2, z); add(p); }
    // Wrecks: a car, a crashed truck, an AEGIS van from two days ago (the one ORDRE stopped), concrete barriers.
    car(68, -42, 0); car(90, -44, Math.PI / 2, M.rust);
    truck(70, -66, 0, M.paint, 'TRANSPORTS VESPER'); aegisVan(92, -66, Math.PI / 2, true);
    for (const [x, z] of [[66, -52], [73, -55], [88, -48], [93, -58]]) { box(M.concrete, x, 0, z, 2.2, 1.1, .7); box(M.red, x, .75, z, 2.22, .12, .72); }
    winchPost(70, -46);
    // Freight station: tracks, the medical train, platform edge, containers, booth, gantry.
    for (const z of [-96.6, -95.4]) box(M.galva, 80, 0, z, 34, .14, .12);
    for (let x = 64; x < 96; x += 1.2) box(M.dark, x, 0, -96, .3, .08, 2.4);
    train();
    for (let x = 64; x < 96; x += 2) box(x % 4 ? M.yellow : M.black, x, .01, -93.6, 1, .006, .3);
    containers();
    booth();
    for (const [x, z] of [[64.5, -76], [95.5, -86]]) { const leg = new T.Mesh(new T.BoxGeometry(1.2, 12, 1.2), M.yellow); leg.position.set(x, 6, z); add(leg); }
    box(M.yellow, 80, 11.4, -81, 33, 1, 1.4); const trolley = box(M.dark, 76, 9.6, -81, 3, 1.4, 2.2); animated.push(t => { trolley.position.x = 80 + Math.sin(t * .15) * 10; });
    arrimagePost(72, -86);
    // Lamp posts along the service lane and the interchange (each one is also a source of the light pool).
    for (const [x, z, k] of [[20, -33.4, 0], [34, -33.4, 1], [48, -33.4, 0], [62, -33.4, 1], [74, -32, 0], [86, -32, 1], [64.4, -50, 0], [64.4, -66, 1], [95.6, -60, 0], [95.6, -72, 1], [64.4, -90, 0]]) lampPost(x, z, k);
    signs.neon(['GARE DE FRET 03', 'LIGNE DE L’ANNEAU LOGISTIQUE · 貨物駅'], { color: '#ffc890', color2: '#5fe0f0', kanji: '駅', w: 9, h: 2, x: 79.5, y: 4.1, z: -30.65, yaw: Math.PI });
    signs.wayfinding('ANNEAU LOGISTIQUE', { sub: 'QUAI B · CENTRE DE STABILISATION', jp: '環状物流 · B番線', picto: 'train', arrow: Math.PI / 2, color: '#ff4d5e', w: 7, h: 1.5, x: 96.45, y: 4.4, z: -80, yaw: -Math.PI / 2 });
    signs.wayfinding('BRETELLE FERMÉE', { sub: 'ORDRE · CONTRÔLE DU TRAFIC', jp: '通行止め', picto: 'warn', arrow: null, color: '#ff3b4e', bg: '#160307', w: 6, h: 1.4, x: 96.45, y: 4.4, z: -48, yaw: -Math.PI / 2 });
    signs.hazard('TREUIL', { sub: 'CÂBLE SOUS TENSION · S’ÉCARTER', w: 1, h: .66, x: 70, y: 1.95, z: -45.54, yaw: 0 });
    signs.hazard('ARRIMAGE', { sub: 'NE PAS STATIONNER SOUS LE PORTIQUE', w: 1, h: .66, x: 72, y: 1.95, z: -85.54, yaw: 0 });
    signs.hazard('CHARGE LOURDE', { sub: 'DIRECTOIRE · FRET SÉCURISÉ', picto: 'warn', w: 1.4, h: .7, x: 92, y: 2.3, z: -80.68, yaw: 0 });
    signs.advert('vesperTransit', { w: 8, h: 3.2, x: 96.4, y: 8.5, z: -66, yaw: -Math.PI / 2 });
    signs.blade('貨物', { color: '#ffc890', sub: 'FRET', x: 65.2, y: 5.2, z: -74.4, yaw: Math.PI / 2 });
  }
  function wheelSet(g, L, W, r = .45) { for (const sx of [L / 2 - 1, -L / 2 + 1]) for (const sz of [-1, 1]) { const w = new T.Mesh(new T.CylinderGeometry(r, r, .3, 16), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(sx, r, sz * (W / 2 - .05)); g.add(w); } }
  function car(x, z, yaw, body = M.paint) { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; add(g); const p = (m, px, py, pz, w, h, d) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); g.add(o); };
    p(body, 0, .65, 0, 4.2, .7, 1.9); p(body, -.2, 1.25, 0, 2.3, .6, 1.75); p(M.glass, -.2, 1.25, 0, 2.32, .5, 1.6); wheelSet(g, 4.2, 1.9, .36); g.rotation.z = .04; }
  function truck(x, z, yaw, body, label) { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; add(g); const p = (m, px, py, pz, w, h, d) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); g.add(o); return o; };
    p(M.dark, 3.2, 1.5, 0, 1.6, 2.2, 2.4); p(M.glass, 4.02, 1.9, 0, .04, .9, 2.1); p(body, -1, 1.7, 0, 6.2, 2.8, 2.5); p(M.dark, 0, .5, 0, 8, .4, 2.2); wheelSet(g, 8, 2.5, .5);
    const s = new T.Mesh(new T.PlaneGeometry(4, .7), new T.MeshStandardMaterial({ map: signTex(label, { bg: null, fg: '#2a3a48', w: 512, h: 96 }), transparent: true, alphaTest: .05 })); s.position.set(-1, 2.2, 1.26); g.add(s); g.rotation.x = .03; return g; }
  // Inès's ambulance (and the burnt AEGIS van at the interchange).
  function aegisVan(x, z, yaw, burnt = false) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; add(g);
    const L = VAN.halfLength * 2, W = VAN.halfWidth * 2, body = burnt ? M.rust : M.white;
    const p = (m, px, py, pz, w, h, d) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = !low; g.add(o); return o; };
    // Cab towards −z (front), box body behind.
    p(body, 0, 1.25, -L / 2 + 1, W, 1.5, 1.9); p(M.glass, 0, 1.65, -L / 2 + .04, W - .2, .75, .04);
    p(body, 0, 1.55, .6, W, 2.3, L - 2.1); p(M.dark, 0, .45, 0, W - .2, .5, L - .2);
    for (const sz of [-L / 2 + 1, L / 2 - .9]) for (const sx of [-1, 1]) { const w = new T.Mesh(new T.CylinderGeometry(.44, .44, .3, 16), M.rubber); w.rotation.z = Math.PI / 2; w.position.set(sx * (W / 2 - .05), .44, sz); g.add(w); }
    // Door seams, steps and bumper give the rescue van a readable structure.
    for (const side of [-1, 1]) {
      p(M.dark, side * (W / 2 + .01), .65, -L / 2 + 1.8, .025, 1.15, .035);
      p(M.dark, side * (W / 2 + .02), .43, 0, .12, .12, L - 2.2);
      p(M.galva, side * (W / 2 + .025), 1.35, .2, .03, .06, .3);
    }
    p(M.dark, 0, .55, -L / 2 - .04, W + .08, .17, .12);
    p(M.dark, 0, 1.05, -L / 2 - .055, W * .5, .24, .03);
    const lights = [];
    if (!burnt) {
      for (const s of [-1, 1]) { p(M.red, s * (W / 2 + .005), 1.05, .6, .01, .24, L - 2.1); p(M.yellow, s * (W / 2 + .006), 1.32, .6, .01, .08, L - 2.1);
        const label = new T.Mesh(new T.PlaneGeometry(2.6, .55), new T.MeshStandardMaterial({ map: signTex(['AMBULANCE', 'AEGIS · 03'], { bg: null, fg: '#a3241c', w: 512, h: 128 }), transparent: true, alphaTest: .05 }));
        label.position.set(s * (W / 2 + .012), 2, .6); label.rotation.y = s * Math.PI / 2; g.add(label); }
      for (const s of [-1, 1]) { const b = p(new T.MeshBasicMaterial({ color: 0x2a6bff, toneMapped: false }), s * .55, 2.75, -L / 2 + 1.1, .3, .16, .3); lights.push(b); }
      for (const s of [-1, 1]) p(M.neonWhite, s * .7, .95, -L / 2 - .01, .3, .16, .02);
      const head = new T.SpotLight(0xfff4e0, low ? 0 : 26, 26, .55, .6, 1.4); head.position.set(0, 1.1, -L / 2); head.target.position.set(0, 0, -L / 2 - 12); g.add(head); g.add(head.target);
      const flash = new T.PointLight(0x3a72ff, 0, 14, 2); flash.position.set(0, 3, -L / 2 + 1); g.add(flash);
      return { g, lights, flash, body: g };
    }
    g.rotation.z = .12; return { g };
  }
  function winchPost(x, z) { box(M.yellow, x, 0, z, .9, 1.3, .9); box(M.dark, x, 1.3, z, 1, .3, 1); const drum = new T.Mesh(new T.CylinderGeometry(.35, .35, .8, 14), M.galva); drum.rotation.z = Math.PI / 2; drum.position.set(x, 1, z + .55); add(drum); devicesExtra.treuil = drum; }
  function lampPost(x, z, k) {
    const pole = new T.Mesh(new T.CylinderGeometry(.09, .12, 7, 8), M.galva); pole.position.set(x, 3.5, z); add(pole);
    // A hood, diffuser and end plates form a physical luminaire around the light source.
    box(M.dark, x, 6.97, z, 1.35, .16, .52);
    box(k ? M.neonAmber : M.neonWhite, x, 6.93, z, 1.1, .04, .32);
    for (const side of [-1, 1]) box(M.galva, x + side * .62, 6.91, z, .09, .2, .54);
    box(M.galva, x, 6.8, z, .13, .17, .13);
    const cone = new T.Mesh(new T.ConeGeometry(2.4, 6.8, 18, 1, true), additive(k ? 0xffb35c : 0xcfe8ff, .045)); cone.position.set(x, 3.6, z); add(cone);
    sources.push({ x, y: 6.8, z, color: new T.Color(k ? 0xffb070 : 0xdcecff), intensity: 14, range: 20 });
  }
  function arrimagePost(x, z) { box(M.dark, x, 0, z, .9, 1.3, .9); box(M.neonAmber, x, 1.3, z + .46, .5, .3, .02); }
  function train() {
    const cars = [[67, 'LOCO'], [76, 'SANITAIRE 7'], [85, 'SANITAIRE 7'], [93.5, 'FRET']];
    for (const [x, name] of cars) {
      const g = new T.Group(); g.position.set(x, 0, -96); add(g);
      const p = (m, px, py, pz, w, h, d) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); g.add(o); return o; };
      p(name === 'LOCO' ? M.dark : M.white, 0, 2.3, 0, name === 'FRET' ? 5 : 8.4, 3.4, 3); p(M.dark, 0, .6, 0, 8, .6, 2.6);
      for (const s of [-1.5, 1.5]) for (const k of [-2.6, 2.6]) { const w = new T.Mesh(new T.CylinderGeometry(.42, .42, .2, 14), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(k, .45, s); g.add(w); }
      if (name.startsWith('SANITAIRE')) {
        p(M.red, 0, 3.1, 1.51, 8.4, .25, .02); p(M.neonWhite, 0, 2.4, 1.52, 7.6, .06, .02);
        const s = new T.Mesh(new T.PlaneGeometry(3.6, .9), new T.MeshBasicMaterial({ map: signTex(['✚ ' + name, 'ANNEAU LOGISTIQUE'], { bg: '#e8ebee', fg: '#c1121f', w: 512, h: 128 }), toneMapped: false })); s.position.set(0, 2.2, 1.53); g.add(s);
        for (let k = -3; k <= 3; k += 1.5) p(M.neonAmber, k, 2.9, 1.52, .9, .4, .02);
      }
      if (name === 'LOCO') { p(M.neonRed, -4.21, 2.8, 0, .02, .2, 2.4); p(M.neonWhite, -4.21, 1.4, -1, .02, .2, .4); p(M.neonWhite, -4.21, 1.4, 1, .02, .2, .4); }
    }
    // Loading ramp of the medical wagon, where the van drives on.
    box(M.galva, 80, 0, -92.6, 4, .4, 2.2);
  }
  function containers() {
    for (const [x, z, w, d, k] of [[67, -80, 2.6, 6, 0], [92, -82, 6, 2.6, 1], [68, -88, 2.6, 4.8, 2]]) {
      const c = box(M.container[k], x, 0, z, w, 2.7, d);
      for (let i = 0; i < 10; i++) box(M.dark, x + (w > d ? -w / 2 + .3 + i * (w - .6) / 9 : w / 2 + .01), .1, z + (w > d ? d / 2 + .01 : -d / 2 + .3 + i * (d - .6) / 9), w > d ? .06 : .02, 2.5, w > d ? .02 : .06);
      // Corner posts and door locking bars add structure without affecting cover.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(M.galva, x + sx * (w / 2 - .07), .04, z + sz * (d / 2 - .07), .14, 2.62, .14);
      for (const sx of [-1, 1]) {
        box(M.dark, x + sx * w * .23, .18, z + d / 2 + .025, .045, 2.3, .045);
        box(M.galva, x + sx * w * .23, 1.05, z + d / 2 + .055, .22, .05, .05);
      }
      box(M.galva, x, 2.6, z, w + .03, .1, d + .03);
      void c;
    }
    box(M.container[1], 67, 2.7, -80, 2.6, 2.7, 6);
  }
  function booth() {
    box(M.galva, 93, 0, -75, 6, .3, 6); box(M.dark, 93, .3, -75, 6, 2.6, 6); box(M.glass, 89.98, 1.2, -75, .05, 1.4, 5.4);
    box(M.galva, 93, 2.9, -75, 6.4, .3, 6.4); signs.neon(['RÉGULATION', 'GARE DE FRET 03'], { color: '#ffc890', kanji: '管制', w: 2.8, h: .8, x: 89.94, y: 3.4, z: -75, yaw: -Math.PI / 2 });
    box(M.neonAmber, 89.95, 1, -75, .02, .5, 1.2);
  }

  // ---------- The avenue: ORDRE barrier, tracking beacon at the fracture ----------
  const movable = new Map();
  function buildBarrier() {
    const b = MOVABLE.barriere;
    for (const s of [-1, 1]) { box(M.dark, s * 9.6, 0, b.z, .7, 1.6, .7); box(M.neonRed, s * 9.6, 1.6, b.z, .3, .3, .3); }
    const pivot = new T.Group(); pivot.position.set(-9.6, 1.2, b.z); add(pivot);
    const boom = new T.Mesh(new T.BoxGeometry(18.6, .28, .22), M.white); boom.position.x = 9.3; pivot.add(boom);
    for (let k = 0; k < 9; k++) { const s = new T.Mesh(new T.BoxGeometry(1, .29, .23), M.red); s.position.x = 1 + k * 2; pivot.add(s); }
    const holo = new T.Mesh(new T.PlaneGeometry(6, 1.4), additive(0xffffff, .55, signTex(['BARRAGE 03 · DIRECTOIRE', 'VÉHICULES NON AUTORISÉS'], { bg: 'rgba(40,0,8,.35)', fg: '#ff4d5e', w: 512, h: 120, border: '#ff2f45' }))); holo.position.set(0, 3.2, b.z); add(holo);
    movable.set('barriere', { open: 0, target: 0, apply: v => { pivot.rotation.z = v * 1.35; holo.material.opacity = .55 * (1 - v); } });
    animated.push(t => { holo.material.opacity *= Math.sin(t * 17) > .95 ? .3 : 1; });
  }
  function buildTrailer() {
    const o = MOVABLE.remorque, g = new T.Group(); g.position.set(o.x, 0, o.z); add(g);
    const body = new T.Mesh(new T.BoxGeometry(o.hx * 2, 3, o.hz * 2), M.container[0]); body.position.y = 2; g.add(body);
    const base = new T.Mesh(new T.BoxGeometry(o.hx * 2, .4, o.hz * 2 - .2), M.dark); base.position.y = .5; g.add(base);
    for (const k of [-5, -3.6, 4.6]) for (const s of [-1, 1]) { const w = new T.Mesh(new T.CylinderGeometry(.45, .45, .3, 14), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(k, .45, s * (o.hz - .1)); g.add(w); }
    const s = new T.Mesh(new T.PlaneGeometry(6, .8), new T.MeshStandardMaterial({ map: signTex('DIRECTOIRE · FRET SÉCURISÉ', { bg: null, fg: '#e9ecee', w: 512, h: 80 }), transparent: true, alphaTest: .05 })); s.position.set(0, 2.4, o.hz + .01); g.add(s);
    g.rotation.y = .1;
    const cable = new T.Mesh(new T.CylinderGeometry(.03, .03, 1, 5), M.black); add(cable);
    movable.set('remorque', { open: 0, target: 0, apply: v => { g.position.set(o.x + 12 * v, 0, o.z - 2 * v); g.rotation.y = .1 + v * .5;
      const a = new T.Vector3(70, 1, -45.5), bpt = new T.Vector3(g.position.x - 6, 1.2, g.position.z); cable.position.copy(a).lerp(bpt, .5); cable.scale.y = a.distanceTo(bpt); cable.lookAt(bpt); cable.rotateX(Math.PI / 2); } });
  }
  let beacon = null;
  function buildBeacon() {
    const g = new T.Group(); g.position.set(0, 0, -93.6); add(g);
    const mast = new T.Mesh(new T.CylinderGeometry(.18, .3, 4.2, 10), M.dark); mast.position.y = 2.1; g.add(mast);
    const head = new T.Mesh(new T.OctahedronGeometry(.45, 0), M.neonRed); head.position.y = 4.5; g.add(head);
    const beam = new T.Mesh(new T.CylinderGeometry(.15, .5, 60, 12, 1, true), additive(0xff2f45, .25)); beam.position.y = 34; g.add(beam);
    const ring = new T.Mesh(new T.RingGeometry(1.2, 1.4, 36), additive(0xff2f45, .6)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    beacon = { g, head, beam, ring, off: 0 };
  }

  // ---------- Interaction markers ----------
  const devices = new Map(), devicesExtra = {};
  function buildDevices() {
    for (const it of INTERACTIONS) {
      const g = new T.Group(); g.position.set(it.x, (it.y || 0), it.z); add(g);
      const gem = new T.Mesh(new T.OctahedronGeometry(.13, 0), new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false })); gem.position.y = 1.9; g.add(gem);
      const ring = new T.Mesh(new T.RingGeometry(.5, .58, 28), additive(0xffb35c, .35)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
      if (it.log && !it.id.startsWith('doc-')) { const pad = new T.Mesh(new T.BoxGeometry(.5, .32, .05), M.dark); pad.position.set(0, 1.2, 0); g.add(pad); const scr = new T.Mesh(new T.PlaneGeometry(.42, .24), M.neonCyan); scr.position.set(0, 1.2, .03); g.add(scr); }
      else if (it.id.startsWith('doc-')) { const paper = new T.Mesh(new T.PlaneGeometry(.3, .4), std(0xe8e1cf, .9, 0, { side: T.DoubleSide })); paper.position.set(0, 1.15, 0); paper.rotation.x = -.3; g.add(paper); }
      devices.set(it.id, { it, g, gem, ring, done: false, available: false });
    }
  }
  function updateDevices(t, eye) {
    const blink = .5 + .5 * Math.sin(t * 5);
    for (const d of devices.values()) {
      const doc = !!d.it.log, color = d.done ? 0x3dff8a : doc ? 0xe8f6ff : d.available ? 0xffb35c : 0x3a2a1a;
      d.gem.material.color.set(color); d.ring.material.color.set(color);
      const show = d.available || (doc && !d.done) || d.done;
      d.gem.visible = show; d.ring.visible = show && !d.done;
      d.gem.position.y = 1.9 + Math.sin(t * 2 + d.it.x) * .08; d.gem.rotation.y = t * 1.6;
      d.ring.material.opacity = d.available ? .25 + .35 * blink : doc ? .22 : .12;
      if (eye && Math.hypot(eye.x - d.it.x, eye.z - d.it.z) > 60) d.g.visible = false; else d.g.visible = true;
    }
  }

  // ---------- Light pool, halos, rain ----------
  const lamps = [];
  for (let z = 58; z > -96; z -= 16) for (const s of [-1, 1]) lamps.push({ x: s * 11.4, y: 6.4, z, color: new T.Color(s > 0 ? 0xffb070 : 0x9fdcff), intensity: 9, range: 18 });
  const sources = [...spots.slice(0, low ? 40 : 90).map(s => ({ x: s.x, y: s.y, z: s.z, color: new T.Color(s.r, s.g, s.b).multiplyScalar(1.2), intensity: 6 + Math.min(10, s.area * 2), range: 12 })), ...lamps,
    { x: 80, y: 9, z: -86, color: new T.Color(0xfff3dc), intensity: 30, range: 24 }, { x: 80, y: 9, z: -60, color: new T.Color(0xfff3dc), intensity: 20, range: 22 }, { x: 80, y: 9, z: -42, color: new T.Color(0xffc890), intensity: 16, range: 20 }];
  const POOL = low ? 3 : 6;
  const pool = Array.from({ length: POOL }, () => { const l = new T.PointLight(0xffffff, 0, 14, 1.7); add(l, scene); return { l, s: null, level: 0 }; });
  function updatePool(dt, eye) {
    const wanted = sources.map(s => ({ s, d: Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z) / Math.sqrt(s.intensity / 8) })).filter(o => o.d < 26).sort((a, b) => a.d - b.d).slice(0, POOL).map(o => o.s);
    const set = new Set(wanted);
    for (const slot of pool) { if (slot.s && !set.has(slot.s)) slot.level = Math.max(0, slot.level - dt * 6); else if (slot.s) slot.level = Math.min(1, slot.level + dt * 5); if (slot.level <= 0) slot.s = null; }
    for (const s of wanted) if (!pool.some(p => p.s === s)) { const free = pool.find(p => !p.s); if (free) { free.s = s; free.level = 0; } }
    for (const slot of pool) { const s = slot.s; if (!s) { slot.l.intensity = 0; continue; } slot.l.position.set(s.x, s.y - .4, s.z); slot.l.color.copy(s.color); slot.l.distance = s.range; slot.l.intensity = s.intensity * slot.level; }
    stats.lights = pool.filter(p => p.s).length;
  }
  // Soft halos on the brightest neon (a cheap stand-in for bloom).
  const halo = canvasTexture(T, 64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.25, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const haloCount = Math.min(spots.length, low ? 60 : 160);
  const halos = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: halo, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true, opacity: .55 }), haloCount);
  halos.frustumCulled = false; add(halos); stats.halos = haloCount;
  const hm = new T.Matrix4(), hq = new T.Quaternion(), hp = new T.Vector3(), hs = new T.Vector3(), up = new T.Vector3(0, 1, 0), tmpE = new T.Euler();
  for (let i = 0; i < haloCount; i++) halos.setColorAt(i, new T.Color(spots[i].r, spots[i].g, spots[i].b));
  function updateHalos(eye) {
    for (let i = 0; i < haloCount; i++) { const s = spots[i], size = 1.6 + Math.min(4, Math.sqrt(s.area) * 1.6); hp.set(s.x, s.y, s.z); hq.setFromEuler(tmpE.set(0, Math.atan2(eye.x - s.x, eye.z - s.z), 0)); halos.setMatrixAt(i, hm.compose(hp, hq, hs.set(size, size, size))); }
    halos.instanceMatrix.needsUpdate = true;
  }
  // Rain around the eye.
  const RAIN = low ? 500 : 1400, rainPos = new Float32Array(RAIN * 6), drops = [];
  for (let i = 0; i < RAIN; i++) drops.push({ x: (rng() - .5) * 60, y: rng() * 24, z: (rng() - .5) * 60, v: 14 + rng() * 6 });
  const rainGeo = new T.BufferGeometry(); rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
  const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: 0x8fb8d6, transparent: true, opacity: low ? .22 : .3, depthWrite: false })); rain.frustumCulled = false; add(rain);
  function updateRain(dt, eye) {
    const covered = (x, z) => { const a = areaAt(x, z); return a === 'annexe' || a === 'atelier'; };
    for (let i = 0; i < RAIN; i++) { const d = drops[i]; d.y -= d.v * dt; if (d.y < 0) { d.y = 24; d.x = (rng() - .5) * 60; d.z = (rng() - .5) * 60; }
      const x = eye.x + d.x, z = eye.z + d.z, o = i * 6, hide = covered(x, z) ? -50 : 0;
      rainPos[o] = x; rainPos[o + 1] = d.y + hide; rainPos[o + 2] = z; rainPos[o + 3] = x - .05; rainPos[o + 4] = d.y - .5 + hide; rainPos[o + 5] = z - .03; }
    rainGeo.attributes.position.needsUpdate = true;
  }

  // ---------- ORDRE tactical portals ----------
  const portals = [];
  function openPortal(x, y, z, { charge = 3.2, hold = 2.2 } = {}) {
    const g = new T.Group(); g.position.set(x, y, z);
    const ring = new T.Mesh(new T.RingGeometry(1.5, 1.85, 40), additive(0xff3b4e, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const membrane = new T.Mesh(new T.CircleGeometry(1.6, 40), additive(0xff2d55, 0)); membrane.position.y = 1.7; g.add(membrane);
    const frame = new T.Mesh(new T.TorusGeometry(1.7, .12, 8, 40), M.dark); frame.position.y = 1.7; g.add(frame);
    add(g); portals.push({ group: g, ring, membrane, frame, age: 0, charge, hold });
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

  // ---------- Build ----------
  let amb = null, smoke = null;
  const power = { annexe: false };
  function build() {
    buildCity(); buildEast(); buildBarrier(); buildTrailer(); buildBeacon(); buildDevices();
    amb = aegisVan(-6, 46, 0);
    // Smoke of a damaged van.
    smoke = Array.from({ length: low ? 4 : 8 }, () => { const s = new T.Sprite(new T.SpriteMaterial({ map: halo, color: 0x444444, transparent: true, opacity: 0, depthWrite: false })); add(s); return s; });
    for (const m of movable.values()) m.apply(0);
  }

  return {
    root, M, build, openPortal,
    update(t, dt, eye, player, { van = null, beaconOff = false, crank = false } = {}) {
      const e = eye.position;
      sectorMeshes.update(t); updatePool(dt, e); updateHalos(e); updateRain(dt, e); updatePortals(t, dt, e); updateDevices(t, e);
      for (const m of movable.values()) { m.open += Math.sign(m.target - m.open) * Math.min(Math.abs(m.target - m.open), dt * .35); m.apply(m.open); }
      if (devicesExtra.treuil && crank) devicesExtra.treuil.rotation.x += dt * 6;
      if (beacon) { beacon.off += ((beaconOff ? 1 : 0) - beacon.off) * Math.min(1, dt * 2); const on = 1 - beacon.off;
        beacon.beam.material.opacity = (.18 + .1 * Math.sin(t * 4)) * on; beacon.ring.material.opacity = .6 * on * (.5 + .5 * Math.sin(t * 6)); beacon.head.rotation.y = t * 2; beacon.head.material.color.set(on > .5 ? 0xff2f45 : 0x3dff8a); }
      if (van && amb) {
        amb.g.position.set(van.x, 0, van.z); amb.g.rotation.y = van.yaw;
        const flash = Math.sin(t * 9) > 0; amb.lights[0].material.color.set(flash ? 0x2a6bff : 0x0a1430); amb.lights[1].material.color.set(flash ? 0x0a1430 : 0x2a6bff);
        amb.flash.intensity = low ? 0 : (van.moving || van.waiting === 'machines' ? 5 : 2) * (flash ? 1 : .2);
        const hurt = Math.max(0, 1 - van.hp / 60);
        smoke.forEach((s, i) => { const k = (t * .4 + i / smoke.length) % 1; s.position.set(van.x + Math.sin(i) * .4, 2.2 + k * 3, van.z); s.scale.setScalar(.8 + k * 2.2); s.material.opacity = hurt * .35 * (1 - k); });
      }
      for (const f of animated) f(t, dt, e);
      signs.update(t);
    },
    setMovable(id, open) { const m = movable.get(id); if (m) m.target = open ? 1 : 0; },
    snapMovable(id, open) { const m = movable.get(id); if (m) { m.target = m.open = open ? 1 : 0; m.apply(m.open); } },
    setPower(zone, on) { power[zone] = !!on; },
    markDone(id, done = true) { const d = devices.get(id); if (d) d.done = done; },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { ...stats, sector: sectorMeshes.stats, portals: portals.length, movable: Object.fromEntries([...movable].map(([k, v]) => [k, +v.open.toFixed(2)])), beacon: beacon ? +(1 - beacon.off).toFixed(2) : null }; }
  };
}
