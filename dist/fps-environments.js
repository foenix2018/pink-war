import {fillWorldRadiance} from './world-material-response.js';
import {Assembly,bevelBox,matrix,limb} from './geo.js';
import {createFunctionalProp} from './functional-props.js';
import {createIndustrialLightBatch} from './industrial-light.js';
import {createGroundOcclusion} from './world-shadows.js';
import {createWorldEffects} from './webgpu-world-fx.js';
// Authored rooms and physical solids drive the finish. No visual-only solid is
// added to a doorway, stair or playable lane. Small fittings remain wall mounted.
export const FPS_PALETTES=Object.freeze({
 m01:{paint:0x536b68,cool:0xb9e4ed,warm:0xffc18a},m02:{paint:0x304954,cool:0x7bd4e8,warm:0xffb969},
 m03:{paint:0x40525b,cool:0x98d8f3,warm:0xffbe8a},m04:{paint:0x464661,cool:0x9daaff,warm:0xffc98b},
 ligne9:{paint:0x405b56,cool:0x82e1db,warm:0xffba78},m06:{paint:0x615343,cool:0xa6d8e9,warm:0xff9d55},
 couronne:{paint:0xa6afb6,cool:0xb6e2ff,warm:0xffc8a1},range:{paint:0x405361,cool:0x8bd7fa,warm:0xff79b6},
 foret:{paint:0x575e4a,cool:0xabcfd6,warm:0xffc28a},m08:{paint:0x53636a,cool:0xb2d9e7,warm:0xcbb28e},m09:{paint:0x72836d,cool:0xd0e8dd,warm:0xffca9a},m10:{paint:0xa1b2b6,cool:0xc0e2ed,warm:0xffdbb8}
});
export function microSurfaceMaps(T,{family='paint'}={}){
 const n=128,normal=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4),height=new Float32Array(n*n);let seed=379;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const metal=family==='metal',mineral=family==='mineral';
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const grain=random()-.5,band=Math.sin(y*.49+Math.sin(x*.098)*.4),cloud=Math.sin(x*Math.PI/16)*Math.sin(y*Math.PI/32)+.4*Math.cos((x+y)*Math.PI/8);
  height[y*n+x]=metal?grain*.11+band*.12+(y%32===0?-.19:0):mineral?grain*.32+cloud*.12:grain*.18+cloud*.045;
 }
 const sample=(x,y)=>height[((y+n)%n)*n+(x+n)%n];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,h=sample(x,y),dx=sample(x+1,y)-sample(x-1,y),dy=sample(x,y+1)-sample(x,y-1);
  const len=Math.hypot(dx,dy,1);
  normal.set([Math.round(127.5-127.5*dx/len),Math.round(127.5-127.5*dy/len),Math.round(127.5+127.5/len),255],i);
  const v=Math.max(0,Math.min(255,Math.round((metal?137:mineral?222:190)+h*52)));rough.set([v,v,v,255],i);
 }
 const make=data=>{const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 return {normal:make(normal),rough:make(rough)};
}
export function createFPSChapter(T,parent,{chapter,obstacles=[],areas=[],low=false,webgpu=false,worldFx=null,details=true}={}){
 const compact=low||/OculusBrowser|Quest|PicoBrowser|iPhone|iPad/i.test(globalThis.navigator?.userAgent||'');
 const palette=FPS_PALETTES[chapter]||FPS_PALETTES.m03,root=new T.Group();root.name='FPS / '+chapter+' / finition des espaces';parent.add(root);
 const radiance=fillWorldRadiance(T,parent,{...palette,low:compact});
 const own=[],textures=[],a=new Assembly(),maps=microSurfaceMaps(T);
 const metalMaps=microSurfaceMaps(T,{family:'metal'}),stoneMaps=microSurfaceMaps(T,{family:'mineral'});
 for(const pair of [maps,metalMaps,stoneMaps])textures.push(pair.normal,pair.rough);
 const mat=(color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,normalMap:maps.normal,normalScale:new T.Vector2(.12,.12)});own.push(m);return m;};
 const M={steel:mat(0x8b9ba5,.78,.35),dark:mat(0x18242c,.5,.62),paint:mat(palette.paint,.45,.66),rubber:mat(0x30332d,.02,.94),copper:mat(0x79604a,.55,.62)};
 const stat={chapter,materialDetails:0,coverModels:0,wallStations:0,sectors:0,serviceDetails:0,lightBudget:compact?0:2};
 const touched=new Map();parent.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;for(const m of [].concat(o.material||[])){if(!m.isMeshStandardMaterial||m.transparent||m.normalMap||m.bumpMap||m.userData.fpsSurface)continue;
  touched.set(m,{normalMap:m.normalMap,normalScale:m.normalScale.clone(),roughnessMap:m.roughnessMap});const pair=m.metalness>.5?metalMaps:m.roughness>.78?stoneMaps:maps;m.normalMap=pair.normal;m.normalScale.set(.16,.16);if(!m.roughnessMap)m.roughnessMap=pair.rough;m.userData.fpsSurface=true;m.needsUpdate=true;stat.materialDetails++;
 }});
 function part(g,m,p,r){a.add(g,m,matrix(p,r),false);g.dispose();}
 const box=(s,p,m=M.paint)=>part(bevelBox(...s,Math.min(.025,...s.map(v=>v*.15)),1),m,p);
 // These exact volumes also exist in every authoritative collision rebuild.
 for(const o of obstacles.filter(o=>o.kind==='fps-cover')){const model=createFunctionalProp(T,o.prop,{w:o.hx*2,d:o.hz*2,h:o.height,low,compact:true,M});model.position.set(o.x,o.y||0,o.z);model.updateMatrixWorld(true);model.traverse(p=>{if(p.isMesh){a.add(p.geometry,p.material,p.matrixWorld,false);p.geometry.dispose();}});stat.coverModels++;}
 const stations=[],walls=obstacles.filter(o=>!o.door&&!o.gate&&!o.walkableSurface&&o.height>2.6&&Math.min(o.hx,o.hz)<1.8&&Math.max(o.hx,o.hz)>2);
 for(const region of areas){if(stations.length>=32)break;const cx=(region.x1+region.x2)/2,cz=(region.z1+region.z2)/2,floor=region.floor??region.height??0;
  const near=walls.map(o=>{const thinX=o.hx<o.hz,nx=thinX?Math.sign(cx-o.x):0,nz=thinX?0:Math.sign(cz-o.z),x=thinX?o.x+nx*(o.hx+.055):Math.max(o.x-o.hx+1.4,Math.min(o.x+o.hx-1.4,cx)),z=thinX?Math.max(o.z-o.hz+1.4,Math.min(o.z+o.hz-1.4,cz)):o.z+nz*(o.hz+.055);return {o,x,z,nx,nz,d:Math.hypot(x-cx,z-cz)};}).filter(p=>p.x>=region.x1-.4&&p.x<=region.x2+.4&&p.z>=region.z1-.4&&p.z<=region.z2+.4&&Math.abs((p.o.y||0)-floor)<.3).sort((a,b)=>a.d-b.d);
  let count=0;for(const p of near){if(count>=2)break;if(stations.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<4))continue;const y=floor+Math.min(3.6,(region.ceiling||region.roof||p.o.height)-.45);if(y<floor+2)continue;const index=stations.length;
   stations.push({...p,y,floor,label:count===0?(region.label||region.id):'',color:count===0?palette.cool:palette.warm});count++;
   if(details){const yaw=Math.atan2(p.nx,p.nz),tangent=[p.nz,0,-p.nx],at=(dx,dy,dz)=>[p.x+tangent[0]*dx+p.nx*dz,y+dy,p.z+tangent[2]*dx+p.nz*dz];
    // Replace the same generic grille in every room with compact physical
    // infrastructure chosen by the authored area's purpose. All parts are
    // attached to the same validated wall; preserve the original clearance.
    const label=String(region.label||region.id||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    const wet=/POMPE|EAU|SANITAIRE|SERRE|DRAIN|FILTRE/.test(label);
    const electric=/TECHNIQUE|ENERGIE|ATELIER|MAINTENANCE|GENERATEUR|SERVEUR|RELAIS|INDUSTR/.test(label);
    if(wet){
     for(const dx of [-.34,.34]){
      part(limb(at(dx,-1.05,.024),at(dx,-.38,.024),.035,.035,8),M.steel,[0,0,0]);
      part(bevelBox(.15,.15,.065,.018,1),M.paint,at(dx,-.71,.025),[0,yaw,0]);
      for(const dy of [-.93,-.46])part(new T.BoxGeometry(.13,.04,.08),M.dark,at(dx,dy,.02),[0,yaw,0]);
     }
     part(limb(at(-.34,-.38,.024),at(.34,-.38,.024),.035,.035,8),M.steel,[0,0,0]);
    }else if(electric){
     part(bevelBox(.76,.66,.075,.022,1),M.paint,at(-.18,-.70,-.004),[0,yaw,0]);
     part(new T.BoxGeometry(.62,.018,.025),M.dark,at(-.18,-.91,.04),[0,yaw,0]);
     part(bevelBox(.038,.19,.035,.008,1),M.steel,at(.07,-.71,.054),[0,yaw,0]);
     for(const dx of [-.37,-.13])part(limb(at(dx,-1.22,.02),at(dx,-1.03,.02),.018,.018,6),M.steel,[0,0,0]);
    }else{
     part(bevelBox(1.32,.45,.065,.025,1),M.paint,at(0,-.7,-.012),[0,yaw,0]);
     for(let k=0;k<5;k++)part(new T.BoxGeometry(1.12,.025,.035),M.dark,at(0,-.83+k*.065,.025),[0,yaw,0]);
    }
    // Small cable junctions and fasteners stay flush to the wall and use
    // the same batched materials. They are omitted on the compact profile.
    if(!compact){
     for(const dx of [-.62,.62])for(const dy of [-.92,-.48])
      part(new T.CylinderGeometry(.018,.018,.015,6),M.steel,at(dx,dy,.045),[Math.PI/2,yaw,0]);
     if(electric){part(bevelBox(.19,.16,.045,.015,1),M.dark,at(.66,-.99,.012),[0,yaw,0]);
      part(limb(at(.66,-.91,.03),at(.66,-.42,.03),.014,.014,6),M.rubber,[0,0,0]);}
     if(wet)part(limb(at(-.34,-1.05,.024),at(-.62,-1.19,.024),.025,.025,6),M.copper,[0,0,0]);
    }
    stat.serviceDetails++;
    const from=at(.94,-1.25,0),to=at(.94,.18,0);part(limb(from,to,.026,.026,6),M.steel,[0,0,0]);
    for(const dy of [-1.1,0])part(new T.TorusGeometry(.042,.009,4,8),M.steel,at(.94,dy,0),[Math.PI/2,0,0]);
   }
  }if(count)stat.sectors++;
 }
 // Large roofed rooms receive suspended task lights as well as wall fittings.
 // Their centres are selected over free ground; fixtures and cables stay overhead.
 if(details)for(const region of areas){const ceiling=region.ceiling||region.roof||0,floor=region.floor||0,w=region.x2-region.x1,d=region.z2-region.z1;if(ceiling<4||w<18||d<16)continue;
  const cx=(region.x1+region.x2)/2,cz=(region.z1+region.z2)/2;
  for(const [dx,dz]of [[0,0],[-.2,.15],[.2,-.15]]){if(stations.length>=44)break;const x=cx+dx*w,z=cz+dz*d;
   if(stations.some(s=>Math.hypot(s.x-x,s.z-z)<6)||obstacles.some(b=>!b.walkableSurface&&(b.y||0)<floor+2&&(b.y||0)+b.height>floor&&Math.abs(x-b.x)<b.hx+.8&&Math.abs(z-b.z)<b.hz+.8))continue;
   const y=floor+Math.min(7.8,ceiling-.3);stations.push({x,z,y,floor,nx:0,nz:0,label:'',color:dx>0?palette.warm:palette.cool});
   if(ceiling+floor-y>.4)part(limb([x,y+.15,z],[x,ceiling+floor-.08,z],.013,.013,6),M.dark,[0,0,0]);
   break;
  }
 }
 stat.wallStations=stations.length;
 const fixtures=createIndustrialLightBatch(T,root,stations.map(s=>({position:[s.x,s.y,s.z],size:[.5,.35,.5],color:s.color})),{kind:'highbay',low});
 // Sector labels share one atlas and one draw call; labels name the actual room.
 if(typeof document!=='undefined'&&stations.some(s=>s.label)){
  const labels=stations.filter(s=>s.label),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=labels.length*64;const c=canvas.getContext('2d');
  const scheme=chapter==='couronne'?['#d9dce0','#27363e','#778592']:chapter==='ligne9'?['#25434a','#e0d9c6','#b9a578']:chapter==='m06'?['#bd9e55','#2b2923','#6b5631']:['#c7c2ad','#283634','#8e4436'];
  c.font='700 28px sans-serif';
  labels.forEach((s,i)=>{const y=i*64;c.fillStyle=scheme[0];c.fillRect(0,y,1024,64);c.fillStyle=scheme[2];c.fillRect(0,y,62,64);c.fillStyle=scheme[1];c.fillText(String(s.label).toUpperCase(),82,y+43,912);
   c.fillStyle=scheme[0];c.fillText(String(i+1).padStart(2,'0'),11,y+43,48);
   c.fillStyle='rgba(52,41,28,.24)';c.fillRect(70,y+4,3,56);for(const xx of [6,1014])for(const yy of [y+6,y+57])c.fillRect(xx,yy,3,3);
  });
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const material=new T.MeshStandardMaterial({map:texture,roughness:.83,metalness:.05});own.push(material);
  labels.forEach((s,i)=>{const geo=new T.PlaneGeometry(2.9,.18),uv=geo.attributes.uv;for(let j=0;j<uv.count;j++)uv.setY(j,(labels.length-i-1+uv.getY(j))/labels.length);part(geo,material,[s.x+s.nx*.04,s.y-.3,s.z+s.nz*.04],[0,Math.atan2(s.nx,s.nz),0]);});
 }
 a.build(root);for(const item of a.items)item.geometry.dispose();a.items.length=0;
 const contacts=parent.getObjectByName('Occlusion de contact / décor')?null:createGroundOcclusion(T,root,obstacles,{compact:low,floor:.024});
 const wetCovers=obstacles.filter(o=>o.kind==='fps-cover'&&!(o.y>0)).slice(0,3);
 const fx=worldFx||createWorldEffects(T,{webgpu,low:compact,reflections:!compact&&chapter!=='m01'&&wetCovers.length>0});if(!worldFx&&fx.reflectionTarget)root.add(fx.reflectionTarget);
 if(!worldFx&&chapter!=='m01'&&wetCovers.length){const puddles=new T.InstancedMesh(new T.CircleGeometry(1,low?12:24),fx.water({color:0x23343b,puddle:true,refraction:false,opacity:.28}),wetCovers.length),pose=new T.Object3D();wetCovers.forEach((o,i)=>{pose.position.set(o.x+2.2,.027,o.z);pose.rotation.x=-Math.PI/2;pose.scale.set(1.4,.8,1);pose.updateMatrix();puddles.setMatrixAt(i,pose.matrix);});root.add(puddles);}
 // Native beams are physically depth clipped. A bounded set reuses the world's FX system.
 if(details&&webgpu&&!compact)for(const s of stations.filter((s,i)=>i%4===0).slice(0,4))fx.fog(root,{x:s.x+s.nx*.6,y:s.y-1.2,z:s.z+s.nz*.6,width:2,height:3,depth:2,color:s.color,opacity:.065,beam:true});
 const pool=Array.from({length:stat.lightBudget},()=>{const l=new T.SpotLight(0xffffff,0,12,.8,.7,1.8);l.name='FPS / éclairage de secours local';root.add(l,l.target);return l;});
 let last=-Infinity;const update=(t,dt,eye)=>{if(!root.visible||!eye)return;fx.update(t,eye);if(t-last<.15&&t>=last)return;last=t;
  const sorted=stations.map(s=>({...s,d:Math.hypot(s.x-eye.x,s.z-eye.z,(s.y-(eye.y||1.6))*.3)})).filter(s=>s.d<17).sort((a,b)=>a.d-b.d);
  pool.forEach((l,i)=>{const s=sorted[i];l.intensity=s?(s.nx||s.nz?48:110):0;if(s){l.color.setHex(s.color);l.position.set(s.x+s.nx*.12,s.y-.2,s.z+s.nz*.12);l.target.position.set(s.x+s.nx*1.8,s.floor,s.z+s.nz*1.8);}});
 };
 return {root,update,stats:()=>({...stat,draws:root.children.filter(o=>o.isMesh).length,indirectLight:!!radiance,worldEffects:fx.stats()}),dispose(){radiance?.dispose();fixtures?.dispose();contacts?.dispose();if(!worldFx)fx.dispose();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const [m,old]of touched){Object.assign(m,old);delete m.userData.fpsSurface;m.needsUpdate=true;}own.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
