import * as T from './vendor/three.webgpu.min.js';

// Shadow Unit : prototype Three.js propre à la visionneuse HTML.
// Reconstitue les volumes du concept (pas un fichier 3D extrait de l'illustration).
// Les animations/meshes AÉGIS de la version du jeu ne sont pas modifiées.
export function attachShadowConcept(model, profile) {
  const blue=!!profile.masculine;
  const accent=blue?0x51b5ff:0xff3795;
  const dark=new T.MeshStandardMaterial({color:0x191c23,roughness:.48,metalness:.67,flatShading:true,side:T.DoubleSide});
  const graphite=new T.MeshStandardMaterial({color:0x2b2e36,roughness:.40,metalness:.73,flatShading:true,side:T.DoubleSide});
  const steel=new T.MeshStandardMaterial({color:0x595e6a,roughness:.48,metalness:.72,side:T.DoubleSide});
  const black=new T.MeshStandardMaterial({color:0x080a0f,roughness:.65,metalness:.33,side:T.DoubleSide});
  const glass=new T.MeshPhysicalMaterial({
    color:blue?0x0b2849:0x320b22,metalness:.65,roughness:.13,
    clearcoat:1,clearcoatRoughness:.05,side:T.DoubleSide,
    emissive:blue?0x051a29:0x200714,emissiveIntensity:.26
  });
  const light=new T.MeshBasicMaterial({color:accent,toneMapped:false,side:T.DoubleSide});
  const dim=new T.MeshBasicMaterial({color:blue?0x2269b6:0x9a205d,toneMapped:false,side:T.DoubleSide});
  const disposables=[dark,graphite,steel,black,glass,light,dim];
  const geometries=[];
  function part(parent,geom,mat,pos=[0,0,0],rotation=[0,0,0]) {
    const o=new T.Mesh(geom,mat);
    o.position.set(...pos);o.rotation.set(...rotation);
    o.castShadow=mat!==light&&mat!==dim;
    o.receiveShadow=true;
    parent.add(o);geometries.push(geom);return o;
  }
  function block(p,w,h,d,mat,x,y,z,rot=[0,0,0]) {
    return part(p,new T.BoxGeometry(w,h,d),mat,[x,y,z],rot);
  }
  function shape(p,outline,mat,pos,rot=[0,0,0],depth=.006) {
    const s=new T.Shape();
    outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
    s.closePath();
    return part(p,new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:false}),mat,pos,rot);
  }
  function path(p,points,mat=light,r=.0034) {
    const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
    return part(p,new T.TubeGeometry(curve,Math.max(9,points.length*5),r,6,false),mat);
  }
  function boneAnchor(bone,position) {
    model.root.updateMatrixWorld(true);
    const point=model.root.localToWorld(new T.Vector3(...position));
    const rootRotation=model.root.getWorldQuaternion(new T.Quaternion());
    const boneRotation=bone.getWorldQuaternion(new T.Quaternion());
    const group=new T.Group();
    group.position.copy(bone.worldToLocal(point));
    group.quaternion.copy(boneRotation.invert().multiply(rootRotation));
    bone.add(group);
    return group;
  }

  // Masque les triangles du casque AÉGIS d'origine uniquement dans cette copie
  // prévisualisée ; tout le reste de l'armure et le rig natif sont conservés.
  const headIndex=model.actor.bones.findIndex(b=>b.name==='mixamorigHead');
  function hideAegisHead() {
    if(headIndex<0)return;
    for(const mesh of model.armor.parts){
      const original=mesh.geometry;
      if(original.userData?.shadowHelmetFiltered)continue;
      const skin=original.getAttribute('skinIndex');
      const idx=original.getIndex();
      if(!skin||!idx)continue;
      const keep=[];let removed=0;
      for(let i=0;i<idx.count;i+=3){
        const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
        if(skin.getX(a)===headIndex&&skin.getX(b)===headIndex&&skin.getX(c)===headIndex)removed++;
        else keep.push(a,b,c);
      }
      if(removed){
        const filtered=original.clone();
        filtered.setIndex(keep);
        filtered.userData.shadowHelmetFiltered=true;
        mesh.geometry=filtered;
      }
    }
  }
  const originalSetLevel=model.setLevel.bind(model);
  model.setLevel=(n)=>{originalSetLevel(n);hideAegisHead();};
  hideAegisHead();

  // Ce repère suit exactement l'os Head du rig Mixamo.
  const helmet=boneAnchor(model.actor.bone('Head'),[0,1.751,.018]);
  helmet.name='Shadow Unit : casque tactique facetté';
  // Calotte fermée taillée en facettes. L'avant est du côté -Z.
  const rings=[
    [-.165,.071,.088,.015],[-.130,.116,.128,.004],
    [-.082,.144,.161,.001],[-.018,.160,.173,.005],
    [ .055,.157,.171,.008],[ .110,.134,.143,.010],
    [ .159,.093,.105,.012],[ .178,.046,.053,.010]
  ];
  const verts=[],faces=[],sides=16;
  for(let j=0;j<rings.length;j++){
    const [y,rx,rz,dz]=rings[j];
    for(let i=0;i<sides;i++){
      const a=i*Math.PI*2/sides;
      const noise=i%4===0?1.014:1;
      verts.push(Math.cos(a)*rx*noise,y,Math.sin(a)*rz*noise+dz);
      if(j){
        const a0=(j-1)*sides+i,a1=(j-1)*sides+(i+1)%sides;
        const b0=j*sides+i,b1=j*sides+(i+1)%sides;
        faces.push(a0,a1,b0,a1,b1,b0);
      }
    }
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  g.setIndex(faces);
  const facets=g.toNonIndexed();facets.computeVertexNormals();g.dispose();
  part(helmet,facets,dark);
  // Plaques de front, de crâne et des tempes : angles cassés conformément au concept.
  shape(helmet,[[-.095,-.023],[-.079,.068],[-.018,.120],[.018,.120],[.079,.068],[.095,-.023]],
    graphite,[0,.036,-.125],[.22,0,0],.010);
  shape(helmet,[[-.068,-.031],[-.050,.056],[-.022,.073],[.022,.073],[.050,.056],[.068,-.031]],
    steel,[0,.107,-.084],[.57,0,0],.003);
  for(const side of [-1,1]){
    shape(helmet,[[-.068,-.047],[-.076,.037],[-.017,.093],[.049,.082],[.074,.009],[.056,-.044]],
      graphite,[side*.096,.052,-.026],[.11,side*.53,side*.14],.008);
    shape(helmet,[[-.055,-.055],[-.065,.038],[.019,.079],[.065,.008],[.055,-.051]],
      steel,[side*.085,-.069,side*.076],[.10,side*.65,0],.004);
    // Large module auriculaire circulaire avec anneau lumineux.
    part(helmet,new T.CylinderGeometry(.060,.060,.021,24),black,[side*.171,-.019,.013],[0,0,Math.PI/2]);
    part(helmet,new T.TorusGeometry(.047,.0065,8,32),light,[side*.187,-.019,.013],[0,Math.PI/2,0]);
    part(helmet,new T.CylinderGeometry(.032,.032,.009,20),graphite,[side*.192,-.019,.013],[0,0,Math.PI/2]);
    part(helmet,new T.TorusGeometry(.021,.0035,6,24),dim,[side*.201,-.019,.013],[0,Math.PI/2,0]);
    path(helmet,[[side*.017,.136,-.099],[side*.085,.114,-.116],
      [side*.132,.072,-.110],[side*.156,.031,-.079]],light,.0052);
    path(helmet,[[side*.116,-.101,-.084],[side*.162,-.071,-.055],
      [side*.166,-.043,-.034]],dim,.0035);
  }

  // Visière panoramique : facettes enveloppantes, large bande vitrée unique.
  const vpos=[],vidx=[],sections=[.046,.024,-.045,-.088],count=22;
  for(let row=0;row<sections.length;row++){
    for(let i=0;i<=count;i++){
      const a=(i/count-.5)*1.96,stretch=row===0?.92:row===3?.79:1;
      vpos.push(Math.sin(a)*.157*stretch,sections[row],
        -.192*Math.cos(a)+(row===3?.018:0));
      if(row&&i<count){
        const n=row*(count+1)+i,p=n-(count+1);
        vidx.push(p,n,p+1,p+1,n,n+1);
      }
    }
  }
  const lens=new T.BufferGeometry();
  lens.setAttribute('position',new T.Float32BufferAttribute(vpos,3));
  lens.setIndex(vidx);lens.computeVertexNormals();
  part(helmet,lens,glass);
  path(helmet,[[-.131,.057,-.143],[-.075,.066,-.180],[0,.068,-.193],
    [.075,.066,-.180],[.131,.057,-.143]],graphite,.009);
  path(helmet,[[-.116,-.093,-.145],[-.050,-.096,-.181],[0,-.099,-.179],
    [.050,-.096,-.181],[.116,-.093,-.145]],graphite,.0075);
  // Mandibule avancée, prises d'air et LED centrales verticales.
  shape(helmet,[[-.093,-.027],[-.071,.041],[-.030,.063],[.030,.063],
    [.071,.041],[.093,-.027],[.067,-.081],[-.067,-.081]],
    graphite,[0,-.145,-.124],[.17,0,0],.020);
  block(helmet,.077,.055,.018,black,0,-.151,-.153);
  for(const x of [-.025,.025])block(helmet,.009,.044,.024,light,x,-.149,-.167);
  block(helmet,.105,.012,.018,light,0,-.157,-.175);
  // Dessus : aérations et bande arrière du casque pour la vue à 360 degrés.
  for(const side of [-1,1]){
    shape(helmet,[[-.064,-.029],[-.072,.052],[.015,.085],[.070,.028],[.042,-.048]],
      graphite,[side*.083,.073,.092],[.08,side*-.35,0],.004);
    block(helmet,.032,.008,.011,light,side*.095,.132,.103);
  }
  shape(helmet,[[-.097,-.038],[-.088,.071],[-.032,.111],[.032,.111],
    [.088,.071],[.097,-.038]],graphite,[0,.034,.155],[0,Math.PI,0],.005);
  block(helmet,.090,.015,.014,light,0,.098,.163);
  for(const x of [-.072,-.044,.044,.072])block(helmet,.015,.009,.009,black,x,.149,-.021,[.20,0,0]);

  // Armure "Shadow" : accents lumineux et nouveaux cache-joints 3D,
  // fixés aux os du personnage pour rester animés.
  const spine=boneAnchor(model.actor.bone('Spine2'),[0,1.432,0]);
  spine.name='Shadow Unit / plastrons et module arrière';
  // Bord du boîtier dorsal; celui-ci reste visible au-dessus de la cape.
  shape(spine,[[-.169,-.102],[.169,-.102],[.188,.049],[.142,.123],
    [-.142,.123],[-.188,.049]],dark,[0,-.006,.171],[0,0,0],.008);
  shape(spine,[[-.140,-.085],[.140,-.085],[.148,.042],[.110,.089],
    [-.110,.089],[-.148,.042]],steel,[0,-.006,.182],[0,0,0],.004);
  block(spine,.110,.203,.035,black,0,-.010,.196);
  for(let j=0;j<5;j++)block(spine,.056,.006,.004,graphite,0,-.078+j*.032,.218);
  block(spine,.091,.014,.007,light,0,.102,.205);
  for(const side of [-1,1]){
    path(spine,[[side*.158,.104,.181],[side*.176,.051,.186],
      [side*.177,-.056,.190]],light,.004);
    // Finition plus sombre du plastron et des rainures sur poitrine.
    shape(spine,[[-.093,-.079],[-.111,.024],[-.057,.106],
      [.046,.113],[.095,.047],[.069,-.092]],graphite,
      [side*.105,.015,-.136],[.14,side*.16,0],.008);
  }
  for(const side of [-1,1]){
    const sideName=side<0?'Left':'Right';
    const shoulder=boneAnchor(model.actor.bone(sideName+'Arm'),[side*.215,1.479,.006]);
    shoulder.name='Shadow / épaulette '+sideName;
    shape(shoulder,[[-.110,-.054],[-.112,.050],[-.051,.102],
      [.054,.096],[.120,.014],[.109,-.067]],
      graphite,[0,0,-.004],[.15,side*.18,side*.23],.012);
    path(shoulder,[[-.069,.062,-.011],[-.018,.081,-.012],
      [.057,.060,-.012]],light,.006);
    // Détails des avant-bras, fins pour ne pas gêner la préhension.
    const forearm=boneAnchor(model.actor.bone(sideName+'ForeArm'),[side*.350,1.16,-.030]);
    forearm.name='Shadow / avant-bras '+sideName;
    path(forearm,[[0,.064,-.044],[0,.015,-.058],[0,-.045,-.051]],light,.0044);
  }
  return {
    helmet,spine,
    dispose(){
      for(const g of geometries)g.dispose();
      for(const m of disposables)m.dispose();
    }
  };
}
