import * as T from './vendor/three.webgpu.min.js';

// Deliberately procedural: candidate real-world PBR images are being presented for approval
// separately. This 768px map avoids a network request, large VRAM allocation, or extra sky pass.
export const MOON_SETTINGS = Object.freeze({
  radius: 30, distance: 400, mapSize: 768,
  direction: Object.freeze({ x: -.32, y: .35, z: -.88 }),
  haloScale: 2.85
});

export function moonWorldPosition(cameraPosition, settings = MOON_SETTINGS) {
  const { x, y, z } = settings.direction;
  const inv = settings.distance / Math.hypot(x, y, z);
  return { x: cameraPosition.x + x * inv, y: cameraPosition.y + y * inv, z: cameraPosition.z + z * inv };
}

function drawMoon(canvas, size) {
  const ctx = canvas.getContext('2d'), mid = size / 2, radius = size * .468;
  let seed = 721674;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const pixels = ctx.createImageData(size, size), data = pixels.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5 - mid) / radius, dy = (y + .5 - mid) / radius;
    const r2 = dx * dx + dy * dy, i = (y * size + x) * 4;
    if (r2 > 1) continue;
    const elev = Math.sqrt(Math.max(0, 1 - r2));
    const angle = Math.sin(x * .037 + Math.sin(y * .029) * 2.4) * 12 +
      Math.cos(y * .054 + x * .019) * 9 +
      Math.sin((x + y) * .092) * 4;
    const illumination = Math.max(.16, .46 + .43 * (dx * -.27 + dy * -.38 + elev * .85));
    const speck = (random() - .5) * 23;
    const base = (163 + angle + speck) * illumination + 47;
    const edge = Math.min(1, Math.max(0, (1 - Math.sqrt(r2)) * radius * .57));
    const value = Math.min(255, base);
    data[i] = Math.min(255, value * 1.04);
    data[i + 1] = Math.min(255, value * 1.025);
    data[i + 2] = Math.min(255, value * .97);
    data[i + 3] = Math.round(255 * edge);
  }
  ctx.putImageData(pixels, 0, 0);
  ctx.save();
  ctx.beginPath(); ctx.arc(mid, mid, radius, 0, Math.PI * 2); ctx.clip();
  // Large dark mare basins and micro-craters, dark rims and highlights.
  for (let k = 0; k < 29; k++) {
    const a = random() * Math.PI * 2, dist = Math.sqrt(random()) * radius * .7;
    const px = mid + Math.cos(a) * dist, py = mid + Math.sin(a) * dist;
    const rx = (9 + random() * 85), ry = rx * (.55 + random() * .6);
    ctx.save(); ctx.translate(px, py); ctx.rotate(random() * Math.PI);
    ctx.scale(1, ry / rx);
    const maria = ctx.createRadialGradient(0, 0, rx * .05, 0, 0, rx);
    maria.addColorStop(0, 'rgba(48,55,61,.24)');
    maria.addColorStop(.65, 'rgba(67,70,75,.15)');
    maria.addColorStop(1, 'rgba(62,66,72,0)');
    ctx.fillStyle = maria; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  for (let k = 0; k < 360; k++) {
    const a = random() * Math.PI * 2, d = Math.sqrt(random()) * radius * .96;
    const x = mid + Math.cos(a) * d, y = mid + Math.sin(a) * d;
    const r = k < 40 ? 4 + random() * 20 : .7 + random() * 7;
    const rim = ctx.createRadialGradient(x - r * .14, y - r * .17, r * .08, x, y, r * 1.6);
    rim.addColorStop(0, 'rgba(63,70,73,.38)');
    rim.addColorStop(.5, 'rgba(63,71,76,.22)');
    rim.addColorStop(.74, 'rgba(237,237,230,.21)');
    rim.addColorStop(1, 'rgba(224,225,222,0)');
    ctx.fillStyle = rim;ctx.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
  }
  ctx.restore();
}

export function createMoon(scene, skyGlowTexture, canvasMaker = () => document.createElement('canvas')) {
  const canvas = canvasMaker();
  canvas.width = canvas.height = MOON_SETTINGS.mapSize;
  drawMoon(canvas, MOON_SETTINGS.mapSize);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;texture.anisotropy = 2;
  const material = new T.MeshBasicMaterial({
    map: texture, transparent: true, alphaTest: .012,
    depthWrite: false, depthTest: true, fog: false, toneMapped: false, side: T.DoubleSide
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(MOON_SETTINGS.radius * 2, MOON_SETTINGS.radius * 2), material);
  mesh.name = 'Pink War — pleine lune lumineuse';
  mesh.frustumCulled = false;
  const group = new T.Group();group.name = 'Lune et halo nocturne';scene.add(group);
  group.add(mesh);
  const outerMaterial = new T.SpriteMaterial({
    map: skyGlowTexture, color: 0xd4e8ff,
    transparent: true, opacity: .28, depthWrite: false, depthTest: true,
    blending: T.AdditiveBlending, fog: false, toneMapped: false
  });
  const halo = new T.Sprite(outerMaterial);
  const haloSize = MOON_SETTINGS.radius * 2 * MOON_SETTINGS.haloScale;
  halo.scale.set(haloSize, haloSize, 1);
  halo.position.z = -.9;
  group.add(halo);
  const scratch = new T.Vector3();
  function update(camera) {
    camera.getWorldPosition(scratch);
    const pos = moonWorldPosition(scratch);
    group.position.set(pos.x, pos.y, pos.z);
    mesh.lookAt(scratch);
    // Put halo slightly behind the disk so the luminous center is not washed out.
    halo.position.set(0, 0, -.9);
  }
  function dispose() {
    group.removeFromParent();
    texture.dispose(); material.dispose(); mesh.geometry.dispose(); outerMaterial.dispose();
  }
  return { group, mesh, halo, update, dispose, settings: MOON_SETTINGS };
}
