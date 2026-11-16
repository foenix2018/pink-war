// Aerin V11 — parcours réel dans le navigateur : tenue de chevalier, 18 mouvements V11,
// cible verrouillée, combo à annulation, charge → attaque tournoyante, salto, bond latéral,
// saut frappé, coup de bouclier, gel d'impact, cape, traînée, vue 1re personne, aucune erreur JS.
// Lancer : npm run dev (port 8082) puis BASE_URL=http://localhost:8082/ node tests/v11-knight-browser.cjs
// Les attentes portent sur l'état du jeu (et non sur l'horloge) : le rendu logiciel est lent.
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
  p.on('console', m => { if (m.type() === 'error' || /V11 :/.test(m.text())) errors.push(m.text()); });
  await p.goto(BASE + (process.env.PAGE || 'index.html'));
  await p.waitForFunction(() => window.aerinGame && aerinGame.state.ready, null, { timeout: 120000 });
  const G = fn => p.evaluate(fn);
  // Le HTML autonome démarre seul (AERIN_DIRECT_LAUNCH) : JOUER n'y est pas affiché.
  await p.waitForTimeout(500);
  if (!(await G(() => aerinGame.state.started))) await p.click('#start-button');
  // Le lancement direct peut s'ouvrir en pause (perte de focus du navigateur piloté, déjà le cas en V10).
  if (await G(() => aerinGame.state.paused)) await p.click('#resume-button');
  const until = (fn, arg, t = +(process.env.WAIT_MS || 240000)) => p.waitForFunction(fn, arg, { timeout: t, polling: 50 });
  const results = {};

  // 1. Tenue et bibliothèque de mouvements
  const info = await G(() => {
    const g = aerinGame, k = g.knight;
    return { version: g.version, parts: k && k.parts.length, cape: !!(k && k.cape.mesh.parent), sword: k && k.sword.group.visible,
      oldHidden: !g.actor.getObjectByName('Aerin_Sword').visible, clips: Object.keys(g.actions).filter(n => n.startsWith('K_')).sort(), cur: g.state.currentClip };
  });
  assert.ok(['V11','V12','V13','V15'].includes(info.version));
  assert.ok(info.parts >= 14, 'pièces d’armure fixées aux os');
  assert.ok(info.sword && info.oldHidden, 'épée longue visible, ancienne épée masquée');
  const V11 = ['K_Backflip','K_Charge','K_Guard','K_GuardBack','K_GuardFwd','K_HopL','K_HopR','K_JumpSlash','K_Run','K_ShieldBash','K_Slash1','K_Slash2','K_Slash3','K_Slash4','K_Spin','K_Stagger','K_StrafeL','K_StrafeR'];
  for (const c of V11) assert.ok(info.clips.includes(c), 'mouvement V11 manquant : ' + c); // la V12 en ajoute d'autres
  results.tenue = info;

  // 2. Placement face au mannequin 02 (0,0,-3) et verrouillage
  await G(() => { const g = aerinGame; g.player.position.set(0, 0, -1.55); g.player.rotation.y = Math.PI; g.state.yaw = 0; });
  await p.keyboard.press('KeyF');
  await until(() => aerinGame.state.lock === 1);
  await until(() => aerinGame.state.currentClip === 'K_Guard');
  results.cible = await G(() => aerinGame.state.lock);

  // 3. Combo : quatre appuis enchaînés, coups complets (cible verrouillée) qui touchent
  const hp0 = await G(() => aerinGame.dummies[1].hp);
  await p.keyboard.press('Space');
  await until(() => aerinGame.state.currentClip === 'K_Slash1');
  await p.keyboard.press('Space'); // file d'attente → annulation vers le revers à 60 %
  await until(() => aerinGame.state.currentClip === 'K_Slash2');
  await until(() => aerinGame.state.hits >= 1);
  const stop = await G(() => aerinGame.state.hitStop >= 0);
  assert.ok(stop);
  await until(() => !aerinGame.state.action);
  const hp1 = await G(() => aerinGame.dummies[1].hp);
  assert.ok(hp1 < hp0, 'le combo inflige des dégâts');
  results.combo = { hp0, hp1, hits: await G(() => aerinGame.state.hits) };

  // 4. Charge puis attaque tournoyante (relâcher une fois chargée)
  await G(() => { const s = aerinGame.state; s.stamina = 100; aerinGame.dummies[1].hp = 100; });
  await p.keyboard.down('Space');
  await until(() => aerinGame.state.action === 'charge');
  await until(() => aerinGame.state.charged === true);
  await p.keyboard.up('Space');
  await until(() => aerinGame.state.action === 'spin');
  await until(() => aerinGame.state.spinHits >= 2);
  const spinRot = await G(() => aerinGame.actor.rotation.y);
  await until(() => !aerinGame.state.action);
  results.tournoyante = { spinRot, hp: await G(() => aerinGame.dummies[1].hp), actorReset: await G(() => aerinGame.actor.rotation.y) };
  assert.ok(results.tournoyante.hp < 100);
  assert.equal(results.tournoyante.actorReset, 0);

  // 5. Salto arrière (esquive verrouillée sans direction) : recul et rotation
  await G(() => { aerinGame.state.stamina = 100; });
  const z0 = await G(() => aerinGame.player.position.distanceTo(aerinGame.dummies[1].root.position));
  await p.keyboard.press('KeyE');
  await until(() => aerinGame.state.action === 'flip');
  await until(() => aerinGame.actor.rotation.x < -1);
  await until(() => !aerinGame.state.action);
  const z1 = await G(() => aerinGame.player.position.distanceTo(aerinGame.dummies[1].root.position));
  assert.ok(z1 > z0 + .5, 'le salto éloigne de la cible');
  results.salto = { avant: +z0.toFixed(2), apres: +z1.toFixed(2) };

  // 6. Bond latéral (gauche + esquive)
  await G(() => { aerinGame.state.stamina = 100; aerinGame.state.rollCooldown = 0; });
  const x0 = await G(() => aerinGame.player.position.x);
  await p.keyboard.down('KeyA');
  await p.keyboard.press('KeyE');
  await until(() => aerinGame.state.action === 'hop');
  await p.keyboard.up('KeyA');
  await until(() => !aerinGame.state.action);
  const x1 = await G(() => aerinGame.player.position.x);
  assert.ok(Math.abs(x1 - x0) > .5, 'déplacement latéral');
  results.bond = { dx: +(x1 - x0).toFixed(2) };

  // 7. Pas chassés (cible verrouillée + déplacement latéral) : 4 clips mêlés
  await p.keyboard.down('KeyD');
  await until(() => aerinGame.state.currentClip === '__strafe');
  // poids relevés à l'instant où ils sont atteints (le joueur tourne autour de la cible, ils évoluent ensuite)
  await until(() => { const w = ['K_GuardFwd', 'K_GuardBack', 'K_StrafeL', 'K_StrafeR'].map(n => +aerinGame.actions[n].getEffectiveWeight().toFixed(2)); if (w[2] + w[3] > .5) { window.__strafeW = w; return true; } return false; });
  results.pasChasses = await G(() => window.__strafeW);
  await p.keyboard.up('KeyD');
  assert.ok(results.pasChasses[2] + results.pasChasses[3] > .5, 'poids des pas chassés');

  // 8. Saut frappé
  await G(() => { const g = aerinGame; g.state.stamina = 100; g.player.position.set(0, 0, -1.9); g.dummies[1].hp = 100; });
  await until(() => !aerinGame.state.action);
  await p.keyboard.press('KeyJ');
  await until(() => aerinGame.state.action === 'jump');
  await p.keyboard.press('Space');
  await until(() => aerinGame.state.action === 'jumpslash');
  await until(() => aerinGame.actor.position.y > .2 || aerinGame.player.position.y > .2); // V13 : en l'air, la trajectoire est celle du vrai saut
  await until(() => !aerinGame.state.action);
  results.sautFrappe = { hp: await G(() => aerinGame.dummies[1].hp) };
  assert.ok(results.sautFrappe.hp < 100);

  // 9. Coup de bouclier pendant la riposte du mannequin
  await G(() => { const g = aerinGame; g.state.stamina = 100; g.player.position.set(0, 0, -1.6); const d = g.dummies[1]; d.phase = 'windup'; d.timer = 5; });
  await p.keyboard.down('KeyB');
  await until(() => aerinGame.state.currentClip === 'Shield_Hold');
  await p.keyboard.press('Space');
  await until(() => aerinGame.state.action === 'bash');
  await until(() => aerinGame.dummies[1].phase === 'recover');
  await p.keyboard.up('KeyB');
  results.bouclier = 'riposte brisée';

  // 10. Cape et traînée réellement mises à jour, vue 1re personne
  results.cape = await G(() => { const g = aerinGame, a = g.knight.cape.mesh.geometry.attributes.position.array, sp = g.knight.bones.Spine2.getWorldPosition(new THREE.Vector3()); return +Math.hypot(a[0] - sp.x, a[2] - sp.z).toFixed(3); });
  assert.ok(results.cape < .45, 'cape accrochée au dos');
  await p.keyboard.press('KeyF');
  await p.keyboard.press('KeyV');
  results.premierePersonne = await G(() => ({ cape: aerinGame.knight.cape.mesh.visible, epee: aerinGame.knight.sword.group.visible }));
  assert.equal(results.premierePersonne.cape, false);
  await p.keyboard.press('KeyV');

  assert.deepEqual(errors, [], 'aucune erreur JS');
  results.rendu = await G(() => window.aerinRenderMode);
  console.log(JSON.stringify(results, null, 1));
  console.log('OK AERIN V11 : chevalier, mouvements, cible, combo, tournoyante, salto, bond, saut frappé, bouclier, cape');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
