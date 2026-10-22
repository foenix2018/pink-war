# M02 / W02 — PBR photoréaliste à coût GPU réduit

Mise à jour : 22 octobre 2026 — branche `feature/m02-neons-webgpu-playtest`.

## Objectif

Conserver la jouabilité actuelle tout en améliorant les surfaces cyberpunk de « Sous les Néons » : asphalte abîmé et humide, béton vieilli, bardages industriels, métal rayé, tôle antidérapante, rouille sur les caissons et réseaux techniques.

## Fichiers

- `dist/level2-materials.js` : chargeur asynchrone indépendant du démarrage.
- `dist/level2-test.js` : intègre les cinq matériaux partagés après création du décor.
- `dist/level2-architecture.js` : passe architecturale (murs, balcons, marché, rails) qui partage les mêmes matériaux sans dupliquer les textures.

## Sources réellement branchées au chargeur

Matériaux CC0 de **Poly Haven**, uniquement leur carte diffuse 1K JPG (les sources restent accessibles en lecture seule sur le CDN) :

| Emploi | Source | Taille distante | Taille GPU cible |
| --- | --- | --- | --- |
| Route principale, chaussée | https://polyhaven.com/a/asphalt_02 | 1K JPG diffuse | 512 ou 256 px |
| Mur, béton et parements du marché | https://polyhaven.com/a/concrete | 1K JPG diffuse | 512 ou 256 px |
| Bardages, boîtiers métalliques | https://polyhaven.com/a/blue_metal_plate | 1K JPG diffuse | 512 ou 256 px |
| Passerelles et caillebotis | https://polyhaven.com/a/metal_plate | 1K JPG diffuse | 512 ou 256 px |
| Equipement ancien et métal oxydé | https://polyhaven.com/a/rusty_metal_05 | 1K JPG diffuse | 512 ou 256 px |

Licences : https://polyhaven.com/license — CC0, réutilisation commerciale autorisée. Source secondaire de référence, CC0 : https://ambientcg.com/ (pas d'archive importée à ce stade). Inspiration technique / catalogue de textures PBR : https://threejsresources.com/tool/freepbr ; **FreePBR.com n'est pas CC0** et autorise l'utilisation commerciale seulement sous licence payante (https://freepbr.com/about-free-pbr/). Aucun contenu FreePBR n'est intégré.

## Budget technique

- **Desktop / WebGPU** : 5 textures partagées, rééchantillonnées à 512 × 512 pixels, avec mipmaps — environ **6,7 MiB de stockage GPU** pour les cartes de couleur (5 × 512² × 4 octets × 1,34), hors éventuelles copies temporaires navigateur.
- **Performance (et téléphone)** : 5 × 256² — environ **1,7 MiB GPU**.
- Données compressées JPG 1K pendant le transfert réseau, conversion CanvasTexture pour garantir le plafond de mémoire vidéo. Aucun téléchargement de 2K/4K/8K.
- Pas de displacement, parallax mapping, SSR, réflexion raytracée, ni nouvelle lumière dynamique induite par ces matériaux.
- Base `MeshStandardMaterial` avec rugosité et métallicité constantes, partage de chaque texture entre plusieurs maillages. Pas de cartes normal/roughness/metal indépendantes (choix de performance).
- Chargement **asynchrone non bloquant** : le jeu démarre avec des teintes PBR de secours ; si le CDN est inaccessible ou ne donne pas les autorisations CORS, les matériaux passent sur une texture de repli locale générée en mémoire.
- Les matériaux photoréalistes sont une **amélioration du prototype**, pas une affirmation de qualité AAA achevée. Tests visuels sur vraie carte GPU et intégration VR restent à faire.

## Points à vérifier

1. Sur écran PC : lecture des motifs à taille humaine, aucune texture démesurément étirée.
2. Sur route mouillée : des zones sombres et des reflets suggérés par les néons, pas d'effet miroir permanent.
3. Sur escaliers et passerelles : marches lisibles, bandes jaunes préservées ; collisions inchangées.
4. En mode Performance : stabilité FPS / démarrage sans textures CDN.
5. Dans le HUD : compteur `PBR x/5` et `hors-ligne` en cas de repli.
