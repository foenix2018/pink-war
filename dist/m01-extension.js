// M01 extension flow: prologue (Caserne 07) before the original 'approach', epilogue (Archives végétales)
// after the relay A3. Installed on a CampaignLevel1 instance by the M01 page; without it, CampaignLevel1 keeps
// its original 'approach' → 'exit' chapter (and its tests). Rendering is supplied through hooks.
import {starterWeaponIndex,weaponAllowedForCharacter} from './game-logic.js';
import {CHARGE_MAX} from './armor-combat.js';
import * as X from './m01-extension-layout.js';
import {logFor} from './m01-extension-story.js';

export const PORTAL_CHARGE = 3.2;
export const CHECKPOINT_KEY = 'pink-wars-m01x-checkpoint-v1-';
const PROLOGUE_IDS = X.PROLOGUE.map(s => s.id), EPILOGUE_IDS = X.EPILOGUE.map(s => s.id);
const RANGE = 2.3, noop = () => {};
const isExtension = stage => typeof stage === 'string' && stage.startsWith('x-');

export function installM01Extension(game, hooks = {}) {
  const h = { setDoor: noop, say: noop, cue: noop, notice: noop, journal: noop, hold: noop, ...hooks };
  const proto = Object.getPrototypeOf(game);
  const core = {
    getInteraction: proto.getInteraction.bind(game), interact: proto.interact.bind(game), step: proto.step.bind(game),
    objectiveTarget: proto.objectiveTarget.bind(game), campaign: Object.getOwnPropertyDescriptor(proto, 'campaign').get
  };
  const opened = new Set(), done = new Set(), said = new Set(), reads = new Set(), groups = new Map(), pending = [];
  let hold = null, prologueDone = false;

  // ---------- World: split fence, extension colliders kept in the shared obstacle array ----------
  function applyObstacles() {
    const list = game.obstacles;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].extension) list.splice(i, 1);
    list.push(...X.extensionObstacles({ open: [...opened] }));
    game.replaceObstacles(list);
  }
  {
    const list = game.obstacles, replaced = [];
    for (let i = list.length - 1; i >= 0; i--) if (list[i].fence) { const split = X.splitFence(list[i]); if (split) { list.splice(i, 1); replaced.push(...split.map(b => ({ ...b, extension: false }))); } }
    list.push(...replaced);
  }
  function openDoor(id) { if (opened.has(id)) return; opened.add(id); applyObstacles(); h.setDoor(id, true); h.cue('door'); }
  const say = id => { if (said.has(id)) return; said.add(id); h.say(id); };

  // ---------- Encounters ----------
  function deploy(name, { alert = true } = {}) {
    const enc = X.ENCOUNTERS[name], ids = [], previous = game.encounter;
    game.encounter = Math.max(0, (enc.tier || 1) - 1);
    for (const u of enc.units) {
      const e = game.makeEnemy(u.form, { x: u.x, z: u.z, id: 0, yaw: 0 });
      if (u.elite) Object.assign(e, { elite: true, hp: e.hp * 1.8, radius: Math.max(e.radius, 1.05) });
      if (!alert) Object.assign(e, { awareness: 'patrol', lastKnownX: u.x, lastKnownZ: u.z, alertedUntil: 0 });
      e.extension = name; game.enemies.push(e); ids.push(e.id);
    }
    game.encounter = previous; groups.set(name, ids); return ids;
  }
  function release(name) {
    const enc = X.ENCOUNTERS[name];
    if (!enc.portal) { deploy(name); return; }
    const portal = { id: 300 + groups.size, x: enc.portal.x, z: enc.portal.z, y: 0, yaw: Math.atan2(game.player.x - enc.portal.x, game.player.z - enc.portal.z), openedAt: game.time };
    game.activePortals = [portal]; game.event('portals', { count: 1, sites: [{ ...portal }] });
    h.cue('portal'); h.notice('PORTAIL ORDRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE, close: game.time + PORTAL_CHARGE + 2.4 });
    groups.set(name, []);
  }
  const alive = name => (groups.get(name) || []).filter(id => game.enemies.some(e => e.id === id)).length;
  function supplies(zone) {
    for (let i = game.pickups.length - 1; i >= 0; i--) if (game.pickups[i].extension) game.pickups.splice(i, 1);
    for (const s of X.SUPPLIES) if (!zone || X.ZONE[X.roomAt(s.x, s.z)] === zone) game.pickups.push({ id: game.nextId++, kind: s.kind, x: s.x, y: 0, z: s.z, until: Infinity, extension: true });
  }
  function startHold(name) { hold = { name, start: game.time, until: game.time + X.HOLDS[name], waves: [...X.HOLD_WAVES[name]] }; h.cue('hold'); }

  // ---------- Stages ----------
  function setStage(id) {
    game.stage = id; game.guideCache = null;
    const { title, subtitle } = game.campaign; game.event('campaign', { stage: id, title, subtitle });
  }
  const room = () => X.roomAt(game.player.x, game.player.z);
  function available(id) {
    if (hold) return false;
    const s = game.stage;
    if (id === 'main-courante') return true;
    if (id === 'casier') return true;
    if (id === 'gazole') return s === 'x-groupe' && !done.has('gazole');
    if (id === 'demarreur') return s === 'x-groupe' && done.has('gazole') && !done.has('groupe');
    if (id === 'porte-remise') return s === 'x-remise';
    if (id === 'deverrouillage') return s === 'x-entree';
    if (id === 'bivouac') return true;
    if (id === 'copie') return s === 'x-copie';
    if (id === 'monte-charge') return s === 'x-depart' && alive('sortie') === 0;
    return false;
  }
  function nearInteraction() {
    const p = game.player;
    let best = null, bestD = Infinity;
    for (const it of X.INTERACTIONS) {
      if (it.core || Math.abs((p.elevation || 0) - it.y) > .6) continue;
      const d = Math.hypot(p.x - it.x, p.z - it.z); if (d > RANGE || d >= bestD) continue;
      if (!it.log && !available(it.id)) continue;
      best = it; bestD = d;
    }
    return best;
  }
  function targetFor(stage) {
    const pt = (x, z, label, kind = 'objective', id = 'x-' + stage) => ({ x, z, y: 0, id, label, kind });
    const it = id => { const i = X.INTERACTIONS.find(v => v.id === id); return pt(i.x, i.z, i.label, 'objective', id); };
    switch (stage) {
      case 'x-cour': return pt(-82, 46, 'ENTRER PAR LA PORTE DE SERVICE', 'route');
      case 'x-garde': return it('main-courante');
      case 'x-vestiaires': return it('casier');
      case 'x-groupe': return it(done.has('gazole') ? 'demarreur' : 'gazole');
      case 'x-remise': return it('porte-remise');
      case 'x-sortie': return pt(-70, 88, 'REJOINDRE LE QUARTIER', 'route');
      case 'x-route': return pt(6, -64, 'ARCHIVES VÉGÉTALES · ACCÈS SUD', 'route');
      case 'x-entree': return it('deverrouillage');
      case 'x-bivouac': return it('bivouac');
      case 'x-copie': return it('copie');
      case 'x-depart': return it('monte-charge');
      case 'x-fin': return pt(45, -80, 'ENTRER DANS LE MONTE-CHARGE', 'route');
      default: return null;
    }
  }
  const TEXT = {
    'x-cour': ['La Caserne 07', 'Entrer dans la caserne par la porte de service, au fond de la cour.'],
    'x-garde': ['La nuit de la chute', 'Lire la main courante dans la salle de garde.'],
    'x-vestiaires': ['Les vestiaires', 'Ouvrir les casiers de l’équipe.'],
    'x-groupe': ['Le groupe électrogène', 'Ouvrir l’arrivée de gazole, puis démarrer le groupe et tenir pendant la montée en charge.'],
    'x-remise': ['La remise', 'Commander la porte sectionnelle de la remise.'],
    'x-sortie': ['Sortir de la caserne', 'Neutraliser la patrouille et rejoindre le quartier des secours.'],
    'x-route': ['Une trace de trois jours', 'Rejoindre les Archives végétales par l’accès sud.'],
    'x-entree': ['Les Archives végétales', 'Déverrouiller les portes d’accueil à la main.'],
    'x-bivouac': ['Les Archives végétales', 'Suivre la trace jusqu’au bureau du conservateur.'],
    'x-copie': ['Le registre des disparus', 'Copier le registre avant la purge d’ORDRE, et tenir la salle.'],
    'x-depart': ['Vers les Bas-Niveaux', 'Traverser la serre et appeler le monte-charge.'],
    'x-fin': ['Vers les Bas-Niveaux', 'Entrer dans le monte-charge.']
  };

  // ---------- Overrides on the game instance ----------
  Object.defineProperty(game, 'campaign', { configurable: true, get() {
    if (!isExtension(this.stage)) return core.campaign.call(this);
    const [title, subtitle] = TEXT[this.stage] || ['Le Dernier Signal', ''];
    const t = targetFor(this.stage), portal = this.activePortals[0];
    return { id: 'vesper-01', level: 1, name: 'Le dernier signal', stage: this.stage, title, subtitle, characterId: this.characterId, sibling: this.sibling, archive: [],
      objective: t ? { id: t.id, label: t.label, position: { x: t.x, y: t.y, z: t.z } } : null, extension: true, hold: api.hold,
      encounter: 1, encounters: 1, spawned: 0, total: 0, remaining: this.enemies.length, portal: portal ? { ...portal } : null, completed: this.completed };
  } });
  game.getInteraction = function () {
    if (this.state !== 'playing') return null;
    const it = nearInteraction();
    if (it) return { id: it.id, label: it.label, position: { x: it.x, y: 0, z: it.z }, extension: true };
    return isExtension(this.stage) ? null : core.getInteraction();
  };
  game.interact = function () {
    const it = this.state === 'playing' ? nearInteraction() : null;
    if (it) return handle(it);
    if (isExtension(this.stage)) return false;
    const objective = core.getInteraction();
    if (objective?.id === 'exit') { beginEpilogue(); return true; }
    return core.interact();
  };
  game.objectiveTarget = function () {
    if (!isExtension(this.stage)) return core.objectiveTarget();
    if (this.state !== 'playing' || this.completed) return null;
    if (['x-sortie', 'x-route', 'x-depart'].includes(this.stage) || hold) {
      const enemy = this.enemies.reduce((best, e) => !best || Math.hypot(e.x - this.player.x, e.z - this.player.z) < Math.hypot(best.x - this.player.x, best.z - this.player.z) ? e : best, null);
      if (enemy && (hold || Math.hypot(enemy.x - this.player.x, enemy.z - this.player.z) < 30)) return { x: enemy.x, z: enemy.z, y: enemy.homeHeight || 0, id: `enemy-${enemy.id}`, label: 'NEUTRALISER LES MACHINES', kind: 'enemy' };
    }
    return targetFor(this.stage);
  };
  game.step = function (dt, input = {}) { core.step(dt, input); if (this.state === 'playing') update(); };

  // ---------- Actions ----------
  function handle(it) {
    if (it.log) {
      reads.add(it.log); h.cue('read');
      if (it.id === 'main-courante' && game.stage === 'x-garde') { done.add('main-courante'); setStage('x-vestiaires'); }
      if (it.id === 'casier' && game.stage === 'x-vestiaires') { done.add('casier'); setStage('x-groupe'); }
      if (it.id === 'bivouac' && game.stage === 'x-bivouac') { done.add('bivouac'); setStage('x-copie'); }
      lastJournal = it.log; afterJournal = it.id === 'main-courante' ? 'main' : it.id === 'casier' ? 'casier' : it.id === 'bivouac' ? 'bivouac' : null;
      return true;
    }
    const id = it.id; lastJournal = null; afterJournal = null;
    if (id === 'gazole') { done.add('gazole'); h.cue('valve'); h.notice('ARRIVÉE DE GAZOLE OUVERTE'); }
    else if (id === 'demarreur') { done.add('demarreur'); say('groupe'); startHold('groupe'); h.notice('GROUPE ÉLECTROGÈNE · MONTÉE EN CHARGE'); h.cue('engine'); }
    else if (id === 'porte-remise') { openDoor('portail'); deploy('rue'); say('portail'); setStage('x-sortie'); h.notice('PORTE SECTIONNELLE · OUVERTURE'); game.grantCharges(1); }
    else if (id === 'deverrouillage') { openDoor('accueil'); deploy('galerie', { alert: false }); deploy('serre', { alert: false }); setStage('x-bivouac'); h.notice('DÉVERROUILLAGE MANUEL · PORTES LIBÉRÉES'); }
    else if (id === 'copie') { say('copie'); startHold('copie'); h.notice('COPIE DU REGISTRE · NE PAS INTERROMPRE'); }
    else if (id === 'monte-charge') { openDoor('monte-charge'); setStage('x-fin'); h.notice('MONTE-CHARGE · PORTES OUVERTES'); }
    else return false;
    done.add(id); return true;
  }
  let lastJournal = null, afterJournal = null;
  function beginEpilogue() {
    prologueDone = true; supplies('archives'); done.add('relais-a3'); reads.add('relais-a3');
    lastJournal = 'relais-a3'; afterJournal = 'relais';
    setStage('x-route'); deploy('route'); game.grantCharges(1);
  }
  function finish() {
    game.completed = true; game.state = 'won'; game.triggerHeld = false; game.charge = 0; game.bullets = []; game.score += 1500;
    game.event('campaign-complete', { level: 1, sibling: game.sibling, extension: true }); game.event('win', { campaign: true, level: 1 });
  }

  // ---------- Per-step progression ----------
  function update() {
    const p = game.player, r = room();
    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i];
      if (!q.deployed && game.time >= q.at) { q.deployed = true; deploy(q.name); }
      if (game.time >= q.close) { pending.splice(i, 1); if (!pending.length) game.activePortals = []; }
    }
    if (hold) {
      while (hold.waves.length && game.time >= hold.start + hold.waves[0][0]) { const [, name] = hold.waves.shift(); release(name); if (name === 'nid') say('nid'); }
      if (game.time >= hold.until) {
        const name = hold.name; hold = null; done.add(name); h.cue('stage');
        if (name === 'groupe') { say('groupeOk'); setStage('x-remise'); h.notice('GROUPE EN CHARGE · REMISE ALIMENTÉE'); }
        if (name === 'copie') { reads.add('registre'); lastJournal = 'registre'; afterJournal = 'copieOk'; setStage('x-depart'); deploy('sortie'); game.grantCharges(1); }
      }
    }
    const s = game.stage;
    if (s === 'x-cour' && r === 'couloir') { setStage('x-garde'); say('couloir'); }
    if (s === 'x-sortie' && p.x > -74 && alive('rue') === 0) { prologueDone = true; game.setStage('approach'); say('quartier'); }
    if (s === 'x-route' && r === 'parvis') { setStage('x-entree'); deploy('parvis'); say('parvis'); }
    if (r === 'hall') say('hall');
    if (s === 'x-fin' && r === 'monte-charge') finish();
  }

  // ---------- Checkpoints (extension stages; the core keeps its own) ----------
  function writeCheckpoint(storage) {
    if (!isExtension(game.stage) || hold || game.enemies.length || !game.player.grounded) return false;
    const s = { version: 1, characterId: game.characterId, stage: game.stage, opened: [...opened], done: [...done], reads: [...reads], prologueDone, kills: game.kills,
      weaponIndex: game.weaponIndex, owned: [...game.ownedWeapons], ammo: [...game.ammo], health: Math.max(1, game.player.hp), shield: game.player.shield, charges: game.charges, savedAt: Date.now() };
    try { (storage || globalThis.localStorage).setItem(CHECKPOINT_KEY + game.characterId, JSON.stringify(s)); return true; } catch { return false; }
  }
  function restoreCheckpoint(s) {
    if (!s || s.version !== 1 || s.characterId !== game.characterId || !X.STAGE[s.stage]) return false;
    // A stage's partial progress starts over; earlier stages stay achieved.
    const keepDone = (s.done || []).filter(id => !(s.stage === 'x-groupe' && ['gazole', 'demarreur', 'groupe'].includes(id)) && !(s.stage === 'x-copie' && id === 'copie'));
    opened.clear(); for (const id of s.opened || []) opened.add(id); done.clear(); for (const id of keepDone) done.add(id); reads.clear(); for (const id of s.reads || []) reads.add(id);
    prologueDone = !!s.prologueDone || EPILOGUE_IDS.includes(s.stage); hold = null; pending.length = 0; groups.clear();
    if (EPILOGUE_IDS.includes(s.stage)) opened.add('portail');
    game.enemies = []; game.toSpawn = 0; game.nextSpawnAt = Infinity; game.activePortals = [];
    // The core chapter is complete when the epilogue runs.
    if (EPILOGUE_IDS.includes(s.stage)) Object.assign(game, { workshopReleased: true, investigationRead: true, sabotaged: true, archiveRead: true, circuitIsolated: true, powerAlarm: true, openingActivated: true, openingSpawned: 8, encounter: 2 });
    game.kills = Number(s.kills) || 0;
    game.ownedWeapons = new Set([starterWeaponIndex(game.characterId), 0, ...(s.owned || []).filter(i => Number.isInteger(i) && weaponAllowedForCharacter(i, game.characterId))]);
    game.weaponIndex = game.ownedWeapons.has(s.weaponIndex) ? s.weaponIndex : starterWeaponIndex(game.characterId);
    for (let i = 0; i < game.ammo.length; i++) if (Number.isFinite(s.ammo?.[i])) game.ammo[i] = Math.max(0, Math.min(game.ammo[i], s.ammo[i]));
    game.player.hp = Math.min(100, Math.max(1, Number(s.health) || 100));
    if (Number.isFinite(s.shield)) game.player.shield = Math.max(0, Math.min(game.shieldCapacity || 60, s.shield));
    if (Number.isFinite(s.charges)) game.charges = Math.max(0, Math.min(CHARGE_MAX, s.charges));
    const cp = X.STAGE[s.stage].checkpoint;
    Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z, game.time), grounded: true, verticalSpeed: 0, onLift: null, yaw: cp.yaw });
    applyObstacles(); for (const d of X.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id));
    supplies(EPILOGUE_IDS.includes(s.stage) ? 'archives' : null);
    setStage(s.stage);
    if (s.stage === 'x-bivouac') { deploy('galerie', { alert: false }); deploy('serre', { alert: false }); }
    if (s.stage === 'x-depart') deploy('sortie');
    return true;
  }

  const api = {
    get stage() { return game.stage; }, get extension() { return isExtension(game.stage); }, get prologueDone() { return prologueDone; },
    get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; }, get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: X.HOLDS[hold.name] }; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive, available, nearInteraction,
    // Start of a new mission: the hero arrives in the station yard.
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); groups.clear(); pending.length = 0; hold = null; prologueDone = false;
      Object.assign(game.player, { x: X.CASERNE_START.x, z: X.CASERNE_START.z, elevation: 0, grounded: true, verticalSpeed: 0, yaw: X.CASERNE_START.yaw });
      applyObstacles(); for (const d of X.DOORS) h.setDoor(d.id, !!d.open);
      supplies(); setStage('x-cour'); say('intro');
    },
    // A saved core stage resumes the original chapter, with the prologue behind the player.
    resumeCore() { supplies('archives'); prologueDone = true; opened.add('portail'); applyObstacles(); for (const d of X.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id)); },
    restoreCheckpoint, writeCheckpoint,
    // Journal entry to show after an interaction (documents, relay log, registry copy), with its follow-up lines.
    takeJournal() { const id = lastJournal, then = afterJournal; lastJournal = afterJournal = null; return id ? { entry: logFor(id, game.characterId), id, then } : null; },
    say
  };
  return api;
}

export function readExtensionCheckpoint(characterId, storage) {
  try { const s = JSON.parse((storage || globalThis.localStorage).getItem(CHECKPOINT_KEY + characterId)); return s?.version === 1 && s.characterId === characterId && X.STAGE[s.stage] ? s : null; } catch { return null; }
}
export function clearExtensionCheckpoint(characterId, storage) { try { (storage || globalThis.localStorage).removeItem(CHECKPOINT_KEY + characterId); } catch {} }
