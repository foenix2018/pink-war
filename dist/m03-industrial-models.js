import {Assembly,bevelBox,matrix,limb} from './geo.js';
import {MEDICAL_PARTITIONS} from './m03-cleanup.js';

function kit(T,M,low,name){
 const root=new T.Group();root.name=name;const assembly=new Assembly();
 const add=(g,m,p=[0,0,0],r=[0,0,0])=>{assembly.add(g,m,matrix(p,r));g.dispose();};
 const box=(m,size,p,r=[0,0,0],bevel=.015)=>add(bevelBox(...size,Math.min(bevel,...size.map(s=>s*.22)),1),m,p,r);
 const cylinder=(m,r,h,p,rotation=[0,0,0])=>add(new T.CylinderGeometry(r,r,h,low?10:18),m,p,rotation);
 const rod=(m,a,b,r=.025)=>add(limb(a,b,r,r,low?6:10),m);
 const torus=(m,r,t,p,rot=[0,0,0],arc=Math.PI*2)=>add(new T.TorusGeometry(r,t,low?4:6,low?12:22,arc),m,p,rot);
 const finish=()=>{assembly.build(root);for(const item of assembly.items)item.geometry.dispose();assembly.items.length=0;return root;};
 return {root,add,box,cylinder,rod,torus,finish};
}

function containerShell(k,T,M,{length:L,width:W,height:H,base=0,body=M.container?.[0]||M.paint,low=false}){
 const {box,rod}=k,h=H-base;
 box(body,[L,h,W],[0,base+h/2,0],[],.045);
 for(const side of [-1,1]){
  for(let x=-L/2+.24;x<L/2-.15;x+=.45)box(body,[.04,h-.18,.04],[x,base+h/2,side*(W/2+.012)],[],.008);
  for(const y of [base+.07,H-.055])box(M.galva,[L,.075,.07],[0,y,side*(W/2+.016)]);
 }
 for(const x of [-L/2+.055,L/2-.055])for(const z of [-W/2+.055,W/2-.055])box(M.galva,[.11,h,.11],[x,base+h/2,z]);
 // Double rear doors, hinges and full-height locking rods.
 for(const side of [-1,1]){
  box(body,[.065,h-.22,W/2-.12],[L/2+.018,base+h/2,side*W/4]);
  rod(M.galva,[L/2+.095,base+.20,side*W*.27],[L/2+.095,H-.20,side*W*.27],.023);
  box(M.dark,[.10,.055,.25],[L/2+.115,base+h*.46,side*W*.27]);
  for(const y of [base+.30,H-.34])box(M.galva,[.085,.12,.28],[L/2+.073,y,side*(W/2-.17)]);
 }
}

export function createCargoContainer(T,{length=6,width=2.6,height=2.7,M,low=false,body=M.container?.[0]}={}){
 const k=kit(T,M,low,'Fret / conteneur ISO à portes et nervures');
 containerShell(k,T,M,{length,width,height,base:.07,body,low});
 for(const x of [-length/2+.09,length/2-.09])for(const z of [-width/2+.09,width/2-.09])k.box(M.dark,[.18,.13,.18],[x,.065,z]);
 return k.finish();
}

export function createFreightTrailer(T,{length:L=13,width:W=2.8,height:H=3.6,M,low=false}={}){
 const k=kit(T,M,low,'Remorque / châssis, trois essieux, béquilles et caisse nervurée');
 containerShell(k,T,M,{length:L,width:W,height:H,base:.90,low});
 for(const side of [-1,1])k.box(M.dark,[L-.3,.23,.13],[0,.76,side*W*.32]);
 for(let x=-L/2+.5;x<L/2-.2;x+=1.3)k.box(M.galva,[.09,.12,W-.25],[x,.69,0]);
 for(const x of [L*.20,L*.30,L*.40]){
  k.cylinder(M.galva,.055,W-.22,[x,.43,0],[Math.PI/2,0,0]);
  for(const side of [-1,1]){
   const z=side*(W/2-.10);k.cylinder(M.rubber,.43,.22,[x,.43,z],[Math.PI/2,0,0]);
   k.cylinder(M.galva,.245,.235,[x,.43,z],[Math.PI/2,0,0]);
   k.cylinder(M.dark,.10,.25,[x,.43,z],[Math.PI/2,0,0]);
  }
 }
 for(const side of [-1,1]){
  k.box(M.galva,[.10,.66,.10],[-L*.26,.39,side*W*.30]);
  k.box(M.dark,[.33,.08,.27],[-L*.26,.04,side*W*.30]);
  k.rod(M.galva,[-L*.26,.64,side*W*.30],[-L*.17,.69,side*W*.30],.025);
  k.box(M.red,[L-.8,.055,.024],[0,1.13,side*(W/2+.05)]);
  for(let x=-L/2+.5;x<L/2;x+=2)k.box(M.yellow,[.12,.065,.035],[x,.98,side*(W/2+.05)]);
  k.box(M.red,[.035,.12,.23],[L/2+.15,.67,side*W*.34]);
 }
 k.box(M.galva,[.16,.10,W-.1],[L/2+.08,.39,0]);
 k.torus(M.galva,.10,.028,[-L/2-.04,1.20,0],[0,Math.PI/2,0]);
 return k.finish();
}

export function createMedicalRailcar(T,{length:L=8.4,width:W=3,height:H=4,locomotive=false,freight=false,M,low=false}={}){
 const k=kit(T,M,low,locomotive?'Gare / locomotive diesel-électrique':freight?'Gare / fourgon ferroviaire de fret':'Gare / voiture sanitaire à bogies');
 const body=locomotive?M.dark:M.white;
 k.box(M.galva,[L-.12,.20,W-.1],[0,.95,0]);
 if(locomotive){
  const s=new T.Shape();s.moveTo(-L/2,1.06);s.lineTo(-L/2,2.1);s.lineTo(-L*.34,2.4);s.lineTo(-L*.28,H-.35);s.lineTo(-L*.07,H-.15);s.lineTo(0,2.85);s.lineTo(L/2-.15,2.65);s.lineTo(L/2,1.06);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:W-.12,bevelEnabled:true,bevelSize:.04,bevelThickness:.035,bevelSegments:1,steps:1});g.translate(0,0,-W/2+.06);k.add(g,body);
  for(const side of [-1,1]){
   k.box(M.glass,[L*.17,.58,.035],[-L*.18,H-.82,side*(W/2-.035)]);
   for(let x=.45;x<L/2-.3;x+=.34)k.box(M.galva,[.065,.72,.04],[x,2.11,side*(W/2+.015)]);
   k.rod(M.galva,[-L/2+.25,1.23,side*(W/2+.05)],[L/2-.3,1.23,side*(W/2+.05)],.025);
  }
  for(const z of [-.75,.75])k.cylinder(M.neonWhite,.10,.05,[-L/2-.04,1.75,z],[0,0,Math.PI/2]);
  k.cylinder(M.dark,.10,.35,[L*.2,3.0,0]);
 }else{
  // Curved roof and chamfered lower shoulders give the car a railway section.
  const s=new T.Shape();s.moveTo(-W/2+.10,1.06);s.lineTo(-W/2,1.22);s.lineTo(-W/2,H-.55);s.quadraticCurveTo(-W/2,H-.06,0,H);s.quadraticCurveTo(W/2,H-.06,W/2,H-.55);s.lineTo(W/2,1.22);s.lineTo(W/2-.10,1.06);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:L-.15,bevelEnabled:false,curveSegments:low?5:10,steps:1});g.translate(0,0,-(L-.15)/2);g.rotateY(Math.PI/2);k.add(g,body);
  for(const side of [-1,1]){
   for(let x=-L/2+1.25;!freight&&x<L/2-.9;x+=1.42){
    k.box(M.galva,[1.10,.83,.045],[x,2.65,side*(W/2+.01)]);
    k.box(M.dark,[.98,.71,.052],[x,2.65,side*(W/2+.036)]);
    k.box(M.glass,[.91,.64,.022],[x,2.65,side*(W/2+.065)]);
   }
   k.box(M.red,[L-.28,.13,.035],[0,1.66,side*(W/2+.02)]);
   if(freight){
    k.box(M.galva,[1.8,2.25,.045],[0,2.25,side*(W/2+.03)]);
    k.box(M.paint,[1.65,2.08,.045],[0,2.25,side*(W/2+.06)]);
    k.box(M.galva,[3.1,.06,.075],[0,3.43,side*(W/2+.04)]);
    k.rod(M.dark,[.58,1.9,side*(W/2+.055)],[.58,2.3,side*(W/2+.055)],.023);
   }
   k.box(M.galva,[.6,.09,.34],[-L/2+.42,.72,side*(W/2-.10)]);
  }
 }
 // Two two-axle bogies, steel flanges, suspension frames and underfloor equipment.
 for(const center of [-L*.29,L*.29]){
  k.box(M.dark,[1.55,.24,W-.5],[center,.59,0]);
  for(const x of [center-.47,center+.47]){
   k.cylinder(M.galva,.065,1.54,[x,.42,0],[Math.PI/2,0,0]);
   for(const side of [-1,1]){
    const z=side*.66;k.cylinder(M.dark,.42,.17,[x,.42,z],[Math.PI/2,0,0]);
    k.torus(M.galva,.38,.035,[x,.42,z-side*.08]);
    k.cylinder(M.galva,.12,.22,[x,.42,z],[Math.PI/2,0,0]);
   }
  }
 }
 k.box(M.dark,[L*.25,.35,W*.58],[0,.58,0]);
 for(const side of [-1,1]){
  k.box(M.dark,[.36,.18,.20],[side*(L/2+.11),.83,0]);
  for(const z of [-.8,.8])k.cylinder(M.galva,.13,.23,[side*(L/2+.08),.97,z],[0,0,Math.PI/2]);
 }
 return k.finish();
}

export function createMedicalPartitions(T,parent,M,{low=false}={}){
 const k=kit(T,M,low,'Annexe / cloisons vitrées de triage');
 const glass=M.glass.clone();glass.opacity=.22;glass.depthWrite=false;glass.metalness=.08;glass.roughness=.23;
 for(const p of MEDICAL_PARTITIONS){
  k.box(M.paint,[p.width,.94,.20],[p.x,.47,p.z]);
  k.box(M.galva,[p.width,.14,.24],[p.x,p.height-.07,p.z]);
  const n=Math.ceil(p.width/1.9),width=p.width/n;
  for(let i=0;i<=n;i++)k.box(M.galva,[.055,p.height,.24],[p.x-p.width/2+i*width,p.height/2,p.z]);
  for(let i=0;i<n;i++)k.box(glass,[width-.065,p.height-1.12,.035],[p.x-p.width/2+(i+.5)*width,(p.height+.94)/2-.02,p.z]);
 }
 const root=k.finish();root.userData.dispose=()=>glass.dispose();parent.add(root);return root;
}

export function createHoistTrolley(T,M,{low=false}={}){
 const k=kit(T,M,low,'Chariot / roulements, moteur et tambour de levage');
 for(const z of [-.43,.43]){
  k.box(M.yellow,[1.8,.14,.11],[0,.20,z]);
  for(const x of [-.62,.62])k.cylinder(M.galva,.18,.12,[x,.45,z],[Math.PI/2,0,0]);
 }
 k.box(M.dark,[1.35,.34,.8],[0,-.08,0]);
 k.cylinder(M.galva,.25,.74,[0,-.40,0],[Math.PI/2,0,0]);
 for(const z of [-.4,.4])k.cylinder(M.dark,.30,.05,[0,-.40,z],[Math.PI/2,0,0]);
 k.cylinder(M.dark,.20,.55,[-.80,-.06,0],[0,0,Math.PI/2]);
 return k.finish();
}
