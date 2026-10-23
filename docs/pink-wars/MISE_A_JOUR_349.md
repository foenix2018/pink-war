# 3.49 — Première reprise de direction artistique de W01

Base : `cf0af8f`, version 3.48 réellement livrée. Cette passe concerne le M01
Vesper sur écran. La carte WebXR classique, Arène et AT HOME restent distinctes.

## Écarts constatés

Le prototype V7 montrait une avenue de visite avec de nombreux émissifs,
une ambiance générale forte et des ombres figées après la première image.
Trois générations d'habillages de voitures étaient dessinées ensemble.
Le béton, les caisses et des pièces de carrosserie recevaient les mêmes
surfaces génériques, notamment de la tôle ondulée. La visite n'avait pas la
progression annexe → atelier → carrefour → terrasse de M01.

## Reprise visuelle

- Matin désolé W01 : exposition et lumière d'ambiance réduites, soleil doux,
  ciel photographique peu saturé et profondeur atmosphérique. L'ambre de secours
  reste localisé. Les tirs gardent leurs impulsions lumineuses brèves.
- Une seule source solaire et des ombres directionnelles recalculées pour les
  robots et pendant les déplacements. Frustum rapproché, biais réduit. En
  Performance/iPhone, silhouettes projetées et occlusion de contact précalculées
  remplacent les ombres dynamiques. Ce repli reste une approximation.
- Une seule épave par emplacement, avec coque chanfreinée, vitrage incliné,
  pneus, jantes, joints, rétroviseurs et essuie-glaces. Retrait des anciennes
  couches, plutôt qu'une superposition supplémentaire.
- Façade médicale à ouvertures profondes, jambages, appuis et éclats de vitrage.
  Les collisions des anciennes parois pleines sont remplacées par les montants
  et allèges correspondants : les fenêtres ouvertes passent réellement les tirs.
- Deux anciens toits pleins remplacés par des dalles périphériques et des
  armatures, pour faire entrer la lumière dans l'annexe.
- Feuilles courbes, fougères, herbes et lianes, poches végétales près des murs,
  éclats de béton et câbles. Les couronnes de tours ont des étages éventrés.
- Signalétique physique usée liée à l'évacuation de 2189 et à la liaison A3.
  Les inscriptions reçoivent la lumière ; elles ne sont pas des interfaces
  lumineuses flottantes. Le grand anneau décoratif de Fracture n'est plus
  montré au début de M01 ; les portails tactiques annoncés restent présents.

## Parcours et continuité

Le joueur commence dans l'annexe, puis réarme le circuit, lit le journal humain,
consulte l'atelier, neutralise la balise et rejoint le relais par les accès
existants. Un petit repère directionnel indique l'objectif. Les seuls compteurs
permanents restent santé et munitions.

Huit patrouilleurs initiaux et trois groupes de huit renforts, au maximum huit
actifs. Les groupes s'ajoutent à la file ; une interaction rapide ne supprime
plus les renforts précédents. A3 exige de sécuriser le quartier. Les objectifs
et commandes passent par la simulation de combat existante.

GHJU/LYLU : modèles, squelette, proportions, gants, animations, capes, tabards,
armures, armes et palettes canoniques conservés. Aucun fichier de ces modèles
n'est modifié. Gaby/Cara restent au stade prototype décrit dans la note 3.48 ;
la contradiction M01/M07 des documents n'est pas déclarée résolue.

## Sources et budget

Le ciel Kloppenheim 06 Pure Sky (Greg Zaal / Jarod Guest) et le béton agrégé
(Charlotte Baglioni) sont des ressources Poly Haven CC0. Les albédo W01 de
béton, route, métal et peinture combinent du grain photographique local avec
les masques d'usure originaux du projet. La brique reste une texture originale.
Ces compositions ne sont pas présentées comme de nouveaux scans.

Sources, licences et transformations : `dist/assets/cc0/LICENSE.md`,
`sources.json`, `tools/build-vesper-sky.py`, `tools/build-vesper-surfaces.py`.
Le chargement ne dépend d'aucun service externe. Le ciel visible est 1024×512 ;
les réflexions utilisent une version réduite avant convolution. Les nouveaux
détails sont fusionnés par matériau (15 lots). Les anciens sommets inutilisés
et tableaux JS de géométrie sont libérés pour réduire le coût sur téléphone.

## Vérification et limites

Tests de géométrie, rayons traversant les ouvertures réelles, direction des
ombres et budget mobile, plus contrôles existants. Le navigateur vérifie tir,
rechargement, changement d'arme, saut et ordre des terminaux, y compris le
blocage d'A3 tant que les menaces restent présentes. Les captures sont des
images réelles de l'application ; la cadence de rendu est découplée de la
simulation uniquement dans le banc logiciel.

Cette livraison constitue une reprise d'ambiance et de certaines formes,
pas une finition photoréaliste de tous les assets. Les entrepôts et plusieurs
accessoires hérités nécessitent encore une production dédiée. Aucun résultat
de ce banc Linux ne remplace un essai matériel sur iPhone, Mac/PS4 ou Quest 3.
