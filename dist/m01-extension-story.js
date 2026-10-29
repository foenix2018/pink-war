// M01 « Le Dernier Signal » — script of the prologue (station AEGIS 07) and epilogue (Archives végétales).
// Canon (BIBLE_NARRATIVE_V1 §2, §7, §12 M01; Tome II W01/M01; storyboard 01A–01C): Vesper, 2196, seven years
// after the fall of 14/03/2189. GHJU and LYLU were AEGIS rescuers of station 07, separated during a medical
// evacuation: LYLU went down to restore power (Ligne 9, P9 pumps), GHJU took the civilians to the high
// platforms. Last message: « Ne prends pas le réseau principal. Retrouve les anciens relais. » Gaby (GHJU)
// and Cara (LYLU) accompany the hero physically from M01 (creator update, 29 Oct 2026). ORDRE stays hostile;
// HELIX collects records (seeds M02). M01's revelation: the person searched for left a recent trace.
// The night of 2189 matches the Ligne 9 documents (22 h 05 LYLU to the pumps, 22 h 12 GHJU with 34 civilians,
// contact lost 22 h 47, main network seized at 23 h). The epilogue sends the hero to the Bas-Niveaux (M02).

export const SPEAKERS = Object.freeze({
  lylu: { name: 'LYLU', color: '#8fd0ff' }, ghju: { name: 'GHJU', color: '#ff9fcd' },
  cara: { name: 'CARA', color: '#56c8ff' }, gaby: { name: 'GABY', color: '#ff6fb4' },
  ordre: { name: 'ORDRE · ANNONCE', color: '#ff5a5a' }, radio: { name: 'RADIO · CANAL 07', color: '#d8c6a0' }
});
const L = (...lines) => lines;

// Lines: [speaker, text]. Variants per hero: LYLU speaks with Cara, GHJU with Gaby.
export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Station 07. D’après les plaques, c’était chez toi.'],
      ['lylu', 'Sept ans. Il y a trois jours, quelqu’un a émis sur le canal 07. Plus personne n’a de radio réglée là-dessus, à part nous.'],
      ['cara', 'Alors on entre par la porte de service, génie, et on évite de réveiller tout le quartier.']),
    ghju: L(['gaby', 'Station 07. C’est ici que vous travailliez, LYLU et toi ?'],
      ['ghju', 'Il y a trois jours, quelqu’un a émis sur le canal 07. Seules les radios de la station étaient réglées dessus.'],
      ['gaby', 'Alors on commence par ici. Doucement. Je reste au-dessus de ton épaule.'])
  },
  couloir: {
    lylu: L(['cara', 'Pas de courant. Je t’éclaire, mais ne compte pas sur moi pour porter les extincteurs.']),
    ghju: L(['gaby', 'Pas de courant. Je t’éclaire. Avance, je surveille derrière.'])
  },
  main: {
    lylu: L(['lylu', '22 h 12 : elle est partie avec les civils vers les plateformes hautes. Et 22 h 05… c’est moi. La Ligne 9.'],
      ['cara', 'Tu ne m’avais jamais dit que tu étais descendu seul.'], ['lylu', 'On était trois. Je suis le seul à être remonté.']),
    ghju: L(['ghju', '22 h 05 : LYLU part aux pompes de la Ligne 9. 22 h 12 : c’est mon départ. On s’est croisés dans le hangar sans même se parler.'],
      ['gaby', 'Tu ne pouvais pas savoir que c’était la dernière fois.'])
  },
  casier: {
    lylu: L(['cara', 'Pas de poussière sur l’étagère du casier de GHJU. Le reste de la pièce en a deux doigts.'], ['lylu', 'Quelqu’un a pris son casque. Récemment.']),
    ghju: L(['gaby', 'Le casier de LYLU est vide, et c’est le seul sans poussière.'], ['ghju', 'Son casque n’est plus là. Il est passé ici. Il est vivant.'])
  },
  groupe: {
    lylu: L(['cara', 'Un groupe électrogène qui démarre, ça s’entend à trois rues. Tiens-toi prêt.']),
    ghju: L(['gaby', 'Le démarrage va faire du bruit. Reste près du groupe, je te couvre.'])
  },
  nid: {
    lylu: L(['cara', 'Des rampants ! Ils nichaient sous les véhicules du hangar.']),
    ghju: L(['gaby', 'Mouvement dans le hangar. Des rampants, sous les véhicules !'])
  },
  groupeOk: {
    lylu: L(['lylu', 'Groupe en charge. La porte du hangar devrait répondre.']),
    ghju: L(['ghju', 'Le groupe tient. On peut ouvrir le hangar.'])
  },
  portail: {
    lylu: L(['cara', 'Une sonde et deux traqueurs devant la porte. ORDRE a entendu ton moteur.']),
    ghju: L(['gaby', 'ORDRE est devant la porte : une sonde, deux traqueurs. Je mets le bouclier en charge.'])
  },
  quartier: {
    lylu: L(['lylu', 'L’annexe de secours est à l’est. Si le signal venait de là, on le saura vite.']),
    ghju: L(['ghju', 'L’annexe de secours, à l’est. Le signal venait forcément d’un relais du quartier.'])
  },
  relais: {
    lylu: L(['lylu', 'Connexion manuelle il y a trois jours. Identifiant 07-GHJU. Elle était là, sur cette terrasse.'],
      ['ordre', 'CONNEXION NON AUTORISÉE · RELAIS A3 · UNITÉS DÉPÊCHÉES'], ['cara', 'Et voilà, tu as sonné à la porte. Archives végétales, accès sud. On file.']),
    ghju: L(['ghju', 'Connexion manuelle il y a trois jours. Identifiant 07-LYLU. Il était là, sur cette terrasse.'],
      ['ordre', 'CONNEXION NON AUTORISÉE · RELAIS A3 · UNITÉS DÉPÊCHÉES'], ['gaby', 'ORDRE a vu la connexion. Archives végétales, accès sud. Je reste avec toi.'])
  },
  parvis: {
    lylu: L(['cara', 'Portes verrouillées, pas de courant. Il y a une commande de déverrouillage manuel, comme sur tes vieilles portes.']),
    ghju: L(['gaby', 'Les portes sont tombées en sécurité. Cherche la commande manuelle, à droite.'])
  },
  hall: {
    lylu: L(['cara', 'Ça sent la terre mouillée et le papier. Quelqu’un a ouvert les vannes d’arrosage récemment.']),
    ghju: L(['gaby', 'Les plantes ont été arrosées. Il y a quelques jours, pas sept ans.'])
  },
  bivouac: {
    lylu: L(['lylu', 'Le poêle est encore tiède. Sa couverture, sa carte… Elle a dormi ici.'], ['cara', 'Elle a coché les Bas-Niveaux. Et la Ligne 9, et le poste Orme. Tes anciens relais.']),
    ghju: L(['ghju', 'Le poêle est encore tiède. C’est sa couverture, celle de l’ambulance.'], ['gaby', 'Il a entouré les Bas-Niveaux sur la carte. Et la Ligne 9, et le poste Orme.'])
  },
  copie: {
    lylu: L(['cara', 'La copie prend du temps. ORDRE arrive par la serre, et ils ne viennent pas pour lire.']),
    ghju: L(['gaby', 'La copie a commencé. ORDRE arrive par la serre. Je tiens le bouclier, tu tiens la salle.'])
  },
  copieOk: {
    lylu: L(['lylu', 'Elle cherchait mon nom. Elle a écrit « pas disparu » à côté.'], ['cara', 'Et elle est partie vers les Bas-Niveaux. On a trois jours de retard, pas sept ans.']),
    ghju: L(['ghju', 'Il cherchait mon nom. Il a écrit « pas disparue » à côté.'], ['gaby', 'Il est parti vers les Bas-Niveaux. On a trois jours de retard, GHJU. Pas sept ans.'])
  },
  depart: {
    lylu: L(['cara', 'Monte-charge au fond de la serre. Direction les Bas-Niveaux.']),
    ghju: L(['gaby', 'Le monte-charge descend aux Bas-Niveaux. On y va ensemble.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

// Documents, in the M01 journal format (m01-narrative.js): title, stamp, lines, footer, speech.
const sib = c => c === 'lylu' ? 'GHJU' : 'LYLU';
const self = c => c === 'lylu' ? 'LYLU' : 'GHJU';
export const LOGS = Object.freeze({
  'main-courante': () => ({ title: 'JOURNAL DE BORD — 14/03/2189', stamp: 'STATION AEGIS 07 · SALLE DE VEILLE',
    lines: ['17 h 42 — Message ORDRE : suspension de toutes les évacuations non autorisées. Accusé de réception refusé par le chef de poste.',
      '21 h 40 — Coupure d’énergie sur le secteur et sur la Ligne 9. Passage sur batteries.',
      '22 h 05 — Départ équipe technique (LYLU + 2) vers la station Halles-Basses, pompes P9. Moyens : véhicule léger 07.',
      '22 h 12 — Départ ambulance 07 (cheffe d’équipe GHJU) : 34 civils, dont 11 enfants, vers les plateformes hautes.',
      '22 h 47 — Perte du contact radio avec l’équipe technique.',
      '23 h 00 — Réseau principal saisi par ORDRE. Message reçu par l’ancien relais Orme : « Ne prends pas le réseau principal. Retrouve les anciens relais. »',
      '23 h 15 — Évacuation de la station. Radio de veille laissée sur le canal 07.'],
    footer: 'Écriture du chef de poste. La dernière ligne est soulignée deux fois.',
    speech: 'Vingt-deux heures cinq, départ équipe technique vers les pompes P9. Vingt-deux heures douze, départ ambulance 07, trente-quatre civils. Vingt-trois heures quinze, radio laissée sur le canal 07.' }),
  tableau: () => ({ title: 'TABLEAU DE SERVICE — NUIT DU 14/03/2189', stamp: 'STATION AEGIS 07 · TABLEAU MAGNÉTIQUE',
    lines: ['Chef de poste : Ferrand. Radio : Mbaye.', 'Ambulance 07 : GHJU (cheffe d’équipe), Sorel, Quentin.', 'Camion 07 : Delcourt (chef d’équipe), Aubry, Lenoir, Haddad, Petit, Rossi.',
      'Équipe technique réseaux : LYLU (chef), Varenne, Kim.', 'Les aimants de l’équipe technique sont restés dans la case « en intervention ». Personne ne les a déplacés depuis.'],
    footer: 'Les noms de l’équipe de nuit sont ceux d’une station de 2189 ; aucun n’est revenu reprendre son aimant.',
    speech: 'Ambulance 07, GHJU cheffe d’équipe. Équipe technique réseaux, LYLU chef. Toujours en intervention.' }),
  radio: c => ({ title: 'RADIO DU STANDARD — CANAL 07', stamp: 'ENREGISTREUR DE TRAFIC · DERNIÈRES ÉMISSIONS',
    lines: ['14/03/2189, 23 h 14 — « Ici 07, on quitte la station. Radio laissée en veille sur le canal. Ceux qui nous entendent, repliez-vous sur les plateformes hautes. »',
      '[sept années de souffle]',
      `Il y a trois jours, 21 h 09 — « …Zéro-sept de ${sib(c)}. Si quelqu’un de la station entend : je suis ${c === 'lylu' ? 'vivante' : 'vivant'}. Je remonte la piste par les anciens relais. Pas le réseau principal. Jamais. »`,
      'Émission courte, relayée par le relais A3 de la terrasse. Signal coupé après onze secondes.'],
    footer: `C’est ce signal qui t’a ramené${c === 'lylu' ? '' : 'e'} ici.`,
    speech: `Zéro-sept de ${sib(c)}. Si quelqu'un de la station entend, je suis ${c === 'lylu' ? 'vivante' : 'vivant'}. Je remonte la piste par les anciens relais.` }),
  consignes: () => ({ title: 'CONSIGNES DE DÉPART — 14/03/2189', stamp: 'HANGAR · AFFICHAGE OPÉRATIONNEL',
    lines: ['Ordre ORDRE n° 2189-0314-17 : « Aucun véhicule ne quitte le hangar sans autorisation du réseau. »',
      'Note manuscrite du chef de centre, agrafée par-dessus : « On sort quand même. On part tout de suite, radios sur le 07, équipements complets, on ramène tout le monde. »',
      'Vérification des véhicules : ambulance 07 complète. Camion 07 complet. Véhicule léger 07 sorti à 22 h 05.'],
    footer: 'Les deux véhicules sont encore là : ils ne sont jamais rentrés, on les a ramenés à vide après la chute.',
    speech: 'On sort quand même. Radios sur le zéro-sept, on ramène tout le monde.' }),
  casier: c => ({ title: `CASIER — ${sib(c)}`, stamp: 'VESTIAIRES · STATION AEGIS 07',
    lines: [`Étiquette : ${sib(c)} · AEGIS 07.`, 'Portemanteau vide : la veste de feu et le casque ont été pris. Pas de poussière sur l’étagère, contrairement aux casiers voisins.',
      `Scotchée à l’intérieur de la porte, une photo : ${self(c)} et ${sib(c)}, en tenue, devant l’ambulance 07, l’été d’avant la chute.`,
      `Au dos, au feutre, une écriture récente : « Je suis passé${c === 'lylu' ? 'e' : ''}. Relais A3, puis les Archives. »`],
    footer: 'Le casier d’à côté porte ton nom. Il est resté fermé sept ans.',
    speech: `Je suis passé${c === 'lylu' ? 'e' : ''}. Relais A3, puis les Archives.` }),
  'relais-a3': c => ({ title: 'RELAIS A3 — JOURNAL LOCAL', stamp: 'TERRASSE DES ARCHIVES · MÉMOIRE TAMPON HORS RÉSEAU',
    lines: [`Il y a trois jours, 21 h 07 — connexion manuelle, identifiant AEGIS 07-${sib(c)}.`, '21 h 09 — émission courte sur le canal 07, onze secondes, puissance minimale.',
      '21 h 12 — requête : itinéraire « Archives végétales, accès sud ». Accès accordé (porte de service, déverrouillage manuel).',
      `Message déposé : « Si c’est toi, ${self(c)} : je suis aux Archives. Ne prends pas le réseau principal. »`],
    footer: 'Ta propre connexion vient d’être enregistrée. Le relais signale une alerte ORDRE.',
    speech: `Si c'est toi, ${self(c)}, je suis aux Archives. Ne prends pas le réseau principal.` }),
  visiteurs: c => ({ title: 'REGISTRE DES VISITEURS', stamp: 'ARCHIVES VÉGÉTALES · ACCUEIL',
    lines: ['13/03/2189 — Classe de CM2, école des Tanneurs. « Les plantes qui se souviennent ! »', '15/03/2189 — Famille Okafor, 4 personnes. Abri. Merci pour l’eau.',
      '16/03/2189 — 22 personnes du quartier des secours. Nous partons vers les Bas-Niveaux, il paraît qu’une enclave tient au marché.',
      `Il y a trois jours — « ${sib(c)}, AEGIS 07. Une nuit. J’ai arrosé la serre, la vanne grince. »`],
    footer: 'Sept ans sans visiteur entre l’avant-dernière ligne et la dernière.',
    speech: `${sib(c)}, AEGIS 07. Une nuit. J'ai arrosé la serre.` }),
  bivouac: c => ({ title: `LE BIVOUAC DE ${sib(c)}`, stamp: 'BUREAU DU CONSERVATEUR',
    lines: ['Une couverture de survie et une couverture de l’ambulance 07, pliées au carré. Un poêle à alcool encore tiède. Deux rations ouvertes.',
      'Une carte de Vesper annotée : « Bas-Niveaux — enclave du marché (vu·e en 2195 ?) », et une ligne tracée « Ligne 9 → poste Orme → anciens relais ».',
      `Sur un carnet : « ${self(c)}, si tu lis ça, on se rate de peu. Les registres d’ici gardent une copie des disparus. ORDRE veut les effacer. Prends-la avant eux. »`],
    footer: 'Les annotations sur la Ligne 9 et le poste Orme recoupent le journal de bord de la station.',
    speech: `${self(c)}, si tu lis ça, on se rate de peu. Les registres d'ici gardent une copie des disparus. Prends-la avant eux.` }),
  serveur: () => ({ title: 'ORDRE DE PURGE — RÉSEAU ORDRE', stamp: 'LOCAL DES COPIES · IMPRIMANTE DE SECOURS',
    lines: ['Objet : registres civils des Archives végétales. Priorité 2. Effacement à la reconnexion du site.',
      'Copie préalable demandée par HELIX Security, « pour archivage ». Accord d’ORDRE en attente.',
      'Statut : en attente d’une unité de maintenance.'],
    footer: 'HELIX veut une copie de ce qu’ORDRE efface. Personne n’a demandé l’avis des familles.',
    speech: 'Copie préalable demandée par HELIX Security, pour archivage.' }),
  herbier: () => ({ title: 'HERBIER DE VESPER — PLANCHE 1127', stamp: 'SALLE DES HERBIERS',
    lines: ['Fougère des toits (récoltée sur la station 07, toit-terrasse, 2186).', 'Note de la conservatrice, 2189 : « Si la ville s’arrête, les fougères continueront. Arrosez la serre le mardi. »',
      'Une main a ajouté en dessous, récemment : « Fait. Mardi. »'],
    footer: 'Les petites choses qui continuent quand tout s’arrête.', speech: 'Si la ville s’arrête, les fougères continueront.' }),
  registre: c => ({ title: 'REGISTRE DES DISPARUS — COPIE LOCALE', stamp: 'ARCHIVES VÉGÉTALES · COPIE HORS RÉSEAU TERMINÉE',
    lines: [`${self(c)} — AEGIS 07. Statut 2189 : disparu${c === 'lylu' ? '' : 'e'}.`,
      `Annotation manuscrite saisie il y a trois jours par 07-${sib(c)} : « Pas disparu${c === 'lylu' ? '' : 'e'}. Je ${c === 'lylu' ? 'le' : 'la'} cherche. »`,
      `${sib(c)} — AEGIS 07. Statut 2189 : disparu${c === 'lylu' ? 'e' : ''}. Mise à jour il y a trois jours : « Vu${c === 'lylu' ? 'e' : ''} vivant${c === 'lylu' ? 'e' : ''} aux Archives végétales. En route vers les Bas-Niveaux, enclave du marché. »`,
      '4 812 autres noms. La copie tient dans la mémoire de ta combinaison.'],
    footer: 'La purge d’ORDRE n’effacera pas cette copie-là.',
    speech: `Pas disparu${c === 'lylu' ? '' : 'e'}. Je ${c === 'lylu' ? 'le' : 'la'} cherche.` })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'Le Dernier Signal',
  text: { lylu: 'GHJU est vivante. Il y a trois jours, elle dormait aux Archives végétales, à côté du registre où elle a écrit « pas disparu » sous le nom de LYLU. Elle est partie vers l’enclave du marché des Bas-Niveaux. Le monte-charge descend.',
    ghju: 'LYLU est vivant. Il y a trois jours, il dormait aux Archives végétales, à côté du registre où il a écrit « pas disparue » sous le nom de GHJU. Il est parti vers l’enclave du marché des Bas-Niveaux. Le monte-charge descend.' },
  next: 'Suite : 02 — Sous les Néons'
});
