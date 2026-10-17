# Le dernier signal — carte dédiée 3.40

GHJU / LYLU rejoint l’ancien quartier de secours de Vesper. ORDRE reste entièrement hostile. Les terminaux hors réseau conservent uniquement des archives humaines. Le premier chapitre comprend 32 ennemis : huit patrouilleurs initiaux et trois groupes de huit renforts. Au maximum huit ennemis sont actifs en même temps. La campagne reste finie et les chapitres suivants seront construits après les essais du joueur.

## Parcours jouable

1. Huit machines occupent déjà le secteur : gagner les couvertures, réarmer le circuit du laboratoire puis consulter le journal de l’autre protagoniste. Les ennemis disposent d’un délai initial avant d’attaquer.
2. Lire cinq secondes à l’abri de la décharge du circuit isolé. Repousser les patrouilleurs et les premiers renforts de la brèche.
3. Récupérer BLOOM puis traverser la rue jusqu’à l’ancienne boutique de briques à l’ouest. Son ordinateur hors réseau conserve un nouvel indice humain.
4. Rejoindre le carrefour nord et combattre la seconde vague. Les carcasses et les murs arrêtent les tirs. Récupérer le sniper LANCE, puis désactiver la balise de surveillance ORDRE dans la rue.
5. Repousser la dernière vague déclenchée par le sabotage. Monter par le véritable escalier ou l’ascenseur automatique jusqu’à 4,8 m, puis consulter le relais sur la terrasse. Le bilan confirme la piste vers les Archives végétales.

Le point au-dessus du viseur indique le prochain segment praticable du parcours. Un chevron indique une direction derrière le joueur ; une flèche verticale signale un changement d’étage. Les étapes de combat guident vers les menaces restantes. Santé et munitions restent les seuls compteurs permanents. Les indices et instructions détaillées figurent dans les terminaux et la pause.

## Commandes et modes

Trois destinations à l’accueil : **Histoire**, **Arène**, **At Home**. Chaque nouvelle partie Histoire/Arène commence en FPS. La touche V et le bouton de vue en partie permettent toujours d’inspecter le personnage en troisième personne.

| DualShock 4 / manette standard | Action |
| --- | --- |
| Stick gauche / droit | Déplacement / regard |
| L2 / R2 | Visée / tir |
| Croix / A | Saut ; second appui en l’air : double saut ou rebond mural |
| Carré / X | Recharger |
| Triangle / Y | Arme suivante |
| Rond / B | Accroupi |
| L3 / R3 | Course / interaction ou récupération |
| Options / Menu | Pause |

Sur Mac : USB ou Bluetooth (SHARE + PS jusqu’au clignotement, puis association dans les réglages système). Appuyer sur un bouton une fois le jeu ouvert, puis relâcher sticks et boutons pour activer la manette. Le navigateur doit exposer le périphérique via Gamepad API. Le mapping standard est prioritaire ; un profil brut n’est accepté que pour des identifiants Sony et une disposition reconnue. Les périphériques non reconnus ne provoquent pas de déplacement. Les essais logiciels ne constituent pas une validation de chaque combinaison macOS/Safari/Bluetooth réelle.

Les contrôles Quest classiques de la production 3.39 restent dédiés aux manettes Touch : A saute, B recharge, Y change d’arme et X met en pause ; index droit tire et majeur droit vise. AT HOME conserve son interface de scan et ses commandes propres. F au clavier, R3 sur manette classique, le bouton contextuel tactile ou le clic du stick libre sur Quest activent les ordinateurs. Les visées et projectiles ne bénéficient d’aucun guidage automatique.

## Sources et intégration

- `assets/level1/Vesper_Secours_07.blend` : scène Blender éditable, unités en mètres ; art original produit pour Pink War.
- `assets/level1/Vesper_Secours_07.glb` : export glTF binaire, axes Y vers le haut, pour interchange/édition. Il n’est pas téléchargé au lancement du jeu.
- `assets/level1/layout.json` : source commune des colliders, bâtiments, parcours, sols, ascenseur et portails.
- `dist/levels/vesper-01-mesh.js` : géométrie évaluée avec chanfreins et normales, groupée en quatorze matériaux, comprimée en DEFLATE et intégrée au HTML autonome.
- `dist/level1-layout.js` / `campaign-art.js` : physique, matériaux texturés, terminaux et ascenseur dynamique.

La géométrie Blender représente 295 996 triangles avant les terminaux et l’ascenseur dynamiques. Terrain, façades, conduites, viaduc, ruines, végétation et véhicule sont réunis en quatorze lots statiques. Les casques et les téléphones conservent leur profil de résolution distinct. Le corps principal existant reste caché en FPS/VR. Il faut mesurer la fluidité sur le matériel réel ; les tests logiciels ne donnent pas une fréquence d’images Quest/iPhone.

Le mode Histoire masque entièrement le décor de l’arène et remplace tous ses colliders. Il possède ses propres sols, escaliers, plateformes et routes de poursuite ; aucun jardin ou pont invisible de l’ancienne carte ne soutient le joueur. Une reprise du moteur reconstruit cette même carte. Survie retrouve son environnement d’origine. AT HOME conserve sa géométrie et ses règles de défense.

## Reconstruire

Depuis la racine du dépôt :

```bash
python3 tools/build-level1-textures.py
python3 tools/build-level1-layout.py
blender --background --python tools/build-level1-blender.py
npm test
python3 tools/build-launcher.py /chemin/Pink_war.html
```

Le générateur produit ses géométries et matériaux originaux localement. La couche Poly Haven en ligne reste facultative ; les vrais fichiers ne sont pas incorporés au Blender tant que leur téléchargement local est bloqué. Voir [la sélection et ses limites](POLYHAVEN.md). Les matériaux du jeu ajoutent leur texture de surface et leurs panneaux aux géométries originales Blender. Cette première carte reste un prototype visuel ; ce n’est pas un rendu photoréaliste ni une reproduction d’un niveau de Call of Duty.

## Récit par le décor 3.40

Quatre ensembles lisibles jalonnent le trajet : le dernier poste de secours (lit de campagne, caisses médicales, radio interrompue), le couloir d’évacuation (épaves, bagages abandonnés, robot détruit), l’atelier clandestin (câbles débranchés et journal humain) et le portique d’ORDRE. La lentille du portique s’éteint lorsque sa balise est sabotée. Ces accessoires originaux ajoutent environ 13 268 triangles. Sept volumes solides correspondent au lit, aux supports du portique et aux panneaux ; les portes et le parcours restent ouverts.

Les textures de la production 3.39 sont conservées. Les formes Blender 3.40 ajoutent vitrages éclatés, corniches et arcs anciens, garde-corps tordus, câbles suspendus, pavillons de véhicules profilés, pneus arrondis et tours à angles coupés. Les petites pièces sont regroupées ; aucun objet Poly Haven non téléchargé n’est présenté comme importé.

Les optiques des sept châssis deviennent rouges en recherche après un son perçu et en engagement. Leur matériau appartient à chaque robot ; armures et géométries restent partagées. Le rouge revient à sa couleur de veille quand la mémoire d’alerte expire. Les informations proviennent des perceptions réelles, soumises à la distance et aux obstacles, sans accès supplémentaire à la position du joueur.
