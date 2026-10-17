# Pink War 3.42 — profilage des personnages

Base : production 3.41, commit `1c5f2cb`. Les gants RLH, leurs matériaux, leurs 28 os, les prises mesurées, les cinq armes IV et le sabre ne changent pas. Les deux héros gardent le squelette RLH de 34 os, les animations Idle Rifle / Rifle Walk, les appuis et la recharge. Les trois modes restent disponibles.

## Héros

`armor-profiles.js` construit des plaques fermées avec des anneaux intérieurs : le centre, les biseaux et les bords forment un vrai volume galbé, avec normales continues. `aegis-v3.js` réutilise ce profil pour le plastron, les épaules, les avant-bras, les cuisses et les jambes. La silhouette du haut du corps est ajustée, les manches et le pantalon gagnent des plis aux articulations, les fixations sont affleurantes. Les inserts de couleur suivent les nouvelles épaisseurs. Le casque reste fermé et les visages absents. LYLU reste bleu, GHJU rose ; leurs hauteurs calibrées ne changent pas.

Le corps de départ reste sous 20 000 triangles et sept matériaux. Les variantes et niveaux partagent les géométries. AÉGIS garde sa génération III ; sa révision graphique est 3.42.

## Châssis hostiles

- Poursuivant : taille resserrée, plastron profilé, hanches blindées et capteurs horizontaux.
- Sentinelle : silhouette élancée et capteur cyclope de longue portée.
- Brute : torse de siège large et coque de protection de tête.
- Rempart : boucliers d’avant-bras galbés, casque abaissé, protections lourdes.
- Traqueur : vrais pavillons acoustiques concaves et antennes de surveillance.
- Rampant : quatre sections de carapace, six pattes et appuis conservés.
- Sonde : coque supérieure fuselée, cardan optique, quatre turbines et patins d’atterrissage.

Les cadres sont en alliage usé, avec mécanismes plus sombres et microrelief moins grossier. Les grosses sphères des hanches et côtes sont remplacées par des coquilles blindées. Les capteurs restent bleus en patrouille et rouges après un bruit perçu ou pendant l’engagement. Un robot engagé stabilise sa tête ; les patrouilleurs conservent leur balayage. Comportement de combat, santé et dégâts inchangés.

Chaque châssis reste sous 11 000 triangles et six lots, y compris les élites avec canon. La géométrie est partagée ; les squelettes et matériaux d’optiques restent privés par ennemi. Aucun asset de franchise n’est importé.

## Vérification

Tests des surfaces fermées, du galbe réel, des normales, des poids de squelette, des capteurs visibles devant les coques pour les sept formes normales et élites. Régressions de mouvements, gants, appuis sur étages/ascenseurs, armes, alertes et campagne. Captures du vrai rendu WebGL dans les ateliers. Contrôles en navigateur et WebXR simulé ; pas de matériel Quest/iPhone physique disponible.
