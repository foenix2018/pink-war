// M02 « Sous les Néons » — script of the prologue (enclave of the covered market) and epilogue (transit tower).
// Canon (BIBLE_NARRATIVE_V1 §12 M02; Tome II W02/M02; storyboard 02A–02C): Bas-Niveaux, evacuation of an enclave,
// closed markets, first confrontation with HELIX Security (black, industrial white, safety red; director Adrian
// Kessler), which protects JANUS sites — not every agent knows the truth. Revelation: HELIX collects the records the
// army claims were lost. Choice at the end: escort the civilians or take HELIX's proofs. The sibling's call sign is
// on a manifest of the convoy to the Anneau logistique (M03, « Le Convoi des Absents »).
// Continuity with M01: the hero arrives by the lift of the Archives végétales, three days behind the sibling, who
// wrote « pas disparu(e) » in the registry and left for « l’enclave du marché des Bas-Niveaux ».
import {SPEAKERS as M01_SPEAKERS} from './m01-extension-story.js';

export const SPEAKERS = Object.freeze({
  ...M01_SPEAKERS,
  helix: { name: 'HELIX SECURITY · DIFFUSION', color: '#ff4a4a' }, ines: { name: 'INÈS · DISPENSAIRE', color: '#9fe3c8' },
  agent: { name: 'AGENT HELIX', color: '#f2f2f2' }
});
const L = (...lines) => lines;
const sib = c => c === 'lylu' ? 'GHJU' : 'LYLU';
const self = c => c === 'lylu' ? 'LYLU' : 'GHJU';
const e = c => c === 'lylu' ? 'e' : '';   // feminine ending when the sibling is GHJU

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Bas-Niveaux. Ça sent l’ozone, la friture et l’eau de ruissellement.'],
      ['lylu', 'D’après le registre, GHJU est descendue ici il y a trois jours. L’enclave du marché couvert.'],
      ['cara', 'Couloir de service, puis le dispensaire. Et tu marches doucement : les gens d’en bas tirent avant de demander.']),
    ghju: L(['gaby', 'Bas-Niveaux. Néons, vapeur, et pas un bruit de voix. Pour une enclave, c’est trop calme.'],
      ['ghju', 'LYLU est descendu ici il y a trois jours. S’il a trouvé des gens, il est allé au dispensaire. Il fait toujours ça.'],
      ['gaby', 'Alors on commence par le dispensaire. Je reste au-dessus de ton épaule.'])
  },
  dispensaire: {
    lylu: L(['cara', 'Les lits sont faits, les perfusions débranchées proprement. Ils sont partis, ils n’ont pas fui.']),
    ghju: L(['gaby', 'Personne n’a fui d’ici. Les lits sont faits, les seringues rangées. Quelqu’un a évacué ce dispensaire avec méthode.'])
  },
  registre: {
    lylu: L(['lylu', 'Elle a soigné un gamin et réparé leur filtre à eau. Ça, c’est GHJU.'], ['cara', 'Et HELIX est venu faire un « recensement » le lendemain. La radio de l’enclave est à côté.']),
    ghju: L(['ghju', 'Il a remis en route leur purificateur avec des pièces de pompe. C’est bien LYLU.'], ['gaby', 'Et le lendemain, HELIX est venu « recenser ». Il faut rallumer leur radio.'])
  },
  radio: {
    lylu: L(['ines', 'Ici Inès, du dispensaire… si quelqu’un d’AEGIS entend : on est dix-neuf au poste de soins, dans la rue. Ceux qui ont accepté le scan sont partis avec HELIX.'],
      ['ines', 'GHJU est partie avec eux. Elle n’a pas voulu laisser les malades seuls. Ouvrez la grille, par pitié, on n’a plus d’eau.'],
      ['helix', 'FRÉQUENCE CIVILE DÉTECTÉE · SECTEUR MARCHÉ · ÉQUIPE D’ÉCLAIREURS DÉPLOYÉE'], ['cara', 'Ils écoutent la même fréquence que nous. Ils descendent par la verrière !']),
    ghju: L(['ines', 'Ici Inès, du dispensaire… si quelqu’un d’AEGIS entend : on est dix-neuf au poste de soins, dans la rue. Ceux qui ont accepté le scan sont partis avec HELIX.'],
      ['ines', 'LYLU est parti avec eux. Il n’a pas voulu laisser les malades seuls. Ouvrez la grille, par pitié, on n’a plus d’eau.'],
      ['helix', 'FRÉQUENCE CIVILE DÉTECTÉE · SECTEUR MARCHÉ · ÉQUIPE D’ÉCLAIREURS DÉPLOYÉE'], ['gaby', 'Ils écoutaient. Éclaireurs HELIX, par la verrière du marché !'])
  },
  eclaireursOk: {
    lylu: L(['cara', 'Blanc, noir, bandes rouges. HELIX Security. Ce ne sont pas des machines d’ORDRE, ce sont des gens.'], ['lylu', 'Des gens qui tirent sur une enclave. La grille, maintenant.']),
    ghju: L(['gaby', 'Des agents HELIX en armure. Pas des machines : des gens.'], ['ghju', 'Des gens qui tirent sur des civils. On ouvre la grille.'])
  },
  grille: {
    lylu: L(['cara', 'La manivelle est lente. Tout le marché va l’entendre. Garde un œil sur la verrière.']),
    ghju: L(['gaby', 'Vingt-cinq secondes de manivelle. Je tiens le bouclier, tu tiens le marché.'])
  },
  grilleOk: {
    lylu: L(['lylu', 'Grille ouverte. Le poste de soins est au bout de la ruelle.']),
    ghju: L(['ghju', 'La grille est levée. Inès et les autres sont au poste de soins, au bout de la ruelle.'])
  },
  tour: {
    lylu: L(['helix', 'TOUR DE TRANSIT · ZONE SÉCURISÉE · TOUTE PERSONNE NON RECENSÉE SERA NEUTRALISÉE'], ['cara', 'Un poste de contrôle HELIX dans le hall. Portiques, scanners, et des agents derrière.']),
    ghju: L(['helix', 'TOUR DE TRANSIT · ZONE SÉCURISÉE · TOUTE PERSONNE NON RECENSÉE SERA NEUTRALISÉE'], ['gaby', 'Contrôle HELIX dans le hall. Ils ont transformé la tour en poste-frontière.'])
  },
  tourOk: {
    lylu: L(['cara', 'Le chef de poste avait un badge à son bureau. Le coffre de données est derrière la porte ouest.']),
    ghju: L(['gaby', 'Hall dégagé. Leur badge doit être au poste de sécurité. Le coffre est à l’ouest.'])
  },
  coffre: {
    lylu: L(['cara', 'Des baies de serveurs. Tout ça pour des « données d’évacuation » ?']),
    ghju: L(['gaby', 'Ils ont monté un centre de données dans une tour de transit. Ce n’est pas pour les horaires des trains.'])
  },
  manifeste: {
    lylu: L(['lylu', 'Convoi 02, parti cette nuit. « 07-GHJU, AEGIS, non coopérative. Destination : Anneau logistique. »'],
      ['cara', 'Et les enregistrements de la chute, ceux que l’armée dit perdus… ils sont tous là, inventoriés.'], ['cara', 'Ils protègent les données. Pas les gens.']),
    ghju: L(['ghju', 'Convoi 02, parti cette nuit. « 07-LYLU, AEGIS, non coopératif. Destination : Anneau logistique. »'],
      ['gaby', 'Et les enregistrements de la chute que l’armée dit perdus : inventoriés, ici.'], ['gaby', 'Ils protègent les données. Pas les gens.'])
  },
  alarme: {
    all: L(['helix', 'INTRUSION · COFFRE DE DONNÉES · CONVOI 03 : DÉPART ANTICIPÉ · ÉQUIPE D’INTERVENTION AU QUAI'])
  },
  quai: {
    lylu: L(['cara', 'Le convoi 03 est encore à quai. Il y a des gens dans ce conteneur. Bloque la porte depuis le poste de commande !']),
    ghju: L(['gaby', 'Convoi 03, encore à quai, et il y a des civils dans le conteneur. Bloque la porte, je t’éclaire le poste.'])
  },
  verrou: {
    lylu: L(['cara', 'Verrouillage en cours. Cinquante secondes. Ils vont tout envoyer.']),
    ghju: L(['gaby', 'Cinquante secondes de verrouillage. Ils ne laisseront pas partir leur cargaison sans se battre.'])
  },
  agent: {
    all: L(['agent', 'Attendez… on nous a dit que c’était une évacuation. Que les gens partaient vers un abri.'])
  },
  verrouOk: {
    lylu: L(['lylu', 'Porte bloquée. Le convoi ne part pas.'], ['cara', 'Les civils dans le conteneur, les caisses d’archives sur le quai. On ne pourra pas tout sortir.']),
    ghju: L(['ghju', 'La porte est bloquée. Le convoi 03 reste ici.'], ['gaby', 'Les civils d’un côté, les caisses d’archives de l’autre. On ne sortira pas tout.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}

// Documents, in the M01 journal format (m01-narrative.js): title, stamp, lines, footer, speech.
export const LOGS = Object.freeze({
  'registre-soins': c => ({ title: 'REGISTRE DE SOINS — ENCLAVE DES ÉPARS', stamp: 'DISPENSAIRE DU MARCHÉ COUVERT · TENU PAR INÈS VARGA',
    lines: ['Il y a quatre jours — Malik, 9 ans, brûlure à la main (câble). Pansement gras. Il ne pleure pas, il compte les néons.',
      `Il y a trois jours, 22 h — Arrivée d’un${e(c)} secouriste AEGIS, indicatif 07-${sib(c)}. Venu${e(c)} des Archives végétales, à pied. Soigne Malik mieux que moi.`,
      `Il y a deux jours — ${sib(c)} remet en marche le purificateur avec des pièces de pompe de la Ligne 9. Première eau claire depuis l’hiver.`,
      'Hier, 5 h 40 — Diffusion HELIX : « recensement » à 6 h, évacuation promise vers l’Anneau logistique, eau et soins pour tous.',
      `Hier, 6 h 30 — Ceux qui ont accepté le scan d’identité sont partis vers la tour de transit. ${sib(c)} est parti${e(c)} avec les malades : « Je ne les laisse pas seuls. Je reviens les chercher, ou quelqu’un viendra. »`,
      'Les autres se cachent avec moi au poste de soins de la rue. Je laisse ce registre ici. Si vous êtes AEGIS : la radio est à côté.'],
    footer: `Dans la marge, au feutre : « 07 — ${self(c)}, si c’est toi : suis le convoi. Pas le réseau. »`,
    speech: `Arrivée d'un${e(c)} secouriste AEGIS, indicatif zéro-sept ${sib(c)}. Parti${e(c)} avec les malades. Je ne les laisse pas seuls.` }),
  radio: c => ({ title: 'RADIO DE L’ENCLAVE — FRÉQUENCE CIVILE 147.3', stamp: 'LOCAL RADIO · MÉMOIRE DES DERNIERS MESSAGES',
    lines: ['Hier, 5 h 40 — HELIX SECURITY : « Recensement des résidents des Bas-Niveaux. Présentez-vous à la tour de transit. Eau, soins, transfert vers l’Anneau logistique. »',
      'Hier, 23 h 50 — HELIX, canal interne mal crypté : « Convoi 02 parti. Lot civil + lot archives. Convoi 03 au quai, départ demain 4 h. »',
      `Il y a une heure — Inès : « Dix-neuf personnes au poste de soins. Pas d’eau. Grille bloquée côté marché. ${sib(c)} est parti${e(c)} avec le convoi 02. »`],
    footer: 'Le banc de batteries était débranché à la main : quelqu’un a voulu que la radio se taise jusqu’à l’arrivée des secours.',
    speech: 'Convoi zéro-deux parti. Lot civil plus lot archives. Convoi zéro-trois au quai, départ à quatre heures.' }),
  dessins: c => ({ title: 'L’ÉCOLE DU MARCHÉ', stamp: 'COIN DES ENFANTS · DESSINS PUNAISÉS SUR UNE PALETTE',
    lines: ['Une ville en néons roses et bleus, avec des fougères sur les toits. Écrit dessous : « Vesper avant ».',
      `Une ambulance rouge, et un personnage casqué marqué « 07 » qui tient un tuyau : « ${sib(c)} répare l’eau ».`,
      'Un grand bâtiment blanc à bandes rouges, avec des gens en file. Le crayon a appuyé si fort que la feuille est trouée.'],
    footer: 'Signé « Malik, 9 ans ». La boîte de craies a été emportée.',
    speech: `${sib(c)} répare l'eau.` }),
  'avis-helix': () => ({ title: 'AVIS DE RECENSEMENT — HELIX SECURITY', stamp: 'PLACARDÉ SUR LA GRILLE DE L’ENCLAVE · PAPIER THERMIQUE',
    lines: ['« HELIX SECURITY — VOTRE SÉCURITÉ, NOTRE MÉMOIRE. »',
      'Tout résident des Bas-Niveaux est invité à se présenter à la tour de transit pour un scan d’identité. Les données personnelles seront « conservées pour la reconstruction ».',
      'Les personnes recensées seront transférées au centre de stabilisation de l’Anneau logistique.',
      'Toute personne non recensée après 6 h sera considérée comme « non coopérative ».'],
    footer: 'Signé : Direction de la sécurité, A. Kessler. Quelqu’un a griffonné en travers : « ET LES MORTS, VOUS LES RECENSEZ AUSSI ? »',
    speech: 'Votre sécurité, notre mémoire. Toute personne non recensée sera considérée comme non coopérative.' }),
  cuisine: c => ({ title: 'CARNET DE LA CUISINE COMMUNE', stamp: 'MARCHÉ COUVERT · CUISINE',
    lines: ['Rations du jour : 64 bols de bouillon d’algues. 3 bols de plus pour le poste de soins.',
      `Ajouté : « +1 pour l’AEGIS qui a réparé l’eau. ${c === 'lylu' ? 'Elle' : 'Il'} a refusé de manger avant les enfants. »`,
      'Hier : 19 bols. Le reste est parti avec HELIX. La marmite est encore tiède.'],
    footer: 'Une ligne de comptes s’arrête au milieu.', speech: 'Hier, dix-neuf bols. Le reste est parti avec HELIX.' }),
  consignes: () => ({ title: 'CONSIGNES DU POSTE — HELIX SECURITY', stamp: 'TOUR DE TRANSIT · POSTE DE CONTRÔLE · NOTE MANUSCRITE AU DOS',
    lines: ['Consigne 1 : tout résident est scanné avant l’accès à l’eau. Aucune exception.',
      'Consigne 2 : les profils « AEGIS », « ancien réseau » et « non coopératif » sont isolés dans le lot spécial.',
      'Consigne 3 : les supports de 2189 (enregistreurs, radios, disques) sont saisis et versés au coffre.',
      'Au dos, au stylo — agent S. Ravel : « Pourquoi scanner les gens avant de leur donner à boire ? Pourquoi un lot spécial ? On m’a dit qu’on évacuait. Je ne signe plus les bordereaux. »'],
    footer: 'Tous les agents de HELIX ne savent pas ce qu’ils gardent.',
    speech: 'Pourquoi scanner les gens avant de leur donner à boire ? On m’a dit qu’on évacuait.' }),
  manifeste: c => ({ title: 'MANIFESTE — CONVOI 02', stamp: 'COFFRE DE DONNÉES HELIX · TERMINAL DE TRANSIT · ACCÈS BADGE',
    lines: ['Départ : cette nuit, 1 h 10. Destination : centre de stabilisation, Anneau logistique, quai B.',
      'Lot civil : 41 personnes recensées. 7 « lot spécial ».',
      `Lot spécial, ligne 3 : « 07-${sib(c)} · AEGIS · NON COOPÉRATI${c === 'lylu' ? 'VE' : 'F'} · a refusé de se séparer des patients ».`,
      'Lot archives : 212 enregistreurs AEGIS du 14/03/2189, 9 disques du réseau de secours, journal de la station 07 — tous déclarés « perdus » par l’armée en 2190.',
      'Convoi 03 : au quai, départ 4 h. 14 civils, 6 caisses d’archives.'],
    footer: 'L’armée a déclaré ces enregistrements perdus. HELIX les inventorie et les transporte.',
    speech: `Lot spécial, ligne trois. Zéro-sept ${sib(c)}, AEGIS, a refusé de se séparer des patients. Destination : Anneau logistique.` }),
  kessler: () => ({ title: 'NOTE DE LA DIRECTION — A. KESSLER', stamp: 'COFFRE DE DONNÉES · PLI FERMÉ, CLASSÉ « JANUS »',
    lines: ['« Priorité absolue aux supports de 2189. Les personnes sont secondaires : elles suivent les données jusqu’à l’Anneau. »',
      '« Aucune trace sur le réseau ORDRE. ORDRE efface ; nous conservons. C’est toute la différence, et elle doit rester invisible. »',
      '« Les agents n’ont pas besoin de connaître la destination finale. »'],
    footer: 'Le mot « JANUS » est tamponné en rouge en tête de page.',
    speech: 'Priorité absolue aux supports de 2189. Les personnes sont secondaires.' }),
  bordereau: () => ({ title: 'BORDEREAU DE CHARGEMENT — CONVOI 03', stamp: 'QUAI DE CHARGEMENT · TOUR DE TRANSIT',
    lines: ['Conteneur C-3 : 14 civils, « recensés en retard ». Eau : 6 litres.',
      'Caisses A-1 à A-6 : archives AEGIS 2189, fragile, ne pas exposer à l’humidité.',
      'Mention : « En cas d’incident, les caisses passent avant le conteneur. »'],
    footer: 'Six litres d’eau pour quatorze personnes, et une consigne d’humidité pour les caisses.',
    speech: 'En cas d’incident, les caisses passent avant le conteneur.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;
