// Feedback of the armour layer (armor-combat.js) shared by M01, M02, the Arena and the Range: synthesised sounds,
// controller rumble, impulse charges in flight and their pulse, and the strike motion of the held weapon.
// No dynamic light is added (a new light recompiles every material on Quest): additive meshes only.
import { CHARGE_RADIUS, MELEE_COOLDOWN } from './armor-combat.js';
import {createHitFeedback} from './hit-feedback.js';
import {createGrenadeExplosionV4} from './grenade-explosion-v4.js';

const STRIKE_TIME = .26;
// 0 → 1 → 0 over the strike: the weapon jabs forward and comes back. Engines add it to their FPS weapon pose.
export function meleeKick(game) {
  const t = (game?.time ?? 0) - (game?.meleeAt ?? -99);
  if (t < 0 || t > STRIKE_TIME) return 0;
  return Math.sin(Math.PI * t / STRIKE_TIME);
}
export const MELEE_POSE = Object.freeze({ x: -.07, y: .03, z: -.2, pitch: -.45 });

export function createArmorFeedback({ T, scene, camera=null, audio = () => null, haptic = () => {}, listener = () => null, accent = 0xffffff } = {}) {
  const hitFeedback=camera?createHitFeedback(T,camera):null;
  const colour = new T.Color(accent);
  // Large, physical sci-fi impulse grenade, with faceted armour, two illuminated
  // safety rings and a timed emitter. Shared low-poly geometry across projectiles.
  const bodyGeometry=new T.CylinderGeometry(.140,.133,.35,16),capGeometry=new T.SphereGeometry(.140,16,10);
  const rimGeometry=new T.TorusGeometry(.145,.011,6,32),coreGeometry=new T.SphereGeometry(.032,12,9);
  const pinGeometry=new T.CylinderGeometry(.019,.019,.12,10);
  const discMaterial=new T.MeshStandardMaterial({color:0x202a36,metalness:.85,roughness:.32});
  const capMaterial=new T.MeshStandardMaterial({color:0x576a7a,metalness:.72,roughness:.42});
  const rimMaterial=new T.MeshBasicMaterial({color:colour,toneMapped:false});
  const coreMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const plateGeometry=new T.BoxGeometry(.073,.252,.019),gripGeometry=new T.BoxGeometry(.015,.25,.018);
  const plateMaterial=new T.MeshStandardMaterial({color:0x48525e,roughness:.43,metalness:.78});
  const flying=new Map();
  // Volumetric adaptation of the approved IX-09 WebGPU V4: fire, smoke, dust, flying fragments. No decorative rings.
  const explosion=createGrenadeExplosionV4(T,scene,{camera,maxBlasts:4});
  const ensureCharge = id => {
    let g = flying.get(id); if (g) return g;
    g=new T.Group();g.name='Grenade à impulsion · blindage et émetteur';
    g.add(new T.Mesh(bodyGeometry,discMaterial));
    for(const side of [-1,1]){
      const cap=new T.Mesh(capGeometry,capMaterial);cap.position.y=.178*side;cap.scale.y=.43;g.add(cap);
      const rim=new T.Mesh(rimGeometry,rimMaterial);rim.rotation.x=Math.PI/2;rim.position.y=.137*side;g.add(rim);
    }
    const pin=new T.Mesh(pinGeometry,capMaterial);pin.position.set(.125,.248,.015);pin.rotation.z=.5;g.add(pin);
    const core=new T.Mesh(coreGeometry,coreMaterial);core.position.y=.246;g.add(core);g.userData.core=core;
    // IX-09 V4: 12 segmented titanium plates and eight raised traction rails.
    const sidePlates=new T.InstancedMesh(plateGeometry,plateMaterial,12),railM=new T.InstancedMesh(gripGeometry,capMaterial,8);
    const dummy=new T.Object3D();
    for(let i=0;i<12;i++){const a=(i+.5)*Math.PI/6;dummy.position.set(Math.sin(a)*.145,0,Math.cos(a)*.145);dummy.rotation.set(0,a,0);dummy.updateMatrix();sidePlates.setMatrixAt(i,dummy.matrix);}
    for(let i=0;i<8;i++){const a=i*Math.PI/4;dummy.position.set(Math.sin(a)*.155,0,Math.cos(a)*.155);dummy.rotation.set(0,a,0);dummy.updateMatrix();railM.setMatrixAt(i,dummy.matrix);}
    g.add(sidePlates,railM);
    scene.add(g); flying.set(id, g); return g;
  };
  const blast=at=>explosion.spawn(at);

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
    // Engines pass every event here; confirmed hits and armour events are used.
    handle(event) {
      switch (event?.type) {
        case 'hit': hitFeedback?.hit(event); break;
        case 'weapon': case 'over': case 'win': hitFeedback?.reset(); break;
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
      hitFeedback?.update(dt);
      const live = new Set();
      for (const c of game?.thrownCharges || []) {
        live.add(c.id); const g = ensureCharge(c.id);
        g.position.set(c.x,c.y,c.z);g.rotation.y+=dt*8;g.rotation.z+=dt*3;
        const left = Math.max(0, c.fuseAt - game.time), rate = left < .5 ? 22 : left < 1 ? 11 : 5;
        g.userData.core.visible = Math.floor(game.time * rate) % 2 === 0;
      }
      for (const [id, g] of flying) if (!live.has(id)) { scene.remove(g); flying.delete(id); }
      explosion.update(dt);
    },
    setAccent(hex) { colour.setHex(hex); rimMaterial.color.copy(colour); },
    dispose() {
      hitFeedback?.dispose();
      for (const g of flying.values()) scene.remove(g); flying.clear();
      explosion.dispose();
      for(const item of [bodyGeometry,capGeometry,rimGeometry,coreGeometry,pinGeometry,plateGeometry,gripGeometry,discMaterial,capMaterial,rimMaterial,coreMaterial,plateMaterial])item.dispose();
    }
  };
}
export { MELEE_COOLDOWN };
