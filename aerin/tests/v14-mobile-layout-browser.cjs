// Aerin V14 — disposition tactile reprise de Pink Wars : géométrie sur quatre iPhone émulés et vrais appuis.
// npm run dev puis BASE_URL=http://localhost:8082/ node tests/v14-mobile-layout-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8082/';
(async () => {
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const out = {};
  for (const name of ['iPhone SE', 'iPhone 13', 'iPhone 14 Pro Max', 'iPhone 13 landscape']) {
    console.log('appareil', name);
    const c = await b.newContext({ ...devices[name] }); const p = await c.newPage(); const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE + 'index.html');
    await p.waitForFunction(() => window.aerinGame && aerinGame.state.ready, null, { timeout: 300000 });
    await p.tap('#start-button');
    await p.waitForFunction(() => aerinGame.state.started, null, { timeout: 60000 });
    const g = await p.evaluate(() => {
      const r = id => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
      const ids = ['move-stick', 'block-button', 'jump-button', 'roll-button', 'crouch-button', 'attack-button', 'lock-button', 'dodge-button', 'gear-button'];
      const R = Object.fromEntries(ids.map(i => [i, r(i)]));
      const els = [...document.querySelectorAll('#game-hud button, #game-hud .h13-vitals, #game-hud .h13-stick, #game-hud .h13-state')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && getComputedStyle(e).visibility !== 'hidden' && e.offsetParent !== null; });
      const o = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].getBoundingClientRect(), d = els[j].getBoundingClientRect(); if (a.left < d.right - 2 && d.left < a.right - 2 && a.top < d.bottom - 2 && d.top < a.bottom - 2) o.push((els[i].id || els[i].className) + '×' + (els[j].id || els[j].className)); }
      return { W: innerWidth, H: innerHeight, R, o, touch: document.body.classList.contains('touch-layout'), lookStick: document.getElementById('look-stick').offsetParent === null ? 'none' : 'visible' };
    });
    const { R, W } = g;
    assert.ok(g.touch, name + ' : mode tactile');
    assert.deepEqual(g.o, [], name + ' : chevauchements');
    // Règle Pink Wars : déplacement à gauche, bouclier (visée) au centre bas, saut au-dessus, frappe (tir) à droite.
    assert.ok(R['move-stick'].cx < W * .3, name + ' joystick à gauche');
    assert.ok(Math.abs(R['block-button'].cx - W / 2) < 2 && Math.abs(R['jump-button'].cx - W / 2) < 2, name + ' colonne centrale');
    assert.ok(R['jump-button'].b <= R['block-button'].t, name + ' saut au-dessus du bouclier');
    assert.ok(R['roll-button'].cx < W / 2 && R['crouch-button'].cx < W / 2 && R['crouch-button'].b <= R['roll-button'].t, name + ' roulade et accroupi à gauche du centre');
    assert.ok(R['attack-button'].r > W - 30 && R['attack-button'].w >= 77, name + ' frappe en bas à droite');
    assert.ok(R['lock-button'].b <= R['attack-button'].t && R['dodge-button'].r <= R['attack-button'].l, name + ' cible au-dessus, esquive à gauche');
    assert.equal(g.lookStick, 'none', name + ' : pas de second joystick (caméra au glisser)');
    // Vrais appuis tactiles
    await p.evaluate(() => { const s = aerinGame.state; s.stamina = 100; s.rollCooldown = 0; aerinGame.player.position.set(0, 0, 6); });
    await p.tap('#jump-button');
    await p.waitForFunction(() => aerinGame.state.airborne, null, { timeout: 120000 });
    await p.waitForFunction(() => !aerinGame.state.airborne && !aerinGame.state.action, null, { timeout: 300000 });
    await p.tap('#roll-button');
    await p.waitForFunction(() => aerinGame.state.action === 'roll', null, { timeout: 120000 });
    await p.waitForFunction(() => !aerinGame.state.action, null, { timeout: 300000 });
    await p.tap('#attack-button');
    await p.waitForFunction(() => aerinGame.state.action === 'attack', null, { timeout: 120000 });
    await p.waitForFunction(() => !aerinGame.state.action, null, { timeout: 300000 });
    // bouclier maintenu par un vrai contact (pointerdown sans relâcher)
    const bb = R["block-button"]; // appui maintenu : pointerdown sans relâcher
    const cdp = await c.newCDPSession(p); // vrai contact tactile maintenu (pas d'événement synthétique)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.cx, y: bb.cy, id: 7 }] });
    try { await p.waitForFunction(() => aerinGame.state.currentClip === 'Shield_Hold', null, { timeout: 120000 }); }
    catch (e) { console.error(name, 'bouclier', bb, await p.evaluate(([x, y]) => JSON.stringify({ el: document.elementFromPoint(x, y)?.outerHTML.slice(0, 60), block: [...aerinGame.input.block], clip: aerinGame.state.currentClip, action: aerinGame.state.action, eq: aerinGame.state.equipped, st: aerinGame.state.stamina }), [bb.cx, bb.cy])); throw e; }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForFunction(() => aerinGame.state.currentClip !== 'Shield_Hold', null, { timeout: 120000 });
    assert.deepEqual(errors, [], name + ' : erreurs JS');
    out[name] = { taille: W + '×' + g.H, attaque: [Math.round(R['attack-button'].cx), Math.round(R['attack-button'].cy)], centre: Math.round(R['block-button'].cx) };
    await c.close();
  }
  console.log(JSON.stringify(out, null, 1));
  console.log('OK AERIN V14 : disposition tactile Pink Wars sur 4 iPhone émulés, saut, roulade, frappe et bouclier au doigt');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
