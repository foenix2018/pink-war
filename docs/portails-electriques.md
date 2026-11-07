# Portails électriques — version validée V4

Les portails de l’arène et des missions M01, M02, M03, M04, M06, Ligne 9 et Couronne utilisent le module partagé `dist/electric-portal.js` : fissure verticale, arcs 3D ramifiés, inducteurs modélisés, champ turbulent et fermeture par rétraction. Le champ utilise TSL/WGSL sur WebGPU ; le chemin WebGL conserve les arcs et une membrane texturée. Les éléments statiques sont regroupés par matériau, les arcs utilisent deux maillages instanciés, les portails retirés sont libérés après la fermeture.

Le son reprend exclusivement l’ouverture et la fermeture approuvées dans le prototype V4. Les phases ouvertes et l’apparition des ennemis ne jouent aucun bip. Les deux fichiers WAV locaux proviennent du mix Kenney CC0, avec atténuation et panoramique selon la position du joueur. Les transitions ne se rejouent pas pendant le maintien du portail. Les sons en attente sont annulables, la coupure du son et les réinitialisations interrompent les voix du contrôleur. Crédits : `dist/assets/audio/portals/CREDITS.md` ; sources : `source-manifest.json` dans le même dossier.

## Vérifications

- 11 contrôles ciblés réussis : enveloppe de fissure, géométrie finie, budgets d’arcs, fermeture et destruction des ressources, portails différés, silence entre transitions, annulation des sons, fermeture malgré l’arrêt de l’horloge de simulation et repères HUD.
- Chromium WebGPU : backend actif, matériau de champ natif, 836 segments d’arcs en haute qualité, fermeture complète à zéro segment ; chargement et lecture/arrêt des deux WAV, aucune erreur JavaScript.
- Chromium WebGL : démarrage du jeu complet en arène, portail actif et cinq ennemis de la première vague, aucune erreur JavaScript. La simulation a été avancée par le banc de contrôle et le rendu intermédiaire suspendu pour accélérer le test dans le moteur logiciel de la machine virtuelle.
- Les cinq scènes M03/M04/M06/Ligne 9/Couronne ont construit, ouvert, fermé et libéré leur portail ; une seule notification de fermeture par effet.
- Vérification générale interrompue après 679 résultats (666 réussis, 13 échecs), pour ne pas prolonger les simulations de missions sans rapport avec ce changement. Les 13 mêmes cas ont été reproduits sur le commit publié avant cette modification, `27b0763`. La suite générale n’est donc pas annoncée entièrement verte.
- Les captures et contrôles de navigateur ont été effectués localement. L’accès HTTP à la production Vercel est restreint par le réseau d’exécution ; la livraison doit aussi être contrôlée par son statut, son commit et son domaine dans l’API Vercel.
