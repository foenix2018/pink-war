// Deterministic, baked-once worn graphite steel textures for BRUTE V3.
// Packed 256px maps share one PBR material over the whole siege shell; no canvas and
// no extra per-frame CPU/GPU work. Generated from mechanical scratches, chips and oil.
let cached;
export function bruteSurfaces(T){
 if(cached)return cached;
 const n=256,rgba=(s)=>new Uint8Array(n*n*4),paint=rgba(),rough=rgba(),relief=rgba();
 const hash=(x,y,k=0)=>{let v=Math.imul(x+17+k*77,374761393)^Math.imul(y+43,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,g=hash(x,y),q=hash(Math.floor(x/15),Math.floor(y/19)),groove=(x%67<2||y%79<2)&&q>.34;
  const c=groove?96:183+Math.floor(g*24)+(q>.86?12:0);
  paint.set([c,Math.max(0,c-2),Math.max(0,c-5),255],i);
  const r=groove?230:165+Math.floor(42*hash(x,y,1));
  rough.set([r,r,r,255],i);
  const b=groove?87:124+Math.floor(8*(g-.5));
  relief.set([b,b,b,255],i);
 }
 // Scar and abrasion trails follow angled industrial impact directions.
 for(let k=0;k<260;k++){
  const x=Math.floor(hash(k,14)*n),y=Math.floor(hash(k,26)*n),len=2+Math.floor(hash(k,53)*24),diagonal=hash(k,99)>.48;
  for(let j=0;j<len;j++){
   const xx=(x+j)%n,yy=(y+(diagonal?Math.floor(j*.32):Math.floor(-j*.25))+n)%n,i=(yy*n+xx)*4;
   if(hash(xx,yy,3)<.24)continue;
   const bright=hash(k,56)>.32,v=bright?244:79;paint.set([v,v,v,255],i);
   rough.set([bright?120:237,bright?120:237,bright?120:237,255],i);
   relief.set([bright?161:83,bright?161:83,bright?161:83,255],i);
  }
 }
 // Hard plate seams and tiny bolt depressions: coherent under directional light.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const dist=Math.min(x,y,n-1-x,n-1-y),chip=dist<3&&hash(x,y,10)>.54,i=(y*n+x)*4;
  if(chip){paint.set([240,239,236,255],i);rough.set([113,113,113,255],i);relief.set([168,168,168,255],i);}
 }
 const texture=(buf,srgb)=>{const t=new T.DataTexture(buf,n,n);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 return cached={paint:texture(paint,true),rough:texture(rough,false),relief:texture(relief,false)};
}
