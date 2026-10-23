# M–12 / LYLU

Source Blender du fusil demandé par le créateur (photo vert/violet jointe à la conversation du 23 octobre 2026). La finition actuelle remplace le vert par un gris foncé et conserve les motifs violets. Modélisation originale à partir de cette référence ; ne pas attribuer la photographie ni ce modèle à une bibliothèque CC0.

Reconstruction depuis la racine du dépôt :

```sh
python3 tools/build-m12-surfaces.py
blender --background --python tools/build-m12-shotgun.py
```

Le fichier `.blend` inclut les deux surfaces. Le GLB de géométrie et sa version embarquée sont produits dans `dist/assets/pink-war/` ; le matériau de production raccorde les cartes de couleur et de rugosité WebP locales. Le modèle est en mètres, +Y vertical et -Z vers le canon, avec l’origine au centre de la poignée. La pompe porte le nœud `M12 pump` et se déplace de 95 mm vers +Z.
