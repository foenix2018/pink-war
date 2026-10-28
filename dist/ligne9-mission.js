// LIGNE 9 — mission flow, independent from rendering so that the whole mission runs in tests. Stages follow
// Tome II M05: entrance → platform → pumps → control post (« pomper deux secteurs ; ouvrir écluse ; éviter
// coupure totale »), extended into a full mission: power restoration, market relays, pump A hold, service
// tunnel blackout, valves and pump start hold, lock opening hold, the JANUS-9 anchor, evidence, escape from the
// re-flooding line, transmission by the old Orme relay. The page supplies presentation hooks.
import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {enemyDurability} from './enemy-combat.js';
import {PROBE} from './aerial-probes.js';
import * as L from './ligne9-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2;
export const HOLDS = Object.freeze({ pompeA: 60, pompes: 90, ecluse: 45 });
export const ESCAPE_SECONDS = 150;
// Waves released during each hold (seconds after the start of the hold).
export const HOLD_WAVES = Object.freeze({
  pompeA: [[4, 'rampants1'], [24, 'rampants2'], [40, 'rampants3']],
  pompes: [[2, 'defense1'], [45, 'defense2']],
  ecluse: [[3, 'ecluse']]
});
// Groups kept on the player by the encounter director, per stage.
export const ACTIVE_GROUPS = Object.freeze([[], ['hall'], ['correspondance'], ['halles'], ['halles', 'renfortHalles'], ['acces'], ['quai', 'rampants1', 'rampants2', 'rampants3'],
  ['tunnel', 'delestage'], ['pompes'], ['pompes', 'defense1', 'defense2'], ['ecluse'], [], ['chambre', 'surtension'], ['fuite'], [], []]);
// Encounter set again when the player restarts at the checkpoint of a stage.
const RESTORE = Object.freeze({ 1: ['hall'], 2: ['correspondance'], 3: ['halles'], 4: ['halles'], 5: ['acces'], 6: ['quai'], 7: ['tunnel'], 8: ['pompes'], 9: ['pompes'], 12: ['chambre'], 13: ['fuite'] });
const RELAYS = ['relais-ouest', 'relais-est'], VALVES = ['vanne-1', 'vanne-2', 'vanne-3'], PROOFS = ['preuve-1', 'preuve-2'];
const S = L.STAGE_INDEX;
const noop = () => {};

export function configureUnit(e, u, wave) {
  const form = u.form, elite = !!u.elite, probe = form === 'probe';
  return Object.assign(e, { x: u.x, z: u.z, form, elite,
    ranged: probe || ['seer', 'synth', 'listener', 'bulwark'].includes(form) || (form === 'brute' && wave >= 5),
    aimHeight: probe ? PROBE.aimHeight : form === 'scuttler' ? .88 : ['seer', 'listener'].includes(form) ? 1.38 : ['brute', 'bulwark'].includes(form) ? 1.42 : 1.15,
    radius: probe ? PROBE.radius : elite ? 1.05 : form === 'scuttler' ? .86 : form === 'brute' ? .95 : .8,
    hitRadius: probe ? .44 : form === 'scuttler' ? .91 : form === 'brute' ? 1.18 : form === 'seer' ? .94 : 1.05,
    hp: enemyDurability(wave, form, elite) * (u.boss || 1), boss: u.boss ? u.name || 'ÉLITE' : undefined, tier: Math.max(1, Math.ceil(wave / 2)),
    speed: probe ? Math.min(5, 3.6 + wave * .07) : Math.min(4.3, 2.4 + (wave - 1) * .055) * (form === 'bulwark' ? .7 : form === 'scuttler' ? 1.12 : 1),
    elevation: probe ? PROBE.hover : 0, homeHeight: 0, grounded: !probe, verticalSpeed: 0,
    homeX: u.x, homeZ: u.z, lastKnownX: u.x, lastKnownZ: u.z, lastKnownHeight: 0 });
}

export function createLigne9Mission({ game, characterId = 'lylu', hooks = {} }) {
  const h = { setObstacles: noop, openPortal: noop, setDoor: noop, setWater: noop, setPower: noop, reveal: noop, flood: noop, cue: noop, notice: noop, say: noop,
    stage: noop, finish: noop, clear: noop, emerge: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set();
  const opened = new Set(), drained = new Set();
  let stage = 0, hold = null, escapeUntil = null, pressureAt = 0, completed = false, serial = 0, reinforced = false;
  let collisions = L.buildCollisions();

  const alive = name => (groups.get(name) || []).filter(id => game.enemies.some(e => e.id === id)).length;
  const say = (id, { again = false } = {}) => { if (!again && said.has(id)) return; said.add(id); h.say(id); };
  const setStage = next => { stage = next; h.stage(stage, L.STAGES[stage]); };
  const roomOfPlayer = () => L.roomAt(game.player.x, game.player.z);
  function rebuild() { collisions = L.buildCollisions({ open: [...opened], drained: [...drained] }); game.replaceObstacles(collisions); h.setObstacles(collisions); }
  function openDoor(id) { if (opened.has(id)) return; opened.add(id); rebuild(); h.setDoor(id, true); h.cue('door'); }
  function drain(id) { if (drained.has(id)) return; drained.add(id); rebuild(); h.setWater(id, 'drained'); }
  function armWeapons() {
    game.ownedWeapons = new Set([game.weaponIndex, 0, 1, 2, 3, 4].filter(i => weaponAllowedForCharacter(i, characterId) && !WEAPONS[i].melee));
    game.ammo = WEAPONS.map(w => w.capacity);
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z), grounded: true, verticalSpeed: 0, yaw: cp.yaw || 0 }); }
  function freshGame(cp) {
    game.reset(characterId); armWeapons(); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); pressureAt = 0; hold = null; h.clear(); game.replaceObstacles(collisions);
  }
  function deploy(name, { alert = false } = {}) {
    const enc = L.ENCOUNTERS[name], ids = []; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 900 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); ids.push(e.id);
      if (alert || enc.emerge || u.emerge) Object.assign(e, { awareness: 'search', alertedUntil: game.time + 8, lastKnownX: game.player.x, lastKnownZ: game.player.z, lastKnownHeight: game.player.elevation });
      if (enc.emerge || u.emerge) h.emerge(u.x, u.z);
    }
    game.activePortals = []; game.toSpawn = 0; game.spawnTimer = Infinity; game.nextWave = Infinity;
    groups.set(name, ids); return ids;
  }
  function release(name) {
    const enc = L.ENCOUNTERS[name];
    if (enc.portal) { h.openPortal(enc.portal.x, 0, enc.portal.z, { charge: PORTAL_CHARGE }); h.cue('portal'); h.notice('PORTAIL ORDRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE }); groups.set(name, []); }
    else { deploy(name, { alert: true }); if (enc.emerge) { h.cue('emerge'); h.notice('MOUVEMENT SOUS LE QUAI'); } }
  }
  function startHold(name) { hold = { name, start: game.time, until: game.time + HOLDS[name], waves: [...HOLD_WAVES[name]] }; h.cue('hold'); }
  function supplies() {
    // The Épars left medkits and cells in their shelter, and a few caches along the route.
    for (const [kind, x, z] of [['heal', 92, 12.5], ['heal', 94, 17.5], ['cell', 90, 18], ['cell', 24, -58], ['heal', -66, 30], ['cell', -88, 68], ['heal', 30, 92]])
      game.pickups.push({ id: game.nextId++, kind, x, y: 0, z, until: Infinity });
  }

  // Stage-specific world state for a checkpoint: what has been achieved stays achieved.
  function setWorld() {
    h.setPower('station', stage >= S.correspondance ? 'secours' : 'off');
    h.setPower('tunnel', stage >= S.tunnel && done.has('delestage') ? 'off' : 'secours');
    for (const d of L.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id));
    for (const w of L.WATER) if (w.drainable) h.setWater(w.id, drained.has(w.id) ? 'drained' : 'flooded');
    h.setWater('voies', done.has('pompes') ? 'low' : 'flooded');
    h.reveal(drained.has('voie'));
    h.flood(stage === S.fuite);
  }

  const api = {
    get stage() { return stage; }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return [...opened]; }, get drained() { return [...drained]; }, get done() { return [...done]; }, get reads() { return [...reads]; },
    get pending() { return pending.map(p => p.name); }, get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: HOLDS[hold.name] }; },
    get escape() { return escapeUntil === null ? null : Math.max(0, escapeUntil - game.time); },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      opened.clear(); drained.clear(); done.clear(); said.clear(); reads.clear(); completed = false; reinforced = false; escapeUntil = null;
      collisions = L.buildCollisions(); freshGame(L.START); supplies();
      setStage(S.descente); setWorld(); say('intro');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.transmettre);
      // Partial progress of the current stage starts over; what earlier stages achieved stays.
      if (at === S.relais) { for (const id of RELAYS) done.delete(id); reinforced = false; }
      if (at === S.vannes) for (const id of VALVES) done.delete(id);
      if (at === S.preuves) for (const id of PROOFS) done.delete(id);
      escapeUntil = null;
      freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[at] || []) deploy(name);
      if (at === S.fuite) escapeUntil = game.time + ESCAPE_SECONDS;
      setWorld(); game.state = 'playing';
      h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs(p.elevation - it.y) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.log) return it;
        if (api.available(it.id)) return it;
      }
      return null;
    },
    available(id) {
      if (hold) return false;
      if (id === 'tableau') return stage === S.courant || stage === S.descente;
      if (RELAYS.includes(id)) return (stage === S.halles || stage === S.relais) && !done.has(id);
      if (id === 'pompe-a') return stage === S.pompeA;
      if (VALVES.includes(id)) return stage === S.vannes && !done.has(id);
      if (id === 'pupitre-p9') return stage === S.pompes;
      if (id === 'ecluse') return stage === S.ecluse && roomOfPlayer() === 'sas';
      if (PROOFS.includes(id)) return stage === S.preuves && !done.has(id);
      if (id === 'relais-orme') return stage === S.transmettre;
      return false;
    },
    // Returns the interaction performed (its log id when a document or a proof is read), or null.
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      if (it.log) { reads.add(it.log); h.cue('read'); return it; }
      const id = it.id;
      if (id === 'tableau') {
        done.add(id); openDoor('service'); h.setPower('station', 'secours'); h.cue('console'); say('courant');
        setStage(S.correspondance); deploy('correspondance'); game.grantCharges(1);
        h.notice('COURANT DE SECOURS RÉTABLI · PORTE DE SERVICE OUVERTE');
      } else if (RELAYS.includes(id)) {
        done.add(id); h.cue('console'); if (stage === S.halles) setStage(S.relais);
        const count = RELAYS.filter(r => done.has(r)).length;
        h.notice('RELAIS RACCORDÉ · ' + count + ' / 2');
        if (count === 1) { say('relais1'); if (!reinforced) { reinforced = true; release('renfortHalles'); } }
        if (count === 2) { openDoor('rideau'); say('relais2'); setStage(S.acces); deploy('acces'); game.grantCharges(1); }
      } else if (id === 'pompe-a') {
        say('pompeA'); startHold('pompeA'); h.notice('POMPE A · AMORÇAGE');
      } else if (VALVES.includes(id)) {
        done.add(id); h.cue('valve'); const count = VALVES.filter(v => done.has(v)).length;
        h.notice('VANNE OUVERTE · ' + count + ' / 3');
        if (count === 3) { say('vannes'); setStage(S.pompes); }
      } else if (id === 'pupitre-p9') {
        say('demarrage'); startHold('pompes'); h.notice('POMPES P9 · DÉMARRAGE');
      } else if (id === 'ecluse') {
        say('ecluse'); startHold('ecluse'); h.setDoor('ecluse', 'opening'); h.notice('ÉCLUSE · OUVERTURE EN COURS');
      } else if (PROOFS.includes(id)) {
        done.add(id); reads.add(id); h.cue('console'); const count = PROOFS.filter(p => done.has(p)).length;
        h.notice('PREUVE COPIÉE · ' + count + ' / 2');
        if (count === 1) { say('preuve'); release('surtension'); }
        if (count === 2) {
          say('preuves'); openDoor('orme'); setStage(S.fuite); escapeUntil = game.time + ESCAPE_SECONDS; deploy('fuite'); h.flood(true); h.cue('alarm');
        }
        return it;
      } else if (id === 'relais-orme') {
        done.add(id); reads.add('relais-orme'); openDoor('cabine'); say('transmis'); h.cue('console'); h.notice('PREUVES TRANSMISES · MONTE-CHARGE OUVERT');
        return { ...it, log: 'relais-orme' };
      }
      return it;
    },
    update() {
      if (completed) return;
      const p = game.player, room = roomOfPlayer();
      for (let i = pending.length - 1; i >= 0; i--) if (game.time >= pending[i].at) { const { name } = pending.splice(i, 1)[0]; deploy(name, { alert: true }); }
      if (game.time >= pressureAt) { pressureAt = game.time + PRESSURE_EVERY; const ids = (ACTIVE_GROUPS[stage] || []).flatMap(name => groups.get(name) || []); if (ids.length) L.keepPressure(game, ids); }
      // Holds: waves along the countdown, then the effect of the machine.
      if (hold) {
        while (hold.waves.length && game.time >= hold.start + hold.waves[0][0]) { const [, name] = hold.waves.shift(); release(name); if (name === 'rampants1') say('rampants'); }
        if (game.time >= hold.until) {
          const name = hold.name; hold = null; done.add(name); h.cue('stage');
          if (name === 'pompeA') { drain('tunnel'); say('vidange'); setStage(S.tunnel); deploy('tunnel'); h.notice('TUNNEL TECHNIQUE VIDANGÉ'); }
          if (name === 'pompes') { openDoor('galerie'); h.setWater('voies', 'low'); say('pompesOk'); setStage(S.ecluse); game.grantCharges(1); h.notice('POMPES P9 EN SERVICE · GALERIE DE L’ÉCLUSE OUVERTE'); }
          if (name === 'ecluse') { openDoor('ecluse'); drain('voie'); h.reveal(true); say('revelation'); setStage(S.voie); h.notice('ÉCLUSE OUVERTE · LA VOIE BASSE SE VIDE'); }
        }
      }
      // Places and events.
      if (stage === S.descente && room === 'hall') { setStage(S.courant); deploy('hall'); say('hall'); }
      if (stage === S.courant && !said.has('alerte') && groups.has('hall') && game.enemies.some(e => (groups.get('hall') || []).includes(e.id) && e.awareness === 'engaged')) say('alerte');
      if (room === 'secours') say('secours');
      if (stage === S.correspondance && room === 'halles') { setStage(S.halles); deploy('halles'); say('halles'); say('emergence'); }
      if (stage === S.halles && groups.has('halles') && alive('halles') <= 5) setStage(S.relais);
      if (room === 'abri') say('abri');
      if (stage === S.acces && room === 'quai') { setStage(S.pompeA); deploy('quai'); say('quai'); }
      if (stage === S.tunnel && room === 'tunnel') say('tunnel');
      if (stage === S.tunnel && room === 'tunnel' && p.x < -30 && !done.has('delestage')) { done.add('delestage'); h.setPower('tunnel', 'off'); h.cue('blackout'); say('delestage'); deploy('delestage'); }
      if (room === 'ventilation') say('ventilation');
      if (stage === S.tunnel && room === 'pompes') { setStage(S.vannes); deploy('pompes'); say('pompes'); }
      if (stage === S.voie && room === 'chambre') { setStage(S.preuves); deploy('chambre'); say('chambre'); }
      if (stage === S.fuite && room === 'orme') { escapeUntil = null; h.flood(false); setStage(S.transmettre); say('orme'); }
      if (stage === S.fuite && escapeUntil !== null && game.time >= escapeUntil) { escapeUntil = null; game.invulnerable = 0; game.damage(9999); h.notice('LA VOIE EST RÉIMMERGÉE'); }
      if (stage === S.transmettre && done.has('relais-orme') && room === 'cabine') { completed = true; setStage(S.fin); h.finish(); }
    }
  };
  return api;
}
