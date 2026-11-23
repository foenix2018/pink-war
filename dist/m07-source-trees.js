// Pink Wars · M07 Forêt des Sources.
// Procedural meshes adapted directly from the two supplied WebGPU tree ateliers:
//   « Chêne majestueux » and « Épicéa alpin ».
// Model geometry and palettes are retained; radial tessellation, side branches
// and leaf populations are reduced for gameplay LOD, not standalone inspection.
function generateSourceTree(species, detail) {
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=2*Math.PI;
 let seed=1820431;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
 const rr=(a,b)=>a+(b-a)*rand(),v=(x,y,z)=>[x,y,z],
  add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  norm=a=>{const l=Math.hypot(...a)||1;return mul(a,1/l)},
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  mix=(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t);
 const settings={quality:detail==='near'?'medium':'low',season:'summer',light:'day',wind:.25};
 const leafInfo={textContent:''};
 let branchData=[],branchIndices=[],skeleton=[],tips=[],barkVertices=0,
  groundData=[],groundIndices=[],leafVertices=[],leafIndices=[],leafInstances=[],renderer=null;
 if(species==='oak') {
function pushRingMesh(points,radii,kind){
 skeleton.push({points,radii,kind});
 const sides=kind==='trunk'?12:kind==='root'?7:kind==='limb'?7:5, n=points.length, start=branchData.length/11;
 let cumulative=0;
 for(let i=0;i<n;i++){
  const p=points[i],tangent=norm(add(points[Math.min(i+1,n-1)],mul(points[Math.max(0,i-1)],-1)));
  let ax=Math.abs(tangent[1])<.93?[0,1,0]:[1,0,0],right=norm(cross(tangent,ax)),forward=norm(cross(tangent,right));
  if(i)cumulative+=Math.hypot(...add(p,mul(points[i-1],-1)));
  for(let j=0;j<=sides;j++){
   let angle=j/sides*TAU,cs=Math.cos(angle),sn=Math.sin(angle),wav=Math.sin(angle*7.3+i*1.5)*.022+Math.sin(angle*13.6-i*2.1)*.012+Math.sin(i*.7+j*2.9)*.008;
   let r=Math.max(.006,radii[i]*(1+wav)),side=add(mul(right,cs),mul(forward,sn)),pos=add(p,mul(side,r));
   const shade=(.70+.14*Math.sin(j*5.79+i*2.34)+.11*rand());let col=kind==='root'?[.31,.245,.164]:[.34,.273,.194];
   branchData.push(...pos,...side, col[0]*shade,col[1]*shade,col[2]*shade,angle/TAU*2.3,cumulative*1.3);
  }
 }
 for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++){
  let a=start+i*(sides+1)+j,b=a+sides+1;
  branchIndices.push(a,b,a+1,b,b+1,a+1);
 }
}
function makeSegment(start,dir,length,r0,r1,type){
 const n=type==='trunk'?26:type==='limb'?11:7,pts=[],rads=[],n1=rr(0,TAU),n2=rr(0,TAU);
 let sway=type==='trunk'?.07:.14;
 for(let j=0;j<=n;j++){
  let t=j/n, bend=[Math.sin(t*Math.PI)*Math.sin(n1)*length*sway*t,Math.sin(t*Math.PI*.7)*.05*length,Math.sin(t*Math.PI)*Math.cos(n2)*length*sway*t],p=add(add(start,mul(dir,length*t)),bend);
  pts.push(p);let rad=r0*(1-t)+r1*t;
  if(type==='trunk')rad+=.18*Math.exp(-t*16)+.035*Math.sin(t*20);if(type==='root')rad*=1+.35*(1-t);
  rads.push(rad);
 }
 pushRingMesh(pts,rads,type);return pts[pts.length-1];
}
function buildTree(){
 branchData=[];branchIndices=[];skeleton=[];tips=[];seed=1820431;
 let base=[0,.01,0],head=makeSegment(base,norm([.034,1,.017]),5.75,.53,.075,'trunk');
 // Contreforts et racines apparentes
 for(let i=0;i<11;i++){
  let ang=TAU*i/11+rr(-.15,.15),d=norm([Math.cos(ang),-.05,Math.sin(ang)]),l=rr(1.2,2.7),start=[Math.cos(ang)*.31,.11,Math.sin(ang)*.31];
  makeSegment(start,d,l,rr(.11,.18),.008,'root');
 }
 function sprout(origin,direction,length,radius,depth){
  let dir=norm(direction),tip=makeSegment(origin,dir,length,radius,Math.max(.012,radius*.40),depth===0?'limb':'twig');
  if(depth>=3){tips.push({p:tip,dir:dir,rad:rr(.35,.59)});return;}
  let amount=depth<2?2:(rand()>.55?3:2);
  for(let j=0;j<amount;j++){
   let side=rr(-.85,.85),spin=rr(-.65,.65),ny=depth===0?rr(.08,.45):rr(-.12,.45);
   let tangent=norm([dir[0]+side*Math.cos(spin)+rr(-.25,.25),dir[1]+ny,dir[2]+side*Math.sin(spin)+rr(-.25,.25)]);
   if(depth===0 && tangent[1]<-.16)tangent[1]=-.16;
   let from=mix(origin,tip,rr(.69,.99));
   sprout(from,tangent,length*rr(.56,.73),radius*rr(.51,.66),depth+1);
  }
  if(depth===2)tips.push({p:mix(origin,tip,.75),dir,rad:.37});
 }
 // Gros départs de charpentières, disposés en spirale naturelle
 for(let i=0;i<(detail==='near'?20:14);i++){
  let alt=2.20+(i/(detail==='near'?20:14))*3.10+rr(-.24,.24),angle=i*2.39996+rr(-.23,.23);
  let d=norm([Math.cos(angle)*rr(.73,1.12),rr(.12,.65)+(alt-4)*.055,Math.sin(angle)*rr(.73,1.12)]);
  let origin=[Math.sin(alt*.9)*.13,alt,Math.cos(alt*.6)*.09];
  sprout(origin,d,rr(1.55,2.9)*(alt<3.6?1.08:1),.19*(1-(alt-2.2)*.14),0);
 }
 // Cime et petites branches intérieures
 for(let i=0;i<9;i++){
  let angle=TAU*i/9+rr(-.28,.28),h=4.8+rr(-.2,.55),d=norm([Math.cos(angle)*.62,rr(.72,1.23),Math.sin(angle)*.62]);
  sprout([0,h,0],d,rr(1.2,2.1),.085,1);
 }
 barkVertices=branchData.length/11;
}

function createLeafGeometry(){
 leafVertices=[];leafIndices=[];const N=18;
 for(let i=0;i<=N;i++){
  const t=i/N, wave=.84+.27*Math.cos(t*6*Math.PI),width=Math.pow(Math.sin(Math.PI*t),.78)*.115*wave;
  for(let s of [-1,1]){
   let x=width*s,y=t*.265,z=Math.sin(t*Math.PI)*.018+(s===-1?.005:-.005),u=(s+1)/2;
   leafVertices.push(x,y,z,0,.10, .995,u,t);
  }
 }
 for(let i=0;i<N;i++){let a=i*2;leafIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
}
function quatEuler(x,y,z){let c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3];}
const palettes={spring:[[.40,.72,.27],[.55,.81,.32],[.25,.49,.20],[.72,.82,.36]],summer:[[.18,.40,.15],[.32,.56,.20],[.42,.60,.20],[.15,.31,.12],[.55,.66,.23]],autumn:[[.75,.36,.10],[.85,.52,.13],[.58,.20,.09],[.89,.65,.21],[.53,.37,.14]]};
function makeLeaves(){
 const max={low:200,medium:720,high:900}[settings.quality],winter=settings.season==='winter';let count=winter?0:max;
 leafInstances=[];seed=30423;let palette=palettes[settings.season]||palettes.summer;
 for(let i=0;i<count;i++){
  let tip=tips[i%tips.length],p=tip.p,dis=rr(.08,1),th=rr(0,TAU),rh=rr(-1,1);
  let center=[p[0]+Math.cos(th)*tip.rad*dis,p[1]+rh*tip.rad*.75,p[2]+Math.sin(th)*tip.rad*dis];
  // Orientation aléatoire, légèrement tournée vers la lumière
  let quat=quatEuler(rr(-1.15,1.15),rr(0,TAU),rr(-Math.PI,Math.PI));
  let sc=rr(.77,1.4),co=palette[Math.floor(rand()*palette.length)],lum=rr(.79,1.18);
  leafInstances.push(...center,sc,...quat,...co.map(x=>Math.min(.95,x*lum)),1,rr(0,TAU),rr(.45,1.25),rr(0,TAU),0);
 }
 leafInfo.textContent=`${count.toLocaleString('fr-FR')} feuilles · ${tips.length} rameaux`;
}

 buildTree();createLeafGeometry();makeLeaves();
 } else if(species==='spruce') {
function pushRingMesh(points,radii,kind){
 skeleton.push({points,radii,kind});
 const sides=kind==='trunk'?12:kind==='root'?7:kind==='limb'?7:5, n=points.length, start=branchData.length/11;
 let cumulative=0;
 for(let i=0;i<n;i++){
  const p=points[i],tangent=norm(add(points[Math.min(i+1,n-1)],mul(points[Math.max(0,i-1)],-1)));
  let ax=Math.abs(tangent[1])<.93?[0,1,0]:[1,0,0],right=norm(cross(tangent,ax)),forward=norm(cross(tangent,right));
  if(i)cumulative+=Math.hypot(...add(p,mul(points[i-1],-1)));
  for(let j=0;j<=sides;j++){
   let angle=j/sides*TAU,cs=Math.cos(angle),sn=Math.sin(angle),wav=Math.sin(angle*7.3+i*1.5)*.022+Math.sin(angle*13.6-i*2.1)*.012+Math.sin(i*.7+j*2.9)*.008;
   let r=Math.max(.006,radii[i]*(1+wav)),side=add(mul(right,cs),mul(forward,sn)),pos=add(p,mul(side,r));
   const shade=(.70+.14*Math.sin(j*5.79+i*2.34)+.11*rand());let col=kind==='root'?[.31,.245,.164]:[.34,.273,.194];
   branchData.push(...pos,...side, col[0]*shade,col[1]*shade,col[2]*shade,angle/TAU*2.3,cumulative*1.3);
  }
 }
 for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++){
  let a=start+i*(sides+1)+j,b=a+sides+1;
  branchIndices.push(a,b,a+1,b,b+1,a+1);
 }
}
function makeSegment(start,dir,length,r0,r1,type){
 const n=type==='trunk'?26:type==='limb'?11:7,pts=[],rads=[],n1=rr(0,TAU),n2=rr(0,TAU);
 let sway=type==='trunk'?.07:.14;
 for(let j=0;j<=n;j++){
  let t=j/n, bend=[Math.sin(t*Math.PI)*Math.sin(n1)*length*sway*t,Math.sin(t*Math.PI*.7)*.05*length,Math.sin(t*Math.PI)*Math.cos(n2)*length*sway*t],p=add(add(start,mul(dir,length*t)),bend);
  pts.push(p);let rad=r0*(1-t)+r1*t;
  if(type==='trunk')rad+=.18*Math.exp(-t*16)+.035*Math.sin(t*20);if(type==='root')rad*=1+.35*(1-t);
  rads.push(rad);
 }
 pushRingMesh(pts,rads,type);return pts[pts.length-1];
}
function buildTree(){
 branchData=[];branchIndices=[];skeleton=[];tips=[];seed=567213;
 const H=9.55, trunkX=y=>.065*Math.sin(y*.60)+.045*Math.sin(y*1.33),trunkZ=y=>.055*Math.sin(y*.52+1.2);
 // Épicéa Picea : tronc résineux conique, houppier régulier mais irrégulier à petite échelle.
 let trunkPoints=[],trunkR=[];
 for(let i=0;i<=47;i++){
  let t=i/47,y=.015+t*H;
  trunkPoints.push([trunkX(y),y,trunkZ(y)]);
  let radius=.355*Math.pow(1-t,1.05)+.012 + .12*Math.exp(-t*38);
  trunkR.push(radius*(1+.026*Math.sin(t*95)));
 }
 pushRingMesh(trunkPoints,trunkR,'trunk');
 // Racines nerveuses, évasement et collet.
 for(let i=0;i<12;i++){
  let angle=i*TAU/12+rr(-.1,.1),side=[Math.cos(angle),0,Math.sin(angle)],points=[],rads=[];
  let reach=rr(.70,1.34);
  for(let k=0;k<=8;k++){
   let t=k/8,dist=t*reach;
   points.push([side[0]*(.19+dist),.17*(1-t)*(1-t)-.018,side[2]*(.19+dist)]);
   rads.push(.112*(1-t)**1.18+.008);
  }
  pushRingMesh(points,rads,'root');
 }
 function branchPath(origin,angle,length,h,thickness){
  let point=[],radii=[],radial=[Math.cos(angle),0,Math.sin(angle)],dr=rr(-1,1);
  for(let i=0;i<=11;i++){
   let t=i/11,dist=length*t;
   // Les rameaux d'épicéa sont tombants vers le milieu, puis relevés à leur extrémité.
   let dip=-(.16+.065*length)*Math.sin(Math.PI*t*.92),uplift=(h>6?.27:.08)*t*t;
   point.push([origin[0]+radial[0]*dist+dr*.05*t*t,h+dip+uplift,origin[2]+radial[2]*dist+dr*.03*t]);
   radii.push((thickness*(1-t)**1.08)+.006);
  }
  pushRingMesh(point,radii,'limb');return point;
 }
 function offshoot(origin,dir,len,radius){
  let points=[],radii=[];
  for(let i=0;i<=5;i++){
   let t=i/5;
   points.push([origin[0]+dir[0]*len*t,origin[1]+dir[1]*len*t-.045*Math.sin(t*Math.PI),origin[2]+dir[2]*len*t]);
   radii.push((radius*(1-t))+.003);
  }
  pushRingMesh(points,radii,'twig');
  tips.push({p:points[3],dir,rad:len*.25, len});
  tips.push({p:points[5],dir,rad:len*.34, len});
 }
 const ROWS=detail==='near'?14:9;
 for(let row=0;row<ROWS;row++){
  let h=1.00+row*(7.88/(ROWS-1))+rr(-.075,.075),t=(h-1)/8.6;
  let crown=3.04*Math.pow(Math.max(.012,1-t),.86)*(0.84+.17*Math.sin(t*Math.PI));
  let n=Math.max(5,Math.floor(7.5-t*2.4));
  for(let j=0;j<n;j++){
   let angle=j*TAU/n+row*2.39996+rr(-.12,.12);
   let len=crown*rr(.77,1.04),thickness=(.064+len*.016)*(1-.2*t);
   let origin=[trunkX(h),h,trunkZ(h)];
   let path=branchPath(origin,angle,len,h,thickness),radial=[Math.cos(angle),0,Math.sin(angle)],side=[-radial[2],0,radial[0]];
   // Brosses de fines branches latérales régulièrement alternées le long d'une branche charpentière.
   let sections=(detail==='near'?4:2);
   for(let k=1;k<=sections;k++){
    let loc=k/(sections+1),point=path[Math.round(loc*11)];
    for(let sg of [-1,1]){
     let twigLen=(.13+len*.29)*Math.pow(1-loc,.52)*rr(.76,1.13);
     let dir=norm([radial[0]*rr(.20,.50)+side[0]*sg*.87,rr(-.30,.09),radial[2]*rr(.20,.50)+side[2]*sg*.87]);
     offshoot(point,dir,twigLen,.016*(1-loc*.6));
    }
   }
   // Rameaux terminaux : aiguilles visibles jusqu'au bout des branches.
   offshoot(path[9],norm([radial[0],rr(-.06,.22),radial[2]]),len*.12,.013);
  }
 }
 // Pousse terminale et flèche de l'épicéa.
 for(let i=0;i<19;i++){
  let y=8.20+i*.063,ang=i*2.4,rad=Math.max(.06,(9.6-y)*.22),start=[trunkX(y),y,trunkZ(y)];
  offshoot(start,norm([Math.cos(ang)*.55,1.15,Math.sin(ang)*.55]),rad*.82,.012);
 }
 // Cônes d'épicéa suspendus, sculptés par couronnes d'écailles (discrets pour rester réalistes).
 function coneAt(pos,height=.17){
  const SIDES=8,SEGS=8,st=branchData.length/11;
  let phi=rr(0,TAU),pal=[.27,.18,.10];
  for(let y=0;y<=SEGS;y++){
   let t=y/SEGS,r=.038*Math.pow(Math.max(0.002,Math.sin(t*Math.PI)),.72)+.004;
   for(let a=0;a<=SIDES;a++){
    let theta=a/SIDES*TAU,scale=1+.15*Math.sin(y*4.6+a*2.9);
    let cs=Math.cos(theta+phi),sn=Math.sin(theta+phi),p=[pos[0]+cs*r*scale,pos[1]-t*height,pos[2]+sn*r*scale];
    let n=norm([cs,-.11,sn]),shade=rr(.78,1.22);
    branchData.push(...p,...n,...pal.map(x=>x*shade),a/SIDES*1.5,t*2.9);
   }
  }
  for(let i=0;i<SEGS;i++)for(let k=0;k<SIDES;k++){
   let a=st+i*(SIDES+1)+k,b=a+SIDES+1;branchIndices.push(a,b,a+1,b,b+1,a+1);
  }
 }
 for(let i=0;i<(detail==='near'?45:18);i++){
  let tip=tips[Math.floor(rand()*tips.length)];
  if(tip.p[1]<1.4||tip.p[1]>8.0||rand()<.3)continue;
  coneAt([tip.p[0]+rr(-.035,.035),tip.p[1],tip.p[2]+rr(-.035,.035)],rr(.13,.23));
 }
 barkVertices=branchData.length/11;
}

function createLeafGeometry(){
 leafVertices=[];leafIndices=[];
 const push=(p,n,uv)=>{let i=leafVertices.length/8;leafVertices.push(...p,...n,...uv);return i;};
 const addTri=(a,b,c,ua,ub,uc)=>{
  let e1=add(b,mul(a,-1)),e2=add(c,mul(a,-1)),normal=norm(cross(e1,e2));
  let i=push(a,normal,ua),j=push(b,normal,ub),k=push(c,normal,uc);leafIndices.push(i,j,k);
 };
 // Aiguille fine avec profil triangulaire allongé et facette légèrement relevée.
 for(let j=0;j<13;j++){
  let t=(j+.4)/13;
  let y=t*.46;
  for(let k=0;k<4;k++){
   let theta=k*Math.PI/2+(j%2)*.23;
   let r=(.078+.070*(1-t))*(.86+.13*Math.sin(j*2.37+k));
   let dx=Math.cos(theta),dz=Math.sin(theta);
   let px=-dz,pz=dx;
   let base=[dx*.006,y,dz*.006],tip=[dx*r,y+.033+.027*(1-t),dz*r];
   let half=.010*(1-.34*t),flankA=[base[0]+px*half,base[1]-.009,base[2]+pz*half],flankB=[base[0]-px*half,base[1]-.009,base[2]-pz*half];
   // Deux facettes rendent la nervure et les reflets crédibles sans texture externe.
   let ridge=[dx*r*.54,y+.033,dz*r*.54];
   addTri(flankA,ridge,tip,[0,t],[.5,t+.03],[.5,t+.09]);
   addTri(ridge,flankB,tip,[.5,t+.03],[1,t],[.5,t+.09]);
  }
 }
 // Axe vert-brun discret du rameau.
 for(let j=0;j<10;j++){
  let y=j*.047,yn=(j+1)*.047,w=.005*(1-j/12);
  addTri([-w,y,0],[-w,yn,0],[w,yn,0],[0,y],[0,yn],[1,yn]);
  addTri([-w,y,0],[w,yn,0],[w,y,0],[0,y],[1,yn],[1,y]);
 }
}
function quatEuler(x,y,z){let c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3];}
const palettes={
 spring:[[.30,.56,.20],[.37,.65,.27],[.21,.46,.16],[.43,.64,.25]],
 summer:[[.085,.27,.17],[.12,.35,.21],[.18,.41,.25],[.065,.22,.16],[.22,.44,.28]],
 autumn:[[.17,.32,.44],[.24,.42,.52],[.13,.28,.38],[.30,.47,.55]],
 winter:[[.78,.85,.84],[.89,.94,.96],[.62,.78,.78],[.67,.82,.85]]
};
function directionQuat(dir,twist){
 let dest=norm(dir),from=[0,1,0],a=cross(from,dest),w=1+dest[1];
 if(w<.0001){a=[1,0,0];w=0}
 let q=norm4([a[0],a[1],a[2],w]);
 let s=Math.sin(twist*.5),c=Math.cos(twist*.5);
 return quatMul(q,[0,s,0,c]);
}
function norm4(a){let l=Math.hypot(...a)||1;return a.map(v=>v/l)}
function quatMul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
function makeLeaves(){
 const max={low:140,medium:490,high:750}[settings.quality],count=max;
 leafInstances=[];seed=620124;let palette=palettes[settings.season]||palettes.summer;
 for(let i=0;i<count;i++){
  let tip=tips[Math.floor(rand()*tips.length)];
  let t=rr(-.58,.43),origin=tip.p;
  let near=[origin[0]+tip.dir[0]*t*tip.len,origin[1]+tip.dir[1]*t*tip.len,origin[2]+tip.dir[2]*t*tip.len];
  let d=norm([tip.dir[0]+rr(-.3,.3),tip.dir[1]+rr(-.2,.3),tip.dir[2]+rr(-.3,.3)]);
  let r=rr(.02,.18),ang=rr(0,TAU);
  let center=[near[0]+Math.cos(ang)*r,near[1]+rr(-.07,.10),near[2]+Math.sin(ang)*r];
  let quat=directionQuat(d,rr(-Math.PI,Math.PI)),sc=rr(.66,1.28),co=palette[Math.floor(rand()*palette.length)],lum=rr(.78,1.18);
  leafInstances.push(...center,sc,...quat,...co.map(x=>Math.min(.99,x*lum)),1,rr(0,TAU),rr(.4,1.15),rr(0,TAU),0);
 }
 leafInfo.textContent=`${count.toLocaleString('fr-FR')} rameaux · ${tips.length.toLocaleString('fr-FR')} branches fines`;
}

 buildTree();createLeafGeometry();makeLeaves();
 } else throw new RangeError('Unsupported M07 tree species: '+species);
 return {branchData,branchIndices,leafVertices,leafIndices,leafInstances};
}

// Bake the authored source-tree needles/leaves into a single per-species mesh.
// One mesh per LOD can then be instanced using the existing forest frustum culler.
// No extra render pass, offscreen canvas, texture download or separate WebGPU device.
export function createM07SourceTreeGeometry(T, species, detail='near') {
 const {branchData,branchIndices,leafVertices,leafIndices,leafInstances}=generateSourceTree(species,detail);
 const pos=[],normal=[],color=[],idx=Array.from(branchIndices);
 for(let i=0;i<branchData.length;i+=11) {
   pos.push(branchData[i],branchData[i+1],branchData[i+2]);
   normal.push(branchData[i+3],branchData[i+4],branchData[i+5]);
   color.push(branchData[i+6],branchData[i+7],branchData[i+8]);
 }
 let base=pos.length/3;
 // Quaternion rotation uses the same handedness and layout as the source WGSL shaders.
 function qr(x,y,z,qx,qy,qz,qw) {
   const tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
   return [
      x+qw*tx+qy*tz-qz*ty,
      y+qw*ty+qz*tx-qx*tz,
      z+qw*tz+qx*ty-qy*tx
   ];
 }
 const stride=8,leafCount=leafVertices.length/stride;
 for(let i=0;i<leafInstances.length;i+=16) {
   const [x,y,z,scale,qx,qy,qz,qw,r,g,b]=leafInstances.slice(i,i+11);
   for(let j=0;j<leafVertices.length;j+=stride) {
     const p=qr(leafVertices[j]*scale,leafVertices[j+1]*scale,leafVertices[j+2]*scale,qx,qy,qz,qw);
     const n=qr(leafVertices[j+3],leafVertices[j+4],leafVertices[j+5],qx,qy,qz,qw);
     pos.push(p[0]+x,p[1]+y,p[2]+z);
     normal.push(n[0],n[1],n[2]);
     color.push(r,g,b);
   }
   for(let j=0;j<leafIndices.length;j++)idx.push(base+leafIndices[j]);
   base+=leafCount;
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(normal,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));
 geometry.setIndex(idx);
 geometry.computeBoundingSphere();
 geometry.userData={kind:'M07-authored-tree',species,detail,
   source:'uploaded WebGPU oak and alpine spruce',leaves:leafInstances.length/16,
   triangles:idx.length/3};
 return geometry;
}
