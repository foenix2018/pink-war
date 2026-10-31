# Rempart B-11 : reconstruction d’après la référence

Le modèle repose sur le squelette natif RLH à 41 os déjà utilisé par RECO1 et ses clips originaux. Les épaules et les hanches sont élargies par adaptation des translations articulaires ; les pièces sont rigidement liées aux mêmes os. Les paramètres ajoutés au pilote sont optionnels et ne changent pas RECO1.

Les volumes représentent une tête encastrée, deux tours de refroidissement, une cuirasse composée de carters inclinés et superposés, des articulations de genoux ajourées, des vérins, un canon multitube avec alimentation annelée et un bouclier à quatre sections inégales. Les pieds élargis possèdent des points d’appui calculés sur leur géométrie réelle, au-dessus des clips natifs. Les matières graphite, la peinture écaillée, les marquages usés et les halos des signaux sont générés une fois et partagés. L’optique reste propre à chaque ennemi et réagit à sa perception.

Le canon et le bouclier suivent des points d’attache sur le thorax animé ; leur position n’est plus figée dans le repère racine. La visée stabilise l’orientation du canon. La bouche visible et l’origine des projectiles partagent la translation de l’arme, y compris en marche, en visée et accroupi. Cette correction est conservée dans une WeakMap par ennemi, libérée au retrait du modèle ; sans modèle animé, le repère de repos reste disponible pour la simulation.

La locomotion conserve l’avancée, le lever des pieds et la cadence des clips de RECO1. Une résolution des jambes guide les bottes sur deux pistes séparées, avec des genoux dirigés vers l’avant et une rotation limitée des semelles. Le contact au sol est toujours calculé sur la géométrie réelle des pieds. Le capteur, les zones touchables et les hauteurs de couvert restent recalés au châssis ; les valeurs de santé et de dégâts restent celles du Rempart.

[Rendu](../apercus/rempart-reference/rempart.png) · [Marche animée](../apercus/rempart-reference/marche.gif)

Aperçu interactif : `rempart-preview.html` (Arrêt, Marche, Course, Accroupi et Visée). Il affiche le même modèle que le jeu. L’atelier et la galerie continuent à passer par la fabrique commune.

- Qualité haute : 40 484 triangles, six lots de rendu.
- Qualité basse : 7 156 triangles, six lots de rendu.
- Aucun éclairage dynamique ajouté par instance.
- Revue visuelle en Chromium : face, trois quarts et animation de marche.
- 45 tests ciblés réussis : squelette natif, proportions, appuis sans croisement en marche et en course, suivi du torse par le canon, concordance canon/projectile, perception, géométrie, couverts et non-régression RECO1.

Le résultat est une modélisation procédurale originale inspirée de l’illustration fournie, avec un détail adapté au jeu. Il ne reproduit pas toute la complexité de son rendu photographique.
