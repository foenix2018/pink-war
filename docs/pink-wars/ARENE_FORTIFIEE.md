# Arène fortifiée

Enceinte continue de 14 m, 16 tours de surveillance avec projecteurs mobiles,
bannières ORDRE, grilles de ventilation, conduites, générateurs, voies de service,
drains, flaques, pluie et brume magenta. Les collisions du périmètre restent actives
en saut. Les couverts et les itinéraires existants sont conservés.

## Vagues

Les 20 vagues et leur progression de 5 à 62 ennemis sont conservées, avec un maximum
de 18 ennemis actifs. La première vague présente Poursuivant, Synthétique, Rampant
et Spectre. Les vagues suivantes ajoutent les modèles actuels de Reconnaissance,
Brute, Sonde, puis Traqueur (vague 4) et Rempart (vague 7). Les modèles proviennent
de la fabrique d'ennemis existante, avec leurs animations et comportements actuels.

## Tourelles

Huit postes sur des plateformes accessibles dans la cour. Chaque tourelle a
320 PV et rapporte 300 points. L'ARES X9 inflige 160 dégâts à toute distance.
Les autres armes, le sabre, la frappe et les charges ne peuvent l'endommager que
si l'origine de l'attaque est à 5 m au maximum du centre de la tourelle, en 3D.
Les tirs alliés ne peuvent pas contourner cette règle. Une charge conserve son
point de lancement ; une explosion proche provenant d'un lancer lointain ne
traverse pas le blindage.

Au maximum deux tourelles acquièrent simultanément le joueur, à moins de 62 m et
sans obstacle. Un laser et un signal sonore annoncent le tir pendant 0,95 s.
La cible reste figée pendant ce délai pour permettre l'esquive. Un projectile
inflige 14 dégâts ; la cadence laisse 2,7 s entre les acquisitions. Les tirs sont
arrêtés par les obstacles et le blindage des autres tourelles. Les carcasses restent
hors service entre les vagues et sont rétablies au lancement d'une nouvelle partie.
Elles ne comptent pas parmi les ennemis à éliminer pour finir une vague.

## Vérification

Tests dédiés : `tests/arena-defense.test.mjs` et `tests/arena-fortress.test.mjs`.
Ils couvrent notamment les 20 vagues, les protections, les projectiles, les
origines des attaques, les collisions, les acquisitions, les limites de géométrie
et la remise à zéro. Les tests existants de combat et d'armure sont également exécutés.

Rendu WebGL vérifié avec Chromium/SwiftShader aux deux niveaux de qualité ; le
changement arène/campagne/stand masque correctement le décor et ses obstacles.
Le décor seul compte environ 93 000 triangles, 238 maillages et au maximum cinq
lumières dynamiques en haute qualité. Les géométries des huit tourelles sont
partagées. Les performances sur téléphone et casque réel restent à mesurer.

La suite supplémentaire `364-gloves-sights.test.mjs` contient une assertion de
version déjà incompatible avec HEAD : elle exige `game.js?v=3.74.0`, tandis que
`entry.js` charge déjà `3.86-robot-destruction-audio-foret-m06`. Ce point préexistant
n'est pas modifié ici.

Cible de livraison : branche `main` de `foenix2018/pink-war`, projet Vercel
`pink-war`, domaine de production `https://pink-war.vercel.app`.
