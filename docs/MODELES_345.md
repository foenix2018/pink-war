# AÉGIS IV — armures progressives · 3.45

Base : `7e7a5f8ba3c3ee8c17a3f936f168bd15332178db` (production 3.44). Les armes, la visée, les machines N-08, le stand utilisateur et le niveau 1 de cette base sont conservés.

## Direction

GHJU conserve le rose nacré ; LYLU le bleu nacré. Combinaison technique sombre, casque fermé sans visage, coques métalliques ajustées, bords galbés, joints dégagés et module dorsal compact. Les nouveaux volumes sont originaux et construits sur le squelette RLH existant. Les gants approuvés conservent leurs géométries, textures et matériaux ; l’atlas des nouvelles inscriptions appartient uniquement aux coques d’armure.

Le starter est un équipement militaire complet, pas une tenue à compléter avant d’être utilisable. Les améliorations suivantes ajoutent des pièces visibles au lieu de simples bandes de couleur. Elles ne changent pas les dégâts, la santé ou les commandes.

## Dix paliers

| Niveau | Nom GHJU | Protections ajoutées |
| --- | --- | --- |
| 1 | Aube | Col en deux parties, torse, protection du bassin, bras, jambes et casque fermé ; nom du héros et numéro de série |
| 2 | Sentinelle | Trois lamelles abdominales et protections obliques sur les flancs |
| 3 | Vigie | Biceps galbés, talons et renforts de cheville |
| 4 | Éclaireuse | Coques d’avant-bras à double paroi, scanner encastré et renfort opposé |
| 5 | Rempart | Cuissards latéraux, hanches et joues de genouillères |
| 6 | Spectre | Module dorsal énergétique et ventilé, filtres du col et marquage AÉGIS IV |
| 7 | Valkyrie | Actionneurs des jambes, rails distincts sur cuisse et mollet |
| 8 | Aurora | Capteurs de tempe, communications arrière et cadre de visière |
| 9 | Séraphine | Épaulières à couches et brassards d’assaut |
| 10 | Impératrice | Renforts pectoraux, déflecteurs de hanche, protections dorsales et insignes de commandement |

LYLU garde les noms masculins déjà présents aux paliers 4, 7, 8, 9 et 10. L’Arène équipe automatiquement chaque palier avec la vague correspondante ; les vagues 11 à 20 conservent le palier 10. Le chapitre narratif 1 demeure au palier 1 : aucun chapitre supplémentaire ni gain fictif de niveau n’a été ajouté. Les dix équipements sont disponibles en aperçu dans Tenue et dans `/personnage.html`, avec leur description.

## Construction et raccords

- Les coques d’avant-bras sont des sections courbes fermées à double paroi, arrêtées avant le poignet. Leurs indices tournent vers l’extérieur, avec des retours sur les extrémités.
- Biceps, cuissards et tibias utilisent les positions réelles des os RLH. Les rails de l’exosquelette sont séparés au genou et à la cheville, chaque pièce suivant son segment.
- Les couches abdominales suivent les segments du torse ; la combinaison conserve son mélange de poids de peau. Épaulières sur les bras, capteurs sur la tête, module dorsal sur Spine2.
- Les boucles et attaches très fines utilisent un profil chanfreiné plus léger. Le budget libéré sert aux protections nouvelles.
- Un atlas local 512 × 512 réunit le grain du métal et les inscriptions LYLU/GHJU/AÉGIS IV. Les UV de grain restent dans leur tuile ; les inscriptions conservent leur propre région après cuisson de la géométrie.
- Chaque niveau est mis en cache par silhouette. Tous les acteurs partagent ces géométries mais gardent leur propre squelette. Revenir à un palier réutilise ses géométries et retire les anciennes peaux de la scène.

## Budget mesuré

Sept peaux par armure, même au niveau 10 ; aucune pièce supplémentaire ne nécessite un appel de rendu individuel. Valeurs identiques pour les deux silhouettes :

| Palier | Pièces | Triangles |
| --- | ---: | ---: |
| 1 | 144 | 15 674 |
| 2 | 151 | 16 346 |
| 3 | 159 | 16 978 |
| 4 | 165 | 17 898 |
| 5 | 171 | 18 442 |
| 6 | 182 | 19 132 |
| 7 | 196 | 20 044 |
| 8 | 204 | 20 580 |
| 9 | 212 | 21 692 |
| 10 | 220 | 22 344 |

Ces nombres concernent l’armure et la combinaison, sans armes ni gants. La tenue de départ 3.44 comptait 19 224 triangles. Ce budget ne constitue pas une mesure de fréquence d’images sur casque ou téléphone.

## Validation

`npm test` : **309 tests réussis**. Les cinq nouveaux contrôles vérifient les vingt variantes, la croissance réelle de géométrie, les sept lots, tous les poids et indices de peau, les ancrages gauche/droite, les positions animées, le maintien des clips source, le cache multi-acteurs et la séparation des matériaux de gants.

Captures et contrôle du rendu réel dans Chromium WebGL logiciel : paliers 1/5/10 des deux héros, dos, gros plan des marquages, Idle Rifle, Rifle Walk et accroupissement. Vérification des événements de progression en jeu, retour au niveau réellement gagné après un aperçu Tenue et lancement Histoire avec profil iPhone simulé. Les captures de `/evolutions.html` proviennent de ces modèles interactifs ; ce ne sont pas des concepts illustrés.

Le HTML autonome 3.45 a aussi été lancé avec toutes les requêtes externes annulées : armure AÉGIS IV, cinq armes locales, 25 textures de décor, huit ennemis et passage en troisième personne vérifiés. Les textures locales de repli permettent le démarrage lorsque Poly Haven ne répond pas.

Pas de test sur iPhone, DualShock Mac ou Quest 3 physique pour cette version. L’avatar complet demeure masqué en VR et en FPS ; cette étape n’ajoute pas d’avant-bras artificiels ni de corps forcé dans le casque. Les nouveaux équipements sont visibles à l’accueil, en troisième personne et dans l’atelier.
