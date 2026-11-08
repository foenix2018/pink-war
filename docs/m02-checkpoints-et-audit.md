# Niveau 2 — sauvegardes et audit 3.76.0

Le niveau 2 sauvegarde automatiquement les étapes sécurisées pour chaque personnage sur le navigateur utilisé. L’accueil propose **Continuer le chapitre 02** lorsqu’une sauvegarde existe. La pause propose **Revenir au point de contrôle** et **Recommencer le niveau 2** ; après une défaite, le bouton principal reprend le point de contrôle. Recommencer explicitement remplace la progression de ce personnage.

Les points couvrent le monte-charge, le dispensaire, la radio, les combats de l’enclave, la grille, les quatre étapes de la rue, la tour, le badge, le coffre, le quai et le choix final. Une reprise garde les armes autorisées du personnage, les munitions (dont les deux chargeurs DUO), la santé, le bouclier replié, les grenades, les documents, les actions accomplies et les provisions déjà collectées. Un combat enregistré avant son déploiement reprend avec ses ennemis ; un combat terminé ne les recrée pas. Une manœuvre interrompue reprend au début de sa séquence, sans enregistrer une situation partiellement verrouillée.

La sauvegarde est refusée pendant une chute, sur un ascenseur mobile, pendant une manœuvre ou avec des renforts en attente. Les anciennes sauvegardes sont migrées à la lecture ; un fichier invalide est ignoré sans bloquer le lancement. Un refus de stockage laisse le niveau jouable et signale le problème dans la pause. Les sauvegardes sont locales : elles ne sont pas synchronisées entre appareils.

## Incohérences corrigées

- Le choix du sol au démarrage et à la reprise sélectionnait la surface la plus haute. Dans la scène de production, le personnage apparaissait à **3,30 m sur le toit du monte-charge**, hors du passage prévu. Le choix est maintenant borné par la hauteur du point de contrôle : sol intérieur à 0 m, passerelle à 12 m.
- La portion de rue était toujours sauvegardée sous une seule étape `x-rue`. La reprise recommençait les objectifs précédents. Le contrôleur conserve maintenant chacune des quatre étapes, avec le bon sol et l’état de la patrouille.
- Le bouton principal après une défaite recommençait le niveau tandis qu’un second bouton proposait la reprise. La reprise est désormais l’action principale ; recommencer est explicite.
- L’état visuel des commandes restait activé après une nouvelle partie. Les appareils sont remis à zéro, puis leurs états sauvegardés sont réappliqués. Une batterie raccordée dans une nouvelle sauvegarde reste raccordée.
- Des interactions utilisaient seulement une distance horizontale et pouvaient traverser une cloison. Les murs et les portes fermées bloquent désormais ces actions. Le lecteur de badge est décalé hors du coin encombré par une jardinière.
- Le choix final effaçait la sauvegarde avant d’être présenté. Son point de contrôle est maintenant conservé jusqu’à la décision. La porte du convoi est rouverte à cette reprise. Une session Quest se termine avant les écrans de défaite et de choix afin que leurs boutons HTML soient accessibles.
- Les provisions collectées ne réapparaissent plus au simple changement de secteur. Les chargeurs asymétriques DUO sont restaurés séparément.
- Un ennemi configuré en Synth pouvait hériter du bouclier d’un profil aléatoire du générateur. Le profil est resynchronisé après configuration ; les bulles restent réservées aux types prévus.
- La distance de guidage correspond maintenant au prochain passage indiqué, au lieu d’afficher une distance directe trompeuse à travers une cloison ou sous une passerelle.

## Vérification

Le parcours navigateur utilise la scène de production, les collisions et les commandes de progression : monte-charge → dispensaire → batteries/radio → grille → civils → terminal de rue → escalier est et passerelle → escalier ouest → tour → badge/lecteur → coffre → quai → choix final. Il comporte **3 596 pas de simulation et 45 arrêts**, sans téléportation entre ses segments. Les ennemis sont neutralisés par dégâts simulés. La préparation GPU et le premier rendu sont omis dans ce banc de logique ; ce parcours ne constitue pas une mesure de performances graphiques.

Les **1 154 volumes physiques et 294 surfaces** extraits de la scène servent aussi à vérifier 18 montées d’escaliers (20/30/60 Hz, marche/course), 16 positions de reprise après stabilisation et les rayons des portes fermées.

Les tests ciblés couvrent la campagne M02, les anciennes sauvegardes, le guidage, les portails, les collisions, les ressources, le bouclier et les commandes Quest. Les contrôles navigateur vérifient également le rechargement de la page, la reprise depuis la pause et après une défaite, le redémarrage explicite et la décision finale. Les rapports sont conservés dans `/workspace/livraison/M02_*`.

Le gameplay du niveau 3 n’a pas été modifié pendant cet audit. La sortie du niveau 2 conserve son lien vers ce chapitre avec le personnage sélectionné. Aucun casque physique n’a été utilisé.
