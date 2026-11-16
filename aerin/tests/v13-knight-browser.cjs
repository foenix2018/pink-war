// Aerin V13 — parcours réel : corps refait sans bonnet, vrai saut (arrêt / marche / course),
// roulade en course qui garde l'élan, écu dans le dos et épée au fourreau à gauche, HUD sans chevauchement.
// npm run dev puis BASE_URL=http://localhost:8082/ node tests/v13-knight-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8082/';
(async () => {
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || /V1[1-3] :/.test(m.text())) errors.push(m.text()); });
  const G = (fn, a) => p.evaluate(fn, a);
  const until = (fn, t = +(process.env.WAIT_MS || 300000)) => p.waitForFunction(fn, null, { timeout: t, polling: 30 });
  const R = {};
  await p.goto(BASE + (process.env.PAGE || 'index.html'));
  await until(() => window.aerinGame && aerinGame.state.ready);
  await p.waitForTimeout(500);
  if (!(await G(() => aerinGame.state.started))) await p.click('#start-button');
  if (await G(() => aerinGame.state.paused)) await p.click('#resume-button');
  // Enregistreur : hauteur maximale et trajet horizontal pendant chaque phase observée.
  await G(() => { const g = aerinGame; window.__rec = { maxY: 0, path: 0, last: null }; (function f() { const r = window.__rec, P = g.player.position; r.maxY = Math.max(r.maxY, P.y); if (r.last) r.path += Math.hypot(P.x - r.last.x, P.z - r.last.z); r.last = P.clone(); requestAnimationFrame(f); })(); });
  const recReset = () => G(() => { const r = window.__rec; r.maxY = 0; r.path = 0; r.last = aerinGame.player.position.clone(); });
  const place = (x, z, yaw) => G(([x, z, yaw]) => { const g = aerinGame; g.player.position.set(x, 0, z); g.state.yaw = yaw; g.state.stamina = 100; g.state.rollCooldown = 0; }, [x, z, yaw]);

  // 1. Corps
  R.corps = await G(() => { const g = aerinGame, bd = g.body; let hat = 0; g.actor.traverse(o => { if (o.isMesh && /Tunique • vert/.test(o.material?.name || '') && o.parent?.name === 'Aerin_Body') hat++; });
    return { version: g.version, pieces: bd && bd.parts.length, retires: bd && bd.removed, bonnet: hat, fp: !!(bd && bd.fpArms) }; });
  assert.ok(['V13','V15'].includes(R.corps.version));
  assert.ok(R.corps.pieces >= 15 && R.corps.retires >= 5 && R.corps.bonnet === 0 && R.corps.fp, 'corps refait sans bonnet');

  // 2. Saut à l'arrêt : vraie hauteur, réception
  await place(0, 6, 0);
  await recReset();
  await p.keyboard.press('KeyJ');
  await until(() => aerinGame.state.airborne);
  await until(() => !aerinGame.state.airborne);
  R.sautArret = await G(() => ({ hauteur: +window.__rec.maxY.toFixed(2), sol: aerinGame.player.position.y, clip: aerinGame.state.currentClip }));
  assert.ok(R.sautArret.hauteur > .6 && R.sautArret.sol === 0, 'saut à l’arrêt');

  // 3. Saut en course : élan conservé, grand écart
  await place(-6, 6, Math.PI / 2); // la caméra regarde vers -X : « avant » = -X
  await p.keyboard.down('ShiftLeft'); await p.keyboard.down('KeyW');
  await until(() => aerinGame.state.motionSpeed > 3.5);
  await recReset();
  await p.keyboard.press('KeyJ');
  await until(() => aerinGame.state.airborne);
  R.clipCourse = await G(() => aerinGame.state.currentClip);
  await until(() => !aerinGame.state.airborne);
  R.sautCourse = await G(() => ({ hauteur: +window.__rec.maxY.toFixed(2), distance: +window.__rec.path.toFixed(2), apres: aerinGame.state.currentClip, vitesse: +aerinGame.state.motionSpeed.toFixed(2) }));
  assert.equal(R.clipCourse, 'K_RunJump');
  assert.ok(R.sautCourse.hauteur > .5 && R.sautCourse.distance > 2, 'saut en course avec élan');

  // 4. Roulade en course : garde l'élan, la course reprend
  await G(() => { aerinGame.state.stamina = 100; aerinGame.state.rollCooldown = 0; });
  await until(() => aerinGame.state.motionSpeed > 3.5 && !aerinGame.state.action);
  await recReset();
  await p.keyboard.press('KeyR');
  await until(() => aerinGame.state.action === 'roll');
  R.entree = await G(() => +aerinGame.state.rollEntrySpeed.toFixed(2));
  await until(() => aerinGame.state.action !== 'roll');
  R.roulade = await G(() => ({ distance: +window.__rec.path.toFixed(2), apres: aerinGame.state.currentClip, vitesse: +aerinGame.state.motionSpeed.toFixed(2) }));
  await p.keyboard.up('KeyW'); await p.keyboard.up('ShiftLeft');
  assert.ok(R.entree > 3 && R.roulade.distance > 2.5, 'roulade avec élan');
  assert.ok(R.roulade.vitesse > 3, 'la course reprend sans arrêt');

  // 5. Saut en marchant
  await place(0, 6, 0);
  await p.keyboard.down('KeyW');
  await until(() => aerinGame.state.motionSpeed > 1.5);
  await recReset();
  await p.keyboard.press('KeyJ');
  await until(() => aerinGame.state.airborne);
  await until(() => !aerinGame.state.airborne);
  await p.keyboard.up('KeyW');
  R.sautMarche = await G(() => ({ hauteur: +window.__rec.maxY.toFixed(2), distance: +window.__rec.path.toFixed(2) }));
  assert.ok(R.sautMarche.hauteur > .6 && R.sautMarche.distance > 1, 'saut en marchant');

  // 6. Rengainer : épée au fourreau à gauche, écu dans le dos
  await until(() => !aerinGame.state.action);
  await p.keyboard.press('KeyG');
  await until(() => aerinGame.state.currentClip === 'K_Sheathe');
  await until(() => !aerinGame.state.action);
  R.range = await G(() => { const g = aerinGame, k = g.knight; let sw = null, sh = null; g.actor.traverse(o => { if (o.name === 'Aerin_Knight_Epee_Rangee') sw = o; if (o.name === 'Aerin_Knight_Ecu_Dos') sh = o; });
    g.actor.updateMatrixWorld(true); const inv = g.actor.matrixWorld.clone().invert(); const ls = sw.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv), lb = sh.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
    return { equipe: g.state.equipped, epee: sw.visible, ecu: sh.visible, enMain: k.sword.group.visible, epeeX: +ls.x.toFixed(2), ecuZ: +lb.z.toFixed(2), ecuY: +lb.y.toFixed(2) }; });
  assert.ok(!R.range.equipe && R.range.epee && R.range.ecu && !R.range.enMain);
  assert.ok(R.range.epeeX > .1, 'épée côté gauche (+X du personnage)');
  assert.ok(R.range.ecuZ < -.1 && R.range.ecuY > .9, 'écu dans le dos');
  await p.keyboard.press('KeyG');
  await until(() => aerinGame.state.currentClip === 'K_Unsheathe');
  await until(() => aerinGame.state.equipped && !aerinGame.state.action);

  // 7. HUD : jauge de vie reliée, aucun chevauchement
  await G(() => { aerinGame.state.hp = 25; });
  await until(() => /scaleX\(0\.2/.test(document.querySelector('#hp-fill').style.transform));
  R.hud = await G(() => { const els = [...document.querySelectorAll('#game-hud button, #game-hud .h13-vitals, #game-hud .h13-stick')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && e.offsetParent !== null; });
    const o = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].getBoundingClientRect(), c = els[j].getBoundingClientRect(); if (a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) o.push(els[i].id + '×' + els[j].id); }
    return { chevauchements: o, icones: document.querySelectorAll('#game-hud use[href^="#gi-"]').length, vieBasse: document.body.classList.contains('hp-low') }; });
  assert.deepEqual(R.hud.chevauchements, []);
  assert.ok(R.hud.icones >= 14 && R.hud.vieBasse);

  assert.deepEqual(errors, [], 'aucune erreur JS');
  console.log(JSON.stringify(R, null, 1));
  console.log('OK AERIN V13 : corps sans bonnet, vrai saut, roulade avec élan, fourreau à gauche, écu dans le dos, HUD');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
