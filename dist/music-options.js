import {setMusicEnabled,screenMusicSnapshot} from './menu-music.js';

// One music preference for the lobby and every chapter; sound effects stay separate.
export function createMusicControl(doc=document){
 const label=doc.createElement('label');label.className='pw-music-setting setting-row';
 label.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:48px;padding:12px 0;pointer-events:auto';
 const text=doc.createElement('span');text.textContent='Musique du jeu';
 const input=doc.createElement('input');input.type='checkbox';input.dataset.musicSetting='';input.checked=screenMusicSnapshot().enabled;
 input.style.cssText='width:22px;height:22px;flex:0 0 22px;accent-color:var(--accent,#ef91b4);cursor:pointer';
 input.onchange=()=>setMusicEnabled(input.checked);label.append(text,input);return label;
}
