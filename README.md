# Pink war

Jeu de survie 3D en HTML et JavaScript, conçu pour iPhone, ordinateur et casque WebXR. LYLU ou GHJU défend une arène fermée de 200 × 200 mètres, puis ferme la brèche après dix niveaux.

- Version 3.11 : une à trois brèches par vague, sélectionnées aléatoirement en dehors des bâtiments, apparition échelonnée et répartie entre les portails sans modifier le décompte de créatures (5, 8, 11, 14, 17, 20, 23, 26, 29, 32). Les ennemis sont sensiblement moins rapides et perdent un peu de vitesse avec les niveaux, tandis que leurs points de vie augmentent. Menu Pause présentant toutes les commandes PC, manette, tactile ; panneau de commandes 3D dédié en WebXR Quest. Hauteur de LYLU calibrée à 1,80 m et GHJU à 1,70 m, armure comprise ; raccords anatomiques bassin-cuisses, têtes de fémurs et doigts sur poignée retravaillés. Sons de tir laser enrichis d'impacts graves et de l'échantillon WAV réel CC0 en lecture immédiate ; vibrations de manette renforcées de 40 à 165 ms selon l'arme (si matériel compatible).
- Version 3.10 : tir laser réel au format WAV (teckpow, CC0) livré avec le jeu web, mixé aux signatures sonores des cinq armes ; ambiance musicale futuriste « Tense Future Loop » (gmason, CC0), lecture en boucle depuis OpenGameArt avec interrupteur musique dédié (connexion Internet nécessaire pour la musique, compilation autonome conserve les effets synthétiques de secours). Les stations d'armes optionnelles disposent de faisceaux de 7 m, balises et radar/HUD de distance. Les gants disposent de deux articulations par doigt (détente, phalanges et serrage différenciés). IA furtive : patrouille près du portail, détection visuelle bloquée par les bâtiments et recherche temporaire à la dernière position connue ; tirs uniquement avec ligne de vue. À la mort, les ennemis se dissolvent pendant 0,75 s dans une colonne de plasma avec un halo et des particules.
- Version 3.9.1 : intégration du rig V692 de Pink War dans le cycle de rendu effectif du jeu FPS et troisième personne. Le personnage garde l'animation IK synchronisée lors du changement de vue ; transitions de caméra accroupie amorties ; la pose est mise à jour avant le calcul du rayon de tir en 3P pour éviter le décalage de la bouche du canon. En WebXR les mains restent pilotées par les manettes Quest ; aucun corps 3D artificiel n'est affiché. Tests automatisés et compilation HTML autonome revérifiés.
- Version 3.9 : refonte cinématique inspirée de RLH V692 pour les deux soldats (objectifs de pied, solveur de genou IK, chevilles stabilisées, coudes orientés à l'extérieur, compensation du bassin et tir en déplacement). Nouvel accroupissement avec tir et déplacement lent (C au clavier, R3 manette classique, clic stick libre Quest, bouton tactile ↓), saut désactivé en position basse et caméra abaissée. Dans /personnage.html, repères des vraies articulations, modes marche/course avec tir et accroupissement avec tir, et boutons d'écoute des 5 sons laser WebAudio multicouches. Aucune animation Mixamo/FBX RLH n'est intégrée comme asset au jeu ; adaptation des méthodes au squelette procédural existant.
- Version 3.8 : proportions des soldats rééquilibrées et balancement de marche amorti ; rotation du Meta Quest exclusivement continue ; ennemis plus résistants et rapides selon les vagues, dégâts localisés tête (×2,2), torse (×1), membres (×0,65) avec étourdissement ou ralentissement ; armes offertes en stations holographiques animées à ramasser volontairement (F, carré/X ou clic du stick libre Quest) ; accueil réduit à deux sélecteurs LYLU/GHJU et FPS/3e personne sans bandeau de statistiques.
- Version 3.7 : arène industrielle plus technique avec conteneurs fret, générateurs, réseaux, marquages de service et barrières basses franchissables ; radar à secteurs. Saut balistique avec gravité/atterrissage en FPS/3e personne, bouton tactile ↑ et touche J ; L2/LT de la manette classique (hors Quest), R2/RT continue à tirer. Contrôles VR Quest de rechargement préservés. Animation procédurale du rig de LYLU/GHJU enrichie d’après les principes de marche/course/appuis du module RLH V692 (squelette Mixamo/FBX de RLH non importé comme asset).

- Version 3.6 : LYLU et GHJU ont une hiérarchie d’articulations distinctes pour le bassin, la colonne, les épaules, les cuisses, les genoux, les chevilles et les bottes. Le pas s’accorde au déplacement réel ; genoux et pieds roulent à l’appui, le torse compense, et les poignets sont recalculés à chaque image pour garder une prise stable sur l’arme. Cette animation reste légère et sert aussi la vue à la troisième personne sur téléphone.
- Version 3.5 : casques tactiques affinés et mieux équipés, gants renforcés avec reliefs de phalanges, doigts animés sur la détente et la poignée en FPS comme à la troisième personne. Le rechargement redresse l’arme et libère brièvement la main d’appui ; huit cellules lumineuses suivent les munitions, la charge et le remplissage. En VR, l’écran de l’arme reprend ces mêmes états sans ajouter d’informations à l’interface de combat.
- Version 3.4 : camouflage numérique à faible contraste sur les plaques, rivets sur les plastrons et épaulières, écusson couronne au torse et aux épaules dès le premier niveau. Les tissus restent noirs et texturés ; les plaques nacrées et les pièces bleu électrique ou rose reprennent les planches de LYLU et GHJU.
- Version 3.3 : LYLU et GHJU reprennent le chara design tactique fourni : combinaison noire, plastron et plaques claires contrastées par des pièces bleu électrique ou rose, épaulières superposées, casque fermé à visière, emblème couronne, chargeurs de poitrine, poches utilitaires, genouillères et bottes renforcées. Les silhouettes restent compatibles avec la vue FPS, la troisième personne et la VR.
- Version 3.2 : chaque tir possède maintenant sa propre signature sonore synthétisée : impulsion laser pour R–9, rafale électronique pour BLOOM, décharge en éventail pour PETAL, claquement de rail chargé pour THORN et explosion d’énergie profonde pour NOVA. Les sons sont activés par défaut ; le bouton Son permet de les couper ou réactiver, et la puissance sonore de THORN et NOVA suit leur niveau de charge.
- Version 3.1 : les ennemis alternent entre quatre châssis de robot extraterrestre : traqueur à casque multi-capteurs, scuttler arachnéen à six pattes, spectre élancé à antennes et brute aux cornes et épaules blindées. Les élites renforcent le châssis lourd ; les unités à distance portent un canon intégré. Les formes basses ont une silhouette et une hauteur de visée propres.
- Version 3.0 : une passerelle métallique traverse le flanc droit de l’arène. Deux escaliers donnent accès au tablier, avec garde-corps et marches visibles. Le déplacement en suit la pente et relève le personnage, la caméra et le casque en FPS, en troisième personne et en VR ; les ennemis peuvent aussi monter et les tirs tiennent compte de la hauteur.

- WebGPU avec secours WebGL2 lorsque WebGPU est absent ou perdu. Le mode casque utilise le moteur WebGLRenderer de Three.js 0.180, dédié au rendu immersif WebXR, avec les mêmes modèles et matériaux.
- Vue FPS ou troisième personne. Joystick gauche pour se déplacer ; joystick droit pour viser ; tir central.
- Sélection sur l'accueil : LYLU est un soldat aux épaules plus larges dans un univers bleu ; GHJU est une soldate dans un univers rose. Le choix change immédiatement le modèle, l'armure, les armes, les tirs, le portail, le ciel, les éclairages et les accents de l'interface. Il est mémorisé sur l'appareil.
- Version 2.9 : en VR, les gants articulent les doigts d'après la pression des gâchettes et de la poignée ; les contrôleurs continuent de suivre les mains. La gâchette de la main libre recharge la batterie et lance un geste bref : le pistolet se redresse à la verticale pendant que l'index de l'autre main presse la détente de recharge. La gâchette de tir reste à la main principale.
- Version 2.8 : épaules et casques redimensionnés pour une silhouette mieux proportionnée. Les tirs donnent un recul bref à l'arme, visible aussi dans les mains VR ; chaque arme a sa propre intensité. La visée reste entièrement contrôlée par le joueur : aucun accrochage automatique aux ennemis ni projectile à tête chercheuse. LYLU et GHJU gardent un casque intégral opaque ; les visages restent masqués.
- Version 2.7 : torse et membres profilés, plastrons continus, articulations et bottes affinées. Les ennemis ordinaires, élites et lanceurs possèdent aussi des armures anatomiques et des casques fermés.
- Le tissu tissé, le métal peint satiné, les bordures métalliques et les visières ont des matériaux distincts ; de petites textures procédurales et des reflets précalculés renforcent le relief. Les mêmes modèles sont utilisés sur téléphone, à la troisième personne et en VR. Les géométries d'ennemis sont partagées et fusionnées : six maillages par ennemi comme en 2.6, avec davantage de triangles pour les nouvelles formes.
- Les plaques et accessoires s'ajoutent automatiquement à chaque niveau : bleu, nacré et titane pour LYLU ; rose, nacré et champagne pour GHJU. Le niveau 6 renforce le casque déjà fermé. Les gantelets évoluent également en FPS et sur les mains des contrôleurs VR. Les dix niveaux d'armure et les cinq prises d'arme restent disponibles.
- Dix niveaux : 5, 8, 11, 14, 17, 20, 23, 26, 29 puis 32 ennemis, apparus progressivement. Santé, vitesse, fréquence et proportion d’élites augmentent. Les lanceurs de projectiles arrivent au niveau 4. Une victoire clôt le niveau 10, sans niveau 11.
- Cinq armes : R–9 au niveau 1, BLOOM au 3, PETAL au 5, THORN au 7, NOVA au 9. Une nouvelle arme s’équipe automatiquement. L’arsenal permet de revenir aux précédentes. PETAL disperse du plasma ; les deux dernières armes accumulent une charge et infligent des dégâts de zone. Une charge partielle peut être relâchée ; maintenir tire à pleine puissance.
- Chaque arme possède sa propre batterie. ↻ ou R recharge ; maintenir le tir avec une batterie vide déclenche aussi la recharge. Les batteries se remplissent au début d’un niveau. Elles fournissent respectivement 12, 24, 10, 6 et 4 tirs. Les recharges prennent du temps ; leur progression se fige pendant la pause.
- Santé de 100 points, dégâts, vignette rouge et régénération à 18 points par seconde après 5 secondes sans dégât. Les huit murs supplémentaires arrêtent le déplacement, les attaques, les projectiles et les explosions. Les ennemis les contournent grâce à un champ de navigation partagé.
- Commandes ordinateur : ZQSD/WASD, flèches ou glisser pour viser, Espace pour tirer, R pour recharger, E pour changer d’arme, V pour la vue, Échap pour la pause, Maj pour courir. Trois contacts tactiles peuvent agir simultanément.
- VR casque : mode WebXR immersif prévu pour Meta Quest 3 et les manettes Touch Plus. La manette de tir se tient comme un pistolet : le canon suit la main, la gâchette tire, un laser et l’affichage des munitions sur l’arme aident à viser. Les deux manettes servent au combat ; la main de tir, la rotation, la direction du déplacement, le laser et les vibrations se règlent avant d’entrer en VR. Les commandes détaillées sont ci-dessous. Un HUD discret, en bas du regard, affiche uniquement la santé et les munitions restantes ; les recharges, pauses et fins de partie sont accessibles avec les manettes.
- VR téléphone : deux caméras espacées de 64 mm, une image pour chaque œil. Utiliser un support VR en paysage. L’orientation utilise les capteurs après autorisation iOS ; sans capteurs, le joystick droit reste disponible. Une manette Bluetooth standard peut fournir déplacement, regard, tir, recharge et pause. Il ne s’agit pas d’une session immersive WebXR sous Safari iPhone.
- Réglages, sons synthétisés distincts par arme et record conservés sur l’appareil. Aucun compte ou serveur de jeu.

## Meta Quest 3 — commandes

Ouvrir l’adresse HTTPS du jeu dans **Meta Quest Browser**, choisir LYLU ou GHJU, cliquer sur **VR**, régler le pistolet si besoin, puis **Entrer en VR · Meta Quest 3** et autoriser la session immersive. Le casque suit les mouvements de tête ; le jeu utilise la vue FPS. Le mode téléphone à deux yeux reste distinct.

La disposition ci-dessous est celle de la **main de tir droite** (par défaut). Avec une main de tir gauche, tout est inversé : la gâchette gauche tire, X recharge, Y change d’arme, le joystick gauche tourne, le joystick droit déplace, A revient à l’arme précédente et B met en pause.

| Commande Touch Plus | Action |
| --- | --- |
| Manette droite (le pistolet) | Le canon suit la main et sert de visée, indépendamment du regard ; le laser et les tirs partent de la bouche du canon |
| Gâchette droite | Tir ; maintien pour charger THORN/NOVA, relâchement pour un tir partiel ; tir automatique à charge complète |
| Poignée droite maintenue | Laser renforcé. Le laser reste visible sans elle (réglable) ; tenir le pistolet poignée serrée n’empêche pas de courir |
| A | Recharger la batterie ; l’arme se redresse brièvement |
| B | Arme débloquée suivante |
| Joystick droit gauche/droite | Rotation par crans de 30° ou 45°, ou fluide ; recentrer le joystick avant le cran suivant. Haut/bas : sans effet, pour qu’un cran ne change jamais d’arme par erreur |
| Joystick gauche | Déplacement horizontal, selon le regard ou selon la manette gauche |
| Clic du joystick gauche maintenu, ou poignée gauche serrée à fond | Courir |
| Gâchette gauche | Recharger sans lâcher le pistolet ; l'arme se redresse brièvement à la verticale. Elle ne tire jamais et ne reprend jamais une pause |
| X | Arme débloquée précédente |
| Y | Pause / reprise |
| A en pause / fin de partie | Reprendre / rejouer la campagne |
| B en pause / fin de partie | Quitter la VR |

### Réglages du pistolet VR

Ils sont dans la fenêtre **VR** (avant d’entrer dans le casque) et conservés sur l’appareil : **main de tir** (droite ou gauche), **rotation** (crans de 30°, crans de 45° ou fluide), **direction du déplacement** (selon le regard ou selon la manette libre), **laser de visée** (toujours visible ou poignée maintenue) et **vibrations**. La liste des commandes de cette fenêtre suit la main de tir choisie.

### Sensations de tir

Le pistolet recule à chaque tir et le canon se relève brièvement ; la direction du tir reste celle de la manette. Les doigts du gantelet suivent la détente et la poignée en VR, en FPS et à la troisième personne. La gâchette de la main libre fait pivoter l'arme vers le haut pendant le rechargement, puis elle revient en position de visée ; l'index du gant libre s'enroule avec la pression. Hors VR, le bras suit la poignée pendant le geste. Les manettes continuent de suivre les mains réelles en VR. Les vibrations dépendent de l’arme (R–9 sec, BLOOM léger, PETAL, THORN et NOVA de plus en plus marqués) et se renforcent pendant la charge. Un tir qui touche, une élimination, un changement d’arme, une recharge et un dégât ont chacun leur impulsion. Huit cellules sur l’arme s’éteignent avec les tirs, clignotent à faible charge et se remplissent pendant le rechargement ; elles s’éclaircissent pendant la charge des armes lourdes. L’afficheur VR garde le nombre de munitions et une barre de batterie, y compris pendant une recharge.

### Performances dans le casque

Le jeu demande 90 Hz. Si la moyenne des images sur deux secondes dépasse de 30 % le temps d’image visé, il pousse d’abord le rendu à fovéation maximale, puis descend à 80 puis 72 Hz, jamais en dessous. Les ombres ne sont recalculées qu’une image sur deux dans le casque et les modèles tenus en main n’en projettent pas. Les pièces statiques d’un monstre sont fusionnées en quelques maillages partagés par tous les monstres du même type, et les étincelles sont instanciées : une vague avancée demande de l’ordre de 30 % d’appels de dessin de moins qu’avant, pour un rendu identique. Le HUD plat et le radar ne sont pas recalculés dans le casque.

Les batteries restent propres à chaque arme ; une recharge prend du temps et bloque les tirs. Une recharge effective, un changement d’arme, une pause ou la perte du suivi de la manette de tir annule la charge. Il faut relâcher la gâchette avant de tirer après une de ces actions. Maintenir le tir avec une batterie vide conserve la recharge automatique existante. Aucune commande du jeu ne remplace les boutons système du casque.

La visée part de la bouche du canon suivie en 6DoF, sans modifier la perspective du casque. Le laser indique l’intersection la plus proche, même si elle est un mur. Passer physiquement la main à travers un mur ne permet pas de tirer derrière. Les vibrations sont optionnelles selon l’API du navigateur (`hapticActuators` ou `vibrationActuator`). La session se met en pause si le suivi de la manette de tir ou la visibilité immersive est perdu ; reprendre ensuite avec le bouton de reprise.

Le mapping correspond au [profil officiel Touch Plus](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/meta-quest-touch-plus/profile.json) et à la [norme WebXR Gamepads](https://immersive-web.github.io/webxr-gamepads-module/). La validation logicielle et les limites des essais sans casque sont documentées dans `VERIFICATION.md`.

## Affichage en partie

La santé et le nombre de balles sont les seules informations affichées dans le HUD pendant le combat, sur téléphone, ordinateur et en VR. Le casque utilise deux petits indicateurs sous la visée ; l’afficheur et les cellules intégrés à l’arme décrivent seulement son état de munitions. Les niveaux, scores, ennemis, noms d’arme, messages de charge/recharge et panneaux d’aide ne recouvrent plus la scène. Les commandes et réglages se consultent dans les menus avant l’entrée en VR. Les vibrations et les sons accompagnent toujours le tir et la recharge.

## Mains, armes et personnages

La main droite tient toujours l'arme utilisée, comme le gant droit tient la lance dans RLH : en vue FPS, à la troisième personne et en VR. Le gant (paume, dos de la main, trois doigts refermés sur la crosse, index sur la détente, pouce sur le flanc gauche) est modélisé dans le repère de l'arme ; les cinq armes sont dessinées autour de leur poignée, origine à la paume. La main ne peut donc pas flotter à côté de l'arme, quelle que soit l'arme équipée.

- **R–9** se tient à une main. **BLOOM, PETAL, THORN et NOVA** ont une poignée avant : la main libre la saisit avec le même gant, en miroir. À la troisième personne et en vue FPS, les deux mains sont visibles ; en VR, la manette libre est la main libre.
- À la troisième personne, chaque bras est une chaîne à deux segments résolue vers la poignée et vers la poignée avant (cinématique inverse) : le coude se place tout seul et le poignet tombe exactement sur le gant. Avec le R–9, la main libre se repose à la hanche.
- Les tirs partent de la bouche réelle de l'arme tenue, en vue FPS comme à la troisième personne.
- Les armures sont des formes biseautées ou en dôme (pauldrons, gantelets, bottes, ailes, casque, couronne), fusionnées en quelques maillages par os et par matériau. Un changement de niveau recompose seulement les os concernés ; les dix tenues et leurs noms restent ceux de la campagne.

## Tenues progressives

Chaque étape conserve les pièces précédentes et ajoute son équipement. Ces améliorations sont visuelles ; la santé et les règles de combat restent celles de la campagne. Le tableau ci-dessous présente les noms des tenues de GHJU.

| Niveau | Tenue | Nouvelle pièce |
| --- | --- | --- |
| 1 | Aube | Combinaison, plastron, bottes et casque intégral opaque |
| 2 | Sentinelle | Plastron composite et cœur lumineux |
| 3 | Vigie | Épaulières, radio et insignes |
| 4 | Éclaireuse | Gantelets, scanner et écran de poignet |
| 5 | Rempart | Jambières, genouillères et ceinture à cellules laser |
| 6 | Spectre | Renforts de casque, filtres et capteurs |
| 7 | Valkyrie | Réacteur dorsal |
| 8 | Aurora | Protections de hanches et finitions champagne |
| 9 | Séraphine | Ailettes dorsales et balises lumineuses |
| 10 | Impératrice | Couronne, halo orbital et insignes de prestige |

Le bouton **Tenue**, disponible à l’accueil et dans la pause, présente le personnage en 3D. Les dix étapes peuvent être prévisualisées et tournées de face ou de dos. L’aperçu fige la simulation, puis rétablit la tenue réellement gagnée, l’arme et la caméra au retour en jeu. Les commandes de l’atelier restent accessibles par défilement sur les petits écrans.

LYLU reçoit les mêmes pièces aux mêmes niveaux, avec les tenues Éclaireur, Atlas, Azur, Séraphin et Impérateur aux étapes 4, 7, 8, 9 et 10. Les insignes portent le nom du personnage choisi. Revenir à l'accueil conserve la tenue de la partie ; choisir l'autre personnage prépare une nouvelle campagne à la tenue Aube. La sélection reste sur l'accueil pour garder une campagne cohérente.

## Lancer

`python3 -m http.server 4173 --directory dist`, puis ouvrir `http://localhost:4173`. Sur iPhone ou casque, utiliser l’URL HTTPS du site. Le bouton VR explique les possibilités du navigateur et n’active pas un casque indisponible. Safari sous iOS 26 prend en charge WebGPU ; le secours WebGL2 reste disponible. Le mode paysage est recommandé.

## HTML autonome

`python3 tools/build-launcher.py /chemin/Pink_war.html` produit un seul HTML avec la simulation, le moteur 3D, les modes VR, les styles et l’icône intégrés. La génération utilise esbuild ; le jeu résultant ne charge aucun CDN ni fichier annexe. Le HTML peut être servi par HTTPS ou sur localhost. L’ouverture directe dans l’application Fichiers d’iOS dépend des restrictions de Safari et n’a pas été vérifiée. Les autorisations WebXR et capteurs restent celles du navigateur.

## Vérifier

`npm test` couvre la simulation, les commandes VR (dont la main de tir gauche, les modes de rotation, les vibrations et la cadence cible) et les réglages. Le parcours navigateur et ses limites matérielles sont consignés dans `VERIFICATION.md`. Les bibliothèques sont livrées localement ; Three.js est sous licence MIT, fournie dans `dist/vendor/LICENSE.three.txt`.

## Héberger sur Vercel

Le projet **pink-war** publie ce dépôt sur [pink-war.vercel.app](https://pink-war.vercel.app). Pour un nouvel hébergement, importer ce dépôt dans Vercel avec le préréglage **Other**. Le fichier `vercel.json` sert directement le dossier `dist`, sans installation ni compilation. La branche de production est `main`. Le site utilise HTTPS, nécessaire pour WebGPU, les capteurs et WebXR. Une fois le dépôt relié, chaque envoi sur `main` peut mettre à jour le jeu.

## Ressources audio et licences de la version 3.10

- Tir laser réel : **teckpow**, [Laser_shooting_sx](https://opengameart.org/content/lasershootingsx), licence **CC0**. Fichier livré : `dist/audio/laser-shooting-cc0.wav` (PCM mono 44,1 kHz). Attribution facultative. Ce fichier reste enregistré dans le dépôt GitHub et servi localement par Vercel.
- Musique futuriste : **gmason**, [Tense Future Loop](https://opengameart.org/content/tense-future-loop), licence **CC0**. MP3 en streaming depuis `https://opengameart.org/sites/default/files/tensefutureloop.mp3` (OGG de secours). La musique ne fonctionne pas hors réseau et son chargement est indépendant du jeu.
- Les tirs synthétiques internes servent de couches complémentaires et de secours dans le HTML autonome, notamment si le WAV local n'est pas disponible.
