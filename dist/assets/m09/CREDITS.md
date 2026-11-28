# Pink Wars · Les Jardins suspendus

Scène originale construite pour le projet à partir du plan de référence fourni par l’utilisateur. Source : `tools/blender/m09_gardens.py`, `tools/blender/m09_doors.py`, `tools/blender/m09_details.py`, `assets/m09/plan.json`.

Textures de béton et d’acier : ressources CC0 partagées du projet, `../cc0/LICENSE.md`. Cartes de relief et de rugosité : générateurs originaux de la planque, `tools/blender/hideout-textures.py`.

Typographie de la source Blender : DejaVu Sans, licence DejaVu / Bitstream Vera reproduite dans `DejaVu-LICENSE.txt`,  https://dejavu-fonts.github.io/License.html.

Armes, personnages, compagnons et adversaires de la partie : modèles et animations canoniques Pink Wars, chargés par le moteur commun.

Atlas botaniques à transparence découpée, écorce avec relief/rugosité et interface tactile : créations originales reproductibles par `tools/m09-textures.py`, sans images externes. Les formes usinées, troncs, branches, bacs creux et garnitures mécaniques sont modélisés dans la source Blender.

Le ciel `jardins-crepuscule.webp` est une adaptation colorimétrique de [Kloppenheim 06 (Pure Sky)](https://polyhaven.com/a/kloppenheim_06_puresky) par Greg Zaal et Jarod Guest, disponible sous licence [CC0](https://polyhaven.com/license). Reproduction avec `tools/build-m09-sky.py`.

Les surfaces en béton et les dalles antidérapantes emploient les cartes Poly Haven partagées `concrete_wall_006` et `anti_skid_tiles` sous licence CC0. Voir [les sources et empreintes](../ligne9/sources.json).

Les modules d’irrigation et les régulateurs JANUS sont des créations originales. Leur source éditable `Jardins_Equipements.blend` et leur export de jeu sont produits par `tools/blender/m09_equipment.py`.
