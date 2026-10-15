import {createPolyHavenLayer} from './polyhaven-level1.js';
import {LEVEL1_MAP,createLevel1Obstacles} from './level1-layout.js';
import {SURFACE_DATA,SURFACE_INFO} from './levels/vesper-01-textures.js';
import {MESH_DATA,MESH_INFO,MESH_INDEX_DATA} from './levels/vesper-01-mesh.js';
import {inflateSync} from './vendor/fflate.module.js';
import {createBoundaryFence} from './boundary-fence.js';
import {liftHeightAt} from './world-layout.js';

// Independent Blender-built map. Geometry is bundled locally, including in the
// standalone HTML: no CDN, GLTF loader or late asset request is needed to play.
export function createCampaignArt(T,scene,_unused,{quality='auto'}={}){
 const root=new T.Group();root.name='VESPER / SECOURS 07 — carte narrative Blender';root.visible=false;scene.add(root);
 const obstacles=createLevel1Obstacles(),geometries=[],materials=[],textures=[],screens=[],routes=[];
 let stage='power',lastState='',disposed=false,currentObjective=null;
 const ownG=g=>(geometries.push(g),g),ownM=m=>(materials.push(m),m);
 let seed=33207;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function paintTexture(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d');paint(context,w,h);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.push(map);return{canvas,context,map};}
 const pending=[],loader=new T.TextureLoader();let loadedMaps=0;
 function surface(name,type){const url=SURFACE_DATA[name]?.[type];if(!url)return null;
  let resolve,reject;const wait=new Promise((ok,fail)=>{resolve=ok;reject=fail});pending.push(wait);
  const tex=loader.load(url,t=>{if(quality==='low'&&t.image.width>256){const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(t.image,0,0,256,256);t.image=c;t.needsUpdate=true;}loadedMaps++;resolve();},undefined,reject);
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=quality==='low'?2:4;if(type==='color')tex.colorSpace=T.SRGBColorSpace;textures.push(tex);return tex;
 }
 const names=['concrete','plaster','brick','road','steel','rust','car-blue','car-cream'];
 const maps={};for(const name of names){const col=surface(name,'color'),height=surface(name,'height'),pbr=surface(name,'surface');maps[name]=ownM(new T.MeshStandardMaterial({color:0xffffff,map:col,bumpMap:height,bumpScale:['rust','brick'].includes(name)?.085:['road','concrete','plaster'].includes(name)?.046:.035,roughnessMap:pbr,metalnessMap:pbr,roughness:1,metalness:1}));}
 maps.dark=ownM(new T.MeshStandardMaterial({color:0x313b3a,map:maps.steel.map,bumpMap:maps.steel.bumpMap,bumpScale:.022,roughness:.72,metalness:.38}));
 maps.white=maps.plaster;maps.bark=ownM(new T.MeshStandardMaterial({color:0x473729,roughness:.98}));
 maps.foliage=ownM(new T.MeshStandardMaterial({color:0xffffff,map:surface('foliage','color'),alphaTest:.42,side:T.DoubleSide,roughness:.98,metalness:0}));
 maps.leaf=maps.foliage;
 maps.glass=ownM(new T.MeshStandardMaterial({color:0x6f827d,roughness:.34,metalness:.18,transparent:true,opacity:.36,side:T.DoubleSide,depthWrite:false}));
 maps.amber=ownM(new T.MeshBasicMaterial({color:0xe2a65b,toneMapped:false}));
 const ready=Promise.all(pending);const pbr=createPolyHavenLayer(T,maps,{quality});
 for(const [name,encoded] of Object.entries(MESH_DATA)){
  const raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let k=0;k<raw.length;k++)bytes[k]=raw.charCodeAt(k);
  const decoded=inflateSync(bytes);const data=new T.InterleavedBuffer(new Float32Array(decoded.buffer,decoded.byteOffset,decoded.byteLength/4),8),g=ownG(new T.BufferGeometry());
  g.setAttribute('position',new T.InterleavedBufferAttribute(data,3,0));g.setAttribute('normal',new T.InterleavedBufferAttribute(data,3,3));g.setAttribute('uv',new T.InterleavedBufferAttribute(data,2,6));const encodedIndex=MESH_INDEX_DATA[name];if(encodedIndex){const rawIndex=atob(encodedIndex),indexBytes=new Uint8Array(rawIndex.length);for(let k=0;k<rawIndex.length;k++)indexBytes[k]=rawIndex.charCodeAt(k);const dataIndex=inflateSync(indexBytes);g.setIndex(new T.BufferAttribute(new Uint32Array(dataIndex.buffer,dataIndex.byteOffset,dataIndex.byteLength/4),1));}g.computeBoundingSphere();
  const mesh=new T.Mesh(g,maps[name]);mesh.name='Blender / '+name;mesh.castShadow=quality!=='low'&&name!=='amber';mesh.receiveShadow=true;root.add(mesh);
 }
 const puddleMat=ownM(new T.MeshStandardMaterial({color:0x435854,roughness:.20,metalness:.30,transparent:true,opacity:.38,depthWrite:false}));
 for(const [x,z,sx,sz] of [[-3,47,2.5,1.5],[5,28,2,3],[21,8,2.8,1.8],[-2,64,1.5,2]]){const o=new T.Mesh(ownG(new T.CircleGeometry(1,18)),puddleMat);o.rotation.x=-Math.PI/2;o.position.set(x,.018,z);o.scale.set(sx,sz,1);root.add(o);}
 const boundary=createBoundaryFence(T,root,{material:maps.steel});const bounds=LEVEL1_MAP.bounds;boundary.setPolygon([{x:bounds.minX,z:bounds.minZ},{x:bounds.maxX,z:bounds.minZ},{x:bounds.maxX,z:bounds.maxZ},{x:bounds.minX,z:bounds.maxZ}]);
 // Static rails are already in Blender. Retain the shared proximity warning.
 boundary.root.children[0].visible=false;
 const boxGeo=ownG(new T.BoxGeometry(1,1,1));
 function box(mat,x,y,z,w,h,d,parent=root){const o=new T.Mesh(boxGeo,mat);o.position.set(x,y,z);o.scale.set(w,h,d);o.receiveShadow=true;o.castShadow=quality!=='low';parent.add(o);return o;}
 function solid(x,z,w,d,y,height,id){if(obstacles.some(b=>b.campaignTerminal===id))return;obstacles.push({x,z,hx:w/2,hz:d/2,y,height,surface:'metal',campaign:true,campaignTerminal:id});}
 function panel(title,x,y,z,w=2.4,h=1,width=768,height=320){
  const data=paintTexture(width,height,()=>{}),mesh=new T.Mesh(ownG(new T.PlaneGeometry(w,h)),ownM(new T.MeshBasicMaterial({map:data.map,toneMapped:false})));mesh.position.set(x,y,z);root.add(mesh);
  const s={mesh,paint(lines,caption=title){const c=data.context;c.fillStyle='#071918';c.fillRect(0,0,width,height);c.fillStyle='#dbb073';c.fillRect(14,16,5,height-32);c.font='600 25px sans-serif';c.fillText(caption,33,42,width-60);lines.forEach((line,i)=>{c.fillStyle=i===0?'#eef0df':'#b5d0c6';c.font='22px sans-serif';c.fillText(line,33,83+i*39,width-60);});data.map.needsUpdate=true;}};screens.push(s);return s;
 }
 function terminal(x,y,z,id){box(maps.dark,x,y+.5,z,1.2,1,.55);box(maps.steel,x,y+1.4,z,2.6,1.05,.25);solid(x,z,2.6,.6,y,1.93,id);box(maps.dark,x,y+1,z+.2,1.8,.10,.65);return panel('MÉMOIRE HUMAINE / HORS RÉSEAU',x,y+1.4,z+.142);}
 box(maps.dark,-6,1.05,61.65,1.65,2.1,.6);solid(-6,61.65,1.65,.6,0,2.1,'power');
 const power=panel('ALIMENTATION / CIRCUIT ISOLÉ',-6,1.55,61.97,1.55,.95);
 const archive=terminal(0,0,54.45,'archive'),exit=terminal(18,4.8,-44.55,'exit');
 panel('VESPER / SECOURS 07',0,4.9,70.31,6,.72).paint(['ANNEXE DES ARCHIVES · ACCÈS MANUEL']);
 panel('RUE DES ÉVACUATIONS',9,3.3,22,5,.8).paint(['RELAIS NORD ↑ · ORDRE CONTRÔLE LA RUE']);
 panel('RELAIS DES ARCHIVES',18,7.1,-49.8,5,.8).paint(['ESCALIER / ASCENSEUR DE SERVICE']);
 // Route studs are physically fixed to the ground; no additional permanent HUD.
 const routeMat=ownM(new T.MeshBasicMaterial({color:0xdab66b,toneMapped:false}));
 for(let i=1;i<LEVEL1_MAP.route.length;i++){const a=LEVEL1_MAP.route[i-1],b=LEVEL1_MAP.route[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.6);for(let k=0;k<n;k++){const t=k/n,o=box(routeMat,a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t+.025,a[1]+(b[1]-a[1])*t,.10,.02,.26);routes.push({o,segment:i});}}
 const marker=new T.Mesh(ownG(new T.OctahedronGeometry(.10)),routeMat);root.add(marker);
 const objective=panel('OBJECTIF',0,2.6,55,2.5,.58,768,160);
 const carriage=new T.Group();root.add(carriage);const lift=LEVEL1_MAP.lifts[0];
 box(maps.steel,lift.x,-.10,lift.z,6,.20,6,carriage);
 for(const side of [-1,1]){box(maps.steel,lift.x+side*2.92,.55,lift.z,.10,1.1,6,carriage);box(maps.amber,lift.x+side*2.9,1.07,lift.z,.045,.07,5.9,carriage);}
 function updateLift(time){if(root.visible)carriage.position.y=liftHeightAt(lift,time);}
 function update(game,time=0){const s=game?.campaign;if(!s||!root.visible)return;stage=s.stage;currentObjective=s.objective;updateLift(game.time);boundary.update({...game.player,y:game.player.elevation+1.65},.55,1.2);
  const key=[stage,s.sibling,...s.archive].join('|');if(key!==lastState){lastState=key;
   power.paint(stage==='power'?['Courant coupé. Réarmer le circuit.','F / clic du stick libre : interagir']:['CIRCUIT LOCAL : ACTIF','Réseau ORDRE : DÉCONNECTÉ']);
   archive.paint(stage==='power'?['Mémoire hors tension.','Boîtier de secours à gauche.']:stage==='archive'?['Journal humain retrouvé.','F / clic du stick libre : lire']:s.archive);
   exit.paint(stage==='complete'?[`Passage de ${s.sibling} confirmé.`,'DESTINATION : ARCHIVES VÉGÉTALES','NIVEAU 1 TERMINÉ']:[`Trace de ${s.sibling} enregistrée.`,'F / clic du stick libre : consulter']);
   for(const r of routes)r.o.visible=stage==='power'?r.segment<=3:stage==='archive'?r.segment===4:['crossing','exit'].includes(stage)?r.segment>=5:false;
   objective.mesh.visible=!!s.objective;
   if(s.objective){const p=s.objective.position;objective.mesh.position.set(p.x,p.y+2.7,p.z+.22);objective.paint(['F / CLIC STICK LIBRE'],s.objective.label);}
  }
  marker.visible=!!s.objective;if(s.objective){const p=s.objective.position;marker.position.set(p.x,p.y+3.2+Math.sin(time*2)*.05,p.z);marker.rotation.y=time*.5;}
 }
 function setVisible(enabled){root.visible=!!enabled;lastState='';if(enabled)pbr.start();}
 function stats(){return{visible:root.visible,stage,objective:currentObjective?.id||null,colliders:obstacles.length,terminals:3,revision:MESH_INFO.revision,ruinedInteriors:MESH_INFO.hollowBuildings,rustedVehicles:MESH_INFO.rustedVehicles,foliage:MESH_INFO.foliage,surfaceFamilies:Object.keys(SURFACE_INFO).length,loadedMaps,textureResolution:quality==='low'?256:512,geometrySource:MESH_INFO.tool,triangles:MESH_INFO.triangles,staticBatches:MESH_INFO.batches,footprint:{...LEVEL1_MAP.bounds},ceiling:5.7,independentMap:true,buildings:LEVEL1_MAP.buildings.length,lifts:1,stairs:1,encounters:2,boundary:boundary.stats(),pbr:pbr.stats()};}
 function dispose(){if(disposed)return;disposed=true;pbr.dispose();boundary.dispose();scene.remove(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear();}
 return{root,obstacles,update,setVisible,stats,dispose,updateLift,ready};
}
