// Volumetric light under lamps (after the reference's fan shaft): an additive cone whose brightness follows the view
// angle, and dust motes drifting inside it. One instanced mesh for all cones, one Points cloud for all the dust.
// The cones use the standard material pipeline only (no custom shader), so WebGPU and WebGL render them alike.
export function createLightShafts(T, parent, lamps, { low = false, max = low ? 10 : 28, dustPer = low ? 0 : 26 } = {}) {
  const list = lamps.slice(0, max), group = new T.Group(); group.name = 'faisceaux de lumière et poussière'; parent.add(group);
  if (!list.length) return { group, update() {}, count: 0 };
  // Soft vertical gradient (bright near the lamp, gone at the floor) with faint streaks.
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128); grad.addColorStop(0, 'rgba(255,255,255,.9)'); grad.addColorStop(.25, 'rgba(255,255,255,.42)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 128);
  let seed = 99; const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  g.globalCompositeOperation = 'destination-out'; for (let x = 0; x < 64; x += 2) { g.fillStyle = `rgba(0,0,0,${(r() * .45).toFixed(2)})`; g.fillRect(x, 0, 2, 128); }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: low ? .05 : .065, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const geo = new T.CylinderGeometry(.18, 1, 1, low ? 12 : 24, 1, true); geo.translate(0, -.5, 0); // apex at the lamp, opening downward
  const cones = new T.InstancedMesh(geo, mat, list.length), m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), col = new T.Color();
  list.forEach((l, i) => { const h = l.height ?? l.y, rad = l.radius ?? Math.max(.9, h * .3); cones.setMatrixAt(i, m.compose(p.set(l.x, l.y, l.z), q, s.set(rad, h, rad))); cones.setColorAt(i, col.set(l.color ?? 0xffe2b8)); });
  cones.frustumCulled = false; cones.renderOrder = 6; cones.userData.webgpuShape = 'fx'; geo.userData.webgpuShape = 'fx'; group.add(cones);
  let dust = null, motes = [];
  if (dustPer) {
    const n = list.length * dustPer, pos = new Float32Array(n * 3);
    list.forEach((l, i) => { const h = l.height ?? l.y, rad = (l.radius ?? Math.max(.9, h * .3)) * .8; for (let k = 0; k < dustPer; k++) { const a = r() * 6.283, y = r(), rr = Math.sqrt(r()) * rad * (1 - y * .75); const j = (i * dustPer + k) * 3; pos[j] = l.x + Math.cos(a) * rr; pos[j + 1] = l.y - h + y * h; pos[j + 2] = l.z + Math.sin(a) * rr; motes.push({ l, h, rad, vy: -.02 - r() * .05, ph: r() * 9, a, rr }); } });
    const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 32; const dc = dot.getContext('2d'), rg = dc.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.4, 'rgba(255,255,255,.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); dc.fillStyle = rg; dc.fillRect(0, 0, 32, 32);
    dust = new T.Points(dg, new T.PointsMaterial({ map: new T.CanvasTexture(dot), size: .035, transparent: true, opacity: .55, color: 0xfff1dc, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    dust.frustumCulled = false; dust.userData.webgpuShape = 'fx'; group.add(dust);
  }
  let t = 0;
  return { group, count: list.length, motes: motes.length,
    update(dt) {
      t += dt; mat.opacity = (low ? .05 : .065) * (.92 + .08 * Math.sin(t * 1.3));
      if (!dust) return; const pos = dust.geometry.attributes.position.array;
      for (let i = 0; i < motes.length; i++) { const d = motes[i], j = i * 3; pos[j] += Math.sin(t * .4 + d.ph) * .03 * dt; pos[j + 2] += Math.cos(t * .33 + d.ph) * .03 * dt; pos[j + 1] += d.vy * dt; if (pos[j + 1] < d.l.y - d.h + .05) { pos[j + 1] = d.l.y - .2; pos[j] = d.l.x + Math.cos(d.a) * d.rr * .3; pos[j + 2] = d.l.z + Math.sin(d.a) * d.rr * .3; } }
      dust.geometry.attributes.position.needsUpdate = true;
    } };
}
