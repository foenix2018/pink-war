# 3.51 — Avant la Chute, prologue et unités ORDRE

Livraison du prologue **P00-01 à P00-06**, suivant `STORYBOARD_V1.md` §3. La chronologie, le lien frère/sœur et le parcours M01 de la livraison 3.50 restent les références. Les modèles réels Shadow Unit de GHJU et LYLU, leurs casques, gants, capes, squelettes et armes sont conservés.

## Prologue du mode histoire

Six illustrations originales : Vesper habitée en 2189 (6 s), le poste de secours avec GHJU et LYLU (6 s), la révolte d’ORDRE / la déchirure (4 s), l’évacuation sur deux chemins (8 s), la séparation sans décès confirmé (5 s), Vesper en 2196 (5 s). Les images reprennent la silhouette et les équipements des rendus de production ; elles ne constituent pas de nouveaux modèles jouables. Ni Nharis ni le choix final ne sont dévoilés.

Les tableaux défilent automatiquement, avec fondus, léger mouvement de cadre et textes français. L’action finale lance M01 sur un geste explicite, également utilisable avant l’initialisation WebXR. Pause, précédent/suivant, navigation directe et passage immédiat sont disponibles. Le prologue se revoit depuis le panneau d’histoire de l’accueil. La lecture s’interrompt lorsque la page est masquée ; le mouvement peut être réduit par les préférences système. Le clavier et le tactile utilisent les mêmes commandes.

Le menu et le film n’importent pas le moteur 3D. Six WebP locaux, environ **1,3 Mo au total**, préchargés progressivement ; aucun téléchargement tiers. Un motif original de quatre notes et un souffle discret respectent les préférences musique/son. Pas de musique, personnage, asset ou code d’IA emprunté à Halo. Cette influence concerne le rythme militaire et les rôles tactiques, dans l’univers propre de Pink Wars.

Le lancement direct de M01 propose également le prologue. La transition depuis l’accueil et la reprise d’un point de contrôle ne le rejouent pas une deuxième fois. Arène, stand et AT HOME n’interrompent pas leur lancement avec ce film.

## Chara-design des ennemis

- Casques optiques fermés, visières et mâchoires continues à la place des détails évoquant des dents.
- Épaulières et avant-bras à plaques profilées, chanfreins plus doux, fixations articulées. Le canon d’épaule est resserré autour de son mécanisme ; sa sortie balistique conserve son repère réel.
- Alliages satinés, peinture militaire et céramique claire pour N-08 ; micro-rayures et rugosité locale, sans appliquer la même grosse rouille à toutes les pièces.
- Les huit silhouettes demeurent distinctes : poursuivant, sentinelle, brute, rempart, traqueur, N-08, rampant et sonde. Leurs capteurs restent bleus au repos et rouges lors de l’alerte/engagement.
- Les poses de couvert, visée, protection et préparation de charge utilisent les articulations existantes et les pieds restent résolus par cinématique inverse. Géométries mutualisées, six lots de matériau au maximum, moins de 11 000 triangles par variante.

## Comportements locaux

- Le couvert, auparavant réservé à N-08, s’applique aux autres tireurs terrestres : déplacement derrière un mur réel, attente, sortie courte, deux tirs puis repli. Un tir proche peut interrompre la sortie.
- Les poursuivants et rampants tentent un contournement limité à distance, sur des côtés différents ; les collisions et la navigation restent prioritaires. Au contact, ils retrouvent leurs positions de mêlée réparties autour de la cible.
- Les brutes annoncent une courte charge, dirigée vers une position verrouillée au début de la préparation. Le joueur peut s’écarter ; aucun suivi magique ni téléportation.
- Le rempart peut s’interposer devant une sentinelle, un traqueur ou N-08 proche et relever ses avant-bras. Cette posture ne confère pas une invulnérabilité supplémentaire.
- Les tireurs retiennent leurs tirs si un allié coupe la ligne du canon. N-08 et les traqueurs transmettent un contact visuel à courte portée, avec temporisation et ligne de communication dégagée ; le récepteur enquête et doit voir la cible lui-même avant de tirer.
- Les décisions utilisent la dernière perception connue. Aucun accès à la position actuelle d’un joueur caché. Les tirs proches sont analysés sur le trajet réellement parcouru par le projectile, arrêté par les obstacles. Un ennemi étourdi interrompt aussi son déplacement.

La campagne conserve huit patrouilleurs initiaux, trois vagues de huit, huit ennemis actifs au maximum et la progression R9 → BLOOM → LANCE. Les comptes santé/munitions du HUD sont préservés. Le système de sondes et les escaliers/ascenseur de M01 sont maintenus.

## Vérification

**379 tests automatisés réussis**, puis contrôles navigateur ordinateur/tactile et lecture réelle de pixels WebGPU sous Vulkan logiciel (11 surfaces locales sur 11 chargées). Les tests de la livraison vérifient les couvertures en simulation complète, les tirs bloqués par murs et alliés, le contournement limité, la charge annoncée, la transmission locale, les capteurs visibles et les budgets de maillage. Les contrôles navigateur couvrent le prologue ordinateur/tactile, son rejeu, son passage, la transition M01, le tir/rechargement et le parcours de la carte.

Les illustrations restent des tableaux fixes animés, pas des cinématiques 3D ni un doublage enregistré. La validation navigateur et Vulkan logiciel ne mesure pas la fluidité d’un iPhone ou d’un Quest réel. Les cinématiques M01 et les missions ultérieures restent des livraisons distinctes.
