import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
import {RoomGame} from '../dist/room-game.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {writeM01Checkpoint,readM01Checkpoint,restoreM01Checkpoint} from '../dist/m01-checkpoint.js';
import {buildGun} from '../dist/weapons.js';
import {createCharacterKit} from '../dist/soldier.js';
import {SHOT_RADIUS} from '../dist/hearing.js';

const p={left:{x:-.3,y:1.4,z:0},right:{x:.3,y:1.4,z:0}},forward={x:0,y:0,z:-1};
function game(){const g=new ArenaGame([],()=>.5);g.nextWave=-1;g.toSpawn=0;return g;}
function weapon(){const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial()]));return buildGun({mats,gloves:kit.gloves,makeFlash:parent=>{const f=new T.Object3D();parent.add(f);return f;}});}

test('both tracked pistols fire independently in the same frame from different muzzles, with no guidance',()=>{
 const g=game(),leftAim={x:1,y:0,z:0};
 assert.equal(g.weapon.id,'duor9');assert.equal(g.ammo[7],24);assert.equal(SHOT_RADIUS.duor9,SHOT_RADIUS.r9);
 assert.equal(g.triggerHand('right',true,.016,p.right,forward),true);
 assert.equal(g.triggerHand('left',true,.016,p.left,leftAim),true);
 assert.deepEqual(g.dual.ammo,{left:11,right:11});assert.equal(g.ammo[7],22);
 const events=g.drainEvents().filter(e=>e.type==='shot');assert.deepEqual(events.map(e=>e.hand),['right','left']);
 assert.deepEqual(events[0].origin,p.right);assert.deepEqual(events[1].origin,p.left);
 assert.equal(g.bullets[0].vx,0);assert.equal(g.bullets[1].vz,0);assert.equal(g.bullets[1].vx,WEAPONS[7].speed);
 assert.equal(g.triggerHand('left',true,.016,p.left,leftAim),false,'same-hand cadence cannot be bypassed');
 assert.equal(g.ammo[7],22);
});
test('one empty pistol leaves the other usable; reload locks both and restores 12 + 12',()=>{
 const g=game();for(let i=0;i<12;i++){assert.equal(g.triggerHand('left',true,.016,p.left,forward),true);g.time+=.21;}
 assert.deepEqual(g.dual.ammo,{left:0,right:12});assert.equal(g.ammo[7],12);assert.equal(g.reloadRemaining,0);
 assert.equal(g.triggerHand('left',true,.016,p.left,forward),false);
 assert.equal(g.triggerHand('right',true,.016,p.right,forward),true);
 assert.equal(g.reload(),true);assert.equal(g.triggerHand('right',true,.016,p.right,forward),false);
 for(let i=0;i<35;i++)g.step(.05);
 assert.equal(g.ammo[7],24);assert.deepEqual(g.dual.ammo,{left:12,right:12});
});
test('screen fire alternates real muzzles and never spends two cells for one projectile',()=>{
 const g=game();for(let i=0;i<10;i++){const hand=g.nextDualHand;g.trigger(true,.016,p[hand],forward);g.time+=.11;}
 const events=g.drainEvents().filter(e=>e.type==='shot');assert.equal(events.length,10);
 assert.deepEqual(events.map(e=>e.hand),['right','left','right','left','right','left','right','left','right','left']);
 for(const e of events)assert.deepEqual(e.origin,p[e.hand]);assert.equal(g.ammo[7],14);assert.deepEqual(g.dual.ammo,{left:7,right:7});
 g.selectWeapon(0);g.selectWeapon(7);assert.equal(g.shoot(p.right,forward),false,'equip delay also locks dual pistols');
});
test('AT HOME keeps each pistol inside room cover, and cannot fire after stopping the scenario',()=>{
 const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>12,trace:(a,b)=>b.x<0?{t:.5}:null};
 const g=new RoomGame(room,()=>.5,'ghju');g.start({x:0,y:1.6,z:0});
 assert.equal(g.triggerHand('left',true,.016,p.left,forward),false);assert.equal(g.triggerHand('right',true,.016,p.right,forward),true);
 g.stop();g.time+=1;assert.equal(g.triggerHand('right',true,.016,p.right,forward),false);assert.equal(g.ammo[7],23);
});
test('checkpoints preserve uneven magazines and upgrade the legacy GHJU starter without removing mission weapons',()=>{
 const storage=new Map(),io={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},a=new CampaignLevel1([],()=>.5,'ghju');
 a.enemies=[];a.toSpawn=0;a.player.grounded=true;a.setStage('investigation');a.dual.ammo={left:8,right:11};a.ammo[7]=19;
 assert.equal(writeM01Checkpoint(a,io),true);const b=new CampaignLevel1([],()=>.5,'ghju');assert.equal(restoreM01Checkpoint(b,readM01Checkpoint('ghju',io)),true);
 assert.equal(b.weaponIndex,7);assert.deepEqual(b.dual.ammo,{left:8,right:11});assert.equal(b.ammo[7],19);
 const legacy={version:1,characterId:'ghju',stage:'sabotage',kills:24,weaponIndex:0,owned:[0,1],ammo:[4,12,5,6,4,0],health:68};
 assert.equal(restoreM01Checkpoint(b,legacy),true);assert.equal(b.weaponIndex,7);assert.ok(b.ownedWeapons.has(1));
});
test('DUO keeps both approved gloves on their grips, with independent recoil and one pistol per tracked controller',()=>{
 const g=weapon(),state={shotAt:{left:-Infinity,right:1}};g.userData.setVariant(7);
 assert.equal(g.userData.support.visible,true);assert.notEqual(g.userData.hand.userData.skeleton,g.userData.support.userData.skeleton);
 g.userData.setCombatState({time:1.03,dualState:state});g.userData.setFlash(true,1.03);g.updateMatrixWorld(true);
 assert.equal(g.userData.flash.visible,true);assert.equal(g.userData.flashFor('left').visible,false);
 assert.ok(g.userData.flash.getWorldPosition(new T.Vector3()).x>.4+g.userData.flashFor('left').getWorldPosition(new T.Vector3()).x);
 const r=g.userData.hand.parent,l=g.userData.support.parent;assert.ok(r.position.z>0);assert.equal(l.position.z,0);
 g.userData.showSupport=false;g.userData.setVariant(7);g.userData.setCombatState({time:1.03,dualState:state});assert.equal(g.userData.dualLeft.visible,false);
 g.userData.setVariant(0);assert.equal(g.userData.hand.parent,g);assert.equal(g.userData.support.visible,false);g.userData.disposeDynamic();
});
