/* Aerin V13 — corps entièrement refait, sans bonnet.
 * La tête d'origine est conservée (visage, yeux, bouche, cheveux, oreilles, cou) ; le bonnet et tout
 * le reste du corps d'origine (tunique, manches, mains, ceinture, bottes) sont retirés.
 * Un nouveau corps est construit sur le squelette Mixamo, en pose neutre : sections elliptiques au
 * profil anatomique (bassin, taille, thorax, deltoïdes, biceps, avant-bras, cuisses, genoux, mollets,
 * chevilles), mains en poing, bottes à semelle, tunique avec pans, ceinture, cheveux complétés.
 * Pondération : chaque section suit son os, avec un fondu vers l'os voisin près des articulations
 * (genoux, coudes, hanches, épaules plient sans cassure). Matériaux standard : le cel shading V12 les
 * convertit ensuite comme le reste. Compatible Three r128 et r181. */
(function(){
'use strict';
const KEEP_ALL=/Yeux|Cheveux|Bouche|Mèches/i, KEEP_HEAD=/Peau/i;
const HEADBONES=new Set(['Head','Neck','HeadTop_End']);

function build(T,actor,opt={}){
 const bones={},list=[];actor.traverse(o=>{if(o.isBone){const k=o.name.replace(/^mixamorig:?/,'');bones[k]=o;list.push(o);}});
 if(!bones.Hips)throw new Error('squelette absent');
 if(opt.neutral){const m=new T.AnimationMixer(actor),a=m.clipAction(opt.neutral);a.play();m.update(0);a.stop();m.uncacheRoot(actor);}
 actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);
 const inv=new T.Matrix4().copy(actor.matrixWorld).invert();
 const J=k=>bones[k].getWorldPosition(new T.Vector3()).applyMatrix4(inv);
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 // objet décrit en repère personnage → fixé à un os
 const attachAt=(bone,obj)=>{obj.updateMatrix();obj.applyMatrix4(actor.matrixWorld);bone.attach(obj);};

 /* ---------- 1. tête d'origine seule (bonnet retiré) */
 const removed=[];let headMesh=null;
 actor.traverse(o=>{if(!o.isSkinnedMesh||o.userData.bodyV13)return;const name=o.material?.name||'';if(o.parent?.name!=='Aerin_Body'&&o.name!=='Aerin_Body')return;
  if(KEEP_ALL.test(name))return;
  if(KEEP_HEAD.test(name)){ // visage + cou + oreilles uniquement
   const g=o.geometry.clone(),si=g.attributes.skinIndex,sw=g.attributes.skinWeight,idx=g.index,keep=[];
   const dom=v=>{let b=0,bi=0;for(let k=0;k<4;k++){const w=sw.getComponent?sw.getComponent(v,k):sw.array[v*4+k];if(w>b){b=w;bi=si.getComponent?si.getComponent(v,k):si.array[v*4+k];}}return o.skeleton.bones[bi].name.replace(/^mixamorig:?/,'');};
   for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);if(HEADBONES.has(dom(a))&&HEADBONES.has(dom(b))&&HEADBONES.has(dom(c)))keep.push(a,b,c);}
   g.setIndex(keep);o.geometry=g;headMesh=o;return;}
  removed.push(o);});
 for(const o of removed)o.parent.remove(o);

 /* ---------- 2. matériaux */
 const std=(c,r=.85,extra={})=>Object.assign(new T.MeshStandardMaterial({color:c,roughness:r,metalness:0}),extra);
 const M={tunic:std(0x154628,.9),tunicDark:std(0x0f3520,.9),linen:std(0xd9cfae,.9),leather:std(0x3d2212,.8),leatherDark:std(0x24150c,.8),
  legs:std(0x2c2820,.9),skin:headMesh?headMesh.material:std(0xd9a07a,.8),hair:null,belt:std(0x5a341b,.75),buckle:std(0xd8a84a,.4,{metalness:.6})};
 actor.traverse(o=>{if(o.isMesh&&/Cheveux/i.test(o.material?.name||''))M.hair=o.material;});if(!M.hair)M.hair=std(0xd1a03b,.8);
 for(const k in M)if(M[k]&&!M[k].name)M[k].name='Corps V13 · '+k;

 /* ---------- 3. constructeur de maillage skinné */
 const skeleton=new T.Skeleton(list); // inverses calculées dans la pose neutre actuelle
 const parts=[],idxOf=new Map(list.map((b,i)=>[b,i]));
 function mesher(mat,name){const P=[],SI=[],SW=[],I=[];return {
  v(p,w){P.push(p.x,p.y,p.z);const e=Object.entries(w).filter(([,x])=>x>1e-3).sort((a,b)=>b[1]-a[1]).slice(0,4);const s=e.reduce((t,[,x])=>t+x,0)||1;
   const ii=[0,0,0,0],ww=[0,0,0,0];e.forEach(([k,x],n)=>{ii[n]=idxOf.get(bones[k]);ww[n]=x/s;});SI.push(...ii);SW.push(...ww);return P.length/3-1;},
  tri(a,b,c){I.push(a,b,c);},
  done(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(SI,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(SW,4));g.setIndex(I);g.computeVertexNormals();
   const m=new T.SkinnedMesh(g,mat);if('skinning' in mat||!('isNodeMaterial' in mat))mat.skinning=true;m.name=name;m.userData.bodyV13=true;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;parts.push(m);return m;}};}
 // Repère d'une section : axe a→b, « gauche » = +X du personnage projeté.
 function frame(a,b,sideHint=V(1,0,0)){const y=b.clone().sub(a).normalize();let x=sideHint.clone().sub(y.clone().multiplyScalar(sideHint.dot(y)));if(x.lengthSq()<1e-6)x=V(0,0,1).cross(y);x.normalize();const z=new T.Vector3().crossVectors(x,y).normalize();return {x,y,z};}
 // Tube anatomique : profil [t, rayon latéral, rayon avant, décalage avant], poids(t).
 function tube(m,a,b,prof,weights,seg=16,cap0=false,cap1=false,sideHint){
  const f=frame(a,b,sideHint),len=a.distanceTo(b),rows=[];
  for(const [t,rx,rz,oz=0] of prof){const c=a.clone().addScaledVector(f.y,t*len).addScaledVector(f.z,oz);const row=[];
   for(let i=0;i<seg;i++){const th=i/seg*Math.PI*2;const p=c.clone().addScaledVector(f.x,Math.cos(th)*rx).addScaledVector(f.z,Math.sin(th)*rz);row.push(m.v(p,weights(t)));}rows.push(row);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<seg;i++){const j=(i+1)%seg,A=rows[r][i],B=rows[r][j],C=rows[r+1][i],D=rows[r+1][j];m.tri(A,C,B);m.tri(B,C,D);}
  const cap=(row,t,flip)=>{const c=a.clone().addScaledVector(f.y,t*len);const ci=m.v(c,weights(t));for(let i=0;i<seg;i++){const j=(i+1)%seg;flip?m.tri(ci,row[j],row[i]):m.tri(ci,row[i],row[j]);}};
  if(cap0)cap(rows[0],prof[0][0],false);if(cap1)cap(rows[rows.length-1],prof[prof.length-1][0],true);
 }
 const lerpW=(t,t0,t1)=>Math.max(0,Math.min(1,(t-t0)/(t1-t0)));
 const blend=(a,b,t,t0,t1)=>{const k=lerpW(t,t0,t1);return {[a]:1-k,[b]:k};};

 /* ---------- 4. buste (loft le long de la colonne) */
 const hips=J('Hips'),sp=J('Spine'),sp1=J('Spine1'),sp2=J('Spine2'),neck=J('Neck'),lUp=J('LeftUpLeg'),rUp=J('RightUpLeg');
 const torsoM=mesher(M.tunic,'Aerin_Corps_Buste');
 { // sections : [point, demi-largeur, demi-profondeur, décalage avant, poids]
  const S=[
   [hips.clone().add(V(0,-.11,0)),.135,.095,0,{Hips:1}],
   [hips.clone().add(V(0,-.03,0)),.162,.108,.004,{Hips:1}],
   [hips.clone().lerp(sp,.6),.155,.1,.008,{Hips:.6,Spine:.4}],
   [sp.clone().lerp(sp1,.5),.142,.094,.01,{Spine:.7,Spine1:.3}],
   [sp1.clone(),.148,.094,.012,{Spine1:.8,Spine2:.2}],
   [sp1.clone().lerp(sp2,.6),.155,.096,.014,{Spine1:.3,Spine2:.7}],
   [sp2.clone().lerp(neck,.35),.158,.094,.01,{Spine2:1}],
   [sp2.clone().lerp(neck,.72),.155,.085,.0,{Spine2:1}],
   [sp2.clone().lerp(neck,.9),.12,.08,-.004,{Spine2:.7,Neck:.3}],
   [neck.clone().add(V(0,.01,0)),.062,.058,.004,{Neck:1}]];
  const seg=24,rows=[];
  for(const [c,rx,rz,oz,w] of S){const row=[];for(let i=0;i<seg;i++){const th=i/seg*Math.PI*2;// léger aplatissement du dos, poitrine galbée
   const zz=Math.sin(th),fr=zz>0?1:.92;row.push(torsoM.v(V(c.x+Math.cos(th)*rx,c.y,c.z+oz+zz*rz*fr),w));}rows.push(row);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<seg;i++){const j=(i+1)%seg;torsoM.tri(rows[r][i],rows[r+1][i],rows[r][j]);torsoM.tri(rows[r][j],rows[r+1][i],rows[r+1][j]);}
  const bc=torsoM.v(S[0][0].clone().add(V(0,-.02,0)),{Hips:1});for(let i=0;i<seg;i++){const j=(i+1)%seg;torsoM.tri(bc,rows[0][j],rows[0][i]);}
 }
 torsoM.done();
 /* ---------- 5. bras : deltoïde/biceps (manche), avant-bras (cuir), poing (gant) */
 for(const s of ['Left','Right']){const sd=s==='Left'?1:-1;const sh=J(s+'Arm'),el=J(s+'ForeArm'),wr=J(s+'Hand');
  const up=mesher(M.tunic,'Aerin_Corps_Bras_'+s);
  tube(up,sh.clone().add(V(-sd*.02,0,0)),el,[[-.12,.06,.062],[.05,.064,.066,.004],[.3,.055,.06,.006],[.6,.048,.052,.004],[.9,.042,.044],[1.06,.04,.042]],
   t=>t<.12?{[s+'Shoulder']:.35*(1-t/.12),[s+'Arm']:1}:t>.82?blend(s+'Arm',s+'ForeArm',t,.82,1.05):{[s+'Arm']:1},16,true,false);
  up.done();
  const fo=mesher(M.leather,'Aerin_Corps_AvantBras_'+s);
  tube(fo,el,wr,[[-.06,.041,.043],[.1,.043,.046],[.35,.045,.043],[.7,.037,.032],[1.0,.03,.024]],t=>t<.08?blend(s+'Arm',s+'ForeArm',t,-.1,.08):{[s+'ForeArm']:1},16,true,false);
  fo.done();
  // Poing ganté : paume + doigts repliés + pouce, orienté par l'os de la main
  const hand=mesher(M.leatherDark,'Aerin_Corps_Main_'+s);
  const idx1=J(s+'HandIndex1'),th1=J(s+'HandThumb1'),th3=J(s+'HandThumb3');const f=frame(wr,idx1,V(sd,0,0));
  tube(hand,wr.clone().addScaledVector(f.y,-.005),idx1.clone().addScaledVector(f.y,.045),[[0,.026,.022],[.35,.038,.022],[.7,.04,.026],[.9,.036,.028],[1,.022,.02]],t=>({[s+'Hand']:1}),12,true,true,V(sd,0,0));
  tube(hand,th1,th3.clone().lerp(th1,-.1),[[0,.014,.014],[1,.011,.011]],t=>t<.5?{[s+'Hand']:.6,[s+'HandThumb1']:.4}:{[s+'HandThumb2']:1},8,false,true);
  hand.done();
  // manchette de gant
  const cuff=mesher(M.leatherDark,'Aerin_Corps_Manchette_'+s);tube(cuff,wr.clone().lerp(el,.22),wr.clone().lerp(el,-.02),[[0,.04,.036],[1,.044,.04]],t=>({[s+'Hand']:t,[s+'ForeArm']:1-t}),14);cuff.done();
 }
 /* ---------- 6. jambes : cuisse (chausses), genou, mollet, botte haute */
 for(const s of ['Left','Right']){const sd=s==='Left'?1:-1;const hp=J(s+'UpLeg'),kn=J(s+'Leg'),an=J(s+'Foot'),tb=J(s+'ToeBase'),te=J(s+'Toe_End');
  const th=mesher(M.legs,'Aerin_Corps_Cuisse_'+s);
  tube(th,hp.clone().add(V(sd*.005,.05,0)),kn,[[-.02,.088,.09,.005],[.15,.09,.095,.01],[.45,.08,.085,.012],[.8,.062,.064,.01],[1.03,.054,.058,.012]],
   t=>t<.12?{Hips:.5*(1-t/.12),[s+'UpLeg']:1}:t>.82?blend(s+'UpLeg',s+'Leg',t,.82,1.06):{[s+'UpLeg']:1},16,true,false);th.done();
  const sh=mesher(M.legs,'Aerin_Corps_Jambe_'+s);
  tube(sh,kn,an,[[-.05,.054,.058,.008],[.08,.052,.056,.004],[.3,.056,.066,-.012],[.55,.048,.054,-.006],[.85,.036,.04],[1,.034,.038]],t=>t<.1?blend(s+'UpLeg',s+'Leg',t,-.12,.1):{[s+'Leg']:1},16,false,false);sh.done();
  // botte : tige (jusqu'au mollet haut) + pied à semelle
  const bt=mesher(M.leather,'Aerin_Corps_Botte_'+s);
  tube(bt,kn.clone().lerp(an,.18),an.clone().add(V(0,-.03,0)),[[0,.064,.07,-.006],[.08,.062,.07,-.008],[.4,.058,.064,-.008],[.8,.044,.05],[1,.042,.05]],t=>({[s+'Leg']:1-lerpW(t,.85,1)*.5,[s+'Foot']:lerpW(t,.85,1)*.5}),16,false,false);
  // pied : du talon à la pointe, semelle au sol
  const heel=V(an.x,.035,an.z-.055),toe=V(te.x,.03,te.z+.02);const ff=frame(heel,toe,V(sd,0,0));
  const n=8,seg=14,rows=[];for(let r=0;r<=n;r++){const t=r/n;const c=heel.clone().lerp(toe,t);const w=t<.6?{[s+'Foot']:1}:{[s+'Foot']:1-(t-.6)/.4*.7,[s+'ToeBase']:(t-.6)/.4*.7};
   const hw=.04+.012*Math.sin(Math.PI*Math.min(1,t*1.25)),hh=t<.55?.06-.02*t:.045*(1-(t-.55)/.45*.55);const row=[];
   for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2;const sx=Math.cos(a)*hw,sy=Math.sin(a);const y=sy>0?sy*hh*1.6:sy*.006;row.push(bt.v(c.clone().addScaledVector(ff.x,sx).add(V(0,y+.006,0)),w));}rows.push(row);}
  for(let r=0;r<n;r++)for(let i=0;i<seg;i++){const j=(i+1)%seg;bt.tri(rows[r][i],rows[r][j],rows[r+1][i]);bt.tri(rows[r][j],rows[r+1][j],rows[r+1][i]);} // section tracée dans l'autre sens que les tubes
  const capF=(row,c,w,flip)=>{const ci=bt.v(c,w);for(let i=0;i<seg;i++){const j=(i+1)%seg;flip?bt.tri(ci,row[j],row[i]):bt.tri(ci,row[i],row[j]);}};
  capF(rows[0],heel.clone().add(V(0,.03,-.01)),{[s+'Foot']:1},false);capF(rows[n],toe.clone().add(V(0,.015,.01)),{[s+'ToeBase']:1},true);
  bt.done().userData.noInkV12=true; // semelle trop fine pour la coque de contour (pointe sombre sinon)
  // revers de botte (cuir plus sombre)
  const rv=mesher(M.leatherDark,'Aerin_Corps_Revers_'+s);tube(rv,kn.clone().lerp(an,.12),kn.clone().lerp(an,.24),[[0,.07,.077,-.006],[1,.066,.073,-.008]],t=>({[s+'Leg']:1}),16);rv.done();
 }
 /* ---------- 7. tunique : pans (jupe) qui suivent les cuisses, ceinture */
 { const sk=mesher(M.tunic,'Aerin_Corps_Tunique');const seg=28,top=hips.y+.02,bot=hips.y-.3,rowsN=6,rows=[];
  for(let r=0;r<=rowsN;r++){const t=r/rowsN,y=top+(bot-top)*t;const row=[];
   for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,cx=Math.cos(a),sz=Math.sin(a);const flare=1+t*.32;
    const x=cx*.17*flare,z=sz*(sz>0?.118:.112)*flare+.006;const side=cx>0?'Left':'Right',lw=Math.max(0,Math.abs(cx)-.15)*t*.95+t*.25*(sz>0?1:.6);
    row.push(sk.v(V(hips.x+x,y,hips.z+z),{Hips:1-Math.min(.75,lw),[side+'UpLeg']:Math.min(.75,lw)}));}rows.push(row);}
  for(let r=0;r<rowsN;r++)for(let i=0;i<seg;i++){const j=(i+1)%seg;sk.tri(rows[r][i],rows[r+1][i],rows[r][j]);sk.tri(rows[r][j],rows[r+1][i],rows[r+1][j]);}
  const m=sk.done();m.material=M.tunic;m.material.side=T.DoubleSide;
  const belt=mesher(M.belt,'Aerin_Corps_Ceinture');tube(belt,hips.clone().add(V(0,-.005,.006)),hips.clone().add(V(0,.045,.008)),[[0,.172,.116],[1,.168,.114]],()=>({Hips:1}),28,false,false,V(1,0,0));belt.done();
  const bk=new T.Mesh(new T.BoxGeometry(.052,.044,.012),M.buckle);bk.position.copy(hips).add(V(0,.02,.124));attachAt(bones.Hips,bk);bk.userData.bodyV13=true;parts.push(bk);
 }
 /* ---------- 8. cheveux : calotte qui remplace le bonnet (reprend la couleur des cheveux) */
 { const head=bones.Head;const top=J('HeadTop_End'),hc=J('Head');const c=hc.clone().lerp(top,.58);
  const r=top.distanceTo(hc)*.5;const g=new T.SphereGeometry(r*1.04,24,14,0,Math.PI*2,0,Math.PI*.62);g.scale(1.02,.92,1.1);
  // mèches arrière : la calotte descend plus bas derrière la tête
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i);if(z<0&&y<r*.2)p.setY(i,y-(r*.2-y)*.55*Math.min(1,-z/r*1.6));}
  g.computeVertexNormals();const cap=new T.Mesh(g,M.hair);cap.position.copy(c).add(V(0,-.005,-.014));cap.rotation.x=-.12;attachAt(head,cap);
  cap.name='Aerin_Corps_Calotte';cap.userData.bodyV13=true;cap.castShadow=true;parts.push(cap);}

 // ajout des maillages skinnés au même parent que la tête, liés au squelette neutre
 const group=new T.Group();group.name='Aerin_Body_V13';actor.add(group);group.updateMatrixWorld(true);
 for(const m of parts){if(!m.isSkinnedMesh)continue;group.add(m);m.updateMatrixWorld(true);m.bind(skeleton,m.matrixWorld);}
 // bras seuls (1re personne) : avant-bras, manchettes et poings
 const fpArms=new T.Group();fpArms.name='Aerin_FirstPersonArms_V13';
 for(const m of parts)if(/AvantBras|Main|Manchette/.test(m.name)){const c=new T.SkinnedMesh(m.geometry,m.material);c.bind(skeleton,m.bindMatrix);c.frustumCulled=false;fpArms.add(c);}
 actor.add(fpArms);fpArms.visible=false;
 return {group,parts,removed:removed.length,skeleton,fpArms,materials:M,version:13};
}
window.AerinBodyV13={build};
})();
