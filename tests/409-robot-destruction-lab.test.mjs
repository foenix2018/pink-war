import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=s=>readFileSync(new URL('../dist/'+s,import.meta.url),'utf8');
test('robot damage lab uses actual combat models and three-stage motion without importing game levels',()=>{
 const js=read('enemy-destruction-lab.js'),html=read('enemy-destruction-lab.html');
 assert.match(js,/createEnemyFactory\(mats,/);
 assert.match(js,/engine\.create\(false,true,form\)/);
 assert.match(js,/fx\.mark\(entity,robot,dt\)/);
 assert.match(js,/fx\.kill\(robot,/);
 assert.match(js,/renderer\.render\(scene,camera\)/);
 assert.match(js,/WebGPU:T.WebGPURenderer/);
 for(const form of ['seer','brute','bulwark'])assert.match(html,new RegExp('value="'+form+'"'));
 assert.match(html,/id="damage"/);assert.match(html,/id="destroy"/);
 assert.doesNotMatch(read('scene.js'),/enemy-destruction-lab/);
});
