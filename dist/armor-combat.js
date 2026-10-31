// Armour combat layer (3.63, « jouabilité Halo » without copying it — Tome II §36): an energy shield over health,
// a close-quarters strike and a thrown impulse charge. Shared by every ArenaGame engine (M01, M02, Arena, Range).
// The engines switch the shield on with enableArmorShield(); unit tests of the bare core keep health only.

export const SHIELD_MAX = 60, SHIELD_DELAY = 3.4, SHIELD_RATE = 32;
export const MELEE_RANGE = 2.3, MELEE_DAMAGE = 80, MELEE_BACK_MULTIPLIER = 3, MELEE_COOLDOWN = .9, MELEE_CONE = Math.cos(50 * Math.PI / 180);
export const CHARGE_START = 2, CHARGE_MAX = 4, CHARGE_FUSE = 1.4, CHARGE_RADIUS = 5.5, CHARGE_DAMAGE = 650, CHARGE_SPEED = 13, CHARGE_STUN = 1.2;
export const CHARGE_CONTACT_RADIUS = 1.4, CHARGE_MID_RADIUS = 3.3, CHARGE_MID_DAMAGE = 120, CHARGE_SELF_FACTOR = .72;
const GRAVITY = 16, CHARGE_LIFT = 3.2, CHARGE_COOLDOWN = .8;

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

// Strike whatever stands within reach in front of the player: heavy, stunning, and far worse from behind.
export function meleeStrike(game, forward = forwardOf(game.player.yaw)) {
  if (game.state !== 'playing' || game.weapon?.melee || game.time < (game.meleeReadyAt || 0)) return false;
  game.meleeReadyAt = game.time + MELEE_COOLDOWN; game.meleeAt = game.time;
  game.cooldown = Math.max(game.cooldown, .35);
  const p = game.player, n = Math.hypot(forward.x, forward.z) || 1, fx = forward.x / n, fz = forward.z / n;
  const eye = { x: p.x, y: p.elevation + (p.crouched ? .9 : 1.35), z: p.z };
  let best = null, bestDistance = Infinity;
  for (const e of game.enemies) {
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
  if (push > 0 && game.knockback) game.knockback(best, fx * push, fz * push);
  game.event('melee', { hit: true, back, id: best.id, ...at });
  game.damageEnemy(best, MELEE_DAMAGE * (back ? MELEE_BACK_MULTIPLIER : 1), at, 'torso', 1, p);
  return true;
}

// Throw an impulse charge along the view, a little upwards so it flies in an arc.
export function throwCharge(game, origin, direction) {
  if (game.state !== 'playing' || (game.charges || 0) <= 0 || game.time < (game.chargeReadyAt || 0)) return false;
  const n = Math.hypot(direction.x, direction.y, direction.z) || 1;
  game.charges--; game.chargeReadyAt = game.time + CHARGE_COOLDOWN;
  const charge = { id: game.nextId++, x: origin.x, y: origin.y, z: origin.z,
    vx: direction.x / n * CHARGE_SPEED, vy: direction.y / n * CHARGE_SPEED + CHARGE_LIFT, vz: direction.z / n * CHARGE_SPEED,
    fuseAt: game.time + CHARGE_FUSE, thrownAt: game.time };
  (game.thrownCharges ||= []).push(charge);
  game.event('charge-throw', { id: charge.id, x: charge.x, y: charge.y, z: charge.z, charges: game.charges });
  return true;
}

export function grantCharges(game, count = 1) {
  const before = game.charges || 0; game.charges = Math.min(CHARGE_MAX, before + count);
  if (game.charges > before) game.event('charge-gain', { charges: game.charges });
}

// Fly, bounce off the ground and walls, and go off when the fuse runs out.
export function updateCharges(game, dt) {
  const list = game.thrownCharges; if (!list?.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i], start = { x: c.x, y: c.y, z: c.z };
    c.vy -= GRAVITY * dt;
    const end = { x: c.x + c.vx * dt, y: c.y + c.vy * dt, z: c.z + c.vz * dt };
    if (game.blocked(start, { x: end.x, y: start.y, z: end.z })) { c.vx *= -.4; c.vz *= -.4; end.x = start.x; end.z = start.z; }
    const ground = game.surfaceHeight ? game.surfaceHeight(end.x, end.z, game.time, start.y + .05) : 0;
    const floor = Number.isFinite(ground) ? ground : 0;
    if (end.y <= floor + .06) { end.y = floor + .06; if (c.vy < 0) { c.vy = Math.abs(c.vy) > 1.2 ? -c.vy * .32 : 0; c.vx *= .6; c.vz *= .6; } }
    c.x = end.x; c.y = end.y; c.z = end.z;
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
  const p = game.player, chest = { x: p.x, y: p.elevation + 1.1, z: p.z }, d = Math.hypot(chest.x - at.x, chest.y - at.y, chest.z - at.z);
  if (d < CHARGE_RADIUS && !game.blocked(at, chest)) game.damage(chargeDamageAt(d,{self:true}), at, {pierceInvulnerability:true});
}
