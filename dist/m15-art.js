import {createHeroPartnerActor} from './hero-partner-actor.js';
import * as L from './m15-layout.js';
// AEGIS nocturnal siege — authored mobile art kit, instanced solids and texture atlases.
export function createM15Art(T,scene,{quality='normal',webgpu=false,characterId='ghju',mobile=false}={}){
 const low=quality==='low',compact=low||(mobile&&quality!=='high'),root=new T.Group();root.name='M15 — Laboratoire oublié';scene.add(root);
 scene.background=new T.Color(0x151c33);scene.fog=new T.FogExp2(0x26354a,.0032);
 const sun=new T.DirectionalLight(0x99b9e7,1.4);sun.position.set(-80,110,-75);scene.add(sun,new T.HemisphereLight(0x9bbde5,0x38332d,1.28));
 let seed=213;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const mats={},geo={},batch=new Map(),textures=[],markers=new Map(),gens=new Map(),falls=[],fires=[],beacons=[],civil=[];let shieldDome=null,orbA=null,orbB=null,radio=null;
 // Tileable authored surface maps: independent albedo, roughness and tangent-space normal.
 const surfaceSets={};
 function surface(kind){const N=compact?512:1024,H=new Float32Array(N*N),R=new Float32Array(N*N),base=new Float32Array(N*N),pi=Math.PI*2;
  const sample=(x,y)=>H[((y+N)%N)*N+(x+N)%N];const hash=(x,y,k)=>{let n=Math.imul(x+37*k,374761393)+Math.imul(y+71*k,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};const noise=(u,v,f,k)=>{const x=u*f,y=v*f,a=Math.floor(x),b=Math.floor(y),dx=x-a,dy=y-b,tx=dx*dx*(3-2*dx),ty=dy*dy*(3-2*dy),h=(i,j)=>hash((i%f+f)%f,(j%f+f)%f,k);return (h(a,b)*(1-tx)+h(a+1,b)*tx)*(1-ty)+(h(a,b+1)*(1-tx)+h(a+1,b+1)*tx)*ty;};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,u=x/N,v=y/N,grain=rnd()-.5,stain=Math.sin(pi*(u*3+v))*Math.cos(pi*(v*2-u)),mottle=Math.sin(pi*(u*9+v*5))*Math.sin(pi*(v*7-u*2)),wet=Math.max(0,stain*.7+mottle*.3-.12);
   let h=grain*.18+mottle*.13+stain*.1,c=150+grain*26+mottle*17+stain*21,rough=.8;
   if(kind==='road'){h=grain*.34+mottle*.13;c=92+grain*38+mottle*10-stain*12;rough=.78-wet*.44;}
   if(kind==='steel'){h=grain*.08+Math.sin(pi*u*55)*.037;c=174+grain*14+Math.sin(pi*u*55)*7+stain*15;rough=.55-wet*.2;}
   if(kind==='concrete'){const seam=Math.min(u,1-u,v,1-v)<.007?1:0;const crack=Math.abs(Math.sin(pi*(u*2+v*.98))+.16*Math.sin(pi*v*13))<.017&&stain>.12?1:0;h-=seam*.3+crack*.15;c-=seam*24+crack*24;rough=.86-wet*.22;}
   if(kind==='grate'){const gx=Math.min((u*8)%1,1-(u*8)%1),gy=Math.min((v*8)%1,1-(v*8)%1),rib=(gx<.095||gy<.095);h=rib?.34:-.28;c=rib?178:53;rough=rib?.54:.85;}
   if(kind==='rock'){h=grain*.25+mottle*.35+stain*.28;c=115+grain*25+mottle*26+stain*24;rough=.92-wet*.22;}
   const macro=noise(u,v,4,5),med=noise(u,v,16,7),fine=noise(u,v,64,9),micro=noise(u,v,128,11),run=noise(u,(v*.25)%1,32,13);
   if(kind==='concrete'){const pits=fine>.78?.24:0,streak=Math.max(0,run-.55)*2;c=122+(macro-.5)*66+(med-.5)*40+(fine-.5)*28-streak*43-pits*70;h=(med-.5)*.33+(micro-.5)*.24-pits;rough=.87-streak*.22;const seam=Math.min(u,1-u,v,1-v)<.006;if(seam){c*=.48;h-=.27;}}
   if(kind==='steel'){const panel=Math.min(u,1-u,v,1-v)<.012,brushing=Math.sin(u*N*.63)*.023,oxidation=Math.max(0,macro+med*.35-.82);c=145+(macro-.5)*45+(med-.5)*19+brushing*180-oxidation*130;h=(fine-.5)*.08+brushing-(panel?.13:0);rough=.38+oxidation*.64+(fine-.5)*.08;if(panel)c*=.45;}
   if(kind==='road'){const aggregate=Math.pow(fine,2),puddle=macro>.65&&med>.4;c=66+aggregate*68+(micro-.5)*26+(med-.5)*36-(puddle?20:0);h=(fine-.5)*.42+(micro-.5)*.26;rough=puddle?.19:.83;}
   if(kind==='rock'){const layers=Math.sin((v+med*.13)*Math.PI*18),cleft=Math.max(0,.25-med)*1.6;c=83+(macro-.5)*90+(fine-.5)*50+layers*18-cleft*55;h=(macro-.5)*.7+(med-.5)*.5+layers*.20+(micro-.5)*.17;rough=.9-cleft*.25;}
   H[i]=h;R[i]=Math.max(.12,Math.min(.98,rough));base[i]=Math.max(22,Math.min(225,kind==='grate'?c:(c*.76+({road:85,concrete:124,steel:145,rock:99}[kind]||130)*.24)));
  }
  function map(mode){const c=document.createElement('canvas');c.width=c.height=N;const ctx=c.getContext('2d'),im=ctx.createImageData(N,N);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,k=i*4;let red,green,blue;if(mode==='normal'){const dx=(sample(x+1,y)-sample(x-1,y))*.9,dy=(sample(x,y+1)-sample(x,y-1))*.9,len=Math.hypot(dx,dy,1);red=128-dx/len*127;green=128+dy/len*127;blue=128+127/len;}else if(mode==='rough'){red=green=blue=R[i]*255;}else{red=base[i];green=base[i]*(kind==='rock'?.99:1);blue=base[i]*(kind==='steel'?1.055:1.02);}im.data[k]=red;im.data[k+1]=green;im.data[k+2]=blue;im.data[k+3]=255;}ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=compact?2:4;if(mode==='color')t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
  return surfaceSets[kind]={map:map('color'),normalMap:map('normal'),roughnessMap:map('rough')};
 }
 const concrete=surface('concrete'),steel=surface('steel'),asphalt=surface('road'),rock=surface('rock'),grate=surface('grate');
 function mat(n,c,r=.75,m=.1,t=null){return mats[n]=new T.MeshStandardMaterial({color:c,roughness:t?1:r,metalness:m,...(t||{}),normalScale:new T.Vector2(m>.45?.42:n==='rock'?.72:.58,m>.45?.42:n==='rock'?.72:.58)});}
 mat('concrete',0xb1b8c4,.83,.04,concrete);mat('rock',0x66717e,.98,.02,rock);mat('steel',0xaab9ca,.42,.67,steel);mat('dark',0x536272,.66,.3,steel);mat('road',0xadb3be,.58,.13,asphalt);mat('grate',0x99a9ba,.65,.65,grate);mat('rust',0x835542,.84,.2,steel);mat('gold',0xc49a4e,.49,.45);mat('white',0xd2d9e1,.64);mat('paint',0xb1c6d2,.62,.05);mat('fabric',0xaaa99c,.9);mat('leaf',0x2c493e,.94);mat('leaf2',0x203e34,.95);mat('rubber',0x191c23,.9);mat('glass',0x33687e,.18,.3);mat('water',0x265575,.22,.32);mat('ceramic',0xd4e3e7,.32,.05);mat('redPaint',0x7d2539,.54,.48,steel);mat('yellowPaint',0xd7a23e,.52,.30,steel);mat('copper',0x89694a,.38,.78,steel);mat('polymer',0x293d4b,.75,.07);mat('snow',0xd8e3ec,.93,0);mat('ice',0x8fb6d0,.24,.12);mat('puddle',0x435365,.18,.35);
 for(const [n,c] of [['pink',0xff278c],['blue',0x50cfff],['red',0xff423e],['warm',0xffb56a],['green',0x74ffb7],['violet',0xb880ff]])mats[n]=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.65,roughness:.24,metalness:0,toneMapped:false});
 geo.box=new T.BoxGeometry(1,1,1);geo.cyl=new T.CylinderGeometry(1,1,1,12);geo.rock=new T.IcosahedronGeometry(1,compact?1:2);{const p=geo.rock.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.17*Math.sin(x*12.7+y*8.9+z*5.4)+.09*Math.cos(x*23.2-y*17.1+z*13.7);p.setXYZ(i,x*f,y*f,z*f);}geo.rock.computeVertexNormals();}geo.leaf=new T.IcosahedronGeometry(1,0);geo.needles=new T.ConeGeometry(1,1,7);geo.sphere=new T.SphereGeometry(1,12,8);
 const tmp=new T.Object3D();function push(g,m){const key=g+'|'+m+'|'+Math.floor(tmp.position.x/64)+'|'+Math.floor(tmp.position.z/64)+'|'+Math.floor(tmp.position.y/32);if(!batch.has(key))batch.set(key,[]);tmp.updateMatrix();batch.get(key).push(tmp.matrix.clone());}
 function inst(g,m,x,y,z,w,h,d,rx=0,ry=0,rz=0){tmp.position.set(x,y,z);tmp.rotation.set(rx,ry,rz);tmp.scale.set(w,h,d);push(g,m);}
 const box=(x,y,z,w,h,d,m='steel',ry=0)=>{let g='box';if(['concrete','rock','road','grate','steel','dark'].includes(m)&&Math.max(w,h,d)>5){const bucket=n=>{const k=Math.max(1,Math.round(n/2.5));return k<=4?k:Math.round(k/3)*3;};const W=bucket(w),H=bucket(h),D=bucket(d);g='boxUV-'+W+'-'+H+'-'+D;if(!geo[g]){const b=new T.BoxGeometry(1,1,1),uv=b.attributes.uv;for(let i=0;i<uv.count;i++){const f=Math.floor(i/4),u=f<2?D:W,v=f<2?H:f<4?D:H;uv.setXY(i,uv.getX(i)*u,uv.getY(i)*v);}geo[g]=b;}}inst(g,m,x,y,z,w,h,d,0,ry,0);};
 const cyl=(x,y,z,r,h,m='steel')=>inst('cyl',m,x,y,z,r,h,r);
 function beam(a,b,w=.12,m='steel',g='box'){let av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);if(d.length()<.001)return;tmp.position.copy(av.add(bv).multiplyScalar(.5));tmp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());tmp.scale.set(w,d.length(),w);push(g,m);}
 function mesh(g,m,x,y,z){let o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);return o;}
 // Diegetic signs: distinct faction emblems, condensed readable labels, small technical metadata.

 // Actual signage: painted aluminium face, gasket, housing, fasteners and wall brackets.
 function sign(text,x,y,z,w=4,h=1,color='#a7e8ff',opts={}){const angle=opts.yaw||0,ord=opts.faction==='ordre'||/ORDRE/.test(text),a=Math.cos(angle),b=Math.sin(angle),place=(u,v,d)=>[x+u*a+d*b,y+v,z-u*b+d*a];
 const part=(u,v,d,ww,hh,dd,m)=>{const p=place(u,v,d);box(...p,ww,hh,dd,m,angle);};
 part(0,0,-.09,w+.12,h+.12,.16,'dark');part(0,0,-.015,w,h,.07,'steel');for(const q of [-1,1]){part(q*(w/2-.14),0,-.25,.13,h*.70,.35,'steel');for(const k of [-1,1]){const p=place(q*(w/2-.12),k*(h/2-.09),.045);beam(p,place(q*(w/2-.12),k*(h/2-.09),.08),.037,'steel','cyl');}}
 const c=document.createElement('canvas');c.width=compact?512:1024;c.height=Math.max(64,Math.round(c.width*h/w));const ctx=c.getContext('2d'),W=c.width,H=c.height;
 ctx.fillStyle=ord?'#232b32':'#d9e0e2';ctx.fillRect(0,0,W,H);ctx.strokeStyle=ord?'#9fa8ae':'#435a65';ctx.lineWidth=Math.max(2,H*.025);ctx.strokeRect(4,4,W-8,H-8);
 ctx.fillStyle=ord?'#e1e5e7':'#19364a';const cx=H*.48;ctx.beginPath();ctx.moveTo(cx,H*.18);ctx.lineTo(cx-H*.22,H*.70);ctx.lineTo(cx,H*.55);ctx.lineTo(cx+H*.22,H*.70);ctx.closePath();ctx.fill();
 const label=text.replace(/^\d+\s*·\s*/,'').toUpperCase(), left=H*.95;ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='600 '+Math.round(H*.38)+'px Arial';ctx.fillText(label,left,H*.42,W-left-H*.15);
 ctx.fillStyle=ord?'#aeb7bc':'#344f5e';ctx.font=Math.round(H*.15)+'px monospace';ctx.fillText(opts.sub||(ord?'ORDRE / ACCÈS RÉGLEMENTÉ':'AEGIS / SERVICE TECHNIQUE'),left,H*.77,W-left-H*.15);
 ctx.fillStyle='rgba(25,30,34,.12)';for(let j=0;j<35;j++){const xx=rnd()*W,yy=rnd()*H;ctx.fillRect(xx,yy,1+rnd()*4,1+rnd()*2);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.push(t);const o=mesh(new T.PlaneGeometry(w-.06,h-.06),new T.MeshStandardMaterial({map:t,roughness:.72,metalness:.08,emissive:0xadb5bd,emissiveMap:t,emissiveIntensity:.16}),...place(0,0,.025));o.rotation.y=angle;o.name='Signalétique / '+label;return o;
 }

 const lightSources=[],lightPool=Array.from({length:compact?3:5},()=>{const l=new T.PointLight(0xffffff,0,20,2);root.add(l);return l;});function light(x,y,z,color,energy=18,range=18){const l={position:new T.Vector3(x,y,z),color,intensity:energy,distance:range};lightSources.push(l);return l;}let lastLight=-10;function updateLights(t,p){if(t-lastLight>.18||t<lastLight){lastLight=t;const x=p?.x??-103,y=(p?.elevation??4)+1.5,z=p?.z??76;const selected=lightSources.map(l=>({l,d:Math.hypot(l.position.x-x,l.position.y-y,l.position.z-z)})).filter(a=>a.d<a.l.distance+12).sort((a,b)=>a.d-b.d).slice(0,lightPool.length);lightPool.forEach((l,i)=>{const a=selected[i]?.l;l.userData.source=a||null;if(a){l.position.copy(a.position);l.color.setHex(a.color);l.distance=a.distance;}});}lightPool.forEach(l=>{l.intensity=l.userData.source?.intensity||0;});}
 function rail(a,b){const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/2.6));for(let i=0;i<=count;i++){const p=a.map((v,j)=>v+(b[j]-v)*i/count);box(p[0],p[1]+.035,p[2],.23,.07,.23,'steel');beam(p,[p[0],p[1]+1.13,p[2]],.095,'steel');box(p[0],p[1]+1.15,p[2],.13,.07,.13,'gold');}for(const h of [.14,.58,1.11])beam([a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],h===.14?.10:.075,h===1.11?'gold':'steel');}

 const Y=L.Y,pods=[],water=[],coreParts=[];
 // Physical neon tube, support profile, electrical endcaps and metal clips.
 function tube(a,b,col='pink'){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A).normalize();if(A.distanceTo(B)<.35)return;
 beam([a[0],a[1]-.15,a[2]],[b[0],b[1]-.15,b[2]],.13,'dark','cyl');beam(A.clone().addScaledVector(v,.12).toArray(),B.clone().addScaledVector(v,-.12).toArray(),.055,col,'cyl');
 for(const t of [0,.5,1]){const x=A.clone().lerp(B,t);beam(x.clone().addScaledVector(v,-.075).toArray(),x.clone().addScaledVector(v,.075).toArray(),.10,'steel','cyl');}const m=A.clone().lerp(B,.5);light(m.x,m.y,m.z,col==='blue'?0x49cfff:col==='warm'?0xffb56a:0xff278c,22,12);}
 function pipe(a,b,r=.3){beam(a,b,r,'steel','cyl');const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A).normalize();for(let k=0;k<A.distanceTo(B);k+=3){const p=A.clone().addScaledVector(v,k);beam(p.clone().addScaledVector(v,-.1).toArray(),p.clone().addScaledVector(v,.1).toArray(),r*1.2,'dark','cyl');}}

 // Vertical complex: every playable deck and ramp is built from authoritative layout.
 const glass=new T.MeshPhysicalMaterial({color:0x6eb9db,roughness:.19,metalness:.10,transparent:true,opacity:.30,depthWrite:false,side:T.DoubleSide});
 const ring=(x,y,z,r,t,m='steel',n=64)=>{const o=mesh(new T.TorusGeometry(r,t,6,n),mats[m],x,y,z);o.rotation.x=Math.PI/2;return o;};
 // All exterior walking surfaces are the mountain heightfield itself. No platform meshes.
 // Thin, flush interior floors only, with physical walls, equipment and overhead architecture.
 for(const r of L.ROOMS){const g=new T.PlaneGeometry(r.w,r.d),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*r.w/3,uv.getY(i)*r.d/3);const o=mesh(g,mats.concrete,r.x,r.height+.018,r.z);o.rotation.x=-Math.PI/2;o.name=r.id+' / dalle intérieure affleurante';}
 // Glass-walled offices, labs and data galleries. Doorways remain open.
 for(const r of L.ROOMS){const y=r.height;if(r.id!=='pods')box(r.x,y+r.h+.18,r.z,r.w+.5,.36,r.d+.5,'dark');if(r.id!=='pods')for(let k=-r.w/2+2;k<r.w/2;k+=5)box(r.x+k,y+r.h-.24,r.z,.23,.35,r.d,'steel');for(const q of [-1,1]){tube([r.x-r.w/2+1,y+r.h-.65,r.z+q*(r.d/2-1)],[r.x+r.w/2-1,y+r.h-.65,r.z+q*(r.d/2-1)],r.id==='lab'?'blue':'warm');}sign(r.label.toUpperCase(),r.x,y+r.h+.9,r.z+r.d/2+.30,Math.min(r.w-3,20),1.6,'#9ee9ff',{faction:'ordre'});}
 for(const p of L.WALLS){const {x,z,y,w,d,h}=p,wide=w>d,len=wide?w:d,n=Math.ceil(len/3.2),step=len/n;
  box(x,y+.65,z,w,1.3,d,'dark');box(x,y+h-.45,z,w,.9,d,'steel');
  for(let i=0;i<n;i++){const a=-len/2+(i+.5)*step,xx=x+(wide?a:0),zz=z+(wide?0:a);const o=mesh(new T.BoxGeometry(wide?step-.16:.08,h-2.2,wide?.08:step-.16),glass,xx,y+(h+0.4)/2,zz);o.name=p.id+'-glass-'+i;box(xx-(wide?step/2:0),y+h/2,zz-(wide?0:step/2),.14,h,.14,'steel');box(xx,y+3.8,zz,wide?step:.18,.09,wide?.18:step,'steel');}
 }
 // Functional equipment, no random objects in the path.
 for(const p of L.PROPS){const {x,y,z,w,d,h,material:k}=p;
  if(k==='pod'){cyl(x,y+.25,z,1.35,.5,'dark');cyl(x,y+3.02,z,1.25,.45,'steel');mesh(new T.CylinderGeometry(1.12,1.12,2.5,24,1,true),glass,x,y+1.62,z);inst('sphere','blue',x,y+2.15,z,.30,.34,.30);cyl(x,y+1.2,z,.32,1.4,'blue');for(const q of [-1,1]){box(x+q*1.13,y+1.6,z,.14,2.8,.14,'steel');tube([x+q*1.0,y+.6,z+.28],[x+q*1.0,y+2.6,z+.28],'blue');}light(x,y+2,z,0x4accff,16,8);}
  else if(k==='rack'){for(const q of [-1,1]){const xx=x+q*.95;box(xx,y+1.65,z,1.65,3.3,2.6,'dark');for(let j=0;j<10;j++){box(xx,y+.35+j*.27,z+1.31,1.42,.19,.08,'steel');box(xx-.52,y+.35+j*.27,z+1.37,.08,.06,.03,j%3?'blue':'pink');}}}
  else if(k==='gate'){box(x,y+1.65,z,w,3.3,d,'dark');for(const q of [-1,1]){box(x+q*1.6,y+1.7,z+.8,.25,3.2,.3,'steel');tube([x+q*1.6,y+.3,z+1],[x+q*1.6,y+3,z+1],'pink');}}
  else if(k==='cover'){box(x,y+.75,z,w,1.5,d,'dark');box(x,y+1.48,z,w,.15,d,'steel');for(const q of [-1,1])box(x+q*1.75,y+.76,z,.16,1.5,d,'yellowPaint');}
  else{for(const q of [-1,1])box(x+q*1.45,y+.48,z,.65,.95,d*.78,'dark');box(x,y+1.02,z,w,.16,d,'steel');box(x,y+1.65,z-.65,w*.63,1.05,.18,'dark');box(x,y+1.65,z-.53,w*.57,.88,.035,'blue');for(let j=0;j<9;j++)box(x-w*.34+j*w*.085,y+1.13,z+.35,.12,.03,.28,'rubber');sign(k==='terminal'?'TERMINAL / ORDRE':'CONTRÔLE INTERNE',x,y+1.68,z-.49,w*.57,.76,'#7cdbff');}
 }

 // Detailed industrial families with bounded dimensions and physical subcomponents.
 geo.chamfer=new T.BoxGeometry(1,1,1,4,4,4);{const p=geo.chamfer.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)),c=v.clone().clampScalar(-.42,.42),a=v.sub(c).normalize().multiplyScalar(.08).add(c);p.setXYZ(i,a.x,a.y,a.z);}geo.chamfer.computeVertexNormals();}
 const rounded=(x,y,z,w,h,d,m)=>inst('chamfer',m,x,y,z,w,h,d);
 for(const p of L.EQUIPMENT){const {x,y,z,w,d,h,material:k}=p;const B=(a,b,c,ww,hh,dd,m='steel')=>rounded(x+a,y+b,z+c,ww,hh,dd,m);
  const C=(a,b,c,r,hh,m='steel')=>cyl(x+a,y+b,z+c,r,hh,m);for(const q of [-1,1])for(const v of [-1,1])B(q*w*.36,.12,v*d*.34,.30,.24,.34,'rubber');
  if(k==='coolant'){C(0,1.1,0,.95,1.9,'steel');C(0,.24,0,1.03,.25,'dark');C(0,2.06,0,1.03,.18,'dark');C(0,2.3,0,.27,.30,'steel');for(const q of [-1,1]){C(q*1.28,1.0,0,.19,1.65,'copper');B(q*1.28,1.95,0,.44,.16,.38,'steel');}B(0,1.1,1.0,.85,.43,.10,'dark');B(0,1.1,1.07,.71,.32,.035,'blue');}
  else if(k==='generator'||k==='transformer'){B(0,.82,0,3.05,1.35,2.4,'dark');B(0,1.6,0,2.8,.30,2.2,'steel');for(let i=0;i<9;i++){B(-1.2+i*.30,.85,1.23,.12,1.12,.11,'steel');}for(const q of [-1,1]){C(q*.82,1.97,0,.20,.60,'ceramic');for(let i=0;i<5;i++)C(q*.82,1.74+i*.11,0,.28,.06,'ceramic');C(q*.82,2.27,0,.08,.16,'copper');}B(0,.72,1.29,.61,.34,.07,'yellowPaint');}
  else if(k==='antenna'){C(0,.26,0,1.0,.36,'dark');C(0,1.0,0,.20,1.65,'steel');const dish=mesh(new T.SphereGeometry(1.05,24,12,0,Math.PI*2,0,Math.PI*.36),mats.steel,x,y+1.65,z);dish.rotation.x=Math.PI*.26;dish.scale.set(1, .50,1);for(const q of [-1,1])beam([x+q*.71,y+1.82,z],[x,y+2.28,z+.32],.07,'steel','cyl');B(0,2.27,.32,.24,.24,.29,'dark');}
  else if(k==='barrier'){B(0,.18,0,3.1,.3,1.9,'concrete');for(const q of [-1,1]){B(q*1.22,.81,0,.44,1.22,.46,'steel');B(q*1.22,1.48,0,.31,.12,.31,'warm');}for(let i=0;i<5;i++)B(-1.1+i*.55,.76,0,.50,.24,.16,i%2?'dark':'yellowPaint');}
  else if(k==='utility'){B(0,1.05,0,2.7,1.85,1.65,'dark');B(0,1.06,.84,2.45,1.63,.08,'steel');B(0,1.1,.90,.035,1.60,.04,'dark');for(const q of [-1,1]){B(q*.18,1.05,.95,.06,.25,.05,'rubber');for(let i=0;i<6;i++)B(q*.68,.54+i*.085,.91,.68,.035,.035,'dark');}}
  else{B(0,.83,0,3.05,1.4,2.35,'dark');for(const q of [-1,1]){B(q*1.30,.82,0,.17,1.5,2.4,'steel');B(0,1.29,q*1.19,2.95,.13,.055,'yellowPaint');for(let j=0;j<6;j++)B(-1.1+j*.44,.80,q*1.20,.075,.86,.065,'steel');}B(0,1.53,0,3.05,.16,2.35,'steel');}
 }
 // The existing consoles and pods now have visible housings, cable connectors, fasteners and panel seams.
 for(const p of L.PROPS){const {x,y,z,w,d,material:k}=p;
  if(k==='pod'){for(const q of [-1,1]){pipe([x+q*1.32,y+.24,z-.55],[x+q*1.32,y+2.84,z-.55],.085);box(x+q*1.22,y+.48,z+.7,.27,.26,.20,'dark');}for(let i=0;i<8;i++){const a=i*Math.PI/4;box(x+Math.cos(a)*1.06,y+.51,z+Math.sin(a)*1.06,.16,.09,.16,'steel');}}
  else if(k==='rack'){for(const q of [-1,1]){box(x+q*.95,y+3.19,z,1.52,.13,2.35,'steel');for(let i=0;i<4;i++)box(x+q*.95,y+3.28,z-.65+i*.42,1.15,.04,.085,'rubber');for(let i=0;i<6;i++)box(x+q*.95+.48,y+.40+i*.42,z+1.38,.055,.10,.035,'rubber');}}
  else if(k==='desk'||k==='terminal'){rounded(x,y+1.18,z-.57,w*.67,.18,.28,'dark');for(const q of [-1,1]){box(x+q*w*.30,y+1.16,z+.40,.19,.08,.20,'dark');box(x+q*w*.30,y+1.22,z+.40,.12,.045,.13,'green');}pipe([x+w*.32,y+.14,z-.9],[x+w*.32,y+1.0,z-.9],.045);}
 }

 // Four individually identified caissons with physical support, valves, glazing and symbolic holograms.
 const childGlass=new T.MeshPhysicalMaterial({color:0x86c9f1,roughness:.16,metalness:.08,transparent:true,opacity:.30,depthWrite:false,side:T.DoubleSide}),children=new Map(),holoMat=new T.MeshBasicMaterial({color:0x75ceff,transparent:true,opacity:.66,depthWrite:false,toneMapped:false});
 for(const p of L.PODS){const {x,y,z}=p;
  cyl(x,y+.30,z,1.94,.60,'dark');cyl(x,y+.66,z,1.73,.16,'steel');ring(x,y+.76,z,1.58,.065,'pink');cyl(x,y+5.38,z,1.88,.58,'dark');cyl(x,y+5.0,z,1.70,.19,'steel');
  const shell=mesh(new T.CylinderGeometry(1.55,1.55,4.20,32,1,true),childGlass,x,y+2.87,z);shell.name=p.label+' / vitre';
  for(let i=0;i<6;i++){const a=i*Math.PI/3,xx=x+1.78*Math.cos(a),zz=z+1.78*Math.sin(a);box(xx,y+2.9,zz,.13,4.45,.13,'steel');if(i%2===0)tube([xx,y+.84,zz],[xx,y+4.88,zz],'blue');}
  for(const q of [-1,1]){pipe([x+q*1.82,y+.62,z],[x+q*1.82,y+4.95,z],.09);box(x+q*1.66,y+1.12,z+1.18,.27,.26,.20,'dark');}
  const figure=new T.Group();figure.position.set(x,y+1.0,z);root.add(figure);const body=(xx,yy,zz,w,h,d)=>{const o=new T.Mesh(geo.sphere,holoMat);o.position.set(xx,yy,zz);o.scale.set(w,h,d);figure.add(o);return o;};
  body(0,2.45,0,.30,.36,.30);body(0,1.79,0,.44,.54,.24);body(0,1.21,0,.36,.24,.25);for(const q of [-1,1]){const arm=body(q*.47,1.64,0,.13,.45,.14);arm.rotation.z=q*.13;body(q*.20,.64,0,.16,.57,.18);}
  sign(p.label,x,y+5.93,z+1.75,3.7,.53,'#a7e8ff',{faction:'ordre',sub:'PHASE ENFANTS'});light(x,y+3,z,0x73c7ff,16,7);children.set(p.id,{shell,figure});
 }
 const px=-25,py=26,pz=-121.7;for(const q of [-1,1])box(px+q*25,py+8,pz,3.5,16,2.8,'dark');
 for(let i=0;i<16;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;beam([px+25*Math.cos(a),py+2+19*Math.sin(a),pz],[px+25*Math.cos(b),py+2+19*Math.sin(b),pz],.85,'dark');beam([px+23.9*Math.cos(a),py+2+18*Math.sin(a),pz+.55],[px+23.9*Math.cos(b),py+2+18*Math.sin(b),pz+.55],.085,'pink','cyl');}
 sign('PROJET PINK',px,py+13.6,pz+.64,20,2.1,'#ff79be',{faction:'ordre',sub:'PHASE ENFANTS / ARCHIVES DE CONSCIENCE'});
 const rx=125,ry=26,rz=-112;const reactor=new T.Group();reactor.position.set(rx,ry,rz);root.add(reactor);
 cyl(rx,ry+.5,rz,3.4,1,'dark');cyl(rx,ry+9.2,rz,3.1,.65,'steel');for(let j=0;j<8;j++){let a=j*Math.PI/4,xx=rx+3*Math.cos(a),zz=rz+3*Math.sin(a);box(xx,ry+4.9,zz,.38,8.4,.38,'steel');tube([xx,ry+1.1,zz],[xx,ry+8.5,zz],'red');}const nucleus=new T.Mesh(new T.IcosahedronGeometry(1.8,2),mats.red);nucleus.position.y=5;reactor.add(nucleus);light(rx,ry+5,rz,0xff4b45,22,10);
 for(const q of [-1,1]){box(-110+q*17,14,125,4,12,5,'concrete');box(-110+q*17,20.1,125,4.6,.4,5.5,'snow');}box(-110,19.8,125,30,2,2.2,'dark');sign('ACCÈS RÉGLEMENTÉ',-110,19.7,126.3,12,1.15,'#fff',{faction:'ordre',sub:'LABORATOIRE PINK / B2'});
 // AEGIS landing pad and engineered VTOL with distinct fuselage, wings, rotors and skid assemblies.
 ring(125,8.065,79,15,.12,'warm');ring(125,8.07,79,12,.065,'white');for(const q of [-1,1])box(125+q*2,8.03,79,.35,.05,4,'white');box(125,8.03,79,4,.05,.35,'white');
 const ax=139,az=91;const hull=(pts,y,depth,m)=>{const sh=new T.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));sh.closePath();const o=mesh(new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:.09,bevelSize:.12,bevelSegments:2}),mats[m],ax,y,az);o.rotation.x=-Math.PI/2;};
 hull([[-1.5,-4],[-2,1],[-1,4],[1,4],[2,1],[1.5,-4]],8.8,1.2,'dark');inst('sphere','glass',ax,10.1,az+1.9,1.25,.55,1.55);
 for(const q of [-1,1]){hull([[q*1,-2],[q*6,-2.5],[q*6,0],[q*2,2]],9.1,.30,'steel');cyl(ax+q*4.8,9.55,az-.5,1.22,.65,'dark');cyl(ax+q*4.8,9.91,az-.5,.96,.12,'steel');for(let j=0;j<6;j++){const a=j*Math.PI/3;box(ax+q*4.8+Math.cos(a)*.48,10.01,az-.5+Math.sin(a)*.48,.15,.06,.64,'dark',a);}beam([ax+q*1.1,9,az-2],[ax+q*1.45,8.15,az-2],.18);box(ax+q*1.45,8.10,az,.28,.2,4.8,'rubber');}
 sign('AEGIS / EXTRACTION',125,5.5,104.2,22,3,'#9edcff');
 // Mountain silhouettes and atmospheric sunset: soft haze rather than overtexturing.
 const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;const sc=skyCanvas.getContext('2d'),grad=sc.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#11192f');grad.addColorStop(.42,'#29334d');grad.addColorStop(.62,'#76506c');grad.addColorStop(.75,'#ce805e');grad.addColorStop(1,'#343348');sc.fillStyle=grad;sc.fillRect(0,0,1024,512);const skyTex=new T.CanvasTexture(skyCanvas);skyTex.colorSpace=T.SRGBColorSpace;textures.push(skyTex);const sky=mesh(new T.SphereGeometry(800,32,16),new T.MeshBasicMaterial({map:skyTex,side:T.BackSide,fog:false,depthWrite:false}),0,30,0);

 // Ground is a contiguous sculpted mesh with mesa plateaux directly beneath registered walking surfaces.
 // Nonuniform mesh: exact 2 m gameplay grid, coarse distant mountains. Same triangle order as groundSample.
 const coords=(m)=>{const out=[];for(let v=-m;v< -190;v+=10)out.push(v);for(let v=-190;v<=190;v+=2)out.push(v);for(let v=200;v<=m;v+=10)out.push(v);return out;},xs=coords(340),zs=coords(330),verts=[],uvs=[],colors=[],indices=[];
 const rockTone=new T.Color(0x808b99),snowTone=new T.Color(0xe1ebf3),pathTone=new T.Color(0x8b9299);
 for(const z of zs)for(const x of xs){const y=L.groundSample(x,z),outside=Math.max(0,Math.hypot(x/1.15,z)-235),mount=Math.min(110,outside*.7)*(.62+.38*Math.sin(x*.027+Math.cos(z*.04)));verts.push(x,y+mount,z);uvs.push(x/8,z/8);const snowy=!L.inside(x,z)&&y>-25&&Math.sin(x*.12+Math.cos(z*.10)*2)+Math.cos(z*.13)>.0;const color=(snowy?snowTone:L.inside(x,z)?pathTone:rockTone);colors.push(color.r,color.g,color.b);}
 for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){const a=j*xs.length+i,b=a+xs.length,c=b+1,d=a+1;indices.push(a,b,d,b,c,d);}
 const terrain=new T.BufferGeometry();terrain.setAttribute('position',new T.Float32BufferAttribute(verts,3));terrain.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.setIndex(indices);terrain.computeVertexNormals();const groundMat=mats.rock.clone();groundMat.color.setHex(0xffffff);groundMat.vertexColors=true;groundMat.normalScale.set(.42,.42);const ground=mesh(terrain,groundMat,0,0,0);ground.name='Massif / terrain continu';
 // Winding road markings and compacted gravel follow the actual terrain triangles.
 function trail(points,width,mat){const p=[],u=[],ix=[];let count=0,dist=0;for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.ceil(len/.75);for(let j=0;j<=n;j++){const t=j/n,x=a[0]+dx*t,z=a[1]+dz*t;for(const q of [-1,1]){const xx=x+q*width*.5*dz/len,zz=z-q*width*.5*dx/len;p.push(xx,L.groundSample(xx,zz)+.045,zz);u.push((q+1)/2,(dist+t*len)/5);}if(j>0){const v=count*2;ix.push(v-2,v-1,v,v-1,v+1,v);}count++;}dist+=len;}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(u,2));g.setIndex(ix);g.computeVertexNormals();const m=mat.clone();m.side=T.DoubleSide;m.polygonOffset=true;m.polygonOffsetFactor=-1;const o=mesh(g,m,0,0,0);o.name='Chemin / sol compacté';}
 const routeMat=mats.road.clone();routeMat.color.setHex(0xb4bdc4);routeMat.roughness=.92;routeMat.normalScale.set(.36,.36);
 for(const r of L.EXPLORATION)trail(r.points,2.7,routeMat);
 trail([[-110,131],[-110,92],[-110,69],[-110,47],[-110,25],[-110,-1],[-110,-22]],5.5,routeMat);
 trail([[125,-25],[125,-1],[125,54],[125,79]],5,routeMat);
 // Rock vault over the four-child hall: faceted geological shell, open at the front and at side passages.
 const caveR=30,caveX=-25,caveY=26,caveZ=-111;const caveP=[],caveUV=[],caveI=[],rings=10,sides=28;
 for(let j=0;j<=rings;j++){const z=caveZ-18+j*3.9;for(let i=0;i<=sides;i++){const a=Math.PI*i/sides,rough=1+.06*Math.sin(i*2.7+j*1.8)+.035*Math.cos(i*5.1-j*.8),x=caveX+caveR*Math.cos(a)*rough,y=caveY+1+25*Math.sin(a)*rough;caveP.push(x,y,z);caveUV.push(i*.3,j*.5);}}
 for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;caveI.push(a,b,a+1,a+1,b,b+1);}const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(caveP,3));cg.setAttribute('uv',new T.Float32BufferAttribute(caveUV,2));cg.setIndex(caveI);cg.computeVertexNormals();const cm=mats.rock.clone();cm.side=T.DoubleSide;mesh(cg,cm,0,0,0).name='Voûte rocheuse / chambre PINK';
 // Gallery roof arches: open walkable lanes between concrete portal jambs.
 for(const [x1,x2,z,y] of [[-79,-56,-100,26],[7,32,-100,26],[86,103,-100,26]]){for(let x=x1;x<=x2;x+=6){for(const q of [-1,1])box(x,y+3.5,z+q*6.5,.6,7,.7,'concrete');beam([x,y+7,z-6.5],[x,y+7,z+6.5],.55,'dark');if(Math.round(x)%2===0)tube([x,y+6.65,z-3],[x,y+6.65,z+3],'warm');}}
 const snowPos=[],pos=terrain.attributes.position,idx=terrain.index;for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],v=ids.map(j=>new T.Vector3().fromBufferAttribute(pos,j)),m=v[0].clone().add(v[1]).add(v[2]).divideScalar(3),n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();if(n.y>.76&&m.y>-28&&!L.inside(m.x,m.z)&&Math.sin(m.x*.16+Math.cos(m.z*.12)*2)+Math.cos(m.z*.19)>.15){for(const p of v)snowPos.push(p.x,p.y+.07,p.z);}}const snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.Float32BufferAttribute(snowPos,3));snowGeo.computeVertexNormals();mesh(snowGeo,mats.snow,0,0,0);
 for(let i=0;i<(compact?95:170);i++){const x=(rnd()-.5)*430,z=(rnd()-.5)*410;if(L.inside(x,z)||L.inside(x+3,z)||L.inside(x-3,z)||L.inside(x,z+3)||L.inside(x,z-3))continue;const y=L.groundSample(x,z);if(y< -29)continue;const h=4+rnd()*6;cyl(x,y+h*.28,z,.16,h*.58,'rust');for(let j=0;j<3;j++){inst('needles','leaf2',x,y+h*(.37+j*.22),z,h*(.22-j*.045),h*.48,h*(.22-j*.045));inst('needles','snow',x,y+h*(.40+j*.22),z,h*(.18-j*.037),h*.38,h*(.18-j*.037));}}
 const wc=document.createElement('canvas');wc.width=128;wc.height=256;const wctx=wc.getContext('2d'),wi=wctx.createImageData(128,256);for(let j=0;j<256;j++)for(let i=0;i<128;i++){let k=(j*128+i)*4,v=.5+.26*Math.sin(i*.32+Math.sin(j*.08))+.15*Math.sin(i*.91-j*.09);wi.data[k]=80+v*110;wi.data[k+1]=125+v*120;wi.data[k+2]=170+v*85;wi.data[k+3]=110+v*140;}wctx.putImageData(wi,0,0);const flow=new T.CanvasTexture(wc);flow.wrapS=flow.wrapT=T.RepeatWrapping;flow.repeat.set(2,3);textures.push(flow);const fm=new T.MeshStandardMaterial({map:flow,color:0xb2d6ec,roughness:.27,transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false});for(const x of [7,12,17]){const f=mesh(new T.PlaneGeometry(4.9,43),fm,x,-17,-75);f.name='Cascade / ravin PINK';}const pool=mesh(new T.PlaneGeometry(42,45),new T.MeshPhysicalMaterial({color:0x4a7897,roughness:.18,metalness:.18,clearcoat:.5}),12,-38.5,-65);pool.rotation.x=-Math.PI/2;

 // Sparse gravel and snow shoulder details, no continuous retaining boxes.
 for(const f of L.TERRACES)for(let i=0;i<12;i++){const x=f.x+(rnd()-.5)*f.w,z=f.z+(rnd()-.5)*f.d;box(x,L.groundSample(x,z)+.012,z,.28,.024,.22,'dark');}
 // Small physical wayfinding plates, installed at trail junctions.
 for(const r of L.EXPLORATION){const p=r.points[1],x=p[0]+2.7,z=p[1],y=L.groundSample(x,z);box(x,y+1.1,z,.12,2.2,.12,'steel');sign(r.label,x,y+2.05,z+.12,2.9,.48,'#ddd',{sub:'MAINTENANCE / ACCÈS LOCAL'});}
 const mistC=document.createElement('canvas');mistC.width=mistC.height=128;const mc=mistC.getContext('2d'),mg=mc.createRadialGradient(64,64,2,64,64,64);mg.addColorStop(0,'rgba(195,202,224,.58)');mg.addColorStop(1,'rgba(195,202,224,0)');mc.fillStyle=mg;mc.fillRect(0,0,128,128);const mt=new T.CanvasTexture(mistC);textures.push(mt);const mm=new T.SpriteMaterial({map:mt,transparent:true,opacity:.38,depthWrite:false});const mist=[];for(let j=0;j<(compact?18:32);j++){const o=new T.Sprite(mm),x=(rnd()-.5)*430,z=(rnd()-.5)*400,y=-22+rnd()*15;o.position.set(x,y,z);o.scale.set(80+rnd()*45,19+rnd()*10,1);root.add(o);mist.push({o,x,y,z});}
 // Distant surveillance drones; no collision with player path.
 const drones=[];for(let i=0;i<6;i++){const g=new T.Group(),o=new T.Mesh(new T.SphereGeometry(.7,12,8),mats.dark);o.scale.y=.45;g.add(o);for(const q of [-1,1]){const a=new T.Mesh(geo.box,mats.steel);a.scale.set(1.3,.1,.32);a.position.x=q;g.add(a);const b=new T.Mesh(geo.sphere,mats.red);b.scale.setScalar(.13);b.position.x=q*1.6;g.add(b);}root.add(g);drones.push(g);}
 for(const it of L.INTERACTIONS){const o=mesh(new T.TorusGeometry(.65,.055,6,24),new T.MeshBasicMaterial({color:0x3d586b,toneMapped:false}),it.x,it.y+.07,it.z);o.rotation.x=Math.PI/2;markers.set(it.id,{r:o,done:false,active:false});}
 let total=0;for(const [key,matrices] of batch){const [g,m]=key.split('|'),o=new T.InstancedMesh(geo[g],mats[m],matrices.length);matrices.forEach((v,i)=>o.setMatrixAt(i,v));o.instanceMatrix.needsUpdate=true;o.receiveShadow=true;o.castShadow=!compact;o.computeBoundingSphere();o.updateMatrix();o.matrixAutoUpdate=false;o.name=key;root.add(o);total+=matrices.length;}
 const partner=createHeroPartnerActor(T,scene,{characterId,low:compact,showcase:{x:-110,y:8,z:128}});let purged=false;
 function markDone(id,val=true){const p=markers.get(id);if(p){p.done=val;p.r.material.color.setHex(val?0x74ffb7:p.active?0x50cfff:0x384c62);}if(id==='purge')purged=val;const pod={'pod-a':'child-0','pod-b':'child-1','pod-c':'child-2','pod-d':'child-3'}[id];if(pod){const v=children.get(pod);v.shell.visible=!val;v.figure.visible=!val;}}
 return {root,sun,partner,ready:partner.ready,build(){},setDoor(){},setLine(){},openPortal(){},adapt(){},markDone,setResonance(){},setAvailable(ids){for(const [id,p] of markers){p.active=ids.includes(id);markDone(id,p.done);}},update(t,dt,camera,player){updateLights(t,player);nucleus.rotation.y=t*.5;nucleus.scale.setScalar(purged?.28:1+.05*Math.sin(t*3));flow.offset.y=t*.55;for(let i=0;i<drones.length;i++){const a=t*.14+i*Math.PI/3;drones[i].position.set(-20+Math.cos(a)*112,40+i*3,-65+Math.sin(a)*95);drones[i].rotation.y=-a;}mist.forEach((m,i)=>m.o.position.set(m.x+Math.sin(t*.08+i)*9,m.y,m.z));for(const p of markers.values())p.r.scale.setScalar(p.active?1+.1*Math.sin(t*4):1);partner.update(t,dt,camera,{pulse:0});},stats:()=>({revision:'m15-art-v2',instances:total,batchCount:batch.size,colliders:L.buildCollisions().length,zones:L.FLOORS.length,platforms:0,exploration:L.EXPLORATION.length,ramps:L.RAMPS.length,props:L.PROPS.length+L.EQUIPMENT.length+L.PODS.length,grounded:L.GROUNDED.length,terraces:L.TERRACES.length}),dispose(){partner.dispose();root.removeFromParent();sun.removeFromParent();}};
}
