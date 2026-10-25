# Version 3.63 — Combat d'armure

Deuxième livraison de la feuille de route « cyberpunk / jouabilité Halo » ([FEUILLE_DE_ROUTE_CYBERPUNK_HALO.md](FEUILLE_DE_ROUTE_CYBERPUNK_HALO.md)). On garde la *sensation* de combat (bouclier qui se recharge, mêlée, grenade, rencontres en bac à sable) sans rien copier de l'interface ni des modèles d'une autre franchise (Tome II §36). Les mêmes règles s'appliquent dans **M01, M02, l'Arène et le Stand** : elles vivent dans un seul module (`dist/armor-combat.js`) partagé par les trois moteurs.

## Bouclier de l'armure

- 60 points de bouclier au-dessus des 100 points de santé. Le bouclier encaisse d'abord ; ce qu'il ne peut pas tenir passe à la santé.
- Après **3,4 s sans dégât**, il se recharge en entier en un peu moins de 2 s. Chaque coup reçu relance l'attente.
- Interface commune : barre lumineuse dans la couleur du héros au-dessus de la santé (qui passe alors en blanc), clignotement pendant la recharge, contour rouge et mention **BOUCLIER ROMPU** quand il cède. Sons distincts pour la rupture, la recharge et le retour à plein.
- La santé garde sa régénération lente après 5 s, comme avant.

## Frappe de mêlée

- Coup porté avec l'arme en main, à 2,3 m devant soi : 80 dégâts, **triplés dans le dos** d'une machine. La cible est étourdie un court instant et repoussée.
- Pas à travers un mur, pas pendant que la lame AURORA est en main (elle garde ses propres coups). Délai de 0,9 s entre deux frappes.
- L'arme part en avant puis revient (animation courte en vue à la première personne).

## Charge à impulsion

- Lancée dans l'axe du regard, un peu vers le haut : elle vole en arc, rebondit sur le sol et les murs, puis se déclenche **1,4 s** après le lancer.
- Rayon de 5,5 m : les machines visibles depuis le point d'impact subissent jusqu'à 140 dégâts (moins en bordure) et sont neutralisées 1,2 s. Un abri protège. Lancée trop près, elle blesse aussi le joueur.
- Les machines voient la charge en vol comme un danger et s'en écartent.
- Deux charges au départ, quatre au maximum. On en regagne une à chaque vague (Arène), à chaque rencontre (M01), à chaque étape franchie (M02) et avec chaque cellule d'énergie ramassée. Au Stand, elles reviennent aussitôt : on peut s'entraîner à les placer.
- Disque sombre au liseré lumineux dont le cœur clignote de plus en plus vite ; onde dans la couleur du héros à l'explosion. Aucun éclairage dynamique ajouté (pour ne pas faire recompiler les matériaux sur Quest).

## Retour de dégâts directionnel

Un arc rouge s'allume autour du viseur, du côté d'où vient le tir ou le coup reçu, et s'efface en un peu plus d'une seconde. Il suit le regard : en se tournant vers la menace, l'arc revient en haut.

## Commandes

| | Mêlée | Charge |
|---|---|---|
| Clavier / souris | X ou clic molette | B |
| Manette | R1 / RB | L1 / LB |
| Écran tactile | bouton **MÊLÉE** | bouton **CHARGE** (avec le nombre restant) |
| Casque | clic du stick droit | gâchette gauche (hors pistolets doubles) |

Les boutons tactiles sont au-dessus du groupe de tir, au même endroit dans l'Arène, le Stand et M02 ; en M01, CHARGE se place au-dessus du bouton de course. Aucune commande existante n'est déplacée ([COMMANDES_M01_M02.md](COMMANDES_M01_M02.md)).

## Reporté

L'échange rapide entre deux armes portées et l'assistance de visée à la manette et au tactile, prévus dans la feuille de route, ne sont pas dans cette version. Ils touchent l'arsenal et la visée des trois moteurs et méritent leur propre livraison.

## Corrigé au passage

- **Écran tactile, Arène et Stand de tir :** les boutons TIR, SAUT, ACCROUPI et RECHARGER étaient placés au-dessus de l'écran (le calque qui les porte avait une hauteur nulle depuis le 22 octobre). Ils réapparaissent à leur place, sans rien changer à la disposition RLH validée. M01 et M02, qui ont leurs propres commandes, n'étaient pas touchés.
- La touche **G** reste celle du menu Gaby / Cara ; la charge à impulsion est donc sur **B**.

## Vérifications

- **447 tests automatisés réussis**, dont 10 nouveaux (`tests/363-armor.test.mjs` : bouclier, recharge, mêlée, charges, interface, branchement des trois moteurs, calque tactile).
- Navigateur (Chromium), ordinateur : Arène (GHJU), M01 (GHJU) et M02 (LYLU) — bouclier plein au départ, charge lancée avec B puis déclenchée, frappe avec X et au clic molette, interface à jour, aucune erreur.
- iPhone émulé : Arène, M01 et M02 — boutons MÊLÉE et CHARGE fonctionnels, aucun chevauchement avec les commandes existantes ; Arène avec son groupe de tir de nouveau visible.
- Quest 3 émulé (WebXR), Arène avec LYLU : la gâchette gauche lance une charge, le clic du stick droit frappe ; bouclier actif dans le casque.
- Limites : rendu logiciel dans le navigateur de test (environ une image par seconde), aucune mesure sur iPhone ni Quest 3 physiques. Les vibrations des manettes et le ressenti des commandes au casque restent à confirmer sur l'appareil.
