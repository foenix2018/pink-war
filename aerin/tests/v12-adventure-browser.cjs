// Aerin V12 — parcours réel : proportions, cel shading, bibliothèque d'aventure, accroupi,
// coffre → objet obtenu, victoire après trois mannequins, mort animée, galerie. Aucune erreur JS.
// npm run dev puis BASE_URL=http://localhost:8082/ node tests/v12-adventure-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8082/';
(async () => {
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 480, height: 320 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || /V1[12] :/.test(m.text())) errors.push(m.text()); });
  const G = fn => p.evaluate(fn);
  const until = (fn, t = +(process.env.WAIT_MS || 240000)) => p.waitForFunction(fn, null, { timeout: t, polling: 50 });
  const R = {};
  await p.goto(BASE + (process.env.PAGE || 'index.html'));
  await until(() => window.aerinGame && aerinGame.state.ready);
  await p.waitForTimeout(500);
  if (!(await G(() => aerinGame.state.started))) await p.click('#start-button');
  if (await G(() => aerinGame.state.paused)) await p.click('#resume-button');

  // 1. Silhouette et rendu
  R.style = await G(() => { const g = aerinGame; let toon = 0, std = 0, ink = 0; g.actor.traverse(o => { if (!o.isMesh) return; if (o.userData.outlineV12) ink++; else if (o.material.isMeshToonMaterial) toon++; else std++; });
    const head = g.knight.bones.Head.getWorldPosition(new THREE.Vector3()).y - g.player.position.y; const foot = g.knight.bones.LeftToeBase.getWorldPosition(new THREE.Vector3()).y - g.player.position.y;
    return { version: g.version, lift: +g.state.lift.toFixed(3), headScale: g.knight.bones.Head.scale.x, toon, std, ink, head: +head.toFixed(2), foot: +foot.toFixed(3) }; });
  assert.ok(['V12','V13','V15'].includes(R.style.version));
  assert.ok(R.style.lift > .02 && R.style.headScale < 1, 'proportions appliquées');
  assert.ok(R.style.toon > 20 && R.style.ink > 20, 'cel shading et contours');
  assert.ok(Math.abs(R.style.foot) < .12, 'pieds au sol');
  R.clips = await G(() => Object.keys(aerinGame.actions).length);
  assert.ok(R.clips >= 69, 'bibliothèque complète');

  // 2. Accroupi et marche furtive
  await G(() => aerinGame.player.position.set(0, 0, 4));
  await p.keyboard.press('KeyC');
  await until(() => aerinGame.state.currentClip === 'K_Crouch');
  await p.keyboard.down('KeyW');
  await until(() => aerinGame.state.currentClip === 'K_Sneak');
  await p.keyboard.up('KeyW');
  await p.keyboard.press('KeyC');
  await until(() => !aerinGame.state.crouch);
  R.accroupi = 'ok';

  // 3. Coffre : ouverture puis objet brandi, tout est restauré
  await G(() => { const g = aerinGame, c = g.chest.root.position; g.player.position.set(c.x + 1.0, 0, c.z + .6); g.state.hp = 40; g.state.stamina = 30; });
  await until(() => !document.querySelector('.act-cell').classList.contains('off'));
  await p.keyboard.press('KeyT');
  await until(() => aerinGame.state.action === 'chest');
  await until(() => aerinGame.state.action === 'itemget');
  await until(() => !aerinGame.state.action);
  R.coffre = await G(() => ({ hp: Math.round(aerinGame.state.hp), lid: +aerinGame.chest.lid.rotation.x.toFixed(2), ouvert: aerinGame.state.chestOpen }));
  assert.ok(R.coffre.hp >= 99 && R.coffre.lid < -1.5 && R.coffre.ouvert);

  // 4. Victoire après trois mannequins neutralisés
  await G(() => { const g = aerinGame; g.player.position.set(0, 0, -1.55); g.player.rotation.y = Math.PI; g.dummies.forEach(d => d.hp = 1); g.state.defeated = 2; g.state.stamina = 100; });
  await p.keyboard.press('Space');
  await until(() => aerinGame.state.action === 'victory');
  await until(() => !aerinGame.state.action);
  R.victoire = await G(() => aerinGame.state.defeated);

  // 5. Mort animée puis écran de fin
  await G(() => { const g = aerinGame; g.state.hp = 5; const d = g.dummies.find(x => x.hp > 0) || g.dummies[1]; d.hp = 100; d.root.visible = true; g.player.position.copy(d.root.position).add(new THREE.Vector3(0, 0, 1.2)); d.phase = 'windup'; d.timer = .01; });
  await until(() => aerinGame.state.dead && aerinGame.state.currentClip === 'K_Death');
  await until(() => document.querySelector('#end-dialog').open);
  R.mort = 'animée puis écran de fin';

  assert.deepEqual(errors, [], 'aucune erreur JS');
  console.log(JSON.stringify(R, null, 1));
  if (!process.env.PAGE) {
    const g = await b.newPage({ viewport: { width: 900, height: 600 } });
    g.on('pageerror', e => errors.push(e.message));
    await g.goto(BASE + 'atelier-v12.html');
    await g.waitForFunction(() => window.aerinGallery, null, { timeout: 240000 });
    const n = await g.evaluate(() => aerinGallery.count);
    assert.ok(n >= 69, 'galerie : ' + n);
    assert.deepEqual(errors, []);
    console.log('galerie', n, 'animations');
  }
  console.log('OK AERIN V12 : silhouette, cel shading, aventure, accroupi, coffre, victoire, mort, galerie');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
