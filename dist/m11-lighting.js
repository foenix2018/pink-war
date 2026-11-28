import { createNeonFixtures } from './neon-fixtures.js';

export const M11_NEON_PINK = 0xf2499f;

const FIXTURES = [
  // Mounting face specified explicitly so the halos face away from the wall.
  { size: [.075, 1.78, .16], position: [-96.388, 3.54, 57.13], normal: 1 },
  { size: [.075, 1.78, .16], position: [-96.388, 3.54, 61.14], normal: 1 },
  { size: [2.34, .17, .08], position: [-104, 6.07, 65.12], normal: 1 },
  { size: [.13, 1.14, .073], position: [-75.97, 9.68, 18.226], normal: 1 },
  { size: [.07, 1.63, .16], position: [-57.875, 14.19, -11.04], normal: 1 },
  { size: [1.59, .15, .071], position: [14, 19.65, -38.164], normal: 1 },
  { size: [1.59, .15, .071], position: [78, 19.65, -38.164], normal: 1 },
];

export function createM11Neon(T, root, materials, { low = false } = {}) {
  const fixtures = createNeonFixtures(T, root, {
    low, metal: materials.edge, back: materials.dark, distantThreshold: 180,
  });
  for (const { size, position, normal } of FIXTURES) {
    fixtures.bar(size, position, [0, 0, 0], M11_NEON_PINK, undefined, normal);
  }
  fixtures.build();

  const sources = [
    { position: [-95.60, 3.68, 59.13], colour: M11_NEON_PINK, intensity: 46, range: 10.6 },
    { position: [-104, 5.95, 65.46], colour: M11_NEON_PINK, intensity: 55, range: 9.8 },
    { position: [-75.97, 9.68, 18.44], colour: M11_NEON_PINK, intensity: 22, range: 6.8 },
    { position: [-57.56, 14.25, -11.04], colour: M11_NEON_PINK, intensity: 36, range: 8.2 },
  ];
  const point = new T.PointLight(M11_NEON_PINK, 0, 10, 2);
  point.name = 'M11 · éclairage de proximité des néons';
  root.add(point);
  let source = null;
  let nextCheck = 0;

  function update(time, dt, eye) {
    if (!eye) return;
    if (time < nextCheck - .15 || time >= nextCheck) {
      nextCheck = time + .12;
      let nearest = null, distance = Infinity;
      for (const candidate of sources) {
        const [x, y, z] = candidate.position;
        const squared = (eye.x - x) ** 2 + (eye.y - y) ** 2 + (eye.z - z) ** 2;
        if (squared >= distance || squared > (candidate.range + 3) ** 2) continue;
        distance = squared;
        nearest = candidate;
      }
      if (nearest !== source) {
        point.intensity = 0;
        source = nearest;
        if (source) point.position.set(...source.position);
      }
    }
    const brightness = source?.intensity || 0;
    if (source) {
      point.color.setHex(source.colour);
      point.distance = source.range;
    }
    point.intensity += (brightness - point.intensity) * (1 - Math.exp(-dt * 9));
  }

  return {
    addSource(source) { sources.push(source); },
    update,
    stats() { return { ...fixtures.stats(), lights: 1 }; },
    dispose() { fixtures.dispose(); point.removeFromParent(); },
  };
}
