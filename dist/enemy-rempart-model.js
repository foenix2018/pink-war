import * as T from './vendor/three.webgpu.min.js';
import {merge,matrix,limb} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
const cache=new Map();
// Chamfered block: 6 flat faces, 12 bevels and 8 clipped corners (44 triangles).
function chamfer(size,c=.012){
 const h=size.map(v=>v/2),b=h.map(v=>Math.max(.0001,v-c)),vertices=[],uv=[];
 const face=pts=>{const center=new T.Vector3();for(const p of pts)center.add(new T.Vector3(...p));center.multiplyScalar(1/pts.length);let normal=new T.Vector3().subVectors(new T.Vector3(...pts[1]),new T.Vector3(...pts[0])).cross(new T.Vector3().subVectors(new T.Vector3(...pts[2]),new T.Vector3(...pts[0])));if(normal.dot(center)<0)pts.reverse();for(let i=1;i<pts.length-1;i++)for(const p of [pts[0],pts[i],pts[i+1]]){vertices.push(...p);uv.push(p[0]*1.4+p[2]*.65+.5,p[1]*1.4+p[2]*.65+.5);}};
 for(let axis=0;axis<3;axis++)for(const s of [-1,1]){const j=(axis+1)%3,k=(axis+2)%3;face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[];p[axis]=s*h[axis];p[j]=u*b[j];p[k]=v*b[k];return p;}));}
 for(let axis=0;axis<3;axis++)for(const sj of [-1,1])for(const sk of [-1,1]){const j=(axis+1)%3,k=(axis+2)%3;face([[-1,0],[1,0],[1,1],[-1,1]].map(([s,edge])=>{const p=[];p[axis]=s*b[axis];p[j]=sj*(edge?b[j]:h[j]);p[k]=sk*(edge?h[k]:b[k]);return p;}));}
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])face([[sx*h[0],sy*b[1],sz*b[2]],[sx*b[0],sy*h[1],sz*b[2]],[sx*b[0],sy*b[1],sz*h[2]]]);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function plateGeometry(points,depth,bevel){
 const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:depth-bevel*2,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1});g.translate(0,0,-(depth-bevel*2)/2);
 const p=g.attributes.position,u=g.attributes.uv;for(let i=0;i<p.count;i++)u.setXY(i,p.getX(i)*1.6+.5,p.getY(i)*1.6+.5);return g;
}
const outlines={
 chest:[[-.23,-.19],[.13,-.18],[.23,-.07],[.22,.17],[.11,.24],[-.19,.21],[-.25,.08]],
 shoulder:[[-.16,-.19],[.16,-.17],[.22,-.06],[.20,.19],[.10,.25],[-.16,.22],[-.21,.08]],
 thigh:[[-.14,-.18],[.12,-.20],[.18,-.06],[.16,.18],[.04,.23],[-.14,.19],[-.18,.04]],
 shin:[[-.13,-.19],[.12,-.19],[.17,-.04],[.15,.19],[-.12,.21],[-.17,.06]],
 shield:[[-.21,-.19],[.20,-.18],[.23,-.10],[.22,.19],[.15,.24],[-.16,.23],[-.23,.14]],
 jaw:[[-.13,-.08],[.10,-.08],[.15,0],[.12,.09],[-.11,.10],[-.16,.03]]
};
export function rempartGeometry(detail='high'){
 const low=detail==='low';if(cache.has(detail))return cache.get(detail);
 const pieces=[],add=(bone,key,g,m)=>{const geometry=g.clone();if(m){geometry.applyMatrix4(m);if(m.determinant()<0){const index=geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.attributes.position.count},(_,i)=>i);for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];geometry.setIndex(index);}}pieces.push({bone,key,geometry});};
 const box=(b,k,size,pos,rot=[0,0,0],bevel=.012)=>add(b,k,low&&(k==='dark'||Math.min(...size)<.03)?new T.BoxGeometry(...size):chamfer(size,Math.min(bevel,...size.map(s=>s*.22))),matrix(pos,rot));
 const plate=(b,k,shape,pos,size=[1,1,1],rot=[0,0,0],depth=.08,curvature=0)=>{
  const points=outlines[shape]||shape,m=matrix(pos,rot,size),bulge=curvature||(['shoulder','shin'].includes(shape)?.032:0);
  let g=plateGeometry(points,depth,low?.006:.013);
  if(!low&&bulge){g.dispose();g=profiledPanel(points.map(([x,y])=>[-x,y]),{depth,bulge,round:.035,detail:3}).rotateY(Math.PI);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*1.6+.5,p.getY(i)*1.6+.5);}
  add(b,k,g,m);
  // Small patches of exposed metal along the physical plate edges.
  if(!low&&k==='plate'){
   const v=[],uv=[];points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length],dx=next[0]-x,dy=next[1]-y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    for(let j=0;j<3;j++){const t=.13+j*.29,a=[x+dx*t,y+dy*t],l=.012+(i%3)*.004,w=.0018;for(const p of [[a[0],a[1]],[a[0]+dx/len*l,a[1]+dy/len*l],[a[0]+dx/len*l+nx*w,a[1]+dy/len*l+ny*w],[a[0],a[1]],[a[0]+dx/len*l+nx*w,a[1]+dy/len*l+ny*w],[a[0]+nx*w,a[1]+ny*w]]){v.push(p[0],p[1],depth/2+.002);uv.push(0,0);}}
   });const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(b,'metal',g,m);
  }
 };
 const cyl=(b,k,pos,r,d,rot=[Math.PI/2,0,0],radial=low?6:20)=>add(b,k,new T.CylinderGeometry(r,r,d,radial,1),matrix(pos,rot));
 const tube=(b,k,a,z,r,r2=r)=>add(b,k,limb(a,z,r,r2,low?6:12));
 const torus=(b,k,pos,r,t=.007,rot=[0,0,0])=>add(b,k,new T.TorusGeometry(r,t,low?3:5,low?10:24),matrix(pos,rot));
 const bolt=(b,x,y,z,r=.009)=>{if(!low){cyl(b,'dark',[x,y,z-.002],r*1.45,.006,[Math.PI/2,0,0],10);cyl(b,'metal',[x,y,z+.003],r,.008,[Math.PI/2,0,0],6);box(b,'dark',[r*.9,r*.18,.002],[x,y,z+.008],[],0);}};
 const motor=(b,pos,r=.10,d=.10)=>{
  cyl(b,'dark',pos,r,d,[0,0,Math.PI/2]);
  const sign=pos[0]<0?-1:1,x=pos[0]+sign*(d/2+.008);
  cyl(b,'metal',[x,pos[1],pos[2]],r*.75,.018,[0,0,Math.PI/2]);
  cyl(b,'dark',[x+sign*.011,pos[1],pos[2]],r*.48,.012,[0,0,Math.PI/2]);
  if(!low)for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(b,'metal',[x+sign*.013,pos[1]+Math.cos(a)*r*.59,pos[2]+Math.sin(a)*r*.59],.005,.007,[0,0,Math.PI/2],6);}
 };
 const louvres=(b,pos,width,height,count=4,rot=[0,0,0])=>{
  box(b,'dark',[width+.025,height+.02,.025],pos,rot,.003);
  for(let i=0;i<count;i++)box(b,'metal',[width,height/count*.20,.018],[pos[0],pos[1]-height/2+(i+.5)*height/count,pos[2]+.019],rot,.002);
 };
 const glow=(b,pos,width,height,key='red')=>{
  if(low)return;const g=new T.PlaneGeometry(width,height);add(b,key,g,matrix([pos[0],pos[1],pos[2]+.022]));
 };
 const insetLight=(b,pos,length=.10,vertical=true)=>{box(b,'dark',vertical?[.045,length+.035,.023]:[length+.035,.045,.023],pos);box(b,'red',vertical?[.015,length,.012]:[length,.014,.012],[pos[0],pos[1],pos[2]+.019],[],.003);glow(b,pos,vertical?.09:length+.09,vertical?length+.09:.09);};
 const piston=(b,a,z,r=.023)=>{tube(b,'dark',a,z,r);const mid=a.map((v,i)=>v*.4+z[i]*.6);tube(b,'metal',mid,z,r*.55);};
 const ribbed=(b,a,z,r=.022)=>{tube(b,'dark',a,z,r);if(!low){const from=new T.Vector3(...a),to=new T.Vector3(...z),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),to.clone().sub(from).normalize());for(let i=0;i<10;i++){const p=from.clone().lerp(to,i/9);add(b,'metal',new T.TorusGeometry(r,.003,3,10),new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)));}}};
 const chest='Spine2',hips='Hips',head='Head';
 // Deep thoracic chassis with layered armour sloping around the small recessed head.
 box(chest,'dark',[.79,.49,.43],[0,1.42,.005],[],.04);
 box(chest,'dark',[.55,.23,.30],[0,1.11,.015],[],.025);
 for(const s of [-1,1]){
  // Each pectoral is a deep folded casing, split into offset upper and lower plates.
  box(chest,'plate',[.37,.25,.29],[s*.245,1.48,.13],[-.16,s*-.18,s*.055],.032);
  plate(chest,'plate',[[-.19,-.09],[.16,-.09],[.22,.01],[.15,.145],[-.14,.14],[-.22,.035]],[s*.245,1.54,.29],[s,1,1],[-.20,s*-.18,s*.04],.095);
  plate(chest,'plate',[[-.17,-.12],[.13,-.11],[.21,.035],[.15,.115],[-.17,.10],[-.21,-.01]],[s*.26,1.34,.29],[s,1,1],[.17,s*-.23,s*-.05],.105);
  plate(chest,'plate','jaw',[s*.35,1.22,.18],[s<0?-1.0:1.0,1.12,1],[.24,s*-.40,s*.11],.11);
  if(!low){
   for(const yy of [1.40,1.51])for(const xx of [-.10,.105])bolt(chest,s*.25+xx,yy,.345);
   piston(chest,[s*.37,1.40,.15],[s*.31,1.15,.12],.026);
   piston(chest,[s*.23,1.22,.26],[s*.20,1.06,.28],.033);
   cyl(chest,'metal',[s*.22,1.12,.27],.044,.032,[Math.PI/2,0,0]);
   louvres(chest,[s*.36,1.32,.275],.075,.095,3,[0,s*-.20,0]);
   ribbed(chest,[s*.40,1.48,-.02],[s*.40,1.19,.03],.027);
  }
  box(chest,'plate',[.15,.10,.18],[s*.20,1.65,.16],[-.10,s*.12,0],.015);
  box(chest,'dark',[.30,.055,.06],[s*.21,1.68,.23],[0,0,s*.09]);
  for(let i=0;i<3;i++)box(chest,'metal',[.032,.05,.025],[s*(.20+i*.047),1.67,.269],[0,0,s*.09],.004);
  for(const y of [1.29,1.55])for(const x of [.10,.36])bolt(chest,s*x,y,.337);
  if(!low){
   for(const dx of [-.11,.11])bolt(chest,s*.25+dx,1.59,.36);
   box(chest,'metal',[.042,.017,.02],[s*.30,1.58,.35],[-.20,s*-.14,s*.05],.003);
   box(chest,'dark',[.12,.014,.015],[s*.24,1.36,.331],[.06,s*-.16,0],.002);
   box(chest,'metal',[.025,.06,.018],[s*.38,1.40,.326],[0,s*.08,0],.003);
  }
  // Rear radiator towers sit higher than the helmet, with forward-facing louvres.
  box(chest,'dark',[.28,.37,.24],[s*.34,1.86,-.12],[0,0,s*.04],.025);
  box(chest,'plate',[.31,.35,.07],[s*.34,1.88,.015],[0,0,s*.04],.016);
  box(chest,'dark',[.215,.24,.025],[s*.34,1.88,.062],[],.004);
  for(let i=0;i<6;i++)box(chest,'metal',[.19,.014,.033],[s*.34,1.78+i*.038,.082],[.18,0,0],.002);
  insetLight(chest,[s*.495,1.92,.063],.14);
  box(chest,'plate',[.21,.047,.21],[s*.34,2.065,-.11],[0,0,s*.04]);
  // Vent lines, rear engine plating and shoulder-to-back hydraulics.
  box(chest,'plate',[.28,.30,.10],[s*.255,1.48,-.27],[0,s*.12,0],.02);
  for(let j=0;j<4;j++)box(chest,'dark',[.21,.014,.026],[s*.255,1.38+j*.06,-.33],[],.002);
  piston(chest,[s*.43,1.76,-.09],[s*.30,1.20,-.16],.033);
  cyl(chest,'dark',[s*.42,1.47,-.01],.13,.11,[0,0,Math.PI/2]);
  cyl(chest,'metal',[s*.48,1.47,-.01],.082,.025,[0,0,Math.PI/2]);
  insetLight(chest,[s*.31,1.25,.34],.09);
 }
 // Recessed chest core: thick armour lip, black well and three angled red slats.
 box(chest,'dark',[.26,.24,.18],[0,1.30,.285],[.18,0,0],.024);
 plate(chest,'plate',[[-.145,-.12],[.10,-.13],[.155,.06],[.11,.145],[-.13,.12]],[0,1.32,.29],[1,1,1],[.20,0,0],.13);
 box(chest,'dark',[.172,.14,.034],[0,1.32,.39],[.20,0,0],.008);
 for(let i=0;i<3;i++)box(chest,'red',[.125,.018,.012],[0,1.28+i*.033,.432-i*.006],[.20,0,0],.002);
 glow(chest,[0,1.32,.441],.27,.22);
 if(!low)for(const x of [-.12,.12])for(const y of [1.23,1.41])bolt(chest,x,y,.37);
 for(let i=0;i<3;i++)box(chest,'plate',[.30-i*.025,.065,.13],[0,1.14-i*.072,.17],[.10,0,0]);
 box(chest,'plate',[.14,.40,.13],[0,1.50,-.31],[],.015);
 for(let i=0;i<5;i++)box(chest,'metal',[.18,.017,.03],[0,1.33+i*.076,-.39],[],.002);
 // Pelvis: belt girdle and suspended hip flaps over visible actuators.
 box(hips,'dark',[.53,.19,.30],[0,.98,.015],[],.025);
 box(hips,'plate',[.31,.09,.28],[0,1.075,.04],[],.014);
 for(const s of [-1,1]){
  plate(hips,'plate','jaw',[s*.18,.98,.23],[s<0?-1.1:1.1,1.1,1],[0,s*.12,s*-.08],.08);
  cyl(hips,'dark',[s*.28,.94,.02],.11,.11,[0,0,Math.PI/2]);
  cyl(hips,'metal',[s*.34,.94,.02],.06,.025,[0,0,Math.PI/2]);
  box(hips,'plate',[.13,.17,.25],[s*.33,.93,.04],[0,0,s*-.10],.016);
 }
 // Small wedge-like sensor head embedded between collar cheeks.
 box(head,'dark',[.29,.18,.26],[0,1.72,.045],[],.027);
 plate(head,'plate','jaw',[0,1.72,.17],[1.12,.85,1],[-.08,0,0],.085);
 box(head,'dark',[.26,.04,.04],[0,1.737,.225],[],.006);
 box(head,'eye',[.22,.013,.012],[0,1.738,.250],[],.002);
 box(head,'plate',[.26,.047,.21],[0,1.816,.06],[-.16,0,0],.016);
 if(!low){
  box(head,'metal',[.16,.012,.045],[0,1.84,.04],[-.16,0,0],.004);
  for(const x of [-.13,.13]){bolt(head,x,1.78,.205,.006);box(head,'dark',[.025,.065,.02],[x,1.70,.215],[0,0,x*.2],.003);}
 }
 glow(head,[0,1.738,.258],.34,.075,'eye');
 for(const s of [-1,1]){
  box(head,'plate',[.065,.09,.15],[s*.155,1.71,.075],[0,s*.15,s*.06]);
  cyl(head,'dark',[s*.19,1.735,.04],.043,.025,[0,0,Math.PI/2]);
  cyl(head,'metal',[s*.207,1.735,.04],.024,.008,[0,0,Math.PI/2]);
 }
 const sides=[[-1,'Right'],[1,'Left']];
 for(const [s,name] of sides){
  const arm=name+'Arm',fore=name+'ForeArm',hand=name+'Hand',thigh=name+'UpLeg',shin=name+'Leg',foot=name+'Foot',x=s*.53,lx=s*.245;
  // High shoulder armour overlaps the top of the humerus, leaving a real hinge.
  cyl(arm,'dark',[s*.47,1.55,.015],.135,.19,[0,0,Math.PI/2]);
  cyl(arm,'metal',[s*.57,1.55,.015],.085,.028,[0,0,Math.PI/2]);
  box(chest,'plate',[.39,.30,.42],[s*.56,1.64,.02],[.04,s*.12,s*.10],.037);
  plate(chest,'plate','shoulder',[s*.56,1.65,.205],[s<0?-1.02:1.02,.88,1],[.12,s*-.19,s*.13],.115);
  box(chest,'plate',[.32,.075,.34],[s*.56,1.805,.015],[-.08,s*.10,s*.10],.025);
  if(!low){
   louvres(chest,[s*.57,1.74,.282],.12,.065,3,[.12,s*-.15,s*.12]);
   for(const dx of [-.13,.13])for(const y of [1.58,1.75])bolt(chest,s*.56+dx,y,.278);
   motor(arm,[s*.51,1.53,-.01],.12,.16);
  }
  if(!low){
   plate(chest,'plate',[[-.10,-.045],[.09,-.045],[.11,.02],[.06,.05],[-.09,.05]],[s*.57,1.76,.27],[1,1,1],[.06,s*-.14,s*.11],.035);
   for(const dx of [-.07,.07])bolt(chest,s*.57+dx,1.76,.30);
  }
  box(chest,'plate',[.12,.29,.25],[s*.72,1.61,.04],[0,s*.12,s*.12],.02);
  insetLight(chest,[s*.735,1.63,.255],.13);
  box(arm,'dark',[.23,.25,.22],[x,1.35,.025],[0,0,s*.11],.015);
  plate(arm,'plate','jaw',[x,1.39,.19],[s<0?-1.0:1.0,1.45,1],[0,s*-.12,s*.10],.09);
  piston(arm,[x+s*.09,1.48,-.07],[x+s*.10,1.25,-.03],.026);
  // Twin-disc elbow and enclosed forearm with inset power strip.
  cyl(fore,'dark',[x,1.20,.025],.096,.24,[0,0,Math.PI/2]);
  cyl(fore,'metal',[x+s*.13,1.20,.025],.062,.024,[0,0,Math.PI/2]);
  box(fore,'dark',[.22,.22,.22],[x,1.08,.03],[],.024);
  plate(fore,'plate','jaw',[x,1.09,.18],[s<0?-.94:.94,1.35,1],[0,s*-.06,0],.085);
  box(hand,'dark',[.14,.11,.15],[x,.985,.13],[],.013);
  for(let f=0;f<4;f++)box(hand,'metal',[.025,.05,.04],[x+(f-1.5)*.032,.94,.20],[],.004);
  // Large hip-to-knee cuirass, side pistons and knee drums.
  box(thigh,'dark',[.30,.35,.29],[lx,.74,.035],[0,0,s*.10],.025);
  box(thigh,'plate',[.33,.24,.30],[lx,.80,.055],[-.20,s*-.08,s*.12],.032);
  plate(thigh,'plate',[[-.16,-.08],[.13,-.105],[.18,.03],[.10,.16],[-.13,.14],[-.18,.045]],[lx,.81,.22],[s,1,1],[-.24,s*-.18,s*.10],.10,.028);
  plate(thigh,'plate',[[-.14,-.085],[.10,-.105],[.16,.035],[.13,.10],[-.12,.095],[-.17,.015]],[lx,.635,.205],[s,1,1],[.26,s*-.19,s*-.04],.09,.022);
  box(thigh,'plate',[.11,.23,.26],[lx+s*.145,.75,.02],[0,0,s*.10],.014);
  for(const y of [.67,.84])for(const xx of [-.10,.10])bolt(thigh,lx+xx,y,.30);
  piston(thigh,[lx+s*.15,.89,-.06],[lx+s*.17,.58,-.02],.030);
  cyl(shin,'dark',[lx,.51,.06],.13,.26,[0,0,Math.PI/2]);
  cyl(shin,'metal',[lx+s*.15,.51,.06],.082,.025,[0,0,Math.PI/2]);
  cyl(shin,'dark',[lx+s*.17,.51,.06],.041,.012,[0,0,Math.PI/2]);
  if(!low)for(const xx of [-.10,.10]){
   box(shin,'plate',[.055,.11,.12],[lx+xx,.54,.15],[0,0,xx*-.5],.009);
   bolt(shin,lx+xx,.54,.22);
  }
  box(shin,'dark',[.19,.085,.07],[lx,.50,.24],[],.006);
  for(let i=0;i<3;i++)box(shin,'metal',[.15,.008,.035],[lx,.475+i*.025,.28],[.1,0,0],.002);
  for(const x of [-.115,.115])plate(shin,'plate','jaw',[lx+x,.50,.23],[x<0?-.45:.45,.70,1],[.12,x*1.4,0],.08);
  if(!low)motor(shin,[lx+s*.14,.51,.06],.11,.045);
  box(shin,'dark',[.24,.31,.21],[lx,.285,.035],[],.02);
  box(shin,'plate',[.26,.20,.20],[lx,.23,.055],[.11,0,s*.08],.022);
  plate(shin,'plate','shin',[lx,.285,.20],[s<0?-1.00:1.00,.80,1],[.22,s*-.07,s*.045],.10);
  if(!low){
   plate(shin,'plate',[[-.10,-.045],[.11,-.045],[.135,.025],[.07,.065],[-.11,.05]],[lx,.365,.265],[1,1,1],[.22,s*-.08,s*.04],.035);
   for(const x of [-.10,.10]){bolt(shin,lx+x,.36,.29);bolt(shin,lx+x,.16,.29);}
   ribbed(shin,[lx-s*.09,.42,-.08],[lx-s*.10,.15,-.01],.018);
  }
  piston(shin,[lx+s*.13,.46,-.01],[lx+s*.15,.17,.04],.029);
  box(shin,'plate',[.065,.17,.075],[lx+s*.16,.30,.23],[.10,0,s*.10]);
  insetLight(shin,[lx+s*.16,.30,.285],.12);
  // Broad feet with heel actuator, ankle collar and three thick armoured toes.
  cyl(foot,'dark',[lx,.13,.02],.075,.26,[0,0,Math.PI/2]);
  box(foot,'dark',[.40,.08,.48],[lx,.043,.13],[],.012);
  box(foot,'plate',[.33,.15,.26],[lx,.14,.045],[-.10,0,0],.023);
  for(let t=-1;t<=1;t++){
   box(foot,'plate',[.13,.15,.28],[lx+t*.128,.12,.27],[-.28,0,t*.045],.022);
   box(foot,'dark',[.085,.014,.17],[lx+t*.128,.193,.27],[-.28,0,0],.002);
   if(!low){for(let g=0;g<3;g++)box(foot,'metal',[.067,.007,.014],[lx+t*.128,.203-g*.007,.24+g*.045],[-.28,0,0],.001);bolt(foot,lx+t*.128,.125,.425,.006);}
  }
  box(foot,'plate',[.33,.12,.16],[lx,.11,-.13],[],.015);
  insetLight(foot,[lx,.205,.22],.105,false);
 }
 // Thick, stepped ballistic shield with four unequal plates and side hinge train.
 const shield='LeftForeArm',sx=.75,shieldSections=[{y:1.53,h:.84,w:1.13,z:.29},{y:1.13,h:.78,w:1.14,z:.32},{y:.75,h:.77,w:1.10,z:.35},{y:.37,h:.74,w:1.04,z:.38}];
 box(shield,'dark',[.51,1.55,.20],[sx,.99,.14],[],.035);
 for(let i=0;i<shieldSections.length;i++){
  const {y,h,w,z}=shieldSections[i];
  plate(shield,'plate','shield',[sx,y,z],[w,h,1],[i===0?-.035:.035,-.075,-.025+i*.012],.13);
  box(shield,'metal',[.38,.014,.022],[sx,y-.19*h,z+.078],[],.003);
  for(const xx of [-.17,.17])for(const yy of [-.13,0,.13])bolt(shield,sx+xx,y+yy*h,z+.080);
  box(shield,'plate',[.08,.26,.14],[sx-.30,y,.18],[0,.12,.025],.018);
  insetLight(shield,[sx+.29,y,z-.03],.23);
  cyl(shield,'dark',[sx-.30,y-.11,.17],.043,.12,[0,0,Math.PI/2]);
  cyl(shield,'metal',[sx-.335,y-.11,.17],.025,.08,[0,0,Math.PI/2]);
  if(!low){piston(shield,[sx-.26,y+.09,.13],[sx-.26,y-.14,.13],.021);bolt(shield,sx-.29,y+.02,.28);}
 }
 for(const side of [-1,1]){const x=sx+side*.29;box(shield,'dark',[.038,1.49,.08],[x,.97,.15]);piston(shield,[x,1.68,.07],[x,.23,.07],.021);}
 for(const [y,z,top] of [[1.53,.37,true],[1.11,.40,false]]){
  const g=new T.PlaneGeometry(.34,.19),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*.5+(top?.5:0));
  add(shield,'decal',g,matrix([sx,y,z],[0,-.075,-.025]));
 }
 // Heavy rotary cannon: breech, locking collars, six long barrels and red bore rings.
 const gun='RightForeArm',gx=-.52,gy=1.12;
 cyl(gun,'dark',[gx,gy,.10],.155,.28);
 cyl(gun,'plate',[gx,gy,.20],.18,.23);
 cyl(gun,'metal',[gx,gy,.30],.147,.025);
 box(gun,'plate',[.31,.11,.25],[gx,gy+.13,.12],[-.08,0,0],.018);
 insetLight(gun,[gx-.145,gy+.035,.24],.09);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=gx+Math.cos(a)*.09,y=gy+Math.sin(a)*.09;
  cyl(gun,'metal',[x,y,.55],.027,.51);
  if(!low)for(const z of [.34,.48,.65])cyl(gun,'dark',[x,y,z],.030,.018);
  cyl(gun,'dark',[x,y,.805],.024,.025);
  torus(gun,'red',[x,y,.822],.019,.0035);
 }
 for(const z of [.38,.68]){cyl(gun,'dark',[gx,gy,z],.139,.042);cyl(gun,'metal',[gx,gy,z+.027],.137,.014);}
 cyl(gun,'dark',[gx,gy,.817],.032,.025);
 ribbed(gun,[gx-.10,.99,-.03],[gx-.19,gy-.06,.22],.030);
 if(!low){
  // Armoured breech collar, recesses and ammunition feed hose.
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=gx+Math.cos(a)*.17,y=gy+Math.sin(a)*.17;box(gun,'plate',[.055,.065,.14],[x,y,.18],[0,0,a],.008);}
  louvres(gun,[gx,gy+.145,.18],.16,.07,4,[.12,0,0]);
  const curve=new T.CatmullRomCurve3([new T.Vector3(gx-.09,.99,-.08),new T.Vector3(gx-.24,.95,-.01),new T.Vector3(gx-.25,.98,.23),new T.Vector3(gx-.15,1.10,.27)]);
  add(gun,'dark',new T.TubeGeometry(curve,18,.037,10,false));
  for(let i=0;i<15;i++){const t=i/14,c=curve.getPoint(t),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangent(t));add(gun,'metal',new T.TorusGeometry(.037,.006,4,12),new T.Matrix4().compose(c,q,new T.Vector3(1,1,1)));}
  for(const z of [.32,.70])for(let i=0;i<6;i++){const a=i*Math.PI/3;bolt(gun,gx+Math.cos(a)*.12,gy+Math.sin(a)*.12,z,.006);}
 }
 // Batch all rigidly skinned pieces by six shared materials.
 const names=[...new Set(pieces.map(p=>p.bone))],by=new Map();
 for(const p of pieces){if(!by.has(p.key))by.set(p.key,[]);by.get(p.key).push(p);}
 for(const p of pieces)if(['red','eye'].includes(p.key)&&p.geometry.attributes.position.count>6){const uv=p.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.5,.5);}
 const parts=[...by].map(([key,items])=>{const g=merge(items.map(p=>p.geometry)),n=g.attributes.position.count,indices=new Float32Array(n*4),weights=new Float32Array(n*4);let offset=0;for(const p of items){const count=p.geometry.index?p.geometry.index.count:p.geometry.attributes.position.count,index=names.indexOf(p.bone);for(let i=0;i<count;i++){indices[(offset+i)*4]=index;weights[(offset+i)*4]=1;}offset+=count;}g.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.computeBoundingSphere();return {key,geometry:g};});
 for(const p of pieces)p.geometry.dispose();
 const result={names,parts};cache.set(detail,result);return result;
}
