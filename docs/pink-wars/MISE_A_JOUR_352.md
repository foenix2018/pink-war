# 3.52 — Le fusil à pompe de LYLU

Demande du créateur : recréer le fusil vert/violet de la référence fournie et l’équiper **par défaut sur LYLU**. Cette demande complète l’armement du book ; elle ne remplace pas les modèles Shadow Unit ni le level design de M01.

## Modèle M–12

Modélisation originale dans Blender, à partir des proportions de la photographie latérale : crosse ajourée continue, poignée inclinée, appui-joue sombre, double tube, garde-main à pompe, pont métallique perforé, carénage supérieur, visserie et attaches de sangle ancrées au bâti. Le trou de crosse, le pontet et le canon sont de vraies ouvertures. La photo ne montre pas toutes les faces ; les volumes cachés sont reconstruits pour former une arme cohérente en 3D.

Le camouflage vert/violet reste indépendant des couleurs d’armure. Métal peint, acier, caoutchouc et rugosité sont séparés ; les bords ont un rayon réel. Géométrie d’environ 16 300 triangles, huit lots fixes/mobiles, plus une cartouche temporaire de recharge. Les géométries et surfaces sont partagées entre instances ; la pompe et la cartouche appartiennent à chaque arme.

- Source éditable : `assets/weapons/m12-shotgun.blend`, avec camouflage et rugosité inclus.
- Reconstruction : `python3 tools/build-m12-surfaces.py`, puis `blender --background --python tools/build-m12-shotgun.py`.
- Modèle GLB, manifeste et deux textures locales : `dist/assets/pink-war/m12-*`.
- Le module de géométrie embarque le GLB pour un affichage immédiat, y compris si les anciens blasters chargent encore. Le chargeur existant conserve son comportement et accepte un fournisseur de matériaux pour ce nouveau modèle.
- Inspection interactive : `/armes.html?weapon=6&character=lylu` : profil, rotation, mains, essai du tir et de la recharge. Le M–12 s’affiche directement à l’ouverture de cet atelier.

## Équipement et commandes

LYLU commence avec M–12, **huit cartouches**, en Histoire, Arène et AT HOME. Son R9 reste disponible en arme secondaire. GHJU conserve le R9 et ses douze cellules au départ. BLOOM et LANCE restent les récupérations prévues de M01 ; la carte et les rencontres ne changent pas. En Arène/AT HOME, M–12 devient également récupérable au niveau 4 pour les joueurs qui ne le possèdent pas. Il est sélectionnable au stand.

Les sept index sont stables : les six armes précédentes gardent leur numéro, M–12 est ajouté au septième emplacement. Les sauvegardes M01 récentes conservent l’arme sélectionnée et ses munitions ; les anciennes sauvegardes LYLU retrouvent M–12 sans perdre leurs acquisitions.

La gâchette droite tire, la gâchette gauche conserve la visée ; le geste de recharge verticale existant est maintenu. Les deux mains suivent leurs points de prise existants. Sur écran et en troisième personne, la main de support accompagne le coulissement de la pompe. Les mains suivies en VR restent pilotées par les poses réelles. La hausse du M–12 est ouverte : aucun panneau opaque ni lunette virtuelle supplémentaire. La visée sur écran rapproche l’axe avec un grossissement léger de 1,15× et une distance adaptée à la crosse.

## Tir et sensations

Une pression consomme une cartouche et projette huit impacts distincts : un centre et sept points périphériques uniques. La gerbe reste correcte en visée verticale. Vitesse finie, collisions par projectile et perte de puissance après 12 m, jusqu’à 20 % à 40 m. Aucun guidage vers les ennemis. La cadence de 0,88 s impose un cycle de pompe ; maintenir la gâchette ne crée pas de tir automatique. La recharge de 2,8 s remplit huit cartouches, sans simuler une insertion jouable cartouche par cartouche.

Pompe coulissante indépendante, recul amorti du modèle, cartouche visible pendant la recharge, son original grave et transitoires mécaniques de pompe. Les effets utilisent les réserves de lumières/impacts déjà bornées. Le son n’est pas une prise de son du fusil de référence. La vibration de tir utilise une impulsion dédiée de 115 ms, limitée par les capacités de la manette. Santé et munitions restent dans le HUD, sans compteur ajouté à l’arme.

## Recette et limites

**387 tests automatisés réussis**. Tests : choix de l’équipement selon le héros, trajectoires et nombre de projectiles, arrêt par une paroi, perte de puissance, cadence, recharge, ouvertures du maillage, pompe indépendante et retour au repos, axe de visée, anciennes/nouvelles sauvegardes et conservation des animations/mains RLH. Les anciennes assertions de catalogue sont mises à jour pour sept armes ; les cinq assets Kenney existants sont conservés.

Contrôle navigateur : LYLU huit cartouches, GHJU douze cellules, consommation sur tir tactile et recharge, visée ouverte, démarrage de la campagne classique et inspection du modèle. Le modèle et ses surfaces ont aussi été rendus en WebGPU sous Vulkan logiciel, avec lecture réelle des pixels ; ces essais ne mesurent pas les performances d’un Quest 3 ou d’un iPhone physique et ne remplacent pas un essai du rechargement gestuel dans le casque.
