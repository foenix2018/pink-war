// Fine worn paint, not oversized scratches across each small armour face.
let cached;
export function rempartSurfaces(T){
 if(cached)return cached;
 const n=512,paint=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),height=new Uint8Array(n*n*4);
 const hash=(x,y,k=0)=>{let v=Math.imul(x+17+k*71,374761393)^Math.imul(y+43,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
 const smoothNoise=(x,y,span,k)=>{
  const gx=Math.floor(x/span),gy=Math.floor(y/span),u=(x/span-gx),v=(y/span-gy),a=u*u*(3-2*u),b=v*v*(3-2*v);
  const top=hash(gx,gy,k)*(1-a)+hash(gx+1,gy,k)*a,bot=hash(gx,gy+1,k)*(1-a)+hash(gx+1,gy+1,k)*a;return top*(1-b)+bot*b;
 };
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,grain=hash(x,y),cloud=smoothNoise(x,y,87,2),mottle=smoothNoise(x,y,19,4),v=158+grain*9+cloud*22+mottle*9;
  paint.set([v+2,v,v-1,255],i);const r=174+grain*16+cloud*25;rough.set([r,r,r,255],i);const h=125+grain*4+mottle*3;height.set([h,h,h,255],i);
 }
 // Irregular spalled paint exposes darker steel and bright fractured rims.
 for(let k=0;k<90;k++){
  const cx=hash(k,19)*n,cy=hash(k,45)*n,rx=1.5+(hash(k,91)**4)*7,ry=.6+hash(k,27)*rx*.65;
  for(let dy=-Math.ceil(ry);dy<=ry;dy++)for(let dx=-Math.ceil(rx);dx<=rx;dx++){
   const dist=(dx/rx)**2+(dy/ry)**2,edge=.65+hash(dx+(cx|0),dy+(cy|0),7)*.4;if(dist>edge)continue;
   const x=((cx|0)+dx+n)%n,y=((cy|0)+dy+n)%n,i=(y*n+x)*4,g=hash(x,y,6),rim=dist>edge-.15;
   const v=rim?196+g*25:133+g*22;paint.set([v,v+1,v+2,255],i);const h=rim?134:113;height.set([h,h,h,255],i);rough.set([rim?133:176,rim?133:176,rim?133:176,255],i);
  }
 }
 for(let k=0;k<1700;k++){
  const x0=hash(k,91)*n|0,y0=hash(k,57)*n|0,len=2+(hash(k,17)**3)*32,bright=hash(k,131)>.38;
  for(let j=0;j<len;j++){let x=(x0+j)%n,y=(y0+(j*.31|0))%n;if(hash(x,y,k)<.22)continue;const i=(y*n+x)*4,v=bright?215:101;paint.set([v,v,v,255],i);height.set([bright?133:119,bright?133:119,bright?133:119,255],i);}
 }
 const texture=(data,color)=>{const t=new T.DataTexture(data,n,n);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};
 // A compact atlas is used only for actual stencils; marks are chipped, not illuminated.
 const size=256,label=new Uint8Array(size*size*4),set=(x,y)=>{if(x<0||y<0||x>=size||y>=size||hash(x,y,29)<.09)return;label.set([190,185,174,240],(y*size+x)*4);};
 const glyphs={B:['11110','10001','10001','11110','10001','10001','11110'],'-':['00000','00000','00000','11111','00000','00000','00000'],'1':['00100','01100','00100','00100','00100','00100','11111']};
 let gx=24;for(const ch of 'B-11'){glyphs[ch].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')for(let iy=0;iy<7;iy++)for(let ix=0;ix<7;ix++)set(gx+x*7+ix,48+y*7+iy);}));gx+=44;}
 const fill=points=>{for(let y=128;y<240;y++)for(let x=45;x<211;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}if(inside)set(x,y);
 }};
 for(const side of [-1,1])for(const poly of [
  [[-70,143],[-12,153],[-10,165],[-64,155]],
  [[-52,165],[-11,172],[-10,183],[-46,176]],
  [[-34,184],[-8,190],[-5,203],[-28,195]],
  [[-13,176],[-3,186],[-3,224],[-13,209]]
 ])fill(poly.map(([x,y])=>[128+x*side,y]));
 fill([[121,151],[135,151],[132,185],[128,202],[124,185]]);
 const stencil=new T.DataTexture(label,size,size);stencil.colorSpace=T.SRGBColorSpace;stencil.flipY=true;stencil.magFilter=T.LinearFilter;stencil.minFilter=T.LinearFilter;stencil.needsUpdate=true;
 const signalSize=128,signalData=new Uint8Array(signalSize*signalSize*4);
 for(let y=0;y<signalSize;y++)for(let x=0;x<signalSize;x++){
  const d=Math.hypot((x+.5)/signalSize-.5,(y+.5)/signalSize-.5)*2,alpha=Math.max(0,Math.exp(-d*d*5.5)-.004)/.996;
  signalData.set([255,255,255,Math.min(255,alpha*255)],(y*signalSize+x)*4);
 }
 const signal=new T.DataTexture(signalData,signalSize,signalSize);signal.colorSpace=T.SRGBColorSpace;signal.magFilter=T.LinearFilter;signal.minFilter=T.LinearFilter;signal.needsUpdate=true;
 return cached={signal,paint:texture(paint,true),rough:texture(rough,false),height:texture(height,false),stencil};
}
