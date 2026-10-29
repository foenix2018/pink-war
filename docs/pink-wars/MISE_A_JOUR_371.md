# Version 3.71 — « Le Convoi des Absents », niveau 3 complet

Le niveau 3 garde le décor de nuit de Vesper de sa première version (la carte « visite » du secteur 03 : avenue des Secours, annexe médicale, atelier, relais A3 sur sa terrasse, route haute, fracture rose au nord). Ses quatre étapes sont conservées, dans le même ordre et avec leurs textes. Il passe dans le moteur des autres niveaux : combat, bouclier, mêlée, charge, HUD commun, sous-titres, documents, points de contrôle, VR. Il gagne une vraie mission d’escorte d’environ 20 à 30 minutes.

## L’histoire, raccordée

- **Après le niveau 2.**
  - Le manifeste de la tour de transit a montré que le convoi 02 est parti vers l’Anneau logistique, avec l’autre (GHJU ou LYLU) dans le « lot spécial ».
  - Inès Varga, l’infirmière du dispensaire des Bas-Niveaux, a récupéré une ambulance.
  - Le choix du niveau 2 change une réplique : les civils du conteneur sont à bord, ou les caisses d’archives HELIX.
- **Le parcours** suit le Tome II : dispensaire → route haute → échangeur bloqué, puis la gare.
  1. Rejoindre l’ambulance d’Inès devant l’annexe médicale.
  2. Réarmer l’alimentation de l’annexe.
  3. Lire le dossier du convoi : 41 noms retirés des listes civiles, avec la mention « transfert — stabilisation ».
  4. Prendre les kits de réanimation, sous l’attaque des traqueurs réveillés par le courant.
  5. À l’atelier, extraire le manifeste HELIX (la signature de l’autre y figure), puis démonter un vérin hydraulique malgré une patrouille ORDRE.
  6. **Escorter l’ambulance** sur l’avenue. Elle attend son escorte, s’arrête devant les machines et perd de l’intégrité si elles l’approchent.
  7. Au barrage ORDRE, la barrière est verrouillée. Au relais A3, en haut de l’escalier, on trouve un message de Ravel, l’agente HELIX qui doutait au niveau 2 : la balise d’ORDRE au pied de la fracture suit chaque véhicule.
  8. Embuscade lourde à la fracture (châssis lourd d’élite), puis 22 s de brouillage de la balise sous des renforts par portail.
  9. Poser le vérin sur la barrière et tenir 30 s pendant la levée.
  10. L’ambulance passe sous la route haute, avec des sondes sur la voie de service.
  11. À l’échangeur bloqué, la remorque HELIX en travers de la bretelle est tirée au treuil pendant 30 s.
  12. À la gare de fret, il faut arrimer l’ambulance au train sanitaire : 45 s, trois vagues.
  13. Le registre de régulation confirme :
      - le lot civil du convoi 02 a été remis au « centre de stabilisation » de l’Anneau ;
      - le lot spécial, dont l’autre, est reparti vers une **station énergétique** où une brèche est « à stabiliser », sur ordre conjoint de HELIX (A. Kessler) et d’ORDRE.

  C’est l’amorce du niveau 4, « La Brèche Violette ».
- **Documents.** Il y en a dix : dossier du convoi, manifeste, relais A3, balise, registre de régulation, avis de couvre-feu, carnet de l’infirmerie, bon de commande HELIX, message de Ravel, fiche de transfert.
- **Personnages.** Répliques sous-titrées pour Gaby avec GHJU et Cara avec LYLU, plus Inès, Ravel, les annonces d’ORDRE et la régulation de la gare. Aucune mort n’est confirmée.
- **Vocabulaire.** Le niveau parle d’une ambulance et reste générique, sans jargon de pompier.

## Ce qui est construit

- **Le décor de la première version, porté dans three.js.** La carte « visite » (environ 186 000 faces générées par la page d’origine) est convertie par `tools/bake-m03-vesper.mjs` en un fichier compact de 5,2 Mo (environ 1,3 Mo compressé).
  - Elle est réaffichée avec des matériaux par famille : textures CC0, néons et hologrammes lumineux, fenêtres éclairées la nuit, panneaux redessinés.
  - Le portail de la fracture tourne, et les drones de la page tournent au-dessus de l’avenue.
- **Les collisions.** Elles reprennent les 62 volumes de la page d’origine, plus environ 290 blocs solides trouvés dans la géométrie : murs, bornes, bancs, véhicules. Les machines peuvent ainsi s’y abriter et y naviguer.
  - Petite évolution du moteur commun : un obstacle peut demander une marge de navigation plus fine (`navPad`). Les seuils étroits, comme l’entrée de l’atelier, restent ainsi praticables pour les machines.
  - Aucun autre niveau n’utilise cette option.
- **La nuit.**
  - Ciel pollué, brouillard, pluie autour du joueur (sauf dans les bâtiments).
  - Halos sur les néons les plus brillants.
  - Six lumières qui suivent le joueur entre les néons et les réverbères.
  - Lampe frontale automatique dans les bâtiments.
- **Nouveau à l’est.**
  - L’échangeur bloqué : deux bretelles qui quittent la route haute, des épaves, la remorque et son treuil, des murs antibruit.
  - La gare de fret : voies, train sanitaire « Sanitaire 7 », portique roulant, conteneurs, cabine de régulation.
- **Sur l’avenue.**
  - Le barrage ORDRE : barrière animée, hologramme « Barrage 03 ».
  - La balise de poursuite, avec un faisceau rouge qui s’éteint une fois brouillée.
  - L’ambulance : gyrophares bleus, phares, fumée quand elle est endommagée.
- **Le HUD.**
  - Le HUD de combat commun.
  - Une jauge d’intégrité de l’ambulance, avec son état : en route, attend son escorte, machines devant.
  - Le compte à rebours des phases à tenir.
- **Points de contrôle** à chaque étape. En cas de défaite ou d’ambulance détruite, « REPRENDRE AU POINT DE CONTRÔLE » relance l’étape avec l’ambulance réparée.
- **Accès.** Le menu « 03 — Le Convoi des Absents » et la fin du niveau 2 ouvrent `niveau3.html`. La première version reste accessible en visite libre (`vesper-level1-v7.html?chapter=3`, lien sur l’écran d’accueil).

## Durée

C’est une estimation, pas une mesure. Treize étapes, quatre phases à tenir (2 min 7 s au total), trois trajets d’escorte et environ 18 groupes d’ennemis donnent environ 20 à 30 minutes pour une première partie. À confirmer en jouant.

## Vérifications

- Tests automatisés : nouveau fichier `tests/371-m03-convoi.test.mjs` (8 tests). Ils couvrent :
  - le décodage du décor ;
  - les quatre étapes d’origine ;
  - le dégagement des interactions, des ennemis et de la route de l’ambulance ;
  - l’accès de chaque lieu, dont la terrasse A3 par l’escalier ;
  - la première partie jouée ;
  - toute l’escorte jouée jusqu’au registre ;
  - le sabotage de l’ambulance et le point de contrôle ;
  - l’histoire et le vocabulaire générique ;
  - le branchement de la page et du menu.
- Navigateur (Chromium, rendu logiciel) : mission entière jouée avec les raccourcis de test, de l’arrivée jusqu’à l’écran de fin, aucune erreur console.
- Limites : pas de mesure de durée ni de difficulté sur une vraie partie ; pas d’essai sur iPhone ni sur Quest 3 réels. Environ 470 000 triangles affichés : à surveiller sur mobile (la qualité « performance » allège la végétation et les lumières).
