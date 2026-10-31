# Version 3.72 — Vocabulaire générique dans les chapitres 01 et 02

Pink Wars n’est pas un jeu de pompiers : les textes visibles des chapitres 01 et 02 n’emploient plus le jargon de métier.

- **La « Caserne 07 » devient la station AEGIS 07.** Les noms changent ainsi :
  - la « remise des engins » devient le hangar des véhicules ;
  - la « porte sectionnelle » devient la grande porte du hangar ;
  - la « salle de garde » et son « standard » deviennent la salle de veille et sa radio ;
  - la « main courante » devient le journal de bord ;
  - le « tableau de garde » devient le tableau de service.
- **Véhicules :** le VSAV 07 devient l’ambulance 07, le FPT 07 le camion 07, la VL le véhicule léger.
- **Personnes :** « chef d’agrès » devient chef ou cheffe d’équipe, « chef de garde » chef de poste. Les grades (adjudant, caporal) sont retirés.
- **Matériel :** les « ARI » deviennent des respirateurs, et « départs à la voix » devient « on part tout de suite ».
- **Chapitre 02 :** le dessin d’enfant montre une ambulance, et le manifeste parle du journal de la station 07.

L’histoire, la chronologie de la nuit de 2189 et le déroulé des missions ne changent pas. Un test vérifie que ce jargon ne revient pas dans les textes des chapitres 01 à 03.

Cette version publie aussi le chapitre 03 complet et la nouvelle identité (logo officiel vectorisé et écran de niveau commun) décrits dans [MISE_A_JOUR_371.md](MISE_A_JOUR_371.md).

# Version 3.72 — Matières et objets réalistes dans M01 et M02

Cette passe approfondit la 3.71 : les matériaux des objets, des meubles et des portes réagissent à la lumière avec une rugosité et une teneur en métal propres à leur matière. Les équipements gagnent des éléments adaptés à leur usage et les rangements montrent leur contenu.

## Matières

Onze familles de surfaces partagées : peinture avec quelques éclats laissant apparaître le métal, acier brossé, cuivre, caoutchouc, veinage du bois, toile tissée, papier fibreux, terre, écorce, feuilles nervurées et céramique émaillée. Couleur en sRGB ; rugosité et métal dans une texture linéaire commune ; microrelief en qualité normale. Le grain des boîtes et des surfaces murales est dimensionné en mètres.

Ce sont des textures originales générées une seule fois, en complément des matériaux CC0 photographiques déjà présents sur les bâtiments et sols. Aucune nouvelle dépendance ou ressource distante. Les couleurs de la caserne, du marché et de HELIX restent distinctes. Les étiquettes de service sont imprimées, avec numéro et code-barres ; elles ne brillent pas et ne remplacent aucun texte narratif.

## Éléments enrichis

- **Caserne 07** : établi à quatre pieds métalliques, panneau perforé au fond, étau à deux mors, caisse à outils, clé et tournevis. Cadrans à aiguille, raccords et tuyauteries sur les installations techniques ; grilles et boutons de radio.
- **Archives** : rayonnage ouvert, étagères et dos réels, livres à hauteurs et épaisseurs variées, étiquettes visibles. Le vieux bloc plein qui masquait les livres est supprimé. Bois, papier et métal sont différenciés.
- **Serre** : terre avec petits graviers et débris organiques ; feuilles nervurées ; écorce rugueuse. Le houppier de l’arbre est composé de feuilles individuelles et de rameaux, avec des trouées, plutôt que de volumes sphériques verts. Branches effilées et départs irréguliers.
- **Marché** : linge avec plis et pans retombants, oreillers, couvercles et anses des marmites, planche et ustensile. Tasses creuses en céramique avec bord et anse.
- **Dispensaire** : armoire ouverte dans sa structure avec vitrage, montants et poignées attachées ; flacons à bouchons et étiquettes posés sur de vraies étagères. Supports de perfusion équipés, tuyau et linge plié.
- **HELIX et portes** : métal, peinture et caoutchouc distincts, plaques imprimées de maintenance ou d’identification sur les vantaux et les équipements. Les plaques suivent les portes.

Les collisions, parcours, positions d’interaction et déroulés de mission sont conservés.

## Coût et vérification

Les surfaces sont partagées par famille : 128 × 128 en qualité normale, 64 × 64 en qualité basse. Le mode bas conserve couleur, rugosité et métal, et omet le microrelief. Environ 2,06 Mio de données brutes par bibliothèque en normal et 352 Kio en bas (environ 2,75 Mio / 469 Kio avec mipmaps). Les objets fixes restent regroupés par matériau. Aucune lumière dynamique ni mise à jour de texture par image ajoutée. La cadence sur appareil réel n’est pas mesurée.

- `npm test` : **669 tests réussis**, aucun échec, test ignoré ou annulé.
- Sept tests ciblés passent également après les derniers réglages : portes, circuits électriques, matières déterministes, espaces colorimétriques, métal absent des matières organiques, mémoire du mode bas, rayonnage ouvert et flacons visibles.
- Chromium / SwiftShader : démarrage des deux missions en 1280 × 800 et fenêtre tactile 390 × 844 ; aucune erreur JavaScript ni ressource manquante. Le parcours contrôlé de la caserne allume les nouveaux écrans avec le groupe.
- Captures des deux extensions en qualité normale avec leurs géométries et matériaux réels : établi, rayonnages, serre, dispensaire et cuisine. L’éclairage de ces vues de détail est préparé pour examiner les matières ; les règles d’éclairage du jeu ne sont pas modifiées.
- Aucun essai sur iPhone ou Quest physiques ; aucun déploiement en production.

[Établi](372-atelier.webp) · [Rayonnages](372-archives.webp) · [Serre](372-serre.webp) · [Dispensaire](372-dispensaire.webp) · [Cuisine](372-cuisine.webp) · [Rapport navigateur](REALISM_372_BROWSER_VERIFICATION.json).
