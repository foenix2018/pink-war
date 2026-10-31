# Version 3.73 — « La Brèche Violette », niveau 4, et une signalétique de Vesper

## Le niveau 4

**La station énergétique Est de JANUS**, de nuit (`niveau4.html`). Elle suit le Tome II (W04 / M04) :
- parcours : cour réacteur → hangar → relais → stabilisateurs → portique ;
- objectifs : trois stabilisateurs à neutraliser, deux relais à réactiver, le boss de portique BS01 ;
- adversaires : remparts et sondes d’ORDRE ;
- révélation : la brèche a été ouverte volontairement et elle est tenue avec des signatures humaines.

**L’histoire.**
- **Le lien avec le niveau 3.** Le registre de la gare envoyait le « lot spécial » du convoi 02, dont l’autre, à la station Est. Le train sanitaire d’Inès s’y arrête.
- **Le parcours.**
  1. Badge du poste de garde, puis sas d’inspection.
  2. La cour du réacteur, gardée par ORDRE.
  3. Deux relais à réactiver :
     - dans le hangar de drones (les drones se réveillent) ;
     - dans l’atelier serveur, où le journal des signatures montre les sept personnes du lot spécial branchées sur les stabilisateurs.
  4. Le passage de maintenance.
  5. L’anneau autour de la brèche. Trois stabilisateurs sont à neutraliser, le dernier sur le portique, sous des renforts par portail. Le gardien de portique BS01 voit son blindage de phase céder à chaque cage coupée (12 %, 40 %, 70 %, puis 100 % des dégâts).
  6. Le journal du réacteur.
- **Les noms sur les cages.** Les signatures lues sur les cages sont des noms déjà croisés : Okafor (le registre des visiteurs des Archives végétales), Varenne et Kim (l’équipe technique de LYLU la nuit de la chute), Sorel et Quentin (l’ambulance de GHJU). La troisième cage porte l’autre : « active ». L’autre est vivant(e) et résiste ; son bracelet, coupé au scalpel, porte gravé « P9 ».
- **La révélation.** Le journal du réacteur dit que la brèche a été ouverte le 14/03/2189 à 22 h 47, sur ordre de JANUS. C’est la minute exacte où le contact avec l’équipe de LYLU a été perdu dans la Ligne 9 (journal de bord du niveau 1). Elle est tenue depuis 2195 avec des signatures humaines fournies par HELIX (A. Kessler), sous la garde d’ORDRE.
- **Vers le niveau 5.** Le lot spécial part vers l’ancrage JANUS-9, sous la Ligne 9. Inès renvoie vers Nira Solen.
- **Personnages.** Répliques pour Gaby avec GHJU et Cara avec LYLU, plus Inès, les annonces de JANUS, d’ORDRE et du gardien. Huit documents. Aucune mort confirmée.

**Ce qui est construit.**
- Six secteurs reliés, sur trois hauteurs :
  - le sol ;
  - la passerelle de la cour, à 4,5 m, avec ses rampes ;
  - le portique, à 6 m.
- Les lieux :
  - le quai et le train sanitaire, le sas à portiques de scan ;
  - la cour avec transformateurs, cuves, conteneurs, chariot et racks de tuyaux ;
  - le hangar à racks de drones et puits de lumière ;
  - l’atelier serveur (couloir, deux salles de baies, local du relais) ;
  - le passage de maintenance, l’anneau, le réacteur et la colonne violette de la brèche (anneaux tournants, étincelles, lumière), qui s’éteint avec les stabilisateurs ;
  - les relais animés et les cages des stabilisateurs.
- Le HUD commun, avec la jauge du gardien et de son blindage, des points de contrôle à chaque étape et l’écran de niveau commun.
- Accès : menu « 04 — La Brèche Violette ». La fin du niveau 3 propose le chapitre 04.
- Moteur : un ennemi peut porter un blindage (`damageScale`) qui ne laisse passer qu’une part des dégâts. Aucun autre niveau ne l’utilise.

**Durée.** C’est une estimation, pas une mesure : environ 20 à 30 minutes, avec quatre phases à tenir sur les relais et les cages et une douzaine de groupes d’ennemis, dont le gardien. À confirmer en jouant.

## Signalétique

Les panneaux trop génériques sont remplacés par une signalétique commune (`signage.js`) :
- néons à halo avec kanji ;
- enseignes verticales (市場, 修理, 薬局, 夜市, 酒場, 倉庫, 危険…) ;
- publicités holographiques des marques de Vesper : HELIX, Vesper Transit, Nova Ramen, Kitsune, ORDRE, AEGIS, JANUS Énergie, Synth-Koi ;
- plaques de direction bilingues avec pictogrammes ;
- plaques de danger rayées.

Au niveau 3, onze enseignes, huit publicités et des plaques de direction balisent l’avenue. Les seize panneaux de la carte d’origine sont redessinés dans ce style. La gare et l’échangeur ont leurs propres plaques. Le niveau 4 a sa signalétique JANUS (bleu technique, jaune maintenance, violet de phase).

## Vérifications

- Tests : nouveau fichier `tests/373-m04-breche.test.mjs` (6 tests). Ils couvrent :
  - les secteurs et les hauteurs atteintes à pied ;
  - le dégagement des interactions, des caches et des ennemis ;
  - la mission entière jouée ;
  - le blindage du gardien et les points de contrôle ;
  - l’histoire raccordée aux niveaux 1, 3 et 5 ;
  - la page et le menu.
- Navigateur (Chromium, rendu logiciel) : niveau 4 joué en entier avec les raccourcis de test, du quai jusqu’à l’écran de fin, aucune erreur console. Captures de l’avenue du niveau 3 avec la nouvelle signalétique.
- Limites : durée et difficulté non mesurées sur une vraie partie ; pas d’essai sur iPhone ni sur Quest 3 réels. Le niveau 4 n’a pas encore d’illustration propre pour son écran de niveau : un fond dégradé violet la remplace.

# Version 3.73 — Traces de vie et détails animés

Les deux niveaux gagnent des affaires personnelles, des fournitures et de petits mouvements pour donner l’impression de lieux utilisés puis laissés en l’état. Les objets sont posés sur le mobilier existant ; les parcours et interactions de mission restent inchangés.

- **Caserne** : sacs souples avec poches et bretelles courbées, paires de bottes, gants à doigts et pouces distincts, clés suspendues au panneau de l’établi, documents décalés, gourdes et traces sèches de chaussures.
- **Archives et serre** : herbier botanique sous la vitrine, godets de semis sur les bacs, arrosoir. Les étiquettes botaniques oscillent autour d’une hauteur fixe, sans dérive liée au nombre d’images. Le bassin est désormais creux, avec eau visible, robinet fixé à la margelle, goutte et ride circulaire discrète.
- **Marché** : sacs et bouteilles près des couchages, conserves, bol avec cuillère, réserve d’eau, cahier et crayons du coin école. Cinq étoffes sont attachées aux montants des étals et bougent légèrement.
- **Dispensaire et HELIX** : plateau de soins, bandages roulés, documents, gourdes et fiches de manutention sur les caisses.
- **Ventilation** : deux ventilateurs de table à la caserne et un au local radio du marché. Les pales accélèrent avec leur propre circuit électrique puis ralentissent après la coupure. Ni ventilateur lié au circuit de l’autre lieu, ni éclairage dynamique ajouté.

Le mobilier garde ses emprises de collision. Les petits accessoires sont décoratifs et ne créent pas de nouvelles actions. Les marques de pas et de tasse sont des décalques plats. La fuite du bassin est un effet d’ambiance, indépendant des circuits électriques et des mécaniques de mission.

## Réalisation et coût

`dist/vesper-lived-in.js` construit une couche séparée et réutilise les matériaux physiques de la 3.72, avec quelques variantes de couleur. Les pièces fixes sont regroupées par matériau. Seuls les trois jeux de pales, cinq étoffes et l’effet d’eau s’animent. Aucun chargement externe, lumière supplémentaire, nouvelle boucle de rendu ou canevas actualisé par image. Les objets reposent sur leurs supports, notamment les comptoirs surélevés et les couvercles des caisses.

Les objets et animations sont présents en qualité basse avec moins de subdivisions et de marques au sol. L’assemblage est idempotent ; les géométries et ressources propres à cette couche peuvent être libérées sans supprimer les textures partagées du décor.

## Vérification

- `npm test` : **673 tests réussis**, aucun échec, test ignoré ou annulé.
- Onze contrôles ciblés passent après les derniers ajustements : positions sur les supports, absence de mutation des obstacles, budgets de lots et triangles, géométries finies, absence de nouvelles lumières, construction unique et libération des ressources, mise sous tension et arrêt progressif des ventilateurs, eau visible sous la margelle, portes, matériaux et circuits.
- Chromium / SwiftShader : les deux chapitres démarrent en fenêtre tactile 390 × 844 sans erreur JavaScript, avertissement de décor désactivé ni ressource manquante. Le parcours contrôlé de la caserne jusqu’au groupe électrogène allume les écrans et les ventilateurs.
- Les deux extensions sont également rendues en qualité normale pour examiner les ajouts. Ces vues rapprochées utilisent un éclairage de présentation ; les règles d’éclairage du jeu sont conservées.
- Pas d’essai sur iPhone ou Quest physiques, ni de mesure de cadence matérielle. Aucune publication en production.

[Affaires personnelles](373-vestiaires.jpg) · [Établi](373-atelier.jpg) · [Herbier](373-herbier.jpg) · [Bassin](373-bassin.jpg) · [Cuisine](373-cuisine.jpg) · [Couchages](373-couchage.jpg) · [Soins](373-soins.jpg) · [Rapport](LIVED_IN_373_BROWSER_VERIFICATION.json).
