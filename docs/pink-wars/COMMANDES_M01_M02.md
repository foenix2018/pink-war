# Pink Wars — commandes communes aux missions 01 et 02

**Canon de commande (22 octobre 2026).** Le niveau 1 « Le Dernier Signal » utilise la carte Vesper V7; le niveau 2 « Sous les Néons » et le niveau 1 doivent préserver le même schéma d'interaction. Ce document définit les affectations d'entrée, pas une fusion des deux moteurs.

## PC / Mac

| Action | Commande |
| --- | --- |
| Avancer / reculer | W/Z et S |
| Déplacement latéral | A/Q et D |
| Regarder | Souris, flèches directionnelles |
| Tir | Clic gauche ou Espace |
| Visée maintenue | Clic droit |
| Saut / double saut | J |
| Interagir / récupérer | F |
| Arme suivante | E |
| Recharger | R |
| Frappe de mêlée (3.63) | X ou clic molette |
| Charge à impulsion (3.63) | B (G reste le menu Gaby / Cara) |
| Accroupir | C |
| Courir | Maj |
| Vue | V (la mission 01 conserve temporairement sa caméra libre de visite) |
| Pause | Échap |

La mission 01 conserve ses raccourcis de visite/debug spécifiques (F1–F7 pour les secteurs, M pour la carte, P pour masquer l'interface), sans empiéter sur les commandes de combat. L'éclairage portatif se commande désormais avec L.

## Manette standard / DualShock 4

Stick gauche : déplacement ; stick droit : orientation ; L2 : visée ; R2 : tir ; Croix/A : saut ; Carré/X : rechargement ; Triangle/Y : arme suivante ; Rond/B : accroupissement ; L3 : course ; R3 : interaction ; L1/LB : charge à impulsion ; R1/RB : frappe de mêlée (3.63) ; Options/Menu : pause. Tester les périphériques physiques sur chaque plateforme.

## Mobile / iPhone

- Joystick tactile **à gauche** pour le déplacement.
- **Moitié droite de l'écran** disponible pour orienter la caméra par glissement. Pas de joystick caméra superposé.
- **VISER au centre inférieur**, appui maintenu.
- **SAUT directement au-dessus du viseur**, possibilité de double saut avec deux appuis.
- **TIR à droite**, appui maintenu ou répété selon l'arme.
- Interagir, changer d'arme, recharger, accroupir, vue et pause restent accessibles par des boutons secondaires.
- **MÊLÉE** et **CHARGE** (3.63) : deux boutons ronds au-dessus du groupe de tir, au même endroit dans l'Arène, le Stand et M02 ; en M01, CHARGE se place au-dessus du bouton de course. Le bouton CHARGE indique le nombre de charges restantes.
- Les commandes capturent leurs pointeurs indépendamment : le joueur peut avancer, orienter et tirer simultanément sans perdre son contrôle.
- Les appuis de tir, visée et déplacement doivent être libérés sur `pointerup`, `pointercancel`, `lostpointercapture` et en cas de mise en pause ou perte du focus.

## Casque (Quest 3)

Mêmes commandes que l'Arène et le Stand (3.64) : index droit = tir ; **majeur gauche = épauler** (la lunette vient devant l'œil droit et le tir converge sur le réticule) ; majeur droit serré = course ; clic du stick droit = frappe de mêlée ; gâchette gauche = charge à impulsion (sauf avec les pistolets doubles, où elle tire avec la seconde arme). Jusqu'en 3.63, les missions inversaient les deux majeurs.

## Implantation

- M01 : `dist/vesper-level1-v7.html`
- M02 : `dist/level2-input.js`, `dist/level2-test.js`, `dist/level2-test.html`
- CSS partagé avec le moteur principal : `dist/mobile-controls-v7.css`
- Vérifications statiques : `tests/352-unified-controls.test.mjs`, `tests/363-armor.test.mjs` (bouclier, mêlée, charges)

**Périmètre :** uniformisation des commandes. Les ennemis, la progression, les animations Shadow Unit et la fusion du rendu V7 dans le moteur de campagne ne sont pas modifiés par cette intervention.
