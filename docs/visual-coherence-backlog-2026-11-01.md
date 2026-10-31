# Pink Wars — audit visuel et cohérence 3D (chantier non livré)
Date : 2026-11-01
Branche : `feat/visual-coherence-hard-surface-pass-20261101`
Base : `939f84e060316d36303322778c466b5c6bf15f1b`
**Ne pas fusionner dans main, ne pas déployer et ne pas publier les aperçus sans validation explicite.**

## Principes
- Conserver les héros GHJU et LYLU, leurs casques et coloris canoniques ; préserver GAB-1/CAR-14.
- Toutes les améliorations modifient les maillages et matériaux du jeu, pas de rendus 2D substitués aux véritables objets 3D.
- Respecter le gameplay : zones de collision, dégagements, états de portes, visée et animations ne sont pas déduits des accessoires purement visuels.
- Triangle budget et matériaux mutualisés, notamment pour Dell / Équilibré+, Quest 3 autonome et iPhone.
- Privilégier WebGPURenderer quand possible avec repli WebGL sur plateformes incompatibles. Ne jamais inventer une prise en charge GPU.
- Zéro modification de production avant la revue visuelle, les tests et la validation utilisateur.

## Corrigé sur branche (non livré)
- M01 / Caserne AEGIS 07 : remplace silhouettes de cubes VSAV 07 et FPT 07 par châssis de secours métriques ; cabine distinguable, pare-brise incliné, rétroviseurs, roues avec jantes et moyeux, garde-boues, compartiments FPT, échelle, raccords arrière, portes VSAV, décorations. Géométrie regroupée par matériau ; collider d'origine inchangé (`rescue-vehicle-detail.js`, `m01-extension-art.js`).
- M02 / District : remplace bornes simplifiées et groupes électrogènes parallélépipédiques par ensembles à géométrie détaillée, raccords de tuyau, capot, ventilateur, prises, panneaux, grilles, évacuation ; rendu statique fusionné (`district-utility-details.js`, `level2-architecture.js`).
- M02 : remplace les octaèdres flottants utilisés comme luminaires par appareils d'inspection avec boîtier, armature et lentille ; aucune lumière GPU ajoutée.
- Tests dédiés ajoutés pour géométrie, proportions et cohérence avec les volumes de collision (`tests/379-world-hard-surface-coherence.test.mjs`).

## Deuxième passe : mobilier, accessoires et cohérence (non livrée)
- Nouveau module `realistic-furniture.js` : remplace les comptoirs du hall et des marchés, bureaux, bancs, casiers, vitrines, rangements archivistiques et meubles techniques par des structures avec pieds, panneaux, portes orientées selon les murs, tiroirs, niches et assemblages PBR mutualisés. Lits de campagne médicaux du district : cadre métallique, barre latérale, roulettes, matelas, oreiller, couverture pliée en véritable maillage.
- `station-equipment-detail.js` : rack ARI reconstruit avec bouteilles, robinets, manomètres et sangles ; couronnes DN45 réalistes et raccords métalliques dans la remise. Évite les doublons de ferrures issus des anciens accessoires.
- `civil-vehicle-detail.js` : voiture abandonnée de la cour dotée d'une vraie silhouette profilée, vitres, portes, rétroviseurs, phares, roues et jantes, au lieu d'un empilement de boîtes.
- `district-utility-details.js` : climatiseurs et refroidisseurs reconstitués avec grilles, doubles ventilateurs et trappes, au lieu de volumes bruts.
- `supply-cache-details.js` : remplace les gemmes octaédriques des cachettes M01 par un kit médical ou une cartouche d'énergie lisibles. La récupération supprime et libère l'asset temporaire.
- `level2-architecture.js` : comptoirs orientés côté piétons, couchages médicaux à l'emplacement d'origine. Les bacs de culture `bed` de la serre M01 sont explicitement conservés comme éléments horticoles, pas confondus avec les couchages.
- Nouvelles régressions à vérifier après publication autorisée : `tests/380-furniture-and-world-realism.test.mjs`, en complément de `tests/379-world-hard-surface-coherence.test.mjs`. Les tests de géométrie n'ont pas encore été exécutés en CI.

## Reste à auditer / corriger sans livraison immédiate
1. M01 : réexaminer la voiture civile et les équipements ARI/tuyaux *désormais modélisés* avec captures WebGPU/WebGL et comparaison aux références.
2. M01 : vérifier en jeu la lisibilité et l'alignement des nouveaux pickups (trousse de secours et énergie), collisions et rythme de récupération inchangés.
3. M02 : vérifier la géométrie des nouveaux refroidisseurs et comptoirs du marché, puis reprendre les autres installations de toit encore simplifiées.
4. Autres missions : inventorier systématiquement objets que le joueur ne peut pas identifier sans contexte (collectibles, portes, consoles, véhicules, interactions).
5. Personnages/ennemis : contrôles comparés aux artworks approuvés sous 3 angles (face, profil, dos) ; audit des pieds, articulations et parties cachées.
6. Physique et immersion : vérifier visuellement que silhouettes, collisions, points de tir, sorties de projectiles, déplacements VR et animations sont cohérents.
7. Vérifier que les anciens tests de locomotion Rempart et collisions échouent déjà sur main avant de distinguer les régressions éventuelles.

## Statut vérification
Modifications poussées uniquement sur la branche de travail. **Tests automatisés ajoutés, mais campagne de tests complète de cette branche pas encore exécutée**. Contrôle statique des imports relatifs et délimiteurs des modules de production effectué. Revue visuelle réelle sur Dell, iPhone et Quest 3 non effectuée. Aucune livraison demandée ou effectuée.
