# Version 3.71 — Décors et accessoires des niveaux 1 et 2

Les deux chapitres conservent leur parcours et leur histoire. Cette passe améliore les objets de la Caserne 07, des Archives végétales, du marché couvert et de la tour de transit, ainsi que la végétation du quartier et les caisses de la rue.

- **23 portes** : encadrements métalliques, joints, seuils, poignées sur les deux faces, plaques de protection, voyant de verrouillage et rails. Les éléments suivent leur vantail. Les portes sectionnelles et la grille se rangent sous le plafond ; les portes vitrées ont de vrais cadres et la porte du coffre une roue à trois branches. Le dégagement visuel complet est vérifié à plusieurs hauteurs.
- **Ordinateurs** : six postes détaillés remplacent les écrans plats des consoles de la caserne, du local radio et du contrôle HELIX. Coque aux angles adoucis, pied, clavier à touches, pavé de commande, câble et évents. Diagnostics locaux lisibles ; alimentation liée séparément au groupe de la caserne, aux batteries de l’enclave et au circuit de la tour. Les ordinateurs narratifs existants et leurs textes sont conservés.
- **Plantes** : feuilles courbées en géométrie, nervure centrale, deux nuances naturelles et silhouettes variées dans les bacs et la serre. Le grand arbre possède des branches, plusieurs masses de feuillage et des racines. La végétation du quartier reçoit aussi ce modèle. Correction du nom de matériau dupliqué qui rendait certaines plantes des Archives émissives.
- **Accessoires** : poignées de rangement, porte-étiquettes, nervures de serveurs, renforts et loquets des caisses, carnets, papiers, crayons, tasses à anse, oreillers et détails des lits du dispensaire. Ils sont attachés aux meubles existants.
- **Portails de renforts** : bobines, carters, boulons, embases et membrane en spirale dans M01 ; même modèle, avec la signature rouge HELIX, pour annoncer les renforts de M02. Les effets suivent l’emplacement et l’orientation du point d’arrivée réellement actif.

## Mise en œuvre

`dist/vesper-props.js` fournit les modèles partagés. Géométries fixes regroupées par matériau, y compris les encadrements et rails des portes ; seuls les vantaux et voyants sont indépendants. Textures de diagnostic 512 × 256 et de brèche 256 × 256 générées une fois, sans téléchargement externe. Aucune lumière dynamique supplémentaire. Le profil bas réduit la subdivision et la densité des plantes ; géométrie et matériaux compatibles avec les moteurs WebGL et WebGPU déjà utilisés.

Les collisions, points d’interaction et données de mission ne sont pas modifiés. Les portes continuent de lire les mêmes états d’ouverture. Les versions des entrées du jeu passent ensemble à 3.71.0. Le test historique du cache HUD lit désormais la version courante au lieu de refuser toute version supérieure à 3.69.

## Vérification

- Tests dédiés `tests/371-vesper-props.test.mjs` : ouverture et dégagement des 23 portes sur les deux axes, matériel solidaire des vantaux, feuillage non émissif, circuits indépendants des écrans, géométrie finie, enveloppe de rendu bornée, libération des ressources et construction des deux extensions en qualités normale et basse. Le centre du portail reste libre.
- Suite complète : `npm test` — **666 tests réussis**, aucun échec, test ignoré ou annulé.
- Chromium avec rendu logiciel : construction des modèles et lancement des deux chapitres ; aucune exception JavaScript, avertissement de décoration désactivée ou ressource HTTP manquante. Contrôle séparé avec une fenêtre tactile 390 × 844.
- Les essais logiciels ne mesurent pas la cadence sur un iPhone ou un Quest physiques. Aucun essai immersif sur casque réalisé.

[Vue des objets](371-objets.webp) · [Caserne sur fenêtre tactile](371-caserne-mobile.webp) · [Poste HELIX en jeu](371-helix.webp) · [Rapport navigateur](PROPS_371_BROWSER_VERIFICATION.json).

Les captures supplémentaires et résultats bruts des essais locaux se trouvent dans `qa/371-*` (répertoire de travail ignoré par Git).
