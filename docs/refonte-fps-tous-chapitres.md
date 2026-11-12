# Pink Wars 3.79 — refonte des espaces jouables et des ennemis

Cette livraison étend la direction FPS de la version 3.78 à tous les espaces déjà jouables. Elle conserve les scénarios, les objectifs et les équipements des héros. La forêt reste un chapitre d’exploration. Les chapitres futurs du livre ne sont pas créés par cette mise à jour.

## Espaces livrés

| Espace | Travail réalisé |
| --- | --- |
| M01 — quartier, caserne, archives | Surfaces physiques détaillées, luminaires et repères de secteurs ancrés sur les murs existants, équipements et raccordements. Deux couvertures supplémentaires dans la cour et la serre. |
| M02 — Bas-Niveaux, enclave, tour | Finition des surfaces de la rue et des intérieurs, repères des îlots, éclairage local de secours et signalétique des salles ; une couverture dans le marché. Les portes et le dispensaire détaillés précédemment sont conservés. |
| M03 — convoi | Décor, reflets, éclairages, couvertures et secteurs de la 3.78 conservés. Nouveaux comportements des ennemis et déplacement progressif des unités au sol. |
| M04 — station JANUS | Cinq couvertures fonctionnelles, luminaires suspendus dans les grands locaux, repères dans huit secteurs, volumes lumineux natifs et contraste du ciel ajusté. |
| M05 — Ligne 9 | Six couvertures fonctionnelles, traitement des matériaux et des équipements, signalétique des salles et éclairage de travail ; conservation des pompes, de l’inondation et de l’écluse. |
| M06 — fonderie | Cinq couvertures, éclairage froid/chaud des postes de travail, surfaces physiques, flaques avec reflets natifs, volumes lumineux et contraste de la halle. |
| M07 — forêt | Accélération et freinage, amortissement à l’atterrissage, relief de surface du terrain et des rochers, lumière d’environnement pour les matériaux, eau WebGPU avec rides et réfraction. Le terrain, le gué et les événements du chapitre restent autoritaires. |
| Couronne HELIX | Deux couvertures sur l’esplanade, signalétique et finition des terrasses, lumière locale, reflets natifs, mouvement de caméra commun hors XR. |
| Arène | Trois secteurs et couvertures de la 3.78 conservés, vingt vagues et règles des tourelles conservées ; nouveaux comportements communs des machines. |
| Stand de tir | Détail des surfaces, luminaires et repères des travées, avec conservation des lignes de tir, de l’armurerie et du parcours d’entraînement. |

Les vingt et une nouvelles couvertures sont des données partagées par le rendu, la navigation et les reconstructions des collisions lors d’une ouverture de porte ou d’une reprise de checkpoint. Les petits locaux, les rampes, les paliers et les approches d’objectifs sont exclus. Deux positions initialement envisagées ont été supprimées après les contrôles de navigation.

## Ennemis

- La recherche locale explore la dernière position vue ou entendue, puis expire. Elle ne suit pas les coordonnées d’un joueur caché.
- Une unité sous le feu ou déjà engagée dans une manœuvre de couvert donne la priorité à cette manœuvre avant ses déplacements de spécialiste. Les rôles propres aux châssis, l’évitement des grenades et le repli des unités blessées restent actifs.
- Les unités au sol accélèrent selon leur masse, s’arrêtent pour un engagement et perdent leur vitesse contre un obstacle.
- Les frappes de mêlée comportent une anticipation visible, un axe engagé et une récupération. Un déplacement latéral, une rupture de contact ou un étourdissement peut faire manquer l’attaque. Les bras suivent l’anticipation et le coup.
- Les groupes de tireurs proches annoncent et espacent leurs ouvertures de feu : au plus trois préparations simultanées dans un même groupe local. Le contrôle des murs, de la bouche de l’arme et des alliés reste prioritaire.
- Les drones conservent leur charge visible, leur cible fixée avant le tir, leur trajectoire esquivable, leur inertie et leur collision aérienne, déjà intégrées.

## Budgets et vérification

Les détails fixes sont fusionnés par matériau ; les luminaires sont instanciés. Deux textures de microrelief de 128 × 128 pixels sont partagées par espace et ne remplacent pas les normales photographiques existantes. Chaque ensemble ajoute au maximum deux projecteurs locaux ; les nouveaux projecteurs, volumes et reflets sont réduits sur téléphone et casque. Le traitement de caméra synthétique reste exclu du XR.

Les tests couvrent chaque mission jouable, la navigation autour des couvertures, les checkpoints et les portes, les collisions, les trajectoires de tir, l’anticipation/esquive des attaques, les armes, l’alignement XR et les budgets de l’arène. Les validations de navigateur utilisent Chromium avec SwiftShader ; elles ne constituent pas une mesure de cadence sur iPhone ou Quest.

### Résultats de cette livraison

- Passe complète : **184 tests passants**, couvrant les missions M01 à M06, les deux héros du parcours M03, la Couronne, la forêt, le stand, l’arène, les sauvegardes, les tirs, les armes et les repères XR.
- Après les derniers ajustements : **30 contrôles passants** sur les nouveaux espaces, les reprises de portes, les attaques, les rôles tactiques, les couverts et les sondes ; **14 contrôles** sur la finition et le retargeting des mouvements passent également.
- Navigateur réel : M01, M02, M04, M06, Ligne 9, Couronne et forêt démarrent sur WebGL 2 sans exception JavaScript. Le stand est construit, mis à jour avec sa simulation et rendu séparément avec ses cibles.
- M06 fonctionne aussi en **WebGPU natif**, avec le personnage canonique chargé, cinq nouvelles couvertures, dix-sept luminaires, quatre volumes lumineux, le reflet planaire borné à 96 objets au quart de la résolution et le traitement HDR commun. La lecture d’une image rendue réussit sans erreur.
- Les captures et états de validation sont conservés dans `/workspace/livraison/fps-tout-le-jeu/`. Les prises WebGL utilisent la qualité basse pour contrôler le repli ; la prise WebGPU utilise la qualité normale. Aucun résultat de cadence matérielle n’est déduit de SwiftShader.
