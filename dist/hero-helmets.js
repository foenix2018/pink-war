import * as T from './vendor/three.webgpu.min.js';
import {suitStage} from './armor-progression.js';

// Casques fournis par l'utilisateur pour les tenues 4 (Carbonatium) et 5 (Bastion).
// Préparés par tools/blender/hero_helmets.py : glTF Y vertical, face vers +Z,
// base du col à y = 0. GHJU : casque rose ; LYLU : casque bleu à visière animée.
export const HELMET_STAGES=Object.freeze([4,5]);
export const HERO_HELMETS=Object.freeze({
  ghju:Object.freeze({file:'assets/heroes/helmet_ghju.glb',name:'Casque GHJU · blindage futuriste'}),
  lylu:Object.freeze({file:'assets/heroes/helmet_lylu.glb',name:'Casque LYLU · visière articulée',visor:true})
});
// Pose sur la tête du rig (repère de liaison du personnage, face vers -Z) :
// le col coiffe le haut du cou, la calotte enveloppe la tête du rig.
export const HELMET_FIT=Object.freeze({position:[0,1.672,.004],scale:.93,yaw:Math.PI});
export const helmetForStage=stage=>HELMET_STAGES.includes(suitStage(stage));

const cache=new Map();
const TYPES={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const SIZES={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};

// Lecteur GLB minimal (géométrie, matériaux PBR sans texture, nœuds, animations)
// qui crée directement des objets de la build WebGPU du jeu.
export function parseHelmetGLB(buffer){
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67)throw new Error('GLB attendu');
  const jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  const binStart=20+jsonLength+8;
  const accessor=i=>{const a=json.accessors[i],bv=json.bufferViews[a.bufferView],Type=TYPES[a.componentType],n=SIZES[a.type];
    const offset=binStart+(bv.byteOffset||0)+(a.byteOffset||0);return {array:new Type(buffer.slice(offset,offset+a.count*n*Type.BYTES_PER_ELEMENT)),size:n};};
  const materials=(json.materials||[]).map(m=>{const p=m.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1],e=m.emissiveFactor||[0,0,0];
    const glow=e.some(v=>v>0);
    const mat=new T.MeshStandardMaterial({name:m.name,color:new T.Color().setRGB(c[0],c[1],c[2],T.LinearSRGBColorSpace),
      metalness:p.metallicFactor??1,roughness:p.roughnessFactor??1,
      emissive:new T.Color().setRGB(e[0],e[1],e[2],T.LinearSRGBColorSpace),emissiveIntensity:glow?2.4:1});
    return mat;});
  const meshes=(json.meshes||[]).map(m=>m.primitives.map(p=>{const g=new T.BufferGeometry();
    const pos=accessor(p.attributes.POSITION);g.setAttribute('position',new T.BufferAttribute(pos.array,3));
    if(p.attributes.NORMAL!=null)g.setAttribute('normal',new T.BufferAttribute(accessor(p.attributes.NORMAL).array,3));
    if(p.indices!=null){const ix=accessor(p.indices).array;g.setIndex(new T.BufferAttribute(ix instanceof Uint8Array?new Uint16Array(ix):ix,1));}
    if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingSphere();
    return {geometry:g,material:materials[p.material]||materials[0]};}));
  const nodes=json.nodes.map((n,i)=>{const o=new T.Group();o.name=n.name||'node'+i;
    if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);
    if(n.mesh!=null)for(const prim of meshes[n.mesh]){const mesh=new T.Mesh(prim.geometry,prim.material);mesh.castShadow=true;mesh.receiveShadow=true;o.add(mesh);}
    return o;});
  json.nodes.forEach((n,i)=>{for(const c of n.children||[])nodes[i].add(nodes[c]);});
  const scene=new T.Group();for(const i of json.scenes[json.scene||0].nodes)scene.add(nodes[i]);
  const clips=(json.animations||[]).map(a=>new T.AnimationClip(a.name,-1,a.channels.map(ch=>{const s=a.samplers[ch.sampler],node=nodes[ch.target.node];
    node.name=node.name||'node';const times=accessor(s.input).array,values=accessor(s.output).array;
    const Track=ch.target.path==='rotation'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack,prop={translation:'position',rotation:'quaternion',scale:'scale'}[ch.target.path];
    return new Track(`${node.uuid}.${prop}`,times,values);})));
  return {scene,clips,materials,geometries:meshes.flat().map(p=>p.geometry),
    triangles:meshes.flat().reduce((n,p)=>n+(p.geometry.index?p.geometry.index.count:p.geometry.attributes.position.count)/3,0)};
}

export function loadHelmetAsset(id,{base=new URL('./',import.meta.url).href,fetcher=globalThis.fetch}={}){
  const spec=HERO_HELMETS[id]||HERO_HELMETS.ghju,url=new URL(spec.file,base).href;
  if(!cache.has(url))cache.set(url,fetcher(url).then(r=>{if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.arrayBuffer();}));
  return cache.get(url).then(buffer=>({spec,...parseHelmetGLB(buffer)}));
}

// Monte le casque sur l'os de la tête dans le repère de liaison du rig, comme
// les autres pièces d'armure. Visible aux tenues 4 et 5 uniquement ; tant que le
// fichier n'est pas chargé, le casque Shadow d'origine reste en place.
export function attachHeroHelmet(model,profile,{armour,outfits,load=loadHelmetAsset}={}){
  const id=profile?.id==='lylu'||profile?.masculine?'lylu':'ghju';
  const head=model.actor.bone('Head'),index=model.actor.bones.indexOf(head);
  const anchor=new T.Group();anchor.name='Casque tenue 4-5 · '+id.toUpperCase();
  new T.Matrix4().fromArray(model.actor.data.bones[index].inverse).decompose(anchor.position,anchor.quaternion,anchor.scale);
  const fit=new T.Group();fit.position.fromArray(HELMET_FIT.position);fit.rotation.y=HELMET_FIT.yaw;fit.scale.setScalar(HELMET_FIT.scale);
  anchor.add(fit);head.add(anchor);anchor.visible=false;
  let asset=null,mixer=null,actions={},disposed=false,stage=0;
  const api={id,anchor,get loaded(){return !!asset;},get visible(){return anchor.visible;},get triangles(){return asset?.triangles||0;},
    get replacesShadowHelmet(){return !!asset&&helmetForStage(stage);},
    sync(level=model.equipmentLevel){
      const next=suitStage(level),was=stage,replaced=api.replacesShadowHelmet;stage=next;
      anchor.visible=!!asset&&helmetForStage(next);
      // Mise en place du casque : la visière de LYLU se referme quand la tenue est revêtue.
      if(anchor.visible&&actions.Visiere_Fermeture&&!helmetForStage(was)){actions.Visiere_Ouverture?.stop();actions.Visiere_Fermeture.reset().play();}
      if(replaced!==api.replacesShadowHelmet)outfits?.refreshHelmet?.();
    },
    visor(open){if(!actions.Visiere_Ouverture)return false;const a=open?actions.Visiere_Ouverture:actions.Visiere_Fermeture,b=open?actions.Visiere_Fermeture:actions.Visiere_Ouverture;b.stop();a.reset().play();return true;},
    update(dt){mixer?.update(Math.max(0,Math.min(.1,dt||0)));},
    dispose(){disposed=true;mixer?.stopAllAction();anchor.removeFromParent();if(asset){for(const g of asset.geometries)g.dispose();for(const m of asset.materials)m.dispose();}}
  };
  outfits?.setHelmetOverride?.(()=>api.replacesShadowHelmet);
  api.ready=load(id).then(a=>{
    if(disposed){for(const g of a.geometries)g.dispose();for(const m of a.materials)m.dispose();return false;}
    asset=a;fit.add(a.scene);
    if(a.clips.length){mixer=new T.AnimationMixer(a.scene);for(const clip of a.clips){const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;actions[clip.name]=action;}}
    stage=0;api.sync();outfits?.refreshHelmet?.();return true;
  }).catch(error=>{if(typeof window!=='undefined')console.warn('Casque de tenue non chargé',error);return false;});
  return api;
}
