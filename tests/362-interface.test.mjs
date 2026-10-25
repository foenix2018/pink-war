import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatHudState} from '../dist/combat-hud.js';
import {flatSightPose} from '../dist/optics.js';
import {OPTICS} from '../dist/weapons.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const game=(extra={})=>({player:{hp:100},weapon:{name:'M–12',capacity:8,reload:1.6},ammo:[0,0,0,0,0,0,8],weaponIndex:6,reloadRemaining:0,...extra});

test('the shared HUD reads the same state in every mode: health, the weapon in hand, and only the states that apply',()=>{
  let s=combatHudState(game());
  assert.deepEqual([s.hp,s.ammo,s.capacity,s.weapon,s.critical,s.reloading,s.empty],[100,8,8,'M–12',false,false,false]);
  s=combatHudState(game({player:{hp:22},ammo:[0,0,0,0,0,0,0]}));
  assert.equal(s.critical,true);assert.equal(s.empty,true,'an empty magazine asks for a reload');
  s=combatHudState(game({ammo:[0,0,0,0,0,0,0],reloadRemaining:.4}));
  assert.equal(s.reloading,true);assert.equal(s.empty,false);assert.ok(Math.abs(s.reloadProgress-.75)<1e-9);
  s=combatHudState({player:{hp:140},weapon:{name:'AURORA',melee:true},ammo:[],weaponIndex:5});
  assert.equal(s.hp,100,'health is clamped');assert.equal(s.melee,true);assert.equal(s.capacity,0);
  assert.equal(combatHudState({player:{hp:60},regenerating:true,weapon:{}}).regenerating,true);
});

test('M01, M02, the Arena and the Range all mount the one combat HUD and hide their own readouts',()=>{
  for(const file of ['vesper-combat.js','level2-test.js','game.js']){
    const source=read(file);
    assert.match(source,/import \{mountCombatHud\} from '\.\/combat-hud\.js';/,file);
    assert.match(source,/\(combatHud \|\|= mountCombatHud\(\{characterId[^)]*\}\)\)\.update\(game\);/,file);
  }
  const css=read('combat-hud.css');
  for(const legacy of ['#combatHud','#hud #bottom','.game-hud .vitals','.game-hud .ammo-readout'])assert.ok(css.includes('body.pw-unified-hud '+legacy),legacy);
  assert.match(css,/\.pw-hud\[data-hero=lylu\]\{--pw-accent:#80baff\}/,'LYLU keeps his blue, GHJU her pink');
  assert.match(css,/body\.pw-hud-lobby-page:not\(\.playing\) \.pw-hud/,'never over the lobby');
  assert.match(css,/@media\(pointer:coarse\)/,'compact above the touch stick');
});

test('the lobby is hidden during a session despite the Fracture id selector, and its header no longer overlaps',()=>{
  const css=read('fracture.css'),html=read('index.html');
  assert.match(css,/body\.playing #lobby,body\.outfit-mode #lobby\{display:none\}/);
  assert.match(css,/@media\(min-width:701px\) and \(min-height:551px\)\{#lobby\{padding-top:/);
  assert.match(html,/<span>PINK<br><b>WARS<\/b><\/span>/,'the brand matches the title');
  assert.ok(!html.includes('PROTOTYPE JOUABLE <b>V.3.48'),'no stale build number in the lobby footer');
});

test('the mission 02 cover keeps its title clear of the menu card; mission pages have a tab icon',()=>{
  const svg=read('art/mission02-cover.svg');
  assert.equal((svg.match(/x="1540"[^>]*text-anchor="end"/g)||[]).length,3);
  assert.match(read('menu-art.js'),/mission02-cover\.svg\?v=m02-cover-2/);
  for(const page of ['vesper-level1-v7.html','level2-test.html'])assert.match(read(page),/<link rel="icon" href="icon\.svg"/,page);
});

test('at the hip the M12 sits lower and turns out so the shooting glove shows; aiming removes the offset',()=>{
  const hip=flatSightPose(OPTICS.m12,0),aimed=flatSightPose(OPTICS.m12,1),plain=flatSightPose(OPTICS.lance,0);
  assert.ok(hip.yaw<-.1&&hip.roll>0&&hip.y<-.25);
  assert.ok(aimed.yaw===0&&aimed.roll===0);
  assert.equal(aimed.z,flatSightPose({...OPTICS.m12,hip:undefined},1).z,'the sight picture is unchanged');
  assert.deepEqual([plain.x,plain.y,plain.z,plain.yaw,plain.roll],[.19,-.24,-.56,0,0],'other weapons keep their hip pose');
});
