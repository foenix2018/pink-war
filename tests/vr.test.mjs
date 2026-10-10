import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import { ArenaGame } from '../dist/game-logic.js';
import { VRController, traceVRAim } from '../dist/vr.js';

const buttons = () => Array.from({length:6},()=>({pressed:false,value:0}));
function setup(game = { charge:0, triggerHeld:false, reload:()=>true, cycleWeapon:()=>true }) {
  const left = { handedness:'left', targetRaySpace:{hand:'left'}, gamepad:{axes:[0,0,0,0],buttons:buttons()} };
  const right = { handedness:'right', targetRaySpace:{hand:'right'}, gamepad:{axes:[0,0,0,0],buttons:buttons()} };
  let phase = 'playing', exits = 0;
  const state = Object.assign(Object.create(VRController.prototype), {
    mode:'xr',session:{inputSources:[right,left],visibilityState:'visible'},previous:new Map(),controllers:[],snapArmed:true,triggerBlocked:false,helpTime:0,
    hooks:{game:()=>game,phase:()=>phase,togglePause:()=>{phase=phase==='playing'?'paused':'playing';},pause:()=>{if(phase==='playing')phase='paused';},begin:()=>{phase='playing';},world:()=>({renderer:{xr:{getReferenceSpace:()=>({})}}})},
    exit:async()=>{exits++;},fail:()=>{}
  });
  return {state,left,right,game,phase:()=>phase,setPhase:v=>{phase=v;},exits:()=>exits};
}
const down = (source,index,value=true) => { source.gamepad.buttons[index].pressed=value;source.gamepad.buttons[index].value=value?1:0; };

test('Quest Touch Plus keeps left movement, right trigger and grip independent of source order',()=>{
  const {state,left,right}=setup();
  left.gamepad.axes=[.9,.9,.4,-.8];right.gamepad.axes=[.9,.9,.6,.9];
  down(left,0); // The left trigger never fires.
  assert.equal(state.input().fire,false);
  down(right,0);down(left,3);
  let input=state.input();assert.equal(input.x,.4);assert.equal(input.z,-.8);assert.equal(input.fire,true);assert.equal(input.sprint,true);assert.equal(input.turn,0);assert.equal(input.tilt,0);
  down(right,1);input=state.input();assert.equal(input.precision,true);assert.equal(input.sprint,false);
  down(right,0,false);right.gamepad.buttons[0].value=.4;assert.equal(state.input().fire,true);
});

test('Quest rotation snaps once per stick gesture, including an opposite gesture',()=>{
  const {state,right}=setup();right.gamepad.axes[2]=.9;
  assert.equal(state.input().snap,Math.PI/6);
  for(let i=0;i<50;i++)assert.equal(state.input().snap,0);
  right.gamepad.axes[2]=-.9;assert.equal(state.input().snap,0);
  right.gamepad.axes[2]=.2;assert.equal(state.input().snap,0);
  right.gamepad.axes[2]=-.9;assert.equal(state.input().snap,-Math.PI/6);
  right.gamepad.axes[2]=0;state.input();right.gamepad.axes[2]=.5;assert.equal(state.input().snap,0);
});

test('A recharges, B selects next and X previous only on fresh presses; changing cancels a charge',()=>{
  let reload=0;const directions=[];
  const {state,left,right,game}=setup({charge:.6,triggerHeld:true,reload:()=>{reload++;return true;},cycleWeapon:direction=>{directions.push(direction);return true;}});
  down(right,0);down(right,4);assert.equal(state.input().fire,false);assert.equal(game.charge,0);assert.equal(game.triggerHeld,false);
  state.input();assert.equal(reload,1);
  down(right,4,false);down(right,0,false);state.input();down(right,0);assert.equal(state.input().fire,true);
  down(right,5);assert.equal(state.input().fire,false);state.input();assert.deepEqual(directions,[1]);
  down(right,5,false);state.input();down(left,4);state.input();state.input();assert.deepEqual(directions,[1,-1]);
});

test('Y pauses and A resumes without firing a held trigger; B exits from the pause',async()=>{
  const {state,left,right,game,phase,exits}=setup();game.charge=.5;game.triggerHeld=true;
  down(right,0);down(left,5);assert.equal(state.input().fire,false);assert.equal(phase(),'paused');assert.equal(game.charge,0);
  state.input();assert.equal(phase(),'paused');down(left,5,false);state.input();
  down(right,4);assert.equal(state.input().fire,false);assert.equal(phase(),'playing');
  down(right,4,false);down(right,0,false);state.input();down(right,0);assert.equal(state.input().fire,true);
  down(left,5);state.input();assert.equal(phase(),'paused');down(right,5);state.input();state.input();await Promise.resolve();assert.equal(exits(),1);
});

test('loss of the right pose or a blurred session cancels a heavy charge and pauses safely',()=>{
  const {state,right,game,phase,setPhase}=setup();game.charge=.6;game.triggerHeld=true;down(right,0);
  const frame={getPose:space=>space.hand==='right'?null:{}};
  assert.equal(state.input(frame).fire,false);assert.equal(phase(),'paused');assert.equal(game.charge,0);assert.equal(state.trackingLost,true);
  setPhase('playing');state.session.visibilityState='visible-blurred';game.charge=.4;
  assert.equal(state.input({getPose:()=>({})}).fire,false);assert.equal(game.charge,0);assert.equal(phase(),'paused');
  state.session.visibilityState='visible';setPhase('playing');assert.equal(state.input().fire,false);
  down(right,0,false);state.input();down(right,0);assert.equal(state.input().fire,true);
});

test('charged weapon uses the right trigger hold and releases a partial shot, then recharges with A',()=>{
  const game=new ArenaGame([],()=>.5);game.wave=7;game.nextWave=-1;game.toSpawn=0;game.selectWeapon(3);game.cooldown=0;game.drainEvents();
  const {state,right}=setup(game),origin={x:0,y:1.4,z:0},direction={x:0,y:0,z:-1};
  down(right,0);
  for(let i=0;i<8;i++){game.step(.05);game.trigger(state.input().fire,.05,origin,direction);}
  assert.equal(game.ammo[3],6);assert.ok(game.charge>.08 && game.charge<1);
  down(right,0,false);game.trigger(state.input().fire,.05,origin,direction);
  assert.equal(game.ammo[3],5);const shot=game.drainEvents().find(e=>e.type==='shot');assert.ok(shot.power>.3 && shot.power<1);
  down(right,4);state.input();assert.ok(game.reloadRemaining>0);
  down(right,4,false);down(right,0);game.step(.05);game.trigger(state.input().fire,.05,origin,direction);assert.equal(game.ammo[3],5);
  down(right,0,false);state.input();for(let i=0;i<100;i++)game.step(.05);assert.equal(game.ammo[3],6);
});

test('X/B wrap through unlocked weapons and preserve their separate batteries',()=>{
  const game=new ArenaGame();game.wave=5;game.nextWave=-1;game.ammo[0]=7;game.ammo[1]=18;game.ammo[2]=4;
  const {state,left,right}=setup(game);
  down(left,4);state.input();assert.equal(game.weaponIndex,2);
  down(left,4,false);state.input();down(left,4);state.input();assert.equal(game.weaponIndex,1);
  down(left,4,false);state.input();down(right,5);state.input();assert.equal(game.weaponIndex,2);
  down(right,5,false);state.input();down(right,5);state.input();assert.equal(game.weaponIndex,0);
  assert.deepEqual(game.ammo.slice(0,3),[7,18,4]);assert.equal(game.selectWeapon(4),false);
});

test('right stick click toggles help while Y remains the pause control',()=>{
  const {state,right,phase}=setup();down(right,3);state.input();assert.equal(state.showControls,true);assert.equal(phase(),'playing');
  state.input();assert.equal(state.showControls,true);down(right,3,false);state.input();down(right,3);state.input();assert.equal(state.showControls,false);
});

test('VR aiming transforms the controller through the rig and uses the actual muzzle',()=>{
  const rig=new T.Group();rig.position.set(10,0,20);rig.rotation.y=Math.PI/2;
  const ray=new T.Group();ray.position.set(.3,1.4,-.2);ray.userData.source={handedness:'right'};rig.add(ray);
  const camera=new T.PerspectiveCamera();rig.add(camera);
  const state={mode:'xr',controllers:[{ray}],hooks:{world:()=>({T,camera})}};
  let aim=VRController.prototype.aim.call(state);
  assert.ok(aim.direction.distanceTo(new T.Vector3(-1,0,0))<1e-8);assert.ok(aim.origin.distanceTo(new T.Vector3(9.46,1.4,19.7))<1e-8);
  const gun=new T.Group(),flash=new T.Object3D();flash.position.z=-.6;gun.userData.flash=flash;ray.add(gun);state.controllers[0].gun=gun;state.hooks.game=()=>({weaponIndex:0});
  aim=VRController.prototype.aim.call(state);assert.ok(aim.origin.distanceTo(new T.Vector3(9.2,1.4,19.7))<1e-8);
});

test('a controller and muzzle past cover cannot originate a shot on the far side of a wall',()=>{
  const camera=new T.PerspectiveCamera();camera.position.set(0,1.6,0);
  const ray=new T.Group();ray.position.set(0,1.4,-.5);ray.userData.source={handedness:'right'};
  const gun=new T.Group(),flash=new T.Object3D();flash.position.z=-.6;gun.userData.flash=flash;ray.add(gun);
  const obstacles=[{x:0,z:-.8,hx:2,hz:.1,height:3}];
  const state={mode:'xr',controllers:[{ray,gun}],hooks:{game:()=>({weaponIndex:0}),world:()=>({T,camera,obstacles})}};
  const aim=VRController.prototype.aim.call(state);assert.ok(aim.origin.z>-.7);assert.ok(aim.origin.z<0);
  const hit=traceVRAim(aim.origin,aim.direction,[{x:0,z:-5}],obstacles);assert.equal(hit.enemy,null);assert.ok(hit.distance<.2);
});

test('the aim marker picks the closest enemy or protective wall and never redirects the gun',()=>{
  const origin={x:0,y:1.15,z:0},direction={x:0,y:0,z:-1},near={x:0,z:-8},far={x:0,z:-15};
  let hit=traceVRAim(origin,direction,[far,near]);assert.equal(hit.enemy,near);assert.equal(hit.point.x,0);assert.ok(hit.distance<8);
  const wall={x:0,z:-4,hx:2,hz:.5,height:3};hit=traceVRAim(origin,direction,[near,far],[wall]);assert.equal(hit.enemy,null);assert.ok(Math.abs(hit.distance-3.48)<1e-8);
});

test('head-relative locomotion uses the new rig yaw after a snap and retains heading when looking vertically',()=>{
  const game={player:{x:0,z:0,yaw:0}},rig=new T.Group(),camera=new T.PerspectiveCamera();camera.rotation.set(0,.4,0,'YXZ');rig.add(camera);
  const state=Object.assign(Object.create(VRController.prototype),{rig,lastMoveYaw:null,hooks:{game:()=>game,world:()=>({T,camera,renderer:{xr:{updateCamera:()=>{}}}})}});
  assert.ok(Math.abs(state.movementYaw(.5)-.9)<1e-8);
  camera.rotation.set(Math.PI/2,.4,0,'YXZ');assert.ok(Math.abs(state.movementYaw(1)-.9)<1e-8);
});

test('a headset without a right controller falls back to the head ray for the sight only',()=>{
  const camera=new T.PerspectiveCamera();camera.position.set(3,1.7,4);camera.rotation.x=-.2;
  const state={mode:'xr',controllers:[],hooks:{world:()=>({T,camera})}};
  const aim=VRController.prototype.aim.call(state);assert.equal(aim.origin.y,1.7);assert.ok(aim.direction.y<0);
  state.mode='stereo';assert.equal(VRController.prototype.aim.call(state),null);
});
