// Material-aware impacts with a fixed GPU budget: four instanced draws, no lights,
// screen effects or per-impact meshes. Shared by the WebGPU and WebGL/Quest renderers.
export const IMPACT_PROFILES = Object.freeze({
  r9: Object.freeze({ sparks: 8, debris: 4, dust: 3, speed: 4.1, flash: .15 }),
  bloom: Object.freeze({ sparks: 6, debris: 3, dust: 2, speed: 5.2, flash: .12 }),
  lance: Object.freeze({ sparks: 12, debris: 4, dust: 3, speed: 7.0, flash: .21 }),
  thorn: Object.freeze({ sparks: 17, debris: 7, dust: 6, speed: 7.1, flash: .30 }),
  nova: Object.freeze({ sparks: 24, debris: 12, dust: 11, speed: 8.4, flash: .48 })
});

export function createCombatFX(T, scene, palette = {}) {
  const group = new T.Group(); group.name = 'Material impact effects'; scene.add(group);
  const accent = new T.Color(palette.rose ?? 0xff4099), hostile = new T.Color(palette.violet ?? 0x9b75ff);
  const gold = new T.Color(0xffb866), white = new T.Color(0xfff3cf);
  const stone = new T.Color(0x8d8675), earth = new T.Color(0x797566), metal = new T.Color(0x626e75);
  const scorch = new T.Color(0x221b18);
  const matrix = new T.Matrix4(), position = new T.Vector3(), scale = new T.Vector3();
  const rotation = new T.Quaternion(), cameraRotation = new T.Quaternion(), color = new T.Color();
  const normal = new T.Vector3(), velocity = new T.Vector3(), up = new T.Vector3(0, 1, 0), forward = new T.Vector3(0, 0, 1);
  let disposed = false;

  // A small deterministic, feathered dust mask avoids runtime asset downloads and
  // works in the standalone launcher. DataTexture also keeps this module DOM-free.
  const size = 32, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5) / size * 2 - 1, dy = (y + .5) / size * 2 - 1;
    const radius = Math.hypot(dx, dy), noise = .81 + .19 * Math.sin(x * 1.7 + Math.cos(y * 2.1));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - radius), 1.8) * noise);
  }
  const dustTexture = new T.DataTexture(pixels, size, size, T.RGBAFormat);
  dustTexture.needsUpdate = true; dustTexture.magFilter = T.LinearFilter; dustTexture.minFilter = T.LinearFilter;

  const glowMaterial = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  const chipMaterial = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .89, metalness: .13 });
  const dustMaterial = new T.MeshBasicMaterial({ color: 0xffffff, map: dustTexture, transparent: true, opacity: .51, depthWrite: false, side: T.DoubleSide });
  const ringMaterial = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  function pool(name, capacity, geometry, material) {
    const mesh = new T.InstancedMesh(geometry, material, capacity);
    mesh.name = name; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (let i = 0; i < capacity; i++) mesh.setColorAt(i, white);
    mesh.instanceColor.setUsage(T.DynamicDrawUsage); group.add(mesh);
    return { mesh, cursor: 0, capacity, particles: Array.from({ length: capacity }, () => ({ active: false, tint: new T.Color(), q: new T.Quaternion() })) };
  }
  const sparks = pool('Hot metal and plasma', 128, new T.SphereGeometry(1, 6, 4), glowMaterial);
  const chips = pool('Concrete and armor fragments', 96, new T.TetrahedronGeometry(1), chipMaterial);
  const dust = pool('Dust and scorch marks', 72, new T.PlaneGeometry(1, 1), dustMaterial);
  const waves = pool('Capacitor shock rings', 12, new T.TorusGeometry(1, .017, 4, 32), ringMaterial);
  const pools = [sparks, chips, dust, waves];

  function emit(target, type, event, tint, lifetime, radius, speed, gravity = 0) {
    const p = target.particles[target.cursor]; target.cursor = (target.cursor + 1) % target.capacity;
    const spread = type === 'dust' ? .8 : 1.6;
    velocity.set((Math.random() - .5) * spread, (Math.random() - .5) * spread, (Math.random() - .5) * spread);
    // Always eject towards the visible side of the struck surface.
    velocity.addScaledVector(normal, Math.max(.2, .45 - velocity.dot(normal))).normalize().multiplyScalar(speed);
    Object.assign(p, { active: true, type, life: lifetime, max: lifetime, radius, gravity,
      x: event.x + normal.x * .026, y: event.y + normal.y * .026, z: event.z + normal.z * .026,
      vx: velocity.x, vy: velocity.y, vz: velocity.z,
      floor: normal.y > .8 ? event.y : .025, angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * 7, bounce: false });
    p.tint.copy(tint); p.q.setFromUnitVectors(forward, normal);
    return p;
  }

  function impact(event = {}) {
    if (disposed || ![event.x, event.y, event.z].every(Number.isFinite)) return false;
    const weapon = typeof event.weapon === 'string' ? event.weapon : event.weapon?.id;
    const profile = IMPACT_PROFILES[weapon] || IMPACT_PROFILES.r9;
    const strength = Math.max(.3, Math.min(1.35, Number(event.power) || 1));
    const splash = Math.max(0, Math.min(6, Number(event.splash) || 0));
    const surface = event.surface || (event.enemy ? 'robot' : event.y < .2 ? 'ground' : 'concrete');
    const isMetal = surface === 'robot' || surface === 'metal', isGround = surface === 'ground';
    const n = event.normal;
    if (n && Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z)) normal.set(n.x, n.y, n.z);
    else if (isGround) normal.copy(up);
    else if (event.direction && [event.direction.x, event.direction.y, event.direction.z].every(Number.isFinite)) normal.set(-event.direction.x, -event.direction.y, -event.direction.z);
    else normal.copy(up);
    if (normal.lengthSq() < .001) normal.copy(up); else normal.normalize();
    const plasma = event.hostile ? hostile : accent;
    const hot = isMetal ? gold : plasma;
    const flash = emit(sparks, 'flash', event, white, .085 + splash * .013, profile.flash * strength, 0);
    flash.vx = flash.vy = flash.vz = 0;
    const sparkCount = Math.round(profile.sparks * (isMetal ? 1.35 : .65));
    for (let i = 0; i < sparkCount; i++) {
      emit(sparks, 'spark', event, i % 3 === 0 ? plasma : hot, .14 + Math.random() * .38,
        .008 + Math.random() * .012, profile.speed * (.25 + Math.random() * .75) * strength, 6);
    }
    const chipColor = isMetal ? metal : isGround ? earth : stone;
    for (let i = 0; i < profile.debris; i++) {
      emit(chips, 'chip', event, chipColor, .5 + Math.random() * .65, (.016 + Math.random() * .034) * strength,
        (1.1 + Math.random() * profile.speed * .42) * strength, 9.8);
    }
    for (let i = 0; i < Math.max(1, Math.round(profile.dust * (isMetal ? .35 : 1))); i++) {
      const p = emit(dust, 'dust', event, isGround ? earth : stone, .65 + Math.random() * .7,
        (.32 + Math.random() * .42) * (1 + splash * .10), .24 + Math.random() * .48, -.09);
      p.vy += .08;
    }
    // Persistent feathered burn marks are only attached to static surfaces. A mark
    // on a moving robot would otherwise remain floating after it moved away.
    if (surface !== 'robot' && !event.enemy && !event.hostile) {
      const p = emit(dust, 'scorch', event, scorch, 7 + Math.random() * 3, .12 + profile.flash * .55, 0);
      p.vx = p.vy = p.vz = 0;
    }
    if (splash > .1) {
      const p = emit(waves, 'wave', event, plasma, .32 + splash * .045, splash, 0);
      p.vx = p.vy = p.vz = 0;
      // Radius matches the damage volume, but the ring remains on the contact plane.
      if (splash > 3) {
        const inner = emit(waves, 'wave', event, white, .27, splash * .65, 0);
        inner.vx = inner.vy = inner.vz = 0;
      }
    }
    return true;
  }

  function update(dt = 0, camera = null) {
    if (disposed) return;
    const step = Math.max(0, Math.min(.1, Number(dt) || 0));
    if (camera?.getWorldQuaternion) camera.getWorldQuaternion(cameraRotation);
    for (const target of pools) {
      let count = 0;
      for (const p of target.particles) {
        if (!p.active) continue;
        p.life -= step;
        if (p.life <= 0) { p.active = false; continue; }
        const progress = 1 - p.life / p.max, fade = Math.min(1, p.life / Math.min(.22, p.max));
        p.x += p.vx * step; p.y += p.vy * step; p.z += p.vz * step; p.vy -= p.gravity * step;
        if ((p.type === 'chip' || p.type === 'spark') && p.y < p.floor) {
          p.y = p.floor;
          if (!p.bounce) { p.vy = Math.abs(p.vy) * .24; p.vx *= .55; p.vz *= .55; p.bounce = true; }
          else { p.vx *= Math.exp(-10 * step); p.vz *= Math.exp(-10 * step); p.vy = 0; }
        }
        position.set(p.x, p.y, p.z); color.copy(p.tint); rotation.copy(p.q);
        if (p.type === 'spark') {
          velocity.set(p.vx, p.vy, p.vz); const speed = velocity.length();
          rotation.setFromUnitVectors(up, speed > .001 ? velocity.multiplyScalar(1 / speed) : up);
          scale.set(p.radius * fade, Math.max(p.radius * 1.8, speed * .012) * fade, p.radius * fade);
          color.multiplyScalar(fade * (1.15 + (1 - progress) * .65));
        } else if (p.type === 'flash') {
          scale.setScalar(p.radius * Math.sin(Math.PI * Math.min(1, progress * .7 + .3)) * fade);
          color.multiplyScalar(fade * 1.8);
        } else if (p.type === 'chip') {
          rotation.setFromAxisAngle(up, p.angle + progress * p.spin);
          scale.set(p.radius * fade, p.radius * .48 * fade, p.radius * .8 * fade);
        } else if (p.type === 'dust') {
          if (camera) rotation.copy(cameraRotation);
          scale.setScalar(p.radius * (.5 + progress * 1.8) * Math.sqrt(fade));
        } else if (p.type === 'scorch') {
          scale.setScalar(p.radius * Math.min(1, p.life / 2));
        } else {
          scale.setScalar(p.radius * Math.sqrt(progress)); color.multiplyScalar(fade * (1 - progress));
        }
        matrix.compose(position, rotation, scale); target.mesh.setMatrixAt(count, matrix); target.mesh.setColorAt(count, color); count++;
      }
      target.mesh.count = count; target.mesh.visible = count > 0;
      if (count) { target.mesh.instanceMatrix.needsUpdate = true; target.mesh.instanceColor.needsUpdate = true; }
    }
  }

  function reset() {
    for (const target of pools) {
      for (const p of target.particles) p.active = false;
      target.cursor = 0; target.mesh.count = 0; target.mesh.visible = false;
    }
  }
  function dispose() {
    if (disposed) return;
    reset(); disposed = true; scene.remove(group);
    for (const target of pools) { target.mesh.geometry.dispose(); target.mesh.material.dispose(); target.mesh.dispose(); }
    dustTexture.dispose();
  }
  return {
    impact, update, reset, dispose,
    setAccent(value) { accent.set(value); },
    setVisible(value) { group.visible = !!value; },
    stats() { return { active: pools.reduce((n, p) => n + p.particles.filter(v => v.active).length, 0), capacity: pools.reduce((n, p) => n + p.capacity, 0), draws: pools.filter(p => p.mesh.visible).length }; }
  };
}
