// Feedback of the armour layer (armor-combat.js) shared by M01, M02, the Arena and the Range: synthesised sounds,
// controller rumble, impulse charges in flight and their pulse, and the strike motion of the held weapon.
// No dynamic light is added (a new light recompiles every material on Quest): additive meshes only.
import { CHARGE_RADIUS, MELEE_COOLDOWN } from './armor-combat.js';

const STRIKE_TIME = .26;
// 0 → 1 → 0 over the strike: the weapon jabs forward and comes back. Engines add it to their FPS weapon pose.
export function meleeKick(game) {
  const t = (game?.time ?? 0) - (game?.meleeAt ?? -99);
  if (t < 0 || t > STRIKE_TIME) return 0;
  return Math.sin(Math.PI * t / STRIKE_TIME);
}
export const MELEE_POSE = Object.freeze({ x: -.07, y: .03, z: -.2, pitch: -.45 });

export function createArmorFeedback({ T, scene, audio = () => null, haptic = () => {}, listener = () => null, accent = 0xffffff } = {}) {
  const colour = new T.Color(accent);
  // Thrown charges: a dark disc with a bright rim and a core that blinks faster as the fuse runs out.
  const discGeometry = new T.CylinderGeometry(.075, .075, .035, 16), rimGeometry = new T.TorusGeometry(.075, .012, 6, 20), coreGeometry = new T.SphereGeometry(.03, 8, 6);
  const discMaterial = new T.MeshStandardMaterial({ color: 0x1b222b, metalness: .7, roughness: .35 });
  const rimMaterial = new T.MeshBasicMaterial({ color: colour, toneMapped: false });
  const coreMaterial = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const flying = new Map();
  // Pulse: a shell that swells to the blast radius and a ring on the ground, both fading out.
  const shellGeometry = new T.SphereGeometry(1, 20, 12), ringGeometry = new T.RingGeometry(.86, 1, 48);
  const blasts = [];
  const ensureCharge = id => {
    let g = flying.get(id); if (g) return g;
    g = new T.Group(); g.name = 'Charge à impulsion';
    g.add(new T.Mesh(discGeometry, discMaterial));
    const rim = new T.Mesh(rimGeometry, rimMaterial); rim.rotation.x = Math.PI / 2; g.add(rim);
    const core = new T.Mesh(coreGeometry, coreMaterial); core.position.y = .03; g.add(core); g.userData.core = core;
    scene.add(g); flying.set(id, g); return g;
  };
  const blast = at => {
    const shell = new T.Mesh(shellGeometry, new T.MeshBasicMaterial({ color: colour, transparent: true, opacity: .38, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    shell.position.set(at.x, at.y, at.z); ring.position.set(at.x, at.y - .2, at.z); ring.rotation.x = -Math.PI / 2;
    shell.renderOrder = ring.renderOrder = 8; scene.add(shell, ring);
    blasts.push({ shell, ring, age: 0 });
    while (blasts.length > 4) dropBlast(blasts.shift());
  };
  const dropBlast = b => { scene.remove(b.shell, b.ring); b.shell.material.dispose(); b.ring.material.dispose(); };

  // Short synthesised cues, filtered and kept quiet under the weapons.
  const play = (kind, gain = 1) => {
    const ctx = audio(); if (!ctx || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime, out = ctx.createGain(); out.gain.value = .16 * gain; out.connect(ctx.destination);
      const tone = (type, from, to, length, level = 1, delay = 0) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
        o.frequency.setValueAtTime(from, now + delay); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + delay + length);
        g.gain.setValueAtTime(.0001, now + delay); g.gain.exponentialRampToValueAtTime(level, now + delay + .012); g.gain.exponentialRampToValueAtTime(.0001, now + delay + length);
        o.connect(g); g.connect(out); o.start(now + delay); o.stop(now + delay + length + .02);
      };
      const noise = (length, frequency, level = 1, type = 'lowpass') => {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
        source.buffer = buffer; filter.type = type; filter.frequency.value = frequency; g.gain.value = level;
        source.connect(filter); filter.connect(g); g.connect(out); source.start(now);
      };
      if (kind === 'shield-break') { tone('sawtooth', 900, 180, .28, .7); noise(.18, 2600, .6, 'highpass'); }
      else if (kind === 'shield-recharge') tone('sine', 280, 920, .6, .45);
      else if (kind === 'shield-full') { tone('sine', 1050, 1050, .07, .35); tone('sine', 1400, 1400, .07, .3, .08); }
      else if (kind === 'melee') { noise(.12, 900, .9); tone('triangle', 160, 70, .12, .5); }
      else if (kind === 'melee-hit') { noise(.14, 1400, 1); tone('sine', 120, 45, .2, .9); }
      else if (kind === 'charge-throw') { tone('square', 1300, 900, .04, .3); noise(.18, 1800, .35, 'bandpass'); }
      else if (kind === 'charge-blast') { tone('sine', 82, 32, .7, 1); noise(.8, 520, 1); tone('sawtooth', 2400, 300, .25, .25); }
      else if (kind === 'charge-gain') tone('sine', 880, 1180, .09, .35);
    } catch {}
  };
  const distanceGain = at => { const l = listener(); if (!l || !at) return 1; const d = Math.hypot(at.x - l.x, at.z - l.z); return 1 / (1 + d * .08); };

  return {
    // Engines pass every game event here; only the armour layer's events are used.
    handle(event) {
      switch (event?.type) {
        case 'shield-break': play('shield-break'); haptic('damage'); break;
        case 'shield-recharge': play('shield-recharge'); break;
        case 'shield-full': play('shield-full'); break;
        case 'melee': play(event.hit ? 'melee-hit' : 'melee'); haptic(event.hit ? 'parry' : 'weapon'); break;
        case 'charge-throw': play('charge-throw'); haptic('reload'); break;
        case 'charge-blast': play('charge-blast', distanceGain(event) * 1.6); blast(event); haptic('damage'); break;
        case 'charge-gain': play('charge-gain'); break;
      }
    },
    update(game, dt) {
      const live = new Set();
      for (const c of game?.thrownCharges || []) {
        live.add(c.id); const g = ensureCharge(c.id);
        g.position.set(c.x, c.y, c.z); g.rotation.y += dt * 9;
        const left = Math.max(0, c.fuseAt - game.time), rate = left < .5 ? 22 : left < 1 ? 11 : 5;
        g.userData.core.visible = Math.floor(game.time * rate) % 2 === 0;
      }
      for (const [id, g] of flying) if (!live.has(id)) { scene.remove(g); flying.delete(id); }
      for (let i = blasts.length - 1; i >= 0; i--) {
        const b = blasts[i]; b.age += dt; const t = b.age / .55;
        if (t >= 1) { dropBlast(b); blasts.splice(i, 1); continue; }
        const ease = 1 - Math.pow(1 - t, 3);
        b.shell.scale.setScalar(.3 + (CHARGE_RADIUS - .3) * ease); b.shell.material.opacity = .38 * (1 - t);
        b.ring.scale.setScalar(.4 + CHARGE_RADIUS * 1.1 * ease); b.ring.material.opacity = .8 * (1 - t);
      }
    },
    setAccent(hex) { colour.setHex(hex); rimMaterial.color.copy(colour); },
    dispose() {
      for (const g of flying.values()) scene.remove(g); flying.clear();
      for (const b of blasts) dropBlast(b); blasts.length = 0;
      for (const item of [discGeometry, rimGeometry, coreGeometry, discMaterial, rimMaterial, coreMaterial, shellGeometry, ringGeometry]) item.dispose();
    }
  };
}
export { MELEE_COOLDOWN };
