# M01 — refonte AAA WebGPU, lot 1
Branche de validation, non production. Parcours, collisions, rigs et objectifs inchangés.
- WebGPU prioritaire M01 mobile si disponible, option renderer=webgl maintenue ; autres niveaux inchangés.
- Cibles 60 FPS performance/équilibré, 30 FPS ultra ; plafonds pixels 650k/900k/1.2M. Géométrie mobile conservatrice.
- Post-traitement natif mobile limité à 4 échantillons de bloom et vignette, pas de SSAO mobile ; repli direct WebGL. Exposition intérieure progressive.
- Télémétrie FPS/p95, résolution adaptative.
- À valider : Safari physique iPhone 14 Pro, rendu natif, repli, FPS et chauffe 30 min, GHJU/LYLU, phases, sauvegardes, Quest, comparaison visuelle. Aucun résultat de FPS réel revendiqué.
- Lots ultérieurs : éclairage précalculé par secteur, textures KTX2/LOD, animations, gunplay, IA, son et cinématiques. Ne pas fusionner avant validation.
