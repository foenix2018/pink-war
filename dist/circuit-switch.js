import {Assembly,bevelBox,matrix} from './geo.js';
// Reusable guarded isolator, facing +Z. Fits the existing collision cabinet.
export function createCircuitSwitch(T,parent,{x=0,y=0,z=0,scale=1,materials:m,batch=null}={}){
 const root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(scale);root.name='VESPER / sectionneur mécanique';parent.add(root);
 const a=new Assembly(),box=(w,h,d,mat,p)=>a.add(bevelBox(w,h,d,Math.min(.035,d*.3),1),mat,matrix(p));
 box(.82,1.25,.09,m.paint,[0,0,0]);box(.63,.88,.035,m.rubber,[0,-.06,.063]);
 for(const s of [-1,1]){a.limb(m.metal,[s*.27,-.25,.15],[s*.27,.22,.15],.027,.027);for(const yy of [-.52,.52])a.ball(m.metal,[s*.33,yy,.052],[.018,.018,.007]);}
 box(.47,.12,.025,m.dark,[0,.43,.066]);
 for(let i=0;i<4;i++)box(.48,.018,.025,m.dark,[0,-.40-i*.043,.065]);
 if(batch){root.updateMatrix();for(const part of a.items){batch.add(part.geometry,part.material,root.matrix);part.geometry.dispose();}}else{a.mount(root);a.setLevel(1);}
 const pivot=new T.Group();pivot.position.set(0,.06,.12);root.add(pivot);const lever=new Assembly();
 for(const s of [-1,1])lever.limb(m.metal,[s*.18,0,0],[s*.18,-.22,.12],.023,.023);
 lever.limb(m.rubber,[-.21,-.22,.12],[.21,-.22,.12],.048,.048);lever.mount(pivot);lever.setLevel(1);
 const lampMaterial=new T.MeshBasicMaterial({color:0xc88d49,toneMapped:false}),lamp=new T.Mesh(new T.CircleGeometry(.027,12),lampMaterial);lamp.position.set(.16,.43,.084);root.add(lamp);
 let active=false;
 return {root,pivot,setState(value){active=!!value;pivot.rotation.x+=( (active?-1.3:-.38)-pivot.rotation.x)*.16;lampMaterial.color.setHex(active?0x619c86:0xc88d49);},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());lampMaterial.dispose();}};
}
