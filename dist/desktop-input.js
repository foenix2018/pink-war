// Browser gamepads can include wheels, pedals and other HID devices whose
// resting axes are +/-1. Only the standard dual-stick mapping is supported.
export const DESKTOP_DEADZONE = .2;
export const desktopAxis = value => Number.isFinite(value) && Math.abs(value) > DESKTOP_DEADZONE ? Math.max(-1, Math.min(1, value)) : 0;
const pressed = button => !!button?.pressed || (button?.value || 0) > .15;
const identity = pad => `${pad.index}:${pad.id}`;
const active = pad => pad.axes.slice(0, 4).some(value => desktopAxis(value) !== 0) || pad.buttons.some(pressed);

export class DesktopGamepadInput {
  constructor() { this.ready = new Set(); this.activeKey = null; }
  select(devices) {
    const pads = Array.from(devices).filter(pad => pad && pad.connected !== false && pad.mapping === 'standard'
      && pad.axes?.length >= 4 && pad.axes.slice(0, 4).every(Number.isFinite) && pad.buttons);
    const connected = new Set(pads.map(identity));
    for (const key of this.ready) if (!connected.has(key)) this.ready.delete(key);
    for (const pad of pads) {
      // A connection or reconnection with an already tilted stick must not
      // move the player. Release sticks and buttons once to arm this device.
      if (!active(pad)) this.ready.add(identity(pad));
    }
    const eligible = pads.filter(pad => this.ready.has(identity(pad)));
    const previous = eligible.find(pad => identity(pad) === this.activeKey);
    const selected = previous && active(previous) ? previous : eligible.find(active) || previous || eligible[0] || null;
    this.activeKey = selected ? identity(selected) : null;
    return selected;
  }
}
