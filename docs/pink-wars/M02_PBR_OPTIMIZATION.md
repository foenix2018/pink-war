# M02 / W02 — PBR photographique à coût GPU réduit

Mise à jour : 22 octobre 2026 — livraison 3.48, branche main.

La carte, ses collisions, ses escaliers et ses passerelles restent inchangés.
Le chargeur `dist/level2-materials.js` applique cinq jeux de matériaux
partagés, issus de quatre surfaces Poly Haven CC0 :

| Emploi | Source photographique | Cartes locales |
| --- | --- | --- |
| Chaussée | [Asphalt 03](https://polyhaven.com/a/asphalt_03) | Couleur, normale, rugosité |
| Murs / marché | [Concrete Floor](https://polyhaven.com/a/concrete_floor) | Couleur, normale, rugosité |
| Bardages et passerelles | [Corrugated Iron](https://polyhaven.com/a/corrugated_iron) | Couleur, normale, rugosité |
| Caissons et matériel ancien | [Rusty Painted Metal](https://polyhaven.com/a/rusty_painted_metal) | Couleur, normale, rugosité |

Les douze JPG de `dist/assets/cc0/` totalisent environ 340 Ko. Sources 1K
réduites à 512 px à la production. Licence CC0, auteurs, miroir public et
empreintes des sources : `dist/assets/cc0/LICENSE.md` et `sources.json`.
Aucune requête au CDN Poly Haven n'est requise pour démarrer ou jouer.

- Desktop : cinq jeux × trois cartes 512 px avec mipmaps, environ 20,1 MiB.
- Téléphone / Performance : cinq jeux × deux cartes 256 px, environ 3,4 MiB.
- Les normales sont omises sur téléphone ; les cartes de rugosité restent.
- Textures partagées entre matériaux compatibles ; pas de displacement, SSR,
  parallax ou réflexion raytracée. Le mode de rendu WebGPU/WebGL reste adaptatif.
- Chargement non bloquant ; repli albédo généré si une image locale manque.
- Les motifs de rue et les surfaces de contact sont contrôlés à l'échelle
  du joueur ; aucun déplacement d'objet ne sert à cette passe de matériaux.
- La jauge technique PBR est accessible aux diagnostics, pas au HUD permanent.

Les commandes tactiles et la visée conservent le document commun
`COMMANDES_M01_M02.md`. La validation logicielle ne remplace pas les essais
sur téléphone, manette Mac et casque physiques.
