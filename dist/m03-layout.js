// MISSION 03 — « Le Convoi des Absents » (Tome II M03: dispensaire → route haute → échangeur bloqué; « préparer
// transport ; protéger convoi ; réparer une barrière ; rejoindre gare » ; sondes, traqueurs, embuscade lourde ;
// les disparus ont été transférés vers un centre). The route runs through the night Vesper sector of the visitor map
// (baked in assets/m03, coordinates kept: avenue along −z, medical annex west, workshop east, A3 relay on its deck,
// viaduct at z −56, the PINK fracture at the north end), then east along the service lane under the viaduct to a new
// blocked interchange and the freight station of the Anneau logistique line.
// The four steps of the first version of this chapter (annex archive, workshop manifest, A3 relay, ORDRE beacon at
// the fracture, controlled from the barrage) are kept as the spine of the mission.
// Yaw as on the other three.js pages: 0 looks towards −z, π/2 towards −x.
import {rampPillars,rampDeckHulls,FREIGHT_GANTRY,WORKSHOP_EQUIPMENT,STREET_BLADES} from './m03-coherence.js';

export const LEVEL_ID = 'convoi-des-absents';
export const START = Object.freeze({ x: 2, z: 62, yaw: 0 });

const area = (id, x1, x2, z1, z2, label, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, label, ...extra });
// Most specific first.
export const AREAS = Object.freeze([
  area('annexe', -46, -12, 11, 53, 'Annexe médicale · dispensaire du secteur 03', { roof: 8.5 }),
  area('atelier', 18, 42, 15.5, 42, 'Atelier technique · pièces de pompe et vérins', { roof: 7.2 }),
  area('a3', -35, -6, -42, -17, 'Archives A3 · relais en hauteur'),
  area('fracture', -14, 14, -98, -80, 'Pied du pylône de surveillance d’ORDRE'),
  area('voie-est', 13, 62, -51, -32, 'Voie de service sous la route haute'),
  area('echangeur', 62, 98, -72, -30, 'Échangeur bloqué · bretelle de l’Anneau logistique'),
  area('gare', 62, 98, -98, -72, 'Gare de fret · ligne de l’Anneau logistique'),
  area('avenue', -14, 14, -98, 72, 'Avenue des Secours · secteur 03')
]);
export const areaAt = (x, z) => AREAS.find(a => x >= a.x1 && x <= a.x2 && z >= a.z1 && z <= a.z2)?.id || null;

// ---------- Colliders added to the baked sector ----------
const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, extra: true, ...extra });
const at = (kind, x, z, hx, hz, height, extra = {}) => ({ kind, x, z, hx, hz, y: 0, height, extra: true, ...extra });

// West building of the visitor map drawn without a collider in the page, and the edges of the new east zone.
// Perimeter wall closing the sector on the west, the north and the north-east (the towers of the city start right
// behind it); drawn by m03-grounds.js.
export const PERIMETER = Object.freeze([box('wall', -78, -77.2, -123, 72, 0, 3.4, { surface: 'concrete', look: 'perimeter' }), box('wall', -78, 78, 71.2, 72, 0, 3.4, { surface: 'concrete', look: 'perimeter' }),
  box('wall', 77.2, 78, -29.6, 72, 0, 3.4, { surface: 'concrete', look: 'perimeter' })].map(o => Object.freeze(o)));
function sectorFixes() {
  return PERIMETER.map(o => ({ ...o })); // The bake already contains the exact building hull (-60…-30, -21.5…-.5).
}
// Échangeur bloqué and gare de fret (x 62…98). Pillars of the ramps, wrecks, noise walls, the train and the platform.
function eastZone() {
  const out = [];
  // Noise walls closing the zone (east edge and the south side of the interchange).
  out.push(box('wall', 96.5, 97.5, -98, -30, 0, 5, { surface: 'concrete', look: 'noise' }));
  out.push(box('wall', 62, 97, -30.6, -29.6, 0, 5, { surface: 'concrete', look: 'noise' }));
  // Piers and deck of the single closed service ramp, shared with the rendered structure.
  for(const p of rampPillars())out.push({...p,kind:'pillar',surface:'concrete'});
  out.push(...rampDeckHulls());
  // Wrecks of the interchange: cover for the fights, the lane of the van kept clear (x 78…82).
  out.push(at('wreck', 68, -42, 2.1, 1, 1.6, { surface: 'metal', vehicle: 'car' }), at('wreck', 90, -44, 1, 2.2, 1.6, { surface: 'metal', vehicle: 'car' }));
  out.push(at('wreck', 70, -66, 4, 1.3, 3, { surface: 'metal', vehicle: 'truck' }), at('wreck', 92, -66, 1.3, 3.6, 3, { surface: 'metal', vehicle: 'van' }));
  for (const [x, z] of [[66, -52], [73, -55], [88, -48], [93, -58]]) out.push(at('barrier', x, z, 1.1, .35, 1.1, { surface: 'concrete' }));
  out.push(at('post', 70, -46, .45, .45, 1.3, { surface: 'metal', device: 'treuil' }));
  // Gare de fret: track bed and the medical train (north edge), containers, the dispatch booth, gantry legs.
  out.push(box('train', 64, 96, -97.6, -94.4, 0, 4.2, { surface: 'metal', look: 'train' }));
  for (const [x, z, w, d] of [[67, -80, 1.3, 3], [92, -82, 3, 1.3], [68, -88, 1.3, 2.4]]) out.push(at('container', x, z, w, d, x===67?5.4:2.7, { surface: 'metal' }));
  out.push(box('booth', 90, 96, -78, -72, 0, 3.2, { surface: 'metal', look: 'booth' }));
  for(const x of[FREIGHT_GANTRY.x1,FREIGHT_GANTRY.x2])out.push(at('gantry',x,FREIGHT_GANTRY.z,.6,.6,FREIGHT_GANTRY.height+1,{surface:'metal'}));
  for(const x of[89.25,92.75])out.push(at('barrier',x,-34.2,1.75,.35,1.6,{surface:'concrete',rampClosure:true}));
  out.push(at('post', 72, -86, .45, .45, 1.3, { surface: 'metal', device: 'arrimage' }));
  return out;
}
export const COMBAT_STATIONS=Object.freeze([
 Object.freeze(at('medical-island',-32,32,1.6,.55,1.05,{surface:'metal',prop:'stretcher'})),
 Object.freeze(at('medical-island',-38,43,1.2,.65,1.8,{surface:'metal',prop:'cabinet'})),
 Object.freeze(at('workshop-island',30,30,1.6,.65,1.05,{surface:'metal',prop:'workbench'}))
]);
// Movable pieces: the ORDRE barrier across the avenue and the jack-knifed trailer at the interchange.
export const MOVABLE = Object.freeze({
  barriere: Object.freeze(at('boom', 0, -34, 9, .3, 1.25, { surface: 'metal', movable: 'barriere' })),
  remorque: Object.freeze(at('trailer', 80, -51, 6.5, 1.4, 3.6, { surface: 'metal', movable: 'remorque' }))
});
export function extraObstacles({ open = [] } = {}) {
  const gone = new Set(open);
  return [...sectorFixes(), ...eastZone(), ...COMBAT_STATIONS,...STREET_BLADES.map(([x,y,z])=>at('sign-post',x+Math.sign(x)*.65,z,.1,.1,y+1.1,{surface:'metal'})),...WORKSHOP_EQUIPMENT.map(o=>({...o,y:0,kind:'workshop-machine',surface:'metal'})), ...(gone.has('remorque')?[at('trailer-parked',89,-60,1.4,6.5,3.6,{surface:'metal',parked:'remorque'})]:[]), ...Object.entries(MOVABLE).filter(([id]) => !gone.has(id)).map(([, o]) => o)].map(o => ({ ...o, navPad: Math.min(o.hx, o.hz) < .7 ? .7 : 1.3 }));
}
// Barrier posts of the ORDRE checkpoint stay; pedestrians pass along the pavements (x ±11).
export const CHECKPOINT_POSTS = Object.freeze([at('post', -9.6, -34, .35, .35, 1.6, { surface: 'metal' }), at('post', 9.6, -34, .35, .35, 1.6, { surface: 'metal' })]);

// ---------- Inès's ambulance ----------
// Waypoints of its route; `stop` marks where it waits for a stage to clear the way.
export const VAN_PATH = Object.freeze([
  { x: -6, z: 46 }, { x: 0, z: 30 }, { x: 0, z: -28, stop: 'barriere' },
  { x: 0, z: -41 }, { x: 14, z: -41 }, { x: 62, z: -38 }, { x: 80, z: -40, stop: 'remorque' },
  { x: 80, z: -60 }, { x: 80, z: -86, stop: 'quai' }
].map(p => Object.freeze(p)));
export const VAN = Object.freeze({ speed: 3.2, hp: 100, sabotageRange: 7, sabotage: 3.5, leash: 34, halfLength: 2.9, halfWidth: 1.15, height: 3.0 });

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.4, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('ines', -3.4, 46, 'PARLER À INÈS (AMBULANCE)'),
  it('alimentation', -6.4, 10.5, 'RÉARMER L’ALIMENTATION DE L’ANNEXE'),
  it('dossier', -26, 17, 'RELEVER LE DOSSIER DU CONVOI', { log: 'dossier' }),
  it('kit', -20, 24, 'PRENDRE LES KITS DE RÉANIMATION'),
  it('manifeste', 22, 23.4, 'EXTRAIRE LE MANIFESTE DU CONVOI', { log: 'manifeste' }),
  it('verin', 34, 38.4, 'DÉMONTER LE VÉRIN HYDRAULIQUE'),
  it('relais', -18.4, -29.5, 'CROISER LES COORDONNÉES AU RELAIS A3', { y: 5.06, log: 'relais' }),
  it('balise', 5.6, -29.5, 'BROUILLER LE PYLÔNE · COMMANDE DU BARRAGE'),
  it('barriere', -8.4, -32.4, 'POSER LE VÉRIN SUR LA BARRIÈRE'),
  it('treuil', 70, -44.4, 'COMMANDER LE TREUIL DE L’ÉCHANGEUR'),
  it('arrimage', 72, -84.4, 'LANCER L’ARRIMAGE DE L’AMBULANCE'),
  it('regulation', 89, -75, 'CONSULTER LE REGISTRE DE RÉGULATION', { log: 'regulation' }),
  // Documents found along the way (always readable).
  it('doc-couvre-feu', 9, 52, 'LIRE L’AVIS DE COUVRE-FEU DU DIRECTOIRE', { log: 'couvre-feu' }),
  it('doc-carnet', -30, 46, 'LIRE LE CARNET DE L’INFIRMERIE', { log: 'carnet' }),
  it('doc-atelier', 38, 24, 'LIRE LE BON DE COMMANDE DU DIRECTOIRE', { log: 'commande' }),
  it('doc-ravel', -10, -38, 'LIRE LE MESSAGE GLISSÉ SOUS LE PORTIQUE', { y: 5.06, log: 'ravel' }),
  it('doc-stabilisation', 66, -36, 'LIRE LA FICHE DE TRANSFERT', { log: 'stabilisation' })
]);

// AEGIS caches and ORDRE ammunition along the route.
export const SUPPLIES = Object.freeze([['heal', -20, 30], ['cell', -32, 46], ['cell', 28, 36], ['heal', 2, -20], ['heal', -24, -36, 5.06],
  ['cell', 6, -76], ['heal', 40, -42], ['cell', 74, -36], ['heal', 86, -70], ['cell', 78, -78]].map(([kind, x, z, y = 0]) => Object.freeze({ kind, x, z, y })));

// ---------- Encounters (ORDRE machines: sondes, traqueurs, embuscade lourde) ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  annexe: { wave: 2, units: [unit('stalker', -36, 22), unit('scuttler', -40, 36), unit('scuttler', -22, 48), unit('stalker', -6, 26)] },
  atelier: { wave: 2, units: [unit('stalker', 8, 30), unit('seer', 10, 20), unit('stalker', 8, 40), unit('probe', 30, 10)] },
  route1: { wave: 3, units: [unit('stalker', -8, 2), unit('scuttler', 6, 0), unit('scuttler', 8, -6), unit('probe', 0, -10)] },
  route2: { wave: 3, units: [unit('stalker', 6, -22), unit('seer', -8, -24), unit('scuttler', 4, -30), unit('probe', -6, -18)] },
  a3: { wave: 3, units: [unit('probe', -28, -24), unit('probe', -22, -38), unit('stalker', -2, -40)] },
  fracture: { wave: 4, units: [unit('brute', 4, -44, { elite: true }), unit('bulwark', 9, -40), unit('stalker', -4, -44), unit('probe', 6, -46)] },
  balise1: { wave: 4, portal: { x: 6, z: -46 }, units: [unit('stalker', 6, -46), unit('scuttler', 4, -44), unit('scuttler', 8, -44)] },
  balise2: { wave: 4, portal: { x: -2, z: -44 }, units: [unit('seer', -2, -44), unit('probe', 8, -46), unit('stalker', 4, -42)] },
  barriere1: { wave: 4, units: [unit('stalker', 6, -46), unit('scuttler', -6, -48), unit('probe', 0, -50)] },
  barriere2: { wave: 4, units: [unit('stalker', 26, -40), unit('seer', -6, -44), unit('scuttler', 8, -48)] },
  voie: { wave: 4, units: [unit('probe', 24, -48), unit('probe', 44, -36), unit('stalker', 52, -44), unit('scuttler', 46, -40)] },
  echangeur: { wave: 5, units: [unit('stalker', 86, -56), unit('seer', 92, -48), unit('scuttler', 74, -58), unit('probe', 84, -64)] },
  treuil1: { wave: 5, portal: { x: 88, z: -62 }, units: [unit('stalker', 88, -62), unit('scuttler', 84, -57), unit('stalker', 88, -64)] },
  treuil2: { wave: 5, units: [unit('bulwark', 86, -72), unit('probe', 76, -66), unit('seer', 66, -60)] },
  gare: { wave: 5, units: [unit('stalker', 86, -88), unit('seer', 74, -78), unit('probe', 88, -76), unit('scuttler', 80, -90)] },
  arrimage1: { wave: 6, portal: { x: 74, z: -78 }, units: [unit('stalker', 74, -78), unit('scuttler', 72, -76), unit('scuttler', 76, -76)] },
  arrimage2: { wave: 6, units: [unit('brute', 88, -62, { elite: true }), unit('probe', 70, -70), unit('stalker', 86, -68)] },
  arrimage3: { wave: 6, portal: { x: 86, z: -80 }, units: [unit('bulwark', 86, -80), unit('seer', 88, -78), unit('stalker', 84, -78), unit('probe', 80, -72)] }
});
export const HOLDS = Object.freeze({ balise: 22, barriere: 30, treuil: 30, arrimage: 45 });
export const HOLD_WAVES = Object.freeze({
  balise: [[2, 'balise1'], [11, 'balise2']], barriere: [[3, 'barriere1'], [16, 'barriere2']],
  treuil: [[3, 'treuil1'], [16, 'treuil2']], arrimage: [[3, 'arrimage1'], [16, 'arrimage2'], [30, 'arrimage3']]
});

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('arrivee', 'REJOINDRE L’AMBULANCE', 'L’ambulance d’Inès attend devant l’annexe médicale, côté gauche de l’avenue.', { x: 2, z: 62, yaw: 0 }),
  stage('alimentation', 'RÉARMER L’ANNEXE MÉDICALE', 'Coffret d’alimentation sur le trottoir, devant l’angle nord de l’annexe.', { x: -2, z: 40, yaw: 0 }),
  stage('dossier', 'RELEVER LE DOSSIER DU CONVOI', '01 · ANNEXE. Entre par le côté nord, puis rejoins les archives à gauche.', { x: -8, z: 14, yaw: Math.PI / 2 }),
  stage('kit', 'PRENDRE LES KITS DE RÉANIMATION', 'Armoire de la salle de soins, à droite des archives.', { x: -20, z: 18, yaw: Math.PI }),
  stage('atelier', 'EXTRAIRE LE MANIFESTE DU CONVOI', '02 · ATELIER. Traverse l’avenue vers l’est. Entre par la porte côté avenue.', { x: 8, z: 26, yaw: -Math.PI / 2 }),
  stage('verin', 'DÉMONTER LE VÉRIN HYDRAULIQUE', 'Banc de levage au fond de l’atelier. Il remplacera le vérin de la barrière.', { x: 22, z: 26, yaw: -Math.PI / 2 }),
  stage('escorte', 'ESCORTER L’AMBULANCE', 'Reste près de l’ambulance : les machines sabotent ce qui roule sans escorte.', { x: -2, z: 36, yaw: 0 }),
  stage('a3', 'CROISER LES COORDONNÉES AU RELAIS A3', '03 · BARRAGE. Inès attend en bas. Prends l’escalier A3 à gauche pour obtenir l’accès au brouillage.', { x: -2, z: -24, yaw: 0 }),
  stage('balise', 'COUPER LE SUIVI D’ORDRE', 'Redescends du relais A3. Borne de brouillage à droite du barrage : elle coupe le pylône à distance. Tiens 22 secondes.', { x: 2, z: -25, yaw: 0 }),
  stage('barriere', 'RÉPARER LA BARRIÈRE', 'Poser le vérin sur le poteau gauche, puis tenir pendant la levée.', { x: -4, z: -26, yaw: 0 }),
  stage('escorte2', 'PASSER SOUS LA ROUTE HAUTE', 'L’ambulance prend la voie de service vers l’échangeur. Reste avec elle.', { x: 0, z: -40, yaw: -Math.PI / 2 }),
  stage('echangeur', 'DÉGAGER L’ÉCHANGEUR', 'Une remorque bloque la bretelle. Le treuil de dépannage est à gauche du passage.', { x: 64, z: -36, yaw: -Math.PI / 2 }),
  stage('gare', 'REJOINDRE LA GARE DE FRET', 'Suis l’ambulance jusqu’au quai du train sanitaire.', { x: 80, z: -56, yaw: 0 }),
  stage('arrimage', 'ARRIMER L’AMBULANCE AU TRAIN', 'Commande d’arrimage au pied du portique. Quarante-cinq secondes.', { x: 76, z: -78, yaw: 0 }),
  stage('regulation', 'LIRE LE REGISTRE DE RÉGULATION', 'Cabine de régulation, au bout du quai.', { x: 84, z: -80, yaw: -Math.PI / 2 }),
  stage('fin', 'LE CONVOI DES ABSENTS', 'Le train sanitaire part vers l’Anneau logistique.', { x: 84, z: -80, yaw: -Math.PI / 2 })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));

// Clear the turning lane rather than sending the convoy through a concrete barrier.
// The same offset is applied to the replacement prop and its physical volume.
export function sectorPropOffset(c) {
 const x=(c.x1+c.x2)/2,z=(c.z1+c.z2)/2;
 const barrier=c.label==='barrière béton'&&Math.abs(x-16.4)<.1&&Math.abs(z+41)<.1;
 const furniture=c.x1>=8.4&&c.x2<=15.1&&c.z1>=-42.5&&c.z2<=-40.7&&c.y2<=11&&c.y2>.25;
 return barrier||furniture?{x:0,z:-7}:{x:0,z:0};
}
