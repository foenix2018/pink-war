import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_VERSION} from '../dist/launch-ui.js';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');

test('M01 HUD hides tutorial, coordinates and settings while retaining combat and contextual actions',()=>{
 const v=read('vesper-level1-v7.html');
 assert.match(v,/id="pw-v7-clean-hud"/);
 assert.match(v,/#game \.top,#game #bottom,#game \.mobileView\{display:none!important\}/);
 assert.match(v,/#game #controlsPanel,#game #objectivePanel\{display:none\}/);
 assert.match(v,/#game #controlsPanel\.open\{display:block/);
 assert.match(v,/#game #objectivePanel\.open\{display:block/);
 assert.match(v,/id="quickSettings"/);
 assert.match(v,/id="quickObjective"/);
 assert.match(v,/\[ F \] ACTION/);
 assert.match(v,/id='combatHud'/);
 assert.match(v,/id="pwAmmo"/);
 assert.match(v,/setTimeout\(\(\)=>brief\.classList\.remove\('open'\),3800\)/);
});
test('M02 HUD hides debug and persistent prose, keeps HP ammo interaction prompt',()=>{
 const h=read('level2-test.html');
 assert.match(h,/id="pw-m02-minimal-hud"/);
 assert.match(h,/#hud #name,#hud #hint,#hud #stats,#hud #help\{display:none!important\}/);
 assert.match(h,/#hud #objective\{display:none/);
 assert.match(h,/body\.pw-objective-open #hud #objective\{display:block\}/);
 assert.match(h,/id="pwMission"/);
 assert.match(h,/id="pwSettings"/);
 assert.match(h,/id="hp"/);
 assert.match(h,/id="ammo"/);
 assert.match(h,/id="prompt"/);
});
test('M02 brief appears on objective stage changes only, help text invisible',()=>{
 const s=read('level2-test.js');
 assert.match(s,/let lastMinimalHudStage=-1;/);
 assert.match(s,/if\(stage!==lastMinimalHudStage\)/);
 assert.match(s,/setTimeout\(\(\)=>document\.body\.classList\.remove\('pw-objective-open'\),3600\)/);
});
test('Primary HUD removes only nonessential long tips',()=>{
 const c=read('mobile-controls-v7.css'),main=read('index.html');
 assert.match(c,/body\.playing #game-tip\{display:none!important\}/);
 assert.ok(main.includes('mobile-controls-v7.css?v='+GAME_VERSION), 'cache refreshed for the current on-screen fire cluster');
 assert.match(c,/#m02-touch-controls/);
});
