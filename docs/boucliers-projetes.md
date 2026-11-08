# Boucliers projetés — 3.75.1

LYLU projette une demi-sphère bleue et GHJU une demi-sphère rose depuis le bras gauche. Le champ protège le devant du personnage lorsqu’il est déployé. Les tirs arrière atteignent la santé. La réserve existante de 60 points absorbe les dégâts ; le surplus atteint la santé. À zéro, le champ éclate et se replie. La recharge existante est conservée, puis le joueur peut le redéployer.

Commandes : bouton **Bouclier** à l’écran, touche **H**, ou croix directionnelle **bas** sur une manette standard. Sur iPhone et ordinateur, une icône de bouclier intégrée au HUD affiche la réserve et l’état déployé. En Meta Quest, un bouton dédié à côté du pupitre au poignet gauche permet d’activer et de replier le champ : pointer avec la main droite puis appuyer sur sa gâchette. Cette pression est consommée jusqu’au relâchement pour éviter un tir involontaire. L’action du menu immersif reste disponible. Les commandes sont suspendues pendant les pauses et les dialogues.

Brute et Rempart possèdent une bulle complète de 60 points. Les balles frappent sa surface avant le châssis. Elle réagit aux impacts, éclate à zéro et ne réapparaît pas sur le même ennemi. Les autres profils ne reçoivent pas cette bulle.

Le moteur partagé applique ces règles aux niveaux de combat, à l’arène et au stand. Le rendu emploie des matériaux TSL avec WebGPU et un équivalent GLSL avec WebGL. Les fragments utilisent quatre effets réutilisables et des maillages instanciés, sans ajout de lumières dynamiques. Les collisions utilisent la même position et les mêmes dimensions que le champ visible ; les murs conservent leur priorité.

## Vérification

- Sept tests de combat couvrent activation, orientation, accroupissement, tirs réels, murs, débordement, recharge, bulles et destruction simultanée de l’ennemi.
- Les régressions ciblées couvrent l’armure, les grenades, les missions, les déplacements, les commandes et le stand. Le contrôle M03 des réécritures Vercel a été corrigé pour distinguer une réécriture d’un en-tête de cache.
- Des contrôles navigateur exécutent les vraies entrées des chapitres 2 à 7 et leurs commandes. Au niveau 2, les 18 parcours d’escaliers et les sorties du zoom passent. Pour ces contrôles de logique, le rendu lourd est suspendu dans le banc de vérification.
- Le rendu des champs et de leur rupture est vérifié séparément en WebGPU et WebGL avec le véritable personnage LYLU et une Brute. Aucun casque physique n’a été utilisé.

Les comptes rendus et captures sont conservés dans `/workspace/livraison/Integration_boucliers_*` et `/workspace/livraison/Bouclier_integre_*`. La suite historique complète n’est pas déclarée réussie : le test ancien `352-level2-launch` utilise un faux élément sans `closest`, et `336-training-upgrade` attend un ancien nom de plafond. Ces échecs préexistent à cette intégration.

La version 3.75.1 vérifie les dispositions ordinateur, iPhone portrait et paysage dans Chromium, ainsi que les deux moteurs Quest avec des poses et gâchettes simulées (27 tests ciblés). Ces contrôles couvrent le maintien de la gâchette, le retour au tir après relâchement, la pause et la disparition du bouton hors session.
