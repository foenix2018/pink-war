import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory,ENEMY_PROFILES} from '../dist/enemies.js';
import {ArenaGame} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {RoomGame} from '../dist/room-game.js';
import {rangedMuzzle,enemyDurability,enemyScale,aimReco1,enemySightPoint} from '../dist/enemy-combat.js';
import {RECO1,RECO1_WEAPON} from '../dist/reco1-profile.js';
import {ENEMY_OPTICS} from '../dist/enemy-alert.js';
const mats=()=>Object.fromEntries(['monster','monsterFace','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
const factory=createEnemyFactory(mats()),model=()=>factory.create(false,true,'seer');
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function fixture(extra={}){return {id:99,form:'seer',x:0,z:-8,elevation:0,yaw:0,hp:750,tier:1,speed:0,radius:.45,stunnedUntil:1e6,limpUntil:0,attackTimer:9,ranged:true,awareness:'engaged',grounded:true,aimHeight:1.16,...extra};}
function setup(){const g=new ArenaGame([],()=>.5);g.nextWave=Infinity;g.toSpawn=0;g.ownedWeapons.add(0);g.selectWeapon(0);Object.assign(g.player,{x:0,z:0,elevation:0});return g;}
function shoot(g,e,y){g.cooldown=0;g.reloadRemaining=0;g.ammo[0]=12;assert.equal(g.shoot({x:0,y,z:0},{x:0,y:0,z:-1}),true);for(let i=0;i<10;i++)g.step(.01,{});}

test('RECO1 keeps the same bore and projectile direction with tracked room height and scale',()=>{
 const room={trace:()=>null,canStand:()=>true,coverBoxes:()=>[],floorAt:()=>0};
 const g=new RoomGame(room,()=>.5);g.head={x:.3,y:1.4,z:0};g.player.elevation=0;
 const e=fixture({stunnedUntil:0,attackTimer:0,roomScale:.8,groundY:0});g.enemies=[e];g.moveEnemies(.01);
 const bullet=g.bullets.find(b=>b.hostile);assert.ok(bullet);
 const m=model();m.scale.multiplyScalar(e.roomScale);m.position.set(e.x,e.elevation,e.z);m.rotation.y=e.yaw;m.userData.animate(1,0,false,e,g.time);
 const bore=m.userData.muzzle(),velocity=new T.Vector3(bullet.vx,bullet.vy,bullet.vz).normalize();
 assert.ok(bore.origin.distanceTo(new T.Vector3(bullet.x,bullet.y,bullet.z))<1e-6);assert.ok(bore.direction.dot(velocity)>1-1e-9);
 const hp=g.player.hp;for(let i=0;i<140;i++)g.moveBullets(.01);assert.ok(g.player.hp<hp);
});

test('RECO1 replaces the lightweight Sentinel through the shared factory in campaign and Arena',()=>{
 const g=setup();g.beginWave();for(let i=0;i<3;i++)g.spawnEnemy();const e=g.enemies.find(e=>e.form==='seer');assert.ok(e);assert.equal(e.hp,750);
 const m=factory.create(e.elite,e.ranged,e.form);assert.match(m.name,/RECO1/);assert.equal(m.userData.reco1,true);assert.match(ENEMY_PROFILES.seer.name,/RECO1/);
 const campaign=new CampaignLevel1([],()=>.5);const c=campaign.makeEnemy('seer',{id:1,x:0,z:-8,yaw:0});assert.equal(c.hp,enemyDurability(1+campaign.encounter,'seer'));assert.equal(c.ranged,true);
 assert.ok(enemyDurability(10,'seer')>enemyDurability(1,'seer'));assert.ok(enemyDurability(1,'seer',true)>750);
});
test('approved armour is shared, GPU-skinned, finite, and bounded; each enemy owns its native RLH pose',()=>{
 const a=model(),b=model(),aa=a.getObjectsByProperty('isSkinnedMesh',true),bb=b.getObjectsByProperty('isSkinnedMesh',true);
 assert.equal(a.userData.nativeSkeleton.bones.length,41);assert.equal(a.userData.skeleton.bones.length,18);assert.equal(aa.length,17);assert.ok(a.userData.modelStats.triangles<60000);
 assert.notEqual(a.userData.skeleton,b.userData.skeleton);assert.notEqual(a.userData.reco1Pose.mixer,b.userData.reco1Pose.mixer);assert.equal(a.getObjectsByProperty('isLight',true).length,0);
 aa.forEach((m,i)=>{assert.equal(m.geometry,bb[i].geometry);assert.equal(m.bindMode,T.DetachedBindMode);for(const x of m.geometry.attributes.position.array)assert.ok(Number.isFinite(x));const w=m.geometry.attributes.skinWeight;for(let k=0;k<w.count;k++)close(w.getX(k)+w.getY(k)+w.getZ(k)+w.getW(k),1);});
 const q=b.userData.nativeSkeleton.bones.map(b=>b.quaternion.toArray());for(let i=0;i<90;i++)a.userData.animate(i/30,0,true,{x:0,z:-i*.05,awareness:'engaged',ranged:true},i/30);
 assert.deepEqual(b.userData.nativeSkeleton.bones.map(b=>b.quaternion.toArray()),q);assert.equal(a.userData.nativeMotion,'walkRifle');
});
test('actual displacement selects native walking/running and standing settles to rifle, with planted support',()=>{
 const r=model();for(let i=0;i<=90;i++){r.position.z=-i*.11;r.userData.animate(i/30,0,true,{x:0,z:r.position.z,awareness:'engaged',ranged:true},i/30);}
 assert.equal(r.userData.nativeMotion,'run');assert.ok(r.userData.reco1Pose.diagnostics().soleY>=-1e-5);
 for(let i=91;i<200;i++)r.userData.animate(i/30,0,true,{x:0,z:r.position.z,awareness:'engaged',ranged:true},i/30);
 assert.equal(r.userData.motionSpeed,0);assert.equal(r.userData.nativeMotion,'rifle');close(r.userData.reco1Pose.diagnostics().soleY,0);
});
test('rendered bore and physical projectile origin coincide through pitch, yaw, elevation, cover, elite and room scales',()=>{
 for(const elite of [false,true]){
  const r=factory.create(elite,true,'seer');
  for(const pitch of [-1.2,-.5,0,.7,1.3])for(const yaw of [-.3,0,.4])for(const crouch of [0,.8,1.25]){
   const e=fixture({elite,x:3,z:-6,elevation:2.4,yaw:.7,aimPitch:pitch,aimYaw:yaw,coverCrouch:crouch,roomScale:.72});
   r.position.set(e.x,e.elevation,e.z);r.rotation.y=e.yaw;r.scale.setScalar(enemyScale('seer',elite)*e.roomScale);r.userData.animate(1,0,true,e,1);r.updateMatrixWorld(true);
   const shown=r.userData.muzzle().origin,real=rangedMuzzle(e);assert.ok(shown.distanceTo(new T.Vector3(real.x,real.y,real.z))<1e-6);assert.ok(r.userData.reco1Pose.diagnostics().gripError<.005);
  }
 }
});
test('enemy bullets leave the real bore, point at the player and take health on a clear firing lane',()=>{
 const g=setup(),e=fixture({z:-14,yaw:Math.PI,stunnedUntil:0,attackTimer:0});g.enemies=[e];g.step(.01,{});
 const event=g.drainEvents().find(e=>e.type==='enemy-shot'),bullet=g.bullets.find(b=>b.hostile);assert.ok(event&&bullet);
 const r=model();r.position.set(e.x,e.elevation,e.z);r.rotation.y=e.yaw;r.userData.animate(g.time,0,true,e,g.time);r.updateMatrixWorld(true);const bore=r.userData.muzzle();assert.ok(bore.origin.distanceTo(new T.Vector3(event.x,event.y,event.z))<1e-6);assert.ok(bore.direction.dot(new T.Vector3(bullet.vx,bullet.vy,bullet.vz).normalize())>.999999);
 for(let i=0;i<70;i++)g.step(.01,{});assert.ok(g.player.hp<100);
});
test('cover blocks RECO1 sight and shots, and aiming solutions do not seek a concealed live player',()=>{
 const g=setup(),e=fixture({z:-14,yaw:Math.PI,stunnedUntil:0,attackTimer:0,aimPitch:.1,aimYaw:0});g.enemies=[e];g.replaceObstacles([{x:0,z:-7,hx:3,hz:.5,height:3}]);
 for(let i=0;i<120;i++)g.step(.01,{});assert.equal(g.bullets.filter(b=>b.hostile).length,0);assert.equal(g.player.hp,100);close(e.aimPitch,.1);assert.notEqual(e.awareness,'engaged');
});
test('real R9 chest shots lose half their damage; exposed optics are weaker and the unit is still killable',()=>{
 const g=setup(),e=fixture();g.enemies=[e];shoot(g,e,1.16);close(e.hp,750-12);const torso=g.drainEvents().find(e=>e.type==='hit');close(torso.damage,12);
 const h=setup(),sensor=fixture();h.enemies=[sensor];shoot(h,sensor,RECO1.sensorY);close(sensor.hp,750-24*2.5*.8);assert.ok(750-sensor.hp>750-e.hp);
 for(let i=0;i<62;i++)shoot(g,e,1.16);assert.equal(g.enemies.length,0);assert.equal(g.kills,1);assert.ok(g.drainEvents().some(e=>e.type==='kill'));
});
test('armour does not weaken melee, and other chassis keep their original projectile damage',()=>{
 const g=setup(),e=fixture(),other=fixture({id:88,form:'stalker'});g.enemies=[e];g.damageEnemy(e,80,{x:0,y:1.1,z:-8},'torso',1);close(e.hp,670);
 const h=setup();h.enemies=[other];shoot(h,other,1.27);close(other.hp,726);
});
test('optics react independently to perception while all body buffers and body materials remain shared',()=>{
 const a=model(),b=model();a.userData.animate(1,0,false,{awareness:'engaged'},1);b.userData.animate(1,0,false,{awareness:'patrol'},1);
 assert.equal(a.userData.optics.color.getHex(),ENEMY_OPTICS.engaged);assert.equal(b.userData.optics.color.getHex(),ENEMY_OPTICS.idle);assert.notEqual(a.userData.optics,b.userData.optics);
 const aa=a.getObjectsByProperty('isSkinnedMesh',true),bb=b.getObjectsByProperty('isSkinnedMesh',true);for(let i=0;i<aa.length;i++)if(!['lens','tiny','optics'].includes(aa[i].material.userData.reco1Key))assert.equal(aa[i].material,bb[i].material);
});

test('a paused crouched pose never accumulates hip lowering or detaches its support hand',()=>{
 const r=model(),e=fixture({coverCrouch:1.2,stunnedUntil:0});r.userData.animate(1,0,true,e,1);const y=r.userData.reco1Pose.bones.get('mixamorigHips').position.y;
 for(let i=0;i<100;i++)r.userData.animate(1,0,true,e,1);
 close(r.userData.reco1Pose.bones.get('mixamorigHips').position.y,y);close(r.userData.reco1Pose.diagnostics().soleY,0);assert.ok(r.userData.reco1Pose.diagnostics().gripError<.005);
});
