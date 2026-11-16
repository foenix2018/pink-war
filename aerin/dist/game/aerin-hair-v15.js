/* Aerin V15 — cheveux mi-longs animés.
 * Des mèches plates (rubans effilés) partent du crâne : nuque et arrière jusqu'aux épaules, côtés jusqu'à
 * la mâchoire, quelques mèches avant qui encadrent le visage. Chaque mèche est une chaîne de points
 * simulée (Verlet, 120 Hz) : gravité, inertie des mouvements du corps, rappel vers la forme coiffée
 * (plus fort à la racine qu'aux pointes), collisions avec le crâne, le cou et les épaules.
 * Le résultat suit la course, les sauts, les roulades et les coups, puis revient en place.
 * Matériau « toon » si le cel shading V12 est présent. Compatible Three r128 et r181. */
(function(){
'use strict';
function build(T,actor,opt={}){
 const bones={};actor.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig:?/,'')]=o;});
 const head=bones.Head;if(!head)throw new Error('os Head absent');
 if(opt.neutral){const m=new T.AnimationMixer(actor),a=m.clipAction(opt.neutral);a.play();m.update(0);a.stop();m.uncacheRoot(actor);}
 actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);
 const inv=new T.Matrix4().copy(actor.matrixWorld).invert();
 const J=k=>bones[k].getWorldPosition(new T.Vector3()).applyMatrix4(inv);
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 // crâne : centre et rayon déduits de l'os Head et de son extrémité
 const hc=J('Head'),top=J('HeadTop_End');const R=top.distanceTo(hc)*.52;const C=hc.clone().lerp(top,.5).add(V(0,0,-.012));
 const headInv=new T.Matrix4().multiplyMatrices(inv,head.matrixWorld).invert(); // repère personnage → repère de l'os Head

 /* ---------- coiffure : liste des mèches [azimut (0 = devant, + vers la gauche), élévation de la racine, longueur, largeur] */
 const LOCKS=[];
 const add=(az,el,len,w)=>LOCKS.push({az:az*Math.PI/180,el:el*Math.PI/180,len,w});
 for(let i=0;i<13;i++){const a=180+(i-6)*13;add(a,16+Math.abs(i-6)*1.5,.37-Math.abs(i-6)*.007,.052);}      // arrière, aux épaules
 for(let i=0;i<9;i++){const a=180+(i-4)*16;add(a,44,.34-Math.abs(i-4)*.01,.048);}                     // couche haute arrière
 for(const s of [1,-1]){for(let i=0;i<5;i++)add(s*(70+i*14),26-i*2,.23+i*.025,.046);                   // côtés, à la mâchoire puis plus long
  add(s*38,30,.2,.036);add(s*52,38,.23,.04);}                                                          // mèches qui encadrent le visage
 const SEG=6;
 // forme coiffée : racine sur le crâne, puis la mèche tombe en s'écartant légèrement de la tête
 const Chead=C.clone().applyMatrix4(headInv); // centre du crâne dans le repère de l'os Head
 for(const L of LOCKS){
  const dir=V(Math.sin(L.az)*Math.cos(L.el),Math.sin(L.el),Math.cos(L.az)*Math.cos(L.el));
  const root=C.clone().addScaledVector(dir,R*.96);const out=V(dir.x,0,dir.z);if(out.lengthSq()<1e-6)out.set(0,0,-1);out.normalize();
  L.rest=[];for(let k=0;k<=SEG;k++){const t=k/SEG;const p=root.clone().addScaledVector(out,R*.28*Math.sin(Math.min(1,t*1.6)*Math.PI*.5)+.012*t).add(V(0,-L.len*t*(.15+.85*t)+(-L.len*.55*t*(1-t)),0));
   // les mèches de côté et de devant se rabattent derrière l'oreille / le long de la joue
   if(Math.cos(L.az)>.2)p.addScaledVector(V(Math.sin(L.az),0,0),.01*t);L.rest.push(p.applyMatrix4(headInv));}
  L.seg=L.len/SEG*1.04;L.side=new T.Vector3().crossVectors(V(0,1,0),out).normalize();
 }
 /* ---------- géométrie : un ruban effilé par mèche */
 const N=LOCKS.length,P=SEG+1,vCount=N*P*2;const pos=new Float32Array(vCount*3),uv=new Float32Array(vCount*2),idx=[];
 LOCKS.forEach((L,l)=>{for(let k=0;k<P;k++){const b=(l*P+k)*2;uv.set([0,k/SEG,1,k/SEG],b*2);if(k<SEG){idx.push(b,b+1,b+2,b+1,b+3,b+2);}}});
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(idx);
 let hairMat=null;actor.traverse(o=>{if(!hairMat&&o.isMesh&&/Cheveux/i.test(o.material?.name||''))hairMat=o.material;});
 const color=hairMat?.color?hairMat.color.clone():new T.Color(0xd1a03b);
 // dégradé racine → pointe peint dans une petite texture (racines plus sombres, reflets sur la longueur)
 const cv=document.createElement('canvas');cv.width=16;cv.height=64;const cx=cv.getContext('2d');const g=cx.createLinearGradient(0,0,0,64);
 g.addColorStop(0,'#c8c8c8');g.addColorStop(.35,'#ffffff');g.addColorStop(1,'#e6e6e6');cx.fillStyle=g;cx.fillRect(0,0,16,64);
 cx.fillStyle='rgba(0,0,0,.10)';for(let x=1;x<16;x+=3)cx.fillRect(x,0,1,64);
 const tex=new T.CanvasTexture(cv);if('colorSpace' in tex)tex.colorSpace=T.SRGBColorSpace;else tex.encoding=T.sRGBEncoding;
 const S=window.AerinStyleV12;let mat;
 if(S&&opt.toon!==false){mat=new T.MeshToonMaterial({color:color.clone().multiplyScalar(.62),map:tex,gradientMap:S.gradientMap(T),side:T.DoubleSide});}
 else mat=new T.MeshStandardMaterial({color,map:tex,roughness:.7,side:T.DoubleSide});
 mat.name='Cheveux V15';
 const mesh=new T.Mesh(geo,mat);mesh.name='Aerin_Cheveux_V15';mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
 // contour encré léger, même géométrie dessinée en face arrière un peu épaissie (pas de coque : rubans fins)

 /* ---------- simulation */
 const cur=LOCKS.map(L=>L.rest.map(()=>V(0,0,0))),prev=LOCKS.map(L=>L.rest.map(()=>V(0,0,0))),restW=LOCKS.map(L=>L.rest.map(()=>V(0,0,0)));
 let ready=false,acc=0;const tmp=V(0,0,0),hcW=V(0,0,0),a=V(0,0,0),b=V(0,0,0),ab=V(0,0,0),ap=V(0,0,0);
 const colliders=[['Neck','Head',.06],['Spine2','Neck',.11],['LeftShoulder','LeftArm',.075],['RightShoulder','RightArm',.075]];
 function restWorld(){for(let l=0;l<N;l++)for(let k=0;k<P;k++)restW[l][k].copy(LOCKS[l].rest[k]).applyMatrix4(head.matrixWorld);}
 function init(){restWorld();for(let l=0;l<N;l++)for(let k=0;k<P;k++){cur[l][k].copy(restW[l][k]);prev[l][k].copy(restW[l][k]);}ready=true;}
 function collide(p,scale){
  // crâne
  hcW.copy(Chead).applyMatrix4(head.matrixWorld);const rr=R*scale*1.04;tmp.subVectors(p,hcW);const d=tmp.length();if(d<rr&&d>1e-6)p.copy(hcW).addScaledVector(tmp,rr/d);
  for(const [ka,kb,r] of colliders){if(!bones[ka]||!bones[kb])continue;bones[ka].getWorldPosition(a);bones[kb].getWorldPosition(b);ab.subVectors(b,a);const l2=ab.lengthSq();let t=l2>0?ap.subVectors(p,a).dot(ab)/l2:0;t=Math.max(0,Math.min(1,t));ap.copy(a).addScaledVector(ab,t);const dd=p.distanceTo(ap),rs=r*scale;if(dd<rs&&dd>1e-6)p.sub(ap).multiplyScalar(rs/dd).add(ap);}
 }
 const scaleW=()=>{const s=new T.Vector3();actor.getWorldScale(s);return s.y;};
 function step(h,sc){
  for(let l=0;l<N;l++){const c=cur[l],pv=prev[l],rw=restW[l],L=LOCKS[l];
   c[0].copy(rw[0]);pv[0].copy(rw[0]);
   for(let k=1;k<P;k++){const p=c[k];tmp.subVectors(p,pv[k]).multiplyScalar(.965);pv[k].copy(p);p.add(tmp);p.y-=9.8*h*h;
    // rappel vers la coiffure (racine raide, pointes libres)
    const stiff=.16*Math.pow(1-k/P,1.6)+.012;p.lerp(rw[k],stiff);}
   for(let it=0;it<3;it++){for(let k=1;k<P;k++){const p0=c[k-1],p=c[k];tmp.subVectors(p,p0);const d=tmp.length()||1e-6;p.copy(p0).addScaledVector(tmp,L.seg*sc/d);}
    for(let k=2;k<P;k++)collide(c[k],sc);}
  }
 }
 const side=V(0,0,0),dirS=V(0,0,0),outW=V(0,0,0);
 function write(sc){
  hcW.copy(Chead).applyMatrix4(head.matrixWorld);
  for(let l=0;l<N;l++){const c=cur[l],L=LOCKS[l];
   for(let k=0;k<P;k++){const p=c[k];dirS.subVectors(c[Math.min(P-1,k+1)],c[Math.max(0,k-1)]).normalize();outW.subVectors(p,hcW).normalize();
    side.crossVectors(dirS,outW);if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize();
    const w=L.w*sc*(k===P-1?.25:1-.55*k/P)*.5;const bi=(l*P+k)*2*3;
    pos[bi]=p.x-side.x*w;pos[bi+1]=p.y-side.y*w;pos[bi+2]=p.z-side.z*w;pos[bi+3]=p.x+side.x*w;pos[bi+4]=p.y+side.y*w;pos[bi+5]=p.z+side.z*w;}}
  geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
 }
 function update(dt){
  if(!mesh.parent){let root=actor;while(root.parent)root=root.parent;root.add(mesh);}
  actor.updateMatrixWorld(true);const sc=scaleW();restWorld();if(!ready)init();
  acc+=Math.min(dt,.05);const h=1/120;let n=0;while(acc>=h&&n++<8){step(h,sc);acc-=h;}
  if(cur[0][P-1].distanceTo(restW[0][P-1])>1.2*sc)init(); // téléportation
  write(sc);
 }
 return {mesh,update,reset(){ready=false;},locks:N,set visible(v){mesh.visible=v;},get visible(){return mesh.visible;},version:15};
}
window.AerinHairV15={build};
})();
