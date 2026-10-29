import {Assembly,merge,matrix,bake} from './geo.js';

// Original, solid phase-sphere shells. +Z is the optical face. The four/six
// rigid petals share one small skeleton, so detail does not multiply draws.
export function createCompanionModel(T,root,defensive=true){
 const color=defensive?0xff65b1:0x57baff,name=defensive?'Gaby':'Cara',count=defensive?4:6;
 const steel=new T.MeshStandardMaterial({color:0x7e93a4,metalness:.88,roughness:.3});
 const shell=new T.MeshStandardMaterial({color:defensive?0xc0c4cc:0x354655,metalness:.76,roughness:.32});
 const dark=new T.MeshStandardMaterial({color:0x101923,metalness:.55,roughness:.48});
 const glow=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.75,metalness:.35,roughness:.3});
 const lens=new T.MeshStandardMaterial({color:defensive?0x471f3b:0x12384f,emissive:color,emissiveIntensity:.18,metalness:.75,roughness:.13});
 const materials=[steel,shell,dark,glow,lens],owned=new Set(),meshes=[];
 const chassis=new Assembly(),gyroArt=new Assembly(),panelGroups=new Map();
 const up=new T.Vector3(0,1,0),axis=new T.Vector3(0,0,1),tmp=new T.Vector3();
 const sphere=(theta,phi,r)=>new T.Vector3(Math.sin(phi)*Math.sin(theta)*r,Math.cos(phi)*Math.sin(theta)*r,Math.cos(theta)*r);
 const widthAt=theta=>{const v=(theta-.62)/1.98;return defensive?.70+.30*Math.sin(Math.PI*v):v<.22?.68+v/.22*.32:v>.76?1-(v-.76)/.24*.4:1;};
 function arc(r,t0,t1,phi,tube=.002,followEdge=false){
  const points=Array.from({length:13},(_,i)=>{const theta=t0+(t1-t0)*i/12;return sphere(theta,phi*(followEdge?widthAt(theta):1),r);});
  return new T.TubeGeometry(new T.CatmullRomCurve3(points),24,tube,6,false);
 }
 function disk(art,mat,r,depth,z){art.add(new T.CylinderGeometry(r,r,depth,32),mat,matrix([0,0,z],[Math.PI/2,0,0]));}
 function torus(art,mat,r,tube,z=0,start=0,length=Math.PI*2){art.add(new T.TorusGeometry(r,tube,8,48,length),mat,matrix([0,0,z],[0,0,start]));}
 function bolt(art,p){
  const normal=p.clone().normalize(),q=new T.Quaternion().setFromUnitVectors(up,normal);
  art.add(new T.CylinderGeometry(.0032,.0032,.002,6),steel,new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)));
 }
 function patch(r,width){
  const rows=defensive?18:12,cols=defensive?10:4,pos=[],uv=[],indices=[];
  for(let side=0;side<2;side++)for(let j=0;j<=rows;j++){
   const v=j/rows,theta=.62+v*1.98;
   const taper=widthAt(theta);
   for(let i=0;i<=cols;i++){
    const p=sphere(theta,(i/cols-.5)*width*taper,r-side*.006);
    pos.push(...p);uv.push(i/cols,v);
    if(j&&i){const a=side*(rows+1)*(cols+1)+j*(cols+1)+i,b=a-cols-1;
     if(!side)indices.push(a,a-1,b,b,a-1,b-1);else indices.push(a,b,a-1,b,b-1,a-1);
    }
   }
  }
  const n=(rows+1)*(cols+1),edge=[];
  for(let i=0;i<=cols;i++)edge.push(i);
  for(let j=1;j<=rows;j++)edge.push(j*(cols+1)+cols);
  for(let i=cols-1;i>=0;i--)edge.push(rows*(cols+1)+i);
  for(let j=rows-1;j>0;j--)edge.push(j*(cols+1));
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+n,b,b+n,a+n);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 // The dark inner sphere, machined ribs and rear heat exchanger remain visible
 // through real gaps; the seam is not painted onto an unbroken ball.
 chassis.add(new T.SphereGeometry(.122,24,16),dark);
 for(let i=0;i<count;i++)chassis.add(arc(.128,.58,2.6,i*Math.PI*2/count,.004),steel);
 disk(chassis,dark,.073,.017,-.119);torus(chassis,steel,.069,.005,-.125);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  chassis.box(steel,[.004,.034,.012],[Math.sin(a)*.048,Math.cos(a)*.048,-.132],[0,0,-a],.001);
 }
 disk(chassis,dark,.030,.007,-.136);torus(chassis,glow,.023,.002,-.140);
 // Recessed optic, opaque polished glass, physical iris, protective brow.
 disk(chassis,dark,.071,.019,.111);torus(chassis,steel,.067,.005,.121);
 torus(chassis,dark,.056,.006,.126);torus(chassis,glow,.048,.0025,.131);
 chassis.add(new T.SphereGeometry(1,24,12),lens,matrix([0,0,.126],[0,0,0],[.046,.046,.014]));
 const iris=defensive?8:6;
 for(let i=0;i<iris;i++){
  const a=i*Math.PI*2/iris;
  chassis.box(dark,[.008,.019,.0025],[Math.sin(a)*.032,Math.cos(a)*.032,.139],[0,0,-a+.36],.001);
 }
 const core=new T.Mesh(new T.SphereGeometry(defensive?.017:.015,16,10),glow);core.name=name+' / phase pupil';core.position.z=.144;core.scale.z=.38;root.add(core);owned.add(core.geometry);meshes.push(core);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3;
  torus(chassis,steel,.081,.005,.098,a+.16,defensive?1.45:.85);
 }
 // Petals have thickness, a recessed lining, hinge heads, strip lights and
 // fasteners. They open radially and pivot about their real mounting points.
 const width=Math.PI*2/count-(defensive?.15:.12),sector=new Assembly();
 sector.add(patch(defensive?.151:.148,width),shell);
 sector.add(arc(.153,.78,2.40,-width*.43,.0018,true),steel);
 sector.add(arc(.153,.78,2.40,width*.43,.0018,true),steel);
 sector.add(arc(.154,1.08,1.63,-width*.32,.0017),glow);
 sector.add(arc(.154,1.08,1.63,width*.32,.0017),glow);
 for(const theta of [.91,2.23])for(const phi of [-width*.31,width*.31])bolt(sector,sphere(theta,phi,.153));
 // Small inset cooling slots and a three-bar status code on each outer plate.
 for(let i=0;i<3;i++){
  const theta=1.89+i*.065,p=sphere(theta,0,.152),q=new T.Quaternion().setFromUnitVectors(axis,p.clone().normalize());
  sector.add(new T.BoxGeometry(defensive?.027:.018,.003,.002),dark,new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)));
 }
 const bones=[],rests=[];
 for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count,rotate=new T.Matrix4().makeRotationZ(-a),bone=new T.Bone();
  bone.name=name+' / shell hinge '+(i+1);bone.position.set(Math.sin(a)*.083,Math.cos(a)*.083,.015);root.add(bone);bones.push(bone);rests.push(bone.position.clone());
  for(const item of sector.items){
   const g=bake(item.geometry,rotate);owned.add(g);
   if(!panelGroups.has(item.material))panelGroups.set(item.material,[]);
   panelGroups.get(item.material).push({g,bone:i});
  }
 }
 root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skeleton.calculateInverses();
 for(const [material,parts] of panelGroups){
  const geometry=merge(parts.map(p=>p.g)),n=geometry.attributes.position.count,skinIndex=new Uint16Array(n*4),skinWeight=new Float32Array(n*4);let at=0;
  for(const part of parts)for(let i=0;i<part.g.attributes.position.count;i++){skinIndex[at*4]=part.bone;skinWeight[at*4]=1;at++;}
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name+' / articulated shell / '+materials.indexOf(material);mesh.frustumCulled=false;root.add(mesh);mesh.bind(skeleton);owned.add(geometry);meshes.push(mesh);
 }
 const gyro=new T.Group();gyro.name=name+' / orbital stabilizer';gyro.rotation.x=defensive?.65:1.0;root.add(gyro);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3;
  torus(gyroArt,steel,.173,.0035,0,a,1.78);
  torus(gyroArt,glow,.173,.002,0,a+.24,.34);
 }
 for(const [art,parent,label]of [[chassis,root,'chassis'],[gyroArt,gyro,'stabilizer']]){
  art.build(parent);for(const mesh of art.meshes){mesh.name=name+' / '+label+' / '+materials.indexOf(mesh.material);owned.add(mesh.geometry);meshes.push(mesh);}
 }
 for(const art of [sector,chassis,gyroArt])for(const item of art.items)owned.add(item.geometry);
 // Temporary per-petal pieces are no longer required after rigid skin batching.
 const live=new Set(meshes.map(m=>m.geometry));for(const g of owned)if(!live.has(g)){g.dispose();owned.delete(g);}
 let time=0,opening=0,flash=0,disposed=false;
 function update(dt,{pulse=0,dialogue=false}={}){
  if(disposed||dt<=0)return;dt=Math.min(.05,dt);time+=dt;flash=Math.max(0,flash-dt*1.8);
  const activity=Math.max(pulse,flash),desired=.10+.72*activity+(dialogue?.05*(1+Math.sin(time*7)):0);
  opening+=(desired-opening)*(1-Math.exp(-dt*9));
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,b=bones[i],breath=Math.sin(time*1.7+i*.4)*.0008;
   b.position.copy(rests[i]).add(tmp.set(Math.sin(a),Math.cos(a),0).multiplyScalar(opening*.020+breath));
   b.quaternion.setFromAxisAngle(tmp.set(Math.cos(a),-Math.sin(a),0),-opening*(defensive?.16:.23));
  }
  gyro.rotation.z+=dt*(defensive?.24:.38)*(1+activity*.8);gyro.rotation.y=Math.sin(time*.65)*.09;
  core.scale.set(1+activity*.22,1+activity*.22,.38);glow.emissiveIntensity=.75+activity*1.15+Math.sin(time*2)*.05;
  lens.emissiveIntensity=.18+activity*.12;
 }
 function stats(){let triangles=0;for(const mesh of meshes)triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;
  return {name,revision:'phase-shell-v2',petals:count,bones:count,draws:meshes.length,triangles,opening};}
 return {update,react(){flash=1;},stats,core,skeleton,
  reset(){time=opening=flash=0;for(let i=0;i<count;i++){bones[i].position.copy(rests[i]);bones[i].quaternion.identity();}gyro.rotation.set(defensive?.65:1,0,0);core.scale.set(1,1,.38);glow.emissiveIntensity=.75;lens.emissiveIntensity=.18;},
  dispose(){if(disposed)return;disposed=true;for(const g of owned)g.dispose();for(const m of materials)m.dispose();skeleton.dispose();}
 };
}
