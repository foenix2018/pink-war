// BRUTE V3 / LE BRISEUR — original hard-surface articulated siege robot.
// Unlike V1/V2 this has NO generic human core, spherical limb shells or ball fists.
// All plates are built once, rigidly skinned to the existing combat skeleton, and
// merged by material by enemies.js. Front is -Z. No runtime mesh creation.
import * as T from './vendor/three.webgpu.min.js';
import {matrix,loft} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';

export const BRUTE_V3=Object.freeze({
 name:'BRUTE / LE BRISEUR V3',revision:'BRISEUR-V3-HARDSURFACE-2026-10',
 model:'independent five-material siege mech, not human armour add-ons',
 silhouette:'armored shoulder bridge / recessed angular helmet / oversized hydraulic left hammer',
 chest:'recessed scarlet triangular reactor inside separated heavy breast plates',
 features:['octagonal hinges','armoured hands','exposed ram pistons','divided shin shields','toe blocks','rear engine spine']
});
const p=(points,depth=.07,bulge=.015)=>profiledPanel(points,{depth,bulge,round:.035,detail:3});
const G=new T.BoxGeometry(1,1,1);
const C=new T.CylinderGeometry(1,1,1,8,1);
const CLIP=new T.CylinderGeometry(1,1,1,6,1);
const OCT=loft([[-.5,.66,.70],[-.40,.92,.91],[.35,1,.94],[.48,.73,.76]],8);
const PL={
 chest:p([[-.205,-.23],[.175,-.23],[.295,-.115],[.30,.18],[.14,.255],[-.17,.22],[-.29,.07]],.105,.036),
 shoulder:p([[-.31,-.16],[.24,-.19],[.345,-.068],[.325,.22],[.14,.30],[-.22,.29],[-.36,.12]],.13,.040),
 shoulderSide:p([[-.18,-.23],[.21,-.21],[.27,-.055],[.225,.18],[-.19,.19],[-.265,.02]],.10,.021),
 cheek:p([[-.16,-.105],[.15,-.12],[.21,.025],[.13,.17],[-.16,.17],[-.215,.025]],.08,.027),
 waist:p([[-.17,-.13],[.16,-.12],[.21,.035],[.13,.17],[-.16,.155],[-.22,.03]],.065,.018),
 knee:p([[-.19,-.135],[.18,-.155],[.235,.03],[.15,.17],[-.15,.18],[-.23,.025]],.09,.028),
 shin:p([[-.16,-.245],[.16,-.25],[.23,-.075],[.185,.235],[-.175,.25],[-.24,-.075]],.11,.033),
 thigh:p([[-.18,-.21],[.17,-.23],[.22,-.08],[.22,.19],[.07,.255],[-.19,.235],[-.245,.015]],.10,.031),
 reactorOuter:p([[0,-.185],[.183,.092],[.123,.18],[-.13,.18],[-.188,.085]],.07,.014),
 reactorInner:p([[0,-.128],[.126,.091],[.069,.13],[-.075,.13],[-.123,.086]],.013,.004),
 visor:p([[-.15,-.012],[.14,-.012],[.19,.016],[.123,.055],[-.13,.055],[-.195,.011]],.018,.006),
 visorRim:p([[-.185,-.038],[.165,-.038],[.225,.025],[.155,.08],[-.17,.08],[-.236,.024]],.044,.007),
 gauntlet:p([[-.26,-.17],[.235,-.17],[.29,-.07],[.275,.17],[.145,.225],[-.21,.21],[-.31,.06]],.11,.026),
 heel:p([[-.175,-.12],[.18,-.12],[.23,-.035],[.17,.11],[-.17,.12],[-.23,-.035]],.08,.023)
};
function block(a,mat,pos,size,rot=[0,0,0],shadow=true){a.add(G,mat,matrix(pos,rot,size),shadow);}
function armor(a,mat,shape,pos,rot=[0,0,0],scale=[1,1,1],shadow=true){a.add(shape,mat,matrix(pos,rot,scale),shadow);}
function beam(a,mat,from,to,r=.035,radial=8){
 const beg=new T.Vector3(...from),end=new T.Vector3(...to),delta=end.clone().sub(beg);
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
 a.add(radial===6?CLIP:C,mat,new T.Matrix4().compose(beg.add(end).multiplyScalar(.5),q,new T.Vector3(r,delta.length(),r)));
}
function facetLimb(a,mat,from,to,w,d){
 const beg=new T.Vector3(...from),end=new T.Vector3(...to),delta=end.clone().sub(beg);
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
 a.add(OCT,mat,new T.Matrix4().compose(beg.add(end).multiplyScalar(.5),q,new T.Vector3(w,delta.length(),d)));
}
function disc(a,mat,center,r=.09,depth=.047){
 a.add(C,mat,matrix(center,[0,0,Math.PI/2],[r,depth,r]));
}
function rivet(a,mat,x,y,z){a.add(C,mat,matrix([x,y,z],[Math.PI/2,0,0],[.013,.013,.013]));}

export function buildBruteV3({armor:plate,dark,servo,reactor,optics,glow,boneAt,assembly,thorax,pelvis}){
 const joints=HUMAN_REFERENCE.joints,armRig=[],legRig=[];
 const body=assembly(thorax),hips=assembly(pelvis);
 // Exoskeletal main body: angular frame and exposed ribbing, not an egg-like torso.
 facetLimb(body,dark,[0,1.15,.06],[0,1.77,.025],.30,.225);
 block(body,dark,[0,1.55,.17],[.70,.40,.34]);
 for(const side of [-1,1]){
   // Massive cantilevered shoulder bridge. Layered, irregular large armor facets.
   const x=side*.69;
   facetLimb(body,dark,[side*.25,1.65,.12],[side*.80,1.83,.10],.18,.18);
   block(body,dark,[side*.76,1.82,-.02],[.43,.35,.43],[0,0,side*.16]);
   armor(body,plate,PL.shoulder,[x,1.86,-.31],[.015,side*-.10,side*-.075],[1.08,1.03,1]);
   armor(body,plate,PL.shoulderSide,[side*1.02,1.79,.015],[0,side*.92,side*.03]);
   block(body,servo,[side*.69,2.065,-.055],[.30,.028,.27],[0,0,side*.06]);
   block(body,dark,[side*.72,2.095,.06],[.24,.06,.22]);
   // Segmented frontal armor that avoids masking the triangular core.
   armor(body,plate,PL.chest,[side*.242,1.57,-.365],[0,side*.155,side*-.045],[1.05,1,1]);
   armor(body,dark,PL.cheek,[side*.435,1.38,-.286],[0,side*.15,0],[.66,.75,.66]);
   block(body,dark,[side*.30,1.79,-.29],[.20,.055,.09],[0,0,side*.06]);
   block(body,servo,[side*.3,1.805,-.350],[.10,.016,.014]);
   // Armor bolts on corners, actual contrasting relief, no painted-on spheres.
   for(const yy of [1.46,1.73])for(const xx of [.30,.46])rivet(body,servo,side*xx,yy,-.45);
   disc(body,dark,[side*.54,1.58,.16],.18,.12);
   disc(body,servo,[side*.60,1.58,.17],.105,.135);
   // Mechanism and radiator visible from rear; twin stabilisers at the spine.
   block(body,plate,[side*.245,1.52,.33],[.30,.49,.13],[0,side*.08,0]);
   for(let k=0;k<3;k++)block(body,dark,[side*.255,1.39+k*.13,.41],[.24,.037,.025]);
   beam(body,dark,[side*.33,1.69,.34],[side*.36,1.22,.28],.046);
   beam(body,servo,[side*.33,1.66,.365],[side*.36,1.47,.30],.023);
 }
 // Rear stabiliser housing and staggered spine slats are legible in full rotation.
 block(body,dark,[0,1.51,.34],[.26,.54,.17]);
 for(let k=0;k<5;k++)block(body,servo,[0,1.31+k*.087,.445],[.23,.025,.03]);
 // Deep recessed V-shaped reactor: a welded frame, well, lens and hotspot.
 armor(body,dark,PL.reactorOuter,[0,1.56,-.438],[0,0,0],[1.20,1.17,1.1]);
 armor(body,servo,PL.reactorOuter,[0,1.56,-.465]);
 armor(body,reactor,PL.reactorInner,[0,1.56,-.511],[0,0,0],[.88,.88,1],false);
 block(body,reactor,[0,1.50,-.541],[.040,.056,.009],[0,0,0],false);
 // Waist has a short stacked mechanical bridge and overlapping trapezoid armor.
 facetLimb(hips,dark,[0,1.01,.09],[0,1.30,.08],.23,.17);
 for(const side of [-1,1]){
   armor(hips,plate,PL.waist,[side*.19,1.08,-.243],[0,side*.13,side*-.08],[1.0,1.12,1]);
   disc(hips,dark,[side*.315,1.007,.09],.145,.11);
   disc(hips,servo,[side*.40,1.007,.105],.08,.10);
   block(hips,servo,[side*.17,1.24,-.255],[.10,.03,.05]);
 }
 for(let k=0;k<3;k++)block(hips,dark,[0,1.17-k*.09,-.235],[.18-k*.017,.034,.08]);
 // The helmet is deliberately much smaller than the shoulder span.
 const neck=boneAt('sensor-head',joints.Head,thorax),h=assembly(neck);
 facetLimb(h,dark,[0,1.70,.065],[0,1.97,.07],.155,.135);
 block(h,dark,[0,1.935,.045],[.325,.215,.26]);
 armor(h,plate,PL.cheek,[0,2.001,-.102],[0,0,0],[.67,.68,.55]);
 armor(h,dark,PL.visorRim,[0,1.970,-.276]);
 armor(h,optics,PL.visor,[0,1.971,-.333],[0,0,0],[.95,.95,1],false);
 block(h,plate,[0,2.105,-.060],[.24,.065,.18],[0,0,-.02]);
 for(const side of [-1,1]){
   disc(h,dark,[side*.17,1.962,.062],.085,.09);
   disc(h,servo,[side*.201,1.962,.065],.050,.07);
   block(h,plate,[side*.167,1.89,-.13],[.075,.14,.10],[0,side*.17,0]);
   block(h,dark,[side*.185,2.049,.05],[.075,.035,.13]);
 }
 // Each armored arm / leg is assembled on its *existing* game skeleton bones.
 const armX=2.82,legX=1.9;
 for(const side of [-1,1]){
   const P=(part,scale)=>{const r=joints[(side<0?'Left':'Right')+part];return [r[0]*scale,r[1],r[2]];};
   const s=P('Arm',armX),e=P('ForeArm',armX),w=P('Hand',armX);
   const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
   const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
   const giant=side===-1,gain=giant?1.35:.94;
   // Open skeletal lattice with chrome hydraulics; outer faceted plates.
   facetLimb(u,dark,s,e,.20*gain,.185*gain);
   facetLimb(u,plate,[s[0],s[1]-.04,s[2]-.03],[e[0],e[1]+.04,e[2]-.02],.18*gain,.17*gain);
   armor(u,plate,PL.gauntlet,[(s[0]+e[0])*.5,(s[1]+e[1])*.5,-.255],[0,side*.10,side*-.12],[.84*gain,.93,.8]);
   for(const k of [-1,1]){
     beam(u,dark,[s[0]+k*.09,s[1]-.06,.12],[e[0]+k*.11,e[1]+.10,.13],.048);
     beam(u,servo,[s[0]+k*.09,s[1]-.16,.165],[e[0]+k*.10,e[1]+.16,.175],.022);
   }
   disc(u,dark,[s[0]+side*.13,s[1]-.055,.085],.17,.11);
   disc(u,servo,[s[0]+side*.155,s[1]-.055,.094],.098,.13);
   facetLimb(l,dark,e,w,.22*gain,.20*gain);
   facetLimb(l,plate,[e[0],e[1]-.03,e[2]-.02],[w[0],w[1]+.02,w[2]-.025],.255*gain,.22*gain);
   armor(l,plate,PL.gauntlet,[(e[0]+w[0])*.5,(e[1]+w[1])*.5,-.27],[0,side*.09,side*-.11],[1.0*gain,1.22,1]);
   disc(l,dark,[e[0]+side*.14,e[1],e[2]],.15,.11);
   disc(l,servo,[e[0]+side*.16,e[1],e[2]],.10,.13);
   for(const k of [-1,1]){
     beam(l,dark,[e[0]+k*.105,e[1]+.06,.135],[w[0]+k*.11,w[1]+.075,.13],.042);
     beam(l,servo,[e[0]+k*.105,e[1]-.052,.16],[w[0]+k*.108,w[1]+.11,.16],.020);
   }
   // Fist is a stack of irregular segmented rectangular metal blocks.
   const fw=giant?.59:.37,fh=giant?.47:.31;
   block(f,dark,[w[0],w[1]-.13,-.13],[fw*1.06,fh*1.12,.40]);
   block(f,plate,[w[0],w[1]-.13,-.27],[fw,fh,.34]);
   armor(f,plate,PL.gauntlet,[w[0],w[1]-.13,-.475],[0,side*.055,0],[giant?1.24:.78,giant?1.28:.88,1]);
   for(let k=-2;k<=2;k++){
     const offset=k*fw*.155;
     block(f,servo,[w[0]+offset,w[1]-.21,-.48],[fw*.13,fh*.21,.05]);
     rivet(f,dark,w[0]+offset,w[1]-.31,-.515);
   }
   block(f,reactor,[w[0],w[1]-.04,-.497],[fw*.43,.025,.018],[0,0,0],false);
   disc(f,servo,[w[0]+side*.20,w[1]-.03,.00],.11,.09);
   armRig.push({upper,lower,wrist,side});
   // Armored long legs: shin has a flat splintered plane, not a sphere.
   const hip=P('UpLeg',legX),knee=P('Leg',legX),ankle=P('Foot',legX);
   const thigh=boneAt(`leg-${side}-hip`,hip,pelvis),shank=boneAt(`leg-${side}-knee`,knee,thigh),foot=boneAt(`leg-${side}-ankle`,ankle,shank);
   const v=assembly(thigh),c=assembly(shank),b=assembly(foot);
   facetLimb(v,dark,hip,knee,.19,.20);
   facetLimb(v,plate,[hip[0],hip[1]-.03,-.035],[knee[0],knee[1]+.035,-.04],.235,.22);
   armor(v,plate,PL.thigh,[(hip[0]+knee[0])*.5,(hip[1]+knee[1])*.5,-.265],[0,side*.06,side*-.08],[1.13,1.16,1]);
   for(const k of [-1,1])beam(v,k===1?servo:dark,[hip[0]+k*.14,hip[1]-.04,.11],[knee[0]+k*.15,knee[1]+.08,.09],k===1?.021:.039);
   disc(v,servo,[hip[0]+side*.17,hip[1]-.04,.11],.094,.095);
   facetLimb(c,dark,knee,ankle,.195,.23);
   facetLimb(c,plate,[knee[0],knee[1]-.03,-.025],[ankle[0],ankle[1]+.04,-.025],.238,.235);
   armor(c,plate,PL.shin,[(knee[0]+ankle[0])*.5,(knee[1]+ankle[1])*.5,-.28],[0,side*.04,side*-.06],[1.05,.95,1]);
   armor(c,plate,PL.knee,[knee[0],knee[1]-.025,-.352],[0,0,0],[1.03,1.03,1]);
   disc(c,dark,[knee[0]+side*.225,knee[1],knee[2]+.08],.16,.13);
   disc(c,servo,[knee[0]+side*.26,knee[1],knee[2]+.085],.11,.10);
   beam(c,dark,[knee[0]+side*.14,knee[1]-.12,.20],[ankle[0]+side*.14,ankle[1]+.08,.15],.039);
   beam(c,servo,[knee[0]+side*.14,knee[1]-.19,.21],[ankle[0]+side*.14,ankle[1]+.12,.18],.023);
   block(b,dark,[ankle[0],.085,-.10],[.38,.15,.49]);
   block(b,plate,[ankle[0],.14,-.20],[.39,.15,.44]);
   armor(b,plate,PL.heel,[ankle[0],.18,-.42],[0,0,0],[1.10,1.12,1]);
   for(let k=-1;k<=1;k++)block(b,plate,[ankle[0]+k*.135,.073,-.48],[.12,.09,.21]);
   block(b,servo,[ankle[0],.055,.20],[.23,.043,.21]);
   legRig.push({upper:thigh,lower:shank,foot,side,hip,knee,ankle});
 }
 return {legRig,armRig,groundGun:null,gunSignal:null,sensorAnchor:[0,1.97],hipHeight:joints.LeftUpLeg[1]};
}
