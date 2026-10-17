import * as T from './vendor/three.webgpu.min.js';
import { Assembly, loft, armorPanel, matrix, merge, bevelBox, limb as lightweightLimb } from './geo.js';
import {SURFACE_DATA} from './levels/vesper-01-textures.js';
import { enemyScale } from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';

const stalkerTorso=loft([[.88,.22,.17],[1.03,.25,.20],[1.23,.32,.23],[1.46,.39,.255],[1.63,.34,.22],[1.73,.16,.13]],18);
const bruteTorso=loft([[.84,.29,.22],[1.04,.39,.26],[1.26,.47,.31],[1.50,.51,.29],[1.67,.38,.23],[1.78,.17,.13]],20);
const seerTorso=loft([[.88,.16,.15],[1.10,.20,.18],[1.31,.24,.20],[1.56,.26,.205],[1.73,.19,.15],[1.85,.09,.08]],18);
const crawlerShell=loft([[.48,.25,.34],[.58,.37,.48],[.75,.43,.53],[.91,.38,.45],[1.02,.24,.31]],22);
const chest=armorPanel([[-.18,-.20],[.18,-.20],[.33,-.04],[.35,.13],[.21,.22],[-.21,.22],[-.35,.13],[-.33,-.04]],.028,.055);
const thigh=loft([[-.36,.078,.084],[-.28,.111,.116],[-.11,.143,.136],[0,.115,.11]],14);
const calf=loft([[-.355,.065,.073,.012],[-.28,.087,.10,.025],[-.13,.117,.115,.025],[-.035,.10,.093]],14);
const foot=loft([[-.118,.086,.158,-.058],[-.09,.10,.165,-.061],[-.038,.093,.142,-.038],[.034,.075,.089,.016]],14);
const shinPlate=armorPanel([[-.054,-.15],[.054,-.15],[.085,.10],[.06,.155],[-.06,.155],[-.085,.10]],.016,.022);
const sensor=new T.SphereGeometry(1,10,7),shellSphere=new T.SphereGeometry(1,12,8);
const jointSphere=new T.SphereGeometry(1,8,6);
const shellDome=new T.SphereGeometry(1,14,7,0,Math.PI*2,0,Math.PI/2);
const ring=new T.TorusGeometry(.12,.012,5,16);
const barrelRing=new T.TorusGeometry(.12,.012,3,10);
const acousticRing=new T.TorusGeometry(.12,.012,4,10),bolt=new T.SphereGeometry(1,6,3);
const probeDuct=new T.TorusGeometry(.205,.038,6,24),probeRim=new T.TorusGeometry(.19,.022,6,24);
const headShell=loft([[-.18,.065,.075,-.035],[-.11,.14,.17,-.019],[.015,.164,.205,.003],[.14,.12,.163,.035],[.205,.036,.074,.06]],18);
const headFace=loft([[-.12,.054,.04,-.181],[-.02,.12,.035,-.197],[.084,.112,.032,-.174],[.115,.061,.025,-.149]],16);

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
  const cache=new Map(),loader=new T.TextureLoader();
  const detail=type=>{if(typeof document==='undefined')return null;const t=loader.load(SURFACE_DATA.steel[type]);t.wrapS=t.wrapT=T.RepeatWrapping;if(type==='color')t.colorSpace=T.SRGBColorSpace;return t;};
  const color=detail('color'),height=detail('height'),surface=detail('surface');
  const frame=mats.monster.clone();frame.color.setHex(0xc8c9b7);frame.map=color;frame.bumpMap=height;frame.bumpScale=.006;frame.roughnessMap=surface;frame.metalnessMap=surface;frame.roughness=1;frame.metalness=.82;
  const heavyFrame=frame.clone();heavyFrame.color.setHex(0x8b928a);
  const mechanism=mats.monsterFace.clone();mechanism.color.setHex(0x171c1c);mechanism.map=color;mechanism.bumpMap=height;mechanism.bumpScale=.003;mechanism.roughness=.42;mechanism.metalness=.85;
  const servo=new T.MeshStandardMaterial({color:0x909d9b,roughness:.30,metalness:.88,envMap:mats.monster.envMap,envMapIntensity:.45});
  const hazard=new T.MeshStandardMaterial({color:0x9c7d34,roughness:.72,metalness:.4});

  function template(elite,ranged,form){
    const key=`${form}:${elite?1:0}:${ranged?1:0}`;if(cache.has(key))return cache.get(key);
    const armor=elite?heavyFrame:frame,dark=mechanism;
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
      a.dome(armor,[0,.62,.06],[.40,.28,.41],[0,0,0]);
      a.dome(armor,[0,.47,.03],[.35,.24,.39],[Math.PI,0,0]);
      a.add(ring,armor,matrix([0,.55,0],[Math.PI/2,0,0],[3.5,3.5,3.5]));
      for(let k=0;k<8;k++){const angle=k*Math.PI/4;a.add(bolt,servo,matrix([Math.cos(angle)*.37,.62,Math.sin(angle)*.39],[0,0,0],[.014,.015,.014]));}
      for(const side of [-1,1])a.box(hazard,[.10,.022,.20],[side*.23,.865,.02],[0,0,side*.2],.004);
      for(const side of [-1,1]){
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
        a.dome(armor,[0,.90-i*.012,z],[.38*scale,.16,.21],[.13,0,0]);
        a.box(servo,[.17*scale,.032,.055],[0,1.045-i*.01,z+.045],[.13,0,0],.009);
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
      const heavy=['brute','bulwark'].includes(form),sensitive=['seer','listener'].includes(form);
      const torso=heavy?bruteTorso:sensitive?seerTorso:stalkerTorso;
      const chestScale=heavy?[1.38,1.11,1.13]:sensitive?[.80,1.12,.90]:[1,1,1];
      a.add(torso,dark);a.add(chest,armor,matrix([0,1.43,-.22],[.035,0,0],chestScale));
      // Split load-bearing chest plates, ventilation and actual fastening points.
      for(const side of [-1,1]){
        a.box(servo,[heavy?.16:.12,.20,.035],[side*(heavy?.27:.20),1.50,-.295],[.04,side*-.10,0],.015);
        a.box(hazard,[heavy?.12:.09,.035,.018],[side*(heavy?.27:.20),1.43,-.321],[0,0,side*.07],.006);
        for(let k=0;k<4;k++)a.box(dark,[.10,.016,.019],[side*.20,1.55+k*.035,-.323],[0,0,0],.004);
        for(const yy of [1.14,1.62])a.add(bolt,servo,matrix([side*.26,yy,-.24],[0,0,0],[.012,.012,.009]));
      }
      a.limb(servo,[-.06,1.05,.14],[-.06,1.30,.18],.019);a.limb(servo,[.06,1.05,.14],[.06,1.30,.18],.019);

      // Separated rib shells and a narrow flexible waist replace the solid barrel.
      for(const side of [-1,1])for(let i=0;i<3;i++){
        a.ellipsoid(armor,[side*(.19-i*.015),1.20-i*.098,-.10+i*.024],[.13,.048,.145],[.08,0,side*-.11]);
      }
      for(let i=0;i<5;i++){
        a.ellipsoid(armor,[0,1.04+i*.14,.22+i*.015],[form==='brute'?.13:.09,.062,.073]);
        if(i%2===0)a.add(sensor,glow,matrix([0,1.04+i*.14,.293+i*.015],[0,0,0],[.024,.018,.008]),false);
      }
      a.add(ring,dark,matrix([0,1.31,-.295],[0,0,0],[.83,.83,.83]));
      a.add(sensor,glow,matrix([0,1.31,-.308],[0,0,0],[.058,.058,.016]),false);
      // Exposed conduits, raised seams and rivets make the existing armour readable up close.
      for(const s of [-1,1])for(let i=0;i<2;i++){
        a.add(bolt,dark,matrix([s*(heavy?.37:.27),1.25+i*.10,-.235],[0,0,0],[.014,.014,.014]));
        a.limb(dark,[s*.22,1.03+i*.07,.21],[s*.30,1.08+i*.07,.25],.011,.009);
      }
      if(form==='listener')for(const s of [-1,1]){
        // Acoustic dishes and three sensor hoops identify this long-range tracker.
        a.limb(armor,[s*.16,1.62,.13],[s*.45,1.88,.19],.04,.025);
        a.add(sensor,dark,matrix([s*.47,1.9,.19],[0,0,0],[.18,.09,.18]));
        a.add(acousticRing,armor,matrix([s*.47,1.9,.10],[0,0,0],[1.5,1.5,1.5]));
        a.add(bolt,glow,matrix([s*.47,1.9,.09],[0,0,0],[.027,.027,.014]),false);
        if(s===1)a.add(acousticRing,armor,matrix([0,1.79,.25],[0,Math.PI/2,0],[1.4,1.4,1.4]));
      }
      for(const s of [-1,1]){
        a.limb(dark,[s*.23,1.64,.17],[s*.15,1.02,.20],.022);
        a.limb(armor,[s*.095,1.59,.27],[s*.095,1.25,.28],.046,.043);
        a.ellipsoid(armor,[s*.18,1.00,-.035],[.14,.15,.16]);
      }
      const neck=bone('sensor-head',[0,.465,-.032],thorax),h=assembly(neck);
      const headScale=heavy?[1.18,1.03,1.10]:sensitive?[.82,1.19,1.12]:[1,1,1];
      h.add(headShell,armor,matrix([0,1.865,-.032],[0,0,0],headScale));
      h.add(headFace,dark,matrix([0,1.865,-.032],[0,0,0],headScale));
      h.limb(servo,[0,1.69,.02],[0,1.84,.02],.061,.051);
      for(const yy of [1.72,1.77,1.81])h.add(ring,dark,matrix([0,yy,.02],[Math.PI/2,0,0],[.48,.48,.48]));
      for(const s of [-1,1]){
        h.ellipsoid(dark,[s*.158,1.84,.005],[.033,.07,.082]);
        h.add(sensor,optics,matrix([s*.07,1.91,-.257],[0,0,0],[.039,.020,.017]),false);
        h.box(servo,[.041,.060,.025],[s*.065,1.755,-.188],[0,0,s*-.22],.008);
        if(heavy){
          h.dome(armor,[s*.18,1.99,.015],[.16,.085,.21],[0,0,s*-.4]);
          h.box(servo,[.045,.15,.21],[s*.20,1.97,.03],[0,0,s*-.15],.018);
        }else if(sensitive){
          h.limb(dark,[s*.115,2.00,.035],[s*.13,2.26,.10],.029,.009);
          h.add(sensor,glow,matrix([s*.13,2.27,.10],[0,0,0],[.020,.034,.020]),false);
        }else{
          h.box(servo,[.035,.095,.17],[s*.16,1.98,.025],[0,0,s*-.08],.013);
        }
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
        u.dome(armor,[shoulderAt[0],1.61,0],large?[.28,.20,.26]:[.20,.125,.19],[0,0,s*-.19]);
        u.limb(armor,[s*(shoulder+.005),1.50,0],[elbowAt[0],1.27,-.055],large?.123:.088,.067);
        u.limb(dark,[s*(shoulder+.045),1.51,.07],[elbowAt[0]+s*.04,1.27,.028],.022,.017);
        l.ellipsoid(dark,elbowAt,[.084,.078,.082]);
        l.add(ring,servo,matrix([elbowAt[0]+s*.069,elbowAt[1],elbowAt[2]],[0,Math.PI/2,0],[.48,.48,.48]));
        l.limb(armor,[elbowAt[0],1.19,-.071],wristAt,large?.117:.095,.051);
        l.limb(dark,[elbowAt[0]+s*.055,1.19,-.015],[wristAt[0]+s*.04,.99,-.13],.021,.015);
        l.limb(armor,[elbowAt[0]+s*.07,1.17,-.04],[wristAt[0]+s*.055,1.01,-.13],.008,.006);
        if(form==='bulwark'){
          // A layered ballistic forearm plate, tied to its elbow rather than floating.
          l.add(chest,armor,matrix([s*.74,1.15,-.20],[0,s*.18,0],[.72,1.45,.9]));
          l.add(chest,dark,matrix([s*.74,1.15,-.225],[0,s*.18,0],[.56,1.22,.92]));
          for(let i=0;i<2;i++)l.limb(armor,[s*.74-.11,1+i*.15,-.29],[s*.74+.11,1+i*.15,-.29],.014);
        }
        f.ellipsoid(dark,[wristAt[0],.92,-.203],[.071,.075,.047]);
        for(const finger of [-1,0,1]){
          f.limb(servo,[wristAt[0]+finger*.040,.90,-.208],[wristAt[0]+finger*.044,.83,-.24],.014,.012);
          f.add(bolt,dark,matrix([wristAt[0]+finger*.044,.83,-.24],[0,0,0],[.014,.014,.014]));
          f.limb(dark,[wristAt[0]+finger*.044,.83,-.24],[wristAt[0]+finger*.032,.81,-.29],.012,.009);
        }
        if(elite||large){u.dome(armor,[s*(shoulder+.07),1.66,.025],[.21,.12,.19],[.15,0,s*-.25]);}
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
        groundGun=bone('aimed-shoulder-weapon',[.37,.29,-.01],thorax);const cannon=assembly(groundGun);
        cannon.ellipsoid(armor,[.35,1.66,.19],[.16,.16,.23],[.09,0,-.13]);
        cannon.limb(dark,[.37,1.69,.12],[.37,1.69,-.32],.083,.059);
        cannon.add(ring,armor,matrix([.37,1.69,-.28],[0,0,0],[.65,.65,.65]));
        cannon.add(barrelRing,armor,matrix([.37,1.69,-.16],[0,0,0],[.62,.62,.62]));
        gunSignal=bone('weapon-ready-emitter',[0,0,-.335],groundGun);
        assembly(gunSignal).add(sensor,glow,matrix([.37,1.69,-.345],[0,0,0],[.054,.054,.018]),false);
      }
    }
    const result={parts:bakeRig(assemblies),bones,legRig,armRig,pelvis,thorax,rotors,probeHead,probeSignal,groundGun,gunSignal,optics};
    cache.set(key,result);return result;
  }

  function create(elite=false,ranged=false,form='stalker'){
    if(!['stalker','scuttler','brute','seer','probe','listener','bulwark'].includes(form))form='stalker';
    const kit=template(elite,ranged,form),root=new T.Group(),crawler=form==='scuttler',probe=form==='probe';
    root.name=({stalker:'AI pursuit chassis',scuttler:'AI maintenance crawler',brute:'AI siege chassis',seer:'AI reconnaissance chassis',probe:'S-03 flying surveillance probe',listener:'E-06 acoustic tracker',bulwark:'B-11 armoured suppression unit'})[form];
    root.userData.form=form;root.userData.designRevision='3.40';root.userData.surfaceStyle='weathered industrial steel / reactive optics';
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
        joints[kit.groundGun].rotation.x=T.MathUtils.clamp(flight.aimPitch||0,-.55,.4);
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
        const gait=Math.sin(cycle)*amount;pelvis.position.y=.909-pace*.048+Math.cos(cycle*2)*.004*amount;
        thorax.rotation.set(.012+pace*.032,-gait*.024,gait*.012);
        if(head){head.rotation.y=gait*.018+Math.sin(time*.65+phase)*.06*(1-amount);head.rotation.x=-thorax.rotation.x*.6;}
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
          arm.upper.rotation.x=gait*arm.side*(form==='brute'?.065:.115);
          arm.upper.rotation.z=arm.side*.015;arm.lower.rotation.x=-.025-Math.max(0,gait*arm.side)*.075;
          arm.wrist.rotation.x=-arm.lower.rotation.x*.4;
        }
      }
    };
    return root;
  }
  return {create};
}
