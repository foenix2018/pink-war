// Subtle breathing and shoulder sway for flat-screen practice. Real tracked
// Quest aim is never altered, and no target attracts the barrel.
export function rangeHoldOffset(time,{moving=false,aiming=false,crouched=false,heat=0}={}){
  const steady=(aiming?.32:1)*(crouched?.7:1),breath=.00085*steady;
  const gait=moving?.0034*steady:0;
  return {
    pitch:Math.sin(time*1.7)*breath+Math.sin(time*10.2)*gait,
    yaw:Math.sin(time*.85+.8)*breath*.7+Math.sin(time*5.1)*gait*.55,
    recoilScale:.32+Math.min(1,Math.max(0,heat))*.10
  };
}
