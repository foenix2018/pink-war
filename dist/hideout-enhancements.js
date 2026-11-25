// WebGPU-compatible, shared geometry and instancing; no per-frame geometry creation.
export function diversifyHideoutScreens(T,geometry,material){
 const uv=geometry.attributes.uv,index=geometry.index;if(!uv||!index)return null;
 const parent=Array.from({length:uv.count},(_,i)=>i);
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<index.count;i+=3){join(index.getX(i),index.getX(i+1));join(index.getX(i),index.getX(i+2));}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
 const labels=['VESPER / CARTE TACTIQUE','NANO / DIAGNOSTIC','ARCHIVES / JOURNAL','GYM / PERFORMANCE','GAB-1 / PROTECTION','CAR-14 / ENERGIE','ORDRE / SIGNAL','REFUGE / SYSTEMES'];
 for(let k=0;k<8;k++){
  const x=(k%4)*256,y=Math.floor(k/4)*256,accent=k%2?'#ff72af':'#70ddff';
  ctx.fillStyle='#071622';ctx.fillRect(x,y,256,256);ctx.save();ctx.translate(x,y);ctx.strokeStyle='#17354b';ctx.lineWidth=1;
  for(let i=16;i<256;i+=24){ctx.beginPath();ctx.moveTo(i,30);ctx.lineTo(i,235);ctx.stroke();ctx.beginPath();ctx.moveTo(8,i);ctx.lineTo(248,i);ctx.stroke();}
  ctx.fillStyle=accent;ctx.font='bold 13px sans-serif';ctx.fillText(labels[k],12,22);ctx.fillRect(12,30,232,2);ctx.lineWidth=2;ctx.strokeStyle=accent;
  if(k===0||k===6){for(let i=0;i<6;i++){ctx.strokeRect(20+i*29,53+(i*29)%89,22,42);ctx.beginPath();ctx.moveTo(31+i*29,74+(i*29)%89);ctx.lineTo(129,166);ctx.stroke();}ctx.strokeRect(119,156,20,20);}
  else if(k===1){ctx.strokeRect(35,100,136,25);ctx.strokeRect(70,125,20,39);ctx.strokeRect(171,106,47,12);ctx.strokeRect(98,87,36,13);ctx.strokeRect(18,105,17,15);}
  else if(k===3){ctx.font='bold 44px monospace';ctx.fillText('00:00',24,94);ctx.font='15px sans-serif';ctx.fillText('FORCE / HABILETE',16,132);for(let j=0;j<3;j++){ctx.fillStyle='#17354b';ctx.fillRect(16,150+j*19,210,9);ctx.fillStyle=accent;ctx.fillRect(16,150+j*19,45+j*39,9);}}
  else if(k===4||k===5){for(let r of [24,42,63]){ctx.beginPath();ctx.arc(128,125,r,0,Math.PI*2);ctx.stroke();}ctx.fillRect(117,114,22,22);}
  else{for(let j=0;j<7;j++){ctx.fillStyle=accent;ctx.fillRect(18,53+j*21,5,7);ctx.fillStyle='#638398';ctx.fillRect(30,53+j*21,125+(j*31)%80,4);}}
  ctx.fillStyle=accent;ctx.font='12px monospace';ctx.fillText(k===3?'SESSION / PRET':'SYSTEME / EN LIGNE',12,239);ctx.restore();
 }
 const roots=new Map();let n=0;for(let i=0;i<uv.count;i++){const root=find(i);if(!roots.has(root))roots.set(root,n++%8);const k=roots.get(root);uv.setXY(i,((k%4)+.035+.93*uv.getX(i))/4,(1-Math.floor(k/4)+.035+.93*uv.getY(i))/2);}
 uv.needsUpdate=true;const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;material.map=map;material.emissiveMap=map;material.emissiveIntensity=.85;material.needsUpdate=true;return {map,count:roots.size};
}
export function createHideoutEnhancements(T,layout,materials,{low=false}={}){
 const root=new T.Group();root.name='Planque / équipements et vortex';const own=[],geo=[];
 const steel=materials.get('Métal brossé'),fabric=materials.get('Cuir et joints'),black=materials.get('Cadres anthracite');
 const mat=(p)=>{const m=new T.MeshBasicMaterial(p);own.push(m);return m;};
 const pink=mat({color:0xff409c,toneMapped:false}),blue=mat({color:0x40bfff,toneMapped:false});
 const mesh=(geometry,material,parent,x,y,z)=>{geo.push(geometry);const o=new T.Mesh(geometry,material);o.position.set(x,y,z);parent.add(o);return o;};
 // Four compact fabric-covered smart speakers with rounded lathed bodies and touch displays.
 const profile=[[0,0],[.073,0],[.095,.015],[.103,.04],[.105,.12],[.105,.23],[.096,.28],[.079,.30],[0,.30]].map(([x,y])=>new T.Vector2(x,y));
 const body=new T.LatheGeometry(profile,low?20:32);geo.push(body);
 const fabricMat=fabric.clone();own.push(fabricMat);if(fabricMat.map){fabricMat.map=fabricMat.map.clone();fabricMat.map.repeat.set(3,2);fabricMat.map.needsUpdate=true;}if(fabricMat.normalMap){fabricMat.normalMap=fabricMat.normalMap.clone();fabricMat.normalMap.repeat.set(3,2);fabricMat.normalMap.needsUpdate=true;}
 const cap=new T.CylinderGeometry(.074,.079,.018,24);geo.push(cap);const led=new T.TorusGeometry(.065,.003,6,28);geo.push(led);
 const speakers=[[-2.73,1.34,.25,pink],[2.73,1.34,.25,blue],[10.42,1.78,6.05,pink],[10.42,1.78,9.45,blue]];
 for(const [x,y,z,color] of speakers){
  const g=new T.Group();g.position.set(x,y,z);g.name='Enceinte connectée';root.add(g);
  const m=new T.Mesh(body,fabricMat);g.add(m);const c=new T.Mesh(cap,black);c.position.y=.302;g.add(c);
  const ring=new T.Mesh(led,color);ring.rotation.x=-Math.PI/2;ring.position.y=.313;g.add(ring);
  mesh(new T.BoxGeometry(.29,.045,.30),steel,g,0,-.026,0);
  mesh(new T.BoxGeometry(.22,.14,.045),black,g,0,-.105,.11);
 }
 // Two spirals, animated by time, with small instanced luminous particles.
 const effects=[],particleGeo=new T.SphereGeometry(1,6,4);geo.push(particleGeo);
 for(const [id,x,color] of [['gaby',-2.15,0xff4b9b],['cara',2.15,0x41bbff]]){
  const g=new T.Group();g.position.set(x,.34,7.30);g.name='Vortex recharge '+id;root.add(g);
  const light=mat({color,transparent:true,opacity:.85,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
  const points=low?28:48;const particles=new T.InstancedMesh(particleGeo,light,points);particles.frustumCulled=false;g.add(particles);
  const ribbons=[];
  for(let j=0;j<2;j++){const curve=[];for(let i=0;i<=96;i++){const u=i/96,a=u*Math.PI*5+j*Math.PI,r=.62-.18*u;curve.push(new T.Vector3(Math.cos(a)*r,u*1.28,Math.sin(a)*r));}const path=new T.CatmullRomCurve3(curve),tube=new T.TubeGeometry(path,96,.010,5,false);geo.push(tube);const m=new T.Mesh(tube,light);g.add(m);ribbons.push(m);}
  effects.push({id,g,particles,points,ribbons,light});
 }
 // Dedicated training display, original vector UI rendered to canvas.
 const cv=document.createElement('canvas');cv.width=512;cv.height=256;const c=cv.getContext('2d');c.fillStyle='#081622';c.fillRect(0,0,512,256);c.fillStyle='#70ddff';c.font='bold 25px sans-serif';c.fillText('PINKWARS / TRAINING',24,40);c.fillStyle='#ff71ae';c.font='bold 58px monospace';c.fillText('00:00',25,115);c.font='20px sans-serif';c.fillStyle='#cfedff';c.fillText('FORCE    HABILETE    ENDURANCE',24,175);c.fillStyle='#245371';for(let i=0;i<3;i++)c.fillRect(25+i*159,195,137,10);
 const screenMap=new T.CanvasTexture(cv);screenMap.colorSpace=T.SRGBColorSpace;const screenMat=mat({map:screenMap,toneMapped:false});const screen=mesh(new T.PlaneGeometry(1.25,.625),screenMat,root,10.53,1.95,4.8);screen.rotation.y=-Math.PI/2;
 const frame=mesh(new T.BoxGeometry(.08,.69,1.31),black,root,10.59,1.95,4.8);
 // Original refuge art: small printed plates and personal keepsakes, all
 // positioned against existing partitions (no new collider or navigation change).
 const livedAtlas=document.createElement('canvas');livedAtlas.width=1024;livedAtlas.height=512;
 const ac=livedAtlas.getContext('2d');
 const notes=[
  ['DORTOIR','GHJU  /  LYLU','REPOS · QUART PRIVÉ','#d6c9b2','#51443a'],
  ['ARMURERIE','CONTRÔLE AVANT DÉPART','VÉRIFIER · RANGER · RECHARGER','#a79e82','#353b37'],
  ['TENUES','CAPSULES NANO','ENTRETIEN APRÈS MISSION','#b7bdb6','#37464c'],
  ['ATELIER','PIÈCES / OUTILS','NE RIEN JETER','#c2a66e','#43392b'],
  ['ENTRAÎNEMENT','CHAQUE JOUR COMPTE','FORCE · MOBILITÉ · ENDURANCE','#4a5d50','#eee6d4'],
  ['ARCHIVES','NOTRE HISTOIRE','NE PAS OUBLIER','#dfcfb2','#584735'],
  ['SALON','ENFIN CHEZ NOUS','GHJU  ·  LYLU  ·  GAB-1  ·  CAR-14','#d5b49a','#5d4337'],
  ['RECHARGE','GAB-1  /  CAR-14','PROTÉGER CE QUI RESTE','#b7c7c0','#36504e']
 ];
 for(let i=0;i<notes.length;i++){const [title,sub,caption,bg,fg]=notes[i],x=(i%4)*256,y=Math.floor(i/4)*256;
  ac.save();ac.translate(x,y);ac.fillStyle=bg;ac.fillRect(0,0,256,256);ac.strokeStyle=fg;ac.globalAlpha=.65;ac.lineWidth=2;ac.strokeRect(8,8,240,240);ac.globalAlpha=1;
  ac.fillStyle=fg;ac.font='bold 22px Arial';ac.fillText(title,20,57,216);ac.fillRect(20,70,216,2);
  ac.font='bold 15px Arial';ac.fillText(sub,20,111,216);ac.font='12px Arial';ac.fillText(caption,20,145,216);
  for(const [xx,yy]of [[13,13],[243,13],[13,243],[243,243]]){ac.fillStyle='#72685b';ac.beginPath();ac.arc(xx,yy,3,0,Math.PI*2);ac.fill();}
  let seed=91+i*997;for(let k=0;k<160;k++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const xx=seed%256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ac.fillStyle='rgba(49,36,24,.075)';ac.fillRect(xx,seed%256,3,1);}
  ac.restore();
 }
 const livedMap=new T.CanvasTexture(livedAtlas);livedMap.colorSpace=T.SRGBColorSpace;livedMap.anisotropy=2;
 const plateMat=new T.MeshStandardMaterial({map:livedMap,roughness:.88,metalness:.06});own.push(plateMat);
 const plateBack=new T.MeshStandardMaterial({color:0x777067,roughness:.84,metalness:.12});own.push(plateBack);
 const placements=[[-4.646,2.02,-9.45,-Math.PI/2],[-4.646,2.14,-3.175,-Math.PI/2],[-4.646,2.14,9.375,-Math.PI/2],[4.646,2.10,-2.55,Math.PI/2],[4.646,2.14,4.2125,Math.PI/2],[-4.454,2.08,-9.45,Math.PI/2],[-2.854,2.08,-.9,Math.PI/2],[4.454,2.08,10.3125,-Math.PI/2]];
 const lived=new T.Group();lived.name='Planque / mémoire et signalétique physique';lived.userData.interior=true;root.add(lived);
 placements.forEach(([x,y,z,yaw],i)=>{const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;lived.add(g);
  mesh(new T.BoxGeometry(.82,.43,.024),plateBack,g,0,0,-.006);
  const plane=new T.PlaneGeometry(.80,.41),uv=plane.attributes.uv;
  for(let j=0;j<uv.count;j++)uv.setXY(j,((i%4)+.02+.96*uv.getX(j))/4,(1-Math.floor(i/4)+.02+.96*uv.getY(j))/2);
  mesh(plane,plateMat,g,0,0,.009).receiveShadow=true;
 });
 // Small everyday objects anchored on the existing, metric furniture.
 // No new floor footprint: all dimensions fit the authored tabletop extents.
 const personal=new T.Group();personal.name='Planque / objets du quotidien';root.add(personal);
 const ceramic=new T.MeshStandardMaterial({color:0xc8bba8,roughness:.64,metalness:0}),coffee=new T.MeshStandardMaterial({color:0x34241d,roughness:.87}),paper=new T.MeshStandardMaterial({color:0xcfc4aa,roughness:.97}),cover=new T.MeshStandardMaterial({color:0x514e43,roughness:.87}),fabricWarm=new T.MeshStandardMaterial({color:0x76634f,roughness:.99});
 own.push(ceramic,coffee,paper,cover,fabricWarm);
 const mugGeo=new T.LatheGeometry([[.041,0],[.047,.005],[.048,.085],[.046,.09],[.041,.09],[.039,.078],[.039,.011]].map(([x,y])=>new T.Vector2(x,y)),low?12:20);geo.push(mugGeo);
 const handleGeo=new T.TorusGeometry(.026,.008,5,low?10:16);geo.push(handleGeo);
 const liquidGeo=new T.CircleGeometry(.039,low?12:20);geo.push(liquidGeo);
 function cup(x,y,z,angle=0){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;personal.add(g);
  g.add(new T.Mesh(mugGeo,ceramic));const handle=new T.Mesh(handleGeo,ceramic);handle.position.set(.061,.047,0);g.add(handle);
  const liquid=new T.Mesh(liquidGeo,coffee);liquid.rotation.x=-Math.PI/2;liquid.position.y=.073;g.add(liquid);
 }
 function book(x,y,z,angle=0,w=.17,d=.24){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;personal.add(g);
  mesh(new T.BoxGeometry(w,.022,d),paper,g,0,.015,0);
  for(const yy of [.003,.029])mesh(new T.BoxGeometry(w+.008,.006,d+.008),cover,g,0,yy,0);
  mesh(new T.BoxGeometry(.008,.032,d+.008),cover,g,-w/2,0.016,0);
 }
 // Archive table, lounge table, two nightstands and nano workshop.
 cup(-1.25,.851,-8.15,.45);book(-1.53,.851,-8.18,.18,.21,.29);
 cup(.17,.489,.79,-.8);book(-.15,.489,1.23,-.22,.18,.23);
 book(-8.14,.573,-9.12,.15,.13,.20);book(-5.64,.573,-9.12,-.16,.13,.20);
 cup(8.28,.951,-1.32,1.2);book(7.92,.951,-1.34,.2,.16,.23);
 // Closed fabric pouch and folded repair cloth on the workbench.
 mesh(new T.BoxGeometry(.23,.07,.15),fabricWarm,personal,8.65,.987,-1.32);
 mesh(new T.BoxGeometry(.25,.025,.18),fabricWarm,personal,7.48,.963,-1.32);
 const dummy=new T.Object3D();
 return{root,update(t){for(const e of effects){e.g.rotation.y=t*.7;e.light.opacity=.65+.17*Math.sin(t*2);for(let i=0;i<e.points;i++){const u=((i/e.points+t*.22)%1),a=i*2.399+t*1.8,r=.59-.14*u;dummy.position.set(Math.cos(a)*r,u*1.32,Math.sin(a)*r);dummy.scale.setScalar(.011+.008*Math.sin(i*1.4+t*3)**2);dummy.updateMatrix();e.particles.setMatrixAt(i,dummy.matrix);}e.particles.instanceMatrix.needsUpdate=true;}},snapshot(){return{speakers:speakers.length,vortices:effects.length,trainingDisplay:1,physicalRoomSigns:placements.length,personalProps:personal.children.length,fitnessEquipment:layout.fitnessEquipment||[]};},dispose(){root.removeFromParent();for(const e of effects)e.particles.dispose();for(const g of new Set(geo))g.dispose();for(const m of own)m.dispose();fabricMat.map?.dispose();fabricMat.normalMap?.dispose();screenMap.dispose();livedMap.dispose();}};
}
