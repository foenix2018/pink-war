# Pink Wars 3.92.1 — sélection des tenues dans la planque

La salle Tenues affiche les deux personnages dans leurs centrifugeuses dès l’ouverture de la sélection. Chaque bouton de stade charge le véritable modèle correspondant dans la capsule, avec sa matière, ses modules et les mains corrigées. Le même modèle apparaît aussi dans le panneau de sélection, avec un éclairage de présentation et une rotation au doigt ou à la souris : le menu ne masque plus la tenue sur iPhone. Les capacités, le niveau du plan, le prix et les états équipée/fabriquée/plan requis accompagnent ce modèle. La sélection utilise un seul ensemble de cinq boutons.

L’aperçu est indépendant de la fabrication et de l’équipement. Il ne modifie ni la sauvegarde nano, ni les nanoparticules, ni les capacités actives. Un stade non fabriqué reste visible pour comparaison ; l’équiper nécessite toujours sa fabrication. Le contrôle de récupération accepte explicitement un aperçu seulement après vérification de la propriété du stade dans l’interface ; les appels ordinaires continuent à exiger une fabrication visuelle achevée. La tenue disparaît de la capsule après transfert, et le choix équipé persiste pour les missions.

La centrifugation reste disponible pour fabriquer ou recomposer une tenue. Les sélections sont suspendues pendant le chargement, la centrifugation et le transfert pour préserver la cohérence du modèle présenté.

Vérification : tests des capacités, des poses et des centrifugeuses ; parcours réel de la page sur ordinateur (GHJU) et viewport/tactile iPhone émulé (LYLU). Les dix sélections ont affiché leur vrai modèle sans modifier l’inventaire, le verrou du stade 5 a été vérifié, puis les tenues fabriquées ont été équipées et retrouvées après rechargement. Aucun résultat de performances sur iPhone physique n’est annoncé.

Preuves : `/workspace/livraison/pink-wars-selection-20261123/selection-browser.json` et captures voisines.

L’aperçu du panneau réutilise le moteur de rendu de la planque, sans second contexte 3D. Une vue isolée du modèle est calculée au changement de tenue, pendant la fabrication ou pendant la rotation ; une image stable n’entraîne pas de rendu supplémentaire. Le chemin WebGL utilise son propre type de cible, et le chemin WebGPU la cible native.

Le test navigateur accepte `SELECTION_GPU=1 SELECTION_PROFILES=desktop` pour vérifier le backend WebGPU natif. Sa cadence est limitée dans Vulkan logiciel pour ne pas saturer la file GPU lors des lectures et des navigations ; ce contrôle vérifie les images et le fonctionnement, et ne constitue pas une mesure de FPS du jeu.
