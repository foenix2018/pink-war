import {createWorldShadows} from './world-shadows.js';
// Pink War AT HOME: the scanned house becomes an abandoned AI laboratory.
// Spatial data stays inside the session; walking uses native headset tracking.
import * as THREE from './vendor/three.module.min.js';
import { characterForId } from './characters.js';
import { GAME_VERSION } from './launch-ui.js';
import { WEAPONS } from './game-logic.js';
import { RoomGame } from './room-game.js';
import { classifyRoomSurface, insideRoomPolygon, roomBounds, roomFloorAt, createRoomNavigation } from './room-layout.js';
import { playLaserShot, playEnemyShot, loadRealLaserSample, loadCombatSamples, playLaserImpact, playWeaponAction } from './laser-sound.js';
import { createSaberSound } from './saber-sound.js';
import { syncTrackedHands } from './xr-hands.js';
import { createAmbience } from './ambience.js';
import { createWeaponFeel, recoilPose } from './weapon-feel.js';
import { createLaserFX } from './laser-fx.js';
import { createMagnifiedSight } from './magnified-sight.js';
import { createHomeBattlefield } from './home-battlefield.js';
import { hapticPlan, buzz } from './haptics.js';
import { createBoundaryFence } from './boundary-fence.js';
import {createPauseMenu} from './fracture-menu.js';
import {createXRPauseMenu} from './xr-pause-menu.js';

const $=id=>document.getElementById(id),status=$('at-home-status'),button=$('at-home-enter');
let characterId='ghju';try{characterId=localStorage.getItem('pink-war-character')||characterId;}catch{}
const hero=characterForId(characterId);document.documentElement.style.setProperty('--pink',hero.accent);
document.documentElement.dataset.universe=hero.id==='lylu'?'blue':'pink';document.body.style.setProperty('--home-art',"url('./art/accueil"+(hero.id==='lylu'?'-lylu':'')+".webp')");
$('at-home-character').textContent=hero.name+' · Laboratoire de l’IA · Après la chute';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.025,650);
scene.background=null;scene.add(camera,new THREE.HemisphereLight(0xc3d8ed,0x263239,1.8));
const key=new THREE.DirectionalLight(0xdee9f0,2.1);key.position.set(2,5,3);scene.add(key);
const renderer=new THREE.WebGLRenderer({canvas:$('at-home-world'),alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const worldShadows=createWorldShadows(THREE,{scene,renderer,light:key,profile:{headset:true},direction:{x:-12,y:28,z:15}});
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFoveation?.(.65);
const raycaster=new THREE.Raycaster(),head=new THREE.Vector3(),direction=new THREE.Vector3(),orientation=new THREE.Quaternion(),tmp=new THREE.Vector3();
let boundedSpace=null,zoneRecord=null,playPolygon=[],playAreaSource='',startRequested=false;
const homeFenceMaterial=new THREE.MeshBasicMaterial({color:hero.palette.rose,transparent:true,opacity:.32,depthWrite:false,toneMapped:false});
const boundary=createBoundaryFence(THREE,scene,{material:homeFenceMaterial});
let session=null,mode='idle',assets=null,assetsLoading=null,assetError='',audio=null,ambience=null,saberAudio=null,scope=null;
let lastTime=0,startTime=0,roomCaptureAsked=false,decorEnabled=true,fullImmersion=true,roomDirty=true,navigation=null,navigationFloorY=null,lastRoomBuild=-99;
let frames=0,fireBlocked=true,lastTrigger=false,scanMessage='',announcementUntil=0,muzzleUntil=0,refreshScan=false;
const surfaces=new Map(),meshes=new Map(),bots=new Map(),bolts=new Map();
const mounts=[],controllerHandState={trigger:0,grip:0,offTrigger:0,offGrip:0},previousButtons=new Map();
const feel=createWeaponFeel(),laser=createLaserFX(THREE,scene,hero.palette);
const blockerMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
blockerMaterial.visible=false; // Keep ray collisions without drawing an invisible occlusion screen.
const outlineMat=new THREE.LineBasicMaterial({color:hero.palette.rose,transparent:true,opacity:.38,depthWrite:false});
const bladeLight=new THREE.PointLight(hero.palette.rose,0,3.2,2);scene.add(bladeLight);
const hostileGeo=new THREE.CylinderGeometry(.012,.012,1,6),hostileMat=new THREE.MeshBasicMaterial({color:0xff657f,toneMapped:false});
const opticalEye=new THREE.PerspectiveCamera();opticalEye.matrixAutoUpdate=false;
function info(text){scanMessage=text;status.textContent=text;}
function detectedRecords(){return [...surfaces.values(),...meshes.values()];}
function surfaceRecords(){return zoneRecord?[...detectedRecords(),zoneRecord]:detectedRecords();}
function floors(){const real=detectedRecords().filter(r=>r.isFloor&&r.polygon?.length>=3);return real.length?real:zoneRecord?[zoneRecord]:[];}
function blockers(){const supported=new Set(floors());return surfaceRecords().filter(r=>supported.has(r)||r.isCover).map(r=>r.collider);}
function traceRoom(a,b,objects=blockers()){
 const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(length<.001)return null;
 raycaster.set(tmp.set(a.x,a.y,a.z),direction.set(b.x-a.x,b.y-a.y,b.z-a.z).divideScalar(length));raycaster.near=.012;raycaster.far=length;
 const hit=raycaster.intersectObjects(objects,false)[0];if(!hit)return null;
 const normal=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new THREE.Vector3(0,1,0);
 return {t:hit.distance/length,point:{x:hit.point.x,y:hit.point.y,z:hit.point.z},normal:{x:normal.x,y:normal.y,z:normal.z},surface:'metal'};
}
function clearLineOfSight(a,b){return !traceRoom(a,b);}
function canStandOnField(p,radius=.33){
 const nonFloor=detectedRecords().filter(r=>r.isCover).map(r=>r.collider),y=p.y;
 for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
  const q={x:p.x+dx,z:p.z+dz,y:y+.08};
  if(traceRoom(q,{...q,y:y+1.95},nonFloor))return false;
  if((dx||dz)&&traceRoom({x:p.x,y:y+.75,z:p.z},{...q,y:y+.75},nonFloor))return false;
 }return true;
}
function canStand(p,radius=.33){
 const all=floors(),y=roomFloorAt(p,all);if(y===null||!canStandOnField({...p,y},radius))return false;
 for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
  const q={x:p.x+dx,z:p.z+dz,y:y+.08};if(roomFloorAt(q,all)===null)return false;
  if(!traceRoom({...q,y:y+.35},{...q,y:y-.12},all.map(f=>f.collider)))return false;
 }return true;
}

function findPoint({purpose,head:viewer=head,avoid=[],portal=null}={}){
 const all=floors();if(!all.length)return null;const bounds=purpose==='weapon'&&playPolygon.length>=3?roomBounds([{polygon:playPolygon}]):roomBounds(all);if(!bounds)return null;
 const min=purpose==='weapon'?.65:1.6,max=purpose==='weapon'?1.6:16;
 for(let i=0;i<140;i++){
  const point=portal?{x:portal.x+(Math.random()-.5)*1.2,z:portal.z+(Math.random()-.5)*1.2,y:portal.elevation}:
   {x:bounds.minX+Math.random()*(bounds.maxX-bounds.minX),z:bounds.minZ+Math.random()*(bounds.maxZ-bounds.minZ),y:roomFloorAt({...viewer,y:viewer.y-.65},all)??bounds.floorY};
  const y=roomFloorAt(point,all);if(y===null)continue;point.y=y;
  const d=Math.hypot(point.x-viewer.x,point.z-viewer.z);if(d<min||d>max||!canStand(point,purpose==='weapon'?.23:.4))continue;
  if(purpose==='weapon'&&playPolygon.length>=3&&!insideRoomPolygon(point,playPolygon))continue;
  if(avoid.some(other=>Math.hypot(other.x-point.x,other.z-point.z)<(purpose==='portal'?1.5:.85)))continue;
  if(purpose==='weapon'&&!clearLineOfSight(viewer,{...point,y:y+1}))continue;
  if(navigation&&!navigation.reachable(point,viewer))continue;return point;
 }return null;
}
const scannedRoom={hasFloor:()=>floors().length>0,floorAt:p=>roomFloorAt({...p,y:p.y-.65},floors()),freeArea:()=>navigation?.freeArea()||8,
 ceilingAt:p=>Math.min(p.y+2.6,...surfaceRecords().filter(r=>r.kind==='ceiling'&&r.polygon[0].y>p.y+.4&&insideRoomPolygon(p,r.polygon)).map(r=>r.polygon.reduce((sum,v)=>sum+v.y,0)/r.polygon.length)),
 findPoint,canStand,canStandOnField,trace:traceRoom,waypoint:(from,target)=>navigation?.waypoint(from,target)};
const room=createHomeBattlefield({room:scannedRoom,obstacles:()=>assets?.architecture.obstacles||[],forward:()=>new THREE.Vector3(0,0,-1).applyQuaternion(orientation)});
const game=new RoomGame(room,Math.random,hero.id);
let beforePause='ready';
function pauseHome(){if(mode==='paused')return;beforePause=mode;mode='paused';game.stop();cancelFire();ambience?.pause();if(!session)pauseMenu.show();}
function resumeHome(){if(mode!=='paused')return;mode=beforePause;if(mode==='combat'){game.running=true;}cancelFire();pauseMenu.hide(false);}
async function home(){await session?.end();location.assign('./index.html');}
const pauseMenu=createPauseMenu({title:'AT HOME / LABORATOIRE DE L’IA',onPause:pauseHome,onResume:resumeHome,onHome:home,onVR:report=>{if(!navigator.xr){report('Ouvrez AT HOME dans Meta Quest Browser pour utiliser le scan de la maison.');return;}return enter().then(()=>{if(session)pauseMenu.hide(false);else report(status.textContent);});}});
const immersivePause=createXRPauseMenu(THREE,scene,{accent:hero.accent,onResume:resumeHome,onHome:()=>void home(),onExit:()=>void session?.end()});
function makeBoard(width,height,size){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const texture=new THREE.CanvasTexture(canvas),plane=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
 plane.renderOrder=100;plane.frustumCulled=false;plane.visible=false;scene.add(plane);return {canvas,texture,plane,key:''};
}
const hud=makeBoard(512,112,[.42,.092]),board=makeBoard(768,240,[1.10,.34]),announcement=makeBoard(768,128,[.73,.12]);
function announce(text){announcementUntil=game.time+4;const c=announcement.canvas.getContext('2d');c.clearRect(0,0,768,128);c.fillStyle='#15212bdd';c.fillRect(0,0,768,128);c.fillStyle=hero.accent;c.font='bold 34px monospace';c.textAlign='center';c.fillText(text,384,77);announcement.texture.needsUpdate=true;}
function placeBoard(item,offset,distance){item.plane.position.copy(head).addScaledVector(direction.set(0,0,-1).applyQuaternion(orientation),distance);item.plane.position.y+=offset;item.plane.quaternion.copy(orientation);}
function updateBoards(){
 hud.plane.visible=mode==='combat';board.plane.visible=!!session&&mode!=='combat'&&mode!=='paused';announcement.plane.visible=mode==='combat'&&game.time<announcementUntil;
 placeBoard(hud,-.27,1.05);placeBoard(board,-.42,1.4);placeBoard(announcement,.22,1.4);
 const ammo=game.ammo[game.weaponIndex],key=Math.ceil(game.player.hp)+'|'+ammo+'|'+game.weapon.melee+'|'+Math.ceil(game.reloadRemaining*4);
 if(key!==hud.key){hud.key=key;const c=hud.canvas.getContext('2d');c.clearRect(0,0,512,112);c.fillStyle='#111a28dd';c.fillRect(0,0,244,112);c.fillRect(264,0,248,112);c.fillStyle='#bfcddd';c.font='bold 17px sans-serif';c.fillText('SANTÉ',20,26);c.fillText(game.weapon.melee?'ÉNERGIE':'BALLES',284,26);c.fillStyle=game.player.hp<30?'#ff637f':'white';c.font='bold 50px sans-serif';c.fillText(String(Math.ceil(game.player.hp)),18,83);c.fillStyle='white';c.fillText(game.weapon.melee?'∞':String(ammo),282,83);c.fillStyle=hero.accent;c.fillRect(20,98,Math.max(0,204*game.player.hp/100),4);hud.texture.needsUpdate=true;}
 const text=mode==='finished'?(game.state==='won'?'LABORATOIRE SÉCURISÉ':'SIGNAL PERDU'):'LABORATOIRE DE L’IA';
 const boardKey=text+scanMessage;if(boardKey!==board.key){board.key=boardKey;const c=board.canvas.getContext('2d');c.clearRect(0,0,768,240);c.fillStyle='#111c29e8';c.fillRect(0,0,768,240);c.fillStyle=hero.accent;c.font='bold 34px monospace';c.fillText(text,24,62);c.fillStyle='white';c.font='25px monospace';c.fillText(scanMessage.slice(0,49),24,126);c.fillStyle='#aebdc9';c.font='22px monospace';c.fillText(mode==='paused'?'GÂCHETTE DROITE : REPRENDRE':'B : QUITTER   /   X : PASSTHROUGH',24,196);board.texture.needsUpdate=true;}
}
function poseObject(object,pose){object.position.copy(pose.transform.position);object.quaternion.copy(pose.transform.orientation);object.updateMatrixWorld(true);}
function planeGeometry(polygon){
 if(!polygon||polygon.length<3)return null;
 const normal=new THREE.Vector3();for(let i=1;i<polygon.length-1&&normal.lengthSq()<1e-8;i++)normal.subVectors(polygon[i],polygon[0]).cross(new THREE.Vector3().subVectors(polygon[i+1],polygon[0]));
 const axis=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)].indexOf(Math.max(Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)));
 const axes=axis===0?['z','y']:axis===1?['x','z']:['x','y'];
 const faces=THREE.ShapeUtils.triangulateShape(polygon.map(p=>new THREE.Vector2(p[axes[0]],p[axes[1]])),[]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(polygon.flatMap(p=>[p.x,p.y,p.z]),3));g.setIndex(faces.flat());g.computeVertexNormals();return g;
}
function discardSurface(record){assets?.disposeDecor(record);record.collider.removeFromParent();record.outline?.removeFromParent();record.collider.geometry.dispose();record.outline?.geometry.dispose();roomDirty=true;}
function updatePlayArea(frame){
 if(!session)return;let points=null;
 if(boundedSpace?.boundsGeometry?.length>=3&&frame){try{
  const pose=frame.getPose(boundedSpace,renderer.xr.getReferenceSpace());if(pose){const transform=new THREE.Matrix4().fromArray(pose.transform.matrix);points=[...boundedSpace.boundsGeometry].map(p=>new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(transform));}
 }catch{}}
 if(points){
  const changed=!zoneRecord||playAreaSource!=='quest-boundary'||points.length!==playPolygon.length||points.some((p,i)=>p.distanceTo(new THREE.Vector3(playPolygon[i].x,playPolygon[i].y,playPolygon[i].z))>.04);
  if(changed){playPolygon=points.map(p=>({x:p.x,y:p.y,z:p.z}));playAreaSource='quest-boundary';if(zoneRecord)discardSurface(zoneRecord);
   const collider=new THREE.Mesh(planeGeometry(playPolygon),blockerMaterial);scene.add(collider);zoneRecord={collider,kind:'floor',isFloor:true,isCover:false,polygon:playPolygon,invisibleFloor:true};roomDirty=true;boundary.setPolygon(playPolygon);}
 }
 if(playAreaSource!=='quest-boundary'){
  const all=floors(),at=roomFloorAt({x:head.x,y:head.y-.65,z:head.z},all),record=all.find(r=>insideRoomPolygon(head,r.polygon)&&Math.abs(r.polygon[0].y-at)<.15)||all[0];
  if(record){playPolygon=record.polygon.map(p=>({x:p.x,y:p.y,z:p.z}));playAreaSource='scanned-floor';boundary.setPolygon(playPolygon);}
 }
 boundary.root.visible=!!session&&decorEnabled&&playPolygon.length>=3;boundary.update(head,.25,.8);
}
function updateSurfaces(frame){
 const ref=renderer.xr.getReferenceSpace();if(!ref||!frame)return;
 const detected=frame.detectedPlanes||session?.detectedPlanes;
 if(refreshScan&&detected&&[...detected].some(p=>p.semanticLabel==='floor')){for(const record of surfaceRecords())discardSurface(record);surfaces.clear();meshes.clear();zoneRecord=null;navigationFloorY=null;room.resetRoom();assets?.architecture.resetRoom();refreshScan=false;}
 if(detected){ // A temporarily empty detection set while walking is not a new room scan.
  let count=0;for(const plane of detected){if(++count>65)break;if(!surfaces.has(plane)&&surfaces.size>=65)continue;const pose=frame.getPose(plane.planeSpace,ref);if(!pose||plane.polygon?.length<3)continue;
   let record=surfaces.get(plane),changed=!record||record.changed!==plane.lastChangedTime;
   if(changed){const geometry=planeGeometry(plane.polygon);if(!geometry)continue;if(record)discardSurface(record);
    const collider=new THREE.Mesh(geometry,blockerMaterial),outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(plane.polygon.map(p=>new THREE.Vector3(p.x,p.y,p.z))),outlineMat);scene.add(collider,outline);
    record={collider,outline,changed:plane.lastChangedTime,kind:'object',isFloor:false,polygon:[]};surfaces.set(plane,record);roomDirty=true;}
   poseObject(record.collider,pose);poseObject(record.outline,pose);
   record.polygon=plane.polygon.map(p=>record.collider.localToWorld(new THREE.Vector3(p.x,p.y,p.z)));
   const kind=classifyRoomSurface(record.polygon,plane.semanticLabel||'');if(kind!==record.kind){record.kind=kind;roomDirty=true;changed=true;}record.isFloor=kind==='floor';record.isCover=kind==='object';
   record.outline.visible=false;if(assets&&(changed||!record.decor))assets.projectRuin(record,decorEnabled,head);
  }
 }
 const detectedMeshes=frame.detectedMeshes;
 if(detectedMeshes){
  let count=0;for(const mesh of detectedMeshes){if(++count>14)break;if(!meshes.has(mesh)&&meshes.size>=14)continue;if(!mesh.vertices||!mesh.indices||mesh.vertices.length>30000||mesh.indices.length>45000)continue;
   const pose=frame.getPose(mesh.meshSpace,ref);if(!pose)continue;let record=meshes.get(mesh),changed=!record||record.changed!==mesh.lastChangedTime;
   if(changed){if(record)discardSurface(record);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(mesh.vertices.slice(),3));g.setIndex(new THREE.BufferAttribute(mesh.indices.slice(),1));g.computeVertexNormals();
    const collider=new THREE.Mesh(g,blockerMaterial);scene.add(collider);record={collider,changed:mesh.lastChangedTime,kind:['wall','ceiling'].includes(mesh.semanticLabel)?mesh.semanticLabel:'mesh',isFloor:mesh.semanticLabel==='floor',isCover:false,polygon:[]};meshes.set(mesh,record);roomDirty=true;}
   poseObject(record.collider,pose);
   const meshBox=new THREE.Box3().setFromObject(record.collider);record.isCover=!record.isFloor&&!['wall','ceiling'].includes(record.kind)&&meshBox.max.y-meshBox.min.y<1.8;
   if(record.isFloor){const b=new THREE.Box3().setFromObject(record.collider);record.polygon=[new THREE.Vector3(b.min.x,b.min.y,b.min.z),new THREE.Vector3(b.max.x,b.min.y,b.min.z),new THREE.Vector3(b.max.x,b.min.y,b.max.z),new THREE.Vector3(b.min.x,b.min.y,b.max.z)];}
   if(assets&&(changed||!record.decor))assets.projectRuin(record,decorEnabled,head);
  }
 }
 const roomClock=performance.now()/1000;
 const currentFloor=scannedRoom.floorAt(head);if(currentFloor!==null&&(navigationFloorY===null||Math.abs(currentFloor-navigationFloorY)>.08))roomDirty=true;
 if(roomDirty&&roomClock-lastRoomBuild>.25){
  roomDirty=false;lastRoomBuild=roomClock;const bounds=roomBounds(floors());navigationFloorY=currentFloor??navigationFloorY??bounds?.floorY??null;
  const area=playPolygon.length>=3?roomBounds([{polygon:playPolygon}]):bounds;
  const anchored=area?{...area,floorY:navigationFloorY??area.floorY}:null;
  navigation=createRoomNavigation(anchored,canStand);assets?.architecture.setRoom(anchored);if(anchored)room.setRoom(anchored);assets?.architecture.setEnabled(decorEnabled,fullImmersion);
 }
}
function edge(key,down){const old=previousButtons.get(key)||false;previousButtons.set(key,down);return down&&!old;}
function cancelFire(){game.triggerHeld=false;game.dual.held={left:false,right:false};game.semiPending=false;game.charge=0;game.bladePrevious=null;fireBlocked=true;scope?.release();}
function requestCombat(){startRequested=true;startCombat();}
function startCombat(){
 if(mode==='paused'){startRequested=false;game.running=true;mode='combat';cancelFire();info('SIGNAL RÉTABLI');return;}
 if(!assets){info(assetError||'CHARGEMENT DES ARMES ET DES MACHINES');return;}
 if(!game.start(head)){info(floors().length?'ZONE DE SOL TROP ÉTROITE OU MASQUÉE':'SOL NON DÉTECTÉ : GÂCHETTE GAUCHE POUR SCANNER');return;}
 startRequested=false;clearBots();assets.syncOffers([]);assets.setPortals([],head);assets.setWeapon(game.weaponIndex,1);feel.reset();laser.reset();mode='combat';cancelFire();
 const point=findPoint({purpose:'companion',head});if(point)assets.placeCompanion(new THREE.Vector3(point.x,point.y,point.z),head);else assets.companion.root.visible=false;
 info('INTRUSION DANS LE LABORATOIRE');announce('INTRUSION / '+hero.name);
}
function clearBots(){for(const model of bots.values())model.removeFromParent();bots.clear();for(const mesh of bolts.values())mesh.removeFromParent();bolts.clear();}
function syncModels(){
 for(const [id,model] of bots)if(!game.enemies.some(e=>e.id===id)){model.removeFromParent();bots.delete(id);}
 for(const e of game.enemies){let model=bots.get(e.id);if(!model){model=assets.makeEnemy(e.form,e.elite,e.ranged);model.scale.multiplyScalar(e.roomScale||1);scene.add(model);bots.set(e.id,model);}model.position.set(e.x,e.elevation,e.z);model.rotation.y=e.yaw;model.userData.animate(game.time,e.phase,e.moving,e,game.time);}
 for(const [id,model] of bolts)if(!game.bullets.some(b=>b.id===id&&b.hostile)){model.removeFromParent();bolts.delete(id);}
 for(const b of game.bullets)if(b.hostile){let model=bolts.get(b.id);if(!model){model=new THREE.Mesh(hostileGeo,hostileMat);scene.add(model);bolts.set(b.id,model);}model.position.set(b.x,b.y,b.z);model.scale.y=.28;model.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(b.vx,b.vy,b.vz).normalize());}
 assets.syncOffers(game.weaponOffers);for(const item of assets.offers.values())item.label.lookAt(head);
}
function processEvents(){
 for(const event of game.drainEvents()){
  if(event.type==='wave'){announce('BRÈCHE / VAGUE '+String(event.wave).padStart(2,'0'));assets.setPortals(game.activePortals,head);assets.setWeapon(game.weaponIndex,Math.min(10,game.wave));}
  if(event.type==='wave-clear')announce('VAGUE '+event.wave+' REPOUSSÉE');
  if(event.type==='room-blocked')announce('BRÈCHE EN ATTENTE / ZONE DE SOL');
  if(event.type==='weapon-offer')announce(event.name+' / LIVRAISON DISPONIBLE');
  if(event.type==='unlock')announce(event.name+' / ACQUISE');
  if(event.type==='weapon'){assets.setWeapon(event.index,Math.min(10,Math.max(1,game.wave)));feel.reset();scope?.release();cancelFire();}
  if(event.type==='enemy-shot'){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);playEnemyShot(audio,{form:event.form,source:event,listener:{x:head.x,z:head.z,elevation:head.y-1.5},yaw:Math.atan2(-forward.x,-forward.z),occluded:game.blocked(event,head)});}
  if(event.type==='shot'){feel.fire(event.weapon,event.power,controllerHandState.offGrip>.5);laser.shot(event);muzzleUntil=game.time+.075;try{playLaserShot(audio,event.weapon,event.power);}catch{}haptic('shot',event.weapon,event.hand);}
  if(event.type==='reload'){haptic('reload');try{playWeaponAction(audio,game.weapon.id,'reload-out');}catch{}}
  if(event.type==='reloaded'){haptic('reloaded');try{playWeaponAction(audio,game.weapon.id,'reload-in');}catch{}}
  if(event.type==='impact'){laser.impact(event);try{playLaserImpact(audio,{surface:event.surface,distance:Math.hypot(event.x-head.x,event.y-head.y,event.z-head.z),splash:event.splash,power:event.power});}catch{}}
  if(event.type==='blade-hit'||event.type==='blade-parry'){laser.impact({...event,weapon:'aurora',enemy:event.type==='blade-hit'});saberAudio?.impact(event.type==='blade-parry');haptic(event.type==='blade-parry'?'parry':'hit');}
  if(event.type==='damage')haptic('damage');
  if(event.type==='weapon')haptic('weapon');
  if(event.type==='over'||event.type==='won'){mode='finished';cancelFire();info('GÂCHETTE DROITE : REJOUER');}
 }
}
function haptic(type,arg,hand=null){
 try{if(JSON.parse(localStorage.getItem('pink-war-vr')||'{}').haptics===false)return;}catch{}
 const plan=hapticPlan(type,arg);for(const entry of mounts){const pulse=hand?(entry.source?.handedness===hand?plan.main:null):entry.source?.handedness==='right'?plan.main:plan.side;if(pulse)buzz(entry.source?.gamepad,pulse);}
}
for(let i=0;i<2;i++){
 const ray=renderer.xr.getController(i),anchor=new THREE.Group(),mount=new THREE.Group();anchor.matrixAutoUpdate=false;anchor.visible=false;mount.position.set(0,-.016,.05);scene.add(anchor,ray);anchor.add(mount);
 const entry={ray,anchor,mount,source:null};ray.addEventListener('connected',event=>{entry.source=event.data;updateControllerRoles();});ray.addEventListener('disconnected',()=>{entry.source=null;cancelFire();updateControllerRoles();});mounts.push(entry);
}
function updateControllerRoles(){
 if(!assets)return;assets.gun.visible=assets.offGun.visible=assets.freeHand.visible=false;
 for(const entry of mounts){entry.mount.remove(assets.gun,assets.offGun,assets.freeHand);if(entry.source?.handedness==='right'){entry.mount.add(assets.gun);assets.gun.visible=!!session;}else if(entry.source?.handedness==='left'){const held=game.weapon.dual?assets.offGun:assets.freeHand;entry.mount.add(held);held.visible=!!session;}}
}
function sightEye(){
 const array=renderer.xr.getCamera(camera),source=array.cameras?.find(c=>c.viewport?.x>0)||array.cameras?.[0]||array;
 opticalEye.matrix.copy(source.matrixWorld);opticalEye.matrixWorld.copy(source.matrixWorld);opticalEye.matrixWorldInverse.copy(source.matrixWorld).invert();opticalEye.projectionMatrix.copy(source.projectionMatrix);opticalEye.projectionMatrixInverse.copy(source.projectionMatrixInverse);return opticalEye;
}
function tick(ms,frame){
 const seconds=ms/1000,dt=Math.min(.05,Math.max(0,seconds-lastTime));lastTime=seconds;const feedback=feel.update(dt);
 if(session){
  const pose=frame?.getViewerPose(renderer.xr.getReferenceSpace());if(pose){head.copy(pose.transform.position);orientation.copy(pose.transform.orientation);}
  const active=session.visibilityState==='visible'&&!!pose;
  if(!pose&&mode==='combat')cancelFire();
  const right=[...session.inputSources].find(s=>s.handedness==='right'),left=[...session.inputSources].find(s=>s.handedness==='left'),padR=right?.gamepad,padL=left?.gamepad;
  Object.assign(controllerHandState,{trigger:padR?.buttons?.[0]?.value||0,grip:padR?.buttons?.[1]?.value||0,offTrigger:padL?.buttons?.[0]?.value||0,offGrip:padL?.buttons?.[1]?.value||0});
  if(active&&edge('pause',!!padR?.buttons?.[3]?.pressed)){if(mode==='paused')resumeHome();else pauseHome();}
  if(edge('exit',!!padR?.buttons?.[5]?.pressed)){session.end().catch(()=>{});return;}
  if(active&&edge('reload',!!padR?.buttons?.[4]?.pressed)&&mode!=='paused'){if(mode==='combat')game.reload();else requestCombat();}
  if(active&&edge('weapon',!!padL?.buttons?.[5]?.pressed)&&mode==='combat')game.cycleWeapon();
  if(active&&edge('collect',!!padL?.buttons?.[3]?.pressed)&&mode==='combat')game.collectWeapon();
  if(active&&edge('decor',!!padL?.buttons?.[4]?.pressed)){decorEnabled=!decorEnabled;assets?.architecture.setEnabled(decorEnabled,fullImmersion);}
  if(frame){syncTrackedHands(mounts,session,frame,renderer.xr.getReferenceSpace());updateControllerRoles();updatePlayArea(frame);updateSurfaces(frame);updatePlayArea(frame);}
  const menuConsumed=immersivePause.update({active:mode==='paused',camera,ray:mounts.find(m=>m.source?.handedness==='right')?.ray,trigger:controllerHandState.trigger>.15});if(menuConsumed)cancelFire();
  const held=controllerHandState.trigger>.15,main=mounts.find(m=>m.source?.handedness==='right');if(!held&&(!game.weapon.dual||controllerHandState.offTrigger<=.15))fireBlocked=false;
  if(held&&!lastTrigger&&active&&mode!=='combat'&&mode!=='paused'&&!menuConsumed)requestCombat();lastTrigger=held;
  if(startRequested&&active&&mode!=='combat'&&mode!=='paused'&&assets&&floors().length)startCombat();
  if(assets){
   const reload=game.reloadRemaining?1-game.reloadRemaining/game.weapon.reload:0;
   const pose=recoilPose(game.weapon.id,feedback,{tracked:true,dual:!!game.weapon.dual,aiming:Number(controllerHandState.offGrip>.5)});
   assets.gun.rotation.set(pose.pitch-(game.weapon.melee?.55:0)+reload*Math.PI/2,pose.yaw,pose.roll+(game.weapon.melee?-.06:0));
   assets.gun.position.set(pose.x,.028*(+!!game.weapon.melee)+pose.y,pose.z-(game.weapon.melee?.036:0));
   assets.animate(game.time,dt,Math.max(1,game.wave),{ammo:game.ammo[game.weaponIndex],capacity:game.weapon.capacity,reloading:game.reloadRemaining>0,reloadProgress:reload,
    time:game.time,dualState:game.dual,flash:active&&game.time<muzzleUntil,heat:feedback.heat,kick:feedback.kick,impulse:feedback.impulse,...controllerHandState,trigger:active&&main?.anchor.visible&&!fireBlocked?controllerHandState.trigger:0});
   if(active&&mode==='combat'){
    game.setHead(head,dt);game.updateBlade(assets.gun.userData.getBladeSegment(),dt,(controllerHandState.offTrigger>.15||controllerHandState.grip>.15),head);game.step(dt);
    assets.gun.updateWorldMatrix(true,true);const muzzle=assets.gun.userData.flash.position,origin=assets.gun.localToWorld(muzzle.clone()),aim=new THREE.Vector3(0,0,-1).transformDirection(assets.gun.matrixWorld);
    if(game.weapon.dual){
      for(const hand of ['right','left']){const tracked=mounts.find(m=>m.source?.handedness===hand),gun=hand==='right'?assets.gun:assets.offGun;
        const muzzle=gun.userData.flash;muzzle.updateWorldMatrix(true,false);const at=muzzle.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,0,-1).transformDirection(gun.matrixWorld);
        game.triggerHand(hand,!fireBlocked&&!!tracked?.anchor.visible&&(hand==='right'?held:controllerHandState.offTrigger>.15),dt,at,direction);
      }
    }else game.trigger(!fireBlocked&&!!main?.anchor.visible&&held,dt,origin,aim);
    processEvents();syncModels();
   }
   const eye=sightEye(),aiming=active&&mode==='combat'&&((!game.weapon.dual&&controllerHandState.offTrigger>.15)||controllerHandState.grip>.15)&&!game.reloadRemaining;
   assets.gun.userData.setSight?.(aiming,eye);
   if(aiming&&assets.gun.userData.optics?.[game.weaponIndex]){scope ||=createMagnifiedSight(256);scope.render({renderer,scene,gun:assets.gun,eyeCamera:eye,active:true,hide:[...mounts.map(m=>m.anchor),hud.plane,board.plane,announcement.plane]});}else scope?.release();
   assets.architecture.update(game.time,eye);
   const blade=assets.gun.userData.getBladeSegment();bladeLight.intensity=active&&assets.gun.visible&&blade?2.4*blade.extension:0;if(blade)bladeLight.position.set((blade.base.x+blade.tip.x)/2,(blade.base.y+blade.tip.y)/2,(blade.base.z+blade.tip.z)/2);
   saberAudio?.update({active:active&&mode==='combat',equipped:game.weapon.melee,extended:!fireBlocked&&held,speed:game.bladeSpeed,swing:game.weapon.melee&&game.bladePhase<.08});
  }
  if(mode==='ready'){if(!assets)info(assetError||'CHARGEMENT DU LABORATOIRE');else if(floors().length)info(playAreaSource==='quest-boundary'?'ZONE QUEST PRÊTE : A OU GÂCHETTE DROITE':'SOL SCANNÉ PRÊT : A OU GÂCHETTE DROITE');else if(seconds-startTime>2)info(startRequested?'DÉMARRAGE EN ATTENTE : SCAN GÂCHETTE GAUCHE':'SOL NON DÉTECTÉ : GÂCHETTE GAUCHE POUR SCANNER');}
  ambience?.update(dt,{active:active&&mode==='combat',position:head,moving:true,grounded:true,elevation:game.player.elevation,probes:game.enemies});
  laser.update(game.bullets,dt);updateBoards();
 }worldShadows.update(seconds,game.player,{enabled:mode!=='idle',entities:game.enemies,heightAt:e=>room.floorAt({x:e.x,y:e.elevation,z:e.z})??game.player.elevation});renderer.render(scene,camera);frames++;
}
async function initiateScan(){
 if(!session||roomCaptureAsked)return;roomCaptureAsked=true;
 if(typeof session.initiateRoomCapture!=='function'){info('CONFIGURE LE SCAN DANS SPACE SETUP DU QUEST');roomCaptureAsked=false;return;}
 info('SCAN DE LA MAISON EN COURS');try{await session.initiateRoomCapture();refreshScan=true;roomDirty=true;info('SCAN TERMINÉ : RECHERCHE DU SOL');}catch{info('SCAN ANNULÉ : TU PEUX RÉESSAYER');}finally{roomCaptureAsked=false;}
}
function onSelect(event){if(session?.visibilityState!=='visible'||mode==='paused')return;if(event.inputSource?.handedness==='left'&&mode!=='combat')initiateScan();if(event.inputSource?.handedness==='right'&&mode!=='combat')requestCombat();}
function onSessionEnd(){
 immersivePause.update({active:false});pauseMenu.hide(false);
 session=null;mode='idle';game.stop();cancelFire();game.enemies=[];game.bullets=[];game.activePortals=[];game.weaponOffers=[];game.toSpawn=0;game.pendingOffers.clear();scope?.dispose();scope=null;ambience?.pause();saberAudio?.update({active:false});bladeLight.intensity=0;clearBots();laser.reset();assets?.hideDecor();
 for(const record of surfaceRecords())discardSurface(record);surfaces.clear();meshes.clear();zoneRecord=null;boundedSpace=null;playPolygon=[];playAreaSource='';startRequested=false;boundary.setPolygon([]);navigation=null;navigationFloorY=null;room.resetRoom();roomDirty=true;lastRoomBuild=-99;
 for(const item of [hud,board,announcement])item.plane.visible=false;for(const mount of mounts){mount.source=null;mount.anchor.visible=false;mount.ray.userData.source=null;}
 assets?.gun.removeFromParent();assets?.freeHand.removeFromParent();previousButtons.clear();lastTrigger=false;roomCaptureAsked=false;refreshScan=false;
 document.body.classList.remove('in-xr');$('at-home-end').hidden=true;button.disabled=false;info('SESSION TERMINÉE · RELANCER AT HOME');
}
async function enter(){
 if(!navigator.xr||session)return;let request;
 try{request=navigator.xr.requestSession('immersive-ar',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor','plane-detection','mesh-detection']});}catch(error){info(error.message);return;}
 button.disabled=true;
 try{audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});saberAudio ||=createSaberSound(audio);ambience ||=createAmbience(audio);void loadRealLaserSample(audio);void loadCombatSamples(audio);}catch{}
 let opened;try{
  opened=await request;session=opened;mode='ready';decorEnabled=true;lastTime=0;startTime=performance.now()/1000;roomDirty=true;lastRoomBuild=-99;game.stop();
  opened.addEventListener('end',onSessionEnd,{once:true});opened.addEventListener('selectstart',onSelect);opened.addEventListener('inputsourceschange',updateControllerRoles);
  opened.addEventListener('visibilitychange',()=>{if(opened.visibilityState!=='visible'&&mode==='combat')pauseHome();});
  await renderer.xr.setSession(opened);try{boundedSpace=await opened.requestReferenceSpace('bounded-floor');}catch{}document.body.classList.add('in-xr');$('at-home-end').hidden=false;info('DÉTECTION DE LA MAISON');
  if(!assets){assetsLoading ||=import('./at-home-assets.js').then(m=>m.createAtHomeAssets(scene,hero)).then(pack=>{assets=pack;assetsLoading=null;assetError='';updateControllerRoles();for(const r of surfaceRecords())if(!r.invisibleFloor)assets.projectRuin(r,decorEnabled,head);roomDirty=true;lastRoomBuild=-99;}).catch(error=>{assetsLoading=null;assetError='MODÈLES INDISPONIBLES : '+error.message;console.error('AT HOME',error);});}else updateControllerRoles();
 }catch(error){if(opened)await opened.end().catch(()=>{});if(session===opened)onSessionEnd();button.disabled=false;info('ACCÈS À LA RÉALITÉ MIXTE INDISPONIBLE : '+error.message);}
}
button.addEventListener('click',enter);$('at-home-end').addEventListener('click',()=>session?.end().catch(()=>{}));
$('at-home-immersion')?.addEventListener('change',e=>{fullImmersion=e.target.value==='full';});
window.addEventListener('resize',()=>{if(renderer.xr.isPresenting)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
renderer.setAnimationLoop(tick);
async function checkSupport(){if(!navigator.xr||!window.isSecureContext){info('OUVRE AT HOME DANS LE NAVIGATEUR QUEST 3');return;}try{if(await navigator.xr.isSessionSupported('immersive-ar')){button.disabled=false;info('QUEST COMPATIBLE · PRÉPARE LE SCAN DE LA MAISON');}else info('RÉALITÉ MIXTE INDISPONIBLE SUR CE NAVIGATEUR');}catch{info('SUPPORT WEBXR INDISPONIBLE');}}
checkSupport();
window.__PINKWAR_HOME=Object.freeze({snapshot:()=>({version:GAME_VERSION,mode,frames,character:hero.id,floors:floors().length,surfaces:surfaces.size,meshes:meshes.size,decor:assets?.architecture.stats(),battlefield:room.stats(),playArea:{source:playAreaSource,polygon:playPolygon,boundary:boundary.stats()},startRequested,hands:mounts.filter(m=>m.anchor.visible).length,laser:laser.stats(),scope:scope?.stats(),...game.snapshot()})});
