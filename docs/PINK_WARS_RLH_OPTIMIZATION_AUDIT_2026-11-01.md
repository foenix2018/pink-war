# Pink Wars × Red Line Heat — transfert sélectif des optimisations (2026-11-01)

## Sources effectivement étudiées
Dépôt privé propriétaire : `foenix2018/RLH`, branche `main`.
Références :
- `js/modules/perf/graphics-profiles-v886.js` : moyenne glissante des temps d'image, temporisation sur chute durable, restauration lente, ajustement de DPR.
- `js/modules/perf/ios-staged-reveal-v739.js` : apparition progressive des groupes de meshes sur iPhone/iPad afin de répartir les premiers téléversements GPU et la compilation shaders.
- `js/modules/perf/dell-render-v894.js` : regroupement prudent des objets opaques statiques par matériaux et cellules ; exclusion des commandes, éléments mobiles, interfaces, rétablissement en cas de mouvement.
- `js/modules/perf/shared-geometry-v888.js` : partage de buffers de géométrie strictement identiques pour des meshes réellement statiques.
- `js/modules/perf/mobile-budget-v886.js` : budget de décor lointain plutôt que baisse générale de qualité.
- `js/modules/perf/airfield-clip-v890.js` : visibilité par cellule, à adapter seulement aux grandes collections instanciées.
- `js/modules/perf/xr-adaptive-v868.js` : logique expérimentale de fovéation et d'échelle de viewport WebXR (Three ancienne génération, API dépendante du navigateur) ; ne pas copier telle quelle.
- `js/core/fire-smoke-v786.js` et `js/core/fire-webgpu-scene-v791.mjs` : simulation dédiée au feu / particules plus lourde que les atmosphères actuellement utilisées.
- `js/modules/audio/footsteps-v874.js` : pas contextuels en fonction des surfaces.

## Transfert n°1 effectué sur la branche de travail (sans production)
`dist/rlh-adaptive-resolution.js` transpose **le principe** RLH V886, et non une injection directe du script spécifique RLH :
- Modèle graphique, nombre de polygones, textures PBR et ombres inchangés.
- Réduction douce du seul facteur DPR sous baisse de fluidité durable ; hystérésis et temporisation pour ne pas osciller.
- Plancher mobile 0,78 ; plancher ordinateur 0,85 ; qualité maximale automatique retrouvée après période stable.
- Désactivé sur menu/pause, WebXR, affichage stéréo et onglet invisible ; option haute qualité conservée à 100 %.
- Instancié dans les moteurs M01 (`game.js` / `scene.js`) et M02 (`level2-test.js`).
- Tests indépendants `tests/382-rlh-adaptive-resolution.test.mjs`.
- **Limite :** l'échantillon de temps d'image ne prouve pas que le GPU est le goulet d'étranglement. Ne pas annoncer un gain FPS sans mesure Dell/Quest/iPhone.

## Transferts prometteurs, non réalisés
1. **iOS démarrage progressif (V739)** : transposer à un vrai gestionnaire de chargement avant la première image ; ne pas masquer les contrôles, ennemis, collisions, personnages ou objets d'interaction ; tests Safari nécessaires.
2. **Lots de petits objets et déduplication de géométrie (V894/V888)** : étudier uniquement les props vraiment statiques de chaque chapitre ; plusieurs modèles Pink Wars utilisent déjà `Assembly` ou `InstancedMesh` et il faut éviter le double regroupement.
3. **LOD/culling localisé** : végétation/câbles/débris du niveau 2, sans disparition d'objectifs ni de robots hostiles.
4. **Fumées de RLH** : réutiliser les principes de formes et d'éclairage en fixant budget de particules et tri des effets ; ne pas transférer un solveur d'incendie complet dans les combats.
5. **VR** : utiliser des métriques Quest réelles avant toute modification des viewports WebXR ; ne pas intervenir dans les positions des mains et les viseurs déjà validés.

## Validation attendue
`npm test` sur PR, comparer au niveau de référence déjà imparfait de `main` (7 échecs historiques au 01/11). Puis mesures réelles sur tablette Dell, iPhone Safari et Quest 3 avant publication : FPS médian et 1% low, nombre d'appels de dessin, textures GPU, temps de démarrage, fiabilité pause/reprise XR, qualité du viseur/texte.
