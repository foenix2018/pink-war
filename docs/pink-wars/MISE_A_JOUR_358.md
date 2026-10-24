# Pink Wars 3.58 — Pictogrammes et lancement direct

## Changements appliqués

Le bouton permanent de la partenaire n’affiche plus « GABY » ou « CARA ». Un bouclier orbital rose représente Gaby, un noyau offensif bleu représente Cara. Les mêmes tracés servent au HUD écran, au pupitre du poignet gauche en WebXR et aux propositions d’interface. Les noms restent dans le menu ouvert et dans les libellés accessibles. Les touches G, croix directionnelle haute et la sélection à la gâchette droite restent disponibles.

À la fin des six tableaux du prologue, la campagne continue automatiquement. Le parcours depuis l’accueil devient **prologue → illustration du scénario et barre de préparation → jeu**. Le second panneau « Entrer » de M01/M02 n’est plus une étape du lancement. Les durées du storyboard, la pause, le saut du prologue et sa relecture sont conservés ; une relecture seule reste ouverte à la fin et ne lance pas de partie.

La progression de chargement suit les étapes réellement achevées : moteur, décor, surfaces, équipements et validation du premier rendu. Il ne s’agit pas d’un compteur de téléchargement en octets ni d’une animation chronométrée. L’écran ne disparaît qu’après validation du rendu ; une erreur garde ou réaffiche le bouton de récupération. M02 affiche la présentation avant d’importer ses modules 3D.

La reprise d’un point de contrôle M01 se trouve désormais sur l’accueil, pour le personnage concerné. Sa lecture ne charge aucun moteur 3D. Les sauvegardes existantes restent compatibles. Les outils de visite M01 (`visit`) et de lancement manuel M02 (`manual=1`) restent accessibles pour le diagnostic.

Sur les navigateurs qui limitent l’audio automatique, la première commande tactile ou clavier réactive le son sans ajouter de page de confirmation.

## Trois propositions de menus, sans refonte globale imposée

Page interactive : [Comparer les interfaces](https://pink-war.vercel.app/menus-concepts.html?v=3.58).

| Direction | Intention |
|---|---|
| **A — Bastion, recommandée** | Navigation militaire courte, surfaces graphite, image de fond lisible et grands boutons. |
| **B — Vesper** | Terminaux humains hors réseau, cadres d’archives, blancs chauds et matière. |
| **C — Fracture** | Composition panoramique, panneaux arrondis et compétences disposées en arc. |

Chaque direction présente accueil, pause, compétences, réglages, chargement et HUD, avec formats ordinateur, iPhone et Quest, et couleurs GHJU/LYLU. Ce sont des maquettes : leurs réglages ne modifient pas les préférences du jeu, les compétences sont simulées et l’aperçu de chargement est une démonstration. Le format Quest illustre la composition ; il n’ouvre pas une session immersive. Le choix artistique global reste à faire par le créateur.

## Lore et contenu conservés

Le parcours de référence M01, les bâtiments, collisions, escaliers, monte-charge, ennemis, armes et modèles Shadow Unit de GHJU/LYLU sont conservés. Santé et munitions restent dans le HUD. La rencontre physique et l’activation de Gaby/Cara restent à **M07** ; leurs menus ne débloquent aucune compétence en M01/M02.

## Vérification

- Suite complète : **411 tests réussis, aucun échec**, dont quatre contrôles de progression, validation du rendu et récupération d’erreur. Contrôles ciblés relancés après l’ajustement du chargement M02.
- Navigateur local, format iPhone : fin naturelle du dernier tableau, navigation sans clic de démarrage supplémentaire, progression monotone jusqu’à 100 %, premier rendu réel M01, tir tactile, santé/munitions et ouverture du menu par pictogramme.
- Relecture du prologue sans lancement involontaire ; reprise de sauvegarde liée au héros ; récupération de chargement avant et après la validation du rendu.
- Scène commune écran/WebXR et M02 : LYLU/M12, compétences de Cara verrouillées, modèles canoniques conservés ; démarrage automatique M02.
- Pupitre VR simulé : ouverture, maintien, sélection unique, recharge de 30 secondes et libération des ressources. Les 54 compositions de menus (trois directions × trois formats × six écrans) ont été examinées sans élément de commande hors cadre, erreur JavaScript ni ressource absente.

Les captures et rapports de cette livraison sont dans `/workspace/livraison/captures_358/`. Le rendu logiciel des essais 3D valide les premières images puis limite les images répétées pour les captures. Aucun essai matériel dans Safari iPhone ou Meta Quest 3 n’a été réalisé pendant cette livraison.
