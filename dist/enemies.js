import * as T from './vendor/three.webgpu.min.js';
import { Assembly, loft, armorPanel, matrix } from './geo.js';
import { addClosedHelmet } from './helmet.js';

const torso = loft([[.83,.24,.19],[.99,.28,.22],[1.16,.34,.25],[1.39,.40,.27],[1.57,.42,.26],[1.70,.30,.19],[1.78,.12,.11]],18);
const chest = armorPanel([[-.20,-.22],[.20,-.22],[.35,-.06],[.38,.16],[.23,.24],[-.23,.24],[-.38,.16],[-.35,-.06]],.04,.035);
const thigh = loft([[-.40,.11,.106],[-.32,.14,.14],[-.18,.168,.163],[-.035,.16,.15],[0,.123,.12]],14);
const calf = loft([[-.80,.086,.10,.018],[-.71,.10,.12,.027],[-.59,.135,.144,.036],[-.44,.12,.115],[ -.37,.113,.11]],14);
const shin = armorPanel([[-.075,-.18],[.075,-.18],[.104,.12],[.072,.17],[-.072,.17],[-.104,.12]],.023,.017);
const hand = loft([[-.16,.06,.037],[-.11,.083,.046],[-.025,.071,.039],[.02,.04,.03]],12);
const ring = new T.TorusGeometry(.12,.011,6,18);

// Detailed geometry is built once for each enemy type, shared by every instance and batched by material.
// Two complete leg meshes animate at the hip; armour, boots and joints move together.
export function createEnemyFactory(mats) {
  const cache=new Map();
  function template(elite,ranged) {
    const key=(elite?1:0)+(ranged?2:0);if(cache.has(key))return cache.get(key);
    const body=new T.Group(),a=new Assembly(),armor=elite?mats.monsterElite:mats.monster,dark=mats.monsterFace;
    const glow=ranged?mats.cyan:mats.violet;
    a.add(torso,armor);
    a.add(chest,armor,matrix([0,1.40,-.235]));
    // Segmented abdomen and reinforced back harness.
    for(let i=0;i<3;i++)a.box(dark,[.41-i*.035,.045,.04],[0,1.14-i*.082,-.238+i*.018],[.06,0,0],.004);
    a.box(armor,[.48,.38,.11],[0,1.44,.246],[0,0,0],.004);
    for(const s of [-1,1]) {
      a.limb(dark,[s*.22,1.71,.168],[s*.13,1.04,.207],.016);
      a.limb(armor,[s*.09,1.61,.32],[s*.09,1.22,.32],.052);
      a.dome(armor,[s*.45,1.58,0],[.225,.13,.215],[0,0,s*-.16]);
      a.limb(armor,[s*.44,1.54,0],[s*.58,1.22,-.055],.112,.099);
      a.limb(dark,[s*.58,1.22,-.055],[s*.595,1.12,-.11],.097,.092);
      a.limb(armor,[s*.595,1.14,-.108],[s*.61,.94,-.208],.105,.075);
      a.add(hand,dark,matrix([s*.615,.91,-.21],[.3,0,s*-.1]));
      // Shaped shoulder flange and narrow warning strips.
      a.box(dark,[.11,.055,.19],[s*.54,1.65,-.018],[0,0,s*-.18],.004);
      a.box(glow,[.061,.012,.012],[s*.53,1.67,-.12],[0,0,s*-.18],.002,false);
      a.box(dark,[.13,.08,.039],[s*.60,1.105,-.178],[.22,0,0],.004);
      if(elite) {
        a.box(armor,[.075,.20,.21],[s*.58,1.61,.024],[0,0,s*-.3],.005);
        a.box(glow,[.01,.11,.015],[s*.62,1.63,-.092],[0,0,s*-.3],.002,false);
      }
    }
    const helmet=new Assembly();
    addClosedHelmet(helmet,{armor,trim:armor,visor:dark,fabric:dark,glow,metal:armor},{scale:1.13,hostile:true});
    for(const item of helmet.items)a.add(item.geometry,item.material,matrix([0,1.865,-.032]),item.shadow);
    // The recognisable energy core remains at the original projectile/aim height.
    a.add(ring,dark,matrix([0,1.23,-.291]));
    a.ball(glow,[0,1.23,-.296],[.059,.059,.012],false);
    if(ranged) {
      a.box(armor,[.26,.43,.14],[0,1.49,.32],[.05,0,0],.005);
      for(const s of [-1,1]) {
        a.limb(dark,[s*.18,1.32,.31],[s*.18,1.65,.31],.064);
        a.limb(glow,[s*.18,1.34,.372],[s*.18,1.62,.372],.014,.014,false);
        a.box(armor,[.094,.20,.09],[s*.61,1.08,-.16],[.22,0,0],.004);
      }
    }
    a.build(body);
    const legTemplates=[];
    for(const s of [-1,1]) {
      const group=new T.Group(),leg=new Assembly();
      leg.add(thigh,armor);leg.add(calf,armor);
      leg.ball(armor,[0,-.395,-.007],[.137,.127,.131]);
      leg.add(shin,armor,matrix([0,-.605,-.119]));
      leg.box(armor,[.218,.104,.316],[0,-.846,-.069],[.08,0,0],.004);
      leg.box(armor,[.228,.034,.328],[0,-.906,-.074],[0,0,0],.004);
      // The knee and toe are closed armour; no exposed skin on hostile humanoids either.
      leg.box(armor,[.16,.084,.048],[0,-.397,-.128],[.08,0,0],.004);
      const meshes=leg.build(group);
      legTemplates.push(meshes[0].geometry); // all leg pieces use the same material, hence a single mesh
    }
    const result={body:body.children.map(mesh=>({geometry:mesh.geometry,material:mesh.material,shadow:mesh.castShadow})),legs:legTemplates};
    cache.set(key,result);return result;
  }
  function create(elite=false,ranged=false) {
    const kit=template(elite,ranged),root=new T.Group();root.name=elite?'Portal heavy':ranged?'Portal gunner':'Portal hunter';
    root.scale.setScalar(elite?1.3:1);
    for(const part of kit.body){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=mesh.receiveShadow=part.shadow;root.add(mesh);}
    for(const [i,s] of [-1,1].entries()) {
      const leg=new T.Mesh(kit.legs[i],elite?mats.monsterElite:mats.monster);
      leg.position.set(s*.225,.93,0);leg.castShadow=leg.receiveShadow=true;root.add(leg);root.userData['leg'+s]=leg;
    }
    root.userData.animate=(time,phase=0,moving=true)=>{
      const swing=moving?Math.sin(time*8+phase)*.25:0;
      root.userData['leg-1'].rotation.x=swing;root.userData.leg1.rotation.x=-swing;
    };
    return root;
  }
  return {create};
}
