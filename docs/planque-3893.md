# Pink Wars 3.89.3 — Pièces fermées et Vesper animée

La planque est organisée en huit pièces : dortoir, salle de bain, armurerie, tenues, atelier, archives, salon et recharge/mission. Onze portes coulissantes en verre dépoli opaque relient ces espaces et les couloirs. Les nouvelles cloisons rejoignent le plafond ; les trous en bord de baie et près de la porte de mission sont fermés.

## Portes, circulation et intimité

Les huisseries ont des joints, rails, galets, capteurs et repères de pièce. Les vantaux ont un vitrage épais à surface dépolie, des poignées encastrées symétriques et des tubes lumineux. Le verre reste opaque, sans transmission de l’image de la pièce voisine. Les indicateurs passent du rose au bleu pendant l’ouverture.

`hideout-doors.js` partage quatre maillages instanciés pour les vitrages, rails de vantail, joints et voyants. Deux lots supplémentaires rendent les poignées sur les deux faces ; la signalétique est regroupée dans un atlas. Les portes s’ouvrent à l’approche, restent ouvertes si le personnage occupe le passage, puis se referment. Les collisions suivent réellement la position de chaque vantail.

La navigation prépare ses trajets par les ouvertures ; le joueur est arrêté par un vantail encore fermé pendant son ouverture. Les couloirs contournent le salon. Les canapés et la table ont été ajustés pour conserver de vrais passages. Les neuf stations sont accessibles. Une station ne s’utilise plus depuis une autre pièce à travers un mur ou une porte.

La **vue d’ensemble est une coupe** : elle masque les parties hautes et le toit pour repérer les pièces. **VISITER** restaure l’intérieur complet. Les collisions restent les mêmes dans les deux vues.

## Une vue sur une vraie scène 3D

La baie utilise le rendu d’une scène extérieure séparée, et non le déplacement d’un fond photographique. `hideout-city.js` charge les façades, toits, équipements, balcon de service, avenue et passerelles provenant de `city.pwm.gz`. Les bâtiments sont répartis sur plusieurs profondeurs ; les passerelles rejoignent effectivement les façades.

Une caméra décentrée calcule la vue depuis l’œil du joueur et les quatre bords de la baie. Le déplacement en première personne produit ainsi une vraie parallaxe entre éléments proches et lointains. La vue en coupe emploie un cadrage d’illustration adapté au diorama. Le JPEG reste seulement un aperçu initial pour le fichier Blender ; le jeu affecte une texture de rendu dynamique au vitrage.

Le décor comprend une petite unité de service en vol stationnaire, des véhicules sur des couloirs aériens et dans l’avenue, de la pluie, de la vapeur et des nuages. Ces éléments utilisent des instances. La scène dispose de sa brume, de lumières et d’un environnement de réflexion nocturne. Le rendu de la baie est limité à 15 images/s sur le profil mobile et 24 sur le profil complet quand l’œil reste immobile ; il est actualisé dès qu’on se déplace. Cette limite concerne le fond extérieur, pas la simulation du joueur.

Les positions de la pièce et de la ville sont quantifiées séparément pour conserver la précision des détails intérieurs. Les vraies tenues et armes de la version 3.89.2 restent en place ; aucune règle de combat, progression ou sauvegarde n’est modifiée.

## Source et reconstruction

```sh
python3 tools/blender/hideout-textures.py
blender --background --threads 4 --python tools/blender/hideout.py
blender --background --threads 4 --python tools/blender/hideout-display-import.py
```

Le `.blend` contient les pièces, les vantaux fermés, le catalogue canonique et la collection extérieure éditable. `hideout-display-import.py` recharge également l’aperçu de la baie avant d’intégrer les images. La copie publique est identique au fichier source. Le jeu charge les géométries compressées et ne télécharge pas le `.blend`.

Les preuves sont conservées dans `/workspace/livraison/pink-wars-planque-rooms-20261121/`. Les tests de téléphone sont des contrôles Chromium avec profil iPhone émulé ; aucun téléphone physique n’est mesuré.

Validation finale :

- **55 tests ciblés passent**, avec le contrôle continu des huit périmètres à hauteur du personnage, l’arrêt devant les portes fermées, l’ouverture, la sécurité anti-fermeture, les neuf trajets avec la vraie capsule, l’intimité des interactions et la projection de la baie.
- **PC et iPhone émulé** : passage réel des portes jusqu’au dortoir, fermeture pendant le repos, armes, fabrication, tenue, archives, recharge et départ. Le vrai chapitre 3 reçoit toujours l’équipement préparé sur PC. Aucune erreur JavaScript.
- **WebGPU natif** : 143 appels de dessin dans la vue d’ensemble de contrôle, incluant le rendu extérieur ; 327 614 triangles de décor, 481 936 d’équipement et 50 952 de ville statique. La texture de la baie est bien une cible de rendu ; les véhicules et l’œil changent entre deux captures. L’ouverture des vantaux est également capturée. Aucune erreur JavaScript.
- **Blender 4.3.2** : réouverture du fichier final, 349 objets, huit pièces, onze portes, collection canonique de 87 maillages et 50 images utilisées intégrées ; unités métriques et copie publique identique au SHA-256.
