import * as T from './vendor/three.webgpu.min.js';
import { Assembly, bevelBox, profile, turned, matrix } from './geo.js';
import { createGlove } from './hands.js';
import { createEnergyBlade } from './energy-blade.js';
import { installKenneyBlasters } from './kenney-blasters.js';
import {createM12Shotgun,M12_FRAME,M12_HOLD} from './m12-shotgun.js';

// Every weapon is modelled in one frame: the origin is the centre of its pistol grip (where the palm rests),
// -z is the barrel direction, +y is up. The gloved hand (hands.js) is built in the same frame, so any weapon
// sits in the hand by construction. `support` is where the free hand takes hold (null: a one-handed weapon).
export const WEAPON_FRAME = Object.freeze([
  Object.freeze({ id: 'r9', muzzle: Object.freeze([0, .077, -.207]), support: null, length: .27 }),
  Object.freeze({ id: 'bloom', muzzle: Object.freeze([0, .082, -.6]), support: Object.freeze([0, -.05, -.228]), length: .8 }),
  Object.freeze({ id: 'lance', muzzle: Object.freeze([0, .085, -.88]), support: Object.freeze([0, -.052, -.30]), length: 1.10 }),
  Object.freeze({ id: 'thorn', muzzle: Object.freeze([0, .108, -.85]), support: Object.freeze([0, -.05, -.34]), length: 1.05 }),
  Object.freeze({ id: 'nova', muzzle: Object.freeze([0, .11, -.655]), support: Object.freeze([0, -.058, -.29]), length: .9 }),
  Object.freeze({ id:'aurora',muzzle:Object.freeze([0,.14,0]),support:null,length:1.22,melee:true }),
  M12_FRAME,
  Object.freeze({id:'duor9',muzzle:Object.freeze([0,.077,-.207]),support:Object.freeze([-.44,0,0]),length:.27,dual:true})
]);
// The Kenney blasters are placed by their muzzle, so their own pistol grips are not at the origin, and they are
// toy-wide (grips 4.3 to 7.2 cm across). `slim` narrows each one (x only) to a 3.6 cm grip, which the glove's
// fingers close round with their tips on its left face.
// Measured on the meshes (weapon frame, metres): `palm` puts the index in the trigger guard, the fingers round
// the front of the grip and the palm on its right face; `rake` tilts the hand like the grip; `support` closes the
// free hand on the front of the magazine (or of the block under the barrel).
export const KENNEY_HOLD = Object.freeze([
  // X offsets put the palm OUTSIDE the grip's right flank, not through its
  // centreline; the index curls inward around the real GLB trigger guard.
  { slim: .78, palm: [.026, -.068, 0], rake: -.26, support: null },
  { slim: .56, palm: [.027, -.135, -.064], rake: -.3, support: [-.036, -.146, -.325] },
  { slim: .5, palm: [.027, -.135, -.284], rake: -.3, support: [-.032, -.165, -.54] },
  { slim: .84, palm: [.028, -.025, -.149], rake: -.3, support: [-.038, -.09, -.342] },
  { slim: .64, palm: [.027, -.069, -.079], rake: -.3, support: [-.039, -.12, -.349] }
].map(hold => Object.freeze({ ...hold, palm: Object.freeze(hold.palm), support: hold.support && Object.freeze(hold.support) })));
// Forearm directions in the weapon frame: down, back and outward, towards each elbow. The eye is above and behind
// the hands, so the open end of a cuff faces away from it.
const KENNEY_CUFF = Object.freeze([.28, -.72, .62]), KENNEY_SUPPORT_CUFF = Object.freeze([-.22, -.88, .42]);

const PI = Math.PI;
export const OPTICS = Object.freeze({
  bloom:Object.freeze({y:.178,z:-.032,radius:.018,magnification:2}),
  lance:Object.freeze({y:.180,z:-.023,radius:.019,magnification:4}),
  // The M12's receiver hides the shooting hand from the eye: at the hip it sits lower and turns slightly outwards.
  m12:Object.freeze({y:.177,z:-.165,radius:.018,magnification:1.15,eyeRelief:.62,iron:true,hip:Object.freeze({x:.03,y:-.05,yaw:-.13,roll:.08})})
});
const opticGlassGeometry=new T.CircleGeometry(1,32),opticDotGeometry=new T.CircleGeometry(.00075,16);
const opticRingGeometry=new T.RingGeometry(.0068,.0074,32);
function attachOptic(model,index) {
  const source=OPTICS[WEAPON_FRAME[index].id];if(!source||source.iron)return null;const cfg={...source};
  const glassMaterial=new T.MeshPhysicalMaterial({color:0x8ec4d5,metalness:.1,roughness:.12,transparent:true,opacity:.07,side:T.DoubleSide,depthWrite:false});
  const glass=new T.Mesh(opticGlassGeometry,glassMaterial);glass.scale.setScalar(cfg.radius);glass.position.set(0,cfg.y,cfg.z);model.add(glass);
  const reticle=new T.Group(),material=new T.MeshBasicMaterial({color:0xff655c,toneMapped:false,side:T.DoubleSide});
  const dot=new T.Mesh(opticDotGeometry,material);reticle.add(dot);
  if(index===1)reticle.add(new T.Mesh(opticRingGeometry,material));
  let hairMaterial=null;
  if(index===2){const lines=[];for(const s of [-1,1]){lines.push(s*.0025,0,0,s*.016,0,0,0,s*.0025,0,0,s*.016,0);for(let j=1;j<=3;j++){const p=s*j*.004;lines.push(p,-.001,0,p,.001,0,-.001,p,0,.001,p,0);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lines,3));hairMaterial=new T.LineBasicMaterial({color:0xe6b18b,toneMapped:false});reticle.add(new T.LineSegments(geo,hairMaterial));}
  reticle.visible=false;model.add(reticle);
  return {cfg,reticle,glass,glassMaterial,material,hairMaterial,eyeDistance:0};
}
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
  a.box(m.dark,[.038,.02,.045],[0,.142,-.047],[0,0,0],.004);
  ring(a,m.dark,.178,-.034,.023,.004);
  ring(a,m.steel,.178,-.052,.022,.002);
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

// ---------------------------------------------------------------- LANCE
function buildLance(m) {
  const a=new Assembly();pistolGrip(a,m);triggerGroup(a,m);
  a.add(profile([[.11,.12],[.12,.05],[.04,.041],[-.29,.041],[-.33,.070],[-.30,.12]],.052,.005),m.armorLight);
  both(sign=>{
    a.box(m.dark,[.004,.042,.25],[sign*.027,.082,-.12],[0,0,0],.002);
    a.box(m.rose,[.003,.005,.20],[sign*.030,.077,-.11],[0,0,0],.001,false);
  });
  rail(a,m,.127,.10,-.28,.024);
  // Open optical housing, a long single emitter and a compact recoil stock.
  shaft(a,m.dark,.18,[[.020,-.025],[.028,-.025],[.030,-.22],[.024,-.245],[.020,-.245],[.020,-.025]],24);
  [-.036,-.11,-.22].forEach(z=>ring(a,m.steel,.18,z,.030,.004));
  a.box(m.dark,[.022,.032,.052],[0,.145,-.12],[0,0,0],.004);
  a.box(m.dark,[.056,.053,.27],[0,.083,-.40],[0,0,0],.008);
  both(sign=>{
    a.box(m.armor,[.005,.04,.24],[sign*.031,.09,-.41],[0,0,0],.002);
    a.box(m.rose,[.003,.004,.23],[sign*.034,.075,-.41],[0,0,0],.001,false);
  });
  shaft(a,m.steel,.085,[[0,-.53],[.013,-.53],[.013,-.805],[.010,-.88],[0,-.88]],18);
  for(let i=0;i<7;i++)ring(a,m.dark,.085,-.56-i*.035,.017,.004);
  shaft(a,m.dark,.085,[[.008,-.803],[.024,-.803],[.021,-.875],[.008,-.88],[.008,-.803]],20);
  ring(a,m.rose,.085,-.878,.016,.003,0,false);
  a.add(profile([[-.10,.04],[-.11,-.071],[-.042,-.073],[-.044,.04]],.036,.004),m.steel);
  foregrip(a,m,-.30,-.052);
  a.add(profile([[.12,.105],[.15,.105],[.172,.08],[.177,-.02],[.14,-.021],[.13,.04]],.047,.005),m.dark);
  a.box(m.armor,[.052,.12,.031],[0,.036,.174],[.1,0,0],.006);
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

function buildAurora(m){
  const a=new Assembly();
  a.limb(m.dark,[0,-.115,0],[0,.13,0],.023,.026);
  a.limb(m.steel,[0,-.108,0],[0,-.084,0],.030,.030);
  a.limb(m.armorLight,[0,.078,0],[0,.137,0],.035,.029);
  for(let i=0;i<6;i++)a.add(torus(.025,.0025,PI*2,5,18),m.steel,matrix([0,-.07+i*.022,0],[PI/2,0,0]));
  both(s=>{a.box(m.armor,[.008,.095,.017],[s*.026,.014,0],[0,0,0],.002);a.box(m.rose,[.002,.073,.007],[s*.031,.014,0],[0,0,0],.001,false);});
  a.ball(m.pale,[0,.145,0],[.025,.009,.025],false);
  a.box(m.rose,[.009,.016,.004],[0,.042,-.027],[0,0,0],.001,false);
  return a;
}
const BUILDERS = [buildR9, buildBloom, buildLance, buildThorn, buildNova,buildAurora];

// Small exposed energy cells sit beside each receiver and react to ammunition, charge and reload.
const BATTERY_LAYOUT = Object.freeze([
  Object.freeze([.0188, .077, .012, .0115]),
  Object.freeze([.0242, .086, .008, .018]),
  Object.freeze([.031, .082, -.04, .026]),
  Object.freeze([.0735, .110, -.335, .045]),
  Object.freeze([.0815, .075, -.025, .038])
]);
const BATTERY_COUNT = 8;
const batteryCellGeometry = new T.BoxGeometry(.0035, .007, .008);
function attachBatteryRail(model, index, mats, material) {
  if(WEAPON_FRAME[index].melee||index>=6)return null;
  const [x,y,z,step] = BATTERY_LAYOUT[index], length = step * (BATTERY_COUNT - 1) + .012;
  const shell = new T.Mesh(new T.BoxGeometry(.009, .013, length), mats.dark);
  shell.position.set(x + .002, y, z - step * (BATTERY_COUNT - 1) * .5);
  shell.castShadow = true; shell.receiveShadow = true; model.add(shell);
  const cells = new T.InstancedMesh(batteryCellGeometry, material, BATTERY_COUNT);
  cells.frustumCulled = false; cells.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const position = new T.Vector3(), scale = new T.Vector3(1,1,1), rotation = new T.Quaternion(), matrix = new T.Matrix4();
  for (let i = 0; i < BATTERY_COUNT; i++) {
    position.set(x + .007, y, z - i * step); matrix.compose(position, rotation, scale); cells.setMatrixAt(i, matrix);
    cells.setColorAt(i, new T.Color(0x171722));
  }
  cells.instanceMatrix.needsUpdate = true; if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
  cells.userData.shell=shell;model.add(cells); return cells;
}

// One group per weapon, merged into a handful of meshes each (a few draw calls instead of dozens). The geometry is
// built once per material set and shared by every gun in the scene.
const prototypes = new WeakMap();
const metalSets = new WeakMap();
function weaponMetals(source) {
  if(metalSets.has(source))return metalSets.get(source);
  const set={...source};
  for(const [name,metalness,roughness,intensity] of [['steel',.92,.24,1.15],['dark',.62,.36,.8],['armor',.78,.3,.95],['armorLight',.86,.26,1.05]]){
    const material=source[name].clone();material.name='Weapon metal — '+name;
    material.metalness=metalness;material.roughness=roughness;material.envMapIntensity=intensity;
    // Palette changes still reach cached guns. Receiver shells use exposed
    // steel; the coloured anodised inserts retain GHJU/LYLU's signature.
    material.color=name==='armorLight'?source.steel.color:source[name].color;
    set[name]=material;
  }
  metalSets.set(source,set);metalSets.set(set,set);return set;
}
export function createWeaponModels(mats) {
  mats=weaponMetals(mats);
  if (!prototypes.has(mats)) {
    prototypes.set(mats, BUILDERS.map((build, index) => {
      const group = new T.Group(); build(mats).build(group);
      group.userData.frame = WEAPON_FRAME[index];
      return group;
    }));
  }
  const models=[...prototypes.get(mats).map(group => group.clone()),createM12Shotgun(mats.steel.envMap)];
  const duo=new T.Group(),right=new T.Group(),left=new T.Group();
  duo.name='R–9 DUO / GHJU';right.name='DUO right';left.name='DUO left';left.position.x=-.44;left.scale.x=-1;
  right.add(models[0].clone());left.add(models[0].clone());duo.add(right,left);
  Object.assign(duo.userData,{frame:WEAPON_FRAME[7],dual:true,integratedEmitter:true});models.push(duo);return models;
}

// The weapon in the right hand: every model is drawn around the grip (the palm), so the glove holds it by
// construction. Heavy weapons add a second glove on the foregrip. `makeFlash(parent)` supplies the muzzle glow.
export function buildGun({ mats, gloves, sleeve = true, makeFlash }) {
  mats=weaponMetals(mats);
  const g = new T.Group(), models = createWeaponModels(mats);
  const originalWeaponMeshes=models.map(model=>[...model.children]);
  g.userData.weaponModels=models;
  for (const model of models) { model.visible = false; g.add(model); }
  const optics=models.map(attachOptic),eye=new T.Vector3(),target=new T.Vector3();
  g.userData.optics=optics;
  g.userData.setSight=(active,camera)=>{
    for(const optic of optics)if(optic)optic.reticle.visible=false;
    const optic=optics[g.userData.index];g.userData.aiming=!!active&&!!optic;
    const loaded=g.userData.kenneyAssets?.loadedByIndex?.[g.userData.index];
    if(!g.userData.aiming||!camera||loaded&&!models[g.userData.index].userData.authoredOptic)return;
    // In the model's own frame: a slimmed Kenney blaster is narrower than the weapon frame.
    const model=models[g.userData.index];g.updateWorldMatrix(true,true);camera.getWorldPosition(eye);model.worldToLocal(eye);
    optic.eyeDistance=eye.z-optic.cfg.z;
    if(optic.eyeDistance<=.035)return;
    // Zero the optical reticle to the barrel at 100 m. Off-axis eyes lose the
    // reticle outside the aperture; enabling aim never rotates a tracked hand.
    const frame=WEAPON_FRAME[g.userData.index],muzzle=models[g.userData.index].userData.muzzle||frame.muzzle;target.set(0,muzzle[1],muzzle[2]-100);
    const t=(optic.cfg.z-eye.z)/(target.z-eye.z);eye.lerp(target,t);
    const dx=eye.x,dy=eye.y-optic.cfg.y;
    optic.reticle.visible=Math.hypot(dx*model.scale.x,dy)<optic.cfg.radius*.88;
    optic.reticle.position.set(dx,optic.cfg.y+dy,optic.cfg.z+.0005);
  };
  const batteryMaterial = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const batteries = models.map((model,index)=>attachBatteryRail(model,index,mats,batteryMaterial));
  const batteryOff = new T.Color(0x171722), batteryLow = new T.Color(0xff385f), batteryReload = new T.Color(0xffffff);
  const batteryTint = new T.Color(), batteryCharge = new T.Color(), batteryWhite = new T.Color(0xffffff);
  let batteryStateKey = '';
  const hand = createGlove(gloves, { sleeve }), support = createGlove(gloves, { mirror: true, sleeve });
  support.visible = false; g.add(hand, support);
  const flash = makeFlash(g); flash.visible = false;
  const dualRight=models[7].getObjectByName('DUO right'),dualLeft=models[7].getObjectByName('DUO left');
  const leftFlash=makeFlash(dualLeft);leftFlash.visible=false;
  g.userData.dualLeft=dualLeft;g.userData.flashFor=hand=>g.userData.index===7&&hand==='left'?leftFlash:flash;
  g.userData.setFlash=(active,time=0)=>{
    if(g.userData.index!==7){flash.visible=!!active;leftFlash.visible=false;return;}
    for(const [hand,light] of [['right',flash],['left',leftFlash]]){const age=time-(g.userData.dualState?.shotAt?.[hand]??-Infinity);light.visible=!!active&&age>=0&&age<.045;}
  };
  // Small moving emitter collars and residual heat make the discharge visible
  // at the barrel rather than a large floating light in front of the hand.
  const collar=new T.Mesh(new T.CylinderGeometry(.012,.014,.014,12),mats.steel);collar.rotation.x=Math.PI/2;g.add(collar);
  collar.name='Dynamic emitter collar';
  const heatMaterial=new T.MeshBasicMaterial({color:mats.rose.color,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const heatRing=new T.Mesh(new T.TorusGeometry(.012,.0018,6,20),heatMaterial);g.add(heatRing);
  heatRing.name='Barrel heat ring';
  const emitterRadii=[.0105,.0165,.031,.029,.062,.023,.026,.0105];let blade=null;
  g.userData.getBladeSegment=()=>g.userData.index===5?blade?.segment():null;
  Object.defineProperty(g.userData,'blade',{get:()=>blade});
  Object.assign(g.userData, { flash, hand, support, showSupport: true });
  g.userData.setLevel = level => { hand.userData.setLevel(level); support.userData.setLevel(level); };
  g.userData.setCombatState = ({ ammo = 0, capacity = 1, charge = 0, reloadProgress = 0, reloading = false, time = 0,heat=0,kick=0,impulse=0,bladeHeld=false,dualState=null } = {}) => {
    if(dualState)g.userData.dualState=dualState;
    if(g.userData.index===7){
      dualLeft.visible=!!g.userData.showSupport;collar.visible=heatRing.visible=false;
      for(const [side,carrier] of [['right',dualRight],['left',dualLeft]]){
        const age=time-(g.userData.dualState?.shotAt?.[side]??-Infinity),kick=age>=0&&age<.3?.045*Math.sin(Math.min(1,age/.12)*Math.PI)*Math.exp(-age*12):0;
        carrier.position.z=kick;carrier.rotation.x=kick*2.5;
      }
      g.userData.setFlash(false,time);return;
    }
    if(g.userData.index===6)models[6].userData.animate({time,kick,impulse,reloadProgress,reloading});
    blade?.update(time,g.userData.index===5&&!!bladeHeld,mats.rose.color);
    collar.visible=g.userData.index!==5&&!models[g.userData.index].userData.integratedEmitter;
    if(g.userData.index===5){heatRing.visible=false;flash.visible=false;return;}
    const accent = mats.rose?.color || new T.Color(0xff80b2);
    const frame=WEAPON_FRAME[g.userData.index],muzzle=models[g.userData.index].userData.muzzle||frame.muzzle,radius=models[g.userData.index].userData.integratedEmitter?[.012,.017,.014,.022,.030,0,.026][g.userData.index]:emitterRadii[g.userData.index];
    collar.position.set(muzzle[0],muzzle[1],muzzle[2]+.009+Math.min(.014,kick*.16));
    collar.scale.set(radius/.012,1,radius/.012);
    heatRing.position.set(muzzle[0],muzzle[1],muzzle[2]-.001);heatRing.scale.setScalar(radius/.012);
    heatMaterial.color.copy(accent);heatMaterial.opacity=Math.min(.8,heat*.25+charge*.45+impulse*.4);heatRing.visible=heatMaterial.opacity>.015;
    const rail = batteries[g.userData.index]; if (!rail) return;
    const low = ammo > 0 && ammo <= capacity * .25, blink = Math.floor(time * 6) % 2 === 0;
    const chargeStep = Math.round(charge * BATTERY_COUNT), reloadStep = Math.ceil(reloadProgress * BATTERY_COUNT);
    const accentHex = accent.getHex(), key = `${g.userData.index}|${ammo}|${capacity}|${chargeStep}|${reloadStep}|${reloading}|${low&&blink}|${accentHex}`;
    if (key === batteryStateKey) return; batteryStateKey = key;
    const filled = Math.max(Math.ceil(ammo / Math.max(1,capacity) * BATTERY_COUNT), reloading ? Math.ceil(reloadProgress * BATTERY_COUNT) : 0);
    const chargeCells = chargeStep, on = batteryTint.copy(accent);
    batteryCharge.copy(on).lerp(batteryWhite,.25 + .65 * charge);
    for (let i=0;i<BATTERY_COUNT;i++) {
      const lit = i < filled, charging = charge > 0 && i < chargeCells;
      const color = !lit ? batteryOff : low && blink ? batteryLow : reloading && i < reloadStep ? batteryReload : charging ? batteryCharge : on;
      rail.setColorAt(i,color);
    }
    rail.instanceColor.needsUpdate = true;
  };
  g.userData.animateHands = (trigger = 0, grip = .18, reload = 0, dt = .016) => {
    hand.userData.animate?.({ trigger, grip, reload: 0 }, dt);
    if(g.userData.index===6&&support.visible){const p=M12_FRAME.support;support.userData.setBasePosition?.([p[0],p[1],p[2]+(models[6].userData.pumpOffset||0)]);}
    // The free hand has no trigger: its index closes round the foregrip with the other fingers.
    if (support.visible) support.userData.animate?.({ trigger:g.userData.index===7?trigger:0, grip: reload ? 0 : grip, reload, wrap:g.userData.index!==7&&!reload }, dt);
  };
  const supportCuff=[...KENNEY_SUPPORT_CUFF];supportCuff[0]=-supportCuff[0];
  const handCuff=new T.Vector3(),rakeAxis=new T.Vector3(1,0,0);
  g.userData.palm=new T.Vector3();
  g.userData.setVariant = index => {
    if(!WEAPON_FRAME[index])return;
    if(g.userData.index===6&&index!==6)models[6].userData.resetAnimation();
    models.forEach((model, i) => model.visible = i === index);
    const frame = WEAPON_FRAME[index],hold=index===6?M12_HOLD:g.userData.kenneyAssets?.loadedByIndex?.[index===7?0:index]?KENNEY_HOLD[index===7?0:index]:null;
    if(index===7){dualRight.add(hand,flash);dualLeft.add(support);support.scale.x=Math.abs(support.scale.x);}
    else {g.add(hand,support,flash);support.scale.x=-Math.abs(support.scale.x);}
    dualLeft.visible=index===7&&!!g.userData.showSupport;leftFlash.visible=false;
    if(index===5&&!blade){blade=createEnergyBlade(mats.rose.color);g.add(blade.root);}
    if(index!==5)blade?.reset?.();
    const muzzle=models[index].userData.muzzle||frame.muzzle;
    flash.position.set(...muzzle); flash.scale.setScalar([.14,.12,.25,.19,.38,0,.27,.14][index]);
    leftFlash.position.set(...muzzle);leftFlash.scale.setScalar(.14);
    collar.visible=index!==5&&!models[index].userData.integratedEmitter;
    collar.position.set(frame.muzzle[0],frame.muzzle[1],frame.muzzle[2]+.009);collar.scale.set(emitterRadii[index]/.012,1,emitterRadii[index]/.012);
    heatRing.visible=false;
    support.visible = g.userData.showSupport && !!frame.support;
    g.userData.supportPoint=index===7?[-.44-(hold?.palm[0]||0),hold?.palm[1]||0,hold?.palm[2]||0]:hold?.support||frame.support;
    support.userData.setBasePosition?.(index===7?(hold?.palm||[0,0,0]):g.userData.supportPoint || [0,0,0]);
    // The palm closes on the blaster's own grip: raked like it, the cuff heading back towards the elbow
    // (never up at the eye, where its open end would show).
    g.userData.palm.set(...(hold?.palm||[0,0,0]));
    hand.userData.setBasePosition?.(g.userData.palm.toArray());hand.rotation.x=hold?.rake||0;
    hand.userData.setForearm?.(hold?handCuff.set(...KENNEY_CUFF).applyAxisAngle(rakeAxis,-hold.rake).toArray():undefined);
    support.rotation.x=index===7?hold?.rake||0:0;
    support.userData.setForearm?.(index===7&&hold?handCuff.toArray():hold?supportCuff:undefined);
    g.userData.index = index;
  };
  g.userData.kenneyAssets=installKenneyBlasters(models,originalWeaponMeshes,WEAPON_FRAME,
    (index,skin)=>{
      g.userData.kenneyVersion=(g.userData.kenneyVersion||0)+1;
      // The sight stays round on a slimmed blaster.
      const optic=optics[index],slim=models[index].scale.x;
      if(optic){
        if(skin.userData.optic){Object.assign(optic.cfg,skin.userData.optic);optic.glass.position.set(0,optic.cfg.y,optic.cfg.z);optic.glass.scale.setScalar(optic.cfg.radius);optic.glass.visible=true;models[index].userData.authoredOptic=true;}
        else optic.glass.visible=false;
        optic.reticle.visible=false;
      }
      // These cell rails belonged to the procedural receivers and otherwise
      // float alongside the Kenney model. The real GLB is a closed assembly.
      const rail=batteries[index];if(rail){rail.visible=false;rail.userData.shell.visible=false;}
      if(index===0){
        // Both pistols reuse the approved production R9, including its textures.
        // Replace just the visual nodes; the two glove skeletons stay private.
        for(const carrier of [dualRight,dualLeft]){for(const child of [...carrier.children])if(child!==hand&&child!==support&&child!==flash&&child!==leftFlash)carrier.remove(child);const visual=models[0].clone();visual.visible=true;carrier.add(visual);}
        models[7].userData.muzzle=[...models[0].userData.muzzle];
        if(g.userData.index===7)g.userData.setVariant(7);
      }
      if(g.userData.index===index)g.userData.setVariant(index);
    },KENNEY_HOLD,mats.steel.envMap);
  g.userData.setVariant(0); g.userData.setLevel(1);
  let disposed=false;
  g.userData.disposeDynamic=()=>{
    if(disposed)return;disposed=true;
    hand.userData.dispose?.();support.userData.dispose?.();
    models[6].userData.dispose?.();
    for(const rail of batteries)if(rail){rail.dispose();rail.userData.shell.geometry.dispose();}
    blade?.dispose();
    for(const optic of optics)if(optic){optic.glassMaterial.dispose();optic.material.dispose();optic.hairMaterial?.dispose();for(const child of optic.reticle.children)if(child.isLineSegments)child.geometry.dispose();}
    batteryMaterial.dispose();collar.geometry.dispose();heatRing.geometry.dispose();heatMaterial.dispose();
  };
  return g;
}
