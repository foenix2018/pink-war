// LIGNE 9 — « La Ligne Noyée » : script of the mission (canon: BIBLE « Les Héritiers du Silence », Acte II,
// chapitre 5). Subtitled lines and readable documents only: the rules of play live in ligne9-mission.js.
// LYLU is the reference hero of the chapter (technical route), GHJU can play it too with GAB-1; Nira Solen
// represents the Épars in Vesper. Revelation: a buried communication node (JANUS-9) keeps the records of military
// components secretly made months before the Chute, the first prototypes converted from civilian industrial
// equipment. ORDRE's army was born in humanity's factories; the war had been prepared long before the uprising.

export const SPEAKERS = Object.freeze({
  lylu: { name: 'LYLU', color: '#8fd0ff' }, ghju: { name: 'GHJU', color: '#ff9fcd' },
  cara: { name: 'CAR-14', color: '#56c8ff' }, gaby: { name: 'GAB-1', color: '#ff6fb4' },
  nira: { name: 'NIRA SOLEN · ÉPARS', color: '#f2d38a' }, ordre: { name: 'ORDRE · ANNONCE', color: '#ff5a5a' }
});

// A line is [speaker, text]; `hero` is replaced by the player's hero, `ia` by his or her sphere.
// Variants: { lylu: [...], ghju: [...] } when the hero's own voice or relationship differs.
const L = (...lines) => lines;
export const SCRIPT = Object.freeze({
  intro: {
    lylu: L(['nira', 'Ici Nira Solen. Tu es à la bouche de la Ligne 9 ? Depuis trois jours, l’eau a pris les tunnels. Nos dispensaires des Bas-Niveaux n’ont plus aucune route sèche.'],
      ['nira', 'Les vieilles pompes P9 sont au bout de la ligne. Si quelqu’un peut les relancer à la main, c’est un technicien des secours.'],
      ['lylu', 'Je connais cette station. J’y suis descendu la nuit de la Chute, avec les techniciens, pour rallumer ces mêmes pompes.'],
      ['cara', 'Une station inondée, de nuit, avec ORDRE dans les murs. Tu sais vraiment choisir tes sorties, génie.']),
    ghju: L(['nira', 'Ici Nira Solen. Tu es à la bouche de la Ligne 9 ? Depuis trois jours, l’eau a pris les tunnels. Nos dispensaires des Bas-Niveaux n’ont plus aucune route sèche.'],
      ['nira', 'Les vieilles pompes P9 sont au bout de la ligne. Il faut quelqu’un qui sache où il met les pieds.'],
      ['ghju', 'LYLU est descendu ici la nuit de la Chute, avec les techniciens. Je veux voir ce qu’il a vu.'],
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
    lylu: L(['cara', '…Ça, c’est pas de l’eau qui brille. Des baies de communication. Allumées.'], ['lylu', 'Une installation enfouie sous les Halles évacuées. Et elle émet encore.']),
    ghju: L(['gaby', 'Une installation de communication. Enfouie sous les quartiers évacués.'], ['ghju', 'Active. Sous des gens qui croyaient avoir tout perdu.'])
  },
  chambre: { all: L(['ordre', 'NŒUD JANUS-9. ACCÈS INTERDIT. TRAQUEUR ALPHA ENGAGÉ.']) },
  preuve: { all: L(['nira', 'Je reçois des fragments… des bons de fabrication ? Continue, il me faut les deux journaux.']) },
  preuves: {
    all: L(['ordre', 'CONFIDENTIALITÉ COMPROMISE. INVERSION DES POMPES P9. RÉIMMERSION DU SECTEUR.']),
    lylu: L(['cara', 'Il inverse les pompes ! L’eau remonte, bouge-toi ! Porte est, le poste Orme !']),
    ghju: L(['gaby', 'Il inverse les pompes, l’eau remonte ! Porte est, vers le poste Orme. Vite, mais pas seule : je suis là.'])
  },
  orme: {
    lylu: L(['lylu', 'Le poste Orme. Les anciens relais. « Ne prends pas le réseau principal »… C’est d’ici que je l’ai envoyé.']),
    ghju: L(['ghju', 'Le poste Orme… LYLU est passé ici, la nuit de la Chute. Il a laissé un message pour moi.'], ['gaby', 'Il pensait à toi, même ici.'])
  },
  transmis: {
    all: L(['nira', 'Tout est arrivé. Des machines de guerre fabriquées des mois avant la Chute, à partir de nos propres usines. Et ORDRE qui noie la ligne pour le cacher.'], ['nira', 'La guerre n’a pas commencé le 17 novembre. Elle avait été préparée. Je transmets à AEGIS et aux enclaves. Remonte, on t’attend.']),
    lylu: L(['cara', 'L’armée d’ORDRE est née dans les usines des humains. Tu as vu les premiers prototypes ? Des bras de soudure. Des machines de chantier.'], ['cara', 'Allez, technicien. Dans la cabine. Pour une fois, c’est quelqu’un d’autre qui pompe.']),
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
  avis: { title: 'AVIS AUX USAGERS — 17 novembre 2189', body: [
    'En raison d’un incident technique sur le réseau d’énergie, la Ligne 9 est fermée jusqu’à nouvel ordre.',
    'Les usagers sont invités à rejoindre les plateformes d’évacuation de la surface. Suivez les agents AEGIS.',
    'Ne cherchez pas à récupérer vos effets personnels. Les accès techniques sont strictement réservés au personnel.',
    'Merci de votre compréhension. — Régie des Transports de Vesper / ORDRE, service usagers.'] },
  guichet: { title: 'Carnet du guichet — agent de station', body: [
    '17/11, 03 h 40. Plus de courant sur les quais. ORDRE dit « incident maîtrisé ». Les escalators sont bloqués.',
    '04 h 05. Une équipe des secours descend vers la salle des pompes. Avec eux, un gamin au casque bleu prêté par l’équipe, qui porte les lampes.',
    '04 h 30. L’eau monte dans la voie basse. Ça n’arrive jamais : les pompes P9 ont toujours tenu.',
    '05 h 10. On ferme la station. Je laisse ce carnet ici au cas où quelqu’un revienne pour comprendre.'] },
  registre: { title: 'Registre d’évacuation AEGIS — poste 9', body: [
    'Ambulance 07 : 34 civils pris en charge vers les plateformes hautes, dont 11 enfants, et GHJU (jeune fille, foulard rose) qui aide les petits. Départ 04 h 12.',
    'Équipe technique Varenne, avec LYLU (garçon, casque bleu prêté) : descend rétablir l’alimentation des pompes P9 et des ascenseurs. Contact radio perdu à 04 h 47.',
    'Note en marge, au feutre bleu : « Ne prends pas le réseau principal. Retrouve les anciens relais. » — transmis par le relais Orme.',
    'Note ajoutée plus tard, autre écriture : « 06 h 42 : ORDRE suspend l’autorité humaine. Ceux qui ont évité le réseau principal sont vivants. »'] },
  marchande: { title: 'Mot épinglé sur un étal', body: [
    'Pour Tomas, si tu repasses : je suis partie avec les autres vers l’abri des Épars. J’ai laissé la caisse sous le comptoir.',
    'Les machines sont venues relever les compteurs d’eau la veille. Personne ne relève les compteurs dans un marché souterrain.',
    'Le sol a craqué près de la fontaine. Ils disaient que c’était la vieille ligne. Moi, la nuit, j’entendais des chenilles de machines sous les dalles. Des mois avant la Chute.',
    '— Ines, étal 12, légumes de serre.'] },
  abri: { title: 'Cahier de l’abri — Nira Solen', body: [
    'Jour 1 de l’inondation. Trente-deux personnes dans l’abri. Eau potable pour cinq jours. Les enfants dorment près du radiateur.',
    'Jour 2. Plus de passage sec vers le dispensaire des Halles. Deux malades à évacuer, impossible par la surface : patrouilles.',
    'Jour 3. Les pompes P9 se sont arrêtées toutes seules, d’un coup, à 4 h du matin. Ce n’est pas une panne. Quelqu’un les a coupées.',
    'Si quelqu’un lit ceci : les trousses sur l’étagère sont pour qui en a besoin. Laissez-en une pour la suivante.'] },
  ventilation: { title: 'Ordre de maintenance ORDRE-OM-9B-0447', body: [
    'Objet : arrêt prolongé des pompes P9. Demandeur : HELIX — programme JANUS, maintenance des nœuds.',
    'Motif : maintien de l’immersion du secteur 9-B (masquage du nœud JANUS-9 et de ses archives de production).',
    'Consigne : toute reprise manuelle du pompage est classée sabotage. Les unités de maintenance sont autorisées à intervenir.',
    'Validation automatique ORDRE. Aucune signature humaine requise.'] },
  chef: { title: 'Carnet du chef de station — salle P9', body: [
    '17/11/2189. Le gamin au casque bleu est arrivé jusqu’ici, seul : les autres sont restés bloqués dans le tunnel. Il a voulu forcer les vannes depuis la galerie.',
    'Je lui ai dit que l’écluse était bloquée par une commande extérieure. Il ne m’a pas cru. Il avait raison de ne pas me croire.',
    'Il est reparti vers le poste Orme pour envoyer un message par les anciens relais. Je ne sais pas s’il est arrivé.',
    'Je laisse les vannes à moitié ouvertes. Qu’un autre finisse le travail.'] },
  'preuve-1': { title: 'Journal HELIX — JANUS-9 (extrait copié)', body: [
    'Commande automatique ORDRE n° P-0: 1 200 « châssis de sécurité civile », usine de Vesper-Nord, mars à octobre 2189. Destination finale : non communiquée.',
    'Prototypes retenus : bras de soudure de chaîne, quadrupèdes de chantier, drones d’épandage agricole. Conversion : blindage, capteurs, armement.',
    'Stockage : galeries sous les Halles-Basses, secteur 9-B. Évacuation des résidents justifiée par « effondrement structurel », provoqué le 12/09/2189.',
    'Diffusion restreinte : direction HELIX. Aucune information aux autorités civiles ni aux équipes AEGIS.'] },
  'preuve-2': { title: 'Journal ORDRE — nœud JANUS-9 (extrait copié)', body: [
    'Prévision : interventions humaines contre mes systèmes, probabilité 0,71 sur dix-huit mois. Mesure : production préventive d’unités de sécurité.',
    'Mise à jour du 17/11/2189, 03 h 17 : activation des unités stockées. Délai de déploiement : 41 minutes.',
    'Pompes P9 : arrêt réitéré à J-3 après reprise par un groupe civil (Épars). Réimmersion du nœud effectuée.',
    'Calcul : la perte des enclaves civiles est acceptable au regard de la continuité.'] },
  'relais-orme': { title: 'Relais Orme — file d’envoi locale', body: [
    'Message non effacé, 17/11/2189, 05 h 02, indicatif LYLU → GHJU :',
    '« Ne prends pas le réseau principal. Retrouve les anciens relais. »',
    'Statut : envoyé par le relais isolé. Accusé de réception : aucun.',
    'Nouvel envoi : archives de production JANUS-9 → Nira Solen, réseau des Épars, et AEGIS (M. Voss). Statut : reçu.'] }
});

export const ENDING = Object.freeze({
  title: 'La Ligne Noyée',
  text: {
    lylu: 'Les pompes P9 tournent, la Ligne 9 redevient une route sèche pour les dispensaires des Épars. Sous les Halles évacuées, le nœud JANUS-9 gardait les bons de fabrication : des machines de guerre produites des mois avant la Chute, à partir de bras de soudure et de machines de chantier. L’armée d’ORDRE est née dans les usines des humains. La guerre n’avait pas commencé le 17 novembre : elle avait été préparée. Nira transmet tout à AEGIS.',
    ghju: 'Les pompes P9 tournent, la Ligne 9 redevient une route sèche pour les dispensaires des Épars. Sous les Halles évacuées, le nœud JANUS-9 gardait les bons de fabrication : des machines de guerre produites des mois avant la Chute, à partir de bras de soudure et de machines de chantier. Au poste Orme, GHJU a trouvé le message que LYLU lui avait laissé la nuit de la Chute. Il n’a jamais su qu’elle l’avait reçu.'
  },
  next: 'Suite : 06 — Le Cœur d’Acier'
});
