# Pink Wars 3.59 — Fracture et menus de session

Le créateur a retenu **Fracture** parmi les propositions 3.58. Cette direction est appliquée à l’accueil, aux fenêtres, aux compétences et aux pauses : panneaux graphite arrondis, accents roses GHJU ou bleus LYLU, actions larges et arrière-plans de Vesper conservés. Le chargement automatique 3.58 reste actif.

## Pause et navigation

Histoire M01/M02, Arène, stand de tir et AT HOME disposent d’un menu pause avec **Reprendre**, **Passer en VR** et **Retour à l’accueil**. Les commandes de retour ne sont plus enfouies sous la liste des raccourcis. La pause arrête la simulation et les tirs ; la reprise garde l’inventaire et la progression courante. Un retour à l’accueil termine d’abord la session immersive lorsqu’elle est active.

Les missions écran et AT HOME proposent deux commandes discrètes en haut à droite : VR et Pause. Échap et Options restent utilisables pour la pause des missions. Les menus communs acceptent aussi la croix directionnelle puis Croix/A pour sélectionner une action.

Dans le casque, une surface 3D Fracture propose **Reprendre**, **Retour à l’accueil** et **Quitter la VR**. Elle se pointe avec la main droite ; la gâchette valide. La sélection consomme le tir et impose un relâchement avant de pouvoir tirer à nouveau. Les anciens panneaux HTML ne sont pas supposés visibles dans un framebuffer immersif.

## Histoire en VR

Les deux missions écran disposent maintenant d’un adaptateur WebXR utilisant leur propre scène et simulation. Le passage en VR garde donc la position, la santé, les munitions, les ennemis et les étapes courantes. Les armes et gants approuvés servent aux deux contrôleurs ; GHJU conserve son double pistolet. Les tirs partent de la main suivie, restent arrêtés par les murs et ne reçoivent pas de guidage automatique. Les optiques, les sons et les retours haptiques sont raccordés au combat.

Sur un navigateur signalant un casque disponible, les missions préparent directement le rendu WebGL immersif. Le rendu WebGPU reste disponible pour les écrans sans casque. Un casque connecté après un lancement WebGPU nécessite de relancer en compatibilité WebGL ; l’interface indique cette contrainte au lieu de prétendre avoir ouvert une session. Le navigateur exige toujours une action explicite pour autoriser WebXR.

Les commandes principales restent : stick gauche pour se déplacer, stick droit pour tourner, index droit pour tirer, poignée droite pour viser, A pour sauter, B pour recharger, Y pour changer d’arme, X pour la pause. L’index gauche contrôle le second pistolet de GHJU. Les archives M01 reçoivent une lecture 3D complète, avec fermeture à la gâchette.

## AT HOME

Le **clic du joystick droit** ouvre ou referme la pause. Les commandes X de retour à la maison visible, B de sortie de session et clic gauche de récupération d’arme sont conservées. Revenir d’une perte de visibilité ne relance plus automatiquement le combat : le menu attend une reprise explicite. La maison, le suivi réel, le scan local, les clôtures basses et les vingt vagues ne sont pas remplacés.

AT HOME utilise une session **immersive-ar**, y compris en immersion complète, pour conserver le scan et la géométrie de la maison. L’interface appelle cette entrée « Passer en VR · AT HOME » et conserve le choix entre décor complet et maison visible. Un navigateur sans cette capacité affiche un message de disponibilité.

## Contenu conservé

Les modèles Shadow Unit de GHJU/LYLU, gants RLH, armes, carte M01 de référence, environnements M02, collisions et lore restent les mêmes. La rencontre physique et les compétences de Cara/Gaby demeurent à M07. Santé et munitions restent dans le HUD ; les compteurs d’arme ne sont pas réintroduits.

## Vérifications

La suite complète compte **414 tests réussis**. Les nouveaux contrôles vérifient la demande WebXR dans le geste de clic, la conservation de la partie, le verrou de gâchette, la sélection 3D du retour à l’accueil et la fermeture des ressources. Les contrôles ciblés sont relancés après les derniers ajustements.

Essais navigateur locaux : accueil et réglages ordinateur/iPhone/paysage, entrée directe en M01/M02, pause et gel du temps M01, reprise M02, menus VR et retour accueil de la scène commune, Arène et stand de tir, pause AT HOME et indication d’indisponibilité du casque. Les captures et rapports se trouvent dans `/workspace/livraison/captures_359/`.

Ces vérifications utilisent Chromium, l’émulation mobile et des sessions XR simulées. Aucun essai matériel dans Safari iPhone ou Meta Quest 3 n’a été réalisé pendant cette livraison.
