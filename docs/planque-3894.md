# Pink Wars 3.89.4 — Cara et Gaby dans la planque

Les pancartes portant le nom des pièces sont retirées, avec leur support, ainsi que les noms sur les linteaux des onze portes. Les boutons de navigation et les menus conservent leurs libellés pour retrouver les stations. Les identifiants utiles des bornes GAB-1 / CAR-14, les noms des armes et la porte de mission restent lisibles.

Les deux corps provisoires des stations de recharge sont remplacés par les vrais modèles `createCompanionModel` utilisés par `createAICompanion` : Gaby à quatre pétales pour GHJU, Cara à six pétales pour LYLU. Coques, lentilles, iris, visserie, stabilisateurs et couleurs proviennent directement du jeu. La taille d’origine est conservée, avec une pose de repos évaluée par le modèle natif. Les anneaux de la borne sont placés sous les compagnons pour dégager l’optique et les coques.

La capture rejoint le catalogue statique existant : aucune IA ni squelette de compagnon supplémentaire n’est simulé dans la planque. Les deux modèles sont également présents dans la source Blender téléchargeable. Les fonctions de recharge, les vraies tenues, armes, portes et la ville 3D sont conservées.

## Reconstruction

```sh
blender --background --threads 4 --python tools/blender/hideout.py
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tools/build-hideout-showcase.mjs
blender --background --threads 4 --python tools/blender/hideout-display-import.py
```

Le serveur HTTP de `dist` doit fonctionner sur le port 4176 pour la capture du catalogue. La capture reste une opération d’édition et n’est pas exécutée au chargement du jeu.

## Validation

- 60 tests ciblés passent : identité, géométrie, échelle et pose des compagnons comparées aux constructeurs natifs, catalogue et couleurs, circulation, portes, progression et préparation du chapitre 3.
- Catalogue statique : 531 968 triangles, 92 lots, 5,34 Mo compressés ; décor : 311 726 triangles, 27 lots. L’ajout des compagnons représente 50 032 triangles et cinq lots.
- Contrôles navigateur sur PC et iPhone émulé : recharge, repos, circulation, atelier, tenue, archives, départ et séparation des sauvegardes GHJU / LYLU.
- Contrôle WebGPU natif et captures rapprochées des deux compagnons, des portes sans pancarte et de la baie animée.
- Réouverture de la source Blender : huit pièces, onze portes, deux compagnons canoniques, aucune ancienne pancarte, images utilisées intégrées, copie publique identique au fichier source.

Preuves : `/workspace/livraison/pink-wars-planque-companions-20261122/`.
