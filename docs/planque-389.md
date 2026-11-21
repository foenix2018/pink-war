# Pink Wars 3.89.0 — La Planque

Un refuge 3D original modélisé dans Blender reprend la disposition de l’image fournie : dortoir GHJU rose / LYLU bleu, salle de bain, grande baie sur Vesper, livre ouvert des archives, mur d’armes, tenues, salon, recharges GAB-1 / CAR-14, atelier avec bras robot et porte de mission.

## Livrables et construction

- Projet éditable : `assets/hideout/PinkWars_Planque.blend`. Copie téléchargeable : `dist/assets/hideout/PinkWars_Planque.blend`. Textures et police intégrées au fichier.
- 152 objets, 108 maillages, collections sémantiques pour les pièces, architecture, équipements, toiture et Vesper. Unités métriques. Les néons sont des tubes avec supports et connecteurs.
- Pipeline : `blender --background --threads 8 --python tools/blender/hideout.py -- --render`. Sans `--render`, le modèle et les fichiers du jeu sont reconstruits sans recalculer l’illustration. `--glb` produit aussi un échange GLB dans le dossier source.
- La scène est évaluée dans Blender, puis regroupée par matériau dans `planque.pwm.gz`. Elle contient 274 402 triangles et 24 lots, dont deux sont cachés dans la vue d’ensemble. Géométrie compressée : 3 686 134 octets ; le `.blend` est un téléchargement optionnel.
- Le rendu du panorama de Vesper est également produit dans Blender. Le décor extérieur éditable est conservé dans sa collection ; son panorama est placé derrière le vitrage pour la vue en coupe. Les cartes métalliques et béton proviennent des ressources CC0 déjà présentes dans Pink Wars.
- `layout.json` exporte les mêmes dimensions, 61 volumes de collision et neuf points d’interaction. Le toit et les murs hauts restent cachés dans la vue en coupe, puis sont affichés dans la visite en première personne.

## Utilisation dans le jeu

**Accueil → LA PLANQUE** ouvre le refuge librement, avec le personnage choisi. Le lien de fin de chapitre mène aussi au refuge, où la porte permet de repartir. Le choix des prisonniers ou des archives du chapitre 2 est conservé avant la transition. Les fins M01 à M07 sont raccordées ; les cinématiques restent en place.

Cliquer une pièce fait marcher le personnage par une route qui évite le mobilier. ZQSD / WASD, flèches et joystick permettent aussi le déplacement. F ou la commande d’interaction de la manette ouvre la station proche. La vue d’ensemble se zoome à la molette ou avec deux doigts ; **Visiter** ouvre une vue intérieure avec rotation à la souris, au swipe ou au stick droit. Les armes ne tirent pas dans le refuge.

- **Mur d’armes** : sélection parmi les armes réellement possédées. La tenue principale et les restrictions propres à GHJU/LYLU sont conservées. VOLTIS IEM reste réservé au chapitre 10 dans le scénario.
- **Atelier** : réutilisation du véritable système de plans et nanoparticules de la version 3.88. Les coûts, améliorations et configurations s’appliquent aux armes et équipements de la campagne. Pas de réserve d’essai offerte dans la planque.
- **Tenues** : les modules débloqués du personnage peuvent être préparés. Le niveau visuel choisi est appliqué au modèle authentique en mission.
- **Dortoir / salle de bain** : séquence de repos, santé et bouclier rétablis.
- **Bornes GAB-1 / CAR-14** : recharge du bouclier, des munitions et des charges.
- **Livre de l’Histoire** : récapitulatifs des chapitres terminés uniquement, avec le choix du chapitre 2. L’ancien avancement du jeu est repris lors de la première visite.
- **Porte Mission** : prochaine destination recommandée, ou retour libre vers un chapitre jouable. Le chapitre 7 reste l’exploration sans armes déjà présente dans le jeu.

## Sauvegarde et continuité

Les profils `pink-wars-hideout-v1-ghju` et `pink-wars-hideout-v1-lylu` sont séparés. Ils conservent le journal, l’inventaire rapporté, l’arme et la tenue préparées, l’état de récupération et la prochaine destination. Ils ne remplacent pas les profils de nanoparticules.

La préparation est appliquée au premier pas de simulation de la bonne mission, après l’initialisation de son checkpoint, puis consommée. Un profil de LYLU, une autre mission, l’arène ou la planque ne peuvent consommer celui de GHJU. La fabrication ne contourne pas les restrictions d’arme. En cas d’échec d’écriture, la porte reste ouverte dans la planque avec un message permettant de réessayer.

## Fluidité et validation

La vue orthographique du refuge active explicitement l’adaptation de résolution du jeu ; les vues orthographiques des autres rendus conservent leur comportement. Sur téléphone et profil économique, les textures restent présentes et les microreliefs coûteux sont désactivés. Les vitesses de déplacement, animations, glissade et jetpack des niveaux ne sont pas modifiés.

- Réouverture du `.blend` dans Blender 4.3.2 : scène métrique, trois images et une police embarquées, collections et toiture vérifiées.
- WebGPU natif : le vrai maillage Blender et ses matériaux s’affichent en 23 appels de dessin dans la vue d’ensemble de contrôle, sans erreur JavaScript.
- Suite finale ciblée : **129 tests réussis**, incluant les capacités communes, le décor du niveau 6 et la résolution adaptative.
- Tests de simulation : toutes les stations accessibles avec la capsule réelle ; routes sans traversée de meubles ou de murs ; sauvegarde, santé, équipement, restrictions et profils séparés.
- Navigateur : PC et iPhone émulé, interface de repos, armes, fabrication, tenue, archives, recharge et départ ; préparation vérifiée dans le vrai niveau 3. Une première marche est faite avec l’interface ; les déplacements suivants du contrôle sont accélérés par téléportation de diagnostic. Les trajets complets sont également parcourus dans les tests de simulation.
- Contrôles supplémentaires : accès depuis l’accueil, vue intérieure complète, déplacement et swipe, remise en coupe et lien de débriefing.
- Les cinq mises à jour reçues avant publication, jusqu’à `d55dd09`, sont conservées : capacités communes et améliorations du niveau 6.

Preuves et captures : `/workspace/livraison/pink-wars-planque-20261121/`. Les contrôles de navigateur utilisent Chromium et des entrées simulées ; aucun iPhone ou casque physique n’a été mesuré. L’interface de la planque est une interface écran ; la visite immersive WebXR du refuge reste distincte de cette version.
