// Self-contained covered range for desktop, mobile and WebXR.
// Existing local CC0 photo sets stream only when this scene is selected.
import { targetPosition,TRAINING_BARRIER,RANGE_CONTROLS,TARGET_OUTLINE } from './shooting-range.js';
import {createRangeMaterials} from './shooting-range-materials.js';
import {createRangeShadows} from './range-shadows.js';

// Deterministic, locally generated PBR detail. Five shared 512px maps keep Quest
// memory and draw calls bounded, even across the full 100-metre indoor range.
function rangeSurface(T,kind,repeatX=1,repeatY=1){
  // Non-browser geometry tests and server tools have no canvas; materials stay valid.
  if(typeof document==='undefined')return null;
  const n=512,canvas=document.createElement('canvas');canvas.width=canvas.height=n;
  const c=canvas.getContext('2d'),pixels=c.createImageData(n,n);
  let seed=kind.split('').reduce((v,ch)=>(v*31+ch.charCodeAt(0))|0,8471);
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const base=kind==='floor'?213:kind==='wall'?207:kind==='padding'?183:kind==='canopy'?192:224;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*4,grain=(random()-.5)*(kind==='padding'?8:24);
    const stains=Math.sin(x*.034+Math.sin(y*.023)*3)*9+Math.sin(y*.051+x*.007)*6;
    const scratches=kind==='metal'?Math.sin(x*.38)*7:0;
    const value=Math.min(255,Math.max(75,base+grain+stains+scratches));
    pixels.data[i]=Math.max(0,value-(kind==='metal'?8:3));
    pixels.data[i+1]=value;pixels.data[i+2]=Math.min(255,value+3);
    pixels.data[i+3]=255;
  }
  c.putImageData(pixels,0,0);
  for(let i=0;i<75;i++){
    const x=random()*n,y=random()*n,r=12+random()*75;
    const g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,kind==='metal'?'rgba(95,49,25,.27)':'rgba(15,19,25,.19)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
  }
  c.lineCap='round';
  if(kind==='floor'||kind==='wall'||kind==='canopy'){
    c.strokeStyle='rgba(20,27,34,.37)';c.lineWidth=2.2;
    for(let x=0;x<=n;x+=128){c.beginPath();c.moveTo(x,0);c.lineTo(x,n);c.stroke();}
    for(let y=0;y<=n;y+=128){c.beginPath();c.moveTo(0,y);c.lineTo(n,y);c.stroke();}
    for(let j=0;j<26;j++){
      let x=random()*n,y=random()*n;c.beginPath();c.moveTo(x,y);
      for(let k=0;k<5;k++){x+=(random()-.5)*20;y+=random()*11;c.lineTo(x,y);}
      c.strokeStyle='rgba(22,28,33,.4)';c.lineWidth=.55+random();c.stroke();
    }
  }
  if(kind==='metal'){
    for(let j=0;j<85;j++){
      const x=random()*n,y=random()*n;
      c.fillStyle=random()>.6?'rgba(180,95,53,.25)':'rgba(27,34,38,.33)';
      c.fillRect(x,y,1+random()*24,.5+random()*3);
    }
  }
  if(kind==='padding'){
    // Perforated acoustic panels: framed 256 px tiles, regular micro-holes and a soft fabric weave.
    c.fillStyle='rgba(12,20,26,.18)';
    for(let y=4;y<n;y+=8)for(let x=4+(y/8%2)*4;x<n;x+=8){c.beginPath();c.arc(x,y,1.35,0,Math.PI*2);c.fill();}
    c.strokeStyle='rgba(8,14,18,.55)';c.lineWidth=5;
    for(let v=0;v<=n;v+=256){c.beginPath();c.moveTo(v,0);c.lineTo(v,n);c.stroke();c.beginPath();c.moveTo(0,v);c.lineTo(n,v);c.stroke();}
    c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=2;
    for(let v=4;v<=n;v+=256){c.beginPath();c.moveTo(v,0);c.lineTo(v,n);c.stroke();c.beginPath();c.moveTo(0,v);c.lineTo(n,v);c.stroke();}
  }
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeatX,repeatY);tex.anisotropy=4;
  return tex;
}

// Worn diagonal safety chevrons; `repeat` tiles them along a long rail.
function hazardStripes(T,repeat){
  if(typeof document==='undefined')return null;
  const w=256,h=64,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d');c.fillStyle='#e8b94a';c.fillRect(0,0,w,h);
  c.fillStyle='#14181d';
  for(let x=-h;x<w+h;x+=64){c.beginPath();c.moveTo(x,h);c.lineTo(x+32,h);c.lineTo(x+32+h,0);c.lineTo(x+h,0);c.closePath();c.fill();}
  let seed=2741;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<260;i++){c.fillStyle=random()>.5?'rgba(255,248,220,.10)':'rgba(30,24,16,.16)';c.fillRect(random()*w,random()*h,1+random()*7,1+random()*2);}
  c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,0,w,3);c.fillRect(0,h-3,w,3);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeat,1);tex.anisotropy=4;
  return tex;
}
export function createShootingRangeArt(T,scene,options={}){
  const root=new T.Group();root.name='PINK WAR / champ de tir';root.visible=false;scene.add(root);
  const textures=[
    rangeSurface(T,'floor',8,30),rangeSurface(T,'wall',20,3),
    rangeSurface(T,'metal',2,2),rangeSurface(T,'padding',3,2),
    rangeSurface(T,'canopy',8,30)
  ];
  const [floorMap,wallMap,metalMap,paddingMap,canopyMap]=textures;
  const hazardMap=hazardStripes(T,70);textures.push(hazardMap);
  // Lane partitions are 2.8 m panels: their own acoustic texture at that scale, not the 103 m ceiling's.
  const partitionMap=rangeSurface(T,'padding',1,1);textures.push(partitionMap);
  const textured=(color,map,roughness,metalness,bumpScale)=>new T.MeshStandardMaterial({
    color,map,bumpMap:map,bumpScale,roughness,metalness
  });
  const mats={
    floor:textured(0xc3bfb5,floorMap,.87,.025,.017),
    wall:textured(0xc9c5ba,wallMap,.93,.025,.024),
    metal:textured(0x9c9b91,metalMap,.4,.72,.004),
    trim:textured(0x383832,metalMap,.65,.48,.006),
    rust:textured(0xc7b5a0,metalMap,.82,.34,.012),
    target:textured(0xbdb4a1,metalMap,.77,.38,.008),
    scar:new T.MeshStandardMaterial({color:0x25231e,roughness:.96,metalness:.16,side:T.DoubleSide}),
    ready:new T.MeshBasicMaterial({color:0xefa84d}),
    live:new T.MeshBasicMaterial({color:0x8fbd76}),
    yellow:new T.MeshBasicMaterial({color:0xefbe67}),
    rose:new T.MeshBasicMaterial({color:0xff7aae}),
    cyan:new T.MeshBasicMaterial({color:0xaca58c}),
    white:new T.MeshBasicMaterial({color:0xf5f6ec}),
    black:new T.MeshBasicMaterial({color:0x111923}),
    red:new T.MeshStandardMaterial({color:0x9f5039,roughness:.86,metalness:.04}),
    warning:new T.MeshBasicMaterial({color:0xffc74c}),
    light:new T.MeshBasicMaterial({color:0xf5e7c8}),
    padding:textured(0x49473d,paddingMap,.98,.01,.012),
    canopy:textured(0x77736a,canopyMap,.88,.16,.019),
    partition:textured(0x535246,partitionMap,.95,.05,.01),
    hazard:new T.MeshStandardMaterial({color:0xffffff,map:hazardMap,emissive:0x3a2c08,roughness:.55,metalness:.12})
  };
  // Indoor illumination: sunlight no longer reaches the range through the roof,
  // so a dedicated diffuse fill is necessary to see weapons and wall panels.
  const pbr=createRangeMaterials(T,mats,textures,options);
  const indoorFill=new T.HemisphereLight(0xfff6eb,0xa5a098,.78);
  indoorFill.name='Eclairage diffus du stand';
  root.add(indoorFill);
  root.add(new T.AmbientLight(0xf0eade,.28));
  // Two broad, neutral task lights model the ceiling fixtures without blue sunlight indoors.
  const key=new T.DirectionalLight(0xfff2df,.65);key.position.set(-5,4.5,23);key.target.position.set(0,0,10);root.add(key,key.target);
  const fill=new T.DirectionalLight(0xe4e0d5,.35);fill.position.set(9,4,-44);fill.target.position.set(0,0,-12);root.add(fill,fill.target);
  const shadowLights=[];
  for(const z of [25,4,-20,-44]){
    const lamp=new T.SpotLight(0xfff0da,65,34,1.18,.55,2);lamp.name='Éclairage des travées';lamp.position.set(0,4.52,z);lamp.target.position.set(0,0,z);root.add(lamp,lamp.target);shadowLights.push(lamp);
  }
  const obstacles=[];
  const box=(name,x,y,z,w,h,d,mat=mats.metal)=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    mesh.name=name;mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const collision=(x,z,w,d,y=0,h=3)=>obstacles.push({x,z,hx:w/2,hz:d/2,y,height:h,surface:'metal'});
  // Every waist-high desk, partition and enclosure wall gets a collider in
  // the SAME coordinates as the mesh. Keep walkable floor paint non-solid.
  const solid=(name,x,y,z,w,h,d,material=mats.metal)=>{
    const mesh=box(name,x,y,z,w,h,d,material);
    collision(x,z,w,d,y-h/2,h);
    return mesh;
  };
  const cylinderGeo=new T.CylinderGeometry(1,1,1,12);
  function pipe(name,a,b,r,mat=mats.trim){
    const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);
    const mesh=new T.Mesh(cylinderGeo,mat);mesh.name=name;mesh.position.copy(from).add(to).multiplyScalar(.5);
    mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  // Curved utility conduits, flanged I-beams and enclosed ventilation give the
  // building a readable construction instead of a featureless blue tunnel.
  for(const side of [-1,1]){
    pipe('Canalisation ventilation', [side*10.7,4.35,34],[side*10.7,4.35,-61],.16,mats.metal);
    pipe('Conduite électrique', [side*11.35,4.55,34],[side*11.35,4.55,-61],.045);
    for(let z=29;z>=-59;z-=16){
      const collar=new T.Mesh(new T.TorusGeometry(.17,.022,6,16),mats.rust);collar.position.set(side*10.7,4.35,z);root.add(collar);
      pipe('Suspente de ventilation',[side*10.7,4.5,z],[side*10.7,4.94,z],.018,mats.metal);
    }
  }
  const signs=[],controlGroups=[];
  for(const c of RANGE_CONTROLS){
    pipe('Pied de commande',[c.x,0,c.z],[c.x,c.y-.13,c.z],.045,mats.metal);
    const enclosure=box('Boîtier de commande des cibles',c.x,c.y,c.z,.27,.32,.16,mats.trim);
    const button=new T.Mesh(new T.CylinderGeometry(.055,.055,.035,20),mats.ready);button.rotation.x=Math.PI/2;button.position.set(c.x,c.y-.025,c.z+.1);root.add(button);
    const bezel=new T.Mesh(new T.TorusGeometry(.073,.012,8,24),mats.metal);bezel.position.set(c.x,c.y-.025,c.z+.111);root.add(bezel);
    box('Plaquette interrupteur',c.x,c.y+.095,c.z+.087,.18,.033,.012,mats.white);
    sign('CIBLES','F / ACTION',c.x,c.y+.30,c.z+.10,.45,.14,'#d9cdb2');
    controlGroups.push({enclosure,button});
    collision(c.x,c.z,.20,.20,0,1.45);
  }
  // Local stencilled signage, one canvas per graphic, no network textures.
  function sign(label,sub,x,y,z,w=2.15,h=.48,color='#e2d5b7'){
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const c=canvas.getContext('2d');
    const grad=c.createLinearGradient(0,0,512,128);grad.addColorStop(0,'#24251f');grad.addColorStop(1,'#3c3b31');
    c.fillStyle=grad;c.fillRect(0,0,512,128);
    c.strokeStyle='#77705c';c.lineWidth=6;c.strokeRect(5,5,502,118);
    c.fillStyle=color;c.font='bold 50px monospace';c.textAlign='center';c.fillText(label,256,61,490);
    c.fillStyle='#d3dde3';c.font='bold 25px monospace';c.fillText(sub,256,103,490);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});
    const panel=new T.Mesh(new T.PlaneGeometry(w,h),material);panel.position.set(x,y,z);if(z>34)panel.rotation.y=Math.PI;root.add(panel);
    signs.push({panel,texture,material});return panel;
  }
  // Professional qualification bay. Shooter stands BEHIND a continuous,
  // waist-height safety railing. The simulation also enforces the shooting
  // line so jumping or sprinting cannot vault this barrier.
  exportBarrier();
  function exportBarrier(){
    const z=TRAINING_BARRIER.z;
    box('GARDE-CORPS DE SÉCURITÉ / TRAVERSE TAILLE',0,1.015,z,25.5,.17,.19,mats.hazard);
    box('Profil anti-impact',0,.89,z,25.5,.075,.22,mats.padding);
    box('Rail inférieur',0,.19,z,25.5,.07,.09,mats.metal);
    for(let x=-12;x<=12.01;x+=2.3){
      box('Poteau de la ligne de feu',x,.545,z,.11,1.09,.13,mats.metal);
      box('Bandes rétro-réfléchissantes',x,1.035,z+.103,.1,.04,.015,mats.yellow);
    }
    collision(0,z,25.5,.22,0,1.13);
    // Black-and-yellow safety marks are in the protected shooter area.
    for(let x=-12;x<=12;x+=1.3){
      box('Rayures de la ligne de sécurité',x,.025,20.12,.61,.018,.09,(Math.round(x*10)%2?mats.yellow:mats.warning));
    }
  }
  // Protected shooting lanes with a real stop wall behind the 60-m targets.
  box('Plateforme de tir',0,-.115,-13,27,.22,103,mats.floor);
  solid('Mur arrêt-tirs',0,3,-64,27,6,.48,mats.wall);
  // Impact wall: overlapping armored plates, staggered ribs and angled
  // ballistic shields break up the old flat infinite corridor.
  for(const z of [-63.55,-61.9]){
    for(let lane=-2;lane<=2;lane++){
      box('Caisson absorbeur balistique',lane*4.6,2.35,z,4.15,3.9,.12,mats.padding);
      for(let y of [.5,1.52,2.54,3.56])
        box('Raidisseur pare-balles',lane*4.6,y,z+.11,4.18,.055,.045,mats.trim);
    }
  }
  for(const side of [-1,1]){
    solid('Mur latéral',side*13.5,2.5,-13,.28,5.0,103,mats.wall);
    box('Bande de sécurité',side*12.2,.015,-13,.12,.016,100,mats.yellow);
    // Repeating steel gantries give a recognizable indoor-training perspective.
    for(let z=16;z>=-58;z-=10){
      box('Pilier de protection',side*12.5,2.6,z,.24,5.1,.26,mats.metal);
      box('Projecteur technique',side*11.95,3.65,z,.26,.14,.18,mats.cyan);
    }
  }
  // Rear access walkway is unobstructed. Each lane has a clear 4.6 m bay.
  for(let lane=-2;lane<=2;lane++){
    const x=lane*4.6;
    box('Ligne de tir',x,.023,17,2.8,.02,.13,mats.yellow);
    box('Marquage de pas de tir',x,.022,19,3,.014,.07,mats.white);
    box('Couloir de cheminement arrière',x,.016,30.4,3.65,.012,.09,mats.cyan);
    box('Plaque acier antidérapante',x,.009,22.65,3.35,.014,1.4,mats.trim);
    for(let z=7;z>=-54;z-=9)
      box('Marquage de voie',x-2.2,.011,z,.035,.013,2.6,mats.yellow);
    sign('POSTE 0'+(lane+3),'TIR / SÉCURITÉ',x,3.82,19.25,1.84,.43);
  }
  for(const [z,distance] of [[7,'15 M'],[-19,'40 M'],[-40,'60 M']]){
    box('Traverse horizontale',0,3.8,z,25,.11,.11,mats.metal);
    for(let lane=-2;lane<=2;lane++){
      const x=lane*4.6;
      box('Rail de cible',x,3.5,z,3.65,.075,.09,mats.trim);
      // Overhead electronic distance indicator belongs to the downrange rig.
      sign(distance,'ZONE DE CIBLES',x,3.27,z+.2,1.42,.35,'#f3c96a');
    }
  }
  // Covered acoustic enclosure, visible on every lane. All ceiling components
  // remain above the unobstructed sight line; the safety rail is waist-height.
  box('Plafond pare-balles acoustique',0,5.05,-13,27,.30,103,mats.canopy);
  for(let z=31;z>=-59;z-=8){
    box('Poutre du plafond',0,4.73,z,26.9,.23,.34,mats.metal);
    for(const y of [4.60,4.87])box('Semelle de poutre en I',0,y,z,26.9,.045,.49,mats.trim);
    box('Luminaires LED suspendus',0,4.57,z,23.4,.075,.12,mats.light);
    for(const side of [-1,1]){
      box('Panneaux antibruit',side*13.24,2.50,z,.08,2.55,6.2,mats.padding);
      box('Liseré de balisage',side*12.95,.55,z,.05,.04,5.7,mats.cyan);
    }
  }
  // Workbenches are moved BEHIND the user (z=26): the original ones sat
  // directly around the spawn and were ghost objects with no collisions.
  for(let lane=-2;lane<=2;lane++){
    const x=lane*4.6;
    solid('Tablette de préparation',x,.95,26,2.40,.16,.79,mats.metal);
    box('Tapis amortissant',x,1.045,26,2.20,.025,.65,mats.padding);
    for(const side of [-1,1]){
      solid('Support de tablette',x+side*1.08,.45,26,.10,.90,.12,mats.trim);
      box('Rangement de munitions',x+side*.82,.67,26.1,.38,.26,.32,mats.trim);
    }
    box('Console de sécurité et minuterie',x,1.20,26,.85,.28,.12,mats.black);
    box('Bandeau lumineux de console',x,1.21,26.065,.71,.045,.026,mats.cyan);
    box('Marqueur de poste lumineux',x,4.26,20.1,1.25,.11,.10,mats.yellow);
  }
  // Only four *unique* separators between the five lanes. These are
  // full-height, 3.5 m deep acoustic shields with matching physical colliders.
  for(let lane=-2;lane<=1;lane++){
    const x=(lane+.5)*4.6;
    solid('Séparateur entre deux postes',x,1.39,21.30,.15,2.78,3.25,mats.partition);
    box('Cadre de protection du séparateur',x,2.8,21.30,.21,.09,3.31,mats.metal);
    box('Bande LED séparateur',x,1.76,22.975,.035,.035,.07,mats.cyan);
  }
  // Behind the rear desks there is a marked access route, not an infinite room.
  for(const x of [-11.8,11.8])box('Marquage de circulation',x,.025,31,.06,.015,9,mats.yellow);
  sign('STAND DE TIR','ACCES REGLEMENTE  /  5 COULOIRS',0,3.38,35.73,5.5,.75,'#ffd58b');
  // Secondary bullet-trap panels behind each drill distance.
  for(const z of [-61]){
    box('Blindage arrière des couloirs',0,2.55,z,25.6,4.45,.18,mats.wall);
    for(let lane=-2;lane<=2;lane++)
      box('Plaque acoustique',lane*4.6,2.55,z+.11,3.8,3.4,.07,mats.padding);
  }
  // Distinct training area behind the player does not block the VR controllers.
  solid('Fond stand',0,2.25,36,27,4.5,.3,mats.wall);
  const shadows=createRangeShadows(T,{root,lights:shadowLights,obstacles,low:!!options.low});
  // Floor stays a walkable surface, never an X/Z blocking collider.
  const targetGroups=new Map();
  const circle=new T.CircleGeometry(1,20);
  const shape=new T.Shape();TARGET_OUTLINE.forEach(([x,y],i)=>i?shape.lineTo(x,y+.94):shape.moveTo(x,y+.94));shape.closePath();
  const silhouette=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,steps:1});
  silhouette.translate(0,0,-.04);
  const scoreRing=new T.RingGeometry(.24,.255,36);scoreRing.translate(0,.94,.012);
  const sensorRing=new T.RingGeometry(.11,.12,24);sensorRing.translate(0,1.80,.012);
  const scarGeo=new T.RingGeometry(.012,.035,10),dentGeo=new T.CircleGeometry(.013,10);
  const trackGeo=new T.BoxGeometry(1,1,1);
  const hardwareGeos=[cylinderGeo,silhouette,scoreRing,sensorRing,scarGeo,dentGeo,trackGeo];
  function releaseTarget(item){
    item.carrier.removeFromParent();
    item.track?.removeFromParent();
    item.carrier.traverse(n=>{if(n.isMesh&&!hardwareGeos.includes(n.geometry)&&n.geometry!==circle)n.geometry.dispose();});
  }
  function makeTarget(id){
    const carrier=new T.Group();carrier.name='Cible escamotable '+id;root.add(carrier);
    const target=new T.Group();carrier.add(target);
    const steel=new T.Mesh(silhouette,mats.target);steel.name='Silhouette balistique en acier biseauté';steel.castShadow=true;steel.receiveShadow=true;target.add(steel);
    target.add(new T.Mesh(scoreRing,mats.red),new T.Mesh(sensorRing,mats.red));
    for(const x of [-.38,.38]){
      const bolt=new T.Mesh(new T.CylinderGeometry(.025,.025,.05,6),mats.metal);bolt.rotation.x=Math.PI/2;bolt.position.set(x,.32,.015);target.add(bolt);
    }
    const hinge=new T.Mesh(new T.CylinderGeometry(.065,.065,.8,12),mats.trim);hinge.rotation.z=Math.PI/2;hinge.position.y=-.94;carrier.add(hinge);
    // Sturdy pop-up mechanism. Pole is positioned each frame, not attached to
    // the scalable target head, so it always meets the deck.
    const pole=box('Trépied-cible',0,1,0,.09,2,.095,mats.metal);
    root.remove(pole);carrier.add(pole);
    const foot=new T.Mesh(new T.BoxGeometry(.45,.06,.5),mats.trim);carrier.add(foot);
    const item={carrier,target,pole,foot,hinge,marked:false,track:null};
    targetGroups.set(id,item);return item;
  }
  function update(sim){
    for(const {button} of controlGroups){button.material=sim?.trainingActive?mats.live:mats.ready;}
    if(!sim?.targets){for(const item of targetGroups.values())releaseTarget(item);targetGroups.clear();return;}
    const existing=new Set();
    for(const t of sim.targets){
      existing.add(t.id);
      const item=targetGroups.get(t.id)||makeTarget(t.id);
      const pos=targetPosition(t,sim.time);
      if(t.range>0&&!item.track){
        item.track=new T.Mesh(trackGeo,mats.metal);item.track.name='Rail motorisé de cible';item.track.receiveShadow=true;root.add(item.track);
        item.track.position.set(t.x,.035,t.z);item.track.scale.set(t.kind==='lateral'?t.range*2+.6:.12,.045,t.kind==='depth'?t.range*2+.6:.12);
      }
      item.carrier.position.set(pos.x,pos.y,pos.z);
      const sinceHit=t.hit?Math.max(0,sim.time-(t.hitAt??sim.time)):0;
      const hitMotion=t.hit?Math.min(1,sinceHit/(.62-(t.impulse||.35)*.22)):0;
      const eased=hitMotion*hitMotion*(3-2*hitMotion);
      const rise=Math.min(1,Math.max(0,(sim.time-t.born)/.45)),deployed=rise*rise*(3-2*rise);
      item.target.scale.setScalar(t.radius);
      item.target.rotation.y=t.hit?(t.hitOffset?.x||0)*.18*Math.sin(sinceHit*13)*Math.exp(-sinceHit*7):0;
      // The plate only folds down when a confirmed impact was registered.
      item.target.rotation.x=hitMotion>0?-1.42*eased+Math.sin(sinceHit*24)*Math.exp(-sinceHit*9)*(t.impulse||.35)*.09:deployed>=1?0:-1.42*(1-deployed);
      item.target.position.y=-.94*t.radius;
      if(t.hit&&!item.marked){
        item.marked=true;
        for(const hit of (t.impacts||[{x:0,y:0}]).slice(0,8)){
          const ring=new T.Mesh(scarGeo,mats.rust),dent=new T.Mesh(dentGeo,mats.scar);
          ring.position.set(hit.x,hit.y+.94,.018);dent.position.set(hit.x,hit.y+.94,.019);targetGroups.get(t.id).target.add(ring,dent);
        }
      }
      const hingeHeight=Math.max(.08,pos.y-.94*t.radius);
      item.hinge.position.y=-.94*t.radius;item.hinge.scale.setScalar(t.radius);
      item.pole.position.set(0,-pos.y+hingeHeight/2,-.04);
      item.pole.scale.y=hingeHeight/2;
      item.foot.position.set(0,-pos.y+.035,-.04);
    }
    for(const [id,item] of targetGroups)if(!existing.has(id)){releaseTarget(item);targetGroups.delete(id);}
  }
  function dispose(){
    shadows.dispose();pbr.dispose();for(const item of targetGroups.values())releaseTarget(item);
    targetGroups.clear();for(const sign of signs){sign.panel.removeFromParent();sign.panel.geometry.dispose();sign.material.dispose();sign.texture.dispose();}
    signs.length=0;root.removeFromParent();
    root.traverse(node=>{if(node.isMesh&&!hardwareGeos.includes(node.geometry)&&node.geometry!==circle)node.geometry.dispose();});
    circle.dispose();hardwareGeos.forEach(g=>g.dispose());Object.values(mats).forEach(m=>m.dispose());textures.forEach(t=>t?.dispose());
  }
  return {root,obstacles,update,dispose,shadows,enableMaterials:pbr.enable,get ready(){return pbr.ready;},stats:()=>({...pbr.stats(),shadows:shadows.stats()}),get targetCount(){return targetGroups.size;}};
}
