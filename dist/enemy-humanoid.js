import * as T from './vendor/three.webgpu.min.js';
import {loft,bevelBox,matrix} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';
import {FIELD_RIFLE,carriesFieldRifle} from './enemy-weapon-layout.js';

// A new hard-surface body over the approved hero's anatomical reference.
// Planar plates and tapered chamfers replace inflated limbs and round shoulders.
const panel=(points,depth=.018)=>profiledPanel(points,{depth,bulge:.004,round:.035});
const breast=panel([[-.10,-.18],[.09,-.18],[.12,-.08],[.11,.16],[.06,.20],[-.07,.19],[-.12,.11],[-.12,-.10]],.025);
const shoulder=panel([[-.105,-.065],[.10,-.065],[.13,-.01],[.11,.085],[.04,.12],[-.09,.09],[-.13,.02]],.035);
const kneePlate=panel([[-.06,-.055],[.06,-.055],[.08,.025],[.045,.07],[-.045,.07],[-.08,.025]],.025);
const shin=panel([[-.045,-.15],[.045,-.15],[.07,.10],[.043,.15],[-.043,.15],[-.07,.10]],.022);
const face=panel([[-.10,-.11],[.10,-.11],[.13,-.045],[.12,.10],[.07,.13],[-.07,.13],[-.12,.10],[-.13,-.045]],.15);
const visorPlate=panel([[-.10,-.017],[.10,-.017],[.112,.015],[.085,.029],[-.085,.029],[-.112,.015]],.011);
const shieldPlate=panel([[-.15,-.27],[.15,-.27],[.20,-.17],[.19,.20],[.12,.28],[-.12,.28],[-.19,.20],[-.20,-.17]],.045);
const core=loft([[1.04,.15,.10],[1.12,.17,.12],[1.37,.235,.13],[1.57,.21,.115],[1.64,.12,.085]],8).toNonIndexed();core.computeVertexNormals();
const limbShell=loft([[-.5,.40,.40],[-.44,.5,.5],[.40,.47,.47],[.5,.34,.34]],8).toNonIndexed();limbShell.computeVertexNormals();
const joint=new T.CylinderGeometry(1,1,1,10).rotateZ(Math.PI/2),eye=new T.SphereGeometry(1,8,5),ring=new T.TorusGeometry(1,.12,4,14);
const helmet=loft([[1.735,.068,.065,.005],[1.785,.12,.105,.015],[1.89,.143,.137,.015],[1.97,.123,.118,.025],[2.005,.072,.075,.035]],10).toNonIndexed();helmet.computeVertexNormals();
const boot=loft([[-.062,.067,.14,-.014],[-.043,.075,.147,-.016],[.035,.068,.12,.005],[.065,.055,.075,.045]],10).toNonIndexed();boot.computeVertexNormals();
const receiver=bevelBox(.13,.13,.40,.012,1),sole=bevelBox(.153,.024,.30,.006,1);
const tmp=new T.Vector3(),direction=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
const reference=HUMAN_REFERENCE.joints;
export function buildHumanoidRobot({form,elite,ranged,armor,dark,servo,hazard,optics,glow,boneAt,assembly,thorax,pelvis}){
 const heavy=['brute','bulwark'].includes(form),slender=['seer','listener','synth'].includes(form),width=heavy?1.45:slender?.96:1.06,limbWidth=heavy?1.28:1;
 const a=assembly(thorax),hips=assembly(pelvis),legRig=[],armRig=[];let groundGun=null,gunSignal=null;
 const point=(name,side)=>{const p=reference[(side===-1?'Left':'Right')+name];return [p[0]*width,p[1],p[2]];};
 const shell=(build,mat,start,end,w,d)=>{tmp.set(...start).add(new T.Vector3(...end)).multiplyScalar(.5);direction.set(...end).sub(new T.Vector3(...start));rotation.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());scale.set(w,direction.length(),d);build.add(limbShell,mat,new T.Matrix4().compose(tmp,rotation,scale));};
 const motor=(build,p,r=.052,w=.06)=>build.add(joint,servo,matrix(p,[0,0,0],[w,r,r]));
 a.add(core,dark,matrix([0,0,0],[0,0,0],[width,1,1]));
 for(const side of [-1,1]){
  a.add(breast,armor,matrix([side*.115*width,1.405,-.143],[.025,side*-.08,0],[width,1,1]));
  a.box(hazard,[.055,.018,.012],[side*.16*width,1.52,-.176],[0,0,0],.002);
  for(let i=0;i<3;i++)a.box(dark,[.075,.009,.014],[side*.14*width,1.40+i*.035,-.181],[0,0,0],.001);
  a.add(shoulder,armor,matrix([side*(Math.abs(reference.LeftArm[0])*width+.07),1.555,-.01],[-.13,side*-.24,side*-.10],[heavy?1.3:1,1,1]));
 }
 a.box(armor,[.055,.26,.035],[0,1.39,-.167],[0,0,0],.008);
 a.box(armor,[.235,.045,.16],[0,1.655,.02],[0,0,0],.012);
 for(let i=0;i<3;i++)a.box(armor,[.26-i*.025,.052,.028],[0,1.22-i*.075,-.129],[.04,0,0],.006);
 a.box(dark,[.24*width,.35,.14],[0,1.39,.145],[0,0,0],.015);
 for(const side of [-1,1]){a.box(armor,[.07,.29,.065],[side*.115*width,1.39,.23],[0,0,0],.008);a.box(dark,[.055,.10,.035],[side*.115*width,1.39,.273],[0,0,0],.003);}
 hips.box(armor,[.32*width,.075,.20],[0,1.015,0],[0,0,0],.012);
 for(const side of [-1,1])hips.box(armor,[.12*width,.13,.075],[side*.13*width,.955,-.10],[0,side*-.12,side*-.08],.008);
 const neck=boneAt('sensor-head',reference.Head,thorax),h=assembly(neck);
 h.limb(dark,[0,1.60,.02],[0,1.77,.02],.043,.039);
 h.add(helmet,armor,matrix([0,0,0],[0,0,0],[heavy?1.08:1,1,1]));
 h.add(face,armor,matrix([0,1.845,-.048],[0,0,0],[heavy?1.08:1,1,1]));
 h.add(visorPlate,dark,matrix([0,1.88,-.135]));
 for(const side of [-1,1]){h.box(dark,[.036,.11,.09],[side*.137,1.86,.005],[0,0,0],.006);h.add(joint,servo,matrix([side*.161,1.87,.005],[0,0,0],[.008,.028,.028]));}
 if(form==='seer'){
  h.add(ring,dark,matrix([0,1.88,-.18],[0,0,0],[.047,.047,.047]));h.add(eye,optics,matrix([0,1.88,-.194],[0,0,0],[.031,.031,.012]),false);
 }else for(const side of [-1,1])h.add(eye,optics,matrix([side*.047,1.88,-.156],[0,0,0],[.031,.008,.009]),false);
 h.box(dark,[.082,.022,.008],[0,1.75,-.125],[0,0,0],.003);
 if(form==='listener')for(const side of [-1,1]){h.limb(dark,[side*.11,1.91,.02],[side*.17,2.14,.04],.015,.009);h.add(joint,armor,matrix([side*.18,2.11,.04],[0,0,0],[.032,.075,.075]));}
 if(form==='seer')h.box(dark,[.045,.075,.07],[.10,2.04,.015],[0,0,.08],.006);
 for(const side of [-1,1]){
  const s=point('Arm',side),e=point('ForeArm',side),w=point('Hand',side);
  const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
  const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
  motor(a,s,.055,.075);shell(u,dark,s,e,.11*limbWidth,.12);shell(u,armor,[s[0],s[1]-.055,s[2]],[e[0],e[1]+.04,e[2]],.15*limbWidth,.15);
  motor(l,e,.047,.07);shell(l,dark,e,w,.10*limbWidth,.10);shell(l,armor,[e[0],e[1]-.035,e[2]],[w[0],w[1]+.045,w[2]],.14*limbWidth,.14);
  l.limb(servo,[e[0]+side*.04,e[1]-.03,e[2]+.04],[w[0]+side*.033,w[1]+.035,w[2]+.04],.009,.008);
  f.box(dark,[.065,.075,.04],[w[0],w[1]-.035,w[2]-.016],[0,0,0],.006);
  for(let finger=0;finger<4;finger++){const x=w[0]+(finger-1.5)*.017;f.limb(servo,[x,w[1]-.055,w[2]-.02],[x,w[1]-.105,w[2]-.037],.007,.006);f.limb(dark,[x,w[1]-.105,w[2]-.037],[x,w[1]-.10,w[2]-.069],.006,.005);}
  f.limb(servo,[w[0]-side*.043,w[1]-.02,w[2]-.02],[w[0]-side*.051,w[1]-.05,w[2]-.05],.009,.007);
  if(form==='bulwark')l.add(shieldPlate,armor,matrix([e[0]+side*.045,(e[1]+w[1])*.5,w[2]-.07],[0,side*-.12,0],[1,1,1]));
  armRig.push({upper,lower,wrist,side});
  const hip=point('UpLeg',side),knee=point('Leg',side),ankle=point('Foot',side),upperLeg=boneAt(`leg-${side}-hip`,hip,pelvis),lowerLeg=boneAt(`leg-${side}-knee`,knee,upperLeg),foot=boneAt(`leg-${side}-ankle`,ankle,lowerLeg);
  const v=assembly(upperLeg),c=assembly(lowerLeg),b=assembly(foot);
  motor(v,hip,.055,.07);shell(v,dark,hip,knee,.13*limbWidth,.14);shell(v,armor,[hip[0],hip[1]-.05,hip[2]],[knee[0],knee[1]+.07,knee[2]],.19*limbWidth,.17);
  motor(c,knee,.054,.075);c.add(kneePlate,armor,matrix([knee[0],knee[1],knee[2]-.061],[0,0,0],[1,1,1]));
  shell(c,dark,knee,ankle,.105*limbWidth,.115);shell(c,armor,[knee[0],knee[1]-.055,knee[2]],[ankle[0],ankle[1]+.06,ankle[2]],.145*limbWidth,.14);
  c.add(shin,armor,matrix([knee[0],.35,-.072],[0,0,0],[limbWidth,1,1]));
  motor(b,ankle,.042,.065);b.add(boot,armor,matrix([ankle[0],.065,ankle[2]-.055]));b.add(sole,dark,matrix([ankle[0],.015,ankle[2]-.06]));
  legRig.push({upper:upperLeg,lower:lowerLeg,foot,side,hip,knee,ankle});
 }
 if(ranged){
  const field=carriesFieldRifle(form),p=field?FIELD_RIFLE.pivot:{x:.37,y:1.69,z:-.01},m=field?FIELD_RIFLE.muzzle:{x:.37,y:1.69,z:-.345};
  groundGun=boneAt(field?'aimed-field-rifle':'aimed-shoulder-weapon',[p.x,p.y,p.z],thorax);const gun=assembly(groundGun);
  if(field){
   gun.add(receiver,armor,matrix([p.x,p.y-.02,-.10]));gun.box(dark,[.09,.11,.17],[p.x,p.y-.04,.17],[0,0,0],.01);gun.box(dark,[.045,.13,.06],[p.x,p.y-.14,.045],[-.15,0,0],.008);
   gun.box(armor,[.115,.095,.12],[p.x,p.y-.035,-.33],[0,0,0],.01);gun.limb(dark,[p.x,p.y,-.32],[m.x,m.y,m.z],.027,.023);gun.add(ring,servo,matrix([m.x,m.y,m.z+.018],[0,0,0],[.026,.026,.026]));
  }else{gun.box(armor,[.18,.16,.32],[p.x,p.y,.02],[0,0,0],.015);gun.limb(dark,[p.x,p.y,-.10],[m.x,m.y,m.z],.055,.035);a.limb(servo,[p.x,1.56,.08],[p.x,1.67,.08],.034,.03);}
  gunSignal=boneAt('weapon-ready-emitter',[m.x,m.y,m.z],groundGun);assembly(gunSignal).add(eye,glow,matrix([m.x,m.y,m.z],[0,0,0],[.022,.022,.01]),false);
 }
 return {legRig,armRig,groundGun,gunSignal,sensorAnchor:form==='seer'?[0,1.88]:[.047,1.88],hipHeight:reference.LeftUpLeg[1]};
}
