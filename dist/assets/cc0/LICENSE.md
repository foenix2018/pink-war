# Pink Wars — textures photographiques embarquées

Quatre matériaux de **Poly Haven**, licence **CC0 1.0 Universal** :

- [Asphalt 03](https://polyhaven.com/a/asphalt_03), Charlotte Baglioni / Dario Barresi.
- [Concrete Floor](https://polyhaven.com/a/concrete_floor), eye-candy.xyz.
- [Corrugated Iron](https://polyhaven.com/a/corrugated_iron), Dimitrios Savva / Jenelle van Heerden.
- [Rusty Painted Metal](https://polyhaven.com/a/rusty_painted_metal), Amal Kumar.

Licence : https://creativecommons.org/publicdomain/zero/1.0/

Douze cartes JPEG : albédo, normales OpenGL et rugosité. Sources 1K réduites
à 512 × 512 pour cette livraison ; aucun téléchargement de texture externe
n'est requis au lancement. Les sources, le miroir de distribution et les
empreintes SHA-256 avant réduction sont consignés dans `sources.json`.
L'utilisation de ce miroir public ne change pas la licence CC0 de ces images.

Ces cartes s'appliquent aux décors. Les textures et matériaux canoniques des
modèles GHJU/LYLU ne sont pas remplacés.


## W01 / matin de Vesper, livraison 3.49

- [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky), Greg Zaal / Jarod Guest : panorama HDR CC0 converti en SDR WebP 1024 × 512. La conversion reproductible se trouve dans `tools/build-vesper-sky.py`.
- [Gravel Embedded Concrete](https://polyhaven.com/a/gravel_embedded_concrete), Charlotte Baglioni : albédo CC0 réduit à 512 px pour les éclats de béton.

Ces deux fichiers restent locaux. Le miroir, les empreintes des sources et les tailles sont ajoutés à `sources.json`. Les nouvelles formes de véhicules, feuillages, toits et tours sont créées pour Pink Wars ; elles ne proviennent pas du jeu servant de miroir de distribution des textures.


Les fichiers `vesper-{concrete,asphalt,steel,paint}_diff_512.jpg` sont des compositions des masques d’usure originaux de `assets/level1/textures/` et du grain mesuré des textures CC0 précédentes. `vesper-brick_diff_512.jpg` reprend la brique originale du projet. Ils ne sont pas présentés comme des scans de Poly Haven. Les entrées `originalCompositions` du manifeste identifient leurs entrées et le script de cuisson.

## W01 / usure 3.50

`m01-leak-mask.png` et `m01-moss-mask.png` sont des masques d’usure originaux, calculés à partir du grain de Concrete Floor (CC0) et de bruit déterministe. Ils ne sont pas de nouveaux scans. Générateur : `tools/build-m01-weathering.py`. Les géométries de détails sont originales.

Deux accessoires Poly Haven sont livrés dans `m01-salvage.json`, avec leurs textures PBR 512 px : [Old Military Crate](https://polyhaven.com/a/old_military_crate), Jack Mava, et [Metal Trash Can](https://polyhaven.com/a/metal_trash_can), GurJas Studios. Licence CC0 1.0. Source glTF de la caisse fermée et variante rouillée du conteneur ; transformations rigides intégrées, UV conservées. Le manifeste `assets/level1/cc0-props-sources.json` consigne les fichiers et empreintes du miroir public, épinglé au commit source. Aucune scène, carte ou code d’un autre jeu n’est repris.

La surface de brique `m01-brick-{diff,normal,orm}_512.jpg` provient du **Downtown City MegaKit**, Quaternius, https://quaternius.com/packs/downtowncitymegakit.html, CC0 1.0 Universal. Les trois cartes originales `T_RedBrick_{BaseColor,Normal,ORM}.png` sont réduites à 512 px. Il s’agit d’une surface PBR créée par l’auteur, et non d’un scan photographique. Empreintes et licence source dans `assets/level1/cc0-props-sources.json`.

## 3.63.5 — textures de proximité

Béton `concrete_floor` et asphalte `asphalt_03`, cartes couleur, normales OpenGL et rugosité en 1024 × 1024, provenant des mêmes sources Poly Haven CC0 que les versions 512 existantes. Sources, empreintes des originaux et empreintes des fichiers JPEG optimisés : `materials-3635.json`. Les motifs des équipements dans `machine-finishes.js` sont des créations procédurales originales.
