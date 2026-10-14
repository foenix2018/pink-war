# Le dernier signal — carte dédiée 3.33

GHJU / LYLU rejoint l’ancien quartier de secours de Vesper. ORDRE reste entièrement hostile. Les terminaux hors réseau conservent uniquement des archives humaines. Mission finie, avec deux combats et retour au menu/rejeu ; les missions suivantes attendent les essais du joueur.

## Parcours jouable

1. Observer la sonde et le gardien déjà présents, puis entrer dans l’annexe du laboratoire, réarmer le circuit isolé, consulter le journal de l’autre protagoniste.
2. Lire cinq secondes à l’abri, puis repousser la sonde et les trois robots issus d’une brèche distante.
3. Récupérer BLOOM au faisceau. Traverser la rue des évacuations, entre couvertures, véhicule de secours, végétation et transport suspendu détruit.
4. Approcher du carrefour nord déclenche une seconde patrouille : fusilier, sonde, unité basse et machine lourde. Son portail garde une distance de douze mètres minimum et doit être accessible aux ennemis.
5. Prendre l’escalier extérieur ou l’ascenseur automatique, rejoindre la terrasse à 4,8 m et consulter le relais. Une trace du frère ou de la sœur mène aux Archives végétales.

Les permanents du HUD restent santé et munitions. Repères ambre et consoles appartiennent au décor. F sur PC, bouton contextuel sur mobile, clic du stick libre sur Quest pour interagir. Les commandes de tir, visée, recharge et saut restent celles du jeu actuel.

## Sources et intégration

- `assets/level1/Vesper_Secours_07.blend` : scène Blender éditable, unités en mètres ; art original produit pour Pink War.
- `assets/level1/Vesper_Secours_07.glb` : export glTF binaire, axes Y vers le haut, pour interchange/édition. Il n’est pas téléchargé au lancement du jeu.
- `assets/level1/layout.json` : source commune des colliders, bâtiments, parcours, sols, ascenseur et portails.
- `dist/levels/vesper-01-mesh.js` : géométrie évaluée avec chanfreins et normales, groupée en quatorze matériaux, comprimée en DEFLATE et intégrée au HTML autonome.
- `dist/level1-layout.js` / `campaign-art.js` : physique, matériaux texturés, terminaux et ascenseur dynamique.

La géométrie Blender représente 234 244 triangles avant les terminaux et l’ascenseur dynamiques. Terrain, façades, conduites, viaduc, ruines, végétation et véhicule sont réunis en quatorze lots statiques. Les casques et les téléphones conservent leur profil de résolution distinct. Le corps principal existant reste caché en FPS/VR. Il faut mesurer la fluidité sur le matériel réel ; les tests logiciels ne donnent pas une fréquence d’images Quest/iPhone.

Le mode Histoire masque entièrement le décor de l’arène et remplace tous ses colliders. Il possède ses propres sols, escaliers, plateformes et routes de poursuite ; aucun jardin ou pont invisible de l’ancienne carte ne soutient le joueur. Une reprise du moteur reconstruit cette même carte. Survie retrouve son environnement d’origine. AT HOME conserve sa géométrie et ses règles de défense.

## Reconstruire

Depuis la racine du dépôt :

```bash
python3 tools/build-level1-textures.py
python3 tools/build-level1-layout.py
blender --background --python tools/build-level1-blender.py
npm test
python3 tools/build-launcher.py /chemin/Pink_war.html
```

Le générateur produit ses géométries et matériaux originaux localement. La couche Poly Haven en ligne reste facultative ; les vrais fichiers ne sont pas incorporés au Blender tant que leur téléchargement local est bloqué. Voir [la sélection et ses limites](POLYHAVEN.md). Les matériaux du jeu ajoutent leur texture de surface et leurs panneaux aux géométries originales Blender. Cette première carte reste un prototype visuel ; ce n’est pas un rendu photoréaliste ni une reproduction d’un niveau de Call of Duty.
