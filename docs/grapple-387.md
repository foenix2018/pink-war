# Grappin de l’avant-bras gauche — 3.87.0

Le grappin permet de viser une paroi jusqu’à 20 mètres, de lancer une ancre à
trois griffes, de se hisser et de rester accroché. Un second appui décroche le
câble. Saut décroche avec une impulsion vers le haut et vers l’extérieur près
du mur ; pendant la traction, il conserve l’élan. La gravité est allégée pendant
0,65 seconde puis la chute normale reprend. Réarmement : 0,8 seconde.

## Commandes

- iPhone et ordinateur : bouton crochet dédié, au-dessus du bouclier.
- Clavier : **T** pour lancer/décrocher ; saut existant pour l’impulsion.
- Manette standard : croix directionnelle **gauche** ; bouton de saut existant.
- Quest : bouton **GRAPPIN** près du bouton bouclier au poignet gauche. Viser
  la paroi avec la main gauche, sélectionner le bouton avec la main droite.
  La gâchette de sélection reste capturée par le bouton, sans tirer une arme.

La portée est mesurée en 3D. La première surface solide arrête le tir ; un
plafond ne permet pas de viser à travers. Le déplacement vérifie le volume du
joueur contre les murs, plafonds et sols. Une porte qui coupe le câble, une
paroi déplacée/supprimée, une mort ou un déplacement de point de contrôle
annulent l’attache. Les ennemis ne sont pas des points d’ancrage.

Le treuil est un modèle 3D avec coque chanfreinée, tambour, motorisation, guides,
colliers de fixation et ancre rétractée. Le câble utilise deux lots fixes de 12 segments,
compatibles WebGPU et WebGL. La main gauche libère son arme/support pendant
l’usage ; le pistolet droit continue de tirer. Le bouclier et le grappin
partagent le bras gauche et se replient mutuellement. Aucun réglage de vitesse
de marche, de course ou de caméra n’a été modifié.

Le système commun couvre les niveaux de combat, l’arène et le stand. Le
prototype d’exploration de la forêt conserve son contrôleur indépendant.

## Vérification

Les tests du grappin couvrent portée exacte de 20 m, attente du projectile,
traction en hauteur, maintien, saut, retour au sol, obstacles, plafonds,
annulation, déplacement de checkpoint et fréquences 30/60/120 Hz. La glissade, le mini-jetpack, la GROZA–40 et les autres mises à jour du dépôt
sont conservés ; leurs tests passent avec le grappin. Les contrôles
de déplacement tactile, de bouclier, des armes et du VOLTIS IEM passent.
Le test historique `desktop-input.test.mjs` conserve un échec de seuil de
distance déjà présent sur le commit précédent ; la reproduction avant/après
confirme qu’il est indépendant de cette modification.

Le navigateur vérifie clavier, bouton tactile, maintien, impulsion, tir manqué,
pause et capture de la gâchette du bouton Quest (`tools/verify-grapple.mjs`).
Le niveau 3 complet est vérifié avec interface iPhone émulée : attache réelle à
6 m de hauteur, joueur hissé à 4,7 m, bras gauche libéré, passage en troisième
personne et impulsion via le bouton Saut, sans erreur JavaScript.
Le rendu natif WebGPU est compilé et lu sur GPU avec le câble actif (25 appels,
53 432 triangles dans la scène de vérification). Aucun casque physique ni
iPhone matériel n’est attaché ; le geste Quest est vérifié sur le contrôle 3D.


## Mise à jour 3.88

Sur PC, le clic droit lance ou décroche désormais le grappin. T reste un raccourci secondaire. Le bouton d’atelier du compagnon permet aussi de découvrir et assembler le microtreuil renforcé : traction +10 % par rang, jusqu’à deux rangs, sans dépasser 20 m. Voir [l’atelier nano](nanoforge-388.md).
