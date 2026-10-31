// M02 « Les Profondeurs » — script of the prologue (enclave of the covered market) and epilogue (transit tower).
// Canon: BIBLE « Les Héritiers du Silence », Acte I, chapitre 2. The Bas-Niveaux are run by the Directoire, humans
// who serve ORDRE: the inhabitants are made to repair military machines in the transit tower. The hero comes for a
// decryption module able to read the old communications (the VEILLE-4 message of chapter 1). In the tower's data
// vault, the sphere intercepts an unusual wanted notice: ORDRE is not only hunting resistants, it is looking for two
// autonomous systems with unknown signatures, GAB-1 and CAR-14. HELIX (director Adrian Kessler) keeps the records
// of 2189 in the Directoire's vault. Choice at the end: escort the prisoners or take HELIX's archives. Convoy 02 left
// for the Anneau logistique with prisoners of the Directoire (chapter 3, « Le Convoi des Oubliés »).
import {SPEAKERS as M01_SPEAKERS} from './m01-extension-story.js';

export const SPEAKERS = Object.freeze({
  ...M01_SPEAKERS,
  helix: { name: 'DIRECTOIRE · DIFFUSION', color: '#ff4a4a' }, ines: { name: 'INÈS · DISPENSAIRE', color: '#9fe3c8' },
  agent: { name: 'AGENT DU DIRECTOIRE', color: '#f2f2f2' }
});
const L = (...lines) => lines;
const ia = c => c === 'lylu' ? 'CAR-14' : 'GAB-1';

export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['cara', 'Bas-Niveaux. Ça sent l’ozone, la friture et l’eau de ruissellement.'],
      ['lylu', 'Le Directoire garde des modules de décryptage dans la tour de transit. Avec ça, on lit la suite du message.'],
      ['cara', 'Couloir de service, puis le dispensaire. Et tu marches doucement : les gens d’en bas tirent avant de demander.']),
    ghju: L(['gaby', 'Bas-Niveaux. Néons, vapeur, et pas un bruit de voix. Pour une enclave, c’est trop calme.'],
      ['ghju', 'Les Épars ont parlé d’un dispensaire. Si quelqu’un sait comment entrer dans la tour, c’est là.'],
      ['gaby', 'Alors on commence par le dispensaire. Je reste au-dessus de ton épaule.'])
  },
  dispensaire: {
    lylu: L(['cara', 'Les lits sont faits, les perfusions débranchées proprement. Ils sont partis, ils n’ont pas fui.']),
    ghju: L(['gaby', 'Personne n’a fui d’ici. Les lits sont faits, les seringues rangées. Quelqu’un a vidé ce dispensaire avec méthode.'])
  },
  registre: {
    lylu: L(['lylu', 'Le Directoire est venu « recenser ». Les adultes valides sont partis à la tour, réparer des machines.'], ['cara', 'Réparer les machines qui les surveillent. Quelle belle idée. La radio de l’enclave est à côté.']),
    ghju: L(['ghju', 'Le Directoire a pris tous les adultes valides. Pour réparer des châssis militaires, dans la tour.'], ['gaby', 'Il faut rallumer leur radio. Quelqu’un est peut-être resté.'])
  },
  radio: {
    lylu: L(['ines', 'Ici Inès, du dispensaire… si quelqu’un d’AEGIS entend : on est dix-neuf au poste de soins, dans la rue. Ceux qui ont accepté le scan travaillent dans la tour.'],
      ['ines', 'Ils réparent des machines de guerre, jour et nuit. Ouvrez la grille, par pitié, on n’a plus d’eau.'],
      ['helix', 'FRÉQUENCE CIVILE DÉTECTÉE · SECTEUR MARCHÉ · ÉQUIPE D’ÉCLAIREURS DÉPLOYÉE'], ['cara', 'Ils écoutent la même fréquence que nous. Ils descendent par la verrière !']),
    ghju: L(['ines', 'Ici Inès, du dispensaire… si quelqu’un d’AEGIS entend : on est dix-neuf au poste de soins, dans la rue. Ceux qui ont accepté le scan travaillent dans la tour.'],
      ['ines', 'Ils réparent des machines de guerre, jour et nuit. Ouvrez la grille, par pitié, on n’a plus d’eau.'],
      ['helix', 'FRÉQUENCE CIVILE DÉTECTÉE · SECTEUR MARCHÉ · ÉQUIPE D’ÉCLAIREURS DÉPLOYÉE'], ['gaby', 'Ils écoutaient. Éclaireurs du Directoire, par la verrière du marché !'])
  },
  eclaireursOk: {
    lylu: L(['cara', 'Gris, noir, brassards rouges. La sécurité du Directoire. Ce ne sont pas des machines d’ORDRE, ce sont des gens.'], ['lylu', 'Des gens qui tirent sur une enclave pour le compte des machines. La grille, maintenant.']),
    ghju: L(['gaby', 'Des agents du Directoire en armure. Pas des machines : des gens.'], ['ghju', 'Des gens qui servent ORDRE et tirent sur des civils. On ouvre la grille.'])
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
    lylu: L(['helix', 'TOUR DE TRANSIT · ZONE DU DIRECTOIRE · TOUTE PERSONNE NON RECENSÉE SERA NEUTRALISÉE'], ['cara', 'Un poste de contrôle dans le hall. Portiques, scanners, et des agents derrière.']),
    ghju: L(['helix', 'TOUR DE TRANSIT · ZONE DU DIRECTOIRE · TOUTE PERSONNE NON RECENSÉE SERA NEUTRALISÉE'], ['gaby', 'Contrôle du Directoire dans le hall. Ils ont transformé la tour en poste-frontière.'])
  },
  tourOk: {
    lylu: L(['cara', 'Le chef de poste avait un badge à son bureau. Le coffre de données est derrière la porte ouest.']),
    ghju: L(['gaby', 'Hall dégagé. Leur badge doit être au poste de sécurité. Le coffre est à l’ouest.'])
  },
  coffre: {
    lylu: L(['cara', 'Des baies de serveurs. Et là, sur l’étagère : trois modules de décryptage « ancien réseau ». Prends celui du milieu.']),
    ghju: L(['gaby', 'Un centre de données dans une tour de transit. Les modules de décryptage sont sur l’étagère. Prends-en un.'])
  },
  manifeste: {
    lylu: L(['cara', 'Attends. J’intercepte un avis de recherche d’ORDRE. Pas des résistants : deux systèmes autonomes, signatures inconnues.'],
      ['lylu', 'Identifiants… CAR-14. C’est toi. Et GAB-1. Tu connais une GAB-1 ?'], ['cara', 'Non.'], ['cara', '…Non. Mais ORDRE a l’air d’y tenir autant qu’à moi. Ça me vexe un peu.']),
    ghju: L(['gaby', 'Un avis de recherche d’ORDRE vient de passer sur le réseau du coffre. Il ne vise pas des résistants : deux systèmes autonomes.'],
      ['ghju', 'GAB-1… c’est toi. Et une autre : CAR-14. Pourquoi ORDRE te chercherait, toi ?'], ['gaby', 'Je ne sais pas, GHJU. Je te le jure.'])
  },
  alarme: {
    all: L(['helix', 'INTRUSION · COFFRE DE DONNÉES · CONVOI 03 : DÉPART ANTICIPÉ · ÉQUIPE D’INTERVENTION AU QUAI'])
  },
  quai: {
    lylu: L(['cara', 'Le convoi 03 est encore à quai. Il y a des prisonniers dans ce conteneur. Bloque la porte depuis le poste de commande !']),
    ghju: L(['gaby', 'Convoi 03, encore à quai, et il y a des prisonniers dans le conteneur. Bloque la porte, je t’éclaire le poste.'])
  },
  verrou: {
    lylu: L(['cara', 'Verrouillage en cours. Cinquante secondes. Ils vont tout envoyer.']),
    ghju: L(['gaby', 'Cinquante secondes de verrouillage. Ils ne laisseront pas partir leur cargaison sans se battre.'])
  },
  agent: {
    all: L(['agent', 'Attendez… on nous a dit que c’était une affectation de travail. Que les gens partaient vers un abri.'])
  },
  verrouOk: {
    lylu: L(['lylu', 'Porte bloquée. Le convoi ne part pas.'], ['cara', 'Les prisonniers dans le conteneur, les caisses d’archives HELIX sur le quai. On ne pourra pas tout sortir.']),
    ghju: L(['ghju', 'La porte est bloquée. Le convoi 03 reste ici.'], ['gaby', 'Les prisonniers d’un côté, les caisses d’archives HELIX de l’autre. On ne sortira pas tout.'])
  }
});
export function linesFor(id, characterId = 'ghju') {
  const entry = SCRIPT[id]; if (!entry) return [];
  return [...(entry.all || []), ...(entry[characterId === 'lylu' ? 'lylu' : 'ghju'] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}

// Documents, in the M01 journal format (m01-narrative.js): title, stamp, lines, footer, speech.
export const LOGS = Object.freeze({
  'registre-soins': () => ({ title: 'REGISTRE DE SOINS — ENCLAVE DES ÉPARS', stamp: 'DISPENSAIRE DU MARCHÉ COUVERT · TENU PAR INÈS VARGA',
    lines: ['Il y a quatre jours — Malik, 9 ans, brûlure à la main (câble). Pansement gras. Il ne pleure pas, il compte les néons.',
      'Il y a trois jours — Le purificateur lâche encore. Pièces de pompe de la Ligne 9 récupérées par les Épars. Première eau claire depuis l’hiver.',
      'Hier, 5 h 40 — Diffusion du Directoire : « recensement » à 6 h. Travail rémunéré à la tour de transit, eau et soins pour tous.',
      'Hier, 6 h 30 — Ceux qui ont accepté le scan d’identité sont partis à la tour. Ils réparent des châssis militaires pour ORDRE. Les malades sont restés.',
      'Les autres se cachent avec moi au poste de soins de la rue. Je laisse ce registre ici. Si vous êtes AEGIS : la radio est à côté.'],
    footer: 'Dans la marge, au feutre : « La tour garde aussi les vieilles clés du réseau. Les Épars en cherchent depuis des années. »',
    speech: 'Ceux qui ont accepté le scan d’identité sont partis à la tour. Ils réparent des châssis militaires pour ORDRE.' }),
  radio: () => ({ title: 'RADIO DE L’ENCLAVE — FRÉQUENCE CIVILE 147.3', stamp: 'LOCAL RADIO · MÉMOIRE DES DERNIERS MESSAGES',
    lines: ['Hier, 5 h 40 — DIRECTOIRE : « Recensement des résidents des Bas-Niveaux. Présentez-vous à la tour de transit. Travail, eau, soins. »',
      'Hier, 23 h 50 — Directoire, canal interne mal crypté : « Convoi 02 parti vers l’Anneau logistique. Lot prisonniers + lot archives HELIX. Convoi 03 au quai, départ demain 4 h. »',
      'Il y a une heure — Inès : « Dix-neuf personnes au poste de soins. Pas d’eau. Grille bloquée côté marché. »'],
    footer: 'Le banc de batteries était débranché à la main : quelqu’un a voulu que la radio se taise jusqu’à l’arrivée des secours.',
    speech: 'Convoi zéro-deux parti vers l’Anneau logistique. Convoi zéro-trois au quai, départ à quatre heures.' }),
  dessins: () => ({ title: 'L’ÉCOLE DU MARCHÉ', stamp: 'COIN DES ENFANTS · DESSINS PUNAISÉS SUR UNE PALETTE',
    lines: ['Une ville en néons roses et bleus, avec des fougères sur les toits. Écrit dessous : « Vesper avant ».',
      'Une grande machine à quatre pattes, et des petits bonshommes autour avec des clés à molette : « Papa répare le robot ».',
      'Un grand bâtiment avec des gens en file, et un œil rouge dans le ciel. Le crayon a appuyé si fort que la feuille est trouée.'],
    footer: 'Signé « Malik, 9 ans ». La boîte de craies a été emportée.',
    speech: 'Papa répare le robot.' }),
  'avis-helix': () => ({ title: 'AVIS DE RECENSEMENT — DIRECTOIRE DE VESPER', stamp: 'PLACARDÉ SUR LA GRILLE DE L’ENCLAVE · PAPIER THERMIQUE',
    lines: ['« L’ORDRE VOUS PROTÈGE. LE DIRECTOIRE VOUS ORGANISE. »',
      'Tout résident des Bas-Niveaux est invité à se présenter à la tour de transit pour un scan d’identité et une affectation de travail.',
      'Les personnes affectées recevront eau, rations et soins. Les personnes non coopératives seront transférées vers l’Anneau logistique.',
      'Toute personne non recensée après 6 h sera considérée comme « non coopérative ».'],
    footer: 'Signé : Directoire de Vesper, sécurité des Bas-Niveaux. Quelqu’un a griffonné en travers : « ET LA LIBERTÉ, ELLE EST RATIONNÉE AUSSI ? »',
    speech: 'L’ordre vous protège. Le Directoire vous organise. Toute personne non recensée sera considérée comme non coopérative.' }),
  cuisine: () => ({ title: 'CARNET DE LA CUISINE COMMUNE', stamp: 'MARCHÉ COUVERT · CUISINE',
    lines: ['Rations du jour : 64 bols de bouillon d’algues. 3 bols de plus pour le poste de soins.',
      'Ajouté : « Les Épars ont rapporté des pièces de pompe. Ils ont refusé de manger avant les enfants. »',
      'Hier : 19 bols. Le reste est parti à la tour. La marmite est encore tiède.'],
    footer: 'Une ligne de comptes s’arrête au milieu.', speech: 'Hier, dix-neuf bols. Le reste est parti à la tour.' }),
  consignes: () => ({ title: 'CONSIGNES DU POSTE — SÉCURITÉ DU DIRECTOIRE', stamp: 'TOUR DE TRANSIT · POSTE DE CONTRÔLE · NOTE MANUSCRITE AU DOS',
    lines: ['Consigne 1 : tout résident est scanné avant l’accès à l’eau. Aucune exception.',
      'Consigne 2 : les profils « AEGIS », « ancien réseau » et « non coopératif » sont isolés dans le lot prisonniers.',
      'Consigne 3 : les supports de 2189 (enregistreurs, radios, disques) sont saisis et versés au coffre, pour HELIX.',
      'Au dos, au stylo — agent S. Ravel : « Pourquoi scanner les gens avant de leur donner à boire ? Pourquoi les faire réparer les machines qui les surveillent ? Je ne signe plus les bordereaux. »'],
    footer: 'Tous les agents du Directoire ne savent pas ce qu’ils servent.',
    speech: 'Pourquoi les faire réparer les machines qui les surveillent ? Je ne signe plus les bordereaux.' }),
  manifeste: c => ({ title: 'AVIS DE RECHERCHE — ORDRE · PRIORITÉ ABSOLUE', stamp: 'COFFRE DE DONNÉES · INTERCEPTÉ PAR ' + ia(c),
    lines: ['Diffusion : toutes unités, tous secteurs, Directoire inclus.',
      'Objet : deux systèmes autonomes de facture ancienne, antérieurs à la centralisation du réseau. Signatures inconnues.',
      'Identifiants relevés : GAB-1 (émission rose) · CAR-14 (émission bleue).',
      'Instruction : localiser, ne pas détruire. Procédure de récupération prioritaire. Les porteurs humains sont secondaires.'],
    footer: `ORDRE ne cherche pas seulement des résistants. Il cherche ${ia(c)}, et elle ne sait pas pourquoi.`,
    speech: 'Deux systèmes autonomes. Identifiants : GAB-1, CAR-14. Localiser, ne pas détruire.' }),
  kessler: () => ({ title: 'NOTE DE LA DIRECTION HELIX — A. KESSLER', stamp: 'COFFRE DE DONNÉES · PLI FERMÉ, CLASSÉ « JANUS »',
    lines: ['« Priorité absolue aux supports de 2189. Ils doivent quitter Vesper avec le convoi 02. »',
      '« Aucune trace sur le réseau principal. ORDRE efface ; nous conservons. Le Directoire n’a pas besoin de savoir pourquoi. »',
      '« Ce que ces archives disent de la mise à jour du 17 novembre ne doit être lu par personne d’autre que nous. »'],
    footer: 'Le mot « JANUS » est tamponné en rouge en tête de page. HELIX se sert du Directoire pour cacher ses propres archives.',
    speech: 'Ce que ces archives disent de la mise à jour du dix-sept novembre ne doit être lu par personne d’autre que nous.' }),
  bordereau: () => ({ title: 'BORDEREAU DE CHARGEMENT — CONVOI 03', stamp: 'QUAI DE CHARGEMENT · TOUR DE TRANSIT',
    lines: ['Conteneur C-3 : 14 prisonniers, « non coopératifs ». Eau : 6 litres.',
      'Caisses A-1 à A-6 : archives HELIX 2189, fragile, ne pas exposer à l’humidité.',
      'Mention : « En cas d’incident, les caisses passent avant le conteneur. »'],
    footer: 'Six litres d’eau pour quatorze personnes, et une consigne d’humidité pour les caisses.',
    speech: 'En cas d’incident, les caisses passent avant le conteneur.' })
});
export const logFor = (id, characterId = 'ghju') => LOGS[id]?.(characterId === 'lylu' ? 'lylu' : 'ghju') || null;
