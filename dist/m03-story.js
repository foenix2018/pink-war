// MISSION 03 — « Le Convoi des Absents »: script and documents.
// Canon (BIBLE_NARRATIVE_V1 §12 M03; Tome II W03/M03): protection of a medical transport, machine assault, tactical
// challenge on the move; revelation: civilians were deported to a « stabilisation » centre. Continuity:
//  - M02 « Sous les Néons »: convoy 02 left the transit tower for the Anneau logistique with the sibling in the
//    « lot spécial »; convoy 03 was stopped at the dock; Inès Varga ran the enclave's dispensary; agent S. Ravel of
//    HELIX Security stopped signing the loading slips. The player chose the survivors (escort) or the proofs (proof).
//  - M04 « La Brèche Violette » (next): energy station, stabilisers, a breach opened on purpose under human control.
// The four steps of the first version of this chapter keep their texts (annex archive, workshop manifest, A3 relay,
// ORDRE beacon). No death is confirmed; ORDRE (machines) stays hostile; HELIX is a separate adversary.
import {SPEAKERS as M01_SPEAKERS} from './m01-extension-story.js';

export const SPEAKERS = Object.freeze({
  ...M01_SPEAKERS,
  ines: { name: 'INÈS · AMBULANCE', color: '#9fe3c8' }, ravel: { name: 'S. RAVEL · CANAL CHIFFRÉ', color: '#f2f2f2' },
  gare: { name: 'RÉGULATION · GARE DE FRET', color: '#ffc890' }
});
const L = (...lines) => lines;
const sib = c => c === 'lylu' ? 'GHJU' : 'LYLU';

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Secteur 03. Couvre-feu ORDRE, rues vides, et ces néons qui clignotent pour personne.'],
      ['ines', 'Ici Inès. L’ambulance est garée devant l’annexe médicale. Si on veut suivre le convoi 02, il nous faut la gare de fret de l’Anneau.'],
      ['lylu', 'GHJU est dans ce convoi. On y va.']),
    ghju: L(['gaby', 'Secteur 03. Couvre-feu, rues vides, néons allumés pour personne. Je n’aime pas ça.'],
      ['ines', 'Ici Inès. L’ambulance est garée devant l’annexe médicale. Pour suivre le convoi 02, il faut rejoindre la gare de fret de l’Anneau.'],
      ['ghju', 'LYLU est dans ce convoi. On y va.'])
  },
  ines: {
    all: L(['ines', 'Mes patients tiennent, mais l’ambulance n’a ni oxygène ni défibrillateur. L’annexe en avait. Et elle est sans courant depuis la chute.']),
    escort: L(['ines', 'Les quatorze du conteneur sont à l’arrière. Ils ont tous vu partir le convoi 02. Ils veulent savoir où.']),
    proof: L(['ines', 'Les caisses d’archives HELIX sont calées sous les brancards. Si on nous arrête avec ça, on ne repartira pas.'])
  },
  courant: {
    lylu: L(['cara', 'L’annexe se rallume. Les archives aussi : le dossier du convoi doit y être.']),
    ghju: L(['gaby', 'Le courant revient. Les archives de l’annexe vont pouvoir parler.'])
  },
  dossier: {
    lylu: L(['lylu', 'Des identités retirées des listes civiles. Pas perdues : retirées.'], ['cara', 'Et une copie du manifeste envoyée à l’atelier. On prend d’abord les kits d’Inès.']),
    ghju: L(['ghju', 'Retirées des listes civiles. Quelqu’un a rayé des vivants à la main.'], ['gaby', 'Une copie du manifeste est partie à l’atelier. Les kits d’Inès d’abord.'])
  },
  kit: {
    lylu: L(['cara', 'Des traqueurs ! Ils dormaient dans la salle de soins.']),
    ghju: L(['gaby', 'Mouvement dans la salle de soins. Des traqueurs, réveillés par le courant !'])
  },
  kitOk: {
    all: L(['ines', 'Reçu pour les kits. L’atelier d’en face a encore des vérins : la barrière ORDRE du pont a le sien grillé.'])
  },
  atelier: {
    lylu: L(['cara', 'Patrouille ORDRE à l’entrée de l’atelier. Ils ont vu la lumière de l’annexe.']),
    ghju: L(['gaby', 'Une patrouille ORDRE arrive. Ils ont vu l’annexe se rallumer.'])
  },
  manifeste: {
    lylu: L(['lylu', 'Une signature familiale parmi les transférés. 07-GHJU. Le relais A3 a les dernières coordonnées.']),
    ghju: L(['ghju', 'Une signature familiale parmi les transférés. 07-LYLU. Le relais A3 a les dernières coordonnées.'])
  },
  verin: {
    all: L(['ines', 'Vérin reçu ? Parfait. Je démarre. Restez près de moi, les machines s’attaquent à ce qui roule seul.'])
  },
  escorte: {
    lylu: L(['cara', 'Reste à moins de trente mètres de l’ambulance. Si elle s’arrête, c’est qu’il y a quelque chose devant.']),
    ghju: L(['gaby', 'Ne t’éloigne pas de l’ambulance. Si elle s’arrête, c’est qu’elle voit quelque chose.'])
  },
  sabotage: {
    all: L(['ines', 'Ils sont sur l’ambulance ! Dégagez-les, vite !'])
  },
  barrage: {
    all: L(['ordre', 'BARRAGE 03 · VÉHICULE NON AUTORISÉ · VERROUILLAGE ACTIF'], ['ines', 'La barrière ne bougera pas. Son vérin est grillé, et ORDRE la verrouille à distance.'])
  },
  a3: {
    lylu: L(['cara', 'Le relais A3, en haut de l’escalier. S’il connaît le trajet du convoi, il connaît aussi ce qui nous piste.']),
    ghju: L(['gaby', 'Le relais A3, là-haut. Il doit savoir qui nous piste.'])
  },
  relais: {
    lylu: L(['ravel', 'Si vous lisez ça, vous avez le convoi 03. Ici Ravel, HELIX. La balise d’ORDRE au pied de la fracture suit chaque véhicule du secteur. Coupez-la, sinon ils vous attendront à la gare.'],
      ['lylu', 'Une agente HELIX qui nous aide ?'], ['cara', 'Celle qui ne signait plus les bordereaux. On la croit, pour l’instant.']),
    ghju: L(['ravel', 'Si vous lisez ça, vous avez le convoi 03. Ici Ravel, HELIX. La balise d’ORDRE au pied de la fracture suit chaque véhicule du secteur. Coupez-la, sinon ils vous attendront à la gare.'],
      ['ghju', 'Ravel… celle des consignes, à la tour.'], ['gaby', 'Elle prend des risques pour nous. Allons couper cette balise.'])
  },
  fracture: {
    lylu: L(['cara', 'La fracture. Et une embuscade : un châssis lourd devant la balise.']),
    ghju: L(['gaby', 'Châssis lourd devant la balise. C’est leur embuscade.'])
  },
  balise: {
    all: L(['ordre', 'BROUILLAGE DÉTECTÉ · RENFORTS PAR LE PORTAIL'])
  },
  baliseOk: {
    lylu: L(['lylu', 'Liaison ORDRE coupée. Les données du convoi sont sauvegardées hors réseau.'], ['cara', 'Et la piste mène à l’Anneau logistique. Retour à la barrière.']),
    ghju: L(['ghju', 'Liaison ORDRE coupée. On est hors de leur vue.'], ['gaby', 'Les données du convoi sont à nous. Retour à la barrière, Inès attend.'])
  },
  barriere: {
    all: L(['ines', 'Vérin en place. La barrière se lève lentement, trente secondes. Tenez-les loin du poteau.'])
  },
  barriereOk: {
    all: L(['ines', 'Barrière levée ! Je passe sous la route haute, voie de service vers l’échangeur.'])
  },
  voie: {
    lylu: L(['cara', 'Des sondes sous le viaduc. Elles descendent sur l’ambulance.']),
    ghju: L(['gaby', 'Sondes sous la route haute, droit sur l’ambulance.'])
  },
  echangeur: {
    all: L(['ines', 'Une remorque en travers de la bretelle. Il y a un treuil de dépannage à gauche, s’il a encore du jus.'])
  },
  treuil: {
    lylu: L(['cara', 'Le treuil force. Trente secondes. Ils arrivent par la bretelle nord.']),
    ghju: L(['gaby', 'Trente secondes de treuil. Je tiens le bouclier, toi la bretelle.'])
  },
  treuilOk: {
    all: L(['ines', 'Passage dégagé. La gare est droit devant, le train sanitaire est à quai.'])
  },
  gare: {
    all: L(['gare', 'TRAIN SANITAIRE 7 · DÉPART PROGRAMMÉ · DESTINATION : ANNEAU LOGISTIQUE, CENTRE DE STABILISATION'], ['ines', 'Centre de stabilisation… C’est ça, leur « abri ».'])
  },
  arrimage: {
    lylu: L(['cara', 'Quarante-cinq secondes d’arrimage. Tout ORDRE du secteur va vouloir ce train.']),
    ghju: L(['gaby', 'Quarante-cinq secondes. Ils vont tout envoyer sur ce quai.'])
  },
  arrimageOk: {
    all: L(['ines', 'Ambulance arrimée ! Le registre de régulation est dans la cabine, au bout du quai. Lisez-le avant le départ.'])
  },
  regulation: {
    lylu: L(['lylu', 'Le convoi 02 n’est pas resté à l’Anneau. Le lot spécial est reparti vers une station énergétique.'], ['cara', 'Là où ORDRE voit une brèche ouverte… par des signatures humaines.']),
    ghju: L(['ghju', 'Le convoi 02 est reparti de l’Anneau. Le lot spécial vers une station énergétique.'], ['gaby', 'La brèche violette. Ouverte exprès. LYLU est là-bas.'])
  }
});
export function linesFor(id, characterId = 'ghju', choice = null) {
  const entry = SCRIPT[id]; if (!entry) return [];
  const hero = characterId === 'lylu' ? 'lylu' : 'ghju';
  return [...(entry.all || []), ...(entry[hero] || []), ...(choice && entry[choice] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

// Documents: title, stamp, lines, footer, speech (the M01 journal format; Ligne 9 pages read `body`).
export const LOGS = Object.freeze({
  dossier: c => ({ title: 'DOSSIER DU CONVOI — ANCIEN REGISTRE / 2196', stamp: 'ANNEXE MÉDICALE · ARCHIVES HORS RÉSEAU',
    lines: ['Le convoi HELIX a soustrait des identités aux listes civiles. Une copie du manifeste a été transférée à l’atelier technique.',
      'Liste civile du secteur 03, version d’hier : 312 noms. Version de ce matin : 271. Les 41 noms retirés portent la mention « transfert — stabilisation ».',
      `En marge, à l’encre : « 07-${sib(c)} : non coopérati${c === 'lylu' ? 've' : 'f'}. Lot spécial. Ne pas inscrire au registre public. »`],
    footer: 'Quarante et un noms : exactement le lot civil du convoi 02 au manifeste de la tour de transit.',
    speech: 'Le convoi HELIX a soustrait des identités aux listes civiles. Une copie du manifeste a été transférée à l’atelier technique.' }),
  manifeste: c => ({ title: 'HELIX / MANIFESTE INTERCEPTÉ', stamp: 'ATELIER TECHNIQUE · TERMINAL DE MAINTENANCE',
    lines: ['Une signature familiale figure parmi les personnes transférées. Le relais A3 contient les dernières coordonnées du convoi.',
      `Signature : 07-${sib(c)}, AEGIS. Mention : « refuse de se séparer des patients ».`,
      'Itinéraire : tour de transit → gare de fret, secteur 03 → Anneau logistique, quai B → centre de stabilisation.'],
    footer: 'Le manifeste était copié ici pour le service de maintenance des trains. Personne ne l’avait effacé.',
    speech: 'Une signature familiale figure parmi les personnes transférées.' }),
  relais: () => ({ title: 'RELAIS A3 / DÉCRYPTAGE', stamp: 'ARCHIVES A3 · TERRASSE · CANAL CHIFFRÉ',
    lines: ['Le dernier trajet mène au périmètre fracturé. Le réseau ORDRE utilise le portail pour masquer la destination du convoi.',
      'Message déposé il y a deux heures, signé S. Ravel (HELIX Security) : « La balise d’ORDRE au pied de la fracture suit chaque véhicule du secteur. Coupez-la avant la gare. »',
      '« Je ne signe plus les bordereaux. Je ne sais pas ce qu’est un centre de stabilisation. Je sais qu’on n’y envoie pas des gens qu’on veut soigner. »'],
    footer: 'Ravel est l’agente qui doutait, dans les consignes du poste de la tour de transit.',
    speech: 'La balise d’ORDRE au pied de la fracture suit chaque véhicule du secteur. Coupez-la avant la gare.' }),
  balise: () => ({ title: 'LIAISON ORDRE INTERROMPUE', stamp: 'BALISE DE POURSUITE · PÉRIMÈTRE PINK',
    lines: ['Les données du convoi sont sauvegardées hors réseau. Une piste mène désormais vers l’Anneau logistique.',
      'Journal de la balise : 63 véhicules suivis en sept jours. 61 classés « transfert HELIX autorisé ». 2 classés « non autorisé » : l’ambulance d’Inès, et une ambulance AEGIS il y a deux jours.'],
    footer: 'L’autre ambulance AEGIS a été arrêtée à la gare. Son équipage figure au lot spécial.', speech: 'Les données du convoi sont sauvegardées hors réseau.' }),
  regulation: c => ({ title: 'REGISTRE DE RÉGULATION — GARE DE FRET 03', stamp: 'CABINE DE RÉGULATION · LIGNE DE L’ANNEAU LOGISTIQUE',
    lines: ['Convoi 02 : arrivé à l’Anneau logistique, quai B. Lot civil : 41 personnes, remis au centre de stabilisation.',
      `Lot spécial : 7 personnes, dont 07-${sib(c)}. Réacheminés le jour même vers la station énergétique Est, « secteur de phase ».`,
      'Motif : « profils compatibles avec la stabilisation de la brèche ». Ordre signé conjointement : direction HELIX (A. Kessler) et contrôle ORDRE.',
      'Train sanitaire 7 : départ autorisé vers l’Anneau. Chargement : une ambulance AEGIS. Non contrôlée.'],
    footer: 'Une brèche « à stabiliser », et des humains choisis pour cela. La suite passe par la station énergétique.',
    speech: `Lot spécial, dont zéro-sept ${sib(c)}, réacheminé vers la station énergétique Est, secteur de phase.` }),
  'couvre-feu': () => ({ title: 'AVIS DE COUVRE-FEU — ORDRE', stamp: 'AVENUE DES SECOURS · PANNEAU D’AFFICHAGE',
    lines: ['Secteur 03 : circulation interdite de 20 h à 6 h. Tout véhicule non enregistré sera immobilisé.',
      'Les transferts HELIX sont prioritaires et ne sont pas soumis au couvre-feu.'],
    footer: 'Une main a ajouté : « Les ambulances non plus, normalement. »', speech: 'Les transferts HELIX sont prioritaires.' }),
  carnet: () => ({ title: 'CARNET DE L’INFIRMERIE', stamp: 'ANNEXE MÉDICALE · BUREAU DE L’INFIRMERIE',
    lines: ['Hier, 22 h — Un véhicule HELIX a pris nos quatre patients de longue durée. « Stabilisation », ont-ils dit.',
      'Hier, 23 h — Courant coupé par ORDRE « pour économie ». Les kits de réanimation sont restés dans l’armoire, chargés.',
      'Ce matin — Je pars à pied vers les Bas-Niveaux. On m’a dit qu’une infirmière, Inès, tient encore un dispensaire là-bas.'],
    footer: 'Inès a reçu cette infirmière il y a deux jours. Elle était dans le convoi 03.', speech: 'Un véhicule HELIX a pris nos quatre patients. Stabilisation, ont-ils dit.' }),
  commande: () => ({ title: 'BON DE COMMANDE — HELIX SECURITY', stamp: 'ATELIER TECHNIQUE · CLASSEUR',
    lines: ['Objet : 24 civières à sangles, 24 colliers d’identification, 2 scanners biométriques.', 'Livraison : gare de fret 03, quai du train sanitaire.',
      'Mention : « Pour le centre de stabilisation. Ne pas confier à AEGIS. »'],
    footer: 'Des colliers d’identification, pas des bracelets de soin.', speech: 'Vingt-quatre colliers d’identification. Ne pas confier à AEGIS.' }),
  ravel: () => ({ title: 'MESSAGE GLISSÉ SOUS LE PORTIQUE', stamp: 'ARCHIVES A3 · PAPIER PLIÉ EN QUATRE',
    lines: ['« À l’équipe de l’ambulance : la régulation de la gare n’est pas contrôlée la nuit. Le registre dit tout. Lisez-le avant que le train parte. — S. R. »'],
    footer: 'Le papier porte le tampon de la tour de transit.', speech: 'Le registre dit tout. Lisez-le avant que le train parte.' }),
  stabilisation: () => ({ title: 'FICHE DE TRANSFERT — CENTRE DE STABILISATION', stamp: 'VOIE DE SERVICE · DANS UNE CIVIÈRE RENVERSÉE',
    lines: ['Patient : non nommé. Statut : « compatible ». Destination : Anneau logistique, puis « secteur de phase ».',
      'Protocole : sédation légère pendant le transport. Ne pas répondre aux questions sur la destination.'],
    footer: 'Compatible avec quoi ? La fiche ne le dit pas.', speech: 'Statut : compatible. Destination : secteur de phase.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'Le Convoi des Absents',
  text: { lylu: 'Le train sanitaire roule vers l’Anneau logistique avec l’ambulance d’Inès. Le registre de la gare l’a dit : GHJU n’est pas restée au centre de stabilisation. Le lot spécial est reparti vers une station énergétique où une brèche a été ouverte exprès.',
    ghju: 'Le train sanitaire roule vers l’Anneau logistique avec l’ambulance d’Inès. Le registre de la gare l’a dit : LYLU n’est pas resté au centre de stabilisation. Le lot spécial est reparti vers une station énergétique où une brèche a été ouverte exprès.' },
  next: 'Suite : 04 — La Brèche Violette'
});
