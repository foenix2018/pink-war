# Pink Wars 3.77.0 — collisions, convoi et véhicules

Les tirs partent désormais du côté du joueur lorsqu’un canon traverse un mur. La correction est commune aux moteurs de combat ; les sondes vérifient également le segment entre leur corps et leur canon. Un mur gagne aussi une égalité de distance avec une cible.

Le bake M03 possède 756 volumes supplémentaires et 130 dalles reconnus dans sa géométrie : parois, éléments en hauteur et corps d’escalier. Le fichier contient ces résultats, sans analyse des maillages pendant les frames. `node tools/repair-m03-collisions.mjs` les reconstruit ; un nouveau bake les produit aussi. Les dalles restent traversables horizontalement sous leur hauteur, arrêtent les projectiles et portent les personnages. La progression des escaliers est échantillonnée tous les 12 cm. Les reprises choisissent leur étage, pas le toit le plus haut.

Le parcours conserve les archives médicales, l’atelier, le relais A3, la neutralisation d’ORDRE, le barrage, l’échangeur et la gare. La liaison du pylône se coupe maintenant depuis une borne à droite du barrage, après lecture d’A3. Cela supprime l’aller-retour au fond de la carte. Dialogues, objectifs, positions de renforts et signalétique suivent ce parcours. Le guidage indique les machines locales qui verrouillent un dispositif.

La trajectoire de l’ambulance tient compte de son gabarit et de ses rotations ; elle s’arrête devant un obstacle. Un ensemble panneau/lampadaire/banc et une barrière béton sont déplacés ensemble avec leurs volumes physiques pour dégager le virage. Le doublon trop large du bâtiment ouest est retiré. Le sabotage du véhicule et les interactions exigent un passage libre, et le sabotage respecte l’étage de l’ennemi.

Les checkpoints des missions qui proposent une reprise ont une balise dans le monde : socle à trois branches, anneaux et cristal scanné en TSL sur WebGPU, bleu LYLU / rose GHJU. Le placement évite les murs et respecte le sol ; aucun éclairage dynamique supplémentaire. Cela matérialise les reprises existantes, sans changer leur persistance.

Les véhicules sont les modèles RLH CMIA et CCRM Gallin, et non les anciennes approximations. Voir `vehicules-rlh.md`. Peinture usée, proportions conservées, corps fermés fusionnés par matériau et roues de l’ambulance conservées pour l’animation. Les volumes de véhicule sont ajustés à leur nouvelle hauteur.

## Vérifications

- 75 tests ciblés : collisions des trois niveaux, projectiles des deux camps, escaliers, navigation, sauvegardes M02, portails, sondes et boucliers.
- 35 tests : moteur de combat complet, modèles fonctionnels, véhicules réels et ville M03.
- 29 tests : missions M01/M02/M03, reprises et parcours intégral M03 à pied avec GHJU et LYLU.
- Le test supplémentaire de sécurité du convoi vérifie qu’une machine derrière un mur ne peut ni le bloquer ni le saboter, et que l’ambulance attend devant le joueur. Parcours M03 rejoué avec cette protection : 10/10 tests.
- 28 modules JavaScript vérifiés syntaxiquement ; `git diff --check` sans erreur.
- Chromium local : démarrage réel et premières interactions M03 en WebGL puis WebGPU natif, balise visible et quatre instances d’ambulance du nouveau modèle dans la scène, zéro erreur JavaScript. Le test masque les appels de polices externes indisponibles dans l’environnement.
- Rendu hors écran WebGPU natif des deux véhicules et de la balise, contrôlé visuellement. Cette vérification sur GPU logiciel ne mesure pas les performances d’un iPhone ou d’un Quest.
