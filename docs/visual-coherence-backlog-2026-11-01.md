# Pink Wars — audit visuel et cohérence 3D (chantier non livré)
Date : 2026-11-01
Branche : `feat/visual-coherence-hard-surface-pass-20261101`
Base : `939f84e060316d36303322778c466b5c6bf15f1b`
**Ne pas fusionner dans main, ne pas déployer et ne pas publier les aperçus sans validation explicite.**

## Principes
- Conserver les héros GHJU et LYLU, leurs casques et coloris canoniques ; préserver GAB-1/CAR-14.
- Toutes les améliorations modifient les maillages et matériaux du jeu, pas de rendus 2D substitués aux véritables objets 3D.
- Respecter le gameplay : zones de collision, dégagements, états de portes, visée et animations ne sont pas déduits des accessoires purement visuels.
- Triangle budget et matériaux mutualisés, notamment pour Dell / Équilibré+, Quest 3 autonome et iPhone.
- Privilégier WebGPURenderer quand possible avec repli WebGL sur plateformes incompatibles. Ne jamais inventer une prise en charge GPU.
- Zéro modification de production avant la revue visuelle, les tests et la validation utilisateur.

## Corrigé sur branche (non livré)
- M01 / Caserne AEGIS 07 : remplace silhouettes de cubes VSAV 07 et FPT 07 par châssis de secours métriques ; cabine distinguable, pare-brise incliné, rétroviseurs, roues avec jantes et moyeux, garde-boues, compartiments FPT, échelle, raccords arrière, portes VSAV, décorations. Géométrie regroupée par matériau ; collider d'origine inchangé (`rescue-vehicle-detail.js`, `m01-extension-art.js`).
- M02 / District : remplace bornes simplifiées et groupes électrogènes parallélépipédiques par ensembles à géométrie détaillée, raccords de tuyau, capot, ventilateur, prises, panneaux, grilles, évacuation ; rendu statique fusionné (`district-utility-details.js`, `level2-architecture.js`).
- M02 : remplace les octaèdres flottants utilisés comme luminaires par appareils d'inspection avec boîtier, armature et lentille ; aucune lumière GPU ajoutée.
- Tests dédiés ajoutés pour géométrie, proportions et cohérence avec les volumes de collision (`tests/379-world-hard-surface-coherence.test.mjs`).

## Deuxième passe : mobilier, accessoires et cohérence (non livrée)
- Nouveau module `realistic-furniture.js` : remplace les comptoirs du hall et des marchés, bureaux, bancs, casiers, vitrines, rangements archivistiques et meubles techniques par des structures avec pieds, panneaux, portes orientées selon les murs, tiroirs, niches et assemblages PBR mutualisés. Lits de campagne médicaux du district : cadre métallique, barre latérale, roulettes, matelas, oreiller, couverture pliée en véritable maillage.
- `station-equipment-detail.js` : rack ARI reconstruit avec bouteilles, robinets, manomètres et sangles ; couronnes DN45 réalistes et raccords métalliques dans la remise. Évite les doublons de ferrures issus des anciens accessoires.
- `civil-vehicle-detail.js` : voiture abandonnée de la cour dotée d'une vraie silhouette profilée, vitres, portes, rétroviseurs, phares, roues et jantes, au lieu d'un empilement de boîtes.
- `district-utility-details.js` : climatiseurs et refroidisseurs reconstitués avec grilles, doubles ventilateurs et trappes, au lieu de volumes bruts.
- `supply-cache-details.js` : remplace les gemmes octaédriques des cachettes M01 par un kit médical ou une cartouche d'énergie lisibles. La récupération supprime et libère l'asset temporaire.
- `level2-architecture.js` : comptoirs orientés côté piétons, couchages médicaux à l'emplacement d'origine. Les bacs de culture `bed` de la serre M01 sont explicitement conservés comme éléments horticoles, pas confondus avec les couchages.
- Nouvelles régressions à vérifier après publication autorisée : `tests/380-furniture-and-world-realism.test.mjs`, en complément de `tests/379-world-hard-surface-coherence.test.mjs`. Les tests de géométrie n'ont pas encore été exécutés en CI.

## Reste à auditer / corriger sans livraison immédiate
1. M01 : réexaminer la voiture civile et les équipements ARI/tuyaux *désormais modélisés* avec captures WebGPU/WebGL et comparaison aux références.
2. M01 : vérifier en jeu la lisibilité et l'alignement des nouveaux pickups (trousse de secours et énergie), collisions et rythme de récupération inchangés.
3. M02 : vérifier la géométrie des nouveaux refroidisseurs et comptoirs du marché, puis reprendre les autres installations de toit encore simplifiées.
4. Autres missions : inventorier systématiquement objets que le joueur ne peut pas identifier sans contexte (collectibles, portes, consoles, véhicules, interactions).
5. Personnages/ennemis : contrôles comparés aux artworks approuvés sous 3 angles (face, profil, dos) ; audit des pieds, articulations et parties cachées.
6. Physique et immersion : vérifier visuellement que silhouettes, collisions, points de tir, sorties de projectiles, déplacements VR et animations sont cohérents.
7. Vérifier que les anciens tests de locomotion Rempart et collisions échouent déjà sur main avant de distinguer les régressions éventuelles.

## Statut vérification
Modifications poussées uniquement sur la branche de travail. **Tests automatisés ajoutés, mais campagne de tests complète de cette branche pas encore exécutée**. Contrôle statique des imports relatifs et délimiteurs des modules de production effectué. Revue visuelle réelle sur Dell, iPhone et Quest 3 non effectuée. Aucune livraison demandée ou effectuée.

## Troisième passe : mutualisation inter-chapitres et remplacement des objets cubiques (NON LIVRÉ)

L'audit ci-dessous documente **l'état initial** ; ces nouveaux remplacements ont ensuite été enregistrés sur la branche de travail. Chaque modification conserve les objets du layout et leurs fonctions d'interaction. Les scènes n'ont pas été validées en session réelle.

- `dist/functional-props.js` : bibliothèque réutilisable et fusionnée par matériau, contenant 25 familles de silhouettes : chariot élévateur avec vraies fourches, wagons à baies et bogies, transformateur à ailettes et isolateurs, groupes électrogènes, supports de lits/brancards, guichets, kiosques, distributeurs, scanners, racks serveurs, batteries, établis, treuils, pompes, bureaux, bancs et fauteuils. Emplacements, hauteurs et dimensions conservés ; des objets fonctionnels auparavant uniquement cubiques ont maintenant des pièces distinctes.
- `dist/freight-truck-detail.js` : camion cargo commun M02/M03, cabine profilée, pare-brise incliné, portes latérales, rétroviseurs, caisse renforcée, jantes et roues détaillées.
- `dist/m02-extension-art.js` : reprise des lits du refuge, couchages improvisés, tentes, bureau, armoires, consoles de radio, racks, batterie, postes de sécurité, portiques. Conservation des écrans et éléments d'interaction : le rideau HELIX reste animé ; affichage du manifeste et ordinateurs de radio restaurés après la mutualisation. Panneaux de convoi inchangés. Les anciennes gemmes pickups deviennent kits de soin et cartouches énergie reconnaissables.
- `dist/m03-art.js` : remplace voitures, camions, ambulance Inès, wagons sanitaires/fret, treuil et guichet de régulation. Le véhicule médical conserve sa routine de déplacement, l'éclairage, les gyrophares et son marquage AEGIS. Le treuil conserve son axe animé. Rampe de chargement et enseignes de gare préservées.
- `dist/m04-art.js` : chariot élévateur orienté vers la direction de chargement originale, trains, transformateurs électriques, groupe électrogène, casiers et mobilier d'atelier ; branche dédiée `transformer` au lieu de maquiller un générateur diesel.
- `dist/ligne9-art.js` : guichets, machines à billets, distributeur NOVA-KAÏ, brancards, lits, établis, commerces, casiers, bancs et treuils ; pompe animée enrichie de stator et raccords sans supprimer sa cinématique.
- `dist/couronne-art.js` : bancs, guichets, scanners et bureaux réalistes ; consoles de phase particulières conservées pour ne pas interrompre les interactions.
- `dist/breach-dressing.js` : sièges à assise et dossier, piétement sur roulettes ; consoles sur pieds avec passage pour les jambes ; racks de serveurs ouverts et accessibles.
- `tests/381-cross-chapter-functional-props.test.mjs` : intégrité de la bibliothèque, dimensions, budget géométrique et raccordement des modules de chapitres.

### Validation et statut
- Examen statique des imports et des délimiteurs des modules modifiés : aucune dépendance relative manquante dans les modules de production examinés.
- **Les tests Node.js et la revue visuelle en situation n'ont pas été exécutés**. Création du sandbox de test distant refusée par Vercel (403) et aucune autorisation de livrer un aperçu distant : les scripts peuvent encore contenir des défauts fonctionnels. Le fichier HTML local d'atelier importe les géométries directement depuis la branche mais son rendu chez l'utilisateur n'est pas encore confirmé.
- Les portiques visuellement ouverts utilisent encore les colliders de mission actuels. À auditer sur le terrain avant de livrer pour éviter un passage trompeur.
- Restent à examiner finement : pédales et fourches du chariot, collisions de brancards dans les couloirs, espaces libres devant les consoles, performances Quest 3 et Dell.
- **Aucune fusion `main`, aucun déploiement public.** En attente d'une validation et de modifications groupées supplémentaires.


## Audit complémentaire des modèles « trop cubiques » — fichiers réels, 2026-11-01

Inspection statique des fonctions de placement de décors de tous les chapitres.
**Diagnostic de code : aucune capture du rendu final ne confirme encore chaque silhouette.**
La construction d'un objet uniquement avec des `box()`, `piece()` ou `queue()` n'est pas une faute pour un bâtiment ou un caisson, mais est insuffisante pour certains objets fonctionnels où l'utilisateur doit reconnaître une machine, une cabine, un lit ou un outil. Les scripts examinés ci-dessous n'ont pas été modifiés dans cette passe.

### Priorité P0 — très visibles ou indispensables à la lecture narrative
| Chapitre et fichier | Fonction constatée | Correctif de modélisation recommandé |
| --- | --- | --- |
| M02 extension, `dist/m02-extension-art.js` ~284-294 | Camion du convoi HELIX : cabine, caisse et pare-brise = quatre grands cubes, roues non détaillées | Véhicule compartimenté hard-surface : cabine profilée, pare-brise incliné, jantes, panneaux cargo, suspensions et vrais blocs optiques |
| M03, `dist/m03-art.js` ~131-163 | Voiture, camion et ambulance Inès/AEGIS encore majoritairement `BoxGeometry` ; modifs des véhicules M01 non réutilisées | Adapter les modules des nouveaux véhicules au bon axe local et au canon visuel M03, préserver les véhicules brûlés et la signalétique |
| M04, `dist/m04-art.js` ~149 | Chariot élévateur = seulement trois blocs : pas de roues, mât, fourches ni siège | Vrai chariot avec cabine ouverte, volant, contrepoids, roues, deux fourches et vérin de levage |
| M04, `dist/m04-art.js` ~137 | Train composé de 4 grands parallélépipèdes | Locomotive et wagons distincts : bogies, fenêtres, portes, soufflets, axes et phares |
| M02 extension, `dist/m02-extension-art.js` ~300-321 | Abri improvisé / couchette `stall`, tente `tent`, lit `bed` représentés par boîtes et quadrilatères sans tissus naturels | Cadres métalliques, textiles drapés, matelas et coussins en surface déformée, affaissement du tissu, ancrages |
| M02 extension, `dist/m02-extension-art.js` ~336-353 | Scanners, postes de sécurité et terminaux avec blocs cubiques massifs | Vérifier qu'un portique est visuellement ouvert, rendre lisibles lecteur, caméra, capteurs, socle et portes techniques |
| M04, `dist/m04-art.js` ~151-162 | Groupe électrogène = cylindre ; casiers, établis, batteries, serveurs, terminaux = blocs | Générateur moteur/capot/panneau, armoires à portes, racks à baies physiques, vrais établis et câblage |
| Ligne 9, `dist/ligne9-art.js` ~454-481 | Distributeur de billets, chariots de soins `stretcher`, lit `cot`, armoires = gros volumes cubiques | Boutons, lecteur, fente, écran en retrait ; brancards sur roulettes, textile et accoudoirs, mobilier modulaire |
| Ligne 9, `dist/ligne9-art.js` ~497-516 | Distributeur automatique, pompe, treuil, bureau et rack serveur : détails de surface mais silhouette peu travaillée | Niche à produits, panneau de paiement, pompe avec volute, conduites et capot, treuil avec câble, tambour et embrayage |
| Rédaction/Brèche, `dist/breach-dressing.js` ~26-42 | Chaise = assise carrée + dossier plat ; console et racks essentiellement parallélépipédiques | Chaise pivotante assise incurvée, piétement cinq branches, accoudoirs ; racks réellement ajourés et panneaux articulés |

### Priorité P1 — scène secondaire / immersion
| Fichier | Objets à reprendre | Diagnostic |
| --- | --- | --- |
| `dist/m02-extension-art.js` ~311-369 | Cuisine, école improvisée, radio-rack, batteries, serveurs, cartons, containers | Formes parfois crédibles de loin, mais peu de silhouettes ou d'interfaces fonctionnelles au plus près |
| `dist/m03-art.js` ~167-241 | Poteau de treuil, cabine de péage, conteneurs, plateformes et remorque | Manque de câbles, mécanismes, charnières, joints et éléments lisibles |
| `dist/m04-art.js` ~145-177 | Transformateurs, refroidissement, portiques, réacteur et stabilisateurs | Différencier matériaux, profils d'équipements et raccordements ; les stabilisateurs peuvent rester géométriques mais pas arbitraires |
| `dist/ligne9-art.js` ~444-516 | Guichets, tourniquets, échoppes, kiosques, bancs, cabines et caisses | Effet « caisse géante » et panneaux uniformes; approfondir les fonctions d'usage |
| `dist/couronne-art.js` ~209-253 | Haies, kiosques, scanners, fontaines, bureaux, consoles et stabilisateurs | Conserver le langage architectural minimaliste, mais donner profondeur, remplissage et contours lisibles aux objets non architecturaux |
| `dist/breach-dressing.js` ~28-72 | Consoles, claviers, racks, tables de diagnostic et fauteuils | Repenser leur ergonomie, poignée et fixation ; attention aux consoles interactives |
| `dist/m02-environment-finish.js` ~125-145 | Extracteurs de plafond | Quatre pales plates au même pivot sans moyeu ni grille protectrice |
| `dist/level2-architecture.js` | Marchés/équipements récemment modifiés | Avant de poursuivre, vérifier le correctif sur les vraies scènes et les anciennes collisions |
| `dist/shooting-range-art.js` ~299-335 | Armurerie | Déjà structurée en huit compartiments, **pas un modèle simplifié à remplacer globalement** : retouches ciblées seulement |

### Incohérences transversales constatées
1. Le même archétype *ambulance / voiture / camion* a plusieurs implémentations indépendantes en M01, M02 et M03 ; la dernière refonte des véhicules n'affecte pas automatiquement les autres chapitres.
2. Les types `bed`, `cot`, `stretcher` et `stall` désignent des objets différents selon le chapitre ; ne pas convertir les bacs de culture M01 en couchettes.
3. Des machines censées être traversées/utilisées (scanners, terminaux, distributeurs) sont visuellement créées comme des blocs entiers ; **vérifier la correspondance réelle entre ouvertures visuelles, collisions et interaction avant de modifier**.
4. Certains objets annoncent leur fonction par une texture ou un panneau mais n'ont pas les caractéristiques physiques attendues (chariot élévateur sans fourches, machine sans commande).
5. Tous les chapitres ne réutilisent pas les nouvelles fonctions de mobilier et de véhicules. Introduire un adaptateur de taille/orientation commun, sans déplacer les colliders.
6. Les formes cubiques de murs, d'armoires simples, de barrières et de panneaux de façade ne sont pas automatiquement des erreurs ; privilégier les silhouettes fonctionnelles, pas l'arrondi systématique.

**Statut : inventaire seulement ; aucune modification supplémentaire du moteur ou des scènes réalisée lors de cet audit. Pas de fusion/déploiement.**

