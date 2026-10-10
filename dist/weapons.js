import * as T from './vendor/three.webgpu.min.js';
import { Assembly, bevelBox, profile, turned, matrix } from './geo.js';
import { createGlove } from './hands.js';

// Every weapon is modelled in one frame: the origin is the centre of its pistol grip (where the palm rests),
// -z is the barrel direction, +y is up. The gloved hand (hands.js) is built in the same frame, so any weapon
// sits in the hand by construction. `support` is where the free hand takes hold (null: a one-handed weapon).
export const WEAPON_FRAME = Object.freeze([
  Object.freeze({ id: 'r9', muzzle: Object.freeze([0, .077, -.207]), support: null, length: .27 }),
  Object.freeze({ id: 'bloom', muzzle: Object.freeze([0, .082, -.6]), support: Object.freeze([0, -.05, -.228]), length: .8 }),
  Object.freeze({ id: 'petal', muzzle: Object.freeze([0, .076, -.485]), support: Object.freeze([0, -.052, -.215]), length: .68 }),
  Object.freeze({ id: 'thorn', muzzle: Object.freeze([0, .108, -.85]), support: Object.freeze([0, -.05, -.34]), length: 1.05 }),
  Object.freeze({ id: 'nova', muzzle: Object.freeze([0, .11, -.655]), support: Object.freeze([0, -.058, -.29]), length: .9 })
]);

const PI = Math.PI;
const both = fn => [-1, 1].forEach(fn);
const torus = (r, tube, arc = PI * 2, radial = 6, tubular = 20) => new T.TorusGeometry(r, tube, radial, tubular, arc);
const disc = (r, seg = 16) => new T.CircleGeometry(r, seg);
// A shaft along z at height y: radius profile given as [radius, z] pairs.
const shaft = (a, mat, y, points, radial = 18, x = 0) => a.add(turned(points, radial), mat, matrix([x, y, 0]));
const ring = (a, mat, y, z, r, tube = .004, x = 0, shadow = true) => a.add(torus(r, tube, PI * 2, 6, 22), mat, matrix([x, y, z]), shadow);
const bolt = (a, m, x, y, z, s = .0034) => a.ball(m.steel, [x, y, z], [s, s, s]);
// Parallel vent slots (dark inset) on both flanks of a body.
const vents = (a, mat, x, y, z0, step, count, h = .02, w = .004) => both(s => { for (let i = 0; i < count; i++) a.box(mat, [.003, h, w], [s * x, y, z0 - i * step], [0, 0, 0], .0008); });
// A short picatinny rail: base plus cross teeth.
const rail = (a, m, y, z0, z1, width = .026) => {
  const length = z0 - z1, mid = (z0 + z1) / 2;
  a.box(m.steel, [width, .008, length], [0, y, mid], [0, 0, 0], .002);
  for (let z = z0 - .008; z > z1 + .004; z -= .0145) a.box(m.dark, [width + .002, .0045, .006], [0, y + .005, z], [0, 0, 0], .0006);
};

function pistolGrip(a, m, rear = 0) {
  // Slanted grip frame with an armoured panel, an energy-cell window and a base plate on each side.
  a.add(profile([[.026, .052], [.047 + rear, -.082], [.004 + rear, -.088], [-.014, .034]], .034, .004), m.dark);
  both(s => {
    a.box(m.armor, [.005, .092, .034], [s * .0185, -.018, .016 + rear * .5], [-.17, 0, 0], .0025);
    a.box(m.rose, [.0025, .05, .008], [s * .0212, -.03, .02 + rear * .6], [-.17, 0, 0], .001, false);
  });
  a.box(m.steel, [.042, .012, .058], [0, -.089, .026 + rear], [-.17, 0, 0], .004);
  a.box(m.dark, [.01, .01, .012], [0, -.094, .05 + rear], [0, 0, 0], .003);
}

function triggerGroup(a, m, y = .03) {
  a.add(torus(.022, .0038, PI, 6, 16), m.dark, matrix([0, y + .018, -.038], [0, PI / 2, PI]));
  a.box(m.steel, [.008, .024, .008], [0, y + .002, -.03], [.28, 0, 0], .003);
}

// A foregrip with the same shape as the pistol grip: the free hand is the pistol hand, mirrored.
function foregrip(a, m, z, y, ornament = true) {
  a.add(profile([[z + .026, y + .052], [z + .03, y - .082], [z - .012, y - .086], [z - .026, y + .052]], .032, .004), m.dark);
  if (ornament) {
    a.box(m.steel, [.038, .012, .05], [0, y - .088, z + .008], [0, 0, 0], .004);
    both(s => a.box(m.armor, [.004, .09, .034], [s * .0175, y - .016, z], [0, 0, 0], .002));
  }
}

// ---------------------------------------------------------------- R–9
function buildR9(m) {
  const a = new Assembly();
  pistolGrip(a, m); triggerGroup(a, m);
  // Frame under the slide with a rail, a lens and a light below the muzzle.
  a.box(m.dark, [.03, .03, .15], [0, .046, -.082], [0, 0, 0], .006);
  a.box(m.steel, [.036, .008, .09], [0, .033, -.1], [0, 0, 0], .003);
  a.box(m.rose, [.012, .004, .07], [0, .03, -.1], [0, 0, 0], .001, false);
  a.box(m.dark, [.024, .02, .034], [0, .036, -.172], [0, 0, 0], .004);
  a.add(disc(.0075), m.pale, matrix([0, .036, -.1895], [0, PI, 0]), false);
  // Slide: chamfered profile, rose top light, vents, serrations and an ejection port.
  a.add(profile([[.048, .088], [.052, .072], [.046, .058], [-.172, .058], [-.18, .068], [-.17, .094], [.03, .095]], .036, .004), m.armorLight);
  a.box(m.rose, [.011, .0035, .2], [0, .097, -.062], [0, 0, 0], .001, false);
  both(s => {
    for (let i = 0; i < 4; i++) a.box(m.rose, [.002, .016, .0045], [s * .0183, .076, -.04 - i * .016], [0, 0, 0], .0008, false);
    for (let i = 0; i < 6; i++) a.box(m.dark, [.002, .026, .0035], [s * .0185, .075, .018 + i * .0062], [0, 0, 0], .0008);
    a.box(m.dark, [.002, .006, .08], [s * .0185, .063, -.09], [0, 0, 0], .001);
  });
  a.box(m.dark, [.0022, .018, .04], [.0184, .08, -.012], [0, 0, 0], .002);
  bolt(a, m, .0185, .088, .036, .003); bolt(a, m, -.0185, .088, .036, .003);
  // Sights and muzzle emitter.
  a.box(m.dark, [.006, .01, .014], [0, .102, -.158], [0, 0, 0], .002); a.box(m.pale, [.0025, .003, .003], [0, .1075, -.158], [0, 0, 0], .0005, false);
  both(s => a.box(m.dark, [.006, .01, .012], [s * .01, .1, .038], [0, 0, 0], .002));
  shaft(a, m.steel, .077, [[0, -.168], [.0125, -.168], [.0125, -.19], [.0095, -.207], [0, -.207]], 14);
  ring(a, m.rose, .077, -.198, .0105, .003, 0, false);
  return a;
}

// ---------------------------------------------------------------- BLOOM
function buildBloom(m) {
  const a = new Assembly();
  pistolGrip(a, m); triggerGroup(a, m);
  // Receiver with side inserts, a toothed top rail and an optic.
  a.add(profile([[.09, .118], [.095, .06], [.06, .044], [-.21, .044], [-.225, .062], [-.225, .118]], .046, .005), m.armorLight);
  both(s => { a.box(m.dark, [.003, .04, .13], [s * .0238, .086, -.07], [0, 0, 0], .0015); a.box(m.rose, [.0025, .004, .1], [s * .0242, .072, -.07], [0, 0, 0], .0008, false); });
  rail(a, m, .1245, .08, -.2, .028);
  a.box(m.dark, [.034, .03, .05], [0, .143, -.01], [0, 0, 0], .007);
  shaft(a, m.dark, .152, [[0, -.036], [.021, -.036], [.021, -.0], [.0, 0.0]], 18);
  a.add(disc(.0175), m.cyan, matrix([0, .152, -.0365], [0, PI, 0]), false);
  // Ribbed handguard with a half shell on top and glowing flutes.
  a.box(m.dark, [.062, .062, .31], [0, .084, -.38], [0, 0, 0], .01);
  a.box(m.armorLight, [.066, .024, .28], [0, .108, -.38], [0, 0, 0], .009);
  both(s => { for (let i = 0; i < 6; i++) a.box(m.armor, [.003, .03, .01], [s * .0325, .084, -.27 - i * .045], [0, 0, 0], .001); a.box(m.rose, [.003, .004, .26], [s * .0325, .06, -.38], [0, 0, 0], .001, false); });
  rail(a, m, .1195, -.235, -.5, .02);
  // Barrel with a petal-shaped muzzle brake.
  a.limb(m.steel, [0, .084, -.535], [0, .084, -.585], .013, .011);
  shaft(a, m.dark, .084, [[0, -.535], [.022, -.535], [.022, -.56], [.016, -.6], [0, -.6]], 14);
  for (let i = 0; i < 3; i++) { const t = i / 3 * PI * 2 + PI / 6; a.box(m.armor, [.006, .026, .05], [Math.cos(t) * .022, .084 + Math.sin(t) * .022, -.575], [0, 0, t + PI / 2], .002); }
  ring(a, m.rose, .084, -.6, .0165, .003, 0, false);
  // Curved energy-cell magazine, foregrip and a slim stock.
  a.add(profile([[-.07, .044], [-.084, -.06], [-.052, -.125], [.0, -.128], [.0, .044]], .036, .004), m.steel);
  a.box(m.dark, [.04, .012, .06], [-.0, -.13, -.026], [0, 0, 0], .004);
  both(s => a.box(m.cyan, [.0025, .07, .01], [s * .0188, -.045, -.04], [-.1, 0, 0], .001, false));
  foregrip(a, m, -.228, -.05);
  a.add(profile([[.09, .108], [.13, .1], [.135, .035], [.09, .045]], .034, .005), m.dark);
  a.add(profile([[.128, .105], [.142, -.006], [.12, -.012], [.115, .1]], .042, .006), m.armor);
  a.box(m.rose, [.003, .06, .004], [.0, .06, .1425], [0, 0, 0], .001, false);
  return a;
}

// ---------------------------------------------------------------- PETAL
function buildPetal(m) {
  const a = new Assembly();
  pistolGrip(a, m); triggerGroup(a, m);
  // Chunky receiver with round side caps.
  a.add(profile([[.085, .11], [.09, .058], [.05, .042], [-.15, .042], [-.17, .056], [-.18, .112]], .072, .009), m.armorLight);
  both(s => {
    a.add(new T.CylinderGeometry(.034, .034, .008, 20), m.steel, matrix([s * .0385, .08, -.03], [0, 0, PI / 2]));
    a.add(new T.CylinderGeometry(.021, .021, .0095, 18), m.rose, matrix([s * .0392, .08, -.03], [0, 0, PI / 2]), false);
    for (let i = 0; i < 4; i++) bolt(a, m, s * .0395, .08 + Math.cos(i * PI / 2) * .028, -.03 + Math.sin(i * PI / 2) * .028);
  });
  // Plasma tank above the barrel: banded, with a glowing violet slit.
  shaft(a, m.dark, .142, [[0, .04], [.03, .04], [.034, .0], [.034, -.2], [.03, -.24], [0, -.24]], 20);
  [.02, -.05, -.12, -.19].forEach(z => ring(a, m.steel, .142, z, .0355, .0045));
  both(s => a.box(m.violet, [.003, .018, .15], [s * .0345, .142, -.1], [0, 0, 0], .001, false));
  a.box(m.dark, [.03, .028, .05], [0, .12, -.02], [0, 0, 0], .005);
  // Barrel shroud with petal fins and a muzzle flower of seven emitters.
  shaft(a, m.dark, .076, [[0, -.17], [.05, -.17], [.052, -.2], [.05, -.42], [0, -.42]], 22);
  for (let i = 0; i < 6; i++) {
    const t = i / 6 * PI * 2;
    a.box(m.armor, [.01, .034, .17], [Math.cos(t) * .056, .076 + Math.sin(t) * .056, -.32], [0, 0, t], .003);
    a.box(m.rose, [.004, .016, .15], [Math.cos(t) * .0605, .076 + Math.sin(t) * .0605, -.32], [0, 0, t], .001, false);
  }
  shaft(a, m.dark, .076, [[0, -.41], [.058, -.41], [.058, -.46], [.05, -.478], [0, -.478]], 24);
  ring(a, m.armor, .076, -.47, .054, .0065, 0);
  shaft(a, m.rose, .076, [[0, -.462], [.013, -.462], [.013, -.488], [0, -.488]], 12);
  for (let i = 0; i < 6; i++) {
    const t = i / 6 * PI * 2, x = Math.cos(t) * .031, y = .076 + Math.sin(t) * .031;
    shaft(a, m.violet, y, [[0, -.462], [.0095, -.462], [.0095, -.485], [0, -.485]], 10, x);
    shaft(a, m.steel, y, [[0, -.44], [.0125, -.44], [.0125, -.463], [0, -.463]], 10, x);
  }
  // Pump forend and a short stock.
  a.box(m.dark, [.076, .056, .15], [0, .02, -.215], [0, 0, 0], .014);
  a.box(m.armor, [.082, .02, .13], [0, -.012, -.215], [0, 0, 0], .008);
  for (let i = 0; i < 5; i++) a.box(m.rose, [.084, .004, .005], [0, .034, -.165 - i * .02], [0, 0, 0], .001, false);
  foregrip(a, m, -.215, -.052, false);
  a.add(profile([[.09, .105], [.12, .1], [.13, .035], [.09, .04]], .05, .007), m.dark);
  a.add(profile([[.125, .1], [.138, -.04], [.112, -.045], [.108, .1]], .062, .008), m.armor);
  return a;
}

// ---------------------------------------------------------------- THORN
function buildThorn(m) {
  const a = new Assembly();
  pistolGrip(a, m); triggerGroup(a, m);
  // Receiver with rear heat-sink fins.
  a.add(profile([[.095, .126], [.1, .06], [.05, .042], [-.2, .042], [-.23, .06], [-.25, .126]], .056, .006), m.armorLight);
  for (let i = 0; i < 5; i++) a.box(m.steel, [.05, .036, .004], [0, .142, .07 - i * .014], [0, 0, 0], .001);
  both(s => a.box(m.dark, [.003, .05, .12], [s * .0285, .09, -.06], [0, 0, 0], .0015));
  // Twin rails with glowing inner faces, joined by clamp blocks and flanked by capacitor housings.
  both(s => {
    a.box(m.steel, [.014, .032, .62], [s * .026, .11, -.54], [0, 0, 0], .004);
    a.box(m.armor, [.006, .016, .62], [s * .0345, .11, -.54], [0, 0, 0], .002);
    a.box(m.violet, [.0025, .008, .56], [s * .0185, .114, -.55], [0, 0, 0], .0008, false);
  });
  a.box(m.dark, [.04, .012, .66], [0, .098, -.52], [0, 0, 0], .003);
  [-.34, -.52, -.7].forEach((z, i) => {
    a.box(m.steel, [.082, .014, .03], [0, .13, z], [0, 0, 0], .004);
    both(s => { a.box(m.armor, [.03, .056, .09], [s * .058, .11, z], [0, 0, 0], .008); a.box(m.violet, [.0025, .03, .05], [s * .0735, .11, z], [0, 0, 0], .001, false); bolt(a, m, s * .0735, .134, z - .035); bolt(a, m, s * .0735, .134, z + .035); });
  });
  // Charge coil behind the rails and a tapered muzzle.
  shaft(a, m.dark, .11, [[0, -.05], [.034, -.05], [.034, -.22], [0, -.22]], 20);
  for (let i = 0; i < 5; i++) ring(a, m.violet, .11, -.075 - i * .03, .0355, .0025, 0, false);
  a.ball(m.violet, [0, .11, -.135], [.02, .02, .02], false);
  both(s => a.add(profile([[-.82, .122], [-.86, .113], [-.82, .1]], .014, .002), m.steel, matrix([s * .026, 0, 0])));
  a.add(disc(.012, 12), m.violet, matrix([0, .11, -.855], [0, PI, 0]), false);
  // Handguard below the rails, foregrip and long battery stock.
  a.box(m.dark, [.052, .05, .28], [0, .058, -.4], [0, 0, 0], .01);
  both(s => a.box(m.violet, [.003, .004, .24], [s * .0265, .04, -.4], [0, 0, 0], .001, false));
  foregrip(a, m, -.34, -.05);
  a.box(m.dark, [.05, .07, .16], [0, -.005, -.11], [0, 0, 0], .012);
  a.add(profile([[.1, .124], [.14, .12], [.16, .09], [.165, .02], [.1, .045]], .05, .007), m.dark);
  a.add(profile([[.155, .1], [.17, -.05], [.135, -.055], [.13, .1]], .06, .007), m.armor);
  both(s => a.box(m.violet, [.0025, .09, .004], [s * .0305, .03, .15], [0, 0, 0], .001, false));
  return a;
}

// ---------------------------------------------------------------- NOVA
function buildNova(m) {
  const a = new Assembly();
  pistolGrip(a, m, .004); triggerGroup(a, m);
  // Heavy armoured shell with angled wings.
  a.add(profile([[.095, .13], [.1, .05], [.04, .036], [-.3, .036], [-.34, .06], [-.34, .14]], .1, .011), m.armorLight);
  both(s => {
    a.box(m.armor, [.014, .1, .4], [s * .063, .09, -.15], [0, 0, s * .14], .006);
    a.box(m.steel, [.01, .05, .3], [s * .076, .075, -.17], [0, 0, 0], .004);
    a.box(m.rose, [.003, .02, .24], [s * .0815, .075, -.17], [0, 0, 0], .001, false);
    for (let i = 0; i < 5; i++) a.box(m.dark, [.003, .05, .008], [s * .0698, .09, -.04 - i * .055], [0, 0, s * .14], .001);
  });
  a.box(m.dark, [.09, .03, .46], [0, .148, -.12], [0, 0, 0], .01);
  // Caged energy core: glowing sphere, braced by rings and ribs.
  a.ball(m.rose, [0, .148, -.205], [.034, .034, .034], false);
  [-.17, -.205, -.24].forEach((z, i) => ring(a, m.steel, .148, z, .046 - Math.abs(i - 1) * .008, .005));
  for (let i = 0; i < 6; i++) { const t = i / 6 * PI * 2; a.box(m.steel, [.006, .006, .09], [Math.cos(t) * .045, .148 + Math.sin(t) * .045, -.205], [0, 0, t], .002); }
  // Long emitter that flares into a ringed muzzle.
  shaft(a, m.dark, .11, [[0, -.3], [.05, -.3], [.052, -.4], [.062, -.52], [.078, -.62], [.074, -.645], [.05, -.63], [0, -.63]], 24);
  [-.36, -.42, -.48].forEach(z => ring(a, m.steel, .11, z, .055, .005));
  ring(a, m.armor, .11, -.635, .0765, .0085);
  ring(a, m.rose, .11, -.645, .062, .0045, 0, false);
  shaft(a, m.rose, .11, [[0, -.628], [.05, -.628], [.05, -.634], [0, -.634]], 22);
  // Handles: thick foregrip, carry handle and shoulder pad.
  foregrip(a, m, -.29, -.058);
  a.add(profile([[.095, .13], [.14, .125], [.17, .09], [.18, -.02], [.09, .0]], .08, .009), m.dark);
  a.add(profile([[.185, .1], [.192, -.06], [.15, -.065], [.145, .1]], .1, .009), m.armor);
  both(s => a.box(m.steel, [.012, .07, .014], [s * .026, .205, -.02], [0, 0, 0], .003)); a.box(m.steel, [.064, .014, .1], [0, .24, -.02], [0, 0, 0], .005);
  a.box(m.rose, [.012, .004, .09], [0, .248, -.02], [0, 0, 0], .001, false);
  return a;
}

const BUILDERS = [buildR9, buildBloom, buildPetal, buildThorn, buildNova];

// One group per weapon, merged into a handful of meshes each (a few draw calls instead of dozens). The geometry is
// built once per material set and shared by every gun in the scene.
const prototypes = new WeakMap();
export function createWeaponModels(mats) {
  if (!prototypes.has(mats)) {
    prototypes.set(mats, BUILDERS.map((build, index) => {
      const group = new T.Group(); build(mats).build(group);
      group.userData.frame = WEAPON_FRAME[index];
      return group;
    }));
  }
  return prototypes.get(mats).map(group => group.clone());
}

// The weapon in the right hand: every model is drawn around the grip (the palm), so the glove holds it by
// construction. Heavy weapons add a second glove on the foregrip. `makeFlash(parent)` supplies the muzzle glow.
export function buildGun({ mats, gloves, sleeve = true, makeFlash }) {
  const g = new T.Group(), models = createWeaponModels(mats);
  for (const model of models) { model.visible = false; g.add(model); }
  const hand = createGlove(gloves, { sleeve }), support = createGlove(gloves, { mirror: true, sleeve, forearm: [.5, -.55, .66] });
  support.visible = false; g.add(hand, support);
  const flash = makeFlash(g); flash.visible = false;
  Object.assign(g.userData, { flash, hand, support, showSupport: true });
  g.userData.setLevel = level => { hand.userData.setLevel(level); support.userData.setLevel(level); };
  g.userData.setVariant = index => {
    models.forEach((model, i) => model.visible = i === index);
    const frame = WEAPON_FRAME[index];
    flash.position.set(...frame.muzzle); flash.scale.setScalar(index >= 3 ? 1 : .6);
    support.visible = g.userData.showSupport && !!frame.support; if (frame.support) support.position.set(...frame.support);
    g.userData.index = index;
  };
  g.userData.setVariant(0); g.userData.setLevel(1);
  return g;
}
