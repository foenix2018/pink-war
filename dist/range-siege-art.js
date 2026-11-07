import {createNeonFixtures} from './neon-fixtures.js';
import {RANGE_TERMINALS} from './range-terminal-layout.js';
import {WEAPONS} from './game-logic.js';
import {createRangeExterior} from './range-exterior.js';
import {bevelBox} from './geo.js';
import {TARGET_OUTLINE} from './shooting-range.js';

// Detail pass confined to the range. Repeated hardware is instanced; no extra
// shadow maps, postprocessing or per-frame canvas uploads on mobile/WebXR.
export function createRangeSiegeArt(T,parent,{low=false,metalMap=null,obstacles=[],surfaces=null,neons=null}={}){
  const root=new T.Group();root.name='Stand / arsenal Vesper';parent.add(root);
  const textures=[],materials=[],geometries=[],batches=new Map(),animated=[];
  const material=opts=>{const m=new T.MeshStandardMaterial(opts);materials.push(m);return m;};
  const steel=material({color:0x8391a3,map:metalMap,roughness:.48,metalness:.4});
  const dark=material({color:0x384354,map:metalMap,roughness:.69,metalness:.3});
  const edge=material({color:0x79838b,map:metalMap,roughness:.46,metalness:.72});
  const crate=material({color:0x839087,roughness:.74,metalness:.22});
  surfaces?.bind(steel,'steel');surfaces?.bind(edge,'steel');surfaces?.bind(dark,'crate');surfaces?.bind(crate,'crate');
  const brass=material({color:0xb39a58,roughness:.35,metalness:.75});
  const pink=material({color:0xff61bd,emissive:0xff087c,emissiveIntensity:1.8,roughness:.3});
  const cyan=material({color:0x94e7ff,emissive:0x19caff,emissiveIntensity:1.6,roughness:.3});
  const ownsNeons=!neons;neons ||=createNeonFixtures(T,root,{low,metal:edge,back:dark});
  const ownGeo=g=>{geometries.push(g);return g;};
  const simpleCube=ownGeo(new T.BoxGeometry(1,1,1));
  const cube=ownGeo(bevelBox(1,1,1,.045,1)),rod=ownGeo(new T.CylinderGeometry(1,1,1,8));
  const dummy=new T.Object3D();
  function instance(g,m,p,s,rotation=[0,0,0]){
    const key=g.uuid+m.uuid;if(!batches.has(key))batches.set(key,{g,m,transforms:[]});
    dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...rotation);dummy.updateMatrix();batches.get(key).transforms.push(dummy.matrix.clone());
  }
  const box=(m,x,y,z,w,h,d,rotation=[0,0,0])=>{if(m===pink||m===cyan){const wall=[-11.5,-6.9,-2.3,2.3,6.9,11.5].reduce((a,b)=>Math.abs(x-a)<Math.abs(x-b)?a:b);neons.bar([w,h,d],[x,y,z],rotation,m===pink?0xff278d:0x21cfff,undefined,w<Math.min(h,d)?Math.sign(x-wall)||1:null);return;}instance(Math.min(w,h,d)<=.055?simpleCube:cube,m,[x,y,z],[w,h,d],rotation);};
  const up=new T.Vector3(0,1,0);
  function pipe(m,a,b,r){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);dummy.position.copy(start.add(end).multiplyScalar(.5));dummy.scale.set(r,delta.length(),r);dummy.quaternion.setFromUnitVectors(up,delta.normalize());dummy.updateMatrix();const key=rod.uuid+m.uuid;if(!batches.has(key))batches.set(key,{g:rod,m,transforms:[]});batches.get(key).transforms.push(dummy.matrix.clone());}
  function canvasMap(width,height,paint){
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d'),width,height);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.push(map);return map;
  }
  const screenMap=canvasMap(512,512,(c,w,h)=>{
    c.fillStyle='#071523';c.fillRect(0,0,w,h);
    c.strokeStyle='#164654';c.lineWidth=1;
    for(let n=16;n<w;n+=32){c.beginPath();c.moveTo(n,0);c.lineTo(n,h);c.moveTo(0,n);c.lineTo(w,n);c.stroke();}
    c.fillStyle='#7eeaff';c.font='bold 24px monospace';c.fillText('VESPER / TIR',25,35);
    c.strokeStyle='#61dfff';c.lineWidth=4;c.beginPath();TARGET_OUTLINE.forEach(([x,y],i)=>{const px=155+x*115,py=280-y*115;i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();c.stroke();
    c.strokeStyle='#ff44a7';for(const r of [18,42,65]){c.beginPath();c.arc(155,280,r,0,Math.PI*2);c.stroke();}
    c.fillStyle='#ff53ad';c.fillRect(315,100,165,6);c.fillStyle='#69d5e7';c.font='19px monospace';
    for(const [i,text] of ['STAND  /  05','15 • 40 • 60 M','ACQUISITION','SUIVI BALIST.'].entries())c.fillText(text,305,145+i*48);
    c.fillStyle='#153946';c.fillRect(25,430,462,58);c.fillStyle='#9ae5ef';c.font='bold 24px monospace';c.fillText('SYSTEME DE CIBLAGE',45,467);
  });
  const screen=material({color:0xffffff,map:screenMap,emissive:0x77ccef,emissiveMap:screenMap,emissiveIntensity:.8,roughness:.24,metalness:.1});
  const plane=ownGeo(new T.PlaneGeometry(1,1));
  function panel(m,x,y,z,w,h,rotation=[0,0,0]){instance(plane,m,[x,y,z],[w,h,1],rotation);}
  // Framed lane portals follow the existing separator footprint. Diagonal
  // shoulder brackets stay above head height and outside the target sightline.
  for(const x of [-11.5,-6.9,-2.3,2.3,6.9,11.5]){
    for(const z of [19.7,22.9]){
      obstacles.push({x,z,hx:.17,hz:.22,y:0,height:4.6,surface:'metal'});
      box(dark,x,2.3,z,.25,4.6,.32);box(edge,x,2.3,z+.17,.10,4.5,.04);
      box(pink,x,3.89,z+.195,.055,.46,.035);
      for(const y of [.23,1.0,2.68,3.5])box(steel,x,y,z+.19,.31,.12,.075);
      for(const y of [.25,2.68,3.48])for(const side of [-1,1])instance(rod,edge,[x+side*.09,y,z+.24],[.022,.035,.022],[Math.PI/2,0,0]);
    }
    box(steel,x,4.46,21.3,.29,.24,3.7);
    box(cyan,x,4.31,21.3,.06,.035,2.45);
    for(const side of [-1,1]){
      box(steel,x+side*.25,4.24,22.9,.72,.16,.24,[0,0,side*.65]);
      box(pink,x+side*.106,.86,21.5,.015,.12,1.9);
    }
  }
  box(dark,0,4.40,20.1,25.5,.22,.25);
  // Overhead rails, carriage housings and articulated service cable runs.
  for(let lane=-2;lane<=2;lane++){
    const x=lane*4.6;
    for(const side of [-1,1])box(edge,x+side*.075,4.12,-20,.035,.12,79);
    for(const z of [7,-19,-40]){
      box(dark,x,3.98,z,.44,.26,.65);box(steel,x,3.82,z,.31,.09,.38);
      box(pink,x,3.98,z+.335,.22,.045,.025);
      pipe(edge,[x,3.8,z],[x,3.55,z],.045);
    }
    // Tool cases, ammunition and removable trays sit ON the solid benches.
    box(crate,x-.55,1.16,26,.72,.2,.44);box(steel,x-.55,1.28,26,.73,.05,.45);
    for(const dx of [-.27,.27])box(edge,x-.55+dx,1.18,26.235,.055,.15,.032);
    box(pink,x-.55,1.18,26.256,.22,.025,.012);
    for(let j=0;j<6;j++){
      const bx=x+.55+(j%3)*.09,bz=25.85+Math.floor(j/3)*.12;
      instance(rod,brass,[bx,1.13,bz],[.023,.15,.023]);
      instance(rod,edge,[bx,1.225,bz],[.016,.045,.016]);
    }
    // Foot lockers sit within the existing table volume; collision is explicit.
    box(crate,x,.34,26,.92,.61,.57);box(edge,x,.60,26,.95,.065,.59);
    for(const dx of [-.33,.33])box(steel,x+dx,.34,26.3,.08,.57,.035);
    box(pink,x,.35,26.325,.27,.04,.015);
    obstacles.push({x,z:26,hx:.48,hz:.30,y:0,height:.65,surface:'metal'});
  }
  // Five physical touch terminals, sharing one canvas updated only when the
  // selected weapon or exercise state changes. Screen pose matches hit tests.
  const terminalMap=canvasMap(768,512,()=>{});
  const terminalMaterial=material({color:0xffffff,map:terminalMap,emissive:0x92dfff,emissiveMap:terminalMap,emissiveIntensity:.8,roughness:.3});
  let terminalKey='';
  function paintTerminal(sim){
    const index=sim?.weaponIndex??0,key=index+':'+!!sim?.trainingActive;if(key===terminalKey||!terminalMap)return;terminalKey=key;
    const c=terminalMap.image.getContext('2d'),w=768,h=512;
    c.fillStyle='#081526';c.fillRect(0,0,w,h);c.strokeStyle='#163650';c.lineWidth=1;
    for(let v=0;v<w;v+=32){c.beginPath();c.moveTo(v,0);c.lineTo(v,h);c.stroke();}
    for(let v=0;v<h;v+=32){c.beginPath();c.moveTo(0,v);c.lineTo(w,v);c.stroke();}
    c.fillStyle='#80e8ff';c.font='bold 26px monospace';c.fillText('VESPER / TERMINAL DE TIR',30,44);
    c.fillStyle='#ff4ba6';c.fillRect(30,64,708,4);
    c.strokeStyle='#66dfff';c.lineWidth=3;c.beginPath();TARGET_OUTLINE.forEach(([x,y],i)=>{const px=135+x*90,py=235-y*90;i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();c.stroke();
    c.strokeStyle='#ff4ba6';for(const r of [18,40,60]){c.beginPath();c.arc(135,235,r,0,Math.PI*2);c.stroke();}
    c.fillStyle='#88b3cc';c.font='22px monospace';c.fillText('ARME EQUIPEE',280,126);
    c.fillStyle='#f3f9ff';c.font='bold 54px monospace';c.fillText(WEAPONS[index]?.name||'R9',278,195,450);
    c.font='24px monospace';c.fillStyle='#83dfff';c.fillText(WEAPONS[index]?.label||'',280,240,450);
    c.fillStyle='#a7c4d7';c.font='20px monospace';c.fillText(sim?.trainingActive?'EXERCICE EN COURS':'PRET / CIBLES EN ATTENTE',280,296,450);
    c.fillStyle='#194b65';c.fillRect(24,365,720,120);c.strokeStyle='#65dbff';c.lineWidth=3;c.strokeRect(24,365,720,120);
    c.fillStyle='#effbff';c.font='bold 35px monospace';c.fillText('CHOISIR UNE ARME',185,420);
    c.font='21px monospace';c.fillStyle='#7ddfff';c.fillText('TOUCHER L’ECRAN',270,459);terminalMap.needsUpdate=true;
  }
  paintTerminal();
  for(const t of RANGE_TERMINALS){
    box(dark,t.x,.60,t.z-.06,.72,1.20,.52);box(edge,t.x,.08,t.z-.04,.83,.14,.66);
    for(const dx of [-.29,.29]){box(steel,t.x+dx,.65,t.z+.22,.06,1.1,.08);box(dark,t.x+dx*.5,.65,t.z+.22,.018,1.0,.03);}
    box(pink,t.x,.36,t.z+.235,.38,.045,.035);
    box(dark,t.x,t.y+Math.sin(t.tilt)*.13,t.z-Math.cos(t.tilt)*.13,1.05,.82,.19,[t.tilt,0,0]);
    box(edge,t.x,t.y+Math.sin(t.tilt)*.065,t.z-Math.cos(t.tilt)*.065,1.00,.77,.09,[t.tilt,0,0]);
    panel(terminalMaterial,t.x,t.y,t.z,t.width,t.height,[t.tilt,0,0]);
    const lowerY=t.y-.40*Math.cos(t.tilt),lowerZ=t.z-.40*Math.sin(t.tilt);
    box(pink,t.x+.31,lowerY,lowerZ+.025,.23,.045,.04,[t.tilt,0,0]);
    for(const dx of [-.42,.42])for(const dy of [-.34,.34]){
      box(edge,t.x+dx,t.y+dy*Math.cos(t.tilt),t.z+dy*Math.sin(t.tilt)+.018,.035,.035,.025,[t.tilt,0,0]);
    }
    obstacles.push({x:t.x,z:t.z-.03,hx:.54,hz:.31,y:0,height:1.79,surface:'metal',rangeTerminal:t.id});
  }
  // Worn painted arrows and stencilled identification, shared across lanes.
  const stencilMap=canvasMap(256,256,(c,w,h)=>{
    c.fillStyle='#d94b96';
    for(const y of [45,130]){c.beginPath();c.moveTo(30,y+65);c.lineTo(128,y);c.lineTo(226,y+65);c.lineTo(226,y+90);c.lineTo(128,y+25);c.lineTo(30,y+90);c.closePath();c.fill();}
    c.globalCompositeOperation='destination-out';for(let i=0;i<400;i++)c.fillRect((i*71)%w,(i*47)%h,1+i%9,1+i%3);
  });
  const stencil=material({color:0xffffff,map:stencilMap,transparent:true,alphaTest:.25,roughness:.85,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2});
  for(let lane=-2;lane<=2;lane++)panel(stencil,lane*4.6,.042,23.8,1.5,1.5,[-Math.PI/2,0,0]);
  const clothMap=canvasMap(256,512,(c,w,h)=>{
    c.fillStyle='#7d214f';c.fillRect(0,0,w,h);c.fillStyle='#e25b9f';c.beginPath();c.moveTo(35,110);c.lineTo(220,110);c.lineTo(128,270);c.closePath();c.fill();c.fillStyle='#48223c';c.beginPath();c.moveTo(80,133);c.lineTo(173,133);c.lineTo(128,220);c.closePath();c.fill();
    c.fillStyle='#c19ba9';c.font='bold 26px monospace';c.fillText('VESPER',78,330);c.font='18px monospace';c.fillText('SECTION / 05',49,362);
    c.globalCompositeOperation='destination-out';for(let i=0;i<90;i++)c.fillRect((i*67)%w,(i*113)%h,1+i%6,2+i%12);
    c.beginPath();c.moveTo(0,450);for(let x=0;x<=w;x+=8)c.lineTo(x,440+(x*37)%62);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
  });
  const cloth=material({color:0xffffff,map:clothMap,roughness:1,side:T.DoubleSide,alphaTest:.5});
  const clothGeo=ownGeo(new T.PlaneGeometry(1.6,2.3,12,12));const pos=clothGeo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*13)*.045*(1.15-pos.getY(i)));clothGeo.computeVertexNormals();
  for(const side of [-1,1]){
    const flag=new T.Mesh(clothGeo,cloth);flag.position.set(side*12.6,3.2,27.6);flag.rotation.y=side*.4;root.add(flag);
    pipe(edge,[side*12.6-.85,4.4,27.6],[side*12.6+.85,4.4,27.6],.03);
  }
  // Ceiling cable trays and cross bracing, alternating cold / magenta fixtures.
  for(const side of [-1,1]){
    for(let z=29;z>-59;z-=8){
      pipe(dark,[side*7,4.4,z],[side*7,4.4,z-8],.055);
      pipe(edge,[side*12.2,3.4,z],[side*10.9,4.62,z],.045);
      box(dark,side*8.8,4.46,z,.45,.15,2.2);
      box(side<0?pink:cyan,side*8.8,4.37,z,.24,.025,1.8);
      for(const dx of [-.4,.4])pipe(dark,[side*8.8+dx,4.5,z-.8],[side*8.8+dx,4.5,z+.8],.025);
    }
  }
  // Narrow, graded floor glints mimic the light scattered by damp steel. They
  // are static decals, not screen-space reflections or extra scene renders.
  const glintMap=canvasMap(128,256,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,h/2);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.4,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.globalCompositeOperation='destination-out';for(let i=0;i<100;i++){c.fillStyle='rgba(0,0,0,.45)';c.fillRect(0,(i*37)%h,w,1);}
  });
  for(const color of [0xff168e,0x37c9ff]){
    const mat=new T.MeshBasicMaterial({color,map:glintMap,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1});materials.push(mat);
    for(let z=27;z>-55;z-=10)for(const x of (color===0xff168e?[-10.2,-2.3]:[2.3,10.2]))panel(mat,x,.033,z,1.4,5.8,[-Math.PI/2,0,0]);
  }
  // Floor drains and panel seams are flush with the walking surface.
  for(const z of [24.1,29.7]){
    box(dark,0,.022,z,24,.025,.32);
    for(let x=-12;x<12;x+=.16)box(edge,x,.038,z,.038,.012,.29);
  }
  for(let z=33;z>-59;z-=4)box(dark,0,.012,z,26,.008,.018);
  for(const x of [-11.5,-6.9,-2.3,2.3,6.9,11.5])box(dark,x,.012,-13,.018,.008,100);
  // Non-interactive ballistic monitors stay on the outer walls, never on the
  // live firing lanes; silhouettes of actual targets remain authoritative.
  for(const side of [-1,1]){
    box(dark,side*12,2.25,23.1,1.2,2.0,.10);
    panel(screen,side*12,2.25,23.16,1.08,1.83);
    box(cyan,side*12,3.29,23.16,1.23,.04,.04);
    box(pink,side*12,1.21,23.16,1.23,.04,.04);
  }
  // A restrained plume at the sides adds depth without obscuring scoring.
  const hazeMat=new T.MeshBasicMaterial({map:glintMap,color:0x61769c,transparent:true,opacity:.055,depthWrite:false,side:T.DoubleSide});materials.push(hazeMat);
  for(const side of [-1,1])for(const z of [12,-12,-38]){
    const mesh=new T.Mesh(plane,hazeMat);mesh.position.set(side*10,.65,z);mesh.scale.set(3.5,1.1,1);mesh.userData.noWorldShadow=true;root.add(mesh);animated.push(mesh);
  }
  // Reuse the existing range lighting budget: only two small unshadowed accent
  // sources are added, the same count on desktop and headset.
  for(const [x,color] of [[-7,0xff198b],[7,0x39caff]]){
    const light=new T.PointLight(color,22,16,2);light.position.set(x,3.15,24);root.add(light);
  }
  for(const {g,m,transforms} of batches.values()){
    const mesh=new T.InstancedMesh(g,m,transforms.length);transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.name='Arsenal / '+(m===pink?'néons roses':m===cyan?'néons cyan':'détails groupés');
    mesh.castShadow=!m.transparent&&!m.emissive?.getHex();mesh.receiveShadow=!m.transparent;
    if(m.transparent||g===plane||m===pink||m===cyan)mesh.userData.noWorldShadow=true;
    mesh.computeBoundingSphere();root.add(mesh);
  }
  if(ownsNeons)neons.build();
  const exterior=createRangeExterior(T,root,{low,surfaces});
  for(const m of [steel,dark,edge,brass,crate]){m.envMap=exterior.environment;m.envMapIntensity=.38;}
  let disposed=false;
  function update(time=0,sim=null){paintTerminal(sim);exterior.update(time);for(let i=0;i<animated.length;i++)animated[i].position.y=.65+Math.sin(time*.24+i)*.09;}
  function stats(){let meshes=0,triangles=0;root.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);}});return {revision:'vesper-arsenal-02',exterior:exterior.stats(),meshes,triangles,accentLights:2,consoles:5,low};}
  function dispose(){if(disposed)return;disposed=true;if(ownsNeons)neons.dispose();exterior.dispose();root.removeFromParent();root.traverse(n=>{if(n.isInstancedMesh)n.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  return {root,environment:exterior.environment,update,stats,dispose};
}
