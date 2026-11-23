# Bande-son Pink Wars — 3.93.0

Les dix MP3 fournis le 23 novembre 2026 sont intégrés au jeu. La sélection suit les espaces et le scénario ; elle ne fait pas redémarrer une chanson à chaque ennemi rencontré.

| Niveau / moment | Musique principale |
| --- | --- |
| 1 — Le Dernier Signal | Under the Iron Spire |
| 2 — Les Profondeurs | Locked Corridor |
| 3 — Le Convoi des Oubliés | Under Heavy Siege |
| 4 — Le Protocole Interdit | Overclocked Piston |
| 5 — La Ligne Noyée | The Iron Well |
| 6 — Le Cœur d’Acier | Heavy Machinery Requiem |
| 7 — Mémoires locales | The Iron Well, plus discret |
| 8 — Les Ordres de JANUS | Blackout Protocol |
| 9 — Les Jardins suspendus | The Iron Garden |
| 10 — La Couronne HELIX | Sector Nine Breach |
| 10 — confinement et extraction | Kinetic Collapse |
| Arène / assaut | Kinetic Collapse |
| Planque / stand de tir | The Iron Garden, plus discret |
| Menu et chargement | Morceau du chapitre ou du mode choisi |

Aucun morceau supplémentaire n’est indispensable jusqu’au niveau 10. Un morceau plus apaisé pour la forêt et un thème propre au repos dans la planque seraient utiles pour varier davantage les respirations ; les morceaux actuels couvrent déjà ces passages avec un mix atténué.

## Fichiers et mix

- Sources : **42 457 409 octets** ; versions intégrées : **21 739 067 octets**, soit **−48,8 %**. Les MP3 originaux restent hors du dossier public.
- AAC-LC stéréo à 96 kbit/s, 44,1 kHz, conteneur M4A avec index en tête. Format utilisable par Safari/iPhone et les navigateurs de bureau courants.
- Normalisation EBU R128 en deux passes, cible **−23 LUFS**. Mesures après encodage : **−23,05 à −22,82 LUFS** ; aucun pic ne sature. Les résultats et empreintes sont dans `dist/assets/music/score-3930/manifest.json`.
- Gain du jeu : .36 en exploration, .48 à proximité d’un ennemi vivant ou pendant le final, .40 dans les menus ; coefficient .72 dans la planque, le stand et la forêt. Cela place la musique approximativement autour de −32 LUFS en exploration et −29 LUFS au combat, avant les baisses ponctuelles.
- Pendant les répliques, gain multiplié par .28 (environ −11 dB). Chaque tir audible du joueur réduit brièvement la musique de 4,7 dB, puis elle revient progressivement. Les bus des portes, pas, ambiances et armes gardent leur propre réglage.
- Une seule musique joue à la fois. Le changement de morceau utilise une descente de 180 ms puis une remontée progressive. Le flux conserve sa position pendant une pause ; le mode muet ne peut pas être contourné par un changement de chapitre en attente.
- Lecture native en flux, `preload=none`, aucune décompression intégrale des dix morceaux en mémoire. Le chargement du jeu n’attend pas le téléchargement de la bande-son. Aucun service musical externe.
- L’option « Musique du jeu » reste indépendante des bruitages et conserve sa préférence après rechargement. Onglet masqué, pause et départ de page arrêtent la lecture. L’activation initiale respecte le geste utilisateur ; un refus de lecture automatique ne lance pas une boucle de tentatives.
- Les chapitres 6, 7 et 8 transmettent désormais leur véritable numéro au lecteur, au lieu de réutiliser celui du chapitre 4.

Les anciens morceaux Velvet Siege et Iron Maw restent archivés et crédités mais ne sont plus sélectionnés. Aucune licence tierce n’est présumée pour les créations fournies par le propriétaire du projet.

## Vérification

Tests de sélection, mix, changements de source, annulation, autorisation audio, repli local, indépendance des bruitages et non-régression des tenues. Vérifications navigateur avec les vrais fichiers AAC, les dix chapitres, la boucle, les modes, les dialogues et le réglage musique sur bureau et viewport tactile. Les vérifications Chromium ne remplacent pas une écoute sur iPhone physique.

Résultats : **68 tests ciblés et 1 test de version réussis** ; **20 lectures de chapitre** (10 bureau et 10 viewport tactile), boucle et trois modes vérifiés ; option persistante sur les deux formats ; signal de tir mesuré alors que la musique est coupée. Démarrage réel des chapitres **7 et 10** vérifié en WebGL avec leur bon morceau, sans erreur JavaScript.
