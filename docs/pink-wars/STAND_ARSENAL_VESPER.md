# Stand : arsenal Vesper

Le stand adopte l’ambiance industrielle rose / cyan des références fournies. Cette passe inclut un extérieur visible et cinq véritables bornes de choix des armes. Intégration dans le mode `?mode=training`.

## Décor

- Toiture ajourée avec auvents latéraux, ciel de crépuscule et 26 bâtiments extérieurs détaillés. Le décor extérieur appartient au groupe du stand et disparaît avec ce mode.
- Cloisons blindées à épaulement chanfreiné, portiques boulonnés, acier usé, consoles inclinées, rails et chariots.
- Caisses, cartouches, bannières trouées, marquages écaillés, joints et caniveaux.
- Éclairage rose / cyan, poussière et légers faisceaux dans la brume. Le sol et l’acier reflètent la carte de ciel statique, complétée par des décalques de lumière ; aucune réflexion de la scène en temps réel ni nouvelle carte d’ombres.
- La photo locale d’acier utilisée pour les cibles est partagée avec les cloisons, sans téléchargement supplémentaire.
- Les silhouettes des cibles, leurs impacts et leur animation de chute restent ceux de la simulation.

## Bornes fonctionnelles

`range-terminal-layout.js` fournit les cinq poses, dimensions et inclinaisons utilisées à la fois pour les maillages et les intersections. Un clic ou un toucher sur un écran proche ouvre le menu des armes. F / Action fonctionne également à proximité immédiate. En WebXR, les rayons et la proximité des mains permettent d’activer la borne avec gâchette / prise, puis d’utiliser le sélecteur immersif existant.

La borne affiche l’arme équipée et l’état de l’exercice. Les cinq écrans partagent une texture mise à jour seulement à un changement d’état. Le choix d’une nouvelle arme conserve les règles existantes : restrictions par personnage, remise à zéro de l’exercice et attente de l’interrupteur pour relancer les cibles. L’armurerie arrière reste disponible.

L’ouverture du menu consomme le geste avant le tir et la rotation de vue. Un clic issu du toucher d’ouverture ne peut pas sélectionner accidentellement un bouton apparu sous le doigt : un nouvel appui dans le menu est requis. L’activation clavier reste disponible. Les socles et montants ont des collisions ; les interactions sont limitées par la distance, le côté de l’écran et les obstacles.

## Validation et ressources

42 tests Node réussis : entraînement, silhouettes et impacts, collisions, ombres, armurerie, commandes VR, lignes de tir, géométrie des écrans inclinés, accès aux bornes, changements d’arme, budgets et libération des ressources. Le menu a également été vérifié dans Chromium en format téléphone 390 × 844 : toucher M-12, fermeture, absence de débordement horizontal et protection contre le clic du geste d’ouverture.

Le module de détail et son extérieur comptent environ 40 980 triangles / 35 maillages, avec deux lumières d’accent sans ombres. Le ciel est partagé comme environnement statique. Les géométries répétées sont instanciées et les ressources propres sont libérées sans détruire la texture métal partagée. Les performances sur casque physique n’ont pas été mesurées.

Captures dans `/workspace/livraison` : `Stand_terminal_final.png` (borne et décor), `Stand_borne_detail.png`, `Stand_choix_arme.png` et `Stand_choix_arme_mobile.png`. Les images du décor sont des rendus WebGL des véritables modules et textures, avec une cible de la simulation, sans HUD ni armes chargées dynamiquement dans le rack. Aucune image générée.

Cette passe reste locale ; aucune publication GitHub/Vercel effectuée.

Essai complet après correction du geste d’ouverture : lancement WebGL du vrai jeu, clic sur la borne pour équiper ARES X9, réouverture par toucher puis équipement M-12 ; zéro tir involontaire et aucune erreur JavaScript. Le script de vérification se trouve dans `/tmp/range-terminal-smoke.cjs`, son résultat dans `/tmp/range-terminal-fixed.txt`.
