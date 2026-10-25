// Shared combat HUD for M01, M02, the Arena and the Range (book §11: health and ammunition always on screen,
// everything else contextual). One DOM, one stylesheet: each engine mounts it and feeds it its game state.
// The legacy readouts of each engine stay in the page, hidden by `body.pw-unified-hud`, so their logic is untouched.
const STYLESHEET = 'combat-hud.css?v=3.63';
const HEROES = Object.freeze({ ghju: 'GHJU', lylu: 'LYLU' });
export const HUD_SEGMENTS = 10;

// Pure reading of an ArenaGame-like state (the three engines share these fields).
export function combatHudState(game) {
  const player = game?.player || {}, weapon = game?.weapon || {};
  const hp = Math.max(0, Math.min(100, Number(player.hp) || 0));
  const capacity = weapon.melee ? 0 : Math.max(0, Number(weapon.capacity) || 0);
  const ammo = weapon.melee ? 0 : Math.max(0, Number(game?.ammo?.[game?.weaponIndex]) || 0);
  const reloadTime = Math.max(.001, Number(weapon.reload) || 1), reloading = (Number(game?.reloadRemaining) || 0) > 0;
  return {
    hp, critical: hp > 0 && hp < 30, regenerating: !!game?.regenerating && hp < 100,
    weapon: weapon.name || weapon.id || '', melee: !!weapon.melee, ammo, capacity,
    reloading, reloadProgress: reloading ? Math.max(0, Math.min(1, 1 - game.reloadRemaining / reloadTime)) : 0,
    empty: !weapon.melee && capacity > 0 && ammo === 0 && !reloading,
    // Armour layer (3.63): shield over health, impulse charges, and the direction of the last hit.
    shieldCapacity: Math.max(0, Number(game?.shieldCapacity) || 0), shield: Math.max(0, Number(player.shield) || 0),
    shieldCharging: !!game?.shieldCharging, charges: Math.max(0, Number(game?.charges) || 0),
    hit: hitBearing(game)
  };
}

// Where the last hit came from, relative to where the player looks: 0 = ahead (top of the screen), PI/2 = right.
// Fades over HIT_MEMORY seconds of game time.
export const HIT_MEMORY = 1.1;
export function hitBearing(game) {
  const hit = game?.lastHit, p = game?.player;
  if (!hit || !p || !Number.isFinite(game.time) || game.time - hit.time > HIT_MEMORY) return null;
  const vx = hit.x - p.x, vz = hit.z - p.z, yaw = p.yaw || 0;
  if (Math.hypot(vx, vz) < .05) return null;
  const ahead = -Math.sin(yaw) * vx - Math.cos(yaw) * vz, right = Math.cos(yaw) * vx - Math.sin(yaw) * vz;
  return { angle: Math.atan2(right, ahead), strength: 1 - (game.time - hit.time) / HIT_MEMORY };
}

function ensureStylesheet(doc) {
  if (doc.querySelector('link[data-pw-hud]')) return;
  const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(STYLESHEET, import.meta.url).href; link.dataset.pwHud = '';
  doc.head.append(link);
}

export function mountCombatHud({ characterId = 'ghju', parent = null, lobbyPage = false, onAction = null } = {}) {
  const doc = document; ensureStylesheet(doc);
  const root = doc.createElement('section');
  root.className = 'pw-hud'; root.setAttribute('aria-label', 'État de combat');
  root.innerHTML = `<div class="pw-hud-vitals" role="status"><span class="pw-hud-tag"></span><div class="pw-hud-shield" hidden><i></i></div><div class="pw-hud-line"><b class="pw-hud-value">100</b><small>SANTÉ</small></div><div class="pw-hud-bar"><i></i></div><span class="pw-hud-note"></span></div>`
    + `<div class="pw-hud-arms" role="status"><span class="pw-hud-tag pw-hud-weapon"></span><div class="pw-hud-line"><b class="pw-hud-ammo">0</b><small class="pw-hud-capacity"></small></div><div class="pw-hud-bar"><i></i></div><span class="pw-hud-charges" aria-label="Charges à impulsion"></span><span class="pw-hud-note"></span></div>`
    + `<div class="pw-hud-hit" aria-hidden="true"><i></i></div>`
    // Touch screens only (CSS): the armour actions, above the fire cluster, in the same place in every mode.
    + `<div class="pw-hud-touch"><button type="button" data-armor="melee" aria-label="Frappe de mêlée">MÊLÉE</button><button type="button" data-armor="charge" aria-label="Lancer une charge à impulsion">CHARGE<small></small></button></div>`;
  (parent || doc.body).append(root);
  doc.body.classList.add('pw-unified-hud'); if (lobbyPage) doc.body.classList.add('pw-hud-lobby-page');
  const $ = selector => root.querySelector(selector), vitals = $('.pw-hud-vitals'), arms = $('.pw-hud-arms');
  const nodes = { tag: $('.pw-hud-vitals .pw-hud-tag'), hp: $('.pw-hud-value'), vitalNote: $('.pw-hud-vitals .pw-hud-note'),
    weapon: $('.pw-hud-weapon'), ammo: $('.pw-hud-ammo'), capacity: $('.pw-hud-capacity'), armsNote: $('.pw-hud-arms .pw-hud-note'),
    charges: $('.pw-hud-charges') };
  const shieldBar = $('.pw-hud-shield'), hitRing = $('.pw-hud-hit'), chargeButton = $('[data-armor=charge]');
  for (const button of root.querySelectorAll('[data-armor]')) button.addEventListener('pointerdown', event => {
    // Keep the press away from the camera drag of the canvas underneath.
    event.preventDefault(); event.stopPropagation(); onAction?.(button.dataset.armor);
  });
  const last = new Map();
  // Only touch the DOM when a value changes: the HUD is fed every frame by the engines.
  const text = (key, value) => { if (last.get(key) !== value) { last.set(key, value); nodes[key].textContent = value; } };
  const prop = (element, key, value) => { const id = key + (element === vitals ? 'v' : 'a'); if (last.get(id) !== value) { last.set(id, value); element.style.setProperty(key, value); } };
  const flag = (element, name, on) => { const id = name + (element === vitals ? 'v' : 'a'); if (last.get(id) !== on) { last.set(id, on); element.classList.toggle(name, on); } };
  const api = {
    root,
    setCharacter(id) { const hero = id === 'lylu' ? 'lylu' : 'ghju'; root.dataset.hero = hero; text('tag', HEROES[hero]); },
    update(game) {
      const s = combatHudState(game);
      text('hp', String(Math.ceil(s.hp)));
      prop(vitals, '--fill', (s.hp / 100).toFixed(3));
      flag(vitals, 'critical', s.critical); flag(vitals, 'regenerating', s.regenerating);
      // Shield over health: hidden when the engine has no armour shield.
      const shielded = s.shieldCapacity > 0, broken = shielded && s.shield <= 0;
      if (last.get('shielded') !== shielded) { last.set('shielded', shielded); shieldBar.hidden = !shielded; }
      if (shielded) prop(shieldBar, '--fill', (s.shield / s.shieldCapacity).toFixed(3));
      flag(vitals, 'shield-broken', broken); flag(vitals, 'shield-charging', s.shieldCharging);
      text('vitalNote', s.critical ? 'CRITIQUE' : broken ? 'BOUCLIER ROMPU' : s.shieldCharging ? 'RECHARGE DU BOUCLIER' : s.regenerating ? 'RÉGÉNÉRATION' : '');
      text('charges', s.charges > 0 ? 'CHARGES ' + '◆'.repeat(s.charges) : '');
      if (last.get('touchCharges') !== s.charges) { last.set('touchCharges', s.charges); chargeButton.lastChild.textContent = String(s.charges); chargeButton.classList.toggle('empty', s.charges <= 0); }
      // Direction arc of the last hit around the crosshair.
      const arc = s.hit ? (s.hit.angle * 180 / Math.PI).toFixed(0) + '|' + s.hit.strength.toFixed(2) : '';
      if (last.get('arc') !== arc) { last.set('arc', arc); hitRing.style.opacity = s.hit ? s.hit.strength.toFixed(2) : '0';
        if (s.hit) hitRing.style.setProperty('--angle', (s.hit.angle * 180 / Math.PI).toFixed(1) + 'deg'); }
      text('weapon', s.weapon.toUpperCase());
      text('ammo', s.melee ? 'LAME' : String(s.ammo));
      text('capacity', s.melee ? '' : '/ ' + s.capacity);
      prop(arms, '--fill', (s.reloading ? s.reloadProgress : s.melee ? 1 : s.capacity ? s.ammo / s.capacity : 0).toFixed(3));
      flag(arms, 'reloading', s.reloading); flag(arms, 'empty', s.empty); flag(arms, 'low', !s.melee && !s.reloading && s.capacity > 0 && s.ammo > 0 && s.ammo <= s.capacity * .25);
      text('armsNote', s.reloading ? 'RECHARGE' : s.empty ? 'VIDE · RECHARGER' : '');
      return s;
    },
    setVisible(visible) { root.hidden = !visible; },
    dispose() { root.remove(); doc.body.classList.remove('pw-unified-hud', 'pw-hud-lobby-page'); }
  };
  api.setCharacter(characterId);
  return api;
}
