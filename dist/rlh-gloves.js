import * as THREE from './vendor/three.webgpu.min.js';
import { merge } from './geo.js';
// Adapted from the user-supplied RLH gants pompier G D WebGPU V40.html.
// Source SHA256: d8a7383c815755b25ddd70da5725ee56c8643de03a76895c1e2cc5ad53361abb
// Original palm loft, leather overlays, seams and joints are retained. The cuff
// now carries original AÉGIS combat armour, sharing the same anatomical axis.
const TUILE=40; // tuiles par mètre
function cvTex(w,h,draw,srgb=true){
  if(typeof document==='undefined')return new THREE.Texture();
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8;
  if(srgb) t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function bruit(ctx,w,h,n,f){ for(let i=0;i<n;i++) f(Math.random()*w,Math.random()*h); }

/* textile technique (aramide) : sergé visible */
function texTextile(base,a,b){
  return cvTex(512,512,(g,w,h)=>{
    g.fillStyle=base; g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=4) for(let x=0;x<w;x+=4){
      const d=((x/4+y/4)%4<2);                 // diagonale du sergé
      g.fillStyle=d?a:b; g.globalAlpha=.55; g.fillRect(x,y,3,3);
    }
    g.globalAlpha=.18; bruit(g,w,h,6000,(x,y)=>{ g.fillStyle=Math.random()<.5?'#000':'#fff'; g.fillRect(x,y,1,1); });
    g.globalAlpha=1;
  });
}
function texTextileBump(){
  return cvTex(512,512,(g,w,h)=>{
    g.fillStyle='rgb(110,110,110)'; g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=4) for(let x=0;x<w;x+=4){
      const d=((x/4+y/4)%4<2); g.fillStyle=d?'rgb(190,190,190)':'rgb(140,140,140)'; g.fillRect(x,y,3,3);
    }
  },false);
}
/* cuir grainé */
function texCuir(base,sombre){
  return cvTex(512,512,(g,w,h)=>{
    g.fillStyle=base; g.fillRect(0,0,w,h);
    bruit(g,w,h,9000,(x,y)=>{ const r=.8+Math.random()*2.6, a=.05+Math.random()*.16;
      g.fillStyle=Math.random()>.55?`rgba(255,255,255,${a*.22})`:`rgba(0,0,0,${a})`;
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); });
    g.strokeStyle='rgba(0,0,0,.22)'; g.lineWidth=1;
    for(let i=0;i<60;i++){ g.beginPath(); let x=Math.random()*w,y=Math.random()*h; g.moveTo(x,y);
      for(let k=0;k<5;k++){ x+=(Math.random()-.5)*60; y+=(Math.random()-.5)*60; g.lineTo(x,y);} g.stroke(); }
    g.globalAlpha=.15; g.fillStyle=sombre; bruit(g,w,h,1500,(x,y)=>g.fillRect(x,y,2,2)); g.globalAlpha=1;
  });
}
function texCuirBump(){
  return cvTex(512,512,(g,w,h)=>{
    g.fillStyle='rgb(128,128,128)'; g.fillRect(0,0,w,h);
    bruit(g,w,h,9000,(x,y)=>{ const v=80+Math.random()*110|0; g.fillStyle=`rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(x,y,.8+Math.random()*2.4,0,Math.PI*2); g.fill(); });
    g.strokeStyle='rgb(60,60,60)'; g.lineWidth=1.5;
    for(let i=0;i<60;i++){ g.beginPath(); let x=Math.random()*w,y=Math.random()*h; g.moveTo(x,y);
      for(let k=0;k<5;k++){ x+=(Math.random()-.5)*60; y+=(Math.random()-.5)*60; g.lineTo(x,y);} g.stroke(); }
  },false);
}
/* protections moulées : damier carbone */
function texCarbone(base='#252a2f',hi='#3d444a',lo='#14181b'){
  return cvTex(256,256,(g,w,h)=>{
    g.fillStyle=base; g.fillRect(0,0,w,h); const c=8;
    for(let y=0;y<h;y+=c) for(let x=0;x<w;x+=c){ const f=((x/c)+(y/c))%2===0;
      g.globalAlpha=.34; g.fillStyle=f?hi:lo; g.fillRect(x,y,c,c/2); g.fillStyle=f?lo:hi; g.fillRect(x,y+c/2,c,c/2); }
    g.globalAlpha=1;
  });
}
function texCarboneBump(){
  return cvTex(256,256,(g,w,h)=>{ const c=8;
    for(let y=0;y<h;y+=c) for(let x=0;x<w;x+=c){ const v=(((x/c)+(y/c))%2===0)?170:90;
      g.fillStyle=`rgb(${v},${v},${v})`; g.fillRect(x,y,c,c/2); g.fillStyle=`rgb(${255-v},${255-v},${255-v})`; g.fillRect(x,y+c/2,c,c/2); }
  },false);
}
/* bande rétroréfléchissante (micro-billes) */
function texReflect(){
  return cvTex(256,128,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,w,0);
    gr.addColorStop(0,'#9da1a5'); gr.addColorStop(.5,'#dcdfe2'); gr.addColorStop(1,'#92969a');
    g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.globalAlpha=.22; bruit(g,w,h,5000,(x,y)=>{ g.fillStyle='#fff'; g.fillRect(x,y,1,1); });
    g.globalAlpha=.12; for(let x=0;x<w;x+=6){ g.fillStyle='#fff'; g.fillRect(x,0,1,h); }
    g.globalAlpha=1;
  });
}
/* velcro (bande auto-agrippante) */
function texVelcro(){
  return cvTex(128,128,(g,w,h)=>{
    g.fillStyle='#16191c'; g.fillRect(0,0,w,h);
    bruit(g,w,h,2600,(x,y)=>{ const v=30+Math.random()*40|0; g.fillStyle=`rgb(${v},${v},${v+4})`; g.fillRect(x,y,1.5,1.5); });
  });
}

const se=(c,n)=>Math.sign(c)*Math.pow(Math.abs(c),2/n);

/* Section de « loft » : superellipse asymétrique dos / paume.
   s = {y, w (demi-largeur), cx, cz, db (dos), dp (paume), n} */
function interpSections(S,y){
  if(y<=S[0].y) return S[0]; if(y>=S[S.length-1].y) return S[S.length-1];
  for(let i=0;i<S.length-1;i++){ const a=S[i],b=S[i+1];
    if(y>=a.y&&y<=b.y){ const t=(y-a.y)/(b.y-a.y), u=t*t*(3-2*t)*.35+t*.65;
      const o={y}; for(const k of ['w','cx','cz','db','dp','n']) o[k]=(a[k]??(k==='n'?2.6:0))*(1-u)+(b[k]??(k==='n'?2.6:0))*u; return o; } }
}
function pointLoft(S,t,y,off,sx){
  const s=interpSections(S,y), c=Math.cos(t), si=Math.sin(t), n=s.n||2.6;
  return new THREE.Vector3(sx*((s.cx||0)+(s.w+off)*se(c,n)), y, (s.cz||0)+((si>=0?s.db:s.dp)+off)*se(si,n));
}
/* surface lofté : t0..t1 autour, y0..y1 le long ; fermée si tour complet */
function loft(S,{y0,y1,ny=24,nt=56,t0=0,t1=Math.PI*2,off=0,sx=1,capHaut=false,flipU=false}={}){
  const pos=[],uv=[],idx=[];
  const full=Math.abs(t1-t0-Math.PI*2)<1e-6;
  for(let i=0;i<=ny;i++){
    const y=y0+(y1-y0)*i/ny;
    let per=0, prev=null;
    for(let j=0;j<=nt;j++){
      const t=t0+(t1-t0)*j/nt, p=pointLoft(S,t,y,off,sx);
      if(prev) per+=p.distanceTo(prev); prev=p;
      pos.push(p.x,p.y,p.z);
      uv.push((flipU?-per:per)*TUILE, y*TUILE);
    }
  }
  const R=nt+1;
  for(let i=0;i<ny;i++) for(let j=0;j<nt;j++){
    const a=i*R+j,b=a+1,c=a+R,d=c+1;
    if(sx>0){ idx.push(a,c,b, b,c,d); } else { idx.push(a,b,c, b,d,c); }
  }
  if(capHaut){
    const s=interpSections(S,y1), ci=pos.length/3;
    pos.push(sx*(s.cx||0), y1+.002, s.cz||0); uv.push(0,y1*TUILE);
    const base=ny*R;
    for(let j=0;j<nt;j++){ if(sx>0) idx.push(base+j,ci,base+j+1); else idx.push(base+j,base+j+1,ci); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals();
  if(full){ /* soudure des normales sur la couture u=0 / u=1 */
    const n=g.attributes.normal;
    for(let i=0;i<=ny;i++){ const a=i*R, b=i*R+nt;
      const x=(n.getX(a)+n.getX(b))/2, y=(n.getY(a)+n.getY(b))/2, z=(n.getZ(a)+n.getZ(b))/2, l=Math.hypot(x,y,z)||1;
      n.setXYZ(a,x/l,y/l,z/l); n.setXYZ(b,x/l,y/l,z/l); }
  }
  return g;
}
/* phalange : capsule effilée (tour), aplatie dos/paume par l'échelle z */
function profilPhalange(r0,r1,L,n=7){
  const p=[];
  for(let i=0;i<=n;i++){ const a=-Math.PI/2+i/n*Math.PI/2; p.push(new THREE.Vector2(Math.max(1e-4,Math.cos(a)*r0), Math.sin(a)*r0)); }
  for(let i=1;i<=n;i++){ const a=i/n*Math.PI/2; p.push(new THREE.Vector2(Math.max(1e-4,Math.cos(a)*r1), L+Math.sin(a)*r1)); }
  return p;
}
function tour(profil,seg=22,phi0=0,phiL=Math.PI*2){
  const g=new THREE.LatheGeometry(profil,seg,phi0,phiL);
  /* UV à l'échelle réelle */
  let len=0; for(let i=1;i<profil.length;i++) len+=profil[i].distanceTo(profil[i-1]);
  let rmax=0; profil.forEach(p=>rmax=Math.max(rmax,p.x));
  const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*rmax*phiL*TUILE, uv.getY(i)*len*TUILE);
  return g;
}
function decaler(profil,d,y0=-1e9,y1=1e9){
  // RLH's capsule profile has only cap samples. Interior guard ranges need
  // interpolated edge samples; simply filtering that profile made them empty.
  const result=profil.filter(p=>p.y>=y0&&p.y<=y1).map(p=>new THREE.Vector2(p.x+d,p.y));
  for(const y of [y0,y1])if(y>profil[0].y&&y<profil[profil.length-1].y&&!result.some(p=>Math.abs(p.y-y)<1e-9)){
    for(let i=1;i<profil.length;i++)if(y>=profil[i-1].y&&y<=profil[i].y){const a=profil[i-1],b=profil[i],t=(y-a.y)/(b.y-a.y);result.push(new THREE.Vector2(a.x+(b.x-a.x)*t+d,y));break;}
  }
  return result.sort((a,b)=>a.y-b.y);
}

/* couture : fil tubulaire le long d'une polyligne */
function sourceSeam(parent,pts,r=.00042,material){
  if(pts.length<2) return;
  const c=new THREE.CatmullRomCurve3(pts);
  const m=new THREE.Mesh(new THREE.TubeGeometry(c,Math.max(8,pts.length*3),r,4,false),material);
  m.castShadow=false; parent.add(m); return m;
}
function maille(g,mat,parent,{p=[0,0,0],r=[0,0,0],s=[1,1,1],nom,ombre=true}={}){
  const m=new THREE.Mesh(g,mat); m.position.set(...p); m.rotation.set(...r); m.scale.set(...s);
  m.castShadow=ombre; m.receiveShadow=true; if(nom) m.name=nom; parent.add(m); return m;
}

/* =======================================================================
   GABARITS ANATOMIQUES (gant droit, mètres, pivot = centre du poignet)
   x : latéral (pouce du gant droit vers −x) · y : vers les doigts · z : dos +
   ======================================================================= */
export const RLH_PALM_SECTIONS=[
  {y:-.014,w:.041,cx:0,    cz:.001,db:.022,dp:.020,n:2.3},
  {y: .010,w:.043,cx:-.001,cz:.001,db:.023,dp:.021,n:2.4},
  {y: .038,w:.048,cx:-.003,cz:.001,db:.024,dp:.023,n:2.7},
  {y: .068,w:.051,cx:-.001,cz:.001,db:.024,dp:.021,n:2.9},
  {y: .092,w:.052,cx: .001,cz:.001,db:.022,dp:.019,n:3.0},
  {y: .108,w:.050,cx: .001,cz:.000,db:.019,dp:.017,n:2.9},
  {y: .118,w:.044,cx: .001,cz:.000,db:.015,dp:.014,n:2.6},
  {y: .124,w:.030,cx: .001,cz:.000,db:.009,dp:.009,n:2.3}
];
const MANCHETTE=(()=>[
  {y: .004,w:.0425,cz:.001,db:.0235,dp:.0215,n:2.3},
  {y:-.018,w:.0455,cz:.001,db:.0275,dp:.0255,n:2.25},
  {y:-.048,w:.0515,cz:.001,db:.0340,dp:.0320,n:2.2},
  {y:-.090,w:.0585,cz:.001,db:.0410,dp:.0390,n:2.15},
  {y:-.128,w:.0640,cz:.001,db:.0460,dp:.0440,n:2.12},
  {y:-.142,w:.0640,cz:.001,db:.0460,dp:.0430,n:2.3},
  {y:-.190,w:.0670,cz:.001,db:.0480,dp:.0450,n:2.3},
  {y:-.242,w:.0640,cz:.001,db:.0450,dp:.0420,n:2.25}
].sort((a,b)=>a.y-b.y))();
// Undersuit forearm continuing the cuff's last section towards the elbow.
const AVANT_BRAS=[
  {y:-.560,w:.0585,cz:.001,db:.0420,dp:.0400,n:2.1},
  {y:-.480,w:.0600,cz:.001,db:.0430,dp:.0410,n:2.1},
  {y:-.380,w:.0612,cz:.001,db:.0438,dp:.0415,n:2.15},
  {y:-.290,w:.0628,cz:.001,db:.0446,dp:.0420,n:2.2},
  {y:-.226,w:.0640,cz:.001,db:.0450,dp:.0420,n:2.25}
];
// FPS arm variant (feedback of 7 Nov 2026: forearms too thin). The wrist stays exactly as it was; from there the cuff
// flares to a muscular forearm (≈1.3× at its fullest, flexor mass below the elbow) and the undersuit tapers to the elbow.
const armGrowth=y=>{const t=Math.min(1,Math.max(0,(-.045-y)/.16)),s=t*t*(3-2*t);return 1+.20*s+.10*Math.exp(-(((y+.33)/.13)**2));};
const grow=s=>{const f=armGrowth(s.y)*(1-.14*Math.min(1,Math.max(0,(-.47-s.y)/.11)));return {...s,w:s.w*f,db:s.db*f*1.07,dp:s.dp*f*1.07};};
const MANCHETTE_ARM=MANCHETTE.map(grow);
const AVANT_BRAS_ARM=[-.575,-.54,-.48,-.40,-.32,-.26,-.226].map(y=>{
  const i=AVANT_BRAS.findIndex(a=>a.y>=y),b=AVANT_BRAS[Math.max(0,i)],a=AVANT_BRAS[Math.max(0,i-1)],t=a===b?0:(y-a.y)/(b.y-a.y);
  const mix=k=>a[k]+(b[k]-a[k])*t;return grow({y,w:mix('w'),cz:.001,db:mix('db'),dp:mix('dp'),n:mix('n')});
});
// Flexible wrist: cuff vertices from WRIST_BLEND[0] up to the wrist ring follow
// the hand progressively, so a bent forearm never shows a hard kink.
export const WRIST_BLEND=Object.freeze([-.078,-.004]);
export const RLH_DIGITS={
  index :{x:-.0335,y:.110,z:.000,r:.0104,L:[.044,.027,.023],ecart:-.07,repos:.10},
  middle:{x:-.0110,y:.116,z:.001,r:.0109,L:[.049,.031,.025],ecart:-.02,repos:.13},
  ring  :{x: .0120,y:.113,z:.001,r:.0103,L:[.046,.029,.024],ecart: .03,repos:.17},
  pinky :{x: .0330,y:.103,z:.000,r:.0091,L:[.036,.022,.021],ecart: .09,repos:.22}
};
const NOMS_DOIGTS={index:'index',middle:'majeur',ring:'annulaire',pinky:'auriculaire'};

// Low-poly, closed, bevelled composite shell in local dorsal (+Z) coordinates.
 // Every finger plate is bound to its original phalanx; the palm and grip
 // surface stay unchanged. Curve the transverse edges down onto the liner.
// Closed, doubly curved hard shell: a broad convex crown, rolled bevels,
// anatomically tapered outline and a recessed underside. Real subdivisions
// keep the surface curved even in close-up, rather than a flat extruded polygon.
function dorsalGuard(width,length,depth=.0022,bevel=.0008,curve=.0018){
 const nx=width>.04?8:width>.012?4:2,ny=length>.04?10:length>.015?5:3,stride=nx+1,layer=stride*(ny+1),pos=[],uv=[],idx=[];
 const clamp=THREE.MathUtils.clamp;
 for(let side=0;side<2;side++)for(let j=0;j<=ny;j++){
   const v=j/ny, taper=.73+.27*Math.sin(Math.PI*v)**.46;
   for(let i=0;i<=nx;i++){
     const u=i/nx*2-1, x=width*.5*taper*u, y=length*v;
     const rim=clamp(Math.min((1-Math.abs(u))*width*.5,v*length,(1-v)*length)/Math.max(bevel,1e-6),0,1);
     const dome=(1-u*u)*Math.sin(Math.PI*v);
     const z=-curve*u*u + .18*curve*dome+(side?depth*(.40+.60*Math.sin(rim*Math.PI/2))+.34*curve*dome:0);
     pos.push(x,y,z);uv.push(x*40,y*40);
   }
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const a=j*stride+i,b=a+1,c=a+stride,d=c+1;
   idx.push(a,c,b,b,c,d,a+layer,b+layer,c+layer,b+layer,d+layer,c+layer);
 }
 const outline=[];for(let i=0;i<nx;i++)outline.push(i);
 for(let j=0;j<ny;j++)outline.push(j*stride+nx);
 for(let i=nx;i>0;i--)outline.push(ny*stride+i);
 for(let j=ny;j>0;j--)outline.push(j*stride);
 for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];idx.push(a,b,a+layer,b,b+layer,a+layer);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Palm flank panels follow the actual superellipse and do not cross the
// finger roots. A welded perimeter joins the outer shell and inner backing.
function dorsalFlank(S,{y0,y1,t0,t1,off=.002,depth=.002}){
 const rows=7,cols=6,stride=cols+1,layer=(rows+1)*stride,pos=[],uv=[],idx=[];
 for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const v=j/rows,u=i/cols,y=y0+(y1-y0)*v;
   const trim=.13*Math.abs(2*v-1)**3,t=t0+(t1-t0)*(trim+(1-2*trim)*u);
   const crown=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
   const p=pointLoft(S,t,y,off+(side?depth*(.45+.55*crown):0),1);
   pos.push(p.x,p.y,p.z);uv.push(u*.8,y*40);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;idx.push(a,b,c,b,d,c,a+layer,c+layer,b+layer,b+layer,c+layer,d+layer);}
 const outline=[];for(let i=0;i<cols;i++)outline.push(i);for(let j=0;j<rows;j++)outline.push(j*stride+cols);for(let i=cols;i>0;i--)outline.push(rows*stride+i);for(let j=rows;j>0;j--)outline.push(j*stride);
 for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];idx.push(a,a+layer,b,b,a+layer,b+layer);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

// Angular vambrace plate (reference sheet: Standard / Stealth / Heavy): a closed shell that follows the
// forearm sections with few, flat facets and a chamfered crown, so it reads as machined armour, not cloth.
function armorShell(S,{y0,y1,t0,t1,off=.006,depth=.004,nt=4,ny=3,chamfer=.35,sx=1}){
 const ring=(o,inset)=>{const rows=[];const dy=(y1-y0)*inset*.10,dt=(t1-t0)*inset*.10;
   for(let j=0;j<=ny;j++){const y=y0+dy+(y1-y0-2*dy)*j/ny,row=[];for(let i=0;i<=nt;i++){const t=t0+dt+(t1-t0-2*dt)*i/nt;row.push(pointLoft(S,t,y,o,sx));}rows.push(row);}return rows;};
 const inner=ring(off,0),outer=ring(off+depth,chamfer),pos=[];
 const quad=(a,b,c,d)=>{pos.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z,b.x,b.y,b.z,d.x,d.y,d.z,c.x,c.y,c.z);};
 const flip=sx<0;
 const face=(a,b,c,d)=>flip?quad(a,c,b,d):quad(a,b,c,d);
 for(let j=0;j<ny;j++)for(let i=0;i<nt;i++){face(outer[j][i],outer[j][i+1],outer[j+1][i],outer[j+1][i+1]);face(inner[j][i],inner[j+1][i],inner[j][i+1],inner[j+1][i+1]);}
 for(let i=0;i<nt;i++){face(inner[0][i],inner[0][i+1],outer[0][i],outer[0][i+1]);face(outer[ny][i],outer[ny][i+1],inner[ny][i],inner[ny][i+1]);}
 for(let j=0;j<ny;j++){face(inner[j][0],outer[j][0],inner[j+1][0],outer[j+1][0]);face(outer[j][nt],inner[j][nt],outer[j+1][nt],inner[j+1][nt]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 const uv=[];for(let i=0;i<pos.length;i+=3)uv.push(pos[i]*40,pos[i+1]*40);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.computeVertexNormals();return g;
}
// Outfit tiers carried by a glove part: visible from `min` to `max` (outfit stages 1–5).
const tier=(mesh,min=1,max=10)=>{mesh.userData.minLevel=min;mesh.userData.maxLevel=max;return mesh;};

/* =======================================================================
   CONSTRUCTION D'UN GANT (côté 'D' ou 'G')
   ======================================================================= */
function buildSourceGlove(M,labelMaterial,{sleeve=true,arm=false}={}){
  const couture=(parent,pts,r)=>sourceSeam(parent,pts,r,M.fil);
  const SEC=sleeve&&arm?MANCHETTE_ARM:MANCHETTE,ARM_SEC=AVANT_BRAS_ARM;
  const cote='D';
  const sx = cote==='D' ? 1 : -1;       // le gant gauche est le miroir exact du droit
  const P=(x,y,z)=>[sx*x,y,z];
  const R=(rx,ry,rz)=>[rx,sx*ry,sx*rz];
  const V=(x,y,z)=>new THREE.Vector3(sx*x,y,z);
  const pref=cote+'_';

  const racine=new THREE.Bone(); racine.name='Gant_'+cote;
  const avantBras=new THREE.Bone(); avantBras.name=pref+'manchette'; racine.add(avantBras);
  const poignetA=new THREE.Bone(); poignetA.name=pref+'poignet'; racine.add(poignetA);
  const poignetB=new THREE.Bone(); poignetB.name=pref+'poignet_2'; poignetA.add(poignetB);
  const main=new THREE.Bone(); main.name=pref+'main'; poignetB.add(main);
  const protections=new THREE.Bone(); protections.name=pref+'protections';

  /* ---------- AÉGIS sleeve: tapered shell / flexible wrist ---------- */
  // The native forearm bone remains separate from the two flexing wrist bones.
  // No piece crosses the palm or changes the hand/weapon attachment frame.
  const sleeveEnd=sleeve?-.242:-.024;
  maille(loft(SEC,{y0:sleeveEnd,y1:.004,ny:sleeve?24:6,nt:40,sx}),M.caout,avantBras,{nom:pref+'joint_avant_bras'});
  maille(loft(SEC,{y0:sleeveEnd,y1:-.004,ny:12,nt:32,sx,off:-.0022}),M.doublure,avantBras,{nom:pref+'manchette_doublure',ombre:false});
  // Three narrow rubber bellows preserve a natural, straight wrist transition.
  for(const y of [-.026,-.017,-.008])maille(loft(SEC,{y0:y,y1:y+.004,ny:2,nt:36,sx,off:.001}),M.textile2,avantBras,{nom:pref+'joint_souple'});
  if(sleeve){
    // Curved shell segments follow anatomical cross-sections instead of boxes.
    // Folded edge strips and sealed ends give each plate genuine thickness.
    const shell=(mat,y0,y1,t0,t1,off=.003,name='plaque')=>{
      const pieces=[loft(SEC,{y0,y1,ny:10,nt:22,t0,t1,sx,off}),
        loft(SEC,{y0,y1,ny:10,nt:22,t0:t1,t1:t0,sx,off:off-.002})];
      for(const y of [y0,y1]){
        const vertices=[],uv=[],idx=[];
        for(let j=0;j<=22;j++)for(const o of [off-.002,off]){
          const p=pointLoft(SEC,t0+(t1-t0)*j/22,y,o,sx);vertices.push(p.x,p.y,p.z);uv.push(j/22,o);
        }
        for(let j=0;j<22;j++){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();pieces.push(g);
      }
      for(const t of [t0,t1]){
        const vertices=[],uv=[],idx=[];
        for(let j=0;j<=10;j++)for(const o of [off-.002,off]){const y=y0+(y1-y0)*j/10,p=pointLoft(SEC,t,y,o,sx);vertices.push(p.x,p.y,p.z);uv.push(j/10,o);}
        for(let j=0;j<10;j++){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();pieces.push(g);
      }
      const geometry=merge(pieces);pieces.forEach(g=>g.dispose());return maille(geometry,mat,avantBras,{nom:pref+name});
    };
    shell(M.reflect,-.222,-.046,.20,Math.PI-.20,.004,'blindage_titane');
    shell(M.carbone,-.207,-.050,Math.PI+.30,Math.PI*2-.30,.003,'protection_interne');
    // Offset overlapping plates give a segmented, manufactured silhouette.
    shell(M.matelasse,-.218,-.125,.62,Math.PI-.62,.007,'plaque_identite');
    shell(M.carbone,-.117,-.049,.52,Math.PI-.52,.007,'plaque_poignet');
    shell(M.hiVis,-.205,-.140,1.41,1.73,.010,'incrustation_unite');
    for(const t of [.26,Math.PI-.26]){
      const pts=Array.from({length:13},(_,i)=>pointLoft(SEC,t,-.207+i*.012,.006,sx));
      maille(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.0017,5,false),M.metal,avantBras,{nom:pref+'arete_metal'});
      for(const y of [-.194,-.064]){
        const p=pointLoft(SEC,t,y,.007,sx);
        maille(new THREE.SphereGeometry(.0028,8,5),M.metal,avantBras,{p:p.toArray(),nom:pref+'vis'});
      }
    }
    // A low-profile elbow lip replaces the flared firefighter cuff/hi-vis band.
    shell(M.caout,-.241,-.226,.12,Math.PI*2+.12,.0006,'joint_coude');
    const g=loft(SEC,{y0:-.196,y1:-.180,ny:2,nt:12,t0:1.05,t1:1.38,sx,off:.010});
    const uv=g.attributes.uv,pz=g.attributes.position;let umin=Infinity,umax=-Infinity;
    for(let i=0;i<uv.count;i++){umin=Math.min(umin,uv.getX(i));umax=Math.max(umax,uv.getX(i));}
    for(let i=0;i<uv.count;i++)uv.setXY(i,1-(uv.getX(i)-umin)/(umax-umin),(pz.getY(i)+.196)/.016);
    maille(g,labelMaterial,avantBras,{nom:pref+'identification_tactique',ombre:false});
  }
  if(sleeve&&arm){
    // FPS forearm: the undersuit slides into the cuff's elbow lip and carries on
    // to a closed elbow, so the gauntlet never ends on an open rim in view.
    const elbow=ARM_SEC[0].y,lip=ARM_SEC.at(-1).y;
    maille(loft(ARM_SEC,{y0:elbow,y1:lip,ny:18,nt:40,sx,off:-.0016}),M.caout,avantBras,{nom:pref+'avant_bras'});
    for(const y of [-.300,-.360,-.420])maille(loft(ARM_SEC,{y0:y-.005,y1:y,ny:2,nt:36,sx,off:.0004}),M.textile2,avantBras,{nom:pref+'avant_bras_nervure'});
    // Back-of-forearm armour plate and a padded elbow, on the same anatomical sections.
    const plate=(mat,ya,yb,ta,tb,off,name)=>maille(loft(ARM_SEC,{y0:ya,y1:yb,ny:8,nt:18,t0:ta,t1:tb,sx,off}),mat,avantBras,{nom:pref+name});
    // Shadow Unit ceramic vambrace: shells that follow the forearm's own sections, a dark spine under the accent line.
    // Tenue 1 (tissu technique) : the light ceramic vambrace with its cinch straps.
    tier(plate(M.ceramique,-.535,-.255,.30,Math.PI-.30,.0058,'brassard_ceramique'),1,1);
    tier(plate(M.ceramique,-.535,-.255,Math.PI+.42,Math.PI*2-.42,.0040,'brassard_ceramique_interne'),1,1);
    tier(plate(M.carbone,-.470,-.300,.74,Math.PI-.74,.0098,'brassard_nervure'),1,1);
    tier(plate(M.hiVis,-.490,-.285,1.50,1.64,.0112,'liseré_avant_bras'),1,1);
    plate(M.matelasse,-.545,-.478,.30,Math.PI-.30,.0030,'coudiere');
    for(const y of [-.352,-.448]){
      tier(maille(loft(ARM_SEC,{y0:y-.020,y1:y,ny:2,nt:44,sx,off:.0070}),M.velcro,avantBras,{nom:pref+'sangle_avant_bras'}),1,1);
      const p=pointLoft(ARM_SEC,Math.PI/2,y-.010,.0105,sx);
      tier(maille(new THREE.BoxGeometry(.034,.026,.007),M.metal,avantBras,{p:p.toArray(),nom:pref+'boucle_avant_bras'}),1,1);
      tier(maille(new THREE.BoxGeometry(.020,.012,.0075),M.caout,avantBras,{p:[p.x,p.y,p.z+.0012],nom:pref+'boucle_fenetre'}),1,1);
    }
    // Tenues 2 à 5 (planche LYLU : Standard / Stealth / Heavy) : matte black sleeve under angular armour.
    tier(plate(M.caout,-.535,-.255,.30,Math.PI-.30,.0040,'manche_tactique'),2);
    tier(plate(M.caout,-.535,-.255,Math.PI+.42,Math.PI*2-.42,.0034,'manche_tactique_interne'),2);
    const shell=(mat,o,name,min,max)=>tier(maille(armorShell(ARM_SEC,{...o,sx}),mat,avantBras,{nom:pref+name}),min,max);
    const H=Math.PI/2;
    // Standard (2–3) / Stealth (4): three dorsal plates, an outer flank plate, a dark underlay and one accent line.
    shell(M.hardEdge,{y0:-.482,y1:-.296,t0:H-.74,t1:H+.74,off:.0046,depth:.0016,nt:5,ny:2,chamfer:0},'brassard_socle',2,4);
    shell(M.hardPlate,{y0:-.468,y1:-.312,t0:H-.62,t1:H+.62,off:.0062,depth:.0048,nt:4,ny:3},'brassard_plaque',2,4);
    shell(M.hardPlate,{y0:-.528,y1:-.486,t0:H-.56,t1:H+.56,off:.0058,depth:.0040,nt:4,ny:1},'brassard_coude',2,4);
    shell(M.hardPlate,{y0:-.292,y1:-.262,t0:H-.52,t1:H+.52,off:.0058,depth:.0036,nt:4,ny:1},'brassard_poignet',2,4);
    shell(M.hardPlate,{y0:-.448,y1:-.330,t0:.06,t1:.82,off:.0052,depth:.0036,nt:3,ny:2},'brassard_flanc',2,4);
    shell(M.hardAccent,{y0:-.452,y1:-.328,t0:H-.035,t1:H+.035,off:.0112,depth:.0010,nt:1,ny:2,chamfer:0},'brassard_liseré',2,4);
    // Heavy (5): thickened layered plating, cobalt side blocks and a raised spine.
    shell(M.hardEdge,{y0:-.505,y1:-.280,t0:H-.86,t1:H+.86,off:.0046,depth:.0020,nt:6,ny:2,chamfer:0},'blindage_socle',5);
    shell(M.hardPlate,{y0:-.492,y1:-.300,t0:H-.74,t1:H+.74,off:.0066,depth:.0085,nt:5,ny:3,chamfer:.45},'blindage_plaque',5);
    shell(M.hardPlate,{y0:-.540,y1:-.500,t0:H-.68,t1:H+.68,off:.0062,depth:.0068,nt:4,ny:1},'blindage_coude',5);
    shell(M.hardPlate,{y0:-.292,y1:-.258,t0:H-.62,t1:H+.62,off:.0062,depth:.0060,nt:4,ny:1},'blindage_poignet',5);
    shell(M.hardEdge,{y0:-.470,y1:-.322,t0:H-.07,t1:H+.07,off:.0150,depth:.0026,nt:1,ny:2,chamfer:0},'blindage_arete',5);
    for(const [ta,tb,name] of [[-.34,.42,'blindage_bloc_externe'],[Math.PI-.42,Math.PI+.34,'blindage_bloc_interne']]){
      shell(M.hardEdge,{y0:-.462,y1:-.338,t0:ta-.04,t1:tb+.04,off:.0050,depth:.0030,nt:3,ny:2,chamfer:0},name+'_socle',5);
      shell(M.hardAccent,{y0:-.452,y1:-.348,t0:ta,t1:tb,off:.0080,depth:.0100,nt:3,ny:2,chamfer:.5},name,5);
    }
    for(const t of [.10,Math.PI-.10]){
      const pts=Array.from({length:20},(_,i)=>pointLoft(ARM_SEC,t,-.52+i*.0145,.0016,sx));
      couture(avantBras,pts);
    }
    const end=ARM_SEC[0],cap=new THREE.SphereGeometry(1,28,10,0,Math.PI*2,Math.PI/2,Math.PI/2);
    maille(cap,M.caout,avantBras,{p:[0,end.y,end.cz||0],s:[sx*end.w,.034,(end.db+end.dp)/2],nom:pref+'coude'});
  }
  const patte=new THREE.Bone();patte.name=pref+'patte_serrage';
  patte.position.copy(pointLoft(SEC,.12,-.025,.002,sx));avantBras.add(patte);
  maille(new THREE.CylinderGeometry(.005,.005,.003,12),M.metal,patte,{r:[Math.PI/2,0,0],nom:pref+'verrou_poignet'});
  // A compact segmented wrist closure on the short 3P/VR cuff and the long FPS sleeve.
  maille(loft(SEC,{y0:-.022,y1:-.014,ny:2,nt:32,sx,off:.0016}),M.hardEdge,avantBras,{nom:pref+'bague_poignet'});
  maille(loft(SEC,{y0:-.021,y1:-.018,ny:2,nt:18,t0:.72,t1:Math.PI-.72,sx,off:.0024}),M.hardAccent,avantBras,{nom:pref+'bague_liseré'});
  // Low-profile pivot on the outer wrist, not in the palm or trigger space.
  const pivot=[.043,-.003,.004];
  maille(new THREE.CylinderGeometry(.010,.011,.005,16),M.hardEdge,main,{p:pivot,r:[0,0,Math.PI/2],nom:pref+'pivot_poignet'});
  maille(new THREE.TorusGeometry(.0068,.0009,5,16),M.hardAccent,main,{p:[.046,-.003,.004],r:[0,Math.PI/2,0],nom:pref+'pivot_liseré'});
  maille(new THREE.CylinderGeometry(.004,.004,.0015,12),M.metal,main,{p:[.0465,-.003,.004],r:[0,0,Math.PI/2],nom:pref+'pivot_axe'});
  maille(new THREE.TorusGeometry(.009,.0010,6,24),M.hardPlate,main,{p:[.046,-.003,.004],r:[0,Math.PI/2,0],nom:pref+'cerclage_pivot'});
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;maille(new THREE.CylinderGeometry(.00115,.00115,.0011,8),M.metal,main,{p:[.0472,-.003+.0085*Math.cos(a),.004+.0085*Math.sin(a)],r:[0,0,Math.PI/2],nom:pref+'vis_pivot'});}
  // Wrist coupling (reference: circular armour interface, locked and articulated) from tenue 2.
  tier(maille(new THREE.TorusGeometry(.0132,.0021,6,28),M.hardEdge,main,{p:[.0462,-.003,.004],r:[0,Math.PI/2,0],nom:pref+'couplage_bague'}),2);
  tier(maille(new THREE.TorusGeometry(.0114,.0009,5,28),M.hardAccent,main,{p:[.0486,-.003,.004],r:[0,Math.PI/2,0],nom:pref+'couplage_anneau'}),2);
  tier(maille(new THREE.TorusGeometry(.0158,.0026,6,30),M.hardPlate,main,{p:[.0455,-.003,.004],r:[0,Math.PI/2,0],nom:pref+'couplage_lunette'}),5);
  // Fastening strap and clasp follow the cuff's existing wrist blend.
  maille(loft(SEC,{y0:-.024,y1:-.016,ny:2,nt:32,sx,off:.0025}),M.velcro,avantBras,{nom:pref+'sangle_poignet'});
  maille(dorsalGuard(.023,.010,.002,.0008,.001),M.hardPlate,avantBras,{p:[0,-.024,.029],nom:pref+'boucle_poignet'});
  maille(dorsalGuard(.012,.003,.0007,.0003,0),M.hardAccent,avantBras,{p:[0,-.020,.0318],nom:pref+'verrou_bleu'});
  /* ---------- corps de la main ---------- */
  maille(loft(RLH_PALM_SECTIONS,{y0:-.014,y1:.124,ny:30,nt:64,sx,capHaut:true}),M.textile,main,{nom:pref+'corps'});
  /* éminence thénar (base du pouce, côté paume) */
  maille(new THREE.SphereGeometry(1,30,20),M.textile2,main,{p:P(-.029,.040,-.006),r:R(0,0,-.35),s:[.021,.036,.019]});

  /* paume : renfort cuir d'une seule pièce, épousant la surface */
  const tp0=Math.PI+.30, tp1=2*Math.PI-.26;
  maille(loft(RLH_PALM_SECTIONS,{y0:.004,y1:.110,ny:22,nt:36,t0:tp0,t1:tp1,sx,off:.0013}),M.cuir,main,{nom:pref+'paume_cuir'});
  { /* couture périphérique + piqûres de renfort */
    const bord=[];
    for(let j=0;j<=24;j++) bord.push(pointLoft(RLH_PALM_SECTIONS,tp0+(tp1-tp0)*j/24,.006,.0022,sx));
    for(let i=1;i<=14;i++) bord.push(pointLoft(RLH_PALM_SECTIONS,tp1-.02,.006+.102*i/14,.0022,sx));
    for(let j=24;j>=0;j--) bord.push(pointLoft(RLH_PALM_SECTIONS,tp0+(tp1-tp0)*j/24,.108,.0022,sx));
    for(let i=14;i>=1;i--) bord.push(pointLoft(RLH_PALM_SECTIONS,tp0+.02,.006+.102*i/14,.0022,sx));
    couture(main,bord);
    for(const y of [.036,.064,.090]){ const pts=[]; for(let j=0;j<=18;j++) pts.push(pointLoft(RLH_PALM_SECTIONS,tp0+.35+(tp1-tp0-.7)*j/18,y,.0021,sx)); couture(main,pts); }
  }
  /* renfort de fourche pouce / index (enveloppe le côté) */
  maille(loft(RLH_PALM_SECTIONS,{y0:.062,y1:.112,ny:8,nt:14,t0:Math.PI-.62,t1:Math.PI+.36,sx,off:.0019}),M.cuirF,main,{nom:pref+'renfort_fourche'});

  /* dos : bouclier moulé, bords arrondis (l'épaisseur s'annule sur le pourtour) */
  function bouclier(){
    const t0=.70,t1=Math.PI-.70,y0=.046,y1=.094,nt=26,ny=14,pos=[],uv=[],idx=[];
    for(let i=0;i<=ny;i++){ const v=i/ny, y=y0+(y1-y0)*v; let per=0,prev=null;
      for(let j=0;j<=nt;j++){ const u=j/nt, t=t0+(t1-t0)*u;
        const e=Math.pow(Math.sin(Math.PI*u),.45)*Math.pow(Math.sin(Math.PI*v),.45);
        const p=pointLoft(RLH_PALM_SECTIONS,t,y,.0006+.0034*e,sx); if(prev) per+=p.distanceTo(prev); prev=p;
        pos.push(p.x,p.y,p.z); uv.push(per*TUILE,y*TUILE); } }
    const R=nt+1; for(let i=0;i<ny;i++) for(let j=0;j<nt;j++){ const a=i*R+j,b=a+1,c=a+R,d=c+1;
      if(sx>0) idx.push(a,c,b,b,c,d); else idx.push(a,b,c,b,d,c); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const td0=.70, td1=Math.PI-.70;
  // LYLU/GHJU AÉGIS dorsal plate: chamfered outline, dark carrier, blue/rose inlay.
  maille(bouclier(),M.hardEdge,protections,{nom:pref+'support_dorsal'});
  // Raised central shield and independent floating side shells, with narrow
  // dark seams between the armour pieces. All stay on the dorsal side.
  maille(dorsalGuard(.067,.061,.0016,.0015,.006),M.hardEdge,protections,{p:[0,.029,.025],nom:pref+'socle_dorsal'});
  maille(dorsalGuard(.056,.059,.0033,.0016,.005),M.hardPlate,protections,{p:[0,.030,.027],nom:pref+'coque_dorsale'});
  for(const [t0,t1] of [[.27,.92],[Math.PI-.92,Math.PI-.27]]){
    maille(dorsalFlank(RLH_PALM_SECTIONS,{y0:.038,y1:.092,t0,t1,off:.0024,depth:.0026}),M.hardPlate,protections,{nom:pref+'coque_latérale'});
    maille(dorsalFlank(RLH_PALM_SECTIONS,{y0:.043,y1:.051,t0,t1,off:.0052,depth:.0008}),M.hardAccent,protections,{nom:pref+'insert_latéral'});
  }
  maille(dorsalGuard(.035,.014,.0025,.001,.003),M.hardPlate,protections,{p:[0,.009,.025],nom:pref+'plaque_carpienne'});
  maille(dorsalGuard(.027,.003,.0007,.0003,.001),M.hardAccent,protections,{p:[0,.014,.028],nom:pref+'bande_carpienne'});
  for(const x of [-.023,.023])for(const y of [.041,.079]){
    maille(new THREE.CylinderGeometry(.0015,.0015,.0009,8),M.metal,protections,{p:[x,y,.0295],r:[Math.PI/2,0,0],nom:pref+'vis_dorsale'});
  }
  // Thin identity chevrons as actual geometry (not mirrored text).
  for(const sign of [-1,1])maille(dorsalGuard(.0035,.023,.0006,.0002,0),M.hardAccent,protections,{p:[sign*.008,.055,.0334],r:[0,0,sign*.35],nom:pref+'embleme_dorsal'});
  {
    const pts=[]; for(let j=0;j<=26;j++) pts.push(pointLoft(RLH_PALM_SECTIONS,td0+(td1-td0)*j/26,.094,.0012,sx)); couture(main,pts);
    const pts2=[]; for(let j=0;j<=26;j++) pts2.push(pointLoft(RLH_PALM_SECTIONS,td0+(td1-td0)*j/26,.046,.0012,sx)); couture(main,pts2);
  }
  // Four individual metacarpal caps bridge the shield and the articulated
  // fingers. The distal edge stops before the moving finger root.
  for(const d of Object.values(RLH_DIGITS)){
    const y=d.y-.023,section=interpSections(RLH_PALM_SECTIONS,y+.009);
    const u=Math.abs((d.x-(section.cx||0))/section.w);
    const z=(section.cz||0)+section.db*Math.pow(Math.max(0,1-u**section.n),1/section.n)+.001;
    maille(dorsalGuard(d.r*1.72,.020,.0013,.0007,.002),M.hardEdge,protections,{p:[d.x,y,z-.0006],r:[-.12,0,0],nom:pref+'socle_metacarpe'});
    maille(dorsalGuard(d.r*1.48,.017,.0026,.0008,.002),M.hardPlate,protections,{p:[d.x,y+.001,z+.0004],r:[-.12,0,0],nom:pref+'coque_metacarpe'});
    maille(dorsalGuard(d.r*.70,.0028,.0005,.0003,.0006),M.hardAccent,protections,{p:[d.x,y+.003,z+.0034],nom:pref+'insert_metacarpe'});
  }
  main.add(protections);

  /* ---------- doigts ---------- */
  const doigts={};
  for(const [nom,d] of Object.entries(RLH_DIGITS)){
    const racineD=new THREE.Bone(); racineD.name=pref+NOMS_DOIGTS[nom]+'_0';
    racineD.position.set(...P(d.x,d.y,d.z)); main.add(racineD);
    const artic=[]; let parent=racineD;
    d.L.forEach((L,i)=>{
      const j=new THREE.Bone(); j.name=pref+NOMS_DOIGTS[nom]+'_'+(i+1);
      j.position.y = i===0 ? 0 : d.L[i-1];
      parent.add(j); artic.push(j);
      const r0=d.r*[1,.93,.86][i], r1=d.r*[.95,.88,.80][i];
      const prof=profilPhalange(r0,r1,L);
      /* gaine textile */
      maille(tour(prof,22),M.textile2,j,{s:[1,1,.90]});
      /* côté paume : cuir (continuité du renfort de paume) */
      maille(tour(decaler(prof,.0009,-r0*.2,L+r1*.25),16,Math.PI-1.15,2.3),M.cuir,j,{s:[1,1,.90],ombre:false});
      /* pli d'articulation côté dos */
      if(i>0){ for(let k=0;k<2;k++) maille(new THREE.TorusGeometry(r0*1.0,.0007,5,18,Math.PI),M.textile,j,{p:[0,.002+k*.0035,0],r:[Math.PI/2,0,0],s:[1,.9,1],ombre:false}); }
      // Three independent, anatomically tapered dorsal shells, with clear joint gaps.
      const start=L*(i===2?.24:.16), length=L*(i===2?.46:.62), z=r0*.90+.0005;
      // A separate dark gasket surrounds the rigid floating plate.
      maille(dorsalGuard(r0*1.72,length+.0015,.0010,.0006,r0*.29),M.hardEdge,j,{p:[0,start-.0006,z-.0006],nom:pref+NOMS_DOIGTS[nom]+'_joint'+(i+1)});
      maille(dorsalGuard(r0*1.49,length,.0025,.00075,r0*.24),M.hardPlate,j,{p:[0,start,z],nom:pref+NOMS_DOIGTS[nom]+'_prot'+(i+1)});
      maille(dorsalGuard(r0*.80,.0027,.0006,.00025,.0004),M.hardAccent,j,{p:[0,start+length-.003,z+.0030],nom:pref+NOMS_DOIGTS[nom]+'_liseré'+(i+1)});
      if(i===0){
        // Knuckle is attached to the moving proximal bone, not the palm.
        maille(dorsalGuard(r0*1.72,.009,.0016,.0007,r0*.23),M.hardEdge,j,{p:[0,-.004,z],nom:pref+NOMS_DOIGTS[nom]+'_jointure'});
        maille(dorsalGuard(r0*1.36,.006,.0020,.0007,r0*.18),M.hardPlate,j,{p:[0,-.003,z+.001],nom:pref+NOMS_DOIGTS[nom]+'_capot_jointure'});
      }
      /* bout de doigt renforcé */
      if(i===2){
        maille(tour(decaler(prof,.0011,L*.55),20),M.cuirF,j,{s:[1,1,.90]});
        couture(j,Array.from({length:21},(_,k)=>{const a=k/20*Math.PI*2; return new THREE.Vector3(Math.sin(a)*(r1+.0014)*1,L*.55,Math.cos(a)*(r1+.0014)*.9);}));
      }
      /* couture latérale (le long du doigt, côté extérieur) */
      couture(j,[new THREE.Vector3(r0+.0006,0,0),new THREE.Vector3((r0+r1)/2+.0006,L*.5,0),new THREE.Vector3(r1+.0006,L,0)]);
      parent=j;
    });
    /* jointure : bourrelet textile à la base du doigt */
    maille(new THREE.SphereGeometry(1,20,14),M.textile,racineD,{p:[0,-.004,0],s:[d.r*1.08,d.r*1.05,d.r*.95]});
    doigts[nom]={racine:racineD,artic,d};
  }

  /* ---------- pouce ---------- */
  const pouceBase=new THREE.Bone(); pouceBase.name=pref+'pouce_0';
  pouceBase.position.set(...P(-.030,.024,-.008)); main.add(pouceBase);
  const pouceTwist=new THREE.Bone(); pouceBase.add(pouceTwist);
  const pouce={base:pouceBase,twist:pouceTwist,artic:[]};
  {
    const L=[.036,.032,.028], rr=[.0158,.0142,.0128]; let parent=pouceTwist;
    L.forEach((len,i)=>{
      const j=new THREE.Bone(); j.name=pref+'pouce_'+(i+1);
      j.position.y = i===0 ? 0 : L[i-1]; parent.add(j); pouce.artic.push(j);
      const r0=rr[i], r1=rr[i]*.9, prof=profilPhalange(r0,r1,len);
      maille(tour(prof,22),M.textile2,j,{s:[1,1,.92]});
      maille(tour(decaler(prof,.0009,-r0*.2,len+r1*.25),16,Math.PI-1.2,2.4),M.cuir,j,{s:[1,1,.92],ombre:false});
      if(i>0){
        maille(dorsalGuard(r0*1.53,len*.56,.001,.0006,r0*.26),M.hardEdge,j,{p:[0,len*.19,r0*.92],nom:pref+'pouce_support'+i});
        maille(dorsalGuard(r0*1.34,len*.54,.0025,.0008,r0*.24),M.hardPlate,j,{p:[0,len*.20,r0*.92+.0006],nom:pref+'pouce_prot'+i});
        maille(dorsalGuard(r0*.66,.003,.0006,.00025,.0004),M.hardAccent,j,{p:[0,len*.65,r0*.92+.0034],nom:pref+'pouce_liseré'+i});
      }
      if(i===2) maille(tour(decaler(prof,.0011,len*.55),20),M.cuirF,j,{s:[1,1,.92]});
      if(i>0) maille(new THREE.TorusGeometry(r0,.0007,5,18,Math.PI),M.textile,j,{p:[0,.002,0],r:[Math.PI/2,0,0],ombre:false});
      parent=j;
    });
  }

  /* ---------- état et articulations ---------- */
  const etat={index:.13,middle:.17,ring:.21,pinky:.28,thumbCurl:.15,thumbOpp:.25,spread:.20,wristFlex:0,wristSide:0};
  const cible={...etat};

  function appliquer(){
    for(const [nom,f] of Object.entries(doigts)){
      const a=THREE.MathUtils.clamp(etat[nom],0,1), base=f.d.repos, c=Math.max(0,a-base);
      f.artic[0].rotation.x=-(base*.25+c*1.45);
      f.artic[1].rotation.x=-(base*.42+c*1.60);
      f.artic[2].rotation.x=-(base*.50+c*1.12);
      /* écartement : s'annule quand le doigt se ferme */
      f.racine.rotation.z=sx*f.d.ecart*(.3+etat.spread*2.2)*(1-a*.7);
    }
    const c=THREE.MathUtils.clamp(etat.thumbCurl,0,1), o=THREE.MathUtils.clamp(etat.thumbOpp,0,1);
    pouce.base.rotation.set(-.30-o*.55, 0, sx*(.62-o*.28));
    pouce.twist.rotation.y=sx*(-.75-o*.65);
    pouce.artic[0].rotation.x=-(.02+c*.25);
    pouce.artic[1].rotation.x=-(.08+c*.85);
    pouce.artic[2].rotation.x=-(.10+c*.95);
    /* poignet en deux étages : pli plus doux, pas de cassure dans le tissu */
    const fx=THREE.MathUtils.degToRad(etat.wristFlex)*.5, fz=sx*THREE.MathUtils.degToRad(etat.wristSide)*.5;
    poignetA.rotation.set(fx,0,fz); poignetB.rotation.set(fx,0,fz);
  }
  appliquer();

  /* lissage des transitions de pose (réponse ~120 ms, naturel en VR) */
  function maj(dt){
    const k=1-Math.exp(-dt*11); let bouge=false;
    for(const key in cible){ const d=cible[key]-etat[key]; if(Math.abs(d)>1e-4){ etat[key]+=d*k; bouge=true; } }
    if(bouge) appliquer();
  }

  racine.traverse(o=>{ if(o.isMesh && !o.name) o.name=pref+'piece'; });

  return {
    cote, racine, poignet:poignetA, main, protections, doigts, pouce, etat, cible, appliquer, maj,
    set(cle,val,instant=false){ if(cle in cible){ cible[cle]=val; if(instant){ etat[cle]=val; appliquer(); } } },
    pose(p,instant=false){ const src=typeof p==='string'?RLH_POSES[p]:p; if(!src) return; Object.assign(cible,src); if(instant){ Object.assign(etat,src); appliquer(); } },
    /* manettes VR : gâchette → index, grip → trois derniers doigts, pouce posé → flexion du pouce */
    manette({gachette=0,grip=0,pouce:pc=0}={}){
      const r=RLH_POSES.rest, f=RLH_POSES.fist;
      cible.index=r.index+(f.index-r.index)*gachette;
      for(const k of ['middle','ring','pinky']) cible[k]=r[k]+(f[k]-r[k])*grip;
      cible.thumbCurl=r.thumbCurl+(f.thumbCurl-r.thumbCurl)*Math.max(pc,grip*.6);
      cible.thumbOpp=r.thumbOpp+(f.thumbOpp-r.thumbOpp)*Math.max(pc,grip*.8);
      cible.spread=.2*(1-Math.max(gachette,grip));
    }
  };
}

export const RLH_POSES={
  rest :{index:.13,middle:.17,ring:.21,pinky:.28,thumbCurl:.15,thumbOpp:.25,spread:.20,wristFlex:0,wristSide:0},
  open :{index:.03,middle:.03,ring:.04,pinky:.06,thumbCurl:.05,thumbOpp:.10,spread:.85,wristFlex:0,wristSide:0},
  grip :{index:.69,middle:.78,ring:.83,pinky:.88,thumbCurl:.55,thumbOpp:.78,spread:.05,wristFlex:4,wristSide:-2},
  fist :{index:.95,middle:.98,ring:.98,pinky:.96,thumbCurl:.86,thumbOpp:.70,spread:0,wristFlex:5,wristSide:0},
  pinch:{index:.58,middle:.14,ring:.18,pinky:.24,thumbCurl:.62,thumbOpp:.95,spread:.25,wristFlex:1,wristSide:-3},
  point:{index:.04,middle:.90,ring:.93,pinky:.95,thumbCurl:.55,thumbOpp:.62,spread:.05,wristFlex:0,wristSide:0},
  lance:{index:.62,middle:.70,ring:.74,pinky:.78,thumbCurl:.42,thumbOpp:.85,spread:.02,wristFlex:-6,wristSide:4},
  pouce:{index:.96,middle:.98,ring:.98,pinky:.96,thumbCurl:.00,thumbOpp:.00,spread:0,wristFlex:0,wristSide:0}
};


const textureCache={value:null},materialSets=new WeakMap(),templates=new Map();
const MATERIAL_KEYS=['textile','textile2','doublure','cuir','cuirF','carbone','caout','ceramique','reflect','hiVis','matelasse','velcro','fil','metal','hardPlate','hardEdge','hardAccent'];
// Shared micro-finish: subtle deterministic paint wear, directional titanium
// brushing and woven carbon. Linear roughness/normal maps are not colour maps.
function armorMicro(kind){
 const N=128,albedo=new Uint8Array(N*N*4),rough=new Uint8Array(N*N*4),normal=new Uint8Array(N*N*4);
 const h=(x,y)=>{x=(x+N)%N;y=(y+N)%N;const noise=((Math.imul(x+17,73856093)^Math.imul(y+23,19349663))>>>0)%101/100;
   const wave=kind==='carbon'?.45*Math.sin(x*Math.PI/4)*Math.sin(y*Math.PI/4):kind==='titanium'?.20*Math.sin(x*Math.PI/2):.10*Math.sin((x+y)*Math.PI/4);
   return .5+wave+.16*(noise-.5);};
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const i=(y*N+x)*4,f=h(x,y),scratch=(x+3*y)%127===0?.12:0;
   const v=Math.round(255*THREE.MathUtils.clamp((kind==='carbon'?.84:.93)+(f-.5)*.12-scratch,.55,1));
   const r=Math.round(255*THREE.MathUtils.clamp(.82+(f-.5)*.30+scratch,.5,1));
   const n=new THREE.Vector3((h(x-1,y)-h(x+1,y))*.45,(h(x,y-1)-h(x,y+1))*.45,1).normalize();
   albedo.set([v,v,v,255],i);rough.set([r,r,r,255],i);normal.set([Math.round((n.x*.5+.5)*255),Math.round((n.y*.5+.5)*255),Math.round((n.z*.5+.5)*255),255],i);
 }
 const tex=(data,srgb=false)=>{const t=new THREE.DataTexture(data,N,N);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
 return {map:tex(albedo,true),roughnessMap:tex(rough),normalMap:tex(normal)};
}
function sourceTextures(){
  if(textureCache.value)return textureCache.value;
  return textureCache.value={
    textile:texTextile('#a8adb4','#e4e7eb','#969da7'),textileBump:texTextileBump(),
    textile2:texTextile('#929aa3','#dce0e5','#808996'),doublure:texTextile('#24272b','#4d545c','#333941'),
    cuir:texCuir('#3c4045','#25292d'),cuirBump:texCuirBump(),cuirF:texCuir('#292d31','#171a1d'),
    carbone:texCarbone(),carboneBump:texCarboneBump(),reflect:texReflect(),velcro:texVelcro(),armorMicro:[armorMicro('ceramic'),armorMicro('titanium'),armorMicro('carbon')]
  };
}
function paintLabel(texture,accent,name,side){
  if(!texture.image?.getContext)return;
  const c=texture.image.getContext('2d');c.fillStyle='#d8dbe0';c.fillRect(0,0,512,160);
  c.fillStyle='#20242a';c.textAlign='left';c.font='800 49px sans-serif';c.fillText(name,20,66);
  c.font='700 25px sans-serif';c.fillText('PINK WAR / UNITÉ 07',20,120);
  c.fillStyle=accent;c.fillRect(367,17,128,125);c.fillStyle='#fff';c.textAlign='center';c.font='900 83px sans-serif';c.fillText(side,431,111);
  texture.needsUpdate=true;
}
export function syncRLHMaterials(gloves){
  const set=materialSets.get(gloves);if(!set)return;
  // Shadow Unit deliberately sets plate=graphite; the glow retains the actual hero identity.
  const accent=gloves.glow?.color||gloves.plate.color,white=gloves.trim.color,fabric=gloves.fabric.color;
  const M=set.materials;
  M.textile.color.copy(fabric).lerp(accent,.08);M.textile2.color.copy(fabric).lerp(accent,.06);
  M.hiVis.color.copy(accent);M.hiVis.emissive.copy(accent).multiplyScalar(.05);
  M.matelasse.color.copy(accent).lerp(white,.08);M.fil.color.copy(white).multiplyScalar(.20);
  M.ceramique.color.copy(white).lerp(new THREE.Color(0xffffff),.35);M.reflect.color.copy(white).multiplyScalar(.78);M.metal.color.copy(white).multiplyScalar(.60);
  const name=accent.b>accent.r?'LYLU':'GHJU',hex='#'+accent.getHexString();
  for(const [side,label] of Object.entries(set.labels))paintLabel(label.map,hex,name,side);
  for(const [stage,finish] of set.stages)applyStageFinish(finish,stage,accent);
}
function materialSet(gloves){
  if(materialSets.has(gloves))return materialSets.get(gloves);
  const t=sourceTextures(),standard=options=>new THREE.MeshStandardMaterial(options);
  const materials={
    textile:standard({map:t.textile,bumpMap:t.textileBump,bumpScale:.00035,roughness:.92}),
    textile2:standard({map:t.textile2,bumpMap:t.textileBump,bumpScale:.00035,roughness:.91}),
    doublure:standard({map:t.doublure,roughness:.96,side:THREE.BackSide}),
    cuir:standard({color:0xc6cbd2,map:t.cuir,bumpMap:t.cuirBump,bumpScale:.00045,roughness:.76,metalness:.01}),
    cuirF:standard({color:0xb4bdc6,map:t.cuirF,bumpMap:t.cuirBump,bumpScale:.00040,roughness:.69,metalness:.02}),
    carbone:standard({color:0xbfc8d0,map:t.carbone,bumpMap:t.carboneBump,bumpScale:.00015,roughness:.60,metalness:.16}),
    caout:standard({color:0x282d32,roughness:.85}),
    ceramique:standard({color:0xe6e8ec,roughness:.34,metalness:.22,envMap:gloves.trim.envMap||null,envMapIntensity:.6}),
    reflect:standard({map:t.reflect,roughness:.28,metalness:.82,envMap:gloves.trim.envMap||null,envMapIntensity:.85}),
    hiVis:standard({roughness:.6,emissiveIntensity:.1}),
    matelasse:standard({roughness:.37,metalness:.65,envMap:gloves.plate.envMap||null,envMapIntensity:.65}),
    velcro:standard({map:t.velcro,roughness:.98}),fil:standard({roughness:.90}),metal:standard({roughness:.35,metalness:.8}),
    hardPlate:standard({roughness:.45,metalness:.24,envMap:gloves.trim.envMap||null,envMapIntensity:.55}),
    hardEdge:standard({color:0x252b33,roughness:.46,metalness:.52}),
    hardAccent:standard({roughness:.42,metalness:.25,emissiveIntensity:.09})
  };
  const labels={};for(const side of ['D','G']){
    const map=cvTex(512,160,()=>{});map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
    if(side==='G'){map.repeat.x=-1;map.offset.x=1;}
    labels[side]=standard({map,roughness:.84});
  }
  const set={materials,labels,stages:new Map()};materialSets.set(gloves,set);syncRLHMaterials(gloves);return set;
}
// Planche LYLU « Armor lineup » : Standard (tenues 1–2 blanc cassé, 3 titane), Stealth (4, graphite, accents
// atténués), Heavy (5, plaques composites blanc cassé, blocs d'accent vifs). GHJU reprend les mêmes formes en rose.
// Stage materials are shared by a kit and a stage (not per mesh or frame).
export const GLOVE_FINISHES=Object.freeze([
  {plate:0xe0e2e6,edge:0x353c46,metalness:.14,roughness:.52,accent:.65},
  {plate:0xe6e7e9,edge:0x333b46,metalness:.14,roughness:.52,accent:1},
  {plate:0x929ca8,edge:0x414a56,metalness:.82,roughness:.29,accent:.82},
  {plate:0x343d48,edge:0x222832,metalness:.58,roughness:.38,accent:.54},
  {plate:0xdadde2,edge:0x262c35,metalness:.20,roughness:.44,accent:1.2}
].map(Object.freeze));
const STAGE_KEYS=['hardPlate','hardEdge','hardAccent','ceramique','reflect','matelasse','carbone','hiVis','metal'];
function applyStageFinish(M,stage,identity){
  const f=GLOVE_FINISHES[stage-1],accent=identity.clone().multiplyScalar(f.accent);
  for(const key of ['hardPlate','ceramique','reflect','matelasse']){
    const m=M[key];m.color.setHex(f.plate);m.metalness=f.metalness;m.roughness=f.roughness;
  }
  const micro=sourceTextures().armorMicro[stage===4?2:stage===3?1:0];
  Object.assign(M.hardPlate,micro);M.hardPlate.normalScale.setScalar(stage===4?.65:stage===5?.48:.38);M.hardPlate.needsUpdate=true;
  for(const key of ['hardEdge','carbone','metal'])M[key].color.setHex(f.edge);
  M.metal.color.setHex(stage<=3?0x717984:0x56606c);M.metal.roughness=.42;
  for(const key of ['hardAccent','hiVis']){M[key].color.copy(accent);M[key].emissive.copy(accent).multiplyScalar(.10);}
}
function stageMaterials(set,gloves,level){
  const stage=Math.max(1,Math.min(5,level));
  if(!set.stages.has(stage)){
    const M={...set.materials};
    for(const key of STAGE_KEYS)M[key]=M[key].clone();
    applyStageFinish(M,stage,gloves.glow?.color||gloves.plate.color);
    set.stages.set(stage,M);
  }
  return set.stages.get(stage);
}
function template(sleeve,arm=false){
  const templateKey=sleeve?(arm?'arm':'sleeve'):'short';
  if(templates.has(templateKey))return templates.get(templateKey);
  const M=Object.fromEntries(MATERIAL_KEYS.map(key=>{const mat=new THREE.MeshStandardMaterial();mat.name=key;return [key,mat];}));
  const label=new THREE.MeshStandardMaterial();label.name='label';
  const model=buildSourceGlove(M,label,{sleeve,arm:sleeve&&arm});
  if(sleeve){
    // A narrow titanium wrist clasp is the existing level-four gauntlet upgrade.
    const mesh=maille(loft(arm?MANCHETTE_ARM:MANCHETTE,{y0:-.112,y1:-.052,ny:6,nt:5,t0:1.48,t1:1.66,sx:1,off:.010}),M.metal,model.racine.children[0],{nom:'AÉGIS canal renforce'});mesh.userData.minLevel=4;
  }
  model.racine.updateMatrixWorld(true);
  const bones=[],meshes=[];model.racine.traverse(o=>{if(o.isBone){if(!o.name)o.name='RLH_joint_'+bones.length;bones.push(o);}else if(o.isMesh)meshes.push(o);});
  const groups=new Map(),forearm=bones.find(b=>b.name==='D_manchette'),wrist=bones.indexOf(bones.find(b=>b.name==='D_poignet'));
  const onForearm=joint=>{for(let b=joint;b;b=b.parent)if(b===forearm)return true;return false;};
  for(const mesh of meshes){
    let joint=mesh.parent;while(joint&&!joint.isBone)joint=joint.parent;
    const bone=bones.indexOf(joint),g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);
    const key=mesh.material.name,level=mesh.userData.minLevel||1,max=mesh.userData.maxLevel||10,batchKey=key+':'+level+':'+max;
    if(!groups.has(batchKey))groups.set(batchKey,{key,level,max,parts:[],indices:[],blend:[],count:0});
    const group=groups.get(batchKey),y=g.attributes.position,blend=onForearm(joint);group.parts.push(g);group.count++;
    for(let i=0;i<y.count;i++){
      group.indices.push(bone);
      const t=blend?THREE.MathUtils.clamp((y.getY(i)-WRIST_BLEND[0])/(WRIST_BLEND[1]-WRIST_BLEND[0]),0,1):0;
      group.blend.push(t*t*(3-2*t));
    }
  }
  const parts=[];
  for(const group of groups.values()){
    const geometry=merge(group.parts),n=geometry.attributes.position.count,indices=new Uint16Array(n*4),weights=new Float32Array(n*4);
    for(let i=0;i<n;i++){const w=group.blend[i];indices[i*4]=group.indices[i];weights[i*4]=1-w;if(w>0){indices[i*4+1]=wrist;weights[i*4+1]=w;}}
    geometry.setAttribute('skinIndex',new THREE.Float32BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();parts.push({...group,geometry});
    group.parts.forEach(g=>g.dispose());delete parts[parts.length-1].parts;delete parts[parts.length-1].indices;delete parts[parts.length-1].blend;
  }
  for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();}
  Object.values(M).forEach(mat=>mat.dispose());label.dispose();
  const result={root:model.racine,parts,count:meshes.length};templates.set(templateKey,result);return result;
}
function controlRig(root){
  const map=new Map();root.traverse(b=>{if(b.isBone)map.set(b.name,b);});
  const doigts=Object.fromEntries(Object.entries(RLH_DIGITS).map(([name,d])=>[name,{racine:map.get('D_'+NOMS_DOIGTS[name]+'_0'),artic:[1,2,3].map(i=>map.get('D_'+NOMS_DOIGTS[name]+'_'+i)),d}]));
  const pouce={base:map.get('D_pouce_0'),artic:[1,2,3].map(i=>map.get('D_pouce_'+i))};pouce.twist=pouce.base.children.find(b=>b.isBone);
  const poignet=map.get('D_poignet'),poignet2=map.get('D_poignet_2'),etat={...RLH_POSES.rest},cible={...etat};
  function appliquer(){
    for(const [name,f] of Object.entries(doigts)){
      const a=THREE.MathUtils.clamp(etat[name],0,1),base=f.d.repos,c=Math.max(0,a-base);
      f.artic[0].rotation.x=-(base*.25+c*1.45);f.artic[1].rotation.x=-(base*.42+c*1.60);f.artic[2].rotation.x=-(base*.50+c*1.12);
      f.racine.rotation.z=f.d.ecart*(.3+etat.spread*2.2)*(1-a*.7);
    }
    const c=THREE.MathUtils.clamp(etat.thumbCurl,0,1),o=THREE.MathUtils.clamp(etat.thumbOpp,0,1);
    pouce.base.rotation.set(-.30-o*.55,0,.62-o*.28);pouce.twist.rotation.y=-.75-o*.65;
    pouce.artic[0].rotation.x=-(.02+c*.25);pouce.artic[1].rotation.x=-(.08+c*.85);pouce.artic[2].rotation.x=-(.10+c*.95);
    const fx=THREE.MathUtils.degToRad(etat.wristFlex)*.5,fz=THREE.MathUtils.degToRad(etat.wristSide)*.5;
    poignet.rotation.set(fx,0,fz);poignet2.rotation.set(fx,0,fz);
  }
  return {doigts,pouce,poignet,forearm:map.get('D_manchette'),etat,cible,appliquer,
    pose(p,instant=false){const values=typeof p==='string'?RLH_POSES[p]:p;if(!values)return;Object.assign(cible,values);if(instant){Object.assign(etat,values);appliquer();}},
    maj(dt){const k=1-Math.exp(-Math.max(0,dt)*20);for(const key in cible)etat[key]+=(cible[key]-etat[key])*k;appliquer();}
  };
}
export function createRLHGlove(gloves,{mirror=false,sleeve=true,arm=false}={}){
  const source=template(sleeve,arm),set=materialSet(gloves),group=new THREE.Group(),root=source.root.clone();group.name='RLH V40 '+(mirror?'G':'D');group.add(root);group.updateMatrixWorld(true);
  const bones=[];root.traverse(b=>{if(b.isBone)bones.push(b);});const skeleton=new THREE.Skeleton(bones),meshes=[];
  for(const part of source.parts){
    const mat=part.key==='label'?set.labels[mirror?'G':'D']:set.materials[part.key],mesh=new THREE.SkinnedMesh(part.geometry,mat);
    mesh.name='RLH '+part.key;mesh.bind(skeleton,new THREE.Matrix4());mesh.castShadow=part.key!=='fil'&&part.key!=='doublure';mesh.receiveShadow=true;
    // A fist and open thumb stay inside a conservative fixed bounding volume.
    // The long RLH cuff also rotates toward the game's forearm, independently
    // of wrist flexion. Include that swept volume in the culling bounds.
    const long=sleeve&&arm;
    mesh.boundingBox=new THREE.Box3(new THREE.Vector3(long?-.62:-.28,long?-.62:sleeve?-.29:-.07,long?-.62:-.29),new THREE.Vector3(long?.62:.22,.25,long?.62:.24));
    mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,long?-.10:.02,0),long?.66:.39);
    group.add(mesh);meshes.push({mesh,part});
  }
  const rig=controlRig(root);let disposed=false,level=1,side=mirror?'G':'D',appliedLevel=0;
  Object.assign(group.userData,{source:'RLH V40',armor:'AEGIS-II',arm:sleeve&&arm,skeleton,rig,parts:meshes,materials:set.materials,
    setSide(next){if(next===side||!set.labels[next])return;side=next;for(const {mesh,part} of meshes)if(part.key==='label')mesh.material=set.labels[side];},
    get finishStage(){return Math.min(5,level);},
    setLevel(n){level=Math.max(1,Math.min(10,Math.floor(n||1)));if(appliedLevel===level)return;appliedLevel=level;
      const finish=stageMaterials(set,gloves,level);group.userData.materials=finish;
      for(const {mesh,part} of meshes){mesh.visible=part.level<=level&&level<=(part.max||10);if(part.key!=='label')mesh.material=finish[part.key];}
    },
    dispose(){if(disposed)return;disposed=true;skeleton.dispose();},
    assembly:{get count(){return meshes.filter(({part})=>part.level<=level&&level<=(part.max||10)).reduce((sum,{part})=>sum+part.count,0);}}
  });
  if(mirror)group.scale.x=-1;group.userData.setLevel(1);return group;
}
