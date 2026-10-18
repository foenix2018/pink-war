# Pink War — fonds illustrés 3.47

Les quatre illustrations ont été générées le 18 octobre 2026 avec l’outil de génération d’images d’OpenAI. Elles reprennent les fonds précédents pour leur composition et des captures du personnage Shadow Unit réellement utilisé dans la version 3.46 pour la tenue. Ce sont des illustrations d’ambiance ; le jeu reste rendu en 3D.

| Fichier | Usage | Dimensions | Taille |
| --- | --- | --- | --- |
| `accueil.webp` | GHJU devant Vesper en ruines, tenue graphite et liserés roses | 1672 × 941 | 293 400 octets |
| `accueil-lylu.webp` | Même accueil pour LYLU, visière et liserés bleus | 1672 × 941 | 273 110 octets |
| `chargement.webp` | GHJU consulte les archives humaines du laboratoire | 1672 × 941 | 299 598 octets |
| `chargement-lylu.webp` | LYLU recherche la trace de sa sœur sur le terminal isolé | 1672 × 941 | 289 534 octets |

## Scénario et tenue

- Vesper après la guerre humains/IA : végétation, ruines de béton, voies détruites, véhicule d’évacuation et lumière du soir. Les personnages restent séparés.
- Armure Shadow Unit graphite et acier, casque intégral à calotte basse, visière panoramique sombre, module d’oreille circulaire, mentonnière angulaire et doubles admissions lumineuses. Tabard frontal et cape dorsale noirs tissés, bords lumineux roses GHJU ou bleus LYLU.
- Ancien laboratoire des secours : terminal d’archives hors réseau à écran ambré, câbles débranchés, radio et petite caisse médicale. Au loin, une sonde rouge et un portique industriel signalent la surveillance hostile d’ORDRE.
- Les couleurs du personnage restent localisées à ses équipements. Le paysage conserve ses matières grises, sa végétation et sa lumière chaude.

## Intégration

`menu-art.js` choisit le couple accueil/chargement suivant GHJU ou LYLU, avant le chargement de la 3D et après un retour au menu. Le choix enregistré est restauré. Le texte de chargement distingue la recherche du frère/de la sœur, l’arène et le stand de tir.

La partie gauche des images reste calme pour le menu et le texte HTML. Le recadrage portrait conserve le personnage à droite ; les contrôles restent du HTML accessible. Les WebP sont convertis sans recadrage, sans effet ou retouche additionnelle, en qualité 86 et méthode 6. Les URL de la version 3.47 et les en-têtes Vercel imposent la revalidation du cache.

Le générateur HTML autonome incorpore les quatre variantes, y compris les attributs de source par personnage, pour conserver le changement de personnage hors connexion.

## Originaux conservés dans l’environnement

Les PNG de génération sont conservés sans modification dans `/workspace/generated_images/` :

- Accueil GHJU : `exec-7406714b-9815-46b1-89a0-b3196a6e9d1e.png`.
- Chargement GHJU : `exec-dc5a2681-ea60-47ec-8ecb-e48991ac9e4d.png`.
- Accueil LYLU : `exec-97c59e69-5000-455e-bbc5-2a15c5f34b1d.png`.
- Chargement LYLU : `exec-19123378-1cd8-4526-9c32-9156dd2fb515.png`.
