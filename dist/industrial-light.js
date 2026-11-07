import {Assembly,bevelBox,matrix,limb} from './geo.js';
export const INDUSTRIAL_LIGHT_KINDS=new Set(['hanging','cage','bulb','highbay','flood','sodium','emergency','beacon','lamp','lantern','panel']);

// Replaces ONLY fixture batches supplied by the level's lighting system.
// Original instance transforms and live colours keep power/flicker behaviour.
export function upgradeLightBlocks(T,source,kind,{low=false}={}){
 if(!INDUSTRIAL_LIGHT_KINDS.has(kind))return null;
 const round=['cage','bulb','beacon','lamp','lantern','emergency'].includes(kind),sideways=kind==='flood';
 const a=new Assembly(),holder=new T.Group(),parts=[],geometries=[],materials=[];
 const metal=new T.MeshStandardMaterial({color:0x91a3ae,metalness:.78,roughness:.34}),dark=new T.MeshStandardMaterial({color:0x182330,metalness:.45,roughness:.57});materials.push(metal,dark);
 function add(g,m,p=[0,0,0],r=[0,0,0]){a.add(g,m,matrix(p,r),false);g.dispose();}
 const box=(s,p,m=dark)=>add(Math.min(...s)<.08?new T.BoxGeometry(...s):bevelBox(...s,Math.min(...s)*.15,1),m,p);
 const cyl=(r1,r2,h,p,m=metal)=>add(new T.CylinderGeometry(r1,r2,h,low?10:18),m,p);
 if(round){
  source.geometry=new T.SphereGeometry(.34,low?10:16,low?6:10);source.geometry.scale(1,kind==='bulb'?1.2:.85,1);
  cyl(.29,.40,.14,[0,.37,0],dark);cyl(.27,.27,.12,[0,.48,0],metal);
  for(let i=0;i<4;i++){const angle=i*Math.PI/2,x=Math.cos(angle)*.40,z=Math.sin(angle)*.40;const g=limb([x,.34,z],[x,-.34,z],.025,.025,6);add(g,metal);}
  add(new T.TorusGeometry(.40,.022,5,low?12:20).rotateX(Math.PI/2),metal,[0,-.34,0]);
 }else if(kind==='sodium'){
  // Street heads have individual optical lenses inside a sealed, finned housing.
  const optics=new Assembly();
  for(const side of [-1,1])for(let k=0;k<4;k++){
   const lens=new T.SphereGeometry(.085,low?8:12,6);lens.scale(1,.22,1);
   optics.add(lens,source.material,matrix([side*.20,-.17,-.32+k*.21]),false);lens.dispose();
   cyl(.098,.098,.035,[side*.20,-.14,-.32+k*.21],metal);
  }
  const tmp=new T.Group();optics.build(tmp);for(const item of optics.items)item.geometry.dispose();source.geometry=tmp.children[0].geometry;
  box([.78,.18,1.02],[0,0,0],metal);box([.70,.025,.95],[0,-.11,0],dark);
  for(let k=0;k<7;k++)box([.60,.09,.025],[0,.12,-.38+k*.125],metal);
  cyl(.10,.10,.15,[0,.19,0],dark);
 }else{
  source.geometry=new T.CylinderGeometry(.42,.42,.065,low?12:20).translate(0,-.37,0);
  cyl(.28,.50,.45,[0,-.05,0],metal);cyl(.50,.50,.055,[0,-.30,0],dark);
  box([.38,.20,.38],[0,.28,0]);
  for(let i=0;i<5;i++)box([.64,.07,.035],[0,.39,(i-2)*.11],metal);
  for(const side of [-1,1])box([.055,.28,.12],[side*.36,.20,0],dark);
 }
 if(sideways)source.geometry.rotateZ(Math.PI/2);
 geometries.push(source.geometry);a.build(holder);for(const item of a.items)item.geometry.dispose();a.items.length=0;
 for(const mesh of holder.children){
  const geometry=mesh.geometry;if(sideways)geometry.rotateZ(Math.PI/2);geometries.push(geometry);
  const attachment=new T.InstancedMesh(geometry,mesh.material,source.count);attachment.instanceMatrix=source.instanceMatrix;attachment.computeBoundingSphere();attachment.name='Luminaire / '+kind+' / '+(mesh.material===metal?'réflecteur et grille':'carter et dissipateur');attachment.userData.noWorldShadow=true;attachment.castShadow=false;attachment.receiveShadow=true;source.add(attachment);parts.push(attachment);
 }
 source.computeBoundingSphere();source.userData.physicalLuminaire=kind;source.userData.noWorldShadow=true;source.castShadow=false;
 let disposed=false;function dispose(){if(disposed)return;disposed=true;for(const p of parts){p.removeFromParent();p.dispose();}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());source.removeEventListener('dispose',dispose);}
 source.addEventListener('dispose',dispose);return {parts,dispose};
}

export function createIndustrialLightBatch(T,parent,items,{kind='highbay',low=false}={}){
 if(!items.length)return null;
 const cube=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial({toneMapped:false}),mesh=new T.InstancedMesh(cube,material,items.length);
 const pose=new T.Object3D();mesh.name='Luminaires / '+kind;
 items.forEach((item,i)=>{pose.position.set(...item.position);pose.scale.set(...item.size);pose.rotation.set(...(item.rotation||[0,0,0]));pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,new T.Color(item.color??0xe8f5ff));});
 const kit=upgradeLightBlocks(T,mesh,kind,{low});cube.dispose();parent.add(mesh);mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
 let disposed=false;return {mesh,dispose(){if(disposed)return;disposed=true;kit?.dispose();mesh.removeFromParent();mesh.dispose();material.dispose();}};
}
