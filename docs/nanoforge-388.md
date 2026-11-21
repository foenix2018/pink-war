# Pink Wars 3.88.0 — atelier de nanoparticules

Le clic droit de la souris lance ou décroche le grappin dans les niveaux de combat, l’arène et le stand. T, la croix gauche de la manette et le bouton du poignet Quest restent disponibles. L’ancien saut ou zoom au clic droit est retiré ; Espace/J servent au saut, Ctrl/O à la visée. Les clics sur les portraits, interfaces et menus ne lancent pas le grappin.

## Découverte → récupération → fabrication

- Treize plans de manipulation nanométrique sont distribués dans le scénario. Les tablettes métalliques lumineuses se récupèrent en s’approchant à moins de 1,8 m, sur le même étage et en vue directe.
- Laboratoire et atelier M01 : matrice de modification et NEXUS V9. Dispensaire et poste radio M02 : condensateur de bouclier et ARES X9. Atelier/archives M03 : stabilisateur, microtreuil et AURORA. JANUS M04 : recycleur de champ et THORN. Ligne 9 M05 : NOVA. Fonderie M06 : armure nanocomposite. Relais de la grotte M07 : filtre de récupération. VOLTIS IEM reste soumis au chapitre 10.
- Une archive de rattrapage permet de retrouver les plans des chapitres précédents dans une partie déjà commencée. Elle contient seulement des plans antérieurs, sans ressources gratuites.
- Chaque ennemi abattu laisse des débris à sa position. Les nanoparticules se récoltent à moins de 1,6 m, avec contrôle des murs et des étages. Quantité : `5 + 2 × rang + masse + bonus élite`, puis bonus éventuel du filtre. Un ennemi plus fort, lourd ou élite donne davantage. Les débris restent trois minutes ; leur nombre est limité à 64.
- Portrait du compagnon → **Atelier nano**. Gaby / GAB-1 assemble pour GHJU ; Cara / CAR-14 pour LYLU. L’atelier est également sur le panneau d’équipement du poignet Quest.

## Résultats réels en jeu

- Fabrication d’armes existantes : NEXUS V9, ARES X9, AURORA, THORN, NOVA et VOLTIS IEM. Elles entrent dans le véritable inventaire et utilisent leurs modèles, animations, munitions et tirs habituels.
- Améliorations par arme : dégâts +10 % par rang (3), durée de recharge −8 % par rang (3). Le prix augmente avec le rang. Les réglages d’une arme n’améliorent pas toutes les autres.
- Configuration de précision : achat unique de la modification, puis bascule gratuite entre impact et précision. Précision : dispersion ×0,6, dégâts ×0,95.
- Équipement : bouclier +10 points/rang (3), récupération +15 %/rang (3), traction du grappin +10 %/rang (2), dégâts à la santé −5 %/rang (3), récupération de particules +15 %/rang (2). Le grappin garde sa portée de 20 m et l’IEM ses dégâts mineurs.
- L’atelier bloque les entrées et la simulation de combat pendant sa consultation. Fermer reprend la partie. Aucun ajustement des vitesses de marche, du sprint, du jetpack ou des animations de déplacement.
- Les particules d’assemblage et de récupération sont dessinées avec des instances Three compatibles WebGPU natif et WebGL. Pas de lumière dynamique supplémentaire. Les supports reposent sur le sol et évitent les colliders ; aucune géométrie n’est recréée par image.

## Sauvegarde

`pink-wars-nanoforge-v1-ghju` et `pink-wars-nanoforge-v1-lylu` conservent indépendamment les plans, la réserve, les créations, les rangs et les configurations. La collecte est sauvegardée par lot ; un achat est enregistré avant application. Un échec d’écriture annule l’achat sans perdre son prix. La restauration d’un ancien checkpoint ne retire pas une fabrication déjà acquise. Le stockage est local à ce navigateur, sans synchronisation de compte.

L’arène et le stand disposent d’un atelier d’essai : tous les plans, 1 500 NP au début de la session, achats réels pour cette session. Ils n’écrivent pas dans la progression du scénario. M07 reste une exploration sans armes : le plan du relais est conservé pour la suite.

## Vérification

- `tests/388-nano-forge.test.mjs` : économie, butin réel, visibilité, hauteur, conditions d’achat, rollback de stockage, dégâts/recharge effectifs, configuration, équipements, sauvegarde, checkpoints, isolation des héroïnes et des modes, restriction IEM, placements réels M01–M06/HELIX, budget graphique et lectures pendant le chargement.
- Suite finale ciblée : **96 / 96 tests réussis**, avec grappin, jetpack de deux secondes, glissade, déplacement iPhone, dix armes XR, GROZA, équipement du compagnon, checkpoints M02, forêt et boucliers.
- `tools/verify-nano-forge.mjs` : Chromium PC/iPhone émulé, exploration au clavier, huit carcasses récupérées, achat de modification et d’arme via l’interface, rechargement de page, profils séparés, clic droit et fabrication avec les rayons du panneau Quest simulés.
- `tools/verify-nano-forge-levels.mjs` : vraies pages M02/M03, plans placés dans le décor, débris des ennemis de la simulation, achat de bouclier puis changement de niveau dans le même navigateur. Les téléportations de diagnostic choisissent le sol du plan : le raccourci historique M02 peut sinon se placer sur le toit.
- `tools/verify-nano-forge-gpu.mjs` : backend WebGPU natif confirmé, tablette, débris et 64 nanites ; scène de test à 9 appels de dessin et 1 638 triangles, aucune erreur JavaScript.
- M07 réel : plan spectral découvert près du relais de la grotte par LYLU, écrit dans son profil, aucune erreur JavaScript. Script de contrôle conservé avec les preuves.
- M02 → M03 réel : 195 NP récupérées, condensateur acheté pour 100 NP, bouclier à 70 ; 95 NP et amélioration conservées au chapitre suivant, puis stabilisateur récupéré.
- Preuves et captures : `/workspace/livraison/pink-wars-nanoforge-20261121/`.
- Tests anciens toujours en échec sur le parent `bcc1577` : deux attentes de `354-level2-gameplay.test.mjs` utilisent les anciennes touches Espace/tir et J/saut ; une attente de `375-m07-scenario.test.mjs` impose une ancienne vitesse minimale. Comparaison faite dans `/tmp/pink-war-nano-baseline`. Les réglages de déplacement validés par l’utilisateur sont conservés.

Les essais iPhone et Quest sont des émulations et des entrées simulées ; aucun appareil physique n’a été testé dans cette session.
