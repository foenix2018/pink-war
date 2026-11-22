# Pink Wars 3.91.0 — La Couronne HELIX et double saut commun

Le chapitre 10 est une mission jouable à huit objectifs dans l’ancien siège HELIX : sas, esplanade, accès de recherche, laboratoire, liaison avec Adrian Kessler, archives de supervision, confinement puis fuite vers le quai AEGIS à l’est.

Le scénario reprend le chapitre 10 de la bible narrative V2 : Kessler prétend avoir voulu empêcher la Chute ; les archives démontrent l’autorité transférée à ORDRE. Il reconnaît les deux sphères et tente de les faire capturer. Les héros s’échappent avec les preuves. Les révélations des chapitres ultérieurs restent réservées à ceux-ci.

## Niveau et rendu

- `m10-layout.js` définit les sols, marches, pièces vitrées, portes, obstacles, gardes, provisions et objectifs. Les flèches utilisent des jalons par les véritables ouvertures, les détours du comptoir et les paliers.
- Le siège reprend la cour HELIX existante. Les nouveaux laboratoires, appareils d’analyse, baies d’archives, pupitres, passerelle et quai sont exportés depuis Blender. La navette est l’AEGIS canonique du chapitre 9. GHJU et LYLU utilisent leurs vrais modèles ; le deuxième héros et sa véritable sphère sont présents devant la liaison privée.
- La source `assets/m10/PinkWars_N10_Couronne_HELIX.blend` est identique à sa copie publique. Elle contient les compléments et leurs portes animées ; la cour existante est présente sous forme de repères. Elle ne prétend pas remplacer la source de toute la ville procédurale.
- WebGPU : écran de liaison animé en TSL/WGSL et effets spatiaux du siège ; WebGL compatible conserve les objets et le déroulement. Les jardinières ont des parois et des rebords cylindriques ; leur feuillage découpé remplace les anciens blocs verts et oscille avec le vent en WebGPU. Les décors opaques proches sont regroupés par matériau et secteur ; vitres, portes, commandes, acteurs et objets animés restent indépendants.
- Un checkpoint par objectif, sauvegardé séparément pour chaque héros ; les portes nécessaires sont restaurées avant le placement du personnage. Quitter un terminal interrompt son transfert. Les unités tombées hors du quai ne bloquent pas une étape.
- VOLTIS IEM est accessible au chapitre 10. Son plan et les archives de plans manqués se trouvent au vrai étage de la salle d’archives. Les nanoparticules et la fabrication restent gérées par la nanoforge commune.
- Le chapitre est accessible depuis Histoire et depuis la planque après le chapitre 9. L’épilogue revient à la planque du bon héros ; les chapitres 11 à 20 restent en préparation.

## Double saut

Le moteur distingue `jumpPressed`, un nouvel appui, de `jump`, le maintien du bouton. Une image sans relâchement entre deux appuis n’empêche plus le deuxième saut. Les sous-étapes de simulation à bas FPS ne rejouent pas un appui plusieurs fois.

La capacité est commune aux deux héros, dès le niveau 1, dans les dix chapitres jouables, l’arène et le stand. Aucun niveau d’équipement ni achat n’est requis. Le second appui peut maintenir le mini-jetpack existant, avec ses deux secondes de carburant ; le sol rétablit le budget et le maintien ne provoque pas de saut automatique. Les collisions et la limite de deux impulsions restent actives.

Les pages transmettent le clavier Espace/J, le bouton tactile et la manette. Le contrôleur Quest distingue lui aussi A maintenu et le nouvel appui. Le niveau 1 alimente désormais le modèle et le son depuis l’état physique commun, au lieu des anciens drapeaux du contrôleur d’exploration.

## Reproduction et preuves

```sh
node --test tests/391-m10-helix.test.mjs tests/391-universal-double-jump.test.mjs
blender --background --threads 4 --python tools/blender/m10_helix.py
AUDIT_OUTPUT=/tmp/m10 node tools/verify-m10-gpu.mjs
AUDIT_OUTPUT=/tmp/m10 node tools/verify-m10.mjs
AUDIT_OUTPUT=/tmp/m10 node tools/verify-m10-preview.mjs
AUDIT_OUTPUT=/tmp/m10 node tools/verify-universal-jump.mjs
```

Les outils navigateur acceptent `PLAYWRIGHT_MODULE` et servent `dist` sur le port 4176. La vérification des sauts utilise les véritables pages et contrôleurs ; ses événements rapides passent par `document`, comme les événements clavier réels. Les captures WebGPU proviennent d’une cible de rendu lue en pixels. Le mode mobile est une émulation du viewport et du tactile ; aucun résultat de FPS sur téléphone physique n’est annoncé.

Les preuves, mesures et résultats finaux sont conservés dans `/workspace/livraison/pink-wars-niveau10-20261122/release.json` et les fichiers voisins. Le test historique « running jump » initialise maintenant une véritable course avant le saut : les mesures avant/après montrent que la vitesse et le premier saut du jeu n’ont pas été changés.

Validation de la livraison : 246 tests ciblés réussis, puis 73 contrôles ciblés après les derniers ajustements, et contrôle de version unique réussi. Les douze pages réelles (chapitres 1 à 10, arène et stand) passent le double saut rapide. Le chapitre 10 termine ses huit étapes avec chaque héros dans le navigateur ; un rechargement réel restaure le checkpoint après Kessler. Le rendu WebGPU natif, le feuillage animé et les deux profils de l’aperçu 3D sont vérifiés séparément. Le parcours complet et le guidage sont également testés avec le véritable moteur de déplacement et les collisions ; les essais navigateur des objectifs utilisent les commandes de contrôle pour accélérer les combats et transferts.
