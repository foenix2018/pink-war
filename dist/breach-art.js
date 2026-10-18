import {breachSolids,BREACH,ramps} from './breach-layout.js';
export function createCampaignArt(T,scene){
const root=new T.Group();root.name='LA BRÈCHE VIOLETTE';root.visible=false;scene.add(root);const obstacles=breachSolids(),gs=[],ms=[],ts=[];
const texture=document.createElement('canvas');texture.width=texture.height=256;const c=texture.getContext('2d');c.fillStyle='#293440';c.fillRect(0,0,256,256);let seed=31;for(let i=0;i<4500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;c.fillStyle=i%3?'#34424d':'#19212b';c.fillRect(x,seed%256,1+(i%12),1);}c.strokeStyle='#101723';c.lineWidth=3;c.strokeRect(2,2,252,252);const tex=new T.CanvasTexture(texture);ts.push(tex);
const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.72,metalness:.68,...extra});ms.push(m);return m;};
const steel=mat(0x657586,{map:tex}),wall=mat(0x384354,{map:tex}),crate=mat(0x77838c,{map:tex}),ground=mat(0x394451,{map:tex}),rock=mat(0x22212e,{roughness:1,metalness:0});
const glow=color=>{const m=new T.MeshBasicMaterial({color,toneMapped:false});ms.push(m);return m;};const blue=glow(0x40caff),violet=glow(0xc65aff),red=glow(0xff304e);
const geom=(w,h,d)=>{const g=new T.BoxGeometry(w,h,d);gs.push(g);return g;};const cube=geom(1,1,1);
function box(m,x,y,z,w,h,d){const o=new T.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);root.add(o);return o;}
box(ground,0,-.21,-1,54,.4,180);
for(const b of obstacles.filter(b=>b.kind!=='core'))box(b.kind==='crate'?crate:b.kind==='wall'?wall:steel,b.x,b.y+b.height/2,b.z,b.hx*2,b.height,b.hz*2);
for(const b of obstacles.filter(b=>b.kind==='crate')){for(const s of [-1,1])box(steel,b.x+s*(b.hx-.12),b.height/2,b.z,.12,b.height+.04,b.hz*2+.04);box(blue,b.x,.1,b.z+b.hz+.025,b.hx*1.6,.05,.03);}
for(const r of ramps){const length=r.bottomZ-r.topZ,mesh=box(steel,r.x,r.height/2-.12,(r.bottomZ+r.topZ)/2,r.halfWidth*2,.24,Math.hypot(length,r.height));mesh.rotation.x=Math.atan2(r.height,length);}
// Repeated ribs, gantries, cables and floor seams read at human scale.
for(let z=83;z>-90;z-=6){for(const x of [-25.9,25.9]){box(steel,x,4,z,.4,8,.5);box(blue,x-.22*Math.sign(x),2.6,z,.07,2.2,.18);}box(steel,0,.008,z,51,.015,.045);for(const x of [-3,3])box(blue,x,.025,z,.09,.025,2);}
for(const z of [61,48,35,-29,-42,-56,-71]){box(steel,0,9,z,53,.45,.6);for(const x of [-20,-12,12,20])box(steel,x,7.4,z,.14,3,.14);}
// Massive reactor, visible from arrival through the industrial spine.
const ringGeo=new T.TorusGeometry(6,.28,8,64);gs.push(ringGeo);const rings=[];for(const y of [2,6,10]){const o=new T.Mesh(ringGeo,steel);o.rotation.x=Math.PI/2;o.position.set(0,y,-48);root.add(o);rings.push(o);}
const coreGeo=new T.CylinderGeometry(1.6,1.6,11,24);gs.push(coreGeo);const core=new T.Mesh(coreGeo,violet);core.position.set(0,5.5,-48);root.add(core);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(steel,Math.cos(a)*7,5,-48+Math.sin(a)*7,.6,10,.6);}
const light=new T.PointLight(0xa03dff,55,29,2);light.position.set(0,5,-48);root.add(light);
const labels=[];function sign(text,x,y,z,w=8){const cv=document.createElement('canvas');cv.width=1024;cv.height=160;const ctx=cv.getContext('2d');ctx.fillStyle='#09101e';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#70dfff';ctx.fillRect(0,0,12,160);ctx.font='bold 51px sans-serif';ctx.fillText(text,32,95,960);const t=new T.CanvasTexture(cv);ts.push(t);const m=glow(0xffffff);m.map=t;const g=new T.PlaneGeometry(w,w*160/1024);gs.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);root.add(o);labels.push(o);}
for(const [text,z] of [['01 / ARRIVÉE',77],['02 / TRANSIT',62],['03 / DEUX ITINÉRAIRES',35],['04 / RELAIS ÉNERGIE',-1],['05 / CŒUR VIOLET',-28],['06 / EXTRACTION',-73]])sign(text,0,6,z);
sign('TUNNEL ←     PASSERELLE →',0,3.4,32,10);sign('CACHE / MAINTENANCE',-22,1.8,29,3);sign('RÉSERVE / SECTEUR 07',22,1.8,-65,3);
const indicators=[...BREACH.relays,...BREACH.stabilizers].map((p,i)=>{sign(i<2?`RELAIS ${i+1}`:`STABILISATEUR ${i-1}`,p.x,2.5,p.z-1.4,3);return box(violet,p.x,1.6,p.z-1.4,.9,.12,.7);});
// A rocky alien silhouette beyond the open roof; deterministic placement.
const rg=new T.IcosahedronGeometry(1,0);gs.push(rg);for(let i=0;i<55;i++){const o=new T.Mesh(rg,rock);o.position.set((i%2?1:-1)*(34+i%9),3+i%7,85-i*3.3);o.scale.set(7+i%5,8+i%13,9);root.add(o);}
const alarm=[];for(let z=-32;z>-89;z-=8)for(const x of [-5,5])alarm.push(box(red,x,3,z,.22,.22,.22));
// Collapse static boxes into material batches for standalone Quest rendering.
const dynamic=new Set([core,...rings,...indicators,...alarm,...labels]);
const batches=new Map();for(const o of [...root.children])if(o.isMesh&&!dynamic.has(o)){const key=o.geometry.uuid+'|'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}
for(const list of batches.values()){const batch=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);root.remove(o);});batch.computeBoundingSphere();root.add(batch);}
return {root,obstacles,ready:Promise.resolve(),setVisible(v){root.visible=v;},update(game,time){if(!root.visible)return;const s=game.campaign;core.scale.x=core.scale.z=1+Math.sin(time*2)*.035;rings.forEach((r,i)=>r.rotation.z=time*.1*(i+1));indicators.forEach((o,i)=>o.material=(i<2?s.relays[i]:s.stabilizers[i-2])?blue:violet);alarm.forEach(o=>o.visible=s.stage==='extraction'&&Math.sin(time*8)>0);light.intensity=s.stage==='extraction'?45+Math.sin(time*9)*20:55;},updateLift(){},stats(){return {map:'breche-violette-01',visible:root.visible,zones:6,colliders:obstacles.length,relays:2,stabilizers:3,alternatePaths:2};},dispose(){scene.remove(root);gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}};
}
