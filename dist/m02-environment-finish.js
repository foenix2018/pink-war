// Pink Wars / M02 — deterministic environment detail pass.
// Geometry is decorative: never added to collision arrays, never changes gameplay.
// Shared instancing keeps hundreds of ceiling, road and facade details inexpensive.
export function createEnvironmentFinish(T,{root,scene,performance=false,accent=0xff4fa1}={}){
 const metal=new T.MeshStandardMaterial({color:0x4f626c,roughness:.47,metalness:.78});
 const black=new T.MeshStandardMaterial({color:0x141d25,roughness:.79,metalness:.34});
 const ceramic=new T.MeshStandardMaterial({color:0x9aa5a9,roughness:.74,metalness:.08});
 const oxidized=new T.MeshStandardMaterial({color:0x755b48,roughness:.85,metalness:.38});
 const floorPaint=new T.MeshStandardMaterial({color:0xa09a78,roughness:.91,metalness:.04});
 const glowCyan=new T.MeshBasicMaterial({color:0x7beaf2,toneMapped:false});
 const glowAmber=new T.MeshBasicMaterial({color:0xffc587,toneMapped:false});
 const glowAccent=new T.MeshBasicMaterial({color:accent,toneMapped:false});
 const perMaterial=new Map(),created=[],lights=[],textures=[];
 const put=(m,x,y,z,w,h,d)=>{
  if(!perMaterial.has(m))perMaterial.set(m,[]);
  perMaterial.get(m).push([x,y,z,w,h,d]);
 };
 const panel=(x,y,z,w,h,d,m=metal)=>put(m,x,y,z,w,h,d);
 // Grated drainage housings, two layer curb profiles and road junction bars.
 for(let z=-71;z<=70;z+=11.8){
  for(const side of [-1,1]){
   const x=side*8.53;
   panel(x,.038,z+4.5,.66,.025,1.12,black);
   panel(x,.049,z+4.5,.70,.018,.047,metal);
   for(let n=0;n<7;n++)panel(x,.059,z+4.05+n*.15,.53,.013,.031,metal);
   // Flush curb fasteners; no new standing collision props.
   panel(side*9.12,.13,z+2,.12,.012,.17,oxidized);
   panel(side*9.12,.13,z+2.28,.12,.012,.17,oxidized);
  }
 }
 // Multiple layers of lane markings and occasional emergency access bands.
 for(const z of [-51,-14,27,62]){
  for(let n=0;n<6;n++){
   panel(-6.9+n*2.45,.024,z,1.22,.009,.16,floorPaint);
  }
 }
 // Exterior facade pipes, brackets, fire-service covers, and service trim.
 for(let z=-65;z<=66;z+=16.5){
  for(const side of [-1,1]){
   const x=side*13.05;
   for(const level of [3.1,5.95]){
    panel(x,level,z,.12,.13,8.8,black);
    panel(x-side*.085,level,z,.085,.065,8.8,metal);
    for(const dz of [-3.3,0,3.3]){
     panel(x-side*.12,level,z+dz,.20,.22,.11,oxidized);
    }
   }
   panel(side*13.22,1.3,z+5.0,.14,.91,.78,metal);
   panel(side*13.13,1.36,z+5,.028,.54,.43,black);
   panel(side*13.095,1.52,z+5,.014,.10,.22,glowAmber);
  }
 }
 // Market A / B: genuinely constructed suspended ceilings, not a single flat plane.
 // The building shell is y≈8.7; false-ceiling panels hang at 8.17 m.
 const marketZones=[{side:-1,z:21},{side:1,z:-1}];
 for(const {side,z} of marketZones){
  const xs=Array.from({length:6},(_,i)=>side*(14.6+i*2.24));
  const zs=Array.from({length:7},(_,i)=>z-6.9+i*2.30);
  // Suspended T-bars, independent from the roof. Shared boxes and no collisions.
  for(let i=0;i<=6;i++)panel(side*(13.48+i*2.24),8.23,z,.055,.085,16.05,metal);
  for(let j=0;j<=7;j++)panel(side*20.2,8.23,z-8.05+j*2.30,13.6,.085,.055,metal);
  for(let i=0;i<xs.length;i++)for(let j=0;j<zs.length;j++){
   const missing=(i*11+j*7+(side>0?2:0))%15===0;
   const service=(i*3+j*5)%13===1;
   const lamp=(i===1||i===4)&&(j===2||j===5);
   if(missing){
    panel(xs[i],8.48,zs[j],2.13,.018,2.20,black);
    panel(xs[i],8.42,zs[j],1.65,.02,1.73,oxidized);
    // Exposed suspended conduit inside the damaged ceiling bay.
    panel(xs[i],8.30,zs[j],1.4,.07,.055,metal);
   }else{
    panel(xs[i],8.265,zs[j],2.18,.035,2.22,(i+j)%7===0?oxidized:ceramic);
    if(service){
     panel(xs[i],8.239,zs[j],1.23,.021,.64,black);
     for(let k=0;k<5;k++)panel(xs[i]-.52+k*.26,8.225,zs[j],.095,.017,.51,metal);
    }
   }
   if(lamp){
    panel(xs[i],8.205,zs[j],1.34,.037,.31,black);
    panel(xs[i],8.176,zs[j],1.18,.025,.17,(i+j)%2?glowCyan:glowAmber);
   }
  }
  // Suspended cable duct and narrow containment straps, visible through gaps.
  panel(side*19.5,8.47,z+1.2,.38,.12,13.3,black);
  panel(side*19.3,8.49,z+1.2,.045,.06,13.3,oxidized);
  if(!performance){
   const l=new T.PointLight(0xa6ced4,.52,10,2);
   l.position.set(side*19.5,7.86,z+1.8);scene.add(l);lights.push(l);
  }
 }
 // Graphic billboards: authored fictional adverts; texture reused by sign index.
 const ads=[
  ['VESPER','RESEAU CIVIL','SECTEUR 07 / RESTAURATION',0x79d7e8],
  ['HELIX','SERVICES URBAINS','LE FUTUR A UN PRIX',0xff918d],
  ['NEON 24','RESTAURATION','OUVERT APRES LE COUVRE-FEU',0xf6b77c],
  ['LIGNE 09','TRANSIT LOCAL','DERNIER DEPART : SUSPENDU',0x94a8ff],
  ['ORDRE','AVIS PUBLIC','CONNEXION INTERROMPUE',0xe88fbe],
  ['MED-07','SOINS ET ENERGIE','ACCES PRIORITAIRE',0x8bd8b6]
 ];
 const makeAd=(title,subtitle,micro,tint)=>{
  const cv=document.createElement('canvas');cv.width=performance?384:768;cv.height=performance?192:384;
  const c=cv.getContext('2d'),w=cv.width,h=cv.height;
  c.fillStyle='#0a1420';c.fillRect(0,0,w,h);
  const gr=c.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#1c3040');gr.addColorStop(1,'#121625');c.fillStyle=gr;c.fillRect(0,0,w,h);
  const hex='#'+tint.toString(16).padStart(6,'0');c.strokeStyle=hex;c.lineWidth=w*.009;c.strokeRect(w*.038,h*.08,w*.924,h*.84);
  c.globalAlpha=.2;c.strokeStyle=hex;c.lineWidth=1;
  for(let i=0;i<11;i++){const y=h*(.12+i*.075);c.beginPath();c.moveTo(w*.62,y);c.lineTo(w*.92,y-h*.18);c.stroke();}
  c.globalAlpha=1;
  c.fillStyle=hex;c.fillRect(w*.067,h*.16,w*.012,h*.67);
  c.textBaseline='middle';c.textAlign='left';c.fillStyle='#ecf4f6';c.font='900 '+Math.round(w*.088)+'px system-ui,Arial';
  c.fillText(title,w*.11,h*.40,w*.82);
  c.font='600 '+Math.round(w*.035)+'px system-ui,Arial';c.fillStyle=hex;c.fillText(subtitle,w*.115,h*.61,w*.80);
  c.fillStyle='#a1b7c4';c.font='500 '+Math.round(w*.021)+'px monospace';c.fillText(micro,w*.115,h*.79,w*.80);
  c.fillStyle='#536778';for(let i=0;i<13;i++)c.fillRect(w*.125+i*w*.055,h*.88,w*.026,h*.01);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;textures.push(tex);return tex;
 };
 ads.forEach(([title,subtitle,micro,tint],i)=>{
  const side=i%2?1:-1,z=61-i*23.5;
  const signRoot=new T.Group();signRoot.name='M02 / panneau publicitaire '+title;
  // Place parallel to the facade, surface facing the street.
  signRoot.position.set(side*12.54,5.5,z);
  signRoot.rotation.y=-side*Math.PI/2;
  const surface=new T.Mesh(new T.PlaneGeometry(3.2,1.61),new T.MeshBasicMaterial({map:makeAd(title,subtitle,micro,tint),toneMapped:false,side:T.DoubleSide}));
  surface.position.z=.12;signRoot.add(surface);
  const backing=new T.Mesh(new T.BoxGeometry(3.34,1.74,.13),black);backing.position.z=.015;signRoot.add(backing);
  const strips=[
   [0,.86,3.48,.07,.2],[0,-.86,3.48,.07,.2],
   [-1.70,0,.065,1.72,.2],[1.70,0,.065,1.72,.2]
  ];
  for(const [x,y,w,h,d] of strips){
   const m=new T.Mesh(new T.BoxGeometry(w,h,d),metal);m.position.set(x,y,.08);signRoot.add(m);
  }
  const lightBar=new T.Mesh(new T.BoxGeometry(3.21,.022,.022),i%2?glowCyan:glowAccent);
  lightBar.position.set(0,-.78,.13);signRoot.add(lightBar);
  root.add(signRoot);created.push(signRoot);
 });
 // A distinct overhead wayfinding structure; does not obstruct access to the bridges.
 for(const z of [39,-38]){
  const g=new T.Group();g.name='M02 / portique de signalisation';
  const upright=new T.Mesh(new T.CylinderGeometry(.105,.105,6.4,9),metal);
  upright.position.set(-7.05,3.2,z);g.add(upright);
  const cantilever=new T.Mesh(new T.BoxGeometry(4.4,.15,.15),metal);
  cantilever.position.set(-4.95,6.33,z);g.add(cantilever);
  const plate=new T.Mesh(new T.BoxGeometry(2.15,.78,.09),black);
  plate.position.set(-3.65,5.9,z);g.add(plate);
  for(let n=0;n<3;n++){
   const bar=new T.Mesh(new T.BoxGeometry(.47,.07,.11),n===1?glowAmber:glowCyan);
   bar.position.set(-4.32+n*.65,5.88,z+(z>0?.052:-.052));g.add(bar);
  }
  root.add(g);created.push(g);
 }
 const geometry=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4(),pos=new T.Vector3(),scale=new T.Vector3(),quat=new T.Quaternion();
 let count=0;
 for(const [material,list] of perMaterial){
  if(!list.length)continue;
  const mesh=new T.InstancedMesh(geometry,material,list.length);
  mesh.name='M02 / finitions instanciées · '+material.uuid.slice(0,6);
  mesh.receiveShadow=true;mesh.castShadow=false;
  list.forEach(([x,y,z,w,h,d],i)=>mesh.setMatrixAt(i,matrix.compose(pos.set(x,y,z),quat,scale.set(w,h,d))));
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);created.push(mesh);count+=list.length;
 }
 return {stats:()=>({instances:count,objects:created.length,adverts:ads.length,ceilingZones:marketZones.length,extraLights:lights.length}),dispose(){
   created.forEach(o=>o.removeFromParent());lights.forEach(o=>o.removeFromParent());
   for(const tex of textures)tex.dispose();geometry.dispose();
   for(const m of [metal,black,ceramic,oxidized,floorPaint,glowCyan,glowAmber,glowAccent])m.dispose();
 }};
}
