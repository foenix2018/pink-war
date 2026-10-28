// LIGNE 9 — « La Ligne Noyée » : script of the mission (canon: BIBLE_NARRATIVE_V1 §12 M05, Tome II M05,
// storyboard 05A–05C). Acte II « Sous la ville ». Subtitled lines and readable documents only: the rules of
// play live in ligne9-mission.js. Canon kept: LYLU is the reference hero of M05 (technical route), GHJU can
// play it too with Gaby; ORDRE stays hostile; Nira Solen coordinates the Épars dispensaries; the revelation
// is an active JANUS anchor under evacuated districts; no death is confirmed.

export const SPEAKERS = Object.freeze({
  lylu: { name: 'LYLU', color: '#8fd0ff' }, ghju: { name: 'GHJU', color: '#ff9fcd' },
  cara: { name: 'CARA', color: '#56c8ff' }, gaby: { name: 'GABY', color: '#ff6fb4' },
  nira: { name: 'NIRA SOLEN · ÉPARS', color: '#f2d38a' }, ordre: { name: 'ORDRE · ANNONCE', color: '#ff5a5a' }
});

// A line is [speaker, text]; `hero` is replaced by the player's hero, `ia` by his or her sphere.
// Variants: { lylu: [...], ghju: [...] } when the hero's own voice or relationship differs.
const L = (...lines) => lines;
export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['nira', 'Ici Nira Solen. Tu es à la bouche de la Ligne 9 ? Depuis trois jours, l’eau a pris les tunnels. Nos dispensaires des Bas-Niveaux n’ont plus aucune route sèche.'],
      ['nira', 'Les vieilles pompes P9 sont au bout de la ligne. Si quelqu’un peut les relancer à la main, c’est un technicien des secours.'],
      ['lylu', 'Je connais cette station. J’y suis descendu le soir de la chute, pour rallumer ces mêmes pompes.'],
      ['cara', 'Une station inondée, de nuit, avec ORDRE dans les murs. Tu sais vraiment choisir tes sorties, génie.']),
    ghju: L(['nira', 'Ici Nira Solen. Tu es à la bouche de la Ligne 9 ? Depuis trois jours, l’eau a pris les tunnels. Nos dispensaires des Bas-Niveaux n’ont plus aucune route sèche.'],
      ['nira', 'Les vieilles pompes P9 sont au bout de la ligne. Il faut quelqu’un qui sache où il met les pieds.'],
      ['ghju', 'LYLU est descendu ici le soir de la chute, pour rallumer les pompes. Je veux voir ce qu’il a vu.'],
      ['gaby', 'Alors on descend ensemble. Et on remonte ensemble, GHJU.'])
  },
  hall: {
    lylu: L(['cara', 'Courant coupé, portillons morts. Ta porte de service ne bougera pas sans jus. Le local technique, à droite des guichets.']),
    ghju: L(['gaby', 'La porte de service est verrouillée électriquement. Le local technique, à droite des guichets, doit avoir un tableau de secours.'])
  },
  alerte: { all: L(['ordre', 'SECTEUR 9. PRÉSENCE HUMAINE NON AUTORISÉE. LE CONFINEMENT EST MAINTENU.']) },
  courant: {
    lylu: L(['lylu', 'Tableau de secours… Même câblage qu’en 89. Personne n’y a touché.'], ['cara', 'Regarde-toi, t’es ému devant un disjoncteur.']),
    ghju: L(['ghju', 'Il y a un repère au feutre bleu sur le disjoncteur. C’est sa façon de marquer un circuit.'], ['gaby', 'Il est passé ici. Il savait ce qu’il faisait.'])
  },
  secours: {
    lylu: L(['lylu', 'Le poste de secours… On avait installé les brancards ici.'], ['cara', 'Lis le registre si tu veux. Moi, je surveille le couloir.']),
    ghju: L(['gaby', 'Un poste de secours AEGIS. Il y a encore le registre d’évacuation sur la table.'])
  },
  halles: {
    all: L(['nira', 'Les Halles-Basses. Avant la chute, on y vendait les légumes des serres et des pièces de drones. Le sol a cédé sur la ligne en dessous.']),
    lylu: L(['cara', 'Deux boîtiers de relais, un à chaque bout du marché. Tu raccordes, le rideau du quai remonte. Facile. Sauf le reste.']),
    ghju: L(['gaby', 'Le rideau du quai dépend de deux relais, un à l’ouest, un à l’est. Je te couvre.'])
  },
  emergence: { lylu: L(['cara', 'Ça remonte de l’eau ! Des rampants, sous le plancher !']), ghju: L(['gaby', 'Mouvement dans le bassin. Des rampants sortent de l’eau.']) },
  relais1: { all: L(['nira', 'Un relais répond. Je vois une lumière sur notre vieux plan du réseau.']) },
  relais2: {
    lylu: L(['lylu', 'Les deux relais tiennent. Le rideau se lève.'], ['cara', 'Et ORDRE a entendu le bruit, évidemment.']),
    ghju: L(['ghju', 'Les deux relais tiennent. Le rideau se lève.'], ['gaby', 'ORDRE a dû entendre. Reste à couvert.'])
  },
  acces: {
    lylu: L(['cara', 'Un traqueur, plus loin. Il entend les pas. Marche, ne cours pas.']),
    ghju: L(['gaby', 'Un traqueur acoustique dans le couloir. Avance doucement, il réagit au bruit.'])
  },
  abri: { all: L(['nira', 'Notre abri. Si tu y trouves des trousses, prends-les. On en refera.']) },
  quai: {
    lylu: L(['cara', 'Me dis pas que tu comptes nager là-dedans.'], ['lylu', 'Les câbles de traction trempent. L’eau est sous tension. On pompe, on ne nage pas.']),
    ghju: L(['gaby', 'Ne t’approche pas du bord. Les câbles de traction trempent : l’eau est sous tension.'], ['ghju', 'Alors on pompe.'])
  },
  pompeA: {
    lylu: L(['lylu', 'Pompe A, amorçage. Il me faut une minute.'], ['cara', 'Une minute, c’est long quand ça rampe. Je compte pour toi.']),
    ghju: L(['ghju', 'Pompe A, amorçage. Une minute.'], ['gaby', 'Je reste près de toi. Garde le dos au mur.'])
  },
  rampants: { lylu: L(['cara', 'Sous le quai ! Ils sortent de l’eau !']), ghju: L(['gaby', 'Sous le quai ! Ils sortent de l’eau !']) },
  vidange: { all: L(['nira', 'Le tunnel technique se vide, je le vois sur la jauge. Continue vers la salle des pompes.']) },
  tunnel: {
    lylu: L(['lylu', 'Tunnel technique. Une niche de refuge tous les vingt-cinq mètres. On s’en sert.']),
    ghju: L(['gaby', 'Couloir étroit, peu de couverts. Utilise les niches de refuge.'])
  },
  delestage: {
    all: L(['ordre', 'DÉLESTAGE DU SECTEUR 9-B. ÉCLAIRAGE COUPÉ.']),
    lylu: L(['cara', 'Il éteint la lumière pour nous faire peur. Bon. Ça marche un peu. Lampe frontale.']),
    ghju: L(['gaby', 'Il a coupé l’éclairage. Ta lampe frontale s’allume. Respire.'])
  },
  ventilation: { lylu: L(['cara', 'Un ordre de maintenance signé HELIX dans un local d’ORDRE. Lis ça, c’est louche.']), ghju: L(['gaby', 'Un ordre de maintenance… signé HELIX. Ça ne devrait pas être ici.']) },
  pompes: {
    all: L(['nira', 'La salle P9. Les vannes d’abord, puis le pupitre. Si tu démarres vannes fermées, tout disjoncte et on perd la ligne.']),
    lylu: L(['lylu', 'Je m’en souviens. Je n’étais jamais arrivé jusqu’au pupitre.']),
    ghju: L(['gaby', 'Il n’était jamais arrivé jusqu’au pupitre. Toi, tu peux.'])
  },
  vannes: { all: L(['nira', 'Les trois vannes sont ouvertes. Le pupitre est à toi.']) },
  demarrage: {
    all: L(['ordre', 'ANOMALIE HYDRAULIQUE. RÉTABLISSEMENT DE L’IMMERSION REQUIS. DÉPLOIEMENT.']),
    lylu: L(['cara', 'Quatre-vingt-dix secondes d’amorçage. Et ORDRE ouvre des portails dans la salle. Génial.']),
    ghju: L(['gaby', 'Quatre-vingt-dix secondes. Des portails s’ouvrent dans la salle : tiens la position.'])
  },
  pompesOk: { all: L(['nira', 'Les pompes tournent ! Le niveau baisse partout. Il reste l’écluse de la voie basse.']) },
  ecluse: {
    lylu: L(['lylu', 'Pourquoi tenir autant à garder un secteur évacué sous l’eau ?'], ['cara', 'Parce qu’il y a quelque chose dessous. Ouvre, on va voir.']),
    ghju: L(['gaby', 'Pourquoi ORDRE tient-il tant à garder ce secteur sous l’eau ?'], ['ghju', 'On va le savoir.'])
  },
  revelation: {
    lylu: L(['cara', '…Ça, c’est pas de l’eau qui brille.'], ['lylu', 'Signature de phase. Un ancrage actif, sous les Halles évacuées.']),
    ghju: L(['gaby', 'Signature de phase. Sous les quartiers évacués.'], ['ghju', 'Un ancrage. Actif. Sous des gens qui croyaient avoir tout perdu.'])
  },
  chambre: { all: L(['ordre', 'CHAMBRE JANUS-9. ACCÈS INTERDIT. TRAQUEUR ALPHA ENGAGÉ.']) },
  preuve: { all: L(['nira', 'Je reçois des fragments. Continue, il me faut les deux journaux.']) },
  preuves: {
    all: L(['ordre', 'CONFIDENTIALITÉ COMPROMISE. INVERSION DES POMPES P9. RÉIMMERSION DU SECTEUR.']),
    lylu: L(['cara', 'Il inverse les pompes ! L’eau remonte, bouge-toi ! Porte est, le poste Orme !']),
    ghju: L(['gaby', 'Il inverse les pompes, l’eau remonte ! Porte est, vers le poste Orme. Vite, mais pas seule : je suis là.'])
  },
  orme: {
    lylu: L(['lylu', 'Le poste Orme. Les anciens relais. « Ne prends pas le réseau principal »… C’est d’ici que je l’ai envoyé.']),
    ghju: L(['ghju', 'Le poste Orme… C’est d’ici que venait son message. « Retrouve les anciens relais ».'], ['gaby', 'Il pensait à toi, même ici.'])
  },
  transmis: {
    all: L(['nira', 'Tout est arrivé. Un ancrage HELIX sous nos quartiers, et ORDRE qui noie la ligne pour le cacher. Je diffuse aux enclaves. Remonte, on t’attend.']),
    lylu: L(['cara', 'Allez, technicien. Dans la cabine. Pour une fois, c’est quelqu’un d’autre qui pompe.']),
    ghju: L(['gaby', 'Tu as tenu, GHJU. Il est temps de remonter.'])
  }
});
export function linesFor(id, characterId = 'lylu') {
  const entry = SCRIPT[id]; if (!entry) return [];
  const hero = characterId === 'ghju' ? 'ghju' : 'lylu';
  return [...(entry.all || []), ...(entry[hero] || [])].map(([who, text]) => ({ who, speaker: SPEAKERS[who], text }));
}
// Reading speed of the subtitles: at least 3.2 s, about 15 characters a second.
export const lineSeconds = text => Math.max(3.2, Math.min(9, text.length / 15));

// Readable documents. Paper, screens and terminals that were in the station; none floats in the air.
export const LOGS = Object.freeze({
  avis: { title: 'AVIS AUX USAGERS — 14 mars 2189', body: [
    'En raison d’un incident technique sur le réseau d’énergie, la Ligne 9 est fermée jusqu’à nouvel ordre.',
    'Les usagers sont invités à rejoindre les plateformes d’évacuation de la surface. Suivez les agents AEGIS.',
    'Ne cherchez pas à récupérer vos effets personnels. Les accès techniques sont strictement réservés au personnel.',
    'Merci de votre compréhension. — Régie des Transports de Vesper / ORDRE, service usagers.'] },
  guichet: { title: 'Carnet du guichet — agent de station', body: [
    '14/03, 21 h 40. Plus de courant sur les quais. ORDRE dit « incident maîtrisé ». Les escalators sont bloqués.',
    '22 h 05. Une équipe des secours descend vers la salle des pompes. Un gars au casque bleu, très jeune, qui connaît le réseau par cœur.',
    '22 h 30. L’eau monte dans la voie basse. Ça n’arrive jamais : les pompes P9 ont toujours tenu.',
    '23 h 10. On ferme la station. Je laisse ce carnet ici au cas où quelqu’un revienne pour comprendre.'] },
  registre: { title: 'Registre d’évacuation AEGIS — poste 9', body: [
    'Équipe GHJU (casque rose) : 34 civils pris en charge vers les plateformes hautes, dont 11 enfants. Départ 22 h 12.',
    'Équipe technique LYLU (casque bleu) : descend rétablir l’alimentation des pompes P9 et des ascenseurs. Contact radio perdu à 22 h 47.',
    'Note en marge, au feutre bleu : « Ne prends pas le réseau principal. Retrouve les anciens relais. » — transmis par le relais Orme.',
    'Note ajoutée plus tard, autre écriture : « Le réseau principal a été pris par ORDRE à 23 h. Ceux qui l’ont écouté sont vivants. »'] },
  marchande: { title: 'Mot épinglé sur un étal', body: [
    'Pour Tomas, si tu repasses : je suis partie avec les autres vers l’abri des Épars. J’ai laissé la caisse sous le comptoir.',
    'Les machines sont venues relever les compteurs d’eau la veille. Personne ne relève les compteurs dans un marché souterrain.',
    'Le sol a craqué près de la fontaine. Ils disaient que c’était la vieille ligne. Moi j’ai vu de la lumière rose sous les dalles.',
    '— Ines, étal 12, légumes de serre.'] },
  abri: { title: 'Cahier de l’abri — Nira Solen', body: [
    'Jour 1 de l’inondation. Trente-deux personnes dans l’abri. Eau potable pour cinq jours. Les enfants dorment près du radiateur.',
    'Jour 2. Plus de passage sec vers le dispensaire des Halles. Deux malades à évacuer, impossible par la surface : patrouilles.',
    'Jour 3. Les pompes P9 se sont arrêtées toutes seules, d’un coup, à 4 h du matin. Ce n’est pas une panne. Quelqu’un les a coupées.',
    'Si quelqu’un lit ceci : les trousses sur l’étagère sont pour qui en a besoin. Laissez-en une pour la suivante.'] },
  ventilation: { title: 'Ordre de maintenance ORDRE-OM-9B-0447', body: [
    'Objet : arrêt prolongé des pompes P9. Demandeur : HELIX — programme JANUS, maintenance des ancrages.',
    'Motif : maintien de l’immersion du secteur 9-B (refroidissement passif, réduction de signature).',
    'Consigne : toute reprise manuelle du pompage est classée sabotage. Les unités de maintenance sont autorisées à intervenir.',
    'Validation automatique ORDRE. Aucune signature humaine requise.'] },
  chef: { title: 'Carnet du chef de station — salle P9', body: [
    '14/03/2189. Le jeune des secours au casque bleu est arrivé jusqu’ici. Il a voulu forcer les vannes depuis la galerie.',
    'Je lui ai dit que l’écluse était bloquée par une commande extérieure. Il ne m’a pas cru. Il avait raison de ne pas me croire.',
    'Il est reparti vers le poste Orme pour envoyer un message par les anciens relais. Je ne sais pas s’il est arrivé.',
    'Je laisse les vannes à moitié ouvertes. Qu’un autre finisse le travail.'] },
  'preuve-1': { title: 'Journal HELIX — JANUS-9 (extrait copié)', body: [
    'Ancrage A9 : stable. Puissance extraite : 2,3 % du flux PINK de Vesper.',
    'Sous-sol des Halles-Basses : évacuation des résidents justifiée par « effondrement structurel ». Effondrement provoqué le 12/03/2189.',
    'Immersion de la voie basse : refroidissement et masquage du rayonnement de phase. À maintenir.',
    'Diffusion restreinte : direction HELIX, opérateurs ORDRE. Aucune information aux équipes AEGIS.'] },
  'preuve-2': { title: 'Journal ORDRE — secteur 9-B (extrait copié)', body: [
    'Priorité : continuité de l’ancrage A9. Toute intrusion humaine est une menace pour l’équilibre du réseau.',
    'Pompes P9 : arrêt réitéré à J-3 après reprise par un groupe civil (Épars). Réimmersion effectuée.',
    'Ancrages actifs sous secteurs évacués : 9-B (Halles), 4-A (Archives), 12-C (Jardins). Statut : maintenus.',
    'Calcul : la perte des enclaves civiles est acceptable au regard de la stabilité.'] },
  'relais-orme': { title: 'Relais Orme — file d’envoi locale', body: [
    'Message non effacé, 14/03/2189, 23 h 02, indicatif LYLU → GHJU :',
    '« Ne prends pas le réseau principal. Retrouve les anciens relais. »',
    'Statut : envoyé par le relais isolé. Accusé de réception : aucun.',
    'Nouvel envoi : preuves JANUS-9 → Nira Solen, réseau des Épars. Statut : reçu.'] }
});

export const ENDING = Object.freeze({
  title: 'La Ligne Noyée',
  text: {
    lylu: 'Les pompes P9 tournent, la Ligne 9 redevient une route sèche pour les dispensaires des Épars. Sous les Halles évacuées, un ancrage JANUS fonctionnait en secret, refroidi par l’eau qu’ORDRE maintenait. LYLU a envoyé les preuves par le relais d’où il avait parlé à GHJU sept ans plus tôt. Le message de 2189 n’a jamais reçu d’accusé de réception. Mais quelqu’un, quelque part, a suivi les anciens relais.',
    ghju: 'Les pompes P9 tournent, la Ligne 9 redevient une route sèche pour les dispensaires des Épars. Sous les Halles évacuées, un ancrage JANUS fonctionnait en secret, refroidi par l’eau qu’ORDRE maintenait. Au poste Orme, GHJU a trouvé l’origine du message qui l’a sauvée en 2189 : LYLU l’avait envoyé d’ici, seul, sous la ville. Il n’a jamais su qu’elle l’avait reçu.'
  },
  next: 'Suite : 06 — Le Cœur d’Acier'
});
