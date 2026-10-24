# Pink Wars 3.57 — Prologue, ordinateurs et combat tactique

## Décision narrative confirmée

Le créateur a confirmé pendant cette livraison que la rencontre physique avec **Gaby et Cara reste à M07 — Mémoires locales**. M01 et M02 gardent les signatures vocales et la recherche des traces familiales ; aucune sphère alliée ni compétence active n’y est introduite. Le bouton de gauche affiche les compétences en sommeil et leur condition de déblocage. Le paramètre d’URL d’une mission ne peut pas les débloquer.

Gaby reste rose, associée à GHJU, avec protection, soin et neutralisation. Cara reste bleue, associée à LYLU, avec attaques, marquage et amplification. Leurs descriptions respectent la bible et le Tome II. Les modèles de production GHJU/LYLU et le retrait du tabard frontal en 3.56 sont conservés.

## Six nouvelles illustrations

Les six tableaux P00-01 à P00-06 sont remplacés par des illustrations originales : ville humaine avant la Chute en 2189, secours et civière, réacteur altéré/écrans hostiles, évacuation en deux itinéraires, porte séparant les héros, puis ruines végétalisées en 2196. Les références visuelles sont les véritables héros 3.56 à casque fermé, sans tabard frontal. Aucun visage dévoilé, décès confirmé ou révélation tardive n’est ajouté.

Les durées 6/6/4/8/5/5 secondes, la navigation, les sous-titres et la lecture suspendue sont conservés. Les six WebP locaux font environ 1 Mo au total, en 1600 × 900. Le fichier `dist/art/prologue/credits.json` conserve les références, empreintes et origines des images. La page `prologue.html` permet une lecture sans charger le niveau 3D.

## Ordinateurs des secours

Les quatre postes de l’annexe, de la boutique ouest, de la balise et de la terrasse reçoivent un établi soutenu, un écran incliné encastré, un cadre biseauté, un clavier à touches et légendes, des cartouches, commandes physiques, tiroirs et un câble réellement raccordé. Les moniteurs et racks de diagnostic reprennent la finition du châssis.

Les surfaces de métal peint usé utilisent les textures locales **rusty_painted_metal** de Poly Haven, **CC0**, déjà documentées dans `dist/assets/cc0/sources.json`. Albedo et rugosité sur mobile ; normal map discrète sur les profils supérieurs. Les écrans narratifs restent lisibles, sans vitre opaque superposée.

**Level design inchangé :** mêmes coordonnées, mêmes volumes de collision des terminaux, limites −35/+42 et −62/+82, parcours annexe → boutique → carrefour/balise → terrasse, escalier et monte-charge à 4,8 m. Les quatre nouveaux ordinateurs restent dans les enveloppes des anciens. Les portails et effectifs de M01 ne sont pas remplacés.

## IA de combat

- Les fusiliers et N-08 considèrent aussi les abris de 1,72 à 2,12 m : accroupissement réel, animation des jambes, origine de tir et zones touchables abaissées ensemble. Les obstacles trop bas restent impropres à cacher un robot.
- Le tir reçu maintient le robot à couvert et interrompt la sortie d’un N-08. Il rejoint un point caché, attend, sort pour tirer depuis une ligne dégagée puis revient. Les places proches sont réservées pour éviter l’empilement.
- Les rôles existants restent distincts : contournement des unités mobiles, charge annoncée des brutes, protection d’un allié par les remparts, contact local transmis par les capteurs. Aucun tir autorisé à travers un mur ou uniquement à partir d’un souvenir.
- Une boule d’énergie visible et proche peut provoquer une esquive. Une boule cachée par un mur ne révèle pas sa cible. Les déplacements utilisent les collisions et la navigation existantes ; aucune téléportation ni connaissance du joueur caché n’est ajoutée.

Les modules communs bénéficient à la campagne, à l’arène et aux robots AT HOME. Le parcours du joueur et sa position réelle en WebXR ne sont pas modifiés.

## Commandes et compétences

Le bouton **GABY** ou **CARA** est placé à gauche, avec ouverture par **G** ou **croix directionnelle haute** sur manette standard/PS4. Le menu affiche les compétences, coûts, recharge et état de liaison ; le combat est suspendu pendant sa consultation. En WebXR, un pupitre au poignet gauche est pointé avec la main droite puis sélectionné à la gâchette index. Les tirs, sauts, rechargements et mouvements sont consommés pendant cette sélection ; le verrou de relâchement empêche un tir involontaire à la fermeture. Les affectations A/B/X/Y restent celles du jeu.

Les compétences actives nécessitent M07. L’atelier `compagnons.html` est explicitement **hors campagne**, sans progression narrative et avec santé protégée, afin de tester les systèmes dès maintenant. Ce n’est pas un niveau 7 livré.

| Partenaire | Compétences | Contraintes |
|---|---|---|
| Gaby | Impulsion de secours rose ; bouclier local ; réparation de terrain | Neutralisation et dégâts modérés ; trois interceptions de projectile sur trois secondes ; +20 santé sans résurrection |
| Cara | Surcharge de phase bleue ; marquage de faiblesse ; amplification | Explosion offensive ; +20 % contre une cible visible pendant huit secondes ; +15 % aux armes pendant cinq secondes |

Les deux boules d’énergie ont une **recharge de 30 secondes dès le lancement**, coûtent 40 énergie et visent le point choisi. Leur trajectoire est physique, légèrement courbe, sans guidage après le lancement. Contact, détonation, dégâts de zone et occlusion utilisent les obstacles réels. Les ressources et délais sont bornés ; ouvrir le menu ne recharge pas instantanément. L’effet lumineux et le son sont locaux, sans bloom plein écran.

## Vérifications

La suite complète compte **407 tests réussis, aucun échec**. Les tests ciblés couvrent le verrou narratif M01/M02, la recharge de 30 secondes, la pause, l’absence de guidage, les murs protégeant de l’explosion, les effets distincts, le bouclier face aux projectiles rapides, le soin sans résurrection, les dégâts amplifiés, l’abri accroupi, le repli sous le feu et l’évitement local d’une grenade.

Captures et essais locaux : six images chargées ; menus et tirs de Gaby/Cara dans l’atelier ; M01 en émulation iPhone avec tir tactile après fermeture du menu et quatre ordinateurs texturés ; lancement de la scène commune WebXR en mode écran avec LYLU/M12 ; M02 et son menu verrouillé. Le test de rayons 3D du pupitre valide ouverture, maintien, sélection unique, recharge et libération des ressources. Les sources de tir et contrôles Quest sont testés en simulation. Aucun essai physique dans un Quest 3 ni dans Safari sur un iPhone réel n’a été réalisé pendant cette livraison.
