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
