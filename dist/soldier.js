import * as T from './vendor/three.webgpu.min.js';

// A reusable set of rounded surfaces replaces the original block-shaped avatar.
// Each bone batches its pieces by geometry/material, including future unlocks.
function roundedBox() {
  const geometry = new T.BoxGeometry(1, 1, 1, 6, 6, 6), p = geometry.attributes.position, normal = geometry.attributes.normal;
  const point = new T.Vector3(), center = new T.Vector3(), direction = new T.Vector3(), radius = .18;
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i); center.set(...['x','y','z'].map(axis => T.MathUtils.clamp(point[axis], -.5 + radius, .5 - radius)));
    direction.copy(point).sub(center).normalize(); point.copy(center).addScaledVector(direction, radius);
    p.setXYZ(i, point.x, point.y, point.z); normal.setXYZ(i, direction.x, direction.y, direction.z);
  }
  return geometry;
}

export function createCharacterKit(emblem) {
  const geometries = { plate: roundedBox(), sphere: new T.SphereGeometry(1, 20, 14), tube: new T.CylinderGeometry(1, 1, 1, 16),
    ring: new T.TorusGeometry(1, .06, 8, 36), halo: new T.TorusGeometry(.32, .008, 6, 52),
    torso: new T.LatheGeometry([[.22,1.04],[.215,1.15],[.225,1.29],[.285,1.46],[.29,1.55],[.22,1.63],[.12,1.66]].map(p=>new T.Vector2(...p)),24),
    hair: new T.SphereGeometry(1, 24, 14, 0, Math.PI*2, 0, Math.PI*.43),
    visor: new T.SphereGeometry(1, 24, 10, Math.PI*1.12, Math.PI*.76, Math.PI*.34, Math.PI*.34),
    patch: new T.PlaneGeometry(.13,.06) };
  geometries.maleHead=geometries.sphere.clone();
  const face=geometries.maleHead.attributes.position;
  for(let i=0;i<face.count;i++){
    const y=face.getY(i),jaw=y<0?Math.sin(-y*Math.PI)*.16:0;
    face.setXYZ(i,face.getX(i)*(1+jaw),y<-.6?-.6+(y+.6)*.72:y,face.getZ(i)*(1+jaw*.3));
  }
  geometries.maleHead.computeVertexNormals();
  const physical = (color, metalness=.42, roughness=.3) => new T.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat:.6, clearcoatRoughness:.24 });
  const materials = {
    rose: physical(0xda6798), pearl: physical(0xffd6e7,.26,.24), dark: physical(0x202438,.3,.38),
    gold: physical(0xdcc392,.68,.25), steel: physical(0x6c607d,.66,.3),
    suit: new T.MeshStandardMaterial({color:0x2d233b,roughness:.92,metalness:.05}),
    skin: new T.MeshStandardMaterial({color:0xe5adab,roughness:.6,metalness:0}),
    hair: new T.MeshStandardMaterial({color:0x8f3e70,roughness:.58,metalness:.12}),
    visor: physical(0x25132e,.6,.14), glow:new T.MeshBasicMaterial({color:0xff88c2,toneMapped:false}),
    pale:new T.MeshBasicMaterial({color:0xffe7f4,toneMapped:false}),
    cyan:new T.MeshBasicMaterial({color:0x9ce7de,toneMapped:false}),
    emblem: new T.MeshBasicMaterial({map:emblem,transparent:true,depthWrite:false,toneMapped:false})
  };
  return { geometries, materials, setPalette(colors){for(const [name,color] of Object.entries(colors))materials[name].color.setHex(color);} };
}

function partsBuilder(kit) {
  const { geometries:g, materials:m } = kit, pieces=[], batches=[];
  const part=(bone,geometry,mat,position,scale,level=1,rotation=[0,0,0],maxLevel=10)=>{
    const mesh=new T.Mesh(geometry,mat);mesh.position.set(...position);mesh.scale.set(...scale);mesh.rotation.set(...rotation);mesh.updateMatrix();
    mesh.castShadow=!mat.isMeshBasicMaterial;mesh.receiveShadow=true;
    pieces.push({bone,geometry,mat,matrix:mesh.matrix.clone(),level,maxLevel});return mesh;
  };
  const plate=(bone,mat,position,scale,level=1,rotation=[0,0,0],max=10)=>part(bone,g.plate,mat,position,scale,level,rotation,max);
  const sphere=(bone,mat,position,scale,level=1)=>part(bone,g.sphere,mat,position,scale,level);
  const link=(bone,mat,a,b,radius,level=1)=>{
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new T.Mesh(g.tube,mat);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.scale.set(radius,delta.length(),radius);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.updateMatrix();
    pieces.push({bone,geometry:g.tube,mat,matrix:mesh.matrix.clone(),level,maxLevel:10});return mesh;
  };
  function finish() {
    const groups=new Map();
    for(const p of pieces){const key=`${p.bone.uuid}:${p.geometry.uuid}:${p.mat.uuid}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
    for(const entries of groups.values()){
      const p=entries[0],mesh=new T.InstancedMesh(p.geometry,p.mat,entries.length);mesh.castShadow=!p.mat.isMeshBasicMaterial;mesh.receiveShadow=true;
      mesh.frustumCulled=false;p.bone.add(mesh);batches.push({mesh,entries});
    }
    const hidden=new T.Matrix4().makeScale(0,0,0);let current=-1;
    return {setLevel(level){
      level=Math.max(1,Math.min(10,Math.floor(Number(level)||1)));if(level===current)return;current=level;
      for(const {mesh,entries} of batches){entries.forEach((entry,i)=>mesh.setMatrixAt(i,entry.level<=level&&entry.maxLevel>=level?entry.matrix:hidden));mesh.instanceMatrix.needsUpdate=true;}
    }, get level(){return current;}, get visibleParts(){return pieces.filter(p=>p.level<=current&&p.maxLevel>=current).length;}, batchCount:batches.length};
  }
  return {g,m,part,plate,sphere,link,finish};
}

export function createSoldier(kit, createGun, profile) {
  const masculine=!!profile?.masculine;
  const root=new T.Group(),body=new T.Group(),head=new T.Group(),hair=new T.Group();root.name=profile?.name||'GHJU';root.add(body);body.add(head);
  head.position.y=1.84;hair.position.set(0,.12,.13);head.add(hair);
  const {g,m,part,plate,sphere,link,finish}=partsBuilder(kit);
  part(body,g.torso,m.suit,[0,0,0],[masculine?1.08:1,1,.66]);
  sphere(body,m.suit,[0,.985,0],[masculine?.27:.29,.16,.19]);
  plate(body,m.rose,[0,1.46,.06],[.49,.34,.22],1,[-.06,0,0]);
  for(const s of [-1,1]){
    plate(body,m.rose,[s*.15,1.46,-.125],[.245,.3,.145],1,[-.14,0,s*-.08]);
    plate(body,m.pearl,[s*.20,1.585,-.065],[.16,.075,.22],1,[0,0,s*-.1]);
    link(body,m.dark,[s*.2,1.61,.07],[s*.12,1.16,-.15],.025);
    plate(body,m.steel,[s*.195,1.25,.02],[.065,.22,.21],1,[0,0,s*.12]);
  }
  plate(body,m.dark,[0,1.07,0],[.52,.07,.38]);plate(body,m.pearl,[0,1.07,-.205],[.105,.07,.04]);
  plate(body,m.glow,[0,1.07,-.23],[.065,.025,.012]);
  sphere(body,m.suit,[0,1.69,0],[.095,.12,.085]);
  part(body,g.ring,m.pearl,[0,1.635,0],[.13,.13,.13],1,[Math.PI/2,0,0]);
  part(head,masculine?g.maleHead:g.sphere,m.skin,[0,0,0],[masculine?.185:.18,.23,.175]);
  sphere(head,m.skin,[0,-.05,-.168],[.022,.041,.037]);
  plate(head,masculine?m.dark:m.rose,[0,-.106,masculine?-.169:-.157],[.064,.009,.015]);
  for(const s of [-1,1]){
    sphere(head,m.dark,[s*.061,.011,-.164],[.034,.017,.013]);sphere(head,m.pale,[s*.056,.014,-.176],[.008,.008,.004]);
    plate(head,m.hair,[s*.06,.056,-.163],[.075,.013,.018],1,[0,0,s*.12]);
    sphere(head,m.skin,[s*.171,-.002,.001],[.025,.048,.03]);
    plate(head,m.dark,[s*.191,.018,.004],[.052,.105,.09]);
    plate(head,m.glow,[s*.22,.024,-.02],[.012,.048,.028]);
  }
  if(masculine){
    part(head,g.hair,m.hair,[0,.034,.014],[.19,.225,.188]);
    plate(head,m.hair,[0,.18,-.07],[.25,.06,.18],1,[.1,0,0]);
  }else{
    sphere(head,m.hair,[0,-.02,.09],[.17,.185,.09]);
    part(head,g.hair,m.hair,[0,.017,.012],[.187,.233,.188]);
    plate(head,m.hair,[.10,.14,-.13],[.17,.075,.09],1,[.1,0,-.32]);
    // Overlapping soft volumes give the ponytail a continuous curved silhouette.
    sphere(hair,m.pearl,[0,0,.06],[.045,.045,.06]);
    part(hair,g.sphere,m.hair,[.013,-.09,.12],[.072,.15,.075],1,[-.38,0,0]);
    part(hair,g.sphere,m.hair,[.018,-.25,.16],[.06,.13,.059],1,[.1,0,0]);
    sphere(hair,m.hair,[.01,-.34,.15],[.045,.065,.043]);
  }
  const legs=[],knees=[];
  for(const s of [-1,1]){
    const leg=new T.Group();leg.position.set(s*.17,.97,0);root.add(leg);legs.push(leg);
    const shin=new T.Group();shin.position.set(0,-.425,0);leg.add(shin);knees.push(shin);
    link(leg,m.suit,[0,-.025,0],[0,-.405,0],.122);sphere(leg,m.rose,[s*.025,-.185,-.025],[.13,.195,.105]);
    plate(leg,m.pearl,[s*.043,-.17,-.15],[.13,.26,.065],1,[.05,0,s*-.12]);
    sphere(shin,m.dark,[0,0,0],[.118,.11,.115]);link(shin,m.suit,[0,-.03,0],[0,-.35,0],.092);
    plate(shin,m.rose,[0,-.21,-.045],[.14,.30,.14]);plate(shin,m.pearl,[0,-.18,-.118],[.075,.23,.04]);
    plate(shin,m.dark,[0,-.433,-.05],[.23,.17,.34]);plate(shin,m.rose,[0,-.42,-.13],[.20,.13,.22]);
    plate(shin,m.steel,[0,-.492,-.05],[.245,.04,.35]);plate(shin,m.glow,[0,-.365,.095],[.06,.045,.015]);
    // Level 5: pronounced shin shells, articulated knee caps and thigh straps.
    plate(shin,m.pearl,[0,-.20,-.115],[.20,.34,.08],5,[.04,0,0]);plate(shin,m.rose,[0,.015,-.13],[.20,.15,.075],5);
    plate(shin,m.glow,[0,-.20,-.16],[.024,.20,.012],5);
    plate(leg,m.dark,[0,-.12,0],[.30,.045,.25],5);plate(leg,m.pearl,[s*.14,-.15,0],[.08,.16,.16],5);
    // Level 8: separate hip guards follow each moving leg.
    plate(leg,m.gold,[s*.13,-.04,-.02],[.11,.30,.22],8,[0,0,s*-.13]);
    plate(leg,m.pearl,[s*.10,-.10,-.12],[.14,.23,.06],8,[0,0,s*-.1]);
  }
  const arms=[];
  for(const s of [-1,1]){
    const arm=new T.Group();arm.position.set(s*(masculine?.355:.31),1.57,0);body.add(arm);arms.push(arm);
    const elbow=s===1?[.06,-.28,-.09]:[.18,-.28,-.26],wrist=s===1?[.04,-.35,-.51]:[.55,-.34,-.54];
    sphere(arm,m.rose,[s*.015,-.025,0],[masculine?.15:.13,.115,.15]);
    link(arm,m.suit,[0,-.03,0],elbow,.078);sphere(arm,m.dark,elbow,[.09,.085,.09]);link(arm,m.rose,elbow,wrist,.081);
    sphere(arm,m.dark,wrist,[.075,.085,.11]);
    plate(arm,m.pearl,[s*.06,-.16,-.045],[.105,.19,.10],1,[.18,0,s*.12]);
    // Level 3: layered curved pauldrons, not a single sphere.
    plate(arm,m.steel,[s*.025,.02,0],[.30,.16,.32],3,[0,0,s*-.20]);
    plate(arm,m.pearl,[s*.035,.07,-.02],[.32,.15,.32],3,[0,0,s*-.20]);
    plate(arm,m.rose,[s*.095,-.015,.015],[.14,.16,.29],3,[0,0,s*-.24]);
    plate(arm,m.glow,[s*.045,.105,-.183],[.16,.02,.012],3);
    const center=elbow.map((value,i)=>(value+wrist[i])*.5),direction=new T.Vector3(...wrist).sub(new T.Vector3(...elbow));
    const orientation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),direction.clone().normalize()));
    plate(arm,m.pearl,center,[.19,.19,direction.length()*.76],4,[orientation.x,orientation.y,orientation.z]);
    plate(arm,m.dark,[wrist[0],wrist[1]+.065,wrist[2]],[.17,.075,.16],4);
    plate(arm,m.cyan,[wrist[0],wrist[1]+.106,wrist[2]],[.10,.015,.075],4);
    plate(arm,m.gold,[s*.04,.117,0],[.27,.025,.27],8,[0,0,s*-.20]);
    plate(arm,m.gold,[wrist[0],wrist[1]+.11,wrist[2]],[.16,.018,.13],8);
  }
  const gun=createGun();gun.position.set(masculine?.405:.36,1.3,-.6);body.add(gun);
  // Level 2: sculpted chest plate with a recessed energy core and back brace.
  for(const s of [-1,1]){
    plate(body,m.pearl,[s*.13,1.49,-.19],[.25,.27,.095],2,[-.14,0,s*-.1]);
    plate(body,m.steel,[s*.18,1.35,-.185],[.12,.11,.075],2,[0,0,s*.35]);
    plate(body,m.rose,[s*.1,1.44,.20],[.13,.33,.075],2);
  }
  plate(body,m.dark,[0,1.50,-.255],[.075,.12,.035],2);plate(body,m.glow,[0,1.50,-.276],[.025,.08,.01],2);
  part(body,g.patch,m.emblem,[.12,1.555,-.247],[1,1,1],3,[0,Math.PI,0]);
  plate(body,m.dark,[-.26,1.49,.13],[.1,.18,.09],3);link(body,m.steel,[-.27,1.57,.13],[-.27,1.83,.13],.008,3);
  sphere(body,m.glow,[-.27,1.83,.13],[.012,.018,.012],3);
  // Level 4: a wrist hologram, kept small enough not to obscure the weapon.
  plate(arms[0],m.cyan,[.52,-.20,-.54],[.10,.045,.07],4,[-.2,0,0]);
  // Level 5: laser-cell utility belt and symmetric medical pouches.
  for(const s of [-1,1]){
    plate(body,m.dark,[s*.27,1.07,.01],[.13,.16,.19],5);plate(body,m.rose,[s*.285,1.07,-.09],[.095,.11,.035],5);
    link(body,m.pale,[s*.24,1.13,-.13],[s*.24,1.02,-.13],.018,5);
  }
  // Level 6: a curved panoramic visor sits outside the facial features.
  part(head,g.hair,m.pearl,[0,.035,.01],[.202,.245,.202],6);
  part(head,g.visor,m.visor,[0,.007,-.033],[.202,.235,.20],6);
  plate(head,m.glow,[0,.056,-.232],[.24,.014,.012],6);
  for(const s of [-1,1]){
    plate(head,m.pearl,[s*.18,-.03,.02],[.07,.16,.17],6,[0,0,s*-.08]);
    plate(head,m.rose,[s*.08,-.135,-.13],[.12,.08,.08],6,[0,s*.2,0]);
    plate(head,m.pale,[s*.1,-.136,-.182],[.04,.015,.012],6);
  }
  // Level 7: a compact reactor, visible in the third-person view.
  plate(body,m.dark,[0,1.43,.245],[.34,.39,.16],7);plate(body,m.pearl,[0,1.44,.337],[.28,.31,.07],7);
  for(const s of [-1,1]){
    link(body,m.steel,[s*.13,1.30,.36],[s*.13,1.60,.36],.058,7);
    link(body,m.glow,[s*.13,1.33,.411],[s*.13,1.56,.411],.022,7);
    plate(body,m.rose,[s*.15,1.64,.30],[.1,.065,.16],7,[0,0,s*.18]);
  }
  part(body,g.patch,m.emblem,[0,1.44,.381],[.9,.9,.9],7);
  // Level 8: rose-gold seam work ties all the armor pieces together.
  for(const s of [-1,1]){
    plate(body,m.gold,[s*.13,1.625,-.16],[.22,.025,.08],8,[0,0,s*-.12]);
    plate(body,m.gold,[s*.26,1.46,-.15],[.024,.23,.05],8,[0,0,s*.12]);
    plate(body,m.gold,[s*.23,1.08,-.16],[.11,.024,.10],8);
  }
  plate(head,m.gold,[0,.07,-.236],[.26,.017,.014],8);
  // Level 9: folded dorsal fins and rose light rails (visual accessories).
  for(const s of [-1,1]){
    plate(body,m.steel,[s*.32,1.61,.31],[.15,.62,.13],9,[.16,0,s*-.34]);
    plate(body,m.pearl,[s*.36,1.67,.37],[.13,.50,.07],9,[.16,0,s*-.34]);
    link(body,m.glow,[s*.25,1.44,.43],[s*.45,1.91,.35],.012,9);
    sphere(body,m.pale,[s*.48,1.94,.33],[.022,.029,.023],9);
  }
  const orbit=new T.Group();orbit.position.set(0,.30,.025);head.add(orbit);
  part(orbit,g.halo,m.glow,[0,0,0],[1,1,1],10,[Math.PI/2-.14,0,0]);
  for(const s of [-1,0,1]){
    plate(head,m.gold,[s*.082,.205,-.15],[.06,.12-Math.abs(s)*.025,.045],10,[0,0,s*-.15]);
    sphere(head,m.pale,[s*.082,.255-Math.abs(s)*.015,-.178],[.017,.025,.012],10);
  }
  for(const arm of arms)part(arm,g.patch,m.emblem,[0,.11,-.184],[.65,.65,.65],10,[0,Math.PI,0]);
  const state=finish();state.setLevel(1);
  if(masculine)body.scale.set(1.07,1,1.04);
  return {root,body,head,hair,legs,knees,gun, setLevel:level=>state.setLevel(level),
    get equipmentLevel(){return state.level;},get visibleParts(){return state.visibleParts;},batchCount:state.batchCount,
    animate(time,moving){
      const stride=moving?Math.sin(time*10)*.48:0;legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
      knees.forEach((knee,i)=>{knee.rotation.x=moving?Math.max(0,Math.sin(time*10+i*Math.PI))*.42:.06;});
      body.position.y=moving?Math.abs(Math.sin(time*10))*.025:Math.sin(time*2)*.007;
      hair.rotation.x=Math.sin(time*3)*.045;hair.rotation.z=Math.sin(time*2)*.025;
      orbit.rotation.y=time*.24;
    }
  };
}

export function createFirstPersonArm(kit) {
  const root=new T.Group(),{m,plate,sphere,link,finish}=partsBuilder(kit);
  sphere(root,m.dark,[0,-.13,.09],[.075,.085,.10]);
  link(root,m.suit,[.005,-.19,.17],[.055,-.22,.40],.075);
  plate(root,m.rose,[.015,-.19,.23],[.14,.14,.25],1,[-.12,0,0]);
  plate(root,m.pearl,[.015,-.16,.21],[.11,.07,.23],4,[-.12,0,0]);
  plate(root,m.dark,[.02,-.105,.245],[.13,.035,.10],4);
  plate(root,m.cyan,[.02,-.084,.245],[.085,.012,.07],4);
  plate(root,m.gold,[.02,-.09,.245],[.12,.012,.10],8);
  plate(root,m.glow,[.083,-.15,.24],[.012,.055,.15],9);
  const state=finish();state.setLevel(1);root.userData.setLevel=level=>state.setLevel(level);return root;
}
