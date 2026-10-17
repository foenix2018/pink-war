import test from 'node:test';
import assert from 'node:assert/strict';
import { DesktopGamepadInput, normalizeDesktopGamepad, DESKTOP_BUTTONS } from '../dist/desktop-input.js';
import { VRController } from '../dist/vr.js';

const buttons = length => Array.from({ length }, () => ({ pressed: false, value: 0, touched: false }));
const raw = (changes = {}) => ({ index: 0, connected: true, id: 'Wireless Controller (Vendor: 054c Product: 05c4)', mapping: '',
  axes: [0, 0, 0, -1, -1, 0, 0, 0, 0, 1.2857142857], buttons: buttons(14), ...changes });
const standard = (changes = {}) => ({ index: 0, connected: true, id: 'DualShock 4 Wireless Controller', mapping: 'standard',
  axes: [0, 0, 0, 0], buttons: buttons(18), ...changes });
function withController(device, run) {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  const devices = [device], calls = { reload: 0, next: 0, pause: 0 };
  let phase = 'playing';
  const input = new DesktopGamepadInput();
  const controller = Object.assign(Object.create(VRController.prototype), { mode: 'off', previous: new Map(), desktopGamepads: input,
    hooks: { phase: () => phase, game: () => ({ reload() { calls.reload++; return true; }, cycleWeapon() { calls.next++; return true; } }),
      togglePause() { calls.pause++; phase = phase === 'playing' ? 'paused' : 'playing'; input.reset(); controller.previous.clear(); } } });
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => devices });
  try { run({ controller, input, calls, devices }); }
  finally { if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor); else delete navigator.getGamepads; }
}

test('DualShock USB/Bluetooth raw HID exposes four sticks without resting trigger drift', () => {
  for (const id of ['Wireless Controller (Vendor: 054c Product: 05c4)', '054c-09cc-Wireless Controller',
    'DUALSHOCK 4 Wireless Controller (Vendor: 054c Product: 0ba0)']) {
    const pad = raw({ id }), input = new DesktopGamepadInput();
    // Inertial data is not movement or an activation command.
    pad.axes[6] = 1; pad.axes[7] = -1; pad.axes[8] = .8;
    const normalized = input.select([pad]);
    assert.deepEqual(normalized.axes, [0, 0, 0, 0]);
    assert.equal(normalized.buttons[6].value, 0); assert.equal(normalized.buttons[7].value, 0);
    pad.axes[0] = .5; pad.axes[1] = -.8; pad.axes[2] = -.4; pad.axes[5] = .6;
    pad.axes[3] = 0; pad.axes[4] = 1;
    const moved = input.select([pad]);
    assert.deepEqual(moved.axes, [.5, -.8, -.4, .6]);
    assert.equal(moved.buttons[6].value, .5); assert.equal(moved.buttons[7].value, 1);
  }
});

test('browser standard mapping takes precedence and ambiguous or malformed raw devices are ignored', () => {
  const pad = standard(); assert.equal(normalizeDesktopGamepad(pad), pad);
  for (const bad of [raw({ id: 'Wireless Controller' }), raw({ id: 'Pedals' }), raw({ mapping: 'xr-standard' }),
    raw({ id: 'Vendor: 1234 Product: 09cc' }), raw({ id: 'Vendor: 054c Product: 0ce6' }), raw({ axes: [0, 0, 0, 0] }),
    raw({ buttons: buttons(12) }), raw({ connected: false })]) assert.equal(normalizeDesktopGamepad(bad), null);
  const invalid = raw(); invalid.axes[5] = NaN; assert.equal(normalizeDesktopGamepad(invalid), null);
  // A browser gaining its native mapping is a different profile and must re-arm.
  const input = new DesktopGamepadInput(), native = standard({ id: raw().id });
  input.select([raw()]); native.buttons[7].pressed = true;
  assert.equal(input.select([native]), null);
});

test('raw trigger held on connect, blur, reset and reconnect requires neutral before resuming', () => {
  const device = raw(), input = new DesktopGamepadInput(); device.axes[4] = 1;
  assert.equal(input.select([device]), null);
  device.axes[4] = -1; assert.ok(input.select([device]));
  device.axes[1] = 1; assert.ok(input.select([device]));
  assert.equal(input.select([device], { focused: false }), null);
  assert.equal(input.select([device]), null);
  device.axes[1] = 0; assert.ok(input.select([device]));
  input.reset(); device.buttons[1].pressed = true; assert.equal(input.select([device]), null);
  device.buttons[1].pressed = false; assert.ok(input.select([device]));
  input.select([]); device.axes[3] = .7; assert.equal(input.select([device]), null);
  device.axes[3] = -1; assert.ok(input.select([device]));
});

test('raw DS4 face buttons, shoulder inputs and hat normalize independently', () => {
  const device = raw();
  for (const [source, target] of [[1, 0], [2, 1], [0, 2], [3, 3], [4, 4], [5, 5], [8, 8], [9, 9], [10, 10], [11, 11], [12, 16], [13, 17]]) {
    device.buttons[source].pressed = true;
    assert.equal(normalizeDesktopGamepad(device).buttons[target].pressed, true);
    device.buttons[source].pressed = false;
  }
  for (const [value, expected] of [[-1, [12]], [-5 / 7, [12, 15]], [-3 / 7, [15]], [-1 / 7, [13, 15]],
    [1 / 7, [13]], [3 / 7, [13, 14]], [5 / 7, [14]], [1, [12, 14]], [1.285714, []]]) {
    device.axes[9] = value;
    assert.deepEqual([12, 13, 14, 15].filter(index => normalizeDesktopGamepad(device).buttons[index].pressed), expected);
  }
});

test('DualShock standard uses Cross jump, Square reload, Triangle next, Circle crouch and R3 interaction', () => {
  const device = standard();
  withController(device, ({ controller, calls, devices }) => {
    controller.input();
    for (const [index, property] of [[DESKTOP_BUTTONS.jump, 'jump'], [DESKTOP_BUTTONS.crouch, 'crouchToggle'], [DESKTOP_BUTTONS.interact, 'pickup']]) {
      device.buttons[index].pressed = true;
      assert.equal(controller.input()[property], true); assert.equal(controller.input()[property], false, 'held action has one edge');
      device.buttons[index].pressed = false; controller.input();
    }
    device.buttons[2].pressed = true; controller.input(); controller.input(); assert.equal(calls.reload, 1);
    device.buttons[2].pressed = false; controller.input();
    device.buttons[3].pressed = true; controller.input(); controller.input(); assert.equal(calls.next, 1);
    device.buttons[3].pressed = false; controller.input();
    device.buttons[6].value = .6; device.buttons[7].value = .8;
    const shooting = controller.input(); assert.equal(shooting.precision, true); assert.equal(shooting.fire, true); assert.equal(shooting.jump, false);
    devices.length = 0; const disconnected = controller.input();
    assert.equal(disconnected.fire, false); assert.equal(disconnected.precision, false);
  });
});

test('DualShock raw HID reaches gameplay, with no false edge after Options pause or held reconnect', () => {
  const device = raw();
  withController(device, ({ controller, calls, devices }) => {
    assert.equal(controller.input().fire, false);
    device.buttons[0].pressed = true; controller.input(); controller.input(); assert.equal(calls.reload, 1);
    device.buttons[0].pressed = false; controller.input();
    device.axes[4] = 1; assert.equal(controller.input().fire, true);
    device.axes[4] = -1; controller.input();
    device.buttons[9].pressed = true; assert.equal(controller.input().fire, false); controller.input(); assert.equal(calls.pause, 1);
    device.buttons[9].pressed = false; controller.input();
    device.buttons[9].pressed = true; controller.input(); controller.input(); assert.equal(calls.pause, 2);
    device.buttons[9].pressed = false; controller.input();
    device.buttons[0].pressed = true; controller.input(); assert.equal(calls.reload, 2);
    devices.length = 0; controller.input(); devices.push(device); controller.input(); assert.equal(calls.reload, 2);
    device.buttons[0].pressed = false; controller.input(); device.buttons[0].pressed = true; controller.input(); assert.equal(calls.reload, 3);
  });
});
