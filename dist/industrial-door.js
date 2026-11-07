import {Assembly,bevelBox,matrix,limb} from './geo.js';

// Authored door dimensions and mission locks remain authoritative. All hardware
// follows its leaf; no collider or interaction ID is created here.
export function createIndustrialDoor(T,parent,d,{low=false,materials={},batch=null}={}){
 const root=new T.Group();root.name='Porte / '+d.id;root.userData.doorId=d.id;
 root.position.set(d.axis==='x'?d.centre:d.fixed,d.y||0,d.axis==='x'?d.fixed:d.centre);root.rotation.y=d.axis==='x'?0:Math.PI/2;parent.add(root);
 const w=d.width,h=d.height,style=d.style||'slide',rolling=['sectional','shutter','grille','gate'].includes(style),hinged=['fire','wood','vault'].includes(style);
 const owned=[],geometries=new Set(),leaves=[],fixed=new Assembly();let disposed=false;
 const mat=(color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness});owned.push(m);return m;};
 const steel=materials.steel||mat(0x8495a4,.8,.35),dark=materials.dark||mat(0x111c24,.25,.65),paint=materials.paint||mat(style==='hazard'?0xc3a448:0x465d70,.5,.48);
 const glass=materials.glass||mat(0x4a8391,.35,.22),status=new T.MeshBasicMaterial({color:0xff5d54,toneMapped:false});owned.push(status);
 const add=(a,g,m,p=[0,0,0],r=[0,0,0])=>{if(m.map){const v=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,tile=m.userData.tile||1;for(let i=0;i<v.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.65?v.getZ(i):v.getX(i))/tile,(ny>.65?v.getZ(i):v.getY(i))/tile);}}a.add(g,m,matrix(p,r),!low);g.dispose();};
 const box=(a,s,p,m=paint,r=[0,0,0])=>add(a,Math.min(...s)<.04?new T.BoxGeometry(...s):bevelBox(...s,Math.min(.035,Math.min(...s)*.18),1),m,p,r);
 const rod=(a,u,v,r=.025,m=steel)=>{const g=limb(u,v,r,r,low?6:8);add(a,g,m);};
 function finish(a,host){a.build(host);for(const item of a.items)item.geometry.dispose();a.items.length=0;host.traverse(o=>{if(o.isMesh){o.castShadow=!low&&!o.material.transparent;o.receiveShadow=true;}});}
 const plate=(a,width,height,depth,centre,m=paint)=>{
  const x=width/2,y=height/2,c=Math.min(.16,width*.12,height*.07),s=new T.Shape();
  s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.lineTo(x,-y+c);s.lineTo(x,y-c);s.lineTo(x-c,y);s.lineTo(-x+c,y);s.lineTo(-x,y-c);s.lineTo(-x,-y+c);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:depth>.04,bevelSize:.009,bevelThickness:.009,bevelSegments:1,steps:1});g.translate(0,0,-depth/2);add(a,g,m,centre);
 };
 for(const side of [-1,1]){
  box(fixed,[.10,h+.12,.24],[side*(w/2+.055),h/2,0],dark);
  box(fixed,[.14,h+.22,.30],[side*(w/2+.18),h/2,.015],steel);
  box(fixed,[.065,h*.73,.05],[side*(w/2+.18),h*.48,.19],paint);
  for(const yy of [.25,h*.50,h-.15])add(fixed,new T.CylinderGeometry(.028,.028,.014,6),steel,[side*(w/2+.18),yy,.18],[Math.PI/2,0,0]);
 }
 plate(fixed,w+.56,.30,.34,[0,h+.15,0]);box(fixed,[w+.30,.018,.27],[0,.009,0],steel);
 // Protected diffusers, recessed reflectors and cooling fins above both faces.
 for(const side of [-1,1]){
  box(fixed,[Math.min(w*.6,1.5),.12,.10],[0,h+.13,side*.20],dark);
  for(const offset of [-.25,.25])add(fixed,new T.CylinderGeometry(.035,.035,Math.min(w*.22,.50),low?6:10),status,[offset*Math.min(w,2),h+.13,side*.27],[0,0,Math.PI/2]);
  for(let i=0;i<5;i++)box(fixed,[.035,.11,.13],[(i-2)*.07,h+.32,side*.05],steel);
 }
 const motor=new T.Group();motor.name='Motorisation / poulie';motor.position.set(w/2+.18,h+.19,-.18);root.add(motor);
 const motorParts=new Assembly();add(motorParts,new T.CylinderGeometry(.115,.115,.08,low?10:18),steel,[0,0,0],[Math.PI/2,0,0]);rod(motorParts,[-.08,0,.05],[.08,0,.05],.016,dark);finish(motorParts,motor);
 box(fixed,[.34,.32,.25],[w/2+.18,h+.19,-.30],dark);
 if(rolling){
  const n=Math.max(5,Math.min(10,Math.ceil(h/.48))),ph=h/n;
  for(let k=0;k<n;k++){
   const leaf=new T.Group(),a=new Assembly(),base=(k+.5)*ph;leaf.position.y=base;leaf.name='Panneau articulé '+k;root.add(leaf);
   if(style==='grille'){
    for(let x=-w/2+.06;x<w/2;x+=.22)rod(a,[x,-ph/2,0],[x,ph/2,0],.022,steel);
   }else plate(a,w-.035,ph-.022,.075,[0,0,0]);
   for(const side of [-1,1]){
    rod(a,[-w/2+.04,-ph/2+.018,side*.05],[w/2-.04,-ph/2+.018,side*.05],.014,steel);
    if(k===0){for(const xx of [-.2,.2])rod(a,[xx,0,side*.04],[xx,0,side*.14],.025);rod(a,[-.2,0,side*.14],[.2,0,side*.14],.032,dark);}
   }
   for(const side of [-1,1])add(a,new T.CylinderGeometry(.045,.045,.06,8),steel,[side*(w/2+.015),0,-.04],[0,0,Math.PI/2]);
   finish(a,leaf);leaves.push({root:leaf,base,ph});
  }
  for(const side of [-1,1]){
   const x=side*(w/2+.18),curve=new T.CatmullRomCurve3([new T.Vector3(x,.06,-.12),new T.Vector3(x,h-.20,-.12),new T.Vector3(x,h+.25,-.30),new T.Vector3(x,h+.33,-.7),new T.Vector3(x,h+.33,-h-.3)]);
   add(fixed,new T.TubeGeometry(curve,low?16:24,.035,6,false),steel);
  }
 }else{
  const count=hinged?1:2,lw=w/count;
  for(let i=0;i<count;i++){
   const dir=count===1?1:i?1:-1,pivot=new T.Group(),leaf=new T.Group(),a=new Assembly();root.add(pivot);pivot.add(leaf);
   if(hinged){pivot.position.set(-w/2,h/2,0);leaf.position.x=w/2;}else pivot.position.set(dir*w/4,h/2,0);
   leaf.name='Vantail / '+i;const thick=style==='vault'||style==='lock'?.22:.10;
   if(style==='glass'){
    box(a,[lw-.16,h-.18,.035],[0,0,0],glass);
    for(const side of [-1,1])box(a,[.08,h,.12],[side*(lw/2-.04),0,0],paint);
    for(const yy of [-h/2+.05,h/2-.05])box(a,[lw,.1,.12],[0,yy,0],paint);
   }else{
    plate(a,lw-.025,h-.025,thick,[0,0,0]);
    for(const side of [-1,1]){
     plate(a,lw*.78,h*.68,.025,[0,0,side*(thick/2+.02)],dark);
     plate(a,lw*.72,h*.62,.025,[0,0,side*(thick/2+.04)]);
     box(a,[lw*.88,.15,.03],[0,-h*.37,side*(thick/2+.04)],steel);
     // Angled reinforcement and recessed service seams break up the flat leaf.
     rod(a,[-lw*.28,-h*.18,side*(thick/2+.06)],[lw*.28,h*.18,side*(thick/2+.06)],.025,steel);
     for(let j=0;j<3;j++)box(a,[lw*.22,.012,.014],[lw*.21,h*.28-j*.045,side*(thick/2+.06)],dark);
    }
   }
   const handleX=hinged?lw*.32:-dir*(lw/2-.18),handle=new T.Group();handle.name='Poignée / déverrouillage';handle.position.set(handleX,-Math.min(.15,h*.1),0);leaf.add(handle);
   const grip=new Assembly();
   for(const side of [-1,1]){
    const z=side*(thick/2+.06);box(a,[.13,.45,.035],[handleX,-.15,z],dark);
    // Stand-off D handles, reachable from both sides and mechanically attached.
    rod(grip,[0,-.15,z],[0,-.15,z+side*.12],.024);rod(grip,[0,.15,z],[0,.15,z+side*.12],.024);
    rod(grip,[0,-.15,z+side*.12],[0,.15,z+side*.12],.03,steel);
   }
   finish(grip,handle);
   if(hinged){
    for(const yy of [-h*.34,0,h*.34])add(fixed,new T.CylinderGeometry(.055,.055,.21,low?8:12),steel,[-w/2-.015,h/2+yy,0]);
   }else{
    for(const xx of [-lw*.33,lw*.33]){add(a,new T.CylinderGeometry(.075,.075,.055,10),steel,[xx,h/2+.065,-.03],[Math.PI/2,0,0]);}
   }
   const bolts=new T.Group(),boltParts=new Assembly();bolts.name='Pênes / retrait';leaf.add(bolts);
   for(const yy of [-h*.32,h*.32])rod(boltParts,[handleX-.09,yy,thick/2+.075],[handleX+.09,yy,thick/2+.075],.025);
   finish(boltParts,bolts);finish(a,leaf);
   leaves.push({root:leaf,pivot,base:dir*w/4,dir,slide:lw+.15,handle,bolts});
  }
  // Double rails and an actuator shaft connect the leaves to the head motor.
  for(const yy of [h+.08,h+.25])rod(fixed,[-w/2-.12,yy,-.07],[w/2+.22,yy,-.07],.028);
 }
 let closer=null;
 if(hinged){
  closer=new T.InstancedMesh(new T.CylinderGeometry(.025,.025,1,low?6:8),steel,2);closer.name='Ferme-porte / bras articulés';root.add(closer);
  box(fixed,[.36,.13,.23],[-w/2+.16,h+.13,-.24],dark);
 }
 const armPose=new T.Object3D(),up=new T.Vector3(0,1,0),armA=new T.Vector3(),armB=new T.Vector3(),elbow=new T.Vector3(),armDirection=new T.Vector3();
 if(batch){root.updateMatrix();for(const item of fixed.items){batch.add(item.geometry,item.material,root.matrix,item.shadow);item.geometry.dispose();}fixed.items.length=0;}
 else finish(fixed,root);
 function update(value,locked=false){
  const amount=Number.isFinite(value)?Math.min(1,Math.max(0,value)):0,p=amount*amount*(3-2*amount);
  for(const leaf of leaves){
   if(rolling){
    const radius=.25,arc=Math.PI*radius/2,travel=leaf.base+p*(h+arc+.35),u=Math.max(0,travel-(h+.08));
    if(u===0){leaf.root.position.set(0,travel,0);leaf.root.rotation.x=0;}
    else {const angle=Math.min(Math.PI/2,u/radius);leaf.root.position.set(0,h+.08+radius*Math.sin(angle),-radius*(1-Math.cos(angle))-Math.max(0,u-arc));leaf.root.rotation.x=-angle;}
   }else{
    if(hinged)leaf.pivot.rotation.y=-p*Math.PI/2;else leaf.pivot.position.x=leaf.base+leaf.dir*leaf.slide*p;
    leaf.handle.rotation.z=-Math.sin(Math.min(1,amount/.20)*Math.PI)*.28;
    leaf.bolts.position.x=(hinged?-1:leaf.dir)*Math.min(1,amount/.10)*.12;
   }
  }
  if(closer){
   const angle=-p*Math.PI/2;
   armA.set(-w/2+.16,h+.13,-.24);armB.set(-w/2+Math.cos(angle)*w*.35-Math.sin(angle)*.12,h+.13,-Math.sin(angle)*w*.35-Math.cos(angle)*.12);
   const dx=armB.x-armA.x,dz=armB.z-armA.z,distance=Math.hypot(dx,dz),length=w*.26+.08,offset=Math.sqrt(Math.max(0,length*length-distance*distance/4));
   elbow.copy(armA).add(armB).multiplyScalar(.5).add(new T.Vector3(dz,0,-dx).multiplyScalar(offset/Math.max(distance,.0001)));
   for(const [i,from,to] of [[0,armA,elbow],[1,elbow,armB]]){armDirection.copy(to).sub(from);armPose.position.copy(from).add(to).multiplyScalar(.5);armPose.scale.set(1,armDirection.length(),1);armPose.quaternion.setFromUnitVectors(up,armDirection.normalize());armPose.updateMatrix();closer.setMatrixAt(i,armPose.matrix);}
   closer.instanceMatrix.needsUpdate=true;closer.computeBoundingSphere();
  }
  motor.rotation.z=p*Math.PI*4;status.color.setHex(locked?0xff554b:amount>.001&&amount<.999?0xffbf5c:0x68ffd2);
  root.userData.openAmount=amount;root.userData.locked=!!locked;
 }
 update(0,!d.open);
 return {root,leaves,update,dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());}};
}
