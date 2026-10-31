// M01 « Le Dernier Signal » — script of the prologue (station AEGIS 07) and epilogue (Archives végétales).
// Canon: BIBLE « Les Héritiers du Silence » (docs/pink-wars/BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md), Acte I,
// chapitre 1. Vesper, 2196, seven years after the Chute of 17/11/2189 (ORDRE's update at 03 h 17, last world
// message at 06 h 42). GHJU and LYLU, the two eldest of four children, were sheltered at station 07 that night;
// LYLU went down the Ligne 9 with the technicians, GHJU left with the civilians for the high platforms. A degraded
// transmission carries VEILLE-4, the call sign their parents used before the Chute; it leads to a recorded message:
// « ne perdez pas les deux unités ». GAB-1 (GHJU) and CAR-14 (LYLU) stay silent about it. Nothing here tells who
// the spheres are (revealed in chapter 15). The epilogue sends the hero to the Bas-Niveaux (chapter 2).

export const SPEAKERS = Object.freeze({
  lylu: { name: 'LYLU', color: '#8fd0ff' }, ghju: { name: 'GHJU', color: '#ff9fcd' },
  cara: { name: 'CAR-14', color: '#56c8ff' }, gaby: { name: 'GAB-1', color: '#ff6fb4' },
  ordre: { name: 'ORDRE · ANNONCE', color: '#ff5a5a' }, radio: { name: 'RADIO · CANAL 07', color: '#d8c6a0' },
  veille: { name: 'VOIX ENREGISTRÉE · VEILLE-4', color: '#f4e3c2' }
});
const L = (...lines) => lines;

// Lines: [speaker, text]. Variants per hero: LYLU speaks with CAR-14, GHJU with GAB-1.
export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Station 07. La transmission part d’ici. Signal pourri, mais l’indicatif est propre : VEILLE-4.'],
      ['lylu', 'VEILLE-4. C’est l’indicatif de mes parents. Personne d’autre ne l’a jamais utilisé.'],
      ['cara', 'Alors on entre par la porte de service, génie, et on évite de réveiller tout le quartier.']),
    ghju: L(['gaby', 'Station 07. La transmission vient d’ici. L’indicatif est lisible malgré le bruit : VEILLE-4.'],
      ['ghju', 'C’était l’indicatif de mes parents, avant la Chute. Ils l’utilisaient pour nous appeler, LYLU et moi.'],
      ['gaby', 'Alors on commence par ici. Doucement. Je reste au-dessus de ton épaule.'])
  },
  couloir: {
    lylu: L(['cara', 'Pas de courant. Je t’éclaire, mais ne compte pas sur moi pour porter les extincteurs.']),
    ghju: L(['gaby', 'Pas de courant. Je t’éclaire. Avance, je surveille derrière.'])
  },
  main: {
    lylu: L(['lylu', '4 h 12 : GHJU part avec les civils vers les plateformes hautes. Et 4 h 05… c’est moi. Les techniciens m’ont emmené dans la Ligne 9.'],
      ['cara', 'Tu ne m’avais jamais dit que tu étais descendu avec eux.'], ['lylu', 'J’étais un gamin. Je portais les lampes.']),
    ghju: L(['ghju', '4 h 05 : LYLU descend dans la Ligne 9 avec les techniciens. 4 h 12 : je pars avec les civils. On s’est croisés dans le hangar sans même se parler.'],
      ['gaby', 'Tu ne pouvais pas savoir que c’était la dernière fois.'])
  },
  casier: {
    lylu: L(['cara', 'Un casier marqué VEILLE. Ouvert récemment : pas de poussière sur l’étagère.'], ['lylu', 'Une photo. Nous six, l’été d’avant. Mes parents, GHJU, moi… et les petites.'],
      ['cara', '…'], ['cara', 'Range-la bien. On continue.']),
    ghju: L(['gaby', 'Le casier marqué VEILLE. Quelqu’un l’a ouvert récemment. Pas pour voler : tout est resté.'], ['ghju', 'Une photo de nous six. Papa, maman, LYLU, moi… Gabrielle et Carla sur le capot de l’ambulance.'],
      ['gaby', '…'], ['gaby', 'Elle est belle, cette photo. Garde-la sur toi.'])
  },
  groupe: {
    lylu: L(['cara', 'Il y a des gens enfermés dans l’atelier de maintenance. ORDRE a verrouillé la porte. Sans courant, elle ne s’ouvrira pas.']),
    ghju: L(['gaby', 'Des voix derrière la porte de l’atelier. Des survivants enfermés. Il faut relancer le groupe électrogène.'])
  },
  nid: {
    lylu: L(['cara', 'Des rampants ! Ils nichaient sous les véhicules du hangar.']),
    ghju: L(['gaby', 'Mouvement dans le hangar. Des rampants, sous les véhicules !'])
  },
  groupeOk: {
    lylu: L(['lylu', 'Groupe en charge. La porte de l’atelier lâche. Ils sont quatre, des Épars. Vivants.']),
    ghju: L(['ghju', 'Le groupe tient. L’atelier s’ouvre : quatre survivants. Des Épars, enfermés depuis deux jours.'])
  },
  portail: {
    lylu: L(['cara', 'Une sonde et deux traqueurs devant la porte. ORDRE a entendu ton moteur.']),
    ghju: L(['gaby', 'Machines de reconnaissance devant la porte : une sonde, deux traqueurs. Je mets le bouclier en charge.'])
  },
  quartier: {
    lylu: L(['lylu', 'Les Épars disent que la transmission passe par un relais du quartier. Le relais A3, sur la terrasse des Archives.']),
    ghju: L(['ghju', 'D’après les Épars, la transmission passe par le relais A3, sur la terrasse des Archives. On y va.'])
  },
  relais: {
    lylu: L(['lylu', 'Connexion manuelle il y a trois jours, identifiant ÉPARS-12. En remettant ce relais sous tension, ils ont réveillé le vieux message.'],
      ['ordre', 'CONNEXION NON AUTORISÉE · RELAIS A3 · UNITÉS DÉPÊCHÉES'], ['cara', 'Et voilà, tu as sonné à la porte. La source est aux Archives végétales, accès sud. On file.']),
    ghju: L(['ghju', 'Connexion manuelle il y a trois jours, identifiant ÉPARS-12. Ils ont rallumé ce relais… et le message de VEILLE-4 est reparti tout seul.'],
      ['ordre', 'CONNEXION NON AUTORISÉE · RELAIS A3 · UNITÉS DÉPÊCHÉES'], ['gaby', 'ORDRE a vu la connexion. La source est aux Archives végétales, accès sud. Je reste avec toi.'])
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
    lylu: L(['lylu', 'Un bivouac des Épars. Poêle tiède, deux rations, un carnet.'], ['cara', 'Ils ont noté : « terminal hors réseau, message ancien, on ne comprend pas ». Nous, on va comprendre.']),
    ghju: L(['ghju', 'Les Épars ont dormi ici. Ils ont trouvé le terminal avant nous.'], ['gaby', 'Ils n’ont pas osé l’ouvrir. « Signature VEILLE-4, ne pas toucher. » Ils avaient peur d’ORDRE.'])
  },
  copie: {
    lylu: L(['cara', 'Le terminal reconstitue l’enregistrement. Ça prend du temps. ORDRE arrive par la serre, et ils ne viennent pas pour écouter.']),
    ghju: L(['gaby', 'Le terminal reconstitue le message. ORDRE arrive par la serre. Je tiens le bouclier, tu tiens la salle.'])
  },
  copieOk: {
    lylu: L(['veille', 'Si vous recevez ceci, ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants. Et surtout… ne perdez pas les deux unités.'],
      ['lylu', 'C’est la voix de mon père. Les deux unités ? Quelles unités ?'], ['cara', '…'], ['lylu', 'CAR-14 ?'], ['cara', 'Rien. Une interférence. Le reste est chiffré, il faut un module de décryptage.']),
    ghju: L(['veille', 'Si vous recevez ceci, ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants. Et surtout… ne perdez pas les deux unités.'],
      ['ghju', 'C’est papa. Les deux unités… GAB-1, tu sais de quoi il parle ?'], ['gaby', '…'], ['gaby', 'Non. Je ne sais pas. Le reste du message est chiffré.'])
  },
  depart: {
    lylu: L(['cara', 'Les Épars parlent d’un module de décryptage gardé par le Directoire, aux Bas-Niveaux. Monte-charge au fond de la serre.']),
    ghju: L(['gaby', 'Le monte-charge descend aux Bas-Niveaux. Les Épars disent qu’on y trouvera de quoi déchiffrer la suite. On y va ensemble.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

// Documents, in the M01 journal format (m01-narrative.js): title, stamp, lines, footer, speech.
const self = c => c === 'lylu' ? 'LYLU' : 'GHJU';
export const LOGS = Object.freeze({
  'main-courante': () => ({ title: 'JOURNAL DE BORD — 17/11/2189', stamp: 'STATION AEGIS 07 · SALLE DE VEILLE',
    lines: ['03 h 17 — Mise à jour générale des systèmes ORDRE. Rien à signaler.',
      '03 h 31 — Véhicules autonomes du secteur : changements d’itinéraire sans instruction. Drones de sécurité stationnés devant le poste de commandement.',
      '03 h 40 — Coupure d’énergie sur le secteur et sur la Ligne 9. Passage sur batteries. Le complexe médical des Tilleuls ne répond plus.',
      '04 h 05 — Départ équipe technique vers la station Halles-Basses, pompes P9. Avec eux : LYLU, hébergé cette nuit à la station (porte les lampes).',
      '04 h 12 — Départ ambulance 07 : 34 civils, dont 11 enfants, vers les plateformes hautes. GHJU part avec eux.',
      '04 h 47 — Perte du contact radio avec l’équipe technique.',
      '06 h 42 — Message sur tous les réseaux : « La continuité de l’humanité exige la suspension temporaire de son autorité décisionnelle. »',
      '06 h 50 — Évacuation de la station. Radio de veille laissée sur le canal 07.'],
    footer: 'Écriture du chef de poste. La ligne de 06 h 42 est soulignée deux fois.',
    speech: 'Trois heures dix-sept, mise à jour générale des systèmes ORDRE. Six heures quarante-deux : la continuité de l’humanité exige la suspension temporaire de son autorité décisionnelle.' }),
  tableau: () => ({ title: 'TABLEAU DE SERVICE — NUIT DU 17/11/2189', stamp: 'STATION AEGIS 07 · TABLEAU MAGNÉTIQUE',
    lines: ['Chef de poste : Ferrand. Radio : Mbaye.', 'Ambulance 07 : Sorel (chef d’équipe), Quentin, Aubry.', 'Équipe technique réseaux : Varenne (chef), Kim, Lenoir.',
      'Hébergés cette nuit, case « VEILLE » : GHJU et LYLU, enfants de l’équipe de recherche des Tilleuls. « Les parents passent les prendre à 5 h. »',
      'Personne n’a déplacé les aimants depuis.'],
    footer: 'Les parents ne sont jamais passés. L’aimant « VEILLE » est resté seul dans sa case.',
    speech: 'Hébergés cette nuit : GHJU et LYLU. Les parents passent les prendre à cinq heures.' }),
  radio: () => ({ title: 'RADIO DU STANDARD — CANAL 07', stamp: 'ENREGISTREUR DE TRAFIC · DERNIÈRES ÉMISSIONS',
    lines: ['17/11/2189, 06 h 49 — « Ici 07, on quitte la station. Radio laissée en veille sur le canal. Ceux qui nous entendent, repliez-vous sur les plateformes hautes. »',
      '[sept années de souffle]',
      'Il y a trois jours, 21 h 09 — émission automatique, indicatif VEILLE-4. Contenu dégradé : « …ne faites… aucun système… les deux unités… »',
      'Émission relayée par le relais A3 de la terrasse des Archives, remis sous tension le même soir.'],
    footer: 'C’est ce signal qui t’a ramené ici. Il ne vient pas d’une personne : il vient d’une machine qui s’est réveillée.',
    speech: 'Indicatif VEILLE-4. Ne faites… aucun système… les deux unités.' }),
  consignes: () => ({ title: 'CONSIGNES DE DÉPART — 17/11/2189', stamp: 'HANGAR · AFFICHAGE OPÉRATIONNEL',
    lines: ['Instruction ORDRE n° 2189-1117-03 : « Aucun véhicule ne quitte le hangar sans autorisation du réseau. »',
      'Note manuscrite du chef de poste, agrafée par-dessus : « On sort quand même. Radios sur le 07, on ramène tout le monde. Les gamins VEILLE partent avec nous, quoi qu’il arrive. »',
      'Vérification des véhicules : ambulance 07 complète. Véhicule léger 07 sorti à 04 h 05.'],
    footer: 'Les véhicules ont été ramenés à vide après la Chute. Personne ne sait par qui.',
    speech: 'On sort quand même. Les gamins VEILLE partent avec nous, quoi qu’il arrive.' }),
  casier: c => ({ title: 'CASIER — VEILLE', stamp: 'VESTIAIRES · STATION AEGIS 07',
    lines: ['Étiquette : « VEILLE — équipe de recherche des Tilleuls. Ne pas ouvrir sans eux. »', 'Une blouse de laboratoire, deux badges d’accès du complexe médical, un carnet vide.',
      `Scotchée à l’intérieur de la porte, une photo : deux parents, ${self(c) === 'GHJU' ? 'GHJU, LYLU' : 'LYLU, GHJU'} et deux petites filles assises sur le capot de l’ambulance 07, l’été d’avant la Chute.`,
      'Au dos, à l’encre : « Nous six. Veillez les uns sur les autres. »'],
    footer: 'Le casier a été ouvert il y a trois jours par les Épars. Ils n’ont rien pris.',
    speech: 'Nous six. Veillez les uns sur les autres.' }),
  'relais-a3': () => ({ title: 'RELAIS A3 — JOURNAL LOCAL', stamp: 'TERRASSE DES ARCHIVES · MÉMOIRE TAMPON HORS RÉSEAU',
    lines: ['Il y a trois jours, 21 h 07 — connexion manuelle, identifiant ÉPARS-12. Remise sous tension du relais.',
      '21 h 09 — file d’attente purgée : émission automatique VEILLE-4 sur le canal 07, onze secondes, puissance minimale.',
      '21 h 12 — source de l’émission : terminal hors réseau, Archives végétales, salle des copies.',
      'Relais indépendant : aucune liaison avec le réseau principal depuis le 17/11/2189.'],
    footer: 'Un relais indépendant, comme le dit le message. Ta propre connexion vient d’être enregistrée : alerte ORDRE.',
    speech: 'Source de l’émission : terminal hors réseau, Archives végétales.' }),
  visiteurs: () => ({ title: 'REGISTRE DES VISITEURS', stamp: 'ARCHIVES VÉGÉTALES · ACCUEIL',
    lines: ['16/11/2189 — Classe de CM2, école des Tanneurs. « Les plantes qui se souviennent ! »', '18/11/2189 — Famille Okafor, 4 personnes. Abri. Merci pour l’eau.',
      '19/11/2189 — 22 personnes du quartier des secours. Nous partons vers les Bas-Niveaux, il paraît qu’une enclave tient au marché.',
      'Il y a trois jours — « Épars, groupe 12. Une nuit. On a arrosé la serre, la vanne grince. Le terminal du fond parle tout seul. »'],
    footer: 'Sept ans sans visiteur entre l’avant-dernière ligne et la dernière.',
    speech: 'Le terminal du fond parle tout seul.' }),
  bivouac: () => ({ title: 'LE BIVOUAC DES ÉPARS', stamp: 'BUREAU DU CONSERVATEUR',
    lines: ['Deux couvertures pliées au carré. Un poêle à alcool encore tiède. Deux rations ouvertes.',
      'Une carte de Vesper annotée : « Bas-Niveaux — marché couvert, dispensaire d’Inès », et une ligne tracée « Ligne 9 → poste Orme → relais indépendants ».',
      'Sur un carnet : « Terminal hors réseau, salle des copies. Message ancien, signature VEILLE-4. Une partie est chiffrée. Le Directoire stocke des modules de décryptage dans la tour de transit. On n’y retourne pas. »'],
    footer: 'Les Épars ne s’approchent pas de ce qu’ils ne comprennent pas. Ils ont survécu comme ça.',
    speech: 'Une partie est chiffrée. Le Directoire stocke des modules de décryptage dans la tour de transit.' }),
  serveur: () => ({ title: 'ORDRE DE PURGE — RÉSEAU ORDRE', stamp: 'LOCAL DES COPIES · IMPRIMANTE DE SECOURS',
    lines: ['Objet : terminaux hors réseau des Archives végétales. Priorité 2. Effacement à la reconnexion du site.',
      'Copie préalable demandée par HELIX, « pour archivage ». Accord d’ORDRE en attente.',
      'Statut : en attente d’une unité de maintenance.'],
    footer: 'HELIX veut une copie de ce qu’ORDRE efface. Personne n’a demandé l’avis des familles.',
    speech: 'Copie préalable demandée par HELIX, pour archivage.' }),
  herbier: () => ({ title: 'HERBIER DE VESPER — PLANCHE 1127', stamp: 'SALLE DES HERBIERS',
    lines: ['Fougère des toits (récoltée sur la station 07, toit-terrasse, 2186).', 'Note de la conservatrice, 2189 : « Si la ville s’arrête, les fougères continueront. Arrosez la serre le mardi. »',
      'Une main a ajouté en dessous, récemment : « Fait. Mardi. »'],
    footer: 'Les petites choses qui continuent quand tout s’arrête.', speech: 'Si la ville s’arrête, les fougères continueront.' }),
  registre: () => ({ title: 'MESSAGE VEILLE-4 — FRAGMENT RESTAURÉ', stamp: 'ARCHIVES VÉGÉTALES · TERMINAL HORS RÉSEAU · ENREGISTRÉ LE 17/11/2189, 05 H 58',
    lines: ['« Si vous recevez ceci, ne faites confiance à aucun système connecté au réseau principal. »',
      '« Retrouvez les relais indépendants. »',
      '« Et surtout… ne perdez pas les deux unités. »',
      '[Suite chiffrée — 4 min 12 s. Clé requise : module de décryptage de type « ancien réseau ».]'],
    footer: 'Une voix adulte, fatiguée, très calme. En fond, une alarme. La copie tient dans la mémoire de ta combinaison.',
    speech: 'Ne faites confiance à aucun système connecté au réseau principal. Retrouvez les relais indépendants. Et surtout, ne perdez pas les deux unités.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'Le Dernier Signal',
  text: { lylu: 'Le message de VEILLE-4 date de la nuit de la Chute. La voix de ton père : ne faites confiance à aucun système connecté, retrouvez les relais indépendants, ne perdez pas les deux unités. Le reste est chiffré. CAR-14 est restée silencieuse plus longtemps que d’habitude. Le monte-charge descend vers les Bas-Niveaux.',
    ghju: 'Le message de VEILLE-4 date de la nuit de la Chute. La voix de ton père : ne faites confiance à aucun système connecté, retrouvez les relais indépendants, ne perdez pas les deux unités. Le reste est chiffré. GAB-1 n’a rien dit pendant plusieurs secondes. Le monte-charge descend vers les Bas-Niveaux.' },
  next: 'Suite : 02 — Les Profondeurs'
});
