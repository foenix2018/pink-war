import * as T from './vendor/three.webgpu.min.js';

// Small deterministic, tileable material maps. Physical UVs on the new weapons
// and suit show grain, weave and worn finish rather than a single palette pixel.
let cached;
export function equipmentSurfaces(){
  if(cached)return cached;
  const size=256,metal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),cloth=new Uint8Array(size*size*4);
  let seed=341;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,grain=random(),scratch=((y*19+Math.floor(x/47)*13)%127===0&&x%47<33)?-32:0;
    const shade=Math.max(0,Math.min(255,226+grain*25+scratch+Math.sin(y*2.3)*3));
    const r=185+grain*35+(scratch?-30:0),weave=118+((x%4<2)===(y%4<2)?37:0)+grain*26;
    for(let c=0;c<3;c++){metal[i+c]=shade;rough[i+c]=r;cloth[i+c]=weave;}metal[i+3]=rough[i+3]=cloth[i+3]=255;
  }
  const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;return t;};
  cached={metal:texture(metal,true),rough:texture(rough),cloth:texture(cloth)};return cached;
}
