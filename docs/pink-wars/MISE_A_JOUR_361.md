# Version 3.61 — Armes individuelles et Bas-Niveaux marqués par la guerre

## Une seule arme pour LYLU

Le double armement est réservé au **R9 DUO de GHJU**. Le M12 de LYLU, les fusils, le sniper et les autres armes restent individuels pour les deux héros.

Le défaut venait du rendu XR des missions : la visibilité de l’arme gauche pouvait valoir `undefined`, alors que le moteur masque uniquement la valeur `false`. La copie gauche est désormais explicitement cachée et le gant articulé reste visible. Les contrôleurs conservent leurs modèles existants ; aucune modification de l’anatomie ou du design Shadow Unit.

Une règle commune protège aussi l’inventaire, les offres d’armes, leur sélection, le stand de tir, AT HOME et les anciennes sauvegardes de LYLU. La recharge automatique et les commandes de pause/reprise de la 3.60 sont conservées.

## M02 — Sous les Néons

Les douze immeubles de proximité utilisent désormais des dalles, des allèges et des piliers raccordés à la façade et à son volume de collision. **654 baies**, dont **150 endommagées**, remplacent les fenêtres posées devant les anciennes masses prismatiques. Les vitrages sont en retrait, avec encadrements, appuis, quelques fenêtres encore éclairées, balcons et équipements de toiture.

Les annonces HELIX, les avis d’évacuation et de recherche deviennent des imprimés vieillis de dimensions humaines. Ils reposent sur des baies murées au rez-de-chaussée. Les enseignes sont orientées vers la rue, montées sur les façades ou sur des supports physiques. Les anciens grands panneaux flottants et les bandes lumineuses répétées sur les toits sont retirés.

Un sol extérieur couvre désormais tout le quartier, y compris les retraits entre chaussée et immeubles qui exposaient le fond de scène. Les marchés ont un sol continu raccordé au trottoir et des supports de toiture. Les trois postes informatiques reprennent les ordinateurs humains de M01 : métal usé, écran encastré, clavier et câblage, avec un affichage local sobre. Les caisses de couverture reçoivent des arêtes arrondies, un couvercle, des sangles et une fermeture.

Deux véhicules civils incendiés, des débris groupés, des traces d’impact et d’incendie, des câbles arrachés et de la fumée complètent la rue. Des détonations lointaines espacées ajoutent un contexte de combats urbains ; elles ne blessent pas le joueur. Leurs sons sont synthétisés pour le jeu, filtrés et répartis dans l’espace. La pause coupe ces sons et les éclairs, et gèle leur calendrier.

L’éclairage nocturne est moins saturé. Une petite carte de réflexion permet de lire les métaux sans les rendre émissifs. Les ombres de la qualité normale gardent une seule lumière directionnelle ; Performance conserve son budget sans ombres dynamiques.

## Matériaux et chargement

Six profils de surfaces partagent les textures locales : asphalte, béton, métal, platelage, rouille et maçonnerie. Ils réutilisent les photographies **Poly Haven CC0** déjà livrées et la brique PBR **Quaternius CC0** de M01. La brique est une texture créée par son auteur, pas un scan photographique. Provenance : `dist/assets/cc0/sources.json` et `assets/level1/cc0-props-sources.json`.

Les atlas principaux restent en 512 px sur ordinateur, en 256 px sur mobile/Performance, avec une brique à 128 px sur mobile et sans normales. Leur budget estimé est de **24,1 Mio / 3,5 Mio**, hors personnages, effets, écrans et signalétique.

Une compilation graphique lente ne fige plus les matériaux provisoires : les images locales remplacent la texture de secours dès leur décodage, dans la même texture GPU. Aucun téléchargement externe ne bloque le démarrage.

## Continuité du book et limites

M02 reste le quartier résidentiel et marchand **W02 / Bas-Niveaux**, sous occupation, avec la station de soins, la galerie, les passerelles et la tour de transit. Les niveaux 0 / +12 / +25 m, les objectifs et les itinéraires existants restent en place. Les épaves laissent libre le chemin central et l’accès aux escaliers. Les dommages racontent les combats de Vesper ; ils n’ajoutent pas de nouvel événement canonique. Cara et Gaby restent verrouillées jusqu’à M07.

Cette livraison améliore le décor du prototype M02 ; elle ne prétend pas achever tous les assets et rencontres du tome II. Les façades ne sont pas destructibles et les fenêtres des logements ne donnent pas accès à des intérieurs jouables.

## Vérifications

- **432 tests automatisés réussis**, aucun échec. Contrôles supplémentaires après le dernier ajustement des affiches : **23 tests réussis**.
- Inventaires de GHJU/LYLU dans les quatre simulations, sauvegarde LYLU contaminée, véritables booléens de visibilité XR et remplacement tardif des textures.
- Vérifications géométriques : vitrages derrière le plan de façade, quatre coins des affiches devant un vrai support maçonné, épaves hors du passage central, débris groupés et arrêt des événements en pause.
- Navigateur M02 : six profils de textures chargés sans secours définitif, aucun fichier manquant ni erreur JavaScript. Quinze combinaisons personnage/arme dans une session XR simulée, tir du M12, recharge automatique et sortie de session.
- Émulation iPhone : lancement WebGL, tirs tactiles de GHJU avec baisse des munitions, interaction avec le poste de soins et cinq hostiles actifs, pause puis reprise.
- Rendu audio hors ligne : la détonation lointaine produit un signal non silencieux.

Un essai WebGPU forcé sur l’adaptateur logiciel SwiftShader a perdu son périphérique ; le repli automatique a bien relancé M02 en WebGL avec ses six matériaux. Ce contrôle valide le repli, pas le rendu WebGPU sur matériel réel.

Les essais navigateur sont réalisés sous Chromium ; ils ne remplacent pas une mesure de fluidité sur un iPhone ou un Quest 3 physique. Captures et rapports de travail : `/workspace/livraison/captures_361/`.

## Captures du jeu

Vues de contrôle du décor réellement rendu en qualité Performance : [Rue](https://pink-war.vercel.app/evolutions/m02-361-rue.webp), [Façades](https://pink-war.vercel.app/evolutions/m02-361-facades.webp), [Affiche sur son support](https://pink-war.vercel.app/evolutions/m02-361-affiche.webp).
