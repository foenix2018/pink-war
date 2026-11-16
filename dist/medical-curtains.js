import {Assembly,bevelBox,matrix,limb} from './geo.js';
import {createCurtainFabric} from './fabric-surface.js';
import {sampleCurtainPoint} from './fabric-motion.js';

// Placement is restricted to the existing treatment beds. The open foot of a
// bay stays on the aisle; no fabric is placed across a door, stair or objective.
export const M02_CARE_CURTAINS=Object.freeze([82,88.2].flatMap(z=>[
 {x:16,z:z-1.14,width:2.9,yaw:0},
 {x:16,z:z+1.14,width:2.9,yaw:0},
 {x:14.55,z,width:2.28,yaw:Math.PI/2}
]).map(p=>Object.freeze({...p,y:2.7,height:2.02,ceiling:3.387,support:'ceiling'})));

export function medicalBedCurtains(p){
 const yaw=p.along==='z'?Math.PI/2:0,cos=Math.cos(yaw),sin=Math.sin(yaw);
 const at=(x,z,width,turn=0)=>({x:p.cx+cos*x+sin*z,z:p.cz-sin*x+cos*z,width,
  yaw:yaw+turn,y:p.y+2.75,floor:p.y,height:2.04,support:'stand'});
 return [at(0,-1.14,2.8),at(0,1.14,2.8)];
}

export function curtainFootprint({x,z,width,yaw=0},margin=.32){
 return {x,z,hx:Math.abs(Math.cos(yaw))*width/2+margin,hz:Math.abs(Math.sin(yaw))*width/2+margin};
}

export function createMedicalCurtains(T,parent,{webgpu=false,low=false,color=0x789792}={}){
 const root=new T.Group();root.name='Soins / box à rideaux sur tringles';parent.add(root);
 const fabric=createCurtainFabric(T,{webgpu,low,color}),hardware=new Assembly(),placements=[];
 const steel=new T.MeshStandardMaterial({color:0x86999e,roughness:.34,metalness:.82});
 const paint=new T.MeshStandardMaterial({color:0xb5c0ba,roughness:.58,metalness:.3});
 const polymer=new T.MeshStandardMaterial({color:0x45575b,roughness:.82,metalness:0});
 let built=false,disposed=false;
 function span(spec){
  if(built)throw new Error('Curtain spans must be placed before build');
  const {x,z,y=2.7,width=2.6,height=2.02,yaw=0,support='ceiling',ceiling=3.387,floor=0}=spec;
  placements.push({...spec,x,z,y,width,height,yaw});
  const group=new T.Group();group.position.set(x,y,z);group.rotation.y=yaw;root.add(group);
  const cloth=fabric.panel({width,height,phase:x*.17+z*.13,wind:.24});cloth.position.y=-.13;group.add(cloth);
  // Build the hardware in world space once; all rods, rings and brackets merge
  // into three material batches rather than a draw call for every tiny hook.
  const transform=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0)),new T.Vector3(1,1,1));
  function part(g,m,p,r=[0,0,0]){
   hardware.add(g,m,transform.clone().multiply(matrix(p,r)),!low);g.dispose();
  }
  function rod(a,b,r=.015,m=steel){part(limb(a,b,r,r,low?8:12),m,[0,0,0]);}
  function block(size,p,m=paint){part(bevelBox(...size,.007,1),m,p);}
  rod([-width/2-.11,0,0],[width/2+.11,0,0],.024);
  for(const side of [-1,1]){
   const xx=side*(width/2+.08);
   part(new T.SphereGeometry(.031,low?8:12,8),polymer,[side*(width/2+.12),0,0]);
   if(support==='ceiling'){
    rod([xx,0,0],[xx,ceiling-y-.015,0],.013);
    block([.14,.026,.14],[xx,ceiling-y,0]);
    for(const zz of [-.044,.044])part(new T.CylinderGeometry(.009,.009,.029,6),steel,[xx,ceiling-y-.012,zz]);
   }else{
    rod([xx,floor-y+.07,0],[xx,.015,0],.021);
    rod([xx,floor-y+.055,-.23],[xx,floor-y+.055,.23],.026);
    for(const zz of [-.23,.23])block([.08,.055,.07],[xx,floor-y+.0275,zz],polymer);
    part(new T.CylinderGeometry(.031,.031,.10,12),polymer,[xx,-1.15,0]);
   }
  }
  const rings=Math.max(8,Math.round(width/.24)),point={};
  for(let i=0;i<rings;i++){
   const u=(i+.5)/rings;sampleCurtainPoint(u,0,0,{width,height},point);
   part(new T.TorusGeometry(.046,.007,low?4:6,low?10:16),steel,[point.x,0,0],[0,Math.PI/2,0]);
   rod([point.x,-.047,0],[point.x,-.13,point.z],.0045);
   // Reinforced eyelets at the fixed cloth seam, each aligned to a real hook.
   part(new T.TorusGeometry(.012,.003,4,8),paint,[point.x,-.13,point.z]);
  }
  return cloth;
 }
 return {root,span,build(){if(built)return;built=true;hardware.build(root);for(const item of hardware.items)item.geometry.dispose();hardware.items.length=0;},
  update:(time,eye)=>fabric.update(time,eye),
  stats:()=>({...fabric.stats(),spans:placements.map(p=>({...p})),hardwareBatches:built?3:0}),
  dispose(){if(disposed)return;disposed=true;fabric.dispose();root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const item of hardware.items)item.geometry.dispose();hardware.items.length=0;steel.dispose();paint.dispose();polymer.dispose();}
 };
}
