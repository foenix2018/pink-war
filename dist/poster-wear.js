// Worn riveted plate, after the Pink Wars enemy posters (4 Nov 2026). Every armour piece of the enemy chassis carries
// its own 0–1 UV square, so each one reads as a plate: recessed seam a little inside the edge, rivets along it, chipped
// corners showing bare steel, scratches, oil grime. Colour, relief and roughness are generated once (no image download,
// no canvas: also builds in Node), shared by every enemy, and add no draw call.
let cached;
export function posterWear(T){
 if(cached)return cached;
 const n=512,color=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),relief=new Uint8Array(n*n*4);
 const hash=(x,y,s=0)=>{let h=Math.imul(x+71+s*131,374761393)^Math.imul(y+2196-s*17,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 const smooth=(x,y,cell,s)=>{const a=x/cell,b=y/cell,ix=Math.floor(a),iy=Math.floor(b),fx=a-ix,fy=b-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),m=Math.ceil(n/cell);
  const h=(i,j)=>hash(((i%m)+m)%m,((j%m)+m)%m,s);return (h(ix,iy)*(1-u)+h(ix+1,iy)*u)*(1-v)+(h(ix,iy+1)*(1-u)+h(ix+1,iy+1)*u)*v;};
 const fbm=(x,y,s)=>smooth(x,y,128,s)*.5+smooth(x,y,48,s+1)*.3+smooth(x,y,16,s+2)*.2;
 // Layers: value (0–1 brightness), height (0–1), roughness (0–1).
 const val=new Float32Array(n*n),hgt=new Float32Array(n*n),rgh=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,u=x/n,v=y/n,d=Math.min(u,v,1-u,1-v),grain=hash(x,y),grime=fbm(x,y,5),mottle=fbm(x,y,11);
  // Oil and soot pool towards the lower part of each plate.
  let value=.60+mottle*.16+grain*.05-(grime>.56?(grime-.56)*1.1:0)-Math.max(0,v-.62)*.18*grime;
  let height=.5+(grain-.5)*.04,r=.58+grime*.22+grain*.05;
  // Bevel catch-light and chipped paint on the very edge.
  if(d<.022){const chip=fbm(x*1.7,y*1.7,23);value+=.10;if(chip>.5){value=.88+grain*.08;r=.30;height-=.04;}}
  // Recessed seam a little inside the edge.
  if(d>.034&&d<.044){value*=.42;height=.18;r=.85;}
  val[i]=value;hgt[i]=height;rgh[i]=r;
 }
 const stamp=(cx,cy,radius,fn)=>{const r=Math.ceil(radius*n),x0=Math.round(cx*n),y0=Math.round(cy*n);
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=x0+dx,y=y0+dy;if(x<0||y<0||x>=n||y>=n)continue;const t=Math.hypot(dx,dy)/(radius*n);if(t<=1)fn(y*n+x,t,dx/(radius*n),dy/(radius*n));}};
 // Rivets along the seam: domed heads lit from the upper left, with a dark ring.
 for(let k=0;k<6;k++){const s=(k+.5)/6;for(const [cx,cy] of [[s,.07],[s,.93],[.07,s],[.93,s]])stamp(cx,cy,.016,(i,t,dx,dy)=>{
  if(t>.78){val[i]*=.45;hgt[i]=.35;return;}const dome=Math.sqrt(1-t*t);val[i]=.55+dome*.25-(dx+dy)*.18;hgt[i]=.62+dome*.36;rgh[i]=.42;});}
 // Chipped impacts: bare steel with a dark burr.
 for(let k=0;k<26;k++){const cx=.1+hash(k,3,7)*.8,cy=.1+hash(k,9,7)*.8,rad=.006+hash(k,1,7)**2*.024;
  stamp(cx,cy,rad,(i,t,dx,dy)=>{const ragged=t+(hash(Math.round(dx*90)+k,Math.round(dy*90),3)-.5)*.35;if(ragged>1)return;
   if(ragged>.78){val[i]*=.55;hgt[i]-=.05;}else{val[i]=.86+hash(i,k,4)*.1;rgh[i]=.28;hgt[i]=.40;}});}
 // Scratches: short bright gouges, mostly along one drag direction.
 for(let k=0;k<180;k++){const ang=(hash(k,2,9)<.7?-.35:1.2)+(hash(k,4,9)-.5)*.6,len=.015+hash(k,5,9)**2*.14,cx=hash(k,6,9),cy=hash(k,8,9),steps=Math.ceil(len*n);
  for(let s=0;s<steps;s++){const x=Math.round((cx+Math.cos(ang)*s/n)*n),y=Math.round((cy+Math.sin(ang)*s/n)*n);if(x<1||y<1||x>=n-1||y>=n-1)continue;const i=y*n+x;
   val[i]=Math.min(1,val[i]+.28);hgt[i]-=.08;rgh[i]=.33;val[i+n]*=.85;}}
 for(let i=0;i<n*n;i++){
  const c=Math.max(0,Math.min(255,val[i]*255));color[i*4]=c*1.01;color[i*4+1]=c;color[i*4+2]=c*.97;color[i*4+3]=255;
  const r=Math.max(40,Math.min(250,rgh[i]*255));rough[i*4]=rough[i*4+1]=rough[i*4+2]=r;rough[i*4+3]=255;
  const h=Math.max(0,Math.min(255,hgt[i]*255));relief[i*4]=relief[i*4+1]=relief[i*4+2]=h;relief[i*4+3]=255;
 }
 const make=(data,srgb)=>{const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
  t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;};
 return cached={paint:make(color,true),rough:make(rough,false),relief:make(relief,false)};
}
// Plates are textured ≈0.62 grey on average, so the material colour is lifted to keep the poster graphite while the
// chips and scratches reach bare steel.
export function applyPosterWear(material,maps,{color,bump=.0035,roughness=.85,metalness=.72}={}){
 material.map=maps.paint;material.roughnessMap=maps.rough;material.bumpMap=maps.relief;material.bumpScale=bump;
 if(color!==undefined)material.color.setHex(color);material.roughness=roughness;material.metalness=metalness;material.needsUpdate=true;
 material.userData.posterWear=true;return material;
}
