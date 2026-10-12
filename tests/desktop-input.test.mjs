import test from 'node:test';
import assert from 'node:assert/strict';
import { DesktopGamepadInput, desktopAxis } from '../dist/desktop-input.js';
import { VRController } from '../dist/vr.js';
import { ArenaGame } from '../dist/game-logic.js';

const pad = (changes = {}) => ({ index: 0, id: 'Xbox', connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
  buttons: Array.from({length: 17}, () => ({pressed: false, value: 0})), ...changes });

test('unmapped HID resting at +1 cannot move the desktop player backwards', () => {
  const devices = [pad({id: 'Pedals', mapping: '', axes: [0, 1, 0, 0]})];
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => devices});
  try {
    const game = new ArenaGame([], () => .5);
    const controller = Object.assign(Object.create(VRController.prototype), {mode: 'off', previous: new Map(),
      hooks: {game: () => game, phase: () => 'playing'}});
    const initial = game.player.z;
    for (let i = 0; i < 60; i++) game.step(1 / 60, controller.input());
    assert.equal(game.player.z, initial);
    assert.equal(controller.input().fire, false);
    // The same standard controller deliberately moves once released to centre.
    devices[0] = pad(); controller.input(); devices[0].axes[1] = -.8;
    for (let i = 0; i < 60; i++) game.step(1 / 60, controller.input());
    assert.ok(game.player.z < initial - 5);
    devices[0].axes[1] = 0; const stopped = game.player.z;
    for (let i = 0; i < 60; i++) game.step(1 / 60, controller.input());
    assert.equal(game.player.z, stopped);
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor);
    else delete navigator.getGamepads;
  }
});

test('a standard controller held backwards on connection must return to neutral', () => {
  const input = new DesktopGamepadInput(), device = pad({axes: [0, 1, 0, 0]});
  for (let i = 0; i < 30; i++) assert.equal(input.select([device]), null);
  device.axes[1] = 0; assert.equal(input.select([device]), device);
  device.axes[1] = 1; assert.equal(input.select([device]), device);
  input.select([]); assert.equal(input.select([device]), null, 'reconnection starts unarmed');
});

test('two desktop controllers never add opposing inputs', () => {
  const input = new DesktopGamepadInput(), a = pad(), b = pad({index: 1, id: 'DualSense'});
  input.select([a, b]); b.axes[1] = -1;
  assert.equal(input.select([a, b]), b, 'the controller in use wins over an idle device');
  a.axes[1] = 1; assert.equal(input.select([a, b]), b, 'keep the active controller until released');
  b.axes[1] = 0; assert.equal(input.select([a, b]), a);
  assert.equal(input.select([pad({connected: false}), pad({mapping: 'xr-standard'})]), null);
});

test('switching desktop controllers treats a held action as one fresh press', () => {
  const a = pad(), b = pad({index: 1, id: 'DualSense'}), descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => [a, b]});
  let reloads = 0;
  try {
    const controller = Object.assign(Object.create(VRController.prototype), {mode: 'off', previous: new Map(), hooks: {
      phase: () => 'playing', game: () => ({reload: () => {reloads++; return true;}})
    }});
    controller.input(); a.buttons[0].pressed = true; controller.input(); controller.input(); assert.equal(reloads, 1);
    b.buttons[0].pressed = true; a.buttons[0].pressed = false; controller.input(); controller.input(); assert.equal(reloads, 2);
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor);
    else delete navigator.getGamepads;
  }
});

test('desktop stick drift and invalid axes stay at zero without altering deliberate motion', () => {
  for (const value of [undefined, NaN, Infinity, -Infinity, 0, .18, -.18, .2, -.2]) assert.equal(desktopAxis(value), 0);
  assert.equal(desktopAxis(-.8), -.8); assert.equal(desktopAxis(.7), .7);
  const input = new DesktopGamepadInput(); assert.equal(input.select([pad({axes: [0, NaN, 0, 0]})]), null);
});
