# 3.63.18 — Dégâts localisés

Base : `dd2e488`, version 3.63.17 de GitHub `main` et du domaine de production.

## Règles de dégâts

Les coefficients sont désormais définis dans un tableau partagé `HIT_ZONE_DAMAGE`, utilisé pour les huit formes d’ennemis :

| Zone réellement touchée | Dégâts avant blindage |
| --- | --- |
| Tête / capteur central | ×2,5 |
| Torse / coque | ×1 |
| Bras, jambes / appendices mécaniques | ×0,6 |

Un projectile R–9 de 24 dégâts inflige donc 60 dégâts à la tête, 24 au torse ou 14,4 à un membre sur une unité sans réduction de blindage. Les modificateurs de distance, charge, niveau de blindage, protections du Rempart et compétences continuent à s’appliquer. La tête bénéficie toujours d’une meilleure pénétration du blindage de niveau. Le capteur de la sonde et celui du rampant correspondent à leur zone critique ; leurs appendices correspondent aux membres.

La détection existante conserve la rotation, l’altitude, l’accroupissement, les proportions des élites et la mise à l’échelle des robots AT HOME. Les réactions existantes sont conservées : bref étourdissement après une touche à la tête et gêne de déplacement après une touche aux membres. Le coup porté à la tête ne multiplie pas les dégâts de l’explosion sur les ennemis voisins.

Les tirs du jeu normal, de M01/M02, des deux pistolets de GHJU et d’AT HOME passent par les mêmes coefficients. Le tir part toujours de la bouche du canon et respecte les collisions des murs. Les cibles métalliques du stand conservent leur comptage de points et leur basculement mécanique.

## Confirmation de touche

Un petit marqueur en croix confirme brièvement un impact : ambre pour la tête, blanc pour le corps, plus discret pour les membres. Il utilise une seule géométrie et un matériau réutilisés, sans nombre de dégâts ni lumière supplémentaire. Il s’affiche aussi en VR, sans modifier la pose du casque ni le rayon de visée. Sa taille tient compte du grossissement de la caméra à l’écran.

La confirmation s’efface après 180 ms, même si la simulation est interrompue. Un plomb du fusil à pompe touchant un membre ne masque pas immédiatement une touche critique reçue dans la même salve. Les événements de compagnons ne déclenchent pas ce marqueur joueur. Le changement d’arme et la fin de partie le réinitialisent ; les ressources sont libérées avec les effets de la scène.

## Vérification

Les nouveaux tests vérifient : les huit formes, rotations, altitude, accroupissement, élites et échelle de pièce ; les dégâts avec de vrais projectiles R–9 dans l’arène/M02, M01 et AT HOME ; les deux bras et les jambes ; le blocage par un mur ; l’application unique du multiplicateur ; le blindage et les dégâts secondaires ; le marqueur, sa priorité, son adaptation au zoom et sa libération.

La suite complète passe : **519 tests**. Dans le navigateur, de vrais tirs au clavier puis au bouton tactile sur un robot de production vérifient successivement 60, 24 et 14,4 dégâts, la confirmation ambrée/blanche/discrète et son extinction. Aucun des deux parcours ne signale d’erreur JavaScript ni de ressource manquante.

Résultats navigateur et captures : `/workspace/livraison/validation_363_18/`. Les essais de format tactile et de logique VR simulée ne remplacent pas un essai matériel sur iPhone ou Quest 3.
