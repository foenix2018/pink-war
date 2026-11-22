import {jetpackFuel} from './locomotion.js';
import {createJetpackAudio} from './jetpack-audio.js';
// What GHJU and LYLU can do, in every mission, from the stand through every playable chapter. The physics lives once, in ArenaGame
// (game-logic.js + locomotion.js); each level only has to show and sound it. This module is that shared "show and sound"
// layer, so a new ability is added here and in the engine, never level by level.
export const HERO_CAPABILITIES=Object.freeze({
  jump:'saut (sol, mur)', doubleJump:'second saut = mini-jetpack, 2 s de carburant', jetpack:'flammes, fumée, jauge, son',
  slide:'glissade pieds en avant (accroupi en courant)', crouch:'accroupi', sprint:'sprint', fireAim:'tir + visée du pouce dans le cercle du bouton tir',
  grapple:'grappin du bras gauche (T, clic droit, bouton) : moteur partagé, hors chapitre 1 (contrôleur propre)'
});
// Flags every model.animate() call must carry (the body pose, the pack flames and its fuel gauge read them).
export const heroFlightFlags=player=>({slide:!!player.sliding,jetpack:!!player.jetpackActive,jetpackFuel:player.grounded?1:jetpackFuel(player)});
// The thruster sound: one instance per level, updated every simulated frame, silenced on pause.
export function createHeroCapabilityAudio(getContext){
  const jet=createJetpackAudio(getContext);
  return {update(game,on=true){jet.update(!!on&&!!game.player.jetpackActive,jetpackFuel(game.player));},stop(){jet.stop();}};
}
