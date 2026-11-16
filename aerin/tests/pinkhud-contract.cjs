'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),p=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=p('dist/index.html'),gpu=p('dist/game/aerin-game-webgpu.js'),webgl=p('dist/game/aerin-game-webgl.js'),css=p('dist/game/hud-v13.css') /* V13 : pink-hud.css remplacée par le HUD V13 */,entry=p('dist/game/entry-webgpu.js'),animations=JSON.parse(p('dist/assets/animations.json'));
assert.match(html,/id="attack-button"/);assert.equal((html.match(/id="attack-button"/g)||[]).length,1);
assert.doesNotMatch(html,/data-attack="[0-3]"/);assert.match(html,/id="combo-label"/);assert.match(html,/game\/hud-v13\.css/);
assert.match(html,/three\/webgpu/);assert.match(entry,/import\('three\/webgpu'\)/);assert.match(entry,/aerin-game-webgl\.js/);
for(const code of [gpu,webgl]){
 assert.match(code,/state\.selected=\(state\.attackIndex\+1\)%attacks\.length/);
 assert.match(code,/function requestAttack\(\)/);assert.match(code,/state\.comboQueued=true/);
 assert.match(code,/e\.pointerType!==\'touch\'/);
}
assert.match(gpu,/new T\.WebGPURenderer/);assert.match(gpu,/await renderer\.init\(\)/);assert.match(gpu,/naturalTexture/);
assert.match(css,/\.h13-actions/);assert.match(css,/#attack-button/);assert.match(css,/\.h13-stick/);assert.match(html,/id="move-stick"/);
assert(fs.statSync(path.join(root,'dist/assets/aerin.glb')).size>1000000);
for(const clip of ['Sword_Slash','Sword_Backslash','Sword_Overhead','Sword_Thrust'])assert(animations.animations.some(a=>a.name===clip));
console.log('OK AERIN: renderer WebGPU-first, fallback, HUD V13, unique sword button, combo queue, 4 GLB animation clips');
