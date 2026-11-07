# M02 — géométrie physique, limites du quartier et sons

Le personnage et les projectiles doivent rencontrer les éléments solides visibles. Les volumes manquants ont été ajoutés aux corps pleins des trois escaliers, aux volets fermés, aux comptoirs tournés vers la rue, aux banquettes, aux caisses et au mobilier de l'enclave. Les dalles substantielles des commerces et les plafonds des pièces du scénario arrêtent également les tirs et la montée du personnage. Les positions du nouveau mobilier de l'enclave et ses empreintes physiques partagent `m02-life-layout.js`.

Les corps des marches gardent leur hauteur complète pour les tirs. La capsule de déplacement peut chevaucher les marches suivantes dans l'intérieur de la volée, avec une tolérance de 62 cm correspondant à son rayon et à la pente. Cette tolérance ne supprime pas les faces latérales et ne s'applique à aucun autre obstacle.

Les arrivées de la passerelle ont de vraies ouvertures dans les garde-corps : accès est, descente ouest et montée au toit. Le palier du toit reste dans la travée libre ; il ne rentre plus dans une façade résidentielle. Les bâtiments résidentiels sont reculés pour dégager les escaliers et leurs volumes de toit correspondent aux planchers modélisés. Les toitures et murs latéraux des commerces rejoignent leurs façades.

Un fusil long ou une manette XR peut dépasser visuellement dans un mur mince. Le point de départ des tirs M02 est désormais ramené avant le premier obstacle rencontré depuis le joueur. Les projectiles sont ensuite traités par la simulation habituelle ; ils heurtent la face proche du mur.

Le sol couvre maintenant le quartier entier. Ses limites ont des façades physiques de 32 m, des travées de service, des joints, des bandes métalliques, du béton photographique local à une échelle métrique et une signalétique Épars / Directoire. La porte du convoi ouvre sur un sas de fret dessiné jusqu'à x=58, au lieu de buter sur la limite est à x=48. Les tours décoratives de l'arrière-plan restent au-delà des volumes jouables. Les missions, leurs verrous et les ennemis sont conservés.

Les portes M02 jouent un mouvement mécanique d'ouverture ou de fermeture, une seule fois par changement de sens. Le volume et la stéréo dépendent de la distance et de l'orientation ; les sons s'arrêtent à la pause. Les enregistrements Kenney sont CC0 et livrés en PCM WAV local avec provenance et empreintes SHA-256. Le VORTEX AR7 reçoit sa propre décharge électrique courte, superposée au transitoire automatique existant. Le cas qui atténuait sa synthèse sans jouer d'enregistrement est corrigé. Les deux sons de portail approuvés restent inchangés.

## Vérification

- 55 contrôles ciblés réussis sur la version réunie ; 703 volumes physiques et 293 surfaces extraits de la scène complète.
- Tests ciblés : corps d'escaliers et faces latérales, montée/descente, limites et sas, plafonds, départ du tir avant un mur mince, empreintes du mobilier et accès à la réserve, transitions audio et coupure du son, chargement du VORTEX, licences et sommes de contrôle.
- Non-régression : parcours et points de contrôle M02, lecture du badge, ouverture du coffre, guidage, renforts et portails, synthèse et effets de combat, collisions du niveau 1, vie de l'enclave, joystick et dialogues des mises à jour GitHub reprises.
- Navigateur WebGL : scène complète chargée ; ouverture physique et visuelle du coffre après activation du lecteur ; ancien point de contrôle réparé ; aucune erreur JavaScript. Les requêtes externes refusées sont liées au réseau de la machine de test.
- Parcours sur les obstacles et surfaces extraits de la vraie scène : escalier est jusqu'à 12 m, palier, traversée, descente ouest au sol, montée au toit à 25 m et retour. Aucun téléport entre les segments d'une même volée ; déplacement et gravité de production.
- Audio Web Audio natif : ouverture, fermeture, puis dix tirs espacés de 115 ms. Crête mesurée 0,2643 ; aucun échantillon non fini ni saturation. Aperçu WAV exporté dans les fichiers de livraison.
- WebGPU natif : initialisation du niveau confirmée avec `backend: webgpu`. La capture hors écran de la scène complète sur Vulkan logiciel a été interrompue en raison de son coût ; elle ne constitue pas une mesure des performances d'un appareil joueur.

Deux anciens tests de `354-level2-gameplay.test.mjs` restent en échec : ils attendent l'ancien format de raccourcis et l'ancien comportement de Space. Ils portent sur des commandes déjà modifiées avant cette correction. Ils n'ont pas été réécrits pour masquer cet écart. La suite générale n'a pas été lancée.

Commande ciblée :

```sh
node --test tests/370-m02-extension.test.mjs tests/m02-physics-audio.test.mjs tests/380-m02-vie-sms-fleche.test.mjs tests/laser.test.mjs tests/3637-combat-audio.test.mjs tests/351-level2-pbr.test.mjs tests/m02-guidance.test.mjs tests/m02-portal-regression.test.mjs tests/electric-portal.test.mjs tests/breach-collisions.test.mjs
```
