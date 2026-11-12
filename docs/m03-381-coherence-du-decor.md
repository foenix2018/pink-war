# Pink Wars 3.81 — cohérence du décor du niveau 3

La reprise concerne le niveau 3 existant, depuis l'annexe médicale jusqu'à la gare. Les assemblages et leurs volumes physiques sont corrigés ; le scénario et la succession des objectifs sont conservés.

## Défauts constatés et corrections

| Zone | Défaut reproduit | Correction |
| --- | --- | --- |
| Atelier | Cinq machines de la carte de visite et sept habillages d'établis s'ajoutaient aux meubles de mission. Des outils lumineux restaient suspendus après le remplacement des corps. | Retrait des assemblages anciens complets, de leurs lumières et de leurs volumes devenus inutiles. Deux équipements identifiables sont placés contre le mur, avec plaques fixées aux carters. Le centre de l'atelier est dégagé ; les établis fonctionnels existants restent présents. |
| Objets remplacés | La suppression se basait sur le centre d'une face : elle pouvait supprimer une grande paroi dont le centre tombait dans un petit accessoire. Les anciens tubes pouvaient aussi être reconstruits malgré le retrait de leur support. | Une face doit tenir entièrement dans le volume de l'accessoire pour être retirée. Les tubes, halos et sources de lumière suivent le même masque de suppression. |
| Annexe et atelier | Des rayonnages commençaient à 55 cm du sol. Les anciens écrans et vitres intérieurs utilisaient la texture des fenêtres de gratte-ciel ; de petits fragments de végétation étaient dispersés à l'intérieur. | Les meubles modélisés reposent sur leur sol, les vitres intérieures ont un matériau propre et les fragments végétaux parasites sont retirés. |
| Enseignes et ville haute | Plusieurs enseignes étaient éloignées des façades ou de leur étage réel. Le train de fond passait à côté de son rail ; les supports de la ligne s'arrêtaient dans le vide. | Les enseignes hautes suivent les retraits réels des tours. Les enseignes de rue reçoivent des mâts et des attaches. Les deux podiums de l'annexe et de l'atelier reprennent la hauteur du toit existant. Le train est centré sur son rail, les piles descendent au sol et les voitures disparaissent au-delà de la voie. |
| Échangeur | Deux bretelles se terminaient en hauteur, avec des pièces inclinées et des piles mal raccordées. | Une seule bretelle relie le viaduc au sol. Elle possède un tablier fermé et continu, des garde-corps et des piles à la bonne hauteur. L'accès routier fermé est matérialisé par des barrières. |
| Gare | Les pieds du portique étaient décalés de cinq mètres de part et d'autre de la poutre. Le chariot flottait sous la structure. | Les deux pieds sont alignés sous la poutre ; contreventements, rail, chariot, câble et crochet forment un assemblage continu. |
| Remorque et conteneurs | La remorque dégagée pénétrait le mur est et perdait sa collision. Le conteneur supérieur n'avait pas de volume physique. | La remorque se range longitudinalement dans une baie libre et garde un volume à sa position finale. Le câble suit son point d'attache pendant la traction puis disparaît après le dégagement. La collision de la pile de conteneurs couvre sa hauteur complète. |
| Bornes de mission | Tablettes, papiers et gemmes de repérage restaient suspendus. | Les documents et commandes reposent sur des supports physiques. Les gemmes animées deviennent des témoins fixés aux boîtiers ; les interrupteurs conservent leurs propres indicateurs. |

## Physique et budgets

Le nouveau module `m03-coherence.js` fournit les mêmes données au rendu et au layout : équipements, mâts, portique et bretelle. La surface praticable du tablier reprend les triangles du maillage. Ses volumes de tir sont découpés en tranches de 60 cm avec un recouvrement de 2 mm pour fermer les joints numériques. Le plafond de hauteur évite de placer un joueur situé sous la bretelle sur le tablier supérieur.

Les géométries fixes du portique, de la bretelle et des mâts sont fusionnées par matériau. Aucun projecteur supplémentaire n'est ajouté ; les anciens cônes lumineux géométriques des lampadaires de l'échangeur sont supprimés. Les deux volumes WebGPU intérieurs existants restent présents. Le scan de nettoyage a lieu à la construction du secteur, pas pendant les frames ; ses boîtes de faces ne sont pas conservées en mémoire.

## Vérification

Les contrôles comprennent les parcours complets à pied de GHJU et LYLU, les deux escortes, les interactions, les checkpoints, le passage de l'ambulance, les collisions joueur/tirs/ennemis et les tests d'assemblage. Les nouveaux contrôles vérifient notamment la conservation des grandes parois, l'absence de tubes orphelins, l'appui des rayonnages, les attaches des enseignes, les piles du tablier, la hauteur réellement rendue et l'enveloppe des conteneurs et de la remorque.

Le niveau est exécuté dans Chromium en qualité normale sur WebGL puis WebGPU natif avec les armes et le personnage canoniques chargés. Les captures avant/après conservent les mêmes caméras. Les images, états de scène et journaux sont conservés dans `/workspace/livraison/pink-wars-381/`.

Résultat final : **32 tests passants, aucun échec**, dont les parcours complets des deux héros. Le rendu natif charge le personnage canonique et produit des images non vides avec l'occlusion de contact active et inactive, sans erreur JavaScript ou GPU. Le contrôle des joints de tablier a détecté une fente numérique avant la livraison ; le recouvrement de 2 mm est vérifié par des tirs traversant la surface à 54 positions.

Ces essais utilisent SwiftShader pour vérifier le fonctionnement et le rendu ; ils ne mesurent pas une cadence sur iPhone ou Meta Quest.
