# 3.63.16 — Armurerie et exercices du stand

Base : `main`, version 3.63.15 / `dc9c616`. La livraison concerne uniquement le stand et son interface partagée ; les modes Histoire, Arène, AT HOME, le lore et les modèles GHJU/LYLU sont conservés.

## Cibles ralenties

Le facteur de mouvement passe de `min(4, 1 + temps/45)` à `min(1.5, 0.6 + temps/180)`. Les parcours et changements de sens restent progressifs et fluides. Pendant les exercices mobiles, la vitesse est réduite de plus de moitié ; l’accélération est plus douce et plafonne plus bas. Le déplacement et le calcul des impacts utilisent toujours la même trajectoire et le temps de vol réel des projectiles.

## Armoire physique à l’arrière

Une armoire métallique biseautée, éclairée et compartimentée est placée contre le fond du stand, derrière les tables de préparation. Ses parois sont solides et l’allée reste accessible en contournant les tables. Les armes exposées réutilisent les géométries et matériaux des armes du jeu : aucune copie de squelette de main ou de personnage n’est créée. Les ressources partagées ne sont pas détruites quand la vitrine est actualisée.

Approcher de l’armoire et utiliser **F**, l’action tactile **Choisir une arme**, le bouton d’interaction de la manette, ou le clic du stick libre en VR. L’accès vérifie la distance et les obstacles : l’armoire ne s’ouvre pas à travers une paroi.

Le choix se fait dans un panneau Fracture adapté à l’écran : grille sur ordinateur, deux colonnes en portrait iPhone. Navigation clavier et manette standard (croix pour choisir, rond pour fermer). En VR, le panneau existe dans la scène immersive : pointer avec la main droite et valider avec sa gâchette. Les tirs et déplacements de commande sont suspendus pendant ce choix ; la position suivie du casque reste libre.

LYLU ne peut pas équiper les doubles pistolets de GHJU. Cliquer sur l’arme déjà équipée ferme simplement le panneau.

## Nouvel essai à chaque changement d’arme

Tout changement effectif — armoire, E, HUD ou manette — efface le temps de l’exercice, les points, les tirs/touches et les séries. Les anciennes cibles, projectiles, charges et impacts différés sont retirés, afin qu’aucun coup de l’arme précédente ne puisse créditer le nouvel essai. L’arme choisie dispose d’un chargeur plein.

Le nouvel essai attend **l’interrupteur du box**. L’utilisateur peut revenir à son poste sans consommer le temps d’entraînement. Les cibles repartent alors du premier exercice. Une sélection invalide ou identique ne modifie pas les résultats.

Le temps de la simulation globale n’est pas remis à zéro : animations, ombres, cadence et suivi VR restent cohérents. Seul le temps propre à l’exercice est réinitialisé.

Un petit compteur **TEMPS / POINTS**, sous l’objectif du stand, affiche les résultats sans couvrir la visée. Le pied du HUD VR affiche aussi temps et points, en conservant santé et munitions.

## Vérification

Tests : réduction de vitesse, remise à zéro sur tous les changements réels, absence de crédit d’un ancien projectile, conservation des résultats lors des sélections identiques/invalides, gel du temps pendant le choix, accès physique autour des tables, collisions et restrictions de LYLU. Les tests de présentation vérifient également que les armes restent dans leur compartiment avant le premier rendu et que la vitrine n’endommage pas les ressources de l’arme tenue.

Navigateur : parcours complet au format ordinateur et iPhone, tir réel donnant des points, marche jusqu’à l’armoire, sélection M12, contrôle de la remise à zéro, changement rapide par E puis retour au box et redémarrage. Un panneau immersif est également testé avec une vraie intersection de rayon Three.js et un front de gâchette simulé. Ces essais ne constituent pas une validation physique dans le casque ni sur une manette PS4.

Les **511 tests de la suite complète passent**. La navigation clavier par Tab/Entrée et le choix avec un gamepad standard simulé sont également vérifiés dans le navigateur. Les parcours ordinateur/tactile, le panneau immersif et les captures finales de l’armoire ne signalent aucune erreur JavaScript ni ressource manquante.

Captures et résultats : `/workspace/livraison/validation_363_16/`. Présentation publique : `armurerie-stand-36316.html`.
