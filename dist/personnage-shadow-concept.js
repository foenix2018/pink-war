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
  const filteredGeometries=new Set();
  function hideAegisHead() {
    if(headIndex<0)return;
    for(const mesh of model.armor.parts){
      const original=mesh.geometry;
      if(original.userData?.shadowHelmetFiltered)continue;
      const skin=original.getAttribute('skinIndex');
      const idx=original.getIndex();
      const count=idx?idx.count:original.getAttribute('position')?.count||0;
      if(!skin||!count)continue;
      const keep=[];let removed=0;
      // AÉGIS IV armour batches are NON-INDEXED! Indexing-only logic never
      // removed the old round helmet and left it inside the new Shadow shell.
      // Build an index list for both indexed and non-indexed geometries.
      for(let i=0;i<count;i+=3){
        const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
        if(skin.getX(a)===headIndex&&skin.getX(b)===headIndex&&skin.getX(c)===headIndex)removed++;
        else keep.push(a,b,c);
      }
      if(removed){
        const filtered=original.clone();
        filtered.setIndex(keep);
        filtered.userData.shadowHelmetFiltered=true;
        mesh.geometry=filtered;
        filteredGeometries.add(filtered);
      }
    }
  }
  const originalSetLevel=model.setLevel.bind(model);
  model.setLevel=(n)=>{
    const next=Math.max(1,Math.min(10,Math.floor(Number(n)||1)));
    if(next!==model.equipmentLevel){
      for(const geometry of filteredGeometries)geometry.dispose();
      filteredGeometries.clear();
    }
    originalSetLevel(n);
    hideAegisHead();
  };
  hideAegisHead();

  // Nouveau casque à facettes : volume resserré au menton, épaissi au front.
  // La géométrie reprend les proportions du casque de référence, sans réemployer
  // la coque ronde d'AÉGIS. Vue de face = -Z.
  const helmet=boneAnchor(model.actor.bone('Head'),[0,1.751,.018]);
  helmet.name='Shadow V6 / casque tactique polygonal';

  function facetHull(rings,steps=16){
    const verts=[],indices=[];
    for(let j=0;j<rings.length;j++){
      const [y,w,d,offset]=rings[j];
      for(let i=0;i<steps;i++){
        const a=2*Math.PI*i/steps,oct=Math.pow(1/(Math.pow(Math.abs(Math.cos(a)),6)+Math.pow(Math.abs(Math.sin(a)),6)),1/6);
        verts.push(w*Math.cos(a)*oct,y,Math.sin(a)*d*oct+offset);
        if(j>0){
          const n=j*steps+i,nn=j*steps+(i+1)%steps,p=n-steps,pn=nn-steps;
          indices.push(p,pn,n,pn,nn,n);
        }
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    g.setIndex(indices);const non=g.toNonIndexed();non.computeVertexNormals();g.dispose();return non;
  }
  part(helmet,facetHull([
    [-.175,.084,.109,.016],[-.127,.126,.136,.010],[-.080,.151,.164,.003],
    [-.026,.170,.170,.006],[.041,.171,.168,.010],[.096,.149,.152,.013],
    [.145,.108,.108,.013],[.169,.048,.047,.011]
  ],16),dark);
  // Panneaux à relief superposés, de la calotte jusqu'à l'avant frontal.
  shape(helmet,[[-.095,-.050],[-.116,.007],[-.063,.113],[-.010,.133],[.010,.133],
    [.063,.113],[.116,.007],[.095,-.050]],graphite,[0,.020,-.132],[.16,0,0],.010);
  shape(helmet,[[-.061,-.029],[-.072,.059],[-.016,.104],[.016,.104],
    [.072,.059],[.061,-.029]],dark,[0,.058,-.153],[.23,0,0],.012);
  shape(helmet,[[-.037,-.020],[-.045,.052],[-.012,.075],[.012,.075],
    [.045,.052],[.037,-.020]],steel,[0,.122,-.096],[.43,0,0],.0025);
  block(helmet,.072,.012,.012,light,0,.134,-.079,[.12,0,0]);
  for(const s of [-1,1]){
    shape(helmet,[[-.055,-.042],[-.069,.047],[-.012,.093],[.052,.066],
      [.068,.003],[.035,-.061]],graphite,[s*.116,.040,-.083],[.1,s*.42,s*-.05],.010);
    // Tuiles ventilo-temporales et antennes encastrées, non flottantes.
    shape(helmet,[[-.045,-.061],[-.052,.036],[.011,.074],[.050,.026],
      [.040,-.058]],steel,[s*.105,-.056,.091],[.10,s*-.45,0],.006);
    block(helmet,.025,.016,.018,black,s*.120,.068,-.119,[0,s*-.35,0]);
    path(helmet,[[s*.036,.106,-.153],[s*.090,.072,-.156],
      [s*.131,.034,-.129],[s*.146,.007,-.113]],light,.0045);
    path(helmet,[[s*.112,-.100,-.111],[s*.155,-.073,-.085]],dim,.003);
    // Écouteur compact et épais, avec anneau directionnel rose/bleu.
    part(helmet,new T.CylinderGeometry(.055,.055,.024,24),black,
      [s*.165,-.032,.016],[0,0,Math.PI/2]);
    part(helmet,new T.TorusGeometry(.046,.006,7,32),light,
      [s*.184,-.032,.016],[0,Math.PI/2,0]);
    part(helmet,new T.CylinderGeometry(.028,.028,.009,24),graphite,
      [s*.190,-.032,.016],[0,0,Math.PI/2]);
    part(helmet,new T.TorusGeometry(.020,.0025,7,24),dim,
      [s*.197,-.032,.016],[0,Math.PI/2,0]);
  }

  // Visière RAPETISSÉE en hauteur, découpée par des bords anguleux ;
  // le verre va de +.014 à -.066, alors que l'ancienne visière
  // (-.088..+.046) faisait presque la moitié du casque.
  const sections=[{y:.026,w:.86,depth:.184},
                  {y:.016,w:1.0,depth:.188},
                  {y:-.045,w:1.0,depth:.190},
                  {y:-.073,w:.77,depth:.170}];
  const lensVerts=[],lensIdx=[],count=30;
  for(let row=0;row<sections.length;row++){
    const {y,w,depth}=sections[row];
    for(let i=0;i<=count;i++){
      const a=(i/count-.5)*2.14;
      const x=Math.sin(a)*.160*w;
      const z=-depth*Math.cos(a)-.006;
      lensVerts.push(x,y,z);
      if(row&&i<count){const n=row*(count+1)+i,p=n-(count+1);
        lensIdx.push(p,n,p+1,p+1,n,n+1);}
    }
  }
  const lens=new T.BufferGeometry();
  lens.setAttribute('position',new T.Float32BufferAttribute(lensVerts,3));
  lens.setIndex(lensIdx);lens.computeVertexNormals();
  part(helmet,lens,glass);
  // Haut de visière à épaisseur maîtrisée, encadrement en alliage, pas une "sangle".
  path(helmet,[[-.123,.032,-.121],[-.088,.033,-.166],
    [0,.035,-.194],[.088,.033,-.166],[.123,.032,-.121]],dark,.007);
  path(helmet,[[-.124,.028,-.125],[-.088,.029,-.171],
    [0,.030,-.200],[.088,.029,-.171],[.124,.028,-.125]],light,.0028);
  path(helmet,[[-.107,-.072,-.126],[-.079,-.075,-.160],
    [0,-.082,-.184],[.079,-.075,-.160],[.107,-.072,-.126]],graphite,.008);
  // Masque inférieur géométrique articulé, en plusieurs couches et facettes.
  shape(helmet,[[-.114,.003],[-.095,.052],[-.035,.073],[.035,.073],
    [.095,.052],[.114,.003],[.083,-.066],[0,-.088],[-.083,-.066]],
    dark,[0,-.128,-.133],[.05,0,0],.022);
  shape(helmet,[[-.085,.007],[-.055,.060],[0,.068],[.055,.060],
    [.085,.007],[.055,-.051],[0,-.071],[-.055,-.051]],
    graphite,[0,-.131,-.158],[.05,0,0],.012);
  for(const s of [-1,1]){
    shape(helmet,[[-.025,-.053],[-.034,.026],[-.012,.047],
      [.019,.036],[.036,-.015]],steel,[s*.071,-.132,-.162],[0,s*-.20,0],.006);
    path(helmet,[[s*.117,-.081,-.116],
      [s*.123,-.113,-.129],[s*.095,-.151,-.166]],dim,.0034);
  }
  block(helmet,.066,.068,.025,black,0,-.133,-.182);
  for(const x of [-.016,.016])
    block(helmet,.006,.057,.015,light,x,-.137,-.204);
  block(helmet,.038,.014,.023,graphite,0,-.174,-.196);

  // Détails fermés au dos, la même géométrie reste cohérente pendant la rotation.
  for(const s of [-1,1]){
    shape(helmet,[[-.057,-.032],[-.068,.033],[.011,.077],[.065,.028],
      [.044,-.052]],graphite,[s*.088,.076,.102],[.10,s*-.28,0],.006);
    block(helmet,.018,.009,.010,light,s*.105,.132,.080);
  }
  shape(helmet,[[-.094,-.033],[-.082,.063],[-.030,.096],[.030,.096],
    [.082,.063],[.094,-.033]],graphite,[0,.027,.172],[0,Math.PI,0],.009);
  block(helmet,.072,.010,.015,light,0,.096,.180);
  for(let i=0;i<4;i++)
    block(helmet,.022,.004,.008,black,-.046+i*.030,.142,-.027,[.10,0,0]);

  // Plastron Shadow : volume anguleux et profond placé DEVANT l'armure AÉGIS.
  // La version précédente mettait les plaques à z=-.136, donc sous la coque.
  const spine=boneAnchor(model.actor.bone('Spine2'),[0,1.432,0]);
  spine.name='Shadow V6 / thorax sculpté';
  // Dos : module existant conservé, finition sombre avec bande LED discrète.
  shape(spine,[[-.172,-.104],[.172,-.104],[.187,.046],[.134,.131],
    [-.134,.131],[-.187,.046]],dark,[0,-.005,.172],[0,0,0],.008);
  shape(spine,[[-.145,-.089],[.145,-.089],[.148,.041],[.105,.088],
    [-.105,.088],[-.148,.041]],steel,[0,-.005,.183],[0,0,0],.004);
  block(spine,.101,.192,.029,black,0,-.013,.200);
  for(let j=0;j<5;j++)block(spine,.057,.005,.004,dark,0,-.077+j*.029,.220);
  block(spine,.084,.011,.007,light,0,.103,.215);

  // Collier articulé sous le casque : trois plaques et contacts lumineux.
  shape(spine,[[-.099,-.032],[-.101,.021],[-.053,.041],[.053,.041],
    [.101,.021],[.099,-.032]],black,[0,.128,-.153],[.04,0,0],.014);
  block(spine,.068,.012,.008,graphite,0,.159,-.157);
  for(const side of [-1,1]){
    shape(spine,[[-.072,-.052],[-.079,.032],[-.047,.093],
      [.033,.101],[.091,.041],[.082,-.064]],dark,
      [side*.109,.027,-.210],[0,side*-.11,0],.014);
    // Les plaques gris canon sont visibles au-dessus du plastron noir.
    shape(spine,[[-.063,-.054],[-.070,.027],[-.028,.073],
      [.031,.075],[.072,.028],[.060,-.058]],steel,
      [side*.108,.030,-.232],[0,side*-.12,0],.006);
    shape(spine,[[-.048,-.031],[-.047,.023],[-.013,.054],
      [.048,.027],[.048,-.038]],graphite,
      [side*.11,.027,-.241],[0,side*-.12,0],.006);
    // Bande de lumière suit le biseau, encadrant la cage thoracique.
    path(spine,[[side*.158,.093,-.222],[side*.181,.030,-.240],
      [side*.178,-.034,-.237],[side*.129,-.089,-.235]],light,.004);
    path(spine,[[side*.100,-.101,-.237],[side*.166,-.078,-.245]],dim,.003);
    // Fixations visibles pour apporter la richesse hard-surface de la référence.
    for(const y of [.100,-.091]){
      part(spine,new T.CylinderGeometry(.006,.006,.004,8),black,
        [side*.118,y,-.249],[Math.PI/2,0,0]);
    }
  }
  // Noyau central en forme de bouclier, LED horizontale et ouïes.
  shape(spine,[[-.069,-.088],[-.079,.077],[-.046,.127],
    [.046,.127],[.079,.077],[.069,-.088]],black,
    [0,.017,-.254],[0,0,0],.016);
  shape(spine,[[-.055,-.072],[-.057,.066],[-.037,.082],
    [.037,.082],[.057,.066],[.055,-.072]],graphite,
    [0,.015,-.271],[0,0,0],.005);
  block(spine,.077,.017,.011,light,0,.103,-.281);
  for(let j=0;j<4;j++)
    block(spine,.062-j*.005,.005,.006,black,0,.048-j*.029,-.281);
  // Le bouclier inférieur du sternum relie le thorax aux abdominaux.
  shape(spine,[[-.093,.031],[-.043,.062],[.043,.062],[.093,.031],
    [.067,-.049],[0,-.069],[-.067,-.049]],steel,
    [0,-.161,-.205],[.07,0,0],.008);
  shape(spine,[[-.076,.021],[-.038,.052],[.038,.052],
    [.076,.021],[.051,-.034],[0,-.052],[-.051,-.034]],graphite,
    [0,-.169,-.216],[.07,0,0],.007);

  // Micro-protections sur les articulations : épaulettes plus ajustées et
  // symétriques, sans grands rectangles flottant autour des bras.
  for(const side of [-1,1]){
    const sideName=side<0?'Left':'Right';
    const shoulder=boneAnchor(model.actor.bone(sideName+'Arm'),
      [side*.211,1.478,-.001]);
    shoulder.name='Shadow V6 / épaule '+sideName;
    shape(shoulder,[[-.085,-.050],[-.091,.014],[-.047,.066],
      [.020,.079],[.086,.018],[.067,-.055]],graphite,
      [0,0,-.021],[.17,side*.17,side*.17],.011);
    shape(shoulder,[[-.066,-.036],[-.064,.017],[-.016,.056],
      [.029,.053],[.063,.002],[.046,-.044]],steel,
      [0,.009,-.035],[.17,side*.12,side*.12],.004);
    path(shoulder,[[-.047,.050,-.041],[-.013,.065,-.042],
      [.038,.045,-.040]],light,.0055);
    // Le dernier bord entre cuirasse et articulation reste noir, non fluorescent.
    path(shoulder,[[-.052,-.035,-.045],[.051,-.035,-.045]],dark,.003);
  }
  return {
    helmet,spine,
    dispose(){
      for(const g of geometries)g.dispose();
      for(const g of filteredGeometries)g.dispose();
      filteredGeometries.clear();
      for(const m of disposables)m.dispose();
    }
  };
}
