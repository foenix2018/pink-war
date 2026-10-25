# Version 3.63.1 — Infanterie mécanique de Vesper

## Base conservée

Le point de départ est la **3.63**, commit `13f8470dca2d825edf4a24b4008462c9db204ade`, de `claude/pink-war-amelioration`, également identifié sur la production Vercel au début de ce travail. La branche `main` ne contenait alors que la 3.62. Les 447 tests de cette base ont été exécutés avec succès avant la passe graphique.

Le bouclier de 60 points, sa recharge, la frappe de mêlée, la charge à impulsion, les commandes, les retours directionnels et l’interface commune de la 3.63 restent en place. Les modèles Shadow Unit de GHJU/LYLU, les gants RLH et leurs armes ne sont pas modifiés. La feuille de route 3.64 « Néons de M02 » garde sa place ; cette livraison est un correctif sur la base 3.63.

## Lecture de l’affiche

L’affiche « Sous les Néons » suggère deux familles : des silhouettes bipèdes militaires avec casque fermé, épaules protégées, taille articulée et arme compacte ; une plateforme basse à canon visible sur une passerelle. Son éclairage montre surtout une masse graphite, de petits capteurs et des reflets de métal usé. Les robots étant petits dans l’image, elle fixe une direction de silhouette et de matière, sans constituer un modèle 3D détaillé.

Cette passe porte sur **l’infanterie bipède** et la finition commune des machines. La plateforme à pattes et canon demeure une piste distincte ; le Rampant conserve ses six pattes et son rôle du book. Aucun nouvel ennemi de type boss ni événement narratif n’est ajouté.

## Changements en jeu

- Peinture graphite patinée, rugosité et traces d’abrasion partagées par les châssis ; métal des articulations distinct de la coque. La coque claire caractéristique du N-08 est conservée.
- Casque clos plus compact, cuirasse redessinée, plaques abdominales superposées, protections de hanches rapprochées, cuisses et pieds moins renflés. Les mains mécaniques comportent quatre doigts et un pouce.
- Les Poursuivants, Sentinelles et Traqueurs équipés pour le tir portent maintenant un fusil compact avec crosse, poignée, garde-main et canon raccordés. Les canons lourds intégrés des Brutes et Remparts restent distincts.
- Les deux mains suivent les poignées par une chaîne cinématique à deux segments, y compris à la visée, en marche, en recul et accroupi. Les épaulières de cette infanterie sont portées par le thorax pour éviter qu’elles se retournent avec le bras.
- L’implantation du canon est partagée par le modèle et l’émission physique des projectiles, avec l’inclinaison, l’orientation et l’accroupissement. La petite oscillation du corps reste visuelle.
- L’arme est abaissée en patrouille et relevée après détection. Les optiques bleues deviennent rouges suivant la perception existante ; les comportements de couvert, repli et évitement des charges de la 3.63 sont conservés.
- M02 conserve cinq ennemis ; son Poursuivant porte désormais le même fusil fonctionnel que celui présenté dans l’atelier.

L’atelier `ennemis.html` ouvre sur le Poursuivant et propose tous les châssis existants. Sa lumière devient neutre, avec une ombre de contact, pour examiner le graphite sans la dominante rose de l’ancien studio.

## Image d’accueil proposée

Une nouvelle illustration a été produite séparément : **GHJU à l’entrée couverte d’une galerie, face à une courte rue surveillée**. Elle reprend le principe du fond de M01 : héroïne à droite, espace sombre à gauche pour les textes HTML, un seul instant d’arrivée. Elle ne contient ni titre incrusté, ni résumé, ni barre de chargement.

Le PNG est livré à part dans `/workspace/livraison/Pink_Wars_Accueil_Niveau_2_Proposition.png`. **Il n’est ni intégré aux menus, ni ajouté aux fichiers du jeu déployé.** Source de génération conservée dans `/workspace/generated_images/exec-61fed03c-7c3f-4f3d-9676-b8a8dac526cd.png`. L’illustration ne remplace aucun modèle de personnage.

## Vérifications et budget

- **451 tests automatisés réussis** : les 447 de la base et quatre nouveaux contrôles de pose, d’émission, de perception et de budget.
- Les deux poignets restent sur leurs cibles pendant 450 poses animées ; les origines de tir sont comparées au canon rendu sur 60 configurations de châssis, élite, inclinaison et accroupissement.
- Au plus six lots de rendu par robot ; moins de 11 000 triangles, y compris les élites. Deux petites cartes de matière de 256 px partagées ; aucune lumière dynamique ni requête de texture supplémentaire par ennemi.
- Atelier : vues avant/après de face et de profil pour Poursuivant, Sentinelle et Rempart, sans erreur JavaScript.
- M02 ordinateur et iPhone émulé : cinq adversaires visibles avec les nouveaux modèles, six profils PBR chargés, tir du M12, charge lancée puis déclenchée, mêlée, pause et reprise. Un dégât de 17 est absorbé par le bouclier (60 → 43), la santé reste à 100.

Rapports et captures : `/workspace/livraison/captures_363_1/`. Les essais navigateur utilisent Chromium et un rendu logiciel ; aucune mesure sur Quest 3 ou iPhone physiques n’a été faite dans cette livraison.
