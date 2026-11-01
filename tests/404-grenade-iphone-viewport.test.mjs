import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL('../dist/'+n,import.meta.url),'utf8');

test('iPhone grenade button uses existing charge stock, fires once via click and updates count',()=>{
 const hud=read('combat-hud.js'),game=read('game.js'),appearance=read('hud-appearance.js');
 assert.match(hud,/grenadeButton\.dataset\.hudAction='grenade'/);
 assert.match(hud,/touchActionLayer\.append\(meleeButton,crouchButton,grenadeButton\)/);
 assert.match(hud,/kind==='grenade'\)\{if\(\(Number\(currentGame\?\.charges\)\|\|0\)>0\)onAction\?\.\('charge'\)/);
 assert.match(hud,/grenadeButton\.disabled=!active\|\|s\.charges<=0/);
 assert.match(hud,/\.pw-hud-grenade-count'\)\.textContent=String\(s\.charges\)/);
 assert.match(game,/kind==='charge'\)chargeQueued=true/);
 assert.match(appearance,/grenade:'<path/);
});

test('grenade, melee and fire form three vertically separated right controls',()=>{
 const css=read('combat-hud.css');
 assert.match(css,/\.pw-hud-grenade-direct\{[\s\S]*?bottom:calc\(var\(--pw-stick-bottom\) \+ 163px\)!important/);
 assert.match(css,/\.pw-hud-melee-direct\{left:auto!important;right:calc\(var\(--pw-right\) \+ 9px\)!important;bottom:calc\(var\(--pw-stick-bottom\) \+ 85px\)!important/);
 assert.match(css,/\.pw-hud-engine-fire\{[\s\S]*?bottom:var\(--pw-stick-bottom\)!important/);
 assert.match(css,/@media\(pointer:coarse\) and \(orientation:landscape\)/);
 assert.match(css,/\.pw-hud-grenade-direct:disabled/);
});

test('dynamic viewport covers iPhone 14 Pro bottom, with safe-area margins preserved for controls',()=>{
 const style=read('style.css'),main=read('index.html'),hud=read('combat-hud.css');
 assert.match(style,/#world\{position:fixed;left:0;top:0;right:auto;bottom:auto;width:100vw;height:100dvh\}/);
 assert.match(main,/style\.css\?v=3\.86-iphone-viewport/);
 for(const file of ['level2-test.html','niveau3.html','niveau4.html','ligne9.html']){
  assert.match(read(file),/canvas#game\{position:fixed;top:0;left:0;right:auto;bottom:auto;width:100vw;height:100dvh\}/);
 }
 assert.match(hud,/env\(safe-area-inset-bottom\)/);
 assert.match(hud,/\.pw-hud\{height:100dvh;min-height:100dvh;bottom:auto\}/);
});
