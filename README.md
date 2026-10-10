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
- VR casque : mode WebXR immersif prévu pour Meta Quest 3 et les manettes Touch Plus. Déplacement selon le regard, rotation par crans de 30°, arme dirigée par la manette droite, gâchette pour tirer et poignée pour le laser de visée. Les commandes détaillées sont ci-dessous. Un HUD dans la scène affiche santé, niveau, batterie, charge et aide ; les recharges, pauses et fins de partie sont accessibles avec les manettes.
- VR téléphone : deux caméras espacées de 64 mm, une image pour chaque œil. Utiliser un support VR en paysage. L’orientation utilise les capteurs après autorisation iOS ; sans capteurs, le joystick droit reste disponible. Une manette Bluetooth standard peut fournir déplacement, regard, tir, recharge et pause. Il ne s’agit pas d’une session immersive WebXR sous Safari iPhone.
- Réglages, sons synthétisés et record conservés sur l’appareil. Aucun compte ou serveur de jeu.

## Meta Quest 3 — commandes

Ouvrir l’adresse HTTPS du jeu dans **Meta Quest Browser**, choisir LYLU ou GHJU, cliquer sur **VR**, puis **Entrer en VR · Meta Quest 3** et autoriser la session immersive. Le casque suit les mouvements de tête ; le jeu utilise la vue FPS. Le mode téléphone à deux yeux reste distinct.

| Commande Touch Plus | Action |
| --- | --- |
| Joystick gauche | Déplacement horizontal selon le regard |
| Clic du joystick gauche maintenu | Courir ; désactivé pendant la visée précise |
| Mouvement de la manette droite | Viser avec le canon, indépendamment du regard |
| Poignée droite maintenue | Afficher un rayon et un repère de visée ; ils s’arrêtent aux murs et aux ennemis |
| Gâchette droite | Tir ; maintien pour charger THORN/NOVA, relâchement pour un tir partiel ; tir automatique à charge complète |
| Joystick droit gauche/droite | Rotation de 30° ; recentrer le joystick avant le cran suivant |
| A | Recharger la batterie de l’arme actuelle |
| B | Arme débloquée suivante |
| X | Arme débloquée précédente |
| Y | Pause / reprise |
| Clic du joystick droit | Afficher / masquer les commandes dans le casque |
| A en pause / fin de partie | Reprendre / rejouer la campagne |
| B en pause / fin de partie | Quitter la VR |

Les batteries restent propres à chaque arme ; une recharge prend du temps et bloque les tirs. Une recharge effective, un changement d’arme, une pause ou la perte du suivi de la manette droite annule la charge. Il faut relâcher la gâchette avant de tirer après une de ces actions. Maintenir le tir avec une batterie vide conserve la recharge automatique existante. Aucune commande du jeu ne remplace les boutons système du casque.

La visée part de la bouche du canon suivie en 6DoF, sans modifier la perspective du casque. Le laser indique l’intersection la plus proche, même si elle est un mur. Passer physiquement la main à travers un mur ne permet pas de tirer derrière. Les vibrations de tir, de recharge et de dégâts sont optionnelles selon l’API du navigateur. La session se met en pause si le suivi droit ou la visibilité immersive est perdu ; A/Y permet de reprendre après rétablissement.

Le mapping correspond au [profil officiel Touch Plus](https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/meta-quest-touch-plus/profile.json) et à la [norme WebXR Gamepads](https://immersive-web.github.io/webxr-gamepads-module/). La validation logicielle et les limites des essais sans casque sont documentées dans `VERIFICATION.md`.

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

`npm test` couvre la simulation et les commandes VR. Le parcours navigateur et ses limites matérielles sont consignés dans `VERIFICATION.md`. Les bibliothèques sont livrées localement ; Three.js est sous licence MIT, fournie dans `dist/vendor/LICENSE.three.txt`.

## Héberger sur Vercel

Créer un nouveau projet **pink-war-quest3** en important ce dépôt dans Vercel avec le préréglage **Other**. Le fichier `vercel.json` sert directement le dossier `dist`, sans installation ni compilation. La branche de production est `main`. Le site utilise HTTPS, nécessaire pour WebGPU, les capteurs et WebXR. Une fois le dépôt relié, chaque envoi sur `main` peut mettre à jour le jeu.
