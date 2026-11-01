import test from 'node:test';import assert from 'node:assert/strict';
import {enemyDamageStage,robotDeathDuration} from '../dist/enemy-destruction-fx.js';
test('damage progresses through smoke and sparks in monotonic stages',()=>{
 const samples=[100,80,55,30,8].map(hp=>enemyDamageStage(hp,100));
 assert.deepEqual(samples.map(s=>s.stage),[0,1,2,3,4]);
 assert.deepEqual(samples.map(s=>s.smoke),[0,1,2,3,4]);
 assert.deepEqual(samples.map(s=>s.sparks),[0,0,1,2,3]);
 assert.ok(samples.every((s,i)=>i===0||s.interval<=samples[i-1].interval));
});
test('dead, shielded and invalid health input cannot generate NaN or excessive damage',()=>{
 assert.equal(enemyDamageStage(0,100).damage,1);
 assert.equal(enemyDamageStage(200,100).stage,0);
 assert.equal(enemyDamageStage(50,0).stage,0);
});
test('different robot classes have collision-visual-specific fall durations',()=>{
 assert.ok(robotDeathDuration('probe')<robotDeathDuration('stalker'));
 assert.ok(robotDeathDuration('stalker')<robotDeathDuration('brute'));
 assert.ok(robotDeathDuration('brute')<robotDeathDuration('sentinel'));
});
