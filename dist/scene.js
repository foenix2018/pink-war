import * as T from './vendor/three.webgpu.min.js';
import { WebGLRenderer } from './vendor/three.module.min.js';
import { PORTAL, COVER_WALLS, CATWALK, WEAPONS } from './game-logic.js';
import { createCharacterKit, createSoldier as buildSoldier } from './soldier.js';
import { buildGun } from './weapons.js';
import { createGlove } from './hands.js';
import { CHARACTERS, characterForId } from './characters.js';
import { createSurfaceDetails } from './surfaces.js';
import { createEnemyFactory } from './enemies.js';

const v = (x, y, z) => new T.Vector3(x, y, z);
const material = (color, roughness = .6, metalness = .25) => new T.MeshStandardMaterial({ color, roughness, metalness });
const neon = (color) => new T.MeshBasicMaterial({ color, toneMapped: false });

function canvasTexture(width, height, paint) {
  const c = document.createElement('canvas'); c.width = width; c.height = height; paint(c.getContext('2d'), width, height);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const glowTexture = () => canvasTexture(128, 128, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.15, 'rgba(255,255,255,.55)'); g.addColorStop(.4, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
});

export async function createScene(canvas, quality, forceWebGL = false, characterId = 'ghju') {
  let character=characterForId('ghju'),themeApplied=false;
  const palette={...character.palette},themeHalos=[];
  const Renderer = forceWebGL ? WebGLRenderer : T.WebGPURenderer;
  const renderer = new Renderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  let lost = false, recovery = null;
  const configure = instance => {
    instance.outputColorSpace = T.SRGBColorSpace; instance.toneMapping = T.ACESFilmicToneMapping; instance.toneMappingExposure = 1.08;
    instance.shadowMap.enabled = true; instance.shadowMap.type = T.PCFShadowMap;
    instance.onDeviceLost = info => {
      instance._isDeviceLost = true;
      if (instance === renderer) { lost = true; console.warn('Rétablissement automatique du rendu 3D.', info.reason || 'device lost'); }
    };
  };
  configure(renderer);
  if (renderer.init) await renderer.init();
  const scene = new T.Scene(); scene.background = new T.Color(0x302439); scene.fog = new T.FogExp2(0x423042, .008);
  const surfaces=createSurfaceDetails();
  const camera = new T.PerspectiveCamera(62, 1, .08, 650); camera.rotation.order = 'YXZ'; scene.add(camera);
  const mats = {
    ground: material(0x292731, .84, .25), tile: material(0x33303d, .73, .2), structure: material(0x393442, .8, .18),
    lightStone: material(0x796673, .84, .05), dark: material(palette.ink, .65, .55), steel: material(palette.steel, .35, .65),
    armor: material(0xd96799, .32, .58), armorLight: material(0xf3b1cc, .35, .4), suit: material(0x292235, .87, .12),
    hair: material(0xf1a5cb, .9, .05), visor: material(0x251d39, .15, .85), white: material(palette.white, .5, .45),
    rose: neon(palette.rose), pale: neon(palette.pale), violet: neon(palette.violet), cyan: neon(0x9fe6da),
    monster: material(0x43345b, .54, .5), monsterElite: material(0x63415a, .42, .65), monsterFace: material(0x211d31, .3, .66)
  };
  for(const mat of [mats.armor,mats.armorLight,mats.monster,mats.monsterElite])mat.roughnessMap=surfaces.coating;
  // Reflections belong to character equipment. Keeping them off the floor and buildings saves
  // a full-screen environment lookup in each eye, while the painted metal and visors keep their finish.
  for(const mat of [mats.dark,mats.steel,mats.armor,mats.armorLight,mats.visor,mats.monster,mats.monsterElite,mats.monsterFace]) {
    mat.envMap=surfaces.environment;mat.envMapIntensity=.42;
  }
  const geometries = { box: new T.BoxGeometry(1, 1, 1), sphere: new T.SphereGeometry(1, 12, 8), ico: new T.IcosahedronGeometry(1, 0),
    cylinder: new T.CylinderGeometry(1, 1, 1, 10), capsule: new T.CapsuleGeometry(.16, .45, 4, 8) };
  const glow = glowTexture();
  function mesh(geometry, mat, parent, position = [0, 0, 0], scale = [1, 1, 1], shadow = true) {
    const m = new T.Mesh(geometry, mat); m.position.set(...position); m.scale.set(...scale); m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
  }
  const box = (mat, parent, pos, scale, shadow = true) => mesh(geometries.box, mat, parent, pos, scale, shadow);
  function halo(parent, pos, size, color = palette.rose, opacity = .45) {
    const m = new T.SpriteMaterial({ map: glow, color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    const s = new T.Sprite(m); s.position.set(...pos); s.scale.set(size, size, 1); parent.add(s);themeHalos.push(s);return s;
  }

  function paintSky(c,w,h) {
    const g = c.createLinearGradient(0, 0, 0, h);[0,.37,.53,.62,.72,1].forEach((stop,i)=>g.addColorStop(stop,character.world.sky[i]));c.fillStyle = g; c.fillRect(0, 0, w, h);
    let seed = 17; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 250; i++) { const x = rand() * w, y = rand() * h * .47; c.fillStyle = `rgba(${character.world.star},${rand() * .65 + .15})`; c.beginPath(); c.arc(x, y, rand() * .6 + .3, 0, 7); c.fill(); }
  }
  const skyTexture = canvasTexture(1024,512,paintSky);
  const sky = new T.Mesh(new T.SphereGeometry(490, 32, 16), new T.MeshBasicMaterial({ map: skyTexture, side: T.BackSide, fog: false })); scene.add(sky);
  const moon=mesh(new T.SphereGeometry(1, 32, 20), new T.MeshBasicMaterial({ color: 0xe3b6c6, fog: false }), scene, [-122, 84, -240], [24, 24, 24], false);
  const moonRing = mesh(new T.TorusGeometry(33, .1, 5, 80), new T.MeshBasicMaterial({ color: 0xc794bc, transparent: true, opacity: .5, fog: false }), scene, [-122, 84, -240], [1, 1, 1], false); moonRing.rotation.set(.25, .1, -.55);
  const hemisphere=new T.HemisphereLight(0xcfb7db,0x442737,2.25);scene.add(hemisphere);
  const sun = new T.DirectionalLight(0xffd7da, 3.4); sun.position.set(-30, 50, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.near = 1; sun.shadow.camera.far = 135; sun.shadow.bias = -.0015; sun.shadow.normalBias = .045; scene.add(sun);
  const rim = new T.DirectionalLight(0x996acf, 1.8); rim.position.set(30, 12, -35); scene.add(rim);
  mesh(new T.PlaneGeometry(200, 200), mats.ground, scene, [0, -.05, 0], [1, 1, 1]).rotation.x = -Math.PI / 2;

  // Static geometry is batched by material to keep draw calls low on mobile.
  const batches = new Map(); const obstacles = [];
  const batch = (mat, pos, scale, rot = 0) => { if (!batches.has(mat)) batches.set(mat, []); batches.get(mat).push({ pos, scale, rot }); };
  const solid = (x, z, w, h, d, mat = mats.structure) => { batch(mat, [x, h / 2, z], [w, h, d]); obstacles.push({ x, z, hx: w / 2, hz: d / 2, height: h }); };
  for (let i = -100; i <= 100; i += 10) { batch(mats.tile, [i, .008, 0], [.055, .015, 200]); batch(mats.tile, [0, .008, i], [200, .015, .055]); }
  for (const x of [-7, 7]) { batch(mats.steel, [x, .03, -4], [.3, .035, 130]); batch(mats.rose, [x, .045, -4], [.065, .02, 130]); }
  for (let z = -85; z < 90; z += 9) { batch(mats.white, [0, .02, z], [.14, .015, 2.5]); }
  for (let i = -90; i <= 90; i += 10) {
    for (const side of [-1, 1]) {
      batch(mats.dark, [side * 99.5, 1, i], [1, 2, 10]); batch(mats.dark, [i, 1, side * 99.5], [10, 2, 1]);
      batch(mats.rose, [side * 99.4, 2.08, i], [.15, .12, 10]); batch(mats.rose, [i, 2.08, side * 99.4], [10, .12, .15]);
      batch(mats.structure, [side * 99, 3, i], [1.4, 6, 1.4]); batch(mats.structure, [i, 3, side * 99], [1.4, 6, 1.4]);
    }
  }
  const fenceMat = new T.MeshBasicMaterial({ color: 0xff77ac, transparent: true, opacity: .065, side: T.DoubleSide, depthWrite: false });
  for (let side = -1; side <= 1; side += 2) { box(fenceMat, scene, [side * 99, 3, 0], [.04, 6, 198], false); box(fenceMat, scene, [0, 3, side * 99], [198, 6, .04], false); }
  const structures = [ [-31,-21,12,15,12], [29,-32,9,24,10], [-25,24,8,9,8], [38,17,12,17,10], [-52,-56,17,30,12], [52,-61,13,35,14], [-66,28,17,22,13], [66,52,13,18,16], [12,66,10,10,9], [-25,65,10,15,12], [0,-73,16,23,10] ];
  for (const [x,z,w,h,d] of structures) {
    solid(x,z,w,h,d); batch(mats.dark, [x, h - 1, z], [w + 1, 1, d + 1]);
    batch(mats.steel, [x - w / 2 - .02, h / 2, z + d / 2], [.22, h, .22]);
    batch(mats.rose, [x, h * .7, z + d / 2 + .02], [w * .78, .15, .04]);
    for (let y = 3; y < h - 2; y += 4) for (let xx = -w / 2 + 2; xx < w / 2 - 1; xx += 2.3) { batch(mats.dark, [x + xx, y, z + d / 2 + .025], [.7, 1.7, .05]); if ((Math.round(xx) + y) % 3 === 0) batch(mats.violet, [x + xx, y, z + d / 2 + .06], [.2, .7, .04]); }
  }
  for (const [x, z, h] of [[-13,-7,1.8],[15,7,2],[31,-11,1.7],[-17,41,1.7],[20,35,2],[-35,2,2.4],[48,-12,1.7]]) {
    solid(x,z,4,h,3,mats.dark); batch(mats.steel,[x,h,z],[4.2,.18,3.2]); batch(mats.rose,[x,h*.7,z+1.52],[2,.09,.04]);
  }
  for (const b of COVER_WALLS) {
    solid(b.x, b.z, b.hx * 2, b.height, b.hz * 2, mats.lightStone);
    Object.assign(obstacles[obstacles.length - 1], { cover: true });
    batch(mats.steel, [b.x, b.height + .04, b.z], [b.hx * 2 + .12, .18, b.hz * 2 + .12]);
    if (b.hx > b.hz) {
      batch(mats.rose, [b.x, 2.25, b.z + b.hz + .02], [b.hx * 1.8, .07, .04]);
      batch(mats.rose, [b.x, 2.25, b.z - b.hz - .02], [b.hx * 1.8, .07, .04]);
      for (let x = -b.hx + .4; x < b.hx; x += 1.4) batch(mats.dark, [b.x + x, 1.2, b.z + b.hz + .02], [.035, 1.8, .04]);
    } else {
      batch(mats.rose, [b.x + b.hx + .02, 2.25, b.z], [.04, .07, b.hz * 1.8]);
      batch(mats.rose, [b.x - b.hx - .02, 2.25, b.z], [.04, .07, b.hz * 1.8]);
    }
  }
  // V3.7 — TECHNICAL ARENA: service yards, equipment and readable movement lanes.
  // All decoration uses the existing instanced materials. Only solid, walk-blocking
  // machinery goes into obstacles, so the enemy navigation grid stays consistent.
  const freightUnits=[
    [-62,-2,7.3,3,3.2],[-62,11,7.3,3,3.2],[-46,0,7.3,3,3.2],[-46,15,7.3,3,3.2],
    [53,1,7.3,3,3.2],[70,1,7.3,3,3.2],[53,19,7.3,3,3.2],[70,19,7.3,3,3.2]
  ];
  for(const [x,z,w,h,d] of freightUnits){
    solid(x,z,w,h,d,mats.dark);
    batch(mats.steel,[x,h+.04,z],[w+.11,.08,d+.12]);
    for(const side of [-1,1]){
      batch(mats.steel,[x+side*w*.48,h*.5,z],[.085,h,d+.13]);
      batch(mats.steel,[x,h*.5,z+side*d*.49],[w+.13,h,.075]);
      for(let j=-3;j<=3;j++)batch(mats.lightStone,[x+j*w/8,h*.51,z+side*(d*.5+.045)],[.037,h*.78,.026]);
      batch(mats.rose,[x,h*.75,z+side*(d*.5+.08)],[w*.34,.035,.018]);
    }
    for(let j=-2;j<=2;j++)batch(mats.steel,[x+j*w/6,h+.09,z],[.03,.02,d*.88]);
  }
  // Low steel parapets may be reached with a running jump (about 1 m high).
  for(const [x,z,w,d] of [[-18,35,3.3,1.25],[17,44,3.5,1.25],[-36,48,3.4,1.3],[35,-45,3.8,1.2]]){
    solid(x,z,w,1.0,d,mats.lightStone);
    batch(mats.steel,[x,1.04,z],[w+.10,.09,d+.08]);
    batch(mats.rose,[x,.78,z+d*.5+.025],[w*.8,.07,.03]);
    for(let k=-1;k<=1;k++)batch(mats.dark,[x+k*w*.3,.47,z+d*.5+.035],[.055,.7,.025]);
  }
  // Generator banks / high-voltage cabinets: solid machinery with access aisles.
  for(const [x,z,angle] of [[-26,-51,0],[-26,-61,0],[40,55,0],[55,55,0],[-75,64,0]]){
    solid(x,z,5.2,2.35,2.8,mats.structure);
    batch(mats.steel,[x,2.39,z],[5.5,.16,3.1]);
    for(const side of [-1,1]){
      batch(mats.lightStone,[x+side*2.62,1.2,z],[.09,2,2.4]);
      for(let j=-2;j<=2;j++)batch(mats.dark,[x+side*2.68,.95,z+j*.38],[.035,1,.18]);
    }
    batch(mats.rose,[x,1.9,z+1.43],[2,.07,.03]);
    batch(mats.white,[x,1.51,z+1.44],[.2,.24,.025]);
  }
  // Perimeter service conduit, heat exchangers, overhead cable trays and beacons.
  for(const row of [-77,77]){
    for(let x=-82;x<=82;x+=10){
      batch(mats.steel,[x,2.5,row],[.16,5,.16]);
      batch(mats.dark,[x,4.95,row],[.46,.22,.46]);
      batch(mats.rose,[x,4.7,row],[.12,.18,.12]);
      if(x<82)for(const offset of [-.19,.19])batch(mats.steel,[x+5,4.3,row+offset],[9.8,.065,.07]);
    }
  }
  for(const [x,z] of [[-36,-51],[40,55],[74,-42]]){
    // Offset supports make the ventilation runs recognisable even at low resolution.
    for(let i=0;i<7;i++){
      batch(mats.steel,[x+i*.52,1.4,z],[.42,.48,.65]);
      batch(mats.dark,[x+i*.52,1.4,z+.35],[.33,.32,.05]);
    }
    batch(mats.lightStone,[x+1.55,1.8,z],[4.1,.12,.9]);
  }
  // Service-lane striping and technical ground pads; non-colliding geometry.
  for(const x of [-84,-39,39,84]){
    for(let z=-84;z<=84;z+=6){
      batch(mats.tile,[x,.007,z],[.13,.012,2.6]);
      if(z%12===0)batch(mats.rose,[x+1.2,.013,z],[.18,.012,1.1]);
    }
  }
  for(const [x,z] of [[-30,-55],[50,55],[-55,4],[60,10]]){
    for(let k=-2;k<=2;k++)batch(mats.lightStone,[x+k*.53,.018,z],[.20,.012,4.6]);
    for(const side of [-1,1])batch(mats.rose,[x+side*3,.019,z],[.08,.015,5.3]);
  }
  // A traversable service bridge: stepped approaches, a level deck, and guarded sides.
  const bridgeX = CATWALK.x, bridgeWidth = 5.8, stairCount = 12;
  const stairDepth = (CATWALK.end - CATWALK.landing) / stairCount, stairRise = CATWALK.height / stairCount;
  const addWalkSurface = (x, z, width, depth, y, height) => obstacles.push({ x, z, hx: width / 2, hz: depth / 2, y, height, walkableSurface: true });
  for (let i = 1; i <= stairCount; i++) {
    const upZ = CATWALK.end - (i - .5) * stairDepth, upHeight = i * stairRise;
    batch(mats.dark, [bridgeX, upHeight / 2, upZ], [bridgeWidth, upHeight, stairDepth]);
    batch(mats.steel, [bridgeX, upHeight - .025, upZ], [bridgeWidth - .08, .05, stairDepth - .06]);
    batch(mats.rose, [bridgeX, upHeight + .012, upZ - stairDepth * .36], [bridgeWidth - .45, .025, .045]);
    addWalkSurface(bridgeX, upZ, bridgeWidth, stairDepth, 0, upHeight);

    const downZ = -CATWALK.landing - (i - .5) * stairDepth, downHeight = (stairCount - i) * stairRise;
    if (downHeight > 0) {
      batch(mats.dark, [bridgeX, downHeight / 2, downZ], [bridgeWidth, downHeight, stairDepth]);
      batch(mats.steel, [bridgeX, downHeight - .025, downZ], [bridgeWidth - .08, .05, stairDepth - .06]);
      batch(mats.rose, [bridgeX, downHeight + .012, downZ - stairDepth * .36], [bridgeWidth - .45, .025, .045]);
      addWalkSurface(bridgeX, downZ, bridgeWidth, stairDepth, 0, downHeight);
    }
  }
  const deckLength = CATWALK.landing * 2;
  batch(mats.dark, [bridgeX, CATWALK.height - .06, 0], [bridgeWidth, .12, deckLength]);
  batch(mats.steel, [bridgeX, CATWALK.height + .012, 0], [bridgeWidth - .08, .035, deckLength - .08]);
  addWalkSurface(bridgeX, 0, bridgeWidth, deckLength, CATWALK.height, .12);
  for (const side of [-1, 1]) {
    const railX = bridgeX + side * 2.55;
    // Invisible collision volume keeps the player on the walkway; visible bars follow the stairs.
    obstacles.push({ x: railX, z: 0, hx: .1, hz: CATWALK.end + .35, height: 2.55 });
    for (let i = 0; i <= stairCount; i++) {
      const upZ = CATWALK.end - i * stairDepth, upHeight = i * stairRise;
      batch(mats.steel, [railX, upHeight + .41, upZ], [.13, .82, .14]);
      if (i < stairCount) batch(mats.rose, [railX, upHeight + .84, upZ - stairDepth / 2], [.09, .07, stairDepth - .02]);
      const downZ = -CATWALK.landing - i * stairDepth, downHeight = (stairCount - i) * stairRise;
      batch(mats.steel, [railX, downHeight + .41, downZ], [.13, .82, .14]);
      if (i < stairCount) batch(mats.rose, [railX, downHeight + .84, downZ - stairDepth / 2], [.09, .07, stairDepth - .02]);
    }
    for (let z = -6; z <= 6; z += 2) {
      batch(mats.steel, [railX, CATWALK.height + .41, z], [.13, .82, .14]);
      if (z < 6) batch(mats.rose, [railX, CATWALK.height + .84, z + 1], [.09, .07, 1.96]);
    }
  }
  for (const z of [-6.5, 6.5]) for (const side of [-1, 1]) {
    batch(mats.structure, [bridgeX + side * 2.22, CATWALK.height / 2, z], [.26, CATWALK.height, .32]);
  }
  // Tapered distant silhouettes make the enclosure feel like part of a larger city.
  for (let i = 0; i < 28; i++) {
    const angle = i / 28 * Math.PI * 2, radius = 135 + (i % 3) * 15, h = 18 + (i * 17 % 55);
    batch(mats.structure, [Math.cos(angle)*radius,h/2,Math.sin(angle)*radius], [9+(i%4)*3,h,11], angle*.1);
  }
  for (const x of [-14, 14]) for (const z of [-42, -5, 28, 58]) {
    solid(x,z,.6,5,.6,mats.dark); batch(mats.rose,[x,4.3,z],[.68,1,.68]); halo(scene,[x,4.4,z],3.5,palette.rose,.25);
  }
  for (const [mat, items] of batches) {
    const instance = new T.InstancedMesh(geometries.box, mat, items.length); const matrix = new T.Matrix4(), q = new T.Quaternion();
    items.forEach((item, i) => { if (typeof item.rot === 'number') q.setFromAxisAngle(v(0,1,0),item.rot); else q.setFromEuler(v(item.rot.x||0,item.rot.y||0,item.rot.z||0)); matrix.compose(v(...item.pos), q, v(...item.scale)); instance.setMatrixAt(i,matrix); });
    instance.castShadow = !mat.isMeshBasicMaterial; instance.receiveShadow = !mat.isMeshBasicMaterial; instance.computeBoundingSphere(); scene.add(instance);
  }

  const portal = new T.Group(); portal.position.set(PORTAL.x,0,PORTAL.z); scene.add(portal);
  mesh(new T.CylinderGeometry(9.2,10,.35,48), mats.dark, portal, [0,.12,0]);
  mesh(new T.TorusGeometry(9,.04,4,80), mats.rose, portal, [0,.32,0], [1,1,1],false).rotation.x = -Math.PI/2;
  const gate = new T.Group(); gate.position.y = 7.15; portal.add(gate);
  mesh(new T.TorusGeometry(7,.46,8,72), mats.steel, gate);
  mesh(new T.TorusGeometry(6.67,.095,6,100), mats.pale, gate,[0,0,.2],[1,1,1],false);
  mesh(new T.TorusGeometry(7.52,.07,5,96), mats.rose, gate,[0,0,-.05],[1,1,1],false);
  const innerRing = mesh(new T.TorusGeometry(5.85,.055,5,70,Math.PI*1.7), mats.rose, gate,[0,0,.26],[1,1,1],false);
  function paintPortal(c,w) {
    c.clearRect(0,0,w,w);
    const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);[0,.09,.25,.7,.94,1].forEach((stop,i)=>g.addColorStop(stop,character.world.portal[i]));c.fillStyle=g;c.fillRect(0,0,w,w);
    for(let i=0;i<48;i++){const a=i*.8,r=20+i*4.5;c.strokeStyle=`rgba(${character.world.portalLine},${.12+i/400})`;c.lineWidth=1;c.beginPath();c.arc(w/2,w/2,r,a,a+Math.PI*.65);c.stroke();}
  }
  const portalTexture=canvasTexture(512,512,paintPortal);
  const vortex = mesh(new T.PlaneGeometry(13.1,13.1), new T.MeshBasicMaterial({map:portalTexture,transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),gate,[0,0,-.05],[1,1,1],false);
  const portalHalo = halo(gate,[0,0,.1],22,palette.rose,.36);
  const portalLight = new T.PointLight(palette.hot,75,34,2);portalLight.position.set(0,5,2);portal.add(portalLight);
  for(let i=0;i<12;i++){const a=i*Math.PI/6; const b=box(mats.dark,gate,[Math.cos(a)*7.12,Math.sin(a)*7.12,.12],[.8,.85,.75]);b.rotation.z=a;const n=box(mats.rose,gate,[Math.cos(a)*7.13,Math.sin(a)*7.13,.51],[.28,.5,.04],false);n.rotation.z=a;}
  for(const x of [-8,8]){box(mats.dark,portal,[x,3,0],[1.3,6,1.9]);box(mats.rose,portal,[x,3.4,1],[.17,3.8,.06],false);}
  const dustPositions = new Float32Array(100*3); for(let i=0;i<100;i++){dustPositions[i*3]=(Math.random()-.5)*35;dustPositions[i*3+1]=Math.random()*18;dustPositions[i*3+2]=PORTAL.z+(Math.random()-.5)*20;}
  const dustGeo = new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dustPositions,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:palette.pale,size:.045,transparent:true,opacity:.6,sizeAttenuation:true,depthWrite:false}));scene.add(dust);

  function paintEmblem(c,w,h){
    c.fillStyle=character.masculine?'#142b42':'#281d33';c.fillRect(0,0,w,h);c.strokeStyle=character.masculine?'#b8d7f6':'#f2bbd4';c.lineWidth=5;c.strokeRect(4,4,w-8,h-8);
    c.fillStyle=character.accent;c.beginPath();c.moveTo(128,13);c.lineTo(106,39);c.lineTo(84,23);c.lineTo(88,52);c.lineTo(168,52);c.lineTo(172,23);c.lineTo(150,39);c.closePath();c.fill();
    c.fillStyle=character.masculine?'#e7f5ff':'#ffe7ef';c.font='bold 38px monospace';c.textAlign='center';c.fillText(character.name,w/2,91);
    c.fillStyle=character.accent;c.font='19px monospace';c.fillText('— 07 —',w/2,116);
  }
  const emblem=canvasTexture(256,128,paintEmblem);
  const characterKit = createCharacterKit(emblem,surfaces);
  // A bare gloved right hand with its forearm, for the free controller in a headset.
  const createHand = () => createGlove(characterKit.gloves);
  const createGun = (options = {}) => buildGun({ mats, gloves: characterKit.gloves, sleeve: options.sleeve !== false, makeFlash: parent => halo(parent, [0, 0, 0], .6, palette.rose, .7) });
  const soldiers=Object.fromEntries(CHARACTERS.map(profile=>{
    const model=buildSoldier(characterKit,createGun,profile);model.root.visible=profile.id==='ghju';scene.add(model.root);return [profile.id,model];
  }));
  let soldier=soldiers.ghju;
  const weapon=new T.Group();const fpsGun=createGun();weapon.add(fpsGun);weapon.position.set(.19,-.24,-.56);camera.add(weapon);weapon.visible=false;
  function setEquipment(level){soldier.setLevel(level);fpsGun.userData.setLevel(level);}

  function setCharacter(id){
    const next=characterForId(id);if(themeApplied&&next.id===character.id)return;
    character=next;Object.assign(palette,character.palette);
    const previous=soldier;soldier=soldiers[character.id];
    if(previous!==soldier){
      soldier.root.position.copy(previous.root.position);soldier.root.rotation.copy(previous.root.rotation);soldier.root.scale.copy(previous.root.scale);
      soldier.root.visible=previous.root.visible;previous.root.visible=false;soldier.setLevel(previous.equipmentLevel);
    }
    soldier.setWeapon(fpsGun.userData.index);
    characterKit.setPalette(character.armor);
    const colors={...character.world,...palette,dark:palette.ink,cyan:character.world.cyan};
    for(const [name,mat] of Object.entries(mats))mat.color.setHex(colors[name]);
    scene.background.setHex(character.world.background);scene.fog.color.setHex(character.world.fog);
    hemisphere.color.setHex(character.world.skyLight);hemisphere.groundColor.setHex(character.world.groundLight);
    sun.color.setHex(character.world.sun);rim.color.setHex(character.world.rim);moon.material.color.setHex(character.world.moon);moonRing.material.color.setHex(character.world.moonRing);
    fenceMat.color.setHex(character.world.fence);portalLight.color.setHex(palette.hot);dust.material.color.setHex(palette.pale);
    for(const sprite of themeHalos)sprite.material.color.setHex(palette.rose);
    for(const [texture,paint] of [[skyTexture,paintSky],[portalTexture,paintPortal],[emblem,paintEmblem]]){
      const canvas=texture.image;paint(canvas.getContext('2d'),canvas.width,canvas.height);texture.needsUpdate=true;
    }
    themeApplied=true;
  }
  setCharacter(characterId);


  // Holographic armories: emerging light pillar, rising circular plinth and an actual weapon model.
  // Only 4 weapon stations exist at most; no update to the static instanced environment.
  const weaponStations=new Map();
  function makeStation(offer) {
    const base=new T.Group();base.position.set(offer.x,offer.elevation||0,offer.z);scene.add(base);
    const platform=mesh(new T.CylinderGeometry(.83,.9,.16,24),mats.steel,base,[0,.08,0]);
    const rim=mesh(new T.TorusGeometry(.75,.055,8,40),mats.rose,base,[0,.19,0],[1,1,1],false);rim.rotation.x=-Math.PI/2;
    const beam=mesh(new T.CylinderGeometry(.59,.74,4.2,22,1,true),
      new T.MeshBasicMaterial({color:palette.rose,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),base,[0,2.1,0],[1,1,1],false);
    const core=mesh(new T.CylinderGeometry(.045,.045,3.6,8),mats.pale,base,[0,1.9,0],[1,1,1],false);
    const ring=mesh(new T.TorusGeometry(.56,.024,6,28),mats.pale,base,[0,1.1,0],[1,1,1],false);ring.rotation.x=-Math.PI/2;
    const float=new T.Group();base.add(float);
    // Reuse the real in-game weapon geometry, but hide its glove grips for an unmanned pickup.
    const item=createGun({sleeve:false});item.userData.setVariant(offer.index);
    item.userData.hand.visible=false;item.userData.support.visible=false;
    item.scale.setScalar(1.65);float.add(item);
    return {base,beam,core,ring,float,offer};
  }
  function updateStations(sim,time) {
    const visible=new Set();
    for(const offer of sim.weaponOffers||[]){
      visible.add(offer.index);let station=weaponStations.get(offer.index);
      if(!station){station=makeStation(offer);weaponStations.set(offer.index,station);}
      const grow=Math.min(1,(time-(offer.createdAt||0))*1.2);
      const ease=grow*grow*(3-2*grow);
      station.base.position.set(offer.x,offer.elevation||0,offer.z);
      station.float.position.set(0,ease*(1.37+Math.sin(time*1.6+offer.index)*.11),0);
      station.float.rotation.y=time*.65+offer.index;
      station.beam.scale.y=Math.max(.001,ease);station.beam.position.y=2.1*ease;
      station.beam.material.opacity=.10+.05*Math.sin(time*2.7);
      station.ring.rotation.z=time*.45;
      station.core.scale.y=Math.max(.001,ease);
    }
    for(const [index,station] of weaponStations)if(!visible.has(index)){
      scene.remove(station.base);station.base.traverse(child=>{if(child===station.beam)child.material.dispose();});
      weaponStations.delete(index);
    }
  }
  // A defeated enemy is dissolved by a vertical plasma extraction beam.
  // Reuse the original (already GPU-resident) enemy mesh briefly before releasing it.
  const deaths=[],deathColumnGeo=new T.CylinderGeometry(.22,.57,3.6,12,1,true);
  const deathHaloGeo=new T.TorusGeometry(.62,.055,6,24);
  function beginDeath(id,time){
    const original=monsters.get(id);if(!original)return;
    monsters.delete(id);
    const origin=original.position.clone(),fx=new T.Group();fx.position.copy(origin);scene.add(fx);
    original.position.set(0,0,0);fx.add(original);
    const mat=new T.MeshBasicMaterial({color:palette.rose,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
    const column=new T.Mesh(deathColumnGeo,mat);column.position.y=1.6;column.renderOrder=9;fx.add(column);
    const haloMat=new T.MeshBasicMaterial({color:palette.pale,transparent:true,opacity:.92,depthWrite:false});
    const halo=new T.Mesh(deathHaloGeo,haloMat);halo.rotation.x=-Math.PI/2;halo.position.y=.2;fx.add(halo);
    deaths.push({fx,original,column,halo,mat,haloMat,start:time});
    burst(origin.x,origin.y+1.4,origin.z,palette.rose,21);
    if(deaths.length>14){const old=deaths.shift();scene.remove(old.fx);old.mat.dispose();old.haloMat.dispose();}
  }
  function updateDeaths(time){
    for(let i=deaths.length-1;i>=0;i--){
      const d=deaths[i],p=Math.min(1,Math.max(0,(time-d.start)/.75));
      d.original.scale.set(1+.22*p,Math.max(.001,1-p*p),1+.22*p);
      d.original.position.y=p*.68;
      d.original.rotation.y+=.07;
      d.original.visible=p<.75;
      d.column.scale.set(1+.28*Math.sin(time*39),1+.15*p,1+.28*Math.sin(time*39));
      d.column.material.opacity=.43*(1-p);
      d.halo.position.y=.15+3.2*p;
      d.halo.scale.setScalar(.7+1.6*p);
      d.halo.material.opacity=.9*(1-p);
      if(p>=1){scene.remove(d.fx);d.mat.dispose();d.haloMat.dispose();deaths.splice(i,1);}
    }
  }
  const monsters=new Map(), bulletMeshes=new Map(), particles=[];
  const enemyFactory=createEnemyFactory(mats);
  const createMonster=(elite,ranged,form)=>enemyFactory.create(elite,ranged,form);
  // Sparks share two instanced meshes (rose and violet), whatever their number.
  const SPARKS=320,sparkPools=[mats.rose,mats.violet].map(material=>{
    const pool=new T.InstancedMesh(geometries.ico,material,SPARKS);pool.count=0;pool.frustumCulled=false;pool.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(pool);return pool;
  });
  const sparkMatrix=new T.Matrix4(),sparkRotation=new T.Quaternion(),sparkPosition=new T.Vector3(),sparkScale=new T.Vector3();
  function burst(x,y,z,color=palette.rose,count=10){
    const pool=sparkPools[color===palette.rose?0:1];
    for(let i=0;i<count&&particles.length<SPARKS;i++)particles.push({pool,x,y,z,vx:(Math.random()-.5)*7,vy:Math.random()*5,vz:(Math.random()-.5)*7,life:.45+Math.random()*.3,max:.8});
  }
  function resetDynamic(){for(const death of deaths){scene.remove(death.fx);death.mat.dispose();death.haloMat.dispose();}deaths.length=0;for(const station of weaponStations.values()){scene.remove(station.base);station.beam.material.dispose();}weaponStations.clear();for(const m of monsters.values())scene.remove(m);monsters.clear();for(const m of bulletMeshes.values())scene.remove(m);bulletMeshes.clear();particles.length=0;for(const pool of sparkPools)pool.count=0;}
  function sync(sim,time,dt){
    setWeapon(sim.weaponIndex);setEquipment(Math.max(1,sim.wave));updateStations(sim,time);
    for(const event of sim.events||[])if(event.type==='kill')beginDeath(event.id,time);
    updateDeaths(time);
    soldier.root.scale.setScalar(1);soldier.root.position.set(sim.player.x,sim.player.elevation||0,sim.player.z);soldier.root.rotation.y=sim.player.yaw;
    const present=new Set();for(const e of sim.enemies){present.add(e.id);let m=monsters.get(e.id);if(!m){m=createMonster(e.elite,e.ranged,e.form);monsters.set(e.id,m);scene.add(m);}m.position.set(e.x,(e.elevation||0)+Math.abs(Math.sin(time*8+e.phase))*.025,e.z);m.rotation.y=e.yaw??(Math.atan2(sim.player.x-e.x,sim.player.z-e.z)+Math.PI);m.userData.animate(time,e.phase,e.limpUntil<=time);}
    for(const[id,m]of monsters){if(!present.has(id)){scene.remove(m);monsters.delete(id);}}
    const active=new Set();for(const b of sim.bullets){active.add(b.id);let m=bulletMeshes.get(b.id);if(!m){m=new T.Group();mesh(geometries.sphere,b.hostile?mats.cyan:mats.pale,m,[0,0,0],[.09,.09,.22],false);mesh(geometries.sphere,b.hostile?mats.violet:mats.rose,m,[0,0,.25],[.08,.08,.38],false);m.scale.setScalar(b.weapon==='nova'?2.3:b.weapon==='thorn'?1.3:b.hostile?1.4:1);bulletMeshes.set(b.id,m);scene.add(m);}m.position.set(b.x,b.y,b.z);m.lookAt(b.x+b.vx,b.y+b.vy,b.z+b.vz);}
    for(const[id,m]of bulletMeshes){if(!active.has(id)){scene.remove(m);bulletMeshes.delete(id);}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=6*dt;}
    for(const pool of sparkPools){
      let n=0;for(const p of particles){if(p.pool!==pool)continue;sparkPosition.set(p.x,p.y,p.z);sparkScale.setScalar(.08*p.life/p.max);sparkMatrix.compose(sparkPosition,sparkRotation,sparkScale);pool.setMatrixAt(n++,sparkMatrix);}
      pool.count=n;pool.visible=n>0;pool.instanceMatrix.needsUpdate=true;
    }
  }
  function setWeapon(index){ if(fpsGun.userData.index===index&&soldier.weapon===index)return;fpsGun.userData.setVariant(index);soldier.setWeapon(index); }
  function animatePortal(time){innerRing.rotation.z=time*.2;vortex.rotation.z=-time*.15;portalHalo.material.opacity=.3+Math.sin(time*2)*.055;dust.rotation.y=Math.sin(time*.1)*.06;}
  function lobby(time,level=1){
    camera.clearViewOffset();setEquipment(level);const portrait=innerHeight>innerWidth;
    soldier.root.scale.setScalar(portrait?1.2:2.6);soldier.root.position.set(portrait?0:3.1,0,7);soldier.root.rotation.y=Math.PI-.28;
    soldier.animate(time,false,0,0,0,.016,{preview:true});soldier.root.visible=true;weapon.visible=false;
    if(portrait){
      camera.fov=48;camera.position.set(0,1.6,16.4);camera.lookAt(0,1.28,7);
      camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.21,innerWidth,innerHeight);
    }else{camera.fov=56;camera.position.set(0,3.6,15);camera.lookAt(-4,3.4,-12);}
    camera.updateProjectionMatrix();
  }
  function outfit(time,level,angle){
    setEquipment(level);setWeapon(0);soldier.root.visible=true;weapon.visible=false;
    const portrait=innerHeight>innerWidth,scale=portrait?1.6:2.1;
    soldier.root.scale.setScalar(scale);soldier.root.position.set(0,0,7);soldier.root.rotation.y=angle;soldier.animate(time,false,0,0,0,.016,{preview:true});
    camera.fov=portrait?48:38;camera.position.set(0,portrait?1.8:2.7,portrait?16.4:16);
    camera.lookAt(0,portrait?1.45:2.18,7);
    camera.setViewOffset(innerWidth,innerHeight,portrait?0:-innerWidth*.22,portrait?innerHeight*.24:0,innerWidth,innerHeight);camera.updateProjectionMatrix();
  }
  function setInspection(enabled){for(const m of monsters.values())m.visible=!enabled;for(const m of bulletMeshes.values())m.visible=!enabled;for(const pool of sparkPools)pool.visible=!enabled&&pool.count>0;}
  function resize(nextQuality=quality){quality=nextQuality;const q=nextQuality;const ratio=q==='low'?1:q==='high'?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,innerWidth<1000?1.4:1.8);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.shadowMap.enabled=q!=='low';}
  resize();
  const stereo = new T.StereoCamera(); stereo.aspect = .5; stereo.eyeSep = .064;
  function renderStereo() {
    if (lost) return;
    camera.updateMatrixWorld(true); stereo.update(camera);
    renderer.setScissorTest(true);
    renderer.setViewport(0,0,innerWidth/2,innerHeight); renderer.setScissor(0,0,innerWidth/2,innerHeight); renderer.render(scene,stereo.cameraL);
    renderer.setViewport(innerWidth/2,0,innerWidth/2,innerHeight); renderer.setScissor(innerWidth/2,0,innerWidth/2,innerHeight); renderer.render(scene,stereo.cameraR);
    renderer.setScissorTest(false); renderer.setViewport(0,0,innerWidth,innerHeight);
  }
  async function recover() {
    if (recovery) return recovery;
    recovery = (async () => {
      if (renderer.isWebGLRenderer) throw new Error('Le périphérique graphique est indisponible.');
      const nextCanvas = renderer.domElement.cloneNode(false);
      renderer.dispose();
      // Fresh resources avoid reusing texture state from a destroyed GPU device.
      const next = await createScene(nextCanvas, quality, true,character.id);
      next.camera.position.copy(camera.position); next.camera.rotation.copy(camera.rotation); next.camera.fov = camera.fov; next.camera.updateProjectionMatrix();
      next.soldier.root.position.copy(soldier.root.position); next.soldier.root.rotation.copy(soldier.root.rotation); next.soldier.root.scale.copy(soldier.root.scale);
      await next.renderer.compileAsync(next.scene, next.camera);
      renderer.domElement.replaceWith(nextCanvas);
      return next;
    })();
    try { return await recovery; } finally { recovery = null; }
  }
  return {T,scene,camera,get renderer(){return renderer;},obstacles,get soldier(){return soldier;},get character(){return character;},get palette(){return {...palette};},weapon,fpsGun,monsters,resize,sync,lobby,animatePortal,burst,resetDynamic,recover,setWeapon,createGun,renderStereo,setEquipment,outfit,setInspection,createHand,setCharacter,
    get lost(){return lost;},get backend(){return renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL';},render:()=>{if(!lost)renderer.render(scene,camera);}};
}
