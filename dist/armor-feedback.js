import {createContactShadows,contactShadowPose} from './contact-shadows.js';
import {createCheckpointBeacon} from './checkpoint-beacon.js';
import {createProjectedShieldFX} from './projected-shield-fx.js';
// Feedback of the armour layer (armor-combat.js) shared by M01, M02, the Arena and the Range: synthesised sounds,
// controller rumble, impulse charges in flight and their pulse, and the strike motion of the held weapon.
// No dynamic light is added (a new light recompiles every material on Quest): additive meshes only.
import { CHARGE_RADIUS, MELEE_COOLDOWN, MELEE_IMPACT_DELAY } from './armor-combat.js';
import {createHitFeedback} from './hit-feedback.js';
import {createGrenadeExplosionV4} from './grenade-explosion-v4.js';

// Butt-stroke (« coup de crosse »). The weapon is drawn back and up (muzzle rising), driven forward across the screen
// in an arc so that the stock lands at MELEE_IMPACT_DELAY, bounces off the target and settles back. Keys are offsets
// from the engine's own hip pose (x right, y up, z towards the eye, radians for the angles).
export const STRIKE_TIME = .6;
const KEYS = [
  { t: 0,   x: 0,    y: 0,    z: 0,    pitch: 0,    yaw: 0,    roll: 0 },
  { t: .06, x: .05,  y: .03,  z: .08,  pitch: .24,  yaw: -.20, roll: -.14 },
  { t: .12, x: .14,  y: .08,  z: .19,  pitch: .52,  yaw: -.46, roll: -.32 },   // loaded: stock back, muzzle high
  { t: .19, x: -.16, y: -.02, z: -.29, pitch: -.20, yaw: .62,  roll: .40, drive: true },    // contact (MELEE_IMPACT_DELAY)
  { t: .25, x: -.11, y: -.01, z: -.22, pitch: -.12, yaw: .48,  roll: .31 },    // rebound
  { t: .40, x: -.04, y: .02,  z: -.07, pitch: -.04, yaw: .15,  roll: .09 },
  { t: STRIKE_TIME, x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 }
];
const smooth = u => u * u * (3 - 2 * u);
export function meleePoseAt(t) {
  if (t <= 0 || t >= STRIKE_TIME) return null;
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = (t - a.t) / (b.t - a.t);
  // The drive into contact accelerates (ease-in); everything else eases in and out.
  const k = b.drive ? u * u * (3 - 2 * u) * .35 + u * u * u * .65 : smooth(u), out = {};
  for (const key of ['x', 'y', 'z', 'pitch', 'yaw', 'roll']) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
// Throwing a grenade: the rifle drops away to the left while the right hand pulls the pin and throws, then comes back.
export const THROW_TIME = .6;
const THROW_KEYS = [
  { t: 0,   x: 0,    y: 0,    z: 0,    pitch: 0,    yaw: 0,   roll: 0 },
  { t: .10, x: -.05, y: -.08, z: .06,  pitch: -.14, yaw: .10, roll: .12 },
  { t: .22, x: -.09, y: -.14, z: .10,  pitch: -.30, yaw: .16, roll: .22 },    // arm back, rifle held low
  { t: .30, x: -.07, y: -.11, z: -.04, pitch: -.22, yaw: .12, roll: .16 },    // release
  { t: .46, x: -.02, y: -.03, z: .0,   pitch: -.06, yaw: .03, roll: .04 },
  { t: THROW_TIME, x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 }
];
export function throwPoseAt(t) {
  if (t <= 0 || t >= THROW_TIME) return null;
  let i = 0; while (i < THROW_KEYS.length - 2 && t > THROW_KEYS[i + 1].t) i++;
  const a = THROW_KEYS[i], b = THROW_KEYS[i + 1], k = smooth((t - a.t) / (b.t - a.t)), out = {};
  for (const key of ['x', 'y', 'z', 'pitch', 'yaw', 'roll']) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
// Envelope for engines that only need "is a gesture under way, and how strongly" (0 → 1 → 0).
export function meleeKick(game) {
  const now = game?.time ?? 0, t = now - (game?.meleeAt ?? -99), u = now - (game?.chargeAt ?? -99);
  const strike = t >= 0 && t <= STRIKE_TIME ? Math.sin(Math.PI * t / STRIKE_TIME) : 0;
  const lob = u >= 0 && u <= THROW_TIME ? Math.sin(Math.PI * u / THROW_TIME) : 0;
  return Math.max(strike, lob);
}
// Kept as the shared pose object the engines import; `apply` adds the animated stroke to their FPS weapon pose.
export const MELEE_POSE = Object.freeze({ x: -.07, y: .03, z: -.2, pitch: -.45,
  apply(weapon, game) {
    const now = game?.time ?? 0;
    const pose = meleePoseAt(now - (game?.meleeAt ?? -99)) || throwPoseAt(now - (game?.chargeAt ?? -99)); if (!pose) return false;
    weapon.position.x += pose.x; weapon.position.y += pose.y; weapon.position.z += pose.z;
    weapon.rotation.x += pose.pitch; weapon.rotation.y += pose.yaw; weapon.rotation.z += pose.roll; return true;
  } });

export function createArmorFeedback({ T, scene, camera=null, renderer=null,getGame=()=>null,getModel=()=>null,getWeapon=()=>null,getLeftController=()=>null,canControl=()=>true,low=false, audio = () => null, haptic = () => {}, listener = () => null, accent = 0xffffff } = {}) {
  let projected=null,checkpoint=null,contacts=null,contactChecked=false;
  const projectedFor=game=>{if(game?.projectedShieldsEnabled&&!projected)projected=createProjectedShieldFX(T,{scene,camera,renderer,getGame:()=>getGame()||game,getModel,getWeapon,getLeftController,canControl,low});return projected;};
  const hitFeedback=camera?createHitFeedback(T,camera):null;
  const colour = new T.Color(accent),spinAxis=new T.Vector3(),spinStep=new T.Quaternion();
  // Impulse grenade, modelled like a hand grenade: an ovoid forged body cut into raised fragmentation lugs, a fuse
  // head with its flange, a curved safety lever hugging the body, the pin and its pull ring, and an emissive band and
  // lens that blink faster as the fuse runs down. ≈ 6 cm across for 12 cm in height; the glowing parts keep it
  // readable at a distance. Shared geometry across every projectile, three batches of materials.
  const bodyProfile=[[0,-.064],[.026,-.062],[.041,-.051],[.049,-.030],[.052,-.006],[.051,.018],[.045,.040],[.034,.056],[.023,.064],[.021,.068]].map(([r,y])=>new T.Vector2(r,y));
  const bodyGeometry=new T.LatheGeometry(bodyProfile,24);
  const lugGeometry=new T.BoxGeometry(.020,.019,.0075).translate(0,0,.0035);
  const headGeometry=new T.CylinderGeometry(.0205,.0235,.034,16),flangeGeometry=new T.CylinderGeometry(.0295,.0295,.006,20);
  const collarGeometry=new T.TorusGeometry(.0225,.0042,6,20).rotateX(Math.PI/2);
  const leverGeometry=new T.CylinderGeometry(.0575,.0575,.098,14,1,true,-.52,1.04).translate(0,-.002,0);
  const leverTipGeometry=new T.BoxGeometry(.026,.012,.006);
  const pinGeometry=new T.CylinderGeometry(.0028,.0028,.052,8).rotateZ(Math.PI/2);
  const ringGeometry=new T.TorusGeometry(.0165,.0023,6,20);
  const bandGeometry=new T.TorusGeometry(.0535,.0028,6,36).rotateX(Math.PI/2);
  const lensGeometry=new T.SphereGeometry(.0115,12,8);
  const bodyMaterial=new T.MeshStandardMaterial({color:0x56606a,metalness:.42,roughness:.5});
  const lugMaterial=new T.MeshStandardMaterial({color:0x707a86,metalness:.5,roughness:.42});
  const steelMaterial=new T.MeshStandardMaterial({color:0xaeb6c0,metalness:.55,roughness:.34,side:T.DoubleSide});
  const darkMaterial=new T.MeshStandardMaterial({color:0x2a2f36,metalness:.35,roughness:.6});
  const rimMaterial=new T.MeshBasicMaterial({color:colour,toneMapped:false});
  const coreMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const flying=new Map();
  // Volumetric adaptation of the approved IX-09 WebGPU V4: fire, smoke, dust, flying fragments. No decorative rings.
  const explosion=createGrenadeExplosionV4(T,scene,{camera,maxBlasts:4});
  const ensureCharge = id => {
    let g = flying.get(id); if (g) return g;
    g=new T.Group();g.name='Grenade à impulsion · blindage et émetteur';
    g.add(new T.Mesh(bodyGeometry,bodyMaterial));
    // Two staggered rows of raised fragmentation lugs: the classic cast pattern.
    const lugs=new T.InstancedMesh(lugGeometry,lugMaterial,32),dummy=new T.Object3D();
    for(let row=0;row<2;row++)for(let i=0;i<16;i++){
      const a=(i+row*.5)/16*Math.PI*2,y=row?.0305:-.0235,r=row?.0445:.0495;
      dummy.position.set(Math.sin(a)*r,y,Math.cos(a)*r);dummy.rotation.set(row?-.30:.18,a,0);dummy.updateMatrix();lugs.setMatrixAt(row*16+i,dummy.matrix);
    }
    g.add(lugs);
    const head=new T.Mesh(headGeometry,darkMaterial);head.position.y=.083;g.add(head);
    const flange=new T.Mesh(flangeGeometry,steelMaterial);flange.position.y=.0655;g.add(flange);
    const collar=new T.Mesh(collarGeometry,steelMaterial);collar.position.y=.1;g.add(collar);
    const lever=new T.Mesh(leverGeometry,steelMaterial);lever.position.set(0,.0185,0);lever.rotation.y=Math.PI/2;g.add(lever);
    const tip=new T.Mesh(leverTipGeometry,steelMaterial);tip.position.set(.0585,-.0385,0);tip.rotation.z=.12;g.add(tip);
    const pin=new T.Mesh(pinGeometry,steelMaterial);pin.position.set(-.004,.086,.0);g.add(pin);
    const ring=new T.Mesh(ringGeometry,steelMaterial);ring.position.set(-.0305,.086,0);ring.rotation.y=Math.PI/2;g.add(ring);
    const band=new T.Mesh(bandGeometry,rimMaterial);band.position.y=.003;g.add(band);
    const core=new T.Mesh(lensGeometry,coreMaterial);core.position.y=.108;core.scale.y=.7;g.add(core);g.userData.core=core;
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
      const noise = (length, frequency, level = 1, type = 'lowpass', delay = 0, sweepTo = null) => {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
        source.buffer = buffer; filter.type = type; filter.frequency.setValueAtTime(frequency, now + delay);
        if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + delay + length);
        g.gain.value = level; if (type === 'bandpass') filter.Q.value = 1.4;
        source.connect(filter); filter.connect(g); g.connect(out); source.start(now + delay);
      };
      if(kind==='shield-deploy'){noise(.5,260,.5,'bandpass',0,1600);tone('sine',95,180,.5,.3);}
      else if(kind==='shield-impact'){noise(.18,2100,.45,'bandpass',0,240);}
      else if (kind === 'shield-break') { noise(.75,2800,.8,'bandpass',0,180);tone('sine',135,35,.72,.55); }
      else if (kind === 'shield-recharge') tone('sine', 280, 920, .6, .45);
      else if (kind === 'shield-full') { tone('sine', 1050, 1050, .07, .35); tone('sine', 1400, 1400, .07, .3, .08); }
      // Butt-stroke, in the order the body makes noise: gear and cloth shift while the rifle is drawn back, the air is
      // cut by the swing (a band of noise rising in pitch), then the stock lands (or the swing dies away empty).
      else if (kind === 'melee-start') {
        noise(.15, 1100, .42, 'bandpass', 0, 2100); tone('square', 2300, 1500, .018, .12, .02); tone('triangle', 190, 120, .1, .22, .03);
        noise(.2, 500, .8, 'bandpass', .09, 2800); tone('sine', 150, 82, .16, .30, .1);
      }
      else if (kind === 'melee') { noise(.18, 700, .35, 'bandpass', 0, 260); tone('triangle', 120, 70, .14, .22); noise(.3, 1900, .12, 'bandpass', .08, 700); }
      else if (kind === 'melee-hit') {
        tone('sine', 118, 36, .26, 1); noise(.12, 1500, .9); noise(.05, 3600, .55, 'highpass');
        tone('triangle', 1250, 1180, .38, .24); tone('triangle', 1870, 1740, .3, .15, .004); tone('sine', 62, 38, .34, .45, .02);
      }
      // Pin pulled (a bright tick), the spoon flies off (a ringing ping), then the arm whips the grenade away.
      else if (kind === 'charge-throw') {
        tone('square', 2600, 2000, .022, .22); tone('triangle', 3300, 2700, .16, .2, .045); noise(.05, 4200, .18, 'highpass', .04);
        noise(.28, 600, .55, 'bandpass', .12, 2400); tone('sine', 130, 70, .18, .25, .12);
      }
      else if (kind === 'charge-bounce') { tone('triangle', 780, 640, .13, .45); tone('sine', 96, 52, .12, .5); noise(.06, 2600, .3, 'highpass'); }
      else if (kind === 'charge-blast') { tone('sine', 82, 32, .7, 1); noise(.8, 520, 1); tone('sawtooth', 2400, 300, .25, .25); }
      else if (kind === 'charge-gain') tone('sine', 880, 1180, .09, .35);
    } catch {}
  };
  const distanceGain = at => { const l = listener(); if (!l || !at) return 1; const d = Math.hypot(at.x - l.x, at.z - l.z); return 1 / (1 + d * .08); };

  return {
    // Engines pass every event here; confirmed hits and armour events are used.
    handle(event) {
      projectedFor(getGame())?.handle(event,getGame());
      switch (event?.type) {
        case 'hit': hitFeedback?.hit(event); break;
        case 'weapon': case 'over': case 'win': hitFeedback?.reset(); break;
        case 'projected-shield-toggle': if(event.active)play('shield-deploy'); break;
        case 'projected-shield-hit': play('shield-impact',event.id==='player'?1:distanceGain(event));break;
        case 'projected-shield-break': if(event.id!=='player')play('shield-break',distanceGain(event));break;
        case 'shield-break': play('shield-break'); haptic('damage'); break;
        case 'shield-recharge': play('shield-recharge'); break;
        case 'shield-full': play('shield-full'); break;
        case 'melee-start': play('melee-start'); haptic('weapon'); break;
        case 'melee': play(event.hit ? 'melee-hit' : 'melee'); haptic(event.hit ? 'parry' : 'weapon'); break;
        case 'charge-throw': play('charge-throw'); haptic('reload'); break;
        case 'charge-bounce': play('charge-bounce', Math.min(1, event.speed / 7) * distanceGain(event)); break;
        case 'charge-blast': play('charge-blast', distanceGain(event) * 1.6); blast(event); haptic('damage'); break;
        case 'charge-gain': play('charge-gain'); break;
      }
    },
    update(game, dt) {
      projectedFor(game)?.update(game,dt);
      const held=getWeapon?.();held?.userData.setMovementState?.({time:game.time,dt,velocity:game.playerVelocity,yaw:game.player?.yaw||0,pitch:camera?.rotation.x||0,grounded:game.player?.grounded,verticalSpeed:game.player?.verticalSpeed||0,crouched:game.player?.crouched,aiming:Number(held.userData.aiming||game.aimingPrecision||game.precisionAiming),sprinting:!!game.movement?.sprint,tracked:!!renderer?.xr?.isPresenting});
      if(game?.checkpointPosition&&!checkpoint)checkpoint=createCheckpointBeacon(T,{scene,renderer});
      checkpoint?.update(game,dt);
      if(!contactChecked&&(game.enemies?.length||0)>0){contactChecked=true;if(!scene.getObjectByName('Ombres de contact mobiles')&&!scene.getObjectByName('Ombres de contact douces'))contacts=createContactShadows(T,scene,48);}
      if(contacts){const bodies=(game.enemies||[]).filter(e=>e.form!=='probe').map(e=>{const p=contactShadowPose(e,(x,z,t,max)=>game.surfaceHeight(x,z,t,max),game.time),s=(e.elite?1.3:1)*(e.form==='brute'||e.form==='bulwark'?1.5:1);return{...p,y:p.y+.012,w:1.15*s*p.scale,d:.85*s*p.scale,yaw:e.yaw};});contacts.update(bodies);}
      hitFeedback?.update(dt);
      const live = new Set();
      for (const c of game?.thrownCharges || []) {
        live.add(c.id); const g = ensureCharge(c.id);
        g.position.set(c.x,c.y,c.z);
        // Orientation: integrate the grenade's own angular velocity (it tumbles in flight, rolls on the ground, rests still).
        const w = c.spin || { x: 0, y: 8, z: 3 }, speed = Math.hypot(w.x, w.y, w.z);
        if (speed > 1e-4 && dt > 0) { spinAxis.set(w.x / speed, w.y / speed, w.z / speed); spinStep.setFromAxisAngle(spinAxis, speed * dt); g.quaternion.premultiply(spinStep); }
        const left = Math.max(0, c.fuseAt - game.time), rate = left < .5 ? 22 : left < 1.1 ? 11 : 5;
        g.userData.core.visible = Math.floor(game.time * rate) % 2 === 0;
      }
      for (const [id, g] of flying) if (!live.has(id)) { scene.remove(g); flying.delete(id); }
      explosion.update(dt);
    },
    shieldStats(){return projected?.stats()||null;},
    setAccent(hex) { colour.setHex(hex); rimMaterial.color.copy(colour); },
    dispose() {
      projected?.dispose();
      checkpoint?.dispose();contacts?.dispose();
      hitFeedback?.dispose();
      for (const g of flying.values()) scene.remove(g); flying.clear();
      explosion.dispose();
      for(const item of [bodyGeometry,lugGeometry,headGeometry,flangeGeometry,collarGeometry,leverGeometry,leverTipGeometry,pinGeometry,ringGeometry,bandGeometry,lensGeometry,bodyMaterial,lugMaterial,steelMaterial,darkMaterial,rimMaterial,coreMaterial])item.dispose();
    }
  };
}
export { MELEE_COOLDOWN, MELEE_IMPACT_DELAY };
