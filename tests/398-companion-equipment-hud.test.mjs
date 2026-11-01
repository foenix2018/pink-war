import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatEquipmentState,combatHudState} from '../dist/combat-hud.js';
const read=file=>readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');

test('GAB-1 presents only unlocked GHJU weapons in preferred order with their own ammo',()=>{
 const ammo=Array.from({length:9},(_,i)=>i+3);
 const game={characterId:'ghju',state:'playing',weaponIndex:8,ownedWeapons:new Set([0,7,8]),ammo,charges:2};
 const snapshot=combatEquipmentState(game);
 assert.deepEqual(snapshot.weapons.map(w=>w.index),[7,8,0]);
 assert.equal(snapshot.weapons[1].name,'VORTEX AR-7');
 assert.equal(snapshot.weapons[1].ammo,11);
 assert.equal(snapshot.charges,2);
 assert.equal(snapshot.weaponIndex,8);
 assert.deepEqual([...game.ownedWeapons].sort(),[0,7,8]);
});

test('CAR-14 cannot offer GHJU-only dual pistols, and uses LYLU first weapon',()=>{
 const game={characterId:'lylu',state:'playing',weaponIndex:6,ownedWeapons:new Set([7,6,8,0]),ammo:Array(9).fill(8),charges:1};
 const snapshot=combatEquipmentState(game,'lylu');
 assert.deepEqual(snapshot.weapons.map(w=>w.index),[6,8,0]);
 assert.equal(snapshot.hero,'lylu');
 assert.equal(snapshot.charges,1);
});

test('empty inventory and uninitialized state stay safe',()=>{
 assert.deepEqual(combatEquipmentState(null).weapons,[]);
 assert.equal(combatEquipmentState(null).charges,0);
 assert.equal(combatEquipmentState({charges:-3,ownedWeapons:new Set(),ammo:[]}).charges,0);
});

test('tactical UI connects to real selectWeapon/charge without changing the shared ammo reader',()=>{
 const hud=read('combat-hud.js'),css=read('combat-hud.css'),xr=read('companion-menu.js');
 assert.match(hud,/game\.selectWeapon\(index\)/);
 assert.match(hud,/command\('charge'\)/);
 assert.match(hud,/class="pw-hud-companion/);
 assert.match(hud,/paintCompanionPortrait/);
 assert.match(hud,/currentGame=game/);
 assert.match(css,/\.pw-hud \.pw-hud-vitals\{top:var\(--pw-top\)/);
 assert.match(css,/\.pw-hud \.pw-hud-arms,\.pw-hud\.pw-actions-open \.pw-hud-arms\{top:var\(--pw-top\)!important/);
 assert.match(css,/body\.pw-unified-hud \.pw-companion-toggle\{display:none!important\}/);
 assert.match(xr,/getActiveCombatHud\(\)/);
 assert.match(xr,/hud\?\.chooseWeapon\(w\.index\)/);
 assert.match(xr,/hud\?\.throwGrenade\(\)/);
 assert.match(xr,/xr\.tab==='skills'/);
});

test('normal health and ammo snapshot remains independent of the tactical panel',()=>{
 const g={player:{hp:71,shield:45},weapon:{name:'VORTEX AR-7',capacity:36,reload:1.95},weaponIndex:8,
  ammo:[0,0,0,0,0,0,0,0,19],reloadRemaining:0,shieldCapacity:60};
 const snapshot=combatHudState(g);
 assert.equal(snapshot.hp,71);assert.equal(snapshot.ammo,19);assert.equal(snapshot.capacity,36);assert.equal(snapshot.shield,45);
});
