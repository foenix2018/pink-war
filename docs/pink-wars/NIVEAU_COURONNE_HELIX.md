# Niveau autonome — « Couronne HELIX »

Prototype jouable qui mêle l’**univers cyberpunk** de Vesper et une **jouabilité de type bac à sable** (bouclier qui se recharge, grands espaces, plusieurs routes, hauteur, renforts annoncés). Il est **hors menu et hors campagne** : on y accède uniquement par son adresse.

- Page : `dist/couronne-helix.html` (en ligne : `/couronne-helix.html`, avec `?character=lylu` pour LYLU).
- Code : `couronne-layout.js` (plan pur : sols, escaliers, collisions, rencontres, objectifs), `couronne-mission.js` (déroulé de la mission, sans rendu), `couronne-art.js` (décor), `couronne-helix.js` (page de jeu : rendu, commandes, interface).
- Moteur de jeu inchangé : même simulation que les missions (ArenaGame et couche d’armure 3.63), mêmes armes, gants, personnage Shadow Unit, commandes, interface et WebXR que M02.

## Ancrage dans le livre

- **Lieu** : W09 — Couronne HELIX (Tome II §23) : sièges corporatifs, places vides, sécurité privée, héliport ; verre gris, céramique blanche, rouge HELIX limité à ses marques.
- **Parcours** : celui de M10 (place → hall → centre de sécurité → terrasse), sans en être la mission officielle.
- **Lumière** : « crépuscule sur les hauteurs » (§34). Ville en néons en contrebas, dans la brume.
- **Repère** : un ancrage de phase HELIX (§27), seul élément magenta (couleur réservée aux champs de phase).
- **Portails** : renforts ORDRE par portail tactique PT02, annoncés 3 secondes avant (lumière rouge et son).
- **Interdits respectés** (§36) : aucun décor, aucune armure ni aucune marque d’une autre franchise. Les marques de la ville sont fictives.

## Plan (1 unité = 1 m ; on avance vers le nord)

```
                 ┌──────────── TERRASSE DE L’ANCRAGE (+12 m) ────────────┐
                 │  stabilisateurs ▪   PYLÔNE D’ANCRAGE   ▪ stabilisateurs │  rayon magenta vers le ciel
                 │      pupitre ouest ◘              ◘ pupitre est        │
                 └──┬ montée ouest ┬───────[ HALL HELIX ]───────┬ montée est ┬──┘
                    │  champ HELIX │   pupitre de sécurité ◘    │ champ HELIX │
   PARVIS HELIX (+6 m) : planters, sculptures, barrières, balustrade sur l’esplanade
                 └──────────────┬──── grand escalier ────┬──── escalier est ─┘
                                │                        │   TERRASSE EST (+3 m)
   ESPLANADE (0 m) : bassin-hologramme, planters bas,    │   (route de flanc,
   monolithes hauts, colonnade couverte à l’ouest        │    vue dominante)
                                │                        └── rampe est
                 ═══ filtre de sécurité (portiques) ═══
                    HÉLIPORT (0 m) : navette HELIX, caisses — zone sûre de départ
```

| Zone | Hauteur | Couvertures | Routes |
|---|---|---|---|
| Héliport | 0 m | navette, caisses | une sortie : le filtre |
| Esplanade | 0 m | bassin (bas), 6 planters (bas), 6 monolithes (hauts), colonnade | centre, colonnade ouest, terrasse est |
| Terrasse est | +3 m | haie, planters | rampe depuis l’esplanade, escalier vers le parvis |
| Parvis HELIX | +6 m | balustrade, planters, sculptures, barrières, kiosques | grand escalier, escalier est ; hall |
| Terrasse de l’ancrage | +12 m | socle du pylône, 4 stabilisateurs, barrières, caisses | montées ouest et est |

Escaliers à pente de 0,5 au plus. Pare-vent en verre de 3 m sur tous les bords : impossible de tomber de la Couronne.

## Déroulé

1. **Franchir le filtre de sécurité** : la patrouille de l’esplanade est visible depuis l’héliport.
2. **Sécuriser l’esplanade** (7 machines, dont deux tireurs sur la terrasse est). Quand il n’en reste que trois, un portail ORDRE amène des renforts (2 traqueurs et une brute d’élite).
3. **Prendre le parvis** : portail annoncé sur le parvis, 8 machines (synthétique, tireurs, brute d’élite, sondes). La balustrade leur sert de couverture.
4. **Lever le verrou de sécurité** au pupitre du hall : les champs HELIX des deux montées s’éteignent.
5. **Désynchroniser l’ancrage** : 8 machines gardent la terrasse (dont un rempart lourd). Couper un stabilisateur appelle un dernier portail.
6. **Tenir la terrasse** : l’ancrage s’éteint (rayon, anneaux, cœur), il faut neutraliser les dernières machines.
7. **Liaison coupée** : temps, machines neutralisées et précision.

En tout : 30 machines. Une charge à impulsion est donnée au début du parvis et de la terrasse de l’ancrage. Les armes disponibles sont celle du héros, R–9, BLOOM, LANCE et THORN.

Défaite : reprise au **point de contrôle** de l’étape en cours, rencontre remise en place.

Pendant un combat, un « directeur de rencontre » garde les machines du groupe actif sur la trace approximative du joueur (toutes les 2 secondes), pour qu’elles montent les escaliers au lieu de retourner patrouiller. Elles gardent leur propre perception pour tirer et se mettre à couvert.

## Direction artistique

- **Couronne** : céramique blanche à fentes lumineuses, sols vernis à liserés, verre gris, pare-vent à montants.
- **Ville** : environ 280 tours à fenêtres éclairées, enseignes au néon, 6 panneaux holographiques, couloirs de trafic aérien en mouvement, brume lumineuse.
- **Ciel** : crépuscule indigo, mauve et orangé, soleil bas à l’ouest, nuages animés.
- **Pylône d’ancrage** : visible de partout, avec trois anneaux stabilisateurs qui tournent, un cœur magenta et un rayon vers le ciel. Il s’éteint à la fin.
- **Ambiance** : drones d’annonce HELIX, hologramme en double ruban au-dessus du bassin, navette HELIX sur l’héliport.

## Performances

Les éléments répétés passent par l’instanciation (tours, enseignes, trafic, marches, pare-vent, planters…). Il n’y a que trois lumières dynamiques (soleil, ancrage, hall). En qualité « performance » (téléphone, casque) : pas d’ombres, moins de tours, de couloirs de trafic et de panneaux. Ces chiffres restent à mesurer sur un iPhone et un Quest 3 réels.

## Vérifications

- **Tests automatisés** (`tests/couronne-helix.test.mjs`), avec le vrai moteur :
  - escaliers à pente jouable qui rejoignent bien leurs sols ;
  - montée de l'héliport jusqu'à +12 m, par le centre et par la terrasse est ;
  - champ de sécurité infranchissable tant qu'il est actif ;
  - impossible de tomber de la Couronne ;
  - une machine monte le grand escalier pour rejoindre le joueur ;
  - ennemis, pupitres et points de contrôle placés hors du décor ;
  - **mission jouée de bout en bout** (portails annoncés, verrou, stabilisateurs, fin) ;
  - reprise au point de contrôle après une défaite.
- **Navigateur** (Chromium, WebGPU) : démarrage sans erreur, vues de l'héliport, de l'esplanade, du parvis et de l'ancrage ; portail ORDRE ; ancrage éteint.
- **iPhone émulé** (WebGL, qualité performance) : commandes tactiles complètes, MÊLÉE et CHARGE fonctionnelles.
- **Quest 3 émulé** (WebXR) : entrée en VR depuis le niveau, charge à la gâchette gauche, frappe au clic du stick droit, affichage VR du poignet.
- **Limites** : le rendu logiciel de test est trop lent (environ une image par seconde) pour jouer toute la mission dans le navigateur, d'où le test complet hors rendu. Aucune mesure sur iPhone ni Quest 3 réels.

## Suite possible (non faite)

- Validation des volumes et du rythme par le créateur.
- Intégration : mode à part dans l’accueil, ou base de la mission M10 de la campagne.
- Véhicules, scènes de transition, dialogues de Gaby et Cara.
