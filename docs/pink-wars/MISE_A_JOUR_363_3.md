# 3.63.3 — HUD C « Immersion » et préparation du niveau long

## Livraison jouable

Le créateur a choisi **C** parmi les propositions Liquid Glass de la 3.63.2. Cette passe part de `713b5f4f3909ef32c76becbc21f1313ca65685c9`, conserve les correctifs 3.63 et les robots humanoïdes de la 3.63.2, et intègre cette interface au HUD commun des moteurs existants. Les modèles, les armes, la balistique et les rencontres ne sont pas remplacés.

- Santé et bouclier dans une capsule à gauche ; arme et munitions dans une capsule à droite. Les valeurs viennent de la partie réelle. Les alertes de dégât directionnelles, bouclier rompu et chargeur vide sont conservées.
- Sur iPhone, joystick gauche et glissement de caméra à droite ; tir, visée maintenue et saut restent directs. Le bouton **« … »** ouvre charge, mêlée, posture et course. Le choix referme la palette. Le compteur de charges apparaît à cet endroit une seule fois.
- Toucher le nombre de munitions recharge ; les flèches de la capsule changent d’arme. Les anciennes commandes dispersées sont masquées, leurs raccourcis clavier/manette restent inchangés. Le rechargement automatique et les gestes Quest sont conservés.
- Portrait : la capsule de l’arme monte au-dessus de la palette ouverte. Paysage : palette sur une ligne et capsule dans l’espace libre en haut. Les cibles tactiles restent à 44 px minimum, avec les zones de sécurité de l’écran prises en compte.
- Sur ordinateur, aucun bouton tactile ; informations compactes dans les coins inférieurs. Le stand de tir et l’arène utilisent le même système. Au stand, score et précision sont consultables depuis la pastille d’objectif.
- Objectif réduit à une pastille dépliable ; interactions affichées seulement à proximité. Le point directionnel de M01 est placé sous la ligne de menus pour rester visible. L’encart de début « Vesper · 2196 » ne recouvre plus l’objectif.
- Un bouton pause permanent. Reprise, réglages, passage en VR et accueil sont accessibles depuis la pause. Dans M01/M02, les réglages graphiques existants sont déplacés dans le dialogue, en conservant leurs contrôles et leurs gestionnaires. Dans l’arène, le panneau de réglages déjà présent est conservé.
- Une option persistante **Lisibilité renforcée** opacifie les capsules et supprime leur flou. Le flou n’est pas répété sur chaque commande tactile.
- Les compétences de Gaby/Cara restent indisponibles avant leur déblocage narratif et ne laissent plus une bulle de menu vide au niveau 1. La simulation reste seule responsable du déblocage.

La palette est une sélection rapide pendant la partie, pas une pause automatique. Elle se referme quand un autre menu s’ouvre. Perte de focus et pause effacent la course tactile mémorisée. Échap ferme d’abord la palette, puis ouvre la pause au second appui. Un toucher sur le décor qui sert à fermer la palette ne déclenche pas un tir accidentel. Les boutons de tir/visée gardent leurs véritables appuis maintenus et relâchements.

## Réalité virtuelle et AT HOME

La direction C concerne l’écran plat. Le HUD DOM est masqué en VR ; les compteurs, la pause et les commandes natives du casque sont conservés. L’accès VR reste dans les menus de tous les modes. Le déplacement réel et la géométrie de la pièce d’AT HOME ne sont pas modifiés par cette passe d’interface.

## Préparer un niveau 1 de 20–25 minutes

Le créateur rapporte environ cinq minutes pour M01 et choisit une **cible de 20–25 minutes à la découverte**. Le constat est recoupé avec les sources : enveloppe actuelle de 77 × 144 m, huit hostiles initiaux, trois groupes de huit renforts, quatre pôles narratifs et une montée au relais.

La proposition détaillée se trouve dans [PLAN_M01_20_25_MIN.md](PLAN_M01_20_25_MIN.md), avec un [schéma interactif](https://pink-war.vercel.app/niveau1-direction.html?v=3.63.3) distinguant géométrie actuelle et extensions à construire. Elle répartit le parcours en approche, cour/annexe, boutique/îlot, carrefour/viaduc et montée/relais, pour une cible centrale de vingt-deux minutes.

Le plan conserve les 32 ennemis finis prescrits par le tome II, les deux journaux, les quatre lieux, le sabotage et le relais +4,8 m. Il privilégie des circuits latéraux, des intérieurs utiles, la coordination locale et des renforts annoncés. La cible de taille devient environ 150 × 190 m, à construire progressivement autour des repères conservés. Aucun temps d’attente artificiel ni gonflement systématique des points de vie n’est prévu.

**Cette livraison prépare l’extension : elle n’allonge pas encore la carte publiée à vingt-cinq minutes.** Prochain lot proposé : cour et annexe avec deux approches, une cible de 6–8 minutes et une recette sur les trois plateformes, avant de poursuivre les autres secteurs. La 3.64 « Néons de M02 » reste distincte de ce chantier.

## Vérifications

- Suite de **457 tests** du jeu, comprenant les contrôles de ballistique, poses, rechargement automatique, pause/reprise XR, ennemis et progression.
- Navigateur réel sous Chromium, M01 et M02 : ordinateur et iPhone émulé ; tir et baisse des munitions, recharge par la capsule, charge, accroupissement, réglages accessibles, contraste opaque, pause/reprise et déplacement après reprise.
- Arène et stand : iPhone émulé, tir/recharge, palette de posture, réglages, retour à la pause, reprise et présence de l’accès VR.
- **42 dispositions** contrôlées, palette fermée/ouverte, trois moteurs, portrait/paysage et ordinateur, dont 375 × 812 et 568 × 320 : absence de chevauchement entre commandes et de débordement, cibles tactiles d’au moins 44 px.
- Contrôles de fermeture de palette, priorité d’Échap, remise à zéro de la course, interaction contextuelle et charge indisponible à zéro. Le plan de mission se consulte sur mobile et ses cinq secteurs sont sélectionnables.

Captures et rapports : `/workspace/livraison/captures_363_3/`. Les rendus logiciels et l’émulation d’iPhone vérifient le fonctionnement, sans attester des performances sur iPhone ou Quest physiques. Aucun objectif de durée de M01 n’a encore été mesuré sur la carte étendue, puisqu’elle n’est pas construite.
