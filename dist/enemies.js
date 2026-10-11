import * as T from './vendor/three.webgpu.min.js';
import { Assembly, loft, armorPanel, matrix, bevelBox, limb as lightweightLimb, ball as lightweightBall } from './geo.js';
import { addClosedHelmet } from './helmet.js';

const stalkerTorso = loft([[.83,.24,.19],[.99,.28,.22],[1.16,.34,.25],[1.39,.40,.27],[1.57,.42,.26],[1.70,.30,.19],[1.78,.12,.11]],18);
const bruteTorso = loft([[.78,.32,.24],[.98,.40,.29],[1.18,.49,.32],[1.43,.55,.31],[1.62,.46,.26],[1.76,.30,.19],[1.82,.12,.11]],20);
const seerTorso = loft([[.79,.19,.17],[1.02,.23,.19],[1.24,.26,.21],[1.48,.29,.22],[1.67,.24,.18],[1.82,.15,.12],[1.9,.09,.08]],18);
const crawlerShell = loft([[.48,.25,.34],[.58,.37,.48],[.75,.43,.53],[.91,.38,.45],[1.02,.24,.31]],22);
const chest = armorPanel([[-.20,-.22],[.20,-.22],[.35,-.06],[.38,.16],[.23,.24],[-.23,.24],[-.38,.16],[-.35,-.06]],.04,.035);
const thigh = loft([[-.40,.11,.106],[-.32,.14,.14],[-.18,.168,.163],[-.035,.16,.15],[0,.123,.12]],14);
const calf = loft([[-.80,.086,.10,.018],[-.71,.10,.12,.027],[-.59,.135,.144,.036],[-.44,.12,.115],[-.37,.113,.11]],14);
const shin = armorPanel([[-.075,-.18],[.075,-.18],[.104,.12],[.072,.17],[-.072,.17],[-.104,.12]],.023,.017);
const hand = loft([[-.16,.06,.037],[-.11,.083,.046],[-.025,.071,.039],[.02,.04,.03]],12);
const ring = new T.TorusGeometry(.12,.011,6,18);
const sensor = new T.SphereGeometry(1,8,6);
const detailSphere = new T.SphereGeometry(1,9,6);
const detailDome = new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2);

// Reduced bevel subdivisions preserve the hostile silhouettes while staying within the mobile triangle budget.
class EnemyAssembly extends Assembly {
  box(material,size,position=[0,0,0],rotation=[0,0,0],radius=.006,shadow=true,level=1,maxLevel=10){
    return this.add(bevelBox(size[0],size[1],size[2],radius,1),material,matrix(position,rotation),shadow,level,maxLevel);
  }
  limb(material,a,b,r1,r2=r1,shadow=true,level=1,maxLevel=10){
    return this.add(lightweightLimb(a,b,r1,r2,6),material,null,shadow,level,maxLevel);
  }
  ball(material,center,r,shadow=true,level=1,maxLevel=10){
    return this.add(lightweightBall(center,r,[8,6]),material,null,shadow,level,maxLevel);
  }
  ellipsoid(material,center,radii,rotation=[0,0,0],shadow=true,level=1,maxLevel=10){
    return this.add(detailSphere,material,matrix(center,rotation,radii),shadow,level,maxLevel);
  }
  dome(material,center,radii,rotation=[0,0,0],shadow=true,level=1,maxLevel=10){
    return this.add(detailDome,material,matrix(center,rotation,radii),shadow,level,maxLevel);
  }
}

// Each alien chassis is assembled once, merged by material, and shared by every matching enemy.
// The four silhouettes keep the cost close to the original six meshes per creature.
export function createEnemyFactory(mats) {
  const cache=new Map();
  function bipedLeg(armor) {
    const group=new T.Group(),leg=new EnemyAssembly();
    leg.add(thigh,armor);leg.add(calf,armor);
    leg.ball(armor,[0,-.395,-.007],[.137,.127,.131]);
    leg.add(shin,armor,matrix([0,-.605,-.119]));
    leg.box(armor,[.218,.104,.316],[0,-.846,-.069],[.08,0,0],.004);
    leg.box(armor,[.228,.034,.328],[0,-.906,-.074],[0,0,0],.004);
    leg.box(armor,[.16,.084,.048],[0,-.397,-.128],[.08,0,0],.004);
    const meshes=leg.build(group);
    return meshes[0].geometry;
  }
  function template(elite,ranged,form) {
    const key=`${form}:${elite?1:0}:${ranged?1:0}`;if(cache.has(key))return cache.get(key);
    const body=new T.Group(),a=new EnemyAssembly(),armor=elite?mats.monsterElite:mats.monster,dark=mats.monsterFace;
    const glow=ranged?mats.cyan:form==='scuttler'?mats.rose:form==='seer'?mats.pale:mats.violet;
    const crawler=form==='scuttler';
    let legMeshes=[];

    if(crawler) {
      a.add(crawlerShell,armor);
      // Overlapping carapace shields, exposed cable gaps and a triple-sensor alien head.
      for(let i=0;i<4;i++) {
        const z=.27-i*.19,scale=1-i*.12;
        a.dome(armor,[0,.91-i*.015,z],[.33*scale,.12,.17],[.10,0,0]);
        a.limb(dark,[0,1.0-i*.01,z+.05],[0,1.17-i*.01,z+.055],.046*scale,.009,false);
      }
      a.dome(armor,[0,.94,-.48],[.255,.185,.26],[.13,0,0]);
      a.box(dark,[.29,.105,.12],[0,.83,-.63],[.15,0,0],.012);
      for(const s of [-1,1]) {
        a.limb(dark,[s*.10,.80,-.58],[s*.21,.59,-.79],.043,.018,false);
        a.limb(armor,[s*.21,.59,-.79],[s*.27,.47,-.91],.024,.007,false);
      }
      for(const s of [-1,0,1]) {
        a.add(sensor,glow,matrix([s*.095,.985,-.675],[0,0,0],[s===0?.043:.034,.03,.018]),false);
      }
      a.add(ring,dark,matrix([0,.77,-.625],[0,0,0],[.82,.82,.82]));
      a.add(sensor,glow,matrix([0,.77,-.642],[0,0,0],[.052,.052,.018]),false);

      // Six jointed legs flare out from the low shell, giving the crawler a wide silhouette.
      const legs=new EnemyAssembly(),legGroup=new T.Group();
      for(const side of [-1,1]) for(const [row,z] of [.28,-.02,-.32].entries()) {
        const hip=[side*.27,.69,z],knee=[side*(row===1?.53:.59),.43,z+(row-1)*.17],foot=[side*.73,.075,z+(row-1)*.31];
        legs.limb(dark,hip,knee,.075,.053);legs.ball(armor,knee,[.085,.076,.082]);
        legs.limb(armor,knee,foot,.059,.025);legs.ball(dark,foot,[.075,.04,.105]);
        legs.limb(armor,foot,[side*.82,.045,foot[2]-.11],.035,.006,false);
        legs.box(glow,[.042,.012,.08],[side*.62,.31,knee[2]],[0,0,side*.48],.003,false);
      }
      legMeshes=legs.build(legGroup).map(mesh=>({geometry:mesh.geometry,material:mesh.material,shadow:mesh.castShadow}));
      body.userData.legMotion=legGroup;
      body.add(legGroup);
      if(ranged) {
        a.box(armor,[.31,.22,.38],[0,.97,.34],[.12,0,0],.01);
        a.limb(dark,[0,1.0,.18],[0,1.0,-.24],.09,.07);
        a.add(sensor,glow,matrix([0,1.0,-.27],[0,0,0],[.075,.075,.025]),false);
      }
    } else {
      const torso=form==='brute'?bruteTorso:form==='seer'?seerTorso:stalkerTorso;
      const chestScale=form==='brute'?[1.36,1.08,1.12]:form==='seer'?[.82,1.1,.9]:[1,1,1];
      a.add(torso,armor);
      a.add(chest,armor,matrix([0,1.40,-.235],[0,0,0],chestScale));
      for(let i=0;i<(form==='seer'?5:3);i++)a.box(dark,[.41-i*.035,.045,.04],[0,1.14-i*.082,-.238+i*.018],[.06,0,0],.004);
      a.box(armor,[form==='brute'?.58:.48,.38,.11],[0,1.44,.246],[0,0,0],.004);
      // A row of vertebra-like plates makes the back read as a machine, not cloth armour.
      for(let i=0;i<5;i++) {
        const y=1.08+i*.145,z=.31+i*.018,half=form==='brute'?.13:.085;
        a.box(dark,[half*2,.095,.07],[0,y,z],[0,0,0],.008);
        if(i%2===0)a.box(glow,[.035,.035,.022],[0,y,z+.041],[0,0,0],.003,false);
      }
      for(const s of [-1,1]) {
        const shoulder=form==='brute'?.62:form==='seer'?.36:.45;
        const handX=form==='brute'?.72:.61;
        a.limb(dark,[s*.22,1.71,.168],[s*.13,1.04,.207],.016);
        a.limb(armor,[s*.09,1.61,.32],[s*.09,1.22,.32],.052);
        a.dome(armor,[s*shoulder,1.58,0],form==='brute'?[.32,.23,.28]:[.225,.13,.215],[0,0,s*-.16]);
        a.limb(armor,[s*shoulder,1.54,0],[s*(handX-.03),1.22,-.055],form==='brute'?.145:.112,.099);
        a.limb(dark,[s*(handX-.03),1.22,-.055],[s*handX,1.12,-.11],.097,.092);
        a.limb(armor,[s*handX,1.14,-.108],[s*(handX+.01),.94,-.208],.105,.075);
        a.add(hand,dark,matrix([s*(handX+.015),.91,-.21],[.3,0,s*-.1]));
        a.box(dark,[.11,.055,.19],[s*(shoulder+.08),1.65,-.018],[0,0,s*-.18],.004);
        a.box(glow,[.061,.012,.012],[s*shoulder,1.67,-.12],[0,0,s*-.18],.002,false);
        a.box(dark,[.13,.08,.039],[s*(handX+.01),1.105,-.178],[.22,0,0],.004);
        if(elite||form==='brute') {
          a.box(armor,[.11,.22,.23],[s*(shoulder+.05),1.63,.024],[0,0,s*-.3],.006);
          a.box(glow,[.014,.12,.019],[s*(shoulder+.11),1.64,-.092],[0,0,s*-.3],.002,false);
        }
        if(form==='brute') {
          a.limb(dark,[s*.23,1.96,.02],[s*.44,2.17,.06],.09,.012);
          a.limb(armor,[s*.23,1.96,.02],[s*.34,2.24,.10],.075,.005);
          a.dome(dark,[s*.47,1.54,-.02],[.12,.09,.13],[0,0,s*.38]);
        }
        if(form==='seer') {
          a.limb(dark,[s*.105,2.00,.015],[s*.13,2.29,.08],.045,.006);
          a.add(sensor,glow,matrix([s*.13,2.29,.08],[0,0,0],[.024,.043,.024]),false);
          a.limb(dark,[s*.34,1.49,.10],[s*.51,1.08,.17],.035,.008,false);
          a.limb(armor,[s*.51,1.08,.17],[s*.48,.91,.32],.023,.005,false);
        }
      }
      const helmet=new EnemyAssembly();
      addClosedHelmet(helmet,{armor,trim:armor,visor:dark,fabric:dark,glow,metal:armor},{scale:form==='brute'?1.2:form==='seer'?1.04:1.13,hostile:true});
      for(const item of helmet.items)a.add(item.geometry,item.material,matrix([0,1.865,-.032]),item.shadow);
      // Three sealed sensor lamps replace human eyes and define each alien's faceplate.
      for(const s of [-1,1])a.add(sensor,glow,matrix([s*.073,1.895,-.238],[0,0,0],[.034,.027,.012]),false);
      a.add(sensor,glow,matrix([0,2.005,-.218],[0,0,0],[.022,.035,.013]),false);
      a.add(ring,dark,matrix([0,1.23,-.291]));
      a.add(sensor,glow,matrix([0,1.23,-.306],[0,0,0],[.059,.059,.012]),false);
      if(form==='stalker') for(const s of [-1,1]) {
        a.limb(dark,[s*.18,1.83,-.02],[s*.28,1.98,-.1],.045,.006);
        a.limb(armor,[s*.28,1.98,-.1],[s*.36,1.94,-.12],.026,.004);
      }
      if(form==='seer') {
        a.box(dark,[.24,.09,.12],[0,1.78,.23],[.12,0,0],.01);
        for(let i=0;i<3;i++)a.limb(armor,[0,1.77,.27+i*.055],[0,2.13+i*.08,.31+i*.04],.065-i*.014,.004);
      }
      if(ranged) {
        // The ranged form carries an integrated shoulder rail-cannon and power spine.
        a.box(armor,[.32,.32,.29],[.38,1.63,.23],[.08,0,-.18],.008);
        a.limb(dark,[.42,1.66,.16],[.42,1.66,-.31],.082,.065);
        a.add(sensor,glow,matrix([.42,1.66,-.34],[0,0,0],[.068,.068,.022]),false);
        a.box(glow,[.04,.24,.03],[.15,1.62,.39],[0,0,0],.003,false);
      }
    }
    a.build(body);
    let bipedLegs=[];
    if(!crawler)bipedLegs=[bipedLeg(armor),bipedLeg(armor)];
    const result={body:body.children.filter(part=>part.isMesh).map(mesh=>({geometry:mesh.geometry,material:mesh.material,shadow:mesh.castShadow})),legs:bipedLegs,crawlerLegs:legMeshes};
    cache.set(key,result);return result;
  }
  function create(elite=false,ranged=false,form='stalker') {
    if(!['stalker','scuttler','brute','seer'].includes(form))form='stalker';
    const kit=template(elite,ranged,form),root=new T.Group();
    root.name=({stalker:'Portal stalker',scuttler:'Portal scuttler',brute:'Portal brute',seer:'Portal seer'})[form];
    root.userData.form=form;root.scale.setScalar(elite?1.3:form==='scuttler'?.98:form==='seer'?1.04:1);
    for(const part of kit.body){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=mesh.receiveShadow=part.shadow;root.add(mesh);}
    if(form==='scuttler') {
      const legs=new T.Group();legs.name='six articulated legs';
      for(const part of kit.crawlerLegs){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=mesh.receiveShadow=part.shadow;legs.add(mesh);}
      root.add(legs);root.userData.legMotion=legs;
    } else for(const [i,s] of [-1,1].entries()) {
      const leg=new T.Mesh(kit.legs[i],elite?mats.monsterElite:mats.monster);
      leg.position.set(s*.225,.93,0);leg.castShadow=leg.receiveShadow=true;root.add(leg);root.userData['leg'+s]=leg;
    }
    root.userData.animate=(time,phase=0,moving=true)=>{
      const swing=moving?Math.sin(time*8+phase)*.25:0;
      if(form==='scuttler') {
        root.userData.legMotion.rotation.x=moving?Math.sin(time*9+phase)*.075:0;
        root.userData.legMotion.rotation.z=moving?Math.sin(time*9+phase+Math.PI/2)*.035:0;
      } else {root.userData['leg-1'].rotation.x=swing;root.userData.leg1.rotation.x=-swing;}
    };
    return root;
  }
  return {create};
}
