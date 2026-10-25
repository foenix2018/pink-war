# Version 3.62 — Corrections et interface de combat unifiée

Première livraison de la feuille de route « cyberpunk / jouabilité Halo » ([FEUILLE_DE_ROUTE_CYBERPUNK_HALO.md](FEUILLE_DE_ROUTE_CYBERPUNK_HALO.md)) : correction des défauts relevés lors de la vérification de la 3.61, puis une seule interface de combat pour tous les modes.

## Défauts corrigés

- **Menu d’accueil affiché pendant la partie (Arène et Stand de tir).** Les menus Fracture positionnent l’accueil avec un sélecteur d’identifiant (`#lobby{display:flex}`), plus fort que la règle `.playing .lobby{display:none}`. L’accueil est désormais masqué explicitement pendant une session et dans l’atelier de tenue.
- **En-tête de l’accueil.** Sur ordinateur, la carte du menu commence sous le logo, qui ne chevauche plus la ligne « VESPER / APRÈS LA CHUTE ». Le logo affiche **PINK WARS**, comme le titre.
- **Couverture de la mission 02.** Le titre « SOUS LES NÉONS » était dessiné derrière la carte du menu ; il est placé à droite de l’illustration.
- **M12 de LYLU.** À la hanche, le M12 se tient un peu plus bas et tourné vers l’extérieur : la main de tir apparaît sur le flanc droit au lieu d’être cachée par la carcasse. L’écart disparaît progressivement à la visée ; la vue dans les organes de visée est inchangée. Les autres armes gardent leur pose.
- **Icône d’onglet** ajoutée aux pages des missions M01 et M02 (elles déclenchaient une erreur 404) ; numéro de version périmé retiré du pied de l’accueil.

## Interface de combat unifiée

Un seul module (`dist/combat-hud.js`, `dist/combat-hud.css`) affiche désormais la santé et l’arme en main dans **M01, M02, l’Arène et le Stand de tir**, conformément au livre (§11) : santé et munitions permanentes, le reste seulement quand il s’applique.

- En bas à gauche : nom du héros, santé, jauge à dix segments dans sa couleur (rose GHJU, bleu LYLU). États **RÉGÉNÉRATION** et **CRITIQUE** (le rouge reste réservé au danger).
- En bas à droite : arme en main, munitions, jauge du chargeur ; **RECHARGE** avec sa progression, munitions basses, **VIDE · RECHARGER**, lame pour AURORA.
- Écran tactile : deux encarts compacts au-dessus du joystick, sans toucher aux commandes RLH.
- Masquée sous les menus, dans l’atelier de tenue, en vue stéréo et dans le casque (la VR garde son affichage au poignet).

Les anciens affichages de chaque mode restent dans la page pour leur logique propre, masqués derrière l’interface commune : aucune règle de jeu n’est modifiée.

## Vérifications

- **437 tests automatisés réussis**, dont 5 nouveaux (état lu par l’interface, montage dans les trois moteurs, accueil masqué en partie, couverture et icônes, pose du M12).
- Navigateur (Chromium) : accueil, M01 avec GHJU, M02 avec LYLU, Arène et Stand ; menu absent en partie ; même interface dans les quatre modes ; pause par-dessus l’interface. Émulation iPhone : M01 tactile et Arène, encarts au-dessus du joystick.
- Limites : rendu logiciel SwiftShader (environ une image par seconde), aucune mesure sur iPhone ni Quest 3 physiques. Le gant de LYLU reste sombre sur une arme sombre : sa lisibilité sera traitée dans la passe graphique.
