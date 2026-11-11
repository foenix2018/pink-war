// End-of-chapter cinematic played in the engine: the camera leaves the first-person view and films the Shadow Unit
// (the real third-person soldier) and her sphere — GAB-1 for GHJU, CAR-14 for LYLU — while their exchange runs in
// the SMS-style transmission panel. Three shots (establishing orbit, two-shot, crane out), letterbox bars,
// a « Passer » button; the mission's end panel opens when it finishes. No new lights, no extra render pass.
const STYLE_ID = 'pw-cine-style';
function styles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style'); s.id = STYLE_ID;
  s.textContent = `
body.pw-cine>*:not(canvas):not(.pw-comms):not(.pw-cine-ui){visibility:hidden!important}
.pw-cine-ui{position:fixed;inset:0;z-index:70;pointer-events:none}
.pw-cine-bar{position:absolute;left:0;right:0;height:0;background:#000;transition:height .9s cubic-bezier(.2,.7,.2,1)}
.pw-cine-bar.top{top:0}.pw-cine-bar.bottom{bottom:0}
.pw-cine-ui.on .pw-cine-bar{height:11vh}
.pw-cine-title{position:absolute;right:max(22px,env(safe-area-inset-right));bottom:calc(11vh + 14px);font:800 12px/1.2 "Bahnschrift","DIN Alternate","Arial Narrow",system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#ffffffb0;opacity:0;transition:opacity 1.2s}
.pw-cine-ui.on .pw-cine-title{opacity:1}
.pw-cine-skip{position:absolute;right:max(18px,env(safe-area-inset-right));top:calc(11vh + 12px);pointer-events:auto;padding:9px 16px;border:1px solid #ffffff55;background:#05081299;color:#fff;font:700 12px "Bahnschrift","Arial Narrow",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;border-radius:3px}
.pw-cine-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .7s}
.pw-cine-fade.on{opacity:1}
body.pw-cine .pw-comms{z-index:71!important}`;
  doc.head.append(s);
}

const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

// Pure camera plan, testable without a renderer: given the hero's ground position/heading and the shot clock,
// returns the camera position, the look-at point and the sphere's position.
export function cinematicPlan({ x, z, y = 0, yaw = 0 }, t, total) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw); // forward / right
  const head = { x, y: y + 1.62, z }, chest = { x, y: y + 1.25, z };
  // The sphere hovers in front of her, slightly to her right, at face height: they talk face to face.
  const bob = Math.sin(t * 2.1) * .05;
  const sphere = { x: x + fx * 1.05 + rx * .38, y: y + 1.66 + bob, z: z + fz * 1.05 + rz * .38 };
  const k = total > 0 ? Math.min(1, t / total) : 1;
  let cam, look;
  if (k < .34) { // 1 · establishing orbit, three-quarter front, slowly sweeping
    const u = ease(k / .34), a = -.95 + u * .55, d = 3.6 - u * .5;
    cam = { x: x + (fx * Math.cos(a) + rx * Math.sin(a)) * d, y: y + 1.85 - u * .2, z: z + (fz * Math.cos(a) + rz * Math.sin(a)) * d };
    look = chest;
  } else if (k < .78) { // 2 · two-shot in profile: both faces, the sphere at her eye level
    const u = ease((k - .34) / .44), mid = { x: (x + sphere.x) / 2, z: (z + sphere.z) / 2 }, d = 2.5 - u * .45;
    cam = { x: mid.x + rx * d + fx * .35, y: y + 1.68, z: mid.z + rz * d + fz * .35 };
    look = { x: mid.x, y: y + 1.55, z: mid.z };
  } else { // 3 · crane up and out behind them, toward what comes next
    const u = ease((k - .78) / .22), d = 2.4 + u * 3.2;
    cam = { x: x - fx * d + rx * .9, y: y + 1.9 + u * 2.6, z: z - fz * d + rz * .9 };
    look = { x: x + fx * 6, y: y + 1.2, z: z + fz * 6 };
  }
  return { cam, look, sphere };
}


// Picks where the scene is staged: the player's spot or one within a few metres in plain sight of it, and the heading
// that leaves the three camera positions the most room (a player who finishes against a truck is not filmed there).
export function stageSpot(start, clip, total = 30) {
  if (!clip) return start;
  const chest = p => ({ x: p.x, y: start.y + 1.2, z: p.z });
  const samples = [.08, .2, .3, .4, .5, .6, .7, .82, .92, 1].map(k => k * total);
  let best = { ...start, score: -1 };
  for (const r of [0, 1.5, 3, 4.5]) for (let i = 0; i < (r ? 8 : 1); i++) {
    const a = i / 8 * Math.PI * 2, p = { x: start.x + Math.sin(a) * r, z: start.z + Math.cos(a) * r };
    if (r && clip(chest(start), chest(p)) < .999) continue; // must be reachable in plain sight, not through a wall
    for (let h = 0; h < 16; h++) {
      const yaw = start.yaw + h / 16 * Math.PI * 2;
      let score = 0;
      for (const t of samples) { const { cam, look } = cinematicPlan({ x: p.x, z: p.z, y: start.y, yaw }, t, total); score += Math.min(1, clip(look, cam)); }
      score -= r * .02 + Math.min(h, 16 - h) * .004; // prefer staying put and facing the way she already faces
      if (score > best.score) best = { x: p.x, z: p.z, y: start.y, yaw, score };
    }
  }
  return best;
}

/**
 * playEndCinematic({ T, camera, hero, sphere, player, yaw, lines, subtitles, title, onDone })
 *  hero:    third-person soldier { root, animate? } (optional: the shots still run without it)
 *  sphere:  companion { root } (optional)
 *  lines:   [{ who, speaker, text }] pushed into the shared transmission (SMS) panel
 * Returns { update(dt), skip(), done: Promise, active }.
 */
export function playEndCinematic({ T, camera, hero = null, sphere = null, player, yaw = 0, lines = [], subtitles = null, firstPerson = [], clip = null, title = '', onDone = () => {}, doc = document, seconds = text => Math.max(3.2, Math.min(9, text.length / 15)) }) {
  styles(doc);
  const total = Math.max(9, lines.reduce((s, l) => s + seconds(l.text), 0) + 2.2);
  const ui = doc.createElement('div'); ui.className = 'pw-cine-ui';
  ui.innerHTML = '<div class="pw-cine-bar top"></div><div class="pw-cine-bar bottom"></div><div class="pw-cine-title"></div><button type="button" class="pw-cine-skip">Passer ›</button><div class="pw-cine-fade"></div>';
  ui.querySelector('.pw-cine-title').textContent = title;
  doc.body.append(ui); doc.body.classList.add('pw-cine');
  requestAnimationFrame(() => ui.classList.add('on'));
  const fade = ui.querySelector('.pw-cine-fade');
  // Hide only the first-person weapon/gloves the level hands over. Toggling every camera child also hides
  // helpers that rebuild GPU resources each frame while invisible (measured: unbounded memory growth).
  const hidden = []; for (const child of firstPerson) if (child?.visible) { child.visible = false; hidden.push(child); }
  const saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov, heroVisible: hero?.root?.visible };
  if (hero?.root) hero.root.visible = true;
  // The sphere joins the scene even in chapters where it does not fight (it is hidden there during play).
  const sphereVisible = sphere?.root?.visible; if (sphere?.root) sphere.root.visible = true;
  const ground = stageSpot({ x: player.x, z: player.z, y: player.elevation || 0, yaw }, clip, total);
  yaw = ground.yaw;
  if (hero?.root) { hero.root.position.set(ground.x, ground.y, ground.z); hero.root.rotation.y = yaw; }
  const target = new T.Vector3(), eye = new T.Vector3();
  let t = 0, finished = false, resolve, ending = 0;
  const done = new Promise(r => { resolve = r; });
  subtitles?.clear?.(); subtitles?.say?.(lines);
  if (camera.isPerspectiveCamera) { camera.fov = 42; camera.updateProjectionMatrix(); }
  function finish() {
    if (finished) return; finished = true;
    for (const child of hidden) child.visible = true;
    camera.position.copy(saved.position); camera.quaternion.copy(saved.quaternion);
    if (camera.isPerspectiveCamera) { camera.fov = saved.fov; camera.updateProjectionMatrix(); }
    if (hero?.root && saved.heroVisible !== undefined) hero.root.visible = saved.heroVisible;
    if (sphere?.root && sphereVisible !== undefined) sphere.root.visible = sphereVisible;
    subtitles?.clear?.(); doc.body.classList.remove('pw-cine'); ui.remove();
    try { onDone(); } finally { resolve(true); }
  }
  function beginEnd() { if (ending || finished) return; ending = 1; fade.classList.add('on'); setTimeout(finish, 750); }
  ui.querySelector('.pw-cine-skip').addEventListener('click', beginEnd);
  const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beginEnd(); } };
  doc.addEventListener('keydown', onKey); done.then(() => doc.removeEventListener('keydown', onKey));
  return {
    get active() { return !finished; }, get time() { return t; }, total, done,
    skip: beginEnd,
    update(dt) {
      if (finished) return;
      t += Math.min(.05, Math.max(0, dt));
      const plan = cinematicPlan(ground, t, total);
      // Never film from inside a wall or a truck: pull the camera toward the subject along the sight line.
      if (clip) { const f = Math.max(.25, Math.min(1, clip(plan.look, plan.cam))); for (const a of ['x', 'y', 'z']) plan.cam[a] = plan.look[a] + (plan.cam[a] - plan.look[a]) * f; }
      camera.position.set(plan.cam.x, plan.cam.y, plan.cam.z);
      camera.lookAt(target.set(plan.look.x, plan.look.y, plan.look.z));
      if (hero?.root) {
        hero.root.position.set(ground.x, ground.y, ground.z); hero.root.rotation.y = yaw;
        try { hero.animate?.(t, false, 0, 0, 0, dt, { airborne: false, verticalSpeed: 0, crouched: false, velocity: { x: 0, y: 0, z: 0 }, ground: () => ground.y, firing: false, sprint: false, aim: false }); } catch { /* idle pose only */ }
      }
      if (sphere?.root) {
        sphere.root.visible = true; try { sphere.preview?.(dt); } catch { /* model idle only */ }
        sphere.root.position.set(plan.sphere.x, plan.sphere.y, plan.sphere.z);
        sphere.root.lookAt(eye.set(ground.x, ground.y + 1.6, ground.z)); sphere.root.updateMatrixWorld(true);
      }
      const talking = subtitles ? (subtitles.current || subtitles.queued) : t < total;
      if (t >= total && !talking) beginEnd();
      if (t > total + 12) beginEnd(); // never trap the player in a scene
    }
  };
}
