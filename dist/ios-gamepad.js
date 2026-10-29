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
let singleton=null;
export function createGamepadAid(){
  if(typeof document==='undefined')return {update:()=>{},dispose:()=>{}};
  if(singleton?.root?.isConnected)return singleton;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const root=document.createElement('div');root.id='pw-gamepad-aid';
  root.innerHTML='<button type="button" class="pw-gamepad-tag" aria-expanded="false">🎮 <span>MANETTE PS4</span></button><section class="pw-gamepad-guide" hidden role="region" aria-label="Commandes PlayStation"><strong>DUALSHOCK 4 / iOS</strong><p class="pw-pad-status"></p><p>Stick gauche : déplacer · stick droit : regarder<br>L2 : viser · R2 : tirer<br>× : saut · ○ : s’accroupir<br>□ : recharger · △ : changer d’arme<br>L3 : courir · R3 : interagir<br>L1 : charge · R1 : mêlée<br>↑ : compétence · OPTIONS : pause<br>Dans les menus : croix confirmer · rond retour · croix directionnelle naviguer.</p><p class="pw-gamepad-pair">Pour connecter : iOS Réglages → Bluetooth. Maintenir SHARE + PS jusqu’au clignotement, puis sélectionner « DUALSHOCK 4 Wireless Controller ». Dans Safari, appuyer sur un bouton pour activer la manette.</p><button type="button" class="pw-pad-close">Fermer</button></section>';
  const style=document.createElement('style');style.dataset.pwGamepadAid='';style.textContent=`
#pw-gamepad-aid{position:fixed;z-index:110;right:max(8px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 56px);font:12px/1.45 system-ui,sans-serif;color:#e8edf2;pointer-events:none}
#pw-gamepad-aid button{cursor:pointer;font:inherit;border:1px solid #78949d;border-radius:12px;color:#edf7fb;background:#0b1b29ed;padding:7px 11px;pointer-events:auto}
#pw-gamepad-aid .pw-gamepad-tag{opacity:.86;box-shadow:0 4px 12px #0006}
#pw-gamepad-aid[data-connected="true"] .pw-gamepad-tag{border-color:#b2d9b5;background:#10352adf}
#pw-gamepad-aid .pw-gamepad-guide{pointer-events:auto;position:absolute;right:0;top:42px;width:min(350px,calc(100vw - 20px));padding:14px;background:#0a1720f4;border:1px solid #547485;border-radius:16px;box-shadow:0 12px 40px #0008}
#pw-gamepad-aid .pw-gamepad-guide[hidden]{display:none!important}
#pw-gamepad-aid strong{letter-spacing:.08em}#pw-gamepad-aid p{margin:8px 0;color:#c3d0d9}
#pw-gamepad-aid .pw-pad-status{color:#a1eac2;font-weight:700}
@media(max-width:600px){#pw-gamepad-aid{top:calc(env(safe-area-inset-top) + 8px)}#pw-gamepad-aid .pw-gamepad-tag{padding:5px 8px;font-size:11px}}
`;
  document.head.append(style);document.body.append(root);
  let lastConnected=false,lastLabel='',timer=null;
  const tag=root.querySelector('.pw-gamepad-tag'),guide=root.querySelector('.pw-gamepad-guide');
  const toggle=()=>{guide.hidden=!guide.hidden;tag.setAttribute('aria-expanded',String(!guide.hidden));update();};
  tag.onclick=toggle;root.querySelector('.pw-pad-close').onclick=()=>{guide.hidden=true;tag.setAttribute('aria-expanded','false');};
  function update(){
    const pad=gamepadsNow().map(normalizeDesktopGamepad).find(Boolean);
    const connected=!!pad,label=pad?controllerLabel(pad):'MANETTE PS4';
    if(connected!==lastConnected||label!==lastLabel){
      lastConnected=connected;lastLabel=label;tag.querySelector('span').textContent=connected?label+' CONNECTÉE':'MANETTE PS4';
      root.dataset.connected=String(connected);
      document.documentElement.classList.toggle('pw-gamepad-connected',connected);
    }
    root.querySelector('.pw-pad-status').textContent=connected?'Manette détectée. Relâche les touches, puis commence à jouer.':(isIOS?'Aucune manette visible dans Safari. Si tu es dans une application intégrée, ouvre le jeu dans Safari.':'Aucune manette détectée.');
    return pad;
  }
  const listener=()=>update();
  window.addEventListener('gamepadconnected',listener);window.addEventListener('gamepaddisconnected',listener);
  window.addEventListener('pageshow',listener);window.addEventListener('focus',listener);
  timer=window.setInterval(update,600);
  const api={root,update,dispose(){window.clearInterval(timer);for(const event of ['gamepadconnected','gamepaddisconnected','pageshow','focus'])window.removeEventListener(event,listener);style.remove();root.remove();if(singleton===api)singleton=null;}};
  singleton=api;update();return api;
}
