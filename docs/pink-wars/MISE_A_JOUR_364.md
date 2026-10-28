# Version 3.64 — Gants raccordés, lunettes précises

Version de corrections à partir de la 3.63.26 (« visée Quest à la poignée gauche »). Elle répare ce que la vérification de cette version a relevé, raccorde les gants aux avant-bras et règle la visée de toutes les armes. Aucune arme, aucun mode ni aucune commande n’est retiré.

## Gants : poignet et manchon sans cassure

- **Poignet souple.** Le manchon n’est plus un bloc rigide accroché de biais sous la main : sur les 7,5 derniers centimètres avant le poignet, il passe progressivement de l’orientation de la main à celle de l’avant-bras (pondération de peau sur deux os). Le bord du manchon reste collé au poignet, la courbe se fait dans les soufflets, sans marche ni angle vif. Valable pour tous les gants : écran, casque et personnage vu de dos.
- **Avant-bras complets à l’écran.** En vue à la première personne, chaque gant se prolonge par un avant-bras AÉGIS (sous-combinaison, nervures, plaque dorsale, liseré à la couleur du héros, coudière et coude fermé) jusqu’au coude. Le manchon ne se termine plus par un bord ouvert flottant sous l’arme.
- **Bras orientés vers les coudes.** Le bras de tir part en arrière vers le coude droit, le bras d’appui part de la poignée avant vers le coude gauche, au lieu de pendre à la verticale. Les deux sortent toujours de l’écran (vérifié pour chaque arme, à la hanche et en visée, en 16:9, 4:3 et sur téléphone en portrait).
- Au casque, les mains suivies gardent leur manchon court : on ne connaît pas la position du coude, un avant-bras rigide traverserait la vue.

## Lunettes de visée précises pour toutes les armes

La 3.63.26 avait ajouté la visée à toutes les armes, mais avec des hauteurs d’optique estimées : l’œil se plaçait 6,6 cm sous le réticule du VX-9 et 17 cm sous celui du THORN V8 (la caméra se retrouvait dans la carcasse), et la NOVA n’avait aucun viseur.

- Chaque modèle (VX-9, NEXUS V9, ARES X9, THORN V8) donne désormais lui-même le **centre exact de son réticule** ; la table commune des optiques reprend ces valeurs, et un test vérifie qu’elles restent identiques.
- **NOVA** : nouveau viseur reflex compact sur le dessus du boîtier (cadre, verre, point et anneau rouges).
- **Sur écran** : en visée, le centre du réticule tombe exactement au centre de l’écran, là où part le tir (vérifié au pixel sur les sept armes, M12 compris avec son guidon). Le disque de verre en surimpression est masqué quand le modèle a sa propre fenêtre de visée.
- **Au casque** : en épaulant, le centre de la lunette vient sur l’axe de l’œil droit ; le M12 est épaulé à 30 cm de l’œil, et non plus tenu à bout de bras. Le tir part de la bouche du canon et **converge sur le point visé** par cette ligne de visée (mur, machine ou cible du Stand), au lieu de partir parallèlement quelques centimètres plus bas.
- Rien de la ligne de visée n’est masqué par une pièce opaque de l’arme (testé).

## Corrections

- **Chapitres après une partie** : après l’Arène, choisir « 02 — Sous les Néons » dans Histoire puis JOUER relançait l’Arène. Le chapitre choisi est maintenant celui lancé, avec les mêmes pages et paramètres qu’au premier lancement (M01 Vesper V7, M02).
- **Casque, missions** : M01, M02 et la Couronne utilisaient les deux majeurs à l’inverse de l’Arène et du Stand. Partout désormais : majeur gauche = épauler, majeur droit = courir. La visée des missions place aussi la lunette devant l’œil et fait converger le tir.
- **Casque, mode précision** : la poignée de course activait en plus un mode « précision » caché ; il est réservé aux manettes d’écran.
- **Aide des commandes Quest** : en mode gaucher, la liste contenait un doublon et attribuait le tir à la mauvaise gâchette. Les libellés suivent maintenant la main de tir ; l’aide de l’accueil et le README décrivent la disposition actuelle.
- **Numéro de version** : l’accueil affichait 3.63.20 et 3.63.26 en même temps. Une seule version (3.64.0) partout, y compris dans les clés de cache.
- **Sentinelle de la vague 1** : elle apparaissait 14 m devant le joueur sans vérifier le décor. Elle choisit maintenant un sol libre (pas dans un abri ni dans un portail) en vue directe, au plus près de ce point.

## Vérifications

- Tests automatisés : 541 réussis, 0 échec. Nouveau fichier `tests/364-gloves-sights.test.mjs` (poignet souple, bras hors champ, réticules centrés, ligne de visée dégagée, visée au casque sur l’axe de l’œil, convergence du tir, commandes des missions, chapitres, version, Sentinelle). Les tests devenus faux après les changements voulus de la 3.63.26 (poignées Quest, chapitres, Sentinelle, crosse du THORN V8) ont été mis à jour.
- Navigateur (Chromium, rendu logiciel) : Stand avec chaque arme à la hanche et en visée, Arène, passage Arène → chapitre 02, M01, M02, Couronne, iPhone émulé ; casque Quest 3 émulé (Arène et M02).
- Casque émulé : la lunette du VX-9 se place exactement sur l’axe de l’œil droit (écart mesuré : 0 mm, à 26 cm) ; majeur droit = course sans visée ; relâcher le majeur gauche rend l’arme à la main.
- Limites : rendu logiciel lent, pas de mesure sur iPhone ni sur Quest 3 réels. Avec le casque émulé, la console affiche toujours un avertissement de rendu (« attribut normal manquant ») dès l’accueil, comme en 3.63.26 : aucun objet éclairé de la scène n’est en cause, il reste à identifier sur un vrai casque.
