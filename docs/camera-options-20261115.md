# Action et options de caméra — 3.85.3

Les boutons Action du HUD partagé et du chapitre 7 affichent une clé à molette pour toutes les interactions. Leurs libellés accessibles et leurs commandes restent contextuels : portes, terminaux, objets et stand utilisent la même action existante.

Les menus de pause et de réglages des niveaux 3, 4, 5, 6 et Couronne HELIX reçoivent le sélecteur FPS / troisième personne manquant. Leur changement de caméra accepte explicitement la vue sélectionnée, actualise la caméra pendant la pause et enregistre la préférence commune. Le retour en FPS reste disponible lorsque le personnage n’est pas chargé. Les niveaux 1 et 2 ont la même correction de disponibilité. Dans le casque, le changement de vue reste bloqué.

Validation : 19 tests passent sur les options, les caméras et l’action contextuelle. Les fonctions et branchements réels de chacun des cinq niveaux sont exercés dans les deux sens, y compris personnage indisponible et XR. Le navigateur avec commandes souris et iPhone émulées vérifie les options, le retour à la partie, le déblocage après chargement et une seule commande Action par activation, avec un pictogramme identique pour plusieurs contextes. Le niveau 3 complet est également vérifié : troisième personne → FPS → troisième personne → FPS pendant la pause, position réelle de la caméra en FPS et reprise de la partie dans la vue choisie, sans erreur JavaScript. Le script de reproduction est `tools/verify-camera-options.mjs` (servir `dist` sur le port 4173 ; `PLAYWRIGHT_MODULE` peut désigner l’installation de Playwright).

Les réglages de mouvement et de performance des versions précédentes ne sont pas modifiés.
