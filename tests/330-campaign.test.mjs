import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignLevel1, LEVEL1 } from '../dist/campaign-level1.js';
import { COVER_WALLS, segmentBox } from '../dist/game-logic.js';
import { createTraversalObstacles } from '../dist/world-layout.js';
import { enemyScale } from '../dist/enemy-combat.js';

const random = () => .5;
const advance = (game, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds / .025); i++) game.step(.025, input);
};
const at = (game, point, offset = 1.5) => Object.assign(game.player,
  { x: point.x, z: point.z + offset, elevation: point.y || 0, grounded: true });
const archive = game => {
  at(game, LEVEL1.power); assert.equal(game.interact(), true);
  at(game, LEVEL1.archive); assert.equal(game.interact(), true);
};

test('level 1 starts occupied, then preserves ordered objectives and the portal windup', () => {
  const game = new CampaignLevel1([], random);
  assert.equal(game.mode, 'campaign');
  assert.equal(game.stage, 'power');
  assert.equal(game.player.z, 72);
  assert.equal(game.getInteraction(), null);
  game.invulnerable=1000;advance(game, 12);
  assert.equal(game.enemies.filter(e=>e.opening).length, 2);
  assert.equal(game.activePortals.length, 0);
  at(game, LEVEL1.archive);
  assert.equal(game.interact(), false, 'the archive has no power yet');
  archive(game);
  advance(game, 4.9);
  assert.equal(game.stage, 'breach');
  assert.equal(game.enemies.filter(e=>!e.opening).length, 0);
  assert.equal(game.activePortals.length, 0);
  advance(game, .2);
  assert.equal(game.stage, 'combat');
  assert.equal(game.activePortals.length, 1);
  assert.equal(game.toSpawn, 4);
  advance(game, 2.8);
  assert.equal(game.enemies.filter(e=>!e.opening).length, 0);
  advance(game, .3);
  const portalEnemy=game.enemies.find(e=>!e.opening);assert.equal(portalEnemy.form, 'probe');assert.equal(portalEnemy.grounded,false);
});

test('interactions reject distance, the wrong floor and solid walls, including the final elevated terminal', () => {
  const wall = { x: -6, z: 62.7, hx: 2, hz: .1, height: 3 };
  const game = new CampaignLevel1([wall], random);
  at(game, LEVEL1.power);
  assert.equal(game.interact(), false);
  game.replaceObstacles([]);
  game.player.elevation = 4.8;
  assert.equal(game.interact(), false);
  game.player.elevation = 0;
  assert.equal(game.collectWeapon(), true, 'the existing VR pickup action operates the terminal');
  game.stage = 'exit';
  at(game, LEVEL1.exit);
  game.player.elevation = 0;
  assert.equal(game.interact(), false);
  game.player.elevation = 4.8;
  game.player.z += 2;
  assert.equal(game.interact(), false);
  game.player.z -= 2;
  assert.equal(game.interact(), true);
  assert.equal(game.state, 'won');
  assert.equal(game.completed, true);
});

test('offline human archives name the other sibling and reset keeps the selected character', () => {
  for (const [character, sibling] of [['ghju', 'LYLU'], ['lylu', 'GHJU']]) {
    const game = new CampaignLevel1([], random, character);
    assert.deepEqual(game.archiveLines, []);
    archive(game);
    assert.ok(game.archiveLines.some(line => line === `INTERVENTION HUMAINE : ${sibling}`));
    assert.ok(game.archiveLines.includes('ARCHIVE LOCALE — RÉSEAU DÉCONNECTÉ'));
    game.reset();
    assert.equal(game.characterId, character);
    assert.equal(game.sibling, sibling);
    assert.equal(game.stage, 'power');
    assert.deepEqual(game.archiveLines, []);
    assert.equal(game.time, 0);
    assert.equal(game.spawned, 0);
  }
});

test('approaching the expected portal while reading chooses another distant reachable site', () => {
  const game = new CampaignLevel1([...COVER_WALLS.map(b => ({ ...b })), ...createTraversalObstacles()], random);
  archive(game);
  at(game, LEVEL1.portal, 0);
  advance(game, 5.1);
  assert.equal(game.stage, 'combat');
  const portal = game.activePortals[0];
  assert.ok(Math.hypot(portal.x - game.player.x, portal.z - game.player.z) >= 12);
  const cell = game.navigation.nearestOpen(portal.x, portal.z);
  assert.ok(game.navigation.distance[cell] >= 0);
  assert.equal(game.portalIsClear(portal), true);
});

test('a blocked map defers the breach without spawning at the player and recovers after obstacles change', () => {
  const game = new CampaignLevel1([], random);game.invulnerable=1000;
  archive(game);
  game.replaceObstacles([{ x: 0, z: 0, hx: 99, hz: 99, height: 9 }]);
  advance(game, 9);
  assert.equal(game.stage, 'breach');
  assert.equal(game.enemies.filter(e=>!e.opening).length, 0);
  assert.equal(game.activePortals.length, 0);
  game.replaceObstacles([]);
  advance(game, .1);
  assert.equal(game.stage, 'combat');
  assert.equal(game.enemies.filter(e=>!e.opening).length, 0);
});

test('pause and death freeze objective timers, and replay clears the finite encounter', () => {
  const game = new CampaignLevel1([], random);
  archive(game);
  const time = game.time;
  game.state = 'paused';
  advance(game, 20);
  assert.equal(game.time, time);
  assert.equal(game.interact(), false);
  assert.equal(game.activePortals.length, 0);
  game.state = 'playing';
  game.invulnerable=0;game.damage(100);
  advance(game, 20);
  assert.equal(game.state, 'over');
  assert.equal(game.time, time);
  assert.equal(game.enemies.filter(e=>!e.opening).length, 0);
  game.reset('lylu');
  assert.equal(game.player.hp, 100);
  assert.equal(game.stage, 'power');
  assert.equal(game.characterId, 'lylu');
  assert.equal(game.ammo[0], 12);
});

test('two scripted patrols can be defeated with actual R9 projectiles before the elevated ending', () => {
  const game = new CampaignLevel1([], random);
  game.invulnerable = 1000;
  archive(game);
  advance(game, 5.1);
  const forms = [], recorded = new Set();
  let attempts = 0;
  // Aim at the physical torso of each model. Projectiles retain their direction;
  // this test uses no damageEnemy shortcut, hit-assist or injected kills.
  while (game.stage === 'combat' && attempts++ < 6000) {
    for (const enemy of game.enemies) {
      if (!recorded.has(enemy.id)) { recorded.add(enemy.id); forms.push(enemy.form); }
      enemy.speed = 0;
      enemy.stunnedUntil = 1000;
    }
    const target = game.enemies[0];
    if (target) {
      if (game.ammo[0] === 0) game.reload();
      const scale = enemyScale(target.form, target.elite);
      const torso = { x: target.x, y: target.elevation + (target.form === 'probe' ? .55 : target.form === 'scuttler' ? .79 : 1.27) * scale, z: target.z };
      const origin = { x: game.player.x, y: game.player.elevation + 1.45, z: game.player.z };
      game.shoot(origin, { x: torso.x - origin.x, y: torso.y - origin.y, z: torso.z - origin.z });
    }
    game.step(.025);
  }
  assert.ok(attempts < 6000, 'all four real collision models can be shot');
  assert.deepEqual(forms, ['probe','stalker','probe', 'stalker', 'scuttler', 'seer']);
  assert.equal(game.kills, 6);
  assert.equal(game.toSpawn, 0);
  assert.equal(game.stage, 'crossing');
  assert.ok(game.weaponOffers.some(o=>o.index===1));
  assert.equal(game.state, 'playing');
  assert.equal(game.completed, false);
  const events = game.drainEvents();
  assert.equal(events.filter(e => e.type === 'clear').length, 1);
  assert.equal(events.some(e => e.type === 'win'), false);
  advance(game, 30);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.wave, 1);
  assert.equal(game.activePortals.length, 0);
  at(game, LEVEL1.junction,0);advance(game,.1);
  assert.equal(game.stage,'combat2');
  attempts=0;
  while(game.stage==='combat2'&&attempts++<6000){
    const target=game.enemies[0];if(target){target.speed=0;target.stunnedUntil=1000;if(game.ammo[0]===0)game.reload();
      const scale=enemyScale(target.form,target.elite);const origin={x:game.player.x,y:game.player.elevation+1.45,z:game.player.z};
      const y=target.elevation+(target.form==='probe'?.55:target.form==='scuttler'?.79:1.27)*scale;
      game.shoot(origin,{x:target.x-origin.x,y:y-origin.y,z:target.z-origin.z});
    }game.step(.025);
  }
  assert.ok(attempts<6000);assert.equal(game.kills,10);assert.equal(game.stage,'exit');
  at(game, LEVEL1.exit);
  assert.equal(game.interact(), true);
  const end = game.drainEvents();
  assert.equal(end.filter(e => e.type === 'campaign-complete').length, 1);
  assert.equal(end.filter(e => e.type === 'win').length, 1);
  assert.equal(game.startEndless(), false);
  assert.equal(game.beginWave(), false);
  assert.equal(game.spawnEnemy(), false);
  assert.equal(game.interact(), false);
  const finished = game.snapshot();
  advance(game, 30);
  assert.deepEqual(game.snapshot(), finished);
  assert.equal(finished.campaign.stage, 'complete');
});

test('a missed laser remains a miss and current cover blocks campaign shots', () => {
  const game = new CampaignLevel1([], random);
  archive(game); advance(game, 8.2);
  const enemy = game.enemies.find(e=>!e.opening);
  enemy.stunnedUntil = 1000; enemy.speed = 0;
  const hp = enemy.hp;
  const origin = { x: game.player.x, y: 1.4, z: game.player.z };
  game.shoot(origin, { x: 1, y: 0, z: 0 });
  advance(game, .5);
  assert.equal(enemy.hp, hp, 'there is no homing towards a nearby hostile');
  const wall = { x: 0, z: 44, hx: 3, hz: .2, height: 6 };
  const aim = { x: enemy.x, y: enemy.elevation + .55, z: enemy.z };
  assert.notEqual(segmentBox(origin, aim, wall), null);
  game.replaceObstacles([wall]);
  game.shoot(origin, { x: aim.x - origin.x, y: aim.y - origin.y, z: aim.z - origin.z });
  advance(game, .5);
  assert.equal(enemy.hp, hp, 'cover uses the shared actual projectile collision');
});
