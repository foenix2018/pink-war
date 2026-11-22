// CHAPITRE 08 — déroulé de la mission, indépendant du rendu (même schéma que m06/m07, joué de bout en bout dans les
// tests). Entrée de service, badge au quai (portique), ateliers et sas, nœud d’interconnexion tenu 45 s, surveillance
// coupée, archives copiées en 30 s, chambre de supervision (note du 17/11/2189, autorisation de Kessler, gardien qui
// apprend la position du joueur), antenne d’AEGIS tenue 60 s, ascenseur de service appelé et tenu 30 s.
import { WEAPONS, weaponAllowedForCharacter } from './game-logic.js';
import { configureUnit } from './ligne9-mission.js';
import { keepPressure } from './ligne9-layout.js';
import * as L from './m08-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2, ADAPT_EVERY = 9, ADAPT_RADIUS = 7, ADAPTED = .3;
const S = L.STAGE_INDEX, noop = () => {};
const ACTIVE = Object.freeze({ quai: ['quai'], ateliers: ['ateliers', 'ateliers2'], centre: ['noeud1', 'noeud2', 'noeud3'], securite: ['securite'], archives: ['archives', 'extraction1', 'extraction2'], supervision: ['supervision', 'gardien'], antenne: ['toit1', 'toit2', 'toit3', 'toit4'], ascenseur: ['ascenseur', 'appel1', 'appel2'] });
const RESTORE = Object.freeze({ quai: ['quai'], ateliers: ['ateliers'], securite: ['securite'], archives: ['archives'], supervision: ['supervision'], ascenseur: ['ascenseur'] });
// Doors open at each stage, so a checkpoint restore keeps the way already opened.
const OPEN_AT = Object.freeze({ ateliers: ['portique'], centre: ['portique', 'sas'], securite: ['portique', 'sas', 'securite'], archives: ['portique', 'sas', 'securite', 'archives'], supervision: ['portique', 'sas', 'securite', 'archives', 'galerie'], antenne: ['portique', 'sas', 'securite', 'archives', 'galerie', 'toit'], ascenseur: ['portique', 'sas', 'securite', 'archives', 'galerie', 'toit'] });

export function createM08Mission({ game, characterId = 'ghju', hooks = {} }) {
  const h = { setObstacles: noop, setDoor: noop, openPortal: noop, cue: noop, notice: noop, say: noop, stage: noop, finish: noop, clear: noop, adapt: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set(), opened = new Set();
  let stage = 0, hold = null, completed = false, serial = 0, pressureAt = 0, adapt = null, nextAdapt = Infinity, adaptations = 0, liftOpen = false;
  let collisions = L.buildCollisions();

  const id = () => L.STAGES[stage].id;
  const alive = name => (groups.get(name) || []).filter(e => game.enemies.some(x => x.id === e)).length;
  const say = (key, { again = false } = {}) => { if (!again && said.has(key)) return; said.add(key); h.say(key); };
  const setStage = next => { stage = typeof next === 'string' ? S[next] : next; game.checkpointPosition = { ...L.STAGES[stage].checkpoint, id: L.STAGES[stage].id, label: L.STAGES[stage].label }; h.stage(stage, L.STAGES[stage]); };
  const areaOfPlayer = () => L.areaAt(game.player.x, game.player.z);
  const boss = () => game.enemies.find(e => e.n08);
  function rebuild() { collisions = L.buildCollisions({ open: [...opened] }); game.replaceObstacles(collisions); h.setObstacles(collisions); }
  function openDoor(name) { if (opened.has(name)) return; opened.add(name); rebuild(); h.setDoor(name, true); h.cue('door'); }

  function deploy(name, { alert = false } = {}) {
    const enc = L.ENCOUNTERS[name], ids = []; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 900 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); e.mission = name; ids.push(e.id);
      if (u.n08) Object.assign(e, { n08: true, maxHp: e.hp, damageScale: 1, radius: 1.1, homeX: u.x, homeZ: u.z });
      if (alert) Object.assign(e, { awareness: 'search', alertedUntil: game.time + 8, lastKnownX: game.player.x, lastKnownZ: game.player.z, lastKnownHeight: game.player.elevation });
    }
    game.activePortals = []; game.toSpawn = 0; game.spawnTimer = Infinity; game.nextWave = Infinity;
    groups.set(name, ids); return ids;
  }
  function release(name) {
    const enc = L.ENCOUNTERS[name];
    if (enc.portal) { h.openPortal(enc.portal.x, 0, enc.portal.z, { charge: PORTAL_CHARGE }); h.cue('portal'); h.notice('ORDRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE }); groups.set(name, []); }
    else deploy(name, { alert: true });
  }
  function startHold(name) { hold = { name, start: game.time, until: game.time + L.HOLDS[name], waves: [...(L.HOLD_WAVES[name] || [])] }; h.cue('hold'); }
  function supplies() { for (const s of L.SUPPLIES) game.pickups.push({ id: game.nextId++, kind: s.kind, x: s.x, y: s.y || 0, z: s.z, until: Infinity }); }
  function armWeapons() {
    game.ownedWeapons = new Set([game.weaponIndex, 0, 1, 2, 3, 4, 10].filter(i => weaponAllowedForCharacter(i, characterId) && !WEAPONS[i].melee));
    game.ammo = WEAPONS.map(w => w.capacity);
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z), grounded: true, verticalSpeed: 0, yaw: cp.yaw || 0 }); }
  function freshGame(cp) {
    game.reset(characterId); armWeapons(); rebuild(); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); hold = null; pressureAt = 0; adapt = null; nextAdapt = Infinity; h.clear(); supplies();
  }
  function setWorld() { for (const d of L.DOORS) h.setDoor(d.id, opened.has(d.id)); }
  // The supervision guardian takes ADAPTED of the damage while the player stays near the spot it learnt.
  function adaptation() {
    const n = boss(); if (!n) return;
    const p = game.player, learnt = adapt && Math.hypot(p.x - adapt.x, p.z - adapt.z) < ADAPT_RADIUS;
    n.damageScale = learnt ? ADAPTED : 1;
    if (game.time >= nextAdapt) { nextAdapt = game.time + ADAPT_EVERY; adapt = { x: p.x, z: p.z }; adaptations++; h.adapt(adapt); h.cue('alarm'); h.notice('GARDIEN · COMPORTEMENT ENREGISTRÉ · CHANGE DE POSITION'); }
  }

  const api = {
    get stage() { return stage; }, get stageId() { return id(); }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: L.HOLDS[hold.name] }; },
    get n08() { const n = boss(); return n ? { hp: n.hp, maxHp: n.maxHp || n.hp, shield: n.damageScale ?? 1, name: n.boss, learnt: adapt && { ...adapt }, adaptations } : null; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); completed = false; adaptations = 0; liftOpen = false;
      freshGame(L.START); setStage(S.entree); setWorld(); say('entree');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.ascenseur), sid = L.STAGES[at].id;
      opened.clear(); for (const d of OPEN_AT[sid] || []) opened.add(d);
      if (sid === 'supervision') { done.delete('gardien'); reads.delete('maj-17-11'); reads.delete('autorisation-kessler'); }
      freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[sid] || []) deploy(name);
      setWorld(); game.state = 'playing'; h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs((p.elevation || 0) - (it.y || 0)) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.log) return it;
        if (api.available(it.id)) return it;
      }
      return null;
    },
    available(key) {
      if (hold) return false;
      const s = id();
      if (key === 'badge') return s === 'quai' && alive('quai') <= 1;
      if (key === 'atelier') return s === 'ateliers' && alive('ateliers') + alive('ateliers2') <= 2;
      if (key === 'noeud') return s === 'centre';
      if (key === 'surveillance') return s === 'securite' && alive('securite') <= 2;
      if (key === 'extraction') return s === 'archives' && alive('archives') <= 1;
      if (key === 'transmission') return s === 'antenne';
      if (key === 'appel') return s === 'ascenseur' && alive('ascenseur') <= 1;
      return false;
    },
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      if (it.log) {
        reads.add(it.log); h.cue('read');
        if (id() === 'supervision' && reads.has('maj-17-11') && reads.has('autorisation-kessler') && !groups.has('gardien')) { say('kessler'); deploy('gardien', { alert: true }); nextAdapt = game.time + ADAPT_EVERY; say('gardien'); h.cue('alarm'); }
        return it;
      }
      const key = it.id;
      if (key === 'badge') { done.add(key); say('badge'); openDoor('portique'); setStage(S.ateliers); h.cue('console'); }
      else if (key === 'atelier') { done.add(key); say('atelier'); openDoor('sas'); setStage(S.centre); h.cue('console'); say('centre'); }
      else if (key === 'noeud') { say('noeud'); startHold(key); h.notice('NŒUD JANUS · CONNEXION EN COURS'); }
      else if (key === 'surveillance') { done.add(key); say('surveillance'); openDoor('archives'); setStage(S.archives); deploy('archives', { alert: true }); say('archives'); game.grantCharges(1); }
      else if (key === 'extraction') { say('extraction'); startHold(key); h.notice('ARCHIVES HELIX · COPIE EN COURS'); }
      else if (key === 'transmission') { say('transmission'); startHold(key); h.notice('ANTENNE AEGIS · ÉMISSION EN COURS'); }
      else if (key === 'appel') { say('ascenseur'); startHold(key); h.notice('ASCENSEUR · CABINE EN APPROCHE'); }
      else return null;
      return it;
    },
    update(dt = 1 / 60) {
      if (completed || game.state !== 'playing') return;
      const room = areaOfPlayer(), s = id(), p = game.player;
      for (let i = pending.length - 1; i >= 0; i--) if (game.time >= pending[i].at) { const { name } = pending.splice(i, 1)[0]; deploy(name, { alert: true }); }
      if (game.time >= pressureAt) { pressureAt = game.time + PRESSURE_EVERY; const ids = (ACTIVE[s] || []).flatMap(name => groups.get(name) || []); if (ids.length) keepPressure(game, ids); }
      if (hold) {
        while (hold.waves.length && game.time >= hold.start + hold.waves[0][0]) release(hold.waves.shift()[1]);
        if (game.time >= hold.until) {
          const name = hold.name; hold = null; done.add(name); h.cue('stage');
          if (name === 'noeud') { say('noeudOk'); openDoor('securite'); setStage(S.securite); game.grantCharges(1); }
          if (name === 'extraction') { say('extractionOk'); openDoor('galerie'); setStage(S.supervision); deploy('supervision'); game.grantCharges(1); }
          if (name === 'transmission') { say('transmissionOk'); setStage(S.ascenseur); deploy('ascenseur', { alert: true }); game.grantCharges(1); }
          if (name === 'appel') { liftOpen = true; openDoor('ascenseur'); h.notice('ASCENSEUR · PORTES OUVERTES · MONTER À BORD'); }
        }
      }
      // Places and events.
      if (s === 'entree' && room === 'quai') { setStage(S.quai); deploy('quai', { alert: true }); say('quai'); }
      if (s === 'ateliers' && room === 'ateliers' && !groups.has('ateliers')) { deploy('ateliers', { alert: true }); say('ateliers'); }
      if (s === 'ateliers' && groups.has('ateliers') && !done.has('ateliers-wave') && alive('ateliers') <= 4) { done.add('ateliers-wave'); release('ateliers2'); }
      if (s === 'securite' && (room === 'securite' || room === 'couloir') && !groups.has('securite')) { deploy('securite', { alert: true }); say('securite'); }
      if (s === 'supervision' && room === 'supervision') say('supervision');
      if (s === 'supervision' && groups.has('gardien')) { adaptation(); if (alive('gardien') === 0) { done.add('gardien'); say('gardienOk'); openDoor('toit'); setStage(S.antenne); say('antenne'); game.grantCharges(1); } }
      if (s === 'ascenseur' && liftOpen && Math.abs(p.x - L.LIFT.x) < L.LIFT.hx - .5 && Math.abs(p.z - L.LIFT.z) < L.LIFT.hz - .5) { completed = true; say('fin'); setStage(S.fin); h.finish(); }
    }
  };
  return api;
}
