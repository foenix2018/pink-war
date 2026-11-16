# AERIN V13 — HUD refait, corps complet, rangement réaliste, vrai saut (14 novembre 2026)

Demande : HUD complet avec de vraies icônes ; retirer le bonnet ; refaire la forme complète du personnage ;
écu dans le dos et épée sur le côté gauche une fois rangés ; vrais sauts et roulades même en marchant ou en courant.

## HUD (dist/game/hud-v13.css, balisage de dist/index.html)

- **Haut gauche** : vie (cœur, barre rouge qui pulse sous 30 %), endurance, bouclier et magie.
- **Haut droite** : aide, vue (1re / 3e personne), pause.
- **Haut centre** : état d'Aerin (GARDE, COURSE, SAUT…) et messages.
- **Bas gauche** : joystick (tactile) et ACCROUPIR ; sur ordinateur, légende des touches à la place du joystick.
- **Bas droite** : Frappe dans le coin, Bouclier, Roulade et Saut en premier arc, Esquive, Cible et Armes en second arc ;
  OUVRIR (coffre) apparaît au-dessus quand il est utilisable. Raccourcis clavier affichés sur ordinateur.
- Icônes : **game-icons.net** (Lorc, Delapouite et contributeurs), licence **CC BY 3.0**, intégrées en SVG
  (crédit dans l'aide du jeu). Les anciennes feuilles `pink-hud.css` et `aerin-v11.css` ne sont plus chargées.
- Contrôle automatique : aucun chevauchement de boutons à 1280 × 760, iPhone 13 portrait et paysage (émulés).

## Corps (dist/game/aerin-body-v13.js)

- Bonnet retiré ; seule la tête d'origine est gardée (visage, yeux, bouche, oreilles, cheveux, cou), complétée
  par une calotte de cheveux.
- Tout le reste est reconstruit sur le squelette : bassin, taille, thorax, épaules, bras (deltoïde, biceps),
  avant-bras, poings gantés, cuisses, genoux, mollets, bottes à semelle et revers, tunique à pans, ceinture à boucle.
- Pondération progressive aux articulations (genoux, coudes, hanches, épaules plient sans cassure).
- L'armure V11 s'y ajuste (grèves agrandies, tassettes retirées car remplacées par les pans de tunique).

## Rangement

- Fourreau en cuir à la **hanche gauche**, toujours porté ; l'épée y est rengainée, poignée vers l'avant.
- Écu **dans le dos**, face vers l'arrière.
- Nouveaux gestes : **Rengainer** (main droite vers la hanche gauche, main gauche passe l'écu par-dessus l'épaule)
  et **Dégainer** (dégainé croisé puis retour en garde).

## Saut et roulade

- Vrai saut : impulsion, gravité, **élan conservé** (marche, course), léger contrôle en l'air, réception.
  ≈ 0,8 m de haut à l'arrêt ; en course, saut en grand écart sur ≈ 2,6 m (mesuré dans le test).
- Possible en marchant, en courant, pendant un coup ; Frappe en l'air = saut frappé sans casser la trajectoire.
- Roulade : garde la vitesse de course (≈ 2,9 m parcourus) et la course reprend aussitôt après.

## Animations : 75

18 GLB + 18 combat (V11) + 33 aventure (V12) + 6 nouvelles (V13) : Rengainer, Dégainer, Impulsion, En l'air,
Saut en course, Réception. Galerie : `dist/atelier-v12.html`.

## Limites

- Corps construit par programme : formes plus réalistes mais simples (pas de sculpture, pas de doigts séparés).
- Le visage reste celui du modèle d'origine.
- Aucun essai sur iPhone, Mac ou PC réel ; rendu logiciel seulement. Le HUD tactile est vérifié en émulation.
- Pas de collision de la cape avec l'écu porté dans le dos (la cape peut le traverser par moments).
