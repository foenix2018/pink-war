# AERIN V14 — Disposition tactile reprise de Pink Wars (14 novembre 2026)

Source : `dist/mobile-controls-v7.css` du dépôt foenix2018/pink-war (« règle mobile RLH »), lu en lecture seule.
Les mêmes cotes sont appliquées à Aerin dans `dist/game/hud-v13.css` (bloc « V14 »), en mode tactile seulement ;
le clavier et la souris gardent la disposition V13.

| Pink Wars | Aerin | Position |
| --- | --- | --- |
| Joystick de déplacement | Joystick | bas gauche, 116 px (101 px ≤ 390 px de large) |
| Glisser sur la moitié droite | Caméra | aucun second joystick |
| Viser (maintenu) | **Bouclier** (maintenu) | centre, bas 21 px, 56 px |
| Sauter | **Saut** | centre, bas 91 px, 56 px |
| Recharger | **Roulade** | 50 % − 88 px, bas 25 px, 49 px |
| Accroupi | **Accroupi** | 50 % − 86 px, bas 92 px, 45 px |
| Tir | **Frappe** | bas droite, 78 px |
| Interagir / arsenal | **Cible** | au-dessus de Frappe, bas 111 px |
| Arme suivante | **Esquive** | à gauche de Frappe, droite 90 px |
| Vue | **Armes** (ranger / dégainer) | droite 92 px, bas 111 px |
| Étiquette d'arme | **OUVRIR** (coffre, contextuel) | droite 9 px, bas 175 px |

Comme dans Pink Wars, aucune consigne n'est affichée sur le terrain en tactile ; vie, endurance, état et messages
restent visibles. Le message central passe sous la vitalité en portrait et se limite à l'espace libre en paysage.

Vérifié (émulation Chromium) : iPhone SE, iPhone 13, iPhone 14 Pro Max, iPhone 13 paysage, et ordinateur
1280 × 760 — aucun chevauchement ; saut, roulade, frappe et bouclier maintenu déclenchés par de vrais appuis.
Aucun essai sur iPhone physique.
