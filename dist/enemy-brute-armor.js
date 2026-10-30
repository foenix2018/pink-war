// BRUTE / LE BRISEUR — Pink Wars' heavy siege chassis.
// Armour geometry is created only once per cached enemy rig and baked into the
// existing SkinnedMesh material groups; no per-frame allocations, shadows or lights.
import * as T from './vendor/three.webgpu.min.js';
import {loft,bevelBox,matrix} from './geo.js';
import {profiledPanel} from './armor-profiles.js';

export const BRUTE_DESIGN=Object.freeze({
 name:'BRUTE / LE BRISEUR',visualRevision:'BRISEUR-2026-10',
 role:'armoured industrial siege robot',core:'triangular frontal reactor',
 weakpoints:'existing gameplay head hitzone',material:'worn graphite / scarred steel / exposed hydraulics'
});
const plate=(points,depth=.045,bulge=.022)=>profiledPanel(points,{depth,bulge,round:.09,detail:4});
const chest=plate([[-.175,-.18],[.17,-.18],[.225,-.095],[.22,.11],[.105,.205],[-.13,.20],[-.22,.11]],.075,.032);
const shoulder=plate([[-.19,-.14],[.165,-.14],[.235,-.045],[.205,.125],[.095,.193],[-.14,.186],[-.225,.065]],.085,.037);
const reactorBezel=plate([[0,-.145],[.126,.092],[.085,.139],[-.084,.139],[-.127,.092]],.028,.015);
const reactorGlass=plate([[0,-.106],[.091,.064],[.064,.091],[-.064,.091],[-.091,.064]],.015,.005);
const hipPlate=plate([[-.125,-.115],[.125,-.115],[.16,-.02],[.12,.135],[-.11,.135],[-.16,-.02]],.045,.018);
const kneePlate=plate([[-.125,-.095],[.125,-.095],[.155,.035],[.08,.13],[-.085,.13],[-.155,.035]],.05,.018);
const fistKnuckle=bevelBox(.275,.165,.175,.037,1);
const sole=bevelBox(.245,.041,.37,.012,1);
const armCowl=loft([[-.5,.12,.13,-.005],[-.32,.17,.17,0],[.13,.205,.18,0],[.42,.16,.14,.015],[.5,.115,.11,.02]],10);
const forearmGuard=loft([[-.5,.18,.16,-.012],[-.31,.235,.19,-.012],[.19,.245,.21,0],[.45,.175,.15,.01],[.5,.12,.11,.018]],10);
const thighGuard=loft([[-.5,.175,.16,0],[-.32,.205,.20,0],[.13,.24,.21,0],[.46,.17,.18,.018],[.5,.13,.13,.02]],10);
const shinGuard=loft([[-.5,.16,.16,0],[-.27,.19,.18,-.008],[.14,.19,.20,0],[.45,.13,.14,.01],[.5,.11,.12,.02]],10);
const jointRing=new T.TorusGeometry(.087,.018,5,12);
const smallerRing=new T.TorusGeometry(.052,.013,5,12);
const mainCore=new T.SphereGeometry(1,10,7);
const up=new T.Vector3(0,1,0);
const along=(build,geometry,material,start,end,width=1,depth=1)=>{
 const p=new T.Vector3(...start),q=new T.Vector3(...end),d=q.clone().sub(p);
 const axis=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize());
 build.add(geometry,material,new T.Matrix4().compose(p.add(q).multiplyScalar(.5),axis,new T.Vector3(width,d.length(),depth)));
};
export function bruteTorso({a,hips,armor,dark,servo,reactor}){
 // Shoulder armour stays on the animated thorax, not on the moving arm pivots.
 for(const side of [-1,1]){
   const x=side*.435;
   a.ellipsoid(dark,[x,1.53,.015],[.235,.20,.20]);
   a.add(shoulder,armor,matrix([x,1.605,-.105],[-.045,side*-.18,side*-.11],[1,1,1]));
   a.add(jointRing,servo,matrix([side*.49,1.54,.10],[0,Math.PI/2,0],[.86,.86,.86]));
   a.limb(servo,[side*.30,1.66,.13],[side*.49,1.66,.11],.024,.024);
   a.box(dark,[.115,.025,.06],[side*.43,1.75,.07],[0,0,side*.12],.009);
   for(let i=0;i<3;i++)a.box(servo,[.018,.013,.055],[side*(.39+i*.043),1.762,.06],[0,0,0],.002);
   // Split chest breastplate with visible mechanical seam around reactor.
   a.add(chest,armor,matrix([side*.184,1.395,-.206],[0,side*.095,side*-.025],[.97,1,1]));
   a.box(dark,[.12,.014,.044],[side*.19,1.58,-.20],[0,0,side*.10],.006);
   a.limb(dark,[side*.29,1.22,.10],[side*.24,1.55,.17],.037,.022);
   a.box(reactor,[.024,.045,.010],[side*.305,1.435,-.248],[0,0,side*.18],.003,false);
   hips.add(hipPlate,armor,matrix([side*.165,1.003,-.146],[0,side*.08,0],[1,1,1]));
   hips.add(smallerRing,servo,matrix([side*.205,.992,.13],[0,Math.PI/2,0],[1,1,1]));
 }
 // Deep, metal-framed ruby reactor with a recessed inverted triangular lens.
 a.add(reactorBezel,servo,matrix([0,1.415,-.264]));
 a.add(reactorGlass,reactor,matrix([0,1.415,-.290]),false);
 a.add(mainCore,reactor,matrix([0,1.419,-.311],[0,0,0],[.025,.027,.012]),false);
 a.box(dark,[.070,.15,.05],[0,1.195,-.217],[0,0,0],.012);
 for(let i=-1;i<=1;i++)a.box(servo,[.115,.019,.035],[0,1.14+i*.075,.132],[0,0,0],.005);
 for(const side of [-1,1]){
   a.box(dark,[.12,.33,.11],[side*.14,1.365,.21],[0,0,0],.018);
   for(let j=0;j<3;j++)a.box(servo,[.072,.020,.010],[side*.155,1.28+j*.072,.278],[0,0,0],.004);
 }
}
export function bruteHead({h,armor,dark,servo}){
 // A recessed, compact combat helmet keeps the approved live red optics clear.
 h.box(armor,[.13,.051,.11],[0,1.975,.045],[0,0,0],.017);
 for(const side of [-1,1]){
   h.ellipsoid(dark,[side*.135,1.852,.022],[.041,.063,.068]);
   h.box(servo,[.019,.079,.052],[side*.145,1.84,-.055],[0,side*-.18,0],.009);
   h.add(smallerRing,servo,matrix([side*.17,1.853,.049],[0,Math.PI/2,0],[.60,.60,.60]));
 }
}
export function bruteArm({side,s,e,w,u,l,f,armor,dark,servo,reactor}){
 // One oversized demolition gauntlet, one smaller gripping arm, matching the Briseur key art.
 const demolisher=side===-1,bulk=demolisher?1.26:.93;
 along(u,armCowl,armor,[s[0],s[1]-.055,s[2]],[e[0],e[1]+.035,e[2]],1.07*bulk,1.05*bulk);
 along(l,forearmGuard,armor,[e[0],e[1]-.025,e[2]],[w[0],w[1]+.045,w[2]],1.1*bulk,1.12*bulk);
 u.limb(servo,[s[0]+side*.078,s[1]-.015,s[2]+.11],[e[0]+side*.09,e[1]+.055,e[2]+.11],.026,.016);
 u.limb(dark,[s[0]+side*.104,s[1]-.028,s[2]+.10],[e[0]+side*.085,e[1]+.11,e[2]+.11],.040,.038);
 l.limb(servo,[e[0]-side*.072,e[1]-.022,e[2]+.115],[w[0]-side*.067,w[1]+.030,w[2]+.092],.027,.016);
 l.add(jointRing,dark,matrix([e[0],e[1],e[2]],[0,Math.PI/2,0],[.78,.78,.78]));
 f.ellipsoid(dark,[w[0],w[1]-.10,w[2]-.029],[.136*bulk,.148*bulk,.12*bulk]);
 f.add(fistKnuckle,armor,matrix([w[0],w[1]-.12,w[2]-.104],[0,0,0],[bulk,bulk,bulk]));
 // Three impact ridges and a red self-test LED on the demolisher gauntlet.
 for(let k=-1;k<=1;k++)f.box(servo,[.065*bulk,.036*bulk,.020],[w[0]+k*.067*bulk,w[1]-.152*bulk,w[2]-.202*bulk],[0,0,0],.006);
 f.box(reactor,[.062,.016,.012],[w[0],w[1]-.045,w[2]-.202],[0,0,0],.003,false);
 // Hinged wrist collar; all components are rigidly skinned to their native bones.
 f.add(smallerRing,servo,matrix([w[0],w[1],w[2]+.06],[Math.PI/2,0,0],[1,1,1]));
}
export function bruteLeg({side,hip,knee,ankle,v,c,b,armor,dark,servo,reactor}){
 along(v,thighGuard,armor,[hip[0],hip[1]-.045,hip[2]],[knee[0],knee[1]+.035,knee[2]],1.05,1.04);
 along(c,shinGuard,armor,[knee[0],knee[1]-.018,knee[2]],[ankle[0],ankle[1]+.045,ankle[2]],.92,1.0);
 v.limb(servo,[hip[0]+side*.09,hip[1]-.060,hip[2]+.115],[knee[0]+side*.081,knee[1]+.065,knee[2]+.105],.023,.018);
 v.limb(dark,[hip[0]+side*.09,hip[1]-.06,hip[2]+.098],[knee[0]+side*.078,knee[1]+.19,knee[2]+.094],.037,.033);
 c.add(kneePlate,armor,matrix([knee[0],knee[1]-.025,knee[2]-.197]));
 c.add(jointRing,servo,matrix([knee[0]+side*.18,knee[1],knee[2]],[0,Math.PI/2,0],[.76,.76,.76]));
 c.box(reactor,[.035,.065,.013],[knee[0],knee[1]-.035,knee[2]-.244],[0,0,0],.005,false);
 b.add(sole,dark,matrix([ankle[0],.025,ankle[2]-.095]));
 b.ellipsoid(armor,[ankle[0],.105,ankle[2]-.115],[.125,.073,.19]);
 for(const tx of [-1,1])b.box(servo,[.031,.020,.15],[ankle[0]+tx*.105,.038,ankle[2]-.15],[0,0,0],.006);
}
