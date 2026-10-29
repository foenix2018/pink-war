import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeDesktopGamepad,DesktopGamepadInput,DESKTOP_BUTTONS} from '../dist/desktop-input.js';
import {isDualShock4,controllerLabel,PS4_CONTROLS} from '../dist/ios-gamepad.js';
import {createPinkWarsInput} from '../dist/level2-input.js';
import {VRController} from '../dist/vr.js';
const file=n=>readFileSync(new URL('../dist/'+n,import.meta.url),'utf8');
const createDS4=()=>({index:0,id:'DUALSHOCK 4 Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)',connected:true,mapping:'standard',axes:[0,0,0,0],
 buttons:Array.from({length:18},()=>({pressed:false,value:0,touched:false}))});
const down=(pad,index,value=1)=>pad.buttons[index]={pressed:value>.5,value,touched:value>0};
test('iOS Safari Bluetooth DUALSHOCK 4 uses stable standard mapping, not raw guesswork',()=>{
 const pad=createDS4(),normalized=normalizeDesktopGamepad(pad);
 assert.equal(normalized,pad);assert.equal(isDualShock4(pad),true);assert.equal(controllerLabel(pad),'DUALSHOCK 4');
 assert.equal(PS4_CONTROLS.aim,'L2');assert.equal(PS4_CONTROLS.fire,'R2');
 assert.equal(DESKTOP_BUTTONS.jump,0);assert.equal(DESKTOP_BUTTONS.reload,2);
 assert.equal(DESKTOP_BUTTONS.aim,6);assert.equal(DESKTOP_BUTTONS.fire,7);
 assert.equal(DESKTOP_BUTTONS.pause,9);
});
test('PS4 gamepad requires neutral activation, reconnect and focus before gameplay',()=>{
 const pad=createDS4(),i=new DesktopGamepadInput();
 down(pad,7);assert.equal(i.select([pad]),null);
 down(pad,7,0);assert.equal(i.select([pad]),pad);
 pad.axes=[-.6,-1,.45,.4];down(pad,6);down(pad,7);
 assert.equal(i.select([pad]),pad);
 assert.equal(i.select([pad],{focused:false}),null);
 assert.equal(i.select([pad]),null);pad.axes=[0,0,0,0];down(pad,6,0);down(pad,7,0);
 assert.equal(i.select([pad]),pad);
});
test('PS4 buttons control both sticks, ADS, trigger, ammo and single-edge actions in Mission 2',()=>{
 const pad=createDS4(),input=createPinkWarsInput(),keys=new Set();
 input.read(.016,keys,[pad]);
 pad.axes=[.8,-.9,.5,-.4];down(pad,6);down(pad,7);down(pad,2);down(pad,3);down(pad,0);
 let actions=input.read(.016,keys,[pad]);
 assert.ok(actions.moveX>.7&&actions.moveZ<-.8);
 assert.ok(actions.lookX>.7&&actions.lookY<-.5);
 assert.equal(actions.aim,true);assert.equal(actions.fire,true);
 assert.equal(actions.reload,true);assert.equal(actions.next,true);assert.equal(actions.jump,true);
 actions=input.read(.016,keys,[pad]);assert.equal(actions.reload,false);assert.equal(actions.next,false);
});
test('PS4 trigger, focus and reset work in arena/training through common desktop VR adapter',()=>{
 const pad=createDS4(),global=Object.getOwnPropertyDescriptor(navigator,'getGamepads');
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
 try {
  const fake=Object.assign(Object.create(VRController.prototype),{mode:'off',previous:new Map(),hooks:{phase:()=> 'playing',game:()=>({reload:()=>true})}});
  fake.input();
  down(pad,7);down(pad,6);down(pad,0);
  const actions=fake.input();
  assert.equal(actions.fire,true);assert.equal(actions.precision,true);assert.equal(actions.jump,true);
 }finally{
  if(global)Object.defineProperty(navigator,'getGamepads',global);else delete navigator.getGamepads;
 }
});
test('Safari controller aid, launch menu, first mission and second mission use shared gamepad support',()=>{
 assert.match(file('entry.js'),/createGamepadAid\(\)/);
 assert.match(file('entry.js'),/pollLobbyController/);
 assert.match(file('game.js'),/createGamepadAid\(\)/);
 assert.match(file('level2-test.js'),/createGamepadAid\(\)/);
 assert.match(file('vesper-level1-v7.html'),/legacyPS4Input=new DesktopGamepadInput\(\);createGamepadAid\(\)/);
 assert.match(file('vesper-level1-v7.html'),/combatWorld\.gamepad\(devices\):legacyPS4Input\?\.select/);
});
