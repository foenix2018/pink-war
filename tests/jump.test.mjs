import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame, moveInArena } from '../dist/game-logic.js';

const simulate = (game, seconds, input = {}) => {
  for (let t = 0; t < seconds - 1e-9; t += .02) game.step(.02, input);
};

test('jump is edge-triggered, follows gravity and ends exactly on the floor', () => {
  const game = new ArenaGame(); game.nextWave = 999;
  game.step(.02, { jump:true });
  assert.equal(game.player.grounded, false);
  assert.ok(game.player.elevation > 0);
  simulate(game, .2, { jump:true });
  assert.ok(game.player.elevation > .5);
  simulate(game, 1.1, { jump:true });
  assert.equal(game.player.grounded, true, 'holding L2 must not auto-jump');
  assert.equal(game.player.elevation, 0);
  assert.equal(game.player.verticalSpeed, 0);
  game.step(.02, { jump:false });
  game.step(.02, { jump:true });
  assert.equal(game.player.grounded, false, 'new press starts a second jump');
});

test('a running jump crosses a low service obstacle but not a tall wall', () => {
  const low = { x:0, z:19, hx:1, hz:.45, height:1 };
  const game = new ArenaGame([low]); game.nextWave = 999;
  game.step(.02, { z:-1, jump:true });
  simulate(game, .7, { z:-1 });
  assert.ok(game.player.z < 19, 'the low obstacle should be cleared');
  const wall = { x:0, z:0, hx:1, hz:.45, height:3 };
  const p = { x:0, z:2, elevation:1.3 };
  moveInArena(p, 0, -2, .55, [wall]);
  assert.ok(p.z > .95, 'a high wall remains solid during a jump');
});

test('jumping does not create extra events after landing while trigger is held', () => {
  const game = new ArenaGame(); game.nextWave = 999;
  simulate(game, 2, { jump:true });
  const events = game.drainEvents().map(event=>event.type);
  assert.equal(events.filter(x=>x==='jump').length, 1);
  assert.equal(events.filter(x=>x==='land').length, 1);
});
