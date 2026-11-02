# Chapitre 07 — « Mémoires locales » · la forêt des Sources

**Scénario, 2 novembre 2026.** Le niveau n’est pas encore construit. Ce document fixe l’histoire, le déroulé et
la durée du chapitre. Les dialogues et les documents complets sont dans `dist/m07-story.js`, au même format que
les chapitres 03 et 04, pour servir directement au futur niveau. `tests/375-m07-scenario.test.mjs` vérifie
automatiquement la durée et la cohérence avec la bible et les chapitres déjà en jeu.

## Pourquoi ici, dans l’histoire

La bible (Acte II, chapitre 7) : les deux héros, toujours séparés, suivent des indices qui mènent à un ancien
centre médical. GHJU y arrive la première. Elle trouve un dossier en partie détruit au nom de ses parents :
« transfert de structures cognitives humaines vers des supports artificiels », projet TRANSCENDANCE. GAB-1 refuse
malgré elle d’ouvrir une partie des fichiers, entre en protection, souffre pour la première fois d’un souvenir :
« Je ne sais pas… Mais je crois que je suis déjà venue ici. »

Ce centre ne peut pas être le complexe médical du chapitre 15 : celui-là est effacé de toutes les cartes et n’est
retrouvé qu’au chapitre 14. Le chapitre 07 se passe donc au **Centre de la Cascade**, l’antenne de terrain de
l’équipe de recherche des Tilleuls (VEILLE), au fond de la **forêt des Sources**. La famille y venait l’été.
GAB-1 reconnaît le bruit de l’eau sans savoir pourquoi : c’est l’indice discret que demande la bible.

La forêt sert aussi le jeu. ORDRE dépend de ses capteurs : sous les arbres, les Sondes voient mal ; près de
l’eau, les Traqueurs n’entendent rien.

## Déroulé (GHJU, héroïne de référence)

| Segment | Lieu | Minutes |
|---|---|---|
| La lisière | Route forestière, camion AEGIS | 1,2 |
| Sous le couvert | Sous-bois dense, sondes au-dessus de la canopée | 5,9 |
| Le gué | Cours d’eau, roseaux, passerelle relevée | 3,4 |
| Le moulin et l’aqueduc | Vieilles ruines de pierre | 6,3 |
| Derrière la cascade | Sentier mouillé, bassin, marques dans la roche | 3,1 |
| La grotte | Galeries inondées, nid de rampants, turbine | 5,8 |
| Le Centre de la Cascade | Antenne médicale envahie par les arbres | 4,4 |
| La récupération | Centre et ruines : défense puis N-08 | 5,4 |
| Par l’aqueduc | Exfiltration sur l’aqueduc, retour à la rivière | 3,3 |
| **Total** | | **38,7** (LYLU : 38,6) |

1. **La lisière.** Mara Voss : depuis la fonderie (chapitre 06), les N-08 apprennent ; depuis la station Est
   (chapitre 04), ORDRE cherche GAB-1. Tomas, des Épars (celui du mot laissé sur l’étal de la Ligne 9), sert de
   guide.
2. **Sous le couvert.** Infiltration : rester sous la canopée face aux sondes, marcher sur la mousse face aux
   traqueurs. Carnet des Épars : « Elle recule quand on la vise. Elle revient par un autre côté. »
3. **Le gué.** Rivière en crue, passerelle relevée. Trente secondes de treuil pendant que les rampants montent
   des roseaux.
4. **Le moulin et l’aqueduc.** Des ruines vieilles de trois siècles, qu’ORDRE cartographie mal. Combat contre des
   Remparts et une unité qui se met à couvert avant d’être visée (le comportement appris à la fonderie). On
   détourne l’eau par la vanne de l’aqueduc : la cascade baisse, le passage s’ouvre.
5. **Derrière la cascade.** GAB-1 : « Ce bruit d’eau. Je le connais. Je ne sais pas d’où. » Dans la roche, des
   marques de taille gravées : « GHJU 2186 », « LYLU 2186 », et deux petites marques sans nom. GAB-1 se tait.
6. **La grotte.** Lampe frontale, galeries inondées, nid de rampants. On relance à la main une turbine (45 s à
   tenir) qui alimente un **relais indépendant** posé en 2187 par l’équipe VEILLE. Son journal : dernier accès
   le 17/11/2189 à 05 h 51, effacement partiel du dossier interrompu. C’est six minutes avant le message
   enregistré du chapitre 01 (05 h 58). Et il y a deux jours, ORDRE a tenté d’y entrer.
7. **Le Centre de la Cascade.** Les arbres ont traversé le toit, les serveurs sont secs. Le dossier : le nom des
   parents en tête, à moitié brûlé, et le projet TRANSCENDANCE. GHJU demande à GAB-1 d’ouvrir les fichiers
   chiffrés. Le système répond « ACCÈS REFUSÉ PAR LE PROCESSUS LOCAL · MODE PROTECTION ». GAB-1 : « Ça fait mal,
   GHJU. » Puis : « Je ne sais pas… Mais je crois que je suis déjà venue ici. »
8. **La récupération.** ORDRE a suivi la signature de GAB-1 : une **N-08** et son escorte, « cible : sphère,
   porteur : secondaire ». Défense de 90 secondes pendant que Tomas ouvre l’ancienne route. À ce moment, les
   **compétences avancées de GAB-1 s’éveillent**, comme le jeu le prévoit déjà (« compétences avancées à la
   mission 7 »). La N-08 annonce qu’elle s’adapte ; il faut changer de tactique pour l’abattre.
9. **Par l’aqueduc.** Exfiltration le long de l’aqueduc. Voss : « Tes parents travaillaient sur quoi, GHJU ? »
   GHJU : « Je ne sais pas. Mais GAB-1 le sait, quelque part. » Suite : chapitre 08, « Les ordres de JANUS ».

**Avec LYLU**, le chapitre reste jouable. Il arrive un jour après GHJU : Tomas a vu passer une armure aux marques
roses, une porte du centre a été forcée, la moitié du dossier a déjà été emportée. CAR-14 refuse elle aussi
d’ouvrir les fichiers, plus sèchement, et ne sait pas pourquoi. En sortant, Nira signale une archive JANUS qui
l’attend : c’est le début du chapitre 08. Les deux héros ne se croisent pas (retrouvailles au chapitre 09).

## Comment la durée est calculée

Pour chaque segment, `segmentSeconds` additionne :
- la marche à 3,5 m/s, soit la moitié de la vitesse de course mesurée dans le moteur (7 m/s) ;
- les attentes à tenir (treuil 30 s, turbine 45 s, défense 90 s) ;
- 9 secondes par machine à neutraliser (76 au total) ;
- l’infiltration et les énigmes estimées ;
- la durée de chaque sous-titre (même règle que les autres chapitres) et le temps de lecture des documents.

C’est une estimation calculée à partir du scénario, pas un temps mesuré en jouant. Elle donne près de 39 minutes,
soit une marge de 9 minutes sur l’objectif de 30. Le temps réel sera mesuré quand le niveau existera.

## Ce que le test vérifie

- **Durée :** au moins 30 minutes pour chaque héros. Aucun segment de plus de 8 minutes. Le budget ne marche
  jamais plus vite que le héros.
- **Contenu :** chaque scène et chaque document sont placés dans le déroulé. Forêt, cours d’eau, ruines,
  cascade et grotte sont présents.
- **Fidélité à la bible :** c’est bien le chapitre 7. Il contient la phrase exacte de GAB-1, le dossier au nom
  des parents, TRANSCENDANCE et le transfert de structures cognitives. La suite annoncée est bien le chapitre 8.
- **Héros séparés :** chacun ne parle qu’avec sa propre sphère. GHJU arrive la première, LYLU un jour après.
- **Secrets préservés :**
  - jamais de « Gabrielle », « Carla », « sphérique » ni d’« empreinte neuronale » ;
  - le dossier ne dit pas sur qui portait le transfert ;
  - le sort des parents n’est pas résolu ;
  - Kessler ne sait rien des sphères (il l’apprend au chapitre 10) ;
  - CONVERGENCE et la Résonance ne sont pas encore nommées.
- **Continuité avec les chapitres 01, 04 et 05 :**
  - VEILLE-4, les Tilleuls, la coupure de 03 h 40 et le message de 05 h 58 (chapitre 01) ;
  - la procédure de récupération d’ORDRE (chapitre 04) ;
  - Tomas (chapitre 05) ;
  - la N-08 telle que la bible la décrit au chapitre 06 ;
  - l’ouverture des compétences à la mission 7.

## Pour construire le niveau ensuite

Le moteur gère environ 200 × 200 m : les 2,3 km de marche du budget se font en boucle et en hauteur (sentier qui
monte, aqueduc, grotte sous la cascade), pas en ligne droite. Techniques prévues :
- **Arbres :** dessinés en série, en trois niveaux de détail, puis en simples images plates au loin.
- **Herbe :** seulement autour du joueur, densité réglée selon la qualité.
- **Feuillage :** découpe nette plutôt que transparence.
- **Eau :** matériau animé, sans reflets calculés en temps réel.
- **Grotte :** zone fermée, où rien de l’extérieur n’est dessiné.
- **Lumière :** calculée à l’avance.
- **Chargement :** décor préparé en fichier binaire comme au chapitre 03.
- **Quest 3 et iPhone :** environ la moitié de la densité de végétation.

## Prototype jouable (2 novembre 2026)

Page autonome `foret.html` (non reliée au menu) : vallon de 200 × 200 m généré dans le code (aucun modèle
téléchargé), déplacement libre au clavier, à la souris ou au doigt, sans combat ni dialogues.
- **Végétation :** 2 600 arbres (conifères et feuillus), 6 000 fougères et 12 000 touffes d’herbe. Chaque espèce
  est dessinée en série en trois niveaux de détail : modèle complet à moins de 28 m, simplifié jusqu’à 62 m, image
  plate au-delà. Le tri est refait 10 fois par seconde et tout ce qui sort du champ de vision est écarté.
- **Lieux :** rivière et gué à pierres, moulin et aqueduc en ruine (pierre texturée, mousse), falaise de 18 m,
  cascade animée avec brume, bassin, entrée de grotte dans une fente de la falaise, tunnel praticable jusqu’au
  relais indépendant qui brille en bleu. Dans la grotte, la lumière du ciel s’éteint.
- **Son :** le bruit de la cascade augmente quand on s’en approche.
- **Qualité :** `?quality=low|balanced|high` ; les ombres ne sont calculées qu’en qualité haute. `?bench=40` lance
  un parcours automatique le long du sentier (lisière → gué → ruines → cascade → grotte) et mesure chaque image.

### Mesures (navigateur de test sans carte graphique, 960 × 540)

| Qualité | Appels de dessin (max) | Triangles (moyenne / max) | Processeur par image |
|---|---|---|---|
| Basse | 100 | 61 k / 79 k | ≈ 9 ms |
| Moyenne | 100 | 134 k / 162 k | 1,1 ms (végétation) + 8,0 ms (dessin) |
| Haute | 128 | 176 k / 226 k | ≈ 9–10 ms |

Le navigateur de test dessine sans carte graphique, donc ses images par seconde ne veulent rien dire ici. Ce qui
compte, c’est ce que le jeu demande : une centaine d’appels de dessin, 60 000 à 230 000 triangles et moins de 10 ms
de travail du processeur. C’est dans le budget d’un ordinateur et à la portée d’un Quest 3 ou d’un iPhone récent
en qualité basse. Il faut encore le confirmer sur ces appareils.

Pistes d’optimisation pour le vrai niveau : fusionner les blocs des ruines (≈ 60 appels de dessin à eux seuls) en
un seul objet, préparer le décor à l’avance en fichier binaire comme au chapitre 03.

## Ambiance post-apocalyptique au coucher du soleil (prototype v2)

Demande du créateur : un jeu post-apocalyptique, un coucher de soleil, et une cohérence avec le chapitre 06 avant
et le chapitre 08 après.
- **Heure :** le soir du jour de la fonderie. Soleil bas à l’ouest-nord-ouest, derrière la falaise : lumière
  orange rasante, ciel violet, brume chaude, poussière en suspension.
- **Les restes de 2189, abandonnés depuis sept ans :**
  - l’asphalte fissuré de l’ancienne route forestière, une voiture rouillée ;
  - un pylône à haute tension couché dans le sous-bois, des fûts rouillés, une clôture effondrée ;
  - le panneau « Antenne de recherche des Tilleuls — équipe VEILLE », mangé par la mousse.
- **ORDRE est là :**
  - un mât de surveillance mort penché sur la rivière, dont l’œil rouge clignote encore ;
  - une machine abattue dans la cour du moulin ;
  - trois sondes qui tournent au-dessus de la canopée, sans voir sous les arbres.
- **Vesper :** la ville en ruine se découpe à l’horizon sud, avec quelques fenêtres et balises roses encore allumées.
- **Lien avec le chapitre 06 :** on arrive par le camion d’AEGIS qui revient de la fonderie. La première réplique,
  celle de Mara Voss, parle des N-08 qui apprennent depuis la fonderie.
- **Lien avec le chapitre 08 :** au fond de la grotte, le relais indépendant clôt le prototype et annonce
  « Suite : 08 — Les Ordres de JANUS ».
- **Scènes et documents :** les scènes du chapitre 07 se déclenchent là où elles se passent (lisière, sous-bois,
  gué, ruines, cascade, marques dans la roche, grotte, relais). Cinq documents se lisent sur place (touche E ou
  bouton).
- **Performance :** les éléments ajoutés sont regroupés en quelques appels de dessin. Les ruines, regroupées par
  matière, passent de près de 60 appels à 2.
