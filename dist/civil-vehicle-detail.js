// Civilian survivor vehicle in M01. Sculpted side silhouette and real mechanical
// details instead of 3 intersecting giant cuboids. Static, collisionless dressing
// within the authored gameplay car proxy; this is NOT an additional hitbox.
import {Assembly,bevelBox,matrix} from './geo.js';
export const CIVIL_CAR_REVISION='VESPER-COMPACT-2026-11';
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
 const side=new T.Shape(),L=length*.5,W=width*.5;
 side.moveTo(-L+.05,.62);side.lineTo(L-.05,.62);
 side.lineTo(L-.10,1.01);side.lineTo(L-.42,1.09);
 side.lineTo(L-.77,1.42);side.lineTo(-L+.78,1.47);
 side.lineTo(-L+.42,1.13);side.lineTo(-L+.09,1.02);side.closePath();
 const shell=new T.ExtrudeGeometry(side,{depth:width*.87,steps:1,bevelEnabled:true,bevelThickness:.018,bevelSize:.025,bevelSegments:low?1:2,curveSegments:4});
 a.add(shell,M.red,matrix([0,0,-width*.435]),!low);shell.dispose();
 box(M.dark,[length-.26,.21,width-.22],[0,.62,0],[],.045);
 // Side doors have independent, readable panel edges and handles.
 for(const s of [-1,1]){
  const z=s*width*.445;
  box(M.dark,[.020,.48,.015],[-.11,.91,z],[],.001);
  box(M.steel,[.31,.023,.023],[-.67,1.13,z+s*.012],[],.004);
  box(M.steel,[.31,.023,.023],[.64,1.13,z+s*.012],[],.004);
  box(M.dark,[length-.26,.055,.035],[0,.69,z],[],.011);
  box(M.glass,[1.24,.27,.018],[-.62,1.27,z+s*.008],[0,s*.025,0],.006);
  box(M.glass,[.72,.23,.018],[.62,1.24,z+s*.008],[0,s*.045,0],.006);
  box(M.black,[.026,.20,.023],[.10,1.28,z+s*.024],[],.002);
  box(M.black,[.16,.13,.15],[L-.65,1.21,s*(W+.027)],[],.018);
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
 // Luggage hatch line and marked seat belt inserts.
 box(M.dark,[.023,.42,width-.28],[-L+.43,1.22,0],[0,0,.18],.004);
 box(M.dark,[.14,.022,.045],[-L+.045,.83,0],[],.004);
 const meshes=a.build(g,{name:'VESPER / voiture compacte · lots fusionnés'});
 for(const it of a.items)it.geometry.dispose();a.items.length=0;
 g.userData.batches=meshes.length;
 return g;
}
