import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digitalSegments,isDigitalCounter} from '../dist/digital-display.js';
import {touchAnalogSprint} from '../dist/level2-input.js';
const source=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('Digital Bold-D style is implemented as real 7-segment vector counters',()=>{
 assert.equal(digitalSegments('0'),'abcdef');
 assert.equal(digitalSegments('8'),'abcdefg');
 assert.equal(digitalSegments('1'),'bc');
 assert.ok(isDigitalCounter('100'));
 assert.ok(isDigitalCounter('/ 24'));
 assert.equal(isDigitalCounter('LAME'),false);
 const hud=source('combat-hud.js'),css=source('combat-hud.css');
 assert.match(hud,/renderDigitalCounter\(nodes\[k\],v\)/);
 assert.match(hud,/digitalKeys=new Set\(\['hp','shield','ammo','capacity'\]\)/);
 assert.match(css,/\.pw-hud \.pw-led-digit/);
 assert.match(css,/\.pw-hud \.pw-hud-shield-value\{color:var\(--pw-accent\)\}/);
});

test('PS4 helper overlay is removed without touching Gamepad API or controller mappings',()=>{
 const sourceCode=source('ios-gamepad.js');
 assert.doesNotMatch(sourceCode,/document\.createElement\('div'\)/);
 assert.doesNotMatch(sourceCode,/root\.innerHTML/);
 assert.match(sourceCode,/gamepadsNow\(\)\.map\(normalizeDesktopGamepad\)/);
 assert.match(sourceCode,/export const PS4_CONTROLS/);
});

test('crouch sits below aim, jump above, melee over translucent red fire',()=>{
 const hud=source('combat-hud.js'),css=source('combat-hud.css');
 assert.match(hud,/touchActionLayer\.append\(meleeButton,crouchButton\)/);
 assert.match(hud,/sprintButton\.remove\(\)/);
 assert.match(css,/\.pw-hud \.pw-hud-crouch-direct/);
 assert.match(css,/\.pw-hud \.pw-hud-melee-direct/);
 assert.match(css,/\[data-pw-immersion=fire\]/);
 assert.match(css,/--pw-control-centre:/);
 assert.match(css,/\[data-pw-immersion=aim\]/);
 assert.match(css,/\[data-pw-immersion=jump\]/);
 assert.match(css,/linear-gradient\(145deg,#f6506970,#aa183e82\)/);
 assert.match(hud,/hudIcon\('down-double'\)/);
 assert.match(source('hud-appearance.js'),/'down-double':/);
 const trial=source('hud-essai.html');
 assert.doesNotMatch(trial,/id="trial-tools"|id="trial-label"|id="trial-note"|>MISSION 01/);
 assert.match(trial,/--pw-demo-centre:/);
 assert.match(trial,/#aim\{left:50%!important/);
 assert.match(trial,/#jump\{left:50%!important/);
 assert.match(trial,/\.pw-hud \.pw-hud-crouch-direct\{left:50%!important/);
});

test('strong left-stick deflection triggers sprint while slight movement still walks',()=>{
 assert.equal(touchAnalogSprint(0,-1),true);
 assert.equal(touchAnalogSprint(.65,-.65),true);
 assert.equal(touchAnalogSprint(.4,-.4),false);
 assert.equal(touchAnalogSprint(0,0),false);
 const touch=source('level2-input.js'),game=source('game.js');
 assert.match(touch,/state\.sprint=touchAnalogSprint\(state\.x,state\.z\)/);
 assert.match(game,/move\.id!==null&&Math\.hypot\(move\.x,move\.y\)>=\.88/);
 for(const mission of ['level2-test.js','niveau3.js','niveau4.js','ligne9.js','couronne-helix.js']){
  assert.match(source(mission),/controls\.sprint\|\|touchSprinting\|\|touch\.sprint/,mission);
 }
});
