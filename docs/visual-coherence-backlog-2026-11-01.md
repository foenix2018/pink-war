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

## Reste à auditer / corriger sans livraison immédiate
1. M01 : voiture primitive `case 'car'` encore faite de blocs, et accessoires ARI/tuyaux qui manquent de raccords et d'identification réaliste.
2. M01 : pickups représentés par une caisse générique et un octaèdre flottant ; revoir lisibilité matérielle, silhouette et cohérence avec objet récupéré.
3. M02 : centrales de ventilation `coolingUnit`, mobiliers marchands, équipements de toitures encore cubiques.
4. Autres missions : inventorier systématiquement objets que le joueur ne peut pas identifier sans contexte (collectibles, portes, consoles, véhicules, interactions).
5. Personnages/ennemis : contrôles comparés aux artworks approuvés sous 3 angles (face, profil, dos) ; audit des pieds, articulations et parties cachées.
6. Physique et immersion : vérifier visuellement que silhouettes, collisions, points de tir, sorties de projectiles, déplacements VR et animations sont cohérents.
7. Vérifier que les anciens tests de locomotion Rempart et collisions échouent déjà sur main avant de distinguer les régressions éventuelles.

## Statut vérification
Modifications poussées uniquement sur la branche de travail. **Tests automatisés ajoutés, mais campagne de tests complète de cette branche pas encore exécutée**. Revue visuelle réelle sur Dell, iPhone et Quest 3 non effectuée. Aucune livraison demandée ou effectuée.
