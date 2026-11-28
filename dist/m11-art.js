import * as L from './m11-layout.js';
import {createM11Materials} from './m11-materials.js';
import {createM11Construction,districtBuilding,watchTower,evacuationTent,reliefTree,railM11} from './m11-construction.js';
import {buildM11Roads,buildM11Aircraft} from './m11-structures.js';
import {createWorldEffects} from './webgpu-world-fx.js';
import {createCascadeWater,cascadeGeometry} from './water-detail.js';
import {createVesperBuildings} from './vesper-altitude.js';

export function createM11Art(T,scene,{quality='normal',webgpu=false,characterId='ghju'}={}){
 const low=quality==='low',root=new T.Group();root.name='Vesper · La Traversée';scene.add(root);
 scene.background=new T.Color(0x949ca3);
 scene.fog=new T.FogExp2(0x899197,.0039);
 const sun=new T.DirectionalLight(0xffd6af,2.3);
 sun.position.set(-85,110,-140);
 const sky=new T.HemisphereLight(0xd3d9e5,0x514c45,1.55);scene.add(sun,sky);
 let disposed=false;
 const skyMap=new T.TextureLoader().load('./assets/cc0/vesper-morning-sky.webp',texture=>{
  if(disposed)return;
  texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.SRGBColorSpace;
  scene.background=texture;scene.backgroundIntensity=.83;scene.backgroundRotation.y=-.68;
 });
 const materials=createM11Materials(T,scene,{low}),M=materials.materials;
 const kit=createM11Construction(T,root,M,{low});
 const {box,rod,ring,cylinder,quad,add,trimSign,stamp,sector}=kit;
 const effects=createWorldEffects(T,{webgpu,low}),cascade=createCascadeWater(T,{webgpu,low,color:0xe0eadf});
 const falls=[],markers=new Map(),relays=new Map(),valves=[],ownedGeometry=new Set(),ownedMaterials=new Set();
 const traversal=L.createTraversal();
 let seed=11;
 const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function mesh(geometry,material,at,name,ownsMaterial=false){
  const o=new T.Mesh(geometry,material);o.name=name;o.position.set(...at);
  o.userData.noWorldShadow=true;o.receiveShadow=material.isMeshStandardMaterial;root.add(o);ownedGeometry.add(geometry);
  if(ownsMaterial)ownedMaterials.add(material);
  return o;
 }
 function cliff(x,z,y,w,d,index){
  sector('Gorge / falaise '+index);
  const n=8,top=[],under=[],middle=[],bottom=[];
  for(let i=0;i<n;i++){
   const a=(i+.49)*Math.PI*2/n,c=Math.cos(a),s=Math.sin(a),f=.87+rnd()*.13;
   top.push([x+c*w*.54*f,y-(i%3)*1.9,z+s*d*.55*f]);
   under.push([x+c*w*.62*f,y-11-(i%4)*2.8,z+s*d*.64*f]);
   middle.push([x+c*w*.57*f,y-29-(i%3)*2.3,z+s*d*.59*f]);
   bottom.push([x+c*w*.64*f,y-59,z+s*d*.65*f]);
  }
  const centre=[x,y-.7,z];
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   quad(under[j],under[i],top[i],top[j],i%3?'rock':'wetRock');
   quad(middle[j],middle[i],under[i],under[j],'rock');
   quad(bottom[j],bottom[i],middle[i],middle[j],'wetRock');
   const p=top[i],q=top[j];
   quad(p,centre,q,[(p[0]+q[0])/2,(p[1]+q[1])/2-.08,(p[2]+q[2])/2],'rock');
   const [px,py,pz]=under[i],s=2+rnd()*3;
   stamp('pebble','olive',[px,py+1.3,pz],[s,1+s*.24,s*.86],[0,i*.52,.22]);
  }
 }
 const shelves=[[-137,62,0,48,61],[-131,-12,6,59,53],[-102,-66,16,44,52],[158,-63,25,46,58],[151,21,8,48,70],[-131,-124,22,78,58],[9,-158,30,113,60],[123,-153,33,86,65],[-90,109,-4,73,32],[88,97,-5,62,51]];
 shelves.forEach((p,i)=>cliff(...p,i));
 const skylineRoot=new T.Group();root.add(skylineRoot);
 const towers=[];
 for(let band=0;band<3;band++){
  const count=low?14:22,radius=205+band*103;
  for(let i=0;i<count;i++){
   const angle=(i+(band%2)*.52)/count*Math.PI*2,r=radius+(rnd()-.5)*36;
   towers.push({x:Math.cos(angle)*r,z:Math.sin(angle)*r,width:12+rnd()*18,depth:11+rnd()*15,
    top:19+band*7+rnd()*44+Number(i%9===0)*14,height:-29,style:i%3,band,phase:rnd()*8,yaw:angle+.17});
  }
 }
 const skyline=createVesperBuildings(T,skylineRoot,towers,{floor:-28,fogBase:-23,clear:32,distance:[100,490],mist:0x82888b,horizon:0x929c9e,
  facades:[0x9e9d93,0x8b9293,0x95877c],roofs:[0x676d6d,0x737575,0x7b746f]},webgpu);

 const rampSubdivisions=buildM11Roads(kit);
 for(const f of L.FLOORS.filter(f=>f.id!=='barrage')){
  sector(f.id+' / assises');
  const count=low?2:3;
  for(let i=0;i<count;i++){
   const x=f.x-f.w*.34+i*(f.w*.68/(count-1)),z=f.z+f.d*.22;
   box([x,f.height-5.8,z],[2.6,11.2,3.1],'concrete');
   box([x,f.height-1.66,z],[4.35,.92,4.42],'wetRock');
   rod([x-2,f.height-8.4,z],[x,f.height-2.1,z],.22,'edge');
  }
 }
 for(const [i,b] of L.BUILDINGS.entries()){
  const variant=i<2?'helix':i<7?'civic':'ordre';sector('Bâti / '+variant+' '+i);
  districtBuilding(T,kit,b,variant,low);
 }
 for(const [i,t] of L.TOWERS.entries()){sector('Poste de guet '+Math.floor(i/2));watchTower(kit,...t);}
 sector('Signalétique du district');
 trimSign('HELIX','SORTIE TECHNIQUE · OUEST',[-104,5.25,65.38],0,6.75,1.22,'ordre');
 trimSign('VESPER · DISTRICT OUEST','SECTEUR CIVIL  /  ACCÈS LIMITÉ',[-87,13,16.85],0,7,1.08);
 trimSign('ORDRE','POINT DE CONTRÔLE · ZONE BARRÉE',[-64,17.8,-7.31],0,5.8,1.05,'ordre');

 for(const [i,[x,z,y]] of L.COVER.entries()){
  sector('Équipement de rue '+Math.floor(i/3));
  box([x,y+.48,z],[2.60,.95,.80],'concrete');
  box([x,y+.94,z],[2.55,.12,.73],'edge');
  for(const s of [-1,1]){
   box([x+s*.93,y+.47,z+.415],[.20,.73,.05],'paint');
   for(const by of [.21,.72])cylinder([x+s*.93,y+by,z+.454],.029,.05,'edge',[Math.PI/2,0,0]);
  }
  box([x,y+.61,z+.422],[1.08,.105,.033],'gold');
 }
 const lampAt=[[-94,43,2],[-77,42,2],[-79,19,8],[-65,7,8],[-55,-1,12],[-39,-39,25],[0,-53,25],[25,-53,25],[50,-53,25],[75,-53,25],[100,-53,25]];
 for(const [i,[x,z,y]] of lampAt.entries()){
  sector('Luminaires '+Math.floor(i/3));
  cylinder([x,y+.16,z],.18,.3,'dark');
  rod([x,y+.25,z],[x,y+4.78,z],.092,'edge',.051);
  rod([x,y+4.62,z],[x,y+4.86,z+.64],.055);
  box([x,y+4.83,z+.82],[.37,.15,.60],'edge');
  box([x,y+4.74,z+.82],[.24,.033,.39],'warm');
 }
 const plants=[[-111.8,37.3],[-113,68.5],[-92,14.5],[-92.7,25],[-84,23],
  [-56,30],[-51,32],[-70.0,-24.5],[-39.5,-49],[-21,-52],[121,-78],[119,-58]];
 const blockers=L.buildCollisions();
 plants.forEach(([x,z],i)=>{
  const y=traversal.height(x,z);
  if(y<0||blockers.some(b=>Math.abs(b.x-x)<b.hx+.42&&Math.abs(b.z-z)<b.hz+.42))return;
  sector('Plantations '+Math.floor(i/3));reliefTree(kit,x,y,z,i,{low});
 });
 for(const [i,[x,z]] of [[-78,16],[-78,25],[-59,13]].entries()){
  sector('Évacuation civile · '+(i+1));
  evacuationTent(T,kit,x,8,z,i?'POSTE '+(i===1?'B':'C'):'TRIAGE');
 }
 // Thick structural portals around three spillways. The moving water
 // covers one contoured surface, with no second transparent sheet.
 const bottom=-20.21;
 for(let i=0;i<4;i++){
  const x=-22+32*(i+.5);
  sector('Structure du barrage '+i);
  box([x,3.38,-46],[32,41.8,14],'concrete');
  box([x,22.98,-38.85],[31.8,.53,.77],'steel');
  box([x,19.64,-38.69],[31.72,.25,.84],'wetRock');
 }
 const inlet=[14,46,78];
 const impactPoints=[];
 for(const x of inlet){
  sector('Déversoir '+x);
  const lipZ=-37.1,top=16.3,h=top-bottom,run=7.1,wide=11.5;
  box([x,17.0,-38.2],[13.0,1.12,1.12],'steel');
  box([x,17.53,-37.86],[12.95,.15,1.64],'wetRock');
  for(const s of [-1,1]){
   box([x+s*6.45,9.7,-37.77],[1.35,17.5,1.52],'wetRock');
   box([x+s*6.45,17.91,-37.68],[1.65,.72,1.6],'concrete');
   for(const yy of [7,10.5,14,17.8])
    rod([x+s*6.35,yy,-36.91],[x+s*6.35,yy,-36.39],.14,'edge');
  }
  for(const s of [-1,1])box([x+s*5.7,14.25,-37.71],[.2,4.7,.22],'edge');
  const frame=cascadeGeometry(T,{width:wide,height:h,run,low});
  const fall=mesh(frame,cascade.material,[x,(top+bottom)/2,lipZ],'Barrage / nappe du déversoir '+x);
  falls.push(fall);
  impactPoints.push({x,z:lipZ+run,radius:9.8});
 }
 // Multiple pieces of one water level. Each cascade reaches a localised
 // impact patch in its own piece; vertices meet at common edges.
 const boundaries=[-174,30,62,214];
 for(const [i,foam] of impactPoints.entries()){
  const min=boundaries[i],max=boundaries[i+1],centre=(min+max)*.5;
  const plane=new T.PlaneGeometry(max-min,2,low?16:32,low?16:35).rotateX(-Math.PI/2);
  const position=plane.attributes.position;
  for(let j=0;j<position.count;j++){
   const x=position.getX(j)+centre,r=(x-20)/208;
   position.setZ(j,position.getZ(j)*238*Math.sqrt(Math.max(0,1-r*r)));
  }
  plane.computeBoundingSphere();
  const material=effects.water({color:0x255456,shallowColor:0x6a836f,skyColor:0xa2b3ba,
   opacity:.94,refraction:false,flow:.92,foam});
  mesh(plane,material,[centre,bottom+.012,0],'Gorge / eau et écume du déversoir '+i);
 }
 for(const [i,x] of [-20,3,26,49,72,95,104].entries()){
  if(inlet.some(c=>Math.abs(x-c)<6.2))continue;
  sector('Contreforts '+Math.floor(i/2));
  box([x,3.43,-37.71],[2.8,40.95,1.9],'wetRock');
  box([x,22.79,-36.71],[2.92,.56,1.89],'concrete');
 }
 for(const z of [-34,-56])for(let i=0;i<4;i++){
  sector('Garde-corps de crête '+i);
  railM11(kit,[-22+i*32,25,z],[10+i*32,25,z]);
 }
 sector('Plaques du barrage');
 trimSign('ORDRE','COMPLEXE HYDRAULIQUE OUEST',[-9,20.5,-37.96],0,6.9,1.24,'ordre');
 trimSign('BARRAGE 04','DÉVERSOIRS AUTOMATISÉS',[98,20.5,-37.96],0,6.1,1.13,'ordre');
 for(const [i,x] of L.RELAYS.entries()){
  sector('Relais '+(i+1));const id='relais-'+'abc'[i];
  box([x,25.32,-51],[5.98,.63,5.98],'concrete');
  box([x,25.66,-51],[5.45,.16,5.36],'edge');
  cylinder([x,28.2,-51],1.66,4.53,'dark');
  for(const yy of [26.03,26.27,29.65,30.70,31.49]){
   cylinder([x,yy,-51],2.20,.24,'edge');ring([x,yy+.135,-51],2.13,.045,'gold');
  }
  for(let k=0;k<6;k++){
   const angle=k*Math.PI/3,dx=Math.cos(angle),dz=Math.sin(angle),cx=x+dx*2.09,cz=-51+dz*2.09;
   rod([cx,25.74,cz],[cx,31.76,cz],.118,'edge');
   rod([cx,26.12,cz],[x+dx*2.7,25.73,-51+dz*2.7],.082);
   box([cx,26.71,cz],[.35,.53,.35],'paint');
  }
  const core=mesh(new T.CylinderGeometry(.98,1.17,1.13,low?12:20),M.red.clone(),[x,30.30,-51],id+' / état',true);
  relays.set(id,core);
  trimSign('RELAIS '+'ABC'[i],'LIAISON HAUTE TENSION',[x,27.52,-48.70],0,2.35,.55,'ordre');
 }
 sector('Vannes de crête');
 const valveGeometry=new T.TorusGeometry(.252,.038,low?5:8,low?16:25);
 for(const x of [45.5,48.4,51.3]){
  box([x,25.28,-38.6],[1.08,.54,.76],'concrete');
  rod([x,25.28,-39],[x,26.22,-39],.128,'steel');
  const v=mesh(valveGeometry,M.paintRed,[x,26.21,-39],'Volant de commande');
  v.rotation.x=-Math.PI/2;valves.push(v);
  cylinder([x,26.21,-39],.081,.12,'edge');
 }
 trimSign('VANNES','COMMANDE LOCALE  ·  BARRAGE 04',[50,27.25,-45.74],0,3.65,.74,'ordre');
 sector('Hélisurface AEGIS');
 cylinder([109,32.025,-70],10.9,.047,'dark');
 ring([109,32.065,-70],9.43,.051,'gold');
 for(const s of [-1,1])box([109+s*1.26,32.073,-70],[.31,.024,3.5],'line');
 box([109,32.073,-70],[2.6,.024,.28],'line');
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,x=109+Math.cos(a)*9.43,z=-70+Math.sin(a)*9.43;
  cylinder([x,32.105,z],.14,.17,'edge');cylinder([x,32.22,z],.074,.082,'warm');
 }
 trimSign('EXTRACTION AEGIS','HÉLISURFACE MÉDICALE',[109,31.08,-55.95],0,6.15,1.04,'aegis');
 buildM11Aircraft(T,kit,low);
 kit.finish();
 const markerGeometry=new T.TorusGeometry(.43,.026,6,24);
 for(const it of L.INTERACTIONS){
  const r=mesh(markerGeometry,M.blue.clone(),[it.x,it.y+.052,it.z],'Repère de mission · '+it.id,true);
  r.rotation.x=-Math.PI/2;
  markers.set(it.id,{r,done:false,active:false});
 }
 let npc=null,buddySphere=null;
 const secondHeroReady=(async()=>{
  try{
   const [{installPinkWarsSoldier},{poseUnarmedForInspection},{createGlove},{readNanoProfile},{createCompanionModel}]=await Promise.all([
    import('./level2-player.js'),import('./rlh-firefighter.js'),import('./hands.js'),import('./nano-forge.js'),import('./companion-model.js'),
   ]);
   const id=characterId==='ghju'?'lylu':'ghju',rig=await installPinkWarsSoldier(T,scene,id);
   await Promise.all([rig.model.shadowUnit.gear.ready,rig.model.shadowUnit.suit.ready]);
   if(disposed){rig.dispose();return;}
   const model=rig.model;
   model.root.position.set(-91,2,57);model.root.visible=true;
   model.setLevel(readNanoProfile(id).equippedSuit);
   const gloves=[true,false].map(mirror=>createGlove(rig.kit.gloves,{mirror,sleeve:false,arm:false}));
   model.root.add(...gloves);poseUnarmedForInspection(model,gloves);npc={...rig,id};
   const group=new T.Group();scene.add(group);
   buddySphere={root:group,model:createCompanionModel(T,group,id==='ghju')};
  }catch(error){console.warn('M11 / second héros optionnel',error);}
 })();
 function markDone(id,value=true){
  const marker=markers.get(id);
  if(marker){marker.done=value;marker.r.material.color.setHex(value?0x7bbb9a:marker.active?0x78d8e7:0x778680);}
  const light=relays.get(id);if(light)light.material.color.setHex(value?0x7bbb9a:0xd97b62);
 }
 return {
  root,sun,ready:Promise.all([secondHeroReady,materials.ready]),build(){},setDoor(){},setLine(){},adapt(){},openPortal(){},markDone,
  setAvailable(ids){
   const active=new Set(ids);
   for(const [id,p] of markers){p.active=active.has(id);markDone(id,p.done);}
  },
  update(t,dt,camera,player){
   kit.update(camera?.position);cascade.update(t);effects.update(t,camera?.position);
   if(markers.get('vannes')?.done)for(const v of valves)v.rotation.z+=dt*.30;
   if(npc&&player){
    const it=L.INTERACTIONS.find(i=>markers.get(i.id)?.active)||L.INTERACTIONS[0],x=it.x-2,z=it.z+1;
    const h=traversal.height(x,z);
    npc.model.root.position.set(x,h,z);npc.model.root.visible=h>-40;npc.model.root.lookAt(player.x,h,player.z);
    if(buddySphere){
     buddySphere.root.position.set(x+.9,h+1.8+Math.sin(t*1.6)*.1,z);
     buddySphere.root.visible=npc.model.root.visible;buddySphere.model.update(dt,{pulse:0});
    }
   }
  },
  stats:()=>({source:'Vesper · La Traversée',...kit.stats(),relays:relays.size,secondHero:npc?.id||null,
   waterfalls:falls.length,rampSubdivisions,textures:materials.stats(),nativeWater:effects.native}),
  dispose(){
   if(disposed)return;disposed=true;
   if(scene.background===skyMap)scene.background=null;skyMap.dispose();
   npc?.dispose();buddySphere?.model.dispose();buddySphere?.root.removeFromParent();
   kit.dispose();skyline.dispose();effects.dispose();cascade.dispose();materials.dispose();
   for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterials)m.dispose();
   root.removeFromParent();sun.removeFromParent();sky.removeFromParent();
  },
 };
}
