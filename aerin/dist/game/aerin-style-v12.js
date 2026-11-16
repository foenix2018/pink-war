/* Aerin V12 — silhouette plus réaliste et rendu cel shading.
 * 1. Proportions : tête plus petite (≈ 7 têtes de haut au lieu de 5,5), cou dégagé, épaules plus
 *    larges, buste, cuisses et tibias plus longs. Seules les positions de repos des os changent :
 *    les clips n'animent que les rotations (+ la position du bassin), donc toutes les animations
 *    restent valables. Les pistes de position/échelle constantes du GLB sont retirées.
 * 2. Cel shading : matériaux « toon » à 3 paliers de lumière, normales lissées (plus de facettes),
 *    contour encré par coque inversée, y compris sur les pièces animées par le squelette.
 * Compatible Three r128 (WebGL) et r181 (WebGPU). */
(function(){
'use strict';
const PROPORTIONS={head:.86,neck:1.3,spine:1.05,shoulder:1.14,thigh:1.09,shin:1.08,forearm:1.03};

// Retire des clips GLB les pistes position/échelle (constantes) sauf celle du bassin.
function stripTracks(clips){
 for(const c of clips){c.tracks=c.tracks.filter(t=>t.name.endsWith('.quaternion')||/Hips\.position$/.test(t.name));c.resetDuration?.();}
 return clips;
}

function bonesOf(actor){const b={};actor.traverse(o=>{if(o.isBone)b[o.name.replace(/^mixamorig:?/,'')]=o;});return b;}

// Applique les proportions ; renvoie la hauteur à ajouter sous les pieds (jambes allongées).
function proportions(T,actor,neutral,p=PROPORTIONS){
 const b=bonesOf(actor);if(!b.Hips||actor.userData.proportionsV12)return actor.userData.liftV12||0;
 const pose=()=>{if(neutral){const m=new T.AnimationMixer(actor),a=m.clipAction(neutral);a.play();m.update(0);a.stop();m.uncacheRoot(actor);}actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);};
 pose();const inv=new T.Matrix4().copy(actor.matrixWorld).invert();
 const footY=()=>Math.min(b.LeftFoot.getWorldPosition(new T.Vector3()).applyMatrix4(inv).y,b.RightFoot.getWorldPosition(new T.Vector3()).applyMatrix4(inv).y);
 const y0=footY();
 const mul=(k,f)=>{if(b[k])b[k].position.multiplyScalar(f);};
 b.Head.scale.setScalar(p.head);mul('Head',p.neck);
 mul('Spine1',p.spine);mul('Spine2',p.spine);
 mul('LeftArm',p.shoulder);mul('RightArm',p.shoulder);
 mul('LeftLeg',p.thigh);mul('RightLeg',p.thigh);mul('LeftFoot',p.shin);mul('RightFoot',p.shin);
 mul('LeftHand',p.forearm);mul('RightHand',p.forearm);
 pose();const lift=Math.max(0,y0-footY());
 actor.userData.proportionsV12=true;actor.userData.liftV12=lift;return lift;
}

// Palier de lumière (texture 4 × 1, filtrage au plus proche).
let gradient=null;
function gradientMap(T){
 if(gradient)return gradient;
 const d=new Uint8Array([70,70,70,255, 145,145,145,255, 212,212,212,255, 255,255,255,255]);
 gradient=new T.DataTexture(d,4,1,T.RGBAFormat);gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;return gradient;
}

// Normales lissées : moyenne des normales aux positions confondues (les arêtes vives disparaissent).
function smoothNormals(T,geo,threshold=.5){
 const pos=geo.attributes.position,n=geo.attributes.normal;if(!pos||!n)return;
 const key=i=>`${Math.round(pos.getX(i)*1e4)},${Math.round(pos.getY(i)*1e4)},${Math.round(pos.getZ(i)*1e4)}`;
 const acc=new Map(),v=new T.Vector3();
 for(let i=0;i<pos.count;i++){const k=key(i);const a=acc.get(k)||[0,0,0];a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);acc.set(k,a);}
 for(let i=0;i<pos.count;i++){const a=acc.get(key(i));v.set(a[0],a[1],a[2]);if(v.lengthSq()<1e-8)continue;v.normalize();
  // garde les vrais angles (bords de plaques) : on ne lisse que si l'écart est modéré
  const ox=n.getX(i),oy=n.getY(i),oz=n.getZ(i);if(ox*v.x+oy*v.y+oz*v.z<threshold)continue;n.setXYZ(i,v.x,v.y,v.z);}
 n.needsUpdate=true;
}
// Direction de gonflement du contour : moyenne SANS seuil (sinon la coque se fend aux arêtes).
function outlineGeometry(T,geo,width){
 const g=geo.clone(),pos=g.attributes.position,n=geo.attributes.normal;if(!n)g.computeVertexNormals();
 const nn=g.attributes.normal;const key=i=>`${Math.round(pos.getX(i)*1e4)},${Math.round(pos.getY(i)*1e4)},${Math.round(pos.getZ(i)*1e4)}`;
 const acc=new Map();for(let i=0;i<pos.count;i++){const k=key(i);const a=acc.get(k)||[0,0,0];a[0]+=nn.getX(i);a[1]+=nn.getY(i);a[2]+=nn.getZ(i);acc.set(k,a);}
 const v=new T.Vector3(),out=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){const a=acc.get(key(i));v.set(a[0],a[1],a[2]);if(v.lengthSq()<1e-8)v.set(0,1,0);v.normalize();out[i*3]=pos.getX(i)+v.x*width;out[i*3+1]=pos.getY(i)+v.y*width;out[i*3+2]=pos.getZ(i)+v.z*width;}
 g.setAttribute('position',new T.BufferAttribute(out,3));return g;
}

const toonCache=new Map();
function toonOf(T,m,opt,skinned){
 if(!m||m.isMeshToonMaterial||m.userData?.keepV12)return m;const ck=skinned?'s':'r';const cached=toonCache.get(m);if(cached&&cached[ck])return cached[ck];
 const name=(m.name||'');const metal=(m.metalness||0)>.4;
 const t=new T.MeshToonMaterial({color:m.color?m.color.clone():new T.Color(0xffffff),map:m.map||null,gradientMap:gradientMap(T),side:m.side,transparent:m.transparent,opacity:m.opacity});
 t.name=name+' · toon';
 // le palier plein éclaire plus qu'un cosinus : on ramène la couleur à la luminosité du rendu standard
 t.color.multiplyScalar(opt.gain||.62);
 if(m.emissive)t.emissive=m.emissive.clone();if(m.emissiveIntensity!==undefined)t.emissiveIntensity=m.emissiveIntensity;
 // métal : teinte plus claire (le toon n'a pas de reflet) et léger éclat propre
 if(metal){t.color.multiplyScalar(.6-.3*(m.metalness||0));t.color.offsetHSL(.02,.07,0);}
 if(skinned)t.skinning=true; // Three r128 : obligatoire sur maillage skinné (ignoré en r181)
 if(/peau/i.test(name))t.color.offsetHSL(0,-.06,.04); // peau un peu moins orangée
 const e=cached||{};e[ck]=t;toonCache.set(m,e);return t;
}

// Passe tout le personnage en cel shading et ajoute les contours.
function celShade(T,root,opt={}){
 const width=opt.width||.0075,ink=new T.MeshBasicMaterial({color:opt.ink||0x15211b,side:T.BackSide});ink.userData.keepV12=true;ink.name='Aerin · encre';
 const inkSkin=ink.clone();inkSkin.skinning=true;inkSkin.userData.keepV12=true;
 const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.userData.outlineV12&&!o.userData.noOutlineV12)meshes.push(o);});
 root.updateMatrixWorld(true);const s=new T.Vector3();
 let outlines=0;
 for(const o of meshes){
  const mats=Array.isArray(o.material)?o.material:[o.material];
  if(mats.some(m=>m&&(m.blending===T.AdditiveBlending||m.isPointsMaterial)))continue;
  o.material=Array.isArray(o.material)?mats.map(m=>toonOf(T,m,opt,o.isSkinnedMesh)):toonOf(T,o.material,opt,o.isSkinnedMesh);
  if(o.userData.smoothV12!==false&&o.geometry.attributes.normal){o.geometry=o.geometry.clone();smoothNormals(T,o.geometry,o.isSkinnedMesh?.2:.75);}
  if(opt.outline===false||o.userData.noInkV12)continue;
  if(/Yeux|Bouche/i.test(mats[0]?.name||''))continue; // détails du visage : pas d'encre
  o.getWorldScale(s);const w=width/Math.max(1e-4,(s.x+s.y+s.z)/3);
  const g=outlineGeometry(T,o.geometry,w);let line;
  if(o.isSkinnedMesh){line=new T.SkinnedMesh(g,inkSkin);line.bind(o.skeleton,o.bindMatrix);}else line=new T.Mesh(g,ink);
  line.position.copy(o.position);line.quaternion.copy(o.quaternion);line.scale.copy(o.scale);
  line.userData.outlineV12=true;line.castShadow=false;line.receiveShadow=false;line.frustumCulled=false;line.name=(o.name||'piece')+'_encre';line.renderOrder=-1;
  o.parent.add(line);outlines++;
 }
 return {outlines,ink};
}
window.AerinStyleV12={PROPORTIONS,stripTracks,proportions,celShade,gradientMap,version:12};
})();
