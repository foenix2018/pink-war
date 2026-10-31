// MISSION 04 — mission flow, independent from rendering so that the whole mission runs in tests (same scheme as the
// Ligne 9 and the chapter 03). The guardian of the gantry is on the ring from the start of the stabiliser stage; its
// phase shield (damageScale) lets through more damage with each stabiliser neutralised, and all of it after the third.
import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {configureUnit} from './ligne9-mission.js';
import {keepPressure} from './ligne9-layout.js';
import * as L from './m04-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2;
// Share of the damage the guardian takes with 0, 1, 2 and 3 stabilisers neutralised.
export const SHIELD = Object.freeze([.12, .4, .7, 1]);
const S = L.STAGE_INDEX, STABS = ['stab-1', 'stab-2', 'stab-3'], RELAYS = ['relais-ouest', 'relais-est'], noop = () => {};
const ACTIVE = Object.freeze({ cour: ['cour'], relais: ['hangar', 'hangar2', 'atelier', 'atelier2'], maintenance: ['retour'], stabilisateurs: ['anneau', 'stab1', 'stab2', 'stab3', 'final'], gardien: ['final'] });
const RESTORE = Object.freeze({ cour: ['cour'], maintenance: ['retour'], stabilisateurs: ['anneau', 'gardien'], gardien: ['gardien'] });

export function createM04Mission({ game, characterId = 'ghju', hooks = {} }) {
  const h = { setObstacles: noop, setDoor: noop, openPortal: noop, cue: noop, notice: noop, say: noop, stage: noop, finish: noop, clear: noop, read: noop, breach: noop, setPower: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set(), opened = new Set();
  let stage = 0, hold = null, completed = false, serial = 0, pressureAt = 0, shieldNoticeAt = 0;
  let collisions = L.buildCollisions();

  const id = () => L.STAGES[stage].id;
  const alive = name => (groups.get(name) || []).filter(e => game.enemies.some(x => x.id === e)).length;
  const say = (key, { again = false } = {}) => { if (!again && said.has(key)) return; said.add(key); h.say(key); };
  const setStage = next => { stage = typeof next === 'string' ? S[next] : next; h.stage(stage, L.STAGES[stage]); };
  const areaOfPlayer = () => L.areaAt(game.player.x, game.player.z);
  function rebuild() { collisions = L.buildCollisions({ open: [...opened] }); game.replaceObstacles(collisions); h.setObstacles(collisions); }
  function openDoor(name) { if (opened.has(name)) return; opened.add(name); rebuild(); h.setDoor(name, true); h.cue('door'); }
  const stabsDone = () => STABS.filter(s => done.has(s)).length;
  const guardian = () => game.enemies.find(e => e.guardian);
  function shieldGuardian() { const g = guardian(); if (g) g.damageScale = SHIELD[stabsDone()]; h.breach(1 - stabsDone() / 3); }

  // ---------- Encounters ----------
  function deploy(name, { alert = false } = {}) {
    const enc = L.ENCOUNTERS[name], ids = []; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 900 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); e.mission = name; ids.push(e.id);
      if (u.guardian) Object.assign(e, { guardian: true, maxHp: e.hp, damageScale: SHIELD[stabsDone()], radius: 1.25, speed: e.speed * .8, homeX: u.x, homeZ: u.z });
      if (alert) Object.assign(e, { awareness: 'search', alertedUntil: game.time + 8, lastKnownX: game.player.x, lastKnownZ: game.player.z, lastKnownHeight: game.player.elevation });
    }
    game.activePortals = []; game.toSpawn = 0; game.spawnTimer = Infinity; game.nextWave = Infinity;
    groups.set(name, ids); return ids;
  }
  function release(name) {
    const enc = L.ENCOUNTERS[name];
    if (enc.portal) { h.openPortal(enc.portal.x, 0, enc.portal.z, { charge: PORTAL_CHARGE }); h.cue('portal'); h.notice('PORTAIL ORDRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE }); groups.set(name, []); }
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
    pending.length = 0; groups.clear(); hold = null; pressureAt = 0; h.clear(); supplies();
  }
  function setWorld() { for (const d of L.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id)); for (const r of RELAYS) h.setPower(r, done.has(r)); h.breach(stage >= S.journal ? 0 : 1 - stabsDone() / 3); }

  const api = {
    get stage() { return stage; }, get stageId() { return id(); }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: L.HOLDS[hold.name] }; },
    get guardian() { const g = guardian(); return g ? { hp: g.hp, maxHp: g.maxHp || g.hp, shield: g.damageScale ?? 1, name: g.boss } : null; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); completed = false;
      freshGame(L.START); setStage(S.quai); setWorld(); say('intro');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.journal), sid = L.STAGES[at].id;
      // Partial progress of the current stage starts over; what earlier stages achieved stays.
      freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[sid] || []) deploy(name);
      if (sid === 'gardien') { const g = guardian(); if (g) g.damageScale = 1; }
      setWorld(); game.state = 'playing';
      h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs((p.elevation || 0) - (it.y || 0)) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.log && it.id !== 'console') return it;
        if (api.available(it.id)) return it;
      }
      return null;
    },
    available(key) {
      if (hold) return false;
      const s = id();
      if (key === 'poste') return s === 'quai';
      if (key === 'scanner') return s === 'sas';
      if (key === 'relais-ouest') return s === 'relais' && !done.has(key) && alive('hangar') <= 1;
      if (key === 'relais-est') return s === 'relais' && !done.has(key) && alive('atelier') <= 1;
      if (STABS.includes(key)) return (s === 'stabilisateurs' || s === 'gardien') && !done.has(key);
      if (key === 'console') return s === 'journal';
      return false;
    },
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      if (it.log) {
        reads.add(it.log); h.cue('read');
        if (it.id === 'console') { completed = true; say('journal'); setStage(S.fin); h.breach(0); h.finish(); }
        if (it.log === 'signatures') say('signatures');
        return it;
      }
      const key = it.id;
      if (key === 'poste') { done.add(key); say('badge'); setStage(S.sas); h.cue('console'); h.notice('BADGE JANUS · NIVEAU 2'); }
      else if (key === 'scanner') { done.add(key); openDoor('sas'); setStage(S.cour); deploy('cour', { alert: true }); say('cour'); h.cue('alarm'); }
      else if (RELAYS.includes(key)) { say('relais'); startHold(key); h.notice('RELAIS · RÉACTIVATION EN COURS'); }
      else if (STABS.includes(key)) { startHold(key); h.notice('STABILISATEUR · NEUTRALISATION EN COURS'); }
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
          if (RELAYS.includes(name)) {
            h.setPower(name, true);
            if (RELAYS.every(r => done.has(r))) { openDoor('maintenance'); say('relaisEst'); setStage(S.maintenance); deploy('retour', { alert: true }); say('retour'); game.grantCharges(1); }
            else { say(name === 'relais-ouest' ? 'relaisOuest' : 'relaisEst'); h.notice('RELAIS EN LIGNE · 1 / 2'); }
          }
          if (STABS.includes(name)) {
            const n = stabsDone(); say('stab', { again: true }); say('stab' + (STABS.indexOf(name) + 1));
            shieldGuardian(); h.notice('STABILISATEUR NEUTRALISÉ · ' + n + ' / 3'); game.grantCharges(1);
            if (n === 3) setStage(alive('gardien') ? S.gardien : S.journal);
          }
        }
      }
      // Places and events.
      if (s === 'cour' && groups.has('cour') && alive('cour') === 0) { setStage(S.relais); say('courOk'); }
      if (s === 'relais' && room === 'hangar' && !groups.has('hangar') && !done.has('relais-ouest')) { deploy('hangar', { alert: true }); say('hangar'); }
      if (s === 'relais' && (room === 'atelier' || room === 'relais-est') && !groups.has('atelier') && !done.has('relais-est')) { deploy('atelier', { alert: true }); say('atelier'); }
      if (s === 'maintenance' && room === 'anneau') { setStage(S.stabilisateurs); deploy('anneau', { alert: true }); deploy('gardien', { alert: true }); shieldGuardian(); say('anneau'); say('gardien'); h.cue('alarm'); }
      if ((s === 'stabilisateurs' || s === 'gardien') && groups.has('gardien') && alive('gardien') === 0) {
        say('gardienOk');
        if (stabsDone() === 3) { setStage(S.journal); h.breach(0); }
      }
      if (s === 'gardien' && !groups.has('gardien')) setStage(S.journal);
      const g = guardian(); if (g && g.damageScale < 1 && g.hitAt && game.time - g.hitAt < .05 && game.time > shieldNoticeAt) { shieldNoticeAt = game.time + 6; h.notice('BLINDAGE SYNCHRONISÉ · COUPE LES STABILISATEURS ('  + stabsDone() + ' / 3)'); }
    }
  };
  return api;
}
