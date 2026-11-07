# Escaliers et matière de l'arène — 7 novembre 2026

## Escaliers et rampes

Le module `stair-hardware.js` apporte des nez de marche, inserts antidérapants, fixations, platines boulonnées, mains courantes tubulaires avec retours et limons métalliques. Les pièces sont regroupées par matériau. Les parcours et collisions restent définis par les niveaux.

Intégration : escaliers du niveau 1, trois volées du niveau 2, escalier du niveau 3, Ligne 9, Couronne, passerelle et rampes de l'arène. Les garde-corps déjà tubulaires du niveau 3 reçoivent des fixations supplémentaires. Les murs latéraux du niveau 1 restent porteurs de la main courante.

Correction de cinq rampes des missions 4 et 6 : leur géométrie était inclinée dans le sens opposé à la surface utilisée par la locomotion. La surface visible suit maintenant les hauteurs de départ et d'arrivée, sur les axes X et Z. Le palier horizontal de la rampe du pont de M06 est rétabli avant la descente.

## Arène

- Lasers de visée : cœur cylindrique fin, diffusion et point de contact ; origine sur l'optique articulée de la tourelle. Aucun changement des dégâts, portées ou fenêtres d'esquive.
- Projecteurs : diffusion progressive dans la brume, sans silhouette de cône opaque, avec masquage par la profondeur.
- Béton et asphalte : textures photographiques locales, rugosité et normales en 1k sur le profil détaillé ; 512 et sans normales en mode compact.
- Coulures sous les joints, reprises de bitume, normales légères des flaques, matériaux métalliques plus lisibles. Suppression des rectangles roses de fausse réflexion répartis arbitrairement au sol ; éclairage ambiant moins uniforme.
- Budgets de l'arène inchangés : moins de 350 000 triangles, moins de 260 maillages dans le test de construction et au plus cinq lumières dynamiques.

## Validation

Tests de correspondance géométrie/locomotion sur toutes les rampes M04/M06, passage libre entre garde-corps, origine et extinction des lasers, masques et orientations des faisceaux. Tests existants de traversée, ponts, contacts des pieds, missions M04/M06/Ligne 9/Couronne et défense de l'arène exécutés avec succès. Construction de six scènes dans Chromium sans erreur JavaScript. M02 démarre et le joueur dispose de 100 PV ; ses trois ressources externes facultatives restent indisponibles via le proxy, les six familles de textures locales sont chargées.

Captures réelles du moteur dans `/workspace/livraison/` : `Arene_matiere_avant.png`, `Arene_matiere_apres.png`, `Rampe_arene_avant.png`, `Rampe_arene_apres.png`.

Cette livraison rassemble aussi le stand de tir, ses terminaux tactiles, les textures, les néons physiques, les nouveaux interrupteurs, portes et luminaires des passes précédentes. Voir les documents dédiés dans ce dossier.
