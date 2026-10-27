# 3.63.17 — Recul des armes

Base : `51b9ab6`, version 3.63.16 de `main`, également publiée sur le domaine de production avant les modifications.

## Sensation de tir

Les six armes à feu possèdent un profil distinct de recul axial, relèvement et récupération :

| Arme | Comportement |
| --- | --- |
| R–9 | Impulsion sèche, relèvement bref, récupération rapide. |
| BLOOM | Faible impulsion par balle, retour rapide, accumulation modérée pendant une rafale. |
| LANCE | Impulsion lourde, latéral limité, récupération plus lente. |
| THORN | Décharge marquée, force liée à la charge relâchée. |
| NOVA | Impulsion la plus lourde, récupération longue. |
| M–12 | Fort coup axial et relèvement, plus de deux fois le recul axial du R–9, avec le cycle de pompe existant. |

Une même pose de recul dessert le stand, l’arène, les deux missions et AT HOME. Elle combine translation dans l’axe du canon, relèvement et légère torsion. Les ressorts amortis reviennent à leur position de repos ; une longue rafale ne produit pas de dérive permanente. La chaleur ajoute au maximum 12 % à l’impulsion suivante. Les déplacements et vitesses restent bornés.

Épauler réduit le relèvement de l’arme ; s’accroupir amortit aussi l’impulsion. Le déplacement de la caméra pendant la visée tient compte du grossissement optique pour conserver une image utilisable dans le sniper. Le sabre ne reçoit pas de recul de tir.

Les deux R–9 de GHJU possèdent chacun leur propre animation, pilotée par leur horodatage de tir. La main et la bouche de feu sont dans le même support animé que le pistolet. Une main ne déclenche pas le recul du pistolet opposé.

## VR et cohérence

En VR, l’amplitude visuelle est réduite à 46 % du mouvement à l’écran. Le recul affecte l’arme et le gant qu’elle porte ; il ne déplace ni le casque, ni les ancrages des contrôleurs. Le rayon physique de visée conserve la direction du contrôleur. Les vibrations différenciées existantes sont conservées.

Les impulsions proviennent uniquement des événements de tirs réellement acceptés par la simulation. Un chargeur vide, une cadence bloquée, une pause ou un rechargement ne créent pas de faux recul. Le changement d’arme efface le ressort résiduel, y compris dans M01.

Les éclairs de bouche de M01/M02 suivent désormais la courte durée du tir, indépendamment du temps de récupération de l’arme. M02 n’affiche plus un éclair permanent pendant le jeu. Les armes, modèles GHJU/LYLU, gants, dégâts, munitions, lore et level design actuels sont conservés.

## Vérification

La suite complète passe : **515 tests**. Quatre nouveaux tests couvrent la hiérarchie des impulsions, le temps de retour, la stabilisation en visée, le grossissement, les rafales, les fréquences 30/72/90/120 Hz, les tirs refusés, les deux mains indépendantes et une mise à jour réelle de `VRController` avec les gants de production. Le test VR vérifie aussi la conservation de la pose de tête, de l’ancrage et du rayon de visée.

Navigateur : tirs réels au clavier et au bouton tactile dans le stand, comparaison R–9/M–12, rafale BLOOM de quatre coups, tir LANCE en visée grossie, chargeur vide sans impulsion. Le retour au repos et les ressources chargées sont vérifiés. Les deux missions démarrent et tirent aussi réellement avec le M–12 ; passer à BLOOM efface ensuite le recul. Les quatre parcours ne signalent aucune erreur JavaScript ni ressource manquante. Les tests VR restent simulés.

Les essais dans le navigateur et captures sont conservés dans `/workspace/livraison/validation_363_17/`. Le format tactile iPhone et les contrôleurs simulés ne constituent pas une validation physique sur iPhone ou Quest 3.
