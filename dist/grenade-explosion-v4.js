// IX-09: adaptation 3D temps réel du prototype WebGPU V4 (feu + fumée + poussière + débris).
// Le canvas 2D de l'aperçu n'est pas superposé au HUD : vrais objets placés dans le monde.
// Aucun anneau, arc, torus ni cercle tournant après l'explosion.
export function createGrenadeExplosionV4(T,scene,{camera=null,maxBlasts=4,quality='normal'}={}){
 const CAP=Math.max(1,maxBlasts),smokeCount=quality==='low'?42:78,fireCount=quality==='low'?14:27,shardCount=quality==='low'?18:34;
 const fract=x=>x-Math.floor(x),rand=(i,k=1)=>fract(Math.sin(i*127.1+k*47.3)*43758.5453);
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-Math.pow(1-clamp(v),3);
 function makeTexture(kind,size=96){
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r=Math.hypot(nx,ny),a=Math.atan2(ny,nx);
   const wav=.08*Math.sin(a*5+1.4)+.048*Math.cos(a*9+.6)+.023*Math.sin(a*17+2.4);
   const n1=Math.sin(x*.19+2*Math.cos(y*.071)),n2=Math.sin(y*.153+Math.cos(x*.10)),n3=Math.sin((x+y)*.21);
   const o=(y*size+x)*4;
   if(kind==='smoke'){
    const den=clamp((1.02+wav-r)/.39)*clamp(.70+.14*n1+.11*n2+.08*n3);
    const v=87+Math.round(16*n1+10*n2);
    data[o]=v;data[o+1]=v+1;data[o+2]=v+3;data[o+3]=Math.round(195*den);
   }else{
    const edge=clamp((1.02+wav-r)/.54),heat=clamp(1-r*.95);
    data[o]=255;data[o+1]=Math.round(71+182*heat);data[o+2]=Math.round(9+206*heat*heat);
    data[o+3]=Math.round(228*edge*edge);
   }
  }
  const t=new T.DataTexture(data,size,size,T.RGBAFormat);
  t.magFilter=T.LinearFilter;t.minFilter=T.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
 }
 const smokeMap=makeTexture('smoke'),fireMap=makeTexture('fire');
 const quad=new T.PlaneGeometry(1,1),shardGeo=new T.TetrahedronGeometry(.09);
 const smokeMat=new T.MeshBasicMaterial({map:smokeMap,transparent:true,opacity:.79,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const fireMat=new T.MeshBasicMaterial({map:fireMap,transparent:true,opacity:.90,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
 const shardMat=new T.MeshBasicMaterial({color:0xffc78a,transparent:true,opacity:.92,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const v=new T.Vector3(),s=new T.Vector3(),m=new T.Matrix4(),q=new T.Quaternion(),iq=new T.Quaternion();
 const blasts=[];
 function put(mesh,i,x,y,z,sx,sy,sz,angle=0,spin=false){
  v.set(x,y,z);s.set(Math.max(.0001,sx),Math.max(.0001,sy),Math.max(.0001,sz));
  if(spin)q.setFromAxisAngle(new T.Vector3(0,1,0),angle);
  else if(camera)q.copy(camera.quaternion);
  else q.identity();
  m.compose(v,q,s);mesh.setMatrixAt(i,m);
 }
 function spawn(at){
  const g=kind=>{const num=kind==='smoke'?smokeCount:kind==='fire'?fireCount:shardCount;
   const mesh=new T.InstancedMesh(kind==='shards'?shardGeo:quad,kind==='smoke'?smokeMat:kind==='fire'?fireMat:shardMat,num);
   mesh.name='IX-09 · '+(kind==='smoke'?'fumée volumétrique':kind==='fire'?'boule de feu': 'débris balistiques');
   mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.renderOrder=kind==='fire'?8:kind==='shards'?9:10;return mesh;};
  const b={smoke:g('smoke'),fire:g('fire'),shards:g('shards'),age:0,position:{x:at.x||0,y:at.y||0,z:at.z||0},radius:at.radius||5.5};
  scene.add(b.smoke,b.fire,b.shards);blasts.push(b);renderOne(b);
  while(blasts.length>CAP)drop(blasts.shift());
  return b;
 }
 function renderOne(b){
  const time=b.age,center=b.position,originY=center.y;
  for(let i=0;i<smokeCount;i++){
   const delay=.04+rand(i,9)*.95,age=time-delay,life=2.3+rand(i,11)*1.8;
   if(age<=0||age>=life){put(b.smoke,i,0,-100,0,.0001,.0001,.0001);continue;}
   const u=age/life,birth=clamp(age/.27),fade=(1-u)**.8;
   const a=rand(i,1)*Math.PI*2,rad=(.20+rand(i,2)*1.6)*(.25+.90*u);
   const drift=(rand(i,3)-.5)*.90*u;
   const x=center.x+Math.cos(a)*rad+drift,z=center.z+Math.sin(a)*rad+Math.sin(u*8+i*1.4)*.08;
   const y=originY+.12+.65*Math.pow(u,.78)+age*.48+Math.sin(i*2.3+u*5)*.16;
   const scale=(.30+rand(i,4)*.38)*(1+2.35*u)*birth*fade;
   put(b.smoke,i,x,y,z,scale*1.65,scale*1.47,1);
  }
  for(let i=0;i<fireCount;i++){
   const life=.6+rand(i,20)*.60,u=time/life;
   if(u>=1){put(b.fire,i,0,-100,0,.0001,.0001,.0001);continue;}
   const angle=rand(i,22)*Math.PI*2,rad=(.12+rand(i,23)*.90)*ease(u);
   const lift=.07+u*(.28+rand(i,24)*.5);
   const size=(.38+rand(i,25)*.46)*(1+.72*ease(u))*Math.min(1,time/.065)*(1-u)**.75;
   put(b.fire,i,center.x+Math.cos(angle)*rad,originY+lift,center.z+Math.sin(angle)*rad,size*2.0,size*2.08,1);
  }
  for(let i=0;i<shardCount;i++){
   const delay=rand(i,30)*.075,age=time-delay,life=.75+rand(i,31)*.70;
   if(age<=0||age>=life){put(b.shards,i,0,-100,0,.0001,.0001,.0001,0,true);continue;}
   const a=rand(i,32)*Math.PI*2,speed=3.0+rand(i,33)*6.2;
   const rad=speed*age,fade=1-age/life,x=center.x+Math.cos(a)*rad,z=center.z+Math.sin(a)*rad;
   const y=Math.max(.04,originY+.30+(.8+rand(i,34)*4.2)*age-5.2*age*age);
   put(b.shards,i,x,y,z,.35*fade,.90*fade,.35*fade,a+age*9,true);
  }
  for(const mesh of [b.smoke,b.fire,b.shards])mesh.instanceMatrix.needsUpdate=true;
 }
 function drop(b){if(b)scene.remove(b.smoke,b.fire,b.shards);}
 function update(dt){for(let i=blasts.length-1;i>=0;i--){const b=blasts[i];b.age+=Math.max(0,dt||0);
   if(b.age>=4.5){drop(b);blasts.splice(i,1);}else renderOne(b);
 }}
 function dispose(){for(const b of blasts)drop(b);blasts.length=0;quad.dispose();shardGeo.dispose();smokeMat.dispose();fireMat.dispose();shardMat.dispose();smokeMap.dispose();fireMap.dispose();}
 return {spawn,update,dispose,stats:()=>({active:blasts.length,draws:blasts.length*3,smokePerBlast:smokeCount,firePerBlast:fireCount})};
}
