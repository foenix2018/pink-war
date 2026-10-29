# Pink Wars — audit de qualité visuelle (29 octobre 2026)

**Référence inspectée :** production `main`, v3.70.0 (déploiement f660584). **Branche d'amélioration :** `improve/gallery-visual-audit-20261029`.

> Cet audit a été réalisé sur les sources du jeu et les états de déploiement. Aucun examen visuel direct de l'exécution WebGPU/WebGL sur iPhone, tablette Dell ou Quest 3 n'a été possible depuis cet environnement. « Corrigé » signifie que le code est modifié, non que le résultat est validé sur matériel.

| Priorité | Zone | Avant (constat dans le code) | Après / décision | Statut |
|---|---|---|---|---|
| P1 | Galerie, hiérarchie | Cartes uniformes, arrière-plan relativement plat, petites informations secondaires | Cartes avec accents par famille, reliefs, hiérarchie typographique, meilleure lisibilité | Code modifié |
| P1 | Comparaison graphique | Aucun moyen simple de voir les deux styles avec les mêmes objets | Paramètres `?compare=before` et `?compare=after` sur la galerie | Code modifié |
| P1 | Modèle 3D, relief | Éclairage diffus/additif fort, rendu susceptible d'aplatir les volumes | Lumière ambiante atténuée, key/fill/rim redistribuées, socle souligné | Code modifié |
| P1 | Galerie, performances | Recalcul des limites spatiales par maillage à chaque image | Mise à jour du contact au sol toutes les six images, matériel de secours mutualisé | Code modifié |
| P1 | Galerie, performances GPU | `setPixelRatio` et `setSize` exécutés sans contrôle à chaque image | Redimensionnement uniquement quand dimensions/DPR changent, rendu asynchrone non chevauchant | Code modifié |
| P1 | Galerie, navigation | Rotation/zoom sans bouton de recadrage | Bouton RECARDER, restauration du focus en fermeture, fermeture via Échap | Code modifié |
| P1 | Tablette Dell, fluidité | Profils bas/haut/auto sans budget intermédiaire dédié | Équilibré+ : ratio <= 1,4, 2 Mpx maxi hors mobile, détail matière élevé | Code modifié |
| P1 | Mission 02 | Qualité normale ou performance uniquement | Option ÉQUILIBRÉ+ et profil effectif du moteur M02 | Code modifié |
| P2 | M02, finition publique | Mentions « Playtest » sur le titre et dans le HUD | Titre et indicateur de mission nettoyés | Code modifié |
| P1 | Galerie, données de combat | Tableau de dommages et de PV codé en dur, points faibles génériques attribués à tous | Avertissement explicite, point faible spécifique uniquement quand documenté | Partiel : données chiffrées à connecter au moteur |
| P1 | AR iPhone | Export USDZ dépendant d'un module externe ; génération et lancement en deux gestes | Consigne à deux gestes clarifiée | Test réel Quick Look à faire |
| P1 | GHJU / LYLU | Rigs et gants issus des vraies sources `soldier.js`, `gallery-ar-hands.js` | Préserver le chara-design ; ne pas substituer de modèles génériques | À contrôler visuellement |
| P1 | Armes (dont VORTEX AR-7 et M–12) | Sources procédurales spécifiques et points de visée dédiés | Aucun changement géométrique aveugle | Inspection 360°, mains/visée/rechargement nécessaires |
| P1 | Ennemis (RECO1, Sentinel, drones) | Usine procédurale de rig, formes et textures variables | Aucun remplacement sans silhouettes de référence et test d'animation | À contrôler visuellement |
| P2 | Environnements M01/M02 | Systèmes de décors, lumière, surfaces, atmosphère distincts | Vérifier cohérence PBR, niveaux de détail et occlusion | Audit scène à mener |
| P1 | Jeu mobile | Différents HUD et chemins graphiques entre accueil/M01/M02 | Vérifier collisions des commandes, FPS et coût GPU sur matériel | Matériel non testé |
| P2 | Qualité du contenu | Textes d'aide hérités et compte d'armes potentiellement obsolète | Relecture de cohérence avec les armes réellement débloquables | À vérifier |

## Diff de démonstration

Une fois l'aperçu Vercel construit, ouvrir `/galerie.html?compare=before` et `/galerie.html?compare=after` **sur le même déploiement** pour comparer l'habillage CSS. Les deux pages utilisent les mêmes modèles de jeu, et non des rendus d'artiste.

## Vérification requise avant mise en production

1. Exécuter `npm test` et inspecter le rapport de build.
2. Vérifier sur navigateur desktop le menu, les quatre onglets de la galerie, au moins un personnage, une arme, RECO1 et une IA, les boutons de rotation et recadrage.
3. Mesurer les FPS M02 qualité Normale/Équilibré+/Performance sur la tablette Dell.
4. Vérifier l'export USDZ iPhone de GHJU/LYLU, les mains et la cape ; ne pas publier l'AR comme validée sans ce contrôle.
5. Essayer le Quest 3 et une manette PS4 pour exclure les régressions.

## Vague 2 — périmètre exclusivement décors (29 octobre 2026)

La demande explicite est de **ne pas modifier les personnages pour le moment**. Aucun fichier de personnage, main, arme, rig, IA ou animation de personnage n'a été modifié par cette vague.

### Corrections intégrées

- **Interface** : rehaussement des matériaux visuels des panneaux d'accueil, missions, galerie, réglages et briefing; meilleure typographie et boutons cohérents (dans `fracture.css`).
- **M02 / rues** : grilles et bordures de caniveau, marquages d'accès, fixations de trottoir, coffrets de service. Géométrie instanciée, sans nouvelle collision.
- **M02 / façades** : conduites techniques, colliers, plaques de maintenance, plus de relief non cubique grâce aux tuyaux cylindriques.
- **M02 / publicités** : six publicités fictives à texture originale (VESPER, HELIX, NEON 24, LIGNE 09, ORDRE, MED-07), avec cadre, éclairage apparent et montage géométriquement aligné sur les façades des tours / marchés.
- **M02 / plafonds** : deux faux plafonds commerciaux avec ossature, dalles partiellement absentes, réseaux techniques, diffuseurs LED, grilles, et quatre extracteurs circulaires.
- **M02 / surfaces** : atlas procédural très léger pour micro-grain, métal brossé et rugosité des rails / dalles.
- **M02 / éclairage et ombres** : deux points lumineux intérieurs en réglage normal, aucun point supplémentaire en Performance; détails exclus de la coûteuse projection de leur propre ombre dynamique.
- **M01 / annexe de secours** : vraie grille de faux plafond suspendu à 8 m avec dalles manquantes, chemins de câble et luminaires.
- **M01 / atelier** : rails, poutres, luminaires et conduites sous toiture existante.
- **M01 / rues** : plaques techniques encastrées, fixations et conduites de façade, sans changement de collision.
- **Tests** : `tests/environment-finish.test.mjs` ajouté pour contrôler la génération du décor avec un moteur Three simulé et le respect du périmètre.

### Limites connues

Aucune capture visuelle validée du rendu final sur tablette Dell, Quest 3 ou iPhone n'est disponible dans cet environnement. Le statut `READY` d'un déploiement signifie que Vercel a construit le site, pas que les modèles 3D sont visuellement exacts ou sans régression. La fusion en production reste conditionnée aux essais navigateur et au contrôle des FPS.

## Réutilisation du secteur visitable comme chapitre 3

**Décision : le niveau 1 canonique est conservé.** L'environnement de Vesper qui avait été montré sous forme de visite 3D (`vesper-level1-v7.html?visit=1`) est exploité comme **MISSION 03 — LE CONVOI DES ABSENTS**, sans copier 900 Ko de code moteur ni interférer avec le premier chapitre.

- Route indépendante `/niveau3.html` via rewrite Vercel vers `vesper-level1-v7.html`; activation locale par le pathname ou `?chapter=3`.
- Choix `03` du menu Histoire et nouvelle branche de navigation après la conclusion de `02 — Sous les Néons`.
- Quatre étapes vérifiables dans un ordre imposé : annexe médicale, atelier, relais A3 en hauteur, zone de Fracture.
- Scénographie propre : boîtiers de preuves, quatre caisses de convoi, enseigne de passage, teinte de fin de journée, briefing et épilogue.
- Téléportation du visualiseur désactivée pendant cette mission pour ne pas neutraliser la progression.
- Décors supplémentaires M01 précédemment ajoutés dans la branche de prévisualisation activés **uniquement lorsque la scène est utilisée comme M03**.
- Aucun fichier de personnage ni aucun collider canonique M01 modifié.
- Vérifications exécutées : parsing JS de tous les modules modifiés, simulation du blocage d'une interaction hors ordre, progression des quatre objectifs et final unique.
- Statut : **prototype de parcours M03**, jouable avec les commandes du visualiseur WebGPU/WebGL2. L'intégration complète à la boucle de combat, aux véritables modèles/rigs des personnages et au système de checkpoints de la campagne reste hors périmètre de cette itération, conformément au gel des personnages. Aucune validation visuelle à distance n'a été possible.
