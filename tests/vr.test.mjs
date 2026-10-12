import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import { ArenaGame } from '../dist/game-logic.js';
import { VRController, traceVRAim, VR_DEFAULTS, sanitizeVRSettings, questControls, buttonNames, hapticPlan, pickFrameRate, perfStep } from '../dist/vr.js';

const buttons = () => Array.from({length:6},()=>({pressed:false,value:0}));
function setup(game = { charge:0, triggerHeld:false, reload:()=>true, cycleWeapon:()=>true }, settings = VR_DEFAULTS) {
  const left = { handedness:'left', targetRaySpace:{hand:'left'}, gamepad:{axes:[0,0,0,0],buttons:buttons()} };
  const right = { handedness:'right', targetRaySpace:{hand:'right'}, gamepad:{axes:[0,0,0,0],buttons:buttons()} };
  let phase = 'playing', exits = 0;
  const state = Object.assign(Object.create(VRController.prototype), {
    mode:'xr',settings,session:{inputSources:[right,left],visibilityState:'visible'},previous:new Map(),controllers:[],snapArmed:true,triggerBlocked:false,
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
  down(right,0);left.gamepad.buttons[1].value=.8;
  let input=state.input();assert.equal(input.x,.4);assert.equal(input.z,-.8);assert.equal(input.fire,true);assert.equal(input.sprint,true);assert.equal(input.turn,.6);assert.equal(input.tilt,0);
  down(right,1);input=state.input();assert.equal(input.precision,true);assert.equal(input.sprint,true,'holding the pistol grip does not stop sprinting');
  down(right,0,false);right.gamepad.buttons[0].value=.4;assert.equal(state.input().fire,true);
});

test('Quest can deliberately take a nearby beam weapon with the free-hand stick click',()=>{
  const game={charge:0,triggerHeld:false,reload:()=>true,cycleWeapon:()=>true,nearbyWeapon:()=>({index:1})};
  const {state,left}=setup(game);
  down(left,3);let input=state.input();
  assert.equal(input.pickup,true);assert.equal(input.sprint,false);
  input=state.input();assert.equal(input.pickup,false,'holding cannot collect repeatedly');
  down(left,3,false);state.input();
  game.nearbyWeapon=()=>null;
  down(left,3);input=state.input();
  assert.equal(input.crouchToggle,true,'stick click toggles crouching when no weapon is nearby');
  assert.equal(input.pickup,false);
});

test('Quest right stick rotates continuously with no snap or jerk, including reverse motion',()=>{
  const {state,right}=setup();right.gamepad.axes[2]=.9;
  for(let i=0;i<50;i++){const input=state.input();assert.equal(input.turn,.9);assert.equal(input.snap,0);}
  right.gamepad.axes[2]=-.9;assert.equal(state.input().turn,-.9);
  right.gamepad.axes[2]=.2;assert.equal(state.input().turn,.2);
  right.gamepad.axes[2]=0;assert.equal(state.input().turn,0);
});

test('A recharges, B selects next and left X jumps on fresh press',()=>{
  let reload=0;const directions=[];
  const {state,left,right,game}=setup({charge:.6,triggerHeld:true,reload:()=>{reload++;return true;},cycleWeapon:direction=>{directions.push(direction);return true;}});
  down(right,0);down(right,4);assert.equal(state.input().fire,false);assert.equal(game.charge,0);assert.equal(game.triggerHeld,false);
  state.input();assert.equal(reload,1);
  down(right,4,false);down(right,0,false);state.input();down(right,0);assert.equal(state.input().fire,true);
  down(right,5);assert.equal(state.input().fire,false);state.input();assert.deepEqual(directions,[1]);
  down(right,5,false);state.input();down(left,4);assert.equal(state.input().jump,true);assert.equal(state.input().jump,false);assert.deepEqual(directions,[1]);
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
  const game=new ArenaGame([],()=>.5);game.wave=7;game.nextWave=-1;game.toSpawn=0;game.ownedWeapons.add(3);game.selectWeapon(3);game.cooldown=0;game.drainEvents();
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

test('B cycles unlocked weapons, X jumps without changing weapon batteries',()=>{
  const game=new ArenaGame();game.wave=5;game.nextWave=-1;game.ammo[0]=7;game.ammo[1]=18;game.ammo[2]=4;game.ownedWeapons.add(1);game.ownedWeapons.add(2);
  const {state,left,right}=setup(game);
  down(left,4);assert.equal(state.input().jump,true);assert.equal(game.weaponIndex,0);
  down(left,4,false);state.input();down(right,5);state.input();assert.equal(game.weaponIndex,1);
  down(right,5,false);state.input();down(right,5);state.input();assert.equal(game.weaponIndex,2);
  down(right,5,false);state.input();down(right,5);state.input();assert.equal(game.weaponIndex,0);
  assert.deepEqual(game.ammo.slice(0,3),[7,18,4]);assert.equal(game.selectWeapon(4),false);
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

test('the left trigger reloads without firing, and never resumes or restarts a paused game',()=>{
  let reload=0;const {state,left,right,game,phase,setPhase}=setup({charge:.5,triggerHeld:true,reload:()=>{reload++;return true;},cycleWeapon:()=>true});
  down(left,0);let input=state.input();assert.equal(input.fire,false);assert.equal(reload,1);assert.equal(game.charge,0);
  state.input();assert.equal(reload,1,'a held trigger reloads once');
  down(left,0,false);state.input();setPhase('paused');down(left,0);state.input();assert.equal(phase(),'paused');assert.equal(reload,1);
  down(left,0,false);state.input();setPhase('over');down(left,0);state.input();assert.equal(phase(),'over');
  down(left,0,false);setPhase('playing');state.input();down(right,0);assert.equal(state.input().fire,true);
  down(left,0);assert.equal(state.input().fire,false,'firing stops while a reload starts');down(left,0,false);assert.equal(state.input().fire,false,'a trigger held across a reload waits for release');
  down(right,0,false);state.input();down(right,0);assert.equal(state.input().fire,true);
});

test('Quest left X jumps independently of left-stick crouch and right-hand fire',()=>{
 const {state,left,right}=setup();
 down(left,4);let input=state.input();
 assert.equal(input.jump,true);assert.equal(input.crouchToggle,false);assert.equal(input.fire,false);
 assert.equal(state.input().jump,false,'holding X must not re-trigger');
 down(left,4,false);state.input();
 down(left,3);input=state.input();
 assert.equal(input.jump,false);assert.equal(input.crouchToggle,true);
 down(left,3,false);state.input();
 down(right,0);down(left,4);input=state.input();
 assert.equal(input.fire,true);assert.equal(input.jump,true);
});
test('the free-hand grip sprints when squeezed, and the stick click enters crouch stance',()=>{
  const {state,left}=setup();
  left.gamepad.buttons[1].value=.4;assert.equal(state.input().sprint,false,'a light grip while holding the controller is not a sprint');
  left.gamepad.buttons[1].pressed=true;assert.equal(state.input().sprint,false,'a runtime that flags any squeeze as pressed does not turn it into a sprint');left.gamepad.buttons[1].pressed=false;
  left.gamepad.buttons[1].value=.8;assert.equal(state.input().sprint,true);
  left.gamepad.buttons[1].value=0;down(left,3);const input=state.input();assert.equal(input.sprint,false);assert.equal(input.crouchToggle,true);
});

test('the shooting-hand stick only turns: pushing it up or down changes nothing else',()=>{
  const switched=[];const {state,right}=setup({charge:0,triggerHeld:false,reload:()=>true,cycleWeapon:d=>{switched.push(d);return true;}});
  right.gamepad.axes=[0,0,0,-.95];let input=state.input();assert.equal(input.snap,0);assert.equal(input.z,0);assert.deepEqual(switched,[]);
  right.gamepad.axes=[0,0,.2,.95];input=state.input();assert.equal(input.snap,0);assert.equal(input.z,0);assert.deepEqual(switched,[]);
});

test('a left-handed layout mirrors every control: left trigger fires, the right hand moves and pauses',()=>{
  const reloads=[],cycles=[];
  const {state,left,right,phase,setPhase,exits}=setup({charge:0,triggerHeld:false,reload:()=>{reloads.push(1);return true;},cycleWeapon:d=>{cycles.push(d);return true;}},{...VR_DEFAULTS,hand:'left'});
  down(right,0);assert.equal(state.input().fire,false,'the right trigger is only a reload now');assert.equal(reloads.length,1);down(right,0,false);state.input();
  down(left,0);assert.equal(state.input().fire,true);down(left,0,false);
  right.gamepad.axes=[0,0,.4,-.8];left.gamepad.axes=[0,0,.9,.9];let input=state.input();
  assert.equal(input.x,.4);assert.equal(input.z,-.8);assert.equal(input.snap,0);assert.equal(input.turn,.9);
  down(right,3);let movement=state.input();assert.equal(movement.sprint,false);assert.equal(movement.crouchToggle,true);down(right,3,false);
  down(left,4);state.input();assert.equal(reloads.length,2,'X reloads');down(left,4,false);state.input();
  down(left,5);state.input();assert.deepEqual(cycles,[1],'Y selects the next weapon');down(left,5,false);state.input();
  down(right,4);state.input();assert.deepEqual(cycles,[1],'A no longer switches weapons');assert.equal(state.input().jump,false,'jump is edge-triggered');down(right,4,false);state.input();
  down(right,5);state.input();assert.equal(phase(),'paused','B pauses');down(right,5,false);state.input();
  down(left,4);state.input();assert.equal(phase(),'playing','X resumes');down(left,4,false);state.input();
  down(right,5);state.input();down(right,5,false);state.input();down(left,5);state.input();state.input();
  assert.equal(exits(),1,'Y leaves VR from the pause');
});

test('old saved snap settings migrate to continuous rotation',()=>{
  const cfg=sanitizeVRSettings({...VR_DEFAULTS,turn:'snap45'});
  assert.equal(cfg.turn,'smooth');
  const ctx=setup(undefined,cfg);ctx.right.gamepad.axes[2]=.5;
  let input=ctx.state.input();assert.equal(input.snap,0);assert.equal(input.turn,.5);
  ctx.right.gamepad.axes[2]=-1;input=ctx.state.input();assert.equal(input.turn,-1);assert.equal(input.snap,0);
  ctx.right.gamepad.axes[2]=.1;assert.equal(ctx.state.input().turn,0,'deadzone retained');
});

test('settings are validated and fall back to the defaults',()=>{
  assert.deepEqual(sanitizeVRSettings(null),VR_DEFAULTS);
  assert.deepEqual(sanitizeVRSettings({hand:'left',turn:'smooth',move:'hand',laser:'grip',haptics:false}),{hand:'left',turn:'smooth',move:'hand',laser:'grip',haptics:false});
  assert.deepEqual(sanitizeVRSettings({hand:'both',turn:'x',move:3,laser:'',haptics:'no'}),VR_DEFAULTS);
  assert.ok(Object.isFrozen(VR_DEFAULTS));
});

test('the control list and button names follow the shooting hand',()=>{
  const right=Object.fromEntries(questControls('right')),left=Object.fromEntries(questControls('left'));
  assert.equal(right['Gâchette droite'],'Tirer · maintenir pour charger');assert.equal(right.A,'Recharger la batterie');assert.equal(right.Y,'Pause / reprise');
  assert.equal(left['Gâchette gauche'],'Tirer · maintenir pour charger');assert.equal(left.X,'Recharger la batterie');assert.equal(left.B,'Pause / reprise');
  assert.ok(left['Joystick droit']==='Se déplacer'&&left['Joystick gauche']==='Rotation fluide');
  assert.deepEqual(buttonNames('left'),{reload:'X',next:'Y',jump:'A',pause:'B'});
  for(const hand of ['right','left'])assert.equal(new Set(questControls(hand).map(([control])=>control)).size,questControls(hand).length,'every control is listed once');
});

test('vibrations: heavy weapons kick harder, both hands feel damage, and the setting can turn them off',()=>{
  assert.ok(hapticPlan('shot','nova').main[0]>hapticPlan('shot','r9').main[0]);assert.ok(hapticPlan('shot','nova').main[1]>hapticPlan('shot','bloom').main[1]);
  assert.deepEqual(hapticPlan('shot','unknown'),hapticPlan('shot','r9'));assert.equal(hapticPlan('shot','r9').side,undefined);
  assert.ok(hapticPlan('charge',1).main[0]>hapticPlan('charge',0).main[0]);assert.deepEqual(hapticPlan('nothing'),{});
  const calls=[],pad=(name,kind)=>kind==='pulse'?{hapticActuators:[{pulse:(v,d)=>{calls.push([name,v,d]);return Promise.resolve();}}]}:{vibrationActuator:{playEffect:(type,o)=>{calls.push([name,type,o.strongMagnitude,o.duration]);return Promise.resolve();}}};
  const controllers=[{ray:{userData:{source:{handedness:'right',gamepad:pad('R','pulse')}}}},{ray:{userData:{source:{handedness:'left',gamepad:pad('L','effect')}}}}];
  const state=Object.assign(Object.create(VRController.prototype),{mode:'xr',settings:VR_DEFAULTS,controllers});
  state.haptic('shot','thorn');assert.deepEqual(calls,[['R',1,120]]);
  calls.length=0;state.haptic('damage');assert.deepEqual(calls,[['R',.6,90],['L','dual-rumble',.6,90]]);
  calls.length=0;state.settings={...VR_DEFAULTS,hand:'left'};state.haptic('shot','r9');assert.deepEqual(calls,[['L','dual-rumble',.72,48]]);
  calls.length=0;state.settings={...VR_DEFAULTS,haptics:false};state.haptic('shot','r9');state.haptic('damage');assert.deepEqual(calls,[]);
  state.settings=VR_DEFAULTS;state.mode='stereo';state.haptic('damage');assert.deepEqual(calls,[]);
  state.mode='xr';controllers[0].ray.userData.source.gamepad={hapticActuators:[{pulse(){throw new Error('device lost');}}]};assert.doesNotThrow(()=>state.haptic('shot','r9'));
});

test('frame rate: ask for 90 Hz, cheapen the view first, then step down to 72 Hz and stop',()=>{
  assert.equal(pickFrameRate([72,80,90,120]),90);assert.equal(pickFrameRate([72,120]),72);assert.equal(pickFrameRate([120]),null);assert.equal(pickFrameRate([]),null);
  const state={rate:90,rates:[72,80,90,120],foveation:.5};
  assert.equal(perfStep(state,1/90),null);assert.equal(perfStep(state,1.29/90),null);
  assert.deepEqual(perfStep(state,1.4/90),{foveation:1});state.foveation=1;
  assert.deepEqual(perfStep(state,1.4/90),{rate:80});state.rate=80;assert.deepEqual(perfStep(state,1.4/80),{rate:72});
  state.rate=72;assert.equal(perfStep(state,.05),null,'never below 72 Hz');
});

test('the free hand can steer movement, and the head takes over when it is missing',()=>{
  const rig=new T.Group(),camera=new T.PerspectiveCamera();camera.rotation.set(0,.4,0,'YXZ');rig.add(camera);
  const ray=new T.Group();ray.rotation.y=-1;ray.userData.source={handedness:'left'};rig.add(ray);
  const state=Object.assign(Object.create(VRController.prototype),{rig,lastMoveYaw:null,settings:{...VR_DEFAULTS,move:'hand'},controllers:[{ray}],hooks:{game:()=>({player:{x:0,z:0,yaw:0}}),world:()=>({T,camera,renderer:{xr:{updateCamera:()=>{}}}})}});
  assert.ok(Math.abs(state.movementYaw(.5)-(-.5))<1e-8,'follows the left controller');
  state.settings={...VR_DEFAULTS,move:'hand',hand:'left'};state.lastMoveYaw=null;assert.ok(Math.abs(state.movementYaw(.5)-.9)<1e-8,'a left shooting hand leaves no free left controller: the head is used');
  state.settings=VR_DEFAULTS;state.lastMoveYaw=null;assert.ok(Math.abs(state.movementYaw(.5)-.9)<1e-8,'head mode ignores the controller');
});

test('a left shooting hand aims from the left controller',()=>{
  const camera=new T.PerspectiveCamera(),mk=(hand,x)=>{const ray=new T.Group();ray.position.set(x,1.3,-.4);ray.userData.source={handedness:hand};return ray;};
  const left=mk('left',-.3),right=mk('right',.3),state=Object.assign(Object.create(VRController.prototype),{mode:'xr',settings:{...VR_DEFAULTS,hand:'left'},controllers:[{ray:right},{ray:left}],hooks:{world:()=>({T,camera})}});
  let aim=state.aim();assert.ok(Math.abs(aim.origin.x-(-.3))<1e-8);
  state.settings=VR_DEFAULTS;aim=state.aim();assert.ok(Math.abs(aim.origin.x-.3)<1e-8);
});

test('the muzzle follows the pistol with a recoil kick and the aim keeps the controller direction',()=>{
  const camera=new T.PerspectiveCamera();camera.position.set(0,1.7,0);
  const ray=new T.Group();ray.position.set(.25,1.2,-.3);ray.userData.source={handedness:'right'};
  const mount=new T.Group();mount.position.set(0,.11,-.045);ray.add(mount);
  const gun=new T.Group(),flash=new T.Object3D();flash.position.z=-.6;gun.userData.flash=flash;gun.scale.setScalar(1.05);mount.add(gun);
  const state=Object.assign(Object.create(VRController.prototype),{mode:'xr',settings:VR_DEFAULTS,controllers:[{ray,gun}],hooks:{game:()=>({weaponIndex:0}),world:()=>({T,camera})}});
  let aim=state.aim();assert.ok(aim.origin.distanceTo(new T.Vector3(.25,1.31,-.975))<1e-6,'the muzzle sits above the grip and in front of it');
  assert.ok(aim.direction.distanceTo(new T.Vector3(0,0,-1))<1e-8);
  gun.rotation.x=.16;aim=state.aim();assert.ok(aim.direction.distanceTo(new T.Vector3(0,0,-1))<1e-8,'recoil moves the model only; the shot direction stays on the controller ray');
});
test('the VR portal strip and health display release all resources on headset exit',()=>{
  const original=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0})};
  try{
    const camera=new T.PerspectiveCamera(),state=Object.assign(Object.create(VRController.prototype),{hooks:{world:()=>({T,camera})}});
    state.makeHUD();assert.equal(camera.children.length,2);assert.ok(state.hud.portal);
    let disposed=0;for(const item of [state.hud,state.hud.portal])for(const resource of [item.plane.geometry,item.plane.material,item.texture])resource.addEventListener('dispose',()=>disposed++);
    state.removeHUD();assert.equal(camera.children.length,0);assert.equal(disposed,6);assert.equal(state.hud,null);assert.doesNotThrow(()=>state.removeHUD());
  }finally{globalThis.document=original;}
});
