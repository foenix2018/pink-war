# Portes et éclairages industriels — novembre 2026

Travail local dans `pink-war-release`, non publié sur GitHub ou Vercel.

## Modèles intégrés

`dist/industrial-door.js` remplace les vantaux simples des extensions M01/M02, M04, Ligne 9 et M06 : cadres métalliques, panneaux à pans coupés, renforts, vis, seuils, poignées en relief sur les deux faces, pênes mobiles et indicateurs protégés. Les portes de service pivotent avec un ferme-porte à deux bras de longueur constante. Les accès motorisés coulissent sur deux vantaux ; les portes sectionnelles se replient sur un trajet vertical, courbe puis horizontal. Les dimensions, identifiants, collisions, verrous de mission et déclenchements de proximité restent ceux des niveaux.

`dist/industrial-light.js` remplace les blocs lumineux identifiés par des optiques rondes, cages, carters, réflecteurs, ailettes et supports. Intégration dans les extensions M01/M02, Ligne 9, M04/M06, le projecteur de l'armurerie du stand et les projecteurs des tours de l'arène. Ces derniers suivent maintenant l'orientation de leur faisceau. Les tubes néon existants restent gérés par les modules dédiés ; les écrans et ouvertures architecturales ne sont pas convertis en lampes.

Les instances partagent leurs matrices et couleurs d'origine : coupures électriques et clignotements persistent sans assombrir le carter. Aucun ajout de source lumineuse ou carte d'ombre. Les petites pièces fixes sont regroupées par matériau ; seuls les mécanismes nécessaires bougent.

## Vérifications

- 43 tests ciblés passent : mécanismes, nettoyage, transitions électriques, détails M01/M02, défenses de l'arène, terminaux et ombres du stand, interrupteurs et néons.
- Contrôle de syntaxe de dix modules et `git diff --check`.
- Chromium : construction des cinq scènes concernées, cycle ouverture/fermeture d'une porte de chacune, matrices finies, aucune erreur JavaScript ou ressource locale manquante.
- M01/M02 restent sous leurs budgets existants de 140 000 triangles et 170 lots pour les détails ; l'arène conserve les limites de son test existant.
- Captures WebGL de présentation des modèles réels : `/workspace/livraison/Portes_fermees.png` et `/workspace/livraison/Portes_mecanismes.png`. Il s'agit d'une galerie des modèles, sans décor de niveau ni interface de jeu.

Commandes de validation :

```sh
node --test tests/industrial-hardware.test.mjs tests/371-vesper-props.test.mjs tests/372-vesper-realism.test.mjs tests/arena-fortress.test.mjs tests/arena-defense.test.mjs tests/range-terminals.test.mjs tests/36314-range-shadows.test.mjs tests/modern-switch.test.mjs tests/level-neons.test.mjs
```
