/* Aerin V11 — tenue de chevalier, cape physique, traînée de lame et étincelles.
 * Personnage original : tunique forestière conservée, armure d'acier légère par-dessus
 * (cuirasse, gorgerin, spalières, canons, genouillères, grèves, tassettes), cape bleu nuit
 * à liseré doré, épée longue à garde courbe et écu « feuille de chêne ».
 * Les pièces d'armure sont des maillages rigides fixés aux os (elles suivent toutes les
 * animations sans pondération). Elles se placent à partir du gabarit mesuré sur le modèle
 * dans sa pose neutre ; l'épée et l'écu reprennent l'axe et la prise des armes d'origine.
 * Compatible Three r128 (WebGL de secours) et r181 (WebGPU). */
(function(){
'use strict';
function dress(T,actor,opt={}){
 const bones={};actor.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig:?/,'')]=o;});
 if(!bones.Hips)throw new Error('Squelette Mixamo introuvable');
 // Pose neutre (Idle, t=0) le temps des mesures.
 if(opt.neutral){const m=new T.AnimationMixer(actor),a=m.clipAction(opt.neutral);a.play();m.update(0);a.stop();m.uncacheRoot(actor);}
 actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true); // ancêtres compris (joueur déjà placé dans la scène)
 const inv=new T.Matrix4().copy(actor.matrixWorld).invert();
 const J=k=>bones[k].getWorldPosition(new T.Vector3()).applyMatrix4(inv); // position d'articulation, repère personnage
 const V=(x,y,z)=>new T.Vector3(x,y,z);
 const std=(o)=>{const m=new T.MeshStandardMaterial(o);return m;};
 const M={
  steel:std({color:0xc3ccd4,metalness:.62,roughness:.3}),
  steelDark:std({color:0x6b7680,metalness:.6,roughness:.4}),
  brass:std({color:0xd8a84a,metalness:.6,roughness:.36}),
  leather:std({color:0x3b2416,metalness:0,roughness:.85}),
  grip:std({color:0x1f3a5c,metalness:0,roughness:.7}),
  cape:std({color:0x1c2f52,metalness:0,roughness:.92,side:T.DoubleSide}),
  shieldField:std({color:0x123058,metalness:0,roughness:.62}),
  gem:std({color:0x2fd69a,metalness:.2,roughness:.15,emissive:0x0b4a33,emissiveIntensity:.6}),
  blade:std({color:0xe6edf2,metalness:.7,roughness:.2})
 };
 const parts=[];const fpKeep=new Set();
 // Fusion des petites pièces d'un élément : un maillage par matériau (moins d'appels de dessin).
 function merged(group){
  group.updateMatrixWorld(true);const inv=new T.Matrix4().copy(group.matrixWorld).invert();const byMat=new Map();
  group.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
   const m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(m);if(!g.attributes.normal)g.computeVertexNormals();
   const list=byMat.get(o.material)||[];list.push(g);byMat.set(o.material,list);});
  const out=new T.Group();out.name=group.name;
  for(const [mat,list] of byMat){let n=0;for(const g of list)n+=g.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3);let k=0;
   for(const g of list){P.set(g.attributes.position.array,k*3);N.set(g.attributes.normal.array,k*3);k+=g.attributes.position.count;g.dispose();}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.setAttribute('normal',new T.BufferAttribute(N,3));geo.computeBoundingSphere();
   out.add(new T.Mesh(geo,mat));}
  return out;
 }
 // Fixe un objet décrit dans le repère personnage (position p, base x/y/z) à l'os b.
 function attach(boneKey,obj,p,yAxis,zHint,firstPerson=false){
  if(!obj.userData.keepParts){const name=obj.name;obj=merged(obj);obj.name=name;}
  const y=yAxis.clone().normalize(),z0=(zHint||V(0,0,1)).clone();
  const x=new T.Vector3().crossVectors(y,z0).normalize(),z=new T.Vector3().crossVectors(x,y).normalize();
  const world=new T.Matrix4().makeBasis(x,y,z).setPosition(p);
  const bone=bones[boneKey];const boneM=new T.Matrix4().multiplyMatrices(inv,bone.matrixWorld);
  const local=new T.Matrix4().copy(boneM).invert().multiply(world);
  local.decompose(obj.position,obj.quaternion,obj.scale);
  bone.add(obj);obj.userData.knightV11=true;parts.push(obj);if(firstPerson)fpKeep.add(obj);
  obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return obj;
 }
 const mesh=(g,m)=>new T.Mesh(g,m);
 // Coquille en révolution autour de Y, section elliptique (sx, sz).
 function shell(profile,sx,sz,seg=28,mat=M.steel,thetaStart=0,thetaLen=Math.PI*2){
  const g=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),seg,thetaStart,thetaLen);g.scale(sx,1,sz);g.computeVertexNormals();
  const m=mesh(g,mat);m.material=mat;return m;
 }
 const ring=(r,tube,mat,seg=28)=>mesh(new T.TorusGeometry(r,tube,8,seg),mat);

 /* ---------------- buste : cuirasse en deux pièces (plastron + braconnière) et gorgerin */
 const chestC=V(0,1.13,-.012);
 {const g=new T.Group();
  const body=shell([[.162,-.095],[.182,-.04],[.196,.03],[.192,.085],[.168,.125],[.13,.142]],1,.69,32,M.steel);g.add(body);
  // arête médiane (plastron « à tapul »), rivets et filet de laiton
  const ridge=mesh(new T.BoxGeometry(.012,.2,.012),M.steel);ridge.position.set(0,.02,.133);ridge.rotation.x=-.08;g.add(ridge);
  const trim=ring(.182,.007,M.brass,40);trim.scale.set(1,.69/1,1);trim.rotation.x=Math.PI/2;trim.position.y=-.088;trim.scale.set(1,.69,1);g.add(trim);
  for(const s of [-1,1])for(const yy of [-.06,.02,.09]){const r=mesh(new T.SphereGeometry(.009,8,6),M.brass);const a=s*1.05;r.position.set(Math.sin(a)*.19,yy,Math.cos(a)*.19*.69);g.add(r);}
  // emblème : feuille de chêne dorée sur le cœur
  const leaf=new T.Shape();leaf.moveTo(0,-.05);leaf.bezierCurveTo(.045,-.02,.04,.03,0,.055);leaf.bezierCurveTo(-.04,.03,-.045,-.02,0,-.05);
  const em=mesh(new T.ExtrudeGeometry(leaf,{depth:.006,bevelEnabled:false}),M.brass);em.position.set(0,.03,.128);em.rotation.x=-.18;g.add(em);
  attach('Spine2',g,chestC,V(0,1,0),V(0,0,1));}
 {const g=new T.Group();// braconnière : deux lames qui suivent le bas du dos
  for(let i=0;i<2;i++){const l=shell([[.172,-.03],[.168,0],[.165,.03]],1,.72,30,i?M.steel:M.steelDark);l.position.y=-i*.045;g.add(l);}
  attach('Spine1',g,V(0,.995,-.004),V(0,1,0),V(0,0,1));}
 {const g=new T.Group();const c=shell([[.1,-.02],[.093,.02],[.08,.045]],1,.88,24,M.steel);g.add(c);const t=ring(.1,.006,M.brass,24);t.rotation.x=Math.PI/2;t.position.y=-.02;t.scale.set(1,.88,1);g.add(t);
  attach('Neck',g,V(.006,1.272,-.022),V(0,1,0),V(0,0,1));}

 /* ---------------- épaules : spalières à trois lames */
 for(const side of [1,-1]){const k=side>0?'Left':'Right';const sh=J(k+'Arm');
  const g=new T.Group();
  for(let i=0;i<3;i++){const cap=mesh(new T.SphereGeometry(.105-i*.012,20,10,0,Math.PI*2,0,1.15),i===0?M.steel:i===1?M.steelDark:M.steel);
   cap.scale.set(1,.62,1.05);cap.position.set(0,-.045*i,0);cap.rotation.z=-i*.12;g.add(cap);
   if(i===0){const rim=ring(.094,.006,M.brass,24);rim.rotation.x=Math.PI/2;rim.position.y=.04;rim.scale.set(1,1.05,1);}}
  const rim=ring(.096,.0065,M.brass,26);rim.rotation.x=Math.PI/2;rim.scale.set(1,1.05,1);rim.position.y=.028;g.add(rim);
  attach(k+'Arm',g,V(sh.x+side*.04,sh.y+.03,sh.z),V(side*.75,1,0),V(0,0,1));}

 /* ---------------- avant-bras : canons et manchettes de gantelet */
 for(const side of [1,-1]){const k=side>0?'Left':'Right';const e=J(k+'ForeArm'),w=J(k+'Hand');const axis=w.clone().sub(e),len=axis.length();
  const g=new T.Group();const c=mesh(new T.CylinderGeometry(.056,.063,len*.62,16,1,true),M.steel);c.material.side=T.DoubleSide;g.add(c);
  for(const yy of [-len*.31,len*.31]){const r=ring(yy>0?.064:.057,.0055,M.brass,20);r.rotation.x=Math.PI/2;r.position.y=-yy;g.add(r);}
  const cuff=mesh(new T.CylinderGeometry(.074,.058,.05,16,1,true),M.steelDark);cuff.material=M.steelDark;cuff.position.y=-len*.36;g.add(cuff);
  attach(k+'ForeArm',g,e.clone().addScaledVector(axis,.55),axis.clone().negate(),V(0,0,1),true);}

 /* ---------------- jambes : tassettes, genouillères, grèves */
 for(const side of [1,-1]){const k=side>0?'Left':'Right';const hip=J(k+'UpLeg'),knee=J(k+'Leg'),ank=J(k+'Foot');
  const t=new T.Group();for(let i=0;i<2;i++){const pl=shell([[.11,-.05],[.112,0],[.108,.05]],1,.8,14,i?M.steelDark:M.steel,-.95,1.9);pl.position.set(0,-i*.07,0);t.add(pl);}
  const tr=ring(.11,.005,M.brass,14);tr.rotation.x=Math.PI/2;tr.position.y=.05;tr.scale.set(1,.8,1);
  if(!opt.noTassets)attach(k+'UpLeg',t,V(hip.x+side*.02,hip.y-.1,hip.z+.006),V(0,1,0),V(side*.22,0,1));
  const kn=new T.Group();const cop=mesh(new T.SphereGeometry(.058,16,10,0,Math.PI*2,0,1.25),M.steel);cop.rotation.x=Math.PI/2;cop.scale.set(1,1,.8);kn.add(cop);
  const wing=mesh(new T.CylinderGeometry(.04,.04,.008,14),M.steelDark);wing.rotation.z=Math.PI/2;wing.position.set(side*.05,0,-.02);kn.add(wing);
  const boss=mesh(new T.SphereGeometry(.012,8,6),M.brass);boss.position.z=.047;kn.add(boss);
  attach(k+'Leg',kn,V(knee.x,knee.y+.005,knee.z+.045),V(0,1,0),V(0,0,1));
  const shin=knee.clone().sub(ank);const gr=new T.Group();
  const gw=opt.greaveScale||1;const gp=shell([[.064*gw,-shin.length()*.36],[.07*gw,0],[.066*gw,shin.length()*.3]],1,.82*(opt.greaveDepth||1),16,M.steel,-1.25,2.5);gr.add(gp);
  attach(k+'Leg',gr,ank.clone().addScaledVector(shin,.5).add(V(0,0,.012)),shin,V(0,0,1));}

 /* ---------------- armes : épée longue et écu, sur l'axe des armes d'origine */
 const oldSword=actor.getObjectByName('Aerin_Sword'),oldShield=actor.getObjectByName('Aerin_Shield');
 function verts(root,filter){const out=[];if(!root)return out;root.traverse(m=>{if(!m.isMesh||!m.geometry.attributes.position)return;if(filter&&!filter(m))return;if(m.isSkinnedMesh)m.skeleton.update(); // matrices d'os calculées même avant le premier rendu
  const p=m.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(m.isSkinnedMesh){if(m.boneTransform)m.boneTransform(i,v);else if(m.applyBoneTransform)m.applyBoneTransform(i,v);}out.push(v.clone().applyMatrix4(m.matrixWorld).applyMatrix4(inv));}});return out;}
 const centroid=a=>a.reduce((s,v)=>s.add(v),V(0,0,0)).multiplyScalar(1/Math.max(1,a.length));
 let sword=null,shield=null;
 {const all=verts(oldSword);const gripV=verts(oldSword,m=>/Cuir/i.test(m.material?.name||''));
  const hand=J('RightHand');let grip=gripV.length?centroid(gripV):hand.clone();
  let tip=all.reduce((b,v)=>v.distanceTo(grip)>b.distanceTo(grip)?v:b,grip.clone());
  if(!all.length){grip=hand.clone().add(V(0,-.04,.04));tip=grip.clone().add(V(0,-.7,.2));}
  const dir=tip.clone().sub(grip).normalize();
  const g=new T.Group();g.name='Aerin_Knight_Sword';
  const L=.74,Wb=.044;// lame à gouttière, pointe effilée
  const bs=new T.Shape();bs.moveTo(-Wb/2,0);bs.lineTo(-Wb/2*.86,L*.82);bs.quadraticCurveTo(-Wb*.2,L*.95,0,L);bs.quadraticCurveTo(Wb*.2,L*.95,Wb/2*.86,L*.82);bs.lineTo(Wb/2,0);bs.lineTo(-Wb/2,0);
  const blade=mesh(new T.ExtrudeGeometry(bs,{depth:.006,bevelEnabled:true,bevelThickness:.0035,bevelSize:.006,bevelSegments:1,steps:1}),M.blade);blade.geometry.translate(0,0,-.003);blade.position.y=.06;g.add(blade);
  const fuller=mesh(new T.BoxGeometry(.008,L*.62,.0115),M.steelDark);fuller.position.y=.06+L*.33;g.add(fuller);
  const cross=new T.Group();const bar=mesh(new T.CylinderGeometry(.011,.011,.2,10),M.brass);bar.rotation.z=Math.PI/2;cross.add(bar);
  for(const s of [-1,1]){const q=mesh(new T.SphereGeometry(.017,10,8),M.brass);q.position.x=s*.1;q.position.y=.012;cross.add(q);const c=mesh(new T.CylinderGeometry(.009,.011,.05,8),M.brass);c.position.set(s*.085,.012,0);c.rotation.z=s*.9;cross.add(c);}
  const ec=mesh(new T.BoxGeometry(.05,.03,.026),M.brass);cross.add(ec);cross.position.y=.055;g.add(cross);
  const hilt=mesh(new T.CylinderGeometry(.0145,.0165,.15,10),M.grip);hilt.position.y=-.02;g.add(hilt);
  for(let i=0;i<5;i++){const wr=ring(.0165,.003,M.leather,10);wr.rotation.x=Math.PI/2;wr.position.y=-.08+i*.03;g.add(wr);}
  const pom=mesh(new T.SphereGeometry(.026,14,10),M.brass);pom.scale.set(1,1,.62);pom.position.y=-.11;g.add(pom);
  const gem=mesh(new T.SphereGeometry(.012,10,8),M.gem);gem.position.set(0,-.11,.014);g.add(gem);
  const gem2=gem.clone();gem2.position.z=-.014;g.add(gem2);
  // repère : Y = lame, Z = plat de la lame face à l'avant de la main
  const zHint=V(0,0,1).sub(dir.clone().multiplyScalar(dir.z));
  const sg=attach('RightHand',g,grip,dir,zHint.lengthSq()>.01?zHint:V(1,0,0),true);
  sword={group:sg,base:V(0,.1,0),tip:V(0,.06+L,0)};
 }
 {const all=verts(oldShield);const hand=J('LeftHand');let c=all.length?centroid(all):hand.clone().add(V(.08,.08,.14));
  // normale = axe de plus petite étendue ; on l'oriente à l'opposé de la main
  let n=V(0,0,1);if(all.length){const box=new T.Box3().setFromPoints(all),s=box.getSize(V(0,0,0));n=s.x<s.y&&s.x<s.z?V(1,0,0):s.y<s.z?V(0,1,0):V(0,0,1);if(c.clone().sub(hand).dot(n)<0)n.negate();}
  const g=new T.Group();g.name='Aerin_Knight_Shield';
  const H=.5,W=.4;const s=new T.Shape();s.moveTo(-W/2,H*.32);s.lineTo(W/2,H*.32);s.lineTo(W/2,-H*.02);s.quadraticCurveTo(W*.47,-H*.42,0,-H*.68);s.quadraticCurveTo(-W*.47,-H*.42,-W/2,-H*.02);s.lineTo(-W/2,H*.32);
  const face=mesh(new T.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:16}),M.shieldField);g.add(face);
  const rimS=new T.Shape();rimS.moveTo(-W/2-.016,H*.32+.016);rimS.lineTo(W/2+.016,H*.32+.016);rimS.lineTo(W/2+.016,-H*.02);rimS.quadraticCurveTo(W*.47+.016,-H*.43,0,-H*.68-.03);rimS.quadraticCurveTo(-W*.47-.016,-H*.43,-W/2-.016,-H*.02);rimS.lineTo(-W/2-.016,H*.32+.016);
  rimS.holes.push(s);const rim=mesh(new T.ExtrudeGeometry(rimS,{depth:.03,bevelEnabled:false,curveSegments:16}),M.steel);rim.position.z=-.004;g.add(rim);
  // chêne doré : feuille + gland, bande transversale
  const band=mesh(new T.BoxGeometry(W*.98,.05,.008),M.brass);band.position.set(0,H*.2,.03);g.add(band);
  const lf=new T.Shape();lf.moveTo(0,-.15);for(let i=0;i<=8;i++){const a=i/8;const y=-.15+a*.3;const w=.07*Math.sin(Math.PI*a)*(1+.28*Math.sin(a*Math.PI*6));lf.lineTo(w,y);}for(let i=8;i>=0;i--){const a=i/8;const y=-.15+a*.3;const w=.07*Math.sin(Math.PI*a)*(1+.28*Math.sin(a*Math.PI*6));lf.lineTo(-w,y);}
  const leaf=mesh(new T.ExtrudeGeometry(lf,{depth:.006,bevelEnabled:false}),M.brass);leaf.position.set(0,-.06,.027);g.add(leaf);
  const vein=mesh(new T.BoxGeometry(.006,.28,.004),M.steelDark);vein.position.set(0,-.06,.034);g.add(vein);
  const boss=mesh(new T.SphereGeometry(.03,14,8,0,Math.PI*2,0,Math.PI/2),M.steel);boss.rotation.x=Math.PI/2;boss.position.set(0,H*.2,.03);g.add(boss);
  g.position.set(0,0,0);
  const up=V(0,1,0).sub(n.clone().multiplyScalar(n.y)).normalize();
  // centre de l'écu : légèrement décalé vers la pointe, face extérieure selon la normale
  shield={group:attach('LeftHand',g,c.clone().add(V(0,.04,0)),up,n,true)};
 }
 if(oldSword)oldSword.visible=false;if(oldShield)oldShield.visible=false;
 if(oldSword)oldSword.userData.replacedV11=true;if(oldShield)oldShield.userData.replacedV11=true;

 /* ---------------- cape physique (Verlet) */
 const cape=(function(){
  const CW=7,CH=10,len=.82,anchorY=1.255;const spine=bones.Spine2;
  const anchorsLocal=[];const spineInv=new T.Matrix4().multiplyMatrices(inv,spine.matrixWorld).invert();
  for(let i=0;i<CW;i++){const u=i/(CW-1);const x=(u-.5)*.36;const p=V(x,anchorY-Math.abs(u-.5)*.05,-.115-.04*(1-Math.abs(u-.5)*2)).applyMatrix4(spineInv);anchorsLocal.push(p);}
  const N=CW*CH,pos=new Float32Array(N*3),prev=new Float32Array(N*3);
  const geo=new T.BufferGeometry();const vpos=new Float32Array(N*3),uv=new Float32Array(N*2),idx=[];
  for(let j=0;j<CH;j++)for(let i=0;i<CW;i++){uv.set([i/(CW-1),1-j/(CH-1)],(j*CW+i)*2);if(i<CW-1&&j<CH-1){const a=j*CW+i,b=a+1,c=a+CW,d=c+1;idx.push(a,c,b,b,c,d);}}
  geo.setAttribute('position',new T.BufferAttribute(vpos,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(idx);
  // liseré doré peint dans une petite texture
  const cv=document.createElement('canvas');cv.width=64;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#1c2f52';cx.fillRect(0,0,64,128);cx.fillStyle='#c9973a';cx.fillRect(0,120,64,8);cx.fillRect(0,0,3,128);cx.fillRect(61,0,3,128);cx.fillStyle='rgba(255,255,255,.04)';for(let y=0;y<128;y+=4)cx.fillRect(0,y,64,1);
  const tex=new T.CanvasTexture(cv);if('colorSpace' in tex)tex.colorSpace=T.SRGBColorSpace;else tex.encoding=T.sRGBEncoding;
  const mat=new T.MeshStandardMaterial({color:0xffffff,map:tex,roughness:.92,metalness:0,side:T.DoubleSide});
  const m=new T.Mesh(geo,mat);m.frustumCulled=false;m.castShadow=true;m.receiveShadow=true;m.name='Aerin_Knight_Cape';
  const seg=len/(CH-1),cons=[];
  const add=(a,b)=>cons.push([a,b,0]);
  for(let j=0;j<CH;j++)for(let i=0;i<CW;i++){const a=j*CW+i;if(i<CW-1)add(a,a+1);if(j<CH-1)add(a,a+CW);if(i<CW-1&&j<CH-1){add(a,a+CW+1);add(a+1,a+CW);}if(j<CH-2)add(a,a+2*CW);}
  let ready=false,acc=0;const tmp=V(0,0,0),wp=[];for(let i=0;i<CW;i++)wp.push(V(0,0,0));
  const colliders=[['Spine1','Spine2',.165],['Spine','Spine1',.16],['Hips','Spine',.17],['LeftUpLeg','LeftLeg',.095],['RightUpLeg','RightLeg',.095],['LeftLeg','LeftFoot',.075],['RightLeg','RightFoot',.075]];
  const ca=V(0,0,0),cb=V(0,0,0),ab=V(0,0,0),ap=V(0,0,0);
  function init(){for(let i=0;i<CW;i++){wp[i].copy(anchorsLocal[i]).applyMatrix4(spine.matrixWorld);}
   // le long du dos : direction épaules → bassin, légèrement écartée vers l'arrière
   const sp=spine.getWorldPosition(V(0,0,0)),hp=bones.Hips.getWorldPosition(V(0,0,0)),down=hp.sub(sp).normalize();
   const mid=wp[(CW/2)|0].clone(),back=mid.sub(sp);back.addScaledVector(down,-back.dot(down));if(back.lengthSq()>1e-6)back.normalize();
   for(let j=0;j<CH;j++)for(let i=0;i<CW;i++){const k=(j*CW+i)*3,q=wp[i].clone().addScaledVector(down,j*seg).addScaledVector(back,j*seg*.18);pos[k]=q.x;pos[k+1]=q.y;pos[k+2]=q.z;prev.set([pos[k],pos[k+1],pos[k+2]],k);}
   for(const c of cons){const a=c[0]*3,b=c[1]*3;c[2]=Math.hypot(pos[a]-pos[b],pos[a+1]-pos[b+1],pos[a+2]-pos[b+2]);}
   ready=true;}
  function collide(k){tmp.set(pos[k],pos[k+1],pos[k+2]);
   for(const [a,b,r] of colliders){if(!bones[a]||!bones[b])continue;bones[a].getWorldPosition(ca);bones[b].getWorldPosition(cb);ab.subVectors(cb,ca);const l2=ab.lengthSq();let t=l2>0?ap.subVectors(tmp,ca).dot(ab)/l2:0;t=Math.max(0,Math.min(1,t));ap.copy(ca).addScaledVector(ab,t);const d=tmp.distanceTo(ap),rr=r*(opt.scale||1);if(d<rr&&d>1e-5){tmp.sub(ap).multiplyScalar(rr/d).add(ap);}}
   const ground=(opt.groundY?opt.groundY():0)+.02;if(tmp.y<ground)tmp.y=ground;pos[k]=tmp.x;pos[k+1]=tmp.y;pos[k+2]=tmp.z;}
  function step(h,wind){for(let n=0;n<N;n++){const k=n*3;if(n<CW)continue;const vx=(pos[k]-prev[k])*.985,vy=(pos[k+1]-prev[k+1])*.985,vz=(pos[k+2]-prev[k+2])*.985;prev[k]=pos[k];prev[k+1]=pos[k+1];prev[k+2]=pos[k+2];pos[k]+=vx+wind.x*h*h;pos[k+1]+=vy-9.8*h*h;pos[k+2]+=vz+wind.z*h*h;}
   for(let i=0;i<CW;i++){const k=i*3;pos[k]=wp[i].x;pos[k+1]=wp[i].y;pos[k+2]=wp[i].z;}
   for(let it=0;it<4;it++){for(const [a0,b0,rest] of cons){const a=a0*3,b=b0*3;const dx=pos[b]-pos[a],dy=pos[b+1]-pos[a+1],dz=pos[b+2]-pos[a+2];const d=Math.hypot(dx,dy,dz)||1e-6;const diff=(d-rest)/d;const pa=a0<CW?0:.5,pb=b0<CW?0:.5,s=pa+pb;if(!s)continue;const wa=pa/s,wb=pb/s;
     pos[a]+=dx*diff*wa;pos[a+1]+=dy*diff*wa;pos[a+2]+=dz*diff*wa;pos[b]-=dx*diff*wb;pos[b+1]-=dy*diff*wb;pos[b+2]-=dz*diff*wb;}
    for(let n=CW;n<N;n++)collide(n*3);}}
  function update(dt,time){if(!m.parent){let root=actor;while(root.parent)root=root.parent;root.add(m);}
   for(let i=0;i<CW;i++)wp[i].copy(anchorsLocal[i]).applyMatrix4(spine.matrixWorld);
   if(!ready)init();
   const wind=V(Math.sin(time*.7)*.6,0,Math.cos(time*.43)*.5);
   acc+=Math.min(dt,.05);const h=1/90;let guard=0;while(acc>=h&&guard++<6){step(h,wind);acc-=h;}
   // téléportation (reset) : on réinitialise si la cape s'est trop éloignée
   if(Math.hypot(pos[(CH-1)*CW*3]-wp[0].x,pos[(CH-1)*CW*3+2]-wp[0].z)>2)init();
   vpos.set(pos);geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();}
  return {mesh:m,update,reset(){ready=false;},set visible(v){m.visible=v;}};
 })();

 /* ---------------- traînée de lame */
 const trail=(function(){const S=16,LIFE=.12;const geo=new T.BufferGeometry();const p=new Float32Array(S*2*3),c=new Float32Array(S*2*3),idx=[];
  for(let i=0;i<S-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('color',new T.BufferAttribute(c,3));geo.setIndex(idx);
  const mat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const m=new T.Mesh(geo,mat);m.frustumCulled=false;m.renderOrder=5;m.name='Aerin_Sword_Trail';
  // Échantillons datés : la traînée couvre au plus 0,12 s, quelle que soit la cadence d'images.
  const hist=[];let strength=0,clock=0;const b=V(0,0,0),t=V(0,0,0);let color=[.75,.92,1];
  function update(dt,on,tint){if(!m.parent){let root=actor;while(root.parent)root=root.parent;root.add(m);}
   clock+=dt;if(tint)color=tint;strength+=((on?1:0)-strength)*(1-Math.exp(-dt*(on?28:10)));
   b.copy(sword.base).applyMatrix4(sword.group.matrixWorld);t.copy(sword.tip).applyMatrix4(sword.group.matrixWorld);
   // la base de la traînée part du milieu de la lame : ruban plus fin, lisible
   const mid=b.clone().lerp(t,.42);
   hist.unshift([mid.x,mid.y,mid.z,t.x,t.y,t.z,clock]);while(hist.length>S||(hist.length>2&&clock-hist[hist.length-1][6]>LIFE))hist.pop();
   m.visible=strength>.03&&sword.group.visible&&hist.length>2;if(!m.visible)return;
   const n=hist.length;
   for(let i=0;i<S;i++){const h=hist[Math.min(i,n-1)],age=Math.min(1,(clock-h[6])/LIFE),f=(1-age)*(1-age)*strength*(i<n?.62:0);p.set(h.slice(0,3),i*6);p.set(h.slice(3,6),i*6+3);
    c.set([color[0]*f*.15,color[1]*f*.15,color[2]*f*.15],i*6);c.set([color[0]*f,color[1]*f,color[2]*f],i*6+3);}
   geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeBoundingSphere();}
  return {mesh:m,update,tipWorld:()=>t.clone()};})();

 /* ---------------- étincelles d'impact */
 const sparks=(function(){const N=48;const geo=new T.BufferGeometry();const p=new Float32Array(N*3),c=new Float32Array(N*3);const v=new Float32Array(N*3),life=new Float32Array(N);
  geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('color',new T.BufferAttribute(c,3));
  const m=new T.Points(geo,new T.PointsMaterial({size:.06,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.frustumCulled=false;m.name='Aerin_Sparks';let head=0;
  function burst(at,n=16,col=[1,.8,.4]){for(let k=0;k<n;k++){const i=head++%N;p.set([at.x,at.y,at.z],i*3);const a=Math.random()*Math.PI*2,u=Math.random()*2-1,s=1.8+Math.random()*3.2;v.set([Math.cos(a)*Math.sqrt(1-u*u)*s,Math.abs(u)*s+.6,Math.sin(a)*Math.sqrt(1-u*u)*s],i*3);life[i]=.28+Math.random()*.22;c.set(col,i*3);}}
  function update(dt){if(!m.parent){let root=actor;while(root.parent)root=root.parent;root.add(m);}let any=false;
   for(let i=0;i<N;i++){if(life[i]<=0){c.set([0,0,0],i*3);continue;}any=true;life[i]-=dt;v[i*3+1]-=9*dt;p[i*3]+=v[i*3]*dt;p[i*3+1]+=v[i*3+1]*dt;p[i*3+2]+=v[i*3+2]*dt;const f=Math.max(0,life[i]/.4);c[i*3]*=.93;c[i*3+1]*=.9;c[i*3+2]*=.85;if(f<=0)c.set([0,0,0],i*3);}
   m.visible=any;geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;}
  return {mesh:m,burst,update};})();

 /* ---------------- V13 : fourreau à la hanche gauche, épée rengainée, écu dans le dos */
 // Lame du fourreau : de la bouche (près de la hanche, devant) vers la pointe (en bas, derrière).
 const hipL=J('LeftUpLeg'),hipC=J('Hips');
 const mouth=V(hipC.x+.215,hipC.y+.035,hipC.z+.085),bladeDir=V(.06,-.84,-.54).normalize();
 const scab=(function(){const g=new T.Group();g.name='Aerin_Knight_Fourreau';const L=.78;
  const sh=new T.Shape();sh.moveTo(-.034,0);sh.lineTo(-.03,L*.9);sh.quadraticCurveTo(0,L*1.02,.03,L*.9);sh.lineTo(.034,0);sh.lineTo(-.034,0);
  const body=mesh(new T.ExtrudeGeometry(sh,{depth:.022,bevelEnabled:true,bevelThickness:.005,bevelSize:.005,bevelSegments:1}),M.leather);body.geometry.translate(0,0,-.011);g.add(body);
  const locket=mesh(new T.BoxGeometry(.084,.05,.042),M.brass);locket.position.y=.02;g.add(locket);
  const chape=mesh(new T.ConeGeometry(.036,.09,10),M.brass);chape.rotation.x=Math.PI;chape.position.y=L*.95;chape.scale.z=.6;g.add(chape);
  for(const yy of [.16,.42]){const band=mesh(new T.BoxGeometry(.078,.016,.036),M.brass);band.position.y=yy;g.add(band);}
  const strap=mesh(new T.BoxGeometry(.03,.12,.01),M.leather);strap.position.set(0,-.03,-.02);strap.rotation.x=.4;g.add(strap);
  // le repère « épée » a Y = lame : on place la bouche au point « mouth », pointe vers bladeDir
  return attach('Hips',g,mouth,bladeDir,V(1,0,.2));})();
 function makeStowed(){
  // épée : la garde repose sur la bouche du fourreau, la poignée dépasse vers l'avant-haut
  const sw=sword.group.clone(true);sw.userData.keepParts=true;sw.name='Aerin_Knight_Epee_Rangee';
  const grip=mouth.clone().addScaledVector(bladeDir,-.095);
  const s1=attach('Hips',sw,grip,bladeDir,V(1,0,.2));parts.pop(); // gérée par showEquipment
  // écu : à plat dans le dos, légèrement incliné, face vers l'arrière
  const shc=shield.group.clone(true);shc.userData.keepParts=true;shc.name='Aerin_Knight_Ecu_Dos';
  const back=J('Spine2').add(V(.0,-.06,-.215));
  const s2=attach('Spine2',shc,back,V(-.12,1,0),V(0,.05,-1));parts.pop();
  for(const o of [s1,s2]){o.visible=false;o.traverse(m=>{if(m.isMesh){m.castShadow=true;}});}
  return {sword:s1,shield:s2};
 }
 function setFirstPerson(on){for(const o of parts)o.visible=!on||fpKeep.has(o);cape.visible=!on;}
 return {parts,sword,shield,cape,trail,sparks,bones,setFirstPerson,makeStowed,scabbard:scab,materials:M,version:13};
}
window.AerinKnightV11={dress};
})();
