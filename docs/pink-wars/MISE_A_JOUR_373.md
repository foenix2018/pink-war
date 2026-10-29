# Version 3.73 — Traces de vie et détails animés

Les deux niveaux gagnent des affaires personnelles, des fournitures et de petits mouvements pour donner l’impression de lieux utilisés puis laissés en l’état. Les objets sont posés sur le mobilier existant ; les parcours et interactions de mission restent inchangés.

- **Caserne** : sacs souples avec poches et bretelles courbées, paires de bottes, gants à doigts et pouces distincts, clés suspendues au panneau de l’établi, documents décalés, gourdes et traces sèches de chaussures.
- **Archives et serre** : herbier botanique sous la vitrine, godets de semis sur les bacs, arrosoir. Les étiquettes botaniques oscillent autour d’une hauteur fixe, sans dérive liée au nombre d’images. Le bassin est désormais creux, avec eau visible, robinet fixé à la margelle, goutte et ride circulaire discrète.
- **Marché** : sacs et bouteilles près des couchages, conserves, bol avec cuillère, réserve d’eau, cahier et crayons du coin école. Cinq étoffes sont attachées aux montants des étals et bougent légèrement.
- **Dispensaire et HELIX** : plateau de soins, bandages roulés, documents, gourdes et fiches de manutention sur les caisses.
- **Ventilation** : deux ventilateurs de table à la caserne et un au local radio du marché. Les pales accélèrent avec leur propre circuit électrique puis ralentissent après la coupure. Ni ventilateur lié au circuit de l’autre lieu, ni éclairage dynamique ajouté.

Le mobilier garde ses emprises de collision. Les petits accessoires sont décoratifs et ne créent pas de nouvelles actions. Les marques de pas et de tasse sont des décalques plats. La fuite du bassin est un effet d’ambiance, indépendant des circuits électriques et des mécaniques de mission.

## Réalisation et coût

`dist/vesper-lived-in.js` construit une couche séparée et réutilise les matériaux physiques de la 3.72, avec quelques variantes de couleur. Les pièces fixes sont regroupées par matériau. Seuls les trois jeux de pales, cinq étoffes et l’effet d’eau s’animent. Aucun chargement externe, lumière supplémentaire, nouvelle boucle de rendu ou canevas actualisé par image. Les objets reposent sur leurs supports, notamment les comptoirs surélevés et les couvercles des caisses.

Les objets et animations sont présents en qualité basse avec moins de subdivisions et de marques au sol. L’assemblage est idempotent ; les géométries et ressources propres à cette couche peuvent être libérées sans supprimer les textures partagées du décor.

## Vérification

- `npm test` : **673 tests réussis**, aucun échec, test ignoré ou annulé.
- Onze contrôles ciblés passent après les derniers ajustements : positions sur les supports, absence de mutation des obstacles, budgets de lots et triangles, géométries finies, absence de nouvelles lumières, construction unique et libération des ressources, mise sous tension et arrêt progressif des ventilateurs, eau visible sous la margelle, portes, matériaux et circuits.
- Chromium / SwiftShader : les deux chapitres démarrent en fenêtre tactile 390 × 844 sans erreur JavaScript, avertissement de décor désactivé ni ressource manquante. Le parcours contrôlé de la caserne jusqu’au groupe électrogène allume les écrans et les ventilateurs.
- Les deux extensions sont également rendues en qualité normale pour examiner les ajouts. Ces vues rapprochées utilisent un éclairage de présentation ; les règles d’éclairage du jeu sont conservées.
- Pas d’essai sur iPhone ou Quest physiques, ni de mesure de cadence matérielle. Aucune publication en production.

[Affaires personnelles](373-vestiaires.jpg) · [Établi](373-atelier.jpg) · [Herbier](373-herbier.jpg) · [Bassin](373-bassin.jpg) · [Cuisine](373-cuisine.jpg) · [Couchages](373-couchage.jpg) · [Soins](373-soins.jpg) · [Rapport](LIVED_IN_373_BROWSER_VERIFICATION.json).
