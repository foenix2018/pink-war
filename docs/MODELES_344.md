# Pink War 3.44 — nacre, optiques et circuits de Vesper

Base : `696ac053df8ef5a48346f42b08f98c48573c024d`, dernière production vérifiée avant ce travail. Les dix mises à jour du stand de tir sont conservées.

## Équipements

Les coques d’AÉGIS III et les flancs des cinq armes IV utilisent un métal teinté sous un vernis nacré : rose pour GHJU, bleu pour LYLU. Réflexions d’environnement, rugosité fine, couche transparente et iridescence modérée ; aucune émission lumineuse sur ces plaques. Les tissus, mécanismes sombres et gants RLH gardent leurs matériaux approuvés. Les plaques ont des coins davantage adoucis ; les biseaux Blender des armes sont élargis de 18 %, sans changer les ancrages des mains ni les sorties de canon.

Les lunettes Blender étaient pleines dans l’axe : elles sont remplacées par de vrais volumes annulaires, ouverts de part en part. La lentille transparente appartient au système optique du jeu. L’épaulé sur écran utilise la hauteur et la profondeur de l’oculaire du GLB chargé, au lieu des anciennes valeurs du modèle de secours. BLOOM conserve un grossissement ×2, LANCE ×4, avec réticule gradué. En XR, seul le rendu dans la lentille est grossi ; ni le champ de vision du casque ni la pose suivie des mains ne sont modifiés. Poignée droite : viser, gâchette index droite : tirer ; B : recharger. AT HOME accepte aussi sa commande de visée existante à gauche.

## Synthétique N-08

Création originale : automate civil humanoïde réquisitionné par ORDRE après la chute, à coque claire, tendons mécaniques et visage fermé. Aucun modèle ni emblème de film importé. Les capteurs restent bleus au repos et deviennent rouges à l’alerte ou à l’engagement, comme ceux des autres machines.

Son choix d’abri utilise la dernière position vue ou entendue. Il vérifie un mur suffisamment haut, une place hors collision, une ligne de tir dégagée à côté de ce mur et un passage libre entre les deux. Les abris proches sont répartis entre les unités. Il rejoint l’abri, attend, sort, tire deux fois puis se replie ; il abandonne un abri devenu exposé ou inaccessible. La planification considère au plus vingt obstacles proches, avec temporisation. Pas de tirs à travers les murs, de déplacement instantané ni de connaissance de la position cachée du joueur.

Présence dans la patrouille du niveau 1 et dans les deuxième et troisième combats, en remplacement de trois unités : 32 ennemis au total et 8 simultanés. Apparition progressive dès la troisième vague en arène et dans le décor extérieur d’AT HOME. Les règles physiques de la zone réelle restent inchangées.

## Installations survivantes

Quatre écrans de diagnostic complètent les terminaux narratifs sans masquer leur texte. Ajout de claviers inclinés, racks ventilés, connecteurs, 27 câbles tubulaires courbés, conducteurs de cuivre arrachés, voyants et balayages lents. Le réarmement du courant active les écrans ; le sabotage éteint le diagnostic ORDRE. Les archives humaines restent hors réseau. Deux petites lumières ambrées sont réservées aux qualités supérieures ; le mode bas garde les surfaces lumineuses simples. Les arcs utilisent un seul tampon de lignes réutilisé et des impulsions espacées. Les nouveaux racks et écrans ont leurs collisions.

La carte Histoire reçoit un horizon de fin de journée, rosé et ambré, pour retrouver la palette de l’image de chargement. Le ciel est peint une fois, sans nouveau passage de rendu en VR. Les autres modes conservent leur ciel.

## Vérification et limites

Tests des axes optiques sur les GLB réellement exportés, de l’alignement et du grossissement, des matériaux, des squelettes et des cycles d’abri avec la simulation balistique complète. Vérification en navigateur du lancement, des viseurs, des objectifs électriques et des vrais ateliers 3D. VR et réalité mixte vérifiées avec IWER ; zone AT HOME de 6 × 6 m explicitement simulée. HTML autonome testé en annulant toutes les requêtes externes, y compris lors d’une perte de contexte graphique. Pas de mesure sur iPhone ou Quest physique.

Le test distant ajouté dans la dernière mise à jour du stand attend maintenant son délai initial d’apparition de cible avant de mesurer le temps de vol ; le comportement du stand n’a pas été changé.
