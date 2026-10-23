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
  investigation: Object.freeze({ x:-21,z:20,y:0 }),
  junction: Object.freeze({ x:18,z:6,y:0 }),
  sabotage: Object.freeze({ x:5,z:-8,y:0 }),
  exit: Object.freeze({ x:18,z:-44,y:4.8 })
});

export const LEVEL1_ENCOUNTERS = Object.freeze([
  Object.freeze(['probe','stalker','scuttler','seer','stalker','probe','scuttler','seer']),
  Object.freeze(['synth','probe','scuttler','brute','stalker','listener','probe','seer']),
  Object.freeze(['probe','brute','listener','scuttler','synth','stalker','probe','bulwark'])
]);
const ENCOUNTERS=LEVEL1_ENCOUNTERS;
const OPENING_SITES=Object.freeze([
  {x:3,z:61,form:'probe'},{x:2.2,z:47,form:'stalker'},
  {x:-3,z:46,form:'scuttler'},{x:5,z:45,form:'synth'},
  {x:0,z:39,form:'stalker'},{x:4,z:34,form:'probe'},
  {x:-2,z:30,form:'stalker'},{x:5,z:25,form:'seer'}
]);
const MAX_ACTIVE=8;
const COMBAT_STAGES=['combat','combat2','combat3'];
const TOTAL_ENEMIES=OPENING_SITES.length+ENCOUNTERS.reduce((sum,wave)=>sum+wave.length,0);
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
    this.investigationRead = false;
    this.sabotaged = false;
    this.guideCache=null;this.guideNavigation=null;this.guideNavigationSource=null;
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
      'ORDRE surveille la rue des évacuations.',
      'Mon itinéraire est dans la boutique ouest.',
      `Cherche le vieux terminal hors réseau. — ${this.sibling}`
    ];
  }

  get campaign() {
    const text = {
      power: ['Le laboratoire abandonné', 'Rétablir le courant sur le boîtier de secours.'],
      archive: ['Un ordinateur du passé', 'Consulter le terminal local, isolé du réseau d’ORDRE.'],
      breach: [`Une trace de ${this.sibling}`, 'Une intervention récente confirme son passage. Lire l’archive.'],
      combat: ['Le signal a été repéré', 'Repousser les machines dans la cour du laboratoire.'],
      investigation: ['La mémoire de la boutique', 'Récupérer BLOOM puis lire l’ordinateur humain dans le bâtiment de briques à l’ouest.'],
      crossing: ['La rue des évacuations', 'Rejoindre le carrefour nord indiqué dans le journal humain.'],
      combat2: ['Le verrou d’ORDRE', 'Utiliser les couvertures de la rue pour éliminer la seconde patrouille.'],
      sabotage: ['Couper les yeux d’ORDRE', 'Désactiver la balise de surveillance dans la rue, à l’ouest du relais.'],
      combat3: ['Dernière ligne de défense', 'Repousser les renforts puis rejoindre le relais sur la terrasse.'],
      exit: ['Rejoindre les Archives végétales', 'Monter par l’escalier extérieur ou l’ascenseur, puis consulter le relais.'],
      complete: ['Niveau 1 terminé', `${this.sibling} est passé par les Archives végétales. La recherche continue.`]
    }[this.stage];
    const targets = {
      power: { id: 'power', label: 'RÉTABLIR LE COURANT', position: LEVEL1.power },
      archive: { id: 'archive', label: 'LIRE L’ARCHIVE', position: LEVEL1.archive },
      investigation: { id: 'investigation', label: 'CONSULTER LE JOURNAL HUMAIN', position: LEVEL1.investigation },
      sabotage: { id: 'sabotage', label: 'DÉSACTIVER LA BALISE ORDRE', position: LEVEL1.sabotage },
      exit: { id: 'exit', label: 'CONSULTER LE RELAIS', position: LEVEL1.exit }
    };
    const target = targets[this.stage];
    return {
      id: LEVEL1.id, level: 1, name: LEVEL1.name, stage: this.stage,
      title: text[0], subtitle: text[1], characterId: this.characterId,
      sibling: this.sibling, archive: this.archiveLines,
      objective: target ? { ...target, position: { ...target.position } } : null,
      encounter:this.encounter+1,encounters:ENCOUNTERS.length,spawned:this.spawned+ENCOUNTERS.slice(0,this.encounter).reduce((sum,wave)=>sum+wave.length,0)+(this.openingSpawned||0),total:TOTAL_ENEMIES,opening:this.openingSpawned||0,maxActive:MAX_ACTIVE,
      investigationRead:this.investigationRead,sabotaged:this.sabotaged,
      remaining: this.toSpawn + this.enemies.length,
      portal: this.activePortals[0] ? { ...this.activePortals[0] } : null,
      completed: this.completed
    };
  }

  setStage(stage) {
    this.stage = stage;this.guideCache=null;
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
      this.protectReading(5);
      this.archiveReadUntil = this.time + 5;
      this.setStage('breach');
    } else if (objective.id === 'investigation') {
      this.investigationRead=true;this.protectReading(5);this.setStage('crossing');
    } else if (objective.id === 'sabotage') {
      // Do not consume the action until a remote, navigable breach is available.
      this.encounter=2;
      if(!this.openBreach())return false;
      this.sabotaged=true;
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

  protectReading(seconds) {
    this.invulnerable=Math.max(this.invulnerable,seconds);
    for(const e of this.enemies)e.stunnedUntil=Math.max(e.stunnedUntil||0,this.time+seconds);
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
    this.setStage(COMBAT_STAGES[this.encounter]);
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
      ranged: probe || ['seer','brute','listener','bulwark','synth'].includes(form), hp: enemyDurability(1+this.encounter, form, false),
      aimHeight: probe ? PROBE.aimHeight : form === 'scuttler' ? .88 : ['seer','listener'].includes(form) ? 1.38 : ['brute','bulwark'].includes(form)?1.42:1.15,
      radius: probe ? PROBE.radius : form === 'scuttler' ? .86 : form==='bulwark'?.95:.8,
      hitRadius: probe ? .44 : form === 'scuttler' ? .91 : form === 'seer' ? .94 : 1.05,
      speed: probe ? 3.67 : form === 'scuttler' ? 2.68 : form==='bulwark'?1.8:2.4,
      tier: 1+this.encounter, limpUntil: 0, stunnedUntil: 0,
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
    const sites=OPENING_SITES;
    for(let i=this.openingSpawned;i<sites.length;i++){
      const site=sites[i];if(!this.portalIsClear(site))break;
      const e=this.makeEnemy(site.form,{...site,id:0,yaw:0});
      Object.assign(e,{opening:true,awareness:'patrol',lastKnownX:site.x,lastKnownZ:site.z,lastKnownHeight:0,alertedUntil:0,stunnedUntil:this.time+3});
      this.enemies.push(e);this.openingSpawned++;
    }
  }

  spawnEnemy() {
    if (this.state !== 'playing' || !COMBAT_STAGES.includes(this.stage) || this.toSpawn <= 0
      || this.enemies.length>=MAX_ACTIVE || this.spawned >= ENCOUNTERS[this.encounter].length || this.time + 1e-8 < this.nextSpawnAt) return false;
    const site = this.activePortals[0];
    if (!site || !this.portalIsClear(site)) return false;
    const form = ENCOUNTERS[this.encounter][this.spawned], probe = form === 'probe';
    const enemy=this.makeEnemy(form,site);
    this.enemies.push(enemy);
    this.spawned++;
    this.toSpawn--;
    // The probe establishes the threat before the ground patrol emerges.
    this.nextSpawnAt = this.time + (this.spawned === 1 ? 3.5 : 2.4);
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
    if (COMBAT_STAGES.includes(this.stage)) {
      if (this.toSpawn > 0 && this.time >= this.nextSpawnAt) this.spawnEnemy();
      if (this.spawned === ENCOUNTERS[this.encounter].length && this.toSpawn === 0 && this.enemies.length === 0) {
        this.activePortals = [];
        this.nextSpawnAt = Infinity;
        this.score += 300;
        this.event('clear', { wave: 1, campaign: true });
        this.event('portals', { count: 0, sites: [] });
        if(this.encounter===0){this.offerWeapon(1);this.setStage('investigation');}
        else if(this.encounter===1){this.offerWeapon(2);this.setStage('sabotage');}
        else this.setStage('exit');
      }
    }
  }

  objectiveTarget() {
    if(this.state!=='playing'||this.completed)return null;
    const offer=this.weaponOffers.find(o=>!this.ownedWeapons.has(o.index));
    if(offer)return {x:offer.x,z:offer.z,y:offer.elevation,id:'weapon-'+offer.index,label:'RÉCUPÉRER L’ÉQUIPEMENT',kind:'weapon'};
    const objective=this.campaign.objective;
    if(objective)return {...objective.position,id:objective.id,label:objective.label,kind:'objective'};
    if(this.stage==='breach')return {...LEVEL1.archive,id:'archive',label:'LIRE LE JOURNAL',kind:'objective'};
    if(this.stage==='crossing')return {...LEVEL1.junction,id:'junction',label:'REJOINDRE LE CARREFOUR',kind:'route'};
    if(COMBAT_STAGES.includes(this.stage)){
      const enemy=this.enemies.reduce((best,e)=>!best||Math.hypot(e.x-this.player.x,e.z-this.player.z)<Math.hypot(best.x-this.player.x,best.z-this.player.z)?e:best,null);
      if(enemy)return {x:enemy.x,z:enemy.z,y:enemy.homeHeight||0,id:`enemy-${enemy.id}`,label:'NEUTRALISER LA PATROUILLE',kind:'enemy'};
      const portal=this.activePortals[0];
      if(portal)return {x:portal.x,z:portal.z,y:0,id:`portal-${portal.id}`,label:'RENFORTS ORDRE',kind:'portal'};
    }
    return null;
  }

  guidance() {
    const final=this.objectiveTarget();if(!final)return null;
    const p=this.player,cache=this.guideCache;
    if(cache&&cache.source===this.navigation&&cache.id===final.id&&cache.stage===this.stage&&this.time<cache.until&&Math.hypot(p.x-cache.x,p.z-cache.z)<1)return cache.result;
    let target={...final},kind=final.kind;
    // A ground route cannot instruct the player to walk through an upper deck.
    // Guide to the real stair entrance, then up successive points on its slope.
    if(final.y>p.elevation+.6){
      const stair=LEVEL1_MAP.stairs[0],onStair=Math.abs(p.x-stair.x)<stair.halfWidth-.3&&p.z<=stair.bottomZ+2&&p.z>=stair.topZ-1;
      const z=onStair?Math.max(stair.topZ,p.z-6):stair.bottomZ+1.2;
      target={...target,x:stair.x,z,y:this.surfaceHeight(stair.x,z,this.time,stair.height)};kind='route';
    }
    const clear=(point)=>{
      const from={x:p.x,y:p.elevation+1.1,z:p.z},to={x:point.x,y:point.y+1.1,z:point.z};
      return !this.obstacles.some(b=>!b.walkableSurface&&b.campaignTerminal!==final.id&&segmentBox(from,to,{...b,hx:b.hx+.55,hz:b.hz+.55})!==null);
    };
    if(!clear(target)){
      if(this.guideNavigationSource!==this.navigation){this.guideNavigation=new this.navigation.constructor(this.obstacles);this.guideNavigationSource=this.navigation;}
      const nav=this.guideNavigation;nav.update(target,this.time);
      const waypoint=nav.waypoint({...p,radius:.55});
      if(!waypoint){this.guideCache=null;return null;}
      const point={...waypoint,y:this.surfaceHeight(waypoint.x,waypoint.z,this.time,p.elevation+.55)};
      // No fallback arrow through a wall: retain only a verified clear segment.
      if(!clear(point)){this.guideCache=null;return null;}
      target={...target,...point};kind='route';
    }
    const result={x:target.x,y:target.y,z:target.z,id:final.id,label:final.label,kind,stage:this.stage,
      distance:Math.hypot(target.x-p.x,target.z-p.z),target:{x:final.x,y:final.y,z:final.z}};
    this.guideCache={source:this.navigation,id:final.id,stage:this.stage,x:p.x,z:p.z,until:this.time+.25,result};
    return result;
  }

  snapshot() {
    return { ...super.snapshot(), mode: this.mode, maxLevel: 1, campaign: this.campaign };
  }
}
