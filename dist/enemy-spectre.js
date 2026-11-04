// SPECTRE K-9 — independent light hunter chassis. Front -Z, units in metres.
// All rigid plates are baked into shared skinned batches by the enemy factory.
import * as T from './vendor/three.webgpu.min.js';
import {matrix,loft} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';
const plate=(points,depth=.03)=>profiledPanel(points,{depth,bulge:.009,round:.025,detail:3});
const chest=plate([[-.13,.18],[.10,.21],[.17,.10],[.105,-.10],[.01,-.26],[-.12,-.12],[-.17,.04]],.055);
const shoulder=plate([[-.15,-.09],[.10,-.16],[.22,-.01],[.17,.14],[-.04,.22],[-.22,.10]],.065);
const thigh=plate([[-.10,.21],[.085,.22],[.13,.06],[.07,-.24],[-.07,-.22],[-.14,.02]],.045);
const shin=plate([[-.06,.24],[.085,.25],[.075,-.21],[.005,-.30],[-.075,-.18]],.035);
const fin=plate([[-.065,-.31],[.065,-.28],[.045,.15],[-.035,.38],[-.065,.19]],.042);
const forearm=plate([[-.065,.15],[.065,.22],[.105,.05],[.055,-.23],[-.055,-.19],[-.09,.04]],.045);
const blade=plate([[-.035,.04],[.048,.06],[.045,-.29],[-.005,-.62],[-.035,-.37]],.022);
const headShell=loft([[1.72,.045,.045,.01],[1.77,.10,.09,-.02],[1.88,.14,.12,-.025],[1.96,.105,.10,.005],[1.98,.035,.04,.02]],6).toNonIndexed();headShell.computeVertexNormals();
const cylinder=new T.CylinderGeometry(1,1,1,12),sphere=new T.SphereGeometry(1,8,5);
export const SPECTRE_REVISION='K9-independent-hunter-v2';
export function buildSpectre({armor,dark,servo,glow,boneAt,assembly,thorax,pelvis}){
 const body=assembly(thorax),hips=assembly(pelvis),armRig=[],legRig=[],bladeRig=[];
 const panel=(a,geo,p,r=[0,0,0],s=[1,1,1],m=armor)=>a.add(geo,m,matrix(p,r,s),!m.isMeshBasicMaterial);
 const motor=(a,p,r=.07)=>{a.add(cylinder,dark,matrix(p,[0,0,Math.PI/2],[r,.075,r]));a.add(cylinder,servo,matrix([p[0]+Math.sign(p[0])*.042,p[1],p[2]],[0,0,Math.PI/2],[r*.55,.018,r*.55]));};
 const cable=(a,points,r=.012,mat=dark)=>{const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),10,r,5,false);a.add(g,mat);g.dispose();};
 const bolt=(a,x,y,z)=>a.add(sphere,servo,matrix([x,y,z],[0,0,0],[.009,.009,.006]));
 let stencil=null;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,256,128);ctx.fillStyle='#bcb2ae';ctx.font='bold 66px monospace';ctx.fillText('K-9',14,66);
  ctx.font='14px monospace';ctx.fillText('ORDRE / RECON',16,94);ctx.fillRect(16,106,160,3);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  stencil=new T.MeshStandardMaterial({map,transparent:true,alphaTest:.1,roughness:.88,polygonOffset:true,polygonOffsetFactor:-1});
 }
 // Narrow waist, open rib cage, angular divided pectorals and layered abdomen.
 body.limb(dark,[0,1.08,.05],[0,1.68,.045],.075,.115);
 for(let k=0;k<5;k++){
  const yy=1.18+k*.075,span=.09+k*.017;
  body.box(armor,[span*2,.048,.12],[0,yy,-.06],[.10,0,0],.012);
 }
 hips.box(dark,[.27,.13,.19],[0,1.075,0],[0,0,0],.018);
 for(const side of [-1,1]){
  body.limb(dark,[side*.13,1.37,.02],[side*.30,1.71,.04],.065,.055);
  panel(body,chest,[side*.145,1.51,-.15],[.05,side*-.13,side*-.16]);
  for(const yy of [1.47,1.64])for(const xx of [.09,.20])bolt(body,side*xx,yy,-.218);
  for(let j=0;j<3;j++)body.box(dark,[.07,.007,.008],[side*.14,1.36+j*.025,-.204],[0,side*-.13,side*-.16],.001);
  if(stencil&&side===-1)panel(body,new T.PlaneGeometry(.15,.075),[side*.15,1.56,-.216],[.05,side*-.13,side*-.16],[1,1,1],stencil);
  cable(body,[[side*.27,1.60,.02],[side*.29,1.36,.06],[side*.13,1.22,.10]],.016);
  cable(body,[[side*.26,1.58,.035],[side*.28,1.37,.09],[side*.14,1.25,.12]],.006,glow);
  for(let k=0;k<4;k++)body.box(servo,[.055,.012,.045],[side*.25,1.47+k*.035,.12],[0,0,side*-.3],.002);
  panel(body,shoulder,[side*.37,1.72,-.035],[.12,side*-.27,side*-.22],[1,1,1]);
  panel(body,shoulder,[side*.43,1.71,.06],[0,side*1.1,side*-.12],[.72,.8,1]);
  for(let j=0;j<3;j++)body.box(dark,[.06,.015,.04],[side*.39,1.81+j*.025,-.075],[0,side*-.27,side*-.22],.002);
  for(const yy of [1.66,1.82])bolt(body,side*.40,yy,-.11);
  motor(body,[side*.34,1.69,.035],.092);
  // Rearward-swept long fins are broad angular panels, with a recessed red seam.
  panel(body,fin,[side*.265,1.99,.23],[.22,side*.17,side*-.27]);
  body.box(dark,[.035,.48,.06],[side*.275,1.98,.185],[.22,side*.17,side*-.27],.006);
  body.box(glow,[.010,.37,.008],[side*.28,2.02,.15],[.22,side*.17,side*-.27],.002,false);
  hips.box(armor,[.10,.18,.12],[side*.155,1.075,-.07],[.12,0,side*-.18],.018);
  body.box(armor,[.08,.30,.08],[side*.10,1.48,.18],[.06,0,0],.015);
  cable(body,[[side*.11,1.25,.17],[side*.22,1.30,.25],[side*.21,1.62,.20]],.014);
 }
 // Recessed wedge head inside a high collar. Sensors keep the engine's 1.88m height.
 const neck=boneAt('sensor-head',[0,1.81,.02],thorax),head=assembly(neck);
 body.limb(servo,[0,1.59,.06],[0,1.79,.025],.035,.03);
 head.add(headShell,armor);
 head.box(dark,[.235,.037,.045],[0,1.88,-.143],[.06,0,0],.009);
 head.box(glow,[.215,.012,.012],[0,1.88,-.168],[0,0,0],.003,false);
 for(const side of [-1,1]){motor(head,[side*.135,1.85,.015],.047);head.limb(dark,[side*.09,1.77,-.02],[side*.055,1.71,-.045],.019,.012);}
 // Hanging arms, open claw hands and retractable blades mounted on the outer forearms.
 for(const side of [-1,1]){
  const s=[side*.34,1.69,.03],e=[side*.43,1.31,.015],w=[side*.47,.98,-.025];
  const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
  const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
  u.limb(dark,s,e,.045,.035);u.limb(armor,[side*.36,1.61,-.025],[side*.41,1.37,-.03],.065,.04);
  u.limb(servo,[side*.39,1.59,.065],[side*.46,1.33,.07],.013,.01);motor(l,e,.052);
  u.limb(armor,[side*.39,1.57,-.04],[side*.43,1.42,-.04],.048,.032);
  l.limb(dark,e,w,.035,.028);panel(l,forearm,[side*.46,1.16,-.04],[0,side*-.1,side*-.10],[.8,.85,1]);
  l.limb(servo,[side*.47,1.30,.055],[side*.50,1.02,.04],.012,.009);
  for(const yy of [1.08,1.20])bolt(l,side*.48,yy,-.10);
  const edgeBone=boneAt(`spectre-blade-${side}`,[side*.53,1.15,-.035],lower);bladeRig.push(edgeBone);
  const edge=assembly(edgeBone);panel(edge,blade,[side*.53,1.15,-.07],[0,0,side*-.07]);
  edge.limb(glow,[side*.54,1.16,-.095],[side*.55,.70,-.10],.007,.001,false);
  f.box(dark,[.073,.095,.046],[w[0],w[1]-.055,w[2]],[0,0,0],.009);
  for(let k=0;k<4;k++){
   const x=w[0]+(k-1.5)*.020;
   f.limb(servo,[x,w[1]-.08,w[2]],[x,w[1]-.15,w[2]-.025],.007,.005);
   f.limb(dark,[x,w[1]-.15,w[2]-.025],[x,w[1]-.18,w[2]-.07],.005,.002);
  }
  f.limb(servo,[w[0]-side*.04,w[1]-.03,w[2]],[w[0]-side*.07,w[1]-.10,w[2]-.05],.008,.004);
  armRig.push({upper,lower,wrist,side});
  // Digitigrade legs: rear knee, long exposed shin rams, forward toe claws.
  const hip=[side*.14,1.09,.02],knee=[side*.21,.67,.20],ankle=[side*.23,.14,-.02];
  const upperLeg=boneAt(`leg-${side}-hip`,hip,pelvis),lowerLeg=boneAt(`leg-${side}-knee`,knee,upperLeg),foot=boneAt(`leg-${side}-ankle`,ankle,lowerLeg);
  const v=assembly(upperLeg),c=assembly(lowerLeg),b=assembly(foot);
  motor(v,hip,.065);v.limb(dark,hip,knee,.052,.043);
  panel(v,thigh,[side*.185,.91,-.015],[.22,side*-.12,side*-.07],[.85,.95,1]);
  motor(c,knee,.065);c.limb(dark,knee,ankle,.035,.025);
  c.add(new T.TorusGeometry(.053,.009,5,14),servo,matrix([knee[0]+side*.05,knee[1],knee[2]],[0,Math.PI/2,0]));
  c.limb(servo,[side*.25,.65,.17],[side*.27,.19,-.015],.018,.01);
  c.limb(armor,[side*.19,.61,.14],[side*.20,.21,-.03],.028,.02);
  panel(c,shin,[side*.21,.43,.025],[.30,0,0],[.65,.85,.8]);
  c.box(glow,[.009,.17,.010],[side*.235,.46,-.04],[.30,0,0],.002,false);
  motor(b,ankle,.035);
  for(const toe of [-1,1])b.limb(armor,[ankle[0]+toe*.025,.085,-.035],[ankle[0]+toe*.075,.028,-.20],.024,.006);
  b.limb(dark,[ankle[0],.09,.015],[ankle[0],.035,.10],.03,.018);
  legRig.push({upper:upperLeg,lower:lowerLeg,foot,side,hip,knee,ankle});
 }
 return {legRig,armRig,bladeRig,groundGun:null,gunSignal:null,sensorAnchor:[0,1.88],hipHeight:HUMAN_REFERENCE.joints.LeftUpLeg[1]};
}
