// PO-07 « Poursuivant » and SY-05 « Synthétique » — chassis redrawn from the Pink Wars enemy posters (4 Nov 2026):
// worn graphite riveted plates, exposed black mechanics, scarlet light seams, stencilled designations.
// The game names stay PO-07 and SY-05. Front is −Z, units are metres. Every rigid piece is baked by the enemy factory
// into shared skinned batches; nothing is allocated per frame.
import * as T from './vendor/three.webgpu.min.js';
import {matrix,loft} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';

export const POSTER_CHASSIS_REVISION='poster-graphite-v1';
const plate=(points,depth=.03)=>profiledPanel(points,{depth,bulge:.008,round:.022,detail:3});
const cylinder=new T.CylinderGeometry(1,1,1,12),sphere=new T.SphereGeometry(1,8,5);
const reference=HUMAN_REFERENCE.joints;

// Shared pieces.
const chestPO=plate([[-.12,.15],[.09,.19],[.15,.08],[.11,-.08],[.02,-.20],[-.10,-.10],[-.15,.03]],.05);
const pauldronPO=plate([[-.16,-.06],[.08,-.15],[.20,-.03],[.17,.12],[-.02,.19],[-.19,.09]],.06);
const thighPO=plate([[-.085,.20],[.075,.21],[.11,.05],[.06,-.22],[-.06,-.20],[-.12,.02]],.04);
const shinPO=plate([[-.055,.23],[.075,.24],[.07,-.20],[.005,-.28],[-.07,-.17]],.032);
const forearmPO=plate([[-.055,.14],[.055,.19],[.085,.04],[.045,-.17],[-.045,-.15],[-.075,.03]],.04);
// Long swept-back hunter skull: lofted upright, then laid backwards and raised towards the rear.
const skullPO=loft([[0,.035,.03],[.05,.085,.068],[.15,.108,.085],[.27,.092,.074],[.37,.058,.048],[.43,.018,.018]],10).toNonIndexed();
skullPO.rotateX(Math.PI/2-.28);skullPO.translate(0,1.865,-.165);skullPO.computeVertexNormals();

const chestSY=plate([[-.15,.17],[.11,.20],[.17,.10],[.16,-.10],[.06,-.17],[-.10,-.15],[-.17,-.02]],.06);
const pauldronSY=plate([[-.15,-.10],[.12,-.13],[.20,.0],[.18,.15],[.02,.20],[-.17,.12],[-.20,.0]],.07);
const plateSY=plate([[-.09,-.13],[.09,-.13],[.11,.10],[.06,.15],[-.06,.15],[-.11,.10]],.045);
const helmSY=loft([[1.735,.07,.07,.005],[1.79,.125,.115,.012],[1.89,.15,.145,.012],[1.975,.13,.128,.022],[2.02,.075,.08,.03]],8).toNonIndexed();helmSY.computeVertexNormals();
const triangle=new T.ShapeGeometry(new T.Shape([new T.Vector2(-.045,.03),new T.Vector2(.045,.03),new T.Vector2(0,-.045)]));

// Stencilled designation (browser only; headless tests build without it).
const stencils=new Map();
function stencil(text,line){
 if(typeof document==='undefined')return null;
 const key=text+'|'+line;if(stencils.has(key))return stencils.get(key);
 const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle='#c9c2bd';ctx.font='bold 62px monospace';ctx.fillText(text,12,66);
 ctx.font='14px monospace';ctx.fillText(line,16,94);ctx.fillRect(16,106,150,3);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
 const m=new T.MeshStandardMaterial({map,transparent:true,alphaTest:.1,roughness:.88,polygonOffset:true,polygonOffsetFactor:-1});
 m.name='ORDRE stencil '+text;stencils.set(key,m);return m;
}

function kit({armor,dark,servo,glow}){
 const panel=(a,geo,p,r=[0,0,0],s=[1,1,1],m=armor)=>a.add(geo,m,matrix(p,r,s),!m.isMeshBasicMaterial);
 const motor=(a,p,r=.06,w=.07)=>{a.add(cylinder,dark,matrix(p,[0,0,Math.PI/2],[r,w,r]));a.add(cylinder,servo,matrix([p[0]+Math.sign(p[0]||1)*w*.55,p[1],p[2]],[0,0,Math.PI/2],[r*.55,.016,r*.55]));};
 const cable=(a,points,r=.012,mat=dark)=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,5,false);a.add(g,mat,null,!mat.isMeshBasicMaterial);g.dispose();};
 const bolt=(a,x,y,z,r=.008)=>a.add(sphere,servo,matrix([x,y,z],[0,0,0],[r,r,r*.7]));
 const seam=(a,size,p,r=[0,0,0])=>a.box(glow,size,p,r,.002,false);
 return {panel,motor,cable,bolt,seam};
}
const tilt=(from,to)=>Math.atan2(to[0]-from[0],from[1]-to[1]);

// PO-07: gaunt security hunter, narrow waist, long swept skull, reverse knees, red seams and coiled hoses.
export function buildPursuer({armor,dark,servo,glow,optics,boneAt,assembly,thorax,pelvis}){
 const body=assembly(thorax),hips=assembly(pelvis),armRig=[],legRig=[];
 const {panel,motor,cable,bolt,seam}=kit({armor,dark,servo,glow}),label=stencil('PO-07','ORDRE / SÉCURITÉ');
 body.limb(dark,[0,1.05,.04],[0,1.63,.04],.065,.10);
 for(let k=0;k<4;k++)body.box(dark,[.13+k*.03,.034,.10],[0,1.15+k*.062,-.035],[.12,0,0],.01);
 body.box(armor,[.16,.12,.07],[0,1.585,-.10],[.2,0,0],.012);
 for(const side of [-1,1]){
  panel(body,chestPO,[side*.115,1.465,-.135],[.08,side*-.16,side*-.12]);
  seam(body,[.012,.09,.01],[side*.07,1.43,-.19],[.08,0,side*-.12]);
  for(const yy of [1.40,1.55])bolt(body,side*.17,yy,-.17);
  for(let k=0;k<3;k++)body.limb(servo,[side*.035,1.20+k*.06,-.065],[side*.14,1.24+k*.06,-.02],.011,.008);
  // Coiled red hoses from the collar to the waist.
  cable(body,[[side*.05,1.64,-.05],[side*.13,1.52,-.17],[side*.10,1.33,-.13],[side*.04,1.15,-.07]],.009,glow);
  cable(body,[[side*.08,1.63,.02],[side*.18,1.45,.05],[side*.12,1.20,.10]],.015);
  panel(body,pauldronPO,[side*.255,1.60,-.005],[.16,side*-.32,side*-.42]);
  panel(body,pauldronPO,[side*.275,1.555,.06],[.0,side*1.0,side*-.3],[.7,.75,1]);
  if(label&&side===-1)panel(body,new T.PlaneGeometry(.13,.065),[side*.262,1.625,-.065],[.16,side*-.32,side*-.42],[1,1,1],label);
  for(const yy of [1.56,1.67])bolt(body,side*.29,yy,-.08);
  body.box(armor,[.085,.30,.08],[side*.085,1.42,.15],[.08,0,0],.012);
  seam(body,[.01,.18,.01],[side*.085,1.42,.193],[.08,0,0]);
 }
 // Rear antenna rod with a red tip, as on the poster.
 body.limb(dark,[-.10,1.50,.16],[-.17,2.17,.27],.015,.008);body.add(sphere,glow,matrix([-.17,2.18,.27],[0,0,0],[.012,.012,.012]),false);
 hips.box(dark,[.23,.12,.17],[0,1.065,0],[0,0,0],.016);
 hips.box(armor,[.12,.13,.05],[0,1.02,-.10],[.1,0,0],.012);
 for(const side of [-1,1]){hips.box(armor,[.09,.16,.11],[side*.15,1.06,-.04],[.1,0,side*-.2],.016);seam(hips,[.008,.09,.008],[side*.17,1.06,-.10],[.1,0,side*-.2]);}
 // Head.
 const neck=boneAt('sensor-head',[0,1.70,.02],thorax),head=assembly(neck);
 body.limb(servo,[0,1.60,.04],[0,1.78,-.02],.032,.026);head.limb(dark,[0,1.74,0],[0,1.84,-.04],.03,.03);
 head.add(skullPO,armor);
 head.box(dark,[.17,.05,.05],[0,1.862,-.125],[.1,0,0],.008);
 head.box(optics,[.15,.016,.012],[0,1.872,-.152],[.1,0,0],.002,false);
 head.add(sphere,optics,matrix([.055,1.93,-.08],[0,0,0],[.014,.014,.014]),false);
 head.box(armor,[.026,.045,.30],[0,1.965,.09],[-.27,0,0],.008);
 for(const side of [-1,1]){
  head.limb(dark,[side*.05,1.84,-.10],[side*.032,1.77,-.125],.015,.009);
  head.box(armor,[.03,.07,.16],[side*.09,1.89,.0],[-.25,side*.12,0],.008);
  cable(head,[[side*.07,1.84,.04],[side*.10,1.76,.07],[side*.06,1.66,.06]],.008,glow);
 }
 for(const side of [-1,1]){
  // Arms keep the reference reach so the field-rifle IK grips stay valid.
  const s=[side*.20,1.492,.015],e=[side*.30,1.258,.043],w=[side*.36,1.005,-.03];
  const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
  const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
  motor(u,s,.05,.06);u.limb(dark,s,e,.036,.03);u.limb(armor,[s[0]+side*.01,s[1]-.06,s[2]-.01],[e[0],e[1]+.05,e[2]-.01],.05,.036);
  u.limb(servo,[s[0]+side*.03,s[1]-.05,s[2]+.04],[e[0]+side*.03,e[1]+.04,e[2]+.04],.01,.008);
  motor(l,e,.045,.06);l.limb(dark,e,w,.032,.026);
  const mid=[(e[0]+w[0])/2,(e[1]+w[1])/2,(e[2]+w[2])/2],a=side*tilt([Math.abs(e[0]),e[1]],[Math.abs(w[0]),w[1]]);
  panel(l,forearmPO,[mid[0]+side*.012,mid[1],mid[2]-.03],[0,side*-.12,a],[.75,.8,1]);
  seam(l,[.01,.15,.01],[mid[0]+side*.014,mid[1],mid[2]-.062],[0,0,a]);
  for(const yy of [-.06,.06])bolt(l,mid[0]+side*.03,mid[1]+yy,mid[2]-.06);
  cable(l,[[e[0]+side*.03,e[1],e[2]+.04],[mid[0]+side*.05,mid[1],mid[2]+.03],[w[0]+side*.02,w[1]+.03,w[2]+.03]],.008,glow);
  f.box(dark,[.07,.09,.045],[w[0],w[1]-.05,w[2]],[0,0,0],.009);
  for(let k=0;k<4;k++){const x=w[0]+(k-1.5)*.019;f.limb(servo,[x,w[1]-.075,w[2]],[x,w[1]-.15,w[2]-.03],.007,.005);f.limb(dark,[x,w[1]-.15,w[2]-.03],[x,w[1]-.185,w[2]-.075],.005,.0015);}
  f.limb(servo,[w[0]-side*.04,w[1]-.03,w[2]],[w[0]-side*.065,w[1]-.10,w[2]-.05],.008,.004);
  armRig.push({upper,lower,wrist,side});
  // Reverse-jointed legs: rear knee, long shin, forward toe claws and a heel spur.
  const hip=[side*.12,1.08,.02],knee=[side*.17,.67,.20],ankle=[side*.19,.14,-.02];
  const upperLeg=boneAt(`leg-${side}-hip`,hip,pelvis),lowerLeg=boneAt(`leg-${side}-knee`,knee,upperLeg),foot=boneAt(`leg-${side}-ankle`,ankle,lowerLeg);
  const v=assembly(upperLeg),c=assembly(lowerLeg),b=assembly(foot);
  motor(v,hip,.06);v.limb(dark,hip,knee,.048,.04);panel(v,thighPO,[side*.155,.90,-.01],[.22,side*-.12,side*-.07],[.85,.95,1]);
  seam(v,[.009,.16,.009],[side*.17,.91,-.06],[.22,0,0]);
  motor(c,knee,.06);c.limb(dark,knee,ankle,.033,.024);
  c.limb(servo,[side*.21,.64,.17],[side*.23,.19,-.015],.016,.009);c.limb(armor,[side*.15,.61,.14],[side*.16,.21,-.03],.027,.019);
  panel(c,shinPO,[side*.17,.43,.02],[.30,0,0],[.62,.85,.8]);seam(c,[.009,.17,.01],[side*.19,.46,-.04],[.30,0,0]);
  motor(b,ankle,.034);
  for(const toe of [-1,0,1])b.limb(armor,[ankle[0]+toe*.022,.085,-.035],[ankle[0]+toe*.06,.025,-.20+Math.abs(toe)*.03],.022,.005);
  b.limb(dark,[ankle[0],.09,.015],[ankle[0],.03,.11],.026,.012);
  legRig.push({upper:upperLeg,lower:lowerLeg,foot,side,hip,knee,ankle});
 }
 return {legRig,armRig,bladeRig:[],groundGun:null,gunSignal:null,sensorAnchor:[0,1.872],hipHeight:reference.LeftUpLeg[1]};
}

// SY-05: armoured tactical android — broad layered plates, belt and pouches, ear-cup helmet with antennas,
// red triangle emblems and lit seams, heavy boots. Upright knees (human gait).
export function buildSynthetic({armor,dark,servo,glow,optics,boneAt,assembly,thorax,pelvis}){
 const body=assembly(thorax),hips=assembly(pelvis),armRig=[],legRig=[];
 const {panel,motor,cable,bolt,seam}=kit({armor,dark,servo,glow}),label=stencil('SY-05','ORDRE / TACTIQUE');
 body.limb(dark,[0,1.06,.03],[0,1.62,.03],.15,.17);
 for(const side of [-1,1]){
  panel(body,chestSY,[side*.12,1.44,-.15],[.04,side*-.12,side*-.05]);
  body.add(triangle,glow,matrix([side*.15,1.50,-.21],[.04,side*-.12,0],[1,1,1]),false);
  for(const yy of [1.36,1.53])for(const xx of [.07,.22])bolt(body,side*xx,yy,-.205);
  panel(body,pauldronSY,[side*.30,1.58,-.01],[.10,side*-.25,side*-.30],[1.05,1,1]);
  panel(body,pauldronSY,[side*.32,1.52,.05],[.0,side*.9,side*-.25],[.75,.8,1]);
  body.add(triangle,glow,matrix([side*.31,1.60,-.085],[.10,side*-.25,side*-.30],[.8,.8,1]),false);
  seam(body,[.012,.11,.01],[side*.36,1.46,-.04],[0,0,side*-.25]);
  body.box(armor,[.12,.34,.12],[side*.11,1.42,.17],[.05,0,0],.016);
  seam(body,[.01,.20,.01],[side*.17,1.42,.235],[.05,0,0]);
  cable(body,[[side*.08,1.64,.04],[side*.20,1.50,.10],[side*.16,1.26,.14]],.016);
 }
 if(label)body.add(new T.PlaneGeometry(.14,.07),label,matrix([0,1.47,-.222],[.04,0,0]));
 body.box(armor,[.08,.20,.05],[0,1.34,-.19],[.04,0,0],.012);
 for(let k=0;k<3;k++){body.box(armor,[.30-k*.02,.055,.20],[0,1.25-k*.06,-.05],[.06,0,0],.012);for(const side of [-1,1])body.box(dark,[.07,.05,.16],[side*(.17-k*.01),1.25-k*.06,-.02],[0,0,side*-.1],.008);}
 body.box(armor,[.20,.10,.10],[0,1.635,.0],[0,0,0],.016);
 // Tactical belt with pouches.
 hips.box(dark,[.36,.06,.24],[0,1.07,0],[0,0,0],.012);
 for(const [x,z] of [[-.13,-.11],[0,-.125],[.13,-.11],[-.18,.0],[.18,.0]])hips.box(armor,[.07,.075,.05],[x,1.05,z],[0,Math.atan2(x,-z)*(z?1:0),0],.008);
 for(const side of [-1,1]){hips.add(plateSY,armor,matrix([side*.13,.95,-.10],[.12,side*-.15,side*-.06],[.8,.8,1]));seam(hips,[.008,.07,.008],[side*.15,.95,-.135],[.12,0,0]);}
 // Head: rounded combat helmet, ear cups with antennas, scarlet visor slit.
 const neck=boneAt('sensor-head',reference.Head,thorax),head=assembly(neck);
 head.limb(dark,[0,1.60,.02],[0,1.77,.02],.05,.045);
 head.add(helmSY,armor);
 head.box(dark,[.25,.06,.06],[0,1.88,-.13],[0,0,0],.01);
 head.box(optics,[.22,.018,.012],[0,1.88,-.162],[0,0,0],.002,false);
 head.box(armor,[.12,.07,.05],[0,1.79,-.125],[-.15,0,0],.012);
 for(const side of [-1,1]){
  head.add(cylinder,dark,matrix([side*.15,1.87,.0],[0,0,Math.PI/2],[.055,.05,.055]));
  head.add(cylinder,servo,matrix([side*.177,1.87,.0],[0,0,Math.PI/2],[.032,.012,.032]));
  head.add(sphere,glow,matrix([side*.183,1.87,.0],[0,0,0],[.012,.012,.012]),false);
 }
 head.limb(dark,[.15,1.92,.0],[.17,2.12,.03],.008,.005);head.limb(dark,[.13,1.94,.03],[.14,2.07,.06],.007,.004);
 for(const side of [-1,1]){
  const s=[side*.205,1.492,.015],e=[side*.315,1.258,.043],w=[side*.38,1.005,-.03];
  const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
  const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
  motor(u,s,.065,.08);u.limb(dark,s,e,.05,.045);u.limb(armor,[s[0]+side*.01,s[1]-.07,s[2]],[e[0],e[1]+.06,e[2]],.07,.06);
  for(let k=0;k<3;k++)u.box(dark,[.15,.008,.15],[s[0]+(e[0]-s[0])*(.35+k*.15),s[1]+(e[1]-s[1])*(.35+k*.15),s[2]],[0,0,side*.4],.002);
  motor(l,e,.06,.08);l.limb(dark,e,w,.045,.04);
  const mid=[(e[0]+w[0])/2,(e[1]+w[1])/2,(e[2]+w[2])/2],a=side*tilt([Math.abs(e[0]),e[1]],[Math.abs(w[0]),w[1]]);
  l.limb(armor,[e[0],e[1]-.05,e[2]],[w[0],w[1]+.06,w[2]],.07,.062);
  seam(l,[.012,.17,.01],[mid[0]+side*.03,mid[1],mid[2]-.07],[0,0,a]);seam(l,[.012,.08,.01],[mid[0]+side*.06,mid[1]+.04,mid[2]-.04],[0,side*-.5,a]);
  for(const yy of [-.07,.07])bolt(l,mid[0]+side*.05,mid[1]+yy,mid[2]-.065);
  f.box(armor,[.09,.10,.06],[w[0],w[1]-.055,w[2]],[0,0,0],.012);
  for(let k=0;k<4;k++){const x=w[0]+(k-1.5)*.021;f.limb(dark,[x,w[1]-.09,w[2]-.01],[x,w[1]-.15,w[2]-.04],.011,.009);}
  f.limb(dark,[w[0]-side*.045,w[1]-.04,w[2]-.01],[w[0]-side*.06,w[1]-.10,w[2]-.05],.011,.008);
  armRig.push({upper,lower,wrist,side});
  const hip=[side*.124,.966,-.005],knee=[side*.133,.55,-.025],ankle=[side*.165,.149,-.001];
  const upperLeg=boneAt(`leg-${side}-hip`,hip,pelvis),lowerLeg=boneAt(`leg-${side}-knee`,knee,upperLeg),foot=boneAt(`leg-${side}-ankle`,ankle,lowerLeg);
  const v=assembly(upperLeg),c=assembly(lowerLeg),b=assembly(foot);
  motor(v,hip,.075,.09);v.limb(dark,hip,knee,.08,.07);v.limb(armor,[hip[0],hip[1]-.04,hip[2]-.01],[knee[0],knee[1]+.07,knee[2]-.01],.115,.09);v.box(armor,[.13,.2,.06],[hip[0]+side*.07,.80,hip[2]],[0,0,side*.06],.014);
  panel(v,plateSY,[hip[0]+side*.01,.77,-.085],[.05,side*-.1,0],[.85,1.05,1]);
  // Knee: round actuator disc on the outside, plate in front.
  c.add(cylinder,dark,matrix([knee[0]+side*.06,knee[1],knee[2]],[0,0,Math.PI/2],[.07,.05,.07]));
  c.add(cylinder,servo,matrix([knee[0]+side*.088,knee[1],knee[2]],[0,0,Math.PI/2],[.04,.012,.04]));
  c.box(armor,[.12,.10,.06],[knee[0],knee[1],knee[2]-.07],[.1,0,0],.014);
  c.limb(dark,knee,ankle,.065,.055);c.limb(armor,[knee[0],knee[1]-.07,knee[2]-.01],[ankle[0],ankle[1]+.09,ankle[2]-.01],.095,.075);c.box(armor,[.07,.22,.07],[knee[0]+side*.075,.36,knee[2]+.01],[0,0,side*.04],.012);
  seam(c,[.011,.20,.01],[(knee[0]+ankle[0])/2+side*.02,.35,-.095],[.02,0,0]);
  b.add(cylinder,dark,matrix([ankle[0]+side*.05,ankle[1],ankle[2]],[0,0,Math.PI/2],[.05,.04,.05]));
  b.box(armor,[.15,.09,.30],[ankle[0],.06,ankle[2]-.06],[0,0,0],.018);b.box(dark,[.16,.03,.32],[ankle[0],.015,ankle[2]-.06],[0,0,0],.006);
  b.box(armor,[.13,.06,.08],[ankle[0],.10,ankle[2]-.17],[.35,0,0],.012);
  legRig.push({upper:upperLeg,lower:lowerLeg,foot,side,hip,knee,ankle});
 }
 return {legRig,armRig,bladeRig:[],groundGun:null,gunSignal:null,sensorAnchor:[0,1.88],hipHeight:reference.LeftUpLeg[1]};
}
