import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { createGlove } from '../dist/hands.js';
import { createCharacterKit } from '../dist/soldier.js';
import { createWeaponModels } from '../dist/weapons.js';
import { createHomeBattlefield } from '../dist/home-battlefield.js';
import { RoomGame } from '../dist/room-game.js';
import { segmentBox } from '../dist/game-logic.js';

function field(){
 const cover={x:1.4,z:-.9,hx:.7,hz:.6,height:.9},bounds={minX:-4,maxX:4,minZ:-3,maxZ:3,floorY:0};let scanned=true,seed=78;
 const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const room={hasFloor:()=>scanned,floorAt:()=>0,canStand:p=>!(Math.abs(p.x-cover.x)<1&&Math.abs(p.z-cover.z)<.9),
  trace:(a,b)=>{const t=segmentBox(a,b,cover);return t===null?null:{t,surface:'metal'};},findPoint:()=>({x:-.8,y:0,z:0})};
 const f=createHomeBattlefield({room,random});f.setRoom(bounds);return {f,setScan:v=>scanned=v};
}
test('both RLH cuffs continue the palm axis without a bent wrist while fingers still move',()=>{
 const k=createCharacterKit(new T.Texture());for(const mirror of [false,true]){
  const hand=createGlove(k.gloves,{mirror}),model=hand.userData.rlh,rig=hand.userData.rig;
  hand.userData.extendForearm();assert.equal(hand.userData.extendedForearm.parent,rig.forearm);
  for(const pose of [{relax:1},{trigger:1,grip:1},{reload:1}]){
   hand.userData.animate(pose,1);hand.updateMatrixWorld(true);
   const palm=new T.Vector3(0,1,0).transformDirection(model.matrixWorld),cuff=new T.Vector3(0,-1,0).transformDirection(rig.forearm.matrixWorld);
   assert.ok(palm.dot(cuff)<-.999,'palm and cuff are on the same anatomical line');assert.ok(rig.poignet.quaternion.angleTo(new T.Quaternion())<1e-8);
  }
 }
});
test('metallic gun shells share reflections and palette changes without changing character materials',()=>{
 const env=new T.Texture(),source=Object.fromEntries(['steel','dark','armor','armorLight'].map(n=>[n,new T.MeshStandardMaterial({color:0x657580,envMap:env,metalness:.3,roughness:.7})]));
 for(const n of ['rose','pale','violet','cyan'])source[n]=new T.MeshBasicMaterial({color:0xff80b2});
 // VX-9 utilise désormais son maillage V5; THORN vérifie toujours la palette métal procédurale.
 const models=createWeaponModels(source),steel=models[3].children.find(m=>m.material?.name==='Weapon metal — steel').material;
 assert.ok(steel.metalness>.85&&steel.roughness<.3);assert.equal(steel.envMap,env);assert.equal(source.steel.metalness,.3);
 source.steel.color.setHex(0x99aabb);assert.equal(steel.color.getHex(),0x99aabb);
 assert.equal(models[3].children[0].geometry,createWeaponModels(source)[3].children[0].geometry);
});
test('outdoor breaches remain distant and enemies emerge at those breaches instead of beside the headset',()=>{
 const {f}=field(),head={x:0,y:1.65,z:0},portals=[];
 for(let i=0;i<3;i++){const p=f.findPoint({purpose:'portal',head,avoid:portals});assert.ok(p);assert.ok(Math.hypot(p.x,p.z)>=15);portals.push(p);}
 const gate={...portals[0],elevation:portals[0].y},enemy=f.findPoint({purpose:'enemy',head,portal:gate});assert.ok(enemy);assert.ok(Math.hypot(enemy.x-gate.x,enemy.z-gate.z)<.8);
 assert.ok(f.canStand(enemy));assert.equal(f.canStand({x:1.4,y:0,z:-.9}),false);
 const pickup=f.findPoint({purpose:'weapon',head});assert.ok(Math.abs(pickup.x)<4&&Math.abs(pickup.z)<3);
 const anchor={...f.stats().center};f.setRoom({minX:-8,maxX:4,minZ:-3,maxZ:3,floorY:2.8});assert.deepEqual(f.stats().center,anchor,'walking into a new scanned area must not recenter or lift the world');
});
test('the outdoor battle keeps native player coordinates and approaches through the open field',()=>{
 const {f}=field(),g=new RoomGame(f,()=>.5);g.start({x:0,y:1.65,z:0});g.beginWave();
 for(let i=0;i<120;i++)g.step(.02);assert.ok(g.enemies.length);const enemy=g.enemies[0],initial=Math.hypot(enemy.x,enemy.z);enemy.attackTimer=999;
 for(let i=0;i<100;i++)g.step(.02);assert.ok(Math.hypot(enemy.x,enemy.z)<initial-1);assert.equal(g.player.x,0);assert.equal(g.head.y,1.65);
});
test('virtual buildings and scanned low furniture stop projectiles; no scan or an occluded breach never gives a nearby fallback',()=>{
 const {f,setScan}=field();assert.ok(f.trace({x:1.4,y:.6,z:-2},{x:1.4,y:.6,z:0}));
 setScan(false);assert.equal(f.findPoint({purpose:'portal',head:{x:0,y:1.65,z:0}}),null);
 const blocked=createHomeBattlefield({room:{hasFloor:()=>true,canStand:()=>true,trace:()=>({t:.2}),floorAt:()=>0,findPoint:()=>null}});
 blocked.setRoom({minX:-2,maxX:2,minZ:-2,maxZ:2,floorY:0});assert.equal(blocked.findPoint({purpose:'portal',head:{x:0,y:1.65,z:0}}),null);
 const wall=createHomeBattlefield({room:{hasFloor:()=>true,canStand:()=>true,trace:()=>null,floorAt:()=>0,findPoint:()=>null},obstacles:()=>[{x:0,z:-10,hx:2,hz:.3,height:4}]});
 wall.setRoom({minX:-2,maxX:2,minZ:-2,maxZ:2,floorY:0});assert.ok(wall.trace({x:0,y:1.5,z:0},{x:0,y:1.5,z:-20}));
 wall.resetRoom();assert.equal(wall.stats().center,null);assert.equal(wall.findPoint({purpose:'portal',head:{x:0,y:1.65,z:0}}),null);
 const material=new T.MeshBasicMaterial({visible:false,colorWrite:false,depthWrite:false}),mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);mesh.updateMatrixWorld(true);
 assert.equal(new T.Raycaster(new T.Vector3(0,0,2),new T.Vector3(0,0,-1)).intersectObject(mesh).length>0,true,'non-rendered scan colliders still stop rays');
});
