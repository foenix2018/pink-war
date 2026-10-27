import {createWorldShadows,createGroundOcclusion} from './world-shadows.js';
import * as T from './vendor/three.webgpu.min.js';
import { WebGLRenderer } from './vendor/three.module.min.js';
import { PORTAL, COVER_WALLS, CATWALK, WEAPONS,starterWeaponIndex } from './game-logic.js';
import { createCharacterKit, createSoldier as buildSoldier } from './soldier.js';
import { installShadowUnit, applyShadowMaterials } from './shadow-unit-game.js';
import { buildGun } from './weapons.js';
import { setKenneyAccent } from './kenney-blasters.js';
import { createGlove } from './hands.js';
import { CHARACTERS, characterForId } from './characters.js';
import { createSurfaceDetails } from './surfaces.js';
import { createEnemyFactory } from './enemies.js';
import { createRuinedCity, paintRuinSky } from './world-art.js';
import { createTraversalArt } from './traversal-art.js';
import { createLaserFX } from './laser-fx.js';
import { createCombatFX } from './combat-fx.js';
import { createShootingRangeArt } from './shooting-range-art.js';
import {targetPosition} from './shooting-range.js';
import { createMoon } from './moon.js';
import { createCampaignArt } from './campaign-art.js';
import { VESPER_SUN } from './vesper-art.js';
import { graphicsProfile,renderPixelRatio,createCompatibleRenderer,warmRenderer } from './renderer-policy.js';

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
  const deviceEnvironment={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,gpu:navigator.gpu,
    rendererHint:new URLSearchParams(location.search).get('renderer')};
  const profile=graphicsProfile(deviceEnvironment,quality,forceWebGL);
  const prepared=await createCompatibleRenderer({canvas,WebGPU:T.WebGPURenderer,WebGL:WebGLRenderer,profile});
  canvas=prepared.canvas;const renderer=prepared.renderer;
  let lost = false, recovery = null,released=false;
  const configure = instance => {
    instance.outputColorSpace = T.SRGBColorSpace; instance.toneMapping = T.ACESFilmicToneMapping; instance.toneMappingExposure = 1.08;
    instance.shadowMap.enabled = profile.shadows; instance.shadowMap.type = T.PCFShadowMap;
    instance.onDeviceLost = info => {
      instance._isDeviceLost = true;
      if (instance === renderer&&!released) { lost = true; console.warn('Rétablissement automatique du rendu 3D.', info.reason || 'device lost'); }
    };
  };
  configure(renderer);
  const contextLost=event=>{event.preventDefault();if(!released){lost=true;window.dispatchEvent(new CustomEvent('pink-war-context-lost'));}};
  canvas.addEventListener('webglcontextlost',contextLost);
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
  for(const mat of [mats.monster,mats.monsterElite]){mat.map=surfaces.machine;mat.bumpMap=surfaces.machine;mat.bumpScale=.004;}
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

  let campaignSky=false;
  function paintSky(c,w,h) { paintRuinSky(c,w,h,character.masculine,{dusk:campaignSky}); }
  const skyTexture = canvasTexture(profile.skyWidth,profile.skyWidth/2,paintSky);
  const sky = new T.Mesh(new T.SphereGeometry(490, 32, 16), new T.MeshBasicMaterial({ map: skyTexture, side: T.BackSide, fog: false, dithering: true })); scene.add(sky);
  let morningReady=false;
  const morningSky=new T.TextureLoader().load('./assets/cc0/vesper-morning-sky.webp',()=>{morningReady=true;if(campaignSky){sky.material.map=morningSky;sky.material.needsUpdate=true;}},undefined,()=>{});
  morningSky.colorSpace=T.SRGBColorSpace;
  // The moon is a camera-relative celestial backdrop, not a world obstacle.
  // The depth buffer still lets buildings and smoke geometry occlude its glow.
  const moon = createMoon(scene, glow);
  const hemisphere=new T.HemisphereLight(0xa9c9e5,0x344058,1.32);scene.add(hemisphere);
  const sun = new T.DirectionalLight(0xb5d7ff, 2.25); sun.position.set(-30, 50, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.near = 1; sun.shadow.camera.far = 135; sun.shadow.bias = -.0015; sun.shadow.normalBias = .045; scene.add(sun);scene.add(sun.target);
  const worldShadows=createWorldShadows(T,{scene,renderer,light:sun,profile,direction:{x:-30,y:50,z:20}});
  let shadowTime=0,shadowEntities=[],shadowHeight=e=>e.elevation||e.homeHeight||0;
  function trackShadows(x,z,elevation=0){
    // Selection changes the canonical sun direction; the map follows play.
    const direction=rangeActive?{x:-4,y:4.4,z:3}:campaignSky?VESPER_SUN:{x:-30,y:50,z:20};
    worldShadows.update(shadowTime,{x,z,elevation},{entities:shadowEntities,heightAt:shadowHeight});
    // The range uses its own ceiling fixtures; no duplicate outdoor sun map.
    if(rangeActive)sun.castShadow=false;
    sun.position.set(sun.target.position.x+direction.x,elevation+direction.y,sun.target.position.z+direction.z);
  }
  const rim = new T.DirectionalLight(0x9abfff, 1.08); rim.position.set(30, 12, -35); scene.add(rim);
  const batches = new Map(); const obstacles = [];
  const batch = (mat, pos, scale, rot = 0) => { if (!batches.has(mat)) batches.set(mat, []); batches.get(mat).push({ pos, scale, rot }); };
  const arenaRoot=new T.Group();arenaRoot.name='Carte Survie / indépendante';scene.add(arenaRoot);
  const beforeArena=new Set(scene.children);
  const city = createRuinedCity(scene, obstacles, COVER_WALLS, palette.rose, profile.artQuality,{deferPbr:true});
  const cityMats = city.materials;
  const traversal = createTraversalArt(scene, obstacles, cityMats);
  for(const child of [...scene.children])if(!beforeArena.has(child))arenaRoot.add(child);
  const combatFX = createCombatFX(T, scene, palette);
  const laserFX=createLaserFX(T,scene,palette);
  const bladeLight=new T.PointLight(palette.rose,0,3.2,2);bladeLight.castShadow=false;scene.add(bladeLight);
  function lightBlade(){
    let active=null;scene.traverseVisible(o=>{if(!active&&o.userData.getBladeSegment&&o.userData.index===5)active=o.userData.getBladeSegment();});
    bladeLight.intensity=active&&active.extension>.1?2.4*active.extension:0;
    if(active){bladeLight.position.set((active.base.x+active.tip.x)/2,(active.base.y+active.tip.y)/2,(active.base.z+active.tip.z)/2);bladeLight.color.setHex(palette.rose);}
  }
  // A traversable service bridge: stepped approaches, a level deck, and guarded sides.
  const bridgeX = CATWALK.x, bridgeWidth = 5.8, stairCount = 12;
  const stairDepth = (CATWALK.end - CATWALK.landing) / stairCount, stairRise = CATWALK.height / stairCount;
  const addWalkSurface = (x, z, width, depth, y, height) => obstacles.push({ x, z, hx: width / 2, hz: depth / 2, y, height, walkableSurface: true, surface: 'metal' });
  for (let i = 1; i <= stairCount; i++) {
    const upZ = CATWALK.end - (i - .5) * stairDepth, upHeight = i * stairRise;
    batch(cityMats.black, [bridgeX, upHeight / 2, upZ], [bridgeWidth, upHeight, stairDepth]);
    batch(cityMats.steel, [bridgeX, upHeight - .025, upZ], [bridgeWidth - .08, .05, stairDepth - .06]);
    batch(cityMats.yellow, [bridgeX, upHeight + .012, upZ - stairDepth * .36], [bridgeWidth - .45, .025, .045]);
    addWalkSurface(bridgeX, upZ, bridgeWidth, stairDepth, 0, upHeight);

    const downZ = -CATWALK.landing - (i - .5) * stairDepth, downHeight = (stairCount - i) * stairRise;
    if (downHeight > 0) {
      batch(cityMats.black, [bridgeX, downHeight / 2, downZ], [bridgeWidth, downHeight, stairDepth]);
      batch(cityMats.steel, [bridgeX, downHeight - .025, downZ], [bridgeWidth - .08, .05, stairDepth - .06]);
      batch(cityMats.yellow, [bridgeX, downHeight + .012, downZ - stairDepth * .36], [bridgeWidth - .45, .025, .045]);
      addWalkSurface(bridgeX, downZ, bridgeWidth, stairDepth, 0, downHeight);
    }
  }
  const deckLength = CATWALK.landing * 2;
  batch(cityMats.black, [bridgeX, CATWALK.height - .06, 0], [bridgeWidth, .12, deckLength]);
  batch(cityMats.steel, [bridgeX, CATWALK.height + .012, 0], [bridgeWidth - .08, .035, deckLength - .08]);
  addWalkSurface(bridgeX, 0, bridgeWidth, deckLength, CATWALK.height, .12);
  for (const side of [-1, 1]) {
    const railX = bridgeX + side * 2.55;
    // Invisible collision volume keeps the player on the walkway; visible bars follow the stairs.
    obstacles.push({ x: railX, z: 0, hx: .1, hz: CATWALK.end + .35, height: 2.55 });
    for (let i = 0; i <= stairCount; i++) {
      const upZ = CATWALK.end - i * stairDepth, upHeight = i * stairRise;
      batch(cityMats.steel, [railX, upHeight + .41, upZ], [.13, .82, .14]);
      if (i < stairCount) batch(cityMats.yellow, [railX, upHeight + .84, upZ - stairDepth / 2], [.09, .07, stairDepth - .02]);
      const downZ = -CATWALK.landing - i * stairDepth, downHeight = (stairCount - i) * stairRise;
      batch(cityMats.steel, [railX, downHeight + .41, downZ], [.13, .82, .14]);
      if (i < stairCount) batch(cityMats.yellow, [railX, downHeight + .84, downZ - stairDepth / 2], [.09, .07, stairDepth - .02]);
    }
    for (let z = -6; z <= 6; z += 2) {
      batch(cityMats.steel, [railX, CATWALK.height + .41, z], [.13, .82, .14]);
      if (z < 6) batch(cityMats.yellow, [railX, CATWALK.height + .84, z + 1], [.09, .07, 1.96]);
    }
  }
  for (const z of [-6.5, 6.5]) for (const side of [-1, 1]) {
    batch(cityMats.concrete, [bridgeX + side * 2.22, CATWALK.height / 2, z], [.26, CATWALK.height, .32]);
  }
  for (const [mat, items] of batches) {
    const instance = new T.InstancedMesh(geometries.box, mat, items.length); const matrix = new T.Matrix4(), q = new T.Quaternion();
    items.forEach((item, i) => { if (typeof item.rot === 'number') q.setFromAxisAngle(v(0,1,0),item.rot); else q.setFromEuler(v(item.rot.x||0,item.rot.y||0,item.rot.z||0)); matrix.compose(v(...item.pos), q, v(...item.scale)); instance.setMatrixAt(i,matrix); });
    instance.castShadow = !mat.isMeshBasicMaterial; instance.receiveShadow = !mat.isMeshBasicMaterial; instance.computeBoundingSphere(); arenaRoot.add(instance);
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
  const createHand = (options = {}) => createGlove(characterKit.gloves,options);
  const createGun = (options = {}) => buildGun({ mats, gloves: characterKit.gloves, sleeve: options.sleeve !== false, makeFlash: parent => halo(parent, [0, 0, 0], .6, palette.rose, .7) });
  const soldiers=Object.fromEntries(CHARACTERS.map(profile=>{
    const model=buildSoldier(characterKit,createGun,profile);
    installShadowUnit(model,profile);
    model.root.visible=profile.id==='ghju';scene.add(model.root);return [profile.id,model];
  }));
  let soldier=soldiers.ghju;
  function setPlayerVisible(visible){for(const [id,model] of Object.entries(soldiers))model.root.visible=!!visible&&id===character.id;}
  const weapon=new T.Group();const fpsGun=createGun();weapon.add(fpsGun);weapon.position.set(.19,-.24,-.56);camera.add(weapon);weapon.visible=false;
  // A separate camera-relative sword survives the instant model switch: the
  // outgoing hilt travels to the lower left before the replacement weapon rises.
  const holsterGun=createGun();holsterGun.userData.setVariant(5);
  holsterGun.visible=false;camera.add(holsterGun);
  holsterGun.position.set(-.24,-.22,-.53);

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
    applyShadowMaterials(characterKit,character);
    const colors={...character.world,...palette,dark:palette.ink,cyan:character.world.cyan};
    for(const [name,mat] of Object.entries(mats))mat.color.setHex(colors[name]);
    scene.background.setHex(character.masculine?0x16243c:0x261d32);scene.fog.color.setHex(character.masculine?0x263750:0x463b50);scene.fog.density=.0067;
    hemisphere.color.setHex(0xa9c9e5);hemisphere.groundColor.setHex(0x344058);
    sun.color.setHex(0xb5d7ff);rim.color.setHex(0x9abfff);city.setAccent(palette.rose);combatFX.setAccent(palette.rose);laserFX.setAccent(palette.rose);setKenneyAccent(palette.rose);
    portalLight.color.setHex(palette.hot);dust.material.color.setHex(palette.pale);
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
    const beam=mesh(new T.CylinderGeometry(.65,.78,7.5,22,1,true),
      new T.MeshBasicMaterial({color:palette.rose,transparent:true,opacity:.29,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),base,[0,3.85,0],[1,1,1],false);
    const core=mesh(new T.CylinderGeometry(.038,.038,6.8,8),mats.pale,base,[0,3.45,0],[1,1,1],false);
    const ring=mesh(new T.TorusGeometry(.72,.055,6,36),mats.pale,base,[0,1.1,0],[1,1,1],false);ring.rotation.x=-Math.PI/2;
    const beacon=mesh(new T.TorusGeometry(.8,.08,8,32),mats.rose,base,[0,6.8,0],[1,1,1],false);beacon.rotation.x=-Math.PI/2;
    const float=new T.Group();base.add(float);
    // Reuse the real in-game weapon geometry, but hide its glove grips for an unmanned pickup.
    const item=createGun({sleeve:false});item.userData.setVariant(offer.index);
    item.userData.hand.visible=false;item.userData.support.visible=false;
    item.scale.setScalar(1.65);float.add(item);
    return {base,beam,core,ring,beacon,float,offer};
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
      station.beam.scale.y=Math.max(.001,ease);station.beam.position.y=3.85*ease;
      station.beam.material.opacity=.23+.07*Math.sin(time*2.7);
      station.ring.rotation.z=time*.45;
      station.beacon.position.y=6.8*ease;station.beacon.scale.setScalar(.8+.22*Math.sin(time*3));
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
  // Secondary breaches are independent visual gates created only for an active wave.
  // Shared low-poly geometry keeps draw calls and VRAM bounded on Quest/iPhone.
  const secondaryPortals=new Map();
  const breachRingGeometry=new T.TorusGeometry(2.45,.20,7,34);
  const breachHaloGeometry=new T.TorusGeometry(2.83,.045,5,40);
  const breachSurfaceGeometry=new T.PlaneGeometry(4.6,4.6);
  function buildSecondaryPortal(site) {
    const group=new T.Group();group.position.set(site.x,0,site.z);group.rotation.y=site.yaw||0;
    scene.add(group);
    const gate=new T.Group();gate.position.y=2.9;group.add(gate);
    const ring=mesh(breachRingGeometry,mats.steel,gate,[0,0,0],[1,1,1],false);
    const outline=mesh(breachHaloGeometry,mats.rose,gate,[0,0,.08],[1,1,1],false);
    const vortexMat=new T.MeshBasicMaterial({map:portalTexture,transparent:true,side:T.DoubleSide,
      depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:0});
    const surface=mesh(breachSurfaceGeometry,vortexMat,gate,[0,0,-.025],[1,1,1],false);
    const floorRing=mesh(breachHaloGeometry,mats.pale,group,[0,.10,0],[.65,.65,.65],false);
    floorRing.rotation.x=-Math.PI/2;
    const light=new T.PointLight(palette.hot,6,10,2);light.position.set(0,2.8,.7);group.add(light);
    return {group,gate,ring,outline,surface,vortexMat,floorRing,light,site};
  }
  function syncSecondaryPortals(sim,time) {
    const present=new Set();
    portal.visible=!rangeActive&&(!sim.wave||sim.activePortals.some(p=>p.x===PORTAL.x&&p.z===PORTAL.z&&time>=p.openedAt));
    for(const site of sim.activePortals||[]){
      if(site.x===PORTAL.x&&site.z===PORTAL.z)continue;
      present.add(site.id);
      let display=secondaryPortals.get(site.id);
      if(!display){display=buildSecondaryPortal(site);secondaryPortals.set(site.id,display);}
      const t=time-site.openedAt,open=Math.max(0,Math.min(1,t/.72)),ease=open*open*(3-2*open);
      display.group.visible=t>=0;
      display.gate.scale.set(1,Math.max(.001,ease),1);
      display.surface.material.opacity=.88*ease*(.9+.1*Math.sin(time*3.4));
      display.outline.rotation.z=time*.19;
      display.floorRing.scale.setScalar(.62+.12*Math.sin(time*4));
      display.light.intensity=6*ease;
    }
    for(const [id,display] of secondaryPortals)if(!present.has(id)){
      scene.remove(display.group);display.vortexMat.dispose();secondaryPortals.delete(id);
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
  // Survival pickups: a rose medical cross or an energy cell, turning above a ground ring.
  const pickupMeshes=new Map(),pickupRing=new T.TorusGeometry(.42,.025,4,28);
  function makePickup(kind){
    const g=new T.Group(),heal=kind==='heal',core=heal?mats.rose:mats.cyan;
    if(heal){mesh(geometries.box,core,g,[0,0,0],[.36,.11,.11],false);mesh(geometries.box,core,g,[0,0,0],[.11,.36,.11],false);mesh(geometries.box,mats.white,g,[0,0,0],[.2,.2,.07],false);}
    else{mesh(geometries.cylinder,mats.steel,g,[0,0,0],[.085,.3,.085],false);mesh(geometries.cylinder,core,g,[0,0,0],[.095,.13,.095],false);mesh(geometries.cylinder,mats.pale,g,[0,.18,0],[.035,.06,.035],false);}
    const ring=mesh(pickupRing,core,g,[0,-.5,0],[1,1,1],false);ring.rotation.x=-Math.PI/2;ring.userData.ground=true;
    return g;
  }
  function resetDynamic(){for(const m of pickupMeshes.values())scene.remove(m);pickupMeshes.clear();rangeArt.update(null);combatFX.reset();laserFX.reset();traversal.update(0);for(const visual of secondaryPortals.values()){scene.remove(visual.group);visual.vortexMat.dispose();}secondaryPortals.clear();portal.visible=!rangeActive;for(const death of deaths){scene.remove(death.fx);death.mat.dispose();death.haloMat.dispose();}deaths.length=0;for(const station of weaponStations.values()){scene.remove(station.base);station.beam.material.dispose();}weaponStations.clear();for(const m of monsters.values())scene.remove(m);monsters.clear();for(const m of bulletMeshes.values())scene.remove(m);bulletMeshes.clear();particles.length=0;for(const pool of sparkPools)pool.count=0;}
  function sync(sim,time,dt){
    if(!campaignActive)city.fence?.update({...sim.player,y:(sim.player.elevation||0)+(sim.player.crouched?1.05:1.65)},.65,1.2);traversal.update(sim.time);campaignArt.updateLift(sim.time);combatFX.update(dt,camera);laserFX.update(sim.bullets,dt);shadowTime=sim.time;shadowEntities=rangeActive?[sim.player,...sim.targets.map(t=>({...targetPosition(t,sim.time),radius:.28}))]:[...sim.enemies,sim.player];shadowHeight=e=>sim.surfaceHeight(e.x,e.z,sim.time,(e.elevation||0)+.3);trackShadows(sim.player.x,sim.player.z,sim.player.elevation||0);
    setWeapon(sim.weaponIndex);setEquipment(Math.max(1,sim.wave));updateStations(sim,time);syncSecondaryPortals(sim,sim.time);rangeArt.update(rangeActive?sim:null);
    if(rangeActive){const observer=sim.interactionPosition||sim.player;if(Math.hypot(observer.x,observer.z-34.9)<12)rangeArt.setArmoryModels(fpsGun.userData.weaponModels,fpsGun.userData.kenneyVersion||0,character.id);rangeArt.shadows.update(sim.time,sim);}
    for(const event of sim.events||[])if(event.type==='kill')beginDeath(event.id,time);
    updateDeaths(time);
    soldier.root.scale.setScalar(soldier.heightScale);soldier.root.position.set(sim.player.x,sim.player.elevation||0,sim.player.z);soldier.root.rotation.y=sim.player.yaw;
    const present=new Set();for(const e of sim.enemies){present.add(e.id);let m=monsters.get(e.id);if(!m){m=createMonster(e.elite,e.ranged,e.form);m.rotation.order='YXZ';monsters.set(e.id,m);scene.add(m);}m.position.set(e.x,e.elevation||0,e.z);m.rotation.y=e.yaw??(Math.atan2(sim.player.x-e.x,sim.player.z-e.z)+Math.PI);m.userData.animate(time,e.phase,e.limpUntil<=time,e,sim.time);
      // A hit rocks the body back, away from the shooter, for a fifth of a second (harder on a head shot).
      const sinceHit=sim.time-(e.hitAt??-9);m.rotation.x=sinceHit<.22?Math.sin(sinceHit/.22*Math.PI)*(e.hitZone==='head'?.2:.11):0;}
    for(const[id,m]of monsters){if(!present.has(id)){scene.remove(m);monsters.delete(id);}}
    const active=new Set();for(const b of sim.bullets){if(!b.hostile)continue;active.add(b.id);let m=bulletMeshes.get(b.id);if(!m){m=new T.Group();const width=b.hostile?.028:({r9:.012,bloom:.010,lance:.022,thorn:.008,nova:.065}[b.weapon]||.015);const rail=b.weapon==='thorn',plasma=b.weapon==='nova';mesh(geometries.sphere,b.hostile?mats.cyan:mats.pale,m,[0,0,0],[width,width,rail?.16:plasma?.11:.055],false);mesh(geometries.sphere,b.hostile?mats.violet:mats.rose,m,[0,0,-.10],[width*1.6,width*1.6,rail?.22:plasma?.14:.10],false);m.scale.setScalar(.75+(b.power||1)*.25);bulletMeshes.set(b.id,m);scene.add(m);}m.position.set(b.x,b.y,b.z);m.lookAt(b.x+b.vx,b.y+b.vy,b.z+b.vz);}
    for(const[id,m]of bulletMeshes){if(!active.has(id)){scene.remove(m);bulletMeshes.delete(id);}}
    const live=new Set();for(const p of sim.pickups||[]){live.add(p.id);let m=pickupMeshes.get(p.id);if(!m){m=makePickup(p.kind);pickupMeshes.set(p.id,m);scene.add(m);}
      // Blinks during its last 2.5 s; the ring stays on the floor while the item bobs.
      const left=p.until-sim.time,bob=Math.sin(time*3+p.id)*.07;m.visible=left>2.5||Math.floor(left*6)%2===0;
      m.position.set(p.x,p.y+.6+bob,p.z);m.rotation.y=time*1.8;for(const c of m.children)if(c.userData.ground)c.position.y=-.58-bob;}
    for(const[id,m]of pickupMeshes)if(!live.has(id)){scene.remove(m);pickupMeshes.delete(id);}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=6*dt;}
    for(const pool of sparkPools){
      let n=0;for(const p of particles){if(p.pool!==pool)continue;sparkPosition.set(p.x,p.y,p.z);sparkScale.setScalar(.08*p.life/p.max);sparkMatrix.compose(sparkPosition,sparkRotation,sparkScale);pool.setMatrixAt(n++,sparkMatrix);}
      pool.count=n;pool.visible=n>0;pool.instanceMatrix.needsUpdate=true;
    }
  }
  function setWeapon(index){ if(fpsGun.userData.index===index&&soldier.weapon===index)return;fpsGun.userData.setVariant(index);soldier.setWeapon(index); }
  function animatePortal(time){city.update(time);sky.rotation.y=time*.00035;innerRing.rotation.z=time*.2;vortex.rotation.z=-time*.15;portalHalo.material.opacity=.3+Math.sin(time*2)*.055;dust.rotation.y=Math.sin(time*.1)*.06;}
  function lobby(time,level=1){
    trackShadows(0,7);camera.clearViewOffset();setEquipment(level);portal.visible=true;const portrait=innerHeight>innerWidth;
    soldier.root.scale.setScalar((portrait?1.2:2.6)*soldier.heightScale);soldier.root.position.set(portrait?0:3.1,0,7);soldier.root.rotation.y=Math.PI-.28;
    soldier.animate(time,false,0,0,0,.016,{preview:true});setPlayerVisible(true);weapon.visible=false;
    if(portrait){
      camera.fov=48;camera.position.set(0,1.6,16.4);camera.lookAt(0,1.28,7);
      camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.21,innerWidth,innerHeight);
    }else{camera.fov=56;camera.position.set(0,3.6,15);camera.lookAt(-4,3.4,-12);}
    camera.updateProjectionMatrix();
  }
  function outfit(time,level,angle){
    trackShadows(0,7);setEquipment(level);setWeapon(starterWeaponIndex(character.id));portal.visible=true;setPlayerVisible(true);weapon.visible=false;
    const portrait=innerHeight>innerWidth,scale=portrait?1.6:2.1;
    soldier.root.scale.setScalar(scale*soldier.heightScale);soldier.root.position.set(0,0,7);soldier.root.rotation.y=angle;soldier.animate(time,false,0,0,0,.016,{preview:true});
    camera.fov=portrait?48:38;camera.position.set(0,portrait?1.8:2.7,portrait?16.4:16);
    camera.lookAt(0,portrait?1.45:2.18,7);
    camera.setViewOffset(innerWidth,innerHeight,portrait?0:-innerWidth*.22,portrait?innerHeight*.24:0,innerWidth,innerHeight);camera.updateProjectionMatrix();
  }
  function setInspection(enabled){combatFX.setVisible?.(!enabled);for(const m of monsters.values())m.visible=!enabled;for(const m of bulletMeshes.values())m.visible=!enabled;for(const pool of sparkPools)pool.visible=!enabled&&pool.count>0;}
  function resize(nextQuality=quality){
    quality=nextQuality;const current=graphicsProfile(deviceEnvironment,quality,forceWebGL);
    const ratio=renderPixelRatio(current,devicePixelRatio,innerWidth,innerHeight);
    renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.shadowMap.enabled=current.shadows;
  }
  resize();
  const stereo = new T.StereoCamera(); stereo.aspect = .5; stereo.eyeSep = .064;
  function renderStereo() {
    if (lost) return;
    camera.updateMatrixWorld(true); moon.update(camera); stereo.update(camera);lightBlade();
    renderer.setScissorTest(true);
    renderer.setViewport(0,0,innerWidth/2,innerHeight); renderer.setScissor(0,0,innerWidth/2,innerHeight); renderer.render(scene,stereo.cameraL);
    renderer.setViewport(innerWidth/2,0,innerWidth/2,innerHeight); renderer.setScissor(innerWidth/2,0,innerWidth/2,innerHeight); renderer.render(scene,stereo.cameraR);
    renderer.setScissorTest(false); renderer.setViewport(0,0,innerWidth,innerHeight);
  }
  async function recover({quality:nextQuality=quality}={}) {
    if (recovery) return recovery;
    recovery = (async () => {
      const nextCanvas = renderer.domElement.cloneNode(false);
      nextCanvas.removeAttribute('data-controls-bound');released=true;
      canvas.removeEventListener('webglcontextlost',contextLost);renderer.setAnimationLoop(null);worldShadows.dispose();arenaOcclusion.dispose();
      renderer.dispose();renderer.forceContextLoss?.();
      // Fresh resources avoid reusing texture state from a destroyed GPU device.
      const next = await createScene(nextCanvas, nextQuality, true,character.id);
      next.setCampaignActive(campaignActive);
      next.setRangeActive(rangeActive);
      next.camera.position.copy(camera.position); next.camera.rotation.copy(camera.rotation); next.camera.fov = camera.fov; next.camera.updateProjectionMatrix();
      next.soldier.root.position.copy(soldier.root.position); next.soldier.root.rotation.copy(soldier.root.rotation); next.soldier.root.scale.copy(soldier.root.scale);
      await next.warm();
      renderer.domElement.replaceWith(nextCanvas);
      return next;
    })();
    try { return await recovery; } finally { recovery = null; }
  }
  const campaignArt=createCampaignArt(T,scene,obstacles,{quality:profile.artQuality,photographic:true});
  const arenaObstacles=[...obstacles];
  const arenaOcclusion=createGroundOcclusion(T,arenaRoot,arenaObstacles,{compact:profile.artQuality==='low'});
  const rangeArt=createShootingRangeArt(T,scene,{low:profile.artQuality==='low'||profile.phone||profile.headset});
  const rangeObstacles=[...rangeArt.obstacles];
  let campaignActive=false,rangeActive=false;
  function setCampaignActive(enabled){
    campaignActive=!!enabled;
    if(campaignSky!==campaignActive){campaignSky=campaignActive;const c=skyTexture.image;paintSky(c.getContext('2d'),c.width,c.height);skyTexture.needsUpdate=true;}
    obstacles.splice(0,obstacles.length,...(campaignActive?campaignArt.obstacles:arenaObstacles));
    arenaRoot.visible=!campaignActive&&!rangeActive;
    scene.fog.color.setHex(campaignActive?0x747b79:character.world.fog);
    renderer.toneMappingExposure=rangeActive?.93:campaignActive?.84:1.08;
    hemisphere.intensity=rangeActive?0:campaignActive?.62:1.32;sun.intensity=rangeActive?0:campaignActive?1.36:2.25;rim.intensity=rangeActive?0:campaignActive?.18:1.08;
    sun.shadow.camera.far=campaignActive?235:135;sun.shadow.camera.updateProjectionMatrix();
    sky.material.map=campaignActive&&morningReady?morningSky:skyTexture;sky.material.needsUpdate=true;
    moon.group.visible=!campaignActive;
    scene.fog.density=campaignActive?.0058:.008;
    hemisphere.color.setHex(campaignActive?0xc4ceca:0xa9c9e5);hemisphere.groundColor.setHex(campaignActive?0x414833:0x344058);
    sun.color.setHex(campaignActive?0xffdeb7:0xb5d7ff);rim.color.setHex(campaignActive?0xa6bbb7:0x9abfff);
    campaignArt.setVisible(campaignActive&&!rangeActive);if(!campaignActive&&!rangeActive)city.enablePbr();
    if(!rangeActive){portal.visible=true;dust.visible=true;}
  }
  function setRangeActive(enabled){
    rangeActive=!!enabled;
    rangeArt.root.visible=rangeActive;
    rangeArt.shadows.setActive(rangeActive,renderer);sun.castShadow=!rangeActive;
    // The original portal and its particles are NOT children of arenaRoot.
    // Hide both explicitly; otherwise the survival gateway remains on the firing line.
    portal.visible=!rangeActive;
    dust.visible=!rangeActive;
    if(rangeActive)campaignActive=false;
    campaignArt.setVisible(campaignActive&&!rangeActive);
    arenaRoot.visible=!campaignActive&&!rangeActive;
    obstacles.splice(0,obstacles.length,...(rangeActive?rangeObstacles:campaignActive?campaignArt.obstacles:arenaObstacles));
    scene.fog.color.setHex(rangeActive?0x545045:campaignActive?0x847572:character.world.fog);
    scene.fog.density=rangeActive?.0026:campaignActive?.0058:.008;
    if(rangeActive){rangeArt.enableMaterials();sun.color.setHex(0xffe9c9);renderer.toneMappingExposure=.93;hemisphere.intensity=0;sun.intensity=0;rim.intensity=0;moon.group.visible=false;sky.visible=false;}
    else {sky.visible=true;renderer.toneMappingExposure=campaignActive?.84:1.08;hemisphere.intensity=campaignActive?.62:1.32;sun.intensity=campaignActive?1.36:2.25;rim.intensity=campaignActive?.18:1.08;}
  }
  return {T,scene,camera,moon,campaignArt,rangeArt,setRangeActive,setCampaignActive,graphics:{...profile,initialFailure:prepared.initialFailure},warm:async()=>{await campaignArt.ready;await warmRenderer(renderer,scene,camera)},get renderer(){return renderer;},obstacles,get soldier(){return soldier;},get character(){return character;},get palette(){return {...palette};},weapon,fpsGun,monsters,resize,sync,lobby,animatePortal,burst,impact:event=>{combatFX.impact(event);laserFX.impact(event);},impactStats:combatFX.stats,laserShot:laserFX.shot,laserStats:laserFX.stats,cityStats:()=>campaignActive?{...campaignArt.stats(),map:'vesper-secours-07'}:{...city.stats,boundary:city.fence?.stats()},resetDynamic,recover,setWeapon,createGun,renderStereo,setEquipment,outfit,setInspection,createHand,setCharacter,
    holsterGun,setPlayerVisible,
    get lost(){return lost;},get backend(){return renderer.backend?.isWebGPUBackend?'WebGPU':'WebGL';},render:()=>{if(!lost){camera.updateWorldMatrix(true,false);moon.update(camera);lightBlade();renderer.render(scene,camera);}}};
}
