# Pink Wars 3.92.0 — cinq stades de tenue

La progression des tenues remplace les dix anciennes évolutions cosmétiques. La tenue fabriquée et équipée détermine désormais les capacités réelles. Les chapitres et vagues ne livrent plus automatiquement des modules. Les cinq matériaux et les deux couleurs reprennent la référence fournie ; les corps, casques, mains, capes et animations canoniques restent utilisés.

| Stade | Matière | Plan dans le chapitre | Fabrication NP | Total NP des tenues | Systèmes |
|---|---|---:|---:|---:|---|
| 1 | Tissu technique | Départ | 0 | 0 | Saut simple, protections légères |
| 2 | Céramique | 2, maintenance du dispensaire | 200 | 200 | Double saut, bouclier projeté 60 |
| 3 | Titane | 5, atelier de la Ligne 9 | 900 | 1 100 | Jetpack 2 secondes, bouclier 80 |
| 4 | Carbonatium | 9, archives Biotech | 1 800 | 2 900 | Grappin 20 m, bouclier 100 |
| 5 | Bastion : carbonatium, Kevlar, céramique | 15, laboratoire de blindage prévu | 3 000 | 5 900 | Bouclier 180, dégâts santé −50 %, dégâts absorbés au bouclier −35 % |

Les capacités précédentes sont conservées. Le double saut du stade 2 est une impulsion seule ; il ne déclenche pas le maintien du jetpack. Les tenues 2/3/4 réduisent aussi les dégâts à la santé de 5/12/20 %. Les améliorations nano de bouclier, recharge, blindage et treuil s’ajoutent sans cumul au rechargement d’une sauvegarde. Le renfort du bouclier ne réduit pas les dégâts qui atteignent une santé sans bouclier.

## Ressources et plans

`tools/balance-outfits.mjs` produit le calcul reproductible. Le scénario de référence récupère 60 % du stock des groupes d’ennemis écrits : 8 157 NP jusqu’au chapitre 15, dont 5 900 pour les quatre fabrications et 2 257 pour les achats facultatifs. Le niveau 1 utilise son vrai directeur ; les chapitres 3 à 10 leurs véritables groupes, dont certains sont facultatifs. Le chapitre 2 et les futurs chapitres 11 à 15 sont des hypothèses signalées dans le rapport : 35 ennemis au chapitre 2, puis une cible de 24 unités de niveau correspondant par chapitre futur. Ce calcul n’est pas une garantie avec un chemin qui évite tous les groupes, ni après des dépenses illimitées en armes. Les débris doivent être approchés ; les rendements existants, le bonus d’extraction et les ressources de chaque héros sont conservés.

Le plan et le prix intégral sont nécessaires. La fabrication est séquentielle et se fait uniquement dans l’atelier de la planque, par Gaby pour GHJU ou Cara pour LYLU. Les archives permettent de récupérer les anciens plans manqués, sans livrer les plans futurs. Le plan Bastion a le niveau 15 dans les données : le chapitre 15 n’est pas encore jouable et aucun plan n’apparaît prématurément au niveau 10. Son implantation définitive devra suivre le véritable plan de ce chapitre quand il sera créé.

Les ressources supplémentaires restent un choix : dépenser en armes peut retarder la tenue suivante. Aucune prime de mission duplicable n’a été introduite. Arène et stand possèdent les cinq systèmes en essai, sans toucher aux sauvegardes de campagne.

## Atelier, tenues et sauvegardes

L’atelier montre les cinq étapes, les plans, les coûts et les raisons de verrouillage. Une fabrication réussie équipe immédiatement le nouveau stade. La salle des tenues peut rééquiper un stade déjà fabriqué ; revenir à un stade plus faible désactive ses capacités supérieures. Changer de tenue ne recharge pas le bouclier : repos et stations servent toujours à cela. Chaque héros conserve ses achats et son choix entre les niveaux et après fermeture du navigateur.

L’ancien profil nano garde sa version 1 et ses plans, armes, améliorations, balance et total récolté ; les nouveaux champs `suitVersion`, `suitStage`, `equippedSuit` ajoutent la progression. Une ancienne sélection cosmétique ou un chapitre élevé n’octroie pas une fabrication payante. Les achats sont sauvegardés avant application ; une erreur d’écriture annule la dépense et l’obtention du stade.

Les modèles utilisent les vraies géométries d’armure liées aux os, avec des masques d’indices par stade, des finitions céramique/titane/composite, un projecteur gauche, un treuil et des renforts multicouches au stade Bastion. Le pack dorsal est visible à partir du stade 3. Les captures statiques des vrais modèles restent disponibles pour chaque stade et chaque héros dans les outils de présentation. La planque interactive conserve les deux nouvelles centrifugeuses : leurs vrais modèles sont chargés à la demande, assemblés par le vortex et retirés après transfert. Les anciens mannequins statiques ne sont pas chargés en même temps. Les cinq stades des centrifugeuses utilisent les mêmes plans, achats et capacités ; une simulation de l’autre héros ne fabrique ni n’équipe gratuitement sa tenue. L’aperçu `tenues.html` permet de tourner les deux modèles et de comparer les cinq étapes ; il ne modifie aucune sauvegarde.

## Vérification

- `tests/392-outfit-stages.test.mjs` : conditions de fabrication, sauvegarde atomique, isolation des héros, rechargement, plafonds, dégâts et vraies capacités de chaque stade.
- `tests/391-universal-double-jump.test.mjs` : la tenue 2 reste utilisable dans tous les chapitres à différentes cadences, y compris un ancien chapitre rejoué après fabrication.
- `tools/verify-outfits.mjs` : comparaison 3D réelle, atelier par les boutons, achat, présentoir et rechargement sur ordinateur et viewport/tactile iPhone émulé.
- Les captures WebGPU compilent les matériaux sur le backend natif (Vulkan logiciel pour ces contrôles). Aucun chiffre de performances d’un iPhone physique n’est déduit de cette émulation.

## Correction de la pose des mains

La pose de présentation utilise les axes anatomiques du gant : doigts vers le sol, pouces vers l’avant et paumes vers les cuisses. Le roulis des os prévu pour tenir une arme n’est plus réutilisé à main nue ; la gauche est réfléchie une seule fois. Les dix captures de présentoir sont régénérées depuis cette pose. Les squelettes, longueurs des bras et points d’attache des poignets sont conservés ; les adaptateurs de prise des armes restent distincts. Des contrôles des axes anatomiques couvrent les cinq stades des deux héros, même avec un personnage tourné et déplacé, et quatre gros plans proviennent du rendu WebGPU réel.
