// Original, shared 256px painted-alloy wear. The six existing material batches
// are retained; no per-enemy image downloads or per-frame texture work.
let cached;
export function enemySurfaces(T){
 if(cached)return cached;const n=256,color=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4);
 const hash=(x,y)=>{let h=Math.imul(x+71,374761393)^Math.imul(y+2196,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 const noise=(x,y)=>{const a=x/32,b=y/32,ix=Math.floor(a),iy=Math.floor(b),u=(a-ix)**2*(3-2*(a-ix)),v=(b-iy)**2*(3-2*(b-iy));return (hash(ix%8,iy%8)*(1-u)+hash((ix+1)%8,iy%8)*u)*(1-v)+(hash(ix%8,(iy+1)%8)*(1-u)+hash((ix+1)%8,(iy+1)%8)*u)*v;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,grain=hash(x,y),patch=noise(x,y),edge=Math.min(x,y,n-1-x,n-1-y),scratched=(y+Math.floor(x/37)*13)%79<1&&grain>.22;
  const abrasion=edge<3&&grain>.35?31:scratched?20:0,oil=patch<.20?-28:0,base=201+grain*26+Math.sin(x*.19+y*.065)*3+oil+abrasion;
  color[i]=Math.min(255,base+(patch<.12?8:0));color[i+1]=Math.min(255,base);color[i+2]=Math.min(255,base-(patch<.12?10:0));color[i+3]=255;
  const r=Math.max(100,Math.min(245,180+grain*32-oil*.6-abrasion*.9));rough[i]=rough[i+1]=rough[i+2]=r;rough[i+3]=255;
 }
 const make=(data,srgb)=>{const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=2;t.needsUpdate=true;return t;};
 return cached={metal:make(color,true),rough:make(rough,false)};
}
