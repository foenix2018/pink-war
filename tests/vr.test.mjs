import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import { VRController } from '../dist/vr.js';
const buttons = () => Array.from({length:6},()=>({pressed:false}));

test('WebXR maps two independent thumbsticks and trigger; buttons fire on rising edges',()=>{
  let reload=0,weapon=0,pause=0;
  const left={handedness:'left',gamepad:{axes:[0,0,.4,-.8],buttons:buttons()}},right={handedness:'right',gamepad:{axes:[0,0,.6,0],buttons:buttons()}};
  right.gamepad.buttons[0].pressed=true;right.gamepad.buttons[4].pressed=true;right.gamepad.buttons[5].pressed=true;left.gamepad.buttons[3].pressed=true;
  const state={mode:'xr',session:{inputSources:[left,right]},previous:new Map(),hooks:{game:()=>({reload:()=>reload++,cycleWeapon:()=>weapon++}),togglePause:()=>pause++}};
  assert.deepEqual(VRController.prototype.input.call(state),{x:.4,z:-.8,turn:.6,tilt:0,fire:true});
  VRController.prototype.input.call(state);assert.deepEqual([reload,weapon,pause],[1,1,1]);
  right.gamepad.buttons[4].pressed=false;VRController.prototype.input.call(state);right.gamepad.buttons[4].pressed=true;VRController.prototype.input.call(state);assert.equal(reload,2);
});
test('VR aiming transforms a controller ray through the player rig into world coordinates',()=>{
  const rig=new T.Group();rig.position.set(10,0,20);rig.rotation.y=Math.PI/2;
  const ray=new T.Group();ray.position.set(.3,1.4,-.2);ray.userData.source={handedness:'right'};rig.add(ray);
  const state={mode:'xr',controllers:[{ray}],hooks:{world:()=>({T,camera:new T.PerspectiveCamera()})}};
  const aim=VRController.prototype.aim.call(state);
  assert.ok(aim.direction.distanceTo(new T.Vector3(-1,0,0))<1e-8);
  assert.ok(aim.origin.distanceTo(new T.Vector3(9.46,1.4,19.7))<1e-8);
});
test('a headset without a right controller falls back to the head ray',()=>{
  const camera=new T.PerspectiveCamera();camera.position.set(3,1.7,4);camera.rotation.x=-.2;
  const state={mode:'xr',controllers:[],hooks:{world:()=>({T,camera})}};
  const aim=VRController.prototype.aim.call(state);assert.equal(aim.origin.y,1.7);assert.ok(aim.direction.y<0);
  state.mode='stereo';assert.equal(VRController.prototype.aim.call(state),null);
});

test('paused VR still accepts the resume button while weapon actions remain paused',()=>{
  let resumed=0,reloaded=0;
  const pad={axes:[0,0,0,0],buttons:buttons()};pad.buttons[3].pressed=true;pad.buttons[4].pressed=true;
  const state={mode:'xr',session:{inputSources:[{handedness:'right',gamepad:pad}]},previous:new Map(),hooks:{phase:()=> 'paused',togglePause:()=>resumed++,game:()=>({reload:()=>reloaded++,cycleWeapon:()=>{}})}};
  VRController.prototype.input.call(state);assert.equal(resumed,1);assert.equal(reloaded,0);
});
