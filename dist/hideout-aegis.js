// AEGIS extension: the original Blender apartment and its stations are retained.
export const AEGIS_WINGS = [
 {id:'command',name:'Commandement AEGIS',side:-1,bounds:[-26.8,-11.35,-11.15,-2.25],entry:{x:-19,z:-3.5}},
 {id:'intel',name:'Renseignement et transmissions',side:-1,bounds:[-26.8,2.25,-11.15,11.35],entry:{x:-19,z:3.5}},
 {id:'medical',name:'Infirmerie',side:1,bounds:[11.15,-11.35,26.8,-2.25],entry:{x:19,z:-3.5}},
 {id:'engineering',name:'Laboratoire et ingénierie',side:1,bounds:[11.15,2.25,26.8,11.35],entry:{x:19,z:3.5}}
];
const gate={z:.45,half:1.3,height:2.65};
const H=3.65;
function solid(layout,kind,x,z,w,d,h=H,y=0){layout.colliders.push({kind,x,z,hx:w/2,hz:d/2,height:h,y});}
function architecture(layout,add){
 const wall=(x,z,w,d,h=H,y=0,kind='AEGIS / cloison')=>{solid(layout,kind,x,z,w,d,h,y);add?.('Béton sombre',x,y+h/2,z,w,h,d);};
 for(const side of [-1,1]){
  const x=side*10.9,a=gate.z-gate.half,b=gate.z+gate.half;
  wall(x,(-11.7+a)/2,.3,a+11.7);wall(x,(11.7+b)/2,.3,11.7-b);
  wall(x,gate.z,.3,gate.half*2,H-gate.height,gate.height);
  wall(side*27,0,.3,23.4);
  for(const z of [-11.55,11.55])wall(side*19,z,16.2,.3);
  for(const z of [-2.25,2.25]){
   // Central 3 m doorway in each sector divider.
   wall(side*14.1,z,5.8,.24);wall(side*23.55,z,7.1,.24);
   wall(side*18.5,z,3,.24,H-gate.height,gate.height);
  }
 }
}
function equipment(layout,add){
 const obj=(kind,m,x,z,w,d,h,y=0)=>{solid(layout,kind,x,z,w,d,h,y);add?.(m,x,y+h/2,z,w,h,d);};
 // Keep all circulation paths and room entrances clear of furniture.
 obj('AEGIS / table tactique','Acier patiné',-19,-7.5,4.8,2.15,1.03);
 for(const x of [-24.5,-21.7,-18.9,-16.1,-13.3])obj('AEGIS / pupitre','Cadres anthracite',x,-10.55,2.25,.85,1.05);
 for(const x of [-24.7,-13.2])for(const z of [4.7,6.7,8.7,10.25])obj('AEGIS / baie réseau','Cadres anthracite',x,z,.85,.95,2.35);
 obj('AEGIS / console transmissions','Acier patiné',-19,9.8,4.6,1.1,1);
 for(const x of [14.2,18.5,22.8])obj('AEGIS / lit médical','Peinture médicale',x,-8.8,1.15,2.4,.72);
 obj('AEGIS / armoire médicale','Peinture médicale',25.7,-7.6,.8,4,2.15);
 for(const x of [14.5,18.5,22.5])obj('AEGIS / établi','Acier patiné',x,10.15,3.1,1.15,.98);
 for(const z of [5.1,8.0])obj('AEGIS / cellule technique','Cadres anthracite',25.4,z,1.4,1.4,2.45);
}
export function extendAegisLayout(layout){
 if(layout.aegisRevision)return layout;
 layout.aegisRevision=1;layout.originalBounds={...layout.bounds};
 layout.bounds={x1:-26.7,x2:26.7,z1:-11.25,z2:11.35};
 layout.colliders=layout.colliders.filter(c=>!((c.kind==='Architecture'||c.kind==='Toiture complète')&&Math.abs(Math.abs(c.x)-10.9)<.01&&c.hz>11));
 architecture(layout);equipment(layout);
 for(const r of AEGIS_WINGS)layout.rooms.push({id:'aegis-'+r.id,name:r.name,bounds:r.bounds});
 return layout;
}
// Remove only the authored exterior side-wall faces. All other Blender primitives,
// UVs, furnishings, roof and panoramic glazing remain unchanged.
export function removeOriginalSideWalls(T,primitives){
 let removed=0;
 for(const p of primitives){
  if(!['Béton sombre','Toiture technique'].includes(p.material))continue;
  const g=p.geometry,a=g.attributes.position,idx=g.index;if(!idx)continue;
  const kept=[];let changed=0;
  for(let i=0;i<idx.count;i+=3){
   const v=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
   const side=Math.sign(a.getX(v[0]));
   const wall=v.every(j=>Math.sign(a.getX(j))===side&&Math.abs(Math.abs(a.getX(j))-10.9)<.17&&Math.abs(a.getZ(j))<11.73&&a.getY(j)>=(p.material==='Béton sombre'?-.02:2.07)&&a.getY(j)<=(p.material==='Béton sombre'?2.12:3.69));
   if(wall)changed++;else kept.push(...v);
  }
  if(changed){g.setIndex(new T.BufferAttribute(a.count>65535?new Uint32Array(kept):new Uint16Array(kept),1));removed+=changed;}
 }
 return removed;
}
export function createAegisExpansion(T,layout,materials,{low=false}={}){
 const root=new T.Group(),interior=new T.Group();root.name='AEGIS / ailes opérationnelles';interior.name='AEGIS / plafonds';interior.visible=false;root.add(interior);
 const batches=new Map(),geo=new T.BoxGeometry(1,1,1),owned=[],textures=[],extraGeos=[];
 const add=(m,x,y,z,w,h,d,hidden=false)=>{const k=m+'|'+hidden;if(!batches.has(k))batches.set(k,{m,hidden,items:[]});batches.get(k).items.push([x,y,z,w,h,d]);};
 const ghost={colliders:[]};architecture(ghost,add);equipment(ghost,add);
 const steel='Acier patiné',frame='Cadres anthracite',metal='Métal brossé',blue='Néon bleu',pink='Néon rose',white='Néon blanc';
 for(const side of [-1,1]){
  // Floor tiles, ceiling beams, structural pillars and continuous corridor lighting.
  for(let x=12;x<=26;x+=2)for(let z=-11;z<=11;z+=2)add('Sol graphite',side*x,-.035,z,1.98,.1,1.98);
  add('Sol graphite',side*10.95,-.035,gate.z,.75,.1,2.6);
  add('Toiture technique',side*19,3.72,0,16.2,.14,23.2,true);
  for(const z of [-10.8,-6.8,-2.3,2.3,6.8,10.8]){
   for(const x of [11.5,26.45]){add(steel,side*x,1.82,z,.48,3.64,.48);add(frame,side*x,3.38,z,.64,.18,.64);}
   add(steel,side*19,3.48,z,15.3,.24,.35,true);
   add(white,side*19,3.32,z,11,.035,.09,true);
  }
  for(const z of [-1.9,1.9]){add(frame,side*19,.026,z,15.6,.028,.15);add(side<0?pink:blue,side*19,.047,z,15.4,.02,.045);}
  for(const z of [gate.z-gate.half,gate.z+gate.half]){add(metal,side*10.9,1.32,z,.65,2.65,.16);add(side<0?pink:blue,side*10.55,1.32,z,.03,2.55,.05);}
  add(steel,side*10.9,2.73,gate.z,.65,.16,2.85);
  for(const z of [-2.25,2.25]){
   for(const x of [17,20])add(metal,side*x,1.32,z,.15,2.65,.48);
   add(steel,side*18.5,2.73,z,3.15,.16,.48);
  }
 }
 // Command table: raised tactical glass, edge lighting, chairs and console screens.
 add(frame,-19,1.06,-7.5,4.95,.10,2.3);add(blue,-19,1.13,-7.5,4.65,.025,2.03);
 add(frame,-19,1.16,-7.5,4.46,.035,1.86);
 for(const x of [-24.5,-21.7,-18.9,-16.1,-13.3]){
  add(metal,x,1.12,-10.55,2.35,.1,.95);add(frame,x,1.58,-10.9,1.8,.85,.15);add(blue,x,1.58,-10.80,1.55,.63,.025);
 }
 for(const x of [-24.7,-13.2])for(const z of [4.7,6.7,8.7,10.25]){
  for(let y=.28;y<2.25;y+=.19){add(steel,x,y,z,.75,.13,1);add(blue,x+.26,y,z+.51,.14,.035,.025);}
 }
 for(const x of [14.2,18.5,22.8]){
  add('Tissu neutre',x,.81,-8.8,1.02,.19,2.22);add('Peinture médicale',x,.93,-9.55,.85,.15,.5);
  add(metal,x,1.05,-9.96,1.15,.46,.12);for(const dx of [-.58,.58])add(metal,x+dx,.92,-8.8,.07,.28,1.6);
  add(frame,x+.78,1.42,-9.65,.34,.58,.16);add(blue,x+.78,1.42,-9.55,.27,.42,.025);
 }
 for(const x of [14.5,18.5,22.5]){
  add(metal,x,1.03,10.15,3.18,.1,1.22);add(frame,x,1.66,10.61,2.65,1.05,.13);
  for(let dx=-1;dx<=1;dx+=.4)add(blue,x+dx,1.55,10.53,.12,.04,.025);
 }
 for(const z of [5.1,8]){add(metal,25.4,2.45,z,1.52,.15,1.52);add(blue,24.67,1.5,z,.035,1.4,.85);}
 for(const {m,hidden,items} of batches.values()){
  const material=materials.get(m);if(!material)continue;
  const mesh=new T.InstancedMesh(geo,material,items.length),dummy=new T.Object3D();
  items.forEach(([x,y,z,w,h,d],i)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='AEGIS / '+m;(hidden?interior:root).add(mesh);
 }
 function sign(text,sub,x,y,z,rotation=0,w=3.4,h=.76){
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const c=cv.getContext('2d');
  c.fillStyle='#101b27';c.fillRect(0,0,512,128);c.strokeStyle='#4e96b1';c.lineWidth=4;c.strokeRect(4,4,504,120);c.fillStyle='#86e9ff';c.font='bold 39px sans-serif';c.fillText(text,20,55,472);c.fillStyle='#c4cbd9';c.font='22px monospace';c.fillText(sub,20,95,472);
  const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;textures.push(map);const mat=new T.MeshBasicMaterial({map,toneMapped:false,side:T.DoubleSide});owned.push(mat);const g=new T.PlaneGeometry(w,h);extraGeos.push(g);const mesh=new T.Mesh(g,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;root.add(mesh);
 }
 sign('AEGIS / COMMAND','VESPER · SECTEUR 01',-18.5,2.98,-2.09,0);
 sign('AEGIS / INTEL','RÉSEAU · SECTEUR 02',-18.5,2.98,2.09,Math.PI);
 sign('AEGIS / MEDICAL','SOINS · SECTEUR 03',18.5,2.98,-2.09,0);
 sign('AEGIS / ENGINEERING','NANO · SECTEUR 04',18.5,2.98,2.09,Math.PI);
 sign('AEGIS','POSTE DE COMMANDEMENT',-19,2.65,-11.36);
 sign('AEGIS','TRANSMISSIONS SÉCURISÉES',-19,2.65,11.36,Math.PI);
 sign('AEGIS','UNITÉ MÉDICALE',19,2.65,-11.36);
 sign('AEGIS','INGÉNIERIE NANO',19,2.65,11.36,Math.PI);
 return{root,setInterior(v){interior.visible=!!v;},snapshot:()=>({revision:1,rooms:AEGIS_WINGS.length,batches:batches.size,instances:[...batches.values()].reduce((n,b)=>n+b.items.length,0)}),dispose(){root.removeFromParent();geo.dispose();for(const g of extraGeos)g.dispose();for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
