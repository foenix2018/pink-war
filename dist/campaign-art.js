// Level 1: a human maintenance annex inside Vesper. Geometry and colliders are
// kept together; callers activate .obstacles only while the campaign is active.
// No native XR pose, world scale, HUD or shared city material is changed here.
export function createCampaignArt(T, scene, _worldObstacles, {quality='auto'}={}) {
  const root=new T.Group();root.name='VESPER — Annexe de maintenance / niveau 1';root.visible=false;scene.add(root);
  const obstacles=[],ownedGeometry=new Set(),ownedMaterials=new Set(),ownedTextures=new Set(),batches=new Map();
  const screens=[],waypoints=[],tmp=new T.Object3D();let disposed=false,lastState='',stage='power',currentObjective=null;
  const ownGeo=g=>(ownedGeometry.add(g),g),ownMat=m=>(ownedMaterials.add(m),m);
  let seed=329031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function texture(width,height,paint) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');paint(context,width,height);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;ownedTextures.add(map);return {canvas,context,map};
  }
  const metal=texture(256,256,(c,w,h)=>{
    c.fillStyle='#a6a59f';c.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){const a=random()*.10;c.fillStyle=`rgba(25,31,30,${a})`;c.fillRect(random()*w,random()*h,2+random()*40,.5+random()*2);}
    for(let i=0;i<50;i++){c.fillStyle=`rgba(90,50,22,${.07+random()*.16})`;c.beginPath();c.ellipse(random()*w,random()*h,1+random()*8,2+random()*19,0,0,Math.PI*2);c.fill();}
  }).map;
  metal.wrapS=metal.wrapT=T.RepeatWrapping;
  const concrete=texture(256,256,(c,w,h)=>{
    c.fillStyle='#9b9e92';c.fillRect(0,0,w,h);
    for(let i=0;i<4200;i++){const light=random()>.5; c.fillStyle=light?'rgba(222,221,201,.12)':'rgba(32,40,36,.10)';c.fillRect(random()*w,random()*h,1+random()*4,1+random()*3);}
    c.strokeStyle='rgba(30,42,34,.26)';c.lineWidth=1.2;
    for(let i=0;i<6;i++){let x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);for(let j=0;j<7;j++){x+=(random()-.5)*22;y+=random()*15;c.lineTo(x,y);}c.stroke();}
  }).map;
  concrete.wrapS=concrete.wrapT=T.RepeatWrapping;
  const std=(color,roughness,metalness,map)=>ownMat(new T.MeshStandardMaterial({color,roughness,metalness,map,bumpMap:map,bumpScale:map===metal?.008:.019}));
  const m={concrete:std(0x6f776d,.98,.02,concrete),steel:std(0x708282,.47,.72,metal),rust:std(0x64442f,.86,.32,metal),dark:std(0x141c1b,.83,.27,metal),floor:std(0x3a4b46,.93,.12,concrete),paper:std(0xbbb99a,.99,0),leaf:std(0x324c30,.98,0),leafLight:std(0x576947,.98,0),amber:ownMat(new T.MeshBasicMaterial({color:0xe4b765,toneMapped:false})),inactive:ownMat(new T.MeshBasicMaterial({color:0x30493d,toneMapped:false}))};
  const geo={box:ownGeo(new T.BoxGeometry(1,1,1)),rod:ownGeo(new T.CylinderGeometry(1,1,1,8)),stone:ownGeo(new T.IcosahedronGeometry(1,0)),plane:ownGeo(new T.PlaneGeometry(1,1))};
  function add(shape,mat,pos,scale=[1,1,1],rotation=[0,0,0]) {
    const key=shape+mat.uuid;if(!batches.has(key))batches.set(key,{geometry:geo[shape],material:mat,matrices:[]});
    tmp.position.set(...pos);tmp.scale.set(...scale);
    rotation.isQuaternion?tmp.quaternion.copy(rotation):tmp.rotation.set(...rotation);tmp.updateMatrix();batches.get(key).matrices.push(tmp.matrix.clone());
  }
  const box=(mat,x,y,z,w,h,d)=>add('box',mat,[x,y,z],[w,h,d]);
  function rod(mat,a,b,r=.04) {const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);add('rod',mat,from.add(to).multiplyScalar(.5).toArray(),[r,delta.length(),r],new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));}
  function solid(x,z,w,d,y,height,surface='metal'){const collider={x,z,hx:w/2,hz:d/2,y,height,surface,campaign:true};obstacles.push(collider);return collider;}
  function wall(x,z,w,h,d){box(m.concrete,x,h/2,z,w,h,d);solid(x,z,w,d,0,h,'concrete');}
  function cable(points,r=.028){for(let i=1;i<points.length;i++)rod(m.dark,points[i-1],points[i],r);}
  function ivy(x,z,top,bottom,side=1){
    let previous=[x,top,z];for(let y=top-.24;y>bottom;y-=.29){const point=[x+Math.sin(y*2.1)*.10,y,z+side*.015];rod(m.rust,previous,point,.014);previous=point;for(const s of [-1,1])add('stone',random()>.45?m.leaf:m.leafLight,[point[0]+s*.095,y+.03,point[2]+side*.06],[.12,.055,.16],[.5,s*.8,y]);}
  }
  // Asymmetric east side fits the existing city block (x >= 7, z >= 61.5).
  // Both ends have a six-metre opening, so the lab is a traversable ruin.
  wall(-8.8,59.5,.42,3.35,17);wall(6.45,59.5,.35,2.6,17);
  wall(-5.9,51,5.8,1.16,.42);wall(4.7,51,3.4,1.16,.42);
  wall(-5.9,68,5.8,1.10,.42);wall(4.7,68,3.4,1.10,.42);
  for(const [x,z] of [[-8.8,51],[-8.8,59.5],[-8.8,68],[6.45,51],[6.45,59.5],[6.45,68],[-3.05,51],[3.05,51],[-3.05,68],[3.05,68]]){
    box(m.steel,x,2,z,.24,4,.24);solid(x,z,.24,.24,0,4);
    box(m.rust,x,.12,z,.42,.24,.42);
  }
  for(const z of [51,59.5,68]){box(m.rust,-1.15,4,z,15.6,.24,.22);solid(-1.15,z,15.6,.22,3.88,.24);}
  for(const x of [-8.8,6.45]){box(m.steel,x,3.96,59.5,.23,.22,17.3);solid(x,59.5,.23,17.3,3.85,.22);}
  // Roof fragments, never a full enclosure; canopy shadows frame the terminals.
  for(const [x,z,w,d] of [[-6.5,53,4.2,3.6],[-7.1,63,3,4.3],[4.7,54,3.4,5.2]]){
    box(m.concrete,x,4.05,z,w,.16,d);solid(x,z,w,d,3.97,.16,'concrete');
    for(let i=0;i<3;i++)rod(m.rust,[x-w*.4+i*w*.38,4.14,z+d/2],[x-w*.4+i*w*.38+.17,4.25,z+d/2+.55],.022);
  }
  // Flush slab: player remains on the existing y=0 locomotion plane.
  box(m.floor,-1.15,.006,59.5,15.2,.012,16.75);
  for(const x of [-7,-3,1,5])box(m.dark,x,.014,59.5,.025,.008,16.4);
  for(const z of [53,57,61,65])box(m.dark,-1.15,.014,z,14.9,.008,.025);
  // Broken wall edges and low rubble remain within the solid wall footprints.
  for(let i=0;i<20;i++) {
    const side=i%2?1:-1,x=side===1?6.44:-8.78,z=51.5+random()*15.8;
    add('stone',i%3?m.concrete:m.rust,[x,side===1?2.57:3.32,z],[.15,.12+random()*.12,.22],[0,random()*3,0]);
  }
  // Furniture does not obstruct either door or the two terminal approaches.
  for(const [x,z,w] of [[-7.5,54.3,1.1],[5.3,57.5,1.2]]){
    box(m.steel,x,.80,z,w,.10,2.3);solid(x,z,w,2.3,0,.85);
    for(const dx of [-w*.4,w*.4])for(const dz of [-.95,.95])box(m.dark,x+dx,.38,z+dz,.065,.76,.065);
    box(m.rust,x,.98,z-.5,w*.7,.25,.66);solid(x,z-.5,w*.7,.66,.85,.25);
    add('plane',m.paper,[x,.858,z+.35],[w*.65,.43,1],[-Math.PI/2,0,.2]);
  }
  for(const [x,z] of [[-7.55,66.5],[5.1,64.7]]){
    box(m.dark,x,.47,z,1.3,.94,.75);box(m.steel,x,.94,z,1.33,.05,.78);solid(x,z,1.33,.78,0,.97);
    for(let i=0;i<4;i++)box(m.rust,x,.20+i*.20,z+.381,1.1,.045,.02);
  }
  // Conduits link the isolated power cabinet and archive, visibly bypassing the city network.
  cable([[-6,1.3,61.4],[-8.5,1.3,61.4],[-8.5,3.2,61.4],[-8.5,3.3,54.6],[-3,3.45,54.6],[0,3.2,54.6],[0,1.2,54.3]],.055);
  cable([[-8.45,3.3,66],[-6.9,2.9,65.5],[-5.8,2.4,65.1],[-4.8,2.75,64.8],[-3.7,3.45,64.5]],.023);
  for(const z of [52.3,55.2,59,66.2])ivy(-8.55,z,3.85,.8,1);
  for(const x of [4.6,5.3,6])ivy(x,51.27,3.1,.65,1);

  function panel(name,x,y,z,w,h,{yaw=0,width=1024,height=512}={}) {
    const data=texture(width,height,()=>{}),material=ownMat(new T.MeshBasicMaterial({map:data.map,toneMapped:false}));
    const mesh=new T.Mesh(ownGeo(new T.PlaneGeometry(w,h)),material);mesh.position.set(x,y,z);mesh.rotation.y=yaw;mesh.name=name;root.add(mesh);
    const screen={name,...data,mesh,paint(lines,caption,accent='#dfb26c'){
      const c=data.context,ww=data.canvas.width,hh=data.canvas.height;
      c.fillStyle='#071813';c.fillRect(0,0,ww,hh);c.fillStyle='#12291f';c.fillRect(12,12,ww-24,hh-24);
      c.fillStyle=accent;c.fillRect(24,24,6,hh-48);c.font=`600 ${Math.round(hh*.067)}px sans-serif`;c.fillText(caption,52,hh*.13,ww-96);
      c.strokeStyle='#486454';c.lineWidth=2;c.beginPath();c.moveTo(52,hh*.19);c.lineTo(ww-44,hh*.19);c.stroke();
      lines.forEach((line,i)=>{c.fillStyle=i===0?'#e5eee0':'#b8cfbd';c.font=`${i===0?'600 ':''}${Math.round(hh*(lines.length>5?.060:.072))}px sans-serif`;c.fillText(line,52,hh*(.31+i*(lines.length>5?.11:.14)),ww-96);});
      data.map.needsUpdate=true;
    }};screens.push(screen);return screen;
  }
  function fixedSign(title,lines,x,y,z,w=3.6,h=1.05,yaw=0){const p=panel(title,x,y,z,w,h,{yaw,width:1024,height:320});p.paint(lines,title);return p;}
  // Front marker sits above the open doorway, not across its walkable opening.
  box(m.dark,0,3.48,68.02,6,.78,.13);solid(0,68.02,6,.13,3.09,.78);
  fixedSign('VESPER  /  SECOURS & MAINTENANCE',['ANNEXE 07 · TERMINAUX HORS RÉSEAU'],0,3.48,68.093,5.65,.67);
  fixedSign('ARCHIVES VÉGÉTALES',['← ESCALIER OUEST  /  ASCENSEUR DE SERVICE'],-5.5,1.74,68.235,4.55,.95);

  box(m.dark,-6,1.05,61.65,1.65,2.10,.60);solid(-6,61.65,1.65,.60,0,2.10).campaignTerminal='power';
  box(m.steel,-6,1.55,61.963,1.54,.97,.07);
  const powerScreen=panel('Tableau électrique local',-6,1.55,62.005,1.41,.83);
  for(const x of [-6.45,-6.15,-5.85,-5.55]){box(m.steel,x,.57,61.97,.15,.4,.045);box(m.rust,x,.56,62.02,.09,.17,.07);}
  box(m.amber,-6.66,1.97,62.01,.09,.09,.025);

  function terminal(x,y,z,name,id){
    box(m.dark,x,y+.5,z,.96,1,.56);solid(x,z,.96,.56,y,1).campaignTerminal=id;
    box(m.steel,x,y+1.43,z,2.66,1.15,.27);solid(x,z,2.66,.27,y+.855,1.15).campaignTerminal=id;
    box(m.dark,x,y+1.43,z+.149,2.50,1,.055);
    const screen=panel(name,x,y+1.43,z+.184,2.39,.91,{width:1024,height:448});
    box(m.dark,x,y+.98,z+.27,1.74,.075,.5);solid(x,z+.27,1.74,.5,y+.94,.08).campaignTerminal=id;
    for(let row=0;row<3;row++)for(let key=0;key<14;key++)box(m.steel,x-.66+key*.102,y+1.025,z+.12+row*.092,.077,.008,.065);
    return screen;
  }
  const archiveScreen=terminal(0,0,54.45,'Archive humaine — laboratoire','archive');
  const exitScreen=terminal(-48,4.8,38.55,'Relais des Archives végétales','exit');
  // A modest mast identifies the exit without requiring a permanent HUD arrow.
  box(m.steel,-49.7,6.20,38.55,.08,2.8,.08);solid(-49.7,38.55,.08,.08,4.8,2.8);
  fixedSign('RELAIS 01',['ARCHIVES VÉGÉTALES'],-48,7.02,38.56,3.5,.80);
  box(m.steel,-44.75,1.28,63,.07,2.56,.07);solid(-44.75,63,.07,.07,0,2.56);
  fixedSign('RELAIS 01',['ESCALIER ↑'],-44.75,2.20,63.04,2,.65);
  // Ground studs are environmental route markers, never a view-locked overlay.
  const routes={power:[[0,71],[0,65],[-4.7,63.8]],archive:[[-4.7,63.8],[0,61],[0,57]],exit:[[0,57],[0,71.9],[-17,73],[-34,73],[-48,65],[-48,62],[-48,46],[-48,41.3]]};
  for(const [route,points] of Object.entries(routes))for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.4));
    for(let k=0;k<steps;k++){const t=k/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=x===-48&&z<=62&&z>=46?(62-z)/16*4.8:z<46&&x===-48?4.8:0;waypoints.push({route,x,y:y+.035,z});}
  }
  const routeMaterial=ownMat(new T.MeshBasicMaterial({color:0xd2ad69,toneMapped:false})),routeColor=new T.Color(0xd2ad69);
  const routeMesh=new T.InstancedMesh(geo.box,routeMaterial,waypoints.length);routeMesh.name='Repères locaux du parcours';routeMesh.frustumCulled=false;root.add(routeMesh);
  function setRoute(target){let count=0;for(const p of waypoints)if(p.route===target){tmp.position.set(p.x,p.y,p.z);tmp.rotation.set(0,0,0);tmp.scale.set(.17,.03,.35);tmp.updateMatrix();routeMesh.setMatrixAt(count++,tmp.matrix);}routeMesh.count=count;routeMesh.instanceMatrix.needsUpdate=true;}
  const markerMat=ownMat(new T.MeshBasicMaterial({color:0xe8c27a,toneMapped:false}));
  const marker=new T.Mesh(ownGeo(new T.OctahedronGeometry(.12,0)),markerMat);marker.name='Terminal actif — repère dans le monde';root.add(marker);
  const objectiveSign=panel('Objectif au terminal',0,2.56,54.8,2.40,.55,{width:1024,height:256});
  // Batch shared resources: bounded draw calls even when the headset uses two eyes.
  for(const {geometry,material,matrices} of batches.values()){
    const mesh=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=quality!=='low';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
  }
  function update(game,time=0){
    const state=game?.campaign||game?.snapshot?.()?.campaign;if(!state||!root.visible)return;
    stage=state.stage;currentObjective=state.objective||null;
    const key=[stage,state.sibling,...(state.archive||[])].join('|');
    if(key!==lastState){
      lastState=key;
      const hint='F · INTERAGIR · clic du stick libre';
      powerScreen.paint(stage==='power'?['Alimentation locale coupée.','Réarmer le circuit isolé.',hint]:['Circuit local : ACTIF','Réseau ORDRE : DÉCONNECTÉ','Archive humaine accessible.'],'MAINTENANCE / ALIMENTATION');
      if(stage==='power')archiveScreen.paint(['Mémoire hors tension.','Réarmer le tableau à gauche.','Aucune connexion extérieure.'],'ARCHIVE LOCALE / ISOLÉE');
      else if(stage==='archive')archiveScreen.paint(['Un journal humain a été retrouvé.','Consulter la dernière intervention.',hint],'ARCHIVE LOCALE / ISOLÉE');
      else {
        const archive=state.archive?.length?state.archive:['INTERVENTION : '+(state.sibling||'INDICATIF HUMAIN'),'Relais végétal remis sous tension.','Prends l’escalier extérieur.','Retrouve le terminal sur la terrasse.'];
        // Preserve the human archive during the breach/combat; no flickering text.
        archiveScreen.paint(archive.slice(0,6),'JOURNAL HUMAIN / COPIE LOCALE');
      }
      exitScreen.paint(stage==='complete'?['Passage de '+(state.sibling||'votre proche')+' confirmé.','Destination : les archives de Vesper.','NIVEAU 1 TERMINÉ']:[`Trace de ${state.sibling||'votre proche'} en mémoire.`,'Consulter le journal de passage.',hint],'RELAIS 01 / MÉMOIRE LOCALE');
      const target=state.objective?.id||stage;
      setRoute(['power','archive','exit'].includes(stage)?stage:null);
      objectiveSign.mesh.visible=!!state.objective&&['power','archive','exit'].includes(stage);
      if(objectiveSign.mesh.visible){
        const p=state.objective.position;objectiveSign.mesh.position.set(p.x,p.y+2.7,p.z+.23);
        objectiveSign.paint([hint],state.objective.label||target.toUpperCase());
      }
    }
    marker.visible=!!state.objective&&['power','archive','exit'].includes(stage);
    if(marker.visible){const p=state.objective.position;marker.position.set(p.x,p.y+3.10+Math.sin(time*2)*.045,p.z+.15);marker.rotation.y=time*.6;}
    routeMaterial.color.copy(routeColor).multiplyScalar(.82+Math.sin(time*1.7)*.06);
  }
  function setVisible(enabled){root.visible=!!enabled;if(enabled)lastState='';else{marker.visible=false;objectiveSign.mesh.visible=false;}}
  function stats(){return {visible:root.visible,stage,colliders:obstacles.length,staticBatches:batches.size,drawCalls:root.children.filter(o=>o.isMesh).length,terminals:3,objective:currentObjective?.id||null,routeStuds:routeMesh.count,footprint:{minX:-9.01,maxX:6.625,minZ:50.79,maxZ:68.21},ceiling:4.05};}
  function dispose(){if(disposed)return;disposed=true;scene.remove(root);root.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();});for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();for(const t of ownedTextures)t.dispose();root.clear();obstacles.length=0;}
  return {root,obstacles,setVisible,update,dispose,stats};
}
