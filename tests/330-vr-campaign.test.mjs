import test from 'node:test';
import assert from 'node:assert/strict';
import { VRController, VR_DEFAULTS } from '../dist/vr.js';

function controller(hand='right') {
  const source = handedness => ({ handedness, targetRaySpace:{handedness}, gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,value:0}))} });
  const left=source('left'),right=source('right');
  const game={mode:'campaign',charge:0,triggerHeld:false,getInteraction:()=>({id:'archive'}),nearbyWeapon:()=>null};
  const state=Object.assign(Object.create(VRController.prototype),{
    mode:'xr',settings:{...VR_DEFAULTS,hand},session:{inputSources:[left,right],visibilityState:'visible'},
    previous:new Map(),controllers:[],triggerBlocked:false,
    hooks:{game:()=>game,phase:()=> 'playing',world:()=>({renderer:{xr:{getReferenceSpace:()=>({})}}})}
  });
  return {state,game,left,right,free:hand==='right'?left:right};
}
function press(source,index,down=true){source.gamepad.buttons[index]={pressed:down,value:down?1:0};}

for(const hand of ['right','left'])test(`Quest ${hand}-hand shooting: a terminal consumes one free-stick press without crouching after it closes`,()=>{
  const {state,game,free}=controller(hand);
  press(free,3);let input=state.input();
  assert.equal(input.pickup,true);assert.equal(input.crouchToggle,false);assert.equal(input.fire,false);
  game.getInteraction=()=>null;input=state.input();
  assert.equal(input.pickup,false);assert.equal(input.crouchToggle,false,'holding after a terminal interaction does not crouch');
  press(free,3,false);state.input();press(free,3);input=state.input();
  assert.equal(input.crouchToggle,true,'away from terminals a new press still crouches');
  game.getInteraction=()=>({id:'exit'});input=state.input();
  assert.equal(input.pickup,false,'walking into terminal range with a held crouch click does not interact');
  press(free,3,false);state.input();press(free,3);assert.equal(state.input().pickup,true);
});

test('terminal interaction falls back to nearby survival weapons and never repeats while held',()=>{
  const {state,game,free}=controller();delete game.getInteraction;
  game.nearbyWeapon=()=>({index:1});press(free,3);assert.equal(state.input().pickup,true);
  game.nearbyWeapon=()=>null;assert.equal(state.input().crouchToggle,false);
  press(free,3,false);state.input();press(free,3);assert.equal(state.input().crouchToggle,true);
});

test('the headset ending board shows a finite level-1 replay and the correct left-handed button',()=>{
  for(const hand of ['right','left']){
    const lines=[],context={fillRect(){},fillText:text=>lines.push(text)},game={mode:'campaign',state:'won',wave:1,player:{yaw:0},weapon:{reload:1},reloadRemaining:0,charge:0};
    const state=Object.assign(Object.create(VRController.prototype),{
      mode:'xr',settings:{...VR_DEFAULTS,hand},hud:null,hudTime:0,controllers:[],reloadGesture:0,chargeBuzz:0,shadowTick:0,
      pauseBoard:{panel:{},texture:{},canvas:{getContext:()=>context},over:false},
      hooks:{game:()=>game,phase:()=> 'over',world:()=>({renderer:{shadowMap:{}}})}
    });
    state.update(.016,0);
    assert.ok(lines.includes('NIVEAU 1 TERMINÉ'));
    assert.ok(lines.includes(`${'B'} : REJOUER LE NIVEAU 1`));
    assert.ok(!lines.some(line=>/20 niveaux|CONTINUER EN SURVIE/.test(line)));
    assert.equal(state.pauseBoard.texture.needsUpdate,true);
    assert.equal(state.pauseBoard.panel.visible,true);
  }
});
