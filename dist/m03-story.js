// MISSION 03 — « Le Convoi des Oubliés »: script and documents.
// Canon: BIBLE « Les Héritiers du Silence », Acte I, chapitre 3. AEGIS (Mara Voss) prepares the evacuation of the
// Directoire's prisoners; the hero escorts Inès's ambulance through the night sector 03 to the freight station of
// the Anneau logistique, after a prisoner who knows about HELIX (Dr Aurel Hadi). A machine attack brings down the
// interchange; from afar the hero sees a Shadow Unit armour with the other colour (pink or blue) — for the first
// time in seven years, a reason to hope the sibling is alive. Continuity:
//  - chapter 2 « Les Profondeurs »: the decryption module, ORDRE's wanted notice for GAB-1 and CAR-14, convoy 02
//    gone to the Anneau logistique with prisoners; convoy 03 stopped at the dock; agent S. Ravel of the Directoire
//    stopped signing the loading slips. The player freed the prisoners (escort) or took HELIX's archives (proof).
//  - chapter 4 « Le Protocole Interdit » (next): the energy station Est, an AEGIS cell, the PINK archive.
// ORDRE is the artificial intelligence (machines, networks, announcements); the Directoire is its human police.
import {SPEAKERS as M01_SPEAKERS} from './m01-extension-story.js';

export const SPEAKERS = Object.freeze({
  ...M01_SPEAKERS,
  ines: { name: 'INÈS · AMBULANCE', color: '#9fe3c8' }, ravel: { name: 'S. RAVEL · CANAL CHIFFRÉ', color: '#f2f2f2' },
  gare: { name: 'RÉGULATION · GARE DE FRET', color: '#ffc890' }, voss: { name: 'MARA VOSS · AEGIS', color: '#ffd36b' }
});
const L = (...lines) => lines;

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Secteur 03. Couvre-feu, rues vides, et ces néons qui clignotent pour personne.'],
      ['voss', 'Ici Mara Voss, AEGIS. Le convoi 02 du Directoire emmène ses prisonniers vers l’Anneau logistique. On les sort de là cette nuit.'],
      ['ines', 'Ici Inès. L’ambulance est devant l’annexe médicale. Il nous faut la gare de fret de l’Anneau.'],
      ['lylu', 'Il y a un prisonnier qui connaît HELIX, le docteur Hadi. Je le veux vivant.']),
    ghju: L(['gaby', 'Secteur 03. Couvre-feu, rues vides, néons allumés pour personne. Je n’aime pas ça.'],
      ['voss', 'Ici Mara Voss, AEGIS. Le convoi 02 du Directoire emmène ses prisonniers vers l’Anneau logistique. On les sort de là cette nuit.'],
      ['ines', 'Ici Inès. L’ambulance est garée devant l’annexe médicale. Il faut rejoindre la gare de fret de l’Anneau.'],
      ['ghju', 'Alors on escorte l’ambulance. Personne ne reste derrière.'])
  },
  ines: {
    all: L(['ines', 'Mes patients tiennent, mais l’ambulance n’a ni oxygène ni défibrillateur. L’annexe en avait. Et elle est sans courant depuis la Chute.']),
    escort: L(['ines', 'Les quatorze du conteneur sont à l’arrière. Ils ont tous vu partir le convoi 02. Ils veulent savoir où.']),
    proof: L(['ines', 'Les caisses d’archives HELIX sont calées sous les brancards. Si le Directoire nous arrête avec ça, on ne repartira pas.'])
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
    all: L(['ines', 'Reçu pour les kits. L’atelier d’en face a encore des vérins : la barrière du pont a le sien grillé.'])
  },
  atelier: {
    lylu: L(['cara', 'Patrouille d’ORDRE à l’entrée de l’atelier. Ils ont vu la lumière de l’annexe.']),
    ghju: L(['gaby', 'Une patrouille d’ORDRE arrive. Ils ont vu l’annexe se rallumer.'])
  },
  manifeste: {
    lylu: L(['lylu', 'Le manifeste du convoi 02. Hadi, A. — ancien chercheur HELIX, « non coopératif ». Le relais A3 a les dernières coordonnées.']),
    ghju: L(['ghju', 'Quarante et un prisonniers dans le convoi 02. Le relais A3 a les dernières coordonnées.'])
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
    lylu: L(['ravel', 'Si vous lisez ça, vous avez le convoi 03. Ici Ravel, du Directoire. La balise d’ORDRE au pied du pylône suit chaque véhicule du secteur. Coupez-la, sinon ils vous attendront à la gare.'],
      ['lylu', 'Une agente du Directoire qui nous aide ?'], ['cara', 'Celle qui ne signait plus les bordereaux. On la croit, pour l’instant.']),
    ghju: L(['ravel', 'Si vous lisez ça, vous avez le convoi 03. Ici Ravel, du Directoire. La balise d’ORDRE au pied du pylône suit chaque véhicule du secteur. Coupez-la, sinon ils vous attendront à la gare.'],
      ['ghju', 'Ravel… celle des consignes, à la tour.'], ['gaby', 'Elle prend des risques pour nous. Allons couper cette balise.'])
  },
  fracture: {
    lylu: L(['cara', 'Le pylône de surveillance. Et une embuscade : un châssis lourd devant la balise.']),
    ghju: L(['gaby', 'Châssis lourd devant la balise, au pied du pylône. C’est leur embuscade.'])
  },
  balise: {
    all: L(['ordre', 'BROUILLAGE DÉTECTÉ · RENFORTS DÉPLOYÉS'])
  },
  baliseOk: {
    lylu: L(['lylu', 'Liaison d’ORDRE coupée. Les données du convoi sont sauvegardées hors réseau.'], ['cara', 'Et la piste mène à l’Anneau logistique. Retour à la barrière.']),
    ghju: L(['ghju', 'Liaison d’ORDRE coupée. On est hors de leur vue.'], ['gaby', 'Les données du convoi sont à nous. Retour à la barrière, Inès attend.'])
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
    all: L(['ines', 'Passage dégagé ! Attention, la bretelle nord s’effondre !']),
    lylu: L(['cara', 'Là-bas, de l’autre côté de l’échangeur. Une armure Shadow Unit. Des marques roses.'], ['lylu', 'GHJU…'], ['cara', 'Le convoi se sépare, LYLU. On ne peut pas la rejoindre. Pas maintenant.']),
    ghju: L(['gaby', 'GHJU. Sur l’autre bretelle, parmi les combattants… une signature bleue. Shadow Unit.'], ['ghju', 'LYLU ?'], ['gaby', 'Le pont est tombé entre vous. Il est vivant, GHJU. Garde ça.'])
  },
  gare: {
    all: L(['gare', 'TRAIN SANITAIRE 7 · DÉPART PROGRAMMÉ · DESTINATION : ANNEAU LOGISTIQUE, CENTRE DE STABILISATION'], ['ines', 'Centre de stabilisation… C’est ça, leur « abri ».'])
  },
  arrimage: {
    lylu: L(['cara', 'Quarante-cinq secondes d’arrimage. Toutes les machines du secteur vont vouloir ce train.']),
    ghju: L(['gaby', 'Quarante-cinq secondes. Ils vont tout envoyer sur ce quai.'])
  },
  arrimageOk: {
    all: L(['ines', 'Ambulance arrimée ! Le registre de régulation est dans la cabine, au bout du quai. Lisez-le avant le départ.'])
  },
  regulation: {
    lylu: L(['lylu', 'Hadi n’est pas resté à l’Anneau. Il est parti vers la station énergétique Est, avec les techniciens.'], ['voss', 'La station Est. Mon équipe y descend. Il y a là-bas une archive des anciens systèmes de secours que je cherche depuis des années.']),
    ghju: L(['ghju', 'Les techniciens du convoi 02 sont repartis vers la station énergétique Est.'], ['voss', 'Alors rejoins ma cellule là-bas, GHJU. La station garde une archive des anciens systèmes de secours. Et peut-être un moyen de répondre à ORDRE.'])
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
  dossier: () => ({ title: 'DOSSIER DU CONVOI — ANCIEN REGISTRE / 2196', stamp: 'ANNEXE MÉDICALE · ARCHIVES HORS RÉSEAU',
    lines: ['Le convoi du Directoire a soustrait des identités aux listes civiles. Une copie du manifeste a été transférée à l’atelier technique.',
      'Liste civile du secteur 03, version d’hier : 312 noms. Version de ce matin : 271. Les 41 noms retirés portent la mention « transfert — stabilisation ».',
      'En marge, à l’encre : « Profils techniques et anciens chercheurs : lot à part. Ne pas inscrire au registre public. »'],
    footer: 'Quarante et un noms : exactement les prisonniers du convoi 02 au départ de la tour de transit.',
    speech: 'Le convoi du Directoire a soustrait des identités aux listes civiles.' }),
  manifeste: () => ({ title: 'DIRECTOIRE / MANIFESTE INTERCEPTÉ', stamp: 'ATELIER TECHNIQUE · TERMINAL DE MAINTENANCE',
    lines: ['Convoi 02 : 41 prisonniers. Lot technique : 7 (ingénieurs, électriciens, un ancien chercheur).',
      'Lot technique, ligne 7 : « Hadi, Aurel — ancien chercheur HELIX, programme JANUS. Non coopératif. Ne pas interroger sans la direction HELIX. »',
      'Itinéraire : tour de transit → gare de fret, secteur 03 → Anneau logistique, quai B → affectation selon profil.'],
    footer: 'Le manifeste était copié ici pour le service de maintenance des trains. Personne ne l’avait effacé.',
    speech: 'Hadi, Aurel. Ancien chercheur HELIX, programme JANUS. Non coopératif.' }),
  relais: () => ({ title: 'RELAIS A3 / DÉCRYPTAGE', stamp: 'ARCHIVES A3 · TERRASSE · CANAL CHIFFRÉ',
    lines: ['Le dernier trajet passe sous le pylône de surveillance. ORDRE y suit chaque véhicule et masque la destination du convoi.',
      'Message déposé il y a deux heures, signé S. Ravel (Directoire) : « La balise d’ORDRE au pied du pylône suit chaque véhicule du secteur. Coupez-la avant la gare. »',
      '« Je ne signe plus les bordereaux. Je ne sais pas ce qu’est un centre de stabilisation. Je sais qu’on n’y envoie pas des gens qu’on veut soigner. »'],
    footer: 'Ravel est l’agente qui doutait, dans les consignes du poste de la tour de transit.',
    speech: 'La balise d’ORDRE au pied du pylône suit chaque véhicule du secteur. Coupez-la avant la gare.' }),
  balise: () => ({ title: 'LIAISON ORDRE INTERROMPUE', stamp: 'BALISE DE POURSUITE · PIED DU PYLÔNE',
    lines: ['Les données du convoi sont sauvegardées hors réseau. Une piste mène désormais vers l’Anneau logistique.',
      'Journal de la balise : 63 véhicules suivis en sept jours. 61 classés « transfert du Directoire autorisé ». 2 classés « non autorisé » : l’ambulance d’Inès, et une équipe AEGIS il y a deux jours.',
      'Note de la balise : « Équipe AEGIS — deux signatures Shadow Unit relevées dans le secteur cette semaine. Couleurs : rose, bleue. »'],
    footer: 'Deux armures Shadow Unit dans le même secteur. La balise ne sait pas qu’elles se cherchent.', speech: 'Deux signatures Shadow Unit relevées dans le secteur. Couleurs : rose, bleue.' }),
  regulation: () => ({ title: 'REGISTRE DE RÉGULATION — GARE DE FRET 03', stamp: 'CABINE DE RÉGULATION · LIGNE DE L’ANNEAU LOGISTIQUE',
    lines: ['Convoi 02 : arrivé à l’Anneau logistique, quai B. Prisonniers : 34, remis au centre de stabilisation du Directoire.',
      'Lot technique : 7 personnes, dont A. Hadi. Réacheminés le jour même vers la station énergétique Est (programme JANUS), « maintenance de la colonne ».',
      'Ordre signé conjointement : Directoire de Vesper et direction HELIX (A. Kessler). Validation : ORDRE.',
      'Train sanitaire 7 : départ autorisé vers l’Anneau. Chargement : une ambulance AEGIS. Non contrôlée.'],
    footer: 'Des techniciens forcés d’entretenir une « colonne » pour ORDRE. La suite passe par la station énergétique Est.',
    speech: 'Lot technique, dont A. Hadi, réacheminé vers la station énergétique Est, maintenance de la colonne.' }),
  'couvre-feu': () => ({ title: 'AVIS DE COUVRE-FEU — DIRECTOIRE', stamp: 'AVENUE DES SECOURS · PANNEAU D’AFFICHAGE',
    lines: ['Secteur 03 : circulation interdite de 20 h à 6 h. Tout véhicule non enregistré sera immobilisé par ORDRE.',
      'Les transferts du Directoire sont prioritaires et ne sont pas soumis au couvre-feu.'],
    footer: 'Une main a ajouté : « Les ambulances non plus, normalement. »', speech: 'Les transferts du Directoire sont prioritaires.' }),
  carnet: () => ({ title: 'CARNET DE L’INFIRMERIE', stamp: 'ANNEXE MÉDICALE · BUREAU DE L’INFIRMERIE',
    lines: ['Hier, 22 h — Un véhicule du Directoire a pris nos quatre patients de longue durée. « Stabilisation », ont-ils dit.',
      'Hier, 23 h — Courant coupé par ORDRE « pour économie ». Les kits de réanimation sont restés dans l’armoire, chargés.',
      'Ce matin — Je pars à pied vers les Bas-Niveaux. On m’a dit qu’une infirmière, Inès, tient encore un dispensaire là-bas.'],
    footer: 'Inès a reçu cette infirmière il y a deux jours. Elle était dans le convoi 03.', speech: 'Un véhicule du Directoire a pris nos quatre patients. Stabilisation, ont-ils dit.' }),
  commande: () => ({ title: 'BON DE COMMANDE — DIRECTOIRE DE VESPER', stamp: 'ATELIER TECHNIQUE · CLASSEUR',
    lines: ['Objet : 24 civières à sangles, 24 colliers d’identification, 2 scanners biométriques.', 'Livraison : gare de fret 03, quai du train sanitaire.',
      'Mention : « Pour le centre de stabilisation. Ne pas confier à AEGIS. »'],
    footer: 'Des colliers d’identification, pas des bracelets de soin.', speech: 'Vingt-quatre colliers d’identification. Ne pas confier à AEGIS.' }),
  ravel: () => ({ title: 'MESSAGE GLISSÉ SOUS LE PORTIQUE', stamp: 'ARCHIVES A3 · PAPIER PLIÉ EN QUATRE',
    lines: ['« À l’équipe de l’ambulance : la régulation de la gare n’est pas contrôlée la nuit. Le registre dit tout. Lisez-le avant que le train parte. — S. R. »'],
    footer: 'Le papier porte le tampon de la tour de transit.', speech: 'Le registre dit tout. Lisez-le avant que le train parte.' }),
  stabilisation: () => ({ title: 'FICHE DE TRANSFERT — CENTRE DE STABILISATION', stamp: 'VOIE DE SERVICE · DANS UNE CIVIÈRE RENVERSÉE',
    lines: ['Patient : non nommé. Statut : « utile ». Destination : Anneau logistique, puis « affectation selon profil ».',
      'Protocole : sédation légère pendant le transport. Ne pas répondre aux questions sur la destination.'],
    footer: 'Utile à quoi ? La fiche ne le dit pas. ORDRE classe les gens selon leur utilité.', speech: 'Statut : utile. Affectation selon profil.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;

export const ENDING = Object.freeze({
  title: 'Le Convoi des Oubliés',
  text: { lylu: 'Le train sanitaire roule vers l’Anneau logistique avec l’ambulance d’Inès. Le docteur Hadi a été envoyé à la station énergétique Est. Et sur l’échangeur effondré, il y avait une armure Shadow Unit aux marques roses. Pour la première fois depuis sept ans, tu as une raison d’espérer que GHJU est vivante.',
    ghju: 'Le train sanitaire roule vers l’Anneau logistique avec l’ambulance d’Inès. Les techniciens du convoi 02 ont été envoyés à la station énergétique Est, où Mara Voss t’attend. Et sur l’échangeur effondré, il y avait une signature bleue. Pour la première fois depuis sept ans, tu as une raison d’espérer que LYLU est vivant.' },
  next: 'Suite : 04 — Le Protocole Interdit'
});
