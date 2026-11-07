# Textures : arène et stand

Passe de matériaux locale, ajoutée à la refonte du stand en cours. `combat-surface-textures.js` partage les chargements et les vues de textures entre matériaux utilisant la même surface. Les images 512 px proviennent des ressources locales CC0 déjà documentées dans `dist/assets/cc0`.

- Arène : béton fissuré, asphalte craquelé, acier patiné, peinture usée sur les panneaux, générateurs et châssis des huit tourelles. Ajout des cartes de rugosité et, en qualité haute, de relief normal. Les albedos Vesper fissurés sont conservés.
- Stand : acier photographique sur les portiques, tables, cadres, bornes et armurerie ; caisses peintes distinctes ; tôles ondulées sur les auvents ; béton et acier sur les bâtiments extérieurs. Les surfaces déjà photographiques du sol et des murs sont conservées.
- Les UV des grandes pièces, de l’armurerie et des plaques de tourelles respectent une échelle métrique pour limiter l’étirement. Aucun changement de collision, d’exercice, de vague ou d’armement.
- Les écrans, réticules, lentilles et néons conservent leurs matériaux dédiés et leur lisibilité.

Chargement à l’entrée dans le mode, une requête par image dans chaque pack, cartes partagées entre matériaux, répétitions séparées au besoin. Les textures normales sont omises sur le profil compact. Les échecs gardent les textures de secours ; la libération supporte les chargements encore en cours. Le pack du stand est libéré avec son décor ; l’arène expose `disposeTextures()` pour son propriétaire.

## Vérification

51 tests réussis : matériaux et UV, chargements différés et partagés, libération des ressources, murs/collisions, vagues et tourelles, stand et cibles, armurerie, bornes et commandes VR.

Rendus Chromium/WebGL, aucun échec de texture ni erreur JavaScript :

- Arène haute qualité : 11 images pour 8 matériaux ; 45 appels de rendu et 56 150 triangles dans la vue de comparaison, identiques avant/après.
- Stand compact : 7 images supplémentaires pour 10 matériaux, sans normales ; les 7 images du chargeur historique sont également chargées.
- Stand haute qualité : 10 images supplémentaires pour 10 matériaux, plus les 10 images historiques. 297 appels de rendu dans la vue rapprochée contre 296 avant la passe (un groupe supplémentaire pour les caisses), nombre de triangles inchangé.

Captures moteur dans `/workspace/livraison` : `Arene_textures_avant.png`, `Arene_textures_apres.png`, `Stand_textures_avant.png`, `Stand_terminal_textures.png` (compact), `Stand_textures_HD_apres.png`. Les captures montrent le décor rendu avec les vrais modules, sans le HUD ni les acteurs du joueur. Les performances sur appareil mobile ou casque physique n’ont pas été mesurées.

Publication GitHub/Vercel non effectuée.
