// Fine worn paint, not oversized scratches across each small armour face.
let cached;
export function rempartSurfaces(T){
 if(cached)return cached;
 const n=512,paint=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),height=new Uint8Array(n*n*4);
 const hash=(x,y,k=0)=>{let v=Math.imul(x+17+k*71,374761393)^Math.imul(y+43,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,grain=hash(x,y),cloud=hash(x>>5,y>>5),v=173+grain*13+cloud*8;
  paint.set([v,v-3,v-5,255],i);const r=180+grain*30;rough.set([r,r,r,255],i);const h=125+grain*5;height.set([h,h,h,255],i);
 }
 for(let k=0;k<1300;k++){
  const x0=hash(k,91)*n|0,y0=hash(k,57)*n|0,len=2+(hash(k,17)**3)*35,bright=hash(k,131)>.3;
  for(let j=0;j<len;j++){let x=(x0+j)%n,y=(y0+(j*.31|0))%n;if(hash(x,y,k)<.17)continue;const i=(y*n+x)*4,v=bright?209:110;paint.set([v,v-2,v-3,255],i);height.set([bright?133:120,bright?133:120,bright?133:120,255],i);}
 }
 const texture=(data,color)=>{const t=new T.DataTexture(data,n,n);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};
 // A compact atlas is used only for actual stencils; marks are chipped, not illuminated.
 const size=256,label=new Uint8Array(size*size*4),set=(x,y)=>{if(x<0||y<0||x>=size||y>=size||hash(x,y,29)<.09)return;label.set([190,185,174,240],(y*size+x)*4);};
 const glyphs={B:['11110','10001','10001','11110','10001','10001','11110'],'-':['00000','00000','00000','11111','00000','00000','00000'],'1':['00100','01100','00100','00100','00100','00100','11111']};
 let gx=24;for(const ch of 'B-11'){glyphs[ch].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')for(let iy=0;iy<7;iy++)for(let ix=0;ix<7;ix++)set(gx+x*7+ix,48+y*7+iy);}));gx+=44;}
 for(let y=128;y<220;y++)for(let x=60;x<196;x++){
  const xx=x-128,yy=y-126,w=70-yy*.70;
  if(Math.abs(xx)<w&&Math.abs(xx)>w-7&&yy<87)set(x,y);
  if((Math.abs(xx)<5&&yy<53)||(yy>17&&yy<23&&Math.abs(xx)<45)||(yy>37&&yy<43&&Math.abs(xx)<31))set(x,y);
 }
 const stencil=new T.DataTexture(label,size,size);stencil.colorSpace=T.SRGBColorSpace;stencil.flipY=true;stencil.magFilter=T.LinearFilter;stencil.minFilter=T.LinearFilter;stencil.needsUpdate=true;
 return cached={paint:texture(paint,true),rough:texture(rough,false),height:texture(height,false),stencil};
}
