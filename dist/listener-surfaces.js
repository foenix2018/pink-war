// Local, shared surface maps for the E-06. No remote assets or per-frame work.
let cached;
export function listenerSurfaces(T){
 if(cached)return cached;
 const n=512,paint=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),relief=new Uint8Array(n*n*4),label=new Uint8Array(128*128*4);
 const hash=(x,y)=>{let h=Math.imul(x+37,374761393)^Math.imul(y+91,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,grain=hash(x,y),edge=Math.min(x,y,n-1-x,n-1-y);
  const scratch=(y+Math.floor(x/43)*7)%113===0&&grain>.44,chip=edge<4&&grain>.46;
  const v=chip?229:scratch?182:202+grain*17;
  paint.set([v,Math.max(0,v-2),Math.max(0,v-5),255],i);
  const r=chip?122:178+grain*35;rough.set([r,r,r,255],i);
  relief.set([128,128,128,255],i);
 }
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,v=48+hash(x,y)*8;label.set([v,v,v,255],i);
 }
 const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)label.set([...c,255],((127-j)*128+i)*4);};
 const digits=['111101101101111','111001111001111'];
 digits.forEach((glyph,k)=>{for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(glyph[y*3+x]==='1')rect(25+k*43+x*9,18+y*10,8,9,[213,211,203]);});
 for(let x=22;x<106;x+=3)if(hash(x,1)>.24)rect(x,83,1+(x%2),15,[167,166,157]);
 rect(22,105,84,2,[128,126,118]);rect(22,113,54,1,[128,126,118]);
 // Short broken abrasions and paint chips, with exposed metal in the roughness map.
 for(let k=0;k<240;k++){
  const x=Math.floor(hash(k,4)*n),y=Math.floor(hash(k,8)*n),length=3+Math.floor(hash(k,12)*19);
  for(let t=0;t<length;t++){
   const a=(x+t)%n,b=(y+Math.floor(t*.28))%n,i=(b*n+a)*4;
   if(hash(a,b)>.25){paint.set([159,158,153,255],i);rough.set([112,112,112,255],i);relief.set([114,114,114,255],i);}
  }
 }
 // Inset panel edges and small recessed fasteners add relief at game scale.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4;
  const inset=(x===65||x===66||x===446||x===447)&&y>80&&y<432;
  if(inset){paint.set([132,130,125,255],i);relief.set([92,92,92,255],i);}
  for(const [cx,cy] of [[100,112],[412,112],[100,400],[412,400]]){
   const d=Math.hypot(x-cx,y-cy);
   if(d>6&&d<8){paint.set([85,84,80,255],i);relief.set([96,96,96,255],i);}
   else if(d<6){paint.set([164,163,158,255],i);relief.set([157,157,157,255],i);if(Math.abs(y-cy)<1.5){paint.set([64,64,62,255],i);relief.set([100,100,100,255],i);}}
  }
 }
 const atlas=(source,kind)=>{
  const pixels=new Uint8Array(n*n*8);pixels.set(source);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=((y+n)*n+x)*4,grid=x%22<2||y%22<2,grain=hash(x,y);
   const v=kind==='paint'?(grid?91:170+grain*13):kind==='rough'?(grid?196:146+grain*20):(grid?90:128);
   pixels.set([v,v,Math.max(0,v-(kind==='paint'?3:0)),255],i);
  }
  return pixels;
 };
 const texture=(data,w,h,srgb)=>{const t=new T.DataTexture(data,w,h);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 const iris=new Uint8Array(256*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4;let v=255;
  if(x>=128){const u=(x-192)/63,w=(y-64)/63,r=Math.hypot(u,w),angle=Math.atan2(w,u);v=r<.25?12:r>.94?46:r>.70?250:85+Math.cos(angle*32)*22+Math.sin(r*120)*16;if(Math.hypot(u+.23,w-.27)<.10)v=255;}
  iris.set([v,v,v,255],i);
 }
 const maps={optics:texture(iris,256,128,true),paint:texture(atlas(paint,'paint'),n,n*2,true),rough:texture(atlas(rough,'rough'),n,n*2,false),relief:texture(atlas(relief,'relief'),n,n*2,false),label:texture(label,128,128,true)};
 maps.optics.repeat.set(.5,1);
 for(const key of ['paint','rough','relief'])maps[key].repeat.set(1,.5);
 return cached=maps;
}
