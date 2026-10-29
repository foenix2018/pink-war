// Shared, metric dressing for M01 and M02. Only visual detail: the authored
// collision hulls, interaction positions and mission state remain authoritative.
import {Assembly, bevelBox, matrix, limb} from './geo.js';
import {createVesperSurfaces} from './vesper-surfaces.js';

export function createVesperProps(T, parent, {low = false} = {}) {
  const root = new T.Group(); root.name = 'VESPER / objets détaillés'; parent.add(root);
  const surfaces = createVesperSurfaces(T, {low});
  const staticParts = new Assembly(), owned = [], textures = [], displays = new Map(), doors = [];
  const stats = {plants: 0, computers: 0, accessories: 0, doors: 0, batches: 0, triangles: 0};
  let seed = 37107, finished = false;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const mat = (name, color, roughness = .7, metalness = 0) => {
    const m = new T.MeshStandardMaterial({name: 'VESPER / ' + name, color, roughness, metalness}); owned.push(m); return m;
  };
  const M = {
    paint: mat('acier peint', 0x555f5b, .58, .35), steel: mat('arêtes acier', 0x929e9f, .37, .78),
    dark: mat('joints et caoutchouc', 0x141d20, .83), paper: mat('étiquettes ivoire', 0xd5ccaf, .94),
    copper: mat('cuivre', 0x9c6846, .46, .72), soil: mat('terre', 0x30281e, 1),
    leaf: mat('feuillage ombré', 0x2e5034, .9), leafTip: mat('jeunes feuilles', 0x68804b, .92),
    bark: mat('écorce', 0x68523c, .98), wood: mat('bois des caisses', 0x99724c, .88),
    fabric: mat('toile tissée', 0x8b9381, .97), ceramic: mat('céramique émaillée', 0xd2d9d2, .25),
    stone: mat('graviers des bacs', 0xaaa08a, .98)
  };
  for (const [key, kind] of Object.entries({paint:'paint',steel:'steel',dark:'rubber',paper:'paper',copper:'copper',soil:'soil',leaf:'leaf',leafTip:'leaf',bark:'bark',wood:'wood',fabric:'fabric',ceramic:'ceramic',stone:'soil'})) surfaces.apply(M[key], kind);
  M.leaf.side = M.leafTip.side = M.fabric.side = T.DoubleSide;
  const add = (a, g, m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => { a.add(g, m, matrix(p, r, s), !low); g.dispose(); };
  const box = (a, m, size, p, r = [0, 0, 0], transform = null) => {
    const g = Math.min(...size) > .06 ? bevelBox(...size, Math.min(.035, Math.min(...size) * .16), 1) : new T.BoxGeometry(...size);
    // UVs in metres: screws, cabinets and large doors keep a consistent grain.
    const pos = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv;
    const tile = m.userData.tile || .45;
    for (let i = 0; i < pos.count; i++) {
      const ax = Math.abs(normal.getX(i)), ay = Math.abs(normal.getY(i));
      uv.setXY(i, (ax > .65 ? pos.getZ(i) : pos.getX(i)) / tile, (ay > .65 ? pos.getZ(i) : pos.getY(i)) / tile);
    }
    const pose = matrix(p, r); if (transform) pose.premultiply(transform);
    a.add(g, m, pose, !low); g.dispose();
  };
  const rod = (a, m, from, to, radius = .018, endRadius = radius) => { const g = limb(from, to, radius, endRadius, low ? 6 : 8); a.add(g, m, null, !low); g.dispose(); };
  const sealAssembly = (a, host) => {
    a.build(host);
    for (const mesh of a.meshes) {
      mesh.name = 'VESPER / lot ' + mesh.material.name; mesh.castShadow = !low && !mesh.material.transparent; mesh.receiveShadow = true;
      stats.batches++; stats.triangles += mesh.geometry.attributes.position.count / 3;
    }
    for (const item of a.items) item.geometry.dispose(); a.items.length = 0;
  };

  // Shared printed service labels: ink, barcode and a tiny serial, lit by the
  // scene rather than luminous rectangles. Separate from mission documents.
  let labels = null;
  const LABELS = ['AEGIS · 07', 'MAINTENANCE', 'FILTRE / EAU', 'STÉRILE', 'HELIX / S3', 'ARCHIVES', 'HORS RÉSEAU', 'FRAGILE'];
  function label(a, index, position, rotation = [0,0,0], width = .26) {
    if (typeof document === 'undefined') return;
    if (!labels) {
      const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
      for (let row = 0; row < 8; row++) {
        const y = row * 64; ctx.fillStyle = '#d6d0b6'; ctx.fillRect(0,y,512,64);
        ctx.fillStyle = row === 4 ? '#a8272c' : '#242e2c'; ctx.fillRect(0,y,12,64); ctx.font = 'bold 22px monospace'; ctx.fillText(LABELS[row],24,y+27);
        ctx.font = '10px monospace'; ctx.fillText('VS / 2189 / '+String(7104+row*37),24,y+49);
        for (let k=0;k<55;k++) ctx.fillRect(320+k*3,y+12,k%4?1:2,38);
      }
      const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; textures.push(map);
      labels = new T.MeshStandardMaterial({name:'VESPER / marquages imprimés',map,roughness:.92,metalness:0}); owned.push(labels);
    }
    const geo = new T.PlaneGeometry(width,width/8), uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setY(i,(7-index+uv.getY(i))/8);
    add(a,geo,labels,position,rotation);
  }

  // Small shared diagnostic textures, painted once. The screen stays legible and its own
  // power channel dims it; no canvas uploads, particles or lights per frame.
  function displayMaterial(kind, power) {
    const key = kind + '/' + power; if (displays.has(key)) return displays.get(key).material;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const ctx = c.getContext('2d'), helix = kind === 'helix', ink = helix ? '#ff7582' : '#9cc8b4';
    ctx.fillStyle = '#091316'; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#29423e'; ctx.lineWidth = 2; ctx.strokeRect(9, 9, 494, 238);
    ctx.fillStyle = ink; ctx.font = 'bold 21px monospace';
    ctx.fillText(helix ? 'HELIX / CONTRÔLE LOCAL' : kind === 'radio' ? 'CANAL 07 / SECOURS' : 'AEGIS / STANDARD 07', 24, 40);
    ctx.font = '12px monospace'; ctx.fillText('VESPER 2196 · MÉMOIRE HORS RÉSEAU', 24, 64);
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = j % 2 ? '#142629' : '#102023'; ctx.fillRect(22, 82 + j * 25, 262, 20);
      ctx.fillStyle = ink; ctx.fillRect(30, 89 + j * 25, 60 + (j * 41 % 150), 4);
    }
    ctx.strokeStyle = ink; ctx.beginPath();
    for (let k = 0; k < 40; k++) { const x = 306 + k * 4.5, y = 152 + Math.sin(k * .58) * (k % 7 + 4) * 3; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.fillStyle = ink; ctx.fillText(helix ? 'BADGE / NIVEAU 3' : 'LIAISON PHYSIQUE', 304, 211);
    ctx.fillStyle = '#526d64'; for (let y = 14; y < 247; y += 4) ctx.fillRect(14, y, 484, .3);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; textures.push(map);
    const material = new T.MeshBasicMaterial({name: 'VESPER / écran ' + key, map, toneMapped: false}); owned.push(material);
    displays.set(key, {material, power}); return material;
  }
  function computer({x, y = 0, z, yaw = 0, scale = 1, kind = 'dispatch', power = 'always'}) {
    const pose = matrix([x, y, z], [0, yaw, 0], [scale, scale, scale]);
    const b = (m, size, p, r) => box(staticParts, m, size, p, r, pose);
    b(M.dark, [.55, .045, .35], [0, .025, -.03]);
    b(M.steel, [.075, .28, .085], [0, .18, -.10]);
    b(M.paint, [1.1, .66, .18], [0, .60, -.075]);
    b(M.dark, [.99, .55, .014], [0, .615, .022]);
    const screen = new T.PlaneGeometry(.92, .47); staticParts.add(screen, displayMaterial(kind, power), pose.clone().multiply(matrix([0, .62, .032])), false); screen.dispose();
    b(M.paper, [.19, .028, .012], [-.29, .31, .025]);
    for (const side of [-1, 1]) {
      for (let j = 0; j < 6; j++) b(M.dark, [.025, .04, .07], [side * .553, .40 + j * .065, -.09]);
      b(M.steel, [.10, .035, .05], [side * .44, .31, -.025]);
    }
    b(M.paint, [.96, .045, .28], [0, .045, .30], [-.08, 0, 0]);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 11; k++) b(M.dark, [.063, .022, .045], [(k - 5) * .076, .081 - row * .004, .22 + row * .062]);
    b(M.dark, [.31, .02, .038], [0, .07, .432]);
    b(M.paint, [.18, .045, .23], [.65, .035, .30]); b(M.dark, [.11, .018, .16], [.65, .063, .30]);
    const curve = new T.CatmullRomCurve3([[.5, .04, .19], [.57, .05, -.25], [0, .08, -.23], [0, .29, -.17]].map(p => new T.Vector3(...p)));
    const cable = new T.TubeGeometry(curve, low ? 8 : 14, .009, 5, false); staticParts.add(cable, M.dark, pose, !low); cable.dispose();
    stats.computers++;
  }

  // Curved leaves have actual volume in silhouette, tapered tips and a raised
  // midrib. Two natural leaf colours; no emissive foliage or flat green blocks.
  function leaf(length, width, bend) {
    const p = [], uv = [], n = low ? 5 : 8;
    const at = (t, side) => [side * Math.sin(Math.PI * t) * width, length * (t - bend * t * t) + (1 - Math.abs(side)) * width * .16, length * t * t * .72];
    for (let k = 0; k < n; k++) for (const side of [-1, 0]) {
      const t = k / n, u = (k + 1) / n;
      for (const [v, s] of [[t, side], [t, side + 1], [u, side + 1], [t, side], [u, side + 1], [u, side]]) { p.push(...at(v, s)); uv.push((s + 1) / 2, v); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  function plant(x, y, z, size = 1, species = 'broad') {
    const count = low ? 7 : 11;
    for (let k = 0; k < count; k++) {
      const a = k * 2.39996 + rnd() * .25, len = size * (.55 + rnd() * .5), height = species === 'fern' ? .04 : size * .15;
      const g = leaf(len, len * (species === 'fern' ? .11 : .23), .28 + rnd() * .3);
      add(staticParts, g, k % 3 ? M.leaf : M.leafTip, [x, y + height, z], [0, a, (rnd() - .5) * .25]);
      if (height) rod(staticParts, M.bark, [x, y, z], [x, y + height + len * .1, z], .012 * size);
    }
    stats.plants++;
  }
  function planting(o, count = low ? 4 : 7) {
    const y = o.height, w = o.hx * 2, d = o.hz * 2;
    box(staticParts, M.soil, [Math.max(.1, w - .2), .05, Math.max(.1, d - .2)], [o.x, y + .015, o.z]);
    for (let k = 0; k < count; k++) plant(o.x + (rnd() - .5) * Math.max(0, w - .8), y + .05, o.z + (rnd() - .5) * Math.max(0, d - .8), .65 + rnd() * .55, k % 2 ? 'fern' : 'broad');
    for (let k=0;k<(low?8:18);k++) {
      const x=o.x+(rnd()-.5)*(w-.3),z=o.z+(rnd()-.5)*(d-.3),r=.025+rnd()*.035;
      add(staticParts,new T.IcosahedronGeometry(r,0),k%3?M.bark:M.stone,[x,y+.045,z],[rnd(),rnd(),rnd()],[1.4,.35,1]);
    }
  }
  function tree(o) {
    rod(staticParts, M.bark, [o.x, 0, o.z], [o.x + .12, o.height, o.z], .35, .18);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.39996, x = o.x + Math.sin(a) * 1.8, z = o.z + Math.cos(a) * 1.8, y = o.height + .4 + (k % 3) * .65;
      const elbow=[o.x+Math.sin(a)*.8,o.height*(.80+(k%2)*.06),o.z+Math.cos(a)*.8];
      rod(staticParts,M.bark,[o.x,o.height*(.5+(k%4)*.08),o.z],elbow,.11,.065);
      rod(staticParts,M.bark,elbow,[x,y,z],.065,.028);
      // An airy crown made of individual leaves, with real gaps between them.
      // No green spheres underneath: silhouettes and sky holes remain natural.
      for(let j=0;j<(low?55:95);j++) {
        const az=rnd()*Math.PI*2,up=rnd()*2-1,rad=Math.cbrt(rnd()),r=Math.sqrt(1-up*up)*rad;
        const px=x+Math.sin(az)*r*1.35,py=y+up*rad*.8,pz=z+Math.cos(az)*r*1.2;
        add(staticParts,leaf(.24+rnd()*.17,.075+rnd()*.035,.35),j%4?M.leaf:M.leafTip,[px,py,pz],[(rnd()-.5)*1.6,rnd()*Math.PI*2,(rnd()-.5)*1.5]);
        if(j%14===0)rod(staticParts,M.bark,[x,y,z],[px,py,pz],.014);
      }
    }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; rod(staticParts, M.bark, [o.x, .5, o.z], [o.x + Math.sin(a) * .8, .02, o.z + Math.cos(a) * .8], .10); }
    stats.plants++;
  }

  function accessories(o) {
    const w = o.hx * 2, d = o.hz * 2, y = o.height, x = o.x, z = o.z;
    const b = (m, s, p) => box(staticParts, m, s, p);
    if (['crates', 'cabinet', 'lockers', 'rack', 'servers', 'batteries'].includes(o.kind) && !(o.kind==='cabinet'&&o.surface==='metal')) {
      // Recessed pulls, protective rails, label holders and screw heads stay
      // within the original object's outline plus a few centimetres.
      for (const side of [-1, 1]) {
        const xx = x + side * (o.hx + .018);
        b(M.steel, [.035, .07, Math.max(.12, d - .12)], [xx, .12, z]);
        for (let h = .48; h < y - .12; h += .55) {
          b(M.dark, [.026, .11, Math.min(.42, d * .5)], [xx, h, z]);
          b(M.steel, [.044, .025, Math.min(.29, d * .4)], [xx + side * .01, h, z]);
          b(M.paper, [.027, .08, Math.min(.20, d * .25)], [xx, h + .18, z]);
        }
      }
      if (['rack', 'servers'].includes(o.kind)) for (let h = .25; h < y - .12; h += .23) {
        b(M.steel, [Math.min(.035, w), .012, Math.max(.1, d - .14)], [x - o.hx - .022, h, z]);
        for (let j = 0; j < (low ? 3 : 6); j++) b(M.dark, [.03, .06, .055], [x - o.hx - .025, h + .09, z - d * .28 + j * d * .10]);
      }
      if (o.kind === 'crates') for (const side of [-1, 1]) {
        const zz = z + side * (o.hz + .018);
        b(M.steel, [Math.max(.12, w - .08), .045, .028], [x, y - .08, zz]);
        b(M.dark, [Math.min(.32, w * .35), .12, .032], [x, y * .55, zz]);
        b(M.steel, [Math.min(.24, w * .28), .025, .05], [x, y * .55, zz + side * .012]);
        b(M.paper, [Math.min(.24, w * .28), .11, .034], [x, y * .8, zz]);
        for (const edge of [-1, 1]) {
          b(M.dark, [.09, Math.min(.19, y * .25), .045], [x + edge * w * .38, y - .13, zz]);
          b(M.steel, [.07, .06, .055], [x + edge * w * .38, y - .11, zz]);
        }
      }
      stats.accessories++;
    }
    if (['desk', 'workbench', 'reception', 'security-desk', 'school'].includes(o.kind)) {
      // A closed field notebook, papers, pencil, handled mug. Confined to the
      // table, so none can obstruct an interaction or the authored route.
      b(M.dark, [.30, .055, .39], [x, y + .035, z]);
      b(M.paper, [.27, .032, .36], [x, y + .04, z + .005]);
      b(M.paper, [.29, .007, .21], [x + Math.min(.38, w * .22), y + .008, z]);
      b(M.copper, [.018, .018, .22], [x - Math.min(.25, w * .2), y + .014, z]);
      const mugX=x+Math.min(.6,w*.33),mugZ=z-Math.min(.16,d*.2);
      add(staticParts,new T.CylinderGeometry(.07,.063,.14,12,1,true),M.ceramic,[mugX,y+.075,mugZ]);
      add(staticParts,new T.TorusGeometry(.067,.008,5,16),M.ceramic,[mugX,y+.145,mugZ],[Math.PI/2,0,0]);
      add(staticParts,new T.CircleGeometry(.061,16),M.dark,[mugX,y+.115,mugZ],[-Math.PI/2,0,0]);
      add(staticParts, new T.TorusGeometry(.048, .011, 5, 10), M.ceramic, [mugX + .072, y + .08, mugZ], [0, Math.PI / 2, 0]);
      stats.accessories++;
    }
    if (o.kind === 'bed' && o.surface !== 'stone') {
      b(M.fabric, [Math.min(w * .7, .65), .12, Math.min(d * .3, .38)], [x, y + .07, z - o.hz * .6]);
      for (const side of [-1, 1]) rod(staticParts, M.steel, [x + side * o.hx * .87, y - .3, z - o.hz * .85], [x + side * o.hx * .87, y + .28, z - o.hz * .85], .025);
      stats.accessories++;
    }
    equipment(o);
  }

  function equipment(o) {
    const {x,z,height:h}=o,w=o.hx*2,d=o.hz*2;
    const b=(m,size,p,r)=>box(staticParts,m,size,p,r);
    const ring=(r,p,rotation=[0,0,0],m=M.steel)=>add(staticParts,new T.TorusGeometry(r,.012,5,16),m,p,rotation);
    if (o.kind==='workbench') {
      // Vice, closed toolbox and two genuinely shaped hand tools on the bench.
      b(M.paint,[.38,.07,.31],[x-.6,h+.035,z]);b(M.steel,[.14,.20,.16],[x-.6,h+.17,z]);
      for(const side of [-1,1]) b(M.steel,[.05,.12,.27],[x-.6+side*.11,h+.28,z]);
      rod(staticParts,M.steel,[x-.96,h+.21,z],[x-.42,h+.21,z],.018);
      b(M.paint,[.61,.27,.32],[x+.65,h+.135,z]);b(M.dark,[.65,.04,.35],[x+.65,h+.29,z]);
      b(M.steel,[.19,.025,.04],[x+.65,h+.34,z]);label(staticParts,1,[x+.65,h+.17,z+.164]);
      rod(staticParts,M.steel,[x-.15,h+.022,z-.21],[x+.17,h+.022,z-.21],.017);
      ring(.042,[x-.17,h+.025,z-.21],[Math.PI/2,0,0]);
      b(M.dark,[.13,.025,.04],[x-.1,h+.02,z+.22],[0,0,.1]);rod(staticParts,M.steel,[x-.1,h+.02,z+.22],[x+.2,h+.02,z+.22],.012);
      stats.accessories++;
    }
    if (['generator','switchboard','tank','day-tank','fuel-tank'].includes(o.kind)) {
      const face=z+o.hz+.028;
      b(M.paint,[.31,.37,.05],[x,h*.63,face]);
      // A recessed analog pressure dial with a physical needle and glass rim.
      add(staticParts,new T.CircleGeometry(.105,20),M.paper,[x,h*.66,face+.028]);
      ring(.11,[x,h*.66,face+.035]);
      rod(staticParts,M.dark,[x,h*.66,face+.04],[x+.052,h*.66+.045,face+.04],.005);
      label(staticParts, o.kind==='tank'?2:1,[x,h*.43,face+.03]);
      for(const side of [-1,1]) {
        const xx=x+side*o.hx*.58;
        rod(staticParts,M.copper,[xx,.2,face],[xx,h*.34,face],.025);
        rod(staticParts,M.copper,[xx,h*.34,face],[xx+side*.13,h*.34,face],.025);
        ring(.048,[xx,h*.24,face],[Math.PI/2,0,0]);
      }
      stats.accessories++;
    }
    if (o.kind==='radio-table'||o.kind==='radio-rack') {
      const xx=x-o.hx*.5,top=o.kind==='radio-table'?h:0;
      b(M.paint,[.5,.24,.30],[xx,top+.12,z]);
      for(let k=0;k<7;k++)b(M.dark,[.18,.012,.015],[xx-.1,top+.05+k*.024,z+.157]);
      for(const yy of [.07,.17])add(staticParts,new T.CylinderGeometry(.025,.025,.04,10),M.steel,[xx+.14,top+yy,z+.17],[Math.PI/2,0,0]);
      label(staticParts,6,[xx,top+.23,z+.157], [0,0,0],.34);stats.accessories++;
    }
    if (o.kind==='bed'&&o.surface==='fabric') {
      // Saline bag on the existing IV stand, tubing, folded linen and a tray.
      const px=x-o.hx+.1,pz=z-o.hz-.2;
      rod(staticParts,M.steel,[px,1.7,pz],[px+.17,1.7,pz],.012);
      b(M.fabric,[.12,.23,.045],[px+.16,1.5,pz]);label(staticParts,3,[px+.16,1.51,pz+.026],[0,0,0],.10);
      const curve=new T.CatmullRomCurve3([[px+.16,1.38,pz],[px+.22,1.05,pz],[x-.4,h+.11,z-.2]].map(p=>new T.Vector3(...p)));
      add(staticParts,new T.TubeGeometry(curve,low?8:14,.006,4,false),M.paper);
      b(M.fabric,[.35,.05,.3],[x+.55,h+.03,z]);
      for(let k=0;k<3;k++)b(M.fabric,[.31,.025,.28],[x+.55,h+.07+k*.025,z]);
      stats.accessories++;
    }
    if(o.kind==='cabinet'&&o.surface==='metal') {
      const front=x-o.hx-.026;
      b(M.steel,[.035,h-.2,.045],[front,h/2,z]);
      for(const side of [-1,1]){
        rod(staticParts,M.steel,[front-.05,.9,z+side*.12],[front-.05,1.13,z+side*.12],.012);
        for(const yy of [.9,1.13])rod(staticParts,M.steel,[front,yy,z+side*.12],[front-.05,yy,z+side*.12],.012);
      }

      for(let row=0;row<3;row++)for(let k=0;k<3;k++) {
        const xx=x-o.hx+.22,yy=.57+row*.4,zz=z-.8+k*.7;
        add(staticParts,new T.CylinderGeometry(.037,.038,.12,10),M.ceramic,[xx,yy,zz]);
        add(staticParts,new T.CylinderGeometry(.041,.041,.025,10),M.paint,[xx,yy+.074,zz]);
        label(staticParts,3,[xx-.04,yy,zz],[0,-Math.PI/2,0],.07);
      }
      stats.accessories++;
    }
    if(['stall','tent'].includes(o.kind)) {
      const yy=o.kind==='stall'?h+.15:.12;
      b(M.fabric,[.48,.12,.43],[x-o.hx*.58,yy,z]);
      // A draped blanket with hanging sides and shallow, irregular folds.
      const cloth=new T.PlaneGeometry(Math.min(w-.1,1.8),Math.min(d+.12,1.1),low?6:12,5),p=cloth.attributes.position;
      const uv=cloth.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.min(w-.1,1.8)/.045,uv.getY(i)*Math.min(d+.12,1.1)/.045);
      for(let i=0;i<p.count;i++) {
        const px=p.getX(i),py=p.getY(i),drop=Math.max(0,Math.abs(py)-d*.39)*.85;
        p.setZ(i,Math.sin(px*32+py*5)*.018+Math.sin(px*13)*.014-drop);
      }
      cloth.computeVertexNormals();add(staticParts,cloth,M.fabric,[x+.25,yy+.045,z],[-Math.PI/2,0,0]);
      stats.accessories++;
    }
    if(o.kind==='kitchen') {
      for(const k of [-1,0,1]) {
        const xx=x+k*1.6;
        ring(.32,[xx,h+.44,z],[Math.PI/2,0,0]);
        add(staticParts,new T.CylinderGeometry(.325,.325,.025,20),M.steel,[xx,h+.47,z]);
        b(M.dark,[.11,.055,.035],[xx,h+.51,z]);
        for(const side of [-1,1])ring(.065,[xx+side*.35,h+.28,z],[0,Math.PI/2,0]);
      }
      b(M.wood,[.42,.025,.27],[x+.6,h+.025,z+.3]);
      rod(staticParts,M.steel,[x+.47,h+.05,z+.3],[x+.77,h+.05,z+.3],.012);stats.accessories++;
    }
    if(['rack','servers','crates','lockers','cabinet','stack'].includes(o.kind)) {
      label(staticParts,o.kind==='servers'?4:o.kind==='stack'||o.surface==='wood'?5:o.kind==='crates'?7:0,[x-o.hx-.05,h*.79,z],[0,-Math.PI/2,0],Math.min(.36,d*.65));
    }
  }

  // Industrial door family. Hardware belongs to each moving leaf, never to
  // the fixed wall. Opening it fully also clears the *visible* doorway.
  function door(d, materials = {}) {
    const g = new T.Group(); g.name = 'VESPER / porte ' + d.id;
    g.position.set(d.axis === 'x' ? d.centre : d.fixed, 0, d.axis === 'x' ? d.fixed : d.centre);
    g.rotation.y = d.axis === 'x' ? 0 : Math.PI / 2; root.add(g);
    const fixed = new Assembly(), leaves = [], w = d.width, h = d.height, rolling = ['sectional', 'gate'].includes(d.style);
    const paint = materials.paint || M.paint, accent = materials.accent || M.copper, glass = materials.glass || M.dark;
    for (const side of [-1, 1]) {
      box(fixed, M.dark, [.09, h + .08, .16], [side * (w / 2 + .05), h / 2, 0]);
      box(fixed, M.steel, [.09, h + .18, .24], [side * (w / 2 + .14), h / 2, -.025]);
      for (const yy of [.28, h * .5, h - .18]) box(fixed, M.steel, [.025, .05, .05], [side * (w / 2 + .02), yy, .105]);
    }
    box(fixed, paint, [w + .4, .18, .30], [0, h + .12, 0]);
    box(fixed, M.steel, [w + .16, .026, .32], [0, .016, 0]);
    const lamp = new T.Mesh(new T.BoxGeometry(.07, .09, .02), new T.MeshBasicMaterial({color: 0xe85c4e, toneMapped: false}));
    lamp.position.set(w / 2 + .2, 1.5, .175); g.add(lamp); owned.push(lamp.material);
    if (rolling) {
      const n = d.style === 'gate' ? 9 : 7, ph = h / n;
      for (let k = 0; k < n; k++) {
        const a = new Assembly(), leaf = new T.Group(), base = (k + .5) * ph;
        leaf.name = 'VESPER / panneau mobile ' + k; leaf.position.y = base; g.add(leaf);
        box(a, paint, [w - .04, ph - .018, .09], [0, 0, 0]);
        for (const side of [-1, 1]) {
          box(a, M.steel, [w - .06, .018, .024], [0, -ph / 2 + .03, side * .055]);
          for (const xx of [-w * .33, w * .33]) box(a, M.dark, [.09, .08, .02], [xx, 0, side * .06]);
        }
        if (k === 0) box(a, M.dark, [.55, .065, .12], [0, 0, .07]);
        if (k === 2) label(a,1,[-w*.28,0,.068],[0,0,0],.36);
        if (k === Math.floor(n * .65) && d.style === 'sectional') {
          // Vision inserts replace an opaque band rather than a glass plate
          // pasted over a solid panel.
          a.items.forEach(item => item.geometry.dispose()); a.items.length = 0;
          box(a, paint, [w, ph * .25, .09], [0, ph * .375, 0]); box(a, paint, [w, ph * .25, .09], [0, -ph * .375, 0]);
          for (const xx of [-w / 2 + .11, 0, w / 2 - .11]) box(a, paint, [.22, ph * .5, .09], [xx, 0, 0]);
          for (const side of [-1, 1]) box(a, glass, [w / 2 - .32, ph * .5, .025], [side * w / 4, 0, 0]);
        }
        sealAssembly(a, leaf); leaves.push({root: leaf, base, k, ph});
      }
      // Two real tracks into the roof, drive shaft and head box.
      for (const side of [-1, 1]) box(fixed, M.steel, [.07, .07, h + .35], [side * (w / 2 + .14), h + .20, -h / 2]);
      box(fixed, M.dark, [.45, .34, .45], [w / 2 + .34, h + .18, -.15]);
    } else {
      const split = ['glass', 'lift', 'helix'].includes(d.style), count = split ? 2 : 1, lw = w / count;
      for (let k = 0; k < count; k++) {
        const a = new Assembly(), leaf = new T.Group(), dir = split ? (k ? 1 : -1) : 1, base = split ? dir * w / 4 : 0;
        leaf.name = 'VESPER / vantail mobile ' + k; leaf.position.set(base, h / 2, 0); g.add(leaf);
        if (d.style === 'glass') {
          box(a, glass, [lw - .12, h - .14, .035], [0, 0, 0]);
          for (const side of [-1, 1]) box(a, paint, [.06, h, .08], [side * (lw / 2 - .03), 0, 0]);
          for (const yy of [-h / 2 + .035, h / 2 - .035]) box(a, paint, [lw, .07, .08], [0, yy, 0]);
        } else {
          const thick = d.style === 'vault' ? .27 : .09;
          box(a, paint, [lw - .025, h - .025, thick], [0, 0, 0]);
          for (const side of [-1, 1]) {
            box(a, M.dark, [lw * .74, h * .62, .012], [0, 0, side * (thick / 2 + .007)]);
            box(a, paint, [lw * .69, h * .57, .018], [0, 0, side * (thick / 2 + .016)]);
            box(a, M.steel, [lw * .91, .17, .022], [0, -h * .35, side * (thick / 2 + .02)]);
            if (d.style === 'helix') box(a, accent, [lw - .08, .11, .022], [0, h * .06, side * .075]);
          }
        }
        for (const side of [-1, 1]) {
          const xx = split ? -dir * (lw / 2 - .17) : -lw * .31;
          box(a, M.steel, [.045, .32, .04], [xx, -.10, side * .13]);
          box(a, M.dark, [.10, .45, .025], [xx, -.10, side * .08]);
        }
        if (d.style === 'vault') {
          add(a, new T.TorusGeometry(Math.min(.35, w * .16), .035, 6, 20), M.steel, [0, 0, .20]);
          for (let k = 0; k < 3; k++) { const angle = k * Math.PI * 2 / 3; rod(a, M.steel, [0, 0, .20], [Math.sin(angle) * .32, Math.cos(angle) * .32, .20], .023); }
        }
        if (d.style !== 'glass') label(a,d.style==='vault'||d.style==='helix'?4:1,[0,h*.27,d.style==='vault'?.18:.08],[0,0,0],Math.min(.38,lw*.4));
        sealAssembly(a, leaf); leaves.push({root: leaf, base, dir, slide: split ? lw + .08 : w + .08});
      }
      box(fixed, M.dark, [w + .2, .13, .16], [0, h + .22, 0]);
    }
    // Fixed rails and surrounds share the scene's static material batches.
    // Only the leaves and status lamp remain separate for animation.
    g.updateMatrix();
    for (const item of fixed.items) {
      staticParts.add(item.geometry, item.material, g.matrix, item.shadow);
      item.geometry.dispose();
    }
    fixed.items.length = 0; stats.doors++;
    const api = {root: g, leaves, update(amount, locked = false) {
      const open = Math.max(0, Math.min(1, amount));
      for (const p of leaves) {
        if (rolling) {
          const travel = p.base + open * (h + .18), top = h + p.ph / 2 + .10, turn = Math.max(0, travel - top);
          p.root.position.set(0, Math.min(travel, top), -turn);
          p.root.rotation.x = -Math.min(1, turn / p.ph) * Math.PI / 2;
        } else p.root.position.x = p.base + p.dir * p.slide * open;
      }
      lamp.material.color.setHex(locked ? 0xe85c4e : 0x77cda0);
    }};
    api.update(0, !d.open); doors.push(api); return api;
  }
  return {root, M, plant, planting, tree, computer, accessories, door, surface:surfaces.apply,
    finish() { if (!finished) { finished = true; sealAssembly(staticParts, root); } },
    update(power = {}) { for (const {material, power: key} of displays.values()) material.color.setScalar(key === 'always' || power[key] ? .85 : .025); },
    stats: () => ({...stats, surfaces:surfaces.stats()}),
    dispose() { root.removeFromParent(); const geometries = new Set(); root.traverse(o => { if (o.geometry) geometries.add(o.geometry); }); for (const g of geometries) g.dispose(); for (const m of owned) m.dispose(); for (const t of textures) t.dispose(); surfaces.dispose(); }
  };
}

// Magnetic reinforcement breach. Local origin is the centre of the existing
// aperture; the visible coil hardware never fills its inner circle.
export function createBreachFrame(T, parent, {radius = 1.4, steel, dark, energy, low = false} = {}) {
  const a = new Assembly(), root = new T.Group(); root.name = 'ORDRE / bobines de confinement'; parent.add(root);
  const b = (m, size, p, r = [0, 0, 0]) => { const g = new T.BoxGeometry(...size); a.add(g, m, matrix(p, r), !low); g.dispose(); };
  for (let k = 0; k < 10; k++) {
    const angle = k * Math.PI / 5, x = Math.sin(angle) * radius, y = Math.cos(angle) * radius;
    b(dark, [.30, .30, .26], [x, y, -.03], [0, 0, -angle]);
    b(steel, [.24, .23, .29], [x, y, -.03], [0, 0, -angle]);
    b(dark, [.17, .16, .015], [x, y, .126], [0, 0, -angle]);
    b(energy, [.12, .035, .018], [x, y, .14], [0, 0, -angle]);
    for (const side of [-1, 1]) b(steel, [.028, .028, .02], [x + Math.cos(angle) * side * .095, y - Math.sin(angle) * side * .095, .13]);
  }
  for (const side of [-1, 1]) {
    b(dark, [.44, .13, .60], [side * radius * .77, -radius - .08, 0]);
    const g = limb([side * radius * .77, -radius, 0], [side * radius * .65, -radius * .72, 0], .07, .07, 8);
    a.add(g, steel, null, !low); g.dispose();
  }
  a.build(root); for (const item of a.items) item.geometry.dispose(); a.items.length = 0;
  return root;
}

export function createBreachTexture(T) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'), gradient = c.createRadialGradient(128, 128, 2, 128, 128, 128);
  gradient.addColorStop(0, '#080d19'); gradient.addColorStop(.45, '#29324f'); gradient.addColorStop(.82, '#8b9ab7'); gradient.addColorStop(.94, '#eff8ff'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 72; k++) {
    c.strokeStyle = `rgba(214,235,255,${.12 + (k % 7) * .06})`; c.lineWidth = .5 + (k % 3) * .4;
    c.beginPath(); c.arc(128, 128, 12 + k * 1.5, k * .49, k * .49 + .25 + (k % 5) * .15); c.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; return map;
}
