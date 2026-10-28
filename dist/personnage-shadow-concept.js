import {buildShadowHelmet} from './shadow-helmet.js';
import {reflectedGeometry,symmetricGeometry,mirrorAttachmentFrame} from './shadow-symmetry.js';
import * as T from './vendor/three.webgpu.min.js';
import {merge,bevelBox,loft} from './geo.js';
import {batchHeroArmor} from './hero-armor-batches.js';

// Shared reference armour: fitted to the native bones for both game and viewer.
export function attachShadowConcept(model, profile) {
  // Author attachment transforms in the rig's bind pose, never in the transient
  // weapon IK pose active when the scene happens to instantiate this soldier.
  const pose=model.actor.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
  for(let i=0;i<model.actor.bones.length;i++){
    model.actor.bones[i].position.fromArray(model.actor.data.bones[i].p);
    model.actor.bones[i].quaternion.fromArray(model.actor.data.bones[i].q);
  }
  model.root.updateMatrixWorld(true);
  const blue=!!profile.masculine;
  const accent=blue?0x51b5ff:0xff148b;
  const dark=new T.MeshStandardMaterial({color:0x222731,roughness:.43,metalness:.58,flatShading:false,side:T.DoubleSide});
  const graphite=new T.MeshStandardMaterial({color:0x343b46,roughness:.34,metalness:.68,flatShading:false,side:T.DoubleSide});
  const steel=new T.MeshStandardMaterial({color:0x687280,roughness:.38,metalness:.74,side:T.DoubleSide});
  const black=new T.MeshStandardMaterial({color:0x080a0f,roughness:.65,metalness:.33,side:T.DoubleSide});
  const glass=new T.MeshPhysicalMaterial({
    color:blue?0x10233c:0x35152b,metalness:.38,roughness:.095,
    clearcoat:1,clearcoatRoughness:.045,ior:1.48,side:T.DoubleSide,
    emissive:blue?0x051a29:0x200714,emissiveIntensity:.26
  });
  glass.name='Shadow dark visor';glass.userData.studioReflection=.60;
  const light=new T.MeshBasicMaterial({color:accent,toneMapped:false,side:T.DoubleSide});
  const dim=new T.MeshBasicMaterial({color:blue?0x2269b6:0x9a205d,toneMapped:false,side:T.DoubleSide});
  // Fine machining grain and occasional hairline scratches, shared by the
  // metal plates. Keep the contrast low so the silhouette remains readable.
  const texSize=256,texels=new Uint8Array(texSize*texSize*4);
  const hash=(x,y)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+31,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
  for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){
    const noise=hash(x,y)%13,grain=hash(0,y)%7;
    const scratch=(hash(Math.floor(x/23),y)%997<3&&x%23<16)?22:0;
    const c=Math.min(255,216+noise+grain+scratch),i=(y*texSize+x)*4;
    texels.set([c,c,c,255],i);
  }
  const finish=new T.DataTexture(texels,texSize,texSize);finish.needsUpdate=true;
  finish.wrapS=finish.wrapT=T.RepeatWrapping;
  for(const material of [dark,graphite,steel]){
    material.map=finish;material.bumpMap=finish;material.bumpScale=.00013;
  }
  const disposables=[dark,graphite,steel,black,glass,light,dim];
  const geometries=[],attachmentGroups=[];
  const environment=model.armor.parts.find(p=>p.material?.envMap)?.material.envMap;
  if(environment)for(const material of [dark,graphite,steel,black,glass]){
    material.envMap=environment;material.envMapIntensity=.65;
  }
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
  // Closed hard-surface plates: perimeter bevel, sloped shoulder and a raised
  // central field. The front is genuinely sculpted, rather than a flat decal.
  function shape(p,outline,mat,pos,rot=[0,0,0],depth=.006) {
    const n=outline.length,cx=outline.reduce((s,v)=>s+v[0],0)/n,
      cy=outline.reduce((s,v)=>s+v[1],0)/n;
    const facing=(pos[2]>.06?1:-1)*(Math.cos(rot[1])>=0?1:-1);
    const rise=Math.min(.022,depth+.007),vertices=[],indices=[];
    const rings=[[1,0],[.965,.0025],[.90,.006],[.78,rise*.8],[.48,rise]];
    for(const [scale,z] of rings)for(const [x,y] of outline)
      vertices.push(cx+(x-cx)*scale,cy+(y-cy)*scale,z*facing);
    for(let row=1;row<rings.length;row++)for(let i=0;i<n;i++){
      const a=(row-1)*n+i,b=(row-1)*n+(i+1)%n,c=row*n+i,d=row*n+(i+1)%n;
      indices.push(a,b,c,b,d,c);
    }
    const center=vertices.length/3;vertices.push(cx,cy,(rise+.001)*facing);
    for(let i=0;i<n;i++)indices.push((rings.length-1)*n+i,(rings.length-1)*n+(i+1)%n,center);
    // Seal the underside to give the plate a real edge in profile.
    const back=vertices.length/3;vertices.push(cx,cy,-.003*facing);
    for(let i=0;i<n;i++)indices.push((i+1)%n,i,back);
    const area=outline.reduce((sum,[x,y],i)=>{const next=outline[(i+1)%n];return sum+x*next[1]-next[0]*y;},0);
    if(Math.sign(area)!==facing)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);
    const rx=Math.max(...outline.map(v=>Math.abs(v[0]-cx)),.001),ry=Math.max(...outline.map(v=>Math.abs(v[1]-cy)),.001);
    const uv=[];for(let i=0;i<vertices.length;i+=3)uv.push(.5+(vertices[i]-cx)/(2*rx),.5+(vertices[i+1]-cy)/(2*ry));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();const flat=g.toNonIndexed();g.dispose();
    return part(p,flat,mat,pos,rot);
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
    bone.add(group);attachmentGroups.push(group);
    return group;
  }

  // Retain the native flexible suit and skeleton; replace the old rigid shell.
  const headIndex=model.actor.bones.findIndex(b=>b.name==='mixamorigHead');
  const filteredGeometries=new Set();
  function hideReplacedArmor() {
    if(headIndex<0)return;
    for(const mesh of model.armor.parts){
      // Legacy pastel plates must not poke through the new reference shell.
      // Keep the flexible suit; obsolete armour, exoskeleton rods and lights
      // would otherwise protrude asymmetrically through the replacement shell.
      mesh.visible=mesh.name.endsWith(' suit');
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
    hideReplacedArmor();
  };
  hideReplacedArmor();

  // Nouveau casque à facettes : volume resserré au menton, épaissi au front.
  // La géométrie reprend les proportions du casque de référence, sans réemployer
  // la coque ronde d'AÉGIS. Vue de face = -Z.
  const helmet=boneAnchor(model.actor.bone('Head'),[0,1.751,.018]);
  helmet.name='Shadow V6 / casque tactique polygonal';
  helmet.scale.setScalar(.73);

  function facetHull(rings,steps=16){
    const verts=[],indices=[];
    for(let j=0;j<rings.length;j++){
      const [y,w,d,offset]=rings[j];
      for(let i=0;i<steps;i++){
        const a=2*Math.PI*i/steps,oct=Math.pow(1/(Math.pow(Math.abs(Math.cos(a)),6)+Math.pow(Math.abs(Math.sin(a)),6)),1/6);
        verts.push(w*Math.cos(a)*oct,y,Math.sin(a)*d*oct+offset);
        if(j>0){
          const n=j*steps+i,nn=j*steps+(i+1)%steps,p=n-steps,pn=nn-steps;
          indices.push(p,n,pn,pn,n,nn);
        }
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    g.setIndex(indices);g.computeVertexNormals();const non=g.toNonIndexed();g.dispose();return non;
  }
  buildShadowHelmet(helmet,{
    part,shape,block,path,materials:{dark,graphite,black,steel,glass,light,dim},disposables
  });

  // Fit the plates to the retained undersuit, which is only 26 cm deep.
  // The former stand-off was authored over an AEGIS shell that is now hidden.
  const spine=boneAnchor(model.actor.bone('Spine2'),[0,1.432,0]);
  spine.name='Shadow V6 / thorax sculpté';
  const lining=part(spine,loft([
    [-.140,.161,.119],[-.105,.184,.129],[-.042,.211,.139],
    [.038,.220,.141],[.083,.204,.129],[.120,.154,.103],[.143,.077,.077]
  ],28),black);
  lining.name='Shadow / cuirasse ajustée et retours latéraux';
  lining.userData.fittedThorax=true;
  spine.scale.x=blue?1.015:.965;
  // Rear reference: two broad gunmetal scapular plates, central vent cassette.
  for(const sign of [-1,1]){
    const outline=[[.060,-.110],[.153,-.100],[.205,-.057],[.213,.067],
      [.159,.125],[.081,.143],[.058,.105]].map(([x,y])=>[sign*x,y]);
    shape(spine,outline,dark,[0,-.005,.178],[0,0,0],.022);
    shape(spine,outline.map(([x,y])=>[x*.91,y*.87]),steel,[0,-.002,.204],[0,0,0],.009);
    path(spine,[[sign*.193,.047,.220],[sign*.196,-.070,.221]],light,.004);
    block(spine,.028,.031,.012,graphite,sign*.197,.079,.222);
  }
  shape(spine,[[-.066,-.118],[.066,-.118],[.069,.126],[.054,.145],
    [-.054,.145],[-.069,.126]],black,[0,0,.221],[0,0,0],.024);
  block(spine,.074,.012,.008,light,0,.110,.267);
  for(let j=0;j<6;j++){
    block(spine,.078,.009,.008,graphite,0,.065-j*.028,.268);
    block(spine,.070,.004,.005,black,0,.067-j*.028,.274);
  }

  // Collier articulé sous le casque : trois plaques et contacts lumineux.
  shape(spine,[[-.099,-.032],[-.101,.021],[-.053,.041],[.053,.041],
    [.101,.021],[.099,-.032]],black,[0,.128,-.153],[.04,0,0],.014);
  block(spine,.068,.012,.008,graphite,0,.159,-.157);
  for(const side of [-1,1]){
    const wing=[[.056,-.059],[.130,-.103],[.192,-.033],[.214,.061],
      [.169,.117],[.091,.133],[.055,.083]].map(([x,y])=>[side*x*.88,y]);
    shape(spine,wing,dark,[0,.012,-.202],[0,side*-.06,0],.014);
    const inset=wing.map(([x,y])=>[side*.111+(x-side*.111)*.88,.013+(y-.013)*.86]);
    shape(spine,inset,steel,[0,.012,-.222],[0,side*-.06,0],.012);
    // A separate inset facet interrupts the wide plate like the reference's
    // diagonal shoulder-to-sternum bevel, without a floating overlay.
    shape(spine,[[side*.075,.080],[side*.097,.113],[side*.173,.095],
      [side*.191,.047],[side*.137,.062]],graphite,[0,.012,-.234],[0,side*-.06,0],.003);
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
    block(spine,.062-j*.005,.005,.006,black,0,.048-j*.029,-.296);
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
      [side*.250,1.510,-.015]);
    shoulder.name='Shadow V6 / épaule '+sideName;
    shoulder.scale.set(blue?.88:.82,.88,.88);
    shape(shoulder,[[-.090,-.068],[-.096,.014],[-.047,.084],
      [.020,.096],[.094,.018],[.073,-.080]],graphite,
      [0,0,-.021],[.17,side*.17,side*.17],.011);
    shape(shoulder,[[-.066,-.036],[-.064,.017],[-.016,.056],
      [.029,.053],[.063,.002],[.046,-.044]],steel,
      [0,.009,-.035],[.17,side*.12,side*.12],.004);
    path(shoulder,[[-.047,.050,-.041],[-.013,.065,-.042],
      [.038,.045,-.040]],light,.0055);
    const cap=part(shoulder,facetHull([[-.078,.074,.060,.013],
      [-.020,.098,.080,.013],[.043,.080,.070,.013],[.081,.034,.032,.013]],12),dark);
    cap.position.z=.031;
    path(shoulder,[[-.049,.058,.084],[-.012,.083,.091],[.039,.062,.083]],light,.005);
    // Le dernier bord entre cuirasse et articulation reste noir, non fluorescent.
    path(shoulder,[[-.052,-.035,-.045],[.051,-.035,-.045]],dark,.003);
  }
  // Place each hard-surface shell in the limb's anatomical frame; bind it to
  // that bone, leaving the elbow, knee and wrist flexible during animation.
  const limbGroups=[];
  function limbShell(side,start,end,offset){
    const bone=model.actor.bone(side+start),next=model.actor.bone(side+end);
    model.root.updateMatrixWorld(true);
    const a=model.root.worldToLocal(bone.getWorldPosition(new T.Vector3()));
    const b=model.root.worldToLocal(next.getWorldPosition(new T.Vector3()));
    const y=a.clone().sub(b).normalize(),z=new T.Vector3(0,0,1);
    z.addScaledVector(y,-z.dot(y)).normalize();
    const x=y.clone().cross(z).normalize();
    const center=a.clone().lerp(b,.5).addScaledVector(z,-offset);
    const group=boneAnchor(bone,center.toArray());
    group.quaternion.multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)));
    group.name='Shadow / '+side+' '+start;limbGroups.push(group);return group;
  }
  const shield=[[-.048,-.110],[.036,-.117],[.066,-.033],[.062,.074],
    [.026,.107],[-.042,.098],[-.068,.038],[-.060,-.051]];
  function shieldLayer(group,outline,material,z,scale=1){
    return shape(group,outline.map(([x,y])=>[x*scale,y*scale]),material,[0,0,z],[0,0,0],.014);
  }
  for(const side of ['Left','Right']){
    const sign=side==='Left'?-1:1;
    const upper=limbShell(side,'Arm','ForeArm',.064);
    shieldLayer(upper,shield,dark,-.006,.84);
    shieldLayer(upper,shield,dark,.129,.90);
    shieldLayer(upper,shield,graphite,-.022,.70);
    path(upper,[[sign*.037,.062,-.031],[sign*.043,-.017,-.031]],dim,.003);
    const fore=limbShell(side,'ForeArm','Hand',.067);
    fore.scale.set(.90,1,.91);
    part(fore,facetHull([[-.108,.035,.035,.067],[-.074,.049,.046,.067],
      [.018,.061,.055,.067],[.075,.049,.045,.067],[.095,.038,.036,.067]],12),dark);
    shieldLayer(fore,shield,dark,0,1.04);
    shieldLayer(fore,shield,graphite,.126,.98);
    path(fore,[[sign*.046,.066,.147],[sign*.054,.008,.148],
      [sign*.037,-.055,.147]],light,.0035);
    shieldLayer(fore,shield,graphite,-.017,.87);
    shape(fore,[[-.028,-.085],[.014,-.079],[.038,.018],[.024,.075],
      [-.021,.062],[-.035,-.005]],steel,[0,0,-.034],[0,0,0],.008);
    path(fore,[[sign*.044,.061,-.039],[sign*.052,.009,-.040],
      [sign*.036,-.052,-.040]],light,.0038);
    for(const y of [-.072,.059]){
      block(fore,.050,.006,.009,black,0,y,-.058);
      for(const x of [-.029,.029])part(fore,new T.CylinderGeometry(.0035,.0035,.003,6),steel,
        [x,y,-.058],[Math.PI/2,0,0]);
    }

    const thigh=limbShell(side,'UpLeg','Leg',.101);
    part(thigh,facetHull([[-.134,.051,.054,.101],[-.080,.075,.066,.101],
      [.058,.087,.076,.101],[.119,.071,.065,.101]],12),dark);
    shieldLayer(thigh,shield,dark,0,1.24);
    shieldLayer(thigh,shield,graphite,.185,1.15);
    shieldLayer(thigh,shield,graphite,-.018,1.08);
    shape(thigh,[[-.042,-.105],[.017,-.114],[.048,-.023],
      [.039,.085],[-.025,.101],[-.051,.027]],steel,[0,0,-.034],[0,0,0],.009);
    path(thigh,[[sign*.060,.081,-.033],[sign*.065,-.035,-.033],
      [sign*.049,-.102,-.032]],light,.0036);
    const shin=limbShell(side,'Leg','Foot',.073);
    const greave=[[-.044,-.157],[.032,-.153],[.066,.042],[.050,.133],
      [.014,.155],[-.045,.135],[-.069,.043]];
    part(shin,facetHull([[-.159,.034,.035,.073],[-.095,.044,.044,.073],
      [.030,.066,.063,.073],[.110,.063,.060,.073],[.142,.044,.044,.073]],12),dark);
    shieldLayer(shin,greave,dark,0);
    shieldLayer(shin,greave,graphite,.140,.95);
    for(const edge of [-1,1])path(shin,[[edge*.052,.088,.158],
      [edge*.056,.026,.158],[edge*.036,-.083,.158]],light,.0035);
    shieldLayer(shin,greave,graphite,-.018,.86);
    shape(shin,[[-.025,-.129],[.011,-.132],[.042,.051],[.015,.126],
      [-.032,.098],[-.040,.017]],steel,[0,0,-.034],[0,0,0],.008);
    for(const edge of [-1,1])path(shin,[[edge*.055,.085,-.026],
      [edge*.060,.026,-.027],[edge*.039,-.080,-.027]],light,.0032);
    const kneeBone=model.actor.bone(side+'Leg');
    const kneePoint=model.root.worldToLocal(kneeBone.getWorldPosition(new T.Vector3()));
    const knee=boneAnchor(kneeBone,[kneePoint.x,kneePoint.y+.005,kneePoint.z-.074]);
    knee.name='Shadow / '+side+' Knee';limbGroups.push(knee);
    const kneecap=[[-.055,-.039],[.044,-.045],[.066,.011],[.033,.050],[-.038,.046],[-.064,.005]];
    shape(knee,kneecap,dark,[0,0,0],[0,0,0],.016);
    shape(knee,kneecap.map(([x,y])=>[x*.75,y*.70]),graphite,[0,0,-.023],[0,0,0],.006);
    const hipBone=model.actor.bone('Hips');
    const pouch=boneAnchor(hipBone,[sign*.194,1.021,-.062]);
    pouch.name='Shadow / '+side+' Hip';limbGroups.push(pouch);
    part(pouch,bevelBox(.071,.111,.045,.005),dark);
    block(pouch,.059,.014,.008,graphite,0,.043,-.027);
    block(pouch,.006,.035,.005,light,sign*.019,.003,-.028);
    const footBone=model.actor.bone(side+'Foot');
    const footPosition=model.root.worldToLocal(footBone.getWorldPosition(new T.Vector3()));
    const boot=boneAnchor(footBone,[footPosition.x,footPosition.y-.006,footPosition.z-.09]);
    boot.name='Shadow / segmented boot '+side;limbGroups.push(boot);
    part(boot,bevelBox(.130,.030,.310,.008),dark,[0,-.083,.010]);
    part(boot,facetHull([[-.071,.041,.055,.090],[-.020,.051,.063,.090],
      [.059,.048,.057,.090],[.074,.043,.048,.090]],16),dark);
    part(boot,bevelBox(.102,.061,.126,.008),graphite,[0,-.044,.101]);
    part(boot,bevelBox(.125,.065,.156,.009),graphite,[0,-.039,-.064]);
    shape(boot,[[-.060,-.025],[.060,-.025],[.065,.013],[.042,.033],
      [-.042,.033],[-.065,.013]],dark,[0,-.029,-.146],[0,0,0],.008);
    block(boot,.043,.013,.006,light,0,-.024,-.163);
    block(boot,.105,.034,.178,dark,0,-.012,-.022);
    for(let j=0;j<3;j++){
      block(boot,.099-j*.006,.022,.046,graphite,0,.016+j*.016,-.076+j*.047,[-.17,0,0]);
      block(boot,.056,.004,.004,black,0,.029+j*.016,-.081+j*.047);
    }
    block(boot,.042,.012,.006,light,0,.009,-.114);
    block(boot,.032,.009,.006,light,0,.075,.009);
  }
  // A tapered, articulated waist replaces the broad empty gap below the chest.
  // Plates bend with Spine/Hips; none crosses a hip or knee joint.
  const abdomen=boneAnchor(model.actor.bone('Spine'),[0,1.171,0]);
  abdomen.name='Shadow VII / abdomen articulé';
  for(let j=0;j<3;j++){
    const width=(blue?.145:.133)-j*.007,y=.081-j*.049;
    shape(abdomen,[[-width,.023],[width,.023],[width*.92,-.013],[.062,-.026],[-.062,-.026],[-width*.92,-.013]],
      j===0?graphite:dark,[0,y,-.117-j*.003],[.10,0,0],.005);
    block(abdomen,.072,.003,.003,black,0,y+.008,-.135-j*.003);
    for(const sign of [-1,1])block(abdomen,.010,.005,.004,steel,sign*(width-.017),y+.007,-.137-j*.003);
  }
  const belt=boneAnchor(model.hips,[0,1.040,0]);belt.name='Shadow VII / ceinture et bassin';
  part(belt,loft([[-.025,.182,.124],[.024,.181,.124]],32),black);
  shape(belt,[[-.046,-.023],[.046,-.023],[.054,.013],[.032,.029],[-.032,.029],[-.054,.013]],graphite,[0,0,-.134],[0,0,0],.004);
  block(belt,.032,.005,.004,light,0,.004,-.148);
  shape(belt,[[-.073,.015],[.073,.015],[.061,-.062],[0,-.102],[-.061,-.062]],dark,[0,-.063,-.105],[.12,0,0],.005);
  for(const sign of [-1,1]){
    const panel=[[.112,.008],[.182,.028],[.210,-.022],[.194,-.093],[.132,-.100],[.103,-.056]].map(([x,y])=>[sign*x,y]);
    shape(belt,panel,graphite,[0,-.023,-.048],[0,sign*-.48,0],.004);
    path(belt,[[sign*.170,-.057,-.077],[sign*.180,-.105,-.066]],dim,.002);
  }
  // Keep the detailed silhouette economical: one draw per material and bone,
  // rather than one draw for every bolt, vent and bevelled panel.
  for(const group of attachmentGroups){
    const batches=new Map();
    for(const mesh of [...group.children]){
      if(!mesh.isMesh)continue;
      mesh.updateMatrix();
      const baked=mesh.geometry.clone().applyMatrix4(mesh.matrix);
      if(group===spine&&!mesh.userData.fittedThorax){
        const p=baked.attributes.position;
        for(let i=0;i<p.count;i++){
          // Wrap the lateral wings around the rib cage, rather than leaving
          // two flat shields suspended in front of and behind the soldier.
          const wrap=Math.sqrt(Math.max(.16,1-(p.getX(i)/.245)**2));
          p.setZ(i,p.getZ(i)*.65*wrap);
        }
        baked.computeVertexNormals();
      }
      if(!batches.has(mesh.material))batches.set(mesh.material,[]);
      batches.get(mesh.material).push(baked);mesh.removeFromParent();
    }
    for(const [material,parts] of batches){
      part(group,merge(parts),material);
      for(const geometry of parts)geometry.dispose();
    }
  }
  // Centre pieces are authored from one half; paired limbs reuse the exact
  // same mesh reflected across the character's sagittal plane.
  for(const group of [helmet,spine])for(const mesh of group.children){
    mesh.geometry=symmetricGeometry(mesh.geometry);geometries.push(mesh.geometry);
  }
  const mirrorPairs=[];
  for(const right of attachmentGroups.filter(g=>g.name.includes('Right'))){
    const left=attachmentGroups.find(g=>g.name===right.name.replace('Right','Left'));
    if(!left)throw new Error('Missing mirrored armour attachment: '+right.name);
    for(const child of [...left.children])child.removeFromParent();
    mirrorAttachmentFrame(right,left,model.root);
    for(const mesh of right.children)part(left,reflectedGeometry(mesh.geometry),mesh.material);
    mirrorPairs.push({left,right,position:left.position.clone(),quaternion:left.quaternion.clone(),scale:left.scale.clone()});
  }
  model.root.updateMatrixWorld(true);
  const rendered=batchHeroArmor(model,attachmentGroups);
  for(let i=0;i<pose.length;i++){
    model.actor.bones[i].position.copy(pose[i].p);
    model.actor.bones[i].quaternion.copy(pose[i].q);
  }
  model.root.updateMatrixWorld(true);
  return {
    helmet,spine,limbGroups,mirrorPairs,batches:rendered.batches,bindings:rendered.bindings,triangles:rendered.triangles,revision:7,
    restoreAttachments(){
      for(const pair of mirrorPairs){
        pair.left.position.copy(pair.position);pair.left.quaternion.copy(pair.quaternion);pair.left.scale.copy(pair.scale);
      }
    },
    syncInspectionSymmetry(){
      for(const {right,left} of mirrorPairs)mirrorAttachmentFrame(right,left,model.root);
    },

    dispose(){
      rendered.dispose();
      for(const group of attachmentGroups)group.removeFromParent();
      for(const g of geometries)g.dispose();
      for(const g of filteredGeometries)g.dispose();
      filteredGeometries.clear();
      for(const m of disposables)m.dispose();
      finish.dispose();
    }
  };
}
