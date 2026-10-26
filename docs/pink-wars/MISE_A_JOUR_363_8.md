# 3.63.8 — Ouverture de M02 et propositions M01

26 octobre 2026, base 3.63.7 / `322eacb`.

## Livré

Nouvelle illustration originale d’ouverture de **Sous les Néons** : ruelle humide des Bas-Niveaux, empilement résidentiel, galerie marchande, dispensaire ambre, postes HELIX, passerelles et tour de transit. Direction issue de W02/M02 du Tome II et des plans 02A–02C du storyboard. Aucun nouveau modèle de GHJU/LYLU n’est introduit par cette illustration ; il s’agit d’un fond d’ambiance, pas d’une capture du moteur 3D.

`dist/art/mission02-cover.webp` : **1672 × 941**, environ **231 Kio**. L’original PNG est conservé dans l’espace de génération ; le jeu ne charge que le WebP. Provenance et empreinte dans `mission02-cover.json`. Aucun texte intégré au dessin : titre et progression restent lisibles, traduisibles et séparés dans le HTML.

L’image remplace le précédent SVG à la sélection de M02 dans l’accueil, au chargement du scénario et sur la page d’entrée manuelle/récupération du niveau. Contraste et position de cadrage sont adaptés à cette image. En portrait étroit, le retour à l’accueil est placé sous la marque pour éviter leur chevauchement. Les musiques restent réservées aux menus et chargements selon 3.63.7.

## Proposé, pas encore livré

[Propositions M01 du 26 octobre](PROPOSITIONS_M01_26_OCTOBRE.md) : trois directions, diagnostic du code et parcours recommandé de vingt-cinq minutes. Aucun agrandissement M01 ni changement de combat dans cette publication. Prochaine étape recommandée : boutique, atelier et arrière-cour.

## Vérifié

Huit tests ciblés passent : image M02 sélectionnée, retour aux illustrations M01, chargement et récupération, musique menu uniquement. Essais Chromium en 1440 × 900 et 390 × 844 : WebP décodé, bon titre, pas de débordement ni d’erreur JavaScript ; fin du masque de chargement fonctionnelle. Inspection des captures ordinateur et mobile. Pas de modification de simulation ou de modèles, ni de mesure de performance sur appareil physique dans cette livraison.
