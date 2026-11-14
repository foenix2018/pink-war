# Référence « SUBLEVEL 07 » — analyse et transposition dans Pink Wars

Démo analysée : `wquguru.github.io/fable52-fps-repro/demos/04-fps/` (un fichier, three r170, WebGL).

## Ce qui fait sa qualité
| Domaine | Technique de la référence | Dans Pink Wars |
|---|---|---|
| Image | Passe « film » : étalonnage (ombres froides, hautes lumières chaudes), vignette, aberration, grain ; bloom ; GTAO | `film-look.js` : étalonnage, vignette, grain, pulsation rouge aux dégâts (compositeur, WebGPU et WebGL). Bloom et occlusion ambiante : non faits. |
| Reflets | Sonde d'environnement cuite dans la salle, sol mouillé à réflexion plane | Carte de reflets de nuit au niveau 3, carte de quartier au niveau 2. Pas de réflexion plane. |
| Lumière | Deux projecteurs à ombres portées, peu de sources, faisceau volumétrique + poussière | `light-shafts.js` sous les luminaires des niveaux 1, 2, 3. Ombres portées dynamiques : non faites. |
| Caméra | Balancement lié à la vitesse, inclinaison en pas chassé, creux à l'atterrissage, secousse « trauma », champ élargi en sprint | `camera-feel.js`, niveaux 1, 2, 3 (jamais en casque, réduit si « mouvement réduit »). |
| Ennemis | États lisibles : entrée, chasse, charge annoncée par l'œil qui s'illumine, inclinaison en virage, fumée quand ils sont touchés, explosion avec débris | Lueur de bouche avant le tir (`chargeProgress`), fumée/étincelles par palier, mort projetée + débris + brûlure (`enemy-destruction-fx.js`). |
| Décor | Une seule salle, dense, où chaque objet a une fonction (armoires, chemins de câbles, extincteur, siphon) ; textures à logique de chantier (joints de coffrage, coulures) | Niveau 3 : 166 objets modélisés, ville autour. Niveaux 1 et 2 : objets fonctionnels existants ; à densifier. |

## Règles de level design retenues
1. Chaque objet doit avoir une raison d'être à sa place (alimentation, évacuation, maintenance).
2. Peu de sources de lumière, mais motivées (une lampe visible pour chaque zone éclairée).
3. Une matière dominante par lieu, deux couleurs d'accent au plus.
4. Lisibilité des menaces : un ennemi annonce toujours son tir.
