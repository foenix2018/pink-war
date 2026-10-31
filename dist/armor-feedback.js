// Feedback of the armour layer (armor-combat.js) shared by M01, M02, the Arena and the Range: synthesised sounds,
// controller rumble, impulse charges in flight and their pulse, and the strike motion of the held weapon.
// No dynamic light is added (a new light recompiles every material on Quest): additive meshes only.
import { CHARGE_RADIUS, MELEE_COOLDOWN } from './armor-combat.js';
import {createHitFeedback} from './hit-feedback.js';

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
  const bodyGeometry=new T.CylinderGeometry(.105,.10,.24,12),capGeometry=new T.SphereGeometry(.104,12,8);
  const rimGeometry=new T.TorusGeometry(.107,.014,5,20),coreGeometry=new T.SphereGeometry(.045,10,7);
  const pinGeometry=new T.CylinderGeometry(.019,.019,.09,6);
  const discMaterial=new T.MeshStandardMaterial({color:0x202a36,metalness:.85,roughness:.32});
  const capMaterial=new T.MeshStandardMaterial({color:0x576a7a,metalness:.72,roughness:.42});
  const rimMaterial=new T.MeshBasicMaterial({color:colour,toneMapped:false});
  const coreMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const flying=new Map();
  // Pulse: a shell that swells to the blast radius and a ring on the ground, both fading out.
  const shellGeometry=new T.SphereGeometry(1,20,12),ringGeometry=new T.RingGeometry(.86,1,40);
  const arcGeometry=new T.TorusGeometry(1,.015,4,36);
  const shardGeometry=new T.TetrahedronGeometry(.06);
  const shardMatrix=new T.Matrix4(),shardPosition=new T.Vector3(),shardRotation=new T.Quaternion(),shardScale=new T.Vector3();
  const blasts = [];
  const ensureCharge = id => {
    let g = flying.get(id); if (g) return g;
    g=new T.Group();g.name='Grenade à impulsion · blindage et émetteur';
    g.add(new T.Mesh(bodyGeometry,discMaterial));
    for(const side of [-1,1]){
      const cap=new T.Mesh(capGeometry,capMaterial);cap.position.y=.12*side;cap.scale.y=.48;g.add(cap);
      const rim=new T.Mesh(rimGeometry,rimMaterial);rim.rotation.x=Math.PI/2;rim.position.y=.085*side;g.add(rim);
    }
    const pin=new T.Mesh(pinGeometry,capMaterial);pin.position.set(.085,.17,0);pin.rotation.z=.5;g.add(pin);
    const core=new T.Mesh(coreGeometry,coreMaterial);core.position.y=.177;g.add(core);g.userData.core=core;
    scene.add(g); flying.set(id, g); return g;
  };
  const blast = at => {
    const shell = new T.Mesh(shellGeometry, new T.MeshBasicMaterial({ color: colour, transparent: true, opacity: .38, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    const arc=new T.Mesh(arcGeometry,new T.MeshBasicMaterial({color:colour,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    const shards=new T.InstancedMesh(shardGeometry,new T.MeshBasicMaterial({color:0xeef7ff,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),12);
    shards.instanceMatrix.setUsage(T.DynamicDrawUsage);shards.frustumCulled=false;
    shell.position.set(at.x,at.y,at.z);ring.position.set(at.x,at.y-.2,at.z);ring.rotation.x=-Math.PI/2;
    arc.position.set(at.x,at.y,at.z);arc.rotation.set(.25,.52,.35);shards.position.set(at.x,at.y,at.z);
    shell.renderOrder=ring.renderOrder=arc.renderOrder=shards.renderOrder=8;
    scene.add(shell,ring,arc,shards);blasts.push({shell,ring,arc,shards,age:0});
    while (blasts.length > 4) dropBlast(blasts.shift());
  };
  const dropBlast=b=>{scene.remove(b.shell,b.ring,b.arc,b.shards);for(const obj of [b.shell,b.ring,b.arc,b.shards])obj.material.dispose();};

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
      for (let i = blasts.length - 1; i >= 0; i--) {
        const b = blasts[i]; b.age += dt; const t = b.age / .55;
        if (t >= 1) { dropBlast(b); blasts.splice(i, 1); continue; }
        const ease = 1 - Math.pow(1 - t, 3);
        b.shell.scale.setScalar(.3+(CHARGE_RADIUS-.3)*ease);b.shell.material.opacity=.38*(1-t);
        b.ring.scale.setScalar(.4+CHARGE_RADIUS*1.1*ease);b.ring.material.opacity=.8*(1-t);
        b.arc.scale.setScalar(.5+CHARGE_RADIUS*.95*ease);b.arc.rotation.y+=dt*3;b.arc.material.opacity=.8*(1-t);
        for(let k=0;k<12;k++){
          const angle=k*Math.PI*2/12+.12*Math.sin(k*7.7),distance=CHARGE_RADIUS*(.15+.85*ease);
          shardPosition.set(Math.cos(angle)*distance,Math.sin(k*2.7)*distance*.32,Math.sin(angle)*distance);
          const size=Math.max(.0001,(1-t)*(.72+.16*Math.sin(k*3)));
          shardScale.set(size*.7,size*1.8,size*.7);
          shardMatrix.compose(shardPosition,shardRotation,shardScale);b.shards.setMatrixAt(k,shardMatrix);
        }
        b.shards.instanceMatrix.needsUpdate=true;b.shards.material.opacity=.9*(1-t);
      }
    },
    setAccent(hex) { colour.setHex(hex); rimMaterial.color.copy(colour); },
    dispose() {
      hitFeedback?.dispose();
      for (const g of flying.values()) scene.remove(g); flying.clear();
      for (const b of blasts) dropBlast(b); blasts.length = 0;
      for(const item of [bodyGeometry,capGeometry,rimGeometry,coreGeometry,pinGeometry,discMaterial,capMaterial,rimMaterial,coreMaterial,shellGeometry,ringGeometry,arcGeometry,shardGeometry])item.dispose();
    }
  };
}
export { MELEE_COOLDOWN };
