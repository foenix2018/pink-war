import {createHeroPartnerActor} from './hero-partner-actor.js';
import {createMapInfoPanel} from './world-info-panel.js';
import {createCouronneArt} from './couronne-art.js';
import {parsePWM} from './blender-models.js';
import {batchStaticGeometry} from './static-geometry-batch.js';
import {Assembly,bevelBox,limb,matrix} from './geo.js';
import {createHelixAccents} from './m10-atmosphere.js';
import * as L from './m10-layout.js';

// Existing HELIX courtyard + genuinely authored Blender laboratories and east deck.
export function createM10Art(T,scene,{quality='normal',webgpu=false,characterId='ghju',onPortalClose=()=>{}}={}){
 const low=quality==='low',base=createCouronneArt(T,scene,{quality,webgpu,onPortalClose,chapter:10}),root=base.root;
 const accents=createHelixAccents(T,root,base.M,{low});
 const partner=createHeroPartnerActor(T,scene,{characterId,low,showcase:{x:-4,y:12,z:-49,yaw:.3}});
 const sun=scene.children.find(o=>o.isDirectionalLight);if(sun)sun.castShadow=false;
 const clock=T.TSL.uniform(0),doors=new Map(),markers=new Map(),materials=new Map();let compiled=null,downloadBytes=0,disposed=false,batching=null;
 const physicalDoorSigns=[],doorGeometry=new Set();
 const dark=new T.MeshStandardMaterial({color:0x26333e,metalness:.62,roughness:.48});
 const steel=new T.MeshStandardMaterial({color:0x97a2ad,metalness:.75,roughness:.44});
 const seal=new T.MeshStandardMaterial({color:0x171d27,roughness:.86});
 const frost=new T.MeshStandardMaterial({color:0x93a9b9,metalness:.26,roughness:.49});
 const glow=new T.MeshBasicMaterial({color:0x80d9ef,toneMapped:false});
 function mesh(g,m,p,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;}
 function finishDoor(parts,parent){
  for(const o of parts.build(parent))doorGeometry.add(o.geometry);
  for(const item of parts.items)item.geometry.dispose();
 }
 const arrivalFrame=new T.Group();arrivalFrame.name='Sas HELIX / rail et carter de motorisation';root.add(arrivalFrame);
 arrivalFrame.userData.keepDynamic=true;
 const frameParts=new Assembly();
 function framePart(size,position,radius,material){
  const geometry=bevelBox(...size,radius,1);
  frameParts.add(geometry,material,matrix(position),false);
  geometry.dispose();
 }
 framePart([8.26,.44,.69],[0,3.96,60],.073,steel);
 framePart([6.24,.13,.31],[0,3.77,60.16],.04,seal);
 framePart([2.08,.27,.23],[0,4.04,60.365],.046,dark);
 for(const x of [-3.65,-2.45,2.45,3.65])framePart([.13,.18,.076],[x,3.98,60.348],.024,seal);
 finishDoor(frameParts,arrivalFrame);
 for(const d of L.DOORS){
  const group=new T.Group();group.name='Sas HELIX / '+d.id;group.position.set(d.x,d.y,d.z);if(d.axis==='z')group.rotation.y=-Math.PI/2;root.add(group);group.userData.keepDynamic=true;
  const indicator=glow.clone();
  const leaves=[-1,1].map(side=>{
   const leaf=new T.Group();group.add(leaf);
   const w=d.width/2-.04,h=d.height,inward=-side*(w/2-.15),parts=new Assembly();
   function piece(geometry,material,position){
    parts.add(geometry,material,position?matrix(position):null,false);
    geometry.dispose();
   }
   const plate=(size,at,radius,material)=>piece(bevelBox(...size,radius,1),material,at);
   plate([w,h,.188],[0,h/2,0],.064,dark);
   plate([w-.25,h*.68,.065],[0,h*.542,.108],.031,seal);
   plate([w-.36,h*.625,.042],[0,h*.557,.139],.019,frost);
   plate([w-.21,.34,.081],[0,.235,.107],.04,steel);
   plate([.185,.69,.079],[inward,h*.45,.132],.032,steel);
   for(const rise of [-.21,.21]){
    const y=h*.45+rise;
    piece(limb([inward,y,.148],[inward,y,.235],.034,.034,low?6:10),seal);
   }
   piece(limb([inward,h*.45-.21,.235],[inward,h*.45+.21,.235],.027,.027,low?6:10),steel);
   plate([.135,.68,.069],[side*(w/2-.14),h*.75,.133],.031,dark);
   piece(new T.CylinderGeometry(.022,.022,.54,low?6:10),indicator,[side*(w/2-.14),h*.75,.175]);
   finishDoor(parts,leaf);
   leaf.position.x=side*d.width/4;return{leaf,side};
  });
  const names={access:['HELIX','ACCÈS PRINCIPAL'],laboratoires:['LABORATOIRES','RECHERCHE · PERSONNEL AUTORISÉ'],archives:['ARCHIVES','DONNÉES CLASSIFIÉES'],evacuation:['QUAI EST','LIAISON AEGIS']};
  const [title,subtitle]=names[d.id]||['HELIX','ACCÈS RÉSERVÉ'];
  const panel=createMapInfoPanel(T,{title,subtitle,sector:d.id==='evacuation'?'AEGIS / TRANSIT':'HELIX / SITE CENTRAL',width:Math.min(1.55,d.width*.42),height:.43,low,style:'physical'});
  panel.position.set(0,d.height*.17,.168);leaves[0].leaf.add(panel);physicalDoorSigns.push(panel);
  doors.set(d.id,{data:d,group,leaves,indicator,target:0,open:0});
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
  const texture=(path,scale,color=false)=>{
   const key=path+'/'+scale+'/'+color;
   if(!cache.has(key)){
    const shared=base.atmosphere?.texture(path);
    const source=shared?Promise.resolve(shared.clone()):loader.loadAsync(new URL('./assets/'+path,import.meta.url).href);
    cache.set(key,source.then(t=>{t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(scale);t.anisotropy=low?2:4;return t;}));
   }
   return cache.get(key);
  };
  await Promise.all(Object.entries(defs).map(async([name,m])=>{const scale=m.uvScale??.5,[map,normalMap,roughnessMap]=await Promise.all([m.texture?texture(m.texture,scale,true):null,m.normalTexture&&!low?texture(m.normalTexture,scale):null,m.roughTexture?texture(m.roughTexture,scale):null]);const color=new T.Color(...m.color);
   const mat=m.emissive>=2||name==='terminal-ui'?new T.MeshBasicMaterial({color,map,toneMapped:false}):new T.MeshStandardMaterial({color,map,normalMap,normalScale:new T.Vector2(.35,.35),roughnessMap,roughness:m.roughness,metalness:m.metalness,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:m.alpha<1?T.DoubleSide:T.FrontSide,forceSinglePass:name==='pane'});materials.set(name,mat);
  }));
  for(const p of compiled.primitives){const o=mesh(p.geometry,materials.get(p.material),[0,0,0]);o.name='Blender HELIX / '+p.material;o.castShadow=!/glass|ice|rose|screen/.test(p.material);o.receiveShadow=true;}
  await partner.ready;
  return{...compiled,source:'assets/m10/PinkWars_N10_Couronne_HELIX.blend'};
 })();
 function markDone(id,value=true){const p=markers.get(id);if(p){p.done=value;p.ring.material.color.setHex(value?0x73e3b5:p.available?0x62dfff:0x526275);}if(id==='security')base.setConsole('securite',value);if(id==='confinement')base.setConsole('ancrage-est',value);}
 return{root,sun,ready,partner,
  build(collisions){base.build(collisions.filter(c=>!['verrière laboratoire','linteau laboratoire','paillasse','baies archives','terminal laboratoire','terminal archives','terminal confinement','terminal extraction','rail liaison','rail AEGIS','porte opaque HELIX'].includes(c.kind)));batching=batchStaticGeometry(T,root);},
  update(t,dt,camera){clock.value=t;base.update(t,dt,camera);accents.update(t,dt,camera?.position);for(const p of doors.values()){p.open+=(p.target-p.open)*(1-Math.exp(-dt*4));for(const l of p.leaves)l.leaf.position.x=l.side*(p.data.width/4+p.open*(p.data.width/2+.1));}partner.update(t,dt,camera);}
  ,setDoor(id,open){if(id==='security')base.setGatesOpen(open);const p=doors.get(id);if(p){p.target=open?1:0;p.indicator.color.setHex(open?0x79d9a5:0x80d9ef);}},setLine:on=>base.setAnchorPower(on?1:0),
  markDone,setAvailable(ids){const active=new Set(ids);for(const[id,p]of markers){p.available=active.has(id);markDone(id,p.done);}},adapt(){},
  openPortal:(...args)=>base.openPortal(...args),
  stats:()=>({source:'assets/m10/PinkWars_N10_Couronne_HELIX.blend',triangles:compiled?.triangles||0,batches:compiled?.primitives.length||0,downloadBytes,rooms:2,doors:doors.size,physicalDoorSigns:physicalDoorSigns.length,batching,scanShader:holo?'TSL → WGSL':'material',reunionHero:partner.hero,secondSphere:partner.sphereName,partner:partner.stats(),...base.stats(),...base.atmosphere?.stats(),roseAccents:accents.stats()}),
  dispose(){if(disposed)return;disposed=true;accents.dispose();base.dispose();for(const p of physicalDoorSigns)p.userData.dispose?.();for(const geometry of doorGeometry)geometry.dispose();for(const p of doors.values())p.indicator.dispose();for(const material of [dark,steel,seal,frost,glow])material.dispose();partner.dispose();for(const p of compiled?.primitives||[])p.geometry.dispose();const textures=new Set();for(const m of materials.values()){for(const k of ['map','normalMap','roughnessMap'])if(m[k])textures.add(m[k]);m.dispose();}for(const t of textures)t.dispose();root.removeFromParent();}
 };
}
