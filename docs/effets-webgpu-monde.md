# Effets de monde en WebGPU

Le libellé du moteur utilise désormais son backend réel. Un WebGPURenderer qui s'est replié sur WebGL2 est indiqué « WebGL 2 », au lieu d'être annoncé comme WebGPU. L'initialisation signale également ce repli. Les indicateurs des missions, de l'arène, de la forêt et des outils utilisant le moteur partagé suivent cette règle.

`webgpu-world-fx.js` regroupe les nouveaux matériaux et effets. Le chemin WebGPU natif dispose de :

- Hologrammes et scanners animés en TSL, avec balayage, interférences, décalage de projection et bords atténués : enclave et tour M02, scanners de M04.
- Eau de Ligne 9 avec petites ondulations géométriques, normales procédurales, réfraction et reflet de la scène. Le niveau de l'eau, le pompage et la montée des eaux gardent leur contrôle de scénario. Une seule surface de reflet suit le plan d'eau le plus proche ; les autres gardent leur matériau et leur animation.
- Flaques de M02 et de l'arène avec reflet de la vraie scène, au lieu d'une seule tache lumineuse préfabriquée.
- Vapeur et brume M02/arène en volumes ellipsoïdaux. Le shader intègre la densité le long du rayon de vue et la profondeur opaque limite la partie visible devant les murs.
- Faisceaux des projecteurs de l'arène en volumes alignés avec la lumière, indépendants de l'orientation de la caméra.

La capture du reflet réutilise les géométries et transformations réelles des éléments proches, y compris les panneaux holographiques texturés. Elle omet les volumes coûteux et les objets attachés à la caméra ; elle ne reproduit pas intégralement l’éclairage et tous les objets lointains de la scène.

Les effets utilisent les matériaux standard et les formes existantes sur WebGL. Les choix de compatibilité iPhone et VR sont conservés ; la bibliothèque Three embarquée ne prend pas en charge XR avec son backend WebGPU.

## Budget et ressources

Un reflet planaire au plus par scène concernée, limité à 96 objets proches et 100 000 triangles, avec matériaux de capture simplifiés, à 25 % de la largeur et de la hauteur du rendu principal, sans rebonds entre miroirs. Les matériaux de volumes identiques et la géométrie sont partagés. L'intégration utilise dix échantillons en qualité normale, six en qualité réduite ; cette dernière désactive les reflets et la réfraction. Seuls six faisceaux proches sont visibles en qualité normale dans l'arène, trois en qualité réduite. Les volumes de brume sont masqués à distance. Aucun éclairage dynamique supplémentaire n'est créé par ces shaders.

Les caméras de reflet contiennent uniquement les informations de caméra. La copie récursive de la caméra du joueur copiait ses armes et leurs métadonnées, jusqu'à faire échouer la préparation du premier rendu M02. Cette copie est supprimée et un test couvre les métadonnées circulaires et les modèles attachés. Les armes portées sont masquées pendant la seule passe de reflet, puis rétablies.

## Validation

58 contrôles ciblés réussis : matériaux natifs et standard, des ressources partagées, des budgets, de l'orientation des faisceaux, du backend réel et de la caméra de reflet. Non-régression des escaliers M02 à faible cadence, des pickups, des portes, de l'enceinte, des tourelles, des portails et du scénario M04.

Les neuf contrôles de Ligne 9 passent, y compris le pompage, le parcours complet, l'évacuation et la reprise après défaite. Cette suite a pris environ 201 s dans l'environnement de test ; elle n'est pas une mesure de performances graphiques.

Une scène de vérification contenant eau, hologramme, obstacle et vapeur a été rendue en WebGPU natif : reflets visibles, animation différente entre deux instants, aucune erreur de shader. Le libellé de repli a aussi été reproduit dans Chromium avec le véritable renderer Three en backend WebGL2 et affiche désormais « WebGL 2 ».

Le niveau M02 en WebGL a conservé ses 18 montées par les commandes de production : trois escaliers à 20, 30 et 60 images/s, en marche et course. Aucune perte d'appui ni erreur JavaScript observée. Les requêtes externes refusées dans le navigateur proviennent du réseau de la machine de test.

Le niveau M02 complet a démarré et terminé son premier rendu en WebGPU natif avec les effets actifs : huit volumes de rue, six volumes de l’extension, une passe de reflet à résolution réduite. Aucune erreur JavaScript ni de shader après correction de la caméra de reflet.

Ces contrôles ne remplacent pas une mesure des performances sur un téléphone ou un casque réel.
