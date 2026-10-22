// Keep one short trigger press across a brief equip/cadence delay. A press
// never invents a sustained hold for charged weapons and expires during reload.
export function createFireBuffer(windowSeconds=.35){
  let until=-Infinity;
  return {
    press(time){until=time+windowSeconds;},
    requested(held,weapon,time){return !!held||(!weapon.chargeTime&&time<until);},
    pending(time){return time<until;},
    consume(){until=-Infinity;},
    reset(){until=-Infinity;}
  };
}
