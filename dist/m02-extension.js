// M02 extension flow: prologue (enclave of the covered market) before the street's first objective, epilogue
// (transit tower) after its last one. The M02 page keeps its numeric stages 0–3 for the street; this controller
// owns the 'x-' stages around them and is independent from rendering, so the whole flow runs in tests.
import {WEAPONS,starterWeaponOrder,weaponAllowedForCharacter,segmentBox} from './game-logic.js';
import {ensureEnemyBubble} from './projected-shield-logic.js';
import {M02_STREET_CHECKPOINTS} from './m02-street.js';
import {M02_CHECKPOINT_KEY,validM02Checkpoint} from './m02-checkpoint-index.js';
export {readM02Checkpoint,clearM02Checkpoint} from './m02-checkpoint-index.js';
import {CHARGE_MAX} from './armor-combat.js';
import {configureUnit} from './ligne9-mission.js';
import * as X from './m02-extension-layout.js';
import {logFor} from './m02-extension-story.js';

export const PORTAL_CHARGE = 3.2;
export const CHECKPOINT_KEY = M02_CHECKPOINT_KEY;
const PROLOGUE_IDS = X.PROLOGUE.map(s => s.id), EPILOGUE_IDS = X.EPILOGUE.map(s => s.id);
const RANGE = 2.3, noop = () => {};
// Groups to set again when the player restarts at the checkpoint of a stage (the page saves on each stage change,
// before that stage's group is deployed).
const RESTORE = Object.freeze({ 'x-eclaireurs': ['eclaireurs'], 'x-tour': ['tour'], 'x-manifeste': ['coffre'], 'x-quai': ['renfort'] });
// Stage → follow-up lines once its document is closed.
const AFTER = Object.freeze({ 'registre-soins': 'registre', radio: 'radio', manifeste: 'manifeste' });

export function createM02Extension(game, { characterId = 'ghju', obstacles, hooks = {} } = {}) {
  const h = { setDoor: noop, setObstacles: noop, say: noop, cue: noop, notice: noop, stage: noop, core: noop, finale: noop, streetCheckpoint:()=>({stage:0,patrolCleared:false}), ...hooks };
  const base = obstacles || game.obstacles.filter(o => !o.extension);
  const opened = new Set(), done = new Set(), said = new Set(), reads = new Set(), groups = new Map(), pending = [], collectedSupplies=new Set(), supplyIds=new Map();
  let stage = null, hold = null, serial = 0, lastJournal = null, afterJournal = null, prologueDone = false,checkpointStorageError=false;

  // ---------- World ----------
  function rebuild() {
    const list = [...base, ...X.extensionObstacles({ open: [...opened] })];
    game.replaceObstacles(list); h.setObstacles(list); return list;
  }
  function openDoor(id) { if (opened.has(id)) return; opened.add(id); rebuild(); h.setDoor(id, true); h.cue('door'); }
  const say = id => { if (said.has(id)) return; said.add(id); h.say(id); };

  // ---------- Encounters ----------
  function deploy(name, { alert = true } = {}) {
    const enc = X.ENCOUNTERS[name], ids = [], heldPortals=game.activePortals; game.wave = enc.wave;
    if (!Number.isFinite(game.spawned)) game.spawned = 0;
    for (const u of enc.units) {
      game.toSpawn = 1; game.activePortals = [{ id: 700 + (serial++), x: u.x, z: u.z, yaw: 0, openedAt: game.time }];
      game.spawnEnemy(); const e = game.enemies.at(-1); if (!e) continue;
      configureUnit(e, u, enc.wave); if(game.projectedShieldsEnabled)ensureEnemyBubble(e); e.helix = !!u.helix; e.extension = name; ids.push(e.id);
      if (alert) Object.assign(e, { awareness: 'search', alertedUntil: game.time + 8, lastKnownX: game.player.x, lastKnownZ: game.player.z, lastKnownHeight: game.player.elevation });
    }
    game.activePortals = heldPortals; game.toSpawn = 0; game.spawnTimer = Infinity; game.nextWave = Infinity;
    groups.set(name, ids); return ids;
  }
  // Hold reinforcements arrive through a short-lived HELIX drop point (telegraphed like a portal).
  function release(name) {
    const u = X.ENCOUNTERS[name].units[0];
    const portal = { id: 800 + (serial++), x: u.x, z: u.z, y: 0, yaw: Math.atan2(game.player.x - u.x, game.player.z - u.z), openedAt: game.time };
    game.activePortals = [portal]; game.event('portals', { count: 1, sites: [{ ...portal }] });
    h.cue('portal'); h.notice('DIRECTOIRE · RENFORTS EN APPROCHE'); pending.push({ name, at: game.time + PORTAL_CHARGE, close: game.time + PORTAL_CHARGE + 2.4 });
    groups.set(name, []);
  }
  const alive = name => (groups.get(name) || []).filter(id => game.enemies.some(e => e.id === id)).length;
  function trackSupplies(){for(const [id,key]of supplyIds)if(!game.pickups.some(p=>p.id===id)){collectedSupplies.add(key);supplyIds.delete(id);}}
  function supplies(zone) {
    trackSupplies();supplyIds.clear();
    for (let i = game.pickups.length - 1; i >= 0; i--) if (game.pickups[i].extension) game.pickups.splice(i, 1);
    for(const s of X.SUPPLIES){const key=s.kind+':'+s.x+':'+s.z;if(collectedSupplies.has(key)||zone&&X.ZONE[X.roomAt(s.x,s.z)]!==zone)continue;const id=game.nextId++;supplyIds.set(id,key);game.pickups.push({id,kind:s.kind,x:s.x,y:0,z:s.z,until:Infinity,extension:true,supplyKey:key});}
  }
  function startHold(name) { hold = { name, start: game.time, until: game.time + X.HOLDS[name], waves: [...X.HOLD_WAVES[name]] }; h.cue('hold'); }

  // ---------- Stages ----------
  const setStage = id => { stage = id; h.stage(id, X.STAGE[id] || null); };
  const room = () => X.roomAt(game.player.x, game.player.z);
  function available(id) {
    if (hold) return false;
    if (id === 'batterie') return stage === 'x-radio' && !done.has('batterie');
    if (id === 'radio') return stage === 'x-radio' && done.has('batterie');
    if (id === 'registre-soins') return true;
    if (id === 'manivelle') return stage === 'x-grille';
    if (id === 'badge') return stage === 'x-badge';
    if (id === 'lecteur') return stage === 'x-coffre' && alive('tour') === 0;
    if (id === 'manifeste') return EPILOGUE_IDS.indexOf(stage) >= EPILOGUE_IDS.indexOf('x-manifeste') || done.has('manifeste');
    if (id === 'commande-quai') return stage === 'x-quai' && alive('renfort') === 0;
    return false;
  }
  function nearInteraction() {
    if (!stage || hold) return null;
    const p = game.player, expected=targetFor(stage)?.id; let best = null, bestD = Infinity, bestPriority=Infinity;
    for (const it of X.INTERACTIONS) {
      if (Math.abs((p.elevation || 0) - it.y) > .6) continue;
      const d = Math.hypot(p.x - it.x, p.z - it.z); if (d > RANGE) continue;
      if(game.obstacles.some(o=>['wall','door'].includes(o.kind)&&segmentBox({x:p.x,y:(p.elevation||0)+1.3,z:p.z},{x:it.x,y:it.y+1.3,z:it.z},o)!==null))continue;
      // Documents are always readable; the radio and the manifest only once their stage is reached.
      if (!(it.log && !['radio', 'manifeste'].includes(it.id)) && !available(it.id)) continue;
      // The vault's documents are behind its door.
      if (X.roomAt(it.x, it.z) === 'coffre' && !opened.has('coffre')) continue;
      const priority=d<.35?-1:it.id===expected?0:1;
      if(priority<bestPriority||(priority===bestPriority&&d<bestD)){best=it;bestD=d;bestPriority=priority;}
    }
    return best;
  }
  function targetFor(id) {
    const pt = (x, z, label) => ({ x, z, y: 0, id, label });
    const it = key => { const i = X.INTERACTIONS.find(v => v.id === key); return {...pt(i.x,i.z,i.label),id:key}; };
    switch (id) {
      case 'x-arrivee': return pt(20, 87, 'REJOINDRE LE DISPENSAIRE');
      case 'x-dispensaire': return it('registre-soins');
      case 'x-radio': return it(done.has('batterie') ? 'radio' : 'batterie');
      case 'x-eclaireurs': return pt(-8, 90, 'REPOUSSER LES ÉCLAIREURS DU DIRECTOIRE');
      case 'x-grille': return it('manivelle');
      case 'x-tour': return pt(0, -88, 'PRENDRE LE POSTE DE CONTRÔLE');
      case 'x-badge': return it('badge');
      case 'x-coffre': return it('lecteur');
      case 'x-manifeste': return it('manifeste');
      case 'x-quai': return it('commande-quai');
      default: return null;
    }
  }

  // ---------- Actions ----------
  function handle(it) {
    if (it.log) {
      reads.add(it.log); h.cue('read'); lastJournal = it.log; afterJournal = null;
      if (it.id === 'registre-soins' && stage === 'x-dispensaire') { done.add(it.id); setStage('x-radio'); afterJournal = AFTER[it.id]; }
      else if (it.id === 'radio' && stage === 'x-radio') { done.add('radio'); afterJournal = AFTER.radio; setStage('x-eclaireurs'); deploy('eclaireurs'); game.grantCharges(1); }
      else if (it.id === 'manifeste' && stage === 'x-manifeste') { done.add('manifeste'); afterJournal = AFTER.manifeste; setStage('x-quai'); say('alarme'); deploy('renfort'); game.grantCharges(1); }
      return true;
    }
    const id = it.id; lastJournal = afterJournal = null;
    if (id === 'batterie') { h.cue('valve'); h.notice('BANC DE BATTERIES RACCORDÉ'); }
    else if (id === 'manivelle') { say('grille'); startHold('grille'); h.notice('GRILLE DE L’ENCLAVE · MANŒUVRE EN COURS'); h.cue('engine'); }
    else if (id === 'badge') { setStage('x-coffre'); h.notice('BADGE DU DIRECTOIRE · NIVEAU 3'); say('tourOk'); }
    else if (id === 'lecteur') { openDoor('coffre'); deploy('coffre'); setStage('x-manifeste'); say('coffre'); h.notice('COFFRE DE DONNÉES · ACCÈS ACCORDÉ'); }
    else if (id === 'commande-quai') { say('verrou'); startHold('quai'); h.notice('PORTE DU CONVOI · VERROUILLAGE'); h.cue('engine'); }
    else return false;
    done.add(id); return true;
  }
  function finishPrologue() { prologueDone = true; setStage(null); supplies('tour'); h.core(); }

  // ---------- Per-step progression (call after game.step) ----------
  function update() {
    if (game.state !== 'playing') return;
    trackSupplies();
    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i];
      if (!q.deployed && game.time >= q.at) { q.deployed = true; deploy(q.name); if (q.name === 'quai2') say('agent'); }
      if (game.time >= q.close) { pending.splice(i, 1); if (!pending.length) game.activePortals = []; }
    }
    if (hold) {
      while (hold.waves.length && game.time >= hold.start + hold.waves[0][0]) release(hold.waves.shift()[1]);
      if (game.time >= hold.until) {
        const name = hold.name; hold = null; done.add(name); h.cue('stage');
        if (name === 'grille') { openDoor('grille'); say('grilleOk'); h.notice('GRILLE LEVÉE · REJOINDRE LE POSTE DE SOINS'); game.grantCharges(1); finishPrologue(); return; }
        if (name === 'quai') { openDoor('convoi'); say('verrouOk'); setStage('x-fin'); h.notice('CONVOI 03 IMMOBILISÉ'); }
      }
    }
    const r = room();
    if (stage === 'x-arrivee' && r === 'dispensaire') { setStage('x-dispensaire'); say('dispensaire'); }
    if (stage === 'x-eclaireurs' && alive('eclaireurs') === 0) { setStage('x-grille'); say('eclaireursOk'); }
    if (stage === 'x-tour' && alive('tour') === 0) setStage('x-badge');
    if (stage === 'x-quai' && r === 'quai') say('quai');
    if (stage === 'x-fin' && !hold && game.enemies.every(e => !e.extension)) { const cleared = stage; stage = 'x-done'; h.finale(cleared); }
  }

  // ---------- Checkpoints ----------
  // Key of the place a checkpoint would restore now: the extension stage, or the street once the prologue is done.
  const checkpointKey = () => stage==='x-done'?'x-fin':stage || (prologueDone ? X.STREET.id : null);
  const checkpointToken=()=>JSON.stringify([checkpointKey(),stage?null:h.streetCheckpoint(),[...done],[...reads],[...opened],[...groups.keys()],[...collectedSupplies]]);
  function writeCheckpoint(storage) {
    const id = checkpointKey();
    if(!id||!X.STAGE[id]||hold||pending.length||game.state!=='playing'||game.enemies.length||game.toSpawn||!game.player.grounded||game.player.onLift||Math.abs(game.player.verticalSpeed||0)>.05||game.player.hp<=0)return false;
    trackSupplies();const street=id===X.STREET.id?h.streetCheckpoint():null;if(street&&(!Number.isInteger(street.stage)||street.stage<0||street.stage>3))return false;
    // Groups of the stage not deployed yet come back on restore; a deployed group is cleared (no enemy left).
    const s = { version: 2, characterId, stage: id, streetStage:street?.stage??0,patrolCleared:!!street?.patrolCleared,collectedSupplies:[...collectedSupplies],dualAmmo:{...game.dual.ammo}, restore: (RESTORE[id] || []).filter(name => !groups.has(name)), opened: [...opened], done: [...done], reads: [...reads], kills: game.kills,score:game.score,time:game.time,
      weaponIndex: game.weaponIndex, owned: [...game.ownedWeapons], ammo: [...game.ammo], health: Math.max(1, game.player.hp), shield: game.player.shield, charges: game.charges, savedAt: Date.now() };
    try { (storage || globalThis.localStorage).setItem(CHECKPOINT_KEY + characterId, JSON.stringify(s)); checkpointStorageError=false;game.checkpointPosition={...(id===X.STREET.id?M02_STREET_CHECKPOINTS[s.streetStage]:X.STAGE[id].checkpoint),id:id+':'+s.streetStage};return true; } catch { checkpointStorageError=true;return false; }
  }
  function place(cp) { Object.assign(game.player, { x: cp.x, z: cp.z, elevation: game.surfaceHeight(cp.x, cp.z, game.time,(cp.elevation||0)+.3), grounded: true, verticalSpeed: 0, yaw: cp.yaw, onLift:null,jumpHeld:false,airJumps:0,jumpImpulseX:0,jumpImpulseZ:0,shieldDeployed:false }); }
  function restoreCheckpoint(s) {
    if(!validM02Checkpoint(s,characterId)||!X.STAGE[s.stage])return false;
    const keepDone = (s.done || []).filter(id => !(s.version===1&&s.stage === 'x-radio' && id === 'batterie') && !(s.stage === 'x-grille' && id === 'manivelle') && !(s.stage === 'x-quai' && id === 'commande-quai'));
    opened.clear(); for(const id of s.opened||[])if(X.DOORS.some(d=>d.id===id))opened.add(id); done.clear(); for (const id of keepDone) done.add(id); reads.clear(); for (const id of s.reads || []) reads.add(id);
    said.clear(); hold = null; pending.length = 0; groups.clear();supplyIds.clear();collectedSupplies.clear();for(const key of s.collectedSupplies||[])if(typeof key==='string')collectedSupplies.add(key);game.pickups=game.pickups.filter(p=>!p.extension);
    game.enemies = []; game.bullets = []; game.activePortals = []; game.toSpawn = 0; game.nextWave = Infinity;
game.planarVelocity={x:0,z:0};game.playerVelocity={x:0,y:0,z:0};
    game.state='playing';game.kills=Math.max(0,Math.floor(Number(s.kills)||0));game.score=Math.max(0,Number(s.score)||0);game.time=Math.max(0,Number(s.time)||0);
    game.ownedWeapons=new Set([...starterWeaponOrder(characterId),...(Array.isArray(s.owned)?s.owned:[]).filter(i=>Number.isInteger(i)&&weaponAllowedForCharacter(i,characterId))]);
    if(!game.ownedWeapons.has(game.weaponIndex))game.weaponIndex=starterWeaponOrder(characterId)[0];if(game.ownedWeapons.has(s.weaponIndex))game.selectWeapon?.(s.weaponIndex);
    for (let i = 0; i < game.ammo.length; i++) if (Number.isFinite(s.ammo?.[i])) game.ammo[i] = Math.max(0, Math.min(WEAPONS[i].capacity, s.ammo[i]));
    game.restoreDualAmmo(s.dualAmmo);game.cooldown=0;game.reloadRemaining=0;game.charge=0;game.triggerHeld=false;game.semiPending=false;game.thrownCharges=[];game.state='playing';
    game.player.hp = Math.min(100, Math.max(1, Number(s.health) || 100));
    if (Number.isFinite(s.shield)) game.player.shield = Math.max(0, Math.min(game.shieldCapacity || 60, s.shield));
    if (Number.isFinite(s.charges)) game.charges = Math.max(0, Math.min(CHARGE_MAX, s.charges));
    const street = s.stage === X.STREET.id;
    prologueDone = street || EPILOGUE_IDS.includes(s.stage);
    opened.add('monte-charge'); // Entry elevator never traps a resumed player inside.
    if (prologueDone) opened.add('grille'); if (EPILOGUE_IDS.includes(s.stage)) opened.add('tour');
    // Older checkpoints may omit door flags even though their objective is already inside the vault.
    if(['x-manifeste','x-quai','x-fin','x-done'].includes(s.stage))opened.add('coffre');if(s.stage==='x-fin')opened.add('convoi');
    rebuild(); for (const d of X.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id));
    game.checkpointPosition={...(street?M02_STREET_CHECKPOINTS[s.streetStage||0]:X.STAGE[s.stage].checkpoint),id:s.stage+':'+(s.streetStage||0)};
    place(street?M02_STREET_CHECKPOINTS[s.streetStage||0]:X.STAGE[s.stage].checkpoint); supplies(prologueDone ? 'tour' : null);
    if(street){setStage(null);h.core({stage:s.streetStage||0,patrolCleared:!!s.patrolCleared});return true;}
    setStage(s.stage); for (const name of Array.isArray(s.restore) ? s.restore : RESTORE[s.stage] || []) if(Object.hasOwn(X.ENCOUNTERS,name))deploy(name, { alert: false });
    return true;
  }

  const api = {
    get stage() { return stage; }, get active() { return !!stage; }, get prologueDone() { return prologueDone; }, get checkpointKey() { return checkpointKey(); },get checkpointToken(){return checkpointToken();},get checkpointStorageError(){return checkpointStorageError;}, get opened() { return [...opened]; }, get done() { return [...done]; }, get reads() { return [...reads]; },
    get pending() { return pending.map(p => p.name); },
    get hold() { return hold && { name: hold.name, remaining: Math.max(0, hold.until - game.time), total: X.HOLDS[hold.name] }; },
    groups() { return Object.fromEntries([...groups].map(([k, v]) => [k, { deployed: v.length, alive: alive(k) }])); },
    alive, available, nearInteraction, update, say,
    // New mission: the hero steps out of the Archives' service lift into the enclave.
    start() {
      opened.clear(); done.clear(); said.clear(); reads.clear(); groups.clear();collectedSupplies.clear();supplyIds.clear(); pending.length = 0; hold = null; lastJournal = afterJournal = null; prologueDone = false;
      opened.add('monte-charge'); rebuild(); for (const d of X.DOORS) h.setDoor(d.id, !!d.open || opened.has(d.id));
      place(X.LIFT_START); supplies(); setStage('x-arrivee'); say('intro');
    },
    // The street's last objective opens the transit tower instead of ending the chapter.
    beginEpilogue() {
      prologueDone = true; opened.add('grille'); openDoor('tour'); supplies('tour'); setStage('x-tour'); deploy('tour', { alert: false }); say('tour'); game.grantCharges(1);
    },
    // Interaction prompt and action for the extension; the page falls back to its own objectives otherwise.
    interaction() { const it = game.state === 'playing' ? nearInteraction() : null; return it && { id: it.id, label: it.label, x: it.x, z: it.z }; },
    interact() { const it = game.state === 'playing' ? nearInteraction() : null; return it ? handle(it) : false; },
    target(){
      if(!stage||!X.STAGE[stage])return null;
      let relevant=null;
      if(stage==='x-eclaireurs')relevant=new Set(groups.get('eclaireurs')||[]);
      if(stage==='x-tour')relevant=new Set(groups.get('tour')||[]);
      if(stage==='x-quai'&&alive('renfort'))relevant=new Set(groups.get('renfort')||[]);
      const candidates=game.enemies.filter(e=>relevant?relevant.has(e.id):hold?e.extension?.startsWith(hold.name):stage==='x-fin'?!!e.extension:false);
      const enemy=candidates.reduce((best,e)=>!best||Math.hypot(e.x-game.player.x,e.z-game.player.z)<Math.hypot(best.x-game.player.x,best.z-game.player.z)?e:best,null);
      if(enemy)return{x:enemy.x,z:enemy.z,y:enemy.elevation||0,id:'enemy-'+enemy.id,label:enemy.helix?'NEUTRALISER LES AGENTS DU DIRECTOIRE':'NEUTRALISER LES MACHINES',enemy:true};
      return targetFor(stage);
    },
    guidance(){
      const target=this.target(),h=this.hold;let instruction=X.STAGE[stage]?.hint||'';
      if(h)instruction=(h.name==='grille'?'Ouverture de la grille':'Verrouillage du convoi')+' : encore '+Math.ceil(h.remaining)+' s. Repousse les renforts ; la manœuvre se termine automatiquement.';
      else if(target?.enemy)instruction='Neutralise les menaces indiquées avant de poursuivre. La commande reste verrouillée pendant ce combat.';
      else if(stage==='x-radio')instruction=done.has('batterie')?'Batteries raccordées. Approche de la radio, puis utilise F / ACTION.':'Entre dans le local radio et raccorde le banc de batteries avec F / ACTION.';
      else if(stage==='x-grille')instruction='Approche de la manivelle à droite de la grille et utilise F / ACTION une fois. Défends ensuite la zone pendant 25 secondes.';
      else if(stage==='x-coffre')instruction='Le badge est acquis. Approche du lecteur côté hall, puis utilise F / ACTION pour ouvrir le coffre.';
      else if(stage==='x-quai')instruction='Approche du poste de commande au fond du quai et utilise F / ACTION une fois. Défends la zone pendant 50 secondes.';
      else if(target?.id&&X.INTERACTIONS.some(i=>i.id===target.id))instruction+=' Approche et utilise F / ACTION.';
      return{target,instruction,progress:h?1-h.remaining/h.total:null};
    },
    doorStatus(id){
      const d=X.DOORS.find(d=>d.id===id);if(!d)return null;
      const unlocked=!!d.open||opened.has(id);let reason=unlocked?'Passage déverrouillé. Approche pour traverser.':this.guidance().instruction;
      if(!unlocked&&id==='tour')reason='Active d’abord le terminal d’évacuation de la ruelle, après la passerelle.';
      if(!unlocked&&id==='coffre'&&stage!=='x-coffre')reason=stage==='x-badge'?'Prends le badge sur le bureau du poste de contrôle.':'Neutralise le poste de contrôle, puis récupère son badge.';
      if(!unlocked&&id==='grille'&&!hold&&stage!=='x-grille')reason='Lis le registre de soins, rétablis la radio et repousse les éclaireurs avant d’actionner la manivelle.';
      return{id,unlocked,reason,label:d.label||d.id};
    },
    restoreCheckpoint, writeCheckpoint,
    takeJournal() { const id = lastJournal, then = afterJournal; lastJournal = afterJournal = null; return id ? { entry: logFor(id, characterId), id, then } : null; }
  };
  return api;
}
