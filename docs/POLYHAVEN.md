# Ressources Poly Haven pour Vesper

Sélection consultée le 14 octobre 2026 sur les pages officielles. Architecture choisie : vieux immeubles et installations futuristes. Les archives sont humaines ; ORDRE reste hostile.

## Matériaux reliés au chargement en ligne

| Ressource | Application | Échelle réelle de la tuile |
| --- | --- | --- |
| [Broken Brick Wall](https://polyhaven.com/a/broken_brick_wall) | Maçonnerie des anciens immeubles | 1,8 m |
| [Concrete Moss](https://polyhaven.com/a/concrete_moss) | Béton et dalles envahis par la mousse | 3 m |
| [Rusty Metal Sheet](https://polyhaven.com/a/rusty_metal_sheet) | Épaves et tôles corrodées | 2 m |
| [Worn Asphalt](https://polyhaven.com/a/worn_asphalt) | Rue, fissures et débris végétaux | 2 m |

La couche `dist/polyhaven-level1.js` demande couleur, normale OpenGL et rugosité en JPEG 1K. Les textures sont partagées entre matériaux et réduites à 512 pixels sur le profil léger. Les échelles UV reprennent les dimensions publiées. Le chargement est facultatif et borné à six secondes ; les matériaux incorporés restent en place si un ensemble échoue. Les textures de l'arène ne sont plus demandées pendant le démarrage de la campagne.

**Limite de cette livraison** : le téléchargement local depuis `api.polyhaven.com` / `dl.polyhaven.org` n’est pas autorisé par la politique réseau de l’environnement de travail. Aucun contournement n’a été utilisé. Les pages de ressources et la licence ont été consultées par l’outil de recherche Web. Les vraies images Poly Haven n’ont donc pas été incorporées au `.blend`, au GLB ou au HTML autonome ; ils contiennent les matériaux originaux de secours. Dans le jeu en ligne, la couche se charge directement depuis le navigateur lorsque le serveur Poly Haven est accessible. Son succès a été testé avec des images de contrôle et son échec avec les requêtes bloquées, pas avec un téléchargement réel des images depuis cet environnement.

## Modèles repérés, pas encore importés

| Objet | Usage envisagé | Géométrie annoncée sur la page |
| --- | --- | --- |
| [Covered Car](https://polyhaven.com/a/covered_car) | Garage abandonné, voiture restée sous une bâche | 13K triangles |
| [Nettle Plant](https://polyhaven.com/a/nettle_plant) | Orties au pied des murs et dans les fissures | 46K triangles |
| [Power Box 01](https://polyhaven.com/a/power_box_01) | Boîtiers électriques anciens, adaptés aux équipements d’ORDRE | 21K triangles |
| [Concrete Road Barrier](https://polyhaven.com/a/concrete_road_barrier) | Barricades et protections de la rue | 81K triangles, LODs disponibles |

Ces modèles doivent être téléchargés, contrôlés, allégés et intégrés à leurs collisions avant inclusion. Les six épaves et les feuillages présents en 3.33 sont des créations originales, pas ces modèles Poly Haven.

## Licence

Poly Haven indique que ses assets — textures, modèles et HDRI — sont sous [CC0](https://polyhaven.com/license), utilisables et redistribuables, y compris commercialement. Les aperçus du site et les rendus d’exemple ont une licence distincte : ils ne sont pas copiés dans le jeu ou la galerie. Les liens renvoient aux fiches officielles.
