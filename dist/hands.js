import * as T from './vendor/three.webgpu.min.js';
import { Assembly, bevelBox, limb, ball, matrix, along } from './geo.js';

// A gloved right hand closed around a pistol grip, modelled in the weapon's own frame: the origin is the centre
// of the grip, -z points down the barrel, +y is up. A left hand is the same model mirrored. The palm rests on the
// back strap and right panel, three fingers wrap the front strap and end on the left panel, the index lies on the
// trigger and the thumb runs forward along the left panel, exactly where a real hand holds a handgun.
export const GRIP = Object.freeze({ halfWidth: .018, halfDepth: .0235, wrist: [.03, .052, .098], forearm: [.1, -.3, .95] });

const digitShapes = new Map(), digitTip = new T.SphereGeometry(1, 10, 8);
function articulatedDigit(parent, m, id, joints, radius) {
  let geometry = digitShapes.get(id);
  if (!geometry) {
    const base = joints[0], points = joints.map(([x,y,z]) => new T.Vector3(x-base[0],y-base[1],z-base[2]));
    geometry = new T.TubeGeometry(new T.CatmullRomCurve3(points), 14, radius, 8, false); digitShapes.set(id, geometry);
  }
  const pivot = new T.Group(); pivot.position.set(...joints[0]); parent.add(pivot);
  const mesh = new T.Mesh(geometry, m.fabric), tip = new T.Mesh(digitTip, m.fabric);
  mesh.castShadow = tip.castShadow = true; mesh.receiveShadow = tip.receiveShadow = true;
  const end = joints[joints.length-1], base = joints[0];
  tip.position.set(end[0]-base[0],end[1]-base[1],end[2]-base[2]); tip.scale.setScalar(radius);
  pivot.add(mesh,tip); return pivot;
}

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
  // The fingers are separate pivots so the trigger finger, grip and reload gesture can move independently.
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
  const stack = [.026, 0, -.0265, -.053], digits = [];
  [[1,1],[2,.95],[3,.84]].forEach(([k,size],i)=>digits.push(articulatedDigit(group,m,`grip-${i}`,
    [[.03,stack[k],-.01],[.022,stack[k],-.0345],[-.021,stack[k],-.0345],[-.0285,stack[k],-.009]],.0108*size)));
  digits.push(articulatedDigit(group,m,'index',[[.03,.047,-.011],[.026,.045,-.043],[.014,.038,-.055],[.001,.032,-.047]],.0098));
  digits.push(articulatedDigit(group,m,'thumb',[[.022,.05,.028],[-.002,.056,.026],[-.024,.054,.004],[-.0275,.052,-.026],[-.0265,.05,-.05]],.0115));
  const sign=mirror?-1:1, pose={trigger:0,grip:0,reload:0};
  group.userData.animate = ({trigger=0,grip=0,reload=0}={},dt=.016,handedness=1) => {
    const blend=1-Math.exp(-Math.max(0,dt)*24);
    for(const key of ['trigger','grip','reload'])pose[key]+=(Math.max(0,Math.min(1,Number({trigger,grip,reload}[key])||0))-pose[key])*blend;
    const {trigger:t,grip:g,reload:r}=pose;
    const curlSign=sign*handedness;
    digits[0].rotation.x=-curlSign*(.06+g*.2+r*.13);digits[1].rotation.x=-curlSign*(.06+g*.2+r*.13);digits[2].rotation.x=-curlSign*(.06+g*.2+r*.13);
    digits[3].rotation.x=-curlSign*(.05+t*.48+r*.2);digits[4].rotation.x=curlSign*(.04+g*.12+r*.26);
    group.rotation.z=curlSign*r*.12;group.position.set(0,r*.018,-r*.03);
  };
  if (mirror) group.scale.x = -1;
  return group;
}
