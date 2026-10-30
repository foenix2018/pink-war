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
