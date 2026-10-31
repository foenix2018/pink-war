# Pink Wars 3.74 — « Les Héritiers du Silence »

**31 octobre 2026.** Le jeu suit la nouvelle bible narrative du créateur,
[BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md](BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md). L’ancienne bible
(« La Fracture ») est conservée comme archive et marquée remplacée. Les niveaux, leurs décors, leurs combats et
leurs mécaniques ne changent pas : ce sont l’histoire, les textes, les noms et les présentations qui changent.

## Ce qui change partout

| Avant | Maintenant |
|---|---|
| PINK WARS — LA FRACTURE | PINK WARS — LES HÉRITIERS DU SILENCE |
| Gaby, Cara | **GAB-1** (rose, GHJU : bouclier, soin) et **CAR-14** (bleue, LYLU : ciblage, attaque) |
| La chute du 14 mars 2189, 22 h 47 | **La Chute du 17 novembre 2189** : mise à jour d’ORDRE à 03 h 17, dernier message mondial à 06 h 42 |
| ORDRE et « HELIX Security » | **ORDRE** = l’intelligence artificielle (machines, réseaux, annonces) ; **le Directoire** = les humains à son service ; **AEGIS** (Mara Voss) résiste ; **les Épars** (Nira Solen) survivent hors réseau ; **HELIX** (Adrian Kessler) cache ses archives |
| Une brèche violette, une fracture | Une colonne de calcul d’ORDRE, un pylône de surveillance |
| Le frère ou la sœur enlevé·e et suivi·e à la trace | GHJU et LYLU séparés la nuit de la Chute ; aucune nouvelle jusqu’au chapitre 03 |

Les noms internes du code (`gaby`, `cara`) restent ; seuls les noms affichés changent.

## Prologue — « Le jour de la Chute »

Six tableaux, sur les illustrations existantes : ORDRE qui veillait sur tout ; une famille de quatre enfants
(GHJU, LYLU, Gabrielle et Carla) ; la mise à jour de 03 h 17 ; le message de 06 h 42 ; la Transcendance et les
deux modules, un rose, un bleu ; Vesper en 2196 et la transmission VEILLE-4. Le prologue ne dit pas ce que
contiennent les sphères.

## Les chapitres jouables

1. **Le Dernier Signal** — Une transmission porte **VEILLE-4**, l’indicatif des parents. Station 07 : la nuit de la
   Chute (journal de bord de 03 h 17 à 06 h 50), le casier VEILLE et sa photo de famille, des survivants Épars à
   libérer de l’atelier, le relais A3 que les Épars ont remis sous tension. Aux Archives végétales, le terminal hors
   réseau rend le message : « Si vous recevez ceci, ne faites confiance à aucun système connecté au réseau principal.
   Retrouvez les relais indépendants. Et surtout… ne perdez pas les deux unités. » La sphère se tait. La suite est
   chiffrée.
2. **Les Profondeurs** — Les Bas-Niveaux tenus par le **Directoire**, dont les habitants réparent les machines
   d’ORDRE. Dans le coffre de la tour de transit : un module de décryptage, et l’**avis de recherche d’ORDRE** pour deux
   systèmes autonomes, GAB-1 et CAR-14. Choix final : libérer les prisonniers ou prendre les archives HELIX sur la
   mise à jour du 17 novembre.
3. **Le Convoi des Oubliés** — Avec **AEGIS** et Mara Voss, escorter l’ambulance d’Inès sur la piste des prisonniers
   du Directoire et du docteur Hadi (ancien chercheur HELIX). Sur l’échangeur qui s’effondre, une armure Shadow Unit
   de l’autre couleur : pour la première fois depuis sept ans, une raison d’espérer.
4. **Le Protocole Interdit** — La cellule AEGIS de Mara Voss à la station Est de JANUS. Au-dessus du réacteur, une
   colonne violette où ORDRE synchronise ses systèmes. Sous le portique, l’archive des anciens secours : le
   **protocole PINK**, canal indépendant pour qu’aucune IA ne puisse supprimer toute l’autorité humaine, à moitié
   effacé la veille de la Chute. La sphère s’approche : « Signature incompatible. Architecture non autorisée.
   Procédure de récupération prioritaire. » Les unités de poursuite sont lancées. (Le gardien garde son blindage,
   renommé « blindage synchronisé ».)
5. **La Ligne Noyée** — Sous les Halles-Basses, le nœud de communication JANUS-9 garde les bons de fabrication :
   des machines de guerre produites des mois avant la Chute, à partir de bras de soudure, de machines de chantier et
   de drones agricoles. L’armée d’ORDRE est née dans les usines des humains.

Chaque chapitre reste jouable avec GHJU ou LYLU. La bible désigne un héros de référence par chapitre (01 et 04 :
GHJU, 02 et 05 : LYLU) ; l’autre héros vit la même histoire avec sa propre sphère.

## Menu des chapitres

« LES HÉRITIERS DU SILENCE » et la phrase fondatrice, puis les vingt chapitres en cinq actes. Les chapitres 01 à 05
se lancent ; les quinze autres sont affichés « À venir » (la Couronne HELIX reste un niveau autonome, non relié,
comme avant). L’Opération Brèche reste une mission bonus hors campagne.

## Le secret des sphères

Aucun niveau, aucune présentation de personnage ni aucune page publique ne dit que GAB-1 et CAR-14 sont Gabrielle et
Carla : la confirmation est réservée au chapitre 15. Les indices restent discrets (le silence de la sphère devant le
message, la photo de famille, l’avis de recherche). Un test (`tests/374-heritiers-du-silence.test.mjs`) vérifie ce
secret, les noms, la date de la Chute, les factions, les chapitres et le menu.

## Vérifications

- `npm test` : tous les tests narratifs passent. Les 4 échecs restants (formes et squelettes des robots :
  `342-profiled-armor`, `36318-hit-zones`, `models`) existent déjà sur `main` sans ces changements.
- Parcours navigateur : accueil, menu des chapitres, prologue, écrans de niveau 01 à 05.
