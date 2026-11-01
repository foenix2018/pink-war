// Shared iPhone/iPad Safari + desktop controller discovery and on-screen guide.
// Gamepad APIs require a connected device and may appear only after a button press.
// Input semantics remain in desktop-input.js; this module never synthesizes presses.
import {normalizeDesktopGamepad,DESKTOP_BUTTONS} from './desktop-input.js';
export const gamepadsNow=()=>{try{return Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch{return [];}};
export const isDualShock4=pad=>!!pad&&/dualshock\s*4|wireless controller|054c.*(?:05c4|09cc|0ba0)/i.test(pad.id||'');
export const controllerLabel=pad=>isDualShock4(pad)?'DUALSHOCK 4':pad?.id?.includes('DualSense')?'DUALSENSE':'MANETTE';
export const PS4_CONTROLS=Object.freeze({
  move:'Stick gauche',look:'Stick droit',aim:'L2',fire:'R2',jump:'Croix',
  reload:'Carré',next:'Triangle',crouch:'Rond',sprint:'L3',
  interact:'R3',charge:'L1',melee:'R1',companion:'Croix directionnelle ↑',pause:'OPTIONS'
});
// Keep gamepad detection and all the real bindings, but remove the floating
// "MANETTE PS4" label/guide that obscured the ammunition counter on iPhone.
let singleton=null;
export function createGamepadAid(){
 if(typeof document==='undefined')return {update:()=>null,dispose(){}};
 if(singleton)return singleton;
 const update=()=>{
  const pad=gamepadsNow().map(normalizeDesktopGamepad).find(Boolean)||null;
  document.documentElement.classList.toggle('pw-gamepad-connected',!!pad);
  return pad;
 };
 const listener=()=>update();
 for(const event of ['gamepadconnected','gamepaddisconnected','pageshow','focus'])window.addEventListener(event,listener);
 const api={root:null,update,dispose(){
  for(const event of ['gamepadconnected','gamepaddisconnected','pageshow','focus'])window.removeEventListener(event,listener);
  document.documentElement.classList.remove('pw-gamepad-connected');
  if(singleton===api)singleton=null;
 }};
 singleton=api;update();return api;
}
