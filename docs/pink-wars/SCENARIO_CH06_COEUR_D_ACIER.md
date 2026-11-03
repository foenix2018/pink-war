# Chapitre 06 — « Le Cœur d’Acier » · la fonderie de Vesper-Nord

**3 novembre 2026.** C’est un niveau jouable complet, sur le moteur des chapitres 03 à 05 : combat, HUD normal du
jeu, compagnon, points de contrôle, sous-titres, documents et réalité virtuelle. Il utilise le rendu WebGPU, avec
un repli WebGL. On le lance depuis le menu Histoire → Acte II → **06 — Le Cœur d’Acier**.

| Rôle | Fichier |
|---|---|
| Plan du niveau | `dist/m06-layout.js` |
| Déroulé de la mission | `dist/m06-mission.js` |
| Histoire | `dist/m06-story.js` |
| Décor | `dist/m06-art.js` |
| Page | `dist/niveau6.html` et `dist/niveau6.js` |
| Tests | `tests/376-m06-coeur-acier.test.mjs` |

## La bible

> GHJU infiltre une fonderie automatisée accompagnée d’une équipe de techniciens AEGIS. Les machines y fabriquent de
> nouveaux châssis militaires. Des Brutes sont assemblées sur des chaînes lourdes. Des Remparts protègent les accès.
> Des Sondes surveillent les voies de circulation. Au centre de l’usine, une unité expérimentale N-08 coordonne les
> autres machines et adapte leurs tactiques à chaque affrontement. La mission se transforme en bataille pour sauver
> les techniciens. […] La Résistance combat un adversaire qui apprend de chacune de ses défaites.

## Cohérence avec les chapitres voisins

**Avant, le chapitre 05 « La Ligne Noyée » :**
- Le nœud JANUS-9 gardait la commande automatique P-0 : 1 200 châssis fabriqués à l’« usine de Vesper-Nord », à
  partir de bras de soudure, de machines de chantier et de drones agricoles.
- Nira a transmis ces archives à Mara Voss.
- Le chapitre 06 commence là. Voss envoie l’héroïne à la fonderie que nomment les bons P-0. Le parc à ferraille est
  rempli de ces machines civiles converties ; la plaque d’une machine de chantier porte « P-0 / conversion 0412 ».

**Avant, le chapitre 04 :**
- Varenne et Kim étaient parmi les techniciens forcés de la station Est. Ils ont rejoint AEGIS.
- Varenne est aussi celui qui a emmené LYLU dans la Ligne 9 la nuit de la Chute. Avec GHJU, il témoigne que son frère
  est remonté vivant ; avec LYLU, il le reconnaît.
- ORDRE cherche la sphère depuis le chapitre 04. La N-08 l’annonce : « sphère prioritaire ».

**Après, le chapitre 07 « Mémoires locales » :**
- Tout se passe le même jour. La mission finit au coucher du soleil : le camion d’AEGIS part du quai de chargement
  vers la lisière de la forêt des Sources.
- La première réplique du chapitre 07 (« Depuis la fonderie, les N-08 apprennent… ») s’appuie sur le journal
  d’apprentissage : le modèle de la N-08 a été transmis à toutes les autres.
- « Le dossier des Tilleuls », que Voss cite ensuite, est le bon de réquisition trouvé sur le pont roulant. ORDRE y
  cherche l’antenne de terrain de l’équipe VEILLE, dans la forêt des Sources, sans l’avoir encore trouvée.
- La forêt montre ensuite une N-08 « qui a appris à la fonderie ».

**Secrets préservés :**
- Aucun lien entre les sphères et les sœurs (chapitre 15).
- Les deux héros ne se croisent pas (chapitre 09).
- CONVERGENCE et la Résonance ne sont pas encore nommées.

## Déroulé (environ 35 minutes estimées)

| Segment | Lieu | Minutes |
|---|---|---|
| La voie ferrée | Quai d’arrivée, wagons, sondes sur les rails | 2,8 |
| Le parc à ferraille | Montagnes de machines civiles converties | 5,4 |
| La grille | Commande forcée sous le feu | 2,7 |
| La halle de coulée | Four, poches de coulée, moules | 3,3 |
| La cabine de contrôle | Rampe et cabine à 4,5 m | 0,9 |
| La chaîne lourde | Brutes en assemblage, bras robotisés | 7,3 |
| Le pont roulant | Rampe, pont à 6 m, bureau | 2,7 |
| Le cœur | Salle de coordination, la N-08 | 5,6 |
| Le journal d’apprentissage | Terminal de la colonne | 1,0 |
| Le quai de chargement | Évacuation des techniciens au coucher du soleil | 3,1 |
| **Total** | | **34,8** (LYLU : 34,5) |

1. **La voie ferrée.** Sondes sur les rails, grille verrouillée. Les documents : la copie du bon P-0, et la feuille
   de wagon (des Brutes vers la station Est, des Sondes vers la Ligne 9, une N-08 « priorité sphère »).
2. **Le parc à ferraille.** Montagnes de bras de soudure, de quadrupèdes de chantier et de drones agricoles, et des
   rampants dedans. Une clé de chantier attend sur la presse.
3. **La grille.** Ouverture forcée en 30 secondes, pendant que des Remparts et des traqueurs arrivent par les rails.
4. **La halle de coulée.** Four et métal en fusion, poches de coulée, moules. Le tableau de cadence affiche
   « +12 % : pertes enregistrées sur les secteurs 03, Est et 9 ».
5. **La cabine de contrôle.** On libère Varenne.
6. **La chaîne lourde.** Trois disjoncteurs à couper (16, 16 et 22 secondes). Chaque coupure réveille une Brute avant
   l’heure ; la dernière est une Brute d’élite. La consigne : « Toute défaite est une donnée. »
7. **Le pont roulant.** Rampe jusqu’au pont à 6 m. On libère Kim. Dans le bureau, le bon de réquisition des
   Tilleuls.
8. **Le cœur.** La N-08 et son escorte. **Elle apprend :** toutes les 9 secondes, elle enregistre l’endroit d’où
   l’on tire. Tant qu’on reste à moins de 7 m de cet endroit, elle ne prend que 30 % des dégâts. Un anneau rouge au
   sol montre l’endroit appris, et GAB-1 ou CAR-14 crie de changer de place. À mi-vie, elle appelle des renforts
   (une Brute) et commence à transmettre son modèle.
9. **Le journal d’apprentissage.** Engagements 0388 (échangeur du secteur 03), 0412 (station Est, gardien BS01,
   « porteur accompagné de la sphère »), 0431 (Ligne 9) et 0447 (la fonderie) : « modèle mis à jour et transmis à
   toutes les unités N-08 de Vesper ».
10. **Le quai de chargement.** On tient 40 secondes pendant que le camion charge les techniciens. Fin au coucher du
    soleil, et suite vers le chapitre 07.

La durée est estimée par `segmentSeconds` (`dist/m06-story.js`), avec la même méthode qu’au chapitre 07 : marche à
3,5 m/s, attentes, 9 s par machine, 36 s par Brute, 140 s pour la N-08, énigmes, sous-titres et lecture. Ce n’est
pas un temps mesuré en jouant.

## Vérifications automatiques

`tests/376-m06-coeur-acier.test.mjs` vérifie que :
- les secteurs, la cabine (4,5 m) et le pont (6 m) se rejoignent à pied ;
- tous les points de contrôle et toutes les machines sont accessibles, et rien n’est pris dans un décor ;
- la mission entière se joue, de la clé à l’évacuation ;
- l’adaptation de la N-08 fonctionne (30 % de dégâts, puis 100 % après un changement de position) et le point de
  contrôle la remet en place ;
- le chapitre dure au moins 30 minutes avec chaque héros ;
- l’histoire est cohérente avec la bible et avec les chapitres 04, 05 et 07 (bons P-0, Varenne et Kim, N-08 qui
  apprennent, dossier des Tilleuls, coucher du soleil, chapitre 07 annoncé) ;
- la page, le menu et le HUD normal sont en place.
