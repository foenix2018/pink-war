# Pink war

Jeu de survie 3D en HTML et JavaScript, conçu pour iPhone, ordinateur et casque WebXR. LYLU ou GHJU défend une arène fermée de 200 × 200 mètres, puis ferme la brèche après dix niveaux.

- WebGPU avec secours WebGL2 lorsque WebGPU est absent ou perdu. Le mode casque utilise le moteur WebGLRenderer de Three.js 0.180, dédié au rendu immersif WebXR, avec les mêmes modèles et matériaux.
- Vue FPS ou troisième personne. Joystick gauche pour se déplacer ; joystick droit pour viser ; tir central.
- Sélection sur l'accueil : LYLU est un soldat aux épaules larges, à la mâchoire marquée et aux cheveux courts, dans un univers bleu. GHJU conserve la soldate et l'univers rose de la version précédente. Le choix change immédiatement le modèle, l'armure, les armes, les tirs, le portail, le ciel, les éclairages et les accents de l'interface. Il est mémorisé sur l'appareil.
- Les deux personnages possèdent une silhouette arrondie, un visage, une chevelure et des articulations animées. Leurs plaques et accessoires s'ajoutent automatiquement à chaque niveau : bleu, nacré et titane pour LYLU ; rose, nacré et champagne pour GHJU. Les gantelets évoluent également en FPS et sur les mains des contrôleurs VR.
- Dix niveaux : 5, 8, 11, 14, 17, 20, 23, 26, 29 puis 32 ennemis, apparus progressivement. Santé, vitesse, fréquence et proportion d’élites augmentent. Les lanceurs de projectiles arrivent au niveau 4. Une victoire clôt le niveau 10, sans niveau 11.
- Cinq armes : R–9 au niveau 1, BLOOM au 3, PETAL au 5, THORN au 7, NOVA au 9. Une nouvelle arme s’équipe automatiquement. L’arsenal permet de revenir aux précédentes. PETAL disperse du plasma ; les deux dernières armes accumulent une charge et infligent des dégâts de zone. Une charge partielle peut être relâchée ; maintenir tire à pleine puissance.
- Chaque arme possède sa propre batterie. ↻ ou R recharge ; maintenir le tir avec une batterie vide déclenche aussi la recharge. Les batteries se remplissent au début d’un niveau. Elles fournissent respectivement 12, 24, 10, 6 et 4 tirs. Les recharges prennent du temps ; leur progression se fige pendant la pause.
- Santé de 100 points, dégâts, vignette rouge et régénération à 18 points par seconde après 5 secondes sans dégât. Les huit murs supplémentaires arrêtent le déplacement, les attaques, les projectiles et les explosions. Les ennemis les contournent grâce à un champ de navigation partagé.
- Commandes ordinateur : ZQSD/WASD, flèches ou glisser pour viser, Espace pour tirer, R pour recharger, E pour changer d’arme, V pour la vue, Échap pour la pause, Maj pour courir. Trois contacts tactiles peuvent agir simultanément.
- VR casque : mode WebXR immersif prévu pour Meta Quest 3 et les manettes Touch Plus. La manette de tir se tient comme un pistolet : le canon suit la main, la gâchette tire, un laser et l’affichage des munitions sur l’arme aident à viser. Chaque bouton et chaque joystick des deux manettes a une fonction ; la main de tir, la rotation, la direction du déplacement, le laser et les vibrations se règlent avant d’entrer en VR. Les commandes détaillées sont ci-dessous. Un HUD dans la scène affiche santé, niveau, batterie, charge et aide ; les recharges, pauses et fins de partie sont accessibles avec les manettes.
- VR téléphone : deux caméras espacées de 64 mm, une image pour chaque œil. Utiliser un support VR en paysage. L’orientation utilise les capteurs après autorisation iOS ; sans capteurs, le joystick droit reste disponible. Une manette Bluetooth standard peut fournir déplacement, regard, tir, recharge et pause. Il ne s’agit pas d’une session immersive WebXR sous Safari iPhone.
- Réglages, sons synthétisés et record conservés sur l’appareil. Aucun compte ou serveur de jeu.

## Meta Quest 3 — commandes

Ouvrir l’adresse HTTPS du jeu dans **Meta Quest Browser**, choisir LYLU ou GHJU, cliquer sur **VR**, régler le pistolet si besoin, puis **Entrer en VR · Meta Quest 3** et autoriser la session immersive. Le casque suit les mouvements de tête ; le jeu utilise la vue FPS. Le mode téléphone à deux yeux reste distinct.

La disposition ci-dessous est celle de la **main de tir droite** (par défaut). Avec une main de tir gauche, tout est inversé : la gâchette gauche tire, X recharge, Y change d’arme, le joystick gauche tourne, le joystick droit déplace, A revient à l’arme précédente et B met en pause.

| Commande Touch Plus | Action |
| --- | --- |
| Manette droite (le pistolet) | Le canon suit la main et sert de visée, indépendamment du regard ; le laser et les tirs partent de la bouche du canon |
| Gâchette droite | Tir ; maintien pour charger THORN/NOVA, relâchement pour un tir partiel ; tir automatique à charge complète |
| Poignée droite maintenue | Laser renforcé. Le laser reste visible sans elle (réglable) ; tenir le pistolet poignée serrée n’empêche pas de courir |
| A | Recharger la batterie de l’arme actuelle |
| B | Arme débloquée suivante |
| Joystick droit gauche/droite | Rotation par crans de 30° ou 45°, ou fluide ; recentrer le joystick avant le cran suivant. Haut/bas : sans effet, pour qu’un cran ne change jamais d’arme par erreur |
| Clic du joystick droit | Afficher / masquer les commandes dans le casque |
| Joystick gauche | Déplacement horizontal, selon le regard ou selon la manette gauche |
| Clic du joystick gauche maintenu, ou poignée gauche serrée à fond | Courir |
| Gâchette gauche | Recharger sans lâcher le pistolet. Elle ne tire jamais et ne reprend jamais une pause |
| X | Arme débloquée précédente |
| Y | Pause / reprise |
| A en pause / fin de partie | Reprendre / rejouer la campagne |
| B en pause / fin de partie | Quitter la VR |

### Réglages du pistolet VR

Ils sont dans la fenêtre **VR** (avant d’entrer dans le casque) et conservés sur l’appareil : **main de tir** (droite ou gauche), **rotation** (crans de 30°, crans de 45° ou fluide), **direction du déplacement** (selon le regard ou selon la manette libre), **laser de visée** (toujours visible ou poignée maintenue) et **vibrations**. La liste des commandes de la fenêtre et du panneau dans le casque suit la main de tir choisie.

### Sensations de tir

Le pistolet recule à chaque tir et le canon se relève brièvement ; la direction du tir reste celle de la manette. Les vibrations dépendent de l’arme (R–9 sec, BLOOM léger, PETAL, THORN et NOVA de plus en plus marqués) et se renforcent pendant la charge. Un tir qui touche, une élimination, un changement d’arme, une recharge et un dégât ont chacun leur impulsion. Les munitions s’affichent sur la culasse du pistolet (rouge sous le quart de la batterie, « recharge » avec progression pendant la recharge, jauge de charge pour THORN et NOVA). L’autre main apparaît sous la forme d’un gantelet, pour voir où elle se trouve.

### Performances dans le casque

Le jeu demande 90 Hz. Si la moyenne des images sur deux secondes dépasse de 30 % le temps d’image visé, il pousse d’abord le rendu à fovéation maximale, puis descend à 80 puis 72 Hz, jamais en dessous. Les ombres ne sont recalculées qu’une image sur deux dans le casque et les modèles tenus en main n’en projettent pas. Les pièces statiques d’un monstre sont fusionnées en quelques maillages partagés par tous les monstres du même type, et les étincelles sont instanciées : une vague avancée demande de l’ordre de 30 % d’appels de dessin de moins qu’avant, pour un rendu identique. Le HUD plat et le radar ne sont pas recalculés dans le casque.

Les batteries restent propres à chaque arme ; une recharge prend du temps et bloque les tirs. Une recharge effective, un changement d’arme, une pause ou la perte du suivi de la manette de tir annule la charge. Il faut relâcher la gâchette avant de tirer après une de ces actions. Maintenir le tir avec une batterie vide conserve la recharge automatique existante. Aucune commande du jeu ne remplace les boutons système du casque.

La visée part de la bouche du canon suivie en 6DoF, sans modifier la perspective du casque. Le laser indique l’intersection la plus proche, même si elle est un mur. Passer physiquement la main à travers un mur ne permet pas de tirer derrière. Les vibrations sont optionnelles selon l’API du navigateur (`hapticActuators` ou `vibrationActuator`). La session se met en pause si le suivi de la manette de tir ou la visibilité immersive est perdu ; reprendre ensuite avec le bouton de reprise.

Le mapping correspond au [profil officiel Touch Plus](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/meta-quest-touch-plus/profile.json) et à la [norme WebXR Gamepads](https://immersive-web.github.io/webxr-gamepads-module/). La validation logicielle et les limites des essais sans casque sont documentées dans `VERIFICATION.md`.

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
| 1 | Aube | Combinaison ajustée, bottes et harnais satiné |
| 2 | Sentinelle | Plastron composite et cœur lumineux |
| 3 | Vigie | Épaulières, radio et insignes |
| 4 | Éclaireuse | Gantelets, scanner et écran de poignet |
| 5 | Rempart | Jambières, genouillères et ceinture à cellules laser |
| 6 | Spectre | Casque et visière panoramique |
| 7 | Valkyrie | Réacteur dorsal |
| 8 | Aurora | Protections de hanches et finitions champagne |
| 9 | Séraphine | Ailettes dorsales et balises lumineuses |
| 10 | Impératrice | Couronne, halo orbital et insignes de prestige |

Le bouton **Tenue**, disponible à l’accueil, dans le HUD et dans la pause, présente le personnage en 3D. Les dix étapes peuvent être prévisualisées et tournées de face ou de dos. L’aperçu fige la simulation, puis rétablit la tenue réellement gagnée, l’arme et la caméra au retour en jeu. Les commandes de l’atelier restent accessibles par défilement sur les petits écrans.

LYLU reçoit les mêmes pièces aux mêmes niveaux, avec les tenues Éclaireur, Atlas, Azur, Séraphin et Impérateur aux étapes 4, 7, 8, 9 et 10. Les insignes portent le nom du personnage choisi. Revenir à l'accueil conserve la tenue de la partie ; choisir l'autre personnage prépare une nouvelle campagne à la tenue Aube. La sélection reste sur l'accueil pour garder une campagne cohérente.

## Lancer

`python3 -m http.server 4173 --directory dist`, puis ouvrir `http://localhost:4173`. Sur iPhone ou casque, utiliser l’URL HTTPS du site. Le bouton VR explique les possibilités du navigateur et n’active pas un casque indisponible. Safari sous iOS 26 prend en charge WebGPU ; le secours WebGL2 reste disponible. Le mode paysage est recommandé.

## HTML autonome

`python3 tools/build-launcher.py /chemin/Pink_war.html` produit un seul HTML avec la simulation, le moteur 3D, les modes VR, les styles et l’icône intégrés. La génération utilise esbuild ; le jeu résultant ne charge aucun CDN ni fichier annexe. Le HTML peut être servi par HTTPS ou sur localhost. L’ouverture directe dans l’application Fichiers d’iOS dépend des restrictions de Safari et n’a pas été vérifiée. Les autorisations WebXR et capteurs restent celles du navigateur.

## Vérifier

`npm test` couvre la simulation, les commandes VR (dont la main de tir gauche, les modes de rotation, les vibrations et la cadence cible) et les réglages. Le parcours navigateur et ses limites matérielles sont consignés dans `VERIFICATION.md`. Les bibliothèques sont livrées localement ; Three.js est sous licence MIT, fournie dans `dist/vendor/LICENSE.three.txt`.

## Héberger sur Vercel

Créer un nouveau projet **pink-war-quest3** en important ce dépôt dans Vercel avec le préréglage **Other**. Le fichier `vercel.json` sert directement le dossier `dist`, sans installation ni compilation. La branche de production est `main`. Le site utilise HTTPS, nécessaire pour WebGPU, les capteurs et WebXR. Une fois le dépôt relié, chaque envoi sur `main` peut mettre à jour le jeu.
