# 3.63.13 — Stand de tir industriel

Base : `main` / 0b35bd6, version 3.63.12, contrôlée sur le dépôt GitHub et le domaine de production avant intervention.

## Bâtiment et matériaux

- Palette du stand : béton gris, acier usé, absorbants acoustiques olive/gris, balisage ambre. Suppression du cumul des éclairages bleus de l’arène dans le stand.
- Réemploi des cartes locales déjà créditées : `concrete_floor` (normales et rugosité Poly Haven CC0), `rusty_painted_metal` (Poly Haven CC0), ainsi que les variantes originales `vesper-concrete` et `vesper-steel` déjà décrites dans `assets/cc0/sources.json`.
- Chargement des cartes au premier accès au stand seulement : 7 cartes sur le profil compatible/mobile, 10 avec normales sur le profil complet. Aucun service externe supplémentaire.
- Parois latérales fermées jusqu’au toit ; poutres avec semelles en I, conduites cylindriques, colliers et suspentes de ventilation.
- Blanc chaud, lumière indirecte du plafond, trois éclairages de travée sans carte d’ombre supplémentaire. Conservation de la carte d’ombre principale mobile et du budget déjà adopté pour les téléphones/casques.

## Commande depuis le box

Un vrai boîtier se trouve à droite de chacun des cinq postes. Son bouton est ambré au repos et vert pendant l’exercice. Au début, aucune cible n’est présentée et le chronomètre d’exercice reste arrêté.

- Ordinateur : se tenir près du boîtier et appuyer sur **F**.
- iPhone : toucher l’action contextuelle **Déclencher les cibles**.
- Manette : action d’interaction existante.
- Quest : clic du stick de la main libre, gauche avec l’arme à droite ; l’action s’affiche aussi dans le pied du HUD.

Une seconde activation arrête les cibles et annule les impacts en attente. Le temps de progression est conservé et ne tourne plus pendant l’arrêt. Le bouton doit être proche et accessible : on ne commande pas celui d’un poste voisin à travers un séparateur.

## Cibles et impacts

Les anciens disques multicolores sont remplacés par des silhouettes de torse et tête en acier, extrudées et biseautées. Le contour qui sert au tir est le même que celui du modèle : un tir dans le vide à côté du cou ne compte pas.

Les plaques se relèvent sur une charnière en 0,45 seconde, sans grandir artificiellement. Le score n’est attribué qu’après leur déploiement et à l’arrivée effective du projectile. Un impact immobilise le chariot à l’instant de contact puis fait basculer la plaque. L’impulsion dépend de l’arme : M12 et armes lourdes produisent une réaction plus forte que R9 et BLOOM. Un impact excentré ajoute une petite torsion amortie.

Les contacts des plombs M12 qui atteignent réellement la plaque produisent des marques distinctes. Tous les plombs ne touchent donc pas obligatoirement la silhouette à 15 mètres. Les marques suivent la plaque pendant son basculement ; aucun décalque ne reste suspendu après son retrait. Les cibles mobiles possèdent un rail de chariot, aligné sur leur course latérale ou en profondeur.

Le son métallique enregistré déjà intégré est maintenant joué lors d’un impact de cible, avec atténuation par la distance et position stéréo. Le son de score électronique n’écrase plus ce retour matériel.

## Comportement des armes

Au stand sur écran, légère respiration et instabilité pendant le déplacement réel ; épauler et s’accroupir réduisent ce mouvement. Le recul est plus lisible, avec une légère hausse sous tir soutenu, puis revient naturellement par les ressorts déjà utilisés par le jeu.

Le point sous le réticule peut être une surface de cible, comme c’est déjà le cas pour un mur : le départ au canon converge sur cette surface et corrige la parallaxe à courte distance. Une cible hors de ce rayon visuel ne modifie pas la direction. La visée suivie des contrôleurs VR et les mouvements du casque ne sont pas artificiellement déplacés.

Conservation des chargeurs, du rechargement automatique, des animations de pompe et de mains et des sons d’armes 3.63.12. Les compteurs santé et munitions restent visibles, y compris au stand en VR.

## Périmètre et vérification

Cette livraison ne change ni le level design des missions, ni les modèles approuvés GHJU/LYLU, ni les dégâts des armes ou des ennemis, ni le lore. La musique reste limitée aux menus et chargements.

Vérifications : suite Node complète, contrôles dédiés des interrupteurs/chronomètres, contours et délais de contact, dispersion M12, obstacles, textures différées et libération des ressources. Parcours navigateur Chromium/WebGL aux formats 1280 × 800 et 390 × 844 : entrée au stand depuis l’accueil, attente sans cible, activation clavier/tactile, tir, score et arrêt. Captures et traces locales sous `/workspace/livraison/validation_363_13/`.

Ces vérifications ne remplacent pas un essai physique sur iPhone ou Quest ; les sensations de tenue et le confort doivent encore être évalués dans le casque.
