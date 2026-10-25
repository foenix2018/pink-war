// COURONNE HELIX — mission flow, independent from rendering so that the whole sequence runs in tests:
// encounters and their configuration, announced ORDRE portals, the encounter director, the HELIX security
// lock, the two phase stabilizers, checkpoints and the end. The page supplies presentation hooks.
import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {enemyDurability} from './enemy-combat.js';
import {PROBE} from './aerial-probes.js';
import * as L from './couronne-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2;
// Groups that fight in each stage (the encounter director keeps them on the player).
export const ACTIVE_GROUPS = Object.freeze([[], ['esplanade', 'renfortEsplanade'], ['parvis', 'esplanade', 'renfortEsplanade'], ['parvis'], ['ancrage', 'renfortAncrage'], ['ancrage', 'renfortAncrage'], []]);
const CONSOLES = ['ancrage-ouest', 'ancrage-est'];
const noop = () => {};

// Shape a spawned unit as the requested chassis (same rules as the Arena spawns, at the encounter's wave).
export function configureUnit(e, u, wave) {
  const form = u.form, elite = !!u.elite, probe = form === 'probe', floor = L.FLOOR_HEIGHT[u.floor] ?? 0;
  return Object.assign(e, { x: u.x, z: u.z, form, elite,
    ranged: probe || ['seer', 'synth', 'listener', 'bulwark'].includes(form) || (form === 'brute' && wave >= 5),
    aimHeight: probe ? PROBE.aimHeight : form === 'scuttler' ? .88 : ['seer', 'listener'].includes(form) ? 1.38 : ['brute', 'bulwark'].includes(form) ? 1.42 : 1.15,
    radius: probe ? PROBE.radius : elite ? 1.05 : form === 'scuttler' ? .86 : form === 'brute' ? .95 : .8,
    hitRadius: probe ? .44 : form === 'scuttler' ? .91 : form === 'brute' ? 1.18 : form === 'seer' ? .94 : 1.05,
    hp: enemyDurability(wave, form, elite), tier: Math.max(1, Math.ceil(wave / 2)),
    speed: probe ? Math.min(5, 3.6 + wave * .07) : Math.min(4.3, 2.4 + (wave - 1) * .055) * (form === 'bulwark' ? .7 : form === 'scuttler' ? 1.12 : 1),
    elevation: floor + (probe ? PROBE.hover : 0), homeHeight: floor, grounded: !probe, verticalSpeed: 0,
    homeX: u.x, homeZ: u.z - 4, lastKnownX: u.x, lastKnownZ: u.z, lastKnownHeight: floor });
}

export function createCouronneMission({ game, characterId = 'ghju', hooks = {} }) {
  const h = { setObstacles: noop, openPortal: noop, setGatesOpen: noop, setConsole: noop, setAnchorPower: noop, cue: noop, notice: noop, stage: noop, finish: noop, lost: noop, clear: noop, ...hooks };
  const groups = new Map(), pending = [], consoles = new Set();
  let stage = 0, gatesOpen = false, reinforced = { esplanade: false, ancrage: false }, pressureAt = 0, completed = false, serial = 0;
  let collisions = L.buildCollisions();

  const alive = name => (groups.get(name) || []).filter(id => game.enemies.some(e => e.id === id)).length;
  const setStage = next => { stage = next; h.stage(stage, L.STAGES[stage]); };
  function setGates(open) { gatesOpen = open; collisions = L.buildCollisions({ gatesOpen: open }); game.replaceObstacles(collisions); h.setObstacles(collisions); h.setGatesOpen(open); }
  function armWeapons() {
    // A sandbox needs choices: the hero's weapon plus R–9, BLOOM, LANCE and THORN.
    game.ownedWeapons = new Set([game.weaponIndex, 0, 1, 2, 3].filter(i => weaponAllowedForCharacter(i, characterId) && !WEAPONS[i].melee));
    game.ammo = WEAPONS.map(w => w.capacity);
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z), grounded: true, verticalSpeed: 0, yaw: cp.yaw || 0 }); }
  function freshGame(cp) {
    game.reset(characterId); armWeapons(); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); pressureAt = 0; h.clear();
  }
  function deploy(name, { alert = false } = {}) {
    const enc = L.ENCOUNTERS[name], ids = []; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 900 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); ids.push(e.id);
      if (alert) Object.assign(e, { awareness: 'search', alertedUntil: game.time + 8, lastKnownX: game.player.x, lastKnownZ: game.player.z, lastKnownHeight: game.player.elevation });
    }
    game.activePortals = []; game.toSpawn = 0; game.spawnTimer = Infinity; game.nextWave = Infinity;
    groups.set(name, ids); return ids;
  }
  // ORDRE tactical portal: announced (light and sound), then the group steps out.
  function schedulePortal(name) {
    const p = L.ENCOUNTERS[name].portal;
    h.openPortal(p.x, L.FLOOR_HEIGHT[p.floor] ?? 0, p.z, { charge: PORTAL_CHARGE }); h.cue('portal');
    h.notice(name.startsWith('renfort') ? 'PORTAIL ORDRE · RENFORTS EN APPROCHE' : 'PORTAIL ORDRE SUR LE PARVIS');
    pending.push({ name, at: game.time + PORTAL_CHARGE }); groups.set(name, []);
  }
  function resetAnchor() { consoles.clear(); reinforced.ancrage = false; for (const id of CONSOLES) h.setConsole(id, false); h.setAnchorPower(1); }
  function finish() { if (completed) return; completed = true; setStage(6); h.finish(); }

  const api = {
    get stage() { return stage; }, get collisions() { return collisions; }, get gatesOpen() { return gatesOpen; }, get completed() { return completed; },
    get consoles() { return [...consoles]; }, get pending() { return pending.map(p => p.name); },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      freshGame(L.START); completed = false; reinforced = { esplanade: false, ancrage: false };
      setGates(false); h.setConsole('securite', false); resetAnchor();
      deploy('esplanade'); setStage(0);
    },
    // Respawn at the checkpoint of the current stage with its encounter set up again.
    restoreCheckpoint() {
      const at = Math.min(stage, 5), keepGates = gatesOpen;
      freshGame(L.STAGES[at].checkpoint);
      if (at <= 1) { reinforced.esplanade = false; deploy('esplanade'); setStage(at); }
      else if (at === 2) { schedulePortal('parvis'); setStage(2); }
      else if (at === 3) setStage(3);
      else { resetAnchor(); deploy('ancrage'); setStage(4); }
      setGates(keepGates); game.state = 'playing';
      h.notice('POINT DE CONTRÔLE · ' + L.STAGES[stage].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs(p.elevation - it.y) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.id === 'securite' && stage === 3) return it;
        if (CONSOLES.includes(it.id) && stage === 4 && !consoles.has(it.id)) return it;
      }
      return null;
    },
    interact() {
      if (game.state !== 'playing') return false;
      const it = api.nearInteraction(); if (!it) return false;
      if (it.id === 'securite') {
        setGates(true); h.setConsole('securite', true); h.cue('gate'); setStage(4); game.grantCharges(1); deploy('ancrage');
        h.notice('VERROU LEVÉ · LES MONTÉES VERS L’ANCRAGE SONT OUVERTES');
      } else {
        consoles.add(it.id); h.setConsole(it.id, true); h.cue('console');
        h.notice(consoles.size === 1 ? 'STABILISATEUR COUPÉ · 1 / 2' : 'STABILISATEUR COUPÉ · 2 / 2');
      }
      return true;
    },
    // Call after each simulation step.
    update() {
      if (completed) return;
      const p = game.player;
      for (let i = pending.length - 1; i >= 0; i--) if (game.time >= pending[i].at) { const { name } = pending.splice(i, 1)[0]; deploy(name, { alert: true }); }
      if (stage === 0 && p.z < 58) { setStage(1); h.cue('stage'); h.notice('ESPLANADE HELIX · PATROUILLE ORDRE'); }
      if (game.time >= pressureAt) { pressureAt = game.time + PRESSURE_EVERY; const ids = ACTIVE_GROUPS[stage].flatMap(name => groups.get(name) || []); if (ids.length) L.keepPressure(game, ids); }
      if (stage <= 1 && !reinforced.esplanade && groups.has('esplanade') && alive('esplanade') <= 3) { reinforced.esplanade = true; schedulePortal('renfortEsplanade'); }
      if (stage === 1 && reinforced.esplanade && !pending.length && alive('esplanade') + alive('renfortEsplanade') === 0) {
        setStage(2); h.cue('stage'); game.grantCharges(1); schedulePortal('parvis');
      }
      if (stage === 2 && groups.has('parvis') && !pending.some(q => q.name === 'parvis') && alive('parvis') === 0) { setStage(3); h.cue('stage'); h.notice('PARVIS DÉGAGÉ · LE HALL EST OUVERT'); }
      if (stage === 4 && consoles.size >= 1 && !reinforced.ancrage) { reinforced.ancrage = true; schedulePortal('renfortAncrage'); }
      if (stage === 4 && consoles.size === CONSOLES.length) { setStage(5); h.setAnchorPower(0); h.cue('anchor'); h.notice('ANCRAGE DÉSYNCHRONISÉ · LES PORTAILS ORDRE S’ÉTEIGNENT'); }
      if (stage === 5 && !pending.length && game.enemies.length === 0) finish();
    }
  };
  return api;
}
