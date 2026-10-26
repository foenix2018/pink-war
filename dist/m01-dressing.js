// Physical ageing of the preserved Secours 07 map. No replacement buildings,
// no shifted doors, no props on the authored route or across collision openings.
import {Assembly,matrix} from './geo.js';
import {LEVEL1_MAP} from './level1-layout.js';

export function createM01Dressing(T,parent,maps,{performance=false}={}){
 const root=new T.Group();root.name='W01 / sept ans après la Chute';parent.add(root);
 const a=new Assembly(),owned=[],textures=[],stats={leaks:0,moss:0,cables:0,aggregate:0,rebar:0,ferns:0,draws:0,triangles:0};
 let seed=2189;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const between=(x,y)=>x+(y-x)*rnd();
 const material=(color,roughness,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});owned.push(m);return m;};
 const cable=material(0x252a28,.91),copper=material(0x82533b,.7,.75),aggregate=material(0x626761,.98),leaf=material(0x4b583a,.94);leaf.side=T.DoubleSide;
 const tube=(points,r,m=cable)=>{a.add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),performance?12:20,r,6,false),m);};
 function decal(file){
  const texture=new T.TextureLoader().load('./assets/cc0/'+file);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
  const m=new T.MeshStandardMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,alphaTest:.035});owned.push(m);return m;
 }
 const leak=decal('m01-leak-mask.png'),moss=decal('m01-moss-mask.png');
 // Streaks live only on solid masonry pieces. Never paint a plane across a
 // real open window, which would turn its aperture into another opaque visor.
 for(const p of LEVEL1_MAP.buildingParts){
  if(!['concrete','plaster','brick'].includes(p.mat)||p.slab||p.y>14||p.h<.55)continue;
  if(p.d<.5&&p.w>1.4&&rnd()<.42){
   const building=LEVEL1_MAP.buildings.find(([x,z,w,d])=>Math.abs(p.x-x)<w*.55&&Math.abs(p.z-z)<d*.55);
   if(!building)continue;const sign=p.z>building[1]?1:-1;
   a.add(new T.PlaneGeometry(p.w*.91,p.h*.95),leak,matrix([p.x,p.y,p.z+sign*(p.d/2+.009)],[0,sign<0?Math.PI:0,0]),false);stats.leaks++;
   if(p.y<1.2){a.add(new T.PlaneGeometry(p.w*.96,p.h*.8),moss,matrix([p.x,p.y-p.h*.08,p.z+sign*(p.d/2+.012)],[0,sign<0?Math.PI:0,0]),false);stats.moss++;}
  }
 }
 // Insulated service looms sag between genuine supports. Bare copper stays
 // short and attached to the severed end; no floating neon electrical strips.
 for(const [x,z,length,sign] of [[-13,12,19,-1],[15,26,15,1],[-13,-15,15,-1]]){
  for(let k=0;k<3;k++){
   const xx=x+sign*.055*k;
   tube([[xx,3.6,z],[xx+sign*.15,2.85,z+length*.33],[xx+sign*.13,2.95,z+length*.67],[xx,3.65,z+length]],.025);stats.cables++;
  }
  tube([[x,3.6,z],[x+.12,2.7,z+.5],[x+.20,1.8,z+.7]],.032);stats.cables++;
  tube([[x+.20,1.8,z+.7],[x+.23,1.62,z+.75]],.011,copper);
 }
 // Coarse aggregate and torn reinforcing rods at the existing cut roof edges.
 // All fragments are part of that roof, rather than objects floating in space.
 for(const [x,z,w,d,h] of LEVEL1_MAP.buildings.slice(0,6)){
  const roof=LEVEL1_MAP.buildingParts.filter(p=>p.slab&&Math.abs(p.x-x)<w*.5&&Math.abs(p.z-z)<d*.5).sort((a,b)=>b.y-a.y)[0];
  const y=roof.y+roof.h/2;
  for(let k=0;k<(performance?4:7);k++){
   const xx=roof.x+roof.w/2-.10,zz=roof.z-roof.d*.30+k*roof.d*.08;
   tube([[xx,y-.20,zz],[xx+.04,y+.55,zz+.05],[xx+.27,y+.92,zz+.08]],.018,maps.rust);stats.rebar++;
   a.add(new T.IcosahedronGeometry(between(.10,.21),0),aggregate,matrix([xx,y-.05,zz],[rnd(),rnd(),rnd()],[1.6,.7,1]));stats.aggregate++;
  }
 }
 // Ground fragments remain small enough to step over. Place them in the
 // building apron, outside the central authored path and terminal approaches.
 for(const [x,z] of [[-13.5,46],[-13.5,30],[14.2,45],[-13.7,-16],[30,-12],[-9,-47]]){
  for(let k=0;k<(performance?10:18);k++){
   const r=between(.04,.14);
   a.add(new T.IcosahedronGeometry(r,0),k%4?aggregate:maps.brick,matrix([x+between(-.4,.4),r*.35,z+between(-1.8,1.8)],[rnd(),rnd(),rnd()],[1.4,.45,1]));stats.aggregate++;
  }
 }
 // Curved, tapered fern fronds supplement the authored leaf-card trees.
 for(const [x,z] of [[-14.4,48],[-13.7,31],[14.3,44],[13.9,25],[-13.7,-14],[29.9,-13],[-9.8,-47],[25,-50]]){
  for(let f=0;f<6;f++){
   const angle=f*1.047+rnd()*.25,len=between(.3,.65),p=[],uv=[];
   for(let k=0;k<5;k++){
    const pair=t=>{const w=Math.sin(t*Math.PI)*.045;return [[-w,len*(.85*t-.3*t*t),len*t*.65],[w,len*(.85*t-.3*t*t),len*t*.65]];};
    const q=pair(k/5),r=pair((k+1)/5);
    for(const [point,u,v] of [[q[0],0,k/5],[q[1],1,k/5],[r[1],1,(k+1)/5],[q[0],0,k/5],[r[1],1,(k+1)/5],[r[0],0,(k+1)/5]]){p.push(...point);uv.push(u,v);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();
   a.add(g,leaf,matrix([x,.02,z],[0,angle,0]));
  }
  stats.ferns++;
 }
 a.mount(root);a.setLevel(1);
 // Contact darkening and sun projection are owned by the shared shadow layer.
 for(const mesh of a.meshes){mesh.castShadow=!performance&&!mesh.material.transparent;mesh.receiveShadow=true;stats.triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;}
 stats.draws=a.meshes.length;
 return {root,stats,dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
