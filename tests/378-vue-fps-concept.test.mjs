import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weaponGlyph} from '../dist/combat-hud.js';
import {WEAPONS} from '../dist/game-logic.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('every weapon of the arsenal has a silhouette for the readout and the equipment list',()=>{
  for(let i=0;i<WEAPONS.length;i++)assert.match(weaponGlyph(i),/<svg class="pw-hud-glyph" viewBox="0 0 48 16"[^>]*><path d="M[^"]+"\/><\/svg>/,WEAPONS[i].name);
  assert.notEqual(weaponGlyph(8),weaponGlyph(0),'the VORTEX is not drawn as the VX-9');
});

test('the equipment panel has the Armes / Grenades / Options tabs and keeps the real commands',()=>{
  const hud=read('combat-hud.js');
  for(const tab of ['armes','grenades','options'])assert.match(hud,new RegExp(`data-gear-tab="${tab}"`));
  assert.match(hud,/data-gear-pane="grenades"[^]*pw-hud-gear-grenade/);assert.match(hud,/touche B/,'the grenade key is the real one (KeyB)');
  assert.match(hud,/pw-hud-gear-check/);assert.match(hud,/game\.selectWeapon\(index\)/);assert.match(hud,/command\('charge'\)/);
});

test('the concept layout is for mouse screens only: touch keeps the companion at mid-height',()=>{
  const css=read('combat-hud.css'),desk=css.slice(css.indexOf('@media (pointer:fine) and (min-width:900px)'));
  assert.match(desk,/\.pw-hud-companion\{top:var\(--pw-top\)!important/);assert.match(css,/\.pw-hud \.pw-hud-companion\{top:35%/);
  assert.match(css,/\.pw-hud::before\{[^}]*pointer-events:none/,'the grade never catches a click');
});

test('Shadow Unit finish: white VORTEX, pink sight, white vambrace, a light that follows the camera',()=>{
  assert.match(read('vortex-ar7.js'),/olive=C\(0xe4e6ea\)/);assert.match(read('hands.js'),/color:0xe2e4e8/);
  const w=read('weapons.js');assert.match(w,/export function attachViewmodelLight/);assert.match(w,/camera\.add\(keyLight,rimLight\)/);
  for(const page of ['niveau3.js','niveau4.js','niveau6.js','ligne9.js','couronne-helix.js','level2-test.js'])assert.match(read(page),/attachViewmodelLight\(camera/,page);
});
