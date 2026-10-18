# Pink War — bandes-son

Déposer dans ce dossier **les deux MP3 fournis par l’utilisateur**, compressés en 128 kbit/s :

- `under-violet-light.mp3` — accueil (« Under Violet Light »)
- `velvet-siege.mp3` — Histoire et Arène (« Level 1 – Velvet Siege »)

Les fichiers binaires compressés ont été préparés dans l’archive `Pink-War-Musiques-128kbps.zip` remise dans la conversation ChatGPT. Les chemins et la casse sont importants. La PR #3 ne doit pas être fusionnée avant leur ajout : le test `347-music-tracks.test.mjs` impose leur présence.

Le navigateur les charge **à la demande** et les joue en boucle sans les décoder entièrement en mémoire (iPhone/Quest). La musique synthétique du jeu reste disponible si un fichier ne peut pas être chargé.
