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
 foret:{paint:0x575e4a,cool:0xabcfd6,warm:0xffc28a}
});
export function microSurfaceMaps(T){
 const n=128,normal=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4);let seed=379;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed>>>24)/255-.5,i=(y*n+x)*4,scratch=(y%31===0)?.5:0;
  normal.set([128+Math.round(noise*12),128+Math.round(noise*9+scratch*18),255,255],i);const v=Math.round(190+noise*26-scratch*22);rough.set([v,v,v,255],i);
 }
 const make=data=>{const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 return {normal:make(normal),rough:make(rough)};
}
export function createFPSChapter(T,parent,{chapter,obstacles=[],areas=[],low=false,webgpu=false,worldFx=null,details=true}={}){
 const compact=low||/OculusBrowser|Quest|PicoBrowser|iPhone|iPad/i.test(globalThis.navigator?.userAgent||'');
 const palette=FPS_PALETTES[chapter]||FPS_PALETTES.m03,root=new T.Group();root.name='FPS / '+chapter+' / finition des espaces';parent.add(root);
 const own=[],textures=[],a=new Assembly(),maps=microSurfaceMaps(T);textures.push(maps.normal,maps.rough);
 const mat=(color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,normalMap:maps.normal,normalScale:new T.Vector2(.12,.12)});own.push(m);return m;};
 const M={steel:mat(0x8b9ba5,.78,.35),dark:mat(0x18242c,.5,.62),paint:mat(palette.paint,.45,.66)};
 const stat={chapter,materialDetails:0,coverModels:0,wallStations:0,sectors:0,lightBudget:compact?0:2};
 const touched=new Map();parent.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;for(const m of [].concat(o.material||[])){if(!m.isMeshStandardMaterial||m.transparent||m.normalMap||m.bumpMap||m.userData.fpsSurface)continue;
  touched.set(m,{normalMap:m.normalMap,normalScale:m.normalScale.clone(),roughnessMap:m.roughnessMap});m.normalMap=maps.normal;m.normalScale.set(.10,.10);if(!m.roughnessMap)m.roughnessMap=maps.rough;m.userData.fpsSurface=true;m.needsUpdate=true;stat.materialDetails++;
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
    part(bevelBox(1.7,.55,.065,.025,1),M.paint,at(0,-.7,-.012),[0,yaw,0]);
    for(let k=0;k<6;k++)part(new T.BoxGeometry(1.38,.027,.035),M.dark,at(0,-.86+k*.065,.025),[0,yaw,0]);
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
  c.fillStyle='#0c1b24';c.fillRect(0,0,canvas.width,canvas.height);c.font='600 25px sans-serif';
  labels.forEach((s,i)=>{c.fillStyle='#b3e4ed';c.fillText(String(i+1).padStart(2,'0')+' / '+s.label.toUpperCase(),24,i*64+42,976);});
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});own.push(material);
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
 return {root,update,stats:()=>({...stat,draws:root.children.filter(o=>o.isMesh).length,worldEffects:fx.stats()}),dispose(){fixtures?.dispose();contacts?.dispose();if(!worldFx)fx.dispose();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const [m,old]of touched){Object.assign(m,old);delete m.userData.fpsSurface;m.needsUpdate=true;}own.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
