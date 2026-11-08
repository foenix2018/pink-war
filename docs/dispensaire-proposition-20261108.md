# Proposition M02 : dispensaire, paliers et sortie de visée

Version de travail sur `preview/dispensaire-portes-20261108`, issue de `04d3750`.
Proposition validée par le joueur le 8 novembre 2026. Intégration de la version validée pour livraison GitHub et Vercel, version 3.74.1.

## Dispensaire

Deux lits équipés de châssis tubulaires, roulettes, supports croisés, barrières, têtes/pieds de lit, matelas et tissus plissés. Les anciennes couches de couchage des patients sont retirées dans cette pièce ; les patients et leur respiration restent présents. Rideaux avec plis géométriques, anneaux, suspentes et rails fixés au plafond ; perfusions à cinq roulettes, poches, tubulures ; chariot, flacons et armoire vitrée à étagères ; bureau avec tiroirs, poignées, clavier et moniteur de surveillance.

Les interactions et emprises de collision restent celles du scénario. Géométrie regroupée par matériau, pas d’envoi de texture à chaque image. Le moniteur utilise une texture dessinée au chargement ; les textiles ont une normale de trame. Le modèle de test WebGPU natif utilise 13 lots et 36 038 triangles (qualité normale, un lit dans le test isolé).

## Escaliers

Raccords continus aux mains courantes, extrémités obturées, platines boulonnées, lisse intermédiaire, plinthes et habillage des chants. Palier ouest étendu jusqu’au départ réel de l’escalier. Périmètre du toit protégé, ouverture de 2,84 m conservée pour l’escalier. Les volumes de garde-corps ne traversent pas les débouchés. La subdivision du déplacement à faible cadence est conservée. Les anciens câbles qui coupaient le passage sont relevés selon les surfaces de marche, avec 2,4 m de garde ; les câbles sous les passerelles restent en place.

## Visée

Cas reproduit dans la version publiée : KeyO maintenue avant une pause, relâchement perdu, reprise sans keyup. La touche et le champ de vision restent en visée. La proposition annule la visée et efface les touches après pause, journal, perte de focus ou visibilité, perte du verrouillage de souris et changement d’orientation. Un bouton « Vue normale » et Échap permettent une sortie explicite. Le déclencheur manette encore tenu reste inhibé jusqu’au relâchement ; une nouvelle pression volontaire réarme la visée. Les événements clavier/pointeur réconcilient aussi l’état réel de Control/Meta.

Cette reproduction n’établit pas la cause de tous les cas rapportés ; aucun réglage de zoom/accessibilité du navigateur n’a été désactivé.

## Sons validés

Le joueur a validé A pour le dispensaire et les petites portes coulissantes, B pour les portes lourdes (grilles, coffre, HELIX). Les fichiers de lecture sont des copies exactes des fichiers individuels proposés, sans transposition. Chaque fichier présente ouverture puis fermeture, sans bip. Sources et licences dans `dist/assets/audio/doors/proposals/CREDITS.md`. La source principale est CC BY 3.0, pas CC0. Le chargement reste local, avec une seule voix par porte et arrêt à l’inversion, à la pause ou à la coupure du son.

## Vérification

- 40 tests ciblés existants : scénario prologue/épilogue, collisions, audio, guidage, géométrie d’escalier.
- 4 tests supplémentaires : inhibition de la visée, récupération des modificateurs, débouchés des garde-corps et garde au-dessus des passages.
- 18 parcours de montée M02 dans le navigateur (trois escaliers, marche/sprint, 20/30/60 images/s) : 18 réussites.
- Navigateur : visée ARES X9 (FOV 20,59°), pause/reprise (72°), bouton de retour avec KeyO encore tenue (72°), visée tactile puis pointercancel (retour 72°).
- Rendu natif WebGPU des nouveaux modèles sans erreur ; captures avant/après de la scène complète avec le mode WebGL de compatibilité, au même cadrage et réglage graphique.

Les essais automatisés ont été réalisés sous Chromium logiciel ; un contrôle sur le téléphone/manette du joueur reste utile pour son cas de zoom intermittent.

## Validation de l’intégration

- 46 tests ciblés réussis : les 44 contrôles précédents et deux contrôles des sons validés (affectation de toutes les portes M02, hauteur de lecture inchangée, chargement unique par contexte, égalité des fichiers approuvés et crédits).
- Les quatre fichiers définitifs ont été décodés et joués par Web Audio dans Chromium, puis arrêtés et libérés.
- Les 18 parcours d’escalier et les retours de visée clavier/tactile ont été revérifiés dans la version intégrée.
- La suite générale a été interrompue après identification d’un ancien échec du stand : tests/336-training-upgrade.test.mjs recherche encore le nom « Plafond pare-balles acoustique ». Le même test échoue sur 04d3750 avant ces modifications. Les autres annulations du journal général proviennent de l’arrêt de cette exécution ; elles ne constituent pas des résultats de test. Aucun changement du stand n’est inclus dans cette livraison.
