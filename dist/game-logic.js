import {tacticalOrder,grenadeAvoidance} from './tactical-enemies.js';
import {squadOrder,relayVisualContact,clearSquadFiringLane,registerIncomingFire} from './enemy-squads.js';
import { equipmentForLevel } from './equipment.js';
import { PLATFORMS, STAIRS, LIFTS, BRIDGES, BRIDGE_APPROACHES, insideSurface, traversalSurfaces, liftHeightAt } from './world-layout.js';
import { PROBE, updateProbe } from './aerial-probes.js';
import { NOISE_RADIUS, SHOT_RADIUS, propagateNoise, soundWaypoint } from './hearing.js';
import { tryJump } from './locomotion.js';
import { hostileShotProfile, predictShot } from './enemy-fire.js';
import { enemyDurability, enemyVolley, rangedMuzzle, enemyScale } from './enemy-combat.js';
import { sweepBlade, bladeBulletContact, reflectedVelocity } from './blade-combat.js';
// World units are metres. The playable arena is exactly 200 × 200 m.
export const ARENA_SIZE = 200;
export const PORTAL = Object.freeze({ x: 0, z: -20 });
// Breach sites are spread around the city. Only collision-free ones can open.
export const PORTAL_SITES = Object.freeze([
  PORTAL,{x:-58,z:-17},{x:57,z:-13},{x:-72,z:63},{x:73,z:77},
  {x:40,z:-76},{x:-43,z:-78},{x:6,z:84},{x:-81,z:-47},{x:80,z:-52},
  {x:-50,z:72},{x:41,z:41},{x:6,z:-52},{x:-82,z:12}
].map(point=>Object.freeze({...point})));
export function chooseWavePortals(obstacles=[],random=Math.random,wave=1,player={x:0,z:22},time=0) {
  const count=wave<3?1:wave<6?2:wave<11?3:wave<16?4:5;
  const available=PORTAL_SITES.filter(p=>
    Math.hypot(p.x-player.x,p.z-player.z)>17 &&
    obstacles.every(b=>(b.walkableSurface&&!b.traversal)||Math.abs(p.x-b.x)>b.hx+9||Math.abs(p.z-b.z)>b.hz+8)
  );
  if(!available.length)available.push(PORTAL);
  const chosen=[];
  while(chosen.length<count&&available.length) {
    const index=Math.min(available.length-1,Math.floor(Math.min(.999999,Math.max(0,random()))*available.length));
    const [point]=available.splice(index,1);
    const yaw=Math.atan2(player.x-point.x,player.z-point.z);
    chosen.push({id:wave*10+chosen.length,x:point.x,z:point.z,yaw,
      openedAt:time+(chosen.length===0?0:Math.min(3,(chosen.length-1)*1.45 + random()*.65))});
  }
  return chosen;
}
export const MAX_LEVEL = 20;
export const MAX_ACTIVE_ENEMIES = 18;
// Engaged melee units within PACK_RANGE of the player share out slots round it (keeping their angular order), so
// they flank instead of queuing; a shooter closer than RANGED_RETREAT backs away while firing.
export const PACK_RANGE = 7, SLOT_RADIUS = 1.3, RANGED_RETREAT = 9;
// Survival kill streaks: each kill within COMBO_WINDOW of the previous one raises the multiplier by a quarter, up
// to double points. The first kill of a streak scores as usual.
export const COMBO_WINDOW = 4, PICKUP_LIFE = 14, PICKUP_RADIUS = 1.2, PICKUP_HEAL = 35, MAX_PICKUPS = 4;
export const comboMultiplier = count => 1 + Math.min(4, Math.max(0, count - 1)) * .25;
export function meleePack(enemies, player) {
  const slots = new Map(), members = enemies.filter(e => e.form !== 'probe' && !e.ranged && e.awareness === 'engaged'
    && Math.abs((e.elevation || 0) - (player.elevation || 0)) < .5 && Math.hypot(e.x - player.x, e.z - player.z) < PACK_RANGE);
  if (members.length < 2) return slots;
  const bearing = e => Math.atan2(e.x - player.x, e.z - player.z);
  let sx = 0, sz = 0; for (const e of members) { sx += Math.sin(bearing(e)); sz += Math.cos(bearing(e)); }
  const centre = Math.atan2(sx, sz), offset = e => Math.atan2(Math.sin(bearing(e) - centre), Math.cos(bearing(e) - centre));
  members.sort((a, b) => offset(a) - offset(b) || a.id - b.id);
  const spacing = Math.min(1.1, Math.PI * 2 / members.length);
  members.forEach((e, i) => { const a = centre + (i - (members.length - 1) / 2) * spacing;
    slots.set(e, { x: player.x + Math.sin(a) * SLOT_RADIUS, z: player.z + Math.cos(a) * SLOT_RADIUS }); });
  return slots;
}
export const REGEN_DELAY = 5;
export const CATWALK = Object.freeze({ x: 22.4, halfWidth: 2, end: 20, landing: 8, height: 1.58 });
export const WEAPONS = Object.freeze([
  Object.freeze({ id: 'r9', name: 'R–9', label: 'Pistolet laser', level: 1, damage: 24, capacity: 12, interval: .2, reload: 1.25, speed: 110, pellets: 1, spread: 0, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'bloom', name: 'BLOOM', label: 'Mitraillette laser', level: 3, damage: 34, capacity: 24, interval: .11, reload: 1.7, speed: 135, pellets: 1, spread: .009, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'lance', name: 'LANCE', label: 'Sniper photonique', level: 5, damage: 160, capacity: 5, interval: .85, reload: 2.15, speed: 280, pellets: 1, spread: 0, semiAuto:true, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'thorn', name: 'THORN', label: 'Canon à rail', level: 7, damage: 190, capacity: 6, interval: .28, reload: 2.1, speed: 200, pellets: 1, spread: 0, chargeTime: .7, splash: 1.8 }),
  Object.freeze({ id: 'nova', name: 'NOVA', label: 'Canon à énergie', level: 9, damage: 340, capacity: 4, interval: .4, reload: 2.4, speed: 80, pellets: 1, spread: 0, chargeTime: 1.05, splash: 5 }),
  Object.freeze({ id:'aurora',name:'AURORA',label:'Sabre à énergie',level:2,damage:155,capacity:0,interval:.48,reload:0,speed:0,pellets:0,spread:0,semiAuto:true,chargeTime:0,splash:0,melee:true }),
  Object.freeze({id:'m12',name:'M–12',label:'Fusil à pompe',level:4,damage:18,capacity:8,interval:.88,reload:2.8,speed:170,pellets:8,spread:.038,semiAuto:true,chargeTime:0,splash:0,falloffStart:12,falloffEnd:40,minDamage:.2}),
  Object.freeze({id:'duor9',name:'R–9 DUO',label:'Doubles pistolets laser',level:1,damage:24,capacity:24,handCapacity:12,interval:.2,reload:1.65,speed:110,pellets:1,spread:0,chargeTime:0,splash:0,dual:true})
]);
export const starterWeaponIndex=characterId=>characterId==='lylu'?6:7;
export function projectileDamage(b,at){
 const w=WEAPONS.find(w=>w.id===b.weapon);if(!w?.falloffStart)return b.damage;
 const distance=Math.hypot(at.x-(b.originX??b.x),at.y-(b.originY??b.y),at.z-(b.originZ??b.z));
 const t=clamp((distance-w.falloffStart)/(w.falloffEnd-w.falloffStart),0,1);
 return b.damage*(1-t*(1-w.minDamage));
}
// Low enough to hide behind, tall enough to stop standing-height shots.
export const COVER_WALLS = Object.freeze([
  { x: -5.6, z: 14, hx: 4, hz: .55, height: 2.65 },
  { x: 5.6, z: 29, hx: 4, hz: .55, height: 2.65 },
  { x: -11, z: 24, hx: .55, hz: 4.5, height: 2.65 },
  { x: 11, z: 4, hx: .55, hz: 4.5, height: 2.65 },
  { x: -9, z: -3, hx: 4.5, hz: .55, height: 2.65 },
  { x: 9, z: -37, hx: 4.5, hz: .55, height: 2.65 },
  { x: 28, z: 31, hx: 4.5, hz: .55, height: 2.65 },
  { x: -34, z: 39, hx: .55, hz: 5, height: 2.65 }
].map(b => Object.freeze({ ...b, cover: true })));
// Smoothly follows the stair treads so the player and camera rise onto the deck.
export function walkSurfaceHeight(x, z, time=0, maxHeight=Infinity) {
  const heights=[0,...traversalSurfaces(x,z,time).map(s=>s.height)];
  if(Math.abs(x-CATWALK.x)<=CATWALK.halfWidth && Math.abs(z)<=CATWALK.end)
    heights.push(Math.abs(z)>CATWALK.landing ? CATWALK.height*(CATWALK.end-Math.abs(z))/(CATWALK.end-CATWALK.landing) : CATWALK.height);
  return Math.max(0,...heights.filter(height=>height<=maxHeight+.001));
}
export const levelCount = level => Math.min(128,5 + (Math.max(1,Math.floor(level)) - 1) * 3);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function segmentSphere(start, end, center, radius) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const ox = start.x - center.x, oy = start.y - center.y, oz = start.z - center.z;
  const a = dx * dx + dy * dy + dz * dz;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c <= 0) return 0;
  if (a < 1e-12) return null;
  const b = 2 * (ox * dx + oy * dy + oz * dz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function segmentBox(start, end, box) {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'y', 'z']) {
    const min = axis === 'y' ? (box.y || 0) : box[axis] - box[axis === 'x' ? 'hx' : 'hz'];
    const max = axis === 'y' ? (box.y || 0) + box.height : box[axis] + box[axis === 'x' ? 'hx' : 'hz'];
    const d = end[axis] - start[axis];
    if (Math.abs(d) < 1e-10) { if (start[axis] < min || start[axis] > max) return null; }
    else { const a = (min - start[axis]) / d, b = (max - start[axis]) / d; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); if (lo > hi) return null; }
  }
  return lo >= 0 && lo <= 1 ? lo : null;
}

export function moveInArena(entity, dx, dz, radius, obstacles) {
  const edge = ARENA_SIZE / 2 - radius - 1;
  let x = clamp(entity.x + dx, -edge, edge), z = entity.z;
  for (const b of obstacles) {
    if (b.walkableSurface || ((entity.elevation||0) >= (b.y||0)+b.height-.02) || ((entity.elevation||0)+(entity.crouched?.95:1.8) < (b.y||0))) continue;
    const near=b.x-b.hx-radius,far=b.x+b.hx+radius;
    const crosses=(x>near&&x<far)||(dx>0&&entity.x<=near&&x>=near)||(dx<0&&entity.x>=far&&x<=far);
    if (z > b.z - b.hz - radius && z < b.z + b.hz + radius && crosses) {
      x = dx > 0 ? b.x - b.hx - radius : dx < 0 ? b.x + b.hx + radius : x;
    }
  }
  z = clamp(entity.z + dz, -edge, edge);
  for (const b of obstacles) {
    if (b.walkableSurface || ((entity.elevation||0) >= (b.y||0)+b.height-.02) || ((entity.elevation||0)+(entity.crouched?.95:1.8) < (b.y||0))) continue;
    const near=b.z-b.hz-radius,far=b.z+b.hz+radius;
    const crosses=(z>near&&z<far)||(dz>0&&entity.z<=near&&z>=near)||(dz<0&&entity.z>=far&&z<=far);
    if (x > b.x - b.hx - radius && x < b.x + b.hx + radius && crosses) {
      z = dz > 0 ? b.z - b.hz - radius : dz < 0 ? b.z + b.hz + radius : z;
    }
  }
  entity.x = clamp(x, -edge, edge); entity.z = clamp(z, -edge, edge);
}

// Zoned raycast keeps head / torso / extremities distinct in 3D, including in WebXR.
// Old simulation fixtures (without a 'form') retain the original single hit sphere.
export function traceEnemyHit(start, end, enemy) {
  const height=enemy.elevation||0;
  if(!enemy.form) {
    const t=segmentSphere(start,end,{x:enemy.x,y:height+(enemy.aimHeight||1.15),z:enemy.z},enemy.hitRadius||1.05);
    return t===null?null:{t,zone:'torso',multiplier:1};
  }
  const elite=enemyScale(enemy.form,enemy.elite)*(enemy.roomScale||1);
  const yaw=enemy.yaw||0,cos=Math.cos(yaw),sin=Math.sin(yaw);
  const crawl=enemy.form==='scuttler';
  const zones=enemy.form==='probe'?[
    ['head',0,.55,-.48,.18,2.4],['torso',0,.55,0,.44,1],
    ['limb',-.61,.49,-.42,.24,.7],['limb',.61,.49,-.42,.24,.7],
    ['limb',-.61,.49,.42,.24,.7],['limb',.61,.49,.42,.24,.7]
  ]:crawl?[
    ['head',0,.85,-.44,.28,2.1],
    ['torso',0,.79,.07,.51,1],
    ['limb',-.61,.43,.14,.28,.65],['limb',.61,.43,.14,.28,.65]
  ]:[
    ['head',0,1.88,-.05,.28,2.2],
    ['torso',0,1.27,0,.54,1],
    ['limb',-.54,1.22,0,.23,.65],['limb',.54,1.22,0,.23,.65],
    ['limb',-.2,.55,0,.29,.65],['limb',.2,.55,0,.29,.65]
  ];
  if(enemy.form==='bulwark')for(const zone of zones)if(zone[0]==='limb'&&zone[2]>1){zone[1]=Math.sign(zone[1])*.74;zone[2]=1.15;zone[3]=-.18;zone[4]=.34;}
  let best=null;
  for(const [zone,ox,oy,oz,r,multiplier] of zones) {
    const lowered=oy-(enemy.coverCrouch||0)*(oy>1?.52:.16);
    const hit=segmentSphere(start,end,{x:enemy.x+(ox*cos+oz*sin)*elite,y:height+lowered*elite,z:enemy.z+(-ox*sin+oz*cos)*elite},r*elite);
    if(hit!==null && (best===null || hit<best.t))best={t:hit,zone,multiplier:multiplier*(enemy.form==='bulwark'&&zone==='torso'?.72:1)};
  }
  return best;
}

// A shared navigation field lets a crowd actually go around cover. Rebuilding it
// twice per second costs far less than finding a separate path for each monster.
class CoverNavigation {
  constructor(obstacles) {
    this.size = 99; this.cell = 2; this.edge = -98; this.obstacles = obstacles;
    this.solid = new Uint8Array(this.size * this.size); this.distance = new Int16Array(this.solid.length);
    this.queue = new Int32Array(this.solid.length); this.refreshAt = -1; this.goal = -1;
    const groundSolids=obstacles.filter(b=>!b.walkableSurface&&(b.y||0)<2);
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      const wx = this.edge + x * 2, wz = this.edge + z * 2;
      this.solid[z * this.size + x] = groundSolids.some(b => Math.abs(wx-b.x) < b.hx+1.3 && Math.abs(wz-b.z) < b.hz+1.3) ? 1 : 0;
    }
  }
  point(index) { return { x: this.edge + index % this.size * 2, z: this.edge + Math.floor(index / this.size) * 2 }; }
  index(x, z) { return clamp(Math.round((z-this.edge)/2),0,this.size-1)*this.size + clamp(Math.round((x-this.edge)/2),0,this.size-1); }
  neighbours(index) {
    const x=index%this.size,z=Math.floor(index/this.size), result=[];
    if(x>0)result.push(index-1);if(x<this.size-1)result.push(index+1);
    if(z>0)result.push(index-this.size);if(z<this.size-1)result.push(index+this.size);
    return result;
  }
  nearestOpen(x, z) {
    const base=this.index(x,z);if(!this.solid[base])return base;
    let best=-1,cost=Infinity;
    for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){
      const xx=base%this.size+dx,zz=Math.floor(base/this.size)+dz;
      if(xx<0||zz<0||xx>=this.size||zz>=this.size)continue;
      const index=zz*this.size+xx;if(this.solid[index])continue;
      const p=this.point(index),d=Math.hypot(p.x-x,p.z-z);if(d<cost){best=index;cost=d;}
    }
    return best;
  }
  update(player, time) {
    if(time<this.refreshAt)return;this.refreshAt=time+.5;
    const goal=this.nearestOpen(player.x,player.z);if(goal===this.goal)return;this.goal=goal;
    this.distance.fill(-1);if(goal<0)return;
    let read=0,write=1;this.queue[0]=goal;this.distance[goal]=0;
    while(read<write){const index=this.queue[read++];for(const next of this.neighbours(index))if(!this.solid[next]&&this.distance[next]<0){this.distance[next]=this.distance[index]+1;this.queue[write++]=next;}}
  }
  waypoint(enemy) {
    let index=this.nearestOpen(enemy.x,enemy.z);if(index<0||this.distance[index]<0)return null;
    let target=this.point(index);
    // Look ahead only along segments that clear the monster's entire body.
    for(let n=0;n<5;n++){
      const options=this.neighbours(index).filter(i=>this.distance[i]>=0&&this.distance[i]<this.distance[index]);
      if(!options.length)break;
      options.sort((a,b)=>this.distance[a]-this.distance[b] || Math.hypot(this.point(a).x-enemy.x,this.point(a).z-enemy.z)-Math.hypot(this.point(b).x-enemy.x,this.point(b).z-enemy.z));
      const next=options[0],p=this.point(next),start={x:enemy.x,y:1,z:enemy.z},end={...p,y:1};
      if(this.obstacles.some(b=>!b.walkableSurface&&segmentBox(start,end,{...b,hx:b.hx+enemy.radius+.08,hz:b.hz+enemy.radius+.08})!==null))break;
      target=p;index=next;
    }
    return target;
  }
}

// All three approach ramps share grounded navigation and obstacle avoidance.
const ELEVATED_ROUTES=[...STAIRS,...BRIDGE_APPROACHES];
export function elevatedRouteForSurface(id,x=0) {
  if(['garden','garden-link','garden-deck'].includes(id))return 'garden-stairs';
  if(['relay','relay-link','relay-deck'].includes(id))return 'relay-stairs';
  if(['ruin-deck','ruin-approach'].includes(id))return 'ruin-approach';
  // A broken crossing never creates an imaginary traversable shortcut.
  if(id==='ruin-link')return x< -15.7?'garden-stairs':'ruin-approach';
  return null;
}
// Enemy navigation must never treat an intentionally destroyed span as solid.
// Falling from a 5m high bridge to pursue the opposite bank is not tactical AI.
export function brokenBridgeDetour(enemy,player) {
  for(const bridge of BRIDGES){
    if(!bridge.damage)continue;
    if((enemy.elevation||0)<bridge.height-.38||(player.elevation||0)<bridge.height-.38)continue;
    if(Math.abs(enemy.z-bridge.z)>bridge.halfWidth+.7||Math.abs(player.z-bridge.z)>bridge.halfWidth+.7)continue;
    const start=bridge.x1+(bridge.x2-bridge.x1)*bridge.gapFrom;
    const end=bridge.x1+(bridge.x2-bridge.x1)*bridge.gapTo;
    if(enemy.x<start-.15&&player.x>end+.15)return 'garden-stairs';
    if(enemy.x>end+.15&&player.x<start-.15)return 'ruin-approach';
  }
  return null;
}
export class ArenaGame {
  constructor(obstacles = [], random = Math.random, traversal = null, characterId='ghju') { this.traversal=traversal;this.routes=traversal?.routes||ELEVATED_ROUTES;this.lifts=traversal?.lifts||LIFTS;this.obstacles = obstacles; this.random = random; this.navigation = new CoverNavigation(obstacles); this.stairNavigation=this.routes.map(()=>new CoverNavigation(obstacles)); this.reset(characterId); }
  replaceObstacles(obstacles) {
    // Renderer recovery / entering WebXR rebuilds the scene. Keep aiming and
    // simulation on the same moving lift and gate colliders after that switch.
    this.obstacles=obstacles;this.updateLifts(this.time);
    this.navigation=new CoverNavigation(obstacles);this.stairNavigation=this.routes.map(()=>new CoverNavigation(obstacles));
    this.searchFields=new Map();
  }
  reset(characterId=this.characterId||'ghju') {
    this.companionAmplifyUntil=0;this.companionHazards=[];this.companionWard=null;
    this.searchFields=new Map();
    this.navigation.refreshAt = -1; this.navigation.goal = -1;
    this.player = { x: 0, z: 22, elevation: 0, hp: 100, yaw: 0, verticalSpeed: 0, grounded: true, jumpHeld: false, crouched:false,airJumps:0,jumpImpulseX:0,jumpImpulseZ:0,lastGroundedAt:0 };
    this.playerVelocity={x:0,y:0,z:0};
    this.bladePrevious=null;this.bladeHitTimes=new Map();this.bladeSlashAt=-99;this.bladeSlashSide=1;this.bladeSpeed=0;this.bladeGuard=false;this.bladeHumAt=0;
    this.enemies = []; this.bullets = []; this.events = [];
    this.wave = 0; this.score = 0; this.kills = 0; this.time = 0;
    this.combo = 0; this.comboUntil = -1; this.bestCombo = 0; this.pickups = [];
    this.endless=false;this.footstepDistance=0;
    this.state = 'playing'; this.cooldown = 0; this.invulnerable = 0;
    this.nextWave = .75; this.spawnTimer = 0; this.toSpawn = 0; this.nextId = 1;
    this.activePortals=[];
    this.characterId=characterId==='lylu'?'lylu':'ghju';
    this.weaponIndex = starterWeaponIndex(this.characterId); this.ammo = WEAPONS.map(w => w.capacity);
    this.dual={ammo:{left:12,right:12},readyAt:{left:0,right:0},shotAt:{left:-Infinity,right:-Infinity},held:{left:false,right:false},next:'right',flatAt:0};
    this.ownedWeapons = new Set([this.weaponIndex,0]); this.weaponOffers = [];
    this.reloadRemaining = 0; this.charge = 0; this.triggerHeld = false; this.semiPending=false;
    this.lastDamage = 0; this.regenerating = false;
    for(const nav of this.stairNavigation){nav.refreshAt=-1;nav.goal=-1;}
    this.updateLifts(0);
  }
  surfacesAt(x,z,time=this.time) { return this.traversal?.surfaces(x,z,time)||traversalSurfaces(x,z,time); }
  surfaceHeight(x,z,time=this.time,max=Infinity) { return this.traversal?.height(x,z,time,max)??walkSurfaceHeight(x,z,time,max); }
  routeForSurface(id,x=0) { return this.traversal?.routeForSurface(id,x)??elevatedRouteForSurface(id,x); }
  updateLifts(previousTime) {
    for(const lift of this.lifts){
      const height=liftHeightAt(lift,this.time),delta=height-liftHeightAt(lift,previousTime);
      for(const entity of [this.player,...this.enemies])if(entity.onLift===lift.id && entity.grounded && insideSurface(entity.x,entity.z,lift))entity.elevation+=delta;
      for(const obstacle of this.obstacles){
        if(obstacle.liftId===lift.id && obstacle.walkableSurface)obstacle.y=height-obstacle.height;
        if(obstacle.liftGateId===lift.id){const open=Math.abs(height-obstacle.gateFloor)<.08;obstacle.y=obstacle.gateFloor+(open?2.4:0);obstacle.height=open?.18:1.15;}
      }
    }
  }
  settle(entity,dt,isPlayer=false) {
    const previous=entity.elevation||0;
    let floor=this.surfaceHeight(entity.x,entity.z,this.time,previous+.3);
    for(const b of this.obstacles){
      const top=(b.y||0)+b.height;
      if(!b.walkableSurface && b.height<=1.35 && top<=previous+.12 && Math.abs(entity.x-b.x)<b.hx && Math.abs(entity.z-b.z)<b.hz)floor=Math.max(floor,top);
    }
    if(entity.grounded && previous-floor>.32){entity.grounded=false;entity.verticalSpeed=0;}
    if(entity.grounded){entity.elevation=floor;entity.verticalSpeed=0;}
    else{
      entity.verticalSpeed=Math.max(-18,(entity.verticalSpeed||0)-18*dt);
      entity.elevation=previous+entity.verticalSpeed*dt;
      const bodyHeight=entity.crouched?.95:1.8;
      if(entity.verticalSpeed>0)for(const b of this.obstacles){
        const underside=b.y||0;
        if(b.walkableSurface && Math.abs(entity.x-b.x)<b.hx && Math.abs(entity.z-b.z)<b.hz && previous+bodyHeight<=underside && entity.elevation+bodyHeight>underside){entity.elevation=underside-bodyHeight;entity.verticalSpeed=0;}
      }
      if(entity.elevation<=floor){entity.elevation=floor;entity.verticalSpeed=0;entity.grounded=true;if(isPlayer)this.event('land');}
    }
    entity.onLift=null;
    if(entity.grounded)for(const l of this.lifts)if(insideSurface(entity.x,entity.z,l) && Math.abs(entity.elevation-liftHeightAt(l,this.time))<.025){entity.onLift=l.id;break;}
  }
  get equipment() { return equipmentForLevel(this.wave); }
  get weapon() { return WEAPONS[this.weaponIndex]; }
  get nextDualHand(){const hand=this.dual.next,other=hand==='right'?'left':'right';return this.dual.ammo[hand]>0&&this.time>=this.dual.readyAt[hand]?hand:this.dual.ammo[other]>0&&this.time>=this.dual.readyAt[other]?other:hand;}
  refillWeapon(){this.ammo[this.weaponIndex]=this.weapon.capacity;if(this.weapon.dual)this.dual.ammo={left:12,right:12};}
  restoreDualAmmo(saved){
    const total=clamp(Math.floor(Number(this.ammo[7])||0),0,24);
    const valid=['left','right'].every(hand=>Number.isInteger(saved?.[hand])&&saved[hand]>=0&&saved[hand]<=12)&&saved.left+saved.right===total;
    this.dual.ammo=valid?{...saved}:{left:Math.floor(total/2),right:Math.ceil(total/2)};
  }
  get unlockedWeapons() { return WEAPONS.filter((w,i) => this.ownedWeapons.has(i)); }
  event(type, data = {}) { this.events.push({ type, ...data }); }
  emitNoise(kind,radius,position={x:this.player.x,y:this.player.elevation+1,z:this.player.z}) {
    const heard=propagateNoise(this.enemies,{...position,elevation:this.player.elevation,kind,radius},this.obstacles,segmentBox,this.time);
    for(const listener of this.enemies)if(listener.form==='listener'&&heard.includes(listener.id)&&this.time>=(listener.relayAt||0)){
      listener.relayAt=this.time+4;listener.listenerPulseUntil=this.time+.6;
      for(const ally of this.enemies)if(ally.id!==listener.id&&ally.awareness!=='engaged'&&Math.hypot(ally.x-listener.x,ally.z-listener.z)<18){
        ally.awareness='search';ally.lastKnownX=position.x;ally.lastKnownZ=position.z;
        ally.lastKnownHeight=this.player.elevation;ally.alertedUntil=Math.max(ally.alertedUntil||0,this.time+4);
      }
      this.event('enemy-scan',{x:listener.x,y:listener.elevation+1.8,z:listener.z});
    }
    if(heard.length)this.event('heard',{kind,ids:heard,position:{...position}});
    return heard;
  }
  startEndless() {
    if(this.state!=='won')return false;
    this.endless=true;this.state='playing';this.nextWave=4;this.player.hp=100;
    this.event('survival');return true;
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
  blocked(start, end) { return this.obstacles.some(b => segmentBox(start, end, b) !== null); }
  selectWeapon(index) {
    if (this.state !== 'playing' || !WEAPONS[index] || !this.ownedWeapons.has(index) || index === this.weaponIndex) return false;
    this.weaponIndex = index; this.reloadRemaining = 0; this.charge = 0; this.triggerHeld = false; this.semiPending=false;
    this.dual.held={left:false,right:false};
    this.bladePrevious=null;this.bladeHitTimes.clear();this.bladeSlashAt=-99;this.bladeSpeed=0;this.bladeGuard=false;
    this.cooldown = Math.max(this.cooldown, .25); this.event('weapon', { index, name: this.weapon.name }); return true;
  }
  cycleWeapon(direction = 1) {
    const slots=WEAPONS.map((_,index)=>this.ownedWeapons.has(index)?index:-1).filter(index=>index>=0);
    if(slots.length<2)return false;
    const at=slots.indexOf(this.weaponIndex),offset=direction<0?-1:1;
    return this.selectWeapon(slots[(Math.max(0,at)+offset+slots.length)%slots.length]);
  }
  // Weapons rise from a tactical holographic pedestal. Acquiring one is a deliberate action.
  offerWeapon(index) {
    if(this.ownedWeapons.has(index)||this.weaponOffers.some(offer=>offer.index===index))return;
    const p=this.player;
    // Candidate pedestals are just ahead or to the side of the player,
    // on open ground and within their immediate line of sight.
    const dirX=Math.sin(p.yaw||0),dirZ=-Math.cos(p.yaw||0);
    const offsets=[[0,4],[2.6,3],[-2.6,3],[4,1],[-4,1],[0,-4],[5,-3],[-5,-3]];
    const candidates=offsets.map(([side,forward])=>({
      x:clamp(p.x+dirX*forward+dirZ*side,-94,94),
      z:clamp(p.z+dirZ*forward-dirX*side,-94,94)
    }));
    const clear=point=>this.obstacles.every(b=>b.walkableSurface||
      Math.abs(point.x-b.x)>b.hx+1.4||Math.abs(point.z-b.z)>b.hz+1.4);
    const chosen=candidates.find(point=>clear(point)&&!this.blocked(
      {x:p.x,y:p.elevation+1.5,z:p.z},
      {x:point.x,y:this.surfaceHeight(point.x,point.z,this.time,p.elevation+.3)+1.7,z:point.z}
    ))||candidates.find(clear)||{x:p.x,z:p.z};
    const offer={index,x:chosen.x,z:chosen.z,elevation:this.surfaceHeight(chosen.x,chosen.z,this.time,p.elevation+.3),createdAt:this.time};
    this.weaponOffers.push(offer);this.event('weapon-offer',{...offer,name:WEAPONS[index].name});
  }
  nearbyWeapon(maxDistance=2.65) {
    return this.weaponOffers.find(offer=>Math.hypot(this.player.x-offer.x,this.player.z-offer.z)<=maxDistance
      &&Math.abs(this.player.elevation-offer.elevation)<1.6)||null;
  }
  collectWeapon() {
    if(this.state!=='playing')return false;
    const offer=this.nearbyWeapon();if(!offer)return false;
    this.weaponOffers.splice(this.weaponOffers.indexOf(offer),1);
    this.ownedWeapons.add(offer.index);
    this.event('unlock',{index:offer.index,name:WEAPONS[offer.index].name});
    this.selectWeapon(offer.index);
    return true;
  }
  reload() {
    if(this.weapon.melee)return false;
    if (this.state !== 'playing' || this.reloadRemaining > 0 || this.ammo[this.weaponIndex] >= this.weapon.capacity) return false;
    this.reloadRemaining = this.weapon.reload; this.charge = 0;this.semiPending=false;
    this.emitNoise('reload',NOISE_RADIUS.reload);
    this.event('reload', { duration: this.reloadRemaining }); return true;
  }
  autoReload(){
    if(this.weapon.melee||this.state!=='playing'||this.reloadRemaining>0)return false;
    const empty=this.ammo[this.weaponIndex]<=0||(this.weapon.dual&&(this.dual.ammo.left<=0||this.dual.ammo.right<=0));
    return empty?this.reload():false;
  }
  beginWave() {
    if ((!this.endless && this.wave >= MAX_LEVEL) || this.state !== 'playing') return;
    this.wave++; this.toSpawn = levelCount(this.wave); this.spawned = 0;
    this.spawnTimer = 0; this.nextWave = -1;
    this.activePortals=chooseWavePortals(this.obstacles,this.random,this.wave,this.player,this.time);
    this.event('portals',{count:this.activePortals.length,sites:this.activePortals.map(p=>({...p}))});
    this.ammo = WEAPONS.map(w => w.capacity); this.reloadRemaining = 0; this.charge = 0;
    this.dual.ammo={left:12,right:12};
    const offered = WEAPONS.findIndex(w => w.level === this.wave);
    if (offered > 0) this.offerWeapon(offered);
    this.event('equipment', this.equipment);
    this.event('wave', { wave: this.wave, count: this.toSpawn });
  }
  spawnEnemy() {
    const ordinal = this.spawned++;
    const special=this.wave>=3&&ordinal%7===1?'synth':this.wave>=11&&ordinal%7===5?'bulwark':this.wave>=6&&ordinal%7===4?'listener':null;
    const elite = !special && this.wave >= 3 && ordinal % (this.wave >= 8 ? 3 : 5) === 2;
    const probe = !special && this.wave >= 3 && !elite && (ordinal % 6 === 3 || (this.wave >= 7 && ordinal > 0 && ordinal % 6 === 0));
    const forms = ['stalker','scuttler','seer','brute'];
    const form = special || (probe ? 'probe' : elite ? 'brute' : forms[(ordinal + this.wave - 1) % forms.length]);
    const ranged = probe || !!special || form==='seer' || (this.wave>=3&&ordinal%3===1) || (this.wave>=5&&form==='brute');
    const angle = this.random() * Math.PI * 2;
    const available=this.activePortals.filter(p=>p.openedAt<=this.time);
    const site=available.length?available[ordinal%available.length]:this.activePortals[0]||PORTAL;
    const x=site.x+Math.sin(site.yaw||0)*3.2+Math.cos(angle)*.95;
    const z=site.z+Math.cos(site.yaw||0)*3.2+Math.sin(angle)*.95;
    const aimHeight = probe ? PROBE.aimHeight : form === 'scuttler' ? .88 : ['seer','listener'].includes(form) ? 1.38 : ['brute','bulwark'].includes(form) ? 1.42 : 1.15;
    const homeHeight = this.surfaceHeight(x, z,this.time,.3);
    const enemy = { id: this.nextId++, x, z, elevation: homeHeight + (probe ? PROBE.hover : 0),grounded:!probe,verticalSpeed:0,homeHeight,
      hp: enemyDurability(this.wave,form,elite), elite, ranged:ranged||form==='synth', form, aimHeight,
      speed: probe ? Math.min(5,3.6 + this.wave * .07) : Math.min(4.3,2.4+(this.wave-1)*.055)*(form==='bulwark'?.7:form==='scuttler'?1.12:1),
      tier: Math.max(1,Math.ceil(this.wave/2)),limpUntil:0,stunnedUntil:0,
      homeX:site.x,homeZ:site.z,portalId:site.id,
      radius: probe ? PROBE.radius : elite ? 1.05 : form === 'scuttler' ? .86 : form === 'brute' ? .95 : .8,
      hitRadius: probe ? .44 : form === 'scuttler' ? .91 : form === 'brute' ? 1.18 : form === 'seer' ? .94 : 1.05,
      attackTimer: .8 + this.random() * .6, phase: this.random() * Math.PI * 2,
      awareness:'patrol',lastSeenAt:-999,lastKnownX:x,lastKnownZ:z,lastKnownHeight:homeHeight,patrolAngle:angle,patrolTimer:.7+this.random()*2,alertedUntil:0 };

    this.enemies.push(enemy); this.toSpawn--; this.event('spawn', { id: enemy.id, x: enemy.x, y: enemy.elevation + enemy.aimHeight, z: enemy.z });
  }
  searchWaypoint(enemy,target) {
    // Search uses the last sound/visual contact, never the hidden player's live
    // position. Share bounded fields for nearby destinations instead of turning
    // in place when a local corner cannot clear several successive obstacles.
    const key=this.navigation.index(target.x,target.z);
    let field=this.searchFields.get(key);
    if(!field){
      if(this.searchFields.size>=6)this.searchFields.delete(this.searchFields.keys().next().value);
      field=new CoverNavigation(this.obstacles);this.searchFields.set(key,field);
    }
    field.update(target,this.time);
    return field.waypoint(enemy)||soundWaypoint(enemy,target,this.obstacles,segmentBox);
  }
  shoot(origin, direction, charge = 1, hand = null) {
    if(this.weapon.melee){
      if(this.state!=='playing'||this.cooldown>0)return false;
      this.cooldown=this.weapon.interval;this.bladeSlashAt=this.time;this.bladeSlashSide*=-1;
      this.emitNoise('blade-swing',14,origin);this.event('blade-swing',{weapon:'aurora',origin:{...origin}});return true;
    }
    if (this.state !== 'playing' || this.cooldown > 0 || this.reloadRemaining > 0 || this.ammo[this.weaponIndex] <= 0) return false;
    if(this.weapon.dual){hand=hand||this.nextDualHand;if(!['left','right'].includes(hand)||this.dual.ammo[hand]<=0||this.time<this.dual.readyAt[hand])return false;}
    if(!origin||!direction||![origin.x,origin.y,origin.z,direction.x,direction.y,direction.z].every(Number.isFinite))return false;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length < .001) return false;
    const bulletId=this.nextId;
    const w = this.weapon, power = w.chargeTime ? .3 + .7 * clamp(charge, 0, 1) : 1;
    const nx = direction.x / length, ny = direction.y / length, nz = direction.z / length;
    const flat = Math.hypot(nx, nz), rx = flat>1e-6?-nz/flat:1, rz = flat>1e-6?nx/flat:0;
    const ux=-rz*ny,uy=rz*nx-rx*nz,uz=rx*ny;
    for (let i = 0; i < w.pellets; i++) {
      // A deterministic ring keeps the plasma spread consistent on touch screens.
      const angle = w.id==='m12'?(i-1)/Math.max(1,w.pellets-1)*Math.PI*2:i/Math.max(1,w.pellets-1)*Math.PI*2;
      const sx = w.id==='m12'&&i===0?0:w.pellets > 1 && i > 0 ? Math.cos(angle) * w.spread : (this.random() - .5) * w.spread;
      const sy = w.id==='m12'&&i===0?0:w.pellets > 1 && i > 0 ? Math.sin(angle) * w.spread : (this.random() - .5) * w.spread;
      const vx = nx + rx * sx+(w.id==='m12'?ux*sy:0), vy = ny + (w.id==='m12'?uy*sy:sy), vz = nz + rz * sx+(w.id==='m12'?uz*sy:0), n = Math.hypot(vx, vy, vz);
      this.bullets.push({ id: this.nextId++, x: origin.x, y: origin.y, z: origin.z,
        vx: vx / n * w.speed, vy: vy / n * w.speed, vz: vz / n * w.speed, life: 2.4,
        originX:origin.x,originY:origin.y,originZ:origin.z,originElevation:this.player.elevation,
        damage: w.damage * power, splash: w.splash * power, power, weapon: w.id, hostile: false });
    }
    this.ammo[this.weaponIndex]--;this.charge = 0;
    if(w.dual){this.dual.ammo[hand]--;this.dual.readyAt[hand]=this.time+w.interval;this.dual.shotAt[hand]=this.time;this.dual.next=hand==='right'?'left':'right';}
    else this.cooldown = w.interval;
    this.emitNoise('shot',SHOT_RADIUS[w.id]*(.75+.25*power),origin);
    this.event('shot', { weapon: w.id, power,bulletId,hand,origin:{...origin},direction:{x:nx,y:ny,z:nz} }); return true;
  }
  triggerHand(hand,held,dt,origin,direction){
    if(!this.weapon.dual||!['left','right'].includes(hand))return false;
    this.dual.held[hand]=!!held;this.triggerHeld=this.dual.held.left||this.dual.held.right;
    const fired=held?this.shoot(origin,direction,1,hand):false;
    if(held&&this.ammo[this.weaponIndex]===0)this.reload();return fired;
  }
  trigger(held, dt, origin, direction) {
    const w = this.weapon;
    if(w.dual){
      if(held&&this.time>=this.dual.flatAt&&this.shoot(origin,direction,1,this.nextDualHand))this.dual.flatAt=this.time+w.interval/2;
      this.triggerHeld=!!held;if(held&&this.ammo[this.weaponIndex]===0)this.reload();return;
    }
    if(w.melee){if(held&&!this.triggerHeld)this.semiPending=true;if(!held)this.semiPending=false;if(held&&this.semiPending&&this.shoot(origin,direction))this.semiPending=false;this.triggerHeld=held;return;}
    if (!w.chargeTime) {
      if(w.semiAuto){
        if(held&&!this.triggerHeld)this.semiPending=true;
        if(!held)this.semiPending=false;
        // Keep one held press through the equip/cadence delay. A successful
        // discharge consumes it; holding cannot create another shot.
        if(held&&this.semiPending&&this.shoot(origin,direction))this.semiPending=false;
      }else if(held)this.shoot(origin,direction);
      this.charge=0;
    }
    else if (this.reloadRemaining <= 0 && this.cooldown <= 0 && this.ammo[this.weaponIndex] > 0) {
      if (held) {
        this.charge = clamp(this.charge + dt / w.chargeTime, 0, 1);
        if (this.charge >= 1) this.shoot(origin, direction, 1);
      } else if (this.triggerHeld && this.charge > .08) this.shoot(origin, direction, this.charge);
      else this.charge = 0;
    } else this.charge = 0;
    this.triggerHeld = held;
    if (held && this.ammo[this.weaponIndex] === 0) this.reload();
  }
  damage(amount) {
    if (this.state !== 'playing' || this.invulnerable > 0) return;
    this.player.hp = Math.max(0, this.player.hp - amount); this.invulnerable = .3;
    this.lastDamage = this.time; this.regenerating = false; this.event('damage', { hp: this.player.hp });
    if (this.player.hp <= 0) { this.state = 'over'; this.charge = 0; this.event('over'); }
  }
  get bladePhase(){return this.weapon.melee?Math.max(0,Math.min(1,(this.time-this.bladeSlashAt)/.42)):1;}
  updateBlade(segment,dt,guard=false,head=null){
    this.bladeGuard=!!guard;
    if(!this.weapon.melee||this.state!=='playing'||!segment||segment.extension<.95){this.bladePrevious=null;this.bladeSpeed=0;return;}
    const previous=this.bladePrevious;
    this.bladeEye=head?{x:head.x,y:head.y,z:head.z}:{x:this.player.x,y:this.player.elevation+1.35,z:this.player.z};
    this.bladeSpeed=previous&&dt>0?Math.min(12,Math.hypot(segment.tip.x-previous.tip.x-this.playerVelocity.x*dt,segment.tip.y-previous.tip.y-this.playerVelocity.y*dt,segment.tip.z-previous.tip.z-this.playerVelocity.z*dt)/dt):0;
    if(this.time>=this.bladeHumAt){this.emitNoise('blade-hum',6);this.bladeHumAt=this.time+1.5;}
    if(this.bladeSpeed>.65||this.bladePhase<1){
      const eye=this.bladeEye;
      for(const hit of sweepBlade(previous,segment,this.enemies,this.obstacles,eye,segmentBox,traceEnemyHit)){
        if(this.time-(this.bladeHitTimes.get(hit.enemy.id)??-99)<.48)continue;
        this.bladeHitTimes.set(hit.enemy.id,this.time);this.damageEnemy(hit.enemy,this.weapon.damage,hit.point,hit.zone,hit.multiplier);
        this.event('blade-hit',{...hit.point,surface:'robot',weapon:'aurora',power:1,normal:{x:0,y:1,z:0}});
      }
    }
    this.bladePrevious={base:{...segment.base},tip:{...segment.tip},extension:segment.extension};
    for(const [id,at] of this.bladeHitTimes)if(this.time-at>3)this.bladeHitTimes.delete(id);
  }
  damageEnemy(target, amount, at, zone='torso',multiplier=1,source=this.player) {
    if (!this.enemies.includes(target)) return;
    const armor=target.form?Math.min(.18,Math.max(0,(target.tier||1)-1)*.025):0;
    const support=source?.companion?1:(this.time<(target.companionMarkUntil||0)?1.2:1)*(this.time<(this.companionAmplifyUntil||0)?1.15:1);
    const effective=amount*multiplier*support*(1-armor*(zone==='head'?.35:1));
    target.hp -= effective;
    target.lastKnownX=source.x;target.lastKnownZ=source.z;target.lastKnownHeight=source.elevation??this.player.elevation;
    target.alertedUntil=this.time+5;target.awareness='search';target.lastSeenAt=this.time;
    if(zone==='limb')target.limpUntil=Math.max(target.limpUntil||0,this.time+2);
    if(zone==='head')target.stunnedUntil=Math.max(target.stunnedUntil||0,this.time+.32);
    target.hitAt=this.time;target.hitZone=zone;target.suppressedUntil=this.time+1.6;
    this.event('hit', { id: target.id, zone, damage:effective });
    if (target.hp <= 0) {
      this.combo = this.time <= this.comboUntil ? this.combo + 1 : 1; this.comboUntil = this.time + COMBO_WINDOW;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const multiplier = comboMultiplier(this.combo);
      this.score += Math.round((target.elite ? 250 : target.ranged ? 150 : 100) * multiplier); this.kills++;
      this.enemies.splice(this.enemies.indexOf(target), 1); this.event('kill', { ...at, id:target.id, form:target.form, elite: target.elite, x:target.x, y:target.elevation+target.aimHeight, z:target.z, combo:this.combo });
      if (this.combo > 1) this.event('combo', { count: this.combo, multiplier });
      this.dropPickup(target);
    }
  }
  // Survival only: an elite, or every fifth kill, leaves a pickup where it fell: a medkit when the player is
  // hurt, otherwise an energy cell that refills the weapon in hand. No dice: the run stays reproducible.
  get survival() { return this.constructor === ArenaGame; }
  dropPickup(target) {
    if (!this.survival || this.pickups.length >= MAX_PICKUPS || !(target.elite || this.kills % 5 === 0)) return;
    const pickup = { id: this.nextId++, kind: this.player.hp < 70 ? 'heal' : 'cell', x: target.x, y: target.elevation || 0, z: target.z, until: this.time + PICKUP_LIFE };
    this.pickups.push(pickup); this.event('pickup-drop', { ...pickup });
  }
  collectPickups() {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (this.time > pickup.until) { this.pickups.splice(i, 1); continue; }
      if (Math.hypot(pickup.x - this.player.x, pickup.z - this.player.z) > PICKUP_RADIUS || Math.abs(pickup.y - this.player.elevation) > 1.4) continue;
      this.pickups.splice(i, 1);
      if (pickup.kind === 'heal') this.player.hp = Math.min(100, this.player.hp + PICKUP_HEAL);
      else if (!this.weapon.melee) { this.refillWeapon(); this.reloadRemaining = 0; }
      this.event('pickup', { kind: pickup.kind, x: pickup.x, y: pickup.y + .6, z: pickup.z });
    }
  }
  step(dt, input = {}) {
    if (this.state !== 'playing') return;
    this.autoReload();
    dt = clamp(dt, 0, .05); const previousTime=this.time;this.time += dt;this.updateLifts(previousTime);
    this.cooldown = Math.max(0, this.cooldown - dt); this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
      if (this.reloadRemaining === 0) { this.refillWeapon(); this.event('reloaded'); }
    }
    this.regenerating = this.player.hp < 100 && this.time - this.lastDamage >= REGEN_DELAY;
    if (this.regenerating) this.player.hp = Math.min(100, this.player.hp + 18 * dt);
    const yaw = input.yaw ?? this.player.yaw; this.player.yaw = yaw;
    let ix = input.x || 0, iz = input.z || 0; const magnitude = Math.hypot(ix, iz);
    if (magnitude > 1) { ix /= magnitude; iz /= magnitude; }
    // RLH-inspired locomotion: jump is an edge-triggered ballistic state, independent of frame rate.
    const p = this.player, jumpDown = !!input.jump;
    if(input.crouchToggle) { p.crouched=!p.crouched;this.event('crouch',{active:p.crouched}); }
    if (jumpDown && !p.jumpHeld) { const kind=tryJump(p,this.obstacles,this.time);if(kind){this.event('jump',{kind});this.emitNoise('jump',14);} }
    p.jumpHeld = jumpDown;
    const speed = p.crouched ? 3.0 : input.sprint ? 10 : 7, moveYaw = input.moveYaw ?? yaw;
    const oldX=p.x,oldZ=p.z,oldY=p.elevation,wasGrounded=p.grounded;
    moveInArena(p, (Math.cos(moveYaw) * ix + Math.sin(moveYaw) * iz) * speed * dt,
      (-Math.sin(moveYaw) * ix + Math.cos(moveYaw) * iz) * speed * dt, .55, this.obstacles);
    if(p.jumpImpulseX||p.jumpImpulseZ){moveInArena(p,p.jumpImpulseX*dt,p.jumpImpulseZ*dt,.55,this.obstacles);p.jumpImpulseX*=Math.exp(-dt*5);p.jumpImpulseZ*=Math.exp(-dt*5);}
    this.settle(p,dt,true);
    if(p.grounded){p.airJumps=0;p.jumpImpulseX=p.jumpImpulseZ=0;p.lastGroundedAt=this.time;}
    if(dt>0)this.playerVelocity={x:(p.x-oldX)/dt,y:(p.elevation-oldY)/dt,z:(p.z-oldZ)/dt};
    if(!wasGrounded&&p.grounded)this.emitNoise('land',NOISE_RADIUS.land);
    if(p.grounded){
      this.footstepDistance+=Math.hypot(p.x-oldX,p.z-oldZ);
      if(this.footstepDistance>(p.crouched?1.25:input.sprint?1.9:1.65)){
        this.footstepDistance=0;const kind=p.crouched?'crouch':input.sprint?'sprint':'step';
        this.emitNoise(kind,NOISE_RADIUS[kind]);
      }
    }
    if (this.pickups.length) this.collectPickups();
    if (this.nextWave >= 0) { this.nextWave -= dt; if (this.nextWave <= 0) this.beginWave(); }
    if (this.toSpawn > 0 && this.enemies.length<MAX_ACTIVE_ENEMIES) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) {
      const available=this.activePortals.filter(p=>p.openedAt<=this.time);
      if(available.length){this.spawnEnemy();this.spawnTimer=Math.max(.35,1.15-this.wave*.045);}
      else this.spawnTimer=.1;
    } }
    this.navigation.update(this.player, this.time);
    const pack=meleePack(this.enemies,this.player);
    for (const e of this.enemies) {
      if(e.form==='probe'){updateProbe(this,e,dt,segmentBox);continue;}
      e.aimHeight ??= e.elite ? 1.35 : 1.15;
      e.hitRadius ??= e.elite ? 1.3 : 1.05;
      e.grounded ??= true;e.elevation ??= 0;
      let dx=this.player.x-e.x,dz=this.player.z-e.z;
      const horizontalDistance=Math.hypot(dx,dz)||1;
      const eye={x:e.x,y:e.elevation+e.aimHeight-.52*(e.coverCrouch||0)*enemyScale(e.form,e.elite),z:e.z};
      const playerHead={x:this.player.x,y:this.player.elevation+(this.player.crouched?.83:1.25),z:this.player.z};
      const verticalDistance=playerHead.y-eye.y,distance=Math.hypot(horizontalDistance,verticalDistance);
      const unobstructed=!this.blocked(eye,playerHead);
      // Patrol until visual contact. Buildings fully conceal the player;
      // approaching from behind a patrol has a narrower detection window.
      const facing=e.yaw===undefined?(e.patrolAngle||0):e.yaw-Math.PI;
      const facingX=Math.sin(facing),facingZ=Math.cos(facing);
      const directionDot=(facingX*dx+facingZ*dz)/horizontalDistance;
      const seen=unobstructed && horizontalDistance<(e.elite?50:38)
        && (horizontalDistance<5 || directionDot>-.28);
      if(seen){
        if(e.awareness!=='engaged')this.event('spotted',{id:e.id});
        e.awareness='engaged';e.lastSeenAt=this.time;e.lastKnownX=this.player.x;e.lastKnownZ=this.player.z;e.lastKnownHeight=this.player.elevation;
        e.alertedUntil=this.time+(e.form==='synth'?10:3.8);
      }else if(this.time<(e.alertedUntil||0)){
        e.awareness='search';
      }else{
        e.awareness='patrol';
      }
      let destinationX=e.lastKnownX,destinationZ=e.lastKnownZ;
      const pursuit=e.awareness==='engaged'?this.player:{x:e.lastKnownX,z:e.lastKnownZ,elevation:e.lastKnownHeight||0};
      if(e.awareness==='engaged'){destinationX=this.player.x;destinationZ=this.player.z;}
      else if(e.awareness==='patrol'){
        // Loiter near the portal, occasionally changing direction. This isn't a
        // global navigation path to the player: hidden players remain undetected.
        e.patrolTimer-=dt;
        if(e.patrolTimer<=0){
          e.patrolTimer=1.25+this.random()*2.6;
          e.patrolAngle=(e.patrolAngle||0)+(this.random()-.5)*2.1;
        }
        const homeX=e.homeX??PORTAL.x,homeZ=(e.homeZ??PORTAL.z)+4;
        const offsetX=e.x-homeX,offsetZ=e.z-homeZ;
        if(Math.hypot(offsetX,offsetZ)>17)e.patrolAngle=Math.atan2(-offsetX,-offsetZ);
        destinationX=e.x+Math.sin(e.patrolAngle||0)*5;
        destinationZ=e.z+Math.cos(e.patrolAngle||0)*5;
      }
      // An alerted ground unit approaches the bottom of the stairs, then climbs.
      // It never snaps onto a balcony just because it walked underneath it.
      const playerSurface=this.surfacesAt(pursuit.x,pursuit.z,this.time)
        .filter(surface=>surface.height>2&&Math.abs(surface.height-pursuit.elevation)<.37)
        .sort((a,b)=>Math.abs(a.height-pursuit.elevation)-Math.abs(b.height-pursuit.elevation))[0];
      const playerRoute=playerSurface&&this.routeForSurface(playerSurface.id,pursuit.x);
      let stairRoute=false;
      if(e.awareness!=='patrol'&&!e.bridgeDetour)
        e.bridgeDetour=this.traversal?null:brokenBridgeDetour(e,pursuit);
      if(e.bridgeDetour&&e.elevation<=.3)e.bridgeDetour=null;
      if(e.bridgeDetour&&e.awareness!=='patrol'){
        // Descend the ramp on the enemy's own bank, then navigate across the
        // street and climb the other approach rather than walking over air.
        const stair=this.routes.find(route=>route.id===e.bridgeDetour);
        if(e.stairRoute!==stair.id||e.stairDirection!=='down'){
          e.stairRoute=stair.id;e.stairStage=0;e.stairDirection='down';
        }
        if(e.stairStage===0&&Math.hypot(e.x-stair.x,e.z-(stair.topZ-.6))<1.3)
          e.stairStage=1;
        destinationX=stair.x;
        destinationZ=e.stairStage===0?stair.topZ-.6:stair.bottomZ+1;
        stairRoute=true;
      }else if(playerRoute && e.elevation<pursuit.elevation-.3 && e.awareness!=='patrol'){
        const si=this.routes.findIndex(route=>route.id===playerRoute),stair=this.routes[si];
        if(e.stairRoute!==stair.id||e.stairDirection!=='up'){e.stairRoute=stair.id;e.stairStage=0;e.stairDirection='up';}
        if(e.stairStage===0 && Math.hypot(e.x-stair.x,e.z-(stair.bottomZ+1))<1.7)e.stairStage=1;
        if(e.stairStage===0){
          const target={x:stair.x,z:stair.bottomZ+1};this.stairNavigation[si].update(target,this.time);
          const waypoint=this.stairNavigation[si].waypoint(e)||target;destinationX=waypoint.x;destinationZ=waypoint.z;
        }else{destinationX=stair.x;destinationZ=stair.topZ-.8;}
        stairRoute=true;
      }else{
        const enemySurface=this.surfacesAt(e.x,e.z,this.time)
          .filter(surface=>surface.height>2&&Math.abs(surface.height-e.elevation)<.37)[0];
        const enemyRoute=enemySurface&&this.routeForSurface(enemySurface.id,e.x);
        const stair=enemyRoute?this.routes.find(route=>route.id===enemyRoute):
          e.stairDirection==='down'?this.routes.find(route=>route.id===e.stairRoute):null;
        if(stair && e.elevation>.3 && pursuit.elevation<e.elevation-.4 && e.awareness!=='patrol'){
          if(e.stairRoute!==stair.id||e.stairDirection!=='down'){e.stairRoute=stair.id;e.stairStage=0;e.stairDirection='down';}
          if(e.stairStage===0&&Math.hypot(e.x-stair.x,e.z-(stair.topZ-.6))<1.1)e.stairStage=1;
          destinationX=stair.x;destinationZ=e.stairStage===0?stair.topZ-.6:stair.bottomZ+1;stairRoute=true;
        }else{e.stairRoute=null;e.stairStage=0;e.stairDirection=null;}
      }
      // Engaged melee units close in on their own slot round the player instead of queuing behind each other.
      let slot=!stairRoute&&e.awareness==='engaged'?pack.get(e):null;
      // A slot behind a wall or a crate is no slot: that unit goes straight for the player.
      if(slot&&this.obstacles.some(b=>!b.walkableSurface&&segmentBox({x:this.player.x,y:eye.y,z:this.player.z},{x:slot.x,y:eye.y,z:slot.z},{...b,hx:b.hx+e.radius,hz:b.hz+e.radius})!==null))slot=null;
      if(slot){destinationX=slot.x;destinationZ=slot.z;}
      const tacticContext={time:this.time,seen,threat:{x:e.lastKnownX,y:(e.lastKnownHeight||0)+1.25,z:e.lastKnownZ},obstacles:this.obstacles,allies:this.enemies,hazards:this.companionHazards,segmentBox};
      relayVisualContact(e,tacticContext);
      const order=!stairRoute?(grenadeAvoidance(e,tacticContext)||tacticalOrder(e,tacticContext)||squadOrder(e,tacticContext)):null;
      e.combatPose=order?.state||'advance';
      e.coverCrouch=((e.coverCrouch||0)+(Number(!!order?.crouched)-(e.coverCrouch||0))*(1-Math.exp(-dt*12)));
      if(order){destinationX=order.point.x;destinationZ=order.point.z;}
      dx=destinationX-e.x;dz=destinationZ-e.z;
      const goalDistance=Math.hypot(dx,dz)||1;
      dx/=goalDistance;dz/=goalDistance;
      if(this.obstacles.some(b=>!b.walkableSurface&&segmentBox(eye,{x:destinationX,y:eye.y,z:destinationZ},{...b,hx:b.hx+e.radius+.08,hz:b.hz+e.radius+.08})!==null)){
        if(e.awareness!=='patrol'&&!stairRoute){
          const waypoint=e.awareness==='engaged'&&!order?this.navigation.waypoint(e):this.searchWaypoint(e,{x:destinationX,z:destinationZ});
          if(waypoint){dx=waypoint.x-e.x;dz=waypoint.z-e.z;const n=Math.hypot(dx,dz)||1;dx/=n;dz/=n;}
          else { e.patrolAngle=(e.patrolAngle||0)+.6;dx=Math.sin(e.patrolAngle);dz=Math.cos(e.patrolAngle); }
        }else{e.patrolAngle=(e.patrolAngle||0)+Math.PI*.64;e.patrolTimer=.6;}
      }
      for(const other of this.enemies){
        if(other.id===e.id)continue;
        const ax=e.x-other.x,az=e.z-other.z,d=Math.hypot(ax,az);
        if(d>.01&&d<1.7){dx+=ax/d*.65;dz+=az/d*.65;}
      }
      // A shooter caught at close range on the player's own level backs off while keeping its aim on the player
      // (never back down a stair it has just climbed).
      const retreat=!order&&e.ranged&&seen&&e.awareness==='engaged'&&!stairRoute&&horizontalDistance<RANGED_RETREAT
        &&Math.abs(e.elevation-this.player.elevation)<.15;
      if(retreat){dx=-(this.player.x-e.x)/horizontalDistance;dz=-(this.player.z-e.z)/horizontalDistance;}
      if(!order&&e.ranged&&seen&&!stairRoute&&(retreat||distance>8&&distance<28)){
        // Shooters weave: the strafe side switches every few seconds, out of step from one unit to the next.
        const n=Math.hypot(dx,dz)||1,oldX=dx/n,oldZ=dz/n,side=(Math.floor(this.time/2.6+e.id*.37)%2?1:-1)*.32;dx+=oldZ*side;dz-=oldX*side;
      }
      const norm=Math.hypot(dx,dz)||1;
      const stopDistance=order?order.stopDistance:stairRoute?.15:slot?.3:e.awareness==='engaged' ? (e.ranged?14:1.45) : e.awareness==='search'?1.8:.7;
      if((goalDistance>stopDistance||retreat)&&(e.stunnedUntil||0)<=this.time){
        const injury=(e.limpUntil>this.time?.62:1)*(order?.speedScale??1);
        const searchSpeed=retreat?.8:e.awareness==='engaged'?1:e.awareness==='search'?.75:.48;
        moveInArena(e,dx/norm*e.speed*dt*injury*searchSpeed,dz/norm*e.speed*dt*injury*searchSpeed,e.radius,this.obstacles);
      }
      this.settle(e,dt);
      if(order)e.yaw=Math.atan2(e.lastKnownX-e.x,e.lastKnownZ-e.z)+Math.PI;
      else if(e.ranged&&seen)e.yaw=Math.atan2(this.player.x-e.x,this.player.z-e.z)+Math.PI;
      else if(e.awareness!=='patrol'&&goalDistance>.15)e.yaw=Math.atan2(dx,dz)+Math.PI;
      else if(e.awareness==='patrol')e.yaw=(e.patrolAngle||0)+Math.PI;
      if((e.stunnedUntil||0)<=this.time)e.attackTimer-=dt;
      if(!seen||e.stunnedUntil>this.time){e.burstRemaining=0;e.chargeProgress=0;}
      else e.chargeProgress=e.ranged&&e.attackTimer>0&&e.attackTimer<.25?1-e.attackTimer/.25:0;
      // Never attack through walls or while merely searching the last seen position.
      if((!order||order.canFire)&&seen&&e.awareness==='engaged'&&distance<2&&e.attackTimer<=0&&(e.stunnedUntil||0)<=this.time){
        e.attackTimer=.85;this.damage(e.elite?20+this.wave:10+Math.floor(this.wave/2));
      }else if((!order||order.canFire)&&seen&&e.awareness==='engaged'&&e.ranged&&distance<38&&e.attackTimer<=0&&(e.stunnedUntil||0)<=this.time){
        const profile=hostileShotProfile(this.wave,e.form),speed=profile.speed;
        const volley=enemyVolley(this.wave,e.form),muzzle=rangedMuzzle(e);
        const target=predictShot(muzzle,playerHead,this.playerVelocity,speed,profile.lead);
        if(!this.blocked(eye,muzzle)&&!this.blocked(muzzle,target)&&clearSquadFiringLane(e,muzzle,target,this.enemies)){
          const n=Math.hypot(target.x-muzzle.x,target.y-muzzle.y,target.z-muzzle.z)||1;
          this.bullets.push({id:this.nextId++,...muzzle,vx:(target.x-muzzle.x)/n*speed,
            vy:(target.y-muzzle.y)/n*speed,vz:(target.z-muzzle.z)/n*speed,
            life:3,damage:volley.damage,hostile:true,weapon:'enemy',splash:0});
          e.burstRemaining=e.burstRemaining>0?e.burstRemaining-1:volley.count-1;
          e.attackTimer=e.burstRemaining>0?volley.gap:profile.interval;e.lastShotAt=this.time;e.chargeProgress=0;if(e.tactics)e.tactics.shots++;
          e.aimPitch=Math.atan2(target.y-muzzle.y,Math.hypot(target.x-muzzle.x,target.z-muzzle.z));
          this.event('enemy-shot',{...muzzle,form:e.form,id:e.id});
        }else{e.attackTimer=.3;e.burstRemaining=0;}
      }
      if (this.state !== 'playing') break;
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i], start = { x: b.x, y: b.y, z: b.z };
      const end = { x: b.x + b.vx * dt, y: b.y + b.vy * dt, z: b.z + b.vz * dt };
      if(b.hostile&&this.weapon.melee&&this.bladePrevious?.extension>.95){
        const contact=bladeBulletContact(start,end,this.bladePrevious.base,this.bladePrevious.tip,this.bladeGuard?.10:.075);
        const playerHit=segmentSphere(start,end,{x:this.player.x,y:this.player.elevation+(this.player.crouched?.58:1.25),z:this.player.z},this.player.crouched?.46:.62);
        if(contact&&(playerHit===null||contact.t<=playerHit)&&!this.blocked(start,contact.point)&&!this.blocked(this.bladeEye||{x:this.player.x,y:this.player.elevation+1.35,z:this.player.z},contact.point)){
          const reflected=reflectedVelocity({x:b.vx,y:b.vy,z:b.vz},this.bladePrevious,contact),speed=Math.hypot(reflected.x,reflected.y,reflected.z)||1;
          b.vx=reflected.x;b.vy=reflected.y;b.vz=reflected.z;b.hostile=false;b.reflected=true;b.weapon='aurora';b.power=1;
          b.x=contact.point.x+b.vx/speed*.04;b.y=contact.point.y+b.vy/speed*.04;b.z=contact.point.z+b.vz/speed*.04;
          b.originX=contact.point.x;b.originY=contact.point.y;b.originZ=contact.point.z;b.life=Math.max(b.life,1.2);
          this.event('blade-parry',{...contact.point,bulletId:b.id,surface:'metal',weapon:'aurora',power:1,normal:reflected.normal,direction:{x:b.vx,y:b.vy,z:b.vz}});continue;
        }
      }
      let nearest = 1.01, target = null, zone='torso',multiplier=1,surface='concrete',hitBox=null;
      if (b.hostile) {
        const hit = segmentSphere(start, end, { x: this.player.x, y: (this.player.elevation || 0) + (this.player.crouched?.58:1.25), z: this.player.z }, this.player.crouched?.46:.62);
        if (hit !== null) { nearest = hit; target = this.player; }
      } else for (const e of this.enemies) {
        const hit = traceEnemyHit(start,end,e);
        if (hit && hit.t < nearest) { nearest = hit.t; target = e;zone=hit.zone;multiplier=hit.multiplier; }
      }
      for (const obstacle of this.obstacles) { const t = segmentBox(start, end, obstacle); if (t !== null && t < nearest) { nearest = t; target = null;hitBox=obstacle;surface=obstacle.surface||'concrete'; } }
      if (end.y < .06 && start.y >= .06) { const t = (start.y - .06) / (start.y - end.y); if (t < nearest) { nearest = t; target = null;hitBox=null;surface='ground'; } }
      if(b.hostile&&this.companionWard?.until>this.time&&this.companionWard.remaining>0){
        const shieldHit=segmentSphere(start,end,{x:this.player.x,y:this.player.elevation+(this.player.crouched?.58:1.25),z:this.player.z},1.7);
        if(shieldHit!==null&&shieldHit<nearest){this.companionWard.remaining--;this.bullets.splice(i,1);this.event('companion-assist',{name:'Gaby',kind:'ward'});continue;}
      }
      if(!b.hostile){const t=Math.min(1,nearest);registerIncomingFire(this.enemies,start,{x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t},this.time,(a,c)=>this.blocked(a,c));}
      if (nearest <= 1) {
        const at = { x: start.x + (end.x - start.x) * nearest, y: start.y + (end.y - start.y) * nearest, z: start.z + (end.z - start.z) * nearest };
        let normal={x:0,y:1,z:0};
        if(hitBox){
          const faces=[['x',hitBox.x-hitBox.hx,-1],['x',hitBox.x+hitBox.hx,1],['y',hitBox.y||0,-1],['y',(hitBox.y||0)+hitBox.height,1],['z',hitBox.z-hitBox.hz,-1],['z',hitBox.z+hitBox.hz,1]];
          faces.sort((a,c)=>Math.abs(at[a[0]]-a[1])-Math.abs(at[c[0]]-c[1]));normal={x:0,y:0,z:0};normal[faces[0][0]]=faces[0][2];
        }
        this.event('impact', { ...at, bulletId:b.id, enemy: !!target, hostile: b.hostile, splash: b.splash,weapon:b.weapon,power:b.power||1,surface:target?'robot':surface,normal,direction:{x:b.vx,y:b.vy,z:b.vz} });
        if (target === this.player) this.damage(b.damage);
        else if (target) this.damageEnemy(target, projectileDamage(b,at), at, zone, multiplier,{x:b.originX??this.player.x,z:b.originZ??this.player.z,elevation:b.originElevation??this.player.elevation});
        if (!b.hostile && b.splash > 0) for (const e of [...this.enemies]) {
          if (e === target) continue;
          const center = { x: e.x, y: e.elevation + e.aimHeight, z: e.z }, d = Math.hypot(e.x - at.x, e.z - at.z, center.y - at.y);
          // Cover also stops blast damage; back off the impact point from a wall.
          const blast = { x: at.x - b.vx * .0001, y: at.y, z: at.z - b.vz * .0001 };
          if (d < b.splash && !this.blocked(blast, center)) this.damageEnemy(e, b.damage * (1 - d / b.splash * .65), center,'torso',1,{x:b.originX??this.player.x,z:b.originZ??this.player.z,elevation:b.originElevation??this.player.elevation});
        }
        this.bullets.splice(i, 1);
      } else {
        b.x = end.x; b.y = end.y; b.z = end.z; b.life -= dt;
        if (b.life <= 0 || Math.abs(b.x) >= 99 || Math.abs(b.z) >= 99 || b.y < 0) this.bullets.splice(i, 1);
      }
    }
    if (this.wave > 0 && this.toSpawn === 0 && this.enemies.length === 0 && this.nextWave < 0 && this.state === 'playing') {
      this.score += 250 + this.wave * 50; this.event('clear', { wave: this.wave });
      if (!this.endless && this.wave === MAX_LEVEL) { this.state = 'won'; this.charge = 0; this.bullets = []; this.score += 2000; this.event('win'); }
      else this.nextWave = 5;
    }
  }
  snapshot() { return { equipment: this.equipment, state: this.state, player: { ...this.player }, wave: this.wave, maxLevel: MAX_LEVEL, endless:this.endless, score: this.score, kills: this.kills, time: this.time,
    weaponIndex: this.weaponIndex, weapon: { ...this.weapon }, unlockedWeapons: this.unlockedWeapons.map(w => w.id),weaponOffers:this.weaponOffers.map(offer=>({...offer})), ammo: this.ammo[this.weaponIndex],
    reloadRemaining: this.reloadRemaining, charge: this.charge, regenerating: this.regenerating, regenIn: Math.max(0, REGEN_DELAY - (this.time - this.lastDamage)),
    toSpawn: this.toSpawn, nextWave: this.nextWave, activePortals:this.activePortals.map(p=>({...p})), enemies: this.enemies.map(e => ({ ...e })), bullets: this.bullets.map(b => ({ ...b })),
    combo: this.time <= this.comboUntil ? this.combo : 0, comboRemaining: Math.max(0, this.comboUntil - this.time), bestCombo: this.bestCombo, pickups: this.pickups.map(p => ({ ...p })) }; }
}
