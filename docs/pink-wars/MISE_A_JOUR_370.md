# Version 3.70 — « Sous les Néons » complet

Le niveau 2 est allongé de la même façon que le niveau 1, sans remplacer la rue existante. Ses quatre objectifs, ses combats, ses passerelles et ses escaliers restent tels quels. Un prologue et un épilogue construits ferment les deux extrémités de la rue, qui donnaient jusqu’ici sur le vide. L’histoire est raccordée à la fin du chapitre 01 et au chapitre 03.

## L’histoire, raccordée

Vesper, 2196. À la fin du chapitre 01, le registre des Archives végétales disait que l’autre était parti vers « l’enclave du marché des Bas-Niveaux », trois jours plus tôt. Le monte-charge des Archives descend jusqu’à cette enclave.

- **Prologue — l’enclave du marché couvert.**
  - Le héros sort du monte-charge dans le couloir de service. Le dispensaire des Épars est vide, mais il a été évacué avec ordre.
  - Le registre de soins d’Inès Varga raconte les derniers jours :
    - l’arrivée de l’autre (indicatif AEGIS 07), qui a soigné un enfant et réparé le purificateur d’eau avec des pièces de pompe de la Ligne 9 ;
    - le « recensement » annoncé par HELIX Security, avec une évacuation promise vers l’Anneau logistique ;
    - le départ de l’autre avec les malades : « Je ne les laisse pas seuls. »
  - Dans le local radio, il faut raccorder le banc de batteries, puis allumer la radio. Inès appelle : dix-neuf personnes sont cachées au poste de soins de la rue, sans eau.
  - HELIX écoute la même fréquence et fait descendre des éclaireurs par la verrière du marché. C’est le premier affrontement avec des agents humains en armure blanche, noire et rouge.
  - Pour sortir, il faut tourner la manivelle de la grille pendant 25 s, sous deux vagues.
  - Documents à trouver : les dessins de l’école du marché, l’avis de recensement signé A. Kessler et le carnet de la cuisine commune.
- **La rue (inchangée)** : poste de soins, galerie HELIX, passerelles à +12 m, accès de la tour de transit.
- **Épilogue — la tour de transit.** Ouvrir l’accès ne termine plus la mission : la tour est devenue un poste de contrôle HELIX.
  - Le hall est équipé de portiques de scan, avec le slogan « scan obligatoire avant l’eau ». On y prend le badge du chef de poste.
  - Les consignes du poste ont été annotées par une agente qui doute : tous les agents de HELIX ne savent pas ce qu’ils gardent.
  - Le badge ouvre le coffre de données. Le manifeste du convoi 02 révèle deux choses :
    - l’indicatif de l’autre est dans le « lot spécial » parti vers l’Anneau logistique ;
    - le lot d’archives contient les 212 enregistreurs AEGIS du 14/03/2189, que l’armée a déclarés perdus en 2190.
  - La note d’A. Kessler, classée JANUS, dit : « Priorité absolue aux supports de 2189. Les personnes sont secondaires. » Le compagnon conclut par la réplique du storyboard 02B : « Ils protègent les données. Pas les gens. »
  - L’alarme déclenche l’arrivée d’une équipe HELIX au quai. Le convoi 03 attend avec 14 civils dans un conteneur. Il faut bloquer la porte du convoi pendant 50 s, sous trois vagues. Un agent HELIX s’interroge à voix haute.
  - La mission se termine sur le choix existant du chapitre : escorter les civils ou récupérer les preuves. Dans les deux cas, la suite mène au chapitre 03, « Le Convoi des Absents ».

Aucune mort n’est confirmée. ORDRE reste hostile, et HELIX est un adversaire distinct. Gaby accompagne GHJU, Cara accompagne LYLU, avec des répliques sous-titrées pour chacun.

## Ce qui est construit

- **Enclave** (au nord de la rue) :
  - seuil fermé entre les deux îlots ;
  - marché couvert de 9 m de haut, avec charpente, verrière, étals transformés en lits et en barricades, tentes-dortoirs, cuisine, coin école et purificateur réparé ;
  - dispensaire, couloir de service, local radio et monte-charge.
- **Tour de transit** (au sud) :
  - parvis ;
  - hall HELIX, avec portiques, rideaux lumineux, poste de sécurité et hologramme tournant ;
  - coffre de données, avec baies de serveurs et flux de données ;
  - quai de chargement, avec camion et conteneur du convoi, caisses d’archives et porte du convoi ;
  - étages de la tour visibles depuis la rue.
- Couche cyberpunk :
  - néons cyan sale et ambre, câbles bas, vapeur des caniveaux et ruissellement ;
  - hologramme de koï, projection rouge du recensement, balayage du scanner HELIX ;
  - panneaux « HELIX SECURITY — votre sécurité, notre mémoire » et « LES ÉPARS — on ne laisse personne ».
- Chiffres :
  - 10 portes animées (grille, monte-charge, portes coulissantes HELIX, coffre, porte du convoi) ;
  - 14 points d’interaction, dont 9 documents (la radio et le manifeste compris) ;
  - 9 groupes d’ennemis (27 unités).
- Les agents HELIX ont un rendu propre (rouge sécurité) et vont par paires, avec quelques machines isolées, comme le prévoit le Tome II.
- La pluie de la rue ne tombe plus dans le marché couvert.
- La nuit est plus sombre à l’intérieur : la lune et le ciel sont atténués selon la pièce, et quelques lampes suivent le joueur.
- **Points de contrôle** :
  - à chaque étape, et à l’entrée de la rue une fois la grille ouverte ;
  - au rechargement, la partie reprend au dernier point de contrôle ;
  - après une défaite, le bouton « REPRENDRE AU POINT DE CONTRÔLE » relance à la dernière sauvegarde, et « RECOMMENCER » repart du monte-charge.

## Durée

C’est une estimation, pas une mesure. Le prologue ajoute environ 10 minutes et l’épilogue 10 à 12 minutes au parcours actuel de la rue. Une première partie devrait donc durer 30 minutes ou plus, à confirmer en jouant.

## Vérifications

- Tests automatisés : nouveau fichier `tests/370-m02-extension.test.mjs` (8 tests). Ils couvrent :
  - l’emprise des deux zones hors de la rue ;
  - la navigation des machines dans chaque pièce ;
  - le dégagement des interactions et des ennemis ;
  - le prologue joué du monte-charge à la rue ;
  - l’épilogue joué de la tour au choix final ;
  - les points de contrôle ;
  - l’histoire des deux héros ;
  - le branchement dans la page.
- Navigateur (Chromium, rendu logiciel) : les deux parties ont été jouées avec les raccourcis de test, aucune erreur console.
  - Prologue avec GHJU : monte-charge, dispensaire, registre, batteries et radio, éclaireurs HELIX, manœuvre de la grille, ouverture sur la rue.
  - Épilogue avec LYLU : tour, badge, coffre, note Kessler, manifeste, alarme, verrouillage du quai sous trois vagues, écran du choix final.
- iPhone 13 émulé : départ dans le monte-charge, sous-titres de Gaby, marché, aucune erreur.
- Correction de QA : les commandes de test (`?debug=1`) font avancer le déroulé après une téléportation ou un nettoyage.
- Limites :
  - pas de mesure de durée ni de difficulté sur une vraie partie ;
  - pas d’essai sur iPhone ni sur Quest 3 réels ;
  - la nuit reste sombre dans le marché en qualité basse.
