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
