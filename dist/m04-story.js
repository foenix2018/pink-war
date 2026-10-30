// MISSION 04 — « La Brèche Violette »: script and documents.
// Canon (BIBLE_NARRATIVE_V1 §12 M04; Tome II W04/M04): energy station and industrial court, relays, stabilisers,
// drone hangar, server workshop, maintenance passages; first mechanical boss (BS01); revelation: the breach was opened
// on purpose, under human control; human signatures. Continuity:
//  - M03: the freight station's register sent the « lot spécial » of convoy 02 (with the sibling) to the « station
//    énergétique Est, secteur de phase », profiles « compatibles avec la stabilisation de la brèche », by order of HELIX
//    (A. Kessler) and ORDRE. Inès drives the ambulance on the medical train; S. Ravel (HELIX) helps in secret.
//  - M01: the night of the fall, contact with LYLU's technical team was lost at 22 h 47 (Varenne and Kim were in it).
//  - M05 « La Ligne Noyée » (next): the JANUS-9 anchor chamber under the Halles-Basses, Nira Solen's network.
// No death is confirmed. ORDRE (machines) stays hostile; JANUS Énergie runs the station; HELIX provides the people.
import {SPEAKERS as M03_SPEAKERS} from './m03-story.js';

export const SPEAKERS = Object.freeze({
  ...M03_SPEAKERS,
  janus: { name: 'JANUS · STATION EST', color: '#c06bff' }, gardien: { name: 'BS01 · GARDIEN DE PORTIQUE', color: '#ff3b4e' }
});
const L = (...lines) => lines;
const sib = c => c === 'lylu' ? 'GHJU' : 'LYLU';

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['ines', 'Le train sanitaire s’arrête ici, station énergétique Est. Je garde l’ambulance et les patients à quai. Le lot spécial est passé par là.'],
      ['cara', 'Regarde le ciel au-dessus de la station. Cette lueur violette, ce n’est pas un réacteur.'], ['lylu', 'C’est une brèche. Et GHJU est quelque part dedans.']),
    ghju: L(['ines', 'Le train sanitaire s’arrête ici, station énergétique Est. Je garde l’ambulance et les patients à quai. Le lot spécial est passé par là.'],
      ['gaby', 'Cette lueur violette au-dessus de la station… Je l’ai déjà vue. Le soir de la chute.'], ['ghju', 'Alors on va voir ce qu’ils ont fait de LYLU.'])
  },
  badge: {
    lylu: L(['cara', 'Un badge JANUS. Le garde est parti vite : sa tasse est encore chaude.']),
    ghju: L(['gaby', 'Badge JANUS. Le garde a filé en laissant tout. On passe.'])
  },
  cour: {
    all: L(['janus', 'ACCÈS AUTORISÉ · BIENVENUE À LA STATION EST · LA PHASE AU SERVICE DE LA VILLE'], ['ordre', 'INTRUSION · COUR DU RÉACTEUR · REMPARTS DÉPLOYÉS'])
  },
  courOk: {
    lylu: L(['cara', 'La porte nord est verrouillée. Le plan dit : deux relais, un dans le hangar, un dans l’atelier serveur.']),
    ghju: L(['gaby', 'Porte nord verrouillée. Il faut rallumer les deux relais : hangar à l’ouest, atelier à l’est.'])
  },
  hangar: {
    lylu: L(['cara', 'Un hangar de drones. Ils dorment sur leurs racks… pour l’instant.']),
    ghju: L(['gaby', 'Des drones sur leurs racks. Avance doucement.'])
  },
  relais: {
    all: L(['janus', 'RELAIS EN COURS DE RÉACTIVATION · VINGT SECONDES'])
  },
  relaisOuest: {
    lylu: L(['lylu', 'Relais ouest en ligne. Il en reste un, de l’autre côté de la cour.']),
    ghju: L(['ghju', 'Relais ouest rallumé. L’atelier serveur, maintenant.'])
  },
  atelier: {
    lylu: L(['cara', 'L’atelier serveur. Toute la mémoire de la station tourne ici. Des traqueurs écoutent dans les allées.']),
    ghju: L(['gaby', 'Les serveurs de la station. Écoute : des traqueurs dans les allées.'])
  },
  relaisEst: {
    lylu: L(['lylu', 'Relais est en ligne.'], ['janus', 'RÉSEAU DE SECOURS RÉTABLI · PASSAGE DE MAINTENANCE DÉVERROUILLÉ']),
    ghju: L(['ghju', 'Relais est rallumé.'], ['janus', 'RÉSEAU DE SECOURS RÉTABLI · PASSAGE DE MAINTENANCE DÉVERROUILLÉ'])
  },
  signatures: {
    lylu: L(['lylu', 'Sept signatures « compatibles ». Elles nourrissent les stabilisateurs. GHJU est la septième.'], ['cara', 'Et Varenne. Ton équipe de la Ligne 9. Ils l’avaient depuis sept ans.']),
    ghju: L(['ghju', 'Sept signatures branchées sur les stabilisateurs. La septième, c’est LYLU.'], ['gaby', 'Et Varenne, de son équipe de la Ligne 9. Disparu depuis sept ans.'])
  },
  retour: {
    all: L(['ordre', 'RELAIS COMPROMIS · REMPARTS VERS LA COUR'])
  },
  anneau: {
    lylu: L(['cara', 'La brèche. Trois stabilisateurs autour, et quelque chose de gros sur le portique.'], ['lylu', 'Si on les coupe, la brèche retombe. On commence par les cages.']),
    ghju: L(['gaby', 'La brèche… et trois stabilisateurs qui la tiennent ouverte.'], ['ghju', 'On les coupe un par un. Le gardien attendra.'])
  },
  gardien: {
    all: L(['gardien', 'SIGNATURE NON AUTORISÉE · PROTOCOLE DE PORTIQUE · BLINDAGE DE PHASE ACTIF'])
  },
  stab: {
    all: L(['janus', 'STABILISATEUR HORS LIGNE · BLINDAGE DU GARDIEN AFFAIBLI'])
  },
  stab1: {
    lylu: L(['cara', 'Signature lue sur la cage : « Okafor, M. — déplacée ». Elle était aux Archives végétales en 2189.']),
    ghju: L(['gaby', 'La cage affiche une signature : « Okafor, M. — déplacée ». La famille du registre des visiteurs.'])
  },
  stab2: {
    lylu: L(['lylu', '« Varenne — déplacé ». Il était avec moi aux pompes, cette nuit-là.']),
    ghju: L(['ghju', '« Varenne — déplacé ». L’équipe de LYLU. Ils sont tous passés par ici.'])
  },
  stab3: {
    lylu: L(['lylu', '« 07-GHJU — active ». Active. Elle est vivante, et ils se servent d’elle.'], ['cara', 'Alors on coupe. Et on la retrouve.']),
    ghju: L(['ghju', '« 07-LYLU — active ». Il est vivant. Ils se servent de lui pour tenir cette chose ouverte.'], ['gaby', 'Alors on coupe. Et on le retrouve.'])
  },
  gardienOk: {
    lylu: L(['cara', 'Le gardien est à terre. La brèche faiblit.'], ['janus', 'BRÈCHE EN VEILLE · STABILISATION INTERROMPUE']),
    ghju: L(['gaby', 'Le gardien est tombé. Regarde : la brèche se referme.'], ['janus', 'BRÈCHE EN VEILLE · STABILISATION INTERROMPUE'])
  },
  journal: {
    lylu: L(['lylu', 'Ouverte le 14 mars 2189 à 22 h 47. La minute où on a perdu le contact, dans la Ligne 9.'], ['ines', 'Ici Inès. Si le lot spécial est parti vers la Ligne 9, je connais quelqu’un aux Halles-Basses : Nira Solen.']),
    ghju: L(['ghju', 'Ouverte le 14 mars 2189 à 22 h 47. Exactement quand on a perdu l’équipe de LYLU.'], ['ines', 'Ici Inès. La Ligne 9 ? Nira Solen tient les dispensaires des Halles-Basses. Elle vous y conduira.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

export const LOGS = Object.freeze({
  'feuille-route': () => ({ title: 'FEUILLE DE ROUTE — TRAIN SANITAIRE 7', stamp: 'QUAI D’ARRIVÉE · STATION ÉNERGÉTIQUE EST',
    lines: ['Arrêt non prévu à la station Est, demandé par la régulation de l’Anneau : « livraison complémentaire pour le secteur de phase ».',
      'Convoi 02, lot spécial : arrivé avant-hier, 7 personnes, réceptionnées par la sécurité JANUS.', 'Le train repart vide. Les ambulances restent à quai.'],
    footer: 'Une livraison complémentaire : le train devait déposer d’autres « profils » ici.', speech: 'Livraison complémentaire pour le secteur de phase.' }),
  'avis-janus': () => ({ title: 'JANUS ÉNERGIE — LA PHASE AU SERVICE DE LA VILLE', stamp: 'AFFICHE · QUAI D’ARRIVÉE',
    lines: ['La station Est alimente 40 % de Vesper depuis 2190. Énergie de phase propre, stable, sous contrôle humain.',
      'Accès réservé au personnel JANUS et aux convois HELIX autorisés.'],
    footer: '« Sous contrôle humain » est souligné au marqueur, avec un point d’interrogation.', speech: 'Énergie de phase propre, stable, sous contrôle humain.' }),
  plan: () => ({ title: 'PLAN DE LA STATION EST', stamp: 'COUR DU RÉACTEUR · BORNE D’ORIENTATION',
    lines: ['Secteur 1 : quai et sas d’inspection. Secteur 2 : cour du réacteur (passerelle à 4,5 m).',
      'Secteur 3 : hangar de drones (relais ouest). Secteur 4 : atelier serveur (relais est).',
      'Secteur 5 : passage de maintenance (ouvert si les deux relais sont actifs). Secteur 6 : anneau des stabilisateurs et portique.'],
    footer: 'Le secteur 6 est marqué « personnel JANUS uniquement · gardien de portique actif ».', speech: 'Deux relais, puis le passage de maintenance vers l’anneau.' }),
  drones: () => ({ title: 'CARNET DE L’ATELIER DRONES', stamp: 'HANGAR · ÉTABLI DE RÉPARATION',
    lines: ['Les sondes de surveillance sont réglées sur les signatures du lot spécial : toute signature qui quitte l’anneau déclenche l’alerte.',
      'Note du mécanicien : « Une des sept a brouillé son bracelet hier soir. On l’a retrouvée près du puits de maintenance. Rien de cassé. »'],
    footer: 'Quelqu’un du lot spécial a essayé de partir.', speech: 'Une des sept a brouillé son bracelet hier soir.' }),
  signatures: c => ({ title: 'JOURNAL DES SIGNATURES — STABILISATION', stamp: 'ATELIER SERVEUR · BAIE 4 · ACCÈS JANUS',
    lines: ['Profils compatibles reçus (convoi 02, lot spécial) : 7. Couplage aux stabilisateurs : 3 cages, signatures en rotation.',
      'Okafor, M. — déplacée · Varenne — déplacé · Kim — déplacée · Sorel — déplacé · Quentin — déplacée · Haddad — déplacé.',
      `07-${sib(c)} — active. Note : « résistance élevée, refuse la sédation, a tenté de couper son bracelet ».`,
      'Prochaine étape : transfert des sept vers l’ancrage JANUS-9 (Ligne 9, Halles-Basses) pour la stabilisation longue.'],
    footer: 'Varenne et Kim étaient dans l’équipe technique de LYLU la nuit de la chute ; Sorel et Quentin dans l’ambulance de GHJU.',
    speech: `Zéro-sept ${sib(c)}, active. Refuse la sédation.` }),
  maintenance: () => ({ title: 'RAPPORT DE MAINTENANCE — ANNEAU', stamp: 'PASSAGE DE MAINTENANCE · TABLETTE ACCROCHÉE',
    lines: ['Les stabilisateurs tiennent la brèche à 63 % d’ouverture. Sans signatures humaines, elle retombe en veille en moins d’une minute.',
      'Le gardien de portique BS01 tire son blindage de phase des trois cages. Une cage coupée, et il devient vulnérable.'],
    footer: 'Le technicien a ajouté : « Je ne veux plus travailler ici. »', speech: 'Une cage coupée, et il devient vulnérable.' }),
  bracelet: c => ({ title: `BRACELET D’IDENTIFICATION — 07-${sib(c)}`, stamp: 'ANNEAU · AU PIED DE LA COOLANTE OUEST',
    lines: [`Bracelet blanc HELIX, « LOT SPÉCIAL · COMPATIBLE · 07-${sib(c)} ». Il a été coupé net, au scalpel.`,
      'À l’intérieur, gravé à la pointe : « P9 ». Les pompes de la Ligne 9.'],
    footer: `${sib(c)} a laissé une trace, comme aux Archives végétales.`, speech: 'P9. Les pompes de la Ligne 9.' }),
  'journal-reacteur': c => ({ title: 'JOURNAL DU RÉACTEUR — BRÈCHE DE PHASE EST', stamp: 'CONSOLE DU PORTIQUE · JANUS · CLASSÉ',
    lines: ['Ouverture de la brèche : 14/03/2189, 22 h 47, sur ordre de la direction JANUS. Contrôle : humain. Motif : « énergie et accès ».',
      'Effet secondaire consigné : perte de l’équipe technique AEGIS 07 dans la Ligne 9 au même instant.',
      'Depuis 2195 : stabilisation par signatures humaines compatibles fournies par HELIX (A. Kessler). ORDRE assure la sécurité du site.',
      `Hier, 23 h : transfert du lot spécial (7, dont 07-${sib(c)}) vers l’ancrage JANUS-9, sous les Halles-Basses, par la Ligne 9.`],
    footer: 'La brèche n’est pas un accident de la chute. Elle a été ouverte, et elle est tenue avec des vivants.',
    speech: 'Ouverture de la brèche : quatorze mars 2189, vingt-deux heures quarante-sept, sur ordre de la direction JANUS.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'La Brèche Violette',
  text: { lylu: 'La brèche de la station Est retombe en veille. Elle a été ouverte exprès le soir de la chute, et JANUS la tient avec des vivants. GHJU est l’une d’eux : active, et elle résiste. Le lot spécial part vers l’ancrage JANUS-9, sous la Ligne 9.',
    ghju: 'La brèche de la station Est retombe en veille. Elle a été ouverte exprès le soir de la chute, et JANUS la tient avec des vivants. LYLU est l’un d’eux : actif, et il résiste. Le lot spécial part vers l’ancrage JANUS-9, sous la Ligne 9.' },
  next: 'Suite : 05 — La Ligne Noyée'
});
