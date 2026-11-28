import {createHeroPartner, PARTNER_WEAPONS} from './hero-partner.js';
import {HERO_PARTNER_MOTION} from './hero-partner-motion-data.js';

export function createHeroPartnerActor(T, scene, {
  characterId, low = false, showcase, meeting, sphere = true,
} = {}) {
  const id = characterId === 'ghju' ? 'lylu' : 'ghju';
  const logic = createHeroPartner({id, meeting}), cfg = PARTNER_WEAPONS[id];
  const clip = HERO_PARTNER_MOTION.clips[0];
  const talkTracks = clip.tracks.map(t => ({
    bone: t.name.split('.')[0].replace('mixamorig', ''),
    sample: new T.QuaternionKeyframeTrack(t.name, t.times, t.values).createInterpolant(),
  }));
  const delta = new T.Quaternion(), sampled = new T.Quaternion(), muzzlePosition = new T.Vector3();
  let disposed = false, playing = false, rig = null, companion = null, body = null;
  let poseTime = 0, talkTime = 0, talkWeight = 0, lastBody;

  const ready = (async () => {
    let installed;
    try {
      const [{installPinkWarsSoldier}, {readNanoProfile}, {createCompanionModel}] = await Promise.all([
        import('./level2-player.js'), import('./nano-forge.js'), import('./companion-model.js'),
      ]);
      if (disposed) return;
      installed = await installPinkWarsSoldier(T, scene, id);
      const m = installed.model;
      await Promise.all([m.shadowUnit.gear.ready, m.shadowUnit.suit.ready]);
      if (disposed) { installed.dispose(); return; }
      m.root.name = 'Allié · ' + id.toUpperCase();
      m.setWeapon(cfg.index);
      m.setLevel(readNanoProfile(id).equippedSuit);
      rig = installed;
      if (!playing && showcase) {
        m.root.position.set(showcase.x, showcase.y, showcase.z);
        m.root.rotation.y = showcase.yaw || 0;
        m.root.visible = true;
      }
      if (sphere) {
        const root = new T.Group();
        root.name = id === 'ghju' ? 'Gaby / GHJU' : 'Cara / LYLU';
        scene.add(root);
        companion = {root, model: createCompanionModel(T, root, id === 'ghju')};
        root.visible = false;
      }
    } catch (error) {
      installed?.dispose();
      rig = null;
      console.warn('Pink Wars / modèle du partenaire', error);
    }
  })();

  function gesture(actor) {
    const time = talkTime % clip.duration;
    for (const track of talkTracks) {
      const bone = actor.bone(track.bone);
      if (!bone) continue;
      delta.identity().slerp(sampled.fromArray(track.sample.evaluate(time)), talkWeight);
      bone.quaternion.multiply(delta);
    }
  }

  function transform(state) {
    body = state;
    const root = rig?.model.root;
    if (!root) return;
    root.visible = !!state;
    if (!state) {
      if (companion) companion.root.visible = false;
      return;
    }
    root.position.set(state.x, state.elevation, state.z);
    root.rotation.y = state.yaw;
  }

  function sync(game, stage) {
    playing = true;
    transform(logic.sync(game, stage));
  }

  function step(game, stage, dt, speaker) {
    playing = true;
    if (!rig) return;
    const model = rig.model, gun = model.gun.userData;
    const state = logic.step(game, stage, dt, speaker, (p, elapsed) => {
      transform(p);
      if (lastBody !== p) {
        lastBody = p;
        poseTime = 0;
        talkTime = 0;
        talkWeight = 0;
      }
      poseTime += elapsed;
      if (low && poseTime < 1 / 31) return;
      const age = game.time - p.shotAt, firing = age < .092;
      const amount = p.dialogue === 'speaking' ? (p.aim ? .13 : .53) : p.dialogue === 'listening' ? .19 : 0;
      talkWeight += (amount - talkWeight) * (1 - Math.exp(-poseTime * 7));
      if (amount || talkWeight > .01) talkTime += poseTime;
      else talkTime = 0;
      const speed = Math.hypot(p.vx, p.vz);
      gun.setCombatState?.({ammo: p.ammo, capacity: cfg.magazine, time: game.time,
        reloading: p.reload > 0, reloadProgress: p.reload});
      model.animate(game.time, speed > .08, firing ? .075 * (1 - age / .10) : 0,
        p.reload ? Math.sin(p.reload * Math.PI) * .27 : 0, Number(firing), poseTime, {
          aim: p.aim, aimPitch: p.aimPitch, firing, crouched: p.crouched, sprint: speed > 3.7,
          velocity: {x: p.vx, z: p.vz},
          ground: (x, z, base) => {
            const y = game.groundHeight(x, z, p.elevation);
            return Math.abs(y - p.elevation) < .56 ? y : base;
          },
          upperBodyPose: talkWeight > .01 ? gesture : undefined,
        });
      poseTime = 0;
    }, () => {
      gun.flash.getWorldPosition(muzzlePosition);
      return {x: muzzlePosition.x, y: muzzlePosition.y, z: muzzlePosition.z};
    });
    if (!state) transform(null);
    gun.setFlash?.(!!state && game.time - state.shotAt < .055, game.time);
  }

  function update(time, dt, eye, {pulse = 0} = {}) {
    if (!rig) return;
    const model = rig.model;
    if (!playing && model.root.visible && dt > 0) model.animate(time, false, 0, 0, 0, dt, {preview: true});
    if (!companion) return;
    const root = companion.root, hero = model.root;
    root.visible = hero.visible;
    if (!root.visible) return;
    const c = Math.cos(hero.rotation.y), s = Math.sin(hero.rotation.y);
    const lateral = id === 'ghju' ? -.74 : .74;
    root.position.set(hero.position.x + c * lateral + s * .42,
      hero.position.y + (body?.crouched ? 1.35 : 1.92) + Math.sin(time * 2) * .055,
      hero.position.z - s * lateral + c * .42);
    root.rotation.y = hero.rotation.y;
    if (body?.dialogue && eye) root.lookAt(eye.position.x, root.position.y, eye.position.z);
    companion.model.update(dt, {pulse});
  }

  return {
    ready, sync, step, update,
    get hero() { return rig ? id : null; },
    get sphereName() { return companion ? id === 'ghju' ? 'Gaby' : 'Cara' : null; },
    get visible() { return !!rig?.model.root.visible; },
    stats: () => body ? {
      hero: id, mode: body.mode, motion: rig?.model.nativeMotion, dialogue: body.dialogue,
      x: body.x, z: body.z, elevation: body.elevation, shots: body.shots, target: body.target,
    } : null,
    dispose() {
      disposed = true;
      rig?.dispose();
      companion?.model.dispose();
      companion?.root.removeFromParent();
      rig = companion = null;
    },
  };
}
