import {Assembly,bevelBox,matrix} from './geo.js';
import {M01_ROOF_PATCHES,M01_CEILING_ROOMS} from './m01-ceiling-layout.js';

export function createCampaignCeilings(T,parent,maps,{quality='auto'}={}){
 const root=new T.Group();root.name='VESPER / toitures et réseaux suspendus';parent.add(root);
 const a=new Assembly();let tiles=0,pipes=0,beams=0;
 const box=(m,w,h,d,x,y,z,r=0)=>a.add(r?bevelBox(w,h,d,r,1):new T.BoxGeometry(w,h,d),m,matrix([x,y,z]));
 const rod=(m,p,q,r=.03)=>a.limb(m,p,q,r,r,8);
 for(const p of M01_ROOF_PATCHES)box(maps[p.material],p.w,p.h,p.d,p.x,p.y,p.z,.035);
 for(const room of M01_CEILING_ROOMS){
  const {x,z,w,d,y,roofY}=room,nx=Math.ceil(w/2.4),nz=Math.ceil(d/2.4),sx=w/nx,sz=d/nz;
  // Suspended T grid. Missing panels reveal ducts; the structural roof stays closed.
  for(let i=0;i<=nx;i++)box(maps.steel,.035,.06,d,x-w/2+i*sx,y,z);
  for(let j=0;j<=nz;j++)box(maps.steel,w,.06,.035,x,y,z-d/2+j*sz);
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   // A continuous service strip exposes the real pipe run and ductwork.
   if(Math.abs(-w/2+(i+.5)*sx)<1.55||(i*7+j*3+nx)%11===0)continue;
   box(maps.plaster,sx-.055,.035,sz-.055,x-w/2+(i+.5)*sx,y+.045,z-d/2+(j+.5)*sz);tiles++;
  }
  for(let j=0;j<=Math.floor(d/5);j++){
   const zz=z-d/2+.25+j*5;
   // I beams with web and two flanges, seated on walls rather than floating.
   box(maps.rust,w,.045,.23,x,roofY-.04,zz);box(maps.steel,w,.045,.23,x,roofY-.21,zz);box(maps.steel,w,.15,.045,x,roofY-.125,zz);beams++;
   for(const xx of [x-w*.32,x+w*.32])rod(maps.steel,[xx,y,zz],[xx,roofY-.21,zz],.012);
  }
  // Coupled service pipes and a rectangular ventilation trunk above the grid.
  for(const offset of [-.65,.65]){
   const xx=x+offset,yy=y+.16;
   rod(maps.steel,[xx,yy,z-d/2],[xx,yy,z+d/2],.065);pipes++;
   for(let j=0;j<d;j+=3.6){
    const zz=z-d/2+j;
    rod(maps.rust,[xx,yy,zz-.045],[xx,yy,zz+.045],.087);
    rod(maps.dark,[xx-.13,yy+.06,zz],[xx+.13,yy+.06,zz],.015);
   }
  }
  box(maps.steel,.45,.13,d,x+1.25,y+.18,z,.025);
  for(let j=0;j<d;j+=2.4)box(maps.dark,.48,.014,.035,x+1.25,y+.11,z-d/2+j);
 }
 a.mount(root);a.setLevel(1);root.traverse(o=>{if(o.isMesh){o.castShadow=quality!=='low';o.receiveShadow=true;}});
 return {root,stats(){let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {rooms:M01_CEILING_ROOMS.length,roofPatches:M01_ROOF_PATCHES.length,tiles,pipes,beams,triangles,draws};},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());}};
}
