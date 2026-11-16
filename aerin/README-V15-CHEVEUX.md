# AERIN V15 — Cheveux mi-longs animés (14 novembre 2026)

Module `dist/game/aerin-hair-v15.js`, chargé après le corps V13.

- **36 mèches** en rubans effilés, couleur des cheveux d'origine, racines un peu plus sombres :
  arrière et nuque jusqu'aux épaules (≈ 30 à 37 cm), couche haute, côtés jusqu'à la mâchoire et au-delà,
  mèches qui encadrent le visage. La frange et la calotte V13 restent en place.
- **Mouvement** : chaque mèche est une chaîne de 7 points simulée à 120 Hz (Verlet) — gravité, inertie du corps,
  rappel vers la coiffure (fort à la racine, libre aux pointes), collisions avec le crâne, le cou, le haut du
  buste et les épaules. Les cheveux suivent la course, les sauts, les roulades, les coups et la mort animée,
  puis retombent en place.
- Rendu cel shading (matériau toon du V12), masqués en vue 1re personne.

Mesuré dans le test (`tests/v15-hair-browser.cjs`, rendu logiciel) : pointes à 1,24 m pour des épaules à 1,32 m ;
jusqu'à 30 cm de balancement des pointes pendant course + saut + roulade ; moins de 5 cm d'écart une fois au calme.

Limites : rubans sans contour encré (trop fins pour la coque) ; pas de collision des mèches entre elles ni avec
l'écu porté dans le dos ; coût de calcul non mesuré sur iPhone (≈ 250 points simulés par image).
