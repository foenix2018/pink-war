// Level screen shared by every chapter (loading cover, start, end and defeat panels), after the chapter 03 model:
// logo, « HISTOIRE > CHAPITRE 0N », large chapter number and title, zone line, short text, numbered objectives with
// icons, RETOUR at the bottom left and the main action (COMMENCER / progress) at the bottom right, on the chapter's art.
const ICONS = {
  medic: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
  doc: '<path d="M6 2h8l5 5v15H6zM13 3v5h5"/><path d="M9 12h7M9 15h7M9 18h5" stroke-width="1.6" fill="none"/>',
  up: '<path d="M12 3 4 11h5v9h6v-9h5z"/>',
  target: '<circle cx="12" cy="12" r="7.5" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="2.4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke-width="2" fill="none"/>',
  bolt: '<path d="M13 2 5 13h6l-1 9 8-11h-6z"/>',
  signal: '<path d="M12 14a2 2 0 1 0 0 .01M7.8 9.8a6 6 0 0 1 8.4 0M5 7a10 10 0 0 1 14 0" stroke-width="2" fill="none"/><path d="M11 15h2l1 7h-4z"/>',
  door: '<path d="M5 2h11v20H5zM16 4h3v18" fill="none" stroke-width="2"/><circle cx="13" cy="12" r="1.2"/>',
  van: '<path d="M2 7h12v9H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path d="M6 9v4M4 11h4" stroke="#0b0f19" stroke-width="1.6"/>',
  wave: '<path d="M2 15c3-3 5 3 8 0s5 3 8 0 3-1 4-1M2 10c3-3 5 3 8 0s5 3 8 0 3-1 4-1" fill="none" stroke-width="2"/>',
  lock: '<path d="M6 10h12v11H6z"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" fill="none" stroke-width="2"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" fill="none" stroke-width="2"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" fill="none" stroke-width="2"/>'
};
const sib = c => c === 'lylu' ? 'GHJU' : 'LYLU';

export const BRIEFINGS = Object.freeze({
  1: { title: 'Le Dernier Signal', zone: 'Vesper // Quartier des secours', image: c => c === 'lylu' ? 'art/chargement-lylu.webp?v=3.47' : 'art/chargement.webp?v=3.47',
    text: c => `Il y a trois jours, une émission de onze secondes est passée sur le canal 07. Seule ta station écoutait encore cette fréquence. ${sib(c)}, ${c === 'lylu' ? 'ta sœur' : 'ton frère'}, est peut-être en vie.`,
    objectives: [['door', 'Revenir à la station 07', 'Lire le journal de la nuit de la chute.'], ['bolt', 'Rallumer le quartier', 'Groupe électrogène, porte, puis l’annexe hors réseau.'],
      ['signal', 'Atteindre le relais A3', 'Retrouver la connexion d’il y a trois jours.'], ['data', 'Copier le registre des disparus', 'Archives végétales, avant la purge d’ORDRE.']] },
  2: { title: 'Sous les Néons', zone: 'Vesper // Bas-Niveaux', image: () => 'art/mission02-cover.webp?v=3.71.0',
    text: c => `L’enclave du marché couvert a été « recensée » par HELIX Security. ${sib(c)} est parti${c === 'lylu' ? 'e' : ''} avec les malades. Retrouve les civils cachés et la trace du convoi.`,
    objectives: [['medic', 'Rejoindre l’enclave du marché', 'Dispensaire, radio, puis la grille de l’enclave.'], ['target', 'Libérer la galerie HELIX', 'Repousser la patrouille et saisir le terminal.'],
      ['up', 'Rejoindre la tour de transit', 'Passerelles à +12 m, puis le contrôle HELIX.'], ['lock', 'Bloquer le convoi 03', 'Manifeste du coffre, puis le quai de chargement.']] },
  3: { title: 'Le Convoi des Absents', zone: 'Vesper // Secteur 03 · Archives A3', image: () => 'art/mission03-cover.svg?v=1',
    text: () => 'Les dernières traces du convoi HELIX mènent au secteur 03. Escorte l’ambulance d’Inès de l’annexe médicale jusqu’à la gare de fret de l’Anneau logistique, avant qu’ORDRE ne verrouille la zone.',
    objectives: [['medic', 'Fouiller l’annexe médicale', 'Retrouver les premiers éléments du convoi.'], ['doc', 'Récupérer le manifeste HELIX', 'Dans l’atelier de maintenance.'],
      ['up', 'Rejoindre les archives A3', 'Accéder au niveau supérieur.'], ['target', 'Neutraliser la liaison ORDRE', 'Couper la balise de la fracture, puis escorter l’ambulance jusqu’à la gare.']] },
  5: { title: 'La Ligne Noyée', zone: 'Vesper // Ligne 9 · Halles-Basses', image: () => null,
    text: () => 'L’eau a pris la Ligne 9 sous les Halles-Basses. Relance à la main les vieilles pompes P9 et découvre ce qu’ORDRE cache sous les secteurs évacués.',
    objectives: [['bolt', 'Rétablir le courant de secours', 'Local technique de la station.'], ['wave', 'Relancer les pompes P9', 'Trois vannes, puis le pupitre central.'],
      ['door', 'Ouvrir l’écluse', 'Tenir pendant l’ouverture.'], ['data', 'Transmettre les preuves', 'Par l’ancien relais du poste Orme.']] }
});
export function briefingFor(mission = 1, characterId = 'ghju') {
  const b = BRIEFINGS[mission] || BRIEFINGS[1], c = characterId === 'lylu' ? 'lylu' : 'ghju';
  return { mission, number: String(mission).padStart(2, '0'), title: b.title, zone: b.zone, text: b.text(c), image: b.image(c),
    objectives: b.objectives.map(([icon, title, detail], i) => ({ icon, title, detail, n: String(i + 1).padStart(2, '0') })) };
}

const STYLE_URL = new URL('./mission-briefing.css?v=3.71.0', import.meta.url).href;
const LOGO_URL = new URL('./art/pink-wars-wordmark.svg?v=2', import.meta.url).href;
export function ensureBriefingStyle(doc = document) {
  if (doc.querySelector('[data-pw-briefing-style]')) return;
  const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = STYLE_URL; link.dataset.pwBriefingStyle = ''; doc.head.append(link);
}
const el = (doc, tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function icon(doc, name) { const s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[name] || ICONS.target; return s; }

// Builds the shared parts (logo, breadcrumb, number and title, zone, text, objectives) into `host`.
export function buildBriefing(host, info, { doc = document, titleNode = null, textNode = null } = {}) {
  const logo = el(doc, 'img', 'pwb-logo'); logo.src = LOGO_URL; logo.alt = 'PINK WARS';
  const crumb = el(doc, 'p', 'pwb-crumb'); crumb.append(el(doc, 'span', '', 'Histoire'), el(doc, 'b', '', '›'), el(doc, 'span', '', 'Chapitre ' + info.number));
  const head = el(doc, 'div', 'pwb-head'), number = el(doc, 'span', 'pwb-number', info.number);
  const title = titleNode || el(doc, 'h1'); if (!titleNode) title.textContent = info.title; title.classList.add('pwb-title');
  head.append(number, title);
  const zone = el(doc, 'p', 'pwb-zone', 'Zone : ' + info.zone);
  const text = textNode || el(doc, 'p', '', info.text); text.classList.add('pwb-text');
  const objectives = el(doc, 'section', 'pwb-objectives'); objectives.append(el(doc, 'h2', '', 'Objectifs'));
  const list = el(doc, 'ol'); objectives.append(list);
  for (const o of info.objectives) {
    const li = el(doc, 'li'), ico = el(doc, 'span', 'pwb-icon'); ico.append(icon(doc, o.icon));
    const body = el(doc, 'span', 'pwb-obj'); const line = el(doc, 'span', 'pwb-obj-line'); line.append(el(doc, 'b', '', o.n), el(doc, 'strong', '', o.title));
    body.append(line, el(doc, 'small', '', o.detail)); li.append(ico, body); list.append(li);
  }
  host.prepend(logo, crumb, head, zone);
  if (!textNode) host.append(text); else head.after(zone);
  host.append(objectives);
  return { logo, crumb, head, number, title, zone, text, objectives };
}

// Restyles a level page's start/end panel (#shade with .panel, ids kept for the page's own code) as the level screen.
export function decorateShade(shade, { mission, characterId = 'ghju', backHref = './index.html', doc = document } = {}) {
  if (!shade || shade.classList.contains('pw-briefing')) return null;
  ensureBriefingStyle(doc);
  const info = briefingFor(mission, characterId), panel = shade.querySelector('.panel') || shade;
  shade.classList.add('pw-briefing'); if (info.image) shade.style.setProperty('--pwb-art', `url("${new URL(info.image, import.meta.url).href}")`); shade.dataset.mission = String(mission);
  panel.classList.add('pwb-content');
  panel.querySelector('.kicker')?.classList.add('pwb-hidden');
  const h1 = panel.querySelector('h1'), text = panel.querySelector('#panel-text') || panel.querySelector('p');
  const parts = buildBriefing(panel, info, { doc, titleNode: h1, textNode: text });
  // The title keeps its markup (the pages rewrite it for the end and defeat panels); the zone follows the title.
  parts.head.after(parts.zone); parts.zone.after(text); text.after(parts.objectives);
  const start = panel.querySelector('#start');
  if (start) {
    // The model's main action reads COMMENCER; the chevron is drawn by the style, so text arrows are dropped.
    start.classList.add('pwb-start'); start.textContent = 'Commencer';
    const strip = () => { const t = start.textContent, clean = t.replace(/\s*[→›>]+\s*$/, ''); if (clean !== t) start.textContent = clean; };
    new MutationObserver(strip).observe(start, { childList: true, characterData: true, subtree: true });
  }
  const back = el(doc, 'a', 'pwb-back', 'Retour'); back.href = backHref; panel.append(back);
  const small = panel.querySelector('.small:not(#status)'); small?.classList.add('pwb-small');
  return parts;
}

// Loading cover of a chapter (mission-loading.js): same layout, a progress gauge in place of COMMENCER.
export function buildLoadingCover(root, mission, characterId, { doc = document, backHref = './index.html' } = {}) {
  ensureBriefingStyle(doc);
  const info = briefingFor(mission, characterId);
  root.classList.add('pw-briefing', 'pwb-loading'); if (info.image) root.style.setProperty('--pwb-art', `url("${new URL(info.image, import.meta.url).href}")`); root.dataset.mission = String(mission);
  const content = el(doc, 'div', 'pwb-content'); root.append(content); buildBriefing(content, info, { doc });
  const back = el(doc, 'a', 'pwb-back', 'Retour'); back.href = backHref; root.append(back);
  const gauge = el(doc, 'div', 'pwb-gauge'); gauge.innerHTML = '<div class="pwb-gauge-labels"><span class="pw-load-state">Préparation du secteur</span><span class="pw-load-value">0 %</span></div><div class="pw-load-track" role="progressbar" aria-label="Préparation du chapitre" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><button class="pw-load-error" hidden>Réessayer</button>';
  root.append(gauge);
  return info;
}
