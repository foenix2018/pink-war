// Low-draw-call indoor/outdoor range for desktop, mobile and WebXR.
// No dependency on the survival city, no new texture downloads.
import { targetPosition,TRAINING_BARRIER } from './shooting-range.js';

export function createShootingRangeArt(T,scene){
  const root=new T.Group();root.name='PINK WAR / champ de tir';root.visible=false;scene.add(root);
  const mats={
    floor:new T.MeshStandardMaterial({color:0x303940,roughness:.88,metalness:.14}),
    wall:new T.MeshStandardMaterial({color:0x222c34,roughness:.91,metalness:.16}),
    metal:new T.MeshStandardMaterial({color:0x68717a,roughness:.37,metalness:.78}),
    trim:new T.MeshStandardMaterial({color:0x151b24,roughness:.57,metalness:.6}),
    yellow:new T.MeshBasicMaterial({color:0xefbe67}),
    rose:new T.MeshBasicMaterial({color:0xff7aae}),
    cyan:new T.MeshBasicMaterial({color:0x70dfea}),
    white:new T.MeshBasicMaterial({color:0xf5f6ec}),
    black:new T.MeshBasicMaterial({color:0x111923}),
    red:new T.MeshBasicMaterial({color:0xff526f}),
    warning:new T.MeshBasicMaterial({color:0xffc74c}),
    light:new T.MeshBasicMaterial({color:0xb6ebff}),
    padding:new T.MeshStandardMaterial({color:0x151b20,roughness:.96}),
    canopy:new T.MeshStandardMaterial({color:0x313d4a,roughness:.82,metalness:.33})
  };
  // Indoor illumination: sunlight no longer reaches the range through the roof,
  // so a dedicated diffuse fill is necessary to see weapons and wall panels.
  const indoorFill=new T.AmbientLight(0xb7cfda,1.35);
  indoorFill.name='Eclairage diffus du stand';
  root.add(indoorFill);
  const obstacles=[];
  const box=(name,x,y,z,w,h,d,mat=mats.metal)=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    mesh.name=name;mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const collision=(x,z,w,d,y=0,h=3)=>obstacles.push({x,z,hx:w/2,hz:d/2,y,height:h,surface:'metal'});
  // Professional qualification bay. Shooter stands BEHIND a continuous,
  // waist-height safety railing. The simulation also enforces the shooting
  // line so jumping or sprinting cannot vault this barrier.
  exportBarrier();
  function exportBarrier(){
    const z=TRAINING_BARRIER.z;
    box('GARDE-CORPS DE SÉCURITÉ / TRAVERSE TAILLE',0,1.015,z,25.5,.17,.19,mats.warning);
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
  box('Mur arrêt-tirs',0,3,-64,27,6,.48,mats.wall);collision(0,-64,27,.48,0,6);
  for(const side of [-1,1]){
    box('Mur latéral',side*13.5,1.85,-13,.28,3.7,103,mats.wall);
    collision(side*13.5,-13,.28,103,0,3.7);
    box('Bande de sécurité',side*12.2,.015,-13,.12,.016,100,mats.yellow);
    // Repeating steel gantries give a recognizable indoor-training perspective.
    for(let z=16;z>=-58;z-=10){
      box('Pilier de protection',side*12.5,2.6,z,.24,5.1,.26,mats.metal);
      box('Projecteur technique',side*11.95,3.65,z,.26,.14,.18,mats.cyan);
    }
  }
  for(let lane=-2;lane<=2;lane++){
    const x=lane*4.6;
    box('Ligne de tir',x,.023,17,2.8,.02,.13,mats.yellow);
    box('Marquage de pas de tir',x,.022,19,3,.014,.07,mats.white);
    box('Garde au sol',x,.06,24,.13,.11,2.8,mats.trim);
    for(let z=7;z>=-54;z-=9)
      box('Marquage de voie',x-2.2,.011,z,.035,.013,2.6,mats.yellow);
  }
  for(const z of [7,-19,-40]){
    box('Traverse horizontale',0,3.8,z,25,.11,.11,mats.metal);
    for(let lane=-2;lane<=2;lane++){
      const x=lane*4.6;
      box('Rail de cible',x,3.5,z,3.65,.075,.09,mats.trim);
    }
  }
  // Covered acoustic enclosure, visible on every lane. All ceiling components
  // remain above the unobstructed sight line; the safety rail is waist-height.
  box('Plafond pare-balles acoustique',0,5.05,-13,27,.30,103,mats.canopy);
  for(let z=31;z>=-59;z-=8){
    box('Poutre du plafond',0,4.73,z,26.9,.23,.34,mats.metal);
    box('Luminaires LED suspendus',0,4.57,z,23.4,.075,.12,mats.light);
    for(const side of [-1,1]){
      box('Panneaux antibruit',side*13.24,2.50,z,.08,2.55,6.2,mats.padding);
      box('Liseré de balisage',side*12.95,.55,z,.05,.04,5.7,mats.cyan);
    }
  }
  // One individual work station per lane, with padded shelves at the waist.
  for(let lane=-2;lane<=2;lane++){
    const x=lane*4.6;
    box('Tablette de préparation',x,.87,22.25,2.75,.10,.74,mats.metal);
    box('Tapis amortissant',x,.933,22.25,2.51,.025,.66,mats.padding);
    for(const side of [-1,1]){
      box('Support de tablette',x+side*1.27,.46,22.25,.10,.92,.11,mats.trim);
      box('Séparateur des postes de tir',x+side*2.15,1.42,20.65,.10,2.8,2.8,mats.canopy);
    }
    box('Marqueur de poste lumineux',x,4.26,20.1,1.25,.11,.10,mats.yellow);
  }
  // Secondary bullet-trap panels behind each drill distance.
  for(const z of [-61]){
    box('Blindage arrière des couloirs',0,2.55,z,25.6,4.45,.18,mats.wall);
    for(let lane=-2;lane<=2;lane++)
      box('Plaque acoustique',lane*4.6,2.55,z+.11,3.8,3.4,.07,mats.padding);
  }
  // Distinct training area behind the player does not block the VR controllers.
  box('Fond stand',0,2.25,36,27,4.5,.3,mats.wall);
  const targetGroups=new Map();
  const circle=new T.CircleGeometry(1,28);
  const ring=new T.TorusGeometry(1,.07,7,36);
  function plate(mat,r,z){
    const m=new T.Mesh(circle,mat);m.scale.set(r,r,1);m.position.z=z;return m;
  }
  function makeTarget(id){
    const carrier=new T.Group();carrier.name='Cible escamotable '+id;root.add(carrier);
    const target=new T.Group();carrier.add(target);
    target.add(plate(mats.black,1.12,-.085));
    target.add(plate(mats.white,1,-.06));
    target.add(plate(mats.red,.77,-.04));
    target.add(plate(mats.white,.52,-.022));
    target.add(plate(mats.rose,.30,-.012));
    target.add(plate(mats.black,.15,.006));
    const perimeter=new T.Mesh(ring,mats.yellow);perimeter.scale.set(1.04,1.04,.2);
    perimeter.position.z=.035;target.add(perimeter);
    // Sturdy pop-up mechanism. Pole is positioned each frame, not attached to
    // the scalable target head, so it always meets the deck.
    const pole=box('Trépied-cible',0,1,0,.09,2,.095,mats.metal);
    root.remove(pole);carrier.add(pole);
    const foot=new T.Mesh(new T.BoxGeometry(.45,.06,.5),mats.trim);carrier.add(foot);
    const item={carrier,target,pole,foot};
    targetGroups.set(id,item);return item;
  }
  function update(sim){
    if(!sim?.targets){for(const item of targetGroups.values())item.carrier.removeFromParent();targetGroups.clear();return;}
    const existing=new Set();
    for(const t of sim.targets){
      existing.add(t.id);
      const item=targetGroups.get(t.id)||makeTarget(t.id);
      const pos=targetPosition(t,sim.time);
      item.carrier.position.set(pos.x,pos.y,pos.z);
      item.target.scale.setScalar(t.radius*Math.min(1,Math.max(.025,(sim.time-t.born)*7)));
      item.target.rotation.y=Math.sin((sim.time-t.born)*2)*.035;
      item.pole.position.set(0,-pos.y*.5,-.22);
      item.pole.scale.y=Math.max(.05,pos.y/2);
      item.foot.position.set(0,-pos.y+.035,-.22);
    }
    for(const [id,item] of targetGroups)if(!existing.has(id)){item.carrier.removeFromParent();targetGroups.delete(id);}
  }
  function dispose(){
    for(const item of targetGroups.values())item.carrier.removeFromParent();
    targetGroups.clear();root.removeFromParent();
    root.traverse(node=>{if(node.isMesh&&node.geometry!==circle&&node.geometry!==ring)node.geometry.dispose();});
    circle.dispose();ring.dispose();Object.values(mats).forEach(m=>m.dispose());
  }
  return {root,obstacles,update,dispose,get targetCount(){return targetGroups.size;}};
}
