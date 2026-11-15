export function createVoltisIEM(T,{gpu=true}={}){
 const root=new T.Group();root.name='VOLTIS IEM';
 const pulse={value:0};
 // Match the long, low reference silhouette. Extend the front assembly more
 // than the stock while keeping the receiver and circular fasteners coherent.
 const fitX=x=>x<-.35?-.35+(x+.35)*1.12:x>.45?.45+(x-.45)*1.48:x;
 const fitY=y=>.27+(y-.27)*.76;
 const fitPoint=point=>new T.Vector3(fitX(point[0]),fitY(point[1]),point[2]*.92);
 function reshape(geometry,mode){
  geometry.computeBoundingBox();const centre=geometry.boundingBox.getCenter(new T.Vector3()),mapped=fitPoint(centre.toArray());
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   if(mode==='rigid'){p.setXYZ(i,x-centre.x+mapped.x,y-centre.y+mapped.y,z-centre.z+mapped.z);continue;}
   const radial=mode==='axial',sx=x<-.35?1.12:x>.45?1.48:1,sy=radial?1:.76,sz=radial?1:.92;
   p.setXYZ(i,fitX(x),radial?y-centre.y+mapped.y:fitY(y),radial?z-centre.z+mapped.z:z*.92);
   const normal=new T.Vector3(n.getX(i)/sx,n.getY(i)/sy,n.getZ(i)/sz).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  p.needsUpdate=n.needsUpdate=true;return geometry;
 }
 function surfaceTexture(kind){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle=kind==='rubber'?'#55595b':'#b9babb';ctx.fillRect(0,0,256,256);
  let seed=4983;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  for(let i=0;i<3400;i++){const x=rand()*256,y=rand()*256;ctx.fillStyle=rand()>.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)';ctx.fillRect(x,y,kind==='rubber'?1:20+rand()*90,1);}
  if(kind==='rubber'){ctx.strokeStyle='#222629';ctx.lineWidth=2;for(let i=-256;i<512;i+=9){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+256,256);ctx.stroke();ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i-256,256);ctx.stroke();}}
  const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,3);return tex;
 }
 const grain=surfaceTexture('steel'),rubber=surfaceTexture('rubber');
 const mat=(color,metalness=.3,roughness=.5,extra={})=>new T.MeshStandardMaterial({color,metalness,roughness,...extra});
 const M={
  ceramic:mat(0xc9ccca,.42,.39,{bumpMap:grain,bumpScale:.0006}),
  edge:mat(0x747c80,.8,.28,{bumpMap:grain,bumpScale:.00035}),
  silver:mat(0xb4bec2,.88,.24,{bumpMap:grain,bumpScale:.0004}),
  dark:mat(0x242a2f,.6,.42,{bumpMap:grain,bumpScale:.0004}),
  carbon:mat(0x11171c,.12,.78,{bumpMap:rubber,bumpScale:.0016}),
  grip:mat(0x22262a,.05,.86,{bumpMap:rubber,bumpScale:.002}),
  rubber:mat(0x151819,0,.92,{bumpMap:rubber,bumpScale:.0015}),
  yellow:mat(0xd4b21a,.25,.45),copper:mat(0xb47c42,.82,.34),
  black:mat(0x070c10,.15,.5),red:mat(0x6c241c,.4,.45),
  cyan:mat(0x51cbe0,.5,.22,{emissive:0x42ddff,emissiveIntensity:.2}),
  amber:mat(0xd39c23,.3,.25,{emissive:0xffb713,emissiveIntensity:.45})
 };
 if(gpu&&T.MeshStandardNodeMaterial&&T.TSL){
  const S=T.TSL;pulse.node=S.uniform(0);
  M.cyan=new T.MeshStandardNodeMaterial({color:0x4fcbdc,roughness:.25,metalness:.45});
  M.cyan.emissiveNode=S.color(0x57e6ff).mul(pulse.node.mul(5).add(.18));
 }
 function add(geometry,material,position=[0,0,0],rotation=[0,0,0],parent=root){
  const mesh=new T.Mesh(geometry,material);mesh.position.fromArray(position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
 }
 function plate(points,depth,material,z=0,bevel=.008){
  const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  return add(new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:6}).translate(0,0,z-depth/2),material);
 }
 function block(w,h,d,material,position,bevel=.006){
  const points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  const mesh=plate(points,d,material,0,Math.min(bevel,w*.18,h*.18,d*.18));mesh.position.fromArray(position);return mesh;
 }
 function cyl(r,len,material,position,axis='x',segments=12){
  const mesh=add(new T.CylinderGeometry(r,r,len,segments),material,position,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0]);mesh.userData.reframe=axis==='x'?'axial':'rigid';return mesh;
 }
 function tube(points,r,material){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*5),r,6,false),material);}
 function bolt(x,y,z,r=.012){cyl(r,.009,M.dark,[x,y,z],'z',8);const slot=block(r*1.22,.003,.002,M.black,[x,y,z+Math.sign(z)*.006],0);slot.rotation.z=.6;slot.userData.reframe='rigid';}
 // The butt stock is upholstered rubber; an open structural neck preserves the reference silhouette.
 plate([[-1.19,.21],[-1.14,.29],[-.94,.31],[-.81,.22],[-.83,-.15],[-1.09,-.21],[-1.18,-.12]],.16,M.carbon);
 plate([[-1.21,.19],[-1.19,.25],[-1.15,.24],[-1.11,-.13],[-1.13,-.2],[-1.19,-.16]],.195,M.rubber);
 for(let i=0;i<8;i++)block(.013,.025,.207,M.grip,[-1.181+i*.005,.16-i*.041,0],.002);
 plate([[-1.04,.25],[-.69,.37],[-.46,.35],[-.47,.27],[-.83,.17],[-1.01,.16]],.18,M.rubber);
 tube([[-1.06,.24,.10],[-.85,.26,.108],[-.68,.37,.108],[-.48,.36,.108]],.009,M.yellow);
 tube([[-.82,-.17,.096],[-.71,-.11,.096],[-.63,.08,.096],[-.53,.17,.096]],.009,M.yellow);
 // Thumbhole skeleton: a real through-opening, not a dark painted rectangle.
 const neck=new T.Shape();[[-.84,.2],[-.55,.36],[-.2,.35],[-.06,.23],[-.12,-.09],[-.3,-.19],[-.53,-.12],[-.68,.01]].forEach(([x,y],i)=>i?neck.lineTo(x,y):neck.moveTo(x,y));neck.closePath();
 const opening=new T.Path();[[-.58,.10],[-.42,.22],[-.24,.22],[-.18,.12],[-.23,-.035],[-.35,-.095],[-.49,-.045]].forEach(([x,y],i)=>i?opening.lineTo(x,y):opening.moveTo(x,y));opening.closePath();neck.holes.push(opening);
 add(new T.ExtrudeGeometry(neck,{depth:.105,bevelEnabled:true,bevelSize:.01,bevelThickness:.007,bevelSegments:2,steps:1}).translate(0,0,-.0525),M.dark);
 for(const side of [-1,1]){
  plate([[-.79,.22],[-.53,.35],[-.44,.35],[-.57,.21],[-.51,.14],[-.59,.09],[-.67,.13]],.012,M.ceramic,side*.064,.004);
  bolt(-1.05,-.04,side*.094,.016);bolt(-.91,-.08,side*.094);bolt(-.69,.18,side*.087);
 }
 plate([[-.21,.13],[-.08,.13],[.005,-.04],[-.07,-.235],[-.18,-.23],[-.255,-.05]],.105,M.grip);
 for(let i=0;i<6;i++){const strip=block(.112,.011,.116,M.rubber,[-.115-i*.007,-.07-i*.026,0],.002);strip.rotation.z=-.18;}
 tube([[-.025,.08,.0],[.063,.045,0],[.07,-.095,0],[-.045,-.16,0],[-.11,-.13,0]],.012,M.dark);
 tube([[-.025,.09,0],[-.04,.025,0],[-.014,-.015,0]],.008,M.silver);
 // Faceted pale receiver with separate machined side plates and a continuous top spine.
 plate([[-.35,.36],[-.245,.49],[-.08,.51],[-.045,.57],[.17,.56],[.21,.49],[.48,.46],[.51,.35],[.43,.19],[.04,.16],[-.10,.24]],.205,M.edge);
 for(const side of [-1,1]){
  plate([[-.30,.36],[-.20,.46],[-.035,.46],[.01,.52],[.15,.51],[.18,.44],[.41,.42],[.40,.25],[.05,.23],[-.1,.30]],.018,M.ceramic,side*.119);
  plate([[.12,.385],[.42,.385],[.42,.28],[.12,.28]],.012,M.dark,side*.132,.004);
  for(let i=0;i<9;i++)block(.013,.072,.012,M.black,[.145+i*.027,.332,side*.143],.001);
  for(const [x,y]of [[-.22,.39],[-.06,.36],[.055,.47],[.37,.4],[.365,.25]])bolt(x,y,side*.142,.009);
  block(.075,.036,.012,M.dark,[-.147,.34,side*.145],.004);
  block(.026,.012,.014,M.yellow,[-.14,.342,side*.154],.001);
 }
 // A low sight and individually separated Picatinny teeth.
 block(.28,.055,.115,M.dark,[-.04,.581,0]);
 for(let i=0;i<12;i++)block(.013,.027,.135,M.silver,[-.172+i*.024,.619,0],.001);
 block(.07,.064,.08,M.dark,[-.145,.648,0]);block(.032,.019,.083,M.black,[-.145,.681,0]);
 block(.024,.012,.025,M.yellow,[-.145,.683,.035],.001);
 // Capacitor cartridge under the breach, with contacts, protective ribs and pull tab.
 block(.36,.205,.19,M.dark,[.23,.072,0],.012);
 block(.31,.025,.20,M.black,[.23,-.045,0],.004);
 for(const side of [-1,1]){
  block(.194,.102,.012,M.black,[.198,.076,side*.107],.004);
  for(let i=0;i<3;i++)block(.031,.071,.014,i===1?M.yellow:M.edge,[.128+i*.06,.078,side*.119],.002);
  for(let i=0;i<3;i++)block(.021,.064,.016,M.red,[.407+i*.027,.142,side*.083],.002);
  bolt(.09,-.008,side*.11,.01);bolt(.365,-.008,side*.11,.01);
 }
 block(.14,.018,.12,M.silver,[.22,-.068,0],.004);
 // Two OPEN electromagnetic rails, with edge chamfers, inlaid conductors and yellow distal bands.
 for(const [y,length,start]of [[.453,.84,.38],[.245,.97,.36]]){
  const x=start+length/2;
  block(length,.057,.125,M.silver,[x,y,0],.008);
  block(length-.026,.015,.143,M.edge,[x,y-.035,0],.003);
  block(.043,.061,.13,M.yellow,[start+length-.102,y,0],.003);
  block(.063,.048,.113,M.ceramic,[start+length-.031,y,0],.004);
  for(const side of [-1,1]){
   block(length-.15,.006,.005,M.cyan,[x-.02,y+(y>.3?-.031:.031),side*.068],.001);
   for(let i=0;i<6;i++)bolt(start+.1+i*.095,y,side*.072,.0065);
  }
 }
 // Exposed central electromagnetic accelerator, piston, wound copper and cooling jacket.
 cyl(.035,.43,M.edge,[.66,.352,0]);cyl(.041,.15,M.silver,[.77,.352,0]);
 cyl(.047,.046,M.dark,[.45,.352,0]);cyl(.043,.03,M.ceramic,[.88,.352,0]);
 for(let i=0;i<10;i++)cyl(.043,.009,M.dark,[.495+i*.022,.352,0]);
 const helix=[];for(let i=0;i<=220;i++){const u=i/220,a=u*Math.PI*22;helix.push([.49+.218*u,.352+Math.sin(a)*.044,Math.cos(a)*.044]);}tube(helix,.0038,M.copper).userData.reframe='axial';
 for(const side of [-1,1]){
  tube([[.31,.288,side*.11],[.40,.285,side*.102],[.44,.32,side*.075]],.007,M.black);
  block(.075,.021,.03,M.silver,[.85,.398,side*.028],.002);
 }
 // Belly skid, cooling slots, recessed serials and sling eyelets.
 block(.62,.04,.105,M.dark,[.67,.18,0],.006);
 for(let i=0;i<11;i++)block(.027,.02,.116,M.black,[.39+i*.051,.158,0],.002);
 for(const [x,y]of [[-.98,.03],[-.21,.32],[.4,.21]]){
  const eye=add(new T.TorusGeometry(.023,.005,6,12),M.dark,[x,y,.131]);eye.scale.y=.75;
 }
 function decal(text,x,y,z,w,h,{color='#1c252b',background=null,font='600 37px sans-serif',align='left'}={}){
  if(typeof document==='undefined')return;
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);}ctx.fillStyle=color;ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,align==='center'?256:12,64,490);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const m=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  add(new T.PlaneGeometry(w,h),m,[x,y,z],z<0?[0,Math.PI,0]:[0,0,0]).userData.reframe='rigid';
 }
 for(const side of [-1,1]){
  decal('VOLTIS  IEM',-.09,.403,side*.136,.274,.067,{align:'center',font:'700 50px sans-serif'});
  decal('PW / EM-04 • INDUCTION',-.008,.281,side*.14,.205,.032,{font:'500 25px monospace'});
  decal('HAUTE TENSION',.233,.097,side*.131,.182,.027,{color:'#d4bc54',font:'500 28px monospace'});
  decal('08',-.935,.064,side*.105,.07,.04,{color:'#abb0ad',font:'500 40px monospace',align:'center'});
 }
 // Merge static subparts by material to keep this detailed prop inexpensive to inspect.
 root.updateMatrixWorld(true);const groups=new Map();let partCount=0;
 for(const obj of [...root.children]){
  if(!obj.isMesh)continue;partCount++;const geometry=(obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone()).applyMatrix4(obj.matrixWorld);
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  reshape(geometry,obj.userData.reframe);
  if(!groups.has(obj.material))groups.set(obj.material,[]);groups.get(obj.material).push(geometry);obj.removeFromParent();obj.geometry.dispose();
 }
 let triangles=0;
 for(const [material,geometries]of groups){
  const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),position=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2);let offset=0;
  for(const g of geometries){position.set(g.attributes.position.array,offset*3);normal.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,offset*2);offset+=g.attributes.position.count;g.dispose();}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);triangles+=count/3;
 }
 const bounds=new T.Box3().setFromObject(root);
 return {root,muzzle:fitPoint([1.34,.35,0]),referencePoint:fitPoint,pulse(value){pulse.value=value;if(pulse.node)pulse.node.value=value;else M.cyan.emissiveIntensity=.18+value*5;},
  stats:()=>({name:'VOLTIS IEM',proportions:'long-low-2',parts:partCount,draws:root.children.length,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},nativeNodeGlow:!!pulse.node})};
}
