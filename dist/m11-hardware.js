import { bevelBox, limb, matrix, merge } from './geo.js';

const PINK = 0xff539f;
const READY_PINK = 0xff88be;
const SAFE_GREEN = 0x81d4a2;
function rounded(kit, size, position, radius, material, rotation = [0, 0, 0]) {
  kit.add(bevelBox(...size, radius, 1), material, position, rotation);
}

function relayLamp(T, root, material, x, y, z, low) {
  const geometry = new T.CylinderGeometry(.033, .033, 1.08, low ? 6 : 10);
  const lamp = new T.InstancedMesh(geometry, material, 3);
  for (let i = 0; i < 3; i++) lamp.setMatrixAt(i, matrix([x + (i - 1) * .33, y, z]));
  lamp.computeBoundingSphere();
  lamp.name = 'Relais · tubes de la fenêtre de contrôle';
  lamp.userData.noWorldShadow = true;
  root.add(lamp);
  return lamp;
}

export function buildRelayHardware(T, root, kit, x, index, { low = false } = {}) {
  const z = -51, y = 25;
  const { box, rod, ring, cylinder, trimSign } = kit;
  const at = (dx, dy, dz) => [x + dx, y + dy, z + dz];

  // A bolted octagonal bed, with its upper equipment within the existing relay envelope.
  kit.add(new T.CylinderGeometry(2.70, 2.91, .46, 8).rotateY(Math.PI / 8), 'concrete', at(0, .23, 0));
  rounded(kit, [4.28, .22, 3.51], at(0, .55, 0), .10, 'edge');
  rounded(kit, [2.76, 3.71, 2.64], at(0, 2.49, .05), .18, 'paint');
  rounded(kit, [3.42, .38, 3.01], at(0, 4.49, 0), .14, 'steel');
  rounded(kit, [2.09, .43, 2.17], at(0, 4.84, -.15), .12, 'dark');

  for (const side of [-1, 1]) {
    const dx = side * 1.77;
    // Radiator fins separate the coolant reservoir from the upright chassis.
    rounded(kit, [.76, 2.64, 2.03], at(dx, 2.18, -.32), .08, 'dark');
    for (let fin = 0; fin < (low ? 7 : 11); fin++) {
      const pitch = low ? .29 : .192;
      box(at(dx, 1.20 + fin * pitch, -.26), [.84, .07, 2.03], 'edge');
    }
    for (const dz of [-1.32, 1.40]) {
      rod(at(side * 1.23, .68, dz), at(side * 1.70, 4.22, dz), .094, 'steel');
      cylinder(at(side * 1.84, .72, dz), .09, .075, 'edge');
    }
    for (const dz of [-.55, .41]) {
      rod(at(side * .73, 4.71, dz), at(side * .73, 5.49, dz), .067, 'steel');
      for (let disc = 0; disc < 4; disc++) {
        cylinder(at(side * .73, 4.90 + disc * .12, dz), .151, .066, 'white');
      }
      cylinder(at(side * .73, 5.45, dz), .118, .088, 'edge');
    }
    // A bent supply line stays attached to the casing at both ends.
    rod(at(side * .73, 5.47, -.56), at(side * 1.89, 5.29, -.56), .041, 'rubber');
    rod(at(side * 1.89, 5.29, -.56), at(side * 1.96, 3.55, -.67), .043, 'rubber');
    rod(at(side * 1.96, 3.55, -.67), at(side * 1.65, 3.51, -.71), .039, 'edge');
  }

  // A recessed dark window and a metal cage keep the live tubes readable from the dam deck.
  rounded(kit, [1.52, 1.44, .21], at(0, 3.57, 1.39), .085, 'dark');
  for (const side of [-1, 1]) {
    box(at(side * .765, 3.57, 1.55), [.09, 1.43, .15], 'edge');
    box(at(0, 3.57 + side * .69, 1.55), [1.54, .09, .15], 'edge');
  }
  for (const dx of [-.57, -.17, .17, .57]) rod(at(dx, 2.92, 1.62), at(dx, 4.21, 1.62), .024);
  for (const dy of [2.96, 4.18]) box(at(0, dy, 1.53), [1.18, .102, .12], 'white');
  const lit = new T.MeshBasicMaterial({ color: PINK, toneMapped: false });
  const lamp = relayLamp(T, root, lit, x, y + 3.57, z + 1.52, low);

  // Control box with hinges, cable glands and an engraved identification plate.
  rounded(kit, [1.28, 1.11, .34], at(0, 1.70, 1.51), .064, 'steel');
  rounded(kit, [1.09, .81, .055], at(0, 1.73, 1.70), .033, 'dark');
  for (const dy of [1.40, 1.99]) cylinder(at(-.548, dy, 1.737), .047, .104, 'edge');
  for (const dx of [-.36, -.20, .25, .41]) box(at(dx, 1.51, 1.734), [.079, .093, .046], 'edge');
  box(at(.33, 1.80, 1.741), [.30, .060, .031], 'gold');
  cylinder(at(-.33, 1.79, 1.759), .096, .061, 'rubber', [Math.PI / 2, 0, 0]);
  cylinder(at(-.33, 1.79, 1.800), .065, .031, 'paintRed', [Math.PI / 2, 0, 0]);
  const letter = 'ABC'[index];
  trimSign('RELAIS ' + letter, 'HAUTE TENSION · ORDRE', at(0, 2.17, 1.741), 0, .93, .23, 'ordre');
  rod(at(.35, 1.17, 1.49), at(.35, .73, 1.71), .055, 'rubber');
  rod(at(.35, .73, 1.71), at(1.38, .68, 1.71), .052, 'rubber');
  ring(at(1.38, .70, 1.71), .077, .018, 'edge');

  const record = {
    position: at(0, 3.42, 2.40), colour: PINK, intensity: 38, range: 10.5,
  };
  let current = '';
  return {
    light: record,
    setState(done, active) {
      const state = done ? 'safe' : active ? 'ready' : 'live';
      if (state === current) return;
      current = state;
      record.colour = done ? SAFE_GREEN : active ? READY_PINK : PINK;
      record.intensity = done ? 8 : active ? 44 : 32;
      lit.color.setHex(record.colour);
    },
    dispose() {
      lamp.removeFromParent();
      lamp.dispose();
      lamp.geometry.dispose();
      lit.dispose();
    },
  };
}

function createValveWheel(T, low) {
  const geometry = [
    new T.TorusGeometry(.35, .042, low ? 5 : 7, low ? 19 : 32).rotateX(-Math.PI / 2),
    new T.CylinderGeometry(.104, .107, .122, low ? 8 : 12),
  ];
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, c = Math.cos(a), s = Math.sin(a);
    geometry.push(limb([.07 * c, 0, .07 * s], [.324 * c, 0, .324 * s], .032, .036, low ? 5 : 8));
  }
  const wheel = merge(geometry);
  for (const piece of geometry) piece.dispose();
  return wheel;
}

export function buildDamValves(T, root, kit, M, { low = false } = {}) {
  const xList = [45.5, 48.4, 51.3], y = 25, z = -39;
  const { box, rod, ring, cylinder } = kit;
  const stamp = new T.Object3D();
  const wheels = new T.InstancedMesh(createValveWheel(T, low), M.paintRed, xList.length);
  wheels.name = 'Barrage · volants à cinq branches';
  wheels.receiveShadow = true;
  wheels.userData.noWorldShadow = true;
  root.add(wheels);
  rod([44.52, y + .59, z + .55], [52.17, y + .59, z + .55], .149, 'paint');
  for (const edge of [44.56, 52.15]) cylinder([edge, y + .59, z + .55], .201, .145, 'edge', [0, 0, Math.PI / 2]);
  for (const x of xList) {
    const at = (dx, dy, dz) => [x + dx, y + dy, z + dz];
    rounded(kit, [1.10, .24, .79], at(0, .12, .16), .06, 'concrete');
    for (const side of [-1, 1]) {
      cylinder(at(side * .39, .269, .39), .057, .052, 'edge');
      cylinder(at(side * .39, .269, -.095), .057, .052, 'edge');
    }
    cylinder(at(0, .49, 0), .257, .49, 'paint');
    cylinder(at(0, .34, 0), .306, .133, 'edge');
    cylinder(at(0, .706, 0), .307, .121, 'edge');
    cylinder(at(0, .814, 0), .188, .112, 'paint');
    for (let bolt = 0; bolt < (low ? 4 : 6); bolt++) {
      const a = bolt * Math.PI * 2 / (low ? 4 : 6);
      cylinder(at(Math.cos(a) * .256, .783, Math.sin(a) * .256), .041, .072, 'white');
    }
    rod(at(0, .84, 0), at(0, 1.34, 0), .080, 'steel');
    for (const dx of [-.193, .193]) rod(at(dx, .755, 0), at(dx * .84, 1.24, 0), .041);
    box(at(0, 1.237, 0), [.37, .089, .127], 'edge');
    rod(at(0, .59, .19), at(0, .59, .59), .131, 'paint');
    cylinder(at(0, .59, .383), .195, .098, 'edge', [Math.PI / 2, 0, 0]);
    // Flush pressure dial on the approach side of the actuator.
    rod(at(.18, .74, -.10), at(.24, 1.06, -.29), .032, 'gold');
    cylinder(at(.24, 1.07, -.29), .126, .079, 'dark', [Math.PI / 2, 0, 0]);
    cylinder(at(.24, 1.07, -.339), .099, .018, 'white', [Math.PI / 2, 0, 0]);
    ring(at(.24, 1.07, -.352), .104, .009, 'edge', [0, 0, 0]);
    rod(at(.24, 1.07, -.354), at(.282, 1.129, -.354), .009, 'paintRed');
  }
  let angle = 0, target = 0;
  function applyAngle() {
    for (const [i, x] of xList.entries()) {
      stamp.position.set(x, y + 1.41, z);
      stamp.rotation.y = angle + i * .61;
      stamp.updateMatrix();
      wheels.setMatrixAt(i, stamp.matrix);
    }
    wheels.instanceMatrix.needsUpdate = true;
  }
  applyAngle();
  wheels.computeBoundingSphere();
  return {
    setOpen(open) { target = open ? Math.PI * 1.45 : 0; },
    update(dt) {
      if (!(dt > 0) || Math.abs(angle - target) < .003) return;
      angle += (target - angle) * (1 - Math.exp(-dt * 2.15));
      applyAngle();
    },
    dispose() {
      wheels.removeFromParent();
      wheels.geometry.dispose();
      wheels.dispose();
    },
  };
}

function carryCase(kit, x, y, z, variant) {
  const at = (dx, dy, dz) => [x + dx, y + dy, z + dz];
  const { box, rod, cylinder } = kit;
  rounded(kit, [.66, .185, .42], at(0, .10, 0), .036, variant === 0 ? 'white' : 'paint');
  rounded(kit, [.665, .083, .425], at(0, .224, 0), .029, variant === 0 ? 'white' : 'edge');
  box(at(0, .187, 0), [.649, .015, .424], 'rubber');
  for (const dx of [-.233, .233]) {
    box(at(dx, .181, .216), [.057, .088, .025], 'edge');
    box(at(dx, .251, .141), [.062, .013, .124], 'dark');
    cylinder(at(dx, .189, -.211), .024, .074, 'edge', [0, 0, Math.PI / 2]);
  }
  for (const dx of [-.10, .10]) rod(at(dx, .134, .224), at(dx, .108, .283), .014);
  rod(at(-.10, .108, .283), at(.10, .108, .283), .023, 'rubber');
  if (variant === 0) {
    box(at(0, .27, -.06), [.123, .008, .033], 'paintRed');
    for (const dz of [-.100, -.020]) box(at(0, .27, dz), [.033, .008, .047], 'paintRed');
  }
}

export function addTriageEquipment(T, kit, x, y, z, kind) {
  const { box, rod, ring, cylinder, quad } = kit;
  const ox = x + 1.68, oz = z - 1.65;
  if (kind === 'TRIAGE') {
    const base = y + .05, height = 1.77;
    rod([ox, base, oz], [ox, y + height, oz], .027, 'edge', .019);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) rod([ox, base + .13, oz], [ox + dx * .16, base, oz + dz * .13], .020);
    rod([ox - .32, y + height, oz], [ox + .19, y + height, oz], .014);
    rod([ox - .28, y + height, oz], [ox - .28, y + 1.66, oz], .015);
    rounded(kit, [.153, .261, .070], [ox - .28, y + 1.535, oz], .031, 'coldglass');
    rounded(kit, [.130, .122, .064], [ox - .28, y + 1.465, oz + .006], .027, 'white');
    rod([ox - .28, y + 1.40, oz], [ox - .24, y + .98, oz + .02], .009, 'rubber');
    rod([ox - .24, y + .98, oz + .02], [ox - .55, y + .72, oz + .72], .008, 'rubber');
    const px = x - 1.71, pz = z - 1.55;
    cylinder([px, y + .42, pz], .110, .78, 'white');
    kit.add(new T.SphereGeometry(.11, 10, 6), 'white', [px, y + .798, pz], [0, 0, 0], [1, .65, 1]);
    cylinder([px, y + .899, pz], .035, .064, 'gold');
    ring([px, y + .634, pz], .110, .013, 'edge');
    box([px, y + .045, pz], [.249, .064, .245], 'rubber');
    carryCase(kit, x - .92, y, z + 1.23, 0);
  } else {
    carryCase(kit, x - 1.42, y, z + 1.27, kind === 'POSTE C' ? 1 : 0);
    // Folded linen on the far stretcher, with a real drop over its edge.
    const left = x + .87, right = x + 1.461;
    quad([left, y + .637, z - .67], [left, y + .642, z + .20],
      [right, y + .652, z + .23], [right, y + .637, z - .64], 'cloth');
    quad([right, y + .637, z - .64], [right, y + .652, z + .23],
      [right + .012, y + .514, z + .17], [right + .012, y + .49, z - .60], 'cloth');
  }
}
