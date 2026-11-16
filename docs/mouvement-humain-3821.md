# Pink Wars 3.82.1 — appuis et déplacements latéraux

Le retour sur la 3.82.0 signalait une impression de boiterie et des déplacements latéraux étranges. Le défaut venait surtout de la couche d'appui ajoutée aux animations, et non de l'absence de squelette.

## Correction

- Suppression de la déformation des pieds d'une marche avant pour simuler le côté et le recul. Elle remplaçait les contacts calculés et déclarait les deux pieds non plantés dans ces directions. Toutes les directions utilisent maintenant les mêmes contacts en coordonnées du monde, sur les surfaces physiques.
- La marche utilise un appui de 54 % du cycle par pied, avec un transfert où les deux pieds sont au sol. L'ancienne formule descendait sous 50 % et créait une suspension pendant la marche. La course conserve ses phases de suspension.
- Foulées plus courtes, levée des bottes réduite et départ du pied gauche en premier pour un déplacement vers la gauche. Le point de réception est fixé au début du pas ; sa poursuite pendant la récupération ajoutait une accélération au changement de direction.
- La destination du pied reste du bon côté de la botte d'appui. Cela corrige aussi le croisement possible à la réception d'un pas après un changement de direction. La phase du décollage et l'achèvement de la récupération ne dépendent plus de l'instant où une image franchit leur limite.
- Le bassin anticipe l'allonge nécessaire à l'ensemble du pas. Il ne descend plus seulement lorsque la jambe en appui arrive déjà en limite d'extension, ce qui créait un affaissement puis une remontée. La réserve de flexion et les corrections de terrain restent actives.
- Vitesse latérale normale : **1,65 m/s**, contre 1,98 m/s. Le sprint latéral est plafonné à **2,2 m/s**. Marche avant 2,2 m/s, course avant 4,8 m/s et recul normal 1,65 m/s conservés. Même règle de déplacement pour la forêt et les niveaux partagés.

La bibliothèque humaine Quaternius CC0 et l'adaptation au torse, à la tête et aux bras de la 3.82 restent en place. Le bassin, les jambes et les prises des armes gardent leur squelette canonique ; les appuis sont résolus par la cinématique inverse du jeu. Il ne s'agit pas d'un nouveau téléchargement de mouvements latéraux Mixamo. Les poses suivies des contrôleurs Quest ne reçoivent pas cette animation corporelle synthétique.

## Vérification

Les nouveaux contrôles observent les vrais sommets des bottes et la hauteur du bassin pour GHJU et LYLU à 30, 60 et 120 Hz : avant, arrière, côtés et diagonale. Ils vérifient un appui à chaque image de marche, la stabilité de la botte plantée à moins de 3 mm, le partage des appuis entre les jambes et l'absence de compression répétée du bassin. Les fenêtres de double appui et les comptes par pied tiennent compte de la résolution temporelle : à 30 Hz, une fenêtre courte peut tomber entre deux images.

Le test historique de continuité utilise maintenant les vitesses réelles et l'intégration inertielle du contrôleur, plutôt qu'une vitesse artificielle de 3,2 m/s avec des inversions instantanées. Sa limite de vitesse de cheville est passée de 4,5 à 9 m/s, comme dans la suite des sauts, et celle d'accélération de 130 à 200 m/s² : une récupération avec un pied réellement immobilisé pendant plus de la moitié du cycle doit être plus rapide que le déplacement du corps. Ce sont des garde-fous contre les discontinuités, pas une mesure de réalisme biomécanique. Les nouveaux contrôles d'appui, de dérive et d'équilibre complètent ces bornes.

Le pilote de la campagne simulée prédisait encore une esquive à 10 m/s. Son calcul des trajectoires entrantes utilise maintenant les vitesses réellement disponibles, y compris le plafond latéral. Les dégâts, les tirs ennemis et les points de vie ne sont pas modifiés. La campagne atteint toujours 20 vagues et 670 éliminations par projectiles.

Un comparatif dans Chromium utilise les modèles réels, avec une caméra qui suit leur translation et une grille fixe au sol : marche avant, déplacement à gauche et déplacement à droite. La version avant est rendue avec les deux anciens modules de locomotion, la version après avec les modules corrigés. Ce banc utilise SwiftShader et ne constitue pas une mesure de performance matérielle iPhone ou Quest.

Résultats : **88 contrôles passants** — 43 pour les pas, les nouveaux appuis directionnels et les règles de combat (campagne de 670 éliminations comprise) ; 45 pour les sauts, les semelles sur les rampes et ascenseurs, les sources d'animation, la traversée, les règles FPS et l'alignement des armes Quest. La syntaxe des scripts modifiés et les en-têtes de revalidation des modules distribués sont également vérifiés.

Onze contrôles supplémentaires passent pour les parcours M03 complets de GHJU et LYLU et la cohérence des collisions des trois premiers niveaux, soit **99 contrôles passants au total**.
