import * as T from './vendor/three.webgpu.min.js';
import { Assembly, bevelBox, limb, ball, matrix, along } from './geo.js';

// A gloved right hand closed around a pistol grip, modelled in the weapon's own frame: the origin is the centre
// of the grip, -z points down the barrel, +y is up. A left hand is the same model mirrored. The palm rests on the
// back strap and right panel, three fingers wrap the front strap and end on the left panel, the index lies on the
// trigger and the thumb runs forward along the left panel, exactly where a real hand holds a handgun.
export const GRIP = Object.freeze({ halfWidth: .018, halfDepth: .0235, wrist: [.03, .052, .098], forearm: [.1, -.3, .95] });

const finger = (builder, m, joints, radii, level = 1) => {
  joints.forEach((point, i) => builder.ball(m.fabric, point, [radii[i], radii[i], radii[i]], true, level));
  for (let i = 0; i < joints.length - 1; i++) builder.limb(m.fabric, joints[i], joints[i + 1], radii[i], radii[i + 1], true, level);
};

// materials: { fabric, plate, trim, glow, accent, metal }
export function createGloveAssembly(m, { sleeve = true, forearm = GRIP.forearm } = {}) {
  const a = new Assembly();
  const stack = [.026, 0, -.0265, -.053];
  // Palm heel against the back strap, side of the palm on the right panel, back of the hand running to the wrist.
  a.box(m.fabric, [.052, .078, .032], [.006, -.01, .037], [0, 0, 0], .011);
  a.box(m.fabric, [.03, .112, .05], [.032, -.004, .003], [0, 0, 0], .012);
  a.box(m.fabric, [.036, .09, .082], [.047, .015, .048], [0, -.1, .18], .013);
  a.box(m.fabric, [.03, .05, .06], [.037, .042, .082], [.25, -.05, .12], .012);
  // Knuckle guards over the four knuckles and a rigid plate on the back of the hand.
  [.045, .02, -.006, -.032].forEach(y => { a.box(m.plate, [.011, .022, .028], [.0455, y, -.012], [0, 0, 0], .0045); a.box(m.trim, [.004, .012, .018], [.0505, y, -.012], [0, 0, 0], .0015); });
  a.box(m.plate, [.012, .082, .056], [.066, .016, .042], [0, -.06, .1], .005);
  a.box(m.trim, [.006, .07, .02], [.07, .014, .05], [0, -.06, .1], .002);
  a.box(m.glow, [.003, .055, .006], [.0725, .014, .0305], [0, -.06, .1], .001, false);
  // Middle, ring and little finger wrap the front strap from the right panel to the left panel.
  [[1, 1], [2, .95], [3, .84]].forEach(([k, size]) => {
    const y = stack[k], s = size;
    finger(a, m, [[.03, y, -.01], [.022, y, -.0345], [-.021, y, -.0345], [-.0285, y, -.009]], [.0112 * s, .0104 * s, .0098 * s, .0088 * s]);
    a.ball(m.plate, [-.0285, y, -.009], [.0095 * s, .0095 * s, .0095 * s]);
  });
  // Index finger lies on the trigger.
  finger(a, m, [[.03, .047, -.011], [.026, .045, -.043], [.014, .038, -.055], [.001, .032, -.047]], [.0108, .0098, .0092, .0086]);
  // Thumb crosses the back strap and lies forward along the left panel.
  finger(a, m, [[.022, .05, .028], [-.002, .056, .026], [-.024, .054, .004], [-.0275, .052, -.026], [-.0265, .05, -.05]], [.0135, .0125, .0115, .0105, .0095]);
  if (sleeve) {
    const [wx, wy, wz] = GRIP.wrist, d = forearm, k = Math.hypot(...d);
    const at = t => [wx + d[0] / k * t, wy + d[1] / k * t, wz + d[2] / k * t];
    // Cuff, then a tapered sleeve with armoured plates. Plates appear with the gauntlet level.
    a.limb(m.fabric, at(-.012), at(.24), .027, .036);
    a.add(new T.TorusGeometry(.03, .0065, 8, 22), m.trim, along(at(.01), d), true);
    a.add(new T.TorusGeometry(.0335, .004, 6, 22), m.glow, along(at(.028), d), false);
    a.add(bevelBox(.052, .016, .13, .006), m.plate, along([wx + d[0] / k * .12, wy + d[1] / k * .12 + .026, wz + d[2] / k * .12], d), true, 4);
    a.add(bevelBox(.04, .012, .09, .005), m.trim, along([wx + d[0] / k * .12, wy + d[1] / k * .12 + .036, wz + d[2] / k * .12], d), true, 4);
    a.add(bevelBox(.025, .005, .055, .002), m.accent, along([wx + d[0] / k * .125, wy + d[1] / k * .125 + .0425, wz + d[2] / k * .125], d), false, 4);
    a.add(bevelBox(.062, .01, .03, .004), m.metal, along(at(.2), d), true, 8);
  }
  return a;
}

// A ready-to-use glove group at the origin of its weapon. `mirror` makes the left hand.
export function createGlove(m, { mirror = false, sleeve = true, forearm } = {}) {
  const group = new T.Group(), assembly = createGloveAssembly(m, { sleeve, forearm });
  assembly.mount(group); group.userData.setLevel = level => assembly.setLevel(level); group.userData.assembly = assembly;
  if (mirror) group.scale.x = -1;
  return group;
}
