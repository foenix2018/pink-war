# Pink Wars 3.60 — Reprise VR et rechargement automatique

## Reprendre la campagne dans le casque

La pause immersive ne crée plus de fenêtre HTML modale cachée : elle conserve son état et utilise uniquement le panneau 3D Fracture. Les fenêtres HTML et leur navigation restent disponibles sur écran et après une sortie du casque.

« Reprendre » appelle une reprise explicite, sans basculer une seconde fois la mission en pause. M01 rétablit son état de simulation même si aucun dialogue HTML n’était ouvert. Dans la scène WebXR commune, la sélection de « Reprendre » et un appui X simultané ne peuvent plus provoquer deux bascules contradictoires.

La gâchette de sélection est consommée pendant la transition. Elle ne peut ni tirer ni ouvrir le menu de Gaby/Cara tant qu’elle n’a pas été relâchée. La position, la santé, les munitions et la progression de la partie sont conservées. Le retour à l’accueil et la sortie de session restent disponibles.

## Recharger sans nouvelle pression

La simulation déclenche le rechargement dès qu’une arme à feu est vide, même après relâchement de la gâchette. Cela concerne GHJU, LYLU et les armes récupérées en Histoire, Arène, stand de tir et AT HOME.

Pour le double R9 de GHJU, un seul pistolet vidé suffit à déclencher le rechargement commun des deux chargeurs. Les durées existantes sont conservées, notamment 1,65 seconde pour le double R9 et 2,8 secondes pour le M12 de LYLU. La pause gèle le délai de recharge ; la reprise le poursuit. Un seul événement de début et de fin est émis, avec les sons et animations existants. Le rechargement manuel reste disponible et le sabre est exclu de ce système.

## Vérifications

La suite complète compte **424 tests réussis, aucun échec**. Les contrôles ciblés de reprise VR ont également été relancés après la protection contre l’appui simultané.

Les nouveaux tests couvrent les deux personnages en Arène, campagne et AT HOME, le relâchement après la dernière balle, le pistolet droit vidé avec des balles restant à gauche, les armes récupérées, le gel de la recharge et le sabre. Les tests VR contrôlent la sélection de la première ligne « Reprendre », l’appui X simultané, la conservation de la partie et l’interdiction des tirs ou compétences pendant le maintien de la gâchette.

Essai navigateur M01 : entrée par le bouton VR, deux cycles complets pause → sélection 3D de Reprendre → progression du temps, sans fenêtre HTML modale dans le casque. Santé et munitions restent intactes ; un nouveau tir fonctionne après relâchement. Le pistolet droit de GHJU se vide, recharge automatiquement puis retrouve 12 + 12 balles ; la sortie du casque et le retour à l’accueil fonctionnent ensuite. Rapports dans `/workspace/livraison/captures_360/`.

Les essais utilisent Chromium et une session XR simulée avec les modèles et la simulation du jeu. Aucun essai matériel Quest 3 n’a été réalisé pendant cette livraison. Les modèles, cartes, armures, lore et menus Fracture de la 3.59 sont conservés.
