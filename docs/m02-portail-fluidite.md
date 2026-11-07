# M02 — portail et saccades à l’ouverture

## Problèmes reproduits

Le contrôleur des renforts conservait un portail annoncé pendant 3,2 secondes de charge et 2,4 secondes de maintien. Mais la fonction de déploiement remplaçait temporairement les portails pour positionner les robots, puis supprimait toute la liste. Le portail visible disparaissait donc au moment de l’apparition des renforts. Les deux tests ajoutés pour les séquences de la grille et du quai échouaient avant correction.

Chaque apparition construisait aussi les géométries du portail et ajoutait des lumières à la scène en cours de partie, ce qui créait de nouveaux programmes graphiques. Enfin, la boucle M02 continuait à modifier les objets et leurs ressources pendant l’attente d’un rendu asynchrone WebGPU.

## Correction

- Rétablit les portails annoncés après le placement des robots, jusqu’à leur vraie échéance de fermeture.
- Prépare deux portails réutilisables au chargement du niveau, compile leurs matériaux et charge leurs buffers graphiques avant de rendre le niveau jouable.
- Conserve deux lumières partagées dans la scène pour éviter de recompiler les matériaux du décor à chaque apparition.
- Réutilise les couleurs et les vecteurs de travail des arcs et des particules.
- Suspend les mutations de la scène tant que le rendu asynchrone précédent est en préparation. Réinitialise les effets et sons lors d’une reprise.
- Conserve les sons V4 validés et l’absence de bips intermédiaires. Les clés et le format des points de contrôle restent identiques.

## Vérifications

9 tests ciblés réussis (dont les 2 régressions grille/quai) et 2 tests existants des points de contrôle et du raccordement M02 réussis.

Banc WebGL logiciel, même scène et même parcours avant/après : première synchronisation de 95,9 à 4,1 ms ; premier rendu du portail de 190,8 à 3,3 ms après préparation ; réutilisation de 70,8 à 0,6 ms ; nouveaux programmes au premier portail de 8 à 0 et à sa réouverture de 7 à 0. Ces valeurs décrivent le banc de mesure et non un débit garanti sur tous les appareils.

Navigateur, niveau 2 complet : reprise au point de contrôle de la grille, activation de la manivelle, portail avec 408 segments, deux renforts, maintien du même portail après déploiement, fermeture et ouverture effective de la grille. Le garde de rendu en attente est également contrôlé. Aucune erreur JavaScript ; les requêtes externes refusées concernent le réseau de la machine de test.

WebGPU natif : préparation, ouverture, fermeture et réutilisation réussies ; 408 segments en qualité basse, deux lumières et un portail actif ; aucune erreur JavaScript ou de compilation relevée.
