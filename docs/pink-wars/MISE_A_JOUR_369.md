# Version 3.69 — « Le Dernier Signal » complet

Le niveau 1 est allongé sans être remplacé, comme le demande la bible (§12, M01 : « parcours déjà présent, à enrichir sans le remplacer »). Le quartier des secours, ses quatre objectifs, ses combats, l’escorte de Gaby et Cara, la caméra et RECO1 restent tels quels. Un prologue et un épilogue construits l’encadrent, sur le terrain libre de la même carte, et l’histoire est raccordée à celle des autres chapitres.

## L’histoire, raccordée

Vesper, 2196, sept ans après la chute du 14/03/2189. Il y a trois jours, une émission de onze secondes est passée sur le canal 07, celui de la Caserne 07 où GHJU et LYLU étaient de garde la nuit de la chute. Le héros revient la chercher.

- **Prologue — Caserne 07.** Le héros arrive par la cour de manœuvre de son ancienne caserne. Dans la salle de garde, la main courante du 14/03/2189 donne la chronologie de la nuit, la même que dans la Ligne 9 (chapitre 05) :
  - 17 h 42 : ORDRE suspend les évacuations ;
  - 22 h 05 : départ de l’équipe technique de LYLU vers les pompes P9 ;
  - 22 h 12 : départ de la VSAV de GHJU avec 34 civils ;
  - 22 h 47 : contact perdu ;
  - 23 h 00 : réseau principal saisi par ORDRE, message « Ne prends pas le réseau principal. Retrouve les anciens relais. ».

  Le tableau de garde, la radio restée sur le canal 07 (avec l’émission d’il y a trois jours), les consignes de départ et le casier de l’autre complètent le récit. Ce casier est vide, sans poussière, avec une photo et un mot récent : « Relais A3, puis les Archives ». Pour sortir, il faut relancer le groupe électrogène (gazole, démarrage, 30 s à tenir pendant que des rampants sortent de sous les engins), puis commander la porte sectionnelle de la remise. Une patrouille ORDRE attend dehors.
- **Le quartier des secours (inchangé)** : annexe, archive hors réseau, atelier, BLOOM et LANCE, balise, relais A3.
- **Épilogue — Archives végétales.** Le relais A3 ne termine plus la mission : son journal montre la connexion de l’autre il y a trois jours et son message, et ORDRE détecte la connexion. Le héros redescend vers l’accès sud et déverrouille les portes d’accueil à la main. Il trouve la signature de l’autre dans le registre des visiteurs, puis son bivouac encore tiède. Sa carte entoure les Bas-Niveaux, la Ligne 9 et le poste Orme. Un ordre de purge d’ORDRE et une demande de copie de HELIX amorcent le chapitre 02. Il faut copier le registre des disparus en 75 s, sous trois vagues dont deux par portail. Sous le nom du héros, l’autre a écrit « pas disparu(e) ». Sa propre fiche dit qu’il ou elle est parti(e) vers l’enclave du marché des Bas-Niveaux. Le monte-charge y descend : c’est le début du chapitre 02, « Sous les Néons ».

Aucune mort n’est confirmée ; ORDRE reste hostile ; Gaby accompagne GHJU, Cara accompagne LYLU, avec des répliques sous-titrées pour chacun.

## Ce qui est construit

- **Caserne 07** (à l’ouest de la clôture) : cour de manœuvre avec tour d’exercice, cuve de gazole et VL 07 ; couloir ; local du groupe électrogène ; salle de garde (pupitre du standard, radio, table de carte, tableau de garde magnétique) ; vestiaires ; remise de 7 m de haut avec la VSAV 07, le FPT 07, le râtelier d’ARI et les tuyaux, et la porte sectionnelle animée.
- **Archives végétales** (au sud) : parvis, hall à puits de lumière, galerie des herbiers, bureau du conservateur (le bivouac), local des copies, salle des registres et ses rayonnages, salle des herbiers, grande serre vitrée plantée, monte-charge.
- 13 portes animées (coupe-feu, vitrées, bois, porte sectionnelle, monte-charge), 16 points d’interaction dont 10 documents, 11 groupes ennemis (36 machines en plus des 32 du quartier).
- La clôture du quartier est ouverte en deux points (collisions et rambarde Blender).
- Lumière : dans les intérieurs, le soleil et le ciel sont atténués selon la pièce (adaptation de l’œil) et quelques lampes suivent le joueur ; la caserne n’a pas de courant avant le groupe, les Archives sont éclairées par leurs puits de lumière et la verrière.
- **Points de contrôle** à chaque étape du prologue et de l’épilogue ; après une défaite, « REPRENDRE AU POINT DE CONTRÔLE » relance à la dernière sauvegarde (de l’extension ou du quartier, la plus récente).

## Durée

Estimation, pas une mesure : le prologue ajoute environ 8 à 10 minutes, l’épilogue 10 à 12, à ajouter au parcours actuel du quartier. Cela donne 30 à 40 minutes pour une première partie. À confirmer en jouant.

## Vérifications

- Tests automatisés : nouveau fichier `tests/369-m01-extension.test.mjs` (8 tests) : emprise hors du quartier et dans l’aire de jeu, navigation des machines dans chaque pièce, dégagement des interactions et des ennemis, prologue joué jusqu’au retour dans le quartier, épilogue joué du relais au monte-charge, points de contrôle, histoire des deux héros recoupée avec la Ligne 9. Les tests existants du M01 sont inchangés : sans l’extension, le chapitre d’origine se comporte comme avant.
- Navigateur (Chromium, rendu logiciel) : chapitre entier joué avec les raccourcis de test, de la cour de la caserne à l’écran de fin (prologue, retour dans le quartier, relais A3, épilogue, copie du registre sous assaut, monte-charge), aucune erreur console. iPhone 13 émulé : démarrage dans la cour, sous-titres de Gaby, objectif affiché, aucune erreur.
- Correction de QA : les commandes de test (`?debug=1`) avancent la simulation d’un pas après une téléportation et ferment les documents immédiatement.
- Limites : pas de mesure de durée ni de difficulté sur une vraie partie ; pas d’essai sur iPhone ni sur Quest 3 réels.
