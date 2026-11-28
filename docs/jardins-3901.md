# Pink Wars 3.90.1 — formes et décor des Jardins suspendus

Le parcours et les neuf étapes du chapitre 9 restent ceux du plan métrique. Cette révision remplace les consoles en bloc, les bacs pleins et les masses de feuillage sphériques par des objets construits et des silhouettes végétales plus détaillées.

- Terminaux : pied à profil tourné, support courbe, écran incliné avec interface HELIX originale, encadrement chanfreiné, boutons, vis et évents.
- Jardinières : corps creux, rebord retourné, pied étagé, terre en retrait et renforts. Bacs hydroponiques : rails, raccords d’irrigation et ventilation.
- Végétation : troncs effilés, racines évasées, branches courbes ramifiées, atlas de rameaux et fleurs avec découpe alpha. L’écorce possède ses propres cartes de couleur, relief et rugosité. L’arbre JANUS conserve ses veines lumineuses sur un volume ombré.
- Serres et passerelles : connecteurs de nervures, embases, colliers et fixations des garde-corps. Les ouvertures et les obstacles suivent toujours le plan commun.
- Nœud ORDRE : encadrements en relief, parements, gouttière et équipements de traitement d’air sur le toit. Navette AEGIS : coque profilée à panneaux, cockpit vitré, ailes séparées, turbines avec pales et colliers, articulations du train et ventilation.

Les pièces fabriquées sont chanfreinées individuellement avant regroupement par matériau. Le modèle est exporté depuis la vraie source Blender ; eau et vent utilisent toujours les matériaux TSL compilés en WGSL sur WebGPU. Les atlas ont des UV propres conservés lors de l’export et un test alpha avec écriture de profondeur. Le mode compatible WebGL utilise les mêmes objets.

Le LOD mobile conserve des rameaux complets et simplifie les branches. Aucun changement des réglages de mouvement, des ennemis ou des neuf objectifs.

## Reproduction

```sh
python3 tools/m09-textures.py
blender --background --threads 4 --python tools/blender/m09_gardens.py
node --test tests/390-m09-gardens.test.mjs
AUDIT_OUTPUT=/tmp/m09-details CAPTURE_TAG=after node tools/verify-m09-details.mjs
M09_VERIFY_MODE=gpu node tools/verify-m09.mjs
M09_VERIFY_MODE=game node tools/verify-m09.mjs
node tools/verify-m09-preview.mjs
```

Les scripts navigateur acceptent `PLAYWRIGHT_MODULE`. Les captures WebGPU utilisent la lecture d’une cible de rendu ; aucune image générée n’est présentée comme une capture du jeu. Les comparaisons utilisent les mêmes caméras et le même instant d’animation. La validation iPhone est une émulation de viewport et des commandes tactiles ; elle ne mesure pas les performances d’un iPhone physique.

Dossier des preuves : `/workspace/livraison/pink-wars-n09-objects-20261122/`. Mesures et résultats finaux : `release.json` dans ce dossier.

## Crépuscule de Vesper

Le chapitre jouable et la vue d’ensemble chargent le même ciel photographique étalonné, la brume basse et les matériaux de béton et de dalles antidérapantes. Les sources CC0 figurent dans [les crédits du chapitre](../dist/assets/m09/CREDITS.md).

Dans le sas d’ORDRE, les vantaux glissent dans un rail avec joints, chariots et voyants. Les cinq postes hydroponiques et les quatre régulateurs de JANUS proviennent d’un fichier Blender dédié. Le nœud de contrôle affiche le plan des terrasses et l’état du réseau sur sept écrans regroupés dans un atlas. Les éclairages roses de proximité partagent une seule lumière dynamique.

Le canal amont rejoint la première cascade au bord du bassin. Le shader WebGPU calcule les remous, l’écume et les hauts-fonds. Le rendu WebGL associe une carte de couleur filtrée aux normales animées sur la même surface. Les matériaux opaques les plus lourds sont découpés en secteurs qui partagent les attributs de sommets. Le profil mobile écarte également les petites tiges de fougères au loin.

```sh
python3 tools/build-m09-sky.py
blender --background --factory-startup --python tools/blender/m09_equipment.py
node --test tests/390-m09-gardens.test.mjs
```

Le fichier source des équipements est [Jardins_Equipements.blend](../assets/m09/Jardins_Equipements.blend). Le jeu charge son export compressé de 46 ko.
