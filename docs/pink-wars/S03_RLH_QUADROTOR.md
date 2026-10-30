# Pink Wars — S-03 quadrirotor de combat / audio RLH

Choix graphique : **drone militaire cyberpunk caréné**, avec coque compacte, quatre bras structuraux en X, quatre turbines carénées, trois pales par rotor et iris optique sur nacelle.

Le vol reste pseudo-physique et compatible WebGPU/WebGL : la vitesse horizontale réelle est projetée dans le repère d'orientation du drone ; un amortissement temporel génère tangage et roulis. Les commandes de visée et la physique des projectiles demeurent inchangées. Le comportement des quatre turbines destructibles demeure celui de S-03 V1.

**Son source authentique :** `foenix2018/RLH/js/modules/gameplay/drone-fpv-v761.js`, fonctions `startSound`/`setSound`, lignes 182-193, module Rescue 01. Le son n'est pas un fichier audio ; il utilise quatre oscillateurs **sawtooth** (155 Hz + 3 Hz par turbine), quatre filtres **lowpass** (1 250 Hz au repos), des gains initiaux de **0,012**, avec variation par la vitesse et amortissement Web Audio. Implémentation intégrée : `dist/rlh-drone-audio.js`.

Adaptations Pink Wars : émetteur sonore le plus proche parmi les S-03 actives, atténuation avec la distance et panoramique stéréo, changement de fréquence lié à la vitesse, perte d'un moteur lorsqu'un rotor est détruit. L'AudioContext existant est réutilisé après interaction, sans nouvel objet audio par image ; arrêt / silence si la partie est en pause ou que le son est désactivé, et libération lors de la fermeture.

Tests : `tests/374-s03-flight-audio.test.mjs` et `tests/ambience.test.mjs`. Vérifications de la silhouette, des 6 lots WebGPU, de l'absence de lumières dynamiques, de l'absence d'autoplay, du rendu moteur asymétrique et du son RLH.
