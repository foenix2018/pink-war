# La Brèche Violette — 3.49

Nouveau Level 1 accessible via Histoire. L'ancien niveau reste intact dans campaign-level1.js et campaign-art.js ; seuls les imports actifs changent.

Six secteurs reliés dans une base industrielle ouverte au ciel, 54 × 180 m, relief rocheux extérieur, structures métalliques, signalétique bleue et réacteur violet visible sur l'axe. Hangar avec deux sentinelles ; tunnel couvert et passerelle à 4 m ; trois adversaires dans les passages ; cour avec sept adversaires et deux relais ; gardien blindé et trois stabilisateurs ; portail d'extraction. Deux caches d'armes et de soins. Après mort, le bouton rejouer reprend au dernier checkpoint de la partie (après hangar ou avant réacteur). Une nouvelle partie depuis l'accueil recommence à l'arrivée.

Les stabilisateurs se sabotent à portée avec l'interaction habituelle ou se détruisent par quatre impacts laser. Le gardien est invulnérable avant la neutralisation des trois stabilisateurs. Géométrie et collisions partagent le même plan ; pente et plateforme partagent les hauteurs de la physique. Décors statiques regroupés par matériau et géométrie en InstancedMesh.

Validation : tests Node de progression des six étapes, interactions, invulnérabilité, extraction, reprise, continuité de la pente et dégagement des objectifs. Suite existante également exécutée. Aucun navigateur de QA compatible disponible : rendu, confort Quest, performances sur iPhone et durée cible 12–15 minutes non validés. Cette version est une première réalisation jouable, pas une reproduction photoréaliste des images de référence. Éclairage procédural, sans baking ; pas encore de streaming par secteur, sirène dédiée, fumée volumétrique ni Level 2.


## Révision 3.49

Cinq familles de textures locales 512², relief par bump mapping et UV à échelle métrique. Métal rayé, parois jointées, sol à chevrons, caisses nervurées et rochers. Pont roulant, chariot élévateur, cargaisons, fûts, générateurs, armoires, ventilation, conduites, marches antidérapantes et cadre d’extraction. Dix accessoires avec collisions partagées ; dix lots statiques ; scène de décor d’environ 13 190 triangles.

Chaque groupe arrive maintenant par des portails physiques, ouverts 1,6 seconde avant la première sortie ; espacement des arrivées d’au moins 1,35 seconde, maximum cinq adversaires actifs, blocage si le point de sortie est occupé. Aucun ennemi créé instantanément au changement de secteur, gardien compris. Les objectifs attendent aussi les adversaires encore en transit. Les points de reprise rétablissent la séquence de portail. Les portails de renfort se referment après le dernier passage ; celui d’extraction reste ouvert.

Vérification : quatre tests ciblés de mission et de portails, suite complète, construction/déchargement de la scène avec Three.js. Rendu navigateur et essais sur casque toujours non validés.


## Correctif 3.50 — dégâts du gardien et cibles des stabilisateurs

Reproduction avec les vrais tirs R9 : cinq châssis ordinaires éliminables en 3 à 7 impacts au torse dans la fixture. En revanche le gardien rejetait tout dégât avant les stabilisateurs ; les modules lumineux hauts ne recevaient aucun impact, leur géométrie n'ayant pas de collision à 2,5 m. Les deux blocages sont reproduits par des tests qui échouaient avant la correction.

Le gardien dispose désormais de 360 PV et d'une réduction de dégâts maximale de 55 %, réduite à chaque stabilisateur neutralisé (0 % après le troisième). Les dégâts restent toujours possibles, y compris sans toucher aux stabilisateurs. Une indication explique le blindage lorsqu'il est touché. L'extraction demande encore la neutralisation des trois stabilisateurs. Les modules hauts ont des collisions alignées sur leur géométrie et se désactivent après quatre impacts ; ils changent aussi de couleur. L'interaction de proximité reste disponible.

Tests de projectiles : cinq types ordinaires, dégâts du gardien avec et sans blindage, destruction de chacun des trois modules hauts, élimination complète du gardien au R9 avec rechargements même sous blindage. Pas de validation visuelle navigateur ou casque disponible.
