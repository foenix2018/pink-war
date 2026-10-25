# 3.63.4 — M01, cour du convoi et aile technique

25 octobre 2026. Premier lot jouable de la [mission longue](PLAN_M01_20_25_MIN.md). **Cible de cette première séquence : 6–8 minutes à mesurer en découverte.** La mission complète de 20–25 minutes reste à construire par lots ; aucune durée ni performance sur matériel physique n’est annoncée comme acquise.

## Ce qui est jouable

- Départ déplacé dans la cour sud-ouest. Enveloppe du niveau portée de 77 × 144 m à **120 × 160 m**, sans déplacer l’annexe, la boutique, le carrefour ni le relais du book.
- Deux approches physiques : **convoi** avec abris profilés, épaves et poste électrique ; **aile technique** traversante avec triage abandonné, lits, matériel et liaison couverte vers l’annexe. Les deux routes permettent le repli et rejoignent le même circuit.
- Avant le réarmement, isoler l’un des deux départs électriques. Les deux commandes sont utilisables, même si le guide indique la plus proche. Le bouton contextuel et le repère d’objectif accompagnent cette action.
- Huit machines initiales réparties entre surveillance, défense d’angle et écran. Une sonde est visible depuis le départ. Les postes utilisent la perception et les couverts du moteur commun ; l’alarme transmet le lieu fixe du circuit, sans suivre un joueur caché.
- Quatre renforts annoncés au rétablissement du courant, puis quatre après la lecture du premier journal, dans le même budget de rencontre. Un portail est choisi sur un accès libre et connecté, à au moins 14 m du joueur. Si les huit places actives sont occupées, les renforts attendent.
- **32 hostiles au total, huit actifs au maximum**, sans génération infinie. Après les huit initiaux et les huit premiers renforts, les deux groupes suivants de huit gardent la mission finissable jusqu’au relais.
- Sons courts originaux de coupure électrique et d’alerte de brèche, avec atténuation et panoramique ; aucune nouvelle musique ni dépendance audio distante.
- Points de contrôle supplémentaires après l’isolation et après la sécurisation des premiers renforts. Sauvegarde v2 de santé, bouclier, charges, armes et état du circuit. Les anciens points de contrôle v1 restent lisibles.

## Continuité et sources

Les quatre pôles, les deux journaux, BLOOM/LANCE, le sabotage et le relais à +4,8 m restent ceux du [Tome II](TOME_II_PRODUCTION_V1_2.md) et du [storyboard](STORYBOARD_V1.md). Cara et Gaby ne sont pas avancées avant M07. Les modèles actuels de GHJU/LYLU, leurs gants, leurs armes et le HUD C sont conservés. La signalétique évoque les secours et l’évacuation, sans ajouter de révélation au récit.

Les géométries et collisions des nouvelles ouvertures viennent de `tools/m01_courtyard.py`, appelé par le générateur de layout. Le décor a été reconstruit dans Blender 4.3.2 : sources `.blend` et `.glb` conservées, puis export du maillage pour le jeu. Béton, brique, métal et asphalte réutilisent les textures locales existantes et leurs crédits ; aucun nouvel asset tiers n’est importé.

Le prototype autonome **Couronne HELIX**, trouvé sur `claude/pink-war-amelioration` au commit `c2216f3`, est conservé par fusion. Il reste hors menu et hors campagne. Ses commandes sont raccordées au HUD C : recharger ou s’accroupir ne lance plus une charge par erreur.

## Vérifications

- Suite complète : **472 tests**. Les nouvelles vérifications couvrent le déplacement avec collisions sur les deux routes, les deux isolateurs, la distance du portail, les renforts finis, les postes et la reprise des sauvegardes.
- Déplacements simulés de 78 m par le convoi et 98 m par l’aile technique jusqu’au circuit ; il s’agit des chemins testés, pas d’une durée de jeu mesurée.
- Parcours navigateur Chromium : M01 avec LYLU sur écran ordinateur et GHJU en viewport iPhone, deux isolateurs, tir, recharge et pause/reprise, sans erreur JavaScript. Contrôle du moteur M01 classique et de son nouveau point de contrôle ; contrôle du HUD du prototype Couronne HELIX et du plan interactif.
- Audio : synthèse des deux signaux, panoramique, partage du bruit en mémoire, libération des nœuds à la fin et silence du contexte suspendu.
- Décor statique Blender : 308 356 triangles en 14 lots. Détails supplémentaires de la cour : 13 834 triangles, 23 lots avec signalétique, huit collisions, sans nouvelle lumière dynamique.

Le navigateur est automatisé et le rendu de contrôle utilise WebGL logiciel. **Ce contrôle ne remplace pas un essai sur iPhone ou Quest physique, ni une mesure de cadence WebGPU.** Les captures de la [page d’évolution](https://pink-war.vercel.app/m01-cour-annexe.html?v=3.63.4) viennent du moteur du jeu.

## Essai conseillé

À l’accueil : Histoire → M01 → commencer depuis le début. Une ancienne reprise à la boutique ou au relais saute logiquement la nouvelle approche. Essayer une fois le convoi puis une fois l’aile technique, couper un départ, remettre le courant et lire le journal. Continuer ensuite jusqu’au relais pour vérifier la continuité.

Prochaine livraison : boucle boutique/îlot et deuxième journal, avant le travail du carrefour et de la montée. La [répartition cible](PLAN_M01_20_25_MIN.md) évolue vers 8 initiaux / 8 renforts annexe / 8 boutique / 4 carrefour / 4 montée, toujours dans les 32 du book.
