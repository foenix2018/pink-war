# RECO1 — modèle approuvé et intégration

`preview-v10.html.gz` contient exactement la V10 approuvée par l’utilisateur (archive déterministe). Son empreinte SHA-256 figure dans `manifest.json`. Le modèle du jeu provient de ce fichier, avec ses plaques, ses mains, son casque, ses optiques texturées et sa carabine. Il ne s’agit pas d’une nouvelle approximation de la silhouette.

Le rig natif est celui du pompier RLH : 41 os et les clips Idle, Walk, Run, Rifle et Rifle Walk. Les surfaces rigides sont regroupées en 17 lots GPU à poids rigides, pilotés par 18 os de rendu. Géométries, textures et clips sont partagés ; poses, mixers, matrices de peau et optiques d’alerte sont indépendants par ennemi. 59 742 triangles, sans lumière dynamique ajoutée. L’archive de données compressées pèse environ 1,5 Mo. Le budget des autres robots reste celui des modèles existants.

Pour reconstruire :

```sh
gunzip -c assets/reco1/preview-v10.html.gz > /tmp/reco1-v10.html
node tools/export-reco1-preview.cjs /tmp/reco1-v10.html
python3 tools/build-reco1-controller.py /tmp/reco1-v10.html
```

L’export utilise Playwright/Chromium. Aucun outil de génération n’est téléchargé ou exécuté pendant une partie.

Adaptations du contrôleur : repère +Z de l’aperçu tourné en -Z pour Pink Wars ; sol à 0 m ; cadence liée au déplacement réel ; accroupissement lié au couvert ; alerte liée à la perception ; restauration de la couche native avant les corrections IK, même à temps figé. La carabine utilise le repère physique de `reco1-profile.js`, exactement commun au tir du jeu et à la géométrie rendue. Les corrections de recul du torse ne déplacent pas le canon.

RECO1 remplace la forme interne `seer`, conservée pour les sauvegardes et les compositions de rencontre. La grande Sentinelle MK VIII d’ouverture reste un autre type. La nouvelle unité apparaît dans la première vague de l’Arène et aux postes `seer` des missions existantes, sans créer de renfort supplémentaire.

Données d’équilibrage : 750 PV à la vague 1, progression habituelle avec la vague et l’élite ; coefficient des projectiles 0,5 sur le blindage, 0,8 sur la tête avant le multiplicateur de zone. Un VX-9 inflige 12 au torse et 48 à la tête au premier palier. Les coups de mêlée et dégâts de zone conservent leurs règles. L’unité peut être neutralisée normalement, avec score, élimination et progression habituels.

Sources techniques : Three.js sous licence MIT (licence dans `dist/vendor`), rig et animations RLH fournis par l’utilisateur, modèle RECO1 et textures procédurales de l’aperçu approuvé. Aucun service externe n’est appelé pour afficher ou animer l’ennemi.
