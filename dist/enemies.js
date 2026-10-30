import {createReco1} from './reco1.js';
import {probeFlightState} from './probe-damage.js';
import * as T from './vendor/three.webgpu.min.js';
import { Assembly, loft, matrix, merge, bevelBox, limb as lightweightLimb } from './geo.js';
import {equipmentSurfaces} from './equipment-surfaces.js';
import { enemyScale } from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';
import {enemySurfaces} from './enemy-surfaces.js';
import {FIELD_RIFLE,carriesFieldRifle} from './enemy-weapon-layout.js';
import {createRifleArmPose} from './enemy-rifle-pose.js';
import {buildHumanoidRobot} from './enemy-humanoid.js';
import {HUMAN_REFERENCE,sampleHumanStep,humanIdleBob} from './enemy-human-motion.js';

export const ENEMY_PROFILES=Object.freeze({
 synth:Object.freeze({name:'Synthétique N-08 / tacticien autonome',silhouette:'humanoid / ivory shell / exposed tendons / adaptive cover'}),
 stalker:Object.freeze({name:'Poursuivant / châssis de sécurité',silhouette:'military graphite shell / sealed helmet / paired optics / braced field rifle'}),
 seer:Object.freeze({name:'RECO1 · reconnaissance blindée',silhouette:'approved V10 / gunmetal segmented armour / 41-bone RLH motion / aimed carbine'}),
 brute:Object.freeze({name:'BRUTE / LE BRISEUR',silhouette:'giant graphite siege chassis / massive pauldron shoulders / hydraulics / crushing fists / red chest reactor'}),
 bulwark:Object.freeze({name:'Rempart / unité de suppression',silhouette:'humanoid heavy chassis / faceted arm shields / integrated helmet'}),
 listener:Object.freeze({name:'Traqueur / réseau acoustique',silhouette:'humanoid scout / angular helmet / acoustic receivers'}),
 scuttler:Object.freeze({name:'Rampant / maintenance autonome',silhouette:'low / segmented carapace / six legs'}),
 probe:Object.freeze({name:'Sonde S-03 / quadrirotor militaire cyberpunk',silhouette:'armored X-frame / four triple-blade ducted motors / stabilized gimbal iris'})
});

const crawlerShell=loft([[.48,.25,.34],[.58,.37,.48],[.75,.43,.53],[.91,.38,.45],[1.02,.24,.31]],22);
const probeHull=loft([[.55,.40,.42,.06],[.65,.42,.44,.055],[.80,.34,.40,.08],[.90,.18,.26,.14],[.92,.06,.11,.16]],24);
const crawlerSegment=loft([[-.095,.32,.09],[-.06,.36,.14],[.055,.35,.135],[.095,.30,.09]],18).rotateX(Math.PI/2);
const foot=loft([[-.118,.094,.165,-.058],[-.095,.105,.171,-.064],[-.035,.099,.158,-.048],[.04,.073,.09,.01]],14);
const sensor=new T.SphereGeometry(1,10,7),shellSphere=new T.SphereGeometry(1,12,8);
const jointSphere=new T.SphereGeometry(1,8,6);
const shellDome=new T.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2);
const ring=new T.TorusGeometry(.12,.012,5,16);
const bolt=new T.SphereGeometry(1,6,3);
const probeDuct=new T.TorusGeometry(.205,.038,6,24),probeRim=new T.TorusGeometry(.19,.022,6,24);

// Faceted plates articulate the bipeds; the crawler and drone retain their own
// mechanical forms. Small fittings are merged; no material or
// geometry is allocated per animation frame, even when a portal spawns a full wave.
class EnemyAssembly extends Assembly {
  box(material,size,position=[0,0,0],rotation=[0,0,0],radius=.006,shadow=true){
    const geometry=Math.min(...size)<.025?new T.BoxGeometry(...size):bevelBox(...size,radius,1);
    return this.add(geometry,material,matrix(position,rotation),shadow);
  }
  limb(material,a,b,r1,r2=r1,shadow=true){
    return this.add(lightweightLimb(a,b,r1,r2,8),material,null,shadow);
  }
  ellipsoid(material,position,radii,rotation=[0,0,0],shadow=true){
    return this.add(Math.max(...radii)<=.15?jointSphere:shellSphere,material,matrix(position,rotation,radii),shadow);
  }
  dome(material,position,radii,rotation=[0,0,0],shadow=true){
    return this.add(shellDome,material,matrix(position,rotation,radii),shadow);
  }
}

// Rigid skin weights articulate armour at real pivots, without multiplying draw
// calls for every knee or crawler leg. Each variant shares these immutable buffers;
// only its inexpensive bone transforms belong to an individual enemy.
function bakeRig(assemblies){
  const batches=new Map();
  for(const {assembly,bone} of assemblies)for(const item of assembly.items){
    const key=`${item.material.uuid}:${item.shadow}`;
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push({...item,bone});
  }
  return [...batches.values()].map(items=>{
    const geometry=merge(items.map(item=>item.geometry)),count=geometry.attributes.position.count;
    const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);let offset=0;
    for(const item of items)for(let i=0;i<item.geometry.attributes.position.count;i++){
      indices[offset*4]=item.bone;weights[offset*4]=1;offset++;
    }
    geometry.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.computeBoundingSphere();
    return {geometry,material:items[0].material,shadow:items[0].shadow};
  });
}

export function createEnemyFactory(mats){
  const cache=new Map(),surface=equipmentSurfaces(),wear=enemySurfaces(T);
  const frame=new T.MeshPhysicalMaterial({color:0x626a70,map:wear.metal,roughnessMap:wear.rough,bumpMap:wear.rough,bumpScale:.0007,roughness:.64,metalness:.64,clearcoat:.14,clearcoatRoughness:.52,envMap:mats.monster.envMap,envMapIntensity:.65});frame.name='ORDRE / worn graphite armour';
  const heavyFrame=frame.clone();heavyFrame.color.setHex(0x414b52);heavyFrame.roughness=.69;
  const mechanism=new T.MeshStandardMaterial({color:0x181c20,map:surface.metal,bumpMap:surface.rough,bumpScale:.0004,roughness:.78,metalness:.38,envMap:mats.monster.envMap,envMapIntensity:.35});
  const servo=new T.MeshStandardMaterial({color:0x858c8b,roughness:.42,metalness:.80,envMap:mats.monster.envMap,envMapIntensity:.5});
  const synthShell=new T.MeshPhysicalMaterial({color:0xc5d4d7,map:surface.metal,roughnessMap:surface.rough,bumpMap:surface.rough,bumpScale:.00025,metalness:.38,roughness:.42,clearcoat:.5,clearcoatRoughness:.32,envMap:mats.monster.envMap,envMapIntensity:.4});
  const hazard=new T.MeshStandardMaterial({color:0x96825b,roughness:.78,metalness:.25});

  function template(elite,ranged,form){
    const key=`${form}:${elite?1:0}:${ranged?1:0}`;if(cache.has(key))return cache.get(key);
    const armor=form==='synth'?synthShell:elite?heavyFrame:frame,dark=mechanism;
    const glow=ranged?mats.cyan:form==='scuttler'?mats.rose:form==='seer'?(mats.pale||mats.cyan):mats.violet;
    const optics=new T.MeshBasicMaterial({color:ENEMY_OPTICS.idle,toneMapped:false});optics.name=form==='brute'?'BRUTE / scarlet thoracic reactor':'ORDRE independent optics';
    const bones=[],assemblies=[],legRig=[],armRig=[],rotors=[];let probeHead=null,probeSignal=null,groundGun=null,gunSignal=null,humanoid=null;
    function bone(name,position,parent=-1){bones.push({name,position,parent});return bones.length-1;}
    function assembly(index){const a=new EnemyAssembly();assemblies.push({assembly:a,bone:index});return a;}
    const probe=form==='probe',crawler=form==='scuttler',pelvis=bone('pelvis',[0,probe?.55:crawler?.73:HUMAN_REFERENCE.joints.LeftUpLeg[1],0]);
    const thorax=(probe||crawler)?pelvis:bone('thorax',[0,HUMAN_REFERENCE.joints.Spine2[1]-HUMAN_REFERENCE.joints.LeftUpLeg[1],HUMAN_REFERENCE.joints.Spine2[2]],pelvis),a=assembly(thorax);

    function boneAt(name,point,parent=-1){const offset=[...point];let p=parent;while(p>=0){for(let k=0;k<3;k++)offset[k]-=bones[p].position[k];p=bones[p].parent;}return bone(name,offset,parent);}

    if(probe){
      // Rounded optical hull and four ducted fans: a surveillance machine,
      // with an exposed iris rather than a humanoid face or a cubic body.
      a.ellipsoid(dark,[0,.55,0],[.42,.31,.49]);
      a.add(probeHull,armor);
      // Graphite cladding and recessed cooling channels, baked with the existing rig.
      for(const side of [-1,1]){
        a.box(armor,[.14,.045,.34],[side*.23,.755,-.02],[0,0,side*.13],.018);
        for(let v=0;v<3;v++)a.box(dark,[.022,.008,.105],[side*(.30+v*.038),.792,-.07],[0,0,side*.12],.004);
      }
      for(let j=0;j<3;j++)a.box(servo,[.022,.012,.21],[0,.865,-.13+j*.13],[0,0,0],.004);
      // Four visible diagonal load-bearing arms, paired motor braces and armored collars:
      // all share baked skinned batches (no standalone geometry per frame).
      for(const side of [-1,1])for(const dir of [-1,1]){
        const armZ=dir*.42,motorX=side*.61;
        a.limb(armor,[side*.23,.62,dir*.15],[side*.50,.53,dir*.36],.078,.046);
        a.limb(dark,[side*.26,.48,dir*.16],[motorX,.475,armZ],.027,.023);
        a.limb(servo,[side*.49,.53,dir*.36],[motorX,.54,armZ],.022,.028);
        a.box(dark,[.075,.038,.11],[motorX,.55,armZ],[0,0,side*dir*.14],.011);
        a.box(hazard,[.048,.022,.035],[motorX,.553,armZ],[0,0,0],.008);
      }
      a.dome(armor,[0,.47,.03],[.35,.24,.39],[Math.PI,0,0]);
      a.add(ring,armor,matrix([0,.55,0],[Math.PI/2,0,0],[3.5,3.5,3.5]));
      for(let k=0;k<8;k++){const angle=k*Math.PI/4;a.add(bolt,servo,matrix([Math.cos(angle)*.37,.62,Math.sin(angle)*.39],[0,0,0],[.014,.015,.014]));}
      for(const side of [-1,1])a.box(hazard,[.10,.022,.20],[side*.23,.865,.02],[0,0,side*.2],.004);
      for(const side of [-1,1]){
        a.limb(dark,[side*.25,.41,.23],[side*.28,.23,.24],.019,.014);
        a.limb(servo,[side*.28,.23,.24],[side*.28,.23,-.24],.015,.015);
        a.limb(dark,[side*.28,.23,-.24],[side*.25,.41,-.23],.014,.019);
        a.limb(dark,[side*.21,.78,.10],[side*.26,1.02,.15],.016,.008);
        a.add(sensor,glow,matrix([side*.26,1.02,.15],[0,0,0],[.016,.018,.016]),false);
        for(const z of [-.42,.42]){
          const x=side*.61;
          a.limb(armor,[side*.24,.52,z*.45],[x,.49,z],.048,.034);
          a.limb(dark,[side*.28,.46,z*.45],[x,.44,z],.020,.013);
          a.add(probeDuct,armor,matrix([x,.49,z],[Math.PI/2,0,0]));
          a.add(probeRim,servo,matrix([x,.513,z],[Math.PI/2,0,0],[1.08,1.08,1.08]));
          for(const t of [-1,1])a.box(dark,[.027,.026,.066],[x+t*.183,.49,z],[0,0,0],.008);
          a.add(ring,glow,matrix([x,.476,z],[Math.PI/2,0,0],[1.53,1.53,1.53]),false);
          const rotor=bone('fan-'+side+'-'+z,[x,-.06,z],pelvis),r=assembly(rotor);rotors.push({index:rotor,side:z*side>0?1:-1});
          r.ellipsoid(dark,[x,.49,z],[.046,.023,.046]);
          // True three-blade silhouette: pitched, slim overlapping surfaces within the duct.
          for(let blade=0;blade<3;blade++){
            const theta=blade*Math.PI*2/3,dx=Math.cos(theta),dz=Math.sin(theta);
            r.box(servo,[.125,.014,.046],[x+dx*.082,.49,z+dz*.082],[0,-theta,.085],.011);
            r.box(hazard,[.021,.009,.045],[x+dx*.152,.494,z+dz*.152],[0,-theta,0],.004);
          }
          r.ellipsoid(armor,[x,.51,z],[.024,.013,.024]);
        }
      }
      probeHead=bone('optical-gimbal',[0,0,-.35],pelvis);const h=assembly(probeHead);
      h.ellipsoid(dark,[0,.55,-.40],[.21,.20,.18]);
      h.add(probeRim,armor,matrix([0,.55,-.59],[0,0,0]));
      h.add(sensor,dark,matrix([0,.55,-.60],[0,0,0],[.16,.16,.045]));
      probeSignal=bone('charged-iris',[0,0,-.18],probeHead);const s=assembly(probeSignal);
      s.add(sensor,optics,matrix([0,.55,-.665],[0,0,0],[.071,.071,.017]),false);
      s.add(ring,optics,matrix([0,.55,-.66],[0,0,0],[.79,.79,.79]),false);
    }else if(crawler){
      a.add(crawlerShell,dark);
      // Overlapping beetle-like plates surround a former municipal maintenance
      // chassis: cables, sockets and optical tools show its industrial origin.
      for(let i=0;i<4;i++){
        const z=.31-i*.19,scale=1-i*.12;
        a.add(crawlerSegment,armor,matrix([0,.94,z],[.04,0,0],[scale,scale,1]));
        a.box(servo,[.17*scale,.032,.055],[0,1.09-i*.014,z+.045],[.13,0,0],.009);
      }
      a.dome(armor,[0,.89,-.48],[.26,.19,.255],[.13,0,0]);
      a.ellipsoid(dark,[0,.81,-.64],[.16,.10,.062]);
      for(const s of [-1,0,1])a.add(sensor,optics,matrix([s*.089,.92,-.673],[0,0,0],[s===0?.036:.026,.028,.017]),false);
      for(const s of [-1,1]){
        a.limb(dark,[s*.12,.75,-.55],[s*.19,.59,-.75],.036,.024);
        a.limb(armor,[s*.19,.59,-.75],[s*.25,.48,-.88],.034,.007);
        a.limb(dark,[s*.28,.73,.21],[s*.30,.74,-.40],.021);
      }
      for(const side of [-1,1])for(const [row,z] of [.28,-.02,-.32].entries()){
        const hip=[side*.27,.69,z],knee=[side*(row===1?.53:.59),.43,z+(row-1)*.17],ankle=[side*.73,.075,z+(row-1)*.31];
        const upper=bone(`leg-${side}-${row}-hip`,[hip[0],hip[1]-.73,hip[2]],pelvis);
        const lower=bone(`leg-${side}-${row}-knee`,knee.map((v,i)=>v-hip[i]),upper);
        const toe=bone(`leg-${side}-${row}-foot`,ankle.map((v,i)=>v-knee[i]),lower);
        const u=assembly(upper),l=assembly(lower),f=assembly(toe);
        u.ellipsoid(dark,hip,[.075,.074,.082]);u.limb(armor,hip,knee,.075,.048);
        u.add(ring,servo,matrix(hip,[0,Math.PI/2,0],[.50,.50,.50]));
        l.limb(servo,[knee[0],knee[1],knee[2]+.065],[ankle[0],ankle[1]+.15,ankle[2]+.065],.012,.009);
        u.limb(dark,[hip[0],hip[1]+.025,hip[2]+.075],[knee[0],knee[1]+.025,knee[2]+.075],.016,.013);
        l.ellipsoid(dark,knee,[.078,.075,.083]);l.limb(armor,knee,ankle,.060,.024);
        l.limb(dark,[knee[0],knee[1]-.025,knee[2]+.041],[ankle[0],ankle[1]+.12,ankle[2]+.041],.018,.012);
        f.ellipsoid(dark,ankle,[.075,.035,.095]);f.limb(armor,ankle,[side*.82,.045,ankle[2]-.11],.036,.005);
        legRig.push({upper,lower,foot:toe,side,row,hip,knee,ankle});
      }
      if(ranged){
        a.ellipsoid(armor,[0,.98,.28],[.19,.16,.30],[.17,0,0]);
        a.limb(dark,[0,1.04,.19],[0,1.04,-.25],.079,.053);
        a.add(sensor,glow,matrix([0,1.04,-.28],[0,0,0],[.05,.05,.021]),false);
      }
    }else{
      humanoid=buildHumanoidRobot({form,elite,ranged,armor,dark,servo,hazard,optics,glow,reactor:optics,boneAt,assembly,thorax,pelvis});
      legRig.push(...humanoid.legRig);armRig.push(...humanoid.armRig);groundGun=humanoid.groundGun;gunSignal=humanoid.gunSignal;
    }
    const result={parts:bakeRig(assemblies),bones,legRig,armRig,pelvis,thorax,rotors,probeHead,probeSignal,groundGun,gunSignal,optics,humanoid};
    cache.set(key,result);return result;
  }

  function create(elite=false,ranged=false,form='stalker'){
    if(form==='seer')return createReco1({elite,environment:mats.monster?.envMap});
    if(!['stalker','scuttler','brute','seer','probe','listener','bulwark','synth'].includes(form))form='stalker';
    const kit=template(elite,ranged,form),root=new T.Group(),crawler=form==='scuttler',probe=form==='probe';
    root.name=({synth:'N-08 adaptive synthetic',stalker:'AI pursuit chassis',scuttler:'AI maintenance crawler',brute:'BRUTE / LE BRISEUR siege chassis',seer:'AI reconnaissance chassis',probe:'S-03 flying surveillance probe',listener:'E-06 acoustic tracker',bulwark:'B-11 armoured suppression unit'})[form];
    root.userData.form=form;root.userData.designRevision='3.63.2';if(probe)root.userData.probeRevision='S-03 / destructible rotors 3.73';root.userData.profile=ENEMY_PROFILES[form];root.userData.surfaceStyle=form==='brute'?'weathered gunmetal / curved siege armour / exposed silver hydraulic rams / scarlet reactor': 'weathered alloy / faceted humanoid armour / RLH joint proportions / articulated rifle stance';
    if(form==='brute')root.userData.bruteRevision='BRISEUR-2026-10';
    const joints=kit.bones.map(spec=>{const b=new T.Bone();b.name=spec.name;b.position.set(...spec.position);return b;});
    kit.bones.forEach((spec,i)=>(spec.parent<0?root:joints[spec.parent]).add(joints[i]));root.updateMatrixWorld(true);
    const skeleton=new T.Skeleton(joints);
    const eyeMaterial=kit.optics.clone();root.userData.optics=eyeMaterial;root.userData.alertState='idle';
    root.addEventListener('removed',()=>{skeleton.dispose();eyeMaterial.dispose();});
    for(const part of kit.parts){
      const mesh=new T.SkinnedMesh(part.geometry,part.material===kit.optics?eyeMaterial:part.material);root.add(mesh);mesh.bind(skeleton,new T.Matrix4());
      mesh.castShadow=part.shadow&&!part.material.isMeshBasicMaterial;mesh.receiveShadow=part.shadow;
      // Gait stays inside a small, fixed culling margin; no CPU vertex bounds work per frame.
      mesh.boundingSphere=part.geometry.boundingSphere.clone();mesh.boundingSphere.radius+=.22;
    }
    root.scale.setScalar(enemyScale(form,elite));
    const legs=kit.legRig.map(spec=>({...spec,upper:joints[spec.upper],lower:joints[spec.lower],foot:joints[spec.foot]}));
    const arms=kit.armRig.map(spec=>({...spec,upper:joints[spec.upper],lower:joints[spec.lower],wrist:joints[spec.wrist]}));
    const riflePose=ranged&&carriesFieldRifle(form)?createRifleArmPose(T,arms):null;
    if(riflePose)root.userData.fieldRifle={bone:joints[kit.groundGun],arms,targets:()=>riflePose.targets(joints[kit.groundGun])};
    root.userData.skeleton=skeleton;root.userData.legs=legs;root.userData.sensorAnchor=kit.humanoid?.sensorAnchor;
    if(kit.humanoid)root.userData.humanoidReference={source:HUMAN_REFERENCE.source,sourceBoneCount:HUMAN_REFERENCE.sourceBoneCount,sourceSha256:HUMAN_REFERENCE.sourceSha256};
    if(kit.humanoid)root.userData.supportHeight=Math.min(...kit.humanoid.legRig.map(l=>l.ankle[1]));
    if(!crawler&&!probe)for(const leg of legs)root.userData['leg'+leg.side]=leg.upper;
    const pelvis=joints[kit.pelvis],thorax=joints[kit.thorax],head=joints.find(joint=>joint.name==='sensor-head');
    const direction=new T.Vector3(),bend=new T.Vector3(),knee=new T.Vector3(),target=new T.Vector3(),hip=new T.Vector3();
    const q=new T.Quaternion(),inverse=new T.Quaternion();
    // Cached bind directions let six independent two-link chains solve each foot
    // target. Alternating tripods keep three points of contact throughout a step.
    if(crawler||kit.humanoid)for(const leg of legs){
      leg.upperBind=new T.Vector3(...leg.knee).sub(new T.Vector3(...leg.hip));leg.upperLength=leg.upperBind.length();leg.upperBind.normalize();
      leg.lowerBind=new T.Vector3(...leg.ankle).sub(new T.Vector3(...leg.knee));leg.lowerLength=leg.lowerBind.length();leg.lowerBind.normalize();
    }
    const motionSample=new Float64Array(5);
    let previousTime=null,previousX=0,previousZ=0,motionSpeed=0,cycle=0;
    let previousProbeTime=null,dronePitch=0,droneRoll=0;
    root.userData.animate=(time,phase=0,moving=true,flight={},simulationTime=time)=>{
      const alert=enemyAlertState(flight,simulationTime);
      if(root.userData.alertState!==alert){eyeMaterial.color.setHex(ENEMY_OPTICS[alert]);root.userData.alertState=alert;}
      if(kit.groundGun!==null){
        const pulse=simulationTime-(flight.lastShotAt??-99)<.12?1:0;
        joints[kit.groundGun].rotation.x=T.MathUtils.clamp(riflePose&&alert==='idle'?-.30:flight.aimPitch||0,FIELD_RIFLE.minPitch,FIELD_RIFLE.maxPitch);
        joints[kit.groundGun].position.z=kit.bones[kit.groundGun].position[2]+pulse*.05;
        joints[kit.gunSignal].scale.setScalar(1+(flight.chargeProgress||0)*.45+pulse*.9);
      }
      if(probe){
        const state=probeFlightState(flight),damaged=(flight.limpUntil||0)>simulationTime;
        const lostSide=(flight.rotorDestroyed||[]).reduce((v,off,i)=>v+(off?(i<2?-1:1):0),0);
        const fallTime=Math.max(0,simulationTime-(flight.crashStartedAt??simulationTime));
        // RLH-style tilt: convert actual world velocity into the drone's yaw frame.
        // The independent root yaw continues pointing the optical gimbal at the target.
        const yaw=flight.yaw??root.rotation.y,c=Math.cos(yaw),sn=Math.sin(yaw);
        const localX=c*(flight.motionX||0)-sn*(flight.motionZ||0);
        const localZ=sn*(flight.motionX||0)+c*(flight.motionZ||0);
        const desiredPitch=T.MathUtils.clamp(localZ*.052,-.23,.23);
        const desiredRoll=T.MathUtils.clamp(-localX*.056+lostSide*.12,-.26,.26);
        const dt=previousProbeTime===null?0:T.MathUtils.clamp(time-previousProbeTime,0,.1);
        previousProbeTime=time;
        const blend=1-Math.exp(-dt*7);
        dronePitch+=(desiredPitch-dronePitch)*blend;
        droneRoll+=(desiredRoll-droneRoll)*blend;
        pelvis.rotation.set(state.crashing?Math.min(1.2,fallTime*1.2):
            dronePitch+Math.sin(time*2+phase)*(state.lost?.042:.012),
          0,state.crashing?Math.min(1.6,fallTime*2.4):
            droneRoll+Math.sin(time*1.7+phase)*(state.lost?.06:.012)+(damaged?.035:0));
        pelvis.position.y=.55+Math.sin(time*(state.lost?5:2.1)+phase)*(state.lost?.038:.018);
        for(const [i,rotor] of kit.rotors.entries()){
          const broken=!!flight.rotorDestroyed?.[i];
          joints[rotor.index].rotation.y=time*(broken?0:damaged&&i===0?12:42)*rotor.side+phase;
          joints[rotor.index].scale.setScalar(broken?.015:1);
        }
        joints[kit.probeHead].rotation.x=T.MathUtils.clamp((flight.aimPitch||0)-dronePitch,-.55,.4);
        const charge=T.MathUtils.clamp(flight.chargeProgress||0,0,1),flash=simulationTime-(flight.lastShotAt??-99)<.13?1:0;
        joints[kit.probeSignal].scale.setScalar(1+charge*(.35+.15*Math.sin(time*27))+flash*.7);
        return;
      }
      // Infer real travelled distance: a stunned enemy or a shooter holding its
      // position must settle into an idle stance instead of walking in place.
      const elapsed=previousTime===null?0:time-previousTime,dt=Math.min(.1,Math.max(0,elapsed));
      if(previousTime===null||elapsed<=0){cycle=phase;motionSpeed=0;}
      else{
        const distance=Math.hypot(root.position.x-previousX,root.position.z-previousZ);
        const measured=moving&&distance<1.5?Math.min(5,distance/elapsed):0;
        motionSpeed+= (measured-motionSpeed)*(1-Math.exp(-dt*18));
        if(!moving||motionSpeed<.015)motionSpeed=0;
      }
      previousTime=time;previousX=root.position.x;previousZ=root.position.z;
      const amount=Math.min(1,motionSpeed/.4),pace=Math.min(1,motionSpeed/2.7);
      const stride=crawler?.17:form==='brute'?.14+pace*.12:.14+pace*.16;
      const runBlend=Math.max(0,Math.min(1,(motionSpeed-2.7)/1.4));
      const humanCycle=HUMAN_REFERENCE.walkRifle.cycle*(1-runBlend)+HUMAN_REFERENCE.run.cycle*runBlend;
      cycle+=kit.humanoid?motionSpeed*dt*Math.PI*2/humanCycle:motionSpeed*dt*Math.PI/(2*stride);
      root.userData.motionSpeed=motionSpeed;root.userData.gaitPhase=cycle;
      if(crawler){
        const bob=-amount*.04+Math.sin(cycle*2)*.006*amount;pelvis.position.y=.73+bob;
        for(const leg of legs){
          const gait=cycle+((leg.row+(leg.side===1?1:0))%2)*Math.PI,step=Math.cos(gait)*amount,lift=Math.max(0,Math.sin(gait))*.12*amount;
          hip.set(leg.hip[0],leg.hip[1]+bob,leg.hip[2]);target.set(leg.side*.66,leg.ankle[1]+lift,leg.ankle[2]+step*stride);
          direction.copy(target).sub(hip);const distance=Math.min(direction.length(),leg.upperLength+leg.lowerLength-.0001);direction.normalize();
          const along=(leg.upperLength**2-leg.lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,leg.upperLength**2-along**2));
          bend.set(leg.side,.2,0).addScaledVector(direction,-direction.dot(bend)).normalize();
          knee.copy(hip).addScaledVector(direction,along).addScaledVector(bend,height);
          direction.copy(knee).sub(hip).normalize();leg.upper.quaternion.setFromUnitVectors(leg.upperBind,direction);
          inverse.copy(leg.upper.quaternion).invert();direction.copy(target).sub(knee).normalize().applyQuaternion(inverse);
          leg.lower.quaternion.setFromUnitVectors(leg.lowerBind,direction);
          q.copy(leg.upper.quaternion).multiply(leg.lower.quaternion);leg.foot.quaternion.copy(q).invert();
        }
      }else{
        const pose=flight.combatPose||flight.tactics?.state,covered=['cover','return','relocate'].includes(pose),guard=pose==='guard',windup=pose==='windup';
        const brace=(covered?.085:windup?.06:guard?.035:0)+.52*(flight.coverCrouch||0),aiming=alert==='engaged'&&!!flight.ranged;
        const recoil=Math.max(0,1-(simulationTime-(flight.lastShotAt??-99))/.16);
        const gait=Math.sin(cycle)*amount;sampleHumanStep(cycle,runBlend,motionSample);
        pelvis.position.y=kit.humanoid.hipHeight-brace+motionSample[4]*amount+humanIdleBob(time)*.12*(1-amount);
        for(const leg of legs){const k=leg.side===-1?0:2,lift=Math.max(0,motionSample[k])*amount,z=leg.ankle[2]+motionSample[k+1]*amount-leg.hip[2],x=leg.ankle[0]-leg.hip[0],reach=leg.upperLength+leg.lowerLength-.001;
          const support=leg.ankle[1]+lift+Math.sqrt(Math.max(.001,reach*reach-x*x-z*z));pelvis.position.y=Math.min(pelvis.position.y,support);
        }
        root.userData.nativeMotion=amount>.03?(runBlend>.5?'run':'walkRifle'):'rifle';
        thorax.rotation.set(.012+pace*.032+(covered?.045:0)-recoil*.018,-gait*.024,(pose==='peek'?.035:0)+gait*.012);
        if(head){head.rotation.y=gait*.018+(alert==='idle'?Math.sin(time*.65+phase)*.06*(1-amount):0);head.rotation.x=-thorax.rotation.x*.6+(alert==='engaged'?T.MathUtils.clamp(flight.aimPitch||0,-.18,.18):0);}
        for(const leg of legs){
          const offset=leg.side===-1?0:2,lift=Math.max(0,motionSample[offset])*amount,z=motionSample[offset+1]*amount;
          hip.set(leg.hip[0],leg.hip[1]+pelvis.position.y-kit.humanoid.hipHeight,leg.hip[2]);
          target.set(leg.ankle[0],leg.ankle[1]+lift,leg.ankle[2]+z);
          direction.copy(target).sub(hip);const distance=Math.min(direction.length(),leg.upperLength+leg.lowerLength-.0001);direction.normalize();
          const along=(leg.upperLength**2-leg.lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,leg.upperLength**2-along**2));
          bend.set(0,0,-1).addScaledVector(direction,-direction.dot(bend)).normalize();knee.copy(hip).addScaledVector(direction,along).addScaledVector(bend,height);
          direction.copy(knee).sub(hip).normalize();leg.upper.quaternion.setFromUnitVectors(leg.upperBind,direction);
          inverse.copy(leg.upper.quaternion).invert();direction.copy(target).sub(knee).normalize().applyQuaternion(inverse);leg.lower.quaternion.setFromUnitVectors(leg.lowerBind,direction);
          q.copy(leg.upper.quaternion).multiply(leg.lower.quaternion);leg.foot.quaternion.copy(q).invert();
        }
        for(const arm of arms){
          arm.upper.rotation.x=gait*arm.side*(aiming?.035:form==='brute'?.065:.115)+(guard?.23:covered?.12:aiming?.08:0);
          arm.upper.rotation.z=arm.side*(guard?-.1:.015);arm.lower.rotation.x=(guard?.85:aiming?.38:covered?.26:.06)+Math.max(0,gait*arm.side)*.035;
          arm.wrist.rotation.x=-arm.lower.rotation.x*.4;
        }
        riflePose?.update(joints[kit.groundGun]);
      }
    };
    return root;
  }
  return {create};
}
