// BRUTE / LE BRISEUR V2 — sculpted, animated siege mech matching the approved key art.
// All volumes are low-poly hard-surface meshes rigid-skinned to the existing RLH skeleton.
// No extra draw calls per component, no dynamic lights, no allocations in animation frames.
import * as T from './vendor/three.webgpu.min.js';
import {loft,bevelBox,matrix} from './geo.js';
import {profiledPanel} from './armor-profiles.js';

export const BRUTE_DESIGN=Object.freeze({
 name:'BRUTE / LE BRISEUR',visualRevision:'BRISEUR-V2-REFERENCE-2026-10',
 silhouette:'recessed red-slit helmet / overhanging shoulder pods / split armour / asymmetric demolition fist',
 reactor:'permanently scarlet inverted triangle in armored recess',
 construction:'independent rigged armor shells, hydraulic cylinders and armored boots'
});
const plate=(points,depth=.042,bulge=.02)=>profiledPanel(points,{depth,bulge,round:.08,detail:3});
const chest=plate([[-.21,-.17],[.17,-.18],[.25,-.055],[.225,.16],[.12,.235],[-.16,.22],[-.25,.075]],.073,.031);
const upperShoulder=plate([[-.29,-.13],[.23,-.16],[.33,-.045],[.25,.205],[.095,.26],[-.215,.24],[-.34,.085]],.11,.055);
const lateralShoulder=plate([[-.17,-.175],[.175,-.19],[.215,-.035],[.15,.22],[-.19,.20]],.06,.032);
const hipSkirt=plate([[-.14,-.115],[.15,-.12],[.18,.035],[.11,.145],[-.10,.14],[-.18,.045]],.054,.027);
const kneeArmor=plate([[-.155,-.11],[.15,-.115],[.195,.028],[.12,.175],[-.14,.165],[-.19,.02]],.075,.025);
const reactorBorder=plate([[0,-.17],[.155,.093],[.117,.16],[-.11,.16],[-.15,.095]],.040,.024);
const reactorLens=plate([[0,-.132],[.117,.084],[.08,.112],[-.08,.112],[-.118,.08]],.015,.007);
const visor=plate([[-.142,-.006],[.145,-.006],[.155,.012],[.107,.042],[-.107,.042],[-.159,.011]],.012,.005);
const crown=loft([[1.735,.056,.075,.042],[1.79,.125,.105,.026],[1.855,.156,.136,.020],[1.92,.144,.124,.036],[1.98,.084,.074,.055]],10);
const pauldronPod=loft([[1.35,.185,.145,.01],[1.43,.255,.20,.015],[1.56,.30,.25,.026],[1.67,.285,.245,.025],[1.765,.22,.19,.052],[1.79,.125,.14,.060]],10);
const upperArm=loft([[-.5,.145,.125,0],[-.30,.183,.168,0],[.10,.19,.185,0],[.41,.16,.154,.013],[.5,.125,.12,.023]],9);
const forearm=loft([[-.5,.17,.15,-.016],[-.3,.235,.22,-.012],[.08,.25,.24,.0],[.40,.185,.17,.020],[.5,.14,.12,.022]],9);
const thigh=loft([[-.5,.185,.17,-.013],[-.3,.225,.21,-.013],[.18,.235,.22,.015],[.45,.17,.17,.02],[.5,.14,.14,.02]],9);
const shin=loft([[-.5,.18,.17,-.012],[-.25,.215,.21,-.013],[.12,.235,.235,0],[.40,.18,.185,.015],[.5,.15,.14,.021]],9);
const impactFist=loft([[ -.20,.205,.18,-.10],[-.08,.262,.235,-.126],[.11,.28,.235,-.14],[.25,.235,.18,-.11]],10);
const jointRing=new T.TorusGeometry(.09,.018,4,10),smallRing=new T.TorusGeometry(.05,.013,4,10);
const knuckle=bevelBox(.31,.17,.23,.025,1),sole=bevelBox(.29,.043,.40,.012,1);
const up=new T.Vector3(0,1,0);
function shellBetween(build,geometry,material,start,end,width=1,depth=1){
 const a=new T.Vector3(...start),b=new T.Vector3(...end),delta=b.clone().sub(a);
 const q=new T.Quaternion().setFromUnitVectors(up,delta.clone().normalize());
 build.add(geometry,material,new T.Matrix4().compose(a.add(b).multiplyScalar(.5),q,new T.Vector3(width,delta.length(),depth)));
}
function seam(build,material,from,to,r=.014){build.limb(material,from,to,r,r);}
export function bruteTorso({a,hips,armor,dark,servo,reactor}){
 // Forward-leaning armored fuselage under an oversized shoulder arch.
 a.ellipsoid(dark,[0,1.475,.075],[.37,.35,.23]);
 for(const side of [-1,1]){
   const x=side*.46;
   a.add(pauldronPod,dark,matrix([x,0,.084],[0,0,side*.08],[1.07,1,1.15]));
   a.add(upperShoulder,armor,matrix([x,1.625,-.221],[-.035,side*-.09,side*-.08],[1.04,1.08,1]));
   a.add(lateralShoulder,armor,matrix([side*.745,1.59,.025],[0,side*.72,0],[.96,1.16,1]));
   a.add(jointRing,servo,matrix([side*.65,1.46,.18],[0,Math.PI/2,0],[1,1,1]));
   // The broad split chest plate sweeps around, not across, the open reactor.
   a.add(chest,armor,matrix([side*.208,1.42,-.235],[0,side*.17,side*-.035],[1.0,.99,1]));
   a.add(hipSkirt,armor,matrix([side*.20,1.018,-.186],[0,side*.14,side*-.065],[1.07,1,1]));
   a.ellipsoid(dark,[side*.32,1.07,.04],[.15,.125,.15]);
   seam(a,servo,[side*.27,1.58,.14],[side*.36,1.34,.18],.022);
   // Raised, non-cubical shoulder-panel fractures and stencilled mechanical rivets.
   for(let j=0;j<3;j++)a.add(smallRing,servo,matrix([x+side*(j-1)*.11,1.688+(j===1?.075:0),-.29],[0,0,0],[.115,.115,.115]));
   a.box(dark,[.225,.018,.045],[side*.44,1.735,-.20],[0,0,side*-.10],.006);
   a.box(reactor,[.085,.013,.008],[side*.54,1.737,-.240],[0,0,side*-.10],.003,false);
   // Back spine and shock absorbers are legible from the rear as in the turnarounds.
   a.limb(dark,[side*.32,1.61,.20],[side*.30,1.24,.23],.044,.035);
   a.limb(servo,[side*.32,1.60,.21],[side*.30,1.40,.25],.022,.018);
 }
 // Recessed triangular chest reactor remains red while the separate visor changes alert state.
 a.add(reactorBorder,servo,matrix([0,1.425,-.337]));
 a.add(reactorLens,reactor,matrix([0,1.425,-.366]),false);
 a.box(dark,[.24,.026,.06],[0,1.61,-.26],[0,0,0],.01);
 a.box(reactor,[.055,.013,.009],[0,1.573,-.345],[0,0,0],.002,false);
 a.add(smallRing,servo,matrix([0,1.25,-.295],[0,0,0],[.7,.7,.7]));
 // Vertical radiator / vertebrae, with one scarlet rear rail.
 a.box(dark,[.18,.37,.09],[0,1.48,.289],[0,0,0],.011);
 for(let i=0;i<4;i++){
   a.box(servo,[.152,.023,.018],[0,1.31+i*.082,.34],[0,0,0],.004);
   a.box(reactor,[.029,.049,.012],[0,1.34+i*.085,.364],[0,0,0],.003,false);
 }
}
export function bruteHead({h,armor,dark,servo,optics}){
 // Unlike the old biped head: this helmet sits inside the shoulder cavity.
 h.add(crown,armor);
 h.add(visor,optics,matrix([0,1.877,-.193]),false);
 h.box(armor,[.14,.017,.075],[0,1.962,-.086],[0,0,0],.008);
 h.box(dark,[.118,.045,.06],[0,1.784,-.11],[.10,0,0],.008);
 for(const side of [-1,1]){
   h.ellipsoid(dark,[side*.153,1.861,.026],[.043,.074,.09]);
   h.add(smallRing,servo,matrix([side*.174,1.875,.017],[0,Math.PI/2,0],[.69,.69,.69]));
   h.box(armor,[.065,.08,.06],[side*.133,1.819,-.08],[0,side*.15,0],.01);
 }
}
export function bruteArm({side,s,e,w,u,l,f,armor,dark,servo,reactor}){
 const demolisher=side===-1,bulk=demolisher?1.35:.88;
 // Original upper-arm / elbow / hand bones remain responsible for every surface.
 shellBetween(u,upperArm,armor,[s[0],s[1]-.06,s[2]],[e[0],e[1]+.02,e[2]],bulk*1.04,1.04);
 shellBetween(l,forearm,armor,[e[0],e[1]-.034,e[2]],[w[0],w[1]+.05,w[2]],bulk*1.11,bulk);
 // Exposed dual hydraulic ram, chrome pistons and black hoses, attached to moving segments.
 for(const offset of [-1,1]){
   const x=s[0]+side*.075+offset*.052,xe=e[0]+side*.08+offset*.052;
   seam(u,dark,[x,s[1]-.05,s[2]+.155],[xe,e[1]+.095,e[2]+.14],.036);
   seam(u,servo,[x,s[1]-.12,s[2]+.169],[xe,e[1]+.14,e[2]+.151],.017);
 }
 l.add(jointRing,servo,matrix([e[0]+side*.17,e[1],e[2]+.05],[0,Math.PI/2,0],[.95,.95,.95]));
 l.limb(dark,[e[0]+side*.09,e[1]+.01,e[2]+.14],[w[0]+side*.075,w[1]+.03,w[2]+.14],.036,.032);
 l.limb(servo,[e[0]+side*.085,e[1]-.075,e[2]+.165],[w[0]+side*.085,w[1]+.08,w[2]+.164],.019,.015);
 // Huge asymmetric hydraulic battering fist with five transverse armoured knuckles.
 const fistScale=demolisher?1.35:.80;
 f.add(impactFist,dark,matrix([w[0],w[1]-.133,w[2]-.048],[0,0,0],[fistScale,fistScale,fistScale]));
 f.add(knuckle,armor,matrix([w[0],w[1]-.15,w[2]-.16],[0,0,0],[fistScale,1.10*fistScale,fistScale]));
 for(let j=-2;j<=2;j++){
   f.box(servo,[.041,.027,.018],[w[0]+j*.050*fistScale,w[1]-.184,w[2]-.29*fistScale],[0,0,0],.004);
 }
 f.box(reactor,[.082,.02,.011],[w[0],w[1]-.05,w[2]-.285*fistScale],[0,0,0],.003,false);
 f.add(smallRing,servo,matrix([w[0],w[1],w[2]+.07],[Math.PI/2,0,0],[1,1,1]));
}
export function bruteLeg({side,hip,knee,ankle,v,c,b,armor,dark,servo,reactor}){
 // Compact ultra-heavy legs: large hip armor, exposed circular knees, heavy ankle boots.
 shellBetween(v,thigh,armor,[hip[0],hip[1]-.04,hip[2]],[knee[0],knee[1]+.04,knee[2]],1.13,1.12);
 shellBetween(c,shin,armor,[knee[0],knee[1]-.02,knee[2]],[ankle[0],ankle[1]+.055,ankle[2]],1.0,1.05);
 v.ellipsoid(dark,[hip[0]+side*.10,hip[1]-.11,hip[2]+.04],[.104,.15,.10]);
 seam(v,dark,[hip[0]+side*.13,hip[1]-.05,hip[2]+.135],[knee[0]+side*.11,knee[1]+.085,knee[2]+.12],.033);
 seam(v,servo,[hip[0]+side*.14,hip[1]-.16,hip[2]+.15],[knee[0]+side*.11,knee[1]+.11,knee[2]+.15],.014);
 c.add(kneeArmor,armor,matrix([knee[0],knee[1]-.018,knee[2]-.242]));
 c.add(jointRing,servo,matrix([knee[0]+side*.215,knee[1]+.01,knee[2]],[0,Math.PI/2,0],[1.10,1.10,1.10]));
 c.add(smallRing,dark,matrix([knee[0]+side*.224,knee[1]+.01,knee[2]],[0,Math.PI/2,0],[1.14,1.14,1.14]));
 c.box(reactor,[.034,.063,.012],[knee[0],knee[1]-.047,knee[2]-.286],[0,0,0],.004,false);
 c.limb(servo,[knee[0]+side*.11,knee[1]-.095,knee[2]+.13],[ankle[0]+side*.11,ankle[1]+.09,ankle[2]+.13],.017,.016);
 b.add(sole,dark,matrix([ankle[0],.027,ankle[2]-.11],[0,0,0],[1.15,1,1.04]));
 b.ellipsoid(armor,[ankle[0],.111,ankle[2]-.145],[.152,.090,.207]);
 for(const sign of [-1,1])b.box(armor,[.078,.055,.145],[ankle[0]+sign*.10,.084,ankle[2]-.21],[0,0,sign*.035],.010);
}
