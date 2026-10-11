import * as T from './vendor/three.webgpu.min.js';
import { loft, matrix, armorPanel } from './geo.js';

// A fully sealed shell: there are no face or hair meshes inside this model. The visor is opaque,
// and sits on top of the closed shell, so even close inspection from below cannot expose a face.
export const HELMET_RINGS = Object.freeze([
  [-.205,.07,.07,0],[-.183,.126,.126,-.012],[-.13,.157,.155,-.009],
  [-.055,.17,.178,.004],[.025,.172,.183,.008],[.098,.166,.176,.01],
  [.158,.14,.153,.013],[.194,.098,.112,.015],[.211,.028,.042,.018]
].map(Object.freeze));
const shell = loft(HELMET_RINGS, 36);
const visor = new T.SphereGeometry(1, 36, 14, Math.PI * 1.12, Math.PI * .76, Math.PI * .37, Math.PI * .26);
const chin = loft([[-.205,.066,.076,-.041],[-.17,.118,.15,-.042],[-.12,.137,.155,-.034],[-.088,.131,.142,-.038]],24);
const collar = new T.TorusGeometry(.09,.016,10,32).rotateX(Math.PI/2);
// Angled one-piece tinted face shield, proportional to the helmets in the reference sheets.
const eyeShield=armorPanel([[-.143,.074],[.143,.074],[.163,.019],[.127,-.072],[.07,-.09],[-.07,-.09],[-.127,-.072],[-.163,.019]],.011,.005);
const jawLid=armorPanel([[-.079,.04],[.079,.04],[.105,-.018],[.054,-.061],[-.055,-.061],[-.105,-.018]],.024,.006);
// Enemy-only distant LOD. Player helmets retain the full original geometry.
const shellLow = loft(HELMET_RINGS,16);
const visorLow = new T.SphereGeometry(1,14,8,Math.PI*1.12,Math.PI*.76,Math.PI*.37,Math.PI*.26);
const chinLow = loft([[-.205,.066,.076,-.041],[-.17,.118,.15,-.042],[-.12,.137,.155,-.034],[-.088,.131,.142,-.038]],12);
const collarLow = new T.TorusGeometry(.09,.016,6,14).rotateX(Math.PI/2);

export function addClosedHelmet(assembly, m, { scale = 1, hostile = false, lowDetail = false } = {}) {
  const add = (geometry, material, position = [0,0,0], size = [1,1,1], rotation = [0,0,0], level = 1) =>
    assembly.add(geometry,material,matrix(position.map(v=>v*scale),rotation,size.map(v=>v*scale)),true,level);
  const plate = (material,position,size,rotation=[0,0,0],level=1) =>
    assembly.box(material,size.map(v=>v*scale),position.map(v=>v*scale),rotation,.004*scale,true,level);
  add(lowDetail?shellLow:shell,m.trim); add(lowDetail?visorLow:visor,m.visor,[0,.002,-.014],[.177,.207,.193]);
  add(lowDetail?chinLow:chin,m.trim); add(lowDetail?collarLow:collar,m.fabric,[0,-.212,.012]);
  if(!hostile) {
    // The gloss-blue/pink visor does not require transparent glass or an actual exposed face.
    add(eyeShield,m.lens||m.visor,[0,.002,-.228],[.99,.98,.62]);
    add(jawLid,m.armor,[0,-.14,-.191],[.92,.94,.75]);
    for(const side of [-1,1]){
      plate(m.trim,[side*.123,.07,-.211],[.024,.02,.026],[0,0,side*-.12]);
      plate(m.metal,[side*.118,-.081,-.208],[.057,.026,.026],[.04,0,side*.25]);
      plate(m.armor,[side*.109,-.171,-.163],[.074,.051,.046],[-.22,side*.36,0]);
      plate(m.trim,[side*.069,-.187,-.196],[.034,.012,.021],[.12,0,0]);
    }
  }
  // Brow, closed jaw, temple locks and recessed ventilation. Small lights replace visible eyes.
  plate(m.trim,[0,.088,-.171],[.22,.023,.046],[.15,0,0]);
  plate(m.armor,[0,.154,-.082],[.13,.024,.075],[.18,0,0]);
  plate(m.fabric,[0,.171,-.096],[.078,.01,.023],[.18,0,0]);
  plate(m.fabric,[0,-.141,-.197],[.118,.046,.025],[-.12,0,0]);
  for(const s of [-1,1]) {
    plate(m.armor,[s*.16,-.015,.012],[.048,.12,.112],[0,0,s*-.12]);
    plate(m.trim,[s*.168,-.015,-.047],[.027,.077,.047],[0,0,s*-.12]);
    plate(m.fabric,[s*.184,-.016,.004],[.014,.059,.066]);
    plate(m.glow,[s*.185,-.016,-.007],[.007,.031,.024]);
    plate(m.armor,[s*.085,-.14,-.153],[.082,.064,.051],[-.2,s*.3,0]);
    for(let i=0;i<3;i++)plate(m.fabric,[s*(.069+i*.017),-.138,-.184],[.005,.025,.01],[-.12,0,0]);
  }
  plate(m.glow,[0,.071,-.194],[hostile?.16:.088,.006,.008]);
  plate(m.trim,[0,.181,.012],[.034,.028,.172],[.02,0,0]);
  if(!hostile){
    // Three-section helmet ridge, optical sensor bank and jaw ventilation.
    for(const side of [-1,1]){
      plate(m.armor,[side*.09,.12,-.101],[.061,.034,.07],[.15,0,side*.16]);
      plate(m.glow,[side*.13,.028,-.217],[.018,.008,.011]);
      for(let j=0;j<3;j++)plate(m.fabric,[side*(.045+j*.015),-.151,-.225],[.006,.025,.008],[0,0,side*.045]);
    }
    plate(m.trim,[0,.136,-.126],[.073,.01,.012],[.12,0,0]);
  }
  if (!hostile) {
    // Level six reinforces the already closed helmet; it never unlocks face protection.
    for(const s of [-1,1]) {
      plate(m.trim,[s*.14,.10,.039],[.063,.07,.105],[0,0,s*-.18],6);
      plate(m.metal,[s*.122,-.15,-.101],[.072,.063,.065],[-.18,s*.34,0],6);
      plate(m.glow,[s*.13,-.153,-.139],[.025,.008,.008],[0,s*.3,0],6);
    }
    plate(m.fabric,[0,.124,-.126],[.15,.026,.076],[.25,0,0],6);
    plate(m.glow,[0,.14,-.142],[.11,.005,.013],[.25,0,0],6);
  }
}
