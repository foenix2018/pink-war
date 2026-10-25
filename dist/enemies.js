import * as T from './vendor/three.webgpu.min.js';
import { Assembly, loft, matrix, merge, bevelBox, limb as lightweightLimb } from './geo.js';
import {equipmentSurfaces} from './equipment-surfaces.js';
import { enemyScale } from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';
import {profiledPanel} from './armor-profiles.js';
import {enemySurfaces} from './enemy-surfaces.js';
import {FIELD_RIFLE,carriesFieldRifle} from './enemy-weapon-layout.js';
import {createRifleArmPose} from './enemy-rifle-pose.js';

export const ENEMY_PROFILES=Object.freeze({
 synth:Object.freeze({name:'Synthétique N-08 / tacticien autonome',silhouette:'humanoid / ivory shell / exposed tendons / adaptive cover'}),
 stalker:Object.freeze({name:'Poursuivant / châssis de sécurité',silhouette:'military graphite shell / sealed helmet / paired optics / braced field rifle'}),
 seer:Object.freeze({name:'Sentinelle / optique longue portée',silhouette:'slender / cyclopean sensor / swept head'}),
 brute:Object.freeze({name:'Brute / châssis de siège',silhouette:'broad / recessed head / heavy shoulders'}),
 bulwark:Object.freeze({name:'Rempart / unité de suppression',silhouette:'broad / curved arm shields / low helmet'}),
 listener:Object.freeze({name:'Traqueur / réseau acoustique',silhouette:'slender / parabolic dishes / antennae'}),
 scuttler:Object.freeze({name:'Rampant / maintenance autonome',silhouette:'low / segmented carapace / six legs'}),
 probe:Object.freeze({name:'Sonde / surveillance aérienne',silhouette:'teardrop / four ducted fans / gimbal iris'})
});

const stalkerTorso=loft([[.88,.19,.15],[1.03,.22,.17],[1.23,.27,.20],[1.46,.31,.22],[1.60,.29,.21],[1.73,.14,.12]],20);
const bruteTorso=loft([[.84,.24,.19],[1.04,.31,.22],[1.26,.43,.28],[1.50,.49,.29],[1.67,.35,.23],[1.78,.15,.12]],20);
const seerTorso=loft([[.88,.14,.13],[1.10,.16,.15],[1.31,.20,.18],[1.56,.24,.19],[1.73,.17,.14],[1.85,.08,.075]],20);
const crawlerShell=loft([[.48,.25,.34],[.58,.37,.48],[.75,.43,.53],[.91,.38,.45],[1.02,.24,.31]],22);
const chest=profiledPanel([[-.17,-.21],[.17,-.21],[.27,-.12],[.31,.09],[.25,.20],[.10,.22],[-.10,.22],[-.25,.20],[-.31,.09],[-.27,-.12]],{depth:.034,bulge:.029,round:.12});
const pectoral=profiledPanel([[-.045,-.09],[.043,-.09],[.064,-.018],[.060,.075],[.023,.10],[-.040,.083]],{depth:.018,bulge:.016,round:.08});
const jointShield=profiledPanel([[-.065,-.055],[.064,-.055],[.08,.025],[.04,.070],[-.045,.070],[-.081,.025]],{depth:.016,bulge:.019,round:.1});
const cowl=profiledPanel([[-.07,-.065],[.08,-.06],[.15,.005],[.11,.075],[.014,.09],[-.07,.053]],{depth:.02,bulge:.035,round:.1});
const bulwarkShield=profiledPanel([[-.19,-.23],[.15,-.27],[.27,.02],[.20,.21],[-.21,.20],[-.28,.025]],{depth:.028,bulge:.052,round:.1});
const acousticDish=new T.LatheGeometry([[.018,.045],[.095,.010],[.174,-.045],[.18,-.037],[.10,.023],[.018,.057],[.018,.045]].map(p=>new T.Vector2(...p)),14).rotateX(Math.PI/2);
const probeHull=loft([[.55,.40,.42,.06],[.65,.42,.44,.055],[.80,.34,.40,.08],[.90,.18,.26,.14],[.92,.06,.11,.16]],24);
const ribShell=profiledPanel([[-.10,-.022],[.10,-.018],[.125,.018],[.08,.039],[-.10,.026]],{depth:.012,bulge:.012,round:.08});
const crawlerSegment=loft([[-.095,.32,.09],[-.06,.36,.14],[.055,.35,.135],[.095,.30,.09]],18).rotateX(Math.PI/2);
const thigh=loft([[-.36,.072,.085],[-.30,.085,.095],[-.13,.109,.105],[0,.118,.12]],16);
const calf=loft([[-.355,.052,.067,.012],[-.28,.075,.088,.025],[-.13,.102,.105,.025],[-.035,.092,.086]],16);
const foot=loft([[-.118,.094,.165,-.058],[-.095,.105,.171,-.064],[-.035,.099,.158,-.048],[.04,.073,.09,.01]],14);
const shinPlate=profiledPanel([[-.042,-.15],[.042,-.15],[.079,.085],[.056,.153],[-.056,.153],[-.079,.085]],{depth:.016,bulge:.023,round:.12});
const sensor=new T.SphereGeometry(1,10,7),shellSphere=new T.SphereGeometry(1,12,8);
const jointSphere=new T.SphereGeometry(1,8,6);
const shellDome=new T.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2);
const ring=new T.TorusGeometry(.12,.012,5,16);
const barrelRing=new T.TorusGeometry(.12,.012,3,10);
const acousticRing=new T.TorusGeometry(.12,.012,4,10),bolt=new T.SphereGeometry(1,6,3);
const probeDuct=new T.TorusGeometry(.205,.038,6,24),probeRim=new T.TorusGeometry(.19,.022,6,24);
const headShell=loft([[-.165,.068,.087,-.018],[-.10,.118,.151,-.003],[.015,.147,.185,.012],[.115,.139,.169,.031],[.165,.105,.124,.046],[.17,.066,.093,.052]],20);
const headFace=loft([[-.12,.054,.04,-.181],[-.02,.12,.035,-.197],[.084,.112,.032,-.174],[.115,.061,.025,-.149]],16);
const visor=profiledPanel([[-.117,-.028],[.117,-.028],[.13,.027],[.095,.052],[-.095,.052],[-.13,.027]],{depth:.009,bulge:.009,round:.12});
const brow=profiledPanel([[-.13,-.014],[.13,-.014],[.148,.009],[.107,.034],[-.107,.034],[-.148,.009]],{depth:.012,bulge:.012,round:.16});
const pauldron=profiledPanel([[-.12,-.085],[.11,-.10],[.17,.025],[.115,.10],[-.075,.12],[-.16,.035]],{depth:.026,bulge:.043,round:.16});
const vambrace=profiledPanel([[-.046,-.115],[.045,-.115],[.085,.075],[.055,.13],[-.06,.13],[-.084,.055]],{depth:.018,bulge:.023,round:.14});
const rifleReceiver=loft([[-.24,.053,.067],[-.20,.075,.079],[.12,.069,.075],[.18,.043,.05]],12).rotateX(Math.PI/2);

// Rounded volumes carry the silhouette. Small fittings are merged; no material or
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
    const optics=new T.MeshBasicMaterial({color:ENEMY_OPTICS.idle,toneMapped:false});optics.name='ORDRE independent optics';
    const bones=[],assemblies=[],legRig=[],armRig=[],rotors=[];let probeHead=null,probeSignal=null,groundGun=null,gunSignal=null;
    function bone(name,position,parent=-1){bones.push({name,position,parent});return bones.length-1;}
    function assembly(index){const a=new EnemyAssembly();assemblies.push({assembly:a,bone:index});return a;}
    const probe=form==='probe',crawler=form==='scuttler',pelvis=bone('pelvis',[0,probe?.55:crawler?.73:.93,0]);
    const thorax=(probe||crawler)?pelvis:bone('thorax',[0,.47,0],pelvis),a=assembly(thorax);

    if(probe){
      // Rounded optical hull and four ducted fans: a surveillance machine,
      // with an exposed iris rather than a humanoid face or a cubic body.
      a.ellipsoid(dark,[0,.55,0],[.42,.31,.49]);
      a.add(probeHull,armor);
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
          a.add(ring,glow,matrix([x,.476,z],[Math.PI/2,0,0],[1.53,1.53,1.53]),false);
          const rotor=bone('fan-'+side+'-'+z,[x,-.06,z],pelvis),r=assembly(rotor);rotors.push({index:rotor,side:z*side>0?1:-1});
          r.ellipsoid(dark,[x,.49,z],[.037,.028,.037]);
          for(const angle of [0,Math.PI/2])r.box(dark,[.31,.017,.035],[x,.49,z],[0,angle,0],.009);
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
    }else if(form==='synth'){
      // Original civilian synthetic repurposed by ORDRE: smooth asymmetric
      // ceramic breastplate, an unreadable face and exposed actuator tendons.
      a.add(loft([[1.01,.13,.105],[1.12,.145,.12],[1.29,.18,.13],[1.48,.24,.16],[1.61,.235,.15],[1.68,.11,.09]],24),dark);
      a.add(chest,armor,matrix([0,1.43,-.15],[.025,0,0],[.66,.95,.68]));
      for(const side of [-1,1]){
        a.add(ribShell,armor,matrix([side*.115,1.13,-.12],[.12,side*-.35,0],[.8,.8,.8]));
        a.limb(servo,[side*.07,1.03,.12],[side*.12,1.50,.16],.014,.019);
        a.add(pectoral,armor,matrix([side*.15,1.53,-.167],[0,side*-.2,0],[.7,.7,.6]));
        for(let i=0;i<3;i++)a.limb(dark,[side*.13,1.12+i*.10,.12],[side*.2,1.26+i*.07,.08],.009,.009);
      }
      for(let i=0;i<4;i++)a.add(jointShield,servo,matrix([0,1.12+i*.115,.14],[0,Math.PI,0],[.5,.65,.6]));
      a.box(glow,[.015,.075,.005],[.085,1.48,-.193],[0,0,-.15],.003,false);
      const neck=bone('sensor-head',[0,.465,-.032],thorax),h=assembly(neck);
      h.limb(dark,[0,1.65,0],[0,1.83,0],.048,.042);
      for(const side of [-1,1])h.limb(servo,[side*.035,1.69,.015],[side*.05,1.83,-.04],.009,.012);
      h.add(headShell,armor,matrix([0,1.865,-.032],[0,0,0],[.90,1.04,.85]));
      h.add(profiledPanel([[-.10,-.06],[.10,-.06],[.105,.035],[.07,.06],[-.07,.06],[-.105,.035]],{depth:.01,bulge:.006,round:.2}),dark,matrix([0,1.905,-.211]));
      h.add(brow,armor,matrix([0,1.968,-.196],[0,0,0],[.89,.8,.8]));
      for(const side of [-1,1]){
        h.add(sensor,optics,matrix([side*.064,1.91,-.231],[0,0,0],[.026,.010,.012]),false);
        h.add(jointShield,armor,matrix([side*.065,1.81,-.18],[0,side*-.4,side*.16],[.60,.68,.6]));
        h.add(ring,servo,matrix([side*.135,1.86,.01],[0,Math.PI/2,0],[.3,.3,.3]));
      }
      for(const side of [-1,1]){
        const shoulder=[side*.29,1.59,0],elbow=[side*.37,1.25,-.035],wrist=[side*.40,.97,-.12];
        const upper=bone(`arm-${side}-shoulder`,[shoulder[0],.19,0],thorax),lower=bone(`arm-${side}-elbow`,elbow.map((v,i)=>v-shoulder[i]),upper),hand=bone(`arm-${side}-wrist`,wrist.map((v,i)=>v-elbow[i]),lower);
        const u=assembly(upper),l=assembly(lower),f=assembly(hand);
        u.ellipsoid(dark,shoulder,[.085,.085,.085]);u.dome(armor,[side*.30,1.62,0],[.12,.10,.12],[0,0,side*-.25]);
        u.limb(armor,[side*.31,1.54,0],[side*.36,1.30,-.03],.067,.046);
        u.limb(servo,[side*.34,1.53,.055],[side*.40,1.28,.02],.012,.011);
        l.ellipsoid(dark,elbow,[.058,.058,.059]);l.add(ring,servo,matrix(elbow,[0,Math.PI/2,0],[.35,.35,.35]));
        l.limb(armor,[side*.37,1.22,-.04],wrist,.066,.038);
        l.limb(dark,[side*.40,1.20,.015],[side*.44,1.01,-.10],.015,.012);
        f.ellipsoid(dark,wrist,[.045,.055,.035]);
        for(let j=0;j<4;j++){
          const x=wrist[0]+(j-1.5)*.018;
          f.limb(servo,[x,.94,-.13],[x,.89,-.16],.008,.007);f.limb(dark,[x,.89,-.16],[x,.875,-.19],.007,.005);
        }
        armRig.push({upper,lower,wrist:hand,side});
        const x=side*.17,hip=bone(`leg-${side}-hip`,[x,0,0],pelvis),knee=bone(`leg-${side}-knee`,[0,-.415,0],hip),ankle=bone(`leg-${side}-ankle`,[0,-.39,0],knee);
        const v=assembly(hip),c=assembly(knee),b=assembly(ankle);
        v.ellipsoid(dark,[x,.91,0],[.087,.08,.075]);v.add(thigh,armor,matrix([x,.93,0],[0,0,0],[.79,1,.80]));
        v.limb(servo,[x+side*.055,.83,.045],[x+side*.055,.57,.05],.013,.010);
        c.ellipsoid(dark,[x,.515,0],[.078,.076,.075]);c.add(calf,armor,matrix([x,.515,0],[0,0,0],[.74,1,.80]));
        c.add(shinPlate,armor,matrix([x,.29,-.073],[0,0,0],[.76,1,.7]));
        c.limb(servo,[x-side*.04,.45,.06],[x-side*.04,.17,.05],.010,.009);
        b.ellipsoid(dark,[x,.126,0],[.065,.065,.06]);b.add(foot,armor,matrix([x,.125,0],[0,0,0],[.8,1,.85]));
        b.ellipsoid(dark,[x,.025,-.062],[.079,.02,.14]);legRig.push({upper:hip,lower:knee,foot:ankle,side});
      }
      if(ranged){
        groundGun=bone('aimed-shoulder-weapon',[.37,.29,-.01],thorax);const c=assembly(groundGun);
        c.limb(dark,[.37,1.69,.11],[.37,1.69,-.32],.055,.037);
        c.limb(armor,[.37,1.69,.075],[.37,1.69,-.22],.065,.047);
        c.add(barrelRing,servo,matrix([.37,1.69,-.31],[0,0,0],[.34,.34,.34]));
        gunSignal=bone('weapon-ready-emitter',[0,0,-.335],groundGun);
        assembly(gunSignal).add(sensor,glow,matrix([.37,1.69,-.345],[0,0,0],[.029,.029,.01]),false);
      }
    }else{
      const heavy=['brute','bulwark'].includes(form),sensitive=['seer','listener'].includes(form);
      const torso=heavy?bruteTorso:sensitive?seerTorso:stalkerTorso;
      const chestScale=heavy?[1.38,1.11,1.13]:sensitive?[.80,1.12,.90]:[1,1,1];
      a.add(torso,dark);a.add(chest,armor,matrix([0,1.43,-.22],[.035,0,0],chestScale));
      a.box(armor,[.17,.14,.020],[0,1.49,-.303],[.035,0,0],.004);
      for(const side of [-1,1])a.box(dark,[.12,.11,.075],[side*.15,1.035,-.17],[.06,side*-.12,0],.009);
      for(let i=0;i<3;i++)a.box(armor,[.23-i*.015,.047,.018],[0,1.20-i*.072,-.194+i*.008],[.06,0,0],.004);
      // Split load-bearing chest plates, ventilation and actual fastening points.
      for(const side of [-1,1]){
        a.add(pectoral,servo,matrix([side*(heavy?.27:.20),1.50,-.284],[.04,side*-.18,side*-.05],[heavy?1.30:1,1,1]));
        a.box(hazard,[heavy?.12:.09,.035,.018],[side*(heavy?.27:.20),1.43,-.321],[0,0,side*.07],.006);
        for(let k=0;k<4;k++)a.box(dark,[.10,.016,.019],[side*.20,1.55+k*.035,-.323],[0,0,0],.004);
        for(const yy of [1.14,1.62])a.add(bolt,servo,matrix([side*.26,yy,-.24],[0,0,0],[.012,.012,.009]));
      }
      a.limb(servo,[-.06,1.05,.14],[-.06,1.30,.18],.019);a.limb(servo,[.06,1.05,.14],[.06,1.30,.18],.019);

      // Separated rib shells and a narrow flexible waist replace the solid barrel.
      for(const side of [-1,1])for(let i=0;i<3;i++){
        a.add(ribShell,armor,matrix([side*(.13-i*.008),1.20-i*.085,-.18+i*.018],[.08,side*-.30,side*-.12]));
      }
      for(let i=0;i<3;i++){
        a.add(jointShield,armor,matrix([0,1.15+i*.20,.26],[0,Math.PI,0],[heavy?1.8:1.3,1.4,1.4]));
        if(i===1)a.add(sensor,glow,matrix([0,1.35,.31],[0,0,0],[.014,.016,.008]),false);
      }
      a.add(jointShield,dark,matrix([0,1.305,-.282],[0,0,0],[1.1,1.2,.8]));
      for(let i=0;i<3;i++)a.box(glow,[.052-i*.009,.006,.003],[0,1.325-i*.020,-.312],[0,0,0],.001,false);
      // Exposed conduits, raised seams and rivets make the existing armour readable up close.
      for(const s of [-1,1])for(let i=0;i<2;i++){
        a.add(bolt,dark,matrix([s*(heavy?.37:.27),1.25+i*.10,-.235],[0,0,0],[.014,.014,.014]));
        a.limb(dark,[s*.22,1.03+i*.07,.21],[s*.30,1.08+i*.07,.25],.011,.009);
      }
      if(form==='listener')for(const s of [-1,1]){
        // Acoustic dishes and three sensor hoops identify this long-range tracker.
        a.limb(armor,[s*.16,1.62,.13],[s*.45,1.88,.19],.04,.025);
        a.add(acousticDish,armor,matrix([s*.47,1.9,.14]));
        a.add(bolt,glow,matrix([s*.47,1.9,.169],[0,0,0],[.027,.027,.014]),false);
        if(s===1)a.add(acousticRing,armor,matrix([0,1.79,.25],[0,Math.PI/2,0],[1.4,1.4,1.4]));
      }
      for(const s of [-1,1]){
        a.limb(dark,[s*.23,1.64,.17],[s*.15,1.02,.20],.022);
        a.limb(armor,[s*.095,1.59,.27],[s*.095,1.25,.28],.046,.043);
        a.add(jointShield,armor,matrix([s*.21,1.01,-.128],[0,s*-.35,s*-.10],[1.4,1.15,.8]));
      }
      const neck=bone('sensor-head',[0,.465,-.032],thorax),h=assembly(neck);
      const headScale=form==='bulwark'?[1.10,.94,1.10]:heavy?[1.18,1.03,1.10]:sensitive?[.82,1.19,1.12]:[1,1,1];
      h.add(headShell,armor,matrix([0,1.865,-.032],[0,0,0],headScale));
      // A sealed optical visor and continuous jaw, rather than teeth or a face.
      h.add(visor,dark,matrix([0,1.905,-.219],[0,0,0],[headScale[0],1,1]));
      h.add(brow,armor,matrix([0,1.975,-.205],[0,0,0],[headScale[0],1,1]));
      h.limb(servo,[0,1.69,.02],[0,1.84,.02],.061,.051);
      for(const yy of [1.72,1.77,1.81])h.add(ring,dark,matrix([0,yy,.02],[Math.PI/2,0,0],[.48,.48,.48]));
      for(const s of [-1,1]){
        h.ellipsoid(dark,[s*.158,1.84,.005],[.033,.07,.082]);
        const eyeZ=-.032-.240*headScale[2];
        if(form!=='seer')h.add(sensor,optics,matrix([s*.064,1.91,eyeZ],[0,0,0],[.039,.010,.017]),false);
        h.add(jointShield,servo,matrix([s*.079,1.787,-.203],[0,s*-.30,s*-.22],[.40,.45,.48]));
        if(heavy){
          h.add(cowl,armor,matrix([s*.155,1.99,-.02],[0,s*-.42,s*-.35],[1.1,1.05,1.8]));
          h.limb(servo,[s*.20,1.93,.02],[s*.20,2.045,.06],.016,.011);
        }else if(sensitive){
          h.limb(dark,[s*.115,2.00,.035],[s*.13,2.26,.10],.029,.009);
          h.add(sensor,glow,matrix([s*.13,2.27,.10],[0,0,0],[.020,.034,.020]),false);
        }else{
          h.add(cowl,servo,matrix([s*.13,1.99,-.005],[0,s*-.50,s*-.12],[.40,.65,1.0]));
        }
      }
      h.add(jointShield,armor,matrix([0,1.807,-.225],[.12,0,0],[.91,.66,.55]));
      h.box(dark,[.066,.009,.004],[0,1.782,-.25],[.12,0,0],.001);
      if(form==='seer'){
        h.add(ring,dark,matrix([0,1.918,-.291],[0,0,0],[.53,.53,.53]));
        h.add(sensor,optics,matrix([0,1.918,-.315],[0,0,0],[.049,.049,.019]),false);
      }
      // Articulated manipulator arms retain paired fingers and hydraulic elbows.
      for(const s of [-1,1]){
        const shoulder=heavy?.59:sensitive?.34:.43,handX=heavy?.72:sensitive?.48:.60;
        const shoulderAt=[s*shoulder,1.58,0],elbowAt=[s*(handX-.03),1.23,-.055],wristAt=[s*handX,.95,-.19];
        const upper=bone(`arm-${s}-shoulder`,[shoulderAt[0],.18,0],thorax);
        const lower=bone(`arm-${s}-elbow`,elbowAt.map((v,i)=>v-shoulderAt[i]),upper);
        const wrist=bone(`arm-${s}-wrist`,wristAt.map((v,i)=>v-elbowAt[i]),lower);
        const u=assembly(upper),l=assembly(lower),f=assembly(wrist),large=heavy;
        u.ellipsoid(dark,shoulderAt,[.105,.105,.105]);
        const shoulderShell=carriesFieldRifle(form)?a:u;
        shoulderShell.add(pauldron,armor,matrix([shoulderAt[0],1.61,-.055],[-.18,s*-.28,s*-.19],large?[1.65,1.4,1.5]:[1.2,1.05,1.3]));
        u.limb(armor,[s*(shoulder+.005),1.50,0],[elbowAt[0],1.27,-.055],large?.123:.088,.067);
        u.limb(dark,[s*(shoulder+.045),1.51,.07],[elbowAt[0]+s*.04,1.27,.028],.022,.017);
        l.ellipsoid(dark,elbowAt,[.084,.078,.082]);
        l.add(ring,servo,matrix([elbowAt[0]+s*.069,elbowAt[1],elbowAt[2]],[0,Math.PI/2,0],[.48,.48,.48]));
        l.limb(armor,[elbowAt[0],1.19,-.071],wristAt,large?.117:.095,.051);
        if(form!=='bulwark')l.add(vambrace,armor,matrix([wristAt[0]-s*.025,1.075,-.175],[.3,s*.12,s*.08],[large?1.2:1,1,1]));
        l.limb(dark,[elbowAt[0]+s*.055,1.19,-.015],[wristAt[0]+s*.04,.99,-.13],.021,.015);
        l.limb(armor,[elbowAt[0]+s*.07,1.17,-.04],[wristAt[0]+s*.055,1.01,-.13],.008,.006);
        if(form==='bulwark'){
          // A layered ballistic forearm plate, tied to its elbow rather than floating.
          l.add(bulwarkShield,armor,matrix([s*.74,1.15,-.20],[0,s*.18,0],[.72,1.45,.9]));
          l.add(bulwarkShield,dark,matrix([s*.74,1.15,-.225],[0,s*.18,0],[.56,1.22,.92]));
          for(let i=0;i<2;i++)l.limb(armor,[s*.74-.11,1+i*.15,-.29],[s*.74+.11,1+i*.15,-.29],.014);
        }
        f.ellipsoid(dark,[wristAt[0],.92,-.203],[.071,.075,.047]);
        for(const finger of [-1.5,-.5,.5,1.5]){
          f.limb(servo,[wristAt[0]+finger*.026,.90,-.208],[wristAt[0]+finger*.029,.83,-.24],.011,.009);
          f.limb(dark,[wristAt[0]+finger*.029,.83,-.24],[wristAt[0]+finger*.024,.81,-.29],.009,.007);
        }
        f.limb(dark,[wristAt[0]-s*.065,.94,-.20],[wristAt[0]-s*.084,.90,-.23],.014,.011);
        f.limb(servo,[wristAt[0]-s*.084,.90,-.23],[wristAt[0]-s*.045,.875,-.265],.011,.009);
        if(elite||large)shoulderShell.add(pauldron,armor,matrix([s*(shoulder+.035),1.69,.025],[-1.1,s*-.2,s*-.25],[1.05,.82,1]));
        armRig.push({upper,lower,wrist,side:s});
      }
      for(const s of [-1,1]){
        const x=s*.225,upper=bone(`leg-${s}-hip`,[x,0,0],pelvis),lower=bone(`leg-${s}-knee`,[0,-.415,0],upper),ankle=bone(`leg-${s}-ankle`,[0,-.39,0],lower);
        const u=assembly(upper),l=assembly(lower),f=assembly(ankle);
        u.ellipsoid(dark,[x,.90,0],[.112,.098,.11]);u.add(thigh,armor,matrix([x,.93,0]));
        u.limb(dark,[x+s*.07,.84,.058],[x+s*.07,.58,.056],.025,.018);
        l.ellipsoid(dark,[x,.515,0],[.11,.105,.108]);l.add(calf,armor,matrix([x,.515,0]));
        l.add(ring,servo,matrix([x+s*.098,.515,0],[0,Math.PI/2,0],[.66,.66,.66]));
        l.limb(servo,[x-s*.044,.45,.07],[x-s*.044,.17,.055],.016,.011);
        l.box(hazard,[.065,.025,.018],[x,.34,-.106],[0,0,0],.004);
        l.dome(armor,[x,.51,-.082],[.11,.081,.08],[Math.PI/2,0,0]);
        l.add(shinPlate,armor,matrix([x,.29,-.086]));
        l.limb(dark,[x+s*.07,.465,.07],[x+s*.054,.18,.05],.019,.014);
        f.ellipsoid(dark,[x,.126,.006],[.081,.072,.079]);f.add(foot,armor,matrix([x,.125,0]));
        f.ellipsoid(dark,[x,.025,-.073],[.103,.02,.166]);
        legRig.push({upper,lower,foot:ankle,side:s});
      }
      if(ranged){
        if(carriesFieldRifle(form)){
          const p=FIELD_RIFLE.pivot,m=FIELD_RIFLE.muzzle;groundGun=bone('aimed-field-rifle',[p.x,p.y-1.40,p.z],thorax);const rifle=assembly(groundGun);
          rifle.add(rifleReceiver,armor,matrix([p.x,1.665,-.085]));
          rifle.box(dark,[.095,.12,.18],[p.x,1.65,.17],[0,0,0],.015);
          rifle.box(dark,[.055,.14,.075],[p.x,1.55,.045],[-.18,0,0],.009);
          rifle.box(armor,[.13,.11,.15],[p.x,1.65,-.31],[0,0,0],.012);
          rifle.limb(dark,[p.x,1.69,-.30],[p.x,1.69,-.51],.036,.028);
          rifle.add(barrelRing,servo,matrix([p.x,1.69,-.49],[0,0,0],[.28,.28,.28]));
          rifle.box(dark,[.055,.028,.23],[p.x,1.752,-.10],[0,0,0],.005);
          gunSignal=bone('weapon-ready-emitter',[m.x-p.x,m.y-p.y,m.z-p.z],groundGun);
          assembly(gunSignal).add(sensor,glow,matrix([m.x,m.y,m.z],[0,0,0],[.022,.022,.009]),false);
        }else{
          groundGun=bone('aimed-shoulder-weapon',[.37,.29,-.01],thorax);const cannon=assembly(groundGun);
          cannon.ellipsoid(armor,[.35,1.66,.15],[.12,.095,.20],[.09,0,-.13]);
          cannon.limb(dark,[.37,1.69,.12],[.37,1.69,-.32],.083,.059);
          cannon.add(ring,armor,matrix([.37,1.69,-.28],[0,0,0],[.65,.65,.65]));
          cannon.add(barrelRing,armor,matrix([.37,1.69,-.16],[0,0,0],[.62,.62,.62]));
          gunSignal=bone('weapon-ready-emitter',[0,0,-.335],groundGun);
          assembly(gunSignal).add(sensor,glow,matrix([.37,1.69,-.345],[0,0,0],[.054,.054,.018]),false);
        }
      }
    }
    const result={parts:bakeRig(assemblies),bones,legRig,armRig,pelvis,thorax,rotors,probeHead,probeSignal,groundGun,gunSignal,optics};
    cache.set(key,result);return result;
  }

  function create(elite=false,ranged=false,form='stalker'){
    if(!['stalker','scuttler','brute','seer','probe','listener','bulwark','synth'].includes(form))form='stalker';
    const kit=template(elite,ranged,form),root=new T.Group(),crawler=form==='scuttler',probe=form==='probe';
    root.name=({synth:'N-08 adaptive synthetic',stalker:'AI pursuit chassis',scuttler:'AI maintenance crawler',brute:'AI siege chassis',seer:'AI reconnaissance chassis',probe:'S-03 flying surveillance probe',listener:'E-06 acoustic tracker',bulwark:'B-11 armoured suppression unit'})[form];
    root.userData.form=form;root.userData.designRevision='3.63.1';root.userData.profile=ENEMY_PROFILES[form];root.userData.surfaceStyle='weathered graphite alloy / sealed military helmet / layered armour / exposed actuators';
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
    root.userData.skeleton=skeleton;root.userData.legs=legs;
    if(!crawler&&!probe)for(const leg of legs)root.userData['leg'+leg.side]=leg.upper;
    const pelvis=joints[kit.pelvis],thorax=joints[kit.thorax],head=joints.find(joint=>joint.name==='sensor-head');
    const direction=new T.Vector3(),bend=new T.Vector3(),knee=new T.Vector3(),target=new T.Vector3(),hip=new T.Vector3();
    const q=new T.Quaternion(),inverse=new T.Quaternion();
    // Cached bind directions let six independent two-link chains solve each foot
    // target. Alternating tripods keep three points of contact throughout a step.
    if(crawler)for(const leg of legs){
      leg.upperBind=new T.Vector3(...leg.knee).sub(new T.Vector3(...leg.hip));leg.upperLength=leg.upperBind.length();leg.upperBind.normalize();
      leg.lowerBind=new T.Vector3(...leg.ankle).sub(new T.Vector3(...leg.knee));leg.lowerLength=leg.lowerBind.length();leg.lowerBind.normalize();
    }
    let previousTime=null,previousX=0,previousZ=0,motionSpeed=0,cycle=0;
    root.userData.animate=(time,phase=0,moving=true,flight={},simulationTime=time)=>{
      const alert=enemyAlertState(flight,simulationTime);
      if(root.userData.alertState!==alert){eyeMaterial.color.setHex(ENEMY_OPTICS[alert]);root.userData.alertState=alert;}
      if(kit.groundGun!==null){
        const pulse=simulationTime-(flight.lastShotAt??-99)<.12?1:0;
        joints[kit.groundGun].rotation.x=T.MathUtils.clamp(riflePose&&alert==='idle'?-.30:flight.aimPitch||0,FIELD_RIFLE.minPitch,FIELD_RIFLE.maxPitch);
        joints[kit.groundGun].position.z=-.01+pulse*.05;
        joints[kit.gunSignal].scale.setScalar(1+(flight.chargeProgress||0)*.45+pulse*.9);
      }
      if(probe){
        const damaged=(flight.limpUntil||0)>simulationTime;
        pelvis.rotation.set(Math.sin(time*2+phase)*.018,0,Math.sin(time*1.7+phase)*.025+(damaged?.06:0));
        pelvis.position.y=.55+Math.sin(time*2.1+phase)*.018;
        for(const [i,rotor] of kit.rotors.entries())joints[rotor.index].rotation.y=time*(damaged&&i===0?12:42)*rotor.side+phase;
        joints[kit.probeHead].rotation.x=T.MathUtils.clamp(flight.aimPitch||0,-.55,.4);
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
      cycle+=motionSpeed*dt*Math.PI/(2*stride);
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
        const gait=Math.sin(cycle)*amount;pelvis.position.y=.909-pace*.048-brace+Math.cos(cycle*2)*.004*amount;
        thorax.rotation.set(.012+pace*.032+(covered?.045:0)-recoil*.018,-gait*.024,(pose==='peek'?.035:0)+gait*.012);
        if(head){head.rotation.y=gait*.018+(alert==='idle'?Math.sin(time*.65+phase)*.06*(1-amount):0);head.rotation.x=-thorax.rotation.x*.6+(alert==='engaged'?T.MathUtils.clamp(flight.aimPitch||0,-.18,.18):0);}
        for(const leg of legs){
          const step=cycle+(leg.side===1?Math.PI:0),swing=Math.sin(step)*amount;
          const z=Math.cos(step)*stride*amount,lift=Math.max(0,swing)*(.07+pace*.025);
          const drop=pelvis.position.y-(.125+lift),distance=Math.min(.8049,Math.hypot(drop,z));
          const hipBend=Math.acos(T.MathUtils.clamp((.415**2+distance**2-.39**2)/(2*.415*distance),-1,1));
          leg.upper.rotation.x=Math.atan2(-z,drop)+hipBend;
          leg.lower.rotation.x=-Math.acos(T.MathUtils.clamp((distance**2-.415**2-.39**2)/(2*.415*.39),-1,1));
          leg.foot.rotation.x=-leg.upper.rotation.x-leg.lower.rotation.x+(lift>0?swing*.13:0);
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
