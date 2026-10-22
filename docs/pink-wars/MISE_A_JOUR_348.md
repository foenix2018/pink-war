# Livraison 3.48 — Vesper V7 jouable, lumière et surfaces

Base : `d5179c6fb535f9e8612f44c2578e708466749eb7`, identique à la production
Vercel vérifiée le 22 octobre 2026. Aucun retour à l'ancienne carte écran.

## Carte et personnages conservés

Le générateur V7 garde ses bâtiments, positions, props, collisions, portes,
escaliers, terrasses et repères d'interaction. Ses 361 220 triangles statiques
alimentent désormais le rendu Three WebGPU / WebGL commun aux vrais modèles.
La visite autonome antérieure reste consultable avec `?visit=1`.

GHJU/LYLU gardent leurs modèles Shadow Unit, leur squelette RLH, gants,
matériaux, casque, cape et tabard. Aucun de ces fichiers de modèle n'est
réécrit. Le moteur classique et son parcours WebXR restent disponibles.

## Combat

La scène de visite ne sert plus de moteur de combat : la simulation existante
`ArenaGame`, ses collisions de projectiles, dégâts localisés, ouïe,
couvertures N-08, régénération et armes remplacent le tir de démonstration.
Six adversaires sont placés au départ. Les interactions alimentation/balise
annoncent des renforts avec délai ; au maximum huit ennemis actifs.

Les capacités reviennent aux valeurs de production : R9 12, BLOOM 24,
LANCE 5, THORN 6, NOVA 4. THORN/NOVA conservent charge et impact de zone.
AURORA garde le contact de lame et la parade. Le HUD montre santé et cellules,
sans compteur ajouté à l'arme. Un appui court sur tir est mémorisé entre images.

Le R9, BLOOM, LANCE, THORN, NOVA et AURORA utilisent les vraies géométries
et les gants animés. Les effets partagés dessinent faisceaux, empreintes et
impacts lumineux, avec des sources de lumière réutilisées, y compris pour
les tirs ennemis. Les armes gardent leurs signatures sonores distinctes.

## Gaby / Cara : prototype d'intégration

Une sphère 3D originale correspond au héros choisi : Gaby rose (interception,
soin borné) ou Cara bleue (appui direct avec ligne de vue). Énergie limitée,
recharge, évitement des murs et de l'axe de visée. Aucun déplacement de caméra.
La position est calculée dans le repère monde, y compris en WebXR.

Dans ce prototype vertical, la sphère apparaît après l'archive M01, comme
prévu par l'essai M01 de la phase B. **Ce n'est pas une résolution définitive
de la chronologie** : le storyboard M01 et la première matérialisation M07 du
tome II restent à harmoniser avec le créateur. M07 n'est pas livré.
Le prototype M02 retrouve le compagnon lors de son premier objectif.

## Graphismes et plateformes

Quatre matériaux photographiques Poly Haven CC0, douze cartes locales 512 px,
environ 340 Ko compressés : asphalte usé, béton, acier ondulé, métal rouillé.
Les normales sont omises sur téléphone ; le démarrage n'attend pas les cartes.
Une réflexion du ciel sert aux matériaux métalliques. Les détails et objets
du plan V7 ne sont pas déplacés par cette passe.

WebGPU est essayé sur les appareils compatibles ; WebGL reste le repli et la
politique iPhone éprouvée. Le nombre de pixels reste borné sur téléphone.
Les mesures logicielles et captures de cette livraison ne remplacent pas
une validation physique sur iPhone, DualShock 4 Mac et Quest 3.

Le banc Linux peut présenter un canvas WebGPU noir alors que le rendu GPU
hors écran est correct. La vérification graphique utilise donc aussi une
lecture des pixels d'une vraie cible de rendu Vulkan/Mesa, et les contrôles
utilisateur sont exercés en WebGL. Cette distinction évite de déclarer le
rendu valide uniquement parce que la simulation et le HUD tournent.
