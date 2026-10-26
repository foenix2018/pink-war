# 3.63.9 — Percée militaire, atelier et cour de livraison

**26 octobre 2026.** Premier lot de l’option A choisie après la 3.63.8 ; deuxième extension spatiale après la cour/annexe de la 3.63.4. La mission reste finissable jusqu’au relais. Ce lot ne prétend pas livrer à lui seul une première traversée de vingt minutes.

## Changement jouable

Après le premier engagement, BLOOM est proposé et le guidage mène à l’atelier ouest. Deux accès rejoignent la commande locale : l’entrée de l’atelier ou la cour de livraison. Rétablir la liaison électrique locale de la boutique déclenche le deuxième groupe, annoncé par un portail éloigné. Ce circuit ne reconnecte pas l’archive humaine au réseau d’ORDRE. Après les huit machines, l’accès arrière de la boutique conduit au deuxième journal canonique.

La suite reste jouable : journal → carrefour et découverte de LANCE → balise → dernier groupe → escalier ou ascenseur → relais. Le carrefour et la montée recevront leur propre extension dans les prochains lots. Le deuxième groupe auparavant déclenché au carrefour défend désormais le secteur ouest ; il n’est pas dupliqué.

## Espace et détails

- Emprise portée de 120 × 160 m à **136 × 160 m**, côté ouest. Quatre pôles canoniques et relais à +4,8 m conservés.
- Atelier traversant : entrée sud, sortie nord, ouvertures sur la cour est, fenêtres ouest sans vitrage intact. Façades et couverts partagent leurs données Blender/collisions.
- Accès ouest réellement ouvert dans le bâtiment de la boutique ; le passage est reste disponible.
- Tour de réparation avec rails, broche et volants ; établi avec composant mécanique ; rayonnage, conduites, câble, sectionneur animé et signalétique civile. Textures locales partagées : brique, béton humide, acier et rouille. Aucun nouvel éclairage dynamique.
- Portails du secteur ouest choisis selon leur dégagement, leur accessibilité et une distance d’au moins douze mètres. Arrivée différée et sonore ; plafond de huit ennemis actifs, trente-deux au total.
- Checkpoints version 3 : un ancien point « boutique » reprend avant la nouvelle séquence ; une sauvegarde après sa sécurisation conserve la liaison rétablie et ne recrée pas les huit machines.

## Respect du canon et continuité

Deux journaux humains, trajet vers les Archives végétales, GHJU/LYLU Shadow Unit, armes, commandes, HUD C et règle audio conservés. Pas d’arrivée anticipée de Cara/Gaby ni de révélation ajoutée. Musiques réservées aux menus et chargements.

## Validation et limites

Les parcours physiques des deux accès et de l’arrière-boutique sont testés avec les obstacles du décor. Les tests couvrent l’ordre du circuit, le portail, le budget fini, les anciennes sauvegardes, le guidage et la fin de mission avec tirs physiques. La validation navigateur contrôle le sectionneur, le tir, le rechargement et la reprise après pause sur formats ordinateur et mobile. Les captures de la galerie proviennent du rendu réel du jeu.

La fluidité sur iPhone/Quest physique et la durée en découverte restent à tester par le joueur. Cible globale : **25 minutes**, à vérifier après les lots carrefour/sabotage et montée/relais ; aucune minuterie ne prolonge artificiellement ce passage.

### Résultats de cette livraison

- Suite complète : 487 cas exécutés ; 486 réussis initialement, un ancien contrat SVG de l’affiche M02 remis à jour, puis les cinq tests de ce fichier réussis. Les onze tests cour/atelier ont été rejoués après la reconstruction finale : tous réussis.
- Mission complète : progression finie et tirs physiques validés ; deux accès de l’atelier, passage arrière de la boutique et guidage jusqu’au relais validés.
- Simulation de pression de soixante secondes dans le nouvel atelier : 70 tirs ennemis et des dégâts reçus ; les machines ne restent pas bloquées derrière la façade.
- Navigateur Chromium/WebGL : LYLU sur 1440 × 900 et GHJU sur 390 × 844, commande de liaison, tir, rechargement et pause/reprise réussis, aucune erreur JavaScript. Caméras déplacées pour les captures ; démarrage du scénario et commandes réels. Aucun résultat de FPS matériel ni essai physique Quest/iPhone revendiqué.
- Blender : 310 980 triangles statiques, 14 lots de matériaux. Accessoires d’atelier : 7 064 triangles et 14 appels de dessin avec signalétique ; aucun nouvel éclairage dynamique.
- [Aperçu des captures](https://pink-war.vercel.app/m01-atelier-3639.html). Photographies du rendu WebGL local, sans retouche du décor ; conversion WebP pour leur poids.
