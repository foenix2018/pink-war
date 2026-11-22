// Pink Wars · two native 3D nano-forges in the hideout suit room.
// No external viewer, iframe, downloaded GLB or surrogate armour: the meshes
// are the same Shadow Unit soldiers installed by level2-player.js.
export const NANO_ARMOR_TIERS=Object.freeze([
  {tier:1,gameLevel:1,name:'Tissu technique + blanc',material:'Tissu renforcé / casque léger'},
  {tier:2,gameLevel:3,name:'Céramique',material:'Plaques céramiques / casque composite'},
  {tier:3,gameLevel:5,name:'Titane',material:'Plaques de titane / casque renforcé'},
  {tier:4,gameLevel:7,name:'Carbotanium',material:'Coque composite sombre / casque carbotanium'},
  {tier:5,gameLevel:10,name:'Composite MAX',material:'Carbotanium + Kevlar + céramique / cape finale'}
]);

const clamp01=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x);};
const hash=n=>{let x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x);};

export function createHideoutNanoChambers(T,{scene,locations,low=false,onStatus=()=>{}}){
 const root=new T.Group();root.name='Planque / nano-forges GHJU et LYLU';scene.add(root);
 const cells=new Map(),temp=new T.Object3D();
 const particleShape=new T.IcosahedronGeometry(1,0);
 const mat=(hex,metalness=.45,roughness=.3)=>new T.MeshStandardMaterial({color:hex,metalness,roughness});
 const black=mat(0x101a27,.76,.29),metal=mat(0x5a7085,.82,.25);
 const glass=new T.MeshPhysicalMaterial({color:0xb7e3f7,roughness:.09,metalness:0,transparent:true,opacity:low?.095:.13,depthWrite:false,side:T.DoubleSide,clearcoat:.9});
 const tankGlass=new T.MeshPhysicalMaterial({color:0x91bcca,roughness:.1,metalness:0,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});
 const ringGeo=new T.TorusGeometry(.91,.027,7,64);ringGeo.rotateX(Math.PI/2);
 const tubeShape=new T.CylinderGeometry(.91,.91,2.61,56,1,true,.78,Math.PI*2-1.56);
 const doorShape=new T.CylinderGeometry(.916,.916,2.55,24,1,true,-.78,1.56);

 function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
 function makeCell(place){
  const id=place.hero,colorHex=id==='ghju'?0xff43a5:0x59beff;
  const emissive=new T.MeshBasicMaterial({color:colorHex,toneMapped:false});
  const sparks=new T.MeshBasicMaterial({color:colorHex,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const base=new T.Group();base.name='Centrifugeuse / '+id.toUpperCase();base.position.set(place.x,0,place.z);root.add(base);
  mesh(new T.CylinderGeometry(1.015,1.04,.20,48),black,base,0,.125);
  mesh(new T.CylinderGeometry(.96,.98,.055,48),metal,base,0,.23);
  mesh(new T.CylinderGeometry(.89,.89,.017,48),black,base,0,.273);
  const floorRing=mesh(ringGeo,emissive,base,0,.287);
  mesh(tubeShape,glass,base,0,1.61);
  mesh(ringGeo,metal,base,0,2.935);
  const topRing=mesh(ringGeo,emissive,base,0,2.96);
  mesh(new T.CylinderGeometry(1.02,1.02,.13,48),black,base,0,3.04);
  mesh(new T.CylinderGeometry(.99,.99,.03,48),metal,base,0,3.117);
  for(const a of [.78,2.32,3.96,5.54]){
   const post=mesh(new T.CylinderGeometry(.021,.021,2.57,8),metal,base,.92*Math.sin(a),1.61,.92*Math.cos(a));
   post.name='Montant structurel '+id;
  }
  // Only the rear 270° of the cylinder is stationary. The curved front 90°
  // belongs to this actual hinged door; on opening it completely vacates the bay.
  const hingeX=-.916*Math.sin(.78),hingeZ=.916*Math.cos(.78);
  const hinge=new T.Group();hinge.position.set(hingeX,1.61,hingeZ);base.add(hinge);
  const pane=mesh(doorShape,glass,hinge,-hingeX,0,-hingeZ);pane.name='Porte avant vitrée / mobile';
  for(const a of [-.78,.78]){
   const edge=mesh(new T.CylinderGeometry(.022,.022,2.54,8),metal,hinge,.916*Math.sin(a)-hingeX,0,.916*Math.cos(a)-hingeZ);
   edge.name='Bord articulé du sas';
  }
  const handle=mesh(new T.BoxGeometry(.045,.30,.07),emissive,hinge,.52-hingeX,-.1,.76-hingeZ);
  handle.name='Poignée du sas';
  const pivot=mesh(new T.CylinderGeometry(.065,.065,2.69,10),metal,base,hingeX,1.61,hingeZ);
  pivot.name='Charnière du sas';

  // Ground reservoir on the right, with a visible curved injection line under
  // the bottom plate. Its flow goes horizontally, then vertically up the axis.
  const tankX=.98,tankZ=.54;
  mesh(new T.CylinderGeometry(.245,.27,.12,20),black,base,tankX,.12,tankZ);
  mesh(new T.CylinderGeometry(.22,.22,.37,20),tankGlass,base,tankX,.36,tankZ);
  mesh(new T.CylinderGeometry(.235,.235,.05,20),metal,base,tankX,.57,tankZ);
  mesh(new T.TorusGeometry(.19,.012,5,28).rotateX(Math.PI/2),emissive,base,tankX,.28,tankZ);
  const line=new T.CatmullRomCurve3([
    new T.Vector3(tankX,.20,tankZ),new T.Vector3(.67,.13,.37),
    new T.Vector3(.26,.12,.14),new T.Vector3(0,.24,0),
    new T.Vector3(0,.49,0)
  ]);
  mesh(new T.TubeGeometry(line,36,.046,8,false),metal,base);
  mesh(new T.TubeGeometry(line,36,.016,6,false),emissive,base);
  mesh(new T.CylinderGeometry(.115,.15,.32,12),metal,base,0,.36,0);
  const count=low?170:370;
  const cloud=new T.InstancedMesh(particleShape,sparks,count);cloud.name='Vortex turbulent de nanoparticules';cloud.instanceMatrix.setUsage(T.DynamicDrawUsage);cloud.frustumCulled=false;cloud.count=0;base.add(cloud);
  const flow=new T.InstancedMesh(particleShape,sparks,low?20:45);flow.name='Nanites injectées par le tuyau';flow.instanceMatrix.setUsage(T.DynamicDrawUsage);flow.frustumCulled=false;flow.count=0;base.add(flow);
  const state={id,base,hinge,pane,cloud,flow,line,floorRing,topRing,emissive,particleColor:colorHex,
   rig:null,records:[],cape:[],finishes:new Map(),tier:5,age:0,phase:'idle',door:0,targetDoor:0,loading:null,
   count,partPositions:[]};
  for(let i=0;i<count;i++)state.partPositions.push({a:hash(i*7+2)*Math.PI*2,b:hash(i*7+3),c:hash(i*7+4),d:hash(i*7+5)});
  cells.set(id,state);return state;
 }
 for(const place of locations.filter(p=>p.hero==='ghju'||p.hero==='lylu'))makeCell(place);

 function isCape(o){return /cape dorsale|tabard frontal/i.test(o.name||'');}
 function applyMaterialProgression(cell){
  // White ceramic-looking plates gradually darken to the exact canonical
  // graphite/riveted Shadow Unit finish at tier five. Fabric, visor, glowing
  // seams and character identity colours remain untouched.
  const whiten=[.89,.69,.42,.17,0][cell.tier-1],chalk=new T.Color(0xe8edf3);
  cell.rig.model.root.traverse(o=>{
   if(!o.isMesh)return;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!m?.isMeshStandardMaterial||m.metalness<.45||m.transparent||!m.color||/visor|fabric|cloth|suit|glow/i.test(m.name||''))continue;
    if(!cell.finishes.has(m))cell.finishes.set(m,{color:m.color.clone(),roughness:m.roughness,metalness:m.metalness});
    const original=cell.finishes.get(m);
    m.color.copy(original.color).lerp(chalk,whiten);
    m.roughness=Math.min(1,original.roughness+whiten*.18);
    m.metalness=Math.max(.2,original.metalness-whiten*.36);
   }
  });
 }
 function collectArmor(cell){
  // Restore earlier scene visibility before a level change, but don't reveal
  // material layers that the canonical game itself has marked hidden.
  for(const r of [...cell.records,...cell.cape]){
   r.mesh.visible=r.wasVisible;
   if(r.mesh.geometry&&r.drawCount!==undefined)r.mesh.geometry.setDrawRange(0,r.drawCount);
  }
  cell.records=[];cell.cape=[];
  const all=[];cell.rig.model.root.traverse(o=>{if(o.isMesh&&o.visible)all.push(o);});
  cell.rig.model.root.updateWorldMatrix(true,true);
  for(const [i,o] of all.entries()){
   const isCloth=isCape(o),geo=o.geometry;
   if(!geo.boundingBox)geo.computeBoundingBox();
   const v=geo.boundingBox.getCenter(new T.Vector3());o.localToWorld(v);
   const order=smooth((v.y-.22)/2.62)*.65+hash(i*17+cell.tier*19)*.35;
   const record={mesh:o,wasVisible:true,order,drawCount:isCloth?(geo.index?.count||geo.attributes.position.count):undefined};
   if(isCloth){geo.setDrawRange(0,0);cell.cape.push(record);}else cell.records.push(record);
   o.visible=false;
  }
  cell.records.sort((a,b)=>a.order-b.order);
 }

 async function ensure(hero){
  const c=cells.get(hero);if(!c)return null;if(c.rig)return c;
  if(!c.loading){
   c.loading=(async()=>{
    const {installPinkWarsSoldier}=await import('./level2-player.js');
    const tint=hex=>new T.MeshStandardMaterial({color:hex,metalness:.55,roughness:.4});
    const light=hex=>new T.MeshBasicMaterial({color:hex});
    const rig=await installPinkWarsSoldier(T,root,hero,{
      monster:tint(0x394653),monsterFace:tint(0x09121d),cyan:light(0x6dcfff),
      rose:light(0xff639f),violet:light(0x9d72ff),pale:light(0xd8efff)
    });
    c.rig=rig;rig.model.root.position.set(c.base.position.x,.30,c.base.position.z);
    rig.model.root.rotation.y=Math.PI;
    rig.model.root.visible=true;
    // Await the actual Blender cloak, tactical belt and slung rifle: they must
    // not flash into the room partway through the formation animation.
    await rig.model.shadowUnit?.gear?.ready;
    rig.model.setLevel(NANO_ARMOR_TIERS[c.tier-1].gameLevel);
    applyMaterialProgression(c);
    collectArmor(c);
    c.phase='idle';onStatus();
    return c;
   })().catch(e=>{c.loading=null;console.warn('Planque / armure nano',hero,e);throw e;});
  }
  return c.loading;
 }

 async function prepare(hero,tier){
  const c=cells.get(hero);if(!c)return false;
  tier=Math.max(1,Math.min(5,Math.floor(Number(tier)||1)));
  c.tier=tier;c.age=0;c.phase='loading';c.targetDoor=0;
  onStatus();
  try{await ensure(hero);}catch{c.phase='error';onStatus();return false;}
  // The existing model retains the real ten-step armour progression internally.
  c.rig.model.setLevel(NANO_ARMOR_TIERS[tier-1].gameLevel);
  applyMaterialProgression(c);
  collectArmor(c);c.phase='idle';onStatus();return true;
 }

 async function inject(hero,tier){
  if(!await prepare(hero,tier))return false;
  const c=cells.get(hero);c.phase='injecting';c.age=0;c.targetDoor=0;onStatus();return true;
 }
 function recover(hero){
  const c=cells.get(hero);if(!c||!['ready','open'].includes(c.phase))return false;
  c.targetDoor=1;c.phase='open';onStatus();return true;
 }
 function close(hero){const c=cells.get(hero);if(!c)return;c.targetDoor=0;if(c.phase==='open')c.phase='ready';onStatus();}
 function phase(hero){const c=cells.get(hero);return c?{
  hero,phase:c.phase,tier:c.tier,progress:c.phase==='injecting'?clamp01(c.age/14):['ready','open'].includes(c.phase)?1:0,
  loaded:!!c.rig,doorOpen:c.door>.95
 }:null;}

 function renderParticles(c,time){
  const active=c.phase==='injecting',idle=c.phase==='idle'||c.phase==='loading';
  c.cloud.count=active?c.count:idle?Math.min(18,c.count):c.phase==='open'?0:25;
  const p=clamp01(c.age/14),turbulence=1-smooth((p-.42)/.55);
  for(let i=0;i<c.cloud.count;i++){
   const h=c.partPositions[i],turn=time*(active?4.2:1.1)*(h.d>.5?1:-1)+h.a;
   const vortexY=active?.28+(h.b+.11*time*(.2+h.c))%1*2.56:.35+h.b*.16;
   const ringRadius=.18+(.65*Math.sin(Math.PI*clamp01((vortexY-.28)/2.6)))*(.54+.46*h.c);
   const storm=Math.sin(time*9+h.a*4+h.c*13)*.14*turbulence;
   const radius=ringRadius+storm;
   let x=Math.cos(turn)*radius,z=Math.sin(turn)*radius,y=vortexY;
   if(active&&p>.2){
    // A collapsing turbulent field, not a pre-existing mannequin silhouette.
    const towards=smooth((p-.2)/.65)*(h.d>.1?.68:.18);
    const bodyY=.35+h.b*2.31;
    const bodyR=bodyY>2.27?.24:bodyY>1.05?.39:bodyY>.72?.33:.28;
    x=x*(1-towards)+Math.cos(turn*1.7)*bodyR*towards;
    z=z*(1-towards)+Math.sin(turn*1.7)*bodyR*towards;
    y=y*(1-towards)+bodyY*towards;
   }
   const size=active?.013+.023*h.c+.010*Math.sin(time*12+h.a)**2:.009;
   temp.position.set(x,y,z);temp.rotation.set(turn,turn*.4,0);temp.scale.setScalar(size);temp.updateMatrix();c.cloud.setMatrixAt(i,temp.matrix);
  }
  c.cloud.instanceMatrix.needsUpdate=true;
  c.flow.count=active?c.flow.instanceMatrix.count:0;
  // Follow the entire reservoir → curved tube → bottom-centre injection path.
  if(active){
   const total=c.flow.instanceMatrix.count;
   for(let i=0;i<total;i++){
    const u=(time*.72+i/total)%1,v=c.line.getPoint(u),s=.013+.014*hash(i*8+7);
    temp.position.copy(v);temp.scale.setScalar(s);temp.rotation.set(time*3,u*8,0);temp.updateMatrix();c.flow.setMatrixAt(i,temp.matrix);
   }
   c.flow.instanceMatrix.needsUpdate=true;
  }
 }

 function update(dt,time){
  for(const c of cells.values()){
   const oldPhase=c.phase;
   c.door+= (c.targetDoor-c.door)*Math.min(1,dt*2.8);
   if(Math.abs(c.door-c.targetDoor)<.001)c.door=c.targetDoor;
   c.hinge.rotation.y=c.door*-1.94;
   // A truly open entrance: the front pane physically moves away; hide it
   // at full travel so there is no residual glass overlay in the doorway.
   c.hinge.visible=c.door<.995;
   c.floorRing.rotation.y=time*.16;c.topRing.rotation.y=-time*.13;
   if(c.phase==='injecting'){
    c.age=Math.min(14,c.age+dt);
    const armor=smooth((c.age-3.1)/7.7);
    for(const r of c.records)r.mesh.visible=r.order<=armor;
    // Cape is deliberately the last stage; progressively reveal cloth rows
    // from its shoulder anchorage down to the torn hem over ~3 seconds.
    const fabric=smooth((c.age-10.5)/3.45);
    for(const r of c.cape){
     r.mesh.visible=fabric>0;
     const triangleCount=Math.floor(r.drawCount*fabric/3)*3;
     r.mesh.geometry.setDrawRange(0,triangleCount);
    }
    if(c.age>=14){
     for(const r of [...c.records,...c.cape])r.mesh.visible=true;
     for(const r of c.cape)r.mesh.geometry.setDrawRange(0,r.drawCount);
     c.phase='ready';onStatus();
    }
   }
   if(c.rig){
    c.rig.model.animate(time,false,0,0,0,dt,{ground:()=>0,airborne:false,crouched:false});
   }
   if(oldPhase!==c.phase)onStatus();
   renderParticles(c,time);
  }
 }

 return{root,prepare,inject,recover,close,phase,update,
  snapshot:()=>Object.fromEntries([...cells.keys()].map(id=>[id,phase(id)])),
  dispose(){root.removeFromParent();for(const c of cells.values())c.rig?.dispose();
   for(const geometry of [particleShape,ringGeo,tubeShape,doorShape])geometry.dispose();
   for(const material of [black,metal,glass,tankGlass])material.dispose();
  }};
}
