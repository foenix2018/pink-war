// Armour combat layer (3.63, « jouabilité Halo » without copying it — Tome II §36): an energy shield over health,
// a close-quarters strike and a thrown impulse charge. Shared by every ArenaGame engine (M01, M02, Arena, Range).
// The engines switch the shield on with enableArmorShield(); unit tests of the bare core keep health only.

export const SHIELD_MAX = 60, SHIELD_DELAY = 3.4, SHIELD_RATE = 32;
// The butt-stroke lands when the animation makes contact, not when the key is pressed: the blow is resolved after
// MELEE_IMPACT_DELAY on engines that enable it (enableArmorShield); the bare core still resolves it at once.
export const MELEE_IMPACT_DELAY = .19;
export const MELEE_RANGE = 2.3, MELEE_DAMAGE = 80, MELEE_BACK_MULTIPLIER = 3, MELEE_COOLDOWN = .9, MELEE_CONE = Math.cos(50 * Math.PI / 180);
// Throw: a fixed release speed along the line of sight (no hidden upward boost), real gravity, a little drag, so the
// distance depends on the height of the hand and on the angle given: flat from the shoulder it lands ≈ 8 m away,
// at 30° ≈ 22 m, at 45° ≈ 25 m. The fuse leaves time for the longest lob to land and roll before it goes off.
export const CHARGE_START = 2, CHARGE_MAX = 4, CHARGE_FUSE = 2.6, CHARGE_RADIUS = 5.5, CHARGE_DAMAGE = 650, CHARGE_SPEED = 15.5, CHARGE_STUN = 1.2;
export const CHARGE_GRAVITY = 9.81, CHARGE_DRAG = .002, CHARGE_BODY = .06;
export const CHARGE_GROUND_BOUNCE = .34, CHARGE_WALL_BOUNCE = .42, CHARGE_GROUND_GRIP = .50, CHARGE_ROLL_DECEL = 6.5;
export const CHARGE_CONTACT_RADIUS = 1.4, CHARGE_MID_RADIUS = 3.3, CHARGE_MID_DAMAGE = 120, CHARGE_SELF_FACTOR = .72;
const CHARGE_COOLDOWN = .8, SUBSTEP = 1 / 120;
// Slab test of a segment against an obstacle box (same convention as game-logic's segmentBox, kept local so this
// module stays free of a circular import): the entry fraction in [0, 1], or null.
function segmentBox(start, end, box) {
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

// Forward on the ground for a player yaw (the engine moves by (-sin, -cos) when walking forward).
export const forwardOf = yaw => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });

// Damage first drains the shield; what it cannot hold reaches health (bleed-through).
export function soakDamage(player, amount) {
  const shield = Math.max(0, player.shield || 0), held = Math.min(shield, amount);
  player.shield = shield - held;
  return { held, rest: amount - held, broke: shield > 0 && player.shield <= 0 };
}

// After SHIELD_DELAY seconds without damage the shield recharges in full at SHIELD_RATE per second.
export function rechargeShield(game, dt) {
  const capacity = game.shieldCapacity || 0, p = game.player;
  if (capacity <= 0 || p.shield >= capacity) { game.shieldCharging = false; return; }
  if (game.time - game.lastDamage < SHIELD_DELAY) return;
  if (!game.shieldCharging) { game.shieldCharging = true; game.event('shield-recharge', { shield: p.shield }); }
  p.shield = Math.min(capacity, p.shield + SHIELD_RATE * dt);
  if (p.shield >= capacity) { game.shieldCharging = false; game.event('shield-full'); }
}

// Start a butt-stroke. The blow lands (and its sound, knock-back and damage happen) when the swing makes contact.
export function meleeStrike(game, forward = forwardOf(game.player.yaw)) {
  if (game.state !== 'playing' || game.weapon?.melee || game.time < (game.meleeReadyAt || 0)) return false;
  game.meleeReadyAt = game.time + MELEE_COOLDOWN; game.meleeAt = game.time;
  game.cooldown = Math.max(game.cooldown, .35);
  game.event('melee-start', {});
  const delay = game.meleeDelay || 0;
  if (delay > 0) { game.meleePending = { at: game.time + delay, forward: { x: forward.x, z: forward.z } }; return true; }
  return resolveMelee(game, forward);
}
export function updateMelee(game) {
  const m = game.meleePending; if (!m || game.time < m.at) return;
  game.meleePending = null; if (game.state === 'playing') resolveMelee(game, m.forward);
}
function resolveMelee(game, forward) {
  const p = game.player, n = Math.hypot(forward.x, forward.z) || 1, fx = forward.x / n, fz = forward.z / n;
  const eye = { x: p.x, y: p.elevation + (p.crouched ? .9 : 1.35), z: p.z };
  let best = null, bestDistance = Infinity;
  for (const e of [...game.enemies,...(game.turrets||[]).filter(t=>t.hp>0)]) {
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
    if (d > MELEE_RANGE + (e.radius || .5) || Math.abs((e.elevation || 0) - p.elevation) > 1.6) continue;
    if (d > .2 && (dx * fx + dz * fz) / d < MELEE_CONE) continue;
    if (game.blocked(eye, { x: e.x, y: (e.elevation || 0) + (e.aimHeight || 1.15) * .8, z: e.z })) continue;
    if (d < bestDistance) { best = e; bestDistance = d; }
  }
  if (!best) { game.event('melee', { hit: false }); return true; }
  // From behind: the unit faces away from the player (yaw - PI is its facing, as in the perception code).
  const facing = (best.yaw ?? 0) - Math.PI, toPlayerX = p.x - best.x, toPlayerZ = p.z - best.z, m = Math.hypot(toPlayerX, toPlayerZ) || 1;
  const back = (Math.sin(facing) * toPlayerX + Math.cos(facing) * toPlayerZ) / m < -.35;
  const at = { x: best.x, y: (best.elevation || 0) + (best.aimHeight || 1.15), z: best.z };
  best.stunnedUntil = Math.max(best.stunnedUntil || 0, game.time + .6);
  const push = Math.min(.8, Math.max(0, MELEE_RANGE + .6 - bestDistance));
  if (!best.defenceTurret && push > 0 && game.knockback) game.knockback(best, fx * push, fz * push);
  game.event('melee', { hit: true, back, id: best.id, ...at });
  if(best.defenceTurret)game.damageDefenseTurret(best,MELEE_DAMAGE,{weapon:'melee',at});
  else game.damageEnemy(best, MELEE_DAMAGE * (back ? MELEE_BACK_MULTIPLIER : 1), at, 'torso', 1, p);
  return true;
}

// The point the grenade leaves the hand: in front of the eye, to the right and below it (the throwing hand), kept
// on the near side of any wall in front of the thrower.
function releasePoint(game, origin, n) {
  const flat = Math.hypot(n.x, n.z) || 1, rx = -n.z / flat, rz = n.x / flat;
  const hand = { x: origin.x + rx * .2, y: origin.y - .14, z: origin.z + rz * .2 };
  return game.blocked?.(origin, hand) ? { ...origin } : hand;
}
// Throw an impulse charge along the view: release speed CHARGE_SPEED plus whatever the thrower's own movement adds.
export function throwCharge(game, origin, direction) {
  if (game.state !== 'playing' || (game.charges || 0) <= 0 || game.time < (game.chargeReadyAt || 0)) return false;
  const len = Math.hypot(direction.x, direction.y, direction.z) || 1, n = { x: direction.x / len, y: direction.y / len, z: direction.z / len };
  game.charges--; game.chargeReadyAt = game.time + CHARGE_COOLDOWN; game.chargeAt = game.time;
  const at = releasePoint(game, origin, n), pv = game.playerVelocity || { x: 0, z: 0 }, pk = Math.hypot(pv.x, pv.z) > 9 ? 9 / Math.hypot(pv.x, pv.z) : 1, run = { x: (pv.x || 0) * pk, z: (pv.z || 0) * pk };
  // Throwing steeply upwards is weaker (the arm cannot drive the grenade straight up as hard as it drives it ahead).
  const speed = CHARGE_SPEED * (1 - .35 * Math.max(0, (n.y - .766) / .234));
  // Backspin about the axis across the throw, plus a slow twist along it, like a grenade rolled off the fingers.
  const flat = Math.hypot(n.x, n.z) || 1, side = { x: -n.z / flat, z: n.x / flat };
  const charge = { id: game.nextId++, x: at.x, y: at.y, z: at.z,
    vx: n.x * speed + run.x, vy: n.y * speed, vz: n.z * speed + run.z,
    spin: { x: side.x * -9, y: 3.5, z: side.z * -9 }, bounces: 0, resting: false, rolling: false,
    originX: at.x, originY: at.y, originZ: at.z, fuseAt: game.time + CHARGE_FUSE, thrownAt: game.time };
  (game.thrownCharges ||= []).push(charge);
  game.event('charge-throw', { id: charge.id, x: charge.x, y: charge.y, z: charge.z, charges: game.charges });
  return true;
}

export function grantCharges(game, count = 1) {
  const before = game.charges || 0; game.charges = Math.min(CHARGE_MAX, before + count);
  if (game.charges > before) game.event('charge-gain', { charges: game.charges });
}

// Face of `box` that the point `at` is on: a horizontal normal for a side, { top } for the upper face (null underneath).
function wallNormal(box, at) {
  const rx = (at.x - box.x) / (box.hx || 1), rz = (at.z - box.z) / (box.hz || 1), top = box.height ? (at.y - (box.y || 0) - box.height / 2) / (box.height / 2) : 0;
  if (Math.abs(top) > Math.max(Math.abs(rx), Math.abs(rz)) + .02) return top > 0 ? { top: true, y: (box.y || 0) + box.height } : null;
  return Math.abs(rx) >= Math.abs(rz) ? { x: Math.sign(rx) || 1, z: 0 } : { x: 0, z: Math.sign(rz) || 1 };
}
function floorUnder(game, x, y, z) {
  const h = game.groundHeight ? game.groundHeight(x, z, Math.max(0, y - CHARGE_BODY)) : game.surfaceHeight ? game.surfaceHeight(x, z, game.time, y + .05) : 0;
  return Number.isFinite(h) ? h : 0;
}
// Slope of the surface under (x, z) as a unit normal (stairs, ramps and lifts tilt the bounce).
function floorNormal(game, x, y, z) {
  const e = .25, hx0 = floorUnder(game, x - e, y, z), hx1 = floorUnder(game, x + e, y, z), hz0 = floorUnder(game, x, y, z - e), hz1 = floorUnder(game, x, y, z + e);
  const nx = (hx0 - hx1) / (2 * e), nz = (hz0 - hz1) / (2 * e), l = Math.hypot(nx, 1, nz);
  return { x: nx / l, y: 1 / l, z: nz / l };
}
// One sub-step of free flight, ground contact or roll, wall bounce.
function stepCharge(game, c, dt) {
  const spd = Math.hypot(c.vx, c.vy, c.vz);
  if (!c.resting) {
    c.vy -= CHARGE_GRAVITY * dt;
    if (!c.rolling) { const drag = CHARGE_DRAG * spd * dt; c.vx -= c.vx * drag; c.vy -= c.vy * drag; c.vz -= c.vz * drag; }
  }
  const start = { x: c.x, y: c.y, z: c.z };
  const end = { x: c.x + c.vx * dt, y: c.y + c.vy * dt, z: c.z + c.vz * dt };
  // Walls: the nearest face crossed by the path; reflect the horizontal velocity about it and lose some energy.
  let hit = null, hitT = 2;
  for (const box of game.obstacles || []) {
    const t = segmentBox({ x: start.x, y: start.y, z: start.z }, { x: end.x, y: start.y + (end.y - start.y), z: end.z }, box);
    if (t !== null && t < hitT) { const point = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t, z: start.z + (end.z - start.z) * t }, normal = wallNormal(box, point); if (normal) { hit = { point, normal }; hitT = t; } }
  }
  if (hit) {
    const { point, normal } = hit, vn = c.vx * (normal.x || 0) + c.vz * (normal.z || 0);
    if (normal.top) {
      // Landing on top of a crate or a wall: bounce, then roll along the top until it drops off an edge.
      c.x = point.x; c.z = point.z; c.y = normal.y + CHARGE_BODY;
      if (c.vy < -1.5) { c.vy *= -CHARGE_GROUND_BOUNCE; c.vx *= 1 - CHARGE_GROUND_GRIP; c.vz *= 1 - CHARGE_GROUND_GRIP; c.bounces++; game.event?.('charge-bounce', { id: c.id, x: c.x, y: c.y, z: c.z, speed: -c.vy }); }
      else { c.vy = 0; c.rolling = true; const h = Math.hypot(c.vx, c.vz); if (h > 0) { const f = Math.max(0, h - CHARGE_ROLL_DECEL * dt) / h; c.vx *= f; c.vz *= f; } }
    } else if (vn < 0) {
      c.vx -= (1 + CHARGE_WALL_BOUNCE) * vn * normal.x; c.vz -= (1 + CHARGE_WALL_BOUNCE) * vn * normal.z;
      c.vx *= .86; c.vz *= .86; c.vy *= .92; c.bounces++; c.spin.y += normal.x * 2.2;
    }
    if (!normal.top) { c.x = point.x + normal.x * .07; c.z = point.z + normal.z * .07; c.y = start.y + (end.y - start.y) * hitT; }
  } else { c.x = end.x; c.y = end.y; c.z = end.z; }
  // Ground (or any surface it falls onto).
  const floor = floorUnder(game, c.x, c.y, c.z) + CHARGE_BODY;
  if (c.y <= floor) {
    const n = floorNormal(game, c.x, c.y, c.z), vn = c.vx * n.x + c.vy * n.y + c.vz * n.z;
    c.y = floor;
    if (vn < 0) {
      if (-vn > 1.5) {
        const k = (1 + CHARGE_GROUND_BOUNCE) * vn; c.vx -= k * n.x; c.vy -= k * n.y; c.vz -= k * n.z;
        const t = c.vx * n.x + c.vy * n.y + c.vz * n.z; c.vx -= (c.vx - t * n.x) * CHARGE_GROUND_GRIP; c.vz -= (c.vz - t * n.z) * CHARGE_GROUND_GRIP;
        c.bounces++; c.spin.x *= .7; c.spin.z *= .7; c.rolling = false;
        game.event?.('charge-bounce', { id: c.id, x: c.x, y: c.y, z: c.z, speed: -vn });
      } else { c.vx -= vn * n.x; c.vy -= vn * n.y; c.vz -= vn * n.z; c.rolling = true; }
    }
    if (c.rolling || vn >= 0 && Math.abs(c.vy) < .3) {
      c.rolling = true; c.vy = 0;
      const horizontal = Math.hypot(c.vx, c.vz);
      if (horizontal > 0) { const slow = Math.min(horizontal, CHARGE_ROLL_DECEL * dt), f = (horizontal - slow) / horizontal; c.vx *= f; c.vz *= f; }
      // It follows the slope under it, rolling downhill when the ground tilts.
      c.vx += n.x * 2.2 * dt; c.vz += n.z * 2.2 * dt;
      if (Math.hypot(c.vx, c.vz) < .12 && Math.abs(n.x) + Math.abs(n.z) < .08) { c.vx = c.vz = 0; c.resting = true; }
    }
  }
  // The visible spin follows the motion: a rolling grenade turns at v / r, a resting one stops.
  if (c.resting) c.spin = { x: 0, y: 0, z: 0 };
  else if (c.rolling) { const v = Math.hypot(c.vx, c.vz) || 0, r = CHARGE_BODY; c.spin = { x: (c.vz / r) * .7, y: c.spin.y * .96, z: (-c.vx / r) * .7 }; }
}
// Fly, bounce off the ground and walls, roll, and go off when the fuse runs out.
export function updateCharges(game, dt) {
  const list = game.thrownCharges; if (!list?.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i]; c.spin ||= { x: 0, y: 0, z: 0 };
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP)), h = dt / steps;
    for (let k = 0; k < steps; k++) stepCharge(game, c, h);
    if (game.time >= c.fuseAt) { list.splice(i, 1); detonateCharge(game, c); }
  }
}

// Contact is devastating; a two-stage smooth curve fades to zero at the
// established 5.5 m radius. The thrower shares this range, with self-damage
// still passing through the ordinary energy-shield/health calculation.
export function chargeDamageAt(distance,{self=false}={}){
  if(!Number.isFinite(distance)||distance>=CHARGE_RADIUS)return 0;
  const d=Math.max(0,distance);
  let damage;
  if(d<=CHARGE_CONTACT_RADIUS)damage=CHARGE_DAMAGE;
  else if(d<=CHARGE_MID_RADIUS){
    const t=(d-CHARGE_CONTACT_RADIUS)/(CHARGE_MID_RADIUS-CHARGE_CONTACT_RADIUS);
    const smooth=t*t*(3-2*t);
    damage=CHARGE_DAMAGE+(CHARGE_MID_DAMAGE-CHARGE_DAMAGE)*smooth;
  }else{
    const remaining=1-(d-CHARGE_MID_RADIUS)/(CHARGE_RADIUS-CHARGE_MID_RADIUS);
    damage=CHARGE_MID_DAMAGE*Math.pow(Math.max(0,remaining),1.25);
  }
  return Math.max(0,damage*(self?CHARGE_SELF_FACTOR:1));
}

// Proximity damage affects every enemy and the thrower. Solid cover still blocks it.
export function detonateCharge(game, c) {
  const at = { x: c.x, y: c.y + .25, z: c.z };
  game.event('charge-blast', { ...at, radius: CHARGE_RADIUS });
  game.emitNoise?.('blast', 30);
  for (const e of [...game.enemies]) {
    const center = { x: e.x, y: (e.elevation || 0) + (e.aimHeight || 1.15) * .7, z: e.z };
    const d = Math.hypot(center.x - at.x, center.y - at.y, center.z - at.z);
    if (d > CHARGE_RADIUS || game.blocked(at, center)) continue;
    e.stunnedUntil = Math.max(e.stunnedUntil || 0, game.time + CHARGE_STUN);
    game.damageEnemy(e, chargeDamageAt(d), center, 'torso', 1, { x: at.x, z: at.z, elevation: at.y });
  }
  for(const t of game.turrets||[]){const center={x:t.x,y:1.75,z:t.z},d=Math.hypot(center.x-at.x,center.y-at.y,center.z-at.z);
    if(t.hp>0&&d<CHARGE_RADIUS&&!game.blocked(at,center))game.damageDefenseTurret(t,chargeDamageAt(d),{weapon:'charge',at:center,source:{x:c.originX??c.x,y:c.originY??c.y,z:c.originZ??c.z}});}
  const p = game.player, chest = { x: p.x, y: p.elevation + 1.1, z: p.z }, d = Math.hypot(chest.x - at.x, chest.y - at.y, chest.z - at.z);
  if (d < CHARGE_RADIUS && !game.blocked(at, chest)) game.damage(chargeDamageAt(d,{self:true}), at, {pierceInvulnerability:true});
}
