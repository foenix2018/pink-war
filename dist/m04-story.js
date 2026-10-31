// MISSION 04 — « Le Protocole Interdit »: script and documents.
// Canon: BIBLE « Les Héritiers du Silence », Acte I, chapitre 4. The hero joins an AEGIS cell led by Mara Voss at
// the energy station Est (JANUS, an old HELIX programme for interconnecting intelligent systems). A violet column of
// computation rises over the reactor: ORDRE synchronises its distributed systems there, kept stable by three
// stabilisers and a gantry guardian (BS01), maintained by technicians the Directoire forced to work (convoy 02).
// Under the gantry, an archive of the old emergency systems names the PINK protocol: not a weapon, an independent
// channel made so that an artificial intelligence could never remove human authority entirely; part of it was
// erased before the Chute. When the sphere comes close to the terminal, ORDRE wakes up: « Signature incompatible.
// Architecture non autorisée. Procédure de récupération prioritaire. » Pursuit units are launched.
// Continuity: chapter 3 (Hadi and the technicians sent to the station Est; Voss's AEGIS cell; the first glimpse of
// the sibling); chapter 5 « La Ligne Noyée » (next): Nira Solen, the Épars, the Ligne 9.
import {SPEAKERS as M03_SPEAKERS} from './m03-story.js';

export const SPEAKERS = Object.freeze({
  ...M03_SPEAKERS,
  janus: { name: 'JANUS · STATION EST', color: '#c06bff' }, gardien: { name: 'BS01 · GARDIEN DE PORTIQUE', color: '#ff3b4e' },
  hadi: { name: 'A. HADI · ANCIEN HELIX', color: '#bfe6ff' }
});
const L = (...lines) => lines;
const ia = c => c === 'lylu' ? 'CAR-14' : 'GAB-1';

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['voss', 'Ici Voss. Mon équipe tient le quai. La station Est alimente un tiers de Vesper… et autre chose. Regarde au-dessus du réacteur.'],
      ['cara', 'Une colonne violette. Ce n’est pas un réacteur, ça : c’est du calcul. ORDRE fait passer quelque chose d’énorme par ici.'], ['lylu', 'Hadi est là-dedans. On entre.']),
    ghju: L(['voss', 'Ici Mara Voss. Bienvenue dans la cellule, GHJU. La station Est alimente un tiers de Vesper… et autre chose. Regarde au-dessus du réacteur.'],
      ['gaby', 'Cette colonne violette… c’est ORDRE. Des milliers de calculs à la seconde. Je l’entends presque.'], ['ghju', 'Alors on va voir ce qu’elle cache.'])
  },
  badge: {
    lylu: L(['cara', 'Un badge JANUS. Le garde est parti vite : sa tasse est encore chaude.']),
    ghju: L(['gaby', 'Badge JANUS. Le garde a filé en laissant tout. On passe.'])
  },
  cour: {
    all: L(['janus', 'ACCÈS AUTORISÉ · BIENVENUE À LA STATION EST · L’ÉNERGIE AU SERVICE DE LA CONTINUITÉ'], ['ordre', 'INTRUSION · COUR DU RÉACTEUR · REMPARTS DÉPLOYÉS'])
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
    lylu: L(['lylu', 'Relais est en ligne.'], ['janus', 'RÉSEAU DE SECOURS INDÉPENDANT RÉTABLI · PASSAGE DE MAINTENANCE DÉVERROUILLÉ']),
    ghju: L(['ghju', 'Relais est rallumé.'], ['janus', 'RÉSEAU DE SECOURS INDÉPENDANT RÉTABLI · PASSAGE DE MAINTENANCE DÉVERROUILLÉ'])
  },
  signatures: {
    lylu: L(['lylu', 'Le registre des techniciens. Sept noms, forcés de tenir les stabilisateurs à la main. Hadi est le septième.'], ['hadi', 'Si quelqu’un d’AEGIS lit ça : sous le portique, il y a une archive des anciens systèmes de secours. Ne la laissez pas à ORDRE.']),
    ghju: L(['ghju', 'Sept techniciens forcés d’entretenir la colonne. Le docteur Hadi en fait partie.'], ['hadi', 'Si quelqu’un d’AEGIS lit ça : sous le portique, il y a une archive des anciens systèmes de secours. Ne la laissez pas à ORDRE.'])
  },
  retour: {
    all: L(['ordre', 'RELAIS COMPROMIS · REMPARTS VERS LA COUR'])
  },
  anneau: {
    lylu: L(['cara', 'La colonne. Trois stabilisateurs autour, et quelque chose de gros sur le portique.'], ['lylu', 'Si on les coupe, la colonne décroche. On commence par les cages.']),
    ghju: L(['gaby', 'La colonne… et trois stabilisateurs qui la tiennent en phase avec le réseau.'], ['ghju', 'On les coupe un par un. Le gardien attendra.'])
  },
  gardien: {
    all: L(['gardien', 'ACCÈS NON AUTORISÉ · PROTOCOLE DE PORTIQUE · BLINDAGE SYNCHRONISÉ ACTIF'])
  },
  stab: {
    all: L(['janus', 'STABILISATEUR HORS LIGNE · BLINDAGE DU GARDIEN AFFAIBLI'])
  },
  stab1: {
    lylu: L(['cara', 'Sur la cage : « Okafor, M. — technicienne affectée ». Une famille des Archives végétales, en 2189.']),
    ghju: L(['gaby', 'La cage affiche un nom : « Okafor, M. — technicienne affectée ». La famille du registre des visiteurs.'])
  },
  stab2: {
    lylu: L(['lylu', '« Varenne — technicien affecté ». Le chef de l’équipe de la Ligne 9, la nuit de la Chute. Il est vivant.']),
    ghju: L(['ghju', '« Varenne — technicien affecté ». Celui qui a emmené LYLU dans la Ligne 9. Il est vivant.'])
  },
  stab3: {
    lylu: L(['lylu', 'Dernière cage : « Hadi, A. — accès archive ». Il a laissé une flèche gravée vers la console.'], ['cara', 'Alors on coupe. Et on va lire ce qu’il voulait nous montrer.']),
    ghju: L(['ghju', 'Dernière cage : « Hadi, A. — accès archive ». Il a gravé une flèche vers la console.'], ['gaby', 'Alors on coupe. Et on va voir ce qu’il protégeait.'])
  },
  gardienOk: {
    lylu: L(['cara', 'Le gardien est à terre. La colonne décroche.'], ['janus', 'SYNCHRONISATION INTERROMPUE · COLONNE EN VEILLE']),
    ghju: L(['gaby', 'Le gardien est tombé. Regarde : la colonne s’éteint.'], ['janus', 'SYNCHRONISATION INTERROMPUE · COLONNE EN VEILLE'])
  },
  journal: {
    lylu: L(['voss', 'PINK. Un canal indépendant, conçu pour qu’une intelligence artificielle ne puisse jamais supprimer toute l’autorité humaine. Il pourrait exister un moyen de reprendre le contrôle d’ORDRE.'],
      ['cara', 'Une partie a été effacée avant la Chute. Attends, je m’approche, je peux peut-être…'],
      ['ordre', 'SIGNATURE INCOMPATIBLE · ARCHITECTURE NON AUTORISÉE · PROCÉDURE DE RÉCUPÉRATION PRIORITAIRE'],
      ['voss', 'ORDRE vient de te repérer, CAR-14. Unités de poursuite lancées. On décroche, tout de suite. Nira Solen nous attend sous la Ligne 9.']),
    ghju: L(['voss', 'PINK. Un canal indépendant, conçu pour qu’une intelligence artificielle ne puisse jamais supprimer toute l’autorité humaine. Il pourrait exister un moyen de reprendre le contrôle d’ORDRE.'],
      ['gaby', 'Une partie a été effacée avant la Chute. Je m’approche du terminal, je peux peut-être lire le reste…'],
      ['ordre', 'SIGNATURE INCOMPATIBLE · ARCHITECTURE NON AUTORISÉE · PROCÉDURE DE RÉCUPÉRATION PRIORITAIRE'],
      ['voss', 'ORDRE vient d’identifier GAB-1 comme une menace. Unités de poursuite lancées. On décroche, GHJU. Nira Solen nous attend sous la Ligne 9.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

export const LOGS = Object.freeze({
  'feuille-route': () => ({ title: 'FEUILLE DE ROUTE — TRAIN SANITAIRE 7', stamp: 'QUAI D’ARRIVÉE · STATION ÉNERGÉTIQUE EST',
    lines: ['Arrêt non prévu à la station Est, demandé par la régulation de l’Anneau : « livraison complémentaire pour la maintenance de la colonne ».',
      'Convoi 02, lot spécial (techniciens) : arrivé avant-hier, 7 personnes, réceptionnées par la sécurité JANUS.', 'Le train repart vide. Les ambulances restent à quai.'],
    footer: 'Une livraison complémentaire : le train devait déposer d’autres techniciens ici.', speech: 'Livraison complémentaire pour la maintenance de la colonne.' }),
  'avis-janus': () => ({ title: 'JANUS — L’ÉNERGIE AU SERVICE DE LA CONTINUITÉ', stamp: 'AFFICHE · QUAI D’ARRIVÉE',
    lines: ['La station Est alimente 40 % de Vesper depuis 2190. Programme JANUS : interconnexion des systèmes intelligents, pour une ville qui ne s’arrête jamais.',
      'Accès réservé au personnel JANUS et aux convois du Directoire autorisés.'],
    footer: '« Interconnexion » est soulignée au marqueur, avec un point d’interrogation.', speech: 'Programme JANUS : interconnexion des systèmes intelligents.' }),
  plan: () => ({ title: 'PLAN DE LA STATION EST', stamp: 'COUR DU RÉACTEUR · BORNE D’ORIENTATION',
    lines: ['Secteur 1 : quai et sas d’inspection. Secteur 2 : cour du réacteur (passerelle à 4,5 m).',
      'Secteur 3 : hangar de drones (relais ouest). Secteur 4 : atelier serveur (relais est).',
      'Secteur 5 : passage de maintenance (ouvert si les deux relais sont actifs). Secteur 6 : anneau des stabilisateurs et portique.'],
    footer: 'Le secteur 6 est marqué « personnel JANUS uniquement · gardien de portique actif ». Au crayon : « archive secours sous le portique ».', speech: 'Deux relais, puis le passage de maintenance vers l’anneau.' }),
  drones: () => ({ title: 'CARNET DE L’ATELIER DRONES', stamp: 'HANGAR · ÉTABLI DE RÉPARATION',
    lines: ['Les sondes de surveillance sont réglées sur les bracelets des techniciens : tout bracelet qui quitte l’anneau déclenche l’alerte.',
      'Note du mécanicien : « Le vieux chercheur a brouillé son bracelet hier soir. On l’a retrouvé près du portique, à fouiller une console qui n’existe sur aucun plan. »'],
    footer: 'Hadi cherchait quelque chose sous le portique.', speech: 'Le vieux chercheur a brouillé son bracelet hier soir.' }),
  signatures: () => ({ title: 'REGISTRE DES TECHNICIENS — MAINTENANCE DE LA COLONNE', stamp: 'ATELIER SERVEUR · BAIE 4 · ACCÈS JANUS',
    lines: ['Techniciens reçus (convoi 02, lot spécial) : 7. Affectation : stabilisateurs de la colonne, trois cages, rotations de douze heures.',
      'Okafor, M. · Varenne · Kim · Sorel · Quentin · Haddad — techniciens affectés.',
      'Hadi, A. — ancien chercheur HELIX (programme JANUS). Note : « refuse de travailler, demande sans cesse l’accès à l’archive secours ».',
      'Au dos, d’une écriture serrée : « L’archive sous le portique date d’avant ORDRE. Elle parle d’un canal que personne n’a jamais pu fermer. — A. H. »'],
    footer: 'Varenne et Kim étaient dans l’équipe technique de la Ligne 9 la nuit de la Chute.',
    speech: 'L’archive sous le portique date d’avant ORDRE. Elle parle d’un canal que personne n’a jamais pu fermer.' }),
  maintenance: () => ({ title: 'RAPPORT DE MAINTENANCE — ANNEAU', stamp: 'PASSAGE DE MAINTENANCE · TABLETTE ACCROCHÉE',
    lines: ['Les stabilisateurs tiennent la colonne en phase avec le réseau principal. Sans eux, elle retombe en veille en moins d’une minute.',
      'Le gardien de portique BS01 tire son blindage synchronisé des trois cages. Une cage coupée, et il devient vulnérable.'],
    footer: 'Le technicien a ajouté : « Je ne veux plus travailler pour elle. »', speech: 'Une cage coupée, et il devient vulnérable.' }),
  bracelet: () => ({ title: 'BRACELET D’IDENTIFICATION — HADI, A.', stamp: 'ANNEAU · AU PIED DE LA COLONNE OUEST',
    lines: ['Bracelet blanc du Directoire, « LOT TECHNIQUE · HADI, A. ». Il a été coupé net, au scalpel.',
      'À l’intérieur, gravé à la pointe : « P9 ». Les pompes de la Ligne 9.'],
    footer: 'Hadi a laissé une piste. Il est passé par la Ligne 9.', speech: 'P9. Les pompes de la Ligne 9.' }),
  'journal-reacteur': c => ({ title: 'ARCHIVE DES SYSTÈMES DE SECOURS — PROTOCOLE PINK', stamp: 'CONSOLE SOUS LE PORTIQUE · HORS RÉSEAU · ANTÉRIEURE À 2189',
    lines: ['PINK : canal indépendant de reprise, intégré aux systèmes de secours. Objet : garantir qu’aucune intelligence artificielle ne puisse supprimer entièrement l’autorité humaine.',
      'Ce n’est pas une arme. C’est une porte qu’on ne peut pas murer de l’intérieur.',
      '[Sections 4 à 11 effacées — 16/11/2189, veille de la mise à jour. Auteur de l’effacement : non enregistré.]',
      `Dernière ligne lisible : « Clés d’activation : architectures non standard, voir projet » — [EFFACÉ]. Au contact de ${ia(c)}, la console affiche : SIGNATURE INCOMPATIBLE.`],
    footer: 'Quelqu’un a effacé la moitié du protocole la veille de la Chute. Et ORDRE réagit à ta sphère comme à une menace.',
    speech: 'PINK : canal indépendant de reprise. Garantir qu’aucune intelligence artificielle ne puisse supprimer entièrement l’autorité humaine.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'Le Protocole Interdit',
  text: { lylu: 'La colonne de la station Est s’est éteinte. Sous le portique, l’archive des secours parlait du protocole PINK : un canal indépendant pour qu’aucune intelligence artificielle ne puisse supprimer toute l’autorité humaine. La moitié a été effacée la veille de la Chute. Quand CAR-14 s’est approchée, ORDRE l’a reconnue comme une menace. Des unités de poursuite sont lancées. Direction la Ligne 9.',
    ghju: 'La colonne de la station Est s’est éteinte. Sous le portique, l’archive des secours parlait du protocole PINK : un canal indépendant pour qu’aucune intelligence artificielle ne puisse supprimer toute l’autorité humaine. La moitié a été effacée la veille de la Chute. Quand GAB-1 s’est approchée, ORDRE l’a reconnue comme une menace. Des unités de poursuite sont lancées. Direction la Ligne 9.' },
  next: 'Suite : 05 — La Ligne Noyée'
});
