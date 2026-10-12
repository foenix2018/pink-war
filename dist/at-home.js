// Pink War / AT HOME. Mixed reality is intentionally separate from the classic arena.
// The headset's spatial data stays inside this WebXR session; it is never uploaded.
import * as THREE from './vendor/three.module.min.js';
import { characterForId } from './characters.js';
import { playLaserShot, loadRealLaserSample, playLaserImpact, playWeaponAction } from './laser-sound.js';
import { WEAPONS } from './game-logic.js';
import { createMusicBed } from './music.js';

const $ = id => document.getElementById(id);
const status = $('at-home-status');
const button = $('at-home-enter');
const endButton = $('at-home-end');
let characterId = 'ghju';
try { characterId = localStorage.getItem('pink-war-character') || characterId; } catch {}
const hero = characterForId(characterId);
$('at-home-character').textContent = 'Personnage : ' + hero.name + ' · ' + hero.universeName;
document.documentElement.style.setProperty('--pink', hero.accent);

const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .02, 30);
scene.add(new THREE.HemisphereLight(0xd7e8ff, 0x352641, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(1, 3, 2);
scene.add(key);
const renderer = new THREE.WebGLRenderer({
  canvas: $('at-home-world'), alpha: true, antialias: true,
  powerPreference: 'high-performance'
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation?.(.5);

const tint = new THREE.Color(hero.palette.rose);
const violet = new THREE.Color(hero.palette.violet);
const raycaster = new THREE.Raycaster();
const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const direction = new THREE.Vector3(), head = new THREE.Vector3();
const orientation = new THREE.Quaternion();
let session = null, audio = null, mode = 'idle', startTime = 0, roomCaptureAsked = false;
let hp = 100, score = 0, wave = 1, shotCooldown = 0, enemyCooldown = 0, lastTime = 0;
let assets=null, assetsLoading=null, weaponIndex=0, ammo=WEAPONS[0].capacity, reloadUntil=0, triggerStarted=0, triggerHeld=false;
let lastLeftX=false,lastLeftY=false,lastRightA=false, decorEnabled=true, muzzleUntil=0;
const music=createMusicBed();
let scanMessage = 'EN ATTENTE DU SCAN', bWasDown = false;
const surfaces = new Map(), meshes = new Map(), bots = [], tracers = [];
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const mounts = [];
const wireMaterial = new THREE.LineBasicMaterial({ color:tint, transparent:true, opacity:.5, depthWrite:false });
const blockerMaterial = new THREE.MeshBasicMaterial({
  color:0xffffff, colorWrite:false, depthWrite:false, side:THREE.DoubleSide
});

const canvas = document.createElement('canvas');
canvas.width = 768; canvas.height = 272;
const ctx = canvas.getContext('2d');
const texture = new THREE.CanvasTexture(canvas);
const board = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .44),
  new THREE.MeshBasicMaterial({ map:texture, transparent:true, depthTest:false, depthWrite:false }));
board.renderOrder = 100;
board.visible = false;
scene.add(board);
let lastBoardText = '';
function info(line) { scanMessage = line; status.textContent = line; lastBoardText = ''; }
function drawBoard() {
  if (!session) return;
  const count = [...surfaces.values()].filter(s => s.isFloor).length;
  const top = mode === 'combat' ? 'COMBAT   /   ' + hero.name : 'AT HOME   /   ' + hero.name;
  const middle = mode === 'combat'
    ? 'V'+wave+'  SCORE '+score+'  VIE '+hp+'  '+WEAPONS[weaponIndex].name+' '+ammo+'/'+WEAPONS[weaponIndex].capacity
    : scanMessage;
  const bottom = mode === 'combat' ? 'TIR DROIT  |  A RECHARGE  |  Y ARME  |  B SORTIR'
    : count ? 'GACHETTE DROITE : COMMENCER' : 'GACHETTE GAUCHE : SCAN  |  B : SORTIR';
  const next = top + '\n' + middle + '\n' + bottom;
  if (next === lastBoardText) return;
  lastBoardText = next;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(16,12,25,.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#' + tint.getHexString();
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#' + tint.getHexString();
  ctx.font = 'bold 43px monospace';
  ctx.fillText(top, 28, 71);
  ctx.fillStyle = '#fff2fb';
  ctx.font = 'bold 31px monospace';
  ctx.fillText(middle.slice(0, 44), 28, 142);
  ctx.fillStyle = '#d1bac9';
  ctx.font = '25px monospace';
  ctx.fillText(bottom, 28, 214);
  texture.needsUpdate = true;
}
function updateBoard() {
  if (!session) return;
  const xrCamera = renderer.xr.getCamera(camera);
  xrCamera.getWorldPosition(head);
  xrCamera.getWorldQuaternion(orientation);
  direction.set(0, 0, -1).applyQuaternion(orientation);
  board.position.copy(head).addScaledVector(direction, 1.35);
  board.position.y -= .48;
  board.quaternion.copy(orientation);
  board.visible = true;
  drawBoard();
}
function poseObject(object, pose) {
  object.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
  const q = pose.transform.orientation;
  object.quaternion.set(q.x, q.y, q.z, q.w);
  object.updateMatrixWorld(true);
}
function planeGeometry(polygon) {
  if (!polygon || polygon.length < 3) return null;
  const vertices = [], indices = [];
  for (const p of polygon) vertices.push(p.x, p.y, p.z);
  for (let i = 2; i < polygon.length; i++) indices.push(0, i - 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function discardSurface(record) {
  assets?.disposeDecor(record);
  scene.remove(record.collider);
  scene.remove(record.outline);
  record.collider.geometry.dispose();
  record.outline.geometry.dispose();
}
function createOutline(polygon) {
  const g = new THREE.BufferGeometry().setFromPoints(polygon.map(p => new THREE.Vector3(p.x, p.y, p.z)));
  return new THREE.LineLoop(g, wireMaterial);
}
function updateSurfaces(frame) {
  const ref = renderer.xr.getReferenceSpace();
  if (!ref || !frame) return;
  const detected = frame.detectedPlanes || session?.detectedPlanes;
  if (detected) {
    for (const [plane, record] of surfaces) {
      if (!detected.has(plane)) { discardSurface(record); surfaces.delete(plane); }
    }
    let inspected = 0;
    for (const plane of detected) {
      if (++inspected > 65) break;
      const pose = frame.getPose(plane.planeSpace, ref);
      if (!pose || !plane.polygon || plane.polygon.length < 3) continue;
      let record = surfaces.get(plane);
      const updated = !record || record.changed !== plane.lastChangedTime;
      if (updated) {
        const geometry = planeGeometry(plane.polygon);
        if (!geometry) continue;
        if (record) discardSurface(record);
        const collider = new THREE.Mesh(geometry, blockerMaterial);
        const outline = createOutline(plane.polygon);
        poseObject(collider, pose);
        poseObject(outline, pose);
        scene.add(collider, outline);
        record = { collider, outline, changed:plane.lastChangedTime, isFloor:false, polygon:[] };
        surfaces.set(plane, record);
      } else {
        poseObject(record.collider, pose);
        poseObject(record.outline, pose);
      }
      // Surface classification uses real world heights, not a guessed furniture label.
      record.polygon = plane.polygon.map(p => record.collider.localToWorld(new THREE.Vector3(p.x, p.y, p.z)));
      const ys = record.polygon.map(p => p.y);
      const horizontal = Math.max(...ys) - Math.min(...ys) < .18;
      const area = Math.abs(record.polygon.reduce((acc, p, i, all) => {
        const next = all[(i + 1) % all.length]; return acc + p.x * next.z - next.x * p.z;
      }, 0)) * .5;
      const wasFloor=record.isFloor;
      record.isFloor = horizontal && area > .6 && ys[0] < head.y - .6 && ys[0] > head.y - 2.5;
      if (assets && (updated || !record.decor || wasFloor!==record.isFloor))
        assets.projectRuin(record,decorEnabled);
      record.outline.material = wireMaterial;
    }
  }
  const detectedMeshes = frame.detectedMeshes;
  if (detectedMeshes) {
    for (const [mesh, record] of meshes) {
      if (!detectedMeshes.has(mesh)) {
        scene.remove(record.collider); record.collider.geometry.dispose(); meshes.delete(mesh);
      }
    }
    let inspected = 0;
    for (const mesh of detectedMeshes) {
      if (++inspected > 14) break;
      if (!mesh.vertices || !mesh.indices || mesh.vertices.length > 30000 || mesh.indices.length > 45000) continue;
      const pose = frame.getPose(mesh.meshSpace, ref);
      if (!pose) continue;
      let record = meshes.get(mesh);
      if (!record || record.changed !== mesh.lastChangedTime) {
        if (record) { scene.remove(record.collider); record.collider.geometry.dispose(); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(mesh.vertices.slice(), 3));
        g.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
        const collider = new THREE.Mesh(g, blockerMaterial);
        scene.add(collider);
        record = { collider, changed:mesh.lastChangedTime };
        meshes.set(mesh, record);
      }
      poseObject(record.collider, pose);
    }
  }
}
function blockers() {
  return [...surfaces.values()].map(v => v.collider).concat([...meshes.values()].map(v => v.collider));
}
function clearLineOfSight(origin, target) {
  direction.subVectors(target, origin);
  const length = direction.length();
  if (length < .15) return true;
  raycaster.set(origin, direction.multiplyScalar(1 / length));
  raycaster.far = Math.max(.01, length - .2);
  return raycaster.intersectObjects(blockers(), false).length === 0;
}
function pickSpawn() {
  const floors = [...surfaces.values()].filter(v => v.isFloor && v.polygon.length >= 3);
  if (!floors.length) return null;
  for (let k = 0; k < 100; k++) {
    const floor = floors[Math.floor(Math.random() * floors.length)];
    const points = floor.polygon;
    const triangle = 1 + Math.floor(Math.random() * (points.length - 2));
    let a = Math.random(), b = Math.random();
    if (a + b > 1) { a = 1-a; b = 1-b; }
    const p = points[0].clone()
      .addScaledVector(v0.subVectors(points[triangle],points[0]), a)
      .addScaledVector(v1.subVectors(points[triangle+1],points[0]), b);
    const distance = Math.hypot(p.x-head.x, p.z-head.z);
    if (distance < 1.6 || distance > 4.2) continue;
    const aimPoint = p.clone(); aimPoint.y += .9;
    if (!clearLineOfSight(head, aimPoint)) continue;
    if (bots.some(bot => bot.group.position.distanceTo(p) < .9)) continue;
    return p;
  }
  return null;
}
function createBot(position) {
  if (!assets) return null;
  // The exact AI machines from the main game's enemy factory.
  const forms=['stalker','scuttler','seer','brute','probe'];
  const form=forms[Math.min(forms.length-1,Math.floor((wave-1)/2))];
  const elite=wave>=6 && Math.random()<.25, ranged=form==='seer'||form==='probe';
  const group=assets.makeEnemy(form,elite,ranged);
  group.position.copy(position);
  if (form==='probe') group.position.y+=.65;
  group.rotation.y=Math.atan2(head.x-position.x,head.z-position.z)+Math.PI;
  const hitbox=new THREE.Mesh(new THREE.SphereGeometry(form==='probe'?.55:form==='brute'?.57:.39,10,8),
    new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide}));
  hitbox.position.y=form==='probe'?.65:form==='scuttler'?.66:1.05;
  group.add(hitbox);scene.add(group);
  const now=performance.now()/1000;
  const bot={group,hitbox,life:form==='brute'?120:form==='probe'?55:65,
    form,attackAt:now+4,born:now};
  hitbox.userData.bot=bot;
  bots.push(bot);
  return bot;
}
function removeBot(bot) {
  if(!bot || !bots.includes(bot))return;
  scene.remove(bot.group);
  bot.hitbox.removeFromParent();bot.hitbox.geometry.dispose();bot.hitbox.material.dispose();
  bots.splice(bots.indexOf(bot),1);
}
function clearBots() { while (bots.length) removeBot(bots[0]); }
function beam(from,to,color) {
  const g = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));
  scene.add(l); tracers.push({object:l,until:performance.now()/1000+.17});
}
function haptic(input) {
  try { const pad = input?.gamepad; const actuator = pad?.hapticActuators?.[0] || pad?.vibrationActuator; actuator?.pulse?.(.55,55); } catch {}
}
function selectWeapon(index) {
  if (!assets) return;
  const available=WEAPONS.map((w,i)=>w.level<=wave?i:-1).filter(i=>i>=0);
  if(!available.includes(index))index=available[0]||0;
  weaponIndex=index;ammo=WEAPONS[index].capacity;reloadUntil=0;triggerStarted=0;
  assets.setWeapon(index,Math.min(wave,10));
  info('ARME : '+WEAPONS[index].name);
}
function nextWeapon() {
  const unlocked=WEAPONS.map((w,i)=>w.level<=wave?i:-1).filter(i=>i>=0);
  selectWeapon(unlocked[(unlocked.indexOf(weaponIndex)+1)%unlocked.length]);
}
function beginReload(now=performance.now()/1000) {
  if(mode!=='combat'||!assets||reloadUntil>now||ammo===WEAPONS[weaponIndex].capacity)return;
  reloadUntil=now+WEAPONS[weaponIndex].reload;
  try{playWeaponAction(audio,'reload',WEAPONS[weaponIndex].id);}catch{}
  info('RECHARGE : '+WEAPONS[weaponIndex].name);
}
function shoot(source,frame,charge=1) {
  const now=performance.now()/1000, weapon=WEAPONS[weaponIndex];
  if (mode!=='combat'||!assets||now-shotCooldown<weapon.interval||now<reloadUntil) return;
  if(ammo<=0){beginReload(now);return;}
  const pose=source&&frame?.getPose(source.targetRaySpace,renderer.xr.getReferenceSpace());
  if(!pose)return;
  shotCooldown=now;ammo--;
  const o=pose.transform.position,q=pose.transform.orientation;
  const origin=new THREE.Vector3(o.x,o.y,o.z);
  direction.set(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w)).normalize();
  raycaster.set(origin,direction);raycaster.near=0;raycaster.far=12;
  const hit=raycaster.intersectObjects(bots.map(bot=>bot.hitbox).concat(blockers()),false)[0];
  const target=hit?hit.point:origin.clone().addScaledVector(direction,Math.min(12,8+wave));
  beam(origin,target,tint);
  muzzleUntil=now+.075;
  if(hit?.object?.userData.bot){
    const bot=hit.object.userData.bot;
    bot.life-=weapon.damage*(weapon.chargeTime?Math.min(1,charge):1);
    if(bot.life<=0){removeBot(bot);score+=100;if(score>0&&score%500===0)wave++;}
    try{playLaserImpact(audio,weapon.id);}catch{}
  }
  try{if(audio?.state==='suspended')audio.resume().catch(()=>{});playLaserShot(audio,weapon.id,Math.min(1,charge));}catch{}
  haptic(source);
  if(ammo===0 && !weapon.chargeTime)beginReload(now);
}
function startCombat() {
  if (![...surfaces.values()].some(record => record.isFloor)) {
    info('SOL NON DETECTE : LANCER LE SCAN');
    return;
  }
  const point = pickSpawn();
  if (!point) { info('ZONE DE SOL TROP ETROITE OU MASQUEE'); return; }
  if(!assets){info('CHARGEMENT DES PERSONNAGES ET ARMES');return;}
  hp=100;score=0;wave=1;enemyCooldown=0;triggerHeld=false;
  clearBots();selectWeapon(0);createBot(point);
  const companionPoint=pickSpawn();
  if(companionPoint)assets.placeCompanion(companionPoint,head);
  else assets.companion.root.visible=false;
  assets.placePortal(point,head);
  music.start(audio);
  mode='combat'; info('COMBAT LANCE');
}
function updateCombat(seconds) {
  if (mode !== 'combat') return;
  for (const bot of [...bots]) {
    const p=bot.group.position;
    // Preserve the original skinned enemy locomotion instead of animating primitives.
    bot.group.userData.animate?.(seconds,seconds*.4,false,{
      limpUntil:0,chargeProgress:0,lastShotAt:-99
    },seconds);
    bot.group.rotation.y=Math.atan2(head.x-p.x,head.z-p.z)+Math.PI;
    if (seconds >= bot.attackAt) {
      bot.attackAt=seconds+Math.max(2.5,5-wave*.15);
      const origin=p.clone().add(new THREE.Vector3(0,bot.form==='probe'?.95:1.15,0));
      if(clearLineOfSight(origin,head)){
        hp=Math.max(0,hp-5);beam(origin,head,0xff6378);
        if(!hp){mode='finished';music.pause();info('FIN DE PARTIE : GACHETTE POUR REJOUER');}
      }
    }
  }
  if(bots.length<Math.min(wave+1,3) && seconds>enemyCooldown){
    const point=pickSpawn();
    if(point){createBot(point);enemyCooldown=seconds+3.5;}
  }
  if(reloadUntil && seconds>=reloadUntil){reloadUntil=0;ammo=WEAPONS[weaponIndex].capacity;}
  assets?.animate(seconds,Math.min(.07,seconds-lastTime),wave,{
    ammo,capacity:WEAPONS[weaponIndex].capacity,
    reloading:reloadUntil>0,reloadProgress:reloadUntil?Math.max(0,1-(reloadUntil-seconds)/WEAPONS[weaponIndex].reload):0,
    time:seconds,trigger:triggerHeld?1:0,flash:seconds<muzzleUntil
  });
}
async function initiateScan() {
  if (!session || roomCaptureAsked) return;
  roomCaptureAsked=true;
  if (typeof session.initiateRoomCapture !== 'function') {
    info('SCAN INDISPONIBLE : CONFIGURER L ESPACE QUEST');
    return;
  }
  info('AUTORISER LE SCAN DANS LE CASQUE');
  try {
    await session.initiateRoomCapture();
    info('SCAN TERMINE : RECHERCHE DU SOL');
  } catch (error) {
    info('SCAN REFUSE OU ANNULE : VERIFIER SPACE SETUP');
    console.warn('Pink War AT HOME room capture', error);
  }
}
function onSelect(event) {
  if(!session || session.visibilityState!=='visible')return;
  const hand=event.inputSource?.handedness;
  if(hand==='left'){if(mode!=='combat')initiateScan();return;}
  if(hand!=='right')return;
  if(mode==='ready'||mode==='finished'){startCombat();return;}
  if(mode!=='combat')return;
  triggerHeld=true;triggerStarted=performance.now()/1000;
  if(!WEAPONS[weaponIndex].chargeTime)shoot(event.inputSource,event.frame);
}
function onSelectEnd(event) {
  if(event.inputSource?.handedness!=='right')return;
  if(mode==='combat'&&WEAPONS[weaponIndex].chargeTime&&triggerStarted){
    const charged=(performance.now()/1000-triggerStarted)/WEAPONS[weaponIndex].chargeTime;
    if(charged>=.18)shoot(event.inputSource,event.frame,charged);
  }
  triggerHeld=false;triggerStarted=0;
}
function onSessionEnd() {
  session = null; mode='idle';roomCaptureAsked=false;bWasDown=false;triggerHeld=false;music.pause();assets?.hideDecor();lastLeftX=false;lastLeftY=false;lastRightA=false;
  document.body.classList.remove('in-xr');
  endButton.hidden=true;
  clearBots();
  for (const record of surfaces.values()) discardSurface(record);
  surfaces.clear();
  for (const record of meshes.values()) { scene.remove(record.collider); record.collider.geometry.dispose(); }
  meshes.clear();
  for (const item of tracers) { scene.remove(item.object);item.object.geometry.dispose();item.object.material.dispose(); }
  tracers.length=0;
  board.visible=false;
  for(const mount of mounts){mount.gun?.removeFromParent();mount.free?.removeFromParent();}
  info('SESSION TERMINEE. RELANCER AT HOME POUR REJOUER.');
  button.disabled=false;
}
for(let i=0;i<controllers.length;i++){
  const ray=controllers[i],mount=new THREE.Group();
  mount.position.set(0,-.016,.05);
  ray.add(mount);scene.add(ray);
  const entry={ray,mount,source:null};
  ray.addEventListener('connected',event=>{entry.source=event.data;updateControllerRoles();});
  ray.addEventListener('disconnected',()=>{entry.source=null;updateControllerRoles();});
  mounts.push(entry);
}
function updateControllerRoles(){
  if(!assets)return;
  for(const entry of mounts){
    entry.mount.remove(assets.gun,assets.freeHand);
    if(entry.source?.handedness==='right'){
      entry.mount.add(assets.gun);assets.gun.visible=!!session;
    }else if(entry.source?.handedness==='left'){
      entry.mount.add(assets.freeHand);assets.freeHand.visible=!!session;
      assets.freeHand.scale.x=-Math.abs(assets.freeHand.scale.x);
    }
  }
}
function tick(ms, frame) {
  const seconds=ms/1000,dt=Math.min(.075,Math.max(0,seconds-lastTime));
  lastTime=seconds;
  if(session){
    const inputs=Array.from(session.inputSources || []);
    const right=inputs.find(input=>input.handedness==='right');
    const left=inputs.find(input=>input.handedness==='left');
    const padR=right?.gamepad,padL=left?.gamepad;
    const b=!!padR?.buttons?.[5]?.pressed;
    if(b&&!bWasDown)session.end().catch(()=>{});
    bWasDown=b;
    const a=!!padR?.buttons?.[4]?.pressed;
    if(a&&!lastRightA)beginReload(seconds);
    lastRightA=a;
    const y=!!padL?.buttons?.[5]?.pressed;
    if(y&&!lastLeftY&&mode==='combat')nextWeapon();
    lastLeftY=y;
    const x=!!padL?.buttons?.[4]?.pressed;
    if(x&&!lastLeftX){
      decorEnabled=!decorEnabled;
      for(const record of surfaces.values())assets?.projectRuin(record,decorEnabled);
      info(decorEnabled?'DECORS PINK WAR ACTIVES':'DECORS MASQUES : PASSTHROUGH');
    }
    lastLeftX=x;
    if(frame){
      updateBoard();updateSurfaces(frame);
      const held=!!padR?.buttons?.[0]?.pressed;
      if(mode==='combat'&&held&&right&&!WEAPONS[weaponIndex].chargeTime){
        shoot(right,frame);
      }
      // Fully charged energy weapons discharge automatically just like the classic game.
      if(mode==='combat'&&held&&right&&WEAPONS[weaponIndex].chargeTime&&triggerStarted
          &&seconds-triggerStarted>=WEAPONS[weaponIndex].chargeTime){
        shoot(right,frame,1);
        triggerStarted=seconds;
      }
    }
    const count=[...surfaces.values()].filter(v=>v.isFloor).length;
    if(mode==='ready'){
      if(!assets)info('CHARGEMENT DES MODELES PINK WAR');
      else if(count){
        if(scanMessage!=='SOL REPERE : PRET A JOUER')info('SOL REPERE : PRET A JOUER');
      }else if(seconds-startTime>3&&scanMessage==='DETECTION DES SURFACES')
        info('AUCUN SOL : SCANNER AVEC GACHETTE GAUCHE');
    }
    updateCombat(seconds);
    if(assets&&mode!=='combat')assets.animate(seconds,dt,wave,{time:seconds});
    for(let i=tracers.length-1;i>=0;i--)if(seconds>=tracers[i].until){
      const item=tracers.splice(i,1)[0];
      scene.remove(item.object);item.object.geometry.dispose();item.object.material.dispose();
    }
    drawBoard();
  }
  renderer.render(scene,camera);
}

renderer.setAnimationLoop(tick);
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);
});

async function enter() {
  if (!navigator.xr || session) return;
  // This call must happen immediately inside the click gesture.
  let request;
  try {
    request = navigator.xr.requestSession('immersive-ar', {
      requiredFeatures:['local-floor'],
      optionalFeatures:['bounded-floor','plane-detection','mesh-detection']
    });
  } catch (error) { info('IMPOSSIBLE DE DEMARRER LE MODE AR : ' + error.message); return; }
  button.disabled=true;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(()=>{});
    loadRealLaserSample(audio).catch(()=>{});
  } catch {}
  let xrSession;
  try {
    xrSession=await request;
    xrSession.addEventListener('end',onSessionEnd,{once:true});
    xrSession.addEventListener('selectstart',onSelect);
    xrSession.addEventListener('selectend',onSelectEnd);
    xrSession.addEventListener('visibilitychange',()=>{
      if (xrSession.visibilityState!=='visible' && mode==='combat') {
        mode='ready'; clearBots(); info('PAUSE : VERIFIER VOTRE ENVIRONNEMENT');
      }
    });
    xrSession.addEventListener('inputsourceschange',()=>{});
    session=xrSession;
    roomCaptureAsked=false;mode='ready';
    await renderer.xr.setSession(xrSession);
    startTime=performance.now()/1000;
    info('DETECTION DES SURFACES');
    document.body.classList.add('in-xr');
    endButton.hidden=false;
    if(!assets){
      assetsLoading ||= import('./at-home-assets.js')
        .then(module=>module.createAtHomeAssets(scene,hero))
        .then(pack=>{
          assets=pack;assetsLoading=null;updateControllerRoles();
          for(const record of surfaces.values())assets.projectRuin(record,decorEnabled);
          info('MODELES PINK WAR CHARGES. CHERCHEZ LE SOL.');
        }).catch(err=>{
          assetsLoading=null;console.error('AT HOME asset load failed',err);
          info('MODELES PINK WAR INDISPONIBLES : '+(err?.message||'chargement impossible'));
        });
    }else updateControllerRoles();
  } catch (error) {
    if (xrSession) await xrSession.end().catch(()=>{});
    if (session===xrSession) onSessionEnd();
    info('ECHEC D ACCES A LA REALITE MIXTE : ' + (error.message||'permission refusee'));
    button.disabled=false;
  }
}
button.addEventListener('click',enter);
endButton.addEventListener('click',()=>session?.end().catch(()=>{}));
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&session)session.end().catch(()=>{});});
async function checkSupport(){
  if (!navigator.xr || !window.isSecureContext) {
    info('AT HOME NECESSITE LE NAVIGATEUR META QUEST ET HTTPS.');
    return;
  }
  try {
    const ok=await navigator.xr.isSessionSupported('immersive-ar');
    if (!ok) { info('CE NAVIGATEUR NE PREND PAS EN CHARGE LE PASSTHROUGH WEBXR.');return; }
    info('QUEST COMPATIBLE. PREPARER SPACE SETUP AVANT DE LANCER.');
    button.disabled=false;
  } catch { info('IMPOSSIBLE DE VERIFIER LE SUPPORT WEBXR.'); }
}
checkSupport();
