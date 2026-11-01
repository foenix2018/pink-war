import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdaptiveResolution,RLH_ADAPTIVE_PORT_VERSION} from '../dist/rlh-adaptive-resolution.js';

const run=(c,seconds,dt,state={})=>{
 let changed=0;
 for(let n=0;n<seconds/dt;n++)if(c.sample(dt,state)!==null)changed++;
 return changed;
};

test('RLH V886 port holds full native quality when frame rate is sufficient',()=>{
 const c=createAdaptiveResolution({mobile:false});
 assert.match(RLH_ADAPTIVE_PORT_VERSION,/rlh-v886/);
 run(c,32,1/60);
 assert.equal(c.scale,1);
 assert.equal(c.stats.changes,0);
});

test('three seconds of sustained GPU-demand-like frame delay lower resolution in small steps',()=>{
 const c=createAdaptiveResolution({mobile:false});
 run(c,9,1/60);
 run(c,8,1/24);
 assert.ok(c.scale<1,'resolution should adapt under sustained pressure');
 assert.ok(c.scale>=.85,'desktop keeps a sharp floor');
 assert.ok(c.history.length>0);
 assert.ok(c.history.every(x=>x.from-x.to<=.071));
});

test('quality recovers incrementally only after sustained frame-rate headroom',()=>{
 const c=createAdaptiveResolution({mobile:true});
 run(c,10,1/60);
 run(c,13,1/20);
 const lower=c.scale;assert.ok(lower<1);
 run(c,34,1/75);
 assert.ok(c.scale>lower,'restores quality after sustained stable headroom');
 assert.ok(c.scale<=1);
});

test('WebXR, stereo, pauses and hidden tabs never change the display scale',()=>{
 const c=createAdaptiveResolution({mobile:true});
 run(c,12,1/60);
 for(const state of [{immersive:true},{active:false},{hidden:true},{cpuBound:true}]){
  run(c,12,1/22,state);
  assert.equal(c.scale,1,'no changes for '+JSON.stringify(state));
 }
});

test('low frame rate spikes or wall-clock suspensions cannot trigger a downgrade',()=>{
 const c=createAdaptiveResolution();
 run(c,12,1/60);
 for(let i=0;i<50;i++)c.sample(.7);
 run(c,2,1/20);
 assert.equal(c.scale,1);
});

test('mobile mode never falls below 78 percent resolution and respects cooldown',()=>{
 const c=createAdaptiveResolution({mobile:true,slowHold:.8,warmup:0,cooldown:2});
 run(c,40,1/20);
 assert.ok(c.scale>=.78);
 const events=c.history;
 for(let i=1;i<events.length;i++)assert.ok(events[i].at-events[i-1].at>=2);
});

test('scene and M02 clamp only flat-screen DPR and keep materials, physics, XR unchanged',()=>{
 const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 const m02=readFileSync(new URL('../dist/level2-test.js',import.meta.url),'utf8');
 assert.match(scene,/renderPixelRatio\(current,devicePixelRatio,innerWidth,innerHeight\)\*resolutionScale/);
 assert.match(scene,/if\(renderer\.xr\?\.isPresenting\)return false/);
 assert.match(main,/graphicsGovernor\.sample\(dt/);
 assert.match(main,/immersive:vr\.mode!=='off'/);
 assert.match(m02,/resolutionGovernor\.sample\(dt/);
 assert.match(m02,/immersive:!!xr\?\.active/);
 assert.match(m02,/renderPixelRatio\(profile,devicePixelRatio,width,height\)\*resolutionScale/);
});
