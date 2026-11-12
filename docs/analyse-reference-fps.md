# Pink Wars — évolution FPS à partir de SUBLEVEL 07

Référence demandée : https://wquguru.github.io/fable52-fps-repro/demos/04-fps/ . Dépôt étudié : https://github.com/wquguru/fable52-fps-repro , commit `a7e1df3ce32eb2bb05e23ae457fe5fe2bffab961`, démo `demos/04-fps/index.html`. L’hôte GitHub Pages est filtré dans cet environnement ; les fichiers du dépôt ont été exécutés localement dans Chromium. Analyse du code, des captures du dépôt et d’une session pilotée (déplacement, sprint, visée, tirs et rechargement). Les mesures GPU logiciel de cette session ne constituent pas des mesures de performance sur iPhone ou Quest.

## Ce qui donne son efficacité à la référence

| Domaine | Observation vérifiée dans la démo | Application à Pink Wars |
| --- | --- | --- |
| Lumière et matériaux | Contraste d’un éclairage froid et de sources chaudes locales ; béton, métal, surfaces humides. Un reflet planaire calculé à demi-résolution, une sonde d’environnement, GTAO en qualité Ultra et bloom. | Traitement HDR commun, ombres de contact, flaques reflétant réellement le décor et deux volumes lumineux dans les intérieurs M03. Le décor, les métaux et les couleurs des héros restent ceux de Pink Wars. |
| Déplacement | Vitesse qui accélère et freine ; inertie aérienne ; balancement lié à la vitesse ; amortissement à l’atterrissage. | Intégration analytique de la vitesse commune aux modes utilisant ArenaGame. Le mouvement est vérifié contre les murs et sur les escaliers ; les états de vitesse sont remis à zéro à la reprise d’une sauvegarde. |
| Arme | Recul séparé de la visée ; balancement ; geste de sprint ; rechargement en plusieurs phases avec chargeur mobile, insertion et verrouillage. | Porteur d’animation indépendant de la prise de l’arme, oscillation à la distance parcourue et inertie du regard. Les chargeurs originaux du NEXUS et de l’ARES sont séparés du corps et animés ; la main de soutien suit le chargeur. Les autres armes reçoivent les gestes de tenue et de rechargement communs. |
| Ennemis | La démo montre des drones : accélération, freinage, roulis, virages progressifs, séparation et phase de charge visible avant le tir. Elle ne contient pas d’animations de marche humanoïde. | Inertie de vol et virages progressifs ; vitesse de rotation distincte selon le châssis ; les humanoïdes utilisant le retargeting natif orientent leur foulée dans le déplacement réel, notamment les pas latéraux et le recul. Les tireurs terminent leur orientation avant d’ouvrir le feu. |
| Espaces de combat | Salle compacte, piliers, couvertures de plusieurs hauteurs, voies de contournement et repères lisibles. | Trois secteurs reliés dans l’arène (pompage, atrium, maintenance), dix nouvelles pièces de couverture et trois îlots fonctionnels dans l’annexe/l’atelier de M03. Les modèles et les collisions utilisent les mêmes données. |
| Fluidité | Qualités graphiques, préparation des shaders et réduction de la résolution. | Budget de pixels de bureau borné, pièces fixes fusionnées dans les matériaux existants. Les téléphones, les casques et le mode Performance gardent le rendu direct ; les lunettes et les rendus auxiliaires contournent le traitement d’image. |

## Portée de l’intégration

Les systèmes de déplacement, de tenue des armes, de virage et de présentation sont partagés par les moteurs existants : campagne, arène et stand. Les modifications concrètes du plan de combat concernent l’arène et le niveau 3. Les parcours et objectifs des autres chapitres conservent leur scénario.

Le mouvement de caméra ajouté se limite au mode FPS sur écran. Aucune oscillation synthétique n’est appliquée à la tête ou aux ancres de contrôleurs XR. Les collisions, les munitions, les règles des tourelles et les checkpoint existants restent autoritaires.

Les modules ajoutés sont une implémentation propre à Pink Wars. Le dépôt de référence est consulté sous licence MIT et n’est pas copié dans les ressources du jeu.

## Vérification de la version 3.78.0

- 112 tests ciblés passants : inertie et escaliers, collisions joueur/tirs/ennemis, armes et repères XR, arène, sondes, animations, sauvegardes M02 et boucliers. Après le dernier ajustement de foulée et de virage, les 18 contrôles d’animation/FPS/sondes passent également.
- 29 tests supplémentaires passants : prologue et épilogue M01, extension M02, guidage et stand de tir. Les parcours complets M03 avec les deux héros ont aussi été vérifiés après l’ajout des couvertures.
- Chromium : scène M03 réellement exécutée avec NEXUS V9 chargé et chargeur articulé, en WebGL 2 puis en WebGPU natif. Le rendu WebGPU utilise le traitement commun, deux volumes lumineux et un reflet planaire borné à 96 objets/100 000 triangles et au quart de la résolution. Aucune exception JavaScript ; les trois erreurs réseau observées correspondent aux polices externes volontairement bloquées pendant la capture.
- Une petite scène de validation du traitement HDR a été rendue sur les deux moteurs sans erreur. La voie WebGL interne du WebGPURenderer conserve le rendu direct ; seuls le moteur WebGPU natif et le WebGLRenderer classique reçoivent ce traitement.
- Syntaxe des fichiers modifiés et `git diff --check` vérifiées. L’arène respecte ses limites de 350 000 triangles et 260 maillages fixes ; sa circulation reste reliée depuis le point d’apparition.

La machine de validation utilise SwiftShader : la compilation initiale de la scène M03 complète prend plusieurs minutes. Ces captures valident le fonctionnement, pas une cadence d’images sur GPU physique. Aucune mesure sur appareil iPhone ou Meta Quest n’a été réalisée dans cette session.
