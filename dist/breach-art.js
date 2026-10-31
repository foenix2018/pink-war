import {createContactShadows} from './contact-shadows.js';
import {createBreachDressing} from './breach-dressing.js';
import {bevelBox} from './geo.js';
import {createBreachTextures} from './breach-textures.js';
import {breachSolids,BREACH,ramps,BREACH_PROPS,BREACH_GROUND_SURFACES} from './breach-layout.js';
export function createCampaignArt(T,scene){
const root=new T.Group();root.name='LA BRÈCHE VIOLETTE';root.visible=false;scene.add(root);const obstacles=breachSolids(),gs=[],ms=[],ts=[];
const surface=createBreachTextures(T);ts.push(...surface.owned);
const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.78,metalness:.5,...extra});ms.push(m);return m;};
const steel=mat(0xb9c8d1,{roughness:.38,metalness:.84,map:surface.maps.steel,bumpMap:surface.maps.steel,bumpScale:.025}),wall=mat(0xa8b0c4,{map:surface.maps.wall,bumpMap:surface.maps.wall,bumpScale:.04}),crate=mat(0xa8b4ab,{map:surface.maps.crate,bumpMap:surface.maps.crate,bumpScale:.04}),ground=mat(0x9eafb7,{map:surface.maps.floor,bumpMap:surface.maps.floor,bumpScale:.025}),rock=mat(0x6a617b,{map:surface.maps.rock,roughness:1,metalness:0}),rubber=mat(0x151a21,{roughness:.95,metalness:0}),yellow=mat(0xc49729),dark=mat(0x18212b);
const glow=color=>{const m=new T.MeshBasicMaterial({color,toneMapped:false});ms.push(m);return m;};const blue=glow(0x40caff),violet=glow(0xc65aff),red=glow(0xff304e);
const geom=(w,h,d)=>{const g=new T.BoxGeometry(w,h,d);gs.push(g);return g;};const cube=geom(1,1,1);
const bevelCache=new Map();let beveledPieces=0;
function box(m,x,y,z,w,h,d){let g=cube;const soft=Math.min(w,h,d)>.18&&Math.max(w,h,d)<32;if(soft){const key=[w,h,d].join('/');if(!bevelCache.has(key)){const radius=Math.min(.11,Math.min(w,h,d)*.16);const shape=bevelBox(w,h,d,radius,1);gs.push(shape);bevelCache.set(key,shape);}g=bevelCache.get(key);beveledPieces++;}const o=new T.Mesh(g,m);o.position.set(x,y,z);if(!soft)o.scale.set(w,h,d);o.userData.metricBox=true;root.add(o);return o;}
function solidDetail(o){o.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(o),size=new T.Vector3(),center=new T.Vector3();bounds.getSize(size);bounds.getCenter(center);obstacles.push({x:center.x,z:center.z,hx:size.x/2,hz:size.z/2,y:bounds.min.y,height:size.y,surface:'metal',kind:'detail'});return o;}
function cylinder(m,x,y,z,r,length,rotation=null){const g=new T.CylinderGeometry(r,r,length,20);gs.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);if(rotation)o.rotation.set(...rotation);root.add(o);return o;}
function collar(x,y,z,r,material=steel,axis='y'){const g=new T.TorusGeometry(r,.07,6,24);gs.push(g);const o=new T.Mesh(g,material);o.position.set(x,y,z);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;root.add(o);return o;}
function cable(points,r=.055){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const g=new T.TubeGeometry(curve,18,r,6,false);gs.push(g);const o=new T.Mesh(g,rubber);root.add(o);return o;}

const floorMaterials={metal:ground,concrete:mat(0xc0c8cc,{map:surface.maps.concrete,roughness:.9,metalness:.04,bumpMap:surface.maps.concrete,bumpScale:.035}),tarmac:mat(0xc2c9d1,{map:surface.maps.tarmac,roughness:.95,metalness:.02,bumpMap:surface.maps.tarmac,bumpScale:.025})};
for(const s of BREACH_GROUND_SURFACES)box(floorMaterials[s.surface],0,-.21,(s.minZ+s.maxZ)/2,54,.4,s.maxZ-s.minZ);
for(const b of obstacles.filter(b=>!['core','prop','coolant','stabilizer-module','reactor-post','reactor-ring','ramp-slab'].includes(b.kind))){
 box(b.kind==='crate'?crate:b.kind==='wall'?wall:steel,b.x,b.y+b.height/2,b.z,b.hx*2,b.height,b.hz*2);
 if(b.kind==='wall'&&b.height>=7&&b.hx>3&&b.hz<1){
  for(const side of [-1,1]){const z=b.z+side*(b.hz+.045);box(dark,b.x,b.y+1.45,z,b.hx*2-.2,2.75,.065);
   for(let x=b.x-b.hx+1.7;x<b.x+b.hx-1;x+=3.2){box(steel,x,b.y+4.7,z,2.7,2.6,.12);box(dark,x,b.y+4.7,z+side*.075,2.43,2.24,.05);for(let y=b.y+3.9;y<b.y+5.5;y+=.35)box(wall,x,y,z+side*.115,2.1,.055,.025);}
   box(steel,b.x,b.y+2.9,z,b.hx*2,.12,.18);box(blue,b.x,b.y+6.6,z+side*.03,Math.min(3,b.hx),.055,.02);}
 }
}

for(const b of obstacles.filter(b=>b.kind==='crate')){for(const s of [-1,1])box(steel,b.x+s*(b.hx-.12),b.height/2,b.z,.12,b.height+.04,b.hz*2+.04);box(blue,b.x,.1,b.z+b.hz+.025,b.hx*1.6,.05,.03);}
for(const r of ramps){const length=r.bottomZ-r.topZ,mesh=box(steel,r.x,r.height/2-.12,(r.bottomZ+r.topZ)/2,r.halfWidth*2,.24,Math.hypot(length,r.height));mesh.rotation.x=(r.descending?-1:1)*Math.atan2(r.height,length);}
// Repeated ribs, gantries, cables and floor seams read at human scale.
for(let z=83;z>-90;z-=6){for(const x of [-25.9,25.9]){box(blue,x-.22*Math.sign(x),2.6,z,.07,2.2,.18);}box(steel,0,.008,z,51,.015,.045);for(const x of [-3,3])box(blue,x,.025,z,.09,.025,2);}
for(const z of [61,48,35,-29,-42,-56,-71]){box(steel,0,9,z,53,.45,.6);for(const x of [-20,-12,12,20])box(steel,x,7.4,z,.14,3,.14);}
// Massive reactor, visible from arrival through the industrial spine.
const ringGeo=new T.TorusGeometry(6,.28,8,64);gs.push(ringGeo);const rings=[];for(const y of [2,6,10]){const o=new T.Mesh(ringGeo,steel);o.rotation.x=Math.PI/2;o.position.set(0,y,-48);root.add(o);rings.push(o);}
const energyCanvas=document.createElement('canvas');energyCanvas.width=256;energyCanvas.height=512;const ec=energyCanvas.getContext('2d');ec.fillStyle='#241142';ec.fillRect(0,0,256,512);for(let i=0;i<36;i++){ec.fillStyle=i%4?'#8547c1':'#c4b1ed';ec.fillRect((i*71)%256,0,1+i%4,512);}for(let y=0;y<512;y+=31){ec.fillStyle='#3c1e62';ec.fillRect(0,y,256,4);}const energyMap=new T.CanvasTexture(energyCanvas);energyMap.wrapS=energyMap.wrapT=T.RepeatWrapping;energyMap.colorSpace=T.SRGBColorSpace;ts.push(energyMap);const energyMat=new T.MeshBasicMaterial({map:energyMap,color:0xe6c5ff,transparent:true,opacity:.92,toneMapped:false});ms.push(energyMat);
const coreGeo=new T.CylinderGeometry(1.6,1.6,11,32);gs.push(coreGeo);const core=new T.Mesh(coreGeo,energyMat);core.position.set(0,5.5,-48);root.add(core);for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,x=Math.cos(a)*7,z=-48+Math.sin(a)*7;cylinder(steel,x,5,z,.42,10);for(const y of [.35,3.5,6.5,9.5])collar(x,y,z,.46);}
for(const phase of [0,Math.PI]){const points=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*6+phase;points.push(new T.Vector3(Math.cos(a)*1.65,i/80*10.6+.2,-48+Math.sin(a)*1.65));}const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points),80,.035,5,false);gs.push(geo);const filament=new T.Mesh(geo,blue);root.add(filament);}
const light=new T.PointLight(0xa03dff,55,29,2);light.position.set(0,5,-48);root.add(light);
const indicators=[...BREACH.relays,...BREACH.stabilizers].map(p=>box(violet,p.x,1.6,p.z-1.4,.9,.12,.7));
// A rocky alien silhouette beyond the open roof; deterministic placement.
const rg=new T.IcosahedronGeometry(1,2);gs.push(rg);for(let i=0;i<55;i++){const o=new T.Mesh(rg,rock);o.position.set((i%2?1:-1)*(34+i%9),3+i%7,85-i*3.3);o.scale.set(7+i%5,8+i%13,9);root.add(o);}
const alarm=[];for(let z=-32;z>-89;z-=8)for(const x of [-5,5])alarm.push(box(red,x,3,z,.22,.22,.22));
// Keep physical props clear of the route, terminal approaches and portals.
for(const p of BREACH_PROPS){
 if(p.type==='forklift'){
 box(yellow,p.x,.6,p.z,p.w,1,p.d);box(dark,p.x,1.4,p.z+.5,1.5,.7,1.3);
 for(const side of [-1,1]){for(const z of [-1,1]){cylinder(rubber,p.x+side*1.05,.42,p.z+z,.42,.42,[0,0,Math.PI/2]);cylinder(steel,p.x+side*1.28,.42,p.z+z,.19,.035,[0,0,Math.PI/2]);}box(steel,p.x+side*.8,1.7,p.z-1.6,.13,1.6,.15);}box(yellow,p.x,2.5,p.z,2.4,.15,2.6);
 }else if(p.type==='drums'){
 const g=new T.CylinderGeometry(.48,.48,1.3,12);gs.push(g);for(const dx of [-.6,.6]){const o=new T.Mesh(g,yellow);o.position.set(p.x+dx,.65,p.z);root.add(o);box(dark,p.x+dx,.35,p.z,1,.055,1);box(dark,p.x+dx,1,p.z,1,.055,1);}
 }else if(p.type==='generator'){
 box(dark,p.x,.18,p.z,p.w,.36,p.d);cylinder(steel,p.x,1.25,p.z,.95,3.6,[Math.PI/2,0,0]);for(const z of [-1.6,-.8,.8,1.6])collar(p.x,1.25,p.z+z,.99,steel,'z');box(dark,p.x,2.15,p.z+.2,1.3,.45,2.2);box(blue,p.x,2.1,p.z+1.85,.8,.16,.04);cable([[p.x+.9,.4,p.z-1],[p.x+1.1,1,p.z],[p.x+.8,1.9,p.z+.6]]);
 }else{
 box(p.type==='cargo'?crate:dark,p.x,p.h/2,p.z,p.w,p.h,p.d);
 if(p.type==='cargo'){for(let y=.15;y<p.h;y+=.6)box(steel,p.x,y,p.z+p.d/2+.02,p.w,.07,.08);}
 else{for(let y=.4;y<p.h-.2;y+=.28)box(steel,p.x,y,p.z+p.d/2+.025,p.w*.7,.07,.06);box(blue,p.x,p.h-.3,p.z+p.d/2+.04,p.w*.6,.1,.06);}
 }
}
// Hangar: overhead crane and suspended cable drums, no obstruction at eye level.
for(const x of [-22,22])box(yellow,x,7.8,49,.45,.65,24);
box(yellow,0,7.7,46,44,.6,1.2);box(dark,2,7,46,3,1.2,2);box(steel,2,5.3,46,.06,2.5,.06);box(yellow,2,4,46,.65,.25,.4);
// Sidewall service pipes, valves and ventilators create depth and scale.
const pipeGeo=new T.CylinderGeometry(.16,.16,1,10);gs.push(pipeGeo);
for(const x of [-25,25])for(const y of [4.8,5.4,6]){const o=new T.Mesh(pipeGeo,steel);o.rotation.x=Math.PI/2;o.scale.y=170;o.position.set(x,y,-1);root.add(o);}
for(let z=72;z>-80;z-=18)for(const x of [-25,25]){box(steel,x,5.4,z,.8,2,.18);box(dark,x,2.8,z,1.3,1.2,.5);for(let y=2.4;y<3.3;y+=.15)box(steel,x,y,z+.3,1.1,.035,.07);}
// Actual grated strips and treads indicate the walkable upper route.
for(let z=36;z>21;z-=.65){const y=(37-z)/16*4;box(dark,15,y+.025,z,4.8,.025,.08);}
for(let z=20;z>-5;z-=.45)box(dark,15,4.015,z,4.8,.025,.055);
// Reactor coolant conduits, shields and a marked emergency exit frame.
for(const x of [-8,8]){const o=new T.Mesh(pipeGeo,steel);o.rotation.x=Math.PI/2;o.scale.set(3,27,3);o.position.set(x,.45,-49);root.add(o);}
const stabilizerModules=[];for(const p of BREACH.stabilizers){box(yellow,p.x,0.06,p.z-1.4,3,.08,2.4);stabilizerModules.push(box(violet,p.x,2.5,p.z-1.6,1.1,.5,.22));}
box(blue,0,6.2,-85,8.5,.18,.7);
// Layered hull plating, angled braces and recessed luminaires replace flat blocks.
for(let z=78;z>-85;z-=12)for(const side of [-1,1]){
 const x=side*26;box(dark,x,1.15,z,.18,1.9,8);box(steel,x-side*.13,.22,z,.24,.22,8.3);
 for(const off of [-3.7,3.7]){const brace=box(steel,x-side*.4,4,z+off,.28,3,.3);brace.rotation.z=side*.25;solidDetail(brace);}
 box(blue,x-side*.17,6.8,z,.13,.09,3);box(steel,x-side*.2,6.95,z,.4,.08,3.4);
}
// Chamfered door frames provide a recognisable industrial silhouette.
for(const z of [63,36,-28,-72])for(const side of [-1,1]){const o=box(steel,side*4.9,6.2,z,2.4,.45,1.2);o.rotation.z=side*Math.PI/4;solidDetail(o);box(dark,side*5.4,3.2,z+.57,.22,5.4,.12);box(blue,side*5.25,3.4,z+.65,.08,3.6,.06);}
// Hose connections and flange rings tie the cooling system into its machinery.
for(const x of [-8,8]){for(const z of [-60,-55,-49,-43,-38])collar(x,.45,z,.54,steel,'z');cable([[x,.5,-61],[x,.8,-64],[x*.55,1.1,-65],[0,1.4,-63]],.085);}
for(const p of BREACH.stabilizers){cylinder(steel,p.x,.65,p.z-1.6,.48,1.1);collar(p.x,1.2,p.z-1.6,.52);cable([[p.x-.55,.15,p.z-1.7],[p.x-.8,1,p.z-1.7],[p.x-.4,2.1,p.z-1.7]]);}
const dressing=createBreachDressing(T,root,{box,cylinder,cable,collar,solidDetail,obstacles,materials:{steel,wall,crate,ground,rock,rubber,yellow,dark,blue,violet,red},ownG:g=>(gs.push(g),g),ownM:m=>(ms.push(m),m),ownT:t=>(ts.push(t),t)});
// Grounded equipment keeps a soft contact even in compatible / low quality.
const contactItems=obstacles.filter(b=>(b.y||0)<.08&&b.height>.3&&b.hx<6&&b.hz<7&&b.kind!=='ramp-slab').map(b=>({x:b.x,z:b.z,y:.018,w:b.hx*2+.8,d:b.hz*2+.8}));
const contactShadows=createContactShadows(T,root,Math.max(1,contactItems.length));contactShadows.update(contactItems);
// Merge static meshes per material. UVs tile in metres, even on the 180 m floor.
const dynamic=new Set([contactShadows.mesh,core,...stabilizerModules,...rings,...indicators,...alarm,...dressing.dynamic]);const batches=new Map();
for(const o of [...root.children])if(o.isMesh&&!dynamic.has(o)){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);}
for(const [material,list] of batches){const positions=[],normals=[],uvs=[];
 for(const o of list){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
 if(o.userData.metricBox&&material.map){const uv=g.attributes.uv,pt=g.attributes.position,nm=g.attributes.normal;for(let i=0;i<uv.count;i++){const nx=Math.abs(nm.getX(i)),ny=Math.abs(nm.getY(i)),nz=Math.abs(nm.getZ(i));const x=pt.getX(i)*o.scale.x,y=pt.getY(i)*o.scale.y,z=pt.getZ(i)*o.scale.z;uv.setXY(i,(nx>ny&&nx>nz?z:x)/2,(ny>nx&&ny>nz?z:y)/2);}}

 g.applyMatrix4(o.matrix);for(const v of g.attributes.position.array)positions.push(v);for(const v of g.attributes.normal.array)normals.push(v);for(const v of g.attributes.uv.array)uvs.push(v);g.dispose();root.remove(o);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();gs.push(g);root.add(new T.Mesh(g,material));}
root.traverse(o=>{if(o.isMesh&&!o.material.isMeshBasicMaterial){o.castShadow=true;o.receiveShadow=true;}});
return {root,obstacles,ready:Promise.resolve(),setVisible(v){root.visible=v;},update(game,time){if(!root.visible)return;const s=game.campaign;energyMap.offset.x=(game.time||0)*.025;dressing.update(game,game.time||0);stabilizerModules.forEach((o,i)=>o.material=s.stabilizers[i]?blue:violet);core.scale.x=core.scale.z=1+Math.sin(time*2)*.035;rings.forEach((r,i)=>r.rotation.z=time*.1*(i+1));indicators.forEach((o,i)=>o.material=(i<2?s.relays[i]:s.stabilizers[i-2])?blue:violet);alarm.forEach(o=>o.visible=s.stage==='extraction'&&Math.sin(time*8)>0);light.intensity=s.stage==='extraction'?45+Math.sin(time*9)*20:55;},updateLift(){},stats(){return {map:'breche-violette-01',visible:root.visible,zones:6,colliders:obstacles.length,relays:2,stabilizers:3,alternatePaths:2,surfaceFamilies:7,industrialProps:BREACH_PROPS.length+dressing.stats().equipment,dressing:dressing.stats(),floatingSigns:0,staticBatches:batches.size,beveledPieces};},dispose(){contactShadows.dispose();scene.remove(root);gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}};
}
