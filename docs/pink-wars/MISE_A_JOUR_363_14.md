# 3.63.14 — Ombres du stand de tir

Base : version 3.63.13 / commit `d8dd151` sur `foenix2018/pink-war`, branche `main`.

Le stand possède désormais quatre plafonniers qui projettent des ombres : box, courte distance et deux travées lointaines. La lumière extérieure de l’arène ne contribue plus à l’éclairage du stand. Les cloisons, tables, garde-corps, boîtiers, pieds et silhouettes de cibles projettent et reçoivent les ombres des luminaires intérieurs.

Les ombres suivent le déplacement et le basculement des cibles. Un assombrissement doux au sol renforce les contacts des parois et équipements fixes ; les pieds des cibles disposent aussi d’un contact mobile. L’arme et les mains de la vue FPS ne créent pas une silhouette flottante sur le décor.

## Budget et cycle de vie

- Profil compatible, iPhone et Quest : quatre cartes de 512 × 512, soit le même total de texels qu’une carte extérieure de 1024 × 1024. Rafraîchissement des travées occupées limité à 6 Hz, hors première activation et changement de cible.
- Profil complet : quatre cartes de 1024 × 1024, soit le total d’une carte extérieure de 2048 × 2048 ; rafraîchissement limité à 10 Hz.
- Les ombres du décor fixe sont calculées puis conservées. Seules les travées concernées par une cible ou le joueur sont mises à jour. Le retrait d’une cible invalide aussi son ancienne ombre.
- Les cartes intérieures ne sont pas actualisées hors du stand, et la carte du soleil extérieur n’est pas rendue simultanément dans ce mode. Les ressources sont libérées à la destruction de la scène.

Les éclairages restent blancs chauds et les cartes PBR de la version 3.63.13 sont conservées. Aucun changement de lore, de niveau, de commande ou de comportement balistique.

## Vérification

Tests dédiés aux budgets, au cache des travées vides, à la disparition des anciennes silhouettes, aux propriétés des cibles et à la libération des cartes. Contrôles des ombres partagées et des commandes du stand. Vérification navigateur en WebGL aux formats ordinateur et iPhone, avec comparaison à éclairage identique entre les ombres désactivées et activées, puis tir et arrêt de l’exercice.

Les 507 tests de la suite complète passent. Les deux parcours navigateur démarrent l’exercice, produisent les quatre cartes d’ombre de 512 × 512 sur le profil compatible, tirent avec le M12 puis arrêtent les cibles, sans erreur JavaScript ni requête manquante. Une comparaison à éclairage et point de vue identiques confirme un assombrissement effectif de 77 326 pixels sur la vue ordinateur ; la capture de référence ne se limite donc pas à des indicateurs d’activation.

Comparaison publiée : `ombres-stand-36314.html`. Captures et résultats locaux : `/workspace/livraison/validation_363_14/`. Un test sur casque et iPhone physiques reste distinct de ces vérifications navigateur.
