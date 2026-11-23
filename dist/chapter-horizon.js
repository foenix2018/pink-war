import { createVesperBuildings } from './vesper-altitude.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// The field height is relative to the authored ground. Distance groups leave corridors between districts.
export const CHAPTER_HORIZONS = Object.freeze({
  1: { id: 'vesper-dawn', sky: [0x677987, 0xa9a09a, 0x898d86, 0x5a6260], cloud: 0xded1b9,
    city: [150, 265, 420], height: [19, 66], ground: [-.42, 0x444d48], existingSky: true },
  2: { id: 'lower-vesper', sky: [0x161f30, 0x354555, 0x46545a, 0x263139], cloud: 0x8a9fac,
    city: [122, 202, 295], height: [35, 91], ground: [-.33, 0x283539], perimeter: [52, 104] },
  3: { id: 'convoi-neon', sky: [0x0b1125, 0x242744, 0x654263, 0x202639], cloud: 0x62588e,
    city: [208, 328, 472], height: [23, 106], ground: [-.18, 0x29333d] },
  4: { id: 'janus-rail', sky: [0x11152e, 0x282844, 0x4b465e, 0x242431], cloud: 0x756a9c,
    city: [180, 280, 425], height: [12, 61], ground: [-.24, 0x292830], rail: true },
  5: { id: 'halles-rain', sky: [0x141f30, 0x314052, 0x536176, 0x283342], cloud: 0xa6b2c6,
    city: [48, 120, 210], height: [18, 54], ground: [4.13, 0x333f47], origin: [0, -92], underground: true },
  6: { id: 'foundry-smoke', sky: [0x4a3b4e, 0x80605b, 0xb98a68, 0x725143], cloud: 0xbe9982 },
  7: { id: 'wooded-ridges', sky: [0x252743, 0x595172, 0xd29472, 0x655365], cloud: 0xe0a88c,
    ridges: [380, 630, 960] },
  8: { id: 'vesper-rain-towers', sky: [0x100d22, 0x28243f, 0x514557, 0x242339], cloud: 0x786c92,
    city: [220, 364, 570], height: [36, 163], ground: [-.12, 0x272333] },
});

function skyTexture(T, profile, low, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = low ? 512 : 1024; canvas.height = canvas.width / 2;
  const ctx = canvas.getContext('2d'), { width, height } = canvas;
  const image = ctx.createImageData(width, height);
  const random = seeded(seed), waves = Array.from({length: 9}, () => random() * TAU);
  const colors = profile.sky.map(n => [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const cloud = [(profile.cloud >> 16) & 255, (profile.cloud >> 8) & 255, profile.cloud & 255];
  const solar = Math.PI * (.85 + random() * .6);
  for (let y = 0; y < height; y++) {
    const altitude = Math.cos((y + .5) / height * Math.PI);
    const below = altitude < 0;
    const blend = below ? smooth(0, .4, -altitude) : smooth(0, .28, altitude);
    const upper = smooth(.22, .96, altitude);
    for (let x = 0; x < width; x++) {
      const a = x / width * TAU;
      const light = Math.max(0, Math.cos(a - solar)) ** 4 * (1 - smooth(0, .56, Math.abs(altitude)));
      // Several wind-stretched, periodic noise fields. No seam at the azimuth wrap.
      const u = a + Math.sin(a * 2 + altitude * 13 + waves[0]) * .18;
      const noise = Math.sin(u * 3 + altitude * 22 + waves[1]) * .42
        + Math.sin(u * 7 - altitude * 34 + waves[2]) * .28
        + Math.sin(u * 15 + altitude * 45 + waves[3]) * .17
        + Math.sin(u * 31 - altitude * 69 + waves[4]) * .085;
      const bank = smooth(-.04, .08, altitude) * (1 - smooth(.56, 1, altitude));
      const opacity = smooth(.12, .62, noise) * bank * (.32 + light * .28);
      const grain = (random() - .5) * 1.9;
      const i = 4 * (y * width + x);
      for (let k = 0; k < 3; k++) {
        let c = colors[2][k] * (1 - blend) + colors[below ? 3 : 1][k] * blend;
        if (!below) c = c * (1 - upper) + colors[0][k] * upper;
        c += light * [12, 7, 5][k];
        image.data[i + k] = c * (1 - opacity) + cloud[k] * opacity * (.78 + light * .22) + grain;
      }
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const map = new T.CanvasTexture(canvas);
  map.mapping = T.EquirectangularReflectionMapping; map.colorSpace = T.SRGBColorSpace;
  return map;
}

// Coarse circular terrain with no rectangular horizon. The existing playable surface overlays it.
export function radialGround(T, { radius, segments = 96, radii, sample, uvMetres = 1, fillCentre = true }) {
  const positions = [], colors = [], uv = [], indices = [];
  for (let i = 0; i < radii.length; i++) {
    const r = radius * radii[i];
    for (let j = 0; j < segments; j++) {
      const a = j * TAU / segments, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const { y, color } = sample(x, z, r, a);
      positions.push(x, y, z); colors.push(color.r, color.g, color.b); uv.push(x / uvMetres, z / uvMetres);
      if (!i) continue;
      const next = (j + 1) % segments, inner = (i - 1) * segments, outer = i * segments;
      indices.push(inner + j, inner + next, outer + j, inner + next, outer + next, outer + j);
    }
  }
  if (fillCentre) {
    // One centre vertex rather than a ring of collapsed triangles.
    const middle = sample(0, 0, 0, 0), centre = positions.length / 3;
    positions.push(0, middle.y, 0); colors.push(middle.color.r, middle.color.g, middle.color.b); uv.push(0, 0);
    for (let j = 0; j < segments; j++) indices.push(centre, (j + 1) % segments, j);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

function distantGround(T, profile, low, opening) {
  const [y, near] = profile.ground, far = new T.Color(profile.sky[3]), shade = new T.Color(near), color = new T.Color();
  const radius = profile.city.at(-1) * 2.45, segments = low ? 56 : 96;
  function sample(x, z, r, a) {
    const fade = smooth(.14, .8, r / radius);
    const variation = Math.sin(a * 9 + r * .013) * .05 + Math.sin(x * .034 + z * .026) * .035;
    const rise = smooth(.23, .66, r / radius) * (1.8 + 1.4 * Math.sin(a * 4 + r * .01));
    color.copy(shade).multiplyScalar(1 + variation).lerp(far, fade);
    return { y: y + rise, color };
  }
  const rings = [.018,.055,.10,.16,.23,.31,.42,.55,.66,.79,.92,1];
  if (opening) rings.shift();
  const geometry = radialGround(T, {radius, segments, radii:rings, sample, fillCentre:!opening});
  const material = new T.MeshBasicMaterial({vertexColors:true,fog:false,toneMapped:false});
  const ground = new T.Mesh(geometry, material);
  if (!opening) return ground;

  // The street continues around the real staircase, with a hole in the near ground.
  // Use the same outer vertices as the next terrain ring to keep the join watertight.
  const perimeter = new T.Shape(), innerRadius = radius*rings[0];
  for (let i=0;i<segments;i++) {
    const a=i*TAU/segments, x=Math.cos(a)*innerRadius, z=-Math.sin(a)*innerRadius;
    if (i===0) perimeter.moveTo(x,z); else perimeter.lineTo(x,z);
  }
  perimeter.closePath();
  const [originX,originZ]=profile.origin;
  const {x1,x2,z1,z2}=opening, cut=new T.Path();
  cut.moveTo(x1-originX,originZ-z1);cut.lineTo(x2-originX,originZ-z1);
  cut.lineTo(x2-originX,originZ-z2);cut.lineTo(x1-originX,originZ-z2);cut.closePath();
  perimeter.holes.push(cut);
  const collar = new T.ShapeGeometry(perimeter).rotateX(-Math.PI/2);
  const positions=collar.attributes.position, colors=[];
  for (let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=positions.getZ(i);
    const surface=sample(x,z,Math.hypot(x,z),Math.atan2(z,x));
    positions.setY(i,surface.y); colors.push(surface.color.r,surface.color.g,surface.color.b);
  }
  collar.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  ground.add(new T.Mesh(collar,material));
  return ground;
}

function districtLayout(profile, seed, low) {
  const random = seeded(seed * 1101), layout = [];
  const floor = profile.ground[0] - 1;
  for (const [band, distance] of profile.city.entries()) {
    for (let sector = 0; sector < 12; sector++) {
      const tierCount = band + 2;
      for (let i = 0; i < tierCount; i++) {
        const a = TAU / 12 * (sector + .12 * band + (i + .5) / tierCount);
        let radius = distance * (.89 + random() * .20);
        const [min, max] = profile.height, style = (i + sector) % 3;
        const width = 11 + random() * (profile.rail ? 22 : 16) + band * 3;
        const depth = width * (.64 + random() * .42);
        if (band === 0 && profile.perimeter) {
          const clearance = Math.hypot(width,depth)*.5;
          const [rx,rz] = profile.perimeter;
          // Put the nearest blocks just beyond the wall around the lower district,
          // staggered in plan so the roofline doesn't trace its rectangular boundary.
          const edge = Math.min((rx+clearance)/Math.max(.001,Math.abs(Math.cos(a))),
            (rz+clearance)/Math.max(.001,Math.abs(Math.sin(a))));
          radius = edge + 3 + (i % 2) * 17 + (radius-distance)*.15;
        }
        const x = Math.cos(a)*radius, z = Math.sin(a)*radius;
        const top = floor + min + random() * (max - min) * (.72 + band * .17);
        const phase = random() * 9;
        if (!low || i < 2 || (i + sector) % 2 === 0) {
          layout.push({ x, z, width, depth, top, style, band, sector, yaw: a + .14, phase, height: floor });
        }
      }
    }
  }
  return layout;
}

function railSilhouette(T, parent, profile) {
  const material = new T.MeshBasicMaterial({ color: profile.sky[3], fog: false, toneMapped: false });
  const radius = profile.city[0] - 35;
  for (let sector = 0; sector < 6; sector++) {
    const a = TAU * sector / 6 + .23, gantry = new T.Group();
    gantry.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    gantry.rotation.y = -a + Math.PI / 2;
    function frame(x, y, w, h) {
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, 1.25), material);
      mesh.position.set(x, y, 0); gantry.add(mesh);
    }
    frame(-13, 6.5, 1.35, 13); frame(13, 6.5, 1.35, 13); frame(0, 13, 28, .95);
    frame(0, 11, 25, .35); frame(-7, 10, .24, 3); frame(6, 10, .24, 3);
    parent.add(gantry);
  }
}

function forestRidges(T, parent, profile, low) {
  const segments = low ? 96 : 156;
  const floor = new T.Color(profile.sky[3]);
  const ground = radialGround(T,{
    radius: 1660, segments, radii:[.11,.32,.56,.78,1],
    sample:()=>({y:-40,color:floor}),
  });
  parent.add(new T.Mesh(ground,new T.MeshBasicMaterial({vertexColors:true,fog:false,toneMapped:false})));
  for (const [band, distance] of profile.ridges.entries()) {
    const ridge = radialGround(T,{
      radius: distance + 76, segments, fillCentre:false, radii: [(distance-74)/(distance+76),(distance-32)/(distance+76),distance/(distance+76),1],
      sample(x, z, r, a) {
        const crest = 29 + band * 35 + 48 * (.52 + .29 * Math.sin(a * 3 + band) + .18 * Math.sin(a * 7 - band));
        const shape = Math.exp(-(((r - distance) / 44) ** 2));
        const crowns = (Math.sin(a * 69) + Math.sin(a * 83 + band)) * (low ? 1.1 : 1.9);
        const color = new T.Color([0x354638,0x545364,0x776675][band]).lerp(new T.Color(profile.sky[3]), (1 - shape) * .73);
        return { y: -23 + (crest + crowns) * shape, color };
      },
    });
    parent.add(new T.Mesh(ridge,new T.MeshBasicMaterial({ vertexColors:true, fog:false, toneMapped:false })));
  }
}

export function createChapterHorizon(T, scene, { chapter, low = false, webgpu = false, opening = null } = {}) {
  const profile = CHAPTER_HORIZONS[chapter], group = new T.Group(), original = scene.background;
  group.name = 'Horizon · ' + profile.id; group.userData.keepDynamic = true;
  if (profile.origin) group.position.set(profile.origin[0], 0, profile.origin[1]);
  scene.add(group);
  const map = profile.existingSky ? null : skyTexture(T, profile, low, chapter * 907);
  let district;
  if (profile.ground) group.add(distantGround(T, profile, low, opening));
  if (profile.city) {
    const [near, , far] = profile.city, y = profile.ground[0];
    district = districtLayout(profile, chapter, low);
    createVesperBuildings(T,group,district,{
      floor:y-1, fogBase:y-15, clear:y+13, distance:[near*.55,far*1.18], mist:profile.sky[3], horizon:profile.sky[2],
      facades: chapter===1?[0xa0a09b,0x908c8c,0xb1a094]:[0x718ba7,0x84768e,0x968393],
      roofs: [0x495567,0x534d67,0x675767],
    },webgpu);
  }
  if (profile.rail) railSilhouette(T,group,profile);
  if (profile.ridges) forestRidges(T,group,profile,low);
  const savedIntensity = scene.backgroundIntensity;
  let visible;
  function setOutside(outside) {
    if (visible === outside) return;
    visible = outside; group.visible = outside;
    if (map) {
      scene.background = outside ? map : original;
      scene.backgroundIntensity = outside ? 1 : savedIntensity;
    }
  }
  setOutside(!profile.underground);
  return {
    setOutside,
    stats: () => ({ id:profile.id, towers:district?.length||0, ridges:profile.ridges?.length||0, visible:group.visible }),
  };
}

// Physical ground in the playable area, continuing to a slightly lowered, round edge.
export function extendPaving(T, material, { radius, tile = 4, low = false, y = -.02, drop = .4 }) {
  const color = new T.Color(0xffffff);
  const geometry = radialGround(T,{
    radius, segments: low ? 64 : 96, radii:[.13,.40,.65,.77,.83,.89,.94,1], uvMetres:tile,
    sample: (x,z,r) => ({ y:y-drop*smooth(.79,1,r/radius), color }),
  });
  const mesh = new T.Mesh(geometry,material);
  mesh.receiveShadow = true;
  mesh.name = 'Sol · raccord circulaire';
  return mesh;
}
