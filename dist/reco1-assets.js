import * as T from './vendor/three.webgpu.min.js';
import {decompressSync} from './vendor/fflate.module.js';
import {RECO1_GZIP} from './reco1-data.js';
let cached;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const array=(s,C)=>{const b=bytes(s);return new C(b.buffer);};
// Immutable geometry, textures and native clips are decoded once for the whole scene.
export function reco1Assets(){
 if(cached)return cached;
 const data=JSON.parse(new TextDecoder().decode(decompressSync(bytes(RECO1_GZIP))));
 data.textures=data.textures.map(d=>{
  const t=new T.DataTexture(array(d.data,Uint8Array),d.width,d.height,T.RGBAFormat);t.colorSpace=d.colorSpace;t.wrapS=d.wrapS;t.wrapT=d.wrapT;t.repeat.fromArray(d.repeat);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
 });
 data.materials=data.materials.map(d=>{
  const cfg={color:new T.Color().fromArray(d.color),transparent:d.transparent,opacity:d.opacity,depthWrite:d.depthWrite,side:d.side,polygonOffset:d.polygonOffset,polygonOffsetFactor:d.polygonOffsetFactor};
  if(!d.basic)Object.assign(cfg,{emissive:new T.Color().fromArray(d.emissive||[0,0,0]),emissiveIntensity:d.emissiveIntensity??0,metalness:d.metalness,roughness:d.roughness,bumpScale:d.bumpScale});
  for(const key of ['map','roughnessMap','bumpMap','emissiveMap'])if(d[key]!==null&&d[key]!==undefined)cfg[key]=data.textures[d[key]];
  const m=d.basic?new T.MeshBasicMaterial(cfg):new T.MeshStandardMaterial(cfg);m.name='RECO1 '+d.key;m.userData.reco1Key=d.key;return m;
 });
 data.parts=data.parts.map(d=>{
  const g=new T.BufferGeometry();for(const [key,n] of [['position',3],['normal',3],['uv',2]])g.setAttribute(key,new T.BufferAttribute(array(d[key],Float32Array),n));
  const bones=array(d.bone,Uint16Array),skin=new Float32Array(bones.length*4),weight=new Float32Array(bones.length*4);for(let i=0;i<bones.length;i++){skin[i*4]=bones[i];weight[i*4]=1;}
  g.setAttribute('skinIndex',new T.Float32BufferAttribute(skin,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weight,4));g.setIndex(new T.BufferAttribute(array(d.index,Uint32Array),1));g.computeBoundingBox();g.computeBoundingSphere();return {geometry:g,material:d.material};
 });
 data.clips=Object.fromEntries(Object.entries(data.motion.clips).map(([k,v])=>[k,T.AnimationClip.parse(v)]));
 cached=data;return data;
}
