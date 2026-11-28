// Vesper's inhabited skyline below the elevated campuses. All dimensions are in metres.
const TAU = 2 * Math.PI;
const SECTORS = 12;
const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

const DISTRICTS = {
  gardens: { seed: 9173, radius: 222, floor: -230, fogBase: -121, clear: 9,
    mist: 0x78677f, horizon: 0x77566d, facades: [0x71829c, 0x747897, 0xb29198], roofs: [0x697183, 0x606e82, 0x756479] },
  helix: { seed: 10319, radius: 169, floor: -320, fogBase: -167, clear: -7,
    mist: 0x676582, horizon: 0x5d4a6a, facades: [0x718ba5, 0x7b779e, 0xa1828c], roofs: [0x617485, 0x6d6487, 0x786a7b] }
};

export function vesperTowerLayout(district, low = false) {
  const config = DISTRICTS[district];
  const random = seeded(config.seed), buildings = [];
  const rings = [
    { radius: config.radius + 33, spacing: 69, count: 4, mobile: 3, lowTop: -96, variation: 121 },
    { radius: config.radius + 180, spacing: 104, count: 8, mobile: 5, lowTop: -94, variation: 145 },
    { radius: config.radius + 376, spacing: 173, count: 10, mobile: 6, lowTop: -56, variation: 150 },
  ];
  rings.forEach((ring, band) => {
    for (let sector = 0; sector < SECTORS; sector++) {
      const angle = TAU * (sector + band * .38) / SECTORS;
      for (let i = 0; i < ring.count; i++) {
        const a = angle + ((i + .5) / ring.count - .5) * TAU / SECTORS;
        const r = ring.radius + (i % 2 ? 1 : -1) * ring.spacing * .26 + (random() - .5) * 24;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const style = (i + sector + band) % 3;
        const width = (band ? 19 : 16) + random() * (style === 2 ? 24 : 14);
        const depth = width * (.64 + random() * .38);
        const landmark = i === 0 && (sector + band) % 3 === 0;
        const top = ring.lowTop + random() * ring.variation + (landmark ? 40 : 0) - (district === 'helix' ? 12 : 0);
        const phase = random() * 12;
        if (!low || Math.floor(i * ring.mobile / ring.count) !== Math.floor((i - 1) * ring.mobile / ring.count)) {
          buildings.push({ x, z, width, depth, top, style, band, sector, yaw: angle + (i % 2 ? .08 : -.06), phase, height: config.floor });
        }
      }
    }
  });
  return buildings;
}

function atlas(T) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), random = seeded(3492);
  ctx.fillStyle = '#444c60'; ctx.fillRect(0, 0, 512, 512);
  // A floor module repeats in metric UVs. Occupied rooms and setbacks break up the grid.
  const colors = ['#ffd39a', '#ffbe7d', '#a4dffc', '#f9eddd', '#baa9ff'];
  for (let row = 0; row < 12; row++) {
    for (let column = 0; column < 12; column++) {
      const x = column * 512 / 12, y = row * 512 / 12;
      ctx.fillStyle = random() < .25 ? '#555e6e' : '#343c4f'; ctx.fillRect(x + 1, y + 2, 40, 35);
      ctx.fillStyle = '#141b29'; ctx.fillRect(x + 5, y + 7, 31, 23);
      if (random() < .52) {
        ctx.fillStyle = colors[Math.floor(random() * colors.length)];
        ctx.globalAlpha = .57 + random() * .43; ctx.fillRect(x + 7, y + 9, 26, 17); ctx.globalAlpha = 1;
        ctx.fillStyle = '#93818b'; ctx.fillRect(x + 8, y + 22, 10, 3);
        ctx.fillStyle = '#615371'; ctx.fillRect(x + 23, y + 10, 2, 15);
      }
      ctx.fillStyle = '#667287'; ctx.fillRect(x + 2, y + 33, 38, 2);
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 4; return map;
}

function fogMaterial(T, config, webgpu, map = null) {
  const mist = new T.Color(config.mist), horizon = new T.Color(config.horizon);
  const [near, far] = config.distance || [190, 1020];
  const params = { fog: false, toneMapped: false };
  if (webgpu) {
    const { attribute, cameraPosition, color, length, mix, positionWorld, smoothstep, texture, uv } = T.TSL;
    const material = new T.MeshBasicNodeMaterial(params);
    const tint = attribute('color', 'vec3');
    const skin = map ? tint.mul(texture(map, uv()).rgb) : tint;
    const height = smoothstep(config.fogBase, config.clear, positionWorld.y);
    const distance = smoothstep(near, far, length(positionWorld.xz.sub(cameraPosition.xz)));
    material.colorNode = mix(mix(color(mist), skin, height), color(horizon), distance.mul(.91));
    return material;
  }
  const material = new T.MeshBasicMaterial({ ...params, map, vertexColors: true });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      vesperMist: { value: mist }, vesperHorizon: { value: horizon },
      vesperFloor: { value: config.fogBase }, vesperClear: { value: config.clear },
      vesperNear: { value: near }, vesperFar: { value: far },
    });
    shader.vertexShader = 'varying vec3 vesperWorld;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nvesperWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vesperWorld;\nuniform vec3 vesperMist, vesperHorizon;\nuniform float vesperFloor, vesperClear, vesperNear, vesperFar;\n'
      + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float altitude = smoothstep(vesperFloor, vesperClear, vesperWorld.y);
        float depth = smoothstep(vesperNear, vesperFar, distance(vesperWorld.xz, cameraPosition.xz));
        diffuseColor.rgb = mix(mix(vesperMist, diffuseColor.rgb, altitude), vesperHorizon, depth * 0.91);`);
  };
  return material;
}

function cityGeometry(T, layout, config) {
  const data = () => ({ position: [], color: [], uv: [], index: [] });
  const facade = data(), details = data(), box = new T.BoxGeometry(1, 1, 1);
  const { position, uv, normal } = box.attributes, indices = box.index.array;
  const tint = new T.Color();
  function block(target, tower, base, height, width, depth, color, shiftX = 0, shiftZ = 0) {
    const offset = target.position.length / 3, co = Math.cos(tower.yaw), si = Math.sin(tower.yaw);
    tint.setHex(color);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) * width + shiftX, z = position.getZ(i) * depth + shiftZ;
      const y = base + (position.getY(i) + .5) * height;
      target.position.push(tower.x + x * co + z * si, y, tower.z - x * si + z * co);
      const face = normal.getY(i) > .5 ? 1.08 : normal.getX(i) + normal.getZ(i) > 0 ? .71 : 1;
      target.color.push(tint.r * face, tint.g * face, tint.b * face);
      const breadth = Math.abs(normal.getX(i)) > .5 ? depth : width;
      if (Math.abs(normal.getY(i)) > .5) target.uv.push(.002, .002);
      else target.uv.push(uv.getX(i) * breadth / [34, 27, 49][tower.style] + tower.phase,
        y / [45, 47, 40][tower.style] + tower.phase);
    }
    for (const i of indices) target.index.push(offset + i);
  }
  for (const tower of layout) {
    const { width, depth, top, style, height: floor, band } = tower;
    const color = config.facades[style], metal = config.roofs[style], podiumHeight = top - floor;
    const stepped = style !== 2, shoulder = stepped ? (style === 0 ? 23 : 15) : 4;
    block(facade, tower, floor, podiumHeight - shoulder, width, depth, color);
    block(facade, tower, top - shoulder - .05, shoulder, width * (stepped ? .68 : .91), depth * .82, color, stepped ? -width * .07 : 0);
    block(details, tower, top - .4, 1.15, width * (stepped ? .72 : .95), depth * .87, metal, stepped ? -width * .07 : 0);
    block(details, tower, top + .75, style === 0 ? 3.05 : 1.55, width * .44, depth * .53, metal);
    if (band < 2) {
      // Roof plant and corner fins make the silhouettes legible without adding draw calls.
      block(details, tower, top + 3.8, 3.3 + style * 1.4, width * .26, depth * .34, metal, width * .13, -depth * .1);
      if (style === 1) {
        block(details, tower, top - 29, 41, 1.9, 2, 0x424e68, -width * .27, -depth * .29);
        block(details, tower, top + 12, .65, 1.6, 1.6, 0xf34c86, -width * .27, -depth * .29);
      } else {
        block(details, tower, top - 3, .65, width * .45, 1, style === 0 ? 0xffa46f : 0x83dceb, 0, depth * .424);
      }
    }
  }
  box.dispose();
  return [facade, details].map(data => {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(data.position, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(data.color, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(data.uv, 2));
    geometry.setIndex(data.index); geometry.computeBoundingSphere();
    return geometry;
  });
}

function cloudTexture(T) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), random = seeded(8071);
  ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = random() * 256, y = random() * 256, radius = 22 + random() * 47;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,.26)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.translate(x,y); ctx.scale(1, .56); ctx.translate(-x,-y);
    ctx.fillStyle = gradient; ctx.fillRect(x-radius,y-radius,radius*2,radius*2); ctx.restore();
  }
  const texture = new T.CanvasTexture(canvas); texture.wrapS = texture.wrapT = T.MirroredRepeatWrapping;
  return texture;
}

export function createVesperBuildings(T, parent, layout, config, webgpu) {
  const map = atlas(T), geometry = cityGeometry(T, layout, config);
  const city = new T.Mesh(geometry[0], fogMaterial(T, config, webgpu, map));
  const crowns = new T.Mesh(geometry[1], fogMaterial(T, config, webgpu));
  city.name = 'Vesper · façades et étages éclairés'; crowns.name = 'Vesper · toits, antennes et balises';
  parent.add(city, crowns);

  return {
    dispose() {
      for (const mesh of [city, crowns]) {
        mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose();
      }
      map.dispose();
    },
  };
}

export function createVesperAltitude(T, parent, { district, low = false, webgpu = false, palette }) {
  const config = {...DISTRICTS[district], ...palette}, layout = vesperTowerLayout(district, low);
  const group = new T.Group();
  group.name = 'Vesper · ville à 360°'; group.userData.keepDynamic = true; parent.add(group);
  const buildings = createVesperBuildings(T, group, layout, config, webgpu);

  const texture = cloudTexture(T); texture.repeat.set(2, 2);
  const heights = district === 'gardens' ? [-69, -115, -192] : [-93, -157, -245];
  const layers = (low ? [heights[0], heights[2]] : heights).map((level, index) => {
    const disc = new T.Mesh(new T.CircleGeometry(1170 - index * 64, 64),
      new T.MeshBasicMaterial({ color: config.mist, alphaMap: texture,
        transparent: true, fog: false, toneMapped: false, depthWrite: false, opacity: .25 + index * .09 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = level;
    disc.renderOrder = 1 + (2 - index);
    disc.name = 'Vesper · nappe de brume basse'; group.add(disc);
    return disc;
  });
  const basinGeometry = new T.RingGeometry(.1, 2400, 96, 18);
  const colors = [];
  const base = new T.Color(config.mist), lower = new T.Color(config.basinEdge ?? (district === 'gardens' ? 0x202c3c : 0x120f1a));
  const position = basinGeometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const radius = Math.hypot(position.getX(i), position.getY(i));
    const color = base.clone().lerp(lower, Math.min(1, Math.max(0, (radius - 750) / 1200)));
    colors.push(color.r, color.g, color.b);
  }
  basinGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const basin = new T.Mesh(basinGeometry,
    new T.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }));
  basin.rotation.x = -Math.PI / 2;
  basin.position.y = config.floor - .15;
  basin.name = 'Vesper · fond de brume'; group.add(basin);
  return {
    update(time) { texture.offset.set(time * .0017, time * .0008); },
    nearestRoof(x, z) {
      let roof = null, distance = Infinity;
      for (const tower of layout) {
        if (tower.band !== 0) continue;
        const d = Math.hypot(tower.x - x, tower.z - z);
        if (d < distance) { distance = d; roof = tower; }
      }
      return roof;
    },
    stats() { return { towers: layout.length, districts: SECTORS, depthBands: 3, lowMistLayers: layers.length }; },
    dispose() {
      group.removeFromParent();
      buildings.dispose();
      for (const mesh of [basin, ...layers]) { mesh.geometry.dispose(); mesh.material.dispose(); }
      texture.dispose();
    }
  };
}
