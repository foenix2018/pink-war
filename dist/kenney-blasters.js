import * as T from './vendor/three.webgpu.min.js';

// Actual CC0 geometry and palette from Kenney Blaster Kit 2.1.
// Embedded in the Pink War deployment: never loads assets from a third-party CDN.
// A failed asset leaves the original native weapon visible and fully functional.
export const KENNEY_WEAPON_ASSETS=Object.freeze(['b','g','d','f','p'].map(id=>'blaster-'+id+'.glb'));
const sources=new Map();
let sharedMaterial=null;
function getMaterial(){
  if(sharedMaterial)return sharedMaterial;
  const texture=typeof document!=='undefined'
    ?new T.TextureLoader().load(new URL('./assets/kenney/colormap.png',import.meta.url).href):null;
  if(texture){texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;}
  sharedMaterial=new T.MeshStandardMaterial({
    map:texture,metalness:.27,roughness:.53,side:T.DoubleSide
  });
  return sharedMaterial;
}
const COMPONENTS=Object.freeze({5120:{bytes:1,read:'getInt8'},5121:{bytes:1,read:'getUint8'},
  5122:{bytes:2,read:'getInt16'},5123:{bytes:2,read:'getUint16'},
  5125:{bytes:4,read:'getUint32'},5126:{bytes:4,read:'getFloat32'}});
const SIZES=Object.freeze({SCALAR:1,VEC2:2,VEC3:3,VEC4:4});
function unpackAccessor(json,data,binStart,index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],spec=COMPONENTS[a.componentType];
  if(!spec||!SIZES[a.type]||a.sparse)throw Error('Kenney accessor incompatible');
  const count=SIZES[a.type],stride=v.byteStride||count*spec.bytes;
  const start=binStart+(v.byteOffset||0)+(a.byteOffset||0),out=new Array(a.count*count);
  for(let i=0;i<a.count;i++)for(let k=0;k<count;k++)
    out[i*count+k]=data[spec.read](start+i*stride+k*spec.bytes,true);
  return out;
}
export function parseKenneyGLB(buffer){
  const data=new DataView(buffer);
  if(data.getUint32(0,true)!==0x46546c67||data.getUint32(4,true)!==2)throw Error('Kenney GLB attendu');
  const length=data.getUint32(12,true);
  if(data.getUint32(16,true)!==0x4e4f534a)throw Error('En-tête JSON GLB manquant');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
  const bin=20+length;
  if(data.getUint32(bin+4,true)!==0x004e4942)throw Error('Données GLB manquantes');
  const binStart=bin+8,meshes=json.meshes.map(def=>{
    const group=new T.Group();group.name=def.name||'Kenney blaster';
    for(const primitive of def.primitives){
      if(primitive.mode!==undefined&&primitive.mode!==4)throw Error('Topologie Kenney non prise en charge');
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(unpackAccessor(json,data,binStart,primitive.attributes.POSITION),3));
      if(primitive.attributes.NORMAL!==undefined)geometry.setAttribute('normal',new T.Float32BufferAttribute(unpackAccessor(json,data,binStart,primitive.attributes.NORMAL),3));
      if(primitive.attributes.TEXCOORD_0!==undefined)geometry.setAttribute('uv',new T.Float32BufferAttribute(unpackAccessor(json,data,binStart,primitive.attributes.TEXCOORD_0),2));
      if(primitive.indices!==undefined)geometry.setIndex(unpackAccessor(json,data,binStart,primitive.indices));
      if(!geometry.hasAttribute('normal'))geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,getMaterial());mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    }
    return group;
  });
  function node(id){
    const def=json.nodes[id],group=new T.Group();group.name=def.name||'Pièce du blaster';
    if(def.translation)group.position.fromArray(def.translation);
    if(def.rotation)group.quaternion.fromArray(def.rotation);
    if(def.scale)group.scale.fromArray(def.scale);
    if(def.mesh!==undefined)group.add(meshes[def.mesh]);
    for(const child of def.children||[])group.add(node(child));
    return group;
  }
  const root=new T.Group();
  for(const id of json.scenes[json.scene||0].nodes)root.add(node(id));
  return root;
}
function cached(letter){
  if(!sources.has(letter)){
    const url=new URL('./assets/kenney/blaster-'+letter+'.glb',import.meta.url).href;
    sources.set(letter,fetch(url).then(r=>{if(!r.ok)throw Error('Kenney '+r.status);return r.arrayBuffer();}).then(parseKenneyGLB));
  }
  return sources.get(letter);
}
// A tactical upgrade built on top of each *real* Kenney mesh: knurled barrel,
// vented heat shroud, optic rail, durable flank panels and an active power cell.
// No CDN and no opaque black placeholder geometry.
let upgradeMats=null;
function tacticalMaterials(){
  if(!upgradeMats)upgradeMats={
    anodized:new T.MeshStandardMaterial({color:0x212d3b,metalness:.80,roughness:.35}),
    ceramic:new T.MeshStandardMaterial({color:0x536775,metalness:.56,roughness:.34}),
    dark:new T.MeshStandardMaterial({color:0x0d1720,metalness:.45,roughness:.58}),
    glow:new T.MeshStandardMaterial({color:0x8fe4ed,emissive:0x1e879c,emissiveIntensity:2.2,roughness:.28}),
  };
  return upgradeMats;
}
export function upgradeKenneyWeapon(model,frame,index){
  if(index<0||index>4)return null;
  const mat=tacticalMaterials(),group=new T.Group();
  group.name='Tactical MKII / '+frame.id;
  const mkBox=(label,material,x,y,z,w,h,d)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);
    m.name=label;m.position.set(x,y,z);group.add(m);return m;
  };
  const length=Math.abs(frame.muzzle[2]),front=frame.muzzle[2],mid=front*.48,wide=index===4?.066:index===3?.050:.036;
  // Rigid receiver, shaped side armor and a machined rail along the barrel.
  mkBox('Reinforced receiver backbone',mat.anodized,0,.079,mid*.52,wide*1.38,.022,length*.40);
  mkBox('Raised optic mount',mat.ceramic,0,.148,mid*.53,.028,.016,Math.min(.20,length*.45));
  if(index===1||index===2){
    mkBox('Enclosed sight hood',mat.dark,0,.179,mid*.58,.056,.045,.065);
    mkBox('Lens tint',mat.glow,0,.181,mid*.58-.034,.037,.026,.004);
  }
  for(const sign of [-1,1]){
    mkBox('Ceramic flank plating',mat.ceramic,sign*(wide+.007),.069,mid*.70,.009,.045,Math.max(.075,length*.33));
    mkBox('Recessed power-channel',mat.glow,sign*(wide+.014),.055,mid*.7,.003,.007,Math.max(.04,length*.25));
    for(let i=0;i<4;i++){
      mkBox('Cooled exhaust vent',mat.dark,sign*(wide+.0145),.088,mid*.72-i*.025,.004,.016,.011);
    }
    // Grip-to-frame reinforced buttresses; these leave the actual handle clear.
    mkBox('Grip reinforcement',mat.anodized,sign*.022,-.045,.006,.012,.065,.046);
  }
  // Plasma emitter shields, visibly concentric to the real muzzle.
  const emitter=new T.Mesh(new T.CylinderGeometry(index===4?.067:.023,index===4?.057:.020,.055,12),mat.anodized);
  emitter.name='Machined emitter barrel';emitter.rotation.x=Math.PI/2;
  emitter.position.set(0,frame.muzzle[1],front+.025);group.add(emitter);
  const ring=new T.Mesh(new T.TorusGeometry(index===4?.061:.021,.004,7,18),mat.glow);
  ring.name='Emitter luminescent ring';ring.position.set(0,frame.muzzle[1],front-.003);group.add(ring);
  model.add(group);
  return group;
}

export function installKenneyBlasters(models,originals,frames,onLoad){
  const letters=['b','g','d','f','p'];
  const progress={loaded:0,total:5,failed:0,loadedByIndex:[false,false,false,false,false]};
  for(let i=0;i<5;i++)cached(letters[i]).then(master=>{
    const skin=master.clone(true),frame=frames[i];
    skin.name='Kenney CC0 / '+frames[i].id;
    const originalLength=[.42,.786,.908,1.31,.862][i];
    const minFront=[-.2601,-.34811,-.45394,-.655,-.43104][i];
    const maxY=[.1134,.17895,.18595,.1325,.18595][i];
    const scalar=frame.length/originalLength;
    skin.scale.setScalar(scalar);
    skin.position.set(0,frame.muzzle[1]-maxY*scalar,frame.muzzle[2]-minFront*scalar);
    skin.traverse(o=>{if(o.isMesh)o.castShadow=false;});
    models[i].add(skin);
    upgradeKenneyWeapon(models[i],frame,i);
    for(const old of originals[i])old.visible=false;
    progress.loaded++;progress.loadedByIndex[i]=true;onLoad?.(i,skin);
  }).catch(e=>{progress.failed++;console.warn('Kenney blaster non disponible, arme native conservée',letters[i],e.message);});
  return progress;
}
