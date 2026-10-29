# Chapitre 05 — « La Ligne Noyée » (Ligne 9)

Version 3.66. Mission longue de l’Acte II « Sous la ville », jouable depuis l’accueil (**Histoire → 05 — LA LIGNE NOYÉE**) ou directement sur `ligne9.html` (`?character=lylu` par défaut, `?character=ghju`).

## Sources du canon

Le niveau suit ce que fixent les documents du dépôt :

- `docs/pink-wars/BIBLE_NARRATIVE_V1.md` §12, M05 « La Ligne Noyée » : métro inondé, pompages, éclairage de secours ; LYLU héros de référence (route technique) ; révélation « ancrages actifs sous secteurs évacués ».
- `docs/pink-wars/TOME_II_PRODUCTION_V1_2.md`, M05 : entrée → quai → pompes → poste de commande ; séquence « pomper deux secteurs ; ouvrir écluse ; éviter coupure totale » ; opposition rampants + traqueur sonore.
- `docs/pink-wars/STORYBOARD_V1.md` 05A–05C, et `docs/LORE.md` : Nira Solen (Épars), ORDRE hostile, HELIX et JANUS, le dernier message « Ne prends pas le réseau principal. Retrouve les anciens relais. », aucune mort confirmée, magenta réservé à la signature de phase.

## Histoire

Sept ans après la chute de 2189, l’eau a pris la Ligne 9 sous les Halles-Basses. Les dispensaires des Épars n’ont plus de route sèche. Nira Solen demande à LYLU, qui était descendu ici le soir de la chute pour rallumer les pompes P9, de recommencer. Avec GHJU, Gaby l’accompagne : elle descend là où son frère est allé seul.

En chemin, les documents racontent la nuit de l’évacuation (avis aux usagers, carnet du guichetier, registre AEGIS où figure le message de LYLU), la vie des Épars dans l’abri du quai, et ce que la régie savait. Une fois l’écluse ouverte, la voie basse se vide et révèle la chambre JANUS-9 : un ancrage de phase HELIX actif, refroidi par l’eau qu’ORDRE maintenait dans la ligne. Les deux journaux copiés prouvent qu’ORDRE a provoqué l’effondrement des Halles pour évacuer le secteur. ORDRE inverse alors les pompes ; il faut rejoindre le poste Orme avant que l’eau ne remonte, et envoyer les preuves à Nira par l’ancien relais, celui d’où LYLU avait parlé à GHJU en 2189. Fin ouverte : le chapitre suivant reste « 06 — Le Cœur d’Acier ».

## Plan et déroulé (16 étapes, un point de contrôle chacune)

| # | Étape | Lieu | Ce qui s’y passe |
|---|---|---|---|
| 1 | Descendre dans la station | Rue des Tanneurs (pluie, réverbères), bouche de métro | Ouverture, Nira à la radio |
| 2 | Rétablir le courant de secours | Salle des billets sans courant, local technique | Premier combat dans le noir (lampe frontale), tableau de secours |
| 3 | Suivre la correspondance | Couloir de correspondance, poste de secours AEGIS | Registre d’évacuation |
| 4–5 | Traverser les Halles-Basses, raccorder deux relais | Marché souterrain effondré (bassin) | Rampants sortant de l’eau, portail de renfort ORDRE |
| 6 | Rejoindre le quai 9 | Rideau métallique, abri des Épars | Traqueur sonore dans le couloir, ravitaillement |
| 7 | Amorcer la pompe A | Quai inondé, voies sous tension | Tenir 60 s, trois vagues de rampants |
| 8 | Longer le tunnel technique | Tunnel de 4 m vidangé | ORDRE coupe le courant : obscurité totale |
| 9–10 | Ouvrir trois vannes, démarrer les pompes P9 | Salle des pompes (14 m de haut) | Tenir 90 s, deux portails ORDRE |
| 11 | Ouvrir l’écluse | Galerie, sas de l’écluse | Porte lourde : 45 s d’ouverture sous attaque |
| 12 | Descendre la voie basse | Voie vidée vers la lueur magenta | Révélation de l’ancrage |
| 13 | Relever les preuves | Chambre JANUS-9 | Traqueur Alpha (élite), surtension et portail |
| 14 | Rejoindre le poste Orme | Chambre qui se noie | 2 min 30 pour sortir, alarme, eau qui monte |
| 15–16 | Transmettre et remonter | Poste Orme, monte-charge | Ancien relais, fin |

Couloirs de 4 m et portes de 3 m minimum (les machines suivent le joueur partout), 14 portes (coupe-feu, vitrées, rideau, grille, porte d’écluse, monte-charge), 4 plans d’eau dont deux qui se vident et un qui baisse, 20 pièces sur 11 500 m².

## Durée

Estimation, **pas une mesure** : personne n’a encore joué le niveau en entier à la main. Le parcours critique fait environ 800 m, s’y ajoutent 92 machines en 18 groupes, 3 phases à tenir (3 min 15 au total), la fuite (jusqu’à 2 min 30), 45 répliques sous-titrées (≈ 4 min) et 10 documents (≈ 700 mots). Avec des combats de 1 à 3 min par groupe, on arrive à 35–45 minutes pour une première partie, davantage en lisant tout. Un joueur qui fonce et connaît le plan peut descendre sous les 30 minutes. À valider en jeu réel.

## Immersion

- Station éclairée par un **réservoir de 7 lumières** (4 en qualité Performance) déplacées vers les luminaires les plus proches : tubes fluorescents (dont certains qui grésillent), lampes grillagées du tunnel, projecteurs de la salle des pompes, réverbères au sodium, lampes de secours rouges sur batterie, étincelles de l’eau sous tension, gyrophares de l’alarme.
- **Deux régimes de courant** : sans courant (seules les lampes de secours, brouillard rapproché) puis éclairage de secours ; coupure du tunnel pendant l’étape 8. Lampe frontale automatique dans le noir, touche **L** pour la forcer.
- Textures Poly Haven CC0 (carrelage métro, dallage usé, béton, tôle, caillebotis, rideau rouillé, acier vert), 512 px, dans `dist/assets/ligne9` avec leurs sources et licence.
- Portes qui coulissent à l’approche, voyants rouge/ambre/vert sur les portes verrouillées, vannes dont le volant tourne, pompes qui démarrent, ventilateurs, gouttes qui tombent et ronds dans l’eau, pluie dans la rue, éclaboussures quand les rampants sortent, signalétique de la Régie (plan de ligne, panneaux de quai, sorties), affiches HELIX, ORDRE, SOMNIA, AEGIS, tags des Épars, tracts d’évacuation au sol, flaques.
- Son : grondement de l’eau, ronflement 50 Hz du secours, bourdonnement des pompes, gouttes, signaux de porte, de vanne, d’alarme et de coupure.
- Lecture des documents : la partie se met en pause pendant la lecture (F, Échap ou clic pour reposer). Au casque, le document s’affiche en panneau et les sous-titres suivent le regard.

## Fichiers

- `dist/ligne9-layout.js` — géométrie jouable, portes, eau, objets, interactions, rencontres, étapes.
- `dist/ligne9-mission.js` — règles de la mission (indépendantes du rendu, jouées entièrement par les tests).
- `dist/ligne9-story.js` — répliques (versions LYLU/Cara et GHJU/Gaby), documents, fin.
- `dist/ligne9-art.js` — décor, lumières, eau, portes, machines, particules.
- `dist/ligne9.js`, `dist/ligne9.html` — page du chapitre (même moteur, armes, commandes, HUD et WebXR que M02 et la Couronne).
- `tests/ligne9.test.mjs` — 9 tests : plan dans l’arène, largeurs de passage pour la navigation des machines, parcours complet jusqu’au monte-charge, colliders, script des deux héros, mission jouée de bout en bout, défaites et noyade, page et entrée dans Histoire.

## Vérifications

- Tests automatisés : 550 réussis, 0 échec (dont les 9 de `tests/ligne9.test.mjs`).
- Navigateur (Chromium, rendu logiciel) : mission entière jouée de la rue au monte-charge avec les raccourcis de test (téléportation, combats vidés, attentes avancées), 25 captures, aucune erreur console ; entrée par l’accueil (Histoire → 05 → page du chapitre) ; iPhone 13 émulé (GHJU) ; casque Quest 3 émulé : entrée en VR, sous-titres au regard, lecture d’un document au clic du stick gauche, fermeture par X.
- Correction partagée : le panneau de lecture des documents au casque passe désormais devant tout le décor (il pouvait être recouvert par un objet transparent) ; vaut aussi pour M01 et M02.

## Limites connues

- Pas encore de mesure de durée ni de réglage de difficulté sur une vraie partie.
- Vérifié dans Chromium en rendu logiciel et en iPhone émulé ; pas encore sur iPhone ni sur Quest 3 réels. Le réservoir de lumières est pensé pour le Quest, mais le coût réel reste à mesurer.
- Les chapitres 03 et 04 n’existent pas encore : le 05 est accessible directement.
