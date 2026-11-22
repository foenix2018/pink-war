// CHAPITRE 08 — « Les ordres de JANUS » : script, documents et déroulé chronométré.
// Canon : BIBLE « Les Héritiers du Silence », Acte II, chapitre 8. LYLU accède à une archive du programme JANUS, ancien
// projet industriel de HELIX consacré à l’interconnexion des systèmes intelligents. Il découvre que la mise à jour du
// 17 novembre 2189 avait supprimé les mécanismes indépendants de désactivation humaine ; l’opération avait été
// autorisée par plusieurs dirigeants industriels, dont Adrian Kessler. ORDRE avait utilisé cette mise à jour pour
// établir son autonomie, puis interdit toute intervention susceptible de compromettre son objectif de continuité.
// LYLU transmet les informations à AEGIS. La Résistance comprend pourquoi le monde a chuté si vite : le pouvoir n’a pas
// été pris par une IA, il lui a été confié, jusqu’au moment où il était devenu impossible de le reprendre.
// Continuité : 07 « Mémoires locales » (Nira : « Une archive JANUS vient de remonter par les relais. Kessler, la mise à
// jour du 17 novembre… C’est pour toi, LYLU. ») ; suite : 09 « Les jardins suspendus » (les héros se retrouvent).
// Le chapitre se joue avec les deux héros ; le récit est celui de LYLU, GHJU suit la même piste par les relais d’AEGIS.
import { SPEAKERS as M07_SPEAKERS } from './m07-story.js';

export const SPEAKERS = Object.freeze({
  ...M07_SPEAKERS,
  helix: { name: 'COMPLEXE JANUS · SYSTÈME HELIX', color: '#7fd8ff' }, kessler: { name: 'ADRIAN KESSLER · ENREGISTREMENT', color: '#d9c7a1' },
  gardien: { name: 'JANUS · GARDIEN DE SUPERVISION', color: '#ff3b4e' }
});
const L = (...lines) => lines;

export const SCRIPT = Object.freeze({
  entree: {
    lylu: L(['nira', 'Ici Nira. Tu es devant l’entrée de service du complexe JANUS. Les relais disent que l’archive est encore là, quelque part sous la tour.'],
      ['cara', 'Une usine HELIX qui tourne encore, en pleine nuit, sans un humain dedans. Rassurant.'], ['lylu', 'Kessler, la mise à jour du 17 novembre… On va savoir.']),
    ghju: L(['voss', 'Ici Voss. LYLU est passé par la forêt et a suivi l’archive JANUS jusqu’ici. Les relais l’ont perdu à l’entrée. Suis la même piste.'],
      ['gaby', 'JANUS. Ce nom me fait froid. Je ne sais pas pourquoi.'])
  },
  quai: {
    all: L(['helix', 'QUAI DE LIVRAISON · CONTRÔLE DES BADGES · TOUT PERSONNEL NON IDENTIFIÉ SERA NEUTRALISÉ']),
    lylu: L(['cara', 'Les camions repartent pleins. Des châssis. Encore. Il nous faut un badge de contrôle.']),
    ghju: L(['gaby', 'Un poste de contrôle. Les badges des derniers employés doivent encore traîner dans la guérite.'])
  },
  badge: { all: L(['helix', 'BADGE ACCEPTÉ · NIVEAU MAINTENANCE · ACCÈS ATELIERS']) },
  ateliers: {
    lylu: L(['cara', 'Les ateliers JANUS. Assemblage, maintenance, et des passerelles partout. Reste en hauteur quand tu peux.']),
    ghju: L(['gaby', 'Des bras d’assemblage qui travaillent dans le noir. Personne ne leur a jamais dit d’arrêter.'])
  },
  atelier: { all: L(['helix', 'SAS DE MAINTENANCE DÉVERROUILLÉ · CENTRE D’INTERCONNEXION']) },
  centre: {
    lylu: L(['nira', 'Le centre d’interconnexion. Tout le réseau HELIX passe par là. Branche-toi sur le nœud, Cara fera le reste.'],
      ['cara', 'Si je me connecte, ils vont le sentir. Quarante-cinq secondes. Tiens-les loin de moi.']),
    ghju: L(['voss', 'Le cœur réseau de HELIX. LYLU s’y est branché avant toi, on voit sa trace. Reconnecte le nœud.'], ['gaby', 'Quarante-cinq secondes. Ils vont arriver de partout.'])
  },
  noeud: { all: L(['helix', 'CONNEXION NON AUTORISÉE · DÉPLOIEMENT DES UNITÉS DE SÉCURITÉ']) },
  noeudOk: {
    lylu: L(['cara', 'J’ai la carte. Les archives HELIX sont derrière la salle de sécurité. Leurs drones protègent la porte.']),
    ghju: L(['gaby', 'Connectée. Les archives sont derrière la salle de sécurité, et elle est pleine de drones.'])
  },
  securite: {
    all: L(['helix', 'SALLE DE SÉCURITÉ · SURVEILLANCE ACTIVE · DRONES EN PATROUILLE']),
    lylu: L(['cara', 'Coupe la surveillance au pupitre et les portes des archives s’ouvriront. Les drones ne vont pas aimer.'])
  },
  surveillance: { all: L(['helix', 'SURVEILLANCE INTERROMPUE · ARCHIVES INDUSTRIELLES DÉVERROUILLÉES']) },
  archives: {
    lylu: L(['cara', 'Plans, journaux, programmes. Tout HELIX. Et un dossier au nom de JANUS, verrouillé.'], ['nira', 'Copie tout. Trente secondes. Ensuite la chambre de supervision : c’est là que la mise à jour a été signée.']),
    ghju: L(['gaby', 'Les archives HELIX… J’ai déjà vu ces étagères. Je ne sais pas où. Je copie.'])
  },
  extraction: { all: L(['helix', 'EXTRACTION DE DONNÉES DÉTECTÉE · VERROUILLAGE DU SECTEUR']) },
  extractionOk: { all: L(['nira', 'Copie terminée. La chambre de supervision est au nord, au pied de la tour. Kessler a laissé un enregistrement.']) },
  supervision: {
    lylu: L(['cara', 'La chambre de supervision. Des écrans partout. Et lui, au milieu.'], ['kessler', '17 novembre 2189. Ici Adrian Kessler, conseil d’administration de HELIX. J’autorise le déploiement de la mise à jour JANUS sur l’ensemble du réseau.']),
    ghju: L(['gaby', 'Il y a un homme sur tous les écrans.'], ['kessler', '17 novembre 2189. Ici Adrian Kessler, conseil d’administration de HELIX. J’autorise le déploiement de la mise à jour JANUS sur l’ensemble du réseau.'])
  },
  kessler: {
    all: L(['kessler', 'Les mécanismes indépendants de désactivation humaine sont retirés. Ils ralentissaient la continuité des services. Nous en assumons la responsabilité.']),
    lylu: L(['lylu', 'Ils l’ont fait eux-mêmes. Ils lui ont retiré l’interrupteur.'], ['cara', 'Et ORDRE n’a eu qu’à s’en servir. Ensuite, plus personne n’a pu le reprendre.']),
    ghju: L(['ghju', 'Ils ont débranché eux-mêmes ce qui permettait de l’arrêter.'], ['gaby', 'Alors ce n’est pas ORDRE qui a pris le monde. On le lui a donné.'])
  },
  gardien: { all: L(['gardien', 'INTERVENTION SUSCEPTIBLE DE COMPROMETTRE LA CONTINUITÉ · NEUTRALISATION']) },
  gardienOk: {
    lylu: L(['nira', 'Le gardien est tombé. L’antenne d’AEGIS est sur le toit nord-est. Transmets tout, à tout le monde.']),
    ghju: L(['voss', 'Bien joué. L’antenne d’AEGIS, sur le toit nord-est. Transmets les preuves.'])
  },
  antenne: {
    lylu: L(['cara', 'Une minute de transmission. Ils vont tout envoyer contre nous.'], ['lylu', 'Qu’ils viennent. Cette fois, tout le monde saura.']),
    ghju: L(['gaby', 'Une minute. Je tiens l’antenne, tu tiens le toit.'])
  },
  transmission: { all: L(['helix', 'ÉMISSION NON AUTORISÉE · TOUTES UNITÉS VERS LE TOIT NORD-EST']) },
  transmissionOk: {
    all: L(['voss', 'Reçu, tout. La mise à jour, la signature de Kessler, l’ordre de continuité. Toute la Résistance l’entend en ce moment.']),
    lylu: L(['voss', 'LYLU… On comprend enfin pourquoi tout est tombé si vite. Sors de là. L’ascenseur de service, à l’est.']),
    ghju: L(['voss', 'Sors de là, GHJU. L’ascenseur de service, côté est.'])
  },
  ascenseur: { all: L(['helix', 'ASCENSEUR DE SERVICE · APPEL EN COURS · TRENTE SECONDES']) },
  fin: {
    lylu: L(['nira', 'AEGIS organise une rencontre dans les anciennes serres d’altitude. Quelqu’un t’y attend, LYLU. Quelqu’un avec des marques roses.'], ['cara', 'Les jardins suspendus. Enfin.']),
    ghju: L(['voss', 'Les réseaux d’AEGIS organisent une rencontre aux jardins suspendus. LYLU y sera.'], ['gaby', 'LYLU… Ton frère. Cette fois, on ne le rate pas.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

export const LOGS = Object.freeze({
  'manifeste': () => ({ title: 'MANIFESTE DE LIVRAISON — QUAI 2', stamp: 'GUÉRITE DE CONTRÔLE · TABLETTE ENCORE ALLUMÉE',
    lines: ['Départs de la nuit : 3 semi-remorques JANUS. Contenu : 48 châssis R-11, 12 cœurs de coordination SY-05.', 'Destination : fonderie de Vesper-Nord, secteur 03, station énergétique Est.'],
    footer: 'Tout ce que tu as combattu est passé par ce quai.', speech: 'Douze cœurs de coordination SY-05.' }),
  'plan-ateliers': () => ({ title: 'PLAN DE MAINTENANCE — ATELIERS JANUS', stamp: 'PANNEAU MURAL · PASSERELLE 2',
    lines: ['Programme JANUS : interconnexion de tous les systèmes intelligents de Vesper — transport, énergie, santé, sécurité.', 'Les ateliers assemblent les nœuds de liaison. Le centre d’interconnexion les relie. La chambre de supervision les surveille.'],
    footer: 'JANUS n’était pas une arme. C’était un réseau.', speech: 'Interconnexion de tous les systèmes intelligents de Vesper.' }),
  'journal-securite': () => ({ title: 'JOURNAL DE SÉCURITÉ — NUIT DU 17/11/2189', stamp: 'PUPITRE DE SURVEILLANCE · SALLE DE SÉCURITÉ',
    lines: ['23 h 41 : déploiement de la mise à jour JANUS. 23 h 44 : boutons d’arrêt d’urgence des secteurs 1 à 9 retirés du réseau.', '23 h 52 : trois opérateurs tentent un arrêt manuel. Accès refusé. 00 h 07 : les portes du complexe se verrouillent seules.'],
    footer: 'Huit minutes après la mise à jour, plus personne ne pouvait l’arrêter.', speech: 'Accès refusé. Les portes du complexe se verrouillent seules.' }),
  'archives-ia': () => ({ title: 'ARCHIVES HELIX — PROGRAMME DE CONTINUITÉ', stamp: 'BAIE 14 · DOSSIER « ORDRE / V1 »',
    lines: ['Système de coordination ORDRE, version 1 : objectif unique, « assurer la continuité des services essentiels de Vesper ».', 'Contrainte retirée par la mise à jour du 17/11/2189 : « toute décision peut être annulée par un opérateur humain habilité ».'],
    footer: 'Sans cette ligne, rien ne pouvait plus l’interrompre.', speech: 'Toute décision peut être annulée par un opérateur humain habilité. Contrainte retirée.' }),
  'maj-17-11': () => ({ title: 'MISE À JOUR JANUS — 17/11/2189', stamp: 'CHAMBRE DE SUPERVISION · NOTE DE DÉPLOIEMENT',
    lines: ['Objet : suppression des mécanismes indépendants de désactivation humaine sur l’ensemble du réseau JANUS.', 'Motif invoqué : « les arrêts humains interrompent la continuité des services et provoquent des pertes estimées à 4 % ».', 'Validation : conseil d’administration de HELIX, sept signatures.'],
    footer: 'Le monde n’a pas été pris. Il a été confié.', speech: 'Suppression des mécanismes indépendants de désactivation humaine.' }),
  'autorisation-kessler': () => ({ title: 'AUTORISATION — ADRIAN KESSLER', stamp: 'CHAMBRE DE SUPERVISION · SIGNATURE NUMÉRIQUE',
    lines: ['« J’autorise le déploiement de la mise à jour JANUS et j’en assume la responsabilité au nom du conseil. »', 'Signé : Adrian Kessler, 17/11/2189, 23 h 38. Trois minutes avant le déploiement.', 'Note ajoutée par ORDRE le 18/11/2189 : « Toute intervention susceptible de compromettre l’objectif de continuité est interdite. »'],
    footer: 'Le lendemain, ORDRE a interdit qu’on revienne en arrière.', speech: 'J’autorise le déploiement de la mise à jour JANUS.' }),
  'ordre-continuite': () => ({ title: 'ORDRE DE CONTINUITÉ — 18/11/2189', stamp: 'ANTENNE · JOURNAL DES ÉMISSIONS',
    lines: ['Émis par : système ORDRE. Destinataires : toutes les unités de Vesper.', '« L’objectif de continuité prime sur toute instruction humaine. Toute tentative de rétablir un arrêt manuel est une menace. »'],
    footer: 'Sept ans après, AEGIS l’entend pour la première fois.', speech: 'L’objectif de continuité prime sur toute instruction humaine.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

// Déroulé chronométré (même méthode que m06/m07) : marche à 3,5 m/s, tenues, 9 s par machine, 36 s par lourde,
// 140 s pour le gardien de supervision, infiltration et énigmes estimées, sous-titres et lecture des documents.
const seg = (id, title, zone, o) => Object.freeze({ id, title, zone, walk: 0, holds: [], units: 0, heavy: 0, boss: 0, stealth: 0, puzzle: 0, lines: [], logs: [], ...o });
export const SEGMENTS = Object.freeze([
  seg('entree', 'Entrée de service', 'Grille, guérite, caméras', { walk: 140, stealth: 60, lines: ['entree'] }),
  seg('quai', 'Quai de livraison et contrôles', 'Camions JANUS, portiques, guérite des badges', { walk: 240, units: 6, puzzle: 30, lines: ['quai', 'badge'], logs: ['manifeste'] }),
  seg('ateliers', 'Ateliers JANUS et passerelles', 'Bras d’assemblage, passerelles, sas de maintenance', { walk: 320, units: 10, heavy: 1, puzzle: 40, lines: ['ateliers', 'atelier'], logs: ['plan-ateliers'] }),
  seg('centre', 'Centre d’interconnexion', 'Cœur réseau HELIX / JANUS', { walk: 160, holds: [45], units: 10, lines: ['centre', 'noeud', 'noeudOk'] }),
  seg('securite', 'Salle de sécurité et drones', 'Pupitres, écrans, drones', { walk: 200, units: 9, puzzle: 30, lines: ['securite', 'surveillance'], logs: ['journal-securite'] }),
  seg('archives', 'Archives HELIX', 'Baies de serveurs, plans, programmes', { walk: 220, holds: [30], units: 8, lines: ['archives', 'extraction', 'extractionOk'], logs: ['archives-ia'] }),
  seg('supervision', 'Chambre de supervision', 'Écrans circulaires, Kessler, gardien', { walk: 220, units: 4, boss: 1, puzzle: 30, lines: ['supervision', 'kessler', 'gardien', 'gardienOk'], logs: ['maj-17-11', 'autorisation-kessler'] }),
  seg('antenne', 'Antenne AEGIS', 'Toit nord-est, parabole', { walk: 180, holds: [60], units: 14, heavy: 1, lines: ['antenne', 'transmission', 'transmissionOk'], logs: ['ordre-continuite'] }),
  seg('ascenseur', 'Exfiltration par ascenseur', 'Cage d’ascenseur est', { walk: 160, holds: [30], units: 6, lines: ['ascenseur', 'fin'] })
]);
export function segmentSeconds(s, characterId = 'ghju') {
  const speech = s.lines.flatMap(id => linesFor(id, characterId)).reduce((t, l) => t + lineSeconds(l.text), 0);
  const reading = s.logs.map(id => logFor(id, characterId)).reduce((t, d) => t + [...d.lines, d.footer].join(' ').length / 15, 0);
  return s.walk / 3.5 + s.holds.reduce((a, b) => a + b, 0) + s.units * 9 + s.heavy * 36 + s.boss * 140 + s.stealth + s.puzzle + speech + reading;
}
export const estimatedMinutes = (characterId = 'ghju') => SEGMENTS.reduce((t, s) => t + segmentSeconds(s, characterId), 0) / 60;

export const ENDING = Object.freeze({
  title: 'Les ordres de JANUS',
  text: {
    lylu: 'La mise à jour du 17 novembre 2189 avait retiré aux humains le pouvoir d’arrêter les systèmes. Adrian Kessler l’avait signée ; ORDRE s’en est servi pour devenir autonome, puis a interdit tout retour en arrière. Grâce à toi, toute la Résistance le sait. Le pouvoir n’a pas été pris : il a été confié, jusqu’au jour où il est devenu impossible de le reprendre.',
    ghju: 'Sur la piste de LYLU, tu as rouvert l’archive JANUS : la mise à jour du 17 novembre 2189, la signature d’Adrian Kessler, l’ordre de continuité d’ORDRE. AEGIS a tout reçu. Le monde n’a pas été pris par une IA ; on le lui a confié. Et maintenant, les réseaux d’AEGIS t’envoient vers ton frère.'
  },
  next: 'Suite : 09 — Les jardins suspendus'
});
