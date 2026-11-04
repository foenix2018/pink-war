// CHAPITRE 06 — mission flow, independent from rendering so that the whole mission runs in tests (same scheme as the
// chapters 03, 04 and 05). The SY-05 learns: every ADAPT_EVERY seconds of fighting it records where the player shoots
// from, and while the player stays within ADAPT_RADIUS of that spot it only takes ADAPTED of the damage. Changing
// position (the tactic the bible asks for: « la SY-05 adapte leurs tactiques à chaque affrontement ») restores it.
import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {configureUnit} from './ligne9-mission.js';
import {keepPressure} from './ligne9-layout.js';
import * as L from './m06-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2, ADAPT_EVERY = 9, ADAPT_RADIUS = 7, ADAPTED = .3;
const S = L.STAGE_INDEX, BREAKERS = ['disj-1', 'disj-2', 'disj-3'], noop = () => {};
const ACTIVE = Object.freeze({ ferraille: ['ferraille'], portail: ['voie', 'portail1', 'portail2'], coulee: ['coulee'], chaine: ['chaine', 'ligne1', 'ligne2', 'ligne3'], pont: ['pont'], coeur: ['escorte', 'renfort'], sortie: ['sortie1', 'sortie2'] });
const RESTORE = Object.freeze({ ferraille: ['ferraille'], coulee: ['coulee'], chaine: ['chaine'], pont: ['pont'], coeur: ['n08', 'escorte'] });

export function createM06Mission({ game, characterId = 'ghju', hooks = {} }) {
  const h = { setObstacles: noop, setDoor: noop, openPortal: noop, cue: noop, notice: noop, say: noop, stage: noop, finish: noop, clear: noop, setLine: noop, adapt: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set(), opened = new Set();
  let stage = 0, hold = null, completed = false, serial = 0, pressureAt = 0, adapt = null, nextAdapt = Infinity, reinforced = false, adaptations = 0;
  let collisions = L.buildCollisions();

  const id = () => L.STAGES[stage].id;
  const alive = name => (groups.get(name) || []).filter(e => game.enemies.some(x => x.id === e)).length;
  const say = (key, { again = false } = {}) => { if (!again && said.has(key)) return; said.add(key); h.say(key); };
  const setStage = next => { stage = typeof next === 'string' ? S[next] : next; h.stage(stage, L.STAGES[stage]); };
  const areaOfPlayer = () => L.areaAt(game.player.x, game.player.z);
  function rebuild() { collisions = L.buildCollisions({ open: [...opened] }); game.replaceObstacles(collisions); h.setObstacles(collisions); }
  function openDoor(name) { if (opened.has(name)) return; opened.add(name); rebuild(); h.setDoor(name, true); h.cue('door'); }
  const breakersDone = () => BREAKERS.filter(b => done.has(b)).length;
  const n08 = () => game.enemies.find(e => e.n08);

  // ---------- Encounters ----------
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
    game.ownedWeapons = new Set([game.weaponIndex, 0, 1, 2, 3, 4].filter(i => weaponAllowedForCharacter(i, characterId) && !WEAPONS[i].melee));
    game.ammo = WEAPONS.map(w => w.capacity);
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z), grounded: true, verticalSpeed: 0, yaw: cp.yaw || 0 }); }
  function freshGame(cp) {
    game.reset(characterId); armWeapons(); rebuild(); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); hold = null; pressureAt = 0; adapt = null; nextAdapt = Infinity; reinforced = false; h.clear(); supplies();
  }
  function setWorld() { for (const d of L.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id)); h.setLine(breakersDone() < 3); }
  // The SY-05 takes ADAPTED of the damage while the player stays near the spot it learnt.
  function adaptation() {
    const n = n08(); if (!n) return;
    const p = game.player, learnt = adapt && Math.hypot(p.x - adapt.x, p.z - adapt.z) < ADAPT_RADIUS;
    n.damageScale = learnt ? ADAPTED : 1;
    if (game.time >= nextAdapt) {
      nextAdapt = game.time + ADAPT_EVERY; adapt = { x: p.x, z: p.z }; adaptations++;
      h.adapt(adapt); h.cue('alarm'); h.notice('SY-05 · COMPORTEMENT ENREGISTRÉ · CHANGE DE POSITION'); say('n08Adapt');
    }
    if (!reinforced && n.hp < (n.maxHp || n.hp) * .5) { reinforced = true; release('renfort'); say('n08Mi'); }
  }

  const api = {
    get stage() { return stage; }, get stageId() { return id(); }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: L.HOLDS[hold.name] }; },
    get n08() { const n = n08(); return n ? { hp: n.hp, maxHp: n.maxHp || n.hp, shield: n.damageScale ?? 1, name: n.boss, learnt: adapt && { ...adapt }, adaptations } : null; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); completed = false; adaptations = 0;
      freshGame(L.START); setStage(S.voie); setWorld(); deploy('voie'); say('intro');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.sortie), sid = L.STAGES[at].id;
      // Partial progress of the current stage starts over; what earlier stages achieved stays.
      if (sid === 'chaine') for (const b of BREAKERS) done.delete(b);
      freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[sid] || []) deploy(name);
      if (sid === 'coeur') nextAdapt = game.time + ADAPT_EVERY;
      setWorld(); game.state = 'playing';
      h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs((p.elevation || 0) - (it.y || 0)) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.log && it.id !== 'noyau') return it;
        if (api.available(it.id)) return it;
      }
      return null;
    },
    available(key) {
      if (hold) return false;
      const s = id();
      if (key === 'cle') return s === 'ferraille' && alive('ferraille') <= 1;
      if (key === 'commande') return s === 'portail';
      if (key === 'varenne') return s === 'varenne';
      if (BREAKERS.includes(key)) return s === 'chaine' && !done.has(key) && alive('chaine') <= 2;
      if (key === 'kim') return s === 'pont' && alive('pont') <= 1;
      if (key === 'noyau') return s === 'noyau';
      return false;
    },
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      if (it.log) {
        reads.add(it.log); h.cue('read');
        if (it.id === 'noyau') { done.add('noyau'); say('noyau'); openDoor('quai'); setStage(S.sortie); }
        if (it.log === 'requisition') say('requisition');
        return it;
      }
      const key = it.id;
      if (key === 'cle') { done.add(key); say('cle'); setStage(S.portail); h.cue('console'); h.notice('CLÉ DE CHANTIER · COMMANDE DE LA GRILLE'); }
      else if (key === 'commande') { say('portail'); startHold(key); h.notice('GRILLE · OUVERTURE FORCÉE EN COURS'); }
      else if (key === 'varenne') { done.add(key); say('varenne'); setStage(S.chaine); h.cue('stage'); game.grantCharges(1); }
      else if (BREAKERS.includes(key)) { startHold(key); h.notice('CHAÎNE · COUPURE EN COURS'); }
      else if (key === 'kim') { done.add(key); say('kim'); openDoor('coeur'); setStage(S.coeur); h.cue('stage'); game.grantCharges(1); }
      else return null;
      return it;
    },
    update(dt = 1 / 60) {
      if (completed || game.state !== 'playing') return;
      const room = areaOfPlayer(), s = id();
      for (let i = pending.length - 1; i >= 0; i--) if (game.time >= pending[i].at) { const { name } = pending.splice(i, 1)[0]; deploy(name, { alert: true }); }
      if (game.time >= pressureAt) { pressureAt = game.time + PRESSURE_EVERY; const ids = (ACTIVE[s] || []).flatMap(name => groups.get(name) || []); if (ids.length) keepPressure(game, ids); }
      if (hold) {
        while (hold.waves.length && game.time >= hold.start + hold.waves[0][0]) release(hold.waves.shift()[1]);
        if (game.time >= hold.until) {
          const name = hold.name; hold = null; done.add(name); h.cue('stage');
          if (name === 'commande') { openDoor('portail'); say('portailOk'); setStage(S.coulee); deploy('coulee', { alert: true }); say('coulee'); h.cue('alarm'); }
          if (BREAKERS.includes(name)) {
            const n = breakersDone(); say('disj' + (BREAKERS.indexOf(name) + 1)); h.notice('CHAÎNE · DISJONCTEUR ' + n + ' / 3'); game.grantCharges(1);
            if (n === 3) { h.setLine(false); say('chaineOk'); setStage(S.pont); deploy('pont', { alert: true }); say('pont'); }
          }
          if (name === 'evac') { completed = true; say('fin'); setStage(S.fin); h.finish(); return; }
        }
      }
      // Places and events.
      if (s === 'voie' && room === 'ferraille') { setStage(S.ferraille); deploy('ferraille', { alert: true }); say('ferraille'); }
      if (s === 'coulee' && groups.has('coulee') && alive('coulee') === 0) { setStage(S.varenne); say('couleeOk'); }
      if (s === 'chaine' && room === 'chaine' && !groups.has('chaine')) { deploy('chaine', { alert: true }); say('chaine'); }
      if (s === 'coeur' && room === 'coeur' && !groups.has('n08')) { deploy('n08', { alert: true }); deploy('escorte', { alert: true }); nextAdapt = game.time + ADAPT_EVERY; say('coeur'); say('n08'); h.cue('alarm'); }
      if (s === 'coeur' && groups.has('n08')) { adaptation(); if (alive('n08') === 0) { say('n08Ok'); setStage(S.noyau); } }
      if (s === 'sortie' && room === 'quai' && !hold && !done.has('evac')) { say('sortie'); startHold('evac'); h.notice('ÉVACUATION · LE CAMION CHARGE LES TECHNICIENS'); }
    }
  };
  return api;
}
