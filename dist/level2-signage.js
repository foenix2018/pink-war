// Original printed notices and recessed shop signs. No holographic UI billboards.
export function createDistrictSignage(T,{performance=false}={}){
 const maps=new Map(),textures=[],materials=[],geometry=[];let count=0;
 const frame=new T.MeshStandardMaterial({color:0x242b2e,roughness:.72,metalness:.6});materials.push(frame);
 function texture(text,poster){
  const key=(poster?'paper:':'sign:')+text;if(maps.has(key))return maps.get(key);
  const c=document.createElement('canvas');c.width=performance?256:512;c.height=poster?c.width*1.4:c.width*.34;
  const g=c.getContext('2d'),w=c.width,h=c.height,scale=w/512;
  g.fillStyle=poster?'#b8ae95':'#182123';g.fillRect(0,0,w,h);let seed=2196;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2500;i++){const alpha=rand()*.10;g.fillStyle=rand()>.5?'rgba(0,0,0,'+alpha+')':'rgba(255,248,222,'+alpha+')';g.fillRect(rand()*w,rand()*h,1+rand()*3*scale,1+rand()*4*scale);}
  const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const helix=/HELIX|RESEAU/.test(normalized),medical=/SECOURS|CLINIQUE|SOINS/.test(normalized),evac=/EVAC|TRANSIT/.test(normalized);
  const tint=helix?'#a4483f':medical?'#5b7770':'#615d49';
  if(poster){
   g.fillStyle=tint;g.fillRect(w*.08,h*.065,w*.84,h*.09);g.fillStyle='#d5c9ae';g.font='600 '+22*scale+'px sans-serif';g.fillText(helix?'HELIX / CONTRÔLE CIVIL':'VESPER / SECOURS 07',w*.11,h*.125,w*.78);
   g.fillStyle='#262e2c';g.font='700 '+43*scale+'px sans-serif';const title=helix?['ACCÈS','RESTREINT']:medical?['POSTE','DE SOINS']:evac?['ÉVACUATION','SUSPENDUE']:['AVIS DE','RECHERCHE'];title.forEach((line,i)=>g.fillText(line,w*.1,h*(.28+i*.085),w*.81));
   // A damaged route diagram or missing-person silhouette, rather than a neon word.
   g.strokeStyle=tint;g.lineWidth=9*scale;g.beginPath();g.moveTo(w*.17,h*.63);g.lineTo(w*.48,h*.63);g.lineTo(w*.48,h*.49);g.lineTo(w*.81,h*.49);g.stroke();
   g.fillStyle=tint;g.fillRect(w*.73,h*.45,w*.09,h*.08);
   g.font='600 '+18*scale+'px sans-serif';g.fillText(helix?'AUTORISATION OBLIGATOIRE':'REJOINDRE LES ANCIENS RELAIS',w*.1,h*.76,w*.8);
   g.font=15*scale+'px monospace';g.fillText(helix?'ARCHIVE LOCALE / 2196':'ÉMIS EN 2189 / COPIE LOCALE',w*.1,h*.85,w*.8);
   // Folds, missing ink and water damage are restrained and follow the paper.
   g.fillStyle='rgba(49,42,29,.10)';g.fillRect(w*.48,0,w*.012,h);g.fillRect(0,h*.53,w,h*.009);
   for(let i=0;i<65;i++){g.fillStyle='rgba(51,43,30,.13)';g.fillRect(rand()*w,rand()*h,w*(.01+rand()*.08),1+rand()*2);}
  }else{
   g.fillStyle=medical?'#b9cbc1':helix?'#caaca1':'#c5c0a9';g.font='600 '+(text.length>11?38:48)*scale+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h*.48,w*.86);
   g.fillStyle='#66736f';g.font=14*scale+'px monospace';g.fillText('VESPER / SECTEUR 07',w/2,h*.82,w*.8);
  }
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=2;map.generateMipmaps=true;textures.push(map);
  const material=new T.MeshStandardMaterial({map,color:poster?0xe3dccc:0xadb7b3,roughness:poster?.98:.69,metalness:poster?0:.18});materials.push(material);maps.set(key,material);return material;
 }
 return{create(text,{width=2.5,height=.85,poster=false}={}){
  const group=new T.Group();group.name='W02 / '+(poster?'notice imprimée / ':'enseigne montée / ')+text;
  const backing=new T.BoxGeometry(width+.08,height+.08,poster?.025:.11);geometry.push(backing);
  const back=new T.Mesh(backing,frame);back.position.z=-.067;group.add(back);
  const sheet=new T.PlaneGeometry(width,height,poster?4:1,poster?8:1);
  const p=sheet.attributes?.position;if(p&&poster)for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(Math.abs(x)>width*.49)p.setX(i,x+(Math.sin(y*31)+Math.cos(y*17))*.009);p.setZ(i,Math.sin(y*8+x*9)*.006);}if(p)sheet.computeVertexNormals();geometry.push(sheet);
  const face=new T.Mesh(sheet,texture(text,poster));face.position.z=.003;group.add(face);count++;return group;
 },stats:()=>({mounted:count,uniqueMaps:maps.size,printed:true}),dispose(){for(const g of geometry)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
