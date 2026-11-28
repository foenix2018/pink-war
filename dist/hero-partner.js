import {WEAPONS,segmentSphere} from './game-logic.js';
import {enemyScale} from './enemy-combat.js';
import {createTargetLock} from './target-lock.js';
import {createPartnerRoute,moveHeroPartner,partnerFormation,partnerGround} from './hero-partner-navigation.js';

export const PARTNER_WEAPONS = {
  ghju: {index: 0, magazine: 10, burst: 2, gap: .24, rest: .62, reload: 1.22, range: 24, damage: 13, color: 0xff75b8},
  lylu: {index: 8, magazine: 15, burst: 3, gap: .19, rest: .85, reload: 1.38, range: 33, damage: 11, color: 0x70beff},
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleTo = (a, b) => Math.atan2(a.x - b.x, a.z - b.z);
const difference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const chest = p => ({x: p.x, y: p.elevation + (p.crouched ? .77 : 1.39), z: p.z});
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function aimPoint(e) {
  const scale = enemyScale(e.form, e.elite) * (e.roomScale || 1);
  const height = e.form === 'probe' ? .55 : e.form === 'scuttler' ? .79 : 1.27;
  return {x: e.x, y: (e.elevation || 0) + (height - (e.coverCrouch || 0) * .45) * scale, z: e.z};
}

function fireLine(game, from, to) {
  return !game.blocked(from, to) && segmentSphere(from, to, chest(game.player), .70) === null;
}

function shot(game, id, cfg, origin, target) {
  const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z;
  const n = Math.hypot(dx, dy, dz);
  if (n < .3 || n > cfg.range + 1 || !fireLine(game, origin, target)) return false;
  const weapon = WEAPONS[cfg.index], velocity = 74 / n;
  const bullet = {
    id: game.nextId++, ...origin, vx: dx * velocity, vy: dy * velocity, vz: dz * velocity,
    life: .85, damage: cfg.damage, hostile: false, weapon: weapon.id, power: .66, splash: 0,
    companion: true, partner: id, color: cfg.color, originX: origin.x, originY: origin.y,
    originZ: origin.z, originElevation: origin.y - 1.35,
  };
  game.bullets.push(bullet);
  game.event('partner-shot', {hero: id, origin, bulletId: bullet.id, weapon: weapon.id, power: bullet.power, color: cfg.color});
  return true;
}

export function createHeroPartner({id, meeting} = {}) {
  const cfg = PARTNER_WEAPONS[id], side = id === 'ghju' ? -1 : 1;
  const route = createPartnerRoute(), lock = createTargetLock({ratio: .70, hold: .48});
  let player, state, phase, heading, nextThreat, nextShot, burst, reloadUntil, lastTravel, target;

  function place(game, point, waiting) {
    state = point ? {
      ...point, yaw: game.player.yaw || 0, vx: 0, vz: 0, worldBounds: game.player.worldBounds,
      mode: waiting ? 'meeting' : 'follow', aim: false, aimPitch: 0, crouched: false,
      ammo: cfg.magazine, shotAt: -Infinity, shots: 0, dialogue: null, reload: 0, target: null,
    } : null;
    heading = game.player.yaw || 0;
    nextShot = game.time + .55;
    nextThreat = 0;
    lastTravel = game.time;
    target = null;
    burst = reloadUntil = 0;
    route.reset();
    lock.reset();
  }

  function sync(game, stage) {
    const next = meeting && stage < meeting.stage ? 'separate' : meeting && stage === meeting.stage ? 'meeting' : 'together';
    if (phase === next && player === game.player && (state || next === 'separate')) return state;
    const leftMeeting = phase === 'meeting' && next === 'together' && player === game.player && state;
    phase = next;
    player = game.player;
    if (leftMeeting) { state.mode = 'follow'; return state; }
    if (next === 'separate') place(game, null, false);
    else {
      const start = next === 'meeting' ? partnerGround(game, meeting.x, meeting.z, meeting.y) :
        partnerFormation(game, player, player.yaw || 0, side) || partnerGround(game, player.x, player.z, player.elevation);
      place(game, start, next === 'meeting');
    }
    return state;
  }

  function step(game, stage, dt, speaker, pose = () => {}, muzzle = chest) {
    sync(game, stage);
    if (!state || !(dt > 0) || game.state !== 'playing') return state;
    const time = game.time, gap = distance(state, player);
    const isTalk = speaker === id || speaker === game.characterId;
    route.remember(game);
    state.dialogue = null;
    if (phase === 'meeting') {
      if (gap < 18) state.yaw += difference(angleTo(state, player), state.yaw) * (1 - Math.exp(-dt * 8));
      state.dialogue = speaker === id ? 'speaking' : isTalk ? 'listening' : null;
      pose(state, dt);
      return state;
    }
    if (time >= nextThreat) {
      nextThreat = time + .16;
      const eye = chest(state);
      const candidates = game.enemies.filter(e => e.hp > 0 && distance(e, state) < cfg.range &&
        distance(e, player) < 30 && !game.blocked(eye, aimPoint(e)));
      target = lock.pick(candidates, e => distance(e, player) + .28 * distance(e, state), time);
    }
    if (target && (!game.enemies.includes(target) || target.hp <= 0)) target = null;
    if (reloadUntil && time >= reloadUntil) {
      reloadUntil = 0;
      state.ammo = cfg.magazine;
    }
    const movement = game.planarVelocity || game.playerVelocity;
    if (movement && Math.hypot(movement.x, movement.z) > .8) {
      heading += difference(Math.atan2(-movement.x, -movement.z), heading) * (1 - Math.exp(-dt * 4));
    }
    const formation = partnerFormation(game, player, heading, side);
    // A checkpoint or a flight can separate the two floors. Regroup only
    // behind the player or from outside sight, and on a verified surface.
    if (gap > 24 && formation && time - lastTravel > 2.8 &&
        (game.blocked(chest(player), chest(state)) || Math.abs(difference(angleTo(player, state), player.yaw || 0)) > 1.85)) {
      const shots = state.shots;
      place(game, formation, false);
      state.shots = shots;
      pose(state, dt);
      return state;
    }

    const aim = target && aimPoint(target), clear = aim && fireLine(game, chest(state), aim);
    const movingPlayer = movement && Math.hypot(movement.x, movement.z) > 1.35;
    const talking = isTalk && gap < 6 && !clear && !movingPlayer;
    const combat = !!aim && gap < 7.5 && !talking;
    const tooClose = target && distance(state, target) < 3.6;
    let destination = formation || {x: player.x, z: player.z, elevation: player.elevation};
    let follow = true;
    if (combat && (!clear || tooClose)) {
      const vx = target.x - state.x, vz = target.z - state.z, length = Math.hypot(vx, vz) || 1;
      for (const flank of [side, -side]) {
        const x = state.x + flank * vz / length * 1.65 - vx / length * (tooClose ? 1.95 : .25);
        const z = state.z - flank * vx / length * 1.65 - vz / length * (tooClose ? 1.95 : .25);
        const option = partnerGround(game, x, z, state.elevation);
        if (option && distance(option, player) > 1.5 && distance(option, player) < 6.3 && (fireLine(game, chest(option), aim) || tooClose)) {
          destination = option;
          follow = false;
          break;
        }
      }
    }
    const hold = talking || combat && clear && !tooClose && !movingPlayer && gap < 5.4 && gap > 1.25;
    const waypoint = !hold && route.choose(game, state, destination, {follow});
    const n = waypoint ? distance(state, waypoint) : 0;
    const speed = gap > 7 ? 5.6 : combat ? 2.30 : gap > 4.5 ? 3.7 : 2.45;
    const travel = n > .24 ? Math.min(speed, n * 3.2) : 0;
    const vx = travel ? (waypoint.x - state.x) / n * travel : 0;
    const vz = travel ? (waypoint.z - state.z) / n * travel : 0;
    if (moveHeroPartner(game, state, vx, vz, dt) > .026) lastTravel = time;

    state.aim = combat && !!clear && !reloadUntil;
    state.aimPitch = state.aim ? clamp(Math.atan2(aim.y - chest(state).y, distance(state, target)), -.7, .8) : 0;
    state.crouched = combat && !!reloadUntil && travel < .1;
    state.reload = reloadUntil ? clamp(1 - (reloadUntil - time) / cfg.reload, 0, 1) : 0;
    state.mode = talking ? 'dialogue' : reloadUntil ? 'reload' : combat ? 'combat' : 'follow';
    state.dialogue = isTalk && gap < 6 ? (speaker === id ? 'speaking' : 'listening') : null;
    state.target = target?.id ?? null;
    const face = combat ? angleTo(state, target) : talking ? angleTo(state, player) : travel ? angleTo(state, waypoint) : heading;
    state.yaw += difference(face, state.yaw) * (1 - Math.exp(-dt * (combat ? 11 : 7)));
    pose(state, dt);
    const origin = state.aim && time >= nextShot && Math.abs(difference(face, state.yaw)) < .18 ? muzzle(state) : null;
    if (origin && !game.blocked(chest(state), origin) && shot(game, id, cfg, origin, aim)) {
      state.shotAt = time;
      state.shots++;
      state.ammo--;
      burst++;
      if (!state.ammo) {
        reloadUntil = time + cfg.reload;
        nextShot = reloadUntil + .16;
        burst = 0;
      } else if (burst >= cfg.burst) {
        nextShot = time + cfg.rest;
        burst = 0;
      } else nextShot = time + cfg.gap;
    }
    return state;
  }

  return {id, weapon: cfg.index, sync, step, get state() { return state; }};
}
