import {Assembly,bevelBox,limb,matrix} from './geo.js';
import {metricSurfaceUV} from './combat-surface-textures.js';

// Decorative hardware uses the authored walking route. It never changes physics.
export function createStairHardware(T,parent,s,{materials={},low=false,mode='steps',steps=Math.round(Math.abs(s.bottomZ-s.topZ)/.3),stepOffset=1,railInset=-.07,rails=true,wall=false,deck=false,postCount=null,railHeight=1.04,topReturn=true}={}){
 const root=new T.Group();root.name='Escalier / '+s.id;root.userData.stairHardware=s.id;parent.add(root);
 const a=new Assembly(),owned=[],geometries=new Set();
 const material=(color,roughness,metalness)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});owned.push(m);return m;};
 const steel=materials.steel||material(0x88969b,.4,.72),dark=materials.dark||materials.black||material(0x18212b,.8,.2),tread=materials.tread||steel;
 const width=s.halfWidth*2,base=s.base||0,dy=s.height-base,dz=s.topZ-s.bottomZ,length=Math.abs(dz),direction=Math.sign(dz),slope=Math.atan2(-dy,dz),count=Math.max(1,steps);
 if(!length||!Number.isFinite(dy)||width<=.3)throw new Error('Invalid stair route '+s.id);
 const at=(t,y=0,x=0)=>[s.x+x,base+dy*t+y,s.bottomZ+dz*t];
 function add(g,m,p=[0,0,0],r=[0,0,0]){metricSurfaceUV(g,m.userData.tile||1);a.add(g,m,matrix(p,r),!low);g.dispose();}
 const box=(size,p,m=steel,r=[0,0,0],bevel=0)=>add(bevel?bevelBox(...size,bevel,1):new T.BoxGeometry(...size),m,p,r);
 const rod=(p,q,r=.035,m=steel)=>add(limb(p,q,r,r,low?6:10),m);
 if(deck){
  // Exact upper face (including opposite direction ramps), thickness lies below it.
  const g=new T.BufferGeometry(),l=s.x-s.halfWidth,r=s.x+s.halfWidth;
  g.setAttribute('position',new T.Float32BufferAttribute([l,base,s.bottomZ,r,base,s.bottomZ,r,s.height,s.topZ,l,s.height,s.topZ],3));
  g.setAttribute('uv',new T.Float32BufferAttribute([0,0,width,0,width,length,0,length],2));g.setIndex(direction<0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();add(g,tread);
 }
 for(let i=0;i<count;i++){
  const t=(i+.5)/count,z=s.bottomZ+dz*t,top=mode==='ramp'?base+dy*t:base+dy*(i+stepOffset)/count;
  const rotation=mode==='ramp'?[slope,0,0]:[0,0,0],run=length/count;
  if(mode==='steps'){
   box([width-.10,.035,run-.025],[s.x,top+.012,z],tread,[0,0,0],.007);
   const front=z-direction*(run/2-.045);
   box([width-.16,.035,.08],[s.x,top+.024,front],steel,[0,0,0],.006);
   box([width-.30,.007,.035],[s.x,top+.045,front],dark);
   for(const side of [-1,1])add(new T.CylinderGeometry(.018,.018,.008,6),steel,[s.x+side*(s.halfWidth-.17),top+.045,front]);
  }else{
   // Shallow anti-slip ribs lie on the true incline, below a 2 cm foot tolerance.
   box([width-.20,.012,.045],[s.x,top+.009,z],dark,rotation);
  }
 }
 if(rails)for(const side of [-1,1]){
  const x=side*(s.halfWidth-railInset),rise=railHeight;
  // Continuous grip with radiused returns: no exposed tube ends at entry/exit.
  const pts=[at(0,.82,x),at(0,rise-.08,x),at(.008,rise,x),at(.992,rise,x),at(1,topReturn?rise-.08:rise,x),at(1,topReturn?.82:rise,x)];
  if(rails!=='fittings'){const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));add(new T.TubeGeometry(curve,Math.max(16,Math.ceil(length*2)),.043,low?6:10,false),steel);
  if(!wall){rod(at(0,.50,x),at(1,.50,x),.026);rod(at(0,.10,x),at(1,.10,x),.035,dark);}}
  const posts=postCount??Math.max(2,Math.ceil(length/1.65));
  for(let i=0;i<=posts;i++){
   const t=i/posts,p=at(t,0,x),foot=mode==='steps'?base+dy*Math.min(1,(Math.floor(t*count)+stepOffset)/count):p[1];
   if(wall){rod(at(t,.86,x),at(t,.86,x+side*.12),.023);rod(at(t,.86,x),at(t,1.04,x),.023);add(new T.CylinderGeometry(.065,.065,.02,10),dark,at(t,.86,x+side*.12),[0,0,Math.PI/2]);}
   else{
    if(rails!=='fittings')rod([p[0],foot+.025,p[2]],at(t,railHeight,x),.038);box([.20,.025,.19],[p[0],foot+.015,p[2]],dark,[0,0,0],.005);
    for(const q of [-1,1])add(new T.CylinderGeometry(.019,.019,.016,6),steel,[p[0]+q*.065,foot+.035,p[2]+q*.06]);
    add(new T.CylinderGeometry(.053,.053,.055,8),steel,at(t,.51,x));
   }
  }
 }
 // Paired channel stringers carry the flight instead of a floating sheet.
 for(const side of [-1,1]){
  const x=side*(s.halfWidth-.08),span=Math.hypot(length,dy);
  box([.10,.16,span],at(.5,-.12,x),dark,[slope,0,0]);
  for(const y of [-.195,-.045])box([.17,.023,span],at(.5,y,x),steel,[slope,0,0]);
 }
 a.build(root);for(const item of a.items)item.geometry.dispose();a.items.length=0;
 root.traverse(o=>{if(o.isMesh){o.name='Escalier / quincaillerie groupée';o.receiveShadow=true;geometries.add(o.geometry);}});
 root.userData.route={...s};root.userData.mode=mode;root.userData.steps=count;
 let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());}};
}

// Adapt X/Z floor ramps without changing their collision definitions.
export function createFloorRampHardware(T,parent,f,options={}){
 const host=new T.Group();parent.add(host);const xAxis=f.ramp==='x';
 const s={id:f.id,x:xAxis?0:(f.x1+f.x2)/2,halfWidth:(xAxis?f.z2-f.z1:f.x2-f.x1)/2,bottomZ:xAxis?f.x1:f.z1,topZ:xAxis?f.x2:f.z2,base:f.from,height:f.to};
 if(xAxis){host.rotation.y=Math.PI/2;host.position.z=(f.z1+f.z2)/2;}
 const hardware=createStairHardware(T,host,s,{...options,mode:'ramp',deck:true});return {...hardware,dispose(){hardware.dispose();host.removeFromParent();}};
}
