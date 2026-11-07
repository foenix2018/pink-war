// M02 « Sous les Néons » — the enclave of the Épars and the transit tower, lived in (feedback of 7 Nov 2026: the level
// felt empty). Purely visual and without colliders: it never changes gameplay or the navigation grid.
//  · warm light pools under every bulb (additive, no extra dynamic light) and strings of bulbs over the market;
//  · laundry lines, crates, barrels, sacks, water cans and bedding along the walls and stalls;
//  · the service corridor: cable tray with status LEDs, pipe run, painted guide line, notices;
//  · the dispensary, radio room and tower lobby: curtains, drip stands, maps, notices, benches;
//  · survivors: blanketed sleepers (they breathe) and hooded figures sitting by the lanterns.
import {Assembly, matrix} from './geo.js';

const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

export function createEnclaveLife(T, parent, { low = false } = {}) {
  const root = new T.Group(); root.name = 'M02 / vie de l’enclave'; parent.add(root);
  const rng = seeded(20261107), owned = [], animated = [], stats = { lamps: 0, pools: 0, sleepers: 0, sitters: 0, props: 0, notices: 0 };
  let built = false, disposed = false;
  const std = (color, roughness = .85, metalness = .05, extra = {}) => { const m = new T.MeshStandardMaterial({ color, roughness, metalness, ...extra }); owned.push(m); return m; };
  const glow = color => { const m = new T.MeshBasicMaterial({ color, toneMapped: false }); owned.push(m); return m; };
  const M = {
    crate: std(0x6d5a42, .9), crateDark: std(0x4a3d2e, .92), barrel: std(0x39474c, .55, .6), rust: std(0x7a4d33, .8, .35), sack: std(0x8d7e5f, .95),
    can: std(0x5e6f45, .6, .35), blueTarp: std(0x4c7480, .9, 0, { side: T.DoubleSide }), clothA: std(0xd4cbb4, .95, 0, { side: T.DoubleSide }), clothB: std(0x8f5d56, .95, 0, { side: T.DoubleSide }),
    clothC: std(0x5d7a8c, .95, 0, { side: T.DoubleSide }), clothD: std(0xc2a15e, .95, 0, { side: T.DoubleSide }), wire: std(0x15191d, .6, .5), steel: std(0x59666d, .45, .75), pipe: std(0x6b5b4a, .5, .6),
    blanketA: std(0x56707a, .95), blanketB: std(0x7b5a52, .95), blanketC: std(0x6c6c4f, .95), skin: std(0xb48a72, .8), hood: std(0x38424a, .95), seat: std(0x5a4a3a, .9),
    white: std(0xdfe6e8, .55), plank: std(0x7d6648, .9)
  };
  const bulb = glow(0xffc88a), bulbCool = glow(0xcfeaff), ledGreen = glow(0x58ffb4), ledAmber = glow(0xffb347), ledRed = glow(0xff4d5e), lampCyan = glow(0x7beaf2);
  const poolTexture = (() => {
    const size = 128, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + .5) / size - .5, (y + .5) / size - .5) * 2, a = Math.max(0, 1 - r) ** 1.7;
      const o = (y * size + x) * 4; data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = Math.round(255 * a);
    }
    const t = new T.DataTexture(data, size, size, T.RGBAFormat); t.magFilter = t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; owned.push(t); return t;
  })();
  const noticeTexture = (lines, { bg = '#10181c', fg = '#ffd9a0', w = 256, h = 160, border = fg } = {}) => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => { g.font = (i ? '600 21px' : '800 28px') + ' sans-serif'; g.fillText(l, w / 2, h * (.3 + i * .27)); });
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 2; owned.push(t); return t;
  };
  const fixed = new Assembly(), box = (m, size, p, r = [0, 0, 0], shadow = !low) => { fixed.box(m, size, p, r, Math.min(.02, Math.min(...size) * .2), shadow); stats.props++; };
  const wire = (a, b, r = .008) => fixed.limb(M.wire, a, b, r, r, false);
  const ellipsoid = (m, c, radii, rot = [0, 0, 0]) => fixed.ellipsoid(m, c, radii, rot, !low);
  const notice = (lines, x, y, z, yaw, w = .6, h = .38, opts) => {
    const map = noticeTexture(lines, opts); if (!map) return;
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map, toneMapped: false })); owned.push(mesh.material);
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; root.add(mesh); mesh.geometry.userData.own = true; stats.notices++;
  };

  // ---------- Covered market: strings of bulbs, laundry, clutter ----------
  const bulbs = [], pools = [];
  function market() {
    // Three strings of bulbs along the market, sagging between the trusses; the bulbs are shared instances.
    for (const z of [82.6, 88, 93.6]) {
      const n = 26, x0 = -29, x1 = 11;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), x = x0 + (x1 - x0) * t, sag = 1 - 4 * (t - .5) ** 2, y = 4.55 - .55 * sag + Math.sin(t * Math.PI * 7) * .05;
        bulbs.push([x, y - .12, z]);
        if (i) { const tp = (i - 1) / (n - 1), xp = x0 + (x1 - x0) * tp, sp = 1 - 4 * (tp - .5) ** 2; wire([xp, 4.55 - .55 * sp, z], [x, y, z]); }
      }
    }
    for (const [x, z, r, a] of [[-24, 84, 3.8, .5], [-24, 90, 3.8, .5], [-14, 84, 3.6, .5], [-14, 90, 3.6, .5], [-4, 84, 3.4, .45], [-4, 92, 3.4, .45], [6, 84, 3.4, .45], [6, 92, 3.4, .45], [-19, 95, 3.2, .4], [-8, 96, 3.0, .35]]) pools.push({ x, z, r, a });
    // Laundry lines between the tent poles, behind the stalls.
    const cloths = [M.clothA, M.clothB, M.clothC, M.clothD];
    for (const [z, y] of [[93.2, 2.35], [96.2, 2.2]]) {
      wire([-29.5, y + .08, z], [-6.5, y + .08, z], .006);
      for (let i = 0; i < 9; i++) {
        const x = -28 + i * 2.55 + rng() * .5, w = .34 + rng() * .3, h = .42 + rng() * .36, g = new T.PlaneGeometry(w, h);
        const m = new T.Mesh(g, cloths[(i + (z > 94 ? 1 : 0)) % 4]); m.position.set(x, y - h / 2 + .06, z); m.rotation.y = (rng() - .5) * .35; root.add(m);
        animated.push(t => { m.rotation.x = Math.sin(t * 1.3 + x) * .05; }); stats.props++;
      }
    }
    // Crates, barrels, sacks and water cans stacked along the walls and beside the stalls.
    const crateStack = (x, z, n, yaw = 0) => { for (let k = 0; k < n; k++) box(k % 2 ? M.crateDark : M.crate, [.62, .46, .62], [x + (k % 2 ? .06 : -.05), .23 + k * .46, z], [0, yaw + (k % 3) * .12, 0]); };
    crateStack(-29, 82.5, 3, .2); crateStack(-29, 83.4, 2); crateStack(-29, 96.6, 3, .1); crateStack(-27.8, 97.2, 2, .4); crateStack(10.8, 96.8, 3); crateStack(10.8, 82.8, 2, .3); crateStack(-11, 82.4, 2);
    for (const [x, z] of [[-29.2, 88.8], [-29.2, 90.4], [10.9, 89.2], [-11.3, 97.2], [-5.2, 97.3]]) { box(M.barrel, [.58, .9, .58], [x, .45, z]); box(M.rust, [.6, .06, .6], [x, .9, z]); box(M.rust, [.6, .05, .6], [x, .46, z]); }
    for (const [x, z] of [[-29.1, 86], [-1.2, 97.2], [10.8, 94.9]]) { box(M.sack, [.55, .35, .38], [x, .18, z], [0, .3, 0]); box(M.sack, [.5, .3, .36], [x + .05, .5, z], [0, -.2, 0]); }
    for (const [x, z] of [[-12.6, 83], [-22.8, 88.2], [3, 88.2], [-5.4, 97.1]]) { box(M.can, [.28, .42, .16], [x, .21, z], [0, rng() * 3, 0]); box(M.can, [.28, .42, .16], [x + .32, .21, z + .08], [0, rng() * 3, 0]); }
    // A long bench and a table where the Épars share the evening ration.
    box(M.plank, [3.2, .08, .5], [-18.5, .5, 87.1]); for (const x of [-19.9, -17.1]) box(M.seat, [.1, .5, .44], [x, .25, 87.1]);
    box(M.plank, [3.2, .08, .9], [-18.5, .78, 88.4]); for (const x of [-19.9, -17.1]) box(M.seat, [.08, .78, .08], [x, .39, 88.4]);
    for (let i = 0; i < 5; i++) fixed.add(new T.CylinderGeometry(.09, .07, .06, 10), M.white, matrix([-19.7 + i * .8, .84, 88.2]), false);
    // Sleeping bundles on mats along the south wall (breathing), and sitters by the lanterns.
    const blankets = [M.blanketA, M.blanketB, M.blanketC];
    for (const [x, z, yaw, m] of [[-22, 95.6, 0, 0], [-14, 95.7, .1, 1], [-5.5, 95.6, -.08, 2]]) sleeper(x, z, yaw, blankets[m], .12);
    for (const [x, z, yaw] of [[-8.6, 85.6, 2.4], [-7.2, 86.8, 3.5], [-21.2, 86.2, 1.2], [-3.4, 90.2, -1.2]]) sitter(x, z, yaw);
    for (const [x, z, w] of [[-28, 96.9, 1.2], [-20, 97.1, 1.3], [-12, 96.9, 1.2]]) { box(M.blueTarp, [w, .04, 1.4], [x, 2.35, z - .2], [.5, 0, 0]); }
    notice(['LES ÉPARS', 'ON NE LAISSE PERSONNE'], -14, 3.2, 97.84, Math.PI, 1.6, 1, { bg: '#06161b', fg: '#ff9bcf', w: 512, h: 320 });
    notice(['EAU', 'RATION · 1 / JOUR'], -29.84, 1.7, 90, Math.PI / 2, .9, .56);
    notice(['SOINS →', 'DISPENSAIRE'], 11.84, 2.4, 87.6, -Math.PI / 2, .9, .56, { fg: '#8dffd2' });
    notice(['TOUR ↗', 'COUVRE-FEU 22 H'], -29.84, 2.5, 84.4, Math.PI / 2, .9, .56, { fg: '#ff7b8a' });
  }
  function sleeper(x, z, yaw, blanket, headRoom = .1, y = .42) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw; root.add(g);
    const body = new T.Mesh(new T.SphereGeometry(1, 16, 10), blanket); body.scale.set(.9, .2, .34); body.position.set(.1, .0, 0); g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.13, 12, 8), M.skin); head.position.set(-.78, .03 + headRoom * .1, 0); g.add(head);
    const pillow = new T.Mesh(new T.BoxGeometry(.34, .08, .3), M.clothA); pillow.position.set(-.8, -.05, 0); g.add(pillow);
    const mat = new T.Mesh(new T.BoxGeometry(2.1, .06, .74), M.clothD); mat.position.set(0, -.16, 0); g.add(mat);
    animated.push(t => { body.scale.y = .2 + Math.sin(t * 1.25 + x) * .008; body.scale.z = .34 + Math.sin(t * 1.25 + x) * .006; });
    stats.sleepers++; return g;
  }
  function sitter(x, z, yaw) {
    // A hooded figure on a crate, hands round a bowl, facing the light.
    box(M.crate, [.5, .42, .5], [x, .21, z], [0, yaw, 0]);
    const g = new T.Group(); g.position.set(x, .42, z); g.rotation.y = yaw; root.add(g);
    const torso = new T.Mesh(new T.SphereGeometry(1, 14, 10), M.hood); torso.scale.set(.26, .36, .22); torso.position.set(0, .34, 0); g.add(torso);
    const hood = new T.Mesh(new T.SphereGeometry(.15, 12, 9), M.hood); hood.position.set(0, .8, .02); g.add(hood);
    const face = new T.Mesh(new T.SphereGeometry(.105, 10, 8), M.skin); face.position.set(0, .79, -.07); g.add(face);
    for (const s of [-1, 1]) { const knee = new T.Mesh(new T.CapsuleGeometry(.07, .34, 3, 8), M.hood); knee.rotation.x = Math.PI / 2; knee.position.set(s * .12, .08, -.3); g.add(knee); }
    animated.push(t => { torso.scale.y = .36 + Math.sin(t * 1.1 + z) * .006; hood.rotation.x = Math.sin(t * .5 + x) * .05; });
    stats.sitters++;
  }

  // ---------- Service corridor, dispensary, radio room ----------
  function interiors() {
    // Corridor x 12…40, z 90…94: cable tray with LEDs, pipe run, painted guide line, notices. Nothing on the floor.
    box(M.steel, [27.4, .06, .22], [26, 2.65, 90.2]); box(M.steel, [27.4, .22, .03], [26, 2.56, 90.1]);
    for (let x = 13; x <= 39; x += 2) { const led = [ledGreen, ledGreen, ledAmber, ledGreen, ledRed][Math.round(x / 2) % 5]; fixed.add(new T.BoxGeometry(.05, .03, .02), led, matrix([x, 2.62, 90.34]), false); }
    for (const y of [2.15, 2.4]) fixed.limb(M.pipe, [12.2, y, 93.82], [39.8, y, 93.82], .045, .045, false);
    for (let x = 14; x <= 38; x += 6) box(M.steel, [.1, .5, .12], [x, 2.28, 93.86]);
    for (let x = 14; x <= 38; x += 2.4) fixed.add(new T.BoxGeometry(1.1, .015, .12), glow(0xffd36e), matrix([x, .012, 92]), false);
    for (const x of [15, 24, 33]) fixed.add(new T.BoxGeometry(.5, .02, .5), glow(0xffd36e), matrix([x + 1.4, .013, 92], [0, Math.PI / 4, 0]), false);
    notice(['SERVICE', '← MONTE-CHARGE'], 41, 2.2, 90.17, 0, .8, .5, { fg: '#ffd36e' });
    notice(['DISPENSAIRE', 'SILENCE'], 20, 2.2, 90.17, 0, .8, .5, { fg: '#8dffd2' });
    notice(['LOCAL RADIO', 'NE PAS TOUCHER'], 33, 2.2, 93.83, Math.PI, .8, .5, { fg: '#ff9bcf' });
    // Dispensary x 12…28, z 80…90: partition curtains, drip stands, a trolley, the cross.
    for (const [x, z, w] of [[18.9, 85, 2.6], [24.3, 84.4, 2.4]]) { const c = new T.Mesh(new T.PlaneGeometry(w, 1.9), M.clothA); c.position.set(x, 1.55, z); c.rotation.y = Math.PI / 2; root.add(c); animated.push(t => { c.rotation.z = Math.sin(t * .8 + x) * .012; }); stats.props++; }
    for (const [x, z] of [[17.4, 82.9], [17.4, 87.4]]) { box(M.steel, [.05, 1.8, .05], [x, .9, z]); box(M.steel, [.34, .04, .04], [x, 1.8, z]); fixed.add(new T.CylinderGeometry(.06, .06, .2, 8), M.white, matrix([x + .13, 1.68, z]), false); wire([x + .13, 1.58, z], [x + .3, .9, z + .15], .004); }
    box(M.steel, [.9, .06, .55], [25.6, .8, 88.8]); for (const sx of [-.4, .4]) for (const sz of [-.22, .22]) box(M.steel, [.04, .8, .04], [25.6 + sx, .4, 88.8 + sz]);
    box(M.white, [.3, .12, .3], [25.4, .89, 88.7]); box(M.crateDark, [.34, .1, .24], [25.9, .89, 88.9]);
    fixed.add(new T.BoxGeometry(.5, .14, .02), glow(0xff5470), matrix([20, 2.6, 80.14]), false); fixed.add(new T.BoxGeometry(.14, .5, .02), glow(0xff5470), matrix([20, 2.6, 80.14]), false);
    notice(['DISPENSAIRE', 'DES ÉPARS'], 16.6, 2.3, 80.16, 0, 1, .62, { fg: '#8dffd2' });
    sleeper(16.1, 82, 0, M.blanketA, .08, .86); sleeper(16.1, 88.2, Math.PI, M.blanketC, .08, .86);
    // Radio room x 28…40, z 80…90: map of the districts, coils of cable, a stool.
    notice(['CARTE DES ÉPARS', 'BAS-NIVEAUX · SECTEUR 7'], 34, 2.0, 80.17, 0, 1.5, .95, { fg: '#7beaf2', w: 384, h: 240 });
    for (const [x, z] of [[30.5, 82.2], [38.6, 88.6]]) { fixed.add(new T.TorusGeometry(.2, .05, 6, 14), M.wire, matrix([x, .06, z], [Math.PI / 2, 0, 0]), false); fixed.add(new T.TorusGeometry(.2, .05, 6, 14), M.wire, matrix([x, .13, z], [Math.PI / 2, 0, 0]), false); }
    box(M.seat, [.38, .06, .38], [33.1, .5, 83.6]); for (const sx of [-.15, .15]) for (const sz of [-.15, .15]) box(M.seat, [.04, .5, .04], [33.1 + sx, .25, 83.6 + sz]);
    fixed.limb(M.wire, [39.7, 3.1, 84.5], [36, 2.9, 82.1], .012, .012, false); fixed.limb(M.wire, [39.7, 3.0, 86], [36, 2.5, 82.4], .012, .012, false);
    stats.props += 4;
  }

  // ---------- Transit tower: lobby benches, planters' lamps, vault status lights, dock pallets ----------
  function tower() {
    for (const [x, z] of [[-10, -80], [10, -80]]) { box(M.white, [2.2, .08, .5], [x, .5, z]); for (const sx of [-.9, .9]) box(M.steel, [.06, .5, .4], [x + sx, .25, z]); }
    notice(['DIRECTOIRE', 'CONTRÔLE DES ACCÈS'], 0, 3.4, -93.7, 0, 2.6, 1.2, { bg: '#0b0d10', fg: '#ff4d5e', w: 512, h: 240 });
    for (const x of [-38, -34, -30, -26, -22]) fixed.add(new T.BoxGeometry(.06, .06, .02), [ledGreen, ledRed, ledAmber][Math.abs(x) % 3], matrix([x, 3.4, -95.84]), false);
    for (const [x, z] of [[22, -94], [26, -94.2], [38, -85], [40, -93.4]]) { box(M.plank, [1.2, .14, .96], [x, .07, z]); box(M.crate, [.9, .7, .8], [x, .49, z], [0, rng() * .5, 0]); }
    notice(['QUAI 3', 'CONVOI → ANNEAU'], 20, 5.4, -82.2, Math.PI, 2, .8, { bg: '#0b0d10', fg: '#ffd36e', w: 512, h: 200 });
  }

  // ---------- Instanced bulbs and light pools (shared, no dynamic light) ----------
  function lamps() {
    const sphere = new T.SphereGeometry(.07, low ? 6 : 10, low ? 4 : 7), mesh = new T.InstancedMesh(sphere, bulb, bulbs.length), m4 = new T.Matrix4();
    bulbs.forEach((p, i) => mesh.setMatrixAt(i, m4.makeTranslation(...p))); mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; root.add(mesh); stats.lamps = bulbs.length;
    const plane = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (const p of pools) {
      const mat = new T.MeshBasicMaterial({ map: poolTexture, color: 0xff9a52, transparent: true, opacity: p.a, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }); owned.push(mat);
      const m = new T.Mesh(plane, mat); m.scale.set(p.r * 2, 1, p.r * 2); m.position.set(p.x, .016, p.z); m.renderOrder = 2; root.add(m); p.mesh = m; p.mat = mat; stats.pools++;
    }
    animated.push((t, power) => { const k = power?.enclave ? 1 : .62; pools.forEach((p, i) => { p.mat.opacity = p.a * k * (.92 + .08 * Math.sin(t * 2.3 + i * 1.7)); }); });
    mesh.userData.shared = sphere;
  }

  return {
    root,
    build() {
      if (built) return; built = true;
      market(); interiors(); tower();
      fixed.build(root); for (const mesh of fixed.meshes) mesh.name = 'M02 / vie ' + mesh.material.name;
      lamps();
    },
    update(t, dt, power = {}) { if (disposed || !root.visible) return; for (const f of animated) f(t, power); },
    stats: () => ({ ...stats, meshes: fixed.meshes.length }),
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      const geos = new Set(); root.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.userData?.shared) geos.add(o.userData.shared); }); for (const g of geos) g.dispose(); for (const m of owned) m.dispose();
    }
  };
}
