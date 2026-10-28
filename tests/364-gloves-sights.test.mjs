import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {WEAPON_FRAME,OPTICS,FPS_ARMS,buildGun,createWeaponModels,createNovaSight} from '../dist/weapons.js';
import {createGlove} from '../dist/hands.js';
import {WRIST_BLEND} from '../dist/rlh-gloves.js';
import {createCharacterKit} from '../dist/soldier.js';
import {flatSightPose} from '../dist/optics.js';
import {sightPoint,eyeAlignedSight} from '../dist/sight-line.js';
import {ArenaGame} from '../dist/game-logic.js';
import {GAME_VERSION} from '../dist/launch-ui.js';
import {parseKenneyGLB} from '../dist/kenney-blasters.js';

const neon=c=>new T.MeshBasicMaterial({color:c}),solid=c=>new T.MeshStandardMaterial({color:c});
const mats=()=>({dark:solid(1),steel:solid(2),armor:solid(3),armorLight:solid(4),rose:neon(5),pale:neon(6),violet:neon(7),cyan:neon(8)});
const flash=parent=>{const s=new T.Object3D();parent.add(s);return s;};
const file=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const gloves=()=>createCharacterKit(new T.Texture()).gloves;
const RANGED=[0,1,2,3,4,6,7];

// The FPS rig of game.js: the weapon holder is a child of the eye camera, posed by flatSightPose.
function fpsRig(index,blend,aspect=16/9){
  const camera=new T.PerspectiveCamera(72,aspect,.01,300),holder=new T.Group(),gun=buildGun({mats:mats(),gloves:gloves(),makeFlash:flash});
  gun.userData.kenneyAssets.loadedByIndex[4]=true;gun.userData.setVariant(index);
  for(let k=0;k<20;k++)gun.userData.animateHands(0,.18,0,.05);
  const optic=gun.userData.optics[index]?.cfg||OPTICS[WEAPON_FRAME[index].id],pose=flatSightPose(optic,blend);
  holder.position.set(pose.x,pose.y,pose.z);holder.rotation.set(0,pose.yaw,pose.roll);holder.add(gun);camera.add(holder);
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();return {camera,gun,optic};
}
const onScreen=(camera,point)=>{const p=point.clone().project(camera);return p.z<1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;};

test('flexible wrist: the cuff blends from the hand at the wrist ring to the forearm below it',()=>{
  const glove=createGlove(gloves(),{arm:true}),parts=glove.userData.rlh.userData.parts,bones=glove.userData.skeleton.bones;
  const forearm=bones.findIndex(b=>b.name==='D_manchette'),wrist=bones.findIndex(b=>b.name==='D_poignet');
  let blended=0,top=0,low=0;
  for(const {mesh} of parts){
    const index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight,position=mesh.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      if(index.getX(i)!==forearm)continue;
      const y=position.getY(i),w=index.getY(i)===wrist?weight.getY(i):0;
      assert.ok(Math.abs(weight.getX(i)+weight.getY(i)-1)<1e-6,'weights are normalised');
      if(y>=WRIST_BLEND[1]){assert.ok(w>.999,'the wrist ring follows the hand');top++;}
      else if(y<=WRIST_BLEND[0]){assert.equal(w,0,'the armoured forearm follows the forearm bone');low++;}
      else blended++;
    }
  }
  assert.ok(top>50&&low>500&&blended>200,`a real transition band (${top}/${blended}/${low})`);
});

test('bending the forearm keeps the cuff rim on the wrist instead of a hard kink',()=>{
  const glove=createGlove(gloves(),{arm:true}),parts=glove.userData.rlh.userData.parts,bones=glove.userData.skeleton.bones,forearm=bones.findIndex(b=>b.name==='D_manchette');
  const {mesh}=parts.find(({part})=>part.key==='caout'),position=mesh.geometry.attributes.position,index=mesh.geometry.attributes.skinIndex;
  const sample=()=>{glove.updateMatrixWorld(true);mesh.skeleton.update();const out=new Map(),v=new T.Vector3();
    for(let i=0;i<position.count;i++)if(index.getX(i)===forearm){const y=position.getY(i);if(y>=-.002||y<-.30)out.set(i,mesh.getVertexPosition(i,v).clone());}return out;};
  glove.userData.setForearm([0,Math.sin(.35),Math.cos(.35)]);const straight=sample();
  glove.userData.setForearm(FPS_ARMS.hand);const bent=sample();
  let rim=0,far=0;
  for(const [i,p] of straight){const y=position.getY(i),moved=p.distanceTo(bent.get(i));if(y>=-.002)rim=Math.max(rim,moved);else far=Math.max(far,moved);}
  assert.ok(rim<1e-4,`the wrist rim stays on the hand (${rim})`);
  assert.ok(far>.1,'the elbow end really follows the new forearm direction');
});

test('only flat-screen weapons carry the long forearm; tracked and body gloves keep the short cuff',()=>{
  const fps=createGlove(gloves(),{arm:true}),vr=createGlove(gloves(),{sleeve:false}),body=createGlove(gloves(),{sleeve:true});
  assert.equal(fps.userData.rlh.userData.arm,true);assert.equal(vr.userData.rlh.userData.arm,false);assert.equal(body.userData.rlh.userData.arm,false);
  const flat=buildGun({mats:mats(),gloves:gloves(),makeFlash:flash}),tracked=buildGun({mats:mats(),gloves:gloves(),sleeve:false,makeFlash:flash});
  assert.equal(flat.userData.hand.userData.rlh.userData.arm,true);assert.equal(flat.userData.support.userData.rlh.userData.arm,true);
  assert.equal(tracked.userData.hand.userData.rlh.userData.arm,false);
  fps.userData.extendForearm();assert.equal(fps.userData.extendedForearm,undefined,'no second forearm on top of the built-in one');
  const sphere=fps.userData.rlh.userData.parts[0].mesh.boundingSphere;assert.ok(sphere.radius>.6,'culling bounds reach the elbow');
});

test('FPS sleeves always leave the screen: no open cuff end in view, at the hip or behind the sight',()=>{
  for(const index of RANGED)for(const blend of [0,1])for(const aspect of [16/9,4/3,9/19.5]){
    const {camera,gun}=fpsRig(index,blend,aspect);
    for(const glove of [gun.userData.hand,gun.userData.support]){
      if(!glove.visible||!glove.parent?.visible&&index!==7)continue;
      const elbow=glove.userData.rig.forearm.localToWorld(new T.Vector3(0,-.58,0));
      assert.ok(!onScreen(camera,elbow),`${WEAPON_FRAME[index].id} blend ${blend} aspect ${aspect.toFixed(2)}: the ${glove===gun.userData.hand?'shooting':'free'} elbow end is off screen`);
    }
  }
});

test('every authored optic matches the shared OPTICS table and the eye sits on its reticle',()=>{
  const models=createWeaponModels(mats());
  for(const index of [0,1,2,3]){
    const own=models[index].userData.optic,cfg=OPTICS[WEAPON_FRAME[index].id];
    assert.equal(models[index].userData.ownReticle,true);
    for(const key of ['y','z','radius'])assert.ok(Math.abs(own[key]-cfg[key])<5e-4,`${WEAPON_FRAME[index].id}.${key}: table ${cfg[key]} = model ${own[key]}`);
  }
  assert.deepEqual({y:OPTICS.duor9.y,z:OPTICS.duor9.z},{y:OPTICS.r9.y,z:OPTICS.r9.z});
});

test('raised in flat FPS, each reticle centre lands exactly on the screen centre (the shot point)',()=>{
  for(const index of RANGED){
    const {camera,gun,optic}=fpsRig(index,1);
    const model=gun.userData.weaponModels[index],centre=model.localToWorld(new T.Vector3(0,optic.y,optic.z)).project(camera);
    assert.ok(Math.hypot(centre.x,centre.y)<1e-6,`${WEAPON_FRAME[index].id}: reticle at (${centre.x.toFixed(5)}, ${centre.y.toFixed(5)})`);
    assert.ok(centre.z>-1&&centre.z<1,'in front of the eye');
  }
});

test('the line of sight through each optic is not blocked by the weapon’s own opaque parts',()=>{
  const ray=new T.Raycaster(),nova=createNovaSight(mats());
  for(const index of [0,1,2,3,4]){
    const {camera,gun,optic}=fpsRig(index,1),model=gun.userData.weaponModels[index];
    if(index===4){
      // In game the NOVA is the Pink War IV GLB (its procedural fallback hidden) plus the reflex sight.
      for(const child of model.children)child.visible=false;
      const glb=readFileSync(new URL('../dist/assets/pink-war/blaster-p-mk4.glb',import.meta.url));
      model.add(parseKenneyGLB(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength)),nova);
    }
    gun.updateMatrixWorld(true);ray.set(new T.Vector3(),new T.Vector3(0,0,-1));ray.far=Math.max(.6,-optic.z+optic.radius*7+.4);
    const blockers=ray.intersectObject(model,true).filter(hit=>{const m=[].concat(hit.object.material)[0];return !m.transparent&&!m.isMeshBasicMaterial&&!m.isLineBasicMaterial&&hit.object.visible;});
    assert.deepEqual(blockers.map(h=>h.object.name||h.object.type),[],`${WEAPON_FRAME[index].id}: clear sight picture`);
    void camera;
  }
});

test('NOVA reflex sight: its window is centred on the NOVA optic axis and sits on the receiver',()=>{
  const sight=createNovaSight(mats()),box=new T.Box3().setFromObject(sight);
  assert.ok(Math.abs(box.min.x+box.max.x)<1e-6,'symmetric about the bore');
  assert.ok(box.min.y>.08&&box.min.y<.09,'mounted on the flat receiver top');
  assert.ok(box.max.y>OPTICS.nova.y+OPTICS.nova.radius,'the hood clears the window');
});

test('Quest raised optic: the sight centre sits on the eye axis at the eye relief, oriented like the eye',()=>{
  const eye=new T.Object3D();eye.position.set(1,1.62,-3);eye.rotation.set(-.2,.7,.05,'YXZ');eye.updateMatrixWorld(true);
  for(const id of ['r9','bloom','lance','thorn','nova','m12']){
    const optic=OPTICS[id],pose=eyeAlignedSight(T,eye.matrixWorld,optic),gun=new T.Object3D();
    gun.position.copy(pose.position);gun.quaternion.copy(pose.quaternion);gun.updateMatrixWorld(true);
    const centre=gun.localToWorld(new T.Vector3(0,optic.y,optic.z)),relief=optic.xrEyeRelief??Math.max(.12,optic.eyeRelief||optic.radius*7);
    const expected=eye.position.clone().add(new T.Vector3(0,0,-relief).applyQuaternion(eye.quaternion));
    assert.ok(centre.distanceTo(expected)<1e-9,`${id}: optic on the eye axis`);
    const barrel=new T.Vector3(0,0,-1).applyQuaternion(gun.quaternion),forward=new T.Vector3(0,0,-1).applyQuaternion(eye.quaternion);
    assert.ok(barrel.angleTo(forward)<1e-9,`${id}: bore parallel to the line of sight`);
  }
  assert.ok(OPTICS.m12.xrEyeRelief<OPTICS.m12.eyeRelief,'the shotgun is shouldered in the headset, not held at arm’s length');
});

test('shots converge where the line of sight meets a wall or a machine, not parallel below it',()=>{
  const eye=new T.Vector3(0,1.6,0),forward=new T.Vector3(0,0,-1),wall={x:0,z:-20,hx:5,hz:.5,y:0,height:4};
  let target=sightPoint(T,eye,forward,{obstacles:[wall]});
  assert.ok(Math.abs(target.z+19.5)<1e-6&&Math.abs(target.y-1.6)<1e-6,'the wall face under the reticle');
  const enemy={x:0,z:-9,elevation:0,aimHeight:1.15,radius:.8,hitRadius:1.05,form:'stalker'};
  target=sightPoint(T,eye,forward,{obstacles:[wall],enemies:[enemy]});
  assert.ok(target.z>-10&&target.z<-7.5,'the machine in front of the wall');
  const muzzle=new T.Vector3(.05,1.38,-.4),direction=target.clone().sub(muzzle).normalize();
  const along=target.clone().sub(muzzle).dot(direction),closest=muzzle.clone().addScaledVector(direction,along);
  assert.ok(closest.distanceTo(target)<1e-9,'the bolt from the muzzle passes through the aimed point');
  assert.match(file('game.js'),/vr\.sightLine\?\.\(hand\)/,'XR shots converge on the raised optic’s line of sight');
});

test('missions use the Arena grips in the headset: left grip raises the optic, right grip sprints',()=>{
  const xr=file('mission-xr.js');
  assert.match(xr,/aim:down\(lp\?\.buttons\[1\]\),sprint:down\(rp\?\.buttons\[1\]\)/);
  assert.match(xr,/eyeAlignedSight\(w\.T,eye\.matrixWorld/,'the raised optic comes onto the right eye');
  assert.match(xr,/sightPoint\(T,line\.eye,line\.forward/,'mission shots converge on the line of sight');
  assert.match(file('vr.js'),/result\.precision \|\|= !xr &&/,'no hidden precision toggle on the headset sprint grip');
});

test('after an Arena run, chapter 02 launches M02 and chapter 01 the Vesper V7 mission',()=>{
  const game=file('game.js');
  assert.match(game,/for\(const button of document\.querySelectorAll\('\[data-chapter\]'\)\)\{const open=button\.onclick;button\.onclick=event=>\{open\?\.call\(button,event\);selectMode\(button\.dataset\.chapter\);\};\}/);
  assert.match(game,/if\(selectedMode==='campaign2'\)\{openMissionPage\(2\);return;\}/);
  assert.match(game,/if\(selectedMode==='campaign'&&!vr\?\.active&&!new URLSearchParams\(location\.search\)\.has\('classic'\)\)\{openMissionPage\(1\);return;\}/);
  assert.match(game,/mission===2\?'\.\/level2-test\.html':'\.\/vesper-level1-v7\.html'/);
});

test('one version number everywhere on the home page and in the cache keys',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')),home=file('index.html');
  assert.equal(GAME_VERSION,pkg.version);
  assert.match(home,new RegExp(`V\\. ${GAME_VERSION.replace(/\./g,'\\.')} · prêt à lancer`));
  assert.match(home,new RegExp(`PROTOTYPE JOUABLE <b>V\\.${GAME_VERSION.replace(/\./g,'\\.')}</b>`));
  assert.match(file('entry.js'),new RegExp(`game\\.js\\?v=${GAME_VERSION.replace(/\./g,'\\.')}`));
  assert.doesNotMatch(home+file('entry.js'),/3\.63\.2\d/);
});

test('the first-wave Sentinel never stands inside cover: it moves to free ground in plain view',()=>{
  const p={x:0,z:22},block={x:0,z:p.z-14,hx:3,hz:1.5,y:0,height:2.4,cover:true};
  const g=new ArenaGame([block],()=>.5);g.beginWave();g.spawnEnemy();const s=g.enemies.at(-1);
  assert.equal(s.form,'sentinel');
  assert.ok(!(Math.abs(s.x-block.x)<block.hx+s.radius&&Math.abs(s.z-block.z)<block.hz+s.radius),'clear of the cover block');
  assert.equal(g.blocked({x:p.x,y:1.5,z:p.z},{x:s.x,y:2,z:s.z}),false,'visible from the start');
  const open=new ArenaGame([],()=>.5);open.beginWave();open.spawnEnemy();
  assert.deepEqual([open.enemies[0].x,open.enemies[0].z],[0,8],'unchanged on open ground: 14 m ahead');
});
