// Rebuild missing physical hulls from the baked geometry, offline. No mesh scan at runtime.
import fs from 'node:fs';
import {decodeSector} from '../dist/m03-sector.js';
export function physicalGeometry(sector){
 const {meta,world:w}=sector,solid=new Set([0,1,3,10,13,16]),out=[],floors=[];
 const face=q=>{const c={x1:Infinity,y1:Infinity,z1:Infinity,x2:-Infinity,y2:-Infinity,z2:-Infinity,mat:w.mat[q]};for(let v=0;v<4;v++)for(const [a,k]of [['x',0],['y',1],['z',2]]){const n=+(w.pos[q*12+v*3+k]*meta.scale).toFixed(3);c[a+'1']=Math.min(c[a+'1'],n);c[a+'2']=Math.max(c[a+'2'],n);}return c;};
 const covered=c=>[...meta.colliders,...out].some(o=>c.x1>=o.x1-.035&&c.x2<=o.x2+.035&&c.z1>=o.z1-.035&&c.z2<=o.z2+.035&&c.y1>=Math.max(0,o.y1)-.04&&c.y2<=o.y2+.04);
 function add(c){
  const dx=c.x2-c.x1,dy=c.y2-c.y1,dz=c.z2-c.z1;
  if(c.y2<.18||c.y1>22||c.x1< -61||c.x2>99||c.z1< -100||c.z2>72||covered(c))return;
  // Raised slabs stop shots from above/below and support feet. Decorative trim is not a floor.
  const slab=dy<=.6&&dx>=2&&dz>=2&&c.y2>.3;
  if(!slab&&(dy<.42||Math.max(dx,dz)<.3))return;
  const stair=meta.stairs.some(s=>c.x1>=s.x1-.12&&c.x2<=s.x2+.12&&c.z2>s.zEnd-.3&&c.z1<s.zStart+.3&&c.y2<=s.height+.25);
  out.push({...c,label:stair?'corps escalier':slab?'dalle':'paroi géométrique',source:'physical-geometry',stairBody:stair,walkableSurface:slab});
  if(slab)floors.push({id:'dalle-'+floors.length,x1:c.x1,x2:c.x2,z1:c.z1,z2:c.z2,height:c.y2});
 }
 for(let q=0;q+6<=w.n;q++){
  if(!solid.has(w.mat[q]))continue;
  const faces=Array.from({length:6},(_,k)=>face(q+k));if(faces.some(f=>f.mat!==faces[0].mat))continue;
  const c={mat:faces[0].mat};for(const a of ['x','y','z']){c[a+'1']=Math.min(...faces.map(f=>f[a+'1']));c[a+'2']=Math.max(...faces.map(f=>f[a+'2']));}
  // All six axis faces, exactly the eight corners: never enclose a doorway from unrelated quads.
  const keys=new Set();let valid=true;
  for(const f of faces){const axes=['x','y','z'].filter(a=>f[a+'1']===f[a+'2']);if(axes.length!==1){valid=false;break;}const a=axes[0];if(f[a+'1']!==c[a+'1']&&f[a+'1']!==c[a+'2']){valid=false;break;}for(const b of ['x','y','z'].filter(b=>b!==a))if(f[b+'1']!==c[b+'1']||f[b+'2']!==c[b+'2'])valid=false;keys.add(a+f[a+'1']);}
  if(!valid||keys.size!==6)continue;
  add(c);q+=5;
 }
 // Standalone vertical panels have no box thickness in the visual bake. Give them 6 cm physical thickness.
 for(let q=0;q<w.n;q++){
  if(!solid.has(w.mat[q]))continue;const c=face(q),dx=c.x2-c.x1,dy=c.y2-c.y1,dz=c.z2-c.z1;
  if(dy<1.5||Math.max(dx,dz)<.6||Math.min(dx,dz)>.015||covered(c))continue;
  // Stair risers have already received their exact closed bodies.
  if(meta.stairs.some(s=>c.x1>=s.x1-.12&&c.x2<=s.x2+.12&&c.z2>s.zEnd-.3&&c.z1<s.zStart+.3&&c.y2<=s.height+.25))continue;
  if(dx<.015){c.x1-=.03;c.x2+=.03;}else{c.z1-=.03;c.z2+=.03;}add(c);
 }
 return {solids:out,floors};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const dir=new URL('../dist/assets/m03/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('vesper-sector.json',dir))),bin=fs.readFileSync(new URL('vesper-sector.bin',dir));
 const result=physicalGeometry(decodeSector(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength)));
 meta.physicalSolids=result.solids;meta.physicalFloors=result.floors;meta.physicsRevision=2;
 fs.writeFileSync(new URL('vesper-sector.json',dir),JSON.stringify(meta));console.log({solids:result.solids.length,floors:result.floors.length});
}
