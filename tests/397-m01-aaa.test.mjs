import test from 'node:test';
import assert from 'node:assert/strict';
import {m01Profile,createM01Telemetry,createM01Exposure} from '../dist/m01-aaa.js';
import {graphicsProfile} from '../dist/renderer-policy.js';
import {createFrameBudget} from '../dist/render-budget.js';
import {gradePolicy} from '../dist/fps-grade.js';
const iphone={userAgent:'iPhone',gpu:{},maxTouchPoints:5};
test('M01 alone tries native WebGPU on iPhone with explicit fallback',()=>{
 assert.equal(m01Profile(iphone).preferWebGL,false);assert.equal(m01Profile(iphone,'auto',true).preferWebGL,true);
 assert.equal(m01Profile({...iphone,gpu:null}).preferWebGL,true);assert.equal(graphicsProfile(iphone).preferWebGL,true);
});
test('mobile targets and presentation stay bounded',()=>{
 const b=m01Profile(iphone),p=m01Profile(iphone,'low'),c=m01Profile(iphone,'high');
 assert.equal(b.targetFPS,60);assert.equal(p.targetFPS,60);assert.equal(c.targetFPS,30);
 assert.ok(c.maxPixels>b.maxPixels&&b.maxPixels>p.maxPixels);assert.equal(gradePolicy(b).samples,4);
 assert.equal(p.mobileCinema,false);assert.equal(m01Profile(iphone,'auto',true).mobileCinema,false);
});
test('60 FPS budget responds earlier than legacy 30 FPS',()=>{
 const a=createFrameBudget({targetFPS:60,minScale:.65}),b=createFrameBudget();
 for(let i=0;i<35;i++){a.sample(25);b.sample(25);}assert.ok(a.snapshot().scale<1);assert.equal(b.snapshot().scale,1);
 for(let i=0;i<300;i++)a.sample(40);assert.ok(a.snapshot().scale>=.65);
});
test('telemetry measures rendered intervals and resets after interruption',()=>{
 const t=createM01Telemetry();for(let i=0;i<=60;i++)t.sample(i/60);assert.equal(t.snapshot().fps,60);assert.equal(t.snapshot().p95Ms,16.7);t.sample(4);assert.equal(t.snapshot().fps,null);
});
test('exposure adapts without accumulation',()=>{
 const e=createM01Exposure(),r={toneMappingExposure:1};e.update(r,1,.016);
 for(let i=0;i<120;i++){r.toneMappingExposure=1;e.update(r,0,.016);}assert.ok(r.toneMappingExposure>1.1&&r.toneMappingExposure<=1.12);
});