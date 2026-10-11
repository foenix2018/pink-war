import { equipmentForLevel } from './equipment.js';
// World units are metres. The playable arena is exactly 200 × 200 m.
export const ARENA_SIZE = 200;
export const PORTAL = Object.freeze({ x: 0, z: -20 });
export const MAX_LEVEL = 10;
export const REGEN_DELAY = 5;
export const CATWALK = Object.freeze({ x: 22.4, halfWidth: 2, end: 20, landing: 8, height: 1.58 });
export const WEAPONS = Object.freeze([
  Object.freeze({ id: 'r9', name: 'R–9', label: 'Pistolet laser', level: 1, damage: 24, capacity: 12, interval: .2, reload: 1.25, speed: 110, pellets: 1, spread: 0, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'bloom', name: 'BLOOM', label: 'Fusil d’assaut', level: 3, damage: 34, capacity: 24, interval: .11, reload: 1.7, speed: 135, pellets: 1, spread: .009, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'petal', name: 'PETAL', label: 'Fusil à plasma', level: 5, damage: 28, capacity: 10, interval: .5, reload: 1.9, speed: 100, pellets: 7, spread: .035, chargeTime: 0, splash: 0 }),
  Object.freeze({ id: 'thorn', name: 'THORN', label: 'Canon à rail', level: 7, damage: 190, capacity: 6, interval: .28, reload: 2.1, speed: 200, pellets: 1, spread: 0, chargeTime: .7, splash: 1.8 }),
  Object.freeze({ id: 'nova', name: 'NOVA', label: 'Canon à énergie', level: 9, damage: 340, capacity: 4, interval: .4, reload: 2.4, speed: 80, pellets: 1, spread: 0, chargeTime: 1.05, splash: 5 })
]);
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
export function walkSurfaceHeight(x, z) {
  if (Math.abs(x - CATWALK.x) > CATWALK.halfWidth || Math.abs(z) > CATWALK.end) return 0;
  if (z > CATWALK.landing) return CATWALK.height * (CATWALK.end - z) / (CATWALK.end - CATWALK.landing);
  if (z < -CATWALK.landing) return CATWALK.height * (z + CATWALK.end) / (CATWALK.end - CATWALK.landing);
  return CATWALK.height;
}
export const levelCount = level => 5 + (clamp(level, 1, MAX_LEVEL) - 1) * 3;
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
    if (b.walkableSurface || (Number.isFinite(entity.elevation) && entity.elevation > b.height + .02)) continue;
    if (z > b.z - b.hz - radius && z < b.z + b.hz + radius && x > b.x - b.hx - radius && x < b.x + b.hx + radius) {
      x = dx > 0 ? b.x - b.hx - radius : dx < 0 ? b.x + b.hx + radius : x;
    }
  }
  z = clamp(entity.z + dz, -edge, edge);
  for (const b of obstacles) {
    if (b.walkableSurface || (Number.isFinite(entity.elevation) && entity.elevation > b.height + .02)) continue;
    if (x > b.x - b.hx - radius && x < b.x + b.hx + radius && z > b.z - b.hz - radius && z < b.z + b.hz + radius) {
      z = dz > 0 ? b.z - b.hz - radius : dz < 0 ? b.z + b.hz + radius : z;
    }
  }
  entity.x = clamp(x, -edge, edge); entity.z = clamp(z, -edge, edge);
}

// A shared navigation field lets a crowd actually go around cover. Rebuilding it
// twice per second costs far less than finding a separate path for each monster.
class CoverNavigation {
  constructor(obstacles) {
    this.size = 99; this.cell = 2; this.edge = -98; this.obstacles = obstacles;
    this.solid = new Uint8Array(this.size * this.size); this.distance = new Int16Array(this.solid.length);
    this.queue = new Int32Array(this.solid.length); this.refreshAt = -1; this.goal = -1;
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      const wx = this.edge + x * 2, wz = this.edge + z * 2;
      this.solid[z * this.size + x] = obstacles.some(b => !b.walkableSurface && Math.abs(wx-b.x) < b.hx+1.3 && Math.abs(wz-b.z) < b.hz+1.3) ? 1 : 0;
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

export class ArenaGame {
  constructor(obstacles = [], random = Math.random) { this.obstacles = obstacles; this.random = random; this.navigation = new CoverNavigation(obstacles); this.reset(); }
  reset() {
    this.navigation.refreshAt = -1; this.navigation.goal = -1;
    this.player = { x: 0, z: 22, elevation: 0, hp: 100, yaw: 0, verticalSpeed: 0, grounded: true, jumpHeld: false };
    this.enemies = []; this.bullets = []; this.events = [];
    this.wave = 0; this.score = 0; this.kills = 0; this.time = 0;
    this.state = 'playing'; this.cooldown = 0; this.invulnerable = 0;
    this.nextWave = .75; this.spawnTimer = 0; this.toSpawn = 0; this.nextId = 1;
    this.weaponIndex = 0; this.ammo = WEAPONS.map(w => w.capacity);
    this.reloadRemaining = 0; this.charge = 0; this.triggerHeld = false;
    this.lastDamage = 0; this.regenerating = false;
  }
  get equipment() { return equipmentForLevel(this.wave); }
  get weapon() { return WEAPONS[this.weaponIndex]; }
  get unlockedWeapons() { return WEAPONS.filter(w => w.level <= Math.max(1, this.wave)); }
  event(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  blocked(start, end) { return this.obstacles.some(b => segmentBox(start, end, b) !== null); }
  selectWeapon(index) {
    if (this.state !== 'playing' || !WEAPONS[index] || WEAPONS[index].level > Math.max(1, this.wave) || index === this.weaponIndex) return false;
    this.weaponIndex = index; this.reloadRemaining = 0; this.charge = 0; this.triggerHeld = false;
    this.cooldown = Math.max(this.cooldown, .25); this.event('weapon', { index, name: this.weapon.name }); return true;
  }
  cycleWeapon(direction = 1) { const count = this.unlockedWeapons.length; return this.selectWeapon((this.weaponIndex + (direction < 0 ? -1 : 1) + count) % count); }
  reload() {
    if (this.state !== 'playing' || this.reloadRemaining > 0 || this.ammo[this.weaponIndex] >= this.weapon.capacity) return false;
    this.reloadRemaining = this.weapon.reload; this.charge = 0;
    this.event('reload', { duration: this.reloadRemaining }); return true;
  }
  beginWave() {
    if (this.wave >= MAX_LEVEL || this.state !== 'playing') return;
    this.wave++; this.toSpawn = levelCount(this.wave); this.spawned = 0;
    this.spawnTimer = 0; this.nextWave = -1;
    this.ammo = WEAPONS.map(w => w.capacity); this.reloadRemaining = 0; this.charge = 0;
    const unlocked = WEAPONS.findIndex(w => w.level === this.wave);
    if (unlocked > 0) { this.selectWeapon(unlocked); this.event('unlock', { index: unlocked, name: this.weapon.name }); }
    this.event('equipment', this.equipment);
    this.event('wave', { wave: this.wave, count: this.toSpawn });
  }
  spawnEnemy() {
    const ordinal = this.spawned++;
    const elite = this.wave >= 3 && ordinal % (this.wave >= 8 ? 3 : 5) === 2;
    const ranged = this.wave >= 4 && !elite && ordinal % 4 === 1;
    const forms = ['stalker','scuttler','seer','brute'];
    const form = elite ? 'brute' : forms[(ordinal + this.wave - 1) % forms.length];
    const angle = this.random() * Math.PI * 2;
    const x = PORTAL.x + Math.cos(angle) * 2.7, z = PORTAL.z + Math.sin(angle) * 2.7 + 4;
    const aimHeight = form === 'scuttler' ? .88 : form === 'seer' ? 1.38 : form === 'brute' ? 1.42 : 1.15;
    const enemy = { id: this.nextId++, x, z, elevation: walkSurfaceHeight(x, z),
      hp: elite ? 80 + this.wave * 10 : 36 + this.wave * 6, elite, ranged, form, aimHeight,
      speed: 5 + this.wave * .5 + (elite ? -.1 : form === 'scuttler' ? .15 : form === 'seer' ? .05 : form === 'brute' ? -.12 : 0),
      radius: elite ? 1.05 : form === 'scuttler' ? .86 : form === 'brute' ? .95 : .8,
      hitRadius: form === 'scuttler' ? .91 : form === 'brute' ? 1.18 : form === 'seer' ? .94 : 1.05,
      attackTimer: .8 + this.random() * .6, phase: this.random() * Math.PI * 2 };
    this.enemies.push(enemy); this.toSpawn--; this.event('spawn', { id: enemy.id, x: enemy.x, z: enemy.z });
  }
  shoot(origin, direction, charge = 1) {
    if (this.state !== 'playing' || this.cooldown > 0 || this.reloadRemaining > 0 || this.ammo[this.weaponIndex] <= 0) return false;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length < .001) return false;
    const w = this.weapon, power = w.chargeTime ? .3 + .7 * clamp(charge, 0, 1) : 1;
    const nx = direction.x / length, ny = direction.y / length, nz = direction.z / length;
    const flat = Math.hypot(nx, nz) || 1, rx = -nz / flat, rz = nx / flat;
    for (let i = 0; i < w.pellets; i++) {
      // A deterministic ring keeps the plasma spread consistent on touch screens.
      const angle = i / Math.max(1, w.pellets - 1) * Math.PI * 2;
      const sx = w.pellets > 1 && i > 0 ? Math.cos(angle) * w.spread : (this.random() - .5) * w.spread;
      const sy = w.pellets > 1 && i > 0 ? Math.sin(angle) * w.spread : (this.random() - .5) * w.spread;
      const vx = nx + rx * sx, vy = ny + sy, vz = nz + rz * sx, n = Math.hypot(vx, vy, vz);
      this.bullets.push({ id: this.nextId++, x: origin.x, y: origin.y, z: origin.z,
        vx: vx / n * w.speed, vy: vy / n * w.speed, vz: vz / n * w.speed, life: 2.4,
        damage: w.damage * power, splash: w.splash * power, weapon: w.id, hostile: false });
    }
    this.ammo[this.weaponIndex]--; this.cooldown = w.interval; this.charge = 0;
    this.event('shot', { weapon: w.id, power }); return true;
  }
  trigger(held, dt, origin, direction) {
    const w = this.weapon;
    if (!w.chargeTime) { if (held) this.shoot(origin, direction); this.charge = 0; }
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
  damageEnemy(target, amount, at) {
    if (!this.enemies.includes(target)) return;
    target.hp -= amount; this.event('hit', { id: target.id });
    if (target.hp <= 0) { this.score += target.elite ? 250 : target.ranged ? 150 : 100; this.kills++;
      this.enemies.splice(this.enemies.indexOf(target), 1); this.event('kill', { ...at, elite: target.elite }); }
  }
  step(dt, input = {}) {
    if (this.state !== 'playing') return;
    dt = clamp(dt, 0, .05); this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt); this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
      if (this.reloadRemaining === 0) { this.ammo[this.weaponIndex] = this.weapon.capacity; this.event('reloaded'); }
    }
    this.regenerating = this.player.hp < 100 && this.time - this.lastDamage >= REGEN_DELAY;
    if (this.regenerating) this.player.hp = Math.min(100, this.player.hp + 18 * dt);
    const yaw = input.yaw ?? this.player.yaw; this.player.yaw = yaw;
    let ix = input.x || 0, iz = input.z || 0; const magnitude = Math.hypot(ix, iz);
    if (magnitude > 1) { ix /= magnitude; iz /= magnitude; }
    // RLH-inspired locomotion: jump is an edge-triggered ballistic state, independent of frame rate.
    const p = this.player, jumpDown = !!input.jump;
    if (jumpDown && !p.jumpHeld && p.grounded) { p.grounded = false; p.verticalSpeed = 7.25; this.event('jump'); }
    p.jumpHeld = jumpDown;
    const speed = input.sprint ? 10 : 7, moveYaw = input.moveYaw ?? yaw;
    moveInArena(p, (Math.cos(moveYaw) * ix + Math.sin(moveYaw) * iz) * speed * dt,
      (-Math.sin(moveYaw) * ix + Math.cos(moveYaw) * iz) * speed * dt, .55, this.obstacles);
    let floor = walkSurfaceHeight(p.x, p.z);
    // Shallow service blocks may be vaulted: land on their top instead of falling into them.
    for (const b of this.obstacles) {
      if (b.walkableSurface || b.height > 1.35 || b.height <= floor) continue;
      if (Math.abs(p.x-b.x) < b.hx && Math.abs(p.z-b.z) < b.hz && p.elevation >= b.height - .12) floor=Math.max(floor,b.height);
    }
    if (p.grounded) { p.elevation=floor; p.verticalSpeed=0; }
    else {
      p.verticalSpeed=Math.max(-18,p.verticalSpeed-18*dt);
      p.elevation+=p.verticalSpeed*dt;
      if (p.elevation <= floor) { p.elevation=floor; p.verticalSpeed=0; p.grounded=true; this.event('land'); }
    }
    if (this.nextWave >= 0) { this.nextWave -= dt; if (this.nextWave <= 0) this.beginWave(); }
    if (this.toSpawn > 0) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnTimer = Math.max(.3, 1.15 - this.wave * .08); } }
    this.navigation.update(this.player, this.time);
    for (const e of this.enemies) {
      e.aimHeight ??= e.elite ? 1.35 : 1.15;
      e.hitRadius ??= e.elite ? 1.3 : 1.05;
      e.elevation = walkSurfaceHeight(e.x, e.z);
      let dx = this.player.x - e.x, dz = this.player.z - e.z;
      const horizontalDistance = Math.hypot(dx, dz) || 1, verticalDistance = (this.player.elevation || 0) + 1.25 - (e.elevation + e.aimHeight);
      const distance = Math.hypot(horizontalDistance, verticalDistance);
      dx /= distance; dz /= distance;
      const from = { x: e.x, y: e.elevation + e.aimHeight, z: e.z }, to = { x: this.player.x, y: (this.player.elevation || 0) + 1.25, z: this.player.z };
      const visible = !this.blocked(from, to);
      if (this.obstacles.some(b=>!b.walkableSurface&&segmentBox(from,to,{...b,hx:b.hx+e.radius+.08,hz:b.hz+e.radius+.08})!==null)) {
        const waypoint=this.navigation.waypoint(e);
        if(waypoint){dx=waypoint.x-e.x;dz=waypoint.z-e.z;const n=Math.hypot(dx,dz)||1;dx/=n;dz/=n;}
      }
      for (const other of this.enemies) { if (other.id === e.id) continue; const ax = e.x - other.x, az = e.z - other.z, d = Math.hypot(ax, az); if (d > .01 && d < 1.7) { dx += ax / d * .65; dz += az / d * .65; } }
      const norm = Math.hypot(dx, dz) || 1;
      if (horizontalDistance > (e.ranged && visible ? 14 : 1.45)) moveInArena(e, dx / norm * e.speed * dt, dz / norm * e.speed * dt, e.radius, this.obstacles);
      e.elevation = walkSurfaceHeight(e.x, e.z);
      e.attackTimer -= dt;
      if (distance < 2 && visible && e.attackTimer <= 0) { e.attackTimer = .85; this.damage(e.elite ? 20 + this.wave : 10 + Math.floor(this.wave / 2)); }
      else if (e.ranged && visible && distance < 38 && e.attackTimer <= 0) {
        e.attackTimer = Math.max(1.2, 2.6 - this.wave * .1);
        const n = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z), speed = 18 + this.wave;
        this.bullets.push({ id: this.nextId++, ...from, vx: (to.x - from.x) / n * speed, vy: (to.y - from.y) / n * speed, vz: (to.z - from.z) / n * speed,
          life: 3, damage: 13 + this.wave, hostile: true, weapon: 'enemy', splash: 0 });
        this.event('enemy-shot', from);
      }
      if (this.state !== 'playing') break;
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i], start = { x: b.x, y: b.y, z: b.z };
      const end = { x: b.x + b.vx * dt, y: b.y + b.vy * dt, z: b.z + b.vz * dt };
      let nearest = 1.01, target = null;
      if (b.hostile) {
        const hit = segmentSphere(start, end, { x: this.player.x, y: (this.player.elevation || 0) + 1.25, z: this.player.z }, .62);
        if (hit !== null) { nearest = hit; target = this.player; }
      } else for (const e of this.enemies) {
        const hit = segmentSphere(start, end, { x: e.x, y: e.elevation + e.aimHeight, z: e.z }, e.hitRadius);
        if (hit !== null && hit < nearest) { nearest = hit; target = e; }
      }
      for (const obstacle of this.obstacles) { const t = segmentBox(start, end, obstacle); if (t !== null && t < nearest) { nearest = t; target = null; } }
      if (end.y < .06 && start.y >= .06) { const t = (start.y - .06) / (start.y - end.y); if (t < nearest) { nearest = t; target = null; } }
      if (nearest <= 1) {
        const at = { x: start.x + (end.x - start.x) * nearest, y: start.y + (end.y - start.y) * nearest, z: start.z + (end.z - start.z) * nearest };
        this.event('impact', { ...at, enemy: !!target, hostile: b.hostile, splash: b.splash });
        if (target === this.player) this.damage(b.damage);
        else if (target) this.damageEnemy(target, b.damage, at);
        if (!b.hostile && b.splash > 0) for (const e of [...this.enemies]) {
          if (e === target) continue;
          const center = { x: e.x, y: e.elevation + e.aimHeight, z: e.z }, d = Math.hypot(e.x - at.x, e.z - at.z, center.y - at.y);
          // Cover also stops blast damage; back off the impact point from a wall.
          const blast = { x: at.x - b.vx * .0001, y: at.y, z: at.z - b.vz * .0001 };
          if (d < b.splash && !this.blocked(blast, center)) this.damageEnemy(e, b.damage * (1 - d / b.splash * .65), center);
        }
        this.bullets.splice(i, 1);
      } else {
        b.x = end.x; b.y = end.y; b.z = end.z; b.life -= dt;
        if (b.life <= 0 || Math.abs(b.x) >= 99 || Math.abs(b.z) >= 99 || b.y < 0) this.bullets.splice(i, 1);
      }
    }
    if (this.wave > 0 && this.toSpawn === 0 && this.enemies.length === 0 && this.nextWave < 0 && this.state === 'playing') {
      this.score += 250 + this.wave * 50; this.event('clear', { wave: this.wave });
      if (this.wave === MAX_LEVEL) { this.state = 'won'; this.charge = 0; this.bullets = []; this.score += 2000; this.event('win'); }
      else this.nextWave = 5;
    }
  }
  snapshot() { return { equipment: this.equipment, state: this.state, player: { ...this.player }, wave: this.wave, maxLevel: MAX_LEVEL, score: this.score, kills: this.kills, time: this.time,
    weaponIndex: this.weaponIndex, weapon: { ...this.weapon }, unlockedWeapons: this.unlockedWeapons.map(w => w.id), ammo: this.ammo[this.weaponIndex],
    reloadRemaining: this.reloadRemaining, charge: this.charge, regenerating: this.regenerating, regenIn: Math.max(0, REGEN_DELAY - (this.time - this.lastDamage)),
    toSpawn: this.toSpawn, nextWave: this.nextWave, enemies: this.enemies.map(e => ({ ...e })), bullets: this.bullets.map(b => ({ ...b })) }; }
}
