// MISSION 03 — objective guidance that follows the real ground instead of a straight line through the annexe, the
// workshop or the containers. One target per stage (the device, the reading the stage waits for, or the ambulance
// while escorting it), then a path on a 1 m grid built from the same obstacles as the physics, and the stairway for
// the A3 deck. The arrow points at the farthest point of that path still in plain sight.
import * as L from './m03-layout.js';
import {arrowGuidance} from './objective-arrow.js';

// The interaction each stage is waiting for (readings included: they move the story on).
export const STAGE_TARGET = Object.freeze({ arrivee: 'ines', alimentation: 'alimentation', dossier: 'dossier', kit: 'kit', atelier: 'manifeste', verin: 'verin',
  depot: 'cellules', transfo: 'transfo', detenus: 'cellule', a3: 'relais', balise: 'balise', barriere: 'barriere', echangeur: 'treuil', arrimage: 'arrimage', regulation: 'regulation' });
const ESCORT = new Set(['escorte', 'escorte2', 'gare']);

export function m03Target(mission, game) {
  if (!mission || !game) return null;
  const s = mission.stageId, p = game.player;
  if (ESCORT.has(s)) {
    // Walk with the ambulance: a point just behind it, on its side of the road.
    const v = mission.van, back = { x: v.x + Math.sin(v.yaw) * 5, z: v.z + Math.cos(v.yaw) * 5 };
    return { x: back.x, z: back.z, y: 0, label: 'ESCORTER L’AMBULANCE', id: 'van', near: 6 };
  }
  const id = STAGE_TARGET[s]; if (!id) return null;
  const it = L.INTERACTIONS.find(i => i.id === id); if (!it) return null;
  // Name the local encounter that locks this device. Never send the player
  // after an unrelated patrol on the other side of the district.
  const lock=s==='kit'&&(mission.done||[]).includes('kit')?['annexe',0]:s==='verin'?['atelier',0]:s==='balise'?['fracture',1]:s==='echangeur'?['echangeur',1]:s==='arrimage'?['gare',0]:null;
  if(lock&&mission.alive?.(lock[0])>lock[1]){
    const foes=game.enemies.filter(e=>e.mission===lock[0]);
    const foe=foes.reduce((b,e)=>!b||Math.hypot(e.x-p.x,e.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?e:b,null);
    if(foe)return{x:foe.x,z:foe.z,y:foe.elevation||0,label:'SÉCURISER LA ZONE · '+foes.length+' MACHINE'+(foes.length>1?'S':''),id:'enemy'};
  }
  return { x: it.x, z: it.z, y: it.y || 0, label: it.label, id };
}

const GRID = { x0: -80, z0: -125, w: 182, h: 201, cell: 1 };
const RADIUS = .7;
export function createM03Guidance({ traversal = null } = {}) {
  let solid = null, source = null, fields = new Map();
  const idx = (gx, gz) => gz * GRID.w + gx;
  const cellOf = (x, z) => [Math.max(0, Math.min(GRID.w - 1, Math.round((x - GRID.x0) / GRID.cell))), Math.max(0, Math.min(GRID.h - 1, Math.round((z - GRID.z0) / GRID.cell)))];
  const centre = (gx, gz) => ({ x: GRID.x0 + gx * GRID.cell, z: GRID.z0 + gz * GRID.cell });
  function build(obstacles) {
    solid = new Uint8Array(GRID.w * GRID.h); fields = new Map(); source = obstacles;
    for (const s of traversal?.routes || []) {
      const [ax, az] = cellOf(s.x - s.halfWidth - RADIUS, s.topZ - RADIUS), [bx, bz] = cellOf(s.x + s.halfWidth + RADIUS, s.bottomZ - .8);
      for (let gz = az; gz <= bz; gz++) for (let gx = ax; gx <= bx; gx++) solid[idx(gx, gz)] = 1;
    }
    for (const o of obstacles) {
      if (o.van || o.walkableSurface || (o.y || 0) > 1.6 || (o.y || 0) + (o.height || 0) < .35) continue; // the ambulance moves: handled live
      const [ax, az] = cellOf(o.x - o.hx - RADIUS, o.z - o.hz - RADIUS), [bx, bz] = cellOf(o.x + o.hx + RADIUS, o.z + o.hz + RADIUS);
      for (let gz = az; gz <= bz; gz++) for (let gx = ax; gx <= bx; gx++) {
        const c = centre(gx, gz); if (Math.abs(c.x - o.x) < o.hx + RADIUS && Math.abs(c.z - o.z) < o.hz + RADIUS) solid[idx(gx, gz)] = 1;
      }
    }
  }
  // The ambulance is tested where it stands now (it drives during the mission), not where it was when the grid was built.
  let van = null;
  const inVan = (gx, gz) => { if (!van) return false; const c = centre(gx, gz); return Math.abs(c.x - van.x) < van.hx + RADIUS && Math.abs(c.z - van.z) < van.hz + RADIUS; };
  const open = (gx, gz) => gx >= 0 && gz >= 0 && gx < GRID.w && gz < GRID.h && !solid[idx(gx, gz)] && !inVan(gx, gz);
  function nearestOpen(x, z) {
    const [gx, gz] = cellOf(x, z); if (open(gx, gz)) return [gx, gz];
    for (let r = 1; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === r && open(gx + dx, gz + dz)) return [gx + dx, gz + dz];
    return [gx, gz];
  }
  // Distance field (8-neighbour, no corner cutting) from a goal cell; cached per goal.
  function field(goal) {
    const key = goal[0] + ',' + goal[1] + (van ? '|' + Math.round(van.x) + ',' + Math.round(van.z) + ',' + (van.hx > van.hz ? 1 : 0) : ''); if (fields.has(key)) return fields.get(key);
    const d = new Float64Array(GRID.w * GRID.h).fill(Infinity), heap = [[0, goal[0], goal[1]]]; d[idx(goal[0], goal[1])] = 0;
    const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    while (heap.length) {
      const [c, gx, gz] = pop(); if (c > d[idx(gx, gz)]) continue;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue; const nx = gx + dx, nz = gz + dz; if (!open(nx, nz)) continue;
        if (dx && dz && (!open(gx + dx, gz) || !open(gx, gz + dz))) continue;
        const nc = c + (dx && dz ? 1.4142 : 1); if (nc < d[idx(nx, nz)]) { d[idx(nx, nz)] = nc; push([nc, nx, nz]); }
      }
    }
    if (fields.size > 24) fields.delete(fields.keys().next().value); fields.set(key, d); return d;
  }
  function visible(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (GRID.cell * .5));
    for (let i = 1; i < n; i++) { const t = i / n, [gx, gz] = cellOf(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); if (!open(gx, gz)) return false; }
    return true;
  }
  // Next point to walk to on the ground toward `goal` (ground level); null when unreachable.
  function groundStep(from, goal) {
    const g = nearestOpen(goal.x, goal.z), d = field(g); let [gx, gz] = nearestOpen(from.x, from.z);
    if (!Number.isFinite(d[idx(gx, gz)])) return null;
    if (visible(from, goal)) return { x: goal.x, z: goal.z, length: Math.hypot(goal.x - from.x, goal.z - from.z) };
    let best = null;
    for (let k = 0; k < 400 && d[idx(gx, gz)] > 0; k++) {
      let nx = gx, nz = gz;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const x = gx + dx, z = gz + dz; if (open(x, z) && d[idx(x, z)] < d[idx(nx, nz)] && !(dx && dz && (!open(gx + dx, gz) || !open(gx, gz + dz)))) { nx = x; nz = z; } }
      if (nx === gx && nz === gz) break; gx = nx; gz = nz;
      const c = centre(gx, gz); if (visible(from, c)) best = c; else if (best) break;
    }
    const p = best || centre(gx, gz);
    return { x: p.x, z: p.z, length: d[idx(...nearestOpen(from.x, from.z))] * GRID.cell };
  }
  const stair = () => traversal?.routes?.[0] || null;
  return {
    // Waypoint toward `target` ({x,z,y}) for a player ({x,z,elevation}), with `obstacles` the live physics boxes.
    waypoint(player, target, obstacles) {
      if (!player || !target) return null;
      if (obstacles !== source) build(obstacles);
      van = obstacles.find(o => o.van) || null;
      const y = player.elevation || 0, ty = target.y || 0, s = stair();
      // Mid-flight on the stairway: finish it in its lane before heading anywhere (cutting across drops you off its side).
      if (s && y > .15 && y < s.height - .25 && Math.abs(player.x - s.x) < s.halfWidth + .8 && player.z <= s.bottomZ + .4 && player.z >= s.topZ - .6) {
        const up = (target.y || 0) > y;
        return up ? { x: s.x, z: s.topZ - 1, y: s.height, label: 'MONTER L’ESCALIER DU RELAIS' } : { x: s.x, z: s.bottomZ + 1.6, y: 0, label: 'REDESCENDRE PAR L’ESCALIER' };
      }
      if (s && Math.abs(ty - y) > 1.6) {
        const bottom = { x: s.x, z: s.bottomZ + 1.2 }, top = { x: s.x, z: s.topZ - .6 };
        const inLane = Math.abs(player.x - s.x) < s.halfWidth + .3;
        const onStair = inLane && player.z <= s.bottomZ + .4 && player.z >= s.topZ - .4 && y > .15;
        if (ty > y) { // climb: the stairway is entered at its foot only (not from underneath), then followed up
          const atFoot = inLane && player.z <= s.bottomZ + 1.6 && player.z >= s.bottomZ - .3;
          if (onStair || atFoot) return { x: s.x, z: s.topZ - .8, y: s.height, label: 'MONTER L’ESCALIER DU RELAIS' };
          const step = groundStep(player, bottom); return step && { x: step.x, z: step.z, y: 0, label: 'ESCALIER DU RELAIS A3' };
        }
        // Down: back to the head of the stairway, then down it (no dead zone on the landing).
        if (onStair || (Math.abs(player.x - s.x) < s.halfWidth + .6 && Math.abs(player.z - top.z) < 1.4)) return { x: s.x, z: s.bottomZ + 1.6, y: 0, label: 'REDESCENDRE PAR L’ESCALIER' };
        return { x: top.x, z: top.z, y: s.height, label: 'REDESCENDRE PAR L’ESCALIER' };
      }
      if (y > 1.6) return { x: target.x, z: target.z, y: ty }; // on the deck: it is open ground
      const step = groundStep(player, target); return step && { x: step.x, z: step.z, y: ty, length: step.length };
    },
    guidance(player, target, obstacles, heading) {
      if (!target) return null;
      const w = this.waypoint(player, target, obstacles) || target, g = arrowGuidance(player, w, heading); if (!g) return null;
      const total = Math.hypot(target.x - player.x, target.z - player.z);
      return { ...g, route: Math.ceil(Math.max(total, w.length || 0)) + ' m', title: target.label || g.title };
    }
  };
}
