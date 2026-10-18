export const BREACH_PROPS=[
 {type:'forklift',x:-22,z:43,w:2.4,d:4,h:2.5},
 {type:'cargo',x:21,z:55,w:5,d:5,h:3},
 {type:'generator',x:-22,z:-5,w:3,d:5,h:2.4},
 {type:'generator',x:22,z:-13,w:3,d:5,h:2.4},
 {type:'cabinet',x:-22,z:-39,w:2,d:4,h:3.6},
 {type:'cabinet',x:22,z:-59,w:2,d:4,h:3.6},
 {type:'drums',x:-18,z:-30,w:3,d:2,h:1.3},
 {type:'drums',x:17,z:69,w:3,d:2,h:1.3},
 {type:'cargo',x:-19,z:-80,w:4,d:4,h:2},
 {type:'cargo',x:19,z:-79,w:4,d:4,h:2}
];
export const BREACH={start:{x:0,z:78,y:0},relays:[{x:-17,z:-8,y:0},{x:17,z:-8,y:0}],stabilizers:[{x:-12,z:-43,y:0},{x:12,z:-43,y:0},{x:0,z:-61,y:0}],exit:{x:0,z:-85,y:0}};
export const ramps=[{id:'breach-ramp',x:15,halfWidth:2.5,bottomZ:37,topZ:21,height:4},{id:'breach-return-ramp',x:15,halfWidth:2.5,bottomZ:-5,topZ:-21,height:4,descending:true}];
export const decks=[{id:'breach-deck',x:15,z:8,hx:2.5,hz:13,height:4}];
export const breachTraversal={routes:ramps,lifts:[],surfaces(x,z){const a=[];for(const r of ramps)if(Math.abs(x-r.x)<=r.halfWidth&&z>=r.topZ&&z<=r.bottomZ)a.push({id:r.id,height:(r.descending?(z-r.topZ)/(r.bottomZ-r.topZ):(r.bottomZ-z)/(r.bottomZ-r.topZ))*r.height});for(const d of decks)if(Math.abs(x-d.x)<=d.hx&&Math.abs(z-d.z)<=d.hz)a.push({id:d.id,height:d.height});return a;},routeForSurface:id=>id.startsWith('breach-')?'breach-ramp':null,height(x,z,t,max=Infinity){return Math.max(0,...this.surfaces(x,z).map(s=>s.height).filter(h=>h<=max+.001));}};
// Every solid visual is generated from these same collision records.
export function breachSolids(){const a=[];const b=(x,z,w,d,y,h,kind='steel',extra={})=>a.push({x,z,hx:w/2,hz:d/2,y,height:h,surface:'metal',kind,...extra});
for(const x of [-27,27])b(x,-1,1,180,0,11,'wall');for(const z of [-91,89])b(0,z,55,1,0,9,'wall');
// Bulkheads frame open doorways; the reactor remains visible along the spine.
for(const z of [63,36,0,-28,-72])for(const side of [-1,1]){
 if(side===1&&(z===36||z===0)){b(10.5,z,3,1,0,8,'wall');b(22.5,z,9,1,0,8,'wall');b(15,z,6,1,6,2,'wall');}
 else if(side===-1&&z===0){b(-21.5,z,11,1,0,8,'wall');b(-9.5,z,1,1,0,8,'wall');b(-13,z,6,1,3.1,4.9,'wall');}
 else b(side*18,z,18,1,0,8,'wall');b(side*6,z,1,1,0,7,'steel');}
 
for(const z of [63,36,-28,-72])b(0,z,12,1,7,1.5,'steel');
for(const [x,z,w,d,h] of [[-15,51,7,10,3],[15,45,7,9,3],[-5,43,4,4,1.2],[7,53,4,4,1.2],[-10,17,4,5,1.2],[0,9,4,4,1.2],[-9,-12,4,5,1.3],[8,-4,4,5,1.3],[-18,-20,5,4,1.3],[21,-23,5,4,1.3],[-10,-35,4,3,1.2],[10,-55,4,3,1.2]])b(x,z,w,d,0,h,'crate');
// Low route is roofed, upper route is reached by a real walkable slope.
b(-18,17,1,30,0,4,'wall');b(-8,17,1,30,0,4,'wall');b(-13,17,10,30,3.5,.4,'steel');
for(const d of decks){b(d.x,d.z,d.hx*2,d.hz*2,3.75,.25,'steel',{walkableSurface:true});for(const x of [d.x-d.hx,d.x+d.hx])b(x,d.z,.12,d.hz*2,4,1.1,'rail');}
for(const p of BREACH_PROPS)b(p.x,p.z,p.w,p.d,0,p.h,'prop',{propType:p.type});
for(const x of [-8,8])b(x,-49,.96,27,0,.93,'coolant');
b(0,-48,3.2,3.2,0,11,'core');
for(const p of [...BREACH.relays,...BREACH.stabilizers])b(p.x,p.z-1.4,1.6,1.2,0,1.5,'terminal');
for(const [i,p] of BREACH.stabilizers.entries())b(p.x,p.z-1.6,1.1,.22,2.25,.5,'stabilizer-module',{stabilizerId:i});
// Former decorative structures now have the same solid dimensions as their meshes.
for(let i=0;i<8;i++){const angle=i*Math.PI/4;b(Math.cos(angle)*7,-48+Math.sin(angle)*7,.84,.84,0,10,'reactor-post');}
for(const x of [-4,4])b(x,-85,.5,.7,0,6.2,'detail');
for(const p of BREACH.stabilizers)for(const x of [-1,1])b(p.x+x,p.z-1.6,.15,.16,.1,3.2,'detail');
for(let z=83;z>-90;z-=6)for(const x of [-25.9,25.9])b(x,z,.4,.5,0,8,'detail');
for(const p of BREACH_PROPS.filter(p=>p.type==='forklift'))for(const side of [-1,1])b(p.x+side*.6,p.z-2.3,.22,1.6,.12,.12,'detail');
// Segment the low reactor ring rather than filling the walkable hole with one box.
for(let i=0;i<32;i++){const a0=i*Math.PI/16,a1=(i+1)*Math.PI/16;const x0=Math.cos(a0)*6,x1=Math.cos(a1)*6,z0=-48+Math.sin(a0)*6,z1=-48+Math.sin(a1)*6;b((x0+x1)/2,(z0+z1)/2,Math.abs(x1-x0)+.5,Math.abs(z1-z0)+.5,1.72,.56,'reactor-ring');}
for(const r of ramps)for(let z=r.topZ+.25;z<r.bottomZ;z+=.5){const t=r.descending?(z-r.topZ)/(r.bottomZ-r.topZ):(r.bottomZ-z)/(r.bottomZ-r.topZ),h=t*r.height;
 b(r.x,z,r.halfWidth*2,.5,h-.24,.24,'ramp-slab',{walkableSurface:true});
 for(const side of [-1,1])b(r.x+side*r.halfWidth,z,.12,.5,h,1.1,'rail');}
return a;}
