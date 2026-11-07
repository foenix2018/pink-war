import {createNeonFixtures} from './neon-fixtures.js';
import {Assembly,matrix,bevelBox} from './geo.js';
import {segmentBox} from './game-logic.js';

// Visual dressing for the existing chapter. No collider, enemy or objective is added.
export const M01_SEARCHLIGHTS=Object.freeze([
 {at:[-24,19.8,74.1],to:[-43,.12,86]}, {at:[27,24.6,79.1],to:[7,.12,86]},
 {at:[-12.1,27.2,20],to:[1,.12,7]}, {at:[14.1,20.6,34],to:[0,.12,25]},
 {at:[-12,18.5,-46.9],to:[-3,.12,-29]}, {at:[29,12.6,-52.9],to:[17,.12,-40]},
 {at:[-95.8,5.8,43.6],to:[-89,.12,34]}, {at:[12.8,6.6,-66.8],to:[6,.12,-63.5]}
].map(d=>Object.freeze({at:Object.freeze(d.at),to:Object.freeze(d.to)})));
export function m01DuskWeight(day=.43){
 const v=Number.isFinite(day)?day:.43,t=Math.max(0,Math.min(1,(v-.48)/.44));
 return 1-t*t*(3-2*t);
}
export function m01Covered(eye,obstacles){
 return obstacles.some(b=>(b.y||0)>eye.y+.12&&b.height>0&&Math.abs(eye.x-b.x)<b.hx&&Math.abs(eye.z-b.z)<b.hz);
}
// Clip the visible cone and the light to the same surface that stops actual shots.
export function m01BeamEnd(origin,target,obstacles){
 let fraction=1;
 for(const o of obstacles){const t=segmentBox(origin,target,o);if(t!==null)fraction=Math.min(fraction,t);}
 return {x:origin.x+(target.x-origin.x)*fraction,y:origin.y+(target.y-origin.y)*fraction,z:origin.z+(target.z-origin.z)*fraction};
}
export function paintM01StormSky(c,w,h,photo,weight=1){
 c.clearRect(0,0,w,h);c.drawImage(photo,0,0,w,h);c.save();c.globalAlpha=weight;
 c.globalCompositeOperation='multiply';c.fillStyle='#544357';c.fillRect(0,0,w,h);
 c.globalCompositeOperation='source-over';const g=c.createLinearGradient(0,0,0,h);
 g.addColorStop(0,'rgba(17,14,30,.40)');g.addColorStop(.43,'rgba(65,30,56,.30)');
 g.addColorStop(.56,'rgba(131,52,87,.30)');g.addColorStop(1,'rgba(25,25,39,.08)');c.fillStyle=g;c.fillRect(0,0,w,h);c.restore();
}

export function createM01SiegeAmbiance(T,scene,{obstacles=[],performance=false}={}){
 const root=new T.Group();root.name='M01 / veilleurs ORDRE — ambiance de siège';scene.add(root);
 const owned=[],textures=[],a=new Assembly(),low=performance;
 const material=(color,roughness=.7,metalness=.3)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});owned.push(m);return m;};
 const steel=material(0x616875,.48,.68),dark=material(0x171d26,.68,.4),cloth=material(0x6e2946,.92,.02);
 cloth.side=T.DoubleSide;cloth.forceSinglePass=true;cloth.color.setHex(0xffffff);cloth.emissive.setHex(0x381020);cloth.emissiveIntensity=.25;
 const pink=new T.MeshBasicMaterial({color:0xff447f,toneMapped:false}),ivory=new T.MeshBasicMaterial({color:0xffd6a5,toneMapped:false}),blue=new T.MeshBasicMaterial({color:0xa7d9ff,toneMapped:false});owned.push(pink,ivory,blue);
 const neons=createNeonFixtures(T,root,{low,metal:steel,back:dark,distantThreshold:100});
 const box=(m,s,p,r=[0,0,0])=>{if(m===pink||m===ivory||m===blue){neons.panel(s,p,r,m.color.getHex());return;}const g=bevelBox(...s,.028,1);a.add(g,m,matrix(p,r),false);g.dispose();};
 const rod=(m,p,q,r=.04)=>{const u=new T.Vector3(...p),v=new T.Vector3(...q),d=v.clone().sub(u),g=new T.CylinderGeometry(r,r,d.length(),8);
  const transform=new T.Matrix4().compose(u.add(v).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),new T.Vector3(1,1,1));a.add(g,m,transform,false);g.dispose();};
 const canvas=(w,h,paint)=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;};
 const banner=canvas(256,512,(c,w,h)=>{c.fillStyle='#572238';c.fillRect(0,0,w,h);c.fillStyle='#c75b80';c.beginPath();c.moveTo(32,80);c.lineTo(224,80);c.lineTo(128,222);c.closePath();c.fill();c.fillStyle='#572238';c.beginPath();c.moveTo(73,101);c.lineTo(183,101);c.lineTo(128,176);c.closePath();c.fill();c.fillStyle='#c75b80';c.fillRect(121,159,14,75);c.font='bold 25px monospace';c.textAlign='center';c.fillText('ORDRE',128,295);c.font='12px monospace';c.fillText('VEILLE / VESPER',128,325);c.fillText('SECTEUR 07',128,350);
  for(let i=0;i<45;i++){c.fillStyle=`rgba(0,0,0,${.025+(i%4)*.015})`;c.fillRect((i*83)%w,0,1+(i%3),h);}});
 cloth.map=banner;
 const glow=canvas(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,.60)');g.addColorStop(.18,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const glowMat=new T.SpriteMaterial({map:glow,color:0xff487e,transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending});owned.push(glowMat);
 const halos=[];const halo=(p,size=3)=>{if(!glow)return;const o=new T.Sprite(glowMat);o.position.set(...p);o.scale.set(size,size,1);root.add(o);halos.push(o);};
 // Banners hang on existing solid facades, above windows and usable doors.
 const banners=[[-24,12.3,73.28,0,4.2,6.3],[27,15,78.28,0,4.8,7.6],[-12.72,19,20,Math.PI/2,3.8,6],
  [14.72,14,34,-Math.PI/2,3.6,6],[-12,11.5,-47.72,0,3.8,5.8],[29,8,-53.72,0,3.2,4.8]];
 for(const [x,y,z,yaw,w,h] of banners){
  const group=new T.Group();group.position.set(x,y,z);group.rotation.y=yaw;root.add(group);
  const g=new T.PlaneGeometry(w,h,4,8),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.06*Math.sin(p.getX(i)*4+p.getY(i)*2));g.computeVertexNormals();
  const mesh=new T.Mesh(g,cloth);group.add(mesh);
  const dx=Math.cos(yaw)*(w+.4)/2,dz=-Math.sin(yaw)*(w+.4)/2;
  rod(steel,[x-dx,y+h/2+.12,z-dz],[x+dx,y+h/2+.12,z+dz],.04);
 }
 // Subtle segmented emergency strips and brackets on technical facades.
 const lamps=[[-35.35,2.8,64.7,0],[-35.35,2.8,53.2,0],[-12.72,4.8,13,Math.PI/2],[-12.72,4.8,28,Math.PI/2],
  [14.72,4.5,29,-Math.PI/2],[14.72,4.5,40,-Math.PI/2],[-10,4.2,-47.72,0],[20,4.2,-53.72,0]];
 const practical=[];
 for(const [x,y,z,yaw] of lamps){const cos=Math.cos(yaw),sin=Math.sin(yaw);
  box(dark,[1.1,.28,.22],[x,y,z],[0,yaw,0]);box(steel,[1.24,.07,.29],[x,y+.15,z],[0,yaw,0]);
  box(pink,[.82,.10,.025],[x+sin*.125,y,z+cos*.125],[0,yaw,0]);
  const at=[x+sin*.4,y-.15,z+cos*.4];halo(at,3.2);practical.push({at,color:0xff397a,intensity:32,distance:15});
 }
 // Warm AEGIS lamps mark the starting court and the accessible archive entrance.
 for(const at of [[-95.5,3.5,31],[-81,3.5,42],[2,3.6,-65.8],[10,3.6,-65.8]]){
  box(dark,[.48,.65,.25],at);box(ivory,[.33,.43,.04],[at[0],at[1],at[2]+.16]);
  practical.push({at:[at[0],at[1],at[2]+.30],color:0xffca91,intensity:40,distance:12});
 }
 const beamMaterial=new T.MeshBasicMaterial({color:0xb8d3ff,transparent:true,opacity:.052,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});owned.push(beamMaterial);
 const alpha=canvas(128,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'black');g.addColorStop(.35,'#666');g.addColorStop(.65,'#666');g.addColorStop(1,'black');c.fillStyle=g;c.fillRect(0,0,w,h);});
 if(alpha){alpha.colorSpace=T.NoColorSpace;beamMaterial.alphaMap=alpha;}
 const cone=new T.ConeGeometry(1,1,low?14:22,1,true).translate(0,-.5,0),beams=[];
 for(const [i,d] of M01_SEARCHLIGHTS.entries()){
  const origin=new T.Vector3(...d.at),mesh=new T.Mesh(cone,beamMaterial);root.add(mesh);
  const mount=new T.Group();mount.position.copy(origin);root.add(mount);
  const lamp=new T.Mesh(bevelBox(.85,.50,.65,.06,1),steel);mount.add(lamp);
  const lens=new T.Mesh(new T.PlaneGeometry(.61,.30),blue);lens.position.z=.335;mount.add(lens);mount.lookAt(new T.Vector3(...d.to));
  rod(dark,[d.at[0],d.at[1]-.3,d.at[2]],[d.at[0],d.at[1]-1.2,d.at[2]],.08);
  halo(d.at,2.3);beams.push({origin,mesh,mount,d,phase:i*1.7,end:new T.Vector3()});
 }
 // Watch posts remain outside the playable map; the campaign keeps its existing openings.
 for(const [x,z,h] of [[-112,62,28],[108,56,33],[-28,113,30],[106,-55,32]]){
  box(dark,[5,h,5],[x,h/2-1,z]);box(steel,[7,.45,7],[x,h-1,z]);box(dark,[6,2,6],[x,h,z]);
  for(const side of [-1,1]){box(pink,[5.5,.65,.04],[x,h,z+side*3.02]);box(pink,[.04,.65,5.5],[x+side*3.02,h,z]);}
  rod(steel,[x,h+1,z],[x,h+5,z],.065);halo([x,h+5,z],2.4);
 }
 neons.build();a.build(root);for(const item of a.items)item.geometry.dispose();a.items.length=0;
 const puddles=new T.Group();puddles.name='Reflets humides extérieurs';root.add(puddles);
 const wet=material(0x2d3039,.2,.25),wetGeo=new T.CircleGeometry(1,low?18:28);
 const wetPos=wetGeo.attributes.position;for(let i=1;i<wetPos.count;i++){const f=.82+Math.sin(i*7.13)*.13;wetPos.setXY(i,wetPos.getX(i)*f,wetPos.getY(i)*f);}wetGeo.computeVertexNormals();
 wet.map=glow;wet.transparent=true;wet.opacity=.75;wet.depthWrite=false;
 const reflection=new T.MeshBasicMaterial({map:glow,color:0xea3f84,transparent:true,opacity:.22,depthWrite:false,blending:T.AdditiveBlending});owned.push(reflection);
 const reflectGeo=new T.PlaneGeometry(1,1);
 const pools=[[-47,87,2.4,3.8],[-40,85,2.1,3],[-52,78,1.6,3.2],[-33,84,2.4,2],[-6,83,2.1,4],[6,78,2,3],
  [0,55,2.1,3.3],[-2,31,1.8,4],[2,14,1.7,3],[0,-17,2,3.2],[14,-39,1.9,2.5],[-88,34,1.8,2.8],[5,-64,1.6,2.1]];
 const water=new T.InstancedMesh(wetGeo,wet,pools.length),reflections=new T.InstancedMesh(reflectGeo,reflection,pools.length);
 water.userData.noWorldShadow=reflections.userData.noWorldShadow=true;puddles.add(water,reflections);
 const poolMatrix=new T.Matrix4(),poolRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
 for(const [i,[x,z,sx,sz]] of pools.entries()){
  water.setMatrixAt(i,poolMatrix.compose(new T.Vector3(x,.018,z),poolRotation,new T.Vector3(sx,sz,1)));
  reflections.setMatrixAt(i,poolMatrix.compose(new T.Vector3(x,.021,z),poolRotation,new T.Vector3(sx*.8,sz*1.5,1)));
 }
 water.instanceMatrix.needsUpdate=reflections.instanceMatrix.needsUpdate=true;
 const air=new T.Group();air.name='Pluie et brume extérieures';root.add(air);
 const hazeMaterial=new T.SpriteMaterial({map:glow,color:0xa16b92,transparent:true,opacity:.15,depthWrite:false});owned.push(hazeMaterial);
 const haze=[];for(const [x,z,sx] of [[-45,88,25],[0,78,22],[0,36,18],[0,-12,18],[15,-42,18],[-89,35,15]]){
  const m=new T.Sprite(hazeMaterial);m.position.set(x,1.7,z);m.scale.set(sx,4.6,1);air.add(m);haze.push({m,x});}
 const count=low?240:700,rainPositions=new Float32Array(count*3),rainGeo=new T.BufferGeometry();
 for(let i=0;i<count;i++){const yard=i%3===0;rainPositions[i*3]=yard?-53+(i*1.17%30):-4+(i*.71%8);rainPositions[i*3+1]=(i*.67)%17;rainPositions[i*3+2]=yard?78+(i*1.3%15):-42+(i*1.37%120);}
 rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));const rainMaterial=new T.PointsMaterial({color:0xb5bccc,size:.026,transparent:true,opacity:.27,depthWrite:false});owned.push(rainMaterial);air.add(new T.Points(rainGeo,rainMaterial));
 const pointLights=Array.from({length:low?1:2},()=>{const light=new T.PointLight(0xff397a,0,15,1.6);root.add(light);return light;});
 const search=new T.SpotLight(0xbad7ff,0,85,.19,.75,1.4);root.add(search,search.target);search.castShadow=false;
 const down=new T.Vector3(0,-1,0),direction=new T.Vector3(),target=new T.Vector3();
 const sunTint=new T.Color(0xa6b9da),skyTint=new T.Color(0xc4b4cd),groundTint=new T.Color(0x34313f),fogTint=new T.Color(0x423546);
 let lastTime=null,skySource=null,environmentSource=null,skyCanvas=null,stormSky=null,stormReflection=null,lastWeight=-1,disposed=false,covered=false,weight=1;
 function lighting(atmosphere,renderer,day,eye){
  const k=m01DuskWeight(day);weight=k;
  if(atmosphere){const d=Math.max(0,Math.min(1,Number.isFinite(day)?day:.43));
   atmosphere.sun.intensity*=1+(((.63+d*.65)/(1.12+d*.55))-1)*k;
   atmosphere.ambient.intensity*=1+(((.94+d*.26)/(.51+d*.26))-1)*k;
   atmosphere.sun.color.setHex(0xffe3bb).lerp(sunTint,k);
   atmosphere.ambient.color.setHex(0xc2cdcf).lerp(skyTint,k);
   atmosphere.ambient.groundColor.setHex(0x34332c).lerp(groundTint,k);
  }
  if(renderer)renderer.toneMappingExposure=.84+.24*k;
  if(scene.fog?.isFog){scene.fog.color.setHex(0x747b79).lerp(fogTint,k);scene.fog.near=52-12*k;scene.fog.far=265-40*k;}
  if(!skySource&&scene.background?.isTexture&&scene.background.image&&typeof document!=='undefined'){
   skySource=scene.background;environmentSource=scene.environment;
   skyCanvas=document.createElement('canvas');skyCanvas.width=low?1024:2048;skyCanvas.height=skyCanvas.width/2;
   stormSky=new T.CanvasTexture(skyCanvas);stormSky.mapping=T.EquirectangularReflectionMapping;stormSky.colorSpace=T.SRGBColorSpace;
   const c=document.createElement('canvas');c.width=low?128:256;c.height=c.width/2;stormReflection=new T.CanvasTexture(c);stormReflection.mapping=T.EquirectangularReflectionMapping;stormReflection.colorSpace=T.SRGBColorSpace;
  }
  if(skySource){if(Math.abs(lastWeight-k)>.025||lastWeight<0){paintM01StormSky(skyCanvas.getContext('2d'),skyCanvas.width,skyCanvas.height,skySource.image,k);stormSky.needsUpdate=true;
    const c=stormReflection.image;c.getContext('2d').drawImage(skyCanvas,0,0,c.width,c.height);stormReflection.needsUpdate=true;lastWeight=k;}
   scene.background=stormSky;scene.environment=stormReflection;scene.backgroundIntensity=.68-.10*k;scene.environmentIntensity=.32+.08*k;
  }
 }
 function update(time,dt,camera,{atmosphere=null,renderer=null,day=.43}={}){
  if(disposed)return;const eye=camera.position||camera;dt=lastTime===null?0:Math.max(0,Math.min(.08,time-lastTime));lastTime=time;
  covered=m01Covered(eye,obstacles);lighting(atmosphere,renderer,day,eye);
  beamMaterial.opacity=.052*weight;hazeMaterial.opacity=.15*weight;reflection.opacity=.22*weight;glowMat.opacity=.5*weight;rainMaterial.opacity=.27*weight;
  air.visible=!covered&&weight>.03;
  for(const [i,b] of beams.entries()){
   target.set(b.d.to[0]+Math.sin(time*.13+b.phase)*3.2,b.d.to[1],b.d.to[2]+Math.cos(time*.11+b.phase)*2.1);
   const end=m01BeamEnd(b.origin,target,obstacles);b.end.set(end.x,end.y,end.z);direction.copy(b.end).sub(b.origin);const length=direction.length();
   b.mesh.visible=length>.1&&weight>.03;if(length>.001){b.mesh.position.copy(b.origin);b.mesh.quaternion.setFromUnitVectors(down,direction.normalize());b.mesh.scale.set(length*.075,length,length*.075);b.mount.lookAt(b.end);}
  }
  const distanceSquared=p=>(p.x-eye.x)**2+(p.y-eye.y)**2+(p.z-eye.z)**2;
  const score=p=>(p[0]-eye.x)**2+(p[1]-eye.y)**2+(p[2]-eye.z)**2;
  const nearest=practical.filter(p=>!covered&&score(p.at)<900&&!obstacles.some(o=>segmentBox({x:p.at[0],y:p.at[1],z:p.at[2]},eye,o)!==null)).sort((a,b)=>score(a.at)-score(b.at));
  pointLights.forEach((l,i)=>{const p=nearest[i];l.visible=!!p&&weight>.03;if(p){l.position.set(...p.at);l.color.setHex(p.color);l.intensity=p.intensity*weight;l.distance=p.distance;}});
  const b=beams.filter(b=>b.mesh.visible&&b.mesh.scale.y>2).reduce((best,b)=>!best||distanceSquared(b.origin)<distanceSquared(best.origin)?b:best,null);
  search.visible=!covered&&weight>.03&&!!b&&distanceSquared(b.origin)<3600;
  if(b){search.position.copy(b.origin);search.target.position.copy(b.end);search.intensity=50*weight;}
  for(let i=0;i<haze.length;i++)haze[i].m.position.x=haze[i].x+Math.sin(time*.09+i)*1.6;
  if(air.visible){for(let i=0;i<count;i++){rainPositions[i*3+1]-=dt*(8+i%4);if(rainPositions[i*3+1]<0)rainPositions[i*3+1]+=17;}rainGeo.attributes.position.needsUpdate=true;}
 }
 const stat={revision:'m01-siege-01',searchlights:beams.length,banners:banners.length,watchPosts:4,practicals:practical.length,puddles:pools.length,rainParticles:count,maxDynamicLights:pointLights.length+1,addedColliders:0,meshes:0,triangles:0};
 root.traverse(o=>{if(o.isMesh){stat.meshes++;stat.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);o.castShadow=false;o.receiveShadow=!o.material.isMeshBasicMaterial;}});
 return {root,update,stats:()=>({...stat,neons:neons.stats(),covered,duskWeight:weight,dynamicLights:pointLights.filter(l=>l.visible).length+Number(search.visible)}),
  dispose(){if(disposed)return;disposed=true;neons.dispose();root.removeFromParent();if(skySource){scene.background=skySource;scene.environment=environmentSource;}
   stormSky?.dispose();stormReflection?.dispose();const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});for(const g of geometries)g.dispose();for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
