// CHAPITRE 07 — déroulé de la mission, indépendant du rendu (même schéma que m06-mission.js, joué de bout en bout
// dans les tests). Sous-bois sous les sondes, gué tenu 30 s pendant que la passerelle remonte, moulin et aqueduc, cascade,
// grotte et turbine du relais (45 s), Centre de la Cascade (journal et dossier TRANSCENDANCE), cour d'extraction tenue
// 90 s pendant la liaison avec AEGIS, puis la SY-05 qui apprend la position du joueur, enfin l'exfiltration par
// l'aqueduc jusqu'à la rivière. Les répliques sont celles de m07-story.js.
import { WEAPONS, weaponAllowedForCharacter } from './game-logic.js';
import { configureUnit } from './ligne9-mission.js';
import { keepPressure } from './ligne9-layout.js';
import * as L from './m07-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2, ADAPT_EVERY = 9, ADAPT_RADIUS = 7, ADAPTED = .3;
const S = L.STAGE_INDEX, noop = () => {};
const ACTIVE = Object.freeze({ sousbois: ['sousbois'], gue: ['gue', 'gue1', 'gue2'], ruines: ['ruines', 'ruines2'], cascade: ['cascade'], grotte: ['grotte', 'rampants1', 'rampants2'], centre: ['centre'], cour: ['cour1', 'cour2', 'cour3', 'cour4', 'n08'], sortie: ['sortie', 'sortie2'] });
const RESTORE = Object.freeze({ sousbois: ['sousbois'], gue: ['gue'], ruines: ['ruines'], cascade: ['cascade'], grotte: ['grotte'], centre: ['centre'], sortie: ['sortie'] });

export function createM07Mission({ game, characterId = 'ghju', hooks = {} }) {
  const h = { setObstacles: noop, setDoor: noop, openPortal: noop, cue: noop, notice: noop, say: noop, stage: noop, finish: noop, clear: noop, adapt: noop, n08: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set();
  let stage = 0, hold = null, completed = false, serial = 0, pressureAt = 0, adapt = null, nextAdapt = Infinity, adaptations = 0, n08Deployed = false;
  const collisions = L.buildCollisions();

  const id = () => L.STAGES[stage].id;
  const alive = name => (groups.get(name) || []).filter(e => game.enemies.some(x => x.id === e)).length;
  const say = (key, { again = false } = {}) => { if (!again && said.has(key)) return; said.add(key); h.say(key); };
  const setStage = next => { stage = typeof next === 'string' ? S[next] : next; game.checkpointPosition = { ...L.STAGES[stage].checkpoint, id: L.STAGES[stage].id, label: L.STAGES[stage].label }; h.stage(stage, L.STAGES[stage]); };
  const areaOfPlayer = () => L.areaAt(game.player.x, game.player.z);
  const n08 = () => game.enemies.find(e => e.n08);

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
    if (enc.portal) { h.openPortal(enc.portal.x, L.walkHeight(enc.portal.x, enc.portal.z), enc.portal.z, { charge: PORTAL_CHARGE }); h.cue('portal'); h.notice('ORDRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE }); groups.set(name, []); }
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
    game.reset(characterId); armWeapons(); game.replaceObstacles(collisions); h.setObstacles(collisions); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); hold = null; pressureAt = 0; adapt = null; nextAdapt = Infinity; n08Deployed = false; h.clear(); supplies();
  }
  // The SY-05 takes ADAPTED of the damage while the player stays near the spot it learnt.
  function adaptation() {
    const n = n08(); if (!n) return;
    const p = game.player, learnt = adapt && Math.hypot(p.x - adapt.x, p.z - adapt.z) < ADAPT_RADIUS;
    n.damageScale = learnt ? ADAPTED : 1;
    if (game.time >= nextAdapt) {
      nextAdapt = game.time + ADAPT_EVERY; adapt = { x: p.x, z: p.z }; adaptations++;
      h.adapt(adapt); h.cue('alarm'); h.notice('SY-05 · COMPORTEMENT ENREGISTRÉ · CHANGE DE POSITION'); say('n08', { again: adaptations < 3 });
    }
  }
  function deployN08() { n08Deployed = true; deploy('n08', { alert: true }); nextAdapt = game.time + ADAPT_EVERY; h.n08('land'); h.cue('alarm'); }

  const api = {
    get stage() { return stage; }, get stageId() { return id(); }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return []; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: L.HOLDS[hold.name] }; },
    get n08() { const n = n08(); return n ? { hp: n.hp, maxHp: n.maxHp || n.hp, shield: n.damageScale ?? 1, name: n.boss, learnt: adapt && { ...adapt }, adaptations } : null; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      done.clear(); said.clear(); reads.clear(); completed = false; adaptations = 0;
      freshGame(L.START); setStage(S.lisiere); say('lisiere');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.sortie), sid = L.STAGES[at].id;
      if (sid === 'cour') done.delete('liaison');
      freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[sid] || []) deploy(name);
      game.state = 'playing'; h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
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
      if (key === 'treuil') return s === 'gue' && alive('gue') <= 1;
      if (key === 'vanne') return s === 'ruines' && alive('ruines') + alive('ruines2') <= 2 && done.has('ruines-wave');
      if (key === 'turbine') return s === 'grotte' && alive('grotte') <= 1;
      if (key === 'liaison') return s === 'cour';
      return false;
    },
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      if (it.log) {
        reads.add(it.log); h.cue('read');
        if (it.log === 'dossier') say('dossier');
        if (it.log === 'journal') say('protection');
        if (id() === 'centre' && reads.has('dossier') && reads.has('journal') && alive('centre') <= 1) { setStage(S.cour); say('recuperation'); }
        return it;
      }
      const key = it.id;
      if (key === 'treuil') { say('treuil'); startHold(key); h.notice('PASSERELLE · REMONTÉE EN COURS'); }
      else if (key === 'vanne') { done.add(key); say('vanneOk'); h.cue('valve'); setStage(S.cascade); deploy('cascade', { alert: false }); say('cascade'); }
      else if (key === 'turbine') { say('turbine'); startHold(key); h.notice('RELAIS · TURBINE EN REMISE EN ROUTE'); }
      else if (key === 'liaison') { say('liaison'); startHold(key); h.notice('LIAISON AEGIS · TRANSMISSION EN COURS'); }
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
          if (name === 'treuil') { setStage(S.ruines); h.notice('PASSERELLE RELEVÉE · LE GUÉ EST À VOUS'); game.grantCharges(1); }
          if (name === 'turbine') { say('turbineOk'); setStage(S.centre); deploy('centre'); game.grantCharges(1); }
          if (name === 'liaison') { h.notice('LIAISON ÉTABLIE · ALERTE : SY-05 EN APPROCHE'); deployN08(); }
        }
      }
      // Places and events.
      if (s === 'lisiere' && (room === 'sousbois' || p.z < 78)) { setStage(S.sousbois); deploy('sousbois'); say('sousBois'); }
      if (s === 'sousbois') { if (p.x > -58 && p.z < 46 && !said.has('traqueur')) say('traqueur'); if (room === 'gue' || p.x > -40) { setStage(S.gue); deploy('gue', { alert: true }); say('gue'); } }
      if (s === 'ruines' && !groups.has('ruines') && (room === 'ruines' || p.z < -8)) { deploy('ruines', { alert: true }); say('ruines'); }
      if (s === 'ruines' && groups.has('ruines') && !done.has('ruines-wave') && alive('ruines') <= 3) { done.add('ruines-wave'); release('ruines2'); say('vanne'); }
      if (s === 'cascade' && room === 'grotte') { setStage(S.grotte); deploy('grotte', { alert: true }); say('grotte'); say('toise'); }
      if (s === 'grotte' && Math.hypot(p.x - L.INTERACTIONS.find(i => i.id === 'turbine').x, p.z - L.INTERACTIONS.find(i => i.id === 'turbine').z) < 12) say('rampants');
      if (s === 'centre' && (room === 'centre' || room === 'cour')) say('centre');
      if (s === 'cour' && n08Deployed) { adaptation(); if (alive('n08') === 0) { say('n08Ok'); h.n08('down'); setStage(S.sortie); deploy('sortie', { alert: true }); release('sortie2'); game.grantCharges(1); } }
      if (s === 'sortie' && Math.hypot(p.x - L.EXIT.x, p.z - L.EXIT.z) < L.EXIT.r) { completed = true; say('fin'); setStage(S.fin); h.finish(); }
    }
  };
  return api;
}
