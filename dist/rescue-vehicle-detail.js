// Pink Wars / M01 — original metric rescue vehicle geometry.
// This replaces the two cuboid emergency-vehicle proxies with detailed,
 // batched meshes. One sealed Group per real authored collider; no new collision
// hulls, lights, runtime generators, gameplay assets or remote downloads.
// Local forward = +X; mesh center and tires remain inside the prop footprint.
import {Assembly,bevelBox,matrix} from './geo.js';

export const RESCUE_VEHICLE_PROFILE=Object.freeze({
 vsav:Object.freeze({type:'VSAV',name:'AMBULANCE 07',role:'rescue',maxHeight:2.8}),
 fpt:Object.freeze({type:'FPT',name:'CAMION 07',role:'fire-engine',maxHeight:3.2})
});
export function createRescueVehicle(T,{kind,length,width,low=false,M,signTexture=null}={}){
 const info=RESCUE_VEHICLE_PROFILE[kind];if(!info)throw Error('Unknown rescue vehicle '+kind);
 if(!(length>4&&width>1.5))throw Error('Invalid rescue vehicle envelope');
 const g=new T.Group();g.name='AEGIS 07 / '+info.name+' · véhicule hard-surface';
 g.userData.vehicle={kind,length,width,role:info.role,revision:'rescue-v2-2026-11',authoritativeCollider:'M01 extension obstacle'};
 const parts=new Assembly();const bat=(m,s,p,r=[0,0,0],round=.012)=>{
  parts.add(round?bevelBox(...s,Math.min(round,Math.min(...s)*.20),low?1:2):new T.BoxGeometry(...s),m,matrix(p,r));
 };
 const rod=(m,p1,p2,r=.015,rad=8)=>{
  const a=new T.Vector3(...p1),b=new T.Vector3(...p2),delta=b.clone().sub(a);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
  parts.add(new T.CylinderGeometry(r,r,delta.length(),low?6:rad),m,new T.Matrix4().compose(a.add(b).multiplyScalar(.5),q,new T.Vector3(1,1,1)));
 };
 const disc=(m,x,y,z,r,h=.018,seg=low?10:18)=>parts.add(new T.CylinderGeometry(r,r,h,seg),m,matrix([x,y,z],[Math.PI/2,0,0]));
 const cabX=length/2-1.19,frontX=length/2-.11,backX=-length/2+.10,boxLen=length-2.45,boxX=(backX+cabX-1.08)*.5;
 const bodyColor=kind==='vsav'?M.white:M.red;
 // Functional rails under the body, not a black rectangle intersecting tyres.
 for(const side of [-1,1]){
  bat(M.dark,[length-.32,.15,.11],[-.08,.55,side*(width*.31)]);
  bat(M.steel,[length-.32,.035,.07],[-.08,.47,side*(width*.31)]);
 }
 bat(M.dark,[length-.35,.22,width-.34],[-.05,.65,0]);
 // A lowered box body separates the wheels from the equipment area.
 const boxHeight=kind==='vsav'?1.52:1.88;
 bat(bodyColor,[boxLen,boxHeight,width-.16],[boxX,.91+boxHeight*.5,0],[0,0,0],.035);
 bat(M.dark,[boxLen+.04,.075,width+.02],[boxX,.91+boxHeight+.06,0],[0,0,0],.014);
 bat(M.steel,[boxLen+.01,.040,width-.16],[boxX,.91,0]);
 // Cab, sloping front windscreen, actual dark windows and edged front grille.
 bat(bodyColor,[2.13,1.36,width-.18],[cabX,1.39,0],[0,0,0],.075);
 bat(bodyColor,[1.50,.22,width-.35],[cabX-.25,2.17,0],[0,0,0],.045);
 bat(M.dark,[.12,.39,width-.29],[frontX-.07,.86,0],[0,0,0],.018);
 bat(M.steel,[.09,.24,width*.53],[frontX+.017,1.15,0]);
 for(const z of [-width*.24,0,width*.24]){
  bat(M.dark,[.02,.027,width*.16],[frontX+.071,1.1,z]);
 }
 // The windshield is angled rather than a glass-coloured cuboid.
 const glassQuad=(onSide=false,side=1)=>{
  const verts=onSide?[
   cabX-.58,1.73,side*(width/2-.075),
   cabX+.55,1.73,side*(width/2-.075),
   cabX+.55,2.04,side*(width/2-.075),
   cabX-.62,2.04,side*(width/2-.075)
  ]:[
   frontX-.13,1.43,-width*.43,
   frontX-.13,1.43,width*.43,
   frontX-.47,2.06,width*.39,
   frontX-.47,2.06,-width*.39
  ];
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();parts.add(geo,M.glass);
 };
 glassQuad();
 // Windows, door-panel grooves, realistic hinges and actual wing mirrors.
 for(const side of [-1,1]){
  glassQuad(true,side);
  const z=side*(width*.5-.030);
  bat(M.dark,[.026,.84,.018],[cabX-.72,1.58,z],[],.001);
  bat(M.dark,[.84,.026,.015],[cabX-.05,1.15,z],[],.002);
  bat(M.dark,[.04,.30,.020],[cabX-.58,1.72,z]);
  bat(M.steel,[.19,.027,.028],[cabX+.07,1.36,z+side*.016]);
  rod(M.dark,[cabX+.55,1.72,z],[cabX+.80,1.73,side*(width*.5+.07)],.018);
  bat(M.dark,[.21,.16,.08],[cabX+.83,1.75,side*(width*.5+.08)],[],.015);
  bat(M.steel,[.026,.13,.12],[cabX+.95,1.75,side*(width*.5+.09)]);
 }
 // Grille with proportional headlamp pods, reflective strips, side markers.
 for(const side of [-1,1]){
  const z=side*(width*.5-.23);
  bat(M.dark,[.025,.25,.31],[frontX+.07,1.31,z]);
  bat(M.white,[.009,.16,.24],[frontX+.086,1.31,z],[],.001);
  bat(M.yellow,[.010,.062,.18],[frontX+.088,1.15,z],[],.001);
  bat(M.black,[.06,.21,.13],[-length/2+.07,1.1,side*(width*.5-.16)]);
  bat(M.redGlow,[.008,.13,.11],[-length/2+.109,1.1,side*(width*.5-.16)],[],.001);
 }
 bat(M.steel,[.13,.15,width-.15],[frontX+.045,.73,0]);
 for(const x of [frontX-.25,boxX,backX+.38])bat(M.dark,[.045,.03,width-.19],[x,.74,0]);
 const axles=[length/2-1.24,-length/2+.95];
 for(const x of axles)for(const side of [-1,1]){
  const z=side*(width*.5-.19);
  parts.add(new T.CylinderGeometry(.47,.47,.23,low?12:22),M.black,matrix([x,.49,z],[Math.PI/2,0,0]));
  // Sidewall ring, radial hub, cap, rim screws. Each is batched by material.
  const exposed=z+side*.126;
  disc(M.dark,x,.49,exposed,.36,.018);
  disc(M.steel,x,.49,exposed+side*.012,.23,.020);
  disc(M.dark,x,.49,exposed+side*.025,.085,.028);
  if(!low)for(let i=0;i<8;i++){
   const a=i*Math.PI/4;disc(M.steel,x+Math.cos(a)*.145,.49+Math.sin(a)*.145,exposed+side*.03,.016,.012,8);
  }
  // The visible arch follows the tyre instead of pretending a wheel is a ball.
  parts.add(new T.TorusGeometry(.525,.031,5,low?12:24,Math.PI),M.steel,matrix([x,.49,side*(width*.5-.016)]));
  bat(M.dark,[1.09,.11,.16],[x,1.01,side*(width*.5-.10)],[],.018);
 }
 // Reflective body markings and actual equipment compartments.
 for(const side of [-1,1]){
  const z=side*(width*.5-.066);
  bat(kind==='vsav'?M.red:M.white,[boxLen-.20,.11,.012],[boxX,1.08,z+side*.023],[],.001);
  bat(M.yellow,[boxLen-.24,.038,.013],[boxX,1.185,z+side*.029],[],.001);
  if(kind==='fpt'){
   const panelLen=(boxLen-.48)/3;
   for(let k=0;k<3;k++){
    const px=backX+.25+panelLen*(k+.5);
    bat(M.shutter,[panelLen-.10,1.05,.015],[px,1.93,z+side*.027],[],.006);
    bat(M.steel,[panelLen-.06,.035,.025],[px,2.51,z+side*.043]);
    bat(M.dark,[.18,.034,.038],[px,1.35,z+side*.06],[],.005);
    for(let row=0;row<(low?3:7);row++)bat(M.steel,[panelLen-.12,.017,.012],[px,1.50+row*.125,z+side*.05],[],.001);
   }
  }else{
   // Ambulance side access door, glazed quarter-panel and medical cross.
   const px=boxX+.33;
   bat(M.dark,[.023,1.22,.016],[px,1.74,z+side*.028],[],.001);
   bat(M.dark,[.30,.02,.016],[px-.13,1.80,z+side*.035]);
   bat(M.steel,[.18,.035,.020],[px+.18,1.40,z+side*.041]);
   bat(M.red,[.26,.09,.018],[boxX-.76,1.74,z+side*.049]);
   bat(M.red,[.09,.26,.019],[boxX-.76,1.74,z+side*.050]);
  }
 }
 if(kind==='fpt'){
  // Pump inlet and couplings on the rear face; ladder rails on the roof.
  for(const z of [-.36,0,.36]){
   parts.add(new T.CylinderGeometry(.10,.10,.065,low?10:18),M.steel,matrix([backX-.025,1.58,z],[0,0,Math.PI/2]));
   parts.add(new T.CylinderGeometry(.06,.06,.075,low?10:18),M.dark,matrix([backX-.061,1.58,z],[0,0,Math.PI/2]));
  }
  for(const z of [-.37,.37]){
   bat(M.steel,[boxLen-.28,.045,.045],[boxX,3.01,z],[],.004);
  }
  for(let k=0;k<8;k++)bat(M.steel,[.05,.028,.79],[backX+.33+k*(boxLen-.42)/7,3.02,0],[],.003);
 }else{
  // Rear step for medical crew, split rear doors and grab handles.
  bat(M.steel,[.23,.09,width-.32],[backX-.04,.62,0]);
  bat(M.dark,[.013,1.38,.018],[backX-.059,1.69,0]);
  for(const side of [-1,1])bat(M.steel,[.019,.31,.036],[backX-.058,1.75,side*.27]);
 }
 // Rotating beacons are unlit, preserving historical deactivation in 2189.
 for(const z of [-.57,.57]){bat(M.dark,[.31,.10,.22],[cabX-.25,2.30,z],[],.015);bat(M.red,[.20,.065,.14],[cabX-.25,2.37,z],[],.012);}
 const meshes=parts.build(g,{name:'AEGIS / véhicules de secours détaillés'});
 for(const x of parts.items)x.geometry.dispose();parts.items.length=0;
 // A true two-line station ID, not an unreadable placeholder rectangle.
 if(signTexture){
  const tex=signTexture(info.name);
  const mat=new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.04,roughness:.82,metalness:.04,side:T.DoubleSide});
  const text=new T.Mesh(new T.PlaneGeometry(Math.min(2.5,boxLen*.63),.33),mat);
  text.position.set(boxX,1.95,width*.5+.012);g.add(text);
  const textBack=text.clone();textBack.position.z=-width*.5-.012;textBack.rotation.y=Math.PI;g.add(textBack);
 }
 g.userData.batchCount=meshes.length;
 return g;
}
