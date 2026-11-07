# Escaliers M02 et équipements d'énergie

Le problème d'appui restant sur les escaliers a été reproduit avec le déplacement de production à 20 images/s. À 7 ou 10 m/s, une image pouvait traverser deux marches de 16,7 ou 18 cm ; la recherche du sol refusait alors la marche suivante, située au-delà des 30 cm de montée autorisée. Les précédents essais à petits déplacements ne couvraient pas ce cas.

Le déplacement M02 et la gravité sont désormais calculés en segments de 12 cm au maximum. Le temps de mission, les ennemis et les armes continuent à être mis à jour une seule fois par image. Les autres niveaux gardent leur fonctionnement existant. Les trois volées ont également des collisions sur leurs mains courantes latérales et le garde-corps du toit devient physique.

`power-props.js` fournit une famille commune d'objets : capsule à induction avec bobine hélicoïdale visible, enveloppe vitrée, quatre montants, bagues isolantes, verrous et contacts ; recharge médicale blindée avec poignée, attaches, croix et témoins ; socle d'induction à trois griffes. Les matériaux métalliques disposent d'une texture de rugosité. Sur WebGPU, les cœurs utilisent un matériau NodeMaterial avec une émission animée en TSL. Les mêmes modèles restent disponibles avec des matériaux standard sur WebGL et iPhone.

Le modèle commun remplace les objets élémentaires de l'arène et des missions 1, 2, 3, 4, 6, Ligne 9 et Couronne. La collecte, les durées et les effets des recharges restent ceux de la simulation. Les objets réutilisent des géométries et matériaux partagés ; leur suppression ne détruit pas les ressources des autres recharges. Ils n'ajoutent aucune lumière dynamique ni particules.

Les lampadaires M02 reçoivent un pied ancré avec boulons, un mât effilé, une trappe, un bras courbé, un luminaire étanche, huit lentilles et des ailettes de refroidissement. Leurs mâts ont une collision. Les têtes de lampes sodium du système partagé reçoivent aussi une optique à lentilles et un dissipateur. Les caisses M01/M02 sont biseautées et accueillent les nouveaux modèles.

## Validation

- 60 contrôles ciblés existants et nouveaux réussis ; un contrôle supplémentaire valide le saut pendant la course à 20 images/s.
- Tests de production `ArenaGame.step` à 20, 30 et 60 images/s, en marche et course, du sol à la passerelle puis du pont au toit ; absence de perte d'appui.
- Dans la page M02 chargée, avec les vraies commandes clavier transmises à `gameTick` : 18 montées sur les trois volées, à 20/30/60 images/s, en marche et course. Arrivée à 12 ou 25 m, appui conservé.
- Dans la scène M02, sortie latérale contenue par la rampe et ramassage d’une capsule avec disparition du modèle contrôlés.
- Géométrie, shaders NodeMaterial, partage des ressources, suppression indépendante, budgets de maillages et absence de lumières supplémentaires contrôlés par les tests des nouveaux équipements. Les tests existants des escaliers, luminaires industriels, du scénario et des portails sont conservés.
- Rendu WebGPU natif des capsules, recharges et du lampadaire : compilation et image hors écran réussies, aucune erreur JavaScript ou de shader. Aperçu exporté dans les fichiers de livraison : `Equipements_energie_WebGPU.png`.

La simulation à fréquence imposée vérifie la physique ; elle ne constitue pas une mesure des performances graphiques d'un téléphone. Le rendu natif des équipements a été contrôlé sur Vulkan logiciel.
