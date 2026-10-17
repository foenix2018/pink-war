# Pink War 3.41 — armes IV et AÉGIS III

La 3.40 sert de base. Le niveau, les trois modes, les commandes, la santé/les munitions du HUD et les effets de combat sont conservés.

## Cinq armes originales

`tools/build-blaster-mk4.py` construit R9, BLOOM, LANCE, THORN et NOVA dans Blender 4.3.2. Les GLB sont livrés localement dans `dist/assets/pink-war/`, sans téléchargement tiers. Les modèles Kenney CC0 originaux restent intacts comme secours réseau. La génération IV est originale, pas un asset Halo ou Mass Effect.

Les corps profilés sont reliés aux poignées inclinées, crosses ajourées et canons. Les poignées utilisent les prises RLH mesurées de la 3.39. Les extras GLB portent `pinkWarFrame`, la vraie position de bouche et les montages optiques : l’installation applique directement ce repère, sans l’ancienne mise à l’échelle de Kenney. Flash, chaleur, rayon de tir et lunette utilisent ces repères. L’ancien collier mobile est masqué lorsqu’un modèle complet possède son propre émetteur.

Les matériaux métal, céramique, peinture, polymère, énergie et optique sont distincts. Cartes originales déterministes 256 px, UV à échelle physique, rugosité et microrelief ; reflets du même environnement que le personnage. Cinq à six lots par arme, moins de 16 000 triangles par arme, une seule visible à la fois. Le HTML autonome incorpore uniquement les cinq armes IV.

Reconstruction : `blender --background --python tools/build-blaster-mk4.py`. Le manifeste `models-mk4.json` contient les comptes et les repères. Le fichier natif LANCE est `dist/assets/pink-war/pink-war-lance-mk4.blend`.

## Personnages

`dist/aegis-v3.js` construit une tenue entière en lieu et place des maillages de pompier. Les données RLH d’origine restent intactes : squelette 34 os, Idle Rifle, Rifle Walk, marche/course et solveur d’appuis/poignets. Les gants conservent leurs 28 os et leurs prises calibrées. Les mesures des semelles restent dans le repère local du corps, y compris sur une terrasse ou un ascenseur ; une translation en hauteur ne peut pas rabattre le bassin vers le sol. Le corps nouveau utilise sept matériaux et moins de 20 000 triangles au niveau 1 ; les variantes et niveaux partagent leurs géométries.

LYLU mesure 1,80 m, GHJU 1,70 m. Combinaison noire, plastron blanc, ventre articulé, poches, cuissards, genouillères, bottes et casque de soldat fermé. Visages absents. Accents bleu/rose et couronne originale Pink War. Le casque est une coque fermée, la visière est opaque. Au repos l’arme s’abaisse, en aperçu le fusil est porté sur le côté à une main ; en visée et marche armée les deux mains reprennent leurs prises.

`personnage.html` montre le vrai modèle animé et `armes.html` les cinq vrais équipements, avec rotation, zoom et affichage des mains. Les captures sont des rendus du navigateur, pas des illustrations. Cette étape améliore les silhouettes et les matériaux ; elle reste une modélisation de prototype, pas un personnage photogrammétrique.

## Vérification

Tests : repères GLB et canon visible, origines des tirs, suppression du collier flottant, prises réelles, optiques alignées, budget géométrique, poids de squelette complets pour tous les sommets, casque clos, gestes et recharge sur les six armes. Contrôles d’intégration en Chromium/WebGL et simulation WebXR. Aucun iPhone, Mac avec DualShock ou Quest physique n’est disponible dans cet environnement ; les performances et le confort physiques restent à essayer.
