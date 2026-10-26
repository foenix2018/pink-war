# Audio — 3.63.7

Livraison du 26 octobre 2026, sur la base GitHub et Vercel 47edbed (3.63.6).

## Décision du créateur

Velvet Siege et Iron Maw sont réservées à l’accueil et aux écrans de chargement. Aucun morceau de fond dans les parties Histoire, Arène, Stand et At Home ; l’ancienne nappe synthétique est également retirée de ces parties et du prototype autonome Couronne HELIX. Vent, ambiances d’installations, pas, combat et narration restent actifs. Le prologue conserve ses courts motifs originaux ; les deux morceaux ne s’y superposent pas.

Le choix de M01 à l’accueil joue Velvet Siege, celui de M02 joue Iron Maw. Un seul flux musical est actif par page ; le chargement reprend le même flux lorsque la page le permet. Le retrait du masque de chargement coupe la musique. Reprendre une partie ou tirer ne la relance pas. Le réglage s’appelle désormais « Musique des menus et chargements ». Le navigateur demande toujours un premier geste pour autoriser l’audio ; après une navigation complète, un chargement très court peut être silencieux tant qu’aucun geste n’a été effectué sur la nouvelle page. Aucun contournement des règles iOS d’autoplay.

## Combat

- Trois enregistrements métalliques Kenney CC0 : light 002, medium 002, heavy 000. Variation cyclique et légère variation de hauteur, avec atténuation à distance. Les surfaces robot/métal les utilisent ; le béton conserve son propre son.
- M12 de LYLU : détonation de fusil à pompe de The Free Firearm Sound Library (Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney), enrichie du profil énergétique existant et d’un retour mécanique différé.
- Verrouillage des rechargements : mécanisme de SpringySpringo, Gun reload sounds.
- Les cinq voix laser Kenney déjà livrées sont enfin préchargées dans M01 et M02, ainsi que les nouveaux effets. GHJU conserve ses pistolets et sa signature ; les profils énergétiques des autres armes restent distincts. Les mêmes effets sont chargés dans les autres moteurs.
- Décodage unique par contexte audio, sons en mono PCM 16-bit 32 kHz, chemins locaux, gain maîtrisé, nombre d’impacts simultanés plafonné, nettoyage des voix et arrêt des sons programmés en cas de coupure des effets. La synthèse prend le relais immédiatement si un fichier manque.

Cinq nouveaux WAV : **103 814 octets** au total. Les sources sont individuellement CC0, vérifiées sur les pages des auteurs/banques et leurs miroirs. Sources, auteurs, transformations et empreintes de chaque fichier : `dist/audio/combat/manifest.json` et `CREDITS.md`. Les autres fichiers du miroir OpenSpades sous des licences différentes ne sont pas importés.

## Validation

- **483/483 tests** : sélection et variation des impacts, béton distinct du métal, atténuation, enregistrements M12/rechargement, silence après désactivation, plafond de voix, ressources libérées, repli si téléchargement manquant, empreintes/licences/poids.
- Chromium réel : accueil en affichage ordinateur et mobile tactile émulé ; les deux AAC progressent, chargement puis arrêt à l’entrée en jeu, réglage musique.
- Moteurs M01 et M02 : préchargement local des dix enregistrements, tir tactile du M12 consommant une cartouche et démarrant l’enregistrement décodé ; musique absente pendant le jeu et après pause/reprise ; aucune erreur JavaScript. Rendu logiciel limité après la première image dans le banc d’essai pour tester l’audio, sans modification de production.
- Pas de test physique Safari/iPhone ni de session Quest pendant cette livraison. L’écoute subjective et le réglage fin de la balance restent à valider sur l’équipement du créateur.
