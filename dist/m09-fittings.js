import {Assembly, bevelBox, matrix} from './geo.js';
import {createNeonFixtures} from './neon-fixtures.js';
import {DATA} from './m09-layout.js';

const pink = 0xf85ca4;

export function createGardenFittings(T, parent, door, low) {
  const root = new T.Group();
  root.name = 'Sas ORDRE · chariots et rail supérieur';
  parent.add(root);
  const paint = new T.MeshStandardMaterial({color: 0x343947, roughness: .49, metalness: .61});
  const metal = new T.MeshStandardMaterial({color: 0x829099, roughness: .37, metalness: .76});
  const seal = new T.MeshStandardMaterial({color: 0x19222a, roughness: .79, metalness: .24});
  const glass = new T.MeshStandardMaterial({color: 0x274454, roughness: .30, metalness: .35});
  const lens = new T.MeshBasicMaterial({color: pink, toneMapped: false});
  const geometries = new Set();
  function box(parts, mat, size, position, radius = .046) {
    const g = bevelBox(...size, radius, 1);
    parts.add(g, mat, matrix(position), false);
    g.dispose();
  }
  function finish(parts, group) {
    for (const o of parts.build(group)) geometries.add(o.geometry);
    for (const item of parts.items) item.geometry.dispose();
  }
  const casing = new Assembly();
  box(casing, metal, [9.32,.49,.73], [door.x,door.y+8.19,door.z+.24], .086);
  box(casing, seal, [8.5,.18,.31], [door.x,door.y+7.92,door.z+.45], .037);
  for (const x of [-3.75,-2,2,3.75]) {
    box(casing, paint, [.52,.35,.25], [door.x+x,door.y+8.19,door.z+.66]);
  }
  finish(casing, root);
  const leaves = [-1,1].map(side => {
    const group = new T.Group(), parts = new Assembly();
    root.add(group);
    group.position.set(door.x+side*2,door.y+4,door.z);
    box(parts, paint, [3.94,8,.28], [0,0,0], .11);
    box(parts, seal, [2.97,3.46,.084], [0,.48,.15], .083);
    box(parts, glass, [2.79,3.22,.043], [0,.49,.202], .053);
    box(parts, metal, [3.62,.42,.145], [0,-3.60,.135]);
    box(parts, metal, [3.48,.38,.135], [0,2.86,.146]);
    box(parts, seal, [.21,7.64,.091], [-side*1.87,0,.152]);
    for (const h of [-2.04,-.63,2.95]) {
      box(parts, metal, [.30,.22,.16], [side*1.64,h,.162]);
    }
    for (const h of [-.51,1.56]) {
      box(parts, paint, [.44,.25,.14], [side*1.2,h,.20]);
    }
    box(parts, metal, [.17,2.13,.09], [side*1.2,.53,.274]);
    box(parts, lens, [.11,.15,.052], [side*1.2,2.86,.244], .028);
    finish(parts, group);
    return {group,side};
  });
  const lights = createNeonFixtures(T, root, {low,metal,back:seal});
  lights.bar([2.38,.13,.073], [door.x,door.y+8.19,door.z+.804], [0,0,0], pink);
  lights.bar([.405,.081,.043], [-81.53,14.952,58.988], [0,0,0], pink);
  lights.bar([.405,.081,.043], [-76.43,22.952,-12.012], [0,0,0], pink);
  lights.build();
  const accent = new T.PointLight(pink, 0, 15.0, 2);
  accent.name = 'Rose · projecteurs de service';
  parent.add(accent);
  const sources = [
    {position: [door.x,door.y+6.75,door.z+2.9], power: 132, range: 18},
    {position: [-81.53,14.95,59.30], power: 14, range: 7.5},
    {position: [-76.43,22.95,-11.70], power: 14, range: 7.5},
  ];
  let open = 0, selected, nextCheck = 0;
  return {
    root, leaves, metal, seal, paint,
    update(t, dt, target, camera) {
      open += (target - open) * (1 - Math.exp(-dt * 3));
      for (const {group,side} of leaves) group.position.x = door.x + side * (2 + open * 4.2);
      lens.color.setHex(target ? 0x85e3b1 : pink);
      const eye = camera?.position;
      if (eye && (t < nextCheck - .14 || t >= nextCheck)) {
        nextCheck = t + .12;
        let nearest, distance = Infinity;
        for (const source of sources) {
          const [x,y,z] = source.position, d = (eye.x-x)**2 + (eye.y-y)**2 + (eye.z-z)**2;
          if (d >= distance || d > (source.range + 2)**2) continue;
          nearest = source; distance = d;
        }
        if (selected !== nearest) {
          selected = nearest; accent.intensity = 0;
          if (selected) { accent.position.set(...selected.position); accent.distance = selected.range; }
        }
      }
      accent.intensity += ((selected?.power || 0) - accent.intensity) * (1 - Math.exp(-dt * 8));
    },
    stats: () => ({fixtures: lights.stats().fixtures, lightPool: 1}),
    dispose() {
      root.removeFromParent(); accent.removeFromParent(); lights.dispose();
      for (const g of geometries) g.dispose();
      for (const m of [paint,metal,seal,glass,lens]) m.dispose();
    },
  };
}

export function gardenEquipment(T, root, asset, materials) {
  const mounts = DATA.colliders.filter(o => o.kind === 'culture hydroponique')
    .map(o => ({x:o.x-1.41,y:o.y,z:o.z+o.hz-.052,rotation:0}));
  const treatment = DATA.platforms.find(p => p.id === 'core'), units = [];
  for (let i = 0; i < 4; i++) {
    const a = .40 + i * Math.PI / 2;
    units.push({x:treatment.x+Math.sin(a)*10.57,y:treatment.y+.902,z:treatment.z+Math.cos(a)*10.57,rotation:a});
  }
  const signal = new T.MeshBasicMaterial({color:pink,toneMapped:false});
  const stamp = new T.Object3D(), meshes = [];
  for (const p of asset.primitives) {
    const [section, role] = p.material.split('/');
    const places = section === 'irrigation' ? mounts : units;
    const material = section === 'janus' && role === 'rose' ? signal : materials.get(role);
    const mesh = new T.InstancedMesh(p.geometry, material, places.length);
    mesh.name = section==='irrigation' ? 'Serres · vannes et manomètres' : 'JANUS · régulateurs du socle';
    for (const [i,mount] of places.entries()) {
      stamp.position.set(mount.x,mount.y,mount.z);
      stamp.rotation.y = mount.rotation;
      stamp.updateMatrix();
      mesh.setMatrixAt(i,stamp.matrix);
    }
    mesh.computeBoundingSphere();
    mesh.userData.noWorldShadow = true;
    root.add(mesh);
    meshes.push(mesh);
  }
  return {
    setPowered(power) { signal.color.setHex(power ? pink : 0x88d4a7); },
    stats: () => ({irrigation:mounts.length,janus:units.length,triangles:asset.triangles}),
    dispose() {
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); mesh.geometry.dispose(); }
      signal.dispose();
    },
  };
}
