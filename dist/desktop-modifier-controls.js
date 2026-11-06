/* Pink Wars desktop shortcut mapping.
   AltGraph (Win AltGr) may synthesize Ctrl: never mistake it for ADS.
   Mac supports both the physical Control key and Command for ADS.
   The left Option key is additionally accepted on Mac for grenade throws. */
export const isMacDesktop=/Mac|iPhone|iPad|iPod|iOS/i.test(navigator.userAgentData?.platform||navigator.platform||navigator.userAgent||'');
export function modifierZoomHeld(keys){
 return !(keys.has('AltRight')||keys.has('AltGraph'))
   && (keys.has('ControlLeft')||keys.has('ControlRight')
     || (isMacDesktop&&(keys.has('MetaLeft')||keys.has('MetaRight'))));
}
export function desktopZoomHeld(keys){return keys.has('KeyO')||modifierZoomHeld(keys);}
export function grenadeShortcut(e){
 return !e.repeat&&(e.code==='AltRight'||e.key==='AltGraph'||(isMacDesktop&&e.code==='AltLeft'));
}
