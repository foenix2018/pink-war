# Pink Wars 3.89.1 — Mobilier et matières de la planque

La planque conserve ses neuf stations et son implantation. Les éléments sont retravaillés dans le fichier Blender d’origine puis affichés avec les matériaux PBR du moteur WebGPU, avec le chemin WebGL compatible du jeu sur iPhone.

## Éléments retravaillés

- Lits : matelas et couettes arrondis, piqûres, passepoils et pieds métalliques.
- Salon : assises et dossiers segmentés, accoudoirs rembourrés, coussins et pieds ; anses des tasses.
- Salle de bain : lavabo et toilettes réellement creusés, rebords arrondis, bonde, robinetterie, joints muraux et grille de douche.
- Atelier : articulations, axes de rotation, vérins et câbles du bras ; écrans techniques avec UV propres.
- Recharges : carters segmentés, vis, contacts et grilles de ventilation.
- Armes exposées : lunettes, lentilles, pontets, évents, ports d’éjection et anneaux de sangle.
- Caisses : coins de renfort, poignées rabattables et charnières ; porte : panneaux rapportés et mécanismes ; murs : panneaux de service, commandes et gaines.

## Matières et rendu

`tools/blender/hideout-textures.py` génère cinq jeux de textures originaux et répétables : acier brossé, tôle antidérapante, tissu tissé, céramique et béton. Chaque jeu contient couleur, normale et rugosité. Un sixième fichier porte l’affichage technique des écrans. Les couleurs utilisent sRGB ; les normales et rugosités restent linéaires. Ces textures sont également embarquées dans le `.blend`.

Les courbes et cylindres ont des normales lissées. Les chanfreins sont limités aux angles saillants pour conserver les surfaces courbes. L’export utilise les UV évalués de Blender, y compris après les modificateurs, au lieu de recalculer la projection à chaque sommet lissé.

Les textures sont chargées en parallèle et partagées entre matériaux. Le profil complet utilise douze matériaux avec normale et rugosité ; le profil mobile conserve les normales du tissu et du sol, les rugosités et toutes les géométries. Les éclairages sont moins saturés. Un seul appel instancié ajoute des ombres de contact sous le mobilier, y compris quand les ombres dynamiques sont désactivées.

## Construction

```sh
python3 tools/blender/hideout-textures.py
blender --background --threads 8 --python tools/blender/hideout.py -- --render
```

Le fichier éditable reste `assets/hideout/PinkWars_Planque.blend`, avec une copie publique dans `dist/assets/hideout/`. La scène exportée contient 340 454 triangles en 25 lots de matériaux ; sa géométrie compressée pèse 4 074 607 octets. Les neuf interactions restent en place. Le mur carrelé possède sa collision, pour un total de 62 volumes.

## Contrôles

Les preuves sont conservées dans `/workspace/livraison/pink-wars-planque-realism-20261121/`. Les captures WebGPU montrent le vrai modèle exporté, et non une illustration générée. Les contrôles mobiles sont réalisés sous Chromium avec un profil iPhone émulé ; aucun téléphone physique n’est mesuré.

Validation finale :

- **43 tests ciblés réussis** : navigation et capsule réelle, préparation persistante, nanoparticules et résolution adaptative.
- **PC et iPhone émulé** : les stations, sauvegardes et profils séparés fonctionnent sans erreur JavaScript. Le départ PC a également été vérifié dans le vrai chapitre 3 avec l’arme et l’armure préparées.
- **WebGPU natif** : 340 454 triangles, 25 lots, 25 appels de dessin dans la vue d’ensemble, douze matériaux avec normales et rugosités, aucune erreur JavaScript. Captures de près de l’atelier, du dortoir, des sanitaires et des recharges.
- **Blender 4.3.2** : réouverture du fichier final, 163 objets dont 119 maillages, 19 images et une police embarquées, unités métriques, 31 956 faces lissées. La copie téléchargeable a le même SHA-256 que le fichier source.
- **Téléphone** : cinq matériaux avec normales détaillées, douze avec rugosités ; aucune affirmation de fréquence d’image sur matériel physique.

Le premier passage de recharge a dépassé le délai de contrôle sous rendu logiciel pendant un rendu Blender simultané. Le contrôle final a été séquencé, le profil mobile allégé et le délai de récupération de l’outil adapté ; le scénario PC et mobile complet passe. Aucun changement des vitesses de déplacement ou des règles de combat n’a été introduit.
