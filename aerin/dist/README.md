# Aerin

Nom de code du jeu : **Aerin**. Personnage elfique animé sur le squelette du pompier RLH, avec un HUD de combat inspiré de `foenix2018/pink-war`.

## Jouer

Application statique autonome, sans installation de dépendances pour jouer.

```sh
python3 -m http.server 8082 --directory dist
```

Ouvrir http://localhost:8082. Le dossier `dist/` est directement publiable sur Vercel avec le `vercel.json` fourni.

## HUD iPhone

- Détection automatique du tactile ; joystick gauche pour déplacer et joystick droit pour regarder.
- Quatre attaques, bouclier maintenu, esquive et saut avec de grandes cibles tactiles.
- Formats portrait et paysage, marges pour l’encoche et la barre d’accueil.
- Mise à l’échelle du rendu adaptée au mobile ; choix « Fluide · iPhone » / « Standard · ordinateur ».
- Sur Safari : Partager → Sur l’écran d’accueil pour ouvrir Aerin en mode autonome.
- Les commandes sont relâchées et le jeu se met en pause lors d’un changement d’application, d’une perte de focus ou d’un retour depuis le cache de page Safari.
- Réglages : grandes commandes tactiles, sensibilité et qualité, mémorisés sur l’appareil.

Le jeu propose trois mannequins qui reçoivent des dégâts et ripostent. La protection fonctionne face à l’attaque et consomme de l’endurance. Les vues première et troisième personne sont disponibles.

## Ordinateur

ZQSD/WASD : déplacer ; Maj : courir ; Espace/clic : attaquer ; B/clic droit : bouclier ; 1–4 : coup ; E : esquive ; J : saut ; V : vue ; Échap : pause.

## Sources

- `dist/game/aerin-game.js` : simulation, contrôles, animations et combat.
- `dist/game/hud.css` : HUD commun.
- `dist/game/mobile.css` / `mobile.js` : iPhone, zones sûres, viewport Safari et qualité.
- `dist/assets/aerin.glb` : modèle avec 41 os et 15 animations.
- `dist/atelier.html` : inspection des animations et liens vers les sources Blender/FBX.
- `tests/iphone.cjs` : contrôles de mise en page, tactile et cycle de vie.

L’armature et la locomotion proviennent du projet RLH fourni par l’utilisateur. La géométrie et les animations de combat ont été créées pour Aerin. Le HUD de Pink War a servi de référence (organisation et doubles joysticks). Les conditions d’utilisation d’origine des éléments RLH/Mixamo restent applicables. Les licences Three.js sont incluses.

## Vérifications

Le HUD de base a passé 19 vérifications clavier/tactile simulées (`hud-validation-v1.json`). Les vérifications iPhone couvrent les formats SE, 13 et Pro Max, les encoches simulées, les boutons d’au moins 44 pixels et les contacts simultanés. Résultats dans `iphone-validation-chromium.json`.

Aucun essai sur iPhone physique. L’installation du moteur WebKit a été bloquée par la politique réseau de l’environnement (HTTP 403 sur les domaines de téléchargement Playwright) ; ne pas présenter ces tests comme une validation de Safari natif.

Le projet n’ajoute pas de VR. Il n’a pas de service worker : la première ouverture requiert une connexion réseau.

## Déploiement Vercel

Le code est publié dans `foenix2018/pink-war`, branche `aerin-iphone`, dossier `aerin/`. Lors de l’import Vercel, choisir cette branche, le dossier racine `aerin`, le preset **Other**, aucune commande d’installation ou de compilation et le répertoire de sortie `dist`. Le nom souhaité est `aerin`.

La création du projet dans l’équipe FLASHOVER X a été refusée par Vercel (403, permission insuffisante). Le projet n’est donc pas annoncé comme déployé sur Vercel. Un accès autorisant la création du projet est nécessaire.

Pour rejouer les tests : `npm install`, `npx playwright install chromium`, lancer `npm run dev`, puis `npm run test:iphone` ou `npm run test:hud` dans un autre terminal. Le navigateur système est utilisé quand disponible ; `CHROMIUM_PATH` et `BASE_URL` peuvent être définis.
