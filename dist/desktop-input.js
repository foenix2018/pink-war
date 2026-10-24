// Prefer the browser's standard mapping. Raw HID devices must match a known
// DualShock 4 signature: treating a resting trigger as a stick caused drift.
export const DESKTOP_DEADZONE = .2;
export const DESKTOP_BUTTONS = Object.freeze({ jump: 0, crouch: 1, reload: 2, next: 3,
  aim: 6, fire: 7, pause: 9, sprint: 10, interact: 11, companion:12 });
export const desktopAxis = value => Number.isFinite(value) && Math.abs(value) > DESKTOP_DEADZONE ? Math.max(-1, Math.min(1, value)) : 0;
const pressed = button => !!button?.pressed || (Number.isFinite(button?.value) && button.value > .15);
const button = (value = 0, touched = false) => ({ value: Math.max(0, Math.min(1, value)), pressed: value > .15, touched: touched || value > 0 });
const identity = pad => `${pad.index}:${pad.id}:${pad.sourceMapping || pad.mapping}`;
const active = pad => pad.axes.slice(0, 4).some(value => desktopAxis(value) !== 0) || pad.buttons.some(pressed);
const knownDualShock4 = id => /\b054c\b.*\b(?:05c4|09cc|0ba0)\b/i.test(id) || /\bdualshock\s*4\b/i.test(id);

// The macOS HID layout is shared by USB/Bluetooth DS4 revisions. Axis 3/4
// are triggers (-1 at rest), axis 5 is right-stick Y, and axis 9 is the hat.
// Reference: Chromium gamepad_standard_mappings_mac.mm, MapperDualshock4.
// https://chromium.googlesource.com/chromium/src/+/refs/tags/125.0.6422.148/device/gamepad/gamepad_standard_mappings_mac.mm
export function normalizeDesktopGamepad(pad) {
  if (!pad || pad.connected === false || !pad.axes || !pad.buttons) return null;
  if (pad.mapping === 'standard') {
    return pad.axes.length >= 4 && pad.axes.slice(0, 4).every(Number.isFinite) && pad.buttons.length >= 12 ? pad : null;
  }
  // Deliberately do not guess from "Wireless Controller" alone, four axes,
  // trigger positions, or an unrecognised third-party clone's name.
  if (pad.mapping || !knownDualShock4(pad.id || '') || pad.axes.length !== 10 || pad.buttons.length !== 14
    || ![0, 1, 2, 3, 4, 5, 9].every(index => Number.isFinite(pad.axes[index]))) return null;
  const buttons = Array.from({ length: 18 }, () => button());
  const mapping = [1, 2, 0, 3, 4, 5, null, null, 8, 9, 10, 11, null, null, null, null, 12, 13];
  for (let i = 0; i < mapping.length; i++) if (mapping[i] !== null) buttons[i] = pad.buttons[mapping[i]];
  buttons[6] = button((pad.axes[3] + 1) / 2);
  buttons[7] = button((pad.axes[4] + 1) / 2);
  // Neutral is outside [-1,1]; rounded sectors tolerate HID quantisation.
  const hat = pad.axes[9], sector = Math.round((hat + 1) * 3.5);
  if (hat >= -1 && hat <= 1 && Math.abs(hat - (sector / 3.5 - 1)) < .09) {
    for (const [index, sectors] of [[12, [7, 0, 1]], [13, [3, 4, 5]], [14, [5, 6, 7]], [15, [1, 2, 3]]]) {
      buttons[index] = button(sectors.includes(sector) ? 1 : 0);
    }
  }
  return { index: pad.index, id: pad.id, connected: pad.connected !== false, timestamp: pad.timestamp,
    mapping: 'standard', sourceMapping: 'dualshock4-macos-hid', axes: [pad.axes[0], pad.axes[1], pad.axes[2], pad.axes[5]],
    buttons, vibrationActuator: pad.vibrationActuator, hapticActuators: pad.hapticActuators };
}

export class DesktopGamepadInput {
  constructor() { this.ready = new Set(); this.activeKey = null; }
  reset() { this.ready.clear(); this.activeKey = null; }
  select(devices, { focused = true } = {}) {
    if (!focused) { this.reset(); return null; }
    const pads = Array.from(devices || []).map(normalizeDesktopGamepad).filter(Boolean);
    const connected = new Set(pads.map(identity));
    for (const key of this.ready) if (!connected.has(key)) this.ready.delete(key);
    for (const pad of pads) {
      // Connect/reconnect, blur and pause all require neutral controls before
      // arming. Crucially, this checks normalized sticks, never raw triggers.
      if (!active(pad)) this.ready.add(identity(pad));
    }
    const eligible = pads.filter(pad => this.ready.has(identity(pad)));
    const previous = eligible.find(pad => identity(pad) === this.activeKey);
    const selected = previous && active(previous) ? previous : eligible.find(active) || previous || eligible[0] || null;
    this.activeKey = selected ? identity(selected) : null;
    return selected;
  }
}
