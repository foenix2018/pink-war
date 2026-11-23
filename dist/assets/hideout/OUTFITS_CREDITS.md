# Présentoirs des cinq stades — Pink Wars 3.92

`outfit-{ghju|lylu}-{1..5}.pwm.gz` : captures statiques des vrais corps, armures, capes et gants de Pink Wars, posés sur les présentoirs de la planque par `hideout-showcase.js`. Les squelettes et animations originaux sont préservés dans le jeu ; les captures n’en ajoutent aucun à la planque.

Les modifications de formes, les modules articulés et les textures de céramique et de composite sont originaux, dans `hero-outfit-stages.js`. Elles suivent les cinq matériaux de l’illustration fournie par l’utilisateur. Les couleurs identifient GHJU en rose et LYLU en bleu. Les ressources originales du personnage et leurs crédits conservent leurs fichiers dans `assets/heroes` et les sources existantes.

Génération reproductible : `SHOWCASE_SCOPE=outfit SHOWCASE_HERO=ghju SHOWCASE_STAGE=2 node tools/build-hideout-showcase.mjs`. Répéter pour les deux héros et les cinq stades. Le fichier `showcase.pwm.gz` commun se génère avec `SHOWCASE_SCOPE=common` et contient exclusivement les onze armes et les deux sphères canoniques.
