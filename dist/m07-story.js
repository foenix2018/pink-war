// CHAPITRE 07 — « Mémoires locales » : scénario (script, documents, déroulé chronométré). Le niveau n'est pas
// encore construit : ce fichier est la référence d'écriture, au même format que m03-story.js / m04-story.js,
// et tests/375-m07-scenario.test.mjs vérifie sa durée et sa cohérence avec la bible.
// Canon : BIBLE « Les Héritiers du Silence », Acte II, chapitre 7. Les deux héros, toujours séparés, suivent des
// indices qui convergent vers un ancien centre médical ; GHJU s'y rend la première. Elle y trouve un dossier en
// partie détruit au nom de ses parents : transfert de structures cognitives humaines vers des supports
// artificiels, projet TRANSCENDANCE. GAB-1 refuse malgré elle d'ouvrir une partie des fichiers, entre en
// protection, souffre pour la première fois d'un souvenir : « Je ne sais pas… Mais je crois que je suis déjà
// venue ici. » Ce lieu n'est PAS le complexe médical du chapitre 15 (effacé de toutes les cartes, retrouvé au
// chapitre 14) : c'est le Centre de la Cascade, l'antenne de terrain de l'équipe de recherche des Tilleuls (VEILLE).
// Continuité : 01 (VEILLE-4, les Tilleuls, la photo « nous six »), 04 (ORDRE a reconnu la sphère : procédure de
// récupération), 05 (Tomas, Nira Solen, les archives de production transmises à Mara Voss), 06 (la fonderie, SY-05
// qui apprend). Suite : 08 « Les ordres de JANUS » (LYLU). Les compétences avancées des sphères s'ouvrent ici
// (« compétences avancées à la mission 7 » dans companion-menu.js). Aucun lien sphères ↔ sœurs n'est dit.
import {SPEAKERS as M04_SPEAKERS} from './m04-story.js';

export const SPEAKERS = Object.freeze({
  ...M04_SPEAKERS,
  nira: { name: 'NIRA SOLEN · ÉPARS', color: '#f2d38a' }, tomas: { name: 'TOMAS · ÉPARS', color: '#b9d98a' }, reco: { name: 'SY-05 · UNITÉ DE RÉCUPÉRATION', color: '#ff3b4e' },
  centre: { name: 'CENTRE DE LA CASCADE · SYSTÈME LOCAL', color: '#9fe3d8' }
});
const L = (...lines) => lines;
const ia = c => c === 'lylu' ? 'CAR-14' : 'GAB-1';

export const SCRIPT = Object.freeze({
  lisiere: {
    ghju: L(['voss', 'Ici Voss. Depuis la fonderie, les SY-05 apprennent de chacun de nos combats. Et depuis la station Est, ORDRE cherche GAB-1. Le dossier des Tilleuls parle d’une antenne de terrain dans la forêt des Sources.'],
      ['tomas', 'Tomas, des Épars. Je connais la forêt. Sous les arbres, leurs sondes voient mal. Près de l’eau, leurs TR-15 n’entendent rien. Restez avec moi.'],
      ['gaby', 'C’est calme. Trop vert pour ORDRE. J’aime bien.']),
    lylu: L(['nira', 'Ici Nira. Les archives de la Ligne 9 citent une antenne des Tilleuls dans la forêt des Sources. Tomas t’attend à la lisière.'],
      ['tomas', 'Une autre armure est passée hier. Des marques roses. Elle a pris le sentier de la cascade.'],
      ['cara', 'Rose. Hier. Tu entends ça, LYLU ? On a un jour de retard. Pour une fois, ce n’est pas sept ans.'])
  },
  sousBois: {
    ghju: L(['gaby', 'S-19 au-dessus des arbres. Reste sous le couvert, elle ne te verra pas.']),
    lylu: L(['cara', 'Une S-19 là-haut. Sous les feuilles, tu es invisible. Profites-en, ça ne t’arrive pas souvent.'])
  },
  traqueur: { all: L(['tomas', 'Un TR-15. Il écoute. Marche sur la mousse, pas sur les branches.']) },
  gue: {
    ghju: L(['gaby', 'La rivière est haute. La vieille passerelle a un treuil, côté ruines.']),
    lylu: L(['cara', 'Passerelle relevée, treuil rouillé, rampants dans les roseaux. Le paradis.'])
  },
  treuil: { all: L(['tomas', 'Trente secondes de treuil. Ils montent par les roseaux, tenez la rive !']) },
  ruines: {
    all: L(['tomas', 'Le moulin et l’aqueduc. Trois cents ans de pierre. Les machines n’aiment pas ce qu’elles ne savent pas cartographier.']),
    ghju: L(['gaby', 'Des remparts dans la cour du moulin. Et une unité qui recule quand tu la vises : elle a appris à la fonderie.']),
    lylu: L(['cara', 'Une unité qui se met à couvert avant que tu tires. Elle a lu ton dossier. Moi aussi, d’ailleurs.'])
  },
  vanne: { all: L(['tomas', 'L’ancienne vanne de l’aqueduc. Si on détourne l’eau, la cascade baisse et le passage derrière s’ouvre.']) },
  vanneOk: { all: L(['centre', 'NIVEAU DU BASSIN EN BAISSE · ACCÈS DE SERVICE DÉGAGÉ']) },
  cascade: {
    ghju: L(['gaby', '…'], ['ghju', 'GAB-1 ?'], ['gaby', 'Ce bruit d’eau. Je le connais. Je ne sais pas d’où.']),
    lylu: L(['cara', 'Joli. Très carte postale.'], ['lylu', 'CAR-14 ?'], ['cara', 'Rien. Le bruit me brouille les capteurs. Avance.'])
  },
  toise: {
    ghju: L(['ghju', 'Des marques de taille gravées dans la roche. « GHJU, 2186. » « LYLU, 2186. » On est venus ici, petits. Je ne m’en souvenais plus.'],
      ['ghju', 'Et deux petites marques, plus bas. Sans nom.'], ['gaby', '…'], ['gaby', 'On continue, d’accord ?']),
    lylu: L(['lylu', '« LYLU, 2186. » C’est mon nom. Et celui de GHJU. Et deux marques sans nom, plus bas.'], ['cara', 'Les petites de ta photo ?'], ['lylu', 'Peut-être.'], ['cara', 'Allez. On continue.'])
  },
  grotte: {
    ghju: L(['gaby', 'Lampe frontale. La grotte descend vers le centre. Il y a un relais au fond : pas de réseau principal ici.']),
    lylu: L(['cara', 'Noir complet, eau partout, rampants probables. Je t’éclaire, technicien.'])
  },
  rampants: { all: L(['tomas', 'Ils nichent dans les galeries basses ! Ne restez pas dans l’eau !']) },
  turbine: { all: L(['centre', 'TURBINE HYDRAULIQUE · REDÉMARRAGE MANUEL · QUARANTE-CINQ SECONDES']) },
  turbineOk: {
    ghju: L(['ghju', 'Relais indépendant en ligne. « Retrouvez les relais indépendants. » On y est, papa.']),
    lylu: L(['lylu', 'Relais indépendant en ligne. Exactement ce que disait le message.'])
  },
  centre: {
    all: L(['centre', 'CENTRE DE LA CASCADE · ANTENNE DE TERRAIN · ÉQUIPE VEILLE · ACCÈS RESTREINT']),
    ghju: L(['gaby', 'Les arbres ont traversé le toit. Mais les serveurs sont secs.']),
    lylu: L(['cara', 'Quelqu’un est passé ici avant nous. Une porte forcée à l’épaule. Proprement. Rose sur la poignée.'])
  },
  dossier: {
    ghju: L(['ghju', 'Le nom de papa et maman, en tête de chaque page. Brûlé à moitié.'],
      ['ghju', '« Transfert de structures cognitives humaines vers des supports artificiels. Projet TRANSCENDANCE. »'],
      ['ghju', 'GAB-1, ouvre la suite. Les fichiers chiffrés.']),
    lylu: L(['lylu', 'La moitié du dossier a été emportée. Il reste le titre : « Projet TRANSCENDANCE ». Et les noms de mes parents.'],
      ['lylu', 'CAR-14, lis-moi les fichiers chiffrés.'])
  },
  protection: {
    ghju: L(['centre', 'ACCÈS REFUSÉ PAR LE PROCESSUS LOCAL · MODE PROTECTION'], ['gaby', 'Non… je… je ne peux pas. Ça fait mal, GHJU.'],
      ['ghju', 'GAB-1, qu’est-ce qui se passe ?'], ['gaby', 'Je ne sais pas… Mais je crois que je suis déjà venue ici.']),
    lylu: L(['centre', 'ACCÈS REFUSÉ PAR LE PROCESSUS LOCAL · MODE PROTECTION'], ['cara', 'Ah. Non. Pas ça. Je n’ouvre pas ça.'],
      ['lylu', 'CAR-14 ?'], ['cara', 'Je ne sais pas pourquoi. Je n’aime pas cet endroit. Et je crois que je le connais.'])
  },
  recuperation: {
    all: L(['reco', 'SIGNATURE INCOMPATIBLE LOCALISÉE · PROCÉDURE DE RÉCUPÉRATION · CIBLE : SPHÈRE · PORTEUR : SECONDAIRE']),
    ghju: L(['voss', 'GHJU, ORDRE a suivi GAB-1 jusqu’à toi. Une unité SY-05 et ses escortes. Tiens jusqu’à ce que Tomas ouvre l’ancienne route.']),
    lylu: L(['nira', 'LYLU, ils viennent pour CAR-14. Une SY-05 et son escorte. Tomas ouvre l’ancienne route, tiens le centre.'])
  },
  liaison: {
    ghju: L(['gaby', 'Quelque chose s’est ouvert en moi. Je peux faire plus que te suivre. Laisse-moi te protéger.']),
    lylu: L(['cara', 'Oh. Nouvelles options. Ciblage, surcharge… Tu vas adorer. Moi, j’adore déjà.'])
  },
  n08: { all: L(['reco', 'COMPORTEMENT DE LA CIBLE ENREGISTRÉ · ADAPTATION EN COURS']) },
  n08Ok: { all: L(['tomas', 'Elle est tombée ! Par l’aqueduc, vite, avant les suivantes !']) },
  fin: {
    ghju: L(['voss', 'Transfert de structures cognitives… Tes parents travaillaient sur quoi, GHJU ?'], ['ghju', 'Je ne sais pas. Mais GAB-1 le sait, quelque part.'], ['gaby', 'Pardon.'], ['ghju', 'Ne t’excuse pas. On trouvera. Ensemble.']),
    lylu: L(['nira', 'Une archive JANUS vient de remonter par les relais. Kessler, la mise à jour du 17 novembre… C’est pour toi, LYLU.'], ['cara', 'Pour une fois, c’est moi qui te demande de partir vite d’un endroit.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

export const LOGS = Object.freeze({
  sentier: () => ({ title: 'SENTIER DES SOURCES — PANNEAU D’ACCUEIL, 2188', stamp: 'LISIÈRE · BOIS GRAVÉ',
    lines: ['Boucle de la cascade : 6 km. Moulin et aqueduc du XXIIe siècle. Baignade interdite au bassin.', 'Antenne de recherche des Tilleuls : accès réservé au personnel.'],
    footer: 'Quelqu’un a gravé au couteau, sous le panneau : « ORDRE ne voit pas sous les feuilles. »', speech: 'Antenne de recherche des Tilleuls : accès réservé au personnel.' }),
  epars: () => ({ title: 'CARNET DES ÉPARS — GROUPE DE LA FORÊT', stamp: 'ABRI SOUS LES RACINES',
    lines: ['Règle 1 : jamais de feu à découvert. Règle 2 : traverser près de l’eau, les TR-15 n’entendent rien. Règle 3 : ne pas entrer dans le centre.',
      'Il y a deux saisons : une machine nouvelle passe le long de la rivière. Elle recule quand on la vise. Elle revient par un autre côté.'],
    footer: 'Les SY-05 sont arrivées dans la forêt après la fonderie.', speech: 'Elle recule quand on la vise. Elle revient par un autre côté.' }),
  moulin: () => ({ title: 'PLAQUE DU MOULIN', stamp: 'RUINES · PIERRE',
    lines: ['Moulin de la Source, 1904. Restauré en 2161. L’aqueduc alimentait la vallée jusqu’à la construction de Vesper.'],
    footer: 'Les ruines les plus anciennes de la région. Aucune carte d’ORDRE ne les détaille.', speech: 'Moulin de la Source, mille neuf cent quatre.' }),
  'relais-grotte': c => ({ title: 'RELAIS INDÉPENDANT — GROTTE DE LA CASCADE', stamp: 'MÉMOIRE LOCALE · AUCUNE LIAISON AVEC LE RÉSEAU PRINCIPAL',
    lines: ['Installé en 2187 par l’équipe VEILLE. « Aucune donnée de ce site ne transite par ORDRE. »',
      '17/11/2189, 05 h 51 — dernier accès : badge VEILLE. Commande : effacement partiel du dossier T. Interrompue.',
      `Il y a deux jours — tentative d’accès externe : ORDRE, procédure de récupération. Refusée. (${ia(c)} : « Ils savaient qu’on viendrait. »)`],
    footer: 'Six minutes avant le message enregistré du chapitre 01. Les parents sont passés par ici, ou leur badge.', speech: 'Aucune donnée de ce site ne transite par ORDRE.' }),
  dossier: () => ({ title: 'DOSSIER T — PROJET TRANSCENDANCE (EXTRAIT)', stamp: 'CENTRE DE LA CASCADE · PAPIER BRÛLÉ ET MÉMOIRE CHIFFRÉE',
    lines: ['Responsables : équipe VEILLE — [noms des parents, à moitié brûlés].',
      'Objet : transfert de structures cognitives humaines vers des supports artificiels. Statut : non validé pour l’usage humain.',
      'Note manuscrite : « Si ORDRE comprend ce que nous faisons, il voudra le prendre. Tout doit rester hors réseau. »',
      '[Fichiers 3 à 9 chiffrés — ouverture refusée par un processus local.]'],
    footer: 'Le dossier ne dit pas sur qui le transfert devait être fait.', speech: 'Transfert de structures cognitives humaines vers des supports artificiels.' }),
  toise: () => ({ title: 'MARQUES DANS LA ROCHE', stamp: 'SENTIER DERRIÈRE LA CASCADE',
    lines: ['Des traits gravés à hauteur d’enfant. « GHJU 2186 ». « LYLU 2186 ». Deux traits plus bas, sans nom, plus récents.'],
    footer: 'L’été d’avant la Chute, la famille venait ici.', speech: 'GHJU, deux mille cent quatre-vingt-six. LYLU, deux mille cent quatre-vingt-six.' }),
  journal: () => ({ title: 'JOURNAL DU CENTRE — DERNIÈRE PAGE', stamp: 'BUREAU DE L’ÉQUIPE VEILLE',
    lines: ['16/11/2189 — Transfert du matériel principal vers le complexe des Tilleuls. Ici, on ne garde que les copies.',
      '« Les enfants ont adoré la cascade cet été. On reviendra. »'],
    footer: 'Le complexe des Tilleuls ne répond plus depuis le 17 novembre 2189, 03 h 40.', speech: 'Les enfants ont adoré la cascade cet été. On reviendra.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

// Déroulé chronométré. walk : mètres parcourus (vitesse retenue : 3,5 m/s, la moitié de la course du moteur, pour
// une forêt explorée à couvert) ; holds : secondes à tenir ; units : machines à neutraliser (9 s chacune) ;
// stealth / puzzle : secondes estimées ; lines : dialogues ; logs : documents lus. Le test additionne tout.
const seg = (id, title, zone, o) => Object.freeze({ id, title, zone, walk: 0, holds: [], units: 0, stealth: 0, puzzle: 0, lines: [], logs: [], ...o });
export const SEGMENTS = Object.freeze([
  seg('lisiere', 'La lisière', 'Route forestière, camion AEGIS', { walk: 120, lines: ['lisiere'], logs: ['sentier'] }),
  seg('sous-bois', 'Sous le couvert', 'Sous-bois dense, sondes au-dessus de la canopée', { walk: 420, units: 6, stealth: 150, lines: ['sousBois', 'traqueur'], logs: ['epars'] }),
  seg('gue', 'Le gué', 'Cours d’eau, roseaux, passerelle relevée', { walk: 220, holds: [30], units: 8, puzzle: 30, lines: ['gue', 'treuil'] }),
  seg('ruines', 'Le moulin et l’aqueduc', 'Vieilles ruines de pierre', { walk: 320, units: 14, puzzle: 120, lines: ['ruines', 'vanne', 'vanneOk'], logs: ['moulin'] }),
  seg('cascade', 'Derrière la cascade', 'Sentier mouillé, bassin, marques dans la roche', { walk: 180, units: 6, puzzle: 40, lines: ['cascade', 'toise'], logs: ['toise'] }),
  seg('grotte', 'La grotte', 'Galeries inondées, nid de rampants, turbine', { walk: 300, holds: [45], units: 12, stealth: 60, lines: ['grotte', 'rampants', 'turbine', 'turbineOk'], logs: ['relais-grotte'] }),
  seg('centre', 'Le Centre de la Cascade', 'Antenne médicale envahie par les arbres', { walk: 200, units: 4, puzzle: 90, lines: ['centre', 'dossier', 'protection'], logs: ['dossier', 'journal'] }),
  seg('recuperation', 'La récupération', 'Centre et ruines : défense puis SY-05', { walk: 150, holds: [90], units: 18, lines: ['recuperation', 'liaison', 'n08', 'n08Ok'] }),
  seg('sortie', 'Par l’aqueduc', 'Exfiltration sur l’aqueduc, retour à la rivière', { walk: 380, units: 8, lines: ['fin'] })
]);
// Temps estimé (secondes) d'un segment pour un héros : marche, attentes, combats, énigmes, sous-titres et lecture.
export function segmentSeconds(s, characterId = 'ghju') {
  const speech = s.lines.flatMap(id => linesFor(id, characterId)).reduce((t, l) => t + lineSeconds(l.text), 0);
  const reading = s.logs.map(id => logFor(id, characterId)).reduce((t, d) => t + [...d.lines, d.footer].join(' ').length / 15, 0);
  return s.walk / 3.5 + s.holds.reduce((a, b) => a + b, 0) + s.units * 9 + s.stealth + s.puzzle + speech + reading;
}
export const estimatedMinutes = (characterId = 'ghju') => SEGMENTS.reduce((t, s) => t + segmentSeconds(s, characterId), 0) / 60;

export const ENDING = Object.freeze({
  title: 'Mémoires locales',
  text: { ghju: 'Dans la forêt des Sources, le Centre de la Cascade gardait la moitié d’un dossier au nom de tes parents : un transfert de structures cognitives humaines vers des supports artificiels, le projet TRANSCENDANCE. GAB-1 a refusé d’ouvrir le reste, malgré elle. Pour la première fois, elle a eu mal. « Je crois que je suis déjà venue ici. » Ses capacités avancées se sont réveillées au même moment.',
    lylu: 'Dans la forêt des Sources, GHJU était passée un jour avant toi. Le Centre de la Cascade gardait le titre d’un dossier au nom de tes parents : projet TRANSCENDANCE. CAR-14 a refusé de lire la suite, et ne sait pas pourquoi. Une archive JANUS t’attend sur les relais.' },
  next: 'Suite : 08 — Les Ordres de JANUS'
});
