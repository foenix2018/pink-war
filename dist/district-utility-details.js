// W02 — recognizable utilities replacing basic cylinders and generator boxes.
// All static parts merge by material into a few WebGPU/WebGL batches across
// the district. Collision envelopes remain controlled by authored layout.
import {Assembly,bevelBox,matrix} from './geo.js';

export function createDistrictUtilities(T,{low=false,materials:C}={}){
 const a=new Assembly(),up=new T.Vector3(0,1,0);
 const stats={hydrants:0,generators:0,batches:0,triangles:0};
 const box=(m,size,p,r=[0,0,0],radius=.011)=>a.add(bevelBox(...size,Math.min(radius,...size.map(s=>s*.2)),low?1:2),m,matrix(p,r));
 const cyl=(m,x,y,z,r,h,rot=[0,0,0],rad=low?8:14)=>a.add(new T.CylinderGeometry(r,r,h,rad),m,matrix([x,y,z],rot));
 const connect=(m,one,two,r=.018)=>{
   const from=new T.Vector3(...one),to=new T.Vector3(...two),dir=to.clone().sub(from),q=new T.Quaternion().setFromUnitVectors(up,dir.clone().normalize());
   a.add(new T.CylinderGeometry(r,r,dir.length(),low?6:10),m,new T.Matrix4().compose(from.add(to).multiplyScalar(.5),q,new T.Vector3(1,1,1)));
 };
 const ring=(m,x,y,z,r,t=.016,rot=[0,0,0])=>a.add(new T.TorusGeometry(r,t,low?4:6,low?12:20),m,matrix([x,y,z],rot));
 const hydrant=(x,z)=>{
   // Fire hydrant / borne incendie: pedestal, bonnet, two capped outlets,
   // service nut, valve body, circular base and hose-connection collars.
   cyl(C.rust,x,.13,z,.24,.13);
   cyl(C.iron,x,.19,z,.27,.035);
   cyl(C.rust,x,.56,z,.17,.71);
   cyl(C.iron,x,.925,z,.22,.11);
   cyl(C.rust,x,.998,z,.13,.05);
   // Hexagonal stem nut and metallic cap.
   cyl(C.iron,x,1.035,z,.067,.08,[0,0,0],6);
   ring(C.black,x,.825,z,.19,.017,[Math.PI/2,0,0]);
   for(const side of [-1,1]){
     const neck=x+side*.24;
     connect(C.iron,[x+side*.12,.625,z],[x+side*.345,.625,z],.096);
     cyl(C.black,neck+side*.1,.625,z,.118,.055,[0,0,Math.PI/2],low?8:12);
     cyl(C.rust,x+side*.370,.625,z,.125,.053,[0,0,Math.PI/2],low?8:12);
     ring(C.iron,x+side*.397,.625,z,.103,.019,[0,Math.PI/2,0]);
     if(!low)for(const d of [-1,1])connect(C.black,[x+side*.390,.60,z+d*.065],[x+side*.395,.655,z+d*.065],.008);
   }
   stats.hydrants++;
 };
 const generator=(x,z,side=1)=>{
   // Weathered standby generator: guarded base, real radiator grille,
   // cylindrical exhaust, lifting eyes, control panel and cable conduit.
   box(C.black,[1.54,.14,.82],[x,.13,z],[],.012);
   box(C.iron,[1.49,1.04,.72],[x,.73,z],[],.035);
   box(C.black,[1.41,.91,.015],[x,.77,z+side*.367],[],.010);
   const front=z+side*.393;
   for(let row=0;row<(low?5:10);row++){
      box(C.iron,[1.23,.020,.023],[x,.37+row*.079,front],[],.002);
   }
   for(const sx of [-.59,.59]){
      box(C.rust,[.064,.92,.029],[x+sx,.75,front],[],.009);
      box(C.black,[.041,.10,.039],[x+sx,1.25,front]);
   }
   // Separate control pod on the short end; switches and gauge are identifiable.
   box(C.black,[.034,.53,.45],[x+.757,.89,z],[],.011);
   box(C.iron,[.038,.19,.30],[x+.786,1.04,z],[],.008);
   cyl(C.black,x+.81,.977,z-.067,.047,.014,[0,0,Math.PI/2],10);
   for(let k=0;k<3;k++)cyl(k===0?C.warning:C.iron,x+.817,.79,z-.11+k*.095,.018,.012,[0,0,Math.PI/2],8);
   cyl(C.black,x-.47,1.33,z,.135,.12);
   cyl(C.iron,x-.47,1.50,z,.088,.28);
   cyl(C.black,x-.47,1.66,z,.12,.06);
   for(const sx of [-.53,.53])ring(C.iron,x+sx,1.34,z,.08,.019,[0,Math.PI/2,0]);
   for(const sx of [-.53,.53])box(C.rust,[.14,.05,.03],[x+sx,.33,z+side*.43]);
   // Power cable exits into the existing service boundary; no new collider.
   connect(C.black,[x-.39,.27,z-side*.35],[x-.39,.15,z-side*.42],.048);
   stats.generators++;
 };
 const build=root=>{
   const meshes=a.build(root,{name:'W02 / utilities · detailed fire hydrants and generators',userData:{decorativeOnly:true,physicalCollisionsAuthoritative:true}});
   stats.batches=meshes.length;stats.triangles=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
   for(const it of a.items)it.geometry.dispose();a.items.length=0;
   return stats;
 };
 return {hydrant,generator,build,stats};
}
