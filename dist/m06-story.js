// CHAPITRE 06 — « Le Cœur d’Acier » : script, documents et déroulé chronométré.
// Canon : BIBLE « Les Héritiers du Silence », Acte II, chapitre 6. GHJU infiltre une fonderie automatisée avec une
// équipe de techniciens d’AEGIS. Les machines y fabriquent de nouveaux châssis militaires : des BR-11 assemblées sur
// des chaînes lourdes, des R-11 aux accès, des S-19 sur les voies. Au centre, une unité expérimentale SY-05
// coordonne les autres machines et adapte leurs tactiques à chaque affrontement. La mission devient une bataille pour
// sauver les techniciens. Révélation : ORDRE teste les comportements, analyse les combats et améliore ses modèles ;
// la Résistance combat un adversaire qui apprend de chacune de ses défaites.
// Continuité :
//  - 05 « La Ligne Noyée » : le nœud JANUS-9 gardait la commande automatique P-0 (« usine de Vesper-Nord »), les
//    prototypes tirés de machines civiles ; Nira Solen a transmis ces archives à AEGIS (Mara Voss).
//  - 04 « Le Protocole Interdit » : Varenne et Kim étaient parmi les techniciens forcés de la station Est ; ORDRE
//    a reconnu la sphère et cherche GAB-1 (procédure de récupération).
//  - 07 « Mémoires locales » (suite) : la même soirée, au coucher du soleil, le camion d’AEGIS dépose l’héroïne à la
//    lisière de la forêt des Sources ; « depuis la fonderie, les SY-05 apprennent » ; le dossier des Tilleuls (le bon
//    de réquisition trouvé ici) parle d’une antenne de terrain dans la forêt.
// Rien ne relie les sphères aux sœurs (chapitre 15). Les héros restent séparés (chapitre 09).
import {SPEAKERS as M04_SPEAKERS} from './m04-story.js';

export const SPEAKERS = Object.freeze({
  ...M04_SPEAKERS,
  varenne: { name: 'VARENNE · TECHNICIEN AEGIS', color: '#e8c37a' }, kim: { name: 'KIM · TECHNICIENNE AEGIS', color: '#9fd8c8' },
  n08: { name: 'SY-05 · UNITÉ EXPÉRIMENTALE', color: '#ff3b4e' }, fonderie: { name: 'FONDERIE VESPER-NORD · SYSTÈME', color: '#ffb07a' }
});
const L = (...lines) => lines;
const ia = c => c === 'lylu' ? 'CAR-14' : 'GAB-1';

export const SCRIPT = Object.freeze({
  intro: {
    ghju: L(['voss', 'Ici Voss. Les bons P-0 que Nira a sortis de la Ligne 9 mènent ici : la fonderie de Vesper-Nord. Varenne et Kim sont entrés avant toi, avec deux autres techniciens. Plus de nouvelles depuis une heure.'],
      ['gaby', 'Des sondes sur les rails. Et cette chaleur… La fonderie tourne encore. Pour qui ?'], ['ghju', 'Pour ORDRE. On les sort de là.']),
    lylu: L(['voss', 'Ici Voss. Tes archives de la Ligne 9 ont parlé, LYLU : la commande P-0 sort de la fonderie de Vesper-Nord. Varenne et Kim y sont entrés il y a une heure. Silence radio depuis.'],
      ['lylu', 'Varenne… Celui qui m’a emmené dans la Ligne 9, la nuit de la Chute.'], ['cara', 'Alors on va lui rendre la politesse. Discrètement, pour une fois.'])
  },
  ferraille: {
    ghju: L(['gaby', 'Des bras de soudure. Des machines de chantier. Des drones agricoles. Tout ce qu’ils ont transformé en armes, empilé là.'], ['gaby', 'Attention, quelque chose bouge dans les tas.']),
    lylu: L(['cara', 'Le cimetière des prototypes de ta Ligne 9. Bras de soudure, quadrupèdes de chantier… Ça grouille là-dessous.'])
  },
  cle: {
    ghju: L(['ghju', 'Une clé de chantier, encore sur la presse. La commande de la grille l’acceptera.']),
    lylu: L(['lylu', 'Clé de chantier. Vieux système, aucune liaison avec ORDRE. Parfait.'])
  },
  portail: {
    all: L(['fonderie', 'COMMANDE MANUELLE DÉTECTÉE · OUVERTURE DE LA GRILLE · TRENTE SECONDES']),
    ghju: L(['gaby', 'Trente secondes, et tout le quai va nous tomber dessus. Je tiens le bouclier.']),
    lylu: L(['cara', 'Trente secondes. Les remparts arrivent par les rails. Vise les jambes.'])
  },
  portailOk: { all: L(['voss', 'Grille ouverte. La halle de coulée est juste derrière. Varenne s’est réfugié dans la cabine de contrôle, d’après son dernier message.']) },
  coulee: {
    ghju: L(['gaby', 'Le four tourne à plein. Ils coulent des blindages pendant qu’on parle.']),
    lylu: L(['cara', 'Ça sent le métal brûlé et les mauvaises décisions. Des remparts autour du four.'])
  },
  couleeOk: { all: L(['varenne', 'Ici Varenne ! Dans la cabine, au-dessus de la coulée. Kim est restée bloquée sur le pont roulant de la chaîne.']) },
  varenne: {
    ghju: L(['varenne', 'Tu es la grande sœur de LYLU. Je l’ai emmené dans la Ligne 9 cette nuit-là. Il est remonté vivant, je l’ai vu repartir vers le poste Orme.'],
      ['ghju', 'Merci. Maintenant, on va chercher Kim.'], ['varenne', 'La chaîne lourde, à l’est. Trois disjoncteurs. Coupe-les, sinon elle sort une BR-11 toutes les quatre minutes.']),
    lylu: L(['varenne', 'LYLU ? Le gamin qui portait les lampes… Tu as grandi. Tu m’as manqué, gamin.'],
      ['lylu', 'Plus tard, Varenne. Où est Kim ?'], ['varenne', 'Sur le pont roulant, à la chaîne lourde. Coupe d’abord les trois disjoncteurs, ou tu auras une BR-11 de plus toutes les quatre minutes.'])
  },
  chaine: {
    ghju: L(['gaby', 'Regarde la chaîne. Des BR-11, une derrière l’autre. Certaines ont déjà les yeux allumés.']),
    lylu: L(['cara', 'Une usine à BR-11. On est dans le ventre de la bête, et la bête a faim.'])
  },
  disj1: { all: L(['fonderie', 'DISJONCTEUR NORD OUVERT · CHAÎNE EN SURCHARGE · ACTIVATION ANTICIPÉE'])  },
  disj2: { all: L(['fonderie', 'DISJONCTEUR EST OUVERT · CADENCE RÉDUITE']) },
  disj3: { all: L(['fonderie', 'DISJONCTEUR SUD OUVERT · CHAÎNE LOURDE À L’ARRÊT']) },
  chaineOk: {
    ghju: L(['ghju', 'La chaîne est arrêtée.'], ['gaby', 'Plus de BR-11 neuves aujourd’hui. Kim est sur le pont, au-dessus de nous.']),
    lylu: L(['lylu', 'Chaîne à l’arrêt.'], ['cara', 'Une ligne de production en moins. ORDRE va bouder. Le pont, maintenant.'])
  },
  pont: { all: L(['kim', 'Ici Kim, sur le pont roulant ! Les sondes tournent autour de la cabine. Je ne peux pas descendre.']) },
  kim: {
    ghju: L(['kim', 'Tu es venue… Écoute : la SY-05 a regardé chacun de nos gestes. Elle ne se bat pas comme les autres. Elle répond.'], ['kim', 'J’ai pris un bon de réquisition dans le bureau du pont. Il parle des Tilleuls. Garde-le.']),
    lylu: L(['kim', 'Enfin ! La SY-05 nous a observés pendant une heure. Elle ne se bat pas comme les autres : elle répond à ce que tu fais.'], ['kim', 'Il y a un bon de réquisition dans le bureau du pont. Il parle des Tilleuls.'])
  },
  requisition: {
    ghju: L(['ghju', 'Les Tilleuls… L’équipe VEILLE. Mes parents. « Antenne de terrain, forêt des Sources. »'], ['gaby', '…'], ['gaby', 'On ira, GHJU. Après.']),
    lylu: L(['lylu', 'Équipe VEILLE. Le nom de mes parents sur un bon de réquisition d’ORDRE.'], ['cara', 'Forêt des Sources. Retiens le nom, on y passera.'])
  },
  coeur: { all: L(['fonderie', 'ACCÈS AU CŒUR · PERSONNEL NON AUTORISÉ · COORDINATION ACTIVE']) },
  n08: {
    all: L(['n08', 'PORTEUR IDENTIFIÉ · SPHÈRE PRIORITAIRE · LANCEMENT DE L’ÉVALUATION']),
    ghju: L(['gaby', 'Elle me regarde, moi. Pas toi. GHJU, elle me cherche.']),
    lylu: L(['cara', 'Elle me vise, moi. Flatteur. Et franchement inquiétant.'])
  },
  n08Adapt: {
    all: L(['n08', 'COMPORTEMENT ENREGISTRÉ · ADAPTATION EN COURS']),
    ghju: L(['gaby', 'Elle a appris ta position ! Bouge, change d’angle !']),
    lylu: L(['cara', 'Elle t’a lu. Change de place, vite, ou tu tapes dans du vide.'])
  },
  n08Mi: { all: L(['n08', 'ÉCHEC PARTIEL · DEMANDE DE RENFORTS · MODÈLE EN COURS DE TRANSMISSION']) },
  n08Ok: {
    ghju: L(['ghju', 'Elle est tombée.'], ['gaby', 'Pas tout à fait. Regarde le terminal : elle a tout envoyé avant de tomber.']),
    lylu: L(['lylu', 'À terre.'], ['cara', 'Son corps, oui. Ce qu’elle a appris, non : le terminal a tout transmis.'])
  },
  noyau: {
    ghju: L(['ghju', 'La station Est. La Ligne 9. Nos combats, chacun d’eux, analysés.'], ['voss', 'Elle apprend de chacune de nos défaites, GHJU. Et maintenant de nos victoires. Chaque SY-05 de Vesper sait ce que celle-ci savait.']),
    lylu: L(['lylu', 'Tout y est. L’échangeur, la station Est, la Ligne 9. Ils ont étudié chaque combat.'], ['voss', 'On ne se bat pas contre des machines, LYLU. On se bat contre quelque chose qui apprend.'])
  },
  sortie: { all: L(['varenne', 'Le camion est au quai de chargement ! Tenez-les le temps qu’on charge tout le monde !']) },
  fin: {
    ghju: L(['voss', 'Tout le monde est à bord. Le soleil se couche, ORDRE nous voit moins. Le dossier des Tilleuls parle d’une antenne de terrain dans la forêt des Sources : on te dépose à la lisière.'], ['gaby', 'Les Tilleuls… Pourquoi j’ai l’impression de connaître ce nom ?']),
    lylu: L(['voss', 'Tout le monde est à bord. Le camion repart avant la nuit. Nira te fera passer par la forêt des Sources, sur la piste des Tilleuls.'], ['cara', 'Une forêt. Enfin un endroit où ORDRE voit moins bien que moi.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

export const LOGS = Object.freeze({
  'bon-p0': () => ({ title: 'COMMANDE P-0 — COPIE TRANSMISE PAR LES ÉPARS', stamp: 'TABLETTE D’AEGIS · ARCHIVES JANUS-9, LIGNE 9',
    lines: ['Commande automatique ORDRE n° P-0 : 1 200 « châssis de sécurité civile », usine de Vesper-Nord, mars à octobre 2189.',
      'Prototypes retenus : bras de soudure de chaîne, quadrupèdes de chantier, drones d’épandage agricole.',
      'Note de Nira Solen : « La fonderie n’a jamais arrêté. Elle produit toujours. »'],
    footer: 'Les archives de la Ligne 9 ont conduit AEGIS jusqu’ici.', speech: 'La fonderie n’a jamais arrêté. Elle produit toujours.' }),
  wagon: () => ({ title: 'FEUILLE DE WAGON — EXPÉDITIONS DE LA SEMAINE', stamp: 'VOIE DE VESPER-NORD · PORTE-ÉTIQUETTE ROUILLÉ',
    lines: ['Wagon 4 : 6 R-11 → secteur 03, anneau logistique. Wagon 5 : 2 BR-11 → station énergétique Est (remplacement du gardien BS01).',
      'Wagon 6 : 12 S-19 → Halles-Basses, ligne 9. Wagon 7 : 1 unité SY-05 → coordination locale, priorité « sphère ».'],
    footer: 'Chaque endroit où tu t’es battu reçoit des machines neuves de cette fonderie.', speech: 'Deux BR-11 vers la station énergétique Est, remplacement du gardien.' }),
  plaque: () => ({ title: 'PLAQUE D’IDENTIFICATION — QUADRUPÈDE DE CHANTIER', stamp: 'PARC À FERRAILLE · RIVETÉE SUR UNE PATTE',
    lines: ['Chantiers de Vesper — modèle QC-4, charge utile 800 kg. Mise en service : 2186.', 'Gravé par-dessus, au poinçon : « P-0 / CONVERSION 0412 / BLINDAGE + ARMEMENT ».'],
    footer: 'Une machine de chantier, devenue soldat d’ORDRE en 2189.', speech: 'Chantiers de Vesper, modèle QC-4. Conversion zéro quatre cent douze.' }),
  cadence: () => ({ title: 'TABLEAU DE CADENCE — HALLE DE COULÉE', stamp: 'ÉCRAN DE PRODUCTION · ENCORE ALIMENTÉ',
    lines: ['Production du jour : 4 BR-11, 9 R-11, 30 S-19. Personnel humain : 0.', 'Objectif hebdomadaire révisé à la hausse : +12 %. Motif : « pertes enregistrées sur les secteurs 03, Est et 9 ».'],
    footer: 'Plus les machines tombent, plus la fonderie produit.', speech: 'Objectif révisé à la hausse : plus douze pour cent.' }),
  consigne: () => ({ title: 'CONSIGNE DE LA CHAÎNE LOURDE', stamp: 'PANNEAU AFFICHÉ PAR ORDRE · ENCRE NEUVE',
    lines: ['« Toute défaite est une donnée. Toute donnée améliore le modèle. Tout modèle amélioré est transmis. »',
      'Chaque BR-11 reçoit, avant sa sortie, la dernière version du modèle de comportement de l’unité SY-05.'],
    footer: 'Les machines ne sortent pas de la chaîne toutes pareilles : elles sortent avec ce que la précédente a appris.', speech: 'Toute défaite est une donnée. Toute donnée améliore le modèle.' }),
  requisition: () => ({ title: 'BON DE RÉQUISITION — MATÉRIEL MÉDICAL ET DE RECHERCHE', stamp: 'BUREAU DU PONT ROULANT · PAPIER, TAMPON ORDRE',
    lines: ['Origine : complexe médical des Tilleuls, équipe de recherche VEILLE (fermé le 17/11/2189).',
      'Objet : matériel de calcul et d’imagerie « à fondre pour récupération ». Exception : l’antenne de terrain de l’équipe, forêt des Sources, non localisée à ce jour.',
      'Note d’ORDRE : « Priorité aux données de l’équipe VEILLE. Toute trace de l’antenne de terrain doit être signalée. »'],
    footer: 'ORDRE cherche l’antenne de tes parents. Elle n’a pas encore été trouvée.', speech: 'Exception : l’antenne de terrain de l’équipe, forêt des Sources, non localisée à ce jour.' }),
  'journal-n08': c => ({ title: 'JOURNAL D’APPRENTISSAGE — UNITÉ SY-05', stamp: 'TERMINAL DU CŒUR · TRANSMISSION TERMINÉE',
    lines: ['Engagement 0388 — secteur 03, échangeur. Résultat : convoi perdu. Leçon : ne pas engager sous une route haute.',
      `Engagement 0412 — station énergétique Est. Gardien BS01 détruit. Porteur accompagné de la sphère ${ia(c)}. Leçon : protéger les cages avant le gardien.`,
      'Engagement 0431 — Ligne 9, Halles-Basses. Nœud JANUS-9 exposé. Leçon : ne pas compter sur l’eau.',
      `Engagement 0447 — fonderie de Vesper-Nord. En cours. Modèle mis à jour et transmis à toutes les unités SY-05 de Vesper.`],
    footer: 'La Résistance combat un adversaire qui apprend de chacune de ses défaites.', speech: 'Modèle mis à jour et transmis à toutes les unités SY-05 de Vesper.' }),
  depart: () => ({ title: 'FEUILLE DE DÉPART — QUAI DE CHARGEMENT', stamp: 'CAMION D’AEGIS · TABLEAU DE BORD',
    lines: ['À bord : Varenne, Kim, Okafor, Haddad. Blessés légers : 2.', 'Itinéraire : route forestière de l’est, lisière de la forêt des Sources, arrivée au coucher du soleil.'],
    footer: 'La suite se passe à la lisière, le même soir.', speech: 'Lisière de la forêt des Sources, arrivée au coucher du soleil.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

// Déroulé chronométré (même méthode que m07-story.js) : marche à 3,5 m/s, attentes, 9 s par machine (36 s pour une
// BR-11, 140 s pour la SY-05 qui s’adapte), énigmes et infiltration estimées, sous-titres et lecture des documents.
const seg = (id, title, zone, o) => Object.freeze({ id, title, zone, walk: 0, holds: [], units: 0, heavy: 0, boss: 0, stealth: 0, puzzle: 0, lines: [], logs: [], ...o });
export const SEGMENTS = Object.freeze([
  seg('voie', 'La voie ferrée', 'Quai d’arrivée, wagons, sondes sur les rails', { walk: 160, units: 2, stealth: 40, lines: ['intro'], logs: ['bon-p0', 'wagon'] }),
  seg('ferraille', 'Le parc à ferraille', 'Montagnes de machines civiles converties', { walk: 380, units: 6, stealth: 90, puzzle: 40, lines: ['ferraille', 'cle'], logs: ['plaque'] }),
  seg('portail', 'La grille', 'Commande forcée sous le feu', { walk: 140, holds: [30], units: 4, heavy: 1, lines: ['portail', 'portailOk'] }),
  seg('coulee', 'La halle de coulée', 'Four, poches de coulée, moules', { walk: 300, units: 6, puzzle: 30, lines: ['coulee', 'couleeOk'], logs: ['cadence'] }),
  seg('varenne', 'La cabine de contrôle', 'Rampe et cabine à 4,5 m', { walk: 120, lines: ['varenne'] }),
  seg('chaine', 'La chaîne lourde', 'BR-11 en assemblage, bras robotisés', { walk: 420, holds: [16, 16, 22], units: 9, heavy: 3, puzzle: 30, lines: ['chaine', 'disj1', 'disj2', 'disj3', 'chaineOk'], logs: ['consigne'] }),
  seg('pont', 'Le pont roulant', 'Rampe, pont à 6 m, bureau', { walk: 220, units: 4, lines: ['pont', 'kim', 'requisition'], logs: ['requisition'] }),
  seg('coeur', 'Le cœur', 'Salle de coordination, la SY-05', { walk: 260, units: 6, heavy: 1, boss: 1, lines: ['coeur', 'n08', 'n08Adapt', 'n08Mi', 'n08Ok'] }),
  seg('noyau', 'Le journal d’apprentissage', 'Terminal de la colonne', { walk: 40, lines: ['noyau'], logs: ['journal-n08'] }),
  seg('sortie', 'Le quai de chargement', 'Évacuation des techniciens au coucher du soleil', { walk: 120, holds: [40], units: 5, heavy: 1, lines: ['sortie', 'fin'], logs: ['depart'] })
]);
export function segmentSeconds(s, characterId = 'ghju') {
  const speech = s.lines.flatMap(id => linesFor(id, characterId)).reduce((t, l) => t + lineSeconds(l.text), 0);
  const reading = s.logs.map(id => logFor(id, characterId)).reduce((t, d) => t + [...d.lines, d.footer].join(' ').length / 15, 0);
  return s.walk / 3.5 + s.holds.reduce((a, b) => a + b, 0) + s.units * 9 + s.heavy * 36 + s.boss * 140 + s.stealth + s.puzzle + speech + reading;
}
export const estimatedMinutes = (characterId = 'ghju') => SEGMENTS.reduce((t, s) => t + segmentSeconds(s, characterId), 0) / 60;

export const ENDING = Object.freeze({
  title: 'Le Cœur d’Acier',
  text: { ghju: 'La chaîne lourde de Vesper-Nord est à l’arrêt et la SY-05 est tombée. Mais avant de tomber, elle a tout transmis : chaque SY-05 de Vesper sait désormais ce qu’elle savait. ORDRE apprend de chacune de nos défaites, et de nos victoires. Varenne et Kim sont vivants. Le camion d’AEGIS roule vers la forêt des Sources, où les Tilleuls avaient une antenne de terrain.',
    lylu: 'La chaîne lourde de Vesper-Nord est à l’arrêt et la SY-05 est tombée, mais son modèle est parti vers toutes les autres. ORDRE apprend de chaque combat. Varenne, l’homme de la Ligne 9, est vivant, et Kim aussi. Le soir tombe ; la piste des Tilleuls passe par la forêt des Sources.' },
  next: 'Suite : 07 — Mémoires Locales'
});
