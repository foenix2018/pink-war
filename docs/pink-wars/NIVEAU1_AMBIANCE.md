# Niveau 1 — ambiance inspirée de l'arène

Première passe sur la carte jouable `vesper-level1-v7.html`, intégrée dans
`vesper-combat.js`. Le quartier des secours, la caserne et les archives conservent
leurs bâtiments, leurs passages, leurs collisions, leurs rencontres et leurs
interactions. Aucun ennemi, mur bloquant ou objectif supplémentaire.

## Direction visuelle

- Ciel photographique teinté en crépuscule mauve, brume de distance, lumière froide
  sur les structures et reflets roses dans les espaces techniques ORDRE.
- Huit projecteurs mobiles fixés aux façades et aux toits existants ; leurs faisceaux
  sont coupés à la première surface de collision, y compris les plafonds.
- Six bannières ORDRE, douze luminaires pratiques et quatre postes d'observation
  lointains au-delà des limites jouables.
- Treize petites surfaces humides, des halos, une brume basse et une pluie limitée
  aux espaces extérieurs. Pluie et lumières d'ambiance extérieures désactivées sous
  un plafond. Lampes AEGIS chaudes dans la cour de départ et près des archives.
- Le réglage jour/crépuscule/nuit reste utilisable : en plein jour, la teinte de
  siège et ses lumières supplémentaires s'effacent. L'adaptation de l'éclairage
  intérieur existante reste appliquée avant cette passe.

## Budget et vérification

36 maillages et environ 12 150 triangles supplémentaires ; géométries fixes
regroupées par matériau, flaques et reflets instanciés. Deux lumières dynamiques
supplémentaires au maximum en performance/mobile/casque, trois en qualité normale.
Sans nouveau calcul d'ombres pour les projecteurs, sans effet de post-traitement.

Les 23 tests ciblés de la première vérification passent : ambiance, carte canonique,
géométrie, sauvegardes et déroulement de la caserne et des archives. Le navigateur
WebGL démarre sur `x-cour`, avec huit projecteurs et le budget de deux lumières,
sans erreur JavaScript. Les rendus avant/après sont faits avec la même caméra sur
les véritables fabriques du décor, sans personnages ni interface. Le casque et les
performances sur appareil mobile réel restent à mesurer.

Cible de livraison : branche `main` de `foenix2018/pink-war`, projet Vercel
`pink-war`, domaine de production `https://pink-war.vercel.app`. L'arène du commit
`05d9132` est conservée.
