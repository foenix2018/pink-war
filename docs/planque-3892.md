# Pink Wars 3.89.2 — Vrais équipements sur les présentoirs

Les silhouettes de fusils et les mannequins propres au décor sont supprimés. Le mur présente les vrais VX-9, NEXUS V9, ARES X9, THORN, NOVA, M-12, VOLTIS IEM, GROZA-40 et le manche AURORA au repos. Le vrai VX-9 DUO est posé dans la vitrine ; le VORTEX AR-7 repose sur le tapis de l’atelier. Chaque modèle garde ses dimensions métriques, ses couleurs, ses accessoires et ses cartes de matière.

Les deux cabines contiennent les tenues complètes de GHJU et LYLU, avec casque, armure, gants RLH, cape et tabard déchirés, capuche, ceinture et fusil dorsal. Ce sont des modèles de catalogue complets ; ils ne modifient pas la tenue préparée pour le personnage jouable et ne débloquent aucun équipement dans le profil.

## Provenance et préparation

`dist/hideout-showcase.js` est l’outil de capture des modèles natifs : `createWeaponModels`, le chargement de production de NOVA avec `installKenneyBlasters`, `installPinkWarsSoldier`, puis la pose neutre existante `poseUnarmedForInspection`. Il attend les équipements, textures et modèles de production avant la capture. Les skins sont évalués sur leur vrai squelette ; les parties cachées ne sont pas exportées. Les transformations de conversion et d’échelle, reflets des gants, couleurs par sommet et UV secondaires sont conservés.

`tools/build-hideout-showcase.mjs` produit `showcase.pwm.gz` et `showcase-materials.json`. Les pièces opaques de finition compatible partagent leurs matériaux ; leurs couleurs sont conservées dans les sommets. Les textures originales, transparences, découpes et cartes de relief restent présentes. Les finitions métalliques non texturées sont regroupées par rugosité pour l’exposition. Le lecteur PWM accepte désormais une couleur par sommet optionnelle ; les autres fichiers gardent leur format.

Le jeu ne crée pas les deux squelettes des tenues exposées : `hideout-showcase-assets.js` charge uniquement les maillages statiques préparés. L’outil de capture natif n’est pas importé par la planque jouable. Il n’y a ni animation, ni simulation, ni logique de combat supplémentaire sur les présentoirs.

## Objets et supports

- Le mur est réparti sur trois rangées, avec berceaux, noms et fixations. Le duo dispose de deux supports à la même hauteur.
- Les deux tenues reposent sur des socles rose/bleu et sont identifiées. Les présentoirs et la nouvelle vitrine ont des collisions.
- Les couettes ont des cellules matelassées et un bord qui retombe, au lieu de traits au-dessus d’un bloc.
- Les tiroirs ont des façades séparées, des poignées pliées et des serrures ; les poignées en double sont supprimées.
- Le VORTEX repose sur un tapis et des supports d’entretien aux dimensions de l’arme.

## Reconstruction et fichier Blender

Avec un serveur local servant `dist/` sur le port 4176 :

```sh
blender --background --threads 4 --python tools/blender/hideout.py
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tools/build-hideout-showcase.mjs
blender --background --threads 4 --python tools/blender/hideout-display-import.py
```

Le dernier outil ajoute les vraies géométries, couleurs, UV, normales et textures à la collection **Équipement officiel Pink Wars** du fichier Blender. Les images sont intégrées, puis le même fichier est copié vers le téléchargement public. Le `.blend` est un téléchargement optionnel ; il n’est pas chargé par le jeu.

Les statistiques exactes des deux lots sont fournies dans `dist/assets/hideout/stats.json` et `showcase-stats.json`. Les captures et rapports de contrôle sont conservés dans `/workspace/livraison/pink-wars-planque-showcase-20261121/`.

Contrôles terminés :

- **48 tests ciblés passent** : pose figée, peau et normales évaluées, transformations et reflets, couleurs natives, contenu du catalogue, navigation avec les nouvelles collisions, préparation et nanoparticules. Les 17 fichiers PWM existants ont également été contrôlés pour éviter une collision avec le nouvel attribut optionnel.
- **PC et iPhone émulé** : repos, choix d’arme, fabrication, tenue, archives, recharge et départ fonctionnent sans erreur JavaScript ; le vrai chapitre 3 reçoit la préparation sur PC. Les deux profils restent séparés. Les vraies armes et tenues sont chargées dans les deux cas.
- **Blender 4.3.2** : 259 objets, 87 maillages canoniques représentant 481 936 triangles, 47 images utilisées embarquées, onze armes et deux tenues dans la collection officielle. La copie téléchargeable correspond au SHA-256 du fichier source.

Les contrôles mobiles emploient Chromium avec un profil iPhone et des entrées simulées. Aucune fréquence d’image sur téléphone physique n’est affirmée.

- **WebGPU natif** : le vrai catalogue statique est affiché avec le décor, sans erreur JavaScript. La vue de contrôle compte **121 appels de dessin**, pour 319 770 triangles de décor et 481 936 triangles d’équipement. Des captures vérifient notamment le mur d’armes, les deux tenues, l’atelier et les autres pièces.
- La correction du test de lancement du chapitre 3 reçue dans `1d6276c` est conservée lors de la publication.
