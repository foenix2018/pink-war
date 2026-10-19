# La Brèche Violette — 3.49

Nouveau Level 1 accessible via Histoire. L'ancien niveau reste intact dans campaign-level1.js et campaign-art.js ; seuls les imports actifs changent.

Six secteurs reliés dans une base industrielle ouverte au ciel, 54 × 180 m, relief rocheux extérieur, structures métalliques, signalétique bleue et réacteur violet visible sur l'axe. Hangar avec deux sentinelles ; tunnel couvert et passerelle à 4 m ; trois adversaires dans les passages ; cour avec sept adversaires et deux relais ; gardien blindé et trois stabilisateurs ; portail d'extraction. Deux caches d'armes et de soins. Après mort, le bouton rejouer reprend au dernier checkpoint de la partie (après hangar ou avant réacteur). Une nouvelle partie depuis l'accueil recommence à l'arrivée.

Les stabilisateurs se sabotent à portée avec l'interaction habituelle ou se détruisent par quatre impacts laser. Le gardien est invulnérable avant la neutralisation des trois stabilisateurs. Géométrie et collisions partagent le même plan ; pente et plateforme partagent les hauteurs de la physique. Décors statiques regroupés par matériau et géométrie en InstancedMesh.

Validation : tests Node de progression des six étapes, interactions, invulnérabilité, extraction, reprise, continuité de la pente et dégagement des objectifs. Suite existante également exécutée. Aucun navigateur de QA compatible disponible : rendu, confort Quest, performances sur iPhone et durée cible 12–15 minutes non validés. Cette version est une première réalisation jouable, pas une reproduction photoréaliste des images de référence. Éclairage procédural, sans baking ; pas encore de streaming par secteur, sirène dédiée, fumée volumétrique ni Level 2.


## Révision 3.49

Cinq familles de textures locales 512², relief par bump mapping et UV à échelle métrique. Métal rayé, parois jointées, sol à chevrons, caisses nervurées et rochers. Pont roulant, chariot élévateur, cargaisons, fûts, générateurs, armoires, ventilation, conduites, marches antidérapantes et cadre d’extraction. Dix accessoires avec collisions partagées ; dix lots statiques ; scène de décor d’environ 13 190 triangles.

Chaque groupe arrive maintenant par des portails physiques, ouverts 1,6 seconde avant la première sortie ; espacement des arrivées d’au moins 1,35 seconde, maximum cinq adversaires actifs, blocage si le point de sortie est occupé. Aucun ennemi créé instantanément au changement de secteur, gardien compris. Les objectifs attendent aussi les adversaires encore en transit. Les points de reprise rétablissent la séquence de portail. Les portails de renfort se referment après le dernier passage ; celui d’extraction reste ouvert.

Vérification : quatre tests ciblés de mission et de portails, suite complète, construction/déchargement de la scène avec Three.js. Rendu navigateur et essais sur casque toujours non validés.


## Correctif 3.50 — dégâts du gardien et cibles des stabilisateurs

Reproduction avec les vrais tirs R9 : cinq châssis ordinaires éliminables en 3 à 7 impacts au torse dans la fixture. En revanche le gardien rejetait tout dégât avant les stabilisateurs ; les modules lumineux hauts ne recevaient aucun impact, leur géométrie n'ayant pas de collision à 2,5 m. Les deux blocages sont reproduits par des tests qui échouaient avant la correction.

Le gardien dispose désormais de 360 PV et d'une réduction de dégâts maximale de 55 %, réduite à chaque stabilisateur neutralisé (0 % après le troisième). Les dégâts restent toujours possibles, y compris sans toucher aux stabilisateurs. Une indication explique le blindage lorsqu'il est touché. L'extraction demande encore la neutralisation des trois stabilisateurs. Les modules hauts ont des collisions alignées sur leur géométrie et se désactivent après quatre impacts ; ils changent aussi de couleur. L'interaction de proximité reste disponible.

Tests de projectiles : cinq types ordinaires, dégâts du gardien avec et sans blindage, destruction de chacun des trois modules hauts, élimination complète du gardien au R9 avec rechargements même sous blindage. Pas de validation visuelle navigateur ou casque disponible.


## Révision 3.51 — collisions et volumes

Les grands conteneurs et plafonds participent à la physique verticale de la campagne : atterrissage sur les dessus, arrêt des sauts sous les plafonds. Collisions ajoutées aux piliers et à la couronne basse du réacteur, montants de sortie, fourches du chariot et cages des stabilisateurs. Les deux cloisons qui coupaient la passerelle sont ouvertes à son gabarit ; une rampe de descente rejoint la cour. Platelages et garde-corps des deux rampes ont une collision. Le portail du gardien est déplacé à z=-67 pour éviter le pilier désormais solide.

Réduction de l'aspect cubique : 257 pièces chanfreinées, générateurs cylindriques, roues et moyeux, brides, colliers, câbles courbes, cadres obliques, plaques superposées, rochers plus lisses. Les arêtes sont calculées en mètres avant fusion des maillages ; les UV suivent les dimensions. Les décors reçoivent et projettent désormais les ombres lorsque le profil graphique les active — ils ne le faisaient pas auparavant. Dix lots statiques et environ 69 000 triangles avant les personnages ; ce n'est pas une certification de rendu AAA.

Tests : collision des piliers/montants/fourches, atterrissage sur un conteneur de 3 m, arrêt contre le plafond du tunnel, parcours physique complet de la passerelle depuis le hangar jusqu'à la cour. Conservation des tests de dégâts, stabilisateurs et portails. Le rendu visuel et les performances sur appareils physiques restent à vérifier, faute de navigateur de QA et de casque disponibles.


## Révision 3.52 — visée écran et pas de surface

PC et tactile : assistance de direction des projectiles dans un cône étroit de 1,4° à la souris et 2,2° au tactile, correction plafonnée à 0,28° / 0,45° par tir. Elle conserve un tir déjà aligné, exige une ligne de vue depuis la caméra et la bouche de l'arme, et ne s'applique pas au casque ou au sabre. Pas de déplacement automatique de caméra ni de verrouillage de tête.

Tir écran : réduction progressive du FOV de 4,5 % au maximum et rapprochement de l'arme de 1,8 cm. Le supplément diminue pendant une visée optique et s'efface au relâchement/rechargement. Les six armes utilisent la même transition ; les vues XR et stéréoscopiques restent inchangées.

Pas : neuf courts échantillons mono PCM 22,05 kHz (environ 71 Ko en tout), trois variantes pour métal, béton et adaptation tarmac. Crédits complets et licences dans dist/audio/footsteps/PROVENANCE.md, accessibles depuis l'aide. Les fichiers proviennent de Footsteps on different surfaces (congusbongus), avec enregistrements Eelke, swuing et Ali_6868. La variante tarmac est un mix adapté de béton et de gravier. Les sons suivent la distance réellement parcourue, le contact au sol et la surface sous les pieds, avec variation de hauteur et de volume ; pause, mute et saut les arrêtent. Le niveau distingue désormais aussi visuellement ses sols béton, tarmac et métal. Chargement audio en arrière-plan et secours synthétique en cas d'échec.

Tests ciblés : limites de correction, cible masquée depuis la caméra ou le canon, tir déjà aligné, FOV, identification des sols et passerelles, décodage/lecture/arrêt des neuf fichiers et absence de pas à l'arrêt/en saut. Pas d'essai auditif sur iPhone physique ou de validation navigateur disponible.


## Direction 3.53 — station de transfert abandonnée

Les six secteurs ont désormais un rôle identifiable : inspection des transports, atelier de drones, maintenance informatique, distribution électrique, confinement du réacteur et évacuation. Dix-neuf ensembles d'équipement s'ajoutent aux dix accessoires précédents : consoles avec clavier et siège, capsule de transfert, établi avec drone démonté, batteries, serveurs, outils, radiateurs, antenne, réservoir de refroidissement et réserves de secours. Trente tracés de câbles relient les équipements aux chemins techniques et aux objectifs.

Les gros titres et panneaux de mission flottants sont supprimés. Douze petites plaques sont appuyées sur des supports réels. Seize écrans sont intégrés aux ordinateurs, bornes d'inspection et coffrets ; ils affichent une télémétrie actualisée et l'état des relais/stabilisateurs. Quatre ordinateurs peuvent être consultés avec F, le bouton contextuel ou le clic du joystick libre. Ils donnent des indices, sans remplacer les objectifs ni accorder d'invulnérabilité.

L'architecture gagne un sas d'inspection visible dès le départ, des toitures segmentées sur l'atelier, un local de maintenance couvert, des cloisons à panneaux techniques et des cadres d'évacuation. La vue axiale sur le réacteur est dégagée par la rotation des piliers ; son énergie est texturée, animée et entourée de filaments. Effets bornés : douze sprites de vapeur près des fuites, trente-six particules d'étincelles à une jonction abîmée, poussière et neuf marques de chauffe. Deux petites lumières de travail sont actives à proximité. La machinerie sonore suit maintenant les installations de la station, le vent s'atténue sous les toitures et une alarme discrète accompagne l'extraction.

La géométrie représente environ 124 000 triangles de décor en 28 lots statiques, auxquels s'ajoutent les éléments animés. Les tests vérifient la mission, les consultations, la passerelle et les emplacements de revue avec les collisions du décor complet. La planche `dist/evolutions/breche-violette-353.jpg` est une étude produite hors navigateur à partir de ces maillages et des dessins des textures : elle sert à la composition, et ne constitue pas une capture du jeu ni une validation WebGL/WebXR. Le rendu Three.js final, la lecture des effets en mouvement et les performances matérielles restent à tester.


## V3.54 — Ombres
Ombres directionnelles désormais actives sur téléphone en auto/haute qualité (512², fenêtre locale de 32 m). PC : 1024² en auto, 2048² en haute qualité, fenêtre de 48 m, calée sur les texels. Lumière ambiante réduite pour rendre les ombres lisibles. Ombres de contact à bords doux sous les équipements au sol et les acteurs dans tous les profils, y compris bas/compatible. Deux pools instanciés, aucun éclairage supplémentaire. Les contacts suivent le sol et les passerelles, se dilatent en saut et disparaissent en altitude. Validation physique iPhone/Quest et rendu navigateur non effectués.
