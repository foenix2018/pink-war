import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.core.min.js';
import {ShootingRangeGame,TRAINING_BARRIER} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {upgradeKenneyWeapon} from '../dist/kenney-blasters.js';
import {WEAPON_FRAME} from '../dist/weapons.js';

test('the selected firearm is equipped at the start of a shooting-range session',()=>{
 for(let i=0;i<5;i++){
   const g=new ShootingRangeGame([],()=>.5,i);
   assert.equal(g.weaponIndex,i);
   assert.equal(g.mode,'training');
   assert.ok(g.ownedWeapons.has(i));
 }
 assert.equal(new ShootingRangeGame([],()=>.5,22).weaponIndex,0);
});

test('the waist-high rail blocks movement even with sprinting and jumping',()=>{
 const art=createShootingRangeArt(T,new T.Scene());
 const rail=art.root.children.find(c=>c.name==='GARDE-CORPS DE SÉCURITÉ / TRAVERSE TAILLE');
 assert.ok(rail);
 assert.ok(rail.position.y>.9&&rail.position.y<1.12);
 assert.ok(Math.abs(rail.position.z-TRAINING_BARRIER.z)<.0001);
 assert.ok(art.obstacles.some(b=>Math.abs(b.z-TRAINING_BARRIER.z)<.001&&b.height<=1.15));
 const g=new ShootingRangeGame(art.obstacles,()=>.5,2);
 for(let i=0;i<180;i++)g.step(.05,{yaw:0,z:-1,sprint:true,jump:i%11===0});
 assert.ok(g.player.z>=TRAINING_BARRIER.stopZ-.00001,'a player cannot run or jump onto the live lanes');
 assert.ok(g.player.z<=22,'the player can approach the line of fire');
 art.dispose();
});

test('five-sided shooting booth has lane partitions, industrial ceiling and a backstop',()=>{
 const art=createShootingRangeArt(T,new T.Scene());
 const nodes=art.root.children.map(x=>x.name);
 assert.ok(nodes.filter(x=>x==='Séparateur des postes de tir').length>=10);
 assert.ok(nodes.includes('Plafond pare-balles acoustique'));
 assert.ok(nodes.includes('Mur arrêt-tirs'));
 assert.ok(nodes.includes('Piège à balles')||nodes.includes('Blindage arrière des couloirs'));
 art.dispose();
});

test('every Kenney firearm receives non-floating tactical details centered on its muzzle',()=>{
 for(let i=0;i<5;i++){
   const group=new T.Group();
   const upgrade=upgradeKenneyWeapon(group,WEAPON_FRAME[i],i);
   assert.ok(upgrade?.children.length>=15);
   const ring=upgrade.children.find(x=>x.name==='Emitter luminescent ring');
   assert.ok(ring);
   assert.ok(Math.abs(ring.position.z-WEAPON_FRAME[i].muzzle[2])<.01);
   assert.ok(upgrade.children.some(x=>x.name==='Grip reinforcement'));
 }
});

test('the weapon selection is visible before a session and respects direct VR boot',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const entry=readFileSync(new URL('../dist/entry.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 const vr=readFileSync(new URL('../dist/vr.js',import.meta.url),'utf8');
 assert.equal((html.match(/data-training-weapon="[0-4]"/g)||[]).length,5);
 assert.ok(entry.includes('trainingWeaponIndex:trainingWeapon'));
 assert.ok(main.includes('new ShootingRangeGame(world.obstacles,Math.random,trainingWeaponIndex)'));
 assert.ok(vr.includes('world.createGun({sleeve:false})'));
 assert.ok(vr.includes('world.createHand({sleeve:false})'));
 assert.ok(!vr.includes('userData.extendForearm()'));
});
