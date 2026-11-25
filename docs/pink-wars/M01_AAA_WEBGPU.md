# M01 — refonte AAA WebGPU, lot 1
Branche de validation, non production. Parcours, collisions, rigs et objectifs inchangés.
- WebGPU prioritaire M01 mobile si disponible, option renderer=webgl maintenue ; autres niveaux inchangés.
- Cibles 60 FPS performance/équilibré, 30 FPS ultra ; plafonds pixels 650k/900k/1.2M. Géométrie mobile conservatrice.
- Post-traitement natif mobile limité à 4 échantillons de bloom et vignette, pas de SSAO mobile ; repli direct WebGL. Exposition intérieure progressive.
- Télémétrie FPS/p95, résolution adaptative.
- À valider : Safari physique iPhone 14 Pro, rendu natif, repli, FPS et chauffe 30 min, GHJU/LYLU, phases, sauvegardes, Quest, comparaison visuelle. Aucun résultat de FPS réel revendiqué.
- Lots ultérieurs : éclairage précalculé par secteur, textures KTX2/LOD, animations, gunplay, IA, son et cinématiques. Ne pas fusionner avant validation.

## Lot 2 — finition intégrée
- Correction du cache d'armures pour squelettes de même pose, tests de régression conservés.
- Normal maps ciblées sur les surfaces architecturales natives mobiles, couche de contact/usure des sols intérieurs instanciée (un draw call), sans colliders.
- Balancement FPS lié à la vitesse, neutralisé en ADS ; aucun changement des rigs ou de la simulation.
- Interception ORDRE structurée, signal de contact selon perception existante, titres de progression non bloquants, cues audio originaux, style tactile ciblé M01.
- Réduction du coût CPU des projecteurs mobiles ; profil de post-traitement commutable et reprise sans post-traitement si son premier rendu échoue.
- Toujours à valider : rendu visuel réel, tests complets, capture Safari/iPhone, métriques physiques. Ce lot n'est pas une refonte complète des modèles Blender, animations mocap, doublages, IA ou cinématiques.

## QA navigateur
Le workflow M01 AAA browser validation capture les deux héros dans la caserne, le quartier, les archives et la serre, avec rapport de backend et télémétrie. Le test utilise Chromium logiciel émulant le mobile ; il ne prouve ni Safari ni les 60 FPS sur iPhone. Les téléportations de QA ne prouvent pas un parcours complet.
