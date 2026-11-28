import {moveInArena} from './game-logic.js';

export const PARTNER_RADIUS = .36;
const STEP = .31;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Every route sample belongs to the same walkable floor as the previous one.
// Keeping the height in the node also handles bridges above another street.
export function partnerGround(game, x, z, elevation) {
  const y = game.surfaceHeight(x, z, game.time, elevation + STEP);
  if (!Number.isFinite(y) || Math.abs(y - elevation) > STEP + .025) return null;
  for (const b of game.obstacles) {
    const base = b.y || 0, top = base + b.height;
    if (b.walkableSurface || top <= y + .02 || base >= y + 1.8) continue;
    if (b.stairBody && Math.abs(x - b.x) < b.hx - .08 && top <= y + .62) continue;
    if (Math.abs(x - b.x) < b.hx + PARTNER_RADIUS && Math.abs(z - b.z) < b.hz + PARTNER_RADIUS) return null;
  }
  return {x, z, elevation: y};
}

function travel(game, from, to) {
  const length = distance(from, to), count = Math.max(1, Math.ceil(length / .30));
  let point = from;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    point = partnerGround(game, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, point.elevation);
    if (!point) return null;
  }
  return point;
}

function connects(game, a, b) {
  const end = travel(game, a, b);
  return end && Math.abs(end.elevation - b.elevation) < .33;
}

const STEPS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

// Short local reroutes are only used if the route actually walked by the
// player is obstructed. Bound the search to avoid a map-sized scan per frame.
function detour(game, from, destination) {
  const size = .85, limit = 13;
  const score = p => distance(p, destination) + Math.abs(p.elevation - destination.elevation) * 1.35;
  const key = (i, j, p) => i + ':' + j + ':' + Math.round(p.elevation * 2);
  const start = {i: 0, j: 0, point: from, parent: null, cost: 0, score: score(from)};
  const open = [start], costs = new Map([[key(0, 0, from), 0]]);
  let closest = start;
  for (let visited = 0; visited < 180 && open.length; visited++) {
    let next = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].cost + 1.15 * open[i].score < open[next].cost + 1.15 * open[next].score) next = i;
    }
    const [node] = open.splice(next, 1);
    if (node.score < closest.score) closest = node;
    if (node.score < 2 && connects(game, node.point, destination)) { closest = node; break; }
    for (const [di, dj] of STEPS) {
      const i = node.i + di, j = node.j + dj;
      if (Math.abs(i) > limit || Math.abs(j) > limit) continue;
      const point = travel(game, node.point, {x: from.x + i * size, z: from.z + j * size});
      if (!point) continue;
      const id = key(i, j, point), cost = node.cost + Math.hypot(di, dj) * size;
      if (cost >= (costs.get(id) ?? Infinity)) continue;
      costs.set(id, cost);
      open.push({i, j, point, parent: node, cost, score: score(point)});
    }
  }
  if (closest === start) return null;
  let node = closest;
  while (node.parent && !connects(game, from, node.point)) node = node.parent;
  return node === start ? null : node.point;
}

export function partnerFormation(game, player, heading, side) {
  const c = Math.cos(heading), s = Math.sin(heading);
  for (const [lateral, back] of [[side * 2.35, 2.15], [-side * 2.35, 2.15], [0, 2.8], [side * 1.75, -.5], [-side * 1.75, -.5]]) {
    const point = partnerGround(game, player.x + c * lateral + s * back, player.z - s * lateral + c * back, player.elevation);
    if (point) return point;
  }
  return null;
}

export function createPartnerRoute() {
  const trail = [];
  let nextSearch = 0, waypoint = null;
  return {
    reset() { trail.length = 0; nextSearch = 0; waypoint = null; },
    remember(game) {
      const p = game.player;
      if (!p.grounded) return;
      const last = trail.at(-1);
      if (last && distance(last, p) < .68 && Math.abs(last.elevation - p.elevation) < .22) return;
      trail.push({x: p.x, z: p.z, elevation: p.elevation});
      if (trail.length > 96) trail.shift();
    },
    choose(game, from, destination, {follow = true} = {}) {
      if (game.time < nextSearch && waypoint && distance(from, waypoint) > .27) return waypoint;
      if (game.time < nextSearch && !waypoint) return null;
      nextSearch = game.time + .24;
      if (distance(from, destination) < 9 && connects(game, from, destination)) return waypoint = destination;
      if (follow) for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i], gap = distance(from, p);
        if (gap < .60 || gap > 7 || distance(p, game.player) < 1.7 || Math.abs(from.elevation - p.elevation) > 2.7) continue;
        if (connects(game, from, p)) {
          trail.splice(0, i);
          return waypoint = p;
        }
      }
      nextSearch = game.time + .46;
      return waypoint = detour(game, from, destination);
    },
  };
}

export function moveHeroPartner(game, actor, vx, vz, dt) {
  const start = {x: actor.x, z: actor.z, elevation: actor.elevation};
  const slices = Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / .079));
  for (let i = 0; i < slices; i++) {
    const x = actor.x, z = actor.z;
    moveInArena(actor, vx * dt / slices, vz * dt / slices, PARTNER_RADIUS, game.obstacles);
    const point = partnerGround(game, actor.x, actor.z, actor.elevation);
    const p = game.player;
    const crowding = Math.abs(p.elevation - actor.elevation) < .55 && distance(actor, p) < .92 && distance(actor, p) < Math.hypot(x - p.x, z - p.z);
    if (point && !crowding) actor.elevation = point.elevation;
    else { actor.x = x; actor.z = z; break; }
  }
  actor.vx = (actor.x - start.x) / dt;
  actor.vz = (actor.z - start.z) / dt;
  return distance(actor, start);
}
