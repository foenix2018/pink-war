# 3.63.5 — Matières et équipements de Vesper

Focus sur les objets vus de près, à partir de la 3.63.4. Le parcours M01, le lore, GHJU/LYLU, les armes et le HUD C sont conservés.

- Béton et asphalte : six textures photographiques Poly Haven CC0 en 1024 × 1024, couleur/normale/rugosité, optimisées et livrées localement. Le mode performance conserve les fichiers 512 et son budget sans normales supplémentaires. Provenance et empreintes dans `dist/assets/cc0/materials-3635.json`.
- Équipements : matériaux distincts pour acier brossé, peinture technique, caoutchouc et toile tissée. Canaux couleur, relief fin et rugosité/métallicité séparés ; pas de reflet lumineux artificiel ajouté au décor.
- Ordinateur commun aux scénarios M01/M02 : coque aux angles plus doux, protections latérales, refroidissement arrière, câble, clavier physique et cartouche de données. Les écrans de M01 utilisent une interface mémoire locale et réagissent à l’alimentation du circuit. Les points d’interaction et l’enveloppe de collision sont conservés.
- Interrupteur réutilisable : sectionneur protégé avec poignée qui bascule, voyant ambre/vert et grille d’aération. Intégré aux deux isolateurs et au boîtier de réarmement M01. Les parties fixes des deux isolateurs sont regroupées pour limiter les appels de rendu. La poignée garde un mouvement devant le boîtier.
- Lits de secours : tissu tissé dédié, indépendant du béton des bâtiments.

Validation : **474 tests réussis**, puis contrôles navigateur sans erreur JavaScript ni texture manquante. Les tests des enveloppes et budgets des ordinateurs, du mouvement du sectionneur, de l’état d’alimentation, des deux passages de M01 et des renforts finis ; contrôles navigateur ordinateur et iPhone émulé, interactions, tir/recharge, pause/reprise. Les images de `materiaux-3635.html` sont des captures réelles du moteur. Le rendu de contrôle WebGL logiciel ne mesure pas les performances d’un iPhone ou Quest physique.

Sources modifiables : `archive-terminals.js`, `circuit-switch.js`, `machine-finishes.js`, `photographic-surfaces.js`. La géométrie Blender du quartier reste celle de la 3.63.4 ; cette livraison affine les équipements et les surfaces à l’exécution.
