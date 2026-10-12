import test from 'node:test';
import assert from 'node:assert/strict';
import {portalIndicators} from '../dist/portal-indicator.js';
import {createWeaponFeel,FIRING_FEEL} from '../dist/weapon-feel.js';
test('portal dots locate front, sides and behind with camera-relative bearing',()=>{
  const p={x:0,z:0},dots=portalIndicators([{id:1,x:0,z:-10},{id:2,x:10,z:0},{id:3,x:-5,z:10}],p,0,2);
  assert.equal(dots[0].offset,0);assert.equal(dots[1].offset,1);assert.equal(dots[2].offset,-1);assert.equal(dots[2].behind,true);
  const lookingRight=portalIndicators([{x:10,z:0}],p,-Math.PI/2,2);assert.ok(Math.abs(lookingRight[0].offset)<1e-8);
});
test('portal appearance timing uses game time and no stale markers remain after victory',()=>{
  const portals=[{id:1,x:0,z:-5,openedAt:10}],p={x:0,z:0};
  assert.equal(portalIndicators(portals,p,0,9)[0].pending,true);
  assert.equal(portalIndicators(portals,p,0,10.1)[0].pending,false);
  assert.deepEqual(portalIndicators(portals,p,0,11,'won'),[]);assert.deepEqual(portalIndicators([],p,0,11),[]);
});
test('five weapons differ in impulse, with stronger charged weapons and a braced stance',()=>{
  const peaks=[];
  for(const id of Object.keys(FIRING_FEEL)){const f=createWeaponFeel();f.fire(id);f.update(.035);peaks.push(f.state.kick);}
  assert.equal(new Set(peaks).size,5);assert.ok(peaks[4]>peaks[0]*2);assert.ok(peaks[0]>peaks[1]);
  const weak=createWeaponFeel(),full=createWeaponFeel(),braced=createWeaponFeel();weak.fire('thorn',.3);full.fire('thorn');braced.fire('thorn',1,true);
  assert.ok(weak.state.pitch<full.state.pitch);assert.ok(braced.state.pitch<full.state.pitch);
});
test('recoil settles equally at mobile and headset frame rates, never drifting the aim',()=>{
  const outputs=[];
  for(const hz of [30,72,90,120]){const f=createWeaponFeel();f.fire('nova');for(let i=0;i<hz*.5;i++)f.update(1/hz);outputs.push(f.state.kick);for(let i=0;i<hz*2;i++)f.update(1/hz);assert.equal(f.state.kick,0);assert.equal(f.state.pitch,0);assert.equal(f.state.yaw,0);}
  for(const value of outputs)assert.ok(Math.abs(value-outputs[0])<1e-6);
});
test('rapid automatic fire stays bounded and reset cancels all visual tails',()=>{
  const f=createWeaponFeel();for(let i=0;i<1000;i++){f.fire('bloom');f.update(.016);assert.ok(f.state.kick<.3);assert.ok(f.state.pitch<.55);}
  f.reset();assert.deepEqual(f.state,{kick:0,pitch:0,yaw:0,heat:0,flash:0,impulse:0});
});
