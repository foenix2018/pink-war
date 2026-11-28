import {Assembly,limb,matrix} from './geo.js';

// Geometry carrying a scan has UVs projected in metres before it is batched.
function leafCluster(T,low){
 const p=[],uv=[],index=[],count=low?5:8;
 for(let i=0;i<count;i++){
  const a=i*2.39996,x=Math.sin(a)*.37,z=Math.cos(a)*.37,h=(i%3)*.10,base=p.length/3;
  const elongation=.48+i%3*.09,c=Math.cos(a),s=Math.sin(a);
  const at=(u,y,v)=>[x+u*c+v*s,h+y,z+v*c-u*s];
  p.push(...at(0,0,0),...at(-.12,.055,.25),...at(0,.125,elongation),...at(.12,.066,.24),...at(0,.09,.24));
  uv.push(.5,0,0,.5,.5,1,1,.5,.5,.5);
  index.push(base,base+1,base+4,base+1,base+2,base+4,base+2,base+3,base+4,base+3,base,base+4);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.setIndex(index);geometry.computeVertexNormals();
 return geometry;
}

export function createM11Construction(T,root,M,{low=false}={}){
 const assemblies=new Map(),instances=new Map(),owned=new Set(),materials=new Set(),meshes=[],details=[];
 const proto={cube:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,low?8:12),
  pebble:new T.IcosahedronGeometry(1,0),leaf:leafCluster(T,low)};
 const pose=new T.Object3D();
 const mobilePalette={};
 if(low){
  mobilePalette.metal=new T.MeshStandardMaterial({name:'M11 · métal partagé mobile',roughness:.64,metalness:.51});
  mobilePalette.matte=new T.MeshStandardMaterial({name:'M11 · mat partagé mobile',roughness:.92,metalness:.06});
  mobilePalette.foliage=new T.MeshStandardMaterial({name:'M11 · feuillage partagé mobile',roughness:.96,side:T.DoubleSide});
  mobilePalette.light=new T.MeshBasicMaterial({name:'M11 · voyants partagés mobile',toneMapped:false});
  for(const material of Object.values(mobilePalette))materials.add(material);
 }
 const groupBy=new Map(['edge','gold','dark','white','paintRed','rust'].map(name=>[name,'metal']));
 for(const name of ['leaf','redleaf','olive','line','rubber'])groupBy.set(name,'matte');
 for(const name of ['red','warm','blue','green','pink'])groupBy.set(name,'light');
 let sector='other',batchCount=0,totalTriangles=0,totalInstances=0,suspended=0;
 const lastEye=new T.Vector3(Infinity,0,0);
 const detailMaterials=new Set([M.gold,M.edge,M.rust,M.leaf,M.redleaf,M.olive,M.warm,M.paintRed]);
 const cell=(x,z)=>Math.floor((x+30)/54)+':'+Math.floor((z+24)/54);
 const batch=id=>{if(!assemblies.has(id))assemblies.set(id,new Assembly());return assemblies.get(id);};
 function metricUV(geometry,tile){
  if(!tile)return;
  const p=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
   const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
   uv.setXY(i,(nx>nz&&nx>ny?p.getZ(i):p.getX(i))/tile,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))/tile);
  }
 }
 function add(geo,mat,at=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
  const material=typeof mat==='string'?M[mat]:mat;
  const transform=matrix(at,rotation,scale);
  geo.applyMatrix4(transform);
  geo.computeBoundingSphere();
  const {center,radius}=geo.boundingSphere;
  // Compact hardware shares a material draw with its neighbours. Very long
  // spans retain their own batch so they can leave the view independently.
  const id=radius>25?sector:'Cellule '+cell(center.x,center.z);
  if(material.userData.tile)metricUV(geo,material.userData.tile);
  batch(id).add(geo,material,null,false);
  geo.dispose();
 }
 function stamp(geo,mat,at,scale,rot=[0,0,0]){
  const local='Cellule '+cell(at[0],at[2]),family=low?(geo==='leaf'?'foliage':groupBy.get(mat)):null;
  const key=local+'/'+geo+'/'+(family||mat);
  if(!instances.has(key))instances.set(key,{sector:local,geo,material:mobilePalette[family]||M[mat],tinted:!!family,list:[],colors:[]});
  pose.position.set(...at);pose.rotation.set(...rot);pose.scale.set(...scale);pose.updateMatrix();
  const group=instances.get(key);
  group.list.push(pose.matrix.clone());
  if(family)group.colors.push(M[mat].color);
 }
 function box(at,size,mat='edge',yaw=0){
  if(M[mat].userData.tile)add(new T.BoxGeometry(...size),mat,at,[0,yaw,0]);
  else stamp('cube',mat,at,size,[0,yaw,0]);
 }
 function rod(a,b,r=.06,mat='edge',r2=r){
  add(limb(a,b,r,r2,low?6:9),mat);
 }
 function ring(at,radius,tube,mat='edge',rotation=[-Math.PI/2,0,0]){
  add(new T.TorusGeometry(radius,tube,low?4:6,low?16:26),mat,at,rotation);
 }
 function cylinder(at,r,h,mat='edge',rot=[0,0,0]){stamp('cylinder',mat,at,[r,h,r],rot);}
 function quad(a,b,c,d,mat){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...d],3));
  g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  add(g,mat);
 }
 function trimSign(text,subtitle,at,yaw,w=4.8,h=1.08,style='civic'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d'),base=style==='ordre'?'#292e31':style==='aegis'?'#ddd2b9':'#bfa88e';
  const letters=style==='ordre'?'#e3d8c5':'#2f3b3b';
  ctx.fillStyle=base;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle=style==='ordre'?'#87524a':'#666458';ctx.lineWidth=4;ctx.strokeRect(9,8,492,112);
  ctx.fillStyle=letters;ctx.font='bold 37px sans-serif';ctx.fillText(text,25,59,462);
  ctx.font='bold 16px sans-serif';ctx.fillText(subtitle,26,92,465);
  for(let i=0;i<75;i++){ctx.globalAlpha=.17;ctx.fillStyle=i%3?'#766557':'#e9dbc5';ctx.fillRect(13+(i*107)%480,11+(i*67)%105,2+i%9,1+i%3);}
  ctx.globalAlpha=1;
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;owned.add(map);
  const mat=new T.MeshStandardMaterial({map,roughness:.81,metalness:.13});materials.add(mat);
  const [x,y,z]=at;
  box([x-Math.sin(yaw)*.04,y,z-Math.cos(yaw)*.04],[w+.10,h+.08,.075],'dark',yaw);
  add(new T.PlaneGeometry(w,h),mat,at,[0,yaw,0]);
 }
 function finish(){
  function keep(mesh,name,count=1){
   const g=mesh.geometry;
   mesh.name='M11 / '+name;mesh.receiveShadow=!mesh.material.isMeshBasicMaterial;
   mesh.userData.noWorldShadow=low||![M.concrete,M.brick,M.paint,M.wetRock].includes(mesh.material);
   meshes.push(mesh);batchCount++;totalTriangles+=(g.index?.count||g.attributes.position.count)/3*count;
   if(detailMaterials.has(mesh.material)&&!name.includes('AEGIS /')){
    const bound=mesh.isInstancedMesh?mesh.boundingSphere:g.boundingSphere||(g.computeBoundingSphere(),g.boundingSphere);
    const distance=(low?64:98)+Math.min(17,bound.radius*.4);
    details.push({mesh,centre:bound.center.clone(),distance});
   }
  }
  for(const [key,{sector:sectorId,geo,material,list,tinted}] of instances){
   const assembly=assemblies.get(sectorId);
   if(tinted||geo==='leaf'||list.length>28||!assembly?.items.some(item=>item.material===material))continue;
   for(const transform of list)assembly.add(proto[geo],material,transform,false);
   instances.delete(key);
  }
  for(const [sectorId,assembly] of assemblies){
   for(const m of assembly.build(root))keep(m,sectorId);
   for(const item of assembly.items)item.geometry.dispose();
   assembly.items.length=0;
  }
  assemblies.clear();
  for(const {sector:sectorId,geo,material,list,colors} of instances.values()){
   const o=new T.InstancedMesh(proto[geo],material,list.length);
   for(const [i,m] of list.entries())o.setMatrixAt(i,m);
   for(const [i,color] of colors.entries())o.setColorAt(i,color);
   o.computeBoundingSphere();keep(o,sectorId+'/'+material.name,list.length);root.add(o);totalInstances+=list.length;
  }
  instances.clear();
 }
 function update(eye){
  if(!eye||lastEye.distanceToSquared(eye)<16)return;
  lastEye.copy(eye);suspended=0;
  for(const {mesh,centre,distance} of details){
   const limit=distance+(mesh.visible?3:-3);
   mesh.visible=centre.distanceToSquared(eye)<limit*limit;
   if(!mesh.visible)suspended++;
  }
 }
 return {box,add,rod,ring,cylinder,quad,stamp,trimSign,finish,update,sector:id=>{sector=id;},
  stats:()=>({batchCount,triangles:totalTriangles,instances:totalInstances,suspendedDetailBatches:suspended}),
  dispose(){const geometries=new Set([...Object.values(proto),...meshes.map(m=>m.geometry)]);
   for(const m of meshes){m.removeFromParent();if(m.isInstancedMesh)m.dispose();}
   for(const g of geometries)g.dispose();for(const t of owned)t.dispose();for(const m of materials)m.dispose();}};
}

export function railM11(kit,a,b,{noPosts=false}={}){
 const {box,rod}=kit,dx=b[0]-a[0],dz=b[2]-a[2],n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/3.2));
 for(const y of [.48,1.08]){
  rod([a[0],a[1]+y,a[2]],[b[0],b[1]+y,b[2]],y>.9?.052:.032,y>.9?'edge':'gold');
 }
 if(!noPosts)for(let i=0;i<=n;i++){
  const [x,y,z]=a.map((v,j)=>v+(b[j]-v)*i/n);
  box([x,y+.054,z],[.21,.069,.18],'edge');
  rod([x,y+.058,z],[x,y+1.12,z],.052,'edge');
 }
}

export function districtBuilding(T,k,[x,z,y,w,d,h],variant,low){
 const {box,rod,quad,cylinder}=k;
 const m=variant==='helix'?'concrete':variant==='civic'?'brick':'paint';
 const wall=(axis,normal,u,yy,dep,ww,hh,dd,mat)=>{
  const f=axis==='x'?x:z,span=axis==='x'?w:d;
  const out=f+normal*(span*.5+dep);
  if(axis==='x')box([out,y+yy,z+u],[dd,hh,ww],mat);
  else box([x+u,y+yy,out],[ww,hh,dd],mat);
 };
 box([x,y+h/2,z],[w,h,d],m);
 box([x,y+.23,z],[w+.13,.43,d+.13],'wetRock');
 box([x,y+h+.15,z],[w+.34,.28,d+.34],'concrete');
 for(const side of [-1,1]){
  box([x,y+h+.41,z+side*d*.49],[w+.48,.24,.18],'edge');
  box([x+side*w*.5,y+h+.41,z],[.18,.24,d-.08],'edge');
 }
 for(const axis of ['z','x'])for(const n of [-1,1]){
  const span=axis==='x'?d:w;
  const count=Math.max(1,Math.floor(span/(variant==='helix'?3.55:3.2))),bay=span/count;
  for(let i=0;i<count;i++){
   const u=(i+.5-count*.5)*bay;
   wall(axis,n,u,h*.5,.094,.11,h-.45,.18,'edge');
   for(let yy=1.78;yy<h-.78;yy+=3.15){
    const width=Math.min(2.38,bay*.68),t=variant==='helix'?1.38:1.21;
    const glass=(i+Math.floor(yy)*7+Math.round(x))%6===0?'warmglass':variant==='ordre'?'coldglass':'glass';
    // A step in depth between the gasket, pane and the sill creates a real inset under the sun.
    wall(axis,n,u,yy,.052,width+.19,t+.16,.10,'dark');
    wall(axis,n,u,yy,.111,width,t,.036,glass);
    for(const s of [-1,1]){
     wall(axis,n,u+s*width*.5,yy,.16,.060,t+.13,.17,'edge');
     wall(axis,n,u,yy+s*t*.5,.15,width+.055,.060,.18,'edge');
    }
    wall(axis,n,u,yy-t*.5-.11,.215,width+.25,.104,.32,'white');
    if(variant==='helix')wall(axis,n,u,yy,.165,width,.042,.10,'edge');
    if(!low&&variant==='civic'&&i%3===0){
     wall(axis,n,u,yy-.39,.186,width*.79,.12,.11,'gold');
     for(let j=0;j<4;j++)wall(axis,n,u+(j-1.5)*width*.20,yy-.31,.193,.031,.29,.10,'edge');
    }
   }
  }
  if(n===1)for(const side of [-1,1]){
   const u=side*(span*.5-.36);
   wall(axis,n,u,h*.55,.26,.11,h*.88,.11,'edge');
   for(const yy of [.68,3.3,6.6].filter(yy=>yy<h))wall(axis,n,u,yy,.18,.23,.085,.23,'dark');
  }
 }
 box([x,y+1.18,z+d/2+.08],[Math.min(w*.6,2.55),2.36,.11],'gate');
 box([x,y+2.55,z+d/2+.46],[3.03,.16,.91],variant==='ordre'?'steel':'paint');
 for(const dx of [-1.32,1.32]){
  box([x+dx,y+1.25,z+d/2+.21],[.17,2.47,.23],'edge');
  rod([x+dx,y+2.2,z+d/2+.14],[x+dx,y+2.52,z+d/2+.71],.049);
 }
 if(variant==='ordre')box([x+.54,y+2.71,z+d/2+.19],[.28,.08,.14],'red');
 box([x+w*.22,y+h+.56,z-d*.15],[1.65,.68,1.30],'paint');
 for(let i=0;i<4;i++)box([x+w*.22+(i-1.5)*.26,y+h+.58,z-d*.15+.67],[.065,.42,.04],'edge');
 if(variant!=='civic')cylinder([x-w*.28,y+h+.75,z+d*.25],.23,1.39,'edge');
}

export function watchTower(k,x,z,y,h){
 const {box,rod,cylinder}=k;
 box([x,y+h*.5,z],[3.69,h,3.69],'paint');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  box([x+sx*1.58,y+h*.5,z+sz*1.58],[.20,h,.20],'edge');
  rod([x+sx*1.62,y+h-1.48,z+sz*1.48],[x+sx*2.21,y+h-.18,z+sz*2.21],.116);
 }
 box([x,y+h,z],[4.65,.41,4.65],'steel');
 box([x,y+h+1.05,z],[3.36,1.68,3.36],'dark');
 for(const s of [-1,1]){
  box([x,y+h+1.14,z+s*1.703],[2.82,1.04,.069],'coldglass');
  box([x+s*1.703,y+h+1.14,z],[.069,1.04,2.82],'coldglass');
  box([x,y+h+1.14,z+s*1.77],[.105,1.14,.091],'edge');
  box([x+s*1.77,y+h+1.14,z],[.091,1.14,.105],'edge');
 }
 box([x,y+h+2.0,z],[4.47,.38,4.47],'paint');
 for(const s of [-1,1]){
  cylinder([x+s*1.86,y+h+2.27,z+1.78],.11,.31,'edge');
  cylinder([x+s*1.86,y+h+2.47,z+1.78],.063,.13,'red');
 }
 rod([x-1.01,y+h+2.15,z-1.2],[x-1.01,y+h+3.75,z-1.2],.041);
 rod([x-1.64,y+h+3.32,z-1.2],[x-.41,y+h+3.32,z-1.2],.033);
}

export function evacuationTent(T,k,x,y,z,tag){
 const {box,rod,quad,trimSign}=k;
 const w=2.03,l=2.12,shoulder=y+2.22,top=y+2.83;
 for(const side of [-1,1]){
  for(const end of [-1,1]){
   rod([x+side*w,y+.045,z+end*l],[x+side*w,shoulder,z+end*l],.043);
   box([x+side*w,y+.045,z+end*l],[.22,.074,.20],'edge');
  }
  rod([x+side*w,shoulder,z-l],[x+side*w,shoulder,z+l],.053);
 }
 // A cloth roof assembled from sewn curved panels. Alternating faded cloth,
 // seams and ridge stops give it the silhouette of a pitched tent.
 const twice=(u)=>top-(top-shoulder)*Math.abs(u)-.14*Math.sin(Math.abs(u)*Math.PI);
 for(let row=0;row<6;row++){
  const za=z-l+row*l/3,zb=z-l+(row+1)*l/3;
  for(let col=0;col<4;col++){
   const a=col*.5-1,b=a+.5,m=(row+col)%5?'cloth':'clothShadow';
   quad([x+a*w,twice(a),za],[x+a*w,twice(a),zb],[x+b*w,twice(b),zb],[x+b*w,twice(b),za],m);
   rod([x+a*w,twice(a)+.009,za],[x+b*w,twice(b)+.009,za],.012,'gold');
  }
 }
 for(const side of [-1,1]){
  quad([x+side*w,y+.37,z-l],[x+side*w,y+.31,z+l],[x+side*w,shoulder-.04,z+l],[x+side*w,shoulder-.04,z-l],'clothShadow');
  rod([x+side*w,shoulder-.06,z+l],[x+side*w*1.15,y+.11,z+l+.42],.019,'gold');
 }
 rod([x-w,shoulder-.10,z+l],[x+w,shoulder-.10,z+l],.042);
 for(const part of [-.88,.88])rod([x+part,shoulder-.09,z+l],[x+part,shoulder-.34,z+l],.03);
 trimSign(tag,'DISPOSITIF CIVIL  ·  AEGIS', [x,shoulder-.18,z+l+.042],0,2.6,.53,'aegis');
 // Triage cots stay behind the edge of the tent, away from the route.
 for(const side of [-1,1]){
  const px=x+side*1.17;
  box([px,y+.58,z-.26],[.71,.087,1.82],side>0?'gold':'white');
  for(const dz of [-.81,.26]){
   rod([px-.25,y+.035,z+dz],[px+.25,y+.54,z+dz],.035);
   rod([px+.25,y+.035,z+dz],[px-.25,y+.54,z+dz],.035);
  }
  box([px,y+.67,z-.82],[.58,.105,.51],'clothShadow');
 }
}

export function reliefTree(k,x,y,z,index,{low=false}={}){
 const {stamp,rod}=k;
 const height=3.05+(index%5)*.50;
 const tips=[];
 let last=[x,y,z];
 for(let i=1;i<=4;i++){
  const next=[x+.14*i*Math.sin(index+i*.56),y+height*i*.187,z+.11*i*Math.cos(index+i)];
  rod(last,next,.21-i*.038,'rust',.18-i*.037);last=next;
  const a=index+i*2.39996,c=.65+(i%3)*.41;
  const tip=[x+Math.cos(a)*c,y+height*(.66+i*.07),z+Math.sin(a)*c];
  rod(last,tip,.096-i*.012,'rust',.034);tips.push(tip);
 }
 for(const [j,tip] of tips.entries())for(let i=0;i<(low?7:13);i++){
  const a=(i+j)*2.39996,l=.48+(i%4)*.19;
  stamp('leaf',i%5===0?'redleaf':i%3?'leaf':'olive',[tip[0]+Math.cos(a)*l,tip[1]+(i%3)*.38,tip[2]+Math.sin(a)*l],[.54,.40,.67],[i*.39,i*.35,0]);
 }
}
