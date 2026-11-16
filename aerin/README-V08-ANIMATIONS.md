# AERIN V08 — Animations et commandes

## Démarrage
- Depuis le ZIP, ouvrir `index.html` à la racine sur ordinateur : HTML autonome WebGL, modèle et dépendances intégrés, démarrage automatique.
- Sur iPhone, déployer le dossier `Aerin/dist` via HTTPS et ouvrir dans Safari. Ne pas utiliser l’aperçu HTML de l’application Fichiers comme test du GPU.
- Version modulaire : `Aerin/dist/index.html` (WebGPU prioritaire si disponible, WebGL de secours).

## Trois animations squelettiques supplémentaires
- `Weapons_Stow` (0,94 s) — Aerin range l'épée au côté et porte le bouclier dans le dos.
- `Weapons_Draw` (0,92 s) — Aerin reprend l'épée et le bouclier.
- `Roll_Forward` (0,96 s) — roulade au sol avec groupement des membres et rotation du bassin; exécutée dans la direction du joystick.

Les clips sont des **mouvements personnalisés créés pour le squelette Aerin** (41 articulations) d’après des références de mouvements Mixamo; les fichiers FBX Mixamo n’ont pas été intégrés. Les meshes originaux d'épée et bouclier sont utilisés pour générer deux exemplaires statiques positionnés au côté / dos lors du rangement.

## Commandes
- Bouton rond **Armes** (à droite au-dessus du bouclier) / `G` : rangement ou dégainage; l'attaque et le blocage nécessitent l'équipement sorti.
- Bouton rond **Roulade** à gauche de **Saut** / `R` : roulade dans la direction du joystick, ou en avant sans direction; coût 24 endurance, courte invulnérabilité au milieu, bref délai entre deux roulades.
- Les contrôles Frappe, Saut, Esquive, Bouclier, Vue et Pause existants restent inchangés.

## Références d'animation trouvées
- Mixamo / Adobe : `Sheath Sword 1`, `Sheath Sword 2`, `Sheathing Sword`, `Stand To Roll`, `Sprinting Forward Roll`.
- Adobe : https://helpx.adobe.com/fr/creative-cloud/help/mixamo-rigging-animation.html
- Catalogue de noms : https://huggingface.co/datasets/Linzhan/Mixamo-Animations-Characters/viewer/animations/train

## Contrôles de qualité
- Les 18 clips sont chargés dans Three.js avec un moteur de rendu simulé.
- Le parcours Ranger → Dégainer → Roulade → Frappe est validé par test automatisé.
- Le rendu graphique sur iPhone et dans un contexte GPU réel doit être vérifié sur appareil.
