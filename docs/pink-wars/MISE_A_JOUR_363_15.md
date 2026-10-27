# 3.63.15 — Icône iPhone

Nouvelle illustration originale pour Pink Wars : couronne/visière métallique, bleu LYLU à gauche et rose GHJU à droite, sur fond sombre. Aucun modèle 3D, équipement, niveau ou comportement de jeu n’est modifié.

## Formats livrés

- `icons/pink-wars-1024.png` : illustration HD carrée.
- `apple-touch-icon.png` : PNG opaque de 180 × 180 pour l’écran d’accueil iPhone. Les angles sont appliqués par iOS.
- `icons/icon-192.png` et `icons/icon-512.png` : formats du manifeste web.
- `icons/favicon-32.png` et `favicon.ico` : icônes d’onglet et repli classique.

L’illustration originale générée reste conservée dans l’espace de travail. Les dérivés sont redimensionnés sans modification de composition. Dimensions, poids et empreintes des PNG sont consignés dans `icons/source.json`.

Les quatre entrées principales — accueil, M01, M02 et AT HOME — déclarent la même icône Apple et le titre **Pink Wars**. Le manifeste ouvre l’accueil à son URL stable, sans conserver l’ancien paramètre de lancement 3.31. Le générateur du fichier HTML autonome incorpore également les icônes PNG.

## Ajout sur iPhone

Ouvrir `https://pink-war.vercel.app/` dans Safari, puis **Partager → Sur l’écran d’accueil → Ajouter**. Si un ancien raccourci conserve l’ancienne image, le supprimer et le recréer : les icônes des raccourcis existants sont mises en cache par iOS.

Il s’agit d’un accès web à l’écran d’accueil ; cette livraison ne crée pas de paquet App Store ni de nouveau mode hors ligne.

Vérification : dimensions et opacité des fichiers, métadonnées des quatre pages, décodage de l’icône Apple et des icônes du manifeste en navigateur au format iPhone. L’ajout effectif à l’écran d’accueil doit être effectué dans Safari sur l’appareil.
