# Sons d'ambiance déposés par le propriétaire

Le jeu fonctionne **sans aucun fichier ici** : chaque son d'ambiance est synthétisé (`dist/level-sounds.js`). Si un fichier
portant le nom d'un emplacement ci-dessous existe dans ce dossier, il est chargé au démarrage du niveau et **remplace la
version synthétisée de cet emplacement**. Un fichier absent est simplement ignoré (aucune erreur).

## Licence : à lire avant d'ajouter un fichier

Les sons d'Epidemic Sound se téléchargent avec un compte (abonnement) : ils ne peuvent pas être récupérés automatiquement,
et leur licence couvre en général l'usage dans un projet, **pas la redistribution du fichier brut** (par exemple dans un dépôt
public). Ne déposez ici que des fichiers dont votre licence autorise la publication avec le jeu ; sinon gardez-les hors du
dépôt public. Le même principe vaut pour `jetpack-epidemic.mp3` (son du mini-jetpack).

## Format

`.mp3`, mono ou stéréo, 44,1 kHz. Les boucles doivent se raccorder sans coupure (début = fin) ; pas de silence en tête.
Volume normalisé autour de -18 LUFS : le jeu applique lui-même le niveau de chaque couche.

## Boucles (ambiances continues)

| Fichier | Contenu attendu |
| --- | --- |
| `rain-loop.mp3` | pluie battante sur la ville, en extérieur (30-60 s, bouclable) |
| `rain-roof-loop.mp3` | pluie entendue de l’intérieur, sur une toiture métallique (30-60 s, bouclable) |
| `wind-loop.mp3` | vent de ville, bas et large (30-60 s, bouclable) |
| `city-hum-loop.mp3` | rumeur lointaine d’une métropole la nuit, circulation et ventilations (30-60 s, bouclable) |
| `electric-hum-loop.mp3` | bourdonnement électrique 50 Hz : transformateurs, câbles haute tension (20-40 s, bouclable) |
| `reactor-drone-loop.mp3` | grondement grave d’un réacteur, avec battement lent (30-60 s, bouclable) |
| `server-fans-loop.mp3` | salle de serveurs : ventilateurs et climatisation (20-40 s, bouclable) |
| `hangar-air-loop.mp3` | grand hangar vide : air, écho de tôle, grondement lointain (30-60 s, bouclable) |
| `factory-machinery-loop.mp3` | chaîne de montage lente : convoyeur, vérins, rythme régulier (20-40 s, bouclable) |

## Événements (sons isolés, déclenchés au hasard dans les lieux concernés)

| Fichier | Contenu attendu |
| --- | --- |
| `thunder-distant.mp3` | tonnerre lointain, 3 à 6 s |
| `siren-distant.mp3` | sirène d’alerte de la ville au loin, 4 à 8 s |
| `drone-flyby.mp3` | drone qui passe en hauteur, de gauche à droite, 3 à 5 s |
| `metal-creak.mp3` | grincement de structure métallique qui travaille, 1 à 3 s |
| `electric-arc.mp3` | arc électrique et crépitement, 0,3 à 1 s |
| `welding-crackle.mp3` | soudure, gerbe d’étincelles, 0,5 à 1,5 s |
| `server-blip.mp3` | deux bips de terminal, 0,3 s |

`jetpack-epidemic.mp3` : jet de gaz de 3 secondes pour le mini-jetpack (bouclé tant que les propulseurs fonctionnent).
