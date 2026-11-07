# Commandes physiques modernes

Quatre familles partagent `modern-switch.js` : disjoncteur à levier protégé, sélecteur rotatif, lecteur d’accès capacitif et panneau tactile. Les différences portent sur la silhouette, le mécanisme, les anneaux et la disposition de l’écran, pas uniquement sur la couleur. Boîtiers chanfreinés, cadres métalliques, vis, bagues et grips sont en volume.

L’écran affiche la fonction et un état textuel : verrouillé, disponible ou action confirmée. Le libellé final respecte l’action : un disjoncteur neutralisé indique « CIRCUIT ISOLÉ », un accès déverrouillé « ACCÈS OUVERT ». La couleur et l’animation complètent le texte. Les textures d’écran sont locales et ne sont redessinées qu’au changement d’état. Aucune lumière dynamique supplémentaire.

Intégrations : alimentation M01, atelier et circuits de secours ; commandes M01/M02 étendues ; alimentation, balise et barrière M03 ; scanner, relais et stabilisateurs M04 ; commandes du métro ; disjoncteurs M06 ; consoles de la Couronne ; relais et stabilisateurs de l’ancienne Brèche ; commande des cibles du stand. Les objets documentaires, vannes et manivelles conservent leur fonction. Aucun changement des identifiants d’action, collisions, raccourcis, conditions de progression ou sauvegardes.

L’adaptateur `circuit-switch.js` garde l’API existante, y compris les commandes intégrées aux lots de géométrie des meubles. Les animations répondent aussi à la remise à zéro. Les matériaux fournis par le décor restent sa propriété lors du nettoyage.

Validation : 41 tests ciblés réussis (géométrie et budgets, états indépendants et retour à zéro, équivalence des transformations avec/sans regroupement, destruction idempotente, progression de M01, stand, armurerie et bornes). Construction des décors en Chromium/WebGL et transitions des commandes vérifiées dans les missions concernées. Aperçu des quatre modèles réellement utilisés : `/workspace/livraison/Interrupteurs_modernes.png` ; 33 appels de rendu et 11 182 triangles pour cette scène de présentation, sans mesure sur casque physique.

Version locale ; non publiée sur GitHub ou Vercel.
