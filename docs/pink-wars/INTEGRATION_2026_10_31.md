# Intégration des demandes #9, #4 et #3

## Décors des missions 01 et 02 (#9)

Les matières physiques et accessoires des branches 3.71–3.73 rejoignent les cartes actuelles : portes détaillées, ordinateurs alimentés par leur circuit, affaires personnelles, rangements, végétation, fournitures et bassin ouvert. Trois ventilateurs et cinq étoffes utilisent les mises à jour existantes. Les chemins, collisions et personnages des chapitres actuels sont conservés. Les notes et captures historiques restent disponibles dans ce dossier.

## Opération Brèche (#4)

L’ancienne campagne devient une mission bonus sélectionnable depuis **Histoire → Opération Brèche** (`index.html?mode=breach`). Elle conserve les six secteurs, les renforts par portail, la route haute et le tunnel, les relais, les trois stabilisateurs, le gardien et l’extraction. Les points de contrôle permettent de reprendre l’essai après une défaite. Elle ne remplace ni Le Dernier Signal ni le chapitre 04 de JANUS. Les armes et modèles sont ceux de la version courante.

L’assistance de tir reste légère, sans correction de caméra, sans cible à travers un mur, et sans altérer la mesure du stand de tir ni les rayons WebXR. Le léger zoom de tir accompagne la visée existante. Les pas choisissent métal, béton ou asphalte selon le support. Les ombres actuelles de tous les profils sont conservées ; les contacts des acteurs ne restent plus au sol pendant un saut haut.

## Musiques (#3)

Le dépôt fournit **Velvet Siege** et **Iron Maw** en AAC ; le fichier Under Violet Light demandé dans l’ancienne PR est absent. L’intégration utilise donc Velvet Siege pour l’accueil et les chargements et Iron Maw pour les missions et l’arène, sans référence vers un MP3 manquant. Un seul flux joue à la fois dans le contexte audio débloqué par geste. Les réglages Musique, les pauses, le prologue et le masquage de l’onglet sont respectés. La lecture de mission reprend à sa position ; une erreur du média active la composition synthétisée locale. Le refus de lecture automatique attend un nouveau geste et ne provoque pas de tentatives à chaque image.

## Vérifications de l’intégration

- 58 contrôles ciblés réussis : décors, circuits, parcours complet de la mission bonus, collisions, gardien, stabilisateurs, profils des héros, ombres, surfaces sonores et cycle de vie musical.
- Chromium / WebGL logiciel : mission bonus, M01 et M02 démarrent sans erreur JavaScript ni ressource manquante. Les deux missions exposent respectivement 18 et 23 groupes de nouveaux accessoires ; la musique de mission utilise réellement le flux Iron Maw, sans secours synthétisé.
- [Résultats navigateur](INTEGRATION_2026_10_31_VERIFICATION.json).
