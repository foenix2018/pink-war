# Pink Wars 3.90.0 — Niveau 09, Les Jardins suspendus

Le complexe Biotech ORDRE / HELIX suit la disposition de la référence fournie : accès au sud-ouest, serres de recherche, pavillon de culture, passerelle au-dessus du ravin, terrasse de réunion de GHJU et LYLU, grand conservatoire et arbre JANUS, contrôle ORDRE à l’est, jardin libéré puis extraction AEGIS au sud-est.

`assets/m09/plan.json` est le plan métrique d’édition. `tools/blender/m09_gardens.py` construit la scène Blender, les passerelles et leurs vrais paliers, la géométrie exportée, les sols marchables et les collisions depuis les mêmes dimensions. Le bâtiment d’ORDRE se rejoint par sa terrasse avant ; le chemin passe à côté du socle JANUS. Les ouvertures des serres suivent les directions des chemins, et les bacs de culture et jardinières laissent passer la capsule.

## La scène

- Dix terrasses reliées par dix tronçons, dont une promenade intérieure au dôme. Les escaliers ont des marches, nez antidérapants, garde-corps et tubes lumineux ; les grands ponts sont soutenus par des arcs et tirants.
- Deux serres de recherche/culture, grande verrière JANUS, cultures hydroponiques, irrigation, consoles et façades du nœud de contrôle, navette originale AEGIS, podiums et balisage.
- Falaises, cascades en plusieurs niveaux, six bassins, arbres roses et verts, racines, lianes et végétation suspendue. Le fond comporte une ville 3D, un ciel de coucher de soleil et le soleil.
- Les cinq drones de surveillance et leurs projecteurs se voient dans le plan 3D. En combat, les vraies S-19 destructibles du jeu remplacent les figurants de présentation.
- Source Blender métrique, collections éditables, images intégrées. Le sas contient deux vantaux avec une animation d’ouverture / fermeture dans la source. Le jeu rend ses vantaux séparément de la géométrie statique.

Le rendu reste une interprétation 3D de l’illustration, avec des surfaces et volumes procéduraux ; il ne s’agit pas d’un scan photoréaliste de l’image.

## WebGPU et consultation

`jardins.html` est une vue d’ensemble interactive : rotation, zoom, neuf boutons de cadrage, repères d’étape, téléchargement du `.blend`, puis accès au chapitre jouable. Le téléphone affiche les mêmes commandes dans une grille compacte. Les libellés sont des commandes de consultation et non des pancartes ajoutées dans la planque.

`m09-art.js` charge les maillages PWM compressés. Les positions, normales et UV proviennent de Blender. Les matériaux partagent les textures CC0 et les cartes de relief / rugosité du projet. WebGPU utilise des matériaux TSL compilés en WGSL pour le ruissellement, les ondulations et le vent dans le feuillage ; les pétales et la vapeur apportent du mouvement. Le chemin WebGL conserve la géométrie et anime les textures d’eau et les particules. iPhone suit la politique de compatibilité existante.

Le modèle complet comporte **983 844 triangles et 43 lots**, pour **16,04 Mo compressés**. Le modèle mobile comporte **668 047 triangles**, pour **11,17 Mo** ; le LOD réduit réellement les couronnes végétales en conservant l’architecture. Le fichier Blender facultatif pèse environ **21,16 Mo** et n’est jamais chargé pour jouer. Le contrôle natif WebGPU mesure **129 appels de dessin** dans sa scène de vérification.

## Partie jouable

`niveau9.html` / `niveau9.js` reprennent le moteur `ArenaGame`, les armes, personnages, animations, commandes, bouclier, grappin, musique et WebXR communs. `m09-mission.js` règle les neuf actions, les groupes d’ORDRE, l’attaque de données, l’évacuation et la sauvegarde des points de contrôle par héros. Le modèle officiel de l’autre héros attend à la réunion ; il est masqué à grande distance pour réduire le coût de rendu.

La mission ne permet pas de sauter ses étapes. Les actions protégées attendent la neutralisation de leur groupe. Le niveau apparaît dans Histoire et renvoie à la planque après extraction. Les chapitres 7, 8 et 9 s’enchaînent par la planque ; le chapitre 8 publié entre-temps est conservé intégralement. Le chapitre 9 peut être lancé directement et reprend automatiquement un point de contrôle valide ; `resume=0` force un nouveau départ.

Les limites de survie à ±98,45 m auraient coupé ce complexe. Le moteur accepte maintenant des limites et un champ de navigation fournis par le niveau, y compris pour le grappin et les ennemis. Les valeurs des anciens niveaux sont inchangées. Le champ du chapitre 9 exclut le ravin et tient compte des murs à la hauteur des terrasses. Les escaliers subdivisent les mouvements à 7,5 cm ; leurs hauteurs viennent de la même équation que leurs marches Blender.

Une archive de plans manqués peut être découverte dans la serre à son vrai étage de 14 m. L’IEM demeure verrouillé avant le niveau 10. La transition finale conserve la préparation d’équipement et l’historique de la planque.

## Reconstruire

```sh
blender --background --threads 4 --python tools/blender/m09_gardens.py
```

Le générateur appelle `m09_doors.py`, écrit les deux LOD, les matériaux, les placements et les sols dans `dist/assets/m09`, ainsi que `dist/m09-data.js`. Il sauvegarde le `.blend` dans `assets/m09` et sa copie publique identique. `-- --render` produit en plus une vue Cycles. Une modification isolée des vantaux peut être réappliquée avec :

```sh
blender --background assets/m09/PinkWars_N09_Jardins_Suspendus.blend --threads 4 --python tools/blender/m09_doors.py
```

## Vérification

Preuves : `/workspace/livraison/pink-wars-niveau09-20261122/`.

- **96 tests ciblés passent** : niveaux 7, 8 et planque, grappin, collisions, nano-fabrication, budget Mac et les nouveaux contrôles du niveau 9. La vraie capsule parcourt toutes les liaisons à 60 et 15 Hz, sans chute ni blocage. Les empreintes, les tirs contre les façades, les groupes, les hauteurs, les limites, les étapes et les reprises par héros sont contrôlés.
- Le navigateur termine les neuf objectifs sur PC et iPhone émulé, avec les vrais modèles de personnages, l’archive à 14 m et la fin de mission ; aucune erreur JavaScript. Le PC est déplacé au clavier ; les trajets complets sont vérifiés en simulation. Les autres étapes du contrôle navigateur utilisent l’interface de débogage pour raccourcir les combats et les trajets.
- Le contrôle natif WebGPU crée le vrai moteur GPU et vérifie les matériaux à nœuds et des lectures de pixels. Deux captures à des temps différents donnent des images d’eau différentes. Le modèle n’est pas remplacé par un fond 2D.
- Blender rouvre la source : 299 objets, 35 collections, neuf objectifs, dix terrasses, deux vantaux animés, deux images utilisées intégrées. La copie publique est identique au SHA-256.
- La suite historique globale a rencontré des assertions déjà en échec avant cette modification. Un échantillon de six échecs est reproduit sur le parent `85aaa14` dans un checkout isolé (`baseline-sample.txt`). Le parcours global a été arrêté pour libérer le processeur pendant les tests navigateur ; il n’est pas présenté comme une validation complète. Les contrôles ciblés ci-dessus restent tous verts.
