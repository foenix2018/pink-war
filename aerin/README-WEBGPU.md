# AERIN — WebGPU + HUD Pink Wars adapté (14 novembre 2026)

## Livrable

- `dist/index.html`: jeu complet, nouveau HUD tactile et moteur WebGPU prioritaire.
- `dist/game/aerin-game-webgpu.js`: scène WebGPU moderne (Three.js r181), éclairages PBR, textures végétales et rocheuses procédurales, sous-bois instancié.
- `dist/game/entry-webgpu.js`: lanceur WebGPU avec chargement de Three.js depuis jsDelivr. Sans CDN / si la migration échoue, **repli automatique** vers le moteur WebGL du ZIP.
- `dist/game/aerin-game-webgl.js`: moteur d’origine conservé, avec la nouvelle logique des combos.
- `dist/game/pink-hud.css`: HUD inspiré du code source **foenix2018/pink-war**, adapté à Aerin.

## Commandes

- Joystick en bas à gauche : avancer, reculer, déplacements latéraux ; pousser à fond pour sprinter.
- Glisser dans la zone libre à droite de l’écran : tourner la caméra ; pas de deuxième joystick.
- **Frappe** (rouge, bas droite) : un seul bouton. Chaque pression fait taille → revers → vertical → estoc ; maintien = combos répétés. Une seconde pression pendant une animation met en mémoire la frappe suivante.
- Bouclier : maintenir pour bloquer ; saut et esquive au centre.
- PC : ZQSD/WASD, flèches pour caméra, clic ou Espace frappe, B bouclier, E esquive, J saut, V changement de vue ; touches 1–4 restent comme raccourcis optionnels.

## Lancer (PC ou serveur local)

```bash
cd Aerin
python3 -m http.server 8082 --directory dist
```

Ouvrir `http://localhost:8082` dans un navigateur récent. Sur iPhone, charger via HTTPS (ex. sur un hébergement Vercel) ; `file://` n’est **pas** un environnement pris en charge pour charger le GLB.

## Limites honnêtes

- **WebGPU requiert HTTPS ou localhost**, un navigateur compatible et l’accès à jsDelivr pour importer la version moderne de Three.js.
- Sans accès CDN, les fichiers fournis conservent une version fonctionnelle de secours en WebGL ; ce repli utilise l'ancien rendu.
- Les matériaux, éclairages, reliefs et sous-bois ont été enrichis, mais le modèle 3D de personnage d’origine est volontairement conservé : son style géométrique reste low-poly, ce qui n’est pas du photoréalisme.
- Exécution WebGPU sur iPhone réel et comparaison directe avec une instance Vercel **non vérifiées** dans cet environnement ; la disposition HUD a été contrôlée par rendu CSS Chromium sans lancement du moteur 3D.
- Aucune modification du dépôt GitHub ou du projet Vercel.

## Tests

`npm run check` vérifie la syntaxe JavaScript, la présence des ressources et les contrats de commandes. Les captures de HUD sont dans `qa/hud-preview-*.png` et illustrent uniquement la **disposition** sans le rendu 3D.

### Référence HUD

Source du HUD inspectée dans GitHub : `foenix2018/pink-war`, fichiers `dist/combat-hud.css`, `dist/combat-hud.js`, `dist/mobile-controls-v7.css` (branche `main`). Le tableau de bord Vercel du compte n’a pas donné accès à un déploiement en lecture.
