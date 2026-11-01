import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weaponCycleOrder,WEAPONS} from '../dist/game-logic.js';
import {combatHudState} from '../dist/combat-hud.js';
const read=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('health/shield and ammunition remain driven by the real game simulation',()=>{
 const s=combatHudState({player:{hp:72,shield:48},shieldCapacity:60,
   ammo:[12,24,5],weapon:WEAPONS[1],weaponIndex:1,charges:2,reloadRemaining:0});
 assert.equal(s.hp,72);assert.equal(s.shield,48);assert.equal(s.ammo,24);
 assert.equal(s.capacity,24);assert.equal(s.charges,2);
});
test('top left health, top right ammo, companion portrait and safe-area layout',()=>{
 const js=read('combat-hud.js'),css=read('combat-hud.css');
 assert.match(js,/pw-hud-vitals pw-glass/);
 assert.match(js,/pw-hud-arms pw-glass/);
 assert.match(css,/\.pw-hud \.pw-hud-vitals\{top:calc\(var\(--pw-top\)/);
 assert.match(css,/\.pw-hud \.pw-hud-arms\{top:calc\(var\(--pw-top\)/);
 assert.match(css,/bottom:auto!important/);
 assert.match(css,/safe-area-inset/);
 assert.match(js,/gaby-front\.webp/);
 assert.match(js,/cara-front\.webp/);
 assert.match(js,/GAB-1/);
 assert.match(js,/CAR-14/);
});
test('the arsenal exposes only equipped weapons and connects true impulse charges',()=>{
 const js=read('combat-hud.js'),m1=read('game.js'),m2=read('level2-test.js');
 assert.match(js,/weaponCycleOrder\(owned,hero\)/);
 assert.match(js,/weapon\.name/);
 assert.match(js,/command\('weapon',index\)/);
 assert.match(js,/data-armor="charge"/);
 assert.match(js,/game\?\.charges/);
 assert.match(m1,/game\?\.selectWeapon\(Number\(value\)\)/);
 assert.match(m2,/game\?\.selectWeapon\(Number\(value\)\)/);
 assert.match(m1,/chargeQueued=true/);
 assert.match(m2,/chargeQueued=true/);
 assert.equal(weaponCycleOrder(new Set([0,7,8]),'ghju').join(','),'7,8,0');
 assert.equal(weaponCycleOrder(new Set([0,7,8]),'lylu').join(','),'8,0','dual pistol not selectable by LYLU');
});
test('production mission 1 Vesper page uses the new HUD actions, not an unrelated showroom',()=>{
 const page=read('vesper-level1-v7.html'),motor=read('vesper-combat.js');
 assert.match(page,/combatWorld\?\.toggleArsenal\?\.\(\)/);
 assert.match(page,/combatWorld\?\.pollArsenalGamepad\?\.\(\)/);
 assert.match(page,/!combatWorld\?\.arsenalOpen/);
 assert.match(motor,/kind==='weapon'\)api\.select\(Number\(value\)\)/);
 assert.match(motor,/get arsenalOpen\(\)/);
 assert.match(motor,/pollArsenalGamepad\(\)/);
 assert.match(motor,/combatHud\?\.isArsenalOpen/);
});
test('PS4 triangle opens arsenal on flat screen while Quest VR keeps original weapon switching',()=>{
 const js=read('combat-hud.js'),vr=read('vr.js'),m1=read('game.js'),m2=read('level2-test.js');
 assert.match(vr,/!xr && this\.hooks\.openArsenal/);
 assert.match(vr,/game\.cycleWeapon\(1\) && xr/);
 assert.match(vr,/this\.hooks\.arsenalInputFrame/);
 assert.match(js,/edge\(12\)/);
 assert.match(js,/edge\(13\)/);
 assert.match(js,/edge\(0\)/);
 assert.match(js,/edge\(1\)/);
 assert.match(m1,/arsenalConsumedFrame/);
 assert.match(m2,/if\(arsenalControllerFrame\)return/);
 assert.match(m2,/controls\.next&&!xr\?\.active/);
});
test('portrait click replaces swap button without removing reload, FPS aiming or companion skills',()=>{
 const js=read('combat-hud.js'),css=read('combat-hud.css');
 assert.match(js,/class="pw-hud-companion/);
 assert.match(js,/pw-hud-weapon-grid/);
 assert.match(js,/pw-hud-partner-skill/);
 assert.match(js,/data-hud-action="reload"/);
 assert.doesNotMatch(js,/class="pw-hud-swap"/);
 assert.match(css,/pw-hud-companion-photo/);
 assert.match(js,/setCharacter\(id\)/);
 assert.match(js,/setArsenalOpen\(false\)/);
 assert.match(js,/doc\.removeEventListener\('pointerdown'/);
});
