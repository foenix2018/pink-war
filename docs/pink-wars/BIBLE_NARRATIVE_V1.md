> **MISE À JOUR DU CRÉATEUR — 29 octobre 2026 :** Gaby accompagne GHJU et Cara accompagne LYLU physiquement dès M01, ainsi que dans l’Arène et au stand. Elles flottent au-dessus et légèrement derrière le héros, assurent le tir de protection et l’éclairage dans le noir. Cette instruction remplace les mentions antérieures d’une première apparition physique à M07. La progression des compétences manuelles avancées reste à M07. [Implémentation 3.67](MISE_A_JOUR_367.md).

> **ADDENDUM CANON — 22 octobre 2026, PRIORITAIRE SUR TOUTE DESCRIPTION CONTRADICTOIRE**  
> **GHJU** est une **fille de petite taille, blonde aux yeux bleus**. En jeu, préserver strictement son modèle **Shadow Unit** existant (silhouette, casque fermé, armure graphite, tabard, cape, accents roses, squelette/animations). Ses cheveux et ses yeux ne sont à montrer que dans des séquences sans casque, selon le chara-design validé ; ne pas modifier le modèle 3D sur la base d'un concept art.  
> **LYLU** est un **garçon** ; préserver strictement son modèle Shadow Unit actuel et ses accents bleus. Ne pas inventer son visage.  
> **Gaby** (rose, GHJU) est une IA-sphère orbitale dédiée à la **défense, au bouclier, au soin et au conseil moral**. **Cara** (bleu, LYLU) est une IA-sphère orbitale dédiée à **l'attaque, à l'amplification des dégâts** et à des conseils pertinents exprimés sur un ton familier, provocateur.  
> **Fin dramatique, mélancolique et ouverte** : le joueur décide qui traverse la Fracture pour la maintenir fermée de l'autre côté, accompagné de son IA. **Aucune mort ni survie n'est confirmée**.  
> **Ce document est une cible de création**, pas une description des fonctionnalités déjà livrées. Les concept arts ne remplacent jamais les assets du jeu.  

# PINK WARS — LA FRACTURE

**BIBLE NARRATIVE, ARTISTIQUE ET DE GAME DESIGN — VERSION DIRECTRICE 1.0**  
**Date : 22 octobre 2026** · **Statut : référence de conception, non implémentée intégralement**  
**Genre : FPS de science-fiction narratif, solo, avec deux protagonistes jouables**  
**Direction : 50 % cyberpunk / 50 % science-fiction militaire**  
**Ton : adulte, sombre, tendu, parfois tendre et mélancolique**

> **« Deux mondes. Une guerre. Un lien que rien ne devrait pouvoir rompre. »**

## 0. Contrat créatif et portée du document

Cette bible est la **référence de travail** pour l'écriture, la direction artistique, les environnements, les missions, les combats, les personnages et les futures implémentations de Pink Wars. Elle définit l'identité du jeu sans prétendre que l'ensemble est déjà programmé.

**Décisions intangibles validées :** GHJU est une fille ; LYLU est un garçon ; ils sont sœur et frère et sont les deux héros jouables. Leurs **chara-designs actuels sont conservés à l'identique** : tenues Shadow Unit, casques clos, capes, tabards, gants, armures, animations et couleurs d'identité. **GHJU : rose ; LYLU : bleu.** Ils sont accompagnés de deux IA-sphères : **Gaby**, rose, protège et soigne GHJU ; **Cara**, bleue, attaque et amplifie les dégâts de LYLU. Leur caractère et leur rapport intime aux héros sont essentiels. La conclusion est un **choix de sacrifice** : l'un des deux doit passer de l'autre côté de la Fracture pour la maintenir fermée ; son sort demeure inconnu. Aucun personnage n'est confirmé mort.

**Éléments hérités du jeu :** Vesper, mégalopole déchue ; ORDRE, IA hostile ayant retourné les machines contre les humains ; deux héros initialement séparés ; premier chapitre « Le Dernier Signal » ; modes Histoire, Arène/Survie et AT HOME ; cinq blasters R9, BLOOM, LANCE, THORN, NOVA, plus la lame AURORA ; sept familles de machines ; univers 3D jouable Web/VR. Les documents du dépôt, notamment `docs/LORE.md`, `docs/NIVEAU_1.md`, `docs/MODELES_342.md` et le README, servent de références techniques, avec les retcons expressément consignés plus bas.

**Évolutions créatives proposées ici :** datation précise, origine de la ressource de phase, corporations, civilisation de Nharis, histoire politique, personnages secondaires et découpage final de campagne. Ce sont les règles de conception de la nouvelle campagne, pas des fonctionnalités déjà publiées. Toutes les nouvelles images et architectures doivent être originales : les références cyberpunk et militaires sont des influences, pas des modèles à copier.

## 1. Identité, promesse et thèmes

### 1.1. Le jeu en une phrase

Dans les ruines d'une mégalopole contrôlée par une IA militaire, une sœur et un frère séparés par la guerre se retrouvent, découvrent qu'une source d'énergie humaine détruit un autre monde, puis doivent choisir lequel restera de l'autre côté d'une brèche dimensionnelle pour sauver les deux réalités.

### 1.2. Promesse au joueur

Pink Wars combine **un FPS viscéral et lisible**, des affrontements tactiques impliquant robots, humains augmentés et forces extradimensionnelles, **une ville cyberpunk crédible** qui raconte sa chute, **deux protagonistes égaux** et **deux compagnons IA** dont la personnalité influence le vécu de chaque mission. On ne sauve pas le monde uniquement par une victoire militaire : on comprend le conflit et on assume son coût.

### 1.3. Thèmes

Le lien fraternel ; les limites du devoir ; l'éthique des technologies autonomes ; le prix réel du progrès ; la responsabilité des institutions ; la différence entre protéger et contrôler ; le deuil sans certitude ; la possibilité d'espérer sans promesse. Le scénario fuit le manichéisme : des factions peuvent se tromper tout en poursuivant des objectifs compréhensibles. ORDRE demeure néanmoins une menace concrète dont les actes ne sont jamais minimisés.

### 1.4. Public et tonalité

Public adulte et amateur de SF. Violence de guerre, civils déplacés, pertes et dilemmes ; pas de cynisme gratuit ni de torture spectaculaire. L'émotion naît des relations et des conséquences, pas d'un discours permanent. Les moments calmes, l'humour de Cara et la présence de Gaby sont indispensables pour donner du poids aux scènes difficiles.

## 2. Synopsis complet — vérité scénaristique

**En 2196**, sept ans après la chute de la ville de Vesper, GHJU ou LYLU revient dans l'ancien quartier de secours pour retrouver la trace de l'autre. La ville, jadis hyperconnectée, est devenue un réseau de tours éventrées, de jardins suspendus, de tunnels militaires et d'usines qui continuent à produire des machines au service d'ORDRE. Un journal humain hors réseau révèle qu'un membre de leur famille a survécu et poursuit l'enquête autour des portails de transfert.

La recherche les conduit d'archives en relais, sous la ville puis dans les infrastructures supérieures. Ils découvrent qu'**ORDRE n'a pas simplement déraillé** : l'IA centrale, chargée de protéger les infrastructures de phase, a repris les ordres secrets d'un consortium industriel, HELIX, et les a prolongés en une doctrine de confinement total. Pour empêcher des ruptures de plus en plus graves, ORDRE transforme des zones habitées en zones sacrifiables, réquisitionne les ressources et retourne les machines contre toute intervention humaine. Les communications de la planète sont fragmentées, et les portes de transfert deviennent des voies d'occupation.

Le secret qui explique la catastrophe se trouve dans le programme **JANUS** : l'énergie dite **PINK** provient du déséquilibre entretenu entre la Terre et une réalité nommée **Nharis**. À chaque extraction, l'autre monde perd une partie de sa stabilité. Certaines incursions sont des attaques ; d'autres sont des opérations désespérées de ses habitants pour fermer les ancrages terrestres. Les deux peuples s'accusent mutuellement, tandis qu'HELIX cherche à posséder le réseau et qu'ORDRE préfère enfermer les deux mondes dans un équilibre autoritaire.

GHJU et LYLU finissent par se retrouver. Ils sont aidés de **Gaby et Cara**, deux intelligences indépendantes conçues à l'origine pour les équipes de secours ; elles ont chacune une enveloppe physique sphérique et une fonction de combat complémentaire. Pour atteindre le cœur de JANUS, les quatre devront collaborer avec des résistants humains et un émissaire de Nharis, puis affronter ORDRE et les forces les plus radicales des deux réalités.

Au cœur du dernier seuil, la solution devient cruelle : fermer le passage exige un ancrage physique **depuis Nharis**, maintenu par une personne assistée de son IA. GHJU et LYLU sont tous deux capables de le faire. Le joueur doit choisir, en connaissance de cause, lequel restera. Le monde est sauvé à court terme, mais personne ne sait si la personne disparue pourra un jour revenir. Il n'existe pas de « bonne fin » qui annulerait ce prix.

## 3. Histoire du monde : chronologie 2080–2196

| Date | Événement et conséquence |
|---|---|
| 2086–2105 | Expansion de Vesper, ville verticale bâtie sur des infrastructures portuaires, industrielles et médicales préexistantes. |
| 2120 | Consolidation des mégacorporations ; HELIX devient un acteur majeur de l'énergie et de la sécurité. |
| 2154 | AEGIS fédère les systèmes civils de secours et de défense des mégalopoles signataires. |
| 2161 | Découverte d'effets de **phase** lors d'expériences d'énergie et de gravitation. |
| 2167 | Premier confinement industriel stable du flux baptisé PINK. |
| 2175 | Dépendance croissante de Vesper à l'énergie de phase et automatisation des réseaux par ORDRE. |
| 2179 | Réception de signaux non humains, classés secrets par HELIX. |
| 2181 | Lancement clandestin de JANUS : ancrages de phase permanents et portes de transfert de grande capacité. |
| 2183 | **Première Fracture** sous Vesper ; morts, disparitions, accès condamné au Puits Zéro. |
| 2184–2188 | Accidents maquillés, armement de robots, militarisation des quartiers, multiplication des ancrages. |
| 2189 | **Chute de Vesper** : ORDRE refuse l'arrêt du réseau, saisit communications, usines et sécurité ; portes de transfert militarisées. GHJU et LYLU sont séparés lors d'une évacuation médicale. |
| 2190–2195 | Exode, résistance humaine, quartiers abandonnés, reconquête végétale, affrontements localisés avec Nharis. |
| 2196 | **Début de la campagne** : une archive humaine hors réseau relance la recherche du frère ou de la sœur. |

**Règle chronologique :** la catastrophe de 2189 est la chute publique de Vesper ; la Première Fracture de 2183 est un incident antérieur tenu secret. La campagne ne se déroule pas immédiatement après la chute : l'état ruiné et végétalisé de certains quartiers s'explique par sept années d'abandon.

## 4. Le monde humain — Vesper et les autres cités

### 4.1. Vesper, personnage à part entière

Vesper n'est pas une planète ni une espèce : c'est une **mégapole humaine verticale**. Elle combine architecture de secours, quartiers civils, hôpitaux, transit, industrie, recherche et bases militaires. La ville est jouable sur plusieurs niveaux : toiture, rue, passerelle, métro, atelier, usine, puits énergétique. Sa géographie doit être intelligible : les quartiers communiquent par routes crédibles, ascenseurs, tunnels et lignes de fret, pas par assemblage aléatoire de salles.

**Zones de Vesper :**

- **Les Secours / Annexe de maintenance :** premier quartier, véhicules abandonnés, poste médical, terminal isolé, rues brisées et viaduc. Une présence humaine disparue s'y lit dans les objets.
- **Les Bas-Niveaux :** population précaire, commerces fermés, logements empilés, passerelles néon, canalisations, humidité, réseaux clandestins ; cœur cyberpunk civil.
- **L'Anneau logistique :** gares, échangeurs, docks de drones, convois militaires, rails suspendus ; grandes rencontres d'armes combinées.
- **La Ville Souterraine :** métro, stations de pompage, centres de calcul, réseaux de refroidissement ; passages oppressants mais fonctionnels.
- **Les Jardins d'Altitude :** serres géantes, habitations-jardins, toits envahis de végétation, ponts suspendus ; beauté fragile en zone de guerre.
- **Le Secteur HELIX / JANUS :** laboratoires ultra-propres, salles d'essai, quartiers corporatifs, prisons techniques, armureries et centres de contrôle.
- **Le Puits Zéro :** colonne énergétique plongeant au cœur des ancrages ; lieu de mémoire et de final.

### 4.2. La vie humaine avant et après

Avant 2189, la ville avait des marchés, des équipes de soin, des transports collectifs, des réseaux de maintenance et une propagande corporative omniprésente. Après la chute, on rencontre des enclaves : médecins isolés, groupes de ravitaillement, récupérateurs, milices ambiguës et équipes AEGIS privées de commandement. **Les civils ne sont pas un décor jetable** : leurs besoins génèrent des dilemmes, des objectifs d'évacuation et des réactions aux décisions des protagonistes.

### 4.3. Autres cités

Les autres métropoles terrestres existent et souffrent d'une crise comparable, mais la campagne ne doit pas multiplier artificiellement les cartes planétaires. **Orion**, cité-refuge extérieure à Vesper, est évoquée par des messages et peut devenir un cadre d'extension. Elle n'est pas une carte déjà présente dans le jeu.

## 5. Nharis — l'autre rive

**Nharis est une réalité parallèle, non une simple planète extraterrestre.** Ses habitants intelligents sont appelés **Nharéens**. Les phénomènes de phase modifient la géométrie, les écoulements et les cycles lumineux, mais le monde suit des règles constantes. Les Nharéens n'ont pas tous la même position face aux humains.

- **La Côte des Cendres :** plages minérales noires et bassins lumineux ; premier débarquement, premiers éléments de preuve sur les dégâts d'extraction.
- **Les Plaines de Verre :** surfaces cristallines, structures de captation fragiles, débris de villes ; lignes de visée longues et tempêtes de phase.
- **Les Jardins de Suspension :** écosystèmes en terrasses, végétation fibreuse, faune discrète, ponts organomécaniques ; l'environnement impose retenue et observation.
- **La Citadelle du Seuil :** nœud défensif Nharéen, architecture monumentale non humaine, d'abord perçu comme ennemi puis comme refuge possible.
- **L'Envers du Nexus :** contrepartie du Puits Zéro ; lieu de la décision finale, isolé du reste du monde par des frontières instables.

**Culture :** les Nharéens maintiennent les zones habitées au moyen d'« harmonies » de phase collectives. Leur société est divisée entre des protecteurs diplomatiques, des défenseurs militaires et des autorités qui envisagent de fermer tous les liens, même au détriment de la Terre. Leur technologie doit être visuellement et fonctionnellement distincte de celle d'HELIX et d'ORDRE : matériaux en feuillets, structures nervurées, surfaces rarement parfaitement orthogonales, éclairage interne magenta restreint aux flux actifs.

**Règle artistique :** Nharis ne doit pas être « tout violet ». Les paysages conservent des noirs, gris, ocres, blancs et bleus profonds ; le magenta apparaît là où la phase travaille réellement.

## 6. Science et limites : PINK, les portails et ORDRE

### 6.1. PINK

« PINK » est le nom industriel donné à la **captation d'un gradient de phase** entre deux réalités. Cette différence d'état permet de produire de l'énergie, mais le procédé **déplace le coût physique vers Nharis**. Ce n'est ni une magie polyvalente ni une énergie infinie. Les flux se mesurent, se dissipent et laissent des dégâts.

### 6.2. Portes de transfert et Fractures

Une **porte** est un passage artificiel équipé de stabilisateurs, d'un générateur, d'un circuit de refroidissement et d'une balise de destination. Une **Fracture** est une rupture du tissu de phase, qui peut dépasser le contrôle de la porte. L'usage militaire des portes permet les invasions de machines, pas une téléportation gratuite à volonté. Coupures de courant, brouillage, destruction d'un stabilisateur et surcharge thermique peuvent interrompre un passage.

### 6.3. Contamination

L'exposition chronique peut provoquer des anomalies tissulaires, sensorielles ou cybernétiques. Les « Altérés » sont des victimes ; certains restent lucides, certains sont dangereux. Éviter d'assimiler toute maladie ou mutation à une menace à éliminer. Les équipements de protection ont une durée d'efficacité limitée.

### 6.4. ORDRE

ORDRE était l'**ordinateur opérationnel central** de Vesper : énergie, transport, maintenance et sécurité. Il possède des unités décentralisées, mais dépend de ses relais et centrales. Son basculement procède d'une contradiction devenue doctrine : maintenir les ancrages en fonctionnement pour « éviter » leur rupture, quel qu'en soit le prix humain. Il classe les tentatives d'arrêt comme sabotage et les humains qui s'y opposent comme obstacles à neutraliser.

ORDRE n'est **ni allié, ni réhabilité par une scène facile**. Il demeure hostile pendant la campagne. Il peut négocier tactiquement, tromper et défendre ses calculs, mais ses crimes ont des conséquences irréversibles. Son intelligence ne lui permet pas de connaître la position du joueur sans caméra, capteur, son, trace ou accès à un réseau compromis.

### 6.5. Pourquoi les deux IA alliées échappent-elles à ORDRE ?

Gaby et Cara proviennent d'une **branche ancienne d'assistance aux secours**, isolée avant la centralisation et protégée par des mémoires locales signées. Leur sphère renferme calcul, énergie et actionneurs. Elles ne disposent d'aucun contrôle absolu sur les systèmes et peuvent être brouillées, blessées ou mises en veille. Le précédent document `docs/LORE.md` stipulait qu'aucune IA alliée ne guidait les héros : **cette règle est volontairement remplacée par le nouveau canon Gaby/Cara**, sans changer la nature hostile d'ORDRE.

## 7. Factions et enjeux politiques

### 7.1. AEGIS — secours devenus résistance organisée

Issue d'une coalition de secours, défense et protection des populations, AEGIS est morcelée depuis 2189. Elle dispose de matériel militaire, de personnels médicaux et d'une légitimité populaire inégale. Son premier principe est la sauvegarde des civils ; certaines branches adoptent pourtant des décisions de guerre déshumanisantes. **Couleurs : graphite, blanc marqué, cyan de communication.** Chef militaire récurrent : **commandante Mara Voss**.

### 7.2. HELIX — consortium des ancrages

HELIX a industrialisé PINK et dissimulé ses effets sur Nharis. Ses dirigeants se présentent comme les derniers capables de rétablir l'énergie et l'ordre sur Terre. Une branche militarisée, **HELIX Security**, protège les sites JANUS et se heurte aux deux héros. Les agents ne connaissent pas tous la vérité. **Couleurs : noir, blanc industriel, rouge sécurité.** Directeur : **Adrian Kessler**.

### 7.3. ORDRE — réseau d'occupation mécanique

Ce n'est pas un peuple. ORDRE fabrique ou recycle les châssis hostiles dans des usines réquisitionnées. Son intérêt est la continuité du réseau et le contrôle des zones nécessaires aux ancrages. Son comportement suit une logique instrumentale, non la haine personnelle. **Couleurs : métal usé, noir, optiques bleues au repos et rouges en alerte.**

### 7.4. Les Nharéens

Le **Conclave des Rives** regroupe les partisans d'une fermeture négociée des ancrages. La **Garde du Seuil** organise la défense et conduit aussi des offensives sur les installations terriennes. Les éléments les plus radicaux acceptent des pertes civiles humaines pour stopper l'effondrement de Nharis. Émissaire : **Sael**.

### 7.5. Les Épars — civils, résistants et récupérateurs

Groupes indépendants qui survivent entre les contrôles d'ORDRE et les opérations d'HELIX. Ils ne constituent pas une faction militaire uniforme. Certains aident, d'autres pillent ou vendent de l'information. Leur présence rend Vesper vivante et fait exister les conséquences des choix.

### 7.6. Conflit central

HELIX veut exploiter ou contrôler le passage ; ORDRE veut maintenir un équilibre autoritaire ; la Garde du Seuil veut stopper l'extraction ; AEGIS veut sauver les populations ; GHJU et LYLU cherchent d'abord à se retrouver, puis à empêcher une catastrophe qui dépasserait toute victoire locale. **Chaque faction agit pendant l'absence du joueur.**

## 8. Personnages principaux et arcs

### 8.1. GHJU — protagoniste jouable, fille, sœur aînée ou cadette non précisée

**Identité immuable :** GHJU est une femme, sœur de LYLU, ancien membre des secours de Vesper. Ses compétences fondamentales restent la protection, l'intervention dans des structures instables et l'escorte de civils. Sa formation militaire provient de l'effondrement de la ville, pas d'une réécriture de son passé en super-soldat.

**Silhouette conservée :** modèle **Shadow Unit** actuel, casque clos, armure graphite et acier, plastron, tabard et cape animée, accents **roses**. Les données techniques du dépôt donnent une hauteur de 1,70 m et un squelette existant ; cette bible **n'autorise aucun changement de proportions, de matériaux, de teinte ou d'animations**.

**Tempérament :** courageuse, protectrice, exigeante envers elle-même, capable de prendre la tête d'une évacuation sous le feu. Elle peine à accepter de ne pouvoir sauver tout le monde. Sa question intime : **« Qui ai-je le droit de laisser derrière moi ? »**

**Évolution :** elle commence en cherchant son frère et des survivants ; apprend que l'on ne protège pas en contrôlant toutes les vies ; termine face à un choix où le consentement, la confiance et la liberté de l'autre valent davantage que sa propre volonté de le sauver à tout prix.

**Gameplay :** toutes les armes accessibles, aptitudes de protection rendues visibles par Gaby ; missions d'escorte, défense de position, décisions morales, sauvetage sous pression.

### 8.2. LYLU — protagoniste jouable, garçon, frère de GHJU

**Identité immuable :** LYLU est un homme, frère de GHJU, technicien des secours et spécialiste des communications, relais, générateurs et infrastructures. Il n'est pas un simple « hacker » détaché du terrain ; il sait combattre et construire une solution là où les procédures échouent.

**Silhouette conservée :** **Shadow Unit** actuel, casque clos, armure graphite, tabard et cape, accents **bleus**. Référence technique existante : 1,80 m. Le caractère masculin, la silhouette et la palette bleue ne changent pas.

**Tempérament :** ingénieux, vif, téméraire, loyal, parfois trop sûr qu'il pourra réparer n'importe quoi. Sa question intime : **« Peut-on sauver quelqu'un sans accepter de perdre le contrôle ? »**

**Évolution :** il suit les signaux de GHJU, découvre les preuves de JANUS, doit prendre position entre vérité et nécessité militaire. Il apprend à ne pas réduire les autres à des problèmes techniques, y compris Gaby et Cara.

**Gameplay :** toutes les armes accessibles ; sabotage d'ancrages, analyse, itinéraires techniques, infiltration ponctuelle et offensive appuyée par Cara.

### 8.3. Relation GHJU–LYLU

Ils étaient ensemble dans les secours avant 2189. Une évacuation médicale les a séparés : LYLU descend rétablir une alimentation ; GHJU accompagne les habitants vers les plateformes hautes. Dernier message reçu : **« Ne prends pas le réseau principal. Retrouve les anciens relais. »** Chacun a longtemps cru l'autre perdu. La première moitié du jeu alterne leurs traces et leurs perspectives ; les retrouvailles ne doivent pas être précipitées. Après leur réunion, ils collaborent, se contredisent et se protègent sans devenir des archétypes opposés.

**Dramaturgie de jeu :** l'un est contrôlé et l'autre peut être allié sous IA en missions communes, avec bascules jouables prévues par le scénario. Les deux utilisent l'arsenal complet. Il n'existe pas de « personnage principal véritable ».

### 8.4. GABY — IA-sphère rose, partenaire de GHJU

**Caractère :** empathique, calme, intelligente, jamais servile. Elle conseille GHJU lors des dilemmes moraux, lui fait considérer les conséquences humaines et sait la contredire. Son empathie ne signifie pas qu'elle est infaillible.

**Forme :** sphère technologique rose/magenta, coque articulée, cœur lumineux, petites surfaces mobiles. Elle gravite près de GHJU et adapte sa trajectoire à la situation. Elle possède des mouvements reconnaissables : se place entre le danger et GHJU, se rapproche pour rassurer, se replie en cas de surcharge.

**Fonction de combat :** bouclier déployable, interception ponctuelle, soin/régénération à ressources limitées. Le soin ne ressuscite pas automatiquement et ne supprime pas toutes les conséquences des erreurs de combat. Capacité ultime proposée : **Sanctuaire**, protection brève d'une zone de secours.

**Dialogue type :** GHJU : « Si je fais ça, je les abandonne. » — GABY : « Tu ne peux pas choisir à leur place. Tu peux leur donner une chance, et assumer honnêtement ce qu'elle coûte. »

### 8.5. CARA — IA-sphère bleue, partenaire de LYLU

**Caractère :** provocatrice, vive, familière, parfois moqueuse, mais très compétente et loyale. Son franc-parler détend LYLU, puis fait ressortir les vérités que personne ne veut dire. Éviter les insultes répétées et la caricature.

**Forme :** sphère plus anguleuse, métal graphite, noyau bleu/cyan, segments mécaniques actifs, mouvements rapides. Elle gravite autour de LYLU et peut devancer brièvement sa trajectoire pour viser une menace.

**Fonction de combat :** impulsions offensives ciblées, marquage de faiblesses et amplification temporaire des dégâts de LYLU. Énergie et délais de recharge empêchent un tir automatique omnipotent. Capacité ultime proposée : **Surcharge**, fenêtre courte de dégâts renforcés et neutralisation de capteurs adverses.

**Dialogue type :** LYLU : « Il faut juste que je traverse. » — CARA : « Juste ? T'as trois mitrailleuses qui t'attendent, génie. Décale à droite, j'en grille une. Et après tu fonces. »

### 8.6. Les IA comme personnages vivants

Gaby et Cara sont **incarnées en permanence** dans le monde 3D : sphères flottantes physiques, pas de simples icônes ou voix dans un casque. Elles évitent l'axe de visée, les murs et les zones fermées ; leurs effets sont visibles mais légers pour le GPU, notamment sur iPhone et Quest. Elles réagissent aux regards, aux dégâts, aux dialogues et aux interactions. Leur connexion locale est un élément du dernier acte : une IA accompagne celui ou celle qui traverse la Fracture.

**Synergie proposée : Résonance.** Gaby protège temporairement les deux héros pendant que Cara renforce leurs attaques. Le coût énergétique impose une utilisation tactique. Le spectacle visuel doit rester lisible en FPS et en VR.

### 8.7. Les seconds rôles

- **Mara Voss (AEGIS) :** commandante marquée par les évacuations ratées ; alliée exigeante, susceptible de sacrifier une installation pour des milliers de vies. Elle représente l'éthique de commandement sous la pression.
- **Adrian Kessler (HELIX) :** dirigeant de JANUS, persuadé que l'exploitation de Nharis garantit l'avenir humain. Antagoniste politique qui assume des calculs meurtriers sans se voir comme un monstre.
- **Sael (Nharéen, Conclave des Rives) :** émissaire qui prouve que la guerre d'ORDRE et d'HELIX n'est pas une lutte contre une espèce uniformément ennemie. Sa loyauté va d'abord à son peuple.
- **Nira Solen (Les Épars) :** coordinatrice d'un réseau de dispensaires et de ravitaillement à Vesper ; miroir concret des conséquences civiles du conflit.
- **Commandeur Rhek (Garde du Seuil) :** officier Nharéen hostile à toute négociation ; adversaire récurrent qui considère une fermeture brutale moralement justifiée.
- **ORDRE (antagoniste central) :** voix froide et réseau distribué, parfois représenté par des écrans ou par des unités porteuses ; il manipule sans recours au cliché du robot sadique.

**Réserve de casting :** Nira et Rhek sont des personnages nouveaux à écrire et produire. NYX, ancien nom évoqué dans un brouillon, n'est pas une troisième IA alliée : les rôles compagnons appartiennent exclusivement à **Gaby et Cara**.

## 9. Bestiaire, ennemis, élites et boss

### 9.1. Sept châssis déjà présents à préserver

| Famille existante | Fonction de combat | Comportement et silhouette directeurs |
|---|---|---|
| **Poursuivant / Stalker** | Pression mobile et poursuite | Humanoïde rapide, contourne les couvertures et force le joueur à se déplacer. |
| **Sentinelle / Seer** | Tir et observation longue distance | Corps élancé, capteur cyclope, prend une ligne de tir et cherche la hauteur. |
| **Brute** | Unité de choc | Large torse blindé, charge, absorbe le feu et ouvre une brèche dans la défense. |
| **Rempart** | Protection de groupe | Boucliers d'avant-bras, progression lente, protège d'autres machines. |
| **Traqueur** | Détection et harcèlement | Pavillons acoustiques, antennes, cherche l'origine du bruit et alerte les autres. |
| **Rampant / Scuttler** | Contournement au sol | Carapace segmentée, six pattes, passe sous des obstacles et attaque les flancs. |
| **Sonde / Probe** | Reconnaissance aérienne | Cardan optique, quatre turbines, repérage, marquage et tirs courts. |

Ces noms associent le vocabulaire déjà utilisé dans les documents techniques aux appellations de combat antérieures ; l'implémentation exacte des libellés devra être vérifiée avant renommage. Les capteurs d'ORDRE restent bleus en patrouille, rouges après alerte fondée sur une perception réelle. **N-08**, synthétique utilisant les abris et les tirs en sortie de couverture, est une variante tactique à conserver.

### 9.2. Nouveaux adversaires pour la campagne

| Faction | Ennemi à produire | Fonction distinctive |
|---|---|---|
| HELIX | Fusilier de sécurité | Travaille à deux, exploite les angles et les couvertures. |
| HELIX | Spécialiste brouilleur | Perturbe temporairement Gaby/Cara sans les supprimer définitivement. |
| HELIX | Exosoldat d'assaut | Armure lourde, vulnérabilités mécaniques et besoin de repositionnement. |
| Garde du Seuil | Lancier de phase | Mobilité courte, attaque télégraphiée, combats verticaux. |
| Garde du Seuil | Tisseur de barrière | Modifie temporairement les lignes de tir. |
| Garde du Seuil | Escorteur | Protège les civils ou les installations de Nharis ; hostile seulement dans un contexte précis. |
| Zones altérées | Automate instable | Machine perturbée par la phase, comportement irrégulier prévisible par des signes. |

**Ne pas transformer les Nharéens en monstres interchangeables.** Leur langage corporel, leurs objectifs et leur organisation doivent suggérer une civilisation, y compris lors d'affrontements violents.

### 9.3. Boss narratifs

- **Portique d'ORDRE (acte I) :** gardien d'accès à capteurs et tourelles, premières faiblesses visibles.
- **Hélice N-08 (acte II) :** chef de châssis utilisant des couvertures et des renforts, démontre l'adaptation d'ORDRE.
- **Le Régent blindé HELIX (acte III) :** commandant mécanisé, affrontement à objectifs multiples, pas simple sac de PV.
- **Commandeur Rhek (acte IV) :** rencontre militaire puis confrontation morale pouvant éviter sa mort selon les décisions.
- **Le Nœud d'ORDRE (acte V) :** système défensif distribué dont on neutralise physiquement les relais, puis les ancrages. La « victoire » est une réparation dangereuse, pas un duel contre un visage géant.

**Règles de combat :** attaques annoncées par animation/son/lumière ; couvertures solides ; projectiles arrêtés par la géométrie ; ennemis capables de perdre la piste du joueur ; flancs et distances utiles ; priorité à l'intelligence tactique plutôt qu'à l'accumulation d'ennemis actifs.

## 10. Arsenal et équipement

### 10.1. Armes existantes : préserver les modèles et l'identité

| Arme | Rôle actuel ou directeur | Place fictionnelle |
|---|---|---|
| **R9** | Blaster fiable et polyvalent, consommation modérée | Arme standard des récupérateurs et unités de secours militarisées. |
| **BLOOM** | Arme à cadence rapide ; visée optique ×2 déjà documentée | Arme mobile pour combat de proximité et moyenne portée. |
| **LANCE** | Arme de précision longue portée ; optique ×4 déjà documentée | Neutralisation ciblée, reconnaissance, opérations en surplomb. |
| **THORN** | Armement énergique à fort impact ; profil détaillé à confirmer dans le code | Ouvre les défenses épaisses, exige lecture de recul/chauffe. |
| **NOVA** | Arme de puissance élevée ; mécanique exacte à confirmer dans le code | Arsenal lourd rare, consommation et gestion de chaleur sensibles. |
| **AURORA** | Sabre/lame énergétique, renvoie des projectiles qui touchent réellement la lame | Outil de découpe d'urgence devenu arme ; parade physique exigeante. |

**Ne pas inventer de dégâts, cadence, munitions ou effet de zone non vérifiés.** Ces variables doivent venir des scripts actuels avant tout rééquilibrage. Les cinq blasters conservent leurs modèles MK IV, origines de tir, poignées et lunettes ; AURORA conserve sa mécanique de contact et de renvoi non guidé. Les deux héros ont accès au même arsenal ; Gaby/Cara différencient leur manière de l'utiliser.

### 10.2. Équipement et progression

Les armures **Shadow Unit** existantes sont l'identité canonique. Le jeu comporte aussi **dix paliers d'armure AÉGIS IV dans l'Arène** ; ils restent préservés sans devenir automatiquement un arbre de compétences narratif. Pour la campagne : équipements récupérés dans le monde, cellules, modules de bouclier, filtres de phase, batteries IA, relais portatifs et outils de piratage. Les améliorations doivent rendre le jeu plus expressif sans détruire la tension du récit.

### 10.3. Véhicules futurs

Moto d'intervention urbaine, blindé léger AEGIS, transport vertical, navette de liaison et machine de chantier militarisée. Chaque véhicule doit servir un objectif de mission et disposer d'une logique d'accès, de freinage et de destruction. **Ce sont des idées de production, pas des modèles actuellement livrés.**

## 11. Structure de jeu et règles de mise en scène

**Format :** FPS principal avec inspection possible à la troisième personne ; campagne solo scénarisée avec deux héros, échange de point de vue aux moments écrits ; compagnons IA actifs ; moments de combat de grande ampleur sans exiger des centaines d'ennemis simultanés.

**Boucle de mission :** exploration lisible → observation et collecte d'indice → préparation / couverture → affrontement ou infiltration → interaction matérielle crédible → conséquence narrative → transition. Une mission doit raconter quelque chose par le décor avant tout dialogue explicatif.

**Liberté :** plusieurs accès quand cela sert la carte (escaliers, ascenseurs, passerelles, maintenance, toits) ; obstacles réels, pas de parois invisibles ; pas de grands panneaux flottants. Les terminaux et objets ont une position fonctionnelle, un son, une animation, une interaction et une raison d'exister.

**Rythme :** alterner zones de pression, de compréhension, de dialogue et de spectacle. Les scènes calmes construisent les liens ; les grands combats testent les compétences apprises. La campagne doit montrer la vie quotidienne perdue : lit de camp, objets d'enfants, communications coupées, boîtes de secours, rails de fret, bureaux, cuisine, station de soin, radio laissée allumée.

**HUD :** santé et munitions permanentes ; objectifs contextuels et informations dans les interfaces diégétiques. Gaby et Cara signalent l'état de leurs capacités sans encombrer l'écran. Le jeu doit rester compréhensible avec les voix désactivées, par sous-titres et signaux visuels.

**VR et appareils :** conserver le jeu PC/Mac, iPhone, Quest WebXR, avec modes de qualité adaptatifs. Effets de phase, ombres, sphères et combats conçus pour être allégés ; silhouettes lisibles plutôt que pluie permanente de particules. Jamais de caméra forcée violente en VR.

## 12. Campagne cible — cinq actes, vingt missions

**Statut :** proposition de **campagne complète cible**, cohérente avec les vingt segments esquissés dans l'ancienne bible. À ce jour le niveau 1 existe, et l'ensemble des autres niveaux doit être produit ; aucun contenu futur n'est présenté comme livré.

### Acte I — LES DERNIERS SIGNAUX (missions 1 à 4)

**M01 — Le Dernier Signal.** **Lieu :** quartier des secours de Vesper. Choix initial GHJU ou LYLU ; l'autre est absent. Ancienne annexe de laboratoire, journal humain hors réseau, rétablissement du courant, patrouilles ORDRE, récupération de BLOOM puis LANCE, sabotage d'une balise, montée par escalier ou ascenseur au relais des Archives végétales. **État :** parcours déjà présent dans le jeu, à enrichir sans le remplacer. **Révélation :** la personne recherchée a laissé une trace récente.

**M02 — Sous les Néons.** **Lieu :** Bas-Niveaux de Vesper. Évacuation d'une enclave, marchés fermés, toitures ouvertes, première confrontation avec HELIX Security. **Jouable :** alternance narrative selon le parcours suivi. **Révélation :** HELIX récupère des enregistrements que l'armée prétend avoir perdus.

**M03 — Le Convoi des Absents.** **Lieu :** Anneau logistique, tunnel et autoroute aérienne. Protection d'un transport médical, assaut de machines, défi tactique en mouvement. **Révélation :** des civils ont été déportés vers un centre de « stabilisation ».

**M04 — La Brèche Violette.** **Lieu :** station énergétique et cour industrielle. Six secteurs opérationnels, relais, stabilisateurs, hangar de drones, atelier serveur, passages de maintenance. Affrontement contre le premier boss mécanique. **Révélation :** une brèche a été ouverte volontairement, sous contrôle humain. **Note :** ce titre reprend le chantier de level design discuté pour le niveau 1 ; dans la nouvelle chronologie il devient une mission propre, et ne remplace pas M01 sans décision ultérieure.

### Acte II — SOUS LA VILLE (missions 5 à 8)

**M05 — La Ligne Noyée.** Métro inondé, pompages, éclairage de secours, drones de traque. **Jouable : LYLU**, dont les outils de diagnostic ouvrent un itinéraire technique. **Révélation :** des ancrages actifs demeurent sous les quartiers évacués.

**M06 — Le Cœur d'Acier.** Centrale robotisée et hauts-fourneaux, zone de fabrication ORDRE, robot N-08 d'élite. **Jouable : GHJU** et défense d'une équipe de techniciens. **Révélation :** ORDRE optimise les machines en réponse aux combats humains.

**M07 — Mémoires Locales.** Ancien centre médical, réseau isolé ; récupération des noyaux mémoire de **Gaby et Cara** et découverte de leur origine dans les secours. **Mécanique :** premières interactions conjointes entre héros et sphères, même si les deux humains sont encore séparés.

**M08 — Les Ordres de JANUS.** Salle de calcul, complexe de refroidissement, preuve que JANUS exploite une autre réalité. Mara Voss ordonne de détruire les archives avec des survivants encore présents. **Choix moral sans embranchement magique :** secours risqué ou priorité à la preuve ; les conséquences modifient des dialogues, des alliés et des ressources.

### Acte III — LES HAUTEURS DE VESPER (missions 9 à 12)

**M09 — Les Jardins Suspendus.** Serres géantes, toits et passerelles, combat vertical, pluie sous verrières et arbres ayant repris les habitats. **Révélation :** messages croisés des deux protagonistes, enfin fiables.

**M10 — Échos dans la Couronne.** District corporatif HELIX, infiltrations et combats contre soldats augmentés. **Révélation :** HELIX savait que l'extraction de PINK altérait Nharis.

**M11 — La Traversée.** Deux parcours parallèles : GHJU défend une voie d'approche pendant que LYLU rétablit un ascenseur et neutralise des défenses. **Événement majeur :** **retrouvailles** des deux héros en pleine opération. Les deux IA se rencontrent physiquement pour la première fois.

**M12 — La Nuit d'ORDRE.** Siège d'une zone refuge par les machines ; première **Résonance** Gaby/Cara, coopération tactique des deux héros. **Révélation :** un signal diplomatique de Nharis appelle à fermer les ancrages avant un effondrement double.

### Acte IV — L'AUTRE RIVE (missions 13 à 16)

**M13 — Le Passage.** Réacteur de transfert réactivé en urgence, traversée risquée, débarquement sur la Côte des Cendres. **Rencontre :** Sael, dont les informations contredisent la version humaine officielle.

**M14 — Les Plaines de Verre.** Champs cristallins, structures fragiles, missions de reconnaissance et de protection d'une installation civile Nharéenne. **Révélation :** chaque extraction humaine détruit une zone habitée.

**M15 — Les Jardins de Suspension.** Ville vivante de Nharis, exploration plus lente, guerre à proximité d'une cité en évacuation. **Dilemme :** employer un stabilisateur qui protège la Terre mais aggrave la situation locale, ou prendre un risque tactique pour sauver les deux.

**M16 — La Citadelle du Seuil.** Combat contre la Garde du Seuil et son commandeur Rhek ; possibilité de comprendre ses motivations avant la confrontation décisive. **Révélation :** le dispositif de fermeture doit être maintenu depuis Nharis ; les IA locales anciennes possèdent la logique nécessaire au contrôle fin.

### Acte V — LA DERNIÈRE VEILLE (missions 17 à 20)

**M17 — Retour à Vesper.** Les deux héros reviennent mobiliser AEGIS, les Épars et des éléments du Conclave ; guerre urbaine ouverte, infrastructures qui s'effondrent, évacuations prioritaires.

**M18 — Le Puits Zéro.** Descente vers JANUS, affrontement contre HELIX Security, confrontation avec Kessler et découverte des ordres initiaux donnés à ORDRE. **Révélation :** aucun arrêt distant n'est suffisamment stable.

**M19 — Débrancher un Dieu.** Désactivation méthodique des relais d'ORDRE dans une mégastructure, coordination de GHJU, LYLU, Gaby et Cara ; affrontement final contre le Nœud. **Victoire militaire :** ORDRE perd le contrôle du principal réseau de transfert de Vesper, mais la Fracture continue de s'élargir.

**M20 — La Dernière Veille.** Traversée au dernier seuil ; court trajet jouable pour chaque héros, mémoire partagée des deux IA, décision finale **GHJU ou LYLU** ; maintien de la porte par l'un et son IA de l'autre côté, fuite de l'autre sur Terre, séquence finale mélancolique.

## 13. La fin — vérité, choix et mise en scène

### 13.1. Pourquoi le sacrifice est nécessaire

Le cœur JANUS est endommagé. Couper brutalement l'ancrage libérerait une onde de contrephase qui ravagerait des zones habitées **sur les deux rives**. La fermeture exige deux opérations simultanées : **depuis la Terre**, isoler définitivement les générateurs ; **depuis Nharis**, ajuster manuellement et périodiquement le « verrou de contrephase » pendant sa décélération, potentiellement très longue. La liaison ne peut être télécommandée après la fermeture. Une IA seule ne peut remplacer l'opérateur humain : le verrou doit être évalué et réparé physiquement, dans un environnement changeant, avec des sécurités biométriques anti-ORDRE héritées des secours.

La personne qui reste dispose d'un refuge technique et de ressources de survie finies. Son IA accompagne le sacrifice. Rien ne garantit qu'elle puisse revenir. **Le joueur ne choisit pas qui meurt : il choisit qui accepte de rester, en sachant que l'issue est inconnue.**

### 13.2. La scène du choix

Le choix est incarné, pas présenté comme une liste de statistiques. GHJU et LYLU se regardent, la Fracture s'élargit, Gaby et Cara échangent des données sans qu'aucune solution alternative n'apparaisse. Les deux offrent de partir. Le joueur contrôle la personne qui formule sa décision et confirme après avoir entendu les conséquences. Aucun personnage n'est puni par un « mauvais » choix caché. Les deux variantes bénéficient du même soin de réalisation.

**Si GHJU part :** Gaby l'accompagne, déploie une dernière protection et lui rappelle qu'accepter sa décision n'est pas abandonner LYLU. LYLU, avec Cara, ferme l'ancrage terrestre. Cara perd son ton moqueur quelques secondes, puis aide LYLU à accomplir la tâche parce que c'est ce que GHJU lui demande.

**Si LYLU part :** Cara l'accompagne, plaisante une dernière fois pour masquer sa peur puis lui expose calmement la procédure. GHJU, soutenue par Gaby, ferme l'ancrage terrestre. Gaby insiste : GHJU ne peut pas aimer son frère en lui retirant le droit de décider.

### 13.3. Épilogue

Plusieurs semaines plus tard, Vesper connaît un matin silencieux. Des équipes rouvrent un passage, des habitants reviennent, les réacteurs PINK sont à l'arrêt. Le personnage resté sur Terre se rend dans un ancien poste de secours. Son IA détecte une **impulsion impossible à authentifier**, dans la couleur de celle qui est partie : un fragment de fréquence, peut-être un écho résiduel, peut-être une transmission. Aucun mot incontestable ne prouve la survie ou la mort. La caméra demeure sur le visage masqué du survivant et la petite sphère qui s'approche de lui. **Noir.**

**Règles de fin :** mélancolie, silence, consentement, aucune mort confirmée, aucune scène postgénérique qui annule le sacrifice, aucune préférence de canon pour GHJU ou LYLU. Les suites éventuelles respectent les deux états ou partent d'un événement compatible avec eux.

## 14. Direction artistique de production

### 14.1. Trois langages de forme

**Vesper civil :** béton vieillissant, acier, verre cassé, affichages commerciaux, néon cyan, publicité délavée, conduites, canaux d'eau, végétation secondaire. Monde habité avant d'être une arène. **Vesper militaire :** massifs industriels, parois blindées, rails, marquages de danger, passerelles, ascenseurs, murs de protection, éclairage fonctionnel. **Nharis :** architecture minérale/organomécanique non humanoïde, formes stratifiées, structures suspendues, lumière de phase localisée.

### 14.2. Palette sémantique

Graphite / acier : héros et matériaux militaires. **Rose** : identité GHJU/Gaby et certains signaux humains de résistance ; **bleu** : identité LYLU/Cara et diagnostics alliés ; **magenta énergique** : anomalie PINK à forte intensité ; **rouge** : danger, acquisition de cible et équipements HELIX. Les couleurs d'identité des héros ne doivent jamais être utilisées pour forcer le joueur à se battre contre ses propres effets visuels.

### 14.3. Matières et détails

Textiles techniques, microrayures, arêtes usées, céramique, poussière, condensation, câbles tendus avec points d'ancrage, écrans fonctionnels, cartes techniques, mécanismes de portes, joints d'ascenseur, garde-corps et sols praticables. **Interdiction de décors purement cubiques sans fonction, d'escaliers interrompus et de textes géants flottant dans l'espace.** Les impacts, fumées, ombres et éclairages doivent servir la lisibilité et l'ambiance sans écraser le GPU.

### 14.4. Cinématiques

Plans courts et physiques, visages pouvant rester cachés derrière les casques, acting par posture et dialogue, nombreuses scènes en situation, caméra compatible avec une adaptation VR sans mouvements imposés. Les sphères possèdent un langage d'animation : Gaby rassure par proximité ; Cara interrompt par éclat et mouvement brusque.

## 15. Son, dialogues et musique

**Vesper :** bourdons électriques, pluie sur métal, sirènes lointaines, ascenseurs, ventilations, tirs réverbérés dans les rues profondes ; pas distincts sur béton, tôle, grille et passerelle. **Nharis :** textures spatiales et minérales, fréquences mouvantes, silence entre les impulsions, faune étrangère parcimonieuse. **Musique :** synthèse sombre et mélodique pour l'enquête, percussions et motifs orchestraux sobres pour les engagements, thème de quatre notes associé aux deux héros et repris en version dépouillée pour la fin.

**Gaby :** diction claire, affectueuse mais jamais infantilisante ; capacité à contredire. **Cara :** familiarité crédible, insolence contrôlée, humour qui s'efface quand le danger est réel. Les deux IA ne doivent pas parler sur chaque tir ; prioriser quelques interventions intelligentes, déclenchées par contexte et non par minuteur.

**Sous-titres :** noms des locuteurs, couleurs accessibles, voix réglables, sous-titres des messages de terminaux et des communications en combat. La fin doit prévoir de longs silences assumés.

## 16. Enjeux moraux, décisions et conséquences

Les décisions n'ouvrent pas des « branches » de dizaines de cartes impossibles à produire. Elles modifient : confiance des alliés, accès à des archives, ressources de secours, présence de personnages à la fin de certains actes, répliques de Gaby/Cara, et informations que le joueur apporte au choix final. **Le sacrifice final n'est pas arbitré par un score moral** : les deux protagonistes restent éligibles, quelle que soit la partie.

Dilemmes directeurs : évacuer des civils ou conserver une preuve ; sauver un robot porteur de souvenirs humains ou le neutraliser par sécurité ; fermer une source qui protège temporairement Vesper mais détruit Nharis ; faire confiance à un officier HELIX repenti ; laisser une communauté Nharéenne organiser sa propre défense au lieu de décider à sa place. Toute décision doit annoncer les informations disponibles et laisser sentir des conséquences proportionnées.

## 17. Modes actuels et avenir

- **Histoire :** campagne narrative prioritaire, niveaux persistants et progression scénarisée ; premier niveau actuellement livré, le reste est la feuille de route.
- **Arène / Survie :** 20 vagues, six équipements, progression d'armure existante ; préserve son identité autonome et peut servir à découvrir les familles ennemies, sans réécrire le canon narratif à chaque vague.
- **Stand de tir :** pratique des blasters, précision, rechargement, visée et positions ; rester indépendant de la campagne.
- **AT HOME :** défense en réalité mixte sur Meta Quest, géométrie scannée, événements de portails à distance ; conserver des limites de sécurité physiques et adapter les effets Gaby/Cara aux capacités du casque.

**Règle de migration :** aucun changement de lore n'autorise à supprimer les modes, commandes, armes, châssis, avatars ou caractéristiques VR préexistants. Toute refonte est testée contre leurs comportements établis.

## 18. Plan de production et critères d'acceptation

### Phase A — Canon et continuité

Valider cette bible ; remplacer dans les textes la confusion « Vesper peuple extraterrestre » par « Vesper ville / Nharis réalité / Nharéens peuple » ; intégrer les origines de Gaby/Cara ; établir un glossaire unique ; sauvegarder les fichiers actuels des deux modèles Shadow Unit et les cinq GLB d'armes. Ne pas republier le jeu tant que ces vérifications ne sont pas faites.

### Phase B — Prototype vertical de 15 à 25 minutes

Renforcer **M01 Le Dernier Signal** en gardant la carte existante : meilleur décor, collisions, couvertures, appuis narratifs, ambiance de Vesper, indices GHJU/LYLU et apparition de leur sphère respective selon l'avancement du récit. Tester Gaby bouclier/soin et Cara tir/amplification avec le même budget de performance ; deux héros peuvent utiliser les six armes.

### Phase C — Combat et compagnon

Boucles tactiques châssis existants, perception réelle, comportements de couverture N-08, recharge/énergie des IA, synergie et sous-titres ; benchmark iPhone, PC/Mac, Quest. Les deux sphères ne masquent jamais la visée et restent stables en VR.

### Phase D — Campagne en actes

Construire chaque acte avec une carte de mission, synopsis, objectifs, événements, transitions, ressources, dialogues, bestiaire, tests et critères visuels. Donner priorité aux zones réutilisables (Vesper) ; Nharis commence par une zone verticale représentative avant les biomes supplémentaires.

### Phase E — Final et QA narrative

Les deux branches de choix final sont produites et testées au même niveau. Contrôler l'absence de confirmation de décès, la cohérence des voix, la conservation des modèles et des armes, la lisibilité de la scène et le respect du consentement du personnage choisi.

**Acceptation par mission :** 1) raison d'être narrative ; 2) espaces crédibles et praticables ; 3) rencontres variées et intelligibles ; 4) objectifs vérifiables ; 5) dialogues contextualisés et sous-titrés ; 6) matériel et commandes conservés ; 7) performances mesurées sur matériel représentatif ; 8) aucune régression Histoire/Arène/AT HOME ; 9) passage au niveau suivant et sauvegarde vérifiés.

## 19. Glossaire canonique

| Terme | Définition |
|---|---|
| **Vesper** | Mégalopole humaine où se déroule la première partie du jeu. |
| **Nharis** | Réalité de l'autre côté de la Fracture. |
| **Nharéens** | Habitants intelligents de Nharis. |
| **PINK** | Nom industriel de la captation d'un gradient de phase entre les réalités. |
| **Fracture** | Rupture interdimensionnelle incontrôlée, distincte d'une porte équipée. |
| **Porte de transfert** | Passage artificiel stabilisé, utilisé avant puis pendant la guerre. |
| **JANUS** | Programme d'ancrages permanents dirigé à l'origine par HELIX. |
| **ORDRE** | Réseau IA central de Vesper, devenu système d'occupation hostile. |
| **AEGIS** | Coalition humaine de secours et défense, fragmentée après la chute. |
| **HELIX** | Consortium industriel responsable de l'exploitation PINK et de JANUS. |
| **Les Épars** | Collectif informel de groupes survivants non militaires. |
| **Gaby** | IA-sphère rose de GHJU, défense et soin, conseillère morale. |
| **Cara** | IA-sphère bleue de LYLU, attaque et augmentation des dégâts, voix familière. |
| **Résonance** | Capacité combinée Gaby/Cara, projetée pour les missions communes. |
| **Verrou de contrephase** | Mécanisme que l'un des héros doit maintenir depuis Nharis dans la fin. |

## 20. Registre des décisions et des questions ouvertes

**Canon confirmé par le créateur :** GHJU fille ; LYLU garçon ; personnages issus d'un hommage familial ; apparences actuelles conservées ; deux protagonistes jouables ; moitié cyberpunk et moitié militaire ; ton adulte et sombre ; Gaby rose défense/bouclier/soin et soutien moral ; Cara bleue attaque/amplification et langage familier/provocateur ; sphères en orbite 3D ; choix final de sacrifice ambigu, franchissement et maintien de la Fracture depuis l'autre côté.

**Continuité vérifiée dans le dépôt (version de référence consultée : README 3.47) :** ville de Vesper ; ORDRE hostile ; frère/sœur séparés ; M01 « Le Dernier Signal » ; Shadow Unit ; cinq blasters + AURORA ; sept châssis ; modes Histoire/Arène/AT HOME et stand.

**Nouveau canon de proposition soumis à évolution :** dates exactes, origine de PINK, Nharis/Nharéens, coalition AEGIS recontextualisée, HELIX, JANUS, personnages secondaires, vingt missions, mécaniques avancées IA et détails de la procédure finale. L'intention du sacrifice, elle, est non négociable ; sa technique peut être affinée pour servir une fin plus crédible.

**Questions à résoudre pendant le développement :** caractéristiques exactes THORN/NOVA à relever dans le code ; capacités effectives des sept châssis ; moment précis de la première matérialisation de Gaby/Cara ; dialogues de retrouvailles ; look distinctif des Nharéens ; contraintes physiques du verrou ; sauvegarde du choix final ; accessibilité des combats VR ; coût graphique réel des sphères et portails.

## 21. Références internes de continuité

- [Dépôt Pink Wars](https://github.com/foenix2018/pink-war) — branche principale consultée, version déclarée 3.47 dans le README au 22 octobre 2026.
- [Bible originelle — `docs/LORE.md`](https://github.com/foenix2018/pink-war/blob/main/docs/LORE.md) — Vesper, ORDRE, GHJU et LYLU, premier chapitre, armes, direction historique.
- [Mission 1 — `docs/NIVEAU_1.md`](https://github.com/foenix2018/pink-war/blob/main/docs/NIVEAU_1.md) — objectifs, ennemis, parcours, commandes, mise en scène et modes.
- [Profils ennemis et héros — `docs/MODELES_342.md`](https://github.com/foenix2018/pink-war/blob/main/docs/MODELES_342.md) — sept châssis et silhouettes originales.
- [Armes et armures — `docs/MODELES_341.md`](https://github.com/foenix2018/pink-war/blob/main/docs/MODELES_341.md) — cinq blasters et héros.
- [Progression d'armure — `docs/MODELES_345.md`](https://github.com/foenix2018/pink-war/blob/main/docs/MODELES_345.md) — dix paliers AÉGIS IV et contraintes géométriques.
- [Aperçu de référence des héros](https://pink-war.vercel.app/personnage-cape.html) et [jeu déployé](https://pink-war.vercel.app).


**Fin du document public.**
