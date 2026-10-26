# 3.63.10 — Toitures, arrivée calme et tirs enregistrés

26 octobre 2026. Suite de l’atelier livré en 3.63.9, à la demande du créateur.

## Toits et plafonds

L’atelier dispose désormais d’une toiture continue : la fermeture est ajoutée sur sa partie est encore ouverte. Le laboratoire reçoit une toiture pleine au-dessus des anciens fragments. Le triage et la boutique gardent leurs dalles supérieures existantes. Les cinq intérieurs — atelier, triage, boutique, raccord technique et laboratoire — reçoivent des ossatures de faux plafond, dalles vieillies, poutres en I, suspentes, tuyaux avec manchons et conduits de ventilation. Une bande technique ouverte permet de voir les réseaux, sous le toit fermé.

Les toitures ajoutées et leurs obstacles sont définis dans `m01-ceiling-layout.js`, partagé entre moteur physique et rendu. Les accessoires sont assemblés par matériaux, sans lumière dynamique supplémentaire ; ils complètent le maillage Blender 3.63.9 existant. La cour de livraison reste un espace extérieur.

## Départ de M01

Aucun robot n’est présent à l’apparition. Rester immobile, attendre ou ouvrir une pause ne lance pas la patrouille. La première activation se fait en quittant la zone calme, à dix mètres du départ, et seulement si les positions initiales restent à douze mètres au moins du joueur. Les trois postes les plus proches sont déplacés vers le secteur suivant. Le circuit d’isolation reste un déclencheur de secours cohérent si une sauvegarde ou une future route y mène directement.

Le groupe reste limité à huit machines, sans duplication lors d’un remplacement des obstacles. Les sauvegardes après sécurisation gardent le groupe accompli. Budget de mission inchangé : trente-deux robots finis ; parcours canonique vers les Archives végétales conservé. La règle d’arrivée calme concerne M01 ; le rythme des vagues d’arène et AT HOME reste distinct.

## Tirs

Quatre transitoires supplémentaires proviennent de **The Free Firearm Sound Library**, CC0, par Ben Jaszczak, Brian Nelson, Kevin Heras et Matthew Nanney. Déclarations de licence recoupées sur OpenGameArt et dans le registre individuel du miroir OpenSpades. Les fichiers shotgun non CC0 du miroir ne sont pas repris.

Les enregistrements servent de corps aux armes fictives : R9/DUO, BLOOM, LANCE, THORN, NOVA ; le M12 conserve son enregistrement de fusil à pompe. La couche laser est abaissée lorsqu’un corps enregistré est disponible, pour conserver la signature futuriste sans couvrir le claquement mécanique.

Les vrais événements `enemy-shot` déclenchent enfin un son dans M01, M02, l’arène et AT HOME. Émetteurs légers, sondes et unités lourdes ont des hauteurs et timbres différenciés. Panoramique selon l’orientation du joueur, atténuation par distance, filtrage et réduction derrière les obstacles. Les tirs manqués restent audibles. Les sons utilisent le bus d’effets existant et respectent la coupure audio. Voix plafonnées, sources déconnectées à la fin.

Neuf fichiers de combat, 180 Kio, PCM mono 32 kHz pour lecture locale sur les navigateurs ciblés. Pas de téléchargement auprès d’une banque au moment du tir. Licences, URL et empreintes conservées dans `dist/audio/combat/manifest.json` et `CREDITS.md`. Les musiques restent réservées aux menus/chargements.

## Vérification

Tests physiques de fermeture des cinq intérieurs ; budget des accessoires ; arrivée immobile et après pause/rejeu ; activation distante unique ; sons enregistrés de chaque arme ; panoramique, atténuation, obstacle, sourdine et libération des sources. Les tests hérités exigeant huit robots au démarrage sont adaptés à la nouvelle demande.

Le contrôle en navigateur porte sur l’arrivée sans ennemi, le chargement des WAV locaux, le tir/rechargement, la reprise de pause et les captures des plafonds. Les captures proviennent du moteur réel. La qualité perçue des sons et le confort restent à écouter/tester sur iPhone et Quest physiques.


Résultats : suite complète de 491 cas, puis correction et réussite des fichiers de tests qui exigeaient encore huit robots au démarrage ; contrôles ciblés finaux des plafonds et de l’audio réussis. Rendu ordinateur et format mobile sans erreur JavaScript ni échec de téléchargement audio ; R9 et M12 enregistrés réellement déclenchés, puis son de tir d’un robot déclenché par la simulation et lu par Web Audio. La dernière passe de captures montre la bande technique ouverte.

[Aperçu des plafonds et écoute des armes](https://pink-war.vercel.app/atelier-et-sons-36310.html).
