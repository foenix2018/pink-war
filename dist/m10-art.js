import {createCouronneArt} from './couronne-art.js';
import {parsePWM} from './blender-models.js';
import {batchStaticGeometry} from './static-geometry-batch.js';
import {bevelBox} from './geo.js';
import * as L from './m10-layout.js';

// Existing HELIX courtyard + genuinely authored Blender laboratories and east deck.
export function createM10Art(T,scene,{quality='normal',webgpu=false,characterId='ghju',onPortalClose=()=>{}}={}){
 const low=quality==='low',base=createCouronneArt(T,scene,{quality,webgpu,onPortalClose,chapter:10}),root=base.root;
 const sun=scene.children.find(o=>o.isDirectionalLight);if(sun)sun.castShadow=false;
 const clock=T.TSL.uniform(0),doors=new Map(),markers=new Map(),materials=new Map();let compiled=null,downloadBytes=0,npc=null,buddySphere=null,disposed=false,batching=null;
 const dark=new T.MeshStandardMaterial({color:0x26333e,metalness:.72,roughness:.4}),steel=new T.MeshStandardMaterial({color:0x8497a0,metalness:.8,roughness:.32}),frost=new T.MeshStandardMaterial({color:0x87b0bc,metalness:.12,roughness:.48,transparent:true,opacity:.78,side:T.DoubleSide}),glow=new T.MeshBasicMaterial({color:0x50daf1,toneMapped:false});
 function mesh(g,m,p,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;}
 for(const d of L.DOORS){
  const group=new T.Group();group.position.set(d.x,d.y,d.z);if(d.axis==='z')group.rotation.y=Math.PI/2;root.add(group);group.userData.keepDynamic=true;
  const leaves=[-1,1].map(side=>{const leaf=new T.Group();group.add(leaf);const w=d.width/2-.04;
   mesh(bevelBox(w,d.height,.18,.07,2),dark,[0,d.height/2,0],leaf);
   mesh(bevelBox(w-.24,d.height*.65,.035,.04,2),frost,[0,d.height*.53,.112],leaf);
   for(const xx of [-w/2+.08,w/2-.08])mesh(new T.CylinderGeometry(.022,.022,d.height-.25,8),glow,[xx,d.height/2,.14],leaf);
   const handle=mesh(new T.CylinderGeometry(.025,.025,.31,10),steel,[-side*w*.28,d.height*.45,.17],leaf);handle.rotation.z=Math.PI/2;
   leaf.position.x=side*d.width/4;return{leaf,side};
  });doors.set(d.id,{data:d,group,leaves,target:0,open:0});
 }
 for(const it of L.INTERACTIONS){const ring=mesh(new T.TorusGeometry(.48,.028,6,24),new T.MeshBasicMaterial({color:0x526275,toneMapped:false}),[it.x,it.y+.04,it.z]);ring.rotation.x=-Math.PI/2;markers.set(it.id,{ring,done:false,available:false});}
 // The bureau screen has a native WGSL scan mask, rather than an unlit solid rectangle.
 let holo=null;
 if(webgpu){const{uv,sin,color,mix}=T.TSL,m=new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});const scan=sin(uv().y.mul(250).sub(clock.mul(5))).mul(.5).add(.5);m.colorNode=mix(color(0x032334),color(0x56b9d6),scan);m.opacityNode=scan.mul(.10).add(.07);holo=mesh(new T.PlaneGeometry(9.2,4.6),m,[0,15.1,-56.57]);holo.name='HELIX / écran de liaison WebGPU';}
 const ready=(async()=>{
  await base.ready;
  const assetBase=new URL('./assets/m10/',import.meta.url),[r,defs]=await Promise.all([fetch(new URL('helix.pwm.gz',assetBase)),fetch(new URL('materials.json',assetBase)).then(r=>r.json())]);if(!r.ok)throw Error('Modèles HELIX indisponibles');const packed=await r.arrayBuffer();downloadBytes=packed.byteLength;
  let bytes;if(String.fromCharCode(...new Uint8Array(packed,0,4))==='PWM1')bytes=packed;else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();else{const{gunzipSync}=await import('./vendor/fflate.module.js');const b=gunzipSync(new Uint8Array(packed));bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
  compiled=parsePWM(T,bytes);const loader=new T.TextureLoader(),cache=new Map();
  const texture=(path,scale,color=false)=>{const key=path+'/'+scale+'/'+color;if(!cache.has(key))cache.set(key,loader.loadAsync(new URL('./assets/'+path,import.meta.url).href).then(t=>{t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(scale);t.anisotropy=low?2:4;return t;}));return cache.get(key);};
  await Promise.all(Object.entries(defs).map(async([name,m])=>{const scale=m.uvScale??.5,[map,normalMap,roughnessMap]=await Promise.all([m.texture?texture(m.texture,scale,true):null,m.normalTexture&&!low?texture(m.normalTexture,scale):null,m.roughTexture?texture(m.roughTexture,scale):null]);const color=new T.Color(...m.color);
   const mat=m.emissive>=2||name==='terminal-ui'?new T.MeshBasicMaterial({color,map,toneMapped:false}):new T.MeshStandardMaterial({color,map,normalMap,normalScale:new T.Vector2(.35,.35),roughnessMap,roughness:m.roughness,metalness:m.metalness,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:m.alpha<1?T.DoubleSide:T.FrontSide});materials.set(name,mat);
  }));
  for(const p of compiled.primitives){const o=mesh(p.geometry,materials.get(p.material),[0,0,0]);o.name='Blender HELIX / '+p.material;o.castShadow=!/glass|ice|rose|screen/.test(p.material);o.receiveShadow=true;}
  const{installPinkWarsSoldier}=await import('./level2-player.js'),{poseUnarmedForInspection}=await import('./rlh-firefighter.js'),{createGlove}=await import('./hands.js');const id=characterId==='ghju'?'lylu':'ghju';
  const rig=await installPinkWarsSoldier(T,scene,id);await rig.model.shadowUnit.gear.ready;await rig.model.shadowUnit.suit.ready;
  if(rig){const model=rig.model;model.root.position.set(-4,12,-49);model.root.rotation.y=.3;model.root.visible=true;model.setLevel(10);const gloves=[createGlove(rig.kit.gloves,{mirror:true,sleeve:false,arm:false}),createGlove(rig.kit.gloves,{sleeve:false,arm:false})];model.root.add(...gloves);poseUnarmedForInspection(model,gloves);npc={...rig,id};const{createCompanionModel}=await import('./companion-model.js');const root=new T.Group();root.name=(id==='ghju'?'Gaby':'Cara')+' / unité du second héros';scene.add(root);buddySphere={root,model:createCompanionModel(T,root,id==='ghju'),name:id==='ghju'?'Gaby':'Cara'};}
  return{...compiled,source:'assets/m10/PinkWars_N10_Couronne_HELIX.blend'};
 })();
 function markDone(id,value=true){const p=markers.get(id);if(p){p.done=value;p.ring.material.color.setHex(value?0x73e3b5:p.available?0x62dfff:0x526275);}if(id==='security')base.setConsole('securite',value);if(id==='confinement')base.setConsole('ancrage-est',value);}
 return{root,sun,ready,
  build(collisions){base.build(collisions.filter(c=>!['verrière laboratoire','linteau laboratoire','paillasse','baies archives','terminal laboratoire','terminal archives','terminal confinement','terminal extraction','rail liaison','rail AEGIS','porte opaque HELIX'].includes(c.kind)));batching=batchStaticGeometry(T,root);},
  update(t,dt,camera,player){clock.value=t;base.update(t,dt,camera);for(const p of doors.values()){p.open+=(p.target-p.open)*(1-Math.exp(-dt*4));for(const l of p.leaves)l.leaf.position.x=l.side*(p.data.width/4+p.open*(p.data.width/2+.1));}if(npc){const p=player||camera?.position;npc.model.root.visible=!p||Math.hypot(p.x+4,p.z+49)<60;if(buddySphere){buddySphere.root.visible=npc.model.root.visible;buddySphere.root.position.set(-3.1,13.8+Math.sin(t*1.4)*.08,-48.3);if(camera)buddySphere.root.lookAt(camera.position.x,13.8,camera.position.z);if(buddySphere.root.visible)buddySphere.model.update(dt,{pulse:0});}}}
  ,setDoor(id,open){if(id==='security')base.setGatesOpen(open);const p=doors.get(id);if(p)p.target=open?1:0;},setLine:on=>base.setAnchorPower(on?1:0),
  markDone,setAvailable(ids){const active=new Set(ids);for(const[id,p]of markers){p.available=active.has(id);markDone(id,p.done);}},adapt(){},
  openPortal:(...args)=>base.openPortal(...args),
  stats:()=>({source:'assets/m10/PinkWars_N10_Couronne_HELIX.blend',triangles:compiled?.triangles||0,batches:compiled?.primitives.length||0,downloadBytes,rooms:2,doors:doors.size,batching,scanShader:holo?'TSL → WGSL':'material',reunionHero:npc?.id||null,secondSphere:buddySphere?.name||null,...base.stats()}),
  dispose(){if(disposed)return;disposed=true;npc?.dispose();buddySphere?.model.dispose();buddySphere?.root.removeFromParent();for(const p of compiled?.primitives||[])p.geometry.dispose();const textures=new Set();for(const m of materials.values()){for(const k of ['map','normalMap','roughnessMap'])if(m[k])textures.add(m[k]);m.dispose();}for(const t of textures)t.dispose();root.removeFromParent();}
 };
}
