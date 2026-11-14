# Pink Wars 3.82 — mouvements des héros

Le personnage marchait à 7 m/s et sprintait à 10 m/s. Les déplacements au stick et au clavier utilisent maintenant une marche de 2,2 m/s, un sprint de 4,8 m/s et un déplacement accroupi de 1,1 m/s. Les pas latéraux utilisent 90 % de la vitesse frontale et le recul 75 %. L'accélération et le freinage restent intégrés analytiquement, avec une montée en vitesse plus progressive. La forêt utilise les mêmes vitesses. Les pas sonores suivent ces nouvelles distances.

## Animations récupérées

Source : **Quaternius, Universal Animation Library, Standard**, licence **CC0 1.0**, miroir [J-Ponzo/gltf-universal-animation-library](https://github.com/J-Ponzo/gltf-universal-animation-library), commit `e24c23cf2a1323488a3faa226ea7ea21f644b73e`.

Le rig glTF et ses animations sont téléchargés depuis ce dépôt. Les cycles `Idle_Loop`, `Walk_Loop` et `Jog_Fwd_Loop` sont échantillonnés et adaptés aux axes des os du squelette des héros. Le transfert repose sur les axes anatomiques des articulations ; un simple delta de pose de repos laissait les bras trop ouverts. Le script reproductible est :

```sh
node tools/build-hero-motion.mjs /chemin/vers/gltf-universal-animation-library
```

Les 22 articulations principales sont converties dans le fichier de mouvements. À l'exécution, les mouvements Quaternius animent le torse, la tête et les bras ; le bassin et les jambes conservent les pistes Mixamo existantes, calibrées avec les vrais appuis des bottes. La marche en visée conserve également les pistes de bras originales pour garder les prises des armes. Cette combinaison n'applique aucun déplacement de racine aux coordonnées physiques du joueur.

Les modèles GHJU/LYLU, leurs proportions, leur équipement et leur squelette de rendu sont conservés. La bibliothèque importée ne remplace pas le personnage par son mannequin de démonstration. La pose neutre utilisée pour ajuster l'armure et mesurer les semelles reste celle du modèle canonique. Les ennemis gardent leurs animations propres.

La licence et les empreintes des sources sont conservées dans `dist/assets/motion/`. Le fichier de mouvements ajouté pèse environ 340 Ko avant compression HTTP.

## Appuis et réception

- La foulée de course s'allonge avec la distance réellement parcourue, pour réduire la cadence excessive au sprint. Les pieds restent ancrés pendant l'appui.
- Une petite réserve d'extension maintient les genoux fléchis et évite les singularités près d'une jambe entièrement tendue.
- Après un saut, l'ancienne limite « allonge au contact + 10 cm » pouvait conserver une compression du bassin jusqu'à la fin de la réception, puis la supprimer brutalement. L'allonge revient maintenant progressivement vers sa valeur anatomique complète.
- La réception utilise le même plan de flexion que la marche. Les animations n'ajoutent aucun balancement artificiel à la tête ou aux contrôleurs XR.

## Vérifications

**78 tests passants** : marche avant/arrière/latérale à 30, 60 et 120 Hz ; séparation des pieds ; stabilité des vrais sommets des bottes pendant l'appui ; rampes et ascenseurs ; décollage, réception et double saut ; pause ; prises des neuf armes ; alignement des armes et contrôleurs Quest ; accélération, collisions et règles de combat.

Trois contrôles supplémentaires vérifient la provenance et les rotations réelles du pack, la conservation exacte des pistes natives de jambes/bassin et l'intégration des nouvelles vitesses à plusieurs cadences. Les durées des tests d'escaliers et d'ascenseur ont été ajustées à la marche plus lente, sans retirer les assertions de passage, de chute ou d'appui.

Les parcours M03 complets de GHJU et LYLU et les contrôles de collisions ont aussi été exécutés avec les nouvelles vitesses. Un banc de contrôle dans Chromium rend 120 images du personnage canonique (repos, marche, sprint), assemblées dans une vidéo de quatre secondes. Il s'agit d'une démonstration d'animation sur place, pas d'un enregistrement de combat. Les vérifications utilisent SwiftShader ; aucune cadence matérielle iPhone/Quest n'est déduite de ces essais.
