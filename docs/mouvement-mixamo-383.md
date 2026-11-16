# Pink Wars 3.83 — animations Mixamo des personnages

Les corrections 3.82 avaient conservé un générateur de pas et des torsions supplémentaires du bassin. Il est retiré. Les déplacements des personnages utilisent désormais les véritables pistes d'animation Mixamo des hanches, cuisses, tibias, pieds et orteils, avec le torse, la tête et les bras. Les modèles, équipements et squelettes de rendu GHJU/LYLU sont conservés.

## Sources importées

Les fichiers FBX Mixamo proviennent des archives publiques suivantes, téléchargées à une révision précise :

- [webaverse/app](https://github.com/webaverse/app/tree/561630539fe2055c117309c3d24c2cfc4d6763d5/public/animations) : `walking`, `walking backwards`, `running`, `running backwards`, `left/right strafe`, `Crouch Idle`, `Sneaking Forward`, `Crouched Sneaking Left/Right`.
- [akhilm2223/valor](https://github.com/akhilm2223/valor/tree/45587d200be528829420dccffcba24c1170452f4/public/animations) : marche avec fusil (`walking.fbx`) et pas latéral armé (`strafe_right.fbx`).

L'auteur des mouvements est **Adobe Mixamo**. Leur utilisation dans les jeux suit les [conditions Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html). Les sources brutes ne sont pas livrées sous forme de pack FBX ; le jeu contient ses pistes adaptées. Les révisions, chemins, empreintes SHA-256 et identifiants Git des fichiers sont dans `dist/assets/motion/mixamo-sources.json`.

Quatorze clips sont adaptés : marche normale et armée, recul, deux pas latéraux, course dans les quatre directions, repos accroupi et déplacements accroupis. Les pas latéraux de marche utilisent une prise armée et sa version en miroir, avec permutation gauche/droite des articulations. Cela conserve une cadence symétrique et évite les grands pas croisés de la marche latérale libre. Leur sens est vérifié sur le déplacement mesuré de la racine, indépendamment du nom du fichier. Le recul accroupi utilise le cycle enregistré `Sneaking Forward` lu à l'envers ; ce n'est pas une prise arrière distincte. Les poses de repos natives existantes restent disponibles. L'ancienne bibliothèque Quaternius n'est plus importée par les personnages.

Construction reproductible :

```sh
node tools/build-mixamo-player.mjs /chemin/vers/les/FBX /chemin/vers/RLH/js/vendor
```

Le convertisseur utilise les axes anatomiques et les repères des deux squelettes. Il tient compte de la différence entre la pose de repos du modèle habillé et la pose en T des FBX. Les rotations de 22 articulations principales et les positions des hanches sont échantillonnées à 60 Hz. Le déplacement horizontal linéaire de la racine est retiré ; les déplacements enregistrés du bassin à l'intérieur du cycle sont conservés. Les données adaptées compressées pèsent environ 341 Ko, soit 454 Ko pour le module JavaScript encodé.

## Lecture dans le jeu

La direction et la vitesse réelles choisissent et mélangent les clips. Leur cadence vient de la distance enregistrée dans le FBX et de la taille du personnage. Les prises contenant deux cycles de marche gardent leur cadence réelle. La marche armée lente laisse place à la marche normale lorsque la vitesse demanderait de l'accélérer excessivement. Les transitions passent par le mélangeur d'animations, sans créer de trajectoire de jambe.

Avec une arme à une main, le bras libre utilise les pistes de bras des prises de repos, de marche et de course. Il ne garde ainsi pas la pose de la main qui tenait le fusil du mannequin source. Les armes à deux mains conservent leurs prises par la cinématique inverse existante.

Sur sol plat pendant les déplacements, les rotations des jambes sont exactement celles des clips mélangés. Aucun solveur ne redessine leurs mouvements horizontaux et aucune torsion supplémentaire du bassin n'est appliquée. L'ajustement vertical du corps utilise les vrais volumes des bottes. La course garde des phases de suspension déterminées par ses poses enregistrées. Au repos et sur les reliefs, une correction de hauteur utilise le plan du genou enregistré ; elle ne planifie pas des pas latéraux.

Les lois de déplacement, vitesses physiques, collisions et tirs sont celles de la 3.82.1. Les contrôleurs Quest gardent leurs poses suivies et leurs prises d'armes.

La couche de saut conserve la trajectoire physique du jeu. Sa réception mélange explicitement la pose aérienne capturée vers la marche enregistrée, puis relâche les rotations des jambes progressivement. Les interpolations de quaternions utilisent des copies des destinations : utiliser le quaternion récepteur comme destination écrasait la pose avant le mélange et provoquait une reprise brusque. Les tests de saut conservent leurs limites de vitesse de cheville et de rotation des genoux.

## Contrôles

Les nouvelles régressions comparent les positions horizontales des pieds et du bassin à un mélangeur indépendant qui joue les pistes importées. Elles comparent aussi directement les rotations des cuisses, tibias et pieds pendant la marche sur sol plat, pour les deux personnages à 30, 60 et 120 Hz. Une marche strictement avant n'active aucun clip latéral.

Les anciens tests qui imposaient un écart constant en X entre les pieds, l'immobilité de chaque sommet de la botte pendant tout l'appui et un bassin de hauteur constante décrivaient le générateur retiré. Les mouvements enregistrés peuvent croiser les pieds en profondeur et rouler du talon vers la pointe. Les contrôles portent désormais sur la séparation en 3D, la fidélité aux pistes, le contact des vrais volumes des bottes et leur absence de pénétration, y compris sur rampes et ascenseurs. Les autres contrôles couvrent les sauts, les neuf prises d'armes, le suivi Quest et les règles physiques du jeu.

Validation : **106 contrôles distincts passants** — 57 pour les personnages, mouvements importés, bottes, sauts et terrain ; 48 pour la physique, le combat complet jusqu'à 670 éliminations et l'alignement Quest ; un contrôle d'intégration des clips armés sur deux instances indépendantes. Après l'adaptation du bras libre aux armes à une main, les 16 contrôles des sauts et de fidélité aux pistes, ainsi que les prises des neuf armes et l'intégration du clip armé, ont été repassés avec succès. Les scripts modifiés, la provenance et les règles de revalidation du déploiement ont aussi été vérifiés.
