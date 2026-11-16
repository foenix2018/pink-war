# AERIN V12 — Bibliothèque d'aventure et chevalier cel shading (14 novembre 2026)

Demande : « toutes les animations nécessaires pour en faire à terme un jeu d'aventure » et « formes du
chevalier plus réalistes en gardant le côté cel shading ».

## 1. Silhouette plus réaliste (dist/game/aerin-style-v12.js)

| Réglage | Valeur | Effet |
| --- | --- | --- |
| tête | × 0,86 | ≈ 7 têtes de haut au lieu de 5,5 (fin de l'allure « enfant ») |
| cou | × 1,30 | cou dégagé entre gorgerin et menton |
| buste | × 1,05 | torse plus long |
| épaules | × 1,14 | carrure de chevalier |
| cuisses / tibias | × 1,09 / × 1,08 | jambes plus longues ; le corps est relevé de 5,6 cm pour garder les pieds au sol |
| avant-bras | × 1,03 | |

Seules les positions de repos des os changent : toutes les animations restent valables. Les pistes de
position/échelle des clips GLB (constantes, sauf le bassin) sont retirées au chargement pour cela.
L'armure se mesure **après** ce réglage et suit donc la nouvelle silhouette.

## 2. Cel shading

- Matériaux « toon » à 4 paliers de lumière (aplats nets), couleurs ajustées pour garder la luminosité.
- Normales lissées : plus de facettes sur le corps, les arêtes vives des plaques restent.
- Contour encré (coque inversée) sur le corps, l'armure, l'épée et l'écu, y compris les pièces skinnées.
- Rendu « Fluide · iPhone » : aplats conservés, contours désactivés pour économiser des appels de dessin (réglage lu au chargement).
- Three r128 : les matériaux des maillages skinnés déclarent `skinning:true` (obligatoire en r128).

## 3. Animations : 69 au total

18 du GLB (V08–V10) + 18 de combat (V11) + **33 d'aventure (V12)** dans
`dist/game/aerin-motion-adventure-v12.js`, même écriture que la V11 (poses en degrés, repère du personnage).

| Famille | Clips V12 |
| --- | --- |
| Déplacement | Accroupi, Marche furtive, Équilibre, Glissade, Chute, Réception lourde |
| Escalade | Suspendu au rebord, Déplacement suspendu ←/→, Rétablissement, Paroi, Échelle |
| Nage | Nage sur place, Brasse |
| Interaction | Ramasser, Porter (arrêt / marche), Lancer, Pousser, Tirer, Ouvrir un coffre, Objet obtenu, Ouvrir une porte, Levier |
| Expression | Parler, Saluer, Victoire, Regarder autour, Assis, Genou à terre |
| Dégâts | Renversé, Se relever, Mort |

Chaque clip porte sa famille (`opt.cat`), et, quand le corps se déplace, le déplacement à appliquer par le
jeu (`opt.root`, ex. Rétablissement : +1,95 m en hauteur, +0,5 m en avant). `opt.hold` = pose finale tenue.

**Galerie** : `dist/atelier-v12.html` (lien depuis l'écran de fin et le README) — toutes les animations par
famille, rotation autour du chevalier, vitesse, bascule cel shading / rendu standard.

## 4. Déjà branché dans le jeu

- **ACCROUPIR** (C, bouton au-dessus du joystick) : accroupi à l'arrêt, marche furtive en déplacement.
- **Coffre** près de la porte de pierre : **AGIR** (T, bouton doré qui apparaît à proximité) → ouverture,
  puis Aerin brandit une fiole de vie : vie, endurance, bouclier et magie restaurés.
- **Victoire** quand les trois mannequins sont neutralisés.
- **Mort animée** avant l'écran de fin (avant : écran immédiat).

Pas encore branché, faute de décor (murs, rebords, eau, objets à porter, portes, PNJ) : escalade, nage,
porter/lancer, pousser/tirer, portes, leviers, dialogues. Les clips sont prêts ; il faudra pour chacun un
élément de décor, sa détection et le déplacement `opt.root`.

## Origine et limites

- Comme en V11, rien n'est téléchargé de Mixamo (compte Adobe requis) : les mouvements sont écrits pour le
  squelette Mixamo d'Aerin d'après les catégories Mixamo (Adventure, Climbing, Swimming, Interaction…).
  Des captures Mixamo réelles pourront remplacer n'importe quel clip `K_*` par nom.
- Mouvements de pose en pose : plus raides qu'une capture, surtout escalade et nage.
- Tests en rendu logiciel uniquement (Chromium SwiftShader) ; aucune mesure sur iPhone, Mac ou PC réel.
- Le contour double les appels de dessin du personnage en Standard/Ultra.
- Avec la tête plus petite, le bonnet et les oreilles gardent leur forme d'origine (réduits avec la tête).

## Tests

`npm run check` (contrats V09 → V12, dont `tests/v12-contract.cjs`), `npm run test:v11`, `npm run test:v12`
(parcours réel, serveur `npm run dev`). HTML autonome : `npm run build:standalone`.
