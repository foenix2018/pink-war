# Portes et guidage des scénarios

Les scénarios utilisant le HUD commun affichent désormais une carte d’objectif persistante et le libellé de l’action contextuelle, jusque-là masqués par les styles du HUD immersif. L’arène et le stand gardent leur présentation actuelle.

Pour M02, une flèche avec distance suit les passages connus du plan (monte-charge, couloir, dispensaire, radio, marché et tour) et les vrais escaliers vers/depuis le pont à +12 m, au lieu de viser au travers des murs. La carte explique les actions, les menaces à éliminer et les manœuvres temporisées. Une pression d’action sans interaction disponible affiche la condition du passage voisin ou l’étape courante.

La commande attendue prend priorité sur une affiche voisine, tout en conservant la lecture volontaire des documents au contact. Les cibles de combat pointent sur les groupes qui conditionnent réellement l’étape, et non sur une autre patrouille.

Les anciens points de contrôle qui omettent des indicateurs de portes sont réparés à la reprise : le monte-charge reste accessible et le coffre reste déverrouillé pour les étapes déjà situées à l’intérieur ou au-delà. La grille, la tour et le convoi conservent leurs conditions de scénario. Les états visuels des portes M02 sont resynchronisés avec les déverrouillages du contrôleur.

## Validation

20 contrôles ciblés réussis, incluant reprise du monte-charge et du coffre, action du lecteur, priorité manivelle/affiche, maintien de lecture optionnelle, prérequis du quai, passages et escaliers, portails et géométrie des portes. Deux contrôles existants des points de contrôle M02 réussis.

Dans le navigateur du niveau 2 : ancien point de contrôle restauré, coffre physiquement et visuellement ouvert ; retour à l’étape du badge, activation du lecteur, ouverture à 100 % et collider retiré ; guidage visible ; aucune erreur JavaScript. Les refus de requêtes externes proviennent du réseau de la machine de test.

Affichage de la carte et du libellé d’action contrôlé à 390×844, 844×390 et 1200×760 : visible, contenu dans la fenêtre et conservé après interaction avec le canvas.

Les 13 contrôles de non-régression du HUD donnent 11 réussites et 2 échecs. Les deux mêmes échecs se reproduisent sur les sources précédemment publiées (attentes textuelles des compteurs et des boutons). La suite générale n’a pas été relancée.
