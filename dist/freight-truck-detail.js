// Cargo transport hard surface. Shared in M02 HELIX convoy and M03 freight.
// Local +X is the truck front; coordinates are in metres.
import {Assembly,bevelBox,matrix} from './geo.js';
export const FREIGHT_TRUCK_REV='freight-cab-v2-2026-11';
export function createFreightTruck(T,{length=8,width=2.6,low=false,M={}}={}){
 const L=Math.max(6,length),W=Math.max(2,width),g=new T.Group(),a=new Assembly();
 g.name='PW / camion convoi · cabine, transmission et caisse détaillées';
 g.userData.visualRevision=FREIGHT_TRUCK_REV;
 const mat=(...p)=>p.map(k=>M[k]).find(v=>v?.isMaterial)||new T.MeshStandardMaterial({color:0x65717a,metalness:.4,roughness:.7});
 const coat=mat('helixWhite','paint','white','panel','galva'),steel=mat('steel','galva','stainless','plate','metal'),
 dark=mat('black','dark','helixBlack'),glass=mat('glass','ice','screenOff'),
 trim=mat('helixRed','red','rust','yellow'),rubber=mat('rubber','black','dark'),lamp=mat('neonWhite','white','yellow');
 const box=(m,s,p,rot=[0,0,0],v=.008)=>{
  const geo=v?bevelBox(...s,Math.min(v,...s.map(z=>z*.20)),low?1:2):new T.BoxGeometry(...s);
  a.add(geo,m,matrix(p,rot),!low);geo.dispose();
 };
 const cy=(m,p,r,h,rot=[0,0,0])=>{
  const geo=new T.CylinderGeometry(r,r,h,low?11:20);a.add(geo,m,matrix(p,rot),!low);geo.dispose();
 };
 const tor=(m,p,r,t,rot=[0,0,0])=>{
  const geo=new T.TorusGeometry(r,t,4,low?12:20);a.add(geo,m,matrix(p,rot),!low);geo.dispose();
 };
 const cabX=L/2-1.14,cargoLen=L-2.55,cargoX=-1.22,halfW=W/2;
 box(dark,[L-.24,.32,W-.25],[0,.65,0],[],.03);
 for(const side of [-1,1])box(steel,[L-.5,.16,.15],[0,.46,side*(halfW-.28)]);
 // Freight enclosure has physical panelling, roof trim, rear opening, latches.
 box(coat,[cargoLen,2.16,W-.15],[cargoX,1.88,0],[],.038);
 box(steel,[cargoLen+.04,.12,W-.08],[cargoX,3.03,0],[],.014);
 box(dark,[cargoLen-.10,.060,W-.19],[cargoX,.94,0],[],.008);
 for(const side of [-1,1]){
  const z=side*(halfW-.061);
  for(let k=0;k<(low?5:10);k++){
   const x=cargoX-cargoLen*.44+(k+.5)*cargoLen*.88/(low?5:10);
   box(steel,[.019,1.92,.020],[x,1.97,z+side*.026],[],.002);
  }
  box(trim,[cargoLen-.16,.086,.023],[cargoX,1.27,z+side*.043],[],.004);
  box(dark,[cargoLen-.16,.045,.024],[cargoX,2.89,z+side*.043],[],.002);
  for(const xx of [cargoX-cargoLen*.40,cargoX+cargoLen*.40])
   box(steel,[.044,.22,.037],[xx,1.56,z+side*.047],[],.004);
 }
 // Front: angled windshield and roof visor, not a transparent wall cube.
 box(coat,[2.19,1.62,W-.20],[cabX,1.55,0],[],.061);
 box(steel,[1.56,.15,W-.32],[cabX-.27,2.43,0],[],.035);
 box(glass,[.046,.70,W-.38],[L/2-.32,1.90,0],[0,0,-.25],.009);
 box(dark,[.034,.29,W*.69],[L/2-.039,1.23,0],[],.009);
 for(let k=0;k<7;k++)
   box(steel,[.012,.015,W*.50],[L/2-.016,1.13+k*.042,0],[],.002);
 for(const side of [-1,1]){
  const z=side*(halfW-.069);
  box(glass,[.75,.45,.024],[cabX+.20,1.96,z+side*.018],[],.016);
  box(dark,[.025,.75,.035],[cabX-.48,1.54,z+side*.021],[],.003);
  box(steel,[.20,.04,.045],[cabX+.25,1.45,z+side*.034]);
  box(dark,[.30,.20,.09],[cabX+.54,1.88,side*(halfW+.06)],[],.025);
  box(lamp,[.024,.16,.22],[L/2+.002,1.25,side*(halfW-.25)]);
  box(trim,[.028,.075,.18],[L/2+.003,1.09,side*(halfW-.25)]);
 }
 box(steel,[.12,.14,W-.12],[L/2-.02,.68,0]);
 box(steel,[.14,.18,W-.11],[-L/2+.05,.69,0]);
 for(const x of [L/2-1.12,-L/2+1.00])
  for(const side of [-1,1]){
   const z=side*(halfW-.14),outside=z+side*.13;
   cy(rubber,[x,.48,z],.45,.25,[Math.PI/2,0,0]);
   cy(steel,[x,.48,outside],.28,.027,[Math.PI/2,0,0]);
   cy(dark,[x,.48,outside+side*.025],.075,.035,[Math.PI/2,0,0]);
   tor(steel,[x,.48,outside+side*.042],.35,.022);
   box(dark,[1.04,.07,.12],[x,1.02,side*(halfW-.09)]);
  }
 for(let side of [-1,1]){
  const z=side*(halfW-.18);
  box(dark,[.09,.11,.25],[cabX-.54,.84,z]);
 }
 const meshes=a.build(g,{name:'PW freight / batched'});
 g.userData.drawCalls=meshes.length;
 for(const entry of a.items)entry.geometry.dispose();
 a.items.length=0;
 return g;
}
