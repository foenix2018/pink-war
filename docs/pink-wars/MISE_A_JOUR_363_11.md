# 3.63.11 — Ombres du monde et contacts

26 octobre 2026. Demande : ajouter des ombres sur l’ensemble du jeu, y compris les nouvelles structures.

## Correction principale

Le profil iPhone, le mode compatible et la qualité basse désactivaient les ombres projetées. De nombreux accessoires n’étaient pas non plus autorisés à en produire en qualité basse. Le réglage de détail des textures ne supprime désormais plus les ombres ; un budget propre aux appareils limite leur taille et leur fréquence de mise à jour.

Le module partagé `world-shadows.js` équipe M01, M02, l’arène/le stand et AT HOME. Les surfaces physiques opaques et les personnages peuvent projeter et recevoir les ombres. Les feuillages utilisent leur découpe alpha ; les effets lumineux et les vitres transparentes ne deviennent pas des silhouettes opaques. L’arme et les mains attachées à la caméra FPS reçoivent l’éclairage sans projeter une fausse silhouette flottante devant le joueur.

## Ombres projetées

- Une ombre directionnelle principale suit le joueur au lieu de rester centrée sur le début de carte. Les bâtiments, couverts, machines, personnages et nouvelles toitures y participent.
- Carte 1024² et cadence nominale de six mises à jour/s sur mobile, Quest, compatibilité et qualité basse ; 2048² et dix mises à jour/s sur ordinateur. Déplacement et changement d’état peuvent forcer une mise à jour. La résolution de la fenêtre suit ce budget.
- La lampe torche existante de M01 projette aussi des ombres, avec une carte de 256² ou 512². Aucun nouveau projecteur n’est ajouté ; les autres lumières ponctuelles conservent leur coût existant.
- Épaisseur et décalage de réception limitent les stries sur les surfaces et le décollement des pieds. Les ombres des acteurs mobiles sont régulièrement recalculées.
- AT HOME suit les coordonnées de jeu issues du déplacement réel et le sol fourni par la pièce ; la validation sur Quest physique reste à faire.

## Contacts et stabilité

Une occlusion douce au pied des obstacles physiques complète les ombres directionnelles dans M01, M02 et l’arène. Le calcul exclut plafonds, plateformes hautes, grandes dalles et surfaces de sol : il ne peint pas une grande tache sur tout l’intérieur d’un bâtiment creux. Une seule passe de rendu supplémentaire par carte, avec atlas de 512² ou 1024².

Un ensemble instancié plafonné à 64 ombres de contact accompagne les acteurs et le joueur, à la hauteur de leur sol. Les anciennes silhouettes approximatives peintes dans l’habillage de M01 sont retirées pour éviter des doubles ombres et des rectangles décalés.

Les contacts ne participent pas aux collisions ni aux dégâts. Modèles, lore, son, arrivée calme, compteurs et progression de mission restent ceux de la 3.63.10.

## Validation

Tests de budget mobile/Quest ; surfaces opaques, végétation et vitres ; absence de silhouette FPS ; suivi du joueur, cadence et réinitialisation ; hauteur des contacts ; exclusion des plafonds et sols dans l’atlas.

Les vérifications navigateur portent sur M01 en formats ordinateur et mobile, la carte d’ombres réellement active et ses objets, le démarrage de M02/arène/AT HOME et le déplacement de la fenêtre d’ombres. Les captures proviennent du moteur WebGL. Aucune cadence FPS ni qualité sur iPhone/Quest physique n’est revendiquée sans test matériel.


Résultats : **495 tests automatisés réussis**, puis vérifications ciblées réussies après les retouches de contact. Sur M01 WebGL, formats 960×600 et 390×844 : carte 1024² active, 314 objets autorisés à projeter et 436 à recevoir, aucun ennemi à l’arrivée, aucune erreur JavaScript. Après retrait des anciennes projections de sol, nouvelle capture ordinateur validée. Sur M02 et l’arène : carte 1024² et suivi de la fenêtre jusqu’à X=35/Z=-40/+4,8 m vérifiés. Sur AT HOME : création du contrôleur et budget Quest vérifiés sans session XR physique.

[Captures de la 3.63.11](https://pink-war.vercel.app/ombres-36311.html).
