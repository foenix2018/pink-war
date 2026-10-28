// PINK WARS — VORTEX AR-7 V5, original procedural model from the approved viewer.
// Same olive/brushed-metal hull, rear buttstock, cyan reflex optic and pink magazine rails.
// Weapon local frame: grip at (0,0,0), muzzle points down -Z.
import * as THREE from './vendor/three.webgpu.min.js';
let cachedPrototype;
function buildPrototype(){
const meshes={solid:[],glow:[],optic:[],ammo:[],shot:[]};
const C=(hex,a=1)=>[((hex>>>16)&255)/255,((hex>>>8)&255)/255,(hex&255)/255,a];
const pink=C(0xff3fa1),pinkSoft=C(0xff83c9),cyan=C(0x6befff),titanium=C(0x69716d),edge=C(0x9ca69b);
const steel=C(0x87938f),olive=C(0x626c60),olive2=C(0x4a564f),armor=C(0x424e4d),dark=C(0x263137),black=C(0x111a20),rubber=C(0x172027),trim=C(0x9aa6a3),groove=C(0x0a1116),green=C(0x92ff79),scratched=C(0x7d8c82),brushed=C(0x64716c),brushedBright=C(0x90a19c),oxide=C(0x293734),alloy=C(0x64736b),rearAlloy=C(0x414f4e),rearEdge=C(0x72837f);
const geom=mesh=>meshes[mesh];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function unit(x){const n=Math.hypot(...x)||1;return x.map(v=>v/n)}
function triangle(dst,a,b,c,col,lit=0){const u=unit(cross(sub(b,a),sub(c,a)));for(const v of [a,b,c])dst.push(...v,...u,col[0],col[1],col[2],col[3],lit)}
function quad(dst,a,b,c,d,col,lit=0){triangle(dst,a,b,c,col,lit);triangle(dst,a,c,d,col,lit)}
function polygon(pts,depth,col,front=col,z=0,dst=geom('solid')){
 // Polygon triangulation handles concave side silhouettes; thickened into a real 3D mesh.
 const n=pts.length;const z0=z-depth/2,z1=z+depth/2;const ids=[...Array(n).keys()];let area=0;for(let i=0;i<n;i++){let p=pts[i],q=pts[(i+1)%n];area+=p[0]*q[1]-q[0]*p[1]}const orient=area>0?1:-1;
 const faces=[];for(let guard=0;ids.length>3&&guard<n*n;guard++){
  let found=false;for(let j=0;j<ids.length;j++){const a=ids[(j+ids.length-1)%ids.length],b=ids[j],c=ids[(j+1)%ids.length];const p=pts[a],q=pts[b],r=pts[c];const v=((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]))*orient;if(v<1e-6)continue;
   let overlaps=false;for(const k of ids){if(k===a||k===b||k===c)continue;let t=pts[k];const ab=((q[0]-p[0])*(t[1]-p[1])-(q[1]-p[1])*(t[0]-p[0]))*orient;const bc=((r[0]-q[0])*(t[1]-q[1])-(r[1]-q[1])*(t[0]-q[0]))*orient;const ca=((p[0]-r[0])*(t[1]-r[1])-(p[1]-r[1])*(t[0]-r[0]))*orient;if(ab>1e-7&&bc>1e-7&&ca>1e-7){overlaps=true;break}}
   if(!overlaps){faces.push([a,b,c]);ids.splice(j,1);found=true;break}
  }if(!found)break;
 }if(ids.length===3)faces.push(ids);if(!faces.length)for(let i=1;i<n-1;i++)faces.push([0,i,i+1]);
 for(const [a,b,c] of faces){triangle(dst,[...pts[a],z1],[...pts[b],z1],[...pts[c],z1],front);triangle(dst,[...pts[c],z0],[...pts[b],z0],[...pts[a],z0],col)}
 for(let i=0;i<n;i++){const j=(i+1)%n;quad(dst,[...pts[i],z0],[...pts[j],z0],[...pts[j],z1],[...pts[i],z1],col)}
}
function panel(p,z,depth,col,front=col,dst=geom('solid')){polygon(p,depth,col,front,z,dst)}
function block(x,y,z,w,h,d,col,dst=geom('solid')){polygon([[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]],d,col,col,z,dst)}
function rod(a,b,r,col,dst=geom('solid'),n=10){const axis=unit(sub(b,a)),temp=Math.abs(axis[2])>.97?[0,1,0]:[0,0,1],u=unit(cross(axis,temp)),v=cross(axis,u);const pt=(p,t)=>[p[0]+r*(Math.cos(t)*u[0]+Math.sin(t)*v[0]),p[1]+r*(Math.cos(t)*u[1]+Math.sin(t)*v[1]),p[2]+r*(Math.cos(t)*u[2]+Math.sin(t)*v[2])];for(let i=0;i<n;i++){const p=i*Math.PI*2/n,q=(i+1)*Math.PI*2/n;quad(dst,pt(a,p),pt(a,q),pt(b,q),pt(b,p),col)}}
function ringXY(x,y,z,outer,inner,col,n=20){for(let i=0;i<n;i++){let a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;let p=(r,t)=>[x+Math.cos(t)*r,y+Math.sin(t)*r,z];quad(geom('solid'),p(outer,a),p(outer,b),p(inner,b),p(inner,a),col)}}
function cylinderX(a,b,y,z,r,c,n=24){for(let i=0;i<n;i++){let t=i*2*Math.PI/n,u=(i+1)*2*Math.PI/n;let v=(x,s)=>[x,y+Math.cos(s)*r,z+Math.sin(s)*r];quad(geom('solid'),v(a,t),v(a,u),v(b,u),v(b,t),c);triangle(geom('solid'),[a,y,z],v(a,u),v(a,t),c);triangle(geom('solid'),[b,y,z],v(b,t),v(b,u),c)}}
function ringX(x,y,z,o,i,col){for(let k=0;k<32;k++){const t=k*Math.PI/16,u=(k+1)*Math.PI/16,p=(r,a)=>[x,y+Math.cos(a)*r,z+Math.sin(a)*r];quad(geom('solid'),p(o,t),p(o,u),p(i,u),p(i,t),col)}}
// ---- Model from user reference: olive assault weapon with nose left, stock right.
// Rear stock is assembled from hollow metal rails, avoiding the inaccurate solid triangle.
panel([[.54,.26],[.90,.35],[1.31,.34],[1.49,.23],[1.53,.06],[1.38,.03],[.83,.11]],0,.39,dark,olive2);
panel([[.98,.05],[1.47,.05],[1.53,-.07],[1.47,-.46],[1.31,-.59],[.93,-.58],[.92,-.48],[1.34,-.39],[1.37,-.06]],0,.38,black,armor);
panel([[.74,-.30],[.95,-.28],[1.34,-.41],[1.39,-.52],[.84,-.65]],0,.34,black,dark);
block(1.55,-.11,0,.12,.78,.46,black);block(1.605,-.11,0,.035,.72,.49,trim);
for(const side of [-1,1]){
 panel([[.83,.16],[1.21,.20],[1.39,.10],[1.38,-.015],[.81,.005]],side*.208,.025,dark,olive2);
 panel([[1.13,-.32],[1.42,-.37],[1.44,-.46],[1.26,-.55],[1.02,-.56]],side*.22,.02,armor,dark);
 for(let i=0;i<3;i++)block(1.3+i*.085,.22,side*.227,.056,.014,.014,groove);
}
// Receiver reinforced backbone
panel([[-1.39,-.16],[-.80,-.23],[-.34,-.20],[.20,-.14],[.76,-.19],[.86,.07],[.69,.33],[-1.03,.33],[-1.47,.09]],0,.42,dark,armor);
// Carry cowl: high smooth angular surface with front wedge and top bevel.
panel([[-2.19,.17],[-2.06,.38],[-1.54,.56],[-.40,.61],[-.25,.35],[-.44,.24],[-1.83,.15]],0,.44,olive2,olive);
panel([[-2.13,.34],[-1.55,.53],[-.52,.55],[-.39,.39],[-1.52,.38]],.229,.02,olive,olive2);
panel([[-.35,.41],[.05,.40],[.14,.37],[.42,.40],[.58,.32],[.50,.09],[.08,.12],[-.39,.19]],0,.405,armor,olive2);
panel([[.49,.38],[1.06,.37],[1.32,.28],[1.30,.11],[.48,.14]],0,.40,dark,olive);
// Forward nose shroud and primary barrel in upper/front cavity.
panel([[-2.40,.11],[-2.27,.18],[-2.16,.19],[-2.15,-.14],[-2.33,-.25],[-2.44,-.20]],0,.42,black,dark);
for(const [y,r,from,to] of [[.015,.080,-2.56,-2.36],[-.286,.096,-2.29,-2.08]]){cylinderX(from,to,y,0,r,trim);ringX(from-.006,y,0,r*.86,r*.58,groove)}
// Underbelly insulated structure and lower receiver contour.
panel([[-2.15,-.12],[-1.89,-.17],[-1.22,-.13],[-.83,-.21],[-.61,-.34],[-.79,-.54],[-1.96,-.54],[-2.14,-.40]],0,.36,black,armor);
panel([[-.81,-.16],[-.13,-.13],[.01,-.25],[-.03,-.48],[-.65,-.49],[-.88,-.36]],0,.38,black,olive2);
// Tactical trigger + open guard; slanted textured grip near rear.
panel([[.17,-.31],[.46,-.30],[.53,-.44],[.61,-1.04],[.45,-1.16],[.19,-1.10],[.10,-.88],[.13,-.58]],0,.33,black,dark);
for(const side of [-1,1]){const z=side*.182;
 panel([[.18,-.56],[.45,-.58],[.53,-1.03],[.40,-1.09],[.24,-.99]],z,.021,armor,black);
 for(let i=0;i<7;i++)rod([.19+i*.018,-.69-i*.050,z+side*.015],[.42+i*.014,-.69-i*.050,z+side*.015],.004,trim);
}
const tg=[[.14,-.35],[-.12,-.38],[-.11,-.64],[.20,-.68],[.30,-.56]];for(let i=0;i<tg.length;i++){const a=tg[i],b=tg[(i+1)%tg.length];rod([a[0],a[1],0],[b[0],b[1],0],.023,trim)}rod([.08,-.40,0],[.07,-.53,0],.017,black);
// Ribbed lower front grip with recessed panels and stout vent lines.
for(const side of [-1,1]){
 const z=side*.223;
 panel([[-2.01,-.30],[-1.25,-.30],[-1.01,-.43],[-1.03,-.53],[-1.86,-.51],[-2.04,-.44]],z,.018,black,armor);
 for(let i=0;i<10;i++)rod([-1.92+i*.088,-.41,z+side*.01],[-1.91+i*.088,-.505,z+side*.01],.006,groove);
}
// Deep inset lengthwise receiver seams and machined channels on both cheeks.
for(const side of [-1,1]){
 const z=side*.24;
 panel([[-2.03,.19],[-1.40,.24],[-.35,.26],[-.26,.15],[-1.25,.13]],z,.016,olive,olive2);
 panel([[-1.83,.05],[-1.39,.045],[-1.32,-.026],[-1.80,-.026]],z+side*.016,.018,groove,black);
 panel([[-1.10,-.08],[-.42,-.08],[-.33,-.18],[-.99,-.20]],z+side*.018,.014,dark,armor);
 panel([[.59,.08],[1.18,.09],[1.31,-.04],[.61,-.045]],z,.017,black,armor);
 panel([[.77,.27],[1.14,.26],[1.21,.18],[.85,.18]],z+side*.015,.017,olive2,olive);
 for(const [x,y] of [[-1.34,.49],[-.91,.50],[-.42,.43],[.20,.12],[.97,.23],[1.23,-.41]]){ringXY(x,y,z+side*.025,.017,.007,trim,14)}
 // Upper recessed charging slot and three lateral narrow vents.
 panel([[-1.44,.40],[-.91,.42],[-.83,.37],[-1.40,.34]],z+side*.024,.008,groove,black);
 for(let i=0;i<3;i++){let x=.64+i*.155;panel([[x,-.06],[x+.10,-.06],[x+.075,-.09],[x-.03,-.09]],z+side*.025,.009,black,groove)}
}
// Olive plate rivets/edge wear, safety LED and tiny mechanical surface detail.
for(const side of [-1,1]){
 const z=side*.271;
 ringXY(-.83,-.25,z,.031,.021,black);ringXY(-.83,-.25,z+side*.006,.025,.012,green);
 for(let i=0;i<17;i++){const x=-1.77+i*.071;rod([x,.48+(i%3)*.005,z],[x+.022,.48+(i%3)*.005,z],.0018,scratched)}
 for(let i=0;i<7;i++){let x=-.17+i*.115;rod([x,.37,z-side*.029],[x+.028,.37,z-side*.029],.003,trim)}
}
// ━━━ V3 / engineering pass: sculpted side strips and small forward metal details ━━━
for(const side of [-1,1]){
  const z=side*.29,outer=side*.306;
  // Anodized receiver reinforcement: separate chamfers with recessed functional slots.
  panel([[-1.86,.275],[-1.57,.32],[-.46,.30],[-.34,.236],[-1.80,.215]],z,.018,black,titanium);
  for(let j=0;j<9;j++){
    const x=-1.72+j*.129;
    panel([[x,.307],[x+.069,.307],[x+.048,.276],[x-.006,.276]],outer,.008,groove,black);
    rod([x,.315,outer+side*.007],[x+.068,.315,outer+side*.007],.0026,edge);
  }
  // Sliding action and raised screw fixings along the middle section.
  panel([[-.23,.278],[.20,.280],[.34,.216],[.21,.145],[-.16,.160]],side*.258,.019,groove,armor);
  for(const [x,y] of [[-.21,.21],[.24,.216],[-1.95,-.12],[-.70,-.165],[.76,.16]]){
    ringXY(x,y,outer+side*.007,.016,.008,steel,16);
  }
  // Triangular flank embossing, with narrow seam defined by real metal relief.
  panel([[-1.74,-.222],[-1.27,-.232],[-1.14,-.310],[-1.70,-.31]],outer,.012,black,armor);
  rod([-1.7,-.314,outer+side*.01],[-1.13,-.314,outer+side*.01],.003,edge);
  // Magazine-release style metal switch below the chamber.
  panel([[.12,-.26],[.25,-.255],[.34,-.295],[.21,-.330]],outer,.015,black,steel);
  // Extra grip microtexturing aligned with the existing angled grip.
  for(let j=0;j<12;j++){
    let y=-.66-j*.034;
    rod([.24+j*.006,y,side*.205],[.42+j*.006,y-.015,side*.205],.0022,titanium);
  }
}
// ━━━ Compact reflex optic. Glass is YZ (perpendicular to the -X shot axis). ━━━
// The optical window has no opaque disc at the aiming point.
block(-.59,.634,0,.36,.051,.265,black);
block(-.58,.673,0,.24,.034,.206,titanium);
for(const side of [-1,1]){
 const z=side*.139;
 panel([[-.75,.666],[-.735,.845],[-.666,.891],[-.622,.882],[-.608,.826],[-.607,.668]],z,.035,black,armor);
 panel([[-.469,.668],[-.473,.832],[-.419,.882],[-.374,.865],[-.368,.666]],z,.035,black,armor);
 rod([-.72,.864,z+side*.018],[-.67,.894,z+side*.018],.008,edge);
 ringXY(-.688,.683,z+side*.023,.016,.007,steel,14);
}
// Roof bridging the two risers: readable miniature reflex sight from either side.
for(const side of [-1,1]){
 panel([[-.745,.862],[-.693,.919],[-.407,.919],[-.356,.858],[-.420,.852],[-.677,.858]],side*.149,.020,black,titanium);
 rod([-.683,.916,side*.165],[-.407,.916,side*.165],.004,edge);
}
rod([-.665,.894,-.148],[-.665,.894,.148],.019,titanium);
rod([-.422,.884,-.148],[-.422,.884,.148],.017,steel);
// Glass is genuinely thin and translucent, not a flat opaque panel on the rifle.
const lens=geom('optic'),lensX=-.650;
quad(lens,[lensX,.702,-.096],[lensX,.857,-.096],[lensX,.857,.096],[lensX,.702,.096],C(0x82d4e2,.23));
function reticleRing(x,y,z,r,w){const mesh=geom('glow');for(let j=0;j<28;j++){
 const a=j*Math.PI/14,b=(j+1)*Math.PI/14,p=(rr,t)=>[x,y+Math.sin(t)*rr,z+Math.cos(t)*rr];
 quad(mesh,p(r,a),p(r,b),p(r-w,b),p(r-w,a),cyan,0);
}}
reticleRing(-.647,.784,0,.026,.004);
rod([-.647,.784,-.053],[-.647,.784,-.035],.0032,cyan,geom('glow'),7);
rod([-.647,.784,.035],[-.647,.784,.053],.0032,cyan,geom('glow'),7);
rod([-.647,.743,0],[-.647,.758,0],.0032,cyan,geom('glow'),7);
rod([-.647,.812,0],[-.647,.832,0],.0032,cyan,geom('glow'),7);
// ━━━ Ammo track on BOTH flanks: independent emissive 36-step display. ━━━
// Segments are one GPU mesh and suppressed in the fragment shader using the
// live magazine ratio. The same logical test is applied by the Canvas fallback.
const capacity=36,stripStart=-1.735,stripLength=1.43,stripY=.066;
for(const side of [-1,1]){
 const mountZ=side*.365,lightZ=side*.395;
 panel([[stripStart-.05,stripY-.043],[stripStart+stripLength+.055,stripY-.043],[stripStart+stripLength+.055,stripY+.043],[stripStart-.05,stripY+.043]],mountZ,.026,groove,black);
 // Thin unlit metallic borders keep the empty magazine indicator visible.
 rod([stripStart-.035,stripY+.036,mountZ+side*.025],[stripStart+stripLength+.04,stripY+.036,mountZ+side*.025],.006,titanium);
 rod([stripStart-.035,stripY-.038,mountZ+side*.025],[stripStart+stripLength+.04,stripY-.038,mountZ+side*.025],.006,titanium);
 for(let j=0;j<capacity;j++){
   const x1=stripStart+j*stripLength/capacity+.003,x2=stripStart+(j+1)*stripLength/capacity-.002;
   const a=[x1,stripY-.022,lightZ],b=[x2,stripY-.022,lightZ],c=[x2,stripY+.021,lightZ],d=[x1,stripY+.021,lightZ];
   // 1/36 ... 1.0: every emitted triangle carries its ammo threshold.
   quad(geom('ammo'),a,b,c,d,pink,(j+1)/capacity);
 }
 // Idle controller readout casing and engraved technical markings.
 rod([stripStart,stripY+.065,mountZ],[stripStart+.30,stripY+.065,mountZ],.003,steel);
}

// V5: rear plate is rebuilt as a real connected, faceted buttstock assembly below.

// ━━━━━━━━━━━ V5 : SATIN FINISH / MACHINED ALLOY BODY ━━━━━━━━━━━
// The contrasting metal overlays are shallow extrusions, not flat decals.
// They preserve all existing silhouette volumes and the magenta ammo meter.
for (const side of [-1,1]) {
  const z=side*.298;
  // Front cowl: brushed titanium bevels follow the upper aerodynamic shell.
  panel([[-2.09,.316],[-1.56,.525],[-.55,.534],[-.41,.421],[-1.44,.423]],z,.012,oxide,brushed);
  rod([-2.00,.360,z+side*.010],[-1.57,.520,z+side*.010],.0038,brushedBright);
  rod([-1.54,.526,z+side*.010],[-.57,.526,z+side*.010],.0033,brushedBright);
  // Recessed alloy spline at front and lower handguard.
  panel([[-1.92,-.39],[-1.56,-.397],[-1.34,-.430],[-1.40,-.461],[-1.92,-.461]],z+.009*side,.012,oxide,brushed);
  rod([-1.89,-.407,z+side*.021],[-1.47,-.411,z+side*.021],.0032,trim);
  // Receiver machined cheek surface: asymmetrical edges and alloy lower ridge.
  panel([[-.24,.346],[.12,.347],[.23,.308],[.37,.338],[.51,.290],[.45,.222],[-.23,.234]],side*.273,.015,olive2,alloy);
  rod([-.23,.351,side*.287],[.10,.352,side*.287],.0028,brushedBright);
  panel([[-.20,-.199],[.41,-.193],[.53,-.260],[.43,-.305],[-.12,-.283]],z,.015,black,brushed);
  // Technical chips and tiny surface scratches only along exposed metal surfaces.
  for(let j=0;j<19;j++){
    const x=-1.88+j*.072;
    const y=.462+(j%4)*.004;
    rod([x,y,z+side*.016],[x+.018+(j%3)*.004,y+.002,z+side*.016],.0018,scratched,geom('solid'),5);
  }
  for(let j=0;j<13;j++){
    const x=-.16+j*.054;
    rod([x,.30,side*.301],[x+.013,.300+(j%3)*.005,side*.301],.0019,brushedBright,geom('solid'),5);
  }
  // Small deeply recessed engineering screw heads.
  for(const [x,y] of [[-2.03,.236],[-1.44,.445],[-.32,.337],[.12,.310],[.56,-.240]]){
    ringXY(x,y,side*.319,.017,.009,oxide,14);
    rod([x-.007,y,side*.326],[x+.007,y,side*.326],.0024,trim,geom('solid'),6);
  }
}
// ━━━━━━━━━━━ V5 : REAR BUTTSTOCK REBUILD ━━━━━━━━━━━
// Following the reference: wraparound steel shell, integrated guide rails,
// negative-space lower support, textured rubber heel and articulated cheekpiece.
// Full alloy core joins the stock to the receiver; no freestanding plate.
panel([[.77,.265],[1.13,.304],[1.36,.257],[1.48,.200],[1.47,.065],[1.10,.085],[.77,.122]],0,.448,dark,alloy);
panel([[1.23,.27],[1.41,.295],[1.54,.242],[1.56,-.403],[1.47,-.494],[1.30,-.471],[1.39,-.322]],0,.485,black,rearAlloy);
// Buttpad outside the stock: tapered anti-slip elastomer, bevel edged metal frame.
panel([[1.49,.245],[1.55,.252],[1.62,.184],[1.63,-.364],[1.57,-.454],[1.49,-.443]],0,.514,oxide,rearAlloy);
panel([[1.573,.213],[1.636,.197],[1.663,.146],[1.661,-.345],[1.619,-.405],[1.566,-.387]],0,.520,black,rubber);
// Outer rubber pad vertical chevrons are actual shallow 3D ridges.
for(const side of [-1,1]){
 const z=side*.262;
 const shell=[[.91,.233],[1.14,.254],[1.39,.220],[1.48,.138],[1.46,-.046],[1.27,-.093],[1.01,-.066],[.89,.056]];
 panel(shell,z,.023,black,rearAlloy);
 // Seat of the adjustable stock, spring-loaded-looking metal inset rails.
 panel([[.92,.191],[1.28,.183],[1.34,.120],[.94,.105]],side*.28,.012,groove,oxide);
 rod([.93,.193,side*.306],[1.27,.189,side*.306],.012,rearEdge);
 rod([.91,.075,side*.302],[1.32,.068,side*.302],.010,rearEdge);
 // Rear angular flank, with true inset fasteners.
 panel([[1.26,-.101],[1.49,-.095],[1.50,-.340],[1.39,-.460],[1.16,-.443],[1.14,-.359]],side*.265,.021,black,rearAlloy);
 panel([[1.34,-.175],[1.46,-.175],[1.47,-.312],[1.37,-.367],[1.30,-.319]],side*.287,.012,groove,oxide);
 rod([1.28,-.114,side*.292],[1.46,-.105,side*.292],.008,trim);
 ringXY(1.41,.153,side*.293,.023,.013,steel,18);
 ringXY(1.41,.153,side*.306,.011,.005,groove,16);
 ringXY(1.38,-.420,side*.296,.019,.009,steel,16);
 // Matching adjustable lower metal brace bordering the triangular stock cavity.
 rod([.88,-.179,side*.171],[1.30,-.356,side*.191],.029,rearAlloy);
 rod([1.30,-.356,side*.191],[1.49,-.364,side*.220],.025,oxide);
 // Cushion slits are recessed black strips along the shoulder pad side.
 for(let j=0;j<5;j++){
   const y=.12-j*.103;
   rod([1.586,y,side*.282],[1.613,y-.032,side*.283],.006,groove);
 }
 // Back cheek comb formed from interlocking machined upper segments.
 panel([[.84,.293],[1.01,.353],[1.30,.348],[1.43,.301],[1.38,.261],[.89,.253]],side*.242,.019,black,rearAlloy);
 rod([.99,.342,side*.256],[1.30,.342,side*.256],.005,rearEdge);
 for(let j=0;j<3;j++){
    const x=1.06+j*.09;
    rod([x,.301,side*.271],[x+.048,.301,side*.271],.0025,groove);
 }
}
// Actual vertical anti-slip ridges on the end face (YZ plane).
for(let i=0;i<7;i++){
 const y=.148-i*.079;
 rod([1.659,y,-.165],[1.659,y,-.110],.007,oxide);
 rod([1.659,y,.110],[1.659,y,.165],.007,oxide);
}
// End-fastening cross bolts and dorsal alloy ribs.
for(let z of [-.175,.175]){
 rod([1.52,.200,z],[1.60,.205,z],.010,steel);
 rod([1.52,-.396,z],[1.60,-.392,z],.010,steel);
}

// Visual-only muzzle flash: dynamic opacity and geometry.
for(let i=0;i<14;i++){const t=i*2*Math.PI/14;rod([-2.54,.015,0],[-2.82,.015+Math.sin(t)*.25,Math.cos(t)*.25],.013,C(0xffd284),geom('shot'),6)}
rod([-2.54,.015,0],[-3.75,.015,0],.016,C(0xffe7b6),geom('shot'),8);
// ---------------------------------------------------------- GPU backends.

 const root=new THREE.Group();root.name='VORTEX AR-7 V5';
 const pivot=new THREE.Group();pivot.rotation.y=-Math.PI/2;pivot.scale.setScalar(.25);root.add(pivot);
 const body=new THREE.Group();body.position.set(-.35,.55,0);pivot.add(body);
 const materials={
  solid:new THREE.MeshStandardMaterial({vertexColors:true,metalness:.78,roughness:.34,side:THREE.DoubleSide}),
  glow:new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.DoubleSide,transparent:true,depthWrite:false}),
  optic:new THREE.MeshPhysicalMaterial({color:0xa4deea,transparent:true,opacity:.17,metalness:.10,roughness:.08,side:THREE.DoubleSide,depthWrite:false})
 };
 for(const name of ['solid','glow','optic']){
  const raw=meshes[name],n=raw.length/11;
  const pos=new Float32Array(n*3),norm=new Float32Array(n*3),colors=new Float32Array(n*3);
  const srgb=new THREE.Color();
  for(let i=0;i<n;i++){
   const j=i*11,k=i*3;pos[k]=raw[j];pos[k+1]=raw[j+1];pos[k+2]=raw[j+2];
   norm[k]=raw[j+3];norm[k+1]=raw[j+4];norm[k+2]=raw[j+5];
   srgb.setRGB(raw[j+6],raw[j+7],raw[j+8],THREE.SRGBColorSpace);
   colors[k]=srgb.r;colors[k+1]=srgb.g;colors[k+2]=srgb.b;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(norm,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,materials[name]);mesh.name='VORTEX / '+name;mesh.castShadow=false;
  mesh.renderOrder=name==='optic'?6:name==='glow'?5:0;body.add(mesh);
 }
 // Render 72 magazine cells with ONE InstancedMesh: 36 cells on each flank.
 // The original pink strip is preserved geometrically, and cell colors come
 // from the real combat ammo count (not a fake autonomous animation).
 const ammoGeometry=new THREE.PlaneGeometry(1.43/36-.005,.043);
 const ammoMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
 const strip=new THREE.InstancedMesh(ammoGeometry,ammoMaterial,72);
 strip.name='VORTEX / live pink ammo';strip.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const m=new THREE.Matrix4(),full=new THREE.Color(0xff3fa1);
 for(let side=0;side<2;side++)for(let i=0;i<36;i++){
  const x=-1.735+(i+.5)*1.43/36;
  m.makeTranslation(x,.066,side===0?-.395:.395);strip.setMatrixAt(side*36+i,m);
  strip.setColorAt(side*36+i,full);
 }
 strip.instanceMatrix.needsUpdate=true;strip.instanceColor.needsUpdate=true;
 strip.frustumCulled=false;body.add(strip);
 Object.assign(root.userData,{
  authored:true,authoredOptic:true,ownReticle:true,integratedEmitter:true,
  modelName:'VORTEX AR-7 V5',optic:{y:.334,z:-.249,radius:.026,magnification:1.3,eyeRelief:.26},
  muzzle:[0,.138,-.729],sourceVersion:'VORTEX AR-7 V5',ammoCapacity:36
 });
 return root;
}
export function createVortexAR7(){cachedPrototype ||=buildPrototype();return cachedPrototype.clone(true);}
const bright=new THREE.Color(0xff3fa1),darkCell=new THREE.Color(0x19141e);
export function updateVortexAmmo(model,ammo,capacity=36){
 if(!model)return;
 const count=Math.max(0,Math.min(36,Math.ceil(36*(Number(ammo)||0)/Math.max(1,Number(capacity)||36))));
 if(model.userData.lastVortexAmmo===count)return;
 const strip=model.getObjectByName('VORTEX / live pink ammo');if(!strip)return;
 model.userData.lastVortexAmmo=count;
 for(let side=0;side<2;side++)for(let i=0;i<36;i++)strip.setColorAt(side*36+i,i<count?bright:darkCell);
 if(strip.instanceColor)strip.instanceColor.needsUpdate=true;
}
