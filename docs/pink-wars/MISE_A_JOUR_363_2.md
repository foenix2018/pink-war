# 3.63.2 — Anatomie des machines, couvert et propositions de HUD

## Point de départ et périmètre

Cette livraison prolonge la **3.63.1**, commit `770a445e3f04b00899857d7b94cc82fee1819e1e`, elle-même construite sur les correctifs **3.63** du créateur (`13f8470dca2d825edf4a24b4008462c9db204ade`). La 3.64 « Néons de M02 » garde sa place dans la feuille de route.

Les modèles et équipements Shadow Unit de GHJU et LYLU sont conservés : couleurs, gants RLH, armures évolutives, cape arrière, fusil M12 de LYLU et doubles R9 de GHJU. Les scènes, missions, objectifs, progression et chronologie du book ne changent pas. Le Rampant et la Sonde conservent leurs locomotions et rôles propres. Aucun nouveau protagoniste ou événement narratif n’est introduit.

**Le HUD du jeu n’est pas remplacé.** Les trois pistes demandées sont proposées dans un comparateur indépendant, `hud-liquid-glass.html`.

## Six silhouettes bipèdes plus humaines

Poursuivant, Sentinelle, Traqueur, N-08, Brute et Rempart partagent désormais un châssis humanoïde : épaules, coudes, poignets, bassin, genoux et chevilles suivent les centres articulaires de la référence RLH déjà utilisée par les héros. Les unités lourdes gardent une largeur supérieure ; les éclaireurs sont plus fins.

Le blindage utilise des surfaces facettées et chanfreinées, des volumes effilés, une cuirasse raccordée au col et des plaques abdominales superposées. Les casques sont fermés, avec un logement de visière, des modules latéraux et des optiques indépendantes. Les cuisses et tibias cessent d’être des volumes gonflés. Les mains mécaniques possèdent quatre doigts et un pouce ; les semelles et coques des pieds sont profilées. Les surfaces graphite patinées de la 3.63.1 et la coque claire du N-08 sont conservées.

Les quatre unités légères de tir, N-08 compris, emploient le fusil compact à deux poignées. La hauteur et les prises sont recalées sur leurs bras humains. Les deux poignets suivent toujours leurs poignées par cinématique inverse. Brute et Rempart conservent leurs équipements lourds distincts. Le canon visible et l’origine des projectiles utilisent la même implantation.

### Réutilisation du squelette et des mouvements RLH

`tools/build-enemy-humanoid-reference.mjs` mesure les positions articulaires de la source RLH de **34 os**, puis échantillonne ses véritables clips **Idle Rifle (`rifle`), Rifle Walk (`walkRifle`) et Run**. Le résultat reproductible est enregistré dans `enemy-humanoid-data.js` (~8 Ko), avec l’empreinte SHA-256 de la source.

Il s’agit d’une **adaptation sur un rig ennemi léger** : les ennemis ne chargent pas chacun le corps du pompier, ses textures ni un mélangeur d’animations complet. Les articulations et trajectoires de pieds viennent de cette référence, tandis que la visée, la flexion des jambes et les mains sont adaptées aux machines par cinématique inverse. Les deux héros et leur source RLH ne sont pas modifiés.

Les pas avancent selon la distance réellement parcourue, avec une transition marche/course. Un robot immobilisé ne marche plus sur place. Un appui reste au sol pendant la marche, les chevilles et semelles restent horizontales ; l’accroupissement fléchit les jambes au lieu d’enfoncer les pieds dans le sol.

## Se mettre à couvert dans la géométrie du jeu

L’ancien filtre rejetait systématiquement les murs de moins de 1,72 m. Le choix dépend maintenant de la taille réelle du robot et de sa capacité à s’accroupir. Un couvert d’environ 1,35–1,50 m peut protéger l’infanterie normale ; une unité élite plus grande exige davantage de hauteur. Un obstacle trop bas reste refusé.

Chaque proposition doit offrir :

1. Une position derrière laquelle **le capteur et le sommet du casque** sont cachés depuis la dernière position perçue du joueur.
2. Une sortie latérale avec **une ligne libre pour le capteur et le canon**, et une place suffisante pour le corps.
3. Un trajet latéral sans traverser le mur ni occuper le couvert déjà réservé par un autre robot.

Deux profondeurs de retrait sont essayées près des coins pour éviter qu’une ligne oblique contourne la protection. La hauteur d’accroupissement varie selon le mur. Le robot se déplace, attend à couvert, sort pour tirer et se replie ; les tirs proches et les charges continuent de provoquer suppression ou esquive.

La perception part désormais des optiques du modèle. La navigation part du corps, à faible hauteur : voir au-dessus d’un mur ne signifie pas pouvoir le traverser. Une mémoire locale de contact, plafonnée à douze secondes sans nouvelle perception, laisse terminer la manœuvre. Elle ne met pas à jour la position d’un joueur caché et n’autorise pas à tirer sur lui.

Si un trajet vers un couvert ne progresse plus pendant trois secondes, ce point est évité pendant neuf secondes. La fenêtre est réinitialisée à chaque nouveau trajet et à chaque retour ; une attente normale ne compte pas comme un blocage. C’est une **mémoire tactique locale**, pas un entraînement de réseau neuronal. Les règles communes sont appliquées en histoire, arène et AT HOME ; les contraintes de déplacement physique d’AT HOME restent imposées par la pièce.

## Comparateur Liquid Glass — à choisir avant intégration

Accès : [`hud-liquid-glass.html`](https://pink-war.vercel.app/hud-liquid-glass.html?v=3.63.2). Il utilise des captures réelles des décors du jeu et des compteurs simulés. Il ne lance ni une mission ni une session VR.

| Piste | iPhone | Mac | Compromis |
| --- | --- | --- | --- |
| **A — Dock adaptatif, recommandé** | Santé/bouclier au-dessus du joystick gauche ; une capsule arme/munitions à droite ; tir, visée et saut directs ; charge et mêlée regroupées | Informations aux deux coins inférieurs, raccourcis discrets, aucun bouton tactile | Bon équilibre entre accès au combat et visibilité |
| **B — Bandeau compact** | Santé, bouclier et munitions dans un seul bandeau | Bandeau en bas au centre | Lecture concentrée, davantage de place prise en haut sur iPhone |
| **C — Immersion** | Essentiels permanents ; palette « … » pour les actions secondaires | Essentiels dans les coins, encore plus discrets | Une pression supplémentaire pour la charge ou la mêlée |

Dans les trois pistes : objectif court dépliable, point de direction discret, plus d’encart narratif permanent, un seul menu pause regroupant reprise/réglages/VR/accueil, interaction affichée à proximité seulement. Santé, bouclier et munitions restent visibles ; pas de compteur doublonné sur l’arme. Les compétences d’alliés n’apparaîtront qu’après leur déblocage narratif.

L’aperçu permet de comparer portrait/paysage/Mac, jour/nuit, GHJU/LYLU et contraste renforcé ; tirer, recharger, changer d’arme, simuler un dégât et ouvrir la palette ou la pause sont interactifs. Le contraste renforcé retire le flou. Les commandes tactiles mesurent au moins 44 px ; les petites variations de largeur iPhone sont prises en compte. Le verre utilise au plus trois surfaces de flou permanentes, plutôt qu’un flou par bouton.

Après sélection, l’intégration devra conserver les commandes existantes, tenir compte des zones de sécurité Safari et de l’encoche, des libellés manette et de la présence des compétences à M07. Le HUD VR devra garder son organisation adaptée au casque : le choix d’un écran plat ne vaut pas validation d’un nouveau panneau VR.

## Vérifications

**457 tests automatisés passent, dont six nouveaux contrôles pour cette livraison.** Les tests ajoutés mesurent la provenance du rig et les articulations, les appuis et l’absence de marche sur place, la hauteur des couverts et les lignes de tir, les trajets réellement simulés, la mémoire des points bloqués et l’expiration du contact. Dans une simulation complète de quarante secondes derrière un mur de 1,50 m, les quatre unités légères répètent chacune au moins huit cycles de couvert et effectuent seize à dix-sept tirs, exclusivement depuis une sortie exposée. Les corps ne traversent pas le mur et aucun trajet valide n’est signalé bloqué.

Les robots utilisent au plus six lots de rendu et entre 6 128 et 6 688 triangles pour les six bipèdes normaux de tir, toujours sous le plafond de 11 000 triangles, sans nouvelle lumière dynamique. Les buffers géométriques et les matières sont partagés. Le fichier de référence compilé évite le chargement du modèle RLH complet par ennemi.

Les essais navigateur concernent l’atelier, M02 sur ordinateur et iPhone émulé, ainsi que les neuf combinaisons HUD/écran et plusieurs largeurs de fenêtre. Les captures et rapports sont dans `/workspace/livraison/captures_363_2/`. Ces contrôles utilisent Chromium ; ils ne constituent pas une mesure de performances sur un iPhone ou un Quest physiques.
