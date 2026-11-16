# Aerin V15.1 — réparation de la V15 Cheveux

Projet de jeu indépendant, prêt à importer sur Vercel. Base : archive Aerin V15 Cheveux fournie par l’utilisateur.

## Jouer

Sur ordinateur, extraire le ZIP et ouvrir `index.html` à la racine du pack : ce fichier intègre le modèle, les scripts et les styles. Sur iPhone, utiliser la version hébergée HTTPS dans Safari ; Fichiers/Aperçu rapide n’exécute pas correctement un jeu HTML local.

Pour servir les sources : `python3 -m http.server 8082 --directory dist`, puis ouvrir http://localhost:8082 et toucher **JOUER**.

## Réparations

- Démarrage avec le moteur WebGL fourni dans le projet, sans téléchargement depuis un CDN.
- WebGPU conservé en option avec `?renderer=webgpu`. Repli local si le téléchargement ou l’initialisation dépasse le délai.
- Le premier affichage de la page ne met plus automatiquement en pause le jeu autonome. Un vrai retour depuis le cache Safari relâche toujours les commandes et met en pause.
- Le générateur du HTML autonome lit désormais le modèle et le code actuels de `dist/`, sans dépendre d’un ancien HTML.
- Le lien Atelier ouvre la galerie actuelle du chevalier et de ses cheveux.

Les 36 mèches, le corps V13, les 75 animations, les combats et le HUD mobile V14 sont conservés.

## Vercel

Importer ce dossier comme un **nouveau projet nommé aerin** : preset Other, répertoire racine du projet, aucune installation ni compilation, sortie `dist` (réglages dans `vercel.json`).

La création automatique via la connexion Vercel a encore été refusée en 403 après validation de l’accès. Ce dossier est prêt à déployer, sans prétendre qu’un déploiement Vercel existe.

## Blender

`blender/Aerin-V15.blend` (livré séparément du ZIP du jeu) : armature RLH à 41 os, 75 actions, corps et cheveux V15 éditables. Les cheveux sont rattachés à la tête ; la physique Verlet des mèches et les mouvements secondaires du jeu ne sont pas cuits dans Blender. Le matériau toon a été adapté en matériau standard pour l’échange. Le corps original masqué est conservé pour l’armature.

## Vérifications

Contrôles syntaxiques et contrats existants ; démarrage avec requêtes externes bloquées ; délai de repli WebGPU ; HTML autonome sans ressources externes ; mouvements des cheveux ; commandes tactiles sur quatre iPhone simulés. Résultats V15.1 dans `qa/`. Pas de test sur un iPhone physique ni de validation de Safari natif.

Le navigateur de test interdit `file://` : le HTML autonome a été servi seul par HTTP en bloquant les ressources externes.

Les éléments RLH/Mixamo gardent leurs conditions d’utilisation d’origine. Licences Three.js dans `dist/preview/`.
