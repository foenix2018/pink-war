import {createNeonFixtures} from './neon-fixtures.js';
import {createWorldRadiance} from './world-material-response.js';

const asset = file => new URL('./assets/m10/' + file, import.meta.url).href;
const pink = 0xf454a4;

export function createHelixAtmosphere(T, scene, floor, {low = false} = {}) {
  const loader = new T.TextureLoader();
  const maps = new Map();
  const radiance = createWorldRadiance(T, {cool: 0x9da9d9, warm: 0xf7b0c4, low});
  let disposed = false, sky;
  scene.background = new T.Color(0x624566);
  scene.fog = new T.Fog(0x80647f, 135, 820);
  scene.environment = radiance;
  scene.environmentIntensity = .79;

  const skyReady = loader.loadAsync(asset('helix-crepuscule.webp')).then(texture => {
    if (disposed) { texture.dispose(); return; }
    sky = texture;
    sky.colorSpace = T.SRGBColorSpace;
    sky.mapping = T.EquirectangularReflectionMapping;
    scene.background = sky;
    scene.backgroundRotation.y = -.71;
  }).catch(error => console.warn('M10 / ciel crépusculaire', error));

  const paving = [
    ['map', 'helix-dalles.webp', T.SRGBColorSpace],
    ['roughnessMap', 'helix-dalles-rough.webp', T.NoColorSpace],
  ];
  if (!low) paving.push(['normalMap', 'helix-dalles-normal.webp', T.NoColorSpace]);
  const pavingReady = Promise.all(paving.map(async ([channel, name, colorSpace]) => {
    try {
      const texture = await loader.loadAsync(asset(name));
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = colorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = low ? 2 : 4;
      maps.set('m10/' + name, texture);
      floor[channel] = texture;
      floor.needsUpdate = true;
    } catch (error) {
      console.warn('M10 / dalles HELIX', error);
    }
  }));

  return {
    ready: Promise.all([skyReady, pavingReady]),
    skyline: {mist: 0x75647e, horizon: 0x896b87},
    texture: path => maps.get(path),
    stats: () => ({duskSky: Boolean(sky), pavingMaps: maps.size}),
    dispose() {
      disposed = true;
      if (scene.background === sky) scene.background = null;
      if (scene.environment === radiance) scene.environment = null;
      sky?.dispose();
      radiance.dispose();
      for (const texture of maps.values()) texture.dispose();
      maps.clear();
    },
  };
}

const LUMINAIRES = [
  // Two lamps sit against the ceramic wall beside the arrival gate.
  {at: [-4.25, 2.47, 60.234], size: [.15, 1.12, .076], normal: 1},
  {at: [4.25, 2.47, 60.234], size: [.15, 1.12, .076], normal: 1},
  {at: [5.52, 13.46, -12.44], size: [1.95, .069, .15], normal: -1},
  {at: [-25.6, 16.10, -72], size: [.14, .073, 1.85], normal: -1},
  // Indicate the inward edge of the east airlock and the edge of the pad.
  {at: [33.05, 13.94, -56.915], size: [.15, 2.48, .073], normal: 1},
  {at: [33.05, 13.94, -51.085], size: [.15, 2.48, .073], normal: -1},
  {at: [71.905, 12.66, -48], size: [.055, .62, .13], normal: -1},
  {at: [71.905, 12.66, -76], size: [.055, .62, .13], normal: -1},
];

export function createHelixAccents(T, root, M, {low = false} = {}) {
  const fixtures = createNeonFixtures(T, root, {low, metal: M.metal, back: M.dark});
  for (const {at, size, normal} of LUMINAIRES) {
    fixtures.bar(size, at, [0, 0, 0], pink, undefined, normal);
  }
  fixtures.build();

  const lights = [
    {at: [-4.25, 2.46, 60.88], power: 27, range: 8.4},
    {at: [4.25, 2.46, 60.88], power: 27, range: 8.4},
    {at: [5.52, 13.18, -12.44], power: 31, range: 10.5},
    {at: [-25.6, 15.76, -72], power: 30, range: 8.8},
    {at: [33.16, 14.29, -54], power: 34, range: 9.1},
    {at: [71.57, 12.87, -48], power: 13, range: 6.5},
    {at: [71.57, 12.87, -76], power: 13, range: 6.5},
  ];
  const spill = new T.PointLight(pink, 0, 10, 2);
  spill.name = 'HELIX / éclairage de proximité';
  root.add(spill);
  let source, lastSample = -Infinity;
  return {
    update(time, dt, eye) {
      if (!eye) return;
      if (time < lastSample || time - lastSample >= .12) {
        lastSample = time;
        let nearest, threshold = Infinity;
        for (const light of lights) {
          const [x, y, z] = light.at;
          const distance = (eye.x - x) ** 2 + (eye.y - y) ** 2 + (eye.z - z) ** 2;
          if (distance >= threshold || distance > (light.range + 2) ** 2) continue;
          nearest = light;
          threshold = distance;
        }
        if (nearest !== source) {
          source = nearest;
          if (source) {
            spill.position.set(...source.at);
            spill.distance = source.range;
            spill.intensity = 0;
          }
        }
      }
      spill.intensity += ((source?.power ?? 0) - spill.intensity) * (1 - Math.exp(-9 * dt));
    },
    stats: () => ({...fixtures.stats(), lights: 1}),
    dispose() { fixtures.dispose(); spill.removeFromParent(); },
  };
}
