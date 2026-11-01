// Appearance only: no gameplay state and no WebXR controls are owned here.
export const HUD_ICONS=Object.freeze({
 objective:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
 shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/>',health:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
 swap:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',aim:'<circle cx="12" cy="12" r="7"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>',jump:'<path d="m5 13 7-7 7 7m-14 6 7-7 7 7"/>',
 fire:'<path d="m6 18 12-12m-8-1h9v9M4 13l7 7"/>',crouch:'<circle cx="14" cy="5" r="2"/><path d="m12 9-3 5h7l3 5M9 14l-4 5m9-9 5 3M4 21h16"/>',
 melee:'<path d="M6 12V7a2 2 0 0 1 4 0V6a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v5m-8-3v3m4-3v3M6 11l-2 1v4l4 5h8l4-6v-3l-3-1-4 3-3-2Z"/>',
 grenade:'<path d="M9 6V4h6v2M12 4V2m-3 0h6M8 7c-2 2-3 5-3 9a7 7 0 0 0 14 0c0-4-1-7-3-9Z"/><path d="M8 10l8 2m-9 2 10 2m-8 3 6 1"/>',
 charge:'<circle cx="12" cy="13" r="7"/><path d="M10 3h4m-2 0v3m2 4-4 4h4l-3 4"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 interact:'<path d="M8 21V10a2 2 0 0 1 4 0v3m0-4V5a2 2 0 0 1 4 0v8m0-4a2 2 0 0 1 4 0v7l-3 5H8l-4-7a2 2 0 0 1 3-2l1 1"/>',
 sprint:'<circle cx="15" cy="4" r="2"/><path d="m12 8-4 4 5 3-2 6m1-13 4 5h5M9 10l-4 2m8 3 5 5M2 6h6M1 9h4"/>',
 'down-double':'<path d="m5 4 7 7 7-7m-14 8 7 7 7-7"/>'
});
export const hudIcon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+HUD_ICONS[name]+'</svg>';
export function setHudContrast(opaque,doc=document){
 doc.body.classList.toggle('pw-hud-opaque',!!opaque);
 try{doc.defaultView.localStorage.setItem('pink-war-hud-contrast',opaque?'opaque':'glass');}catch{}
 for(const input of doc.querySelectorAll('[data-hud-contrast]'))input.checked=!!opaque;
}
export function restoreHudContrast(doc=document){
 try{doc.body.classList.toggle('pw-hud-opaque',doc.defaultView.localStorage.getItem('pink-war-hud-contrast')==='opaque');}catch{}
}
export function createHudContrastControl(doc=document){
 restoreHudContrast(doc);const label=doc.createElement('label');label.className='pw-hud-contrast setting-row';
 label.innerHTML='<span>Lisibilité renforcée<small>Fonds opaques, sans flou</small></span><input type="checkbox" role="switch" data-hud-contrast>';
 const input=label.querySelector('input');input.checked=doc.body.classList.contains('pw-hud-opaque');input.onchange=()=>setHudContrast(input.checked,doc);return label;
}
export function skinCombatControls(doc=document){
 for(const [name,selector] of Object.entries({fire:'#btnFireMobile,#fire-button,[data-m02=fire]',aim:'#btnAimMobile,#aim-button,[data-m02=aim]',jump:'#btnJump,#jump-button,[data-m02=jump]'})){
  for(const button of doc.querySelectorAll(selector))if(!button.dataset.pwImmersion){
   button.dataset.pwImmersion=name;button.innerHTML=hudIcon(name);button.setAttribute('aria-label',name==='aim'?'Viser':name==='fire'?'Tirer':'Sauter');
  }
 }
}
