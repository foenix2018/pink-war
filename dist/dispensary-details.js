import {Assembly,bevelBox,matrix,limb} from './geo.js';
// Proposal only: the authored room, interaction IDs and walking footprints stay authoritative.
export function createDispensaryDetails(T,parent,{M,low=false}={}){
 const root=new T.Group();root.name='Proposition / dispensaire détaillé';parent.add(root);
 const assembly=new Assembly(),owned=[],maps=[];let built=false;
 const mat=(color,roughness=.6,metalness=.1,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});owned.push(m);return m;};
 const steel=mat(0x8c9ea4,.34,.8),paint=mat(0x8c9b9a,.7,.25),rubber=mat(0x19262b,.87,.05),linen=mat(0x9daea7,.97),pillow=mat(0xb6bcb0,.94),blanket=mat(0x496e71,.95),glass=mat(0x9cd3ce,.17,.08,{transparent:true,opacity:.24,depthWrite:false}),fluid=mat(0x8fbbc4,.25,.05,{transparent:true,opacity:.48}),label=mat(0xdfddcb,.88);
 const weave=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;weave[i]=128+(x%4<2?12:-12);weave[i+1]=128+(y%4<2?12:-12);weave[i+2]=252;weave[i+3]=255;}
 const normal=new T.DataTexture(weave,64,64);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.set(6,8);normal.needsUpdate=true;maps.push(normal);for(const m of [linen,pillow,blanket]){m.normalMap=normal;m.normalScale.set(.22,.22);}
 blanket.side=T.DoubleSide;
 const glow=new T.MeshBasicMaterial({color:0x73d9da,toneMapped:false});owned.push(glow);
 const put=(g,m,p=[0,0,0],r=[0,0,0])=>{assembly.add(g,m,matrix(p,r),!low);g.dispose();};
 const box=(s,p,m=paint,r=[0,0,0],bevel=.012)=>put(bevelBox(...s,Math.min(bevel,...s.map(v=>v*.2)),1),m,p,r);
 const cyl=(r,h,p,m=steel,rot=[0,0,0])=>put(new T.CylinderGeometry(r,r,h,low?10:16),m,p,rot);
 const rod=(a,b,r=.018,m=steel)=>put(limb(a,b,r,r,low?6:10),m);
 const tube=(points,r=.016,m=steel)=>put(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),low?12:24,r,low?6:10,false),m);
 function caster(x,y,z,angle=0){
  cyl(.071,.038,[x,y,z],rubber,[Math.PI/2,0,angle]);cyl(.031,.043,[x,y,z],steel,[Math.PI/2,0,angle]);
  for(const side of [-1,1])box([.025,.10,.018],[x+side*.048,y+.04,z],steel);cyl(.025,.12,[x,y+.105,z]);
 }
 function bed(o){
  const x=o.x,z=o.z;
  for(const sx of [-1,1])for(const sz of [-1,1])caster(x+sx*.88,.08,z+sz*.36);
  for(const sz of [-1,1]){rod([x-.94,.30,z+sz*.39],[x+.94,.30,z+sz*.39],.028);rod([x-.98,.49,z+sz*.41],[x+.98,.49,z+sz*.41],.03);}
  for(const sx of [-1,1]){rod([x+sx*.90,.22,z-.35],[x+sx*.90,.48,z+.35],.02);rod([x+sx*.90,.22,z+.35],[x+sx*.90,.48,z-.35],.02);}
  box([2.03,.085,.88],[x,.51,z],rubber);box([1.99,.18,.84],[x,.625,z],linen,[],.06);
  for(const sz of [-1,1])rod([x-.94,.664,z+sz*.414],[x+.94,.664,z+sz*.414],.006,pillow);
  box([.36,.10,.60],[x-.69,.756,z],pillow,[0,0,-.06],.04);
  // A draped blanket has sagging side edges and folds instead of a flat slab.
  const cloth=new T.PlaneGeometry(1.15,1.02,low?8:22,low?8:18),p=cloth.attributes.position;
  for(let i=0;i<p.count;i++){const xx=p.getX(i),zz=p.getY(i),edge=Math.max(0,Math.abs(zz)-.33);p.setXYZ(i,xx,.724-edge*1.15+Math.sin(xx*19+zz*5)*.014,zz);}cloth.computeVertexNormals();put(cloth,blanket,[x+.27,0,z]);
  for(const sx of [-1,1]){
   const xx=x+sx*1.04;tube([[xx,.48,z-.40],[xx,.96,z-.40],[xx,1.02,z-.31],[xx,1.02,z+.31],[xx,.96,z+.40],[xx,.48,z+.40]],.024);
   box([.045,.20,.65],[xx,.82,z],paint,[],.016);
  }
  for(const sz of [-1,1]){tube([[x-.56,.50,z+sz*.44],[x-.56,.88,z+sz*.44],[x-.48,.93,z+sz*.44],[x+.76,.93,z+sz*.44],[x+.84,.86,z+sz*.44],[x+.84,.50,z+sz*.44]],.018);for(const xx of [-.32,.06,.44])rod([x+xx,.54,z+sz*.44],[x+xx,.91,z+sz*.44],.011);}
  box([.22,.08,.025],[x+.46,.81,z+.468],rubber);box([.12,.018,.011],[x+.46,.815,z+.486],glow);
 }
 function cabinet(o){
  const x=o.x,z=o.z;box([.96,.12,3.12],[x,.10,z],rubber);box([.045,1.96,3.12],[x+.455,1.11,z],paint);for(const side of [-1,1])box([.96,1.96,.045],[x,1.11,z+side*1.53],paint);for(const y of [.16,2.08])box([.96,.045,3.12],[x,y,z],paint);
  // Recessed compartments on the face looking into the room.
  for(let k=0;k<3;k++){const zz=z-1.03+k*1.03;box([.025,1.72,.94],[x+.39,1.16,zz],rubber,[],.005);box([.016,1.62,.86],[x-.514,1.18,zz],glass,[],.004);tube([[x-.55,.88,zz+.30],[x-.59,.88,zz+.30],[x-.59,1.22,zz+.30],[x-.55,1.22,zz+.30]],.012);
   for(const y of [.48,.96,1.44]){box([.82,.028,.84],[x-.01,y,zz],steel);for(let i=0;i<3;i++){const z2=zz-.28+i*.27;cyl(.041,.16,[x-.18,y+.10,z2],i%2?linen:fluid);cyl(.045,.025,[x-.18,y+.19,z2],rubber);box([.014,.065,.06],[x-.226,y+.11,z2],label,[],.001);}}
  }
  for(const zz of [z-1.49,z+1.49])box([.036,1.84,.035],[x-.54,1.15,zz],steel);
 }
 function desk(o){
  const x=o.x,z=o.z;box([2.32,.065,1.04],[x,.90,z],steel);for(const sx of [-1,1])for(const sz of [-1,1])rod([x+sx*1.06,.05,z+sz*.43],[x+sx*1.06,.87,z+sz*.43],.027);
  box([.72,.67,.89],[x+.68,.52,z],paint);for(let k=0;k<3;k++){box([.66,.17,.028],[x+.68,.29+k*.20,z+.46],linen);tube([[x+.48,.31+k*.2,z+.48],[x+.48,.31+k*.2,z+.52],[x+.85,.31+k*.2,z+.52],[x+.85,.31+k*.2,z+.48]],.009);}
  monitor(x-.40,1.23,z-.23);box([.38,.032,.25],[x-.45,.957,z+.32],rubber);for(let k=0;k<5;k++)box([.032,.008,.12],[x-.57+k*.06,.98,z+.31],steel);
 }
 function monitor(x,y,z){
  cyl(.045,.23,[x,y-.23,z]);box([.32,.025,.23],[x,y-.35,z],rubber);box([.62,.42,.055],[x,y,z],rubber,[-.12,0,0]);box([.58,.38,.02],[x,y,z+.035],steel,[-.12,0,0]);
  const c=document.createElement('canvas');c.width=512;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle='#06181c';ctx.fillRect(0,0,512,320);ctx.strokeStyle='#183941';ctx.lineWidth=1;for(let i=0;i<512;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,320);ctx.stroke();}for(let y=0;y<320;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}ctx.fillStyle='#a1c9c6';ctx.font='bold 22px monospace';ctx.fillText('DSP-02 / SURVEILLANCE',16,30);ctx.strokeStyle='#6ce2c3';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<360;i++){const q=i%96,yy=135+(q>38&&q<42?-(q-38)*16:q>=42&&q<47?-64+(q-42)*22:q>=47&&q<53?46-(q-47)*8:Math.sin(i*.13)*3);if(i===0)ctx.moveTo(i+12,yy);else ctx.lineTo(i+12,yy);}ctx.stroke();ctx.fillStyle='#8ae9d4';ctx.font='bold 58px monospace';ctx.fillText('74',380,143);ctx.font='24px monospace';ctx.fillText('SpO2 98%',25,260);ctx.fillStyle='#ff94b4';ctx.fillText('AEGIS',378,282);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;maps.push(texture);const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});owned.push(material);put(new T.PlaneGeometry(.55,.33),material,[x,y,z+.051],[-.12,0,0]);
  for(let i=0;i<3;i++)cyl(.018,.014,[x+.15+i*.045,y-.19,z+.065],i===0?glow:rubber,[Math.PI/2,0,0]);
 }
 function room(){
  // Curtains on real ceiling tracks, with rings, hems and pleats in the mesh.
  for(const [x,z,w] of [[18.9,85,2.6],[24.3,84.4,2.4]]){
   tube([[x,2.70,z-w/2],[x,2.70,z+w/2]],.018);for(const end of [-1,1]){rod([x,2.70,z+end*(w/2-.1)],[x,3.35,z+end*(w/2-.1)],.012);box([.13,.025,.13],[x,3.37,z+end*(w/2-.1)],paint);}
   const g=new T.PlaneGeometry(w,1.9,low?16:40,low?4:10),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getY(i);p.setZ(i,Math.sin(u*23)*.055+Math.sin(u*7)*.015);p.setY(i,v+Math.cos(u*23)*.007*(1-v/2));}g.computeVertexNormals();const fabric=linen.clone();fabric.side=T.DoubleSide;owned.push(fabric);put(g,fabric,[x,1.55,z],[0,Math.PI/2,0]);for(let i=0;i<12;i++){const zz=z-w/2+(i+.5)*w/12;put(new T.TorusGeometry(.025,.004,4,8),steel,[x,2.53,zz],[0,Math.PI/2,0]);rod([x,2.55,zz],[x,2.69,zz],.003);}
   rod([x+.028,.61,z-w/2],[x+.028,.61,z+w/2],.006,blanket);
  }
  for(const [x,z] of [[17.4,82.9],[17.4,87.4]]){
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5,xx=x+Math.cos(a)*.25,zz=z+Math.sin(a)*.25;rod([x,.14,z],[xx,.08,zz],.017);caster(xx,.044,zz,a);}
   rod([x,.12,z],[x,2.12,z],.013);cyl(.024,.12,[x,1.07,z],rubber);tube([[x-.19,2.02,z],[x-.19,2.12,z],[x+.19,2.12,z],[x+.19,2.04,z]],.01);
   box([.12,.23,.055],[x+.13,1.86,z],glass,[],.018);box([.10,.13,.041],[x+.13,1.82,z],fluid);box([.075,.07,.006],[x+.13,1.91,z+.03],label);cyl(.011,.07,[x+.13,1.70,z],glass);tube([[x+.13,1.66,z],[x+.18,1.4,z+.08],[x+.11,.92,z+.10],[x-.20,.80,z+.05]],.0035,fluid);
  }
  const x=25.6,z=88.8;for(const sx of [-1,1])for(const sz of [-1,1]){caster(x+sx*.37,.055,z+sz*.21);rod([x+sx*.37,.13,z+sz*.21],[x+sx*.37,.81,z+sz*.21],.016);}
  for(const y of [.24,.77]){box([.87,.035,.51],[x,y,z],steel);for(const sz of [-1,1])box([.87,.06,.018],[x,y+.04,z+sz*.25],paint);}
  tube([[x-.40,.73,z-.20],[x-.40,.91,z-.20],[x+.40,.91,z-.20],[x+.40,.73,z-.20]],.016);
  for(let i=0;i<3;i++){cyl(.028,.11,[x-.25+i*.15,.84,z],i%2?glass:label);cyl(.029,.024,[x-.25+i*.15,.905,z],rubber);}box([.28,.045,.18],[x+.23,.815,z+.05],linen);box([.22,.05,.18],[x-.16,.28,z],blanket);
 }
 return{root,bed,cabinet,desk,finish(){if(built)return;built=true;room();assembly.build(root);for(const item of assembly.items)item.geometry.dispose();assembly.items.length=0;},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const m of owned)m.dispose();for(const t of maps)t.dispose();}};
}
