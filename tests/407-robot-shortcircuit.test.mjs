import test from 'node:test';
import assert from 'node:assert/strict';
import {electricFailureAnchor,robotOpticPower,SHUTDOWN_CUES,enemyDamageStage} from '../dist/enemy-destruction-fx.js';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
test('electric failure comes from multiple credible, rotated robot body points',()=>{
 const base={form:'stalker',x:2,z:7,yaw:Math.PI/2,elevation:0};
 const a=Array.from({length:5},(_,slot)=>electricFailureAnchor(base,slot));
 assert.equal(a.length,5);assert.ok(new Set(a.map(v=>v.y.toFixed(2))).size>=4);
 assert.ok(a.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)));
 assert.ok(electricFailureAnchor({form:'brute'},1).y>electricFailureAnchor({form:'probe'},1).y);
});
test('deactivation uses irregular electrical bursts, not a constant laser effect',()=>{
 assert.deepEqual(SHUTDOWN_CUES.map(c=>c.at),[.11,.30,.55,.81,.965]);
 assert.ok(SHUTDOWN_CUES.every((cue,i)=>i===0||cue.at>SHUTDOWN_CUES[i-1].at));
 assert.ok(robotOpticPower(.99,4)<robotOpticPower(0,4));
 assert.ok(enemyDamageStage(10,100).sparks>enemyDamageStage(75,100).sparks);
});
test('robot failure changes own optics only, and emits budgeted blue-white arcs',()=>{
 const code=read('enemy-destruction-fx.js');
 assert.match(code,/const eye=model\?\.userData\?\.optics/);
 assert.match(code,/const eyeStates=new WeakMap\(\)/);
 assert.match(code,/arcs=new T.InstancedMesh/);
 assert.match(code,/color:0xc2eeff/);
 assert.match(code,/particles\.length>=budget/);
 assert.match(code,/powerEyes\(d\.model,robotOpticPower/);
 assert.match(code,/while\(d\.nextCue<SHUTDOWN_CUES\.length/);
 assert.match(code,/electricBurst\(origin,low\?8:16/);
});
