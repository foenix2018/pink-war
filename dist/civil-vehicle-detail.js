// Civilian survivor vehicle in M01. Sculpted side silhouette and real mechanical
// details instead of 3 intersecting giant cuboids. Static, collisionless dressing
// within the authored gameplay car proxy; this is NOT an additional hitbox.
import {Assembly,bevelBox,matrix} from './geo.js';
export const CIVIL_CAR_REVISION='VESPER-RLH-V750-ADAPTATION-2026-11';
export function createCivilCar(T,{length=4.4,width=2,low=false,M}={}){
 if(!(length>3&&width>1))throw Error('invalid compact car dimensions');
 const g=new T.Group();g.name='VESPER / voiture civile cabossée · carrosserie profilée';
 g.userData.vehicle={kind:'car',revision:CIVIL_CAR_REVISION};
 const a=new Assembly();
 const box=(m,s,p,r=[0,0,0],radius=.011)=>{
  const geo=bevelBox(...s,Math.min(radius,...s.map(x=>x*.17)),low?1:2);a.add(geo,m,matrix(p,r),!low);geo.dispose();
 };
 const circle=(m,p,r,h,rot=[0,0,0])=>{
  const geo=new T.CylinderGeometry(r,r,h,low?10:18);a.add(geo,m,matrix(p,rot),!low);geo.dispose();
 };
 const ring=(m,p,r,t,rot=[0,0,0])=>{
  const geo=new T.TorusGeometry(r,t,low?4:6,low?10:18);a.add(geo,m,matrix(p,rot),!low);geo.dispose();
 };
 // RLH V750: keep the four authentic civil silhouettes, but orient the nose to +X
 // like Pink Wars, and preserve the old physical collider and mission anchors.
 const L=length*.5,W=width*.5;
 const RLH_PROFILES={
  citadine:{L:3.85,body:[[-1.92,.30],[-1.89,.66],[-1.34,.78],[-.74,.84],[-.12,1.38],[.92,1.41],[1.48,1.22],[1.66,.80],[1.68,.36],[1.56,.30]],glass:[[-.10,1.31],[.88,1.34],[1.38,1.16],[-.68,.92]]},
  berline:{L:4.45,body:[[-2.22,.30],[-2.20,.66],[-1.62,.76],[-.92,.80],[-.18,1.36],[.95,1.39],[1.52,.97],[2.12,.88],[2.22,.40],[2.10,.30]],glass:[[-.16,1.30],[.90,1.33],[1.44,.95],[-.86,.88]]},
  break:{L:4.70,body:[[-2.35,.30],[-2.32,.66],[-1.72,.76],[-1.00,.80],[-.28,1.38],[1.55,1.42],[2.20,1.28],[2.34,.80],[2.36,.38],[2.24,.30]],glass:[[-.26,1.32],[1.50,1.36],[2.10,1.22],[-.94,.88]]}
 };
 const family=length<4.05?'citadine':length>4.65?'break':'berline';
 const spec=RLH_PROFILES[family],sideShape=(points)=>{
  const s=new T.Shape(),gain=length/spec.L;
  points.forEach(([px,py],i)=>{const x=-px*gain; if(i===0)s.moveTo(x,py);else s.lineTo(x,py);});s.closePath();return s;
 };
 const shell=new T.ExtrudeGeometry(sideShape(spec.body),{depth:width*.87,steps:1,bevelEnabled:true,bevelThickness:.025,bevelSize:.024,bevelSegments:low?1:2,curveSegments:3});
 a.add(shell,M.red,matrix([0,0,-width*.435]),!low);shell.dispose();
 const windows=new T.ExtrudeGeometry(sideShape(spec.glass),{depth:width*.908,steps:1,bevelEnabled:true,bevelThickness:.006,bevelSize:.007,bevelSegments:1,curveSegments:2});
 a.add(windows,M.glass,matrix([0,0,-width*.454]),false);windows.dispose();
 g.userData.vehicle.source='RLH civil-car-v750';g.userData.vehicle.bodyVariant=family;
 box(M.dark,[length-.26,.21,width-.22],[0,.62,0],[],.045);
 // Side doors have independent, readable panel edges and handles.
 for(const s of [-1,1]){
  const z=s*width*.445;
  box(M.dark,[.020,.48,.015],[-.11,.91,z],[],.001);
  box(M.steel,[.31,.023,.023],[-.67,1.13,z+s*.012],[],.004);
  box(M.steel,[.31,.023,.023],[.64,1.13,z+s*.012],[],.004);
  box(M.dark,[length-.26,.055,.035],[0,.69,z],[],.011);
  // The actual RLH glazing has replaced the old flat window rectangles.
  box(M.dark,[.024,.52,.025],[.12,1.16,z+s*.018],[],.004);
  box(M.black,[length*.56,.022,.024],[0,.88,z+s*.017],[],.002);
  box(M.steel,[.12,.022,.08],[L-.58,1.23,s*(W+.028)],[],.003);
  box(M.dark,[.18,.13,.15],[L-.49,1.22,s*(W+.055)],[],.018);
  box(M.black,[.026,.20,.023],[.10,1.28,z+s*.024],[],.002);
  box(M.black,[.16,.13,.15],[L-.65,1.21,s*(W-.070)],[],.018);
 }
 // An angled real windshield mounted between the frame and roofline.
 box(M.glass,[.025,.42,width-.40],[L-.72,1.24,0],[0,0,-.56],.010);
 box(M.glass,[.025,.38,width-.48],[-L+.82,1.26,0],[0,0,.42],.010);
 box(M.dark,[.11,.21,width-.24],[L-.07,.70,0],[],.023);
 box(M.steel,[.04,.11,width*.52],[L-.02,.90,0]);
 for(const s of [-1,1]){
  box(M.white,[.024,.12,.24],[L-.012,1.02,s*(W-.25)],[],.004);
  box(M.redGlow,[.026,.14,.25],[-L+.045,1.02,s*(W-.25)],[],.005);
  box(M.yellow,[.028,.05,.16],[L-.016,.86,s*(W-.24)],[],.002);
 }
 for(const x of [L-1.00,-L+1.02])for(const s of [-1,1]){
  const z=s*(width*.47-.105);
  circle(M.black,[x,.425,z],.40,.20,[Math.PI/2,0,0]);
  circle(M.dark,[x,.425,z+s*.116],.29,.020,[Math.PI/2,0,0]);
  circle(M.steel,[x,.425,z+s*.126],.20,.023,[Math.PI/2,0,0]);
  circle(M.black,[x,.425,z+s*.145],.07,.026,[Math.PI/2,0,0]);
  ring(M.steel,[x,.425,z+s*.14],.30,.022);
 }
 // RLH V750: proper inset grille, stacked slats, bumper rubbers and a visible registration.
 box(M.dark,[.045,.17,width*.58],[L+.006,.77,0],[],.009);
 for(let k=0;k<4;k++)box(M.steel,[.013,.014,width*.48],[L+.032,.72+k*.034,0],[],.002);
 box(M.white,[.012,.105,.44],[L+.038,.51,0],[],.003);
 box(M.dark,[.09,.15,width*.67],[-L+.027,.57,0],[],.010);
 for(const s of [-1,1])box(M.yellow,[.019,.048,.115],[L+.016,.67,s*(W-.16)],[],.003);
 if(family==='break')for(const s of [-1,1])box(M.steel,[length*.48,.028,.04],[-.26,1.48,s*(W-.15)],[],.007);
 // Luggage hatch line and marked seat belt inserts.
 box(M.dark,[.023,.42,width-.28],[-L+.43,1.22,0],[0,0,.18],.004);
 box(M.dark,[.14,.022,.045],[-L+.045,.83,0],[],.004);
 const meshes=a.build(g,{name:'VESPER / voiture compacte · lots fusionnés'});
 for(const it of a.items)it.geometry.dispose();a.items.length=0;
 g.userData.batches=meshes.length;
 return g;
}
