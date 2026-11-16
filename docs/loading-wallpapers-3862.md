# Fonds de chargement — 3.86.2

Les illustrations des niveaux remplissent l’écran en portrait et en paysage.
Les boutons de sélection des personnages, Retour et Commencer, le texte de
chargement et la jauge ne sont plus dessinés par-dessus pendant le chargement.
Le personnage choisi dans l’accueil est conservé ; le jeu démarre automatiquement.

En portrait, chaque couverture possède un cadrage sur le personnage : GHJU ou
LYLU lorsque les deux figurent sur l’illustration, le sujet présent sinon.
Les 20 couvertures existantes sont prises en charge. La Couronne HELIX utilise
son illustration du chapitre 10, et la forêt le fond du chapitre 7. Cela ne crée
pas de nouveaux chapitres jouables. L’arène et le stand affichent aussi leur
illustration seule, sans panneau de progression.

La progression réelle reste disponible aux lecteurs d’écran. En cas d’erreur,
les commandes de récupération redeviennent visibles. Les menus de défaite et
de fin ainsi que l’entrée de diagnostic `?manual=1` restent utilisables.

Validation : 8 tests de chargement et de démarrage passent. Le navigateur vérifie
40 combinaisons de couverture/personnage en portrait, le paysage, les boutons
de récupération, l’entrée manuelle, le passage de la page forêt au jeu, l’arène
et le stand, sans erreur JavaScript (`tools/verify-loading-wallpapers.mjs`).
Le niveau 3 complet démarre également sans clic et sans paramètre `autostart`,
avec l’interface iPhone émulée et le rendu WebGL de compatibilité : fond seul,
puis niveau en cours d’exécution, sans erreur JavaScript.
