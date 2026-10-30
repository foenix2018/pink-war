// Vesper signage shared by the missions: neon signs with halo, vertical kanji blades, animated holographic adverts of
// the city's brands, wayfinding plates with pictograms, hazard plates and stickers. Everything is drawn on canvases
// (no font download, no image file) and returned as three.js meshes; `update(t)` animates flicker and holograms.
const FONT = 'system-ui,"Segoe UI",Arial,sans-serif', COND = '"Bahnschrift","DIN Condensed","Arial Narrow",system-ui,sans-serif', JP = '"Hiragino Sans","Yu Gothic","Noto Sans CJK JP","Noto Sans JP","MS Gothic",sans-serif';

// The city's brands and voices (Vesper, 2196): used by the adverts so that every street does not read the same.
export const BRANDS = Object.freeze({
  helix: { name: 'HELIX', line: 'VOTRE SÉCURITÉ, NOTRE MÉMOIRE', jp: '安全', a: '#ff2f45', b: '#f2f4f7', bg: '#0b0d10', motif: 'helix' },
  vesperTransit: { name: 'VESPER TRANSIT', line: 'ANNEAU LOGISTIQUE · 24 H / 24', jp: '交通', a: '#5fe0f0', b: '#ffffff', bg: '#04161c', motif: 'rails' },
  nova: { name: 'NOVA RAMEN', line: 'BOUILLON D’ALGUES · BAS-NIVEAUX', jp: 'ラーメン', a: '#ffb35c', b: '#ff4fa1', bg: '#1a0b06', motif: 'bowl' },
  kitsune: { name: 'KITSUNE', line: 'IMPLANTS OCULAIRES · SANS ORDONNANCE', jp: '電脳', a: '#ff4fa1', b: '#9f7bff', bg: '#12061a', motif: 'eye' },
  ordre: { name: 'ORDRE', line: 'L’ORDRE VEILLE · COUVRE-FEU 20 H', jp: '秩序', a: '#ff3b4e', b: '#ffd2d6', bg: '#160307', motif: 'seal' },
  aegis: { name: 'AEGIS', line: 'ON NE LAISSE PERSONNE', jp: '救助', a: '#8fd0ff', b: '#ff9fcd', bg: '#06121c', motif: 'cross' },
  janus: { name: 'JANUS ÉNERGIE', line: 'LA PHASE AU SERVICE DE LA VILLE', jp: '位相', a: '#c06bff', b: '#ff4fa1', bg: '#0c0618', motif: 'ring' },
  koi: { name: 'SYNTH-KOI', line: 'COMPAGNONS HOLOGRAPHIQUES', jp: '鯉', a: '#5fe0f0', b: '#ff6fb4', bg: '#051018', motif: 'koi' }
});
// Short vertical blade words, as on the shop fronts of Vesper's markets.
export const BLADES = Object.freeze(['市場', '修理', '薬局', '屋台', '電脳', '夜市', '酒場', '救急', '倉庫', '危険', '入口', '東']);

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(T, c) { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
function glowText(g, text, x, y, color, blur) { g.save(); g.shadowColor = color; for (const b of [blur * 2.2, blur, blur * .35]) { g.shadowBlur = b; g.fillText(text, x, y); } g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = .55; g.fillText(text, x, y); g.restore(); }
function chamfer(g, x, y, w, h, k) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - k); g.lineTo(x + w - k, y + h); g.lineTo(x, y + h); g.lineTo(x, y + k); g.closePath(); }
const pictos = {
  arrow: (g, s) => { g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .8, 0); g.lineTo(s * .3, 0); g.lineTo(s * .3, s); g.lineTo(-s * .3, s); g.lineTo(-s * .3, 0); g.lineTo(-s * .8, 0); g.closePath(); g.fill(); },
  train: (g, s) => { g.fillRect(-s * .6, -s * .8, s * 1.2, s * 1.2); g.clearRect(-s * .45, -s * .6, s * .9, s * .45); g.fillRect(-s * .7, s * .55, s * .4, s * .25); g.fillRect(s * .3, s * .55, s * .4, s * .25); },
  medic: (g, s) => { g.fillRect(-s * .25, -s * .8, s * .5, s * 1.6); g.fillRect(-s * .8, -s * .25, s * 1.6, s * .5); },
  bolt: (g, s) => { g.beginPath(); g.moveTo(s * .2, -s); g.lineTo(-s * .6, s * .15); g.lineTo(-s * .05, s * .15); g.lineTo(-s * .25, s); g.lineTo(s * .6, -s * .15); g.lineTo(s * .05, -s * .15); g.closePath(); g.fill(); },
  warn: (g, s) => { g.beginPath(); g.moveTo(0, -s); g.lineTo(s, s * .8); g.lineTo(-s, s * .8); g.closePath(); g.fill(); g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(-s * .09, -s * .35, s * .18, s * .65); g.fillRect(-s * .09, s * .42, s * .18, s * .18); g.restore(); },
  eye: (g, s) => { g.beginPath(); g.ellipse(0, 0, s, s * .5, 0, 0, Math.PI * 2); g.fill(); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, s * .32, 0, Math.PI * 2); g.fill(); g.restore(); },
  phase: (g, s) => { g.lineWidth = s * .18; g.beginPath(); g.arc(0, 0, s * .8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, s * .35, 0, Math.PI * 2); g.fill(); },
  exit: (g, s) => { g.fillRect(-s * .9, -s, s * .7, s * 2); g.beginPath(); g.moveTo(s * .1, -s * .5); g.lineTo(s, 0); g.lineTo(s * .1, s * .5); g.closePath(); g.fill(); },
  lift: (g, s) => { g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .6, -s * .3); g.lineTo(-s * .6, -s * .3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, s); g.lineTo(s * .6, s * .3); g.lineTo(-s * .6, s * .3); g.closePath(); g.fill(); }
};

export function createSignage(T, { root, low = false } = {}) {
  const animated = [], stats = { signs: 0 };
  const add = o => { root.add(o); stats.signs++; return o; };
  const plane = (tex, w, h, { emissive = true, transparent = true, additive = false, side = T.FrontSide } = {}) => new T.Mesh(new T.PlaneGeometry(w, h), emissive
    ? new T.MeshBasicMaterial({ map: tex, transparent, toneMapped: false, depthWrite: !additive, blending: additive ? T.AdditiveBlending : T.NormalBlending, side })
    : new T.MeshStandardMaterial({ map: tex, transparent, alphaTest: transparent ? .05 : 0, roughness: .55, metalness: .1, side }));
  const place = (m, x, y, z, yaw) => { m.position.set(x, y, z); m.rotation.y = yaw; return add(m); };
  const flicker = (mesh, rate = .93) => animated.push(t => { mesh.material.opacity = Math.sin(t * 17 + mesh.id) > rate ? .35 : 1; });

  // Neon lettering on a dark back plate: one or two lines, optional kanji, tube glow.
  function neon(lines, { color = '#ff4fa1', color2 = '#5fe0f0', kanji = '', w = 4, h = 1.2, plate = true, x = 0, y = 0, z = 0, yaw = 0, flick = true } = {}) {
    const rows = Array.isArray(lines) ? lines : [lines], W = 1024, H = Math.round(W * h / w), c = canvas(W, H), g = c.getContext('2d');
    if (plate) { const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#0b0f19f0'); grad.addColorStop(1, '#05070cf0'); g.fillStyle = grad; chamfer(g, 6, 6, W - 12, H - 12, H * .12); g.fill();
      g.strokeStyle = color; g.lineWidth = 6; g.shadowColor = color; g.shadowBlur = 18; chamfer(g, 14, 14, W - 28, H - 28, H * .1); g.stroke(); g.shadowBlur = 0; }
    const left = kanji ? H * .95 : W * .06;
    if (kanji) { g.font = `900 ${Math.round(H * .58)}px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color2; glowText(g, kanji, H * .5, H * .52, color2, 22); }
    g.textAlign = kanji ? 'left' : 'center'; g.textBaseline = 'middle';
    rows.forEach((row, k) => { const size = k ? H * .2 : H * (rows.length > 1 ? .4 : .5); g.font = `${k ? 700 : 900} ${Math.round(size)}px ${COND}`; g.fillStyle = k ? '#e8eef4' : color;
      const yy = rows.length === 1 ? H * .53 : k ? H * .78 : H * .42; const xx = kanji ? left : W / 2; if (k) g.fillText(row, xx, yy, W - left - 30); else glowText(g, row, xx, yy, color, 26); });
    const m = place(plane(texture(T, c), w, h), x, y, z, yaw); if (flick && !low) flicker(m, .965); return m;
  }
  // Vertical blade with kanji (and a small Latin line), double-sided, hanging off a facade.
  function blade(word, { color = '#ff4fa1', sub = '', w = .7, h = 2.6, x = 0, y = 0, z = 0, yaw = 0 } = {}) {
    const W = 256, H = Math.round(W * h / w), c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#07090f'; g.fillRect(0, 0, W, H); g.strokeStyle = color; g.lineWidth = 8; g.shadowColor = color; g.shadowBlur = 16; g.strokeRect(10, 10, W - 20, H - 20); g.shadowBlur = 0;
    const chars = [...word], step = (H - (sub ? 150 : 60)) / chars.length; g.font = `900 ${Math.round(Math.min(W * .62, step * .78))}px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    chars.forEach((ch, i) => { g.fillStyle = color; glowText(g, ch, W / 2, 40 + step * (i + .5), color, 20); });
    if (sub) { g.font = `800 ${Math.round(W * .13)}px ${COND}`; g.fillStyle = '#e8eef4'; g.save(); g.translate(W / 2, H - 70); g.fillText(sub, 0, 0, W - 30); g.restore(); }
    const m = place(plane(texture(T, c), w, h, { side: T.DoubleSide }), x, y, z, yaw);
    const frame = new T.Mesh(new T.BoxGeometry(w + .08, h + .08, .06), new T.MeshStandardMaterial({ color: 0x14181f, roughness: .5, metalness: .7 })); frame.position.z = -.04; m.add(frame);
    if (!low) flicker(m, .975); return m;
  }
  // Holographic advert of a city brand: motif, name, tagline, kanji; additive, with a slow scan line.
  function advert(brandKey, { w = 6, h = 3, x = 0, y = 0, z = 0, yaw = 0, holo = true } = {}) {
    const b = BRANDS[brandKey] || BRANDS.helix, W = 1024, H = Math.round(W * h / w), c = canvas(W, H), g = c.getContext('2d');
    if (!holo) { g.fillStyle = b.bg; g.fillRect(0, 0, W, H); }
    else { const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, b.bg + 'aa'); grad.addColorStop(1, b.bg + '33'); g.fillStyle = grad; g.fillRect(0, 0, W, H); }
    g.strokeStyle = b.a; g.lineWidth = 5; g.shadowColor = b.a; g.shadowBlur = 14; chamfer(g, 10, 10, W - 20, H - 20, H * .08); g.stroke(); g.shadowBlur = 0;
    // Motif.
    const cx = H * .55, cy = H * .52, s = H * .3; g.save(); g.translate(cx, cy); g.strokeStyle = b.a; g.fillStyle = b.a; g.lineWidth = 7; g.shadowColor = b.a; g.shadowBlur = 20;
    if (b.motif === 'helix') { for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 4, yy = -s + i * s * 2 / 26; g.fillStyle = i % 2 ? b.a : b.b; g.beginPath(); g.arc(Math.cos(a) * s * .6, yy, 7, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(-Math.cos(a) * s * .6, yy, 7, 0, Math.PI * 2); g.fill(); } }
    else if (b.motif === 'rails') { for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * s * .15, s); g.lineTo(k * s * .5, -s); g.stroke(); } g.beginPath(); g.arc(0, -s * .2, s * .45, 0, Math.PI * 2); g.stroke(); }
    else if (b.motif === 'bowl') { g.beginPath(); g.arc(0, 0, s * .8, 0, Math.PI); g.stroke(); g.beginPath(); g.moveTo(-s * .9, 0); g.lineTo(s * .9, 0); g.stroke(); for (const k of [-.3, 0, .3]) { g.beginPath(); g.moveTo(k * s, -s * .2); g.bezierCurveTo(k * s - 18, -s * .5, k * s + 18, -s * .7, k * s, -s); g.stroke(); } }
    else if (b.motif === 'eye') { pictos.eye(g, s * .9); }
    else if (b.motif === 'seal') { g.beginPath(); g.arc(0, 0, s * .9, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, s * .65, 0, Math.PI * 2); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * s * .65, Math.sin(a) * s * .65); g.lineTo(Math.cos(a) * s * .9, Math.sin(a) * s * .9); g.stroke(); } }
    else if (b.motif === 'cross') { pictos.medic(g, s * .8); }
    else if (b.motif === 'ring') { pictos.phase(g, s); }
    else if (b.motif === 'koi') { g.beginPath(); g.ellipse(-s * .1, 0, s * .7, s * .3, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(s * .6, 0); g.lineTo(s, -s * .35); g.lineTo(s, s * .35); g.closePath(); g.stroke(); }
    g.restore();
    // Text.
    const tx = H * 1.08; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `900 ${Math.round(H * .24)}px ${COND}`; g.fillStyle = b.a; glowText(g, b.name, tx, H * .36, b.a, 24);
    g.font = `700 ${Math.round(H * .085)}px ${COND}`; g.fillStyle = b.b; g.fillText(b.line, tx, H * .58, W - tx - 30);
    g.font = `900 ${Math.round(H * .16)}px ${JP}`; g.fillStyle = b.b; g.globalAlpha = .85; g.fillText(b.jp, tx, H * .78); g.globalAlpha = 1;
    // Scan lines.
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = 0; yy < H; yy += 6) g.fillRect(0, yy, W, 2);
    const m = place(plane(texture(T, c), w, h, { additive: holo, side: holo ? T.DoubleSide : T.FrontSide }), x, y, z, yaw);
    if (holo) { m.material.opacity = .85; animated.push(t => { m.material.opacity = (.7 + .15 * Math.sin(t * 2.3 + m.id)) * (Math.sin(t * 11 + m.id * 3) > .97 ? .35 : 1); m.position.y = y + Math.sin(t * .8 + m.id) * .03; }); }
    return m;
  }
  // Wayfinding plate: pictogram, French line, Japanese line, optional direction arrow. Lit (back-lit plate).
  function wayfinding(title, { sub = '', jp = '', picto = 'arrow', arrow = 0, color = '#ffc890', bg = '#0b0d10', w = 3, h = .8, x = 0, y = 0, z = 0, yaw = 0 } = {}) {
    const W = 1024, H = Math.round(W * h / w), c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = color; g.fillRect(0, 0, W, H * .06); g.fillRect(0, H * .94, W, H * .06);
    g.save(); g.translate(H * .5, H * .5); g.fillStyle = color; g.strokeStyle = color; (pictos[picto] || pictos.arrow)(g, H * .28); g.restore();
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#f2f4f7'; g.font = `900 ${Math.round(H * (sub ? .3 : .38))}px ${COND}`; g.fillText(title, H * 1.02, sub ? H * .36 : H * .5, W - H * 2.1);
    if (sub) { g.font = `700 ${Math.round(H * .16)}px ${COND}`; g.fillStyle = color; g.fillText(sub, H * 1.02, H * .64, W - H * 2.1); }
    if (jp) { g.font = `800 ${Math.round(H * .14)}px ${JP}`; g.fillStyle = '#9aa6b4'; g.fillText(jp, H * 1.02, H * .84, W - H * 2.1); }
    if (arrow !== null && arrow !== undefined && picto !== 'arrow') { g.save(); g.translate(W - H * .55, H * .5); g.rotate(arrow); g.fillStyle = color; pictos.arrow(g, H * .26); g.restore(); }
    return place(plane(texture(T, c), w, h, { transparent: false }), x, y, z, yaw);
  }
  // Hazard plate / sticker (yellow-black stripes, pictogram, short text). Not lit.
  function hazard(text, { sub = '', picto = 'warn', w = .9, h = .6, x = 0, y = 0, z = 0, yaw = 0, color = '#f2c230' } = {}) {
    const W = 512, H = Math.round(W * h / w), c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; for (let k = -H; k < W; k += 44) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 22, 0); g.lineTo(k + 22 + H * .18, H * .18); g.lineTo(k + H * .18, H * .18); g.closePath(); g.fill(); g.beginPath(); g.moveTo(k, H * .82); g.lineTo(k + 22, H * .82); g.lineTo(k + 22 + H * .18, H); g.lineTo(k + H * .18, H); g.closePath(); g.fill(); }
    g.save(); g.translate(H * .45, H * .5); g.fillStyle = '#111'; (pictos[picto] || pictos.warn)(g, H * .2); g.restore();
    g.fillStyle = '#111'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(H * .17)}px ${COND}`; g.fillText(text, H * .8, sub ? H * .44 : H * .5, W - H * .9);
    if (sub) { g.font = `700 ${Math.round(H * .1)}px ${COND}`; g.fillText(sub, H * .8, H * .62, W - H * .9); }
    return place(plane(texture(T, c), w, h, { emissive: false, transparent: false }), x, y, z, yaw);
  }
  return { neon, blade, advert, wayfinding, hazard, update(t) { for (const f of animated) f(t); }, stats: () => ({ ...stats }) };
}

// Sign atlas of the visitor map (16 slots of 256 px) redrawn in the same signage style: neon frame, kanji, icon.
export function drawSignAtlas(g, labels) {
  const pal = [['#ff4fa1', '#5fe0f0'], ['#5fe0f0', '#ffb35c'], ['#ffb35c', '#ff4fa1'], ['#c06bff', '#5fe0f0']], kanji = ['救急', '修理', '避難', '工場', '電脳', '記録', '中継', '管制', '区域', '秩序', '市場', '倉庫', '駅', '危険', '出口', '東'];
  g.fillStyle = '#05070c'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 16; i++) {
    const x = i % 4 * 256, y = Math.floor(i / 4) * 256, label = labels[i] || '', [a, b] = pal[i % 4];
    g.save(); g.translate(x, y);
    const grad = g.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, '#0d1220'); grad.addColorStop(1, '#070a12'); g.fillStyle = grad; chamfer(g, 6, 6, 244, 244, 26); g.fill();
    g.strokeStyle = a; g.lineWidth = 5; g.shadowColor = a; g.shadowBlur = 14; chamfer(g, 12, 12, 232, 232, 22); g.stroke(); g.shadowBlur = 0;
    g.font = `900 46px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b; glowText(g, label.startsWith('ORDRE') ? '秩序' : kanji[i], 128, 62, b, 16);
    const parts = label.split(' / '); g.font = `900 30px ${COND}`; g.fillStyle = a;
    parts.forEach((part, j) => { const words = part.split(' '), lines = ['']; for (const word of words) { if (g.measureText(lines.at(-1) + ' ' + word).width > 210 && lines.at(-1)) lines.push(word); else lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word; }
      lines.slice(0, 2).forEach((line, k) => { if (j === 0) glowText(g, line, 128, 126 + k * 32, a, 12); else { g.font = `700 22px ${COND}`; g.fillStyle = '#e8eef4'; g.fillText(line, 128, 150 + j * 34 + k * 24); } }); });
    g.fillStyle = a; g.fillRect(40, 214, 176, 3); g.font = `700 13px ${COND}`; g.fillStyle = '#8b97a8'; g.fillText('VESPER · SECTEUR 03', 128, 232);
    g.restore();
  }
}
