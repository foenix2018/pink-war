import { ArenaGame, clamp, segmentBox } from './game-logic.js';
import { PROBE } from './aerial-probes.js';
import { enemyDurability } from './enemy-combat.js';
import {LEVEL1_MAP,level1Traversal} from './level1-layout.js';

// Independent Vesper mission map. Metres match the Blender source and physics.
export const LEVEL1 = Object.freeze({
  id: 'vesper-01', name: 'Le dernier signal',
  start: Object.freeze({ x: 0, z: 72, y: 0 }),
  power: Object.freeze({ x: -6, z: 62, y: 0 }),
  archive: Object.freeze({ x: 0, z: 55, y: 0 }),
  portal: Object.freeze({ x: 0, z: 33, y: 0 }),
  junction: Object.freeze({ x:18,z:6,y:0 }),
  exit: Object.freeze({ x:18,z:-44,y:4.8 })
});

const ENCOUNTERS = Object.freeze([Object.freeze(['probe','stalker','scuttler','seer']),Object.freeze(['seer','probe','scuttler','brute'])]);
const PORTAL_CANDIDATES=LEVEL1_MAP.portals.map(([x,z])=>({x,z,y:0}));
const INTERACTION_RANGE = 2.65;
const PORTAL_DISTANCE = 12;

/** A finite first chapter using ArenaGame's actual ballistics and locomotion. */
export class CampaignLevel1 extends ArenaGame {
  constructor(obstacles = [], random = Math.random, characterId = 'ghju') {
    super(obstacles, random,level1Traversal);
    this.reset(characterId);
  }

  reset(characterId = this.characterId || 'ghju') {
    super.reset();
    this.mode = 'campaign';
    this.characterId = String(characterId).toLowerCase() === 'lylu' ? 'lylu' : 'ghju';
    this.sibling = this.characterId === 'ghju' ? 'LYLU' : 'GHJU';
    Object.assign(this.player, { x: LEVEL1.start.x, z: LEVEL1.start.z, elevation: 0, yaw: 0 });
    this.wave = 1;
    this.nextWave = -1;
    this.spawned = 0;
    this.encounter = 0;
    this.nextSpawnAt = Infinity;
    this.archiveReadUntil = Infinity;
    this.archiveRead = false;
    this.completed = false;
    this.stage = 'power';
    this.setStage('power');
    this.openingSpawned=0;this.ensureOpeningPatrol();
    return this;
  }

  get archiveLines() {
    if (!this.archiveRead) return [];
    return [
      'ARCHIVE LOCALE — RÉSEAU DÉCONNECTÉ',
      `INTERVENTION HUMAINE : ${this.sibling}`,
      'Relais des Archives végétales remis sous tension.',
      'Si tu me cherches : prends l’escalier extérieur.',
      `Retrouve le terminal sur la terrasse. — ${this.sibling}`
    ];
  }

  get campaign() {
    const text = {
      power: ['Le laboratoire abandonné', 'Rétablir le courant sur le boîtier de secours.'],
      archive: ['Un ordinateur du passé', 'Consulter le terminal local, isolé du réseau d’ORDRE.'],
      breach: [`Une trace de ${this.sibling}`, 'Une intervention récente confirme son passage. Lire l’archive.'],
      combat: ['Le signal a été repéré', 'Repousser les machines dans la cour du laboratoire.'],
      crossing: ['La rue des évacuations', 'Récupérer BLOOM, puis suivre les repères ambre jusqu’au carrefour nord.'],
      combat2: ['Le verrou d’ORDRE', 'Utiliser les couvertures de la rue pour éliminer la seconde patrouille.'],
      exit: ['Rejoindre les Archives végétales', 'Monter par l’escalier extérieur ou l’ascenseur, puis consulter le relais.'],
      complete: ['Niveau 1 terminé', `${this.sibling} est passé par les Archives végétales. La recherche continue.`]
    }[this.stage];
    const targets = {
      power: { id: 'power', label: 'RÉTABLIR LE COURANT', position: LEVEL1.power },
      archive: { id: 'archive', label: 'LIRE L’ARCHIVE', position: LEVEL1.archive },
      exit: { id: 'exit', label: 'CONSULTER LE RELAIS', position: LEVEL1.exit }
    };
    const target = targets[this.stage];
    return {
      id: LEVEL1.id, level: 1, name: LEVEL1.name, stage: this.stage,
      title: text[0], subtitle: text[1], characterId: this.characterId,
      sibling: this.sibling, archive: this.archiveLines,
      objective: target ? { ...target, position: { ...target.position } } : null,
      encounter:this.encounter+1,spawned:this.spawned+this.encounter*4+this.openingSpawned,total:10,opening:this.openingSpawned,
      remaining: this.toSpawn + this.enemies.length,
      portal: this.activePortals[0] ? { ...this.activePortals[0] } : null,
      completed: this.completed
    };
  }

  setStage(stage) {
    this.stage = stage;
    const { title, subtitle } = this.campaign;
    this.event('campaign', { stage, title, subtitle });
  }

  getInteraction() {
    if (this.state !== 'playing') return null;
    const objective = this.campaign.objective;
    if (!objective) return null;
    const target = objective.position;
    if (Math.hypot(this.player.x - target.x, this.player.z - target.z) > INTERACTION_RANGE
      || Math.abs(this.player.elevation - target.y) > .55) return null;
    const eye = { x: this.player.x, y: this.player.elevation + (this.player.crouched ? .88 : 1.45), z: this.player.z };
    const screen = { x: target.x, y: target.y + 1.35, z: target.z };
    if (this.obstacles.some(box => box.campaignTerminal !== objective.id && segmentBox(eye, screen, box) !== null)) return null;
    return objective;
  }

  interact() {
    const objective = this.getInteraction();
    if (!objective) return false;
    if (objective.id === 'power') this.setStage('archive');
    else if (objective.id === 'archive') {
      this.archiveRead = true;
      // An isolated power surge stalls nearby robots while the human log is read.
      this.invulnerable=Math.max(this.invulnerable,5);
      for(const e of this.enemies)e.stunnedUntil=Math.max(e.stunnedUntil||0,this.time+5);
      this.archiveReadUntil = this.time + 5;
      this.setStage('breach');
    } else if (objective.id === 'exit') {
      this.completed = true;
      this.state = 'won';
      this.triggerHeld = false;
      this.charge = 0;
      this.bullets = [];
      this.score += 1000;
      this.setStage('complete');
      this.event('campaign-complete', { level: 1, sibling: this.sibling });
      this.event('win', { campaign: true, level: 1 });
    }
    return true;
  }

  collectWeapon() { return this.interact() || super.collectWeapon(); }
  beginWave() { return false; }
  startEndless() { return false; }

  portalIsClear(point) {
    return this.obstacles.every(box => {
      if (box.walkableSurface || (box.y || 0) >= 4.2) return true;
      return Math.abs(point.x - box.x) > box.hx + 1.35 || Math.abs(point.z - box.z) > box.hz + 1.35;
    });
  }

  choosePortal() {
    // Build the shared field from the current position. A blocked or inaccessible
    // site is deferred; there is deliberately no unsafe fallback at the player.
    this.navigation.refreshAt = -1;
    this.navigation.update(this.player, this.time);
    for (const site of (this.encounter?PORTAL_CANDIDATES.slice(3).concat(PORTAL_CANDIDATES.slice(0,3)):PORTAL_CANDIDATES)) {
      if (Math.hypot(site.x - this.player.x, site.z - this.player.z) < PORTAL_DISTANCE || !this.portalIsClear(site)) continue;
      const cell = this.navigation.nearestOpen(site.x, site.z);
      if (cell < 0 || this.navigation.distance[cell] < 0) continue;
      return { id: 101, x: site.x, z: site.z, yaw: Math.atan2(this.player.x - site.x, this.player.z - site.z), openedAt: this.time };
    }
    return null;
  }

  openBreach() {
    const portal = this.choosePortal();
    if (!portal) return false;
    this.activePortals = [portal];
    this.toSpawn = ENCOUNTERS[this.encounter].length;
    this.spawned = 0;
    this.nextSpawnAt = this.time + 3;
    this.setStage(this.encounter?'combat2':'combat');
    this.event('portals', { count: 1, sites: [{ ...portal }] });
    this.event('wave', { wave: 1, count: ENCOUNTERS[this.encounter].length, campaign: true });
    return true;
  }

  makeEnemy(form,site) {
    const probe=form==='probe';
    const homeHeight = this.surfaceHeight(site.x, site.z, this.time, .3);
    const enemy = {
      id: this.nextId++, x: site.x, z: site.z,
      elevation: homeHeight + (probe ? PROBE.hover : 0), homeHeight,
      grounded: !probe, verticalSpeed: 0, form, elite: false,
      ranged: probe || ['seer','brute'].includes(form), hp: enemyDurability(1, form, false),
      aimHeight: probe ? PROBE.aimHeight : form === 'scuttler' ? .88 : form === 'seer' ? 1.38 : 1.15,
      radius: probe ? PROBE.radius : form === 'scuttler' ? .86 : .8,
      hitRadius: probe ? .44 : form === 'scuttler' ? .91 : form === 'seer' ? .94 : 1.05,
      speed: probe ? 3.67 : form === 'scuttler' ? 2.68 : 2.4,
      tier: 1, limpUntil: 0, stunnedUntil: 0,
      homeX: site.x, homeZ: site.z, portalId: site.id,
      attackTimer: 1.4, phase: this.random() * Math.PI * 2,
      awareness: 'search', lastSeenAt: -999,
      lastKnownX: this.player.x, lastKnownZ: this.player.z,
      lastKnownHeight: this.player.elevation, alertedUntil: this.time + 15,
      patrolAngle: site.yaw, patrolTimer: 2
    };
    return enemy;
  }

  ensureOpeningPatrol() {
    // No terminal prerequisites: a sentry is visible through the laboratory door
    // from the start. Spawn only in real clear geometry and retry if rebuilding.
    const sites=[{x:3,z:61,form:'probe'},{x:2.2,z:47,form:'stalker'}];
    for(let i=this.openingSpawned;i<sites.length;i++){
      const site=sites[i];if(!this.portalIsClear(site))break;
      const e=this.makeEnemy(site.form,{...site,id:0,yaw:0});
      Object.assign(e,{opening:true,awareness:'patrol',lastKnownX:site.x,lastKnownZ:site.z,lastKnownHeight:0,alertedUntil:0,stunnedUntil:this.time+2});
      this.enemies.push(e);this.openingSpawned++;
    }
  }

  spawnEnemy() {
    if (this.state !== 'playing' || !['combat','combat2'].includes(this.stage) || this.toSpawn <= 0
      || this.spawned >= ENCOUNTERS[this.encounter].length || this.time + 1e-8 < this.nextSpawnAt) return false;
    const site = this.activePortals[0];
    if (!site || !this.portalIsClear(site)) return false;
    const form = ENCOUNTERS[this.encounter][this.spawned], probe = form === 'probe';
    const enemy=this.makeEnemy(form,site);
    this.enemies.push(enemy);
    this.spawned++;
    this.toSpawn--;
    // The probe establishes the threat before the ground patrol emerges.
    this.nextSpawnAt = this.time + (this.spawned === 1 ? 5 : 3.5);
    this.event('spawn', { id: enemy.id, x: enemy.x, y: enemy.elevation + enemy.aimHeight, z: enemy.z });
    return true;
  }

  step(dt, input = {}) {
    if (this.state !== 'playing') return;
    // Only scheduling is replaced. Damage, projectile hits, recoil timing,
    // navigation, regeneration, stairs and lifts all remain shared with ArenaGame.
    if(this.stage==='power'||this.stage==='archive')this.ensureOpeningPatrol();
    this.nextWave = Infinity;
    this.spawnTimer = Infinity;
    try { super.step(clamp(dt, 0, .05), input); }
    finally {
      this.nextWave = -1;
      this.spawnTimer = Number.isFinite(this.nextSpawnAt) ? Math.max(0, this.nextSpawnAt - this.time) : 0;
    }
    if (this.state !== 'playing') return;
    if (this.stage === 'breach' && this.time >= this.archiveReadUntil) this.openBreach();
    if(this.stage==='crossing'&&Math.hypot(this.player.x-LEVEL1.junction.x,this.player.z-LEVEL1.junction.z)<7){this.encounter=1;this.openBreach();}
    if (['combat','combat2'].includes(this.stage)) {
      if (this.toSpawn > 0 && this.time >= this.nextSpawnAt) this.spawnEnemy();
      if (this.spawned === ENCOUNTERS[this.encounter].length && this.toSpawn === 0 && this.enemies.length === 0) {
        this.activePortals = [];
        this.nextSpawnAt = Infinity;
        this.score += 300;
        this.event('clear', { wave: 1, campaign: true });
        this.event('portals', { count: 0, sites: [] });
        if(this.encounter===0){this.offerWeapon(1);this.setStage('crossing');}
        else this.setStage('exit');
      }
    }
  }

  snapshot() {
    return { ...super.snapshot(), mode: this.mode, maxLevel: 1, campaign: this.campaign };
  }
}
