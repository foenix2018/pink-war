import {createFootPlant} from './enemy-body-response.js';
// Motion-capture layer for the factory humanoids (PO-07, SY-05, TR-15, BR-11, K-9).
// REC-01's native 41-bone RLH skeleton plays its real clips (idle, walk, walkRifle, rifle, run); every robot bone then
// follows its native counterpart: pelvis, chest and head by rotation, arms by segment direction, legs by foot targets
// solved with each chassis' own knee (forward or reverse). Character traits and shooter reactions are layered on top.
// Front is −Z in the robot frame; the native rig faces +Z, hence the half-turn flip.
import * as T from './vendor/three.webgpu.min.js';
import {reco1Assets} from './reco1-assets.js';
import {createReco1Pose} from './reco1-pose.js';

export const MOCAP_REVISION='reco1-native-retarget-v1';
// Per chassis: cadence (speed fed to the clips), forward hunch, crouch, sway, arm swing gain, head scanning style.
export const MOCAP_TRAITS=Object.freeze({
 stalker:Object.freeze({cadence:1.12,hunch:.16,drop:.045,sway:1,arms:1,scan:'hunter',engagedDrop:.06,label:'chasseur voûté, pas rapides, tête qui balaie'}),
 synth:Object.freeze({cadence:.96,hunch:.03,drop:0,sway:.8,arms:1,scan:'sweep',engagedDrop:.045,label:'tacticien droit, épaules carrées, s’abaisse pour tirer'}),
 listener:Object.freeze({cadence:.88,hunch:.07,drop:.02,sway:.9,arms:1,scan:'listen',engagedDrop:.03,label:'écoute : tête inclinée, paraboles qui pivotent'}),
 brute:Object.freeze({cadence:.72,hunch:.10,drop:.03,sway:2.1,arms:1.35,scan:'heavy',engagedDrop:.05,label:'colosse lent, roulis lourd, bras qui battent'}),
 spectre:Object.freeze({cadence:1.18,hunch:.22,drop:.07,sway:1.1,arms:.8,scan:'hunter',engagedDrop:.11,label:'traqueur bas, lames en avant à l’assaut'})
});

const FLIP=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI),FLIP_INV=FLIP.clone().invert();
const flipQ=(q,out)=>out.copy(FLIP).multiply(q).multiply(FLIP_INV);
const flipV=v=>v.set(-v.x,v.y,-v.z);

export function createMocapDriver({form,ranged,legs,arms,pelvis,thorax,head,gun,gunBind,hipHeight,receivers=[]}){
 const traits=MOCAP_TRAITS[form]||MOCAP_TRAITS.synth;
 const asset=reco1Assets(),states={motion:'idle',aim:false,mode:'patrol'},pose=createReco1Pose(asset,states);
 pose.gun.visible=!!ranged;pose.setPose({aimPitch:0,aimYaw:0,speed:0});
 const nb=n=>pose.bones.get('mixamorig'+n),P=b=>b.getWorldPosition(new T.Vector3()),Q=b=>b.getWorldQuaternion(new T.Quaternion());
 pose.actor.updateMatrixWorld(true);
 // Native rest, in native space.
 const rest={hips:Q(nb('Hips')),spine:Q(nb('Spine2')),head:Q(nb('Head')),hipsY:P(nb('Hips')).y,footY:P(nb('LeftFoot')).y};
 const nativeLeg=P(nb('LeftUpLeg')).distanceTo(P(nb('LeftLeg')))+P(nb('LeftLeg')).distanceTo(P(nb('LeftFoot')));
 const k=hipHeight/rest.hipsY;
 // Robot bind data (root frame).
 const bindWorld=bone=>{const v=bone.position.clone();let p=bone.parent;while(p&&p.isBone){v.add(p.position);p=p.parent;}return v;};
 const pelvisBind=pelvis.position.clone(),thoraxBind=bindWorld(thorax);
 const armData=arms.map(a=>{const s=bindWorld(a.upper),e=bindWorld(a.lower),w=bindWorld(a.wrist);return {...a,dirU:e.clone().sub(s).normalize(),dirL:w.clone().sub(e).normalize(),native:a.side===-1?'Left':'Right'};});
 const legData=legs.map(l=>({...l,plant:createFootPlant(),native:l.side===-1?'Left':'Right',ratio:(l.upperLength+l.lowerLength)/nativeLeg}));
 const reverse=form==='stalker'||form==='spectre';
 const q=new T.Quaternion(),q2=new T.Quaternion(),pq=new T.Quaternion(),tq=new T.Quaternion(),uq=new T.Quaternion(),nativePelvis=new T.Quaternion(),e=new T.Euler();
 const a=new T.Vector3(),b=new T.Vector3(),hip=new T.Vector3(),target=new T.Vector3(),dir=new T.Vector3(),bend=new T.Vector3(),knee=new T.Vector3();
 const desired=new T.Matrix4(),rel=new T.Matrix4(),m=new T.Matrix4(),gunQ=new T.Quaternion(),one=new T.Vector3(1,1,1),gp=new T.Vector3();
 const nativeDir=(from,to,out)=>flipV(out.copy(P(nb(to))).sub(P(nb(from)))).normalize();

 const meleeTarget=new T.Vector3();
 let strideYaw=0;
 function update(dt,time,c){
  // c: {speed, alert, aiming, brace, recoil, hit, crouch, covered, pitch, lowered, pulse, phase}
  states.motion=c.speed>2.9?'run':c.speed>.06?'walk':'idle';states.aim=!!ranged&&c.alert!=='idle';
  states.mode=c.alert==='engaged'?'attack':c.alert==='alert'?'search':'patrol';
  pose.setPose({speed:c.speed*traits.cadence,coverCrouch:0,aimPitch:0,aimYaw:0,hitPulse:0});
  pose.update(dt,time,0);
  const moving=states.motion!=='idle',run=states.motion==='run',engaged=c.alert==='engaged';
  // Pelvis: native bob and sway, plus the chassis' own drop and the combat brace.
  const bob=(P(nb('Hips')).y-rest.hipsY)*k;
  const drop=traits.drop*(moving?1:.4)+(engaged?traits.engagedDrop:0)+(form==='brute'?Math.min(c.brace-.52*(c.cover||0),.16)+.52*(c.cover||0):c.brace); // the Brute braces, but follows its hit zone down behind cover
  pelvis.position.set(pelvisBind.x,hipHeight+bob*(form==='brute'?1.4:1)-drop,pelvisBind.z);
  flipQ(q.copy(Q(nb('Hips'))).multiply(q2.copy(rest.hips).invert()),pq);
  e.setFromQuaternion(pq,'YXZ');e.x=THREE_CLAMP(e.x*.5,-.12,.12);const pelvisPitch=e.x;e.z*=traits.sway;e.y*=traits.sway;
  if(form==='brute'&&moving)e.z+=Math.sin(c.phase)*.05; // heavy side-to-side roll on each stomp
  pelvis.quaternion.setFromEuler(e);nativePelvis.copy(pq);pq.copy(pelvis.quaternion);
  // Chest: native spine relative to the pelvis, hunch, recoil kick, hit flinch, cover lean.
  flipQ(q.copy(Q(nb('Spine2'))).multiply(q2.copy(rest.spine).invert()),tq);
  e.setFromQuaternion(nativePelvis.invert().multiply(tq),'YXZ');
  e.x=e.x*.5-traits.hunch*(moving?1:.6)-(run?.06:0)-(c.covered?.10:0)+c.recoil*.07+(c.impact?.pitch??c.hit*.12);
  e.x=THREE_CLAMP(pelvisPitch+e.x,-.40,.22)-pelvisPitch; // a robot leans into the run, it never folds flat
  e.y=e.y*traits.sway+(c.impact?.yaw??c.hit*.16*(c.hitSide||1));e.z=e.z*traits.sway+(c.impact?.roll||0)-THREE_CLAMP((c.turnRate||0)*.008,-.065,.065);
  thorax.quaternion.setFromEuler(e);
  pelvis.updateMatrix();thorax.updateMatrix();
  // Head: native look, counter the hunch to keep the sensors on target, then the chassis' scanning style.
  if(head){
   flipQ(q.copy(Q(nb('Head'))).multiply(q2.copy(rest.head).invert()),q2);
   e.setFromQuaternion(q.copy(tq).invert().multiply(q2),'YXZ');
   e.x=e.x*.6+traits.hunch*.8-c.recoil*.04+(engaged?THREE_CLAMP(c.pitch,-.25,.25)*.5:0);
   const search=c.alert==='alert';
   if(traits.scan==='hunter')e.y+=search?Math.sin(time*2.3)*.42:Math.sin(time*.8)*.12*(engaged?0:1);
   else if(traits.scan==='listen'){e.z+=(search?.22:.08)*Math.sin(time*.9);e.y+=search?Math.sin(time*.55)*.3:0;}
   else if(traits.scan==='sweep')e.y+=search?Math.sin(time*.7)*.35:0;
   else if(traits.scan==='heavy')e.y+=search?Math.sin(time*.45)*.22:0;
   head.quaternion.setFromEuler(e);
  }
  for(const r of receivers){r.bone.rotation.y=r.side*(c.alert==='idle'?Math.sin(time*.5)*.12:Math.sin(time*1.4+r.side)*.3);}
  // Arms: segment directions of the native arms (the rifle IK takes over for the hands that hold a weapon).
  thorax.updateMatrixWorld(true);
  const thoraxRootQ=q.copy(pq).multiply(thorax.quaternion);
  for(const arm of armData){
   nativeDir(arm.native+'Arm',arm.native+'ForeArm',a);nativeDir(arm.native+'ForeArm',arm.native+'Hand',b);
   if(traits.arms!==1){a.lerp(arm.dirU,1-traits.arms).normalize();}
   if(c.guard){a.set(arm.side*.35,-.45,-.82).normalize();b.set(-arm.side*.25,.55,-.8).normalize();} // guard / wind-up: fists raised
   if(form==='spectre'&&engaged){a.set(arm.side*.25,-.55,-.8).normalize();b.set(arm.side*.1,-.2,-1).normalize();} // blades forward
   if(c.meleeWindup>0){const w=Math.min(1,c.meleeWindup);a.lerp(meleeTarget.set(arm.side*.38,.2,.48).normalize(),w).normalize();b.lerp(meleeTarget.set(arm.side*.15,.7,-.3).normalize(),w).normalize();}
   if(c.meleeStrike>0&&arm.side>0){a.lerp(meleeTarget.set(.12,-.15,-1).normalize(),c.meleeStrike).normalize();b.lerp(meleeTarget.set(0,0,-1),c.meleeStrike).normalize();}
   uq.setFromUnitVectors(arm.dirU,a);arm.upper.quaternion.copy(q2.copy(thoraxRootQ).invert().multiply(uq));
   tq.setFromUnitVectors(arm.dirL,b);arm.lower.quaternion.copy(q2.copy(uq).invert().multiply(tq));arm.wrist.quaternion.identity();
  }
  // Legs: native foot paths around each hip, scaled to the chassis; one support foot stays on the ground at walk.
  const lifts=[];
  for(const leg of legData){
   const f=P(nb(leg.native+'Foot')),u=P(nb(leg.native+'UpLeg'));
   leg.dx=-(f.x-u.x)*leg.ratio;leg.dz=-(f.z-u.z)*leg.ratio;leg.lift=Math.max(0,(f.y-rest.footY)*k);lifts.push(leg.lift);
  }
  const support=run?0:Math.min(...lifts);
  for(const leg of legData){
   leg.lift-=support;if(!moving&&leg.lift<.03)leg.lift=0;
   leg.dx=leg.ankle[0]-leg.hip[0]+(leg.dx-(leg.ankle[0]-leg.hip[0]))*(moving?1:.5);
   if(!moving)leg.dz=leg.ankle[2]-leg.hip[2]+(leg.dz-(leg.ankle[2]-leg.hip[2]))*.5;
  }
  // Orient the native step along real travel: side steps and backing away no
  // longer play a forward walk while the body slides sideways.
  if(Number.isFinite(c.strideAngle)){const d=Math.atan2(Math.sin(c.strideAngle-strideYaw),Math.cos(c.strideAngle-strideYaw));strideYaw+=d*(1-Math.exp(-dt*12));}
  if(moving&&Number.isFinite(c.strideAngle))for(const leg of legData){
   const bx=leg.ankle[0]-leg.hip[0],bz=leg.ankle[2]-leg.hip[2],x=leg.dx-bx,z=leg.dz-bz,cs=Math.cos(strideYaw),sn=Math.sin(strideYaw);
   leg.dx=bx+x*cs-z*sn;leg.dz=bz+x*sn+z*cs;
  }
  // The support foot remains in world space until lift-off, including strafes
  // and gradual turns. Teleports, airborne frames and rapid pivots release it.
  for(const leg of legData){const foot=leg.plant.update(leg.hip[0]+leg.dx,leg.hip[2]+leg.dz,{frame:c.frame,lift:leg.lift,moving,grounded:c.grounded!==false,reach:(leg.upperLength+leg.lowerLength)*.42});leg.planted=foot.planted;leg.dx=foot.x-leg.hip[0];leg.dz=foot.z-leg.hip[2];}
  // Keep both feet within reach of the hips (the pelvis lowers rather than letting a foot float).
  for(const leg of legData){
   hip.set(leg.hip[0]-pelvisBind.x,leg.hip[1]-pelvisBind.y,leg.hip[2]-pelvisBind.z).applyQuaternion(pq);
   const reach=leg.upperLength+leg.lowerLength-.002,x=leg.hip[0]+leg.dx-(pelvis.position.x+hip.x),z=leg.hip[2]+leg.dz-(pelvis.position.z+hip.z);
   const top=leg.ankle[1]+leg.lift+Math.sqrt(Math.max(.001,reach*reach-x*x-z*z))-hip.y;pelvis.position.y=Math.min(pelvis.position.y,top);
  }
  const inv=q2.copy(pq).invert();
  for(const leg of legData){
   hip.set(leg.hip[0]-pelvisBind.x,leg.hip[1]-pelvisBind.y,leg.hip[2]-pelvisBind.z).applyQuaternion(pq).add(pelvis.position);
   target.set(leg.hip[0]+leg.dx,leg.ankle[1]+leg.lift,leg.hip[2]+leg.dz);
   dir.copy(target).sub(hip);const distance=Math.min(dir.length(),leg.upperLength+leg.lowerLength-.0001);dir.normalize();
   const along=(leg.upperLength**2-leg.lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,leg.upperLength**2-along**2));
   bend.set(0,0,reverse?1:-1).addScaledVector(dir,-dir.dot(bend)).normalize();knee.copy(hip).addScaledVector(dir,along).addScaledVector(bend,height);
   a.copy(knee).sub(hip).normalize().applyQuaternion(inv);leg.upper.quaternion.setFromUnitVectors(leg.upperBind,a);
   uq.copy(pq).multiply(leg.upper.quaternion);b.copy(target).sub(knee).normalize().applyQuaternion(tq.copy(uq).invert());leg.lower.quaternion.setFromUnitVectors(leg.lowerBind,b);
   leg.foot.quaternion.copy(uq.multiply(leg.lower.quaternion)).invert();
  }
  // The weapon keeps its authoritative frame (projectiles start at the drawn muzzle): it follows the pelvis height only.
  if(gun){
   pelvis.updateMatrix();thorax.updateMatrix();
   gunQ.setFromEuler(e.set(c.lowered??c.pitch,0,0));gp.set(gunBind.x,gunBind.y-c.brace,gunBind.z+c.pulse*.05);
   desired.compose(gp,gunQ,one);rel.multiplyMatrices(pelvis.matrix,thorax.matrix).invert();m.multiplyMatrices(rel,desired);
   m.decompose(gun.position,gun.quaternion,a);
  }
  return {clip:run?'run':moving?(ranged?'walkRifle':'walk'):(ranged?'rifle':'idle'),plantedFeet:legData.filter(leg=>leg.planted).length};
 }
 return {update,traits,pose,dispose(){pose.dispose();}};
}
// Pitch of a weapon bone in the robot frame (the chest moves under it, so its local rotation is not the aim).
export function weaponPitch(bone,root){root.updateMatrixWorld(true);const q=root.getWorldQuaternion(new T.Quaternion()).invert().multiply(bone.getWorldQuaternion(new T.Quaternion()));return new T.Euler().setFromQuaternion(q,'YXZ').x;
}
function THREE_CLAMP(v,lo,hi){return Math.max(lo,Math.min(hi,v||0));}
