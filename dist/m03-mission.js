// MISSION 03 — mission flow, independent from rendering so that the whole mission runs in tests (same scheme as the
// Ligne 9). Stages in m03-layout.js; the medical van follows VAN_PATH, waits at each stop until its stage clears the
// way, waits for the player (leash) and for the machines in front of it, and loses integrity while machines sabotage
// it at close range. The page supplies presentation hooks.
import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {configureUnit} from './ligne9-mission.js';
import {keepPressure} from './ligne9-layout.js';
import * as L from './m03-layout.js';

export const PORTAL_CHARGE = 3.2, PRESSURE_EVERY = 2;
const S = L.STAGE_INDEX, noop = () => {};
// Groups kept on the player by the encounter director, per stage.
const ACTIVE = Object.freeze({ kit: ['annexe'], atelier: ['atelier'], verin: ['atelier'], escorte: ['route1', 'route2'], a3: ['a3', 'route2'], balise: ['fracture', 'balise1', 'balise2'],
  barriere: ['barriere1', 'barriere2'], escorte2: ['voie'], echangeur: ['echangeur', 'treuil1', 'treuil2'], gare: ['gare'], arrimage: ['gare', 'arrimage1', 'arrimage2', 'arrimage3'] });
// Encounter set again when the player restarts at the checkpoint of a stage.
const RESTORE = Object.freeze({ a3: ['a3'], balise: ['fracture'], echangeur: ['echangeur'], arrimage: ['gare'] });
// Van position (path index) at the checkpoint of each stage.
const VAN_AT = Object.freeze({ arrivee: 0, alimentation: 0, dossier: 0, kit: 0, atelier: 0, verin: 0, escorte: 0, a3: 2, balise: 2, barriere: 2, escorte2: 2, echangeur: 6, gare: 6, arrimage: 8, regulation: 8, fin: 8 });
const DRIVING = new Set(['escorte', 'escorte2', 'gare']);

export function createM03Mission({ game, characterId = 'ghju', choice = null, base = [], hooks = {} }) {
  const h = { setObstacles: noop, setMovable: noop, openPortal: noop, cue: noop, notice: noop, say: noop, stage: noop, finish: noop, lost: noop, clear: noop, setPower: noop, ...hooks };
  const groups = new Map(), pending = [], done = new Set(), said = new Set(), reads = new Set(), opened = new Set();
  let stage = 0, hold = null, completed = false, serial = 0, pressureAt = 0, waitNotice = 0, sabotageSaid = 0;
  const van = { x: L.VAN_PATH[0].x, z: L.VAN_PATH[0].z, yaw: 0, index: 0, hp: L.VAN.hp, moving: false, waiting: null, obstacle: { kind: 'van', x: 0, z: 0, hx: 1.15, hz: 2.9, y: 0, height: 2.7, surface: 'metal', van: true, navPad: .9 } };
  let collisions = [];

  const id = () => L.STAGES[stage].id;
  const alive = name => (groups.get(name) || []).filter(e => game.enemies.some(x => x.id === e)).length;
  const say = (key, { again = false } = {}) => { if (!again && said.has(key)) return; said.add(key); h.say(key); };
  const setStage = next => { stage = typeof next === 'string' ? S[next] : next; h.stage(stage, L.STAGES[stage]); };
  const areaOfPlayer = () => L.areaAt(game.player.x, game.player.z);
  function rebuild() { collisions = [...base, ...L.extraObstacles({ open: [...opened] }), ...L.CHECKPOINT_POSTS.map(o => ({ ...o })), van.obstacle]; syncVanObstacle(); game.replaceObstacles(collisions); h.setObstacles(collisions); }
  function open(name) { if (opened.has(name)) return; opened.add(name); rebuild(); h.setMovable(name, true); h.cue('door'); }
  function syncVanObstacle() { const o = van.obstacle, along = Math.abs(Math.sin(van.yaw)) > .7; Object.assign(o, { x: van.x, z: van.z, hx: along ? L.VAN.halfLength : L.VAN.halfWidth, hz: along ? L.VAN.halfWidth : L.VAN.halfLength }); }
  function placeVan(index) { const p = L.VAN_PATH[index], q = L.VAN_PATH[Math.min(index + 1, L.VAN_PATH.length - 1)]; Object.assign(van, { x: p.x, z: p.z, index, hp: L.VAN.hp, moving: false, waiting: null, yaw: Math.atan2(-(q.x - p.x), -(q.z - p.z)) || van.yaw }); syncVanObstacle(); }

  // ---------- Encounters ----------
  function deploy(name, { alert = false } = {}) {
    const enc = L.ENCOUNTERS[name], ids = []; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 900 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); e.mission = name; ids.push(e.id);
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
  function startHold(name) { hold = { name, start: game.time, until: game.time + L.HOLDS[name], waves: [...L.HOLD_WAVES[name]] }; h.cue('hold'); }
  function supplies() { for (const s of L.SUPPLIES) game.pickups.push({ id: game.nextId++, kind: s.kind, x: s.x, y: s.y || 0, z: s.z, until: Infinity }); }
  function armWeapons() {
    game.ownedWeapons = new Set([game.weaponIndex, 0, 1, 2, 3, 4].filter(i => weaponAllowedForCharacter(i, characterId) && !WEAPONS[i].melee));
    game.ammo = WEAPONS.map(w => w.capacity);
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z), grounded: true, verticalSpeed: 0, yaw: cp.yaw || 0 }); }
  function freshGame(cp) {
    game.reset(characterId); armWeapons(); place(cp);
    game.nextWave = Infinity; game.toSpawn = 0; game.spawnTimer = Infinity; game.spawned = 0;
    pending.length = 0; groups.clear(); hold = null; pressureAt = 0; h.clear(); rebuild(); supplies();
  }

  // ---------- The van ----------
  function driveVan(dt) {
    van.moving = false; van.waiting = null;
    const next = L.VAN_PATH[van.index + 1]; if (!next) return;
    const here = L.VAN_PATH[van.index];
    // A stop is left once its obstacle is gone (barrier lifted, trailer towed); the platform is the end of the road.
    if (here.stop && !opened.has(here.stop)) { van.waiting = 'stop'; return; }
    if (!DRIVING.has(id())) { van.waiting = 'stage'; return; }
    const p = game.player;
    if (Math.hypot(p.x - van.x, p.z - van.z) > L.VAN.leash) { van.waiting = 'escorte'; if (game.time > waitNotice) { waitNotice = game.time + 9; h.notice('LE VSAV VOUS ATTEND · RESTEZ À MOINS DE ' + L.VAN.leash + ' M'); } return; }
    const ahead = game.enemies.some(e => e.form !== 'probe' && Math.hypot(e.x - van.x, e.z - van.z) < 11);
    if (ahead) { van.waiting = 'machines'; return; }
    const dx = next.x - van.x, dz = next.z - van.z, d = Math.hypot(dx, dz), stepLen = Math.min(d, L.VAN.speed * dt);
    const target = Math.atan2(-dx, -dz); let turn = target - van.yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn)); van.yaw += Math.max(-dt * 1.4, Math.min(dt * 1.4, turn));
    van.x += dx / (d || 1) * stepLen; van.z += dz / (d || 1) * stepLen; van.moving = stepLen > 0;
    if (d - stepLen < .05) { van.index++; van.x = next.x; van.z = next.z; }
    syncVanObstacle();
  }
  function sabotage(dt) {
    let near = 0;
    for (const e of game.enemies) if (e.form !== 'probe' && Math.hypot(e.x - van.x, e.z - van.z) < L.VAN.sabotageRange) near++;
    if (!near) return;
    van.hp = Math.max(0, van.hp - near * L.VAN.sabotage * dt);
    if (game.time > sabotageSaid) { sabotageSaid = game.time + 20; say('sabotage', { again: true }); h.notice('LE VSAV EST SABOTÉ · ' + Math.ceil(van.hp) + ' %'); }
    if (van.hp <= 0) { h.notice('LE VSAV EST HORS SERVICE'); h.lost('van'); }
  }

  // Stage-specific world state for a checkpoint: what has been achieved stays achieved.
  function setWorld() { h.setPower('annexe', done.has('alimentation')); for (const name of Object.keys(L.MOVABLE)) h.setMovable(name, opened.has(name)); }

  const api = {
    get stage() { return stage; }, get stageId() { return id(); }, get collisions() { return collisions; }, get completed() { return completed; },
    get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: L.HOLDS[hold.name] }; },
    get van() { return { x: van.x, z: van.z, yaw: van.yaw, index: van.index, hp: van.hp, moving: van.moving, waiting: van.waiting }; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive,
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); completed = false;
      placeVan(0); freshGame(L.START); setStage(S.arrivee); setWorld(); say('intro');
    },
    restoreCheckpoint() {
      const at = Math.min(stage, S.regulation), sid = L.STAGES[at].id;
      // Partial progress of the current stage starts over; what earlier stages achieved stays.
      if (sid === 'kit') done.delete('kit');
      if (sid === 'verin') done.delete('verin');
      if (sid === 'balise') done.delete('balise');
      if (sid === 'barriere') done.delete('barriere');
      if (sid === 'echangeur') done.delete('treuil');
      if (sid === 'arrimage') done.delete('arrimage');
      placeVan(VAN_AT[sid]); freshGame(L.STAGES[at].checkpoint); setStage(at);
      for (const name of RESTORE[sid] || []) deploy(name);
      setWorld(); game.state = 'playing';
      h.notice('POINT DE CONTRÔLE · ' + L.STAGES[at].label);
    },
    nearInteraction() {
      const p = game.player;
      for (const it of L.INTERACTIONS) {
        if (Math.abs((p.elevation || 0) - (it.y || 0)) > 1.6 || Math.hypot(p.x - it.x, p.z - it.z) > it.radius) continue;
        if (it.log && !['dossier', 'manifeste', 'relais', 'regulation'].includes(it.id)) return it;
        if (api.available(it.id)) return it;
      }
      return null;
    },
    available(key) {
      if (hold) return false;
      const s = id();
      if (key === 'ines') return s === 'arrivee';
      if (key === 'alimentation') return s === 'alimentation';
      if (key === 'dossier') return S[s] >= S.dossier;
      if (key === 'kit') return s === 'kit' && !done.has('kit');
      if (key === 'manifeste') return S[s] >= S.atelier;
      if (key === 'verin') return s === 'verin' && alive('atelier') === 0;
      if (key === 'relais') return S[s] >= S.a3;
      if (key === 'balise') return s === 'balise' && alive('fracture') <= 1;
      if (key === 'barriere') return s === 'barriere';
      if (key === 'treuil') return s === 'echangeur' && alive('echangeur') <= 1;
      if (key === 'arrimage') return s === 'arrimage' && alive('gare') === 0;
      if (key === 'regulation') return S[s] >= S.regulation;
      return false;
    },
    // Returns the interaction performed (with its log id when a page is to be read), or null.
    interact() {
      if (game.state !== 'playing') return null;
      const it = api.nearInteraction(); if (!it) return null;
      const s = id();
      if (it.log) {
        reads.add(it.log); h.cue('read');
        if (it.id === 'dossier' && s === 'dossier') { setStage(S.kit); say('dossier'); }
        if (it.id === 'manifeste' && s === 'atelier') { setStage(S.verin); say('manifeste'); }
        if (it.id === 'relais' && s === 'a3') { setStage(S.balise); say('relais'); game.grantCharges(1); }
        if (it.id === 'regulation' && s === 'regulation') { say('regulation'); completed = true; setStage(S.fin); h.finish(); }
        return it;
      }
      const key = it.id;
      if (key === 'ines') { say('ines'); setStage(S.alimentation); h.cue('console'); }
      else if (key === 'alimentation') { done.add(key); h.setPower('annexe', true); say('courant'); setStage(S.dossier); h.cue('console'); h.notice('ANNEXE MÉDICALE ALIMENTÉE'); }
      else if (key === 'kit') { done.add(key); deploy('annexe', { alert: true }); say('kit'); h.cue('alarm'); h.notice('KITS DE RÉANIMATION RÉCUPÉRÉS · MACHINES EN APPROCHE'); }
      else if (key === 'verin') { done.add(key); say('verin'); setStage(S.escorte); say('escorte'); h.cue('valve'); h.notice('VÉRIN HYDRAULIQUE DÉMONTÉ · LE VSAV DÉMARRE'); game.grantCharges(1); }
      else if (key === 'balise') { say('balise'); startHold('balise'); h.notice('BALISE ORDRE · BROUILLAGE EN COURS'); }
      else if (key === 'barriere') { say('barriere'); startHold('barriere'); h.notice('BARRIÈRE · LEVÉE EN COURS'); }
      else if (key === 'treuil') { say('treuil'); startHold('treuil'); h.notice('TREUIL DE DÉPANNAGE · TRACTION'); }
      else if (key === 'arrimage') { say('arrimage'); startHold('arrimage'); h.notice('ARRIMAGE DU VSAV · NE PAS INTERROMPRE'); }
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
          if (name === 'balise') { reads.add('balise'); say('baliseOk'); setStage(S.barriere); h.notice('LIAISON ORDRE INTERROMPUE'); h.read?.('balise'); game.grantCharges(1); }
          if (name === 'barriere') { open('barriere'); say('barriereOk'); setStage(S.escorte2); h.notice('BARRIÈRE LEVÉE · LE VSAV REPART'); }
          if (name === 'treuil') { open('remorque'); say('treuilOk'); setStage(S.gare); h.notice('BRETELLE DÉGAGÉE'); game.grantCharges(1); }
          if (name === 'arrimage') { say('arrimageOk'); setStage(S.regulation); h.notice('VSAV ARRIMÉ AU TRAIN SANITAIRE'); }
        }
      }
      // The van, and what its progress triggers.
      driveVan(dt); if (DRIVING.has(s) || hold) sabotage(dt);
      const stopHere = L.VAN_PATH[van.index]?.stop;
      if (s === 'escorte') {
        if (van.z < 22 && !groups.has('route1')) deploy('route1', { alert: true });
        if (van.z < -6 && !groups.has('route2')) deploy('route2', { alert: true });
        if (stopHere === 'barriere') { setStage(S.a3); say('barrage'); deploy('a3'); say('a3'); h.cue('alarm'); }
      }
      if (s === 'escorte2') {
        if (van.x > 18 && !groups.has('voie')) { deploy('voie', { alert: true }); say('voie'); }
        if (stopHere === 'remorque') { setStage(S.echangeur); deploy('echangeur', { alert: true }); say('echangeur'); }
      }
      if (s === 'gare') {
        if (van.z < -62 && !groups.has('gare')) { deploy('gare', { alert: true }); say('gare'); }
        if (stopHere === 'quai') setStage(S.arrimage);
      }
      // Places and events.
      if (s === 'kit' && done.has('kit') && groups.has('annexe') && alive('annexe') === 0) { say('kitOk'); setStage(S.atelier); }
      if (s === 'atelier' && room === 'atelier' && !groups.has('atelier')) { deploy('atelier', { alert: true }); say('atelier'); }
      if (s === 'verin' && !groups.has('atelier')) deploy('atelier', { alert: true });
      if (s === 'balise' && room === 'fracture' && !groups.has('fracture')) { deploy('fracture', { alert: true }); say('fracture'); }
    }
  };
  return api;
}
