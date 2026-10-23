# 3.50 — M01 de référence, matière et continuité du récit

Cette livraison remet **Le Dernier Signal** sur la carte de référence de la bible, sans remplacer les modèles réels Shadow Unit de GHJU et LYLU. Elle enrichit cette première mission ; elle ne constitue pas la production des vingt missions du book.

## M01 et level design

- Le lancement écran conserve son interface tactile/manette, mais utilise désormais `CampaignLevel1`, `LEVEL1_MAP` et les géométries Blender originales de `Vesper Secours 07`. La géométrie de la visite V7 n'est plus substituée à celle de M01. La visite indépendante reste accessible avec `?visit=1`.
- Huit immeubles aux fenêtres et intérieurs ouverts, six véhicules et quatre ensembles narratifs : poste de secours, évacuation, boutique hors réseau, surveillance ORDRE.
- Parcours annexe → boutique de briques à l'ouest → carrefour → terrasse. Les sols, collisions, tirs et déplacements utilisent la même simulation que la campagne WebXR classique.
- L'escalier rejoint réellement la terrasse à **4,8 m**. Le monte-charge suit sa course continue et transporte le joueur : aucune téléportation en guise d'ascenseur.
- Huit patrouilleurs au départ, puis trois groupes limités de huit ; **32 ennemis au total, huit actifs au maximum**. Le portail est choisi à distance, sur un site dégagé et accessible, avec délai d'ouverture.
- R9 au départ. BLOOM puis LANCE sont proposés après les combats prévus, à récupérer volontairement. Le point de guidage vise d'abord la récupération puis un segment praticable du trajet.
- Santé et munitions restent les deux compteurs permanents. Les journaux détaillés se lisent dans une fenêtre dédiée ; les tirs restent sans guidage.

## Continuité narrative

Références : `BIBLE_NARRATIVE_V1.md` §12, `TOME_II_PRODUCTION_V1_2.md` §33 M01 et M07, `STORYBOARD_V1.md` M01, `docs/NIVEAU_1.md`.

- Vesper, 2196 : sept ans après la Chute de 2189. ORDRE occupe toujours les quartiers humains.
- Le journal de l'annexe est signé par le frère ou la sœur du personnage choisi. Le second journal est conservé dans la boutique ouest. Il situe les disparus et la piste des **Archives végétales**, sans révéler prématurément Nharis ni le dénouement.
- Le bilan confirme cette destination et annonce un passage par les **Bas-Niveaux**, lieu de M02. Cette liaison relie les deux indications des fiches ; elle ne renomme pas les Archives végétales.
- **Gaby/Cara : voix en M01, corps physique réservé à M07.** Cette mise en œuvre conservatrice suit le storyboard 01B (« Il y a une signature familière ») et la fiche M07 (« Première matérialisation des deux sphères »). Les sphères prototypes et leurs soins/tirs ne s'affichent donc plus prématurément en M01/M02. M07 reste à produire.
- La lecture suspend la simulation ; le retour au jeu reprend la protection de lecture et la temporisation de la brèche. Le bouton d'écoute utilise la synthèse vocale française du navigateur lorsqu'elle est disponible. Ce n'est pas un doublage enregistré ; la transcription reste toujours lisible.

## Matières et accessoires

- Sur la carte de référence, les matériaux béton/enduit, chaussée, acier et rouille utilisent les cartes photographiques locales Poly Haven déjà attribuées : albédo, rugosité et normales suivant le profil graphique. Les anciennes cartes de relief ne s'ajoutent pas en double aux normales. Les carrosseries gardent leurs surfaces originales. La brique reçoit une surface PBR CC0 du Downtown City MegaKit de Quaternius : joints lisibles, normales et rugosité distinctes, carreau de deux mètres. Cette surface est créée par son auteur, pas photographiée.
- Marques d'humidité sur les pièces de maçonnerie réellement pleines, mousse au pied des façades, granulats, ferrailles ancrées aux dalles existantes et câbles courbes isolés avec extrémités de cuivre.
- Ces détails ne ferment aucune fenêtre et ne changent pas les portes ni les escaliers du layout. Environ 17 676 triangles supplémentaires sur écran de bureau, 8 292 en profil léger, neuf lots de rendu. Les ombres de contact mobiles restent une approximation statique.
- Deux accessoires CC0 photographiés : **Old Military Crate**, Jack Mava, et **Metal Trash Can**, GurJas Studios. Deux instances de chaque dans la version écran ; UV, normales, rugosité et métal conservés, textures réduites à 512 px. Collisions calées sur leurs dimensions réelles. Aucune scène ni code du jeu servant de miroir n'est réutilisé.
- Sources, licence et empreintes : `dist/assets/cc0/LICENSE.md`, `assets/level1/cc0-props-sources.json`. Conversion reproductible dans `tools/build-m01-props.py` ; masques originaux dans `tools/build-m01-weathering.py`.
- La campagne classique/WebXR reçoit aussi les surfaces locales, les détails d'usure, le ciel photographique matinal et une lumière moins intense. Les deux accessoires CC0 supplémentaires sont, dans cette livraison, propres au rendu écran de M01. Arène et AT HOME gardent leurs destinations et systèmes.

## Points de contrôle

Dans la version écran, après un combat terminé : sauvegarde par héros, seulement au sol, hors ascenseur et hors chute. La reprise restaure l'étape, les armes obtenues, les munitions et la santé à un point stable. L'écran de lancement propose explicitement de reprendre ; une nouvelle partie ne reprend pas silencieusement une sauvegarde. Une panne de stockage ne bloque pas la partie.

## Vérification et limites

- **370 tests automatisés réussis**, puis contrôles ciblés après les dernières retouches ; six vérifications navigateur écran et démarrage de la campagne classique sans erreur de page ni fichier local manquant. Un rendu WebGPU réel de la scène a été lu en pixels via Vulkan logiciel ; il ne mesure pas la fluidité d’un appareil réel.
- Parcours réel avec toutes les collisions de l'art : annexe, journal, boutique, carrefour, balise et terrasse, sans traversée de mur ; montée à 4,8 m.
- Tir tactile R9, consommation des cellules, recharge, verrouillage initial des armes, saut, touches avant/arrière et arrêt au relâchement ; journaux et reprise de la simulation.
- Contrôle des maillages CC0 : valeurs finies, normales unitaires, indices valides, dimensions, textures locales et plafond de triangles par accessoire.
- Les héros, casques, gants, squelette, animations, capes et géométries des armes n'ont pas été modifiés.

**À produire/valider ensuite :** cinématiques complètes 01A–01C et doublage, personnages et missions ultérieurs, capacités définitives des deux IA à partir de M07, habillage architectural plus fin, mesures de fluidité sur iPhone et Quest réels. Les captures navigateur et tests logiciels ne constituent pas une mesure FPS sur ces appareils, ni une conformité intégrale de toute la campagne au book.
