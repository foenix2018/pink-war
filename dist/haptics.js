// Shared Touch Plus feedback. Magnitudes are bounded by the controller API.
const shots=Object.freeze({r9:[.88,65],bloom:[.8,45],lance:[.97,95],thorn:[1,145],nova:[1,180],aurora:[.7,75]});
export function hapticPlan(type,arg){
 switch(type){
  case 'shot':return {main:shots[arg]||shots.r9};
  case 'jump':return {side:[.3,45]};
  case 'parry':return {main:[1,95],side:[.45,45]};
  case 'charge':return {main:[.12+.5*Math.max(0,Math.min(1,Number(arg)||0)),45]};
  case 'hit':return {main:[.2,22]};
  case 'kill':return {main:[.5,50]};
  case 'combo':return {main:[Math.min(1,.35+.12*(Math.max(2,Number(arg)||2)-2)),70]};
  case 'pickup':return {main:[.45,60],side:[.45,60]};
  case 'weapon':return {main:[.3,45]};
  case 'reload':return {main:[.3,45],side:[.3,45]};
  case 'reloaded':return {main:[.5,65],side:[.5,65]};
  case 'damage':return {main:[.8,110],side:[.8,110]};
  default:return {};
 }
}
export function buzz(pad,[strength,duration]){
 try{
  const actuator=pad?.hapticActuators?.[0];
  if(actuator?.pulse)actuator.pulse(strength,duration)?.catch?.(()=>{});
  else pad?.vibrationActuator?.playEffect?.('dual-rumble',{duration,strongMagnitude:strength,weakMagnitude:strength})?.catch?.(()=>{});
 }catch{}
}
