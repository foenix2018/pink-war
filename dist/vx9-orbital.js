// PINK WAR — VX-9 ORBITAL DEFENSE V5
// Reuses the exact polygon geometry of the validated standalone VX-9 V5.
// Local vertex data, no remote dependencies. Original game shooting retained.
import * as THREE from './vendor/three.webgpu.min.js';
let sharedPrototype;
function buildPrototype() {
const color=(n,a=1)=>[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,a];
const mat={armor:color(0x45515e),steel:color(0x333e4b),dark:color(0x252e3a),black:color(0x0b1119),poly:color(0x141a23),edge:color(0x354554),light:color(0x59dfff),paper:color(0xa7b9c8),cyan:color(0x31b6d5),glass:[.25,.72,.85,.14],lens:[.04,.2,.27,.31],chrome:color(0x6a7884),mid:color(0x384653),shade:color(0x171f29),etch:color(0x53626c)};
const objects={static:[],glass:[],led:[],reticle:[],shot:[]};
function mesh(name){return objects[name]}
function tri(dst,a,b,c,col,norm=null,glow=0){
 if(!norm){const u=sub(b,a),v=sub(c,a);norm=normal(cross(u,v));}
 for(const p of [a,b,c])dst.push(p[0],p[1],p[2],norm[0],norm[1],norm[2],col[0],col[1],col[2],glow,col[3]);
}
function quad(dst,a,b,c,d,col,norm=null,glow=0){tri(dst,a,b,c,col,norm,glow);tri(dst,a,c,d,col,norm,glow)}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function normal(v){const k=Math.hypot(...v)||1;return v.map(x=>x/k)}
function addShape(points,z0,z1,col,front=col,dst=mesh('static')){
 // points ordered as (x,y), extruded with actual side walls and planar cap
 const n=points.length,mid=points.reduce((t,p)=>[t[0]+p[0]/n,t[1]+p[1]/n],[0,0]);
 // front inset edge produces a distinct machined bevel
 const bevel=.009;
 const f=points.map(p=>[p[0]+(mid[0]-p[0])*bevel,p[1]+(mid[1]-p[1])*bevel,z1]);
 const r=points.map(p=>[p[0],p[1],z0]);
 const lip=points.map(p=>[p[0],p[1],z1-.014]);
 const ear=(poly)=>{ // ear-clipping for concave polygons
   const ids=Array.from({length:n},(_,i)=>i);const faces=[];
   const A=points.reduce((a,p,i)=>{const q=points[(i+1)%n];return a+p[0]*q[1]-q[0]*p[1]},0);
   const orientation=A>0?1:-1;
   let iteration=0;
   while(ids.length>3&&iteration++<n*n){let found=false;
     for(let k=0;k<ids.length;k++){const prev=ids[(k+ids.length-1)%ids.length],curr=ids[k],next=ids[(k+1)%ids.length];
       const a=points[prev],b=points[curr],c=points[next];const area=((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*orientation;
       if(area<=1e-7)continue;
       let inside=false;
       for(const other of ids){if(other===prev||other===curr||other===next)continue;
         const p=points[other];const s1=((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))*orientation;
         const s2=((c[0]-b[0])*(p[1]-b[1])-(c[1]-b[1])*(p[0]-b[0]))*orientation;
         const s3=((a[0]-c[0])*(p[1]-c[1])-(a[1]-c[1])*(p[0]-c[0]))*orientation;
         if(s1>0&&s2>0&&s3>0){inside=true;break}
       }
       if(!inside){faces.push([prev,curr,next]);ids.splice(k,1);found=true;break}
     }
     if(!found)break;
   }
   if(ids.length===3)faces.push(ids);
   if(!faces.length){for(let i=1;i<n-1;i++)faces.push([0,i,i+1])}
   return faces;
 };
 for(const [a,b,c] of ear()){
   tri(dst,f[a],f[b],f[c],front,[0,0,1]);tri(dst,r[c],r[b],r[a],col,[0,0,-1]);
 }
 for(let i=0;i<n;i++){const j=(i+1)%n;quad(dst,r[i],r[j],lip[j],lip[i],col);quad(dst,lip[i],lip[j],f[j],f[i],mat.edge)}
}
function box(x,y,z,w,h,d,col,dst=mesh('static')){addShape([[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]],z-d/2,z+d/2,col,col,dst)}
function profile(points,z,d,col,front=col,dst=mesh('static')){addShape(points,z-d/2,z+d/2,col,front,dst)}
function rod(a,b,r,col,dst=mesh('static'),segments=10,glow=0){const axis=normal(sub(b,a)),hint=Math.abs(axis[2])>.97?[0,1,0]:[0,0,1],u=normal(cross(axis,hint)),v=normal(cross(axis,u));
 const ring=(p,t)=>[p[0]+r*(u[0]*Math.cos(t)+v[0]*Math.sin(t)),p[1]+r*(u[1]*Math.cos(t)+v[1]*Math.sin(t)),p[2]+r*(u[2]*Math.cos(t)+v[2]*Math.sin(t))];
 for(let i=0;i<segments;i++){const t=i*2*Math.PI/segments,t2=(i+1)*2*Math.PI/segments;quad(dst,ring(a,t),ring(a,t2),ring(b,t2),ring(b,t),col,null,glow)}
}
function ringXY(x,y,z,r0,r1,col,dst=mesh('static'),segments=32,glow=0){for(let i=0;i<segments;i++){const t=i/segments*2*Math.PI,t2=(i+1)/segments*2*Math.PI;const p=(r,t)=>[x+r*Math.cos(t),y+r*Math.sin(t),z];quad(dst,p(r0,t),p(r0,t2),p(r1,t2),p(r1,t),col,[0,0,1],glow)}}
function cylinderX(x0,x1,y,z,r,col,dst=mesh('static'),segments=24){
 for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;const p=(x,t)=>[x,y+Math.cos(t)*r,z+Math.sin(t)*r];quad(dst,p(x0,a),p(x1,a),p(x1,b),p(x0,b),col);tri(dst,[x0,y,z],p(x0,b),p(x0,a),col);tri(dst,[x1,y,z],p(x1,a),p(x1,b),col)}
}
function cylinderRingX(x,y,z,rOuter,rInner,depth,color0){
 const n=32,x0=x-depth/2,x1=x+depth/2;
 for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;const p=(r,t,x)=>[x,y+r*Math.cos(t),z+r*Math.sin(t)];quad(mesh('static'),p(rOuter,a,x0),p(rOuter,b,x0),p(rOuter,b,x1),p(rOuter,a,x1),color0);quad(mesh('static'),p(rInner,b,x0),p(rInner,a,x0),p(rInner,a,x1),p(rInner,b,x1),mat.black);quad(mesh('static'),p(rInner,a,x0),p(rInner,b,x0),p(rOuter,b,x0),p(rOuter,a,x0),mat.steel)}
}
// VX-9 ORBITAL / V5. Refabrication du concept : canon massif, culasse profilée,
// vrai pontet ajouré, poignée anatomique, rainures et lunette dans l'axe du tir.
// Convention: le canon pointe vers -X, l'axe de visée est donc X, jamais Z.
function plate(points,z,depth,base,face=base,dst=mesh('static')){return profile(points,z,depth,base,face,dst)}
function segmentOutline(points,z,c=mat.etch,r=.006){for(let j=0;j<points.length;j++){
 const a=points[j],b=points[(j+1)%points.length];rod([a[0],a[1],z],[b[0],b[1],z],r,c,mesh('static'),7)
}}
function ringYZ(x,y,z,rout,rin,c,dst=mesh('reticle'),segments=40,glow=1){
 for(let i=0;i<segments;i++){
 const t=i*2*Math.PI/segments,u=(i+1)*2*Math.PI/segments;
 const p=(r,a)=>[x,y+r*Math.cos(a),z+r*Math.sin(a)];
 quad(dst,p(rout,t),p(rout,u),p(rin,u),p(rin,t),c,[1,0,0],glow);
 }
}
function paneYZ(x,y,z,hy,hz,color0){
 quad(mesh('glass'),[x,y-hy,z-hz],[x,y+hy,z-hz],[x,y+hy,z+hz],[x,y-hy,z+hz],color0,[1,0,0]);
}
function pairedPanels(points,z,depth,color0,face=color0){plate(points,z,depth,color0,face);plate(points,-z,depth,color0,face)}
const upper=[[-1.13,.14],[-1.055,.345],[-.93,.405],[-.51,.425],[.19,.433],[.79,.405],[.97,.335],[1.055,.21],[1.01,.103],[-1.04,.098]];
const receiver=[[-1.11,.092],[-.965,.100],[.89,.083],[1.045,-.06],[1.03,-.269],[.88,-.336],[.57,-.365],[.40,-.275],[.05,-.27],[-.19,-.37],[-.85,-.365],[-1.12,-.265]];
const lower=[[-1.1,-.11],[-.91,-.29],[-.61,-.39],[-.18,-.365],[.25,-.28],[.68,-.31],[.96,-.26],[1.02,-.14],[-.98,-.115]];
// A dark carbon/metal core with stepped full-length slide, not two featureless blocks.
plate(receiver,0,.356,mat.dark,mat.armor);
plate(lower,0,.337,mat.black,mat.dark);
plate(upper,0,.412,mat.steel,mat.armor);
plate([[-1.04,.32],[-.9,.398],[.29,.421],[.72,.4],[.89,.336],[-.93,.34]],.002,.420,mat.chrome,mat.armor);
// Anodized slide side with polished machined outline and dark lower chassis.
for(const s of [-1,1]){
 const z=s*.217;
 const side=[[-.94,.106],[-.85,.343],[.23,.365],[.43,.290],[.45,.145],[-.13,.124],[-.34,.068],[-.87,.073]];
 plate(side,s*.218,.022,mat.edge,mat.mid);
 segmentOutline(side,s*.233,mat.chrome,.003);
 const foreplate=[[-.91,.083],[-.79,-.01],[-.49,-.027],[-.18,.035],[-.16,-.108],[-.56,-.245],[-.90,-.234],[-1.05,-.146]];
 plate(foreplate,s*.217,.022,mat.black,mat.shade);
 segmentOutline(foreplate,s*.232,mat.edge,.005);
 const rear=[ [.43,.135],[.77,.178],[.96,.105],[.99,-.085],[.75,-.191],[.47,-.112] ];
 plate(rear,s*.220,.022,mat.mid,mat.dark);
 // Panel ahead of ejection port.
 plate([[-.49,.085],[.14,.085],[.20,.02],[.06,-.029],[-.51,-.027]],s*.233,.015,mat.black,mat.shade);
}
// Deep recessed ventilation slots follow angled lines of original artwork.
for(const s of [-1,1]){
 const z=s*.241;
 for(let i=0;i<3;i++){
   const x=-.83+i*.17;
   const slot=[[x,.198],[x+.079,.198],[x+.13,.305],[x+.066,.327],[x-.022,.273]];
   plate(slot,z,.010,mat.black,mat.black);
   segmentOutline(slot,z+s*.007,mat.chrome,.0035);
 }
 // Rear serrations: authentic steep grooves instead of panel-like squares.
 for(let i=0;i<5;i++){
  const x=.72+i*.05;
  const strip=[[x,.157],[x+.024,.157],[x+.070,.319],[x+.045,.319]];
  plate(strip,z,.011,mat.black,mat.shade);
  rod([x+.045,.322,z+s*.009],[x+.004,.158,z+s*.009],.004,mat.steel);
 }
}
// Upper longitudinal sight rail, with a few raised machined ridges.
plate([[-.99,.43],[.92,.43],[.95,.463],[-.98,.463]],0,.23,mat.black,mat.dark);
for(let i=0;i<20;i++){
 const x=-.90+i*.084;box(x,.471,0,.037,.014,.238,mat.mid);
}
// Muzzle: recessed dark bore, three metallic nested collars, lower front sensor port.
cylinderX(-1.30,-1.102,.175,0,.166,mat.mid);
cylinderRingX(-1.29,.175,0,.157,.097,.057,mat.chrome);
cylinderRingX(-1.315,.175,0,.103,.071,.021,mat.shade);
cylinderX(-1.338,-1.334,.175,0,.071,mat.black);
for(let i=0;i<3;i++){
 const x=-1.205+i*.034;cylinderRingX(x,.175,0,.169,.156,.011,mat.steel);
}
// Octagonal muzzle-front housing and real lower cutouts.
plate([[-1.32,.02],[-1.13,.06],[-1.095,-.03],[-1.107,-.34],[-1.27,-.35],[-1.34,-.25]],0,.34,mat.mid,mat.dark);
for(let j=0;j<2;j++)cylinderRingX(-1.32,-.11-j*.16,0,.059,.036,.020,mat.chrome);
// Underbarrel 3D accessory rail, tapered with stepped teeth.
plate([[-1.155,-.285],[-.94,-.34],[-.36,-.365],[-.26,-.48],[-1.075,-.465]],0,.35,mat.dark,mat.mid);
for(let i=0;i<8;i++){const x=-1.05+i*.095;box(x,-.488,0,.036,.025,.37,mat.shade)}
for(let s of [-1,1]){
 plate([[-1.08,-.335],[-.40,-.350],[-.33,-.402],[-1.04,-.396]],s*.195,.017,mat.edge,mat.black);
 plate([[-.94,-.36],[-.58,-.36],[-.55,-.335],[-.91,-.335]],s*.219,.014,mat.cyan,mat.light,mesh('led'));
}
// Lower receiver with raised fire-control parts and dual sculpted panels.
for(let s of [-1,1]){
 const z=s*.197;
 const midLower=[[-.16,-.237],[.27,-.25],[.37,-.349],[.65,-.362],[.89,-.247],[1.005,-.27],[.91,-.425],[.60,-.468],[.42,-.431],[.20,-.35],[-.06,-.34]];
 plate(midLower,z,.022,mat.shade,mat.dark);
 segmentOutline(midLower,z+s*.016,mat.edge,.004);
 const control=[[-.03,-.105],[.20,-.10],[.29,-.173],[.18,-.240],[.02,-.238]];
 plate(control,z+s*.015,.017,mat.mid,mat.black);
 for(const [x,y,r] of [[-.76,-.166,.031],[.12,-.34,.043],[.52,-.259,.035],[.87,.251,.026]]){
  ringXY(x,y,z+s*.035,r,r*.66,mat.chrome,mesh('static'),24);
  ringXY(x,y,z+s*.039,r*.43,r*.20,mat.black,mesh('static'),24);
 }
 // Charging control / slide catch
 plate([[.25,-.150],[.58,-.140],[.63,-.175],[.59,-.23],[.28,-.231]],z+s*.044,.018,mat.black,mat.mid);
 for(let i=0;i<5;i++)box(.31+i*.038,-.191,z+s*.058,.021,.025,.014,mat.chrome);
}
// True open, chamfered trigger guard. Curved sections made of short radial rods.
const guard=[[-.24,-.404],[-.16,-.482],[-.10,-.595],[.04,-.727],[.42,-.739],[.54,-.661],[.565,-.505],[.61,-.43]];
for(let i=0;i<guard.length-1;i++){
 const a=guard[i],b=guard[i+1];rod([a[0],a[1],0],[b[0],b[1],0],.031,mat.steel);
}
rod([-.25,-.405,0],[.62,-.425,0],.023,mat.mid);
rod([.13,-.44,0],[.17,-.58,0],.022,mat.black);
rod([.17,-.58,0],[.10,-.63,0],.018,mat.chrome);
// Anatomical hand grip, correctly attached to upper receiver, with front finger groove.
const gripMain=[[.65,-.335],[.93,-.355],[1.085,-.441],[1.157,-.568],[1.31,-.97],[1.42,-1.39],[1.305,-1.54],[.91,-1.54],[.742,-1.298],[.628,-.852],[.586,-.592]];
const gripSide=[[.72,-.547],[1.02,-.545],[1.105,-.631],[1.32,-1.37],[1.24,-1.442],[.954,-1.43],[.793,-1.204],[.667,-.847]];
plate(gripMain,0,.383,mat.black,mat.poly);
for(const s of [-1,1]){
 plate(gripSide,s*.208,.025,mat.edge,mat.black);
 segmentOutline(gripSide,s*.227,mat.mid,.007);
 // polymer palm swell + raised thumb recess
 plate([[.87,-.57],[1.04,-.61],[1.255,-1.30],[1.17,-1.379],[.969,-1.358],[.827,-1.15],[.724,-.804]],s*.227,.010,mat.poly,mat.black);
 // Overmolded hexagonal grip stippling applied ON the sloped plate.
 for(let row=0;row<10;row++)for(let col=0;col<4;col++){
  const y=-.77-row*.057;
  const xf=.785+.026*row+col*.059+(row%2)*.023;
  const maxX=1.20+.018*row;
  if(xf>maxX||y<-1.36)continue;
  ringXY(xf,y,s*.239,.013,.009,mat.shade,mesh('static'),6);
 }
 // Molded grip seam and metallic attachment near trigger guard.
 rod([.69,-.51,s*.231],[.885,-.55,s*.231],.008,mat.mid);
}
// Contoured magazine heel; avoids the old flat protruding block.
plate([[.897,-1.516],[1.307,-1.516],[1.448,-1.59],[1.406,-1.648],[.936,-1.643],[.853,-1.582]],0,.43,mat.steel,mat.dark);
plate([[.948,-1.573],[1.39,-1.587],[1.416,-1.624],[.934,-1.616]],.23,.019,mat.black,mat.mid);
// Barrel-side service hatch and stacked alloy overlays.
for(const s of [-1,1]){
 plate([[-.34,-.187],[.07,-.188],[.18,-.235],[.11,-.285],[-.35,-.288]],s*.231,.014,mat.black,mat.dark);
 plate([[.54,-.12],[.79,-.08],[.93,-.155],[.90,-.21],[.59,-.208]],s*.248,.015,mat.shade,mat.mid);
 // Engraved cyan coolant channels.
 plate([[-.97,-.404],[-.66,-.404],[-.623,-.374],[-.95,-.37]],s*.241,.009,mat.light,mat.cyan,mesh('led'));
 plate([[.19,-.030],[.53,-.030],[.60,.0],[.21,.009]],s*.247,.009,mat.cyan,mat.light,mesh('led'));
 plate([[.68,.43],[.85,.43],[.85,.460],[.70,.460]],s*.234,.008,mat.cyan,mat.light,mesh('led'));
 box(-1.19,-.376,s*.225,.047,.024,.015,mat.light,mesh('led'));
}
// Delicate etched scratches, shallow machined streaks for metal wear (fixed seed).
let seed=20938;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
for(let i=0;i<115;i++){
 const x=-.91+rand()*1.76,y=.14+rand()*.21,z=(i%2?1:-1)*.254;
 const len=.012+rand()*.065;
 rod([x,y,z],[x+len,y+(rand()-.5)*.008,z],.001,mat.etch,mesh('static'),5);
}
// Tiny VX-9 marking drawn as mechanical incision lines in side receiver.
const G={V:[[0,0],[.035,-.070],[.07,0]],X:[[0,0],[.06,-.068],[.03,-.034],[.06,0],[0,-.068]],'-':[[0,-.034],[.06,-.034]],'9':[[.01,-.042],[.058,-.042],[.065,0],[.01,0],[0,-.019],[.065,-.065],[.03,-.071]]};
for(const s of [-1,1]){
 let x=-.72;
 for(const ch of 'VX-9'){
  const poly=G[ch];
  for(let j=0;j<poly.length-1;j++){
   const a=poly[j],b=poly[j+1];rod([x+a[0],-.115+a[1],s*.250],[x+b[0],-.115+b[1],s*.250],.003,mat.paper,mesh('static'),6);
  }
  x+=.085;
 }
}
// --------------------------------------------------------------- OPTIQUE
// !!! Le plan du verre est YZ. Le canon étant orienté -X, l'oculaire regarde
// vers +X. Le réticule flotte devant l'œil, sans se coller au flanc de l'arme.
// Socle bas intégral + queue d'aronde fixée sur la culasse.
plate([[.24,.433],[.92,.430],[.95,.517],[.22,.515]],0,.27,mat.dark,mat.mid);
plate([[.34,.514],[.88,.514],[.86,.565],[.33,.565]],0,.23,mat.shade,mat.black);
for(let i=0;i<5;i++)box(.36+i*.10,.566,0,.045,.015,.23,mat.chrome);
// Structure ouverte en U: deux branches latérales de chaque côté de la vitre
// et deux longerons x de maintient, sans panneau plein devant le verre.
for(const s of [-1,1]){
  // side plates along x, seen from profile as mechanical legs on the sight
  const z=s*.175;
  plate([[.27,.54],[.305,.934],[.41,1.09],[.60,1.114],[.85,1.061],[.909,.928],[.916,.55],[.785,.55],[.77,.917],[.679,1.00],[.473,1.00],[.407,.933],[.392,.55]],z,.033,mat.chrome,mat.dark);
  // ribbed support, side details
  plate([[.36,.605],[.46,.609],[.49,.855],[.425,.97],[.367,.946]],s*.195,.012,mat.black,mat.shade);
  plate([[.81,.617],[.889,.611],[.894,.902],[.85,.973],[.808,.948]],s*.195,.010,mat.black,mat.shade);
  ringXY(.80,.605,s*.215,.042,.025,mat.steel,mesh('static'),20);
  ringXY(.80,.605,s*.223,.020,.009,mat.black,mesh('static'),20);
  // slender cyan line inset along upper electronics mount
  rod([.723,.582,s*.198],[.89,.582,s*.198],.006,mat.light,mesh('led'),8,1);
}
// U bezel across top, across z; correct optic 3D actual cross-sectional frame.
for(const x of [.445,.793]){
  box(x,1.089,0,.062,.060,.371,mat.chrome);
  box(x,.615,0,.057,.052,.367,mat.shade);
  for(const s of [-1,1]){
    box(x,.851,s*.177,.062,.468,.063,mat.mid);
  }
}
// Front lens and rear glass are parallel planes perpendicular to the bore.
paneYZ(.586,.851,0,.187,.133,mat.glass);
// Smoky rim tint around transparent glass (not a filled opaque face)
for(const xx of [.578,.599]){
 for(const side of [-1,1])rod([xx,.676,side*.151],[xx,1.02,side*.151],.009,mat.cyan,mesh('glass'),9);
 rod([xx,1.015,-.147],[xx,1.015,.147],.009,mat.glass,mesh('glass'),9);
}
// Cyan holographic dot and fine crosshair, coplanar with the transparent viewport.
ringYZ(.635,.856,0,.056,.048,mat.light,mesh('reticle'),48,1);
ringYZ(.637,.856,0,.013,.004,mat.paper,mesh('reticle'),28,1);
for(const s of [-1,1]){
 rod([.64,.856,s*.071],[.64,.856,s*.110],.004,mat.light,mesh('reticle'),9,1);
 rod([.64,.856+s*.071,0],[.64,.856+s*.123,0],.004,mat.light,mesh('reticle'),9,1);
}
// Small projected optic bead at center
rod([.638,.847,0],[.638,.865,0],.003,mat.light,mesh('reticle'),8,1);
// Cylindrical dials and knurled electronic adjustment unit.
for(const s of [-1,1]){
 cylinderX(.800,.855,.552,s*.215,.040,mat.steel);
 ringXY(.825,.562,s*.254,.038,.024,mat.black,mesh('static'),20);
}
// Shot effect, no gameplay ballistics: fictional laser and mechanical recoil.
for(let i=0;i<12;i++){
 const a=i*Math.PI*2/12;
 rod([-1.36,.175,0],[-1.52-Math.abs(Math.cos(a))*.16,.175+Math.sin(a)*.14,Math.cos(a)*.13],.011,mat.light,mesh('shot'),6,1);
}
rod([-1.36,.175,0],[-3.6,.175,0],.008,mat.light,mesh('shot'),8,1);

  const gun=new THREE.Group();
  gun.name='VX-9 Orbital Defense / Pistolet V5';
  const orientation=new THREE.Group();
  orientation.rotation.y=-Math.PI/2;
  orientation.scale.setScalar(.142);
  gun.add(orientation);
  const palm=new THREE.Group();
  palm.position.set(-.98,.70,0);
  orientation.add(palm);
  const materials={
    static:new THREE.MeshStandardMaterial({vertexColors:true,metalness:.67,roughness:.42,side:THREE.DoubleSide}),
    glass:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),
    led:new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}),
    reticle:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.97,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false})
  };
  let drawCalls=0;
  for(const name of ['static','glass','led','reticle']){
    const source=objects[name];
    if(!source.length)continue;
    const count=source.length/11,pos=new Float32Array(count*3),norm=new Float32Array(count*3),col=new Float32Array(count*3),rgb=new THREE.Color();
    for(let i=0;i<count;i++){
      const j=i*11,k=i*3;
      pos[k]=source[j];pos[k+1]=source[j+1];pos[k+2]=source[j+2];
      norm[k]=source[j+3];norm[k+1]=source[j+4];norm[k+2]=source[j+5];
      rgb.setRGB(source[j+6],source[j+7],source[j+8],THREE.SRGBColorSpace);
      col[k]=rgb.r;col[k+1]=rgb.g;col[k+2]=rgb.b;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(norm,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(col,3));
    geometry.computeBoundingSphere();
    const part=new THREE.Mesh(geometry,materials[name]);
    part.name='VX-9 / '+name;part.castShadow=false;part.receiveShadow=false;
    part.renderOrder=name==='reticle'?7:name==='glass'?5:name==='led'?4:0;
    palm.add(part);drawCalls++;
  }
  // The sight axis passes through the reticle's centre bead, measured on this model.
  gun.updateMatrixWorld(true);const sight=palm.localToWorld(new THREE.Vector3(.637,.856,0));
  Object.assign(gun.userData,{
    authored:true,authoredOptic:true,integratedEmitter:true,ownReticle:true,
    optic:{y:+sight.y.toFixed(4),z:+sight.z.toFixed(4),radius:+(.151*.142).toFixed(4)},
    muzzle:[0,.124,-.329],modelName:'VX-9 Orbital Defense',
    sourceVersion:'VX-9 ORBITAL V5',optimizedDrawCalls:drawCalls
  });
  return gun;
}
export function createVX9Orbital(){
  sharedPrototype ||= buildPrototype();
  return sharedPrototype.clone(true);
}
