// Faithful geometric port of the user-approved Sentinel MK VIII preview.
// The preview's polygon, track, armor, hydraulic and missile details are retained.
export function createSentinel(T,scene,options={}){
 const root=new T.Group();root.name='Sentinel MK VIII / arena';scene.add(root);
 const visual=new T.Group();visual.rotation.y=Math.PI;root.add(visual);
 const shapes=[];
function box(x,y,z,w,h,d,col,rx=0,ry=0,rz=0){shapes.push({x,y,z,w,h,d,col,rx,ry,rz})}function limb(x1,y1,z1,x2,y2,z2,r,col){let dx=x2-x1,dy=y2-y1,dz=z2-z1,L=Math.hypot(dx,dy,dz),rx=Math.atan2(dz,dy),rz=-Math.atan2(dx,Math.hypot(dy,dz));box((x1+x2)/2,(y1+y2)/2,(z1+z2)/2,r,L,r,col,rx,0,rz)}
function cyl(x,y,z,r,len,col,axis='z',n=10){let verts=[],polys=[];for(let k=0;k<2;k++)for(let j=0;j<n;j++){let u=j*2*Math.PI/n,aa=r*Math.cos(u),bb=r*Math.sin(u);verts.push(axis==='z'?[x+aa,y+bb,z+(k-.5)*len]:axis==='x'?[x+(k-.5)*len,y+aa,z+bb]:[x+aa,y+(k-.5)*len,z+bb])}for(let j=0;j<n;j++)polys.push([j,(j+1)%n,(j+1)%n+n,j+n]);polys.push(Array.from({length:n},(_,i)=>i));polys.push(Array.from({length:n},(_,i)=>n+i).reverse());mesh(verts,polys,col)}
function mesh(verts,polys,col){shapes.push({mesh:true,verts,polys,col})}
function prism(points,z0,z1,col){let n=points.length,v=points.map(p=>[p[0],p[1],z0]).concat(points.map(p=>[p[0],p[1],z1]));let fs=[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i)];for(let i=0;i<n;i++)fs.push([i,(i+1)%n,(i+1)%n+n,i+n]);mesh(v,fs,col)}
function rod(a,b,r,col,n=8){let dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz);let u=[-dy,dx,0],ul=Math.hypot(...u);if(ul<.001)u=[1,0,0];else u=u.map(x=>x/ul);let v=[dy*u[2]-dz*u[1],dz*u[0]-dx*u[2],dx*u[1]-dy*u[0]].map(x=>x/L);let verts=[];for(let P of [a,b])for(let i=0;i<n;i++){let t=i*2*Math.PI/n;verts.push(P.map((q,j)=>q+r*(Math.cos(t)*u[j]+Math.sin(t)*v[j])))}let fs=[];for(let i=0;i<n;i++)fs.push([i,(i+1)%n,n+(i+1)%n,n+i]);fs.push(Array.from({length:n},(_,i)=>n+i));mesh(verts,fs,col)}
function ring(x,y,z,r,thick,col,axis='z',n=12){cyl(x,y,z,r,thick,col,axis,n);cyl(x,y,z+(axis==='z'?thick*.53:0),r*.68,.018,'#17222d',axis,n);cyl(x,y,z+(axis==='z'?thick*.57:0),r*.33,.024,'#89979f',axis,n)}
function build(){shapes.length=0;let gait=0;
// Inner skeleton, hip pivot, chest structure
box(0,2.04,-.07,.91,.7,.71,'#29343e');cyl(0,1.88,.02,.36,.98,'#566570','x');
prism([[-.65,2.45],[.65,2.45],[.82,2.77],[.72,3.38],[.4,3.58],[-.4,3.58],[-.75,3.33]],-.32,.43,'#78858c');
prism([[-.58,2.54],[.58,2.54],[.7,2.89],[.65,3.31],[.32,3.42],[-.35,3.42],[-.7,3.26]],.44,.58,'#a3aeb2');
prism([[-.4,2.37],[.4,2.37],[.48,2.58],[-.48,2.58]],.37,.6,'#37434b');
for(let i=0;i<6;i++)box(0,2.42+i*.073,.62,.48,.035,.055,i%2?'#26343e':'#596871');
for(let side of [-1,1]){
let X=side;
// torso tubing, vents, armor seams
for(let j=0;j<3;j++)rod([X*(.39+j*.075),2.65,-.2],[X*(.5+j*.06),3.1,.47],.047,'#28343c');
box(X*.58,3.04,.605,.12,.31,.018,'#3d4b52');
// shoulder circular rotating joints
cyl(X*.86,3.22,0,.41,.29,'#26323c','x',14);cyl(X*1.035,3.22,0,.33,.11,'#89969d','x',14);cyl(X*1.11,3.22,0,.23,.12,'#3b4c57','x',12);
for(let j=0;j<10;j++){let q=j*Math.PI/5;let xx=X*1.175,yy=3.22+.28*Math.sin(q),zz=.28*Math.cos(q);cyl(xx,yy,zz,.024,.035,'#c0c7c7','x',6)}
prism([[X*.84,3.55],[X*1.15,3.49],[X*1.32,3.15],[X*1.14,2.95],[X*.86,3.03]],.15,.55,'#a6b0b3');
// Upper arm assembly
rod([X*1.13,3.08,.06],[X*1.34,2.66,.18],.19,'#35444f');rod([X*1.15,3.04,.32],[X*1.36,2.67,.36],.095,'#b1b9ba');
prism([[X*1.12,2.99],[X*1.39,2.96],[X*1.58,2.65],[X*1.46,2.47],[X*1.2,2.52]],.15,.53,'#8d999e');
cyl(X*1.43,2.49,.26,.23,.36,'#273640','x');cyl(X*1.43,2.49,.28,.13,.43,'#87969e','x');
// gun housing, twin barrels and ventilated shroud
box(X*1.43,2.42,.57,.43,.32,.63,'#52616a');box(X*1.43,2.45,.8,.52,.19,.37,'#77868d');
for(let k of [-1,1]){let bx=X*1.43+k*.13;rod([bx,2.39,.72],[bx,2.39,1.82],.064,'#35434b',10);rod([bx,2.39,1.55],[bx,2.39,1.91],.045,'#9aa6aa',10);ring(bx,2.39,1.91,.087,.09,'#202d35');for(let j=0;j<4;j++)box(bx,2.39,.87+j*.13,.16,.035,.045,'#a4afb0')}
// shoulder missile pods with 4 cylindrical bores
let px=X*1.22;box(px,4.03,-.11,.91,.69,.92,'#66747d',0,0,-X*.055);box(px,4.03,.375,.84,.62,.10,'#a6afb0');box(px,4.03,.448,.75,.53,.025,'#283640');
for(let row of [-1,1])for(let col of [-1,1]){let mx=px+col*.19,my=4.03+row*.16;ring(mx,my,.49,.127,.055,'#566671');cyl(mx,my,.532,.081,.04,'#121b25','z',12);cyl(mx,my,.55,.046,.012,'#2c343c','z',12)}
rod([X*.86,3.61,-.16],[px,3.75,-.16],.105,'#3e4b54');
// recessed armor seams and hydraulic fittings
for(let j=0;j<5;j++){let yy=2.72+j*.115;box(X*.62,yy,.636,.105,.018,.022,'#26333b')}
for(let j=0;j<4;j++)cyl(X*(.92+j*.08),3.37,.55,.018,.025,'#b6bdba','z',8);
// thigh / knee / lower leg, walking articulated stance
let kx=X*(.77+gait*X*.25),ky=1.26+Math.abs(gait)*.25,fx=X*(.9+gait*X*.3);
cyl(X*.55,1.91,.04,.29,.37,'#37434b','x');rod([X*.57,1.84,.04],[kx,ky,-.03],.23,'#35434d');
prism([[X*.43,1.8],[X*.79,1.81],[X*1.0,1.29],[X*.84,1.03],[X*.59,1.08]],.05,.51,'#a6b1b6');
box(X*.73,1.52,.535,.27,.38,.07,'#6b7d87');
cyl(kx,ky,.05,.25,.42,'#2b3943','x');cyl(kx+X*.22,ky,.05,.17,.035,'#95a2a7','x');
rod([kx,ky,-.04],[fx,.46+gait*X*.3,.1],.17,'#3d4c55');
prism([[kx-X*.17,ky-.1],[kx+X*.15,ky-.13],[fx+X*.2,.49],[fx-X*.12,.36]],.06,.4,'#909da4');
rod([kx,ky-.1,.4],[fx,.51+gait*X*.3,.38],.065,'#c0c7c6');
// knee actuators and flexible exposed piston rods
rod([X*.62,1.65,-.21],[kx,ky+.05,-.19],.085,'#26343d');rod([X*.62,1.65,-.21],[kx,ky+.05,-.19],.035,'#c3c9c7');
for(let j=0;j<4;j++)box(fx, .65+j*.115,.47,.21,.045,.045,j%2?'#2b3942':'#8b999f');
// tread feet: sloping armored drive casing and segmented tracks
let fy=.26+gait*X*.28;box(fx,fy,.38,.54,.32,.94,'#252e36');box(fx,fy+.18,.28,.5,.13,.75,'#63727c');rod([fx,fy+.12,-.13],[fx,fy+.2,.65],.055,'#b5a59c');
for(let j=0;j<10;j++){let zz=-.08+j*.104;box(fx,fy-.14,zz,.58,.08,.091,j%2?'#39464f':'#55636b');box(fx,fy-.19,zz,.47,.025,.072,'#1c2730')}
for(let zz of [-.04,.72]){cyl(fx,fy-.04,zz,.17,.48,'#2b353d','x',12);cyl(fx+X*.29,fy-.04,zz,.10,.025,'#9aa7a9','x',12)}
}
// Pink Wars detailed secondary armor, piston cylinders, cable conduits
for(let side of [-1,1]){
 let x=side;
 // layered scapular plating and joint bolts
 prism([[x*.75,3.47],[x*1.02,3.54],[x*1.25,3.35],[x*1.15,3.08],[x*.82,3.13]],.56,.66,'#7d8a91');
 for(let j=0;j<9;j++){let a=j*Math.PI*2/9;rod([x*1.18,3.22+Math.sin(a)*.33,Math.cos(a)*.33],[x*1.20,3.22+Math.sin(a)*.33,Math.cos(a)*.33],.018,'#c0a99c',6)}
 rod([x*.65,2.88,-.24],[x*1.22,2.64,-.04],.075,'#161e28');
 rod([x*.67,2.88,-.24],[x*1.22,2.64,-.04],.034,'#b9c0c2');
 // armored calf panels and knee-side gear
 prism([[x*.71,1.1],[x*1.03,1.13],[x*1.15,.82],[x*.98,.56],[x*.82,.67]],.39,.51,'#77878f');
 for(let j=0;j<5;j++)box(x*.9,.74+j*.07,.53,.18,.022,.025,'#26333c');
 // tread side rollers
 for(let j=0;j<4;j++)cyl(x*.9,.18,.08+j*.19,.085,.53,'#39434b','x',12);
 // rear utility canisters
 cyl(x*.59,2.86,-.45,.13,.36,'#333c46','y',12);
}
for(let j=0;j<5;j++)box(0,3.19+j*.048,.61,.33,.015,.035,j%2?'#222d38':'#78858b');
// Head, sensor collar, polygonal face
cyl(0,3.56,.02,.24,.27,'#3a4852','y');prism([[-.39,3.75],[.33,3.75],[.47,3.95],[.36,4.25],[.04,4.36],[-.39,4.23],[-.47,4.03]],-.22,.36,'#aeb9bd');
prism([[-.3,3.81],[.31,3.81],[.41,4.02],[.28,4.23],[-.29,4.23],[-.4,4.03]],.37,.47,'#35434e');
prism([[-.14,3.87],[.17,3.87],[.3,4.04],[.15,4.21],[-.15,4.21],[-.28,4.05]],.48,.55,'#1d2d40');
ring(0,4.04,.56,.195,.09,'#182c43');cyl(0,4.04,.64,.12,.04,'#0675da');
for(let side of [-1,1]){box(side*.32,4.15,.38,.14,.095,.09,'#27333e');box(side*.31,3.89,.4,.16,.08,.09,'#69767e');}
// neck hydraulic details, chest fasteners, warning decals
for(let side of [-1,1])for(let j=0;j<3;j++)cyl(side*.56,3.14-j*.18,.612,.022,.026,'#26343d','z',7);
}

 build();
 const palettes=new Map(),materials=[];
 function colorMat(hex){if(!palettes.has(hex)){const c=new T.Color(hex);const m=new T.MeshStandardMaterial({color:c,metalness:.74,roughness:.43,flatShading:true,side:T.DoubleSide});if(hex==='#0675da'){m.emissive=new T.Color(0x0669d8);m.emissiveIntensity=1.9;}palettes.set(hex,m);materials.push(m);}return palettes.get(hex)}
 const batches=new Map();
 const pivots={leftLeg:[-.65,1.9,0],rightLeg:[.65,1.9,0],leftArm:[-1.13,3.12,0],rightArm:[1.13,3.12,0],head:[0,3.62,0]};
 const rig={};for(const [key,p] of Object.entries(pivots)){const group=new T.Group();group.position.set(...p);visual.add(group);rig[key]=group;}
 const stateMaterials=[];
 function pushTri(color,a,b,c,part='body'){const key=part+'|'+color;if(!batches.has(key))batches.set(key,[]);const pivot=pivots[part]||[0,0,0];for(const v of [a,b,c])batches.get(key).push(v[0]-pivot[0],v[1]-pivot[1],v[2]-pivot[2]);}
 const cubeFaces=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]];
 for(const sh of shapes){
 let verts,faces;
 if(sh.mesh){verts=sh.verts;faces=sh.polys;}
 else {const {x,y,z,w,h,d,rx=0,ry=0,rz=0}=sh;const cs=Math.cos(rx),sn=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 // Reproduce the eight-sided chamfered armor used in the approved MK VIII canvas preview.
 const bevel=Math.min(w,h)*.14,hw=w/2,hh=h/2;
 const outline=[[-hw+bevel,-hh],[hw-bevel,-hh],[hw,-hh+bevel],[hw,hh-bevel],[hw-bevel,hh],[-hw+bevel,hh],[-hw,hh-bevel],[-hw,-hh+bevel]];
 verts=[];for(const dz of [-d/2,d/2])for(const [dx,dy] of outline){let yy=dy*cs-dz*sn,zz=dy*sn+dz*cs,xx=dx*cy+zz*sy;zz=-dx*sy+zz*cy;verts.push([xx*cz-yy*sz+x,xx*sz+yy*cz+y,zz+z]);}
 faces=[Array.from({length:8},(_,i)=>7-i),Array.from({length:8},(_,i)=>i+8)];
 for(let i=0;i<8;i++)faces.push([i,(i+1)%8,(i+1)%8+8,i+8]);
 }
 const center=verts.reduce((a,v)=>[a[0]+v[0]/verts.length,a[1]+v[1]/verts.length,a[2]+v[2]/verts.length],[0,0,0]);
 const part=center[1]<1.85?(center[0]<0?'leftLeg':'rightLeg'):center[1]>3.75&&Math.abs(center[0])<.55?'head':Math.abs(center[0])>.99&&center[1]<3.56&&center[1]>2.24?(center[0]<0?'leftArm':'rightArm'):'body';
 for(const face of faces){if(face.length<3)continue;for(let i=1;i<face.length-1;i++)pushTri(sh.col,verts[face[0]],verts[face[i]],verts[face[i+1]],part);}
 }
 const meshes=[];
 for(const [key,coords] of batches){const [part,color]=key.split('|');const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(coords,3));geo.computeVertexNormals();const m=new T.Mesh(geo,colorMat(color));m.castShadow=true;m.receiveShadow=true;(rig[part]||visual).add(m);meshes.push(m);}
 const muzzles=[],pods=[];
 for(const side of [-1,1]){
 for(const dx of [-.13,.13]){const tip=new T.Object3D();tip.position.set(side*1.43+dx,2.39,1.91);visual.add(tip);muzzles.push(tip)}
 for(const row of [-1,1])for(const col of [-1,1]){const tip=new T.Object3D();tip.position.set(side*1.22+col*.19,4.03+row*.16,.56);visual.add(tip);pods.push(tip)}
 }
 const state={health:options.health??850,time:0,dead:false,shotAt:-9};
 const flashMat=new T.MeshBasicMaterial({color:0xffd891,transparent:true,opacity:0,depthWrite:false});materials.push(flashMat);
 const flashes=muzzles.map(tip=>{const flare=new T.Mesh(new T.SphereGeometry(.11,6,4),flashMat);tip.add(flare);meshes.push(flare);return flare});
 const tintMat=new T.MeshBasicMaterial({color:0x59c8ff,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});materials.push(tintMat);
 const eyeLight=new T.PointLight(0x59c8ff,.7,4);eyeLight.position.set(0,4.04,.68);visual.add(eyeLight);
 function update(dt,ctx={}){if(state.dead)return;dt=Math.max(0,Math.min(dt,.08));state.time+=dt;const stride=ctx.moving?Math.sin(state.time*5):0;
 rig.leftLeg.rotation.x=stride*.16;rig.rightLeg.rotation.x=-stride*.16;
 rig.leftArm.rotation.x=-stride*.09;rig.rightArm.rotation.x=stride*.09;
 rig.head.rotation.y=Math.sin(state.time*.85)*.06;
 visual.position.y=ctx.moving?Math.abs(stride)*.035:0;
 const phase=ctx.awareness||'patrol',color=phase==='engaged'?0xff3e65:phase==='search'?0xffba39:0x39c9ff;
 eyeLight.color.setHex(color);for(const material of materials){if(material.emissive&&material.emissiveIntensity>1.5)material.emissive.setHex(color);}
 if(ctx.shotAt!==undefined&&ctx.shotAt>state.shotAt){state.shotAt=ctx.shotAt;flashMat.opacity=1;}
 flashMat.opacity=Math.max(0,flashMat.opacity-dt*7);
 }
 function damage(n){state.health-=Math.max(0,n);if(state.health<=0){state.dead=true;options.onDestroyed?.(root.position.clone())}return state.health}
 function dispose(){scene.remove(root);for(const m of meshes)m.geometry.dispose();for(const m of materials)m.dispose()}
 return {root,state,update,damage,dispose,muzzles,pods};
}