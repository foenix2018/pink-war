> **CANON DÉFINITIF DU 22/10/2026 — applicable à ce document.** GHJU : fille de petite taille, blonde aux yeux bleus sous son casque fermé ; garder exactement son chara-design Shadow Unit et sa palette rose. LYLU : garçon ; garder exactement son modèle Shadow Unit et sa palette bleue. Gaby : sphère orbitale rose, défense/bouclier/soin et dilemmes moraux. Cara : sphère orbitale bleue, attaque/amplification et réparties familières pertinentes. La fin exige un **choix de sacrifice entre GHJU et LYLU**, maintien de la Fracture depuis l'autre côté par le héros et son IA, **sans confirmer la mort ni la survie**. Les valeurs numériques et nouvelles scènes sont des **cibles de production**, non des éléments existants vérifiés.  

# PINK WARS — LA FRACTURE / TOME II

**BIBLE DE PRODUCTION DES MONDES, COMBATS, ASSETS ET LEVEL DESIGN — ÉDITION 1.2**  
**22 octobre 2026 — Extension technique de la bible illustrée 1.1.**

**STATUT.** Les éléments signalés « existant » correspondent à la documentation du dépôt *foenix2018/pink-war*, principalement versions 3.40–3.47. Les dimensions, comportements, ennemis et lieux signalés « cible » sont des spécifications de conception, non des fonctionnalités publiées. Aucune modification de GitHub ni de Vercel n’est autorisée par ce document seul.

**CANON IMMUTABLE.** GHJU est une fille, LYLU un garçon, tous deux jouent à égalité. Garder leurs modèles Shadow Unit actuels : armures graphite, casque clos, cape, tabard, couleurs rose/bleu, proportions et animations. Gaby est la sphère rose défensive (bouclier, soin, conseil moral) ; Cara, la sphère bleue offensive (tir, bonus de dégâts, réparties familières). Fin ouverte avec choix du héros qui demeure de l’autre côté de la Fracture, accompagné de son IA ; aucune mort n’est confirmée.

## 22. Convention de production et grammaire spatiale

Tout décor doit être conçu pour être **joué**, pas seulement photographié. Un asset est un ensemble : géométrie, matériaux, collisions, LOD, états, animation, son, logique d’interaction, points d’ancrage, variantes et contrôle de performances. Les dimensions ci-dessous sont des **gabarits de départ**, et doivent être rapprochées des capsules, escaliers et caméras réellement utilisés par le moteur.

| Élément | Gabarit proposé | Condition de validation |
|---|---|---|
| Échelle | 1 unité de scène = 1 mètre | Comparer les avatars existants GHJU (réf. 1,70 m) et LYLU (réf. 1,80 m), ne pas redimensionner les personnages. |
| Porte humaine | H 2,25–2,60 m ; passage libre L 1,15–1,80 m | Capsule joueur + arme + compagnons passent sans accrochage. |
| Couloir principal | L utile 2,8–4,5 m | Deux ennemis et un joueur se croisent, couvertures hors du chemin de base. |
| Couloir maintenance | L utile 1,5–2,1 m ; H 2,3 m | Séquences lentes/infiltration, jamais unique route pendant combat massif. |
| Passerelle industrielle | L utile 1,8–3,0 m ; garde-corps H 1,10 m | Collision complète, virages praticables, aucun garde-corps absent aux paliers. |
| Escalier | Marche 16–18 cm ; giron 28–32 cm ; pente cohérente | Montée/descente testées en course et VR, paliers de repos. |
| Couverture basse | H 0,80–1,05 m ; épaisseur 0,25–0,55 m | Les tirs ne traversent pas le collider ; adversaires utilisent cette couverture. |
| Couverture haute | H 1,45–2,10 m | Affordance visuelle et véritable occultation des lignes de vue. |
| Ascenseur combat | Cabine minimum 2,4×2,4 m ; porte L 1,45 m | Entrée/sortie sans téléportation, synchronisation des animations et collisions. |
| Portail personnel | Ouverture utile 2,8×3,3 m | Jamais de spawn dans l’espace occupé par un joueur. |
| Portail blindé | Ouverture utile 6×5 m ou plus selon engin | Zone de dégagement, avertissement lumineux/sonore, navmesh de sortie. |
| Zone de duel type | 22–45 m dans le grand axe | Au moins trois couvertures, deux accès, une issue lisible. |

**Lisibilité:** une zone importante possède un repère dominant à longue portée (tour, faisceau, silhouette), une signalétique intermédiaire intégrée au monde (lumière, panneaux industriels crédibles, conduites codées) et un indice de proximité (son, clignotement, état d’un panneau). Interdiction des grandes flèches flottantes permanentes. Les objectifs essentiels disposent d’une alternative accessible : sous-titres, contraste et forme distincte, jamais la couleur seule.

**Matériaux :** métal peint usé et bords abrasés pour AEGIS ; céramique technique et polymère propres pour HELIX ; alliage oxydé, capteurs, vérins et câbles pour ORDRE ; pierre cristalline, composite irisé et strates asymétriques pour Nharis. Le magenta est réservé aux champs de phase et à GHJU/Gaby ; le cyan marque LYLU/Cara ; le rouge n’indique que menace, urgence ou état hostile des optiques ORDRE.

## 23. Atlas des mondes et biomes traversés

### W01 — Les Secours de Vesper (M01, M17)

**Identité spatiale :** Quartier ruiné après sept ans ; annexe laboratoire, station médicale, viaduc, relais. **État :** Existant pour la base M01 ; extension cible.

**Palette et surfaces :** Béton humide, acier rouillé, végétation pionnière, éclairage ambre de secours. **Paysage sonore :** Vent urbain, oiseaux, relais faible, métal grinçant.

**Grammaire de jeu :** Départ guidé, arènes lisibles, escalier/ascenseur vers +4,8 m.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W02 — Les Bas-Niveaux (M02, M10)

**Identité spatiale :** Rues profondes et étroites sous empilement résidentiel, marchés et enseignes. **État :** Cible.

**Palette et surfaces :** Cyan sale, ambre, ruissellement, câbles bas, vapeurs localisées. **Paysage sonore :** Pluie sur tôle, transformateurs, annonces enregistrées dégradées.

**Grammaire de jeu :** Verticalité 0/+12/+25 m, ruelles et passerelles ; trois itinéraires possibles.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W03 — Anneau logistique (M03, M11)

**Identité spatiale :** Autoroutes superposées, rails, grues, silos, station de fret, ponts. **État :** Cible.

**Palette et surfaces :** Métal galvanisé, brouillard poussiéreux, balisage blanc/rouge. **Paysage sonore :** Fret lointain, signaux ferroviaires, turbines et alarmes.

**Grammaire de jeu :** Grande échelle, poursuites, protection de véhicule, vue vers skyline.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W04 — Puits et stations de phase (M04, M08, M18)

**Identité spatiale :** Cours industrielles, réacteurs segmentés, tuyauteries, blocs de stabilisation. **État :** Cible.

**Palette et surfaces :** Bleu technique, jaune maintenance, cœur magenta réservé aux ancrages. **Paysage sonore :** Ventilateurs basses fréquences, impulsions de phase.

**Grammaire de jeu :** Arènes modulaires à étages, interrupteurs physiques et accès de service.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W05 — Ligne Noyée (M05)

**Identité spatiale :** Réseau métro/pompage partiellement submergé, sas, tunnel technique. **État :** Cible.

**Palette et surfaces :** Carrelage fissuré, mousse verte, condensation, eau réfléchissante limitée. **Paysage sonore :** Gouttes, pompes pulsées, son étouffé.

**Grammaire de jeu :** Section latérale sèche, eau impraticable clairement délimitée, coupures d’énergie.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W06 — Fonderies d’ORDRE (M06, M19)

**Identité spatiale :** Chaînes robotisées, forge, rails d’assemblage, presses, serveurs. **État :** Cible.

**Palette et surfaces :** Acier noirci, métal chauffé, blanc industriel remplacé par rouge hostile. **Paysage sonore :** Moteurs hydrauliques, chutes de pièces, marteaux distants.

**Grammaire de jeu :** Déplacement derrière machines, zones chaudes signalées, boss multi-relais.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W07 — Archives Médicales (M07)

**Identité spatiale :** Centre de soins pillé ; serveurs isolés, dortoirs, blocs stériles. **État :** Cible.

**Palette et surfaces :** Blanc vieilli, vert médico-technique, éclairage réduit, végétation infiltrée. **Paysage sonore :** Monitorings anciens, ventilation lente, silences.

**Grammaire de jeu :** Exploration, découverte de Gaby/Cara, rares combats courts et tendus.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W08 — Jardins Suspendus (M09, M12)

**Identité spatiale :** Serres brisées, arbres sur dalle, façades ouvertes, passerelles horticoles. **État :** Cible.

**Palette et surfaces :** Verdure tempérée, sols humides, rayons traversant verre brisé. **Paysage sonore :** Feuillage, oiseaux, soufflerie des serres, verre sous les bottes.

**Grammaire de jeu :** Couches 0/+10/+25 m, vues longues, combat vertical et refuges.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W09 — Couronne HELIX (M10, M17)

**Identité spatiale :** Sièges corporatifs, places vides, sécurité privée et héliports. **État :** Cible.

**Palette et surfaces :** Verre gris, béton blanc, rouge HELIX, architecture symétrique. **Paysage sonore :** Drones d’annonce, désinfection, alarmes étouffées.

**Grammaire de jeu :** Couloirs filtrés puis plaza ouverte ; infiltration et affrontements propres.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W10 — Frontière de Nharis (M13, M14)

**Identité spatiale :** Côte des Cendres et Plaines de Verre ; terrain minéral fragmenté. **État :** Cible.

**Palette et surfaces :** Noir basaltique, reflets minéraux, horizons mauves sans magenta constant. **Paysage sonore :** Vents sifflants, résonances cristal, battements faibles.

**Grammaire de jeu :** Gorges, boucles rocheuses, enclaves civiles et geysers de phase.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W11 — Cité de Suspension (M15, M16)

**Identité spatiale :** Habitat Nharéen stratifié, ponts organo-minéraux, jardins en apesanteur. **État :** Cible.

**Palette et surfaces :** Roche pâle, composites sombres, bioluminescence discrète. **Paysage sonore :** Résonance musicale locale, souffle de plantes, voix lointaines.

**Grammaire de jeu :** Montrer vie civile et architecture non militaire ; traversées à choix.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

### W12 — Nexus / Dernier Seuil (M19, M20)

**Identité spatiale :** Hyperstructure conjointe JANUS–ORDRE ; seuil biface Terre/Nharis. **État :** Cible.

**Palette et surfaces :** Architecture rectiligne terrestre et géométrie asymétrique étrangère. **Paysage sonore :** Impulsions sub-basses, disparition progressive des machines sonores.

**Grammaire de jeu :** Confrontation tactique puis silence, choix final dans espace protégé.

**Kit modulaire cible :** trois murs de base (plein, fenêtre, porte), quatre profils de sol, deux plafonds, deux variantes d’angle, trois éléments hauts, trois familles de conduites, une grappe de signalétiques, cinq accessoires narratifs, au moins deux itinéraires lisibles ; pièces interchangeables sur grille 0,5 m à contrôler contre le terrain réel. **États :** intact / abandonné / endommagé / occupé ; lumière normale / panne / alerte. Les variantes n’autorisent pas de téléportation ou collisions approximatives.

## 24. Bibliothèque architecturale : cahier des bâtiments

| ID / Asset | Encombrement cible (m) | Matériaux | Espaces jouables | Fonctions / interactions | Monde |
|---|---|---|---|---|---|
| B01 Maison en terrasses | 12×9×13 | Brique, béton, gaines apparentes | 2 à 3 niveaux + toiture | Portes, tiroirs, radio | W01/W02 |
| B02 Tour d’habitation | 22×19×48 | Béton préfabriqué, verre brisé | Hall, 2 étages jouables, toit | Ascenseur, lumière d’urgence | W02 |
| B03 Clinique de secours | 28×20×11 | Céramique vieillie, aluminium | Accueil, triage, bloc isolé | Portes automatiques, armoires | W01/W07 |
| B04 Garage d’intervention | 24×16×9 | Béton, rideaux acier | Atelier + mezzanine | Rideaux, consoles, recharge | W01 |
| B05 Station de métro | 46×19×12 | Béton, carrelage, acier | Quais + mezzanine | Portillons, signalisation, pompes | W05 |
| B06 Salle des pompes | 32×18×16 | Alliage, époxy, passerelles | Plancher + plateforme à +6 m | Vannes, circuits, vibreurs | W05 |
| B07 Usine de châssis | 70×42×22 | Acier industriel brûlé | Production + 2 coursives | Presse, convoyeur, porte | W06 |
| B08 Centre de calcul | 35×25×14 | Composite, béton blindé | Serveurs + sous-plancher | Baies, isolateurs, câblage | W04/W06 |
| B09 Relais de toiture | 9×8×7 | Acier galvanisé | Niveau terrasse | Antenne, alimentation, terminal | W01/W08 |
| B10 Tour agricole | 32×27×62 | Verre, aluminium, végétal | Serres sur 3 plateaux | Arrosage, sas, ascenseurs | W08 |
| B11 Passerelle urbaine | 16×3×5 | Acier, câbles, composite | Pont suspendu | Panneaux, appuis, rambardes | W02/W08 |
| B12 Hangar de fret | 55×30×20 | Acier, béton, aluminium | Sol + pont roulant | Portes, grue, trappes | W03 |
| B13 Tour de contrôle | 20×18×35 | Verre opacifié, alliage | Hall + tête panoramique | Terminaux, ascenseur, alarmes | W03 |
| B14 Bunker AEGIS | 38×30×12 | Béton durci, acier | 2 niveaux renforcés | Portes étanches, radio, tourelles | W03/W17 |
| B15 Siège HELIX | 72×58×110 | Verre, céramique, métal | Lobby, 3 étages jouables | Scan d’accès, drones, panneaux | W09 |
| B16 Laboratoire JANUS | 58×38×26 | Composite stérile, cuivre | Salle ancrage + galerie | Cryostats, sécurité, régulateurs | W04/W18 |
| B17 Réacteur de phase | 60×60×42 | Titane, céramique, cristal | Anneau, sous-sol, passerelles | Stabilisateurs, vannes, ascenseur | W04/W12 |
| B18 Habitat Nharéen | 20×17×21 | Roche composite irisée | Alvéoles et pont | Membranes, écrans lumineux | W11 |
| B19 Archives Nharéennes | 38×26×27 | Strates minérales, verre organique | Dôme et galeries | Tablettes résonantes | W11 |
| B20 Citadelle du Seuil | 90×58×55 | Cristal sombre, métal tissé | Parvis, 3 cours, nef | Verrous, barrières, sentinelles | W11 |
| B21 Nexus final | 110×85×70 | Industrie JANUS + phase | Anneau externe, ponts, cœur | Vannes manuelles, panneaux, verrou | W12 |

**Contraintes de chaque bâtiment :** découper une silhouette extérieure, une version collision simplifiée, une version intérieure jouable, des proxies de destruction et un système de distance de détail ; toute entrée doit avoir un accès logique ; les fenêtres bloquent ou laissent passer les tirs selon leur état réel ; escaliers et ascenseurs sont alignés à l’étage d’arrivée ; aucun « faux étage » au point de passage. Les détails décoratifs de plafond sont fusionnés et non collidants tant que le joueur n’y accède pas.

## 25. Végétations, sols et écologies

**Principe narratif :** sept ans d’abandon expliquent les herbacées et les jeunes ligneux de Vesper, mais pas une jungle tropicale uniforme. Les plantes suivent eau, ensoleillement, substrat, drainage et pollution. Nharis possède une écologie distincte, non humaine, fondée sur la résonance minérale et non sur une surabondance arbitraire de lumière rose.

| ID | Espèce / famille | Écosystème | Hauteur (m) | Implantation | Variantes | Traitement temps réel |
|---|---|---|---|---|---|---|
| FL01 | Herbes de fissure | Vesper | 0,15–0,65 | Rues fendues, terre accumulée | Sèche / verte / polluée | Touffes instanciées, aucune collision |
| FL02 | Lierre de façade | Vesper | 0,5–9 | Mur humide fissuré | Feuillage saisonnier | Plans alphatest, accroches visibles |
| FL03 | Bouleau pionnier | Vesper | 3–11 | Cour ensoleillée et toiture épaisse | Jeune / tordu / mort | Tronc collider, houppier LOD |
| FL04 | Saule de canal | Vesper | 4–12 | Mètres du bassin et canaux | Racines apparentes | Branches vent léger, dalles abîmées |
| FL05 | Fougères de ventilation | Vesper | 0,3–1,2 | Conduites de condensation | Vert sombre | Faible ombre dynamique |
| FL06 | Mousse de quai | Vesper | 0,01–0,06 | Béton humide, tunnel | Texture / volume local | Décal peint, non interactif |
| FL07 | Roseaux urbains | Vesper | 0,7–1,8 | Bassin de rétention | Touffes denses | Collision supprimée pour course |
| FL08 | Vignes de serre | Vesper | 1–6 | Serre brisée, poutres | Tiges / fruits desséchés | Maillage grimpant sur supports |
| FL09 | Lichen ferrique | Nharis | 0,02–0,2 | Roche métallique poreuse | Gris / bleuté discret | Masque shader, pas particules |
| FL10 | Filament vibral | Nharis | 0,4–2,5 | Zone de résonance faible | Tendril translucide | Oscillation à distance, son de contact |
| FL11 | Arbre de verre | Nharis | 5–16 | Plateau minéral fertile | Tronc à strates + frondes | Collider du tronc, chute de fragments rare |
| FL12 | Corolle suspendue | Nharis | 1–4 | Ravins, cavernes humides | Orbe foliaire flottant | Animation lente bornée, pas obstruction |
| FL13 | Plaques mycéliennes | Nharis | 0,05–0,6 | Cavités profondes | Lames minérales | Matériaux irisés, interactions faibles |
| FL14 | Champ d’aiguilles | Nharis | 0,4–1,9 | Plaines de Verre | Groupes orientés au vent | Collision uniquement grosses formes |
| FL15 | Nœud-racine | Nharis | 2–7 | Cité de Suspension | Suspension en arches | Appuis pour route secondaire |

**Distribution :** générer par masques d’humidité, d’ensoleillement et d’accès humain. Dans Vesper, planter en poches (fissures, pieds de murs, bacs, chéneaux), pas à travers l’asphalte intact. Les masses végétales indiquent aussi les routes oubliées ; la silhouette ne doit pas cacher les optiques ennemies. **Budget initial indicatif :** sur téléphone/Quest, grandes plantes statiques avec animation des seules extrémités proches et imposteurs lointains ; sur PC, variantes de vent, ombre locale et densité graduelle, après mesure de performance.

## 26. Véhicules : catalogue fonctionnel

| ID | Nom | Dimensions cibles (m) | Capacité | Milieu | Interactions et simulation | Mission |
|---|---|---|---|---|---|---|
| VH01 | Moto urbaine AEGIS | 2,4×0,85×1,3 | 1 pilote | Rues/cours | Rayon de braquage court, appui latéral, freinage | M02/M17 |
| VH02 | Intervention Secours | 5,8×2,2×2,5 | 2+4 | Quartier Vesper | Portes, rampe médicale, gyrophares, sac de secours | M01/M03 |
| VH03 | VAB léger AEGIS | 6,5×2,7×2,9 | 2+6 | Combat urbain | Tourelle, trappes, roue/pneus destructibles cosmétiques | M03/M17 |
| VH04 | Blindé HELIX | 7,8×3,1×3,2 | 3+6 | Districts/forteresse | Blindages angulaires, canon stabilisé, angles morts | M10/M18 |
| VH05 | Transport VTOL | 12×13×4,4 | 2+8 | Aire/terrasse | Vent rotor, zone d’atterrissage, descente sous sécurité | M09/M17 |
| VH06 | Chariot de fret | 8,2×2,9×3,5 | 1 | Hangar et rails | Bras hydraulique, palettes physiques, alarme recul | M03 |
| VH07 | Foreuse ORDRE | 10×4,8×5,3 | Autonome | Usine/tunnels | Engrenages, butoir, foreuse télégraphiée | M06 |
| VH08 | Convoyeur autonome | 4,0×2,2×1,8 | Sans pilote | Industrie | Bennes et colis, itinéraire balisé, freinage d’urgence | M06/M19 |
| VH09 | Navette Nharéenne | 9×7×3 | 2–4 selon société | Sites de Nharis | Suspension gravimétrique localisée, défauts de phase | M14/M16 |
| VH10 | Plateforme de construction | 11×5×6 | 2 | Cité de Suspension | Suspension lente, rail de sécurité, frein manuel | M15 |
| VH11 | Porteur lourd JANUS | 14×5×5 | 2–4 | Puits Zéro | Charge réacteur, stabilisateurs, arrimage | M18 |

**Pipeline véhicule :** châssis et masse visuelle crédibles, intérieur seulement si jouable, points d’accroche caméra/mains/portes, colliders séparés carrosserie/roues/habitacle, états fermé/ouvert/endommagé/immobilisé, module son diesel/turbine/phase, VFX localisés, éclairage de sécurité. **Conduite** : commencer par une séquence encadrée sur 1 ou 2 véhicules ; la conduite libre multisupport et la VR doivent être évaluées séparément. Aucun véhicule ici n’est présenté comme déjà pilotable.

## 27. Portails, ancrages et Fractures

| ID | Type | Ouverture cible (m) | Silhouette | Anticipation | États machine | Règle de gameplay |
|---|---|---|---|---|---|---|
| PT01 | Transfert de service | 2,8×3,3 | Structure circulaire ou arche rigide | 8–12 s avant activation complète | Verrouillé / stabilise / ouvre / traverse / refroidit | Personnel et petit matériel, alignement sol à sol |
| PT02 | Portail tactique ORDRE | 3,7×4,2 | Emetteurs rabattables + marqueur rouge | 3–5 s de signal au sol/son | Charge / apparition / évacue / désactive | Spawn adversaires hors axe immédiat de tir |
| PT03 | Porte cargo JANUS | 7×6 | Rails, pinces d’ancrage, générateurs | 15 s de montée en phase | Arrimage / purge / transfert / panne | Convois ou blindés sur dalle plane |
| PT04 | Fracture instable | Variable 3–30 | Cicatrice irrégulière sans cadre | Pulsations croissantes et son variable | Ouverte / saute de phase / s’effondre | Obstacle environnemental, jamais sortie surprise injuste |
| PT05 | Seuil Nharéen | 4×5 | Arche organo-minérale stratifiée | Séquence lumineuse maîtrisée | Accorde / ouvre / stabilise | Architecture diplomatique et civile |
| PT06 | Verrou final de contrephase | Coeur >12 | Deux consoles physiques bifaces | Phase lente et décroissante | Réglage / transfert / isolement / maintien | Opérateur + IA doivent rester sur Nharis |

**Technologie cohérente :** un portail équipable comprend seuil, alimentations, au moins deux stabilisateurs, capteurs de pression de phase et circuit de repli. Quand un ancrage perd l’énergie, l’ouverture se rétracte ; une Fracture sauvage peut persister sans structure mais reste dangereuse et instable. Les couleurs distinguent propriétaire et physique : infrastructure AEGIS bleu-gris, ORDRE rouge en alerte, énergie PINK magenta, mais pas une couleur unique pour chaque faction.

**Règles de spawn justes :** sortie distante de la position joueur (minimum à calibrer au test), interdiction derrière la caméra à très courte portée, annonce audiovisuelle, délai de réaction humain, zone sans collision au point d’apparition et absence de projectile tiré pendant l’animation d’assemblage. Le portail n’est détruit que par sa logique d’alimentation, jamais par une simple réduction de points de vie abstraits.

**Effets visuels :** maximum deux plans de distorsion visibles proches, masque de profondeur, anneaux animés instanciés, lumière ponctuelle plafonnée, particules à durée courte et variante VR sans déformation de la stéréo. Ombres des particules interdites sur profils mobiles. Le cœur de Fracture distant utilise une imposture graduée plutôt qu’un volume raymarché permanent.

## 28. Encyclopédie des forces hostiles : châssis et rôles

| ID / Classe | Origine | Hauteur indicative | Rôle tactique | Télégraphie | Contre-jeu | Zones |
|---|---|---|---|---|---|---|
| EN01 Poursuivant / Stalker | ORDRE — existant | 1,8–2,1 m | Approche, feinte, contournement | Optiques qui passent bleu→rouge | Faible si coincé contre couverture haute | Rues, laboratoires |
| EN02 Sentinelle / Seer | ORDRE — existant | 2,0–2,4 m | Snipe/couverture d’angle, vise en hauteur | Balayage capteur cyclope | Se déplace lentement quand flanqué | Quais, toits |
| EN03 Brute | ORDRE — existant | 2,4–3 m | Percée en force, pression en ligne | Arme lourde qui charge, servo grave | Exposition arrière après charge | Arènes larges |
| EN04 Rempart | ORDRE — existant | 2,0–2,4 m | Protège unité arrière, avance au pas | Boucliers avant-bras déployés | Flanc et angle vertical | Escorte/passage étroit |
| EN05 Traqueur | ORDRE — existant | 1,8–2,2 m | Investigue son, transmet alerte | Pavillons acoustiques tournants | Coupure ligne vue + fausse piste | Complexes denses |
| EN06 Rampant / Scuttler | ORDRE — existant | 0,55–0,9 m haut | Approche au sol et attaque latérale | Grattement six pattes, carapace segmentée | Ne franchit pas tout obstacle haut | Maintenance |
| EN07 Sonde / Probe | ORDRE — existant | 0,6–1,0 m diam. | Surveille depuis hauteur, cible | Quatre turbines et voyant directionnel | Fenêtre de vulnérabilité après scan | Rues hautes/serres |
| EN08 N-08 tactique | ORDRE — existant | ~2 m | Couvert, ressort, tire, replie | Mouvement d’épaule avant tir | Peut être délogé par flanc | Laboratoire/couvert |
| EN09 Fusilier HELIX | HELIX — nouveau | 1,7–2,0 m | Tir coordonné, couverture par paire | Communications audibles | Isolement d’un membre du binôme | Couronne |
| EN10 Brouilleur HELIX | HELIX — nouveau | 1,7–1,9 m | Interférence IA et capteurs | Antenne déployée + flash cyan court | Module dorsal destructible | Bureaux/réacteurs |
| EN11 Exosoldat HELIX | HELIX — nouveau | 2,2–2,7 m | Avancée lourde et suppression | Amorçage de canons visible | Joints aux genoux, dos | Hangars |
| EN12 Drone araignée HELIX | HELIX — nouveau | 0,4–0,7 m haut | Pose mines, détourne trajectoires | Son du mécanisme de déploiement | Carapace fragile | Plafonds/sol |
| EN13 Lancier de Seuil | Nharéen hostile — nouveau | 1,9–2,4 m | Charge télégraphiée et esquive courte | Fente lumineuse au sol | Interruption après dash | Plaine de Verre |
| EN14 Tisseur de barrière | Nharéen hostile — nouveau | 2–2,6 m | Dresse écrans orientés | Convergence de fragments | Fragile hors sa barrière | Citadelle |
| EN15 Veilleur de Nharis | Nharéen — contextuel | 2,0–2,5 m | Protection d’une zone civile | Avertissement avant hostilité | Peut être évité par dialogue | Cité |
| EN16 Automate altéré | Phase — nouveau | 1,6–2,5 m | Mobilité intermittente, tirs rares | Chocs de phase rythmiques | Cycle d’arrêt prévisible | Fracture sauvage |

**Comportement partagé de l’IA ennemie (cible):** patrouille → soupçon (bruit détecté / trace visuelle) → enquête → confirmation → engagement → rupture de vue → recherche limitée → retour. La connaissance de la position du joueur n’est jamais globale et instantanée. La vision obéit à l’occlusion, le son à la propagation simplifiée et les alertes passent par une communication localement destructible. **Compatibilité existante :** capteurs bleus en veille, rouges après détection perçue ; conserver les animations et zones de touche actuelles.

**Composition tactique recommandée :** une équipe de 4 à 6 ennemis complémentaires a davantage d’intérêt que 15 tireurs similaires. Limiter l’accumulation d’élites. S’assurer qu’à chaque moment un joueur peut identifier : qui détecte, qui protège, qui frappe, où est la sortie et comment gagner du temps. Aucune unité n’est invulnérable sans justification visible et test de dégâts.

## 29. Boss, phases et contre-mesures

| ID | Rencontre | Mission | Silhouette | Phases / objectifs | Lisibilité |
|---|---|---|---|---|---|
| BS01 | Portique ORDRE | M04 | Deux bras + sentinelles de relais | Couper 2 disjoncteurs protégés → désactiver barrière → ouvrir accès | Écran de charge et angle mort sous passerelle |
| BS02 | Hélice N-08 | M06 | Exo industriel de coordination | Déloger de ses couvertures → isoler réseau de renfort → surchauffe | Choix entre flanc d’usine et sabotage convoyeur |
| BS03 | Régent blindé HELIX | M10 | Exosquelette commandement | Neutraliser drones → casser alimentation extérieure → confrontation mobile | Attaques lourdes lentes et points de rupture |
| BS04 | Commandeur Rhek | M16 | Personnage militaire de Nharis | Duel / négociation préparée par indices, solution non létale possible | Contre-attaque après téléportation limitée |
| BS05 | Nœud ORDRE | M19 | Réseau distribué du Nexus | Ouvrir trois modules physiques synchronisés → débrancher tronçons → repli | Le boss est une installation, non une grosse tête |
| BS06 | Cœur JANUS | M20 | Catastrophe environnementale | Purger les 2 rives → stabiliser manuellement → choix irréversible | Menace rythmée, pas barre de vie |

## 30. Arsenal et progression de combat : fiches de référence

Le dépôt décrit cinq blasters **MK IV** et une lame **AURORA**. On ne change ni leurs modèles, ni les prises, ni le suivi des mains, ni les optiques ×2 de BLOOM et ×4 de LANCE documentées. Les valeurs de dégâts, cadence, chargeur et dispersion restent **à extraire du code courant** avant de proposer tout équilibrage. Les portées suivantes sont des **fonctions de design**, pas des stats déjà opérationnelles.

| ID | Arme | Fonction | Portée visée (cible) | Situations | Règle d’équilibrage | Continuité |
|---|---|---|---|---|---|---|
| WP01 | R9 | Polyvalent | 5–35 m | Départ, secours, cibles courantes | Cadence régulière, faible charge perçue | Modèle GLB MK IV + tir aligné |
| WP02 | BLOOM | Mobile, cadence élevée | 4–25 m | Entrées, couloirs, défense souple | Gestion chauffe ; visée ×2 existante | Modèle MK IV + optique conservée |
| WP03 | LANCE | Précision | 20–90 m | Toits, portiques, optiques ennemis | Fenêtre de visée et ligne de vue claire ; ×4 | Modèle MK IV + point de bouche |
| WP04 | THORN | Impact ciblé | 5–40 m | Remparts / armures lourdes | Temps d’anticipation des tirs lourds à tester | Caractéristiques exactes à mesurer |
| WP05 | NOVA | Puissance de crise | 6–50 m | Boss, protections épaisses | Munitions/charge et temps de récupération | Mécanique exacte à relever dans code |
| WP06 | AURORA | Lame et parade | 0–2,3 m | Corps à corps, neutralisation, découpes | Contact réel sur projectile, aucun guidage | Comportement existant à préserver |

**Modules d’équipement nouveaux à prototyper sans réécrire le noyau :** batterie supplémentaire Gaby/Cara (ressource), isolateur d’ondes (réduit un brouillage), scanner de scène (marque éléments interactifs à courte portée), filtre de phase (réduit une exposition environnementale), lanceur de balise d’itinéraire (pour escouade IA). Aucun module ne doit rendre un boss obligatoire inaccessible si le joueur ne l’a pas trouvé. Les sphères ne nécessitent jamais la destruction d’un modèle d’arme existant.

**Progression récompensée :** maîtrise d’arme, informations débloquées, améliorations contextualisées et nouveaux parcours, pas uniquement points de dégâts. L’Arène conserve ses dix paliers visuels d’armure AÉGIS IV ; la campagne n’a pas vocation à attribuer automatiquement ces dix paliers sans justification narrative.

## 31. Définition intégrable de Gaby et Cara

| Système | GABY — GHJU / rose | CARA — LYLU / bleu |
|---|---|---|
| Orbite repos | 0,65–0,95 m derrière épaule / interpolation douce | 0,75–1,1 m en latéral / micro-anticipation du déplacement |
| Déplacement combat | Se glisse entre trajectoire menaçante et GHJU ; évite viseur | Se place côté menace, avance brièvement hors axe de tir |
| Compétence 1 | Bouclier : segment/projection visible, durée et coût limités | Tir de soutien : courts bursts ciblés à cadence bornée |
| Compétence 2 | Soin : trajectoire serrée, émission discrète, pas résurrection | Amplification temporaire des armes sans modifier l’animation des armes |
| Gestion énergie | Surcharge : grésillement rose puis retrait de quelques secondes | Surchauffe : anneaux bleus ralentissent puis arrêt temporaire |
| Relation joueur | Écoute, question morale, contredit si nécessaire | Humour et mise en garde immédiate, ton familier crédible |
| VR | Jamais devant les deux yeux ni proche du visage | Jamais de traversée rapide du centre de vision |
| Fin | Traverse avec GHJU seulement si GHJU est choisie | Traverse avec LYLU seulement si LYLU est choisi |

**Implémentation suggérée :** système compagnon doté d’un état `Follow/Idle/Combat/Assist/Cooldown/Dialogue/Cinematic`, point de suivi parent de l’avatar mais trajectoire indépendante avec anti-collision. Éléments visuels divisés en coque opaque instanciée, noyau émissif et au maximum 3–5 segments mobiles. Préférer trails très courts à volume permanent ; version Quest à segments et ombres réduits. **Conflit narratif** : Cara et Gaby ne sont pas assujetties à ORDRE, mais leur indépendance doit être démontrée par les archives M07.

## 32. Patrons de level design et rencontres

| ID | Patron | Topologie | Itinéraires | Menaces | Objectif de design |
|---|---|---|---|---|---|
| LD01 | La ruelle en L | Entrée sûre → visibilité obstruée → carrefour de couvertures | 2 routes latérales / 1 sortie claire | Stalker + Sonde | Apprendre sons/angles sans punition aveugle |
| LD02 | Le relais supérieur | Cour au sol → escalier/ascenseur → terrasse | 1 route sûre + 1 risquée | Seer + Probe | Verticalité réelle ; vue du prochain objectif |
| LD03 | Le marché fermé | Place encombrée + chemin par boutiques | 3 routes avec lignes de vue diverses | Fusiliers HELIX | Civilité perdue, objets narratifs et flancs |
| LD04 | Convoi surélevé | Trois segments routiers avec mouvement | Couvertures mobiles + deux sauts courts | Probe + Brute | Poursuite sans déraillement caméra |
| LD05 | Écluse noyée | Salle sèche / bassin / pompes / passerelle | 2 circuits avec vannes | Scuttler + Traqueur | Eau comme obstacle, pas punition cachée |
| LD06 | Chaîne de montage | Convoyeur en mouvement, presses, passerelles | 3 routes synchronisées | N-08 + Brute | Comprendre machine avant combat |
| LD07 | Dortoir médical | Petites chambres + poste central | Boucle de faible combat | Sondes isolées | Respiration émotionnelle et archives |
| LD08 | Jardin suspendu | Serre en hauteur + plateformes ouvertes | Boucle verticale traversable | Seer + Sonde | Jeu de silhouettes sur fond ciel |
| LD09 | Bureau miroir | Hall corporatif + galerie d’accès | Route officielle / technique | Brouilleur + Fusilier | Piratage sans mode binaire forcé |
| LD10 | Pont de retrouvailles | Deux approches séparées convergentes | Alternance GHJU/LYLU | Brute + HELIX | Timing des deux parcours sous contrôle |
| LD11 | Gorge résonante | Plaine visible + encaissement rocheux | Deux approches naturalisées | Lancier de Seuil | Présenter la faune sans effacer le combat |
| LD12 | Cité habitée | Marché Nharéen / lieu sacré / refuge | Route non létale possible | Veilleurs contextuels | Respect population civile |
| LD13 | Citadelle | Cour → nef → terrasses → coeur | 3 étapes de duel Rhek | Garde du Seuil | Boss compréhensible, sortie de combat possible |
| LD14 | Nexus bi-face | Réseau de relais → vanne → seuil | Coopération forte des IA | Nœud ORDRE | Multi-objectifs sans spam d’ennemis |

**Cadence cible** : 2–3 minutes d’exploration ou compréhension, 30–90 secondes d’action tendue, 20–50 secondes de résultat et respiration ; varier au lieu de répéter mécaniquement. Une arène possède une zone d’entrée sûre, au moins deux couvertures réellement bloquantes, une possibilité de reprendre l’initiative, et une sortie annoncée. **Checkpoint** uniquement en état stable (pas en chute, en charge de portail, sur élévateur mobile ou pendant attaque non évitable).

## 33. Cahier mission-par-mission : objectifs, espaces, assets, séquences

### M01 — Le Dernier Signal

**Zone :** W01. **Personnage(s) :** GHJU ou LYLU. **Parcours physique :** Annexe secours → boutique → carrefour → terrasse.

**Séquence interactive :** Réarmer circuit ; lire 2 journaux ; vaincre patrouilles ; BLOOM/LANCE ; neutraliser balise ; relais +4,8 m. **Opposition :** Huit ennemis initiaux et renforts limités ; silhouettes existantes. **Révélation ou enjeu :** Archive de l’autre personnage et direction Archives végétales.

**Construction prioritaire :** **Existant à enrichir**. Garder géométrie, 32 hostiles documentés, quatre pôles narratifs, vraie montée escalier/ascenseur.. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M02 — Sous les Néons

**Zone :** W02. **Personnage(s) :** GHJU ou LYLU. **Parcours physique :** Enclave secourue → galerie marchande → tour de transit.

**Séquence interactive :** Localiser civils ; libérer issue ; choix escorte ou preuves HELIX. **Opposition :** HELIX fusiliers par binômes et quelques machines isolées. **Révélation ou enjeu :** HELIX collecte données de Vesper.

**Construction prioritaire :** Introduire vie du quartier et marché habité par traces. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M03 — Le Convoi des Absents

**Zone :** W03. **Personnage(s) :** GHJU. **Parcours physique :** Dispensaire → route haute → échangeur bloqué.

**Séquence interactive :** Préparer transport ; protéger convoi ; réparer une barrière ; rejoindre gare. **Opposition :** Sondes, traqueurs, embuscade lourde. **Révélation ou enjeu :** Les disparus ont été transférés vers un centre.

**Construction prioritaire :** Véhicule VH02/VH03 ; séquence mouvement bornée. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M04 — La Brèche Violette

**Zone :** W04. **Personnage(s) :** LYLU. **Parcours physique :** Cour réacteur → hangar → relais → stabilisateurs → portique.

**Séquence interactive :** Neutraliser 3 stabilisateurs ; réactiver 2 relais ; boss de portique. **Opposition :** Remparts et sondes ; BS01. **Révélation ou enjeu :** Brèche volontaire, signatures humaines.

**Construction prioritaire :** Six zones jouables liées ; trois altitudes, maintenance crédible. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M05 — La Ligne Noyée

**Zone :** W05. **Personnage(s) :** LYLU. **Parcours physique :** Entrée station → quai → pompes → poste technique.

**Séquence interactive :** Pomper deux secteurs ; ouvrir écluse ; éviter coupure totale. **Opposition :** Rampants et traqueur sonore. **Révélation ou enjeu :** Ancrages sous secteurs évacués.

**Construction prioritaire :** L’eau ne doit pas masquer collisions ni sorties. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M06 — Le Cœur d’Acier

**Zone :** W06. **Personnage(s) :** GHJU. **Parcours physique :** Entrepôt → presses → convoyeurs → halle centrale.

**Séquence interactive :** Protéger techniciens ; isoler robots ; désactiver production. **Opposition :** N-08 tactiques, BS02. **Révélation ou enjeu :** ORDRE adapte la production aux combats.

**Construction prioritaire :** Chaleur annoncée, presse avec sécurité de collision. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M07 — Mémoires Locales

**Zone :** W07. **Personnage(s) :** Alternance. **Parcours physique :** Ancienne salle de triage → archives isolées → dortoir.

**Séquence interactive :** Rétablir circuit hors réseau ; récupérer noyaux Gaby/Cara ; écouter souvenirs. **Opposition :** Sondes limitées. **Révélation ou enjeu :** Origine autonome des deux IA.

**Construction prioritaire :** Première matérialisation des deux sphères, scène calme. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M08 — Les Ordres de JANUS

**Zone :** W04. **Personnage(s) :** GHJU / LYLU en alternance. **Parcours physique :** Refroidissement → serveur → salle d’extraction.

**Séquence interactive :** Collecter preuves ; sécuriser survivants ; choix d’évacuation. **Opposition :** HELIX et ORDRE dans zones séparées. **Révélation ou enjeu :** PINK détruit un autre monde.

**Construction prioritaire :** Dilemme aux informations claires, conséquences persistantes. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M09 — Les Jardins Suspendus

**Zone :** W08. **Personnage(s) :** GHJU. **Parcours physique :** Serres basses → câbles → verrières → terrasse.

**Séquence interactive :** Suivre message ; rétablir canal local ; franchir étage. **Opposition :** Sondes et Seer sur hauteurs. **Révélation ou enjeu :** Dernière trace précise de LYLU.

**Construction prioritaire :** Éclairage soleil/pluie, végétation localisée et verticale. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M10 — Échos dans la Couronne

**Zone :** W09. **Personnage(s) :** LYLU. **Parcours physique :** Place → lobby → centre sécurité → terrasse.

**Séquence interactive :** Pénétrer HELIX ; contourner brouillage ; battre Régent. **Opposition :** Exosoldats, brouilleurs, BS03. **Révélation ou enjeu :** HELIX connaissait la destruction de Nharis.

**Construction prioritaire :** Proposer routes publique / technique / maintenance. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M11 — La Traversée

**Zone :** W03/W08. **Personnage(s) :** GHJU ↔ LYLU. **Parcours physique :** Deux accès opposés → plateforme commune.

**Séquence interactive :** GHJU défend, LYLU débloque accès, retrouvailles. **Opposition :** Sondes, rempart, charge lourde. **Révélation ou enjeu :** Les héros se retrouvent.

**Construction prioritaire :** Bascule jouable scénarisée sans dissonance de position. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M12 — La Nuit d’ORDRE

**Zone :** W08. **Personnage(s) :** Duo. **Parcours physique :** Refuge → remparts → serre principale.

**Séquence interactive :** Défendre civils ; réparer abri ; Résonance des IA. **Opposition :** Assaut combiné châssis existants. **Révélation ou enjeu :** Appel diplomatique Nharéen.

**Construction prioritaire :** Défense à vagues narratives, non mode Survie recyclé. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M13 — Le Passage

**Zone :** W04/W10. **Personnage(s) :** Duo. **Parcours physique :** Préparation sas → seuil → côte de Nharis.

**Séquence interactive :** Stabiliser seuil ; franchir ; contacter Sael. **Opposition :** Automates altérés puis Veilleurs méfiants. **Révélation ou enjeu :** Un autre monde existe et souffre.

**Construction prioritaire :** Premier plan panoramique de Nharis, transition maîtrisée VR. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M14 — Les Plaines de Verre

**Zone :** W10. **Personnage(s) :** LYLU. **Parcours physique :** Crête → cristaux → habitat → ancrage.

**Séquence interactive :** Reconnaître fissures ; escorter Sael ; couper extraction. **Opposition :** Lanciers de Seuil contextuels. **Révélation ou enjeu :** Impact humain sur villes Nharéennes.

**Construction prioritaire :** Faible densité végétale, roche lisible et couverture naturelle. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M15 — Les Jardins de Suspension

**Zone :** W11. **Personnage(s) :** GHJU. **Parcours physique :** Habitat → terrasses flottantes → serre étrangère.

**Séquence interactive :** Protéger évacuation ; choisir régulation plus risquée. **Opposition :** Veilleurs et tisseurs, avec alternatives. **Révélation ou enjeu :** Les Nharéens sont des personnes, pas monstres.

**Construction prioritaire :** Introduction langue/symboles, interactions non létales. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M16 — La Citadelle du Seuil

**Zone :** W11. **Personnage(s) :** Duo. **Parcours physique :** Parvis → nef → remparts → sanctuaire.

**Séquence interactive :** Négocier ou affronter Rhek ; récupérer plans du verrou. **Opposition :** Garde du Seuil, BS04. **Révélation ou enjeu :** Verrou nécessite présence depuis Nharis.

**Construction prioritaire :** Boss option non létale, aucun échec narratif arbitraire. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M17 — Retour à Vesper

**Zone :** W02/W09. **Personnage(s) :** Duo. **Parcours physique :** Citadelle civile → boulevard → bunker.

**Séquence interactive :** Rassembler AEGIS, Épars, alliés ; sécuriser itinéraire. **Opposition :** HELIX + ORDRE en affrontement mutuel. **Révélation ou enjeu :** Guerre ouverte et évacuations.

**Construction prioritaire :** Grande bataille simulée par profondeur sonore et unités limitées. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M18 — Le Puits Zéro

**Zone :** W04/W12. **Personnage(s) :** Duo. **Parcours physique :** Puits → laboratoire JANUS → sas du cœur.

**Séquence interactive :** Atteindre Kessler ; couper alimentation ; découvrir faille. **Opposition :** HELIX et robots restants. **Révélation ou enjeu :** Extinction distante impossible.

**Construction prioritaire :** Architecture industrielle crédible, verticalité mécanisée. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M19 — Débrancher un Dieu

**Zone :** W06/W12. **Personnage(s) :** Duo. **Parcours physique :** Trois branches réseau → cœur ORDRE.

**Séquence interactive :** Désactiver 3 relais ; contre-attaques ; boss BS05. **Opposition :** Châssis tactiques en groupes lisibles. **Révélation ou enjeu :** ORDRE perd réseau, Fracture augmente.

**Construction prioritaire :** Résonance maximale mais ressources bornées. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

### M20 — La Dernière Veille

**Zone :** W12. **Personnage(s) :** Choix GHJU ou LYLU. **Parcours physique :** Deux consoles → passage → verrou sur Nharis.

**Séquence interactive :** Isoler Terre ; choisir opérateur ; traverser ; enclencher maintien. **Opposition :** Pression environnementale, pas boss à PV. **Révélation ou enjeu :** Fin ouverte : aucune certitude de mort/survie.

**Construction prioritaire :** Deux variantes de même durée et soin, IA correspondante suit. **Recette commune :** trois repères spatiaux distincts, une route de repli, colliders jouables, visibilité d’ennemis, sous-titres, état sauvegardable, chargement sans anciens décors résiduels, narration par les objets, seuil FPS/VR validé.

## 34. Lumière, matériaux, sons, climat et effets

**Jour / crépuscule / nuit** : les secteurs de Vesper suivent un cycle narratif plutôt qu’un cycle aléatoire. L’état de lumière raconte l’avancement (matin désolé dans M01, néons pluvieux en M02, crépuscule sur les hauteurs, nuit du siège). Chaque niveau propose une météo stable durant les séquences tactiques difficiles. **Nharis** utilise une lumière diffuse issue de phénomènes atmosphériques et de deux sources de ciel, mais conserve des ombres lisibles et des zones de repos pour les yeux.

| Contexte | Éclairage direct | Ambiance / fog | VFX prioritaires | Ne pas faire |
|---|---|---|---|---|
| Ville sous pluie | Enseignes localisées / fenêtres rémanentes | Brouillard léger au loin | Gouttes proches et ruissellement en decals | Pluie de particules à travers toutes les salles |
| Usine | Luminaires froids / feu localisé | Poussière industrielle, volumes peu denses | Arc sur panne, vapeur aux vannes | Émissifs plein écran permanents |
| Serre | Soleil par verrière cassée | Humidité, halos localisés | Quelques feuilles physiques, gouttelettes | Feuilles animées sur toute la carte |
| Nharis | Lumière diffuse non-magenta dominante | Horizon violet gris et bancs de haze | Résonance cristalline et éclats ponctuels | Ne pas peindre tout le monde en rose |
| Portail | Deux ou trois sources actives au maximum | Distorsion intérieure non stéréoscopique en VR | Anneau, étincelles brèves, turbulence | Raymarching volumétrique continu mobile |
| Sacrifice | Réduction graduelle de tout éclairage | Silence / quasi-silence | Seul filament d’énergie contrôlé | Explosion finale spectaculaire qui détruit l’ambiguïté |

**Audio interactif :** bibliothèque de pas béton, tôle, grille, sol humide, cristal et sol organo-minéral ; acoustique de couloirs et rues ouvertes ; menace audible avant visible ; signaux distincts Gaby (accord chaud court) et Cara (note électrique incisive). Musique à couches et déclenchement par phase de mission ; jamais de boucle triomphale lors du choix du sacrifice.

## 35. Pipeline graphique et conditions d’acceptation

**Plateformes visées :** PC/Mac navigateur, iPhone/iPad Safari compatible, Meta Quest 3 WebXR. Une enveloppe de rendu unique pour toute la campagne est contre-productive : profils configurables qualité basse/moyenne/haute, et validations matérielles réelles. Les budgets qui suivent sont des **hypothèses de travail**, pas des performances mesurées.

| Élément | Téléphone / Quest (cible) | PC/Mac (cible) | QA obligatoire |
|---|---|---|---|
| Visibilité longue distance | HLOD / impostures sur skyline | Architecture distante détaillée selon GPU | Horizon sans popping flagrant |
| Éclairage dynamique | Très limité, ombres sélectionnées | Ombres et sources additionnelles modulables | Basculer sans recharger niveau |
| Instancing | Vegetation, câbles/enseignes répétées | Oui également | Absence de collisions flottantes |
| Portails actifs | Peu simultanément, VFX repli | Nombre augmenté si profil adapté | Spawns annoncés, aucun stutter |
| Compagnons IA | 1 petite sphère active par héros + LOD | Même identité, anneaux supplémentaires | Zéro obstruction du centre de visée |
| Ennemis actifs | Privilégier groupes tactiques plus petits | Échelle selon scène et puissance réelle | IA cohérente, fréquence mesurée |
| Matériaux | Atlas locaux, variantes compactées | Textures plus détaillées possibles | UV et normales corrects |
| Physique | Colliders simplifiés, objets interactifs peu nombreux | Plus d’objets secondaires | Escaliers, ascenseurs, portes, navmesh |
| VR | Confort prioritaire, pas de secousses imposées | Non applicable hors VR | Contrôle réel Quest et confort utilisateurs |

**Standard de livraison d’asset :** `ID_nom_source.blend/glb` + `textures/` + `collision` + `lod` + fiche JSON (dimensions, points de fixation, états, événements sonores, tags de mission), 3 vues écran (avant/latéral/dessus), contrôle de licence, test de chargement hors réseau. Les armes existantes et les modèles Shadow Unit ne sont jamais écrasés par une nouvelle exportation non validée.

**Priorité P0** : progression M01, silhouettes originales, collisions fiables, compagnons fonctionnels, sauvegarde, contrats de fin ouverte. **P1** : kits Vesper, bestiaire HELIX, véhicule de convoi, portails tactiques, actes II/III. **P2** : Nharis complet, boss spéciaux, véhicules pilotables, cinématiques et deux branches finales. Ne pas démarrer la production de 20 cartes indépendantes avant la validation d’une tranche verticale robuste.

## 36. Liens avec le storyboard et interdictions de continuité

Le document **PINK_WARS_STORYBOARD_V1_0.docx** décline cette direction en actes, scènes et plans de caméra. Les cinématiques sont principalement jouées depuis le monde 3D (in-engine), avec alternatives compatibles VR : position fixe confortable, voix, gestes et contrôle de la tête laissé au joueur. Pour les plans illustrés non issus du moteur, la mention « concept / non canon visuel » reste obligatoire.

**Interdictions :** modifier le chara-design GHJU/LYLU ; inverser les couleurs/sexes ; réécrire Vesper comme espèce alien ; présenter Gaby/Cara comme de simples interfaces HUD ; annoncer la mort de la personne sacrifiée ; inventer des statistiques d’armes existantes ; supprimer Arène, Stand ou AT HOME ; reproduire directement des marques, environnements ou armures d’autres franchises.

**Validation créative recommandée avant production :** une planche de trois vues pour chaque nouveau bâtiment clé, bestiaire/boss et véhicule ; une planche de valeur pour chacun des 12 mondes ; blocking jouable du portail et de ses annonces ; storyboard final dans ses deux variantes ; prototype Gaby/Cara en 3D fidèle aux couleurs. Le directeur créatif valide d’abord les volumes, puis le détail et enfin les performances.

## 37. Index des fiches et références de continuité

**Références confirmées dans le dépôt GitHub :** `README.md` (déclaration de version 3.47), `docs/LORE.md` (Vesper, ORDRE, héros, armes), `docs/NIVEAU_1.md` (parcours et contraintes M01), `docs/MODELES_341.md` (armes MK IV), `docs/MODELES_342.md` (sept châssis), `docs/MODELES_345.md` (AÉGIS IV). Les assets nouveaux de ce tome utilisent des identifiants provisoires `W/B/FL/VH/PT/EN/BS/WP/LD/M` et doivent être intégrés à un catalogue source versionné.

**État des créations :** documentation et concept art, non déploiement. Les tableaux dimensionnels servent de point de départ à Blender et au moteur, avec tolérances après tests de collision et FPS. Le storyboard conserve deux fins équivalentes avec signal de survie seulement ambigu, jamais confirmation.
