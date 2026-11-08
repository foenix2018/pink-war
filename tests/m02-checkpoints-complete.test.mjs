import test from 'node:test';import assert from 'node:assert/strict';
import {ArenaGame,starterWeaponOrder} from '../dist/game-logic.js';
import {createM02Extension,readM02Checkpoint,CHECKPOINT_KEY} from '../dist/m02-extension.js';
import {createM02Street,M02_STREET_CHECKPOINTS} from '../dist/m02-street.js';
import * as X from '../dist/m02-extension-layout.js';
import {ensureEnemyBubble} from '../dist/projected-shield-logic.js';
import {configureUnit} from '../dist/ligne9-mission.js';
const memory=()=>{const data=new Map();return{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)}};
function setup(hero='ghju',storage=memory()){
 const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],surfaces:()=>[],height:(x,z,t,max=Infinity)=>{let h=0;for(const floor of X.CEILINGS)if(Math.abs(x-floor.x)<=floor.hx&&Math.abs(z-floor.z)<=floor.hz&&floor.y+floor.height<=max+.01)h=Math.max(h,floor.y+floor.height);if(Math.abs(x)<10&&Math.abs(z+18)<1.5&&max>=12)h=Math.max(h,12);return h;}});g.reset(hero);g.enableArmorShield();g.enableProjectedShields();g.nextWave=Infinity;g.toSpawn=0;
 let ext;const saves=[],street=createM02Street(g,{onStage:(stage,reason)=>{if(reason!=='restore'&&ext?.writeCheckpoint(storage))saves.push(readM02Checkpoint(hero,storage));},deploy:()=>{g.toSpawn=1;g.activePortals=[{x:0,z:22}];g.spawnEnemy();g.toSpawn=0;g.activePortals=[];},onEpilogue:()=>ext.beginEpilogue()});
 ext=createM02Extension(g,{characterId:hero,obstacles:[],hooks:{streetCheckpoint:()=>street.snapshot,core:s=>street.start(s)}});return{g,ext,street,storage,saves};
}
const saved=(stage,more={})=>({version:2,characterId:'ghju',stage,opened:[],done:[],reads:[],restore:[],...more});

test('new mission and every enclosed checkpoint select the floor under the ceiling, never the rooftop',()=>{
 const {g,ext}=setup();ext.start();assert.equal(g.player.elevation,0,'lift ceiling is 3.3 m; spawn must be inside');
 for(const s of Object.values(X.STAGE)){assert.ok(ext.restoreCheckpoint(saved(s.id)));assert.equal(g.player.elevation,0,s.id);assert.equal(g.player.onLift,null);assert.equal(g.player.shieldDeployed,false);}
});
test('all street checkpoints restore their own objective and safe elevation, including the bridge',()=>{
 for(let n=0;n<4;n++){const {g,ext,street,storage}=setup();assert.ok(ext.restoreCheckpoint(saved('x-rue',{streetStage:n,patrolCleared:true})));assert.equal(street.stage,n);assert.deepEqual([g.player.x,g.player.z,g.player.elevation],[M02_STREET_CHECKPOINTS[n].x,M02_STREET_CHECKPOINTS[n].z,M02_STREET_CHECKPOINTS[n].elevation]);assert.ok(ext.writeCheckpoint(storage));assert.equal(readM02Checkpoint('ghju',storage).streetStage,n);assert.ok(ext.opened.includes('grille'));}
});
test('a street fight is restored before it is cleared, and the cleared patrol does not respawn',()=>{
 const {g,ext,street,storage,saves}=setup();ext.restoreCheckpoint(saved('x-rue'));Object.assign(g.player,{x:0,z:53,elevation:0});assert.ok(street.interact());assert.equal(saves.at(-1).streetStage,1);assert.equal(saves.at(-1).patrolCleared,false);assert.equal(g.enemies.length,1);assert.equal(ext.writeCheckpoint(storage),false);
 const retry=setup();retry.ext.restoreCheckpoint(saves.at(-1));assert.equal(retry.g.enemies.length,1);
 for(const enemy of [...g.enemies])g.damageEnemy(enemy,10000,{x:enemy.x,y:1,z:enemy.z});street.update();assert.ok(ext.writeCheckpoint(storage));const clear=readM02Checkpoint('ghju',storage);assert.equal(clear.patrolCleared,true);retry.g.reset();retry.ext.restoreCheckpoint(clear);assert.equal(retry.g.enemies.length,0);
});
test('street progression requires its live patrol and the actual 12 m bridge, then opens the tower',()=>{
 const {g,ext,street}=setup();ext.restoreCheckpoint(saved('x-rue',{streetStage:1,patrolCleared:false}));Object.assign(g.player,{x:-8,z:14,elevation:0});assert.equal(street.interact(),false);g.enemies=[];street.update();assert.ok(street.interact());assert.equal(street.stage,2);
 Object.assign(g.player,{x:0,z:-18,elevation:0});assert.equal(street.interact(),false);g.player.elevation=12;assert.ok(street.interact());assert.equal(street.stage,3);Object.assign(g.player,{x:-5,z:-57,elevation:0});assert.ok(street.interact());assert.equal(ext.stage,'x-tour');assert.ok(ext.opened.includes('tour'));
});
test('save preserves inventory, each DUO magazine, batteries, supplies and the correct hero',()=>{
 const {g,ext,storage}=setup();ext.restoreCheckpoint(saved('x-radio',{done:['registre-soins','batterie'],owned:[0,7,8],weaponIndex:7}));g.ammo[7]=11;g.restoreDualAmmo({left:3,right:8});g.player.hp=73;g.player.shield=27;g.charges=1;
 const pickup=g.pickups.find(p=>p.extension);g.pickups.splice(g.pickups.indexOf(pickup),1);ext.update();assert.ok(ext.writeCheckpoint(storage));const save=readM02Checkpoint('ghju',storage);assert.equal(readM02Checkpoint('lylu',storage),null);const retry=setup();retry.ext.restoreCheckpoint(save);assert.ok(retry.ext.done.includes('batterie'));assert.equal(retry.g.player.hp,73);assert.equal(retry.g.player.shield,27);assert.equal(retry.g.charges,1);assert.deepEqual(retry.g.dual.ammo,{left:3,right:8});assert.ok(!retry.g.pickups.some(p=>p.supplyKey===pickup.supplyKey));assert.equal(retry.ext.restoreCheckpoint({...save,characterId:'lylu'}),false);
 const blue=setup('lylu');blue.ext.restoreCheckpoint({...save,characterId:'lylu'});assert.ok(!blue.g.ownedWeapons.has(7));assert.ok(blue.g.ownedWeapons.has(starterWeaponOrder('lylu')[0]));
});
test('a checkpoint never stores a moving lift, a fall, an active hold, pending reinforcements or a dead player',()=>{
 const {g,ext,storage}=setup();ext.start();for(const patch of [{onLift:'moving'},{verticalSpeed:1},{grounded:false},{hp:0}]){const before={...g.player};Object.assign(g.player,patch);assert.equal(ext.writeCheckpoint(storage),false);Object.assign(g.player,before);}ext.restoreCheckpoint(saved('x-grille'));const it=X.INTERACTIONS.find(i=>i.id==='manivelle');Object.assign(g.player,{x:it.x,z:it.z,elevation:0});assert.ok(ext.interact());assert.equal(ext.writeCheckpoint(storage),false);
});
test('corrupt, future-version and malformed saves are ignored; storage denial does not stop gameplay',()=>{
 const {ext,storage}=setup();for(const value of ['broken',JSON.stringify(saved('x-radio',{done:{}})),JSON.stringify(saved('unknown')),JSON.stringify(saved('x-rue',{streetStage:20})),JSON.stringify(saved('x-radio',{version:99}))]){storage.setItem(CHECKPOINT_KEY+'ghju',value);assert.equal(readM02Checkpoint('ghju',storage),null);}assert.equal(ext.restoreCheckpoint(saved('x-radio',{opened:{}})),false);ext.start();assert.equal(ext.writeCheckpoint({setItem(){throw Error('storage denied')}}),false);assert.equal(ext.checkpointStorageError,true);
});
test('final checkpoint reopens the convoy and returns to the choice instead of restarting the 50 second hold',()=>{
 const {g,ext,storage}=setup();ext.restoreCheckpoint(saved('x-fin'));assert.ok(ext.opened.includes('convoi'));assert.ok(!g.obstacles.some(o=>o.door==='convoi'));assert.ok(ext.writeCheckpoint(storage));const save=readM02Checkpoint('ghju',storage);assert.equal(save.stage,'x-fin');let finales=0;const retry=createM02Extension(g,{hooks:{finale:()=>finales++}});retry.restoreCheckpoint(save);retry.update();retry.update();assert.equal(finales,1);assert.equal(retry.hold,null);
});
test('a required device cannot be operated through a closed room wall',()=>{
 const {g,ext}=setup();ext.restoreCheckpoint(saved('x-radio'));Object.assign(g.player,{x:27.8,z:87.4,elevation:0});assert.notEqual(ext.interaction()?.id,'batterie');g.player.x=31;assert.equal(ext.interaction()?.id,'batterie');
});
test('authored synths cannot inherit a random Brute bubble from the generic spawner',()=>{
 const e={form:'brute',x:0,z:0};ensureEnemyBubble(e);assert.equal(e.shield,60);configureUnit(e,{form:'synth',x:1,z:1},3);ensureEnemyBubble(e);assert.equal(e.shield,0);assert.equal(e.shieldCapacity,0);configureUnit(e,{form:'brute',x:1,z:1},3);ensureEnemyBubble(e);assert.equal(e.shield,60);
});
