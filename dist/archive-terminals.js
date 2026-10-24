import {Assembly,bevelBox,matrix} from './geo.js';

// Salvaged human computers, in metres. The four M01 interaction locations and
// their collision envelopes stay authoritative; no corridor is moved or added.
export function createArchiveTerminalFactory(T,{performance=false,loadTextures=true}={}){
 const materials=[],textures=[],geometries=[],instances=[];
 const own=m=>(materials.push(m),m);
 const paint=own(new T.MeshStandardMaterial({color:0x716d60,roughness:.78,metalness:.28}));
 const metal=own(new T.MeshStandardMaterial({color:0x666962,roughness:.56,metalness:.83}));
 const dark=own(new T.MeshStandardMaterial({color:0x171c1a,roughness:.69,metalness:.28}));
 const rubber=own(new T.MeshStandardMaterial({color:0x121411,roughness:.94,metalness:0}));
 const keys=own(new T.MeshStandardMaterial({color:0x393c33,roughness:.84,metalness:.02}));
 const amber=own(new T.MeshBasicMaterial({color:0x967241,toneMapped:false}));
 const stats={revision:'3.57',computers:0,textureReady:0,textureFailed:0,triangles:0};
 const pending=[];
 if(loadTextures&&typeof document!=='undefined'){
  const loader=new T.TextureLoader();
  for(const [file,slot,srgb]of [
   ['rusty_painted_metal_diff_512.jpg','map',true],
   ['rusty_painted_metal_rough_512.jpg','roughnessMap',false],
   ...(performance?[]:[['rusty_painted_metal_normal_512.jpg','normalMap',false]])
  ])pending.push(new Promise(resolve=>{
   loader.load('./assets/cc0/'+file,t=>{
    textures.push(t);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;
    t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=performance?1:4;
    for(const m of [paint,metal]){m[slot]=t;if(slot==='normalMap')m.normalScale.set(.12,.12);m.needsUpdate=true;}
    stats.textureReady++;resolve(true);
   },undefined,()=>{stats.textureFailed++;resolve(false);});
  }));
 }
 let legends=null;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,512,256);ctx.fillStyle='#acac96';ctx.font='15px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  const rows=['1234567890+-','AZERTYUIOP[]','QSDFGHJKLM','WXCVBN,;:!'];
  rows.forEach((row,j)=>[...row].forEach((key,i)=>ctx.fillText(key,(i+.5)*32,(j+.5)*40)));
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;textures.push(map);
  legends=own(new T.MeshBasicMaterial({map,transparent:true,alphaTest:.2,depthWrite:false,toneMapped:false}));
 }
 const parts=(assembly,g,m,p,r=[0,0,0])=>{assembly.add(g,m,matrix(p,r));g.dispose();};
 function create(parent,{x=0,y=0,z=0,id='archive'}={}){
  const root=new T.Group();root.name='VESPER / ordinateur humain '+id;root.position.set(x,y,z);parent.add(root);
  const a=new Assembly(),head=new T.Group();head.position.set(0,1.48,-.025);head.rotation.x=-.10;root.add(head);
  const b=(w,h,d,m,p,r=[0,0,0])=>parts(a,bevelBox(w,h,d,Math.min(.025,Math.min(w,h,d)*.18),1),m,p,r);
  // Metal workbench, inset shelf and real supporting feet; no floating screen.
  b(2.12,.065,.59,metal,[0,.935,0]);b(2.08,.024,.56,paint,[0,.979,0]);
  b(.43,.86,.51,paint,[-.75,.47,-.025]);b(.39,.032,.47,dark,[-.75,.06,-.025]);
  for(const yy of [.27,.50,.73]){b(.35,.17,.025,dark,[-.75,yy,.242]);b(.13,.018,.035,metal,[-.75,yy+.025,.263]);}
  for(const zz of [-.215,.215])b(.05,.89,.05,metal,[.85,.475,zz]);
  b(.05,.05,.48,metal,[.85,.06,0]);b(1.52,.045,.045,metal,[.06,.19,-.22]);
  b(.37,.028,.25,dark,[0,1.004,-.11]);b(.065,.18,.065,metal,[0,1.092,-.12]);
  // Physical keyboard with stepped key rows, spacebar and a connector lead.
  b(1.12,.038,.28,dark,[0,1.014,.125]);
  const counts=[12,12,10,10];
  for(let row=0;row<4;row++)for(let i=0;i<counts[row];i++){
   const xx=(i-(counts[row]-1)/2)*.073,zz=.026+row*.052,yy=1.05+(3-row)*.003;
   b(.063,.023,.043,keys,[xx,yy,zz]);
   if(legends){
    const g=new T.PlaneGeometry(.047,.032),uv=g.attributes.uv;
    for(let n=0;n<uv.count;n++)uv.setXY(n,(i+uv.getX(n))*32/512,1-(row+1-uv.getY(n))*40/256);
    parts(a,g,legends,[xx,yy+.0123,zz],[-Math.PI/2,0,0]);
   }
  }
  b(.38,.02,.039,keys,[0,1.047,.25]);
  // Data cartridge, jack and two hand-worn physical controls.
  b(.27,.085,.20,paint,[.75,1.048,.03]);b(.19,.022,.012,dark,[.75,1.06,.136]);
  for(const xx of [.65,.80])parts(a,new T.CylinderGeometry(.018,.018,.022,12),metal,[xx,1.12,.07]);
  const lead=new T.CatmullRomCurve3([new T.Vector3(.5,1.03,-.07),new T.Vector3(.64,.8,-.23),new T.Vector3(.75,.17,-.21)]);
  parts(a,new T.TubeGeometry(lead,12,.008,5,false),rubber,[0,0,0]);
  a.build(root);
  // Bevelled monitor and inset glass. The display is an actual surface in the
  // recess; there is no opaque overlay hiding the readable narrative texture.
  const h=new Assembly();
  const hb=(w,hh,d,m,p)=>parts(h,bevelBox(w,hh,d,.025,1),m,p);
  hb(1.64,.88,.285,paint,[0,0,0]);hb(1.53,.78,.028,dark,[0,.018,.148]);
  hb(1.45,.70,.015,rubber,[0,.018,.169]);
  for(const side of [-1,1]){
   for(let i=0;i<7;i++)hb(.008,.11,.004,dark,[side*.77,-.18+i*.025,.146]);
   for(const yy of [-.35,.35])parts(h,new T.CylinderGeometry(.011,.011,.004,8).rotateX(Math.PI/2),metal,[side*.756,yy,.147]);
  }
  for(let i=0;i<3;i++)hb(.026,.008,.006,i?dark:amber,[.61-i*.052,-.375,.155]);
  hb(.32,.027,.006,dark,[-.39,-.375,.155]);
  h.build(head);
  for(const assembly of [a,h]){
   for(const item of assembly.items)item.geometry.dispose();
   for(const mesh of assembly.meshes){mesh.castShadow=!performance;mesh.receiveShadow=true;geometries.push(mesh.geometry);stats.triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;}
  }
  stats.computers++;instances.push(root);
  return {root,display:head,width:1.36,height:.64,z:.180};
 }
 return {create,ready:Promise.all(pending),materials:{paint,metal,dark,rubber,keys},stats:()=>({...stats}),dispose(){
  for(const root of instances)root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
 }};
}
