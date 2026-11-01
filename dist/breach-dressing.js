import {BREACH_DRESSING} from './breach-dressing-layout.js';
import {BREACH} from './breach-layout.js';
import {createFunctionalProp} from './functional-props.js';

export function createBreachDressing(T,root,api){
 const {box,cylinder,cable,collar,solidDetail,materials:m,ownG,ownM,ownT}=api;
 const dynamic=[],screens=[],holograms=[],vapour=[],stateLights=[];
 const copper=ownM(new T.MeshStandardMaterial({color:0x976849,roughness:.52,metalness:.8}));
 const amber=ownM(new T.MeshBasicMaterial({color:0xf0b552,toneMapped:false}));
 const green=ownM(new T.MeshBasicMaterial({color:0x74efbd,toneMapped:false}));
 const ice=ownM(new T.MeshBasicMaterial({color:0x99e5ed,toneMapped:false}));
 const soft=ownM(new T.MeshBasicMaterial({color:0x449db6,transparent:true,opacity:.2,wireframe:true,depthWrite:false}));
 const stats={equipment:BREACH_DRESSING.length,computers:0,cableRuns:0,vents:0,scorchMarks:0,attachedSigns:0};
 const solid=(...args)=>solidDetail(box(...args));
 function routeCable(points,r=.045){stats.cableRuns++;return cable(points,r);}
 function panel(id,x,y,z,w,h,{yaw=0,kind='systems',caption='VESPER / SYSTÈMES'}={}){
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;const context=cv.getContext('2d');
  const tex=ownT(new T.CanvasTexture(cv));tex.colorSpace=T.SRGBColorSpace;
  const frame=box(m.dark,x,y,z-.075,w+.11,h+.12,.15);frame.rotation.y=yaw;
  const material=ownM(new T.MeshBasicMaterial({map:tex,color:0xffffff,toneMapped:false}));
  const mesh=new T.Mesh(ownG(new T.PlaneGeometry(w,h)),material);mesh.position.set(x+Math.sin(yaw)*.014,y,z+Math.cos(yaw)*.014);mesh.rotation.y=yaw;root.add(mesh);dynamic.push(mesh);
  screens.push({id,mesh,context,tex,kind,caption});stats.computers++;return mesh;
 }
 // Small, physically attached information plates; no overhead mission billboards.
 function plate(text,x,y,z,w=1.25){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#16212b';c.fillRect(0,0,512,96);c.fillStyle='#b4c7d0';c.font='600 30px sans-serif';c.fillText(text,16,58,480);const tex=ownT(new T.CanvasTexture(cv));tex.colorSpace=T.SRGBColorSpace;const material=ownM(new T.MeshBasicMaterial({map:tex}));box(m.steel,x,y,z-.035,w+.05,w*.1875+.05,.07);const mesh=new T.Mesh(ownG(new T.PlaneGeometry(w,w*.1875)),material);mesh.position.set(x,y,z+.005);root.add(mesh);stats.attachedSigns++;}
 function keyboard(x,y,z,w=1.2){box(m.dark,x,y,z,w,.06,.42);for(let row=0;row<3;row++)for(let col=0;col<11;col++)box(m.steel,x-w*.42+col*w*.083,y+.035,z-.12+row*.11,w*.06,.018,.07);}
 function chair(x,z){
    const chair=createFunctionalProp(T,'chair',{w:.72,d:.74,h:1.45,low:false,M:{
      steel:m.steel,paintedMetal:m.steel,dark:m.dark,black:m.rubber,wood:m.steel
    }});
    chair.position.set(x,0,z);root.add(chair);
    // The owning scene must dispose even of the new merged furniture geos.
    chair.traverse(mesh=>{if(mesh.isMesh)ownG(mesh.geometry);});
  }
 function console(p,holographic=false){
  // Physically usable console: open knee recess, supporting feet and beveled worktop.
  for(const dx of [-p.w*.41,p.w*.41])for(const dz of [-p.d*.34,p.d*.34])
   box(m.steel,p.x+dx,.49,p.z+dz,.09,.92,.09);
  box(m.dark,p.x,.56,p.z-p.d*.30,p.w*.82,.73,.08);
  box(m.steel,p.x,1,p.z,p.w,.13,p.d);
  box(m.dark,p.x,1.08,p.z-.2,p.w*.92,.04,.18);
  const count=p.w>3.5?2:1;
  for(let i=0;i<count;i++){const dx=(i-(count-1)/2)*1.48;box(m.steel,p.x+dx,1.34,p.z-.35,.09,.55,.09);panel(p.id+'-'+i,p.x+dx,1.79,p.z-.35,1.22,.65,{caption:p.zone==='reactor'?'RÉACTEUR / CONFINEMENT':'VESPER / RÉSEAU LOCAL',kind:p.zone});keyboard(p.x+dx,1.1,p.z+.24,1.05);}
  chair(p.x-p.w*.29,p.z+1.13);routeCable([[p.x,1,p.z-.65],[p.x-.7,.1,p.z-.8],[p.x-1.6,.07,p.z-.7],[p.x-1.7,.07,p.z-2]],.045);
  box(m.rubber,p.x+p.w*.35,1.17,p.z+.15,.24,.22,.15);cylinder(m.steel,p.x+p.w*.37,1.21,p.z+.48,.075,.18);
  if(holographic){
   cylinder(m.dark,p.x,1.16,p.z+.45,.5,.14);collar(p.x,1.25,p.z+.45,.46,m.blue);
   const display=new T.Group();display.position.set(p.x,1.7,p.z+.45);root.add(display);const body=new T.Mesh(ownG(new T.CylinderGeometry(.18,.18,.82,12)),soft);display.add(body);
   for(const y of [-.27,0,.27]){const ring=new T.Mesh(ownG(new T.TorusGeometry(.36,.018,5,24)),ice);ring.rotation.x=Math.PI/2;ring.position.y=y;display.add(ring);}
   holograms.push(display);
  }
 }
 function rack(p,batteries=false){
  // Open server/battery rack: structural uprights, accessible rear panel,
  // individual shelves. No opaque cuboid hides the modules from the player.
  for(const dx of [-p.w*.45,p.w*.45])for(const dz of [-p.d*.43,p.d*.43])
   box(m.steel,p.x+dx,p.h*.5,p.z+dz,.09,p.h,.09);
  box(m.dark,p.x,p.h*.5,p.z-p.d*.47,p.w*.92,p.h*.89,.045);
  box(m.steel,p.x,.12,p.z,p.w+.12,.24,p.d+.10);
  box(m.steel,p.x,p.h-.055,p.z,p.w+.12,.11,p.d+.1);
  for(let row=0;row<5;row++){
   const y=.38+row*(p.h-.5)/5;box(m.steel,p.x,y,p.z+p.d/2+.03,p.w*.84,.1,.08);
   for(const dx of [-.72,0,.72]){
    if(batteries){cylinder(m.steel,p.x+dx,y+.15,p.z+p.d/2-.3,.22,.32,[Math.PI/2,0,0]);collar(p.x+dx,y+.15,p.z+p.d/2-.1,.24,amber,'z');}
    else{box(m.rubber,p.x+dx,y+.16,p.z+p.d/2+.06,.55,.21,.07);box(m.blue,p.x+dx-.19,y+.16,p.z+p.d/2+.104,.055,.055,.015);}
   }
  }
  if(!batteries)panel(p.id,p.x,p.h-.32,p.z+p.d/2+.08,1.55,.34,{caption:'NŒUD / MÉMOIRE LOCALE',kind:'servers'});
  routeCable([[p.x,2.4,p.z-p.d/2],[p.x,2.8,p.z-p.d/2-.6],[p.x+1.2,3,p.z-3]],.08);
 }
 for(const p of BREACH_DRESSING){
  if(p.type==='console'||p.type==='holo-console')console(p,p.type==='holo-console');
  else if(p.type==='servers'||p.type==='batteries')rack(p,p.type==='batteries');
  else if(p.type==='pod'){
   solid(m.dark,p.x,.22,p.z,p.w+.3,.44,p.d+.2);cylinder(m.steel,p.x,1.8,p.z,1.55,p.d-1,[Math.PI/2,0,0]);
   for(const z of [-2.4,-1.6,1.6,2.4])collar(p.x,1.8,p.z+z,1.62,m.steel,'z');
   for(const side of [-1,1]){solid(m.dark,p.x+side*1.7,1.45,p.z,1.1,2.5,p.d-1);box(m.blue,p.x+side*2.26,1.6,p.z,.045,.12,p.d-1.3);}
   const nose=new T.Mesh(ownG(new T.SphereGeometry(1.45,20,12,0,Math.PI*2,0,Math.PI/2)),m.dark);nose.rotation.x=Math.PI/2;nose.position.set(p.x,1.8,p.z+p.d/2-.5);root.add(nose);plate('T-08 / TRANSFERT',p.x,1.8,p.z+p.d/2+.12,1.8);
  }else if(p.type==='bench'){
   solid(m.dark,p.x,.45,p.z,p.w,.9,p.d);box(m.steel,p.x,1.04,p.z,p.w+.1,.15,p.d+.1);
   cylinder(m.steel,p.x,1.36,p.z,.53,.47);collar(p.x,1.55,p.z,.54,m.blue);for(const dx of [-.7,.7]){const arm=box(m.steel,p.x+dx,1.4,p.z,.75,.13,.16);arm.rotation.z=dx*.55;cylinder(m.rubber,p.x+dx*1.35,1.15,p.z,.22,.2,[Math.PI/2,0,0]);}
   box(m.rubber,p.x-.85,1.17,p.z+.53,.6,.16,.35);plate('D-03 / DIAGNOSTIC',p.x,1.1,p.z+p.d/2+.08,1.8);
  }else if(p.type==='sensor'||p.type==='antenna'){
   solid(m.dark,p.x,.2,p.z,p.w,.4,p.d);solid(m.steel,p.x,p.h/2,p.z,.22,p.h,.22);cylinder(m.dark,p.x,p.h-.65,p.z,.48,.4);collar(p.x,p.h-.35,p.z,.65,m.blue);
   const antenna=box(m.steel,p.x,p.h-.12,p.z,1.4,.11,.15);antenna.rotation.z=.17;box(amber,p.x,p.h+.05,p.z,.12,.12,.12);
  }else if(p.type==='radiator'){
   solid(m.dark,p.x,p.h/2,p.z,p.w,p.h,p.d);for(let z=-1.4;z<1.5;z+=.22)box(m.steel,p.x,2,p.z+z,p.w+.2,3.2,.075);
   const g=ownG(new T.CylinderGeometry(.6,.6,.12,16));const hub=new T.Mesh(g,m.dark);hub.rotation.z=Math.PI/2;hub.position.set(p.x-Math.sign(p.x)*(p.w/2+.08),2,p.z);root.add(hub);
  }else if(p.type==='tank'){
   solid(m.dark,p.x,.16,p.z,p.w+.2,.32,p.d+.2);const body=cylinder(m.steel,p.x,2,p.z,1.22,3.6);solidDetail(body);for(const y of [.4,1,3.3,3.7])collar(p.x,y,p.z,1.27);box(m.blue,p.x,2,p.z+1.235,.13,2.2,.035);routeCable([[p.x-1,.3,p.z],[p.x-1.5,.3,p.z-3],[p.x-2,.3,p.z-6]],.1);
  }else if(p.type==='reel'){
   solid(m.dark,p.x,.12,p.z,2.4,.24,2.4);cylinder(m.rubber,p.x,.85,p.z,.65,1.4,[0,0,Math.PI/2]);for(const dx of [-.8,.8])cylinder(m.steel,p.x+dx,.85,p.z,.8,.12,[0,0,Math.PI/2]);routeCable([[p.x+.7,.18,p.z],[p.x+1.5,.09,p.z+1],[p.x+2.4,.09,p.z+1.1]],.055);
  }else{
   solid(m.dark,p.x,p.h/2,p.z,p.w,p.h,p.d);for(const side of [-1,1])box(m.steel,p.x+side*(p.w/2-.15),p.h/2,p.z,.1,p.h+.06,p.d+.06);
   box(p.type==='supplies'?green:amber,p.x,p.h-.15,p.z+p.d/2+.02,p.w*.7,.09,.02);plate(p.type==='supplies'?'SECOURS / 04':'OUTILS / 07',p.x,.55,p.z+p.d/2+.06,Math.min(1.6,p.w*.8));
  }
 }
 // The first view contains a grounded inspection gate, not a floating title card.
 for(const side of [-1,1]){solid(m.dark,side*5,.2,70,1.2,.4,1.2);solid(m.steel,side*5,2.3,70,.28,4.6,.35);const shoulder=box(m.steel,side*4.65,4.8,70,1.4,.28,.35);shoulder.rotation.z=side*Math.PI/4;solidDetail(shoulder);box(ice,side*4.83,2.7,70.18,.06,2.6,.035);panel('scan-'+side,side*5,1.65,70.25,.65,.37,{caption:'IDENTIFICATION',kind:'arrival'});}
 solid(m.dark,0,5.25,70,8.2,.18,.35);
 for(const b of (api.obstacles||[]).filter(b=>b.kind==='crate')){const z=b.z+b.hz+.05;box(m.dark,b.x,.55,z,Math.min(1.1,b.hx),.42,.09);box(amber,b.x,.62,z+.055,.35,.035,.015);for(const side of [-1,1])box(m.steel,b.x+side*.35,.47,z+.055,.18,.045,.035);}
 // Screened inspection points and roof sections establish distinct room silhouettes.
 for(const z of [63,36,-28,-72])for(const side of [-1,1]){
  // Door-side plates touch the existing pillars. The central view stays unobstructed.
  plate(z===63?'01 / TRANSIT':z===36?'02 / SERVICES':z===-28?'04 / CONFINEMENT':'05 / SAS',side*6,2.25,z+.53,.77);
  box(m.dark,side*6,1.34,z+.56,.7,.6,.12);box(z===-72?green:ice,side*6,1.42,z+.63,.45,.07,.025);
 }
 for(const z of [57,48,39])for(const side of [-1,1]){
  solid(m.dark,side*18,8.75,z,17.6,.24,8.6);box(m.steel,side*18,8.52,z,17.6,.18,.38);
  for(const x of [side*12,side*23])box(ice,x,8.35,z,5.2,.06,.18);
 }
 for(const z of [-35,-44,-53,-62])for(const side of [-1,1]){
  solid(m.dark,side*20,10.6,z,12.5,.24,8.6);box(m.steel,side*20,10.36,z,12.5,.25,.4);
 }
 solid(m.dark,-23,3.55,24,7,.2,14);for(const z of [19,25,30])box(amber,-23,3.38,z,3.8,.04,.12);
 // Cable trays are supported by wall brackets and run into the actual relays.
 for(const side of [-1,1]){
  for(const y of [2.8,3.02])routeCable([[side*24,y,60],[side*24,y,32],[side*24,y,-4],[side*23,y,-27],[side*20,y,-49]],.055);
  for(let z=58;z>-64;z-=8){box(m.steel,side*24,2.7,z,.6,.12,.3);box(m.dark,side*24,2.5,z,.12,.5,.3);}
 }
 for(const p of BREACH.relays){
  routeCable([[p.x,p.y+1.2,p.z-1.5],[p.x+Math.sign(p.x)*2,1,p.z-2],[Math.sign(p.x)*23,.13,p.z-3],[Math.sign(p.x)*23,.13,-27]],.13);
  panel('relay-'+BREACH.relays.indexOf(p),p.x,1.18,p.z-.778,1.2,.56,{caption:'DISTRIBUTION / COUPLEUR',kind:'relay'});
 }
 for(const [i,p] of BREACH.stabilizers.entries())panel('stabilizer-'+i,p.x,1.15,p.z-.778,1.2,.55,{caption:'CONFINEMENT / STABILISATEUR',kind:'stabilizer'});
 // Trays in the low tunnel keep natural head clearance and expose a damaged junction.
 for(const z of [28,20,12,4]){solid(m.steel,-13,3.24,z,7,.13,.2);for(const x of [-16,-15.7,-15.4])routeCable([[x,3.1,z+3.5],[x,3.03,z],[x,3.1,z-3.5]],.035);}
 solid(m.dark,-17.4,2.3,12,.7,.8,.8);routeCable([[-17.2,2.7,12],[-16.6,2.5,11.7],[-16.3,1.65,11.2]],.035);
 // Distinct physical evacuation frames; no floating "EXIT" banner.
 for(const z of [-76,-81,-86])for(const side of [-1,1]){
  solid(m.steel,side*5,2.8,z,.2,5.6,.3);const shoulder=box(m.steel,side*4.5,5.85,z,1.5,.2,.3);shoulder.rotation.z=side*Math.PI/4;solidDetail(shoulder);
  const indicator=box(green,side*4.86,2.4,z+.1,.045,3.9,.04);stateLights.push(indicator);dynamic.push(indicator);
 }
 // Painted lanes and equipment footprints, flush with the floor.
 for(const p of BREACH_DRESSING.filter(p=>!['sensor','antenna'].includes(p.type))){
  for(const side of [-1,1]){box(m.yellow,p.x+side*(p.w/2+.25),.018,p.z,.055,.015,p.d+.5);box(m.yellow,p.x,.018,p.z+side*(p.d/2+.25),p.w+.5,.015,.055);}
 }
 for(let z=-75;z>-88;z-=2)for(const side of [-1,1]){const marker=box(green,side*2.8,.028,z,.07,.02,.6);stateLights.push(marker);dynamic.push(marker);}
 // Worn footprints and scorch marks stay attached to the receiving surface.
 const scorchCanvas=document.createElement('canvas');scorchCanvas.width=scorchCanvas.height=128;const sc=scorchCanvas.getContext('2d');const gradient=sc.createRadialGradient(64,64,5,64,64,63);gradient.addColorStop(0,'rgba(8,7,10,.75)');gradient.addColorStop(.5,'rgba(20,13,12,.45)');gradient.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
 const scorchMap=ownT(new T.CanvasTexture(scorchCanvas));const scorchMaterial=ownM(new T.MeshBasicMaterial({map:scorchMap,transparent:true,opacity:.8,depthWrite:false}));
 for(const [x,z,size] of [[-17,58,3],[9,46,2.2],[-16,12,2.3],[4,7,1.2],[-20,-18,2.3],[21,-9,2.4],[-9,-40,3],[9,-60,2],[3,-77,1.3]]){const mesh=new T.Mesh(ownG(new T.PlaneGeometry(size,size)),scorchMaterial);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.022,z);root.add(mesh);stats.scorchMarks++;}
 // Bounded effects: visible steam at leaks and electrical debris at the broken junction.
 const spriteCanvas=document.createElement('canvas');spriteCanvas.width=spriteCanvas.height=64;const dc=spriteCanvas.getContext('2d');const grad=dc.createRadialGradient(32,32,0,32,32,31);grad.addColorStop(0,'rgba(225,238,245,.7)');grad.addColorStop(1,'rgba(225,238,245,0)');dc.fillStyle=grad;dc.fillRect(0,0,64,64);const spriteMap=ownT(new T.CanvasTexture(spriteCanvas));
 const steamSites=[[-24,2.8,53],[-17.5,2.7,12],[23,1.8,-18],[20,2.8,-40],[9,1,-61],[-4,2,-82]];
 for(const [j,p] of steamSites.entries())for(let i=0;i<2;i++){
  const material=ownM(new T.SpriteMaterial({map:spriteMap,color:0xbcc9d1,transparent:true,opacity:.05,depthWrite:false}));const sprite=new T.Sprite(material);sprite.position.set(...p);sprite.scale.setScalar(.65);root.add(sprite);vapour.push({sprite,p,offset:j*.73+i*.5});stats.vents++;
 }
 const sparkArray=new Float32Array(36*3),sparkGeo=ownG(new T.BufferGeometry());sparkGeo.setAttribute('position',new T.BufferAttribute(sparkArray,3));const sparkMat=ownM(new T.PointsMaterial({color:0xffbf69,size:.047,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));const sparks=new T.Points(sparkGeo,sparkMat);sparks.frustumCulled=false;root.add(sparks);
 const arc=new T.Mesh(ownG(new T.CylinderGeometry(.009,.009,.48,5)),ice);arc.position.set(-16.7,2.24,11.6);arc.rotation.z=.6;root.add(arc);dynamic.push(arc);
 const dustPositions=new Float32Array(90*3);for(let i=0;i<90;i++){dustPositions[i*3]=((i*17)%48)-24;dustPositions[i*3+1]=.4+((i*13)%70)/10;dustPositions[i*3+2]=80-((i*23)%165);}const dustGeometry=ownG(new T.BufferGeometry());dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3));const dust=new T.Points(dustGeometry,ownM(new T.PointsMaterial({color:0xaec3d0,size:.026,transparent:true,opacity:.19,depthWrite:false})));root.add(dust);
 // Two local lights follow the closest work areas instead of lighting all sectors at once.
 const workLight=new T.PointLight(0x72c9e0,7,15,2);workLight.position.set(-22,3.3,52);root.add(workLight);
 const tunnelLight=new T.PointLight(0xecb15d,6,13,2);tunnelLight.position.set(-13,2.7,14);root.add(tunnelLight);
 function paintScreen(s,game,time){
  const c=s.context,w=512,h=256,relays=game.campaign?.relays||[],stabilizers=game.campaign?.stabilizers||[],extract=game.stage==='extraction';
  c.fillStyle='#07131c';c.fillRect(0,0,w,h);c.fillStyle=extract?'#ffb266':'#72d1de';c.fillRect(0,0,5,h);c.font='600 18px sans-serif';c.fillText(s.caption,18,29,478);c.fillStyle='#193745';c.fillRect(18,42,476,1);
  const status=s.kind==='relay'?`COUPLEURS ACTIFS  ${relays.filter(Boolean).length}/2`:s.kind==='stabilizer'||s.kind==='reactor'?`CONFINEMENT  ${3-stabilizers.filter(Boolean).length}/3`:s.kind==='extraction'?extract?'LIAISON OUVERTE':'ATTENTE / AUTORISATION':'LIAISON ORDRE / DÉGRADÉE';
  c.font='600 19px sans-serif';c.fillStyle=extract?'#fbb05d':'#c9e3e6';c.fillText(status,18,67,478);
  // A real diagram with time-varying telemetry; lettering stays screen-sized.
  c.strokeStyle='#2c7184';c.lineWidth=2;c.beginPath();c.moveTo(35,128);c.lineTo(170,128);c.lineTo(170,99);c.lineTo(280,99);c.lineTo(280,172);c.lineTo(462,172);c.stroke();
  for(let i=0;i<3;i++){const active=!stabilizers[i];c.fillStyle=active?'#957be8':'#73deaf';c.fillRect(300+i*54,99,35,45);c.fillStyle='#0b202d';c.fillRect(305+i*54,105,25,31);}
  for(let i=0;i<34;i++){const value=8+((i*7+Math.floor(time*2))%19);c.fillStyle=i%6?'#4f8c99':'#b7c8aa';c.fillRect(22+i*5,197-value,3,value);}
  c.font='14px monospace';c.fillStyle='#6e9ba8';c.fillText(`NŒUD ${s.id.toUpperCase()}    ${Math.floor(time).toString().padStart(4,'0')} s`,18,235,478);s.tex.needsUpdate=true;
 }
 let lastScreen=-1,lastKey='';
 function update(game,time){
  const p=game.player,key=[game.stage,...(game.relays||[]),...(game.stabilizers||[])].join('/');
  if(time-lastScreen>.75||key!==lastKey){screens.forEach(s=>paintScreen(s,game,time));lastScreen=time;lastKey=key;}
  for(const h of holograms)h.rotation.y=time*.26;
  for(const v of vapour){const near=Math.hypot(p.x-v.p[0],p.z-v.p[2])<28,t=(time*.28+v.offset)%1;v.sprite.visible=near;v.sprite.position.set(v.p[0]+Math.sin(t*5+v.offset)*.18,v.p[1]+t*1.5,v.p[2]+t*.2);v.sprite.scale.setScalar(.45+t*1.35);v.sprite.material.opacity=near?Math.sin(t*Math.PI)*.065:0;}
  const sparking=Math.sin(time*6.1)>.72&&Math.hypot(p.x+17,p.z-12)<32;arc.visible=sparking;sparks.visible=sparking;
  if(sparking){for(let i=0;i<36;i++){const t=(time*1.9+i*.13)%1;sparkArray[i*3]=-16.7+Math.sin(i*2.7)*t*.65;sparkArray[i*3+1]=2.2+t*.25-t*t*2;sparkArray[i*3+2]=11.6+Math.cos(i*1.3)*t*.6;}sparkGeo.attributes.position.needsUpdate=true;}
  dust.position.y=Math.sin(time*.08)*.13;
  for(const indicator of stateLights)indicator.material=game.stage==='extraction'?green:m.blue;
  workLight.visible=Math.hypot(p.x+22,p.z-52)<35;tunnelLight.visible=Math.hypot(p.x+13,p.z-14)<29;
 }
 return {dynamic,screens,update,stats:()=>({...stats,steamSprites:vapour.length,sparkParticles:36,dustParticles:90,optionalLogs:4})};
}
