# 3.63.6 — Routes et structures, adaptation de RLH

Adaptation demandée par le propriétaire des projets Pink Wars et RLH. Base Pink Wars : 3.63.5 (`e684509`). Source consultée : dépôt `foenix2018/RLH`, commit `99698f74d72aaf7ab95000b86180772417ecb636` (V773). Les fichiers RLH restent inchangés. Empreintes des sources consultées dans [SOURCES_RLH_363_6.json](SOURCES_RLH_363_6.json).

## Éléments repris et adaptation

- **Chaussée** — `js/modules/environment/vr-streetscape-v748.js`, fonction `asphaltTexture` : génération déterministe du grain, fissures en segments et reprises sombres. Adaptation en 512 pixels avec couleur sRGB et matériau rugueux. Six reprises localisées dans la cour et la rue de M01 complètent le fond photographique Poly Haven de la 3.63.5. La simulation de sol reste inchangée.
- **Organisation industrielle** — `js/modules/environment/vr-factory-site-v749.js` : marquages d’accès autour du matériel et matières sobres. Des bandes usées délimitent l’ancien emplacement de triage de Vesper ; les marques et noms de RLH ne sont pas transposés dans le lore.
- **Charpente** — `js/legacy-09.js`, `buildHangarMaintenance` : principe des portées métalliques et supports de toiture visibles. Les poutres de Pink Wars sont remodelées en profilés en I, avec âme, ailes, plaques de raccord, fixations et petits renforts diagonaux. Deux poutres de 10 m portent l’auvent existant. Leurs volumes de collision sont ajoutés au même endroit, au-dessus des passages.
- **Effet d’installation** — `js/modules/scenarios/vehicle-fire-fx-v299.js` : bruit interpolé à plusieurs échelles et nombre borné de particules. Adaptation en vapeur légère au débouché d’un conduit sous l’auvent, pilotée par la remise sous tension et le temps de simulation. Huit particules en mode performance, seize autrement. L’effet utilise une texture et un lot instancié, sans shader GLSL propre à RLH, seconde scène ni lumière dynamique.

Ce travail est une adaptation autorisée des sources du projet de l’utilisateur, **pas une nouvelle attribution CC0 à RLH**. Les textures photographiques Poly Haven conservent leurs crédits distincts.

## Intégration et vérification

Module partagé : `dist/rlh-environment.js`, intégré dans `createCampaignArt`, pour M01 et son moteur classique. Les colliders des poutres et du conduit entrent dans la simulation existante. Les héros, les armes, les objectifs, les journaux et les limites du niveau sont conservés.

Tests : deux approches M01 parcourues avec les nouvelles collisions ; particules bornées, arrêt avant réarmement, stabilité à temps de simulation constant, nettoyage des ressources et budget de géométrie. Contrôles navigateur ordinateur/iPhone émulé : démarrage, interactions des isolateurs, courant, tir, recharge, pause/reprise et captures du décor. Les performances physiques Quest/iPhone restent à mesurer sur appareil.

## Musiques fournies par le créateur

> Historique 3.63.6 : leur usage en partie est remplacé en 3.63.7 par la règle [accueil et chargements uniquement](./AUDIO_363_7.md).

- M01 : **Velvet Siege**, 148 secondes, 3 558 988 → 1 212 419 octets.
- M02 : **Iron Maw**, 177 secondes, 4 256 142 → 1 451 876 octets.
- Total : 7 815 130 → 2 664 295 octets, soit environ **66 % de réduction**.

AAC LC stéréo, 64 kb/s, 32 kHz, normalisation cible -22 LUFS / plafond -3 dBTP, courts fondus de début et de fin. Les MP3 originaux ne sont pas ajoutés au dépôt. Provenance et empreintes dans `dist/assets/music/credits.json`. Les fichiers sont servis localement et lus en streaming, en boucle native, sans décoder la totalité des morceaux en mémoire ni créer de contexte audio supplémentaire.

Le gain de fond est de 0,58 ; un tir du joueur le réduit à 0,29 (environ -6 dB), avec attaque courte et remontée progressive. Pause et réglage musique conservent la position de lecture ; un refus d’autoplay attend un nouveau geste au lieu de relancer à chaque image. La musique est indépendante du réglage des bruitages. M01 utilise la piste dans les deux moteurs, M02 dans son moteur de mission ; l’ambiance synthétique de l’Arène et du Stand est conservée.

Les deux fichiers AAC ont été décodés et lus dans Chromium avec vérification du volume, de la pause, de la reprise et du silence après désactivation. L’écoute et la balance finale restent à ajuster au besoin sur le casque et les écouteurs utilisés par le joueur.

Validation finale : **478 tests réussis**. Lecture des deux pistes dans leur véritable moteur M01/M02, contrôles tactiles émulés, pause/reprise et absence d’erreurs JavaScript vérifiés. Mesures après compression : -20,89 / -21,04 LUFS intégrés et crêtes réelles -5,30 / -5,07 dBTP, avant le gain de fond du jeu.
