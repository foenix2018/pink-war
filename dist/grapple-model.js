import {bevelBox} from './geo.js';
// A wrist-mounted winch: split cuff, cable drum, geared motor, guide rollers
// and a three-prong retractable anchor. Fixed geometry, shared by both views.
export function createGrappleLauncher(T,{accent=0xff80b2}={}){
 const root=new T.Group();root.name='AÉGIS / grappin de l’avant-bras gauche';
 const mats={shell:new T.MeshStandardMaterial({color:0x27333d,metalness:.7,roughness:.47}),steel:new T.MeshStandardMaterial({color:0x8795a1,metalness:.87,roughness:.31}),rubber:new T.MeshStandardMaterial({color:0x0d151d,roughness:.92}),gold:new T.MeshStandardMaterial({color:0xbaa26b,metalness:.8,roughness:.4}),signal:new T.MeshBasicMaterial({color:accent,toneMapped:false})};
 const geometries=[],groups=new Map();let parts=0;
 function part(geometry,mat,p=[0,0,0],r=[0,0,0]){const m=new T.Mesh(geometry,mat);m.position.set(...p);m.rotation.set(...r);m.updateMatrix();geometry.applyMatrix4(m.matrix);const flat=geometry.index?geometry.toNonIndexed():geometry;if(flat!==geometry)geometry.dispose();if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(flat);parts++;}
 const box=(size,mat,p,r)=>part(bevelBox(...size,Math.min(.006,...size.map(x=>x/4)),1),mat,p,r);
 const cyl=(r,h,mat,p,rot)=>part(new T.CylinderGeometry(r,r,h,16),mat,p,rot);
 for(const z of [-.11,.055]){part(new T.TorusGeometry(.064,.008,6,24,Math.PI*1.65),mats.steel,[0,-.025,z],[0,0,.55]);box([.12,.018,.032],mats.rubber,[0,-.074,z]);}
 box([.112,.048,.23],mats.shell,[0,.024,-.025]);box([.096,.012,.19],mats.steel,[0,.053,-.025]);
 box([.025,.02,.17],mats.shell,[-.043,.065,-.015]);box([.025,.02,.17],mats.shell,[.043,.065,-.015]);
 cyl(.043,.095,mats.rubber,[0,.029,-.071],[0,0,Math.PI/2]);
 for(const x of [-.051,.051]){cyl(.048,.008,mats.steel,[x,.029,-.071],[0,0,Math.PI/2]);cyl(.025,.012,mats.shell,[x*1.1,.029,-.071],[0,0,Math.PI/2]);}
 for(let i=0;i<8;i++)part(new T.TorusGeometry(.044,.002,4,20),mats.gold,[-.032+i*.009,.029,-.071],[0,Math.PI/2,0]);
 cyl(.023,.072,mats.shell,[.075,.021,-.058],[Math.PI/2,0,0]);cyl(.024,.01,mats.steel,[.075,.021,-.096],[Math.PI/2,0,0]);
 box([.054,.035,.115],mats.shell,[0,.02,.09]);
 for(const x of [-.031,.031]){cyl(.015,.02,mats.steel,[x,.025,.116],[0,0,Math.PI/2]);box([.012,.007,.13],mats.signal,[x,.062,.012]);}
 cyl(.016,.034,mats.rubber,[0,.021,.153],[Math.PI/2,0,0]);part(new T.TorusGeometry(.021,.003,5,24),mats.steel,[0,.021,.172]);
 for(const x of [-.043,.043])for(const z of [-.12,.06])cyl(.005,.004,mats.steel,[x,.064,z]);
 for(let i=0;i<5;i++)box([.037,.004,.004],mats.rubber,[0,.062,-.015+i*.012]);
 box([.027,.003,.015],mats.signal,[0,.063,.071]);
 for(const [mat,list] of groups){const positions=[],normals=[];for(const g of list){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.computeBoundingSphere();geometries.push(g);const mesh=new T.Mesh(g,mat);mesh.name='Grappin / '+Object.keys(mats).find(k=>mats[k]===mat);root.add(mesh);}
 const hook=createGrappleHook(T,mats);hook.root.position.set(0,.021,.18);root.add(hook.root);
 return {root,muzzle:[0,.021,.181],setActive(value){hook.root.visible=!value;},setAccent(value){mats.signal.color.setHex(value);},stats:()=>({parts,draws:root.children.length,triangles:geometries.reduce((n,g)=>n+g.attributes.position.count/3,0)}),dispose(){root.removeFromParent();hook.dispose();for(const g of geometries)g.dispose();for(const m of Object.values(mats))m.dispose();}};
}
export function createGrappleHook(T,materials=null){
 const own=!materials,m=materials||{steel:new T.MeshStandardMaterial({color:0x9ba8b4,metalness:.85,roughness:.3}),signal:new T.MeshBasicMaterial({color:0xff80b2,toneMapped:false})};
 const root=new T.Group();root.name='Ancre / trois griffes rétractables';const geometry=[];
 const add=(g,mat,p,r)=>{geometry.push(g);const mesh=new T.Mesh(g,mat);mesh.position.set(...p);if(r)mesh.rotation.set(...r);root.add(mesh);};
 add(new T.CylinderGeometry(.012,.019,.08,12),m.steel,[0,0,.015],[Math.PI/2,0,0]);
 add(new T.ConeGeometry(.018,.035,12),m.steel,[0,0,.07],[Math.PI/2,0,0]);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const arm=new T.Group();arm.rotation.z=a;root.add(arm);const g=bevelBox(.012,.055,.024,.003,1);geometry.push(g);const claw=new T.Mesh(g,m.steel);claw.position.set(0,.027,.012);claw.rotation.x=-.55;arm.add(claw);const tip=new T.Mesh(new T.ConeGeometry(.009,.032,6),m.steel);geometry.push(tip.geometry);tip.position.set(0,.052,.025);tip.rotation.x=Math.PI/2;arm.add(tip);}
 add(new T.TorusGeometry(.019,.0025,4,20),m.signal,[0,0,-.013]);
 // Bake the three static claws into two material batches, including their hinges.
 root.updateMatrixWorld(true);const batches=new Map();root.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(g);});root.clear();for(const g of geometry)g.dispose();geometry.length=0;
 for(const [material,parts]of batches){const positions=[],normals=[];for(const g of parts){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.computeBoundingSphere();geometry.push(g);root.add(new T.Mesh(g,material));}
 return {root,setAccent(value){m.signal.color.setHex(value);},dispose(){root.removeFromParent();for(const g of geometry)g.dispose();if(own)for(const mat of Object.values(m))mat.dispose();}};
}
