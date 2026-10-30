import * as T from './vendor/three.webgpu.min.js';
import {matrix,loft,profile,limb} from './geo.js';
import {profiledPanel} from './armor-profiles.js';
import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';
import {LISTENER_TOOL} from './enemy-weapon-layout.js';

// E-06 is an exposed acoustic machine, not an infantry helmet with accessories.
// All coordinates are metres in the shared humanoid bind frame (-Z forward).
// Each assembly is rigidly skinned by the factory and merged by material.
const axle=new T.CylinderGeometry(1,1,1,12,1,true).rotateZ(Math.PI/2);
const jointCollar=new T.TorusGeometry(1,.12,3,12).rotateY(Math.PI/2);
const ring=new T.TorusGeometry(1,.12,4,16);
const lens=new T.SphereGeometry(1,10,5);
const screw=new T.CylinderGeometry(1,1,1,6).rotateX(Math.PI/2);
const box=new T.BoxGeometry(1,1,1);
// Closed, chamfered machine casings. Each cross-section has a broad face,
// real side walls and a rear face; the ends taper around mechanical sockets.
function casing(rows){
 const p=[],uv=[],idx=[];
 rows.forEach(([y,x,z,offset=0],r)=>{
  const b=Math.min(x,z)*.30,outline=[[-x+b,-z],[x-b,-z],[x,-z+b],[x,z-b],[x-b,z],[-x+b,z],[-x,z-b],[-x,-z+b]];
  for(let k=0;k<8;k++){p.push(outline[k][0],y,outline[k][1]+offset);uv.push(k/8,r/(rows.length-1));if(r){const a=(r-1)*8+k,b=(r-1)*8+(k+1)%8,c=r*8+k,d=r*8+(k+1)%8;idx.push(a,c,b,b,c,d);}}
 });
 for(const [r,reverse] of [[0,false],[rows.length-1,true]]){const center=p.length/3;p.push(0,rows[r][0],rows[r][3]||0);uv.push(.5,.5);for(let k=0;k<8;k++){const a=r*8+k,b=r*8+(k+1)%8;idx.push(center,reverse?b:a,reverse?a:b);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const chest=casing([[-.19,.035,.040],[-.12,.075,.075,-.012],[.105,.175,.12],[.15,.15,.10],[.18,.09,.06,.02]]);
const shoulder=casing([[-.065,.055,.065],[-.04,.095,.115],[.045,.095,.115],[.075,.06,.07]]).rotateZ(Math.PI/2);
const thigh=casing([[-.17,.028,.037],[-.135,.052,.072],[.115,.070,.080],[.175,.038,.040]]);
const shin=casing([[-.18,.023,.032],[-.14,.032,.049],[.115,.050,.065],[.17,.028,.035]]);
const forearm=casing([[-.13,.025,.033],[-.10,.043,.059],[.105,.046,.068],[.14,.025,.035]]);
const jointCap=new T.CylinderGeometry(.79,1,1,12).rotateZ(Math.PI/2);
const toeShell=profile([[-.048,.005],[-.045,.027],[.012,.034],[.035,.014],[.035,.005]],.034,0);
const headRoof=profile([[-.205,-.025],[-.18,.027],[-.065,.075],[.10,.04],[.115,-.025]],.235,.003);
const headCheek=profile([[-.17,.01],[-.15,-.075],[-.035,-.10],[.075,-.04],[.07,.035]],.025,.002);
// Extruded profiles use world-unit UVs; keep their paint in the body atlas tile.
for(const g of [headRoof,headCheek,toeShell]){
 const uv=g.attributes.uv;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<uv.count;i++){minX=Math.min(minX,uv.getX(i));maxX=Math.max(maxX,uv.getX(i));minY=Math.min(minY,uv.getY(i));maxY=Math.max(maxY,uv.getY(i));}
 for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-minX)/Math.max(.001,maxX-minX),(uv.getY(i)-minY)/Math.max(.001,maxY-minY));
}
const opticalDisk=new T.CircleGeometry(1,24).rotateY(Math.PI);
for(let i=0;i<opticalDisk.attributes.uv.count;i++)opticalDisk.attributes.uv.setX(i,opticalDisk.attributes.uv.getX(i)+1);

function reflector(){
 const p=[],uv=[],idx=[],steps=20,rings=4;
 // Closed shallow paraboloid. The opening points forward (-Z).
 for(const back of [false,true])for(let j=0;j<=rings;j++){
  const r=.245*j/rings,z=.046-.105*(r/.245)**2+(back?.009:0);
  for(let k=0;k<=steps;k++){
   const angle=k/steps*Math.PI*2;p.push(Math.cos(angle)*r,Math.sin(angle)*r,z);uv.push(.5+Math.cos(angle)*r*1.9,1.5+Math.sin(angle)*r*1.9);
   if(j&&k<steps){const b=(back?(rings+1)*(steps+1):0)+j*(steps+1)+k,a=b-steps-1;if(back)idx.push(a,a+1,b,a+1,b+1,b);else idx.push(a,b,a+1,a+1,b,b+1);}
  }
 }
 const outer=rings*(steps+1),other=(rings+1)*(steps+1)+outer;
 for(let k=0;k<steps;k++)idx.push(outer+k,outer+k+1,other+k,other+k,outer+k+1,other+k+1);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const dish=reflector();
const rim=new T.TorusGeometry(.245,.006,4,24);
const innerRim=new T.TorusGeometry(.17,.003,3,20);
const smallRim=new T.TorusGeometry(.085,.003,3,16);

export function buildListener({armor,dark,servo,hazard,optics,glow,boneAt,assembly,thorax,pelvis,ranged,detail='high'}){
 const detailed=detail!=='low',ref=HUMAN_REFERENCE.joints,a=assembly(thorax),hips=assembly(pelvis),legRig=[],armRig=[];
 const addBox=(to,mat,size,at,rot=[0,0,0])=>to.add(box,mat,matrix(at,rot,size),mat!==glow&&mat!==optics);
 const strut=(to,mat,from,end,r1,r2=r1,shadow=true)=>to.add(limb(from,end,r1,r2,Math.max(r1,r2)<.02?5:8),mat,null,shadow);
 const bolt=(to,at,r=.004)=>to.add(screw,servo,matrix(at,[0,0,0],[r,.004,r]));
 const motor=(to,at,r=.05,width=.065)=>{
  if(r>.05)to.add(jointCollar,dark,matrix([at[0]+Math.sign(at[0]||1)*(width*.5+.010),at[1],at[2]],[0,0,0],[r*.82,r*.82,r*.82]));
  to.add(axle,dark,matrix(at,[0,0,0],[width,r,r]));
  for(const side of [-1,1])to.add(jointCap,servo,matrix([at[0]+side*(width*.5+.003),at[1],at[2]],[0,side===1?0:Math.PI,0],[.012,r*.82,r*.82]));
  if(detailed){
   const side=Math.sign(at[0])||1,x=at[0]+side*(width*.5+.015);
   to.add(ring,servo,matrix([x,at[1],at[2]],[0,Math.PI/2,0],[r*.62,r*.62,r*.62]));
   to.add(axle,dark,matrix([x+side*.003,at[1],at[2]],[0,0,0],[.007,r*.29,r*.29]));
   if(r>.045)for(let k=0;k<6;k++){
    const t=k*Math.PI/3;
    to.add(jointCap,dark,matrix([x,at[1]+Math.cos(t)*r*.62,at[2]+Math.sin(t)*r*.62],[0,0,0],[.004,.0035,.0035]));
   }
  }
 };
 const hose=(to,points,r=.007,mat=dark)=>{
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  to.add(new T.TubeGeometry(curve,detailed?14:7,r,detailed?6:4,false),mat);
 };
 const plate=(to,geometry,at,rot=[0,0,0],scale=[1,1,1])=>to.add(geometry,armor,matrix(at,rot,scale));
 const seam=(to,from,end)=>{
  const v=new T.Vector3(...end).sub(new T.Vector3(...from));
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
  to.add(box,dark,new T.Matrix4().compose(new T.Vector3(...from).add(new T.Vector3(...end)).multiplyScalar(.5),q,new T.Vector3(.002,v.length(),.003)));
 };
 const point=(name,side)=>[...ref[(side===-1?'Left':'Right')+name]];
 const between=(from,to,t)=>from.map((v,i)=>v+(to[i]-v)*t);

 // Open thoracic cage with a narrow hydraulic waist and suspended chest plates.
 strut(a,dark,[0,1.04,.035],[0,1.61,.045],.047,.054);
 strut(a,servo,[0,1.08,-.015],[0,1.37,-.03],.020,.026);
 plate(a,chest,[0,1.435,-.025],[.11,0,0],[.85,.9,1]);
 for(const side of [-1,1]){
  strut(a,dark,[side*.065,1.12,.015],[side*.18,1.52,.055],.027,.035);
  strut(a,servo,[side*.065,1.15,.00],[side*.15,1.39,.0],.012,.012);
  strut(a,dark,[0,1.54,.04],[side*.20,1.50,.04],.045,.055);

  plate(a,shoulder,[side*.19,1.55,.032],[.06,side*.08,-side*.13],[1,1,1]);
  for(const p of [[side*.105,1.51,-.114],[side*.17,1.43,-.126],[side*.105,1.28,-.111]])bolt(a,p);
  const chestFrame=matrix([side*.06,1.435,-.025],[.11,0,0]);
  const cp=p=>new T.Vector3(...p).applyMatrix4(chestFrame).toArray();
  seam(a,cp([-.04,.10,-.126]),cp([.04,.10,-.126]));
  seam(a,cp([.04,.10,-.126]),cp([.075,.015,-.125]));
  seam(a,cp([-.06,-.035,-.125]),cp([-.04,-.12,-.096]));
  for(const p of [[-.04,.10,-.132],[.065,.025,-.143],[-.03,-.10,-.117]])bolt(a,cp(p),.003);
  hose(a,[[side*.14,1.60,-.035],[side*.23,1.51,-.09],[side*.20,1.31,-.08],[side*.075,1.19,.04]],.011);
  hose(a,[[side*.07,1.62,.11],[side*.15,1.50,.19],[side*.17,1.30,.13],[side*.05,1.14,.06]],.005,servo);
  addBox(a,dark,[.065,.12,.075],[side*.145,1.345,.04],[.10,side*.10,0]);
  for(let k=0;k<3;k++){
   strut(a,servo,[side*(.13+k*.017),1.31,.005],[side*(.13+k*.017),1.405,.005],.006);
  }
  if(detailed){
   for(let k=0;k<2;k++)hose(a,[[side*(.13-k*.018),1.60,-.01],[side*(.235-k*.018),1.49,-.105-k*.01],[side*(.205-k*.015),1.30,-.08],[side*.065,1.19,.025]],.006-k*.001,k?servo:dark);
   // Clavicle brackets, hose sockets and flank ribs sit off the main shield.
   for(let k=0;k<3;k++){
    addBox(a,armor,[.040,.027,.075],[side*(.12+k*.025),1.53-k*.035,.07],[.1,side*.3,side*.2]);
    addBox(a,dark,[.031,.009,.07],[side*(.12+k*.025),1.535-k*.035,.07],[.1,side*.3,side*.2]);
   }
   for(const y of [1.36,1.46,1.56]){
    addBox(a,servo,[.025,.014,.020],[side*.17,y,.105]);
    bolt(a,[side*.17,y,.09],.003);
   }
  }
  addBox(a,dark,[.062,.09,.045],[side*.12,1.31,-.11],[.12,side*.12,0]);
  for(let i=0;i<3;i++)addBox(a,servo,[.048,.008,.006],[side*.12,1.285+i*.025,-.136]);

 }
 // Shoulder stencil, using the shared decal material.
 a.add(new T.PlaneGeometry(.065,.045).rotateY(Math.PI),hazard,matrix([-.205,1.57,-.097],[.12,.0,.13]));
 // Floating pelvis plates keep the waist free of the old horizontal blocks.
 hips.add(loft([[.885,.075,.06],[.94,.15,.10],[1.005,.13,.085],[1.04,.065,.055]],10),dark);
 for(const side of [-1,1]){
  motor(hips,[side*.11,.96,0],.068,.075);
  plate(hips,thigh,[side*.14,.955,-.075],[.08,-side*.23,side*.25],[.85,.45,1]);
  hose(hips,[[side*.13,1.04,.07],[side*.20,1.00,.11],[side*.17,.87,.04]],.008);
 }

 // Small wedge-shaped optical head; no human jaw, helmet or paired eyes.
 const head=boneAt('sensor-head',ref.Head,thorax),h=assembly(head);
 for(const side of [-1,1]){
  strut(h,dark,[side*.045,1.57,.04],[side*.055,1.82,.035],.014,.018);
  strut(h,servo,[side*.035,1.60,-.015],[side*.045,1.81,-.015],.007);
  hose(h,[[side*.07,1.62,.065],[side*.10,1.71,.095],[side*.055,1.82,.07]],.007);
 }
 strut(h,dark,[0,1.59,.035],[0,1.80,.025],.034,.028);
 for(const side of [-1,1]){
  hose(h,[[side*.08,1.60,.075],[side*.13,1.72,.10],[side*.08,1.85,.08]],.009);
  hose(h,[[side*.075,1.59,.10],[side*.10,1.76,.14],[side*.055,1.88,.09]],.014);
  hose(h,[[side*.04,1.62,-.015],[side*.075,1.73,.015],[side*.05,1.82,.005]],.009);
  for(let i=0;i<3;i++)addBox(h,servo,[.035,.005,.006],[side*.102,1.845+i*.016,-.146],[0,side*.12,0]);
 }
 h.add(loft([[1.79,.045,.055],[1.82,.075,.09],[1.89,.095,.11,-.012],[1.95,.075,.085]],12),dark);
 plate(h,headRoof,[0,1.935,-.015]);
 for(const side of [-1,1]){
  plate(h,headCheek,[side*.098,1.87,0],[0,-side*.13,0]);
  bolt(h,[side*.112,1.911,-.138],.005);
  addBox(h,servo,[.032,.008,.01],[side*.082,1.918,-.177],[0,0,side*.08]);
  if(detailed){
   for(let k=0;k<3;k++)addBox(h,dark,[.010,.018,.012],[side*(.055+k*.016),1.944,-.11],[.10,0,0]);
   h.add(ring,dark,matrix([side*.102,1.872,-.01],[0,Math.PI/2,0],[.025,.025,.025]));
  }
 }
 h.add(ring,servo,matrix([0,1.88,-.175],[0,0,0],[.037,.037,.037]));
 h.add(lens,dark,matrix([0,1.88,-.181],[0,0,0],[.032,.032,.014]));
 h.add(opticalDisk,optics,matrix([0,1.88,-.209],[0,0,0],[.024,.024,.024]),false);
 strut(h,dark,[.065,1.95,.04],[.082,2.075,.08],.006,.003);

 // The two reflectors sit on the shoulders and tilt out from the head,
 // rather than standing vertically above it like circular ears.
 for(const side of [-1,1]){
  const pivot=boneAt(`receiver-${side}`,[side*.34,1.91,.145],thorax),d=assembly(pivot);
  const at=[side*.34,1.91,.145],rot=[-.10,side*.37,-side*.21],frame=matrix(at,rot,[1,1.1,1]);
  const p=v=>new T.Vector3(...v).applyMatrix4(frame).toArray();
  strut(a,dark,[side*.17,1.52,.12],[side*.34,1.85,.17],.029,.023);
  strut(a,servo,[side*.14,1.56,.19],[side*.32,1.88,.20],.010);
  motor(d,at,.055,.08);
  d.add(lens,dark,matrix([at[0],at[1],at[2]+.06],rot,[.05,.05,.025]));
  d.add(dish,armor,frame);d.add(rim,servo,frame);d.add(innerRim,dark,frame);d.add(smallRim,dark,frame);
  for(let k=0;k<8;k++){
   const angle=k/8*Math.PI*2,co=Math.cos(angle),si=Math.sin(angle);
   strut(d,dark,p([co*.05,si*.05,.035]),p([co*.235,si*.235,-.056]),.0035);
   bolt(d,p([co*.228,si*.228,-.06]),.004);
  }
  strut(d,servo,p([0,0,.045]),p([0,0,-.07]),.009);
  d.add(lens,dark,matrix(p([0,0,-.075]),rot,[.022,.022,.012]));
  // Two short signal bars and fine cable conduits inside each dish.
  for(const y of [-.14,.14]){
   const start=p([.07,y,-.033]),end=p([.07,y+Math.sign(y)*.054,-.056]);
   strut(d,optics,start,end,.0025,.0025,false);
  }
  hose(a,[[side*.11,1.59,.18],[side*.20,1.75,.24],[side*.30,1.88,.20]],.008);
 }
 addBox(a,dark,[.12,.24,.09],[0,1.45,.16]);
 for(let i=0;i<5;i++)addBox(a,servo,[.10,.006,.01],[0,1.37+i*.034,.211]);

 for(const side of [-1,1]){
  const s=point('Arm',side),e=point('ForeArm',side),w=point('Hand',side);
  const upper=boneAt(`arm-${side}-shoulder`,s,thorax),lower=boneAt(`arm-${side}-elbow`,e,upper),wrist=boneAt(`arm-${side}-wrist`,w,lower);
  const u=assembly(upper),l=assembly(lower),f=assembly(wrist);
  motor(u,s,.056,.075);motor(l,e,.048,.07);motor(f,w,.034,.052);
  strut(u,dark,s,e,.025,.022);
  strut(u,servo,[s[0]+side*.028,s[1]-.035,s[2]-.03],[e[0]+side*.02,e[1]+.03,e[2]-.03],.009);
  plate(u,forearm,between(s,e,.52),[0,0,-side*.28],[.82,.74,1]);
  hose(u,[[s[0]-side*.02,s[1]-.025,s[2]+.04],[e[0]-side*.06,e[1]+.12,e[2]+.07],[e[0],e[1]+.015,e[2]+.035]],.006);
  strut(l,dark,e,w,.026,.021);
  plate(l,forearm,between(e,w,.48),[0,0,-side*.11],[1,1,1]);
  if(detailed){
   const fm=between(e,w,.48);
   addBox(l,armor,[.030,.13,.035],[fm[0]+side*.045,fm[1],fm[2]],[0,0,-side*.09]);
   for(let i=0;i<3;i++)addBox(l,dark,[.013,.005,.030],[fm[0]+side*.062,fm[1]-.04+i*.035,fm[2]],[0,0,-side*.09]);
   for(const y of [-.075,.075])bolt(l,[fm[0],fm[1]+y,fm[2]-.072],.0035);
  }
  strut(l,servo,[e[0]+side*.025,e[1]-.025,e[2]+.035],[w[0]+side*.025,w[1]+.045,w[2]+.035],.009);
  // Wrist computer and long tool housing match the asymmetric reference.
  const mid=between(e,w,.57);
  addBox(l,dark,[.067,.13,.035],[mid[0]+side*.026,mid[1],mid[2]-.042],[0,0,-side*.08]);
  if(side===-1){
   addBox(l,servo,[.064,.062,.007],[mid[0]-.02,mid[1]+.025,mid[2]-.065]);
   addBox(l,dark,[.05,.048,.008],[mid[0]-.02,mid[1]+.025,mid[2]-.070]);
   for(let k=0;k<5;k++)addBox(l,glow,[.004,.012+k%3*.006,.003],[mid[0]-.037+k*.009,mid[1]+.025,mid[2]-.076]);
  }else{
   addBox(l,armor,[.035,.23,.035],[mid[0]+.026,mid[1]-.025,mid[2]-.067],[0,0,-.08]);
   addBox(l,optics,[.004,.10,.005],[mid[0]+.026,mid[1],mid[2]-.088]);
  }
  const handFrame=new T.Matrix4().makeTranslation(...w)
   .multiply(new T.Matrix4().makeRotationY(side*Math.PI/2))
   .multiply(new T.Matrix4().makeTranslation(-w[0],-w[1],-w[2]));
  if(ranged&&side===1){
   // The wrist cuff and palm face into the handle. Finger rows run down
   // the grip, with phalanges wrapping across its front and the thumb above.
   for(const item of f.items)item.geometry.applyMatrix4(handFrame);
   addBox(f,dark,[.034,.063,.052],[w[0],w[1]-.035,w[2]+.002]);
   for(let finger=0;finger<3;finger++){
    const y=w[1]-.025-finger*.020;
    strut(f,servo,[w[0]-.007,y,w[2]-.012],[w[0]-.018,y,w[2]-.031],.006,.0055);
    strut(f,dark,[w[0]-.018,y,w[2]-.031],[w[0]-.042,y,w[2]-.033],.0055,.0045);
    strut(f,servo,[w[0]-.042,y,w[2]-.033],[w[0]-.055,y,w[2]-.012],.0045,.003);
   }
   strut(f,servo,[w[0]-.002,w[1]-.008,w[2]+.015],[w[0]-.025,w[1]+.004,w[2]-.008],.007,.0055);
   strut(f,dark,[w[0]-.025,w[1]+.004,w[2]-.008],[w[0]-.047,w[1]-.012,w[2]-.035],.0055,.004);
  }else{
   // Neutral hanging hands: palms medial, thumbs forward. Mirror the thumb
   // before rotating each hand a quarter turn around its own wrist.
   addBox(f,dark,[.055,.06,.035],[w[0],w[1]-.025,w[2]-.008]);
   for(let finger=0;finger<3;finger++){
    const x=w[0]+(finger-1)*.019;
    strut(f,servo,[x,w[1]-.055,w[2]-.015],[x,w[1]-.10,w[2]-.033],.006,.005);
    strut(f,dark,[x,w[1]-.10,w[2]-.033],[x,w[1]-.11,w[2]-.062],.005,.003);
   }
   strut(f,servo,[w[0]+side*.034,w[1]-.02,w[2]-.005],[w[0]+side*.045,w[1]-.065,w[2]-.042],.007,.004);
   for(const item of f.items)item.geometry.applyMatrix4(handFrame);
  }
  armRig.push({upper,lower,wrist,side});

  const hip=point('UpLeg',side),knee=point('Leg',side),ankle=point('Foot',side);
  const up=boneAt(`leg-${side}-hip`,hip,pelvis),lo=boneAt(`leg-${side}-knee`,knee,up),foot=boneAt(`leg-${side}-ankle`,ankle,lo);
  const v=assembly(up),c=assembly(lo),b=assembly(foot);
  motor(v,hip,.064,.072);motor(c,knee,.055,.078);motor(b,ankle,.038,.056);
  strut(v,dark,hip,knee,.035,.025);
  plate(v,thigh,between(hip,knee,.47),[.04,-side*.17,side*.075]);
  const tm=between(hip,knee,.47);
  for(let i=0;i<3;i++)addBox(v,dark,[.040,.005,.006],[tm[0],tm[1]+.07-i*.014,tm[2]-.048]);
  if(detailed){
   for(const y of [-.10,.10])bolt(v,[tm[0],tm[1]+y,tm[2]-.084],.004);
   addBox(v,armor,[.03,.17,.045],[tm[0]+side*.064,tm[1]-.015,tm[2]+.025],[0,0,side*.05]);
   for(let i=0;i<3;i++)addBox(v,servo,[.008,.006,.035],[tm[0]+side*.081,tm[1]+.04-i*.035,tm[2]+.025]);
  }
  strut(v,servo,[hip[0]+side*.042,hip[1]-.06,hip[2]+.025],[knee[0]+side*.04,knee[1]+.06,knee[2]+.025],.012,.010);
  hose(v,[[hip[0]-side*.03,hip[1]-.015,hip[2]+.06],[knee[0]-side*.045,knee[1]+.20,knee[2]+.07],[knee[0],knee[1]+.02,knee[2]+.035]],.007);
  strut(c,dark,knee,ankle,.025,.018);
  plate(c,shin,between(knee,ankle,.50),[.03,-side*.12,side*.035],[.86,1,1]);
  strut(c,dark,[knee[0]+side*.038,knee[1]-.035,knee[2]+.03],[ankle[0]+side*.03,ankle[1]+.12,ankle[2]+.03],.018,.014);
  strut(c,servo,[knee[0]+side*.038,knee[1]-.15,knee[2]+.03],[ankle[0]+side*.03,ankle[1]+.025,ankle[2]+.03],.008);
  hose(c,[[knee[0]-side*.03,knee[1]-.015,knee[2]+.03],[ankle[0]-side*.04,ankle[1]+.20,ankle[2]+.06],[ankle[0],ankle[1]+.015,ankle[2]+.02]],.006);
  // Splayed mechanical toes instead of humanoid boots, planted at y=0.
  strut(b,dark,ankle,[ankle[0],.052,ankle[2]-.035],.031,.027);
  for(const toe of [-1,0,1]){
   const x=ankle[0]+toe*.048,z=ankle[2]-.14+Math.abs(toe)*.035;
   strut(b,dark,[ankle[0]+toe*.018,.07,ankle[2]-.02],[x,.025,z],.019,.012);
   plate(b,toeShell,[x,0,z-.012],[0,toe*.12,0]);
  }
  strut(b,servo,[ankle[0],.07,ankle[2]+.01],[ankle[0],.022,ankle[2]+.07],.014,.009);
  legRig.push({upper:up,lower:lo,foot,side,hip,knee,ankle});
 }

 let groundGun=null,gunSignal=null;
 if(ranged){
  // One-handed acoustic tool: a long forearm housing rather than an infantry
  // rifle across the chest. The right-hand IK and ballistics share this frame.
  const p=LISTENER_TOOL.pivot,m=LISTENER_TOOL.muzzle;
  groundGun=boneAt('aimed-acoustic-tool',[p.x,p.y,p.z],thorax);const g=assembly(groundGun);
  addBox(g,dark,[.055,.065,.30],[p.x,p.y-.01,-.14]);
  plate(g,forearm,[p.x,p.y+.02,-.16],[Math.PI/2,0,0],[.65,1,.45]);
  addBox(g,dark,[.038,.12,.035],[p.x,p.y-.075,.0],[-.08,0,0]);
  addBox(g,armor,[.065,.065,.045],[p.x,p.y-.005,-.31]);
  addBox(g,optics,[.006,.005,.14],[p.x-.019,p.y+.052,-.18]);
  if(detailed)for(let k=0;k<5;k++){
   addBox(g,servo,[.006,.018,.015],[p.x+.035,p.y+.015,-.07-k*.041]);
   bolt(g,[p.x+.035,p.y+.015,-.075-k*.041],.0025);
  }
  strut(g,servo,[p.x,p.y,-.25],[m.x,m.y,m.z+.025],.009,.008);
  strut(g,dark,[p.x,p.y,-.28],[m.x,m.y,m.z+.01],.019,.014);
  g.add(ring,servo,matrix([m.x,m.y,m.z+.005],[0,0,0],[.02,.02,.02]));
  gunSignal=boneAt('weapon-ready-emitter',[m.x,m.y,m.z],groundGun);
  assembly(gunSignal).add(lens,glow,matrix([m.x,m.y,m.z],[0,0,0],[.011,.011,.005]),false);
 }
 return {legRig,armRig,groundGun,gunSignal,sensorAnchor:[0,1.88],hipHeight:ref.LeftUpLeg[1]};
}
