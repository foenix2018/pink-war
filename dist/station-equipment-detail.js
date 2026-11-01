// AEGIS 07 firefighting equipment — recognizable ARI bottles, hose
// rolls, rack latches and gauges. Geometry batch merged. Authoritative
// gameplay collision on rack unchanged.
import {Assembly,bevelBox,matrix,limb} from './geo.js';
export const STATION_GEAR_REVISION='AEGIS-07-EQUIPMENT-V2';
export function createStationEquipment(T,root,{low=false,M}={}){
 const a=new Assembly(),stats={ari:0,hoses:0,groups:0,triangles:0};
 const B=(m,d,p,r=[0,0,0],v=.009)=>{
  const g=bevelBox(...d,Math.min(v,...d.map(n=>n*.2)),low?1:2);a.add(g,m,matrix(p,r),!low);g.dispose();
 };
 const CY=(m,center,r,height,rot=[0,0,0],seg=low?8:14)=>{
  const g=new T.CylinderGeometry(r,r,height,seg);a.add(g,m,matrix(center,rot),!low);g.dispose();
 };
 const TOR=(m,center,r,t,rot=[0,0,0],seg=low?10:18)=>{
  const g=new T.TorusGeometry(r,t,low?4:6,seg);a.add(g,m,matrix(center,rot),!low);g.dispose();
 };
 const rod=(m,x,y,r,z1,z2)=>{const g=limb([x,y,z1],[x,y,z2],r,r,low?6:10);a.add(g,m,null,!low);g.dispose();};
 function chassis(o){
  const {x,z,hx,hz,height:h}=o;
  for(const sx of [-1,1])for(const sz of [-1,1]){
    B(M.steel,[.062,h-.08,.060],[x+sx*(hx-.048),h*.5,z+sz*(hz-.05)]);
  }
  for(const y of [.11,h*.52,h-.06]){
   B(M.steel,[hx*2-.12,.04,hz*2-.10],[x,y,z],[],.006);
  }
  B(M.dark,[.035,h-.10,hz*2-.12],[x-hx+.045,h*.5,z],[],.004);
  for(const zz of [-hz+.07,hz-.07]){
   B(M.steel,[hx*2-.06,.04,.044],[x,h*.5,z+zz],[],.005);
  }
 }
 function ariRack(o){
  chassis(o);const {x,z,hx,hz,height:h}=o,face=x+hx-.07;
  const width=hz*2-.30,n=low?5:6;
  for(const row of [0,1])for(let k=0;k<n;k++){
   const zz=z-hz+.20+(k+.5)*width/n,lower=row===0?.25:1.06;
   // Tall ARI cylinder and protective harness, never abstract yellow rod.
   CY(M.yellow,[face-.17,lower+.235,zz],.094,.44);
   CY(M.dark,[face-.17,lower+.49,zz],.042,.065);
   CY(M.steel,[face-.17,lower+.534,zz],.022,.04);
   TOR(M.dark,[face-.17,lower+.44,zz],.098,.012,[Math.PI/2,0,0]);
   for(const side of [-1,1])B(M.dark,[.04,.27,.018],[face-.17,lower+.27,zz+side*.069],[],.003);
   B(M.steel,[.024,.20,.12],[face+.025,lower+.25,zz],[],.004);
   CY(M.dark,[face+.047,lower+.47,zz],.035,.015,[0,0,Math.PI/2]);
   if(!low){
    // Face-mounted pressure gauge with rim and valve.
    CY(M.steel,[face+.061,lower+.46,zz],.03,.011,[0,0,Math.PI/2],10);
    B(M.dark,[.010,.023,.018],[face+.071,lower+.46,zz],[],0);
   }
   stats.ari++;
  }
 }
 function hoseRack(o){
  chassis(o);const {x,z,hx,hz,height:h}=o,face=x+hx-.055;
  const width=hz*2-.38,n=4;
  for(const row of [0,1])for(let k=0;k<n;k++){
   const zz=z-hz+.22+(k+.5)*width/n,cy=.39+row*.78;
   // Real rolled fire hose is a flat annular coil facing the corridor.
   const rot=[0,Math.PI/2,0];
   for(const rr of [0.24,.19,.14,.085]){
    TOR(M.white,[face+.01,cy,zz],rr,low?.028:.018,rot,low?12:24);
   }
   CY(M.dark,[face+.03,cy,zz],.045,.015,[0,0,Math.PI/2]);
   CY(M.steel,[face+.045,cy,zz],.024,.020,[0,0,Math.PI/2]);
   // Coupling outlet, metal threaded ridges and retaining strap.
   CY(M.steel,[face+.055,cy-.155,zz+.14],.046,.070,[0,0,Math.PI/2]);
   if(!low)for(let l=0;l<3;l++)TOR(M.steel,[face+.084,cy-.155,zz+.14],.045+l*.003,.004,rot,12);
   B(M.yellow,[.042,.33,.025],[face+.07,cy,zz],[],.004);
   stats.hoses++;
  }
  // The lower apron and top anchoring rails are still usable supports.
  B(M.steel,[.08,.06,hz*2-.20],[face+.026,h-.18,z]);
 }
 function dress(o){
  if(o.kind==='ari-rack')ariRack(o);
  else if(o.kind==='hose-rack')hoseRack(o);
  else return false;
  return true;
 }
 function finish(){
  const meshes=a.build(root,{name:'AEGIS 07 / ARI and DN45 rolled hoses · batched'});
  stats.groups=meshes.length;stats.triangles=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
  for(const item of a.items)item.geometry.dispose();a.items.length=0;
  return {...stats};
 }
 return {dress,finish,stats};
}
