# Pink Wars 3.80 — matières, lumière et appuis des ennemis

Cette version poursuit la direction FPS des versions 3.78 et 3.79. Elle améliore les systèmes visuels communs et les matériaux de JANUS (M04) et de la fonderie (M06). Les parcours, les objectifs et les collisions des chapitres restent ceux de la 3.79.

## Rendu

- M04 et M06 utilisent les jeux locaux de textures photographiques correspondantes : couleur, normale et rugosité. Les canaux partagent leurs transformations ; les textures de données restent linéaires. Les alias de matériaux reprennent la couleur du même scan que leur relief. Aucun téléchargement de ressource n'est ajouté.
- Le sol de 220 mètres utilise des coordonnées de texture en mètres. L'ancien facteur de répétition 30, partagé avec les petites surfaces d'asphalte, est supprimé : les détails retrouvent une échelle lisible.
- Les espaces utilisant la finition FPS reçoivent une petite sonde d'éclairage indirect uniquement lorsqu'ils n'ont pas déjà leur propre environnement. Une texture HDR de 64 × 32 pixels sert sur ordinateur ; la variante compacte utilise des octets. Les sondes existantes sont conservées.
- Le traitement commun WebGPU sur ordinateur ajoute une occlusion de contact reconstruite à partir de la profondeur, avec huit directions et un rayon d'environ 80 cm. Le ciel et la proximité immédiate de l'arme sont exclus. Il s'agit d'un filtre de contact propre au jeu, pas d'une intégration de GTAO.
- Le passage de scène utilise explicitement une profondeur résolue (`samples: 0`). Le prélèvement d'une profondeur MSAA produisait une image noire pendant les essais ; un contrôle de navigateur couvre désormais les deux réglages d'anticrénelage du canvas. Un léger filtre spatial à quatre voisins lisse les arêtes contrastées dans le même passage final.
- M04 et M06 reçoivent les ombres réelles de leur source directionnelle sur ordinateur (lune à JANUS, soleil à la fonderie) : carte de 1 024 pixels à 6 Hz en qualité normale, 2 048 pixels à 10 Hz en haute qualité. Un déplacement important déclenche une actualisation immédiate. Le budget de déplacement ne renouvelle pas inutilement la carte à chaque image.
- Dans M06, les grands plans transparents orangés qui traversaient visuellement les murs disparaissent. Sur WebGPU, au plus trois volumes natifs proches des ouvertures du toit les remplacent ; leur profondeur respecte les surfaces. Ils s'ajoutent aux quatre volumes locaux existants.

Le téléphone, le casque et le mode Performance conservent leur rendu direct. Les nouvelles ombres solaires et les trois volumes de toiture ne sont pas ajoutés à ces profils. Les matériaux photographiques y gardent leur rugosité, sans charger les nouvelles normales en qualité basse. Les cartes de M04/M06 sont attendues avant le premier rendu jouable.

## Animation des ennemis

Les cinq humanoïdes retargetés (Poursuivant, Synth, Écouteur, Brute et Spectre) verrouillent horizontalement le pied d'appui dans le monde avant la résolution des jambes. Le pied se libère au lever, pendant un saut, après une téléportation, lors d'un pivot rapide ou si l'allonge devient excessive. La marche latérale et les virages progressifs utilisent le même repère.

Les impacts sur la coque produisent une réponse du torse orientée par la provenance du tir et son point de contact. Les châssis lourds absorbent davantage l'impulsion. Une récupération amortie exacte évite de relancer une secousse identique à chaque balle et borne l'accumulation des rafales. REC-01, Rempart et les drones reçoivent aussi cette réponse. Les contacts absorbés intégralement par un bouclier ne déclenchent pas la réaction de coque.

Les mains et les armes conservent leurs repères autoritaires : la réaction du torse ne déplace pas l'origine physique d'un tir. Les contrôles de visée XR restent inchangés. Les comportements tactiques de la 3.79 (recherche locale, couverts, préparations de tirs et attaques de mêlée esquivables) sont conservés.

## Vérification

- Passe ciblée de régression : **144 tests passants**, aucun échec. Elle couvre le combat, les collisions, les armes, les repères XR, les rendus, les missions M04/M06 et la finition de tous les chapitres.
- Après les derniers ajustements : **10 contrôles** de matériaux, d'appuis, d'impacts, d'alignement des armes et de budget des ombres, puis **26 contrôles** de rendu et de missions, tous passants. Ces ensembles se recoupent et ne constituent pas un total de tests distincts.
- Régression dans Chromium : construction réelle des décors M04/M06 et validation de leur source directionnelle ; WebGPU natif avec anticrénelage du canvas activé puis désactivé, ainsi que WebGL. Scène avec ombres, reflet et volume lumineux ; images non vides, absence d'erreurs JavaScript/GPU et effet d'occlusion mesurable sur la géométrie.
- M06 réellement démarré dans Chromium, armes canoniques chargées, en WebGL puis WebGPU. Dix matériaux complétés, dix-huit textures chargées et aucune texture en échec. La capture native inclut les ombres, les reflets, les volumes et l'occlusion de contact, sans erreur.
- M04 réellement démarré et rendu sur WebGL en qualité normale, armes canoniques chargées : vingt textures chargées et aucune erreur. La lumière lunaire est exposée explicitement au gestionnaire d'ombres ; cette référence est aussi contrôlée par le test de construction des deux décors.
- Comparaison de M06 avec la 3.79 aux mêmes positions de caméra ; banc d'animation du Poursuivant de 90 images par version avec la même trajectoire et le même éclairage. Les vidéos sont un banc de contrôle d'animation, pas un enregistrement de combat.
- Deux attentes obsolètes du test REC-01 ont été corrigées après reproduction sur la 3.79 : nom canonique importé depuis le profil et attente de la préparation du premier tir avant de vérifier sa bouche et ses dégâts.

Les captures et journaux sont conservés dans `/workspace/livraison/pink-wars-380/`. Les essais de navigateur utilisent SwiftShader : ils vérifient le fonctionnement et ne mesurent pas une cadence sur GPU physique. Aucun essai matériel sur iPhone ou Meta Quest n'a été réalisé dans cette session.

Contrôle de navigateur reproductible, avec Playwright et Chromium installés :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node tools/check-fps-presentation.mjs
```

Le script utilise par défaut SwiftShader. `PINK_RENDER_SOFTWARE=0` permet d'utiliser l'adaptateur disponible sur une machine disposant d'un GPU. Aucune dépendance de test n'est ajoutée aux fichiers livrés du jeu.
