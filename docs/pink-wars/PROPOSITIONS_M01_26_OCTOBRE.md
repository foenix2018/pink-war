# M01 — Propositions pour une première traversée d’au moins vingt minutes

**26 octobre 2026 · option A choisie par le créateur.**

Premier lot atelier/boutique livré en [3.63.9](MISE_A_JOUR_363_9.md). Les budgets de temps et les secteurs suivants restent des cibles. Diagnostic historique ci-dessous, établi avant cette extension. Analyse du code de la 3.63.7 (`322eacb`) ; la 3.63.8 ne change que l’illustration M02 et sa présentation. Cette proposition précise le [plan de mission longue](PLAN_M01_20_25_MIN.md) à partir du premier lot effectivement livré.

## Diagnostic vérifié

- L’emprise actuelle est de **120 × 160 m** (`assets/level1/layout.json`, X -62/+58, Z -62/+98). Elle comprend la cour du convoi et l’aile technique de la 3.63.4. La superficie seule ne représente pas la durée jouable.
- `campaign-level1.js` garde les quatre pôles du book : annexe, boutique, carrefour, terrasse. Les objectifs restent concentrés : courant (-6,62), archive (0,55), boutique (-21,20), carrefour (18,6), balise (5,-8), relais (18,-44,+4,8 m).
- Huit postes initiaux puis trois groupes de huit : **32 machines finies, huit actives au plus**. Les derniers combats sont encore organisés surtout autour de trois états de vague. Un portail est actif à la fois.
- La première zone possède déjà deux approches, une isolation électrique et des renforts annoncés. La suite n’offre pas encore autant d’itinéraires ni de fonctions spatiales. Les extensions boutique/îlot, carrefour et montée du plan précédent ne sont pas livrées.
- La balise est aujourd’hui principalement un déclencheur de la troisième rencontre : l’interaction ouvre une brèche puis fixe `sabotaged=true`. Elle ne démontre pas encore une coupure effective du partage d’informations entre machines. En faire un véritable objectif tactique donnerait du sens au détour.
- Le moteur possède déjà perception sonore, dernière position connue, recherche, couvert, navigation, tirs physiques, bouclier et sauvegarde. La priorité est de construire des situations utilisant ces capacités, puis d’en corriger les limites observées.

Les durées de 6–8 minutes du premier lot étaient des cibles de conception, **pas des mesures utilisateur**. Il faut mesurer le parcours complet avant de prétendre que le minimum de vingt minutes est atteint.

## Trois directions possibles

| Option | Expérience | Agrandissement | Durée visée en découverte | Compromis |
| --- | --- | --- | --- | --- |
| **A — Percée militaire, recommandée** | Cinq séquences liées : reconnaissance, combat intérieur, contournement, sabotage sous pression, montée vers le relais | Intérieurs et arrière-cours raccordés aux quatre pôles ; objectif d’emprise environ 150 × 190 m | **25 min au centre d’une cible 22–28 min** | Parcours principal clair ; choix tactiques locaux, sans monde ouvert |
| **B — Quartier semi-ouvert** | Le joueur observe une place centrale et choisit plusieurs routes vers la boutique et la balise | Deux îlots traversants et des raccourcis déverrouillés ; objectifs canoniques toujours dans l’ordre | **25–30 min** | Plus d’exploration et de rejouabilité, mais guidage et navigation IA plus complexes ; une route directe peut être plus rapide |
| **C — Assaut vertical** | Progression par ateliers, mezzanines, paliers et passerelles, avec vues sur les positions précédentes | Petits étages intermédiaires, escalier et ascenseur ; le relais final reste à +4,8 m | **22–27 min** | Forte identité spatiale ; davantage de travail sur collisions, couverture des sorties et confort VR |

**Recommandation : A, avec les deux approches locales de B et la montée finale de C.** L’extension principale est orientée vers vingt-cinq minutes pour laisser une marge par rapport aux vingt minutes souhaitées. Ce minimum concerne une première découverte en difficulté normale, hors morts, cinématiques, chargements et lecture volontairement prolongée ; un joueur expert pourra traverser plus vite. Aucun verrou chronométré ne force la durée.

## Parcours A détaillé — budget central de 25 minutes

| Séquence | Budget de conception | Ajouts concrets | Fonction des machines et du récit |
| --- | --- | --- | --- |
| **1. Cour des évacuations** | **4 min** | Consolider les deux approches existantes. Des véhicules, le triage et les auvents donnent trois lignes de couvert lisibles. Une position haute permet d’observer avant de descendre. | Une sonde surveille ; un binôme défend le passage, sans connaître le joueur à travers les murs. Valises, brancards et impacts racontent une évacuation interrompue. |
| **2. Annexe hors réseau** | **5 min** | Ouvrir une vraie succession de local technique, salle de triage et archive. Réutiliser les deux commandes d’isolation déjà jouables. Le retour dans la cour offre de nouveaux angles après la remise sous tension. | Réaction au bruit du circuit, renforts finis et annoncés. Le premier journal humain confirme le passage du frère ou de la sœur ; aucune révélation JANUS supplémentaire. |
| **3. Boutique et îlot effondré** | **6 min** | Ajouter arrière-boutique, atelier traversant et cour de livraison. Deux accès au terminal existant ; BLOOM se découvre sur le trajet principal. Un balcon ou une mezzanine forme un angle alternatif, sans rendre l’étage obligatoire partout. | Un tireur tient la rue et un binôme peut contourner par la cour réellement accessible. Le deuxième journal reste le seul nouvel indice obligatoire ; traces de réparation et barricades expliquent la survie des habitants. |
| **4. Carrefour sous occupation** | **6 min** | Viaduc, deux positions de suppression, épave et passage de service offrent une progression par couverts. L’accès à la balise oblige à changer d’angle ou à contourner. | Couper la balise doit réellement interrompre les transmissions distantes. Les robots gardent leurs sens locaux et leur dernière mémoire : ils ne deviennent pas aveugles et ne disparaissent pas. Quatre renforts répartis sur des accès annoncés. |
| **5. Montée et relais** | **4 min** | Deux paliers protégés ; escalier accessible et ascenseur débouchant derrière un couvert. LANCE permet de traiter une position à distance. Une dernière traversée relie les deux accès à la terrasse existante. | Quatre défenseurs finaux, aucun respawn infini. Le relais délivre la direction canonique vers les Archives végétales. Conclusion brève, puis progression narrative existante. |
| **Total cible** | **25 min** | Chemin principal complet ; les caches facultatives ne comptent pas pour atteindre la cible. | Alterner observation, engagement, reprise de souffle et histoire. |

La durée vient des décisions et des espaces parcourus, pas du seul nombre de machines. Répartition cible conservée : **8 initiaux + 8 annexe + 8 boutique + 4 carrefour + 4 montée = 32**. La différence par rapport au code actuel est surtout de placer la troisième rencontre entre carrefour et montée, et de donner à chaque groupe un secteur défendable. Toute augmentation ultérieure du total imposerait une évolution explicite du contrat M01 du book.

## Construction et lisibilité

- Viser **150 × 190 m** (+48 % de surface d’enveloppe), avec environ 600–850 m de chemin cumulé selon les choix. Ce sont des objectifs à valider dans le blocage des volumes, pas des mesures du niveau publié.
- Préserver les coordonnées des quatre pôles et construire autour : ouvrir des bâtiments existants et relier les arrière-cours, au lieu d’étirer toutes les distances.
- Donner à chaque zone un repère : éclairage ambre des secours, enseigne de boutique dégradée, pile du viaduc, antenne du relais. Le point de guidage mène vers le prochain passage accessible.
- Toute couverture montrée doit arrêter réellement les tirs ; toute sortie doit être accessible avec le gabarit du joueur. Un ennemi ne tire pas à travers le mur dont il vient de sortir.
- Sauvegardes après les objectifs principaux, avant le carrefour et avant la montée ; un rechargement restaure les portes, les groupes et le sabotage déjà accomplis.
- Le réalisme du décor reste W01 : béton humide, brique ancienne, acier usé, nature pionnière, véhicules de secours et occupation d’ORDRE. Éviter de transformer M01 en copie des néons de M02.
- Conserver GHJU/LYLU, leurs modèles Shadow Unit, leurs armes, les gants, le HUD C et le réglage audio 3.63.7. Pas de rencontre physique anticipée de Gaby/Cara avant M07.

## Ordre de réalisation proposé

1. **Boutique / atelier / arrière-cour**, prochain lot recommandé : plans de circulation et volumes jouables, puis couverts, groupe tactique, deuxième journal et textures. Captures en jeu et essai utilisateur avant de détailler le reste.
2. **Carrefour / balise** : donner un effet concret au sabotage et tester les routes de contournement et la perception sonore.
3. **Paliers / terrasse** : finaliser escalier et ascenseur, répartir les derniers défenseurs et contrôler les sorties.
4. **Passe complète** : retoucher l’annexe et les transitions à partir du rythme constaté, puis mesurer la mission entière.

Pour chaque lot : mission toujours finissable, sauvegarde compatible, même plafond de huit machines actives, textures partagées, décor chargé par secteur autant que possible. La version publiée n’annonce pas vingt minutes tant que ce parcours n’a pas été joué et mesuré.

## Validation de durée et de difficulté

Prévoir au moins trois premières découvertes (joueurs ne connaissant pas la nouvelle route), puis une traversée agressive et une prudente. Journaliser localement temps par secteur, engagements, temps hors combat, détours, morts et reprises. Exclure attente dans les menus et écrans de chargement. Critère de livraison : toutes les traversées de découverte retenues dépassent vingt minutes et la médiane se situe vers 24–26 minutes ; aucune séquence ne repose sur l’attente d’une minuterie ou sur la lecture imposée.

Si un secteur reste trop court, enrichir sa circulation ou sa situation tactique. S’il est long parce que l’on se perd, corriger le guidage. S’il est long à cause d’ennemis trop résistants, revoir le placement et le couvert. Le chronométrage automatisé ne remplace pas ces essais de découverte. La fluidité physique sur iPhone et Quest doit également être testée avant une promesse de performance.
