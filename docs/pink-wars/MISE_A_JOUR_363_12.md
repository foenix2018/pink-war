# 3.63.12 — Musique d’accueil, pas RLH et résistance des robots

27 octobre 2026. Reprise de la production 3.63.11, commit `afd7a85`, avec les ombres et l’arrivée calme conservées.

## Musique fournie par le créateur

Le fichier « Acceuil - velvet_siege.mp3 » joint à la conversation est la source de la musique de l’accueil et des chargements de **tous les niveaux**. La sélection du niveau 2 ne remplace plus Velvet Siege par Iron Maw et ne redémarre plus la piste. La lecture s’arrête au prologue, à l’entrée en jeu, à la désactivation du réglage musique ou à la sortie de la page ; un tir ne peut pas la relancer.

Encodage AAC LC stéréo à 64 kbit/s, 32 kHz, contrôle de niveau et fondus très courts : environ **1,21 Mo au lieu de 3,56 Mo**, soit environ 66 % de réduction. Lecture native en flux et boucle ; déverrouillage par geste utilisateur du navigateur. Source et empreintes dans `dist/assets/music/credits.json`. Iron Maw reste une ressource archivée, sans sélection dans le jeu actuel. Aucune licence de bibliothèque n’est attribuée à la musique fournie par le créateur.

## Pas repris de RLH

Source réelle : dépôt `foenix2018/RLH`, commit `99698f74d72aaf7ab95000b86180772417ecb636`, `assets/audio/pas_v579.mp3`. L’enregistrement correspond au champ `step` du pack `js/chunks/audio-pack-v579.js`, lu par `loadRecordedAudioV577` et `updateMovementAudioV575`. Réutilisation explicitement demandée par le propriétaire ; ce son n’est pas présenté comme CC0.

Quatre pas sont isolés de la prise, chacun de 0,42 s, et emballés en PCM mono 16 bits / 32 kHz. Total : environ **105 Kio**. Le déclenchement reste lié à la distance réellement parcourue, avec alternance et petite variation de vitesse, adaptation au déplacement accroupi et filtrage selon le support. Aucun pas en poussant un mur, dans les airs, sur un ascenseur, après téléportation ni en pause. La pause coupe aussi les pas en cours ; un téléchargement terminé ne déclenche pas de son retardé.

Ce raccord passe par l’ambiance partagée de M01, M02, l’arène et AT HOME. Le vent et les effets d’environnement restent actifs séparément de la musique. Un repli synthétique immédiat subsiste si un enregistrement ne peut pas être lu.

## Fusil à pompe de LYLU

Le M12 utilise désormais la **détonation complète d’un véritable Winchester Model 12 à pompe, calibre 12**, extraite du fichier `Model 12/K_17P.wav` de The Free Firearm Sound Library. La feuille de prises de la bibliothèque confirme l’arme et l’enregistrement. Source primaire : https://opengameart.org/content/the-free-firearm-sound-library ; fichier préparé récupéré dans le miroir public `petroulacl/fps-asset-kit`.

Licence CC0, auteurs Ben Jaszczak, Brian Nelson, Kevin Heras et Matthew Nanney. Extrait de 1,05 s commençant juste avant la première détonation, avec corps et réverbération, filtrage à 65 Hz, pic à -4 dBFS et fin adoucie. Il remplace l’ancien court extrait d’ambiance ; l’action mécanique et une couche énergétique discrète conservent la signature fictive du M12. Source, transformation et empreintes dans `dist/audio/combat/manifest.json` et `CREDITS.md`.

## Résistance par châssis

La santé des robots normaux est différenciée et croît progressivement avec les rencontres/vagues. La résistance supplémentaire ne modifie pas les dégâts ou la précision des armes, et ne crée aucun nombre minimum de coups obligatoire : plusieurs projectiles, points faibles, dégâts chargés et compétences fonctionnent toujours normalement.

| Châssis | Santé de base | Tirs M12 au torse à 5 m, test balistique contrôlé |
| --- | ---: | ---: |
| Sonde | 100 | 1 |
| Scuttler | 140 | 1 |
| Stalker | 180 | 2 |
| Seer | 210 | 2 |
| Synth | 250 | 2 |
| Listener | 275 | 2 |
| Brute | 340 | 3 |
| Bulwark | 400 | 4, avec sa réduction de dégâts au torse |

Les capteurs/têtes restent des points faibles. La portée, le nombre de projectiles qui touchent, le niveau et les améliorations changent ces résultats. Les unités élites sont encore plus résistantes. AT HOME garde son coefficient de résistance existant pour le combat dans une pièce ; le budget de mission M01 reste à trente-deux ennemis finis.

## Vérifications

**498 tests automatisés réussis.** Les nouveaux contrôles utilisent les vrais projectiles du M12 et les impacts du moteur sur les huit châssis, et vérifient les pas enregistrés, les téléchargements uniques, la pause, les supports et les empreintes des fichiers. Les anciennes vérifications de silence musical en jeu restent actives.

Contrôle navigateur : accueil au format mobile, sélection M02 sans changement/redémarrage de musique, chargement avec Velvet Siege puis arrêt en jeu ; M01 avec lecture réelle du WAV M12 de 1,05 s, quatre clips de pas décodés et pas déclenchés par le déplacement clavier ; pause/reprise et silence musical conservés, sans erreur JavaScript ni téléchargement audio en échec. La qualité perçue et l’équilibrage restent à essayer sur les appareils du créateur, notamment iPhone et Quest physiques.

Dernier contrôle du passage accueil → vraie page M02 : l’intention audio donnée par le geste utilisateur est conservée dans la session de l’onglet. Le nouveau document tente la reprise autorisée par le navigateur ; les écouteurs de geste restent le repli si le navigateur refuse. Dans Chromium au format mobile, Velvet Siege est effectivement en lecture pendant le chargement après navigation, puis la règle d’arrêt en jeu reste active. Les trois tests de musique ont été rejoués et réussis après ce raccord.
