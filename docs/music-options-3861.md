# Musique du jeu — 3.86.1

Les options de l’accueil, de l’arène et du stand affichent « Musique du jeu ».
La même case est ajoutée aux réglages du menu de pause partagé par les niveaux,
ainsi qu’à la pause du chapitre 7.

Le réglage est commun aux menus, chargements et niveaux. Il est enregistré dans
`rosee-settings.music` et ne modifie ni les effets sonores ni les autres options.
La coupure arrête les pistes en cours immédiatement. La réactivation reprend la
musique quand le jeu est actif ; elle garde le silence tant que le jeu est en
pause. Les lecteurs audio existants sont réutilisés.

Validation : 15 tests audio et options de caméra passent. Le navigateur vérifie
les menus réels sur ordinateur et avec commandes tactiles iPhone émulées :
lecture de la piste de jeu, coupure, réactivation, silence en pause, sauvegarde
après rechargement, contrôle du chapitre 7 et options de l’accueil. Aucune erreur
JavaScript. Le script est `tools/verify-music-options.mjs`. La vérification des
commandes de caméra et d’action existantes passe aussi sur les deux interfaces.
