// THORN V8 — exact geometry transferred from approved HTML visualizer.
// WebGPU-compatible Three.js meshes, shared immutable geometry, no remote imports.
import * as THREE from './vendor/three.webgpu.min.js';
let prototype;
function build(){
const color=(n,a=1)=>[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,a];
const mat={armor:color(0x59636e),steel:color(0x46515d),dark:color(0x303943),black:color(0x111820),poly:color(0x222a33),edge:color(0x72808b),light:color(0x59dfff),paper:color(0xa7b9c8),cyan:color(0x31b6d5),glass:[.25,.72,.85,.14],lens:[.04,.2,.27,.31],chrome:color(0x9aa8b4),mid:color(0x52616e),shade:color(0x232c35),etch:color(0x8a98a2)};
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
// THORN / Pink Wars — sci-fi rail cannon based on the concept artwork.
// X axis: muzzle left (-X); transparent sight plane YZ, perpendicular to rail.
function plate(points,z,depth,base,face=base,dst=mesh('static')){return profile(points,z,depth,base,face,dst)}
function ringYZ(x,y,z,ro,ri,c,dst=mesh('reticle'),n=40,glow=1){for(let i=0;i<n;i++){let a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;const p=(r,t)=>[x,y+r*Math.cos(t),z+r*Math.sin(t)];quad(dst,p(ro,a),p(ro,b),p(ri,b),p(ri,a),c,[1,0,0],glow)}}
function paneYZ(x,y,z,hy,hz,c){quad(mesh('glass'),[x,y-hy,z-hz],[x,y+hy,z-hz],[x,y+hy,z+hz],[x,y-hy,z+hz],c,[1,0,0])}
function line(a,b,r=.008,c=mat.edge,dst=mesh('static')){rod(a,b,r,c,dst,7)}
function outline(points,z,c=mat.chrome,r=.005){for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length];line([a[0],a[1],z],[b[0],b[1],z],r,c)}}
// Main monolithic receiver and tapered extended electromagnetic barrel shroud.
plate([[-2.42,.22],[-2.34,.41],[-1.30,.47],[-.66,.51],[.30,.50],[.50,.36],[.51,-.07],[.32,-.31],[-.57,-.33],[-1.27,-.27],[-2.40,-.22]],0,.43,mat.black,mat.steel);
plate([[-2.35,.24],[-2.23,.43],[-1.32,.46],[-.71,.49],[-.65,.30],[-.67,-.13],[-1.34,-.18],[-2.37,-.13]],0,.49,mat.dark,mat.armor);
// Silver top edge and underbarrel heavy black rail.
plate([[-2.38,.39],[-2.31,.49],[-1.31,.52],[-.65,.54],[.26,.52],[.33,.47],[-1.3,.47]],0,.51,mat.steel,mat.chrome);
plate([[-2.38,-.14],[-1.18,-.20],[-.52,-.24],[-.36,-.31],[-1.28,-.37],[-2.37,-.30]],0,.38,mat.black,mat.dark);
// Rear housing and mechanical folding stock.
plate([[.30,.32],[.58,.42],[.83,.40],[.89,.22],[.80,-.10],[.52,-.17],[.31,-.09]],0,.37,mat.black,mat.mid);
for(let z of [-.15,.15]){line([.75,.25,z],[1.33,.28,z],.036,mat.chrome);line([.75,-.05,z],[1.30,-.16,z],.028,mat.edge);line([1.3,-.16,z],[1.33,.28,z],.03,mat.dark)}
box(1.35,.055,0,.16,.62,.49,mat.black);box(1.40,.06,0,.10,.59,.44,mat.mid);
for(let z of [-.24,.24]){box(1.41,.05,z,.08,.45,.012,mat.edge)}
// Side armored plates, bevels, vent cutouts, coils and illuminated energy spine.
for(let sign of [-1,1]){
 const z=sign*.258;
 plate([[-2.26,.31],[-1.42,.37],[-.93,.38],[-.74,.27],[-.74,-.04],[-1.27,-.13],[-2.29,-.09]],z,.021,mat.steel,mat.mid);
 plate([[-.58,.37],[.20,.35],[.38,.24],[.36,-.12],[.10,-.23],[-.48,-.17]],z,.025,mat.black,mat.dark);
 outline([[-.58,.37],[.20,.35],[.38,.24],[.36,-.12],[.10,-.23],[-.48,-.17]],z+sign*.018,mat.chrome,.003);
 plate([[-2.30,.19],[-1.41,.23],[-1.39,.07],[-2.30,.045]],z+sign*.016,.014,mat.black,mat.black);
 for(let i=0;i<8;i++){
  let x=-2.27+i*.111;
  plate([[x,.40],[x+.062,.40],[x+.035,.305],[x-.02,.305]],z+sign*.028,.01,mat.black,mat.black);
 }
 plate([[-2.18,.028],[-1.34,.045],[-1.34,-.012],[-2.18,-.048]],z+sign*.036,.008,mat.cyan,mat.light,mesh('led'));
 plate([[-.42,.26],[-.14,.26],[-.08,.19],[-.42,.18]],z+sign*.025,.008,mat.cyan,mat.light,mesh('led'));
 for(let i=0;i<5;i++){
  let x=-1.22+i*.105;
  line([x,-.26,z+sign*.025],[x+.025,-.34,z+sign*.025],.009,mat.edge);
 }
 for(let x of [-.49,.12,.31])ringXY(x,.025,z+sign*.04,.020,.010,mat.chrome,mesh('static'),14);
}
// Exposed dual rail cores, internal luminous energy tube.
for(let z of [-.12,.12]){
 line([-2.43,.12,z],[-1.27,.12,z],.038,mat.chrome);
 line([-2.40,.12,z],[-1.27,.12,z],.019,mat.light,mesh('led'));
}
line([-2.47,.12,0],[-1.22,.12,0],.061,mat.black);
line([-2.43,.12,0],[-1.20,.12,0],.026,mat.light,mesh('led'));
// Faceted rail emitter head and aperture.
plate([[-2.54,.27],[-2.40,.34],[-2.31,.26],[-2.31,-.12],[-2.42,-.21],[-2.55,-.11]],0,.54,mat.black,mat.mid);
cylinderX(-2.62,-2.48,.105,0,.145,mat.black);cylinderRingX(-2.63,.105,0,.147,.082,.09,mat.chrome);
cylinderX(-2.635,-2.632,.105,0,.070,mat.light,mesh('led'),24);
// Upper segmented Picatinny-inspired fictional rail.
box(-.77,.565,0,3.45,.075,.38,mat.black);
for(let i=0;i<24;i++)box(-2.43+i*.14,.61,0,.08,.026,.40,i%3?mat.edge:mat.chrome);
// V7 — layered upper chassis: no flat monolithic roof. Structural ribs, recessed vent wells,
// longitudinal split rails and staggered machined covers reproduce the reference's complex silhouette.
for(const sign of [-1,1]){
 const z=sign*.205;
 // inset continuous upper channel and raised angular shoulder plates
 plate([[-2.40,.44],[-2.28,.56],[-1.75,.565],[-1.63,.52],[-1.23,.53],[-1.12,.60],[-.71,.60],[-.59,.54],[-.22,.53],[-.12,.45]],z,.023,mat.black,mat.mid);
 plate([[-2.35,.49],[-2.20,.56],[-1.88,.565],[-1.81,.51],[-2.08,.48]],z+sign*.017,.011,mat.dark,mat.steel);
 plate([[-1.69,.54],[-1.55,.61],[-1.26,.61],[-1.15,.54]],z+sign*.016,.014,mat.black,mat.chrome);
 plate([[-1.02,.55],[-.88,.64],[-.53,.63],[-.44,.55]],z+sign*.014,.015,mat.black,mat.steel);
 // Vent slots: recessed cavities plus bright lower inner edges, not painted solid stripes.
 for(let i=0;i<9;i++){
   const x=-2.26+i*.145;
   plate([[x,.507],[x+.095,.512],[x+.071,.552],[x-.018,.548]],z+sign*.036,.008,mat.black,mat.black);
   line([x+.006,.514,z+sign*.043],[x+.071,.517,z+sign*.043],.0035,mat.chrome);
 }
 // stepped longitudinal armor, exposing the glowing coil below the upper shroud
 plate([[-2.30,.29],[-1.29,.33],[-1.22,.265],[-2.26,.235]],z+sign*.046,.015,mat.dark,mat.mid);
 for(let i=0;i<12;i++){
   const x=-2.23+i*.079;
   line([x,.225,z+sign*.057],[x+.05,.225,z+sign*.057],.004,mat.light,mesh('led'));
 }
 // Floating forward muzzle shroud with individually machined cross braces
 for(let i=0;i<6;i++){
   const x=-2.32+i*.19;
   line([x,.43,z+sign*.035],[x+.06,.31,z+sign*.062],.013,mat.chrome);
 }
 // upper metal edge highlights and small screw heads
 line([-2.34,.566,z+sign*.026],[-1.16,.615,z+sign*.026],.004,mat.chrome);
 for(let i=0;i<8;i++)ringXY(-2.18+i*.22,.482,z+sign*.059,.012,.005,mat.chrome,mesh('static'),12);
}
// Two distinct top guide rails separated by a shadowed central groove.
for(let z of [-.13,.13]){
 box(-.95,.663,z,2.82,.045,.105,mat.black);
 for(let i=0;i<20;i++)box(-2.28+i*.135,.697,z,.072,.026,.118,i%4===0?mat.chrome:mat.edge);
}
// Heavier rear optic cradle, connected to the receiver rather than floating above it.
for(let z of [-.20,.20]){
 line([-.04,.56,z],[.28,.56,z],.023,mat.chrome);
 line([.02,.58,z],[.02,.70,z],.020,mat.black);
}
// Grip, detailed textured panels and true open trigger guard.
plate([[.23,-.23],[.53,-.23],[.68,-.46],[.72,-1.03],[.49,-1.13],[.28,-1.04],[.17,-.60]],0,.32,mat.black,mat.poly);
for(let sign of [-1,1]){
 let z=sign*.169;
 plate([[.30,-.44],[.57,-.47],[.61,-.96],[.46,-1.04],[.31,-.96]],z,.012,mat.dark,mat.steel);
 for(let i=0;i<11;i++)line([.34,-.49-i*.04,z+sign*.009],[.55,-.50-i*.04,z+sign*.009],.002,mat.edge);
}
// Trigger guard perimeter only, never filled.
line([.17,-.27,.0],[.08,-.57,0],.028,mat.chrome);
line([.08,-.57,0],[-.37,-.57,0],.028,mat.chrome);
line([-.37,-.57,0],[-.43,-.29,0],.028,mat.chrome);
line([-.12,-.27,0],[-.08,-.41,0],.017,mat.black);
// Small rectangular energy magazine.
box(-.38,-.52,0,.31,.52,.28,mat.black);
box(-.38,-.54,.151,.08,.24,.009,mat.light,mesh('led'));
box(-.38,-.54,-.151,.08,.24,.009,mat.light,mesh('led'));
// 3D transparent reflex sight, glass perpendicular to barrel, reticle in sight line.
box(.13,.64,0,.42,.10,.31,mat.black);
for(let z of [-.17,.17]){
 line([-.035,.68,z],[-.04,.99,z],.026,mat.chrome);
 line([.28,.68,z],[.27,.99,z],.026,mat.chrome);
 line([-.04,.99,z],[.27,.99,z],.028,mat.black);
}
line([.03,.99,-.17],[.03,.99,.17],.025,mat.chrome);
line([.27,.99,-.17],[.27,.99,.17],.025,mat.chrome);
paneYZ(.07,.83,0,.125,.145,[.06,.35,.44,.20]);
ringYZ(.065,.83,0,.041,.036,mat.light,mesh('reticle'),32,1);
line([.062,.83,-.112],[.062,.83,-.052],.005,mat.light,mesh('reticle'));
line([.062,.83,.052],[.062,.83,.112],.005,mat.light,mesh('reticle'));
line([.062,.76,0],[.062,.79,0],.005,mat.light,mesh('reticle'));
line([.062,.87,0],[.062,.92,0],.005,mat.light,mesh('reticle'));

// V6 — additional high-fidelity, concept-matched mechanical construction.
// The side silhouette follows the supplied reference: long exposed rail emitter,
// inset receiver panels, open stock, underbarrel grip and holographic sight.
const G=mesh('static'),L=mesh('led');
const armorHi=color(0x64717c),armorMid=color(0x48525c),deep=color(0x0c1118),blue=color(0x1e8bff),screw=color(0x9da7ad);
// A long tapered muzzle shroud and segmented forward reinforcement.
for(const side of [-1,1]){
 const z=side*.298;
 plate([[-2.54,.36],[-2.43,.48],[-1.81,.51],[-1.65,.44],[-1.73,.28],[-2.49,.25]],z,.026,mat.black,armorHi);
 plate([[-2.49,-.16],[-2.36,-.22],[-1.69,-.19],[-1.57,-.12],[-1.70,-.035],[-2.50,-.06]],z,.03,mat.black,armorMid);
 plate([[-1.72,.49],[-1.43,.53],[-1.17,.45],[-1.10,.35],[-1.29,.29],[-1.72,.32]],z,.035,mat.black,mat.steel);
 plate([[-1.54,.03],[-.87,.06],[-.84,-.08],[-1.15,-.15],[-1.58,-.14]],z+side*.022,.014,deep,deep);
 plate([[-1.55,-.018],[-.93,.002],[-.94,-.040],[-1.55,-.065]],z+side*.034,.007,blue,mat.light,L);
 // Machined lateral rail slots, with dark recessed pockets.
 for(let i=0;i<8;i++){
  const x=-2.39+i*.126;
  plate([[x,.427],[x+.075,.429],[x+.035,.359],[x-.022,.358]],z+side*.023,.01,deep,deep);
  line([x+.01,.44,z+side*.035],[x+.055,.44,z+side*.035],.003,armorHi);
 }
 // Rear receiver: three-dimensional overlapping plates, asymmetric geometry.
 plate([[-.70,.44],[-.22,.43],[.02,.31],[-.07,.13],[-.53,.11],[-.75,.24]],z+.012*side,.035,mat.black,armorMid);
 plate([[-.65,.40],[-.24,.40],[-.12,.30],[-.18,.23],[-.61,.23]],z+side*.038,.009,mat.black,mat.steel);
 plate([[-.15,.13],[.27,.12],[.30,-.02],[.16,-.17],[-.22,-.15]],z+side*.037,.012,deep,mat.dark);
 plate([[.12,.40],[.37,.37],[.44,.21],[.31,.10],[.05,.16]],z+side*.03,.02,mat.black,armorMid);
 // Coarse metal engravings and receiver fasteners.
 for(const [x,y] of [[-.57,.29],[-.26,.30],[-.09,-.04],[.24,.25],[.34,-.10],[-1.68,.24],[-2.38,-.15]]){
  ringXY(x,y,z+side*.058,.016,.008,screw,G,14);
  line([x-.007,y,z+side*.062],[x+.007,y,z+side*.062],.002,deep);
 }
 // Under-barrel rail and slanted carbon handguard.
 plate([[-2.13,-.26],[-1.42,-.30],[-1.31,-.39],[-2.09,-.40]],z*.75,.055,mat.black,mat.steel);
 for(let i=0;i<9;i++){
  const x=-2.03+i*.079;
  line([x,-.33,z*.75+side*.043],[x+.028,-.39,z*.75+side*.043],.008,deep);
 }
 // Blue cooling fins set into the lower shroud.
 for(let i=0;i<6;i++){
  const x=-2.34+i*.125;
  line([x,-.08,z+side*.038],[x+.06,-.08,z+side*.038],.008,blue,L);
 }
 // Distinct stock shell with inset slots, adjustable sliding stock hardware.
 plate([[.82,.37],[1.22,.38],[1.28,.29],[1.25,.19],[.94,.18]],side*.165,.036,mat.black,mat.mid);
 plate([[.84,-.04],[1.23,-.15],[1.28,-.10],[1.16,.02]],side*.168,.029,mat.black,mat.dark);
 line([.92,.35,side*.20],[1.24,.35,side*.20],.015,armorHi);
 for(let i=0;i<3;i++){
  let x=.91+i*.10;
  plate([[x,.31],[x+.067,.31],[x+.04,.26],[x-.015,.26]],side*.19,.015,deep,deep);
 }
 // High-contrast ergonomic grip panel.
 plate([[.34,-.47],[.56,-.50],[.60,-.94],[.48,-1.02],[.36,-.96]],side*.194,.014,deep,mat.dark);
 for(let i=0;i<15;i++){
  const y=-.52-i*.028;
  line([.38,y,side*.205],[.55,y-.012,side*.205],.0028,armorMid);
 }
}
// Outer octagonal muzzle emitter, concentric rings and real inset aperture.
for(const x of [-2.67,-2.61,-2.54])cylinderRingX(x,.105,0,.172,.091,.027,x===-2.67?armorHi:mat.black);
cylinderRingX(-2.694,.105,0,.082,.050,.018,mat.light);
for(let i=0;i<8;i++){
 const a=i*Math.PI/4;
 line([-2.68,.105+Math.cos(a)*.185,Math.sin(a)*.185],[-2.53,.105+Math.cos(a)*.185,Math.sin(a)*.185],.012,mat.chrome);
}
// Open adjustable stock: mechanical triangular braces, not a filled box.
for(const z of [-.205,.205]){
 line([.81,.31,z],[1.30,.34,z],.035,mat.chrome);
 line([.81,-.13,z],[1.28,-.17,z],.033,mat.chrome);
 line([.81,-.13,z],[1.02,.30,z],.029,mat.dark);
}
box(1.43,.07,0,.09,.63,.54,mat.black);
box(1.485,.07,0,.055,.61,.56,armorMid);
// Sight details: transparent window, robust top shell and protected side buttons.
box(.12,1.005,0,.34,.05,.39,mat.black);
for(const z of [-.215,.215]){
 box(.11,.87,z,.31,.22,.028,mat.black);
 for(let i=0;i<3;i++)ringXY(.015+i*.09,.66,z+(z>0?.02:-.02),.018,.008,mat.chrome,G,12);
}
// Accurate visual crosshair through the YZ glass, no solid plate obscuring the optic.
line([.058,.83,-.024],[.058,.83,.024],.003,mat.light,mesh('reticle'));
// Upper receiver lettering represented as engraved bars to avoid external fonts.
for(let i=0;i<5;i++){
 const x=-.46+i*.045;
 line([x,.20,.343],[x+.025,.20,.343],.0025,mat.chrome);
}
// Additional tiny surface scratches and wear in restrained patches.
for(let i=0;i<34;i++){
 const x=-2.33+i*.067,yy=.32+Math.sin(i*2.4)*.019;
 line([x,yy,.328],[x+.014,yy+.006,.328],.0017,mat.etch);
}

// V7 — simulated magnetic discharge: bright continuous central lance, luminous halo,
// converging side filaments, emission cone, and branching arcs. All purely visual.
const origin=[-2.645,.105,0], endPoint=[-6.05,.105,0];
// broad soft blue outer glow, narrow electric-blue core, and white-hot center
line(origin,endPoint,.105,[.07,.25,.92,0.20],mesh('shot'));
line(origin,endPoint,.053,[.02,.55,1,0.85],mesh('shot'));
line(origin,endPoint,.017,[.77,.96,1,1],mesh('shot'));
// six tapering fictional magnetic confinement streamers around the beam
for(let k=0;k<6;k++){
 const a=k*Math.PI/3,dy=Math.sin(a),dz=Math.cos(a);
 const q0=[-2.66,.105+dy*.13,dz*.13];
 const q1=[-3.05,.105+dy*.18,dz*.18];
 const q2=[-3.65,.105+dy*.095,dz*.095];
 const q3=[-4.65,.105+dy*.04,dz*.04];
 line(q0,q1,.018,mat.light,mesh('shot'));
 line(q1,q2,.012,[.10,.54,1,1],mesh('shot'));
 line(q2,q3,.007,[.32,.79,1,1],mesh('shot'));
}
// layered flare at the emitter and crackling electricity along the launch path
for(let i=0;i<24;i++){
 const a=i*2*Math.PI/24;
 const y=Math.sin(a),z=Math.cos(a);
 line(origin,[-2.92,.105+y*.29,z*.29],.011,mat.light,mesh('shot'));
}
for(let i=0;i<22;i++){
 const x=-2.85-i*.115,a=i*2.39996;
 const y=.105+Math.sin(a)*(.10+(i%3)*.025),z=Math.cos(a)*(.10+(i%3)*.025);
 line([x,y,z],[x-.08,.105+Math.sin(a+1.1)*.13,Math.cos(a+1.1)*.13],.008,[.10,.62,1,1],mesh('shot'));
}

 const root=new THREE.Group();root.name='THORN V8 / Magnetic Rail';
 const anchor=new THREE.Group();root.add(anchor);
 // Source model: muzzle -X, palm at x~.35 y~-.55. Rotate X axis onto forward -Z.
 anchor.rotation.y=-Math.PI/2;anchor.scale.setScalar(.26);
 const body=new THREE.Group();body.position.set(-.27,.56,0);anchor.add(body);
 const materials={
 static:new THREE.MeshStandardMaterial({vertexColors:true,metalness:.82,roughness:.27,side:THREE.DoubleSide}),
 glass:new THREE.MeshPhysicalMaterial({vertexColors:true,transparent:true,opacity:.20,metalness:.1,roughness:.08,side:THREE.DoubleSide,depthWrite:false}),
 led:new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}),
 reticle:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false})
 };
 let count=0;
 for(const name of ['static','glass','led','reticle']){
  const data=objects[name];if(!data.length)continue;
  const n=data.length/11,positions=new Float32Array(n*3),normals=new Float32Array(n*3),colors=new Float32Array(n*3);
  const rgb=new THREE.Color();
  for(let i=0;i<n;i++){const j=i*11,k=i*3;positions[k]=data[j];positions[k+1]=data[j+1];positions[k+2]=data[j+2];normals[k]=data[j+3];normals[k+1]=data[j+4];normals[k+2]=data[j+5];rgb.setRGB(data[j+6],data[j+7],data[j+8],THREE.SRGBColorSpace);colors[k]=rgb.r;colors[k+1]=rgb.g;colors[k+2]=rgb.b;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,materials[name]);mesh.name='THORN V8 / '+name;mesh.renderOrder=name==='reticle'?7:name==='glass'?5:name==='led'?4:0;mesh.castShadow=false;body.add(mesh);count++;
 }
 Object.assign(root.userData,{authored:true,authoredOptic:true,integratedEmitter:true,modelName:'THORN V8',sourceVersion:'V8 METAL INDUSTRIEL',optimizedDrawCalls:count,muzzle:[0,.12,-.85]});
 return root;
}
export function createThornV8(){prototype ||= build();return prototype.clone(true)}
