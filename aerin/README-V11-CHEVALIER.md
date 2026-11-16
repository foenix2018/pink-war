# AERIN V11 — Chevalier et combat fluide (14 novembre 2026)

Demande : « un maximum d’animations fluides issues de Mixamo ou autre, personnage mobile, posture de combat
inspirée des meilleurs jeux d’épée ; forme du personnage rapprochée d’un chevalier (type Link) ».

## Origine des animations — à lire

Les animations Mixamo ne peuvent être téléchargées qu’avec un compte Adobe connecté : elles n’ont **pas** pu être
récupérées depuis cet environnement, et aucun fichier Mixamo n’est copié. Les 18 nouveaux mouvements ont été
**écrits pour le squelette Mixamo d’Aerin** (41 os) dans `dist/game/aerin-motion-v11.js`, d’après les
références Mixamo « Sword And Shield » (idle, strafe, slash, spin, jump attack, dodge) et la grammaire des jeux
d’action à l’épée : anticipation, coup rapide, prolongement, retour en garde. Chaque pose est décrite en degrés
dans le repère du personnage, puis convertie au chargement en clips Three.js (30 i/s, spline de Catmull-Rom :
passage souple entre les poses). Les 18 clips GLB d’origine (Idle, Walk et Run RLH/Mixamo inclus) restent en place.

Pour ajouter plus tard de vrais FBX Mixamo : les exporter « In Place » sur ce squelette (« Without Skin »),
les convertir en GLB avec Blender, puis ajouter les clips au GLB ; les noms `K_*` peuvent être remplacés un à un.

## Nouveaux mouvements (dist/game/aerin-motion-v11.js)

| Clip | Usage |
| --- | --- |
| `K_Guard` | garde de chevalier vivante (respiration, rebond des genoux, écu devant le cœur, épée pointe en avant) |
| `K_GuardFwd`, `K_GuardBack`, `K_StrafeL`, `K_StrafeR` | marche en garde et pas chassés autour de la cible (mêlés selon la direction, phase commune) |
| `K_Slash1` à `K_Slash4` | combo : taille, revers, coup vertical en deux temps, estoc fendu |
| `K_Charge`, `K_Spin` | charge puis attaque tournoyante à 360° |
| `K_JumpSlash` | saut frappé plongeant |
| `K_HopL`, `K_HopR`, `K_Backflip` | bond latéral et salto arrière en cible verrouillée |
| `K_ShieldBash` | coup de bouclier |
| `K_Run` | course armée, épée basse en arrière |
| `K_Stagger` | réaction lourde (réserve) |

## Commandes ajoutées

- **CIBLER** (bouton rond à gauche de Armes, `F`, `Tab` ou clic molette) : Aerin fait face au mannequin, la caméra
  le cadre, le joystick fait des pas chassés autour de lui ; un marqueur doré tourne au-dessus de la cible.
- **Frappe** : appuyer pendant un coup enchaîne le suivant dès 60 % du coup (annulation fluide). À l’arrêt ou en
  cible, coup complet avec fente et magnétisme vers le mannequin ; en déplacement libre, le coup reste porté par le
  haut du corps et les jambes continuent (V10 conservée).
- **Maintenir Frappe** ≈ 0,4 s : charge ; relâcher une fois chargée → **attaque tournoyante** (deux touches à 360°).
  Changement assumé : le maintien ne répète plus les coups ; les appuis successifs font le combo.
- **Sauter puis Frappe** (ou Frappe puis Sauter) : **saut frappé** qui brise la garde.
- **Bouclier + Frappe** : **coup de bouclier**, brise la riposte annoncée par l’anneau rouge.
- **Esquiver en cible** : vers la gauche/droite = **bond latéral**, sans direction ou en arrière = **salto arrière**,
  en avant = roulade. Invulnérabilité au milieu du mouvement.

## Sensation de jeu

Gel d’impact (75 à 110 ms), secousse de caméra, étincelles, recul des mannequins, traînée de lame (0,12 s),
inclinaison dans les virages et à l’accélération, tête tournée vers la cible, cape physique (Verlet, collisions
avec le buste et les jambes).

## Chevalier (dist/game/aerin-knight-v11.js)

Personnage original : tunique forestière conservée, armure d’acier légère par-dessus — cuirasse (plastron à arête,
filet de laiton, feuille de chêne dorée), braconnière, gorgerin, spalières à trois lames, canons d’avant-bras et
manchettes, tassettes, genouillères, grèves —, cape bleu nuit à liseré doré, **épée longue** (gouttière, garde
courbe, fusée bleue, pommeau à gemme) et **écu** bleu à feuille de chêne. Les pièces sont rigides et fixées aux os :
elles suivent toutes les animations. L’épée et l’écu reprennent l’axe et la prise des armes d’origine (masquées).
En vue 1re personne, seuls les avant-bras, l’épée et l’écu restent visibles.

## Fichiers

- `dist/game/aerin-motion-v11.js`, `dist/game/aerin-knight-v11.js`, `dist/game/aerin-v11.css` (nouveaux)
- `dist/game/aerin-game-webgl.js`, `aerin-game-webgpu.js`, `aerin-game.js` : même correctif logique dans les deux moteurs
- `dist/index.html` : bouton CIBLER, modules, aide
- `../index.html` (HTML autonome) : reconstruit par `npm run build:standalone` (`tools/build-standalone-v11.py`)
- Tests : `tests/v11-contract.cjs` (dans `npm run check`), `tests/v11-knight-browser.cjs` (`npm run test:v11`)

## Limites honnêtes

- Mouvements écrits à la main, non capturés : ils sont fluides mais n’ont pas la richesse d’une capture Mixamo.
- Rendu testé en WebGL logiciel (SwiftShader) seulement ; aucune mesure de cadence sur iPhone, Mac ou PC réel.
  Coût ajouté : ≈ 30 maillages d’armure, une cape de 70 points simulée à 90 Hz, traînée et étincelles.
- Pièces d’armure rigides : légères interpénétrations possibles aux poses extrêmes (salto, fente profonde).
- Le bouton CIBLER est placé à côté du bouton Armes ; disposition non vérifiée sur iPhone physique.
