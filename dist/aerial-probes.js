// S-03: former municipal surveillance probes now controlled by the hostile AI.
// Flight is simulated in three dimensions; roofs and catwalk undersides remain
// solid, and projectiles keep their locked direction after the warning.
import { hostileShotProfile, predictShot } from './enemy-fire.js';
export const PROBE = Object.freeze({radius: .9, height: 1.08, aimHeight: .55, hover: 2.7, windup: .7});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function moveProbe(game, enemy, dx, dy, dz, segmentBox) {
  const edge = 100 - PROBE.radius - 1;
  for (const [axis, delta] of [['x', dx], ['z', dz], ['elevation', dy]]) {
    if (Math.abs(delta) < 1e-9) continue;
    const start = {x: enemy.x, y: enemy.elevation + PROBE.aimHeight, z: enemy.z};
    const end = {...start}; const coordinate = axis === 'elevation' ? 'y' : axis;
    end[coordinate] = axis === 'elevation' ? Math.max(PROBE.aimHeight + .15, start.y + delta) : clamp(start[coordinate] + delta, -edge, edge);
    let nearest = 1;
    for (const box of game.obstacles) {
      // Broad-phase rejection avoids constructing expanded boxes for buildings
      // far from this short flight segment. Include walkable slabs in flight.
      if (Math.min(start.x, end.x) > box.x + box.hx + PROBE.radius || Math.max(start.x, end.x) < box.x - box.hx - PROBE.radius
        || Math.min(start.z, end.z) > box.z + box.hz + PROBE.radius || Math.max(start.z, end.z) < box.z - box.hz - PROBE.radius) continue;
      const hit = segmentBox(start, end, {...box, hx: box.hx + PROBE.radius, hz: box.hz + PROBE.radius,
        y: (box.y || 0) - (PROBE.height - PROBE.aimHeight), height: box.height + PROBE.height});
      if (hit !== null) nearest = Math.min(nearest, Math.max(0, hit - .01));
    }
    enemy[axis] += (end[coordinate] - start[coordinate]) * nearest;
  }
}

export function updateProbe(game, e, dt, segmentBox) {
  if(!(dt>0))return;
  e.grounded = false; e.onLift = null; e.elevation ??= PROBE.hover;
  const eye = {x: e.x, y: e.elevation + PROBE.aimHeight, z: e.z};
  const target = {x: game.player.x, y: game.player.elevation + (game.player.crouched ? .83 : 1.25), z: game.player.z};
  const dx = target.x - eye.x, dz = target.z - eye.z, range = Math.hypot(dx, dz) || .001;
  const seen = range < 43 && !game.blocked(eye, target);
  const stunned = (e.stunnedUntil || 0) > game.time;
  if (seen) {
    if (e.awareness !== 'engaged') game.event('spotted', {id: e.id});
    e.awareness = 'engaged'; e.lastSeenAt = game.time; e.lastKnownX = target.x; e.lastKnownZ = target.z;
    e.lastKnownHeight = game.player.elevation; e.alertedUntil = game.time + 3;
  } else e.awareness = game.time < (e.alertedUntil || 0) ? 'search' : 'patrol';

  let vx = 0, vz = 0;
  if (e.awareness === 'engaged') {
    const approach = clamp((range - 14) / 5, -1, 1), side = e.id % 2 ? 1 : -1;
    vx = dx / range * approach + dz / range * .27 * side;
    vz = dz / range * approach - dx / range * .27 * side;
  } else if (e.awareness === 'search') {
    const x = e.lastKnownX - e.x, z = e.lastKnownZ - e.z, distance = Math.hypot(x, z);
    if (distance > 2) {vx = x / distance * .65; vz = z / distance * .65;}
  } else {
    e.patrolTimer = (e.patrolTimer || 0) - dt;
    if (e.patrolTimer <= 0) {e.patrolAngle = (e.patrolAngle || 0) + .6 + game.random(); e.patrolTimer = 1.8 + game.random() * 2;}
    const hx = (e.homeX ?? e.x) - e.x, hz = (e.homeZ ?? e.z) - e.z;
    if (Math.hypot(hx, hz) > 13) e.patrolAngle = Math.atan2(hx, hz);
    vx = Math.sin(e.patrolAngle || 0) * .4; vz = Math.cos(e.patrolAngle || 0) * .4;
  }
  const norm = Math.max(1, Math.hypot(vx, vz)), speed = (e.speed??3.6) * (stunned?.03:(e.limpUntil||0)>game.time?.55:1);
  vx = vx / norm * speed; vz = vz / norm * speed;
  let desiredHeight = (e.awareness === 'patrol' ? (e.homeHeight || 0) : e.lastKnownHeight || 0) + PROBE.hover
    + Math.sin(game.time * 1.5 + (e.phase||0)) * .18;
  // Orbit a blocking wall rather than repeatedly pushing directly into it.
  const ahead = {x: eye.x + vx * .65, y: eye.y, z: eye.z + vz * .65};
  if (game.blocked(eye, ahead)) {
    const sign = e.id % 2 ? 1 : -1, sideX = -vz * sign, sideZ = vx * sign;
    if (!game.blocked(eye, {x: eye.x + sideX * .65, y: eye.y, z: eye.z + sideZ * .65})) {vx = sideX; vz = sideZ;}
    else {vx = 0; vz = 0;}
  }
  const beforeX = e.x, beforeZ = e.z, beforeY = e.elevation;
  moveProbe(game, e, vx * dt, clamp(desiredHeight - e.elevation, -2.3, 2.3) * dt, vz * dt, segmentBox);
  e.motionX = (e.x - beforeX) / dt; e.motionZ = (e.z - beforeZ) / dt;
  e.verticalSpeed = (e.elevation - beforeY) / dt;
  const sight = e.chargeRemaining > 0 && e.lockedTarget ? e.lockedTarget : target;
  e.yaw = e.awareness === 'engaged' ? Math.atan2(sight.x-eye.x, sight.z-eye.z) + Math.PI : Math.atan2(vx, vz) + Math.PI;
  e.aimPitch = Math.atan2(sight.y-eye.y, Math.hypot(sight.x-eye.x,sight.z-eye.z)||.001);

  if (stunned || !seen || e.awareness !== 'engaged' || range > 35) {
    e.chargeRemaining = 0; e.chargeProgress = 0; e.lockedTarget = null;
    e.attackTimer = Math.max(.5, (e.attackTimer || 0) - dt); return;
  }
  if (e.chargeRemaining > 0) {
    e.chargeRemaining = Math.max(0, e.chargeRemaining - dt);
    e.chargeProgress = 1 - e.chargeRemaining / PROBE.windup;
    if (e.chargeRemaining === 0 && e.lockedTarget) {
      const shot = e.lockedTarget, horizontal = Math.hypot(shot.x-e.x,shot.z-e.z)||.001;
      const pitch = Math.atan2(shot.y-e.elevation-PROBE.aimHeight,horizontal),reach=.35+.18*Math.cos(pitch);
      const origin = {x:e.x+(shot.x-e.x)/horizontal*reach,y:e.elevation+PROBE.aimHeight+.18*Math.sin(pitch),z:e.z+(shot.z-e.z)/horizontal*reach};
      const x = shot.x - origin.x, y = shot.y - origin.y, z = shot.z - origin.z;
      const distance = Math.hypot(x, y, z) || 1, speed = hostileShotProfile(game.wave,'probe').speed;
      // A moved player can dodge. A new wall in the original line stops the shot.
      if (!game.blocked(origin, shot)) {
        game.bullets.push({id: game.nextId++, ...origin, vx: x / distance * speed, vy: y / distance * speed, vz: z / distance * speed,
          life: 3, damage: 8 + Math.floor(game.wave * .6), hostile: true, weapon: 'probe', splash: 0});
        e.lastShotAt = game.time; game.event('enemy-shot', {...origin, form: 'probe'});
      }
      e.chargeProgress = 0; e.lockedTarget = null; e.attackTimer = hostileShotProfile(game.wave,'probe').interval;
    }
  } else {
    e.attackTimer = (e.attackTimer || 0) - dt;
    if (e.attackTimer <= 0) {
      const profile=hostileShotProfile(game.wave,'probe');
      e.lockedTarget = predictShot(eye,target,game.playerVelocity,profile.speed,profile.lead); e.chargeRemaining = PROBE.windup; e.chargeProgress = .01;
      game.event('probe-charge', {...eye, id: e.id});
    }
  }
}
