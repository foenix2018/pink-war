# Néons physiques — jeu complet

Les traits lumineux des postes, cloisons, bornes, caisses, rampes, murs et portiques sont remplacés par des luminaires 3D : tube cylindrique à extrémités arrondies, enveloppe translucide, cœur lumineux, douilles, colliers et rail de fixation métallique. Les lignes longues sont sectionnées en éléments de 2,8 m maximum. Les balises linéaires jaunes au sol ont également des tubes sur profilés bas. Les chevrons de signalétique et les motifs peints restent des marquages.

Le module partagé `neon-fixtures.js` regroupe les éléments par géométrie et matériau. Les halos sont doux, transparents et soumis au test de profondeur pour ne pas apparaître à travers les murs. L’éclairage ambiant et les projecteurs existants fournissent les retombées lumineuses : aucune lumière dynamique ni carte d’ombre supplémentaire par tube. Les petits voyants des tourelles utilisent également une géométrie arrondie.

Les tubes placés sur les deux faces des cloisons ont leurs supports du côté du mur. Les bornes restent sélectionnables et les cibles restent dégagées. Les luminaires du skyline inaccessible sont simplifiés ; ceux de l’espace jouable conservent leur mécanique.

## Vérification

Tests de géométrie, subdivision, orientation des supports, halos avec profondeur, qualité distante, libération des ressources, collisions, tourelles, bornes, armurerie et commandes VR.

Rendus Chromium/WebGL sans erreur JavaScript :

- Stand compact : 461 sections, 33 lots de luminaires, 128 158 triangles de luminaires. Vue rapprochée : 261 appels de rendu / 171 170 triangles (contre 297 appels de rendu pour la précédente version à bandes plates texturées).
- Arène haute qualité : vue de comparaison à 61 appels de rendu / 309 398 triangles. Le plafond de géométrie global testé reste inférieur à 350 000 triangles.

Les captures `/workspace/livraison/Stand_terminal_neons.png` et `/workspace/livraison/Arene_neons_apres.png` sont des rendus des véritables modules du jeu. Les références précédentes sont `Stand_neons_avant.png` et `Arene_neons_avant.png`. Performances sur casque physique non mesurées.

Version locale, sans publication GitHub/Vercel.

## Extension à la campagne

Le traitement s'étend aux luminaires des missions : carte canonique et extension M01, ambiance de siège, Bas-Niveaux et extension M02, secteur et gare M03, station M04, Ligne 9, fonderie M06, Couronne HELIX et ancienne Brèche. La forêt ne comporte pas de bandes néon à remplacer : ses balises sphériques et les peintures des véhicules gardent leur forme.

- `level-neons.js` sélectionne explicitement les matériaux de luminaires et remplace les formes allongées avant fusion des décors. Les pièces fixées aux ascenseurs et aux véhicules restent dans leur groupe mobile. Le balisage des passerelles utilise leur hauteur de plancher pour placer les supports sous les tubes. Les écrans, surfaces d'énergie et marquages peints sont exclus.
- `baked-neons.js` retrouve les bandes dans les cartes préassemblées. Les faces connectées d'un même parallélépipède produisent un seul luminaire. Les éléments larges ou complexes restent intacts.
- Les fluorescents alimentés des extensions M01/M02 et du métro conservent leurs indices et couleurs d'instances. Les halos partagent le même tampon de couleurs : panne, retour du courant et scintillement restent pilotés par les systèmes existants.
- Les coordonnées éloignées de l'origine ne réduisent plus le détail d'un luminaire dans une mission jouable. La simplification demeure explicite pour les tours de veille inaccessibles de M01 et le skyline de l'arène.
- Aucun ajout de lumière dynamique, de collision ou de carte d'ombre par tube.

Vérification Chromium/WebGL : les neuf fabriques de décors ci-dessus se construisent sans erreur JavaScript, ressource locale manquante ou transformation non finie. Les changements de courant sont vérifiés sur les couleurs de tubes en M01, M02 et Ligne 9. Les captures `Neons_m04.png` et `Neons_ligne9.png` montrent les véritables décors, sans personnage ni interface. Leurs vues affichent respectivement 147 appels / 145 062 triangles et 36 appels / 22 442 triangles en qualité basse ; il ne s'agit pas d'une mesure de fréquence d'image sur téléphone ou casque.

Les tests de campagne, géométrie, coupures, objets mobiles, reconstruction des anciennes cartes et les régressions arène/stand ont été exécutés. Le budget existant de l'ambiance M01 reste respecté (moins de 25 000 triangles et 50 objets de rendu). Le test historique `352-level2-launch.test.mjs` relatif aux illustrations du menu échoue sur son simulacre d'image dépourvu de `closest()` ; son code et `menu-art.js` sont identiques à HEAD, indépendamment de cette modification. Les autres contrôles ciblés passent. Le lancement complet de M02 a également été vérifié sous Chromium/WebGL : partie active, personnage à 100 PV, néons présents et aucune exception JavaScript. La console signale trois requêtes réseau externes refusées par le proxy de test ; les six familles de textures PBR locales sont toutes chargées.

Cette extension reste locale ; aucune publication GitHub ou Vercel n'a été effectuée.
