import * as T from './vendor/three.webgpu.min.js';
import { Assembly, bevelBox, limb, ball, matrix, along, loft, armorPanel, merge } from './geo.js';

// A gloved right hand closed around a pistol grip, modelled in the weapon's own frame: the origin is the centre
// of the grip, -z points down the barrel, +y is up. A left hand is the same model mirrored. The palm rests on the
// back strap and right panel, three fingers wrap the front strap and end on the left panel, the index lies on the
// trigger and the thumb runs forward along the left panel, exactly where a real hand holds a handgun.
export const GRIP = Object.freeze({ halfWidth: .018, halfDepth: .0235, wrist: [.03, .052, .098], forearm: [.1, -.3, .95] });

// The soft glove is a continuous, tapered skin over MCP/PIP/DIP joints. A single
// shared geometry per material avoids a draw call for every tiny phalanx.
// Bone transforms belong to each glove instance, including mirrored left hands.
const DIGITS = Object.freeze([
  {name:'middle',r:.0106,points:[[.034,0,-.005],[.026,0,-.031],[-.010,0,-.035],[-.029,0,-.007]]},
  {name:'ring',r:.0100,points:[[.034,-.0255,-.004],[.024,-.0255,-.029],[-.010,-.0255,-.032],[-.029,-.0255,-.006]]},
  {name:'little',r:.0085,points:[[.032,-.049,-.001],[.023,-.049,-.024],[-.007,-.049,-.029],[-.026,-.049,-.004]]},
  {name:'index',r:.0095,points:[[.031,.044,-.009],[.026,.043,-.031],[.009,.036,-.050],[-.005,.032,-.042]]},
  {name:'thumb',r:.0114,points:[[.020,.047,.038],[-.002,.052,.024],[-.025,.050,.000],[-.027,.048,-.041]]}
]);
let digitTemplate;
function fingerSkin(spec,firstBone){
  const points=spec.points.map(p=>new T.Vector3(...p)),curve=new T.CatmullRomCurve3(points,false,'centripetal');
  const radial=10,rows=24,position=[],uv=[],indices=[],weights=[],bones=[];
  const axis=new T.Vector3(0,1,0),normal=new T.Vector3(),cross=new T.Vector3();
  for(let row=0;row<=rows;row++){
    const t=row/rows,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
    cross.crossVectors(axis,tangent).normalize();normal.crossVectors(tangent,cross).normalize();
    const endRound=t>.9?Math.sqrt(Math.max(.002,1-((t-.9)/.1)**2)):1;
    const knuckle=Math.exp(-(((t-.333)/.055)**2))*.09+Math.exp(-(((t-.666)/.052)**2))*.065;
    const radius=spec.r*(1-t*.22+knuckle)*endRound;
    // Blend across flexion creases so the finger never splits open at a joint.
    let bone=0,other=0,weight=0;
    if(t>.27&&t<.40){bone=0;other=1;weight=(t-.27)/.13;}
    else if(t>=.40&&t<=.60){bone=other=1;}
    else if(t>.60&&t<.73){bone=1;other=2;weight=(t-.60)/.13;}
    else if(t>=.73){bone=other=2;}
    for(let i=0;i<=radial;i++){
      const a=i/radial*Math.PI*2,side=Math.cos(a)*radius,pad=Math.sin(a)*radius*.82;
      position.push(center.x+cross.x*side+normal.x*pad,center.y+cross.y*side+normal.y*pad,center.z+cross.z*side+normal.z*pad);
      uv.push(i/radial,t);bones.push(firstBone+bone,firstBone+other,0,0);weights.push(1-weight,weight,0,0);
      if(row&&i<radial){const at=row*(radial+1)+i,prev=at-radial-1;indices.push(prev,prev+1,at,prev+1,at+1,at);}
    }
  }
  for(const [row,reverse] of [[0,true],[rows,false]]){
    const center=position.length/3,p=points[row?3:0],bone=firstBone+(row?2:0);
    position.push(p.x,p.y,p.z);uv.push(.5,.5);bones.push(bone,0,0,0);weights.push(1,0,0,0);
    for(let i=0;i<radial;i++){const a=row*(radial+1)+i;indices.push(center,reverse?a+1:a,reverse?a:a+1);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const normals=g.attributes.normal;
  for(let row=0;row<=rows;row++){
    const first=row*(radial+1),last=first+radial,n=new T.Vector3().fromBufferAttribute(normals,first).add(new T.Vector3().fromBufferAttribute(normals,last)).normalize();
    normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(bones,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  return g.toNonIndexed();
}
function rigParts(){
  if(digitTemplate)return digitTemplate;
  const batches={fabric:[],plate:[],trim:[]};
  function attach(kind,geometry,bone){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    if(!g.attributes.skinIndex){
      const count=g.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
      for(let i=0;i<count;i++){indices[i*4]=bone;weights[i*4]=1;}
      g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    }
    batches[kind].push(g);
  }
  DIGITS.forEach((spec,i)=>{
    const bone=1+i*3;attach('fabric',fingerSkin(spec,bone),bone);
    for(let segment=0;segment<3;segment++){
      const a=new T.Vector3(...spec.points[segment]),b=new T.Vector3(...spec.points[segment+1]),delta=b.clone().sub(a),mid=a.clone().lerp(b,.45);
      if(segment<2){
        mid.y+=spec.r*.70;
        const shell=ball(mid.toArray(),[spec.r*.69,.0028,delta.length()*.29],[10,6]);
        const turn=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());
        shell.translate(-mid.x,-mid.y,-mid.z).applyQuaternion(turn).translate(mid.x,mid.y,mid.z);
        attach('plate',shell,bone+segment);
      }
      for(const u of [.18,.25]){
        const p=a.clone().lerp(b,u);p.y+=spec.r*.8;
        const d=delta.clone().normalize(),edge=new T.Vector3(-d.z,0,d.x).multiplyScalar(spec.r*.58);
        attach('trim',limb(p.clone().sub(edge).toArray(),p.clone().add(edge).toArray(),.00065,.00065,5),bone+segment);
      }
    }
  });
  digitTemplate=Object.entries(batches).map(([material,parts])=>{
    const geometry=merge(parts),count=geometry.attributes.position.count,bones=new Uint16Array(count*4),weights=new Float32Array(count*4);let offset=0;
    for(const part of parts){bones.set(part.attributes.skinIndex.array,offset*4);weights.set(part.attributes.skinWeight.array,offset*4);offset+=part.attributes.position.count;}
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(bones,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.computeBoundingSphere();geometry.computeBoundingBox();
    return {material,geometry};
  });
  return digitTemplate;
}

function palmSurface(){
  const rows=[[-.018,.034,-.004,.010,.048],[.002,.040,-.004,.023,.057],[.026,.042,.007,.027,.057],[.050,.040,.024,.027,.049],[.078,.034,.041,.024,.032],[.103,.030,.052,.025,.025]];
  const g=loft(rows.map(([z,x,y,rx,ry])=>[z,rx,ry]),20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const z=p.getY(i),row=rows.reduce((a,b)=>Math.abs(b[0]-z)<Math.abs(a[0]-z)?b:a);
    p.setXYZ(i,p.getX(i)+row[1],p.getZ(i)+row[2],z);
  }
  const idx=g.index;for(let i=0;i<idx.count;i+=3){const b=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,b);}
  g.computeVertexNormals();return g;
}

// materials: { fabric, plate, trim, glow, accent, metal }
export function createGloveAssembly(m, { sleeve = true, forearm = GRIP.forearm } = {}) {
  const a = new Assembly();
  a.add(palmSurface(),m.fabric);
  // Thenar eminence, little-finger heel and thumb saddle blend into a contoured palm.
  a.ellipsoid(m.fabric,[.009,-.018,.044],[.024,.044,.022],[.08,.08,0]);
  a.ellipsoid(m.fabric,[.013,.039,.049],[.025,.024,.034],[0,-.25,.10]);
  a.ellipsoid(m.fabric,[.027,-.031,.034],[.021,.031,.030],[0,.10,.06]);
  for(let i=0;i<4;i++){
    const y=.044-i*.025;
    a.ellipsoid(m.plate,[.046,y,-.010],[.009,.0095,.012],[0,.28,0]);
    a.limb(m.fabric,[.058,y,.010],[.055,.022+(y-.005)*.48,.064],.0034,.0021);
    a.limb(m.trim,[.064,y*.64+.008,.025],[.059,.026+(y-.005)*.32,.061],.00075,.00065);
  }
  const shield=armorPanel([[-.021,-.033],[.017,-.035],[.027,-.020],[.024,.025],[.012,.036],[-.018,.031],[-.026,.009]],.0025,.0025);
  a.add(shield,m.plate,matrix([.066,.018,.040],[0,-Math.PI/2,.06]));
  a.box(m.trim,[.003,.037,.007],[.071,.020,.041],[0,-.06,.10],.0015);
  a.box(m.glow,[.002,.025,.002],[.073,.021,.041],[0,-.06,.10],.0005,false);
  a.ellipsoid(m.trim,[.058,-.011,.069],[.012,.018,.017],[.10,0,.12]);
  a.box(m.plate,[.007,.021,.015],[.068,-.009,.072],[.10,0,.12],.003);
  for(const z of [.077,.086,.095])a.add(new T.TorusGeometry(.024,.0011,5,20),m.trim,along([.031,.048,z],GRIP.forearm));
  if (sleeve) {
    const [wx, wy, wz] = GRIP.wrist, d = forearm, k = Math.hypot(...d);
    const at = t => [wx + d[0] / k * t, wy + d[1] / k * t, wz + d[2] / k * t];
    // Cuff, then a tapered sleeve with armoured plates. Plates appear with the gauntlet level.
    a.limb(m.fabric, at(-.012), at(.24), .027, .036);
    a.add(new T.TorusGeometry(.03, .0065, 8, 22), m.trim, along(at(.01), d), true);
    a.add(new T.TorusGeometry(.032, .0028, 6, 22), m.metal, along(at(-.012), d), true);
    a.add(new T.TorusGeometry(.0335, .004, 6, 22), m.glow, along(at(.028), d), false);
    a.add(bevelBox(.052, .016, .13, .006), m.plate, along([wx + d[0] / k * .12, wy + d[1] / k * .12 + .026, wz + d[2] / k * .12], d), true, 4);
    a.add(bevelBox(.04, .012, .09, .005), m.trim, along([wx + d[0] / k * .12, wy + d[1] / k * .12 + .036, wz + d[2] / k * .12], d), true, 4);
    a.add(bevelBox(.025, .005, .055, .002), m.accent, along([wx + d[0] / k * .125, wy + d[1] / k * .125 + .0425, wz + d[2] / k * .125], d), false, 4);
    a.add(bevelBox(.062, .01, .03, .004), m.metal, along(at(.2), d), true, 8);
  }
  return a;
}

// A ready-to-use glove group at the origin of its weapon. `mirror` makes the left hand.
export function createGlove(m, { mirror = false, sleeve = true, forearm } = {}) {
  const group = new T.Group(), assembly = createGloveAssembly(m, { sleeve, forearm });
  const basePosition = new T.Vector3();
  assembly.mount(group); group.userData.setLevel = level => assembly.setLevel(level); group.userData.assembly = assembly;
  group.userData.setBasePosition = position => { basePosition.set(...position); group.position.copy(basePosition); };
  const palm=new T.Bone();palm.name='Palm';group.add(palm);
  const bones=[palm],digits=[];
  DIGITS.forEach(spec=>{
    const chain=[];
    for(let i=0;i<3;i++){
      const bone=new T.Bone();bone.name=spec.name+'-'+['MCP','PIP','DIP'][i];
      bone.position.set(...spec.points[i]);if(i)bone.position.sub(new T.Vector3(...spec.points[i-1]));
      (i?chain[i-1]:palm).add(bone);chain.push(bone);bones.push(bone);
    }
    chain[0].userData.knuckle=chain[1];chain[0].userData.tipJoint=chain[2];digits.push(chain[0]);
  });
  group.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);
  for(const part of rigParts()){
    const mesh=new T.SkinnedMesh(part.geometry,m[part.material]);mesh.name='Glove '+part.material;group.add(mesh);mesh.bind(skeleton,new T.Matrix4());mesh.castShadow=mesh.receiveShadow=true;
    mesh.boundingSphere=part.geometry.boundingSphere.clone();mesh.boundingSphere.radius+=.08;mesh.boundingBox=part.geometry.boundingBox.clone().expandByScalar(.075);
  }
  group.userData.skeleton=skeleton;
  group.userData.digitBones=digits.map(d=>[d,d.userData.knuckle,d.userData.tipJoint]);
  const sign=mirror?-1:1, pose={trigger:0,grip:0,reload:0,relax:0};group.userData.pose=pose;
  group.userData.animate = ({trigger=0,grip=0,reload=0,relax=0}={},dt=.016,handedness=1) => {
    const blend=1-Math.exp(-Math.max(0,dt)*24);
    for(const key of ['trigger','grip','reload','relax'])pose[key]+=(Math.max(0,Math.min(1,Number({trigger,grip,reload,relax}[key])||0))-pose[key])*blend;
    const {trigger:t,grip:g,reload:r,relax:open}=pose;
    const curlSign=sign*handedness;
    // Mirroring the hierarchy already reverses flexion. A second sign on the
    // bones would bend the left fingers away from their foregrip.
    for(let i=0;i<3;i++){
      const closure=g*(1-i*.08),finger=digits[i],middle=finger.userData.knuckle,tip=finger.userData.tipJoint;
      finger.rotation.set(-.045-closure*.075,-.025+closure*.055,(i-1)*.012);
      middle.rotation.set(-.10-closure*.05,.035+closure*.10,0);
      tip.rotation.set(-.045-closure*.055,.018+closure*.08,0);
      finger.rotation.y-=r*.22;middle.rotation.y-=r*.30;tip.rotation.y-=r*.18;
      finger.rotation.y-=open*.10;middle.rotation.y-=open*.99;tip.rotation.y-=open*.98;
    }
    const index=digits[3],indexKnuckle=index.userData.knuckle,indexTip=index.userData.tipJoint;
    index.rotation.set(-.035-t*.025,-.025+t*.035,0);
    indexKnuckle.rotation.set(-.05-t*.34,-.02+t*.065,0);
    indexTip.rotation.set(-.02-t*.17,.015+t*.035,0);
    index.rotation.y-=open*.08;indexKnuckle.rotation.y-=open*.48;indexTip.rotation.y-=open*1.12;
    const thumb=digits[4],thumbKnuckle=thumb.userData.knuckle,thumbTip=thumb.userData.tipJoint;
    thumb.rotation.set(.025+g*.035,.015+g*.025-r*.09,0);
    thumbKnuckle.rotation.set(.055+g*.075,.025+g*.04-r*.12,0);
    thumbTip.rotation.set(.035+g*.055,.015+g*.025-r*.08,0);
    thumb.rotation.y+=open*.18;thumbKnuckle.rotation.y+=open*.1;thumbTip.rotation.y+=open*.24;
    group.rotation.z=curlSign*r*.09;
    group.position.set(basePosition.x,basePosition.y+r*.014,basePosition.z-r*.02);
  };
  group.userData.fingerJoints=digits.map(d=>d.userData.knuckle);
  let disposed=false;
  // Skeleton textures are private to a glove; finger buffers and materials are
  // shared by every hand. Repeated VR sessions must release only private data.
  group.userData.dispose=()=>{
    if(disposed)return;disposed=true;skeleton.dispose();
    for(const mesh of assembly.meshes)mesh.geometry.dispose();
    for(const item of assembly.items)item.geometry.dispose();
    assembly.meshes.length=assembly.items.length=0;
  };
  if (mirror) group.scale.x = -1;
  return group;
}
