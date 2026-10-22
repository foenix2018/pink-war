import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');

test('The new Vesper M01 aligns keyboard commands to M02',()=>{
 const m1=src('vesper-level1-v7.html'),m2=src('level2-input.js');
 for(const [key,command] of [['KeyJ','jump'],['KeyF','interact'],['KeyE','next'],['KeyR','reload']]){
  assert.ok(m2.includes(`${command}:'${key}'`),`M02 command ${command}`);
 }
 assert.match(m1,/keys\.has\('KeyJ'\)\s*&&\s*!jumpLatch/);
 assert.match(m1,/if\(ev\.code==='KeyF'\)interact\(\)/);
 assert.match(m1,/if\(ev\.code==='KeyE'\)changeWeapon\(1\)/);
 assert.match(m1,/if\(ev\.code==='KeyR'\)reloadWeapon\(\)/);
 assert.match(m1,/firing\|\|keys\.has\('Space'\)/);
 assert.match(m1,/keys\.add\('KeyJ'\)/);
});
test('M02 mobile touch swipes the right half without triggering fire',()=>{
 const input=src('level2-input.js'),runner=src('level2-test.js');
 assert.match(input,/e\.clientX<innerWidth\*\.5/);
 assert.match(input,/lookDX\+=/);
 assert.doesNotMatch(input,/id="m02-look"/);
 assert.match(runner,/e\.button!==0\|\|e\.pointerType!=='mouse'/);
 assert.match(runner,/yaw-=\(touch\.lookDX\|\|0\)\*\.004\*sensitivity/);
 assert.match(runner,/touch\.lookDX=touch\.lookDY=0/);
});
test('M01 + M02 show the same RLH mobile control positions',()=>{
 const css=src('mobile-controls-v7.css'),html=src('level2-test.html');
 assert.match(html,/mobile-controls-v7\.css/);
 for(const a of ['aim','jump','fire']){
  assert.ok(css.includes(`button[data-m02="${a}"]`),`M02 button ${a}`);
 }
 assert.match(css,/#m02-touch-controls #m02-look\s*\{display:none!important/);
 assert.match(css,/#m02-touch-controls #m02-move/);
 assert.match(css,/body\.playing \.game-hud #aim-button/);
 assert.match(css,/body\.playing \.game-hud #jump-button/);
 assert.match(css,/body\.playing \.game-hud #fire-button/);
});
